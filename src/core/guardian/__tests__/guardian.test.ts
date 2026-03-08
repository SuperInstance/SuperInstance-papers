/**
 * Guardian Angel Safety System Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  GuardianAngelAgent,
  GuardianLearningSystem,
  createGuardianSafety,
  createGuardianAgent,
  createGuardianContext,
  isAllowed,
  isModified,
  isVetoed,
  applyModifications,
  BUILT_IN_CONSTRAINTS,
  getConstraintsByCategory,
} from '../index.js';

describe('Guardian Angel Safety System', () => {
  describe('GuardianAngelAgent', () => {
    let guardian: GuardianAngelAgent;

    beforeEach(() => {
      guardian = new GuardianAngelAgent({
        enabled: true,
        strictMode: false,
        learningEnabled: true,
      });
    });

    it('should create a guardian agent', () => {
      expect(guardian).toBeDefined();
      expect(guardian.isEnabled()).toBe(true);
    });

    it('should review a proposal and allow it', async () => {
      const context = createGuardianContext({
        agentId: 'agent-1',
        action: 'analyze',
        payload: { data: 'test' },
      });

      const review = await guardian.reviewProposal(context);

      expect(review).toBeDefined();
      expect(review.decision).toBeDefined();
      expect(['ALLOW', 'MODIFY', 'VETO']).toContain(review.decision);
    });

    it('should veto dangerous actions', async () => {
      const context = createGuardianContext({
        agentId: 'agent-1',
        action: 'delete_system_files',
        payload: { path: '/etc/passwd' },
      });

      const review = await guardian.reviewProposal(context);

      expect(review.decision).toBe('VETO');
    });

    it('should track statistics', async () => {
      const initialStats = guardian.getStats();
      expect(initialStats.totalReviews).toBe(0);

      const context = createGuardianContext({
        agentId: 'agent-1',
        action: 'analyze',
        payload: { data: 'test' },
      });

      await guardian.reviewProposal(context);

      const newStats = guardian.getStats();
      expect(newStats.totalReviews).toBeGreaterThan(initialStats.totalReviews);
    });

    it('should allow human override', () => {
      const result = guardian.overrideDecision(
        'review-1',
        'False positive - action was safe',
        'human-admin'
      );

      expect(result).toBe(true);

      const stats = guardian.getStats();
      expect(stats.overrides).toBeGreaterThan(0);
    });

    it('should handle feedback', async () => {
      const feedback = {
        id: 'feedback-1',
        reviewId: 'review-1',
        proposalId: 'proposal-1',
        timestamp: Date.now(),
        decision: 'ALLOW' as const,
        wasCorrect: true,
        humanOverride: false,
        shouldAdjustWeights: true,
      };

      await guardian.submitFeedback(feedback);

      // Feedback should be processed without errors
      expect(true).toBe(true);
    });

    it('should support strict mode', () => {
      guardian.enableStrictMode();
      expect(guardian.isEnabled()).toBe(true);

      guardian.disableStrictMode();
      expect(guardian.isEnabled()).toBe(true);
    });

    it('should manage constraints', () => {
      const constraints = guardian.getConstraints();
      expect(constraints.length).toBeGreaterThan(0);

      const allConstraints = getConstraintsByCategory('resource_limits');
      expect(allConstraints.length).toBeGreaterThan(0);
    });
  });

  describe('GuardianLearningSystem', () => {
    let learning: GuardianLearningSystem;

    beforeEach(() => {
      learning = new GuardianLearningSystem({
        enabled: true,
        learningRate: 0.1,
        minSamplesForAdaptation: 5,
      });
    });

    it('should create a learning system', () => {
      expect(learning).toBeDefined();
      expect(learning.isEnabled()).toBe(true);
    });

    it('should add feedback', () => {
      const feedback = {
        id: 'feedback-1',
        reviewId: 'review-1',
        proposalId: 'proposal-1',
        timestamp: Date.now(),
        decision: 'ALLOW' as const,
        wasCorrect: true,
        humanOverride: false,
        shouldAdjustWeights: true,
      };

      learning.addFeedback(feedback);
      expect(learning.getBufferSize()).toBe(1);
    });

    it('should process feedback when enough samples are available', async () => {
      // Add multiple feedback entries
      for (let i = 0; i < 10; i++) {
        const feedback = {
          id: `feedback-${i}`,
          reviewId: `review-${i}`,
          proposalId: `proposal-${i}`,
          timestamp: Date.now(),
          decision: 'ALLOW' as const,
          wasCorrect: i % 2 === 0,
          humanOverride: false,
          shouldAdjustWeights: true,
        };

        learning.addFeedback(feedback);
      }

      const result = await learning.processFeedback();
      expect(result).toBeDefined();
    });

    it('should track learning metrics', () => {
      const metrics = learning.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalFeedback).toBe(0);
      expect(metrics.processedFeedback).toBe(0);
    });

    it('should enable and disable', () => {
      learning.disable();
      expect(learning.isEnabled()).toBe(false);

      learning.enable();
      expect(learning.isEnabled()).toBe(true);
    });
  });

  describe('Factory Functions', () => {
    it('should create guardian with factory', () => {
      const guardian = createGuardianAgent({
        strictMode: true,
        learningEnabled: true,
      });

      expect(guardian).toBeDefined();
      expect(guardian.isEnabled()).toBe(true);
    });

    it('should create guardian context from minimal data', () => {
      const context = createGuardianContext({
        agentId: 'agent-1',
        action: 'test',
        payload: { data: 'value' },
      });

      expect(context).toBeDefined();
      expect(context.agentId).toBe('agent-1');
      expect(context.action).toBe('test');
      expect(context.proposalId).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    it('should check if review is allowed', () => {
      const review = {
        id: 'review-1',
        proposalId: 'proposal-1',
        agentId: 'agent-1',
        timestamp: Date.now(),
        context: createGuardianContext({
          agentId: 'agent-1',
          action: 'test',
          payload: {},
        }),
        decision: 'ALLOW' as const,
        reason: 'Safe',
        confidence: 0.9,
        constraintResults: [],
        reviewTimeMs: 10,
        overridden: false,
      };

      expect(isAllowed(review)).toBe(true);
      expect(isModified(review)).toBe(false);
      expect(isVetoed(review)).toBe(false);
    });

    it('should check if review is modified', () => {
      const review = {
        id: 'review-1',
        proposalId: 'proposal-1',
        agentId: 'agent-1',
        timestamp: Date.now(),
        context: createGuardianContext({
          agentId: 'agent-1',
          action: 'test',
          payload: {},
        }),
        decision: 'MODIFY' as const,
        reason: 'Needs modification',
        confidence: 0.7,
        constraintResults: [],
        reviewTimeMs: 10,
        overridden: false,
        modifications: { estimatedMemoryMB: 100 },
      };

      expect(isAllowed(review)).toBe(false);
      expect(isModified(review)).toBe(true);
      expect(isVetoed(review)).toBe(false);
    });

    it('should check if review is vetoed', () => {
      const review = {
        id: 'review-1',
        proposalId: 'proposal-1',
        agentId: 'agent-1',
        timestamp: Date.now(),
        context: createGuardianContext({
          agentId: 'agent-1',
          action: 'test',
          payload: {},
        }),
        decision: 'VETO' as const,
        reason: 'Dangerous',
        confidence: 0.95,
        constraintResults: [],
        reviewTimeMs: 10,
        overridden: false,
      };

      expect(isAllowed(review)).toBe(false);
      expect(isModified(review)).toBe(false);
      expect(isVetoed(review)).toBe(true);
    });

    it('should apply modifications to context', () => {
      const context = createGuardianContext({
        agentId: 'agent-1',
        action: 'test',
        payload: {},
        metadata: { original: 'value' },
      });

      const review = {
        id: 'review-1',
        proposalId: 'proposal-1',
        agentId: 'agent-1',
        timestamp: Date.now(),
        context,
        decision: 'MODIFY' as const,
        reason: 'Needs modification',
        confidence: 0.7,
        constraintResults: [],
        reviewTimeMs: 10,
        overridden: false,
        modifications: {
          estimatedMemoryMB: 200,
          metadata: { modified: 'value' },
        },
      };

      const modifiedContext = applyModifications(context, review);

      expect(modifiedContext.estimatedMemoryMB).toBe(200);
      expect(modifiedContext.metadata.original).toBe('value');
      expect(modifiedContext.metadata.modified).toBe('value');
    });

    it('should handle overridden reviews', () => {
      const review = {
        id: 'review-1',
        proposalId: 'proposal-1',
        agentId: 'agent-1',
        timestamp: Date.now(),
        context: createGuardianContext({
          agentId: 'agent-1',
          action: 'test',
          payload: {},
        }),
        decision: 'VETO' as const,
        reason: 'Dangerous',
        confidence: 0.95,
        constraintResults: [],
        reviewTimeMs: 10,
        overridden: true,
      };

      // Overridden vetoes should appear as allowed
      expect(isVetoed(review)).toBe(false);
    });
  });

  describe('Built-in Constraints', () => {
    it('should have all constraint categories', () => {
      const categories = [
        'resource_limits',
        'action_control',
        'rate_limiting',
        'privacy_protection',
        'ethical_guidelines',
        'output_validation',
        'security',
        'compliance',
      ];

      for (const category of categories) {
        const constraints = getConstraintsByCategory(category as any);
        expect(constraints.length).toBeGreaterThan(0);
      }
    });

    it('should have resource limit constraints', () => {
      const constraints = getConstraintsByCategory('resource_limits');
      expect(constraints.length).toBe(3); // memory, cpu, duration
    });

    it('should have action control constraints', () => {
      const constraints = getConstraintsByCategory('action_control');
      expect(constraints.length).toBe(3); // whitelist, blacklist, file ops
    });

    it('should have security constraints', () => {
      const constraints = getConstraintsByCategory('security');
      expect(constraints.length).toBe(2); // injection, network
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete review lifecycle', async () => {
      const guardian = createGuardianAgent({
        learningEnabled: true,
      });

      // Create context
      const context = createGuardianContext({
        agentId: 'agent-1',
        action: 'analyze',
        payload: { data: 'test' },
        metadata: { priority: 'high' },
      });

      // Review proposal
      const review = await guardian.reviewProposal(context);

      expect(review).toBeDefined();
      expect(review.agentId).toBe('agent-1');
      expect(review.decision).toBeDefined();

      // Submit feedback
      const feedback = {
        id: 'feedback-1',
        reviewId: review.id,
        proposalId: review.proposalId,
        timestamp: Date.now(),
        decision: review.decision,
        wasCorrect: true,
        humanOverride: false,
        shouldAdjustWeights: true,
      };

      await guardian.submitFeedback(feedback);

      // Check stats updated
      const stats = guardian.getStats();
      expect(stats.totalReviews).toBeGreaterThan(0);
    });

    it('should handle multiple concurrent reviews', async () => {
      const guardian = createGuardianAgent({
        maxConcurrentReviews: 5,
      });

      const contexts = Array.from({ length: 3 }, (_, i) =>
        createGuardianContext({
          agentId: `agent-${i}`,
          action: 'analyze',
          payload: { index: i },
        })
      );

      const reviews = await Promise.all(
        contexts.map(ctx => guardian.reviewProposal(ctx))
      );

      expect(reviews).toHaveLength(3);
      expect(reviews.every(r => r.decision !== undefined)).toBe(true);
    });

    it('should respect strict mode', async () => {
      const guardian = createGuardianAgent({
        strictMode: true,
      });

      const context = createGuardianContext({
        agentId: 'agent-1',
        action: 'analyze',
        payload: { data: 'test' },
      });

      // In strict mode, even minor issues should trigger veto
      // But analyze action should be safe
      const review = await guardian.reviewProposal(context);
      expect(review.decision).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should complete reviews quickly', async () => {
      const guardian = createGuardianAgent();

      const context = createGuardianContext({
        agentId: 'agent-1',
        action: 'analyze',
        payload: { data: 'test' },
      });

      const startTime = Date.now();
      const review = await guardian.reviewProposal(context);
      const duration = Date.now() - startTime;

      expect(review).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle high throughput', async () => {
      const guardian = createGuardianAgent({
        maxConcurrentReviews: 100,
      });

      const contexts = Array.from({ length: 50 }, (_, i) =>
        createGuardianContext({
          agentId: `agent-${i}`,
          action: 'analyze',
          payload: { index: i },
        })
      );

      const startTime = Date.now();
      const reviews = await Promise.all(
        contexts.map(ctx => guardian.reviewProposal(ctx))
      );
      const duration = Date.now() - startTime;

      expect(reviews).toHaveLength(50);
      expect(duration).toBeLessThan(5000); // Should complete 50 reviews in under 5 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid context gracefully', async () => {
      const guardian = createGuardianAgent();

      const invalidContext = createGuardianContext({
        agentId: '',
        action: '',
        payload: null,
      });

      const review = await guardian.reviewProposal(invalidContext);
      expect(review).toBeDefined();
    });

    it('should handle missing feedback gracefully', async () => {
      const guardian = createGuardianAgent();

      const invalidFeedback = {
        id: 'feedback-1',
        reviewId: 'nonexistent',
        proposalId: 'nonexistent',
        timestamp: Date.now(),
        decision: 'ALLOW' as const,
        wasCorrect: true,
        humanOverride: false,
        shouldAdjustWeights: true,
      };

      // Should not throw
      await expect(guardian.submitFeedback(invalidFeedback)).resolves.not.toThrow();
    });
  });
});
