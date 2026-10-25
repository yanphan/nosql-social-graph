import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import * as usersRepo from '../repositories/users.repo.js';
import { NotFound, Conflict, Forbidden } from '../utils/errors.js';
import { pageOf } from '../utils/http.js';

export const sanitizeUser = (user, viewer = null) => {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  const canSeeEmail = viewer && (viewer.role === 'admin' || viewer.id === rest.id);
  if (!canSeeEmail) {
    delete rest.email;
  }
  return {
    id: rest.id,
    username: rest.username,
    fullName: rest.fullName ?? '',
    bio: rest.bio ?? '',
    country: rest.country ?? '',
    joinedAt: Number(rest.joinedAt ?? Date.now()),
    isVerified: Boolean(rest.isVerified),
    role: rest.role ?? 'user',
    status: rest.status ?? 'active',
    ...(canSeeEmail && rest.email !== undefined ? { email: rest.email } : {}),
  };
};

export async function listUsers({ q = '', page = 1, limit = 20 }, viewer = null) {
  const skip = (page - 1) * limit;
  // Lấy limit + 1 để xác định hasMore
  const rows = await usersRepo.list({ q, skip, limit: limit + 1 });
  const items = rows.map((u) => sanitizeUser(u, viewer));
  return pageOf(items, { page, limit });
}

export async function getUserProfile(userId, viewer = null) {
  const stats = await usersRepo.profileStats(userId);
  if (!stats || !stats.user) {
    throw new NotFound('Người dùng không tồn tại');
  }

  let isFollowing = false;
  if (viewer && viewer.id && viewer.id !== userId) {
    isFollowing = await usersRepo.isFollowing(viewer.id, userId);
  }

  return {
    user: sanitizeUser(stats.user, viewer),
    followers: stats.followers,
    following: stats.following,
    posts: stats.posts,
    isFollowing,
  };
}

export async function createUser({ username, password, fullName, email = '', role = 'user' }) {
  const existing = await usersRepo.findByUsername(username);
  if (existing) {
    throw new Conflict('Tên người dùng đã được sử dụng');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = nanoid(12);

  const newUser = await usersRepo.create({
    id,
    username,
    fullName,
    email,
    passwordHash,
    role,
    joinedAt: Date.now(),
  });

  return sanitizeUser(newUser, { role: 'admin', id });
}

export async function updateUser(id, updateData, viewer) {
  const target = await usersRepo.findById(id);
  if (!target) {
    throw new NotFound('Người dùng không tồn tại');
  }

  if (viewer.role !== 'admin' && viewer.id !== id) {
    throw new Forbidden('Bạn không có quyền sửa thông tin người dùng này');
  }

  const merged = {
    fullName: updateData.fullName !== undefined ? updateData.fullName : (target.fullName ?? ''),
    bio: updateData.bio !== undefined ? updateData.bio : (target.bio ?? ''),
    country: updateData.country !== undefined ? updateData.country : (target.country ?? ''),
    email: updateData.email !== undefined ? updateData.email : (target.email ?? ''),
  };

  const updated = await usersRepo.update(id, merged);
  return sanitizeUser(updated, viewer);
}

export async function setUserStatus(id, status) {
  const target = await usersRepo.findById(id);
  if (!target) {
    throw new NotFound('Người dùng không tồn tại');
  }

  const updated = await usersRepo.setStatus(id, status);
  return sanitizeUser(updated, { role: 'admin' });
}

export async function setUserRole(id, role) {
  const target = await usersRepo.findById(id);
  if (!target) {
    throw new NotFound('Người dùng không tồn tại');
  }

  const updated = await usersRepo.setRole(id, role);
  return sanitizeUser(updated, { role: 'admin' });
}

export async function deleteUser(id) {
  const target = await usersRepo.findById(id);
  if (!target) {
    throw new NotFound('Người dùng không tồn tại');
  }

  await usersRepo.remove(id);
  return { deleted: true };
}

export async function getUserFollowers(userId, { page = 1, limit = 20 }, viewer = null) {
  const target = await usersRepo.findById(userId);
  if (!target) {
    throw new NotFound('Người dùng không tồn tại');
  }

  const skip = (page - 1) * limit;
  const rows = await usersRepo.followers(userId, { skip, limit: limit + 1 });
  const items = rows.map((r) => ({
    user: sanitizeUser(r.user, viewer),
    since: r.since,
  }));
  return pageOf(items, { page, limit });
}

export async function getUserFollowing(userId, { page = 1, limit = 20 }, viewer = null) {
  const target = await usersRepo.findById(userId);
  if (!target) {
    throw new NotFound('Người dùng không tồn tại');
  }

  const skip = (page - 1) * limit;
  const rows = await usersRepo.following(userId, { skip, limit: limit + 1 });
  const items = rows.map((r) => ({
    user: sanitizeUser(r.user, viewer),
    since: r.since,
  }));
  return pageOf(items, { page, limit });
}
