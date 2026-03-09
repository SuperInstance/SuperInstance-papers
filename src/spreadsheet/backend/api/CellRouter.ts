/**
 * POLLN Spreadsheet Backend - REST API Router
 *
 * REST API endpoints for cell CRUD operations.
 * Integrates with TieredCache for optimal performance.
 *
 * Endpoints:
 * - GET    /cells/:id              - Get single cell
 * - GET    /cells/batch            - Get multiple cells
 * - GET    /cells?range=...        - Get cells in range
 * - GET    /cells?row=X&col=Y      - Get cell at position
 * - POST   /cells                  - Create new cell
 * - PATCH  /cells/:id              - Update cell
 * - DELETE /cells/:id              - Delete cell
 * - POST   /cells/batch            - Batch create
 * - PATCH  /cells/batch            - Batch update
 * - GET    /cells/:id/consciousness - Get consciousness stream
 * - GET    /cells/:id/neighbors     - Get neighborhood cells
 * - POST   /cells/entangle         - Entangle two cells
 * - DELETE /cells/entangle         - Disentangle cells
 */

import { Router, Request, Response } from 'express';
import { getTieredCache, CellData } from '../cache/TieredCache';

/**
 * Cell creation request
 */
export interface CreateCellRequest {
  row: number;
  col: number;
  type: string;
  value?: unknown;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Cell update request
 */
export interface UpdateCellRequest {
  value?: unknown;
  confidence?: number;
  state?: string;
  version?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Batch operation request
 */
export interface BatchRequest {
  cells: Array<{ id: string } & CreateCellRequest>;
}

/**
 * Batch update request
 */
export interface BatchUpdateRequest {
  updates: Array<{ id: string } & UpdateCellRequest>;
}

/**
 * Batch operation result
 */
export interface BatchResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
}

/**
 * Range query parameters
 */
export interface RangeQuery {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/**
 * Entanglement request
 */
export interface EntangleRequest {
  cell1: string;
  cell2: string;
  mode: 'sync' | 'mirror' | 'complement';
}

/**
 * Create cell ID from position
 */
function cellIdFromPosition(row: number, col: number): string {
  const colLetter = col <= 26
    ? String.fromCharCode(64 + col)
    : String.fromCharCode(64 + Math.floor((col - 1) / 26)) +
      String.fromCharCode(64 + ((col - 1) % 26) + 1);
  return `${colLetter}${row}`;
}

/**
 * Parse cell ID to position
 */
function parseCellId(cellId: string): { row: number; col: number } | null {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;

  const colStr = match[1];
  const row = parseInt(match[2], 10);

  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }

  return { row, col };
}

/**
 * Validate cell position
 */
function validatePosition(row: number, col: number): boolean {
  return row > 0 && row <= 1048576 && col > 0 && col <= 16384; // Excel limits
}

/**
 * REST API Router
 */
export class CellRouter {
  private router: Router;
  private cache: ReturnType<typeof getTieredCache>;

  constructor() {
    this.router = Router();
    this.cache = getTieredCache();
    this.setupRoutes();
  }

  /**
   * Get Express router
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // GET /cells/:id - Get single cell
    this.router.get('/cells/:id', this.getCell.bind(this));

    // GET /cells/batch - Get multiple cells
    this.router.post('/cells/batch', this.getBatch.bind(this));

    // GET /cells?range=... - Get cells in range
    this.router.get('/cells', this.getCellsInRange.bind(this));

    // POST /cells - Create new cell
    this.router.post('/cells', this.createCell.bind(this));

    // PATCH /cells/:id - Update cell
    this.router.patch('/cells/:id', this.updateCell.bind(this));

    // DELETE /cells/:id - Delete cell
    this.router.delete('/cells/:id', this.deleteCell.bind(this));

    // PATCH /cells/batch - Batch update
    this.router.patch('/cells/batch', this.updateBatch.bind(this));

    // GET /cells/:id/consciousness - Get consciousness stream
    this.router.get('/cells/:id/consciousness', this.getConsciousness.bind(this));

    // GET /cells/:id/neighbors - Get neighborhood cells
    this.router.get('/cells/:id/neighbors', this.getNeighbors.bind(this));

    // POST /cells/entangle - Entangle cells
    this.router.post('/cells/entangle', this.entangleCells.bind(this));

    // DELETE /cells/entangle - Disentangle cells
    this.router.delete('/cells/entangle', this.disentangleCells.bind(this));

    // GET /health - Health check
    this.router.get('/health', this.healthCheck.bind(this));

    // GET /stats - Cache statistics
    this.router.get('/stats', this.getStats.bind(this));
  }

  /**
   * GET /cells/:id
   */
  private async getCell(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const cell = await this.cache.get(id);

      if (!cell) {
        res.status(404).json({ error: 'Cell not found', id });
        return;
      }

      res.json(cell);
    } catch (error) {
      console.error('[CellRouter] Error getting cell:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /cells/batch
   */
  private async getBatch(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        res.status(400).json({ error: 'ids must be an array' });
        return;
      }

      if (ids.length > 1000) {
        res.status(400).json({ error: 'Cannot request more than 1000 cells at once' });
        return;
      }

      const cells: CellData[] = [];
      const missing: string[] = [];

      for (const id of ids) {
        const cell = await this.cache.get(id);
        if (cell) {
          cells.push(cell);
        } else {
          missing.push(id);
        }
      }

      res.json({
        cells,
        missing,
        count: cells.length,
      });
    } catch (error) {
      console.error('[CellRouter] Error getting batch:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /cells?range=startRow,endRow,startCol,endCol
   * GET /cells?row=X&col=Y
   */
  private async getCellsInRange(req: Request, res: Response): Promise<void> {
    try {
      const { range, row, col } = req.query;

      // Single cell by position
      if (row && col) {
        const rowNum = parseInt(row as string, 10);
        const colNum = parseInt(col as string, 10);

        if (isNaN(rowNum) || isNaN(colNum)) {
          res.status(400).json({ error: 'Invalid row or col' });
          return;
        }

        const id = cellIdFromPosition(rowNum, colNum);
        const cell = await this.cache.get(id);

        if (!cell) {
          res.status(404).json({ error: 'Cell not found', id });
          return;
        }

        res.json(cell);
        return;
      }

      // Range query
      if (range) {
        const [startRow, endRow, startCol, endCol] = (range as string).split(',').map(Number);

        if (isNaN(startRow) || isNaN(endRow) || isNaN(startCol) || isNaN(endCol)) {
          res.status(400).json({ error: 'Invalid range format' });
          return;
        }

        const cells = await this.cache.getInRange(startRow, endRow, startCol, endCol);

        res.json({
          cells,
          count: cells.length,
          range: { startRow, endRow, startCol, endCol },
        });
        return;
      }

      res.status(400).json({ error: 'Must specify range or row+col' });
    } catch (error) {
      console.error('[CellRouter] Error getting cells in range:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /cells
   */
  private async createCell(req: Request, res: Response): Promise<void> {
    try {
      const body: CreateCellRequest = req.body;

      // Validate position
      if (!validatePosition(body.row, body.col)) {
        res.status(400).json({ error: 'Invalid cell position' });
        return;
      }

      // Generate cell ID
      const id = cellIdFromPosition(body.row, body.col);

      // Check if cell already exists
      const existing = await this.cache.get(id);
      if (existing) {
        res.status(409).json({ error: 'Cell already exists', id });
        return;
      }

      // Create cell data
      const cellData: CellData = {
        id,
        row: body.row,
        col: body.col,
        type: body.type,
        state: 'dormant',
        value: body.value ?? null,
        confidence: body.confidence ?? 0.5,
        version: 1,
        consciousness: [],
        metadata: body.metadata ?? {},
      };

      // Store in cache
      await this.cache.set(id, cellData);

      res.status(201).json(cellData);
    } catch (error) {
      console.error('[CellRouter] Error creating cell:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PATCH /cells/:id
   */
  private async updateCell(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const body: UpdateCellRequest = req.body;

      // Get existing cell
      const existing = await this.cache.get(id);
      if (!existing) {
        res.status(404).json({ error: 'Cell not found', id });
        return;
      }

      // Check version for optimistic locking
      if (body.version !== undefined && body.version !== existing.version) {
        res.status(409).json({
          error: 'Version conflict',
          currentVersion: existing.version,
          requestedVersion: body.version,
        });
        return;
      }

      // Update cell data
      const updated: CellData = {
        ...existing,
        ...(body.value !== undefined && { value: body.value }),
        ...(body.confidence !== undefined && { confidence: body.confidence }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.metadata !== undefined && { metadata: { ...existing.metadata, ...body.metadata } }),
        version: existing.version + 1,
      };

      // Store in cache
      await this.cache.set(id, updated);

      res.json(updated);
    } catch (error) {
      console.error('[CellRouter] Error updating cell:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * DELETE /cells/:id
   */
  private async deleteCell(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if cell exists
      const existing = await this.cache.get(id);
      if (!existing) {
        res.status(404).json({ error: 'Cell not found', id });
        return;
      }

      // Delete from cache
      await this.cache.delete(id);

      res.status(204).send();
    } catch (error) {
      console.error('[CellRouter] Error deleting cell:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PATCH /cells/batch
   */
  private async updateBatch(req: Request, res: Response): Promise<void> {
    try {
      const body: BatchUpdateRequest = req.body;

      if (!body.updates || !Array.isArray(body.updates)) {
        res.status(400).json({ error: 'updates must be an array' });
        return;
      }

      if (body.updates.length > 1000) {
        res.status(400).json({ error: 'Cannot update more than 1000 cells at once' });
        return;
      }

      const succeeded: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];

      for (const update of body.updates) {
        try {
          const existing = await this.cache.get(update.id);
          if (!existing) {
            failed.push({ id: update.id, error: 'Cell not found' });
            continue;
          }

          // Check version
          if (update.version !== undefined && update.version !== existing.version) {
            failed.push({
              id: update.id,
              error: 'Version conflict',
            });
            continue;
          }

          // Update cell
          const updated: CellData = {
            ...existing,
            ...(update.value !== undefined && { value: update.value }),
            ...(update.confidence !== undefined && { confidence: update.confidence }),
            ...(update.state !== undefined && { state: update.state }),
            version: existing.version + 1,
          };

          await this.cache.set(update.id, updated);
          succeeded.push(update.id);
        } catch (error) {
          failed.push({ id: update.id, error: 'Internal error' });
        }
      }

      const result: BatchResult = { succeeded, failed };
      res.json(result);
    } catch (error) {
      console.error('[CellRouter] Error updating batch:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /cells/:id/consciousness
   */
  private async getConsciousness(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const cell = await this.cache.get(id);
      if (!cell) {
        res.status(404).json({ error: 'Cell not found', id });
        return;
      }

      const consciousness = cell.consciousness.slice(-limit);

      res.json({
        id,
        consciousness,
        count: consciousness.length,
      });
    } catch (error) {
      console.error('[CellRouter] Error getting consciousness:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /cells/:id/neighbors
   */
  private async getNeighbors(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const radius = parseInt(req.query.radius as string) || 1;

      const cell = await this.cache.get(id);
      if (!cell) {
        res.status(404).json({ error: 'Cell not found', id });
        return;
      }

      // Get neighbors in range
      const neighbors = await this.cache.getInRange(
        cell.row - radius,
        cell.row + radius,
        cell.col - radius,
        cell.col + radius
      );

      // Filter out the cell itself
      const filtered = neighbors.filter(n => n.id !== id);

      res.json({
        id,
        neighbors: filtered,
        count: filtered.length,
        radius,
      });
    } catch (error) {
      console.error('[CellRouter] Error getting neighbors:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /cells/entangle
   */
  private async entangleCells(req: Request, res: Response): Promise<void> {
    try {
      const body: EntangleRequest = req.body;

      if (!body.cell1 || !body.cell2 || !body.mode) {
        res.status(400).json({ error: 'Missing required fields: cell1, cell2, mode' });
        return;
      }

      // Get both cells
      const cell1 = await this.cache.get(body.cell1);
      const cell2 = await this.cache.get(body.cell2);

      if (!cell1) {
        res.status(404).json({ error: 'Cell not found', id: body.cell1 });
        return;
      }

      if (!cell2) {
        res.status(404).json({ error: 'Cell not found', id: body.cell2 });
        return;
      }

      // Add entanglement metadata
      cell1.metadata.entangled = cell1.metadata.entangled || [];
      cell2.metadata.entangled = cell2.metadata.entangled || [];

      if (!cell1.metadata.entangled.includes(body.cell2)) {
        cell1.metadata.entangled.push(body.cell2);
      }
      if (!cell2.metadata.entangled.includes(body.cell1)) {
        cell2.metadata.entangled.push(body.cell1);
      }

      // Store entanglement mode
      cell1.metadata.entanglementMode = body.mode;
      cell2.metadata.entanglementMode = body.mode;

      await this.cache.set(body.cell1, cell1);
      await this.cache.set(body.cell2, cell2);

      res.json({
        cell1: body.cell1,
        cell2: body.cell2,
        mode: body.mode,
        entangled: true,
      });
    } catch (error) {
      console.error('[CellRouter] Error entangling cells:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * DELETE /cells/entangle
   */
  private async disentangleCells(req: Request, res: Response): Promise<void> {
    try {
      const { cell1, cell2 } = req.query;

      if (!cell1 || !cell2) {
        res.status(400).json({ error: 'Missing required query params: cell1, cell2' });
        return;
      }

      const c1 = await this.cache.get(cell1 as string);
      const c2 = await this.cache.get(cell2 as string);

      if (c1 && c1.metadata.entangled) {
        c1.metadata.entangled = c1.metadata.entangled.filter((id: string) => id !== cell2);
        delete c1.metadata.entanglementMode;
        await this.cache.set(cell1 as string, c1);
      }

      if (c2 && c2.metadata.entangled) {
        c2.metadata.entangled = c2.metadata.entangled.filter((id: string) => id !== cell1);
        delete c2.metadata.entanglementMode;
        await this.cache.set(cell2 as string, c2);
      }

      res.json({
        cell1,
        cell2,
        entangled: false,
      });
    } catch (error) {
      console.error('[CellRouter] Error disentangling cells:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /health
   */
  private async healthCheck(_req: Request, res: Response): Promise<void> {
    res.json({
      status: 'healthy',
      timestamp: Date.now(),
    });
  }

  /**
   * GET /stats
   */
  private async getStats(_req: Request, res: Response): Promise<void> {
    const stats = this.cache.getStats();
    res.json(stats);
  }
}

/**
 * Create router instance
 */
export function createCellRouter(): Router {
  const cellRouter = new CellRouter();
  return cellRouter.getRouter();
}

export default CellRouter;
