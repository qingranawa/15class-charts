-- 15班排行榜 D1 数据库建表 SQL

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  vote_balance INTEGER DEFAULT 10,
  last_vote_refill TEXT DEFAULT (datetime('now')),
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

-- 投诉/仲裁表
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER REFERENCES entries(id) ON DELETE CASCADE,
  reporter_id INTEGER REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  resolution TEXT,
  resolved_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
