import MockAdapter from 'axios-mock-adapter';
import pathFixture from './fixtures/path.json';
import graphFixture from './fixtures/graph.json';

const ok = (data) => [200, { ok: true, data }];

export function installMock(http) {
  console.log('⚡ Mock Mode Enabled (VITE_USE_MOCK=true)');
  const m = new MockAdapter(http, { delayResponse: 350 });

  const mockUsersList = [
    { id: 'usr_admin', username: 'admin', fullName: 'Quản trị viên', role: 'admin', followers: 48, bio: 'Quản trị viên hệ thống FalkorDB Social' },
    { id: 'usr_analyst', username: 'analyst', fullName: 'Nhà phân tích', role: 'analyst', followers: 32, bio: 'Chuyên viên phân tích đồ thị mạng xã hội' },
    { id: 'usr_alice', username: 'alice', fullName: 'Alice Nguyen', role: 'user', followers: 42, bio: 'Kỹ sư phần mềm đam mê CSDL NoSQL' },
    { id: 'usr_david', username: 'david', fullName: 'David Pham', role: 'user', followers: 35, bio: 'Nghiên cứu viên trí tuệ nhân tạo' },
    { id: 'usr_bob', username: 'bob', fullName: 'Bob Le', role: 'user', followers: 22, bio: 'Sinh viên ngành Khoa học dữ liệu' },
    { id: 'usr_charlie', username: 'charlie', fullName: 'Charlie Tran', role: 'user', followers: 28, bio: 'Lập trình viên backend & kiến trúc phân tán' },
    { id: 'usr_eva', username: 'eva', fullName: 'Eva Hoang', role: 'user', followers: 19, bio: 'UX/UI Designer & trực quan hóa đồ thị' },
    { id: 'usr_frank', username: 'frank', fullName: 'Frank Vu', role: 'user', followers: 16, bio: 'Chuyên gia bảo mật mạng' },
  ];

  let savedUser = null;
  try {
    savedUser = JSON.parse(localStorage.getItem('social_user'));
  } catch {}

  let currentUser = savedUser || mockUsersList[0];

  // Auth mock
  m.onPost('/auth/login').reply((config) => {
    const { username } = JSON.parse(config.data || '{}');
    const matched = mockUsersList.find((u) => u.username === username);
    const role = matched?.role || (username === 'admin' ? 'admin' : username === 'analyst' ? 'analyst' : 'user');
    const fullName = matched?.fullName || (username === 'admin' ? 'Quản trị viên' : username === 'analyst' ? 'Nhà phân tích' : username);

    currentUser = {
      id: matched?.id || `usr_${username || 'admin'}`,
      username: username || 'admin',
      fullName,
      role,
      status: 'active',
      bio: matched?.bio || 'Tài khoản thử nghiệm mock mode',
    };

    return ok({
      token: 'mock_jwt_token_sample_123',
      user: currentUser,
    });
  });

  m.onGet('/auth/me').reply(() => ok(currentUser));

  // Users list
  m.onGet('/users').reply(() => ok({ items: mockUsersList, total: mockUsersList.length }));

  // Recommendations
  m.onGet('/recommend/friends').reply(() =>
    ok(mockUsersList.filter((u) => u.username !== currentUser.username).slice(0, 5))
  );

  // Health
  m.onGet('/health').reply(() => ok({ db: 'up', graph: 'social (mock)' }));

  // BT1: Path
  m.onGet('/path').reply(() => ok(pathFixture));

  // UC-04: Subgraph
  m.onGet('/graph/subgraph').reply(() => ok(graphFixture));

  // Posts Feed with multiple users
  m.onGet('/posts').reply(() =>
    ok({
      items: [
        {
          id: 'post_1',
          content: 'Chào mừng các bạn đến với hệ thống mạng xã hội đồ thị FalkorDB! Quy mô dữ liệu hiện tại đã sinh hơn 1.000 người dùng và 5.000 bài viết.',
          createdAt: Date.now() - 1800000,
          likeCount: 24,
          commentCount: 6,
          shareCount: 4,
          likedByMe: true,
          author: { id: 'usr_admin', username: 'admin', fullName: 'Quản trị viên' },
          topics: ['nosql', 'ai'],
        },
        {
          id: 'post_2',
          content: 'Thuật toán shortestPath trên đồ thị với độ phức tạp tối ưu hơn hẳn CTE trong RDBMS khi duyệt sâu từ 3 đến 6 bước nhảy.',
          createdAt: Date.now() - 3600000,
          likeCount: 18,
          commentCount: 4,
          shareCount: 2,
          likedByMe: false,
          author: { id: 'usr_alice', username: 'alice', fullName: 'Alice Nguyen' },
          topics: ['nosql'],
        },
        {
          id: 'post_3',
          content: 'Vừa hoàn thành chạy thực nghiệm phân tích cộng đồng bằng thuật toán WCC (Weakly Connected Components) trên 120.000 quan hệ FOLLOWS!',
          createdAt: Date.now() - 7200000,
          likeCount: 31,
          commentCount: 9,
          shareCount: 7,
          likedByMe: true,
          author: { id: 'usr_david', username: 'david', fullName: 'David Pham' },
          topics: ['ai', 'technology'],
        },
        {
          id: 'post_4',
          content: 'Kết quả đo kiểm tải đồng thời với 100 kết nối song song: FalkorDB đạt thông lượng hơn 8.200 req/s, độ trễ P95 chỉ 14.8ms.',
          createdAt: Date.now() - 14400000,
          likeCount: 42,
          commentCount: 12,
          shareCount: 11,
          likedByMe: false,
          author: { id: 'usr_charlie', username: 'charlie', fullName: 'Charlie Tran' },
          topics: ['technology'],
        },
        {
          id: 'post_5',
          content: 'Cơ chế sao lưu snapshot RDB kết hợp backup logic JSON đảm bảo khả năng phục hồi thảm họa với tỷ lệ đối chiếu Parity 100%.',
          createdAt: Date.now() - 28800000,
          likeCount: 15,
          commentCount: 2,
          shareCount: 3,
          likedByMe: false,
          author: { id: 'usr_bob', username: 'bob', fullName: 'Bob Le' },
          topics: ['nosql'],
        },
        {
          id: 'post_6',
          content: 'Đã cập nhật giao diện trực quan hóa đồ thị mạng xã hội với Cytoscape.js và thuật toán bố cục fCoSE mượt mà trên trình duyệt Edge.',
          createdAt: Date.now() - 43200000,
          likeCount: 27,
          commentCount: 5,
          shareCount: 6,
          likedByMe: true,
          author: { id: 'usr_eva', username: 'eva', fullName: 'Eva Hoang' },
          topics: ['technology', 'ai'],
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

  // Sprint 4: Benchmark endpoint
  m.onGet('/benchmark').reply(() => {
    return ok({
      metadata: {
        generatedAt: new Date().toISOString(),
        graphDb: 'FalkorDB v1.0 (Redis Module / GraphBLAS)',
        relationalDb: 'PostgreSQL 16 (Alpine)',
        datasetScale: 'Scale M (10.000 Users, 50.000 Posts, 275.000 Edges)',
        iterations: 35,
        warmup: 5,
      },
      latencyByDepth: [
        { depth: 1, graph: { mean: 1.25, median: 1.15, p95: 1.82 }, postgres: { mean: 3.42, median: 3.10, p95: 5.25 }, speedup: '2.7x' },
        { depth: 2, graph: { mean: 2.38, median: 2.18, p95: 3.52 }, postgres: { mean: 14.85, median: 13.92, p95: 22.40 }, speedup: '6.2x' },
        { depth: 3, graph: { mean: 4.12, median: 3.85, p95: 6.20 }, postgres: { mean: 89.50, median: 84.10, p95: 135.20 }, speedup: '21.7x' },
        { depth: 4, graph: { mean: 6.85, median: 6.20, p95: 9.95 }, postgres: { mean: 482.00, median: 460.50, p95: 690.00 }, speedup: '70.4x' },
        { depth: 5, graph: { mean: 11.20, median: 10.40, p95: 16.50 }, postgres: { mean: 2450.00, median: 2380.00, p95: 3300.00 }, speedup: '218.8x' },
        { depth: 6, graph: { mean: 18.50, median: 17.20, p95: 26.80 }, postgres: { mean: 11200.00, median: 10900.00, p95: 14800.00 }, speedup: '605.4x' },
      ],
      queriesComparison: [
        { id: 'BT1', name: 'Tìm đường đi ngắn nhất (Shortest Path)', graphMs: 4.12, postgresMs: 89.50, speedup: '21.7x', complexity: 'O(V + E) vs O(b^d)', note: 'FalkorDB duyệt BFS con trỏ bộ nhớ (GraphBLAS); PostgreSQL bùng nổ hàng đệ quy CTE' },
        { id: 'BT2', name: 'Chủ đề nóng theo khoảng thời gian (Trending Topics)', graphMs: 5.62, postgresMs: 38.20, speedup: '6.8x', complexity: 'Pattern Match vs Multi-table JOIN', note: 'FalkorDB tổng hợp ma trận thưa; PostgreSQL cần 5 JOIN và Group By' },
        { id: 'BT3', name: 'Gợi ý bạn của bạn (FOAF Recommendation)', graphMs: 3.80, postgresMs: 42.60, speedup: '11.2x', complexity: '2-hop traversal vs Self-JOIN + NOT EXISTS', note: 'FalkorDB lọc quan hệ 2 bước; PostgreSQL tốn chi phí Nested Loop / Hash Join' },
        { id: 'BT5', name: 'Xếp hạng người ảnh hưởng (Top Followers / Degree)', graphMs: 4.90, postgresMs: 28.40, speedup: '5.8x', complexity: 'Degree index vs Aggregate Group By', note: 'FalkorDB lưu bậc trực tiếp trên đỉnh; PostgreSQL quét index bảng follows' },
      ],
      concurrency: [
        { connections: 1, graphReqSec: 1250, graphP95Ms: 1.5, postgresReqSec: 320, postgresP95Ms: 6.8, errorRate: 0 },
        { connections: 10, graphReqSec: 4100, graphP95Ms: 3.2, postgresReqSec: 890, postgresP95Ms: 18.5, errorRate: 0 },
        { connections: 50, graphReqSec: 6800, graphP95Ms: 8.4, postgresReqSec: 1250, postgresP95Ms: 62.0, errorRate: 0 },
        { connections: 100, graphReqSec: 8200, graphP95Ms: 14.8, postgresReqSec: 1420, postgresP95Ms: 145.0, errorRate: 0.001 },
      ],
    });
  });
}
