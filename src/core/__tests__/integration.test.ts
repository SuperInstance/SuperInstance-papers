/**
 * POLLN Integration Test Suite
 * Pattern-Organized Large Language Network
 *
 * Comprehensive integration tests covering:
 * 1. Component Integration Tests
 * 2. End-to-End Flow Tests
 * 3. Performance Benchmarks
 *
 * Based on Round 2 Research Synthesis
 */

import {
  BaseAgent,
  Colony,
  SPOREProtocol,
  PlinkoLayer,
  HebbianLearning,
  A2APackageSystem,
  BES,
  SafetyLayer,
  WorldModel,
  type AgentConfig,
  type A2APackage,
  type ColonyConfig,
  type PlinkoConfig,
  type ConstitutionalConstraint,
  type PrivacyLevel,
  type SubsumptionLayer,
  PrivacyTier,
} from '../index';

// ============================================================================
// Test Utilities
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: Error;
  details?: Record<string, unknown>;
}

class IntegrationTestRunner {
  private results: TestResult[] = [];
  private setupTime: number = 0;
  private teardownTime: number = 0;

  async test(name: string, fn: () => Promise<void> | void): Promise<void> {
    const startTime = performance.now();
    try {
      await fn();
      const duration = performance.now() - startTime;
      this.results.push({ name, passed: true, duration });
      console.log(`✓ ${name} (${duration.toFixed(2)}ms)`);
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.push({
        name,
        passed: false,
        duration,
        error: error as Error,
      });
      console.error(`✗ ${name} (${duration.toFixed(2)}ms)`, error);
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }

  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    totalDuration: number;
  } {
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      total: this.results.length,
      passed,
      failed,
      totalDuration: this.setupTime + this.totalDuration + this.teardownTime,
    };
  }

  printSummary(): void {
    const summary = this.getSummary();
    console.log('\n=== Test Summary ===');
    console.log(`Total: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Duration: ${summary.totalDuration.toFixed(2)}ms`);
    console.log('====================\n');
  }
}

// ============================================================================
// Mock Agent Implementation
// ============================================================================

class MockAgent extends BaseAgent {
  private processLatency: number;
  private processResult: A2APackage<unknown>;

  constructor(
    config: AgentConfig,
    latency: number = 10,
    resultPayload: unknown = { success: true }
  ) {
    super(config);
    this.processLatency = latency;
    this.processResult = {
      id: 'mock-result',
      timestamp: Date.now(),
      senderId: config.id,
      receiverId: 'test-receiver',
      type: 'mock-response',
      payload: resultPayload,
      parentIds: [],
      causalChainId: 'test-chain',
      privacyLevel: 'COLONY',
      layer: 'HABITUAL',
    };
  }

  async initialize(): Promise<void> {
    this.setState('initialized', true);
  }

  async process<T>(input: T): Promise<A2APackage<T>> {
    // Simulate processing latency
    await new Promise((resolve) => setTimeout(resolve, this.processLatency));
    this.touch();
    return this.processResult as A2APackage<T>;
  }

  async shutdown(): Promise<void> {
    this.setState('shutdown', true);
  }

  setProcessResult(result: A2APackage<unknown>): void {
    this.processResult = result;
  }
}

// ============================================================================
// Component Integration Tests
// ============================================================================

async function testAgentColonyIntegration(runner: IntegrationTestRunner): Promise<void> {
  console.log('\n--- Agent + Colony Integration ---');

  await runner.test('should register agent with colony', async () => {
    const colony = new Colony({
      id: 'test-colony',
      gardenerId: 'test-gardener',
      name: 'Test Colony',
      maxAgents: 10,
      resourceBudget: {
        totalCompute: 1000,
        totalMemory: 2000,
        totalNetwork: 500,
      },
    });

    const agentConfig: AgentConfig = {
      id: 'agent-1',
      typeId: 'test-type',
      categoryId: 'test-category',
      modelFamily: 'test-model',
      defaultParams: {},
      inputTopics: ['input'],
      outputTopic: 'output',
      minExamples: 10,
      requiresWorldModel: false,
    };

    const state = colony.registerAgent(agentConfig);

    if (state.id !== agentConfig.id) {
      throw new Error('Agent ID mismatch');
    }
    if (state.status !== 'dormant') {
      throw new Error('Initial status should be dormant');
    }
  });

  await runner.test('should activate and deactivate agents', async () => {
    const colony = new Colony({
      id: 'test-colony-2',
      gardenerId: 'test-gardener',
      name: 'Test Colony 2',
      maxAgents: 10,
      resourceBudget: {
        totalCompute: 1000,
        totalMemory: 2000,
        totalNetwork: 500,
      },
    });

    const agentConfig: AgentConfig = {
      id: 'agent-2',
      typeId: 'test-type',
      categoryId: 'test-category',
      modelFamily: 'test-model',
      defaultParams: {},
      inputTopics: ['input'],
      outputTopic: 'output',
      minExamples: 10,
      requiresWorldModel: false,
    };

    colony.registerAgent(agentConfig);
    colony.activateAgent(agentConfig.id);

    const agent = colony.getAgent(agentConfig.id);
    if (agent?.status !== 'active') {
      throw new Error('Agent should be active');
    }

    colony.deactivateAgent(agentConfig.id);
    const deactivatedAgent = colony.getAgent(agentConfig.id);
    if (deactivatedAgent?.status !== 'dormant') {
      throw new Error('Agent should be dormant');
    }
  });

  await runner.test('should record execution results correctly', async () => {
    const colony = new Colony({
      id: 'test-colony-3',
      gardenerId: 'test-gardener',
      name: 'Test Colony 3',
      maxAgents: 10,
      resourceBudget: {
        totalCompute: 1000,
        totalMemory: 2000,
        totalNetwork: 500,
      },
    });

    const agentConfig: AgentConfig = {
      id: 'agent-3',
      typeId: 'test-type',
      categoryId: 'test-category',
      modelFamily: 'test-model',
      defaultParams: {},
      inputTopics: ['input'],
      outputTopic: 'output',
      minExamples: 10,
      requiresWorldModel: false,
    };

    colony.registerAgent(agentConfig);
    colony.activateAgent(agentConfig.id);

    // Record successful execution
    colony.recordResult(agentConfig.id, true, 50);

    const agent = colony.getAgent(agentConfig.id);
    if (agent?.successCount !== 1) {
      throw new Error('Success count should be 1');
    }
    if (agent?.valueFunction !== 0.51) {
      throw new Error('Value function should increase on success');
    }
  });
}

async function testA2APackageCausalChainIntegration(
  runner: IntegrationTestRunner
): Promise<void> {
  console.log('\n--- A2APackage + Causal Chain Integration ---');

  await runner.test('should create package with causal chain', async () => {
    const system = new A2APackageSystem({
      historySize: 100,
      defaultPrivacyLevel: 'COLONY',
      defaultLayer: 'HABITUAL',
    });

    const pkg = await system.createPackage(
      'agent-1',
      'agent-2',
      'test-type',
      { data: 'test' },
      {
        parentIds: ['parent-1', 'parent-2'],
        privacyLevel: 'PUBLIC',
        layer: 'DELIBERATE',
      }
    );

    if (pkg.senderId !== 'agent-1') {
      throw new Error('Sender ID mismatch');
    }
    if (pkg.receiverId !== 'agent-2') {
      throw new Error('Receiver ID mismatch');
    }
    if (pkg.parentIds.length !== 2) {
      throw new Error('Parent IDs length mismatch');
    }
    if (pkg.privacyLevel !== 'PUBLIC') {
      throw new Error('Privacy level mismatch');
    }
    if (pkg.layer !== 'DELIBERATE') {
      throw new Error('Layer mismatch');
    }
  });

  await runner.test('should track full causal chain', async () => {
    const system = new A2APackageSystem();

    // Create parent package
    const parent = await system.createPackage(
      'agent-1',
      'agent-2',
      'parent-type',
      { data: 'parent' }
    );

    // Create child package
    const child = await system.createPackage(
      'agent-2',
      'agent-3',
      'child-type',
      { data: 'child' },
      { parentIds: [parent.id] }
    );

    // Create grandchild package
    const grandchild = await system.createPackage(
      'agent-3',
      'agent-4',
      'grandchild-type',
      { data: 'grandchild' },
      { parentIds: [child.id] }
    );

    const chain = system.getCausalChain(grandchild.id);
    if (chain.length !== 3) {
      throw new Error('Causal chain should have 3 packages');
    }
    if (!chain.includes(grandchild.id)) {
      throw new Error('Chain should include grandchild');
    }
    if (!chain.includes(child.id)) {
      throw new Error('Chain should include child');
    }
    if (!chain.includes(parent.id)) {
      throw new Error('Chain should include parent');
    }
  });

  await runner.test('should replay causal chain correctly', async () => {
    const system = new A2APackageSystem();

    const pkg1 = await system.createPackage('agent-1', 'agent-2', 'type-1', {
      step: 1,
    });
    const pkg2 = await system.createPackage(
      'agent-2',
      'agent-3',
      'type-2',
      { step: 2 },
      { parentIds: [pkg1.id] }
    );
    const pkg3 = await system.createPackage(
      'agent-3',
      'agent-4',
      'type-3',
      { step: 3 },
      { parentIds: [pkg2.id] }
    );

    const replay = await system.replayChain(pkg3.id);

    if (replay.length !== 3) {
      throw new Error('Replay should have 3 packages');
    }
    if ((replay[0].payload as { step: number }).step !== 1) {
      throw new Error('First replayed package should be step 1');
    }
    if ((replay[1].payload as { step: number }).step !== 2) {
      throw new Error('Second replayed package should be step 2');
    }
    if ((replay[2].payload as { step: number }).step !== 3) {
      throw new Error('Third replayed package should be step 3');
    }
  });
}

async function testBESPrivacyIntegration(runner: IntegrationTestRunner): Promise<void> {
  console.log('\n--- BES + Privacy Integration ---');

  await runner.test('should create grain with dimensionality reduction', async () => {
    const bes = new BES({
      defaultDimensionality: 1024,
      defaultPrivacyTier: 'LOCAL',
      maxDimensionality: 1024,
      minDimensionality: 32,
    });

    const highDimEmbedding = new Array(1024).fill(0).map(() => Math.random());

    // Create grain with PUBLIC tier (128 dimensions)
    const grain = await bes.createGrain(highDimEmbedding, 'gardener-1', {
      privacyTier: 'PUBLIC',
    });

    if (grain.dimensionality !== 128) {
      throw new Error('PUBLIC tier should reduce to 128 dimensions');
    }
    if (grain.privacyTier !== 'PUBLIC') {
      throw new Error('Privacy tier mismatch');
    }
    if (grain.embedding.length !== 128) {
      throw new Error('Embedding length mismatch');
    }
  });

  await runner.test('should apply differential privacy correctly', async () => {
    const bes = new BES();

    const embedding = new Array(512).fill(0.5);
    const grain = await bes.createGrain(embedding, 'gardener-1', {
      privacyTier: 'MEADOW',
    });

    // MEADOW tier should have DP metadata
    if (!grain.dpMetadata) {
      throw new Error('MEADOW tier should have DP metadata');
    }
    if (grain.dpMetadata.epsilon !== 1.0) {
      throw new Error('Epsilon should be 1.0 for MEADOW tier');
    }
    if (grain.dpMetadata.delta !== 1e-5) {
      throw new Error('Delta should be 1e-5 for MEADOW tier');
    }
  });

  await runner.test('should track privacy budget correctly', async () => {
    const bes = new BES();

    // Create multiple PUBLIC grains
    const embedding = new Array(256).fill(0.5);
    await bes.createGrain(embedding, 'gardener-1', { privacyTier: 'PUBLIC' });
    await bes.createGrain(embedding, 'gardener-1', { privacyTier: 'PUBLIC' });
    await bes.createGrain(embedding, 'gardener-1', { privacyTier: 'PUBLIC' });

    const budget = bes.getPrivacyBudgetStatus('PUBLIC');
    if (!budget) {
      throw new Error('PUBLIC budget should exist');
    }

    // PUBLIC tier has epsilon 0.3, so 3 grains = 0.9 used
    if (budget.used !== 0.9) {
      throw new Error(`Used should be 0.9, got ${budget.used}`);
    }
    if (budget.total !== 0.3) {
      throw new Error('Total should be 0.3 for PUBLIC tier');
    }
  });

  await runner.test('should find similar grains', async () => {
    const bes = new BES();

    const embedding1 = new Array(256).fill(0.5);
    const embedding2 = new Array(256).fill(0.5); // Very similar
    const embedding3 = new Array(256).fill(1.0); // Different

    await bes.createGrain(embedding1, 'gardener-1');
    await bes.createGrain(embedding2, 'gardener-1');
    await bes.createGrain(embedding3, 'gardener-1');

    const similar = bes.findSimilar(embedding1, 0.8, 10);

    if (similar.length < 2) {
      throw new Error('Should find at least 2 similar grains');
    }
  });
}

async function testSafetyPlinkoIntegration(runner: IntegrationTestRunner): Promise<void> {
  console.log('\n--- Safety + Plinko Integration ---');

  await runner.test('should override selection when safety fails', async () => {
    const safety = new SafetyLayer([
      {
        id: 'constraint-1',
        name: 'Test Constraint',
        category: 'safety',
        rule: 'no-danger',
        severity: 'CRITICAL',
        cannotOverride: true,
        isActive: true,
      },
    ]);

    const plinko = new PlinkoLayer({
      temperature: 1.0,
      minTemperature: 0.1,
      decayRate: 0.001,
    });

    // Register safety discriminator
    plinko.registerDiscriminator('safety', (proposal) => {
      // Fail safety for agent-2
      return proposal.agentId !== 'agent-2';
    });

    const proposals = [
      { agentId: 'agent-1', confidence: 0.6, bid: 10 },
      { agentId: 'agent-2', confidence: 0.9, bid: 20 }, // High confidence but fails safety
      { agentId: 'agent-3', confidence: 0.7, bid: 15 },
    ];

    const result = await plinko.process(proposals);

    if (result.wasOverridden !== true) {
      throw new Error('Should be overridden due to safety');
    }
    if (result.selectedAgentId === 'agent-2') {
      throw new Error('Should not select agent-2 due to safety');
    }
  });

  await runner.test('should enforce critical constraints', async () => {
    const safety = new SafetyLayer([
      {
        id: 'critical-1',
        name: 'Critical Constraint',
        category: 'harm_prevention',
        rule: 'no-harm',
        severity: 'CRITICAL',
        cannotOverride: true,
        isActive: true,
      },
    ]);

    const result = safety.checkAction('agent-1', {
      type: 'harmful-action',
    });

    if (result.passed !== false) {
      throw new Error('Action should fail safety check');
    }
    if (result.severity !== 'CRITICAL') {
      throw new Error('Severity should be CRITICAL');
    }
  });

  await runner.test('should create and rollback checkpoints', async () => {
    const safety = new SafetyLayer();

    const checkpoint = await safety.createCheckpoint('full', {
      testState: 'value',
    });

    if (!checkpoint.id) {
      throw new Error('Checkpoint should have ID');
    }
    if (checkpoint.type !== 'full') {
      throw new Error('Checkpoint type mismatch');
    }

    const rolledBack = await safety.rollbackToCheckpoint(checkpoint.id);

    if (!rolledBack) {
      throw new Error('Rollback should succeed');
    }

    const emergencyState = safety.getEmergencyState();
    if (!emergencyState.rollbackActive) {
      throw new Error('Rollback should be active');
    }
  });
}

// ============================================================================
// End-to-End Flow Tests
// ============================================================================

async function testAgentExecutionFlow(runner: IntegrationTestRunner): Promise<void> {
  console.log('\n--- End-to-End: Agent Execution Flow ---');

  await runner.test('should execute complete agent workflow', async () => {
    // Setup
    const colony = new Colony({
      id: 'test-colony',
      gardenerId: 'test-gardener',
      name: 'Test Colony',
      maxAgents: 10,
      resourceBudget: {
        totalCompute: 1000,
        totalMemory: 2000,
        totalNetwork: 500,
      },
    });

    const safety = new SafetyLayer();
    const plinko = new PlinkoLayer();
    const a2a = new A2APackageSystem();
    const learning = new HebbianLearning();

    // Create agents
    const agent1Config: AgentConfig = {
      id: 'agent-1',
      typeId: 'processor',
      categoryId: 'core',
      modelFamily: 'test',
      defaultParams: {},
      inputTopics: ['input'],
      outputTopic: 'processed',
      minExamples: 10,
      requiresWorldModel: false,
    };

    const agent2Config: AgentConfig = {
      id: 'agent-2',
      typeId: 'analyzer',
      categoryId: 'core',
      modelFamily: 'test',
      defaultParams: {},
      inputTopics: ['processed'],
      outputTopic: 'analyzed',
      minExamples: 10,
      requiresWorldModel: false,
    };

    colony.registerAgent(agent1Config);
    colony.registerAgent(agent2Config);
    colony.activateAgent(agent1Config.id);
    colony.activateAgent(agent2Config.id);

    // Create A2A package
    const inputPackage = await a2a.createPackage(
      'input',
      'agent-1',
      'test-input',
      { data: 'test-data' }
    );

    // Safety check
    const safetyResult = safety.checkAction('agent-1', {
      type: 'test-input',
    });

    if (!safetyResult.passed) {
      throw new Error('Safety check should pass');
    }

    // Plinko selection (single agent, so deterministic)
    const proposals = [{ agentId: 'agent-1', confidence: 1.0, bid: 10 }];
    const plinkoResult = await plinko.process(proposals);

    if (plinkoResult.selectedAgentId !== 'agent-1') {
      throw new Error('Should select agent-1');
    }

    // Update synapse
    await learning.updateSynapse('input', 'agent-1', 0.8, 0.9, 0.1);

    // Record result
    colony.recordResult('agent-1', true, 25);

    // Verify state
    const agent1 = colony.getAgent('agent-1');
    if (agent1?.successCount !== 1) {
      throw new Error('Agent should have 1 success');
    }

    const weight = learning.getWeight('input', 'agent-1');
    if (weight <= 0.5) {
      throw new Error('Synapse weight should have increased');
    }
  });
}

async function testEvolutionFlow(runner: IntegrationTestRunner): Promise<void> {
  console.log('\n--- End-to-End: Evolution Flow ---');

  await runner.test('should simulate day cycle (learning)', async () => {
    const colony = new Colony({
      id: 'test-colony',
      gardenerId: 'test-gardener',
      name: 'Test Colony',
      maxAgents: 10,
      resourceBudget: {
        totalCompute: 1000,
        totalMemory: 2000,
        totalNetwork: 500,
      },
    });

    const learning = new HebbianLearning();

    // Register multiple agents
    for (let i = 1; i <= 5; i++) {
      colony.registerAgent({
        id: `agent-${i}`,
        typeId: 'test-type',
        categoryId: 'test',
        modelFamily: 'test',
        defaultParams: {},
        inputTopics: ['input'],
        outputTopic: 'output',
        minExamples: 10,
        requiresWorldModel: false,
      });
      colony.activateAgent(`agent-${i}`);
    }

    // Simulate day cycle: co-activation and learning
    for (let i = 1; i < 5; i++) {
      await learning.updateSynapse(`agent-${i}`, `agent-${i + 1}`, 0.8, 0.9, 0.1);
      colony.recordResult(`agent-${i}`, true, 20 + i * 5);
    }

    // Check that pathways strengthened
    const weight = learning.getWeight('agent-1', 'agent-2');
    if (weight <= 0.5) {
      throw new Error('Pathway should have strengthened during day cycle');
    }

    const stats = learning.getStats();
    if (stats.totalSynapses !== 4) {
      throw new Error('Should have 4 synapses');
    }
  });

  await runner.test('should simulate night cycle (decay)', async () => {
    const learning = new HebbianLearning({
      decayRate: 0.1, // Higher decay for testing
    });

    // Create synapses
    await learning.updateSynapse('agent-1', 'agent-2', 0.8, 0.9, 0.5);
    await learning.updateSynapse('agent-2', 'agent-3', 0.7, 0.8, 0.3);

    const weightBefore = learning.getWeight('agent-1', 'agent-2');

    // Simulate night cycle: decay all synapses
    await learning.decayAll();

    const weightAfter = learning.getWeight('agent-1', 'agent-2');

    if (weightAfter >= weightBefore) {
      throw new Error('Weight should have decayed');
    }
  });

  await runner.test('should prune weak synapses', async () => {
    const learning = new HebbianLearning({
      minWeight: 0.1,
    });

    // Create synapses with different strengths
    await learning.updateSynapse('agent-1', 'agent-2', 0.1, 0.1, -0.5); // Will be weak
    await learning.updateSynapse('agent-2', 'agent-3', 0.9, 0.9, 0.5); // Will be strong

    const pruned = await learning.pruneWeak(0.2);

    if (pruned !== 1) {
      throw new Error('Should have pruned 1 weak synapse');
    }

    const stats = learning.getStats();
    if (stats.totalSynapses !== 1) {
      throw new Error('Should have 1 synapse remaining');
    }
  });
}

async function testWorldModelDreamingFlow(runner: IntegrationTestRunner): Promise<void> {
  console.log('\n--- End-to-End: World Model Dreaming Flow ---');

  await runner.test('should train world model and dream', async () => {
    const worldModel = new WorldModel({
      latentDim: 32,
      hiddenDim: 64,
      learningRate: 0.01,
    });

    // Initialize model
    worldModel.initialize();

    // Create training data
    const observations = [
      new Array(64).fill(0).map(() => Math.random()),
      new Array(64).fill(0).map(() => Math.random()),
      new Array(64).fill(0).map(() => Math.random()),
    ];
    const actions = [[0.5], [0.3], [0.7]];
    const rewards = [0.5, 0.3, 0.7];
    const nextObservations = [
      new Array(64).fill(0).map(() => Math.random()),
      new Array(64).fill(0).map(() => Math.random()),
      new Array(64).fill(0).map(() => Math.random()),
    ];

    // Train
    const trainResult = worldModel.train(
      observations,
      actions,
      rewards,
      nextObservations
    );

    if (trainResult.encoderLoss < 0) {
      throw new Error('Encoder loss should be non-negative');
    }

    // Dream
    const startState = new Array(64).fill(0.5);
    const dreamEpisode = worldModel.dream(startState, 10, (state) => {
      // Simple action sampler: use first dimension
      return state[0] || 0;
    });

    if (dreamEpisode.length !== 10) {
      throw new Error('Dream episode should have 10 steps');
    }
    if (dreamEpisode.states.length !== 10) {
      throw new Error('Should have 10 states');
    }
    if (dreamEpisode.actions.length !== 10) {
      throw new Error('Should have 10 actions');
    }
    if (dreamEpisode.rewards.length !== 10) {
      throw new Error('Should have 10 rewards');
    }
  });
}

// ============================================================================
// Performance Benchmarks
// ============================================================================

async function testLatencyTargets(runner: IntegrationTestRunner): Promise<void> {
  console.log('\n--- Performance: Latency Targets ---');

  await runner.test('agent processing should meet latency target', async () => {
    const agentConfig: AgentConfig = {
      id: 'test-agent',
      typeId: 'test-type',
      categoryId: 'test',
      modelFamily: 'test',
      defaultParams: {},
      inputTopics: ['input'],
      outputTopic: 'output',
      targetLatencyMs: 50,
      minExamples: 10,
      requiresWorldModel: false,
    };

    const agent = new MockAgent(agentConfig, 10); // 10ms simulated latency
    await agent.initialize();

    const startTime = performance.now();
    await agent.process({ test: 'input' });
    const latency = performance.now() - startTime;

    if (latency > 50) {
      throw new Error(`Latency ${latency}ms exceeds target 50ms`);
    }
  });

  await runner.test('A2A package creation should be fast', async () => {
    const a2a = new A2APackageSystem();

    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
      await a2a.createPackage('agent-1', 'agent-2', 'test-type', { index: i });
    }
    const avgLatency = (performance.now() - startTime) / 100;

    if (avgLatency > 5) {
      throw new Error(`Avg latency ${avgLatency}ms exceeds target 5ms`);
    }
  });

  await runner.test('Plinko decision should be fast', async () => {
    const plinko = new PlinkoLayer();

    const proposals = Array.from({ length: 10 }, (_, i) => ({
      agentId: `agent-${i}`,
      confidence: Math.random(),
      bid: Math.random() * 100,
    }));

    const startTime = performance.now();
    const result = await plinko.process(proposals);
    const latency = performance.now() - startTime;

    if (!result.selectedAgentId) {
      throw new Error('Should select an agent');
    }
    if (latency > 10) {
      throw new Error(`Latency ${latency}ms exceeds target 10ms`);
    }
  });
}

async function testThroughputTargets(runner: IntegrationTestRunner): Promise<void> {
  console.log('\n--- Performance: Throughput Targets ---');

  await runner.test('should handle high message throughput', async () => {
    const a2a = new A2APackageSystem();
    const startTime = performance.now();

    // Create 1000 packages
    const promises = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(
        a2a.createPackage(`agent-${i % 10}`, `agent-${(i + 1) % 10}`, 'test', {
          index: i,
        })
      );
    }
    await Promise.all(promises);

    const duration = performance.now() - startTime;
    const throughput = 1000 / (duration / 1000); // packages per second

    if (throughput < 1000) {
      throw new Error(`Throughput ${throughput.toFixed(0)}/s below target 1000/s`);
    }
  });

  await runner.test('should handle concurrent agent execution', async () => {
    const agents = Array.from({ length: 10 }, (_, i) => {
      const config: AgentConfig = {
        id: `agent-${i}`,
        typeId: 'test',
        categoryId: 'test',
        modelFamily: 'test',
        defaultParams: {},
        inputTopics: ['input'],
        outputTopic: 'output',
        minExamples: 10,
        requiresWorldModel: false,
      };
      return new MockAgent(config, 5);
    });

    // Initialize all agents
    await Promise.all(agents.map((a) => a.initialize()));

    // Execute all concurrently
    const startTime = performance.now();
    await Promise.all(agents.map((a) => a.process({ test: 'input' })));
    const duration = performance.now() - startTime;

    if (duration > 50) {
      throw new Error(`Concurrent execution ${duration}ms exceeds target 50ms`);
    }
  });
}

async function testMemoryTargets(runner: IntegrationTestRunner): Promise<void> {
  console.log('\n--- Performance: Memory Targets ---');

  await runner.test('should respect memory limits', async () => {
    const colony = new Colony({
      id: 'test-colony',
      gardenerId: 'test-gardener',
      name: 'Test Colony',
      maxAgents: 100,
      resourceBudget: {
        totalCompute: 1000,
        totalMemory: 2000,
        totalNetwork: 500,
      },
    });

    // Register agents up to limit
    for (let i = 0; i < 100; i++) {
      colony.registerAgent({
        id: `agent-${i}`,
        typeId: 'test',
        categoryId: 'test',
        modelFamily: 'test',
        defaultParams: {},
        inputTopics: ['input'],
        outputTopic: 'output',
        maxMemoryMB: 20, // Each agent limited to 20MB
        minExamples: 10,
        requiresWorldModel: false,
      });
    }

    const stats = colony.getStats();
    if (stats.totalAgents !== 100) {
      throw new Error('Should have 100 agents');
    }
  });

  await runner.test('should prune old history efficiently', async () => {
    const a2a = new A2APackageSystem({
      historySize: 100,
      defaultPrivacyLevel: 'COLONY',
      defaultLayer: 'HABITUAL',
    });

    // Create 200 packages
    for (let i = 0; i < 200; i++) {
      await a2a.createPackage('agent-1', 'agent-2', 'test', { index: i });
    }

    const history = a2a.getHistory('agent-1');
    if (history.length !== 100) {
      throw new Error('History should be limited to 100');
    }
  });
}

// ============================================================================
// Test Runner
// ============================================================================

export async function runIntegrationTests(): Promise<void> {
  console.log('POLLN Integration Test Suite');
  console.log('============================\n');

  const runner = new IntegrationTestRunner();

  try {
    // Component Integration Tests
    await testAgentColonyIntegration(runner);
    await testA2APackageCausalChainIntegration(runner);
    await testBESPrivacyIntegration(runner);
    await testSafetyPlinkoIntegration(runner);

    // End-to-End Flow Tests
    await testAgentExecutionFlow(runner);
    await testEvolutionFlow(runner);
    await testWorldModelDreamingFlow(runner);

    // Performance Benchmarks
    await testLatencyTargets(runner);
    await testThroughputTargets(runner);
    await testMemoryTargets(runner);
  } catch (error) {
    console.error('Test suite error:', error);
  }

  runner.printSummary();

  const summary = runner.getSummary();
  if (summary.failed > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

export { IntegrationTestRunner, TestResult };
