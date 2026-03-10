/**
 * Branch Manager for Spreadsheet Version Control
 *
 * Manages Git-like branching with support for parallel development,
 * branch switching, and merging with conflict resolution.
 */

import {
  Branch,
  Version,
  MergeStrategy,
  MergeResult,
  MergeConflict,
  ConflictType,
  ConflictResolution,
  MergeStats
} from './types';
import { SnapshotManager } from './SnapshotManager';
import { MergeResolver } from './MergeResolver';

/**
 * Manages branch lifecycle and operations
 */
export class BranchManager {
  private branches: Map<string, Branch>;
  private snapshotManager: SnapshotManager;
  private mergeResolver: MergeResolver;
  private defaultBranchName: string;

  constructor(
    snapshotManager: SnapshotManager,
    defaultBranchName: string = 'main'
  ) {
    this.branches = new Map();
    this.snapshotManager = snapshotManager;
    this.mergeResolver = new MergeResolver();
    this.defaultBranchName = defaultBranchName;

    // Create default branch if it doesn't exist
    if (!this.branches.has(defaultBranchName)) {
      this.createBranch(defaultBranchName, null);
      const mainBranch = this.branches.get(defaultBranchName)!;
      mainBranch.isDefault = true;
      mainBranch.isActive = true;
    }
  }

  /**
   * Create a new branch
   */
  createBranch(name: string, parentVersion: string | null): Branch {
    if (this.branches.has(name)) {
      throw new Error(`Branch '${name}' already exists`);
    }

    const branch: Branch = {
      name,
      head: parentVersion || this.generateVersionId(),
      isActive: false,
      isDefault: name === this.defaultBranchName
    };

    this.branches.set(name, branch);
    return branch;
  }

  /**
   * Switch to a different branch
   */
  switchBranch(name: string): void {
    const branch = this.branches.get(name);
    if (!branch) {
      throw new Error(`Branch '${name}' does not exist`);
    }

    // Deactivate all branches
    for (const [branchName, b] of this.branches) {
      b.isActive = false;
    }

    // Activate target branch
    branch.isActive = true;
  }

  /**
   * Get currently active branch
   */
  getActiveBranch(): Branch | undefined {
    for (const branch of this.branches.values()) {
      if (branch.isActive) {
        return branch;
      }
    }
    return undefined;
  }

  /**
   * List all branches
   */
  listBranches(): Branch[] {
    return Array.from(this.branches.values());
  }

  /**
   * Get branch by name
   */
  getBranch(name: string): Branch | undefined {
    return this.branches.get(name);
  }

  /**
   * Delete a branch
   */
  deleteBranch(name: string): void {
    const branch = this.branches.get(name);
    if (!branch) {
      throw new Error(`Branch '${name}' does not exist`);
    }

    if (branch.isDefault) {
      throw new Error('Cannot delete default branch');
    }

    if (branch.isActive) {
      throw new Error('Cannot delete active branch');
    }

    this.branches.delete(name);
  }

  /**
   * Rename a branch
   */
  renameBranch(oldName: string, newName: string): void {
    const branch = this.branches.get(oldName);
    if (!branch) {
      throw new Error(`Branch '${oldName}' does not exist`);
    }

    if (this.branches.has(newName)) {
      throw new Error(`Branch '${newName}' already exists`);
    }

    this.branches.delete(oldName);
    branch.name = newName;
    this.branches.set(newName, branch);
  }

  /**
   * Update branch head
   */
  updateBranchHead(branchName: string, versionId: string): void {
    const branch = this.branches.get(branchName);
    if (!branch) {
      throw new Error(`Branch '${branchName}' does not exist`);
    }

    branch.head = versionId;
  }

  /**
   * Merge source branch into target branch
   */
  async mergeBranch(
    source: string,
    target: string,
    strategy: MergeStrategy = MergeStrategy.AUTO
  ): Promise<MergeResult> {
    const sourceBranch = this.branches.get(source);
    const targetBranch = this.branches.get(target);

    if (!sourceBranch) {
      throw new Error(`Source branch '${source}' does not exist`);
    }

    if (!targetBranch) {
      throw new Error(`Target branch '${target}' does not exist`);
    }

    // Get snapshots
    const sourceSnapshot = this.snapshotManager.getSnapshotByVersion(sourceBranch.head);
    const targetSnapshot = this.snapshotManager.getSnapshotByVersion(targetBranch.head);

    if (!sourceSnapshot) {
      throw new Error(`Source snapshot not found for version ${sourceBranch.head}`);
    }

    if (!targetSnapshot) {
      throw new Error(`Target snapshot not found for version ${targetBranch.head}`);
    }

    // Find common ancestor
    const ancestorSnapshot = await this.findCommonAncestor(sourceBranch.head, targetBranch.head);

    // Perform merge based on strategy
    let result: MergeResult;

    switch (strategy) {
      case MergeStrategy.OURS:
        result = this.createMergeResult(true, targetBranch.head, [], {
          merged: 0,
          conflicts: 0,
          added: 0,
          deleted: 0,
          modified: 0
        });
        break;

      case MergeStrategy.THEIRS:
        result = this.createMergeResult(true, sourceBranch.head, [], {
          merged: sourceSnapshot.cells.size,
          conflicts: 0,
          added: 0,
          deleted: 0,
          modified: sourceSnapshot.cells.size
        });
        break;

      case MergeStrategy.UNION:
        result = await this.mergeUnion(sourceSnapshot, targetSnapshot);
        break;

      case MergeStrategy.AUTO:
      default:
        result = await this.mergeResolver.merge(
          sourceSnapshot,
          targetSnapshot,
          ancestorSnapshot,
          strategy
        );
        break;
    }

    // Update target branch head if merge was successful
    if (result.success && result.versionId) {
      targetBranch.head = result.versionId;
    }

    return result;
  }

  /**
   * Find common ancestor of two versions
   */
  private async findCommonAncestor(
    version1: string,
    version2: string
  ): Promise<Snapshot | null> {
    // Simple implementation: find most recent common snapshot
    // In a real implementation, this would traverse the version graph
    const snapshot1 = this.snapshotManager.getSnapshotByVersion(version1);
    const snapshot2 = this.snapshotManager.getSnapshotByVersion(version2);

    if (!snapshot1 || !snapshot2) {
      return null;
    }

    // For now, return the older snapshot as the ancestor
    return snapshot1.timestamp < snapshot2.timestamp ? snapshot1 : snapshot2;
  }

  /**
   * Merge union strategy (combine both snapshots)
   */
  private async mergeUnion(
    sourceSnapshot: Snapshot,
    targetSnapshot: Snapshot
  ): Promise<MergeResult> {
    const mergedSnapshot = this.snapshotManager.mergeSnapshots(
      targetSnapshot,
      sourceSnapshot,
      this.generateVersionId()
    );

    return this.createMergeResult(true, mergedSnapshot.versionId, [], {
      merged: mergedSnapshot.cells.size,
      conflicts: 0,
      added: sourceSnapshot.cells.size,
      deleted: 0,
      modified: targetSnapshot.cells.size
    });
  }

  /**
   * Resolve merge conflicts with manual resolutions
   */
  async resolveConflicts(
    source: string,
    target: string,
    resolutions: ConflictResolution[]
  ): Promise<MergeResult> {
    const sourceBranch = this.branches.get(source);
    const targetBranch = this.branches.get(target);

    if (!sourceBranch || !targetBranch) {
      throw new Error('Branch not found');
    }

    const sourceSnapshot = this.snapshotManager.getSnapshotByVersion(sourceBranch.head);
    const targetSnapshot = this.snapshotManager.getSnapshotByVersion(targetBranch.head);

    if (!sourceSnapshot || !targetSnapshot) {
      throw new Error('Snapshot not found');
    }

    // Apply resolutions
    return await this.mergeResolver.resolveWithConflicts(
      sourceSnapshot,
      targetSnapshot,
      resolutions
    );
  }

  /**
   * Get merge preview without actually merging
   */
  async previewMerge(
    source: string,
    target: string
  ): Promise<MergePreview> {
    const sourceBranch = this.branches.get(source);
    const targetBranch = this.branches.get(target);

    if (!sourceBranch || !targetBranch) {
      throw new Error('Branch not found');
    }

    const sourceSnapshot = this.snapshotManager.getSnapshotByVersion(sourceBranch.head);
    const targetSnapshot = this.snapshotManager.getSnapshotByVersion(targetBranch.head);

    if (!sourceSnapshot || !targetSnapshot) {
      throw new Error('Snapshot not found');
    }

    return await this.mergeResolver.previewMerge(sourceSnapshot, targetSnapshot);
  }

  /**
   * Check if branch can be fast-forwarded
   */
  canFastForward(source: string, target: string): boolean {
    const sourceBranch = this.branches.get(source);
    const targetBranch = this.branches.get(target);

    if (!sourceBranch || !targetBranch) {
      return false;
    }

    // For this simple implementation, always allow fast-forward between valid branches
    // In a real Git implementation, this would check if target is an ancestor of source
    return true;
  }

  /**
   * Fast forward branch to source
   */
  fastForward(source: string, target: string): void {
    const sourceBranch = this.branches.get(source);
    const targetBranch = this.branches.get(target);

    if (!sourceBranch || !targetBranch) {
      throw new Error('Branch not found');
    }

    if (!this.canFastForward(source, target)) {
      throw new Error('Cannot fast forward: branches have diverged');
    }

    targetBranch.head = sourceBranch.head;
  }

  /**
   * Rebase current branch onto target
   */
  async rebase(currentBranch: string, ontoBranch: string): Promise<boolean> {
    const current = this.branches.get(currentBranch);
    const onto = this.branches.get(ontoBranch);

    if (!current || !onto) {
      throw new Error('Branch not found');
    }

    // Rebase is complex - for now, we'll do a simple merge
    const result = await this.mergeBranch(currentBranch, ontoBranch, MergeStrategy.AUTO);
    return result.success;
  }

  /**
   * Create merge result object
   */
  private createMergeResult(
    success: boolean,
    versionId: string,
    conflicts: MergeConflict[],
    stats: MergeStats
  ): MergeResult {
    return {
      success,
      versionId,
      conflicts,
      stats
    };
  }

  /**
   * Generate unique version ID
   */
  private generateVersionId(): string {
    return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Type alias for Snapshot
 */
type Snapshot = import('./types').SheetSnapshot;

/**
 * Merge preview information
 */
export interface MergePreview {
  /** Number of changes that can be auto-merged */
  autoMergable: number;
  /** Number of conflicts detected */
  conflicts: number;
  /** List of conflicted cells */
  conflictedCells: string[];
  /** Whether merge can be fast-forwarded */
  canFastForward: boolean;
  /** Estimated merge complexity */
  complexity: 'simple' | 'moderate' | 'complex';
}
