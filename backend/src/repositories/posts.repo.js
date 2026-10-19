import { nanoid } from 'nanoid';
import { read, write } from '../db/graph.js';
import { posts } from '../queries/posts.js';

const toProps = (row, key = 'p') => {
  if (!row || !row[key]) return null;
  return row[key].properties ?? row[key];
};

const mapPostRow = (r, me = null) => {
  if (!r) return null;
  const p = toProps(r, 'p');
  if (!p) return null;
  return {
    id: p.id,
    content: p.content,
    createdAt: Number(p.createdAt ?? 0),
    language: p.language || 'vi',
    likeCount: Number(p.likeCount ?? 0),
    commentCount: Number(p.commentCount ?? 0),
    shareCount: Number(p.shareCount ?? 0),
    author: {
      id: r.authorId ?? '',
      username: r.authorUsername ?? '',
      fullName: r.authorFullName ?? '',
    },
    topics: Array.isArray(r.topics) ? r.topics.filter(Boolean) : [],
    likedByMe: Boolean(r.likedByMe),
  };
};

export async function create({ uid, content, language = 'vi', topicIds = [] }) {
  const pid = nanoid(12);
  const now = Date.now();
  await write(posts.create, {
    uid,
    pid,
    content,
    language,
    topicIds,
    now,
  });
  return findById(pid);
}

export async function list({ me = null, authorId = null, topic = null, since = 0, skip = 0, limit = 20 } = {}) {
  const query = topic ? posts.listByTopic : posts.list;
  const params = {
    me: me || null,
    authorId: authorId || null,
    topic: topic || null,
    since: Number(since) || 0,
    skip: Number(skip) || 0,
    limit: Number(limit) || 20,
  };
  const rows = await read(query, params);
  return rows.map((r) => mapPostRow(r, me));
}

export async function findById(id) {
  const rows = await read(posts.findById, { id });
  if (!rows.length) return null;
  return mapPostRow(rows[0]);
}

export async function update(id, content) {
  const rows = await write(posts.update, { id, content });
  if (!rows.length) return null;
  return findById(id);
}

export async function replaceTopics(id, topicIds = []) {
  await write(posts.clearTopics, { id });
  if (topicIds.length > 0) {
    await write(posts.attachTopics, { id, topicIds });
  }
  return findById(id);
}

export async function remove(id) {
  await write(posts.remove, { id });
  return true;
}

export async function search(q = '', limit = 10) {
  const rows = await read(posts.search, { q, limit });
  return rows.map((r) => mapPostRow(r));
}
