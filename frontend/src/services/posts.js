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
        const data = res.data.data;
        const enrichedItems = (data.items || []).map((p) => ({
          ...p,
          author: {
            ...p.author,
            fullName: p.author?.fullName || p.author?.username || 'Người dùng',
            avatar: p.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author?.username || p.author?.id || 'alice'}&backgroundColor=b6e3f4`,
          },
          topics: (p.topics || []).map((t) => (typeof t === 'string' ? { id: t, name: t } : t)),
          topicNames: (p.topics || []).map((t) => (typeof t === 'string' ? t : t.name)),
        }));
        return {
          ...data,
          items: enrichedItems,
        };
      }
    } catch (err) {
      console.warn('Lỗi gọi API /posts:', err.message);
    }
    return { items: [], page: 1, limit, hasMore: false };
  },

  // Lấy danh sách bài viết gợi ý (Thuật toán đồ thị BT4)
  getRecommendPosts: async (limit = 20) => {
    try {
      const res = await api.get('/recommend/posts', { params: { limit } });
      if (res.data?.ok && res.data?.data) {
        return (res.data.data || []).map((item) => {
          const p = item.post;
          return {
            ...p,
            friendLikes: item.friendLikes,
            score: item.score,
            author: {
              ...p.author,
              fullName: p.author?.fullName || p.author?.username || 'Người dùng',
              avatar: p.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author?.username || p.author?.id || 'user'}&backgroundColor=b6e3f4`,
            },
            topics: (p.topics || []).map((t) => (typeof t === 'string' ? { id: t, name: t } : t)),
            topicNames: (p.topics || []).map((t) => (typeof t === 'string' ? t : t.name)),
          };
        });
      }
    } catch (err) {
      console.warn('Lỗi gọi API /recommend/posts:', err.message);
    }
    return [];
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
