import { nanoid } from 'nanoid';
import * as topicsRepo from '../repositories/topics.repo.js';
import * as socialRepo from '../repositories/social.repo.js';
import * as usersRepo from '../repositories/users.repo.js';
import { NotFound, Conflict, Invalid } from '../utils/errors.js';

const sanitizeTopicName = (name) => {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
};

export async function listTopics() {
  const list = await topicsRepo.list();
  return list.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? '',
    postCount: Number(t.postCount ?? 0),
  }));
}

export async function createTopic({ name, description = '' }) {
  const cleanName = sanitizeTopicName(name);
  if (!cleanName) {
    throw new Invalid('Tên chủ đề không được để trống');
  }

  const existing = await topicsRepo.findByName(cleanName);
  if (existing) {
    throw new Conflict('Chủ đề đã tồn tại');
  }

  const id = nanoid(12);
  const newTopic = await topicsRepo.create({
    id,
    name: cleanName,
    description: description.trim(),
  });

  return {
    id: newTopic.id,
    name: newTopic.name,
    description: newTopic.description ?? '',
    postCount: 0,
  };
}

export async function updateTopic(id, { name, description }) {
  const existing = await topicsRepo.findById(id);
  if (!existing) {
    throw new NotFound('Chủ đề không tồn tại');
  }

  let finalName = existing.name;
  if (name !== undefined) {
    finalName = sanitizeTopicName(name);
    if (!finalName) {
      throw new Invalid('Tên chủ đề không được để trống');
    }
    const dup = await topicsRepo.findByName(finalName);
    if (dup && dup.id !== id) {
      throw new Conflict('Tên chủ đề đã được sử dụng');
    }
  }

  const updated = await topicsRepo.update(id, {
    name: finalName,
    description: description !== undefined ? description.trim() : existing.description,
  });

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? '',
    postCount: existing.postCount ?? 0,
  };
}

export async function deleteTopic(id) {
  const existing = await topicsRepo.findById(id);
  if (!existing) {
    throw new NotFound('Chủ đề không tồn tại');
  }

  await topicsRepo.remove(id);
  return { deleted: true };
}

export async function followUser(followerId, targetId) {
  if (followerId === targetId) {
    throw new Invalid('Không thể tự theo dõi chính mình');
  }

  const target = await usersRepo.findById(targetId);
  if (!target) {
    throw new NotFound('Người dùng được theo dõi không tồn tại');
  }

  const res = await socialRepo.follow(followerId, targetId);
  return { following: res.following };
}

export async function unfollowUser(followerId, targetId) {
  if (followerId === targetId) {
    throw new Invalid('Thao tác không hợp lệ');
  }

  const res = await socialRepo.unfollow(followerId, targetId);
  return { following: res.following };
}

export async function setInterests(userId, items) {
  if (!Array.isArray(items)) {
    throw new Invalid('Danh sách sở thích không hợp lệ');
  }

  for (const it of items) {
    if (!it.topicId || typeof it.score !== 'number' || it.score < 0 || it.score > 1) {
      throw new Invalid('Điểm sở thích (score) phải là số thực từ 0.0 đến 1.0');
    }
  }

  const count = await topicsRepo.setInterests(userId, items);
  return { updated: count };
}

export async function getUserInterests(userId) {
  return await topicsRepo.getUserInterests(userId);
}
