/**
 * Version Store for Spreadsheet Version Control
 *
 * Main entry point for version control operations.
 * Provides Git-like functionality for spreadsheet data.
 */

import {
  Version,
  SheetSnapshot,
  Branch,
  MergeStrategy,
  MergeResult,
  CellDiff,
  VersionEntry,
  VersionExport,
  ImportResult,
  HistoryFilter,
  CellValue,
  SheetMetadata
} from './types';
import { DeltaManager } from './DeltaManager';
import { SnapshotManager } from './SnapshotManager';
import { BranchManager } from './BranchManager';
import { MergeResolver } from './MergeResolver';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Main version control store for spreadsheet data
 */
export class VersionStore {
  private versions: Map<string, Version>;
  private deltaManager: DeltaManager;
  private snapshotManager: SnapshotManager;
  private branchManager: BranchManager;
  private mergeResolver: MergeResolver;
  private currentVersion: string | null;
  private repositoryPath: string;

  constructor(repositoryPath: string = './.polln-version') {
    this.versions = new Map();
    this.deltaManager = new DeltaManager();
    this.snapshotManager = new SnapshotManager();
    this.branchManager = new BranchManager(this.snapshotManager);
    this.mergeResolver = new MergeResolver();
    this.currentVersion = null;
    this.repositoryPath = repositoryPath;
  }

  /**
   * Create a new version commit
   */
  async commit(
    cells: Map<string, CellValue>,
    metadata: SheetMetadata,
    message: string,
    author: string
  ): Promise<Version> {
    const activeBranch = this.branchManager.getActiveBranch();
    if (!activeBranch) {
      throw new Error('No active branch');
    }

    // Get parent version
    const parentVersion = this.currentVersion || null;

    // Create snapshot
    const snapshot = this.snapshotManager.createSnapshot(
      cells,
      metadata,
      '' // Will be set after version creation
    );

    // Create version
    const version: Version = {
      id: this.generateVersionId(),
      parent: parentVersion,
      message,
      author,
      timestamp: Date.now(),
      tree: snapshot.id,
      branch: activeBranch.name
    };

    // Update snapshot version ID
    snapshot.versionId = version.id;

    // Store version
    this.versions.set(version.id, version);

    // Update branch head
    this.branchManager.updateBranchHead(activeBranch.name, version.id);

    // Update current version
    this.currentVersion = version.id;

    return version;
  }

  /**
   * Checkout a specific version
   */
  checkout(versionId: string): SheetSnapshot {
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // Get snapshot
    const snapshot = this.snapshotManager.getSnapshot(version.tree);
    if (!snapshot) {
      throw new Error(`Snapshot ${version.tree} not found`);
    }

    // Update current version
    this.currentVersion = versionId;

    return snapshot;
  }

  /**
   * Checkout a branch
   */
  checkoutBranch(branchName: string): SheetSnapshot {
    this.branchManager.switchBranch(branchName);

    const branch = this.branchManager.getBranch(branchName);
    if (!branch) {
      throw new Error(`Branch ${branchName} not found`);
    }

    return this.checkout(branch.head);
  }

   /**
   * Create a new branch
   */
  branch(name: string, fromVersion?: string): Branch {
    const parentVersion = fromVersion || this.currentVersion;
    return this.branchManager.createBranch(name, parentVersion || null);
  }

  /**
   * Merge branches
   */
  async merge(
    branchName: string,
    strategy: MergeStrategy = MergeStrategy.AUTO
  ): Promise<MergeResult> {
    const activeBranch = this.branchManager.getActiveBranch();
    if (!activeBranch) {
      throw new Error('No active branch');
    }

    return await this.branchManager.mergeBranch(
      branchName,
      activeBranch.name,
      strategy
    );
  }

  /**
   * Get version history
   */
  getHistory(limit?: number, filter?: HistoryFilter): VersionEntry[] {
    let versions = Array.from(this.versions.values());

    // Apply filters
    if (filter) {
      if (filter.author) {
        versions = versions.filter(v => v.author === filter.author);
      }
      if (filter.branch) {
        versions = versions.filter(v => v.branch === filter.branch);
      }
      if (filter.since) {
        versions = versions.filter(v => v.timestamp >= filter.since!);
      }
      if (filter.until) {
        versions = versions.filter(v => v.timestamp <= filter.until!);
      }
      if (filter.messagePattern) {
        const pattern = new RegExp(filter.messagePattern);
        versions = versions.filter(v => pattern.test(v.message));
      }
    }

    // Sort by timestamp (newest first)
    versions.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (limit) {
      versions = versions.slice(0, limit);
    }

    // Convert to entries with change count
    return versions.map(v => ({
      id: v.id,
      parent: v.parent,
      message: v.message,
      author: v.author,
      timestamp: v.timestamp,
      branch: v.branch,
      changeCount: this.countVersionChanges(v)
    }));
  }

  /**
   * Get diff between two versions
   */
  diff(version1: string, version2: string): CellDiff[] {
    const v1 = this.versions.get(version1);
    const v2 = this.versions.get(version2);

    if (!v1 || !v2) {
      throw new Error('Version not found');
    }

    const snapshot1 = this.snapshotManager.getSnapshot(v1.tree);
    const snapshot2 = this.snapshotManager.getSnapshot(v2.tree);

    if (!snapshot1 || !snapshot2) {
      throw new Error('Snapshot not found');
    }

    return this.deltaManager.computeDiff(snapshot1, snapshot2);
  }

  /**
   * Get current version
   */
  getCurrentVersion(): Version | null {
    if (!this.currentVersion) {
      return null;
    }
    return this.versions.get(this.currentVersion) || null;
  }

  /**
   * Get version by ID
   */
  getVersion(versionId: string): Version | undefined {
    return this.versions.get(versionId);
  }

  /**
   * List all branches
   */
  listBranches(): Branch[] {
    return this.branchManager.listBranches();
  }

  /**
   * Get active branch
   */
  getActiveBranch(): Branch | undefined {
    return this.branchManager.getActiveBranch();
  }

  /**
   * Delete branch
   */
  deleteBranch(name: string): void {
    this.branchManager.deleteBranch(name);
  }

  /**
   * Rename branch
   */
  renameBranch(oldName: string, newName: string): void {
    this.branchManager.renameBranch(oldName, newName);
  }

  /**
   * Rebase current branch
   */
  async rebase(ontoBranch: string): Promise<boolean> {
    const activeBranch = this.branchManager.getActiveBranch();
    if (!activeBranch) {
      throw new Error('No active branch');
    }

    return await this.branchManager.rebase(activeBranch.name, ontoBranch);
  }

  /**
   * Preview merge without executing
   */
  async previewMerge(sourceBranch: string): Promise<import('./BranchManager').MergePreview> {
    const activeBranch = this.branchManager.getActiveBranch();
    if (!activeBranch) {
      throw new Error('No active branch');
    }

    return await this.branchManager.previewMerge(sourceBranch, activeBranch.name);
  }

  /**
   * Export all versions to file
   */
  async export(filePath: string): Promise<void> {
    const snapshots = this.snapshotManager.listSnapshots();
    const exportedSnapshots = snapshots.map(snapshot =>
      JSON.parse(this.snapshotManager.exportSnapshot(snapshot))
    );

    const exportData: VersionExport = {
      version: '1.0.0',
      repository: path.basename(this.repositoryPath),
      timestamp: Date.now(),
      versions: Array.from(this.versions.values()),
      branches: this.branchManager.listBranches(),
      snapshots: exportedSnapshots,
      config: {}
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf8');
  }

  /**
   * Import versions from file
   */
  async import(filePath: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      versionCount: 0,
      branchCount: 0,
      snapshotCount: 0,
      errors: []
    };

    try {
      const jsonString = await fs.readFile(filePath, 'utf8');
      const importData: VersionExport = JSON.parse(jsonString);

      // Import versions
      for (const version of importData.versions) {
        this.versions.set(version.id, version);
        result.versionCount++;
      }

      // Import branches
      for (const branch of importData.branches) {
        try {
          this.branchManager.createBranch(branch.name, branch.head);
          result.branchCount++;
        } catch (error) {
          // Branch might already exist, update it instead
          if ((error as Error).message.includes('already exists')) {
            const existingBranch = this.branchManager.getBranch(branch.name);
            if (existingBranch) {
              existingBranch.head = branch.head;
              result.branchCount++;
            }
          } else {
            throw error;
          }
        }
      }

      // Import snapshots
      for (const snapshot of importData.snapshots) {
        const imported = this.snapshotManager.importSnapshot(
          JSON.stringify(snapshot)
        );
        result.snapshotCount++;
      }

      result.success = true;
    } catch (error) {
      result.errors.push(String(error));
    }

    return result;
  }

  /**
   * Get repository statistics
   */
  getStatistics(): RepositoryStatistics {
    return {
      totalVersions: this.versions.size,
      totalBranches: this.branchManager.listBranches().length,
      totalSnapshots: this.snapshotManager.listSnapshots().length,
      currentVersion: this.currentVersion,
      activeBranch: this.branchManager.getActiveBranch()?.name,
      storageSize: this.snapshotManager.getTotalStorageSize()
    };
  }

  /**
   * Garbage collect old versions
   */
  garbageCollect(keepVersions: number = 10): number {
    const keepSet = new Set<string>();

    // Keep recent versions from each branch
    const branches = this.branchManager.listBranches();
    for (const branch of branches) {
      const branchVersions = this.getHistoryByBranch(branch.name, keepVersions);
      for (const version of branchVersions) {
        keepSet.add(version.id);
      }
    }

    // Also keep all branch heads
    for (const branch of branches) {
      keepSet.add(branch.head);
    }

    return this.snapshotManager.garbageCollect(keepSet);
  }

  /**
   * Initialize repository
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.repositoryPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to initialize repository: ${error}`);
    }
  }

  /**
   * Save repository to disk
   */
  async save(): Promise<void> {
    await this.export(path.join(this.repositoryPath, 'repository.json'));
  }

  /**
   * Load repository from disk
   */
  async load(): Promise<void> {
    const filePath = path.join(this.repositoryPath, 'repository.json');
    try {
      await fs.access(filePath);
      await this.import(filePath);
    } catch (error) {
      // Repository doesn't exist yet, that's okay
    }
  }

  /**
   * Count changes in a version
   */
  private countVersionChanges(version: Version): number {
    if (!version.parent) {
      // Initial commit - count all cells in snapshot
      const snapshot = this.snapshotManager.getSnapshot(version.tree);
      return snapshot ? snapshot.cells.size : 0;
    }

    // Count delta between parent and this version
    try {
      const diffs = this.diff(version.parent, version.id);
      return diffs.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get history for a specific branch
   */
  private getHistoryByBranch(branchName: string, limit: number): Version[] {
    const branchVersions = Array.from(this.versions.values())
      .filter(v => v.branch === branchName)
      .sort((a, b) => b.timestamp - a.timestamp);

    return branchVersions.slice(0, limit);
  }

  /**
   * Generate unique version ID
   */
  private generateVersionId(): string {
    return `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Repository statistics
 */
export interface RepositoryStatistics {
  totalVersions: number;
  totalBranches: number;
  totalSnapshots: number;
  currentVersion: string | null;
  activeBranch: string | undefined;
  storageSize: number;
}
