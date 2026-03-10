/**
 * POLLN Spreadsheet SDK - Cell API
 *
 * Provides CRUD operations for spreadsheet cells, including batch operations,
 * queries, subscriptions, and cell locking.
 *
 * @module spreadsheet/sdk/CellAPI
 */

import type { POLLNClient } from './POLLNClient.js';
import type {
  BaseCell,
  CellReference,
  CellValue,
  CellMetadata,
  CellQuery,
  CellType,
  CellStatus,
  BatchOperation,
  BatchResponse,
  PaginatedResponse,
  APIResponse,
  EventHandler,
  Event,
  EventType,
} from './Types.js';

/**
 * Cell API Class
 *
 * Provides comprehensive cell management operations including CRUD,
 * batch operations, queries, and real-time subscriptions.
 *
 * @example
 * ```typescript
 * const client = await createClient();
 * const cellAPI = await client.cells();
 *
 * // Create a cell
 * const cell = await cellAPI.create('A1', {
 *   type: 'input',
 *   value: 42,
 *   metadata: { name: 'My Cell' }
 * });
 *
 * // Query cells
 * const cells = await cellAPI.query({
 *   type: 'input',
 *   status: 'success'
 * });
 * ```
 */
export class CellAPI {
  constructor(private client: POLLNClient) {}

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Create a new cell
   *
   * @param reference - Cell reference (e.g., "A1" or {row: 0, column: 0})
   * @param type - Cell type
   * @param value - Initial cell value
   * @param metadata - Optional cell metadata
   * @returns Created cell
   *
   * @example
   * ```typescript
   * const cell = await cellAPI.create('A1', 'input', 42, {
   *   name: 'Sales Data',
   *   description: 'Monthly sales figures'
   * });
   * ```
   */
  async create(
    reference: CellReference,
    type: CellType,
    value: CellValue,
    metadata?: CellMetadata
  ): Promise<BaseCell> {
    const response = await this.client.makeRequest<BaseCell>({
      method: 'POST',
      path: '/api/v1/cells',
      body: {
        reference: this.normalizeReference(reference),
        type,
        value,
        metadata,
      },
    });

    return response.data;
  }

  /**
   * Get a cell by reference
   *
   * @param reference - Cell reference
   * @param sheetId - Optional sheet ID
   * @returns Cell data or null if not found
   *
   * @example
   * ```typescript
   * const cell = await cellAPI.get('A1', 'sheet-123');
   * ```
   */
  async get(reference: CellReference, sheetId?: string): Promise<BaseCell | null> {
    try {
      const params: Record<string, string> = {
        reference: this.normalizeReference(reference),
      };

      if (sheetId) {
        params.sheetId = sheetId;
      }

      const response = await this.client.makeRequest<BaseCell>({
        method: 'GET',
        path: '/api/v1/cells/single',
        params,
      });

      return response.data;
    } catch (error) {
      const err = error as { code?: string };
      if (err.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a cell
   *
   * @param reference - Cell reference
   * @param updates - Updates to apply
   * @param sheetId - Optional sheet ID
   * @returns Updated cell
   *
   * @example
   * ```typescript
   * const cell = await cellAPI.update('A1', {
   *   value: 100,
   *   metadata: { name: 'Updated Cell' }
   * });
   * ```
   */
  async update(
    reference: CellReference,
    updates: Partial<Pick<BaseCell, 'value' | 'formula' | 'metadata' | 'status'>>,
    sheetId?: string
  ): Promise<BaseCell> {
    const params: Record<string, string> = {
      reference: this.normalizeReference(reference),
    };

    if (sheetId) {
      params.sheetId = sheetId;
    }

    const response = await this.client.makeRequest<BaseCell>({
      method: 'PATCH',
      path: '/api/v1/cells/single',
      params,
      body: updates,
    });

    return response.data;
  }

  /**
   * Delete a cell
   *
   * @param reference - Cell reference
   * @param sheetId - Optional sheet ID
   * @returns True if deleted successfully
   *
   * @example
   * ```typescript
   * await cellAPI.delete('A1');
   * ```
   */
  async delete(reference: CellReference, sheetId?: string): Promise<boolean> {
    const params: Record<string, string> = {
      reference: this.normalizeReference(reference),
    };

    if (sheetId) {
      params.sheetId = sheetId;
    }

    const response = await this.client.makeRequest<{ success: boolean }>({
      method: 'DELETE',
      path: '/api/v1/cells/single',
      params,
    });

    return response.data.success;
  }

  /**
   * Get multiple cells by references
   *
   * @param references - Array of cell references
   * @param sheetId - Optional sheet ID
   * @returns Map of reference to cell data
   *
   * @example
   * ```typescript
   * const cells = await cellAPI.getMultiple(['A1', 'B1', 'C1']);
   * console.log(cells.get('A1')?.value);
   * ```
   */
  async getMultiple(
    references: CellReference[],
    sheetId?: string
  ): Promise<Map<string, BaseCell>> {
    const normalizedRefs = references.map(ref => this.normalizeReference(ref));

    const body: { references: string[]; sheetId?: string } = {
      references: normalizedRefs,
    };

    if (sheetId) {
      body.sheetId = sheetId;
    }

    const response = await this.client.makeRequest<BaseCell[]>({
      method: 'POST',
      path: '/api/v1/cells/batch',
      body,
    });

    const map = new Map<string, BaseCell>();
    for (const cell of response.data) {
      map.set(cell.reference, cell);
    }

    return map;
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Execute multiple cell operations in a batch
   *
   * @param operations - Array of batch operations
   * @param sheetId - Optional sheet ID
   * @returns Batch operation results
   *
   * @example
   * ```typescript
   * const result = await cellAPI.batch([
   *   { type: 'create', reference: 'A1', value: 1 },
   *   { type: 'create', reference: 'B1', value: 2 },
   *   { type: 'update', reference: 'A1', value: 10 }
   * ]);
   *
   * console.log(`Successful: ${result.successful}, Failed: ${result.failed}`);
   * ```
   */
  async batch(operations: BatchOperation[], sheetId?: string): Promise<BatchResponse> {
    const body = {
      operations: operations.map(op => ({
        ...op,
        reference: this.normalizeReference(op.reference),
      })),
      sheetId,
    };

    const response = await this.client.makeRequest<BatchResponse>({
      method: 'POST',
      path: '/api/v1/cells/batch/execute',
      body,
    });

    return response.data;
  }

  /**
   * Bulk create cells
   *
   * @param cells - Array of cell data
   * @param sheetId - Optional sheet ID
   * @returns Created cells
   *
   * @example
   * ```typescript
   * const cells = await cellAPI.bulkCreate([
   *   { reference: 'A1', type: 'input', value: 1 },
   *   { reference: 'B1', type: 'input', value: 2 },
   *   { reference: 'C1', type: 'output', value: 3 }
   * ]);
   * ```
   */
  async bulkCreate(
    cells: Array<{
      reference: CellReference;
      type: CellType;
      value: CellValue;
      metadata?: CellMetadata;
    }>,
    sheetId?: string
  ): Promise<BaseCell[]> {
    const operations: BatchOperation[] = cells.map(cell => ({
      type: 'create',
      reference: cell.reference,
      value: cell.value,
      metadata: cell.metadata,
    }));

    const result = await this.batch(operations, sheetId);

    return result.results
      .filter(r => r.success && r.data)
      .map(r => r.data!);
  }

  /**
   * Bulk update cells
   *
   * @param updates - Array of cell updates
   * @param sheetId - Optional sheet ID
   * @returns Updated cells
   *
   * @example
   * ```typescript
   * const cells = await cellAPI.bulkUpdate([
   *   { reference: 'A1', value: 100 },
   *   { reference: 'B1', value: 200 }
   * ]);
   * ```
   */
  async bulkUpdate(
    updates: Array<{
      reference: CellReference;
      value: CellValue;
      metadata?: CellMetadata;
    }>,
    sheetId?: string
  ): Promise<BaseCell[]> {
    const operations: BatchOperation[] = updates.map(update => ({
      type: 'update',
      reference: update.reference,
      value: update.value,
      metadata: update.metadata,
    }));

    const result = await this.batch(operations, sheetId);

    return result.results
      .filter(r => r.success && r.data)
      .map(r => r.data!);
  }

  /**
   * Bulk delete cells
   *
   * @param references - Array of cell references
   * @param sheetId - Optional sheet ID
   * @returns Number of deleted cells
   *
   * @example
   * ```typescript
   * const count = await cellAPI.bulkDelete(['A1', 'B1', 'C1']);
   * console.log(`Deleted ${count} cells`);
   * ```
   */
  async bulkDelete(references: CellReference[], sheetId?: string): Promise<number> {
    const operations: BatchOperation[] = references.map(ref => ({
      type: 'delete',
      reference: ref,
    }));

    const result = await this.batch(operations, sheetId);

    return result.successful;
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Query cells with filters
   *
   * @param query - Query options
   * @param sheetId - Optional sheet ID
   * @returns Paginated cell results
   *
   * @example
   * ```typescript
   * const cells = await cellAPI.query({
   *   type: 'input',
   *   status: 'success',
   *   pagination: { page: 1, pageSize: 50 }
   * });
   * ```
   */
  async query(query: CellQuery = {}, sheetId?: string): Promise<PaginatedResponse<BaseCell>> {
    const params: Record<string, string> = {};

    if (sheetId) {
      params.sheetId = sheetId;
    }

    if (query.type) {
      params.type = query.type;
    }

    if (query.status) {
      params.status = query.status;
    }

    if (query.valueRange) {
      params.valueMin = query.valueRange.min?.toString();
      params.valueMax = query.valueRange.max?.toString();
    }

    if (query.rowRange) {
      params.rowMin = query.rowRange.min.toString();
      params.rowMax = query.rowRange.max.toString();
    }

    if (query.columnRange) {
      params.columnMin = query.columnRange.min.toString();
      params.columnMax = query.columnRange.max.toString();
    }

    if (query.searchFormula) {
      params.searchFormula = query.searchFormula;
    }

    if (query.pagination) {
      params.page = query.pagination.page?.toString() || '1';
      params.pageSize = query.pagination.pageSize?.toString() || '50';
      params.sortBy = query.pagination.sortBy || 'reference';
      params.sortOrder = query.pagination.sortOrder || 'asc';
    }

    const response = await this.client.makeRequest<PaginatedResponse<BaseCell>>({
      method: 'GET',
      path: '/api/v1/cells',
      params,
    });

    return response.data;
  }

  /**
   * Get all cells in a sheet
   *
   * @param sheetId - Sheet ID
   * @param query - Optional query filters
   * @returns All cells matching the query
   *
   * @example
   * ```typescript
   * const cells = await cellAPI.getAll('sheet-123', {
   *   type: 'input'
   * });
   * ```
   */
  async getAll(sheetId: string, query: CellQuery = {}): Promise<BaseCell[]> {
    const allCells: BaseCell[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.query(
        {
          ...query,
          pagination: { ...query.pagination, page, pageSize: 100 },
        },
        sheetId
      );

      allCells.push(...result.data);
      hasMore = result.hasNext;
      page++;
    }

    return allCells;
  }

  /**
   * Find cells by type
   *
   * @param type - Cell type
   * @param sheetId - Optional sheet ID
   * @returns Cells of the specified type
   *
   * @example
   * ```typescript
   * const inputCells = await cellAPI.findByType('input');
   * ```
   */
  async findByType(type: CellType, sheetId?: string): Promise<BaseCell[]> {
    const result = await this.query({ type }, sheetId);
    return result.data;
  }

  /**
   * Find cells by status
   *
   * @param status - Cell status
   * @param sheetId - Optional sheet ID
   * @returns Cells with the specified status
   *
   * @example
   * ```typescript
   * const errorCells = await cellAPI.findByStatus('error');
   * ```
   */
  async findByStatus(status: CellStatus, sheetId?: string): Promise<BaseCell[]> {
    const result = await this.query({ status }, sheetId);
    return result.data;
  }

  // ==========================================================================
  // Cell Value Operations
  // ==========================================================================

  /**
   * Get cell value
   *
   * @param reference - Cell reference
   * @param sheetId - Optional sheet ID
   * @returns Cell value or null if not found
   *
   * @example
   * ```typescript
   * const value = await cellAPI.getValue('A1');
   * console.log('Cell value:', value);
   * ```
   */
  async getValue(reference: CellReference, sheetId?: string): Promise<CellValue | null> {
    const cell = await this.get(reference, sheetId);
    return cell?.value ?? null;
  }

  /**
   * Set cell value
   *
   * @param reference - Cell reference
   * @param value - New value
   * @param sheetId - Optional sheet ID
   * @returns Updated cell
   *
   * @example
   * ```typescript
   * const cell = await cellAPI.setValue('A1', 42);
   * ```
   */
  async setValue(reference: CellReference, value: CellValue, sheetId?: string): Promise<BaseCell> {
    return this.update(reference, { value }, sheetId);
  }

  /**
   * Get multiple cell values
   *
   * @param references - Cell references
   * @param sheetId - Optional sheet ID
   * @returns Map of reference to value
   *
   * @example
   * ```typescript
   * const values = await cellAPI.getValues(['A1', 'B1', 'C1']);
   * console.log(values.get('A1'));
   * ```
   */
  async getValues(references: CellReference[], sheetId?: string): Promise<Map<string, CellValue>> {
    const cells = await this.getMultiple(references, sheetId);
    const map = new Map<string, CellValue>();

    for (const [ref, cell] of cells) {
      map.set(ref, cell.value);
    }

    return map;
  }

  // ==========================================================================
  // Cell Locking
  // ==========================================================================

  /**
   * Lock a cell for editing
   *
   * @param reference - Cell reference
   * @param sheetId - Optional sheet ID
   * @returns Lock token
   *
   * @example
   * ```typescript
   * const lockToken = await cellAPI.lock('A1');
   * try {
   *   // Edit cell
   *   await cellAPI.update('A1', { value: 42 }, undefined, lockToken);
   * } finally {
   *   await cellAPI.unlock('A1', lockToken);
   * }
   * ```
   */
  async lock(reference: CellReference, sheetId?: string): Promise<string> {
    const params: Record<string, string> = {
      reference: this.normalizeReference(reference),
    };

    if (sheetId) {
      params.sheetId = sheetId;
    }

    const response = await this.client.makeRequest<{ lockToken: string }>({
      method: 'POST',
      path: '/api/v1/cells/lock',
      params,
    });

    return response.data.lockToken;
  }

  /**
   * Unlock a cell
   *
   * @param reference - Cell reference
   * @param lockToken - Lock token
   * @param sheetId - Optional sheet ID
   * @returns True if unlocked successfully
   *
   * @example
   * ```typescript
   * await cellAPI.unlock('A1', lockToken);
   * ```
   */
  async unlock(reference: CellReference, lockToken: string, sheetId?: string): Promise<boolean> {
    const params: Record<string, string> = {
      reference: this.normalizeReference(reference),
      lockToken,
    };

    if (sheetId) {
      params.sheetId = sheetId;
    }

    const response = await this.client.makeRequest<{ success: boolean }>({
      method: 'DELETE',
      path: '/api/v1/cells/lock',
      params,
    });

    return response.data.success;
  }

  /**
   * Check if a cell is locked
   *
   * @param reference - Cell reference
   * @param sheetId - Optional sheet ID
   * @returns Lock info or null if not locked
   *
   * @example
   * ```typescript
   * const lockInfo = await cellAPI.isLocked('A1');
   * if (lockInfo) {
   *   console.log('Locked by:', lockInfo.owner);
   * }
   * ```
   */
  async isLocked(
    reference: CellReference,
    sheetId?: string
  ): Promise<{ locked: boolean; owner?: string; expiresAt?: number } | null> {
    const params: Record<string, string> = {
      reference: this.normalizeReference(reference),
    };

    if (sheetId) {
      params.sheetId = sheetId;
    }

    try {
      const response = await this.client.makeRequest<{
        locked: boolean;
        owner?: string;
        expiresAt?: number;
      }>({
        method: 'GET',
        path: '/api/v1/cells/lock',
        params,
      });

      return response.data;
    } catch (error) {
      const err = error as { code?: string };
      if (err.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  // ==========================================================================
  // Cell Subscriptions
  // ==========================================================================

  /**
   * Subscribe to cell events
   *
   * @param eventType - Event type to subscribe to
   * @param handler - Event handler
   * @param filter - Optional filter criteria
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = await cellAPI.subscribe(
   *   'cell:valueChanged',
   *   (event) => {
   *     console.log('Cell changed:', event.data);
   *   },
   *   { source: 'sheet-123' }
   * );
   *
   * // Later: unsubscribe();
   * ```
   */
  async subscribe(
    eventType: EventType,
    handler: EventHandler,
    filter?: { source?: string; idPattern?: string }
  ): Promise<() => Promise<void>> {
    const wsClient = await this.client.websocket();
    await wsClient.connect();

    const subscriptionId = await wsClient.subscribe(eventType, handler, filter);

    return async () => {
      await wsClient.unsubscribe(subscriptionId);
    };
  }

  /**
   * Watch a cell for changes
   *
   * @param reference - Cell reference to watch
   * @param handler - Change handler
   * @param sheetId - Optional sheet ID
   * @returns Unwatch function
   *
   * @example
   * ```typescript
   * const unwatch = await cellAPI.watch('A1', (cell) => {
   *   console.log('Cell A1 changed to:', cell.value);
   * });
   *
   * // Later: unwatch();
   * ```
   */
  async watch(
    reference: CellReference,
    handler: (cell: BaseCell) => void | Promise<void>,
    sheetId?: string
  ): Promise<() => Promise<void>> {
    const ref = this.normalizeReference(reference);
    const source = sheetId || 'default';

    return this.subscribe(
      'cell:valueChanged',
      async (event: Event<BaseCell>) => {
        if (event.data?.reference === ref) {
          await handler(event.data);
        }
      },
      { source }
    );
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Normalize cell reference to string format
   *
   * @param reference - Cell reference
   * @returns Normalized reference string
   * @private
   */
  private normalizeReference(reference: CellReference): string {
    if (typeof reference === 'string') {
      return reference.toUpperCase();
    }

    // Convert {row, column} to A1 notation
    const column = reference.column;
    const row = reference.row + 1;

    let columnRef = '';
    let col = column;
    while (col >= 0) {
      columnRef = String.fromCharCode((col % 26) + 65) + columnRef;
      col = Math.floor(col / 26) - 1;
    }

    return `${columnRef}${row}`;
  }

  /**
   * Convert A1 notation to {row, column}
   *
   * @param reference - A1 notation
   * @returns Row and column indices
   * @private
   */
  private parseReference(reference: string): { row: number; column: number } {
    const match = reference.toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid cell reference: ${reference}`);
    }

    const colRef = match[1];
    const rowRef = parseInt(match[2], 10) - 1;

    let column = 0;
    for (let i = 0; i < colRef.length; i++) {
      column = column * 26 + (colRef.charCodeAt(i) - 64);
    }

    return { row: rowRef, column };
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default CellAPI;
