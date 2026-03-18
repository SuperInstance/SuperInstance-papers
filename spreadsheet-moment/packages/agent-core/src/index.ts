/**
 * SpreadsheetMoment Agent Core Package
 *
 * This package provides the core agentic functionality for SpreadsheetMoment:
 * - Agent Cell Model: Extended cell data structure with agentic properties
 * - Agent Cell Types: SENSOR, ANALYZER, CONTROLLER, ORCHESTRATOR
 * - Agent Cell States: DORMANT, THINKING, NEEDS_REVIEW, POSTED, ARCHIVED, ERROR
 * - Trace Protocol: Recursive loop detection and prevention
 * - State Manager: State transition logic and validation
 * - Claw API: Production-ready Claw API integration
 * - Monitoring: Comprehensive metrics and health checking
 *
 * @packageDocumentation
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Agent cell types determine the behavior and purpose of each agent cell
 */
export enum AgentCellType {
  /** SENSOR cells observe and collect data from other cells or external sources */
  SENSOR = 'SENSOR',

  /** ANALYZER cells process data and generate insights */
  ANALYZER = 'ANALYZER',

  /** CONTROLLER cells take actions and modify other cells */
  CONTROLLER = 'CONTROLLER',

  /** ORCHESTRATOR cells coordinate multiple agents and manage complex workflows */
  ORCHESTRATOR = 'ORCHESTRATOR'
}

/**
 * Agent cell states track the lifecycle and status of agent operations
 */
export enum AgentCellState {
  /** Cell is dormant and awaiting activation */
  DORMANT = 'DORMANT',

  /** Cell is actively processing and reasoning */
  THINKING = 'THINKING',

  /** Cell has completed reasoning and awaits human approval */
  NEEDS_REVIEW = 'NEEDS_REVIEW',

  /** Cell's action has been approved and executed */
  POSTED = 'POSTED',

  /** Cell is archived and no longer active */
  ARCHIVED = 'ARCHIVED',

  /** Cell encountered an error during execution */
  ERROR = 'ERROR'
}

/**
 * Extended cell data interface for agent cells
 * Builds upon Univer's ICellData with agentic properties
 */
export interface IAgentCellData {
  // Base Univer cell properties
  v?: string | number;
  f?: string;
  s?: any; // ISheetStyle from Univer

  // Agentic extensions
  /** Unique origin identifier for Origin-Centric Design */
  origin_id?: string;

  /** Current trace ID for operation tracking */
  trace_id?: string;

  /** Type of agent cell */
  cell_type?: AgentCellType;

  /** Current state of the agent */
  state?: AgentCellState;

  /** Step-by-step reasoning history */
  reasoning?: string[];

  /** Persistent memory for learning and context */
  memory?: string[];

  /** Whether this action requires human approval before execution */
  requires_approval?: boolean;

  /** Agent-specific configuration */
  config?: IAgentConfig;

  /** Error message if state is ERROR */
  error?: string;

  /** Timestamp of last state change */
  updated_at?: number;
}

/**
 * Agent configuration interface
 */
export interface IAgentConfig {
  /** AI provider to use for this agent */
  provider?: 'cloudflare' | 'deepseek' | 'openai' | 'anthropic';

  /** Maximum reasoning steps allowed */
  max_reasoning_steps?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Additional provider-specific options */
  options?: Record<string, any>;

  /** Whether this agent participates in agent handshaking */
  enable_handshake?: boolean;
}

// ============================================================================
// TRACE PROTOCOL
// ============================================================================

/**
 * Trace information for tracking operation paths
 */
interface ITraceInfo {
  /** Unique trace identifier */
  traceId: string;

  /** Origin cell that initiated the trace */
  origin: string;

  /** Path of cells visited in this trace */
  path: string[];

  /** Timestamp when trace was created */
  timestamp: number;
}

/**
 * Trace Protocol for recursive loop detection and prevention
 *
 * Implements Origin-Centric Design by tracking operation paths
 * from their origin and detecting when we revisit a cell.
 */
export class TraceProtocol {
  private _traces: Map<string, ITraceInfo> = new Map();
  private _cleanup_interval: number = 3600000; // 1 hour
  private _cleanup_timer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Generate a new trace ID for an operation
   * @param originId - The origin cell identifier
   * @returns Unique trace ID
   */
  generate(originId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const traceId = `trace_${timestamp}_${random}_${originId}`;

    this._traces.set(traceId, {
      traceId,
      origin: originId,
      path: [originId],
      timestamp
    });

    return traceId;
  }

  /**
   * Check for collision (recursive loop) at current cell
   * @param traceId - The trace ID to check
   * @param currentCell - Current cell identifier
   * @returns true if collision detected (recursive loop found)
   */
  checkCollision(traceId: string, currentCell: string): boolean {
    const trace = this._traces.get(traceId);
    if (!trace) {
      return false;
    }

    if (trace.path.includes(currentCell)) {
      console.warn(`[TraceProtocol] Recursive loop detected: ${traceId} at ${currentCell}`);
      console.warn(`[TraceProtocol] Path: ${trace.path.join(' -> ')}`);
      return true;
    }

    trace.path.push(currentCell);
    return false;
  }

  /**
   * Get the path for a trace
   * @param traceId - The trace ID
   * @returns Array of cell identifiers in the path
   */
  getPath(traceId: string): string[] {
    const trace = this._traces.get(traceId);
    return trace ? trace.path : [];
  }

  /**
   * Complete a trace and mark it for cleanup
   * @param traceId - The trace ID to complete
   */
  complete(traceId: string): void {
    const trace = this._traces.get(traceId);
    if (trace) {
      trace.timestamp = Date.now() - this._cleanup_interval - 1; // Mark for cleanup
    }
  }

  /**
   * Clean up old traces
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this._traces.forEach((trace, traceId) => {
      if (now - trace.timestamp > this._cleanup_interval) {
        toDelete.push(traceId);
      }
    });

    toDelete.forEach(traceId => this._traces.delete(traceId));

    if (toDelete.length > 0) {
      console.log(`[TraceProtocol] Cleaned up ${toDelete.length} old traces`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this._cleanup_timer = setInterval(() => {
      this.cleanup();
    }, this._cleanup_interval);
  }

  /**
   * Stop cleanup timer and clear all traces
   */
  dispose(): void {
    if (this._cleanup_timer) {
      clearInterval(this._cleanup_timer);
      this._cleanup_timer = null;
    }
    this._traces.clear();
  }

  /**
   * Get current trace statistics
   */
  getStats(): { active: number; totalPaths: number } {
    let totalPaths = 0;
    this._traces.forEach(trace => {
      totalPaths += trace.path.length;
    });

    return {
      active: this._traces.size,
      totalPaths
    };
  }
}

// ============================================================================
// STATE MANAGER
// ============================================================================

/**
 * State transition rules for agent cells
 */
const STATE_TRANSITIONS: Record<AgentCellState, AgentCellState[]> = {
  [AgentCellState.DORMANT]: [
    AgentCellState.THINKING,
    AgentCellState.ERROR
  ],
  [AgentCellState.THINKING]: [
    AgentCellState.NEEDS_REVIEW,
    AgentCellState.POSTED,
    AgentCellState.ERROR,
    AgentCellState.DORMANT  // Allow reset from THINKING
  ],
  [AgentCellState.NEEDS_REVIEW]: [
    AgentCellState.POSTED,
    AgentCellState.ARCHIVED,
    AgentCellState.THINKING,
    AgentCellState.ERROR
  ],
  [AgentCellState.POSTED]: [
    AgentCellState.DORMANT,
    AgentCellState.THINKING,
    AgentCellState.ARCHIVED,
    AgentCellState.ERROR
  ],
  [AgentCellState.ARCHIVED]: [
    AgentCellState.DORMANT,
    AgentCellState.THINKING
  ],
  [AgentCellState.ERROR]: [
    AgentCellState.DORMANT,
    AgentCellState.THINKING,
    AgentCellState.ARCHIVED
  ]
};

/**
 * State Manager for agent cell state transitions
 *
 * Validates and executes state transitions according to business rules
 */
export class StateManager {
  /**
   * Check if a state transition is valid
   * @param from - Current state
   * @param to - Target state
   * @returns true if transition is allowed
   */
  canTransition(from: AgentCellState, to: AgentCellState): boolean {
    const allowed = STATE_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Execute a state transition
   * @param cellData - Agent cell data
   * @param newState - Target state
   * @param error - Optional error message if transitioning to ERROR state
   * @returns Updated cell data
   * @throws Error if transition is invalid
   */
  transition(
    cellData: IAgentCellData,
    newState: AgentCellState,
    error?: string
  ): IAgentCellData {
    const currentState = cellData.state || AgentCellState.DORMANT;

    if (!this.canTransition(currentState, newState)) {
      throw new Error(
        `Invalid state transition: ${currentState} -> ${newState}`
      );
    }

    const updated: IAgentCellData = {
      ...cellData,
      state: newState,
      updated_at: Date.now()
    };

    if (newState === AgentCellState.ERROR && error) {
      updated.error = error;
    } else {
      delete updated.error;
    }

    return updated;
  }

  /**
   * Reset a cell to DORMANT state
   * @param cellData - Agent cell data
   * @returns Updated cell data
   */
  reset(cellData: IAgentCellData): IAgentCellData {
    return this.transition(cellData, AgentCellState.DORMANT);
  }

  /**
   * Mark a cell as requiring review
   * @param cellData - Agent cell data
   * @returns Updated cell data
   */
  requestReview(cellData: IAgentCellData): IAgentCellData {
    const updated = this.transition(cellData, AgentCellState.NEEDS_REVIEW);
    updated.requires_approval = true;
    return updated;
  }

  /**
   * Approve and post a cell's action
   * @param cellData - Agent cell data
   * @returns Updated cell data
   */
  approve(cellData: IAgentCellData): IAgentCellData {
    const updated = this.transition(cellData, AgentCellState.POSTED);
    updated.requires_approval = false;
    return updated;
  }

  /**
   * Reject a cell's action and return to thinking
   * @param cellData - Agent cell data
   * @returns Updated cell data
   */
  reject(cellData: IAgentCellData): IAgentCellData {
    const updated = this.transition(cellData, AgentCellState.THINKING);
    updated.requires_approval = false;
    return updated;
  }
}

// ============================================================================
// AGENT HANDSHAKE PROTOCOL
// ============================================================================

/**
 * Agent Handshake Protocol for bot-to-bot interaction detection
 *
 * Detects when agents are interacting with other agents to prevent
 * recursive bot conversations and filter out bot-generated content.
 */
export class AgentHandshakeProtocol {
  private readonly _agentSignature = '__AGENT_ORIGIN__';
  private readonly _agentMetadata = '__AGENT_METADATA__';

  /**
   * Check if data contains agent signature
   * @param data - Data to check
   * @returns true if data appears to be from another agent
   */
  isAgentGenerated(data: any): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    // Check for explicit agent signature
    if (this._agentSignature in data) {
      return true;
    }

    // Check for agent metadata
    if (this._agentMetadata in data) {
      return true;
    }

    // Check for common agent patterns
    if (this._looksLikeAgentJSON(data)) {
      return true;
    }

    return false;
  }

  /**
   * Calculate confidence score for agent detection
   * @param data - Data to analyze
   * @returns Confidence score (0-1)
   */
  getAgentConfidence(data: any): number {
    if (typeof data !== 'object' || data === null) {
      return 0;
    }

    let confidence = 0;

    // Explicit signature
    if (this._agentSignature in data) {
      confidence += 0.5;
    }

    // Agent metadata
    if (this._agentMetadata in data) {
      confidence += 0.3;
    }

    // Structured reasoning
    if (Array.isArray(data.reasoning) && data.reasoning.length > 0) {
      confidence += 0.1;
    }

    // Agent configuration
    if ('config' in data && typeof data.config === 'object') {
      confidence += 0.05;
    }

    // Trace ID
    if ('trace_id' in data && typeof data.trace_id === 'string') {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Add agent signature to data
   * @param data - Data to sign
   * @param originId - Origin identifier
   * @returns Signed data
   */
  signAsAgent(data: any, originId: string): any {
    return {
      ...data,
      [this._agentSignature]: true,
      [this._agentMetadata]: {
        origin: originId,
        timestamp: Date.now(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Check if data looks like agent-generated JSON
   * @param data - Data to check
   * @returns true if data has agent-like characteristics
   */
  private _looksLikeAgentJSON(data: any): boolean {
    const agentFields = [
      'origin_id',
      'trace_id',
      'reasoning',
      'memory',
      'cell_type',
      'state',
      'requires_approval'
    ];

    const presentFields = agentFields.filter(field => field in data);
    return presentFields.length >= 3; // At least 3 agent fields present
  }
}

// ============================================================================
// PLUGIN AND SERVICE EXPORTS
// ============================================================================

// Export plugin and service tokens
export {
  AgentCorePlugin,
  createAgentCorePlugin,
  ITraceProtocol,
  IStateManager,
  IAgentHandshakeProtocol,
} from './plugins/AgentCorePlugin';

export type {
  IAgentCorePluginConfig,
} from './plugins/AgentCorePlugin';

export {
  AgentCellService,
} from './services/AgentCellService';

export type {
  ICreateAgentCellOptions,
} from './services/AgentCellService';

// ============================================================================
// UTILITIES EXPORTS
// ============================================================================

export {
  isAgentCell,
  isAgentCellType,
  isAgentCellState,
  validateAgentCell,
  validateAgentConfig,
  getAgentCellTypeName,
  getAgentCellStateName,
  isAgentCellActive,
  canActivateAgentCell,
  getAgentCellStateColor,
} from './utils/validators';

export {
  ValidationError,
} from './utils/validators';

export type {
  ValidationResult,
} from './utils/validators';

// ============================================================================
// CLAW API EXPORTS (Phase 2 Integration)
// ============================================================================

// Re-export all Claw API types and client
export {
  // Enums
  ClawState,
  ClawType,
  ModelProvider,
  EquipmentSlot,
  RelationshipType,
  TriggerType,
  LearningStrategy,
  WebSocketMessageType,
  ClawErrorCode,

  // Types
  ClawCellConfig,
  TriggerCondition,
  Relationship,
  ReasoningStep,
  ClawAction,
  ClawStateInfo,
  WebSocketMessage,
  SubscribePayload,
  ReasoningStepPayload,
  ApprovalRequiredPayload,
  CreateClawRequest,
  CreateClawResponse,
  QueryClawRequest,
  QueryClawResponse,
  TriggerClawRequest,
  TriggerClawResponse,
  CancelClawRequest,
  CancelClawResponse,
  ApproveClawRequest,
  ApproveClawResponse,
  ClawClientConfig,

  // Zod Schemas
  ClawCellConfigSchema,
  WebSocketMessageSchema,
  CreateClawRequestSchema,
  TriggerClawRequestSchema,
  ApproveClawRequestSchema,
  QueryClawRequestSchema,
  CancelClawRequestSchema,

  // Classes
  ClawAPIError,

  // Type Guards
  isClawCellConfig,
  isWebSocketMessage,
  isClawAPIError,

  // Client
  ClawClient,
  createClawClient,
} from './api';

// ============================================================================
// MONITORING EXPORTS (Week 4: Production Deployment)
// ============================================================================

// Re-export all monitoring components
export {
  MetricsCollector,
  MetricType,
  MetricCategory,
  getMetricsCollector,
  resetMetricsCollector
} from './monitoring';

export {
  HealthChecker,
  HealthStatus,
  HealthCheckResult,
  CheckResult,
  HealthCheckConfig,
  HTTPHealthCheckConfig,
  WebSocketHealthCheckConfig,
  ResourceThresholds,
  getHealthChecker,
  resetHealthChecker
} from './monitoring';

export type {
  Metric,
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  SummaryMetric
} from './monitoring';

// ============================================================================
// MIDDLEWARE EXPORTS (Week 4: Production Deployment)
// ============================================================================

export {
  MonitoringMiddleware,
  createMonitoringMiddleware,
  getMonitoringMiddleware,
  resetMonitoringMiddleware
} from './middleware';

export type {
  RequestMetadata,
  ResponseMetadata,
  ErrorMetadata,
  MonitoringMiddlewareConfig
} from './middleware';

// ============================================================================
// PERFORMANCE OPTIMIZATION EXPORTS (Round 5: Production Polish)
// ============================================================================

export {
  PerformanceMonitor,
  CellUpdateOptimizer,
  createPerformanceMonitor,
  getPerformanceMonitor,
  resetPerformanceMonitor,
  createCellUpdateOptimizer,
  getCellUpdateOptimizer,
  resetCellUpdateOptimizer
} from './performance';

export type {
  PerformanceMetrics,
  PerformanceReport,
  CellUpdateMetrics,
  PerformanceIssue,
  OptimizationRecommendation,
  PerformanceThresholds,
  OptimizationStrategy
} from './performance';

export {
  measurePerformance,
  createPerformanceMarker,
  withPerformanceMonitoring,
  formatDuration,
  formatBytes,
  calculatePerformanceScore,
  getPerformanceGrade,
  debounce,
  throttle,
  memoize,
  rafThrottle,
  whenIdle,
  createMicrotask
} from './performance';

// Import modules needed for default export (interfaces are types only, not runtime values)
import { AgentCorePlugin } from './plugins/AgentCorePlugin';
import { AgentCellService } from './services/AgentCellService';
import {
  ValidationError,
  isAgentCell,
  isAgentCellType,
  isAgentCellState,
  validateAgentCell,
  validateAgentConfig,
  getAgentCellTypeName,
  getAgentCellStateName,
  isAgentCellActive,
  canActivateAgentCell,
  getAgentCellStateColor
} from './utils/validators';
import { ClawClient, ClawAPIError } from './api';
import { MetricsCollector, HealthChecker } from './monitoring';
import { MonitoringMiddleware } from './middleware';
import { PerformanceMonitor, CellUpdateOptimizer } from './performance';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Core enums (interfaces IAgentCellData and IAgentConfig are types, not runtime values)
  AgentCellType,
  AgentCellState,

  // Protocols and managers
  TraceProtocol,
  StateManager,
  AgentHandshakeProtocol,

  // Plugins and services
  AgentCorePlugin,
  AgentCellService,

  // Validators
  ValidationError,
  validators: {
    isAgentCell,
    isAgentCellType,
    isAgentCellState,
    validateAgentCell,
    validateAgentConfig,
    getAgentCellTypeName,
    getAgentCellStateName,
    isAgentCellActive,
    canActivateAgentCell,
    getAgentCellStateColor,
  },

  // Claw API
  ClawClient,
  ClawAPIError,

  // Monitoring
  MetricsCollector,
  HealthChecker,

  // Middleware
  MonitoringMiddleware,

  // Performance
  PerformanceMonitor,
  CellUpdateOptimizer
};
