-- SuperInstance.AI Database Schema for Cloudflare D1
-- Version: 1.0.0
-- Last Updated: 2025-01-15

-- ============================================================================
-- Users Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  deployment_mode TEXT NOT NULL DEFAULT 'portal',
  preferences TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deployment_mode ON users(deployment_mode);

-- ============================================================================
-- Cloudflare Connections (BYOC)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cloudflare_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT,
  oauth_connected INTEGER DEFAULT 0,
  oauth_connected_at TEXT,
  oauth_scope TEXT DEFAULT '[]',
  api_token_encrypted TEXT,
  api_token_permissions TEXT DEFAULT '[]',
  api_token_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_cf_connections_user ON cloudflare_connections(user_id);
CREATE INDEX idx_cf_connections_account ON cloudflare_connections(account_id);

-- ============================================================================
-- API Keys (Encrypted)
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  default_model TEXT,
  validated INTEGER DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_provider ON api_keys(provider);
CREATE UNIQUE INDEX idx_api_keys_user_provider ON api_keys(user_id, provider);

-- ============================================================================
-- Custom API Configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_api_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  encrypted_key TEXT,
  models TEXT DEFAULT '[]',
  supports_streaming INTEGER DEFAULT 1,
  supports_function_calling INTEGER DEFAULT 0,
  supports_vision INTEGER DEFAULT 0,
  headers TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_custom_api_user ON custom_api_configs(user_id);

-- ============================================================================
-- Local LLM Configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS local_llm_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  enabled INTEGER DEFAULT 0,
  base_url TEXT NOT NULL DEFAULT 'http://localhost:11434/v1',
  models TEXT DEFAULT '[]',
  auto_detect INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- SMP Cells (Locked Static Programs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS smp_cells (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- Seed component
  seed_value TEXT NOT NULL,
  seed_entropy REAL NOT NULL DEFAULT 0.0,
  seed_type TEXT DEFAULT 'numeric',
  
  -- Model component
  model_provider TEXT NOT NULL DEFAULT 'deepseek',
  model_name TEXT NOT NULL DEFAULT 'deepseek-reasoner',
  model_temperature REAL NOT NULL DEFAULT 0.7,
  model_top_p REAL NOT NULL DEFAULT 0.9,
  model_max_tokens INTEGER NOT NULL DEFAULT 2048,
  model_base_url TEXT,
  
  -- Prompt component
  prompt_template TEXT NOT NULL,
  prompt_variables TEXT DEFAULT '[]',
  prompt_system TEXT,
  prompt_examples TEXT DEFAULT '[]',
  
  -- Lock & Fingerprint
  lock_status TEXT NOT NULL DEFAULT 'unlocked',
  fingerprint TEXT NOT NULL,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_smp_cells_user ON smp_cells(user_id);
CREATE INDEX idx_smp_cells_fingerprint ON smp_cells(fingerprint);
CREATE INDEX idx_smp_cells_lock_status ON smp_cells(lock_status);

-- ============================================================================
-- SMP Bots (Agents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS smp_bots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  cell_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- State
  state TEXT NOT NULL DEFAULT 'idle',
  
  -- Worker binding
  worker_id TEXT,
  worker_url TEXT,
  
  -- Statistics
  execution_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  average_latency_ms REAL DEFAULT 0,
  last_execution TEXT,
  
  -- RAG Configuration
  rag_enabled INTEGER DEFAULT 0,
  rag_vector_index TEXT,
  rag_document_bucket TEXT,
  rag_embedding_model TEXT DEFAULT 'text-embedding-3-small',
  rag_chunk_size INTEGER DEFAULT 1000,
  rag_top_k INTEGER DEFAULT 5,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cell_id) REFERENCES smp_cells(id) ON DELETE CASCADE
);

CREATE INDEX idx_smp_bots_user ON smp_bots(user_id);
CREATE INDEX idx_smp_bots_cell ON smp_bots(cell_id);
CREATE INDEX idx_smp_bots_state ON smp_bots(state);

-- ============================================================================
-- Cold Logic Checkers
-- ============================================================================

CREATE TABLE IF NOT EXISTS cold_logic_checkers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bot_id TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  
  -- Configuration
  check_interval INTEGER DEFAULT 3600,
  check_types TEXT DEFAULT '["performance","correctness","drift"]',
  
  -- Thresholds (JSON)
  thresholds TEXT DEFAULT '{
    "performance": {"maxErrorRate": 0.1, "maxLatencyMs": 5000},
    "correctness": {"fingerprintMatch": true, "lockStatusRequired": true},
    "drift": {"maxEntropy": 0.3, "minExecutionCount": 10}
  }',
  
  -- Statistics
  checks_performed INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  last_check TEXT,
  last_result TEXT,
  
  -- Notifications
  notifications TEXT DEFAULT '{}',
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bot_id) REFERENCES smp_bots(id) ON DELETE CASCADE
);

CREATE INDEX idx_cold_logic_user ON cold_logic_checkers(user_id);
CREATE INDEX idx_cold_logic_bot ON cold_logic_checkers(bot_id);

-- ============================================================================
-- Cold Logic Check Results
-- ============================================================================

CREATE TABLE IF NOT EXISTS cold_logic_results (
  id TEXT PRIMARY KEY,
  checker_id TEXT NOT NULL,
  bot_id TEXT NOT NULL,
  
  -- Overall
  overall_passed INTEGER NOT NULL,
  
  -- Individual check results (JSON)
  performance_result TEXT,
  correctness_result TEXT,
  drift_result TEXT,
  resource_result TEXT,
  
  -- Recommendations
  recommendations TEXT DEFAULT '[]',
  
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (checker_id) REFERENCES cold_logic_checkers(id) ON DELETE CASCADE,
  FOREIGN KEY (bot_id) REFERENCES smp_bots(id) ON DELETE CASCADE
);

CREATE INDEX idx_cold_results_checker ON cold_logic_results(checker_id);
CREATE INDEX idx_cold_results_bot ON cold_logic_results(bot_id);
CREATE INDEX idx_cold_results_passed ON cold_logic_results(overall_passed);

-- ============================================================================
-- RAG Documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bot_id TEXT,
  
  -- File info
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  
  -- Processing
  chunks INTEGER DEFAULT 0,
  vectors INTEGER DEFAULT 0,
  processing_status TEXT DEFAULT 'pending',
  processing_error TEXT,
  
  -- Metadata
  metadata TEXT DEFAULT '{}',
  
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bot_id) REFERENCES smp_bots(id) ON DELETE SET NULL
);

CREATE INDEX idx_rag_docs_user ON rag_documents(user_id);
CREATE INDEX idx_rag_docs_bot ON rag_documents(bot_id);
CREATE INDEX idx_rag_docs_status ON rag_documents(processing_status);

-- ============================================================================
-- Executions (History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL,
  
  -- Input/Output
  input TEXT NOT NULL,
  output TEXT,
  
  -- Metrics
  tokens_used INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  
  -- Status
  success INTEGER DEFAULT 1,
  error_message TEXT,
  
  -- Metadata
  model_provider TEXT,
  model_name TEXT,
  
  executed_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (bot_id) REFERENCES smp_bots(id) ON DELETE CASCADE
);

CREATE INDEX idx_executions_bot ON executions(bot_id);
CREATE INDEX idx_executions_date ON executions(executed_at);

-- ============================================================================
-- Daily Usage Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_daily (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  
  -- Counts
  executions INTEGER DEFAULT 0,
  tokens INTEGER DEFAULT 0,
  
  -- Storage
  storage_bytes INTEGER DEFAULT 0,
  vectors INTEGER DEFAULT 0,
  rag_documents INTEGER DEFAULT 0,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_usage_user_date ON usage_daily(user_id, date);
CREATE UNIQUE INDEX idx_usage_unique ON usage_daily(user_id, date);

-- ============================================================================
-- Sessions (for authentication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  refresh_token_hash TEXT,
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  refresh_expires_at TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- Installation Tracking (for local deployments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS installations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- Platform
  platform TEXT NOT NULL,
  version TEXT NOT NULL,
  
  -- Connection
  port INTEGER,
  api_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'active',
  last_heartbeat TEXT,
  
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_installations_user ON installations(user_id);
CREATE INDEX idx_installations_status ON installations(status);

-- ============================================================================
-- System Configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default system configuration
INSERT OR IGNORE INTO system_config (key, value) VALUES
  ('version', '1.0.0'),
  ('default_provider', 'deepseek'),
  ('default_model', 'deepseek-reasoner'),
  ('max_bots_free', '5'),
  ('max_executions_day_free', '100'),
  ('max_storage_mb_free', '100'),
  ('max_vectors_free', '10000');

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_cf_connections_timestamp
AFTER UPDATE ON cloudflare_connections
BEGIN
  UPDATE cloudflare_connections SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_smp_cells_timestamp
AFTER UPDATE ON smp_cells
BEGIN
  UPDATE smp_cells SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_smp_bots_timestamp
AFTER UPDATE ON smp_bots
BEGIN
  UPDATE smp_bots SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_cold_logic_checkers_timestamp
AFTER UPDATE ON cold_logic_checkers
BEGIN
  UPDATE cold_logic_checkers SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_custom_api_configs_timestamp
AFTER UPDATE ON custom_api_configs
BEGIN
  UPDATE custom_api_configs SET updated_at = datetime('now') WHERE id = NEW.id;
END;
