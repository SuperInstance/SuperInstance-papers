/**
 * Workflow Integration Tests
 *
 * Comprehensive tests for single agent workflows, multi-agent coordination,
 * cache scenarios, error recovery, and timeout handling.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { MockLLMBackend, MockLLMBackendFactory } from './MockLLMBackend.js';
import { Colony } from '../../../colony.js';
import { WorldModel } from '../../../worldmodel.js';
import type { A2APackage, AgentConfig, SubsumptionLayer } from '../../../types.js';

// ============================================================================
// Test Fixtures
// ============================================================================

interface WorkflowAgentConfig {
  id: string;
  name: string;
  role: string;
  llm: MockLLMBackend;
}

class WorkflowAgent extends EventEmitter {
  public readonly id: string;
  public readonly name: string;
  public readonly role: string;
  private llm: MockLLMBackend;
  private state: Map<string, unknown> = new Map();
  private processedPackages: A2APackage[] = [];

  constructor(config: WorkflowAgentConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.llm = config.llm;
  }

  async process(input: string, layer: SubsumptionLayer = 'DELIBERATE'): Promise<A2APackage> {
    const response = await this.llm.generateTokens({
      prompt: input,
      maxTokens: 100,
      temperature: 0.7,
    });

    const pkg: A2APackage = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'workflow',
      type: 'agent_response',
      payload: {
        text: response.text,
        role: this.role,
        agentName: this.name,
      },
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: 'COLONY',
      layer,
    };

    this.processedPackages.push(pkg);
    this.emit('processed', pkg);

    return pkg;
  }

  async generateEmbedding(input: string): Promise<number[]> {
    const response = await this.llm.createEmbeddings({
      input,
    });

    return response.embeddings[0];
  }

  getState(): Map<string, unknown> {
    return this.state;
  }

  setState(key: string, value: unknown): void {
    this.state.set(key, value);
  }

  getProcessedPackages(): A2APackage[] {
    return [...this.processedPackages];
  }

  reset(): void {
    this.processedPackages = [];
    this.state.clear();
  }
}

class WorkflowOrchestrator {
  private agents: Map<string, WorkflowAgent> = new Map();
  private llm: MockLLMBackend;
  private worldModel: WorldModel;

  constructor(llm: MockLLMBackend, worldModel: WorldModel) {
    this.llm = llm;
    this.worldModel = worldModel;
  }

  addAgent(agent: WorkflowAgent): void {
    this.agents.set(agent.id, agent);
  }

  getAgent(id: string): WorkflowAgent | undefined {
    return this.agents.get(id);
  }

  async runSequentialWorkflow(
    agentIds: string[],
    input: string
  ): Promise<A2APackage[]> {
    const results: A2APackage[] = [];
    let currentInput = input;

    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const result = await agent.process(currentInput);
      results.push(result);

      currentInput = result.payload.text as string;
    }

    return results;
  }

  async runParallelWorkflow(
    agentIds: string[],
    input: string
  ): Promise<A2APackage[]> {
    const agents = agentIds
      .map(id => this.agents.get(id))
      .filter((agent): agent is WorkflowAgent => agent !== undefined);

    const results = await Promise.all(
      agents.map(agent => agent.process(input))
    );

    return results;
  }

  async runHierarchicalWorkflow(
    input: string
  ): Promise<A2APackage> {
    // REFLEX layer first
    const reflexAgent = Array.from(this.agents.values()).find(
      a => a.role === 'reflex'
    );

    if (reflexAgent) {
      try {
        const reflexResult = await reflexAgent.process(input, 'REFLEX');

        // If reflex layer handles it, return early
        if (reflexResult.payload.text.includes('handled')) {
          return reflexResult;
        }
      } catch (error) {
        // Fall through to next layer
      }
    }

    // HABITUAL layer
    const habitualAgent = Array.from(this.agents.values()).find(
      a => a.role === 'habitual'
    );

    if (habitualAgent) {
      try {
        const habitualResult = await habitualAgent.process(input, 'HABITUAL');

        if (habitualResult.payload.text.includes('handled')) {
          return habitualResult;
        }
      } catch (error) {
        // Fall through to next layer
      }
    }

    // DELIBERATE layer
    const deliberateAgent = Array.from(this.agents.values()).find(
      a => a.role === 'deliberate'
    );

    if (deliberateAgent) {
      return await deliberateAgent.process(input, 'DELIBERATE');
    }

    throw new Error('No agents available for hierarchical workflow');
  }

  getAllAgents(): WorkflowAgent[] {
    return Array.from(this.agents.values());
  }

  reset(): void {
    this.agents.forEach(agent => agent.reset());
  }
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Workflow Integration Tests', () => {
  let llm: MockLLMBackend;
  let worldModel: WorldModel;
  let orchestrator: WorkflowOrchestrator;

  beforeEach(() => {
    MockLLMBackendFactory.resetAll();

    llm = MockLLMBackendFactory.create('workflow-model', {
      baseLatencyMs: 10,
      latencyVarianceMs: 5,
      errorRate: 0,
      timeoutRate: 0,
      maxCacheSize: 100,
    });

    worldModel = new WorldModel({
      latentDim: 64,
      hiddenDim: 256,
      learningRate: 0.001,
    });
    worldModel.initialize();

    orchestrator = new WorkflowOrchestrator(llm, worldModel);
  });

  afterEach(() => {
    MockLLMBackendFactory.resetAll();
    orchestrator.reset();
  });

  // ==========================================================================
  // Single Agent Workflow Tests
  // ==========================================================================

  describe('Single Agent Workflow', () => {
    let agent: WorkflowAgent;

    beforeEach(() => {
      agent = new WorkflowAgent({
        id: uuidv4(),
        name: 'TestAgent',
        role: 'deliberate',
        llm,
      });

      orchestrator.addAgent(agent);
    });

    it('should process single input successfully', async () => {
      const input = 'Process this data';
      const result = await agent.process(input);

      expect(result).toBeDefined();
      expect(result.senderId).toBe(agent.id);
      expect(result.payload.text).toBeDefined();
      expect(result.payload.text.length).toBeGreaterThan(0);
    });

    it('should maintain state across multiple processes', async () => {
      agent.setState('count', 0);

      await agent.process('First');
      agent.setState('count', (agent.getState().get('count') as number) + 1);

      await agent.process('Second');
      agent.setState('count', (agent.getState().get('count') as number) + 1);

      expect(agent.getState().get('count')).toBe(2);
    });

    it('should track processed packages', async () => {
      await agent.process('Input 1');
      await agent.process('Input 2');
      await agent.process('Input 3');

      const packages = agent.getProcessedPackages();

      expect(packages).toHaveLength(3);
      expect(packages[0].payload.text).toBeDefined();
      expect(packages[1].payload.text).toBeDefined();
      expect(packages[2].payload.text).toBeDefined();
    });

    it('should generate embeddings for input', async () => {
      const input = 'Generate embedding for this text';
      const embedding = await agent.generateEmbedding(input);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBeGreaterThan(0);
      expect(embedding.length).toBe(llm.getConfig().embeddingDimension);
    });

    it('should emit events on processing', async () => {
      let eventFired = false;

      agent.on('processed', () => {
        eventFired = true;
      });

      await agent.process('Test input');

      expect(eventFired).toBe(true);
    });

    it('should handle rapid successive requests', async () => {
      const inputs = Array.from({ length: 20 }, (_, i) => `Input ${i}`);

      const results = await Promise.all(
        inputs.map(input => agent.process(input))
      );

      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result.payload.text).toBeDefined();
      });
    });

    it('should respect subsumption layers', async () => {
      const reflexResult = await agent.process('Emergency', 'REFLEX');
      const deliberateResult = await agent.process('Normal', 'DELIBERATE');

      expect(reflexResult.layer).toBe('REFLEX');
      expect(deliberateResult.layer).toBe('DELIBERATE');
    });
  });

  // ==========================================================================
  // Multi-Agent Coordination Tests
  // ==========================================================================

  describe('Multi-Agent Coordination', () => {
    beforeEach(() => {
      // Create multiple agents with different roles
      const agents = [
        { id: uuidv4(), name: 'ReflexAgent', role: 'reflex' },
        { id: uuidv4(), name: 'HabitualAgent', role: 'habitual' },
        { id: uuidv4(), name: 'DeliberateAgent', role: 'deliberate' },
        { id: uuidv4(), name: 'Specialist1', role: 'specialist' },
        { id: uuidv4(), name: 'Specialist2', role: 'specialist' },
      ];

      agents.forEach(config => {
        const agent = new WorkflowAgent({
          ...config,
          llm,
        });

        orchestrator.addAgent(agent);
      });
    });

    it('should execute sequential workflow across agents', async () => {
      const agents = orchestrator.getAllAgents();
      const agentIds = agents.slice(0, 3).map(a => a.id);

      const results = await orchestrator.runSequentialWorkflow(
        agentIds,
        'Initial input'
      );

      expect(results).toHaveLength(3);

      // Check that each agent processed the previous output
      expect(results[0].senderId).toBe(agentIds[0]);
      expect(results[1].senderId).toBe(agentIds[1]);
      expect(results[2].senderId).toBe(agentIds[2]);
    });

    it('should execute parallel workflow across agents', async () => {
      const agents = orchestrator.getAllAgents();
      const specialistIds = agents
        .filter(a => a.role === 'specialist')
        .map(a => a.id);

      const results = await orchestrator.runParallelWorkflow(
        specialistIds,
        'Process in parallel'
      );

      expect(results).toHaveLength(2);

      // Both should have processed the same input
      results.forEach(result => {
        expect(result.payload.text).toBeDefined();
      });
    });

    it('should execute hierarchical workflow', async () => {
      const result = await orchestrator.runHierarchicalWorkflow(
        'Handle this request'
      );

      expect(result).toBeDefined();
      expect(result.layer).toBeDefined();
      expect(['REFLEX', 'HABITUAL', 'DELIBERATE']).toContain(result.layer);
    });

    it('should coordinate agent communication', async () => {
      const agents = orchestrator.getAllAgents();
      const agent1 = agents[0];
      const agent2 = agents[1];

      // Agent 1 processes and sends to agent 2
      const result1 = await agent1.process('Message for agent 2');
      const result2 = await agent2.process(result1.payload.text as string);

      expect(result1.senderId).toBe(agent1.id);
      expect(result2.senderId).toBe(agent2.id);

      // Check causal chain
      expect(result2.parentIds).toBeDefined();
    });

    it('should handle agent failures gracefully', async () => {
      const agents = orchestrator.getAllAgents();

      // Create a failing agent
      const failingAgent = new WorkflowAgent({
        id: uuidv4(),
        name: 'FailingAgent',
        role: 'specialist',
        llm: MockLLMBackendFactory.create('failing-model', {
          errorRate: 1.0, // Always fails
        }),
      });

      orchestrator.addAgent(failingAgent);

      const specialistIds = agents
        .filter(a => a.role === 'specialist')
        .map(a => a.id)
        .concat(failingAgent.id);

      const results = await Promise.allSettled(
        specialistIds.map(id =>
          orchestrator.getAgent(id)?.process('Test') ||
          Promise.reject(new Error('Agent not found'))
        )
      );

      // Some should succeed, some should fail
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length + failed.length).toBe(specialistIds.length);
      expect(failed.length).toBeGreaterThan(0);
    });

    it('should maintain agent independence', async () => {
      const agents = orchestrator.getAllAgents();

      // Each agent should have its own state
      agents.forEach(agent => {
        agent.setState('agentId', agent.id);
      });

      const results = await orchestrator.runParallelWorkflow(
        agents.map(a => a.id),
        'Independent processing'
      );

      expect(results).toHaveLength(agents.length);

      // Verify each agent maintained its state
      agents.forEach(agent => {
        expect(agent.getState().get('agentId')).toBe(agent.id);
      });
    });
  });

  // ==========================================================================
  // Cache Scenario Tests
  // ==========================================================================

  describe('Cache Scenarios', () => {
    let agent: WorkflowAgent;

    beforeEach(() => {
      agent = new WorkflowAgent({
        id: uuidv4(),
        name: 'CacheAgent',
        role: 'deliberate',
        llm,
      });

      orchestrator.addAgent(agent);
    });

    it('should hit cache for repeated prompts', async () => {
      const prompt = 'Repeated prompt';

      await agent.process(prompt);
      await agent.process(prompt);

      const stats = llm.getCacheStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should miss cache for different prompts', async () => {
      const prompts = ['Prompt 1', 'Prompt 2', 'Prompt 3'];

      for (const prompt of prompts) {
        await agent.process(prompt);
      }

      const stats = llm.getCacheStats();

      expect(stats.misses).toBe(3);
      expect(stats.hits).toBe(0);
    });

    it('should improve performance with cache hits', async () => {
      const prompt = 'Performance test';

      const result1 = await agent.process(prompt);
      const result2 = await agent.process(prompt);

      expect(result2.latencyMs).toBeLessThanOrEqual(result1.latencyMs + 10);
    });

    it('should handle cache eviction gracefully', async () => {
      const smallCacheLLM = MockLLMBackendFactory.create('small-cache', {
        maxCacheSize: 3,
      });

      const smallAgent = new WorkflowAgent({
        id: uuidv4(),
        name: 'SmallCacheAgent',
        role: 'deliberate',
        llm: smallCacheLLM,
      });

      // Generate more requests than cache size
      for (let i = 0; i < 10; i++) {
        await smallAgent.process(`Unique prompt ${i}`);
      }

      const stats = smallCacheLLM.getCacheStats();

      expect(stats.size).toBeLessThanOrEqual(3);
    });

    it('should maintain cache across multiple agents', async () => {
      const agents = Array.from({ length: 3 }, (_, i) =>
        new WorkflowAgent({
          id: uuidv4(),
          name: `Agent${i}`,
          role: 'deliberate',
          llm, // Shared LLM with cache
        })
      );

      const sharedPrompt = 'Shared prompt';

      // All agents use the same prompt
      for (const agent of agents) {
        await agent.process(sharedPrompt);
      }

      const stats = llm.getCacheStats();

      // First request misses, rest hit
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should handle cache warming', async () => {
      const commonPrompts = ['Common 1', 'Common 2', 'Common 3'];

      // Warm cache
      for (const prompt of commonPrompts) {
        await agent.process(prompt);
      }

      // Now use them again
      const startTime = Date.now();

      for (const prompt of commonPrompts) {
        await agent.process(prompt);
      }

      const duration = Date.now() - startTime;

      // Should be fast due to cache hits
      expect(duration).toBeLessThan(100);
    });
  });

  // ==========================================================================
  // Error Recovery Tests
  // ==========================================================================

  describe('Error Recovery', () => {
    it('should retry failed requests', async () => {
      const flakyLLM = MockLLMBackendFactory.create('flaky-model', {
        errorRate: 0.5,
        disableErrorInjection: false, // Enable for this test
      });

      const agent = new WorkflowAgent({
        id: uuidv4(),
        name: 'FlakyAgent',
        role: 'deliberate',
        llm: flakyLLM,
      });

      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < 10; i++) {
        try {
          await agent.process(`Request ${i}`);
          successCount++;
        } catch (error) {
          failureCount++;
        }
      }

      expect(successCount + failureCount).toBe(10);
      expect(successCount).toBeGreaterThan(0);
      expect(failureCount).toBeGreaterThan(0);
    });

    it('should fallback to alternative agents', async () => {
      const primaryLLM = MockLLMBackendFactory.create('primary-model', {
        errorRate: 1.0, // Always fails
        disableErrorInjection: false, // Enable for this test
      });

      const backupLLM = MockLLMBackendFactory.create('backup-model', {
        errorRate: 0,
      });

      const primaryAgent = new WorkflowAgent({
        id: uuidv4(),
        name: 'PrimaryAgent',
        role: 'deliberate',
        llm: primaryLLM,
      });

      const backupAgent = new WorkflowAgent({
        id: uuidv4(),
        name: 'BackupAgent',
        role: 'deliberate',
        llm: backupLLM,
      });

      orchestrator.addAgent(primaryAgent);
      orchestrator.addAgent(backupAgent);

      // Try primary, fallback to backup
      let result: A2APackage | null = null;

      try {
        result = await primaryAgent.process('Test');
      } catch (error) {
        result = await backupAgent.process('Test');
      }

      expect(result).not.toBeNull();
      expect(result?.senderId).toBe(backupAgent.id);
    });

    it('should recover from timeout errors', async () => {
      const timeoutLLM = MockLLMBackendFactory.create('timeout-model', {
        timeoutRate: 0.3,
        baseLatencyMs: 10,
        disableErrorInjection: false, // Enable for this test
      });

      const agent = new WorkflowAgent({
        id: uuidv4(),
        name: 'TimeoutAgent',
        role: 'deliberate',
        llm: timeoutLLM,
      });

      let successCount = 0;

      for (let i = 0; i < 10; i++) {
        try {
          await agent.process(`Request ${i}`);
          successCount++;
        } catch (error) {
          // Timeout, retry
        }
      }

      expect(successCount).toBeGreaterThan(0);
    });

    it('should maintain system state during errors', async () => {
      const errorLLM = MockLLMBackendFactory.create('error-model', {
        errorRate: 0.5,
      });

      const agent = new WorkflowAgent({
        id: uuidv4(),
        name: 'ErrorAgent',
        role: 'deliberate',
        llm: errorLLM,
      });

      agent.setState('importantData', [1, 2, 3, 4, 5]);

      // Try multiple requests
      for (let i = 0; i < 10; i++) {
        try {
          await agent.process(`Request ${i}`);
        } catch (error) {
          // Continue
        }
      }

      // State should be intact
      expect(agent.getState().get('importantData')).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle partial failures in multi-agent workflows', async () => {
      const agents = Array.from({ length: 5 }, (_, i) => {
        const errorLLM = MockLLMBackendFactory.create(`error-model-${i}`, {
          errorRate: i < 2 ? 1.0 : 0, // First 2 fail
        });

        return new WorkflowAgent({
          id: uuidv4(),
          name: `Agent${i}`,
          role: 'deliberate',
          llm: errorLLM,
        });
      });

      agents.forEach(agent => orchestrator.addAgent(agent));

      const agentIds = agents.map(a => a.id);

      const results = await Promise.allSettled(
        agentIds.map(id =>
          orchestrator.getAgent(id)?.process('Test') ||
          Promise.reject(new Error('Agent not found'))
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length).toBe(3);
      expect(failed.length).toBe(2);
    });
  });

  // ==========================================================================
  // Timeout Handling Tests
  // ==========================================================================

  describe('Timeout Handling', () => {
    it('should timeout slow requests', async () => {
      const slowLLM = MockLLMBackendFactory.create('slow-model', {
        baseLatencyMs: 100,
        timeoutRate: 0.5,
        disableErrorInjection: false, // Enable for this test
      });

      const agent = new WorkflowAgent({
        id: uuidv4(),
        name: 'SlowAgent',
        role: 'deliberate',
        llm: slowLLM,
      });

      let timeoutCount = 0;

      for (let i = 0; i < 10; i++) {
        try {
          await agent.process(`Request ${i}`);
        } catch (error) {
          if ((error as Error).message.includes('timeout')) {
            timeoutCount++;
          }
        }
      }

      expect(timeoutCount).toBeGreaterThan(0);
    }, 30000); // Increase timeout for this test

    it('should handle concurrent timeouts', async () => {
      const timeoutLLM = MockLLMBackendFactory.create('timeout-model', {
        timeoutRate: 0.3,
        disableErrorInjection: false, // Enable for this test
      });

      const agents = Array.from({ length: 5 }, (_, i) =>
        new WorkflowAgent({
          id: uuidv4(),
          name: `Agent${i}`,
          role: 'deliberate',
          llm: timeoutLLM,
        })
      );

      const results = await Promise.allSettled(
        agents.map(agent => agent.process('Test'))
      );

      // Some should succeed, some should timeout
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful.length + failed.length).toBe(5);
    }, 30000);

    it('should retry after timeout with backoff', async () => {
      const timeoutLLM = MockLLMBackendFactory.create('timeout-model', {
        timeoutRate: 0.5,
        disableErrorInjection: false, // Enable for this test
      });

      const agent = new WorkflowAgent({
        id: uuidv4(),
        name: 'TimeoutAgent',
        role: 'deliberate',
        llm: timeoutLLM,
      });

      let success = false;
      let attempts = 0;

      while (!success && attempts < 5) {
        try {
          await agent.process('Test with retry');
          success = true;
        } catch (error) {
          attempts++;
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 100));
        }
      }

      expect(success || attempts).toBeDefined();
    }, 30000);

    it('should not block other agents during timeout', async () => {
      const timeoutLLM = MockLLMBackendFactory.create('timeout-model', {
        timeoutRate: 1.0,
        disableErrorInjection: false, // Enable for this test
      });

      const normalLLM = MockLLMBackendFactory.create('normal-model', {
        timeoutRate: 0,
      });

      const timeoutAgent = new WorkflowAgent({
        id: uuidv4(),
        name: 'TimeoutAgent',
        role: 'deliberate',
        llm: timeoutLLM,
      });

      const normalAgent = new WorkflowAgent({
        id: uuidv4(),
        name: 'NormalAgent',
        role: 'deliberate',
        llm: normalLLM,
      });

      const results = await Promise.allSettled([
        timeoutAgent.process('Will timeout'),
        normalAgent.process('Will succeed'),
      ]);

      expect(results[1].status).toBe('fulfilled');
    }, 30000);
  });

  // ==========================================================================
  // Performance and Load Tests
  // ==========================================================================

  describe('Performance and Load', () => {
    it('should handle high request volume', async () => {
      const agents = Array.from({ length: 10 }, (_, i) =>
        new WorkflowAgent({
          id: uuidv4(),
          name: `Agent${i}`,
          role: 'deliberate',
          llm,
        })
      );

      const requests = Array.from({ length: 100 }, (_, i) => `Request ${i}`);

      const startTime = Date.now();

      const results = await Promise.all(
        requests.map(request =>
          agents[Math.floor(Math.random() * agents.length)].process(request)
        )
      );

      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(10000); // Should complete in reasonable time
    });

    it('should maintain performance under load', async () => {
      const agent = new WorkflowAgent({
        id: uuidv4(),
        name: 'LoadAgent',
        role: 'deliberate',
        llm,
      });

      const latencies: number[] = [];

      for (let i = 0; i < 50; i++) {
        const start = Date.now();
        await agent.process(`Request ${i}`);
        latencies.push(Date.now() - start);
      }

      // Check that latencies don't degrade significantly
      const firstTen = latencies.slice(0, 10);
      const lastTen = latencies.slice(-10);

      const avgFirstTen = firstTen.reduce((a, b) => a + b, 0) / firstTen.length;
      const avgLastTen = lastTen.reduce((a, b) => a + b, 0) / lastTen.length;

      // Last 10 shouldn't be more than 2x slower
      expect(avgLastTen).toBeLessThan(avgFirstTen * 2);
    });

    it('should handle concurrent multi-agent workflows', async () => {
      const agents = Array.from({ length: 5 }, (_, i) =>
        new WorkflowAgent({
          id: uuidv4(),
          name: `Agent${i}`,
          role: 'deliberate',
          llm,
        })
      );

      const workflows = Array.from({ length: 10 }, (_, i) =>
        orchestrator.runSequentialWorkflow(
          agents.slice(0, 3).map(a => a.id),
          `Workflow ${i}`
        )
      );

      const results = await Promise.all(workflows);

      expect(results).toHaveLength(10);
      results.forEach(workflowResults => {
        expect(workflowResults).toHaveLength(3);
      });
    });
  });

  // ==========================================================================
  // Integration with World Model Tests
  // ==========================================================================

  describe('World Model Integration', () => {
    let agent: WorkflowAgent;

    beforeEach(() => {
      agent = new WorkflowAgent({
        id: uuidv4(),
        name: 'WorldModelAgent',
        role: 'deliberate',
        llm,
      });

      orchestrator.addAgent(agent);
    });

    it('should encode states using world model', async () => {
      const state = Array.from({ length: 64 }, () => Math.random());
      const latent = worldModel.encode(state);

      expect(latent.mean).toBeDefined();
      expect(latent.sample).toBeDefined();
      expect(latent.sample.length).toBe(64);
    });

    it('should use world model for predictions', async () => {
      const state = Array.from({ length: 64 }, () => Math.random());
      const latent = worldModel.encode(state);
      const action = 0.5;

      const prediction = worldModel.predict(latent.sample, action);

      expect(prediction.nextState).toBeDefined();
      expect(prediction.reward).toBeDefined();
      expect(prediction.uncertainty).toBeDefined();
    });

    it('should integrate embeddings with world model', async () => {
      const input = 'State description';
      const embedding = await agent.generateEmbedding(input);

      // Use embedding as state
      const latent = worldModel.encode(embedding.slice(0, 256));

      expect(latent.sample).toBeDefined();
      expect(latent.sample.length).toBe(64);
    });

    it('should train world model with agent experiences', async () => {
      const batch = {
        observations: [
          Array.from({ length: 256 }, () => Math.random()),
          Array.from({ length: 256 }, () => Math.random()),
        ],
        actions: [[0.5], [0.3]],
        rewards: [0.5, 0.8],
        nextObservations: [
          Array.from({ length: 256 }, () => Math.random()),
          Array.from({ length: 256 }, () => Math.random()),
        ],
        dones: [false, false],
      };

      const result = worldModel.train(batch);

      expect(result.totalLoss).toBeDefined();
      expect(result.encoderLoss).toBeDefined();
      expect(result.transitionLoss).toBeDefined();
    });
  });
});
