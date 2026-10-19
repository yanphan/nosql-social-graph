import { read, write } from '../db/graph.js';
import { admin } from '../queries/admin.js';

export async function stats() {
  const [nodeCounts, edgeCounts] = await Promise.all([
    read(admin.countByLabel),
    read(admin.countByType),
  ]);

  const nodes = {};
  let totalNodes = 0;
  for (const r of nodeCounts) {
    const label = r.label || 'Unknown';
    const c = Number(r.c ?? 0);
    nodes[label] = c;
    totalNodes += c;
  }

  const edges = {};
  let totalEdges = 0;
  for (const r of edgeCounts) {
    const type = r.type || 'Unknown';
    const c = Number(r.c ?? 0);
    edges[type] = c;
    totalEdges += c;
  }

  return {
    totalNodes,
    totalEdges,
    nodes,
    edges,
  };
}

export async function degreeBuckets() {
  const rows = await read(admin.degreeBuckets);
  return rows.map((r) => ({
    degree: Number(r.degree ?? 0),
    users: Number(r.users ?? 0),
  }));
}

export async function integrity(now = Date.now()) {
  const checks = Object.entries(admin.integrity);
  const results = [];

  for (const [name, cypher] of checks) {
    const rows = await read(cypher, { now });
    const count = Number(rows[0]?.c ?? 0);
    results.push({
      name,
      count,
      ok: count === 0,
    });
  }

  return results;
}

export async function truncate() {
  await write(admin.deleteGraphData);
  return { truncated: true };
}
