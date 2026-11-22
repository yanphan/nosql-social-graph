import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import { createApp } from '../app.js';
import * as backup from '../../../database/lib/backup.js';
import * as integrity from '../../../database/lib/integrity.js';
import * as importer from '../../../database/lib/importer.js';
import * as exporter from '../../../database/lib/exporter.js';
import { signToken } from '../middlewares/auth.js';

vi.mock('../../../database/lib/backup.js');
vi.mock('../../../database/lib/integrity.js');
vi.mock('../../../database/lib/importer.js');
vi.mock('../../../database/lib/exporter.js');
vi.mock('../db/graph.js', () => ({
  read: vi.fn().mockResolvedValue([{ c: 100 }]),
  write: vi.fn().mockResolvedValue([]),
}));

describe('Admin Data & System Management API (Sprint 3)', () => {
  let app;
  const adminToken = signToken({ id: 'u_admin', username: 'admin', role: 'admin' });
  const userToken = signToken({ id: 'u_alice', username: 'alice', role: 'user' });

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await createApp();
  });

  // --- RBAC Protection ---
  it('Mọi API /api/admin/* đều chặn User thường với mã lỗi 403 FORBIDDEN', async () => {
    const res1 = await request(app)
      .get('/api/admin/integrity')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res1.status).toBe(403);
    expect(res1.body.error.code).toBe('FORBIDDEN');

    const res2 = await request(app)
      .post('/api/admin/backup')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res2.status).toBe(403);

    const res3 = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res3.status).toBe(403);
  });

  // --- Integrity Check (UC-15) ---
  it('GET /api/admin/integrity -> Admin xem kết quả kiểm tra 9 ràng buộc toàn vẹn', async () => {
    integrity.runChecks.mockResolvedValue([
      { key: 'selfFollow', name: 'Không tự theo dõi', count: 0, ok: true },
      { key: 'dupLike', name: 'Không like trùng', count: 0, ok: true },
    ]);

    const res = await request(app)
      .get('/api/admin/integrity')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.checks).toHaveLength(2);
    expect(res.body.data.checks[0].ok).toBe(true);
  });

  // --- Backup & Restore (UC-17) ---
  it('POST /api/admin/backup -> Admin tạo bản sao lưu thành công', async () => {
    backup.createBackup.mockResolvedValue({
      file: 'backup-1700000000000.json',
      nodes: 500,
      edges: 1200,
      sizeBytes: 45000,
    });

    const res = await request(app)
      .post('/api/admin/backup')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.file).toContain('backup-');
    expect(res.body.data.nodes).toBe(500);
  });

  it('GET /api/admin/backups -> Admin xem danh sách các bản sao lưu', async () => {
    backup.listBackups.mockResolvedValue([
      { file: 'backup-1.json', sizeBytes: 12000, createdAt: 1700000000000, nodes: 100, edges: 200 },
    ]);

    const res = await request(app)
      .get('/api/admin/backups')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].file).toBe('backup-1.json');
  });

  it('POST /api/admin/restore -> Phục hồi dữ liệu và kiểm tra matchesBackup = true', async () => {
    backup.restore.mockResolvedValue({
      nodes: 500,
      edges: 1200,
      matchesBackup: true,
    });

    const res = await request(app)
      .post('/api/admin/restore')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ file: 'backup-1.json' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.matchesBackup).toBe(true);
    expect(res.body.data.nodes).toBe(500);
  });

  it('POST /api/admin/restore -> file không tồn tại trả về 404 NOT_FOUND', async () => {
    backup.restore.mockRejectedValue(Object.assign(new Error('File sao lưu không tồn tại'), { code: 'NOT_FOUND' }));

    const res = await request(app)
      .post('/api/admin/restore')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ file: 'ghost-backup.json' });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /api/admin/restore -> thất bại thì báo rõ lý do (không ẩn thành "Lỗi hệ thống")', async () => {
    backup.restore.mockRejectedValue(
      Object.assign(new Error('Phục hồi thất bại: lệch số liệu. Dữ liệu đã được đưa về trạng thái trước khi phục hồi.'), {
        code: 'RESTORE_FAILED',
      })
    );
    const res = await request(app)
      .post('/api/admin/restore')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ file: 'backup-1.json' });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('RESTORE_FAILED');
    expect(res.body.error.message).toContain('trạng thái trước khi phục hồi');
  });

  it('Chỉ một thao tác nặng chạy một lúc: sao lưu khi đang phục hồi -> 409', async () => {
    let finish;
    backup.restore.mockReturnValue(new Promise((r) => (finish = r)));
    const restoring = request(app)
      .post('/api/admin/restore')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ file: 'backup-1.json' })
      .then((r) => r);
    await new Promise((r) => setTimeout(r, 50));
    const second = await request(app).post('/api/admin/backup').set('Authorization', `Bearer ${adminToken}`);
    expect(second.status).toBe(409);
    expect(second.body.error.message).toContain('phục hồi');
    finish({ nodes: 1, edges: 0, matchesBackup: true });
    expect((await restoring).status).toBe(200);
  });

  it('DELETE /api/admin/backups/:file -> xóa bản sao lưu; tên lạ -> 400', async () => {
    backup.deleteBackup.mockResolvedValue({ deleted: true, file: 'backup-1.json' });
    const okRes = await request(app).delete('/api/admin/backups/backup-1.json').set('Authorization', `Bearer ${adminToken}`);
    expect(okRes.status).toBe(200);
    backup.deleteBackup.mockRejectedValue(Object.assign(new Error('Tên file sao lưu không hợp lệ'), { code: 'INVALID_NAME' }));
    const bad = await request(app).delete('/api/admin/backups/..%2F.env').set('Authorization', `Bearer ${adminToken}`);
    expect(bad.status).toBe(400);
  });

  it('POST /api/admin/seed -> đã bỏ khỏi giao diện quản trị (404)', async () => {
    const res = await request(app).post('/api/admin/seed').set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(404);
  });

  // --- Import / Export (UC-15) ---
  it('POST /api/admin/import -> không có file đính kèm trả về 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/admin/import?kind=users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/admin/import -> upload file CSV users thành công', async () => {
    importer.importCsv.mockResolvedValue({ kind: 'User', rows: 1, skipped: 0, errors: [], ms: 5 });

    const csvData = 'username,fullName,email,passwordHash,role\nu1,User 1,u1@test.com,hash,user\n';
    const res = await request(app)
      .post('/api/admin/import?kind=users')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvData), 'users.csv');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toMatchObject({ format: 'csv', kind: 'User', rows: 1, skipped: 0 });
    expect(importer.importCsv).toHaveBeenCalledWith('users', expect.any(String));
  });

  it('POST /api/admin/import -> file .txt hoặc CSV thiếu loại dữ liệu -> 400', async () => {
    const txt = await request(app)
      .post('/api/admin/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('x'), 'a.txt');
    expect(txt.status).toBe(400);
    const noKind = await request(app)
      .post('/api/admin/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('id,name'), 'a.csv');
    expect(noKind.status).toBe(400);
    expect(importer.importCsv).not.toHaveBeenCalled();
  });

  it('GET /api/admin/export -> loại dữ liệu lạ trả 400 thay vì 500', async () => {
    exporter.exportCsv.mockRejectedValue(Object.assign(new Error('Loại dữ liệu không hợp lệ'), { code: 'INVALID_KIND' }));
    const res = await request(app)
      .get('/api/admin/export?format=csv&label=Hack')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('GET /api/admin/export -> Admin xuất dữ liệu graph JSON thành công', async () => {
    exporter.exportJson.mockImplementation((outPath) => {
      fs.writeFileSync(outPath, '{"nodes":[],"edges":[]}', 'utf8');
      return Promise.resolve({ nodes: 10, edges: 20 });
    });

    const res = await request(app)
      .get('/api/admin/export?format=json')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment; filename=');
  });

  // --- Audit Log (UC-16) ---
  it('GET /api/admin/audit -> Admin xem lịch sử ghi vết thành công', async () => {
    const res = await request(app)
      .get('/api/admin/audit?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
