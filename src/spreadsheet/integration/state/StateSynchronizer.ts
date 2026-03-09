/**
 * POLLN Spreadsheet Integration - State Synchronizer
 *
 * Efficient state synchronization for living cell networks.
 * Implements optimistic updates, conflict resolution, and batch synchronization.
 */

import { EventEmitter } from 'events';
import { CellType, CellState, LogicLevel } from '../../core/types';

/**
 * Cell state snapshot
 */
export interface CellSnapshot {
  id: string;
  version: number;
  value: unknown;
  confidence: number;
  state: CellState;
  timestamp: number;
}

/**
 * Synchronization conflict
 */
export interface SyncConflict {
  cellId: string;
  localVersion: number;
  remoteVersion: number;
  localValue: unknown;
  remoteValue: unknown;
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  // Batch settings
  batchSize: number;
  batchDelay: number; // ms

  // Conflict resolution
  conflictResolution: 'local' | 'remote' | 'manual';

  // Optimization
  compressionEnabled: boolean;
  deltaCompressionEnabled: boolean;

  // Throttling
  updateThrottle: number; // ms
}

/**
 * State Synchronizer
 */
export class StateSynchronizer extends EventEmitter {
  private localState: Map<string, CellSnapshot> = new Map();
  private remoteState: Map<string, CellSnapshot> = new Map();
  private pendingUpdates: Map<string, Partial<CellSnapshot>> = new Map();
  private updateQueue: Array<{ cellId: string; update: Partial<CellSnapshot> }> = [];
  private config: Required<SyncConfig>;
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;

  constructor(config: Partial<SyncConfig> = {}) {
    super();
    this.config = {
      batchSize: 50,
      batchDelay: 100,
      conflictResolution: 'local',
      compressionEnabled: true,
      deltaCompressionEnabled: true,
      updateThrottle: 50,
      ...config,
    };
  }

  /**
   * Initialize local state from cells
   */
  initializeState(cells: Map<string, { type: CellType; state: CellState; logicLevel: LogicLevel; value: unknown }>): void {
    this.localState.clear();

    const now = Date.now();
    for (const [id, cell] of cells) {
      this.localState.set(id, {
        id,
        version: 0,
        value: cell.value,
        confidence: 0.5,
        state: cell.state,
        timestamp: now,
      });
    }

    this.emit('state-initialized', { cellCount: cells.size });
  }

  /**
   * Update local cell state (optimistic)
   */
  updateCell(cellId: string, updates: Partial<CellSnapshot>): void {
    const current = this.localState.get(cellId);
    if (!current) {
      return;
    }

    // Optimistic update
    const updated: CellSnapshot = {
      ...current,
      ...updates,
      version: current.version + 1,
      timestamp: Date.now(),
    };

    this.localState.set(cellId, updated);
    this.pendingUpdates.set(cellId, updates);

    // Queue for sync
    this.updateQueue.push({ cellId, update: updates });
    this.scheduleSync();

    this.emit('cell-updated', { cellId, updates, version: updated.version });
  }

  /**
   * Apply remote update
   */
  applyRemoteUpdate(cellId: string, update: CellSnapshot): SyncConflict | null {
    const local = this.localState.get(cellId);

    if (!local) {
      // New cell from server
      this.localState.set(cellId, update);
      this.remoteState.set(cellId, update);
      this.emit('remote-update', { cellId, update });
      return null;
    }

    // Check for conflict
    if (update.version <= local.version) {
      // Stale update, ignore
      return null;
    }

    // Version conflict
    if (local.version !== update.version && this.pendingUpdates.has(cellId)) {
      const conflict: SyncConflict = {
        cellId,
        localVersion: local.version,
        remoteVersion: update.version,
        localValue: local.value,
        remoteValue: update.value,
      };

      switch (this.config.conflictResolution) {
        case 'local':
          // Keep local, ignore remote
          return conflict;

        case 'remote':
          // Accept remote
          this.localState.set(cellId, update);
          this.remoteState.set(cellId, update);
          this.pendingUpdates.delete(cellId);
          this.emit('remote-update', { cellId, update });
          return conflict;

        case 'manual':
          this.emit('conflict', conflict);
          return conflict;
      }
    }

    // No conflict, apply update
    this.localState.set(cellId, update);
    this.remoteState.set(cellId, update);
    this.emit('remote-update', { cellId, update });

    return null;
  }

  /**
   * Get current cell state
   */
  getCellState(cellId: string): CellSnapshot | undefined {
    return this.localState.get(cellId);
  }

  /**
   * Get all cell states
   */
  getAllStates(): Map<string, CellSnapshot> {
    return new Map(this.localState);
  }

  /**
   * Get pending updates for sync
   */
  getPendingUpdates(): Array<{ cellId: string; update: Partial<CellSnapshot> }> {
    const updates = [...this.updateQueue];
    this.updateQueue = [];
    return updates;
  }

  /**
   * Check if sync is needed
   */
  needsSync(): boolean {
    return this.updateQueue.length > 0 ||
           this.pendingUpdates.size > 0 ||
           (Date.now() - this.lastSyncTime) > this.config.batchDelay;
  }

  /**
   * Schedule sync operation
   */
  private scheduleSync(): void {
    if (this.syncTimer) {
      return;
    }

    this.syncTimer = setTimeout(() => {
      this.performSync();
      this.syncTimer = null;
    }, this.config.batchDelay);
  }

  /**
   * Perform sync operation
   */
  private performSync(): void {
    if (this.updateQueue.length === 0) {
      return;
    }

    // Batch updates
    const batch = this.updateQueue.splice(0, this.config.batchSize);
    const updates: Record<string, Partial<CellSnapshot>> = {};

    for (const { cellId, update } of batch) {
      updates[cellId] = update;
    }

    this.lastSyncTime = Date.now();
    this.emit('sync-batch', { updates, count: Object.keys(updates).length });
  }

  /**
   * Reset local state (e.g., after reconnect)
   */
  resetState(): void {
    this.localState.clear();
    this.remoteState.clear();
    this.pendingUpdates.clear();
    this.updateQueue = [];
    this.emit('state-reset');
  }

  /**
   * Get sync statistics
   */
  getStats(): {
    localStateSize: number;
    remoteStateSize: number;
    pendingUpdates: number;
    queuedUpdates: number;
    lastSyncTime: number;
  } {
    return {
      localStateSize: this.localState.size,
      remoteStateSize: this.remoteState.size,
      pendingUpdates: this.pendingUpdates.size,
      queuedUpdates: this.updateQueue.length,
      lastSyncTime: this.lastSyncTime,
    };
  }
}

/**
 * Create singleton synchronizer instance
 */
let syncInstance: StateSynchronizer | null = null;

export function getStateSynchronizer(config?: Partial<SyncConfig>): StateSynchronizer {
  if (!syncInstance) {
    syncInstance = new StateSynchronizer(config);
  }
  return syncInstance;
}

export default StateSynchronizer;
