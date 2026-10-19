// 6 Indexes
CREATE INDEX FOR (u:User) ON (u.id);
CREATE INDEX FOR (u:User) ON (u.username);
CREATE INDEX FOR (p:Post) ON (p.id);
CREATE INDEX FOR (p:Post) ON (p.createdAt);
CREATE INDEX FOR (t:Topic) ON (t.id);
CREATE INDEX FOR (t:Topic) ON (t.name);

// 5 Unique Constraints (executed via FalkorDB redis command or client sendCommand)
// GRAPH.CONSTRAINT CREATE social UNIQUE NODE User PROPERTIES 1 id
// GRAPH.CONSTRAINT CREATE social UNIQUE NODE User PROPERTIES 1 username
// GRAPH.CONSTRAINT CREATE social UNIQUE NODE Post PROPERTIES 1 id
// GRAPH.CONSTRAINT CREATE social UNIQUE NODE Topic PROPERTIES 1 id
// GRAPH.CONSTRAINT CREATE social UNIQUE NODE Topic PROPERTIES 1 name

