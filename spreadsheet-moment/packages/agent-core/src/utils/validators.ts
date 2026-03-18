/**
 * Agent Cell Validators
 *
 * Utility functions for validating agent cells:
 * - Type checking for agent cells
 * - State validation
 * - Configuration validation
 * - Data integrity checks
 *
 * @packageDocumentation
 */

import {
  IAgentCellData,
  AgentCellType,
  AgentCellState,
  IAgentConfig,
} from '../index';

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Check if a value is an agent cell
 */
export function isAgentCell(value: any): value is IAgentCellData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'origin_id' in value || 'cell_type' in value;
}

/**
 * Check if agent cell is of a specific type
 */
export function isAgentCellType(cellData: IAgentCellData, type: AgentCellType): boolean {
  return cellData.cell_type === type;
}

/**
 * Check if agent cell is in a specific state
 */
export function isAgentCellState(cellData: IAgentCellData, state: AgentCellState): boolean {
  return cellData.state === state;
}

/**
 * Validate agent cell data
 */
export function validateAgentCell(cellData: IAgentCellData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!cellData.origin_id) {
    errors.push(new ValidationError(
      'origin_id is required',
      'origin_id',
      'REQUIRED_FIELD'
    ));
  } else if (typeof cellData.origin_id !== 'string') {
    errors.push(new ValidationError(
      'origin_id must be a string',
      'origin_id',
      'INVALID_TYPE'
    ));
  }

  if (!cellData.cell_type) {
    errors.push(new ValidationError(
      'cell_type is required',
      'cell_type',
      'REQUIRED_FIELD'
    ));
  } else if (!Object.values(AgentCellType).includes(cellData.cell_type)) {
    errors.push(new ValidationError(
      `cell_type must be one of: ${Object.values(AgentCellType).join(', ')}`,
      'cell_type',
      'INVALID_VALUE'
    ));
  }

  // Optional fields with validation
  if (cellData.state !== undefined) {
    if (!Object.values(AgentCellState).includes(cellData.state)) {
      errors.push(new ValidationError(
        `state must be one of: ${Object.values(AgentCellState).join(', ')}`,
        'state',
        'INVALID_VALUE'
      ));
    }
  }

  if (cellData.trace_id !== undefined && typeof cellData.trace_id !== 'string') {
    errors.push(new ValidationError(
      'trace_id must be a string',
      'trace_id',
      'INVALID_TYPE'
    ));
  }

  if (cellData.reasoning !== undefined && !Array.isArray(cellData.reasoning)) {
    errors.push(new ValidationError(
      'reasoning must be an array',
      'reasoning',
      'INVALID_TYPE'
    ));
  }

  if (cellData.memory !== undefined && !Array.isArray(cellData.memory)) {
    errors.push(new ValidationError(
      'memory must be an array',
      'memory',
      'INVALID_TYPE'
    ));
  } else if (cellData.memory && cellData.memory.length > 100) {
    warnings.push('memory exceeds 100 entries, old entries will be removed');
  }

  if (cellData.requires_approval !== undefined && typeof cellData.requires_approval !== 'boolean') {
    errors.push(new ValidationError(
      'requires_approval must be a boolean',
      'requires_approval',
      'INVALID_TYPE'
    ));
  }

  // Validate config
  if (cellData.config) {
    const configErrors = validateAgentConfig(cellData.config);
    errors.push(...configErrors);
  }

  // Validate error field
  if (cellData.error !== undefined) {
    if (cellData.state !== AgentCellState.ERROR) {
      warnings.push('error field is set but state is not ERROR');
    }

    if (typeof cellData.error !== 'string') {
      errors.push(new ValidationError(
        'error must be a string',
        'error',
        'INVALID_TYPE'
      ));
    }
  }

  // Validate timestamp
  if (cellData.updated_at !== undefined) {
    if (typeof cellData.updated_at !== 'number') {
      errors.push(new ValidationError(
        'updated_at must be a number',
        'updated_at',
        'INVALID_TYPE'
      ));
    } else if (cellData.updated_at > Date.now()) {
      warnings.push('updated_at is in the future');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate agent configuration
 */
export function validateAgentConfig(config: IAgentConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (config.provider !== undefined) {
    const validProviders = ['cloudflare', 'deepseek', 'openai', 'anthropic'];
    if (!validProviders.includes(config.provider)) {
      errors.push(new ValidationError(
        `provider must be one of: ${validProviders.join(', ')}`,
        'config.provider',
        'INVALID_VALUE'
      ));
    }
  }

  if (config.max_reasoning_steps !== undefined) {
    if (typeof config.max_reasoning_steps !== 'number') {
      errors.push(new ValidationError(
        'max_reasoning_steps must be a number',
        'config.max_reasoning_steps',
        'INVALID_TYPE'
      ));
    } else if (config.max_reasoning_steps < 1) {
      errors.push(new ValidationError(
        'max_reasoning_steps must be at least 1',
        'config.max_reasoning_steps',
        'INVALID_VALUE'
      ));
    } else if (config.max_reasoning_steps > 100) {
      errors.push(new ValidationError(
        'max_reasoning_steps cannot exceed 100',
        'config.max_reasoning_steps',
        'INVALID_VALUE'
      ));
    }
  }

  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number') {
      errors.push(new ValidationError(
        'timeout must be a number',
        'config.timeout',
        'INVALID_TYPE'
      ));
    } else if (config.timeout < 1000) {
      errors.push(new ValidationError(
        'timeout must be at least 1000ms',
        'config.timeout',
        'INVALID_VALUE'
      ));
    } else if (config.timeout > 300000) {
      errors.push(new ValidationError(
        'timeout cannot exceed 300000ms (5 minutes)',
        'config.timeout',
        'INVALID_VALUE'
      ));
    }
  }

  if (config.enable_handshake !== undefined && typeof config.enable_handshake !== 'boolean') {
    errors.push(new ValidationError(
      'enable_handshake must be a boolean',
      'config.enable_handshake',
      'INVALID_TYPE'
    ));
  }

  return errors;
}

/**
 * Get agent cell type display name
 */
export function getAgentCellTypeName(type: AgentCellType): string {
  const names: Record<AgentCellType, string> = {
    [AgentCellType.SENSOR]: 'Sensor',
    [AgentCellType.ANALYZER]: 'Analyzer',
    [AgentCellType.CONTROLLER]: 'Controller',
    [AgentCellType.ORCHESTRATOR]: 'Orchestrator'
  };

  return names[type] || type;
}

/**
 * Get agent cell state display name
 */
export function getAgentCellStateName(state: AgentCellState): string {
  const names: Record<AgentCellState, string> = {
    [AgentCellState.DORMANT]: 'Dormant',
    [AgentCellState.THINKING]: 'Thinking',
    [AgentCellState.NEEDS_REVIEW]: 'Needs Review',
    [AgentCellState.POSTED]: 'Posted',
    [AgentCellState.ARCHIVED]: 'Archived',
    [AgentCellState.ERROR]: 'Error'
  };

  return names[state] || state;
}

/**
 * Check if agent cell is active (not dormant or archived)
 */
export function isAgentCellActive(cellData: IAgentCellData): boolean {
  const activeStates = [
    AgentCellState.THINKING,
    AgentCellState.NEEDS_REVIEW,
    AgentCellState.POSTED
  ];

  return cellData.state !== undefined && activeStates.includes(cellData.state);
}

/**
 * Check if agent cell can be activated
 */
export function canActivateAgentCell(cellData: IAgentCellData): boolean {
  return cellData.state === undefined ||
         cellData.state === AgentCellState.DORMANT ||
         cellData.state === AgentCellState.ARCHIVED ||
         cellData.state === AgentCellState.POSTED;
}

/**
 * Get agent cell color based on state
 */
export function getAgentCellStateColor(state: AgentCellState): string {
  const colors: Record<AgentCellState, string> = {
    [AgentCellState.DORMANT]: '#94a3b8', // gray
    [AgentCellState.THINKING]: '#3b82f6', // blue
    [AgentCellState.NEEDS_REVIEW]: '#f59e0b', // amber
    [AgentCellState.POSTED]: '#10b981', // green
    [AgentCellState.ARCHIVED]: '#6b7280', // dark gray
    [AgentCellState.ERROR]: '#ef4444' // red
  };

  return colors[state] || '#94a3b8';
}
