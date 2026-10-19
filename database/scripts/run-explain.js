import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDb, getGraph, closeDb } from '../../backend/src/db/graph.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const explainDir = path.resolve(__dirname, '../../docs/explain');

const QUERIES = {
  'bt1-shortest-path': `MATCH (a:User {username:'admin'}), (b:User {username:'alice'}) WITH shortestPath((a)-[:FOLLOWS*..6]->(b)) AS p RETURN nodes(p), relationships(p), length(p)`,
  'bt2-trending': `MATCH (t:Topic)<-[:ABOUT]-(p:Post)<-[l:LIKED]-(:User) WHERE l.at >= 1700000000000 RETURN t.id AS id, t.name AS name, count(l) AS n`,
  'bt3-friend-suggestions': `MATCH (me:User {id:'usr_alice'})-[:FOLLOWS]->(f:User)-[:FOLLOWS]->(c:User) WHERE c.id <> me.id AND NOT (me)-[:FOLLOWS]->(c) AND coalesce(c.status,'active') <> 'locked' WITH me, c, count(DISTINCT f) AS mutual OPTIONAL MATCH (me)-[:INTERESTED_IN]->(t:Topic)<-[:INTERESTED_IN]-(c) WITH c, mutual, count(DISTINCT t) AS sharedTopics RETURN c.id AS id, c.username AS username, mutual, sharedTopics, mutual*2 + sharedTopics AS score ORDER BY score DESC LIMIT 10`,
  'bt4-post-suggestions': `MATCH (me:User {id:'usr_alice'})-[i:INTERESTED_IN]->(t:Topic)<-[:ABOUT]-(p:Post)<-[:POSTED]-(a:User) WHERE NOT (me)-[:LIKED]->(p) AND a.id <> 'usr_alice' OPTIONAL MATCH (me)-[:FOLLOWS]->(f:User)-[:LIKED]->(p) WITH p, a, max(i.score) AS interest, count(DISTINCT f) AS friendLikes RETURN p.id, a.username, friendLikes, interest, friendLikes*2 + interest*3 AS score ORDER BY score DESC LIMIT 10`,
  'bt5-influence': `MATCH (u:User)<-[:FOLLOWS]-(f:User) RETURN u.id AS id, u.username AS username, count(f) AS followers ORDER BY followers DESC LIMIT 10`,
};

async function generateExplainAndProfile() {
  console.log('Generating GRAPH.EXPLAIN and GRAPH.PROFILE on Scale M...');
  await connectDb();
  const graph = getGraph();

  fs.mkdirSync(explainDir, { recursive: true });

  for (const [key, cypher] of Object.entries(QUERIES)) {
    console.log(`\nProcessing ${key}...`);
    let explainText = '';
    let profileText = '';

    const formatOutput = (val) => {
      if (Array.isArray(val)) return val.join('\n');
      if (val && Array.isArray(val.data)) return val.data.join('\n');
      if (typeof val === 'string') return val;
      return JSON.stringify(val, null, 2);
    };

    try {
      const explainRes = await graph.explain(cypher);
      explainText = formatOutput(explainRes);
    } catch (err) {
      explainText = `EXPLAIN ERROR: ${err.message}`;
    }

    try {
      const profileRes = await graph.profile(cypher);
      profileText = formatOutput(profileRes);
    } catch (err) {
      profileText = `PROFILE ERROR: ${err.message}`;
    }

    const content = [
      `======================================================================`,
      `QUERY: ${key.toUpperCase()}`,
      `======================================================================`,
      `CYPHER:`,
      cypher,
      ``,
      `----------------------------------------------------------------------`,
      `GRAPH.EXPLAIN (Execution Plan):`,
      `----------------------------------------------------------------------`,
      explainText,
      ``,
      `----------------------------------------------------------------------`,
      `GRAPH.PROFILE (Execution Metrics & Profiling):`,
      `----------------------------------------------------------------------`,
      profileText,
      `======================================================================`,
      ``,
    ].join('\n');

    const filePath = path.join(explainDir, `${key}.txt`);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  -> Saved: ${filePath}`);
  }

  await closeDb();
  console.log('\nAll EXPLAIN and PROFILE logs generated successfully in docs/explain/!');
}

generateExplainAndProfile().catch((err) => {
  console.error('Explain generation failed:', err);
  process.exit(1);
});
