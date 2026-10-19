CREATE INDEX FOR (u:User) ON (u.id);
CREATE INDEX FOR (u:User) ON (u.username);
CREATE INDEX FOR (p:Post) ON (p.id);
CREATE INDEX FOR (p:Post) ON (p.createdAt);
CREATE INDEX FOR (t:Topic) ON (t.id);
CREATE INDEX FOR (t:Topic) ON (t.name);
