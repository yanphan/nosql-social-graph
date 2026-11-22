import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import * as postsRepo from '../repositories/posts.repo.js';
import * as topicsRepo from '../repositories/topics.repo.js';
import * as socialRepo from '../repositories/social.repo.js';
import * as usersRepo from '../repositories/users.repo.js';
import * as moderationRepo from '../repositories/moderation.repo.js';
import { signToken } from '../middlewares/auth.js';

vi.mock('../repositories/moderation.repo.js');
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
    socialRepo.comment.mockResolvedValue(1700000000999);
    socialRepo.recount.mockResolvedValue({ likeCount: 5, commentCount: 2, shareCount: 0 });

    const res = await request(app)
      .post('/api/posts/p_123/comments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ text: 'Bình luận tuyệt vời!' });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual({
      commentCount: 2,
      comment: { userId: 'u_alice', username: 'alice', text: 'Bình luận tuyệt vời!', at: 1700000000999 },
    });
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

  it('PUT /api/topics/:id -> Admin sửa chủ đề; tên trùng chủ đề khác bị chặn 409', async () => {
    topicsRepo.findById.mockResolvedValue({ id: 't_ai', name: 'ai', description: '' });
    topicsRepo.findByName.mockResolvedValueOnce(null);
    topicsRepo.update.mockResolvedValue({ id: 't_ai', name: 'machine', description: 'Học máy' });
    let res = await request(app)
      .put('/api/topics/t_ai')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Machine', description: 'Học máy' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('machine');

    topicsRepo.findByName.mockResolvedValueOnce({ id: 't_other', name: 'react' });
    res = await request(app)
      .put('/api/topics/t_ai')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'react' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('GET /api/topics/:id/impact -> Admin xem mức ảnh hưởng trước khi xóa', async () => {
    topicsRepo.findById.mockResolvedValue({ id: 't_ai', name: 'ai' });
    topicsRepo.impact.mockResolvedValue({ posts: 120, orphanPosts: 0, interested: 30 });
    const res = await request(app).get('/api/topics/t_ai/impact').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'ai', posts: 120, orphanPosts: 0, interested: 30 });

    const forbidden = await request(app).get('/api/topics/t_ai/impact').set('Authorization', `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);
  });

  it('DELETE /api/topics/:id -> chặn 409 nếu có bài viết sẽ không còn chủ đề nào', async () => {
    topicsRepo.findById.mockResolvedValue({ id: 't_ai', name: 'ai' });
    topicsRepo.impact.mockResolvedValue({ posts: 5, orphanPosts: 2, interested: 1 });
    topicsRepo.remove.mockClear();
    const res = await request(app).delete('/api/topics/t_ai').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('2 bài viết');
    expect(topicsRepo.remove).not.toHaveBeenCalled();
  });

  it('DELETE /api/topics/:id -> xóa được khi mọi bài viết còn chủ đề khác', async () => {
    topicsRepo.findById.mockResolvedValue({ id: 't_ai', name: 'ai' });
    topicsRepo.impact.mockResolvedValue({ posts: 5, orphanPosts: 0, interested: 1 });
    topicsRepo.remove.mockResolvedValue(true);
    const res = await request(app).delete('/api/topics/t_ai').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(topicsRepo.remove).toHaveBeenCalledWith('t_ai');
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

  const bobPost = {
    id: 'p_bob',
    content: 'Bài của Bob',
    createdAt: 1700000000000,
    likeCount: 7,
    commentCount: 2,
    shareCount: 1,
    author: { id: 'u_bob', username: 'bob', fullName: 'Bob' },
    topics: ['ai'],
  };

  it('PUT /api/posts/:id -> Admin không được sửa nội dung bài của người khác (403)', async () => {
    postsRepo.findById.mockResolvedValue(bobPost);
    const res = await request(app)
      .put('/api/posts/p_bob')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: 'sửa' });
    expect(res.status).toBe(403);
    expect(postsRepo.update).not.toHaveBeenCalled();
  });

  it('DELETE /api/posts/:id -> Admin gỡ bài người khác phải có lý do, ghi nhật ký trước khi xóa', async () => {
    postsRepo.findById.mockResolvedValue(bobPost);
    postsRepo.remove.mockResolvedValue(true);
    moderationRepo.append.mockResolvedValue({});
    const del = (body) => {
      const r = request(app).delete('/api/posts/p_bob').set('Authorization', `Bearer ${adminToken}`);
      return body ? r.send(body) : r;
    };

    expect((await del()).status).toBe(400);
    expect((await del({ reason: 'other' })).status).toBe(400); // "Khác" phải có ghi chú
    expect((await del({ reason: 'ghet' })).status).toBe(400);
    expect(postsRepo.remove).not.toHaveBeenCalled();

    const res = await del({ reason: 'spam' });
    expect(res.status).toBe(200);
    expect(moderationRepo.append.mock.calls[0][0]).toMatchObject({
      action: 'remove_post',
      reason: 'spam',
      by: { id: 'u_admin' },
      author: { id: 'u_bob' },
      post: { id: 'p_bob', content: 'Bài của Bob', likeCount: 7, commentCount: 2, shareCount: 1 },
    });
    expect(moderationRepo.append.mock.invocationCallOrder[0]).toBeLessThan(
      postsRepo.remove.mock.invocationCallOrder[0]
    );
  });

  it('DELETE /api/posts/:id -> Ghi nhật ký lỗi thì không xóa bài', async () => {
    postsRepo.findById.mockResolvedValue(bobPost);
    moderationRepo.append.mockRejectedValue(new Error('disk full'));
    const res = await request(app)
      .delete('/api/posts/p_bob')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'spam' });
    expect(res.status).toBe(500);
    expect(postsRepo.remove).not.toHaveBeenCalled();
  });

  it('DELETE /api/posts/:id -> Tác giả tự xóa không cần lý do, không ghi nhật ký kiểm duyệt', async () => {
    postsRepo.findById.mockResolvedValue({ ...bobPost, author: { id: 'u_alice', username: 'alice' } });
    postsRepo.remove.mockResolvedValue(true);
    const res = await request(app).delete('/api/posts/p_bob').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(moderationRepo.append).not.toHaveBeenCalled();
  });

  it('DELETE /api/posts/:id/comments/:userId/:at -> quyền xóa bình luận', async () => {
    postsRepo.findById.mockResolvedValue(bobPost);
    socialRepo.findComment.mockResolvedValue({ userId: 'u_carol', username: 'carol', text: 'spam link', at: 1700000000123 });
    socialRepo.removeComment.mockResolvedValue(true);
    socialRepo.recount.mockResolvedValue({ likeCount: 7, commentCount: 1, shareCount: 1 });
    moderationRepo.append.mockResolvedValue({});
    const url = '/api/posts/p_bob/comments/u_carol/1700000000123';

    // alice: không viết bình luận, không phải tác giả bài, không phải admin
    expect((await request(app).delete(url).set('Authorization', `Bearer ${userToken}`)).status).toBe(403);
    // admin không nêu lý do
    expect((await request(app).delete(url).set('Authorization', `Bearer ${adminToken}`)).status).toBe(400);
    expect(socialRepo.removeComment).not.toHaveBeenCalled();

    const res = await request(app)
      .delete(url)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'inappropriate' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deleted: true, commentCount: 1 });
    expect(socialRepo.removeComment).toHaveBeenCalledWith('u_carol', 'p_bob', 1700000000123);
    expect(moderationRepo.append.mock.calls[0][0]).toMatchObject({
      action: 'remove_comment',
      comment: { text: 'spam link' },
    });

    // Người viết bình luận tự xóa: không cần lý do, không ghi nhật ký
    moderationRepo.append.mockClear();
    const carolToken = signToken({ id: 'u_carol', username: 'carol', role: 'user' });
    expect((await request(app).delete(url).set('Authorization', `Bearer ${carolToken}`)).status).toBe(200);
    expect(moderationRepo.append).not.toHaveBeenCalled();

    socialRepo.findComment.mockResolvedValue(null);
    const gone = await request(app).delete(url).set('Authorization', `Bearer ${adminToken}`).send({ reason: 'spam' });
    expect(gone.status).toBe(404);
    const badAt = await request(app)
      .delete('/api/posts/p_bob/comments/u_carol/abc')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(badAt.status).toBe(400);
  });

  it('GET /api/admin/posts -> tìm/lọc có total; user thường bị chặn', async () => {
    postsRepo.adminList.mockResolvedValue({ items: [bobPost], total: 41 });
    const res = await request(app)
      .get('/api/admin/posts?q=Bob&topic=AI&page=2&limit=20')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ total: 41, page: 2, hasMore: true });
    expect(postsRepo.adminList).toHaveBeenCalledWith({ q: 'Bob', topic: 'ai', skip: 20, limit: 20 });
    const forbidden = await request(app).get('/api/admin/posts').set('Authorization', `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);
  });

  it('POST /api/posts/:id/share -> chia sẻ bài người khác, trả shareCount; via là chính mình thì bỏ', async () => {
    postsRepo.findById.mockResolvedValue({ id: 'p_bob', author: { id: 'u_bob' } });
    socialRepo.recount.mockResolvedValue({ likeCount: 0, commentCount: 0, shareCount: 3 });

    const res = await request(app)
      .post('/api/posts/p_bob/share')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ via: 'u_alice' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ shared: true, shareCount: 3 });
    expect(socialRepo.share).toHaveBeenCalledWith('u_alice', 'p_bob', null);

    const noBody = await request(app).post('/api/posts/p_bob/share').set('Authorization', `Bearer ${userToken}`);
    expect(noBody.status).toBe(200);
  });

  it('POST /api/posts/:id/share -> không chia sẻ được bài của chính mình (400), bài không có -> 404', async () => {
    postsRepo.findById.mockResolvedValue({ id: 'p_me', author: { id: 'u_alice' } });
    const own = await request(app).post('/api/posts/p_me/share').set('Authorization', `Bearer ${userToken}`);
    expect(own.status).toBe(400);
    expect(socialRepo.share).not.toHaveBeenCalled();

    postsRepo.findById.mockResolvedValue(null);
    const missing = await request(app).post('/api/posts/p_x/share').set('Authorization', `Bearer ${userToken}`);
    expect(missing.status).toBe(404);
  });

  it('DELETE /api/posts/:id/share -> hủy chia sẻ, cần đăng nhập', async () => {
    postsRepo.findById.mockResolvedValue({ id: 'p_bob', author: { id: 'u_bob' } });
    socialRepo.recount.mockResolvedValue({ likeCount: 0, commentCount: 0, shareCount: 2 });

    const res = await request(app).delete('/api/posts/p_bob/share').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ shared: false, shareCount: 2 });
    expect(socialRepo.unshare).toHaveBeenCalledWith('u_alice', 'p_bob');

    const anon = await request(app).delete('/api/posts/p_bob/share');
    expect(anon.status).toBe(401);
  });
});
