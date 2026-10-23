import { read } from '../db/graph.js';
import { admin } from '../queries/admin.js';

export async function stats() {
  const [nodesRows, edgesRows, degreeRows] = await Promise.all([
    read(admin.countByLabel),
    read(admin.countByType),
    read(admin.degreeBuckets),
  ]);

  const nodes = {};
  for (const r of nodesRows) {
    if (r.label) nodes[r.label] = Number(r.c ?? 0);
  }

  const edges = {};
  for (const r of edgesRows) {
    if (r.type) edges[r.type] = Number(r.c ?? 0);
  }

  const degreeBuckets = degreeRows.map((r) => ({
    degree: Number(r.degree ?? 0),
    users: Number(r.users ?? 0),
  }));

  const userCount = nodes['User'] ?? 0;
  let scale = 'S';
  if (userCount >= 100_000) scale = 'L';
  else if (userCount >= 10_000) scale = 'M';

  return {
    nodes,
    edges,
    degreeBuckets,
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
