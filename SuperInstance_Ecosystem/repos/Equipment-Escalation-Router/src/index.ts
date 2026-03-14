/**
 * Equipment-Escalation-Router
 * Intelligent LLM routing: Bot→Brain→Human with 40x cost reduction
 * 
 * @packageDocumentation
 */

export { EscalationRouter, EscalationRouterConfig, RoutingResult, RoutingTier } from './EscalationRouter';
export { DecisionRouter, DecisionFactors, RoutingDecision, ComplexityLevel, UrgencyLevel, StakesLevel } from './DecisionRouter';
export { CostOptimizer, CostTracker, BudgetConfig, CostMetrics, PatternCache } from './CostOptimizer';
export { HumanEscalation, HumanEscalationConfig, EscalationRequest, EscalationResponse, EscalationPriority } from './HumanEscalation';

// Re-export types for convenience
export type {
  EscalationRouterConfig,
  RoutingResult,
  RoutingTier,
  DecisionFactors,
  RoutingDecision,
  ComplexityLevel,
  UrgencyLevel,
  StakesLevel,
  CostTracker,
  BudgetConfig,
  CostMetrics,
  PatternCache,
  HumanEscalationConfig,
  EscalationRequest,
  EscalationResponse,
  EscalationPriority
};
