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

const DAY = 86_400_000;
const num = (v) => Number(v ?? 0);

/**
 * Số liệu cho trang tổng quan của admin.
 * @param {number} now mốc thời gian hiện tại (ms)
 * @param {number} from 0 giờ của ngày đầu tiên trong biểu đồ hoạt động (ms)
 * @param {number} days số ngày của biểu đồ
 */
export async function overview({ now, from, days }) {
  const p = { week: now - 7 * DAY, prevWeek: now - 14 * DAY, from, day: DAY };
  const q = admin.overview;
  const [[u = {}], [po = {}], du, dp, di, [et = {}], edgesRows] = await Promise.all([
    read(q.users, p),
    read(q.posts, p),
    read(q.dailyUsers, p),
    read(q.dailyPosts, p),
    read(q.dailyInteractions, p),
    read(q.emptyTopics),
    read(admin.countByType),
  ]);

  // Gộp ba chuỗi theo ngày; ngày không có dữ liệu = 0
  const series = Array.from({ length: days }, (_, i) => ({ date: from + i * DAY, users: 0, posts: 0, interactions: 0 }));
  const fill = (rows, key) => {
    for (const r of rows) {
      const i = num(r.d);
      if (i >= 0 && i < days) series[i][key] = num(r.c);
    }
  };
  fill(du, 'users');
  fill(dp, 'posts');
  fill(di, 'interactions');

  const edges = {};
  for (const r of edgesRows) if (r.type) edges[r.type] = num(r.c);

  return {
    users: { total: num(u.total), locked: num(u.locked), admins: num(u.admins), newWeek: num(u.newWeek), newPrevWeek: num(u.newPrevWeek) },
    posts: { total: num(po.total), newWeek: num(po.newWeek), newPrevWeek: num(po.newPrevWeek) },
    edges,
    totalEdges: Object.values(edges).reduce((a, b) => a + b, 0),
    emptyTopics: { count: num(et.c), names: et.names ?? [] },
    activity: series,
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
