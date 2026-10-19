export const admin = {
  countByLabel: `MATCH (n) RETURN labels(n)[0] AS label, count(n) AS c`,
  countByType:  `MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS c`,
  degreeBuckets: `MATCH (u:User) OPTIONAL MATCH (u)<-[:FOLLOWS]-(f:User)
    WITH u, count(f) AS d RETURN d AS degree, count(u) AS users ORDER BY degree`,

  integrity: {
    selfFollow:     `MATCH (u:User)-[f:FOLLOWS]->(u) RETURN count(f) AS c`,
    dupFollow:      `MATCH (a:User)-[f:FOLLOWS]->(b:User) WITH a, b, count(f) AS n WHERE n > 1 RETURN count(*) AS c`,
    postNoAuthor:   `MATCH (p:Post) WHERE NOT ( (:User)-[:POSTED]->(p) ) RETURN count(p) AS c`,
    postManyAuthor: `MATCH (p:Post)<-[r:POSTED]-(:User) WITH p, count(r) AS n WHERE n > 1 RETURN count(p) AS c`,
    postNoTopic:    `MATCH (p:Post) WHERE NOT ( (p)-[:ABOUT]->(:Topic) ) RETURN count(p) AS c`,
    dupLike:        `MATCH (u:User)-[l:LIKED]->(p:Post) WITH u, p, count(l) AS n WHERE n > 1 RETURN count(*) AS c`,
    dupUserId:      `MATCH (u:User) WITH u.id AS id, count(*) AS n WHERE n > 1 RETURN count(*) AS c`,
    futureCreated:  `MATCH (p:Post) WHERE p.createdAt > $now RETURN count(p) AS c`,
    badInterest:    `MATCH ()-[r:INTERESTED_IN]->() WHERE r.score < 0 OR r.score > 1 RETURN count(r) AS c`,
  },

  // Bulk load: nhận $rows là mảng object, nạp theo lô 1000–5000
  bulk: {
    users: `UNWIND $rows AS r CREATE (:User {id:r.id, username:r.username, fullName:r.fullName, email:r.email,
      bio:r.bio, country:r.country, joinedAt:r.joinedAt, isVerified:r.isVerified, role:r.role,
      status:'active', passwordHash:r.passwordHash})`,
    topics: `UNWIND $rows AS r CREATE (:Topic {id:r.id, name:r.name, description:r.description})`,
    posts:  `UNWIND $rows AS r MATCH (u:User {id:r.authorId})
      CREATE (p:Post {id:r.id, content:r.content, createdAt:r.createdAt, language:r.language,
                      likeCount:0, commentCount:0, shareCount:0})
      CREATE (u)-[:POSTED {at:r.createdAt}]->(p)`,
    follows:    `UNWIND $rows AS r MATCH (a:User {id:r.s}), (b:User {id:r.t}) CREATE (a)-[:FOLLOWS {since:r.since}]->(b)`,
    about:      `UNWIND $rows AS r MATCH (p:Post {id:r.postId}), (t:Topic {id:r.topicId}) CREATE (p)-[:ABOUT {weight:r.weight}]->(t)`,
    likes:      `UNWIND $rows AS r MATCH (u:User {id:r.userId}), (p:Post {id:r.postId}) CREATE (u)-[:LIKED {at:r.at}]->(p)`,
    comments:   `UNWIND $rows AS r MATCH (u:User {id:r.userId}), (p:Post {id:r.postId}) CREATE (u)-[:COMMENTED {at:r.at, text:r.text}]->(p)`,
    shares:     `UNWIND $rows AS r MATCH (u:User {id:r.userId}), (p:Post {id:r.postId}) CREATE (u)-[:SHARED {at:r.at, via:r.via}]->(p)`,
    interests:  `UNWIND $rows AS r MATCH (u:User {id:r.userId}), (t:Topic {id:r.topicId}) CREATE (u)-[:INTERESTED_IN {score:r.score}]->(t)`,
    recountPosts: `MATCH (p:Post)
      OPTIONAL MATCH (p)<-[l:LIKED]-() WITH p, count(l) AS lc
      OPTIONAL MATCH (p)<-[c:COMMENTED]-() WITH p, lc, count(c) AS cc
      OPTIONAL MATCH (p)<-[s:SHARED]-() WITH p, lc, cc, count(s) AS sc
      SET p.likeCount=lc, p.commentCount=cc, p.shareCount=sc`,
  },

  // Export toàn graph (dùng cho backup logic + export JSON)
  exportNodes: `MATCH (n) RETURN labels(n)[0] AS label, properties(n) AS props SKIP $skip LIMIT $limit`,
  exportEdges: `MATCH (a)-[r]->(b) RETURN type(r) AS type, a.id AS s, b.id AS t, properties(r) AS props SKIP $skip LIMIT $limit`,
  deleteGraphData: `MATCH (n) DETACH DELETE n`,
};
