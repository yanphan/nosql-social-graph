import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDb, write, closeDb } from '../../backend/src/db/graph.js';
import { admin } from '../../backend/src/queries/admin.js';
import { generateGraphData } from './generate.js';
import { BATCH } from './config.js';
import { runChecks } from '../lib/integrity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');

async function batchLoad(cypher, rows, batchSize = BATCH, label = '') {
  const t0 = performance.now();
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    await write(cypher, { rows: chunk });
  }
  const ms = Math.round(performance.now() - t0);
  console.log(`  [Bulk] ${label.padEnd(12)}: ${rows.length.toString().padStart(6)} records loaded in ${ms}ms`);
  return { count: rows.length, ms };
}

export async function loadScale(scaleKey = 'S') {
  console.log(`=======================================================`);
  console.log(`Starting Data Load for Scale: ${scaleKey}`);
  console.log(`=======================================================`);
  const tStart = performance.now();

  await connectDb();

  // 1. Truncate previous graph data
  console.log('Clearing existing graph data...');
  await write(admin.deleteGraphData);

  // 2. Generate data
  const data = await generateGraphData(scaleKey);

  // 3. Mandatory bulk load order
  console.log('Loading bulk datasets in order...');
  const stats = {};

  stats.users = await batchLoad(admin.bulk.users, data.users, BATCH, 'users');
  stats.topics = await batchLoad(admin.bulk.topics, data.topics, BATCH, 'topics');
  stats.posts = await batchLoad(admin.bulk.posts, data.posts, BATCH, 'posts');
  stats.follows = await batchLoad(admin.bulk.follows, data.follows, BATCH, 'follows');
  stats.about = await batchLoad(admin.bulk.about, data.about, BATCH, 'about');
  stats.interests = await batchLoad(admin.bulk.interests, data.interests, BATCH, 'interests');
  stats.likes = await batchLoad(admin.bulk.likes, data.likes, BATCH, 'likes');
  stats.comments = await batchLoad(admin.bulk.comments, data.comments, BATCH, 'comments');
  stats.shares = await batchLoad(admin.bulk.shares, data.shares, BATCH, 'shares');

  // Recount posts
  console.log('Recounting post interaction metrics...');
  const tRecount = performance.now();
  await write(admin.bulk.recountPosts);
  stats.recount = { count: data.posts.length, ms: Math.round(performance.now() - tRecount) };

  const totalTimeMs = Math.round(performance.now() - tStart);
  console.log(`-------------------------------------------------------`);
  console.log(`Total load time: ${(totalTimeMs / 1000).toFixed(2)}s`);

  // 4. Run integrity checks
  console.log('Running 9 integrity checks...');
  const integrityResults = await runChecks();
  const allIntegrityPassed = integrityResults.every((r) => r.ok);

  for (const r of integrityResults) {
    console.log(`  ${r.name.padEnd(16)}: ${r.ok ? '✅ PASS' : `❌ FAIL (${r.count})`}`);
  }

  // 5. Save load report
  fs.mkdirSync(dataDir, { recursive: true });
  const reportPath = path.join(dataDir, `load-report-${scaleKey}.json`);
  const report = {
    scale: scaleKey,
    timestamp: new Date().toISOString(),
    totalTimeMs,
    stats,
    integrity: integrityResults,
    allIntegrityPassed,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Saved load report: ${reportPath}`);
  console.log(`=======================================================`);

  await closeDb();
  return report;
}

// CLI runner
const scaleArg = (process.argv[2] || 'S').toUpperCase();
loadScale(scaleArg)
  .then((report) => {
    if (!report.allIntegrityPassed) {
      console.error('Data load completed with integrity check violations!');
      process.exit(1);
    }
    console.log('✅ Load scale completed successfully with 100% integrity pass.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal load error:', err);
    process.exit(1);
  });
