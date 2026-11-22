// Nhãn node và kiểu quan hệ hợp lệ (dùng để sinh truy vấn cố định, không bao giờ nội suy chuỗi từ người dùng)
export const NODE_LABELS = ['User', 'Topic', 'Post'];
export const EDGE_TYPES = {
  FOLLOWS: ['User', 'User'],
  POSTED: ['User', 'Post'],
  ABOUT: ['Post', 'Topic'],
  INTERESTED_IN: ['User', 'Topic'],
  LIKED: ['User', 'Post'],
  COMMENTED: ['User', 'Post'],
  SHARED: ['User', 'Post'],
};

export const admin = {
  countAllNodes: `MATCH (n) RETURN count(n) AS c`,
  countAllEdges: `MATCH ()-[r]->() RETURN count(r) AS c`,
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

  // Export toàn graph (dùng cho backup logic + export JSON).
  // FalkorDB trả tối đa RESULTSET_SIZE (mặc định 10.000) dòng mỗi truy vấn, nên đọc theo cửa sổ id node
  // [$from, $to): lọc id node là phép tìm trực tiếp (nhanh), còn cạnh lấy bằng cách mở rộng từ node nguồn
  // trong cửa sổ. Không dùng SKIP (chậm dần, dễ lặp/sót khi dữ liệu thay đổi).
  maxNodeId: `MATCH (n) RETURN max(id(n)) AS m`,
  exportNodes: `MATCH (n) WHERE id(n) >= $from AND id(n) < $to RETURN labels(n)[0] AS label, properties(n) AS props`,
  exportEdges: `MATCH (a) WHERE id(a) >= $from AND id(a) < $to MATCH (a)-[r]->(b)
    RETURN type(r) AS type, a.id AS s, b.id AS t, properties(r) AS props`,
  exportLabel: Object.fromEntries(
    NODE_LABELS.map((l) => [l, `MATCH (n:${l}) WHERE id(n) >= $from AND id(n) < $to RETURN properties(n) AS props`])
  ),
  exportType: Object.fromEntries(
    Object.entries(EDGE_TYPES).map(([t, [from]]) => [
      t,
      `MATCH (a:${from}) WHERE id(a) >= $from AND id(a) < $to MATCH (a)-[r:${t}]->(b)
        RETURN a.id AS s, b.id AS t, properties(r) AS props`,
    ])
  ),
  deleteGraphData: `MATCH (n) DETACH DELETE n`,

  // Phục hồi vào đồ thị rỗng: giữ nguyên mọi thuộc tính (kể cả status, passwordHash) để khớp 100% bản sao lưu
  restoreNodes: Object.fromEntries(
    NODE_LABELS.map((l) => [l, `UNWIND $rows AS r CREATE (n:${l}) SET n = r RETURN count(n) AS n`])
  ),
  restoreEdges: Object.fromEntries(
    Object.entries(EDGE_TYPES).map(([t, [from, to]]) => [
      t,
      `UNWIND $rows AS r MATCH (a:${from} {id:r.s}), (b:${to} {id:r.t})
        CREATE (a)-[e:${t}]->(b) SET e = r.props RETURN count(e) AS n`,
    ])
  ),

  // Nhập dữ liệu vào đồ thị đang có: cập nhật theo id, không tạo trùng.
  // Người dùng mới không có passwordHash nhận giá trị '!' (không khớp bcrypt): cần admin đặt lại mật khẩu.
  upsertNodes: {
    User: `UNWIND $rows AS r MERGE (n:User {id:r.id}) SET n += r,
      n.role = coalesce(n.role, 'user'), n.status = coalesce(n.status, 'active'),
      n.passwordHash = coalesce(n.passwordHash, '!'), n.joinedAt = coalesce(n.joinedAt, timestamp())
      RETURN count(n) AS n`,
    Topic: `UNWIND $rows AS r MERGE (n:Topic {id:r.id}) SET n += r, n.description = coalesce(n.description, '')
      RETURN count(n) AS n`,
    // Bài viết bắt buộc có tác giả đã tồn tại (r.authorId), tránh Post không có POSTED
    Post: `UNWIND $rows AS r MATCH (u:User {id:r.authorId})
      MERGE (n:Post {id:r.post.id}) SET n += r.post,
        n.likeCount = coalesce(n.likeCount, 0), n.commentCount = coalesce(n.commentCount, 0),
        n.shareCount = coalesce(n.shareCount, 0), n.createdAt = coalesce(n.createdAt, timestamp())
      MERGE (u)-[e:POSTED]->(n) ON CREATE SET e.at = n.createdAt
      RETURN count(n) AS n`,
  },
  upsertEdges: Object.fromEntries(
    Object.entries(EDGE_TYPES)
      .filter(([t]) => t !== 'POSTED')
      .map(([t, [from, to]]) => [
        t,
        `UNWIND $rows AS r MATCH (a:${from} {id:r.s}), (b:${to} {id:r.t})
          MERGE (a)-[e:${t}${t === 'COMMENTED' ? ' {at:r.props.at}' : ''}]->(b) SET e += r.props
          RETURN count(e) AS n`,
      ])
  ),
};
