/**
 * ConflictResolver - CRDT conflict handling and resolution
 *
 * Provides:
 * - LWW (Last-Writer-Wins) for values
 * - OT (Operational Transform) for formulas
 * - Custom merge UI for complex conflicts
 * - Automatic resolution with fallback
 * - Conflict detection and notification
 */

import * as Y from 'yjs';
import { YCell } from './YjsDocument';

export interface ConflictInfo {
  cellId: string;
  type: 'value' | 'formula' | 'type' | 'metadata';
  localValue: any;
  remoteValue: any;
  localTimestamp: number;
  remoteTimestamp: number;
  localUserId: string;
  remoteUserId: string;
  resolved: boolean;
}

export interface ResolutionStrategy {
  type: 'last-writer-wins' | 'first-writer-wins' | 'merge' | 'custom' | 'manual';
  mergeFunction?: (local: any, remote: any) => any;
}

export interface ConflictResolution {
  cellId: string;
  strategy: ResolutionStrategy['type'];
  result: any;
  timestamp: number;
  resolvedBy: string;
}

export class ConflictResolver {
  private conflicts: Map<string, ConflictInfo> = new Map();
  private resolutions: Map<string, ConflictResolution[]> = new Map();
  private resolutionStrategies: Map<string, ResolutionStrategy> = new Map();
  private conflictListeners: Set<(conflict: ConflictInfo) => void> = new Set();
  private resolutionListeners: Set<(resolution: ConflictResolution) => void> = new Set();

  constructor() {
    this.setupDefaultStrategies();
  }

  /**
   * Set up default resolution strategies
   */
  private setupDefaultStrategies(): void {
    // Default LWW for values
    this.setResolutionStrategy('value', {
      type: 'last-writer-wins',
    });

    // Merge for formulas (try to combine)
    this.setResolutionStrategy('formula', {
      type: 'merge',
      mergeFunction: (local: string, remote: string): string => {
        // If formulas are the same, use either
        if (local === remote) {
          return local;
        }

        // If one is empty, use the other
        if (!local) return remote;
        if (!remote) return local;

        // Try to merge (this is a simple example)
        // In practice, you'd need more sophisticated merging
        return local;
      },
    });

    // LWW for type changes
    this.setResolutionStrategy('type', {
      type: 'last-writer-wins',
    });

    // Merge for metadata
    this.setResolutionStrategy('metadata', {
      type: 'merge',
      mergeFunction: (local: any, remote: any): any => {
        return {
          ...local,
          ...remote,
        };
      },
    });
  }

  /**
   * Set resolution strategy for conflict type
   */
  setResolutionStrategy(
    conflictType: ConflictInfo['type'],
    strategy: ResolutionStrategy
  ): void {
    this.resolutionStrategies.set(conflictType, strategy);
  }

  /**
   * Detect and resolve conflict
   */
  async detectAndResolve(
    cellId: string,
    conflictType: ConflictInfo['type'],
    localValue: any,
    remoteValue: any,
    localTimestamp: number,
    remoteTimestamp: number,
    localUserId: string,
    remoteUserId: string
  ): Promise<any> {
    // Check if there's actually a conflict
    if (!this.isConflict(localValue, remoteValue)) {
      return localValue;
    }

    // Create conflict info
    const conflict: ConflictInfo = {
      cellId,
      type: conflictType,
      localValue,
      remoteValue,
      localTimestamp,
      remoteTimestamp,
      localUserId,
      remoteUserId,
      resolved: false,
    };

    this.conflicts.set(`${cellId}-${conflictType}`, conflict);

    // Notify listeners
    this.notifyConflict(conflict);

    // Get resolution strategy
    const strategy = this.resolutionStrategies.get(conflictType);

    if (!strategy) {
      // Default to LWW
      return this.lastWriterWins(
        localValue,
        remoteValue,
        localTimestamp,
        remoteTimestamp
      );
    }

    // Apply resolution strategy
    let result: any;

    switch (strategy.type) {
      case 'last-writer-wins':
        result = this.lastWriterWins(
          localValue,
          remoteValue,
          localTimestamp,
          remoteTimestamp
        );
        break;

      case 'first-writer-wins':
        result = this.firstWriterWins(
          localValue,
          remoteValue,
          localTimestamp,
          remoteTimestamp
        );
        break;

      case 'merge':
        result = strategy.mergeFunction
          ? strategy.mergeFunction(localValue, remoteValue)
          : localValue;
        break;

      case 'manual':
        // Emit event for manual resolution
        result = await this.requestManualResolution(conflict);
        break;

      default:
        result = this.lastWriterWins(
          localValue,
          remoteValue,
          localTimestamp,
          remoteTimestamp
        );
    }

    // Record resolution
    const resolution: ConflictResolution = {
      cellId,
      strategy: strategy.type,
      result,
      timestamp: Date.now(),
      resolvedBy: localUserId,
    };

    this.recordResolution(resolution);

    // Mark conflict as resolved
    conflict.resolved = true;

    // Notify resolution listeners
    this.notifyResolution(resolution);

    return result;
  }

  /**
   * Check if values are in conflict
   */
  private isConflict(localValue: any, remoteValue: any): boolean {
    // Simple comparison - in practice, you might need deep equality
    return JSON.stringify(localValue) !== JSON.stringify(remoteValue);
  }

  /**
   * Last-Writer-Wins resolution
   */
  private lastWriterWins(
    localValue: any,
    remoteValue: any,
    localTimestamp: number,
    remoteTimestamp: number
  ): any {
    return remoteTimestamp > localTimestamp ? remoteValue : localValue;
  }

  /**
   * First-Writer-Wins resolution
   */
  private firstWriterWins(
    localValue: any,
    remoteValue: any,
    localTimestamp: number,
    remoteTimestamp: number
  ): any {
    return remoteTimestamp > localTimestamp ? localValue : remoteValue;
  }

  /**
   * Request manual resolution
   */
  private async requestManualResolution(conflict: ConflictInfo): Promise<any> {
    return new Promise((resolve) => {
      // This would typically open a modal or UI for manual resolution
      // For now, we'll default to LWW after a timeout
      setTimeout(() => {
        const result = this.lastWriterWins(
          conflict.localValue,
          conflict.remoteValue,
          conflict.localTimestamp,
          conflict.remoteTimestamp
        );
        resolve(result);
      }, 5000);
    });
  }

  /**
   * Record resolution
   */
  private recordResolution(resolution: ConflictResolution): void {
    if (!this.resolutions.has(resolution.cellId)) {
      this.resolutions.set(resolution.cellId, []);
    }

    this.resolutions.get(resolution.cellId)!.push(resolution);
  }

  /**
   * Notify conflict listeners
   */
  private notifyConflict(conflict: ConflictInfo): void {
    this.conflictListeners.forEach(listener => listener(conflict));
  }

  /**
   * Notify resolution listeners
   */
  private notifyResolution(resolution: ConflictResolution): void {
    this.resolutionListeners.forEach(listener => listener(resolution));
  }

  /**
   * Subscribe to conflicts
   */
  onConflict(callback: (conflict: ConflictInfo) => void): () => void {
    this.conflictListeners.add(callback);

    return () => {
      this.conflictListeners.delete(callback);
    };
  }

  /**
   * Subscribe to resolutions
   */
  onResolution(callback: (resolution: ConflictResolution) => void): () => void {
    this.resolutionListeners.add(callback);

    return () => {
      this.resolutionListeners.delete(callback);
    };
  }

  /**
   * Get unresolved conflicts
   */
  getUnresolvedConflicts(): ConflictInfo[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolved);
  }

  /**
   * Get all conflicts
   */
  getAllConflicts(): ConflictInfo[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get resolutions for cell
   */
  getResolutions(cellId: string): ConflictResolution[] {
    return this.resolutions.get(cellId) || [];
  }

  /**
   * Get all resolutions
   */
  getAllResolutions(): Map<string, ConflictResolution[]> {
    return this.resolutions;
  }

  /**
   * Clear resolved conflicts
   */
  clearResolvedConflicts(): void {
    const unresolved = this.getUnresolvedConflicts();
    this.conflicts.clear();

    unresolved.forEach(conflict => {
      this.conflicts.set(`${conflict.cellId}-${conflict.type}`, conflict);
    });
  }

  /**
   * Get conflict statistics
   */
  getConflictStats(): {
    total: number;
    resolved: number;
    unresolved: number;
    byType: Map<string, number>;
  } {
    const conflicts = this.getAllConflicts();
    const byType = new Map<string, number>();

    conflicts.forEach(conflict => {
      const count = byType.get(conflict.type) || 0;
      byType.set(conflict.type, count + 1);
    });

    return {
      total: conflicts.length,
      resolved: conflicts.filter(c => c.resolved).length,
      unresolved: conflicts.filter(c => !c.resolved).length,
      byType,
    };
  }

  /**
   * Merge cell states (for complex conflicts)
   */
  mergeCellStates(
    localCell: YCell,
    remoteCell: YCell
  ): YCell {
    // Create a merged cell
    const merged = new YCell();

    // Get values
    const localValue = localCell.get('value');
    const remoteValue = remoteCell.get('value');
    const localTimestamp = localCell.get('lastModified') as number;
    const remoteTimestamp = remoteCell.get('lastModified') as number;

    // Merge using LWW for values
    merged.set('value', this.lastWriterWins(
      localValue,
      remoteValue,
      localTimestamp,
      remoteTimestamp
    ));

    // Merge formulas
    const localFormula = localCell.get('formula');
    const remoteFormula = remoteCell.get('formula');
    const formulaStrategy = this.resolutionStrategies.get('formula');

    if (formulaStrategy?.mergeFunction) {
      merged.set('formula', formulaStrategy.mergeFunction(
        localFormula,
        remoteFormula
      ));
    } else {
      merged.set('formula', this.lastWriterWins(
        localFormula,
        remoteFormula,
        localTimestamp,
        remoteTimestamp
      ));
    }

    // Merge metadata
    const localMetadata = localCell.get('metadata');
    const remoteMetadata = remoteCell.get('metadata');
    const metadataStrategy = this.resolutionStrategies.get('metadata');

    if (metadataStrategy?.mergeFunction) {
      merged.set('metadata', metadataStrategy.mergeFunction(
        localMetadata,
        remoteMetadata
      ));
    }

    // Keep highest version
    const localVersion = localCell.get('version') as number;
    const remoteVersion = remoteCell.get('version') as number;
    merged.set('version', Math.max(localVersion, remoteVersion));

    return merged;
  }

  /**
   * Apply operational transform to formula
   */
  applyOperationalTransform(
    formula: string,
    operation: {
      type: 'insert' | 'delete' | 'replace';
      position: number;
      length?: number;
      text?: string;
    }
  ): string {
    switch (operation.type) {
      case 'insert':
        return formula.slice(0, operation.position) +
               (operation.text || '') +
               formula.slice(operation.position);

      case 'delete':
        return formula.slice(0, operation.position) +
               formula.slice(operation.position + (operation.length || 0));

      case 'replace':
        return formula.slice(0, operation.position) +
               (operation.text || '') +
               formula.slice(operation.position + (operation.length || 0));

      default:
        return formula;
    }
  }

  /**
   * Transform operation against another operation
   */
  transformOperation(
    op1: ConflictResolver['applyOperationalTransform'],
    op2: ConflictResolver['applyOperationalTransform']
  ): ConflictResolver['applyOperationalTransform'] {
    // This is a simplified OT transform
    // In practice, you'd need a full OT implementation

    if (op1.position <= op2.position) {
      return op1;
    }

    // Adjust position based on op2
    const positionAdjustment = op2.length || (op2.text?.length || 0);
    return {
      ...op1,
      position: op1.position + positionAdjustment,
    };
  }

  /**
   * Destroy resolver
   */
  destroy(): void {
    this.conflicts.clear();
    this.resolutions.clear();
    this.resolutionStrategies.clear();
    this.conflictListeners.clear();
    this.resolutionListeners.clear();
  }
}
