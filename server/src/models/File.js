import mongoose from 'mongoose';
const s = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalName: String,
  storedName: String,
  size: Number,
  mimeType: String,
  iv: String,
  tag: String,
}, { timestamps: true });
export default mongoose.model('File', s);
