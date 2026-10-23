import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { write, read } from '../../backend/src/db/graph.js';
import { admin } from '../../backend/src/queries/admin.js';
import { exportJson } from './exporter.js';
import { importJson } from './importer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.resolve(__dirname, '../data/backups');

export async function createBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const filename = `backup-${Date.now()}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  const stats = await exportJson(filePath);
  const fileStat = fs.statSync(filePath);

  return {
    file: filename,
    nodes: stats.nodes,
    edges: stats.edges,
    sizeBytes: fileStat.size,
  };
}

export async function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));
  const results = [];

  for (const f of files) {
    const fullPath = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(fullPath);
    try {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      results.push({
        file: f,
        sizeBytes: stat.size,
        createdAt: data.exportedAt || stat.mtimeMs,
        nodes: data.nodesCount ?? data.nodes?.length ?? 0,
        edges: data.edgesCount ?? data.edges?.length ?? 0,
      });
    } catch {
      results.push({
        file: f,
        sizeBytes: stat.size,
        createdAt: stat.mtimeMs,
        nodes: 0,
        edges: 0,
      });
    }
  }

  return results.sort((a, b) => b.createdAt - a.createdAt);
}

export async function restore(filename) {
  const filePath = path.join(BACKUP_DIR, path.basename(filename));
  if (!fs.existsSync(filePath)) {
    throw new Error('File sao lưu không tồn tại');
  }

  const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const expectedNodes = backupData.nodesCount ?? backupData.nodes?.length ?? 0;
  const expectedEdges = backupData.edgesCount ?? backupData.edges?.length ?? 0;

  // Bước 1: Xóa trắng đồ thị
  await write(admin.deleteGraphData);

  // Bước 2: Nạp lại từ file sao lưu
  const imported = await importJson(filePath);

  // Bước 3: Đếm thực tế để đối chiếu
  const [nodeCountRow, edgeCountRow] = await Promise.all([
    read('MATCH (n) RETURN count(n) AS c'),
    read('MATCH ()-[r]->() RETURN count(r) AS c'),
  ]);

  const actualNodes = Number(nodeCountRow[0]?.c ?? 0);
  const actualEdges = Number(edgeCountRow[0]?.c ?? 0);

  const matchesBackup = actualNodes === expectedNodes && actualEdges === expectedEdges;

  return {
    nodes: actualNodes,
    edges: actualEdges,
    matchesBackup,
  };
}
