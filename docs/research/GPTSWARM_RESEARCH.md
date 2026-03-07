# GPTSwarm Research: Applicable Patterns for POLLN

**Research Date:** 2026-03-07
**Subject:** GPTSwarm (https://github.com/metauto-ai/GPTSwarm)
**Paper:** Language Agents as Optimizable Graphs (ICML 2024)
**Authors:** Mingchen Zhuge, Wenyi Wang, Louis Kirsch, Francesco Faccio, Dmitrii Khizbullin, Jürgen Schmidhuber

---

## Executive Summary

GPTSwarm is a graph-based framework for LLM agent coordination that treats agent workflows as **optimizable computational graphs**. It provides two major innovations:

1. **Node Optimization**: Automatic refinement of LLM prompts within nodes
2. **Edge Optimization**: Learning optimal connections between agents through reinforcement learning

This research identifies key patterns from GPTSwarm that can enhance POLLN's agent coordination, graph evolution, and self-organization capabilities.

---

## 1. Core Concepts

### 1.1 Graph-Based Agent Representation

GPTSwarm represents agents as computational graphs where:
- **Nodes** = Operations (LLM calls, tools, data processing)
- **Edges** = Information flow between operations
- **Composite Graphs** = Hierarchies of inter-agent collaboration

**Key Insight:** This is fundamentally similar to POLLN's agent network approach, but GPTSwarm makes the graph structure **explicitly optimizable** rather than emergent.

### 1.2 Edge Optimization

The most innovative aspect of GPTSwarm is **edge optimization**:

- Edges between agents have **learnable probabilities** (0-1)
- These probabilities are optimized through RL to improve task performance
- Optimization leads to **edge pruning** (probability → 0) or **edge creation** (probability → 1)
- Within-agent edges remain fixed; only inter-agent connections are optimized

**Visualization:** The system shows edge optimization in action, with blue edges weakening (pruning) and red edges strengthening (creation).

### 1.3 Swarm Architecture

GPTSwarm organizes agents into a **Swarm** class that:

```python
class Swarm:
    def __init__(self, agent_names, domain, edge_optimize=True, node_optimize=True):
        self.agent_names = agent_names
        self.domain = domain
        self.composite_graph = CompositeGraph()
        self.connection_dist = EdgeWiseDistribution(potential_connections)
```

**Key Features:**
- Manages multiple agents as a composite graph
- Supports bi-directional connections between agents
- Optimizes inter-agent connectivity through RL
- Maintains a final decision node for merging outputs

---

## 2. Key Applicable Patterns for POLLN

### 2.1 Probabilistic Edge Weights

**GPTSwarm Pattern:** Edges have learnable probabilities optimized through RL.

**Current POLLN State:** POLLN uses Hebbian learning with fixed weight updates based on co-activation.

**Recommendation for POLLN:**

```typescript
interface ProbabilisticEdge {
  source: string;
  target: string;
  weight: number;           // Current synaptic weight (0-1)
  probability: number;       // Connection probability (0-1)
  gradient: number;          // Gradient from RL optimization
  age: number;
  usage_count: number;
}

class EnhancedGraphEvolution extends GraphEvolution {
  // Add gradient-based edge optimization
  optimizeEdges(reward_signal: number): void {
    for (const edge of this.edges.values()) {
      // Update probability based on reward gradient
      edge.probability = Math.max(0, Math.min(1,
        edge.probability + this.config.learningRate * edge.gradient * reward_signal
      ));

      // Sample actual connection based on probability
      edge.active = Math.random() < edge.probability;
    }
  }
}
```

**Benefits:**
- Enables exploration of different network topologies
- Allows weak connections to persist (backup pathways)
- Supports adaptive network restructuring based on performance

### 2.2 Composite Graph Hierarchies

**GPTSwarm Pattern:** Graphs can be recursively combined into larger composite graphs representing agent hierarchies.

**Current POLLN State:** POLLN has flat agent network with TaskAgent, RoleAgent, CoreAgent.

**Recommendation for POLLN:**

```typescript
interface CompositeAgent extends BaseAgent {
  subAgents: Map<string, BaseAgent>;
  internalGraph: AgentGraph;

  // Execute internal graph before external interaction
  async process<T>(input: T): Promise<A2APackage<T>> {
    // Phase 1: Internal coordination
    const internalResult = await this.internalGraph.execute(input);

    // Phase 2: External interaction
    return await this.externalProcess(internalResult);
  }
}

class HierarchicalColony extends Colony {
  // Support nested agent organizations
  private compositeAgents: Map<string, CompositeAgent> = new Map();

  createCompositeAgent(
    name: string,
    subAgents: string[]
  ): CompositeAgent {
    const composite = new CompositeAgent({
      id: name,
      typeId: 'composite',
      subAgents: subAgents.map(id => this.getAgent(id))
    });

    this.compositeAgents.set(name, composite);
    return composite;
  }
}
```

**Benefits:**
- Enables modular agent composition
- Supports hierarchical task decomposition
- Allows reusable agent patterns (similar to GPTSwarm's agent registry)

### 2.3 Multi-Objective Node Optimization

**GPTSwarm Pattern:** Node-level LLM prompts are automatically refined using gradient-based optimization.

**Current POLLN State:** POLLN agents have fixed configurations without prompt optimization.

**Recommendation for POLLN:**

```typescript
interface OptimizableAgent extends BaseAgent {
  promptTemplate: string;
  promptGradient: Map<string, number>;

  optimizePrompt(performance: number): void {
    // Update prompt based on performance gradient
    for (const [component, gradient] of this.promptGradient) {
      const adjustment = gradient * performance * this.config.promptLearningRate;
      this.promptTemplate = this.adjustPromptComponent(
        this.promptTemplate,
        component,
        adjustment
      );
    }
  }
}

class PromptOptimizer {
  // Use LLM to generate prompt variations
  async generateVariations(
    basePrompt: string,
    performance_history: number[]
  ): Promise<string[]> {
    const trend = this.analyzeTrend(performance_history);

    // Ask LLM to improve prompt
    const improvement_prompt = `
      Current prompt: ${basePrompt}
      Recent performance trend: ${trend}

      Generate 3 improved variations of this prompt that:
      1. Address performance issues
      2. Maintain core functionality
      3. Improve clarity and specificity
    `;

    return await this.llm.generate(improvement_prompt);
  }
}
```

**Benefits:**
- Automatic prompt improvement over time
- Adaptation to specific task domains
- Reduced manual prompt engineering

### 2.4 Edge-wise Distribution Parameterization

**GPTSwarm Pattern:** Uses `EdgeWiseDistribution` class to parameterize and optimize edge probabilities.

**Current POLLN State:** POLLN uses direct Hebbian weight updates without probabilistic sampling.

**Recommendation for POLLN:**

```typescript
class EdgeWiseDistribution {
  private logits: Map<string, number> = new Map();
  private temperature: number = 1.0;

  constructor(potential_connections: Array<[string, string]>) {
    // Initialize logits for all potential connections
    for (const [source, target] of potential_connections) {
      this.logits.set(`${source}->${target}`, 0.0);
    }
  }

  // Sample actual connections from distribution
  realize(graph: AgentGraph): [AgentGraph, number[]] {
    const sampled_graph = graph.clone();
    const probabilities: number[] = [];

    for (const [key, logit] of this.logits) {
      const prob = this.sigmoid(logit / this.temperature);
      probabilities.push(prob);

      if (Math.random() < prob) {
        sampled_graph.activateEdge(key);
      }
    }

    return [sampled_graph, probabilities];
  }

  // Update logits based on reward
  updateLogits(reward: number, gradients: number[]): void {
    let i = 0;
    for (const [key, _] of this.logits) {
      const current_logit = this.logits.get(key)!;
      this.logits.set(key, current_logit + this.learningRate * gradients[i] * reward);
      i++;
    }
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}
```

**Benefits:**
- Probabilistic edge activation (exploration vs exploitation)
- Temperature-controlled exploration
- Gradient-based optimization compatible with RL

### 2.5 Modular Agent Registry

**GPTSwarm Pattern:** `AgentRegistry` provides centralized agent management and instantiation.

**Current POLLN State:** POLLN has `Colony` class but could enhance with registry pattern.

**Recommendation for POLLN:**

```typescript
class AgentRegistry {
  private static instance: AgentRegistry;
  private agentTypes: Map<string, AgentFactory> = new Map();
  private agentInstances: Map<string, BaseAgent> = new Map();

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  registerAgentType(
    typeId: string,
    factory: AgentFactory
  ): void {
    this.agentTypes.set(typeId, factory);
  }

  async createAgent(
    typeId: string,
    config: AgentConfig
  ): Promise<BaseAgent> {
    const factory = this.agentTypes.get(typeId);
    if (!factory) {
      throw new Error(`Unknown agent type: ${typeId}`);
    }

    const agent = await factory.create(config);
    this.agentInstances.set(agent.id, agent);

    return agent;
  }

  getAgent(id: string): BaseAgent | undefined {
    return this.agentInstances.get(id);
  }

  listAgentsByType(typeId: string): BaseAgent[] {
    return Array.from(this.agentInstances.values())
      .filter(a => a.config.typeId === typeId);
  }
}

// Usage
AgentRegistry.getInstance().registerAgentType('task', {
  create: async (config) => new TaskAgent(config)
});

AgentRegistry.getInstance().registerAgentType('role', {
  create: async (config) => new RoleAgent(config)
});
```

**Benefits:**
- Centralized agent management
- Easy agent instantiation by type
- Support for agent lifecycle tracking

---

## 3. Comparative Analysis: GPTSwarm vs POLLN

| Aspect | GPTSwarm | POLLN | Integration Opportunity |
|--------|----------|-------|------------------------|
| **Graph Representation** | Explicit computational graphs | Emergent Hebbian network | Add explicit graph parameterization |
| **Edge Learning** | RL-based probability optimization | Hebbian co-activation | Combine: Hebbian + RL gradients |
| **Node Optimization** | Automatic prompt refinement | Fixed agent configs | Add prompt optimization module |
| **Hierarchy** | Composite graphs | Flat agent hierarchy | Implement composite agents |
| **Exploration** | Probabilistic edge sampling | Stochastic Plinko selection | Unify exploration strategies |
| **Optimization Target** | Task performance metrics | Value function + reward | Multi-objective optimization |
| **Memory** | Index-based memory | World model + dreaming | Enhance with graph replay |
| **Coordination** | Graph execution engine | Stigmergy + A2A packages | Hybrid approach |

---

## 4. Implementation Recommendations

### 4.1 Phase 1: Probabilistic Edge Enhancement (High Priority)

**Objective:** Add probabilistic edge weights to existing graph evolution.

**Implementation:**

1. Extend `SynapseConfig` to include connection probability:
```typescript
export interface SynapseConfig {
  weight: number;
  probability: number;  // NEW: Edge activation probability
  lastCoactivated: number;
  coactivationCount: number;
  gradient: number;     // NEW: RL gradient
}
```

2. Modify `HebbianLearning` to update probabilities:
```typescript
class HebbianLearning {
  updateProbability(
    sourceId: string,
    targetId: string,
    reward: number,
    gradient: number
  ): void {
    const synapse = this.getSynapse(sourceId, targetId);

    // Update probability using gradient
    synapse.probability = Math.max(0, Math.min(1,
      synapse.probability + this.config.learningRate * gradient * reward
    ));
  }
}
```

3. Add probabilistic sampling in agent selection:
```typescript
class PlinkoLayer {
  selectWithProbability(
    proposals: A2APackage[],
    edgeProbabilities: Map<string, number>
  ): A2APackage {
    // Filter by edge probability first
    const active = proposals.filter(p =>
      Math.random() < (edgeProbabilities.get(p.source) ?? 1.0)
    );

    // Then apply Plinko selection
    return this.select(active);
  }
}
```

### 4.2 Phase 2: Composite Agent Pattern (Medium Priority)

**Objective:** Enable hierarchical agent composition.

**Implementation:**

1. Create `CompositeAgent` class:
```typescript
export class CompositeAgent extends BaseAgent {
  public readonly subAgents: Map<string, BaseAgent>;
  public readonly internalGraph: AgentGraph;

  constructor(config: AgentConfig, subAgents: BaseAgent[]) {
    super(config);
    this.subAgents = new Map(subAgents.map(a => [a.id, a]));
    this.internalGraph = new AgentGraph(subAgents);
  }

  async process<T>(input: T): Promise<A2APackage<T>> {
    // Phase 1: Internal graph execution
    const internalResult = await this.internalGraph.execute(input);

    // Phase 2: External coordination
    return await this.coordinateWithPeers(internalResult);
  }
}
```

2. Extend `Colony` to support composite agents:
```typescript
class Colony {
  createCompositeAgent(
    name: string,
    subAgentIds: string[]
  ): CompositeAgent {
    const subAgents = subAgentIds
      .map(id => this.getAgent(id))
      .filter((a): a is BaseAgent => a !== undefined);

    const config: AgentConfig = {
      id: uuidv4(),
      typeId: 'composite',
      gardenerId: this.config.gardenerId,
      privacyLevel: 'private',
      capabilities: this.aggregateCapabilities(subAgents)
    };

    const composite = new CompositeAgent(config, subAgents);
    this.registerAgent(config);

    return composite;
  }
}
```

### 4.3 Phase 3: Prompt Optimization (Low Priority)

**Objective:** Add automatic prompt refinement.

**Implementation:**

1. Create `PromptOptimizer` class:
```typescript
class PromptOptimizer {
  async optimizePrompt(
    agent: BaseAgent,
    performanceHistory: number[]
  ): Promise<string> {
    const trend = this.analyzePerformanceTrend(performanceHistory);

    if (trend > 0) {
      // Performance improving - keep current prompt
      return agent.config.prompt;
    }

    // Performance declining - generate variations
    const variations = await this.generateVariations(
      agent.config.prompt,
      performanceHistory
    );

    // Test variations and select best
    return await this.selectBestVariation(variations, agent);
  }

  private async generateVariations(
    basePrompt: string,
    history: number[]
  ): Promise<string[]> {
    // Use LLM to generate improved variations
    const improvementRequest = {
      task: 'improve_prompt',
      current: basePrompt,
      context: {
        recent_performance: history.slice(-10),
        trend: this.analyzePerformanceTrend(history)
      }
    };

    return await this.llm.generate(improvementRequest);
  }
}
```

2. Add to agent lifecycle:
```typescript
class BaseAgent {
  private promptOptimizer: PromptOptimizer;

  async afterTask(result: TaskResult): Promise<void> {
    // Record performance
    this.performanceHistory.push(result.score);

    // Periodically optimize prompt
    if (this.performanceHistory.length % 10 === 0) {
      const improved = await this.promptOptimizer.optimizePrompt(
        this,
        this.performanceHistory
      );

      if (improved !== this.config.prompt) {
        this.config.prompt = improved;
        this.emit('prompt_optimized', { newPrompt: improved });
      }
    }
  }
}
```

### 4.4 Phase 4: Edge-wise Distribution (Medium Priority)

**Objective:** Implement GPTSwarm-style edge distribution.

**Implementation:**

1. Create `EdgeWiseDistribution` class (see pattern 2.4 above)

2. Integrate with `GraphEvolution`:
```typescript
class GraphEvolution {
  private edgeDistribution: EdgeWiseDistribution;

  constructor(hebbian: HebbianLearning, config?: GraphEvolutionConfig) {
    // ...existing code...

    // Initialize edge distribution
    const potentialConnections = this.generatePotentialConnections();
    this.edgeDistribution = new EdgeWiseDistribution(potentialConnections);
  }

  async evolveWithRL(rewardSignal: number): Promise<EvolutionStats> {
    // Get gradients from recent activity
    const gradients = this.computeGradients();

    // Update edge distribution
    this.edgeDistribution.updateLogits(rewardSignal, gradients);

    // Sample new graph structure
    const [sampledGraph, probabilities] = this.edgeDistribution.realize(
      this.compositeGraph
    );

    // Apply to actual graph
    this.applySampledStructure(sampledGraph, probabilities);

    return this.getStats();
  }
}
```

---

## 5. Architectural Integration

### 5.1 Enhanced Module Structure

```
src/core/
├── agent.ts                    # Existing BaseAgent
├── agents.ts                   # Existing TaskAgent, RoleAgent, CoreAgent
├── composite_agent.ts          # NEW: CompositeAgent
├── colony.ts                   # Existing Colony (enhanced)
├── evolution.ts                # Existing GraphEvolution (enhanced)
├── edge_distribution.ts        # NEW: EdgeWiseDistribution
├── prompt_optimizer.ts         # NEW: PromptOptimizer
├── agent_registry.ts           # NEW: AgentRegistry
└── types.ts                    # Enhanced with new types
```

### 5.2 Type Enhancements

```typescript
// types.ts additions

export interface ProbabilisticSynapseConfig extends SynapseConfig {
  probability: number;
  gradient: number;
  temperature?: number;
}

export interface CompositeAgentConfig extends AgentConfig {
  subAgentIds: string[];
  internalGraphConfig?: GraphConfig;
}

export interface PromptOptimizationConfig {
  enabled: boolean;
  optimizationInterval: number;
  minSamples: number;
  variationCount: number;
  testSamples: number;
}

export interface EdgeDistributionConfig {
  temperature: number;
  learningRate: number;
  initializationStrategy: 'uniform' | 'normal' | 'heuristic';
}
```

### 5.3 Integration with Existing POLLN Concepts

| POLLN Concept | GPTSwarm Enhancement | Benefit |
|---------------|---------------------|---------|
| **Subsumption Architecture** | Probabilistic edges between layers | Dynamic layer activation |
| **Plinko Selection** | Edge-wise distribution sampling | Unified exploration strategy |
| **Hebbian Learning** | RL gradient updates | Multi-signal learning |
| **Stigmergy** | Edge probability as pheromone | Enhanced coordination |
| **META Tiles** | Composite agent patterns | Hierarchical differentiation |
| **Value Network** | Edge optimization reward | TD(λ) for graph structure |
| **World Model** | Graph structure replay | Dream-based topology optimization |

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// edge_distribution.test.ts
describe('EdgeWiseDistribution', () => {
  it('should initialize with uniform probabilities', () => {
    const dist = new EdgeWiseDistribution([
      ['agent1', 'agent2'],
      ['agent2', 'agent3']
    ]);

    const probs = dist.getProbabilities();
    expect(probs.every(p => p === 0.5)).toBe(true);
  });

  it('should sample edges based on probabilities', () => {
    const dist = new EdgeWiseDistribution([['a', 'b']]);
    dist.setLogit('a->b', 10); // High probability

    const [graph, probs] = dist.realize(baseGraph);
    expect(probs[0]).toBeGreaterThan(0.9);
  });
});

// composite_agent.test.ts
describe('CompositeAgent', () => {
  it('should execute internal graph before external', async () => {
    const subAgent1 = new MockAgent();
    const subAgent2 = new MockAgent();
    const composite = new CompositeAgent(config, [subAgent1, subAgent2]);

    const result = await composite.process(input);

    expect(subAgent1.process).toHaveBeenCalled();
    expect(subAgent2.process).toHaveBeenCalled();
  });
});
```

### 6.2 Integration Tests

```typescript
// graph_optimization_integration.test.ts
describe('Graph Evolution with RL', () => {
  it('should optimize edges based on reward', async () => {
    const colony = new Colony(colonyConfig);
    const evolution = new GraphEvolution(hebbian, {
      edgeOptimization: true
    });

    // Register agents
    colony.registerAgent(agent1Config);
    colony.registerAgent(agent2Config);

    // Run evolution cycles
    for (let i = 0; i < 100; i++) {
      const reward = await executeTask();
      await evolution.evolveWithRL(reward);
    }

    // Verify edge optimization
    const edges = evolution.getEdges();
    const activeEdges = edges.filter(e => e.probability > 0.5);

    expect(activeEdges.length).toBeLessThan(edges.length);
  });
});
```

---

## 7. Research Gaps and Future Directions

### 7.1 Unanswered Questions

1. **Scalability:** How does edge optimization scale to 1000+ agents?
2. **Convergence:** Under what conditions do edge probabilities converge?
3. **Stability:** How to prevent rapid oscillation in edge probabilities?
4. **Multi-Objective:** How to balance multiple optimization objectives?
5. **Transfer Learning:** Can optimized graph structures transfer between tasks?

### 7.2 Experimental Directions

1. **Benchmark Comparisons:**
   - Compare GPTSwarm-style edge optimization vs pure Hebbian learning
   - Measure task performance with/without prompt optimization
   - Test composite agents vs flat agent networks

2. **Hyperparameter Studies:**
   - Edge learning rate sensitivity
   - Temperature schedule for exploration
   - Balance between node and edge optimization

3. **Architecture Experiments:**
   - Hybrid: Hebbian + RL gradients
   - Hierarchical composite agent depth
   - Cross-agent prompt sharing

### 7.3 Theoretical Connections

1. **Neuroscience:**
   - Synaptic pruning vs edge pruning
   - Neural plasticity vs graph evolution
   - Modular brain organization vs composite agents

2. **Network Science:**
   - Small-world properties in optimized graphs
   - Scale-free network emergence
   - Community detection and clustering

3. **Optimization Theory:**
   - Convergence guarantees for edge optimization
   - Relationship to neural architecture search
   - Multi-armed bandit formulations

---

## 8. Conclusion

GPTSwarm offers several valuable patterns that can enhance POLLN's agent coordination capabilities:

### High-Value Integrations:

1. **Probabilistic Edge Weights** - Enables exploration and adaptive network topology
2. **Edge-wise Distribution** - Provides principled framework for graph optimization
3. **Composite Agent Pattern** - Supports hierarchical task decomposition

### Medium-Value Integrations:

1. **Agent Registry** - Improves code organization and agent lifecycle management
2. **Prompt Optimization** - Reduces manual prompt engineering

### Key Differentiator:

POLLN's **stigmergic coordination** and **subsumption architecture** provide unique advantages over GPTSwarm's purely graph-based approach. The ideal integration combines:

- POLLN's emergent, behavior-based coordination
- GPTSwarm's explicit graph optimization
- Hybrid learning (Hebbian + RL)
- Hierarchical composition

### Implementation Priority:

1. **Phase 1:** Probabilistic edge enhancement (2-3 weeks)
2. **Phase 2:** Edge-wise distribution (2-3 weeks)
3. **Phase 3:** Composite agent pattern (3-4 weeks)
4. **Phase 4:** Prompt optimization (optional, 2-3 weeks)

---

## 9. References

1. **GPTSwarm Paper:** Zhuge et al., "Language Agents as Optimizable Graphs", ICML 2024
   - https://arxiv.org/abs/2402.16823
   - https://github.com/metauto-ai/GPTSwarm

2. **GPTSwarm Website:** https://gptswarm.org

3. **Related Work:**
   - Neural Architecture Search (NAS)
   - Multi-agent reinforcement learning
   - Graph neural networks
   - Modular deep learning

4. **POLLN Documentation:**
   - `docs/ARCHITECTURE.md`
   - `docs/ROADMAP.md`
   - `docs/research/pluripotent-agents-research.md`

---

**Document Status:** Research Complete
**Next Steps:** Implementation Phase 1 (Probabilistic Edge Enhancement)
