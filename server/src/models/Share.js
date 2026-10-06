import mongoose from 'mongoose';
const s = new mongoose.Schema({
  file: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  fileName: String,
  fileSize: Number,
  code: { type: String, unique: true, index: true },
  allowedEmails: [String],          // empty = any logged-in user with the link
  passwordHash: String,             // optional link password
  maxDownloads: { type: Number, default: 0 }, // 0 = unlimited
  downloadCount: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  revokedAt: Date,
}, { timestamps: true });
export default mongoose.model('Share', s);
