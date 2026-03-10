-- ============================================================================
-- Migration 004: Row-Level Security (RLS)
-- ============================================================================
-- Implements row-level security for multi-tenant data isolation
-- Version: 1.0.0
-- Author: POLLN Team
-- Date: 2026-03-09
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Get current user ID from application context
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.user_id', TRUE)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user is spreadsheet owner
CREATE OR REPLACE FUNCTION is_spreadsheet_owner(spreadsheet_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM spreadsheets
    WHERE id = spreadsheet_id
      AND owner_id = current_user_id()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user has permission on spreadsheet
CREATE OR REPLACE FUNCTION has_spreadsheet_permission(spreadsheet_id UUID, required_permission permission_level)
RETURNS BOOLEAN AS $$
BEGIN
  -- Owner has all permissions
  IF is_spreadsheet_owner(spreadsheet_id) THEN
    RETURN TRUE;
  END IF;

  -- Check explicit permissions
  RETURN EXISTS (
    SELECT 1
    FROM spreadsheet_permissions
    WHERE spreadsheet_id = spreadsheet_permissions.spreadsheet_id
      AND user_id = current_user_id()
      AND permission_level = required_permission
      AND (expires_at IS NULL OR expires_at > NOW())
  ) OR EXISTS (
    -- Public spreadsheets are readable
    SELECT 1
    FROM spreadsheets
    WHERE id = spreadsheet_id
      AND is_public = TRUE
      AND required_permission = 'read'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE spreadsheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_consciousness ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_entanglements ENABLE ROW LEVEL SECURITY;
ALTER TABLE entangled_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE spreadsheet_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE spreadsheet_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY users_view_own ON users
  FOR SELECT
  USING (id = current_user_id());

-- Users can update their own profile
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (id = current_user_id());

-- Service role can manage all users (for admin operations)
CREATE POLICY users_service_role ON users
  FOR ALL
  USING (current_setting('app.role', TRUE) = 'service');

-- ============================================================================
-- OAUTH IDENTITIES POLICIES
-- ============================================================================

-- Users can view their own OAuth identities
CREATE POLICY oauth_identities_view_own ON oauth_identities
  FOR SELECT
  USING (user_id = current_user_id());

-- Users can manage their own OAuth identities
CREATE POLICY oauth_identities_manage_own ON oauth_identities
  FOR ALL
  USING (user_id = current_user_id());

-- Service role can manage all OAuth identities
CREATE POLICY oauth_identities_service_role ON oauth_identities
  FOR ALL
  USING (current_setting('app.role', TRUE) = 'service');

-- ============================================================================
-- SPREADSHEETS POLICIES
-- ============================================================================

-- Owners can view their spreadsheets
CREATE POLICY spreadsheets_view_own ON spreadsheets
  FOR SELECT
  USING (owner_id = current_user_id());

-- Owners can manage their spreadsheets
CREATE POLICY spreadsheets_manage_own ON spreadsheets
  FOR ALL
  USING (owner_id = current_user_id());

-- Users with read permission can view
CREATE POLICY spreadsheets_view_with_permission ON spreadsheets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spreadsheet_permissions
      WHERE spreadsheet_id = spreadsheets.id
        AND user_id = current_user_id()
        AND permission_level IN ('read', 'write', 'admin')
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- Public spreadsheets are viewable by all
CREATE POLICY spreadsheets_view_public ON spreadsheets
  FOR SELECT
  USING (is_public = TRUE);

-- Templates are viewable by all
CREATE POLICY spreadsheets_view_templates ON spreadsheets
  FOR SELECT
  USING (is_template = TRUE);

-- ============================================================================
-- SHEETS POLICIES
-- ============================================================================

-- Access through spreadsheet permissions
CREATE POLICY sheets_view_via_spreadsheet ON sheets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spreadsheets
      WHERE id = sheets.spreadsheet_id
        AND (owner_id = current_user_id() OR is_public = TRUE)
    )
    OR
    EXISTS (
      SELECT 1 FROM spreadsheet_permissions
      WHERE spreadsheet_id = sheets.spreadsheet_id
        AND user_id = current_user_id()
        AND permission_level IN ('read', 'write', 'admin')
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

CREATE POLICY sheets_manage_via_spreadsheet ON sheets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM spreadsheets
      WHERE id = sheets.spreadsheet_id
        AND owner_id = current_user_id()
    )
    OR
    EXISTS (
      SELECT 1 FROM spreadsheet_permissions
      WHERE spreadsheet_id = sheets.spreadsheet_id
        AND user_id = current_user_id()
        AND permission_level IN ('write', 'admin')
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  );

-- ============================================================================
-- CELLS POLICIES
-- ============================================================================

-- Access through sheet permissions
CREATE POLICY cells_view_via_sheet ON cells
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sheets sh
      JOIN spreadsheets s ON s.id = sh.spreadsheet_id
      WHERE sh.id = cells.sheet_id
        AND (s.owner_id = current_user_id() OR s.is_public = TRUE)
    )
    OR
    EXISTS (
      SELECT 1 FROM sheets sh
      JOIN spreadsheet_permissions sp ON sp.spreadsheet_id = sh.spreadsheet_id
      WHERE sh.id = cells.sheet_id
        AND sp.user_id = current_user_id()
        AND sp.permission_level IN ('read', 'write', 'admin')
        AND (sp.expires_at IS NULL OR sp.expires_at > NOW())
    )
  );

CREATE POLICY cells_manage_via_sheet ON cells
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sheets sh
      JOIN spreadsheets s ON s.id = sh.spreadsheet_id
      WHERE sh.id = cells.sheet_id
        AND s.owner_id = current_user_id()
    )
    OR
    EXISTS (
      SELECT 1 FROM sheets sh
      JOIN spreadsheet_permissions sp ON sp.spreadsheet_id = sh.spreadsheet_id
      WHERE sh.id = cells.sheet_id
        AND sp.user_id = current_user_id()
        AND sp.permission_level IN ('write', 'admin')
        AND (sp.expires_at IS NULL OR sp.expires_at > NOW())
    )
  );

-- ============================================================================
-- CELL VERSIONS POLICIES
-- ============================================================================

-- Access through cell permissions
CREATE POLICY cell_versions_view_via_cell ON cell_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cells c
      JOIN sheets sh ON sh.id = c.sheet_id
      JOIN spreadsheets s ON s.id = sh.spreadsheet_id
      WHERE c.id = cell_versions.cell_id
        AND (s.owner_id = current_user_id() OR s.is_public = TRUE)
    )
  );

-- ============================================================================
-- CELL DEPENDENCIES POLICIES
-- ============================================================================

-- View dependencies if you can view both cells
CREATE POLICY cell_dependencies_view_via_cells ON cell_dependencies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cells c
      JOIN sheets sh ON sh.id = c.sheet_id
      JOIN spreadsheets s ON s.id = sh.spreadsheet_id
      WHERE c.id = cell_dependencies.dependent_cell_id
        AND (s.owner_id = current_user_id() OR s.is_public = TRUE)
    )
    AND
    EXISTS (
      SELECT 1 FROM cells c
      JOIN sheets sh ON sh.id = c.sheet_id
      JOIN spreadsheets s ON s.id = sh.spreadsheet_id
      WHERE c.id = cell_dependencies.dependency_cell_id
        AND (s.owner_id = current_user_id() OR s.is_public = TRUE)
    )
  );

-- ============================================================================
-- CELL CONSCIOUSNESS POLICIES
-- ============================================================================

-- Access through cell permissions
CREATE POLICY cell_consciousness_view_via_cell ON cell_consciousness
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cells c
      JOIN sheets sh ON sh.id = c.sheet_id
      JOIN spreadsheets s ON s.id = sh.spreadsheet_id
      WHERE c.id = cell_consciousness.cell_id
        AND (s.owner_id = current_user_id() OR s.is_public = TRUE)
    )
  );

-- ============================================================================
-- CELL ENTANGLEMENTS POLICIES
-- ============================================================================

-- View own entanglements
CREATE POLICY cell_entanglements_view_own ON cell_entanglements
  FOR SELECT
  USING (created_by = current_user_id());

-- Manage own entanglements
CREATE POLICY cell_entanglements_manage_own ON cell_entanglements
  FOR ALL
  USING (created_by = current_user_id());

-- View entangled cells through entanglement access
CREATE POLICY entangled_cells_view_via_entanglement ON entangled_cells
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cell_entanglements
      WHERE id = entangled_cells.entanglement_id
        AND created_by = current_user_id()
    )
  );

-- ============================================================================
-- COLLABORATION SESSIONS POLICIES
-- ============================================================================

-- View sessions for accessible spreadsheets
CREATE POLICY collaboration_sessions_view_accessible ON collaboration_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spreadsheets
      WHERE id = collaboration_sessions.spreadsheet_id
        AND (owner_id = current_user_id() OR is_public = TRUE)
    )
    OR
    EXISTS (
      SELECT 1 FROM spreadsheet_permissions
      WHERE spreadsheet_id = collaboration_sessions.spreadsheet_id
        AND user_id = current_user_id()
        AND permission_level IN ('read', 'write', 'admin')
        AND (expires_at IS NULL OR expires_at > NOW())
    )
    OR
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_id = collaboration_sessions.id
        AND user_id = current_user_id()
    )
  );

-- Participants can view their sessions
CREATE POLICY collaboration_sessions_view_participating ON collaboration_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_id = collaboration_sessions.id
        AND user_id = current_user_id()
    )
  );

-- ============================================================================
-- SESSION PARTICIPANTS POLICIES
-- ============================================================================

-- View participants in accessible sessions
CREATE POLICY session_participants_view_accessible ON session_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_sessions
      WHERE id = session_participants.session_id
        AND spreadsheet_id IN (
          SELECT id FROM spreadsheets
          WHERE owner_id = current_user_id()
            OR is_public = TRUE
        )
    )
    OR
    user_id = current_user_id()
  );

-- Users can manage their own participation
CREATE POLICY session_participants_manage_own ON session_participants
  FOR ALL
  USING (user_id = current_user_id());

-- ============================================================================
-- SPREADSHEET PERMISSIONS POLICIES
-- ============================================================================

-- View permissions for own spreadsheets
CREATE POLICY spreadsheet_permissions_view_granted ON spreadsheet_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spreadsheets
      WHERE id = spreadsheet_permissions.spreadsheet_id
        AND owner_id = current_user_id()
    )
    OR user_id = current_user_id()
  );

-- Owners can manage permissions
CREATE POLICY spreadsheet_permissions_manage_as_owner ON spreadsheet_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM spreadsheets
      WHERE id = spreadsheet_permissions.spreadsheet_id
        AND owner_id = current_user_id()
    )
  );

-- Users can view their own permissions
CREATE POLICY spreadsheet_permissions_view_own ON spreadsheet_permissions
  FOR SELECT
  USING (user_id = current_user_id());

-- ============================================================================
-- COLLABORATION EVENTS POLICIES
-- ============================================================================

-- View events for accessible sessions
CREATE POLICY collaboration_events_view_accessible ON collaboration_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaboration_sessions
      WHERE id = collaboration_events.session_id
        AND spreadsheet_id IN (
          SELECT id FROM spreadsheets
          WHERE owner_id = current_user_id()
            OR is_public = TRUE
        )
    )
    OR
    EXISTS (
      SELECT 1 FROM session_participants
      WHERE session_id = collaboration_events.session_id
        AND user_id = current_user_id()
    )
  );

-- ============================================================================
-- SPREADSHEET SNAPSHOTS POLICIES
-- ============================================================================

-- View snapshots for accessible spreadsheets
CREATE POLICY spreadsheet_snapshots_view_accessible ON spreadsheet_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spreadsheets
      WHERE id = spreadsheet_snapshots.spreadsheet_id
        AND (owner_id = current_user_id() OR is_public = TRUE)
    )
    OR
    created_by = current_user_id()
  );

-- ============================================================================
-- AUDIT LOG POLICIES
-- ============================================================================

-- Users can view their own audit entries
CREATE POLICY audit_log_view_own ON audit_log
  FOR SELECT
  USING (user_id = current_user_id());

-- Owners can view audit log for their spreadsheets
CREATE POLICY audit_log_view_spreadsheet_owner ON audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spreadsheets
      WHERE id = audit_log.spreadsheet_id
        AND owner_id = current_user_id()
    )
  );

-- Service role can view all audit logs
CREATE POLICY audit_log_service_role ON audit_log
  FOR ALL
  USING (current_setting('app.role', TRUE) = 'service');

-- ============================================================================
-- CELL COMMENTS POLICIES
-- ============================================================================

-- View comments for accessible cells
CREATE POLICY cell_comments_view_accessible ON cell_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cells c
      JOIN sheets sh ON sh.id = c.sheet_id
      JOIN spreadsheets s ON s.id = sh.spreadsheet_id
      WHERE c.id = cell_comments.cell_id
        AND (s.owner_id = current_user_id() OR s.is_public = TRUE)
    )
  );

-- Users can manage their own comments
CREATE POLICY cell_comments_manage_own ON cell_comments
  FOR ALL
  USING (user_id = current_user_id());

-- ============================================================================
-- CELL STYLES POLICIES
-- ============================================================================

-- Access through sheet permissions
CREATE POLICY cell_styles_view_via_sheet ON cell_styles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sheets sh
      JOIN spreadsheets s ON s.id = sh.spreadsheet_id
      WHERE sh.id = cell_styles.sheet_id
        AND (s.owner_id = current_user_id() OR s.is_public = TRUE)
    )
  );

CREATE POLICY cell_styles_manage_via_sheet ON cell_styles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sheets sh
      JOIN spreadsheets s ON s.id = sh.spreadsheet_id
      WHERE sh.id = cell_styles.sheet_id
        AND s.owner_id = current_user_id()
    )
  );

-- ============================================================================
-- SEARCH INDEX POLICIES
-- ============================================================================

-- Search only accessible spreadsheets
CREATE POLICY search_index_view_accessible ON search_index
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spreadsheets
      WHERE id = search_index.spreadsheet_id
        AND (owner_id = current_user_id() OR is_public = TRUE)
    )
  );

-- Service role can manage search index
CREATE POLICY search_index_service_role ON search_index
  FOR ALL
  USING (current_setting('app.role', TRUE) = 'service');

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Function to check permissions (runs with elevated privileges)
CREATE OR REPLACE FUNCTION check_permission(
  p_spreadsheet_id UUID,
  p_permission permission_level
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_spreadsheet_permission(p_spreadsheet_id, p_permission);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get accessible spreadsheets (runs with elevated privileges)
CREATE OR REPLACE FUNCTION get_accessible_spreadsheets()
RETURNS SETOF spreadsheets AS $$
BEGIN
  RETURN QUERY
  SELECT s.*
  FROM spreadsheets s
  WHERE s.owner_id = current_user_id()
    OR s.is_public = TRUE
    OR EXISTS (
      SELECT 1 FROM spreadsheet_permissions p
      WHERE p.spreadsheet_id = s.id
        AND p.user_id = current_user_id()
        AND p.permission_level IN ('read', 'write', 'admin')
        AND (p.expires_at IS NULL OR p.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END OF MIGRATION 004
-- ============================================================================
