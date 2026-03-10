/**
 * POLLN Snapshot Manager
 * Manage aggregate snapshots for event replay optimization
 */

import { randomUUID } from 'crypto';
import type { Snapshot, ISnapshotManager, SnapshotInfo } from './types.js';

/**
 * Snapshot store entry
 */
interface SnapshotEntry {
  snapshot: Snapshot;
  size: number;
}

/**
 * Snapshot Manager Configuration
 */
export interface SnapshotManagerConfig {
  enabled: boolean;
  interval: number; // events per snapshot
  compression: boolean;
  retention: number; // number of snapshots to keep per aggregate
}

/**
 * In-Memory Snapshot Manager
 */
export class SnapshotManager implements ISnapshotManager {
  private snapshots: Map<string, SnapshotEntry[]> = new Map();
  private config: Required<SnapshotManagerConfig>;

  constructor(config: Partial<SnapshotManagerConfig> = {}) {
    this.config = {
      enabled: true,
      interval: config.interval || 100,
      compression: config.compression || false,
      retention: config.retention || 10
    };
  }

  /**
   * Save snapshot
   */
  async save(snapshot: Snapshot): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const snapshots = this.snapshots.get(snapshot.aggregateId) || [];
    const size = this.calculateSize(snapshot);

    snapshots.push({
      snapshot,
      size
    });

    // Enforce retention limit
    if (snapshots.length > this.config.retention) {
      snapshots.shift();
    }

    this.snapshots.set(snapshot.aggregateId, snapshots);
  }

  /**
   * Get latest snapshot
   */
  async get(aggregateId: string, maxVersion?: number): Promise<Snapshot | null> {
    const snapshots = this.snapshots.get(aggregateId);

    if (!snapshots || snapshots.length === 0) {
      return null;
    }

    // Find the latest snapshot at or below maxVersion
    let snapshot: Snapshot | null = null;

    if (maxVersion) {
      for (const entry of snapshots) {
        if (entry.snapshot.version <= maxVersion) {
          snapshot = entry.snapshot;
        }
      }
    } else {
      snapshot = snapshots[snapshots.length - 1].snapshot;
    }

    return snapshot;
  }

  /**
   * Delete all snapshots for aggregate
   */
  async delete(aggregateId: string): Promise<void> {
    this.snapshots.delete(aggregateId);
  }

  /**
   * Check if snapshot should be created
   */
  shouldSnapshot(aggregateId: string, version: number, lastSnapshotVersion?: number): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (!lastSnapshotVersion) {
      return version >= this.config.interval;
    }

    return (version - lastSnapshotVersion) >= this.config.interval;
  }

  /**
   * Get snapshot info
   */
  async getInfo(aggregateId: string): Promise<SnapshotInfo[]> {
    const snapshots = this.snapshots.get(aggregateId) || [];

    return snapshots.map(entry => ({
      aggregateId: entry.snapshot.aggregateId,
      aggregateType: entry.snapshot.aggregateType,
      version: entry.snapshot.version,
      timestamp: entry.snapshot.timestamp,
      size: entry.size
    }));
  }

  /**
   * Get all snapshot infos
   */
  async getAllInfo(): Promise<Map<string, SnapshotInfo[]>> {
    const result = new Map<string, SnapshotInfo[]>();

    for (const [aggregateId, entries] of this.snapshots.entries()) {
      result.set(aggregateId, entries.map(entry => ({
        aggregateId: entry.snapshot.aggregateId,
        aggregateType: entry.snapshot.aggregateType,
        version: entry.snapshot.version,
        timestamp: entry.snapshot.timestamp,
        size: entry.size
      })));
    }

    return result;
  }

  /**
   * Calculate snapshot size
   */
  private calculateSize(snapshot: Snapshot): number {
    return JSON.stringify(snapshot.state).length;
  }

  /**
   * Create snapshot from aggregate
   */
  createSnapshot(
    aggregateId: string,
    aggregateType: string,
    version: number,
    state: Record<string, unknown>
  ): Snapshot {
    return {
      aggregateId,
      aggregateType,
      version,
      state,
      timestamp: new Date()
    };
  }

  /**
   * Restore aggregate from snapshot
   */
  restoreFromSnapshot<T extends AggregateRoot>(
    aggregateClass: new (id: string) => T,
    snapshot: Snapshot
  ): T {
    const aggregate = new aggregateClass(snapshot.aggregateId);

    // Restore state from snapshot
    if ('restoreState' in aggregate) {
      (aggregate as any).restoreState(snapshot.state);
    }

    // Set version
    (aggregate as any).version = snapshot.version;

    return aggregate;
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalSnapshots = 0;
    let totalSize = 0;

    for (const entries of this.snapshots.values()) {
      totalSnapshots += entries.length;
      totalSize += entries.reduce((sum, entry) => sum + entry.size, 0);
    }

    return {
      totalSnapshots,
      totalSize,
      aggregateCount: this.snapshots.size,
      avgSize: totalSnapshots > 0 ? totalSize / totalSnapshots : 0,
      enabled: this.config.enabled,
      interval: this.config.interval,
      retention: this.config.retention
    };
  }
}

/**
 * Snapshot Builder
 * Helper for creating snapshots
 */
export class SnapshotBuilder {
  static create(
    aggregateId: string,
    aggregateType: string,
    version: number,
    state: Record<string, unknown>
  ): Snapshot {
    return {
      aggregateId,
      aggregateType,
      version,
      state,
      timestamp: new Date()
    };
  }

  static fromAggregate(aggregate: any): Snapshot {
    return {
      aggregateId: aggregate.id,
      aggregateType: aggregate.type,
      version: aggregate.version,
      state: aggregate.getState ? aggregate.getState() : {},
      timestamp: new Date()
    };
  }
}

/**
 * Aggregate root base class with snapshot support
 */
export abstract class SnapshotableAggregate {
  abstract id: string;
  abstract type: string;
  abstract version: number;
  abstract getState(): Record<string, unknown>;
  abstract restoreState(state: Record<string, unknown>): void;
}
