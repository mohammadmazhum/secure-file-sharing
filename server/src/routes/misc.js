import { Router } from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import File from '../models/File.js';
import Share from '../models/Share.js';
import Download from '../models/Download.js';
import Notification from '../models/Notification.js';
import { shareStatus, storageUsed } from '../utils/helpers.js';

const r = Router();
r.use(auth);

r.get('/dashboard', async (req, res) => {
  const owner = new mongoose.Types.ObjectId(req.user.id);
  const since = new Date(); since.setUTCHours(0, 0, 0, 0); since.setUTCDate(since.getUTCDate() - 6);
  const [used, fileCount, shares, totalDownloads, perDay, recent] = await Promise.all([
    storageUsed(req.user.id),
    File.countDocuments({ owner }),
    Share.find({ owner }),
    Download.countDocuments({ owner }),
    Download.aggregate([
      { $match: { owner, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 } } },
    ]),
    Download.find({ owner }).sort('-createdAt').limit(8).select('fileName userName userEmail createdAt'),
  ]);
  const counts = { active: 0, expired: 0, revoked: 0 };
  shares.forEach((s) => counts[shareStatus(s)]++);
  const map = Object.fromEntries(perDay.map((d) => [d._id, d.n]));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(since); d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: map[key] || 0 });
  }
  res.json({
    storage: { used, quota: (Number(process.env.STORAGE_QUOTA_MB) || 200) * 1024 * 1024 },
    fileCount, shareCount: shares.length, shareStatus: counts, totalDownloads, days, recent,
  });
});

r.get('/notifications', async (req, res) => {
  const items = await Notification.find({ user: req.user.id }).sort('-createdAt').limit(30);
  res.json({ notifications: items, unread: items.filter((n) => !n.read).length });
});
r.post('/notifications/read', async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
  res.json({ ok: true });
});

export default r;
