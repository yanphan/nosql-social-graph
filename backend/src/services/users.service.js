import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import * as usersRepo from '../repositories/users.repo.js';
import * as socialRepo from '../repositories/social.repo.js';
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

// Danh sách cho trang quản trị: có tổng số theo bộ lọc (để phân trang) và số liệu thật
export async function adminListUsers({ q = '', role = '', status = '', page = 1, limit = 20 }, viewer) {
  const skip = (page - 1) * limit;
  const { items, total } = await usersRepo.adminList({ q: q.trim(), role, status, skip, limit });
  return {
    items: items.map((r) => ({ ...sanitizeUser(r.user, viewer), followers: r.followers, posts: r.posts })),
    page,
    limit,
    total,
    hasMore: skip + items.length < total,
  };
}

// Admin không tự khóa / tự hạ quyền / tự xóa mình: tránh tự khóa ngoài hệ thống.
// Vì người thao tác luôn là một admin đang hoạt động, quy tắc này cũng bảo đảm luôn còn ít nhất một admin.
function forbidSelf(id, actor, message) {
  if (actor && actor.id === id) throw new Forbidden(message);
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

export async function setUserStatus(id, status, actor) {
  if (status === 'locked') forbidSelf(id, actor, 'Không thể tự khóa tài khoản của chính mình');
  const target = await usersRepo.findById(id);
  if (!target) {
    throw new NotFound('Người dùng không tồn tại');
  }

  const updated = await usersRepo.setStatus(id, status);
  return sanitizeUser(updated, { role: 'admin' });
}

export async function setUserRole(id, role, actor) {
  if (role !== 'admin') forbidSelf(id, actor, 'Không thể tự gỡ quyền quản trị của chính mình');
  const target = await usersRepo.findById(id);
  if (!target) {
    throw new NotFound('Người dùng không tồn tại');
  }

  const updated = await usersRepo.setRole(id, role);
  return sanitizeUser(updated, { role: 'admin' });
}

export async function resetPassword(id, password) {
  const target = await usersRepo.findById(id);
  if (!target) {
    throw new NotFound('Người dùng không tồn tại');
  }
  await usersRepo.setPassword(id, await bcrypt.hash(password, 10));
  return { updated: true };
}

export async function deleteUser(id, actor) {
  forbidSelf(id, actor, 'Không thể tự xóa tài khoản của chính mình');
  const target = await usersRepo.findById(id);
  if (!target) {
    throw new NotFound('Người dùng không tồn tại');
  }

  // Xóa luôn bài viết của người này; lượt thích/bình luận/chia sẻ của họ trên bài người khác
  // mất theo, nên tính lại bộ đếm của các bài đó.
  const touched = await usersRepo.remove(id);
  await socialRepo.recountMany(touched ?? []);
  return { deleted: true, recountedPosts: touched?.length ?? 0 };
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
