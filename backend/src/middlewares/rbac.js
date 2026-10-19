import { Forbidden } from '../utils/errors.js';

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new Forbidden('Bạn không có quyền thực hiện hành động này'));
