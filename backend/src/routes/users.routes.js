import { Router } from 'express';
import { z } from 'zod';
import * as usersService from '../services/users.service.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { ok, asyncH, paginate } from '../utils/http.js';

export const prefix = '/users';
const router = Router();

const createUserSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
  fullName: z.string().min(1, 'Họ và tên không được để trống'),
  email: z.string().email('Email không đúng định dạng').optional().or(z.literal('')),
  role: z.enum(['admin', 'analyst', 'user']).default('user'),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1, 'Họ và tên không được để trống').optional(),
  bio: z.string().max(300).optional(),
  country: z.string().max(50).optional(),
  email: z.string().email('Email không đúng định dạng').optional().or(z.literal('')),
});

const setStatusSchema = z.object({
  status: z.enum(['active', 'locked']),
});

const setRoleSchema = z.object({
  role: z.enum(['admin', 'analyst', 'user']),
});

// GET /api/users?q=&page=&limit=
router.get(
  '/',
  requireAuth,
  asyncH(async (req, res) => {
    const { page, limit } = paginate(req.query);
    const q = (req.query.q ?? '').trim();
    const data = await usersService.listUsers({ q, page, limit }, req.user);
    return ok(res, data);
  })
);

// POST /api/users (Admin tạo user)
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(createUserSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await usersService.createUser(req.body);
    return ok(res, data, 201);
  })
);

// GET /api/users/:id
router.get(
  '/:id',
  requireAuth,
  asyncH(async (req, res) => {
    const data = await usersService.getUserProfile(req.params.id, req.user);
    return ok(res, data);
  })
);

// PUT /api/users/:id (Chính chủ hoặc Admin)
router.put(
  '/:id',
  requireAuth,
  validate(updateUserSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await usersService.updateUser(req.params.id, req.body, req.user);
    return ok(res, data);
  })
);

// PATCH /api/users/:id/status (Admin khóa/mở khóa)
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('admin'),
  validate(setStatusSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await usersService.setUserStatus(req.params.id, req.body.status);
    return ok(res, data);
  })
);

// PATCH /api/users/:id/role (Admin đổi vai trò)
router.patch(
  '/:id/role',
  requireAuth,
  requireRole('admin'),
  validate(setRoleSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await usersService.setUserRole(req.params.id, req.body.role);
    return ok(res, data);
  })
);

// DELETE /api/users/:id (Admin xóa user)
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncH(async (req, res) => {
    const data = await usersService.deleteUser(req.params.id);
    return ok(res, data);
  })
);

// GET /api/users/:id/followers
router.get(
  '/:id/followers',
  requireAuth,
  asyncH(async (req, res) => {
    const { page, limit } = paginate(req.query);
    const data = await usersService.getUserFollowers(req.params.id, { page, limit }, req.user);
    return ok(res, data);
  })
);

// GET /api/users/:id/following
router.get(
  '/:id/following',
  requireAuth,
  asyncH(async (req, res) => {
    const { page, limit } = paginate(req.query);
    const data = await usersService.getUserFollowing(req.params.id, { page, limit }, req.user);
    return ok(res, data);
  })
);

export default router;
