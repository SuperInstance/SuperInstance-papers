-- SuperInstance Database Schema
-- Run with: npx wrangler d1 execute superinstance-db --file=scripts/init-db.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  hashed_password TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  profile_data TEXT,
  learning_preferences TEXT
);

-- Progress table
CREATE TABLE IF NOT EXISTS progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tutorial_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completion_date INTEGER,
  score INTEGER,
  attempts INTEGER DEFAULT 0,
  last_attempt INTEGER,
  state_data TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, tutorial_id)
);

-- Pathways table
CREATE TABLE IF NOT EXISTS pathways (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pathway_id TEXT NOT NULL,
  current_step INTEGER DEFAULT 0,
  completed_steps TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, pathway_id)
);

-- Content access table
CREATE TABLE IF NOT EXISTS content_access (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  accessed_at INTEGER NOT NULL,
  duration INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_name TEXT NOT NULL,
  event_data TEXT,
  category TEXT,
  path TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at INTEGER NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_tutorial_id ON progress(tutorial_id);
CREATE INDEX IF NOT EXISTS idx_pathways_user_id ON pathways(user_id);
CREATE INDEX IF NOT EXISTS idx_content_access_user_id ON content_access(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Insert default learning pathways (optional)
INSERT OR IGNORE INTO pathways (id, user_id, pathway_id, current_step, started_at) VALUES
  ('default-path-1', 'system', 'getting-started', 0, strftime('%s', 'now')),
  ('default-path-2', 'system', 'superinstance-basics', 0, strftime('%s', 'now')),
  ('default-path-3', 'system', 'advanced-concepts', 0, strftime('%s', 'now'));

-- Insert default tutorials (optional)
INSERT OR IGNORE INTO progress (id, user_id, tutorial_id, completed, attempts) VALUES
  ('default-tut-1', 'system', 'welcome', 1, 1),
  ('default-tut-2', 'system', 'universal-cells', 0, 0),
  ('default-tut-3', 'system', 'rate-based-change', 0, 0);

PRAGMA foreign_keys = ON;

-- Verify tables were created
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;