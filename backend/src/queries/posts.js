export const posts = {
  create: `MATCH (u:User {id:$uid})
    CREATE (p:Post {id:$pid, content:$content, createdAt:$now, language:$language,
                    likeCount:0, commentCount:0, shareCount:0})
    CREATE (u)-[:POSTED {at:$now}]->(p)
    WITH p UNWIND $topicIds AS tid
    MATCH (t:Topic {id:tid}) MERGE (p)-[:ABOUT {weight:1.0}]->(t)
    RETURN DISTINCT p.id AS id`,

  // Feed/list. $authorId, $since có thể là null. likedByMe dựa trên $me.
  list: `MATCH (a:User)-[:POSTED]->(p:Post)
    WHERE ($authorId IS NULL OR a.id = $authorId) AND p.createdAt >= $since
    WITH a, p ORDER BY p.createdAt DESC SKIP $skip LIMIT $limit
    OPTIONAL MATCH (p)-[:ABOUT]->(t:Topic)
    WITH a, p, collect(t.name) AS topics
    OPTIONAL MATCH (:User {id:$me})-[l:LIKED]->(p)
    RETURN p, a.id AS authorId, a.username AS authorUsername, a.fullName AS authorFullName,
           topics, l IS NOT NULL AS likedByMe
    ORDER BY p.createdAt DESC`,

  listByTopic: `MATCH (a:User)-[:POSTED]->(p:Post)-[:ABOUT]->(:Topic {name:$topic})
    WHERE p.createdAt >= $since
    WITH a, p ORDER BY p.createdAt DESC SKIP $skip LIMIT $limit
    OPTIONAL MATCH (p)-[:ABOUT]->(t:Topic)
    WITH a, p, collect(t.name) AS topics
    OPTIONAL MATCH (:User {id:$me})-[l:LIKED]->(p)
    RETURN p, a.id AS authorId, a.username AS authorUsername, a.fullName AS authorFullName,
           topics, l IS NOT NULL AS likedByMe
    ORDER BY p.createdAt DESC`,

  findById: `MATCH (a:User)-[:POSTED]->(p:Post {id:$id})
    OPTIONAL MATCH (p)-[:ABOUT]->(t:Topic)
    RETURN p, a.id AS authorId, a.username AS authorUsername, a.fullName AS authorFullName, collect(t.name) AS topics`,

  update:       `MATCH (p:Post {id:$id}) SET p.content=$content RETURN p`,
  clearTopics:  `MATCH (:Post {id:$id})-[r:ABOUT]->(:Topic) DELETE r`,
  attachTopics: `MATCH (p:Post {id:$id}) UNWIND $topicIds AS tid MATCH (t:Topic {id:tid}) MERGE (p)-[:ABOUT {weight:1.0}]->(t)`,
  remove:       `MATCH (p:Post {id:$id}) DETACH DELETE p`,
  search: `MATCH (a:User)-[:POSTED]->(p:Post) WHERE toLower(p.content) CONTAINS toLower($q)
    RETURN p, a.username AS authorUsername ORDER BY p.createdAt DESC LIMIT $limit`,

  // Trang quản trị: tìm theo nội dung / tác giả, lọc theo chủ đề. $q đã được hạ chữ thường, '' = bỏ qua.
  adminList: `MATCH (a:User)-[:POSTED]->(p:Post)
    WHERE ($q = '' OR toLower(p.content) CONTAINS $q OR toLower(a.username) CONTAINS $q OR toLower(a.fullName) CONTAINS $q)
      AND ($topic = '' OR (p)-[:ABOUT]->(:Topic {name:$topic}))
    WITH a, p ORDER BY p.createdAt DESC SKIP $skip LIMIT $limit
    OPTIONAL MATCH (p)-[:ABOUT]->(t:Topic)
    WITH a, p, collect(t.name) AS topics
    RETURN p, a.id AS authorId, a.username AS authorUsername, a.fullName AS authorFullName, topics
    ORDER BY p.createdAt DESC`,
  adminCount: `MATCH (a:User)-[:POSTED]->(p:Post)
    WHERE ($q = '' OR toLower(p.content) CONTAINS $q OR toLower(a.username) CONTAINS $q OR toLower(a.fullName) CONTAINS $q)
      AND ($topic = '' OR (p)-[:ABOUT]->(:Topic {name:$topic}))
    RETURN count(p) AS total`,
};

export const topics = {
  list: `MATCH (t:Topic) OPTIONAL MATCH (t)<-[:ABOUT]-(p:Post)
    RETURN t, count(p) AS postCount ORDER BY postCount DESC`,
  upsertByName: `MERGE (t:Topic {name:$name}) ON CREATE SET t.id=$id, t.description='' RETURN t`,
  create: `CREATE (t:Topic {id:$id, name:$name, description:$description}) RETURN t`,
  update: `MATCH (t:Topic {id:$id}) SET t.name=$name, t.description=$description RETURN t`,
  remove: `MATCH (t:Topic {id:$id}) DETACH DELETE t`,
  findById: `MATCH (t:Topic {id:$id}) RETURN t`,
  findByName: `MATCH (t:Topic {name:$name}) RETURN t`,
  // Ảnh hưởng khi xóa chủ đề: số bài gắn, số bài chỉ có duy nhất chủ đề này, số người quan tâm
  impact: `MATCH (t:Topic {id:$id})
    OPTIONAL MATCH (t)<-[:ABOUT]-(p:Post)
    OPTIONAL MATCH (p)-[:ABOUT]->(other:Topic) WHERE other <> t
    WITH t, p, count(other) AS others
    WITH t, count(p) AS posts, sum(CASE WHEN p IS NOT NULL AND others = 0 THEN 1 ELSE 0 END) AS orphanPosts
    OPTIONAL MATCH (t)<-[i:INTERESTED_IN]-(:User)
    RETURN posts, orphanPosts, count(i) AS interested`,
  setInterests: `MATCH (u:User {id:$uid}) UNWIND $items AS it
    MATCH (t:Topic {id:it.topicId}) MERGE (u)-[r:INTERESTED_IN]->(t) SET r.score = it.score`,
  userInterests: `MATCH (u:User {id:$uid})-[r:INTERESTED_IN]->(t:Topic) OPTIONAL MATCH (t)<-[:ABOUT]-(p:Post)
    RETURN t, r.score AS score, count(p) AS postCount ORDER BY score DESC`,
  search: `MATCH (t:Topic) WHERE toLower(t.name) CONTAINS toLower($q) RETURN t LIMIT $limit`,
};

export const follow = {
  follow: `MATCH (a:User {id:$a}), (b:User {id:$b}) WHERE a.id <> b.id
    MERGE (a)-[f:FOLLOWS]->(b) ON CREATE SET f.since=$now RETURN f.since AS since`,
  unfollow: `MATCH (:User {id:$a})-[f:FOLLOWS]->(:User {id:$b}) DELETE f`,
};

// Quy ước: service gọi hasX trước, rồi gọi like/unlike, cuối cùng recount.
export const interactions = {
  hasLiked: `MATCH (:User {id:$uid})-[l:LIKED]->(:Post {id:$pid}) RETURN count(l) AS c`,
  like:     `MATCH (u:User {id:$uid}), (p:Post {id:$pid}) MERGE (u)-[l:LIKED]->(p) ON CREATE SET l.at=$now`,
  unlike:   `MATCH (:User {id:$uid})-[l:LIKED]->(:Post {id:$pid}) DELETE l`,
  comment:  `MATCH (u:User {id:$uid}), (p:Post {id:$pid}) CREATE (u)-[:COMMENTED {at:$now, text:$text}]->(p)`,
  share:    `MATCH (u:User {id:$uid}), (p:Post {id:$pid})
    MERGE (u)-[s:SHARED]->(p) ON CREATE SET s.at=$now, s.via=$via`,
  // Bình luận không có id riêng: định danh bằng (người bình luận, bài viết, thời điểm at)
  findComment: `MATCH (u:User {id:$uid})-[c:COMMENTED]->(:Post {id:$pid}) WHERE c.at = $at
    RETURN u.username AS username, c.text AS text, c.at AS at LIMIT 1`,
  removeComment: `MATCH (:User {id:$uid})-[c:COMMENTED]->(:Post {id:$pid}) WHERE c.at = $at
    WITH c LIMIT 1 DELETE c`,
  comments: `MATCH (u:User)-[c:COMMENTED]->(:Post {id:$pid})
    RETURN u.id AS userId, u.username AS username, c.text AS text, c.at AS at ORDER BY c.at DESC SKIP $skip LIMIT $limit`,
  recount:  `MATCH (p:Post {id:$pid})
    OPTIONAL MATCH (p)<-[l:LIKED]-() WITH p, count(l) AS lc
    OPTIONAL MATCH (p)<-[c:COMMENTED]-() WITH p, lc, count(c) AS cc
    OPTIONAL MATCH (p)<-[s:SHARED]-() WITH p, lc, cc, count(s) AS sc
    SET p.likeCount=lc, p.commentCount=cc, p.shareCount=sc
    RETURN lc AS likeCount, cc AS commentCount, sc AS shareCount`,
  // Tính lại bộ đếm cho nhiều bài (sau khi xóa một người dùng đã tương tác với các bài này)
  recountMany: `UNWIND $pids AS pid MATCH (p:Post {id:pid})
    OPTIONAL MATCH (p)<-[l:LIKED]-() WITH p, count(l) AS lc
    OPTIONAL MATCH (p)<-[c:COMMENTED]-() WITH p, lc, count(c) AS cc
    OPTIONAL MATCH (p)<-[s:SHARED]-() WITH p, lc, cc, count(s) AS sc
    SET p.likeCount=lc, p.commentCount=cc, p.shareCount=sc
    RETURN count(p) AS n`,
};
