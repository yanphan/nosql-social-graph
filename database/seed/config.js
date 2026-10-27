// Cấu hình sinh dữ liệu mẫu chuẩn (tối ưu cho demo đồ thị, phản hồi < 2s)
export const SEED_CONFIG = {
  users: 100,        // 100 người dùng (3 demo + 97 tự động)
  posts: 300,        // 300 bài viết
  topics: 15,        // 15 chủ đề công nghệ thực tế
  avgFollow: 12,     // trung bình ~12 lượt theo dõi / user
  likesPerPost: 5,   // trung bình ~5 like / post
  seed: 42,          // seed cố định để tái lập 100%
};

// Giữ SCALES để tương thích ngược với các script/test cũ
export const SCALES = {
  DEFAULT: SEED_CONFIG,
  S: SEED_CONFIG,
  M: SEED_CONFIG,
  L: SEED_CONFIG,
  XL: SEED_CONFIG,
};

export const BATCH = 500;

export const DEMO_ACCOUNTS = [
  { username: 'admin',   role: 'admin',   fullName: 'Quản trị viên', email: 'admin@social.local' },
  { username: 'analyst', role: 'analyst', fullName: 'Nhà phân tích', email: 'analyst@social.local' },
  { username: 'alice',   role: 'user',    fullName: 'Alice Nguyen',  email: 'alice@social.local' },
];

export const DEMO_PASSWORD = 'Passw0rd!';
