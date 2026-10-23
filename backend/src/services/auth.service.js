import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import * as usersRepo from '../repositories/users.repo.js';
import { signToken } from '../middlewares/auth.js';
import { Conflict, Unauth, Forbidden, NotFound } from '../utils/errors.js';

import { sanitizeUser } from './users.service.js';

export async function register({ username, password, fullName, email }) {
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
    email: email || '',
    passwordHash,
    role: 'user',
    joinedAt: Date.now(),
  });

  const token = signToken(newUser);
  return {
    token,
    user: sanitizeUser(newUser, { id: newUser.id, role: newUser.role }),
  };
}

export async function login({ username, password }) {
  const user = await usersRepo.findByUsername(username);
  if (!user) {
    throw new Unauth('Tên đăng nhập hoặc mật khẩu không chính xác');
  }

  if (user.status === 'locked') {
    throw new Forbidden('Tài khoản của bạn đã bị khóa');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash || '');
  if (!isMatch) {
    throw new Unauth('Tên đăng nhập hoặc mật khẩu không chính xác');
  }

  const token = signToken(user);
  return {
    token,
    user: sanitizeUser(user, { id: user.id, role: user.role }),
  };
}

export async function me(userId) {
  const user = await usersRepo.findById(userId);
  if (!user) {
    throw new NotFound('Tài khoản không tồn tại');
  }
  return sanitizeUser(user, { id: user.id, role: user.role });
}
