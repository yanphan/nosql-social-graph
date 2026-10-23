import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import * as usersRepo from '../repositories/users.repo.js';
import { signToken } from '../middlewares/auth.js';

vi.mock('../repositories/users.repo.js');

describe('Users API (Sprint 1)', () => {
  let app;
  const userToken = signToken({ id: 'u_alice', username: 'alice', role: 'user' });
  const adminToken = signToken({ id: 'u_admin', username: 'admin', role: 'admin' });

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  it('GET /api/users -> trả về danh sách user phân trang theo envelope chuẩn', async () => {
    usersRepo.list.mockResolvedValue([
      { id: 'u_alice', username: 'alice', fullName: 'Alice Nguyen', role: 'user', status: 'active' },
      { id: 'u_bob', username: 'bob', fullName: 'Bob Tran', role: 'user', status: 'active' },
    ]);

    const res = await request(app)
      .get('/api/users?page=1&limit=20')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(20);
    expect(res.body.data.hasMore).toBe(false);
  });

  it('GET /api/users/:id -> trả về thông tin profile kèm thống kê và trạng thái isFollowing', async () => {
    usersRepo.profileStats.mockResolvedValue({
      user: {
        id: 'u_bob',
        username: 'bob',
        fullName: 'Bob Tran',
        bio: 'Hello world',
        role: 'user',
        status: 'active',
      },
      followers: 12,
      following: 8,
      posts: 5,
    });
    usersRepo.isFollowing.mockResolvedValue(true);

    const res = await request(app)
      .get('/api/users/u_bob')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.user.username).toBe('bob');
    expect(res.body.data.followers).toBe(12);
    expect(res.body.data.following).toBe(8);
    expect(res.body.data.posts).toBe(5);
    expect(res.body.data.isFollowing).toBe(true);
  });

  it('POST /api/users -> Admin tạo user thành công (201)', async () => {
    usersRepo.findByUsername.mockResolvedValue(null);
    usersRepo.create.mockResolvedValue({
      id: 'u_new',
      username: 'newbie',
      fullName: 'Newbie',
      role: 'analyst',
      status: 'active',
    });

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'newbie',
        password: 'password123',
        fullName: 'Newbie',
        role: 'analyst',
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.role).toBe('analyst');
  });

  it('POST /api/users -> User thường tạo user bị chặn 403 FORBIDDEN', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        username: 'newbie',
        password: 'password123',
        fullName: 'Newbie',
      });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('PATCH /api/users/:id/status -> Admin khóa tài khoản thành công', async () => {
    usersRepo.findById.mockResolvedValue({ id: 'u_bob', username: 'bob', status: 'active' });
    usersRepo.setStatus.mockResolvedValue({ id: 'u_bob', username: 'bob', status: 'locked' });

    const res = await request(app)
      .patch('/api/users/u_bob/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'locked' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('locked');
  });

  it('PUT /api/users/:id -> User không thể sửa thông tin của người khác (403 FORBIDDEN)', async () => {
    usersRepo.findById.mockResolvedValue({ id: 'u_bob', username: 'bob' });

    const res = await request(app)
      .put('/api/users/u_bob')
      .set('Authorization', `Bearer ${userToken}`) // alice sửa bob
      .send({ fullName: 'Hacked Name' });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('PUT /api/users/:id -> Chính chủ sửa profile thành công, giữ nguyên các trường không truyền', async () => {
    usersRepo.findById.mockResolvedValue({
      id: 'u_alice',
      username: 'alice',
      fullName: 'Alice Nguyen',
      bio: 'Old bio',
      country: 'Vietnam',
      email: 'alice@example.com',
      role: 'user',
      status: 'active',
    });
    usersRepo.update.mockImplementation((id, merged) => Promise.resolve({
      id,
      username: 'alice',
      ...merged,
      role: 'user',
      status: 'active',
    }));

    const res = await request(app)
      .put('/api/users/u_alice')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bio: 'New awesome bio' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.bio).toBe('New awesome bio');
    expect(res.body.data.fullName).toBe('Alice Nguyen');
  });
});
