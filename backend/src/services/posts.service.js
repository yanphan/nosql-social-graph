import { nanoid } from 'nanoid';
import * as postsRepo from '../repositories/posts.repo.js';
import * as topicsRepo from '../repositories/topics.repo.js';
import * as socialRepo from '../repositories/social.repo.js';
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

  if (user.role !== 'admin' && post.author.id !== user.id) {
    throw new Forbidden('Bạn không có quyền sửa bài viết này');
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

export async function deletePost(id, user) {
  const post = await postsRepo.findById(id);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }

  if (user.role !== 'admin' && post.author.id !== user.id) {
    throw new Forbidden('Bạn không có quyền xóa bài viết này');
  }

  await postsRepo.remove(id);
  return { deleted: true };
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

  await socialRepo.comment(user.id, postId, text.trim());
  const counts = await socialRepo.recount(postId);
  return { commentCount: counts.commentCount };
}

export async function sharePost(postId, via, user) {
  const post = await postsRepo.findById(postId);
  if (!post) {
    throw new NotFound('Bài viết không tồn tại');
  }

  await socialRepo.share(user.id, postId, via || null);
  const counts = await socialRepo.recount(postId);
  return { shareCount: counts.shareCount };
}
