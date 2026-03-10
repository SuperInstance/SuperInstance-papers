/**
 * Merge Resolver for Spreadsheet Version Control
 *
 * Handles conflict detection, automatic merge strategies,
 * and provides data for manual conflict resolution UI.
 */

import {
  SheetSnapshot,
  CellValue,
  MergeStrategy,
  MergeResult,
  MergeConflict,
  MergeStats,
  ConflictType,
  ConflictResolution,
  CellDelta,
  DeltaOperation
} from './types';
import { DeltaManager } from './DeltaManager';

/**
 * Resolves merge conflicts with various strategies
 */
export class MergeResolver {
  private deltaManager: DeltaManager;

  constructor() {
    this.deltaManager = new DeltaManager();
  }

  /**
   * Perform automatic merge with conflict detection
   */
  async merge(
    source: SheetSnapshot,
    target: SheetSnapshot,
    ancestor: SheetSnapshot | null,
    strategy: MergeStrategy = MergeStrategy.AUTO
  ): Promise<MergeResult> {
    const stats: MergeStats = {
      merged: 0,
      conflicts: 0,
      added: 0,
      deleted: 0,
      modified: 0
    };

    // If no ancestor, treat target as base
    const base = ancestor || target;

    // Detect conflicts
    const conflicts = this.detectConflicts(source, target, base);

    // If conflicts exist and strategy is AUTO, return failure
    if (conflicts.length > 0 && strategy === MergeStrategy.AUTO) {
      return {
        success: false,
        conflicts,
        stats
      };
    }

    // Perform merge based on strategy
    const mergedCells = new Map<string, CellValue>();

    // Apply source changes based on strategy
    switch (strategy) {
      case MergeStrategy.OURS:
        // Keep target, ignore source
        target.cells.forEach((cell, coord) => {
          mergedCells.set(coord, { ...cell });
        });
        stats.merged = target.cells.size;
        break;

      case MergeStrategy.THEIRS:
        // Use source, replace target
        source.cells.forEach((cell, coord) => {
          mergedCells.set(coord, { ...cell });
        });
        stats.merged = source.cells.size;
        stats.modified = source.cells.size;
        break;

      case MergeStrategy.AUTO:
      case MergeStrategy.UNION:
        // Start with target cells
        target.cells.forEach((cell, coord) => {
          mergedCells.set(coord, { ...cell });
        });

        // Merge non-conflicting changes
        for (const [coord, sourceCell] of source.cells) {
          const targetCell = target.cells.get(coord);
          const baseCell = base.cells.get(coord);

          if (!targetCell) {
            // Cell doesn't exist in target - safe to add
            mergedCells.set(coord, { ...sourceCell });
            stats.added++;
            stats.merged++;
          } else if (!baseCell || !this.areCellsEqual(targetCell, baseCell)) {
            // Cell was modified in target - check for conflict
            const isConflict = conflicts.some(c => c.coordinate === coord);
            if (!isConflict) {
              // No conflict - can merge
              mergedCells.set(coord, { ...sourceCell });
              stats.modified++;
              stats.merged++;
            }
          }
        }
        break;

      case MergeStrategy.MANUAL:
        // Return conflicts for manual resolution
        return {
          success: false,
          conflicts,
          stats
        };
    }

    // Create merged snapshot
    const mergedSnapshot: SheetSnapshot = {
      id: this.generateId(),
      versionId: this.generateVersionId(),
      cells: mergedCells,
      metadata: { ...target.metadata },
      timestamp: Date.now()
    };

    stats.conflicts = conflicts.length;

    // For OURS and THEIRS strategies, merge always succeeds
    // For AUTO and UNION, success depends on whether there are unresolved conflicts
    const success = strategy === MergeStrategy.OURS ||
                   strategy === MergeStrategy.THEIRS ||
                   conflicts.length === 0;

    return {
      success,
      versionId: mergedSnapshot.versionId,
      conflicts: conflicts.length > 0 && strategy === MergeStrategy.AUTO ? conflicts : undefined,
      stats
    };
  }

  /**
   * Detect merge conflicts between branches
   */
  detectConflicts(
    source: SheetSnapshot,
    target: SheetSnapshot,
    base: SheetSnapshot
  ): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Check all cells that were modified in both branches
    const allCoordinates = new Set<string>();
    source.cells.forEach((_, coord) => allCoordinates.add(coord));
    target.cells.forEach((_, coord) => allCoordinates.add(coord));

    for (const coordinate of allCoordinates) {
      const sourceCell = source.cells.get(coordinate);
      const targetCell = target.cells.get(coordinate);
      const baseCell = base.cells.get(coordinate);

      const conflict = this.analyzeCellConflict(
        coordinate,
        sourceCell,
        targetCell,
        baseCell
      );

      if (conflict) {
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  /**
   * Analyze a single cell for conflicts
   */
  private analyzeCellConflict(
    coordinate: string,
    sourceCell: CellValue | undefined,
    targetCell: CellValue | undefined,
    baseCell: CellValue | undefined
  ): MergeConflict | null {
    // Cell added in both branches
    if (!baseCell && sourceCell && targetCell) {
      if (!this.areCellsEqual(sourceCell, targetCell)) {
        return {
          coordinate,
          current: targetCell,
          incoming: sourceCell,
          base: { ...baseCell } || this.createEmptyCell(coordinate),
          type: ConflictType.BOTH_ADDED
        };
      }
    }

    // Cell deleted in one, modified in another
    if (baseCell) {
      if (!sourceCell && targetCell && !this.areCellsEqual(targetCell, baseCell)) {
        return {
          coordinate,
          current: targetCell,
          incoming: this.createEmptyCell(coordinate),
          base: { ...baseCell },
          type: ConflictType.DELETE_MODIFY
        };
      }

      if (sourceCell && !targetCell && !this.areCellsEqual(sourceCell, baseCell)) {
        return {
          coordinate,
          current: this.createEmptyCell(coordinate),
          incoming: sourceCell,
          base: { ...baseCell },
          type: ConflictType.DELETE_MODIFY
        };
      }

      // Cell modified in both branches
      if (sourceCell && targetCell) {
        const sourceChanged = !this.areCellsEqual(sourceCell, baseCell);
        const targetChanged = !this.areCellsEqual(targetCell, baseCell);

        if (sourceChanged && targetChanged && !this.areCellsEqual(sourceCell, targetCell)) {
          // Check for dependency conflicts
          const depConflict = this.checkDependencyConflict(sourceCell, targetCell, baseCell);
          if (depConflict) {
            return depConflict;
          }

          return {
            coordinate,
            current: targetCell,
            incoming: sourceCell,
            base: { ...baseCell },
            type: ConflictType.BOTH_MODIFIED
          };
        }
      }
    }

    return null;
  }

  /**
   * Check for dependency conflicts in formulas
   */
  private checkDependencyConflict(
    sourceCell: CellValue,
    targetCell: CellValue,
    baseCell: CellValue
  ): MergeConflict | null {
    // Check if cells have dependencies that conflict
    if (sourceCell.dependencies || targetCell.dependencies) {
      const sourceDeps = new Set(sourceCell.dependencies || []);
      const targetDeps = new Set(targetCell.dependencies || []);
      const baseDeps = new Set(baseCell.dependencies || []);

      // Check if both branches modified dependencies differently
      const sourceChangedDeps = this.setDifference(sourceDeps, baseDeps);
      const targetChangedDeps = this.setDifference(targetDeps, baseDeps);

      if (sourceChangedDeps.size > 0 && targetChangedDeps.size > 0) {
        return {
          coordinate: sourceCell.coordinate,
          current: targetCell,
          incoming: sourceCell,
          base: { ...baseCell },
          type: ConflictType.DEPENDENCY
        };
      }
    }

    return null;
  }

  /**
   * Resolve conflicts with manual resolutions
   */
  async resolveWithConflicts(
    source: SheetSnapshot,
    target: SheetSnapshot,
    resolutions: ConflictResolution[]
  ): Promise<MergeResult> {
    const mergedCells = new Map<string, CellValue>();
    const stats: MergeStats = {
      merged: 0,
      conflicts: 0,
      added: 0,
      deleted: 0,
      modified: 0
    };

    // Start with target cells
    target.cells.forEach((cell, coord) => {
      mergedCells.set(coord, { ...cell });
    });

    // Apply resolutions
    for (const resolution of resolutions) {
      const sourceCell = source.cells.get(resolution.coordinate);
      const targetCell = target.cells.get(resolution.coordinate);

      switch (resolution.action) {
        case MergeStrategy.OURS:
          // Keep target (already in mergedCells)
          if (targetCell) {
            stats.merged++;
          }
          break;

        case MergeStrategy.THEIRS:
          // Use source
          if (sourceCell) {
            mergedCells.set(resolution.coordinate, { ...sourceCell });
            stats.merged++;
            stats.modified++;
          }
          break;

        case MergeStrategy.MANUAL:
          // Use custom value
          if (resolution.customValue !== undefined) {
            const customCell: CellValue = {
              coordinate: resolution.coordinate,
              value: resolution.customValue,
              type: this.inferCellType(resolution.customValue)
            };
            mergedCells.set(resolution.coordinate, customCell);
            stats.merged++;
            stats.modified++;
          }
          break;
      }
    }

    // Create merged snapshot
    const mergedSnapshot: SheetSnapshot = {
      id: this.generateId(),
      versionId: this.generateVersionId(),
      cells: mergedCells,
      metadata: { ...target.metadata },
      timestamp: Date.now()
    };

    return {
      success: true,
      versionId: mergedSnapshot.versionId,
      stats
    };
  }

  /**
   * Generate merge preview data for UI
   */
  async previewMerge(
    source: SheetSnapshot,
    target: SheetSnapshot
  ): Promise<MergePreview> {
    const base = this.findBaseSnapshot(source, target);
    const conflicts = this.detectConflicts(source, target, base);

    const autoMergable = this.countAutoMergableChanges(source, target, base);
    const conflictedCells = conflicts.map(c => c.coordinate);

    let complexity: 'simple' | 'moderate' | 'complex';
    if (conflicts.length === 0) {
      complexity = 'simple';
    } else if (conflicts.length < 10) {
      complexity = 'moderate';
    } else {
      complexity = 'complex';
    }

    return {
      autoMergable,
      conflicts: conflicts.length,
      conflictedCells,
      canFastForward: this.canFastForward(source, target),
      complexity
    };
  }

  /**
   * Generate conflict resolution UI data
   */
  generateConflictUI(conflicts: MergeConflict[]): ConflictUIItem[] {
    return conflicts.map(conflict => ({
      coordinate: conflict.coordinate,
      type: conflict.type,
      currentValue: this.formatCellValue(conflict.current),
      incomingValue: this.formatCellValue(conflict.incoming),
      baseValue: this.formatCellValue(conflict.base),
      suggestions: this.generateResolutionSuggestions(conflict),
      severity: this.assessConflictSeverity(conflict)
    }));
  }

  /**
   * Check if two cells are equal
   */
  private areCellsEqual(cell1: CellValue, cell2: CellValue): boolean {
    return (
      cell1.coordinate === cell2.coordinate &&
      cell1.type === cell2.type &&
      cell1.value === cell2.value &&
      cell1.formula === cell2.formula
    );
  }

  /**
   * Create empty cell for a coordinate
   */
  private createEmptyCell(coordinate: string): CellValue {
    return {
      coordinate,
      value: null,
      type: 'empty' as any
    };
  }

  /**
   * Get difference between two sets
   */
  private setDifference<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    const diff = new Set<T>();
    for (const item of set1) {
      if (!set2.has(item)) {
        diff.add(item);
      }
    }
    return diff;
  }

  /**
   * Find base snapshot for merge
   */
  private findBaseSnapshot(
    source: SheetSnapshot,
    target: SheetSnapshot
  ): SheetSnapshot {
    // Simple implementation: return older snapshot
    return source.timestamp < target.timestamp ? source : target;
  }

  /**
   * Count auto-mergable changes
   */
  private countAutoMergableChanges(
    source: SheetSnapshot,
    target: SheetSnapshot,
    base: SheetSnapshot
  ): number {
    let count = 0;

    for (const [coord, sourceCell] of source.cells) {
      const targetCell = target.cells.get(coord);
      const baseCell = base.cells.get(coord);

      if (!targetCell && !baseCell) {
        // Added in source, not in target - safe to add
        count++;
      } else if (targetCell && this.areCellsEqual(targetCell, baseCell)) {
        // Not modified in target - safe to update
        count++;
      }
    }

    return count;
  }

  /**
   * Check if fast-forward is possible
   */
  private canFastForward(source: SheetSnapshot, target: SheetSnapshot): boolean {
    // Fast forward is possible if target hasn't changed
    return target.cells.size === 0 || this.areSnapshotsEqual(source, target);
  }

  /**
   * Check if snapshots are equal
   */
  private areSnapshotsEqual(
    snapshot1: SheetSnapshot,
    snapshot2: SheetSnapshot
  ): boolean {
    if (snapshot1.cells.size !== snapshot2.cells.size) {
      return false;
    }

    for (const [coord, cell1] of snapshot1.cells) {
      const cell2 = snapshot2.cells.get(coord);
      if (!cell2 || !this.areCellsEqual(cell1, cell2)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Format cell value for display
   */
  private formatCellValue(cell: CellValue): string {
    if (cell.type === 'empty') {
      return '(empty)';
    }

    if (cell.formula) {
      return `=${cell.formula}`;
    }

    return String(cell.value ?? '');
  }

  /**
   * Generate resolution suggestions for a conflict
   */
  private generateResolutionSuggestions(conflict: MergeConflict): string[] {
    const suggestions: string[] = [];

    switch (conflict.type) {
      case ConflictType.BOTH_MODIFIED:
        suggestions.push('Keep current value');
        suggestions.push('Accept incoming value');
        suggestions.push('Combine values');
        break;

      case ConflictType.DELETE_MODIFY:
        if (conflict.current.type !== 'empty') {
          suggestions.push('Keep modification');
        } else {
          suggestions.push('Accept deletion');
        }
        break;

      case ConflictType.BOTH_ADDED:
        suggestions.push('Use current addition');
        suggestions.push('Use incoming addition');
        suggestions.push('Combine both');
        break;

      case ConflictType.DEPENDENCY:
        suggestions.push('Merge dependencies');
        suggestions.push('Use current dependencies');
        suggestions.push('Use incoming dependencies');
        break;
    }

    return suggestions;
  }

  /**
   * Assess conflict severity
   */
  private assessConflictSeverity(conflict: MergeConflict): 'low' | 'medium' | 'high' {
    if (conflict.type === ConflictType.DEPENDENCY) {
      return 'high';
    }

    if (conflict.type === ConflictType.BOTH_MODIFIED) {
      if (conflict.current.type === 'formula' || conflict.incoming.type === 'formula') {
        return 'high';
      }
      return 'medium';
    }

    return 'low';
  }

  /**
   * Infer cell type from value
   */
  private inferCellType(value: any): any {
    if (value === null || value === undefined) {
      return 'empty';
    }
    if (typeof value === 'number') {
      return 'number';
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (typeof value === 'string') {
      return 'string';
    }
    if (Array.isArray(value)) {
      return 'array';
    }
    if (typeof value === 'object') {
      return 'object';
    }
    return 'string';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate version ID
   */
  private generateVersionId(): string {
    return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Merge preview information
 */
export interface MergePreview {
  autoMergable: number;
  conflicts: number;
  conflictedCells: string[];
  canFastForward: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Conflict UI item for manual resolution
 */
export interface ConflictUIItem {
  coordinate: string;
  type: ConflictType;
  currentValue: string;
  incomingValue: string;
  baseValue: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high';
}
