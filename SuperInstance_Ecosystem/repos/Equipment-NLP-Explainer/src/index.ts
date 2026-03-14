/**
 * @superinstance/equipment-nlp-explainer
 * 
 * Equipment that generates human-readable descriptions of cell logic and operations.
 * Transforms complex decision logic into natural language explanations that answer
 * not just WHAT was decided, but WHY it was decided.
 * 
 * @packageDocumentation
 */

// Main equipment class
import { NLPExplainer } from './NLPExplainer.js';
export { NLPExplainer, default as default } from './NLPExplainer.js';

// Core modules
import { ConfidenceExplainer } from './ConfidenceExplainer.js';
export { LogicTranslator } from './LogicTranslator.js';
export { ConfidenceExplainer } from './ConfidenceExplainer.js';

// Types
export type {
  SupportedLanguage,
  TranslationStrings,
  LogicPattern,
  LogicPatternType,
  LogicStructure,
  PatternInput,
  PatternOutput,
  EvaluatedCondition,
  AppliedTransformation,
  NLPExplanation,
  ExplanationDetails,
  ExplanationStep,
  ReasoningStep,
  ConfidenceExplanation,
  ConfidenceFactor,
  AuditTrailEntry,
  NLPExplainerOptions,
  TileExplanation,
  DecisionExplanation,
  ChainExplanation,
  NLPTile,
} from './types.js';

/**
 * Quick factory function to create an NLP explainer instance
 */
export function createExplainer(options?: import('./types.js').NLPExplainerOptions): NLPExplainer {
  return new NLPExplainer(options);
}

/**
 * Quick explanation function - explain a logic pattern
 */
export function explain(
  pattern: import('./types.js').LogicPattern,
  options?: import('./types.js').NLPExplainerOptions
): import('./types.js').NLPExplanation {
  const explainerInstance = new NLPExplainer(options);
  return explainerInstance.explain(pattern, options);
}

/**
 * Quick confidence explanation function
 */
export function explainConfidence(
  score: number,
  factors?: import('./types.js').ConfidenceFactor[],
  language: import('./types.js').SupportedLanguage = 'en'
): import('./types.js').ConfidenceExplanation {
  const confidenceExplainer = new ConfidenceExplainer(language);
  return confidenceExplainer.explainConfidence(score, factors);
}

/**
 * Create a simple decision explanation
 */
export function explainDecision(
  decision: string,
  reasoning: string,
  confidence: number,
  language: import('./types.js').SupportedLanguage = 'en'
): import('./types.js').DecisionExplanation {
  const explainerInstance = new NLPExplainer({ language });
  return explainerInstance.explainDecision(
    `decision-${Date.now()}`,
    decision,
    reasoning,
    confidence
  );
}

/**
 * Create a reasoning chain explanation
 */
export function explainReasoningChain(
  steps: Array<{
    premise: string;
    conclusion: string;
    evidence?: string[];
    confidence: number;
  }>,
  language: import('./types.js').SupportedLanguage = 'en'
): import('./types.js').ChainExplanation {
  const explainerInstance = new NLPExplainer({ language });
  return explainerInstance.explainReasoningChain(`chain-${Date.now()}`, steps);
}
