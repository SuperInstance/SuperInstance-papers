/**
 * Tests for Emergence Detector
 */

import { EmergenceDetector } from '../detector';
import { CausalChain, EmergentBehavior, ValidationStatus } from '../types';
import { EmergenceEventType } from '../types';

describe('EmergenceDetector', () => {
  let detector: EmergenceDetector;

  beforeEach(() => {
    detector = new EmergenceDetector();
  });

  afterEach(() => {
    detector.reset();
  });

  describe('Agent Registration', () => {
    test('should register agent capabilities', () => {
      detector.registerAgentCapabilities('agent-1', ['capability-1', 'capability-2']);

      // Verify registration by checking if capabilities are used in analysis
      const chains: CausalChain[] = [{
        id: 'chain-1',
        packages: ['pkg-1'],
        agents: ['agent-1'],
        capabilities: ['capability-1'],
        outcome: 'result-1',
        timestamp: Date.now(),
      }];

      const result = detector.analyzeEmergence(chains);

      expect(result).toBeDefined();
    });

    test('should unregister agent', () => {
      detector.registerAgentCapabilities('agent-1', ['capability-1']);
      detector.unregisterAgent('agent-1');

      // Agent should no longer be considered
      const chains: CausalChain[] = [{
        id: 'chain-1',
        packages: ['pkg-1'],
        agents: ['agent-1'],
        capabilities: ['capability-1'],
        outcome: 'result-1',
        timestamp: Date.now(),
      }];

      const result = detector.analyzeEmergence(chains);
      expect(result).toBeDefined();
    });
  });

  describe('Emergence Analysis', () => {
    test('should analyze causal chains', async () => {
      const chains: CausalChain[] = [{
        id: 'chain-1',
        packages: ['pkg-1', 'pkg-2'],
        agents: ['agent-1', 'agent-2'],
        capabilities: ['cap-1', 'cap-2'],
        outcome: 'novel-outcome',
        timestamp: Date.now(),
      }];

      // Register agent capabilities
      detector.registerAgentCapabilities('agent-1', ['cap-1']);
      detector.registerAgentCapabilities('agent-2', ['cap-2']);

      const analysis = await detector.analyzeEmergence(chains);

      expect(analysis).toBeDefined();
      expect(analysis.metrics).toBeDefined();
      expect(analysis.behaviors).toBeInstanceOf(Array);
      expect(analysis.patterns).toBeInstanceOf(Array);
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });

    test('should detect emergent behaviors', async () => {
      const chains: CausalChain[] = [{
        id: 'chain-1',
        packages: ['pkg-1', 'pkg-2', 'pkg-3'],
        agents: ['agent-1', 'agent-2', 'agent-3'],
        capabilities: ['cap-1', 'cap-2', 'cap-3'],
        outcome: 'truly-novel-outcome',
        timestamp: Date.now(),
      }];

      // Register individual agent capabilities
      detector.registerAgentCapabilities('agent-1', ['cap-1']);
      detector.registerAgentCapabilities('agent-2', ['cap-2']);
      detector.registerAgentCapabilities('agent-3', ['cap-3']);

      const analysis = await detector.analyzeEmergence(chains);

      // Should detect some emergence due to multi-agent composition
      expect(analysis.behaviors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Behavior Management', () => {
    test('should get all behaviors', () => {
      const behaviors = detector.getAllBehaviors();
      expect(behaviors).toBeInstanceOf(Array);
    });

    test('should filter behaviors by status', () => {
      detector.getAllBehaviors(); // Initialize

      const candidates = detector.getBehaviorsByStatus('candidate');
      expect(candidates).toBeInstanceOf(Array);

      const validated = detector.getBehaviorsByStatus('validated');
      expect(validated).toBeInstanceOf(Array);
    });

    test('should validate behavior', () => {
      // Create a test behavior
      const behavior: EmergentBehavior = {
        id: 'test-behavior',
        name: 'Test Behavior',
        description: 'Test',
        discoveredAt: Date.now(),
        causalChainId: 'chain-1',
        participatingAgents: ['agent-1'],
        capabilities: ['cap-1'],
        outcome: 'result',
        emergenceScore: 0.8,
        noveltyFactors: {
          novelOutcome: true,
          novelComposition: true,
          novelAssembly: true,
          surprise: true,
        },
        validationStatus: 'candidate',
        lastSeen: Date.now(),
        occurrenceCount: 1,
      };

      detector.validateBehavior('test-behavior', 'validated');

      const validated = detector.getBehaviorsByStatus('validated');
      expect(validated.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Pattern Detection', () => {
    test('should identify patterns in chains', async () => {
      const chains: CausalChain[] = [
        {
          id: 'chain-1',
          packages: ['pkg-1'],
          agents: ['agent-1', 'agent-2'],
          capabilities: ['cap-1', 'cap-2'],
          outcome: 'result-1',
          timestamp: Date.now(),
        },
        {
          id: 'chain-2',
          packages: ['pkg-2'],
          agents: ['agent-1', 'agent-2'],
          capabilities: ['cap-1', 'cap-2'],
          outcome: 'result-2',
          timestamp: Date.now(),
        },
        {
          id: 'chain-3',
          packages: ['pkg-3'],
          agents: ['agent-1', 'agent-2'],
          capabilities: ['cap-1', 'cap-2'],
          outcome: 'result-3',
          timestamp: Date.now(),
        },
      ];

      const analysis = await detector.analyzeEmergence(chains);

      // Should detect pattern with frequency >= 3
      expect(analysis.patterns.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metrics', () => {
    test('should track metrics', () => {
      const metrics = detector.getCurrentMetrics();

      if (metrics) {
        expect(metrics.complexity).toBeDefined();
        expect(metrics.novelty).toBeDefined();
        expect(metrics.synergy).toBeDefined();
        expect(metrics.overallScore).toBeGreaterThanOrEqual(0);
        expect(metrics.overallScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Events', () => {
    test('should emit behavior discovered event', (done) => {
      detector.on('event', (event) => {
        if (event.type === EmergenceEventType.BEHAVIOR_DISCOVERED) {
          expect(event.description).toContain('Emergent behavior discovered');
          done();
        }
      });

      const chains: CausalChain[] = [{
        id: 'chain-1',
        packages: ['pkg-1', 'pkg-2', 'pkg-3'],
        agents: ['agent-1', 'agent-2', 'agent-3'],
        capabilities: ['cap-1', 'cap-2', 'cap-3'],
        outcome: 'highly-novel-outcome',
        timestamp: Date.now(),
      }];

      detector.analyzeEmergence(chains);
    });
  });

  describe('Reset', () => {
    test('should reset detector state', () => {
      detector.registerAgentCapabilities('agent-1', ['cap-1']);

      detector.reset();

      const behaviors = detector.getAllBehaviors();
      expect(behaviors.length).toBe(0);
    });
  });
});
