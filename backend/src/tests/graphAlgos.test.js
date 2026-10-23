import { describe, it, expect } from 'vitest';
import { computePageRank, computeWCC, computeBFSPath } from '../utils/graphAlgos.js';

describe('In-Memory Graph Algorithms Fallback (graphAlgos.js)', () => {
  describe('PageRank', () => {
    it('Tính điểm PageRank chính xác: node có nhiều incoming links đạt điểm cao nhất', () => {
      // Đồ thị: 1 -> 2, 3 -> 2, 4 -> 2, 2 -> 1
      const edges = [
        { s: '1', t: '2' },
        { s: '3', t: '2' },
        { s: '4', t: '2' },
        { s: '2', t: '1' },
      ];

      const res = computePageRank(edges, { d: 0.85, maxIter: 20 });
      expect(res.length).toBe(4);
      // Node 2 nhận link từ 1, 3, 4 nên phải đứng Top 1
      expect(res[0].id).toBe('2');
      expect(res[0].score).toBeGreaterThan(res[1].score);
    });

    it('Xử lý an toàn đồ thị rỗng', () => {
      const res = computePageRank([]);
      expect(res).toEqual([]);
    });
  });

  describe('WCC (Weakly Connected Components)', () => {
    it('Phân tách chính xác 2 thành phần liên thông rời rạc', () => {
      // Component 1: {A, B, C}; Component 2: {D, E}
      const edges = [
        { s: 'A', t: 'B' },
        { s: 'B', t: 'C' },
        { s: 'D', t: 'E' },
      ];

      const res = computeWCC(edges);
      expect(res.length).toBe(2);
      expect(res[0].members.length).toBe(3); // A, B, C
      expect(res[1].members.length).toBe(2); // D, E
    });
  });

  describe('BFS Shortest Path', () => {
    it('Tìm đường đi ngắn nhất giữa 2 node', () => {
      // A -> B -> C -> D; A -> X -> D (2 bước)
      const edges = [
        { s: 'A', t: 'B' },
        { s: 'B', t: 'C' },
        { s: 'C', t: 'D' },
        { s: 'A', t: 'X' },
        { s: 'X', t: 'D' },
      ];

      const res = computeBFSPath(edges, 'A', 'D', 6);
      expect(res.found).toBe(true);
      expect(res.length).toBe(2);
      expect(res.steps).toEqual(['A', 'X', 'D']);
    });

    it('Trả về found: false nếu không có đường đi', () => {
      const edges = [
        { s: 'A', t: 'B' },
        { s: 'C', t: 'D' },
      ];

      const res = computeBFSPath(edges, 'A', 'D', 6);
      expect(res.found).toBe(false);
      expect(res.steps).toEqual([]);
      expect(res.length).toBeNull();
    });
  });
});
