import * as analyticsRepo from '../repositories/analytics.repo.js';
import { appCache } from '../utils/cache.js';

export async function getTrendingTopics({ days = 7, limit = 10 } = {}) {
  const d = Math.max(1, Number(days) || 7);
  const l = Math.min(100, Math.max(1, Number(limit) || 10));

  const cacheKey = `trending:${d}:${l}`;
  const cached = appCache.get(cacheKey);
  if (cached) return cached;

  const sinceMs = Date.now() - d * 24 * 60 * 60 * 1000;
  const raw = await analyticsRepo.trending(sinceMs);

  const result = raw.slice(0, l).map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  appCache.set(cacheKey, result, 60_000);
  return result;
}
