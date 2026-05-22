-- 天津操蛋孩子榜 D1 数据库建表 SQL

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  score INTEGER DEFAULT 0,
  submitted_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER REFERENCES entries(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  value INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(entry_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_entries_score ON entries(score DESC);
CREATE INDEX IF NOT EXISTS idx_votes_entry ON votes(entry_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_entry ON votes(user_id, entry_id);
