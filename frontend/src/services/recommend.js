import { api } from './api';

export const recommendService = {
  // Gợi ý bạn bè dựa trên thuật toán đồ thị bạn chung & chủ đề chung (BT3 - UC-11)
  getFriendRecommendations: async (limit = 5) => {
    try {
      const res = await api.get('/recommend/friends', { params: { limit } });
      if (res.data?.ok && res.data?.data) {
        return res.data.data.map((u) => ({
          ...u,
          avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}&backgroundColor=b6e3f4`,
        }));
      }
    } catch (err) {
      console.warn('Lỗi gọi API /recommend/friends:', err.message);
    }
    return [];
  },

  // Theo dõi người dùng
  followUser: async (targetId) => {
    const res = await api.post('/follow', { targetId });
    return res.data?.data;
  },

  // Hủy theo dõi người dùng
  unfollowUser: async (targetId) => {
    const res = await api.delete(`/follow/${targetId}`);
    return res.data?.data;
  },
};
