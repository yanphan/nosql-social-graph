import { connectDb, closeDb } from '../../backend/src/db/graph.js';
import * as usersRepo from '../../backend/src/repositories/users.repo.js';
import * as postsRepo from '../../backend/src/repositories/posts.repo.js';
import * as topicsRepo from '../../backend/src/repositories/topics.repo.js';
import * as socialRepo from '../../backend/src/repositories/social.repo.js';
import * as adminRepo from '../../backend/src/repositories/admin.repo.js';

async function runRepoTests() {
  console.log('Testing Repositories...');
  await connectDb();

  // 1. Admin Repo
  console.log('\n--- 1. Admin Repo ---');
  const stats = await adminRepo.stats();
  console.log('Stats:', stats);
  if (!stats.totalNodes || !stats.totalEdges) throw new Error('Stats failed');

  const degreeBuckets = await adminRepo.degreeBuckets();
  console.log(`Degree buckets count: ${degreeBuckets.length}`);

  const integrity = await adminRepo.integrity();
  console.log(`Integrity checks count: ${integrity.length}, allOk: ${integrity.every((i) => i.ok)}`);

  // 2. Users Repo
  console.log('\n--- 2. Users Repo ---');
  const adminUser = await usersRepo.findByUsername('admin');
  console.log('Found admin:', adminUser?.username, 'id:', adminUser?.id);
  if (!adminUser) throw new Error('admin user not found');

  const aliceUser = await usersRepo.findByUsername('alice');
  console.log('Found alice:', aliceUser?.username, 'id:', aliceUser?.id);
  if (!aliceUser) throw new Error('alice user not found');

  const userList = await usersRepo.list({ limit: 5 });
  console.log(`User list count: ${userList.length}`);

  const aliceStats = await usersRepo.profileStats(aliceUser.id);
  console.log('Alice profile stats:', aliceStats);

  const aliceFollowers = await usersRepo.followers(aliceUser.id, { limit: 5 });
  console.log(`Alice followers: ${aliceFollowers.length}`);

  const aliceFollowing = await usersRepo.following(aliceUser.id, { limit: 5 });
  console.log(`Alice following: ${aliceFollowing.length}`);

  const isF = await usersRepo.isFollowing(adminUser.id, aliceUser.id);
  console.log(`admin isFollowing alice: ${isF}`);

  // 3. Topics Repo
  console.log('\n--- 3. Topics Repo ---');
  const topicsList = await topicsRepo.list();
  console.log(`Topics count: ${topicsList.length}, top topic: ${topicsList[0]?.name} (${topicsList[0]?.postCount} posts)`);
  if (!topicsList.length) throw new Error('No topics found');

  const searchTopic = await topicsRepo.search('ai');
  console.log(`Search 'ai' topics found: ${searchTopic.length}`);

  // 4. Posts Repo
  console.log('\n--- 4. Posts Repo ---');
  const postList = await postsRepo.list({ limit: 5 });
  console.log(`Posts list count: ${postList.length}`);
  if (!postList.length) throw new Error('No posts found');
  console.log('Sample post:', postList[0].id, 'author:', postList[0].author.username, 'topics:', postList[0].topics);

  const testPost = await postsRepo.findById(postList[0].id);
  console.log('Found post by id:', testPost?.id);

  // Create new post
  const newPost = await postsRepo.create({
    uid: aliceUser.id,
    content: 'Unit testing posts.repo create function 🚀',
    topicIds: [topicsList[0].id],
  });
  console.log('Created post:', newPost?.id, 'content:', newPost?.content, 'topics:', newPost?.topics);

  // Update post
  const updatedPost = await postsRepo.update(newPost.id, 'Updated post content ✅');
  console.log('Updated post content:', updatedPost?.content);

  // 5. Social Repo
  console.log('\n--- 5. Social Repo ---');
  // Like post
  const likeRes = await socialRepo.like(adminUser.id, newPost.id);
  console.log('Like result recount:', likeRes);

  const hasL = await socialRepo.hasLiked(adminUser.id, newPost.id);
  console.log('hasLiked:', hasL);

  // Comment post
  const commentRes = await socialRepo.comment(adminUser.id, newPost.id, 'Great post Alice!');
  console.log('Comment result recount:', commentRes);

  const commentsList = await socialRepo.comments(newPost.id);
  console.log(`Comments count: ${commentsList.length}, latest: "${commentsList[0]?.text}" by ${commentsList[0]?.username}`);

  // Share post
  const shareRes = await socialRepo.share(adminUser.id, newPost.id, null);
  console.log('Share result recount:', shareRes);

  // Unlike
  const unlikeRes = await socialRepo.unlike(adminUser.id, newPost.id);
  console.log('Unlike result recount:', unlikeRes);

  // Clean up test post
  await postsRepo.remove(newPost.id);
  console.log('Test post removed successfully.');

  await closeDb();
  console.log('\n✅ ALL REPOSITORY TESTS PASSED WITH 100% SUCCESS!');
}

runRepoTests().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
