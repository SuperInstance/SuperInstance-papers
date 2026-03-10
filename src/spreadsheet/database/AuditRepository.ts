/**
 * Audit Repository for POLLN Spreadsheet System
 *
 * Handles audit log storage, event querying, and compliance reporting.
 */

import type {
  AuditLog,
  CreateAuditLogDTO,
  AuditLogQuery,
  PaginatedResult,
  PaginationOptions,
  SortOptions,
  AuditEventType,
} from './types.js';
import type { DatabaseManager } from './DatabaseManager.js';
import { QueryError } from './errors.js';

// ============================================================================
// Query Builder Helpers
// ============================================================================

function buildSelectQuery(
  baseQuery: string,
  pagination?: PaginationOptions,
  sort?: SortOptions
): { query: string; params: any[] } {
  const params: any[] = [];
  let query = baseQuery;

  if (sort) {
    query += ` ORDER BY "${sort.field}" ${sort.order}`;
  } else {
    query += ' ORDER BY timestamp DESC';
  }

  if (pagination) {
    const limit = pagination.limit ?? 50;
    const offset = pagination.offset ?? ((pagination.page ?? 1) - 1) * limit;

    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
  }

  return { query, params };
}

// ============================================================================
// Audit Repository Implementation
// ============================================================================

/**
 * Repository for audit log operations
 */
export class AuditRepository {
  constructor(private readonly db: DatabaseManager) {}

  // ========================================================================
  // Audit Log Operations
  // ========================================================================

  /**
   * Create an audit log entry
   *
   * @param dto - Audit log creation data
   * @returns Created audit log
   */
  async create(dto: CreateAuditLogDTO): Promise<AuditLog> {
    const id = this.generateId();
    const timestamp = new Date();

    const query = `
      INSERT INTO audit_logs (
        id,
        event_type,
        user_id,
        spreadsheet_id,
        cell_id,
        resource_id,
        action,
        details,
        ip_address,
        user_agent,
        timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, [
        id,
        dto.eventType,
        dto.userId ?? null,
        dto.spreadsheetId ?? null,
        dto.cellId ?? null,
        dto.resourceId ?? null,
        dto.action,
        JSON.stringify(dto.details ?? {}),
        dto.ipAddress ?? null,
        dto.userAgent ?? null,
        timestamp,
      ]);

      return this.mapAuditLog(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to create audit log', query, [dto], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create multiple audit log entries in a single transaction
   *
   * @param dtos - Array of audit log creation data
   * @returns Created audit logs
   */
  async batchCreate(dtos: CreateAuditLogDTO[]): Promise<AuditLog[]> {
    if (dtos.length === 0) {
      return [];
    }

    return await this.db.transaction(async (tx) => {
      const logs: AuditLog[] = [];

      for (const dto of dtos) {
        const id = this.generateId();
        const timestamp = new Date();

        const query = `
          INSERT INTO audit_logs (
            id,
            event_type,
            user_id,
            spreadsheet_id,
            cell_id,
            resource_id,
            action,
            details,
            ip_address,
            user_agent,
            timestamp
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          )
          RETURNING *
        `;

        const result = await tx.query(query, [
          id,
          dto.eventType,
          dto.userId ?? null,
          dto.spreadsheetId ?? null,
          dto.cellId ?? null,
          dto.resourceId ?? null,
          dto.action,
          JSON.stringify(dto.details ?? {}),
          dto.ipAddress ?? null,
          dto.userAgent ?? null,
          timestamp,
        ]);

        logs.push(this.mapAuditLog(result.rows[0]));
      }

      return logs;
    });
  }

  /**
   * Find audit logs by query
   *
   * @param query - Audit log query filters
   * @param pagination - Pagination options
   * @param sort - Sort options
   * @returns Paginated result of audit logs
   */
  async find(
    queryFilter: AuditLogQuery,
    pagination?: PaginationOptions,
    sort?: SortOptions
  ): Promise<PaginatedResult<AuditLog>> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (queryFilter.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(queryFilter.userId);
    }

    if (queryFilter.spreadsheetId) {
      conditions.push(`spreadsheet_id = $${paramIndex++}`);
      params.push(queryFilter.spreadsheetId);
    }

    if (queryFilter.cellId) {
      conditions.push(`cell_id = $${paramIndex++}`);
      params.push(queryFilter.cellId);
    }

    if (queryFilter.eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(queryFilter.eventType);
    }

    if (queryFilter.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(queryFilter.startDate);
    }

    if (queryFilter.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(queryFilter.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      SELECT
        id,
        event_type as "eventType",
        user_id as "userId",
        spreadsheet_id as "spreadsheetId",
        cell_id as "cellId",
        resource_id as "resourceId",
        action,
        details,
        ip_address as "ipAddress",
        user_agent as "userAgent",
        timestamp
      FROM audit_logs
      ${whereClause}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs
      ${whereClause}
    `;

    try {
      const { query, params: selectParams } = buildSelectQuery(baseQuery, pagination, sort);

      const [logsResult, countResult] = await Promise.all([
        this.db.query<AuditLog>(query, [...params, ...selectParams]),
        this.db.query<{ total: bigint }>(countQuery, params),
      ]);

      const total = Number(countResult.rows[0].total);
      const limit = pagination?.limit ?? 50;
      const page = pagination?.page ?? 1;
      const totalPages = Math.ceil(total / limit);

      return {
        data: logsResult.rows.map((row) => this.mapAuditLog(row)),
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      throw new QueryError('Failed to find audit logs', baseQuery, params, {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find audit logs by user
   *
   * @param userId - User ID
   * @param pagination - Pagination options
   * @returns Paginated result of audit logs
   */
  async findByUser(
    userId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    return this.find({ userId }, pagination);
  }

  /**
   * Find audit logs by spreadsheet
   *
   * @param spreadsheetId - Spreadsheet ID
   * @param pagination - Pagination options
   * @returns Paginated result of audit logs
   */
  async findBySpreadsheet(
    spreadsheetId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    return this.find({ spreadsheetId }, pagination);
  }

  /**
   * Find audit logs by cell
   *
   * @param cellId - Cell ID
   * @param pagination - Pagination options
   * @returns Paginated result of audit logs
   */
  async findByCell(
    cellId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    return this.find({ cellId }, pagination);
  }

  /**
   * Find audit logs by event type
   *
   * @param eventType - Event type
   * @param pagination - Pagination options
   * @returns Paginated result of audit logs
   */
  async findByEventType(
    eventType: AuditEventType,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    return this.find({ eventType }, pagination);
  }

  /**
   * Find audit logs by date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @param pagination - Pagination options
   * @returns Paginated result of audit logs
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>> {
    return this.find({ startDate, endDate }, pagination);
  }

  // ========================================================================
  // Compliance Reporting
  // ========================================================================

  /**
   * Generate a compliance report for a date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date) {
    const logs = await this.find({ startDate, endDate }, { limit: 1000000 });

    // Group by event type
    const byEventType: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    const bySpreadsheet: Record<string, number> = {};

    for (const log of logs.data) {
      // Count by event type
      byEventType[log.eventType] = (byEventType[log.eventType] || 0) + 1;

      // Count by user
      if (log.userId) {
        byUser[log.userId] = (byUser[log.userId] || 0) + 1;
      }

      // Count by spreadsheet
      if (log.spreadsheetId) {
        bySpreadsheet[log.spreadsheetId] = (bySpreadsheet[log.spreadsheetId] || 0) + 1;
      }
    }

    return {
      dateRange: { startDate, endDate },
      totalEvents: logs.total,
      byEventType,
      byUser,
      bySpreadsheet,
      topUsers: Object.entries(byUser)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
      topSpreadsheets: Object.entries(bySpreadsheet)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
    };
  }

  /**
   * Generate a user activity report
   *
   * @param userId - User ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns User activity report
   */
  async generateUserActivityReport(userId: string, startDate: Date, endDate: Date) {
    const logs = await this.find({ userId, startDate, endDate }, { limit: 100000 });

    // Group by event type
    const byEventType: Record<string, number> = {};
    const dailyActivity: Record<string, number> = {};

    for (const log of logs.data) {
      // Count by event type
      byEventType[log.eventType] = (byEventType[log.eventType] || 0) + 1;

      // Group by day
      const day = log.timestamp.toISOString().split('T')[0];
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    }

    return {
      userId,
      dateRange: { startDate, endDate },
      totalEvents: logs.total,
      byEventType,
      dailyActivity,
      lastActivity: logs.data[0]?.timestamp ?? null,
    };
  }

  /**
   * Generate a spreadsheet activity report
   *
   * @param spreadsheetId - Spreadsheet ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Spreadsheet activity report
   */
  async generateSpreadsheetActivityReport(
    spreadsheetId: string,
    startDate: Date,
    endDate: Date
  ) {
    const logs = await this.find({ spreadsheetId, startDate, endDate }, { limit: 100000 });

    // Group by event type
    const byEventType: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    for (const log of logs.data) {
      // Count by event type
      byEventType[log.eventType] = (byEventType[log.eventType] || 0) + 1;

      // Count by user
      if (log.userId) {
        byUser[log.userId] = (byUser[log.userId] || 0) + 1;
      }
    }

    return {
      spreadsheetId,
      dateRange: { startDate, endDate },
      totalEvents: logs.total,
      byEventType,
      byUser,
      topUsers: Object.entries(byUser)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
    };
  }

  // ========================================================================
  // Analytics
  // ========================================================================

  /**
   * Get event counts by type for a date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Event counts by type
   */
  async getEventCountsByType(startDate: Date, endDate: Date): Promise<Record<string, number>> {
    const query = `
      SELECT event_type, COUNT(*) as count
      FROM audit_logs
      WHERE timestamp >= $1 AND timestamp <= $2
      GROUP BY event_type
      ORDER BY count DESC
    `;

    try {
      const result = await this.db.query<{ event_type: string; count: bigint }>(
        query,
        [startDate, endDate]
      );

      const counts: Record<string, number> = {};
      for (const row of result.rows) {
        counts[row.event_type] = Number(row.count);
      }

      return counts;
    } catch (error) {
      throw new QueryError(
        'Failed to get event counts by type',
        query,
        [startDate, endDate],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Get active users for a date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of active user IDs
   */
  async getActiveUsers(startDate: Date, endDate: Date): Promise<string[]> {
    const query = `
      SELECT DISTINCT user_id
      FROM audit_logs
      WHERE timestamp >= $1 AND timestamp <= $2
        AND user_id IS NOT NULL
      ORDER BY user_id
    `;

    try {
      const result = await this.db.query<{ user_id: string }>(query, [startDate, endDate]);

      return result.rows.map((row) => row.user_id);
    } catch (error) {
      throw new QueryError(
        'Failed to get active users',
        query,
        [startDate, endDate],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Get activity timeline for a date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @param interval - Time interval (hour, day, week)
   * @returns Activity timeline
   */
  async getActivityTimeline(
    startDate: Date,
    endDate: Date,
    interval: 'hour' | 'day' | 'week' = 'day'
  ): Promise<Array<{ period: string; count: number }>> {
    const intervalMap = {
      hour: "date_trunc('hour', timestamp)",
      day: "date_trunc('day', timestamp)",
      week: "date_trunc('week', timestamp)",
    };

    const trunc = intervalMap[interval];

    const query = `
      SELECT
        ${trunc} as period,
        COUNT(*) as count
      FROM audit_logs
      WHERE timestamp >= $1 AND timestamp <= $2
      GROUP BY ${trunc}
      ORDER BY period
    `;

    try {
      const result = await this.db.query<{ period: Date; count: bigint }>(query, [
        startDate,
        endDate,
      ]);

      return result.rows.map((row) => ({
        period: row.period.toISOString(),
        count: Number(row.count),
      }));
    } catch (error) {
      throw new QueryError(
        'Failed to get activity timeline',
        query,
        [startDate, endDate],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  /**
   * Delete audit logs older than specified date
   *
   * @param beforeDate - Delete logs before this date
   * @returns Number of logs deleted
   */
  async deleteOldLogs(beforeDate: Date): Promise<number> {
    const query = 'DELETE FROM audit_logs WHERE timestamp < $1 RETURNING id';

    try {
      const result = await this.db.query<{ id: string }>(query, [beforeDate]);
      return result.rowCount ?? 0;
    } catch (error) {
      throw new QueryError(
        'Failed to delete old audit logs',
        query,
        [beforeDate],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private mapAuditLog(row: any): AuditLog {
    return {
      id: row.id,
      eventType: row.eventType,
      userId: row.userId,
      spreadsheetId: row.spreadsheetId,
      cellId: row.cellId,
      resourceId: row.resourceId,
      action: row.action,
      details: row.details,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      timestamp: row.timestamp,
    };
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
