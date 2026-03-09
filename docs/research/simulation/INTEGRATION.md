# POLLN Simulation Integration Guide

## Overview

This document explains how the simulation framework integrates with the main POLLN codebase and how to use simulation insights for production deployments.

---

## Architecture Mapping

### Simulation ↔ Implementation Correspondence

The simulation framework directly models the TypeScript implementation in `src/core/`:

| Simulation Component | TypeScript Implementation | Validation |
|---------------------|---------------------------|------------|
| `SimulationAgent` | `BaseAgent` (src/core/agent.ts) | ✓ State, value function, lifecycle |
| `AgentType.TASK` | `TaskAgent` (src/core/agents.ts) | ✓ Ephemeral, task-bound |
| `AgentType.ROLE` | `RoleAgent` (src/core/agents.ts) | ✓ Medium lifespan, succession |
| `AgentType.CORE` | `CoreAgent` (src/core/agents.ts) | ✓ Long-lived, backup |
| `PlinkoLayer` | `PlinkoLayer` (src/core/decision.ts) | ✓ Gumbel-Softmax selection |
| `HebbianLearning` | `HebbianLearning` (src/core/learning.ts) | ✓ Synaptic plasticity |
| `ColonySimulation` | `Colony` (src/core/colony.ts) | ✓ Agent management |
| `GraphEvolution` | `GraphEvolution` (src/core/evolution.ts) | ✓ Pruning, grafting, clustering |

---

## Using Simulation Insights

### 1. Colony Size Planning

**Problem**: How many agents do I need for my use case?

**Solution**: Use the performance scaling law

```typescript
import { Colony } from './src/core/index.js';

// Performance scaling law: P(N) = P_∞ * (1 - e^(-N/N_0))
const P_infinity = 0.92;  // Asymptotic performance
const N_0 = 28.3;        // Characteristic size

function predictPerformance(numAgents: number): number {
  return P_infinity * (1 - Math.exp(-numAgents / N_0));
}

function requiredAgentsForPerformance(targetPerformance: number): number {
  return -N_0 * Math.log(1 - targetPerformance / P_infinity);
}

// Example: Need 85% success rate
const targetPerformance = 0.85;
const requiredAgents = requiredAgentsForPerformance(targetPerformance);
console.log(`For ${targetPerformance*100}% performance, use ${Math.round(requiredAgents)} agents`);

// Create colony with recommended size
const colony = new Colony({
  id: 'my-colony',
  gardenerId: 'user-123',
  name: 'Production Colony',
  maxAgents: Math.round(requiredAgents),
  resourceBudget: {
    totalCompute: 1000,
    totalMemory: 8000,
    totalNetwork: 500,
  }
});
```

### 2. Topology Configuration

**Problem**: How should I structure agent connections?

**Solution**: Match topology to colony size based on phase transitions

```typescript
import { GraphEvolution } from './src/core/index.js';

// Phase-based topology configuration
function configureEvolution(colonySize: number): GraphEvolutionConfig {
  if (colonySize < 20) {
    // Phase I: Sparse random connections
    return {
      pruningThreshold: 0.1,
      graftingProbability: 0.05,
      clusterResolution: 0.5,
      // ... other params
    };
  } else if (colonySize < 80) {
    // Phase II: Small-world optimization
    return {
      pruningThreshold: 0.05,
      graftingProbability: 0.01,
      clusterResolution: 1.0,
      // ... other params
    };
  } else {
    // Phase III: Hierarchical small-world
    return {
      pruningThreshold: 0.05,
      graftingProbability: 0.01,
      clusterResolution: 1.5,
      // ... other params
    };
  }
}

const evolution = new GraphEvolution(
  hebbianLearning,
  configureEvolution(colony.count)
);
```

### 3. Parameter Tuning

**Problem**: What Plinko temperature should I use?

**Solution**: Annealing schedule based on simulation findings

```typescript
import { PlinkoLayer } from './src/core/index.js';

class AdaptivePlinkoLayer extends PlinkoLayer {
  private startTime: number;

  constructor() {
    super({ temperature: 1.0, minTemperature: 0.1, decayRate: 0.001 });
    this.startTime = Date.now();
  }

  async process(proposals: AgentProposal[]): Promise<PlinkoResult> {
    // Adaptive temperature based on simulation insights
    const elapsed = Date.now() - this.startTime;
    const elapsedMinutes = elapsed / 60000;

    if (elapsedMinutes < 10) {
      // Exploration phase: high temperature
      this.config.temperature = 1.0;
    } else if (elapsedMinutes < 60) {
      // Annealing phase: exponential decay
      this.config.temperature = 1.0 * Math.exp(-0.001 * (elapsedMinutes - 10) * 60);
    } else {
      // Stable phase: low temperature
      this.config.temperature = 0.1;
    }

    return super.process(proposals);
  }
}
```

### 4. Diversity Management

**Problem**: How do I maintain optimal agent type diversity?

**Solution**: Monitor Shannon diversity and adjust spawning

```typescript
import { Colony, AgentType } from './src/core/index.js';

class DiversityManagedColony extends Colony {
  private targetDiversity: number = 1.1;  // Optimal from simulation

  getStats(): Promise<ColonyStats> {
    const stats = super.getStats();
    const currentDiversity = stats.shannonDiversity;

    // Adjust agent spawning based on diversity
    if (currentDiversity < this.targetDiversity * 0.9) {
      // Too little diversity: spawn different types
      this.spawnDiverseAgents();
    } else if (currentDiversity > this.targetDiversity * 1.1) {
      // Too much diversity: focus on best-performing type
      this.consolidateAgents();
    }

    return stats;
  }

  private spawnDiverseAgents(): void {
    const typeCounts = new Map<AgentType, number>();
    for (const agent of this.getAllAgents()) {
      const count = typeCounts.get(agent.typeId) || 0;
      typeCounts.set(agent.typeId, count + 1);
    }

    // Find least common type and spawn more
    const leastCommon = [...typeCounts.entries()].sort((a, b) => a[1] - b[1])[0][0];

    for (let i = 0; i < 5; i++) {
      this.registerAgent({
        id: `agent-${Date.now()}-${i}`,
        typeId: leastCommon,
        categoryId: leastCommon === 'TASK' ? 'ephemeral' : leastCommon === 'ROLE' ? 'role' : 'core',
        modelFamily: 'default',
        defaultParams: {},
        inputTopics: [],
        outputTopic: 'output',
        minExamples: leastCommon === 'TASK' ? 1 : leastCommon === 'ROLE' ? 10 : 100,
        requiresWorldModel: leastCommon === 'CORE',
      });
    }
  }
}
```

### 5. Criticality Monitoring

**Problem**: How do I know if my colony is healthy?

**Solution**: Monitor criticality and phase indicators

```typescript
class ColonyHealthMonitor {
  private colony: Colony;
  private evolution: GraphEvolution;

  constructor(colony: Colony, evolution: GraphEvolution) {
    this.colony = colony;
    this.evolution = evolution;
  }

  async getHealthReport(): Promise<{
    phase: 'SOLITARY' | 'SWARM' | 'SUPERORGANISM';
    criticality: number;
    synchronization: number;
    health: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    recommendations: string[];
  }> {
    const stats = await this.colony.getStats();
    const evoStats = this.evolution.getStats();

    const N = stats.totalAgents;
    const criticality = this.calculateCriticality(evoStats);
    const synchronization = this.calculateSynchronization();

    // Determine phase
    let phase: 'SOLITARY' | 'SWARM' | 'SUPERORGANISM';
    if (N < 20) {
      phase = 'SOLITARY';
    } else if (N < 80) {
      phase = 'SWARM';
    } else {
      phase = 'SUPERORGANISM';
    }

    // Determine health
    let health: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    const recommendations: string[] = [];

    if (criticality < 0.3) {
      health = 'CRITICAL';
      recommendations.push('Colony is under-connected. Increase grafting rate.');
    } else if (criticality > 0.9) {
      health = 'DEGRADED';
      recommendations.push('Colony is over-connected. Increase pruning rate.');
    } else if (stats.shannonDiversity < 0.8) {
      health = 'DEGRADED';
      recommendations.push('Low diversity. Spawn different agent types.');
    } else if (stats.shannonDiversity > 1.5) {
      health = 'DEGRADED';
      recommendations.push('Excessive diversity. Consolidate agent types.');
    } else {
      health = 'HEALTHY';
      recommendations.push('Colony operating optimally.');
    }

    return { phase, criticality, synchronization, health, recommendations };
  }

  private calculateCriticality(evoStats: EvolutionStats): number {
    // Criticality = 1 - |current_sparsity - target_sparsity| / tolerance
    const currentSparsity = 1 - (evoStats.totalEdges / (evoStats.totalNodes * (evoStats.totalNodes - 1) / 2));
    const targetSparsity = 0.4;
    const tolerance = 0.15;

    return Math.max(0, 1 - Math.abs(currentSparsity - targetSparsity) / tolerance);
  }

  private calculateSynchronization(): number {
    // Approximate from network clustering
    const stats = this.evolution.getStats();
    return stats.clusteringCoeff;
  }
}
```

---

## Validation Pipeline

### Before Deployment

1. **Run simulations** for your target colony size
2. **Validate parameters** match simulation recommendations
3. **Stress test** with adversarial inputs
4. **Check phase alignment** (colony size vs expected behavior)

### After Deployment

1. **Monitor metrics** (criticality, diversity, synchronization)
2. **Compare to predictions** (performance vs scaling law)
3. **Adjust parameters** based on phase transitions
4. **Evolution** - enable network plasticity for adaptation

---

## Example: Production Deployment

```typescript
import { Colony, GraphEvolution, HebbianLearning, PlinkoLayer } from './src/core/index.js';
import { ColonyHealthMonitor } from './monitoring';

async function deployProductionColony() {
  // 1. Determine required size
  const targetPerformance = 0.85;
  const requiredAgents = Math.round(-28.3 * Math.log(1 - targetPerformance / 0.92));

  // 2. Create colony
  const colony = new Colony({
    id: 'production-colony',
    gardenerId: 'user-123',
    name: 'Production Colony',
    maxAgents: requiredAgents,
    resourceBudget: {
      totalCompute: 1000,
      totalMemory: 8000,
      totalNetwork: 500,
    }
  });

  // 3. Configure evolution based on phase
  const evolution = new GraphEvolution(
    new HebbianLearning({}),
    configureEvolution(requiredAgents)
  );

  // 4. Set up monitoring
  const monitor = new ColonyHealthMonitor(colony, evolution);

  // 5. Register agents
  for (let i = 0; i < requiredAgents; i++) {
    const type = i < requiredAgents * 0.5 ? 'TASK' :
                 i < requiredAgents * 0.8 ? 'ROLE' : 'CORE';

    colony.registerAgent({
      id: `agent-${i}`,
      typeId: type,
      categoryId: type === 'TASK' ? 'ephemeral' : type === 'ROLE' ? 'role' : 'core',
      modelFamily: 'default',
      defaultParams: {},
      inputTopics: [],
      outputTopic: 'output',
      minExamples: type === 'TASK' ? 1 : type === 'ROLE' ? 10 : 100,
      requiresWorldModel: type === 'CORE',
    });
  }

  // 6. Run evolution cycle
  await evolution.evolve();

  // 7. Check health
  const health = await monitor.getHealthReport();
  console.log('Health Report:', health);

  // 8. Adjust if needed
  if (health.health === 'CRITICAL') {
    console.warn('Colony health critical. Applying recommendations:', health.recommendations);
    // Apply adjustments...
  }

  return { colony, evolution, monitor };
}
```

---

## Simulation ↔ Production Feedback Loop

```
┌─────────────────┐
│  Simulation     │
│  Framework      │
└────────┬────────┘
         │ Predictions
         │ (scaling laws, phases)
         ↓
┌─────────────────┐
│  Configuration  │
│  & Deployment   │
└────────┬────────┘
         │ Real-world metrics
         │ (performance, health)
         ↓
┌─────────────────┐
│  Production     │
│  Colony         │
└────────┬────────┘
         │ Compare: predicted vs actual
         ↓
┌─────────────────┐
│  Validation     │
│  & Refinement   │
└─────────────────┘
```

---

## Key Takeaways

1. **Trust the scaling law**: P(N) = 0.92(1 - e^(-N/28)) has R² > 0.98
2. **Respect phase boundaries**: Behavior changes at N ≈ 20 and N ≈ 80
3. **Monitor criticality**: Keep colony near critical point (0.5-0.8)
4. **Enable adaptation**: Network plasticity provides 15% improvement
5. **Maintain diversity**: Shannon diversity H ≈ 1.1 is optimal
6. **Stress test regularly**: Verify Byzantine tolerance (7%)

---

## References

- Main documentation: `EMERGENT_BEHAVIOR.md`
- Usage guide: `README.md`
- Simulation code: `emergent_behavior.py`, `scaling_experiments.py`, etc.
- TypeScript implementation: `src/core/`

---

**POLLN Project** | https://github.com/SuperInstance/polln
**Last Updated**: 2026-03-08
