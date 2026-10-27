import * as analyticsRepo from '../repositories/analytics.repo.js';
import * as adminRepo from '../repositories/admin.repo.js';
import * as usersRepo from '../repositories/users.repo.js';
import * as postsRepo from '../repositories/posts.repo.js';
import * as topicsRepo from '../repositories/topics.repo.js';
import { NotFound } from '../utils/errors.js';
import { appCache } from '../utils/cache.js';
import { computePageRank, computeWCC } from '../utils/graphAlgos.js';

export async function getInfluence({ metric = 'followers', limit = 10 } = {}) {
  const l = Math.min(100, Math.max(1, Number(limit) || 10));
  const cacheKey = `influence:${metric}:${l}`;
  const cached = appCache.get(cacheKey);
  if (cached) return cached;

  let result;
  if (metric === 'pagerank') {
    let prList = await analyticsRepo.pageRank(l);

    // Fallback in-memory nếu DB chưa có module algo.pageRank
    if (!prList) {
      const edges = await analyticsRepo.allFollowEdges();
      prList = computePageRank(edges).slice(0, l);
    }

    // Nạp thêm thông tin username và fullName nếu thiếu
    const fullUsers = await Promise.all(
      prList.map(async (item) => {
        const u = await usersRepo.findById(item.id);
        return {
          id: item.id,
          username: u?.username ?? item.username ?? '',
          fullName: u?.fullName ?? '',
          pagerank: item.score,
        };
      })
    );

    result = fullUsers.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  } else {
    // Mặc định: theo số follower
    const top = await analyticsRepo.topFollowers(l);
    result = top.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }

  appCache.set(cacheKey, result, 60_000);
  return result;
}

export async function getCommunities() {
  let list = await analyticsRepo.wcc();

  // Fallback in-memory
  if (!list) {
    const edges = await analyticsRepo.allFollowEdges();
    list = computeWCC(edges);
  }

  // Format từng cộng đồng kèm top thành viên
  const communities = await Promise.all(
    list.map(async (c, idx) => {
      const memberIds = c.members.slice(0, 5);
      const topMembers = await Promise.all(
        memberIds.map(async (id) => {
          const u = await usersRepo.findById(id);
          return { id, username: u?.username ?? id };
        })
      );
      return {
        id: String(c.cid ?? idx + 1),
        size: c.members.length,
        top: topMembers,
      };
    })
  );

  return {
    count: communities.length,
    communities,
  };
}

export async function getSpreadTree(postId) {
  const post = await postsRepo.findById(postId);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }

  const rows = await analyticsRepo.spreadRows(postId);

  // Root node là tác giả bài viết
  const root = {
    user: post.author.username,
    userId: post.author.id,
    at: post.createdAt,
    children: [],
  };

  const userNodeMap = new Map();
  userNodeMap.set(post.author.id, root);

  const pendingShares = [];
  for (const r of rows) {
    if (!r.userId) continue;
    const node = {
      user: r.username,
      userId: r.userId,
      at: r.at,
      children: [],
    };
    userNodeMap.set(r.userId, node);
    pendingShares.push({ via: r.via, node });
  }

  // Ghép các nhánh cây dựa vào thuộc tính `via`
  for (const { via, node } of pendingShares) {
    if (via && userNodeMap.has(via)) {
      userNodeMap.get(via).children.push(node);
    } else {
      // Chia sẻ trực tiếp từ bài viết gốc
      root.children.push(node);
    }
  }

  // Tính độ sâu tối đa của cây lan truyền
  function calcDepth(curr) {
    if (!curr.children || curr.children.length === 0) return 1;
    let maxChild = 0;
    for (const child of curr.children) {
      maxChild = Math.max(maxChild, calcDepth(child));
    }
    return maxChild + 1;
  }

  return {
    post: {
      id: post.id,
      content: post.content,
      author: post.author,
    },
    total: pendingShares.length,
    depth: calcDepth(root),
    tree: root,
  };
}

export async function getSubgraph(params = {}) {
  return analyticsRepo.getSubgraphUnified(params);
}

export async function searchGlobal({ q = '', type = 'all', limit = 10 } = {}) {
  const query = (q || '').trim();
  const l = Math.min(50, Math.max(1, Number(limit) || 10));

  const result = { users: [], posts: [], topics: [] };
  if (!query) return result;

  const promises = [];
  if (type === 'all' || type === 'user') {
    promises.push(
      usersRepo.search(query, l).then((res) => {
        result.users = res.map((u) => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName ?? '',
          role: u.role ?? 'user',
        }));
      })
    );
  }
  if (type === 'all' || type === 'post') {
    promises.push(
      postsRepo.search(query, l).then((res) => {
        result.posts = res.map((p) => ({
          id: p.id,
          content: p.content,
          createdAt: Number(p.createdAt ?? 0),
          authorUsername: p.authorUsername,
        }));
      })
    );
  }
  if (type === 'all' || type === 'topic') {
    promises.push(
      topicsRepo.search(query, l).then((res) => {
        result.topics = res.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description ?? '',
        }));
      })
    );
  }

  await Promise.all(promises);
  return result;
}

export async function getStats() {
  return adminRepo.stats();
}
