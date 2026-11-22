import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as importer from '../../../database/lib/importer.js';
import * as exporter from '../../../database/lib/exporter.js';
import * as backup from '../../../database/lib/backup.js';
import * as integrity from '../../../database/lib/integrity.js';
import { read } from '../db/graph.js';
import { admin as adminQueries } from '../queries/index.js';
import { AppError, Invalid, NotFound, Conflict } from '../utils/errors.js';
import { appCache } from '../utils/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_FILE = path.resolve(__dirname, '../../data/audit.ndjson');

// Nhập / xuất / sao lưu / phục hồi dùng chung một kết nối CSDL và đều nặng: chỉ cho chạy một việc một lúc
let running = null;
async function exclusive(label, fn) {
  if (running) throw new Conflict(`Đang ${running}, hãy thử lại sau khi xong`);
  running = label;
  try {
    return await fn();
  } finally {
    running = null;
  }
}

// Lỗi từ thư viện database/lib -> lỗi HTTP có mã rõ ràng
function mapLibError(err) {
  if (err instanceof AppError) return err;
  switch (err?.code) {
    case 'INVALID_KIND':
    case 'INVALID_FORMAT':
    case 'INVALID_NAME':
      return new Invalid(err.message);
    case 'NOT_FOUND':
      return new NotFound(err.message);
    case 'RESTORE_FAILED':
    case 'BACKUP_FAILED':
      return Object.assign(new AppError(500, err.code, err.message), { expose: true });
    default:
      return err;
  }
}

const removeQuietly = (file) => {
  try {
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
  } catch {}
};

export async function importData({ kind, file }) {
  if (!file) {
    throw new Invalid('Vui lòng tải lên một file CSV hoặc JSON');
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  try {
    if (!['.json', '.csv'].includes(ext)) throw new Invalid('Chỉ hỗ trợ file .csv hoặc .json');
    if (ext === '.csv' && !kind) throw new Invalid('Hãy chọn loại dữ liệu của file CSV');

    return await exclusive('nhập dữ liệu', async () => {
      const before = await countGraph();
      const res = ext === '.json' ? await importer.importJson(file.path) : await importer.importCsv(kind, file.path);
      const after = await countGraph();
      appCache.clear();
      return {
        format: ext.slice(1),
        kind: res.kind ?? 'all',
        rows: res.rows,
        skipped: res.skipped,
        errors: res.errors,
        detail: { nodes: res.nodes, edges: res.edges },
        before,
        after,
        ms: res.ms,
      };
    });
  } catch (err) {
    throw mapLibError(err);
  } finally {
    removeQuietly(file.path); // file tạm của multer
  }
}

async function countGraph() {
  const [[n], [e]] = await Promise.all([read(adminQueries.countAllNodes), read(adminQueries.countAllEdges)]);
  return { nodes: Number(n?.c ?? 0), edges: Number(e?.c ?? 0) };
}

/** Xuất ra file tạm; route gửi file rồi xóa. Không kèm passwordHash. */
export async function exportData({ format = 'json', label = 'User' } = {}) {
  const exportDir = path.resolve(__dirname, '../../../database/data/exports');
  fs.mkdirSync(exportDir, { recursive: true });
  const stamp = Date.now();
  try {
    return await exclusive('xuất dữ liệu', async () => {
      if (format === 'json') {
        const fileName = `graph-${stamp}.json`;
        const filePath = path.join(exportDir, fileName);
        await exporter.exportJson(filePath);
        return { filePath, fileName };
      }
      const res = await exporter.exportCsv(label, path.join(exportDir, `tmp-${stamp}.csv`));
      const fileName = `${res.kind.toLowerCase()}-${stamp}.csv`;
      const filePath = path.join(exportDir, fileName);
      fs.renameSync(res.outPath, filePath);
      return { filePath, fileName };
    });
  } catch (err) {
    throw mapLibError(err);
  }
}

const publicBackup = ({ fullPath, ...b }) => b; // không lộ đường dẫn trên máy chủ

export async function backupGraph() {
  try {
    return publicBackup(await exclusive('sao lưu', () => backup.createBackup()));
  } catch (err) {
    throw mapLibError(err);
  }
}

export async function listBackups() {
  return (await backup.listBackups()).map(publicBackup);
}

export async function deleteBackup(file) {
  try {
    return await exclusive('xóa bản sao lưu', () => backup.deleteBackup(file));
  } catch (err) {
    throw mapLibError(err);
  }
}

export async function restoreGraph({ file }) {
  if (!file || !file.trim()) {
    throw new Invalid('Vui lòng chỉ định file cần phục hồi');
  }
  try {
    return await exclusive('phục hồi dữ liệu', async () => {
      const res = await backup.restore(file.trim());
      appCache.clear(); // gợi ý / thống kê đang lưu tạm theo dữ liệu cũ
      return res;
    });
  } catch (err) {
    appCache.clear();
    throw mapLibError(err);
  }
}

export async function getIntegrity() {
  const checks = await integrity.runChecks();
  return { checks };
}

export async function getAuditLog({ limit = 100 } = {}) {
  const l = Math.min(500, Math.max(1, Number(limit) || 100));
  if (!fs.existsSync(AUDIT_FILE)) {
    return [];
  }

  const content = fs.readFileSync(AUDIT_FILE, 'utf8');
  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  const logs = [];
  for (let i = lines.length - 1; i >= 0 && logs.length < l; i--) {
    try {
      logs.push(JSON.parse(lines[i]));
    } catch {}
  }

  return logs;
}
