import mongoose from 'mongoose';
const s = new mongoose.Schema({
  share: { type: mongoose.Schema.Types.ObjectId, ref: 'Share', index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  fileName: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  userEmail: String,
  ip: String,
}, { timestamps: true });
export default mongoose.model('Download', s);
