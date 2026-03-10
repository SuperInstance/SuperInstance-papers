/**
 * SpreadsheetRepository
 *
 * Handles all spreadsheet-related database operations including:
 * - Spreadsheet CRUD operations
 * - Sheet management
 * - Permission management
 * - Snapshot management
 * - Search and filtering
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface Spreadsheet {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  isTemplate: boolean;
  isPublic: boolean;
  settings: Record<string, any>;
  metadata: Record<string, any>;
  version: number;
}

export interface Sheet {
  id: string;
  spreadsheetId: string;
  name: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  settings: Record<string, any>;
}

export interface SpreadsheetPermission {
  id: string;
  spreadsheetId: string;
  userId?: string;
  permissionLevel: 'read' | 'write' | 'admin';
  grantedBy?: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface SpreadsheetSnapshot {
  id: string;
  spreadsheetId: string;
  version: number;
  name?: string;
  description?: string;
  createdBy?: string;
  createdAt: Date;
  isAutomatic: boolean;
  storageUrl?: string;
  metadata: Record<string, any>;
}

export interface CreateSpreadsheetInput {
  ownerId: string;
  name: string;
  description?: string;
  isTemplate?: boolean;
  isPublic?: boolean;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateSpreadsheetInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ListSpreadsheetsOptions {
  ownerId?: string;
  isPublic?: boolean;
  isTemplate?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'ASC' | 'DESC';
}

export class SpreadsheetRepository {
  constructor(private pool: Pool) {}

  /**
   * Find spreadsheet by ID
   */
  async findById(id: string): Promise<Spreadsheet | null> {
    const result = await this.pool.query(
      `SELECT
        id,
        owner_id as "ownerId",
        name,
        description,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_accessed_at as "lastAccessedAt",
        is_template as "isTemplate",
        is_public as "isPublic",
        settings,
        metadata,
        version
      FROM spreadsheets
      WHERE id = $1`,
      [id]
    );

    const spreadsheet = result.rows[0] || null;

    // Update last accessed time
    if (spreadsheet) {
      await this.updateLastAccessed(id);
    }

    return spreadsheet;
  }

  /**
   * Create new spreadsheet
   */
  async create(input: CreateSpreadsheetInput): Promise<Spreadsheet> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO spreadsheets (
        id,
        owner_id,
        name,
        description,
        is_template,
        is_public,
        settings,
        metadata,
        created_at,
        updated_at,
        version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
      RETURNING
        id,
        owner_id as "ownerId",
        name,
        description,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_accessed_at as "lastAccessedAt",
        is_template as "isTemplate",
        is_public as "isPublic",
        settings,
        metadata,
        version`,
      [
        id,
        input.ownerId,
        input.name,
        input.description,
        input.isTemplate || false,
        input.isPublic || false,
        input.settings || {},
        input.metadata || {},
        now,
        now,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update spreadsheet
   */
  async update(id: string, input: UpdateSpreadsheetInput): Promise<Spreadsheet> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(input.isPublic);
    }
    if (input.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(input.settings);
    }
    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(input.metadata);
    }

    if (updates.length === 0) {
      return this.findById(id)!;
    }

    values.push(id);

    const result = await this.pool.query(
      `UPDATE spreadsheets
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        owner_id as "ownerId",
        name,
        description,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_accessed_at as "lastAccessedAt",
        is_template as "isTemplate",
        is_public as "isPublic",
        settings,
        metadata,
        version`,
      values
    );

    return result.rows[0];
  }

  /**
   * Update last accessed timestamp
   */
  async updateLastAccessed(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE spreadsheets SET last_accessed_at = NOW() WHERE id = $1',
      [id]
    );
  }

  /**
   * Delete spreadsheet
   */
  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM spreadsheets WHERE id = $1', [id]);
  }

  /**
   * List spreadsheets with filtering and pagination
   */
  async list(options: ListSpreadsheetsOptions = {}): Promise<{
    spreadsheets: Spreadsheet[];
    total: number;
  }> {
    const {
      ownerId,
      isPublic,
      isTemplate,
      limit = 50,
      offset = 0,
      sortBy = 'updatedAt',
      sortOrder = 'DESC',
    } = options;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (ownerId !== undefined) {
      conditions.push(`owner_id = $${paramIndex++}`);
      values.push(ownerId);
    }
    if (isPublic !== undefined) {
      conditions.push(`is_public = $${paramIndex++}`);
      values.push(isPublic);
    }
    if (isTemplate !== undefined) {
      conditions.push(`is_template = $${paramIndex++}`);
      values.push(isTemplate);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const validSortColumns = ['createdAt', 'updatedAt', 'name'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'updatedAt';
    const dbSortColumn = sortColumn === 'createdAt' ? 'created_at' : sortColumn === 'updatedAt' ? 'updated_at' : 'name';

    const [spreadsheetsResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT
          id,
          owner_id as "ownerId",
          name,
          description,
          created_at as "createdAt",
          updated_at as "updatedAt",
          last_accessed_at as "lastAccessedAt",
          is_template as "isTemplate",
          is_public as "isPublic",
          settings,
          metadata,
          version
        FROM spreadsheets
        ${whereClause}
        ORDER BY ${dbSortColumn} ${sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...values, limit, offset]
      ),
      this.pool.query(
        `SELECT COUNT(*) FROM spreadsheets ${whereClause}`,
        values
      ),
    ]);

    return {
      spreadsheets: spreadsheetsResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Search spreadsheets by name or description
   */
  async search(query: string, options: {
    limit?: number;
    offset?: number;
    ownerId?: string;
  } = {}): Promise<{ spreadsheets: Spreadsheet[]; total: number }> {
    const { limit = 50, offset = 0, ownerId } = options;

    const conditions: string[] = ['(name ILIKE $1 OR description ILIKE $1)'];
    const values: any[] = [`%${query}%`];
    let paramIndex = 2;

    if (ownerId !== undefined) {
      conditions.push(`owner_id = $${paramIndex++}`);
      values.push(ownerId);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [spreadsheetsResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT
          id,
          owner_id as "ownerId",
          name,
          description,
          created_at as "createdAt",
          updated_at as "updatedAt",
          last_accessed_at as "lastAccessedAt",
          is_template as "isTemplate",
          is_public as "isPublic",
          settings,
          metadata,
          version
        FROM spreadsheets
        ${whereClause}
        ORDER BY updated_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...values, limit, offset]
      ),
      this.pool.query(
        `SELECT COUNT(*) FROM spreadsheets ${whereClause}`,
        values
      ),
    ]);

    return {
      spreadsheets: spreadsheetsResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  /**
   * Get sheets for a spreadsheet
   */
  async getSheets(spreadsheetId: string): Promise<Sheet[]> {
    const result = await this.pool.query(
      `SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        name,
        position,
        created_at as "createdAt",
        updated_at as "updatedAt",
        settings
      FROM sheets
      WHERE spreadsheet_id = $1
      ORDER BY position ASC`,
      [spreadsheetId]
    );

    return result.rows;
  }

  /**
   * Create sheet
   */
  async createSheet(spreadsheetId: string, name: string, position: number): Promise<Sheet> {
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO sheets (
        id,
        spreadsheet_id,
        name,
        position,
        created_at,
        updated_at,
        settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        spreadsheet_id as "spreadsheetId",
        name,
        position,
        created_at as "createdAt",
        updated_at as "updatedAt",
        settings`,
      [uuidv4(), spreadsheetId, name, position, now, now, {}]
    );

    return result.rows[0];
  }

  /**
   * Update sheet
   */
  async updateSheet(sheetId: string, updates: {
    name?: string;
    position?: number;
    settings?: Record<string, any>;
  }): Promise<Sheet> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.position !== undefined) {
      fields.push(`position = $${paramIndex++}`);
      values.push(updates.position);
    }
    if (updates.settings !== undefined) {
      fields.push(`settings = $${paramIndex++}`);
      values.push(updates.settings);
    }

    values.push(sheetId);

    const result = await this.pool.query(
      `UPDATE sheets
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        spreadsheet_id as "spreadsheetId",
        name,
        position,
        created_at as "createdAt",
        updated_at as "updatedAt",
        settings`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete sheet
   */
  async deleteSheet(sheetId: string): Promise<void> {
    await this.pool.query('DELETE FROM sheets WHERE id = $1', [sheetId]);
  }

  /**
   * Grant permission
   */
  async grantPermission(
    spreadsheetId: string,
    userId: string,
    permissionLevel: 'read' | 'write' | 'admin',
    grantedBy: string,
    expiresAt?: Date
  ): Promise<SpreadsheetPermission> {
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO spreadsheet_permissions (
        id,
        spreadsheet_id,
        user_id,
        permission_level,
        granted_by,
        granted_at,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (spreadsheet_id, user_id)
      DO UPDATE SET
        permission_level = EXCLUDED.permission_level,
        granted_by = EXCLUDED.granted_by,
        granted_at = EXCLUDED.granted_at,
        expires_at = EXCLUDED.expires_at
      RETURNING
        id,
        spreadsheet_id as "spreadsheetId",
        user_id as "userId",
        permission_level as "permissionLevel",
        granted_by as "grantedBy",
        granted_at as "grantedAt",
        expires_at as "expiresAt"`,
      [uuidv4(), spreadsheetId, userId, permissionLevel, grantedBy, now, expiresAt]
    );

    return result.rows[0];
  }

  /**
   * Revoke permission
   */
  async revokePermission(spreadsheetId: string, userId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM spreadsheet_permissions WHERE spreadsheet_id = $1 AND user_id = $2',
      [spreadsheetId, userId]
    );
  }

  /**
   * Get permissions for spreadsheet
   */
  async getPermissions(spreadsheetId: string): Promise<SpreadsheetPermission[]> {
    const result = await this.pool.query(
      `SELECT
        p.id,
        p.spreadsheet_id as "spreadsheetId",
        p.user_id as "userId",
        p.permission_level as "permissionLevel",
        p.granted_by as "grantedBy",
        p.granted_at as "grantedAt",
        p.expires_at as "expiresAt",
        u.username,
        u.display_name as "displayName",
        u.email
      FROM spreadsheet_permissions p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.spreadsheet_id = $1
      ORDER BY p.granted_at DESC`,
      [spreadsheetId]
    );

    return result.rows;
  }

  /**
   * Create snapshot
   */
  async createSnapshot(
    spreadsheetId: string,
    version: number,
    createdBy: string,
    options: {
      name?: string;
      description?: string;
      isAutomatic?: boolean;
      storageUrl?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<SpreadsheetSnapshot> {
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO spreadsheet_snapshots (
        id,
        spreadsheet_id,
        version,
        name,
        description,
        created_by,
        created_at,
        is_automatic,
        storage_url,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        id,
        spreadsheet_id as "spreadsheetId",
        version,
        name,
        description,
        created_by as "createdBy",
        created_at as "createdAt",
        is_automatic as "isAutomatic",
        storage_url as "storageUrl",
        metadata`,
      [
        uuidv4(),
        spreadsheetId,
        version,
        options.name,
        options.description,
        createdBy,
        now,
        options.isAutomatic || false,
        options.storageUrl,
        options.metadata || {},
      ]
    );

    return result.rows[0];
  }

  /**
   * Get snapshots for spreadsheet
   */
  async getSnapshots(spreadsheetId: string): Promise<SpreadsheetSnapshot[]> {
    const result = await this.pool.query(
      `SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        version,
        name,
        description,
        created_by as "createdBy",
        created_at as "createdAt",
        is_automatic as "isAutomatic",
        storage_url as "storageUrl",
        metadata
      FROM spreadsheet_snapshots
      WHERE spreadsheet_id = $1
      ORDER BY version DESC`,
      [spreadsheetId]
    );

    return result.rows;
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    await this.pool.query('DELETE FROM spreadsheet_snapshots WHERE id = $1', [snapshotId]);
  }

  /**
   * Get spreadsheet statistics
   */
  async getStatistics(spreadsheetId: string): Promise<{
    sheetCount: number;
    cellCount: number;
    activeCellCount: number;
    errorCellCount: number;
    formulaCellCount: number;
    smartCellCount: number;
    lastActivity: Date | null;
  }> {
    const result = await this.pool.query(
      `SELECT
        COUNT(DISTINCT sh.id) as "sheetCount",
        COUNT(c.id) as "cellCount",
        COUNT(c.id) FILTER (WHERE c.state = 'active') as "activeCellCount",
        COUNT(c.id) FILTER (WHERE c.state = 'error') as "errorCellCount",
        COUNT(c.id) FILTER (WHERE c.formula IS NOT NULL) as "formulaCellCount",
        COUNT(c.id) FILTER (WHERE c.cell_type IN ('analysis_cell', 'prediction_cell', 'decision_cell')) as "smartCellCount",
        MAX(c.updated_at) as "lastActivity"
      FROM spreadsheets s
      LEFT JOIN sheets sh ON s.id = sh.spreadsheet_id
      LEFT JOIN cells c ON sh.id = c.sheet_id
      WHERE s.id = $1
      GROUP BY s.id`,
      [spreadsheetId]
    );

    return result.rows[0] || {
      sheetCount: 0,
      cellCount: 0,
      activeCellCount: 0,
      errorCellCount: 0,
      formulaCellCount: 0,
      smartCellCount: 0,
      lastActivity: null,
    };
  }
}
