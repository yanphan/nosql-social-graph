import { Router } from 'express';
import { z } from 'zod';
import * as postsService from '../services/posts.service.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { ok, asyncH, paginate } from '../utils/http.js';

export const prefix = '/posts';
const router = Router();

const createPostSchema = z.object({
  content: z.string().min(1, 'Nội dung bài viết không được để trống'),
  topics: z.array(z.string()).optional().default([]),
  language: z.string().max(10).optional().default('vi'),
});

const updatePostSchema = z.object({
  content: z.string().min(1, 'Nội dung bài viết không được để trống').optional(),
  topics: z.array(z.string()).optional(),
});

const commentSchema = z.object({
  text: z.string().min(1, 'Nội dung bình luận không được để trống').max(1000),
});

const shareSchema = z.object({
  via: z.string().optional(),
});

// GET /api/posts?topic=&authorId=&days=&page=&limit=
router.get(
  '/',
  requireAuth,
  asyncH(async (req, res) => {
    const { page, limit } = paginate(req.query);
    const { topic, authorId, days } = req.query;
    const data = await postsService.listPosts(
      { topic, authorId, days, page, limit },
      req.user
    );
    return ok(res, data);
  })
);

// POST /api/posts
router.post(
  '/',
  requireAuth,
  validate(createPostSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await postsService.createPost(req.body, req.user);
    return ok(res, data, 201);
  })
);

// GET /api/posts/:id
router.get(
  '/:id',
  requireAuth,
  asyncH(async (req, res) => {
    const data = await postsService.getPostById(req.params.id, req.user);
    return ok(res, data);
  })
);

// PUT /api/posts/:id (Tác giả hoặc Admin)
router.put(
  '/:id',
  requireAuth,
  validate(updatePostSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await postsService.updatePost(req.params.id, req.body, req.user);
    return ok(res, data);
  })
);

// DELETE /api/posts/:id (Tác giả hoặc Admin)
router.delete(
  '/:id',
  requireAuth,
  asyncH(async (req, res) => {
    const data = await postsService.deletePost(req.params.id, req.user);
    return ok(res, data);
  })
);

// POST /api/posts/:id/like
router.post(
  '/:id/like',
  requireAuth,
  asyncH(async (req, res) => {
    const data = await postsService.likePost(req.params.id, req.user);
    return ok(res, data);
  })
);

// DELETE /api/posts/:id/like
router.delete(
  '/:id/like',
  requireAuth,
  asyncH(async (req, res) => {
    const data = await postsService.unlikePost(req.params.id, req.user);
    return ok(res, data);
  })
);

// GET /api/posts/:id/comments
router.get(
  '/:id/comments',
  requireAuth,
  asyncH(async (req, res) => {
    const { page, limit } = paginate(req.query);
    const data = await postsService.getComments(req.params.id, { page, limit });
    return ok(res, data);
  })
);

// POST /api/posts/:id/comments
router.post(
  '/:id/comments',
  requireAuth,
  validate(commentSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await postsService.addComment(req.params.id, req.body.text, req.user);
    return ok(res, data, 201);
  })
);

// POST /api/posts/:id/share
router.post(
  '/:id/share',
  requireAuth,
  validate(shareSchema, 'body'),
  asyncH(async (req, res) => {
    const data = await postsService.sharePost(req.params.id, req.body.via, req.user);
    return ok(res, data);
  })
);

export default router;
