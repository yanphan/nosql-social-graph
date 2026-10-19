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
}
