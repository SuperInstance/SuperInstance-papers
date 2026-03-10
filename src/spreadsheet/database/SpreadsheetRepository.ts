/**
 * Spreadsheet Repository for POLLN Spreadsheet System
 *
 * Handles spreadsheet CRUD operations, permission management, share links,
 * and export/import functionality.
 */

import type {
  Spreadsheet,
  CreateSpreadsheetDTO,
  UpdateSpreadsheetDTO,
  SpreadsheetPermission,
  GrantPermissionDTO,
  ShareLink,
  CreateShareLinkDTO,
  Export,
  CreateExportDTO,
  Import,
  CreateImportDTO,
  PaginatedResult,
  PaginationOptions,
  SortOptions,
  ExportFormat,
  PermissionLevel,
} from './types.js';
import type { DatabaseManager } from './DatabaseManager.js';
import {
  NotFoundError,
  AlreadyExistsError,
  VersionMismatchError,
  QueryError,
  PermissionDeniedError,
} from './errors.js';

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
// Spreadsheet Repository Implementation
// ============================================================================

/**
 * Repository for spreadsheet operations
 */
export class SpreadsheetRepository {
  constructor(private readonly db: DatabaseManager) {}

  // ========================================================================
  // CRUD Operations
  // ========================================================================

  /**
   * Find a spreadsheet by ID
   *
   * @param id - Spreadsheet ID
   * @returns Spreadsheet or null if not found
   */
  async findById(id: string): Promise<Spreadsheet | null> {
    const query = `
      SELECT
        id,
        name,
        description,
        owner_id as "ownerId",
        row_count as "rowCount",
        col_count as "colCount",
        metadata,
        settings,
        version,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_accessed_at as "lastAccessedAt"
      FROM spreadsheets
      WHERE id = $1
    `;

    try {
      const result = await this.db.query<Spreadsheet>(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapSpreadsheet(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to find spreadsheet by ID', query, [id], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find all spreadsheets for a user
   *
   * @param userId - User ID
   * @param pagination - Pagination options
   * @param sort - Sort options
   * @returns Paginated result of spreadsheets
   */
  async findByUser(
    userId: string,
    pagination?: PaginationOptions,
    sort?: SortOptions
  ): Promise<PaginatedResult<Spreadsheet>> {
    const baseQuery = `
      SELECT DISTINCT
        s.id,
        s.name,
        s.description,
        s.owner_id as "ownerId",
        s.row_count as "rowCount",
        s.col_count as "colCount",
        s.metadata,
        s.settings,
        s.version,
        s.created_at as "createdAt",
        s.updated_at as "updatedAt",
        s.last_accessed_at as "lastAccessedAt"
      FROM spreadsheets s
      LEFT JOIN spreadsheet_permissions sp ON s.id = sp.spreadsheet_id
      WHERE s.owner_id = $1 OR sp.user_id = $1
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM spreadsheets s
      LEFT JOIN spreadsheet_permissions sp ON s.id = sp.spreadsheet_id
      WHERE s.owner_id = $1 OR sp.user_id = $1
    `;

    try {
      const { query, params } = buildSelectQuery(baseQuery, pagination, sort);

      const [spreadsheetsResult, countResult] = await Promise.all([
        this.db.query<Spreadsheet>(query, [userId, ...params]),
        this.db.query<{ total: bigint }>(countQuery, [userId]),
      ]);

      const total = Number(countResult.rows[0].total);
      const limit = pagination?.limit ?? 50;
      const page = pagination?.page ?? 1;
      const totalPages = Math.ceil(total / limit);

      return {
        data: spreadsheetsResult.rows.map((row) => this.mapSpreadsheet(row)),
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      throw new QueryError(
        'Failed to find spreadsheets by user',
        baseQuery,
        [userId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Create a new spreadsheet
   *
   * @param dto - Spreadsheet creation data
   * @returns Created spreadsheet
   */
  async create(dto: CreateSpreadsheetDTO): Promise<Spreadsheet> {
    const id = this.generateId();
    const now = new Date();

    const query = `
      INSERT INTO spreadsheets (
        id,
        name,
        description,
        owner_id,
        row_count,
        col_count,
        metadata,
        settings,
        version,
        created_at,
        updated_at,
        last_accessed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $9, $9
      )
      RETURNING *
    `;

    const defaultSettings = {
      autoSave: true,
      autoSaveInterval: 30000,
      iterationEnabled: false,
      iterationMaxIterations: 100,
      calculationMode: 'automatic',
      protectedRanges: [],
    };

    try {
      const result = await this.db.query<any>(query, [
        id,
        dto.name,
        dto.description ?? null,
        dto.ownerId,
        dto.rowCount ?? 1000,
        dto.colCount ?? 26,
        JSON.stringify(dto.metadata ?? {}),
        JSON.stringify({ ...defaultSettings, ...dto.settings }),
        now,
      ]);

      return this.mapSpreadsheet(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to create spreadsheet', query, [dto], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update a spreadsheet
   *
   * @param id - Spreadsheet ID
   * @param updates - Update data
   * @param expectedVersion - Expected version for optimistic locking
   * @returns Updated spreadsheet
   */
  async update(
    id: string,
    updates: UpdateSpreadsheetDTO,
    expectedVersion?: number
  ): Promise<Spreadsheet> {
    const existing = await this.findById(id);

    if (!existing) {
      throw new NotFoundError('Spreadsheet', id);
    }

    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new VersionMismatchError('Spreadsheet', id, expectedVersion, existing.version);
    }

    const updatesArray: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updatesArray.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      updatesArray.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.rowCount !== undefined) {
      updatesArray.push(`row_count = $${paramIndex++}`);
      values.push(updates.rowCount);
    }

    if (updates.colCount !== undefined) {
      updatesArray.push(`col_count = $${paramIndex++}`);
      values.push(updates.colCount);
    }

    if (updates.metadata !== undefined) {
      updatesArray.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (updates.settings !== undefined) {
      updatesArray.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify({ ...existing.settings, ...updates.settings }));
    }

    if (updatesArray.length === 0) {
      return existing;
    }

    updatesArray.push(`version = version + 1`);
    updatesArray.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE spreadsheets
      SET ${updatesArray.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, values);
      return this.mapSpreadsheet(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to update spreadsheet', query, values, {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete a spreadsheet
   *
   * @param id - Spreadsheet ID
   */
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);

    if (!existing) {
      throw new NotFoundError('Spreadsheet', id);
    }

    const query = 'DELETE FROM spreadsheets WHERE id = $1';

    try {
      await this.db.query(query, [id]);
    } catch (error) {
      throw new QueryError('Failed to delete spreadsheet', query, [id], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update last accessed timestamp
   *
   * @param id - Spreadsheet ID
   */
  async updateLastAccessed(id: string): Promise<void> {
    const query = `
      UPDATE spreadsheets
      SET last_accessed_at = $1
      WHERE id = $2
    `;

    try {
      await this.db.query(query, [new Date(), id]);
    } catch (error) {
      // Silently fail - this is just for tracking
    }
  }

  // ========================================================================
  // Permission Management
  // ========================================================================

  /**
   * Grant permission to a user
   *
   * @param dto - Permission grant data
   * @returns Created permission
   */
  async grantPermission(dto: GrantPermissionDTO): Promise<SpreadsheetPermission> {
    const id = this.generateId();
    const now = new Date();

    // Check if permission already exists
    const existing = await this.findPermission(
      dto.spreadsheetId,
      dto.userId
    );

    if (existing) {
      // Update existing permission
      return this.updatePermission(existing.id, {
        permissionLevel: dto.permissionLevel,
        expiresAt: dto.expiresAt,
      });
    }

    const query = `
      INSERT INTO spreadsheet_permissions (
        id,
        spreadsheet_id,
        user_id,
        permission_level,
        granted_by,
        granted_at,
        expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, [
        id,
        dto.spreadsheetId,
        dto.userId,
        dto.permissionLevel,
        dto.grantedBy,
        now,
        dto.expiresAt ?? null,
      ]);

      return this.mapPermission(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to grant permission', query, [dto], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Revoke permission from a user
   *
   * @param spreadsheetId - Spreadsheet ID
   * @param userId - User ID
   */
  async revokePermission(spreadsheetId: string, userId: string): Promise<void> {
    const query = `
      DELETE FROM spreadsheet_permissions
      WHERE spreadsheet_id = $1 AND user_id = $2
    `;

    try {
      await this.db.query(query, [spreadsheetId, userId]);
    } catch (error) {
      throw new QueryError(
        'Failed to revoke permission',
        query,
        [spreadsheetId, userId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Find permission for a user
   *
   * @param spreadsheetId - Spreadsheet ID
   * @param userId - User ID
   * @returns Permission or null
   */
  async findPermission(
    spreadsheetId: string,
    userId: string
  ): Promise<SpreadsheetPermission | null> {
    const query = `
      SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        user_id as "userId",
        permission_level as "permissionLevel",
        granted_by as "grantedBy",
        granted_at as "grantedAt",
        expires_at as "expiresAt"
      FROM spreadsheet_permissions
      WHERE spreadsheet_id = $1 AND user_id = $2
        AND (expires_at IS NULL OR expires_at > NOW())
    `;

    try {
      const result = await this.db.query<SpreadsheetPermission>(query, [
        spreadsheetId,
        userId,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapPermission(result.rows[0]);
    } catch (error) {
      throw new QueryError(
        'Failed to find permission',
        query,
        [spreadsheetId, userId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Get all permissions for a spreadsheet
   *
   * @param spreadsheetId - Spreadsheet ID
   * @returns Array of permissions
   */
  async getPermissions(spreadsheetId: string): Promise<SpreadsheetPermission[]> {
    const query = `
      SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        user_id as "userId",
        permission_level as "permissionLevel",
        granted_by as "grantedBy",
        granted_at as "grantedAt",
        expires_at as "expiresAt"
      FROM spreadsheet_permissions
      WHERE spreadsheet_id = $1
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY granted_at DESC
    `;

    try {
      const result = await this.db.query<SpreadsheetPermission>(query, [
        spreadsheetId,
      ]);

      return result.rows.map((row) => this.mapPermission(row));
    } catch (error) {
      throw new QueryError(
        'Failed to get permissions',
        query,
        [spreadsheetId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Check if user has permission
   *
   * @param spreadsheetId - Spreadsheet ID
   * @param userId - User ID
   * @param requiredLevel - Required permission level
   * @returns True if user has permission
   */
  async hasPermission(
    spreadsheetId: string,
    userId: string,
    requiredLevel: PermissionLevel
  ): Promise<boolean> {
    const spreadsheet = await this.findById(spreadsheetId);

    // Owner has all permissions
    if (spreadsheet?.ownerId === userId) {
      return true;
    }

    const permission = await this.findPermission(spreadsheetId, userId);

    if (!permission) {
      return false;
    }

    // Check permission hierarchy
    const levels = [PermissionLevel.VIEW, PermissionLevel.COMMENT, PermissionLevel.EDIT, PermissionLevel.OWNER];
    const requiredIndex = levels.indexOf(requiredLevel);
    const userIndex = levels.indexOf(permission.permissionLevel);

    return userIndex >= requiredIndex;
  }

  /**
   * Update permission
   */
  private async updatePermission(
    id: string,
    updates: Partial<{ permissionLevel: PermissionLevel; expiresAt: Date | null }>
  ): Promise<SpreadsheetPermission> {
    const updatesArray: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.permissionLevel !== undefined) {
      updatesArray.push(`permission_level = $${paramIndex++}`);
      values.push(updates.permissionLevel);
    }

    if (updates.expiresAt !== undefined) {
      updatesArray.push(`expires_at = $${paramIndex++}`);
      values.push(updates.expiresAt);
    }

    values.push(id);

    const query = `
      UPDATE spreadsheet_permissions
      SET ${updatesArray.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, values);
      return this.mapPermission(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to update permission', query, values, {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ========================================================================
  // Share Links
  // ========================================================================

  /**
   * Create a share link
   *
   * @param dto - Share link creation data
   * @returns Created share link
   */
  async createShareLink(dto: CreateShareLinkDTO): Promise<ShareLink> {
    const id = this.generateId();
    const token = this.generateToken();
    const now = new Date();

    const query = `
      INSERT INTO share_links (
        id,
        spreadsheet_id,
        token,
        permission_level,
        created_by,
        expires_at,
        max_uses,
        use_count,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 0, $8
      )
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, [
        id,
        dto.spreadsheetId,
        token,
        dto.permissionLevel,
        dto.createdBy,
        dto.expiresAt ?? null,
        dto.maxUses ?? null,
        now,
      ]);

      return this.mapShareLink(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to create share link', query, [dto], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find a share link by token
   *
   * @param token - Share token
   * @returns Share link or null
   */
  async findShareLinkByToken(token: string): Promise<ShareLink | null> {
    const query = `
      SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        token,
        permission_level as "permissionLevel",
        created_by as "createdBy",
        expires_at as "expiresAt",
        max_uses as "maxUses",
        use_count as "useCount",
        created_at as "createdAt"
      FROM share_links
      WHERE token = $1
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (max_uses IS NULL OR use_count < max_uses)
    `;

    try {
      const result = await this.db.query<ShareLink>(query, [token]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapShareLink(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to find share link', query, [token], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Increment share link use count
   *
   * @param token - Share token
   */
  async incrementShareLinkUse(token: string): Promise<void> {
    const query = `
      UPDATE share_links
      SET use_count = use_count + 1
      WHERE token = $1
    `;

    try {
      await this.db.query(query, [token]);
    } catch (error) {
      throw new QueryError(
        'Failed to increment share link use',
        query,
        [token],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Delete a share link
   *
   * @param id - Share link ID
   */
  async deleteShareLink(id: string): Promise<void> {
    const query = 'DELETE FROM share_links WHERE id = $1';

    try {
      await this.db.query(query, [id]);
    } catch (error) {
      throw new QueryError('Failed to delete share link', query, [id], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get all share links for a spreadsheet
   *
   * @param spreadsheetId - Spreadsheet ID
   * @returns Array of share links
   */
  async getShareLinks(spreadsheetId: string): Promise<ShareLink[]> {
    const query = `
      SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        token,
        permission_level as "permissionLevel",
        created_by as "createdBy",
        expires_at as "expiresAt",
        max_uses as "maxUses",
        use_count as "useCount",
        created_at as "createdAt"
      FROM share_links
      WHERE spreadsheet_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.db.query<ShareLink>(query, [spreadsheetId]);

      return result.rows.map((row) => this.mapShareLink(row));
    } catch (error) {
      throw new QueryError(
        'Failed to get share links',
        query,
        [spreadsheetId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  // ========================================================================
  // Export/Import
  // ========================================================================

  /**
   * Create an export job
   *
   * @param dto - Export creation data
   * @returns Created export
   */
  async createExport(dto: CreateExportDTO): Promise<Export> {
    const id = this.generateId();
    const now = new Date();

    const query = `
      INSERT INTO exports (
        id,
        spreadsheet_id,
        user_id,
        format,
        status,
        file_url,
        file_size,
        error,
        created_at,
        completed_at
      ) VALUES (
        $1, $2, $3, $4, 'pending', NULL, NULL, NULL, $5, NULL
      )
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, [
        id,
        dto.spreadsheetId,
        dto.userId,
        dto.format,
        now,
      ]);

      return this.mapExport(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to create export', query, [dto], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update export status
   *
   * @param id - Export ID
   * @param status - New status
   * @param fileUrl - File URL (if completed)
   * @param error - Error message (if failed)
   */
  async updateExportStatus(
    id: string,
    status: 'processing' | 'completed' | 'failed',
    fileUrl?: string,
    error?: string
  ): Promise<Export> {
    const updatesArray: string[] = [`status = $1`];
    const values: any[] = [status];
    let paramIndex = 2;

    if (fileUrl) {
      updatesArray.push(`file_url = $${paramIndex++}`);
      values.push(fileUrl);
    }

    if (error) {
      updatesArray.push(`error = $${paramIndex++}`);
      values.push(error);
    }

    if (status === 'completed' || status === 'failed') {
      updatesArray.push(`completed_at = $${paramIndex++}`);
      values.push(new Date());
    }

    values.push(id);

    const query = `
      UPDATE exports
      SET ${updatesArray.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, values);
      return this.mapExport(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to update export status', query, values, {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create an import job
   *
   * @param dto - Import creation data
   * @returns Created import
   */
  async createImport(dto: CreateImportDTO): Promise<Import> {
    const id = this.generateId();
    const now = new Date();

    const query = `
      INSERT INTO imports (
        id,
        spreadsheet_id,
        user_id,
        format,
        status,
        file_size,
        rows_imported,
        error,
        created_at,
        completed_at
      ) VALUES (
        $1, $2, $3, $4, 'pending', $5, NULL, NULL, $6, NULL
      )
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, [
        id,
        dto.spreadsheetId ?? null,
        dto.userId,
        dto.format,
        dto.fileSize,
        now,
      ]);

      return this.mapImport(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to create import', query, [dto], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update import status
   *
   * @param id - Import ID
   * @param status - New status
   * @param rowsImported - Number of rows imported (if completed)
   * @param spreadsheetId - Spreadsheet ID (if creating new)
   * @param error - Error message (if failed)
   */
  async updateImportStatus(
    id: string,
    status: 'processing' | 'completed' | 'failed',
    rowsImported?: number,
    spreadsheetId?: string,
    error?: string
  ): Promise<Import> {
    const updatesArray: string[] = [`status = $1`];
    const values: any[] = [status];
    let paramIndex = 2;

    if (rowsImported !== undefined) {
      updatesArray.push(`rows_imported = $${paramIndex++}`);
      values.push(rowsImported);
    }

    if (spreadsheetId) {
      updatesArray.push(`spreadsheet_id = $${paramIndex++}`);
      values.push(spreadsheetId);
    }

    if (error) {
      updatesArray.push(`error = $${paramIndex++}`);
      values.push(error);
    }

    if (status === 'completed' || status === 'failed') {
      updatesArray.push(`completed_at = $${paramIndex++}`);
      values.push(new Date());
    }

    values.push(id);

    const query = `
      UPDATE imports
      SET ${updatesArray.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, values);
      return this.mapImport(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to update import status', query, values, {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  private mapSpreadsheet(row: any): Spreadsheet {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ownerId: row.ownerId,
      rowCount: row.rowCount,
      colCount: row.colCount,
      metadata: row.metadata,
      settings: row.settings,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastAccessedAt: row.lastAccessedAt,
    };
  }

  private mapPermission(row: any): SpreadsheetPermission {
    return {
      id: row.id,
      spreadsheetId: row.spreadsheetId,
      userId: row.userId,
      permissionLevel: row.permissionLevel,
      grantedBy: row.grantedBy,
      grantedAt: row.grantedAt,
      expiresAt: row.expiresAt,
    };
  }

  private mapShareLink(row: any): ShareLink {
    return {
      id: row.id,
      spreadsheetId: row.spreadsheetId,
      token: row.token,
      permissionLevel: row.permissionLevel,
      createdBy: row.createdBy,
      expiresAt: row.expiresAt,
      maxUses: row.maxUses,
      useCount: row.useCount,
      createdAt: row.createdAt,
    };
  }

  private mapExport(row: any): Export {
    return {
      id: row.id,
      spreadsheetId: row.spreadsheetId,
      userId: row.userId,
      format: row.format,
      status: row.status,
      fileUrl: row.fileUrl,
      fileSize: row.fileSize,
      error: row.error,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    };
  }

  private mapImport(row: any): Import {
    return {
      id: row.id,
      spreadsheetId: row.spreadsheetId,
      userId: row.userId,
      format: row.format,
      status: row.status,
      fileSize: row.fileSize,
      rowsImported: row.rowsImported,
      error: row.error,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    };
  }

  private generateId(): string {
    return `ss_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}
