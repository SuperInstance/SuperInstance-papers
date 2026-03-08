/**
 * POLLN Bytecode Bridge Types
 *
 * Phase 4 Sprint 1: Bytecode compilation for stable agent pathways
 * Provides 100-1000x speedup for frequently executed agent patterns
 */

import type { A2APackage } from '../types.js';

// ============================================================================
// Bytecode Instruction Set
// ============================================================================

/**
 * Bytecode opcodes for pathway compilation
 * Organized by functional category
 */
export enum Opcode {
  // Agent Operations (0x01-0x0F)
  INVOKE_AGENT = 0x01,
  PASS_MESSAGE = 0x02,
  AWAIT_RESPONSE = 0x03,
  CHAIN_AGENTS = 0x04,

  // Control Flow (0x10-0x1F)
  CONDITIONAL_BRANCH = 0x10,
  LOOP = 0x11,
  PARALLEL = 0x12,
  SEQUENCE = 0x13,
  JUMP = 0x14,

  // Data Operations (0x20-0x2F)
  LOAD_CONST = 0x20,
  STORE_VAR = 0x21,
  LOAD_VAR = 0x22,
  MERGE_CONTEXT = 0x23,
  SPLIT_CONTEXT = 0x24,

  // Plinko Integration (0x30-0x3F)
  STOCHASTIC_SELECT = 0x30,
  UPDATE_WEIGHTS = 0x31,
  SAMPLE_PROPOSAL = 0x32,
  APPLY_TEMPERATURE = 0x33,

  // Safety Integration (0x40-0x4F)
  CHECK_CONSTRAINT = 0x40,
  ABORT_IF_VIOLATION = 0x41,
  EMERGENCY_STOP = 0x42,
  LOG_AUDIT = 0x43,

  // KV-Cache Operations (0x50-0x5F)
  LOAD_ANCHOR = 0x50,
  STORE_ANCHOR = 0x51,
  REUSE_CONTEXT = 0x52,

  // Meta Operations (0x60-0x6F)
  YIELD = 0x60,
  RESUME = 0x61,
  SPAWN_TASK = 0x62,
  AWAIT_TASK = 0x63,

  // Telemetry (0x70-0x7F)
  METRIC_START = 0x70,
  METRIC_END = 0x71,
  TRACE_POINT = 0x72,
}

/**
 * Single bytecode instruction
 */
export interface BytecodeInstruction {
  opcode: Opcode;
  operands: number[];
  metadata?: Record<string, unknown>;
}

/**
 * Compiled pathway representation
 */
export interface CompiledPathway {
  id: string;
  bytecode: BytecodeInstruction[];
  signature: string; // Cryptographic signature for integrity
  sourceHash: string; // Hash of original pathway
  stabilityScore: number; // 0-1, must be >0.95 for compilation
  compiledAt: number;
  metadata: {
    agentCount: number;
    avgLatencyMs: number;
    invocationCount: number;
    optimizationLevel: 'basic' | 'optimized' | 'aggressive';
  };
}

// ============================================================================
// Pathway Analysis Types
// ============================================================================

/**
 * Analysis of a potential pathway for compilation
 */
export interface PathwayAnalysis {
  id: string;
  agentSequence: string[];
  variance: number; // Measure of agent selection variance
  stabilityScore: number; // 0-1, higher is more stable
  invocationCount: number;
  avgLatencyMs: number;
  isCandidate: boolean; // stabilityScore > 0.95 && invocationCount > 100
  lastInvoked: number;
}

/**
 * Execution trace for pathway analysis
 */
export interface PathwayTrace {
  id: string;
  timestamp: number;
  agentSequence: string[];
  latencies: number[];
  a2aPackages: string[]; // Package IDs for traceability
  contextHash: string;
  outcome: 'success' | 'failure' | 'timeout';
}

/**
 * Pathway execution statistics
 */
export interface PathwayStats {
  pathwayId: string;
  totalInvocations: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  lastExecuted: number;
  stabilityScore: number;
}

// ============================================================================
// Compilation Types
// ============================================================================

/**
 * Configuration for pathway compilation
 */
export interface CompilationConfig {
  minStabilityScore: number; // Default: 0.95
  minInvocations: number; // Default: 100
  optimizationLevel: 'basic' | 'optimized' | 'aggressive';
  enableSandbox: boolean;
  signatureRequired: boolean;
}

/**
 * Result of pathway compilation
 */
export interface CompilationResult {
  success: boolean;
  pathwayId: string;
  compiledPathway?: CompiledPathway;
  error?: string;
  compilationTimeMs: number;
  bytecodeSize: number;
  estimatedSpeedup: number;
}

/**
 * Decompilation context for when pathway needs to be re-interpreted
 */
export interface DecompilationContext {
  reason: 'context_change' | 'safety_violation' | 'explicit_request';
  timestamp: number;
  originalPathway: PathwayAnalysis;
}

// ============================================================================
// Execution Types
// ============================================================================

/**
 * Execution context for bytecode
 */
export interface ExecutionContext {
  pathwayId: string;
  variables: Map<string, unknown>;
  callStack: string[];
  a2aPackageTrace: string[]; // Parent package IDs
  startTime: number;
  timeout?: number;
  sandbox: boolean;
}

/**
 * Result of bytecode execution
 */
export interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  executionTimeMs: number;
  bytecodeInstructions: number;
  a2aPackages: string[]; // Generated package IDs
  fallbackMode: boolean;
  safetyViolations: string[];
}

/**
 * Sandbox configuration for bytecode execution
 */
export interface SandboxConfig {
  maxExecutionTimeMs: number;
  maxMemoryMB: number;
  maxInstructions: number;
  allowNetworkAccess: boolean;
  allowFileAccess: boolean;
}

// ============================================================================
// Cache and Optimization Types
// ============================================================================

/**
 * Cache entry for compiled pathways
 */
export interface PathwayCacheEntry {
  pathwayId: string;
  compiledPathway: CompiledPathway;
  hitCount: number;
  lastHit: number;
  createdAt: number;
  validUntil: number;
}

/**
 * Optimization pass configuration
 */
export interface OptimizationPass {
  name: string;
  description: string;
  enabled: boolean;
  apply: (bytecode: BytecodeInstruction[]) => BytecodeInstruction[];
}

// ============================================================================
// Monitoring and Telemetry Types
// ============================================================================

/**
 * Performance metrics for bytecode execution
 */
export interface BytecodeMetrics {
  pathwayId: string;
  interpreterTimeMs: number;
  bytecodeTimeMs: number;
  speedup: number;
  memoryUsageMB: number;
  instructionCount: number;
  cacheHitRate: number;
}

/**
 * Telemetry data for monitoring
 */
export interface BytecodeTelemetry {
  totalPathwaysCompiled: number;
  totalExecutions: number;
  avgSpeedup: number;
  cacheHitRate: number;
  memoryUsageMB: number;
  activePathways: number;
  lastUpdated: number;
}

// ============================================================================
// Integration Types
// ============================================================================

/**
 * Bridge configuration for integrating with colony system
 */
export interface BytecodeBridgeConfig {
  compilation: CompilationConfig;
  sandbox: SandboxConfig;
  enableTelemetry: boolean;
  autoCompileThreshold: number; // Auto-compile stable pathways
  cacheSize: number;
}

/**
 * Safety constraint check for bytecode
 */
export interface BytecodeSafetyCheck {
  constraintId: string;
  check: (context: ExecutionContext) => Promise<boolean>;
  onFailure: 'abort' | 'warn' | 'log';
}

/**
 * Plinko integration for bytecode stochastic selection
 */
export interface BytecodePlinkoConfig {
  enabled: boolean;
  temperature: number;
  seedForDeterminism: boolean;
}
