import { api } from './api';

export const topicsService = {
  // Lấy toàn bộ danh sách chủ đề
  getTopics: async () => {
    try {
      const res = await api.get('/topics');
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('Lỗi gọi API /topics:', err.message);
    }
    return [];
  },

  // Lấy danh sách chủ đề thịnh hành (dựa trên thuật toán đồ thị interactions)
  getTrendingTopics: async ({ days = 7, limit = 5 } = {}) => {
    try {
      const res = await api.get('/topics/trending', { params: { days, limit } });
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('Lỗi gọi API /topics/trending:', err.message);
    }
    return [];
  },

  // Lấy danh sách chủ đề của bạn (các chủ đề user đang có mối quan hệ INTERESTED_IN)
  getMyInterests: async () => {
    try {
      const res = await api.get('/me/interests');
      if (res.data?.ok && res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('Lỗi gọi API /me/interests:', err.message);
    }
    return [];
  },
};
