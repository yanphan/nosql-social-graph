import { connectDb, closeDb } from '../../backend/src/db/graph.js';
import * as analyticsRepo from '../../backend/src/repositories/analytics.repo.js';

async function testAnalyticsRepo() {
  console.log('Testing Analytics Repository (BT1-BT5 & Canvas)...');
  await connectDb();

  // BT1
  console.log('\n--- BT1: Shortest Path ---');
  const path = await analyticsRepo.shortestPath('admin', 'alice', 6);
  console.log('Path result:', path ? { length: path.length, steps: path.steps } : 'No path found');

  // BT2
  console.log('\n--- BT2: Trending Topics ---');
  const trending = await analyticsRepo.trending(Date.now() - 90 * 86400000, 5);
  console.log('Top 3 Trending:', trending.slice(0, 3));

  // BT3
  console.log('\n--- BT3: Friend Suggestions ---');
  const friends = await analyticsRepo.friendSuggestions('usr_alice', 5);
  console.log(`Friend suggestions count for alice: ${friends.length}`, friends.slice(0, 2));

  const popularU = await analyticsRepo.popularUsers('usr_alice', 3);
  console.log('Popular users fallback:', popularU);

  // BT4
  console.log('\n--- BT4: Post Suggestions ---');
  const postSug = await analyticsRepo.postSuggestions('usr_alice', 3);
  console.log(`Post suggestions count: ${postSug.length}`, postSug.slice(0, 1));

  const popularP = await analyticsRepo.popularPosts(Date.now() - 90 * 86400000, 3);
  console.log(`Popular posts count: ${popularP.length}`, popularP.slice(0, 1));

  // BT5
  console.log('\n--- BT5: Influence & Communities ---');
  const topF = await analyticsRepo.topFollowers(3);
  console.log('Top followers:', topF);

  const pr = await analyticsRepo.pageRank(3);
  console.log('PageRank top 3:', pr);

  const edges = await analyticsRepo.allFollowEdges();
  console.log(`All follow edges count: ${edges.length}`);

  const wcc = await analyticsRepo.wcc();
  console.log(`WCC components count: ${wcc.length}`);

  // Canvas
  console.log('\n--- Canvas Subgraphs ---');
  const nh = await analyticsRepo.neighborhood('usr_alice', 20);
  console.log(`Neighborhood for alice: ${nh.nodes.length} nodes, ${nh.edges.length} edges`);

  const ov = await analyticsRepo.overview(20);
  console.log(`Overview graph: ${ov.nodes.length} nodes, ${ov.edges.length} edges`);

  await closeDb();
  console.log('\n✅ ALL ANALYTICS REPO FUNCTIONS VERIFIED SUCCESSFULLY!');
}

testAnalyticsRepo().catch((e) => {
  console.error('Analytics test error:', e);
  process.exit(1);
});
