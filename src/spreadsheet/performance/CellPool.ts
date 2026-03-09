/**
 * POLLN Spreadsheet - CellPool
 *
 * Object pooling for spreadsheet cells to reduce GC pressure.
 * Reuses cell instances instead of creating/destroying them.
 */

import { LogCell } from '../core/LogCell.js';
import { CellType, CellState } from '../core/types.js';

export interface PoolConfig {
  initialSize: number;
  maxSize: number;
  growthFactor: number;
  shrinkThreshold: number;
}

export interface PooledCell {
  cell: LogCell;
  inUse: boolean;
  lastUsed: number;
  poolIndex: number;
}

/**
 * CellPool - Object pool for LogCell instances
 *
 * Benefits:
 * - Reduces garbage collection
 * - Improves allocation performance
 * - Maintains stable memory usage
 */
export class CellPool {
  private config: PoolConfig;
  private pools: Map<CellType, PooledCell[]>;
  private cellFactory: Map<CellType, () => LogCell>;
  private totalAllocated = 0;
  private totalReused = 0;
  private totalReleased = 0;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      initialSize: 100,
      maxSize: 10000,
      growthFactor: 2,
      shrinkThreshold: 0.25,
      ...config,
    };

    this.pools = new Map();
    this.cellFactory = new Map();

    this.initializePools();
  }

  /**
   * Initialize pools with default cells
   */
  private initializePools(): void {
    const cellTypes = Object.values(CellType);

    cellTypes.forEach((type) => {
      this.pools.set(type, []);
      this.preallocate(type, this.config.initialSize);
    });
  }

  /**
   * Register factory function for cell type
   */
  registerFactory(type: CellType, factory: () => LogCell): void {
    this.cellFactory.set(type, factory);
  }

  /**
   * Preallocate cells of specific type
   */
  private preallocate(type: CellType, count: number): void {
    const pool = this.pools.get(type);
    if (!pool) return;

    for (let i = 0; i < count; i++) {
      const cell = this.createCell(type);
      if (cell) {
        pool.push({
          cell,
          inUse: false,
          lastUsed: Date.now(),
          poolIndex: pool.length,
        });
        this.totalAllocated++;
      }
    }
  }

  /**
   * Create a new cell instance
   */
  private createCell(type: CellType): LogCell | null {
    const factory = this.cellFactory.get(type);
    if (!factory) {
      console.warn(`No factory registered for cell type: ${type}`);
      return null;
    }
    return factory();
  }

  /**
   * Acquire a cell from the pool
   */
  acquire(type: CellType): LogCell | null {
    const pool = this.pools.get(type);
    if (!pool) {
      console.warn(`No pool found for cell type: ${type}`);
      return null;
    }

    // Find available cell
    let pooledCell = pool.find((pc) => !pc.inUse);

    // If no available cell, grow pool
    if (!pooledCell) {
      const growthAmount = Math.floor(
        Math.min(pool.length * this.config.growthFactor, this.config.maxSize) - pool.length
      );

      if (growthAmount > 0) {
        this.preallocate(type, growthAmount);
        pooledCell = pool.find((pc) => !pc.inUse);
      }
    }

    if (pooledCell) {
      pooledCell.inUse = true;
      pooledCell.lastUsed = Date.now();
      this.totalReused++;

      // Reset cell state
      pooledCell.cell.reset();

      return pooledCell.cell;
    }

    // Pool exhausted, create temporary cell
    return this.createCell(type);
  }

  /**
   * Release a cell back to the pool
   */
  release(cell: LogCell): void {
    const type = cell.getType();
    const pool = this.pools.get(type);

    if (!pool) {
      console.warn(`No pool found for cell type: ${type}`);
      return;
    }

    const pooledCell = pool.find((pc) => pc.cell === cell);

    if (pooledCell) {
      pooledCell.inUse = false;
      pooledCell.lastUsed = Date.now();
      this.totalReleased++;
    }

    // Check if we should shrink pool
    this.maybeShrinkPool(type);
  }

  /**
   * Maybe shrink pool if too many unused cells
   */
  private maybeShrinkPool(type: CellType): void {
    const pool = this.pools.get(type);
    if (!pool) return;

    const unusedCount = pool.filter((pc) => !pc.inUse).length;
    const utilization = 1 - unusedCount / pool.length;

    // If utilization is low and pool is large, shrink
    if (
      utilization < this.config.shrinkThreshold &&
      pool.length > this.config.initialSize
    ) {
      const targetSize = Math.max(
        this.config.initialSize,
        Math.floor(pool.length * 0.5)
      );

      // Remove oldest unused cells
      const unusedCells = pool.filter((pc) => !pc.inUse);
      unusedCells.sort((a, b) => a.lastUsed - b.lastUsed);

      const toRemove = unusedCells.slice(0, pool.length - targetSize);
      toRemove.forEach((pc) => {
        const index = pool.indexOf(pc);
        if (index > -1) {
          pool.splice(index, 1);
        }
      });
    }
  }

  /**
   * Get pool statistics
   */
  getStats(type?: CellType) {
    if (type) {
      const pool = this.pools.get(type);
      if (!pool) return null;

      const inUse = pool.filter((pc) => pc.inUse).length;
      const available = pool.length - inUse;

      return {
        type,
        total: pool.length,
        inUse,
        available,
        utilization: inUse / pool.length,
      };
    }

    // Stats for all pools
    const allStats = {
      totalAllocated: this.totalAllocated,
      totalReused: this.totalReused,
      totalReleased: this.totalReleased,
      reuseRate: this.totalAllocated > 0 ? this.totalReused / this.totalAllocated : 0,
      pools: {} as Record<string, any>,
    };

    this.pools.forEach((pool, type) => {
      const inUse = pool.filter((pc) => pc.inUse).length;
      allStats.pools[type] = {
        total: pool.length,
        inUse,
        available: pool.length - inUse,
        utilization: inUse / pool.length,
      };
    });

    return allStats;
  }

  /**
   * Clear all pools
   */
  clear(): void {
    this.pools.forEach((pool) => {
      pool.forEach((pc) => {
        pc.cell.destroy();
      });
      pool.length = 0;
    });

    this.totalAllocated = 0;
    this.totalReused = 0;
    this.totalReleased = 0;
  }

  /**
   * Clear specific pool
   */
  clearPool(type: CellType): void {
    const pool = this.pools.get(type);
    if (!pool) return;

    pool.forEach((pc) => {
      pc.cell.destroy();
    });
    pool.length = 0;
  }

  /**
   * Preload cells into pool
   */
  preload(type: CellType, count: number): void {
    this.preallocate(type, count);
  }

  /**
   * Get pool size
   */
  getPoolSize(type: CellType): number {
    const pool = this.pools.get(type);
    return pool ? pool.length : 0;
  }

  /**
   * Get available cells in pool
   */
  getAvailableCount(type: CellType): number {
    const pool = this.pools.get(type);
    if (!pool) return 0;

    return pool.filter((pc) => !pc.inUse).length;
  }

  /**
   * Get in-use cells in pool
   */
  getInUseCount(type: CellType): number {
    const pool = this.pools.get(type);
    if (!pool) return 0;

    return pool.filter((pc) => pc.inUse).length;
  }

  /**
   * Force garbage collection of unused cells
   */
  gc(): void {
    this.pools.forEach((pool, type) => {
      this.maybeShrinkPool(type);
    });
  }
}

/**
 * Specialized pool for cells with heavy initialization
 */
export class HeavyCellPool extends CellPool {
  private warmupPromises: Map<CellType, Promise<void>>;

  constructor(config?: Partial<PoolConfig>) {
    super(config);
    this.warmupPromises = new Map();
  }

  /**
   * Warm up pool by pre-initializing cells
   */
  async warmup(type: CellType, count: number): Promise<void> {
    const existingPromise = this.warmupPromises.get(type);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = (async () => {
      for (let i = 0; i < count; i++) {
        const cell = this.acquire(type);
        if (cell) {
          // Simulate warmup work
          await new Promise((resolve) => setTimeout(resolve, 0));
          this.release(cell);
        }
      }
    })();

    this.warmupPromises.set(type, promise);
    await promise;
    this.warmupPromises.delete(type);
  }

  /**
   * Warm up all pools
   */
  async warmupAll(count: number): Promise<void> {
    const promises = Array.from(this.pools.keys()).map((type) =>
      this.warmup(type, count)
    );

    await Promise.all(promises);
  }
}
