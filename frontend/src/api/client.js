import axios from 'axios';
import { useAuth } from '../store/auth';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api',
});

http.interceptors.request.use((c) => {
  const t = useAuth.getState().token;
  if (t) {
    c.headers.Authorization = `Bearer ${t}`;
  }
  return c;
});

http.interceptors.response.use(
  (r) => r.data.data, // bóc envelope: các hàm API trả thẳng `data`
  (e) => {
    if (e.response?.status === 401) {
      useAuth.getState().logout();
    }
    return Promise.reject(
      new Error(e.response?.data?.error?.message ?? 'Không thể kết nối đến máy chủ')
    );
  }
);

if (import.meta.env.VITE_USE_MOCK === 'true') {
  const { installMock } = await import('./mock');
  installMock(http);
}
