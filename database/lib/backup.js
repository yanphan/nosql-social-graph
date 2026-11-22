import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { write, read, connectDb, closeDb, getGraph } from '../../backend/src/db/graph.js';
import { admin } from '../../backend/src/queries/admin.js';
import { exportJson } from './exporter.js';
import { loadGraph, readGraphJson } from './importer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.resolve(__dirname, '../data/backups');
// Chỉ nhận tên file trong thư mục sao lưu (chặn đọc file tùy ý trên máy chủ)
const NAME_RE = /^backup-\d+(-[a-z0-9-]+)?\.json$/;
export const AUTO_TAG = 'truoc-phuc-hoi';

export class BackupError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function ensureDb() {
  try {
    getGraph();
  } catch (_) {
    await connectDb();
  }
}

/** Kiểm tra tên file và trả về đường dẫn tuyệt đối trong thư mục sao lưu */
export function resolveBackupFile(name, backupDir = BACKUP_DIR) {
  const base = String(name ?? '').trim();
  if (!NAME_RE.test(base)) throw new BackupError(`Tên file sao lưu không hợp lệ: ${base}`, 'INVALID_NAME');
  const full = path.join(path.resolve(backupDir), base);
  if (!fs.existsSync(full)) throw new BackupError(`File sao lưu không tồn tại: ${base}`, 'NOT_FOUND');
  return full;
}

async function countGraph() {
  const [n, e] = await Promise.all([read(admin.countAllNodes), read(admin.countAllEdges)]);
  return { nodes: Number(n[0]?.c ?? 0), edges: Number(e[0]?.c ?? 0) };
}

/**
 * Tạo bản sao lưu logic (JSON, giữ cả passwordHash để phục hồi đăng nhập được)
 * @param {{ tag?: string }} [opts] tag gắn vào tên file, ví dụ bản tự động trước khi phục hồi
 */
export async function createBackup(backupDir = BACKUP_DIR, { tag } = {}) {
  await ensureDb();
  const t0 = performance.now();
  const dir = path.resolve(backupDir);
  fs.mkdirSync(dir, { recursive: true });

  const createdAt = Date.now();
  const file = `backup-${createdAt}${tag ? `-${tag}` : ''}.json`;
  const fullPath = path.join(dir, file);
  const before = await countGraph();
  const stats = await exportJson(fullPath, { keepSecrets: true });
  // Bản sao lưu thiếu dữ liệu nguy hiểm hơn không có: đối chiếu với số đếm thực tế
  if (stats.nodes !== before.nodes || stats.edges !== before.edges) {
    fs.rmSync(fullPath, { force: true });
    throw new BackupError(
      `Sao lưu không đầy đủ (${stats.nodes}/${before.nodes} node, ${stats.edges}/${before.edges} cạnh). ` +
        'Có thể dữ liệu thay đổi trong lúc sao lưu, hãy thử lại.',
      'BACKUP_FAILED'
    );
  }

  return {
    file,
    fullPath,
    createdAt,
    auto: Boolean(tag),
    nodes: stats.nodes,
    edges: stats.edges,
    sizeBytes: fs.statSync(fullPath).size,
    ms: Math.round(performance.now() - t0),
  };
}

// Đọc phần đầu file để lấy exportedAt / nodesCount / edgesCount, không parse cả file (vài chục MB)
function readHeader(fullPath) {
  const fd = fs.openSync(fullPath, 'r');
  try {
    const buf = Buffer.alloc(1024);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    const head = buf.toString('utf8', 0, n);
    const num = (key) => {
      const m = head.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`));
      return m ? Number(m[1]) : null;
    };
    return { exportedAt: num('exportedAt'), nodes: num('nodesCount'), edges: num('edgesCount') };
  } finally {
    fs.closeSync(fd);
  }
}

/** Danh sách bản sao lưu, mới nhất trước */
export async function listBackups(backupDir = BACKUP_DIR) {
  const dir = path.resolve(backupDir);
  if (!fs.existsSync(dir)) return [];

  const results = [];
  for (const file of fs.readdirSync(dir).filter((f) => NAME_RE.test(f))) {
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      const h = readHeader(fullPath);
      results.push({
        file,
        fullPath,
        sizeBytes: stat.size,
        createdAt: h.exportedAt ?? Math.round(stat.mtimeMs),
        auto: file.includes(AUTO_TAG),
        nodes: h.nodes,
        edges: h.edges,
      });
    } catch {
      // bỏ qua file không đọc được
    }
  }
  return results.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteBackup(name, backupDir = BACKUP_DIR) {
  const full = resolveBackupFile(name, backupDir);
  fs.unlinkSync(full);
  return { deleted: true, file: path.basename(full) };
}

async function wipeAndLoad(graph) {
  await write(admin.deleteGraphData);
  await loadGraph(graph, { mode: 'restore' });
  return countGraph();
}

/**
 * Phục hồi đồ thị từ bản sao lưu.
 * 1. Đọc + kiểm tra file trước khi đụng vào dữ liệu
 * 2. Tự tạo bản sao lưu trạng thái hiện tại (an toàn)
 * 3. Xóa đồ thị, nạp lại, đối chiếu số node/cạnh với file
 * 4. Lỗi hoặc lệch số liệu: nạp lại bản an toàn và báo lỗi
 */
export async function restore(filename, backupDir = BACKUP_DIR) {
  await ensureDb();
  const t0 = performance.now();
  const target = resolveBackupFile(path.basename(String(filename ?? '')), backupDir);

  const graph = readGraphJson(target);
  const expectedNodes = graph.meta.nodesCount ?? graph.nodeCount;
  const expectedEdges = graph.meta.edgesCount ?? graph.edgeCount;
  if (graph.nodeCount !== expectedNodes || graph.edgeCount !== expectedEdges) {
    throw new BackupError('File sao lưu bị thiếu dữ liệu so với phần tóm tắt đầu file, không phục hồi.', 'INVALID_FORMAT');
  }
  if (graph.unknown > 0) {
    throw new BackupError(`File sao lưu có ${graph.unknown} phần tử không nhận dạng được, không phục hồi.`, 'INVALID_FORMAT');
  }

  const safety = await createBackup(backupDir, { tag: AUTO_TAG });

  let actual;
  let failure = null;
  try {
    actual = await wipeAndLoad(graph);
    if (actual.nodes !== expectedNodes || actual.edges !== expectedEdges) {
      failure = `số liệu sau phục hồi (${actual.nodes} node, ${actual.edges} cạnh) không khớp bản sao lưu (${expectedNodes} node, ${expectedEdges} cạnh)`;
    }
  } catch (err) {
    failure = err.message;
  }

  if (failure) {
    let rolledBack = false;
    try {
      const back = await wipeAndLoad(readGraphJson(safety.fullPath));
      rolledBack = back.nodes === safety.nodes && back.edges === safety.edges;
    } catch {
      rolledBack = false;
    }
    throw new BackupError(
      `Phục hồi thất bại: ${failure}. ` +
        (rolledBack
          ? 'Dữ liệu đã được đưa về trạng thái trước khi phục hồi.'
          : `Không tự đưa về được trạng thái cũ, hãy phục hồi thủ công từ ${safety.file}.`),
      'RESTORE_FAILED'
    );
  }

  return {
    file: path.basename(target),
    nodes: actual.nodes,
    edges: actual.edges,
    expectedNodes,
    expectedEdges,
    matchesBackup: true,
    safetyBackup: safety.file,
    ms: Math.round(performance.now() - t0),
  };
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('backup.js')) {
  const [, , command, arg1] = process.argv;
  (async () => {
    try {
      await connectDb();
      if (command === 'create') {
        const res = await createBackup();
        console.log(`✅ Backup created: ${res.file} (${res.nodes} nodes, ${res.edges} edges, ${(res.sizeBytes / 1024).toFixed(1)} KB, ${res.ms}ms)`);
      } else if (command === 'list') {
        const list = await listBackups();
        if (!list.length) console.log('  No backup files found.');
        for (const b of list) {
          console.log(`  📁 ${b.file.padEnd(40)} | ${String(b.nodes).padStart(6)} nodes | ${String(b.edges).padStart(7)} edges | ${(b.sizeBytes / 1024).toFixed(1).padStart(8)} KB`);
        }
      } else if (command === 'restore' && arg1) {
        const res = await restore(arg1);
        console.log(`✅ Restore PASSED: ${res.nodes} nodes, ${res.edges} edges in ${res.ms}ms (bản an toàn: ${res.safetyBackup}).`);
      } else {
        console.log('Usage:');
        console.log('  node database/lib/backup.js create');
        console.log('  node database/lib/backup.js list');
        console.log('  node database/lib/backup.js restore <backup-xxx.json>');
      }
      await closeDb();
    } catch (err) {
      console.error('Backup tool error:', err.message);
      process.exit(1);
    }
  })();
}
