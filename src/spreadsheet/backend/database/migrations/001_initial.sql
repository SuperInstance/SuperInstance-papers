-- ============================================================================
-- Migration 001: Initial Schema
-- ============================================================================
-- Creates base tables for POLLN database
-- Version: 1.0.0
-- Author: POLLN Team
-- Date: 2026-03-09
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  'absolute_change',
  'rate_of_change',
  'acceleration',
  'presence',
  'pattern',
  'anomaly'
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

CREATE TYPE permission_level AS (
  'read',
  'write',
  'admin'
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

-- ============================================================================
-- CELLS (THE LIVING ENTITIES)
-- ============================================================================

CREATE TABLE cells (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  cell_type cell_type NOT NULL DEFAULT 'log_cell',
  column_ref VARCHAR(10) NOT NULL,
  row_ref INTEGER NOT NULL,
  column_position INTEGER NOT NULL,
  row_position INTEGER NOT NULL,
  state cell_state NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value TEXT,
  formula TEXT,
  display_value TEXT,
  format JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  head_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  tail_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(sheet_id, column_ref, row_ref)
);

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
  is_delta BOOLEAN NOT NULL DEFAULT FALSE,
  delta_data JSONB,
  UNIQUE(cell_id, version)
);

-- ============================================================================
-- CELL DEPENDENCIES (THE GRAPH)
-- ============================================================================

CREATE TABLE cell_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dependent_cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  dependency_cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'formula',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(dependent_cell_id, dependency_cell_id, dependency_type)
);

-- ============================================================================
-- CELL CONSCIOUSNESS (TIME-SERIES DATA)
-- ============================================================================

CREATE TABLE cell_consciousness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sensation_type sensation_type NOT NULL,
  sensation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  internal_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  reasoning_trace JSONB,
  calculation_duration_ms INTEGER,
  memory_used_bytes BIGINT
);

-- ============================================================================
-- CELL ENTANGLEMENTS (QUANTUM-LINKED CELLS)
-- ============================================================================

CREATE TABLE cell_entanglements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sync_mode VARCHAR(50) NOT NULL DEFAULT 'bidirectional',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE entangled_cells (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entanglement_id UUID NOT NULL REFERENCES cell_entanglements(id) ON DELETE CASCADE,
  cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'peer',
  sync_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(entanglement_id, cell_id)
);

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
  storage_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(spreadsheet_id, version)
);

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

-- ============================================================================
-- CELL FORMATTING & STYLES
-- ============================================================================

CREATE TABLE cell_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  start_column VARCHAR(10) NOT NULL,
  start_row INTEGER NOT NULL,
  end_column VARCHAR(10) NOT NULL,
  end_row INTEGER NOT NULL,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- SEARCH INDEX
-- ============================================================================

CREATE TABLE search_index (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
  cell_id UUID NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  cell_type cell_type NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- END OF MIGRATION 001
-- ============================================================================
