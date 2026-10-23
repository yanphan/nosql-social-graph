import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { ok, asyncH } from '../utils/http.js';
import * as pathService from '../services/path.service.js';
import * as trendingService from '../services/trending.service.js';
import * as recommendService from '../services/recommend.service.js';
import * as analyticsService from '../services/analytics.service.js';

export const prefix = '/';
const router = Router();

const pathQuerySchema = z.object({
  from: z.string().min(1, 'Username người gửi không được để trống'),
  to: z.string().min(1, 'Username người nhận không được để trống'),
  maxDepth: z.coerce.number().int().min(1).max(6).default(6),
});

const trendingQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const recommendQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const influenceQuerySchema = z.object({
  metric: z.enum(['followers', 'pagerank']).default('followers'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const searchQuerySchema = z.object({
  q: z.string().default(''),
  type: z.enum(['user', 'post', 'topic', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// GET /api/path?from=&to=&maxDepth=6 (BT1 - UC-09)
router.get(
  '/path',
  requireAuth,
  validate(pathQuerySchema, 'query'),
  asyncH(async (req, res) => {
    const data = await pathService.findPath(req.query);
    return ok(res, data);
  })
);

// GET /api/topics/trending?days=7&limit=10 (BT2 - UC-10)
router.get(
  '/topics/trending',
  requireAuth,
  validate(trendingQuerySchema, 'query'),
  asyncH(async (req, res) => {
    const data = await trendingService.getTrendingTopics(req.query);
    return ok(res, data);
  })
);

// GET /api/recommend/friends?limit=10 (BT3 - UC-11)
router.get(
  '/recommend/friends',
  requireAuth,
  validate(recommendQuerySchema, 'query'),
  asyncH(async (req, res) => {
    const data = await recommendService.getFriendRecommendations(req.user.id, req.query.limit);
    return ok(res, data);
  })
);

// GET /api/recommend/posts?limit=10 (BT4 - UC-12)
router.get(
  '/recommend/posts',
  requireAuth,
  validate(recommendQuerySchema, 'query'),
  asyncH(async (req, res) => {
    const data = await recommendService.getPostRecommendations(req.user.id, req.query.limit);
    return ok(res, data);
  })
);

// GET /api/analytics/influence?metric=followers|pagerank&limit=10 (BT5 - UC-13, Role: Analyst, Admin)
router.get(
  '/analytics/influence',
  requireAuth,
  requireRole('analyst', 'admin'),
  validate(influenceQuerySchema, 'query'),
  asyncH(async (req, res) => {
    const data = await analyticsService.getInfluence(req.query);
    return ok(res, data);
  })
);

// GET /api/analytics/communities (BT5 - UC-13, Role: Analyst, Admin)
router.get(
  '/analytics/communities',
  requireAuth,
  requireRole('analyst', 'admin'),
  asyncH(async (_req, res) => {
    const data = await analyticsService.getCommunities();
    return ok(res, data);
  })
);

// GET /api/analytics/spread/:postId (BT5 - UC-14, Role: Analyst, Admin)
router.get(
  '/analytics/spread/:postId',
  requireAuth,
  requireRole('analyst', 'admin'),
  asyncH(async (req, res) => {
    const data = await analyticsService.getSpreadTree(req.params.postId);
    return ok(res, data);
  })
);

// GET /api/search?q=&type=user|post|topic|all (UC-18)
router.get(
  '/search',
  requireAuth,
  validate(searchQuerySchema, 'query'),
  asyncH(async (req, res) => {
    const data = await analyticsService.searchGlobal(req.query);
    return ok(res, data);
  })
);

// GET /api/stats (UC-16, Role: Analyst, Admin)
router.get(
  '/stats',
  requireAuth,
  requireRole('analyst', 'admin'),
  asyncH(async (_req, res) => {
    const data = await analyticsService.getStats();
    return ok(res, data);
  })
);

export default router;
