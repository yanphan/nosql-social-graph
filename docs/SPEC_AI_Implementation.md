# SPEC TRIỂN KHAI: Mạng lưới User–Post–Topic với FalkorDB

> File này dành cho AI (và 3 thành viên) để hiểu **cần build gì, build bằng gì, ai làm gì, làm theo thứ tự nào**.
> Không chứa lý thuyết. Mọi quyết định ở đây là **đã chốt**, AI không tự đổi stack, tên field, tên endpoint.
> Những chỗ phụ thuộc phiên bản FalkorDB được gom ở mục 14 (cần kiểm chứng khi chạy thật).

---

## 0. Quy tắc làm việc (AI đọc kỹ trước khi sinh code)

1. **Ngôn ngữ code:** JavaScript (ESM, Node 20+). Không dùng TypeScript. Tên biến/hàm/endpoint bằng tiếng Anh; thông báo lỗi và nhãn UI bằng tiếng Việt.
2. **Cypher chỉ nằm trong `backend/src/queries/`**. Không viết Cypher ở service, route hay frontend.
3. **Luôn truyền giá trị qua tham số `$name`**, không nối chuỗi. Ngoại lệ duy nhất: độ sâu duyệt `*..N` không tham số hóa được, nên phải validate `Number.isInteger(N) && 1 <= N <= 6` rồi mới nội suy (xem `queries/analytics.js`).
4. **Thời gian lưu dạng số nguyên epoch milliseconds** (`Date.now()`), không dùng kiểu datetime của Cypher.
5. **ID do ứng dụng sinh** (`nanoid(12)`), lưu ở thuộc tính `id`. Không dùng ID nội bộ của FalkorDB làm khóa nghiệp vụ.
6. **Mọi response theo envelope**: `{ ok: true, data }` hoặc `{ ok: false, error: { code, message } }`.
7. **Không sửa file ngoài vùng sở hữu của mình** (mục 10). Cần đổi contract thì sửa mục 6 của file này trong một PR riêng, cả 3 người duyệt.
8. **Frontend không chờ backend**: dùng mock mode (`VITE_USE_MOCK=true`) theo đúng contract ở mục 6. Tích hợp thật chỉ làm ở "ngày tích hợp" cuối sprint.
9. Mỗi task xong phải đạt **Definition of Done** (mục 11.0).

---

## 1. Mục tiêu sản phẩm

Hệ thống mạng xã hội thu nhỏ trên **đồ thị FalkorDB**: người dùng đăng bài, gắn chủ đề, theo dõi, thích/bình luận/chia sẻ; hệ thống trả lời 5 bài toán trên đồ thị và trực quan hóa mạng lưới. **FalkorDB Browser** dùng cho quản trị/khám phá thủ công; **ứng dụng web** dùng cho người dùng cuối.

**Phương án giao diện đã chọn: A (web đầy đủ, đầu tư làm đẹp)** — Node.js backend + React frontend + Cytoscape.js.

### 1.1. Năm bài toán

| Mã | Bài toán | Hướng giải |
| --- | --- | --- |
| BT1 | Đường đi ngắn nhất giữa 2 người dùng | `shortestPath` trên `FOLLOWS`, tối đa 6 bước |
| BT2 | Chủ đề nóng theo khoảng thời gian | Đếm tương tác `Topic ← ABOUT ← Post ← LIKED/COMMENTED/SHARED` trong cửa sổ thời gian |
| BT3 | Gợi ý bạn bè | Bạn của bạn + số bạn chung + chủ đề quan tâm chung |
| BT4 | Gợi ý bài viết | Chủ đề quan tâm + lượt thích của người mình theo dõi |
| BT5 | Ảnh hưởng, cộng đồng, truy vết lan truyền | Số follower, PageRank, thành phần liên thông, chuỗi `SHARED` |

### 1.2. Bốn nhóm chức năng bắt buộc demo (mỗi nhóm 0,5 điểm)

| Nhóm | Phải có trong app |
| --- | --- |
| Quản trị người dùng | Đăng nhập 3 vai trò (admin, analyst, user); tạo/khóa tài khoản; phân quyền làm đổi menu và API |
| Thao tác trên CSDL | CRUD user/post/topic/quan hệ; nhập/xuất CSV+JSON; sao lưu → xóa graph → phục hồi → đối chiếu số node/cạnh |
| Quản lý theo bài toán | BT1–BT5 có màn hình riêng |
| Chức năng hỗ trợ | Tìm kiếm, thống kê, nhật ký thao tác, bảng so sánh hiệu năng |

Ngoài ra bắt buộc: **kết nối app ↔ CSDL** (backend dùng client chính thức) và **dùng FalkorDB Browser** cho truy vấn cơ bản/nâng cao + `GRAPH.EXPLAIN/PROFILE`.

---

## 2. Stack đã chốt

| Lớp | Công nghệ |
| --- | --- |
| CSDL | FalkorDB (Docker, image đi kèm Browser ở cổng 3000) |
| Backend | Node.js 20, Express 4, `falkordb` (client chính thức), `zod`, `jsonwebtoken`, `bcryptjs`, `multer`, `csv-parse`, `csv-stringify`, `nanoid`, `helmet`, `cors`, `morgan`; test: `vitest`, `supertest` |
| Frontend | React 18, Vite, TailwindCSS, `react-router-dom`, `@tanstack/react-query`, `zustand`, `axios`, `cytoscape` + `cytoscape-fcose`, `framer-motion`, `recharts`, `lucide-react`, `sonner`, `axios-mock-adapter` |
| Dữ liệu mẫu | `@faker-js/faker` (seed cố định), script Node |
| Benchmark | script Node (`performance.now`), `autocannon` (tải đồng thời), PostgreSQL (docker profile `bench`) làm đối chứng |
| Triển khai | Docker Compose |

**Cổng:** FalkorDB `6379` · Browser `3000` · Backend `4000` · Frontend dev `5173`.

---

## 3. Mô hình dữ liệu (đã chốt)

Graph name: `social`. Dùng thống nhất thuật ngữ **node** và **relationship**.

### 3.1. Node

| Label | Thuộc tính | Ghi chú |
| --- | --- | --- |
| `User` | `id`, `username`, `fullName`, `email`, `bio`, `country`, `joinedAt`, `isVerified`, `role` (`admin`\|`analyst`\|`user`), `status` (`active`\|`locked`), `passwordHash` | Tài khoản ứng dụng lưu luôn trên node User. **Không bao giờ trả `passwordHash` ra API.** |
| `Post` | `id`, `content`, `createdAt`, `language`, `likeCount`, `commentCount`, `shareCount` | Bộ đếm cập nhật bằng recount sau mỗi tương tác |
| `Topic` | `id`, `name`, `description` | `name` duy nhất, lưu chữ thường không dấu cách đặc biệt (ví dụ `ai`, `football`) |

### 3.2. Relationship

| Kiểu | Hướng | Thuộc tính | Ghi chú |
| --- | --- | --- | --- |
| `FOLLOWS` | User → User | `since` | Không tự theo dõi; tối đa 1 cạnh mỗi cặp |
| `POSTED` | User → Post | `at` | Mỗi Post đúng 1 cạnh vào |
| `ABOUT` | Post → Topic | `weight` | Mỗi Post ≥ 1 Topic |
| `LIKED` | User → Post | `at` | Tối đa 1 cạnh mỗi cặp |
| `COMMENTED` | User → Post | `at`, `text` | Nhiều cạnh được phép |
| `SHARED` | User → Post | `at`, `via` | `via` = id người mà họ thấy bài (để truy vết lan truyền); null nếu chia sẻ từ tác giả |
| `INTERESTED_IN` | User → Topic | `score` (0..1) | |

### 3.3. Ràng buộc toàn vẹn (có script kiểm tra ở `queries/admin.js` → `integrity`)

- `User.id`, `Post.id`, `Topic.id`, `User.username`, `Topic.name` duy nhất.
- Không có `(u)-[:FOLLOWS]->(u)`; không có 2 cạnh `FOLLOWS` cùng cặp.
- Mỗi Post có đúng 1 `POSTED` vào và ≥ 1 `ABOUT` ra.
- Không có 2 cạnh `LIKED` cùng cặp.
- `createdAt <= now`; `INTERESTED_IN.score` ∈ [0,1].

### 3.4. Chỉ mục (file `database/schema.cypher`, chạy bằng `database/scripts/init-schema.js`)

```cypher
CREATE INDEX FOR (u:User) ON (u.id)
CREATE INDEX FOR (u:User) ON (u.username)
CREATE INDEX FOR (p:Post) ON (p.id)
CREATE INDEX FOR (p:Post) ON (p.createdAt)
CREATE INDEX FOR (t:Topic) ON (t.id)
CREATE INDEX FOR (t:Topic) ON (t.name)
```

Ràng buộc duy nhất (tạo sau chỉ mục; cú pháp xem mục 14):

```
GRAPH.CONSTRAINT CREATE social UNIQUE NODE User PROPERTIES 1 id
GRAPH.CONSTRAINT CREATE social UNIQUE NODE User PROPERTIES 1 username
GRAPH.CONSTRAINT CREATE social UNIQUE NODE Post PROPERTIES 1 id
GRAPH.CONSTRAINT CREATE social UNIQUE NODE Topic PROPERTIES 1 id
GRAPH.CONSTRAINT CREATE social UNIQUE NODE Topic PROPERTIES 1 name
```

---

## 4. Danh mục truy vấn Cypher (nguồn sự thật duy nhất)

Đây chính là nội dung các file trong `backend/src/queries/`. **M1 sở hữu**, M2 chỉ gọi qua repository.

### 4.1. `queries/users.js`

```js
export const users = {
  create: `CREATE (u:User {id:$id, username:$username, fullName:$fullName, email:$email,
    bio:$bio, country:$country, joinedAt:$now, isVerified:false, role:$role,
    status:'active', passwordHash:$passwordHash}) RETURN u`,

  findById:       `MATCH (u:User {id:$id}) RETURN u`,
  findByUsername: `MATCH (u:User {username:$username}) RETURN u`,

  list: `MATCH (u:User)
    WHERE $q = '' OR toLower(u.username) CONTAINS toLower($q) OR toLower(u.fullName) CONTAINS toLower($q)
    RETURN u ORDER BY u.joinedAt DESC SKIP $skip LIMIT $limit`,

  update: `MATCH (u:User {id:$id})
    SET u.fullName=$fullName, u.bio=$bio, u.country=$country, u.email=$email RETURN u`,

  setStatus: `MATCH (u:User {id:$id}) SET u.status=$status RETURN u`,
  setRole:   `MATCH (u:User {id:$id}) SET u.role=$role RETURN u`,
  remove:    `MATCH (u:User {id:$id}) DETACH DELETE u`,

  profileStats: `MATCH (u:User {id:$id})
    OPTIONAL MATCH (u)<-[:FOLLOWS]-(f:User) WITH u, count(f) AS followers
    OPTIONAL MATCH (u)-[:FOLLOWS]->(g:User) WITH u, followers, count(g) AS following
    OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
    RETURN u, followers, following, count(p) AS posts`,

  followers: `MATCH (:User {id:$id})<-[f:FOLLOWS]-(x:User) RETURN x, f.since AS since ORDER BY since DESC SKIP $skip LIMIT $limit`,
  following: `MATCH (:User {id:$id})-[f:FOLLOWS]->(x:User) RETURN x, f.since AS since ORDER BY since DESC SKIP $skip LIMIT $limit`,
  isFollowing: `MATCH (:User {id:$a})-[f:FOLLOWS]->(:User {id:$b}) RETURN count(f) AS c`,
  search: `MATCH (u:User) WHERE toLower(u.username) CONTAINS toLower($q) OR toLower(u.fullName) CONTAINS toLower($q)
    RETURN u LIMIT $limit`,
};
```

### 4.2. `queries/posts.js` (gồm topics, follow, interactions)

```js
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
    RETURN p, a.id AS authorId, a.username AS authorUsername, collect(t.name) AS topics`,

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
  search: `MATCH (t:Topic) WHERE toLower(t.name) CONTAINS toLower($q) RETURN t LIMIT $limit`,
};

export const follow = {
  follow:   `MATCH (a:User {id:$a}), (b:User {id:$b}) WHERE a.id <> b.id
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
```

### 4.3. `queries/analytics.js` (BT1–BT5, subgraph, stats)

```js
const depth = (n) => {
  const d = Number(n);
  if (!Number.isInteger(d) || d < 1 || d > 6) throw new Error('maxDepth must be an integer in 1..6');
  return d;
};

export const analytics = {
  // BT1 — trả về danh sách node theo thứ tự trên đường đi
  shortestPath: (maxDepth = 6) => `
    MATCH (a:User {username:$a}), (b:User {username:$b})
    MATCH p = shortestPath((a)-[:FOLLOWS*..${depth(maxDepth)}]->(b))
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
    MATCH (me:User {id:$uid})-[i:INTERESTED_IN]->(t:Topic)<-[:ABOUT]-(p:Post)<-[:POSTED]-(a:User)
    WHERE NOT (me)-[:LIKED]->(p) AND a.id <> $uid
    OPTIONAL MATCH (me)-[:FOLLOWS]->(f:User)-[:LIKED]->(p)
    WITH p, a, max(i.score) AS interest, count(DISTINCT f) AS friendLikes
    RETURN p, a.id AS authorId, a.username AS authorUsername,
           friendLikes, interest, friendLikes*2 + interest*3 AS score
    ORDER BY score DESC, p.createdAt DESC LIMIT $limit`,
  // Cold start: bài có nhiều like nhất trong cửa sổ thời gian
  popularPosts: `MATCH (a:User)-[:POSTED]->(p:Post) WHERE p.createdAt >= $since
    RETURN p, a.id AS authorId, a.username AS authorUsername, 0 AS friendLikes, 0 AS interest, p.likeCount AS score
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
```

### 4.4. `queries/admin.js` (thống kê, kiểm tra toàn vẹn, import/export)

```js
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
```

> Với `bulk.*`, **thứ tự nạp bắt buộc**: users → topics → posts → follows → about → interests → likes → comments → shares → recountPosts. Cần có chỉ mục trước khi nạp (nếu không `MATCH` theo `id` sẽ quét toàn bộ).

---

## 5. Kiến trúc và quy ước code

```
Browser ──► Frontend (React :5173) ──HTTP/JSON──► Backend (Express :4000) ──► FalkorDB (:6379)
                                                                                  ▲
Quản trị viên / Nhà phân tích ──► FalkorDB Browser (:3000) ───────────────────────┘
```

Backend phân tầng: `routes` (controller mỏng: validate + gọi service + `ok()`) → `services` (nghiệp vụ, phân quyền theo dữ liệu, ghép nhiều repo) → `repositories` (gọi `queries/*`, map kết quả → DTO) → `db/graph.js`.

### 5.1. Mã lỗi

| code | HTTP | Khi nào |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | zod fail, độ sâu ngoài 1..6 |
| `UNAUTHENTICATED` | 401 | thiếu/sai/hết hạn token, sai mật khẩu |
| `FORBIDDEN` | 403 | sai vai trò, tài khoản bị khóa, sửa bài người khác |
| `NOT_FOUND` | 404 | tài khoản/bài viết/chủ đề không tồn tại |
| `CONFLICT` | 409 | trùng username/topic name |
| `INTERNAL` | 500 | lỗi không lường trước |

### 5.2. Phân quyền (RBAC)

`admin` ⊃ `analyst` ⊃ `user` về phạm vi xem; riêng quyền quản trị chỉ `admin`.
Tài khoản `status=locked` không đăng nhập được (403 khi login).

### 5.3. Bảo mật tối thiểu bắt buộc

bcrypt hash mật khẩu · JWT HS256 · `helmet` · CORS chỉ nguồn frontend · rate-limit nhẹ cho `/auth/login` · người dùng cuối **không** gửi Cypher tùy ý · FalkorDB có mật khẩu và không publish ra Internet.

---

## 6. API contract (đã chốt, FE mock theo đúng bảng này)

Prefix `/api`. Vai trò: **U**=user, **A**=analyst, **AD**=admin (mặc định "ai đã đăng nhập" nếu ghi `*`). Phân trang: `?page=1&limit=20` → `data: { items, page, limit, hasMore }`.

### 6.1. DTO

```text
UserDto   { id, username, fullName, bio, country, joinedAt, isVerified, role, status, email? }   // email chỉ cho chính chủ/admin
PostDto   { id, content, createdAt, language, likeCount, commentCount, shareCount,
            author:{id,username,fullName}, topics:[string], likedByMe }
TopicDto  { id, name, description, postCount }
GraphDto  { nodes:[{id,label,props}], edges:[{id,type,source,target,props}] }   // edge.id = `${type}:${source}:${target}`
PathDto   { found, length, steps:[username], graph:GraphDto }
```

### 6.2. Endpoint

| Method + Path | Vai trò | UC | Body/Query → `data` |
| --- | --- | --- | --- |
| `POST /auth/register` | công khai | UC-01 | `{username,password,fullName,email}` → `{token,user}` (role=user) |
| `POST /auth/login` | công khai | UC-01 | `{username,password}` → `{token,user}` |
| `GET /auth/me` | * | UC-01 | → `UserDto` |
| `GET /users?q=` | * | UC-02, 18 | → page of `UserDto` |
| `GET /users/:id` | * | UC-02 | → `{user, followers, following, posts, isFollowing}` |
| `POST /users` | AD | UC-02 | `{username,password,fullName,email,role}` → `UserDto` |
| `PUT /users/:id` | chính chủ/AD | UC-02 | `{fullName,bio,country,email}` → `UserDto` |
| `PATCH /users/:id/status` | AD | UC-02 | `{status}` → `UserDto` |
| `PATCH /users/:id/role` | AD | UC-02 | `{role}` → `UserDto` |
| `DELETE /users/:id` | AD | UC-02 | → `{deleted:true}` |
| `GET /users/:id/followers` `GET /users/:id/following` | * | UC-07 | → page of `{user, since}` |
| `POST /follow` `DELETE /follow/:targetId` | * | UC-07 | `{targetId}` → `{following:boolean}` |
| `PUT /me/interests` | * | UC-11/12 | `{items:[{topicId,score}]}` → `{updated:n}` |
| `GET /posts?topic=&authorId=&days=` | * | UC-05, 18 | → page of `PostDto` |
| `POST /posts` | * | UC-05 | `{content,topics:[name], language?}` → `PostDto` |
| `GET /posts/:id` | * | UC-05 | → `PostDto` |
| `PUT /posts/:id` | tác giả/AD | UC-05 | `{content,topics?}` → `PostDto` |
| `DELETE /posts/:id` | tác giả/AD | UC-05 | → `{deleted:true}` |
| `POST /posts/:id/like` `DELETE /posts/:id/like` | * | UC-08 | → `{liked, likeCount}` |
| `GET /posts/:id/comments` `POST /posts/:id/comments` | * | UC-08 | `{text}` → `{commentCount}` |
| `POST /posts/:id/share` | * | UC-08 | `{via?}` → `{shareCount}` |
| `GET /topics` | * | UC-06 | → `TopicDto[]` |
| `POST /topics` `PUT /topics/:id` `DELETE /topics/:id` | AD | UC-06 | `{name,description}` → `TopicDto` |
| `GET /path?from=&to=&maxDepth=6` | * | UC-09 | → `PathDto` |
| `GET /topics/trending?days=7&limit=10` | * | UC-10 | → `[{id,name,interactions,likes,comments,shares,rank}]` |
| `GET /recommend/friends?limit=10` | * | UC-11 | → `[{id,username,fullName,mutual,sharedTopics,score,reason}]` |
| `GET /recommend/posts?limit=10` | * | UC-12 | → `[{post:PostDto,friendLikes,score}]` |
| `GET /analytics/influence?metric=followers\|pagerank&limit=10` | A, AD | UC-13 | → `[{id,username,fullName,followers,pagerank?,rank}]` |
| `GET /analytics/communities` | A, AD | UC-13 | → `{count, communities:[{id,size,top:[{id,username}]}]}` |
| `GET /analytics/spread/:postId` | A, AD | UC-14 | → `{post:{id,content,author}, total, depth, tree:{user,at,children:[...]}}` |
| `GET /graph/subgraph?center=&limit=100` | * | UC-04 | → `GraphDto` (center rỗng = overview) |
| `GET /search?q=&type=user\|post\|topic\|all` | * | UC-18 | → `{users,posts,topics}` |
| `GET /stats` | A, AD | UC-16 | → `{nodes:{User,Post,Topic}, edges:{...}, degreeBuckets:[{degree,users}], scale}` |
| `GET /admin/integrity` | AD | UC-15 | → `{checks:[{name,count,ok}]}` |
| `POST /admin/import?kind=users\|topics\|posts\|follows\|...` | AD | UC-15 | multipart `file` csv/json → `{inserted, before, after}` |
| `GET /admin/export?format=csv\|json&label=` | AD | UC-15 | file download |
| `POST /admin/seed` | AD | UC-15 | `{scale:'S'\|'M'}` → `{nodes,edges,ms}` |
| `POST /admin/backup` `GET /admin/backups` | AD | UC-17 | → `{file,nodes,edges,sizeBytes}` / list |
| `POST /admin/restore` | AD | UC-17 | `{file}` → `{nodes,edges,matchesBackup:boolean}` |
| `GET /admin/audit?limit=100` | AD | UC-16 | → `[{at,userId,username,method,path,status}]` |
| `GET /benchmark` | * | — | → nội dung `benchmark/results/summary.json` |
| `GET /health` | công khai | — | → `{db:'up', graph:'social'}` |

---

## 7. Ma trận truy vết UC → API → Trang UI

| UC | Việc | API chính | Trang UI (route) |
| --- | --- | --- | --- |
| UC-01 | Đăng nhập | `/auth/*` | `/login`, `/register` |
| UC-02 | Quản lý người dùng | `/users*` | `/admin/users` |
| UC-03 | Dùng FalkorDB Browser | — | Nút "Mở FalkorDB Browser" (link `:3000`) trên layout cho A, AD |
| UC-04 | Trực quan hóa mạng lưới | `/graph/subgraph` | `/explore` |
| UC-05 | Quản lý bài viết | `/posts*` | `/` (feed), `/posts/:id` |
| UC-06 | Quản lý chủ đề | `/topics*` | `/admin/topics` |
| UC-07 | Theo dõi | `/follow`, `/users/:id/followers` | `/u/:username` |
| UC-08 | Tương tác bài viết | `/posts/:id/like`… | Post card (mọi trang) |
| UC-09 | Đường đi ngắn nhất | `/path` | `/path` |
| UC-10 | Chủ đề nóng | `/topics/trending` | `/trending` |
| UC-11/12 | Gợi ý bạn/bài | `/recommend/*` | `/discover` + khung bên phải feed |
| UC-13/14 | Ảnh hưởng, cộng đồng, lan truyền | `/analytics/*` | `/analytics` |
| UC-15 | Nhập/xuất/sinh dữ liệu | `/admin/import|export|seed|integrity` | `/admin/data` |
| UC-16 | Thống kê, nhật ký | `/stats`, `/admin/audit` | `/dashboard`, `/admin/audit` |
| UC-17 | Sao lưu/phục hồi | `/admin/backup|restore` | `/admin/backup` |
| UC-18 | Tìm kiếm | `/search` | Ô tìm kiếm toàn cục (Ctrl+K) |
| — | Bảng so sánh hiệu năng | `/benchmark` | `/benchmark` |

---

## 8. Đặc tả giao diện (phần đầu tư làm đẹp)

### 8.1. Phong cách

Dark-first, "graph lab": nền xanh đen sâu, bề mặt kính mờ (glass), điểm nhấn gradient chàm → xanh lơ, bo góc lớn, ánh sáng glow quanh node. Có chế độ sáng bằng token (làm sau cùng, không bắt buộc).

| Token | Giá trị |
| --- | --- |
| `bg` | `#0B1020` |
| `surface` | `rgba(255,255,255,0.04)` + `backdrop-blur-xl` + viền `rgba(255,255,255,0.08)` |
| `text` / `muted` | `#E6E9F5` / `#8B93B0` |
| `accent` | gradient `#6366F1 → #22D3EE` |
| Node `User` | `#6366F1` (tròn, kích thước theo số follower) |
| Node `Post` | `#22D3EE` (vuông bo góc) |
| Node `Topic` | `#F59E0B` (lục giác) |
| Cạnh `FOLLOWS` | `#6366F1` 40% · `POSTED` `#94A3B8` · `ABOUT` `#F59E0B` · `LIKED` `#F43F5E` · `SHARED` `#10B981` · `COMMENTED` `#A78BFA` · `INTERESTED_IN` `#F59E0B` nét đứt |
| Font | `Inter` (UI), `JetBrains Mono` (số liệu, mã) |

### 8.2. Yêu cầu trải nghiệm bắt buộc

- Chuyển trang bằng `framer-motion` (fade + trượt nhẹ); danh sách vào theo stagger.
- Skeleton loading cho mọi danh sách/biểu đồ; empty state có minh họa + hành động gợi ý; toast (`sonner`) cho mọi thao tác ghi.
- Post card: like có animation trái tim, optimistic update (react-query), bình luận mở rộng tại chỗ.
- **Graph canvas** (`/explore`, `/path`): nền chấm lưới; layout `fcose`; hover làm mờ phần còn lại và làm sáng láng giềng; click node mở **panel chi tiết** bên phải (thuộc tính + nút "Mở rộng láng giềng"); bộ lọc bật/tắt theo loại node/cạnh; chú giải màu; thu phóng/kéo; tìm node theo tên; giới hạn mặc định 100 node, mở rộng dần khi click (gọi lại `/graph/subgraph?center=` rồi **merge**).
- **Path finder**: hai ô autocomplete (gọi `/search`), khi có kết quả: các node trên đường đi sáng lên theo thứ tự, cạnh có hiệu ứng nét đứt chạy (dash offset animate), thẻ tóm tắt "Cách nhau N bước". Trường hợp lỗi: "Không tìm thấy kết nối" với minh họa riêng.
- **Trending**: bar chart ngang (recharts) + chip chọn khoảng 1/7/30 ngày, số đếm chạy (count-up).
- **Analytics**: bảng xếp hạng có huy hiệu top 3, biểu đồ phân phối bậc, cây lan truyền dạng sơ đồ cây có animation mở dần.
- **Backup/Restore**: stepper 4 bước (Sao lưu → Xóa graph → Phục hồi → Đối chiếu) với modal xác nhận nhập lại tên file; bảng so sánh "trước/sau" số node, số cạnh có tick xanh khi khớp.
- Responsive tới tablet; phím tắt `Ctrl+K` mở tìm kiếm toàn cục (command palette).
- Menu sidebar thay đổi theo vai trò (đây là bằng chứng demo "phân quyền").

### 8.3. Mock mode

`VITE_USE_MOCK=true` → axios dùng `axios-mock-adapter`, trả fixture JSON **đúng DTO ở mục 6.1**, có độ trễ giả 300–500 ms. Fixture ít nhất: 1 graph 40 node, 1 path 4 bước, 10 post, 8 topic, 10 gợi ý, bảng influence, cây spread, stats, benchmark.

---

## 9. Base code (copy nguyên vào repo ở Sprint 0)

### 9.1. Cây thư mục

```
nosql-social-graph/
├─ docker-compose.yml                  [M1]
├─ .env.example                        [M1]
├─ SPEC.md                             (file này)
├─ database/                           [M1]
│  ├─ schema.cypher
│  ├─ lib/ importer.js exporter.js backup.js integrity.js   # thư viện dùng chung với backend
│  ├─ seed/ config.js generate.js load.js
│  ├─ scripts/ init-schema.js backup.sh restore.sh verify.js
│  └─ data/                            # CSV mẫu, export, backup (gitignore phần lớn)
├─ backend/
│  ├─ package.json
│  └─ src/
│     ├─ server.js app.js              [M2]
│     ├─ config/env.js                 [M2]
│     ├─ db/graph.js                   [M1]
│     ├─ queries/                      [M1] users.js posts.js analytics.js admin.js index.js
│     ├─ repositories/                 [M1] *.repo.js
│     ├─ services/                     [M2] *.service.js
│     ├─ routes/                       [M2] *.routes.js (tự động nạp)
│     ├─ middlewares/                  [M2] auth.js rbac.js validate.js error.js audit.js
│     ├─ utils/                        [M2] http.js errors.js graphAlgos.js     (graphMapper.js [M1])
│     └─ tests/                        [M2]
├─ benchmark/                          [M1 chạy Graph, M2 chạy PostgreSQL]
│  ├─ run-graph.js run-pg.js run-concurrency.js
│  └─ results/summary.json
└─ frontend/                           [M3]
   ├─ package.json vite.config.js tailwind.config.js index.html
   └─ src/
      ├─ main.jsx App.jsx router.jsx
      ├─ api/ client.js endpoints.js mock/{index.js,fixtures/*.json}
      ├─ store/ auth.js
      ├─ lib/ graphTheme.js format.js
      ├─ components/ layout/ ui/ graph/ post/ charts/
      └─ pages/ Login Feed Explore PathFinder Trending Discover Analytics Dashboard Profile Benchmark admin/*
```

### 9.2. `docker-compose.yml`, `.env.example` [M1]

```yaml
services:
  falkordb:
    image: falkordb/falkordb:latest        # chốt phiên bản cụ thể rồi ghi vào README
    container_name: falkordb
    ports:
      - "6379:6379"   # DB
      - "3000:3000"   # FalkorDB Browser
    environment:
      - REDIS_ARGS=--requirepass ${FALKORDB_PASSWORD} --appendonly yes
    volumes:
      - falkordb_data:/var/lib/falkordb/data   # xác nhận đường dẫn: redis-cli CONFIG GET dir
    restart: unless-stopped

  # Sprint 5: thêm service backend + frontend (Dockerfile) để "docker compose up" chạy toàn bộ
  # profile "bench": postgres:16 cho đối chứng hiệu năng (M2 thêm ở Sprint 4)

volumes:
  falkordb_data:
```

```env
FALKORDB_HOST=localhost
FALKORDB_PORT=6379
FALKORDB_PASSWORD=falkor_dev_pass
GRAPH_NAME=social
PORT=4000
JWT_SECRET=change_me_in_real_use
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
BROWSER_URL=http://localhost:3000
```

### 9.3. `backend/package.json` [M2]

```json
{
  "name": "social-graph-backend",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "vitest run",
    "schema": "node ../database/scripts/init-schema.js",
    "seed": "node ../database/seed/load.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3", "cors": "^2.8.5", "csv-parse": "^5.5.6", "csv-stringify": "^6.5.0",
    "dotenv": "^16.4.5", "express": "^4.19.2", "falkordb": "latest", "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2", "morgan": "^1.10.0", "multer": "^1.4.5-lts.1",
    "nanoid": "^5.0.7", "zod": "^3.23.8"
  },
  "devDependencies": { "nodemon": "^3.1.4", "supertest": "^7.0.0", "vitest": "^2.0.0" }
}
```

### 9.4. `backend/src/config/env.js`, `db/graph.js` [M2, M1]

```js
// config/env.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env') });

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'dev',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  browserUrl: process.env.BROWSER_URL ?? 'http://localhost:3000',
  db: {
    host: process.env.FALKORDB_HOST ?? 'localhost',
    port: Number(process.env.FALKORDB_PORT ?? 6379),
    password: process.env.FALKORDB_PASSWORD || undefined,
    graph: process.env.GRAPH_NAME ?? 'social',
  },
};
```

```js
// db/graph.js
import { FalkorDB } from 'falkordb';
import { env } from '../config/env.js';

let client, graph;

export async function connectDb() {
  client = await FalkorDB.connect({
    socket: { host: env.db.host, port: env.db.port },
    password: env.db.password,
  });
  graph = client.selectGraph(env.db.graph);
  return graph;
}
export const getClient = () => client;
export const getGraph = () => {
  if (!graph) throw new Error('DB chưa kết nối');
  return graph;
};
export async function closeDb() { await client?.close(); }

export async function write(cypher, params = {}) {
  const res = await getGraph().query(cypher, { params });
  return res.data ?? [];
}
export async function read(cypher, params = {}) {
  const res = await getGraph().roQuery(cypher, { params });
  return res.data ?? [];
}
// Dùng cho benchmark: trả thêm thời gian đo phía client
export async function timed(cypher, params = {}) {
  const t0 = performance.now();
  const rows = await read(cypher, params);
  return { rows, ms: performance.now() - t0 };
}
```

### 9.5. `db/graphMapper.js` [M1] (đổi kết quả node/edge của client thành GraphDto)

```js
const hidden = new Set(['passwordHash']);
const clean = (props = {}) => Object.fromEntries(Object.entries(props).filter(([k]) => !hidden.has(k)));

export const nodeDto = (n) => ({ id: n.properties.id, label: n.labels[0], props: clean(n.properties) });

// rows có dạng [{a, r, b}] (a,b = node; r = edge). Xem mục 14 nếu tên field của client khác.
export function rowsToGraph(rows) {
  const nodes = new Map(), edges = new Map(), internal = new Map();
  const add = (n) => { internal.set(n.id, n.properties.id); if (!nodes.has(n.properties.id)) nodes.set(n.properties.id, nodeDto(n)); };
  for (const { a, b } of rows) { add(a); add(b); }
  for (const { r } of rows) {
    const s = internal.get(r.sourceId), t = internal.get(r.destinationId);
    const id = `${r.relationshipType}:${s}:${t}`;
    if (!edges.has(id)) edges.set(id, { id, type: r.relationshipType, source: s, target: t, props: clean(r.properties) });
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

// Cho BT1: ns/rs là mảng node/edge của path
export function pathToGraph({ ns, rs }) {
  const rows = rs.map((r, i) => ({ a: ns[i], r, b: ns[i + 1] }));
  return rowsToGraph(rows.length ? rows : [{ a: ns[0], r: null, b: ns[0] }]);
}
```

### 9.6. Một lát cắt dọc hoàn chỉnh (BT1) làm mẫu cho mọi tính năng

```js
// repositories/analytics.repo.js [M1]
import { read } from '../db/graph.js';
import { analytics } from '../queries/analytics.js';
import { pathToGraph } from '../db/graphMapper.js';

export async function shortestPath(a, b, maxDepth = 6) {
  const rows = await read(analytics.shortestPath(maxDepth), { a, b });
  if (!rows.length) return null;
  const { ns, rs, len } = rows[0];
  return { length: Number(len), steps: ns.map((n) => n.properties.username), graph: pathToGraph({ ns, rs }) };
}
```

```js
// services/path.service.js [M2]
import * as usersRepo from '../repositories/users.repo.js';
import * as analyticsRepo from '../repositories/analytics.repo.js';
import { NotFound } from '../utils/errors.js';

export async function findPath({ from, to, maxDepth = 6 }) {
  const [a, b] = await Promise.all([usersRepo.findByUsername(from), usersRepo.findByUsername(to)]);
  if (!a || !b) throw new NotFound('Tài khoản không tồn tại');
  if (from === to) return { found: true, length: 0, steps: [from], graph: { nodes: [], edges: [] } };
  const path = await analyticsRepo.shortestPath(from, to, maxDepth);
  if (!path) return { found: false, length: null, steps: [], graph: { nodes: [], edges: [] } };
  return { found: true, ...path };
}
```

```js
// routes/analytics.routes.js [M2]  — file *.routes.js được tự động nạp, không sửa routes/index.js
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { ok, asyncH } from '../utils/http.js';
import * as pathService from '../services/path.service.js';

export const prefix = '/';
const router = Router();
const pathQuery = z.object({
  from: z.string().min(1), to: z.string().min(1),
  maxDepth: z.coerce.number().int().min(1).max(6).default(6),
});
router.get('/path', requireAuth, validate(pathQuery, 'query'),
  asyncH(async (req, res) => ok(res, await pathService.findPath(req.query))));
export default router;
```

### 9.7. Middleware và tiện ích nền [M2]

```js
// utils/errors.js
export class AppError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export const NotFound = class extends AppError { constructor(m = 'Không tìm thấy') { super(404, 'NOT_FOUND', m); } };
export const Forbidden = class extends AppError { constructor(m = 'Không có quyền') { super(403, 'FORBIDDEN', m); } };
export const Unauth = class extends AppError { constructor(m = 'Chưa đăng nhập') { super(401, 'UNAUTHENTICATED', m); } };
export const Conflict = class extends AppError { constructor(m = 'Dữ liệu đã tồn tại') { super(409, 'CONFLICT', m); } };
export const Invalid = class extends AppError { constructor(m = 'Dữ liệu không hợp lệ') { super(400, 'VALIDATION_ERROR', m); } };
```

```js
// utils/http.js
export const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data });
export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const paginate = (q) => {
  const page = Math.max(1, Number(q.page ?? 1)), limit = Math.min(100, Number(q.limit ?? 20));
  return { page, limit, skip: (page - 1) * limit };
};
// Lấy limit+1 bản ghi từ repo, rồi gọi pageOf để tính hasMore
export const pageOf = (rows, { page, limit }) => ({ items: rows.slice(0, limit), page, limit, hasMore: rows.length > limit });
```

```js
// middlewares/auth.js
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Unauth } from '../utils/errors.js';

export function requireAuth(req, _res, next) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next(new Unauth());
  try { req.user = jwt.verify(token, env.jwtSecret); next(); }   // { id, username, role }
  catch { next(new Unauth('Phiên đăng nhập không hợp lệ hoặc đã hết hạn')); }
}
export const signToken = (u) => jwt.sign({ id: u.id, username: u.username, role: u.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
```

```js
// middlewares/rbac.js
import { Forbidden } from '../utils/errors.js';
export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new Forbidden());
// Dùng: router.get('/analytics/influence', requireAuth, requireRole('analyst','admin'), ...)
```

```js
// middlewares/validate.js
import { Invalid } from '../utils/errors.js';
export const validate = (schema, where = 'body') => (req, _res, next) => {
  const r = schema.safeParse(req[where]);
  if (!r.success) return next(new Invalid(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')));
  req[where] = r.data; next();
};
```

```js
// middlewares/error.js
export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? 500;
  if (status === 500) console.error(err);
  res.status(status).json({ ok: false, error: { code: err.code ?? 'INTERNAL', message: status === 500 ? 'Lỗi hệ thống' : err.message } });
}
```

```js
// middlewares/audit.js — ghi nhật ký thao tác ghi (POST/PUT/PATCH/DELETE) vào backend/data/audit.ndjson
import fs from 'node:fs'; import path from 'node:path';
const file = path.resolve('data/audit.ndjson');
export function audit(req, res, next) {
  res.on('finish', () => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFile(file, JSON.stringify({ at: Date.now(), userId: req.user?.id ?? null, username: req.user?.username ?? null,
      method: req.method, path: req.originalUrl.split('?')[0], status: res.statusCode }) + '\n', () => {});
  });
  next();
}
```

```js
// app.js
import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import morgan from 'morgan';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { env } from './config/env.js';
import { audit } from './middlewares/audit.js';
import { errorHandler } from './middlewares/error.js';

export async function createApp() {
  const app = express();
  app.use(helmet(), cors({ origin: env.corsOrigin }), express.json({ limit: '2mb' }), morgan('dev'));
  app.get('/api/health', (_q, r) => r.json({ ok: true, data: { db: 'up', graph: env.db.graph } }));

  // Tự động nạp mọi routes/*.routes.js → tránh xung đột merge ở file chung
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'routes');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.routes.js'))) {
    const m = await import(pathToFileURL(path.join(dir, f)).href);
    app.use('/api' + (m.prefix ?? '/'), audit, m.default);
  }
  app.use((_q, _r, next) => next(Object.assign(new Error('Không tìm thấy đường dẫn'), { status: 404, code: 'NOT_FOUND' })));
  app.use(errorHandler);
  return app;
}
```

```js
// server.js
import { createApp } from './app.js';
import { connectDb } from './db/graph.js';
import { env } from './config/env.js';
await connectDb();
const app = await createApp();
app.listen(env.port, () => console.log(`API http://localhost:${env.port}`));
```

> Lưu ý `audit` gắn trước `requireAuth` nên `req.user` có thể chưa có khi middleware chạy, nhưng vì ghi ở sự kiện `finish` nên `req.user` đã được gán xong. Không cần sửa.

### 9.8. Frontend nền [M3]

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: { extend: {
    colors: { bg: '#0B1020', ink: '#E6E9F5', muted: '#8B93B0',
      user: '#6366F1', post: '#22D3EE', topic: '#F59E0B', danger: '#F43F5E', good: '#10B981' },
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
    boxShadow: { glow: '0 0 40px -10px rgba(99,102,241,.6)' },
    backgroundImage: { accent: 'linear-gradient(135deg,#6366F1,#22D3EE)' },
  } },
};
```

```js
// src/api/client.js
import axios from 'axios';
import { useAuth } from '../store/auth';
export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api' });

http.interceptors.request.use((c) => {
  const t = useAuth.getState().token;
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
http.interceptors.response.use(
  (r) => r.data.data,                                   // bóc envelope: các hàm API trả thẳng `data`
  (e) => {
    if (e.response?.status === 401) useAuth.getState().logout();
    return Promise.reject(new Error(e.response?.data?.error?.message ?? 'Không kết nối được máy chủ'));
  },
);

if (import.meta.env.VITE_USE_MOCK === 'true') {
  const { installMock } = await import('./mock');
  installMock(http);
}
```

```js
// src/api/mock/index.js  — mỗi endpoint ở mục 6.2 thêm một dòng onXxx().reply(...)
import MockAdapter from 'axios-mock-adapter';
import path from './fixtures/path.json';
import graph from './fixtures/graph.json';

const ok = (data) => [200, { ok: true, data }];
export function installMock(http) {
  const m = new MockAdapter(http, { delayResponse: 400 });
  m.onGet('/path').reply(() => ok(path));
  m.onGet('/graph/subgraph').reply(() => ok(graph));
  // ... M3 bổ sung phần còn lại theo mục 6.2
}
```

```js
// src/lib/graphTheme.js
export const NODE = { User: '#6366F1', Post: '#22D3EE', Topic: '#F59E0B' };
export const EDGE = { FOLLOWS: '#6366F1', POSTED: '#94A3B8', ABOUT: '#F59E0B', LIKED: '#F43F5E',
  SHARED: '#10B981', COMMENTED: '#A78BFA', INTERESTED_IN: '#F59E0B' };

export const cyStyle = [
  { selector: 'node', style: { label: 'data(label)', color: '#E6E9F5', 'font-size': 10, 'text-valign': 'bottom', 'text-margin-y': 6,
      'background-color': 'data(color)', width: 'data(size)', height: 'data(size)', 'border-width': 2, 'border-color': 'rgba(255,255,255,.25)',
      'transition-property': 'opacity, border-width', 'transition-duration': '150ms' } },
  { selector: 'node[type = "Post"]',  style: { shape: 'round-rectangle' } },
  { selector: 'node[type = "Topic"]', style: { shape: 'hexagon' } },
  { selector: 'edge', style: { width: 1.5, 'line-color': 'data(color)', 'target-arrow-color': 'data(color)',
      'target-arrow-shape': 'triangle', 'curve-style': 'bezier', opacity: 0.7 } },
  { selector: '.dim', style: { opacity: 0.12 } },
  { selector: '.hl',  style: { 'border-width': 4, 'border-color': '#fff', opacity: 1 } },
  { selector: 'edge.flow', style: { 'line-style': 'dashed', width: 3, opacity: 1 } },
];
```

```jsx
// src/components/graph/GraphCanvas.jsx
import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { cyStyle, NODE, EDGE } from '../../lib/graphTheme';
cytoscape.use(fcose);

const sizeOf = (n) => n.label === 'User' ? 26 + Math.min(30, (n.props.followers ?? 0) * 0.3) : n.label === 'Post' ? 22 : 30;
const toEls = ({ nodes, edges }) => [
  ...nodes.map((n) => ({ data: { id: n.id, type: n.label, props: n.props, color: NODE[n.label],
      size: sizeOf(n), label: n.props.username ?? n.props.name ?? (n.props.content ?? '').slice(0, 18) } })),
  ...edges.map((e) => ({ data: { id: e.id, source: e.source, target: e.target, type: e.type, color: EDGE[e.type] } })),
];

/** props: graph(GraphDto), highlight(string[] id theo thứ tự), onNodeTap(node), hiddenTypes(Set) */
export default function GraphCanvas({ graph, highlight = [], onNodeTap, hiddenTypes = new Set() }) {
  const box = useRef(null), cy = useRef(null);

  useEffect(() => {
    cy.current = cytoscape({ container: box.current, style: cyStyle, wheelSensitivity: 0.2, minZoom: 0.2, maxZoom: 3 });
    cy.current.on('tap', 'node', (e) => onNodeTap?.(e.target.data()));
    cy.current.on('mouseover', 'node', (e) => {
      const n = e.target; cy.current.elements().addClass('dim');
      n.closedNeighborhood().removeClass('dim'); n.addClass('hl');
    });
    cy.current.on('mouseout', 'node', () => cy.current.elements().removeClass('dim hl'));
    return () => cy.current.destroy();
  }, []);

  useEffect(() => {              // merge dữ liệu mới, không xóa phần đang hiển thị
    const c = cy.current; if (!c || !graph) return;
    const have = new Set(c.elements().map((x) => x.id()));
    const add = toEls(graph).filter((e) => !have.has(e.data.id));
    if (!add.length) return;
    c.add(add);
    c.layout({ name: 'fcose', animate: true, animationDuration: 600, randomize: false, fit: true, padding: 40 }).run();
  }, [graph]);

  useEffect(() => {              // ẩn/hiện theo loại
    cy.current?.nodes().forEach((n) => n.style('display', hiddenTypes.has(n.data('type')) ? 'none' : 'element'));
  }, [hiddenTypes]);

  useEffect(() => {              // sáng dần theo thứ tự đường đi
    const c = cy.current; if (!c || !highlight.length) return;
    c.elements().addClass('dim');
    highlight.forEach((id, i) => setTimeout(() => {
      const n = c.getElementById(id); n.removeClass('dim').addClass('hl');
      if (i > 0) c.getElementById(highlight[i - 1]).edgesTo(n).removeClass('dim').addClass('flow');
    }, i * 350));
  }, [highlight]);

  return <div ref={box} className="h-full w-full rounded-2xl bg-[radial-gradient(rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:22px_22px]" />;
}
```

### 9.9. Seed (khung) [M1] — `database/seed/config.js` và `generate.js`

```js
// config.js
export const SCALES = {
  S:  { users: 1_000,     posts: 5_000,     topics: 50,  avgFollow: 15, likesPerPost: 6, seed: 42 },
  M:  { users: 10_000,    posts: 50_000,    topics: 100, avgFollow: 20, likesPerPost: 6, seed: 42 },
  L:  { users: 100_000,   posts: 500_000,   topics: 200, avgFollow: 20, likesPerPost: 5, seed: 42 },
  XL: { users: 1_000_000, posts: 5_000_000, topics: 500, avgFollow: 15, likesPerPost: 3, seed: 42 },
};
export const BATCH = 2000;
export const DEMO_ACCOUNTS = [   // luôn tạo, mật khẩu chung 'Passw0rd!'
  { username: 'admin',   role: 'admin',   fullName: 'Quản trị viên' },
  { username: 'analyst', role: 'analyst', fullName: 'Nhà phân tích' },
  { username: 'alice',   role: 'user',    fullName: 'Alice Nguyen' },
];
```

Yêu cầu `generate.js`: (1) `faker.seed(cfg.seed)`; (2) hash bcrypt **một lần** rồi dùng chung cho mọi user; (3) tạo follow theo **preferential attachment** (một số node có rất nhiều follower), loại tự follow và trùng cặp; (4) mỗi post: 1 tác giả, 1–3 topic (topic phân phối Zipf); (5) like/comment/share có `at` trong 90 ngày gần nhất (để BT2 có dữ liệu); (6) share có `via` hợp lệ; (7) `INTERESTED_IN` 2–5 topic/user, score 0..1; (8) xuất ra generator (stream) theo từng lô, **không** giữ toàn bộ mức L/XL trong RAM; (9) in ra thống kê node/cạnh/bậc lớn nhất sau khi nạp. `load.js` nạp theo thứ tự ở cuối mục 4.4 và đo thời gian, ghi `database/data/load-report-{scale}.json`.

---

## 10. Phân vai và vùng sở hữu (giảm xung đột, giảm chờ nhau)

| | **M1 — Data & Graph** | **M2 — Backend & Hệ thống** | **M3 — Frontend & UX** |
| --- | --- | --- | --- |
| Sở hữu thư mục | `database/`, `backend/src/queries`, `repositories`, `db/`, `benchmark/run-graph.js`, `docker-compose.yml` | `backend/src/{routes,services,middlewares,utils,config,app.js,server.js,tests}`, `benchmark/run-pg.js`, `run-concurrency.js` | `frontend/` |
| Chuyên môn | Cypher, mô hình đồ thị, seed, hiệu năng, FalkorDB Browser | API, auth, RBAC, logic gợi ý/xếp hạng, import/export, kiểm thử | UI/UX, trực quan hóa đồ thị, mock, hoạt ảnh |
| Phần demo | Browser, truy vấn cơ bản/nâng cao, sao lưu–phục hồi, hiệu năng | Quản trị người dùng, kết nối app–CSDL, nhập/xuất | Dẫn dắt demo trên giao diện: BT1–BT5, tìm kiếm, thống kê |
| Mục thang điểm | 5, 6, 7 (+1,2 phần Browser) | 8, 9 (phần nghiệp vụ) | 9 (phần giao diện), 4 |

**Hợp đồng giữa các vai (đã đóng băng ở Sprint 0):**
- M3 ↔ M2: bảng endpoint + DTO ở mục 6. M3 dùng mock, M2 không cần M3.
- M2 ↔ M1: hàm repository. Chữ ký hàm nằm ở bảng dưới. M2 không cần biết Cypher; M1 không cần biết HTTP.
- `database/lib/*` (importer/exporter/backup) là thư viện dùng chung: M1 viết, M2 chỉ import.

**Chữ ký repository (frozen):**

| File | Hàm |
| --- | --- |
| `users.repo.js` | `create(u)`, `findById(id)`, `findByUsername(name)`, `list({q,skip,limit})`, `update(id,f)`, `setStatus(id,s)`, `setRole(id,r)`, `remove(id)`, `profileStats(id)`, `followers(id,{skip,limit})`, `following(id,{skip,limit})`, `isFollowing(a,b)`, `search(q,limit)` |
| `posts.repo.js` | `create({uid,content,language,topicIds})`, `list({me,authorId,topic,since,skip,limit})`, `findById(id)`, `update(id,content)`, `replaceTopics(id,topicIds)`, `remove(id)`, `search(q,limit)` |
| `topics.repo.js` | `list()`, `upsertByName(name)`, `create/update/remove`, `setInterests(uid,items)`, `search(q,limit)` |
| `social.repo.js` | `follow(a,b)`, `unfollow(a,b)`, `hasLiked`, `like`, `unlike`, `comment`, `share`, `comments(pid,{skip,limit})`, `recount(pid)` |
| `analytics.repo.js` | `shortestPath(a,b,maxDepth)`, `trending(sinceMs)`→`[{id,name,likes,comments,shares}]`, `friendSuggestions(uid,limit)`, `popularUsers(uid,limit)`, `postSuggestions(uid,limit)`, `popularPosts(since,limit)`, `topFollowers(limit)`, `pageRank(limit)`, `allFollowEdges()`, `wcc()`, `spreadRows(pid)`, `neighborhood(id,limit)`, `overview(limit)` |
| `admin.repo.js` | `stats()`, `degreeBuckets()`, `integrity(now)`, `truncate()` |

Thư viện dùng chung `database/lib` (frozen):

```text
importer.js  : importCsv(kind, filePath) → {inserted}      importJson(filePath) → {nodes, edges}
exporter.js  : exportCsv(label, outPath) → {rows}          exportJson(outPath) → {nodes, edges}
backup.js    : createBackup() → {file,nodes,edges,sizeBytes}   listBackups()   restore(file) → {nodes,edges}
integrity.js : runChecks(now) → [{name,count,ok}]
```

---

## 11. Kế hoạch sprint

Ước lượng mỗi sprint **1 tuần** (Sprint 0 = 2 ngày, Sprint 5 = 4 ngày). **Mỗi sprint cuối có "Ngày tích hợp"**: M3 tắt mock cho các màn hình vừa xong, cả nhóm chạy thử chéo và sửa lỗi.

### 11.0. Definition of Done (mọi task)

Chạy được trên máy người khác bằng `README` · không phá build của người khác · có ghi chú cách thử (lệnh hoặc đường dẫn UI) trong PR · ảnh chụp màn hình/kết quả lưu vào `docs/evidence/` (dùng cho báo cáo) · PR được 1 người khác duyệt.

### Sprint 0 — Nền móng (2 ngày, cả 3 làm song song)

| Task | Người | Việc | Đầu ra | Phụ thuộc |
| --- | --- | --- | --- | --- |
| S0-1 | M1 | Tạo repo, `docker-compose.yml`, `.env.example`; chạy FalkorDB + Browser; `init-schema.js` (chỉ mục + ràng buộc); seed mini 20 user để dev | `docker compose up` OK, Browser đăng nhập được | **Làm đầu tiên.** Chỉ M2 cần chờ (task S0-2, bước chạy thử) |
| S0-2 | M2 | Copy base code backend (mục 9.3–9.7), `GET /api/health`, `/auth/register|login|me` (bcrypt+JWT) | `curl /api/health` trả `db: up` | Code không phụ thuộc ai; **chạy thử cần S0-1 xong** |
| S0-3 | M3 | Khởi tạo Vite+Tailwind, copy 9.8, layout sidebar theo vai trò, Login, router có guard, mock mode, fixtures đầu tiên | Chạy `VITE_USE_MOCK=true npm run dev` thấy khung app đẹp | Không phụ thuộc |
| S0-4 | M1+M2+M3 | **Đóng băng contract:** duyệt mục 6 và bảng repository mục 10; tạo nhánh `develop`, quy ước commit | PR "contract-freeze" merge | Cả 3 |

### Sprint 1 — CRUD cốt lõi + khung giao diện

**Thứ tự bắt buộc:** M1 xong T1-1, T1-2 **trước** khi M2 làm T1-6. M2 làm T1-3→T1-5 (không cần M1) trong lúc chờ.

| Task | Người | Việc | Đầu ra | Phụ thuộc |
| --- | --- | --- | --- | --- |
| T1-1 | M1 | Hoàn thiện `queries` + `repositories` cho users/posts/topics/social (mục 4.1–4.2), `graphMapper.js` | Test thử từng hàm repo bằng script | — |
| T1-2 | M1 | `seed/generate.js` + `load.js` mức **S**; `integrity.js` kiểm tra 9 ràng buộc; nạp S và báo cáo đếm | Graph S có dữ liệu, `integrity` toàn xanh | — |
| T1-3 | M2 | `validate`, `rbac`, `error`, `audit` middleware; `utils`; zod schemas | Middleware chạy với route thử | — |
| T1-4 | M2 | Service+route: users (UC-02), phân quyền, khóa tài khoản | `supertest` pass | Cần T1-1 (users repo) |
| T1-5 | M2 | Service+route: topics (UC-06), follow (UC-07), interests | — | Cần T1-1 |
| T1-6 | M2 | Service+route: posts (UC-05), like/comment/share + recount (UC-08), feed, comments | — | Cần T1-1 |
| T1-7 | M3 | Design system: Button, Card, Input, Modal, Toast, Skeleton, Avatar, Badge, Table | Trang `/ui-kit` xem được mọi component | — |
| T1-8 | M3 | Feed (đăng bài, post card có like/comment/share), Profile + follow, admin Users/Topics | Chạy hết trên mock | — |
| T1-9 | M1 | FalkorDB Browser: chuẩn bị file `docs/browser-queries.md` gồm truy vấn cơ bản (đếm node, bài của user, bài theo topic, followers, lọc theo thời gian) kèm ảnh chụp | Ảnh + câu truy vấn | Cần T1-2 (có dữ liệu) |

**Ngày tích hợp:** M3 bật `VITE_USE_MOCK=false` cho Login, Feed, Profile, Admin Users/Topics. Lỗi contract → sửa mục 6 qua PR chung.

### Sprint 2 — BT1–BT5 và trực quan hóa

**Thứ tự bắt buộc:** M1 làm **T2-1 ngày đầu** (xác nhận thuật toán nào chạy trên phiên bản đã cài: `shortestPath`, `algo.pageRank`, `algo.WCC`) và báo kết quả cho M2 trước khi M2 làm T2-5.

| Task | Người | Việc | Đầu ra | Phụ thuộc |
| --- | --- | --- | --- | --- |
| T2-1 | M1 | Kiểm tra cú pháp BT1–BT5 trên Browser; ghi bảng "chạy được / phải fallback" vào mục 14 | Bảng kết quả kiểm chứng | — (**ưu tiên số 1**) |
| T2-2 | M1 | `analytics.repo.js` đầy đủ (path, trending, friend/post suggestion, influence, spread, neighborhood, overview) | Test script từng hàm | — |
| T2-3 | M1 | Seed mức **M**; `GRAPH.EXPLAIN/PROFILE` cho BT1–BT5 trên M, lưu kết quả | `docs/explain/*.txt` | Cần T2-2 |
| T2-4 | M2 | Service+route: `/path` (UC-09), `/topics/trending`, `/graph/subgraph`, `/search`, `/stats` | `supertest` pass | Cần T2-2 |
| T2-5 | M2 | Service+route: `/recommend/friends|posts` (kèm cold start), `/analytics/influence|communities|spread`; `utils/graphAlgos.js` (PageRank, WCC/label propagation dạng fallback); cache TTL 60s cho trending/influence | Fallback chạy được khi `algo.*` thiếu | Cần T2-1 và T2-2 |
| T2-6 | M3 | `GraphCanvas`, `/explore` (lọc, panel chi tiết, mở rộng láng giềng), `/path` | Chạy trên mock | — |
| T2-7 | M3 | `/trending`, `/discover` (gợi ý bạn + bài), khung gợi ý ở Feed, ô tìm kiếm Ctrl+K | Chạy trên mock | — |
| T2-8 | M1 | Browser: truy vấn nâng cao BT1–BT5 có ảnh kết quả đồ thị + bảng, tùy biến màu/nhãn node trong Browser | `docs/browser-queries.md` bổ sung | Cần T2-1 |

**Ngày tích hợp:** bật API thật cho `/path`, `/trending`, `/discover`, `/explore`; so kết quả UI với kết quả trong Browser (phải khớp).

### Sprint 3 — Quản trị dữ liệu và phân tích nâng cao

**Thứ tự bắt buộc:** M1 làm T3-1 (importer/exporter/backup) **trước**; M2 làm T3-3 trên chữ ký hàm đã đóng băng (mục 10) rồi nối vào thư viện thật khi M1 xong.

| Task | Người | Việc | Đầu ra | Phụ thuộc |
| --- | --- | --- | --- | --- |
| T3-1 | M1 | `database/lib/importer|exporter|backup|integrity` (CSV 6 loại, JSON toàn graph, backup logic = dump JSON, restore = xóa + nạp lại, đối chiếu số node/cạnh) | Chạy được bằng CLI | — |
| T3-2 | M1 | Sao lưu vật lý: `backup.sh` (BGSAVE + copy dump.rdb từ volume), `restore.sh` (dừng, thay, khởi động); thử nghiệm đối chiếu; seed mức **L** | `docs/backup-restore.md` có ảnh | — |
| T3-3 | M2 | Route admin: `/admin/import|export|seed|integrity|backup(s)|restore|audit` (multer, stream file) | `supertest` + thử tay | Cần chữ ký `database/lib` (đã có); nối thật khi T3-1 xong |
| T3-4 | M2 | Hoàn thiện RBAC toàn hệ thống (ma trận mục 6), kiểm thử 3 vai trò × endpoint, test lỗi 401/403/404/409 | Bảng test phân quyền | — |
| T3-5 | M2 | Bắt đầu bộ test case TC-xx cho mọi UC (bình thường + lỗi) dạng `vitest` | `tests/*.test.js` | — |
| T3-6 | M3 | `/admin/data` (nhập/xuất/seed/integrity), `/admin/backup` (stepper 4 bước), `/admin/audit` | Chạy trên mock | — |
| T3-7 | M3 | `/analytics` (influence, communities, cây spread), `/dashboard` (thẻ số liệu, biểu đồ phân phối bậc), nút "Mở FalkorDB Browser" | Chạy trên mock | — |

**Ngày tích hợp:** diễn tập nguyên chuỗi **Sao lưu → Xóa graph → Phục hồi → Đối chiếu** qua UI. Số node/cạnh phải khớp 100%.

### Sprint 4 — Hiệu năng, so sánh và chất lượng

| Task | Người | Việc | Đầu ra | Phụ thuộc |
| --- | --- | --- | --- | --- |
| T4-1 | M1 | `benchmark/run-graph.js`: BT1–BT5 × quy mô S/M/L(/XL) × độ sâu 1..6; bỏ 5 lần đầu (warm-up), lặp ≥ 30, ghi trung bình/trung vị/p95 | `benchmark/results/graph-*.json` | Cần seed L |
| T4-2 | M1 | Bảng EXPLAIN/PROFILE trước–sau khi thêm chỉ mục, nêu toán tử tốn nhất và cách giảm | `docs/explain/before-after.md` | — |
| T4-3 | M2 | PostgreSQL đối chứng: profile `bench`, schema quan hệ, nạp cùng dữ liệu từ CSV export, SQL tương đương BT1, BT3 (CTE đệ quy), BT5, cùng chỉ mục | `benchmark/run-pg.js`, `results/pg-*.json` | Cần CSV export của M1 (T3-1) |
| T4-4 | M2 | `run-concurrency.js` (autocannon: 1,10,50,100 kết nối) trên `/path`, `/recommend/friends`; gộp kết quả thành `summary.json` + `GET /benchmark` | Số liệu có sẵn cho trang UI | Cần T4-1 và T4-3 (gộp) |
| T4-5 | M2 | Hoàn tất test case (≥ 1 bình thường + 1 lỗi mỗi UC), sửa lỗi phát hiện | Báo cáo test | — |
| T4-6 | M3 | `/benchmark` (bảng + biểu đồ độ trễ theo quy mô/độ sâu, so sánh Graph vs PostgreSQL, tải đồng thời), trên mock rồi nối `GET /benchmark` | Trang đẹp, đọc được ngay | Mock không cần ai; dữ liệu thật cần T4-4 |
| T4-7 | M3 | Đánh bóng: hoạt ảnh, responsive tablet, trạng thái lỗi/rỗng, a11y cơ bản, chế độ sáng (nếu còn thời gian) | Danh sách kiểm UI đạt | — |

**Ngày tích hợp:** chạy lại toàn bộ trên dữ liệu M, đối chiếu NFR (p95: 1 bước < 50 ms, 2–3 bước < 200 ms, path ≤ 6 < 500 ms; điều chỉnh theo số đo thật).

### Sprint 5 — Đóng gói và tổng duyệt (4 ngày)

| Task | Người | Việc | Đầu ra | Phụ thuộc |
| --- | --- | --- | --- | --- |
| T5-1 | M1 | Dockerfile backend + frontend, mở rộng compose để `docker compose up` chạy toàn bộ; gói dữ liệu mẫu + bản sao lưu mẫu | Máy sạch chạy được 1 lệnh | Cần T5-2 (README chéo) |
| T5-2 | M2 | README (cài đặt, tài khoản demo, lệnh); xuất `docs/API.md` từ mục 6; sửa lỗi cuối | README test được bởi người khác | — |
| T5-3 | M3 | Kịch bản demo 10–12 phút (thời gian từng phần + người nói), quay video dự phòng, chụp ảnh UI cho báo cáo | `docs/demo-script.md` + video | — |
| T5-4 | Cả 3 | Diễn tập chéo 2 lần, mỗi người trả lời được câu hỏi về phần của người khác | Checklist ký tên | Mọi task trên |

---

## 12. Dữ liệu mẫu

Tài khoản demo luôn tồn tại (mật khẩu `Passw0rd!`): `admin` (admin), `analyst` (analyst), `alice` (user). Seed cố định `seed=42` để tái lập. Bốn mức quy mô trong `SCALES` (mục 9.9); điền số cạnh thực tế vào `docs/scale-table.md` sau khi nạp.

---

## 13. Kiểm thử, benchmark, checklist demo

### 13.1. Test case tối thiểu (viết bằng `vitest` + `supertest`)

| UC | Bình thường | Lỗi |
| --- | --- | --- |
| UC-01 | Login đúng → token | Sai mật khẩu → 401; tài khoản khóa → 403 |
| UC-02 | Admin tạo user | User thường gọi `POST /users` → 403; trùng username → 409 |
| UC-05 | Đăng bài có topic | Nội dung rỗng → 400; sửa bài người khác → 403 |
| UC-07 | Follow rồi unfollow | Tự follow → 400 |
| UC-08 | Like 2 lần chỉ ra 1 cạnh; recount đúng | Like bài không tồn tại → 404 |
| UC-09 | Path giữa 2 người có kết nối | Tên không tồn tại → 404; không có đường → `found:false` |
| UC-10 | Trending 7 ngày trả ≤ limit, sắp xếp giảm dần | `days=0` → 400 |
| UC-11 | Gợi ý không chứa người đã follow và chính mình | User mới → fallback `popularUsers` |
| UC-12 | Gợi ý không chứa bài đã like | User mới → fallback `popularPosts` |
| UC-13/14 | Analyst xem được | User thường → 403 |
| UC-15 | Import CSV → `after - before = inserted` | File sai cột → 400 |
| UC-17 | Backup → truncate → restore → số node/cạnh khớp | Restore file không tồn tại → 404 |

### 13.2. Checklist trước demo

- `docker compose up` chạy sạch trên máy mới; có bản sao lưu dữ liệu mẫu để phục hồi nhanh.
- Mức M đã nạp; 3 tài khoản demo đăng nhập được; `GET /admin/integrity` toàn xanh.
- Video quay sẵn toàn bộ demo; mỗi người nắm phần mình và trả lời được về mô hình dữ liệu, truy vấn, sao lưu.

---

## 14. Những điểm PHẢI kiểm chứng trên phiên bản FalkorDB đã cài (M1 làm ở T2-1, ghi kết quả vào bảng dưới)

| Mục | Cần kiểm tra | Phương án dự phòng | Kết quả |
| --- | --- | --- | --- |
| Đường dẫn volume dữ liệu | `redis-cli CONFIG GET dir` | Sửa mount trong compose | Điền sau |
| Browser đi kèm image, cổng 3000 | Mở `http://localhost:3000`, đăng nhập | Thêm service `falkordb-browser` riêng | Điền sau |
| Tên field của node/edge trong client Node (`labels`, `properties`, `relationshipType`, `sourceId`, `destinationId`) | In thử một kết quả `MATCH (a)-[r]->(b) RETURN a,r,b LIMIT 1` | Chỉ sửa `db/graphMapper.js` | Điền sau |
| Cú pháp `GRAPH.CONSTRAINT CREATE ... UNIQUE` và gọi qua client (`getClient().sendCommand([...])` hoặc API riêng) | Chạy trên Browser/redis-cli | Chỉ dùng `MERGE` + kiểm tra ở service | Điền sau |
| `shortestPath((a)-[:FOLLOWS*..N]->(b))`, `nodes(p)`, `relationships(p)` | Chạy BT1 | Dùng `algo.BFS` hoặc BFS ở backend | Điền sau |
| `algo.pageRank('User','FOLLOWS')` | Chạy thử | `utils/graphAlgos.js` (power iteration, d=0,85, 20 vòng) | Điền sau |
| `algo.WCC(...)` / thuật toán cộng đồng | Chạy thử | Label propagation ở backend trên `allFollowEdges` | Điền sau |
| Pattern predicate `NOT (me)-[:FOLLOWS]->(c)` trong `WHERE` | Chạy BT3 | Thay bằng `OPTIONAL MATCH` + `WHERE x IS NULL` | Điền sau |
| `toLower`, `CONTAINS`, `coalesce`, `properties(n)`, `labels(n)[0]`, `UNWIND` + `MATCH` | Chạy từng câu ở mục 4 | Sửa `queries/*` | Điền sau |
| Ghi nhận phiên bản FalkorDB, Node, Docker, cấu hình máy (RAM/CPU) | `GRAPH.INFO`/`INFO server` | — | Điền sau |

---

## Phụ lục: bằng chứng cần thu thập theo sprint (để viết báo cáo sau, không làm chậm dev)

| Sprint | Chụp/lưu vào `docs/evidence/` |
| --- | --- |
| 0 | Browser lần đầu đăng nhập; `docker compose up` |
| 1 | Lược đồ graph trong Browser; kết quả truy vấn cơ bản (đồ thị + bảng); `integrity` toàn xanh |
| 2 | BT1–BT5 trong Browser và trong app (cùng input, cùng kết quả); `GRAPH.EXPLAIN/PROFILE` |
| 3 | Chuỗi sao lưu–xóa–phục hồi–đối chiếu; nhập/xuất ít nhất 2 đường mỗi chiều |
| 4 | Bảng và biểu đồ hiệu năng; so sánh Graph vs PostgreSQL; kết quả test case |
| 5 | Ảnh mọi màn hình chính theo từng UC; video demo |
