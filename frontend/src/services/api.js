import axios from 'axios';

export const TOKEN_KEY = 'falkordb_auth_token';
export const USER_KEY = 'falkordb_auth_user';

// "Ghi nhớ đăng nhập" lưu vào localStorage, ngược lại vào sessionStorage (mất khi đóng trình duyệt)
export const readSession = (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key);

export const clearSession = () => {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(TOKEN_KEY);
    store.removeItem(USER_KEY);
  }
};

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = readSession(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Phiên hết hạn hoặc tài khoản bị khóa giữa chừng: xóa phiên và quay về trang đăng nhập.
// Bỏ qua chính request đăng nhập để trang đăng nhập tự hiện lỗi sai mật khẩu.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const code = err.response?.data?.error?.code;
    const isLoginCall = err.config?.url?.startsWith('/auth/login');
    if (!isLoginCall && (status === 401 || code === 'ACCOUNT_LOCKED')) {
      clearSession();
      const reason = code === 'ACCOUNT_LOCKED' ? 'locked' : 'expired';
      if (window.location.pathname !== '/login') {
        window.location.assign(`/login?reason=${reason}`);
      }
    }
    return Promise.reject(err);
  }
);
