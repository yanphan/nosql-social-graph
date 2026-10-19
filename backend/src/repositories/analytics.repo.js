import { read } from '../db/graph.js';
import { analytics } from '../queries/analytics.js';
import { rowsToGraph, pathToGraph } from '../db/graphMapper.js';

const toProps = (n) => (n?.properties ? n.properties : n);

const mapPostSummary = (p, authorId, authorUsername) => {
  const props = toProps(p) || {};
  return {
    id: props.id,
    content: props.content,
    createdAt: Number(props.createdAt ?? 0),
    language: props.language || 'vi',
    likeCount: Number(props.likeCount ?? 0),
    commentCount: Number(props.commentCount ?? 0),
    shareCount: Number(props.shareCount ?? 0),
    author: {
      id: authorId || '',
      username: authorUsername || '',
    },
  };
};

// BT1: Đường đi ngắn nhất
export async function shortestPath(a, b, maxDepth = 6) {
  const query = analytics.shortestPath(maxDepth);
  const rows = await read(query, { a, b });
  if (!rows.length || !rows[0].ns) return null;

  const { ns, rs, len } = rows[0];
  return {
    length: Number(len),
    steps: ns.map((n) => n.properties?.username || n.username),
    graph: pathToGraph({ ns, rs }),
  };
}

// BT2: Chủ đề nóng theo khoảng thời gian
export async function trending(sinceMs = Date.now() - 7 * 86400000, limit = 10) {
  const [likesRows, commentsRows, sharesRows] = await Promise.all([
    read(analytics.trendingLikes, { since: Number(sinceMs) }),
    read(analytics.trendingComments, { since: Number(sinceMs) }),
    read(analytics.trendingShares, { since: Number(sinceMs) }),
  ]);

  const map = new Map();

  const getOrCreate = (id, name) => {
    if (!map.has(id)) {
      map.set(id, { id, name, likes: 0, comments: 0, shares: 0, interactions: 0 });
    }
    return map.get(id);
  };

  for (const r of likesRows) {
    const item = getOrCreate(r.id, r.name);
    item.likes = Number(r.n ?? 0);
  }

  for (const r of commentsRows) {
    const item = getOrCreate(r.id, r.name);
    item.comments = Number(r.n ?? 0);
  }

  for (const r of sharesRows) {
    const item = getOrCreate(r.id, r.name);
    item.shares = Number(r.n ?? 0);
  }

  // Calculate weighted interactions: like*1 + comment*2 + share*3
  for (const item of map.values()) {
    item.interactions = item.likes * 1 + item.comments * 2 + item.shares * 3;
  }

  const sorted = [...map.values()]
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return sorted;
}

// BT3: Gợi ý bạn bè
export async function friendSuggestions(uid, limit = 10) {
  const rows = await read(analytics.friendSuggestions, { uid, limit: Number(limit) });
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    fullName: r.fullName,
    mutual: Number(r.mutual ?? 0),
    sharedTopics: Number(r.sharedTopics ?? 0),
    score: Number(r.score ?? 0),
  }));
}

// BT3 Fallback: Người dùng có nhiều followers (Cold start)
export async function popularUsers(uid, limit = 10) {
  const rows = await read(analytics.popularUsers, { uid, limit: Number(limit) });
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    fullName: r.fullName,
    followers: Number(r.followers ?? 0),
  }));
}

// BT4: Gợi ý bài viết
export async function postSuggestions(uid, limit = 10) {
  const rows = await read(analytics.postSuggestions, { uid, limit: Number(limit) });
  return rows.map((r) => ({
    post: mapPostSummary(r.p, r.authorId, r.authorUsername),
    friendLikes: Number(r.friendLikes ?? 0),
    interest: Number(r.interest ?? 0),
    score: Number(r.score ?? 0),
  }));
}

// BT4 Fallback: Bài viết nhiều like nhất gần đây (Cold start)
export async function popularPosts(since = Date.now() - 30 * 86400000, limit = 10) {
  const rows = await read(analytics.popularPosts, { since: Number(since), limit: Number(limit) });
  return rows.map((r) => ({
    post: mapPostSummary(r.p, r.authorId, r.authorUsername),
    friendLikes: 0,
    interest: 0,
    score: Number(r.score ?? 0),
  }));
}

// BT5: Người có nhiều followers nhất
export async function topFollowers(limit = 10) {
  const rows = await read(analytics.topFollowers, { limit: Number(limit) });
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    fullName: r.fullName,
    followers: Number(r.followers ?? 0),
  }));
}

// BT5: Thuật toán PageRank
export async function pageRank(limit = 10) {
  const rows = await read(analytics.pageRank, { limit: Number(limit) });
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    score: Number(r.score ?? 0),
  }));
}

// BT5: Danh sách toàn bộ cạnh follow (cho thuật toán in-memory)
export async function allFollowEdges() {
  const rows = await read(analytics.allFollowEdges);
  return rows.map((r) => ({
    s: r.s,
    t: r.t,
  }));
}

// BT5: Weakly Connected Components
export async function wcc() {
  const rows = await read(analytics.wcc);
  return rows.map((r) => ({
    cid: r.cid,
    members: Array.isArray(r.members) ? r.members : [],
  }));
}

// BT5: Truy vết lan truyền bài viết
export async function spreadRows(pid) {
  const rows = await read(analytics.spreadRows, { pid });
  return rows.map((r) => ({
    authorId: r.authorId,
    authorUsername: r.authorUsername,
    content: r.content,
    userId: r.userId,
    username: r.username,
    at: Number(r.at ?? 0),
    via: r.via || null,
  }));
}

// Canvas Đồ thị con xung quanh 1 node (Neighborhood)
export async function neighborhood(id, limit = 50) {
  const rows = await read(analytics.neighborhood, { id, limit: Number(limit) });
  return rowsToGraph(rows);
}

// Canvas Đồ thị tổng quan (Overview)
export async function overview(limit = 100) {
  const rows = await read(analytics.overview, { limit: Number(limit) });
  return rowsToGraph(rows);
}
