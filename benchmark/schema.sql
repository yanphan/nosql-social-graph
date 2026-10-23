-- Schema đối chứng quan hệ PostgreSQL (Profile "bench")
-- Phục vụ đo đạc hiệu năng CTE đệ quy so với FalkorDB Cypher

DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS shares CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS post_topics CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Bảng Users
CREATE TABLE users (
    id VARCHAR(32) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100),
    bio TEXT,
    country VARCHAR(50),
    joined_at BIGINT NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active'
);
CREATE INDEX idx_users_username ON users(username);

-- 2. Bảng Topics
CREATE TABLE topics (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);
CREATE INDEX idx_topics_name ON topics(name);

-- 3. Bảng Posts
CREATE TABLE posts (
    id VARCHAR(32) PRIMARY KEY,
    author_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    language VARCHAR(10) DEFAULT 'vi',
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    share_count INT DEFAULT 0
);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- 4. Bảng liên kết Post - Topic (ABOUT)
CREATE TABLE post_topics (
    post_id VARCHAR(32) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    topic_id VARCHAR(32) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    weight NUMERIC(3, 2) DEFAULT 1.0,
    PRIMARY KEY (post_id, topic_id)
);
CREATE INDEX idx_post_topics_topic ON post_topics(topic_id);

-- 5. Bảng Follows (FOLLOWS)
CREATE TABLE follows (
    follower_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    since BIGINT NOT NULL,
    PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_followee ON follows(followee_id);

-- 6. Bảng Likes (LIKED)
CREATE TABLE likes (
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id VARCHAR(32) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    at BIGINT NOT NULL,
    PRIMARY KEY (user_id, post_id)
);
CREATE INDEX idx_likes_post ON likes(post_id);

-- 7. Bảng Comments (COMMENTED)
CREATE TABLE comments (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id VARCHAR(32) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    at BIGINT NOT NULL
);
CREATE INDEX idx_comments_post ON comments(post_id);

-- 8. Bảng Shares (SHARED)
CREATE TABLE shares (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id VARCHAR(32) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    via VARCHAR(32),
    at BIGINT NOT NULL
);
CREATE INDEX idx_shares_post ON shares(post_id);

-- 9. Bảng Interests (INTERESTED_IN)
CREATE TABLE interests (
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id VARCHAR(32) NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    score NUMERIC(3, 2) DEFAULT 0.5,
    PRIMARY KEY (user_id, topic_id)
);
CREATE INDEX idx_interests_topic ON interests(topic_id);
