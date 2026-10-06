import crypto from 'crypto';
import fs from 'fs';
import { pipeline } from 'stream/promises';

const key = () => Buffer.from(process.env.ENC_KEY, 'hex');

// AES-256-GCM encryption at rest. Unique IV per file; auth tag stored in DB.
export async function encryptFile(src, dest) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  await pipeline(fs.createReadStream(src), cipher, fs.createWriteStream(dest));
  return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex') };
}

export function decryptStream(file, storedPath) {
  const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(file.iv, 'hex'));
  d.setAuthTag(Buffer.from(file.tag, 'hex'));
  return fs.createReadStream(storedPath).pipe(d);
}
