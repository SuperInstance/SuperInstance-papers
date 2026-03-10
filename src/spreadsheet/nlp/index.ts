/**
 * Natural Language Processing for POLLN Spreadsheets
 *
 * Provides natural language to formula conversion, intent recognition,
 * entity extraction, and formula generation capabilities.
 */

export { NLParser } from './NLParser.js';
export { IntentRecognizer } from './IntentRecognizer.js';
export { EntityExtractor } from './EntityExtractor.js';
export { FormulaGenerator } from './FormulaGenerator.js';
export { NLPEngine } from './NLPEngine.js';
export { ContextManager } from './ContextManager.js';

export type {
  SpreadsheetIntent,
  Entity,
  ResolvedEntity,
  ParsedFormula,
  Suggestion,
  NLParseResult,
  ClarificationQuestion,
  NLPEngineConfig,
  SpreadsheetContext,
  UserPreferences,
  CostTracking,
  ConversationEntry,
  ErrorCorrection,
  LLMResponse,
} from './types.js';
