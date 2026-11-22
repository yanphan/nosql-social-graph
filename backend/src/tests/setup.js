import { vi } from 'vitest';

// requireAuth đọc vai trò và trạng thái từ CSDL. Trong test, mặc định mọi tài khoản đang hoạt động,
// vai trò suy ra từ id dùng khi ký token (u_admin là admin, còn lại là user).
// Test cần trường hợp khác thì gọi findAuthState.mockResolvedValueOnce(...).
vi.mock('../repositories/auth.repo.js', () => ({
  findAuthState: vi.fn(async (id) => ({
    role: id === 'u_admin' ? 'admin' : 'user',
    status: 'active',
  })),
}));
