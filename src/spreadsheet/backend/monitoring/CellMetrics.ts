/**
 * CellMetrics.ts
 *
 * Cell-specific metrics for monitoring LogCell operations.
 * Tracks operation counts, type distribution, state transitions, and error rates.
 */

import { getMetricsCollector, MetricLabels } from './MetricsCollector';

/**
 * Cell operation types
 */
export enum CellOperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  TRANSFORM = 'transform',
  VALIDATE = 'validate',
  AGGREGATE = 'aggregate',
  ANALYZE = 'analyze',
  PREDICT = 'predict',
  DECIDE = 'decide',
  EXPLAIN = 'explain',
}

/**
 * Cell operation status
 */
export enum CellOperationStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  TIMEOUT = 'timeout',
}

/**
 * Cell state transitions
 */
export enum CellState {
  IDLE = 'idle',
  PROCESSING = 'processing',
  ERROR = 'error',
  DISABLED = 'disabled',
}

/**
 * Cell-specific metrics manager
 */
export class CellMetrics {
  private readonly metrics = getMetricsCollector();
  private readonly operationTimers = new Map<string, number>();

  /**
   * Track the start of a cell operation
   */
  startOperation(cellId: string, cellType: string, operation: CellOperationType): void {
    const key = `${cellId}:${operation}`;
    this.operationTimers.set(key, Date.now());
  }

  /**
   * Track the completion of a cell operation
   */
  endOperation(
    cellId: string,
    cellType: string,
    operation: CellOperationType,
    status: CellOperationStatus,
    complexity?: number
  ): void {
    const key = `${cellId}:${operation}`;
    const startTime = this.operationTimers.get(key);

    if (startTime) {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      this.metrics.observeCellProcessingTime(duration, {
        cell_type: cellType,
        operation,
      });

      if (complexity !== undefined) {
        this.metrics.observeCellComplexity(complexity, cellType);
      }

      this.operationTimers.delete(key);
    }

    // Increment operation counter
    this.metrics.incrementCellOperations({
      cell_type: cellType,
      operation,
      status_code: status,
    });

    // Track errors
    if (status === CellOperationStatus.FAILURE) {
      this.metrics.incrementErrors({
        error_type: `cell_${operation}`,
        cell_type: cellType,
      });
    }
  }

  /**
   * Track a cell state transition
   */
  recordStateTransition(
    cellId: string,
    cellType: string,
    fromState: CellState,
    toState: CellState
  ): void {
    this.metrics.incrementCellOperations({
      cell_type: cellType,
      operation: `state_${fromState}_to_${toState}`,
      status_code: CellOperationStatus.SUCCESS,
    });
  }

  /**
   * Track batch cell operations
   */
  recordBatchOperation(
    cellType: string,
    operation: CellOperationType,
    count: number,
    status: CellOperationStatus
  ): void {
    for (let i = 0; i < count; i++) {
      this.metrics.incrementCellOperations({
        cell_type: cellType,
        operation,
        status_code: status,
      });
    }
  }

  /**
   * Track cell operation errors
   */
  recordError(
    cellId: string,
    cellType: string,
    operation: CellOperationType,
    error: Error
  ): void {
    this.metrics.incrementErrors({
      error_type: error.name || 'cell_operation_error',
      cell_type: `${cellType}_${operation}`,
    });

    this.metrics.incrementCellOperations({
      cell_type: cellType,
      operation,
      status_code: CellOperationStatus.FAILURE,
    });
  }

  /**
   * Track cell dependency resolution
   */
  recordDependencyResolution(
    cellId: string,
    cellType: string,
    dependencyCount: number,
    resolved: number,
    duration: number
  ): void {
    this.metrics.observeCellProcessingTime(duration, {
      cell_type: `${cellType}_dependency`,
      operation: 'resolve',
    });

    // Track if not all dependencies were resolved
    if (resolved < dependencyCount) {
      this.metrics.incrementErrors({
        error_type: 'unresolved_dependencies',
        cell_type: cellType,
      });
    }
  }

  /**
   * Track cell validation results
   */
  recordValidation(
    cellId: string,
    cellType: string,
    ruleCount: number,
    passed: number,
    failed: number
  ): void {
    const status = failed === 0
      ? CellOperationStatus.SUCCESS
      : failed === ruleCount
      ? CellOperationStatus.FAILURE
      : CellOperationStatus.PARTIAL;

    this.metrics.incrementCellOperations({
      cell_type: cellType,
      operation: CellOperationType.VALIDATE,
      status_code: status,
    });

    // Track validation failures
    if (failed > 0) {
      this.metrics.incrementErrors({
        error_type: 'validation_failed',
        cell_type: cellType,
      });
    }
  }

  /**
   * Track cell transformation results
   */
  recordTransformation(
    cellId: string,
    cellType: string,
    inputSize: number,
    outputSize: number,
    duration: number
  ): void {
    this.metrics.observeCellProcessingTime(duration, {
      cell_type: cellType,
      operation: CellOperationType.TRANSFORM,
    });

    // Track data transformation ratio
    const ratio = outputSize / inputSize;
    this.metrics.observeCellComplexity(ratio, `${cellType}_transform_ratio`);

    this.metrics.incrementCellOperations({
      cell_type: cellType,
      operation: CellOperationType.TRANSFORM,
      status_code: CellOperationStatus.SUCCESS,
    });
  }

  /**
   * Track cell aggregation results
   */
  recordAggregation(
    cellId: string,
    cellType: string,
    sourceCount: number,
    resultSize: number,
    duration: number
  ): void {
    this.metrics.observeCellProcessingTime(duration, {
      cell_type: cellType,
      operation: CellOperationType.AGGREGATE,
    });

    // Track aggregation complexity
    this.metrics.observeCellComplexity(sourceCount, `${cellType}_aggregation_count`);

    this.metrics.incrementCellOperations({
      cell_type: cellType,
      operation: CellOperationType.AGGREGATE,
      status_code: CellOperationStatus.SUCCESS,
    });
  }

  /**
   * Track cell prediction results
   */
  recordPrediction(
    cellId: string,
    cellType: string,
    confidence: number,
    accuracy?: number,
    duration: number
  ): void {
    this.metrics.observeCellProcessingTime(duration, {
      cell_type: cellType,
      operation: CellOperationType.PREDICT,
    });

    // Track confidence distribution
    this.metrics.observeCellComplexity(confidence, `${cellType}_prediction_confidence`);

    // Track accuracy if provided
    if (accuracy !== undefined) {
      this.metrics.observeCellComplexity(accuracy, `${cellType}_prediction_accuracy`);
    }

    this.metrics.incrementCellOperations({
      cell_type: cellType,
      operation: CellOperationType.PREDICT,
      status_code: CellOperationStatus.SUCCESS,
    });
  }

  /**
   * Track cell decision results
   */
  recordDecision(
    cellId: string,
    cellType: string,
    decision: string,
    confidence: number,
    duration: number
  ): void {
    this.metrics.observeCellProcessingTime(duration, {
      cell_type: cellType,
      operation: CellOperationType.DECIDE,
    });

    this.metrics.observeCellComplexity(confidence, `${cellType}_decision_confidence`);

    this.metrics.incrementCellOperations({
      cell_type: cellType,
      operation: CellOperationType.DECIDE,
      status_code: CellOperationStatus.SUCCESS,
    });
  }

  /**
   * Track cell explanation generation
   */
  recordExplanation(
    cellId: string,
    cellType: string,
    explanationLength: number,
    clarityScore?: number,
    duration: number
  ): void {
    this.metrics.observeCellProcessingTime(duration, {
      cell_type: cellType,
      operation: CellOperationType.EXPLAIN,
    });

    // Track explanation length
    this.metrics.observeCellComplexity(explanationLength, `${cellType}_explanation_length`);

    // Track clarity if provided
    if (clarityScore !== undefined) {
      this.metrics.observeCellComplexity(clarityScore, `${cellType}_explanation_clarity`);
    }

    this.metrics.incrementCellOperations({
      cell_type: cellType,
      operation: CellOperationType.EXPLAIN,
      status_code: CellOperationStatus.SUCCESS,
    });
  }

  /**
   * Get statistics for a specific cell type
   */
  async getCellTypeStats(cellType: string): Promise<{
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    errorRate: number;
  }> {
    const metrics = this.metrics.getRegistry();
    const metric = metrics.getMetricAs('spreadsheet_cell_operations_total');

    if (!metric) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        errorRate: 0,
      };
    }

    // This would require parsing the metric data
    // For now, return a placeholder
    return {
      totalOperations: 0,
      successRate: 0,
      averageDuration: 0,
      errorRate: 0,
    };
  }

  /**
   * Get error rate by cell type
   */
  getErrorRateByCellType(cellType: string): number {
    // This would require calculating from metrics
    // For now, return a placeholder
    return 0;
  }

  /**
   * Get most common operations by cell type
   */
  getTopOperationsByCellType(cellType: string, limit: number = 5): string[] {
    // This would require analyzing metric data
    // For now, return a placeholder
    return [];
  }

  /**
   * Clear operation timers (useful for cleanup)
   */
  clearOperationTimers(): void {
    this.operationTimers.clear();
  }

  /**
   * Clean up stale operation timers
   */
  cleanupStaleTimers(maxAge: number = 300000): void {
    const now = Date.now();
    for (const [key, startTime] of this.operationTimers.entries()) {
      if (now - startTime > maxAge) {
        this.operationTimers.delete(key);
      }
    }
  }
}

/**
 * Singleton instance of CellMetrics
 */
let cellMetricsInstance: CellMetrics | null = null;

/**
 * Get or create the CellMetrics singleton
 */
export function getCellMetrics(): CellMetrics {
  if (!cellMetricsInstance) {
    cellMetricsInstance = new CellMetrics();
  }
  return cellMetricsInstance;
}

/**
 * Reset the CellMetrics singleton (useful for testing)
 */
export function resetCellMetrics(): void {
  if (cellMetricsInstance) {
    cellMetricsInstance.clearOperationTimers();
  }
  cellMetricsInstance = null;
}
