/**
 * POLLN Guardian Angel Types
 * Shadow agent with veto power for real-time execution monitoring
 */

// ============================================================================
// Guardian Decision Types
// ============================================================================

export type GuardianDecision = 'ALLOW' | 'MODIFY' | 'VETO';

export type ConstraintSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ConstraintCategory =
  | 'resource_limits'
  | 'action_control'
  | 'rate_limiting'
  | 'privacy_protection'
  | 'ethical_guidelines'
  | 'output_validation'
  | 'security'
  | 'compliance';

// ============================================================================
// Guardian Context
// ============================================================================

export interface GuardianContext {
  proposalId: string;
  agentId: string;
  action: string;
  payload: unknown;
  trace: string[]; // A2A package IDs
  metadata: Record<string, unknown>;

  // Execution context
  timestamp: number;
  layer: string; // Subsumption layer
  domain?: string;

  // Resource estimates
  estimatedMemoryMB?: number;
  estimatedCpuMs?: number;
  estimatedDuration?: number;

  // Privacy context
  privacyLevel?: string;
  containsPII?: boolean;
  containsSensitiveData?: boolean;

  // Previous executions
  previousExecutions?: number;
  successRate?: number;
}

// ============================================================================
// Constraint Types
// ============================================================================

export interface ConstraintResult {
  passed: boolean;
  decision: GuardianDecision;
  reason: string;
  severity: ConstraintSeverity;
  modifications?: Partial<GuardianContext>;
  confidence: number; // 0-1
  metadata?: Record<string, unknown>;
}

export interface GuardianConstraint {
  id: string;
  name: string;
  description: string;
  category: ConstraintCategory;
  severity: ConstraintSeverity;
  weight: number; // For weighted decision making
  active: boolean;
  version: number;

  // Evaluation function
  evaluate: (context: GuardianContext) => Promise<ConstraintResult>;

  // Learning parameters
  adaptiveWeight: boolean;
  falsePositiveCount: number;
  falseNegativeCount: number;
  lastAdjusted: number;
}

export interface ConstraintStats {
  totalEvaluations: number;
  passCount: number;
  failCount: number;
  modificationCount: number;
  vetoCount: number;
  avgEvaluationTimeMs: number;
  lastEvaluated: number;
}

// ============================================================================
// Guardian Decision Types
// ============================================================================

export interface GuardianReview {
  id: string;
  proposalId: string;
  agentId: string;
  timestamp: number;
  context: GuardianContext;

  // Decision
  decision: GuardianDecision;
  reason: string;
  confidence: number;

  // Constraint results
  constraintResults: Array<{
    constraintId: string;
    result: ConstraintResult;
  }>;

  // Modifications (if any)
  modifications?: Partial<GuardianContext>;

  // Performance
  reviewTimeMs: number;

  // Override
  overridden: boolean;
  overrideReason?: string;
  overrideBy?: string;
}

export interface GuardianFeedback {
  id: string;
  reviewId: string;
  proposalId: string;
  timestamp: number;

  // Feedback data
  decision: GuardianDecision;
  wasCorrect: boolean;
  humanOverride: boolean;
  actualOutcome?: 'success' | 'failure' | 'partial';

  // Human feedback
  notes?: string;
  severity?: ConstraintSeverity;

  // Learning signals
  shouldAdjustWeights: boolean;
  affectedConstraintIds?: string[];
}

// ============================================================================
// Guardian Stats
// ============================================================================

export interface GuardianStats {
  totalReviews: number;
  allows: number;
  modifications: number;
  vetoes: number;
  overrides: number;

  // Accuracy metrics
  truePositives: number; // Correctly blocked
  trueNegatives: number; // Correctly allowed
  falsePositives: number; // Incorrectly blocked
  falseNegatives: number; // Incorrectly allowed

  // Performance
  avgReviewTimeMs: number;
  maxReviewTimeMs: number;
  minReviewTimeMs: number;

  // Constraint stats
  constraintStats: Map<string, ConstraintStats>;

  // Timeline
  lastReviewTime: number;
  reviewsLastHour: number;
  reviewsLastDay: number;
}

export interface GuardianConfig {
  // Guardian settings
  enabled: boolean;
  strictMode: boolean; // If true, veto on any constraint failure
  learningEnabled: boolean;

  // Decision thresholds
  allowThreshold: number; // Confidence threshold for ALLOW
  modifyThreshold: number; // Confidence threshold for MODIFY
  vetoThreshold: number; // Confidence threshold for VETO

  // Resource limits
  maxReviewTimeMs: number;
  maxConcurrentReviews: number;

  // Learning parameters
  learningRate: number; // Weight adjustment rate
  adaptationInterval: number; // How often to adapt (ms)
  minSamplesForAdaptation: number;

  // Override settings
  allowHumanOverride: boolean;
  requireOverrideReason: boolean;
  logAllOverrides: boolean;

  // Constraints
  autoEnableConstraints: boolean;
  constraintUpdateInterval: number;
}

// ============================================================================
// Alert Types
// ============================================================================

export interface GuardianAlert {
  id: string;
  timestamp: number;
  severity: ConstraintSeverity;
  category: string;

  title: string;
  description: string;
  details: Record<string, unknown>;

  // Related entities
  proposalId?: string;
  agentId?: string;
  constraintIds: string[];

  // Resolution
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  resolution?: string;

  // Actions
  actions: Array<{
    type: string;
    description: string;
    executed: boolean;
    executedAt?: number;
    result?: string;
  }>;
}

// ============================================================================
// Execution Monitoring Types
// ============================================================================

export interface ExecutionMonitor {
  proposalId: string;
  agentId: string;
  startTime: number;
  endTime?: number;
  duration?: number;

  // Resource usage
  memoryUsageMB: number;
  cpuUsageMs: number;
  networkIO: number;

  // Status
  status: 'pending' | 'running' | 'completed' | 'failed' | 'vetoed';

  // Guardian decision
  guardianDecision?: GuardianDecision;
  guardianReviewId?: string;

  // Outcome
  outcome?: 'success' | 'failure' | 'timeout' | 'error';
  outcomeDetails?: string;
}

export interface ResourceSnapshot {
  timestamp: number;
  usedMemoryMB: number;
  availableMemoryMB: number;
  cpuPercent: number;
  networkIO: number;
  activeExecutions: number;
  queuedExecutions: number;
}

// ============================================================================
// Learning Types
// ============================================================================

export interface WeightAdjustment {
  constraintId: string;
  oldWeight: number;
  newWeight: number;
  reason: string;
  timestamp: number;
  feedbackId: string;
}

export interface AdaptationResult {
  timestamp: number;
  adjustments: WeightAdjustment[];
  improvements: {
    reducedFalsePositives: number;
    reducedFalseNegatives: number;
    accuracyImprovement: number;
  };
  newAccuracy: number;
}

// ============================================================================
// Guardian State
// ============================================================================

export interface GuardianState {
  config: GuardianConfig;
  stats: GuardianStats;
  alerts: GuardianAlert[];
  activeMonitors: Map<string, ExecutionMonitor>;
  completedMonitors: ExecutionMonitor[];
  resourceSnapshots: ResourceSnapshot[];
  lastAdaptation: number;
  isAdapting: boolean;
}
