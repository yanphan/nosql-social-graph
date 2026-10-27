import { read, write } from '../db/graph.js';
import { topics } from '../queries/posts.js';

const toProps = (row, key = 't') => {
  if (!row || !row[key]) return null;
  return row[key].properties ?? row[key];
};

export async function list() {
  const rows = await read(topics.list);
  return rows.map((r) => {
    const props = toProps(r, 't');
    return {
      ...props,
      postCount: Number(r.postCount ?? 0),
    };
  });
}

export async function upsertByName(name, id) {
  const rows = await write(topics.upsertByName, { name, id });
  return toProps(rows[0], 't');
}

export async function create({ id, name, description = '' }) {
  const rows = await write(topics.create, { id, name, description });
  return toProps(rows[0], 't');
}

export async function update(id, { name, description = '' }) {
  const rows = await write(topics.update, { id, name, description });
  return toProps(rows[0], 't');
}

export async function remove(id) {
  await write(topics.remove, { id });
  return true;
}

export async function setInterests(uid, items) {
  await write(topics.setInterests, { uid, items });
  return items.length;
}

export async function getUserInterests(uid) {
  const rows = await read(topics.userInterests, { uid });
  return rows.map((r) => {
    const props = toProps(r, 't');
    return {
      ...props,
      score: Number(r.score ?? 0),
      postCount: Number(r.postCount ?? 0),
    };
  });
}

export async function search(q, limit = 10) {
  const rows = await read(topics.search, { q, limit });
  return rows.map((r) => toProps(r, 't'));
}

export async function findById(id) {
  const rows = await read('MATCH (t:Topic {id:$id}) RETURN t', { id });
  return toProps(rows[0], 't');
}

export async function findByName(name) {
  const rows = await read('MATCH (t:Topic {name:$name}) RETURN t', { name });
  return toProps(rows[0], 't');
}
