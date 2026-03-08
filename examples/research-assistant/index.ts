/**
 * Research Assistant Demo
 *
 * Demonstrates:
 * - META tiles for flexible agent differentiation
 * - World model dreaming for policy optimization
 * - Multi-step research workflows
 * - Dynamic agent specialization
 */

import { MetaTileManager, DifferentiationPotential } from '../../src/core/index.js';
import { WorldModel } from '../../src/core/index.js';
import { ValueNetwork, ValueNetworkManager } from '../../src/core/index.js';
import { DreamBasedPolicyOptimizer, DreamManager } from '../../src/core/index.js';
import { Colony } from '../../src/core/index.js';
import { v4 as uuidv4 } from 'uuid';
import { config, type ResearchTask } from './config.js';

// Global state
let metaManager: MetaTileManager;
let colony: Colony;
let worldModel: WorldModel;
let valueNetwork: ValueNetwork;
let dreamOptimizer: DreamBasedPolicyOptimizer;
let taskHistory: ResearchTask[] = [];

/**
 * Initialize the research assistant system
 */
async function initializeSystem(): Promise<void> {
  console.log('Research Assistant Demo');
  console.log('=======================\n');

  // Create colony
  colony = new Colony({
    id: 'research-colony',
    gardenerId: 'researcher',
    name: 'Research Assistant Colony',
    maxAgents: 10,
    resourceBudget: {
      totalCompute: 100,
      totalMemory: 1000,
      totalNetwork: 100,
    },
  });

  // Create META tile manager
  metaManager = new MetaTileManager();

  // Spawn META tiles
  console.log('Initializing META tiles...');
  for (let i = 0; i < config.metaTileCount; i++) {
    const metaTile = metaManager.spawnMetaTile({
      id: `meta-tile-${i + 1}`,
      potential: DifferentiationPotential.UNIVERSAL,
      environmentalSensitivity: config.metaTileConfig.environmentalSensitivity,
      differentiationThreshold: config.metaTileConfig.differentiationThreshold,
      signalDecayRate: config.metaTileConfig.signalDecayRate,
      explorationScale: config.metaTileConfig.explorationScale,
      attractionStrength: config.metaTileConfig.attractionStrength,
    });

    console.log(`  Spawned ${metaTile.id} (UNIVERSAL potential)`);
  }
  console.log();

  // Initialize world model for dreaming
  worldModel = new WorldModel({
    latentDim: config.worldModelConfig.latentDim,
    hiddenDim: config.worldModelConfig.hiddenDim,
    actionDim: config.worldModelConfig.actionDim,
    learningRate: config.worldModelConfig.learningRate,
    batchSize: config.worldModelConfig.batchSize,
    uncertaintyThreshold: config.worldModelConfig.uncertaintyThreshold,
  });

  // Initialize value network
  valueNetwork = new ValueNetwork({
    hiddenDim: 32,
    learningRate: 0.001,
    tdLambda: 0.95,
    eligibilityTraceDecay: 0.99,
  });

  // Initialize dream optimizer
  dreamOptimizer = new DreamBasedPolicyOptimizer(
    worldModel,
    valueNetwork,
    null, // No graph evolution for demo
    config.dreamingConfig
  );

  console.log('System initialized.\n');
}

/**
 * Process a research task
 */
async function processTask(task: ResearchTask): Promise<string> {
  console.log(`Task: ${task.description}`);

  const taskConfig = config.taskTypes[task.type];
  const agentType = taskConfig.agentType as 'task' | 'role' | 'core';

  // Broadcast differentiation signal
  console.log(`  Broadcasting demand signal for ${agentType} agents`);

  metaManager.broadcastSignal({
    type: 'demand',
    agentType,
    urgency: task.urgency,
    context: new Map(Object.entries({
      taskType: task.type,
      taskId: task.id,
      description: task.description,
      ...task.data,
    })),
    confidence: 0.8,
  });

  // Wait a moment for differentiation
  await new Promise(resolve => setTimeout(resolve, 500));

  // Get differentiated agents
  const undifferentiated = metaManager.getUndifferentiated();
  const differentiated = metaManager.getDifferentiatedByType(agentType);

  if (undifferentiated.length === config.metaTileCount && differentiated.length === 0) {
    // Force differentiation for demo
    console.log(`  No agents differentiated yet, forcing specialization...`);

    const metaTiles = Array.from((metaManager as any).metaTiles.values());
    const tileToDifferentiate = metaTiles.find(t => t.state === 'UNDIFFERENTIATED');

    if (tileToDifferentiate) {
      await forceDifferentiation(tileToDifferentiate, agentType, task);
    }
  }

  // Get the result
  const finalDifferentiated = metaManager.getDifferentiatedByType(agentType);
  const result = generateTaskResult(task, finalDifferentiated[0]);

  // Add experience to dream optimizer
  const state = encodeTaskAsState(task);
  const action = getActionForTaskType(task.type);
  const reward = computeTaskReward(task, true);
  const nextState = [...state]; // Simplified

  dreamOptimizer.addExperience(state, action, reward, nextState);

  // Track task
  taskHistory.push(task);

  return result;
}

/**
 * Force a META tile to differentiate (for demo purposes)
 */
async function forceDifferentiation(
  metaTile: any,
  agentType: 'task' | 'role' | 'core',
  task: ResearchTask
): Promise<void> {
  console.log(`  ${metaTile.id} received signal (urgency: ${task.urgency.toFixed(2)})`);

  // Simulate differentiation
  console.log(`  ${metaTile.id} differentiating into ${agentType.toUpperCase()}Agent`);

  // Manually trigger differentiation (bypass threshold for demo)
  await new Promise(resolve => setTimeout(resolve, 300));

  console.log(`  META tile specialized: ${metaTile.id} -> ${agentType.toUpperCase()}Agent (${task.type.toLowerCase()})`);
}

/**
 * Generate a simulated result for the task
 */
function generateTaskResult(task: ResearchTask, agent: any): string {
  const taskType = task.type;

  const results: Record<string, string> = {
    LITERATURE_REVIEW: `Analyzed 15 papers on ${task.data?.topic || 'topic'}. Key themes: deep learning, transformers, scalability.`,
    DATA_ANALYSIS: `Processed ${task.data?.sampleCount || 1000} samples. Mean: ${(Math.random() * 100).toFixed(1)}, Std: ${(Math.random() * 20).toFixed(1)}.`,
    WRITING_ASSIST: `Drafted ${task.data?.wordCount || 500}-word section with proper citations and formatting.`,
    EXPERIMENT_DESIGN: `Designed ${task.data?.experimentCount || 1} experiments with control groups and statistical power analysis.`,
    CODE_REVIEW: `Reviewed ${task.data?.fileCount || 5} files. Found 3 improvements for performance and readability.`,
  };

  const result = results[taskType] || 'Task completed successfully.';

  // Register the differentiated agent with colony
  if (agent) {
    colony.registerAgent({
      id: agent.id,
      typeId: taskType.toLowerCase(),
      categoryId: taskType === 'DATA_ANALYSIS' || taskType === 'CODE_REVIEW' ? 'task' : 'role',
      modelFamily: 'research-assistant',
      defaultParams: {},
      inputTopics: ['research-task'],
      outputTopic: 'research-result',
      minExamples: 10,
      requiresWorldModel: false,
    });
  }

  return `  Result: "${result}"`;
}

/**
 * Encode a task as a state vector
 */
function encodeTaskAsState(task: ResearchTask): number[] {
  // Simplified encoding: task type, urgency, and some random features
  const typeEncoding: Record<string, number> = {
    LITERATURE_REVIEW: 0,
    DATA_ANALYSIS: 0.25,
    WRITING_ASSIST: 0.5,
    EXPERIMENT_DESIGN: 0.75,
    CODE_REVIEW: 1.0,
  };

  return [
    typeEncoding[task.type] || 0,
    task.urgency,
    Math.random() * 0.5,
    Math.random() * 0.5,
  ];
}

/**
 * Get action index for task type
 */
function getActionForTaskType(taskType: string): number {
  const actions: Record<string, number> = {
    LITERATURE_REVIEW: 0,
    DATA_ANALYSIS: 1,
    WRITING_ASSIST: 2,
    EXPERIMENT_DESIGN: 3,
    CODE_REVIEW: 4,
  };
  return actions[taskType] || 0;
}

/**
 * Compute reward for task completion
 */
function computeTaskReward(task: ResearchTask, success: boolean): number {
  if (!success) return -0.5;
  return task.urgency * 0.8 + Math.random() * 0.2;
}

/**
 * Run dream-based optimization
 */
async function runDreamOptimization(): Promise<void> {
  console.log('\nRunning dream-based optimization...');

  // Reset dream timer to force dreaming for demo
  (dreamOptimizer as any).resetDreamTimer();

  const result = await dreamOptimizer.optimize();

  if (result.policyUpdated && result.improvement) {
    console.log(`  Generated ${result.episodesGenerated} dream episodes`);
    console.log(`  Policy improved: ${(result.improvement.improvement * 100).toFixed(1)}% average return`);
    console.log(`  Value loss: ${result.avgValueLoss.toFixed(3)}, Policy loss: ${result.avgPolicyLoss.toFixed(3)}`);
  } else {
    console.log(`  Generated ${result.episodesGenerated} dream episodes`);
    console.log(`  Policy update: No significant improvement yet`);
  }
}

/**
 * Display META tile statistics
 */
function displayMetaStats(): void {
  console.log('\nFinal META tile stats:');

  const metaTiles = Array.from((metaManager as any).metaTiles.values());

  for (const tile of metaTiles) {
    const status = tile.getStatus();
    const currentType = status.currentType || 'UNDIFFERENTIATED';

    console.log(`  ${tile.id}: ${currentType}`);
    console.log(`    - Signal strengths: task=${status.signalStrengths.task.toFixed(2)}, role=${status.signalStrengths.role.toFixed(2)}, core=${status.signalStrengths.core.toFixed(2)}`);
    console.log(`    - Capability state: [${status.capabilityState.map((v: number) => v.toFixed(1)).join(', ')}]`);
    console.log(`    - Bandit posteriors (α,β): task=(${status.banditPosteriors.task.alpha.toFixed(1)}, ${status.banditPosteriors.task.beta.toFixed(1)}), role=(${status.banditPosteriors.role.alpha.toFixed(1)}, ${status.banditPosteriors.role.beta.toFixed(1)})`);
  }

  const stats = metaManager.getStats();
  console.log(`\nColony diversity: ${stats.diversity.toFixed(2)} (${stats.diversity > 1 ? 'high' : 'low'})`);
  console.log(`Differentiated: ${stats.differentiated.task} task, ${stats.differentiated.role} role, ${stats.differentiated.core} core`);
}

/**
 * Run the demo
 */
async function runDemo(): Promise<void> {
  await initializeSystem();

  console.log('Processing research tasks...\n');

  // Create research tasks
  const tasks: ResearchTask[] = [
    {
      id: uuidv4(),
      type: 'LITERATURE_REVIEW',
      description: 'Literature Review on Machine Learning',
      urgency: 0.8,
      data: { topic: 'machine learning', paperCount: 15 },
    },
    {
      id: uuidv4(),
      type: 'DATA_ANALYSIS',
      description: 'Analyze dataset with 10,000 samples',
      urgency: 0.9,
      data: { sampleCount: 10000, featureCount: 50 },
    },
    {
      id: uuidv4(),
      type: 'WRITING_ASSIST',
      description: 'Help write research paper introduction',
      urgency: 0.7,
      data: { wordCount: 500, section: 'introduction' },
    },
    {
      id: uuidv4(),
      type: 'EXPERIMENT_DESIGN',
      description: 'Design experiments for A/B testing',
      urgency: 0.85,
      data: { experimentCount: 3, testType: 'A/B' },
    },
    {
      id: uuidv4(),
      type: 'CODE_REVIEW',
      description: 'Review analysis code for bugs',
      urgency: 0.75,
      data: { fileCount: 5, language: 'python' },
    },
  ];

  // Process each task
  for (const task of tasks) {
    const result = await processTask(task);
    console.log(result);
    console.log();

    // Small delay between tasks
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Run dream optimization
  await runDreamOptimization();

  // Display statistics
  displayMetaStats();

  console.log('\nDemo complete!');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { runDemo };
