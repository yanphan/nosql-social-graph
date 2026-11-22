import { FalkorDB } from 'falkordb';
import { env } from '../config/env.js';

let client, graph;

export async function connectDb() {
  client = await FalkorDB.connect({
    socket: { host: env.db.host, port: env.db.port },
    password: env.db.password,
  });
  try {
    const conn = await client.connection;
    await conn.sendCommand(['GRAPH.CONFIG', 'SET', 'TIMEOUT', '0']);
  } catch (_) {}
  graph = client.selectGraph(env.db.graph);
  return graph;
}

export const getClient = () => client;

export const getGraph = () => {
  if (!graph) throw new Error('DB chưa kết nối');
  return graph;
};

export async function closeDb() {
  await client?.close();
}

export async function write(cypher, params = {}) {
  const res = await getGraph().query(cypher, { params });
  return res.data ?? [];
}

export async function read(cypher, params = {}) {
  const res = await getGraph().roQuery(cypher, { params });
  return res.data ?? [];
}

// Dùng cho benchmark: trả thêm thời gian đo phía client
export async function timed(cypher, params = {}) {
  const t0 = performance.now();
  const rows = await read(cypher, params);
  return { rows, ms: performance.now() - t0 };
}
