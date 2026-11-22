import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Locked, Unauth } from '../utils/errors.js';
import { findAuthState } from '../repositories/auth.repo.js';

// Token chỉ chứng minh danh tính. Vai trò và trạng thái khóa đọc lại từ CSDL ở mỗi request,
// để việc khóa tài khoản hay đổi vai trò có hiệu lực ngay, không chờ token hết hạn.
export async function requireAuth(req, _res, next) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next(new Unauth());

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret); // { id, username, role }
  } catch {
    return next(new Unauth('Phiên đăng nhập không hợp lệ hoặc đã hết hạn'));
  }

  try {
    const state = await findAuthState(payload.id);
    if (!state) return next(new Unauth('Tài khoản không còn tồn tại'));
    if (state.status === 'locked') return next(new Locked());
    req.user = { id: payload.id, username: payload.username, role: state.role };
    next();
  } catch (err) {
    next(err);
  }
}

export const signToken = (u) =>
  jwt.sign(
    { id: u.id, username: u.username, role: u.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
