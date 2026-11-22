export const users = {
  create: `CREATE (u:User {id:$id, username:$username, fullName:$fullName, email:$email,
    bio:$bio, country:$country, joinedAt:$now, isVerified:false, role:$role,
    status:'active', passwordHash:$passwordHash}) RETURN u`,

  findById: `MATCH (u:User {id:$id}) RETURN u`,
  // Dùng cho mỗi request đã xác thực: chỉ lấy vai trò và trạng thái hiện tại
  authState: `MATCH (u:User {id:$id}) RETURN u.role AS role, u.status AS status`,
  findByUsername: `MATCH (u:User {username:$username}) RETURN u`,

  list: `MATCH (u:User)
    WHERE $q = '' OR toLower(u.username) CONTAINS toLower($q) OR toLower(u.fullName) CONTAINS toLower($q)
    RETURN u ORDER BY u.joinedAt DESC SKIP $skip LIMIT $limit`,

  // Trang quản trị: tìm + lọc vai trò/trạng thái, kèm số người theo dõi và số bài viết thật.
  // $q đã hạ chữ thường; $role/$status = '' nghĩa là không lọc.
  adminList: `MATCH (u:User)
    WHERE ($q = '' OR toLower(u.username) CONTAINS $q OR toLower(u.fullName) CONTAINS $q OR toLower(coalesce(u.email,'')) CONTAINS $q)
      AND ($role = '' OR coalesce(u.role,'user') = $role)
      AND ($status = '' OR coalesce(u.status,'active') = $status)
    WITH u ORDER BY u.joinedAt DESC, u.id SKIP $skip LIMIT $limit
    OPTIONAL MATCH (u)<-[:FOLLOWS]-(f:User) WITH u, count(f) AS followers
    OPTIONAL MATCH (u)-[:POSTED]->(p:Post) WITH u, followers, count(p) AS posts
    RETURN u, followers, posts
    ORDER BY u.joinedAt DESC, u.id`,
  adminCount: `MATCH (u:User)
    WHERE ($q = '' OR toLower(u.username) CONTAINS $q OR toLower(u.fullName) CONTAINS $q OR toLower(coalesce(u.email,'')) CONTAINS $q)
      AND ($role = '' OR coalesce(u.role,'user') = $role)
      AND ($status = '' OR coalesce(u.status,'active') = $status)
    RETURN count(u) AS total`,

  update: `MATCH (u:User {id:$id})
    SET u.fullName=$fullName, u.bio=$bio, u.country=$country, u.email=$email RETURN u`,

  setStatus: `MATCH (u:User {id:$id}) SET u.status=$status RETURN u`,
  setRole:   `MATCH (u:User {id:$id}) SET u.role=$role RETURN u`,
  setPassword: `MATCH (u:User {id:$id}) SET u.passwordHash=$passwordHash RETURN u.id AS id`,
  // Bài viết của người khác mà người này đã thích/bình luận/chia sẻ: cần tính lại bộ đếm sau khi xóa
  touchedPosts: `MATCH (u:User {id:$id})-[:LIKED|COMMENTED|SHARED]->(p:Post)
    WHERE NOT (u)-[:POSTED]->(p) RETURN DISTINCT p.id AS id`,
  // Xóa tài khoản kèm bài viết của họ (tránh để lại Post không có tác giả)
  removePosts: `MATCH (:User {id:$id})-[:POSTED]->(p:Post) DETACH DELETE p`,
  remove:    `MATCH (u:User {id:$id}) DETACH DELETE u`,

  profileStats: `MATCH (u:User {id:$id})
    OPTIONAL MATCH (u)<-[:FOLLOWS]-(f:User) WITH u, count(f) AS followers
    OPTIONAL MATCH (u)-[:FOLLOWS]->(g:User) WITH u, followers, count(g) AS following
    OPTIONAL MATCH (u)-[:POSTED]->(p:Post) WITH u, followers, following, count(p) AS posts
    OPTIONAL MATCH (u)-[s:SHARED]->(:Post)
    RETURN u, followers, following, posts, count(s) AS shares`,

  followers: `MATCH (:User {id:$id})<-[f:FOLLOWS]-(x:User) RETURN x, f.since AS since ORDER BY since DESC SKIP $skip LIMIT $limit`,
  following: `MATCH (:User {id:$id})-[f:FOLLOWS]->(x:User) RETURN x, f.since AS since ORDER BY since DESC SKIP $skip LIMIT $limit`,
  isFollowing: `MATCH (:User {id:$a})-[f:FOLLOWS]->(:User {id:$b}) RETURN count(f) AS c`,
  search: `MATCH (u:User) WHERE toLower(u.username) CONTAINS toLower($q) OR toLower(u.fullName) CONTAINS toLower($q)
    RETURN u LIMIT $limit`,
};
