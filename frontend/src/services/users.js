import { api } from './api';

// Trang cá nhân: lỗi phải hiện ra (không dùng dữ liệu mẫu), người xem cần biết là chưa tải được
async function call(request, fallbackMsg) {
  try {
    const res = await request();
    if (res.data?.ok) return res.data.data;
    throw new Error(res.data?.error?.message || fallbackMsg);
  } catch (err) {
    if (err.response?.status === 404) {
      const e = new Error(err.response.data?.error?.message || 'Không tìm thấy');
      e.notFound = true;
      throw e;
    }
    throw new Error(err.response?.data?.error?.message || (err.response ? fallbackMsg : 'Không kết nối được máy chủ'));
  }
}

const avatarOf = (u) =>
  u?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u?.username || u?.id || 'user'}&backgroundColor=b6e3f4`;

// Chuẩn hóa bài viết cho PostCard (giống postsService.getPosts)
export const toCardPost = (p) => ({
  ...p,
  author: { ...p.author, fullName: p.author?.fullName || p.author?.username || 'Người dùng', avatar: avatarOf(p.author) },
  topics: (p.topics || []).map((t) => (typeof t === 'string' ? { id: t, name: t } : t)),
  topicNames: (p.topics || []).map((t) => (typeof t === 'string' ? t : t.name)),
});

export const usersService = {
  // { user, followers, following, posts, shares, isFollowing }
  getProfile: async (username) => {
    const data = await call(() => api.get(`/users/by-username/${encodeURIComponent(username)}`), 'Không tải được trang cá nhân');
    return { ...data, user: { ...data.user, avatar: avatarOf(data.user) } };
  },

  // Bài người này đã đăng (mới nhất trước)
  getPosts: async (userId, page = 1, limit = 10) => {
    const data = await call(() => api.get('/posts', { params: { authorId: userId, page, limit } }), 'Không tải được bài viết');
    return { ...data, items: data.items.map(toCardPost) };
  },

  // Bài người này đã chia sẻ: items = [{ post, sharedAt }]
  getShares: async (userId, page = 1, limit = 10) => {
    const data = await call(() => api.get(`/users/${userId}/shares`, { params: { page, limit } }), 'Không tải được bài đã chia sẻ');
    return { ...data, items: data.items.map((x) => ({ ...x, post: toCardPost(x.post) })) };
  },

  follow: (targetId) => call(() => api.post('/follow', { targetId }), 'Không theo dõi được'),
  unfollow: (targetId) => call(() => api.delete(`/follow/${targetId}`), 'Không bỏ theo dõi được'),
};
