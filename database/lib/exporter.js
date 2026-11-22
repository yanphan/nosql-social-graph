import fs from 'node:fs';
import path from 'node:path';
import { stringify } from '../../backend/node_modules/csv-stringify/dist/esm/sync.js';
import { read, connectDb, closeDb, getGraph } from '../../backend/src/db/graph.js';
import { admin, NODE_LABELS, EDGE_TYPES } from '../../backend/src/queries/admin.js';

// Không đưa ra file tải về; bản sao lưu (keepSecrets) thì giữ để phục hồi đăng nhập được
const SECRET_PROPS = ['passwordHash'];

const ALIASES = {
  users: 'User', user: 'User',
  posts: 'Post', post: 'Post',
  topics: 'Topic', topic: 'Topic',
  follows: 'FOLLOWS', follow: 'FOLLOWS',
  posted: 'POSTED',
  about: 'ABOUT',
  interests: 'INTERESTED_IN', interest: 'INTERESTED_IN', interested_in: 'INTERESTED_IN',
  likes: 'LIKED', like: 'LIKED', liked: 'LIKED',
  comments: 'COMMENTED', comment: 'COMMENTED', commented: 'COMMENTED',
  shares: 'SHARED', share: 'SHARED', shared: 'SHARED',
};

export class InvalidKindError extends Error {
  constructor(input) {
    super(
      `Loại dữ liệu không hợp lệ: "${input}". Hỗ trợ: ${[...NODE_LABELS, ...Object.keys(EDGE_TYPES)].join(', ')}.`
    );
    this.code = 'INVALID_KIND';
  }
}

/** "users" | "User" | "follows" ... -> { kind: 'node' | 'edge', name: 'User' | 'FOLLOWS' }; không hợp lệ thì null */
export function resolveKind(input) {
  const raw = String(input ?? '').trim();
  const name = ALIASES[raw.toLowerCase()] ?? NODE_LABELS.find((l) => l.toLowerCase() === raw.toLowerCase()) ??
    Object.keys(EDGE_TYPES).find((t) => t.toLowerCase() === raw.toLowerCase());
  if (!name) return null;
  return { kind: NODE_LABELS.includes(name) ? 'node' : 'edge', name };
}

async function ensureDb() {
  try {
    getGraph();
  } catch (_) {
    await connectDb();
  }
}

// Mặc định RESULTSET_SIZE của FalkorDB: truy vấn trả đúng ngần này dòng thì có thể đã bị cắt
const RESULT_LIMIT = 10000;

/**
 * Đọc toàn bộ kết quả của một truy vấn có cửa sổ id node [$from, $to).
 * Cửa sổ tự co lại khi số dòng chạm giới hạn (có thể bị cắt) và giãn ra khi ít dòng.
 */
export async function readAll(cypher, params = {}) {
  const [{ m } = {}] = await read(admin.maxNodeId);
  const maxId = m === null || m === undefined ? -1 : Number(m);
  const out = [];
  let from = 0;
  let width = 1000;
  while (from <= maxId) {
    const rows = await read(cypher, { ...params, from, to: from + width });
    if (rows.length >= RESULT_LIMIT) {
      if (width === 1) throw new Error(`Node id ${from} có hơn ${RESULT_LIMIT} quan hệ, không xuất được theo lô`);
      width = Math.max(1, Math.floor(width / 2));
      continue;
    }
    out.push(...rows);
    from += width;
    if (rows.length < RESULT_LIMIT / 4) width = Math.min(width * 2, 20000);
  }
  return out;
}

const stripSecrets = (props, keepSecrets) => {
  if (keepSecrets || !props) return props ?? {};
  const copy = { ...props };
  for (const k of SECRET_PROPS) delete copy[k];
  return copy;
};

/**
 * Xuất một nhãn node (User, Post, Topic) hoặc một kiểu quan hệ (FOLLOWS, ABOUT, ...) ra CSV.
 * Cột của quan hệ: s, t (id hai đầu) + thuộc tính. Không kèm passwordHash.
 */
export async function exportCsv(label, outPath, { keepSecrets = false } = {}) {
  await ensureDb();
  const t0 = performance.now();
  const k = resolveKind(label);
  if (!k) throw new InvalidKindError(label);

  const resolvedOut = path.resolve(outPath);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

  let rows;
  if (k.kind === 'node') {
    rows = (await readAll(admin.exportLabel[k.name])).map((r) => stripSecrets(r.props, keepSecrets));
  } else {
    rows = (await readAll(admin.exportType[k.name])).map((r) => ({ s: r.s, t: r.t, ...(r.props || {}) }));
  }

  // Tiêu đề là hợp mọi khóa (thuộc tính tùy chọn có thể chỉ có ở một số dòng)
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const csv = rows.length ? stringify(rows, { header: true, columns }) : '';
  fs.writeFileSync(resolvedOut, csv, 'utf8');

  return { rows: rows.length, kind: k.name, file: resolvedOut, outPath: resolvedOut, ms: Math.round(performance.now() - t0) };
}

/**
 * Xuất toàn bộ đồ thị ra JSON { version, exportedAt, nodesCount, edgesCount, nodes, edges }.
 * keepSecrets = true chỉ dùng cho bản sao lưu trên máy chủ.
 */
export async function exportJson(outPath, { keepSecrets = false } = {}) {
  await ensureDb();
  const t0 = performance.now();

  const resolvedOut = path.resolve(outPath);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

  const nodes = (await readAll(admin.exportNodes)).map((r) => ({ label: r.label, props: stripSecrets(r.props, keepSecrets) }));
  const edges = (await readAll(admin.exportEdges)).map((r) => ({ type: r.type, s: r.s, t: r.t, props: r.props || {} }));

  // Các trường tóm tắt đứng đầu file để đọc nhanh danh sách sao lưu mà không phải parse cả file
  const dump = {
    version: '1.1',
    exportedAt: Date.now(),
    nodesCount: nodes.length,
    edgesCount: edges.length,
    nodes,
    edges,
  };
  fs.writeFileSync(resolvedOut, JSON.stringify(dump), 'utf8');

  return { nodes: nodes.length, edges: edges.length, file: resolvedOut, outPath: resolvedOut, ms: Math.round(performance.now() - t0) };
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('exporter.js')) {
  const [, , mode, arg1, arg2] = process.argv;
  (async () => {
    try {
      await connectDb();
      if (mode === 'csv' && arg1 && arg2) {
        const res = await exportCsv(arg1, arg2);
        console.log(`✅ Exported ${res.rows} rows (${res.kind}) to ${res.outPath} in ${res.ms}ms.`);
      } else if (mode === 'json' && arg1) {
        const res = await exportJson(arg1);
        console.log(`✅ Exported ${res.nodes} nodes and ${res.edges} edges to ${res.outPath} in ${res.ms}ms.`);
      } else {
        console.log('Usage:');
        console.log('  node database/lib/exporter.js csv <label|type> <outPath>');
        console.log('  node database/lib/exporter.js json <outPath>');
      }
      await closeDb();
    } catch (err) {
      console.error('Export error:', err);
      process.exit(1);
    }
  })();
}
