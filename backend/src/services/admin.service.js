import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as importer from '../../../database/lib/importer.js';
import * as exporter from '../../../database/lib/exporter.js';
import * as backup from '../../../database/lib/backup.js';
import * as integrity from '../../../database/lib/integrity.js';
import { loadScale } from '../../../database/seed/load.js';
import { read } from '../db/graph.js';
import { admin as adminQueries } from '../queries/index.js';
import { Invalid, NotFound } from '../utils/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_FILE = path.resolve(__dirname, '../../data/audit.ndjson');

export async function importData({ kind, file }) {
  if (!file) {
    throw new Invalid('Vui lòng tải lên một file CSV hoặc JSON');
  }

  const ext = path.extname(file.originalname || file.path).toLowerCase();
  const filePath = file.path;

  // Đếm trước khi import
  const [beforeNodesRow] = await read(adminQueries.countAllNodes);
  const before = Number(beforeNodesRow?.c ?? 0);

  let inserted = 0;
  try {
    if (ext === '.json') {
      const res = await importer.importJson(filePath);
      inserted = res.nodes + res.edges;
    } else if (ext === '.csv') {
      if (!kind) {
        throw new Invalid('Vui lòng chỉ định loại dữ liệu import (kind) khi tải file CSV');
      }
      const res = await importer.importCsv(kind, filePath);
      inserted = res.inserted;
    } else {
      throw new Invalid('Chỉ hỗ trợ file định dạng .csv hoặc .json');
    }
  } finally {
    // Dọn dẹp file tạm của multer
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }

  // Đếm sau khi import
  const [afterNodesRow] = await read(adminQueries.countAllNodes);
  const after = Number(afterNodesRow?.c ?? 0);

  return {
    inserted,
    before,
    after,
  };
}

export async function exportData({ format = 'csv', label = 'User' } = {}) {
  const exportDir = path.resolve(__dirname, '../../../database/data/exports');
  fs.mkdirSync(exportDir, { recursive: true });

  const timestamp = Date.now();
  if (format === 'json') {
    const filename = `export-graph-${timestamp}.json`;
    const outPath = path.join(exportDir, filename);
    await exporter.exportJson(outPath);
    return {
      filePath: outPath,
      fileName: filename,
      mimeType: 'application/json',
    };
  } else {
    const cleanLabel = (label || 'User').trim();
    const filename = `export-${cleanLabel.toLowerCase()}-${timestamp}.csv`;
    const outPath = path.join(exportDir, filename);
    await exporter.exportCsv(cleanLabel, outPath);
    return {
      filePath: outPath,
      fileName: filename,
      mimeType: 'text/csv',
    };
  }
}

export async function seedGraph() {
  const report = await loadScale('DEFAULT', false);

  const [nodesRow, edgesRow] = await Promise.all([
    read(adminQueries.countAllNodes),
    read(adminQueries.countAllEdges),
  ]);

  return {
    nodes: Number(nodesRow[0]?.c ?? 0),
    edges: Number(edgesRow[0]?.c ?? 0),
    ms: report.totalTimeMs,
    allIntegrityPassed: report.allIntegrityPassed,
  };
}

export async function backupGraph() {
  return backup.createBackup();
}

export async function listBackups() {
  return backup.listBackups();
}

export async function restoreGraph({ file }) {
  if (!file || !file.trim()) {
    throw new Invalid('Vui lòng chỉ định file cần phục hồi');
  }

  try {
    return await backup.restore(file.trim());
  } catch (err) {
    if (err.message.includes('không tồn tại')) {
      throw new NotFound(err.message);
    }
    throw err;
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
