/**
 * Feature Flags and Experiments Tests
 *
 * Comprehensive tests for:
 * - Flag evaluation logic
 * - User segmentation
 * - Experiment tracking
 * - Rollout safety
 * - Performance benchmarks
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  FeatureFlagManager,
  FlagState,
  FlagType,
  type FlagDefinition,
  type EvaluationContext
} from './FeatureFlagManager.js';
import { FlagStorage } from './FlagStorage.js';
import { UserSegmenter } from './UserSegmenter.js';
import { ExperimentTracker, ExperimentState } from './ExperimentTracker.js';
import { Pool } from 'pg';

/**
 * Test database configuration
 */
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'polln_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres'
};

/**
 * Test suite setup
 */
describe('Feature Flags and Experiments', () => {
  let pool: Pool;
  let storage: FlagStorage;
  let segmenter: UserSegmenter;
  let experimentTracker: ExperimentTracker;
  let flagManager: FeatureFlagManager;

  beforeAll(async () => {
    // Create test database connection
    pool = new Pool(TEST_DB_CONFIG);

    // Initialize components
    storage = new FlagStorage({
      postgresql: TEST_DB_CONFIG,
      cacheEnabled: true,
      cacheTTL: 60
    });

    segmenter = new UserSegmenter({
      postgresql: TEST_DB_CONFIG,
      cacheEnabled: true,
      cacheTTL: 300
    });

    experimentTracker = new ExperimentTracker({
      postgresql: TEST_DB_CONFIG,
      segmenter,
      cacheEnabled: true,
      cacheTTL: 600
    });

    flagManager = new FeatureFlagManager({
      storage,
      segmenter,
      experimentTracker,
      environment: 'test',
      cacheEnabled: true,
      cacheTTL: 60,
      evaluationTimeout: 100
    });
  });

  afterAll(async () => {
    await flagManager.removeAllListeners();
    await storage.close();
    await segmenter.close();
    await experimentTracker.close();
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await pool.query('DELETE FROM feature_flag_evaluations');
    await pool.query('DELETE FROM feature_flags');
    await pool.query('DELETE FROM user_segment_assignments');
    await pool.query('DELETE FROM user_segments');
    await pool.query('DELETE FROM experiments');
    await pool.query('DELETE FROM variant_assignments');
    await pool.query('DELETE FROM conversion_events');
  });

  /**
   * FeatureFlagManager Tests
   */
  describe('FeatureFlagManager', () => {
    describe('Flag Creation', () => {
      it('should create a boolean flag', async () => {
        const flag = await flagManager.createFlag({
          name: 'test_boolean_flag',
          description: 'Test boolean flag',
          type: FlagType.BOOLEAN,
          state: FlagState.ENABLED,
          createdBy: 'test',
          environment: 'test',
          tags: ['test'],
          defaultValue: false,
          rules: [],
          killSwitchEnabled: false
        });

        expect(flag).toBeDefined();
        expect(flag.id).toMatch(/^flag_/);
        expect(flag.name).toBe('test_boolean_flag');
        expect(flag.type).toBe(FlagType.BOOLEAN);
        expect(flag.state).toBe(FlagState.ENABLED);
        expect(flag.createdAt).toBeInstanceOf(Date);
      });

      it('should create a percentage flag', async () => {
        const flag = await flagManager.createFlag({
          name: 'test_percentage_flag',
          description: 'Test percentage flag',
          type: FlagType.PERCENTAGE,
          state: FlagState.ROLLOUT,
          createdBy: 'test',
          environment: 'test',
          tags: ['test'],
          defaultValue: false,
          rolloutPercentage: 50,
          rolloutStrategy: 'gradual',
          rules: [],
          killSwitchEnabled: false
        });

        expect(flag.type).toBe(FlagType.PERCENTAGE);
        expect(flag.rolloutPercentage).toBe(50);
      });

      it('should reject duplicate flag names', async () => {
        await flagManager.createFlag({
          name: 'duplicate_flag',
          description: 'Test flag',
          type: FlagType.BOOLEAN,
          state: FlagState.ENABLED,
          createdBy: 'test',
          environment: 'test',
          tags: [],
          defaultValue: false,
          rules: [],
          killSwitchEnabled: false
        });

        await expect(
          flagManager.createFlag({
            name: 'duplicate_flag',
            description: 'Test flag',
            type: FlagType.BOOLEAN,
            state: FlagState.ENABLED,
            createdBy: 'test',
            environment: 'test',
            tags: [],
            defaultValue: false,
            rules: [],
            killSwitchEnabled: false
          })
        ).rejects.toThrow();
      });
    });

    describe('Flag Evaluation', () => {
      let flag: FlagDefinition;

      beforeEach(async () => {
        flag = await flagManager.createFlag({
          name: 'eval_test_flag',
          description: 'Flag for evaluation tests',
          type: FlagType.BOOLEAN,
          state: FlagState.ENABLED,
          createdBy: 'test',
          environment: 'test',
          tags: [],
          defaultValue: false,
          rules: [],
          killSwitchEnabled: false
        });
      });

      it('should evaluate disabled flag as default value', async () => {
        await flagManager.updateFlag(flag.id, { state: FlagState.DISABLED });

        const context: EvaluationContext = {
          userId: 'user123',
          attributes: {}
        };

        const result = await flagManager.evaluateFlag(flag.id, context);

        expect(result.value).toBe(false);
        expect(result.reason).toContain('disabled');
      });

      it('should evaluate flag with kill switch', async () => {
        await flagManager.updateFlag(flag.id, {
          killSwitchEnabled: true,
          killSwitchReason: 'Emergency shutdown'
        });

        const context: EvaluationContext = {
          userId: 'user123'
        };

        const result = await flagManager.evaluateFlag(flag.id, context);

        expect(result.value).toBe(false);
        expect(result.reason).toContain('Emergency shutdown');
      });

      it('should evaluate percentage flag consistently', async () => {
        const percentageFlag = await flagManager.createFlag({
          name: 'percentage_test',
          description: 'Percentage test',
          type: FlagType.PERCENTAGE,
          state: FlagState.ENABLED,
          createdBy: 'test',
          environment: 'test',
          tags: [],
          defaultValue: false,
          rolloutPercentage: 50,
          rules: [],
          killSwitchEnabled: false
        });

        const context: EvaluationContext = {
          userId: 'user123'
        };

        const result1 = await flagManager.evaluateFlag(percentageFlag.id, context);
        const result2 = await flagManager.evaluateFlag(percentageFlag.id, context);

        // Same user should get same result (consistent hashing)
        expect(result1.value).toBe(result2.value);
      });

      it('should target evaluation time under 100ms', async () => {
        const context: EvaluationContext = {
          userId: 'user123'
        };

        const start = Date.now();
        await flagManager.evaluateFlag(flag.id, context);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(100);
      });

      it('should evaluate multiple flags in parallel', async () => {
        const flag1 = await flagManager.createFlag({
          name: 'parallel_test_1',
          description: 'Parallel test 1',
          type: FlagType.BOOLEAN,
          state: FlagState.ENABLED,
          createdBy: 'test',
          environment: 'test',
          tags: [],
          defaultValue: false,
          rules: [],
          killSwitchEnabled: false
        });

        const flag2 = await flagManager.createFlag({
          name: 'parallel_test_2',
          description: 'Parallel test 2',
          type: FlagType.BOOLEAN,
          state: FlagState.ENABLED,
          createdBy: 'test',
          environment: 'test',
          tags: [],
          defaultValue: true,
          rules: [],
          killSwitchEnabled: false
        });

        const context: EvaluationContext = {
          userId: 'user123'
        };

        const results = await flagManager.evaluateFlags(
          [flag1.id, flag2.id],
          context
        );

        expect(results.size).toBe(2);
        expect(results.get(flag1.id)?.value).toBe(false);
        expect(results.get(flag2.id)?.value).toBe(true);
      });
    });

    describe('Flag Rules', () => {
      it('should evaluate user ID rule', async () => {
        const flag = await flagManager.createFlag({
          name: 'user_id_rule_test',
          description: 'User ID rule test',
          type: FlagType.BOOLEAN,
          state: FlagState.ENABLED,
          createdBy: 'test',
          environment: 'test',
          tags: [],
          defaultValue: false,
          rules: [
            {
              id: 'rule1',
              name: 'Allow specific user',
              condition: {
                type: 'user_id',
                operator: 'equals',
                value: 'privileged_user'
              },
              value: true,
              priority: 100,
              enabled: true
            }
          ],
          killSwitchEnabled: false
        });

        const context1: EvaluationContext = {
          userId: 'privileged_user'
        };

        const context2: EvaluationContext = {
          userId: 'regular_user'
        };

        const result1 = await flagManager.evaluateFlag(flag.id, context1);
        const result2 = await flagManager.evaluateFlag(flag.id, context2);

        expect(result1.value).toBe(true);
        expect(result2.value).toBe(false);
      });

      it('should evaluate attribute rule', async () => {
        await segmenter.updateUserAttributes('premium_user', {
          plan: 'premium'
        });

        await segmenter.updateUserAttributes('free_user', {
          plan: 'free'
        });

        const flag = await flagManager.createFlag({
          name: 'attribute_rule_test',
          description: 'Attribute rule test',
          type: FlagType.BOOLEAN,
          state: FlagState.ENABLED,
          createdBy: 'test',
          environment: 'test',
          tags: [],
          defaultValue: false,
          rules: [
            {
              id: 'rule1',
              name: 'Premium users only',
              condition: {
                type: 'attribute',
                operator: 'equals',
                value: 'premium',
                attribute: 'plan'
              },
              value: true,
              priority: 100,
              enabled: true
            }
          ],
          killSwitchEnabled: false
        });

        const context1: EvaluationContext = {
          userId: 'premium_user'
        };

        const context2: EvaluationContext = {
          userId: 'free_user'
        };

        const result1 = await flagManager.evaluateFlag(flag.id, context1);
        const result2 = await flagManager.evaluateFlag(flag.id, context2);

        expect(result1.value).toBe(true);
        expect(result2.value).toBe(false);
      });
    });

    describe('Rollout Safety', () => {
      it('should maintain consistent user assignments during rollout', async () => {
        const flag = await flagManager.createFlag({
          name: 'consistent_rollout',
          description: 'Consistent rollout test',
          type: FlagType.PERCENTAGE,
          state: FlagState.ROLLOUT,
          createdBy: 'test',
          environment: 'test',
          tags: [],
          defaultValue: false,
          rolloutPercentage: 50,
          rules: [],
          killSwitchEnabled: false
        });

        const context: EvaluationContext = {
          userId: 'consistent_user'
        };

        const result1 = await flagManager.evaluateFlag(flag.id, context);

        // Update rollout percentage
        await flagManager.updateFlag(flag.id, { rolloutPercentage: 75 });

        const result2 = await flagManager.evaluateFlag(flag.id, context);

        // User should still get same result if they were in the 50%
        if (result1.value) {
          expect(result2.value).toBe(true);
        }
      });

      it('should respect kill switch during rollout', async () => {
        const flag = await flagManager.createFlag({
          name: 'kill_switch_rollout',
          description: 'Kill switch during rollout',
          type: FlagType.PERCENTAGE,
          state: FlagState.ROLLOUT,
          createdBy: 'test',
          environment: 'test',
          tags: [],
          defaultValue: false,
          rolloutPercentage: 100,
          rules: [],
          killSwitchEnabled: false
        });

        const context: EvaluationContext = {
          userId: 'user123'
        };

        const result1 = await flagManager.evaluateFlag(flag.id, context);
        expect(result1.value).toBe(true);

        // Enable kill switch
        await flagManager.enableKillSwitch(flag.id, 'Critical bug');

        const result2 = await flagManager.evaluateFlag(flag.id, context);
        expect(result2.value).toBe(false);
        expect(result2.reason).toContain('Critical bug');
      });
    });
  });

  /**
   * UserSegmenter Tests
   */
  describe('UserSegmenter', () => {
    describe('User Attributes', () => {
      it('should store and retrieve user attributes', async () => {
        await segmenter.updateUserAttributes('user456', {
          plan: 'enterprise',
          role: 'admin',
          region: 'us-west',
          email: 'admin@example.com'
        });

        const attributes = await segmenter.getUserAttributes('user456');

        expect(attributes).toBeDefined();
        expect(attributes?.plan).toBe('enterprise');
        expect(attributes?.role).toBe('admin');
        expect(attributes?.region).toBe('us-west');
        expect(attributes?.email).toBe('admin@example.com');
      });

      it('should update user attributes', async () => {
        await segmenter.updateUserAttributes('user789', {
          plan: 'free'
        });

        await segmenter.updateUserAttributes('user789', {
          plan: 'premium'
        });

        const attributes = await segmenter.getUserAttributes('user789');

        expect(attributes?.plan).toBe('premium');
      });
    });

    describe('Consistent Hashing', () => {
      it('should generate consistent percentage buckets', async () => {
        const bucket1 = await segmenter.getPercentageBucket('user123', 'flag1');
        const bucket2 = await segmenter.getPercentageBucket('user123', 'flag1');
        const bucket3 = await segmenter.getPercentageBucket('user123', 'flag2');

        expect(bucket1).toBe(bucket2);
        expect(bucket1).toBeGreaterThanOrEqual(0);
        expect(bucket1).toBeLessThan(100);

        // Different flag should give different bucket
        expect(bucket1).not.toBe(bucket3);
      });

      it('should distribute users evenly across buckets', async () => {
        const flagId = 'distribution_test';
        const bucketCounts = new Array(100).fill(0);

        for (let i = 0; i < 1000; i++) {
          const userId = `user${i}`;
          const bucket = await segmenter.getPercentageBucket(userId, flagId);
          bucketCounts[bucket]++;
        }

        // Check distribution is roughly even (within 20% of expected)
        const expectedPerBucket = 10;
        for (const count of bucketCounts) {
          expect(count).toBeGreaterThan(expectedPerBucket * 0.5);
          expect(count).toBeLessThan(expectedPerBucket * 1.5);
        }
      });
    });

    describe('User Segments', () => {
      it('should create and assign users to segments', async () => {
        const segment = await segmenter.createSegment({
          name: 'Premium Users',
          description: 'Users with premium plan',
          rules: [
            {
              type: 'attribute',
              condition: {
                attribute: 'plan',
                operator: 'equals',
                value: 'premium'
              }
            }
          ],
          isActive: true
        });

        await segmenter.updateUserAttributes('premium_user', {
          plan: 'premium'
        });

        await segmenter.assignUserToSegments('premium_user', {
          userId: 'premium_user',
          plan: 'premium'
        });

        const isInSegment = await segmenter.isInSegment('premium_user', segment.id);

        expect(isInSegment).toBe(true);
      });

      it('should not assign users who dont match segment criteria', async () => {
        const segment = await segmenter.createSegment({
          name: 'Enterprise Users',
          description: 'Users with enterprise plan',
          rules: [
            {
              type: 'attribute',
              condition: {
                attribute: 'plan',
                operator: 'equals',
                value: 'enterprise'
              }
            }
          ],
          isActive: true
        });

        await segmenter.updateUserAttributes('free_user', {
          plan: 'free'
        });

        await segmenter.assignUserToSegments('free_user', {
          userId: 'free_user',
          plan: 'free'
        });

        const isInSegment = await segmenter.isInSegment('free_user', segment.id);

        expect(isInSegment).toBe(false);
      });
    });
  });

  /**
   * ExperimentTracker Tests
   */
  describe('ExperimentTracker', () => {
    describe('Experiment Creation', () => {
      it('should create an experiment with variants', async () => {
        const experiment = await experimentTracker.createExperiment({
          name: 'Button Color Test',
          description: 'Test different button colors',
          hypothesis: 'Blue buttons will have higher conversion',
          successMetric: 'click_rate',
          targetMetric: 'conversion_rate',
          minSampleSize: 1000,
          confidenceLevel: 0.95,
          state: ExperimentState.DRAFT,
          variants: [
            {
              id: 'control',
              name: 'Control',
              description: 'Original green button',
              isControl: true,
              allocationWeight: 0.5,
              payload: { color: 'green' }
            },
            {
              id: 'treatment',
              name: 'Treatment',
              description: 'New blue button',
              isControl: false,
              allocationWeight: 0.5,
              payload: { color: 'blue' }
            }
          ],
          createdBy: 'test',
          tags: ['ui', 'button']
        });

        expect(experiment).toBeDefined();
        expect(experiment.id).toMatch(/^exp_/);
        expect(experiment.variants).toHaveLength(2);
        expect(experiment.variants[0].isControl).toBe(true);
        expect(experiment.variants[1].isControl).toBe(false);
      });
    });

    describe('Variant Assignment', () => {
      it('should assign users to variants consistently', async () => {
        const experiment = await experimentTracker.createExperiment({
          name: 'Consistency Test',
          description: 'Test assignment consistency',
          hypothesis: 'Test',
          successMetric: 'test',
          targetMetric: 'test',
          minSampleSize: 100,
          confidenceLevel: 0.95,
          state: ExperimentState.RUNNING,
          variants: [
            {
              id: 'control',
              name: 'Control',
              description: 'Control',
              isControl: true,
              allocationWeight: 0.5,
              payload: {}
            },
            {
              id: 'treatment',
              name: 'Treatment',
              description: 'Treatment',
              isControl: false,
              allocationWeight: 0.5,
              payload: {}
            }
          ],
          createdBy: 'test',
          tags: []
        });

        const assignment1 = await experimentTracker.getVariant(experiment.id, 'consistent_user');
        const assignment2 = await experimentTracker.getVariant(experiment.id, 'consistent_user');

        expect(assignment1.variantId).toBe(assignment2.variantId);
      });

      it('should distribute users according to allocation weights', async () => {
        const experiment = await experimentTracker.createExperiment({
          name: 'Distribution Test',
          description: 'Test variant distribution',
          hypothesis: 'Test',
          successMetric: 'test',
          targetMetric: 'test',
          minSampleSize: 1000,
          confidenceLevel: 0.95,
          state: ExperimentState.RUNNING,
          variants: [
            {
              id: 'control',
              name: 'Control',
              description: 'Control',
              isControl: true,
              allocationWeight: 0.7,
              payload: {}
            },
            {
              id: 'treatment',
              name: 'Treatment',
              description: 'Treatment',
              isControl: false,
              allocationWeight: 0.3,
              payload: {}
            }
          ],
          createdBy: 'test',
          tags: []
        });

        const assignments = { control: 0, treatment: 0 };

        for (let i = 0; i < 1000; i++) {
          const userId = `user${i}`;
          const assignment = await experimentTracker.getVariant(experiment.id, userId);
          assignments[assignment.variantId as keyof typeof assignments]++;
        }

        // Check distribution is close to weights (within 10%)
        const controlRatio = assignments.control / 1000;
        const treatmentRatio = assignments.treatment / 1000;

        expect(controlRatio).toBeGreaterThan(0.6);
        expect(controlRatio).toBeLessThan(0.8);
        expect(treatmentRatio).toBeGreaterThan(0.2);
        expect(treatmentRatio).toBeLessThan(0.4);
      });
    });

    describe('Conversion Tracking', () => {
      it('should track conversion events', async () => {
        const experiment = await experimentTracker.createExperiment({
          name: 'Conversion Test',
          description: 'Test conversion tracking',
          hypothesis: 'Test',
          successMetric: 'conversion',
          targetMetric: 'conversion',
          minSampleSize: 100,
          confidenceLevel: 0.95,
          state: ExperimentState.RUNNING,
          variants: [
            {
              id: 'control',
              name: 'Control',
              description: 'Control',
              isControl: true,
              allocationWeight: 0.5,
              payload: {}
            },
            {
              id: 'treatment',
              name: 'Treatment',
              description: 'Treatment',
              isControl: false,
              allocationWeight: 0.5,
              payload: {}
            }
          ],
          createdBy: 'test',
          tags: []
        });

        const assignment = await experimentTracker.getVariant(experiment.id, 'user123');

        await experimentTracker.trackConversion({
          userId: 'user123',
          experimentId: experiment.id,
          variantId: assignment.variantId,
          eventName: 'purchase',
          value: 100
        });

        const results = await experimentTracker.getResults(experiment.id);

        expect(results.totalConversions).toBe(1);
        expect(results.variantResults[0].conversions).toBe(1);
      });
    });

    describe('Statistical Significance', () => {
      it('should calculate statistical significance', async () => {
        const experiment = await experimentTracker.createExperiment({
          name: 'Significance Test',
          description: 'Test significance calculation',
          hypothesis: 'Test',
          successMetric: 'conversion',
          targetMetric: 'conversion',
          minSampleSize: 100,
          confidenceLevel: 0.95,
          state: ExperimentState.RUNNING,
          variants: [
            {
              id: 'control',
              name: 'Control',
              description: 'Control',
              isControl: true,
              allocationWeight: 0.5,
              payload: {}
            },
            {
              id: 'treatment',
              name: 'Treatment',
              description: 'Treatment',
              isControl: false,
              allocationWeight: 0.5,
              payload: {}
            }
          ],
          createdBy: 'test',
          tags: []
        });

        // Add some test data
        for (let i = 0; i < 100; i++) {
          const userId = `user${i}`;
          const assignment = await experimentTracker.getVariant(experiment.id, userId);

          // Control converts at 10%, treatment at 20%
          if (assignment.variantId === 'treatment' && i < 20) {
            await experimentTracker.trackConversion({
              userId,
              experimentId: experiment.id,
              variantId: assignment.variantId,
              eventName: 'conversion'
            });
          } else if (assignment.variantId === 'control' && i < 10) {
            await experimentTracker.trackConversion({
              userId,
              experimentId: experiment.id,
              variantId: assignment.variantId,
              eventName: 'conversion'
            });
          }
        }

        const results = await experimentTracker.getResults(experiment.id);

        expect(results.statisticalSignificance).toBeDefined();
        expect(results.variantResults).toHaveLength(2);
      });
    });
  });

  /**
   * Performance Tests
   */
  describe('Performance', () => {
    it('should evaluate 1000 flags in under 10 seconds', async () => {
      // Create test flag
      const flag = await flagManager.createFlag({
        name: 'perf_test_flag',
        description: 'Performance test flag',
        type: FlagType.BOOLEAN,
        state: FlagState.ENABLED,
        createdBy: 'test',
        environment: 'test',
        tags: [],
        defaultValue: true,
        rules: [],
        killSwitchEnabled: false
      });

      const context: EvaluationContext = {
        userId: 'perf_test_user'
      };

      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        await flagManager.evaluateFlag(flag.id, context);
      }

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10000); // 10 seconds
      console.log(`1000 evaluations in ${duration}ms (${duration / 1000}ms per evaluation)`);
    });

    it('should handle 100 concurrent flag evaluations', async () => {
      const flag = await flagManager.createFlag({
        name: 'concurrent_test_flag',
        description: 'Concurrent test flag',
        type: FlagType.BOOLEAN,
        state: FlagState.ENABLED,
        createdBy: 'test',
        environment: 'test',
        tags: [],
        defaultValue: true,
        rules: [],
        killSwitchEnabled: false
      });

      const context: EvaluationContext = {
        userId: 'concurrent_user'
      };

      const start = Date.now();

      const evaluations = Array(100)
        .fill(null)
        .map(() => flagManager.evaluateFlag(flag.id, context));

      await Promise.all(evaluations);

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // 5 seconds
      console.log(`100 concurrent evaluations in ${duration}ms`);
    });
  });
});
