import { read, write } from '../db/graph.js';
import { follow, interactions } from '../queries/posts.js';

export async function followUser(a, b) {
  const now = Date.now();
  const rows = await write(follow.follow, { a, b, now });
  return { following: true, since: Number(rows[0]?.since ?? now) };
}

export async function unfollowUser(a, b) {
  await write(follow.unfollow, { a, b });
  return { following: false };
}

export async function hasLiked(uid, pid) {
  const rows = await read(interactions.hasLiked, { uid, pid });
  return Number(rows[0]?.c ?? 0) > 0;
}

export async function like(uid, pid) {
  const now = Date.now();
  await write(interactions.like, { uid, pid, now });
  return recount(pid);
}

export async function unlike(uid, pid) {
  await write(interactions.unlike, { uid, pid });
  return recount(pid);
}

export async function comment(uid, pid, text) {
  const now = Date.now();
  await write(interactions.comment, { uid, pid, text, now });
  return recount(pid);
}

export async function share(uid, pid, via = null) {
  const now = Date.now();
  await write(interactions.share, { uid, pid, via: via || null, now });
  return recount(pid);
}

export async function comments(pid, { skip = 0, limit = 20 } = {}) {
  const rows = await read(interactions.comments, {
    pid,
    skip: Number(skip) || 0,
    limit: Number(limit) || 20,
  });
  return rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    text: r.text,
    at: Number(r.at ?? 0),
  }));
}

export async function recount(pid) {
  const rows = await write(interactions.recount, { pid });
  if (!rows.length) return { likeCount: 0, commentCount: 0, shareCount: 0 };
  const r = rows[0];
  return {
    likeCount: Number(r.likeCount ?? 0),
    commentCount: Number(r.commentCount ?? 0),
    shareCount: Number(r.shareCount ?? 0),
  };
}

// Aliases matching exact frozen names
export { followUser as follow, unfollowUser as unfollow };
