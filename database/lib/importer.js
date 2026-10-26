import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../../backend/node_modules/csv-parse/dist/esm/sync.js';
import { write, connectDb, closeDb, getGraph } from '../../backend/src/db/graph.js';
import { admin } from '../../backend/src/queries/admin.js';

const BATCH_SIZE = 2000;

async function ensureDb() {
  try {
    getGraph();
  } catch (_) {
    await connectDb();
  }
}

async function batchLoad(cypher, rows, batchSize = BATCH_SIZE) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    await write(cypher, { rows: chunk });
  }
}

/**
 * Import a CSV file into FalkorDB
 * @param {string} kind - Node label or relationship type
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<{ inserted: number, kind: string, ms: number }>}
 */
export async function importCsv(kind, filePath) {
  await ensureDb();
  const t0 = performance.now();

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File CSV không tồn tại: ${resolvedPath}`);
  }

  const normalizedKind = (kind || '').toLowerCase().trim();
  const kindMapping = {
    users: 'users', user: 'users',
    topics: 'topics', topic: 'topics',
    posts: 'posts', post: 'posts',
    follows: 'follows', follow: 'follows',
    about: 'about',
    interests: 'interests', interest: 'interests', interested_in: 'interests',
    likes: 'likes', like: 'likes', liked: 'likes',
    comments: 'comments', comment: 'comments', commented: 'comments',
    shares: 'shares', share: 'shares', shared: 'shares',
  };

  const targetKind = kindMapping[normalizedKind];
  if (!targetKind || !admin.bulk[targetKind]) {
    throw new Error(`Loại dữ liệu import không hợp lệ: ${kind}. Hỗ trợ: users, topics, posts, follows, about, interests, likes, comments, shares.`);
  }

  const fileContent = fs.readFileSync(resolvedPath, 'utf8');
  const rawRows = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: false,
  });

  if (!rawRows.length) {
    return { inserted: 0, kind: targetKind, ms: 0 };
  }

  let mappedRows = [];
  switch (targetKind) {
    case 'users':
      mappedRows = rawRows.map((r) => ({
        id: r.id,
        username: r.username,
        fullName: r.fullName || r.fullname || r.username,
        email: r.email || `${r.username}@social.local`,
        bio: r.bio || '',
        country: r.country || '',
        joinedAt: r.joinedAt ? Number(r.joinedAt) : Date.now(),
        isVerified: r.isVerified === 'true' || r.isVerified === true,
        role: r.role || 'user',
        passwordHash: r.passwordHash || '$2a$10$DEMO_PASSWORD_HASH',
      }));
      break;

    case 'topics':
      mappedRows = rawRows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
      }));
      break;

    case 'posts':
      mappedRows = rawRows.map((r) => ({
        id: r.id,
        authorId: r.authorId || r.author,
        content: r.content,
        createdAt: r.createdAt ? Number(r.createdAt) : Date.now(),
        language: r.language || 'vi',
      }));
      break;

    case 'follows':
      mappedRows = rawRows.map((r) => ({
        s: r.s || r.source || r.followerId,
        t: r.t || r.target || r.followeeId,
        since: r.since ? Number(r.since) : Date.now(),
      }));
      break;

    case 'about':
      mappedRows = rawRows.map((r) => ({
        postId: r.postId || r.s || r.source,
        topicId: r.topicId || r.t || r.target,
        weight: r.weight ? Number(r.weight) : 1.0,
      }));
      break;

    case 'interests':
      mappedRows = rawRows.map((r) => ({
        userId: r.userId || r.s || r.source,
        topicId: r.topicId || r.t || r.target,
        score: r.score ? Number(r.score) : 0.5,
      }));
      break;

    case 'likes':
      mappedRows = rawRows.map((r) => ({
        userId: r.userId || r.s || r.source,
        postId: r.postId || r.t || r.target,
        at: r.at ? Number(r.at) : Date.now(),
      }));
      break;

    case 'comments':
      mappedRows = rawRows.map((r) => ({
        userId: r.userId || r.s || r.source,
        postId: r.postId || r.t || r.target,
        at: r.at ? Number(r.at) : Date.now(),
        text: r.text || '',
      }));
      break;

    case 'shares':
      mappedRows = rawRows.map((r) => ({
        userId: r.userId || r.s || r.source,
        postId: r.postId || r.t || r.target,
        at: r.at ? Number(r.at) : Date.now(),
        via: r.via || null,
      }));
      break;
  }

  await batchLoad(admin.bulk[targetKind], mappedRows);

  if (['likes', 'comments', 'shares'].includes(targetKind)) {
    try {
      await write(admin.bulk.recountPosts);
    } catch (err) {
      console.warn('Recount posts warning:', err.message);
    }
  }

  const ms = Math.round(performance.now() - t0);
  return { inserted: mappedRows.length, kind: targetKind, ms };
}

/**
 * Import full graph JSON { nodes: [...], edges: [...] }
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<{ nodes: number, edges: number, ms: number }>}
 */
export async function importJson(filePath) {
  await ensureDb();
  const t0 = performance.now();

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File JSON không tồn tại: ${resolvedPath}`);
  }

  const fileContent = fs.readFileSync(resolvedPath, 'utf8');
  const data = JSON.parse(fileContent);

  const nodes = Array.isArray(data.nodes) ? data.nodes : (data.data?.nodes || []);
  const edges = Array.isArray(data.edges) ? data.edges : (data.data?.edges || []);

  // 1. Gom nodes theo label và nạp theo thứ tự: Topic -> User -> Post
  const nodesByLabel = new Map();
  for (const n of nodes) {
    const rawLabel = n.label || 'Node';
    const labelKey = rawLabel.toLowerCase().endsWith('s') ? rawLabel.toLowerCase() : rawLabel.toLowerCase() + 's';
    const kind = labelKey === 'users' ? 'users' : labelKey === 'topics' ? 'topics' : labelKey === 'posts' ? 'posts' : null;
    if (kind) {
      if (!nodesByLabel.has(kind)) nodesByLabel.set(kind, []);
      nodesByLabel.get(kind).push(n.props || n);
    }
  }

  const preferredNodeOrder = ['topics', 'users', 'posts'];
  for (const kind of preferredNodeOrder) {
    const list = nodesByLabel.get(kind);
    if (list && list.length && admin.bulk[kind]) {
      await batchLoad(admin.bulk[kind], list);
    }
  }

  // 2. Gom edges theo type và nạp theo thứ tự
  const edgesByType = new Map();
  for (const e of edges) {
    const rawType = (e.type || '').toLowerCase();
    const kind = rawType === 'follows' ? 'follows'
      : rawType === 'about' ? 'about'
      : rawType === 'interested_in' || rawType === 'interests' ? 'interests'
      : rawType === 'liked' || rawType === 'likes' ? 'likes'
      : rawType === 'commented' || rawType === 'comments' ? 'comments'
      : rawType === 'shared' || rawType === 'shares' ? 'shares'
      : null;

    if (kind) {
      if (!edgesByType.has(kind)) edgesByType.set(kind, []);
      edgesByType.get(kind).push({
        s: e.s || e.source,
        t: e.t || e.target,
        userId: e.userId || e.s || e.source,
        postId: e.postId || e.t || e.target || e.s || e.source,
        topicId: e.topicId || e.t || e.target,
        weight: e.props?.weight ?? e.weight ?? 1.0,
        score: e.props?.score ?? e.score ?? 0.5,
        since: e.props?.since ?? e.since ?? Date.now(),
        at: e.props?.at ?? e.at ?? Date.now(),
        text: e.props?.text ?? e.text ?? '',
        via: e.props?.via ?? e.via ?? null,
        ...(e.props || {}),
      });
    }
  }

  const preferredEdgeOrder = ['follows', 'about', 'interests', 'likes', 'comments', 'shares'];
  for (const kind of preferredEdgeOrder) {
    const list = edgesByType.get(kind);
    if (list && list.length && admin.bulk[kind]) {
      await batchLoad(admin.bulk[kind], list);
    }
  }

  try {
    await write(admin.bulk.recountPosts);
  } catch (_) {}

  const ms = Math.round(performance.now() - t0);
  return {
    nodes: nodes.length,
    edges: edges.length,
    ms,
  };
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('importer.js')) {
  const [,, mode, arg1, arg2] = process.argv;
  (async () => {
    try {
      await connectDb();
      if (mode === 'csv' && arg1 && arg2) {
        console.log(`Importing CSV: kind="${arg1}", file="${arg2}"...`);
        const res = await importCsv(arg1, arg2);
        console.log(`✅ Success: Imported ${res.inserted} ${res.kind} records in ${res.ms}ms.`);
      } else if (mode === 'json' && arg1) {
        console.log(`Importing JSON: file="${arg1}"...`);
        const res = await importJson(arg1);
        console.log(`✅ Success: Imported ${res.nodes} nodes and ${res.edges} edges in ${res.ms}ms.`);
      } else {
        console.log('Usage:');
        console.log('  node database/lib/importer.js csv <kind> <filePath>');
        console.log('  node database/lib/importer.js json <filePath>');
      }
      await closeDb();
    } catch (err) {
      console.error('Import error:', err);
      process.exit(1);
    }
  })();
}
