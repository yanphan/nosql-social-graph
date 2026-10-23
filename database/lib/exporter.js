import fs from 'node:fs';
import path from 'node:path';
import { stringify } from 'csv-stringify/sync';
import { read } from '../../backend/src/db/graph.js';
import { admin } from '../../backend/src/queries/admin.js';

export async function exportCsv(label, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const cypher = `MATCH (n:${label}) RETURN properties(n) AS props`;
  const rows = await read(cypher);
  const data = rows.map((r) => r.props || {});

  if (!data.length) {
    fs.writeFileSync(outPath, '', 'utf8');
    return { rows: 0, file: outPath };
  }

  // Lấy danh sách keys làm header
  const headers = Object.keys(data[0]);
  const csvContent = stringify(data, { header: true, columns: headers });
  fs.writeFileSync(outPath, csvContent, 'utf8');

  return { rows: data.length, file: outPath };
}

export async function exportJson(outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  let skip = 0;
  const limit = 5000;
  let allNodes = [];
  let allEdges = [];

  // Đọc toàn bộ nodes theo lô
  while (true) {
    const rows = await read(admin.exportNodes, { skip, limit });
    if (!rows.length) break;
    for (const r of rows) {
      allNodes.push({ label: r.label, props: r.props });
    }
    if (rows.length < limit) break;
    skip += limit;
  }

  // Đọc toàn bộ edges theo lô
  skip = 0;
  while (true) {
    const rows = await read(admin.exportEdges, { skip, limit });
    if (!rows.length) break;
    for (const r of rows) {
      allEdges.push({ type: r.type, s: r.s, t: r.t, props: r.props });
    }
    if (rows.length < limit) break;
    skip += limit;
  }

  const dump = {
    exportedAt: Date.now(),
    nodesCount: allNodes.length,
    edgesCount: allEdges.length,
    nodes: allNodes,
    edges: allEdges,
  };

  fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8');
  return { nodes: allNodes.length, edges: allEdges.length, file: outPath };
}
