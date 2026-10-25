import { connectDb, read, closeDb } from '../../backend/src/db/graph.js';
import { admin } from '../../backend/src/queries/admin.js';

export const CHECK_LABELS = {
  selfFollow: 'Không có cạnh tự theo dõi (u -> u)',
  dupFollow: 'Không có cạnh FOLLOWS trùng lặp',
  postNoAuthor: 'Mọi bài viết đều có tác giả (POSTED)',
  postManyAuthor: 'Không có bài viết nào có nhiều hơn 1 tác giả',
  postNoTopic: 'Mọi bài viết đều gắn ít nhất 1 chủ đề (ABOUT)',
  dupLike: 'Không có tương tác LIKED trùng lặp cùng cặp',
  dupUserId: 'ID của người dùng là duy nhất',
  futureCreated: 'Thời gian tạo bài viết không vượt quá thời gian thực',
  badInterest: 'Điểm sở thích (INTERESTED_IN) nằm trong đoạn [0, 1]',
};

export async function runChecks(now = Date.now()) {
  const checkKeys = Object.keys(admin.integrity);
  const results = [];

  for (const key of checkKeys) {
    try {
      const cypher = admin.integrity[key];
      const rows = await read(cypher, { now });
      const count = Number(rows[0]?.c ?? 0);
      results.push({
        key,
        name: CHECK_LABELS[key] || key,
        count,
        ok: count === 0,
      });
    } catch (err) {
      results.push({
        key,
        name: CHECK_LABELS[key] || key,
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
      console.log(`  ${r.name.padEnd(45)}: ${status}`);
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
