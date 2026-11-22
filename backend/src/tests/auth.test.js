import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import * as usersRepo from '../repositories/users.repo.js';
import { findAuthState } from '../repositories/auth.repo.js';
import { signToken } from '../middlewares/auth.js';

vi.mock('../repositories/users.repo.js');

describe('Auth & Health API', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  it('GET /api/health -> trả về status 200 và db: up', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      data: { db: 'up', graph: 'social' },
    });
  });

  it('POST /api/auth/register -> thành công trả về 201 kèm token và user (không có passwordHash)', async () => {
    usersRepo.findByUsername.mockResolvedValue(null);
    usersRepo.create.mockResolvedValue({
      id: 'usr123456789',
      username: 'testuser',
      fullName: 'Test User',
      email: 'test@example.com',
      role: 'user',
      status: 'active',
      joinedAt: 1700000000000,
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'password123',
        fullName: 'Test User',
        email: 'test@example.com',
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.username).toBe('testuser');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('POST /api/auth/register -> trùng username trả về mã lỗi 409 CONFLICT', async () => {
    usersRepo.findByUsername.mockResolvedValue({ id: 'existing_id', username: 'testuser' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'password123',
        fullName: 'Test User',
      });

    expect(res.status).toBe(409);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('POST /api/auth/register -> thiếu password hoặc password < 6 ký tự trả về 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: '123',
        fullName: 'Test User',
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/auth/login -> tài khoản bị khóa (locked) trả về 403 ACCOUNT_LOCKED', async () => {
    usersRepo.findByUsername.mockResolvedValue({
      id: 'locked_user_id',
      username: 'lockeduser',
      status: 'locked',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'lockeduser',
        password: 'password123',
      });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('GET /api/auth/me -> không kèm token trả về 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  describe('Token cũ sau khi tài khoản thay đổi', () => {
    const aliceToken = signToken({ id: 'u_alice', username: 'alice', role: 'user' });
    const adminToken = signToken({ id: 'u_admin', username: 'admin', role: 'admin' });

    it('tài khoản bị khóa sau khi đăng nhập -> 403, token cũ không dùng được nữa', async () => {
      findAuthState.mockResolvedValueOnce({ role: 'user', status: 'locked' });
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${aliceToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
    });

    it('admin bị hạ xuống user -> token cũ (role admin) bị chặn ở API quản trị', async () => {
      findAuthState.mockResolvedValueOnce({ role: 'user', status: 'active' });
      const res = await request(app).get('/api/admin/audit').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('tài khoản đã bị xóa -> 401', async () => {
      findAuthState.mockResolvedValueOnce(null);
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${aliceToken}`);
      expect(res.status).toBe(401);
    });
  });
});
