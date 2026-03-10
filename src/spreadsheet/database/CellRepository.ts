/**
 * Cell Repository for POLLN Spreadsheet System
 *
 * Handles all database operations for cells including CRUD, batch operations,
 * querying by range, and history tracking.
 */

import type {
  Cell,
  CreateCellDTO,
  UpdateCellDTO,
  BatchUpdateDTO,
  CellRange,
  PaginatedResult,
  PaginationOptions,
  SortOptions,
} from './types.js';
import type { DatabaseManager } from './DatabaseManager.js';
import {
  NotFoundError,
  VersionMismatchError,
  QueryError,
  UniqueViolationError,
} from './errors.js';

// ============================================================================
// Query Builder Helpers
// ============================================================================

/**
 * Build SELECT query with pagination and sorting
 */
function buildSelectQuery(
  baseQuery: string,
  pagination?: PaginationOptions,
  sort?: SortOptions
): { query: string; params: any[] } {
  const params: any[] = [];
  let query = baseQuery;

  // Add sorting
  if (sort) {
    query += ` ORDER BY ${escapeIdentifier(sort.field)} ${sort.order}`;
  }

  // Add pagination
  if (pagination) {
    const limit = pagination.limit ?? 50;
    const offset = pagination.offset ?? ((pagination.page ?? 1) - 1) * limit;

    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
  }

  return { query, params };
}

/**
 * Escape SQL identifier
 */
function escapeIdentifier(id: string): string {
  return `"${id.replace(/"/g, '""')}"`;
}

// ============================================================================
// Cell Repository Implementation
// ============================================================================

/**
 * Repository for cell operations
 */
export class CellRepository {
  constructor(private readonly db: DatabaseManager) {}

  // ========================================================================
  // CRUD Operations
  // ========================================================================

  /**
   * Find a cell by ID
   *
   * @param id - Cell ID
   * @returns Cell or null if not found
   */
  async findById(id: string): Promise<Cell | null> {
    const query = `
      SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        row,
        col,
        type,
        state,
        value,
        formula,
        logic_level as "logicLevel",
        metadata,
        version,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_executed_at as "lastExecutedAt"
      FROM cells
      WHERE id = $1
    `;

    try {
      const result = await this.db.query<Cell>(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapCell(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to find cell by ID', query, [id], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Find all cells for a spreadsheet
   *
   * @param spreadsheetId - Spreadsheet ID
   * @param pagination - Pagination options
   * @param sort - Sort options
   * @returns Paginated result of cells
   */
  async findBySpreadsheet(
    spreadsheetId: string,
    pagination?: PaginationOptions,
    sort?: SortOptions
  ): Promise<PaginatedResult<Cell>> {
    const baseQuery = `
      SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        row,
        col,
        type,
        state,
        value,
        formula,
        logic_level as "logicLevel",
        metadata,
        version,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_executed_at as "lastExecutedAt"
      FROM cells
      WHERE spreadsheet_id = $1
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM cells
      WHERE spreadsheet_id = $1
    `;

    try {
      const { query, params } = buildSelectQuery(baseQuery, pagination, sort);

      const [cellsResult, countResult] = await Promise.all([
        this.db.query<Cell>(query, [spreadsheetId, ...params]),
        this.db.query<{ total: bigint }>(countQuery, [spreadsheetId]),
      ]);

      const total = Number(countResult.rows[0].total);
      const limit = pagination?.limit ?? 50;
      const page = pagination?.page ?? 1;
      const totalPages = Math.ceil(total / limit);

      return {
        data: cellsResult.rows.map((row) => this.mapCell(row)),
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      throw new QueryError(
        'Failed to find cells by spreadsheet',
        baseQuery,
        [spreadsheetId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Find cells by position
   *
   * @param spreadsheetId - Spreadsheet ID
   * @param row - Row number
   * @param col - Column number
   * @returns Cell or null if not found
   */
  async findByPosition(
    spreadsheetId: string,
    row: number,
    col: number
  ): Promise<Cell | null> {
    const query = `
      SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        row,
        col,
        type,
        state,
        value,
        formula,
        logic_level as "logicLevel",
        metadata,
        version,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_executed_at as "lastExecutedAt"
      FROM cells
      WHERE spreadsheet_id = $1 AND row = $2 AND col = $3
    `;

    try {
      const result = await this.db.query<Cell>(query, [spreadsheetId, row, col]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapCell(result.rows[0]);
    } catch (error) {
      throw new QueryError(
        'Failed to find cell by position',
        query,
        [spreadsheetId, row, col],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Find cells within a range
   *
   * @param spreadsheetId - Spreadsheet ID
   * @param range - Cell range
   * @returns Array of cells in the range
   */
  async findByRange(spreadsheetId: string, range: CellRange): Promise<Cell[]> {
    const query = `
      SELECT
        id,
        spreadsheet_id as "spreadsheetId",
        row,
        col,
        type,
        state,
        value,
        formula,
        logic_level as "logicLevel",
        metadata,
        version,
        created_at as "createdAt",
        updated_at as "updatedAt",
        last_executed_at as "lastExecutedAt"
      FROM cells
      WHERE spreadsheet_id = $1
        AND row >= $2 AND row <= $3
        AND col >= $4 AND col <= $5
      ORDER BY row, col
    `;

    try {
      const result = await this.db.query<Cell>(query, [
        spreadsheetId,
        range.startRow,
        range.endRow,
        range.startCol,
        range.endCol,
      ]);

      return result.rows.map((row) => this.mapCell(row));
    } catch (error) {
      throw new QueryError(
        'Failed to find cells by range',
        query,
        [spreadsheetId, range],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Create a new cell
   *
   * @param dto - Cell creation data
   * @returns Created cell
   */
  async create(dto: CreateCellDTO): Promise<Cell> {
    const id = dto.id || this.generateId();
    const now = new Date();

    const query = `
      INSERT INTO cells (
        id,
        spreadsheet_id,
        row,
        col,
        type,
        state,
        value,
        formula,
        logic_level,
        metadata,
        version,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'dormant', $6, $7, $8, $9, 1, $10, $10
      )
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, [
        id,
        dto.spreadsheetId,
        dto.row,
        dto.col,
        dto.type,
        JSON.stringify(dto.value ?? null),
        dto.formula ?? null,
        dto.logicLevel ?? 0,
        JSON.stringify(dto.metadata ?? {}),
        now,
      ]);

      // Invalidate cache
      await this.invalidateSpreadsheetCache(dto.spreadsheetId);

      return this.mapCell(result.rows[0]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new UniqueViolationError('cells_spreadsheet_row_col', query);
      }
      throw new QueryError('Failed to create cell', query, [dto], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update a cell
   *
   * @param id - Cell ID
   * @param updates - Update data
   * @param expectedVersion - Expected version for optimistic locking
   * @returns Updated cell
   */
  async update(
    id: string,
    updates: UpdateCellDTO,
    expectedVersion?: number
  ): Promise<Cell> {
    const existing = await this.findById(id);

    if (!existing) {
      throw new NotFoundError('Cell', id);
    }

    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new VersionMismatchError('Cell', id, expectedVersion, existing.version);
    }

    const updatesArray: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.value !== undefined) {
      updatesArray.push(`value = $${paramIndex++}`);
      values.push(JSON.stringify(updates.value));
    }

    if (updates.formula !== undefined) {
      updatesArray.push(`formula = $${paramIndex++}`);
      values.push(updates.formula);
    }

    if (updates.state !== undefined) {
      updatesArray.push(`state = $${paramIndex++}`);
      values.push(updates.state);
    }

    if (updates.logicLevel !== undefined) {
      updatesArray.push(`logic_level = $${paramIndex++}`);
      values.push(updates.logicLevel);
    }

    if (updates.metadata !== undefined) {
      updatesArray.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (updatesArray.length === 0) {
      return existing;
    }

    updatesArray.push(`version = version + 1`);
    updatesArray.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

    const query = `
      UPDATE cells
      SET ${updatesArray.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.db.query<any>(query, values);

      // Invalidate cache
      await this.invalidateSpreadsheetCache(existing.spreadsheetId);

      return this.mapCell(result.rows[0]);
    } catch (error) {
      throw new QueryError('Failed to update cell', query, values, {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete a cell
   *
   * @param id - Cell ID
   */
  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);

    if (!existing) {
      throw new NotFoundError('Cell', id);
    }

    const query = 'DELETE FROM cells WHERE id = $1';

    try {
      await this.db.query(query, [id]);

      // Invalidate cache
      await this.invalidateSpreadsheetCache(existing.spreadsheetId);
    } catch (error) {
      throw new QueryError('Failed to delete cell', query, [id], {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ========================================================================
  // Batch Operations
  // ========================================================================

  /**
   * Create multiple cells in a single transaction
   *
   * @param dtos - Array of cell creation data
   * @returns Created cells
   */
  async batchCreate(dtos: CreateCellDTO[]): Promise<Cell[]> {
    if (dtos.length === 0) {
      return [];
    }

    return await this.db.transaction(async (tx) => {
      const cells: Cell[] = [];

      for (const dto of dtos) {
        const id = dto.id || this.generateId();
        const now = new Date();

        const query = `
          INSERT INTO cells (
            id,
            spreadsheet_id,
            row,
            col,
            type,
            state,
            value,
            formula,
            logic_level,
            metadata,
            version,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, 'dormant', $6, $7, $8, $9, 1, $10, $10
          )
          RETURNING *
        `;

        const result = await tx.query(query, [
          id,
          dto.spreadsheetId,
          dto.row,
          dto.col,
          dto.type,
          JSON.stringify(dto.value ?? null),
          dto.formula ?? null,
          dto.logicLevel ?? 0,
          JSON.stringify(dto.metadata ?? {}),
          now,
        ]);

        cells.push(this.mapCell(result.rows[0]));
      }

      // Invalidate cache for all affected spreadsheets
      const spreadsheetIds = new Set(dtos.map((dto) => dto.spreadsheetId));
      for (const spreadsheetId of spreadsheetIds) {
        await this.invalidateSpreadsheetCache(spreadsheetId);
      }

      return cells;
    });
  }

  /**
   * Update multiple cells with optimistic locking
   *
   * @param updates - Array of batch update data
   * @returns Updated cells
   */
  async batchUpdate(updates: BatchUpdateDTO[]): Promise<Cell[]> {
    if (updates.length === 0) {
      return [];
    }

    return await this.db.transaction(async (tx) => {
      const cells: Cell[] = [];

      for (const { id, updates: cellUpdates, expectedVersion } of updates) {
        // Fetch existing cell
        const existingQuery = `
          SELECT * FROM cells WHERE id = $1
        `;
        const existingResult = await tx.query(existingQuery, [id]);

        if (existingResult.rows.length === 0) {
          throw new NotFoundError('Cell', id);
        }

        const existing = this.mapCell(existingResult.rows[0]);

        if (expectedVersion !== undefined && existing.version !== expectedVersion) {
          throw new VersionMismatchError('Cell', id, expectedVersion, existing.version);
        }

        // Build update query
        const updatesArray: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (cellUpdates.value !== undefined) {
          updatesArray.push(`value = $${paramIndex++}`);
          values.push(JSON.stringify(cellUpdates.value));
        }

        if (cellUpdates.formula !== undefined) {
          updatesArray.push(`formula = $${paramIndex++}`);
          values.push(cellUpdates.formula);
        }

        if (cellUpdates.state !== undefined) {
          updatesArray.push(`state = $${paramIndex++}`);
          values.push(cellUpdates.state);
        }

        if (cellUpdates.logicLevel !== undefined) {
          updatesArray.push(`logic_level = $${paramIndex++}`);
          values.push(cellUpdates.logicLevel);
        }

        if (cellUpdates.metadata !== undefined) {
          updatesArray.push(`metadata = $${paramIndex++}`);
          values.push(JSON.stringify(cellUpdates.metadata));
        }

        if (updatesArray.length === 0) {
          cells.push(existing);
          continue;
        }

        updatesArray.push(`version = version + 1`);
        updatesArray.push(`updated_at = $${paramIndex++}`);
        values.push(new Date());
        values.push(id);

        const updateQuery = `
          UPDATE cells
          SET ${updatesArray.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        const result = await tx.query(updateQuery, values);
        cells.push(this.mapCell(result.rows[0]));
      }

      // Invalidate cache
      const cellIds = updates.map((u) => u.id);
      const existingCells = await Promise.all(
        cellIds.map((id) => this.findById(id))
      );
      const spreadsheetIds = new Set(
        existingCells
          .filter((c): c is Cell => c !== null)
          .map((c) => c.spreadsheetId)
      );

      for (const spreadsheetId of spreadsheetIds) {
        await this.invalidateSpreadsheetCache(spreadsheetId);
      }

      return cells;
    });
  }

  /**
   * Delete all cells in a spreadsheet
   *
   * @param spreadsheetId - Spreadsheet ID
   * @returns Number of cells deleted
   */
  async deleteBySpreadsheet(spreadsheetId: string): Promise<number> {
    const query = 'DELETE FROM cells WHERE spreadsheet_id = $1 RETURNING id';

    try {
      const result = await this.db.query<{ id: string }>(query, [spreadsheetId]);
      const count = result.rowCount ?? 0;

      // Invalidate cache
      await this.invalidateSpreadsheetCache(spreadsheetId);

      return count;
    } catch (error) {
      throw new QueryError(
        'Failed to delete cells by spreadsheet',
        query,
        [spreadsheetId],
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  // ========================================================================
  // Caching
  // ========================================================================

  /**
   * Invalidate cache for a spreadsheet
   */
  private async invalidateSpreadsheetCache(spreadsheetId: string): Promise<void> {
    await this.db.cacheDeletePattern(`spreadsheet:${spreadsheetId}:*`);
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Map database row to Cell entity
   */
  private mapCell(row: any): Cell {
    return {
      id: row.id,
      spreadsheetId: row.spreadsheetId,
      row: row.row,
      col: row.col,
      type: row.type,
      state: row.state,
      value: row.value,
      formula: row.formula,
      logicLevel: row.logicLevel,
      metadata: row.metadata,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastExecutedAt: row.lastExecutedAt,
    };
  }

  /**
   * Generate a unique cell ID
   */
  private generateId(): string {
    return `cell_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
