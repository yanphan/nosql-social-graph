const depth = (n) => {
  const d = Number(n);
  if (!Number.isInteger(d) || d < 1 || d > 6) throw new Error('maxDepth must be an integer in 1..6');
  return d;
};

export const analytics = {
  // BT1 — trả về danh sách node theo thứ tự trên đường đi
  shortestPath: (maxDepth = 6) => `
    MATCH (a:User {username:$a}), (b:User {username:$b})
    WITH shortestPath((a)-[:FOLLOWS*..${depth(maxDepth)}]->(b)) AS p
    RETURN nodes(p) AS ns, relationships(p) AS rs, length(p) AS len`,

  // BT2 — $since = epoch ms đầu cửa sổ. Trọng số: like=1, comment=2, share=3 (service cộng 3 truy vấn)
  trendingLikes: `MATCH (t:Topic)<-[:ABOUT]-(p:Post)<-[l:LIKED]-(:User)
    WHERE l.at >= $since RETURN t.id AS id, t.name AS name, count(l) AS n`,
  trendingComments: `MATCH (t:Topic)<-[:ABOUT]-(p:Post)<-[c:COMMENTED]-(:User)
    WHERE c.at >= $since RETURN t.id AS id, t.name AS name, count(c) AS n`,
  trendingShares: `MATCH (t:Topic)<-[:ABOUT]-(p:Post)<-[s:SHARED]-(:User)
    WHERE s.at >= $since RETURN t.id AS id, t.name AS name, count(s) AS n`,

  // BT3
  friendSuggestions: `
    MATCH (me:User {id:$uid})-[:FOLLOWS]->(f:User)-[:FOLLOWS]->(c:User)
    WHERE c.id <> me.id AND NOT (me)-[:FOLLOWS]->(c) AND coalesce(c.status,'active') <> 'locked'
    WITH me, c, count(DISTINCT f) AS mutual
    OPTIONAL MATCH (me)-[:INTERESTED_IN]->(t:Topic)<-[:INTERESTED_IN]-(c)
    WITH c, mutual, count(DISTINCT t) AS sharedTopics
    RETURN c.id AS id, c.username AS username, c.fullName AS fullName,
           mutual, sharedTopics, mutual*2 + sharedTopics AS score
    ORDER BY score DESC LIMIT $limit`,

  // Cold start (người dùng mới chưa follow ai): người nổi tiếng nhất
  popularUsers: `MATCH (u:User)<-[:FOLLOWS]-(f:User) WHERE u.id <> $uid AND NOT (:User {id:$uid})-[:FOLLOWS]->(u)
    RETURN u.id AS id, u.username AS username, u.fullName AS fullName, count(f) AS followers
    ORDER BY followers DESC LIMIT $limit`,

  // BT4
  postSuggestions: `
    MATCH (me:User {id:$uid})-[i:INTERESTED_IN]->(t:Topic)<-[:ABOUT]-(p:Post)
    WHERE NOT (me)-[:LIKED]->(p)
    WITH me, p, max(i.score) AS interest
    ORDER BY p.createdAt DESC LIMIT 150
    MATCH (a:User)-[:POSTED]->(p)
    WHERE a.id <> me.id
    OPTIONAL MATCH (me)-[:FOLLOWS]->(f:User)-[:LIKED]->(p)
    OPTIONAL MATCH (p)-[:ABOUT]->(top:Topic)
    WITH p, a, collect(DISTINCT top.name) AS topics, interest, count(DISTINCT f) AS friendLikes
    RETURN p, a.id AS authorId, a.username AS authorUsername, a.fullName AS authorFullName,
           topics, friendLikes, interest, friendLikes*2 + interest*3 AS score
    ORDER BY score DESC, p.createdAt DESC LIMIT $limit`,

  // Cold start: bài có nhiều like nhất trong cửa sổ thời gian
  popularPosts: `MATCH (a:User)-[:POSTED]->(p:Post) WHERE p.createdAt >= $since
    OPTIONAL MATCH (p)-[:ABOUT]->(top:Topic)
    RETURN p, a.id AS authorId, a.username AS authorUsername, a.fullName AS authorFullName,
           collect(DISTINCT top.name) AS topics, 0 AS friendLikes, 0 AS interest, p.likeCount AS score
    ORDER BY p.likeCount DESC LIMIT $limit`,

  // BT5
  topFollowers: `MATCH (u:User)<-[:FOLLOWS]-(f:User)
    RETURN u.id AS id, u.username AS username, u.fullName AS fullName, count(f) AS followers
    ORDER BY followers DESC LIMIT $limit`,
  pageRank: `CALL algo.pageRank('User','FOLLOWS') YIELD node, score
    RETURN node.id AS id, node.username AS username, score ORDER BY score DESC LIMIT $limit`,
  // Dùng khi algo.* không có: lấy toàn bộ cạnh, tính PageRank/WCC ở service (utils/graphAlgos.js)
  allFollowEdges: `MATCH (a:User)-[:FOLLOWS]->(b:User) RETURN a.id AS s, b.id AS t`,
  wcc: `CALL algo.WCC({nodeLabels:['User'], relationshipTypes:['FOLLOWS']}) YIELD node, componentId
    RETURN componentId AS cid, collect(node.id) AS members`,
  // Truy vết lan truyền: service dựng cây từ (userId, via, at)
  spreadRows: `MATCH (a:User)-[:POSTED]->(p:Post {id:$pid})
    OPTIONAL MATCH (u:User)-[s:SHARED]->(p)
    RETURN a.id AS authorId, a.username AS authorUsername, p.content AS content,
           u.id AS userId, u.username AS username, s.at AS at, s.via AS via ORDER BY s.at`,

  // Đồ thị con để vẽ (depth 1; FE mở rộng thêm bằng cách gọi lại với center khác rồi merge)
  neighborhood: `MATCH (a {id:$id})-[r]-(b) RETURN a, r, b LIMIT $limit`,
  overview: `MATCH (a:User)-[r:FOLLOWS]->(b:User) RETURN a, r, b LIMIT $limit`,
  topicGraph: `MATCH (a:Post)-[r:ABOUT]->(b:Topic {id:$id}) RETURN a, r, b LIMIT $limit`,
};
