/**
 * Agent Formulas Type Definitions
 *
 * @module agent-formulas/types
 */

/**
 * Nullable type
 */
export type Nullable<T> = T | null;

/**
 * Interpreter value type
 */
export type InterpreterValue = string | number | boolean | null | undefined | InterpreterArray | InterpreterObject;

/**
 * Interpreter array type
 */
export interface InterpreterArray extends Array<InterpreterValue> {}

/**
 * Interpreter object type
 */
export interface InterpreterObject {
  [key: string]: InterpreterValue;
}

/**
 * Function type enum
 */
export const FunctionType = {
  Function: 'Function',
  Array: 'Array',
} as const;

/**
 * Claw agent cell types
 */
export enum ClawAgentType {
  SENSOR = 'SENSOR',
  ANALYZER = 'ANALYZER',
  CONTROLLER = 'CONTROLLER',
  ORCHESTRATOR = 'ORCHESTRATOR'
}

/**
 * Model providers
 */
export enum ModelProvider {
  DEEPSEEK = 'deepseek',
  CLOUDFLARE = 'cloudflare',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic'
}

/**
 * Equipment slots
 */
export enum EquipmentSlot {
  MEMORY = 'MEMORY',
  REASONING = 'REASONING',
  CONSENSUS = 'CONSENSUS',
  SPREADSHEET = 'SPREADSHEET',
  DISTILLATION = 'DISTILLATION',
  COORDINATION = 'COORDINATION'
}

/**
 * Relationship types between claws
 */
export enum RelationshipType {
  SLAVE = 'slave',
  COWORKER = 'coworker',
  PEER = 'peer',
  DELEGATE = 'delegate',
  OBSERVER = 'observer'
}

/**
 * Coordination strategies
 */
export enum CoordinationStrategy {
  PARALLEL = 'PARALLEL',
  SEQUENTIAL = 'SEQUENTIAL',
  CONSENSUS = 'CONSENSUS',
  MAJORITY_VOTE = 'MAJORITY_VOTE',
  WEIGHTED = 'WEIGHTED'
}

/**
 * Claw cell configuration
 */
export interface ClawCellConfig {
  id: string;
  type: ClawAgentType;
  position: [number, number]; // [row, col]

  // Model configuration
  model: {
    provider: ModelProvider;
    model: string;
    apiKey?: string;
  };

  // Seed configuration
  seed: {
    purpose: string;
    trigger: TriggerCondition;
    learningStrategy: 'reinforcement' | 'supervised' | 'unsupervised';
  };

  // Equipment
  equipment: EquipmentSlot[];

  // Social
  relationships: Relationship[];

  // State
  state: string;
  confidence: number;
}

/**
 * Trigger condition
 */
export interface TriggerCondition {
  type: 'cell_change' | 'formula' | 'time' | 'external' | 'manual';
  cellId?: string;
  threshold?: number;
  interval?: number;
  expression?: string;
}

/**
 * Relationship between claws
 */
export interface Relationship {
  type: RelationshipType;
  targetCell: string;
  strategy?: CoordinationStrategy;
}

/**
 * Claw formula function signature
 */
export interface ClawFunctionType {
  id: number;
  type: typeof FunctionType.Function;
  name: string;
  description: string;
  minParams: number;
  maxParams: number;
  parameters: Array<{
    name: string;
    description: string;
    type: string;
    required: boolean;
  }>;
  returns: {
    type: string;
    description: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (this: any, ...args: any[]) => Promise<Nullable<InterpreterValue>>;
}

/**
 * API response for claw operations
 */
export interface ClawApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  clawId?: string;
}

/**
 * Formula execution context
 */
export interface FormulaContext {
  sheetId: string;
  cellId: string;
  workbook: unknown;
  timestamp: number;
}
