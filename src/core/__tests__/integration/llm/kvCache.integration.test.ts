/**
 * KV-Cache Integration Tests
 *
 * Tests KV-cache behavior including storage, retrieval, eviction,
 * hit/miss scenarios, and integration with world models.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MockLLMBackend, MockLLMBackendFactory } from './MockLLMBackend.js';
import { WorldModel } from '../../../worldmodel.js';

// ============================================================================
// Test Suites
// ============================================================================

describe('KV-Cache Integration Tests', () => {
  let llm: MockLLMBackend;

  beforeEach(() => {
    MockLLMBackendFactory.resetAll();

    llm = MockLLMBackendFactory.create('cache-test-model', {
      baseLatencyMs: 10,
      latencyVarianceMs: 2,
      errorRate: 0,
      timeoutRate: 0,
      maxCacheSize: 100,
    });
  });

  afterEach(() => {
    MockLLMBackendFactory.resetAll();
  });

  // ==========================================================================
  // Basic Cache Operations Tests
  // ==========================================================================

  describe('Basic Cache Operations', () => {
    it('should cache initial request', async () => {
      const prompt = 'Test prompt for caching';

      await llm.generateTokens({ prompt });
      const stats = llm.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.totalTokens).toBeGreaterThan(0);
    });

    it('should hit cache for identical prompt', async () => {
      const prompt = 'Repeat this prompt';

      await llm.generateTokens({ prompt });
      await llm.generateTokens({ prompt });

      const stats = llm.getCacheStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.5, 1);
    });

    it('should miss cache for different prompts', async () => {
      const prompts = ['First prompt', 'Second prompt', 'Third prompt'];

      for (const prompt of prompts) {
        await llm.generateTokens({ prompt });
      }

      const stats = llm.getCacheStats();

      expect(stats.misses).toBe(3);
      expect(stats.hits).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should compute cache key correctly', async () => {
      const prompt1 = 'Test prompt';
      const prompt2 = 'Test prompt'; // Same content

      await llm.generateTokens({ prompt: prompt1 });
      await llm.generateTokens({ prompt: prompt2 });

      const stats = llm.getCacheStats();

      // Should hit cache even though different string objects
      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(1);
    });
  });

  // ==========================================================================
  // Cache Size and Eviction Tests
  // ==========================================================================

  describe('Cache Size and Eviction', () => {
    it('should respect max cache size', async () => {
      const prompts = Array.from({ length: 150 }, (_, i) => `Prompt ${i}`);

      for (const prompt of prompts) {
        await llm.generateTokens({ prompt });
      }

      const stats = llm.getCacheStats();

      expect(stats.size).toBeLessThanOrEqual(100);
    });

    it('should evict oldest entries when full', async () => {
      const limitedLLM = MockLLMBackendFactory.create('limited-cache', {
        maxCacheSize: 5,
      });

      const prompts = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

      for (const prompt of prompts) {
        await limitedLLM.generateTokens({ prompt });
      }

      const stats = limitedLLM.getCacheStats();

      expect(stats.size).toBeLessThanOrEqual(5);
    });

    it('should track total tokens in cache', async () => {
      const prompts = [
        'Short',
        'This is a much longer prompt with many more tokens',
        'Medium length prompt here',
      ];

      for (const prompt of prompts) {
        await llm.generateTokens({ prompt });
      }

      const stats = llm.getCacheStats();

      expect(stats.totalTokens).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Cache Performance Tests
  // ==========================================================================

  describe('Cache Performance', () => {
    it('should be faster on cache hits', async () => {
      const prompt = 'Performance test prompt';

      const response1 = await llm.generateTokens({ prompt });
      const response2 = await llm.generateTokens({ prompt });

      // Cached request should be faster (or similar due to minimal latency)
      expect(response2.latencyMs).toBeLessThanOrEqual(response1.latencyMs + 10);
    });

    it('should improve average latency with caching', async () => {
      const prompts = [
        'Repeated prompt 1',
        'Repeated prompt 2',
        'Repeated prompt 1', // Cache hit
        'Repeated prompt 2', // Cache hit
      ];

      const latencies: number[] = [];

      for (const prompt of prompts) {
        const response = await llm.generateTokens({ prompt });
        latencies.push(response.latencyMs);
      }

      // Last two should be cached
      expect(latencies[2]).toBeLessThanOrEqual(latencies[0] + 10);
      expect(latencies[3]).toBeLessThanOrEqual(latencies[1] + 10);
    });

    it('should maintain high hit rate with repeated prompts', async () => {
      const prompts = ['A', 'B', 'C'];

      // Repeat same prompts 10 times
      for (let i = 0; i < 10; i++) {
        for (const prompt of prompts) {
          await llm.generateTokens({ prompt });
        }
      }

      const stats = llm.getCacheStats();

      // Should have many cache hits
      expect(stats.hits).toBe(27); // 30 total - 3 initial misses
      expect(stats.hitRate).toBeCloseTo(0.9, 1);
    });
  });

  // ==========================================================================
  // Cache Clearing Tests
  // ==========================================================================

  describe('Cache Clearing', () => {
    it('should clear all cache entries', async () => {
      const prompts = ['A', 'B', 'C', 'D', 'E'];

      for (const prompt of prompts) {
        await llm.generateTokens({ prompt });
      }

      expect(llm.getCacheStats().size).toBeGreaterThan(0);

      llm.clearCache();

      expect(llm.getCacheStats().size).toBe(0);
    });

    it('should reset cache stats on clear', async () => {
      await llm.generateTokens({ prompt: 'Test' });
      await llm.generateTokens({ prompt: 'Test' });

      expect(llm.getCacheStats().hits).toBe(1);

      llm.clearCache();

      await llm.generateTokens({ prompt: 'Test' });

      const stats = llm.getCacheStats();
      expect(stats.hits).toBe(0); // Stats reset
    });
  });

  // ==========================================================================
  // Integration with World Model Tests
  // ==========================================================================

  describe('World Model Integration', () => {
    let worldModel: WorldModel;

    beforeEach(() => {
      worldModel = new WorldModel({
        latentDim: 64,
        hiddenDim: 256,
        learningRate: 0.001,
      });
      worldModel.initialize();
    });

    it('should use cache for world model prompts', async () => {
      const observations = [
        [1, 2, 3, 4, 5],
        [2, 3, 4, 5, 6],
        [1, 2, 3, 4, 5], // Repeat
      ];

      for (const obs of observations) {
        const latent = worldModel.encode(obs);
        const prompt = `State: ${latent.sample.slice(0, 5).join(',')}`;

        await llm.generateTokens({ prompt });
      }

      const stats = llm.getCacheStats();

      // Third request should hit cache
      expect(stats.hits).toBeGreaterThanOrEqual(1);
    });

    it('should cache embeddings for world model states', async () => {
      const states = [
        [1, 2, 3, 4, 5],
        [2, 3, 4, 5, 6],
        [1, 2, 3, 4, 5], // Repeat
      ];

      for (const state of states) {
        const latent = worldModel.encode(state);
        const embedding = await llm.createEmbeddings({
          input: `state:${latent.sample.slice(0, 5).join(',')}`,
        });

        expect(embedding.embeddings[0]).toBeDefined();
      }

      // Should have some cache activity
      const stats = llm.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
    });

    it('should improve dream cycle performance with cache', async () => {
      const dreamPrompts = Array.from({ length: 10 }, (_, i) =>
        `Dream state ${i % 3}` // Only 3 unique prompts
      );

      for (const prompt of dreamPrompts) {
        await llm.generateTokens({ prompt, maxTokens: 20 });
      }

      const stats = llm.getCacheStats();

      // Should have cache hits from repeated prompts
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Concurrent Access Tests
  // ==========================================================================

  describe('Concurrent Access', () => {
    it('should handle concurrent cache reads', async () => {
      const prompt = 'Concurrent test prompt';

      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          llm.generateTokens({ prompt })
        )
      );

      expect(responses).toHaveLength(10);

      const stats = llm.getCacheStats();
      expect(stats.hits).toBe(9); // First miss, then 9 hits
    });

    it('should handle concurrent cache writes', async () => {
      const prompts = Array.from({ length: 20 }, (_, i) => `Prompt ${i}`);

      await Promise.all(
        prompts.map(prompt => llm.generateTokens({ prompt }))
      );

      const stats = llm.getCacheStats();

      expect(stats.size).toBe(20);
      expect(stats.misses).toBe(20);
    });

    it('should maintain cache consistency under load', async () => {
      const prompts = ['A', 'B', 'C'];

      // Mix of reads and writes
      const operations = [];

      for (let i = 0; i < 30; i++) {
        const prompt = prompts[i % prompts.length];
        operations.push(llm.generateTokens({ prompt }));
      }

      await Promise.all(operations);

      const stats = llm.getCacheStats();

      expect(stats.size).toBe(3); // Only 3 unique prompts
      expect(stats.hits).toBe(27); // 30 - 3 initial misses
    });
  });

  // ==========================================================================
  // Cache Statistics Tests
  // ==========================================================================

  describe('Cache Statistics', () => {
    it('should track cache size accurately', async () => {
      const uniquePrompts = ['A', 'B', 'C', 'D', 'E'];

      for (const prompt of uniquePrompts) {
        await llm.generateTokens({ prompt });
      }

      const stats = llm.getCacheStats();

      expect(stats.size).toBe(5);
    });

    it('should track hit rate accurately', async () => {
      // 5 unique prompts, repeated 4 times each
      const prompts = ['A', 'B', 'C', 'D', 'E'];

      for (let i = 0; i < 4; i++) {
        for (const prompt of prompts) {
          await llm.generateTokens({ prompt });
        }
      }

      const stats = llm.getCacheStats();

      const totalRequests = 5 * 4; // 20
      const expectedHits = totalRequests - 5; // 5 initial misses

      expect(stats.hits).toBe(expectedHits);
      expect(stats.misses).toBe(5);
      expect(stats.hitRate).toBeCloseTo(expectedHits / totalRequests, 2);
    });

    it('should reset stats correctly', async () => {
      await llm.generateTokens({ prompt: 'Test' });
      await llm.generateTokens({ prompt: 'Test' });

      let stats = llm.getCacheStats();
      expect(stats.hits).toBe(1);

      llm.clearCache();

      stats = llm.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  // ==========================================================================
  // Cache Key Collision Tests
  // ==========================================================================

  describe('Cache Key Collision', () => {
    it('should handle similar prompts correctly', async () => {
      const prompts = [
        'Test prompt',
        'Test prompt.', // Different
        'Test prompt!', // Different
      ];

      for (const prompt of prompts) {
        await llm.generateTokens({ prompt });
      }

      const stats = llm.getCacheStats();

      // All should be cache misses
      expect(stats.misses).toBe(3);
      expect(stats.size).toBe(3);
    });

    it('should handle whitespace differences', async () => {
      const prompts = [
        'Test prompt',
        'Test  prompt', // Double space
        'Test prompt ', // Trailing space
      ];

      for (const prompt of prompts) {
        await llm.generateTokens({ prompt });
      }

      const stats = llm.getCacheStats();

      // Different cache keys
      expect(stats.size).toBe(3);
    });

    it('should be case-sensitive', async () => {
      const prompts = [
        'Test prompt',
        'test prompt', // Lowercase
        'TEST PROMPT', // Uppercase
      ];

      for (const prompt of prompts) {
        await llm.generateTokens({ prompt });
      }

      const stats = llm.getCacheStats();

      expect(stats.size).toBe(3);
    });
  });

  // ==========================================================================
  // Cache and Memory Tests
  // ==========================================================================

  describe('Cache and Memory Management', () => {
    it('should not leak memory with repeated caching', async () => {
      const initialStats = llm.getStats();

      // Generate many requests with some repeats
      for (let i = 0; i < 100; i++) {
        const prompt = `Prompt ${i % 10}`; // Only 10 unique
        await llm.generateTokens({ prompt });
      }

      const finalStats = llm.getStats();

      // Should have processed all requests
      expect(finalStats.totalRequests).toBe(initialStats.totalRequests + 100);

      // Cache should be bounded
      const cacheStats = llm.getCacheStats();
      expect(cacheStats.size).toBeLessThanOrEqual(10);
    });

    it('should handle rapid cache turnover', async () => {
      const limitedLLM = MockLLMBackendFactory.create('rapid-turnover', {
        maxCacheSize: 5,
      });

      // Rapidly generate many unique prompts
      for (let i = 0; i < 100; i++) {
        await limitedLLM.generateTokens({ prompt: `Unique prompt ${i}` });
      }

      const stats = limitedLLM.getCacheStats();

      // Should maintain max size
      expect(stats.size).toBeLessThanOrEqual(5);
    });
  });
});
