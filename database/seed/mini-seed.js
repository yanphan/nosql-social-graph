import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { FalkorDB } from 'falkordb';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './config.js';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
dotenv.config({ path: envPath });

const host = process.env.FALKORDB_HOST ?? 'localhost';
const port = Number(process.env.FALKORDB_PORT ?? 6379);
const password = process.env.FALKORDB_PASSWORD || undefined;
const graphName = process.env.GRAPH_NAME ?? 'social';

console.log(`Connecting to FalkorDB for mini-seed (${host}:${port}, graph: ${graphName})...`);

const client = await FalkorDB.connect({ socket: { host, port }, password });
const graph = client.selectGraph(graphName);

console.log('Generating password hash...');
const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

const sampleTopics = [
  { id: 'top_ai', name: 'ai', description: 'Trí tuệ nhân tạo & Machine Learning' },
  { id: 'top_tech', name: 'technology', description: 'Công nghệ phần mềm & Khởi nghiệp' },
  { id: 'top_nosql', name: 'nosql', description: 'Cơ sở dữ liệu NoSQL & Graph DB' },
  { id: 'top_music', name: 'music', description: 'Âm nhạc và nghệ thuật' },
  { id: 'top_travel', name: 'travel', description: 'Du lịch và khám phá thế giới' },
];

console.log('Seeding Topics...');
for (const t of sampleTopics) {
  await graph.query(
    `MERGE (t:Topic {name:$name})
     ON CREATE SET t.id=$id, t.description=$description
     RETURN t`,
    { params: t }
  );
}

console.log('Seeding Demo Accounts (admin, analyst, alice)...');
const createdUsers = [];
for (const acc of DEMO_ACCOUNTS) {
  const id = `usr_${acc.username}`;
  await graph.query(
    `MERGE (u:User {username:$username})
     ON CREATE SET u.id=$id, u.fullName=$fullName, u.email=$email,
                   u.role=$role, u.status='active', u.isVerified=true,
                   u.passwordHash=$passwordHash, u.joinedAt=$now,
                   u.bio='Tài khoản thử nghiệm hệ thống', u.country='Vietnam'
     RETURN u`,
    {
      params: {
        id,
        username: acc.username,
        fullName: acc.fullName,
        email: acc.email,
        role: acc.role,
        passwordHash,
        now: Date.now() - 30 * 86400000,
      },
    }
  );
  createdUsers.push({ id, username: acc.username });
}

console.log('Seeding 17 Additional Users...');
const names = [
  ['bob', 'Bob Tran', 'user'],
  ['charlie', 'Charlie Le', 'user'],
  ['david', 'David Pham', 'user'],
  ['eva', 'Eva Hoang', 'user'],
  ['frank', 'Frank Do', 'user'],
  ['grace', 'Grace Vu', 'user'],
  ['henry', 'Henry Dinh', 'user'],
  ['ivy', 'Ivy Mai', 'user'],
  ['jack', 'Jack Bui', 'user'],
  ['karen', 'Karen Nguyen', 'user'],
  ['leo', 'Leo Dang', 'user'],
  ['mia', 'Mia Ngo', 'user'],
  ['noah', 'Noah Phan', 'user'],
  ['olivia', 'Olivia Trinh', 'user'],
  ['peter', 'Peter Luong', 'user'],
  ['quinn', 'Quinn Ha', 'user'],
  ['rose', 'Rose Vo', 'user'],
];

for (const [uname, fname, role] of names) {
  const id = `usr_${uname}`;
  await graph.query(
    `MERGE (u:User {username:$username})
     ON CREATE SET u.id=$id, u.fullName=$fullName, u.email=$email,
                   u.role=$role, u.status='active', u.isVerified=false,
                   u.passwordHash=$passwordHash, u.joinedAt=$now,
                   u.bio='Lập trình viên và người yêu công nghệ', u.country='Vietnam'
     RETURN u`,
    {
      params: {
        id,
        username: uname,
        fullName: fname,
        email: `${uname}@social.local`,
        role,
        passwordHash,
        now: Date.now() - 15 * 86400000,
      },
    }
  );
  createdUsers.push({ id, username: uname });
}

console.log('Seeding sample FOLLOWS relationships...');
// Connect alice -> bob -> charlie -> david -> eva (Chain for testing shortestPath)
const chain = ['alice', 'bob', 'charlie', 'david', 'eva'];
for (let i = 0; i < chain.length - 1; i++) {
  await graph.query(
    `MATCH (a:User {username:$a}), (b:User {username:$b})
     MERGE (a)-[r:FOLLOWS]->(b)
     ON CREATE SET r.since=$now`,
    { params: { a: chain[i], b: chain[i + 1], now: Date.now() } }
  );
}

// Add some more random follows
for (let i = 0; i < createdUsers.length; i++) {
  const u1 = createdUsers[i];
  const u2 = createdUsers[(i + 3) % createdUsers.length];
  if (u1.id !== u2.id) {
    await graph.query(
      `MATCH (a:User {id:$a}), (b:User {id:$b})
       MERGE (a)-[r:FOLLOWS]->(b)
       ON CREATE SET r.since=$now`,
      { params: { a: u1.id, b: u2.id, now: Date.now() } }
    );
  }
}

console.log('Seeding sample Posts...');
const samplePosts = [
  {
    id: nanoid(12),
    author: 'alice',
    content: 'Chào mừng mọi người đến với mạng xã hội đồ thị FalkorDB! 🚀',
    topic: 'top_nosql',
  },
  {
    id: nanoid(12),
    author: 'bob',
    content: 'Graph Database giải quyết bài toán shortestPath cực kỳ nhanh chóng so với RDBMS.',
    topic: 'top_nosql',
  },
  {
    id: nanoid(12),
    author: 'admin',
    content: 'Hệ thống đã triển khai thành công Sprint 0. Chúc các bạn làm việc hiệu quả!',
    topic: 'top_tech',
  },
  {
    id: nanoid(12),
    author: 'charlie',
    content: 'Trí tuệ nhân tạo và LLM đang thay đổi cách chúng ta viết phần mềm.',
    topic: 'top_ai',
  },
];

for (const p of samplePosts) {
  await graph.query(
    `MATCH (u:User {username:$author}), (t:Topic {id:$topicId})
     CREATE (p:Post {id:$id, content:$content, createdAt:$now, language:'vi',
                     likeCount:1, commentCount:0, shareCount:0})
     CREATE (u)-[:POSTED {at:$now}]->(p)
     CREATE (p)-[:ABOUT {weight:1.0}]->(t)`,
    {
      params: {
        id: p.id,
        author: p.author,
        topicId: p.topic,
        content: p.content,
        now: Date.now(),
      },
    }
  );
}

await client.close();
console.log('✅ Mini-seed complete! Demo accounts: admin / analyst / alice (Password: Passw0rd!)');
