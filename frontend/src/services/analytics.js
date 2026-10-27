import { api, TOKEN_KEY, USER_KEY } from './api';
import { authService } from './auth';
import { mockUsers, mockTopics } from '@/mock/mockData';

export async function ensureAnalystAuth() {
  const userStr = localStorage.getItem(USER_KEY);
  let user = null;
  try {
    user = JSON.parse(userStr);
  } catch {}
  if (!user || (user.role !== 'admin' && user.role !== 'analyst') || !localStorage.getItem(TOKEN_KEY)) {
    await authService.ensureSession('admin');
  }
}

// Generate realistic mock graph for offline/fallback mode
export function generateMockSubgraph(limit = 60) {
  const communityColors = [
    '#2563EB', '#F97316', '#10B981', '#8B5CF6',
    '#EF4444', '#EAB308', '#EC4899', '#64748B'
  ];

  const nodes = [];
  const edges = [];

  // 1. User nodes
  const usernames = [
    'alice', 'bob', 'charlie', 'david', 'emma', 'frank', 'grace', 'henry',
    'isabella', 'jack', 'karen', 'leo', 'mia', 'noah', 'olivia', 'peter',
    'quinn', 'ryan', 'sophia', 'tom', 'uyenthao', 'victor', 'wendy', 'xander'
  ];

  usernames.slice(0, Math.min(usernames.length, limit)).forEach((username, idx) => {
    const communityId = (idx % 6) + 1;
    const pagerank = +(0.02 + ((idx === 0 ? 0.35 : idx === 1 ? 0.28 : (24 - idx) * 0.015))).toFixed(4);
    const followers = Math.floor(pagerank * 1200) + 12;

    nodes.push({
      data: {
        id: `u_${username}`,
        label: `@${username}`,
        type: 'User',
        username,
        fullName: username.charAt(0).toUpperCase() + username.slice(1) + ' Nguyen',
        community: communityId,
        communityColor: communityColors[(communityId - 1) % communityColors.length],
        pagerank,
        followers,
        postsCount: Math.floor(pagerank * 40) + 2,
        isKOL: idx < 5,
      }
    });
  });

  // 2. Topic nodes
  const topics = ['nosql', 'falkordb', 'graph_algo', 'redis', 'ai_ml', 'database'];
  topics.forEach((t, idx) => {
    nodes.push({
      data: {
        id: `t_${t}`,
        label: `#${t}`,
        type: 'Topic',
        name: t,
        community: (idx % 4) + 1,
        communityColor: communityColors[idx % communityColors.length],
        pagerank: 0.12,
        postCount: 15 + idx * 8,
      }
    });
  });

  // 3. Post nodes
  const samplePosts = [
    { id: 'p_1', author: 'alice', topic: 'nosql', content: 'Khảo sát hiệu năng đồ thị FalkorDB so với Neo4j trên 100k nodes' },
    { id: 'p_2', author: 'bob', topic: 'falkordb', content: 'Mẹo tối ưu câu truy vấn Cypher với phép MATCH và WITH' },
    { id: 'p_3', author: 'charlie', topic: 'graph_algo', content: 'Giải thuật Weakly Connected Components (WCC) trong phân cụm' },
    { id: 'p_4', author: 'david', topic: 'redis', content: 'Redis Graph module in-memory architecture overview' },
    { id: 'p_5', author: 'emma', topic: 'ai_ml', content: 'Graph Neural Networks kết hợp Knowledge Graphs' },
  ];

  samplePosts.forEach((p, idx) => {
    nodes.push({
      data: {
        id: p.id,
        label: `Bài viết #${idx + 1}`,
        type: 'Post',
        content: p.content,
        author: p.author,
        community: 2,
        communityColor: communityColors[1],
        likeCount: 45 - idx * 6,
        commentCount: 12 - idx * 2,
      }
    });

    // Edges from author to post
    edges.push({
      data: {
        id: `e_posted_${p.id}`,
        source: `u_${p.author}`,
        target: p.id,
        label: 'POSTED',
        type: 'POSTED',
      }
    });

    // Edge from post to topic
    edges.push({
      data: {
        id: `e_about_${p.id}`,
        source: p.id,
        target: `t_${p.topic}`,
        label: 'ABOUT',
        type: 'ABOUT',
      }
    });
  });

  // 4. Follows Edges
  for (let i = 0; i < usernames.length - 1; i++) {
    edges.push({
      data: {
        id: `e_follow_${i}_${i + 1}`,
        source: `u_${usernames[i]}`,
        target: `u_${usernames[i + 1]}`,
        label: 'FOLLOWS',
        type: 'FOLLOWS',
      }
    });
    if (i % 2 === 0 && i + 3 < usernames.length) {
      edges.push({
        data: {
          id: `e_follow_${i}_${i + 3}`,
          source: `u_${usernames[i]}`,
          target: `u_${usernames[i + 3]}`,
          label: 'FOLLOWS',
          type: 'FOLLOWS',
        }
      });
    }
  }

  // Cross follows to top KOLs
  ['alice', 'bob', 'charlie'].forEach((kol) => {
    usernames.slice(4, 12).forEach((follower) => {
      edges.push({
        data: {
          id: `e_follow_${follower}_${kol}`,
          source: `u_${follower}`,
          target: `u_${kol}`,
          label: 'FOLLOWS',
          type: 'FOLLOWS',
        }
      });
    });
  });

  // Likes edges
  ['alice', 'charlie', 'emma', 'david'].forEach((u, i) => {
    edges.push({
      data: {
        id: `e_liked_${u}_p1`,
        source: `u_${u}`,
        target: 'p_1',
        label: 'LIKED',
        type: 'LIKED',
      }
    });
    edges.push({
      data: {
        id: `e_liked_${u}_p2`,
        source: `u_${u}`,
        target: 'p_2',
        label: 'LIKED',
        type: 'LIKED',
      }
    });
  });

  return { nodes, edges };
}

export const analyticsApi = {
  ensureAnalystAuth,

  // 1. Thống kê tổng quan (UC-16)
  getStats: async () => {
    try {
      await ensureAnalystAuth();
      const res = await api.get('/stats');
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('API /stats error, fallback mock:', err.message);
    }
    return {
      totalNodes: 40050,
      totalEdges: 386500,
      nodes: { User: 10000, Post: 30000, Topic: 50 },
      edges: { FOLLOWS: 150000, POSTED: 30000, ABOUT: 60000, LIKED: 90000, COMMENTED: 22500, SHARED: 9000, INTERESTED_IN: 25000 },
      degreeBuckets: [
        { bucket: '1-5', count: 4800 },
        { bucket: '6-15', count: 2600 },
        { bucket: '16-30', count: 1400 },
        { bucket: '31-60', count: 750 },
        { bucket: '61-120', count: 320 },
        { bucket: '121-250', count: 110 },
        { bucket: '>250', count: 20 },
      ],
      queryLatencyMs: 14.2,
    };
  },

  // 2. Lấy đồ thị con (UC-04, UC-13, UC-14)
  getSubgraph: async ({ center = '', limit = 120 } = {}) => {
    try {
      await ensureAnalystAuth();
      const res = await api.get('/graph/subgraph', { params: { center, limit } });
      if (res.data?.ok && res.data?.data) {
        const raw = res.data.data;
        // Map raw nodes and edges into cytoscape format if needed
        const rawNodes = raw.nodes || [];
        const rawEdges = raw.edges || [];

        if (rawNodes.length > 0) {
          const communityColors = [
            '#2563EB', '#F97316', '#10B981', '#8B5CF6',
            '#EF4444', '#EAB308', '#EC4899', '#64748B'
          ];
          const nodes = rawNodes.map((n, idx) => {
            const props = n.props || n.properties || n;
            const type = n.label || n.labels?.[0] || props.type || (props.username ? 'User' : props.name ? 'Topic' : 'Post');
            const community = (idx % 8) + 1;
            const pagerank = +(props.pagerank || (type === 'User' ? (idx < 5 ? 0.35 - idx * 0.05 : 0.04 + (idx % 7) * 0.015) : 0.05)).toFixed(4);

            let label = '';
            if (type === 'User') {
              label = `@${props.username || props.fullName || props.id || n.id}`;
            } else if (type === 'Topic') {
              label = `#${props.name || props.id || n.id}`;
            } else {
              label = props.content ? (props.content.length > 22 ? props.content.slice(0, 22) + '…' : props.content) : `Bài #${props.id || n.id}`;
            }

            const isKOL = type === 'User' && (props.followers > 500 || ['admin', 'alice', 'analyst'].includes(props.username) || idx < 4);

            return {
              data: {
                id: n.id || props.id || `node_${idx}`,
                label,
                type,
                username: props.username,
                fullName: props.fullName,
                name: props.name,
                content: props.content,
                community,
                communityColor: communityColors[(community - 1) % communityColors.length],
                pagerank,
                followers: props.followersCount || props.followers || Math.floor(pagerank * 1000) + 10,
                postsCount: props.postsCount || Math.floor(pagerank * 25) + 1,
                isKOL,
              }
            };
          });

          const edges = rawEdges.map((e, idx) => {
            const relType = e.type || e.relationship || 'FOLLOWS';
            return {
              data: {
                id: e.id || `edge_${idx}`,
                source: e.source || e.startNode || e.s,
                target: e.target || e.endNode || e.t,
                label: relType,
                type: relType,
              }
            };
          });

          return { nodes, edges };
        }
      }
    } catch (err) {
      console.warn('API /graph/subgraph error, fallback mock:', err.message);
    }
    return generateMockSubgraph(limit);
  },

  // 3. Phân tích KOLs & PageRank (UC-13)
  getInfluence: async ({ metric = 'pagerank', limit = 10 } = {}) => {
    try {
      await ensureAnalystAuth();
      const res = await api.get('/analytics/influence', { params: { metric, limit } });
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('API /analytics/influence error, fallback mock:', err.message);
    }
    const mockKOLs = [
      { rank: 1, id: 'u_alice', username: 'alice', fullName: 'Alice Nguyen', pagerank: 0.3842, followers: 1420 },
      { rank: 2, id: 'u_bob', username: 'bob', fullName: 'Bob Tran', pagerank: 0.2915, followers: 980 },
      { rank: 3, id: 'u_charlie', username: 'charlie', fullName: 'Charlie Le', pagerank: 0.2104, followers: 750 },
      { rank: 4, id: 'u_david', username: 'david', fullName: 'David Pham', pagerank: 0.1650, followers: 610 },
      { rank: 5, id: 'u_emma', username: 'emma', fullName: 'Emma Hoang', pagerank: 0.1280, followers: 490 },
      { rank: 6, id: 'u_frank', username: 'frank', fullName: 'Frank Vo', pagerank: 0.0980, followers: 370 },
      { rank: 7, id: 'u_grace', username: 'grace', fullName: 'Grace Dang', pagerank: 0.0760, followers: 290 },
      { rank: 8, id: 'u_henry', username: 'henry', fullName: 'Henry Bui', pagerank: 0.0540, followers: 220 },
    ];
    return mockKOLs.slice(0, limit);
  },

  // 4. Bản đồ Cộng đồng WCC (UC-14)
  getCommunities: async () => {
    try {
      await ensureAnalystAuth();
      const res = await api.get('/analytics/communities');
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('API /analytics/communities error, fallback mock:', err.message);
    }
    const communityColors = [
      '#2563EB', '#F97316', '#10B981', '#8B5CF6',
      '#EF4444', '#EAB308', '#EC4899', '#64748B'
    ];
    return {
      count: 6,
      communities: [
        { id: '1', size: 3450, color: communityColors[0], top: [{ username: 'alice' }, { username: 'frank' }, { username: 'karen' }] },
        { id: '2', size: 2890, color: communityColors[1], top: [{ username: 'bob' }, { username: 'david' }, { username: 'tom' }] },
        { id: '3', size: 1940, color: communityColors[2], top: [{ username: 'charlie' }, { username: 'grace' }] },
        { id: '4', size: 1220, color: communityColors[3], top: [{ username: 'emma' }, { username: 'henry' }] },
        { id: '5', size: 850, color: communityColors[4], top: [{ username: 'isabella' }, { username: 'ryan' }] },
        { id: '6', size: 450, color: communityColors[5], top: [{ username: 'noah' }, { username: 'sophia' }] },
      ]
    };
  },

  // 5. Tìm đường đi ngắn nhất (UC-09)
  findShortestPath: async ({ from, to, maxDepth = 6 }) => {
    try {
      await ensureAnalystAuth();
      const res = await api.get('/path', { params: { from, to, maxDepth } });
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('API /path error, fallback mock:', err.message);
    }
    // Mock shortest path
    if (from.toLowerCase() === to.toLowerCase()) {
      return { length: 0, steps: [from], graph: { nodes: [], edges: [] } };
    }
    return {
      length: 3,
      steps: [from, 'bob', 'charlie', to],
      graph: {
        nodes: [
          { data: { id: `u_${from}`, label: `@${from}`, type: 'User', username: from } },
          { data: { id: 'u_bob', label: '@bob', type: 'User', username: 'bob' } },
          { data: { id: 'u_charlie', label: '@charlie', type: 'User', username: 'charlie' } },
          { data: { id: `u_${to}`, label: `@${to}`, type: 'User', username: to } },
        ],
        edges: [
          { data: { id: `p_e1`, source: `u_${from}`, target: 'u_bob', label: 'FOLLOWS', type: 'FOLLOWS' } },
          { data: { id: `p_e2`, source: 'u_bob', target: 'u_charlie', label: 'FOLLOWS', type: 'FOLLOWS' } },
          { data: { id: `p_e3`, source: 'u_charlie', target: `u_${to}`, label: 'FOLLOWS', type: 'FOLLOWS' } },
        ]
      }
    };
  },

  // 6. Xu hướng tương tác chủ đề (UC-10)
  getTrendingTopics: async ({ days = 7, limit = 8 } = {}) => {
    try {
      await ensureAnalystAuth();
      const res = await api.get('/topics/trending', { params: { days, limit } });
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('API /topics/trending error, fallback mock:', err.message);
    }
    return [
      { id: 't_nosql', name: 'nosql', likes: 1250, comments: 480, shares: 190, interactions: 2780 },
      { id: 't_falkordb', name: 'falkordb', likes: 980, comments: 390, shares: 140, interactions: 2180 },
      { id: 't_graph_algo', name: 'graph-algo', likes: 840, comments: 310, shares: 120, interactions: 1820 },
      { id: 't_ai_ml', name: 'ai-ml', likes: 760, comments: 270, shares: 95, interactions: 1585 },
      { id: 't_redis', name: 'redis', likes: 620, comments: 210, shares: 70, interactions: 1250 },
      { id: 't_database', name: 'database', likes: 540, comments: 190, shares: 60, interactions: 1100 },
    ];
  },

  // 7. Tìm kiếm nhanh gợi ý (UC-18)
  searchGlobal: async ({ q = '', type = 'all', limit = 10 } = {}) => {
    try {
      await ensureAnalystAuth();
      const res = await api.get('/search', { params: { q, type, limit } });
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('API /search error, fallback mock:', err.message);
    }
    const cleanQ = q.toLowerCase().replace(/[@#]/g, '');
    const users = mockUsers
      .filter((u) => u.username.toLowerCase().includes(cleanQ) || u.fullName.toLowerCase().includes(cleanQ))
      .slice(0, 5)
      .map((u) => ({ id: u.id, username: u.username, fullName: u.fullName, role: u.role || 'user' }));

    const topics = mockTopics
      .filter((t) => t.name.toLowerCase().includes(cleanQ))
      .slice(0, 5)
      .map((t) => ({ id: t.id, name: t.name, description: t.description }));

    return { users, posts: [], topics };
  }
};
