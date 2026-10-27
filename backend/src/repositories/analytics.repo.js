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
          fullName: r.authorFullName ?? '',
        },
        topics: Array.isArray(r.topics) ? r.topics : [],
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
          fullName: r.authorFullName ?? '',
        },
        topics: Array.isArray(r.topics) ? r.topics : [],
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

export async function getSubgraphUnified({ center = '', hops = 1, limit = 120 } = {}) {
  const l = Math.max(10, Math.min(300, Number(limit) || 120));
  const h = Number(hops) === 2 ? 2 : 1;

  if (center && center.trim()) {
    const rawCenter = center.trim();
    const cleanCenter = rawCenter.replace(/^[@#]/, '');
    try {
      if (h === 2) {
        const q2 = `
          MATCH (u) WHERE u.id = $rawCenter OR u.id = $cleanCenter OR u.username = $cleanCenter OR u.name = $cleanCenter
          MATCH (u)-[r1]-(b)
          WITH u, r1, b LIMIT ${Math.round(l * 0.4)}
          OPTIONAL MATCH (b)-[r2]-(c)
          WHERE c <> u
          WITH u, r1, b, r2, c LIMIT ${l}
          UNWIND [
            { a: u, r: r1, b: b },
            CASE WHEN r2 IS NOT NULL THEN { a: b, r: r2, b: c } ELSE NULL END
          ] AS pair
          WHERE pair IS NOT NULL
          RETURN pair.a AS a, pair.r AS r, pair.b AS b
        `;
        const rows = await read(q2, { rawCenter, cleanCenter });
        if (rows && rows.length > 0) return rowsToGraph(rows);
      }

      const q1 = `
        MATCH (u) WHERE u.id = $rawCenter OR u.id = $cleanCenter OR u.username = $cleanCenter OR u.name = $cleanCenter
        MATCH (u)-[r]-(b)
        RETURN u AS a, r, b LIMIT ${l}
      `;
      const rows = await read(q1, { rawCenter, cleanCenter });
      if (rows && rows.length > 0) return rowsToGraph(rows);
    } catch (err) {
      console.warn('Neighborhood query error:', err.message);
    }
    return { nodes: [], edges: [] };
  }

  // Khi không có center: chọn seed là top 5 User theo bậc kết nối/PageRank rồi mở rộng 1 hop quanh seed
  try {
    const qSeed = `
      MATCH (u:User)<-[:FOLLOWS]-(f:User)
      WITH u, count(f) AS followers ORDER BY followers DESC LIMIT 5
      MATCH (u)-[r]-(b)
      RETURN u AS a, r, b LIMIT ${l}
    `;
    const rows = await read(qSeed);
    if (rows && rows.length > 0) {
      return rowsToGraph(rows);
    }
  } catch (err) {
    console.warn('Top 5 seed query error:', err.message);
  }

  return overview(l);
}

export async function overview(limit = 100) {
  const l = Math.max(20, Math.min(300, Number(limit) || 100));
  const followsLimit = Math.max(10, Math.round(l * 0.35));
  const postedLimit = Math.max(10, Math.round(l * 0.30));
  const likedLimit = Math.max(10, Math.round(l * 0.15));

  try {
    const q = `
      MATCH (a:User)-[r:FOLLOWS]->(b:User) RETURN a, r, b LIMIT ${followsLimit}
      UNION
      MATCH (a:User)-[r:POSTED]->(b:Post) RETURN a, r, b LIMIT ${postedLimit}
      UNION
      MATCH (t:Topic) WITH t LIMIT 8 MATCH (p:Post)-[r:ABOUT]->(t) WITH t, collect({p:p, r:r})[0..3] AS pairs UNWIND pairs AS pair RETURN pair.p AS a, pair.r AS r, t AS b
      UNION
      MATCH (a:User)-[r:LIKED]->(b:Post) RETURN a, r, b LIMIT ${likedLimit}
    `;
    const rows = await read(q);
    if (rows && rows.length > 0) {
      return rowsToGraph(rows);
    }
  } catch (err) {
    console.warn('Overview UNION query fallback:', err.message);
  }

  const rows = await read(analytics.overview, { limit: l });
  return rowsToGraph(rows);
}
