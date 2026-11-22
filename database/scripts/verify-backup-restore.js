import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDb, closeDb } from '../../backend/src/db/graph.js';
import * as adminRepo from '../../backend/src/repositories/admin.repo.js';
import { createBackup, listBackups, restore } from '../lib/backup.js';
import { exportCsv, exportJson } from '../lib/exporter.js';
import { importCsv, importJson } from '../lib/importer.js';
import { runChecks } from '../lib/integrity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataDir = path.resolve(__dirname, '../data/test-tmp');

async function runVerification() {
  console.log('====================================================');
  console.log('Sprint 3 Verification: Data Admin, Backup & Restore');
  console.log('====================================================\n');

  await connectDb();
  fs.mkdirSync(testDataDir, { recursive: true });

  // 1. Initial State Check
  console.log('--- Step 1: Initial Database Stats ---');
  const initialStats = await adminRepo.stats();
  console.log(`Initial total nodes: ${initialStats.totalNodes}`);
  console.log(`Initial total edges: ${initialStats.totalEdges}`);
  console.log('Node breakdown:', initialStats.nodes);
  console.log('Edge breakdown:', initialStats.edges);

  // 2. Test CSV Export (Node & Relationship)
  console.log('\n--- Step 2: Testing CSV Exporter (Nodes & Relationships) ---');
  const userCsvPath = path.join(testDataDir, 'users_export.csv');
  const topicCsvPath = path.join(testDataDir, 'topics_export.csv');
  const followCsvPath = path.join(testDataDir, 'follows_export.csv');

  const expUsers = await exportCsv('User', userCsvPath);
  console.log(`Exported Users CSV: ${expUsers.rows} rows -> ${userCsvPath}`);

  const expTopics = await exportCsv('Topic', topicCsvPath);
  console.log(`Exported Topics CSV: ${expTopics.rows} rows -> ${topicCsvPath}`);

  const expFollows = await exportCsv('FOLLOWS', followCsvPath);
  console.log(`Exported Follows CSV: ${expFollows.rows} rows -> ${followCsvPath}`);

  if (!fs.existsSync(userCsvPath) || fs.statSync(userCsvPath).size === 0) {
    throw new Error('User CSV export failed or empty');
  }

  // 3. Test Full JSON Export
  console.log('\n--- Step 3: Testing Full JSON Export ---');
  const jsonExportPath = path.join(testDataDir, 'full_graph_export.json');
  const expJson = await exportJson(jsonExportPath);
  console.log(`Exported Graph JSON: ${expJson.nodes} nodes, ${expJson.edges} edges -> ${jsonExportPath}`);

  // 4. Test Logical Backup Creation & Listing
  console.log('\n--- Step 4: Testing Logical Backup Creation ---');
  const backup = await createBackup();
  console.log(`✅ Backup created: ${backup.file}`);
  console.log(`   Nodes: ${backup.nodes}, Edges: ${backup.edges}, Size: ${(backup.sizeBytes / 1024).toFixed(1)} KB`);

  console.log('\nTesting listBackups():');
  const allBackups = await listBackups();
  console.log(`Found ${allBackups.length} backups in directory:`);
  for (const b of allBackups.slice(0, 3)) {
    console.log(`  - ${b.file} (${b.nodes}n / ${b.edges}e, ${(b.sizeBytes / 1024).toFixed(1)} KB)`);
  }

  // 5. Test Full Stepper Workflow: Backup -> Truncate -> Restore -> Parity Check
  console.log('\n--- Step 5: Testing Stepper 4-step Restore & Parity Check ---');
  console.log('Executing restore from latest backup file...');
  const restoreResult = await restore(backup.file);

  console.log('\nRestore Results:');
  console.log(`  Expected Nodes : ${restoreResult.expectedNodes}`);
  console.log(`  Restored Nodes : ${restoreResult.nodes}`);
  console.log(`  Expected Edges : ${restoreResult.expectedEdges}`);
  console.log(`  Restored Edges : ${restoreResult.edges}`);
  console.log(`  100% Parity    : ${restoreResult.matchesBackup ? '✅ PASS' : '❌ FAIL'}`);

  if (!restoreResult.matchesBackup) {
    throw new Error('Parity check failed during restore!');
  }

  // 6. Run 9 Integrity Checks Post-Restore
  console.log('\n--- Step 6: Post-Restore 9 Integrity Checks ---');
  const integrity = await runChecks();
  let allPass = true;
  for (const r of integrity) {
    console.log(`  ${r.name.padEnd(45)}: ${r.ok ? '✅ PASS' : `❌ FAIL (${r.count})`}`);
    if (!r.ok) allPass = false;
  }

  // Cleanup test temp directory
  try {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  } catch (_) {}

  await closeDb();
  console.log('\n====================================================');
  console.log(allPass ? '🎉 SPRINT 3 VERIFICATION COMPLETED: 100% SUCCESS' : '⚠️ SPRINT 3 VERIFICATION HAS ISSUES');
  console.log('====================================================');
}

if (process.argv[1] && process.argv[1].endsWith('verify-backup-restore.js')) {
  runVerification().catch((err) => {
    console.error('Fatal verification error:', err);
    process.exit(1);
  });
}
