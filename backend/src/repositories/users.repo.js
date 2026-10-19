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

export async function remove(id) {
  await write(users.remove, { id });
  return true;
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
