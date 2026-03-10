-- ============================================================================
-- Migration 005: Utility Functions and Views
-- ============================================================================
-- Creates helper functions and materialized views
-- Version: 1.0.0
-- Author: POLLN Team
-- Date: 2026-03-09
-- ============================================================================

-- ============================================================================
-- CELL ANALYSIS FUNCTIONS
-- ============================================================================

-- Get all cells that depend on a given cell (transitive closure)
CREATE OR REPLACE FUNCTION get_dependent_cells(source_cell_id UUID)
RETURNS TABLE(cell_id UUID, depth INTEGER, path UUID[]) AS $$
WITH RECURSIVE dependency_graph AS (
  -- Base case: direct dependents
  SELECT
    cd.dependent_cell_id,
    1 as depth,
    ARRAY[source_cell_id, cd.dependent_cell_id] as path
  FROM cell_dependencies cd
  WHERE cd.dependency_cell_id = source_cell_id

  UNION ALL

  -- Recursive case: dependents of dependents
  SELECT
    cd.dependent_cell_id,
    dg.depth + 1,
    dg.path || cd.dependent_cell_id
  FROM cell_dependencies cd
  INNER JOIN dependency_graph dg ON cd.dependency_cell_id = dg.cell_id
  WHERE cd.dependency_cell_id != source_cell_id
    AND NOT cd.dependent_cell_id = ANY(dg.path) -- Prevent cycles
)
SELECT DISTINCT cell_id, depth, path FROM dependency_graph;
$$ LANGUAGE SQL;

-- Get all cells that a given cell depends on (transitive closure)
CREATE OR REPLACE FUNCTION get_cell_dependencies(source_cell_id UUID)
RETURNS TABLE(cell_id UUID, depth INTEGER, path UUID[]) AS $$
WITH RECURSIVE dependency_graph AS (
  -- Base case: direct dependencies
  SELECT
    cd.dependency_cell_id,
    1 as depth,
    ARRAY[source_cell_id, cd.dependency_cell_id] as path
  FROM cell_dependencies cd
  WHERE cd.dependent_cell_id = source_cell_id

  UNION ALL

  -- Recursive case: dependencies of dependencies
  SELECT
    cd.dependency_cell_id,
    dg.depth + 1,
    dg.path || cd.dependency_cell_id
  FROM cell_dependencies cd
  INNER JOIN dependency_graph dg ON cd.dependent_cell_id = dg.cell_id
  WHERE cd.dependency_cell_id != source_cell_id
    AND NOT cd.dependency_cell_id = ANY(dg.path) -- Prevent cycles
)
SELECT DISTINCT cell_id, depth, path FROM dependency_graph;
$$ LANGUAGE SQL;

-- Detect circular dependencies
CREATE OR REPLACE FUNCTION detect_circular_dependencies(cell_id UUID)
RETURNS TABLE(circular_path UUID[]) AS $$
WITH RECURSIVE dependency_path AS (
  -- Start with the cell
  SELECT
    dependency_cell_id,
    ARRAY[dependency_cell_id] as path,
    FALSE as is_circular
  FROM cell_dependencies
  WHERE dependent_cell_id = cell_id

  UNION ALL

  -- Follow dependencies
  SELECT
    cd.dependency_cell_id,
    dp.path || cd.dependency_cell_id,
    cd.dependency_cell_id = ANY(dp.path) -- Check if we've seen this cell
  FROM cell_dependencies cd
  INNER JOIN dependency_path dp
    ON cd.dependent_cell_id = dp.path[array_length(dp.path, 1)]
  WHERE NOT dp.is_circular -- Stop if we already found a cycle
)
SELECT path FROM dependency_path WHERE is_circular = TRUE;
$$ LANGUAGE SQL;

-- ============================================================================
-- CONSCIOUSNESS ANALYSIS FUNCTIONS
-- ============================================================================

-- Get consciousness trend for a cell
CREATE OR REPLACE FUNCTION get_consciousness_trend(
  cell_id UUID,
  hours INTEGER DEFAULT 24
) RETURNS TABLE(
  timestamp TIMESTAMPTZ,
  sensation_type sensation_type,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  std_dev NUMERIC
) AS $$
SELECT
  date_trunc('hour', timestamp) as timestamp,
  sensation_type,
  AVG((sensation_data->>'value')::NUMERIC) as avg_value,
  MIN((sensation_data->>'value')::NUMERIC) as min_value,
  MAX((sensation_data->>'value')::NUMERIC) as max_value,
  STDDEV((sensation_data->>'value')::NUMERIC) as std_dev
FROM cell_consciousness
WHERE cell_id = get_consciousness_trend.cell_id
  AND timestamp > NOW() - (hours || ' hours')::INTERVAL
  AND sensation_data ? 'value'
GROUP BY date_trunc('hour', timestamp), sensation_type
ORDER BY timestamp DESC, sensation_type;
$$ LANGUAGE SQL;

-- Detect anomalies in consciousness data
CREATE OR REPLACE FUNCTION detect_consciousness_anomalies(
  cell_id UUID,
  std_devs NUMERIC DEFAULT 3
) RETURNS TABLE(
  timestamp TIMESTAMPTZ,
  sensation_type sensation_type,
  value NUMERIC,
  expected_value NUMERIC,
  deviation NUMERIC
) AS $$
WITH stats AS (
  SELECT
    sensation_type,
    AVG((sensation_data->>'value')::NUMERIC) as avg_val,
    STDDEV((sensation_data->>'value')::NUMERIC) as std_dev_val
  FROM cell_consciousness
  WHERE cell_id = detect_consciousness_anomalies.cell_id
    AND timestamp > NOW() - INTERVAL '24 hours'
  GROUP BY sensation_type
),
anomalies AS (
  SELECT
    cc.timestamp,
    cc.sensation_type,
    (cc.sensation_data->>'value')::NUMERIC as value,
    s.avg_val as expected_value,
    ABS((cc.sensation_data->>'value')::NUMERIC - s.avg_val) / NULLIF(s.std_dev_val, 0) as deviation
  FROM cell_consciousness cc
  JOIN stats s ON cc.sensation_type = s.sensation_type
  WHERE cc.cell_id = detect_consciousness_anomalies.cell_id
    AND cc.timestamp > NOW() - INTERVAL '24 hours'
    AND s.std_dev_val IS NOT NULL
)
SELECT * FROM anomalies
WHERE deviation > std_devs
ORDER BY timestamp DESC;
$$ LANGUAGE SQL;

-- Get consciousness summary for a sheet
CREATE OR REPLACE FUNCTION get_sheet_consciousness_summary(sheet_id UUID)
RETURNS TABLE(
  cell_id UUID,
  column_ref VARCHAR(10),
  row_ref INTEGER,
  total_observations BIGINT,
  last_observation TIMESTAMPTZ,
  dominant_sensation sensation_type,
  avg_calculation_ms NUMERIC
) AS $$
SELECT
  c.id as cell_id,
  c.column_ref,
  c.row_ref,
  COUNT(cc.id) as total_observations,
  MAX(cc.timestamp) as last_observation,
  mode() WITHIN GROUP (ORDER BY cc.sensation_type) as dominant_sensation,
  AVG(cc.calculation_duration_ms) as avg_calculation_ms
FROM cells c
LEFT JOIN cell_consciousness cc ON c.id = cc.cell_id
  AND cc.timestamp > NOW() - INTERVAL '24 hours'
WHERE c.sheet_id = get_sheet_consciousness_summary.sheet_id
GROUP BY c.id, c.column_ref, c.row_ref
ORDER BY c.column_position, c.row_position;
$$ LANGUAGE SQL;

-- ============================================================================
-- SPREADSHEET ANALYSIS FUNCTIONS
-- ============================================================================

-- Calculate spreadsheet complexity metrics
CREATE OR REPLACE FUNCTION get_spreadsheet_complexity(spreadsheet_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_sheets', (SELECT COUNT(*) FROM sheets WHERE spreadsheet_id = get_spreadsheet_complexity.spreadsheet_id),
    'total_cells', (SELECT COUNT(*) FROM cells c JOIN sheets s ON c.sheet_id = s.id WHERE s.spreadsheet_id = get_spreadsheet_complexity.spreadsheet_id),
    'active_cells', (SELECT COUNT(*) FROM cells c JOIN sheets s ON c.sheet_id = s.id WHERE s.spreadsheet_id = get_spreadsheet_complexity.spreadsheet_id AND c.state = 'active'),
    'cells_with_formulas', (SELECT COUNT(*) FROM cells c JOIN sheets s ON c.sheet_id = s.id WHERE s.spreadsheet_id = get_spreadsheet_complexity.spreadsheet_id AND c.formula IS NOT NULL),
    'total_dependencies', (SELECT COUNT(*) FROM cell_dependencies cd JOIN cells c ON cd.dependent_cell_id = c.id JOIN sheets s ON c.sheet_id = s.id WHERE s.spreadsheet_id = get_spreadsheet_complexity.spreadsheet_id),
    'smart_cells', (SELECT COUNT(*) FROM cells c JOIN sheets s ON c.sheet_id = s.id WHERE s.spreadsheet_id = get_spreadsheet_complexity.spreadsheet_id AND c.cell_type IN ('analysis_cell', 'prediction_cell', 'decision_cell')),
    'entanglements', (SELECT COUNT(DISTINCT ec.entanglement_id) FROM entangled_cells ec JOIN cells c ON ec.cell_id = c.id JOIN sheets s ON c.sheet_id = s.id WHERE s.spreadsheet_id = get_spreadsheet_complexity.spreadsheet_id),
    'max_dependency_depth', (
      SELECT MAX(depth)
      FROM get_dependent_cells(c.id)
      CROSS JOIN cells c2
      JOIN sheets s ON c2.sheet_id = s.id
      WHERE s.spreadsheet_id = get_spreadsheet_complexity.spreadsheet_id
    ),
    'calculated_at', NOW()
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Find potentially problematic cells (errors, circular deps, etc.)
CREATE OR REPLACE FUNCTION find_problematic_cells(spreadsheet_id UUID)
RETURNS TABLE(
  cell_id UUID,
  column_ref VARCHAR(10),
  row_ref INTEGER,
  issue_type TEXT,
  description TEXT
) AS $$
-- Error cells
SELECT
  c.id,
  c.column_ref,
  c.row_ref,
  'error' as issue_type,
  'Cell in error state' as description
FROM cells c
JOIN sheets s ON c.sheet_id = s.id
WHERE s.spreadsheet_id = find_problematic_cells.spreadsheet_id
  AND c.state = 'error'

UNION ALL

-- Circular dependencies
SELECT
  c.id,
  c.column_ref,
  c.row_ref,
  'circular_dependency' as issue_type,
  'Cell has circular dependencies' as description
FROM cells c
JOIN sheets s ON c.sheet_id = s.id
WHERE s.spreadsheet_id = find_problematic_cells.spreadsheet_id
  AND EXISTS (SELECT 1 FROM detect_circular_dependencies(c.id))

UNION ALL

-- Long calculation times
SELECT
  c.id,
  c.column_ref,
  c.row_ref,
  'slow_calculation' as issue_type,
  'Average calculation time exceeds 5 seconds' as description
FROM cells c
JOIN sheets s ON c.sheet_id = s.id
WHERE s.spreadsheet_id = find_problematic_cells.spreadsheet_id
  AND EXISTS (
    SELECT 1
    FROM cell_consciousness cc
    WHERE cc.cell_id = c.id
      AND cc.timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY cell_id
    HAVING AVG(cc.calculation_duration_ms) > 5000
  )

UNION ALL

-- Orphaned cells (not used by any other cell)
SELECT
  c.id,
  c.column_ref,
  c.row_ref,
  'orphaned' as issue_type,
  'Cell value is not referenced by any other cell' as description
FROM cells c
JOIN sheets s ON c.sheet_id = s.id
WHERE s.spreadsheet_id = find_problematic_cells.spreadsheet_id
  AND c.value IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cell_dependencies cd
    WHERE cd.dependency_cell_id = c.id
  );
$$ LANGUAGE SQL;

-- ============================================================================
-- SEARCH FUNCTIONS
-- ============================================================================

-- Full-text search across spreadsheet
CREATE OR REPLACE FUNCTION search_spreadsheet(
  spreadsheet_id UUID,
  search_query TEXT,
  limit_count INTEGER DEFAULT 50
) RETURNS TABLE(
  cell_id UUID,
  column_ref VARCHAR(10),
  row_ref INTEGER,
  cell_type cell_type,
  value TEXT,
  formula TEXT,
  rank REAL
) AS $$
SELECT
  c.id,
  c.column_ref,
  c.row_ref,
  c.cell_type,
  c.value,
  c.formula,
  ts_rank(cd.tsv, query) as rank
FROM cells c
JOIN sheets s ON c.sheet_id = s.id
CROSS JOIN LATERAL (
  SELECT to_tsvector('english',
    COALESCE(c.value, '') || ' ' ||
    COALESCE(c.formula, '') || ' ' ||
    c.column_ref || c.row_ref::TEXT
  ) as tsv
) cd,
plainto_tsquery('english', search_query) query
WHERE s.spreadsheet_id = search_spreadsheet.spreadsheet_id
  AND cd.tsv @@ query
ORDER BY rank DESC, c.column_position, c.row_position
LIMIT limit_count;
$$ LANGUAGE SQL;

-- ============================================================================
-- VERSION FUNCTIONS
-- ============================================================================

-- Get cell version history with comparison
CREATE OR REPLACE FUNCTION get_cell_version_history(cell_id UUID)
RETURNS TABLE(
  version INTEGER,
  value TEXT,
  formula TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  change_summary TEXT,
  is_delta BOOLEAN,
  previous_value TEXT,
  previous_formula TEXT
) AS $$
SELECT
  cv.version,
  cv.value,
  cv.formula,
  cv.created_at,
  cv.created_by,
  cv.change_summary,
  cv.is_delta,
  LAG(cv.value) OVER (ORDER BY cv.version) as previous_value,
  LAG(cv.formula) OVER (ORDER BY cv.version) as previous_formula
FROM cell_versions cv
WHERE cv.cell_id = get_cell_version_history.cell_id
ORDER BY cv.version DESC;
$$ LANGUAGE SQL;

-- Compare two cell versions
CREATE OR REPLACE FUNCTION compare_cell_versions(
  cell_id UUID,
  version1 INTEGER,
  version2 INTEGER
) RETURNS JSONB AS $$
DECLARE
  v1 RECORD;
  v2 RECORD;
  result JSONB;
BEGIN
  SELECT * INTO v1 FROM cell_versions WHERE cell_id = compare_cell_versions.cell_id AND version = compare_cell_versions.version1;
  SELECT * INTO v2 FROM cell_versions WHERE cell_id = compare_cell_versions.cell_id AND version = compare_cell_versions.version2;

  result := jsonb_build_object(
    'version1', jsonb_build_object(
      'version', v1.version,
      'value', v1.value,
      'formula', v1.formula,
      'created_at', v1.created_at
    ),
    'version2', jsonb_build_object(
      'version', v2.version,
      'value', v2.value,
      'formula', v2.formula,
      'created_at', v2.created_at
    ),
    'differences', jsonb_build_object(
      'value_changed', v1.value IS DISTINCT FROM v2.value,
      'formula_changed', v1.formula IS DISTINCT FROM v2.formula,
      'format_changed', v1.format IS DISTINCT FROM v2.format
    ),
    'compared_at', NOW()
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COLLABORATION FUNCTIONS
-- ============================================================================

-- Get active users in spreadsheet
CREATE OR REPLACE FUNCTION get_active_spreadsheet_users(spreadsheet_id UUID)
RETURNS TABLE(
  user_id UUID,
  username VARCHAR(100),
  display_name VARCHAR(255),
  session_id UUID,
  role collaboration_role,
  cursor_position JSONB,
  selected_cells JSONB
) AS $$
SELECT DISTINCT
  u.id,
  u.username,
  u.display_name,
  sp.session_id,
  sp.role,
  sp.cursor_position,
  sp.selected_cells
FROM collaboration_sessions cs
JOIN session_participants sp ON sp.session_id = cs.id
JOIN users u ON u.id = sp.user_id
WHERE cs.spreadsheet_id = get_active_spreadsheet_users.spreadsheet_id
  AND cs.is_active = TRUE
  AND sp.is_online = TRUE;
$$ LANGUAGE SQL;

-- ============================================================================
-- MATERIALIZED VIEWS
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
  COUNT(c.id) FILTER (WHERE c.state = 'calculating') as calculating_cells,
  COUNT(c.id) FILTER (WHERE c.cell_type = 'analysis_cell') as analysis_cells,
  COUNT(c.id) FILTER (WHERE c.cell_type = 'prediction_cell') as prediction_cells,
  COUNT(c.id) FILTER (WHERE c.cell_type = 'decision_cell') as decision_cells,
  COUNT(c.id) FILTER (WHERE c.formula IS NOT NULL) as formula_cells,
  MAX(c.updated_at) as last_activity
FROM spreadsheets s
LEFT JOIN sheets sh ON s.id = sh.spreadsheet_id
LEFT JOIN cells c ON sh.id = c.sheet_id
GROUP BY s.id, s.name;

CREATE UNIQUE INDEX idx_cell_statistics_spreadsheet ON cell_statistics(spreadsheet_id);

-- User activity summary
CREATE MATERIALIZED VIEW user_activity_summary AS
SELECT
  u.id as user_id,
  u.username,
  u.display_name,
  COUNT(DISTINCT s.id) as spreadsheet_count,
  COUNT(DISTINCT CASE WHEN s.is_public THEN s.id END) as public_spreadsheet_count,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.is_active = TRUE) as active_sessions,
  MAX(u.last_active_at) as last_active,
  COUNT(DISTINCT c.id) as total_cells_created,
  COUNT(DISTINCT cc.id) as comments_count
FROM users u
LEFT JOIN spreadsheets s ON s.owner_id = u.id
LEFT JOIN collaboration_sessions cs ON cs.started_by = u.id
LEFT JOIN sheets sh ON sh.spreadsheet_id = s.id
LEFT JOIN cells c ON c.sheet_id = sh.id
LEFT JOIN cell_comments cc ON cc.user_id = u.id
GROUP BY u.id, u.username, u.display_name;

CREATE UNIQUE INDEX idx_user_activity_summary_user ON user_activity_summary(user_id);

-- ============================================================================
-- REFRESH FUNCTIONS
-- ============================================================================

-- Refresh all materialized views concurrently
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY cell_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
END;
$$ LANGUAGE SQL;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Generate cell reference from position
CREATE OR REPLACE FUNCTION position_to_ref(column_pos INTEGER, row_pos INTEGER)
RETURNS VARCHAR(20) AS $$
DECLARE
  result VARCHAR(10);
BEGIN
  result := position_to_column(column_pos);
  RETURN result || row_pos::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate cell reference format
CREATE OR REPLACE FUNCTION is_valid_cell_ref(ref VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
  RETURN ref ~ '^[A-Z]+[0-9]+$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Parse cell reference into components
CREATE OR REPLACE FUNCTION parse_cell_ref(ref VARCHAR(20))
RETURNS TABLE(column_ref VARCHAR(10), row_ref INTEGER) AS $$
BEGIN
  IF NOT is_valid_cell_ref(ref) THEN
    RAISE EXCEPTION 'Invalid cell reference: %', ref;
  END IF;

  RETURN QUERY
  SELECT
    SUBSTRING(ref FROM '^[A-Z]+') as column_ref,
    SUBSTRING(ref FROM '[0-9]+$')::INTEGER as row_ref;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- END OF MIGRATION 005
-- ============================================================================
