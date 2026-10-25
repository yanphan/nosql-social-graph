import MockAdapter from 'axios-mock-adapter';
import pathFixture from './fixtures/path.json';
import graphFixture from './fixtures/graph.json';

const ok = (data) => [200, { ok: true, data }];

export function installMock(http) {
  console.log('⚡ Mock Mode Enabled (VITE_USE_MOCK=true)');
  const m = new MockAdapter(http, { delayResponse: 350 });

  // Auth mock
  m.onPost('/auth/login').reply((config) => {
    const { username } = JSON.parse(config.data || '{}');
    const role = username === 'admin' ? 'admin' : username === 'analyst' ? 'analyst' : 'user';
    const fullName =
      username === 'admin'
        ? 'Quản trị viên'
        : username === 'analyst'
        ? 'Nhà phân tích'
        : 'Alice Nguyen';

    return ok({
      token: 'mock_jwt_token_sample_123',
      user: {
        id: `usr_${username || 'alice'}`,
        username: username || 'alice',
        fullName,
        role,
        status: 'active',
        bio: 'Tài khoản thử nghiệm mock mode',
      },
    });
  });

  m.onGet('/auth/me').reply(() =>
    ok({
      id: 'usr_alice',
      username: 'alice',
      fullName: 'Alice Nguyen',
      role: 'user',
      status: 'active',
      bio: 'Tài khoản thử nghiệm mock mode',
    })
  );

  // Health
  m.onGet('/health').reply(() => ok({ db: 'up', graph: 'social (mock)' }));

  // BT1: Path
  m.onGet('/path').reply(() => ok(pathFixture));

  // UC-04: Subgraph
  m.onGet('/graph/subgraph').reply(() => ok(graphFixture));

  // Posts Feed
  m.onGet('/posts').reply(() =>
    ok({
      items: [
        {
          id: 'post_mock_1',
          content: 'Chào mừng các bạn đến với hệ thống mạng xã hội đồ thị FalkorDB!',
          createdAt: Date.now() - 3600000,
          likeCount: 12,
          commentCount: 3,
          shareCount: 2,
          likedByMe: true,
          author: { id: 'usr_admin', username: 'admin', fullName: 'Quản trị viên' },
          topics: ['nosql', 'ai'],
        },
        {
          id: 'post_mock_2',
          content: 'Thuật toán shortestPath trên đồ thị với độ phức tạp tối ưu hơn hẳn CTE trong RDBMS.',
          createdAt: Date.now() - 7200000,
          likeCount: 8,
          commentCount: 1,
          shareCount: 0,
          likedByMe: false,
          author: { id: 'usr_alice', username: 'alice', fullName: 'Alice Nguyen' },
          topics: ['nosql'],
        },
      ],
      page: 1,
      limit: 20,
      hasMore: false,
    })
  );

  // Topics
  m.onGet('/topics').reply(() =>
    ok([
      { id: 'top_nosql', name: 'nosql', description: 'Cơ sở dữ liệu đồ thị', postCount: 25 },
      { id: 'top_ai', name: 'ai', description: 'Trí tuệ nhân tạo', postCount: 40 },
      { id: 'top_tech', name: 'technology', description: 'Công nghệ phần mềm', postCount: 18 },
    ])
  );

  // --- Sprint 3: Admin & Analytics Mock Endpoints ---
  // UC-15: Integrity checks
  m.onGet('/admin/integrity').reply(() =>
    ok({
      checks: [
        { key: 'selfFollow', name: 'Không tự theo dõi', count: 0, ok: true },
        { key: 'dupLike', name: 'Không like trùng', count: 0, ok: true },
        { key: 'likeCount', name: 'Khớp số lượng likeCount', count: 0, ok: true },
        { key: 'commentCount', name: 'Khớp số lượng commentCount', count: 0, ok: true },
        { key: 'shareCount', name: 'Khớp số lượng shareCount', count: 0, ok: true },
        { key: 'orphanPost', name: 'Không có bài viết mồ côi', count: 0, ok: true },
        { key: 'orphanTopic', name: 'Bài viết có nhãn chủ đề', count: 0, ok: true },
        { key: 'invalidRole', name: 'Vai trò người dùng hợp lệ', count: 0, ok: true },
        { key: 'futureTimestamp', name: 'Thời gian không ở tương lai', count: 0, ok: true },
      ],
    })
  );

  // UC-15: Import data
  m.onPost('/admin/import').reply((config) => {
    return ok({
      inserted: 125,
      before: 1540,
      after: 1665,
    });
  });

  // UC-15: Export data
  m.onGet('/admin/export').reply((config) => {
    const isJson = config.params?.format === 'json';
    return [
      200,
      isJson ? '{"nodes":[],"edges":[]}' : 'username,fullName,email,role\nalice,Alice,a@t.com,user',
      {
        'content-type': isJson ? 'application/json' : 'text/csv',
        'content-disposition': `attachment; filename=export-${Date.now()}.${isJson ? 'json' : 'csv'}`,
      },
    ];
  });

  // UC-15: Seed graph
  m.onPost('/admin/seed').reply((config) => {
    const { scale = 'S' } = JSON.parse(config.data || '{}');
    const nodes = scale === 'L' ? 3000000 : scale === 'M' ? 275000 : 1540;
    const edges = scale === 'L' ? 8500000 : scale === 'M' ? 780000 : 4210;
    return ok({
      nodes,
      edges,
      ms: 840,
      scale,
    });
  });

  // UC-17: Backup
  m.onPost('/admin/backup').reply(() => {
    return ok({
      file: `backup-${Date.now()}.json`,
      nodes: 1540,
      edges: 4210,
      sizeBytes: 184500,
      createdAt: Date.now(),
    });
  });

  // UC-17: List Backups
  m.onGet('/admin/backups').reply(() => {
    return ok([
      {
        file: `backup-1729841200000.json`,
        sizeBytes: 184500,
        createdAt: Date.now() - 1800000,
        nodes: 1540,
        edges: 4210,
      },
      {
        file: `backup-1729825000000.json`,
        sizeBytes: 182300,
        createdAt: Date.now() - 14400000,
        nodes: 1510,
        edges: 4120,
      },
    ]);
  });

  // UC-17: Restore
  m.onPost('/admin/restore').reply((config) => {
    const { file = 'backup-latest.json' } = JSON.parse(config.data || '{}');
    return ok({
      file,
      nodes: 1540,
      edges: 4210,
      matchesBackup: true,
      restoredAt: Date.now(),
    });
  });

  // UC-16: Audit logs
  m.onGet('/admin/audit').reply(() => {
    return ok([
      {
        timestamp: Date.now() - 45000,
        method: 'POST',
        path: '/api/admin/backup',
        user: 'admin',
        role: 'admin',
        ip: '127.0.0.1',
        status: 200,
        durationMs: 65,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        timestamp: Date.now() - 120000,
        method: 'POST',
        path: '/api/admin/restore',
        user: 'admin',
        role: 'admin',
        ip: '127.0.0.1',
        status: 200,
        durationMs: 142,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        timestamp: Date.now() - 310000,
        method: 'POST',
        path: '/api/posts',
        user: 'alice',
        role: 'user',
        ip: '192.168.1.15',
        status: 201,
        durationMs: 18,
        userAgent: 'Mozilla/5.0 Chrome/128.0',
      },
      {
        timestamp: Date.now() - 650000,
        method: 'POST',
        path: '/api/admin/import?kind=users',
        user: 'admin',
        role: 'admin',
        ip: '127.0.0.1',
        status: 200,
        durationMs: 110,
        userAgent: 'Mozilla/5.0 Firefox/129.0',
      },
      {
        timestamp: Date.now() - 980000,
        method: 'DELETE',
        path: '/api/posts/p_99',
        user: 'bob',
        role: 'user',
        ip: '192.168.1.22',
        status: 403,
        durationMs: 4,
        userAgent: 'Mozilla/5.0 Safari/605.1',
      },
      {
        timestamp: Date.now() - 1500000,
        method: 'GET',
        path: '/api/admin/integrity',
        user: 'admin',
        role: 'admin',
        ip: '127.0.0.1',
        status: 200,
        durationMs: 38,
        userAgent: 'Mozilla/5.0 Chrome/128.0',
      },
    ]);
  });

  // BT5: Influence ranking (PageRank / Followers)
  m.onGet('/analytics/influence').reply((config) => {
    const metric = config.params?.metric || 'followers';
    const limit = Number(config.params?.limit) || 10;
    const users = [
      { id: 'usr_alice', username: 'alice', fullName: 'Alice Nguyen', score: metric === 'pagerank' ? 0.0892 : 42, inDegree: 42, role: 'user', country: 'Vietnam' },
      { id: 'usr_admin', username: 'admin', fullName: 'Quản trị viên', score: metric === 'pagerank' ? 0.0784 : 38, inDegree: 38, role: 'admin', country: 'Vietnam' },
      { id: 'usr_david', username: 'david', fullName: 'David Pham', score: metric === 'pagerank' ? 0.0651 : 31, inDegree: 31, role: 'user', country: 'United States' },
      { id: 'usr_charlie', username: 'charlie', fullName: 'Charlie Tran', score: metric === 'pagerank' ? 0.0512 : 24, inDegree: 24, role: 'user', country: 'Singapore' },
      { id: 'usr_bob', username: 'bob', fullName: 'Bob Le', score: metric === 'pagerank' ? 0.0489 : 22, inDegree: 22, role: 'user', country: 'Vietnam' },
      { id: 'usr_analyst', username: 'analyst', fullName: 'Nhà phân tích', score: metric === 'pagerank' ? 0.0395 : 19, inDegree: 19, role: 'analyst', country: 'Vietnam' },
      { id: 'usr_eva', username: 'eva', fullName: 'Eva Hoang', score: metric === 'pagerank' ? 0.0341 : 16, inDegree: 16, role: 'user', country: 'Japan' },
      { id: 'usr_frank', username: 'frank', fullName: 'Frank Vu', score: metric === 'pagerank' ? 0.0298 : 14, inDegree: 14, role: 'user', country: 'Germany' },
    ];
    return ok(users.slice(0, limit));
  });

  // BT5: Communities (WCC)
  m.onGet('/analytics/communities').reply(() => {
    return ok({
      count: 3,
      communities: [
        {
          id: '1',
          size: 48,
          top: [
            { id: 'usr_alice', username: 'alice' },
            { id: 'usr_admin', username: 'admin' },
            { id: 'usr_david', username: 'david' },
          ],
        },
        {
          id: '2',
          size: 34,
          top: [
            { id: 'usr_bob', username: 'bob' },
            { id: 'usr_charlie', username: 'charlie' },
          ],
        },
        {
          id: '3',
          size: 18,
          top: [
            { id: 'usr_eva', username: 'eva' },
            { id: 'usr_frank', username: 'frank' },
          ],
        },
      ],
    });
  });

  // BT5: Spread Tree
  m.onGet(new RegExp('/analytics/spread/.*')).reply((config) => {
    const postId = config.url.split('/').pop();
    return ok({
      post: {
        id: postId,
        content: 'Chào mừng các bạn đến với hệ thống mạng xã hội đồ thị FalkorDB!',
        author: { id: 'usr_admin', username: 'admin', fullName: 'Quản trị viên' },
      },
      total: 4,
      depth: 3,
      tree: {
        user: 'admin',
        userId: 'usr_admin',
        children: [
          {
            user: 'alice',
            userId: 'usr_alice',
            children: [
              { user: 'david', userId: 'usr_david', children: [] },
              { user: 'eva', userId: 'usr_eva', children: [] },
            ],
          },
          {
            user: 'bob',
            userId: 'usr_bob',
            children: [
              { user: 'charlie', userId: 'usr_charlie', children: [] },
            ],
          },
        ],
      },
    });
  });

  // UC-16: Stats & Degree buckets
  m.onGet('/stats').reply(() => {
    return ok({
      totalNodes: 1540,
      totalEdges: 4210,
      nodes: { User: 100, Post: 420, Topic: 20 },
      edges: {
        FOLLOWS: 1250,
        LIKED: 1500,
        COMMENTED: 680,
        SHARED: 240,
        ABOUT: 420,
        INTERESTED_IN: 120,
      },
      degreeBuckets: [
        { degree: 1, users: 12 },
        { degree: 2, users: 20 },
        { degree: 3, users: 25 },
        { degree: 5, users: 18 },
        { degree: 8, users: 11 },
        { degree: 12, users: 7 },
        { degree: 20, users: 4 },
        { degree: 35, users: 2 },
        { degree: 50, users: 1 },
      ],
      scale: 'S',
    });
  });
}
