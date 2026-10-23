import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import * as postsRepo from '../repositories/posts.repo.js';
import * as topicsRepo from '../repositories/topics.repo.js';
import * as socialRepo from '../repositories/social.repo.js';
import * as usersRepo from '../repositories/users.repo.js';
import { signToken } from '../middlewares/auth.js';

vi.mock('../repositories/posts.repo.js');
vi.mock('../repositories/topics.repo.js');
vi.mock('../repositories/social.repo.js');
vi.mock('../repositories/users.repo.js');

describe('Posts, Topics & Social API (Sprint 1)', () => {
  let app;
  const userToken = signToken({ id: 'u_alice', username: 'alice', role: 'user' });
  const adminToken = signToken({ id: 'u_admin', username: 'admin', role: 'admin' });

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  it('POST /api/posts -> tạo bài viết thành công kèm topic tự động gắn (201)', async () => {
    topicsRepo.upsertByName.mockResolvedValue({ id: 't_ai', name: 'ai' });
    postsRepo.create.mockResolvedValue({
      id: 'p_123',
      content: 'Hello AI graph',
      createdAt: 1700000000000,
      language: 'vi',
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      author: { id: 'u_alice', username: 'alice', fullName: 'Alice' },
      topics: ['ai'],
      likedByMe: false,
    });

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        content: 'Hello AI graph',
        topics: ['AI'],
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBe('p_123');
    expect(res.body.data.author.username).toBe('alice');
    expect(res.body.data.topics).toContain('ai');
  });

  it('POST /api/posts -> nội dung rỗng trả về mã lỗi 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        content: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('DELETE /api/posts/:id -> Người khác không được xóa bài của tác giả (403 FORBIDDEN)', async () => {
    postsRepo.findById.mockResolvedValue({
      id: 'p_123',
      content: 'Alice post',
      author: { id: 'u_bob', username: 'bob' },
    });

    const res = await request(app)
      .delete('/api/posts/p_123')
      .set('Authorization', `Bearer ${userToken}`); // alice xóa bài của bob

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/posts/:id/like -> thích bài viết và tăng likeCount', async () => {
    postsRepo.findById.mockResolvedValue({ id: 'p_123' });
    socialRepo.like.mockResolvedValue(true);
    socialRepo.recount.mockResolvedValue({ likeCount: 5, commentCount: 1, shareCount: 0 });

    const res = await request(app)
      .post('/api/posts/p_123/like')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual({ liked: true, likeCount: 5 });
  });

  it('POST /api/posts/:id/comments -> bình luận bài viết trả về 201 kèm commentCount', async () => {
    postsRepo.findById.mockResolvedValue({ id: 'p_123' });
    socialRepo.comment.mockResolvedValue(true);
    socialRepo.recount.mockResolvedValue({ likeCount: 5, commentCount: 2, shareCount: 0 });

    const res = await request(app)
      .post('/api/posts/p_123/comments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ text: 'Bình luận tuyệt vời!' });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual({ commentCount: 2 });
  });

  it('POST /api/follow -> tự follow chính mình bị chặn 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/follow')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetId: 'u_alice' }); // alice tự follow alice

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/topics -> Admin tạo chủ đề thành công (201)', async () => {
    topicsRepo.findByName.mockResolvedValue(null);
    topicsRepo.create.mockResolvedValue({
      id: 't_nosql',
      name: 'nosql',
      description: 'Cơ sở dữ liệu đồ thị',
    });

    const res = await request(app)
      .post('/api/topics')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'NoSQL',
        description: 'Cơ sở dữ liệu đồ thị',
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.name).toBe('nosql');
  });

  it('POST /api/topics -> User thường tạo chủ đề bị chặn 403 FORBIDDEN', async () => {
    const res = await request(app)
      .post('/api/topics')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'NoSQL',
      });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/posts -> Lấy bảng tin Feed phân trang thành công', async () => {
    postsRepo.list.mockResolvedValue([
      {
        id: 'p_1',
        content: 'Post 1',
        createdAt: 1700000000000,
        likeCount: 2,
        commentCount: 1,
        shareCount: 0,
        author: { id: 'u_alice', username: 'alice', fullName: 'Alice' },
        topics: ['tech'],
        likedByMe: true,
      },
    ]);

    const res = await request(app)
      .get('/api/posts?page=1&limit=10')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].likedByMe).toBe(true);
  });

  it('GET /api/posts/:id -> Trả về chi tiết bài viết', async () => {
    postsRepo.findById.mockResolvedValue({
      id: 'p_1',
      content: 'Post 1',
      createdAt: 1700000000000,
      author: { id: 'u_alice', username: 'alice', fullName: 'Alice' },
      topics: ['tech'],
      likedByMe: false,
    });

    const res = await request(app)
      .get('/api/posts/p_1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBe('p_1');
  });

  it('PUT /api/me/interests -> Cập nhật sở thích hợp lệ (200), điểm vượt ngoài [0,1] bị chặn (400)', async () => {
    topicsRepo.setInterests.mockResolvedValue(1);

    // Hợp lệ
    const resValid = await request(app)
      .put('/api/me/interests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ topicId: 't_ai', score: 0.85 }] });

    expect(resValid.status).toBe(200);
    expect(resValid.body.ok).toBe(true);
    expect(resValid.body.data.updated).toBe(1);

    // Không hợp lệ (score = 2.5 > 1.0)
    const resInvalid = await request(app)
      .put('/api/me/interests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ items: [{ topicId: 't_ai', score: 2.5 }] });

    expect(resInvalid.status).toBe(400);
    expect(resInvalid.body.ok).toBe(false);
    expect(resInvalid.body.error.code).toBe('VALIDATION_ERROR');
  });
});
