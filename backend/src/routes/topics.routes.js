import { Router } from 'express';
import { z } from 'zod';
import * as topicsService from '../services/topics.service.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { ok, asyncH } from '../utils/http.js';

export const prefix = '/';
const router = Router();

const topicSchema = z.object({
  name: z.string().min(1, 'Tên chủ đề không được để trống').max(50),
  description: z.string().max(300).optional().default(''),
});

const updateTopicSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(300).optional(),
});

const followSchema = z.object({
  targetId: z.string().min(1, 'Target ID không được để trống'),
});

const interestsSchema = z.object({
  items: z.array(
    z.object({
      topicId: z.string().min(1),
      score: z.number().min(0).max(1),
    })
  ),
});

// GET /api/topics
router.get(
  '/topics',
  requireAuth,
  asyncH(async (_req, res) => {
    const data = await topicsService.listTopics();
    return ok(res, data);
  })
);

// POST /api/topics (Admin)
router.post(
  '/topics',
  requireAuth,
  requireRole('admin'),
  validate(topicSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await topicsService.createTopic(req.body);
    return ok(res, data, 201);
  })
);

// PUT /api/topics/:id (Admin)
router.put(
  '/topics/:id',
  requireAuth,
  requireRole('admin'),
  validate(updateTopicSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await topicsService.updateTopic(req.params.id, req.body);
    return ok(res, data);
  })
);

// DELETE /api/topics/:id (Admin)
router.delete(
  '/topics/:id',
  requireAuth,
  requireRole('admin'),
  asyncH(async (req, res) => {
    const data = await topicsService.deleteTopic(req.params.id);
    return ok(res, data);
  })
);

// POST /api/follow
router.post(
  '/follow',
  requireAuth,
  validate(followSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await topicsService.followUser(req.user.id, req.body.targetId);
    return ok(res, data);
  })
);

// DELETE /api/follow/:targetId
router.delete(
  '/follow/:targetId',
  requireAuth,
  asyncH(async (req, res) => {
    const data = await topicsService.unfollowUser(req.user.id, req.params.targetId);
    return ok(res, data);
  })
);

// GET /api/me/interests (Các chủ đề user có quan hệ INTERESTED_IN)
router.get(
  '/me/interests',
  requireAuth,
  asyncH(async (req, res) => {
    const data = await topicsService.getUserInterests(req.user.id);
    return ok(res, data);
  })
);

// PUT /api/me/interests
router.put(
  '/me/interests',
  requireAuth,
  validate(interestsSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await topicsService.setInterests(req.user.id, req.body.items);
    return ok(res, data);
  })
);

export default router;
