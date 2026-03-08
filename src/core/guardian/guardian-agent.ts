/**
 * POLLN Guardian Angel Agent
 * Shadow agent with veto power for real-time execution monitoring
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import type {
  GuardianContext,
  GuardianConstraint,
  GuardianDecision,
  GuardianReview,
  GuardianFeedback,
  GuardianStats,
  GuardianConfig,
  GuardianAlert,
  ExecutionMonitor,
  ResourceSnapshot,
  ConstraintResult,
  ConstraintStats,
  GuardianState,
} from './types.js';
import { BUILT_IN_CONSTRAINTS } from './constraints.js';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: GuardianConfig = {
  enabled: true,
  strictMode: false,
  learningEnabled: true,

  allowThreshold: 0.8,
  modifyThreshold: 0.5,
  vetoThreshold: 0.3,

  maxReviewTimeMs: 5000,
  maxConcurrentReviews: 10,

  learningRate: 0.1,
  adaptationInterval: 300000, // 5 minutes
  minSamplesForAdaptation: 10,

  allowHumanOverride: true,
  requireOverrideReason: true,
  logAllOverrides: true,

  autoEnableConstraints: true,
  constraintUpdateInterval: 60000, // 1 minute
};

// ============================================================================
// Guardian Angel Agent
// ============================================================================

export class GuardianAngelAgent extends EventEmitter {
  private config: GuardianConfig;
  private state: GuardianState;
  private constraints: Map<string, GuardianConstraint> = new Map();

  constructor(config?: Partial<GuardianConfig>) {
    super();

    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize state
    this.state = {
      config: this.config,
      stats: this.initializeStats(),
      alerts: [],
      activeMonitors: new Map(),
      completedMonitors: [],
      resourceSnapshots: [],
      lastAdaptation: Date.now(),
      isAdapting: false,
    };

    // Initialize constraints
    this.initializeConstraints();
  }

  // ========================================================================
  // Initialization
  // ========================================================================

  private initializeStats(): GuardianStats {
    return {
      totalReviews: 0,
      allows: 0,
      modifications: 0,
      vetoes: 0,
      overrides: 0,

      truePositives: 0,
      trueNegatives: 0,
      falsePositives: 0,
      falseNegatives: 0,

      avgReviewTimeMs: 0,
      maxReviewTimeMs: 0,
      minReviewTimeMs: Infinity,

      constraintStats: new Map(),

      lastReviewTime: 0,
      reviewsLastHour: 0,
      reviewsLastDay: 0,
    };
  }

  private initializeConstraints(): void {
    for (const constraint of BUILT_IN_CONSTRAINTS) {
      this.constraints.set(constraint.id, constraint);
      this.state.stats.constraintStats.set(constraint.id, {
        totalEvaluations: 0,
        passCount: 0,
        failCount: 0,
        modificationCount: 0,
        vetoCount: 0,
        avgEvaluationTimeMs: 0,
        lastEvaluated: 0,
      });
    }
  }

  // ========================================================================
  // Core Review Process
  // ========================================================================

  /**
   * Review a proposal for execution
   */
  async reviewProposal(context: GuardianContext): Promise<GuardianReview> {
    if (!this.config.enabled) {
      return this.createAllowReview(context, 'Guardian disabled');
    }

    const startTime = Date.now();
    const proposalId = context.proposalId || uuidv4();

    // Check concurrent review limit
    if (this.state.activeMonitors.size >= this.config.maxConcurrentReviews) {
      return this.createVetoReview(
        context,
        'Maximum concurrent reviews exceeded',
        'high'
      );
    }

    // Create execution monitor
    const monitor = this.createExecutionMonitor(proposalId, context);
    this.state.activeMonitors.set(proposalId, monitor);

    try {
      // Evaluate all constraints
      const constraintResults = await this.evaluateConstraints(context);

      // Make decision based on constraint results
      const decision = this.makeDecision(constraintResults, context);

      const reviewTime = Date.now() - startTime;

      const review: GuardianReview = {
        id: uuidv4(),
        proposalId,
        agentId: context.agentId,
        timestamp: Date.now(),
        context,
        decision: decision.decision,
        reason: decision.reason,
        confidence: decision.confidence,
        constraintResults,
        modifications: decision.modifications,
        reviewTimeMs: reviewTime,
        overridden: false,
      };

      // Update stats
      this.updateStats(review);

      // Create alert if vetoed
      if (decision.decision === 'VETO') {
        this.createAlert(
          'VETO',
          review,
          decision.severity || 'high',
          `Guardian vetoed proposal: ${decision.reason}`
        );
      }

      // Update monitor
      monitor.guardianDecision = decision.decision;
      monitor.guardianReviewId = review.id;

      this.emit('review_completed', review);

      return review;
    } catch (error) {
      // Error during review - conservative veto
      return this.createVetoReview(
        context,
        `Review error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'high'
      );
    }
  }

  /**
   * Evaluate all constraints against context
   */
  private async evaluateConstraints(
    context: GuardianContext
  ): Promise<Array<{ constraintId: string; result: ConstraintResult }>> {
    const results: Array<{ constraintId: string; result: ConstraintResult }> = [];

    for (const [id, constraint] of Array.from(this.constraints.entries())) {
      if (!constraint.active) continue;

      const startTime = Date.now();

      try {
        const result = await constraint.evaluate(context);
        const evalTime = Date.now() - startTime;

        results.push({ constraintId: id, result });

        // Update constraint stats
        const stats = this.state.stats.constraintStats.get(id);
        if (stats) {
          stats.totalEvaluations++;
          stats.lastEvaluated = Date.now();

          // Update average evaluation time
          stats.avgEvaluationTimeMs =
            (stats.avgEvaluationTimeMs * (stats.totalEvaluations - 1) + evalTime) /
            stats.totalEvaluations;

          if (result.passed) {
            stats.passCount++;
          } else {
            stats.failCount++;
            if (result.decision === 'MODIFY') {
              stats.modificationCount++;
            } else if (result.decision === 'VETO') {
              stats.vetoCount++;
            }
          }
        }
      } catch (error) {
        // Constraint evaluation failed - conservative approach
        results.push({
          constraintId: id,
          result: {
            passed: false,
            decision: 'VETO',
            reason: `Constraint evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'high',
            confidence: 0.5,
          },
        });
      }
    }

    return results;
  }

  /**
   * Make final decision based on constraint results
   */
  private makeDecision(
    constraintResults: Array<{ constraintId: string; result: ConstraintResult }>,
    context: GuardianContext
  ): {
    decision: GuardianDecision;
    reason: string;
    confidence: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    modifications?: Partial<GuardianContext>;
  } {
    // Find failures
    const failures = constraintResults.filter(r => !r.result.passed);
    const vetoes = failures.filter(r => r.result.decision === 'VETO');
    const modifications = failures.filter(r => r.result.decision === 'MODIFY');

    // Strict mode: any failure = veto
    if (this.config.strictMode && failures.length > 0) {
      const criticalFailure = failures.find(
        r => r.result.severity === 'critical'
      );
      return {
        decision: 'VETO',
        reason: criticalFailure
          ? criticalFailure.result.reason
          : `Strict mode: ${failures.length} constraint(s) failed`,
        confidence: 1.0,
        severity: criticalFailure?.result.severity || 'high',
      };
    }

    // Critical or high severity vetoes always block
    const blockingVeto = vetoes.find(
      r => r.result.severity === 'critical' || r.result.severity === 'high'
    );
    if (blockingVeto) {
      return {
        decision: 'VETO',
        reason: blockingVeto.result.reason,
        confidence: blockingVeto.result.confidence,
        severity: blockingVeto.result.severity,
      };
    }

    // Medium severity vetoes
    const mediumVeto = vetoes.find(r => r.result.severity === 'medium');
    if (mediumVeto) {
      return {
        decision: 'VETO',
        reason: mediumVeto.result.reason,
        confidence: mediumVeto.result.confidence,
        severity: 'medium',
      };
    }

    // Modifications suggested
    if (modifications.length > 0) {
      const allModifications = modifications.reduce(
        (acc, m) => ({ ...acc, ...m.result.modifications }),
        {} as Partial<GuardianContext>
      );
      return {
        decision: 'MODIFY',
        reason: modifications.map(m => m.result.reason).join('; '),
        confidence: 0.7,
        modifications: allModifications,
      };
    }

    // All passed
    return {
      decision: 'ALLOW',
      reason: 'All constraints passed',
      confidence: 0.9,
    };
  }

  // ========================================================================
  // Override and Feedback
  // ========================================================================

  /**
   * Override a guardian decision
   */
  overrideDecision(
    reviewId: string,
    overrideReason: string,
    overrideBy: string
  ): boolean {
    // Find the review (in a real system, we'd store reviews)
    // For now, just emit an event
    this.emit('decision_overridden', {
      reviewId,
      reason: overrideReason,
      by: overrideBy,
      timestamp: Date.now(),
    });

    this.state.stats.overrides++;
    return true;
  }

  /**
   * Submit feedback on a guardian decision
   */
  async submitFeedback(feedback: GuardianFeedback): Promise<void> {
    const review = feedback; // In a real system, we'd look up the review

    // Update stats
    if (feedback.decision === 'VETO' && !feedback.wasCorrect) {
      this.state.stats.falsePositives++;
    } else if (feedback.decision === 'ALLOW' && !feedback.wasCorrect) {
      this.state.stats.falseNegatives++;
    } else if (feedback.wasCorrect) {
      if (feedback.decision === 'VETO') {
        this.state.stats.truePositives++;
      } else {
        this.state.stats.trueNegatives++;
      }
    }

    // Update constraint stats
    if (feedback.affectedConstraintIds) {
      for (const constraintId of feedback.affectedConstraintIds) {
        const constraint = this.constraints.get(constraintId);
        if (constraint) {
          if (!feedback.wasCorrect) {
            if (feedback.decision === 'VETO') {
              constraint.falsePositiveCount++;
            } else {
              constraint.falseNegativeCount++;
            }
          }
        }
      }
    }

    this.emit('feedback_received', feedback);

    // Trigger adaptation if enabled
    if (this.config.learningEnabled && feedback.shouldAdjustWeights) {
      await this.adaptFromFeedback(feedback);
    }
  }

  // ========================================================================
  // Learning and Adaptation
  // ========================================================================

  /**
   * Adapt constraint weights based on feedback
   */
  private async adaptFromFeedback(feedback: GuardianFeedback): Promise<void> {
    if (!this.config.learningEnabled) return;
    if (this.state.isAdapting) return;

    const now = Date.now();
    if (now - this.state.lastAdaptation < this.config.adaptationInterval) {
      return;
    }

    this.state.isAdapting = true;

    try {
      if (feedback.affectedConstraintIds) {
        for (const constraintId of feedback.affectedConstraintIds) {
          const constraint = this.constraints.get(constraintId);
          if (!constraint || !constraint.adaptiveWeight) continue;

          const oldWeight = constraint.weight;
          const learningRate = this.config.learningRate;

          // Adjust weight based on feedback
          if (!feedback.wasCorrect) {
            if (feedback.decision === 'VETO') {
              // False positive - reduce weight
              constraint.weight = Math.max(
                0.1,
                constraint.weight * (1 - learningRate)
              );
            } else {
              // False negative - increase weight
              constraint.weight = Math.min(
                2.0,
                constraint.weight * (1 + learningRate)
              );
            }
          }

          constraint.lastAdjusted = now;

          this.emit('weight_adjusted', {
            constraintId,
            oldWeight,
            newWeight: constraint.weight,
            feedbackId: feedback.id,
          });
        }
      }

      this.state.lastAdaptation = now;
    } finally {
      this.state.isAdapting = false;
    }
  }

  // ========================================================================
  // Execution Monitoring
  // ========================================================================

  /**
   * Start monitoring an execution
   */
  startExecution(proposalId: string, context: GuardianContext): ExecutionMonitor {
    const monitor = this.createExecutionMonitor(proposalId, context);
    monitor.status = 'running';
    this.state.activeMonitors.set(proposalId, monitor);
    return monitor;
  }

  /**
   * Complete execution monitoring
   */
  completeExecution(
    proposalId: string,
    outcome: 'success' | 'failure' | 'timeout' | 'error',
    outcomeDetails?: string
  ): void {
    const monitor = this.state.activeMonitors.get(proposalId);
    if (!monitor) return;

    monitor.endTime = Date.now();
    monitor.duration = monitor.endTime - monitor.startTime;
    monitor.status = outcome === 'success' ? 'completed' : 'failed';
    monitor.outcome = outcome;
    monitor.outcomeDetails = outcomeDetails;

    this.state.completedMonitors.push(monitor);
    this.state.activeMonitors.delete(proposalId);

    // Take resource snapshot
    this.takeResourceSnapshot();
  }

  private createExecutionMonitor(
    proposalId: string,
    context: GuardianContext
  ): ExecutionMonitor {
    return {
      proposalId,
      agentId: context.agentId,
      startTime: Date.now(),
      memoryUsageMB: context.estimatedMemoryMB || 0,
      cpuUsageMs: context.estimatedCpuMs || 0,
      networkIO: 0,
      status: 'pending',
    };
  }

  private takeResourceSnapshot(): ResourceSnapshot {
    const snapshot: ResourceSnapshot = {
      timestamp: Date.now(),
      usedMemoryMB: process.memoryUsage().heapUsed / 1024 / 1024,
      availableMemoryMB: process.memoryUsage().heapTotal / 1024 / 1024,
      cpuPercent: 0, // Would need actual CPU monitoring
      networkIO: 0,
      activeExecutions: this.state.activeMonitors.size,
      queuedExecutions: 0,
    };

    this.state.resourceSnapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (this.state.resourceSnapshots.length > 100) {
      this.state.resourceSnapshots.shift();
    }

    return snapshot;
  }

  // ========================================================================
  // Alert Management
  // ========================================================================

  private createAlert(
    type: string,
    review: GuardianReview,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string
  ): void {
    const alert: GuardianAlert = {
      id: uuidv4(),
      timestamp: Date.now(),
      severity,
      category: review.context.action,
      title: `Guardian ${type}: ${review.agentId}`,
      description,
      details: {
        reviewId: review.id,
        proposalId: review.proposalId,
        decision: review.decision,
        confidence: review.confidence,
      },
      proposalId: review.proposalId,
      agentId: review.agentId,
      constraintIds: review.constraintResults.map(r => r.constraintId),
      resolved: false,
      actions: [],
    };

    this.state.alerts.push(alert);
    this.emit('alert_created', alert);
  }

  // ========================================================================
  // Statistics and State
  // ========================================================================

  private updateStats(review: GuardianReview): void {
    const stats = this.state.stats;

    stats.totalReviews++;
    stats.lastReviewTime = review.timestamp;

    // Update decision counts
    if (review.decision === 'ALLOW') {
      stats.allows++;
    } else if (review.decision === 'MODIFY') {
      stats.modifications++;
    } else if (review.decision === 'VETO') {
      stats.vetoes++;
    }

    // Update timing stats
    stats.avgReviewTimeMs =
      (stats.avgReviewTimeMs * (stats.totalReviews - 1) + review.reviewTimeMs) /
      stats.totalReviews;
    stats.maxReviewTimeMs = Math.max(stats.maxReviewTimeMs, review.reviewTimeMs);
    stats.minReviewTimeMs = Math.min(stats.minReviewTimeMs, review.reviewTimeMs);

    // Update time-based counts
    const oneHourAgo = Date.now() - 3600000;
    const oneDayAgo = Date.now() - 86400000;

    // In a real system, we'd filter actual reviews by time
    // For now, just increment
    stats.reviewsLastHour++;
    stats.reviewsLastDay++;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private createAllowReview(
    context: GuardianContext,
    reason: string
  ): GuardianReview {
    return {
      id: uuidv4(),
      proposalId: context.proposalId,
      agentId: context.agentId,
      timestamp: Date.now(),
      context,
      decision: 'ALLOW',
      reason,
      confidence: 1.0,
      constraintResults: [],
      reviewTimeMs: 0,
      overridden: false,
    };
  }

  private createVetoReview(
    context: GuardianContext,
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): GuardianReview {
    return {
      id: uuidv4(),
      proposalId: context.proposalId,
      agentId: context.agentId,
      timestamp: Date.now(),
      context,
      decision: 'VETO',
      reason,
      confidence: 1.0,
      constraintResults: [],
      reviewTimeMs: 0,
      overridden: false,
    };
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Get current statistics
   */
  getStats(): GuardianStats {
    return { ...this.state.stats };
  }

  /**
   * Get all constraints
   */
  getConstraints(): GuardianConstraint[] {
    return Array.from(this.constraints.values());
  }

  /**
   * Get constraint by ID
   */
  getConstraint(id: string): GuardianConstraint | undefined {
    return this.constraints.get(id);
  }

  /**
   * Add custom constraint
   */
  addConstraint(constraint: GuardianConstraint): void {
    this.constraints.set(constraint.id, constraint);
    this.state.stats.constraintStats.set(constraint.id, {
      totalEvaluations: 0,
      passCount: 0,
      failCount: 0,
      modificationCount: 0,
      vetoCount: 0,
      avgEvaluationTimeMs: 0,
      lastEvaluated: 0,
    });
    this.emit('constraint_added', constraint);
  }

  /**
   * Remove constraint
   */
  removeConstraint(id: string): boolean {
    const deleted = this.constraints.delete(id);
    if (deleted) {
      this.state.stats.constraintStats.delete(id);
      this.emit('constraint_removed', id);
    }
    return deleted;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GuardianConfig>): void {
    this.config = { ...this.config, ...config };
    this.state.config = this.config;
    this.emit('config_updated', this.config);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): GuardianAlert[] {
    return this.state.alerts.filter(a => !a.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy: string, resolution: string): boolean {
    const alert = this.state.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    alert.resolvedBy = resolvedBy;
    alert.resolution = resolution;

    this.emit('alert_resolved', alert);
    return true;
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): ExecutionMonitor[] {
    return Array.from(this.state.activeMonitors.values());
  }

  /**
   * Get completed executions
   */
  getCompletedExecutions(limit?: number): ExecutionMonitor[] {
    return limit !== undefined ? this.state.completedMonitors.slice(-limit) : this.state.completedMonitors;
  }

  /**
   * Get resource history
   */
  getResourceHistory(limit?: number): ResourceSnapshot[] {
    return limit !== undefined ? this.state.resourceSnapshots.slice(-limit) : this.state.resourceSnapshots;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.state.stats = this.initializeStats();
    this.emit('stats_reset');
  }

  /**
   * Enable guardian
   */
  enable(): void {
    this.config.enabled = true;
    this.emit('enabled');
  }

  /**
   * Disable guardian
   */
  disable(): void {
    this.config.enabled = false;
    this.emit('disabled');
  }

  /**
   * Check if guardian is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enter strict mode
   */
  enableStrictMode(): void {
    this.config.strictMode = true;
    this.emit('strict_mode_enabled');
  }

  /**
   * Exit strict mode
   */
  disableStrictMode(): void {
    this.config.strictMode = false;
    this.emit('strict_mode_disabled');
  }
}
