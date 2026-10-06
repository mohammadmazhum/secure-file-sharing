import path from 'path';
import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');
export const TMP = path.join(root, 'tmp');
export const STORE = path.join(root, 'store');
