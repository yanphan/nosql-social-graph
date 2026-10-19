import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { SCALES, DEMO_ACCOUNTS, DEMO_PASSWORD } from './config.js';

// Predefined realistic topics
const BASE_TOPICS = [
  'ai', 'nosql', 'react', 'nodejs', 'falkordb', 'graphdb', 'javascript', 'python',
  'devops', 'docker', 'database', 'webdev', 'frontend', 'backend', 'cloud',
  'machinelearning', 'datascience', 'cybersecurity', 'blockchain', 'mobile',
  'systemdesign', 'performance', 'open-source', 'linux', 'api', 'algorithms',
  'gaming', 'music', 'travel', 'books', 'sports', 'football', 'photography',
  'startups', 'fintech', 'uxui', 'hardware', 'kubernetes', 'microservices', 'graphql'
];

/**
 * Generate synthetic graph data according to scale
 */
export async function generateGraphData(scaleKey = 'S') {
  const cfg = SCALES[scaleKey] || SCALES.S;
  faker.seed(cfg.seed);

  console.log(`[Generate] Generating Scale ${scaleKey}: ${cfg.users} users, ${cfg.posts} posts, ${cfg.topics} topics...`);

  // 1. Hash password once for all generated users
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 86400000;
  const halfYearAgo = now - 180 * 86400000;

  // 2. Generate Topics
  const topicList = [];
  const topicNames = new Set();

  for (let i = 0; i < cfg.topics; i++) {
    let name = BASE_TOPICS[i];
    if (!name || topicNames.has(name)) {
      name = `topic_${faker.word.noun().toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      while (topicNames.has(name)) {
        name = `topic_${faker.word.noun().toLowerCase()}_${i}`;
      }
    }
    topicNames.add(name);
    topicList.push({
      id: `top_${nanoid(8)}`,
      name,
      description: faker.company.catchPhrase(),
    });
  }

  // 3. Generate Users
  const userList = [];
  const usernames = new Set();

  // Add Demo Accounts first
  for (const demo of DEMO_ACCOUNTS) {
    const id = `usr_${demo.username}`;
    usernames.add(demo.username);
    userList.push({
      id,
      username: demo.username,
      fullName: demo.fullName,
      email: demo.email,
      bio: `Tài khoản demo ${demo.role} của hệ thống`,
      country: 'Vietnam',
      joinedAt: halfYearAgo,
      isVerified: true,
      role: demo.role,
      passwordHash,
    });
  }

  // Add remaining users
  while (userList.length < cfg.users) {
    let username = faker.internet.userName().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (usernames.has(username) || username.length < 3) {
      username = `${username}_${userList.length}`;
    }
    usernames.add(username);
    const joinedAt = faker.number.int({ min: halfYearAgo, max: ninetyDaysAgo });

    userList.push({
      id: `usr_${nanoid(10)}`,
      username,
      fullName: faker.person.fullName(),
      email: faker.internet.email({ firstName: username }),
      bio: faker.person.bio(),
      country: faker.location.country(),
      joinedAt,
      isVerified: Math.random() < 0.08,
      role: 'user',
      passwordHash,
    });
  }

  // 4. Generate Follows (Preferential attachment)
  const followPairs = new Set();
  const follows = [];
  const userIds = userList.map((u) => u.id);
  const totalTargetFollows = cfg.users * cfg.avgFollow;

  // Track degrees for preferential attachment pool
  const degreePool = [];
  // Initial seed nodes
  for (let i = 0; i < Math.min(10, userIds.length); i++) {
    degreePool.push(userIds[i], userIds[i], userIds[i]);
  }

  // Ensure deterministic chain for testing shortest path: admin -> alice -> user3 -> user4 -> user5
  for (let i = 0; i < Math.min(6, userIds.length - 1); i++) {
    const s = userIds[i];
    const t = userIds[i + 1];
    followPairs.add(`${s}:${t}`);
    follows.push({ s, t, since: faker.number.int({ min: halfYearAgo, max: now }) });
    degreePool.push(s, t);
  }

  for (let i = 0; i < userIds.length; i++) {
    const s = userIds[i];
    const targetCount = faker.number.int({ min: Math.floor(cfg.avgFollow * 0.4), max: Math.floor(cfg.avgFollow * 1.6) });

    let attempts = 0;
    while (attempts < targetCount * 2 && follows.length < totalTargetFollows) {
      attempts++;
      // 70% preferential, 30% uniform random
      let t;
      if (Math.random() < 0.7 && degreePool.length > 0) {
        t = degreePool[Math.floor(Math.random() * degreePool.length)];
      } else {
        t = userIds[Math.floor(Math.random() * userIds.length)];
      }

      if (s === t) continue;
      const key = `${s}:${t}`;
      if (!followPairs.has(key)) {
        followPairs.add(key);
        follows.push({ s, t, since: faker.number.int({ min: ninetyDaysAgo, max: now }) });
        degreePool.push(t);
      }
    }
  }

  // 5. Generate Interests (2-5 topics per user)
  const interests = [];
  for (const u of userList) {
    const count = faker.number.int({ min: 2, max: 5 });
    const selectedTopics = faker.helpers.arrayElements(topicList, Math.min(count, topicList.length));
    for (const t of selectedTopics) {
      interests.push({
        userId: u.id,
        topicId: t.id,
        score: Math.round((Math.random() * 0.8 + 0.2) * 100) / 100,
      });
    }
  }

  // 6. Generate Posts (Zipf distribution for topics)
  const posts = [];
  const about = [];

  // Zipf weight helper for topics
  const topicWeights = topicList.map((_, idx) => 1 / Math.pow(idx + 1, 0.9));
  const totalWeight = topicWeights.reduce((a, b) => a + b, 0);

  function pickZipfTopic() {
    let r = Math.random() * totalWeight;
    for (let i = 0; i < topicList.length; i++) {
      r -= topicWeights[i];
      if (r <= 0) return topicList[i];
    }
    return topicList[0];
  }

  for (let i = 0; i < cfg.posts; i++) {
    const pid = `pst_${nanoid(10)}`;
    const author = userList[i % userList.length];
    const createdAt = faker.number.int({ min: ninetyDaysAgo, max: now });

    posts.push({
      id: pid,
      authorId: author.id,
      content: faker.hacker.phrase() + ' ' + faker.lorem.sentence(),
      createdAt,
      language: i % 4 === 0 ? 'en' : 'vi',
    });

    // Pick 1-3 topics
    const numTopics = faker.number.int({ min: 1, max: 3 });
    const chosen = new Set();
    for (let j = 0; j < numTopics; j++) {
      chosen.add(pickZipfTopic().id);
    }
    for (const tid of chosen) {
      about.push({ postId: pid, topicId: tid, weight: 1.0 });
    }
  }

  // 7. Generate Likes, Comments, Shares
  const likes = [];
  const comments = [];
  const shares = [];
  const likePairs = new Set();

  for (const post of posts) {
    const likeCount = faker.number.int({ min: 0, max: cfg.likesPerPost * 2 });
    const likers = faker.helpers.arrayElements(userList, Math.min(likeCount, userList.length));

    for (const liker of likers) {
      const key = `${liker.id}:${post.id}`;
      if (!likePairs.has(key)) {
        likePairs.add(key);
        likes.push({
          userId: liker.id,
          postId: post.id,
          at: faker.number.int({ min: post.createdAt, max: now }),
        });
      }
    }

    // Comments (0 to 3 per post)
    const commentCount = faker.number.int({ min: 0, max: 3 });
    for (let c = 0; c < commentCount; c++) {
      const commenter = userList[Math.floor(Math.random() * userList.length)];
      comments.push({
        userId: commenter.id,
        postId: post.id,
        at: faker.number.int({ min: post.createdAt, max: now }),
        text: faker.lorem.sentence(),
      });
    }

    // Shares (0 to 2 per post, occasionally with via)
    const shareCount = faker.number.int({ min: 0, max: 2 });
    let previousSharer = null;
    for (let s = 0; s < shareCount; s++) {
      const sharer = userList[Math.floor(Math.random() * userList.length)];
      shares.push({
        userId: sharer.id,
        postId: post.id,
        at: faker.number.int({ min: post.createdAt, max: now }),
        via: previousSharer ? previousSharer.id : null,
      });
      previousSharer = sharer;
    }
  }

  console.log(`[Generate] Generated: ${userList.length} users, ${topicList.length} topics, ${posts.length} posts, ${follows.length} follows, ${about.length} about, ${interests.length} interests, ${likes.length} likes, ${comments.length} comments, ${shares.length} shares.`);

  return {
    users: userList,
    topics: topicList,
    posts,
    follows,
    about,
    interests,
    likes,
    comments,
    shares,
  };
}
