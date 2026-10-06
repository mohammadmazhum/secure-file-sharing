import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { pipeline } from 'stream';
import { STORE } from './paths.js';
import { decryptStream } from './crypto.js';
import File from '../models/File.js';
import Notification from '../models/Notification.js';

export const storedPath = (file) => path.join(STORE, file.storedName);

export function shareStatus(s) {
  if (s.revoked) return 'revoked';
  if (s.expiresAt <= new Date()) return 'expired';
  if (s.maxDownloads > 0 && s.downloadCount >= s.maxDownloads) return 'expired'; // limit reached
  return 'active';
}

export async function storageUsed(userId) {
  const r = await File.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: '$size' } } },
  ]);
  return r[0]?.total || 0;
}

export function sendFile(res, file) {
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Length', file.size);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
  pipeline(decryptStream(file, storedPath(file)), res, (err) => { if (err) res.destroy(err); });
}

// Creates a notification; with a dedupe key, only one unread per key exists.
export async function notify(userId, message, shareId, key) {
  if (key) {
    await Notification.updateOne(
      { user: userId, key, read: false },
      { $setOnInsert: { message, share: shareId } },
      { upsert: true }
    );
  } else {
    await Notification.create({ user: userId, message, share: shareId });
  }
}

export const removeStored = (file) => fs.promises.unlink(storedPath(file)).catch(() => {});
