import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import * as usersRepo from '../repositories/users.repo.js';
import * as socialRepo from '../repositories/social.repo.js';
import { signToken } from '../middlewares/auth.js';

vi.mock('../repositories/users.repo.js');
vi.mock('../repositories/social.repo.js');

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
      role: 'admin',
      status: 'active',
    });

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'newbie',
        password: 'password123',
        fullName: 'Newbie',
        role: 'admin',
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.role).toBe('admin');
  });

  it('POST /api/users -> vai trò analyst không còn hợp lệ (400)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'oldrole', password: 'password123', fullName: 'Old Role', role: 'analyst' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
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

  it('Admin không tự khóa, tự gỡ quyền, tự xóa chính mình (403)', async () => {
    usersRepo.findById.mockResolvedValue({ id: 'u_admin', username: 'admin', role: 'admin' });
    const auth = ['Authorization', `Bearer ${adminToken}`];
    const lock = await request(app).patch('/api/users/u_admin/status').set(...auth).send({ status: 'locked' });
    const demote = await request(app).patch('/api/users/u_admin/role').set(...auth).send({ role: 'user' });
    const del = await request(app).delete('/api/users/u_admin').set(...auth);
    for (const r of [lock, demote, del]) {
      expect(r.status).toBe(403);
      expect(r.body.error.code).toBe('FORBIDDEN');
    }
    expect(usersRepo.setStatus).not.toHaveBeenCalled();
    expect(usersRepo.setRole).not.toHaveBeenCalled();
    expect(usersRepo.remove).not.toHaveBeenCalled();
  });

  it('DELETE /api/users/:id -> xóa kèm bài viết và tính lại bộ đếm các bài người đó đã tương tác', async () => {
    usersRepo.findById.mockResolvedValue({ id: 'u_bob', username: 'bob' });
    usersRepo.remove.mockResolvedValue(['p_1', 'p_2']);
    socialRepo.recountMany.mockResolvedValue(2);
    const res = await request(app).delete('/api/users/u_bob').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deleted: true, recountedPosts: 2 });
    expect(socialRepo.recountMany).toHaveBeenCalledWith(['p_1', 'p_2']);
  });

  it('PATCH /api/users/:id/password -> mật khẩu yếu bị chặn 400, hợp lệ thì lưu hash', async () => {
    usersRepo.findById.mockResolvedValue({ id: 'u_bob', username: 'bob' });
    usersRepo.setPassword.mockResolvedValue(true);
    const url = '/api/users/u_bob/password';
    const weak = await request(app).patch(url).set('Authorization', `Bearer ${adminToken}`).send({ password: 'abc12345' });
    expect(weak.status).toBe(400);
    const okRes = await request(app).patch(url).set('Authorization', `Bearer ${adminToken}`).send({ password: 'NewPassw0rd' });
    expect(okRes.status).toBe(200);
    const [id, hash] = usersRepo.setPassword.mock.calls[0];
    expect(id).toBe('u_bob');
    expect(hash).not.toBe('NewPassw0rd');
    const byUser = await request(app).patch(url).set('Authorization', `Bearer ${userToken}`).send({ password: 'NewPassw0rd' });
    expect(byUser.status).toBe(403);
  });

  it('GET /api/admin/users -> có total theo bộ lọc, số người theo dõi thật; user thường bị chặn', async () => {
    usersRepo.adminList.mockResolvedValue({
      items: [
        {
          user: { id: 'u_bob', username: 'bob', fullName: 'Bob', role: 'user', status: 'locked', passwordHash: 'x' },
          followers: 12,
          posts: 3,
        },
      ],
      total: 21,
    });
    const res = await request(app)
      .get('/api/admin/users?q=Bo&status=locked&page=2&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 2, limit: 10, total: 21, hasMore: true });
    expect(res.body.data.items[0]).toMatchObject({ username: 'bob', followers: 12, posts: 3 });
    expect(res.body.data.items[0].passwordHash).toBeUndefined();
    expect(usersRepo.adminList).toHaveBeenCalledWith({ q: 'Bo', role: '', status: 'locked', skip: 10, limit: 10 });

    const bad = await request(app).get('/api/admin/users?status=hacked').set('Authorization', `Bearer ${adminToken}`);
    expect(bad.status).toBe(400);
    const nan = await request(app).get('/api/admin/users?page=abc').set('Authorization', `Bearer ${adminToken}`);
    expect(nan.status).toBe(200);
    expect(nan.body.data.page).toBe(1);
    const forbidden = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);
  });
});
