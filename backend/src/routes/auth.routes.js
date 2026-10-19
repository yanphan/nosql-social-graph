import { Router } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { ok, asyncH } from '../utils/http.js';

export const prefix = '/auth';
const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
  fullName: z.string().min(1, 'Họ và tên không được để trống'),
  email: z.string().email('Email không đúng định dạng').optional().or(z.literal('')),
});

const loginSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập không được để trống'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

router.post(
  '/register',
  validate(registerSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await authService.register(req.body);
    return ok(res, data, 201);
  })
);

router.post(
  '/login',
  validate(loginSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await authService.login(req.body);
    return ok(res, data);
  })
);

router.get(
  '/me',
  requireAuth,
  asyncH(async (req, res) => {
    const data = await authService.me(req.user.id);
    return ok(res, data);
  })
);

export default router;
