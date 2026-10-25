import fs from 'node:fs';
import path from 'node:path';
import { stringify } from 'csv-stringify/sync';
import { read, connectDb, closeDb, getGraph } from '../../backend/src/db/graph.js';
import { admin } from '../../backend/src/queries/admin.js';

const CHUNK_SIZE = 5000;
const NODE_LABELS = new Set(['user', 'post', 'topic']);

async function ensureDb() {
  try {
    getGraph();
  } catch (_) {
    await connectDb();
  }
}

/**
 * Export data as CSV
 * @param {string} label - Node label (User, Post, Topic) or Edge type (FOLLOWS, ABOUT, LIKED, etc.)
 * @param {string} outPath - File path to save CSV
 * @returns {Promise<{ rows: number, file: string, outPath: string, ms: number }>}
 */
export async function exportCsv(label, outPath) {
  await ensureDb();
  const t0 = performance.now();

  const resolvedOut = path.resolve(outPath);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

  const cleanInput = (label || '').trim();
  const isNode = NODE_LABELS.has(cleanInput.toLowerCase());
  let rows = [];

  if (isNode) {
    const cleanLabel = cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1).toLowerCase();
    const cypher = `MATCH (n:\`${cleanLabel}\`) RETURN properties(n) AS props`;
    const result = await read(cypher);
    rows = result.map((r) => r.props || {});
  } else {
    // Relationship export
    const cleanType = cleanInput.toUpperCase();
    const cypher = `MATCH (a)-[r:\`${cleanType}\`]->(b) RETURN a.id AS s, b.id AS t, properties(r) AS props`;
    const result = await read(cypher);
    rows = result.map((r) => ({
      s: r.s,
      t: r.t,
      ...(r.props || {}),
    }));
  }

  if (!rows.length) {
    fs.writeFileSync(resolvedOut, '', 'utf8');
    return { rows: 0, file: resolvedOut, outPath: resolvedOut, ms: Math.round(performance.now() - t0) };
  }

  const headers = Object.keys(rows[0]);
  const csvContent = stringify(rows, { header: true, columns: headers });
  fs.writeFileSync(resolvedOut, csvContent, 'utf8');

  const ms = Math.round(performance.now() - t0);
  return { rows: rows.length, file: resolvedOut, outPath: resolvedOut, ms };
}

/**
 * Export full graph as JSON
 * @param {string} outPath - File path to save JSON
 * @returns {Promise<{ nodes: number, edges: number, file: string, outPath: string, ms: number }>}
 */
export async function exportJson(outPath) {
  await ensureDb();
  const t0 = performance.now();

  const resolvedOut = path.resolve(outPath);
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

  let skip = 0;
  const allNodes = [];
  while (true) {
    const rows = await read(admin.exportNodes, { skip, limit: CHUNK_SIZE });
    if (!rows.length) break;
    for (const r of rows) {
      allNodes.push({ label: r.label, props: r.props });
    }
    if (rows.length < CHUNK_SIZE) break;
    skip += CHUNK_SIZE;
  }

  skip = 0;
  const allEdges = [];
  while (true) {
    const rows = await read(admin.exportEdges, { skip, limit: CHUNK_SIZE });
    if (!rows.length) break;
    for (const r of rows) {
      allEdges.push({ type: r.type, s: r.s, t: r.t, props: r.props });
    }
    if (rows.length < CHUNK_SIZE) break;
    skip += CHUNK_SIZE;
  }

  const dump = {
    version: '1.0',
    exportedAt: Date.now(),
    timestamp: new Date().toISOString(),
    nodesCount: allNodes.length,
    edgesCount: allEdges.length,
    nodes: allNodes,
    edges: allEdges,
  };

  fs.writeFileSync(resolvedOut, JSON.stringify(dump, null, 2), 'utf8');
  const ms = Math.round(performance.now() - t0);

  return {
    nodes: allNodes.length,
    edges: allEdges.length,
    file: resolvedOut,
    outPath: resolvedOut,
    ms,
  };
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('exporter.js')) {
  const [,, mode, arg1, arg2] = process.argv;
  (async () => {
    try {
      await connectDb();
      if (mode === 'csv' && arg1 && arg2) {
        console.log(`Exporting CSV: label="${arg1}", outPath="${arg2}"...`);
        const res = await exportCsv(arg1, arg2);
        console.log(`✅ Success: Exported ${res.rows} rows to ${res.outPath} in ${res.ms}ms.`);
      } else if (mode === 'json' && arg1) {
        console.log(`Exporting JSON: outPath="${arg1}"...`);
        const res = await exportJson(arg1);
        console.log(`✅ Success: Exported ${res.nodes} nodes and ${res.edges} edges to ${res.outPath} in ${res.ms}ms.`);
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
