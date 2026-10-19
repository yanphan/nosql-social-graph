export const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data });

export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const paginate = (q) => {
  const page = Math.max(1, Number(q.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));
  return { page, limit, skip: (page - 1) * limit };
};

// Lấy limit+1 bản ghi từ repo, rồi gọi pageOf để tính hasMore
export const pageOf = (rows, { page, limit }) => ({
  items: rows.slice(0, limit),
  page,
  limit,
  hasMore: rows.length > limit,
});
