# Agent Epsilon: Onboarding - Phase 6 Integration

**Agent**: `integration-agent` (Integration Specialist)
**Phase**: 6 - Integration & Interoperability
**Timeline**: ~3-5 sessions

---

## Mission Statement

Build the bridge between the POLLN Microbiome and the Core POLLN system, enabling seamless communication, resource sharing, and emergent intelligence across both architectures.

---

## Context: What You're Integrating

### Microbiome Architecture (Phases 1-5)

**Purpose**: Biological, evolutionary agents
**Key Concepts**:
- Digital terrarium with taxonomy-based agents
- Symbiosis, competition, evolution
- Colony formation, murmuration, memory
- Immune system, fitness evaluation
- Performance optimization

**Main Classes**:
- `DigitalTerrarium` - Ecosystem manager
- `MicrobiomeAgent` - Taxonomy-based agent
- `ColonySystem` - Colony management
- `EvolutionEngine` - Evolution orchestration
- `SymbiosisManager` - Relationship manager
- `ImmuneSystem` - Defense coordinator

### Core POLLN Architecture

**Purpose**: Computational, tile-based intelligence
**Key Concepts**:
- Subsumption architecture (SAFETY → REFLEX → HABITUAL → DELIBERATE)
- Tile categories (Task, Role, Core, META)
- A2A packages (traceable communication)
- Plinko stochastic selection
- Hebbian learning
- World models and dreaming
- Value networks (TDλ)

**Main Classes**:
- `BaseAgent` / `TileCategory` - Agent hierarchy
- `PlinkoLayer` - Stochastic selection
- `HebbianLearning` - Connection strengthening
- `WorldModel` - VAE-based dreaming
- `ValueNetwork` - TDλ value prediction
- `Colony` - Agent colony (core system)

---

## Your Implementation Guide

### Milestone 1: Agent Bridge (40%)

**File**: `src/microbiome/bridge.ts`

Create bidirectional bridge:

```typescript
export class MicrobiomeBridge {
  // Convert microbiome agent → core agent
  toCoreAgent(microAgent: MicrobiomeAgent): BaseAgent;

  // Convert core agent → microbiome agent
  toMicrobiomeAgent(coreAgent: BaseAgent): MicrobiomeAgent;

  // Map taxonomy → tile category
  mapTaxonomyToTile(taxonomy: AgentTaxonomy): TileCategory;

  // Map tile category → taxonomy
  mapTileToTaxonomy(tile: TileCategory): AgentTaxonomy;

  // Translate metabolism → tile goal
  translateMetabolism(metabolism: Metabolism): Goal[];

  // Translate goal → metabolism
  translateGoal(goal: Goal): Metabolism;

  // Bridge A2A packages between systems
  bridgeA2A(package: A2APackage): A2APackage;

  // Sync colony membership
  syncColonies(microColony: Colony, coreColony: Colony): void;
}
```

**Mapping Strategy**:

```typescript
// Taxonomy → Tile Category mapping
AgentTaxonomy.BACTERIA_DECOMPOSER → TileCategory.TaskAgent
AgentTaxonomy.BACTERIA_PRODUCER → TileCategory.TaskAgent
AgentTaxomy.BACTERIA_CONSUMER → TileCategory.RoleAgent
AgentTaxonomy.ARCHITECT → TileCategory.CoreAgent
AgentTaxonomy.VIRUS → TileCategory.MetaTile  // Pluripotent
```

**Metabolism Translation**:
- `inputs` → `goal.preconditions`
- `outputs` → `goal.expectedOutcomes`
- `processingRate` → `goal.priority`
- `efficiency` → `goal.rewardFunction`

**Acceptance**:
- Bi-directional conversion working
- A2A packages bridge correctly
- Colony membership syncs
- Tests pass with 90%+ coverage

---

### Milestone 2: Protocol Adapter (35%)

**File**: `src/microbiome/protocol-adapter.ts`

Create communication adapter:

```typescript
export class ProtocolAdapter {
  // Translate SPORE protocol → core protocol
  sporeToCore(spore: SporeMessage): CoreMessage;

  // Translate core protocol → SPORE
  coreToSpore(core: CoreMessage): SporeMessage;

  // Route messages between systems
  routeMessage(
    message: Message,
    from: 'microbiome' | 'core',
    to: 'microbiome' | 'core'
  ): void;

  // Handle message type mismatches
  handleTypeMismatch(type: string): Message | null;

  // Synchronize communication channels
  syncChannels(
    microChannels: Map<string, string[]>,
    coreChannels: Map<string, Set<string>>
  ): void;

  // Translate colony communication
  translateColonyCommunication(
    colony: Colony,
    message: Message
  ): Message[];
}
```

**Message Translation**:

```typescript
// SPORE (Microbiome) → Core (POLLN)
interface SporeMessage {
  type: SporeType;
  payload: unknown;
  sourceId: string;
  targetId?: string;
  timestamp: number;
}

interface CoreMessage {
  type: MessageType;
  payload: any;
  sourceId: string;
  targetId?: string;
  parentIds: string[];
  causalChainId: string;
}
```

**Acceptance**:
- Message translation working bidirectionally
- Routing handles cross-system communication
- Colony communication bridges correctly
- Tests pass with 90%+ coverage

---

### Milestone 3: Resource Sharing (25%)

**File**: `src/microbiome/resource-share.ts`

Create shared resource pool:

```typescript
export class SharedResourcePool {
  // Share KV-cache between systems
  shareKVCache(
    microCache: KVAnchorPool,
    coreCache: KVCache
  ): void;

  // Share embeddings
  shareEmbeddings(
    microEmbeddings: Map<string, number[]>,
    coreEmbeddings: Map<string, PollenGrain>
  ): void;

  // Share world model
  shareWorldModel(
    microWorld: WorldModel,
    coreWorld: WorldModel
  ): void;

  // Share value network
  shareValueNetwork(
    microValue: ValueNetwork,
    coreValue: ValueNetwork
  ): void;

  // Synchronize memories
  syncMemories(
    microMemory: ColonyMemory,
    coreMemory: Map<string, Memory>
  ): void;

  // Federated learning across systems
  federatedLearning(
    microModel: Model,
    coreModel: Model
  ): FederatedResult;
}
```

**Resource Sharing Strategy**:

1. **KV-Cache Sharing**
   - Microbiome stores metabolic patterns as anchors
   - Core stores tile execution patterns
   - Cross-system similarity search
   - Unified anchor pool

2. **Embedding Sharing**
   - Microbiome: Colony state embeddings
   - Core: Pollen grains (behavioral patterns)
   - Shared embedding space
   - Cross-system pattern matching

3. **World Model Sharing**
   - Both systems have VAE-based world models
   - Share latent space representations
   - Joint dreaming/optimization
   - Unified prediction

4. **Value Network Sharing**
   - Microbiome: Fitness-based values
   - Core: TDλ values
   - Multi-objective value fusion
   - Shared reward signals

**Acceptance**:
- KV-cache unified across systems
- Embeddings shareable
- World model joint learning
- Value networks fuse
- Tests pass with 90%+ coverage

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    POLLN Integrated System                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         Bridge         ┌─────────────┐ │
│  │   Microbiome     │ ←─────────────────────→ │    Core     │ │
│  │                  │    Protocol Adapter    │             │ │
│  │  · DigitalTerrar.│                        │  · BaseAgent│ │
│  │  · Symbiosis     │    Resource Sharing    │  · Plinko   │ │
│  │  · Evolution     │ ←─────────────────────→ │  · Hebbian │ │
│  │  · Colonies      │                        │  · World    │ │
│  │  · Murmuration   │                        │  · Value    │ │
│  └──────────────────┘                        └─────────────┘ │
│                                                               │
│              Shared Resource Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ KV-Cache │ Embeddings │ World Model │ Value Network │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests
- Agent conversion (micro↔core)
- Message translation (SPORE↔core)
- Resource sharing (KV, embeddings, etc.)

### Integration Tests
- End-to-end cross-system workflows
- Colony bridging (micro colony ↔ core colony)
- Joint evolution/learning
- Shared dreaming cycles

### Performance Tests
- Bridge overhead (<5%)
- Message translation latency (<1ms)
- Resource sharing throughput

---

## Documentation

Update `docs/agents/epsilon-roadmap.md` with:
- Session progress logs
- Integration patterns discovered
- Performance benchmarks
- Known issues and workarounds

---

## Success Criteria

### Milestone 1
- ✅ Agent bridge working
- ✅ Bi-directional conversion
- ✅ Colony sync working
- ✅ Tests passing

### Milestone 2
- ✅ Protocol adapter complete
- ✅ Message translation working
- ✅ Routing handles cross-system
- ✅ Tests passing

### Milestone 3
- ✅ Resource sharing unified
- ✅ KV-cache shared
- ✅ World model joint
- ✅ Tests passing

### Phase 6 Complete When
- All 3 milestones done
- Cross-system communication working
- Resources shared efficiently
- Integration tests passing
- Documentation complete
- Ready for Phase 7 (Emergence)

---

## Files to Create

1. `src/microbiome/bridge.ts` - Agent conversion bridge
2. `src/microbiome/__tests__/bridge.test.ts` - Tests
3. `src/microbiome/protocol-adapter.ts` - Communication adapter
4. `src/microbiome/__tests__/protocol-adapter.test.ts` - Tests
5. `src/microbiome/resource-share.ts` - Shared resources
6. `src/microbiome/__tests__/resource-share.test.ts` - Tests

---

## Getting Started

1. Read your roadmap: `docs/agents/epsilon-roadmap.md`
2. Review both architectures:
   - Microbiome: `src/microbiome/*.ts`
   - Core: `src/core/*.ts`
3. Identify integration points
4. Start with Milestone 1 (bridge foundation)
5. Update roadmap daily with progress

---

**Welcome to the team, Agent Epsilon. Connect the two worlds.**
