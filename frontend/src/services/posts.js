import { api } from './api';

export const postsService = {
  // Lấy danh sách bài viết (hỗ trợ lọc theo topic, tác giả, phân trang)
  getPosts: async ({ topic, authorId, days, page = 1, limit = 20 } = {}) => {
    try {
      const params = { page, limit };
      if (topic) params.topic = topic;
      if (authorId) params.authorId = authorId;
      if (days) params.days = days;

      const res = await api.get('/posts', { params });
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('Lỗi gọi API /posts:', err.message);
    }
    return { items: [], page: 1, limit, hasMore: false };
  },

  // Tạo bài viết mới
  createPost: async ({ content, topics = [], language = 'vi' }) => {
    const res = await api.post('/posts', { content, topics, language });
    if (res.data?.ok && res.data?.data) {
      return res.data.data;
    }
    throw new Error(res.data?.error?.message || 'Không thể tạo bài viết');
  },

  // Thích bài viết
  likePost: async (postId) => {
    const res = await api.post(`/posts/${postId}/like`);
    return res.data?.data;
  },

  // Bỏ thích bài viết
  unlikePost: async (postId) => {
    const res = await api.delete(`/posts/${postId}/like`);
    return res.data?.data;
  },

  // Lấy bình luận của bài viết
  getComments: async (postId, { page = 1, limit = 20 } = {}) => {
    try {
      const res = await api.get(`/posts/${postId}/comments`, { params: { page, limit } });
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn(`Lỗi lấy comments bài viết ${postId}:`, err.message);
    }
    return { items: [], page: 1, limit, hasMore: false };
  },

  // Thêm bình luận
  addComment: async (postId, text) => {
    const res = await api.post(`/posts/${postId}/comments`, { text });
    if (res.data?.ok && res.data?.data) {
      return res.data.data;
    }
    throw new Error(res.data?.error?.message || 'Không thể gửi bình luận');
  },

  // Chia sẻ bài viết
  sharePost: async (postId, via = '') => {
    const res = await api.post(`/posts/${postId}/share`, { via });
    return res.data?.data;
  },
};
