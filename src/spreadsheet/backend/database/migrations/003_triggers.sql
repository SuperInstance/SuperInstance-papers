-- ============================================================================
-- Migration 003: Triggers and Automation
-- ============================================================================
-- Creates triggers for automatic data maintenance
-- Version: 1.0.0
-- Author: POLLN Team
-- Date: 2026-03-09
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate column position from reference (A=1, Z=26, AA=27)
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

-- Convert position to column reference (1=A, 26=Z, 27=AA)
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

-- Normalize cell references
CREATE OR REPLACE FUNCTION normalize_cell_ref(col_ref VARCHAR(10), row_num INTEGER)
RETURNS VARCHAR(20) AS $$
BEGIN
  RETURN UPPER(col_ref) || row_num::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- CELL POSITION AUTO-CALCULATION
-- ============================================================================

-- Automatically calculate column_position and row_position from references
CREATE OR REPLACE FUNCTION calculate_cell_position()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate column position if not set or if column_ref changed
  IF NEW.column_position IS NULL OR NEW.column_ref IS DISTINCT FROM OLD.column_ref THEN
    NEW.column_position := column_position(NEW.column_ref);
  END IF;

  -- Row position is just the row reference
  IF NEW.row_position IS NULL OR NEW.row_ref IS DISTINCT FROM OLD.row_ref THEN
    NEW.row_position := NEW.row_ref;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_cell_position_trigger
  BEFORE INSERT OR UPDATE OF column_ref, row_ref ON cells
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cell_position();

-- ============================================================================
-- CELL VERSIONING
-- ============================================================================

-- Create automatic version on value/formula change
CREATE OR REPLACE FUNCTION create_cell_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
  should_version BOOLEAN;
BEGIN
  -- Determine if versioning is needed
  should_version := FALSE;

  IF TG_OP = 'INSERT' THEN
    -- Always create first version on insert
    should_version := TRUE;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Create version on value or formula change
    IF NEW.value IS DISTINCT FROM OLD.value OR
       NEW.formula IS DISTINCT FROM OLD.formula OR
       NEW.format IS DISTINCT FROM OLD.format THEN
      should_version := TRUE;
    END IF;
  END IF;

  IF should_version THEN
    -- Get next version number
    SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
    FROM cell_versions
    WHERE cell_id = COALESCE(NEW.id, OLD.id);

    -- Insert version record
    IF TG_OP = 'INSERT' THEN
      INSERT INTO cell_versions (
        cell_id,
        version,
        value,
        formula,
        display_value,
        format,
        created_by,
        change_summary
      ) VALUES (
        NEW.id,
        next_version,
        NEW.value,
        NEW.formula,
        NEW.display_value,
        NEW.format,
        NEW.metadata->>'created_by',
        'Initial version'
      );
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO cell_versions (
        cell_id,
        version,
        value,
        formula,
        display_value,
        format,
        created_by,
        change_summary,
        is_delta,
        delta_data
      ) VALUES (
        NEW.id,
        next_version,
        OLD.value,
        OLD.formula,
        OLD.display_value,
        OLD.format,
        NEW.metadata->>'updated_by',
        'Auto-versioned on update',
        TRUE,
        jsonb_build_object(
          'value_changed', NEW.value IS DISTINCT FROM OLD.value,
          'formula_changed', NEW.formula IS DISTINCT FROM OLD.formula,
          'format_changed', NEW.format IS DISTINCT FROM OLD.format
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_cell_version_trigger
  AFTER INSERT OR UPDATE ON cells
  FOR EACH ROW
  EXECUTE FUNCTION create_cell_version();

-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================

-- Log user changes
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (
      action,
      action_type,
      new_value,
      created_at,
      metadata
    ) VALUES (
      'user_created',
      'user',
      jsonb_build_object(
        'id', NEW.id,
        'email', NEW.email,
        'username', NEW.username
      ),
      NOW(),
      jsonb_build_object('trigger', 'log_user_changes')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (
      user_id,
      action,
      action_type,
      old_value,
      new_value,
      created_at,
      metadata
    ) VALUES (
      NEW.id,
      'user_updated',
      'user',
      jsonb_build_object(
        'email', OLD.email,
        'username', OLD.username,
        'is_active', OLD.is_active
      ),
      jsonb_build_object(
        'email', NEW.email,
        'username', NEW.username,
        'is_active', NEW.is_active
      ),
      NOW(),
      jsonb_build_object('trigger', 'log_user_changes')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_user_changes_trigger
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_changes();

-- Log cell changes
CREATE OR REPLACE FUNCTION log_cell_changes()
RETURNS TRIGGER AS $$
DECLARE
  sheet_info RECORD;
BEGIN
  -- Get sheet information for spreadsheet_id
  SELECT sheet_id INTO sheet_info FROM cells WHERE id = COALESCE(NEW.id, OLD.id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (
      cell_id,
      action,
      action_type,
      new_value,
      created_at,
      metadata
    ) VALUES (
      NEW.id,
      'cell_created',
      'cell',
      jsonb_build_object(
        'column_ref', NEW.column_ref,
        'row_ref', NEW.row_ref,
        'value', NEW.value,
        'formula', NEW.formula,
        'cell_type', NEW.cell_type
      ),
      NOW(),
      jsonb_build_object(
        'sheet_id', NEW.sheet_id,
        'trigger', 'log_cell_changes'
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log significant changes
    IF NEW.value IS DISTINCT FROM OLD.value OR
       NEW.formula IS DISTINCT FROM OLD.formula OR
       NEW.state IS DISTINCT FROM OLD.state THEN

      INSERT INTO audit_log (
        cell_id,
        action,
        action_type,
        old_value,
        new_value,
        created_at,
        metadata
      ) VALUES (
        NEW.id,
        'cell_updated',
        'cell',
        jsonb_build_object(
          'value', OLD.value,
          'formula', OLD.formula,
          'state', OLD.state,
          'column_ref', OLD.column_ref,
          'row_ref', OLD.row_ref
        ),
        jsonb_build_object(
          'value', NEW.value,
          'formula', NEW.formula,
          'state', NEW.state,
          'column_ref', NEW.column_ref,
          'row_ref', NEW.row_ref
        ),
        NOW(),
        jsonb_build_object(
          'sheet_id', NEW.sheet_id,
          'trigger', 'log_cell_changes'
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (
      cell_id,
      action,
      action_type,
      old_value,
      created_at,
      metadata
    ) VALUES (
      OLD.id,
      'cell_deleted',
      'cell',
      jsonb_build_object(
        'column_ref', OLD.column_ref,
        'row_ref', OLD.row_ref,
        'value', OLD.value,
        'formula', OLD.formula,
        'cell_type', OLD.cell_type
      ),
      NOW(),
      jsonb_build_object(
        'sheet_id', OLD.sheet_id,
        'trigger', 'log_cell_changes'
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_cell_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cells
  FOR EACH ROW
  EXECUTE FUNCTION log_cell_changes();

-- ============================================================================
-- SPREADSHEET VERSION INCREMENT
-- ============================================================================

-- Increment spreadsheet version on cell changes
CREATE OR REPLACE FUNCTION increment_spreadsheet_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
    UPDATE spreadsheets
    SET
      version = version + 1,
      updated_at = NOW()
    WHERE id IN (
      SELECT spreadsheet_id
      FROM sheets
      WHERE id = COALESCE(NEW.sheet_id, OLD.sheet_id)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_spreadsheet_version_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cells
  FOR EACH ROW
  EXECUTE FUNCTION increment_spreadsheet_version();

-- ============================================================================
-- SEARCH INDEX UPDATE
-- ============================================================================

-- Update search index on cell content change
CREATE OR REPLACE FUNCTION update_search_index()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Build search content
    INSERT INTO search_index (cell_id, spreadsheet_id, content, cell_type)
    VALUES (
      NEW.id,
      (SELECT spreadsheet_id FROM sheets WHERE id = NEW.sheet_id),
      COALESCE(NEW.value, '') || ' ' || COALESCE(NEW.formula, '') || ' ' || NEW.column_ref || NEW.row_ref::TEXT,
      NEW.cell_type
    )
    ON CONFLICT (cell_id) DO UPDATE SET
      content = EXCLUDED.content,
      cell_type = EXCLUDED.cell_type,
      indexed_at = NOW();
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM search_index WHERE cell_id = OLD.id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_search_index_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cells
  FOR EACH ROW
  EXECUTE FUNCTION update_search_index();

-- ============================================================================
-- DEPENDENCY GRAPH MAINTENANCE
-- ============================================================================

-- Parse formula and extract cell references
CREATE OR REPLACE FUNCTION extract_cell_references(formula TEXT)
RETURNS TEXT[] AS $$
DECLARE
  references TEXT[] := '{}';
  match TEXT;
  pattern TEXT := '[A-Z]+[0-9]+';
BEGIN
  IF formula IS NULL THEN
    RETURN '{}';
  END IF;

  -- Simple regex-based cell reference extraction
  -- In production, use a proper formula parser
  FOR match IN SELECT regexp_matches(formula, pattern, 'g') LOOP
    references := array_append(references, match);
  END LOOP;

  RETURN references;
END;
$$ LANGUAGE plpgsql;

-- Update cell dependencies based on formula
CREATE OR REPLACE FUNCTION update_cell_dependencies()
RETURNS TRIGGER AS $$
DECLARE
  cell_ref TEXT;
  ref_parts TEXT[];
  ref_col VARCHAR(10);
  ref_row INTEGER;
  dep_cell_id UUID;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.formula IS DISTINCT FROM OLD.formula) THEN
    -- Remove old dependencies
    DELETE FROM cell_dependencies WHERE dependent_cell_id = NEW.id;

    -- Extract and create new dependencies from formula
    IF NEW.formula IS NOT NULL THEN
      FOR cell_ref IN SELECT unnest(extract_cell_references(NEW.formula)) LOOP
        -- Parse cell reference (e.g., 'A1' -> col='A', row=1)
        ref_parts := regexp_matches(cell_ref, '([A-Z]+)([0-9]+)');
        ref_col := ref_parts[1];
        ref_row := ref_parts[2]::INTEGER;

        -- Find dependency cell
        SELECT id INTO dep_cell_id
        FROM cells
        WHERE sheet_id = NEW.sheet_id
          AND column_ref = ref_col
          AND row_ref = ref_row;

        -- Create dependency if found
        IF dep_cell_id IS NOT NULL THEN
          INSERT INTO cell_dependencies (dependent_cell_id, dependency_cell_id, dependency_type)
          VALUES (NEW.id, dep_cell_id, 'formula')
          ON CONFLICT (dependent_cell_id, dependency_cell_id, dependency_type) DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove all dependencies
    DELETE FROM cell_dependencies WHERE dependent_cell_id = OLD.id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cell_dependencies_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cells
  FOR EACH ROW
  EXECUTE FUNCTION update_cell_dependencies();

-- ============================================================================
-- CONSCIOUSNESS DATA CLEANUP
-- ============================================================================

-- Clean up old consciousness data (prevent unlimited growth)
CREATE OR REPLACE FUNCTION cleanup_old_consciousness()
RETURNS VOID AS $$
BEGIN
  -- Delete consciousness data older than 90 days
  DELETE FROM cell_consciousness
  WHERE timestamp < NOW() - INTERVAL '90 days';

  -- Log cleanup
  RAISE NOTICE 'Cleaned up old consciousness data';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SESSION CLEANUP
-- ============================================================================

-- Mark inactive sessions as ended
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS VOID AS $$
BEGIN
  -- End sessions inactive for more than 24 hours
  UPDATE collaboration_sessions
  SET
    is_active = FALSE,
    ended_at = NOW()
  WHERE is_active = TRUE
    AND started_at < NOW() - INTERVAL '24 hours'
    AND id NOT IN (
      SELECT DISTINCT session_id
      FROM session_participants
      WHERE is_online = TRUE
    );

  -- Mark participants offline if inactive for 1 hour
  UPDATE session_participants
  SET is_online = FALSE
  WHERE is_online = TRUE
    AND last_active_at < NOW() - INTERVAL '1 hour';

  RAISE NOTICE 'Cleaned up inactive sessions';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_oauth_identities_updated_at
  BEFORE UPDATE ON oauth_identities
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

-- ============================================================================
-- END OF MIGRATION 003
-- ============================================================================
