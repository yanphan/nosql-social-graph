import { read, write } from '../db/graph.js';
import { admin } from '../queries/admin.js';

export async function stats() {
  const [nodesRows, edgesRows, degreeRows] = await Promise.all([
    read(admin.countByLabel),
    read(admin.countByType),
    read(admin.degreeBuckets),
  ]);

  const nodes = {};
  let totalNodes = 0;
  for (const r of nodesRows) {
    if (r.label) {
      const c = Number(r.c ?? 0);
      nodes[r.label] = c;
      totalNodes += c;
    }
  }

  const edges = {};
  let totalEdges = 0;
  for (const r of edgesRows) {
    if (r.type) {
      const c = Number(r.c ?? 0);
      edges[r.type] = c;
      totalEdges += c;
    }
  }

  const degreeBucketsList = degreeRows.map((r) => ({
    degree: Number(r.degree ?? 0),
    users: Number(r.users ?? 0),
  }));

  const userCount = nodes['User'] ?? 0;
  let scale = 'S';
  if (userCount >= 100_000) scale = 'L';
  else if (userCount >= 10_000) scale = 'M';

  return {
    totalNodes,
    totalEdges,
    nodes,
    edges,
    degreeBuckets: degreeBucketsList,
    scale,
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
