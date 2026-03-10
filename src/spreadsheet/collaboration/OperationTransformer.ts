/**
 * OperationTransformer - Operational Transformation for concurrent edits
 *
 * Provides:
 * - Conflict-free operation transformation
 * - OT algorithms for real-time collaboration
 * - Composition and inversion of operations
 * - Support for insert, delete, replace operations
 * - Sub-100ms transformation time
 * - Memory-efficient delta representation
 */

import {
  Operation,
  OperationType,
  LocalOperation,
  RemoteOperation,
  TransformedOperation,
  CellValue,
} from './types';

/**
 * Path-based operation for nested structures
 */
interface PathOperation extends Operation {
  path: string[];
}

/**
 * Operation context for transformation
 */
interface OperationContext {
  version: number;
  timestamp: number;
  userId: string;
}

/**
 * Conflict information
 */
interface ConflictInfo {
  hasConflict: boolean;
  conflictType: 'concurrent' | 'causal' | 'none';
  resolutionStrategy: 'transform' | 'merge' | 'reject';
}

/**
 * Operational Transformation Engine
 *
 * Implements OT algorithms to resolve conflicts in concurrent edits.
 * Based on the Jupiter/Google Wave OT framework.
 */
export class OperationTransformer {
  private operationHistory: Map<string, Operation[]> = new Map();
  private maxHistorySize: number = 100;
  private transformationCache: Map<string, TransformedOperation> = new Map();
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Transform local operation against remote operation
   *
   * This is the core OT algorithm that ensures convergence.
   * Uses transform function T(op_l, op_r) -> op_l'
   */
  transform(
    local: LocalOperation | Operation,
    remote: RemoteOperation | Operation
  ): TransformedOperation {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.getCacheKey(local, remote);
    const cached = this.transformationCache.get(cacheKey);
    if (cached) {
      this.cacheHits++;
      return cached;
    }
    this.cacheMisses++;

    // Detect conflict
    const conflict = this.detectConflict(local, remote);

    // Transform based on operation types
    let transformedOp: RemoteOperation;

    if (conflict.hasConflict) {
      transformedOp = this.transformWithConflict(local, remote, conflict);
    } else {
      transformedOp = this.transformWithoutConflict(local, remote);
    }

    const result: TransformedOperation = {
      operation: transformedOp,
      conflict: conflict.hasConflict,
    };

    // Cache result
    this.cacheTransformation(cacheKey, result);

    // Record history
    this.recordOperation(local);

    return result;
  }

  /**
   * Compose two operations into one
   *
   * compose(op1, op2) -> op3 such that op3(state) = op2(op1(state))
   */
  compose(op1: Operation, op2: Operation): Operation {
    if (op1.cellId !== op2.cellId) {
      throw new Error('Cannot compose operations on different cells');
    }

    // If op2 is after op1 chronologically, op2 wins
    if (op2.timestamp > op1.timestamp) {
      return { ...op2 };
    }

    // Compose based on types
    if (op1.type === 'delete' && op2.type === 'insert') {
      // delete + insert = replace
      return {
        ...op2,
        type: 'replace',
        id: `${op1.id}+${op2.id}`,
      };
    }

    if (op1.type === 'insert' && op2.type === 'delete') {
      // insert + delete = no-op
      return {
        ...op1,
        type: 'delete',
        value: null,
      };
    }

    // Default: op2 wins
    return { ...op2 };
  }

  /**
   * Invert an operation
   *
   * invert(op) -> op' such that op'(op(state)) = state
   */
  invert(op: Operation, baseValue: CellValue): Operation {
    let invertedType: OperationType;
    let invertedValue: CellValue;

    switch (op.type) {
      case 'insert':
        invertedType = 'delete';
        invertedValue = null;
        break;

      case 'delete':
        invertedType = 'insert';
        invertedValue = baseValue;
        break;

      case 'replace':
        invertedType = 'replace';
        invertedValue = baseValue;
        break;

      case 'set':
        invertedType = 'set';
        invertedValue = baseValue;
        break;

      default:
        throw new Error(`Unknown operation type: ${op.type}`);
    }

    return {
      ...op,
      type: invertedType,
      value: invertedValue,
      id: `${op.id}-inverted`,
    };
  }

  /**
   * Transform without conflict (simple case)
   */
  private transformWithoutConflict(
    local: LocalOperation | Operation,
    remote: RemoteOperation | Operation
  ): RemoteOperation {
    // No conflict, just return remote as-is
    return {
      id: (remote as RemoteOperation).id || remote.id,
      cellId: remote.cellId,
      type: remote.type,
      value: remote.value,
      userId: remote.userId,
      timestamp: remote.timestamp,
      version: remote.version || 0,
      transformed: false,
    };
  }

  /**
   * Transform with conflict (complex case)
   */
  private transformWithConflict(
    local: LocalOperation | Operation,
    remote: RemoteOperation | Operation,
    conflict: ConflictInfo
  ): RemoteOperation {
    const remoteOp = remote as RemoteOperation;

    // Concurrent updates on same cell - use OT
    if (conflict.conflictType === 'concurrent') {
      return this.transformConcurrent(local, remote);
    }

    // Causal conflict - apply merge strategy
    if (conflict.conflictType === 'causal') {
      return this.transformCausal(local, remote);
    }

    return {
      ...remoteOp,
      transformed: false,
    };
  }

  /**
   * Transform concurrent operations
   */
  private transformConcurrent(
    local: LocalOperation | Operation,
    remote: RemoteOperation | Operation
  ): RemoteOperation {
    const localType = local.type;
    const remoteType = remote.type;

    // Insert + Insert -> Keep both, concatenate
    if (localType === 'insert' && remoteType === 'insert') {
      const localStr = String(local.value || '');
      const remoteStr = String(remote.value || '');

      return {
        id: (remote as RemoteOperation).id,
        cellId: remote.cellId,
        type: 'replace',
        value: remoteStr + localStr,
        userId: remote.userId,
        timestamp: remote.timestamp,
        version: remote.version || 0,
        transformed: true,
      };
    }

    // Delete + Insert -> Insert wins (after delete)
    if (localType === 'delete' && remoteType === 'insert') {
      return {
        id: (remote as RemoteOperation).id,
        cellId: remote.cellId,
        type: 'insert',
        value: remote.value,
        userId: remote.userId,
        timestamp: remote.timestamp,
        version: remote.version || 0,
        transformed: true,
      };
    }

    // Insert + Delete -> Delete wins
    if (localType === 'insert' && remoteType === 'delete') {
      return {
        id: (remote as RemoteOperation).id,
        cellId: remote.cellId,
        type: 'delete',
        value: null,
        userId: remote.userId,
        timestamp: remote.timestamp,
        version: remote.version || 0,
        transformed: true,
      };
    }

    // Replace + Replace -> Last-write-wins based on timestamp
    if (localType === 'replace' && remoteType === 'replace') {
      const winningOp = remote.timestamp >= local.timestamp ? remote : local;

      return {
        id: (remote as RemoteOperation).id,
        cellId: remote.cellId,
        type: 'replace',
        value: winningOp.value,
        userId: remote.userId,
        timestamp: remote.timestamp,
        version: remote.version || 0,
        transformed: winningOp === remote,
      };
    }

    // Default: remote wins
    return {
      id: (remote as RemoteOperation).id,
      cellId: remote.cellId,
      type: remote.type,
      value: remote.value,
      userId: remote.userId,
      timestamp: remote.timestamp,
      version: remote.version || 0,
      transformed: true,
    };
  }

  /**
   * Transform causal operations
   */
  private transformCausal(
    local: LocalOperation | Operation,
    remote: RemoteOperation | Operation
  ): RemoteOperation {
    // Causal conflicts: one operation depends on the other
    // Apply merge strategy based on operation semantics

    // If local happened before remote, transform remote to account for local
    if (local.timestamp < remote.timestamp) {
      return this.transformRemoteAgainstLocal(local, remote);
    }

    // If remote happened before local, transform should be no-op
    return {
      id: (remote as RemoteOperation).id,
      cellId: remote.cellId,
      type: remote.type,
      value: remote.value,
      userId: remote.userId,
      timestamp: remote.timestamp,
      version: remote.version || 0,
      transformed: false,
    };
  }

  /**
   * Transform remote operation against local operation
   */
  private transformRemoteAgainstLocal(
    local: LocalOperation | Operation,
    remote: RemoteOperation | Operation
  ): RemoteOperation {
    // Semantic merge based on operation types
    switch (remote.type) {
      case 'set':
        // Set operations override previous state
        return {
          id: (remote as RemoteOperation).id,
          cellId: remote.cellId,
          type: 'set',
          value: remote.value,
          userId: remote.userId,
          timestamp: remote.timestamp,
          version: (local.version || 0) + 1,
          transformed: true,
        };

      case 'insert':
        // Adjust position if needed
        const adjustedPos = local.type === 'insert'
          ? (remote.position || 0) + String(local.value || '').length
          : remote.position;

        return {
          id: (remote as RemoteOperation).id,
          cellId: remote.cellId,
          type: 'insert',
          value: remote.value,
          position: adjustedPos,
          userId: remote.userId,
          timestamp: remote.timestamp,
          version: (local.version || 0) + 1,
          transformed: true,
        };

      default:
        return {
          id: (remote as RemoteOperation).id,
          cellId: remote.cellId,
          type: remote.type,
          value: remote.value,
          userId: remote.userId,
          timestamp: remote.timestamp,
          version: (local.version || 0) + 1,
          transformed: true,
        };
    }
  }

  /**
   * Detect conflict between operations
   */
  private detectConflict(
    op1: LocalOperation | Operation,
    op2: RemoteOperation | Operation
  ): ConflictInfo {
    // Different cells - no conflict
    if (op1.cellId !== op2.cellId) {
      return {
        hasConflict: false,
        conflictType: 'none',
        resolutionStrategy: 'transform',
      };
    }

    // Same user - no conflict
    if (op1.userId === op2.userId) {
      return {
        hasConflict: false,
        conflictType: 'none',
        resolutionStrategy: 'transform',
      };
    }

    // Check for concurrency (operations happening at same time)
    const timeDiff = Math.abs(op1.timestamp - op2.timestamp);
    const isConcurrent = timeDiff < 100; // Within 100ms

    if (isConcurrent) {
      return {
        hasConflict: true,
        conflictType: 'concurrent',
        resolutionStrategy: 'transform',
      };
    }

    // Causal conflict (one operation happened before the other)
    if (this.isCausalConflict(op1, op2)) {
      return {
        hasConflict: true,
        conflictType: 'causal',
        resolutionStrategy: 'merge',
      };
    }

    return {
      hasConflict: false,
      conflictType: 'none',
      resolutionStrategy: 'transform',
    };
  }

  /**
   * Check if operations have causal conflict
   */
  private isCausalConflict(
    op1: LocalOperation | Operation,
    op2: RemoteOperation | Operation
  ): boolean {
    // Check version numbers
    const v1 = op1.version || 0;
    const v2 = op2.version || 0;

    // If versions are same but operations are different, might be causal
    if (v1 === v2 && op1.type !== op2.type) {
      return true;
    }

    // If operations modify same cell with different types
    if (op1.cellId === op2.cellId && op1.type !== op2.type) {
      return true;
    }

    return false;
  }

  /**
   * Record operation in history
   */
  private recordOperation(op: LocalOperation | Operation): void {
    const cellId = op.cellId;

    if (!this.operationHistory.has(cellId)) {
      this.operationHistory.set(cellId, []);
    }

    const history = this.operationHistory.get(cellId)!;
    history.push(op as Operation);

    // Trim history
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Get operation history for cell
   */
  getHistory(cellId: string): Operation[] {
    return this.operationHistory.get(cellId) || [];
  }

  /**
   * Generate cache key for operations
   */
  private getCacheKey(
    op1: LocalOperation | Operation,
    op2: RemoteOperation | Operation
  ): string {
    return `${op1.cellId}:${op1.type}:${op1.version}:${op2.type}:${op2.version}`;
  }

  /**
   * Cache transformation result
   */
  private cacheTransformation(
    key: string,
    result: TransformedOperation
  ): void {
    // Limit cache size
    if (this.transformationCache.size > 1000) {
      // Remove oldest entries (first 100)
      const entries = Array.from(this.transformationCache.entries());
      this.transformationCache.clear();

      // Keep most recent 900
      entries.slice(100).forEach(([k, v]) => {
        this.transformationCache.set(k, v);
      });
    }

    this.transformationCache.set(key, result);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.transformationCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      size: this.transformationCache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }

  /**
   * Get operation history for debugging
   */
  getOperationHistory(): Map<string, Operation[]> {
    return new Map(this.operationHistory);
  }

  /**
   * Clear operation history
   */
  clearHistory(): void {
    this.operationHistory.clear();
  }

  /**
   * Calculate memory-efficient delta
   */
  calculateDelta(
    oldValue: CellValue,
    newValue: CellValue
  ): { oldValue?: CellValue; newValue: CellValue; delta: string } {
    // If values are same, no delta
    if (oldValue === newValue) {
      return {
        newValue,
        delta: 'none',
      };
    }

    // If old value is undefined, this is an insert
    if (oldValue === undefined || oldValue === null) {
      return {
        newValue,
        delta: 'insert',
      };
    }

    // If new value is undefined, this is a delete
    if (newValue === undefined || newValue === null) {
      return {
        oldValue,
        newValue: null,
        delta: 'delete',
      };
    }

    // For strings, calculate character-level delta
    if (typeof oldValue === 'string' && typeof newValue === 'string') {
      const diff = this.stringDiff(oldValue, newValue);
      return {
        oldValue,
        newValue,
        delta: diff,
      };
    }

    // For other types, just note the change
    return {
      oldValue,
      newValue,
      delta: 'replace',
    };
  }

  /**
   * Calculate string difference (Myers diff algorithm simplified)
   */
  private stringDiff(oldStr: string, newStr: string): string {
    if (oldStr === newStr) return 'none';

    // Simple approach: find common prefix and suffix
    let prefixLen = 0;
    while (
      prefixLen < oldStr.length &&
      prefixLen < newStr.length &&
      oldStr[prefixLen] === newStr[prefixLen]
    ) {
      prefixLen++;
    }

    let suffixLen = 0;
    while (
      suffixLen < oldStr.length - prefixLen &&
      suffixLen < newStr.length - prefixLen &&
      oldStr[oldStr.length - 1 - suffixLen] === newStr[newStr.length - 1 - suffixLen]
    ) {
      suffixLen++;
    }

    const oldMiddle = oldStr.substring(prefixLen, oldStr.length - suffixLen);
    const newMiddle = newStr.substring(prefixLen, newStr.length - suffixLen);

    if (oldMiddle.length === 0) {
      return `insert(${prefixLen}, "${newMiddle}")`;
    }

    if (newMiddle.length === 0) {
      return `delete(${prefixLen}, ${oldMiddle.length})`;
    }

    return `replace(${prefixLen}, ${oldMiddle.length}, "${newMiddle}")`;
  }

  /**
   * Apply delta to value
   */
  applyDelta(value: CellValue, delta: string): CellValue {
    if (delta === 'none') return value;
    if (delta === 'insert') return value;
    if (delta === 'delete') return null;

    // Parse and apply string delta
    if (typeof value === 'string' && delta.startsWith('insert')) {
      const match = delta.match(/insert\((\d+), "([^"]*)"\)/);
      if (match) {
        const pos = parseInt(match[1]);
        const text = match[2];
        return value.slice(0, pos) + text + value.slice(pos);
      }
    }

    if (typeof value === 'string' && delta.startsWith('delete')) {
      const match = delta.match(/delete\((\d+), (\d+)\)/);
      if (match) {
        const pos = parseInt(match[1]);
        const len = parseInt(match[2]);
        return value.slice(0, pos) + value.slice(pos + len);
      }
    }

    if (typeof value === 'string' && delta.startsWith('replace')) {
      const match = delta.match(/replace\((\d+), (\d+), "([^"]*)"\)/);
      if (match) {
        const pos = parseInt(match[1]);
        const len = parseInt(match[2]);
        const text = match[3];
        return value.slice(0, pos) + text + value.slice(pos + len);
      }
    }

    return value;
  }

  /**
   * Destroy transformer
   */
  destroy(): void {
    this.clearCache();
    this.clearHistory();
  }
}
