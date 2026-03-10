-- ============================================================================
-- Migration 002: Performance Indexes
-- ============================================================================
-- Creates indexes for query optimization
-- Version: 1.0.0
-- Author: POLLN Team
-- Date: 2026-03-09
-- ============================================================================

-- Enable additional extensions for advanced indexing
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- USER INDEXES
-- ============================================================================

-- Email lookups (most common)
CREATE INDEX idx_users_email ON users(email) WHERE is_active = TRUE;

-- Username searches
CREATE INDEX idx_users_username ON users(username) WHERE is_active = TRUE;

-- Activity tracking
CREATE INDEX idx_users_last_active ON users(last_active_at DESC) WHERE last_active_at IS NOT NULL;

-- ============================================================================
-- OAUTH IDENTITIES INDEXES
-- ============================================================================

CREATE INDEX idx_oauth_identities_user_id ON oauth_identities(user_id);

-- Provider lookups for OAuth flows
CREATE INDEX idx_oauth_identities_provider ON oauth_identities(provider, provider_user_id);

-- ============================================================================
-- SPREADSHEET INDEXES
-- ============================================================================

-- Owner's spreadsheets (most common query)
CREATE INDEX idx_spreadsheets_owner_id ON spreadsheets(owner_id) WHERE NOT is_template;

-- Recently created/updated
CREATE INDEX idx_spreadsheets_created_at ON spreadsheets(created_at DESC);

CREATE INDEX idx_spreadsheets_updated_at ON spreadsheets(updated_at DESC);

-- Public spreadsheets (for discovery)
CREATE INDEX idx_spreadsheets_is_public ON spreadsheets(is_public) WHERE is_public = TRUE;

-- Template spreadsheets
CREATE INDEX idx_spreadsheets_is_template ON spreadsheets(is_template) WHERE is_template = TRUE;

-- Full-text search on names and descriptions
CREATE INDEX idx_spreadsheets_name_trgm ON spreadsheets USING gin(name gin_trgm_ops);
CREATE INDEX idx_spreadsheets_description_trgm ON spreadsheets USING gin(description gin_trgm_ops);

-- ============================================================================
-- SHEET INDEXES
-- ============================================================================

CREATE INDEX idx_sheets_spreadsheet_id ON sheets(spreadsheet_id);

-- Position-based ordering
CREATE INDEX idx_sheets_position ON sheets(spreadsheet_id, position);

-- ============================================================================
-- CELL INDEXES
-- ============================================================================

-- Position-based queries (most common)
CREATE INDEX idx_cells_position ON cells(sheet_id, column_position, row_position);

-- Active cells only (exclude archived)
CREATE INDEX idx_cells_state ON cells(sheet_id, state) WHERE state = 'active';

-- Cell type filtering
CREATE INDEX idx_cells_type ON cells(cell_type);

-- Full-text search on cell content
CREATE INDEX idx_cells_content_gin ON cells USING gin(
  to_tsvector('english', COALESCE(value, '') || ' ' || COALESCE(formula, ''))
);

-- Timestamp-based queries
CREATE INDEX idx_cells_updated_at ON cells(updated_at DESC);
CREATE INDEX idx_cells_created_at ON cells(created_at DESC);

-- Error cells (for monitoring)
CREATE INDEX idx_cells_errors ON cells(sheet_id) WHERE state = 'error';

-- JSONB indexes for head/tail data queries
CREATE INDEX idx_cells_head_data ON cells USING gin(head_data);
CREATE INDEX idx_cells_tail_data ON cells USING gin(tail_data);

-- ============================================================================
-- CELL VERSIONS INDEXES
-- ============================================================================

-- Version history lookups
CREATE INDEX idx_cell_versions_cell_id ON cell_versions(cell_id, version DESC);

-- User-created versions
CREATE INDEX idx_cell_versions_created_by ON cell_versions(created_by) WHERE created_by IS NOT NULL;

-- Timestamp queries
CREATE INDEX idx_cell_versions_created_at ON cell_versions(created_at DESC);

-- ============================================================================
-- CELL DEPENDENCIES INDEXES
-- ============================================================================

-- Forward dependencies (what depends on X)
CREATE INDEX idx_cell_dependencies_dependency ON cell_dependencies(dependency_cell_id);

-- Reverse dependencies (what X depends on)
CREATE INDEX idx_cell_dependencies_dependent ON cell_dependencies(dependent_cell_id);

-- Dependency type filtering
CREATE INDEX idx_cell_dependencies_type ON cell_dependencies(dependency_type);

-- Composite index for dependency graph traversal
CREATE INDEX idx_cell_dependencies_graph ON cell_dependencies(dependent_cell_id, dependency_cell_id);

-- ============================================================================
-- CELL CONSCIOUSNESS INDEXES
-- ============================================================================

-- Time-series queries (most recent first)
CREATE INDEX idx_cell_consciousness_cell_time ON cell_consciousness(cell_id, timestamp DESC);

-- Sensation type filtering
CREATE INDEX idx_cell_consciousness_sensation ON cell_consciousness(sensation_type, timestamp DESC);

-- Time-based partitioning helper
CREATE INDEX idx_cell_consciousness_timestamp ON cell_consciousness(timestamp DESC);

-- Recent consciousness data (for live monitoring)
CREATE INDEX idx_cell_consciousness_recent ON cell_consciousness(cell_id, timestamp DESC)
  WHERE timestamp > NOW() - INTERVAL '1 hour';

-- ============================================================================
-- CELL ENTANGLEMENTS INDEXES
-- ============================================================================

CREATE INDEX idx_entangled_cells_entanglement ON entangled_cells(entanglement_id);

-- Find all entanglements for a cell
CREATE INDEX idx_entangled_cells_cell ON entangled_cells(cell_id);

-- Active entanglements only
CREATE INDEX idx_cell_entanglements_active ON cell_entanglements(created_by) WHERE is_active = TRUE;

-- ============================================================================
-- COLLABORATION INDEXES
-- ============================================================================

-- Active sessions (most common query)
CREATE INDEX idx_collaboration_sessions_spreadsheet ON collaboration_sessions(spreadsheet_id, is_active);

-- Session participants
CREATE INDEX idx_session_participants_session ON session_participants(session_id);

-- User's active sessions
CREATE INDEX idx_session_participants_user ON session_participants(user_id, is_online);

-- Online users in sessions
CREATE INDEX idx_session_participants_online ON session_participants(session_id, is_online)
  WHERE is_online = TRUE;

-- ============================================================================
-- PERMISSIONS INDEXES
-- ============================================================================

CREATE INDEX idx_spreadsheet_permissions_spreadsheet ON spreadsheet_permissions(spreadsheet_id);

-- User's accessible spreadsheets
CREATE INDEX idx_spreadsheet_permissions_user ON spreadsheet_permissions(user_id, permission_level);

-- Active permissions (not expired)
CREATE INDEX idx_spreadsheet_permissions_active ON spreadsheet_permissions(user_id)
  WHERE expires_at IS NULL OR expires_at > NOW();

-- ============================================================================
-- COLLABORATION EVENTS INDEXES
-- ============================================================================

-- Recent unprocessed events (for event queue)
CREATE INDEX idx_collaboration_events_session ON collaboration_events(session_id, created_at);

CREATE INDEX idx_collaboration_events_unprocessed ON collaboration_events(processed)
  WHERE processed = FALSE;

-- Event type filtering
CREATE INDEX idx_collaboration_events_type ON collaboration_events(event_type, created_at DESC);

-- User's events
CREATE INDEX idx_collaboration_events_user ON collaboration_events(user_id, created_at DESC);

-- Sequence number ordering (for ordered playback)
CREATE INDEX idx_collaboration_events_sequence ON collaboration_events(session_id, sequence_number);

-- ============================================================================
-- SNAPSHOTS INDEXES
-- ============================================================================

CREATE INDEX idx_spreadsheet_snapshots_spreadsheet ON spreadsheet_snapshots(spreadsheet_id, version DESC);

-- Automatic snapshots
CREATE INDEX idx_spreadsheet_snapshots_automatic ON spreadsheet_snapshots(is_automatic)
  WHERE is_automatic = TRUE;

-- Manual snapshots by user
CREATE INDEX idx_spreadsheet_snapshots_created_by ON spreadsheet_snapshots(created_by);

-- ============================================================================
-- AUDIT LOG INDEXES
-- ============================================================================

-- User activity (for compliance/debugging)
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);

-- Spreadsheet audit trail
CREATE INDEX idx_audit_log_spreadsheet ON audit_log(spreadsheet_id, created_at DESC);

-- Cell-specific changes
CREATE INDEX idx_audit_log_cell ON audit_log(cell_id, created_at DESC);

-- Action type filtering
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

-- Recent logs (for dashboards)
CREATE INDEX idx_audit_log_recent ON audit_log(created_at DESC)
  WHERE created_at > NOW() - INTERVAL '30 days';

-- IP-based lookups (security)
CREATE INDEX idx_audit_log_ip_address ON audit_log(ip_address) WHERE ip_address IS NOT NULL;

-- ============================================================================
-- COMMENTS INDEXES
-- ============================================================================

-- Cell comments (most recent first)
CREATE INDEX idx_cell_comments_cell ON cell_comments(cell_id, created_at DESC);

-- Unresolved comments
CREATE INDEX idx_cell_comments_unresolved ON cell_comments(cell_id) WHERE NOT is_resolved;

-- Parent-child relationships (for threading)
CREATE INDEX idx_cell_comments_parent ON cell_comments(parent_comment_id);

-- User's comments
CREATE INDEX idx_cell_comments_user ON cell_comments(user_id, created_at DESC);

-- ============================================================================
-- CELL STYLES INDEXES
-- ============================================================================

CREATE INDEX idx_cell_styles_sheet ON cell_styles(sheet_id);

-- Style author lookups
CREATE INDEX idx_cell_styles_created_by ON cell_styles(created_by);

-- ============================================================================
-- SEARCH INDEX INDEXES
-- ============================================================================

-- Full-text search
CREATE INDEX idx_search_tsv ON search_index USING gin(to_tsvector('english', content));

-- Spreadsheet-scoped search
CREATE INDEX idx_search_spreadsheet ON search_index(spreadsheet_id);

-- Cell type filtering
CREATE INDEX idx_search_cell_type ON search_index(cell_type);

-- Recent updates
CREATE INDEX idx_search_indexed_at ON search_index(indexed_at DESC);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Find cells by position and type
CREATE INDEX idx_cells_position_type ON cells(sheet_id, column_position, row_position, cell_type)
  WHERE state = 'active';

-- Active sessions with participants
CREATE INDEX idx_sessions_active_with_users ON collaboration_sessions(spreadsheet_id, is_active)
  WHERE is_active = TRUE;

-- Recent consciousness with sensation filtering
CREATE INDEX idx_consciousness_recent_sensation ON cell_consciousness(cell_id, timestamp DESC, sensation_type)
  WHERE timestamp > NOW() - INTERVAL '24 hours';

-- User's recent activity
CREATE INDEX idx_user_recent_activity ON audit_log(user_id, created_at DESC, action)
  WHERE created_at > NOW() - INTERVAL '7 days';

-- Spreadsheet's active cells with dependencies
CREATE INDEX idx_cells_active_with_dependencies ON cells(sheet_id, state, updated_at DESC)
  WHERE state = 'active';

-- ============================================================================
-- COVERING INDEXES (INCLUDE columns for index-only scans)
-- ============================================================================

-- Cell lookups with commonly accessed columns
CREATE INDEX idx_cells_covering ON cells(sheet_id, column_position, row_position)
  INCLUDE (value, display_value, state, cell_type)
  WHERE state = 'active';

-- Spreadsheet listings
CREATE INDEX idx_spreadsheets_covering ON spreadsheets(owner_id, updated_at DESC)
  INCLUDE (name, is_public, version)
  WHERE NOT is_template;

-- ============================================================================
-- END OF MIGRATION 002
-- ============================================================================
