import axios from 'axios';
import { mockUsers } from '@/mock/mockData';

const TOKEN_KEY = 'falkordb_auth_token';
const USER_KEY = 'falkordb_auth_user';

// Khởi tạo instance axios
const api = axios.create({
  baseURL: '/api',
  timeout: 4000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor đính kèm Token nếu có
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  // Lấy người dùng đã lưu trữ (mặc định Alice nếu chưa đăng nhập)
  getStoredUser: () => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        const u = JSON.parse(stored);
        const matchedMock = mockUsers.find((m) => m.username === u.username);
        return {
          ...u,
          followersCount: u.followersCount ?? u.followers ?? matchedMock?.followersCount ?? 0,
          followingCount: u.followingCount ?? u.following ?? matchedMock?.followingCount ?? 0,
          postsCount: u.postsCount ?? u.posts ?? 24,
          avatar: u.avatar || matchedMock?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}&backgroundColor=b6e3f4`,
        };
      }
    } catch (e) {
      console.warn('Lỗi đọc stored user:', e);
    }
    // Mặc định trả về Alice để luôn có phiên hoạt động ban đầu
    const defaultUser = mockUsers.find((u) => u.username === 'alice') || mockUsers[0];
    localStorage.setItem(USER_KEY, JSON.stringify(defaultUser));
    return defaultUser;
  },

  // Đăng nhập
  login: async ({ username, password }) => {
    try {
      // 1. Gửi request đến Backend API thực
      const res = await api.post('/auth/login', { username, password });
      if (res.data?.ok && res.data?.data) {
        const { token, user } = res.data.data;
        const matchedMock = mockUsers.find((m) => m.username === user.username);
        // Đảm bảo user có avatar và đầy đủ số liệu thống kê
        const enrichedUser = {
          ...user,
          followersCount: user.followersCount ?? user.followers ?? matchedMock?.followersCount ?? 0,
          followingCount: user.followingCount ?? user.following ?? matchedMock?.followingCount ?? 0,
          postsCount: user.postsCount ?? user.posts ?? 24,
          avatar: user.avatar || matchedMock?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=b6e3f4`,
        };
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(enrichedUser));
        return { success: true, user: enrichedUser, isRealBackend: true };
      }
    } catch (err) {
      if (err.response) {
        // Backend đang chạy và trả về lỗi cụ thể (sai mật khẩu, tài khoản không tồn tại, ...)
        const message = err.response.data?.error?.message || err.response.data?.message || 'Đăng nhập thất bại';
        throw new Error(message);
      }
      console.warn('Backend không phản hồi, chuyển sang kiểm tra mock data:', err.message);
    }

    // 2. Chế độ Mock Fallback (để kiểm thử mượt mà kể cả khi chưa bật Redis/Backend)
    const foundUser = mockUsers.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (foundUser) {
      const mockToken = `mock_token_${foundUser.id}_${Date.now()}`;
      localStorage.setItem(TOKEN_KEY, mockToken);
      localStorage.setItem(USER_KEY, JSON.stringify(foundUser));
      return { success: true, user: foundUser, isRealBackend: false };
    }

    // Nếu không tìm thấy cả trong mock: tạo tài khoản giả lập tức thời
    const fallbackUser = {
      id: `usr_${username.toLowerCase()}`,
      username: username.trim(),
      fullName: username.trim(),
      email: `${username.trim()}@falkordb-social.dev`,
      bio: 'Thành viên mới của mạng xã hội FalkorDB.',
      country: 'VN',
      joinedAt: Date.now(),
      isVerified: false,
      role: 'user',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=d1d4f9`,
      followersCount: 1,
      followingCount: 1,
    };
    const mockToken = `mock_token_${fallbackUser.id}_${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, mockToken);
    localStorage.setItem(USER_KEY, JSON.stringify(fallbackUser));
    return { success: true, user: fallbackUser, isRealBackend: false };
  },

  // Đăng ký tài khoản
  register: async ({ username, password, fullName, email }) => {
    try {
      // 1. Thử gọi API Backend thực
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
      console.warn('Backend register error hoặc backend chưa bật, fallback sang mock:', err.message);
      // Nếu backend báo lỗi người dùng trùng lặp
      if (err.response?.status === 409) {
        throw new Error(err.response?.data?.error || 'Tên người dùng đã được sử dụng');
      }
    }

    // 2. Chế độ Mock Fallback
    const existing = mockUsers.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (existing) {
      throw new Error('Tên người dùng đã được sử dụng (trong Mock Data)');
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      username: username.trim(),
      fullName: fullName.trim(),
      email: email?.trim() || `${username.trim()}@falkordb-social.dev`,
      bio: 'Thành viên mới vừa gia nhập cộng đồng FalkorDB Social Graph.',
      country: 'VN',
      joinedAt: Date.now(),
      isVerified: false,
      role: 'user',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=ffd5dc`,
      followersCount: 0,
      followingCount: 0,
    };

    mockUsers.unshift(newUser);
    const mockToken = `mock_token_${newUser.id}_${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, mockToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    return { success: true, user: newUser, isRealBackend: false };
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
