import { api, TOKEN_KEY, USER_KEY } from './api';
import { mockUsers } from '@/mock/mockData';

const DEMO_PASSWORD = 'Passw0rd!';

export const authService = {
  // Đảm bảo luôn có phiên đăng nhập hợp lệ với Backend FalkorDB
  ensureSession: async (preferredRole = 'user') => {
    const existingToken = localStorage.getItem(TOKEN_KEY);
    const existingUser = localStorage.getItem(USER_KEY);

    if (existingToken && existingUser) {
      try {
        const u = JSON.parse(existingUser);
        // Nếu trang yêu cầu admin nhưng user hiện tại không phải admin
        if (preferredRole === 'admin' && u.role !== 'admin') {
          // chuyển đổi sang admin
          return await authService.login({ username: 'admin', password: DEMO_PASSWORD });
        }
        // Nếu trang yêu cầu analyst nhưng user hiện tại không phải analyst hoặc admin
        if (preferredRole === 'analyst' && u.role !== 'analyst' && u.role !== 'admin') {
          return await authService.login({ username: 'analyst', password: DEMO_PASSWORD });
        }
        // Kiểm tra token còn sống không
        const res = await api.get('/auth/me');
        if (res.data?.ok && res.data?.data) {
          const user = {
            ...res.data.data,
            avatar: res.data.data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.data.data.username}&backgroundColor=b6e3f4`,
          };
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          return { success: true, user, isRealBackend: true };
        }
      } catch (err) {
        console.warn('Phiên đăng nhập cũ không hợp lệ, đang làm mới:', err.message);
      }
    }

    // Tự động đăng nhập với tài khoản mặc định
    const defaultUsername = preferredRole === 'admin' ? 'admin' : preferredRole === 'analyst' ? 'analyst' : 'alice';
    try {
      return await authService.login({ username: defaultUsername, password: DEMO_PASSWORD });
    } catch (err) {
      console.warn('Không thể tự động đăng nhập backend, fallback mock:', err.message);
      return { success: false, user: authService.getStoredUser() };
    }
  },

  // Lấy người dùng đã lưu trữ (mặc định Alice nếu chưa đăng nhập)
  getStoredUser: () => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        const u = JSON.parse(stored);
        return {
          ...u,
          followersCount: u.followersCount ?? 64,
          followingCount: u.followingCount ?? 50,
          postsCount: u.postsCount ?? 24,
          avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}&backgroundColor=b6e3f4`,
        };
      }
    } catch (e) {
      console.warn('Lỗi đọc stored user:', e);
    }
    const defaultUser = {
      id: 'usr_alice',
      username: 'alice',
      fullName: 'Alice Nguyen',
      role: 'user',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice&backgroundColor=b6e3f4',
      followersCount: 64,
      followingCount: 50,
      postsCount: 24,
    };
    return defaultUser;
  },

  // Đăng nhập
  login: async ({ username, password }) => {
    try {
      // 1. Gửi request đến Backend API thực
      const res = await api.post('/auth/login', { username, password });
      if (res.data?.ok && res.data?.data) {
        const { token, user } = res.data.data;
        const enrichedUser = {
          ...user,
          followersCount: user.followersCount ?? 0,
          followingCount: user.followingCount ?? 0,
          postsCount: user.postsCount ?? 0,
          avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=b6e3f4`,
        };
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(enrichedUser));
        return { success: true, user: enrichedUser, isRealBackend: true };
      }
    } catch (err) {
      if (err.response) {
        const message = err.response.data?.error?.message || err.response.data?.message || 'Đăng nhập thất bại';
        throw new Error(message);
      }
      console.warn('Backend không phản hồi, chuyển sang kiểm tra mock data:', err.message);
    }

    // 2. Chế độ Mock Fallback (nếu backend hoàn toàn không bật)
    const foundUser = mockUsers.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (foundUser) {
      const mockToken = `mock_token_${foundUser.id}_${Date.now()}`;
      localStorage.setItem(TOKEN_KEY, mockToken);
      localStorage.setItem(USER_KEY, JSON.stringify(foundUser));
      return { success: true, user: foundUser, isRealBackend: false };
    }

    const fallbackUser = {
      id: `usr_${username.toLowerCase()}`,
      username: username.trim(),
      fullName: username.trim(),
      email: `${username.trim()}@falkordb-social.dev`,
      role: 'user',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=d1d4f9`,
      followersCount: 1,
      followingCount: 1,
      postsCount: 0,
    };
    const mockToken = `mock_token_${fallbackUser.id}_${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, mockToken);
    localStorage.setItem(USER_KEY, JSON.stringify(fallbackUser));
    return { success: true, user: fallbackUser, isRealBackend: false };
  },

  // Đăng ký tài khoản
  register: async ({ username, password, fullName, email }) => {
    try {
      const res = await api.post('/auth/register', {
        username,
        password,
        fullName,
        email: email || undefined,
      });
      if (res.data?.ok && res.data?.data) {
        const { token, user } = res.data.data;
        const enrichedUser = {
          ...user,
          avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=b6e3f4`,
        };
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(enrichedUser));
        return { success: true, user: enrichedUser, isRealBackend: true };
      }
    } catch (err) {
      if (err.response?.status === 409) {
        throw new Error(err.response?.data?.error?.message || 'Tên người dùng đã được sử dụng');
      }
      throw err;
    }
  },

  // Đăng xuất
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // Đặt user đang hoạt động
  setActiveUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
};
