import { connectDb, read, getGraph, closeDb } from '../../backend/src/db/graph.js';

async function verifyFalkorDBVersionAndAlgos() {
  console.log('=== Task T2-1: Verifying FalkorDB Version & Graph Algorithms ===');
  await connectDb();
  const graph = getGraph();

  const report = {};

  // 1. Check Version & Info
  console.log('\n1. Checking FalkorDB Graph Info...');
  try {
    const info = await graph.query('GRAPH.INFO social');
    console.log('Graph info:', info.data);
    report.graphInfo = 'Supported';
  } catch (err) {
    console.log('GRAPH.INFO error:', err.message);
    report.graphInfo = err.message;
  }

  // 2. Check node/edge properties mapping
  console.log('\n2. Checking node and relationship field properties...');
  try {
    const sample = await read('MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 1');
    if (sample.length) {
      const { a, r, b } = sample[0];
      console.log('Sample node a:', {
        id: a.id,
        labels: a.labels,
        label: a.label,
        properties: a.properties ? Object.keys(a.properties) : null,
      });
      console.log('Sample edge r:', {
        id: r.id,
        relationshipType: r.relationshipType,
        relation: r.relation,
        type: r.type,
        src: r.src,
        sourceId: r.sourceId,
        dest: r.dest,
        destinationId: r.destinationId,
        properties: r.properties ? Object.keys(r.properties) : null,
      });
      report.nodeEdgeFields = {
        nodeLabels: a.labels ? 'labels' : (a.label ? 'label' : 'unknown'),
        relType: r.relationshipType ? 'relationshipType' : (r.relation ? 'relation' : 'type'),
        src: r.sourceId !== undefined ? 'sourceId' : (r.src !== undefined ? 'src' : 'unknown'),
        dest: r.destinationId !== undefined ? 'destinationId' : (r.dest !== undefined ? 'dest' : 'unknown'),
      };
    }
  } catch (err) {
    console.log('Sample query error:', err.message);
    report.nodeEdgeFields = err.message;
  }

  // 3. Check shortestPath (BT1)
  console.log('\n3. Checking shortestPath on FOLLOWS...');
  try {
    const qShortest = `
      MATCH (a:User {username:$a}), (b:User {username:$b})
      WITH shortestPath((a)-[:FOLLOWS*..6]->(b)) AS p
      RETURN nodes(p) AS ns, relationships(p) AS rs, length(p) AS len
    `;
    const resShortest = await read(qShortest, { a: 'admin', b: 'alice' });
    console.log('[OK] shortestPath works! Result:', resShortest);
    if (resShortest.length && resShortest[0].ns) {
      console.log(`Path length: ${resShortest[0].len}, steps:`, resShortest[0].ns.map(n => n.properties.username));
      report.shortestPath = 'OK (Native with WITH shortestPath)';
    } else {
      report.shortestPath = 'OK (Syntax supported, no path between admin and alice)';
    }
  } catch (err) {
    console.log('[FAIL] shortestPath with WITH error:', err.message);
    try {
      const qShortest2 = `
        MATCH (a:User {username:$a}), (b:User {username:$b})
        RETURN shortestPath((a)-[:FOLLOWS*..6]->(b)) AS p
      `;
      const resShortest2 = await read(qShortest2, { a: 'admin', b: 'alice' });
      console.log('[OK] shortestPath with direct RETURN works!', resShortest2);
      report.shortestPath = 'OK (Native with RETURN shortestPath)';
    } catch (err2) {
      console.log('[FAIL] shortestPath direct RETURN error:', err2.message);
      report.shortestPath = `FAIL: ${err.message} / ${err2.message}`;
    }
  }

  // 4. Check algo.pageRank (BT5)
  console.log('\n4. Checking algo.pageRank...');
  try {
    const resPR = await read("CALL algo.pageRank('User','FOLLOWS') YIELD node, score RETURN node, score LIMIT 3");
    console.log('[OK] algo.pageRank works!', resPR);
    report.pageRank = 'OK (Native supported)';
  } catch (err) {
    console.log('[INFO] algo.pageRank error:', err.message);
    report.pageRank = `Not available natively: ${err.message}. Need in-memory fallback!`;
  }

  // 5. Check algo.WCC (BT5)
  console.log('\n5. Checking algo.WCC...');
  try {
    const resWCC = await read("CALL algo.WCC({nodeLabels:['User'], relationshipTypes:['FOLLOWS']}) YIELD node, componentId RETURN componentId, count(node) AS c LIMIT 3");
    console.log('[OK] algo.WCC works!', resWCC);
    report.wcc = 'OK (Native supported)';
  } catch (err) {
    console.log('[INFO] algo.WCC error:', err.message);
    report.wcc = `Not available natively: ${err.message}. Need in-memory fallback!`;
  }

  // 6. Check Pattern predicate in WHERE (BT3)
  console.log('\n6. Checking pattern predicate in WHERE: NOT (me)-[:FOLLOWS]->(c)...');
  try {
    const qPattern = `
      MATCH (me:User)-[:FOLLOWS]->(f:User)-[:FOLLOWS]->(c:User)
      WHERE c.id <> me.id AND NOT (me)-[:FOLLOWS]->(c)
      RETURN me.username AS me, c.username AS suggestion LIMIT 3
    `;
    const resPattern = await read(qPattern);
    console.log('[OK] Pattern predicate in WHERE works! Rows returned:', resPattern.length);
    report.patternPredicate = 'OK (Native supported)';
  } catch (err) {
    console.log('[FAIL] Pattern predicate error:', err.message);
    report.patternPredicate = `FAIL: ${err.message}`;
  }

  // 7. Check helper functions: toLower, CONTAINS, coalesce
  console.log('\n7. Checking Cypher built-ins: toLower, CONTAINS, coalesce...');
  try {
    const resBuiltins = await read(`
      MATCH (u:User)
      WHERE toLower(u.username) CONTAINS 'a'
      RETURN coalesce(u.bio, '') AS bio, toLower(u.username) AS un LIMIT 1
    `);
    console.log('[OK] Built-ins toLower, CONTAINS, coalesce work!', resBuiltins);
    report.builtins = 'OK (Supported)';
  } catch (err) {
    console.log('[FAIL] Built-ins error:', err.message);
    report.builtins = `FAIL: ${err.message}`;
  }

  console.log('\n=======================================================');
  console.log('SUMMARY OF FALKORDB COMPATIBILITY REPORT:');
  console.log(JSON.stringify(report, null, 2));
  console.log('=======================================================');

  await closeDb();
  return report;
}

verifyFalkorDBVersionAndAlgos().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
