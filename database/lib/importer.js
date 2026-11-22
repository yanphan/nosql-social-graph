import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../../backend/node_modules/csv-parse/dist/esm/sync.js';
import { write, connectDb, closeDb, getGraph } from '../../backend/src/db/graph.js';
import { admin, NODE_LABELS, EDGE_TYPES } from '../../backend/src/queries/admin.js';
import { resolveKind, InvalidKindError } from './exporter.js';

const BATCH_SIZE = 2000;
const NUMERIC = new Set(['joinedAt', 'createdAt', 'likeCount', 'commentCount', 'shareCount', 'since', 'at', 'weight', 'score']);
const BOOLEAN = new Set(['isVerified']);

export class ImportFormatError extends Error {
  constructor(message) {
    super(message);
    this.code = 'INVALID_FORMAT';
  }
}

async function ensureDb() {
  try {
    getGraph();
  } catch (_) {
    await connectDb();
  }
}

// Ô CSV là chuỗi: đổi sang số / boolean theo tên cột, bỏ ô rỗng
function coerce(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === '' || v === null || v === undefined) continue;
    if (NUMERIC.has(k)) {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    } else if (BOOLEAN.has(k)) {
      out[k] = v === true || v === 'true' || v === '1';
    } else {
      out[k] = v;
    }
  }
  return out;
}

const pick = (obj, keys) => keys.map((k) => obj[k]).find((v) => v !== undefined && v !== '');

// Cột hai đầu của quan hệ trong CSV: s/t (định dạng xuất) hoặc tên cũ (userId, postId, ...)
function edgeFromCsv(row) {
  const r = coerce(row);
  const s = pick(r, ['s', 'source', 'followerId', 'userId', 'postId']);
  const t = pick(r, ['t', 'target', 'followeeId', 'topicId', ...(r.userId ? ['postId'] : [])]);
  const props = { ...r };
  for (const k of ['s', 't', 'source', 'target', 'followerId', 'followeeId', 'userId', 'postId', 'topicId']) delete props[k];
  return { s, t, props };
}

/**
 * Nạp dữ liệu đã gom nhóm vào đồ thị.
 * mode 'restore': đồ thị rỗng, CREATE giữ nguyên thuộc tính; lỗi thì ném ra (để nơi gọi khôi phục lại).
 * mode 'upsert' : đồ thị đang có dữ liệu, MERGE theo id (không tạo trùng); lỗi từng lô được ghi lại và đi tiếp.
 * nodes = { User: [props], Topic: [...], Post: [...] }, edges = { FOLLOWS: [{ s, t, props }], ... }
 * Bài viết (upsert) cần tác giả: lấy từ cạnh POSTED trong dữ liệu hoặc thuộc tính authorId.
 */
export async function loadGraph({ nodes = {}, edges = {} }, { mode = 'upsert' } = {}) {
  await ensureDb();
  const report = { nodes: {}, edges: {}, skipped: 0, errors: [] };

  const run = async (cypher, rows, bucket, name, total = rows.length) => {
    let written = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      try {
        const res = await write(cypher, { rows: chunk });
        written += Number(res[0]?.n ?? 0);
      } catch (err) {
        if (mode === 'restore') throw err;
        if (report.errors.length < 5) report.errors.push(`${name}: ${err.message}`);
      }
    }
    bucket[name] = { rows: total, written };
    report.skipped += total - written;
  };

  // 1. Node: Topic, User trước; Post sau vì cần tác giả
  for (const label of ['Topic', 'User', 'Post']) {
    let list = (nodes[label] ?? []).filter((p) => p && p.id !== undefined && p.id !== '');
    const total = (nodes[label] ?? []).length;
    if (!total) continue;
    if (mode === 'restore') {
      await run(admin.restoreNodes[label], list, report.nodes, label, total);
    } else if (label === 'Post') {
      const authorOf = new Map((edges.POSTED ?? []).map((e) => [e.t, e.s]));
      const rows = list
        .map((p) => {
          const { authorId, author, ...post } = p;
          return { authorId: authorId ?? author ?? authorOf.get(p.id), post };
        })
        .filter((r) => r.authorId);
      await run(admin.upsertNodes.Post, rows, report.nodes, label, total);
    } else {
      await run(admin.upsertNodes[label], list, report.nodes, label, total);
    }
  }

  // 2. Quan hệ (upsert: POSTED đã tạo cùng bài viết)
  for (const type of Object.keys(EDGE_TYPES)) {
    const all = edges[type] ?? [];
    if (!all.length) continue;
    if (mode !== 'restore' && type === 'POSTED') continue;
    const rows = all.filter((e) => e.s && e.t).map((e) => ({ s: e.s, t: e.t, props: e.props ?? {} }));
    if (type === 'COMMENTED' && mode !== 'restore') {
      // Khóa của bình luận là thời điểm at: thiếu thì không ghép được, bỏ qua
      const valid = rows.filter((e) => e.props.at !== undefined);
      await run(admin.upsertEdges[type], valid, report.edges, type, all.length);
      continue;
    }
    const cypher = mode === 'restore' ? admin.restoreEdges[type] : admin.upsertEdges[type];
    await run(cypher, rows, report.edges, type, all.length);
  }

  // Bộ đếm lượt thích/bình luận/chia sẻ: bản phục hồi giữ nguyên số đã lưu, còn nhập thì tính lại
  if (mode !== 'restore') {
    await write(admin.bulk.recountPosts);
  }
  return report;
}

/**
 * Nhập một file CSV của một nhãn node hoặc kiểu quan hệ (cập nhật theo id, không tạo trùng).
 * Cột giống file xuất CSV; bài viết cần cột authorId.
 */
export async function importCsv(kind, filePath) {
  await ensureDb();
  const t0 = performance.now();
  const k = resolveKind(kind);
  if (!k) throw new InvalidKindError(kind);

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) throw new ImportFormatError('Không tìm thấy file CSV đã tải lên');

  let raw;
  try {
    raw = parse(fs.readFileSync(resolvedPath, 'utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (err) {
    throw new ImportFormatError(`File CSV sai định dạng: ${err.message}`);
  }

  const data = { nodes: {}, edges: {} };
  if (k.kind === 'node') {
    data.nodes[k.name] = raw.map(coerce);
  } else {
    data.edges[k.name] = raw.map(edgeFromCsv);
  }
  if (k.name === 'POSTED') throw new ImportFormatError('Quan hệ POSTED được tạo khi nhập bài viết (cột authorId).');

  const report = await loadGraph(data, { mode: 'upsert' });
  return { kind: k.name, rows: raw.length, ...report, ms: Math.round(performance.now() - t0) };
}

/** Đọc + kiểm tra file JSON định dạng xuất { nodes: [{label, props}], edges: [{type, s, t, props}] } */
export function readGraphJson(filePath) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
  } catch (err) {
    throw new ImportFormatError(`File JSON sai định dạng: ${err.message}`);
  }
  if (!Array.isArray(data?.nodes) || !Array.isArray(data?.edges)) {
    throw new ImportFormatError('File JSON phải có hai mảng "nodes" và "edges" (định dạng của chức năng xuất JSON).');
  }
  const grouped = { nodes: {}, edges: {}, nodeCount: data.nodes.length, edgeCount: data.edges.length, meta: data };
  let unknown = 0;
  for (const n of data.nodes) {
    const label = NODE_LABELS.find((l) => l.toLowerCase() === String(n?.label ?? '').toLowerCase());
    if (!label) { unknown++; continue; }
    (grouped.nodes[label] ??= []).push(n.props ?? {});
  }
  for (const e of data.edges) {
    const type = Object.keys(EDGE_TYPES).find((t) => t === String(e?.type ?? '').toUpperCase());
    if (!type) { unknown++; continue; }
    (grouped.edges[type] ??= []).push({ s: e.s, t: e.t, props: e.props ?? {} });
  }
  grouped.unknown = unknown;
  return grouped;
}

/** Nhập file JSON toàn đồ thị vào đồ thị đang có (cập nhật theo id) */
export async function importJson(filePath) {
  await ensureDb();
  const t0 = performance.now();
  const g = readGraphJson(filePath);
  const report = await loadGraph(g, { mode: 'upsert' });
  return {
    ...report,
    rows: g.nodeCount + g.edgeCount,
    skipped: report.skipped + g.unknown,
    ms: Math.round(performance.now() - t0),
  };
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('importer.js')) {
  const [, , mode, arg1, arg2] = process.argv;
  (async () => {
    try {
      await connectDb();
      if (mode === 'csv' && arg1 && arg2) {
        const res = await importCsv(arg1, arg2);
        console.log(`✅ ${res.kind}: ${res.rows} dòng, bỏ qua ${res.skipped}, ${res.ms}ms`, res.errors);
      } else if (mode === 'json' && arg1) {
        const res = await importJson(arg1);
        console.log(`✅ ${res.rows} dòng, bỏ qua ${res.skipped}, ${res.ms}ms`, res.errors);
      } else {
        console.log('Usage:');
        console.log('  node database/lib/importer.js csv <kind> <filePath>');
        console.log('  node database/lib/importer.js json <filePath>');
      }
      await closeDb();
    } catch (err) {
      console.error('Import error:', err);
      process.exit(1);
    }
  })();
}
