import { Router } from 'express';
import bcrypt from 'bcryptjs';
import auth from '../middleware/auth.js';
import File from '../models/File.js';
import Share from '../models/Share.js';
import Download from '../models/Download.js';
import User from '../models/User.js';
import { shareStatus, sendFile, notify } from '../utils/helpers.js';

const r = Router();
r.use(auth); // every recipient must log in so downloads can be attributed

function guard(share, user) {
  if (!share) return [404, 'Link not found'];
  if (share.owner.equals(user.id)) return null;
  const st = shareStatus(share);
  if (st === 'revoked') return [410, 'Access to this file has been revoked'];
  if (st === 'expired') return [410, 'This link has expired or reached its download limit'];
  const email = String(user.email || '').trim().toLowerCase();
  const restrictedEmails = (share.allowedEmails || []).map((item) => String(item).trim().toLowerCase());
  if (restrictedEmails.includes(email))
    return [403, 'You are not authorised to access this file'];
  return null;
}

// Link info (counts as "access")
r.get('/:code', async (req, res) => {
  const share = await Share.findOne({ code: req.params.code });
  const err = guard(share, req.user);
  if (err) return res.status(err[0]).json({ message: err[1] });
  const sender = await User.findById(share.owner).select('name');
  if (!share.owner.equals(req.user.id))
    await notify(share.owner, `${req.user.name} (${req.user.email}) opened "${share.fileName}"`, share._id, `access:${share._id}:${req.user.id}`);
  res.json({
    fileName: share.fileName, fileSize: share.fileSize, sender: sender?.name,
    expiresAt: share.expiresAt, requiresPassword: !!share.passwordHash,
    remainingDownloads: share.maxDownloads ? share.maxDownloads - share.downloadCount : null,
  });
});

// Download
r.post('/:code/download', async (req, res) => {
  const share = await Share.findOne({ code: req.params.code });
  const err = guard(share, req.user);
  if (err) return res.status(err[0]).json({ message: err[1] });
  if (share.passwordHash && !(await bcrypt.compare(req.body?.password || '', share.passwordHash)))
    return res.status(401).json({ message: 'Incorrect password' });

  // Atomic claim so concurrent requests cannot exceed the download limit
  const email = String(req.user.email || '').trim().toLowerCase();
  const originalEmail = String(req.user.email || '').trim();
  const claimed = await Share.findOneAndUpdate(
    { _id: share._id, revoked: false, expiresAt: { $gt: new Date() },
      $and: [{ $or: [{ owner: req.user.id }, { $nor: [{ allowedEmails: { $in: [email, originalEmail] } }] }] }],
      $or: [{ maxDownloads: 0 }, { $expr: { $lt: ['$downloadCount', '$maxDownloads'] } }] },
    { $inc: { downloadCount: 1 } });
  if (!claimed) return res.status(410).json({ message: 'This link is no longer available' });

  const file = await File.findById(share.file);
  if (!file) return res.status(410).json({ message: 'File no longer exists' });

  await Download.create({
    share: share._id, owner: share.owner, fileName: share.fileName,
    user: req.user.id, userName: req.user.name, userEmail: req.user.email, ip: req.ip,
  });
  await notify(share.owner, `${req.user.name} (${req.user.email}) downloaded "${share.fileName}"`, share._id);
  sendFile(res, file);
});

export default r;
