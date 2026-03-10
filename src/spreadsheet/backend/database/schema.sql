-- ============================================================================
-- POLLN Database Schema
-- ============================================================================
-- Comprehensive database schema for the POLLN spreadsheet system
-- Supports living cells, consciousness, collaboration, and versioning
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE cell_state AS (
  'active',
  'dormant',
  'calculating',
  'error',
  'archived'
);

CREATE TYPE cell_type AS (
  'log_cell',
  'input_cell',
  'output_cell',
  'transform_cell',
  'filter_cell',
  'aggregate_cell',
  'validate_cell',
  'analysis_cell',
  'prediction_cell',
  'decision_cell',
  'explain_cell'
);

CREATE TYPE sensation_type AS (
  'absolute_change',   -- State delta: new - old
  'rate_of_change',    -- First derivative: d/dt
  'acceleration',      -- Second derivative: d²/dt²
  'presence',          -- Cell exists/active
  'pattern',           -- Pattern match detected
  'anomaly'            -- Deviation from expected
);

CREATE TYPE provider_type AS (
  'google',
  'github',
  'microsoft'
);

CREATE TYPE collaboration_role AS (
  'owner',
  'editor',
  'viewer',
  'commenter'
);

CREATE TYPE event_type AS (
  'cell_created',
  'cell_updated',
  'cell_deleted',
  'cell_focused',
  'dependency_changed',
  'comment_added',
  'selection_changed',
  'error_occurred'
);

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE oauth_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider provider_type NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  provider_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_identities_user_id ON oauth_identities(user_id);

-- ============================================================================
-- SPREADSHEETS (WORKBOOKS)
-- ============================================================================

CREATE TABLE spreadsheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_spreadsheets_owner_id ON spreadsheets(owner_id);
CREATE INDEX idx_spreadsheets_created_at ON spreadsheets(created_at DESC);
CREATE INDEX idx_spreadsheets_updated_at ON spreadsheets(updated_at DESC);
CREATE INDEX idx_spreadsheets_is_public ON spreadsheets(is_public) WHERE is_public = TRUE;

-- ============================================================================
-- SHEETS (WITHIN SPREADSHEETS)
-- ============================================================================

CREATE TABLE sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(spreadsheet_id, position)
);

CREATE INDEX idx_sheets_spreadsheet_id ON sheets(spreadsheet_id);

-- ============================================================================
-- CELLS (THE LIVING ENTITIES)
-- ============================================================================

CREATE TABLE cells (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  cell_type cell_type NOT NULL DEFAULT 'log_cell',
  column_ref VARCHAR(10) NOT NULL, -- e.g., 'A', 'B', 'AA'
  row_ref INTEGER NOT NULL,        -- e.g., 1, 2, 3
  column_position INTEGER NOT NULL,
  row_position INTEGER NOT NULL,
  state cell_state NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Cell content (current version)
  value TEXT,
  formula TEXT,
  display_value TEXT,
  format JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Cell metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Head/Tail paradigm
  head_data JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Input/sensation data
  tail_data JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Output/action data
  UNIQUE(sheet_id, column_ref, row_ref)
);

-- Full-text search on cell content
CREATE INDEX idx_cells_content_gin ON cells USING gin(
  to_tsvector('english', COALESCE(value, '') || ' ' || COALESCE(formula, ''))
);

-- Position-based queries
CREATE INDEX idx_cells_position ON cells(sheet_id, column_position, row_position);
CREATE INDEX idx_cells_state ON cells(state) WHERE state != 'archived';

-- ============================================================================
-- CELL VERSIONS (TIME TRAVEL)
-- ============================================================================

CREATE TABLE cell_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  value TEXT,
  formula TEXT,
  display_value TEXT,
  format JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_summary TEXT,
  -- Performance: Store diffs for large values
  is_delta BOOLEAN NOT NULL DEFAULT FALSE,
  delta_data JSONB,
  UNIQUE(cell_id, version)
);

CREATE INDEX idx_cell_versions_cell_id ON cell_versions(cell_id, version DESC);

-- ============================================================================
-- CELL DEPENDENCIES (THE GRAPH)
-- ============================================================================

CREATE TABLE cell_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dependent_cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  dependency_cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'formula', -- formula, sensation, entanglement
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(dependent_cell_id, dependency_cell_id, dependency_type)
);

-- Reverse lookup for impact analysis
CREATE INDEX idx_cell_dependencies_dependency ON cell_dependencies(dependency_cell_id);
CREATE INDEX idx_cell_dependencies_dependent ON cell_dependencies(dependent_cell_id);

-- ============================================================================
-- CELL CONSCIOUSNESS (TIME- SERIES DATA)
-- ============================================================================

CREATE TABLE cell_consciousness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Sensation data (what the cell feels)
  sensation_type sensation_type NOT NULL,
  sensation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Internal state
  internal_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Reasoning trace (for L2+ cells)
  reasoning_trace JSONB,
  -- Performance metrics
  calculation_duration_ms INTEGER,
  memory_used_bytes BIGINT
);

-- Time-series optimizations
CREATE INDEX idx_cell_consciousness_cell_time ON cell_consciousness(cell_id, timestamp DESC);
CREATE INDEX idx_cell_consciousness_sensation ON cell_consciousness(sensation_type, timestamp DESC);

-- Partitioning by month (for large deployments)
-- CREATE TABLE cell_consciousness_y2024m01 PARTITION OF cell_consciousness
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ============================================================================
-- CELL ENTANGLEMENTS (QUANTUM-LINKED CELLS)
-- ============================================================================

CREATE TABLE cell_entanglements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sync_mode VARCHAR(50) NOT NULL DEFAULT 'bidirectional', -- bidirectional, unidirectional
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE entangled_cells (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entanglement_id UUID NOT NULL REFERENCES cell_entanglements(id) ON DELETE CASCADE,
  cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'peer', -- primary, secondary, peer
  sync_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(entanglement_id, cell_id)
);

CREATE INDEX idx_entangled_cells_entanglement ON entangled_cells(entanglement_id);
CREATE INDEX idx_entangled_cells_cell ON entangled_cells(cell_id);

-- ============================================================================
-- COLLABORATION
-- ============================================================================

CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
  started_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_collaboration_sessions_spreadsheet ON collaboration_sessions(spreadsheet_id, is_active);

CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  role collaboration_role NOT NULL DEFAULT 'viewer',
  cursor_position JSONB,
  selected_cells JSONB,
  is_online BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);

CREATE TYPE permission_level AS (
  'read',
  'write',
  'admin'
);

CREATE TABLE spreadsheet_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_level permission_level NOT NULL,
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(spreadsheet_id, user_id)
);

CREATE INDEX idx_spreadsheet_permissions_spreadsheet ON spreadsheet_permissions(spreadsheet_id);
CREATE INDEX idx_spreadsheet_permissions_user ON spreadsheet_permissions(user_id);

-- ============================================================================
-- COLLABORATION EVENTS (REAL-TIME SYNC)
-- ============================================================================

CREATE TABLE collaboration_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  event_type event_type NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  sequence_number BIGINT
);

CREATE INDEX idx_collaboration_events_session ON collaboration_events(session_id, created_at);
CREATE INDEX idx_collaboration_events_unprocessed ON collaboration_events(processed) WHERE processed = FALSE;

-- ============================================================================
-- SNAPSHOTS & VERSIONS
-- ============================================================================

CREATE TABLE spreadsheet_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  name VARCHAR(255),
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_automatic BOOLEAN NOT NULL DEFAULT FALSE,
  storage_url TEXT, -- For offloading to S3/GCS
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(spreadsheet_id, version)
);

CREATE INDEX idx_spreadsheet_snapshots_spreadsheet ON spreadsheet_snapshots(spreadsheet_id, version DESC);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  spreadsheet_id UUID REFERENCES spreadsheets(id) ON DELETE SET NULL,
  cell_id UUID REFERENCES cells(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_spreadsheet ON audit_log(spreadsheet_id, created_at DESC);
CREATE INDEX idx_audit_log_cell ON audit_log(cell_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

-- ============================================================================
-- COMMENTS & ANNOTATIONS
-- ============================================================================

CREATE TABLE cell_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES cell_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_cell_comments_cell ON cell_comments(cell_id, created_at DESC);
CREATE INDEX idx_cell_comments_parent ON cell_comments(parent_comment_id);

-- ============================================================================
-- CELL FORMATTING & STYLES
-- ============================================================================

CREATE TABLE cell_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  -- Range definition
  start_column VARCHAR(10) NOT NULL,
  start_row INTEGER NOT NULL,
  end_column VARCHAR(10) NOT NULL,
  end_row INTEGER NOT NULL,
  -- Style properties
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_cell_styles_sheet ON cell_styles(sheet_id);

-- ============================================================================
-- SEARCH INDEXES (FULL-TEXT)
-- ============================================================================

CREATE TABLE search_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
  cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  cell_type cell_type NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Full-text search vector
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

CREATE INDEX idx_search_tsv ON search_index USING gin(tsv);
CREATE INDEX idx_search_spreadsheet ON search_index(spreadsheet_id);

-- ============================================================================
-- PERFORMANCE: MATERIALIALIZED VIEWS
-- ============================================================================

-- Cell statistics for performance monitoring
CREATE MATERIALIZED VIEW cell_statistics AS
SELECT
  s.id as spreadsheet_id,
  s.name as spreadsheet_name,
  COUNT(DISTINCT sh.id) as sheet_count,
  COUNT(c.id) as cell_count,
  COUNT(c.id) FILTER (WHERE c.state = 'active') as active_cells,
  COUNT(c.id) FILTER (WHERE c.state = 'error') as error_cells,
  COUNT(c.id) FILTER (WHERE c.cell_type = 'analysis_cell') as analysis_cells,
  COUNT(c.id) FILTER (WHERE c.cell_type = 'prediction_cell') as prediction_cells,
  COUNT(c.id) FILTER (WHERE c.cell_type = 'decision_cell') as decision_cells,
  MAX(c.updated_at) as last_activity
FROM spreadsheets s
LEFT JOIN sheets sh ON s.id = sh.spreadsheet_id
LEFT JOIN cells c ON sh.id = c.sheet_id
GROUP BY s.id, s.name;

CREATE UNIQUE INDEX idx_cell_statistics_spreadsheet ON cell_statistics(spreadsheet_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get all cells that depend on a given cell (transitive closure)
CREATE OR REPLACE FUNCTION get_dependent_cells(source_cell_id UUID)
RETURNS TABLE(cell_id UUID, depth INTEGER) AS $$
WITH RECURSIVE dependency_graph AS (
  -- Base case: direct dependents
  SELECT
    cd.dependent_cell_id,
    1 as depth
  FROM cell_dependencies cd
  WHERE cd.dependency_cell_id = source_cell_id

  UNION ALL

  -- Recursive case: dependents of dependents
  SELECT
    cd.dependent_cell_id,
    dg.depth + 1
  FROM cell_dependencies cd
  INNER JOIN dependency_graph dg ON cd.dependency_cell_id = dg.cell_id
  WHERE cd.dependency_cell_id != source_cell_id
)
SELECT DISTINCT cell_id, depth FROM dependency_graph;
$$ LANGUAGE SQL;

-- Get all cells that a given cell depends on (transitive closure)
CREATE OR REPLACE FUNCTION get_cell_dependencies(source_cell_id UUID)
RETURNS TABLE(cell_id UUID, depth INTEGER) AS $$
WITH RECURSIVE dependency_graph AS (
  -- Base case: direct dependencies
  SELECT
    cd.dependency_cell_id,
    1 as depth
  FROM cell_dependencies cd
  WHERE cd.dependent_cell_id = source_cell_id

  UNION ALL

  -- Recursive case: dependencies of dependencies
  SELECT
    cd.dependency_cell_id,
    dg.depth + 1
  FROM cell_dependencies cd
  INNER JOIN dependency_graph dg ON cd.dependent_cell_id = dg.cell_id
  WHERE cd.dependency_cell_id != source_cell_id
)
SELECT DISTINCT cell_id, depth FROM dependency_graph;
$$ LANGUAGE SQL;

-- Calculate cell position from column ref (A=1, Z=26, AA=27, etc.)
CREATE OR REPLACE FUNCTION column_position(column_ref VARCHAR(10))
RETURNS INTEGER AS $$
DECLARE
  result INTEGER := 0;
  len INTEGER;
  char CHAR(1);
  i INTEGER;
BEGIN
  len := LENGTH(column_ref);
  FOR i IN 1..len LOOP
    char := UPPER(SUBSTRING(column_ref FROM i FOR 1));
    result := result * 26 + (ASCII(char) - 64);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Convert position to column ref (1=A, 26=Z, 27=AA, etc.)
CREATE OR REPLACE FUNCTION position_to_column(position INTEGER)
RETURNS VARCHAR(10) AS $$
DECLARE
  result VARCHAR(10) := '';
  remainder INTEGER;
BEGIN
  WHILE position > 0 LOOP
    remainder := (position - 1) % 26;
    result := CHR(remainder + 65) || result;
    position := (position - remainder) / 26;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update cell statistics materialized view
CREATE OR REPLACE FUNCTION refresh_cell_statistics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY cell_statistics;
END;
$$ LANGUAGE SQL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_spreadsheets_updated_at
  BEFORE UPDATE ON spreadsheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sheets_updated_at
  BEFORE UPDATE ON sheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cells_updated_at
  BEFORE UPDATE ON cells
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cell_comments_updated_at
  BEFORE UPDATE ON cell_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cell_styles_updated_at
  BEFORE UPDATE ON cell_styles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Log cell changes to audit
CREATE OR REPLACE FUNCTION log_cell_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    cell_id,
    spreadsheet_id,
    action,
    action_type,
    old_value,
    new_value,
    created_at
  )
  SELECT
    NEW.id,
    s.spreadsheet_id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'cell_created'
      WHEN TG_OP = 'UPDATE' THEN 'cell_updated'
      WHEN TG_OP = 'DELETE' THEN 'cell_deleted'
    END,
    'cell',
    CASE
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'value', OLD.value,
        'formula', OLD.formula,
        'state', OLD.state
      )
      ELSE NULL
    END,
    CASE
      WHEN TG_OP IN ('INSERT', 'UPDATE') THEN jsonb_build_object(
        'value', NEW.value,
        'formula', NEW.formula,
        'state', NEW.state
      )
      ELSE NULL
    END,
    NOW()
  FROM sheets s
  WHERE s.id = NEW.sheet_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_cell_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cells
  FOR EACH ROW
  EXECUTE FUNCTION log_cell_changes();

-- Auto-increment cell version on value change
CREATE OR REPLACE FUNCTION create_cell_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  IF NEW.value IS DISTINCT FROM OLD.value OR NEW.formula IS DISTINCT FROM OLD.formula THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
    FROM cell_versions
    WHERE cell_id = NEW.id;

    INSERT INTO cell_versions (
      cell_id,
      version,
      value,
      formula,
      display_value,
      format
    ) VALUES (
      NEW.id,
      next_version,
      OLD.value,
      OLD.formula,
      OLD.display_value,
      OLD.format
    );

    NEW.updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_cell_version_trigger
  BEFORE UPDATE ON cells
  FOR EACH ROW
  WHEN (NEW.value IS DISTINCT FROM OLD.value OR NEW.formula IS DISTINCT FROM OLD.formula)
  EXECUTE FUNCTION create_cell_version();

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE spreadsheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- Spreadsheet policies
CREATE POLICY spreadsheets_owner_policy ON spreadsheets
  FOR ALL
  USING (owner_id = current_setting('app.user_id')::UUID);

CREATE POLICY spreadsheets_public_policy ON spreadsheets
  FOR SELECT
  USING (is_public = TRUE);

-- Cell policies (inherited from spreadsheet access)
CREATE POLICY cells_spreadsheet_policy ON cells
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sheets sh
      JOIN spreadsheets s ON s.id = sh.spreadsheet_id
      WHERE sh.id = cells.sheet_id
      AND (s.owner_id = current_setting('app.user_id')::UUID OR s.is_public = TRUE)
    )
  );

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Cell detail view with dependencies
CREATE VIEW cell_details AS
SELECT
  c.*,
  s.name as sheet_name,
  s.spreadsheet_id,
  s.position as sheet_position,
  sp.name as spreadsheet_name,
  sp.owner_id,
  -- Dependency counts
  (SELECT COUNT(*) FROM cell_dependencies cd WHERE cd.dependent_cell_id = c.id) as depends_on_count,
  (SELECT COUNT(*) FROM cell_dependencies cd WHERE cd.dependency_cell_id = c.id) as used_by_count,
  -- Version count
  (SELECT COUNT(*) FROM cell_versions cv WHERE cv.cell_id = c.id) as version_count,
  -- Comment count
  (SELECT COUNT(*) FROM cell_comments cc WHERE cc.cell_id = c.id AND NOT cc.is_resolved) as open_comment_count
FROM cells c
JOIN sheets s ON c.sheet_id = s.id
JOIN spreadsheets sp ON s.spreadsheet_id = sp.id;

-- Spreadsheet overview view
CREATE VIEW spreadsheet_overview AS
SELECT
  s.*,
  u.username as owner_username,
  u.email as owner_email,
  -- Statistics
  cs.sheet_count,
  cs.cell_count,
  cs.active_cells,
  cs.error_cells,
  cs.analysis_cells,
  cs.prediction_cells,
  cs.decision_cells,
  cs.last_activity,
  -- Collaboration status
  (SELECT COUNT(*) FROM collaboration_sessions sess WHERE sess.spreadsheet_id = s.id AND sess.is_active = TRUE) as active_sessions,
  (SELECT COUNT(DISTINCT user_id) FROM spreadsheet_permissions perm WHERE perm.spreadsheet_id = s.id) as shared_with_count
FROM spreadsheets s
JOIN users u ON s.owner_id = u.id
LEFT JOIN cell_statistics cs ON s.id = cs.spreadsheet_id;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
