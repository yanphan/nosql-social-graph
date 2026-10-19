import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Unauth } from '../utils/errors.js';

export function requireAuth(req, _res, next) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next(new Unauth());
  try {
    req.user = jwt.verify(token, env.jwtSecret); // { id, username, role }
    next();
  } catch {
    next(new Unauth('Phiên đăng nhập không hợp lệ hoặc đã hết hạn'));
  }
}

export const signToken = (u) =>
  jwt.sign(
    { id: u.id, username: u.username, role: u.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
