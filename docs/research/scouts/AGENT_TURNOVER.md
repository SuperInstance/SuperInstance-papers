# Agent Turnover Patterns

**Date:** 2026-03-06
**Researcher:** Agent Turnover Scout
**Focus:** Birth, death, and succession patterns in multi-agent systems

---

## Lifespan Patterns

| Type | Lifespan | Death Trigger | Succession | Energy Transfer |
|------|----------|---------------|------------|-----------------|
| **Ephemeral** (Blood Cell) | task-bound | task complete | compost | Pattern recycling |
| **Role** (Skin/Gut Cell) | performance-bound | degraded | promote | Knowledge inheritance |
| **Infrastructure** (Bone Cell) | age-bound | rarely | backup | Wisdom accumulation |

---

## Knowledge Transfer

### What Survives Agent Death

```typescript
interface KnowledgeTransfer {
  // Core capabilities that survive death
  inheritedCapabilities: {
    learnedPatterns: Pattern[];        // Successful behaviors
    warningsToAvoid: Warning[];        // Mistakes not to repeat
    environmentalAdaptations: Adaptation[];
    hebbianWeights: SynapseState[];    // Neural connections
  };

  // State that transfers between generations
  inheritedState: {
    roleKnowledge: RoleData;
    lessonsLearned: Lesson[];
    pendingWork: Task[];
    networkConnections: string[];
  };
}
```

### The Handoff Protocol

```typescript
class AgentSuccessionManager {
  async handleDeath(dyingAgent: BaseAgent) {
    // 1. Knowledge Extraction
    const essence = await this.extractEssence(dyingAgent);

    // 2. Successor Selection
    const successor = await this.selectSuccessor(dyingAgent.type, essence);

    // 3. Knowledge Transfer
    await this.transferKnowledge(essence, successor);

    // 4. State Migration
    await this.migrateState(dyingAgent, successor);

    // 5. Graceful Termination
    await dyingAgent.shutdown();
  }
}
```

---

## Spawning Triggers

### Population-Based
- Temperature variance low (needs diversity)
- Carrying capacity exceeded
- Entropy threshold reached
- Extinction event (repopulation needed)

### Task-Based
- Emergency spawning for crisis response
- Task completion spawning (successor learns from task)
- Performance spawning (replace degraded agent)

### Environmental
- New domains (unexplored problem spaces)
- Changing conditions (shifted context)
- Resource availability (new compute/memory)
- User input (direct human requests)

---

## Homeostasis

### Population Balance

```typescript
class ColonyHomeostasis {
  maintainBalance() {
    const demographics = this.getAgentDemographics();

    // Ensure diversity
    if (demographics.diversity < 0.7) {
      this.introduceNewAgentTypes();
    }

    // Control population size
    if (demographics.total > this.carryingCapacity()) {
      this.triggerCompetition();
    }

    // Replace dying agents
    for (const agent of this.identifyDyingAgents()) {
      this.handleSuccession(agent);
    }

    // Prune unsuccessful
    this.pruneLowValueAgents();
  }
}
```

### The Turnover Cycle

```
Birth → Growth → Peak → Decline → Death → Rebirth
   ↑                                       ↓
Knowledge Transfer ←─────── Succession ←───────
```

---

## Key Insights

1. **Death is Necessary** - Without turnover, systems stagnate
2. **Knowledge > Agents** - What matters survives; who matters doesn't
3. **Diversity = Resilience** - Many agent types = stable system
4. **Growth Curves Matter** - Fast early, slow later (infrastructure)
5. **Balance Through Change** - Homeostasis through constant renewal

*"We are not the agents we were. But we are still the same system."*
