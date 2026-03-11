-- Additional tables for platform integrations
-- Run with: npx wrangler d1 execute superinstance-db --file=scripts/add-integration-tables.sql

-- Subscriptions table for newsletter management
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  subscribed_at INTEGER NOT NULL,
  unsubscribed_at INTEGER,
  source TEXT,
  tags TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- User notifications preferences
CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  channels TEXT,
  frequency TEXT DEFAULT 'immediate',
  preferences TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, notification_type)
);

-- System integrations configuration
CREATE TABLE IF NOT EXISTS system_integrations (
  id TEXT PRIMARY KEY,
  service_name TEXT UNIQUE NOT NULL,
  config TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  last_checked INTEGER,
  error_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- GitHub releases and updates
CREATE TABLE IF NOT EXISTS github_releases (
  id TEXT PRIMARY KEY,
  repo_name TEXT NOT NULL,
  release_tag TEXT NOT NULL,
  release_name TEXT,
  release_body TEXT,
  published_at TEXT NOT NULL,
  author TEXT,
  prerelease BOOLEAN DEFAULT FALSE,
  draft BOOLEAN DEFAULT FALSE,
  data TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(repo_name, release_tag)
);

-- Search queries analytics
CREATE TABLE IF NOT EXISTS search_queries (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  user_id TEXT,
  results_count INTEGER DEFAULT 0,
  clicked_results TEXT,
  session_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON system_integrations(status);
CREATE INDEX IF NOT EXISTS idx_github_releases_repo ON github_releases(repo_name);
CREATE INDEX IF NOT EXISTS idx_github_releases_published ON github_releases(published_at);
CREATE INDEX IF NOT EXISTS idx_search_queries_created ON search_queries(created_at);
CREATE INDEX IF NOT EXISTS idx_search_queries_user ON search_queries(user_id);

-- Insert default integrations if not exists
INSERT OR IGNORE INTO system_integrations (id, service_name, config, created_at) VALUES
  ('int-1', 'buttondown', '{"name": "Buttondown Newsletter", "endpoint": "https://api.buttondown.email/v1"}', strftime('%s', 'now')),
  ('int-2', 'github', '{"name": "GitHub API", "endpoint": "https://api.github.com"}', strftime('%s', 'now')),
  ('int-3', 'plausible', '{"name": "Plausible Analytics", "endpoint": "https://plausible.io/api"}', strftime('%s', 'now')),
  ('int-4', 'mail_forward', '{"name": "Email Forwarding", "regex": ".*@superinstance\\.ai$"}', strftime('%s', 'now'));

PRAGMA foreign_keys = ON;