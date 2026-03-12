-- Federation tables for distributed SuperInstance

-- Federation peers table
CREATE TABLE federation_peers (
  id TEXT PRIMARY KEY,
  origin_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  public_key TEXT,
  metadata TEXT NOT NULL DEFAULT '{}', -- JSON metadata
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected', 'error')),
  last_sync_at INTEGER,
  last_error TEXT,
  trust_level REAL NOT NULL DEFAULT 0.1 CHECK (trust_level >= 0 AND trust_level <= 1),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),

  UNIQUE(origin_id, endpoint),
  FOREIGN KEY (origin_id) REFERENCES origins(id) ON DELETE CASCADE
);

-- Cross-origin references
CREATE TABLE cross_origin_references (
  id TEXT PRIMARY KEY,
  local_cell_id TEXT NOT NULL,
  remote_origin_id TEXT NOT NULL,
  remote_cell_id TEXT NOT NULL,
  remote_endpoint TEXT NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('dependency', 'replication', 'aggregation')),
  transformation_matrix TEXT, -- JSON - transformation between origins
  confidence_weight REAL NOT NULL DEFAULT 1 CHECK (confidence_weight >= 0 AND confidence_weight <= 1),
  propagation_delay INTEGER NOT NULL DEFAULT 0,
  sync_interval INTEGER NOT NULL DEFAULT 60000,
  last_sync_at INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'error', 'stale')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),

  UNIQUE(local_cell_id, remote_origin_id, remote_cell_id),
  FOREIGN KEY (local_cell_id) REFERENCES cells(id) ON DELETE CASCADE,
  INDEX idx_remote_origin (remote_origin_id),
  INDEX idx_status (status)
);

-- Federation events/log
CREATE TABLE federation_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('cell_update', 'dependency_change', 'sync_request', 'conflict_detected', 'peer_status')),
  origin_id TEXT NOT NULL,
  source_cell_id TEXT,
  target_cell_id TEXT,
  event_data TEXT NOT NULL DEFAULT '{}', -- JSON event data
  vector_clock TEXT NOT NULL DEFAULT '{}', -- JSON vector clock
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  processed INTEGER NOT NULL DEFAULT 0,

  index_idx_timestamp (timestamp),
  FOREIGN KEY (origin_id) REFERENCES origins(id) ON DELETE CASCADE
);

-- Federation conflicts
CREATE TABLE federation_conflicts (
  id TEXT PRIMARY KEY,
  local_cell_id TEXT NOT NULL,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('simultaneous_update', 'divergent_state', 'dependency_cycle')),
  local_state TEXT, -- JSON
  remote_state TEXT, -- JSON
  resolution_strategy TEXT NOT NULL DEFAULT 'vector_clock',
  resolved_state TEXT, -- JSON merged state after resolution
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'resolving', 'resolved', 'manual_required')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  resolved_at INTEGER,

  FOREIGN KEY (local_cell_id) REFERENCES cells(id) ON DELETE CASCADE,
  INDEX idx_status_created (status, created_at)
);

-- Federation settings per origin
CREATE TABLE federation_settings (
  origin_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  auto_sync INTEGER NOT NULL DEFAULT 1 CHECK (auto_sync IN (0, 1)),
  sync_interval INTEGER NOT NULL DEFAULT 300000, -- 5 minutes
  max_peers INTEGER NOT NULL DEFAULT 10,
  conflict_resolution_strategy TEXT NOT NULL DEFAULT 'vector_clock',
  auto_resolve_conflicts INTEGER NOT NULL DEFAULT 1 CHECK (auto_resolve_conflicts IN (0, 1)),
  min_trust_level REAL NOT NULL DEFAULT 0.3 CHECK (min_trust_level >= 0 AND min_trust_level <= 1),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),

  FOREIGN KEY (origin_id) REFERENCES origins(id) ON DELETE CASCADE
);

-- Federation sync history
CREATE TABLE federation_sync_history (
  id TEXT PRIMARY KEY,
  origin_id TEXT NOT NULL,
  peer_id TEXT NOT NULL,
  sync_type TEXT NOT NULL DEFAULT 'incremental',
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  events_processed INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,
  errors TEXT, -- JSON error details
  sync_result TEXT NOT NULL DEFAULT 'success' CHECK (sync_result IN ('success', 'partial', 'error', 'conflict')),

  FOREIGN KEY (peer_id) REFERENCES federation_peers(id) ON DELETE CASCADE,
  INDEX idx_origin_timestamp (origin_id, started_at)
);

-- Create default federation settings for existing origins
INSERT INTO federation_settings (origin_id, enabled, auto_sync)
SELECT id, 1, 1 FROM origins;

-- Create indexes
CREATE INDEX idx_federation_peers_status ON federation_peers(status);
CREATE INDEX idx_federation_peers_updated ON federation_peers(updated_at);
CREATE INDEX idx_cross_origin_refs_local_cell ON cross_origin_references(local_cell_id);
CREATE INDEX idx_federation_events_type_timestamp ON federation_events(type, timestamp);
CREATE INDEX idx_federation_conflicts_status ON federation_conflicts(status);