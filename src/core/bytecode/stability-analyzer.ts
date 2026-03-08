/**
 * POLLN Bytecode Stability Analyzer
 *
 * Analyzes agent pathways for stability to identify candidates for compilation.
 * Only stable pathways (stability > 0.95, invocations > 100) are compiled.
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import type {
  PathwayAnalysis,
  PathwayTrace,
  PathwayStats,
  CompilationConfig,
} from './types.js';

/**
 * StabilityAnalyzer - Identifies stable pathways for bytecode compilation
 *
 * Key metrics:
 * - Stability Score: 0-1, higher is more stable (agent selection consistency)
 * - Variance: Measure of agent selection variance
 * - Invocation Count: Must exceed threshold for compilation
 *
 * Compilation eligibility:
 * - stabilityScore > 0.95 (95% consistent agent selection)
 * - invocationCount > 100 (sufficient sample size)
 */
export class StabilityAnalyzer {
  private traces: Map<string, PathwayTrace[]> = new Map();
  private stats: Map<string, PathwayStats> = new Map();
  private analyses: Map<string, PathwayAnalysis> = new Map();
  private config: CompilationConfig;

  // Configuration defaults
  private static readonly DEFAULT_CONFIG: CompilationConfig = {
    minStabilityScore: 0.95,
    minInvocations: 100,
    optimizationLevel: 'optimized',
    enableSandbox: true,
    signatureRequired: true,
  };

  constructor(config?: Partial<CompilationConfig>) {
    this.config = {
      ...StabilityAnalyzer.DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Record a pathway execution trace
   */
  recordTrace(trace: PathwayTrace): void {
    const pathwayId = this.computePathwayId(trace.agentSequence);

    if (!this.traces.has(pathwayId)) {
      this.traces.set(pathwayId, []);
    }

    this.traces.get(pathwayId)!.push(trace);

    // Update stats
    this.updateStats(pathwayId, trace);

    // Analyze stability
    this.analyzePathway(pathwayId);
  }

  /**
   * Compute pathway ID from agent sequence
   * Uses hash of agent sequence for consistent identification
   */
  private computePathwayId(agentSequence: string[]): string {
    const sequenceStr = agentSequence.join('->');
    return crypto.createHash('sha256').update(sequenceStr).digest('hex');
  }

  /**
   * Update pathway statistics from a trace
   */
  private updateStats(pathwayId: string, trace: PathwayTrace): void {
    const existing = this.stats.get(pathwayId);

    if (!existing) {
      this.stats.set(pathwayId, {
        pathwayId,
        totalInvocations: 1,
        successCount: trace.outcome === 'success' ? 1 : 0,
        failureCount: trace.outcome === 'failure' ? 1 : 0,
        avgLatencyMs: trace.latencies.reduce((a, b) => a + b, 0),
        minLatencyMs: Math.min(...trace.latencies),
        maxLatencyMs: Math.max(...trace.latencies),
        lastExecuted: trace.timestamp,
        stabilityScore: 0,
      });
      return;
    }

    const avgLatency =
      (existing.avgLatencyMs * existing.totalInvocations +
        trace.latencies.reduce((a, b) => a + b, 0)) /
      (existing.totalInvocations + 1);

    this.stats.set(pathwayId, {
      ...existing,
      totalInvocations: existing.totalInvocations + 1,
      successCount:
        existing.successCount + (trace.outcome === 'success' ? 1 : 0),
      failureCount:
        existing.failureCount + (trace.outcome === 'failure' ? 1 : 0),
      avgLatencyMs: avgLatency,
      minLatencyMs: Math.min(existing.minLatencyMs, ...trace.latencies),
      maxLatencyMs: Math.max(existing.maxLatencyMs, ...trace.latencies),
      lastExecuted: trace.timestamp,
    });
  }

  /**
   * Analyze pathway stability
   *
   * Stability measures how consistently the same agent sequence is selected
   * for the same context hash. Higher stability = better compilation candidate.
   */
  private analyzePathway(pathwayId: string): void {
    const pathwayTraces = this.traces.get(pathwayId);
    const stats = this.stats.get(pathwayId);

    if (!pathwayTraces || !stats || pathwayTraces.length < 2) {
      return;
    }

    // Calculate variance in agent selection
    const variance = this.calculateVariance(pathwayTraces);

    // Calculate stability score (inverse of variance, normalized to 0-1)
    const stabilityScore = Math.max(0, 1 - variance);

    // Determine if candidate for compilation
    const isCandidate =
      stabilityScore >= this.config.minStabilityScore &&
      stats.totalInvocations >= this.config.minInvocations;

    const analysis: PathwayAnalysis = {
      id: pathwayId,
      agentSequence: pathwayTraces[0].agentSequence,
      variance,
      stabilityScore,
      invocationCount: stats.totalInvocations,
      avgLatencyMs: stats.avgLatencyMs,
      isCandidate,
      lastInvoked: stats.lastExecuted,
    };

    this.analyses.set(pathwayId, analysis);
  }

  /**
   * Calculate variance in agent selection
   *
   * Measures how much the agent sequence varies across executions.
   * Lower variance = more stable pathway.
   */
  private calculateVariance(traces: PathwayTrace[]): number {
    if (traces.length === 0) return 1;

    // Group traces by agent sequence
    const sequenceGroups = new Map<string, number>();

    for (const trace of traces) {
      const sequenceStr = trace.agentSequence.join('->');
      sequenceGroups.set(
        sequenceStr,
        (sequenceGroups.get(sequenceStr) || 0) + 1
      );
    }

    // Calculate dominant sequence frequency
    const dominantCount = Math.max(...Array.from(sequenceGroups.values()));
    const dominantRatio = dominantCount / traces.length;

    // Variance is inverse of dominant ratio
    // If all traces use same sequence: variance = 0
    // If traces use different sequences: variance approaches 1
    return 1 - dominantRatio;
  }

  /**
   * Get pathway analysis
   */
  getAnalysis(pathwayId: string): PathwayAnalysis | undefined {
    return this.analyses.get(pathwayId);
  }

  /**
   * Get all pathway analyses
   */
  getAllAnalyses(): PathwayAnalysis[] {
    return Array.from(this.analyses.values());
  }

  /**
   * Get candidate pathways for compilation
   */
  getCandidates(): PathwayAnalysis[] {
    return this.getAllAnalyses().filter((a) => a.isCandidate);
  }

  /**
   * Get pathway statistics
   */
  getStats(pathwayId: string): PathwayStats | undefined {
    return this.stats.get(pathwayId);
  }

  /**
   * Get all pathway statistics
   */
  getAllStats(): PathwayStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get top N pathways by invocation count
   */
  getTopPathways(n: number): PathwayAnalysis[] {
    return this.getAllAnalyses()
      .sort((a, b) => b.invocationCount - a.invocationCount)
      .slice(0, n);
  }

  /**
   * Get top N pathways by stability score
   */
  getMostStablePathways(n: number): PathwayAnalysis[] {
    return this.getAllAnalyses()
      .filter((a) => a.invocationCount >= this.config.minInvocations)
      .sort((a, b) => b.stabilityScore - a.stabilityScore)
      .slice(0, n);
  }

  /**
   * Get pathway traces
   */
  getTraces(pathwayId: string): PathwayTrace[] {
    return this.traces.get(pathwayId) || [];
  }

  /**
   * Clear old traces to manage memory
   */
  clearOldTraces(olderThanMs: number): void {
    const cutoff = Date.now() - olderThanMs;

    for (const [pathwayId, traces] of Array.from(this.traces.entries())) {
      const filtered = traces.filter((t) => t.timestamp >= cutoff);

      if (filtered.length === 0) {
        this.traces.delete(pathwayId);
        this.stats.delete(pathwayId);
        this.analyses.delete(pathwayId);
      } else if (filtered.length !== traces.length) {
        this.traces.set(pathwayId, filtered);

        // Recalculate stats
        const recalcStats = this.recalculateStats(filtered);
        this.stats.set(pathwayId, recalcStats);

        // Re-analyze
        this.analyzePathway(pathwayId);
      }
    }
  }

  /**
   * Recalculate statistics from filtered traces
   */
  private recalculateStats(traces: PathwayTrace[]): PathwayStats {
    const successCount = traces.filter((t) => t.outcome === 'success').length;
    const failureCount = traces.filter((t) => t.outcome === 'failure').length;
    const allLatencies = traces.flatMap((t) => t.latencies);

    return {
      pathwayId: '', // Will be set by caller
      totalInvocations: traces.length,
      successCount,
      failureCount,
      avgLatencyMs:
        allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length,
      minLatencyMs: Math.min(...allLatencies),
      maxLatencyMs: Math.max(...allLatencies),
      lastExecuted: Math.max(...traces.map((t) => t.timestamp)),
      stabilityScore: 0, // Will be recalculated
    };
  }

  /**
   * Reset analyzer state
   */
  reset(): void {
    this.traces.clear();
    this.stats.clear();
    this.analyses.clear();
  }

  /**
   * Get analyzer statistics
   */
  getAnalyzerStats(): {
    totalPathways: number;
    totalTraces: number;
    candidateCount: number;
    avgStabilityScore: number;
  } {
    const analyses = this.getAllAnalyses();
    const totalTraces = Array.from(this.traces.values()).reduce(
      (sum, traces) => sum + traces.length,
      0
    );

    const avgStabilityScore =
      analyses.length > 0
        ? analyses.reduce((sum, a) => sum + a.stabilityScore, 0) /
          analyses.length
        : 0;

    return {
      totalPathways: analyses.length,
      totalTraces,
      candidateCount: this.getCandidates().length,
      avgStabilityScore,
    };
  }
}
