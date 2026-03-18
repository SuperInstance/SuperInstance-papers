/**
 * Agent Cell Service
 *
 * Service layer for managing agent cells within Univer:
 * - Create and update agent cells
 * - Integrate with Univer's cell model
 * - Handle agent-specific operations
 *
 * @packageDocumentation
 */

import {
  IAgentCellData,
  AgentCellType,
  AgentCellState,
  IAgentConfig,
} from '../index';
import {
  ITraceProtocol,
  IStateManager,
  IAgentHandshakeProtocol,
} from '../plugins/AgentCorePlugin';

// Type definitions for cell model
interface ICellData {
  v?: string | number;
  f?: string;
}

/**
 * Agent Cell Creation Options
 */
export interface ICreateAgentCellOptions {
  /** Type of agent cell to create */
  cellType: AgentCellType;

  /** Initial value (optional) */
  value?: string | number;

  /** Formula (optional) */
  formula?: string;

  /** AI provider to use */
  provider?: 'cloudflare' | 'deepseek' | 'openai' | 'anthropic';

  /** Maximum reasoning steps */
  maxReasoningSteps?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Whether to enable agent handshake */
  enableHandshake?: boolean;

  /** Initial configuration */
  config?: IAgentConfig;
}

/**
 * Agent Cell Service
 *
 * Provides methods to create, update, and manage agent cells
 */
export class AgentCellService {
  private _traceProtocol: TraceProtocolWrapper;
  private _stateManager: StateManagerWrapper;
  private _handshakeProtocol: HandshakeProtocolWrapper;

  constructor(
    traceProtocol?: unknown,
    stateManager?: unknown,
    handshakeProtocol?: unknown
  ) {
    // Create wrapper objects that provide the expected interface
    this._traceProtocol = new TraceProtocolWrapper(traceProtocol);
    this._stateManager = new StateManagerWrapper(stateManager);
    this._handshakeProtocol = new HandshakeProtocolWrapper(handshakeProtocol);
  }

  /**
   * Create a new agent cell
   */
  createAgentCell(options: ICreateAgentCellOptions): IAgentCellData {
    const originId = this._generateOriginId();

    const agentCell: IAgentCellData = {
      v: options.value,
      f: options.formula,
      origin_id: originId,
      cell_type: options.cellType,
      state: AgentCellState.DORMANT,
      reasoning: [],
      memory: [],
      requires_approval: true,
      config: {
        provider: options.provider || 'cloudflare',
        max_reasoning_steps: options.maxReasoningSteps || 10,
        timeout: options.timeout || 30000,
        enable_handshake: options.enableHandshake !== false,
        ...options.config
      },
      updated_at: Date.now()
    };

    return agentCell;
  }

  /**
   * Activate an agent cell (start processing)
   */
  activateAgentCell(cellData: IAgentCellData): IAgentCellData {
    if (!cellData.origin_id) {
      throw new Error('Cannot activate cell without origin_id');
    }

    // Generate trace ID for this operation
    const traceId = this._traceProtocol.generate(cellData.origin_id);
    cellData.trace_id = traceId;

    // Transition to THINKING state
    const updated = this._stateManager.transition(cellData, AgentCellState.THINKING);

    return updated;
  }

  /**
   * Update agent cell with reasoning step
   */
  addReasoningStep(cellData: IAgentCellData, step: string): IAgentCellData {
    const reasoning = cellData.reasoning || [];
    reasoning.push(step);

    return {
      ...cellData,
      reasoning,
      updated_at: Date.now()
    };
  }

  /**
   * Add to agent cell memory
   */
  addToMemory(cellData: IAgentCellData, memory: string): IAgentCellData {
    const mem = cellData.memory || [];
    mem.push(memory);

    // Keep only last 100 memory entries
    if (mem.length > 100) {
      mem.splice(0, mem.length - 100);
    }

    return {
      ...cellData,
      memory: mem,
      updated_at: Date.now()
    };
  }

  /**
   * Mark agent cell as needing review
   */
  requestReview(cellData: IAgentCellData): IAgentCellData {
    return this._stateManager.requestReview(cellData);
  }

  /**
   * Approve agent cell action
   */
  approve(cellData: IAgentCellData): IAgentCellData {
    const approved = this._stateManager.approve(cellData);

    // Complete the trace
    if (approved.trace_id) {
      this._traceProtocol.complete(approved.trace_id);
      approved.trace_id = undefined;
    }

    return approved;
  }

  /**
   * Reject agent cell action
   */
  reject(cellData: IAgentCellData): IAgentCellData {
    return this._stateManager.reject(cellData);
  }

  /**
   * Reset agent cell to dormant state
   */
  reset(cellData: IAgentCellData): IAgentCellData {
    return this._stateManager.reset(cellData);
  }

  /**
   * Check if cell value is from another agent
   */
  isAgentGenerated(value: unknown): boolean {
    return this._handshakeProtocol.isAgentGenerated(value);
  }

  /**
   * Get agent confidence score for value
   */
  getAgentConfidence(value: unknown): number {
    return this._handshakeProtocol.getAgentConfidence(value);
  }

  /**
   * Validate agent cell data
   */
  validateAgentCell(cellData: IAgentCellData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!cellData.origin_id) {
      errors.push('origin_id is required');
    }

    if (!cellData.cell_type) {
      errors.push('cell_type is required');
    } else if (!Object.values(AgentCellType).includes(cellData.cell_type)) {
      errors.push('cell_type must be a valid AgentCellType');
    }

    if (cellData.state && !Object.values(AgentCellState).includes(cellData.state)) {
      errors.push('state must be a valid AgentCellState');
    }

    if (cellData.config) {
      if (cellData.config.max_reasoning_steps !== undefined && cellData.config.max_reasoning_steps < 1) {
        errors.push('max_reasoning_steps must be at least 1');
      }

      if (cellData.config.timeout !== undefined && cellData.config.timeout < 1000) {
        errors.push('timeout must be at least 1000ms');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique origin ID for agent cell
   */
  private _generateOriginId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `origin_${timestamp}_${random}`;
  }
}

/**
 * Wrapper class for Trace Protocol
 */
class TraceProtocolWrapper {
  private _protocol: unknown;

  constructor(protocol?: unknown) {
    this._protocol = protocol;
  }

  generate(originId: string): string {
    if (this._protocol && typeof (this._protocol as { generate: (id: string) => string }).generate === 'function') {
      return (this._protocol as { generate: (id: string) => string }).generate(originId);
    }
    return `trace_${originId}_${Date.now()}`;
  }

  complete(traceId: string): void {
    if (this._protocol && typeof (this._protocol as { complete: (id: string) => void }).complete === 'function') {
      (this._protocol as { complete: (id: string) => void }).complete(traceId);
    }
  }
}

/**
 * Wrapper class for State Manager
 */
class StateManagerWrapper {
  private _manager: unknown;

  constructor(manager?: unknown) {
    this._manager = manager;
  }

  transition(cellData: IAgentCellData, state: AgentCellState): IAgentCellData {
    if (this._manager && typeof (this._manager as { transition: (d: IAgentCellData, s: AgentCellState) => IAgentCellData }).transition === 'function') {
      return (this._manager as { transition: (d: IAgentCellData, s: AgentCellState) => IAgentCellData }).transition(cellData, state);
    }
    return { ...cellData, state, updated_at: Date.now() };
  }

  requestReview(cellData: IAgentCellData): IAgentCellData {
    if (this._manager && typeof (this._manager as { requestReview: (d: IAgentCellData) => IAgentCellData }).requestReview === 'function') {
      return (this._manager as { requestReview: (d: IAgentCellData) => IAgentCellData }).requestReview(cellData);
    }
    return { ...cellData, state: AgentCellState.NEEDS_REVIEW, updated_at: Date.now() };
  }

  approve(cellData: IAgentCellData): IAgentCellData {
    if (this._manager && typeof (this._manager as { approve: (d: IAgentCellData) => IAgentCellData }).approve === 'function') {
      return (this._manager as { approve: (d: IAgentCellData) => IAgentCellData }).approve(cellData);
    }
    return { ...cellData, state: AgentCellState.POSTED, updated_at: Date.now() };
  }

  reject(cellData: IAgentCellData): IAgentCellData {
    if (this._manager && typeof (this._manager as { reject: (d: IAgentCellData) => IAgentCellData }).reject === 'function') {
      return (this._manager as { reject: (d: IAgentCellData) => IAgentCellData }).reject(cellData);
    }
    return { ...cellData, state: AgentCellState.ERROR, updated_at: Date.now() };
  }

  reset(cellData: IAgentCellData): IAgentCellData {
    if (this._manager && typeof (this._manager as { reset: (d: IAgentCellData) => IAgentCellData }).reset === 'function') {
      return (this._manager as { reset: (d: IAgentCellData) => IAgentCellData }).reset(cellData);
    }
    return { ...cellData, state: AgentCellState.DORMANT, reasoning: [], updated_at: Date.now() };
  }
}

/**
 * Wrapper class for Handshake Protocol
 */
class HandshakeProtocolWrapper {
  private _protocol: unknown;

  constructor(protocol?: unknown) {
    this._protocol = protocol;
  }

  isAgentGenerated(value: unknown): boolean {
    if (this._protocol && typeof (this._protocol as { isAgentGenerated: (v: unknown) => boolean }).isAgentGenerated === 'function') {
      return (this._protocol as { isAgentGenerated: (v: unknown) => boolean }).isAgentGenerated(value);
    }
    // Default implementation: check if value has agent metadata
    if (value && typeof value === 'object') {
      return 'origin_id' in (value as object) || 'agent_confidence' in (value as object);
    }
    return false;
  }

  getAgentConfidence(value: unknown): number {
    if (this._protocol && typeof (this._protocol as { getAgentConfidence: (v: unknown) => number }).getAgentConfidence === 'function') {
      return (this._protocol as { getAgentConfidence: (v: unknown) => number }).getAgentConfidence(value);
    }
    // Default implementation: return confidence from metadata
    if (value && typeof value === 'object' && 'agent_confidence' in (value as object)) {
      return (value as { agent_confidence: number }).agent_confidence;
    }
    return 1.0;
  }
}

export default AgentCellService;
