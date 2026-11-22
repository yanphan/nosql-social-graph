import { read, write } from '../db/graph.js';
import { follow as followQueries, interactions } from '../queries/posts.js';

export async function follow(a, b) {
  const rows = await write(followQueries.follow, { a, b, now: Date.now() });
  return { following: true, since: rows[0]?.since ?? Date.now() };
}

export async function unfollow(a, b) {
  await write(followQueries.unfollow, { a, b });
  return { following: false };
}

export async function hasLiked(uid, pid) {
  const rows = await read(interactions.hasLiked, { uid, pid });
  return Number(rows[0]?.c ?? 0) > 0;
}

export async function like(uid, pid) {
  await write(interactions.like, { uid, pid, now: Date.now() });
  return true;
}

export async function unlike(uid, pid) {
  await write(interactions.unlike, { uid, pid });
  return true;
}

// Trả về thời điểm tạo: cùng userId, đây là khóa để xóa bình luận sau này
export async function comment(uid, pid, text) {
  const now = Date.now();
  await write(interactions.comment, { uid, pid, text, now });
  return now;
}

export async function share(uid, pid, via = null) {
  await write(interactions.share, { uid, pid, via: via || null, now: Date.now() });
  return true;
}

export async function unshare(uid, pid) {
  await write(interactions.unshare, { uid, pid });
  return true;
}

export async function comments(pid, { skip = 0, limit = 20 } = {}) {
  const rows = await read(interactions.comments, { pid, skip, limit });
  return rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    text: r.text,
    at: Number(r.at ?? 0),
  }));
}

export async function findComment(uid, pid, at) {
  const rows = await read(interactions.findComment, { uid, pid, at });
  if (!rows.length) return null;
  return { userId: uid, username: rows[0].username, text: rows[0].text, at: Number(rows[0].at) };
}

export async function removeComment(uid, pid, at) {
  await write(interactions.removeComment, { uid, pid, at });
  return true;
}

export async function recountMany(pids) {
  if (!pids.length) return 0;
  const rows = await write(interactions.recountMany, { pids });
  return Number(rows[0]?.n ?? 0);
}

export async function recount(pid) {
  const rows = await write(interactions.recount, { pid });
  if (!rows.length) return { likeCount: 0, commentCount: 0, shareCount: 0 };
  return {
    likeCount: Number(rows[0].likeCount ?? 0),
    commentCount: Number(rows[0].commentCount ?? 0),
    shareCount: Number(rows[0].shareCount ?? 0),
  };
}
