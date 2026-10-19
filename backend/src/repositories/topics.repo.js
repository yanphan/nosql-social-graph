import { nanoid } from 'nanoid';
import { read, write } from '../db/graph.js';
import { topics } from '../queries/posts.js';

const toTopic = (t, postCount = 0) => {
  if (!t) return null;
  const p = t.properties ?? t;
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    postCount: Number(postCount ?? 0),
  };
};

export async function list() {
  const rows = await read(topics.list);
  return rows.map((r) => toTopic(r.t, r.postCount));
}

export async function upsertByName(name) {
  const id = nanoid(12);
  const rows = await write(topics.upsertByName, { name: name.trim().toLowerCase(), id });
  return toTopic(rows[0]?.t);
}

export async function create({ id, name, description = '' }) {
  const tid = id || nanoid(12);
  const rows = await write(topics.create, {
    id: tid,
    name: name.trim().toLowerCase(),
    description: description || '',
  });
  return toTopic(rows[0]?.t);
}

export async function update(id, { name, description = '' }) {
  const rows = await write(topics.update, {
    id,
    name: name.trim().toLowerCase(),
    description: description || '',
  });
  return toTopic(rows[0]?.t);
}

export async function remove(id) {
  await write(topics.remove, { id });
  return true;
}

export async function setInterests(uid, items = []) {
  if (!items.length) return 0;
  await write(topics.setInterests, { uid, items });
  return items.length;
}

export async function search(q = '', limit = 10) {
  const rows = await read(topics.search, { q: q.trim().toLowerCase(), limit });
  return rows.map((r) => toTopic(r.t));
}
