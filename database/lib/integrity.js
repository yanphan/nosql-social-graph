import { connectDb, read, closeDb } from '../../backend/src/db/graph.js';
import { admin } from '../../backend/src/queries/admin.js';

export async function runChecks(now = Date.now()) {
  const checks = Object.entries(admin.integrity);
  const results = [];

  for (const [name, cypher] of checks) {
    try {
      const rows = await read(cypher, { now });
      const count = Number(rows[0]?.c ?? 0);
      results.push({
        name,
        count,
        ok: count === 0,
      });
    } catch (err) {
      results.push({
        name,
        count: -1,
        ok: false,
        error: err.message,
      });
    }
  }

  return results;
}

// CLI runner if executed directly
if (process.argv[1] && process.argv[1].endsWith('integrity.js')) {
  try {
    await connectDb();
    console.log('--- Running 9 Integrity Checks ---');
    const results = await runChecks();
    let allOk = true;
    for (const r of results) {
      const status = r.ok ? '✅ PASS' : `❌ FAIL (${r.count} violations)`;
      console.log(`  ${r.name.padEnd(16)}: ${status}`);
      if (!r.ok) allOk = false;
    }
    console.log('-----------------------------------');
    console.log(allOk ? 'All checks PASSED (100% Green)!' : 'Some checks FAILED.');
    await closeDb();
    process.exit(allOk ? 0 : 1);
  } catch (err) {
    console.error('Integrity check error:', err);
    process.exit(1);
  }
}
