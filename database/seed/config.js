// Cấu hình sinh dữ liệu mẫu chuẩn quy mô lớn (2.000 Users, 10.000 Posts, 50 Topics, ~110.000 Kết nối)
export const SEED_CONFIG = {
  users: 2_000,       // 2.000 người dùng (3 demo + 1.997 tự động)
  posts: 10_000,      // 10.000 bài viết
  topics: 50,         // 50 chủ đề công nghệ & đời sống
  avgFollow: 15,      // trung bình ~15 lượt theo dõi / user (~30.000 cạnh FOLLOWS)
  likesPerPost: 6,    // trung bình ~6 like / post (~60.000 cạnh LIKED)
  seed: 42,           // seed cố định để tái lập 100%
};

// Giữ SCALES để tương thích ngược với các script/test cũ
export const SCALES = {
  DEFAULT: SEED_CONFIG,
  S: SEED_CONFIG,
  M: SEED_CONFIG,
  L: SEED_CONFIG,
  XL: SEED_CONFIG,
};

export const BATCH = 2000;

export const DEMO_ACCOUNTS = [
  { username: 'admin',   role: 'admin',   fullName: 'Quản trị viên', email: 'admin@social.local' },
  { username: 'analyst', role: 'analyst', fullName: 'Nhà phân tích', email: 'analyst@social.local' },
  { username: 'alice',   role: 'user',    fullName: 'Alice Nguyen',  email: 'alice@social.local' },
];

export const DEMO_PASSWORD = 'Passw0rd!';
