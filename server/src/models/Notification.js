import mongoose from 'mongoose';
const s = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  share: { type: mongoose.Schema.Types.ObjectId, ref: 'Share' },
  message: String,
  key: String,
  read: { type: Boolean, default: false },
}, { timestamps: true });
export default mongoose.model('Notification', s);
