import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import auth from '../middleware/auth.js';
import File from '../models/File.js';
import Share from '../models/Share.js';
import { TMP, STORE } from '../utils/paths.js';
import { encryptFile } from '../utils/crypto.js';
import { sendFile, storageUsed, removeStored } from '../utils/helpers.js';

const r = Router();
const upload = multer({ dest: TMP, limits: { fileSize: (Number(process.env.MAX_FILE_MB) || 50) * 1024 * 1024 } });
const quota = () => (Number(process.env.STORAGE_QUOTA_MB) || 200) * 1024 * 1024;

r.use(auth);

r.get('/', async (req, res) => {
  const files = await File.find({ owner: req.user.id }).sort('-createdAt').select('-iv -tag -storedName');
  res.json({ files, used: await storageUsed(req.user.id), quota: quota() });
});

r.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const tmp = req.file.path;
  try {
    if ((await storageUsed(req.user.id)) + req.file.size > quota())
      return res.status(413).json({ message: 'Storage quota exceeded' });
    const storedName = crypto.randomUUID();
    const { iv, tag } = await encryptFile(tmp, path.join(STORE, storedName));
    const file = await File.create({
      owner: req.user.id, storedName, iv, tag,
      originalName: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype,
    });
    res.status(201).json({ file: { _id: file._id, originalName: file.originalName, size: file.size, createdAt: file.createdAt } });
  } finally {
    fs.promises.unlink(tmp).catch(() => {});
  }
});

r.get('/:id/download', async (req, res) => {
  const file = await File.findOne({ _id: req.params.id, owner: req.user.id });
  if (!file) return res.status(404).json({ message: 'File not found' });
  sendFile(res, file);
});

r.delete('/:id', async (req, res) => {
  const file = await File.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!file) return res.status(404).json({ message: 'File not found' });
  await removeStored(file);
  await Share.updateMany({ file: file._id, revoked: false }, { revoked: true, revokedAt: new Date() });
  res.json({ ok: true });
});

export default r;
