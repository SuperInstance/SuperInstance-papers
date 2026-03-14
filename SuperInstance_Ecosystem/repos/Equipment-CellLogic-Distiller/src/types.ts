/**
 * Types for Cell Logic Distiller Equipment
 */

import type { Tile, TileType, ProvenanceChain } from '@superinstance/starter-agent';

// ============================================
// Logic Tile Types
// ============================================

/**
 * Represents a decomposed logic tile with full metadata
 */
export interface LogicTile {
  /** Unique identifier for the tile */
  id: string;
  
  /** Human-readable name for the tile */
  name: string;
  
  /** Where the data originated from */
  dataOrigin: DataOrigin;
  
  /** The decision logic applied */
  decisionLogic: DecisionLogic;
  
  /** Transformation applied to data */
  transformation: TransformationInfo;
  
  /** Confidence level for this tile (0-1) */
  confidence: number;
  
  /** Named interface for accessing this tile */
  namedInterface: NamedInterface;
  
  /** Natural language description of what this tile does */
  nlpDescription: string;
  
  /** Source text segment this tile was derived from */
  sourceSegment: string;
  
  /** Position in the original text */
  sourcePosition: {
    start: number;
    end: number;
  };
  
  /** Dependencies on other tiles */
  dependencies: string[];
  
  /** Output type of this tile */
  outputType: TileType;
  
  /** Input type this tile accepts */
  inputType: TileType;
}

/**
 * Describes where data originated from
 */
export interface DataOrigin {
  /** Type of origin */
  type: 'prompt' | 'response' | 'reasoning' | 'tool_output' | 'external' | 'derived';
  
  /** Source identifier */
  sourceId: string;
  
  /** Timestamp of origin */
  timestamp: number;
  
  /** Original value */
  originalValue: unknown;
  
  /** Description of the origin */
  description: string;
}

/**
 * Decision logic information
 */
export interface DecisionLogic {
  /** Type of decision */
  type: 'conditional' | 'selection' | 'ranking' | 'filtering' | 'aggregation' | 'generation' | 'verification';
  
  /** Conditions evaluated */
  conditions: LogicCondition[];
  
  /** The logic rule expressed as natural language */
  rule: string;
  
  /** Formal representation (if available) */
  formalRule?: string;
  
  /** Confidence in the extracted logic */
  extractionConfidence: number;
}

/**
 * A single logic condition
 */
export interface LogicCondition {
  /** Condition identifier */
  id: string;
  
  /** Left operand */
  left: string;
  
  /** Operator */
  operator: LogicOperator;
  
  /** Right operand */
  right: string;
  
  /** Whether this condition is negated */
  negated: boolean;
  
  /** Description of the condition */
  description: string;
}

/**
 * Logic operators
 */
export type LogicOperator = 
  | '==' 
  | '!=' 
  | '<' 
  | '>' 
  | '<=' 
  | '>=' 
  | 'contains' 
  | 'startsWith' 
  | 'endsWith' 
  | 'matches' 
  | 'in' 
  | 'notIn'
  | 'exists'
  | 'notExists';

/**
 * Transformation information
 */
export interface TransformationInfo {
  /** Type of transformation */
  type: 'map' | 'filter' | 'reduce' | 'transform' | 'compose' | 'split' | 'merge' | 'extract';
  
  /** Description of the transformation */
  description: string;
  
  /** Input schema */
  inputSchema?: Record<string, unknown>;
  
  /** Output schema */
  outputSchema?: Record<string, unknown>;
  
  /** Transformation function signature */
  signature: string;
}

/**
 * Named interface for tile access
 */
export interface NamedInterface {
  /** Interface name */
  name: string;
  
  /** Parameter definitions */
  parameters: InterfaceParameter[];
  
  /** Return type */
  returnType: string;
  
  /** Usage example */
  example: string;
  
  /** Documentation */
  documentation: string;
}

/**
 * Interface parameter
 */
export interface InterfaceParameter {
  /** Parameter name */
  name: string;
  
  /** Parameter type */
  type: string;
  
  /** Whether this parameter is optional */
  optional: boolean;
  
  /** Default value (if any) */
  defaultValue?: unknown;
  
  /** Parameter description */
  description: string;
}

// ============================================
// Spreadsheet Cell Types
// ============================================

/**
 * A cell in the spreadsheet visualization
 */
export interface SpreadsheetCell {
  /** Cell identifier (e.g., "A1", "B2") */
  id: string;
  
  /** Row index (0-based) */
  row: number;
  
  /** Column index (0-based) */
  column: number;
  
  /** Cell value */
  value: unknown;
  
  /** Formula if this cell contains a computed value */
  formula?: string;
  
  /** Reference to the logic tile this cell represents */
  tileId: string;
  
  /** Display name for the cell */
  displayName: string;
  
  /** Cell type */
  type: SpreadsheetCellType;
  
  /** Formatting options */
  formatting: CellFormatting;
  
  /** Comments/notes attached to the cell */
  comments: string[];
  
  /** Dependencies (other cell IDs) */
  dependsOn: string[];
  
  /** Whether this cell is visible */
  visible: boolean;
  
  /** Confidence score */
  confidence: number;
  
  /** Provenance chain */
  provenance: ProvenanceChain;
}

/**
 * Types of spreadsheet cells
 */
export type SpreadsheetCellType = 
  | 'input' 
  | 'output' 
  | 'logic' 
  | 'transformation' 
  | 'decision' 
  | 'reference' 
  | 'constant'
  | 'formula'
  | 'metadata';

/**
 * Cell formatting options
 */
export interface CellFormatting {
  /** Background color (hex) */
  backgroundColor?: string;
  
  /** Text color (hex) */
  textColor?: string;
  
  /** Font weight */
  fontWeight?: 'normal' | 'bold';
  
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right';
  
  /** Number format */
  numberFormat?: string;
  
  /** Border style */
  border?: {
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
    color?: string;
  };
}

/**
 * Spreadsheet structure
 */
export interface LogicSpreadsheet {
  /** Spreadsheet identifier */
  id: string;
  
  /** Spreadsheet name */
  name: string;
  
  /** All cells in the spreadsheet */
  cells: Map<string, SpreadsheetCell>;
  
  /** Grid dimensions [rows, columns] */
  dimensions: [number, number];
  
  /** Origin tile ID */
  originTileId: string;
  
  /** Column headers */
  columnHeaders: string[];
  
  /** Row headers */
  rowHeaders: string[];
  
  /** Named ranges */
  namedRanges: Map<string, string[]>;
  
  /** Creation timestamp */
  createdAt: number;
  
  /** Last modified timestamp */
  modifiedAt: number;
  
  /** Metadata */
  metadata: SpreadsheetMetadata;
}

/**
 * Spreadsheet metadata
 */
export interface SpreadsheetMetadata {
  /** Source LLM prompt */
  sourcePrompt?: string;
  
  /** Source LLM response */
  sourceResponse?: string;
  
  /** Number of tiles */
  tileCount: number;
  
  /** Average confidence */
  averageConfidence: number;
  
  /** Processing time in ms */
  processingTimeMs: number;
  
  /** Version of distiller used */
  distillerVersion: string;
}

// ============================================
// Decomposition Types
// ============================================

/**
 * Result of decomposing LLM logic
 */
export interface DecompositionResult {
  /** All extracted tiles */
  tiles: LogicTile[];
  
  /** The resulting spreadsheet */
  spreadsheet: LogicSpreadsheet;
  
  /** Processing statistics */
  statistics: DecompositionStatistics;
  
  /** Any warnings encountered */
  warnings: string[];
  
  /** Timestamp of decomposition */
  timestamp: number;
}

/**
 * Statistics about the decomposition
 */
export interface DecompositionStatistics {
  /** Total characters processed */
  totalCharacters: number;
  
  /** Number of segments identified */
  segmentCount: number;
  
  /** Number of conditions extracted */
  conditionCount: number;
  
  /** Number of transformations identified */
  transformationCount: number;
  
  /** Average confidence across tiles */
  averageConfidence: number;
  
  /** Processing time in milliseconds */
  processingTimeMs: number;
  
  /** Memory used in bytes */
  memoryUsedBytes: number;
}

/**
 * Input for the distillation process
 */
export interface DistillationInput {
  /** The LLM prompt */
  prompt: string;
  
  /** The LLM response */
  response: string;
  
  /** Optional context */
  context?: Record<string, unknown>;
  
  /** Optional source ID for provenance */
  sourceId?: string;
}

/**
 * Options for distillation
 */
export interface DistillationOptions {
  /** Minimum confidence threshold for tiles */
  minConfidence?: number;
  
  /** Maximum number of tiles to extract */
  maxTiles?: number;
  
  /** Include NLP descriptions */
  includeNlpDescriptions?: boolean;
  
  /** Include source positions */
  includeSourcePositions?: boolean;
  
  /** Generate formal rules */
  generateFormalRules?: boolean;
  
  /** Spreadsheet output format */
  spreadsheetFormat?: 'excel' | 'csv' | 'json' | 'html';
}

/**
 * Reverse engineering result
 */
export interface ReverseEngineerResult {
  /** The logic explanation */
  explanation: string;
  
  /** Structured breakdown */
  breakdown: {
    input: string;
    processing: string;
    output: string;
    sideEffects: string[];
  };
  
  /** Related tiles */
  relatedTiles: string[];
  
  /** Confidence in the explanation */
  confidence: number;
  
  /** Natural language summary */
  summary: string;
}

// ============================================
// Export types that extend base types
// ============================================

/**
 * Extended Tile interface for logic tiles
 */
export interface LogicTileAdapter extends Tile {
  /** Reference to the logic tile */
  logicTileId: string;
  
  /** Custom compute function */
  logicCompute: (input: unknown, context?: Record<string, unknown>) => unknown;
}
