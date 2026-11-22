import { api, TOKEN_KEY, USER_KEY, readSession, clearSession } from './api';

const withAvatar = (user) => ({
  ...user,
  avatar:
    user.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=b6e3f4`,
});

const saveSession = (token, user, remember) => {
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
};

// Thông báo lỗi khi không gọi được backend (khác với sai mật khẩu)
const networkError = () =>
  new Error('Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa rồi thử lại.');

// Trang chính của từng vai trò: quản trị viên vào trang quản trị, còn lại vào mạng xã hội
export const homePathFor = (role) => (role === 'admin' ? '/admin' : '/');

export const authService = {
  homePathFor,

  // Người dùng đang đăng nhập (đọc từ bộ nhớ trình duyệt), null nếu chưa đăng nhập
  getStoredUser: () => {
    if (!readSession(TOKEN_KEY)) return null;
    try {
      const stored = readSession(USER_KEY);
      return stored ? withAvatar(JSON.parse(stored)) : null;
    } catch {
      return null;
    }
  },

  // Kiểm tra lại phiên với backend khi mở trang: lấy vai trò, trạng thái và số liệu mới nhất.
  // Token không hợp lệ hoặc tài khoản bị khóa: interceptor trong api.js xóa phiên, hàm trả về null.
  // Không gọi được backend: giữ phiên đang có, backend sẽ chặn ở các request sau nếu phiên đã hỏng.
  restoreSession: async () => {
    const token = readSession(TOKEN_KEY);
    if (!token) return null;
    try {
      const res = await api.get('/auth/me');
      const user = withAvatar(res.data.data);
      const store = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
      store.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch (err) {
      if (err.response) {
        clearSession();
        return null;
      }
      return authService.getStoredUser();
    }
  },

  login: async ({ username, password, remember = true }) => {
    let res;
    try {
      res = await api.post('/auth/login', { username: username.trim(), password });
    } catch (err) {
      if (err.response) {
        throw new Error(err.response.data?.error?.message || 'Đăng nhập không thành công');
      }
      throw networkError();
    }
    const { token, user } = res.data.data;
    const enriched = withAvatar(user);
    saveSession(token, enriched, remember);
    return { success: true, user: enriched };
  },

  register: async ({ username, password, fullName, email }) => {
    let res;
    try {
      res = await api.post('/auth/register', {
        username,
        password,
        fullName,
        email: email || undefined,
      });
    } catch (err) {
      if (err.response) {
        throw new Error(err.response.data?.error?.message || 'Đăng ký không thành công');
      }
      throw networkError();
    }
    const { token, user } = res.data.data;
    const enriched = withAvatar(user);
    saveSession(token, enriched, true);
    return { success: true, user: enriched };
  },

  logout: () => clearSession(),
};
