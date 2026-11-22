import { Router } from 'express';
import os from 'node:os';
import fs from 'node:fs';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { ok, asyncH, paginate } from '../utils/http.js';
import * as adminService from '../services/admin.service.js';
import * as usersService from '../services/users.service.js';
import * as postsService from '../services/posts.service.js';
import { Invalid } from '../utils/errors.js';

export const prefix = '/admin';
const router = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv'], { message: 'Định dạng xuất chỉ nhận json hoặc csv' }).default('json'),
  label: z.string().trim().max(30).optional().default('User'),
});

const restoreSchema = z.object({
  file: z.string().min(1, 'Tên file sao lưu không được để trống'),
});

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

const adminUsersQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(''),
  role: z.enum(['', 'admin', 'user']).optional().default(''),
  status: z.enum(['', 'active', 'locked']).optional().default(''),
});

const adminPostsQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(''),
  topic: z.string().trim().max(60).optional().default(''),
});

// GET /api/admin/users?q=&role=&status=&page=&limit= (UC-05: có tổng số, số người theo dõi, số bài)
router.get(
  '/users',
  requireAuth,
  requireRole('admin'),
  asyncH(async (req, res) => {
    const { page, limit } = paginate(req.query);
    const r = adminUsersQuerySchema.safeParse(req.query);
    if (!r.success) throw new Invalid('Bộ lọc người dùng không hợp lệ');
    const filters = r.data;
    const data = await usersService.adminListUsers({ ...filters, page, limit }, req.user);
    return ok(res, data);
  })
);

// GET /api/admin/posts?q=&topic=&page=&limit= (UC-06)
router.get(
  '/posts',
  requireAuth,
  requireRole('admin'),
  asyncH(async (req, res) => {
    const { page, limit } = paginate(req.query);
    const r = adminPostsQuerySchema.safeParse(req.query);
    if (!r.success) throw new Invalid('Bộ lọc bài viết không hợp lệ');
    const filters = r.data;
    const data = await postsService.adminListPosts({ ...filters, page, limit });
    return ok(res, data);
  })
);

// GET /api/admin/moderation?limit=50: nhật ký gỡ bài viết / bình luận
router.get(
  '/moderation',
  requireAuth,
  requireRole('admin'),
  validate(auditQuerySchema, 'query'),
  asyncH(async (req, res) => {
    const data = await postsService.getModerationLog({ limit: req.query.limit });
    return ok(res, data);
  })
);

// GET /api/admin/integrity (UC-15)
router.get(
  '/integrity',
  requireAuth,
  requireRole('admin'),
  asyncH(async (_req, res) => {
    const data = await adminService.getIntegrity();
    return ok(res, data);
  })
);

// POST /api/admin/import?kind=... (UC-15)
router.post(
  '/import',
  requireAuth,
  requireRole('admin'),
  // Lỗi của multer (file quá lớn, sai tên trường) trả 400 thay vì 500
  (req, res, next) =>
    upload.single('file')(req, res, (err) => {
      if (!err) return next();
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File vượt quá 50MB' : `Tải file lỗi: ${err.message}`;
      next(new Invalid(msg));
    }),
  asyncH(async (req, res) => {
    const data = await adminService.importData({
      kind: req.query.kind ?? req.body?.kind,
      file: req.file,
    });
    return ok(res, data);
  })
);

// GET /api/admin/export?format=json  hoặc  ?format=csv&label=User|Post|Topic|FOLLOWS|... (UC-15)
// Gửi file rồi xóa file tạm. Không kèm passwordHash.
router.get(
  '/export',
  requireAuth,
  requireRole('admin'),
  validate(exportQuerySchema, 'query'),
  asyncH(async (req, res) => {
    const { filePath, fileName } = await adminService.exportData(req.query);
    res.download(filePath, fileName, () => fs.unlink(filePath, () => {}));
  })
);

// POST /api/admin/backup (UC-17)
router.post(
  '/backup',
  requireAuth,
  requireRole('admin'),
  asyncH(async (_req, res) => {
    const data = await adminService.backupGraph();
    return ok(res, data);
  })
);

// GET /api/admin/backups (UC-17)
router.get(
  '/backups',
  requireAuth,
  requireRole('admin'),
  asyncH(async (_req, res) => {
    const data = await adminService.listBackups();
    return ok(res, data);
  })
);

// DELETE /api/admin/backups/:file (UC-17)
router.delete(
  '/backups/:file',
  requireAuth,
  requireRole('admin'),
  asyncH(async (req, res) => {
    const data = await adminService.deleteBackup(req.params.file);
    return ok(res, data);
  })
);

// POST /api/admin/restore (UC-17)
router.post(
  '/restore',
  requireAuth,
  requireRole('admin'),
  validate(restoreSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await adminService.restoreGraph(req.body);
    return ok(res, data);
  })
);

// GET /api/admin/audit?limit=100 (UC-16)
router.get(
  '/audit',
  requireAuth,
  requireRole('admin'),
  validate(auditQuerySchema, 'query'),
  asyncH(async (req, res) => {
    const data = await adminService.getAuditLog(req.query);
    return ok(res, data);
  })
);

export default router;
