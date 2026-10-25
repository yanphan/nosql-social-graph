import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { write, read, connectDb, closeDb, getGraph } from '../../backend/src/db/graph.js';
import { admin } from '../../backend/src/queries/admin.js';
import { exportJson } from './exporter.js';
import { importJson } from './importer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.resolve(__dirname, '../data/backups');

async function ensureDb() {
  try {
    getGraph();
  } catch (_) {
    await connectDb();
  }
}

/**
 * Create a full logical JSON backup of the graph
 * @param {string} [backupDir] - Optional custom backup directory
 * @returns {Promise<{ file: string, fullPath: string, nodes: number, edges: number, sizeBytes: number, ms: number }>}
 */
export async function createBackup(backupDir = BACKUP_DIR) {
  await ensureDb();
  const t0 = performance.now();

  const resolvedDir = path.resolve(backupDir);
  fs.mkdirSync(resolvedDir, { recursive: true });

  const filename = `backup-${Date.now()}.json`;
  const filePath = path.join(resolvedDir, filename);

  const stats = await exportJson(filePath);
  const fileStat = fs.statSync(filePath);

  const ms = Math.round(performance.now() - t0);
  return {
    file: filename,
    fullPath: filePath,
    nodes: stats.nodes,
    edges: stats.edges,
    sizeBytes: fileStat.size,
    ms,
  };
}

/**
 * List all available logical backups
 * @param {string} [backupDir] - Optional custom backup directory
 * @returns {Array<{ file: string, fullPath: string, sizeBytes: number, createdAt: number|string, nodes: number, edges: number }>}
 */
export async function listBackups(backupDir = BACKUP_DIR) {
  const resolvedDir = path.resolve(backupDir);
  if (!fs.existsSync(resolvedDir)) return [];

  const files = fs.readdirSync(resolvedDir).filter((f) => f.startsWith('backup-') && f.endsWith('.json'));
  const results = [];

  for (const f of files) {
    const fullPath = path.join(resolvedDir, f);
    try {
      const stat = fs.statSync(fullPath);
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      results.push({
        file: f,
        fullPath,
        sizeBytes: stat.size,
        createdAt: data.exportedAt || stat.mtimeMs,
        nodes: data.nodesCount ?? data.nodes?.length ?? 0,
        edges: data.edgesCount ?? data.edges?.length ?? 0,
      });
    } catch {
      // Bỏ qua file lỗi cú pháp JSON
    }
  }

  return results.sort((a, b) => {
    const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime();
    const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });
}

/**
 * Restore graph from a logical backup file
 * Workflow: Clear graph -> Import backup JSON -> Recount posts -> Parity check
 * @param {string} filename - Filename or full path to backup file
 * @param {string} [backupDir] - Optional backup directory
 * @returns {Promise<{ nodes: number, edges: number, matchesBackup: boolean, expectedNodes: number, expectedEdges: number, ms: number }>}
 */
export async function restore(filename, backupDir = BACKUP_DIR) {
  await ensureDb();
  const t0 = performance.now();

  let targetPath = path.resolve(filename);
  if (!fs.existsSync(targetPath)) {
    targetPath = path.join(path.resolve(backupDir), path.basename(filename));
    if (!fs.existsSync(targetPath)) {
      throw new Error(`File sao lưu không tồn tại: ${filename}`);
    }
  }

  const content = fs.readFileSync(targetPath, 'utf8');
  const backupData = JSON.parse(content);
  const expectedNodes = backupData.nodesCount ?? backupData.nodes?.length ?? 0;
  const expectedEdges = backupData.edgesCount ?? backupData.edges?.length ?? 0;

  console.log(`[Restore] Target backup: ${targetPath}`);
  console.log(`[Restore] Expected from backup: ${expectedNodes} nodes, ${expectedEdges} edges`);

  // Bước 1: Xóa trắng đồ thị
  console.log('[Restore] Truncating existing graph data (DETACH DELETE)...');
  await write(admin.deleteGraphData);

  // Bước 2: Nạp lại từ file sao lưu
  console.log('[Restore] Loading nodes and edges from backup...');
  await importJson(targetPath);

  // Bước 3: Đếm thực tế để đối chiếu
  const [nodeCountRow, edgeCountRow] = await Promise.all([
    read('MATCH (n) RETURN count(n) AS c'),
    read('MATCH ()-[r]->() RETURN count(r) AS c'),
  ]);

  const actualNodes = Number(nodeCountRow[0]?.c ?? 0);
  const actualEdges = Number(edgeCountRow[0]?.c ?? 0);
  const matchesBackup = actualNodes === expectedNodes && actualEdges === expectedEdges;
  const ms = Math.round(performance.now() - t0);

  console.log(`[Restore] Actual restored: ${actualNodes} nodes, ${actualEdges} edges`);
  console.log(`[Restore] Parity match: ${matchesBackup ? '✅ 100% MATCH' : '❌ MISMATCH'}`);

  return {
    nodes: actualNodes,
    edges: actualEdges,
    matchesBackup,
    expectedNodes,
    expectedEdges,
    ms,
  };
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('backup.js')) {
  const [,, command, arg1] = process.argv;
  (async () => {
    try {
      await connectDb();
      if (command === 'create') {
        console.log('--- Creating Logical Backup ---');
        const res = await createBackup();
        console.log(`✅ Backup created: ${res.file}`);
        console.log(`   Nodes: ${res.nodes}, Edges: ${res.edges}, Size: ${(res.sizeBytes / 1024).toFixed(1)} KB (${res.ms}ms)`);
      } else if (command === 'list') {
        console.log('--- Available Logical Backups ---');
        const list = await listBackups();
        if (!list.length) {
          console.log('  No backup files found.');
        } else {
          for (const b of list) {
            console.log(`  📁 ${b.file.padEnd(28)} | ${b.nodes.toString().padStart(6)} nodes | ${b.edges.toString().padStart(6)} edges | ${(b.sizeBytes / 1024).toFixed(1).padStart(7)} KB | ${b.createdAt}`);
          }
        }
      } else if (command === 'restore' && arg1) {
        console.log(`--- Restoring Backup: ${arg1} ---`);
        const res = await restore(arg1);
        if (res.matchesBackup) {
          console.log(`✅ Restore PASSED: 100% Node/Edge parity match (${res.nodes} nodes, ${res.edges} edges) in ${res.ms}ms.`);
        } else {
          console.error(`❌ Restore MISMATCH: Expected ${res.expectedNodes}n/${res.expectedEdges}e, got ${res.nodes}n/${res.edges}e!`);
          process.exit(1);
        }
      } else {
        console.log('Usage:');
        console.log('  node database/lib/backup.js create');
        console.log('  node database/lib/backup.js list');
        console.log('  node database/lib/backup.js restore <filename|path>');
      }
      await closeDb();
    } catch (err) {
      console.error('Backup tool error:', err);
      process.exit(1);
    }
  })();
}
