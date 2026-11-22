import { nanoid } from 'nanoid';
import * as postsRepo from '../repositories/posts.repo.js';
import * as topicsRepo from '../repositories/topics.repo.js';
import * as socialRepo from '../repositories/social.repo.js';
import * as moderationRepo from '../repositories/moderation.repo.js';
import * as usersRepo from '../repositories/users.repo.js';
import { NotFound, Forbidden, Invalid } from '../utils/errors.js';
import { pageOf } from '../utils/http.js';

const sanitizeTopicName = (name) => {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
};

export async function listPosts({ topic = null, authorId = null, days = null, page = 1, limit = 20 }, viewer = null) {
  const skip = (page - 1) * limit;
  let since = 0;
  if (days && Number(days) > 0) {
    since = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
  }

  const rows = await postsRepo.list({
    me: viewer?.id || null,
    authorId: authorId || null,
    topic: topic ? sanitizeTopicName(topic) : null,
    since,
    skip,
    limit: limit + 1,
  });

  return pageOf(rows, { page, limit });
}

export async function getPostById(id, viewer = null) {
  const post = await postsRepo.findById(id, viewer?.id || null);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }
  return post;
}

export async function createPost({ content, topics = [], language = 'vi' }, user) {
  if (!content || !content.trim()) {
    throw new Invalid('Nội dung bài viết không được để trống');
  }

  const topicIds = [];
  if (Array.isArray(topics) && topics.length > 0) {
    for (const name of topics) {
      const cleanName = sanitizeTopicName(name);
      if (cleanName) {
        const t = await topicsRepo.upsertByName(cleanName, nanoid(12));
        if (t && t.id) {
          topicIds.push(t.id);
        }
      }
    }
  }

  const pid = nanoid(12);
  const newPost = await postsRepo.create({
    pid,
    uid: user.id,
    content: content.trim(),
    language,
    topicIds,
  });

  return newPost;
}

export async function updatePost(id, { content, topics }, user) {
  const post = await postsRepo.findById(id, user.id);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }

  // Chỉ tác giả được sửa nội dung (như Facebook/Reddit): admin sửa lời người khác là mạo danh.
  // Admin xử lý bài vi phạm bằng cách gỡ bài kèm lý do.
  if (post.author.id !== user.id) {
    throw new Forbidden('Chỉ tác giả mới được sửa bài viết này');
  }

  if (content !== undefined) {
    if (!content.trim()) {
      throw new Invalid('Nội dung bài viết không được để trống');
    }
    await postsRepo.update(id, content.trim());
  }

  if (Array.isArray(topics)) {
    const topicIds = [];
    for (const name of topics) {
      const cleanName = sanitizeTopicName(name);
      if (cleanName) {
        const t = await topicsRepo.upsertByName(cleanName, nanoid(12));
        if (t && t.id) {
          topicIds.push(t.id);
        }
      }
    }
    await postsRepo.replaceTopics(id, topicIds);
  }

  return postsRepo.findById(id, user.id);
}

export const MODERATION_REASONS = ['spam', 'inappropriate', 'off_topic', 'other'];

const actorOf = (user) => ({ id: user.id, username: user.username ?? null });

// Admin gỡ nội dung của người khác phải nêu lý do; lý do "other" cần ghi chú
function requireReason(moderation) {
  const reason = moderation?.reason;
  if (!reason) throw new Invalid('Cần chọn lý do khi gỡ nội dung của người khác');
  const note = (moderation.note ?? '').trim();
  if (reason === 'other' && !note) throw new Invalid('Hãy ghi rõ lý do khi chọn "Khác"');
  return { reason, note };
}

export async function deletePost(id, user, moderation = {}) {
  const post = await postsRepo.findById(id);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }

  const isAuthor = post.author.id === user.id;
  if (!isAuthor && user.role !== 'admin') {
    throw new Forbidden('Bạn không có quyền xóa bài viết này');
  }

  if (!isAuthor) {
    // Bài bị xóa cứng, nên lưu lại bản chụp trước khi xóa; ghi log lỗi thì không xóa.
    const { reason, note } = requireReason(moderation);
    await moderationRepo.append({
      at: Date.now(),
      action: 'remove_post',
      by: actorOf(user),
      reason,
      note,
      author: post.author,
      post: {
        id: post.id,
        content: post.content,
        createdAt: post.createdAt,
        topics: post.topics,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        shareCount: post.shareCount,
      },
    });
  }

  await postsRepo.remove(id);
  return { deleted: true };
}

// Xóa bình luận: người viết bình luận, tác giả bài viết, hoặc admin (admin cần lý do)
export async function deleteComment(postId, { userId, at }, user, moderation = {}) {
  const post = await postsRepo.findById(postId);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }
  const comment = await socialRepo.findComment(userId, postId, at);
  if (!comment) {
    throw new NotFound('Bình luận không tồn tại hoặc đã bị xóa');
  }

  const isCommenter = userId === user.id;
  const isPostAuthor = post.author.id === user.id;
  if (!isCommenter && !isPostAuthor && user.role !== 'admin') {
    throw new Forbidden('Bạn không có quyền xóa bình luận này');
  }

  if (!isCommenter && !isPostAuthor) {
    const { reason, note } = requireReason(moderation);
    await moderationRepo.append({
      at: Date.now(),
      action: 'remove_comment',
      by: actorOf(user),
      reason,
      note,
      author: { id: userId, username: comment.username },
      post: { id: post.id, content: post.content, author: post.author },
      comment: { text: comment.text, at: comment.at },
    });
  }

  await socialRepo.removeComment(userId, postId, at);
  const counts = await socialRepo.recount(postId);
  return { deleted: true, commentCount: counts.commentCount };
}

export async function adminListPosts({ q = '', topic = '', page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const { items, total } = await postsRepo.adminList({
    q: q.trim(),
    topic: topic ? sanitizeTopicName(topic) : '',
    skip,
    limit,
  });
  return { items, page, limit, total, hasMore: skip + items.length < total };
}

export async function getModerationLog({ limit = 50 } = {}) {
  return moderationRepo.list({ limit });
}

export async function likePost(id, user) {
  const post = await postsRepo.findById(id);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }

  await socialRepo.like(user.id, id);
  const counts = await socialRepo.recount(id);
  return { liked: true, likeCount: counts.likeCount };
}

export async function unlikePost(id, user) {
  const post = await postsRepo.findById(id);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }

  await socialRepo.unlike(user.id, id);
  const counts = await socialRepo.recount(id);
  return { liked: false, likeCount: counts.likeCount };
}

export async function getComments(postId, { page = 1, limit = 20 }) {
  const post = await postsRepo.findById(postId);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }

  const skip = (page - 1) * limit;
  const rows = await socialRepo.comments(postId, { skip, limit: limit + 1 });
  return pageOf(rows, { page, limit });
}

export async function addComment(postId, text, user) {
  if (!text || !text.trim()) {
    throw new Invalid('Nội dung bình luận không được để trống');
  }

  const post = await postsRepo.findById(postId);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }

  const at = await socialRepo.comment(user.id, postId, text.trim());
  const counts = await socialRepo.recount(postId);
  return {
    commentCount: counts.commentCount,
    comment: { userId: user.id, username: user.username, text: text.trim(), at: Number(at) },
  };
}

// Tab "Đã chia sẻ" ở trang cá nhân: [{ post, sharedAt }]
export async function listSharedBy(userId, { page = 1, limit = 20 }, viewer = null) {
  const target = await usersRepo.findById(userId);
  if (!target) {
    throw new NotFound('Người dùng không tồn tại');
  }
  const rows = await postsRepo.sharedBy({ uid: userId, me: viewer?.id || null, skip: (page - 1) * limit, limit: limit + 1 });
  return pageOf(rows, { page, limit });
}

// Chia sẻ: mỗi người một lần mỗi bài (MERGE), hủy được. Không chia sẻ bài của chính mình.
// via = id người mà mình thấy bài qua họ (dựng cây lan truyền); bỏ qua nếu là chính mình.
export async function sharePost(postId, via, user) {
  const post = await postsRepo.findById(postId);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }
  if (post.author?.id === user.id) {
    throw new Invalid('Không thể chia sẻ bài viết của chính bạn');
  }

  await socialRepo.share(user.id, postId, via && via !== user.id ? via : null);
  const counts = await socialRepo.recount(postId);
  return { shared: true, shareCount: counts.shareCount };
}

export async function unsharePost(postId, user) {
  const post = await postsRepo.findById(postId);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }

  await socialRepo.unshare(user.id, postId);
  const counts = await socialRepo.recount(postId);
  return { shared: false, shareCount: counts.shareCount };
}
