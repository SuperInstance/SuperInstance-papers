/**
 * CollaborationRepository
 *
 * Handles real-time collaboration features:
 * - Active sessions
 * - Session participants
 * - Collaboration events
 * - Permissions
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export type CollaborationRole = 'owner' | 'editor' | 'viewer' | 'commenter';
export type EventType = 'cell_created' | 'cell_updated' | 'cell_deleted' | 'cell_focused' |
  'dependency_changed' | 'comment_added' | 'selection_changed' | 'error_occurred';

export interface CollaborationSession {
  id: string;
  spreadsheetId: string;
  startedBy: string;
  startedAt: Date;
  endedAt?: Date;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  joinedAt: Date;
  leftAt?: Date;
  role: CollaborationRole;
  cursorPosition?: { columnRef: string; rowRef: number };
  selectedCells?: Array<{ columnRef: string; rowRef: number }>;
  isOnline: boolean;
}

export interface CollaborationEvent {
  id: string;
  sessionId: string;
  userId: string;
  eventType: EventType;
  eventData: Record<string, any>;
  createdAt: Date;
  processed: boolean;
  sequenceNumber?: number;
}

export interface CreateSessionInput {
  spreadsheetId: string;
  startedBy: string;
  metadata?: Record<string, any>;
}

export interface AddParticipantInput {
  sessionId: string;
  userId: string;
  role?: CollaborationRole;
  cursorPosition?: { columnRef: string; rowRef: number };
  selectedCells?: Array<{ columnRef: string; rowRef: number }>;
}

export class CollaborationRepository {
  constructor(private pool: Pool) {}

  /**
   * Create collaboration session
   */
  async createSession(input: CreateSessionInput): Promise<CollaborationSession> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO collaboration_sessions (
        id,
        spreadsheet_id,
        started_by,
        started_at,
        is_active,
        metadata
      ) VALUES ($1, $2, $3, $4, TRUE, $5)
      RETURNING
        id,
        spreadsheet_id as "spreadsheetId",
        started_by as "startedBy",
        started_at as "startedAt",
        ended_at as "endedAt",
        is_active as "isActive",
        metadata`,
      [id, input.spreadsheetId, input.startedBy, now, input.metadata || {}]
    );

    return result.rows[0];
  }

  /**
   * Get session by ID
   */
  async getSession(id: string): Promise<CollaborationSession | null> {
    const result = await this.pool.query(
      `SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        started_by as "startedBy",
        started_at as "startedAt",
        ended_at as "endedAt",
        is_active as "isActive",
        metadata
      FROM collaboration_sessions
      WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Get active session for spreadsheet
   */
  async getActiveSession(spreadsheetId: string): Promise<CollaborationSession | null> {
    const result = await this.pool.query(
      `SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        started_by as "startedBy",
        started_at as "startedAt",
        ended_at as "endedAt",
        is_active as "isActive",
        metadata
      FROM collaboration_sessions
      WHERE spreadsheet_id = $1 AND is_active = TRUE
      ORDER BY started_at DESC
      LIMIT 1`,
      [spreadsheetId]
    );

    return result.rows[0] || null;
  }

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE collaboration_sessions
      SET is_active = FALSE, ended_at = NOW()
      WHERE id = $1`,
      [sessionId]
    );
  }

  /**
   * Add participant to session
   */
  async addParticipant(input: AddParticipantInput): Promise<SessionParticipant> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO session_participants (
        id,
        session_id,
        user_id,
        joined_at,
        role,
        cursor_position,
        selected_cells,
        is_online
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      ON CONFLICT (session_id, user_id)
      DO UPDATE SET
        joined_at = EXCLUDED.joined_at,
        left_at = NULL,
        role = EXCLUDED.role,
        is_online = TRUE
      RETURNING
        id,
        session_id as "sessionId",
        user_id as "userId",
        joined_at as "joinedAt",
        left_at as "leftAt",
        role,
        cursor_position as "cursorPosition",
        selected_cells as "selectedCells",
        is_online as "isOnline"`,
      [
        id,
        input.sessionId,
        input.userId,
        now,
        input.role || 'viewer',
        input.cursorPosition,
        input.selectedCells,
      ]
    );

    return result.rows[0];
  }

  /**
   * Remove participant from session
   */
  async removeParticipant(sessionId: string, userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE session_participants
      SET left_at = NOW(), is_online = FALSE
      WHERE session_id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
  }

  /**
   * Update participant status
   */
  async updateParticipant(
    sessionId: string,
    userId: string,
    updates: {
      role?: CollaborationRole;
      cursorPosition?: { columnRef: string; rowRef: number };
      selectedCells?: Array<{ columnRef: string; rowRef: number }>;
      isOnline?: boolean;
    }
  ): Promise<SessionParticipant> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }
    if (updates.cursorPosition !== undefined) {
      fields.push(`cursor_position = $${paramIndex++}`);
      values.push(updates.cursorPosition);
    }
    if (updates.selectedCells !== undefined) {
      fields.push(`selected_cells = $${paramIndex++}`);
      values.push(updates.selectedCells);
    }
    if (updates.isOnline !== undefined) {
      fields.push(`is_online = $${paramIndex++}`);
      values.push(updates.isOnline);
    }

    values.push(sessionId, userId);

    const result = await this.pool.query(
      `UPDATE session_participants
      SET ${fields.join(', ')}
      WHERE session_id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING
        id,
        session_id as "sessionId",
        user_id as "userId",
        joined_at as "joinedAt",
        left_at as "leftAt",
        role,
        cursor_position as "cursorPosition",
        selected_cells as "selectedCells",
        is_online as "isOnline"`,
      values
    );

    return result.rows[0];
  }

  /**
   * Get participants for session
   */
  async getParticipants(sessionId: string): Promise<SessionParticipant[]> {
    const result = await this.pool.query(
      `SELECT
        sp.id,
        sp.session_id as "sessionId",
        sp.user_id as "userId",
        sp.joined_at as "joinedAt",
        sp.left_at as "leftAt",
        sp.role,
        sp.cursor_position as "cursorPosition",
        sp.selected_cells as "selectedCells",
        sp.is_online as "isOnline",
        u.username,
        u.display_name as "displayName",
        u.avatar_url as "avatarUrl"
      FROM session_participants sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.session_id = $1
      ORDER BY sp.joined_at ASC`,
      [sessionId]
    );

    return result.rows;
  }

  /**
   * Get online participants for session
   */
  async getOnlineParticipants(sessionId: string): Promise<SessionParticipant[]> {
    const result = await this.pool.query(
      `SELECT
        sp.id,
        sp.session_id as "sessionId",
        sp.user_id as "userId",
        sp.joined_at as "joinedAt",
        sp.left_at as "leftAt",
        sp.role,
        sp.cursor_position as "cursorPosition",
        sp.selected_cells as "selectedCells",
        sp.is_online as "isOnline",
        u.username,
        u.display_name as "displayName",
        u.avatar_url as "avatarUrl"
      FROM session_participants sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.session_id = $1 AND sp.is_online = TRUE
      ORDER BY sp.joined_at ASC`,
      [sessionId]
    );

    return result.rows;
  }

  /**
   * Record collaboration event
   */
  async recordEvent(
    sessionId: string,
    userId: string,
    eventType: EventType,
    eventData: Record<string, any>
  ): Promise<CollaborationEvent> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO collaboration_events (
        id,
        session_id,
        user_id,
        event_type,
        event_data,
        created_at,
        processed
      ) VALUES ($1, $2, $3, $4, $5, $6, FALSE)
      RETURNING
        id,
        session_id as "sessionId",
        user_id as "userId",
        event_type as "eventType",
        event_data as "eventData",
        created_at as "createdAt",
        processed,
        sequence_number as "sequenceNumber"`,
      [id, sessionId, userId, eventType, eventData, now]
    );

    return result.rows[0];
  }

  /**
   * Get unprocessed events for session
   */
  async getUnprocessedEvents(sessionId: string, limit = 100): Promise<CollaborationEvent[]> {
    const result = await this.pool.query(
      `SELECT
        id,
        session_id as "sessionId",
        user_id as "userId",
        event_type as "eventType",
        event_data as "eventData",
        created_at as "createdAt",
        processed,
        sequence_number as "sequenceNumber"
      FROM collaboration_events
      WHERE session_id = $1 AND processed = FALSE
      ORDER BY created_at ASC
      LIMIT $2`,
      [sessionId, limit]
    );

    return result.rows;
  }

  /**
   * Mark events as processed
   */
  async markEventsProcessed(eventIds: string[]): Promise<void> {
    await this.pool.query(
      `UPDATE collaboration_events
      SET processed = TRUE
      WHERE id = ANY($1)`,
      [eventIds]
    );
  }

  /**
   * Get recent events for spreadsheet
   */
  async getRecentEvents(
    spreadsheetId: string,
    options: {
      eventType?: EventType;
      userId?: string;
      hours?: number;
      limit?: number;
    } = {}
  ): Promise<CollaborationEvent[]> {
    const { eventType, userId, hours = 1, limit = 100 } = options;

    const conditions: string[] = [
      'cs.spreadsheet_id = $1',
      'ce.created_at > NOW() - ($2 || \' hours\')::INTERVAL'
    ];
    const values: any[] = [spreadsheetId, hours];
    let paramIndex = 3;

    if (eventType) {
      conditions.push(`ce.event_type = $${paramIndex++}`);
      values.push(eventType);
    }
    if (userId) {
      conditions.push(`ce.user_id = $${paramIndex++}`);
      values.push(userId);
    }

    const result = await this.pool.query(
      `SELECT
        ce.id,
        ce.session_id as "sessionId",
        ce.user_id as "userId",
        ce.event_type as "eventType",
        ce.event_data as "eventData",
        ce.created_at as "createdAt",
        ce.processed,
        ce.sequence_number as "sequenceNumber",
        u.username,
        u.display_name as "displayName"
      FROM collaboration_events ce
      JOIN collaboration_sessions cs ON ce.session_id = cs.id
      LEFT JOIN users u ON ce.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ce.created_at DESC
      LIMIT $${paramIndex++}`,
      [...values, limit]
    );

    return result.rows;
  }

  /**
   * Get active users for spreadsheet
   */
  async getActiveUsers(spreadsheetId: string): Promise<{
    userId: string;
    username: string;
    displayName: string;
    sessionId: string;
    role: CollaborationRole;
    cursorPosition?: { columnRef: string; rowRef: number };
  }[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT
        u.id as "userId",
        u.username,
        u.display_name as "displayName",
        sp.session_id as "sessionId",
        sp.role,
        sp.cursor_position as "cursorPosition"
      FROM collaboration_sessions cs
      JOIN session_participants sp ON sp.session_id = cs.id
      JOIN users u ON sp.user_id = u.id
      WHERE cs.spreadsheet_id = $1
        AND cs.is_active = TRUE
        AND sp.is_online = TRUE`,
      [spreadsheetId]
    );

    return result.rows;
  }

  /**
   * Cleanup inactive sessions
   */
  async cleanupInactiveSessions(maxInactiveHours = 24): Promise<number> {
    const result = await this.pool.query(
      `UPDATE collaboration_sessions
      SET is_active = FALSE, ended_at = NOW()
      WHERE is_active = TRUE
        AND started_at < NOW() - ($1 || ' hours')::INTERVAL
        AND id NOT IN (
          SELECT DISTINCT session_id
          FROM session_participants
          WHERE is_online = TRUE
        )`,
      [maxInactiveHours]
    );

    return result.rowCount || 0;
  }

  /**
   * Mark offline participants
   */
  async markOfflineParticipants(maxInactiveMinutes = 60): Promise<number> {
    const result = await this.pool.query(
      `UPDATE session_participants
      SET is_online = FALSE
      WHERE is_online = TRUE
        AND id IN (
          SELECT sp.id
          FROM session_participants sp
          JOIN collaboration_sessions cs ON sp.session_id = cs.id
          WHERE cs.is_active = TRUE
          GROUP BY sp.id, sp.joined_at
          HAVING MAX(sp.joined_at) < NOW() - ($1 || ' minutes')::INTERVAL
        )`,
      [maxInactiveMinutes]
    );

    return result.rowCount || 0;
  }
}
