import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import * as usersRepo from '../repositories/users.repo.js';
import * as postsRepo from '../repositories/posts.repo.js';
import * as topicsRepo from '../repositories/topics.repo.js';
import * as analyticsRepo from '../repositories/analytics.repo.js';
import * as adminRepo from '../repositories/admin.repo.js';
import { signToken } from '../middlewares/auth.js';
import { appCache } from '../utils/cache.js';

vi.mock('../repositories/users.repo.js');
vi.mock('../repositories/posts.repo.js');
vi.mock('../repositories/topics.repo.js');
vi.mock('../repositories/analytics.repo.js');
vi.mock('../repositories/admin.repo.js');

describe('Analytics & 5 Graph Problems API (Sprint 2)', () => {
  let app;
  const userToken = signToken({ id: 'u_alice', username: 'alice', role: 'user' });
  const analystToken = signToken({ id: 'u_analyst', username: 'analyst', role: 'analyst' });
  const adminToken = signToken({ id: 'u_admin', username: 'admin', role: 'admin' });

  beforeEach(async () => {
    vi.clearAllMocks();
    appCache.clear();
    app = await createApp();
  });

  // --- BT1: Shortest Path ---
  describe('BT1: Shortest Path (/api/path)', () => {
    it('GET /api/path -> tìm đường đi giữa 2 user thành công', async () => {
      usersRepo.findByUsername.mockImplementation((name) =>
        Promise.resolve({ id: `id_${name}`, username: name, fullName: `User ${name}` })
      );
      analyticsRepo.shortestPath.mockResolvedValue({
        length: 2,
        steps: ['alice', 'bob', 'charlie'],
        graph: {
          nodes: [{ id: 'id_alice' }, { id: 'id_bob' }, { id: 'id_charlie' }],
          edges: [{ id: 'FOLLOWS:id_alice:id_bob' }, { id: 'FOLLOWS:id_bob:id_charlie' }],
        },
      });

      const res = await request(app)
        .get('/api/path?from=alice&to=charlie&maxDepth=4')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.found).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.steps).toEqual(['alice', 'bob', 'charlie']);
    });

    it('GET /api/path -> from === to trả về length = 0 và steps = [from]', async () => {
      usersRepo.findByUsername.mockResolvedValue({ id: 'u_alice', username: 'alice' });

      const res = await request(app)
        .get('/api/path?from=alice&to=alice')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.data.steps).toEqual(['alice']);
    });

    it('GET /api/path -> tài khoản không tồn tại trả về 404 NOT_FOUND', async () => {
      usersRepo.findByUsername.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/path?from=alice&to=ghost')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('GET /api/path -> maxDepth > 6 trả về 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/path?from=alice&to=bob&maxDepth=10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // --- BT2: Trending Topics ---
  describe('BT2: Trending Topics (/api/topics/trending)', () => {
    it('GET /api/topics/trending -> trả về danh sách xếp hạng có rank', async () => {
      analyticsRepo.trending.mockResolvedValue([
        { id: 't_ai', name: 'ai', likes: 10, comments: 5, shares: 2, interactions: 26 },
        { id: 't_web', name: 'web', likes: 6, comments: 2, shares: 1, interactions: 13 },
      ]);

      const res = await request(app)
        .get('/api/topics/trending?days=7&limit=10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].rank).toBe(1);
      expect(res.body.data[0].name).toBe('ai');
      expect(res.body.data[1].rank).toBe(2);
    });

    it('GET /api/topics/trending -> days = 0 trả về 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/topics/trending?days=0')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // --- BT3: Friend Suggestions ---
  describe('BT3: Friend Suggestions (/api/recommend/friends)', () => {
    it('GET /api/recommend/friends -> gợi ý bạn bè kèm lý do và score', async () => {
      analyticsRepo.friendSuggestions.mockResolvedValue([
        { id: 'u_david', username: 'david', fullName: 'David Le', mutual: 3, sharedTopics: 2, score: 8 },
      ]);

      const res = await request(app)
        .get('/api/recommend/friends?limit=1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data[0].username).toBe('david');
      expect(res.body.data[0].reason).toContain('3 bạn chung');
    });

    it('GET /api/recommend/friends -> fallback cold-start sang popularUsers cho tài khoản mới', async () => {
      analyticsRepo.friendSuggestions.mockResolvedValue([]);
      analyticsRepo.popularUsers.mockResolvedValue([
        { id: 'u_celeb', username: 'celeb', fullName: 'Celebrity', followers: 500 },
      ]);

      const res = await request(app)
        .get('/api/recommend/friends?limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data[0].username).toBe('celeb');
      expect(res.body.data[0].reason).toContain('Người nổi bật');
    });
  });

  // --- BT4: Post Suggestions ---
  describe('BT4: Post Suggestions (/api/recommend/posts)', () => {
    it('GET /api/recommend/posts -> gợi ý bài viết phù hợp', async () => {
      analyticsRepo.postSuggestions.mockResolvedValue([
        {
          post: { id: 'p_tech', content: 'Tech future', author: { id: 'u_bob', username: 'bob' } },
          friendLikes: 2,
          interest: 0.9,
          score: 6.7,
        },
      ]);

      const res = await request(app)
        .get('/api/recommend/posts?limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data[0].post.id).toBe('p_tech');
      expect(res.body.data[0].friendLikes).toBe(2);
    });
  });

  // --- BT5: Influence, Communities & Spread Tree ---
  describe('BT5: Advanced Analytics & RBAC', () => {
    it('GET /api/analytics/influence -> Analyst truy cập được bảng xếp hạng (200)', async () => {
      analyticsRepo.topFollowers.mockResolvedValue([
        { id: 'u_bob', username: 'bob', fullName: 'Bob', followers: 150 },
      ]);

      const res = await request(app)
        .get('/api/analytics/influence?metric=followers&limit=5')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data[0].rank).toBe(1);
      expect(res.body.data[0].followers).toBe(150);
    });

    it('GET /api/analytics/influence -> User thường bị chặn 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/analytics/influence')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/analytics/communities -> Analyst xem được phân cụm cộng đồng (200)', async () => {
      analyticsRepo.wcc.mockResolvedValue([
        { cid: '1', members: ['u_alice', 'u_bob'] },
      ]);
      usersRepo.findById.mockImplementation((id) => Promise.resolve({ id, username: id }));

      const res = await request(app)
        .get('/api/analytics/communities')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.communities[0].size).toBe(2);
    });

    it('GET /api/analytics/spread/:postId -> Dựng cây lan truyền bài viết chính xác', async () => {
      postsRepo.findById.mockResolvedValue({
        id: 'p_viral',
        content: 'Breaking News',
        createdAt: 1700000000000,
        author: { id: 'u_alice', username: 'alice' },
      });
      analyticsRepo.spreadRows.mockResolvedValue([
        {
          authorId: 'u_alice',
          authorUsername: 'alice',
          content: 'Breaking News',
          userId: 'u_bob',
          username: 'bob',
          at: 1700000001000,
          via: null, // share từ alice
        },
        {
          authorId: 'u_alice',
          authorUsername: 'alice',
          content: 'Breaking News',
          userId: 'u_charlie',
          username: 'charlie',
          at: 1700000002000,
          via: 'u_bob', // share từ bob
        },
      ]);

      const res = await request(app)
        .get('/api/analytics/spread/p_viral')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.depth).toBe(3); // alice -> bob -> charlie
      expect(res.body.data.tree.user).toBe('alice');
      expect(res.body.data.tree.children[0].user).toBe('bob');
      expect(res.body.data.tree.children[0].children[0].user).toBe('charlie');
    });
  });

  // --- Subgraph, Search & Stats ---
  describe('Subgraph, Search & Stats', () => {
    it('GET /api/graph/subgraph -> Lấy đồ thị con thành công', async () => {
      analyticsRepo.overview.mockResolvedValue({
        nodes: [{ id: 'u_alice', label: 'User' }],
        edges: [],
      });

      const res = await request(app)
        .get('/api/graph/subgraph')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.nodes).toHaveLength(1);
    });

    it('GET /api/search?q=graph -> Tìm kiếm toàn cục', async () => {
      usersRepo.search.mockResolvedValue([{ id: 'u_graph', username: 'graph_lover', role: 'user' }]);
      postsRepo.search.mockResolvedValue([]);
      topicsRepo.search.mockResolvedValue([{ id: 't_graph', name: 'graph', description: '' }]);

      const res = await request(app)
        .get('/api/search?q=graph')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.users).toHaveLength(1);
      expect(res.body.data.topics).toHaveLength(1);
    });

    it('GET /api/stats -> Analyst xem được thống kê hệ thống (200)', async () => {
      adminRepo.stats.mockResolvedValue({
        nodes: { User: 1000, Post: 5000, Topic: 50 },
        edges: { FOLLOWS: 15000 },
        degreeBuckets: [{ degree: 1, users: 100 }],
        scale: 'S',
      });

      const res = await request(app)
        .get('/api/stats')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.scale).toBe('S');
      expect(res.body.data.nodes.User).toBe(1000);
    });
  });
});
