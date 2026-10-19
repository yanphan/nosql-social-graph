export const SCALES = {
  S:  { users: 1_000,     posts: 5_000,     topics: 50,  avgFollow: 15, likesPerPost: 6, seed: 42 },
  M:  { users: 10_000,    posts: 50_000,    topics: 100, avgFollow: 20, likesPerPost: 6, seed: 42 },
  L:  { users: 100_000,   posts: 500_000,   topics: 200, avgFollow: 20, likesPerPost: 5, seed: 42 },
  XL: { users: 1_000_000, posts: 5_000_000, topics: 500, avgFollow: 15, likesPerPost: 3, seed: 42 },
};

export const BATCH = 2000;

export const DEMO_ACCOUNTS = [
  { username: 'admin',   role: 'admin',   fullName: 'Quản trị viên', email: 'admin@social.local' },
  { username: 'analyst', role: 'analyst', fullName: 'Nhà phân tích', email: 'analyst@social.local' },
  { username: 'alice',   role: 'user',    fullName: 'Alice Nguyen',  email: 'alice@social.local' },
];

export const DEMO_PASSWORD = 'Passw0rd!';
