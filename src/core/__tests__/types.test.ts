/**
 * POLLN Type Safety Tests
 * Validates type definitions and interfaces
 */

import type {
  A2APackage,
  AgentConfig,
  AgentState,
  SynapseConfig,
  SynapseState,
  Proposal,
  DiscriminatorResult,
  PlinkoDecision,
  EmbeddingVector,
  EmbeddingMetadata,
  PollenGrain,
  ConsensusType,
  ConsensusVote,
  ConsensusResult,
  PathwayState,
  SafetyConstraint,
  SafetyCheckResult,
  ResourceBudget,
  EligibilityTrace,
  PrivacyLevel,
  SubsumptionLayer,
  SafetySeverity,
} from '../types';

describe('POLLN Core Types', () => {
  describe('A2APackage', () => {
    it('should accept valid package structure', () => {
      const pkg: A2APackage<string> = {
        id: 'test-id',
        timestamp: Date.now(),
        senderId: 'agent-1',
        receiverId: 'agent-2',
        type: 'test-type',
        payload: 'test-payload',
        parentIds: ['parent-1'],
        causalChainId: 'chain-1',
        privacyLevel: PrivacyLevel.PUBLIC,
        layer: SubsumptionLayer.DELIBERATE,
        dpMetadata: {
          epsilon: 1.0,
          delta: 1e-5,
          noiseScale: 0.1,
        },
      };

      expect(pkg.id).toBe('test-id');
      expect(pkg.privacyLevel).toBe(PrivacyLevel.PUBLIC);
      expect(pkg.layer).toBe(SubsumptionLayer.DELIBERATE);
    });

    it('should allow optional dpMetadata', () => {
      const pkg: A2APackage<number> = {
        id: 'test-id',
        timestamp: Date.now(),
        senderId: 'agent-1',
        receiverId: 'agent-2',
        type: 'test-type',
        payload: 42,
        parentIds: [],
        causalChainId: 'chain-1',
        privacyLevel: PrivacyLevel.COLONY,
        layer: SubsumptionLayer.HABITUAL,
      };

      expect(pkg.dpMetadata).toBeUndefined();
    });

    it('should support generic payload types', () => {
      interface CustomPayload {
        data: string;
        count: number;
      }

      const pkg: A2APackage<CustomPayload> = {
        id: 'test-id',
        timestamp: Date.now(),
        senderId: 'agent-1',
        receiverId: 'agent-2',
        type: 'test-type',
        payload: { data: 'test', count: 42 },
        parentIds: [],
        causalChainId: 'chain-1',
        privacyLevel: PrivacyLevel.PRIVATE,
        layer: SubsumptionLayer.REFLEX,
      };

      expect(pkg.payload.data).toBe('test');
      expect(pkg.payload.count).toBe(42);
    });
  });

  describe('AgentConfig', () => {
    it('should accept valid agent configuration', () => {
      const config: AgentConfig = {
        id: 'agent-1',
        typeId: 'test-type',
        categoryId: 'test-category',
        modelFamily: 'gpt-4',
        defaultParams: { temperature: 0.7 },
        inputTopics: ['input-1', 'input-2'],
        outputTopic: 'output',
        targetLatencyMs: 100,
        maxMemoryMB: 512,
        minExamples: 100,
        requiresWorldModel: true,
      };

      expect(config.id).toBe('agent-1');
      expect(config.inputTopics).toHaveLength(2);
      expect(config.requiresWorldModel).toBe(true);
    });

    it('should allow optional performance targets', () => {
      const config: AgentConfig = {
        id: 'agent-2',
        typeId: 'test-type',
        categoryId: 'test-category',
        modelFamily: 'gpt-4',
        defaultParams: {},
        inputTopics: ['input'],
        outputTopic: 'output',
        minExamples: 10,
        requiresWorldModel: false,
      };

      expect(config.targetLatencyMs).toBeUndefined();
      expect(config.maxMemoryMB).toBeUndefined();
    });
  });

  describe('AgentState', () => {
    it('should accept valid agent state', () => {
      const state: AgentState = {
        id: 'agent-1',
        typeId: 'test-type',
        modelHash: 'hash-123',
        parameterCount: 1000000,
        modelVersion: 2,
        status: 'active',
        lastActive: Date.now(),
        valueFunction: 0.75,
        successCount: 10,
        failureCount: 2,
        avgLatencyMs: 45.5,
        stateSnapshot: { key: 'value' },
      };

      expect(state.status).toBe('active');
      expect(state.valueFunction).toBe(0.75);
    });

    it('should allow optional stateSnapshot', () => {
      const state: AgentState = {
        id: 'agent-2',
        typeId: 'test-type',
        modelVersion: 1,
        status: 'dormant',
        lastActive: Date.now(),
        valueFunction: 0.5,
        successCount: 0,
        failureCount: 0,
        avgLatencyMs: 0,
      };

      expect(state.stateSnapshot).toBeUndefined();
    });
  });

  describe('SynapseConfig and SynapseState', () => {
    it('should accept valid synapse configuration', () => {
      const config: SynapseConfig = {
        sourceAgentId: 'agent-1',
        targetAgentId: 'agent-2',
        learningRate: 0.01,
        decayRate: 0.001,
        minWeight: 0.01,
        maxWeight: 1.0,
        rewardStrength: 0.1,
      };

      expect(config.learningRate).toBe(0.01);
      expect(config.maxWeight).toBe(1.0);
    });

    it('should accept valid synapse state', () => {
      const state: SynapseState = {
        id: 'synapse-1',
        sourceAgentId: 'agent-1',
        targetAgentId: 'agent-2',
        weight: 0.75,
        coactivationCount: 100,
        lastCoactivated: Date.now(),
      };

      expect(state.weight).toBe(0.75);
      expect(state.coactivationCount).toBe(100);
    });
  });

  describe('PlinkoDecision Types', () => {
    it('should accept valid proposal', () => {
      const proposal: Proposal = {
        agentId: 'agent-1',
        confidence: 0.85,
        bid: 50,
        explanation: 'High confidence due to...',
      };

      expect(proposal.confidence).toBe(0.85);
      expect(proposal.explanation).toBeDefined();
    });

    it('should accept valid discriminator result', () => {
      const result: DiscriminatorResult = {
        type: 'safety',
        passed: true,
        score: 0.95,
        reason: 'All safety checks passed',
      };

      expect(result.passed).toBe(true);
      expect(result.score).toBe(0.95);
    });

    it('should accept valid plinko decision', () => {
      const decision: PlinkoDecision = {
        id: 'decision-1',
        gardenerId: 'gardener-1',
        contextHash: 'hash-123',
        domain: 'test-domain',
        sequenceId: 'seq-1',
        proposalCount: 3,
        proposals: [
          { agentId: 'agent-1', confidence: 0.8, bid: 40 },
          { agentId: 'agent-2', confidence: 0.9, bid: 50 },
          { agentId: 'agent-3', confidence: 0.7, bid: 30 },
        ],
        discriminatorResults: [
          { type: 'safety', passed: true, score: 1.0 },
          { type: 'quality', passed: true, score: 0.9 },
        ],
        temperature: 1.0,
        entropy: 0.5,
        selectedAgentId: 'agent-2',
        selectedConfidence: 0.9,
        selectionMethod: 'softmax',
        executedAt: Date.now(),
        executionTimeMs: 25,
        outcome: 'success',
        reward: 0.8,
        gardenerFeedback: 0.9,
        explanation: 'Selected agent-2 via softmax',
        wasOverridden: false,
        timestamp: Date.now(),
      };

      expect(decision.selectedAgentId).toBe('agent-2');
      expect(decision.outcome).toBe('success');
      expect(decision.wasOverridden).toBe(false);
    });
  });

  describe('Embedding Types', () => {
    it('should accept valid embedding vector', () => {
      const vector: EmbeddingVector = [0.1, 0.2, 0.3, 0.4, 0.5];
      expect(vector).toHaveLength(5);
    });

    it('should accept valid embedding metadata', () => {
      const metadata: EmbeddingMetadata = {
        dimension: 512,
        sourceLogCount: 100,
        sourceLogIds: ['log-1', 'log-2'],
        agentTypes: ['type-1', 'type-2'],
        graphSnapshot: { nodes: 10, edges: 20 },
        baseModelHashes: ['hash-1', 'hash-2'],
        usageCount: 50,
        successRate: 0.85,
        lastUsed: Date.now(),
        signature: 'sig-123',
        signedAt: Date.now(),
        isPrivate: false,
        differentialPrivacyEpsilon: 1.0,
        differentialPrivacyDelta: 1e-5,
      };

      expect(metadata.dimension).toBe(512);
      expect(metadata.isPrivate).toBe(false);
    });

    it('should accept valid pollen grain', () => {
      const grain: PollenGrain = {
        id: 'grain-1',
        gardenerId: 'gardener-1',
        embedding: [0.1, 0.2, 0.3],
        metadata: {
          dimension: 3,
          sourceLogCount: 10,
          sourceLogIds: ['log-1'],
          agentTypes: ['type-1'],
          usageCount: 5,
          successRate: 0.9,
          isPrivate: true,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(grain.embedding).toHaveLength(3);
      expect(grain.metadata.isPrivate).toBe(true);
    });
  });

  describe('Consensus Types', () => {
    it('should accept valid consensus vote', () => {
      const vote: ConsensusVote = {
        agentId: 'agent-1',
        vote: true,
        weight: 1.0,
        timestamp: Date.now(),
      };

      expect(vote.vote).toBe(true);
      expect(vote.weight).toBe(1.0);
    });

    it('should accept valid consensus result', () => {
      const result: ConsensusResult = {
        type: ConsensusType.WEIGHTED_VOTING,
        passed: true,
        votesFor: 7,
        votesAgainst: 3,
        totalWeight: 10.0,
        quorumReached: true,
        decisionTime: 5000,
      };

      expect(result.type).toBe(ConsensusType.WEIGHTED_VOTING);
      expect(result.passed).toBe(true);
      expect(result.quorumReached).toBe(true);
    });
  });

  describe('Stigmergy Types', () => {
    it('should accept valid pathway state', () => {
      const pathway: PathwayState = {
        sourceAgentId: 'agent-1',
        targetAgentId: 'agent-2',
        strength: 0.8,
        lastReinforced: Date.now(),
        reinforcementCount: 50,
        evaporationRate: 0.01,
      };

      expect(pathway.strength).toBe(0.8);
      expect(pathway.reinforcementCount).toBe(50);
    });
  });

  describe('Safety Types', () => {
    it('should accept valid safety constraint', () => {
      const constraint: SafetyConstraint = {
        id: 'constraint-1',
        name: 'Test Constraint',
        category: 'harm_prevention',
        rule: 'Do no harm',
        ruleCode: 'return !action.harmful',
        severity: SafetySeverity.CRITICAL,
        isActive: true,
        cannotOverride: true,
      };

      expect(constraint.severity).toBe(SafetySeverity.CRITICAL);
      expect(constraint.cannotOverride).toBe(true);
    });

    it('should accept valid safety check result', () => {
      const result: SafetyCheckResult = {
        passed: true,
        constraintId: 'constraint-1',
        severity: SafetySeverity.INFO,
        message: 'Check passed',
        overridePossible: false,
      };

      expect(result.passed).toBe(true);
      expect(result.overridePossible).toBe(false);
    });
  });

  describe('Resource Allocation Types', () => {
    it('should accept valid resource budget', () => {
      const budget: ResourceBudget = {
        agentId: 'agent-1',
        baseCompute: 100,
        baseMemory: 200,
        baseNetwork: 50,
        discretionaryCompute: 50,
        discretionaryMemory: 100,
        discretionaryNetwork: 25,
        minAllocation: 0.1,
        maxAllocation: 2.0,
      };

      expect(budget.baseCompute).toBe(100);
      expect(budget.discretionaryCompute).toBe(50);
    });

    it('should accept valid eligibility trace', () => {
      const trace: EligibilityTrace = {
        agentId: 'agent-1',
        actionId: 'action-1',
        trace: 0.8,
        timestamp: Date.now(),
        decayRate: 0.95,
      };

      expect(trace.trace).toBe(0.8);
      expect(trace.decayRate).toBe(0.95);
    });
  });

  describe('Enum Values', () => {
    it('should have correct privacy level values', () => {
      expect(PrivacyLevel.PUBLIC).toBe('PUBLIC');
      expect(PrivacyLevel.COLONY).toBe('COLONY');
      expect(PrivacyLevel.PRIVATE).toBe('PRIVATE');
    });

    it('should have correct subsumption layer values', () => {
      expect(SubsumptionLayer.SAFETY).toBe('SAFETY');
      expect(SubsumptionLayer.REFLEX).toBe('REFLEX');
      expect(SubsumptionLayer.HABITUAL).toBe('HABITUAL');
      expect(SubsumptionLayer.DELIBERATE).toBe('DELIBERATE');
    });

    it('should have correct safety severity values', () => {
      expect(SafetySeverity.INFO).toBe('INFO');
      expect(SafetySeverity.WARNING).toBe('WARNING');
      expect(SafetySeverity.ERROR).toBe('ERROR');
      expect(SafetySeverity.CRITICAL).toBe('CRITICAL');
    });

    it('should have correct consensus type values', () => {
      expect(ConsensusType.WEIGHTED_VOTING).toBe('WEIGHTED_VOTING');
      expect(ConsensusType.FAST_PATH).toBe('FAST_PATH');
      expect(ConsensusType.EMERGENCY).toBe('EMERGENCY');
      expect(ConsensusType.FULL_CONSENSUS).toBe('FULL_CONSENSUS');
    });
  });
});
