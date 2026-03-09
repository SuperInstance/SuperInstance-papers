/**
 * VersionControl - Snapshot and version management
 *
 * Provides:
 * - Snapshot system (Yjs snapshots)
 * - Branch creation
 * - Diff visualization
 * - Rollback capability
 * - Change log with user attribution
 */

import * as Y from 'yjs';
import { YjsDocument } from './YjsDocument';

export interface Snapshot {
  id: string;
  documentId: string;
  timestamp: number;
  createdById: string;
  createdByName: string;
  description: string;
  data: Uint8Array;
  tags: string[];
}

export interface Branch {
  id: string;
  name: string;
  parentId: string | null;
  createdById: string;
  createdByName: string;
  createdAt: number;
  snapshotId: string;
  description: string;
}

export interface ChangeLog {
  id: string;
  documentId: string;
  timestamp: number;
  userId: string;
  userName: string;
  type: 'create' | 'update' | 'delete' | 'merge' | 'branch';
  cellId?: string;
  description: string;
  metadata?: any;
}

export interface DiffResult {
  cellId: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
  oldFormula?: string;
  newFormula?: string;
}

export class VersionControl {
  private doc: YjsDocument;
  private snapshots: Map<string, Snapshot> = new Map();
  private branches: Map<string, Branch> = new Map();
  private changeLog: ChangeLog[] = [];
  private currentBranch: string = 'main';
  private autoSnapshotInterval?: NodeJS.Timeout;

  constructor(doc: YjsDocument) {
    this.doc = doc;

    // Subscribe to document changes for auto-logging
    this.setupChangeLogging();
  }

  /**
   * Set up change logging
   */
  private setupChangeLogging(): void {
    this.doc.subscribeToDocument((events, transaction) => {
      events.forEach((event: Y.YEvent<any>) => {
        // Log changes
        const log: ChangeLog = {
          id: this.generateId(),
          documentId: 'current', // TODO: Get actual document ID
          timestamp: Date.now(),
          userId: transaction.origin as string || 'unknown',
          userName: 'Unknown User', // TODO: Get actual user name
          type: 'update',
          description: `Document updated: ${event.path.join('.')}`,
          metadata: {
            event: event.event,
            path: event.path,
          },
        };

        this.changeLog.push(log);
      });
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a snapshot
   */
  createSnapshot(
    userId: string,
    userName: string,
    description: string,
    tags: string[] = []
  ): Snapshot {
    const snapshot: Snapshot = {
      id: this.generateId(),
      documentId: 'current', // TODO: Get actual document ID
      timestamp: Date.now(),
      createdById: userId,
      createdByName: userName,
      description,
      data: this.doc.createSnapshot(),
      tags,
    };

    this.snapshots.set(snapshot.id, snapshot);

    // Log snapshot creation
    this.changeLog.push({
      id: this.generateId(),
      documentId: snapshot.documentId,
      timestamp: snapshot.timestamp,
      userId,
      userName,
      type: 'create',
      description: `Snapshot created: ${description}`,
      metadata: { snapshotId: snapshot.id, tags },
    });

    return snapshot;
  }

  /**
   * Restore a snapshot
   */
  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    this.doc.applySnapshot(snapshot.data);
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(snapshotId: string): void {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    this.snapshots.delete(snapshotId);
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(snapshotId: string): Snapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): Snapshot[] {
    return Array.from(this.snapshots.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }

  /**
   * Get snapshots by tag
   */
  getSnapshotsByTag(tag: string): Snapshot[] {
    return this.getAllSnapshots().filter(s => s.tags.includes(tag));
  }

  /**
   * Get snapshots by user
   */
  getSnapshotsByUser(userId: string): Snapshot[] {
    return this.getAllSnapshots().filter(s => s.createdById === userId);
  }

  /**
   * Get snapshots in date range
   */
  getSnapshotsInDateRange(startDate: Date, endDate: Date): Snapshot[] {
    const start = startDate.getTime();
    const end = endDate.getTime();

    return this.getAllSnapshots().filter(
      s => s.timestamp >= start && s.timestamp <= end
    );
  }

  /**
   * Create a branch
   */
  createBranch(
    name: string,
    userId: string,
    userName: string,
    description: string,
    snapshotId?: string
  ): Branch {
    // Create a snapshot if not provided
    let snapshot = snapshotId ? this.snapshots.get(snapshotId) : undefined;
    if (!snapshot) {
      snapshot = this.createSnapshot(
        userId,
        userName,
        `Snapshot for branch: ${name}`,
        ['branch']
      );
    }

    const branch: Branch = {
      id: this.generateId(),
      name,
      parentId: this.currentBranch,
      createdById: userId,
      createdByName: userName,
      createdAt: Date.now(),
      snapshotId: snapshot.id,
      description,
    };

    this.branches.set(branch.id, branch);

    // Log branch creation
    this.changeLog.push({
      id: this.generateId(),
      documentId: 'current',
      timestamp: branch.createdAt,
      userId,
      userName,
      type: 'branch',
      description: `Branch created: ${name}`,
      metadata: { branchId: branch.id, snapshotId: snapshot.id },
    });

    return branch;
  }

  /**
   * Switch to a branch
   */
  async switchBranch(branchId: string): Promise<void> {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    // Restore the branch's snapshot
    await this.restoreSnapshot(branch.snapshotId);

    this.currentBranch = branchId;
  }

  /**
   * Delete a branch
   */
  deleteBranch(branchId: string): void {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    if (branchId === this.currentBranch) {
      throw new Error('Cannot delete current branch');
    }

    // Check if any branches have this as parent
    const childBranches = Array.from(this.branches.values()).filter(
      b => b.parentId === branchId
    );

    if (childBranches.length > 0) {
      throw new Error('Cannot delete branch with child branches');
    }

    this.branches.delete(branchId);
  }

  /**
   * Get all branches
   */
  getAllBranches(): Branch[] {
    return Array.from(this.branches.values());
  }

  /**
   * Get current branch
   */
  getCurrentBranch(): Branch | undefined {
    return this.branches.get(this.currentBranch);
  }

  /**
   * Merge branches
   */
  async mergeBranches(
    sourceBranchId: string,
    targetBranchId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    const sourceBranch = this.branches.get(sourceBranchId);
    const targetBranch = this.branches.get(targetBranchId);

    if (!sourceBranch || !targetBranch) {
      throw new Error('Source or target branch not found');
    }

    // Create a snapshot before merge
    this.createSnapshot(
      userId,
      userName,
      `Pre-merge snapshot: ${targetBranch.name} <- ${sourceBranch.name}`,
      ['merge', 'pre-merge']
    );

    // Restore target branch
    await this.switchBranch(targetBranchId);

    // Get source snapshot
    const sourceSnapshot = this.snapshots.get(sourceBranch.snapshotId);
    if (!sourceSnapshot) {
      throw new Error('Source snapshot not found');
    }

    // Apply source snapshot (this is a simple merge)
    // In practice, you'd want more sophisticated merge logic
    this.doc.applySnapshot(sourceSnapshot.data);

    // Create post-merge snapshot
    this.createSnapshot(
      userId,
      userName,
      `Merged: ${targetBranch.name} <- ${sourceBranch.name}`,
      ['merge', 'post-merge']
    );

    // Log merge
    this.changeLog.push({
      id: this.generateId(),
      documentId: 'current',
      timestamp: Date.now(),
      userId,
      userName,
      type: 'merge',
      description: `Merged ${sourceBranch.name} into ${targetBranch.name}`,
      metadata: {
        sourceBranchId,
        targetBranchId,
      },
    });
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(snapshotId1: string, snapshotId2: string): DiffResult[] {
    const snapshot1 = this.snapshots.get(snapshotId1);
    const snapshot2 = this.snapshots.get(snapshotId2);

    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }

    // Create temporary documents to compare
    const tempDoc1 = new YjsDocument('temp1');
    const tempDoc2 = new YjsDocument('temp2');

    tempDoc1.applySnapshot(snapshot1.data);
    tempDoc2.applySnapshot(snapshot2.data);

    // Compare cells
    const diffs: DiffResult[] = [];
    const cells1 = tempDoc1.getAllCells();
    const cells2 = tempDoc2.getAllCells();

    // Check for additions and modifications
    cells2.forEach((cell2, cellId) => {
      const cell1 = cells1.get(cellId);

      if (!cell1) {
        // Cell was added
        diffs.push({
          cellId,
          type: 'added',
          newValue: cell2.get('value'),
          newFormula: cell2.get('formula'),
        });
      } else {
        // Check if cell was modified
        const value1 = cell1.get('value');
        const value2 = cell2.get('value');
        const formula1 = cell1.get('formula');
        const formula2 = cell2.get('formula');

        if (value1 !== value2 || formula1 !== formula2) {
          diffs.push({
            cellId,
            type: 'modified',
            oldValue: value1,
            newValue: value2,
            oldFormula: formula1,
            newFormula: formula2,
          });
        }
      }
    });

    // Check for deletions
    cells1.forEach((cell1, cellId) => {
      if (!cells2.has(cellId)) {
        diffs.push({
          cellId,
          type: 'removed',
          oldValue: cell1.get('value'),
          oldFormula: cell1.get('formula'),
        });
      }
    });

    return diffs;
  }

  /**
   * Get change log
   */
  getChangeLog(filters?: {
    userId?: string;
    type?: ChangeLog['type'];
    startDate?: Date;
    endDate?: Date;
  }): ChangeLog[] {
    let log = this.changeLog;

    if (filters?.userId) {
      log = log.filter(l => l.userId === filters.userId);
    }

    if (filters?.type) {
      log = log.filter(l => l.type === filters.type);
    }

    if (filters?.startDate) {
      log = log.filter(l => l.timestamp >= filters.startDate!.getTime());
    }

    if (filters?.endDate) {
      log = log.filter(l => l.timestamp <= filters.endDate!.getTime());
    }

    return log.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get recent changes
   */
  getRecentChanges(limit: number = 50): ChangeLog[] {
    return this.changeLog
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Enable auto-snapshot
   */
  enableAutoSnapshot(intervalMs: number): void {
    this.disableAutoSnapshot();

    this.autoSnapshotInterval = setInterval(() => {
      this.createSnapshot(
        'system',
        'System',
        'Auto-snapshot',
        ['auto']
      );
    }, intervalMs);
  }

  /**
   * Disable auto-snapshot
   */
  disableAutoSnapshot(): void {
    if (this.autoSnapshotInterval) {
      clearInterval(this.autoSnapshotInterval);
      this.autoSnapshotInterval = undefined;
    }
  }

  /**
   * Rollback to a specific time
   */
  async rollbackToTime(timestamp: number): Promise<void> {
    // Find the closest snapshot before the timestamp
    const snapshots = this.getAllSnapshots();
    const targetSnapshot = snapshots.find(s => s.timestamp <= timestamp);

    if (!targetSnapshot) {
      throw new Error('No snapshot found before the specified time');
    }

    await this.restoreSnapshot(targetSnapshot.id);
  }

  /**
   * Get version history timeline
   */
  getVersionTimeline(): Array<{
    timestamp: number;
    type: 'snapshot' | 'branch' | 'merge' | 'change';
    description: string;
    userId: string;
    userName: string;
  }> {
    const timeline: Array<{
      timestamp: number;
      type: 'snapshot' | 'branch' | 'merge' | 'change';
      description: string;
      userId: string;
      userName: string;
    }> = [];

    // Add snapshots
    this.snapshots.forEach(snapshot => {
      timeline.push({
        timestamp: snapshot.timestamp,
        type: 'snapshot',
        description: `Snapshot: ${snapshot.description}`,
        userId: snapshot.createdById,
        userName: snapshot.createdByName,
      });
    });

    // Add branches
    this.branches.forEach(branch => {
      timeline.push({
        timestamp: branch.createdAt,
        type: 'branch',
        description: `Branch: ${branch.name}`,
        userId: branch.createdById,
        userName: branch.createdByName,
      });
    });

    // Add merges
    this.changeLog
      .filter(log => log.type === 'merge')
      .forEach(log => {
        timeline.push({
          timestamp: log.timestamp,
          type: 'merge',
          description: log.description,
          userId: log.userId,
          userName: log.userName,
        });
      });

    // Sort by timestamp
    return timeline.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Export snapshots
   */
  exportSnapshots(): string {
    const data = {
      snapshots: Array.from(this.snapshots.values()),
      branches: Array.from(this.branches.values()),
      changeLog: this.changeLog,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import snapshots
   */
  importSnapshots(data: string): void {
    const parsed = JSON.parse(data);

    if (parsed.snapshots) {
      parsed.snapshots.forEach((snapshot: Snapshot) => {
        this.snapshots.set(snapshot.id, snapshot);
      });
    }

    if (parsed.branches) {
      parsed.branches.forEach((branch: Branch) => {
        this.branches.set(branch.id, branch);
      });
    }

    if (parsed.changeLog) {
      this.changeLog.push(...parsed.changeLog);
    }
  }

  /**
   * Clean up old snapshots
   */
  cleanupOldSnapshots(keepCount: number = 10): void {
    const snapshots = this.getAllSnapshots();

    if (snapshots.length <= keepCount) {
      return;
    }

    // Keep the most recent snapshots
    const toDelete = snapshots.slice(keepCount);

    toDelete.forEach(snapshot => {
      // Don't delete if it's referenced by a branch
      const isReferenced = Array.from(this.branches.values()).some(
        branch => branch.snapshotId === snapshot.id
      );

      if (!isReferenced) {
        this.snapshots.delete(snapshot.id);
      }
    });
  }

  /**
   * Destroy version control
   */
  destroy(): void {
    this.disableAutoSnapshot();
    this.snapshots.clear();
    this.branches.clear();
    this.changeLog = [];
  }
}
