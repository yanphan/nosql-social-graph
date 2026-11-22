import { api } from './api';
import { mockUsers, mockTopics, mockPosts } from '@/mock/mockData';

// Thao tác ghi của admin: lỗi phải báo đúng như backend trả về, không giả thành công bằng dữ liệu mock
// (trước đây lỗi 409 "Chủ đề đã tồn tại" vẫn hiện "Đã thêm chủ đề").
async function mutate(request, fallbackMsg) {
  let res;
  try {
    res = await request();
  } catch (err) {
    // Request bị hủy (đổi trang / gõ tiếp khi tìm kiếm): để nguyên cho nơi gọi bỏ qua
    if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') throw err;
    if (!err.response) throw new Error('Không kết nối được máy chủ. Thao tác chưa được thực hiện.');
    throw new Error(err.response.data?.error?.message || fallbackMsg);
  }
  if (!res.data?.ok) throw new Error(res.data?.error?.message || fallbackMsg);
  return res.data.data;
}

const LONG_TIMEOUT = 10 * 60 * 1000;

// Lỗi của request responseType 'blob' nằm trong Blob: đọc ra để lấy thông báo của backend
async function blobErrorMessage(err, fallback) {
  if (!err.response) return 'Không kết nối được máy chủ.';
  try {
    const body = JSON.parse(await err.response.data.text());
    return body?.error?.message || fallback;
  } catch {
    return fallback;
  }
}

export const adminApi = {
  // 1. Thống kê tổng quan (UC-16)
  getStats: async () => {
    try {
      const res = await api.get('/stats');
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('API /stats error, fallback mock:', err.message);
    }
    // Mock fallback
    return {
      totalNodes: 40050,
      totalEdges: 386500,
      nodes: { User: 10000, Post: 30000, Topic: 50 },
      edges: { FOLLOWS: 150000, POSTED: 30000, ABOUT: 60000, LIKED: 90000, COMMENTED: 22500, SHARED: 9000, INTERESTED_IN: 25000 },
      scale: 'DEFAULT',
      degreeBuckets: [],
    };
  },

  // 2. Quản lý Người dùng (UC-05). Danh sách admin không dùng dữ liệu mock: lỗi phải hiện ra,
  // không thì admin sẽ khóa/xóa nhầm những tài khoản không tồn tại.
  // Trả về { items (kèm followers, posts thật), page, limit, total, hasMore }
  getUsers: ({ q = '', role = '', status = '', page = 1, limit = 10 } = {}, signal) =>
    mutate(
      () => api.get('/admin/users', { params: { q, role, status, page, limit }, signal }),
      'Không tải được danh sách người dùng'
    ),

  // Người dùng có nhiều người theo dõi nhất (bảng tổng quan)
  getTopUsers: (limit = 5) =>
    mutate(
      () => api.get('/analytics/influence', { params: { metric: 'followers', limit } }),
      'Không tải được người dùng nổi bật'
    ),

  createUser: async (userData) => {
    try {
      const res = await api.post('/users', userData);
      if (res.data?.ok) return res.data.data;
      throw new Error('Không thể tạo người dùng');
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message || 'Lỗi khi tạo người dùng';
      throw new Error(errMsg);
    }
  },

  setUserStatus: (userId, status) =>
    mutate(() => api.patch(`/users/${userId}/status`, { status }), 'Không đổi được trạng thái tài khoản'),

  setUserRole: (userId, role) =>
    mutate(() => api.patch(`/users/${userId}/role`, { role }), 'Không đổi được vai trò'),

  deleteUser: (userId) => mutate(() => api.delete(`/users/${userId}`), 'Không xóa được tài khoản'),

  updateUser: (userId, data) => mutate(() => api.put(`/users/${userId}`, data), 'Không cập nhật được tài khoản'),

  resetPassword: (userId, password) =>
    mutate(() => api.patch(`/users/${userId}/password`, { password }), 'Không đặt lại được mật khẩu'),

  // 3. Quản lý Chủ đề (UC-07)
  getTopics: async () => {
    try {
      const res = await api.get('/topics');
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('API /topics error, fallback mock:', err.message);
    }
    return mockTopics;
  },

  createTopic: (topicData) => mutate(() => api.post('/topics', topicData), 'Không tạo được chủ đề'),

  updateTopic: (topicId, topicData) =>
    mutate(() => api.put(`/topics/${topicId}`, topicData), 'Không cập nhật được chủ đề'),

  // Số bài viết / người quan tâm bị ảnh hưởng nếu xóa chủ đề
  getTopicImpact: (topicId) =>
    mutate(() => api.get(`/topics/${topicId}/impact`), 'Không lấy được thông tin ảnh hưởng của chủ đề'),

  deleteTopic: (topicId) => mutate(() => api.delete(`/topics/${topicId}`), 'Không xóa được chủ đề'),

  // 4. Kiểm duyệt Bài viết (UC-06). Admin không sửa nội dung bài của người khác, chỉ gỡ kèm lý do.
  getPosts: ({ q = '', topic = '', page = 1, limit = 10 } = {}, signal) =>
    mutate(
      () => api.get('/admin/posts', { params: { q, topic, page, limit }, signal }),
      'Không tải được danh sách bài viết'
    ),

  getPost: (postId) => mutate(() => api.get(`/posts/${postId}`), 'Không tải được bài viết'),

  getComments: (postId, { page = 1, limit = 20 } = {}) =>
    mutate(() => api.get(`/posts/${postId}/comments`, { params: { page, limit } }), 'Không tải được bình luận'),

  // moderation = { reason: 'spam' | 'inappropriate' | 'off_topic' | 'other', note }
  deletePost: (postId, moderation) =>
    mutate(() => api.delete(`/posts/${postId}`, { data: moderation }), 'Không gỡ được bài viết'),

  deleteComment: (postId, comment, moderation) =>
    mutate(
      () => api.delete(`/posts/${postId}/comments/${comment.userId}/${comment.at}`, { data: moderation }),
      'Không gỡ được bình luận'
    ),

  getModerationLog: (limit = 50) =>
    mutate(() => api.get('/admin/moderation', { params: { limit } }), 'Không tải được nhật ký kiểm duyệt'),

  // 5. Hệ thống: Nhập / Xuất dữ liệu (UC-15). Thao tác lâu với đồ thị lớn: bỏ giới hạn 15 giây mặc định.
  // Tải file qua axios (kèm token); window.open không gửi được token nên bị 401.
  exportData: async ({ format = 'json', label } = {}) => {
    let res;
    try {
      res = await api.get('/admin/export', {
        params: format === 'csv' ? { format, label } : { format },
        responseType: 'blob',
        timeout: LONG_TIMEOUT,
      });
    } catch (err) {
      throw new Error(await blobErrorMessage(err, 'Không xuất được dữ liệu'));
    }
    const name = /filename="?([^";]+)"?/.exec(res.headers['content-disposition'] ?? '')?.[1] ?? `export.${format}`;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { file: name, sizeBytes: res.data.size };
  },

  // kind bắt buộc với CSV (User, Post, FOLLOWS, ...); JSON là toàn đồ thị
  importData: (file, kind) => {
    const fd = new FormData();
    fd.append('file', file);
    return mutate(
      () =>
        api.post('/admin/import', fd, {
          params: kind ? { kind } : {},
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: LONG_TIMEOUT,
        }),
      'Không nhập được dữ liệu'
    );
  },

  // 6. Hệ thống: Sao lưu / Phục hồi (UC-17)
  createBackup: () => mutate(() => api.post('/admin/backup', {}, { timeout: LONG_TIMEOUT }), 'Không tạo được bản sao lưu'),

  // Lỗi phải hiện ra, không trả danh sách rỗng giả (admin tưởng chưa có bản sao lưu nào)
  getBackups: () => mutate(() => api.get('/admin/backups'), 'Không tải được danh sách bản sao lưu'),

  deleteBackup: (file) =>
    mutate(() => api.delete(`/admin/backups/${encodeURIComponent(file)}`), 'Không xóa được bản sao lưu'),

  restoreBackup: (file) =>
    mutate(() => api.post('/admin/restore', { file }, { timeout: LONG_TIMEOUT }), 'Không phục hồi được dữ liệu'),

  // 7. Tìm kiếm toàn cục (UC-18)
  searchGlobal: async (q) => {
    try {
      const res = await api.get('/search', { params: { q, type: 'all', limit: 10 } });
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('API search error:', err.message);
    }
    return {
      users: mockUsers.filter((u) => u.username.includes(q) || u.fullName.includes(q)),
      topics: mockTopics.filter((t) => t.name.includes(q)),
      posts: mockPosts.filter((p) => p.content.includes(q)),
    };
  },
};
