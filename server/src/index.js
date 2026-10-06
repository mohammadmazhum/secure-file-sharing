import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';
import { TMP, STORE } from './utils/paths.js';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import shareRoutes from './routes/shares.js';
import publicRoutes from './routes/public.js';
import miscRoutes from './routes/misc.js';

if (!/^[0-9a-f]{64}$/i.test(process.env.ENC_KEY || '')) {
  console.error('ENC_KEY must be 64 hex chars. See .env.example');
  process.exit(1);
}
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(STORE, { recursive: true });

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/s', publicRoutes);
app.use('/api', miscRoutes);

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'File too large' });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

await mongoose.connect(process.env.MONGO_URI);
app.listen(process.env.PORT || 5000, () => console.log('API running on port', process.env.PORT || 5000));
