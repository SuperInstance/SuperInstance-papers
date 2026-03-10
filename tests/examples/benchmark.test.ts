/**
 * Benchmarking Examples - Demonstrates BenchmarkRunner usage
 *
 * Run with: npm test benchmark.test.ts
 *
 * Note: These tests may take longer to run due to performance measurements
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import {
  BenchmarkRunner,
  CellTestHelper,
  ColonyTestHelper,
  TestDataManager
} from '../../src/spreadsheet/testing';

describe('Benchmarking Examples', () => {
  afterEach(() => {
    BenchmarkRunner.clear();
    CellTestHelper.cleanup();
    ColonyTestHelper.cleanup();
  });

  describe('Basic Benchmarking', () => {
    it('should benchmark a simple operation', async () => {
      const result = await BenchmarkRunner.benchmark('addition', async () => {
        return 1 + 1;
      }, { iterations: 100 });

      expect(result.name).toBe('addition');
      expect(result.iterations).toBe(100);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.opsPerSecond).toBeGreaterThan(0);
    });

    it('should benchmark with warmup', async () => {
      const result = await BenchmarkRunner.benchmark('math', async () => {
        Math.sqrt(Math.random() * 1000);
      }, {
        iterations: 50,
        warmupIterations: 10
      });

      expect(result.iterations).toBe(50);
      expect(result.averageTime).toBeGreaterThan(0);
    });

    it('should collect memory statistics', async () => {
      const result = await BenchmarkRunner.benchmark('array-allocation', async () => {
        const arr = new Array(1000).fill(0);
        return arr.length;
      }, {
        iterations: 100,
        collectMemory: true
      });

      expect(result.memoryBefore).toBeGreaterThan(0);
      expect(result.memoryAfter).toBeGreaterThan(0);
      expect(result.memoryDelta).toBeGreaterThanOrEqual(0);
    });

    it('should collect percentiles', async () => {
      const result = await BenchmarkRunner.benchmark('variable-operation', async () => {
        const delay = Math.random() * 10;
        await new Promise(resolve => setTimeout(resolve, delay));
      }, {
        iterations: 50,
        collectPercentiles: true
      });

      expect(result.percentile95).toBeGreaterThan(0);
      expect(result.percentile99).toBeGreaterThanOrEqual(result.percentile95);
    });
  });

  describe('Cell Benchmarking', () => {
    it('should benchmark cell processing', async () => {
      const cell = CellTestHelper.createTestCell({
        type: 'transform'
      });

      const inputs = Array.from({ length: 100 }, (_, i) => i);
      const result = await BenchmarkRunner.benchmarkCell(cell, inputs, {
        iterations: 10
      });

      expect(result.name).toContain(cell.id);
      expect(result.iterations).toBe(10);
    });

    it('should benchmark multiple cells', async () => {
      const cells = CellTestHelper.createTestCells(5);
      const inputs = [1, 2, 3, 4, 5];

      const results = await Promise.all(
        cells.map(cell =>
          BenchmarkRunner.benchmarkCell(cell, inputs, { iterations: 5 })
        )
      );

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.averageTime).toBeGreaterThan(0);
      });
    });

    it('should benchmark cell chain', async () => {
      const chain = CellTestHelper.createCellChain(10);
      const input = 42;

      const result = await BenchmarkRunner.benchmark('chain-processing', async () => {
        for (const cell of chain) {
          await cell.process(input);
        }
      }, { iterations: 50 });

      expect(result.averageTime).toBeGreaterThan(0);
    });
  });

  describe('Colony Benchmarking', () => {
    it('should benchmark colony tick', async () => {
      const colony = ColonyTestHelper.createTestColony({
        mockAgents: Array.from({ length: 20 }, (_, i) => ({
          id: `agent-${i}`,
          type: 'test',
          config: {},
          capabilities: ['test']
        }))
      });

      const result = await BenchmarkRunner.benchmarkColony(colony, {
        iterations: 100
      });

      expect(result.name).toContain(colony.id);
      expect(result.iterations).toBe(100);
    });

    it('should compare colony sizes', async () => {
      const smallColony = ColonyTestHelper.createTestColony({
        mockAgents: Array.from({ length: 10 }, (_, i) => ({
          id: `agent-${i}`,
          type: 'test',
          config: {},
          capabilities: ['test']
        }))
      });

      const largeColony = ColonyTestHelper.createTestColony({
        mockAgents: Array.from({ length: 100 }, (_, i) => ({
          id: `agent-${i}`,
          type: 'test',
          config: {},
          capabilities: ['test']
        }))
      });

      const smallResult = await BenchmarkRunner.benchmarkColony(smallColony, {
        iterations: 50
      });

      const largeResult = await BenchmarkRunner.benchmarkColony(largeColony, {
        iterations: 50
      });

      expect(largeResult.averageTime).toBeGreaterThan(smallResult.averageTime);
    });
  });

  describe('Benchmark Suites', () => {
    it('should run benchmark suite', async () => {
      const operations = new Map([
        ['fast', async () => Math.random()],
        ['medium', async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
        }],
        ['slow', async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
        }]
      ]);

      const results = await BenchmarkRunner.benchmarkSuite(
        'timing-suite',
        operations,
        { iterations: 20 }
      );

      expect(results).toHaveLength(3);
      expect(results[0].name).toContain('fast');
      expect(results[1].name).toContain('medium');
      expect(results[2].name).toContain('slow');

      // Verify ordering
      expect(results[0].averageTime).toBeLessThan(results[1].averageTime);
      expect(results[1].averageTime).toBeLessThan(results[2].averageTime);
    });

    it('should compare implementations', async () => {
      const data = Array.from({ length: 1000 }, () => Math.random());

      const implementations = new Map([
        ['reduce', async () => {
          return data.reduce((sum, val) => sum + val, 0);
        }],
        ['loop', async () => {
          let sum = 0;
          for (const val of data) {
            sum += val;
          }
          return sum;
        }]
      ]);

      const results = await BenchmarkRunner.benchmarkSuite(
        'sum-comparison',
        implementations,
        { iterations: 100 }
      );

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.averageTime).toBeGreaterThan(0);
      });
    });
  });

  describe('Load Testing', () => {
    it('should run load test', async () => {
      const result = await BenchmarkRunner.loadTest('simple-load', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      }, {
        duration: 1000,
        concurrentUsers: 10
      });

      expect(result.name).toBe('simple-load');
      expect(result.totalOperations).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
    });

    it('should measure error rate', async () => {
      let failureRate = 0.1;

      const result = await BenchmarkRunner.loadTest('error-load', async () => {
        if (Math.random() < failureRate) {
          throw new Error('Random failure');
        }
      }, {
        duration: 500,
        concurrentUsers: 5
      });

      expect(result.failedOperations).toBeGreaterThan(0);
      expect(result.errorRate).toBeGreaterThan(0);
    });

    it('should vary load over time', async () => {
      const results = [];

      for (const users of [5, 10, 20]) {
        const result = await BenchmarkRunner.loadTest('ramp-up', async () => {
          await Promise.resolve();
        }, {
          duration: 500,
          concurrentUsers: users
        });

        results.push({ users, throughput: result.throughput });
      }

      // Throughput should generally increase with more users
      expect(results[2].throughput).toBeGreaterThan(results[0].throughput);
    });
  });

  describe('Stress Testing', () => {
    it('should find breaking point', async () => {
      const result = await BenchmarkRunner.stressTest('agent-stress', async () => {
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 10));
      }, {
        initialLoad: 5,
        loadIncrement: 5,
        maxLoad: 50,
        durationPerLevel: 500
      });

      expect(result.breakingPoint).toBeGreaterThan(0);
      expect(result.breakingPoint).toBeLessThanOrEqual(result.maxLoad);
    });

    it('should measure max throughput', async () => {
      const result = await BenchmarkRunner.stressTest('throughput-stress', async () => {
        await Promise.resolve();
      }, {
        initialLoad: 10,
        loadIncrement: 10,
        maxLoad: 100,
        durationPerLevel: 1000
      });

      expect(result.maxThroughput).toBeGreaterThan(0);
    });
  });

  describe('Memory Profiling', () => {
    it('should profile memory usage', async () => {
      const result = await BenchmarkRunner.profileMemory('array-profile', async () => {
        const arr = new Array(1000).fill({ data: 'test' });
        return arr.length;
      }, 100);

      expect(result.name).toBe('array-profile');
      expect(result.heapDelta).toBeGreaterThan(0);
    });

    it('should detect memory leaks', async () => {
      // This would normally return true if there's a leak
      const hasLeak = await BenchmarkRunner.detectMemoryLeak('leak-test', async () => {
        const arr = new Array(100).fill(0);
        return arr.length;
      }, 50);

      // Should return false for this simple case
      expect(typeof hasLeak).toBe('boolean');
    });

    it('should profile complex operations', async () => {
      const result = await BenchmarkRunner.profileMemory('complex-profile', async () => {
        const map = new Map();
        for (let i = 0; i < 1000; i++) {
          map.set(i, { data: Math.random(), timestamp: Date.now() });
        }
        return map.size;
      }, 50);

      expect(result.heapDelta).toBeGreaterThan(0);
    });
  });

  describe('Comparison Tracking', () => {
    it('should set and compare baseline', async () => {
      // Set baseline
      const baseline = await BenchmarkRunner.benchmark('test-operation', async () => {
        return Math.random();
      }, { iterations: 100 });

      BenchmarkRunner.setBaseline('test-operation', baseline);

      // Run current
      const current = await BenchmarkRunner.benchmark('test-operation', async () => {
        return Math.random();
      }, { iterations: 100 });

      const comparison = BenchmarkRunner.compareWithBaseline('test-operation', current);

      expect(comparison).toBeDefined();
      expect(comparison?.baseline).toBe(baseline);
      expect(comparison?.current).toBe(current);
      expect(comparison?.improvement).toBeGreaterThanOrEqual(-100);
      expect(comparison?.improvement).toBeLessThanOrEqual(100);
    });

    it('should track comparison history', async () => {
      const operation = 'history-operation';

      // Run multiple comparisons
      for (let i = 0; i < 3; i++) {
        const result = await BenchmarkRunner.benchmark(operation, async () => {
          await new Promise(resolve => setTimeout(resolve, 1));
        }, { iterations: 50 });

        if (i === 0) {
          BenchmarkRunner.setBaseline(operation, result);
        } else {
          BenchmarkRunner.compareWithBaseline(operation, result);
        }
      }

      const history = BenchmarkRunner.getComparisonHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Report Generation', () => {
    it('should generate benchmark report', async () => {
      const results = await Promise.all([
        BenchmarkRunner.benchmark('op1', async () => Math.random(), { iterations: 100 }),
        BenchmarkRunner.benchmark('op2', async () => Math.random() * 2, { iterations: 100 }),
        BenchmarkRunner.benchmark('op3', async () => Math.random() * 3, { iterations: 100 })
      ]);

      const report = BenchmarkRunner.generateReport(results);

      expect(report).toContain('BENCHMARK REPORT');
      expect(report).toContain('op1');
      expect(report).toContain('op2');
      expect(report).toContain('op3');
      expect(report).toContain('Average Time');
      expect(report).toContain('Ops/Second');
    });

    it('should generate comparison report', () => {
      const mockEntry = {
        name: 'test-comparison',
        baseline: {
          name: 'test',
          iterations: 100,
          totalTime: 1000,
          averageTime: 10,
          minTime: 5,
          maxTime: 20,
          percentile95: 15,
          percentile99: 18,
          opsPerSecond: 100,
          memoryBefore: 1000,
          memoryAfter: 1100,
          memoryDelta: 100,
          timestamp: Date.now(),
          metadata: {}
        },
        current: {
          name: 'test',
          iterations: 100,
          totalTime: 900,
          averageTime: 9,
          minTime: 4,
          maxTime: 18,
          percentile95: 14,
          percentile99: 16,
          opsPerSecond: 111,
          memoryBefore: 1100,
          memoryAfter: 1200,
          memoryDelta: 100,
          timestamp: Date.now(),
          metadata: {}
        },
        improvement: 10,
        significant: true,
        timestamp: Date.now()
      };

      // Manually add to history for testing
      (BenchmarkRunner as any).comparisonHistory = [mockEntry];

      const report = BenchmarkRunner.generateComparisonReport();

      expect(report).toContain('COMPARISON REPORT');
      expect(report).toContain('test-comparison');
      expect(report).toContain('10.00%'); // improvement
      expect(report).toContain('Yes'); // significant
    });
  });

  describe('Data-Intensive Benchmarks', () => {
    it('should benchmark large dataset processing', async () => {
      const dataset = TestDataManager.generate({
        rows: 1000,
        columns: 10,
        dataType: 'number'
      });

      const result = await BenchmarkRunner.benchmark('large-dataset', async () => {
        let sum = 0;
        for (const row of dataset) {
          for (const value of row) {
            sum += value;
          }
        }
        return sum;
      }, { iterations: 50 });

      expect(result.averageTime).toBeGreaterThan(0);
    });

    it('should benchmark formula evaluation', async () => {
      const spreadsheet = TestDataManager.createFinancialSpreadsheet();

      const result = await BenchmarkRunner.benchmark('formula-eval', async () => {
        const cells = Object.values(spreadsheet.data.cells);
        const formulas = cells.filter(c => c.formula);

        for (const cell of formulas) {
          // Simulate formula evaluation
          if (cell.formula) {
            cell.formula.length;
          }
        }

        return formulas.length;
      }, { iterations: 100 });

      expect(result.averageTime).toBeGreaterThan(0);
    });
  });
});
