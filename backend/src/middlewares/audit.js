import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(__dirname, '../../data/audit.ndjson');

export function audit(req, res, next) {
  res.on('finish', () => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const record = {
        at: Date.now(),
        userId: req.user?.id ?? null,
        username: req.user?.username ?? null,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
      };
      fs.appendFile(file, JSON.stringify(record) + '\n', () => {});
    } catch (err) {
      console.error('Audit log error:', err);
    }
  });
  next();
}
