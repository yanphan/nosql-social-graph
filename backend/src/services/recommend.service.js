import * as analyticsRepo from '../repositories/analytics.repo.js';

export async function getFriendRecommendations(userId, limit = 10) {
  const l = Math.min(50, Math.max(1, Number(limit) || 10));
  const suggestions = await analyticsRepo.friendSuggestions(userId, l);

  const formatted = suggestions.map((u) => {
    let reason = 'Gợi ý kết nối';
    if (u.mutual > 0 && u.sharedTopics > 0) {
      reason = `${u.mutual} bạn chung & ${u.sharedTopics} chủ đề cùng quan tâm`;
    } else if (u.mutual > 0) {
      reason = `${u.mutual} bạn chung`;
    } else if (u.sharedTopics > 0) {
      reason = `${u.sharedTopics} chủ đề cùng quan tâm`;
    }
    return {
      id: u.id,
      username: u.username,
      fullName: u.fullName ?? '',
      mutual: u.mutual,
      sharedTopics: u.sharedTopics,
      score: u.score,
      reason,
    };
  });

  // Cold start fallback: Nếu không có hoặc chưa đủ gợi ý, nạp thêm người nổi tiếng
  if (formatted.length < l) {
    const remaining = l - formatted.length;
    const popular = (await analyticsRepo.popularUsers(userId, remaining + formatted.length)) || [];
    const existingIds = new Set(formatted.map((x) => x.id));

    for (const pop of popular) {
      if (pop && !existingIds.has(pop.id) && formatted.length < l) {
        formatted.push({
          id: pop.id,
          username: pop.username,
          fullName: pop.fullName ?? '',
          mutual: 0,
          sharedTopics: 0,
          score: pop.followers ?? 0,
          reason: `Người nổi bật (${pop.followers ?? 0} người theo dõi)`,
        });
        existingIds.add(pop.id);
      }
    }
  }

  return formatted;
}

export async function getPostRecommendations(userId, limit = 10) {
  const l = Math.min(50, Math.max(1, Number(limit) || 10));
  const suggestions = (await analyticsRepo.postSuggestions(userId, l)) || [];

  const formatted = suggestions.map((s) => ({
    post: s.post,
    friendLikes: s.friendLikes,
    score: s.score,
  }));

  // Cold start fallback: Nếu chưa đủ gợi ý (user mới chưa theo dõi/like), lấy bài hot trong 30 ngày qua
  if (formatted.length < l) {
    const remaining = l - formatted.length;
    const since30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const popular = (await analyticsRepo.popularPosts(since30Days, remaining + formatted.length)) || [];
    const existingIds = new Set(formatted.map((x) => x.post.id));

    for (const pop of popular) {
      if (pop && pop.post && !existingIds.has(pop.post.id) && formatted.length < l) {
        formatted.push({
          post: pop.post,
          friendLikes: 0,
          score: pop.score,
        });
        existingIds.add(pop.post.id);
      }
    }
  }

  return formatted;
}
