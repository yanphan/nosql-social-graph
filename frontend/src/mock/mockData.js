/**
 * DỮ LIỆU GIẢ LẬP (MOCK DATA) CHO HỆ THỐNG MẠNG XÃ HỘI ĐỒ THỊ
 * Tuân thủ đúng đặc tả kỹ thuật thuộc tính và định dạng dữ liệu:
 * - User: id, username, fullName, email, bio, country, joinedAt (epoch ms), isVerified (boolean)
 * - Post: id, content, createdAt (epoch ms), language, likeCount, shareCount
 * - Topic: id, name, description
 * - Comment: id, content, createdAt (epoch ms)
 */

// 1. DANH SÁCH TOPIC (CHỦ ĐỀ)
export const mockTopics = [
  {
    id: 'top_nosql',
    name: 'nosql',
    description: 'Cơ sở dữ liệu phi quan hệ, phân tán và tối ưu hiệu năng cao',
    postCount: 24,
    interactionCount: 156,
  },
  {
    id: 'top_falkordb',
    name: 'falkordb',
    description: 'Graph Database engine thế hệ mới chạy trên nền tảng bộ nhớ Redis',
    postCount: 18,
    interactionCount: 132,
  },
  {
    id: 'top_graph_algo',
    name: 'graph-algorithms',
    description: 'Thuật toán đồ thị kinh điển: Shortest Path, PageRank, WCC và lan truyền',
    postCount: 15,
    interactionCount: 98,
  },
  {
    id: 'top_ai',
    name: 'artificial-intelligence',
    description: 'Trí tuệ nhân tạo, Machine Learning và ứng dụng Knowledge Graph',
    postCount: 20,
    interactionCount: 145,
  },
  {
    id: 'top_redis',
    name: 'redis',
    description: 'Hệ thống lưu trữ cấu trúc dữ liệu in-memory tốc độ truy xuất micro-giây',
    postCount: 12,
    interactionCount: 76,
  },
  {
    id: 'top_db_design',
    name: 'database-design',
    description: 'Thiết kế mô hình dữ liệu đồ thị, lược đồ và tối ưu hóa truy vấn Cypher',
    postCount: 14,
    interactionCount: 88,
  },
];

// 2. DANH SÁCH USER (NGƯỜI DÙNG)
export const mockUsers = [
  {
    id: 'usr_admin',
    username: 'admin',
    fullName: 'Quản trị viên Hệ thống',
    email: 'admin@falkordb-social.dev',
    bio: 'Kỹ sư kiến trúc hệ thống dữ liệu đồ thị & Quản trị mạng xã hội FalkorDB.',
    country: 'VN',
    joinedAt: 1704067200000, // 2024-01-01
    isVerified: true,
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=b6e3f4',
    followersCount: 128,
    followingCount: 35,
  },
  {
    id: 'usr_analyst',
    username: 'analyst',
    fullName: 'Nhà phân tích Dữ liệu',
    email: 'analyst@falkordb-social.dev',
    bio: 'Chuyên gia phân tích cấu trúc mạng lưới đồ thị và đo lường chỉ số ảnh hưởng PageRank.',
    country: 'VN',
    joinedAt: 1705276800000, // 2024-01-15
    isVerified: false,
    role: 'analyst',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Analyst&backgroundColor=c0aede',
    followersCount: 86,
    followingCount: 42,
  },
  {
    id: 'usr_alice',
    username: 'alice',
    fullName: 'Alice Nguyen',
    email: 'alice.nguyen@techcorp.io',
    bio: 'Lập trình viên Backend & Đam mê giải pháp lưu trữ đồ thị hiệu năng cao với Redis.',
    country: 'VN',
    joinedAt: 1706745600000, // 2024-02-01
    isVerified: true,
    role: 'user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice&backgroundColor=ffd5dc',
    followersCount: 64,
    followingCount: 50,
  },
  {
    id: 'usr_bob',
    username: 'bob',
    fullName: 'Bob Le',
    email: 'bob.le@datascience.edu',
    bio: 'Sinh viên nghiên cứu thuật toán tìm đường đi ngắn nhất (Shortest Path) và mạng xã hội ảo.',
    country: 'VN',
    joinedAt: 1708387200000, // 2024-02-20
    isVerified: false,
    role: 'user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob&backgroundColor=d1d4f9',
    followersCount: 38,
    followingCount: 45,
  },
  {
    id: 'usr_charlie',
    username: 'charlie',
    fullName: 'Charlie Tran',
    email: 'charlie.t@cloudsystems.net',
    bio: 'DevOps & Database Administrator. Tối ưu hóa bộ nhớ FalkorDB và Docker clustering.',
    country: 'VN',
    joinedAt: 1710028800000, // 2024-03-10
    isVerified: false,
    role: 'user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie&backgroundColor=b6e3f4',
    followersCount: 52,
    followingCount: 29,
  },
  {
    id: 'usr_david',
    username: 'david',
    fullName: 'David Pham',
    email: 'david.pham@ai-lab.org',
    bio: 'Nghiên cứu viên AI & Graph Neural Networks. Ứng dụng Cypher truy vấn mối quan hệ phức tạp.',
    country: 'US',
    joinedAt: 1711324800000, // 2024-03-25
    isVerified: false,
    role: 'user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David&backgroundColor=ffdfbf',
    followersCount: 45,
    followingCount: 38,
  },
  {
    id: 'usr_eva',
    username: 'eva',
    fullName: 'Eva Hoang',
    email: 'eva.hoang@designhub.co',
    bio: 'UI/UX Designer & Trực quan hóa đồ thị tương tác bằng Cytoscape.js và Tailwind.',
    country: 'VN',
    joinedAt: 1712275200000, // 2024-04-05
    isVerified: false,
    role: 'user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eva&backgroundColor=ffd5dc',
    followersCount: 71,
    followingCount: 60,
  },
];

// 3. DANH SÁCH BÀI VIẾT (POSTS)
export const mockPosts = [
  {
    id: 'post_101',
    authorId: 'usr_alice',
    content:
      'Vừa hoàn tất thử nghiệm benchmark so sánh truy vấn đệ quy CTE trên PostgreSQL với Cypher trên FalkorDB! Kết quả ở độ sâu 4 bước kết nối đồ thị, FalkorDB nhanh hơn gấp 8 lần nhờ lưu trữ trực tiếp con trỏ quan hệ (index-free adjacency). 🚀',
    createdAt: Date.now() - 1000 * 60 * 25, // 25 phút trước
    language: 'vi',
    likeCount: 42,
    shareCount: 15,
    commentCount: 6,
    topicNames: ['nosql', 'falkordb', 'graph-algorithms'],
  },
  {
    id: 'post_102',
    authorId: 'usr_admin',
    content:
      'Thông báo cập nhật: Hệ thống vừa kích hoạt thuật toán Shortest Path với giới hạn tối đa 6 bước (Six Degrees of Separation). Mọi người có thể vào tab PathFinder để kiểm tra đường đi kết nối giữa 2 tài khoản bất kỳ nhé!',
    createdAt: Date.now() - 1000 * 60 * 120, // 2 giờ trước
    language: 'vi',
    likeCount: 68,
    shareCount: 22,
    commentCount: 9,
    topicNames: ['falkordb', 'graph-algorithms'],
  },
  {
    id: 'post_103',
    authorId: 'usr_david',
    content:
      'How Knowledge Graphs and LLMs complement each other: Graph databases provide precise, hallucination-free factual retrieval, while LLMs provide natural conversational synthesis. GraphRAG is definitely the future.',
    createdAt: Date.now() - 1000 * 60 * 360, // 6 giờ trước
    language: 'en',
    likeCount: 35,
    shareCount: 18,
    commentCount: 4,
    topicNames: ['artificial-intelligence', 'nosql'],
  },
  {
    id: 'post_104',
    authorId: 'usr_bob',
    content:
      'Đang nghiên cứu thuật toán: Gợi ý bạn bè dựa trên số lượng bạn chung và chủ đề sở thích tương đồng. Công thức điểm số kết hợp giữa Jaccard similarity và trọng số tương tác like/comment rất thú vị!',
    createdAt: Date.now() - 1000 * 60 * 720, // 12 giờ trước
    language: 'vi',
    likeCount: 29,
    shareCount: 7,
    commentCount: 5,
    topicNames: ['graph-algorithms', 'database-design'],
  },
  {
    id: 'post_105',
    authorId: 'usr_analyst',
    content:
      'Thử nghiệm PageRank: Sau khi chạy PageRank trên toàn bộ đồ thị mạng lưới hơn 1,000 node, tài khoản @admin và @alice là 2 hub trung tâm có điểm số ảnh hưởng (influence score) cao nhất. Cây phân nhánh lan truyền chia sẻ bài viết cũng đang hình thành cụm rất rõ.',
    createdAt: Date.now() - 1000 * 60 * 1440, // 1 ngày trước
    language: 'vi',
    likeCount: 54,
    shareCount: 19,
    commentCount: 8,
    topicNames: ['graph-algorithms', 'falkordb'],
  },
  {
    id: 'post_106',
    authorId: 'usr_eva',
    content:
      'Thiết kế giao diện Cytoscape.js kết hợp thuật toán bố cục lực đàn hồi fcose (fast-force-directed). Khi bấm vào từng node, các liên kết láng giềng sẽ sáng lên (highlight) và các phần tử khác tự động làm mờ (dim) giúp nhìn mối quan hệ trực quan hơn hẳn.',
    createdAt: Date.now() - 1000 * 60 * 2880, // 2 ngày trước
    language: 'vi',
    likeCount: 61,
    shareCount: 14,
    commentCount: 7,
    topicNames: ['database-design', 'nosql'],
  },
];

// 4. DANH SÁCH BÌNH LUẬN (COMMENTS - MÔ HÌNH NODE MỞ RỘNG)
export const mockComments = [
  {
    id: 'cmt_001',
    postId: 'post_101',
    authorId: 'usr_bob',
    content: 'Quá ấn tượng! Số lượng cạnh duyệt trong bộ nhớ của Redis Graph đạt bao nhiêu triệu cạnh/giây vậy chị Alice?',
    createdAt: Date.now() - 1000 * 60 * 18,
    likeCount: 5,
  },
  {
    id: 'cmt_002',
    postId: 'post_101',
    authorId: 'usr_alice',
    content: '@bob Trên máy dev của mình đạt xấp xỉ 2.5 triệu quan hệ/giây, không bị nghẽn disk I/O như Postgres!',
    createdAt: Date.now() - 1000 * 60 * 12,
    likeCount: 3,
  },
  {
    id: 'cmt_003',
    postId: 'post_102',
    authorId: 'usr_charlie',
    content: 'Đã test thử tìm đường đi từ user_1 tới user_888, trả về chuỗi 3 bước trong chưa tới 4ms!',
    createdAt: Date.now() - 1000 * 60 * 95,
    likeCount: 0,
  },
  {
    id: 'cmt_004',
    postId: 'post_104',
    authorId: 'usr_analyst',
    content: 'Nhớ normalize điểm số sở thích về đoạn [0, 1] trước khi nhân với trọng số tương tác nhé Bob.',
    createdAt: Date.now() - 1000 * 60 * 650,
    likeCount: 2,
  },
];

// 5. HELPER FUNCTIONS TIỆN ÍCH ĐỂ TRUY VẤN MOCK DATA
export const mockApi = {
  // Lấy người dùng hiện tại (Mặc định là Alice để test)
  getCurrentUser: () => mockUsers.find((u) => u.username === 'alice') || mockUsers[0],

  // Tìm người dùng theo ID
  getUserById: (id) => mockUsers.find((u) => u.id === id),

  // Tìm người dùng theo Username
  getUserByUsername: (username) => mockUsers.find((u) => u.username === username),

  // Lấy danh sách bài viết kèm thông tin Author và Topic đầy đủ
  getPosts: ({ topic, authorId } = {}) => {
    let posts = [...mockPosts];
    if (topic) {
      posts = posts.filter((p) => p.topicNames.includes(topic));
    }
    if (authorId) {
      posts = posts.filter((p) => p.authorId === authorId);
    }

    return posts.map((post) => ({
      ...post,
      author: mockUsers.find((u) => u.id === post.authorId),
      topics: post.topicNames.map((name) => mockTopics.find((t) => t.name === name)).filter(Boolean),
    }));
  },

  // Lấy danh sách bình luận của 1 bài viết
  getCommentsByPostId: (postId) => {
    return mockComments
      .filter((c) => c.postId === postId)
      .map((comment) => ({
        ...comment,
        author: mockUsers.find((u) => u.id === comment.authorId),
      }));
  },

  // Lấy danh sách Topics
  getTopics: () => mockTopics,

  // Lấy danh sách gợi ý kết bạn cho 1 user
  getFriendSuggestions: (currentUserId) => {
    return mockUsers
      .filter((u) => u.id !== currentUserId)
      .slice(0, 4)
      .map((user) => ({
        ...user,
        mutualFriends: Math.floor(Math.random() * 5) + 1,
        commonTopic: mockTopics[Math.floor(Math.random() * mockTopics.length)].name,
      }));
  },
};
