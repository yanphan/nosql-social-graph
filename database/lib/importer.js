import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { write } from '../../backend/src/db/graph.js';
import { admin } from '../../backend/src/queries/admin.js';

const BATCH_SIZE = 2000;

export async function importCsv(kind, filePath) {
  if (!admin.bulk[kind]) {
    throw new Error(`Loại dữ liệu import không hợp lệ: ${kind}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: true,
  });

  if (!records.length) {
    return { inserted: 0 };
  }

  // Nạp theo lô
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    await write(admin.bulk[kind], { rows: chunk });
  }

  // Nếu là tương tác, kích hoạt cập nhật số đếm recount
  if (['likes', 'comments', 'shares'].includes(kind)) {
    try {
      await write(admin.bulk.recountPosts);
    } catch (err) {
      console.warn('Recount posts warning:', err.message);
    }
  }

  return { inserted: records.length };
}

export async function importJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const edges = Array.isArray(data.edges) ? data.edges : [];

  // Gom nodes theo label
  const nodesByLabel = new Map();
  for (const n of nodes) {
    const label = (n.label || 'Node').toLowerCase() + 's'; // User -> users, Topic -> topics
    const kind = label === 'users' ? 'users' : label === 'topics' ? 'topics' : label === 'posts' ? 'posts' : null;
    if (kind) {
      if (!nodesByLabel.has(kind)) nodesByLabel.set(kind, []);
      nodesByLabel.get(kind).push(n.props);
    }
  }

  for (const [kind, list] of nodesByLabel) {
    if (admin.bulk[kind]) {
      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        await write(admin.bulk[kind], { rows: list.slice(i, i + BATCH_SIZE) });
      }
    }
  }

  // Gom edges theo type
  const edgesByType = new Map();
  for (const e of edges) {
    const type = (e.type || '').toLowerCase();
    const kind = type === 'follows' ? 'follows' : type === 'about' ? 'about' : type === 'liked' || type === 'likes' ? 'likes' : type === 'commented' || type === 'comments' ? 'comments' : type === 'shared' || type === 'shares' ? 'shares' : type === 'interested_in' || type === 'interests' ? 'interests' : null;
    if (kind) {
      if (!edgesByType.has(kind)) edgesByType.set(kind, []);
      edgesByType.get(kind).push({
        s: e.s,
        t: e.t,
        userId: e.s,
        postId: e.t,
        topicId: e.t,
        ...e.props,
      });
    }
  }

  for (const [kind, list] of edgesByType) {
    if (admin.bulk[kind]) {
      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        await write(admin.bulk[kind], { rows: list.slice(i, i + BATCH_SIZE) });
      }
    }
  }

  return {
    nodes: nodes.length,
    edges: edges.length,
  };
}
