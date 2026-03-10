/**
 * CellRepository
 *
 * Handles all cell-related database operations including:
 * - Cell CRUD operations
 * - Cell versioning
 * - Cell dependencies
 * - Batch operations
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export type CellState = 'active' | 'dormant' | 'calculating' | 'error' | 'archived';
export type CellType = 'log_cell' | 'input_cell' | 'output_cell' | 'transform_cell' |
  'filter_cell' | 'aggregate_cell' | 'validate_cell' | 'analysis_cell' |
  'prediction_cell' | 'decision_cell' | 'explain_cell';

export interface Cell {
  id: string;
  sheetId: string;
  cellType: CellType;
  columnRef: string;
  rowRef: number;
  columnPosition: number;
  rowPosition: number;
  state: CellState;
  createdAt: Date;
  updatedAt: Date;
  value?: string;
  formula?: string;
  displayValue?: string;
  format: Record<string, any>;
  metadata: Record<string, any>;
  headData: Record<string, any>;
  tailData: Record<string, any>;
}

export interface CellVersion {
  id: string;
  cellId: string;
  version: number;
  value?: string;
  formula?: string;
  displayValue?: string;
  format: Record<string, any>;
  createdAt: Date;
  createdBy?: string;
  changeSummary?: string;
  isDelta: boolean;
  deltaData?: Record<string, any>;
}

export interface CellDependency {
  id: string;
  dependentCellId: string;
  dependencyCellId: string;
  dependencyType: string;
  createdAt: Date;
  metadata: Record<string, any>;
}

export interface CreateCellInput {
  sheetId: string;
  cellType?: CellType;
  columnRef: string;
  rowRef: number;
  value?: string;
  formula?: string;
  displayValue?: string;
  format?: Record<string, any>;
  metadata?: Record<string, any>;
  headData?: Record<string, any>;
  tailData?: Record<string, any>;
}

export interface UpdateCellInput {
  value?: string;
  formula?: string;
  displayValue?: string;
  state?: CellState;
  format?: Record<string, any>;
  metadata?: Record<string, any>;
  headData?: Record<string, any>;
  tailData?: Record<string, any>;
}

export class CellRepository {
  constructor(private pool: Pool) {}

  /**
   * Find cell by ID
   */
  async findById(id: string): Promise<Cell | null> {
    const result = await this.pool.query(
      `SELECT
        id,
        sheet_id as "sheetId",
        cell_type as "cellType",
        column_ref as "columnRef",
        row_ref as "rowRef",
        column_position as "columnPosition",
        row_position as "rowPosition",
        state,
        created_at as "createdAt",
        updated_at as "updatedAt",
        value,
        formula,
        display_value as "displayValue",
        format,
        metadata,
        head_data as "headData",
        tail_data as "tailData"
      FROM cells
      WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Find cell by position
   */
  async findByPosition(sheetId: string, columnRef: string, rowRef: number): Promise<Cell | null> {
    const result = await this.pool.query(
      `SELECT
        id,
        sheet_id as "sheetId",
        cell_type as "cellType",
        column_ref as "columnRef",
        row_ref as "rowRef",
        column_position as "columnPosition",
        row_position as "rowPosition",
        state,
        created_at as "createdAt",
        updated_at as "updatedAt",
        value,
        formula,
        display_value as "displayValue",
        format,
        metadata,
        head_data as "headData",
        tail_data as "tailData"
      FROM cells
      WHERE sheet_id = $1 AND column_ref = $2 AND row_ref = $3`,
      [sheetId, columnRef, rowRef]
    );

    return result.rows[0] || null;
  }

  /**
   * Create new cell
   */
  async create(input: CreateCellInput): Promise<Cell> {
    const id = uuidv4();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO cells (
        id,
        sheet_id,
        cell_type,
        column_ref,
        row_ref,
        value,
        formula,
        display_value,
        format,
        metadata,
        head_data,
        tail_data,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING
        id,
        sheet_id as "sheetId",
        cell_type as "cellType",
        column_ref as "columnRef",
        row_ref as "rowRef",
        column_position as "columnPosition",
        row_position as "rowPosition",
        state,
        created_at as "createdAt",
        updated_at as "updatedAt",
        value,
        formula,
        display_value as "displayValue",
        format,
        metadata,
        head_data as "headData",
        tail_data as "tailData"`,
      [
        id,
        input.sheetId,
        input.cellType || 'log_cell',
        input.columnRef,
        input.rowRef,
        input.value,
        input.formula,
        input.displayValue,
        input.format || {},
        input.metadata || {},
        input.headData || {},
        input.tailData || {},
        now,
        now,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update cell
   */
  async update(id: string, input: UpdateCellInput): Promise<Cell> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.value !== undefined) {
      updates.push(`value = $${paramIndex++}`);
      values.push(input.value);
    }
    if (input.formula !== undefined) {
      updates.push(`formula = $${paramIndex++}`);
      values.push(input.formula);
    }
    if (input.displayValue !== undefined) {
      updates.push(`display_value = $${paramIndex++}`);
      values.push(input.displayValue);
    }
    if (input.state !== undefined) {
      updates.push(`state = $${paramIndex++}`);
      values.push(input.state);
    }
    if (input.format !== undefined) {
      updates.push(`format = $${paramIndex++}`);
      values.push(input.format);
    }
    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(input.metadata);
    }
    if (input.headData !== undefined) {
      updates.push(`head_data = $${paramIndex++}`);
      values.push(input.headData);
    }
    if (input.tailData !== undefined) {
      updates.push(`tail_data = $${paramIndex++}`);
      values.push(input.tailData);
    }

    if (updates.length === 0) {
      return this.findById(id)!;
    }

    values.push(id);

    const result = await this.pool.query(
      `UPDATE cells
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        sheet_id as "sheetId",
        cell_type as "cellType",
        column_ref as "columnRef",
        row_ref as "rowRef",
        column_position as "columnPosition",
        row_position as "rowPosition",
        state,
        created_at as "createdAt",
        updated_at as "updatedAt",
        value,
        formula,
        display_value as "displayValue",
        format,
        metadata,
        head_data as "headData",
        tail_data as "tailData"`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete cell
   */
  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM cells WHERE id = $1', [id]);
  }

  /**
   * Batch create cells
   */
  async batchCreate(inputs: CreateCellInput[]): Promise<Cell[]> {
    const client = await this.pool.connect();
    const cells: Cell[] = [];

    try {
      await client.query('BEGIN');

      for (const input of inputs) {
        const id = uuidv4();
        const now = new Date();

        const result = await client.query(
          `INSERT INTO cells (
            id,
            sheet_id,
            cell_type,
            column_ref,
            row_ref,
            value,
            formula,
            display_value,
            format,
            metadata,
            head_data,
            tail_data,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING
            id,
            sheet_id as "sheetId",
            cell_type as "cellType",
            column_ref as "columnRef",
            row_ref as "rowRef",
            column_position as "columnPosition",
            row_position as "rowPosition",
            state,
            created_at as "createdAt",
            updated_at as "updatedAt",
            value,
            formula,
            display_value as "displayValue",
            format,
            metadata,
            head_data as "headData",
            tail_data as "tailData"`,
          [
            id,
            input.sheetId,
            input.cellType || 'log_cell',
            input.columnRef,
            input.rowRef,
            input.value,
            input.formula,
            input.displayValue,
            input.format || {},
            input.metadata || {},
            input.headData || {},
            input.tailData || {},
            now,
            now,
          ]
        );

        cells.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return cells;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch update cells
   */
  async batchUpdate(updates: Array<{ id: string } & UpdateCellInput>): Promise<Cell[]> {
    const client = await this.pool.connect();
    const cells: Cell[] = [];

    try {
      await client.query('BEGIN');

      for (const update of updates) {
        const { id, ...input } = update;
        const cell = await this.update(id, input);
        cells.push(cell);
      }

      await client.query('COMMIT');
      return cells;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get cells for a sheet
   */
  async getCellsForSheet(sheetId: string): Promise<Cell[]> {
    const result = await this.pool.query(
      `SELECT
        id,
        sheet_id as "sheetId",
        cell_type as "cellType",
        column_ref as "columnRef",
        row_ref as "rowRef",
        column_position as "columnPosition",
        row_position as "rowPosition",
        state,
        created_at as "createdAt",
        updated_at as "updatedAt",
        value,
        formula,
        display_value as "displayValue",
        format,
        metadata,
        head_data as "headData",
        tail_data as "tailData"
      FROM cells
      WHERE sheet_id = $1
      ORDER BY column_position, row_position`,
      [sheetId]
    );

    return result.rows;
  }

  /**
   * Get cell range
   */
  async getCellRange(
    sheetId: string,
    startColumn: string,
    startRow: number,
    endColumn: string,
    endRow: number
  ): Promise<Cell[]> {
    const result = await this.pool.query(
      `SELECT
        id,
        sheet_id as "sheetId",
        cell_type as "cellType",
        column_ref as "columnRef",
        row_ref as "rowRef",
        column_position as "columnPosition",
        row_position as "rowPosition",
        state,
        created_at as "createdAt",
        updated_at as "updatedAt",
        value,
        formula,
        display_value as "displayValue",
        format,
        metadata,
        head_data as "headData",
        tail_data as "tailData"
      FROM cells
      WHERE sheet_id = $1
        AND column_position >= (SELECT column_position FROM cells WHERE sheet_id = $1 AND column_ref = $2 LIMIT 1)
        AND row_position >= $3
        AND column_position <= (SELECT column_position FROM cells WHERE sheet_id = $1 AND column_ref = $4 LIMIT 1)
        AND row_position <= $5
      ORDER BY column_position, row_position`,
      [sheetId, startColumn, startRow, endColumn, endRow]
    );

    return result.rows;
  }

  /**
   * Get cell dependencies
   */
  async getDependencies(cellId: string): Promise<CellDependency[]> {
    const result = await this.pool.query(
      `SELECT
        id,
        dependent_cell_id as "dependentCellId",
        dependency_cell_id as "dependencyCellId",
        dependency_type as "dependencyType",
        created_at as "createdAt",
        metadata
      FROM cell_dependencies
      WHERE dependent_cell_id = $1`,
      [cellId]
    );

    return result.rows;
  }

  /**
   * Get dependent cells (what depends on this cell)
   */
  async getDependents(cellId: string): Promise<CellDependency[]> {
    const result = await this.pool.query(
      `SELECT
        id,
        dependent_cell_id as "dependentCellId",
        dependency_cell_id as "dependencyCellId",
        dependency_type as "dependencyType",
        created_at as "createdAt",
        metadata
      FROM cell_dependencies
      WHERE dependency_cell_id = $1`,
      [cellId]
    );

    return result.rows;
  }

  /**
   * Get cell versions
   */
  async getVersions(cellId: string, limit = 50): Promise<CellVersion[]> {
    const result = await this.pool.query(
      `SELECT
        id,
        cell_id as "cellId",
        version,
        value,
        formula,
        display_value as "displayValue",
        format,
        created_at as "createdAt",
        created_by as "createdBy",
        change_summary as "changeSummary",
        is_delta as "isDelta",
        delta_data as "deltaData"
      FROM cell_versions
      WHERE cell_id = $1
      ORDER BY version DESC
      LIMIT $2`,
      [cellId, limit]
    );

    return result.rows;
  }

  /**
   * Search cells
   */
  async search(query: string, spreadsheetId: string, limit = 50): Promise<Cell[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT
        c.id,
        c.sheet_id as "sheetId",
        c.cell_type as "cellType",
        c.column_ref as "columnRef",
        c.row_ref as "rowRef",
        c.column_position as "columnPosition",
        c.row_position as "rowPosition",
        c.state,
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        c.value,
        c.formula,
        c.display_value as "displayValue",
        c.format,
        c.metadata,
        c.head_data as "headData",
        c.tail_data as "tailData"
      FROM cells c
      JOIN sheets s ON c.sheet_id = s.id
      WHERE s.spreadsheet_id = $1
        AND (
          c.value ILIKE $2
          OR c.formula ILIKE $2
          OR c.column_ref || c.row_ref::TEXT ILIKE $2
        )
      ORDER BY c.column_position, c.row_position
      LIMIT $3`,
      [spreadsheetId, `%${query}%`, limit]
    );

    return result.rows;
  }
}
