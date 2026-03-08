/**
 * POLLN Integration Benchmarks
 *
 * End-to-end benchmarks covering full workflows including
 * multi-agent coordination, dreaming cycles, and Meadow operations.
 */

import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import type { BenchmarkSuite, BenchmarkConfig, BenchmarkMetrics } from '../types.js';
import { Colony } from '../../core/colony.js';
import { TaskAgent, RoleAgent, CoreAgent } from '../../core/agents.js';
import { PlinkoLayer } from '../../core/decision.js';
import { DreamBasedPolicyOptimizer } from '../../core/dreaming.js';
import { Meadow } from '../../core/meadow.js';
import { calculateStats, calculateThroughput } from '../benchmark-profiler.js';

/**
 * IntegrationBenchmarks - End-to-end workflow performance tests
 */
export class IntegrationBenchmarks implements BenchmarkSuite {
  name = 'integration';
  description = 'End-to-end integration benchmarks';
  version = '1.0.0';

  private colony?: Colony;
  private plinko?: PlinkoLayer;
  private dreamOptimizer?: DreamBasedPolicyOptimizer;
  private meadow?: Meadow;

  async setup(): Promise<void> {
    this.colony = new Colony({
      maxAgents: 100,
      autoScale: true,
    });

    this.plinko = new PlinkoLayer({
      temperature: 1.0,
      minTemperature: 0.1,
      decayRate: 0.001,
    });

    this.dreamOptimizer = new DreamBasedPolicyOptimizer({
      numDreams: 50,
      dreamLength: 10,
      explorationRate: 0.1,
    });

    this.meadow = new Meadow({
      maxPatterns: 1000,
      sharingEnabled: true,
    });
  }

  async teardown(): Promise<void> {
    await this.colony?.shutdown();
    this.colony = undefined;
    this.plinko = undefined;
    this.dreamOptimizer = undefined;
    this.meadow = undefined;
  }

  benchmarks = new Map<string, (config: BenchmarkConfig) => Promise<BenchmarkMetrics>>([
    ['workflow-single-agent', this.benchmarkWorkflowSingleAgent.bind(this)],
    ['workflow-multi-agent', this.benchmarkWorkflowMultiAgent.bind(this)],
    ['workflow-dream-cycle', this.benchmarkWorkflowDreamCycle.bind(this)],
    ['workflow-meadow-share', this.benchmarkWorkflowMeadowShare.bind(this)],
    ['workflow-full-pipeline', this.benchmarkWorkflowFullPipeline.bind(this)],
    ['coordination-consensus', this.benchmarkCoordinationConsensus.bind(this)],
    ['coordination-pipeline', this.benchmarkCoordinationPipeline.bind(this)],
    ['federated-sync', this.benchmarkFederatedSync.bind(this)],
    ['evolution-pruning', this.benchmarkEvolutionPruning.bind(this)],
    ['scalability-large-colony', this.benchmarkScalabilityLargeColony.bind(this)],
  ]);

  /**
   * Benchmark: Single agent workflow
   */
  private async benchmarkWorkflowSingleAgent(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.colony) throw new Error('Colony not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();

      // Spawn agent
      const agent = await this.colony.spawnAgent({
        type: 'task',
        category: 'test',
      });

      // Process task
      await agent.process({ task: `Task ${i}` });

      // Shutdown
      await this.colony.removeAgent(agent.id);

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
   * Benchmark: Multi-agent workflow
   */
  private async benchmarkWorkflowMultiAgent(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.colony) throw new Error('Colony not initialized');

    const numAgents = 10;
    const samples: number[] = [];

    for (let i = 0; i < Math.floor(config.iterations / numAgents); i++) {
      const start = performance.now();

      // Spawn multiple agents
      const agents = [];
      for (let j = 0; j < numAgents; j++) {
        const agent = await this.colony.spawnAgent({
          type: 'task',
          category: 'test',
        });
        agents.push(agent);
      }

      // Process tasks in parallel
      await Promise.all(
        agents.map((agent, j) => agent.process({ task: `Task ${i}-${j}` }))
      );

      // Shutdown all
      await Promise.all(
        agents.map(agent => this.colony!.removeAgent(agent.id))
      );

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, numAgents);

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
   * Benchmark: Dream cycle workflow
   */
  private async benchmarkWorkflowDreamCycle(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.dreamOptimizer) throw new Error('DreamOptimizer not initialized');

    const samples: number[] = [];

    for (let i = 0; i < Math.min(config.iterations, 20); i++) {
      const experiences = Array.from({ length: 50 }, () => ({
        state: new Array(128).fill(0).map(() => Math.random()),
        action: Math.floor(Math.random() * 10),
        reward: Math.random() * 2 - 1,
        nextState: new Array(128).fill(0).map(() => Math.random()),
      }));

      const start = performance.now();

      // Generate dreams
      const dreams = [];
      for (const exp of experiences) {
        dreams.push(await this.dreamOptimizer.generateDream(exp.state));
      }

      // Optimize policy
      await this.dreamOptimizer.optimizePolicy(dreams);

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
   * Benchmark: Meadow pattern sharing
   */
  private async benchmarkWorkflowMeadowShare(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.meadow) throw new Error('Meadow not initialized');

    const samples: number[] = [];

    for (let i = 0; i < config.iterations; i++) {
      const pattern = {
        id: uuidv4(),
        embedding: new Array(128).fill(0).map(() => Math.random()),
        metadata: {
          createdAt: Date.now(),
          source: 'test',
        },
      };

      const start = performance.now();

      // Share pattern
      await this.meadow.sharePattern(pattern);

      // Discover patterns
      await this.meadow.discoverPatterns(pattern.embedding, 10);

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
   * Benchmark: Full pipeline workflow
   */
  private async benchmarkWorkflowFullPipeline(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.colony || !this.plinko || !this.dreamOptimizer) throw new Error('Components not initialized');

    const samples: number[] = [];

    for (let i = 0; i < Math.min(config.iterations, 10); i++) {
      const start = performance.now();

      // Spawn agents
      const agents = await Promise.all(
        Array.from({ length: 5 }, () =>
          this.colony!.spawnAgent({ type: 'task', category: 'test' })
        )
      );

      // Generate proposals
      const proposals = agents.map(agent => ({
        agentId: agent.id,
        confidence: Math.random(),
        bid: Math.random(),
      }));

      // Plinko selection
      await this.plinko.process(proposals);

      // Process tasks
      await Promise.all(
        agents.map(agent => agent.process({ task: `Pipeline task ${i}` }))
      );

      // Dream cycle
      const dream = await this.dreamOptimizer.generateDream(new Array(128).fill(0).map(() => Math.random()));

      // Shutdown
      await Promise.all(agents.map(agent => this.colony!.removeAgent(agent.id)));

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
   * Benchmark: Consensus coordination
   */
  private async benchmarkCoordinationConsensus(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.colony) throw new Error('Colony not initialized');

    const samples: number[] = [];

    for (let i = 0; i < Math.floor(config.iterations / 5); i++) {
      const start = performance.now();

      // Spawn agents for consensus
      const agents = await Promise.all(
        Array.from({ length: 5 }, () =>
          this.colony!.spawnAgent({ type: 'role', category: 'consensus' })
        )
      );

      // Have all agents process the same task
      await Promise.all(
        agents.map(agent => agent.process({ task: `Consensus task ${i}` }))
      );

      // Collect results
      const results = await Promise.all(
        agents.map(agent => agent.getState('lastResult'))
      );

      // Shutdown
      await Promise.all(agents.map(agent => this.colony!.removeAgent(agent.id)));

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, 5);

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
   * Benchmark: Pipeline coordination
   */
  private async benchmarkCoordinationPipeline(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.colony) throw new Error('Colony not initialized');

    const numStages = 3;
    const samples: number[] = [];

    for (let i = 0; i < Math.floor(config.iterations / numStages); i++) {
      const start = performance.now();

      // Create pipeline stages
      const stages = await Promise.all(
        Array.from({ length: numStages }, (_, j) =>
          this.colony!.spawnAgent({
            type: 'task',
            category: `stage-${j}`,
          })
        )
      );

      // Process through pipeline
      let data = { input: `Pipeline ${i}` };
      for (const stage of stages) {
        const result = await stage.process(data);
        data = result.payload;
      }

      // Shutdown
      await Promise.all(stages.map(stage => this.colony!.removeAgent(stage.id)));

      const end = performance.now();
      samples.push(end - start);
    }

    const stats = calculateStats(samples);
    const throughput = calculateThroughput(samples, numStages);

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
   * Benchmark: Federated sync
   */
  private async benchmarkFederatedSync(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.colony) throw new Error('Colony not initialized');

    const samples: number[] = [];

    for (let i = 0; i < Math.min(config.iterations, 20); i++) {
      // Create local colony
      const localColony = new Colony({ maxAgents: 50 });
      await localColony.initialize();

      const start = performance.now();

      // Simulate federated sync
      const localState = await localColney.getState();
      await this.colony.mergeState(localState);

      const end = performance.now();
      samples.push(end - start);

      await localColony.shutdown();
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
   * Benchmark: Evolution pruning
   */
  private async benchmarkEvolutionPruning(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.colony) throw new Error('Colony not initialized');

    const samples: number[] = [];

    for (let i = 0; i < Math.min(config.iterations, 10); i++) {
      // Spawn many agents
      const agents = await Promise.all(
        Array.from({ length: 50 }, () =>
          this.colony!.spawnAgent({ type: 'task', category: 'test' })
        )
      );

      const start = performance.now();

      // Prune weak agents
      const weakAgents = agents.slice(0, 25);
      await Promise.all(weakAgents.map(agent => this.colony!.removeAgent(agent.id)));

      const end = performance.now();
      samples.push(end - start);

      // Cleanup remaining
      await Promise.all(agents.slice(25).map(agent => this.colony!.removeAgent(agent.id)));
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
   * Benchmark: Large colony scalability
   */
  private async benchmarkScalabilityLargeColony(config: BenchmarkConfig): Promise<BenchmarkMetrics> {
    if (!this.colony) throw new Error('Colony not initialized');

    const colonySizes = [10, 25, 50, 100];
    const samples: number[] = [];

    for (const size of colonySizes) {
      const start = performance.now();

      // Spawn agents
      const agents = await Promise.all(
        Array.from({ length: size }, () =>
          this.colony!.spawnAgent({ type: 'task', category: 'test' })
        )
      );

      // Process tasks
      await Promise.all(
        agents.map((agent, j) => agent.process({ task: `Task ${j}` }))
      );

      // Shutdown
      await Promise.all(agents.map(agent => this.colony!.removeAgent(agent.id)));

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
