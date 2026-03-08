/**
 * POLLN Agent Lifecycle Benchmarks
 *
 * Measure performance of agent spawning, initialization,
 * state management, and shutdown operations.
 */

import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import type { BenchmarkSuite, BenchmarkConfig, BenchmarkMetrics } from '../types.js';
import { BaseAgent, TaskAgent, RoleAgent, CoreAgent } from '../../core/agents.js';
import { AgentConfig } from '../../core/types.js';
import { calculateStats, calculateThroughput } from '../benchmark-profiler.js';

/**
 * AgentBenchmarks - Agent lifecycle performance tests
 */
export class AgentBenchmarks implements BenchmarkSuite {
  name = 'agent';
  description = 'Agent lifecycle and operations benchmarks';
  version = '1.0.0';

  private agents: Map<string, BaseAgent> = new Map();

  async setup(): Promise<void> {
    this.agents.clear();
  }

  async teardown(): Promise<void> {
    // Shutdown all agents
    for (const agent of this.agents.values()) {
      await agent.shutdown();
    }
    this.agents.clear();
  }

  benchmarks = new Map<string, (config: BenchmarkConfig) => Promise<BenchmarkMetrics>>([
    ['agent-spawn', this.benchmarkAgentSpawn.bind(this)],
    ['agent-initialize', this.benchmarkAgentInitialize.bind(this)],
    ['agent-process', this.benchmarkAgentProcess.bind(this)],
    ['agent-state-get', this.benchmarkAgentStateGet.bind(this)],
    ['agent-state-set', this.benchmarkAgentStateSet.bind(this)],
    ['agent-value-update', this.benchmarkAgentValueUpdate.bind(this)],
    ['agent-shutdown', this.benchmarkAgentShutdown.bind(this)],
    ['agent-batch-spawn', this.benchmarkAgentBatchSpawn.bind(this)],
    ['agent-communication', this.benchmarkAgentCommunication.bind(this)],
    ['agent-lifecycle-full', this.benchmarkAgentFullLifecycle.bind(this)],
  ]);

  /**
   * Benchmark: Agent spawning
   */
  private async benchmarkAgentSpawn(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();

      const agentConfig: AgentConfig = {
        id: uuidv4(),
        type: 'task',
        category: 'benchmark',
      };

      const agent = new TaskAgent(agentConfig);
      this.agents.set(agent.id, agent);

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Agent initialization
   */
  private async benchmarkAgentInitialize(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    // Pre-create agents
    const agents: BaseAgent[] = [];
    for (let i = 0; i < config.iterations; i++) {
      const agentConfig: AgentConfig = {
        id: uuidv4(),
        type: 'task',
        category: 'benchmark',
      };
      agents.push(new TaskAgent(agentConfig));
    }

    const samples: number[] = [];

    for (const agent of agents) {
      const start = performance.now();
      await agent.initialize();
      const end = performance.now();
      samples.push(end - start);

      this.agents.set(agent.id, agent);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Agent processing
   */
  private async benchmarkAgentProcess(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    // Create and initialize an agent
    const agentConfig: AgentConfig = {
      id: uuidv4(),
      type: 'task',
      category: 'benchmark',
    };
    const agent = new TaskAgent(agentConfig);
    await agent.initialize();
    this.agents.set(agent.id, agent);

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const input = { message: `Benchmark iteration ${i}` };

      const start = performance.now();
      await agent.process(input);
      const end = performance.now();

      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Agent state get
   */
  private async benchmarkAgentStateGet(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const agentConfig: AgentConfig = {
      id: uuidv4(),
      type: 'task',
      category: 'benchmark',
    };
    const agent = new TaskAgent(agentConfig);
    await agent.initialize();

    // Set some state
    agent.setState('testKey', 'testValue');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();
      agent.getState<string>('testKey');
      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Agent state set
   */
  private async benchmarkAgentStateSet(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const agentConfig: AgentConfig = {
      id: uuidv4(),
      type: 'task',
      category: 'benchmark',
    };
    const agent = new TaskAgent(agentConfig);
    await agent.initialize();

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();
      agent.setState(`key${i}`, `value${i}`);
      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Agent value function update
   */
  private async benchmarkAgentValueUpdate(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const agentConfig: AgentConfig = {
      id: uuidv4(),
      type: 'task',
      category: 'benchmark',
    };
    const agent = new TaskAgent(agentConfig);
    await agent.initialize();

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const reward = Math.random() * 2 - 1; // Random reward between -1 and 1

      const start = performance.now();
      agent.updateValueFunction(reward);
      const end = performance.now();

      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Agent shutdown
   */
  private async benchmarkAgentShutdown(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const agents: BaseAgent[] = [];

    // Pre-create agents
    for (let i = 0; i < config.iterations; i++) {
      const agentConfig: AgentConfig = {
        id: uuidv4(),
        type: 'task',
        category: 'benchmark',
      };
      const agent = new TaskAgent(agentConfig);
      await agent.initialize();
      agents.push(agent);
    }

    const samples: number[] = [];

    for (const agent of agents) {
      const start = performance.now();
      await agent.shutdown();
      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Batch agent spawning
   */
  private async benchmarkAgentBatchSpawn(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const batchSize = 10;
    const batches = Math.floor(config.iterations / batchSize);

    const samples: number[] = [];

    for (let i = 0; i < batches; i++) {
      const start = performance.now();

      for (let j = 0; j < batchSize; j++) {
        const agentConfig: AgentConfig = {
          id: uuidv4(),
          type: 'task',
          category: 'benchmark',
        };
        const agent = new TaskAgent(agentConfig);
        this.agents.set(agent.id, agent);
      }

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, batchSize);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Agent communication
   */
  private async benchmarkAgentCommunication(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    // Create two agents
    const agent1Config: AgentConfig = {
      id: uuidv4(),
      type: 'task',
      category: 'benchmark',
    };
    const agent2Config: AgentConfig = {
      id: uuidv4(),
      type: 'task',
      category: 'benchmark',
    };

    const agent1 = new TaskAgent(agent1Config);
    const agent2 = new TaskAgent(agent2Config);

    await Promise.all([agent1.initialize(), agent2.initialize()]);

    this.agents.set(agent1.id, agent1);
    this.agents.set(agent2.id, agent2);

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const message = { from: agent1.id, to: agent2.id, data: `Message ${i}` };

      const start = performance.now();
      await agent1.process(message);
      const end = performance.now();

      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }

  /**
   * Benchmark: Full agent lifecycle
   */
  private async benchmarkAgentFullLifecycle(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();

      // Create
      const agentConfig: AgentConfig = {
        id: uuidv4(),
        type: 'task',
        category: 'benchmark',
      };
      const agent = new TaskAgent(agentConfig);

      // Initialize
      await agent.initialize();

      // Process
      await agent.process({ message: 'Test' });

      // Update state
      agent.setState('key', 'value');
      agent.getState('key');

      // Shutdown
      await agent.shutdown();

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 1);

    return {
      ...stats,
      memoryBefore: 0,
      memoryAfter: 0,
      memoryDelta: 0,
      memoryPeak: 0,
      ...throughput,
    };
  }
}
