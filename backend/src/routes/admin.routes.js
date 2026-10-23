import { Router } from 'express';
import os from 'node:os';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { ok, asyncH } from '../utils/http.js';
import * as adminService from '../services/admin.service.js';

export const prefix = '/admin';
const router = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const seedSchema = z.object({
  scale: z.enum(['S', 'M', 'L']).default('S'),
});

const restoreSchema = z.object({
  file: z.string().min(1, 'Tên file sao lưu không được để trống'),
});

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

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
  upload.single('file'),
  asyncH(async (req, res) => {
    const data = await adminService.importData({
      kind: req.query.kind,
      file: req.file,
    });
    return ok(res, data);
  })
);

// GET /api/admin/export?format=csv|json&label=... (UC-15)
router.get(
  '/export',
  requireAuth,
  requireRole('admin'),
  asyncH(async (req, res) => {
    const { format = 'csv', label = 'User' } = req.query;
    const { filePath, fileName } = await adminService.exportData({ format, label });
    return res.download(filePath, fileName);
  })
);

// POST /api/admin/seed (UC-15)
router.post(
  '/seed',
  requireAuth,
  requireRole('admin'),
  validate(seedSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await adminService.seedGraph(req.body);
    return ok(res, data);
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
