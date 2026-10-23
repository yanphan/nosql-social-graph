import { read } from '../db/graph.js';
import { analytics } from '../queries/analytics.js';
import { pathToGraph, rowsToGraph } from '../db/graphMapper.js';

const toProps = (p) => (p?.properties ? p.properties : p);

export async function shortestPath(a, b, maxDepth = 6) {
  const rows = await read(analytics.shortestPath(maxDepth), { a, b });
  if (!rows.length) return null;
  const { ns, rs, len } = rows[0];
  return {
    length: Number(len),
    steps: (ns || []).map((n) => n?.properties?.username ?? ''),
    graph: pathToGraph({ ns: ns || [], rs: rs || [] }),
  };
}

export async function trending(sinceMs = 0) {
  const [likesRows, commentsRows, sharesRows] = await Promise.all([
    read(analytics.trendingLikes, { since: sinceMs }),
    read(analytics.trendingComments, { since: sinceMs }),
    read(analytics.trendingShares, { since: sinceMs }),
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

  for (const item of map.values()) {
    item.interactions = item.likes * 1 + item.comments * 2 + item.shares * 3;
  }

  return [...map.values()].sort((a, b) => b.interactions - a.interactions);
}

export async function friendSuggestions(uid, limit = 10) {
  const rows = await read(analytics.friendSuggestions, { uid, limit });
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    fullName: r.fullName ?? '',
    mutual: Number(r.mutual ?? 0),
    sharedTopics: Number(r.sharedTopics ?? 0),
    score: Number(r.score ?? 0),
  }));
}

export async function popularUsers(uid, limit = 10) {
  const rows = await read(analytics.popularUsers, { uid, limit });
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    fullName: r.fullName ?? '',
    followers: Number(r.followers ?? 0),
    score: Number(r.followers ?? 0),
  }));
}

export async function postSuggestions(uid, limit = 10) {
  const rows = await read(analytics.postSuggestions, { uid, limit });
  return rows.map((r) => {
    const p = toProps(r.p);
    return {
      post: {
        id: p.id,
        content: p.content,
        createdAt: Number(p.createdAt ?? 0),
        language: p.language || 'vi',
        likeCount: Number(p.likeCount ?? 0),
        commentCount: Number(p.commentCount ?? 0),
        shareCount: Number(p.shareCount ?? 0),
        author: {
          id: r.authorId,
          username: r.authorUsername,
        },
      },
      friendLikes: Number(r.friendLikes ?? 0),
      interest: Number(r.interest ?? 0),
      score: Number(r.score ?? 0),
    };
  });
}

export async function popularPosts(since = 0, limit = 10) {
  const rows = await read(analytics.popularPosts, { since, limit });
  return rows.map((r) => {
    const p = toProps(r.p);
    return {
      post: {
        id: p.id,
        content: p.content,
        createdAt: Number(p.createdAt ?? 0),
        language: p.language || 'vi',
        likeCount: Number(p.likeCount ?? 0),
        commentCount: Number(p.commentCount ?? 0),
        shareCount: Number(p.shareCount ?? 0),
        author: {
          id: r.authorId,
          username: r.authorUsername,
        },
      },
      friendLikes: 0,
      interest: 0,
      score: Number(r.score ?? 0),
    };
  });
}

export async function topFollowers(limit = 10) {
  const rows = await read(analytics.topFollowers, { limit });
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    fullName: r.fullName ?? '',
    followers: Number(r.followers ?? 0),
  }));
}

export async function pageRank(limit = 10) {
  try {
    const rows = await read(analytics.pageRank, { limit });
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      score: Number(r.score ?? 0),
    }));
  } catch {
    // FalkorDB chưa có hoặc không hỗ trợ algo.pageRank -> fallback in-memory
    return null;
  }
}

export async function allFollowEdges() {
  const rows = await read(analytics.allFollowEdges);
  return rows.map((r) => ({ s: r.s, t: r.t }));
}

export async function wcc() {
  try {
    const rows = await read(analytics.wcc);
    return rows.map((r) => ({
      cid: r.cid,
      members: Array.isArray(r.members) ? r.members : [],
    }));
  } catch {
    return null;
  }
}

export async function spreadRows(pid) {
  const rows = await read(analytics.spreadRows, { pid });
  return rows.map((r) => ({
    authorId: r.authorId,
    authorUsername: r.authorUsername,
    content: r.content,
    userId: r.userId,
    username: r.username,
    at: r.at ? Number(r.at) : null,
    via: r.via ?? null,
  }));
}

export async function neighborhood(id, limit = 100) {
  const rows = await read(analytics.neighborhood, { id, limit });
  return rowsToGraph(rows);
}

export async function overview(limit = 100) {
  const rows = await read(analytics.overview, { limit });
  return rowsToGraph(rows);
}
