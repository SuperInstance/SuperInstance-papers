/**
 * POLLN Bytecode Bridge - Main Export
 *
 * Phase 4 Sprint 1: Bytecode compilation for stable agent pathways
 * Provides 100-1000x speedup for frequently executed agent patterns
 *
 * Components:
 * - StabilityAnalyzer: Identifies stable pathways for compilation
 * - BytecodeCompiler: Compiles pathways to optimized bytecode
 * - BytecodeExecutor: Executes bytecode in secure sandbox
 */

// ============================================================================
// Types
// ============================================================================

export * from './types.js';

// ============================================================================
// Core Components
// ============================================================================

export { StabilityAnalyzer } from './stability-analyzer.js';
export { BytecodeCompiler } from './compiler.js';
export { BytecodeExecutor } from './executor.js';

// ============================================================================
// Integration Layer
// ============================================================================

import { StabilityAnalyzer } from './stability-analyzer.js';
import { BytecodeCompiler } from './compiler.js';
import { BytecodeExecutor } from './executor.js';
import type {
  BytecodeBridgeConfig,
  PathwayAnalysis,
  CompiledPathway,
  PathwayTrace,
  ExecutionResult,
  BytecodeTelemetry,
} from './types.js';

/**
 * BytecodeBridge - Main integration point for bytecode system
 *
 * Orchestrates stability analysis, compilation, and execution.
 * Provides unified interface for colony integration.
 */
export class BytecodeBridge {
  private analyzer: StabilityAnalyzer;
  private compiler: BytecodeCompiler;
  private executor: BytecodeExecutor;
  private config: BytecodeBridgeConfig;
  private pathwayCache: Map<string, CompiledPathway> = new Map();
  private telemetry: BytecodeTelemetry;

  // Default configuration
  private static readonly DEFAULT_CONFIG: BytecodeBridgeConfig = {
    compilation: {
      minStabilityScore: 0.95,
      minInvocations: 100,
      optimizationLevel: 'optimized',
      enableSandbox: true,
      signatureRequired: true,
    },
    sandbox: {
      maxExecutionTimeMs: 30000,
      maxMemoryMB: 512,
      maxInstructions: 100000,
      allowNetworkAccess: false,
      allowFileAccess: false,
    },
    enableTelemetry: true,
    autoCompileThreshold: 100,
    cacheSize: 1000,
  };

  constructor(config?: Partial<BytecodeBridgeConfig>) {
    this.config = {
      ...BytecodeBridge.DEFAULT_CONFIG,
      ...config,
    };

    this.analyzer = new StabilityAnalyzer(this.config.compilation);
    this.compiler = new BytecodeCompiler(this.config.compilation);
    this.executor = new BytecodeExecutor(this.config.sandbox);

    this.telemetry = {
      totalPathwaysCompiled: 0,
      totalExecutions: 0,
      avgSpeedup: 0,
      cacheHitRate: 0,
      memoryUsageMB: 0,
      activePathways: 0,
      lastUpdated: Date.now(),
    };

    // Set up auto-compilation if enabled
    if (this.config.autoCompileThreshold > 0) {
      this.startAutoCompilation();
    }
  }

  /**
   * Record pathway execution trace for stability analysis
   */
  recordTrace(trace: PathwayTrace): void {
    this.analyzer.recordTrace(trace);

    // Auto-compile if threshold reached
    if (this.config.autoCompileThreshold > 0) {
      const pathwayId = this.analyzer
        .getAllAnalyses()
        .find((a) => a.invocationCount >= this.config.autoCompileThreshold)?.id;

      if (pathwayId && !this.pathwayCache.has(pathwayId)) {
        this.compilePathway(pathwayId);
      }
    }

    this.updateTelemetry();
  }

  /**
   * Compile a pathway to bytecode
   */
  async compilePathway(pathwayId: string): Promise<boolean> {
    const analysis = this.analyzer.getAnalysis(pathwayId);
    if (!analysis || !analysis.isCandidate) {
      return false;
    }

    const result = await this.compiler.compile(analysis);

    if (result.success && result.compiledPathway) {
      this.pathwayCache.set(pathwayId, result.compiledPathway);
      this.telemetry.totalPathwaysCompiled++;
      this.updateTelemetry();
      return true;
    }

    return false;
  }

  /**
   * Execute compiled pathway
   */
  async executePathway(
    pathwayId: string,
    context?: Partial<import('./types.js').ExecutionContext>
  ): Promise<ExecutionResult> {
    const compiled = this.pathwayCache.get(pathwayId);

    if (!compiled) {
      return {
        success: false,
        error: 'Pathway not compiled',
        executionTimeMs: 0,
        bytecodeInstructions: 0,
        a2aPackages: [],
        fallbackMode: true,
        safetyViolations: [],
      };
    }

    const result = await this.executor.execute(compiled, context);

    this.telemetry.totalExecutions++;
    this.updateTelemetry();

    return result;
  }

  /**
   * Get candidate pathways for compilation
   */
  getCandidates(): PathwayAnalysis[] {
    return this.analyzer.getCandidates();
  }

  /**
   * Get all compiled pathways
   */
  getCompiledPathways(): CompiledPathway[] {
    return Array.from(this.pathwayCache.values());
  }

  /**
   * Get telemetry data
   */
  getTelemetry(): BytecodeTelemetry {
    return { ...this.telemetry };
  }

  /**
   * Get analyzer statistics
   */
  getAnalyzerStats() {
    return this.analyzer.getAnalyzerStats();
  }

  /**
   * Get compiler statistics
   */
  getCompilerStats() {
    return this.compiler.getCompilerStats();
  }

  /**
   * Get executor statistics
   */
  getExecutorStats() {
    return this.executor.getExecutorStats();
  }

  /**
   * Auto-compile stable pathways
   */
  private startAutoCompilation(): void {
    // Check periodically for compilation candidates
    setInterval(() => {
      const candidates = this.analyzer.getCandidates();

      for (const candidate of candidates) {
        if (!this.pathwayCache.has(candidate.id)) {
          this.compilePathway(candidate.id);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Update telemetry data
   */
  private updateTelemetry(): void {
    this.telemetry.activePathways = this.pathwayCache.size;
    this.telemetry.lastUpdated = Date.now();

    // Calculate cache hit rate
    const stats = this.executor.getExecutorStats();
    this.telemetry.cacheHitRate =
      stats.totalExecutions > 0
        ? (stats.totalExecutions - this.telemetry.totalExecutions) /
          stats.totalExecutions
        : 0;

    // Calculate memory usage (approximation)
    this.telemetry.memoryUsageMB =
      this.pathwayCache.size * 0.5 + // Each pathway ~0.5MB
      this.analyzer.getAllAnalyses().length * 0.1; // Each analysis ~0.1MB
  }

  /**
   * Clear pathway cache
   */
  clearCache(): void {
    this.pathwayCache.clear();
    this.updateTelemetry();
  }

  /**
   * Remove expired pathways from cache
   */
  removeExpiredPathways(olderThanMs: number): number {
    const cutoff = Date.now() - olderThanMs;
    let removed = 0;

    for (const [pathwayId, compiled] of Array.from(this.pathwayCache.entries())) {
      if (compiled.compiledAt < cutoff) {
        this.pathwayCache.delete(pathwayId);
        removed++;
      }
    }

    this.updateTelemetry();
    return removed;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.analyzer.reset();
    this.compiler.clearCompiledPathways();
    this.pathwayCache.clear();
    this.telemetry = {
      totalPathwaysCompiled: 0,
      totalExecutions: 0,
      avgSpeedup: 0,
      cacheHitRate: 0,
      memoryUsageMB: 0,
      activePathways: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BytecodeBridgeConfig>): void {
    this.config = { ...this.config, ...config };

    // Update sub-components
    if (config.compilation) {
      this.compiler.updateConfig(config.compilation);
    }

    if (config.sandbox) {
      this.executor.updateSandboxConfig(config.sandbox);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): BytecodeBridgeConfig {
    return { ...this.config };
  }
}

/**
 * Create a bytecode bridge with default configuration
 */
export function createBytecodeBridge(
  config?: Partial<BytecodeBridgeConfig>
): BytecodeBridge {
  return new BytecodeBridge(config);
}
