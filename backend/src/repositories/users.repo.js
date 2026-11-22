import { read, write } from '../db/graph.js';
import { users } from '../queries/users.js';

const toProps = (row, key = 'u') => {
  if (!row || !row[key]) return null;
  return row[key].properties ?? row[key];
};

export async function create(user) {
  const rows = await write(users.create, {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email || '',
    bio: user.bio || '',
    country: user.country || '',
    now: user.joinedAt || Date.now(),
    role: user.role || 'user',
    passwordHash: user.passwordHash,
  });
  return toProps(rows[0], 'u');
}

export async function findById(id) {
  const rows = await read(users.findById, { id });
  return toProps(rows[0], 'u');
}

export async function findByUsername(username) {
  const rows = await read(users.findByUsername, { username });
  return toProps(rows[0], 'u');
}

export async function list({ q = '', skip = 0, limit = 20 }) {
  const rows = await read(users.list, { q, skip, limit });
  return rows.map((r) => toProps(r, 'u'));
}

export async function adminList({ q = '', role = '', status = '', skip = 0, limit = 20 } = {}) {
  const params = { q: q.toLowerCase(), role, status, skip, limit };
  const [rows, countRows] = await Promise.all([read(users.adminList, params), read(users.adminCount, params)]);
  return {
    items: rows.map((r) => ({
      user: toProps(r, 'u'),
      followers: Number(r.followers ?? 0),
      posts: Number(r.posts ?? 0),
    })),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function update(id, { fullName, bio, country, email }) {
  const rows = await write(users.update, {
    id,
    fullName: fullName ?? '',
    bio: bio ?? '',
    country: country ?? '',
    email: email ?? '',
  });
  return toProps(rows[0], 'u');
}

export async function setStatus(id, status) {
  const rows = await write(users.setStatus, { id, status });
  return toProps(rows[0], 'u');
}

export async function setRole(id, role) {
  const rows = await write(users.setRole, { id, role });
  return toProps(rows[0], 'u');
}

export async function setPassword(id, passwordHash) {
  const rows = await write(users.setPassword, { id, passwordHash });
  return rows.length > 0;
}

// Trả về id các bài viết của người khác cần tính lại bộ đếm sau khi xóa
export async function remove(id) {
  const touched = await read(users.touchedPosts, { id });
  await write(users.removePosts, { id });
  await write(users.remove, { id });
  return touched.map((r) => r.id);
}

export async function profileStats(id) {
  const rows = await read(users.profileStats, { id });
  if (!rows.length) return null;
  const { u, followers, following, posts: postCount } = rows[0];
  return {
    user: u?.properties ?? u,
    followers: Number(followers ?? 0),
    following: Number(following ?? 0),
    posts: Number(postCount ?? 0),
  };
}

export async function followers(id, { skip = 0, limit = 20 } = {}) {
  const rows = await read(users.followers, { id, skip, limit });
  return rows.map((r) => ({
    user: toProps(r, 'x'),
    since: Number(r.since ?? 0),
  }));
}

export async function following(id, { skip = 0, limit = 20 } = {}) {
  const rows = await read(users.following, { id, skip, limit });
  return rows.map((r) => ({
    user: toProps(r, 'x'),
    since: Number(r.since ?? 0),
  }));
}

export async function isFollowing(a, b) {
  const rows = await read(users.isFollowing, { a, b });
  return Number(rows[0]?.c ?? 0) > 0;
}

export async function search(q, limit = 10) {
  const rows = await read(users.search, { q, limit });
  return rows.map((r) => toProps(r, 'u'));
}
