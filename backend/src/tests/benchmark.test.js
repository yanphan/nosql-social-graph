import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import { createApp } from '../app.js';

describe('Benchmark & Concurrency API (Sprint 4 - TV2)', () => {
  let app;

  beforeEach(async () => {
    vi.restoreAllMocks();
    app = await createApp();
  });

  it('GET /api/benchmark: trả về HTTP 200 với đầy đủ dữ liệu so sánh FalkorDB vs PostgreSQL', async () => {
    const res = await request(app).get('/api/benchmark');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;

    // 1. Kiểm tra Metadata
    expect(data.metadata).toBeDefined();
    expect(data.metadata.graphDb).toContain('FalkorDB');
    expect(data.metadata.relationalDb).toContain('PostgreSQL');

    // 2. Kiểm tra Ma trận độ trễ theo độ sâu 1..6 (Latency by Depth)
    expect(Array.isArray(data.latencyByDepth)).toBe(true);
    expect(data.latencyByDepth.length).toBe(6);
    data.latencyByDepth.forEach((item, index) => {
      expect(item.depth).toBe(index + 1);
      expect(item.graph).toBeDefined();
      expect(typeof item.graph.mean).toBe('number');
      expect(item.postgres).toBeDefined();
      expect(typeof item.postgres.mean).toBe('number');
      expect(item.speedup).toBeDefined();
    });

    // 3. Kiểm tra Bảng so sánh các bài toán (Queries Comparison)
    expect(Array.isArray(data.queriesComparison)).toBe(true);
    const queryIds = data.queriesComparison.map((q) => q.id);
    expect(queryIds).toContain('BT1');
    expect(queryIds).toContain('BT2');
    expect(queryIds).toContain('BT3');
    expect(queryIds).toContain('BT5');

    // 4. Kiểm tra Dữ liệu chịu tải đồng thời (Concurrency)
    expect(Array.isArray(data.concurrency)).toBe(true);
    const connections = data.concurrency.map((c) => c.connections);
    expect(connections).toEqual(expect.arrayContaining([1, 10, 50, 100]));
    data.concurrency.forEach((c) => {
      expect(c.graphReqSec).toBeGreaterThan(0);
      expect(c.postgresReqSec).toBeGreaterThan(0);
      expect(typeof c.graphP95Ms).toBe('number');
      expect(typeof c.errorRate).toBe('number');
    });

    // 5. Kiểm tra Kết luận phân tích (Conclusions)
    expect(Array.isArray(data.conclusions)).toBe(true);
    expect(data.conclusions.length).toBeGreaterThan(0);
  });

  it('GET /benchmark (Alias route): trả về HTTP 200 tương thích với đặc tả bảng 6.1', async () => {
    const res = await request(app).get('/benchmark');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.latencyByDepth).toBeDefined();
  });

  it('GET /api/benchmark: Fallback mượt mà nếu file summary.json tạm thời không tồn tại', async () => {
    // Giả lập fs.existsSync trả về false
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const res = await request(app).get('/api/benchmark');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.metadata).toBeDefined();
    expect(res.body.data.latencyByDepth.length).toBe(6);
  });
});
