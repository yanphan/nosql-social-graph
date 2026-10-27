import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { SEED_CONFIG, SCALES, DEMO_ACCOUNTS, DEMO_PASSWORD } from './config.js';

// Predefined realistic topics
const BASE_TOPICS = [
  'ai', 'nosql', 'react', 'nodejs', 'falkordb', 'graphdb', 'javascript', 'python',
  'devops', 'docker', 'database', 'webdev', 'frontend', 'backend', 'cloud',
  'machinelearning', 'datascience', 'cybersecurity', 'blockchain', 'mobile',
  'systemdesign', 'performance', 'open-source', 'linux', 'api', 'algorithms',
  'gaming', 'music', 'travel', 'books', 'sports', 'football', 'photography',
  'startups', 'fintech', 'uxui', 'hardware', 'kubernetes', 'microservices', 'graphql'
];

// Rich demo posts for demo accounts
const ALICE_DEMO_POSTS = [
  { content: 'Khám phá sức mạnh của Graph Database với FalkorDB và GraphBLAS! Tốc độ truy vấn ma trận đồ thị hàng triệu node thực sự ấn tượng. 🚀', topics: ['falkordb', 'graphdb', 'nosql'] },
  { content: 'Vừa hoàn thiện xong thuật toán gợi ý Friend-of-Friends và Collaborative Filtering cho mạng xã hội. Trải nghiệm đề xuất cá nhân hóa rất chính xác!', topics: ['algorithms', 'nosql', 'ai'] },
  { content: 'React 19 Server Components kết hợp với Graph API giúp tối ưu thời gian tải trang và giảm tải cho backend đáng kể.', topics: ['react', 'frontend', 'javascript'] },
  { content: 'Chia sẻ một số kinh nghiệm thiết kế Schema cho NoSQL Graph Database: Khi nào nên dùng Edge Property thay vì tách Node riêng?', topics: ['database', 'nosql', 'systemdesign'] },
  { content: 'Deep dive vào Cypher Query Language: Tối ưu index và cấu trúc MATCH...WHERE để truy vấn dưới 10ms.', topics: ['database', 'performance', 'graphdb'] },
  { content: 'Hệ thống gợi ý bài viết dựa trên sở thích cá nhân (INTERESTED_IN) và mối quan hệ người theo dõi hoạt động rất mượt mà!', topics: ['ai', 'machinelearning', 'webdev'] },
  { content: 'Building scalable microservices with Node.js and Docker. Clean architecture makes testing and deployment so enjoyable.', topics: ['nodejs', 'docker', 'microservices'] },
  { content: 'Cuối tuần đọc sách "Designing Data-Intensive Applications" của Martin Kleppmann. Rất nhiều kiến thức sâu về phân tán và đồng thuận dữ liệu.', topics: ['books', 'systemdesign', 'database'] },
  { content: 'Open-source contribution: Vừa merge PR cải thiện performance cho bộ chuyển đổi Cypher query builder.', topics: ['open-source', 'python', 'javascript'] },
  { content: 'Tối ưu hóa UI/UX cho ứng dụng mạng xã hội đồ thị: Trực quan hóa đường đi ngắn nhất (Shortest Path) giữa 2 người dùng.', topics: ['uxui', 'frontend', 'react'] },
  { content: 'Tại sao mô hình đồ thị Property Graph lại vượt trội hơn bảng quan hệ truyền thống trong bài toán phân tích mạng xã hội?', topics: ['nosql', 'graphdb', 'datascience'] },
  { content: 'Học cách sử dụng Redis & FalkorDB để lưu cache và tăng tốc độ đọc dữ liệu biểu đồ mạng lưới.', topics: ['falkordb', 'devops', 'backend'] },
];

const ADMIN_DEMO_POSTS = [
  { content: 'Chào mừng tất cả thành viên đến với mạng xã hội NoSQL Social Graph! Nền tảng phân tích và kết nối tri thức đồ thị.', topics: ['startups', 'webdev'] },
  { content: 'Thông báo: Hệ thống vừa hoàn tất nâng cấp cơ sở dữ liệu đồ thị lên 10.000 người dùng và gần 400.000 liên kết!', topics: ['systemdesign', 'performance'] },
  { content: 'Chính sách cộng đồng mới: Đảm bảo môi trường trao đổi học thuật, công nghệ và dữ liệu văn minh, bổ ích.', topics: ['devops', 'cybersecurity'] },
];

const ANALYST_DEMO_POSTS = [
  { content: 'Báo cáo phân tích mạng lưới: Mật độ phân cụm (Clustering Coefficient) và hệ số liên kết người dùng đang tăng trưởng ổn định.', topics: ['datascience', 'algorithms'] },
  { content: 'Thống kê Top 5 chủ đề công nghệ được quan tâm nhất tháng: #ai, #nosql, #react, #falkordb, #machinelearning.', topics: ['datascience', 'ai'] },
  { content: 'Đánh giá hiệu năng: 99.8% các truy vấn phân tích đồ thị phức tạp 3-hops hoàn thành trong dưới 25ms.', topics: ['performance', 'database'] },
];

const VI_SAMPLE_COMMENTS = [
  'Bài viết rất hữu ích và trực quan, cảm ơn bạn đã chia sẻ!',
  'Kiến trúc GraphBLAS chạy cực kỳ nhanh và mượt mà.',
  'Thuật toán gợi ý hoạt động rất chuẩn xác!',
  'Rất đồng quan điểm với tác giả, phân tích rất sâu sắc.',
  'Ý tưởng tuyệt vời, mình cũng đang áp dụng mô hình này.',
  'Cảm ơn chia sẻ chất lượng từ bạn nhé!',
  'Hóng thêm bài viết tiếp theo về chủ đề này.',
  'Thực sự ấn tượng với tốc độ truy vấn của hệ thống!',
];

/**
 * Generate synthetic graph data adhering strictly to formula ratios:
 * - Users: 10,000
 * - Follows: users * 15 = 150,000
 * - Posts: 30,000
 * - About: posts * 2 = 60,000
 * - Likes: posts * 3 = 90,000
 * - Comments: Likes * 0.25 = 22,500
 * - Shares: Likes * 0.10 = 9,000
 * - Interested_in: users * 2.5 = 25,000
 */
export async function generateGraphData(scaleKey = 'DEFAULT') {
  const cfg = (typeof scaleKey === 'object' ? scaleKey : SCALES[scaleKey]) || SEED_CONFIG;
  faker.seed(cfg.seed);

  console.log(`[Generate] Generating Graph Data: ${cfg.users} users, ${cfg.posts} posts, ${cfg.topics} topics...`);

  // 1. Hash password once for all generated users
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 86400000;
  const halfYearAgo = now - 180 * 86400000;

  // 2. Generate Topics
  const topicList = [];
  const topicNames = new Set();
  const topicByName = new Map();

  for (let i = 0; i < cfg.topics; i++) {
    let name = BASE_TOPICS[i];
    if (!name || topicNames.has(name)) {
      name = `topic_${faker.word.noun().toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      while (topicNames.has(name)) {
        name = `topic_${faker.word.noun().toLowerCase()}_${i}`;
      }
    }
    topicNames.add(name);
    const topObj = {
      id: `top_${nanoid(8)}`,
      name,
      description: faker.company.catchPhrase(),
    };
    topicList.push(topObj);
    topicByName.set(name, topObj);
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
      bio: demo.username === 'alice'
        ? 'Software Engineer & Graph Enthusiast | Đam mê NoSQL, React & AI'
        : `Tài khoản demo ${demo.role} của hệ thống`,
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

  const userIds = userList.map((u) => u.id);
  const totalUsers = userList.length;

  // 4. Generate Follows (Formula: users * 15 = exactly 150,000)
  const targetFollows = totalUsers * cfg.avgFollow;
  const followPairs = new Set();
  const follows = [];
  const degreePool = [];

  // Seed degree pool with initial nodes (demo accounts have high degree for rich demo connectivity)
  for (let i = 0; i < 3; i++) {
    for (let k = 0; k < 20; k++) degreePool.push(userIds[i]);
  }
  for (let i = 3; i < Math.min(20, userIds.length); i++) {
    degreePool.push(userIds[i], userIds[i]);
  }

  // Ensure deterministic chain for testing shortest path: admin -> alice -> user3 -> user4 -> user5
  for (let i = 0; i < Math.min(6, userIds.length - 1); i++) {
    const s = userIds[i];
    const t = userIds[i + 1];
    followPairs.add(`${s}:${t}`);
    follows.push({ s, t, since: faker.number.int({ min: halfYearAgo, max: now }) });
    degreePool.push(s, t);
  }

  // Enrich demo accounts: Alice follows ~35 users, and gets followed by ~220 users
  const aliceId = 'usr_alice';
  const adminId = 'usr_admin';
  const analystId = 'usr_analyst';

  // Alice following sample active users
  for (let i = 3; i < 38; i++) {
    const t = userIds[i];
    const key = `${aliceId}:${t}`;
    if (!followPairs.has(key)) {
      followPairs.add(key);
      follows.push({ s: aliceId, t, since: faker.number.int({ min: ninetyDaysAgo, max: now }) });
      degreePool.push(t);
    }
  }

  // Many random users follow Alice, Admin, Analyst
  for (let i = 10; i < 230; i++) {
    const s = userIds[i];
    const keyAlice = `${s}:${aliceId}`;
    if (!followPairs.has(keyAlice) && s !== aliceId) {
      followPairs.add(keyAlice);
      follows.push({ s, t: aliceId, since: faker.number.int({ min: ninetyDaysAgo, max: now }) });
      degreePool.push(aliceId);
    }
  }
  for (let i = 50; i < 350; i++) {
    const s = userIds[i];
    const keyAdmin = `${s}:${adminId}`;
    if (!followPairs.has(keyAdmin) && s !== adminId) {
      followPairs.add(keyAdmin);
      follows.push({ s, t: adminId, since: faker.number.int({ min: ninetyDaysAgo, max: now }) });
      degreePool.push(adminId);
    }
  }
  for (let i = 100; i < 250; i++) {
    const s = userIds[i];
    const keyAnalyst = `${s}:${analystId}`;
    if (!followPairs.has(keyAnalyst) && s !== analystId) {
      followPairs.add(keyAnalyst);
      follows.push({ s, t: analystId, since: faker.number.int({ min: ninetyDaysAgo, max: now }) });
      degreePool.push(analystId);
    }
  }

  // Populate remaining follows to reach exactly targetFollows
  let userIdx = 0;
  while (follows.length < targetFollows) {
    const s = userIds[userIdx % totalUsers];
    userIdx++;

    // 70% preferential attachment, 30% uniform random
    let t;
    if (Math.random() < 0.7 && degreePool.length > 0) {
      t = degreePool[Math.floor(Math.random() * degreePool.length)];
    } else {
      t = userIds[Math.floor(Math.random() * totalUsers)];
    }

    if (s === t) continue;
    const key = `${s}:${t}`;
    if (!followPairs.has(key)) {
      followPairs.add(key);
      follows.push({ s, t, since: faker.number.int({ min: ninetyDaysAgo, max: now }) });
      degreePool.push(t);
    }
  }

  // 5. Generate Interests (Formula: users * 2.5 = exactly 25,000)
  // Half of users get 2 topics, half get 3 topics -> 5000*2 + 5000*3 = 25,000
  const interests = [];
  const aliceFavNames = ['nosql', 'react', 'ai', 'falkordb', 'nodejs'];
  const halfUsers = Math.floor(totalUsers / 2);

  for (let i = 0; i < userList.length; i++) {
    const u = userList[i];
    // Keep exact 25,000 interests: 5,000 users have 2 topics, 5,000 users have 3 topics
    // Give Alice (i=2) 3 topics, and balance by giving index (halfUsers - 1) 2 topics
    const topicCount = i < halfUsers ? 2 : 3;

    if (u.id === aliceId) {
      // Custom rich interests for Alice (3 topics)
      const selected = aliceFavNames
        .map((name) => topicByName.get(name))
        .filter(Boolean)
        .slice(0, 3);
      for (const t of selected) {
        interests.push({
          userId: u.id,
          topicId: t.id,
          score: Math.round((0.85 + Math.random() * 0.13) * 100) / 100,
        });
      }
    } else {
      // If user at index (halfUsers - 1), give 1 topic instead of 2 to balance Alice's 3 topics
      const actualCount = i === halfUsers - 1 ? 1 : topicCount;
      const selectedTopics = faker.helpers.arrayElements(topicList, Math.min(actualCount, topicList.length));
      for (const t of selectedTopics) {
        interests.push({
          userId: u.id,
          topicId: t.id,
          score: Math.round((Math.random() * 0.75 + 0.25) * 100) / 100,
        });
      }
    }
  }

  // 6. Generate Posts & About (Formula: posts = 30,000; about = posts * 2 = exactly 60,000)
  const posts = [];
  const about = [];

  // Zipf weight helper for topics distribution
  const topicWeights = topicList.map((_, idx) => 1 / Math.pow(idx + 1, 0.85));
  const totalWeight = topicWeights.reduce((a, b) => a + b, 0);

  function pickZipfTopic() {
    let r = Math.random() * totalWeight;
    for (let i = 0; i < topicList.length; i++) {
      r -= topicWeights[i];
      if (r <= 0) return topicList[i];
    }
    return topicList[0];
  }

  // Add Demo Posts first
  const addCuratedPosts = (authorId, postTemplates) => {
    for (const item of postTemplates) {
      const pid = `pst_${nanoid(10)}`;
      const createdAt = faker.number.int({ min: ninetyDaysAgo, max: now });
      posts.push({
        id: pid,
        authorId,
        content: item.content,
        createdAt,
        language: 'vi',
      });
      // Exactly 2 topics per post to guarantee posts * 2 = 60,000
      const chosenTopics = [];
      for (const name of item.topics) {
        const top = topicByName.get(name);
        if (top && !chosenTopics.some((ct) => ct.id === top.id)) {
          chosenTopics.push(top);
        }
        if (chosenTopics.length === 2) break;
      }
      while (chosenTopics.length < 2) {
        const candidate = pickZipfTopic();
        if (!chosenTopics.some((ct) => ct.id === candidate.id)) {
          chosenTopics.push(candidate);
        }
      }
      for (const top of chosenTopics) {
        about.push({ postId: pid, topicId: top.id, weight: 1.0 });
      }
    }
  };

  addCuratedPosts(aliceId, ALICE_DEMO_POSTS);
  addCuratedPosts(adminId, ADMIN_DEMO_POSTS);
  addCuratedPosts(analystId, ANALYST_DEMO_POSTS);

  // Generate remaining posts up to cfg.posts (30,000)
  const remainingPostsCount = cfg.posts - posts.length;
  for (let i = 0; i < remainingPostsCount; i++) {
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

    // Exactly 2 distinct topics per post -> 30,000 * 2 = 60,000 about edges
    const t1 = pickZipfTopic();
    let t2 = pickZipfTopic();
    while (t2.id === t1.id && topicList.length > 1) {
      t2 = topicList[Math.floor(Math.random() * topicList.length)];
    }

    about.push({ postId: pid, topicId: t1.id, weight: 1.0 });
    about.push({ postId: pid, topicId: t2.id, weight: 1.0 });
  }

  // 7. Generate Likes (Formula: posts * 3 = exactly 90,000)
  const targetLikes = cfg.posts * 3;
  const likes = [];
  const likePairs = new Set();

  // Give Alice & Admin posts generous likes for great demo metrics (25-45 likes each)
  const demoPostIds = posts.slice(0, ALICE_DEMO_POSTS.length + ADMIN_DEMO_POSTS.length + ANALYST_DEMO_POSTS.length).map((p) => p.id);
  for (const demoPid of demoPostIds) {
    const postObj = posts.find((p) => p.id === demoPid);
    const likers = faker.helpers.arrayElements(userList.slice(3), 35);
    for (const liker of likers) {
      const key = `${liker.id}:${demoPid}`;
      if (!likePairs.has(key)) {
        likePairs.add(key);
        likes.push({
          userId: liker.id,
          postId: demoPid,
          at: faker.number.int({ min: postObj.createdAt, max: now }),
        });
      }
    }
  }

  // Fill remaining likes uniformly / preferential across all posts until exactly targetLikes
  let postIdx = 0;
  while (likes.length < targetLikes) {
    const post = posts[postIdx % posts.length];
    postIdx++;
    const liker = userList[Math.floor(Math.random() * totalUsers)];
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

  // 8. Generate Comments (Formula: LIKED * 0.25 = exactly 22,500)
  const targetComments = Math.floor(targetLikes * 0.25);
  const comments = [];

  // Add thoughtful Vietnamese comments to demo posts
  for (const demoPid of demoPostIds) {
    const postObj = posts.find((p) => p.id === demoPid);
    const chosenSampleComments = faker.helpers.arrayElements(VI_SAMPLE_COMMENTS, 4);
    for (const commentText of chosenSampleComments) {
      const commenter = userList[faker.number.int({ min: 3, max: 100 })];
      comments.push({
        userId: commenter.id,
        postId: demoPid,
        at: faker.number.int({ min: postObj.createdAt, max: now }),
        text: commentText,
      });
    }
  }

  // Distribute remaining comments across posts that have likes
  let commentLikIdx = 0;
  while (comments.length < targetComments) {
    const likeRef = likes[commentLikIdx % likes.length];
    commentLikIdx++;
    const post = posts.find((p) => p.id === likeRef.postId) || posts[0];
    const commenter = userList[Math.floor(Math.random() * totalUsers)];
    comments.push({
      userId: commenter.id,
      postId: post.id,
      at: faker.number.int({ min: post.createdAt, max: now }),
      text: faker.helpers.arrayElement(VI_SAMPLE_COMMENTS) + ' ' + faker.lorem.words(3),
    });
  }

  // 9. Generate Shares (Formula: LIKED * 0.10 = exactly 9,000)
  const targetShares = Math.floor(targetLikes * 0.10);
  const shares = [];

  // Share demo posts
  for (const demoPid of demoPostIds) {
    const postObj = posts.find((p) => p.id === demoPid);
    const sharers = faker.helpers.arrayElements(userList.slice(3, 50), 3);
    let prevSharer = null;
    for (const sharer of sharers) {
      shares.push({
        userId: sharer.id,
        postId: demoPid,
        at: faker.number.int({ min: postObj.createdAt, max: now }),
        via: prevSharer ? prevSharer.id : null,
      });
      prevSharer = sharer;
    }
  }

  let shareLikeIdx = 0;
  while (shares.length < targetShares) {
    const likeRef = likes[shareLikeIdx % likes.length];
    shareLikeIdx++;
    const post = posts.find((p) => p.id === likeRef.postId) || posts[0];
    const sharer = userList[Math.floor(Math.random() * totalUsers)];
    shares.push({
      userId: sharer.id,
      postId: post.id,
      at: faker.number.int({ min: post.createdAt, max: now }),
      via: Math.random() < 0.25 ? userList[Math.floor(Math.random() * totalUsers)].id : null,
    });
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

