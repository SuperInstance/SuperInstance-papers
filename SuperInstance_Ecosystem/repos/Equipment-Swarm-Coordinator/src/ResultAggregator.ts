/**
 * ResultAggregator - Aggregates results from multiple agents with
 * conflict detection and resolution.
 */

import type { ExecutionStatus, ConflictResolutionStrategy } from './types';

/**
 * Configuration for result aggregation
 */
export interface AggregationConfig {
  /** Conflict resolution strategy */
  conflictResolution: ConflictResolutionStrategy;
  /** Enable result validation */
  enableValidation: boolean;
  /** Minimum confidence threshold */
  minConfidence: number;
  /** Enable result caching */
  enableCaching: boolean;
  /** Maximum cache size */
  maxCacheSize: number;
  /** Timeout for aggregation in ms */
  timeout: number;
}

/**
 * Aggregated result from multiple agents
 */
export interface AggregatedResult<T = unknown> {
  /** Result identifier */
  resultId: string;
  /** Aggregated value */
  value: T | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Number of agents that contributed */
  agentCount: number;
  /** Agents that contributed */
  contributingAgents: string[];
  /** Detected conflicts */
  conflicts: ConflictReport[];
  /** Aggregation method used */
  method: AggregationMethod;
  /** Timestamp */
  timestamp: Date;
  /** Metadata */
  metadata: ResultMetadata;
}

/**
 * Result from a single agent
 */
export interface AgentResult<T = unknown> {
  /** Agent identifier */
  agentId: string;
  /** Result value */
  value: T;
  /** Confidence score */
  confidence: number;
  /** Execution time in ms */
  executionTime: number;
  /** Result timestamp */
  timestamp: Date;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** Validation errors if any */
  validationErrors?: string[];
}

/**
 * Report of a detected conflict
 */
export interface ConflictReport {
  /** Conflict identifier */
  conflictId: string;
  /** Type of conflict */
  type: ConflictType;
  /** Description of the conflict */
  description: string;
  /** Conflicting results */
  conflictingResults: AgentResult[];
  /** Resolution applied */
  resolution?: ConflictResolution;
  /** Severity (1-5) */
  severity: number;
}

/**
 * Resolution applied to a conflict
 */
export interface ConflictResolution {
  /** Resolution method */
  method: ConflictResolutionStrategy;
  /** Winning value */
  winningValue: unknown;
  /** Winning agent ID */
  winningAgentId: string;
  /** Reason for resolution */
  reason: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Type of conflict detected
 */
export type ConflictType = 
  | 'value'       // Conflicting values
  | 'type'        // Conflicting types
  | 'confidence'  // Low confidence disagreement
  | 'timeout'     // Timeout disagreement
  | 'validation'; // Validation failure

/**
 * Method used for aggregation
 */
export type AggregationMethod = 
  | 'consensus'   // All agents agree
  | 'majority'    // Majority vote
  | 'weighted'    // Weighted by confidence
  | 'hierarchical'// Hierarchical decision
  | 'merged'      // Results merged
  | 'first';      // First valid result

/**
 * Additional metadata for results
 */
export interface ResultMetadata {
  /** Total processing time */
  totalProcessingTime: number;
  /** Number of results received */
  resultsReceived: number;
  /** Number of results discarded */
  resultsDiscarded: number;
  /** Average confidence */
  averageConfidence: number;
  /** Aggregation attempts */
  aggregationAttempts: number;
}

/**
 * ResultAggregator collects, validates, and aggregates results from
 * multiple agents with conflict detection and resolution.
 */
export class ResultAggregator {
  private config: AggregationConfig;
  private resultCache: Map<string, AggregatedResult> = new Map();
  private conflictResolvers: Map<ConflictType, ConflictResolver>;
  private validators: ResultValidator[];

  /**
   * Creates a new ResultAggregator
   * @param config - Configuration options
   */
  constructor(config: Partial<AggregationConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    this.conflictResolvers = this.initializeResolvers();
    this.validators = this.initializeValidators();
  }

  /**
   * Aggregate results from multiple agents
   * @param results - Map of task ID to results from agents
   * @returns Aggregated result
   */
  async aggregate<T>(
    results: Map<string, T>
  ): Promise<AggregatedResult<T>> {
    const startTime = Date.now();
    const agentResults = this.convertToAgentResults(results);
    
    // Validate results if enabled
    if (this.config.enableValidation) {
      this.validateResults(agentResults);
    }

    // Filter by confidence threshold
    const filteredResults = agentResults.filter(
      r => r.confidence >= this.config.minConfidence
    );

    // Detect conflicts
    const conflicts = this.detectConflicts(filteredResults);

    // Resolve conflicts if any
    const resolvedResults = await this.resolveConflicts(filteredResults, conflicts);

    // Aggregate the results
    const aggregated = this.computeAggregation(resolvedResults);

    // Build metadata
    const metadata: ResultMetadata = {
      totalProcessingTime: Date.now() - startTime,
      resultsReceived: results.size,
      resultsDiscarded: agentResults.length - filteredResults.length,
      averageConfidence: this.calculateAverageConfidence(filteredResults),
      aggregationAttempts: 1,
    };

    const finalResult: AggregatedResult<T> = {
      resultId: this.generateId(),
      value: aggregated.value as T,
      confidence: aggregated.confidence,
      agentCount: filteredResults.length,
      contributingAgents: filteredResults.map(r => r.agentId),
      conflicts,
      method: aggregated.method,
      timestamp: new Date(),
      metadata,
    };

    // Cache if enabled
    if (this.config.enableCaching) {
      this.cacheResult(finalResult);
    }

    return finalResult;
  }

  /**
   * Aggregate results from a single task's agent results
   * @param taskId - Task identifier
   * @param results - Results from agents for this task
   * @returns Aggregated result
   */
  async aggregateTaskResults<T>(
    taskId: string,
    results: AgentResult<T>[]
  ): Promise<AggregatedResult<T>> {
    // Convert to map format
    const resultMap = new Map<string, T>();
    const agentResultMap = new Map<string, AgentResult<T>>();
    
    for (const result of results) {
      resultMap.set(result.agentId, result.value);
      agentResultMap.set(result.agentId, result);
    }

    // Validate results
    if (this.config.enableValidation) {
      for (const result of results) {
        const errors = this.validateResult(result);
        result.validationErrors = errors;
      }
    }

    // Filter valid results
    const validResults = results.filter(
      r => (r.validationErrors?.length ?? 0) === 0 && 
           r.confidence >= this.config.minConfidence
    );

    // Detect conflicts
    const conflicts = this.detectConflicts(validResults);

    // Resolve conflicts
    const resolvedResults = await this.resolveConflicts(validResults, conflicts);

    // Compute aggregation
    const aggregated = this.computeAggregation(resolvedResults);

    return {
      resultId: `result-${taskId}`,
      value: aggregated.value as T,
      confidence: aggregated.confidence,
      agentCount: validResults.length,
      contributingAgents: validResults.map(r => r.agentId),
      conflicts,
      method: aggregated.method,
      timestamp: new Date(),
      metadata: {
        totalProcessingTime: 0,
        resultsReceived: results.length,
        resultsDiscarded: results.length - validResults.length,
        averageConfidence: this.calculateAverageConfidence(validResults),
        aggregationAttempts: 1,
      },
    };
  }

  /**
   * Get cached result
   * @param key - Cache key
   * @returns Cached result or undefined
   */
  getCachedResult(key: string): AggregatedResult | undefined {
    return this.resultCache.get(key);
  }

  /**
   * Clear result cache
   */
  clearCache(): void {
    this.resultCache.clear();
  }

  /**
   * Register a custom validator
   * @param validator - Validator function
   */
  registerValidator(validator: ResultValidator): void {
    this.validators.push(validator);
  }

  /**
   * Register a custom conflict resolver
   * @param conflictType - Conflict type to resolve
   * @param resolver - Resolver function
   */
  registerConflictResolver(
    conflictType: ConflictType,
    resolver: ConflictResolver
  ): void {
    this.conflictResolvers.set(conflictType, resolver);
  }

  /**
   * Get aggregation statistics
   * @returns Statistics object
   */
  getStatistics(): AggregatorStatistics {
    return {
      cacheSize: this.resultCache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      averageConfidence: this.calculateOverallAverageConfidence(),
      conflictRate: this.calculateConflictRate(),
    };
  }

  // Private methods

  private mergeWithDefaults(config: Partial<AggregationConfig>): AggregationConfig {
    return {
      conflictResolution: config.conflictResolution ?? 'weighted',
      enableValidation: config.enableValidation ?? true,
      minConfidence: config.minConfidence ?? 0.5,
      enableCaching: config.enableCaching ?? true,
      maxCacheSize: config.maxCacheSize ?? 1000,
      timeout: config.timeout ?? 30000,
    };
  }

  private initializeResolvers(): Map<ConflictType, ConflictResolver> {
    return new Map([
      ['value', this.resolveValueConflict.bind(this)],
      ['type', this.resolveTypeConflict.bind(this)],
      ['confidence', this.resolveConfidenceConflict.bind(this)],
      ['timeout', this.resolveTimeoutConflict.bind(this)],
      ['validation', this.resolveValidationConflict.bind(this)],
    ]);
  }

  private initializeValidators(): ResultValidator[] {
    return [
      this.validateNotNull.bind(this),
      this.validateType.bind(this),
      this.validateSchema.bind(this),
    ];
  }

  private convertToAgentResults<T>(results: Map<string, T>): AgentResult<T>[] {
    const agentResults: AgentResult<T>[] = [];
    
    for (const [agentId, value] of results) {
      agentResults.push({
        agentId,
        value,
        confidence: 1.0,
        executionTime: 0,
        timestamp: new Date(),
        metadata: {},
      });
    }
    
    return agentResults;
  }

  private validateResults(results: AgentResult[]): void {
    for (const result of results) {
      const errors = this.validateResult(result);
      if (errors.length > 0) {
        result.validationErrors = errors;
      }
    }
  }

  private validateResult(result: AgentResult): string[] {
    const errors: string[] = [];
    
    for (const validator of this.validators) {
      const validationErrors = validator(result);
      errors.push(...validationErrors);
    }
    
    return errors;
  }

  private validateNotNull(result: AgentResult): string[] {
    const errors: string[] = [];
    if (result.value === null || result.value === undefined) {
      errors.push('Result value is null or undefined');
    }
    return errors;
  }

  private validateType(result: AgentResult): string[] {
    // Basic type validation
    const errors: string[] = [];
    const valueType = typeof result.value;
    
    if (valueType === 'undefined') {
      errors.push('Result has undefined type');
    }
    
    return errors;
  }

  private validateSchema(result: AgentResult): string[] {
    // Schema validation placeholder
    // In a real implementation, this would validate against a schema
    const errors: string[] = [];
    
    if (result.metadata?.schemaError) {
      errors.push(String(result.metadata.schemaError));
    }
    
    return errors;
  }

  private detectConflicts(results: AgentResult[]): ConflictReport[] {
    const conflicts: ConflictReport[] = [];
    
    if (results.length <= 1) {
      return conflicts;
    }

    // Check for value conflicts
    const values = new Map<unknown, AgentResult[]>();
    
    for (const result of results) {
      const serialized = this.serializeValue(result.value);
      const existing = values.get(serialized) ?? [];
      existing.push(result);
      values.set(serialized, existing);
    }

    // If multiple distinct values exist, we have a conflict
    if (values.size > 1) {
      conflicts.push({
        conflictId: this.generateId(),
        type: 'value',
        description: `Multiple distinct values detected: ${values.size} different values`,
        conflictingResults: Array.from(values.values()).flat(),
        severity: 3,
      });
    }

    // Check for confidence conflicts
    const lowConfidenceResults = results.filter(r => r.confidence < 0.7);
    const highConfidenceResults = results.filter(r => r.confidence >= 0.7);
    
    if (lowConfidenceResults.length > 0 && highConfidenceResults.length > 0) {
      conflicts.push({
        conflictId: this.generateId(),
        type: 'confidence',
        description: 'Mixed confidence levels in results',
        conflictingResults: results,
        severity: 2,
      });
    }

    return conflicts;
  }

  private async resolveConflicts<T>(
    results: AgentResult<T>[],
    conflicts: ConflictReport[]
  ): Promise<AgentResult<T>[]> {
    if (conflicts.length === 0) {
      return results;
    }

    const resolvedResults = [...results];

    for (const conflict of conflicts) {
      const resolver = this.conflictResolvers.get(conflict.type);
      if (resolver) {
        const resolution = await resolver(conflict);
        conflict.resolution = resolution;
        
        // Apply resolution
        if (resolution.winningAgentId) {
          // Keep only the winning result
          const index = resolvedResults.findIndex(r => r.agentId === resolution.winningAgentId);
          if (index !== -1) {
            resolvedResults[index]!.confidence = Math.min(1, resolvedResults[index]!.confidence * 1.1);
          }
        }
      }
    }

    return resolvedResults;
  }

  private async resolveValueConflict(conflict: ConflictReport): Promise<ConflictResolution> {
    const results = conflict.conflictingResults;
    
    switch (this.config.conflictResolution) {
      case 'voting':
        return this.resolveByVoting(conflict);
      case 'weighted':
        return this.resolveByWeight(conflict);
      case 'hierarchical':
        return this.resolveByHierarchy(conflict);
      case 'consensus':
        return this.resolveByConsensus(conflict);
      default:
        return this.resolveByWeight(conflict);
    }
  }

  private async resolveTypeConflict(conflict: ConflictReport): Promise<ConflictResolution> {
    // Prefer the most common type
    const typeCounts = new Map<string, number>();
    
    for (const result of conflict.conflictingResults) {
      const type = typeof result.value;
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    }
    
    let winningType = 'object';
    let maxCount = 0;
    
    for (const [type, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        winningType = type;
      }
    }
    
    const winner = conflict.conflictingResults.find(r => typeof r.value === winningType);
    
    return {
      method: 'majority',
      winningValue: winner?.value,
      winningAgentId: winner?.agentId ?? '',
      reason: `Type ${winningType} is most common (${maxCount} occurrences)`,
      timestamp: new Date(),
    };
  }

  private async resolveConfidenceConflict(conflict: ConflictReport): Promise<ConflictResolution> {
    // Sort by confidence descending
    const sorted = [...conflict.conflictingResults].sort((a, b) => b.confidence - a.confidence);
    const winner = sorted[0];
    
    return {
      method: 'weighted',
      winningValue: winner?.value,
      winningAgentId: winner?.agentId ?? '',
      reason: `Highest confidence: ${winner?.confidence}`,
      timestamp: new Date(),
    };
  }

  private async resolveTimeoutConflict(conflict: ConflictReport): Promise<ConflictResolution> {
    // Prefer fastest result
    const sorted = [...conflict.conflictingResults].sort((a, b) => a.executionTime - b.executionTime);
    const winner = sorted[0];
    
    return {
      method: 'first',
      winningValue: winner?.value,
      winningAgentId: winner?.agentId ?? '',
      reason: `Fastest execution: ${winner?.executionTime}ms`,
      timestamp: new Date(),
    };
  }

  private async resolveValidationConflict(conflict: ConflictReport): Promise<ConflictResolution> {
    // Prefer result with no validation errors
    const valid = conflict.conflictingResults.find(r => 
      (r.validationErrors?.length ?? 0) === 0
    );
    
    if (valid) {
      return {
        method: 'hierarchical',
        winningValue: valid.value,
        winningAgentId: valid.agentId,
        reason: 'No validation errors',
        timestamp: new Date(),
      };
    }
    
    // If all have errors, pick one with least errors
    const sorted = [...conflict.conflictingResults].sort((a, b) => 
      (a.validationErrors?.length ?? 0) - (b.validationErrors?.length ?? 0)
    );
    
    const best = sorted[0]!;
    
    return {
      method: 'hierarchical',
      winningValue: best.value,
      winningAgentId: best.agentId,
      reason: `Least validation errors: ${best.validationErrors?.length ?? 0}`,
      timestamp: new Date(),
    };
  }

  private resolveByVoting(conflict: ConflictReport): ConflictResolution {
    const voteCounts = new Map<unknown, { count: number; agentId: string }>();
    
    for (const result of conflict.conflictingResults) {
      const serialized = this.serializeValue(result.value);
      const existing = voteCounts.get(serialized);
      
      if (existing) {
        existing.count++;
      } else {
        voteCounts.set(serialized, { count: 1, agentId: result.agentId });
      }
    }
    
    let winner: { count: number; agentId: string } | null = null;
    
    for (const [, data] of voteCounts) {
      if (!winner || data.count > winner.count) {
        winner = data;
      }
    }
    
    const winningResult = conflict.conflictingResults.find(r => r.agentId === winner?.agentId);
    
    return {
      method: 'voting',
      winningValue: winningResult?.value,
      winningAgentId: winner?.agentId ?? '',
      reason: `Won by majority vote: ${winner?.count} votes`,
      timestamp: new Date(),
    };
  }

  private resolveByWeight(conflict: ConflictReport): ConflictResolution {
    // Weight by confidence
    let maxWeight = 0;
    let winner: AgentResult | null = null;
    
    for (const result of conflict.conflictingResults) {
      const weight = result.confidence;
      if (weight > maxWeight) {
        maxWeight = weight;
        winner = result;
      }
    }
    
    return {
      method: 'weighted',
      winningValue: winner?.value,
      winningAgentId: winner?.agentId ?? '',
      reason: `Highest weighted confidence: ${maxWeight}`,
      timestamp: new Date(),
    };
  }

  private resolveByHierarchy(conflict: ConflictReport): ConflictResolution {
    // In a real implementation, this would consider agent hierarchy
    // For now, fall back to confidence-based resolution
    return this.resolveByWeight(conflict);
  }

  private resolveByConsensus(conflict: ConflictReport): ConflictResolution {
    // Try to find a consensus value
    // If all values are similar enough, use the average or merged value
    
    const results = conflict.conflictingResults;
    
    // For numeric values, compute average
    if (results.every(r => typeof r.value === 'number')) {
      const avg = results.reduce((sum, r) => sum + (r.value as number), 0) / results.length;
      
      return {
        method: 'consensus',
        winningValue: avg,
        winningAgentId: 'consensus',
        reason: 'Computed average of numeric values',
        timestamp: new Date(),
      };
    }
    
    // For arrays, merge unique values
    if (results.every(r => Array.isArray(r.value))) {
      const merged = [...new Set(results.flatMap(r => r.value as unknown[]))];
      
      return {
        method: 'merged',
        winningValue: merged,
        winningAgentId: 'consensus',
        reason: 'Merged array values',
        timestamp: new Date(),
      };
    }
    
    // Fall back to voting
    return this.resolveByVoting(conflict);
  }

  private computeAggregation<T>(results: AgentResult<T>[]): { value: T | null; confidence: number; method: AggregationMethod } {
    if (results.length === 0) {
      return { value: null, confidence: 0, method: 'consensus' };
    }
    
    if (results.length === 1) {
      return { 
        value: results[0]!.value, 
        confidence: results[0]!.confidence,
        method: 'first'
      };
    }
    
    // Check if all values are the same
    const firstValue = this.serializeValue(results[0]!.value);
    const allSame = results.every(r => this.serializeValue(r.value) === firstValue);
    
    if (allSame) {
      return {
        value: results[0]!.value,
        confidence: this.calculateAverageConfidence(results),
        method: 'consensus',
      };
    }
    
    // Use weighted average for numeric values
    if (results.every(r => typeof r.value === 'number')) {
      const weightedSum = results.reduce((sum, r) => sum + (r.value as number) * r.confidence, 0);
      const totalWeight = results.reduce((sum, r) => sum + r.confidence, 0);
      
      return {
        value: (weightedSum / totalWeight) as T,
        confidence: totalWeight / results.length,
        method: 'weighted',
      };
    }
    
    // Return highest confidence result
    const sorted = [...results].sort((a, b) => b.confidence - a.confidence);
    
    return {
      value: sorted[0]!.value,
      confidence: sorted[0]!.confidence,
      method: 'weighted',
    };
  }

  private serializeValue(value: unknown): string {
    return JSON.stringify(value);
  }

  private calculateAverageConfidence(results: AgentResult[]): number {
    if (results.length === 0) return 0;
    return results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  }

  private cacheResult(result: AggregatedResult): void {
    if (this.resultCache.size >= this.config.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.resultCache.keys().next().value;
      if (firstKey) {
        this.resultCache.delete(firstKey);
      }
    }
    
    this.resultCache.set(result.resultId, result);
  }

  private calculateCacheHitRate(): number {
    // Placeholder - would track actual hits/misses
    return 0.8;
  }

  private calculateOverallAverageConfidence(): number {
    if (this.resultCache.size === 0) return 0;
    
    let total = 0;
    for (const result of this.resultCache.values()) {
      total += result.confidence;
    }
    
    return total / this.resultCache.size;
  }

  private calculateConflictRate(): number {
    if (this.resultCache.size === 0) return 0;
    
    let totalConflicts = 0;
    for (const result of this.resultCache.values()) {
      totalConflicts += result.conflicts.length;
    }
    
    return totalConflicts / this.resultCache.size;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Conflict resolver function type
 */
type ConflictResolver = (conflict: ConflictReport) => Promise<ConflictResolution>;

/**
 * Result validator function type
 */
type ResultValidator = (result: AgentResult) => string[];

/**
 * Statistics about the aggregator
 */
interface AggregatorStatistics {
  cacheSize: number;
  cacheHitRate: number;
  averageConfidence: number;
  conflictRate: number;
}
