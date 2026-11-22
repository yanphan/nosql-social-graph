import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { ok, asyncH } from '../utils/http.js';
import * as analyticsService from '../services/analytics.service.js';

export const prefix = '/graph';
const router = Router();

const subgraphQuerySchema = z.object({
  center: z.string().optional().default(''),
  hops: z.coerce.number().int().min(1).max(2).optional().default(1),
  limit: z.coerce.number().int().min(1).max(300).default(100),
  nodeTypes: z.union([z.string(), z.array(z.string())]).optional(),
  relTypes: z.union([z.string(), z.array(z.string())]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

// GET /api/graph/subgraph
router.get(
  '/subgraph',
  requireAuth,
  validate(subgraphQuerySchema, 'query'),
  asyncH(async (req, res) => {
    const data = await analyticsService.getSubgraph(req.query);
    return ok(res, data);
  })
);

export default router;
