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
  getTrendingTopics: async ({ days = 7, limit = 10 } = {}) => {
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
};
