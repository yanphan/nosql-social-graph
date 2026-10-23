/**
 * Bộ nhớ đệm in-memory với TTL (Time-To-Live)
 * Mặc định TTL 60 giây dùng cho Trending và Analytics
 */
export class MemoryCache {
  constructor(defaultTtlMs = 60_000) {
    this.store = new Map();
    this.defaultTtl = defaultTtlMs;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.val;
  }

  set(key, val, ttlMs = this.defaultTtl) {
    this.store.set(key, {
      val,
      expiry: Date.now() + ttlMs,
    });
  }

  clear() {
    this.store.clear();
  }
}

export const appCache = new MemoryCache(60_000);
