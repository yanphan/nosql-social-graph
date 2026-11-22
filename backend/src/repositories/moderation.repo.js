// Nhật ký kiểm duyệt: lưu bản chụp nội dung trước khi gỡ (bài viết bị xóa cứng khỏi đồ thị,
// nên đây là nơi duy nhất còn giữ nội dung để đối chiếu khi có khiếu nại).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(__dirname, '../../data/moderation.ndjson');

export async function append(record) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  await fs.promises.appendFile(FILE, JSON.stringify(record) + '\n', 'utf8');
  return record;
}

export async function list({ limit = 50 } = {}) {
  if (!fs.existsSync(FILE)) return [];
  const lines = (await fs.promises.readFile(FILE, 'utf8')).split('\n').filter((l) => l.trim());
  const out = [];
  for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
    try {
      out.push(JSON.parse(lines[i]));
    } catch {}
  }
  return out;
}
