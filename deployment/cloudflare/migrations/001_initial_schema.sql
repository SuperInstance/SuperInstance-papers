-- SpreadsheetMoment - Initial Database Schema
-- D1 Database Migration
-- Version: 1.0.0
-- Date: 2026-03-14

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  subscription_tier TEXT DEFAULT 'free',
  usage_quota INTEGER DEFAULT 1000,
  preferences TEXT -- JSON: {"theme": "dark", "notifications": true, ...}
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_tier);

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  settings TEXT -- JSON: {"theme": "dark", "permissions": {...}}
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

-- Workspace collaborators
CREATE TABLE IF NOT EXISTS workspace_collaborators (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'owner', 'editor', 'viewer', 'commenter'
  invited_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collabs_workspace ON workspace_collaborators(workspace_id);
CREATE INDEX IF NOT EXISTS idx_collabs_user ON workspace_collaborators(user_id);

-- Tensor cells
CREATE TABLE IF NOT EXISTS tensor_cells (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES tensor_cells(id), -- For nested cells
  name TEXT NOT NULL,
  value TEXT, -- JSON encoded value
  data_type TEXT NOT NULL, -- 'number', 'string', 'boolean', 'vector', 'tensor'

  -- Temperature tracking
  temperature REAL DEFAULT 0.0,
  last_accessed TEXT,
  access_count INTEGER DEFAULT 0,

  -- Tensor properties
  dimensions TEXT, -- JSON array: ["sheet1", "page1"]
  coordinates TEXT, -- JSON array: [0, 0]

  -- Computation
  formula TEXT,
  dependencies TEXT, -- JSON array: ["cell_id1", "cell_id2"]
  is_computed INTEGER DEFAULT 0,

  -- Visualization
  page_visibility TEXT, -- JSON array: ["page1", "page2"]
  display_config TEXT, -- JSON: {"color": "blue", "size": "large"}

  -- Hardware integration
  hardware_connected INTEGER DEFAULT 0,
  hardware_device_id TEXT,

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id),
  tags TEXT -- JSON array: ["important", "finance"]
);

CREATE INDEX IF NOT EXISTS idx_cells_workspace ON tensor_cells(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cells_parent ON tensor_cells(parent_id);
CREATE INDEX IF NOT EXISTS idx_cells_temperature ON tensor_cells(temperature DESC);
CREATE INDEX IF NOT EXISTS idx_cells_hardware ON tensor_cells(hardware_connected);
CREATE INDEX IF NOT EXISTS idx_cells_updated ON tensor_cells(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cells_type ON tensor_cells(data_type);

-- Vector connections
CREATE TABLE IF NOT EXISTS vector_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_cell_id TEXT NOT NULL REFERENCES tensor_cells(id) ON DELETE CASCADE,
  target_cell_id TEXT NOT NULL REFERENCES tensor_cells(id) ON DELETE CASCADE,
  strength REAL DEFAULT 1.0,
  direction TEXT DEFAULT 'bidirectional', -- 'unidirectional', 'bidirectional'
  transform_function TEXT, -- Name of transform function
  metadata TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vectors_source ON vector_connections(source_cell_id);
CREATE INDEX IF NOT EXISTS idx_vectors_target ON vector_connections(target_cell_id);
CREATE INDEX IF NOT EXISTS idx_vectors_workspace ON vector_connections(workspace_id);

-- Dashboard pages
CREATE TABLE IF NOT EXISTS dashboard_pages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  page_type TEXT NOT NULL, -- 'logic', 'display', 'analysis', 'simulation'
  layout_config TEXT NOT NULL, -- JSON: UI layout
  visible_cells TEXT NOT NULL, -- JSON array of cell IDs
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pages_workspace ON dashboard_pages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pages_type ON dashboard_pages(page_type);

-- NLP queries
CREATE TABLE IF NOT EXISTS nlp_queries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  query TEXT NOT NULL,
  query_type TEXT NOT NULL, -- 'search', 'what-if', 'generate', 'transform'
  result TEXT, -- JSON encoded result
  latency_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nlp_user ON nlp_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_nlp_workspace ON nlp_queries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_nlp_created ON nlp_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nlp_type ON nlp_queries(query_type);

-- Hardware connections
CREATE TABLE IF NOT EXISTS hardware_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL, -- 'arduino', 'esp32', 'jetson', 'raspberry_pi'
  endpoint_url TEXT NOT NULL,
  auth_token TEXT, -- Encrypted
  connected_cells TEXT, -- JSON array of cell IDs
  last_heartbeat TEXT,
  status TEXT DEFAULT 'offline', -- 'online', 'offline', 'error'
  config TEXT, -- JSON: device-specific config
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hardware_workspace ON hardware_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hardware_status ON hardware_connections(status);
CREATE INDEX IF NOT EXISTS idx_hardware_heartbeat ON hardware_connections(last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_hardware_user ON hardware_connections(user_id);

-- API keys
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash
  scopes TEXT NOT NULL, -- JSON array: ["read:workspaces", "write:cells"]
  last_used TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at);

-- What-if scenarios
CREATE TABLE IF NOT EXISTS what_if_scenarios (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  base_state TEXT NOT NULL, -- JSON: snapshot of base cell values
  modifications TEXT NOT NULL, -- JSON: cell modifications
  results TEXT, -- JSON: computed results
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'error'
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_scenarios_workspace ON what_if_scenarios(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON what_if_scenarios(status);
CREATE INDEX IF NOT EXISTS idx_scenarios_created ON what_if_scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenarios_created_by ON what_if_scenarios(created_by);

-- Usage logs
CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  action TEXT NOT NULL, -- 'cell_read', 'cell_update', 'nlp_query', 'hardware_read'
  resource_type TEXT, -- 'cell', 'page', 'workspace', 'hardware'
  resource_id TEXT,
  metadata TEXT, -- JSON: additional context
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_workspace ON usage_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_action ON usage_logs(action);

-- Backups metadata
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  backup_type TEXT NOT NULL, -- 'manual', 'scheduled'
  r2_key TEXT NOT NULL,
  size_bytes INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_backups_workspace ON backups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_backups_created ON backups(created_at DESC);

-- Sessions (for tracking active user sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  workspace_id TEXT REFERENCES workspaces(id),
  started_at TEXT DEFAULT (datetime('now')),
  last_activity TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'active' -- 'active', 'expired', 'terminated'
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON sessions(last_activity DESC);

-- Cell history (audit trail)
CREATE TABLE IF NOT EXISTS cell_history (
  id TEXT PRIMARY KEY,
  cell_id TEXT NOT NULL REFERENCES tensor_cells(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT REFERENCES users(id),
  changed_at TEXT DEFAULT (datetime('now')),
  change_type TEXT NOT NULL -- 'create', 'update', 'delete', 'temperature_change'
);

CREATE INDEX IF NOT EXISTS idx_cell_history_cell ON cell_history(cell_id);
CREATE INDEX IF NOT EXISTS idx_cell_history_workspace ON cell_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cell_history_changed_at ON cell_history(changed_at DESC);

-- Insert default admin user (change this in production!)
INSERT OR IGNORE INTO users (id, email, display_name, subscription_tier)
VALUES ('admin-default', 'admin@spreadsheetmoment.com', 'System Administrator', 'premium');

-- Create triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_workspaces_timestamp
AFTER UPDATE ON workspaces
BEGIN
  UPDATE workspaces SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_cells_timestamp
AFTER UPDATE ON tensor_cells
BEGIN
  UPDATE tensor_cells SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_pages_timestamp
AFTER UPDATE ON dashboard_pages
BEGIN
  UPDATE dashboard_pages SET updated_at = datetime('now') WHERE id = NEW.id;
END;
