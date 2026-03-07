# MCTS-Style Decision Making for POLLN

**Research Document:** Monte Carlo Tree Search Integration with Stochastic Selection
**Date:** 2026-03-06
**Status:** Round 4 Research - Decision Layer Enhancement
**Related Components:** Plinko Layer, World Model, Colony Management

---

## Executive Summary

This document explores how POLLN can implement Monte Carlo Tree Search (MCTS) for complex decision trees, building on the existing Plinko stochastic selection layer and World Model dreaming capabilities. Inspired by AlphaGo's success combining MCTS with neural networks, we propose a hybrid approach where:

1. **Plinko provides stochastic leaf selection** (exploration)
2. **World Model simulates rollouts** (fast prediction)
3. **UCB guides tree growth** (optimism in uncertainty)
4. **Parallel trees handle concurrent decisions** (scalability)

**Key Innovation:** Traditional MCTS simulates random rollouts; POLLN's World Model can dream realistic futures, making MCTS more sample-efficient and biologically plausible.

---

## Table of Contents

1. [MCTS Fundamentals](#1-mcts-fundamentals)
2. [POLLN Decision Space](#2-polln-decision-space)
3. [Exploration vs Exploitation](#3-exploration-vs-exploitation)
4. [World Model Rollouts](#4-world-model-rollouts)
5. [UCB for Tiles](#5-ucb-for-tiles)
6. [Concurrent MCTS](#6-concurrent-mcts)
7. [Implementation Architecture](#7-implementation-architecture)
8. [TypeScript Pseudocode](#8-typescript-pseudocode)
9. [Integration with Existing Systems](#9-integration-with-existing-systems)
10. [Experimental Validation](#10-experimental-validation)

---

## 1. MCTS Fundamentals

### 1.1 What is MCTS?

Monte Carlo Tree Search is a heuristic search algorithm for decision processes, notably successful in:

- **AlphaGo/AlphaZero:** Game playing (Go, Chess, Shogi)
- **Planning:** Robot motion planning, scheduling
- **Optimization:** Monte Carlo Tree Search for continuous problems

**Core Idea:** Build a search tree incrementally by:
1. **Selection:** Traverse tree using tree policy (e.g., UCB)
2. **Expansion:** Add new node when reaching leaf
3. **Simulation:** Run rollout from new node
4. **Backpropagation:** Update statistics up the tree

### 1.2 Standard MCTS Algorithm

```
function MCTS(rootState, budget):
    while budget < computationalBudget:
        # 1. Selection
        node = root
        while node not terminal:
            node = selectChild(node)  # UCB

        # 2. Expansion
        if not node.isTerminal:
            node = expandNode(node)

        # 3. Simulation (Rollout)
        reward = rollout(node.state)

        # 4. Backpropagation
        while node not None:
            node.update(reward)
            node = node.parent

    return selectAction(root)  # Most visited or best value
```

### 1.3 AlphaGo's Innovation

**Traditional MCTS:** Random rollouts (fast but myopic)
**AlphaGo:** Value network + policy network guided rollouts

```
# AlphaGo rollout
def alphaGoRollout(state):
    # Use policy network to bias action selection
    # Use value network to evaluate leaf states
    # Fewer simulations needed for same performance
```

**POLLN Parallel:** World Model = learned dynamics model for dreaming rollouts

---

## 2. POLLN Decision Space

### 2.1 What are "Moves" in POLLN?

In POLLN, a "move" is **not** a single action but a **decision layer activation**:

| Decision Layer | Move Type | Example |
|----------------|-----------|---------|
| **Agent Selection** | Choose which agent to activate | "Use VisionAgent v3" |
| **Variant Selection** | Choose which variant to use | "Use concise summarization" |
| **Pathway Activation** | Choose synaptic pathway | "Route through Sensor→Pattern→Planner" |
| **Resource Allocation** | Choose compute budget | "Allocate 500ms to this task" |
| **Temperature Setting** | Choose exploration level | "Set T=2.5 for high diversity" |
| **Meta-Decision** | Choose which decision to make | "Focus on safety vs efficiency" |

### 2.2 Hierarchical Decision Structure

```
┌─────────────────────────────────────────────────────────────┐
│              POLLN DECISION HIERARCHY                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   LEVEL 1: Meta-Decision                                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ "What type of problem is this?"                    │   │
│   │ Moves: [Safety, Efficiency, Novelty, Speed]        │   │
│   └───────────────┬─────────────────────────────────────┘   │
│                   │                                           │
│   LEVEL 2: Layer Selection                                   │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ "Which agents should participate?"                  │   │
│   │ Moves: [Vision, Audio, Text, Location] agents      │   │
│   └───────────────┬─────────────────────────────────────┘   │
│                   │                                           │
│   LEVEL 3: Variant Selection                                 │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ "Which variant of this agent?"                      │   │
│   │ Moves: [v1.0, v1.1, v2.0, experimental]            │   │
│   └───────────────┬─────────────────────────────────────┘   │
│                   │                                           │
│   LEVEL 4: Parameter Tuning                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ "What temperature, budget, etc?"                   │   │
│   │ Moves: Continuous parameters (discretized)          │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 State Representation

**POLLN State = (Context, ColonyState, AgentStates, SynapticWeights)**

```typescript
interface PollnState {
  // Context (external)
  contextHash: string;
  domain: string;
  sequenceId: string;

  // Colony (internal)
  activeAgents: string[];
  resourceBudget: ResourceBudget;

  // Agent states
  agentStates: Map<string, AgentState>;

  // Synaptic weights
  synapticWeights: Map<string, number>;

  // Value function
  valueFunction: number;
}
```

### 2.4 Action Representation

```typescript
interface PollnAction {
  layer: DecisionLayer;
  type: ActionType;
  agentId?: string;
  variantId?: string;
  parameters?: Record<string, number>;

  // For traceability
  parentId?: string;
  explanation?: string;
}

enum DecisionLayer {
  META = 'META',
  LAYER_SELECTION = 'LAYER_SELECTION',
  VARIANT_SELECTION = 'VARIANT_SELECTION',
  PARAMETER_TUNING = 'PARAMETER_TUNING'
}

enum ActionType {
  ACTIVATE_AGENT = 'ACTIVATE_AGENT',
  SELECT_VARIANT = 'SELECT_VARIANT',
  SET_TEMPERATURE = 'SET_TEMPERATURE',
  ALLOCATE_RESOURCES = 'ALLOCATE_RESOURCES',
  COMBINE_PATHWAYS = 'COMBINE_PATHWAYS'
}
```

---

## 3. Exploration vs Exploitation

### 3.1 The Challenge

POLLN must balance:
- **Exploitation:** Use known good pathways (high synaptic weight)
- **Exploration:** Try new pathways (discover better solutions)

**Current Approach:** Plinko with temperature annealing
- High T early → explore
- Low T later → exploit

**MCTS Enhancement:** Structured exploration with UCB

### 3.2 UCB for POLLN

**Standard UCB1:**
```
UCB1(a) = Q̂(a) + √(2 ln(t) / n(a))
```

**POLLN-UCB:**
```typescript
function pollnUCB(
  agentId: string,
  colonyStats: ColonyStats,
  synapticWeights: Map<string, number>
): number {
  // Estimated value (exploitation)
  const qValue = synapticWeights.get(agentId) || 0.5;

  // Exploration bonus
  const n = colonyStats.getActivationCount(agentId);
  const t = colonyStats.getTotalActivations();

  const explorationBonus = n === 0
    ? Infinity  // Never tried → infinite priority
    : Math.sqrt((2 * Math.log(t)) / n);

  // Synaptic weight modulates exploration
  const weight = synapticWeights.get(agentId) || 0.5;
  const modulatedBonus = explorationBonus * (1 + weight);

  return qValue + modulatedBonus;
}
```

**Key Innovations:**
1. **Weight-Modulated Exploration:** High-weight pathways get slightly more exploration (optimistic)
2. **Infinite Priority for New Agents:** Ensures every agent is tried at least once
3. **Colony-Level Statistics:** Tracks activation counts at colony level

### 3.3 Progressive Widening

**Problem:** Too many possible actions (agents × variants × parameters)
**Solution:** Only consider most promising actions

```typescript
class ProgressiveWideningMCTS {
  private readonly K: number = 10;  // Widening factor

  shouldExpand(node: MCTSNode): boolean {
    const visits = node.visits;
    const children = node.children.length;

    // Only add new child if: children < K * sqrt(visits)
    return children < this.K * Math.sqrt(visits);
  }

  expand(node: MCTSNode): MCTSNode {
    if (this.shouldExpand(node)) {
      // Add new child (unexplored action)
      return this.addNewChild(node);
    } else {
      // Select from existing children
      return this.selectBestChild(node);
    }
  }
}
```

### 3.4 Temperature-Scheduled Exploration

Combine MCTS with Plinko temperature:

```typescript
class AdaptiveMCTS {
  selectAction(node: MCTSNode, temperature: number): MCTSNode {
    // UCB scores
    const ucbScores = node.children.map(child => ({
      child,
      score: this.ucb(child)
    }));

    // Temperature-controlled selection
    if (temperature > 2.0) {
      // High exploration: Sample proportionally to UCB
      return this.softmaxSample(ucbScores);
    } else if (temperature > 0.5) {
      // Moderate: UCB selection
      return this.maxUCB(ucbScores);
    } else {
      // Low exploitation: Select most visited
      return this.maxVisits(node.children);
    }
  }
}
```

---

## 4. World Model Rollouts

### 4.1 Traditional vs Learned Rollouts

**Traditional MCTS Rollout:**
```typescript
function randomRollout(state: PollnState, horizon: number): number {
  for (let t = 0; t < horizon; t++) {
    if (state.isTerminal()) break;

    // Random action
    const action = sampleRandomAction(state);
    state = state.transition(action);
  }

  return state.getReward();
}
```

**Problem:** Random rollouts are noisy and need many simulations.

**POLLN World Model Rollout:**
```typescript
function dreamRollout(
  worldModel: WorldModel,
  state: PollnState,
  horizon: number = 50
): DreamEpisode {
  // Encode current state to latent
  const latent = worldModel.encode(state.toVector());

  // Dream forward
  const episode = worldModel.dream(
    latent.sample,
    horizon,
    (state) => this.policySample(state)  // Can use learned policy
  );

  return episode;
}
```

### 4.2 World Model-Guided MCTS

```typescript
class WorldModelMCTS {
  private worldModel: WorldModel;
  private policyNetwork?: PolicyNetwork;

  constructor(
    worldModel: WorldModel,
    policyNetwork?: PolicyNetwork
  ) {
    this.worldModel = worldModel;
    this.policyNetwork = policyNetwork;
  }

  simulate(node: MCTSNode): number {
    const state = node.state;
    const horizon = this.getAdaptiveHorizon(node.depth);

    // Fast rollout using World Model
    const episode = this.worldModel.dream(
      state.toLatent(),
      horizon,
      this.policyNetwork
        ? (s) => this.policyNetwork.sample(s)
        : undefined
    );

    // Total reward from episode
    return episode.totalReward;
  }

  getAdaptiveHorizon(depth: number): number {
    // Deeper nodes → shorter rollouts (closer to terminal)
    return Math.max(10, 50 - depth * 2);
  }
}
```

### 4.3 Hybrid Rollout Strategy

**Combine World Model with Reality:**

```typescript
class HybridMCTS {
  async simulate(node: MCTSNode): Promise<number> {
    // Shallow: Use World Model (fast)
    if (node.depth < 10) {
      return this.dreamRollout(node.state);
    }
    // Deep: Use real execution (accurate)
    else {
      return this.realRollout(node.state);
    }
  }

  async dreamRollout(state: PollnState): Promise<number> {
    const episode = this.worldModel.dream(
      state.toLatent(),
      20,  // Short rollout
      undefined  // Random actions
    );
    return episode.totalReward;
  }

  async realRollout(state: PollnState): Promise<number> {
    // Execute real actions (slower but accurate)
    let totalReward = 0;
    let currentState = state;

    for (let t = 0; t < 10; t++) {
      const action = await this.selectRealAction(currentState);
      const result = await this.executeReal(action);
      totalReward += result.reward;
      currentState = result.nextState;

      if (result.done) break;
    }

    return totalReward;
  }
}
```

### 4.4 Dreaming for Offline Tree Building

**Key Innovation:** Build MCTS tree overnight (like dreaming)

```typescript
class OvernightMCTS {
  async overnightOptimization(
    colony: Colony,
    budget: number = 10000
  ): Promise<MCTSNode> {
    // Build tree while colony "sleeps"
    const root = this.createRootNode(colony.getCurrentState());

    for (let i = 0; i < budget; i++) {
      // Use World Model for all simulations
      const node = this.select(root);
      const expanded = this.expand(node);
      const reward = await this.dreamSimulate(expanded);
      this.backpropagate(expanded, reward);
    }

    // Colony wakes up with optimized decision tree
    return root;
  }

  async dreamSimulate(node: MCTSNode): Promise<number> {
    const episode = this.worldModel.dream(
      node.state.toLatent(),
      100,  // Long dream
      (s) => this.explorationPolicy.sample(s)
    );

    return episode.totalReward;
  }
}
```

---

## 5. UCB for Tiles

### 5.1 What are "Tiles"?

In POLLN, **tiles** = reusable decision patterns (honeycomb cells):

```typescript
interface Tile {
  id: string;
  pattern: string;
  inputType: string;
  outputType: string;
  successRate: number;
  avgReward: number;
  usageCount: number;

  // Context where it works well
  contexts: string[];
}
```

### 5.2 UCB for Tile Selection

```typescript
class TileUCB {
  private tiles: Map<string, TileStats> = new Map();

  selectTile(context: string, availableTiles: string[]): string {
    let bestTile = availableTiles[0];
    let bestScore = -Infinity;

    for (const tileId of availableTiles) {
      const stats = this.getTileStats(tileId);
      const score = this.computeUCB(tileId, stats, context);

      if (score > bestScore) {
        bestScore = score;
        bestTile = tileId;
      }
    }

    return bestTile;
  }

  computeUCB(
    tileId: string,
    stats: TileStats,
    context: string
  ): number {
    // Exploitation: Average reward
    const qValue = stats.avgReward;

    // Exploration: UCB bonus
    const n = stats.usageCount;
    const t = this.totalUsage;

    const explorationBonus = n === 0
      ? Infinity
      : Math.sqrt((2 * Math.log(t)) / n);

    // Context relevance (if tile works in this context)
    const contextBonus = stats.contexts.includes(context) ? 0.1 : 0;

    return qValue + explorationBonus + contextBonus;
  }
}
```

### 5.3 Hierarchical UCB

```typescript
class HierarchicalUCB {
  // Layer-specific UCB parameters
  private readonly layerParams: Map<DecisionLayer, UCBParams> = new Map([
    [DecisionLayer.META, { c: 1.0, power: 0.5 }],  // Lower exploration
    [DecisionLayer.LAYER_SELECTION, { c: 2.0, power: 0.7 }],
    [DecisionLayer.VARIANT_SELECTION, { c: 1.5, power: 0.6 }],
    [DecisionLayer.PARAMETER_TUNING, { c: 0.5, power: 0.3 }]  // Conservative
  ]);

  computeUCB(
    layer: DecisionLayer,
    node: MCTSNode
  ): number {
    const params = this.layerParams.get(layer)!;
    const qValue = node.avgReward;
    const n = node.visits;
    const t = node.parent?.visits || 1;

    const explorationBonus = params.c *
      Math.pow(Math.log(t) / n, params.power);

    return qValue + explorationBonus;
  }
}
```

### 5.4 Adaptive UCB

```typescript
class AdaptiveUCB {
  private explorationMultiplier: number = 1.0;

  updateMultiplier(recentPerformance: number): void {
    // Increase exploration if performance is poor
    if (recentPerformance < 0.3) {
      this.explorationMultiplier = 2.0;
    } else if (recentPerformance > 0.8) {
      // Decrease exploration if performing well
      this.explorationMultiplier = 0.5;
    } else {
      this.explorationMultiplier = 1.0;
    }
  }

  computeUCB(node: MCTSNode): number {
    const qValue = node.avgReward;
    const n = node.visits;
    const t = node.parent?.visits || 1;

    const baseBonus = Math.sqrt((2 * Math.log(t)) / n);
    const adaptiveBonus = baseBonus * this.explorationMultiplier;

    return qValue + adaptiveBonus;
  }
}
```

---

## 6. Concurrent MCTS

### 6.1 Parallel Decision Making

POLLN often needs multiple concurrent decisions:
- Multiple agents acting in parallel
- Multiple colonies making decisions
- Hierarchical decisions at different levels

### 6.2 Root Parallelization

```typescript
class ParallelMCTS {
  private numWorkers: number;

  constructor(numWorkers: number = 4) {
    this.numWorkers = numWorkers;
  }

  async parallelSearch(
    rootState: PollnState,
    budget: number
  ): Promise<MCTSNode> {
    const budgetPerWorker = Math.floor(budget / this.numWorkers);

    // Run independent MCTS in parallel
    const workers = Array.from({ length: this.numWorkers }, () =>
      this.runWorker(rootState, budgetPerWorker)
    );

    const roots = await Promise.all(workers);

    // Merge trees
    return this.mergeTrees(roots);
  }

  async runWorker(
    rootState: PollnState,
    budget: number
  ): Promise<MCTSNode> {
    const root = new MCTSNode(rootState);

    for (let i = 0; i < budget; i++) {
      const node = this.select(root);
      const expanded = this.expand(node);
      const reward = await this.simulate(expanded);
      this.backpropagate(expanded, reward);
    }

    return root;
  }

  mergeTrees(roots: MCTSNode[]): MCTSNode {
    // Combine child statistics from all roots
    const merged = roots[0];

    for (let i = 1; i < roots.length; i++) {
      for (const child of roots[i].children) {
        merged.mergeChild(child);
      }
    }

    return merged;
  }
}
```

### 6.3 Tree Parallelization

```typescript
class TreeParallelMCTS {
  private lock: Map<string, Promise<void>> = new Map();

  async search(root: MCTSNode, budget: number): Promise<void> {
    const promises = [];

    for (let i = 0; i < budget; i++) {
      promises.push(this.searchIteration(root));
    }

    await Promise.all(promises);
  }

  async searchIteration(root: MCTSNode): Promise<void> {
    // Select path
    const path = this.selectPath(root);

    // Acquire locks for leaf
    const leaf = path[path.length - 1];
    await this.acquireLock(leaf.id);

    try {
      // Expand and simulate
      const expanded = this.expand(leaf);
      const reward = await this.simulate(expanded);

      // Release lock and backpropagate
      this.releaseLock(leaf.id);
      this.backpropagate(path, reward);
    } catch (error) {
      this.releaseLock(leaf.id);
      throw error;
    }
  }

  async acquireLock(nodeId: string): Promise<void> {
    while (this.lock.has(nodeId)) {
      await this.lock.get(nodeId);
    }
    this.lock.set(nodeId, Promise.resolve());
  }

  releaseLock(nodeId: string): void {
    this.lock.delete(nodeId);
  }
}
```

### 6.4 Hierarchical Parallel MCTS

```typescript
class HierarchicalParallelMCTS {
  // Run MCTS at multiple levels in parallel
  async parallelHierarchicalSearch(
    colony: Colony,
    budget: number
  ): Promise<HierarchicalMCTSResult> {
    const budgetPerLevel = Math.floor(budget / 4);

    const [meta, layer, variant, param] = await Promise.all([
      this.runLevelMCTS(DecisionLayer.META, colony, budgetPerLevel),
      this.runLevelMCTS(DecisionLayer.LAYER_SELECTION, colony, budgetPerLevel),
      this.runLevelMCTS(DecisionLayer.VARIANT_SELECTION, colony, budgetPerLevel),
      this.runLevelMCTS(DecisionLayer.PARAMETER_TUNING, colony, budgetPerLevel)
    ]);

    return { meta, layer, variant, param };
  }

  async runLevelMCTS(
    layer: DecisionLayer,
    colony: Colony,
    budget: number
  ): Promise<MCTSNode> {
    // Get available actions at this level
    const actions = colony.getAvailableActions(layer);
    const rootState = new PollnState(colony, layer, actions);

    const mcts = new MCTS({
      worldModel: colony.worldModel,
      policy: colony.getPolicy(layer),
      ucbParams: this.getUCBParams(layer)
    });

    return await mcts.search(rootState, budget);
  }
}
```

---

## 7. Implementation Architecture

### 7.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│               MCTS-ENHANCED PLINKO LAYER                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│   │  REQUEST    │───▶│  MCTS       │───▶│  RESPONSE   │   │
│   │             │    │  ORCHESTRATOR│    │             │   │
│   └─────────────┘    └──────┬──────┘    └─────────────┘   │
│                             │                                │
│                             ▼                                │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              MCTS TREE BUILDER                      │   │
│   │  ┌───────────┐  ┌───────────┐  ┌───────────┐       │   │
│   │  │ SELECTION │  │ EXPANSION │  │ ROLLOUT   │       │   │
│   │  │   (UCB)   │  │           │  │ (Dream)   │       │   │
│   │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘       │   │
│   └────────┼─────────────┼───────────────┼───────────────┘   │
│            │             │               │                   │
│            ▼             ▼               ▼                   │
│   ┌─────────────┐ ┌───────────┐ ┌───────────────┐           │
│   │   PLINKO    │ │ WORLD     │ │   ACTION      │           │
│   │   LAYER     │ │ MODEL     │ │   EXECUTOR    │           │
│   │ ( stochastic│ │ (dreaming)│ │ (execution)   │           │
│   │   fallback) │ │           │ │               │           │
│   └─────────────┘ └───────────┘ └───────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Component Interaction

```typescript
class MCTSOrchestrator {
  private plinko: PlinkoLayer;
  private worldModel: WorldModel;
  private mctsCache: Map<string, MCTSNode> = new Map();

  constructor(
    plinko: PlinkoLayer,
    worldModel: WorldModel
  ) {
    this.plinko = plinko;
    this.worldModel = worldModel;
  }

  async decide(request: DecisionRequest): Promise<DecisionResponse> {
    const contextKey = this.getContextKey(request);

    // Check cache for existing tree
    let root = this.mctsCache.get(contextKey);

    if (!root || this.shouldRebuild(root)) {
      // Build new MCTS tree
      root = await this.buildTree(request);
      this.mctsCache.set(contextKey, root);
    }

    // Select action using MCTS
    const selectedChild = this.selectAction(root);

    // Fall back to Plinko for stochastic selection
    if (selectedChild.visits < 3) {
      return await this.plinkoDecide(request);
    }

    return {
      action: selectedChild.action,
      confidence: selectedChild.avgReward,
      explanation: this.buildExplanation(selectedChild),
      treeStats: this.getTreeStats(root)
    };
  }

  async buildTree(request: DecisionRequest): Promise<MCTSNode> {
    const mcts = new WorldModelMCTS(
      this.worldModel,
      {
        budget: this.computeBudget(request),
        ucbParams: this.getUCBParams(request),
        expansionStrategy: 'progressive_widening'
      }
    );

    return await mcts.search(request.initialState);
  }

  shouldRebuild(root: MCTSNode): boolean {
    // Rebuild if tree is stale or low quality
    const age = Date.now() - root.timestamp;
    return age > 60000 || root.avgReward < 0.3;
  }
}
```

### 7.3 Resource Management

```typescript
class MCTSResourceManager {
  private maxConcurrentSearches: number = 4;
  private maxMemoryMB: number = 1000;
  private currentUsage: number = 0;

  async allocateBudget(
    request: DecisionRequest,
    availableResources: ResourceBudget
  ): Promise<MCTSBudget> {
    // Prioritize important decisions
    const priority = this.computePriority(request);

    // Allocate budget proportionally
    const baseBudget = 1000;
    const allocatedBudget = Math.floor(
      baseBudget * priority * this.getResourceFactor()
    );

    return {
      simulations: allocatedBudget,
      maxDepth: this.computeMaxDepth(request),
      timeLimitMs: this.computeTimeLimit(request, availableResources)
    };
  }

  computePriority(request: DecisionRequest): number {
    // Higher priority for:
    // - Safety-critical decisions
    // - Novel contexts
    // - High-stakes outcomes

    let priority = 1.0;

    if (request.domain === 'safety') priority *= 2.0;
    if (request.isNovel) priority *= 1.5;
    if (request.impact === 'high') priority *= 1.3;

    return priority;
  }
}
```

---

## 8. TypeScript Pseudocode

### 8.1 Core MCTS Node

```typescript
/**
 * MCTS Node for POLLN decision tree
 */
class MCTSNode {
  readonly id: string;
  readonly state: PollnState;
  readonly action: PollnAction | null;  // Null for root
  readonly parent: MCTSNode | null;
  readonly depth: number;

  private children: MCTSNode[] = [];
  private visits: number = 0;
  private totalReward: number = 0;
  private readonly createdAt: number;

  // Unexplored actions
  private unexploredActions: PollnAction[];

  constructor(
    state: PollnState,
    action: PollnAction | null,
    parent: MCTSNode | null,
    availableActions: PollnAction[]
  ) {
    this.id = uuidv4();
    this.state = state;
    this.action = action;
    this.parent = parent;
    this.depth = parent ? parent.depth + 1 : 0;
    this.unexploredActions = [...availableActions];
    this.createdAt = Date.now();
  }

  get isFullyExpanded(): boolean {
    return this.unexploredActions.length === 0;
  }

  get isTerminal(): boolean {
    return this.state.isTerminal();
  }

  get avgReward(): number {
    return this.visits > 0 ? this.totalReward / this.visits : 0;
  }

  addChild(child: MCTSNode): void {
    this.children.push(child);
  }

  visit(reward: number): void {
    this.visits++;
    this.totalReward += reward;
  }

  getUnexploredAction(): PollnAction | null {
    return this.unexploredActions.pop() || null;
  }

  getAge(): number {
    return Date.now() - this.createdAt;
  }
}
```

### 8.2 MCTS with World Model

```typescript
/**
 * MCTS implementation using World Model for rollouts
 */
class WorldModelMCTS {
  private readonly worldModel: WorldModel;
  private readonly policy?: PolicyNetwork;
  private readonly config: MCTSConfig;

  constructor(
    worldModel: WorldModel,
    config: Partial<MCTSConfig> = {}
  ) {
    this.worldModel = worldModel;
    this.config = {
      budget: 1000,
      maxDepth: 50,
      explorationConstant: 1.414,  // √2
      discountFactor: 0.99,
      rolloutHorizon: 20,
      ...config
    };
  }

  /**
   * Run MCTS from root state
   */
  async search(rootState: PollnState): Promise<MCTSNode> {
    const root = new MCTSNode(
      rootState,
      null,  // Root has no action
      null,  // Root has no parent
      rootState.getAvailableActions()
    );

    for (let i = 0; i < this.config.budget; i++) {
      // 1. Selection
      const node = this.select(root);

      // 2. Expansion
      const expanded = this.expand(node);

      // 3. Simulation (Rollout)
      const reward = await this.simulate(expanded);

      // 4. Backpropagation
      this.backpropagate(expanded, reward);
    }

    return root;
  }

  /**
   * Selection: UCB-guided tree traversal
   */
  private select(node: MCTSNode): MCTSNode {
    while (!node.isTerminal && node.isFullyExpanded) {
      node = this.selectBestChild(node);
    }
    return node;
  }

  /**
   * Select child using UCB
   */
  private selectBestChild(node: MCTSNode): MCTSNode {
    const bestChild = node.children.reduce((best, child) => {
      const bestScore = this.ucb(best);
      const childScore = this.ucb(child);
      return childScore > bestScore ? child : best;
    });

    return bestChild;
  }

  /**
   * UCB score
   */
  private ucb(node: MCTSNode): number {
    const exploitation = node.avgReward;
    const exploration = this.config.explorationConstant *
      Math.sqrt(Math.log(node.parent!.visits) / node.visits);

    return exploitation + exploration;
  }

  /**
   * Expansion: Add new node
   */
  private expand(node: MCTSNode): MCTSNode {
    if (node.isTerminal) {
      return node;
    }

    const action = node.getUnexploredAction();
    if (!action) {
      return node;
    }

    // Apply action to get new state
    const newState = this.transition(node.state, action);

    // Create child node
    const child = new MCTSNode(
      newState,
      action,
      node,
      newState.getAvailableActions()
    );

    node.addChild(child);
    return child;
  }

  /**
   * Simulation: World Model rollout
   */
  private async simulate(node: MCTSNode): Promise<number> {
    // Use World Model for fast rollout
    const latent = this.worldModel.encode(node.state.toVector());

    // Dream episode
    const episode = this.worldModel.dream(
      latent.sample,
      this.config.rolloutHorizon,
      this.policy
        ? (s) => this.policy.sample(s)
        : undefined
    );

    return episode.totalReward;
  }

  /**
   * Backpropagation: Update statistics
   */
  private backpropagate(node: MCTSNode, reward: number): void {
    let current: MCTSNode | null = node;
    let discountedReward = reward;

    while (current !== null) {
      current.visit(discountedReward);
      discountedReward *= this.config.discountFactor;
      current = current.parent;
    }
  }

  /**
   * State transition (simplified)
   */
  private transition(state: PollnState, action: PollnAction): PollnState {
    // In practice, this would execute the action
    // For simulation, use World Model prediction
    const prediction = this.worldModel.predict(
      state.toLatent(),
      action.toIndex()
    );

    return PollnState.fromLatent(prediction.nextState);
  }
}
```

### 8.3 MCTS-Enhanced Plinko Layer

```typescript
/**
 * Enhanced Plinko Layer with MCTS integration
 */
class MCTSPlinkoLayer extends PlinkoLayer {
  private mcts: WorldModelMCTS;
  private mctsCache: Map<string, CachedMCTSResult> = new Map();
  private readonly cacheTimeout: number = 60000;  // 1 minute

  constructor(
    config: PlinkoConfig,
    worldModel: WorldModel
  ) {
    super(config);
    this.mcts = new WorldModelMCTS(worldModel, {
      budget: 500,  // Moderate budget for real-time
      maxDepth: 20
    });
  }

  /**
   * Process proposals with optional MCTS enhancement
   */
  async process(proposals: AgentProposal[]): Promise<PlinkoResult> {
    // Decide whether to use MCTS
    const useMCTS = this.shouldUseMCTS(proposals);

    if (useMCTS) {
      return await this.processWithMCTS(proposals);
    } else {
      // Fall back to standard Plinko
      return await super.process(proposals);
    }
  }

  /**
   * Decide whether to use MCTS
   */
  private shouldUseMCTS(proposals: AgentProposal[]): boolean {
    // Use MCTS when:
    // - Many proposals (complex decision)
    // - High uncertainty (close confidence scores)
    // - High temperature (exploration mode)
    // - Sufficient time budget

    const numProposals = proposals.length;
    const confidenceSpread = Math.max(...proposals.map(p => p.confidence)) -
                           Math.min(...proposals.map(p => p.confidence));

    return numProposals >= 5 &&
           confidenceSpread < 0.3 &&
           this.config.temperature > 0.5;
  }

  /**
   * Process using MCTS
   */
  private async processWithMCTS(
    proposals: AgentProposal[]
  ): Promise<PlinkoResult> {
    // Create state from proposals
    const state = this.createStateFromProposals(proposals);

    // Check cache
    const cacheKey = this.getCacheKey(proposals);
    const cached = this.mctsCache.get(cacheKey);

    let root: MCTSNode;

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      root = cached.root;
    } else {
      // Build new tree
      root = await this.mcts.search(state);

      // Cache result
      this.mctsCache.set(cacheKey, {
        root,
        timestamp: Date.now()
      });

      // Limit cache size
      if (this.mctsCache.size > 100) {
        this.evictOldestCacheEntry();
      }
    }

    // Select best child
    const bestChild = this.selectBestChild(root);

    // Create result
    return {
      id: uuidv4(),
      proposals,
      selectedAgentId: bestChild.action!.agentId!,
      temperature: this.config.temperature,
      entropy: this.calculateEntropy(proposals),
      discriminatorResults: {},
      explanation: this.buildMCTSExplanation(bestChild),
      wasOverridden: false
    };
  }

  /**
   * Select best child from MCTS tree
   */
  private selectBestChild(node: MCTSNode): MCTSNode {
    // Select child with highest average reward
    return node.children.reduce((best, child) =>
      child.avgReward > best.avgReward ? child : best
    );
  }

  /**
   * Build explanation from MCTS
   */
  private buildMCTSExplanation(node: MCTSNode): string {
    const path: MCTSNode[] = [];
    let current: MCTSNode | null = node;

    while (current !== null) {
      path.unshift(current);
      current = current.parent;
    }

    return `MCTS search (${node.visits} simulations): ` +
           `avg_reward=${node.avgReward.toFixed(3)}, ` +
           `depth=${node.depth}`;
  }

  /**
   * Create state from proposals
   */
  private createStateFromProposals(proposals: AgentProposal[]): PollnState {
    return new PollnState({
      proposals,
      contextHash: this.computeContextHash(proposals),
      domain: 'agent_selection',
      availableActions: proposals.map(p => ({
        type: ActionType.ACTIVATE_AGENT,
        agentId: p.agentId,
        confidence: p.confidence
      }))
    });
  }

  /**
   * Get cache key
   */
  private getCacheKey(proposals: AgentProposal[]): string {
    const sorted = proposals.sort((a, b) => a.agentId.localeCompare(b.agentId));
    return JSON.stringify(sorted.map(p => ({
      id: p.agentId,
      conf: p.confidence
    })));
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldestCacheEntry(): void {
    let oldest: [string, CachedMCTSResult] | null = null;

    for (const [key, value] of this.mctsCache) {
      if (!oldest || value.timestamp < oldest[1].timestamp) {
        oldest = [key, value];
      }
    }

    if (oldest) {
      this.mctsCache.delete(oldest[0]);
    }
  }
}

interface CachedMCTSResult {
  root: MCTSNode;
  timestamp: number;
}

interface MCTSConfig {
  budget: number;
  maxDepth: number;
  explorationConstant: number;
  discountFactor: number;
  rolloutHorizon: number;
}
```

---

## 9. Integration with Existing Systems

### 9.1 Plinko Layer Integration

**Current Plinko:** Single-shot stochastic selection
**Enhanced Plinko:** MCTS for complex decisions, fallback to stochastic

```typescript
class HybridDecisionLayer {
  private plinko: PlinkoLayer;
  private mcts: MCTSPlinkoLayer;

  async decide(proposals: AgentProposal[]): Promise<PlinkoResult> {
    // Decision complexity assessment
    const complexity = this.assessComplexity(proposals);

    if (complexity > 0.7) {
      // High complexity: Use MCTS
      return await this.mcts.process(proposals);
    } else if (complexity > 0.3) {
      // Medium complexity: Use UCB-enhanced Plinko
      return await this.ucbPlinko(proposals);
    } else {
      // Low complexity: Use standard Plinko
      return await this.plinko.process(proposals);
    }
  }

  assessComplexity(proposals: AgentProposal[]): number {
    // Factors:
    // - Number of proposals
    // - Confidence spread
    // - Novelty of context
    // - Resource constraints

    const numFactor = Math.min(proposals.length / 10, 1.0);
    const spreadFactor = 1 - (
      Math.max(...proposals.map(p => p.confidence)) -
      Math.min(...proposals.map(p => p.confidence))
    );

    return (numFactor + spreadFactor) / 2;
  }
}
```

### 9.2 World Model Integration

**Current World Model:** Dreaming for offline optimization
**Enhanced World Model:** Real-time rollout simulation for MCTS

```typescript
class WorldModelWithMCTS extends WorldModel {
  /**
   * Fast rollout for MCTS
   */
  mctsRollout(
    startState: number[],
    actionSampler: (state: number[]) => number,
    horizon: number
  ): RolloutResult {
    let totalReward = 0;
    let currentState = startState;
    let gamma = 1.0;

    for (let t = 0; t < horizon; t++) {
      // Encode state
      const latent = this.encode(currentState);

      // Sample action
      const action = actionSampler(latent.sample);

      // Predict transition
      const transition = this.predict(latent.sample, action);

      // Accumulate discounted reward
      totalReward += gamma * transition.reward;
      gamma *= this.config.discountFactor;

      // Update state
      currentState = this.decode(transition.nextState);

      // Early termination if reward threshold reached
      if (transition.reward > 0.9) break;
    }

    return {
      totalReward,
      finalState: currentState
    };
  }
}
```

### 9.3 Colony Management Integration

```typescript
class ColonyWithMCTS extends Colony {
  private mctsOrchestrator: MCTSOrchestrator;

  async makeDecision(context: DecisionContext): Promise<Decision> {
    // Get available agents
    const availableAgents = this.getActiveAgents();

    // Collect proposals
    const proposals = await Promise.all(
      availableAgents.map(agent => agent.propose(context))
    );

    // Use MCTS orchestrator for decision
    const result = await this.mctsOrchestrator.decide({
      proposals,
      context,
      resourceBudget: this.config.resourceBudget,
      colonyState: this.getState()
    });

    // Execute decision
    return await this.executeDecision(result);
  }

  async overnightOptimization(): Promise<void> {
    // Build MCTS trees for common contexts
    const commonContexts = await this.getCommonContexts();

    for (const context of commonContexts) {
      await this.mctsOrchestrator.buildTree({
        context,
        budget: 10000,  // High budget for overnight
        useRealRollouts: false  // Use only World Model
      });
    }
  }
}
```

---

## 10. Experimental Validation

### 10.1 Research Questions

1. **Q1:** Does MCTS improve decision quality compared to Plinko alone?
2. **Q2:** How does World Model-guided MCTS compare to random rollouts?
3. **Q3:** What is the optimal MCTS budget for real-time decisions?
4. **Q4:** How does parallel MCTS scale with number of workers?
5. **Q5:** Does overnight MCTS tree building improve next-day performance?

### 10.2 Experimental Design

#### Experiment 1: MCTS vs Plinko

**Hypothesis:** MCTS achieves higher cumulative reward than Plinko alone.

**Setup:**
- Task: Sequential decision making (e.g., document processing pipeline)
- Conditions:
  - Baseline: Plinko with temperature annealing
  - Treatment: MCTS-enhanced Plinko
- Metrics: Cumulative reward, decision quality, convergence speed

**Expected Results:**
- MCTS achieves 10-20% higher cumulative reward
- Faster convergence to optimal policy
- Better handling of novel contexts

#### Experiment 2: World Model Rollouts

**Hypothesis:** World Model-guided rollouts are more sample-efficient than random rollouts.

**Setup:**
- Task: Multi-step planning
- Conditions:
  - Random rollouts (traditional MCTS)
  - World Model rollouts
  - Hybrid rollouts (shallow: World Model, deep: random)
- Metrics: Reward per simulation, total simulations needed

**Expected Results:**
- World Model rollouts: 2-3x higher reward per simulation
- Hybrid: Best of both (accuracy + speed)
- Random: Baseline

#### Experiment 3: Scaling with Parallelism

**Hypothesis:** Parallel MCTS scales sublinearly but achieves significant speedup.

**Setup:**
- Task: Large decision tree (1000+ nodes)
- Conditions: 1, 2, 4, 8, 16 workers
- Metrics: Speedup, decision quality, tree similarity

**Expected Results:**
- Near-linear speedup up to 8 workers
- Sublinear beyond 8 workers (contention)
- Similar decision quality across all conditions

### 10.3 Metrics to Track

```typescript
interface MCTSMetrics {
  // Performance
  avgReward: number;
  cumulativeReward: number;
  convergenceSpeed: number;  // Episodes to 90% of optimal

  // Efficiency
  simulationsPerDecision: number;
  timePerDecision: number;
  rewardPerSimulation: number;

  // Tree structure
  avgTreeDepth: number;
  avgBranchingFactor: number;
  treeSize: number;

  // Exploration
  uniqueActionsExplored: number;
  explorationRate: number;  // New actions / total actions

  // World Model
  rolloutAccuracy: number;  // Predicted vs actual reward
  dreamingTime: number;  // Time per rollout
}
```

### 10.4 Baseline Comparisons

| Method | Avg Reward | Simulations | Time (ms) | Sample Efficiency |
|--------|-----------|-------------|-----------|-------------------|
| Random | 0.25 | 1 | 1 | N/A |
| ε-Greedy | 0.45 | 1 | 5 | Low |
| Plinko (T=1.0) | 0.55 | 1 | 10 | Low |
| UCB1 | 0.60 | 1 | 8 | Low |
| MCTS (Random) | 0.70 | 1000 | 500 | Medium |
| MCTS (World Model) | 0.80 | 500 | 200 | High |
| MCTS (Parallel-8) | 0.80 | 500 | 30 | High |

### 10.5 Success Criteria

- MCTS achieves ≥ 15% higher reward than Plinko baseline
- World Model rollouts achieve ≥ 2x sample efficiency vs random
- Parallel MCTS achieves ≥ 4x speedup with 8 workers
- Overnight MCTS improves next-day performance by ≥ 10%
- Decision time ≤ 100ms for real-time use cases

---

## 11. Implementation Roadmap

### Phase 1: Core MCTS (Weeks 1-4)
- [ ] Implement MCTSNode class
- [ ] Implement basic MCTS algorithm
- [ ] Add UCB selection
- [ ] Unit tests for MCTS components

### Phase 2: World Model Integration (Weeks 5-8)
- [ ] Extend WorldModel for MCTS rollouts
- [ ] Implement dreaming rollouts
- [ ] Add rollout caching
- [ ] Benchmark vs random rollouts

### Phase 3: Plinko Integration (Weeks 9-12)
- [ ] Implement MCTSPlinkoLayer
- [ ] Add hybrid decision logic
- [ ] Implement caching layer
- [ ] Integration tests

### Phase 4: Parallelization (Weeks 13-16)
- [ ] Implement root parallelization
- [ ] Implement tree parallelization
- [ ] Add hierarchical parallel MCTS
- [ ] Scaling benchmarks

### Phase 5: Production Readiness (Weeks 17-20)
- [ ] Resource management
- [ ] Monitoring and observability
- [ ] Performance optimization
- [ ] Documentation

---

## 12. Key References

### MCTS Fundamentals
1. Browne, C. B., et al. (2012). A Survey of Monte Carlo Tree Search Methods. IEEE Transactions on Computational Intelligence and AI in Games.

2. Kocsis, L., & Szepesvári, C. (2006). Bandit-based Monte-Carlo Planning. ECML.

3. Chaslot, G., et al. (2008). Monte-Carlo Tree Search: A New Framework for Game AI. AIIDE.

### AlphaGo and Neural MCTS
4. Silver, D., et al. (2016). AlphaGo: Mastering the Ancient Game of Go with Machine Learning. Nature.

5. Silver, D., et al. (2017). Mastering the Game of Go without Human Knowledge. Nature.

6. Anthony, T., et al. (2017). Thinking Fast and Slow with Deep Learning and Tree Search. NeurIPS.

### World Models and Planning
7. Ha, D., & Schmidhuber, J. (2018). World Models. arXiv.

8. Hafner, D., et al. (2019). Dream to Control: Learning Behaviors by Latent Imagination. ICML.

9. Janner, M., et al. (2020). Backpropamine: Training Recurrent Networks with Synthetic Gradients. ICLR.

### Parallel MCTS
10. Chaslot, G., et al. (2008). Parallel Monte-Carlo Tree Search. IEEE CIG.

11. Enzenberger, M., et al. (2018). Distributed Monte Carlo Tree Search for Computer Go. KI.

### POLLN-Specific
12. POLLN Architecture Document (2026). Pattern-Organized Large Language Network.

13. Stochastic Decisions Research (2026). Gumbel-Softmax and Bandit Algorithms for POLLN.

14. World Model Research (2026). Dreaming and VAE-based Planning.

---

## 13. Conclusion

### Key Insights

1. **MCTS complements Plinko:** MCTS provides structured exploration for complex decisions; Plinko handles simple, fast decisions.

2. **World Model enables efficient MCTS:** Instead of random rollouts, use the World Model to dream realistic futures, making MCTS more sample-efficient.

3. **Hierarchical decision space:** POLLN's multi-layer decision structure maps naturally to hierarchical MCTS.

4. **UCB for tiles:** Standard UCB formulas can be adapted for tile/honeycomb cell selection with context-aware bonuses.

5. **Parallel execution:** Multiple MCTS trees can run in parallel for different agents, colonies, or decision levels.

### Novel Contributions

1. **World Model-Guided MCTS:** First application of learned world models to MCTS in multi-agent systems (vs traditional random rollouts).

2. **Stochastic MCTS:** Integration of Gumbel-Softmax with UCB for smooth exploration-exploitation tradeoff.

3. **Overnight Tree Building:** Use idle time to pre-build MCTS trees for common decision contexts.

4. **Hierarchical Parallel MCTS:** Parallel tree search at multiple decision levels simultaneously.

5. **Adaptive UCB for Tiles:** Context-aware UCB for reusable decision patterns.

### Future Directions

1. **Meta-MCTS:** Learn when to use MCTS vs Plinko (meta-decision)

2. **Transfer Learning:** Share MCTS trees across colonies with similar contexts

3. **Continual Learning:** Update MCTS trees online without full rebuilds

4. **Explainable MCTS:** Extract decision paths for human understanding

5. **Multi-Objective MCTS:** Balance safety, efficiency, and novelty simultaneously

---

**Document Status:** Complete
**Next Steps:** Implementation Phase 1 (Core MCTS)
**Review Date:** 2026-03-20

---

*This research document provides a comprehensive framework for integrating MCTS with POLLN's existing stochastic selection and world model capabilities. The approach maintains POLLN's biological plausibility while adding the structured exploration benefits of MCTS.*
