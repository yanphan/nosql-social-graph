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
    OPTIONAL MATCH (p)-[:ABOUT]->(t:Topic)
    WITH a, p, collect(t.name) AS topics
    OPTIONAL MATCH (:User {id:$me})-[l:LIKED]->(p)
    RETURN p, a.id AS authorId, a.username AS authorUsername, a.fullName AS authorFullName,
           topics, l IS NOT NULL AS likedByMe
    ORDER BY p.createdAt DESC SKIP $skip LIMIT $limit`,

  listByTopic: `MATCH (a:User)-[:POSTED]->(p:Post)-[:ABOUT]->(:Topic {name:$topic})
    WHERE p.createdAt >= $since
    OPTIONAL MATCH (p)-[:ABOUT]->(t:Topic)
    WITH a, p, collect(t.name) AS topics
    OPTIONAL MATCH (:User {id:$me})-[l:LIKED]->(p)
    RETURN p, a.id AS authorId, a.username AS authorUsername, a.fullName AS authorFullName,
           topics, l IS NOT NULL AS likedByMe
    ORDER BY p.createdAt DESC SKIP $skip LIMIT $limit`,

  findById: `MATCH (a:User)-[:POSTED]->(p:Post {id:$id})
    OPTIONAL MATCH (p)-[:ABOUT]->(t:Topic)
    RETURN p, a.id AS authorId, a.username AS authorUsername, a.fullName AS authorFullName, collect(t.name) AS topics`,

  update:       `MATCH (p:Post {id:$id}) SET p.content=$content RETURN p`,
  clearTopics:  `MATCH (:Post {id:$id})-[r:ABOUT]->(:Topic) DELETE r`,
  attachTopics: `MATCH (p:Post {id:$id}) UNWIND $topicIds AS tid MATCH (t:Topic {id:tid}) MERGE (p)-[:ABOUT {weight:1.0}]->(t)`,
  remove:       `MATCH (p:Post {id:$id}) DETACH DELETE p`,
  search: `MATCH (a:User)-[:POSTED]->(p:Post) WHERE toLower(p.content) CONTAINS toLower($q)
    RETURN p, a.username AS authorUsername ORDER BY p.createdAt DESC LIMIT $limit`,
};

export const topics = {
  list: `MATCH (t:Topic) OPTIONAL MATCH (t)<-[:ABOUT]-(p:Post)
    RETURN t, count(p) AS postCount ORDER BY postCount DESC`,
  upsertByName: `MERGE (t:Topic {name:$name}) ON CREATE SET t.id=$id, t.description='' RETURN t`,
  create: `CREATE (t:Topic {id:$id, name:$name, description:$description}) RETURN t`,
  update: `MATCH (t:Topic {id:$id}) SET t.name=$name, t.description=$description RETURN t`,
  remove: `MATCH (t:Topic {id:$id}) DETACH DELETE t`,
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
  comments: `MATCH (u:User)-[c:COMMENTED]->(:Post {id:$pid})
    RETURN u.id AS userId, u.username AS username, c.text AS text, c.at AS at ORDER BY c.at DESC SKIP $skip LIMIT $limit`,
  recount:  `MATCH (p:Post {id:$pid})
    OPTIONAL MATCH (p)<-[l:LIKED]-() WITH p, count(l) AS lc
    OPTIONAL MATCH (p)<-[c:COMMENTED]-() WITH p, lc, count(c) AS cc
    OPTIONAL MATCH (p)<-[s:SHARED]-() WITH p, lc, cc, count(s) AS sc
    SET p.likeCount=lc, p.commentCount=cc, p.shareCount=sc
    RETURN lc AS likeCount, cc AS commentCount, sc AS shareCount`,
};
