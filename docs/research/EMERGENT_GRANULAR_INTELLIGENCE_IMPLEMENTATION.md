# Emergent Granular Intelligence - Implementation Guide

**Companion to:** EMERGENT_GRANULAR_INTELLIGENCE.md
**Purpose:** Concrete code examples for building hydraulic agent systems
**Date:** March 7, 2026

---

## Quick Start

### 1. Basic Hydraulic System Setup

```typescript
import {
  Colony,
  BaseAgent,
  A2APackageSystem,
  PlinkoLayer,
  HebbianLearning,
  Stigmergy,
  ValueNetwork,
  GraphEvolution,
} from 'polln/core';

// Create a colony
const colony = new Colony({
  id: 'my-colony',
  gardenerId: 'user-123',
  name: 'Research Assistant',
  maxAgents: 100,
  resourceBudget: {
    totalCompute: 1000,
    totalMemory: 8000,
    totalNetwork: 500,
  },
});

// Create communication system
const a2a = new A2APackageSystem({
  historySize: 100,
  defaultPrivacyLevel: PrivacyLevel.COLONY,
});

// Create decision layer
const plinko = new PlinkoLayer({
  temperature: 1.0,
  minTemperature: 0.1,
  decayRate: 0.001,
});

// Create learning system
const hebbian = new HebbianLearning({
  learningRate: 0.01,
  decayRate: 0.001,
});

// Create stigmergy system
const stigmergy = new Stigmergy({
  maxPheromones: 1000,
  defaultHalfLife: 60000,
});

// Create value network
const valueNetwork = new ValueNetwork({
  discountFactor: 0.99,
  tdLambda: 0.8,
  learningRate: 0.001,
});

// Create graph evolution
const evolution = new GraphEvolution(hebbian, {
  pruningThreshold: 0.05,
  pruningInterval: 60000,
  graftingProbability: 0.01,
});
```

---

## 2. Creating Specialized Agents

### 2.1 Simple Task Agent

```typescript
import { TaskAgent } from 'polln/core';

class SyntaxValidator extends TaskAgent {
  constructor() {
    super({
      id: 'syntax-validator',
      typeId: 'syntax-validator',
      expertise: ['syntax', 'parsing', 'validation'],
      modelSize: '10M',
    });
  }

  async process(input: A2APackage<string>): Promise<A2APackage<ValidationResult>> {
    const code = input.payload;

    // Parse and validate
    const errors = this.validateSyntax(code);

    // Create result package
    return await this.a2a.createPackage(
      this.id,
      input.senderId,
      'validation-result',
      {
        valid: errors.length === 0,
        errors,
        lineCount: code.split('\n').length,
      },
      {
        parentIds: [input.id],
        layer: SubsumptionLayer.REFLEX,
      }
    );
  }

  private validateSyntax(code: string): SyntaxError[] {
    // Implementation specific to language
    // Returns array of syntax errors
    return [];
  }
}
```

### 2.2 Role Agent with Learning

```typescript
import { RoleAgent } from 'polln/core';

class CodeReviewer extends RoleAgent {
  private reviewHistory: Map<string, ReviewPattern[]> = new Map();

  constructor() {
    super({
      id: 'code-reviewer',
      typeId: 'code-reviewer',
      expertise: ['code-review', 'quality', 'best-practices'],
      modelSize: '50M',
    });
  }

  async process(input: A2APackage<ReviewRequest>): Promise<A2APackage<ReviewResult>> {
    const request = input.payload;

    // Analyze code
    const issues = await this.findIssues(request.code);

    // Learn from patterns
    await this.learnFromReview(request, issues);

    // Deposit pheromone if found something important
    if (issues.some(i => i.severity === 'critical')) {
      this.stigmergy.deposit(
        this.id,
        PheromoneType.DANGER,
        { taskType: 'security-review' },
        0.9
      );
    }

    return await this.a2a.createPackage(
      this.id,
      input.senderId,
      'review-result',
      {
        issues,
        summary: this.summarizeIssues(issues),
        recommendation: this.makeRecommendation(issues),
      },
      { parentIds: [input.id] }
    );
  }

  private async learnFromReview(request: ReviewRequest, issues: Issue[]): Promise<void> {
    // Update value network based on review outcomes
    const state = this.encodeReviewState(request, issues);
    const reward = this.computeReward(issues);

    await this.valueNetwork.update(state, reward);
  }
}
```

### 2.3 META Tile (Pluripotent Agent)

```typescript
import { MetaTile, DifferentiationPotential } from 'polln/core';

class UniversalAgent extends MetaTile {
  constructor() {
    super({
      id: 'meta-agent-1',
      potential: DifferentiationPotential.UNIVERSAL,
      environmentalSensitivity: 0.8,
      differentiationThreshold: 0.6,
      reDifferentiationCooldown: 300000,
      maxDifferentiations: 5,
    });
  }

  // Automatically differentiates based on signals
  async process(input: A2APackage<unknown>): Promise<A2APackage<unknown>> {
    // Check if should differentiate
    const signal = this.senseEnvironment();

    if (this.shouldDifferentiate(signal)) {
      const decision = await this.decideDifferentiation(signal);

      if (decision.type) {
        await this.differentiate(decision.type, signal);
      }
    }

    // Process based on current state
    if (this.state === MetaTileState.DIFFERENTIATED) {
      return await this.processAsSpecialized(input);
    } else {
      return await this.processAsGeneric(input);
    }
  }
}
```

---

## 3. Implementing Emergence Detection

### 3.1 Pattern Detection in A2A Traces

```typescript
class EmergenceDetector {
  private a2aSystem: A2APackageSystem;
  private knownPatterns: Set<string> = new Set();
  private emergenceThreshold: number = 0.7;

  async detectEmergentBehaviors(
    window: TimeWindow
  ): Promise<EmergentBehavior[]> {
    // 1. Get all causal chains in window
    const chains = await this.getCausalChains(window);

    // 2. Analyze each chain
    const candidates: EmergentBehavior[] = [];

    for (const chain of chains) {
      const analysis = await this.analyzeChain(chain);

      if (analysis.emergenceScore > this.emergenceThreshold) {
        candidates.push({
          chainId: chain.id,
          agents: chain.agents,
          capabilities: analysis.capabilities,
          outcome: chain.outcome,
          emergenceScore: analysis.emergenceScore,
          noveltyFactors: analysis.noveltyFactors,
        });
      }
    }

    // 3. Filter and validate
    return await this.validateCandidates(candidates);
  }

  private async analyzeChain(chain: CausalChain): Promise<ChainAnalysis> {
    // Check if outcome is novel
    const outcomeKnown = this.knownPatterns.has(
      this.hashOutcome(chain.outcome)
    );

    // Check if agent composition is novel
    const compositionKnown = this.knownPatterns.has(
      this.hashComposition(chain.agents)
    );

    // Check if capabilities were co-located before
    const capabilitiesColocated = await this.wereColocated(
      chain.capabilities
    );

    // Compute emergence score
    const noveltyFactors = {
      novelOutcome: !outcomeKnown,
      novelComposition: !compositionKnown,
      novelAssembly: !capabilitiesColocated,
    };

    const emergenceScore =
      (novelFactors.novelOutcome ? 0.4 : 0) +
      (novelFactors.novelComposition ? 0.3 : 0) +
      (novelFactors.novelAssembly ? 0.3 : 0);

    return { emergenceScore, noveltyFactors };
  }
}
```

### 3.2 Graph-Based Emergence Detection

```typescript
class GraphEmergenceDetector {
  private evolution: GraphEvolution;

  async detectStructuralEmergence(): Promise<StructuralEmergence[]> {
    const stats = await this.evolution.getStats();
    const clusters = this.evolution.getClusters();
    const edges = this.evolution.getEdges();

    const emergences: StructuralEmergence[] = [];

    // 1. Detect new clusters (functional communities)
    for (const cluster of clusters) {
      if (cluster.modularity > 0.8 && cluster.cohesion > 0.7) {
        emergences.push({
          type: 'functional-community',
          clusterId: cluster.id,
          members: cluster.members,
          strength: cluster.modularity,
          interpretation: this.interpretCluster(cluster),
        });
      }
    }

    // 2. Detect new bridge connections (cross-domain links)
    for (const edge of edges) {
      const sourceCluster = this.getCluster(edge.source);
      const targetCluster = this.getCluster(edge.target);

      if (sourceCluster !== targetCluster && edge.weight > 0.7) {
        emergences.push({
          type: 'cross-domain-bridge',
          source: edge.source,
          target: edge.target,
          strength: edge.weight,
          interpretation: `Bridge between ${sourceCluster} and ${targetCluster}`,
        });
      }
    }

    return emergences;
  }

  private interpretCluster(cluster: AgentCluster): string {
    // Analyze cluster members to determine function
    const capabilities = this.analyzeClusterCapabilities(cluster);
    return this.synthesizeInterpretation(capabilities);
  }
}
```

---

## 4. Stigmergic Coordination Examples

### 4.1 Resource Discovery via Waggle Dance

```typescript
class ResourceDiscovery {
  private stigmergy: Stigmergy;
  private discoveries: Map<string, WaggleDance> = new Map();

  async broadcastDiscovery(
    agentId: string,
    resource: Resource
  ): Promise<WaggleDance> {
    const dance: WaggleDance = {
      agentId,
      discoveredResource: resource.id,
      quality: resource.value,
      distance: resource.distance,
      direction: resource.direction,
      timestamp: Date.now(),
    };

    this.discoveries.set(dance.agentId + ':' + dance.discoveredResource, dance);

    // Deposit pheromone at resource location
    this.stigmergy.deposit(
      agentId,
      PheromoneType.RESOURCE,
      {
        topic: resource.type,
        coordinates: resource.position,
      },
      resource.value
    );

    return dance;
  }

  async followDiscovery(
    agentId: string,
    needs: AgentNeeds
  ): Promise<Resource | null> {
    // Evaluate all available discoveries
    const candidates: Array<{ dance: WaggleDance; score: number }> = [];

    for (const dance of this.discoveries.values()) {
      const score = this.evaluateDiscovery(dance, needs);

      if (score > needs.threshold) {
        candidates.push({ dance, score });
      }
    }

    // Follow best discovery
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];

      // Follow pheromone trail
      const trail = this.stigmergy.detect(
        { topic: best.dance.discoveredResource },
        [PheromoneType.RESOURCE]
      );

      if (trail.strongest) {
        this.stigmergy.follow(trail.strongest.id, agentId);
        return await this.navigateToResource(agentId, best.dance);
      }
    }

    return null;
  }

  private evaluateDiscovery(dance: WaggleDance, needs: AgentNeeds): number {
    // Quality decays with distance
    const distanceDecay = Math.exp(-dance.distance / needs.searchRadius);

    // Age decay
    const age = Date.now() - dance.timestamp;
    const ageDecay = Math.exp(-age / needs.maxAge);

    return dance.quality * distanceDecay * ageDecay;
  }
}
```

### 4.2 Collaborative Problem Solving

```typescript
class CollaborativeSolver {
  private colony: Colony;
  private a2a: A2APackageSystem;
  private stigmergy: Stigmergy;

  async solve(task: Task): Promise<Solution> {
    // 1. Broadcast task needs
    await this.broadcastTaskNeeds(task);

    // 2. Collect proposals
    const proposals = await this.collectProposals(task);

    // 3. Form team
    const team = await this.formTeam(proposals, task);

    // 4. Execute collaboration
    const solution = await this.executeCollaboration(team, task);

    // 5. Reinforce successful pathways
    await this.reinforcePathway(team, solution);

    return solution;
  }

  private async broadcastTaskNeeds(task: Task): Promise<void> {
    const capabilities = this.analyzeRequiredCapabilities(task);

    // Deposit pheromones for each needed capability
    for (const capability of capabilities) {
      this.stigmergy.deposit(
        'task-broadcaster',
        PheromoneType.RECRUIT,
        { topic: capability },
        task.urgency
      );
    }
  }

  private async collectProposals(task: Task): Promise<Proposal[]> {
    const proposals: Proposal[] = [];

    // Agents respond via A2A packages
    const responses = await this.a2a.getHistory('task-broadcaster');

    for (const response of responses) {
      if (response.type === 'proposal') {
        proposals.push(response.payload as Proposal);
      }
    }

    return proposals;
  }

  private async formTeam(
    proposals: Proposal[],
    task: Task
  ): Promise<Team> {
    // Select diverse team
    const selected = this.selectDiverseTeam(proposals, task);

    // Form contract
    const contract = {
      id: uuid(),
      participants: selected.map(p => p.agentId),
      objective: task.id,
      roles: this.allocateRoles(selected),
      rewards: this.computeRewards(selected),
    };

    // Notify participants
    for (const member of selected) {
      await this.a2a.createPackage(
        'coordinator',
        member.agentId,
        'contract-offer',
        contract
      );
    }

    return { contract, members: selected };
  }

  private async executeCollaboration(
    team: Team,
    task: Task
  ): Promise<Solution> {
    const results: Map<string, unknown> = new Map();

    // Sequential execution based on dependencies
    const executionOrder = this.topologicalSort(team.members);

    for (const agent of executionOrder) {
      // Get input from predecessors
      const input = this.collectInputs(agent, team, results);

      // Process
      const pkg = await this.a2a.createPackage(
        'coordinator',
        agent.agentId,
        'task-subtask',
        input
      );

      // Execute (simplified)
      const result = await agent.process(pkg);

      // Store result
      results.set(agent.agentId, result.payload);
    }

    // Synthesize final solution
    return this.synthesizeSolution(results);
  }
}
```

---

## 5. Advanced Patterns

### 5.1 Recursive Self-Improvement

```typescript
class SelfImprovingSystem {
  private colony: Colony;
  private evolution: GraphEvolution;
  private valueNetwork: ValueNetwork;

  async improve(): Promise<ImprovementResult> {
    // 1. Analyze current performance
    const currentStats = await this.analyzePerformance();

    // 2. Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(currentStats);

    // 3. Propose improvements
    const improvements = await this.proposeImprovements(bottlenecks);

    // 4. Test improvements
    const results = await this.testImprovements(improvements);

    // 5. Adopt successful improvements
    for (const result of results) {
      if (result.success) {
        await this.adoptImprovement(result.improvement);
      }
    }

    // 6. Update graph structure
    await this.evolution.evolve();

    return {
      improvementsAdopted: results.filter(r => r.success).length,
      performanceGain: this.computePerformanceGain(currentStats),
    };
  }

  private async proposeImprovements(
    bottlenecks: Bottleneck[]
  ): Promise<Improvement[]> {
    const improvements: Improvement[] = [];

    for (const bottleneck of bottlenecks) {
      switch (bottleneck.type) {
        case 'slow-agent':
          improvements.push({
            type: 'optimize-agent',
            agentId: bottleneck.agentId,
            strategy: 'increase-capacity',
          });
          break;

        case 'weak-connection':
          improvements.push({
            type: 'strengthen-synapse',
            source: bottleneck.source,
            target: bottleneck.target,
            strategy: 'increase-weight',
          });
          break;

        case 'missing-capability':
          improvements.push({
            type: 'add-agent',
            capability: bottleneck.capability,
            strategy: 'spawn-specialist',
          });
          break;

        case 'inefficient-pathway':
          improvements.push({
            type: 'prune-pathway',
            pathway: bottleneck.pathway,
            strategy: 'remove-unused-connections',
          });
          break;
      }
    }

    return improvements;
  }
}
```

### 5.2 Cross-Colony Knowledge Transfer

```typescript
class ColonyFederation {
  private colonies: Map<string, Colony> = new Map();
  private federation: FederatedLearningCoordinator;

  async shareKnowledge(
    sourceColonyId: string,
    pattern: PollenGrain
  ): Promise<void> {
    // 1. Validate pattern
    const validated = await this.validatePattern(pattern);

    // 2. Apply differential privacy
    const privatePattern = await this.applyPrivacy(validated);

    // 3. Broadcast to federation
    await this.federation.broadcastPattern({
      sourceColony: sourceColonyId,
      pattern: privatePattern,
      timestamp: Date.now(),
    });
  }

  async receiveKnowledge(
    targetColonyId: string,
    pattern: PollenGrain
  ): Promise<void> {
    // 1. Check compatibility
    if (!await this.isCompatible(targetColonyId, pattern)) {
      return;
    }

    // 2. Adapt pattern to local context
    const adapted = await this.adaptPattern(targetColonyId, pattern);

    // 3. Integrate into local colony
    const colony = this.colonies.get(targetColonyId);
    if (colony) {
      await this.integratePattern(colony, adapted);
    }

    // 4. Reinforce successful integration
    await this.reinforceIntegration(targetColonyId, adapted);
  }

  private async adaptPattern(
    colonyId: string,
    pattern: PollenGrain
  ): Promise<PollenGrain> {
    // Adapt pattern to local colony's context
    const colony = this.colonies.get(colonyId);
    const localContext = await this.getColonyContext(colony);

    // Fine-tune pattern using local data
    const adapted = await this.fineTune(pattern, localContext);

    return adapted;
  }
}
```

---

## 6. Monitoring and Debugging

### 6.1 System Health Dashboard

```typescript
class SystemMonitor {
  private colony: Colony;
  private a2a: A2APackageSystem;
  private evolution: GraphEvolution;

  async getHealthReport(): Promise<HealthReport> {
    const [stats, networkStats, flowStats] = await Promise.all([
      this.colony.getStats(),
      this.getNetworkStats(),
      this.getFlowStats(),
    ]);

    return {
      overall: this.computeOverallHealth(stats),
      agents: {
        total: stats.totalAgents,
        active: stats.activeAgents,
        diversity: stats.shannonDiversity,
      },
      network: {
        connectivity: networkStats.avgDegree,
        clustering: networkStats.clusteringCoeff,
        modularity: networkStats.modularity,
      },
      flow: {
        throughput: flowStats.throughput,
        latency: flowStats.avgLatency,
        pressure: flowStats.systemPressure,
      },
      emergence: {
        score: await this.computeEmergenceScore(),
        newAbilities: await this.detectNewAbilities(),
      },
    };
  }

  private async getNetworkStats(): Promise<NetworkStats> {
    const evolutionStats = this.evolution.getStats();

    return {
      avgDegree: evolutionStats.avgDegree,
      clusteringCoeff: evolutionStats.clusteringCoeff,
      modularity: evolutionStats.modularity,
      totalEdges: evolutionStats.totalEdges,
    };
  }

  private async getFlowStats(): Promise<FlowStats> {
    const a2aStats = this.a2a.getStats();
    const recentPackages = this.a2a.getHistory('system', 100);

    const latencies = recentPackages.map(p =>
      this.computeLatency(p)
    );

    return {
      throughput: a2aStats.totalPackages / 60, // per minute
      avgLatency: this.mean(latencies),
      systemPressure: await this.computeSystemPressure(),
    };
  }

  private async computeSystemPressure(): Promise<number> {
    // Pressure = demand / capacity
    const stats = await this.colony.getStats();
    const demand = stats.activeAgents;
    const capacity = stats.totalAgents;

    return demand / capacity;
  }
}
```

### 6.2 Causal Chain Replay

```typescript
class Debugger {
  private a2a: A2APackageSystem;

  async replayChain(chainId: string): Promise<ReplayResult> {
    // Get full causal chain
    const chain = await this.a2a.replayChain(chainId);

    // Replay each step
    const replayed: Array<{ step: number; package: A2APackage; state: unknown }> = [];

    for (let i = 0; i < chain.length; i++) {
      const pkg = chain[i];

      // Capture state at this step
      const state = await this.captureState(pkg);

      replayed.push({
        step: i,
        package: pkg,
        state,
      });
    }

    // Analyze what went wrong (if anything)
    const analysis = await this.analyzeReplay(replayed);

    return {
      chain: replayed,
      analysis,
      recommendations: this.generateRecommendations(analysis),
    };
  }

  private async captureState(pkg: A2APackage): Promise<unknown> {
    // Capture state of sender and receiver
    const senderState = await this.getAgentState(pkg.senderId);
    const receiverState = await this.getAgentState(pkg.receiverId);

    return {
      sender: senderState,
      receiver: receiverState,
      timestamp: pkg.timestamp,
      causalChainId: pkg.causalChainId,
    };
  }

  private async analyzeReplay(
    replay: Array<{ step: number; package: A2APackage; state: unknown }>
  ): Promise<Analysis> {
    const issues: Issue[] = [];

    // Check for latency spikes
    for (let i = 1; i < replay.length; i++) {
      const latency = replay[i].package.timestamp - replay[i - 1].package.timestamp;

      if (latency > 1000) { // 1 second threshold
        issues.push({
          type: 'latency-spike',
          step: i,
          severity: 'warning',
          details: `Latency: ${latency}ms`,
        });
      }
    }

    // Check for error packages
    for (const step of replay) {
      if (step.package.type === 'error') {
        issues.push({
          type: 'error',
          step: step.step,
          severity: 'critical',
          details: step.package.payload,
        });
      }
    }

    // Check for safety violations
    for (const step of replay) {
      if (step.package.layer === SubsumptionLayer.SAFETY) {
        issues.push({
          type: 'safety-intervention',
          step: step.step,
          severity: 'critical',
          details: 'Safety layer intervened',
        });
      }
    }

    return { issues };
  }

  private generateRecommendations(analysis: Analysis): string[] {
    const recommendations: string[] = [];

    for (const issue of analysis.issues) {
      switch (issue.type) {
        case 'latency-spike':
          recommendations.push('Consider adding parallel pathways');
          recommendations.push('Check for resource bottlenecks');
          break;

        case 'error':
          recommendations.push('Review error handling in agent');
          recommendations.push('Consider adding fallback agents');
          break;

        case 'safety-intervention':
          recommendations.push('Review safety constraints');
          recommendations.push('Check for adversarial inputs');
          break;
      }
    }

    return recommendations;
  }
}
```

---

## 7. Testing and Validation

### 7.1 Unit Testing Emergence

```typescript
describe('Emergence Detection', () => {
  let detector: EmergenceDetector;
  let colony: Colony;

  beforeEach(async () => {
    detector = new EmergenceDetector();
    colony = new Colony({
      id: 'test-colony',
      gardenerId: 'test-user',
      name: 'Test Colony',
      maxAgents: 10,
      resourceBudget: {
        totalCompute: 100,
        totalMemory: 1000,
        totalNetwork: 100,
      },
    });

    await colony.initialize();
  });

  test('should detect novel pathway formation', async () => {
    // Create agents with distinct capabilities
    const agent1 = await createAgent('syntax-validator');
    const agent2 = await createAgent('security-scanner');
    const agent3 = await createAgent('performance-analyzer');

    // Register agents
    colony.registerAgent(agent1.config);
    colony.registerAgent(agent2.config);
    colony.registerAgent(agent3.config);

    // Execute task that creates new pathway
    const task = {
      type: 'code-review',
      code: 'function test() { return 42; }',
    };

    const result = await colony.process(task);

    // Check for emergence
    const emergentBehaviors = await detector.detectEmergentBehaviors({
      start: Date.now() - 1000,
      end: Date.now(),
    });

    expect(emergentBehaviors.length).toBeGreaterThan(0);
    expect(emergentBehaviors[0].type).toBe('novel-pathway');
  });

  test('should detect cross-domain collaboration', async () => {
    // Create agents from different domains
    const bioAgent = await createAgent('biology-researcher');
    const csAgent = await createAgent('cs-researcher');

    colony.registerAgent(bioAgent.config);
    colony.registerAgent(csAgent.config);

    // Execute interdisciplinary task
    const task = {
      type: 'research',
      query: 'connections between neural networks and brain structure',
    };

    await colony.process(task);

    // Check for cross-domain emergence
    const emergent = await detector.detectCrossDomainCollaboration();

    expect(emergent.length).toBeGreaterThan(0);
  });
});
```

### 7.2 Integration Testing

```typescript
describe('Hydraulic System Integration', () => {
  let system: HydraulicSystem;

  beforeEach(async () => {
    system = new HydraulicSystem({
      agentCount: 20,
      agentComplexity: '10M',
    });

    await system.initialize();
  });

  test('should maintain flow under load', async () => {
    // Submit many tasks simultaneously
    const tasks = Array.from({ length: 100 }, (_, i) => ({
      id: `task-${i}`,
      type: 'processing',
      payload: `data-${i}`,
    }));

    const startTime = Date.now();
    const results = await Promise.all(
      tasks.map(task => system.process(task))
    );
    const duration = Date.now() - startTime;

    // Check throughput
    expect(results.length).toBe(100);
    expect(duration).toBeLessThan(10000); // 10 seconds

    // Check for errors
    const errors = results.filter(r => r.status === 'error');
    expect(errors.length).toBe(0);
  });

  test('should adapt to changing conditions', async () => {
    // Measure baseline performance
    const baseline = await measurePerformance(system);

    // Change conditions (e.g., add new agents)
    await system.addAgents({
      type: 'specialist',
      count: 5,
    });

    // Measure adapted performance
    const adapted = await measurePerformance(system);

    // Should improve or maintain performance
    expect(adapted.throughput).toBeGreaterThanOrEqual(baseline.throughput);
    expect(adapted.latency).toBeLessThanOrEqual(baseline.latency);
  });

  test('should exhibit emergent behavior', async () => {
    // Run diverse tasks
    const tasks = [
      { type: 'research', domain: 'biology' },
      { type: 'research', domain: 'computer-science' },
      { type: 'code-review', language: 'typescript' },
      { type: 'optimization', target: 'performance' },
    ];

    for (const task of tasks) {
      await system.process(task);
    }

    // Check for emergence
    const emergent = await system.detectEmergence();

    expect(emergent.length).toBeGreaterThan(0);
  });
});
```

---

## 8. Deployment Patterns

### 8.1 Distributed Deployment

```typescript
class DistributedHydraulicSystem {
  private nodes: Map<string, ColonyNode> = new Map();
  private federation: FederatedLearningCoordinator;

  async deploy(config: DeploymentConfig): Promise<void> {
    // 1. Create colonies on each node
    for (const nodeConfig of config.nodes) {
      const node = new ColonyNode({
        ...nodeConfig,
        federation: this.federation,
      });

      await node.initialize();
      this.nodes.set(nodeConfig.id, node);
    }

    // 2. Connect colonies via federation
    await this.federation.connect(
      Array.from(this.nodes.keys())
    );

    // 3. Start distributed coordination
    await this.startDistributedCoordination();
  }

  async executeTask(task: Task): Promise<Result> {
    // 1. Find best colony for task
    const colonyId = await this.selectColony(task);

    // 2. Execute on selected colony
    const colony = this.nodes.get(colonyId);
    const result = await colony.process(task);

    // 3. Share learning with federation
    await this.shareLearning(colonyId, task, result);

    return result;
  }

  private async selectColony(task: Task): Promise<string> {
    // Select based on capability, load, and locality
    const candidates = Array.from(this.nodes.values());

    const scored = candidates.map(colony => ({
      id: colony.id,
      score: this.scoreColony(colony, task),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored[0].id;
  }

  private scoreColony(colony: ColonyNode, task: Task): number {
    // Consider multiple factors
    const capabilityMatch = this.computeCapabilityMatch(colony, task);
    const loadFactor = 1 - (colony.getLoad() / colony.getCapacity());
    const localityBonus = this.isLocal(colony) ? 0.1 : 0;

    return capabilityMatch * loadFactor + localityBonus;
  }
}
```

### 8.2 Edge Deployment

```typescript
class EdgeHydraulicSystem {
  private localColony: Colony;
  private cloudSync: CloudSync;

  constructor(config: EdgeConfig) {
    // Create lightweight colony for edge device
    this.localColony = new Colony({
      id: config.deviceId,
      maxAgents: 10,
      resourceBudget: {
        totalCompute: 100,
        totalMemory: 1000,
        totalNetwork: 100,
      },
    });

    // Setup cloud sync for heavy tasks
    this.cloudSync = new CloudSync({
      endpoint: config.cloudEndpoint,
      syncStrategy: 'lazy',
    });
  }

  async process(task: Task): Promise<Result> {
    // Try local processing first
    if (await this.canProcessLocally(task)) {
      return await this.localColony.process(task);
    }

    // Offload to cloud
    return await this.cloudSync.process(task);
  }

  private async canProcessLocally(task: Task): Promise<boolean> {
    // Check if we have the required capabilities
    const capabilities = this.localColony.getCapabilities();
    const required = this.analyzeRequirements(task);

    return required.every(req => capabilities.has(req));
  }

  async syncWithCloud(): Promise<void> {
    // Sync learned patterns
    const patterns = await this.localColony.extractPatterns();

    await this.cloudSync.uploadPatterns(patterns);

    // Download improved patterns
    const cloudPatterns = await this.cloudSync.downloadPatterns();

    await this.localColony.integratePatterns(cloudPatterns);
  }
}
```

---

## Best Practices

### 1. Agent Design

- **Single Responsibility**: Each agent should have one clear expertise
- **Stateless Processing**: Agents should be stateless where possible
- **Error Handling**: Always return A2A packages, even on error
- **Learning**: All agents should participate in learning

### 2. System Design

- **Redundancy**: Maintain multiple variants of each capability
- **Observability**: Log all A2A packages for debugging
- **Safety**: Always use safety layers for critical decisions
- **Evolution**: Allow system structure to evolve over time

### 3. Deployment

- **Start Simple**: Begin with few agents, add complexity as needed
- **Monitor Continuously**: Watch for emergence and degradation
- **Test Thoroughly**: Validate emergence, not just correctness
- **Iterate**: Use feedback to improve agent design

---

**Document Version**: 1.0
**Last Updated**: 2026-03-07
**Status**: Ready for Use
