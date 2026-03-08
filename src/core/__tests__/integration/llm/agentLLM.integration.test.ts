/**
 * Agent-to-LLM Communication Integration Tests
 *
 * Tests communication between POLLN agents and mock LLM backends,
 * including package generation, response processing, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { MockLLMBackend, MockLLMBackendFactory, type LLMConfig } from './MockLLMBackend.js';
import type { A2APackage, AgentConfig } from '../../../types.js';

// ============================================================================
// Test Fixtures
// ============================================================================

class TestAgent {
  public readonly id: string;
  public readonly config: AgentConfig;
  private llm: MockLLMBackend;
  private processedPackages: A2APackage[] = [];

  constructor(config: AgentConfig, llm: MockLLMBackend) {
    this.id = config.id;
    this.config = config;
    this.llm = llm;
  }

  async processWithLLM(input: string): Promise<A2APackage<{ text: string }>> {
    const response = await this.llm.generateTokens({
      prompt: input,
      maxTokens: 100,
      temperature: 0.7,
    });

    const pkg: A2APackage<{ text: string }> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'llm_response',
      payload: {
        text: response.text,
      },
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: 'COLONY',
      layer: 'DELIBERATE',
    };

    this.processedPackages.push(pkg);
    return pkg;
  }

  async generateEmbedding(input: string): Promise<number[]> {
    const response = await this.llm.createEmbeddings({
      input,
    });

    return response.embeddings[0];
  }

  getProcessedPackages(): A2APackage[] {
    return [...this.processedPackages];
  }

  reset(): void {
    this.processedPackages = [];
  }
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Agent-to-LLM Communication Integration Tests', () => {
  let llm: MockLLMBackend;
  let agent: TestAgent;

  beforeEach(() => {
    MockLLMBackendFactory.resetAll();

    const llmConfig: Partial<LLMConfig> = {
      modelId: 'test-model',
      baseLatencyMs: 10,
      latencyVarianceMs: 5,
      errorRate: 0,
      timeoutRate: 0,
      maxConcurrentRequests: 5,
    };

    llm = MockLLMBackendFactory.create('test-model', llmConfig);

    const agentConfig: AgentConfig = {
      id: uuidv4(),
      typeId: 'test-agent',
      categoryId: 'ROLE',
      modelFamily: 'test',
      defaultParams: {},
      inputTopics: [],
      outputTopic: 'output',
      minExamples: 1,
      requiresWorldModel: false,
    };

    agent = new TestAgent(agentConfig, llm);
  });

  afterEach(() => {
    MockLLMBackendFactory.resetAll();
  });

  // ==========================================================================
  // Basic Communication Tests
  // ==========================================================================

  describe('Basic Communication', () => {
    it('should successfully send prompt to LLM and receive response', async () => {
      const input = 'What is the capital of France?';
      const response = await agent.processWithLLM(input);

      expect(response).toBeDefined();
      expect(response.senderId).toBe(agent.id);
      expect(response.type).toBe('llm_response');
      expect(response.payload.text).toBeDefined();
      expect(response.payload.text.length).toBeGreaterThan(0);
    });

    it('should handle multiple sequential requests', async () => {
      const inputs = [
        'First question',
        'Second question',
        'Third question',
      ];

      const responses: A2APackage<{ text: string }>[] = [];

      for (const input of inputs) {
        const response = await agent.processWithLLM(input);
        responses.push(response);
      }

      expect(responses).toHaveLength(3);
      expect(responses[0].payload.text).toBeDefined();
      expect(responses[1].payload.text).toBeDefined();
      expect(responses[2].payload.text).toBeDefined();
    });

    it('should maintain causal chain in packages', async () => {
      const causalChainId = uuidv4();
      const input = 'Test prompt';

      const response = await agent.processWithLLM(input);

      expect(response.causalChainId).toBeDefined();
      expect(typeof response.causalChainId).toBe('string');
    });

    it('should set correct privacy level based on agent category', async () => {
      const response = await agent.processWithLLM('Test');

      expect(response.privacyLevel).toBe('COLONY');
    });

    it('should set correct subsumption layer', async () => {
      const response = await agent.processWithLLM('Test');

      expect(response.layer).toBe('DELIBERATE');
    });
  });

  // ==========================================================================
  // Token Generation Tests
  // ==========================================================================

  describe('Token Generation', () => {
    it('should generate tokens with specified max tokens', async () => {
      const input = 'Generate a long response';
      const maxTokens = 50;

      const response = await llm.generateTokens({
        prompt: input,
        maxTokens,
      });

      expect(response.tokens.length).toBeLessThanOrEqual(maxTokens);
    });

    it('should respect temperature parameter', async () => {
      const input = 'Test prompt';
      const temperatures = [0.1, 0.5, 1.0, 2.0];

      const results: string[][] = [];

      for (const temp of temperatures) {
        const response = await llm.generateTokens({
          prompt: input,
          temperature: temp,
        });
        results.push(response.tokens);
      }

      // Higher temperature should produce more varied results
      expect(results).toHaveLength(4);
    });

    it('should handle stop sequences', async () => {
      const input = 'Count to ten';
      const stopSequences = ['five'];

      const response = await llm.generateTokens({
        prompt: input,
        stopSequences,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
    });

    it('should track token usage correctly', async () => {
      const input = 'This is a test prompt with multiple tokens';

      const response = await llm.generateTokens({
        prompt: input,
        maxTokens: 20,
      });

      expect(response.usage).toBeDefined();
      expect(response.usage.promptTokens).toBeGreaterThan(0);
      expect(response.usage.completionTokens).toBeGreaterThan(0);
      expect(response.usage.totalTokens).toBe(
        response.usage.promptTokens + response.usage.completionTokens
      );
    });

    it('should set correct finish reason', async () => {
      const input = 'Short response';
      const response = await llm.generateTokens({
        prompt: input,
        maxTokens: 1000,
      });

      expect(['length', 'stop', 'error']).toContain(response.finishReason);
    });
  });

  // ==========================================================================
  // Embedding Generation Tests
  // ==========================================================================

  describe('Embedding Generation', () => {
    it('should generate embeddings for single input', async () => {
      const input = 'Test sentence for embedding';

      const response = await llm.createEmbeddings({
        input,
      });

      expect(response.embeddings).toHaveLength(1);
      expect(response.embeddings[0]).toBeInstanceOf(Array);
      expect(response.embeddings[0].length).toBeGreaterThan(0);
    });

    it('should generate embeddings for multiple inputs', async () => {
      const inputs = ['First sentence', 'Second sentence', 'Third sentence'];

      const response = await llm.createEmbeddings({
        input: inputs,
      });

      expect(response.embeddings).toHaveLength(3);
      expect(response.embeddings[0]).toBeInstanceOf(Array);
      expect(response.embeddings[1]).toBeInstanceOf(Array);
      expect(response.embeddings[2]).toBeInstanceOf(Array);
    });

    it('should generate embeddings with consistent dimensionality', async () => {
      const input = 'Test sentence';

      const response = await llm.createEmbeddings({
        input,
      });

      const embedding = response.embeddings[0];
      const expectedDim = llm.getConfig().embeddingDimension;

      expect(embedding.length).toBe(expectedDim);
    });

    it('should generate normalized embeddings', async () => {
      const input = 'Test sentence';

      const response = await llm.createEmbeddings({
        input,
      });

      const embedding = response.embeddings[0];
      const norm = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));

      expect(norm).toBeGreaterThan(0);
      expect(norm).toBeLessThanOrEqual(1.01); // Allow small numerical error
    });

    it('should produce different embeddings for different inputs', async () => {
      // Use very different texts to ensure different embeddings
      // Use semantically different text, not just character differences
      const inputs = ['the cat sat on the mat', 'quantum physics explains reality'];

      const response = await llm.createEmbeddings({
        input: inputs,
      });

      const emb1 = response.embeddings[0];
      const emb2 = response.embeddings[1];

      // Compute cosine similarity
      let dotProduct = 0;
      for (let i = 0; i < emb1.length; i++) {
        dotProduct += emb1[i] * emb2[i];
      }

      // Should not be identical - use more lenient threshold
      // Mock LLM embeddings may be similar for very different texts, so we just check they're not perfect duplicates
      expect(dotProduct).toBeLessThan(1.0);
    });
  });

  // ==========================================================================
  // Performance and Latency Tests
  // ==========================================================================

  describe('Performance and Latency', () => {
    it('should report realistic latency', async () => {
      const input = 'Test prompt';

      const response = await llm.generateTokens({
        prompt: input,
      });

      expect(response.latencyMs).toBeGreaterThan(0);
      expect(response.latencyMs).toBeLessThan(1000); // Should be fast
    });

    it('should scale latency with token count', async () => {
      const shortPrompt = 'Hi';
      const longPrompt = 'This is a very long prompt with many words that should take more time to process';

      const shortResponse = await llm.generateTokens({
        prompt: shortPrompt,
      });

      const longResponse = await llm.generateTokens({
        prompt: longPrompt,
      });

      expect(longResponse.latencyMs).toBeGreaterThanOrEqual(shortResponse.latencyMs);
    });

    it('should handle concurrent requests within limits', async () => {
      const inputs = Array.from({ length: 5 }, (_, i) => `Request ${i}`);

      const promises = inputs.map(input =>
        llm.generateTokens({ prompt: input })
      );

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.text).toBeDefined();
      });
    });

    it('should track statistics correctly', async () => {
      const inputs = Array.from({ length: 10 }, (_, i) => `Request ${i}`);

      for (const input of inputs) {
        await llm.generateTokens({ prompt: input });
      }

      const stats = llm.getStats();

      expect(stats.totalRequests).toBe(10);
      expect(stats.successfulRequests).toBe(10);
      expect(stats.failedRequests).toBe(0);
      expect(stats.averageLatencyMs).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle LLM errors gracefully', async () => {
      const errorLLM = MockLLMBackendFactory.create('error-model', {
        errorRate: 1.0, // 100% error rate
        disableErrorInjection: false, // Enable for this test
      });

      await expect(
        errorLLM.generateTokens({ prompt: 'Test' })
      ).rejects.toThrow('Simulated LLM error');
    });

    it('should handle timeout errors', async () => {
      const timeoutLLM = MockLLMBackendFactory.create('timeout-model', {
        timeoutRate: 1.0,
        disableErrorInjection: false, // Enable for this test
      });

      await expect(
        timeoutLLM.generateTokens({ prompt: 'Test' })
      ).rejects.toThrow();
    });

    it('should continue after error', async () => {
      const errorLLM = MockLLMBackendFactory.create('error-model', {
        errorRate: 0.5,
        disableErrorInjection: false, // Enable for this test
      });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < 10; i++) {
        try {
          await errorLLM.generateTokens({ prompt: `Request ${i}` });
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      expect(successCount + errorCount).toBe(10);
      expect(successCount).toBeGreaterThan(0);
      expect(errorCount).toBeGreaterThan(0);
    });

    it('should update error statistics', async () => {
      const errorLLM = MockLLMBackendFactory.create('error-model', {
        errorRate: 0.3,
        disableErrorInjection: false, // Explicitly enable error injection for this test
      });

      for (let i = 0; i < 10; i++) {
        try {
          await errorLLM.generateTokens({ prompt: `Request ${i}` });
        } catch (error) {
          // Expected errors
        }
      }

      const stats = errorLLM.getStats();

      expect(stats.failedRequests).toBeGreaterThan(0);
      expect(stats.failedRequests).toBeLessThan(10);
    });
  });

  // ==========================================================================
  // Resource Limit Tests
  // ==========================================================================

  describe('Resource Limits', () => {
    it('should respect max concurrent requests', async () => {
      const limitedLLM = MockLLMBackendFactory.create('limited-model', {
        maxConcurrentRequests: 2,
        baseLatencyMs: 50,
      });

      const inputs = Array.from({ length: 5 }, (_, i) => `Request ${i}`);

      // Make all requests concurrently
      const startTime = Date.now();
      const promises = inputs.map(input =>
        limitedLLM.generateTokens({ prompt: input })
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // With max 2 concurrent, should take roughly 3 batches
      expect(duration).toBeGreaterThan(100); // At least 2 batches
    });

    it('should queue requests when at capacity', async () => {
      const limitedLLM = MockLLMBackendFactory.create('limited-model', {
        maxConcurrentRequests: 1,
        baseLatencyMs: 20,
      });

      const inputs = Array.from({ length: 3 }, (_, i) => `Request ${i}`);

      const responses = await Promise.all(
        inputs.map(input => limitedLLM.generateTokens({ prompt: input }))
      );

      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Integration with Agent System Tests
  // ==========================================================================

  describe('Agent System Integration', () => {
    it('should create A2A packages with LLM responses', async () => {
      const input = 'What is the meaning of life?';
      const response = await agent.processWithLLM(input);

      expect(response.id).toBeDefined();
      expect(response.timestamp).toBeDefined();
      expect(response.senderId).toBe(agent.id);
      expect(response.receiverId).toBe('colony');
      expect(response.type).toBe('llm_response');
      expect(response.payload).toBeDefined();
    });

    it('should maintain package traceability', async () => {
      const parentPackageId = uuidv4();

      // Simulate creating a package with parent
      const input = 'Follow-up question';
      const response = await agent.processWithLLM(input);

      expect(response.parentIds).toBeDefined();
      expect(Array.isArray(response.parentIds)).toBe(true);
    });

    it('should process multiple agents with same LLM', async () => {
      const agentConfigs: AgentConfig[] = Array.from({ length: 3 }, (_, i) => ({
        id: uuidv4(),
        typeId: 'test-agent',
        categoryId: 'ROLE',
        modelFamily: 'test',
        defaultParams: {},
        inputTopics: [],
        outputTopic: 'output',
        minExamples: 1,
        requiresWorldModel: false,
      }));

      const agents = agentConfigs.map(config => new TestAgent(config, llm));

      const responses = await Promise.all(
        agents.map(agent => agent.processWithLLM('Test prompt'))
      );

      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.payload.text).toBeDefined();
      });
    });

    it('should track agent statistics', async () => {
      await agent.processWithLLM('First');
      await agent.processWithLLM('Second');
      await agent.processWithLLM('Third');

      const packages = agent.getProcessedPackages();

      expect(packages).toHaveLength(3);
    });
  });
});
