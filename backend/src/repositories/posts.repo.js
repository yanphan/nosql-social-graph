import { read, write } from '../db/graph.js';
import { posts, interactions } from '../queries/posts.js';

const toProps = (p) => (p?.properties ? p.properties : p);

const formatPostRow = (r) => {
  const p = toProps(r.p);
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
      id: r.authorId,
      username: r.authorUsername,
      fullName: r.authorFullName ?? '',
    },
    topics: Array.isArray(r.topics) ? r.topics : [],
    likedByMe: Boolean(r.likedByMe),
    sharedByMe: Boolean(r.sharedByMe),
  };
};

export async function create({ pid, uid, content, language = 'vi', topicIds = [] }) {
  await write(posts.create, {
    pid,
    uid,
    content,
    language,
    topicIds,
    now: Date.now(),
  });
  return findById(pid, uid);
}

export async function list({ me = null, authorId = null, topic = null, since = 0, skip = 0, limit = 20 } = {}) {
  let rows;
  if (topic) {
    rows = await read(posts.listByTopic, {
      me: me || null,
      topic,
      since: since || 0,
      skip,
      limit,
    });
  } else {
    rows = await read(posts.list, {
      me: me || null,
      authorId: authorId || null,
      since: since || 0,
      skip,
      limit,
    });
  }
  return rows.map(formatPostRow).filter(Boolean);
}

export async function sharedBy({ uid, me = null, skip = 0, limit = 20 }) {
  const rows = await read(posts.sharedBy, { uid, me: me || null, skip, limit });
  return rows.map((r) => ({ post: formatPostRow(r), sharedAt: Number(r.sharedAt ?? 0) })).filter((x) => x.post);
}

export async function findById(id, me = null) {
  const rows = await read(posts.findById, { id });
  if (!rows.length) return null;
  const r = rows[0];
  const post = formatPostRow(r);
  if (post && me) {
    const [st] = await read(interactions.myState, { uid: me, pid: id });
    post.likedByMe = Number(st?.liked ?? 0) > 0;
    post.sharedByMe = Number(st?.shared ?? 0) > 0;
  }
  return post;
}

export async function update(id, content) {
  const rows = await write(posts.update, { id, content });
  return toProps(rows[0]?.p);
}

export async function replaceTopics(id, topicIds = []) {
  await write(posts.clearTopics, { id });
  if (topicIds.length > 0) {
    await write(posts.attachTopics, { id, topicIds });
  }
  return true;
}

export async function remove(id) {
  await write(posts.remove, { id });
  return true;
}

export async function adminList({ q = '', topic = '', skip = 0, limit = 20 } = {}) {
  const params = { q: q.toLowerCase(), topic, skip, limit };
  const [rows, countRows] = await Promise.all([read(posts.adminList, params), read(posts.adminCount, params)]);
  return {
    items: rows.map(formatPostRow).filter(Boolean),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function search(q, limit = 10) {
  const rows = await read(posts.search, { q, limit });
  return rows.map((r) => {
    const p = toProps(r.p);
    return {
      ...p,
      authorUsername: r.authorUsername,
    };
  });
}
