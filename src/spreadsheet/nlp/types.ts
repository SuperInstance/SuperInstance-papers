/**
 * Natural Language Processing Types for POLLN Spreadsheets
 *
 * This module defines the core types for natural language to formula conversion,
 * intent recognition, entity extraction, and formula generation.
 */

/**
 * Represents the user's intent when making a natural language request
 */
export interface SpreadsheetIntent {
  /** Type of intent */
  type:
    | 'create_formula'
    | 'analyze'
    | 'navigate'
    | 'format'
    | 'chart'
    | 'filter'
    | 'sort'
    | 'validate'
    | 'transform'
    | 'aggregate';

  /** Confidence score from 0 to 1 */
  confidence: number;

  /** Specific action to perform */
  action: string;

  /** Additional context for the intent */
  context?: Record<string, unknown>;
}

/**
 * Represents an entity extracted from natural language
 */
export interface Entity {
  /** Type of entity */
  type: 'cell' | 'range' | 'value' | 'operation' | 'function' | 'condition';

  /** Original text that represents this entity */
  text: string;

  /** Position in the original text */
  position: {
    start: number;
    end: number;
  };

  /** Resolved entity information */
  resolved: ResolvedEntity;

  /** Confidence in this extraction */
  confidence: number;
}

/**
 * Resolved entity with specific information
 */
export interface ResolvedEntity {
  /** For cell references */
  cellReference?: string;

  /** For ranges */
  range?: {
    start: string;
    end: string;
    entireColumn?: boolean;
    entireRow?: boolean;
  };

  /** For values */
  value?: {
    type: 'number' | 'string' | 'boolean' | 'date' | 'percentage';
    raw: string;
    parsed: unknown;
  };

  /** For operations/functions */
  operation?: {
    name: string;
    excelName: string;
    parameters: string[];
  };

  /** For conditions */
  condition?: {
    operator: '>' | '<' | '=' | '>=' | '<=' | '<>' | 'contains' | 'starts_with' | 'ends_with';
    operand: string;
  };
}

/**
 * Represents a parsed formula with metadata
 */
export interface ParsedFormula {
  /** The Excel-compatible formula string */
  formula: string;

  /** Human-readable explanation */
  explanation: string;

  /** Intent that generated this formula */
  intent: SpreadsheetIntent;

  /** Entities used in the formula */
  entities: Entity[];

  /** Formula complexity score */
  complexity: number;

  /** Estimated execution time (ms) */
  estimatedTime?: number;

  /** Potential errors or warnings */
  warnings: string[];
}

/**
 * Suggestion for formula completion
 */
export interface Suggestion {
  /** Suggested completion text */
  text: string;

  /** Display label */
  label: string;

  /** Description of what this does */
  description: string;

  /** Relevance score */
  relevance: number;

  /** Type of suggestion */
  type: 'function' | 'range' | 'value' | 'completion';
}

/**
 * Natural language parse result
 */
export interface NLParseResult {
  /** Parsed formula */
  formula: ParsedFormula;

  /** Whether clarification is needed */
  needsClarification: boolean;

  /** Clarification questions if needed */
  clarificationQuestions?: ClarificationQuestion[];

  /** Alternative interpretations */
  alternatives?: ParsedFormula[];
}

/**
 * Question to clarify ambiguous intent
 */
export interface ClarificationQuestion {
  /** The question text */
  question: string;

  /** Possible answers */
  options: string[];

  /** How each answer maps to a resolution */
  resolutions: Record<string, Partial<Entity>>;
}

/**
 * Configuration for the NLP engine
 */
export interface NLPEngineConfig {
  /** LLM provider to use */
  provider: 'openai' | 'anthropic' | 'local' | 'mock';

  /** API key for the provider */
  apiKey?: string;

  /** Model to use */
  model?: string;

  /** Maximum tokens for generation */
  maxTokens?: number;

  /** Temperature for generation */
  temperature?: number;

  /** Enable cost tracking */
  enableCostTracking?: boolean;

  /** Cache results */
  enableCache?: boolean;

  /** Cache TTL in seconds */
  cacheTTL?: number;
}

/**
 * Spreadsheet context for understanding user intent
 */
export interface SpreadsheetContext {
  /** Sheet name */
  sheetName: string;

  /** Available sheets */
  sheets: string[];

  /** Column headers */
  headers: Record<string, string>;

  /** Data types per column */
  columnTypes: Record<string, 'number' | 'string' | 'date' | 'boolean'>;

  /** Named ranges */
  namedRanges: Record<string, string>;

  /** Existing formulas */
  formulas: Record<string, string>;

  /** User preferences */
  preferences: UserPreferences;
}

/**
 * User preferences for NLP interpretation
 */
export interface UserPreferences {
  /** Preferred date format */
  dateFormat: string;

  /** Preferred number format */
  numberFormat: string;

  /** Whether to use R1C1 notation */
  useR1C1: boolean;

  /** Whether to use table references */
  useTableReferences: boolean;

  /** Default aggregation function */
  defaultAggregation: 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN';

  /** Custom operation mappings */
  customMappings?: Record<string, string>;
}

/**
 * Cost tracking for LLM usage
 */
export interface CostTracking {
  /** Total tokens used */
  totalTokens: number;

  /** Total cost in USD */
  totalCost: number;

  /** Number of requests */
  requestCount: number;

  /** Cost per request */
  costPerRequest: number[];

  /** Token usage per request */
  tokensPerRequest: number[];
}

/**
 * Conversation history entry
 */
export interface ConversationEntry {
  /** Timestamp of the entry */
  timestamp: Date;

  /** User input */
  input: string;

  /** Generated formula */
  output: ParsedFormula;

  /** User feedback */
  feedback?: 'positive' | 'negative' | 'neutral';

  /** Corrections made by user */
  corrections?: string;
}

/**
 * Error correction from context
 */
export interface ErrorCorrection {
  /** Original error */
  error: string;

  /** Corrected formula */
  correction: string;

  /** Explanation of the correction */
  explanation: string;

  /** Confidence in the correction */
  confidence: number;
}

/**
 * LLM response structure
 */
export interface LLMResponse {
  /** Generated text */
  text: string;

  /** Tokens used */
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };

  /** Cost in USD */
  cost: number;

  /** Model used */
  model: string;

  /** Latency in milliseconds */
  latency: number;
}
