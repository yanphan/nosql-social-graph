import { FalkorDB } from 'falkordb';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
dotenv.config({ path: envPath });

const host = process.env.FALKORDB_HOST ?? 'localhost';
const port = Number(process.env.FALKORDB_PORT ?? 6379);
const password = process.env.FALKORDB_PASSWORD || undefined;
const graphName = process.env.GRAPH_NAME ?? 'social';

console.log(`Connecting to FalkorDB (${host}:${port}, graph: ${graphName})...`);

const client = await FalkorDB.connect({
  socket: { host, port },
  password,
});

const graph = client.selectGraph(graphName);

const indexes = [
  'CREATE INDEX FOR (u:User) ON (u.id)',
  'CREATE INDEX FOR (u:User) ON (u.username)',
  'CREATE INDEX FOR (p:Post) ON (p.id)',
  'CREATE INDEX FOR (p:Post) ON (p.createdAt)',
  'CREATE INDEX FOR (t:Topic) ON (t.id)',
  'CREATE INDEX FOR (t:Topic) ON (t.name)',
];

console.log('--- Creating Indexes ---');
for (const cypher of indexes) {
  try {
    await graph.query(cypher);
    console.log(`[OK] ${cypher}`);
  } catch (err) {
    console.warn(`[WARN] ${cypher} -> ${err.message}`);
  }
}

// Constraints (FalkorDB syntax)
const constraints = [
  ['GRAPH.CONSTRAINT', 'CREATE', graphName, 'UNIQUE', 'NODE', 'User', 'PROPERTIES', '1', 'id'],
  ['GRAPH.CONSTRAINT', 'CREATE', graphName, 'UNIQUE', 'NODE', 'User', 'PROPERTIES', '1', 'username'],
  ['GRAPH.CONSTRAINT', 'CREATE', graphName, 'UNIQUE', 'NODE', 'Post', 'PROPERTIES', '1', 'id'],
  ['GRAPH.CONSTRAINT', 'CREATE', graphName, 'UNIQUE', 'NODE', 'Topic', 'PROPERTIES', '1', 'id'],
  ['GRAPH.CONSTRAINT', 'CREATE', graphName, 'UNIQUE', 'NODE', 'Topic', 'PROPERTIES', '1', 'name'],
];

console.log('--- Creating Constraints ---');
for (const cmd of constraints) {
  try {
    if (typeof client.sendCommand === 'function') {
      await client.sendCommand(cmd);
      console.log(`[OK] ${cmd.join(' ')}`);
    } else {
      console.log(`[SKIP] client.sendCommand not directly supported; skipping constraint: ${cmd.join(' ')}`);
    }
  } catch (err) {
    console.warn(`[WARN] ${cmd.join(' ')} -> ${err.message}`);
  }
}

await client.close();
console.log('Schema initialization finished.');
