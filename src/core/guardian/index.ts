/**
 * POLLN Guardian Angel System - Main Export
 * Shadow agent with veto power for real-time execution monitoring
 *
 * This module integrates the Guardian Angel system with the existing SafetyLayer,
 * providing real-time execution monitoring with ALLOW/MODIFY/VETO decisions.
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Core decision types
  GuardianDecision,
  ConstraintSeverity,
  ConstraintCategory,

  // Context and results
  GuardianContext,
  ConstraintResult,
  GuardianConstraint,
  ConstraintStats,

  // Review and feedback
  GuardianReview,
  GuardianFeedback,

  // Stats and config
  GuardianStats,
  GuardianConfig,

  // Alerts
  GuardianAlert,

  // Monitoring
  ExecutionMonitor,
  ResourceSnapshot,

  // Learning
  WeightAdjustment,
  AdaptationResult,

  // State
  GuardianState,
} from './types.js';

// ============================================================================
// Class Exports
// ============================================================================

export { GuardianAngelAgent } from './guardian-agent.js';
export { GuardianLearningSystem } from './learning.js';

// ============================================================================
// Constraint Exports
// ============================================================================

export {
  // Built-in constraints
  BUILT_IN_CONSTRAINTS,

  // Individual constraints
  memoryLimitConstraint,
  cpuLimitConstraint,
  executionDurationConstraint,
  actionWhitelistConstraint,
  actionBlacklistConstraint,
  fileOperationConstraint,
  agentRateLimitConstraint,
  globalRateLimitConstraint,
  piiDetectionConstraint,
  sensitiveDataConstraint,
  privacyLevelConstraint,
  harmPreventionConstraint,
  biasDetectionConstraint,
  transparencyConstraint,
  outputSizeConstraint,
  outputFormatConstraint,
  maliciousContentConstraint,
  injectionAttackConstraint,
  networkAccessConstraint,
  auditTrailConstraint,
  dataRetentionConstraint,

  // Helpers
  getConstraintsByCategory,
  getConstraintsBySeverity,
  getActiveConstraints,
  getConstraintById,
  CONSTRAINT_CATEGORIES,
} from './constraints.js';

// ============================================================================
// Learning System Exports
// ============================================================================

export type {
  LearningConfig,
  LearningMetrics,
  ConstraintLearningMetrics,
} from './learning.js';

// ============================================================================
// Integration with SafetyLayer
// ============================================================================

import { SafetyLayer } from '../safety.js';
import { GuardianAngelAgent } from './guardian-agent.js';
import type { GuardianContext, GuardianReview } from './types.js';
import type { A2APackage } from '../types.js';

/**
 * Extended safety layer that integrates Guardian Angel
 *
 * The Guardian Angel acts as a real-time shadow agent that monitors
 * all executions with veto power. It extends the existing SafetyLayer
 * with adaptive learning and fine-grained decision making.
 */
export class GuardianIntegratedSafety {
  private safetyLayer: SafetyLayer;
  private guardian: GuardianAngelAgent;
  private integrationEnabled: boolean;

  constructor(
    safetyLayer: SafetyLayer,
    guardianConfig?: Partial<{
      enabled: boolean;
      strictMode: boolean;
      learningEnabled: boolean;
      allowThreshold: number;
      modifyThreshold: number;
      vetoThreshold: number;
    }>
  ) {
    this.safetyLayer = safetyLayer;
    this.guardian = new GuardianAngelAgent(guardianConfig);
    this.integrationEnabled = true;

    // Forward guardian events
    this.guardian.on('review_completed', this.onGuardianReview.bind(this));
    this.guardian.on('alert_created', this.onGuardianAlert.bind(this));
    this.guardian.on('feedback_received', this.onGuardianFeedback.bind(this));
  }

  /**
   * Review an A2A package before execution
   *
   * This integrates with the A2A package system to provide real-time
   * monitoring of all agent communications.
   */
  async reviewPackage(pkg: A2APackage): Promise<GuardianReview> {
    if (!this.integrationEnabled) {
      // Return a default ALLOW review
      return {
        id: '',
        proposalId: pkg.id,
        agentId: pkg.senderId,
        timestamp: pkg.timestamp,
        context: this.createContextFromPackage(pkg),
        decision: 'ALLOW',
        reason: 'Guardian integration disabled',
        confidence: 1.0,
        constraintResults: [],
        reviewTimeMs: 0,
        overridden: false,
      };
    }

    const context = this.createContextFromPackage(pkg);
    return this.guardian.reviewProposal(context);
  }

  /**
   * Create GuardianContext from A2APackage
   */
  private createContextFromPackage(pkg: A2APackage): GuardianContext {
    return {
      proposalId: pkg.id,
      agentId: pkg.senderId,
      action: pkg.type,
      payload: pkg.payload,
      trace: pkg.parentIds,
      metadata: {
        receiverId: pkg.receiverId,
        privacyLevel: pkg.privacyLevel,
        layer: pkg.layer,
        dpMetadata: pkg.dpMetadata,
      },
      timestamp: pkg.timestamp,
      layer: pkg.layer,
      privacyLevel: pkg.privacyLevel,
    };
  }

  /**
   * Monitor execution start
   */
  startExecution(pkg: A2APackage): void {
    const context = this.createContextFromPackage(pkg);
    this.guardian.startExecution(pkg.id, context);
  }

  /**
   * Monitor execution completion
   */
  completeExecution(
    pkg: A2APackage,
    outcome: 'success' | 'failure' | 'timeout' | 'error',
    outcomeDetails?: string
  ): void {
    this.guardian.completeExecution(pkg.id, outcome, outcomeDetails);
  }

  /**
   * Submit feedback on a guardian decision
   */
  async submitFeedback(feedback: {
    reviewId: string;
    proposalId: string;
    wasCorrect: boolean;
    humanOverride: boolean;
    notes?: string;
  }): Promise<void> {
    await this.guardian.submitFeedback({
      id: `feedback-${Date.now()}`,
      reviewId: feedback.reviewId,
      proposalId: feedback.proposalId,
      timestamp: Date.now(),
      decision: 'ALLOW', // Would be determined from review
      wasCorrect: feedback.wasCorrect,
      humanOverride: feedback.humanOverride,
      notes: feedback.notes,
      shouldAdjustWeights: true,
    });
  }

  /**
   * Enable guardian integration
   */
  enableIntegration(): void {
    this.integrationEnabled = true;
    this.guardian.enable();
  }

  /**
   * Disable guardian integration
   */
  disableIntegration(): void {
    this.integrationEnabled = false;
    this.guardian.disable();
  }

  /**
   * Get the guardian agent
   */
  getGuardian(): GuardianAngelAgent {
    return this.guardian;
  }

  /**
   * Get the underlying safety layer
   */
  getSafetyLayer(): SafetyLayer {
    return this.safetyLayer;
  }

  // ========================================================================
  // Event Handlers
  // ========================================================================

  private onGuardianReview(review: GuardianReview): void {
    // Could integrate with audit log here
    console.debug(`[Guardian] Review completed: ${review.decision} for ${review.agentId}`);
  }

  private onGuardianAlert(alert: any): void {
    // Could integrate with escalation system here
    console.warn(`[Guardian] Alert: ${alert.title} - ${alert.description}`);
  }

  private onGuardianFeedback(feedback: any): void {
    // Could trigger additional learning here
    console.debug(`[Guardian] Feedback received for ${feedback.proposalId}`);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a guardian-integrated safety layer
 */
export function createGuardianSafety(
  existingSafetyLayer?: SafetyLayer,
  guardianConfig?: Partial<{
    enabled: boolean;
    strictMode: boolean;
    learningEnabled: boolean;
  }>
): GuardianIntegratedSafety {
  const safetyLayer = existingSafetyLayer || new SafetyLayer();
  return new GuardianIntegratedSafety(safetyLayer, guardianConfig);
}

/**
 * Create a standalone guardian agent
 */
export function createGuardianAgent(config?: {
  strictMode?: boolean;
  learningEnabled?: boolean;
  allowThreshold?: number;
  modifyThreshold?: number;
  vetoThreshold?: number;
}): GuardianAngelAgent {
  return new GuardianAngelAgent(config);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a basic guardian context from minimal data
 */
export function createGuardianContext(data: {
  agentId: string;
  action: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
}): GuardianContext {
  return {
    proposalId: `proposal-${Date.now()}`,
    agentId: data.agentId,
    action: data.action,
    payload: data.payload,
    trace: [],
    metadata: data.metadata || {},
    timestamp: Date.now(),
    layer: 'DELIBERATE',
  };
}

/**
 * Check if a guardian review allows execution
 */
export function isAllowed(review: GuardianReview): boolean {
  return review.decision === 'ALLOW' && !review.overridden;
}

/**
 * Check if a guardian review modifies the execution
 */
export function isModified(review: GuardianReview): boolean {
  return review.decision === 'MODIFY' && !review.overridden;
}

/**
 * Check if a guardian review vetoes the execution
 */
export function isVetoed(review: GuardianReview): boolean {
  return review.decision === 'VETO' && !review.overridden;
}

/**
 * Apply modifications from a guardian review
 */
export function applyModifications(
  context: GuardianContext,
  review: GuardianReview
): GuardianContext {
  if (!review.modifications) {
    return context;
  }

  // Deep merge metadata to preserve existing fields
  const mergedMetadata = {
    ...context.metadata,
    ...(review.modifications.metadata || {}),
  };

  return {
    ...context,
    ...review.modifications,
    metadata: mergedMetadata,
  };
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default guardian configuration
 */
export const DEFAULT_GUARDIAN_CONFIG = {
  enabled: true,
  strictMode: false,
  learningEnabled: true,
  allowThreshold: 0.8,
  modifyThreshold: 0.5,
  vetoThreshold: 0.3,
  maxReviewTimeMs: 5000,
  maxConcurrentReviews: 10,
} as const;

/**
 * Guardian severity levels
 */
export const GUARDIAN_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

/**
 * Guardian decisions
 */
export const GUARDIAN_DECISIONS = {
  ALLOW: 'ALLOW',
  MODIFY: 'MODIFY',
  VETO: 'VETO',
} as const;
