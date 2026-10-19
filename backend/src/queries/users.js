export const users = {
  create: `CREATE (u:User {id:$id, username:$username, fullName:$fullName, email:$email,
    bio:$bio, country:$country, joinedAt:$now, isVerified:false, role:$role,
    status:'active', passwordHash:$passwordHash}) RETURN u`,

  findById: `MATCH (u:User {id:$id}) RETURN u`,
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
