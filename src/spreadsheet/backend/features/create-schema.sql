-- ============================================================================
-- Feature Flags and Experiments Database Schema
-- ============================================================================
-- Migration: Add feature flag and experiment management tables
-- Version: 1.0.0
-- Date: 2026-03-09
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE flag_state AS ENUM (
  'enabled',
  'disabled',
  'rollout',
  'experiment'
);

CREATE TYPE flag_type AS ENUM (
  'boolean',
  'percentage',
  'experiment',
  'multivariate'
);

CREATE TYPE experiment_state AS ENUM (
  'draft',
  'running',
  'paused',
  'completed',
  'archived'
);

-- ============================================================================
-- FEATURE FLAGS
-- ============================================================================

-- Main feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  type flag_type NOT NULL DEFAULT 'boolean',
  state flag_state NOT NULL DEFAULT 'disabled',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  environment VARCHAR(50) NOT NULL DEFAULT 'development',

  -- Configuration
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_value JSONB NOT NULL DEFAULT 'false'::jsonb,

  -- Kill switch
  kill_switch_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  kill_switch_reason TEXT,

  -- Rollout
  rollout_percentage INTEGER CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  rollout_strategy VARCHAR(50),

  -- Experiment
  experiment_id VARCHAR(255),

  -- Statistics
  evaluation_count BIGINT NOT NULL DEFAULT 0,
  last_evaluated_at TIMESTAMPTZ
);

-- Flag rules for complex conditions
CREATE TABLE IF NOT EXISTS flag_rules (
  id VARCHAR(255) PRIMARY KEY,
  flag_id VARCHAR(255) NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  condition JSONB NOT NULL,
  value JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (flag_id, id)
);

-- Flag variants for multivariate testing
CREATE TABLE IF NOT EXISTS flag_variants (
  id VARCHAR(255) PRIMARY KEY,
  flag_id VARCHAR(255) NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  weight FLOAT NOT NULL CHECK (weight >= 0 AND weight <= 1),
  payload JSONB NOT NULL,
  is_control BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (flag_id, id)
);

-- Flag evaluation statistics
CREATE TABLE IF NOT EXISTS feature_flag_stats (
  flag_id VARCHAR(255) PRIMARY KEY REFERENCES feature_flags(id) ON DELETE CASCADE,
  evaluation_count BIGINT NOT NULL DEFAULT 0,
  true_count BIGINT NOT NULL DEFAULT 0,
  false_count BIGINT NOT NULL DEFAULT 0,
  avg_evaluation_time FLOAT NOT NULL DEFAULT 0,
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Flag evaluation log (for debugging and analytics)
CREATE TABLE IF NOT EXISTS feature_flag_evaluations (
  id BIGSERIAL PRIMARY KEY,
  flag_id VARCHAR(255) NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  value JSONB,
  evaluation_time FLOAT NOT NULL, -- milliseconds
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- USER SEGMENTS
-- ============================================================================

-- User segments
CREATE TABLE IF NOT EXISTS user_segments (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- User attributes for segmentation
CREATE TABLE IF NOT EXISTS user_attributes (
  user_id VARCHAR(255) PRIMARY KEY,
  plan VARCHAR(100),
  role VARCHAR(100),
  region VARCHAR(100),
  email VARCHAR(255),
  custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User segment assignments
CREATE TABLE IF NOT EXISTS user_segment_assignments (
  user_id VARCHAR(255) NOT NULL,
  segment_id VARCHAR(255) NOT NULL REFERENCES user_segments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (user_id, segment_id)
);

-- User behavior tracking
CREATE TABLE IF NOT EXISTS user_behaviors (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  properties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EXPERIMENTS
-- ============================================================================

-- Experiments
CREATE TABLE IF NOT EXISTS experiments (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  hypothesis TEXT,
  success_metric VARCHAR(255) NOT NULL,
  target_metric VARCHAR(255) NOT NULL,
  min_sample_size INTEGER NOT NULL DEFAULT 1000,
  confidence_level FLOAT NOT NULL DEFAULT 0.95 CHECK (confidence_level > 0 AND confidence_level <= 1),
  state experiment_state NOT NULL DEFAULT 'draft',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by VARCHAR(255) NOT NULL,

  -- Configuration
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  segmentation_rules JSONB,
  winner_variant VARCHAR(255)
);

-- Experiment variants
CREATE TABLE IF NOT EXISTS experiment_variants (
  id VARCHAR(255) PRIMARY KEY,
  experiment_id VARCHAR(255) NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_control BOOLEAN NOT NULL DEFAULT FALSE,
  allocation_weight FLOAT NOT NULL CHECK (allocation_weight >= 0 AND allocation_weight <= 1),
  payload JSONB NOT NULL,
  settings JSONB,
  UNIQUE (experiment_id, id)
);

-- Variant assignments
CREATE TABLE IF NOT EXISTS variant_assignments (
  user_id VARCHAR(255) NOT NULL,
  experiment_id VARCHAR(255) NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id VARCHAR(255) NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reassigned_from VARCHAR(255),
  PRIMARY KEY (user_id, experiment_id)
);

-- Conversion events
CREATE TABLE IF NOT EXISTS conversion_events (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  experiment_id VARCHAR(255) NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id VARCHAR(255) NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  value FLOAT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  properties JSONB
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Feature flag indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON feature_flags(environment);
CREATE INDEX IF NOT EXISTS idx_feature_flags_state ON feature_flags(state);
CREATE INDEX IF NOT EXISTS idx_feature_flags_type ON feature_flags(type);
CREATE INDEX IF NOT EXISTS idx_feature_flags_tags ON feature_flags USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_flag_rules_flag_id ON flag_rules(flag_id);
CREATE INDEX IF NOT EXISTS idx_flag_variants_flag_id ON flag_variants(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_flag_id ON feature_flag_evaluations(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_evaluations_created_at ON feature_flag_evaluations(created_at);

-- User segment indexes
CREATE INDEX IF NOT EXISTS idx_user_segments_active ON user_segments(is_active);
CREATE INDEX IF NOT EXISTS idx_user_attributes_plan ON user_attributes(plan);
CREATE INDEX IF NOT EXISTS idx_user_attributes_role ON user_attributes(role);
CREATE INDEX IF NOT EXISTS idx_user_attributes_region ON user_attributes(region);
CREATE INDEX IF NOT EXISTS idx_user_segment_assignments_user_id ON user_segment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_segment_assignments_segment_id ON user_segment_assignments(segment_id);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_user_id ON user_behaviors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_action ON user_behaviors(action);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_timestamp ON user_behaviors(timestamp);

-- Experiment indexes
CREATE INDEX IF NOT EXISTS idx_experiments_state ON experiments(state);
CREATE INDEX IF NOT EXISTS idx_experiments_created_by ON experiments(created_by);
CREATE INDEX IF NOT EXISTS idx_experiments_tags ON experiments USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_experiment_variants_experiment_id ON experiment_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_variant_assignments_user_id ON variant_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_variant_assignments_experiment_id ON variant_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id ON conversion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_experiment_id ON conversion_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_timestamp ON conversion_events(timestamp);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_segments_updated_at
    BEFORE UPDATE ON user_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at
    BEFORE UPDATE ON experiments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Active flags view
CREATE OR REPLACE VIEW active_flags AS
SELECT
    id,
    name,
    description,
    type,
    state,
    environment,
    tags,
    rollout_percentage,
    created_at,
    updated_at
FROM feature_flags
WHERE state IN ('enabled', 'rollout', 'experiment')
AND kill_switch_enabled = FALSE;

-- Experiment summary view
CREATE OR REPLACE VIEW experiment_summary AS
SELECT
    e.id,
    e.name,
    e.state,
    e.hypothesis,
    COUNT(DISTINCT va.user_id) as participants,
    COUNT(ce.id) as conversions,
    e.started_at,
    e.completed_at
FROM experiments e
LEFT JOIN variant_assignments va ON e.id = va.experiment_id
LEFT JOIN conversion_events ce ON e.id = ce.experiment_id
GROUP BY e.id, e.name, e.state, e.hypothesis, e.started_at, e.completed_at;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE feature_flags IS 'Feature flags for controlled rollouts and A/B testing';
COMMENT ON TABLE flag_rules IS 'Rules for complex flag evaluation logic';
COMMENT ON TABLE flag_variants IS 'Variants for multivariate flag testing';
COMMENT ON TABLE user_segments IS 'User segments for targeted feature rollouts';
COMMENT ON TABLE experiments IS 'A/B experiments with variant testing';
COMMENT ON TABLE variant_assignments IS 'User to variant assignments for experiments';
COMMENT ON TABLE conversion_events IS 'Conversion events tracked for experiment analysis';

-- ============================================================================
-- NOTIFICATION CHANNELS
-- ============================================================================

-- Create notification channel for feature flag changes
NOTIFY feature_flag_changes;

-- ============================================================================
-- SAMPLE DATA (optional - remove for production)
-- ============================================================================

-- Example: Create a sample feature flag
-- INSERT INTO feature_flags (id, name, description, type, state, created_by, environment)
-- VALUES ('flag_new_dashboard', 'new_dashboard', 'Enable new dashboard UI', 'boolean', 'disabled', 'system', 'development');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
