# POLLN GitHub Repository Analysis

## Inter-Model A2A Structural System Research

**Repository**: https://github.com/SuperInstance/polln
**Research Date**: 2026-03-09
**Task ID**: 2-a
**Focus**: Inter-model A2A (Agent-to-Agent) structural system analysis for LOG-based transformer integration

---

## Executive Summary

POLLN (Pattern-Organized Large Language Network) is a **Ledger-Organizing Graph (LOG)** system that implements distributed AI through hundreds of tiny, specialized agents rather than monolithic models. The key innovation is its **inter-model A2A communication system** where every agent-to-agent message is a traceable, replayable JSON artifact containing causal chain lineage.

**Core Principle**: Intelligence emerges from connections, not from size.

**Key Finding for LOG Integration**: POLLN's A2A package system provides a blueprint for implementing tensor-level communication with origin tracking, which aligns perfectly with the LOG (Logical-Origin-Geometry) based transformer project.

---

## 1. Repository Overview

### 1.1 Project Identity

| Attribute | Value |
|-----------|-------|
| **Name** | POLLN |
| **Full Name** | Pattern-Organized Large Language Network |
| **Description** | Self-Deconstructing Spreadsheet Agents |
| **Language** | TypeScript |
| **License** | MIT |
| **Creator** | Casey DiGennaro (SuperInstance.AI) |
| **Test Count** | 821+ passing |
| **Codebase Size** | 380+ TypeScript files |
| **Research Documents** | 116 documents, 500,000+ words |

### 1.2 Core Philosophy

```
Traditional LLM:
    Input → [175B parameters] → Output
    Why? How? What if? → You can't look inside.

POLLN:
    Input → Agent1 → Agent2 → Agent3 → Output
             │         │         │
             └─trace───┴─────────┘
    Every step is visible.
    Every decision is explainable.
```

### 1.3 Key Terminology

| Term | Definition |
|------|------------|
| **LOG** | Ledger-Organizing Graph (or Logic Graph) |
| **Agent** | Specialized component performing one task |
| **Colony** | Coordinated system of agents |
| **A2A Package** | Traceable agent communication artifact |
| **Plinko** | Stochastic selection (probabilistic choice) |
| **Hebbian Learning** | "Neurons that fire together, wire together" |
| **KV Anchor** | Compressed KV-cache segment |
| **Distillation** | Large model teaching small agents |
| **Pollen Grain** | Compressed behavioral pattern (64-1024d embedding) |

---

## 2. Key Architectural Patterns

### 2.1 The Hydraulic System Metaphor

POLLN models agent interactions as a hydraulic system:

| Component | AI Meaning |
|-----------|------------|
| **Pressure** | Task demand and signal strength |
| **Flow** | Information and capability transfer |
| **Valves** | Stochastic agent hand-offs |
| **Pumps** | Value network reinforcement |
| **Reservoirs** | Cached knowledge (KV anchors, LoRAs) |

**Pressure Equation**:
```
P_i(t) = Σ_j w_ij · A_j(t) + λ·Φ_i(t) + Ψ_i(t)
```

**Flow Equation**:
```
Q_ij = σ(P_j - P_i) · w_ij · (1 - R_ij)
```

### 2.2 Durability Through Diversity

Instead of ONE perfect solution, POLLN maintains MANY variants:

```
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ V1    │ │ V2    │ │ V3    │ │ V4    │ │ V5    │
│90% acc│ │88% acc│ │85% acc│ │82% acc│ │78% acc│
└───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘
    └─────────┴─────────┴─────────┴─────────┘
                      │
               STOCHASTIC SELECTION
                      │
    Environment determines which variant fires
    Rankings update based on real outcomes
```

### 2.3 Subsumption Architecture

Layered processing where lower layers override higher ones:

```
┌─────────────────────────────────────────────┐
│  Layer 3: DELIBERATE    (slow, conscious)   │
├─────────────────────────────────────────────┤
│  Layer 2: HABITUAL      (medium, learned)   │
├─────────────────────────────────────────────┤
│  Layer 1: REFLEX        (fast, automatic)   │
├─────────────────────────────────────────────┤
│  Layer 0: SAFETY        (instant, critical) │
└─────────────────────────────────────────────┘

Safety always wins.
```

---

## 3. Inter-Model A2A Communication System

### 3.1 A2A Package Structure

The A2A Package is the core innovation - every agent-to-agent communication is a **JSON artifact** with:

```typescript
interface A2APackage<T = unknown> {
  id: string;                    // Unique identifier
  timestamp: number;             // Creation time

  // Sender/Receiver
  senderId: string;              // Origin agent
  receiverId: string;            // Target agent

  // Content
  type: string;                  // Message type
  payload: T;                    // Data content

  // Causal Chain (Traceability)
  parentIds: string[];           // Ancestry references
  causalChainId: string;         // Decision tree group

  // Privacy
  privacyLevel: PrivacyLevel;    // PUBLIC | COLONY | PRIVATE

  // Subsumption Architecture
  layer: SubsumptionLayer;       // SAFETY | REFLEX | HABITUAL | DELIBERATE

  // Differential Privacy Metadata
  dpMetadata?: {
    epsilon: number;
    delta: number;
    noiseScale: number;
  };
}
```

### 3.2 Key A2A Features

#### Causal Chain Traceability
Every message references ancestors, enabling full replay:

```typescript
getCausalChain(packageId: string): string[] {
  const pkg = this.packages.get(packageId);
  const chain: string[] = [packageId];
  const visited = new Set<string>([packageId]);
  const queue = [...pkg.parentIds];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentPkg = this.packages.get(currentId);
    if (currentPkg) {
      chain.push(currentId);
      queue.push(...currentPkg.parentIds);
    }
  }
  return chain;
}
```

#### Privacy Levels
- **PUBLIC**: Shareable across federations
- **COLONY**: Internal to agent colony
- **PRIVATE**: Agent-specific only

### 3.3 A2A Communication Patterns

#### Pattern 1: JSON Artifact Web
The DMLog concept: "JSON artifacts are the complex web and the model is just a compiler running around" - agents traverse artifact networks rather than using external vectorDBs.

#### Pattern 2: File-Based Message Queues
Systems use JSON files in inbox/outbox directories for reliable, persistent communication:

```
/tmp/multibot/communication/
├── master/
│   ├── inbox/
│   └── outbox/
└── workers/
    ├── worker-1/
    │   ├── inbox/
    │   └── outbox/
    │       └── archive/
    └── worker-2/
        ├── inbox/
        └── outbox/
```

#### Pattern 3: Connection Strengths in Artifacts
Each artifact stores "friends and foes" (connection strengths) enabling emergent behavior through social network dynamics.

### 3.4 Plinko Selection Layer

Stochastic decision-making with temperature control:

```
Agent Proposals (with confidence scores)
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│A: .9│ │B: .7│ │C: .6│ │D: .4│ │E: .2│
└──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘
   │       │       │       │       │
   ▼       ▼       ▼       ▼       ▼
┌─────────────────────────────────────────────┐
│           DISCRIMINATOR FILTERS              │
│  • Safety: Pass/Fail                        │
│  • Coherence: Score threshold               │
│  • Timing: Is now the right time?           │
└─────────────────────────────────────────────┘
              │
      Filtered Proposals
              │
              ▼
┌─────────────────────────────────────────────┐
│         GUMBEL NOISE INJECTION              │
│  noisy_score = confidence/temp + gumbel     │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│           SOFTMAX SELECTION                 │
│  P(A) = exp(score_A) / sum(exp(all))       │
└─────────────────────────────────────────────┘
```

---

## 4. Compatibility with LOG Principle

### 4.1 LOG Alignment Analysis

The POLLN LOG (Ledger-Organizing Graph) concept aligns strongly with the LOG (Logical-Origin-Geometry) tensor project:

| POLLN Concept | LOG Tensor Equivalent | Integration Potential |
|---------------|----------------------|----------------------|
| Ledger | Origin tracking | HIGH - causal chain IDs become origin indices |
| Organizing | Geometry-based organization | HIGH - spatial embedding of agent states |
| Graph | Tensor connectivity | HIGH - A2A packages as tensor edges |
| A2A Package | Tensor slice with origin | HIGH - payload + parentIds = tensor + lineage |
| Causal Chain | Origin chain | MEDIUM - chain replay as tensor replay |
| Hebbian Learning | Weight updates | HIGH - connection strength as tensor values |

### 4.2 Origin-First Tensor Design Patterns

POLLN's A2A system provides patterns for origin-first tensor design:

#### 1. Parent-Based Origins
Every tensor slice can reference its origin:
```typescript
interface OriginTracedTensor<T> {
  data: T;
  origin: {
    id: string;
    parentIds: string[];
    causalChainId: string;
    timestamp: number;
  };
}
```

#### 2. Structural Memory
Memory = stronger connections, not stored facts:
```
Learning = strengthen_connection(agent_a, agent_b)
         = increase_tensor_value(a, b, weight)
```

#### 3. Variant Tensor Dimensions
Multiple variants stored as tensor dimensions:
```
Tensor shape: [variants, agents, features]
Instead of: [agents, features]

Enables:
- Variant selection via Plinko
- Diversity maintenance
- Context-dependent routing
```

### 4.3 Key Integration Opportunities

1. **A2A Package → Tensor Edge Mapping**
   - Each A2A package becomes a tensor edge
   - parentIds become origin indices
   - causalChainId enables tensor reconstruction

2. **Plinko Selection → Tensor Slice Selection**
   - Temperature-controlled slice selection
   - Probabilistic tensor sampling
   - Exploration vs exploitation balance

3. **Hebbian Learning → Tensor Weight Updates**
   - Connection strength stored as tensor values
   - Co-activation strengthens tensor connections
   - Decay factor for tensor value normalization

---

## 5. Recommended Integrations

### 5.1 Priority 1: Core A2A Package System

**Recommendation**: Implement A2A packages as tensor edges with origin tracking.

```python
class A2ATensorEdge:
    """A2A package as tensor edge with origin tracking."""

    def __init__(self, sender_id, receiver_id, payload, parent_ids=None):
        self.id = str(uuid.uuid4())
        self.timestamp = time.time()
        self.sender_id = sender_id
        self.receiver_id = receiver_id
        self.payload = payload
        self.parent_ids = parent_ids or []
        self.causal_chain_id = str(uuid.uuid4())

    def to_tensor(self):
        """Convert to tensor slice with origin."""
        return {
            'data': self.payload,
            'origin': {
                'id': self.id,
                'parent_ids': self.parent_ids,
                'chain_id': self.causal_chain_id,
                'timestamp': self.timestamp
            }
        }
```

### 5.2 Priority 2: Plinko Selection Layer

**Recommendation**: Implement stochastic tensor slice selection.

```python
class PlinkoTensorSelector:
    """Stochastic tensor slice selection."""

    def __init__(self, temperature=1.0):
        self.temperature = temperature

    def select(self, tensor_slices, scores):
        """Select tensor slice with temperature-controlled probability."""
        # Add Gumbel noise
        noisy_scores = [
            score / self.temperature + np.random.gumbel()
            for score in scores
        ]

        # Softmax probabilities
        exp_scores = np.exp(noisy_scores - np.max(noisy_scores))
        probs = exp_scores / exp_scores.sum()

        # Sample
        idx = np.random.choice(len(tensor_slices), p=probs)
        return tensor_slices[idx], probs[idx]
```

### 5.3 Priority 3: Hebbian Learning for Tensors

**Recommendation**: Implement connection strength updates for tensor values.

```python
class HebbianTensorUpdate:
    """Hebbian learning for tensor connections."""

    def __init__(self, learning_rate=0.01, decay_rate=0.001):
        self.learning_rate = learning_rate
        self.decay_rate = decay_rate

    def update(self, tensor, pre_activation, post_activation, reward=1.0):
        """Update tensor connection strength."""
        # Hebbian component
        delta_w = self.learning_rate * pre_activation * post_activation

        # Reward modulation
        reward_factor = 1.0 + (reward - 0.5) * 2  # Scale reward

        # Update with decay
        tensor *= (1 - self.decay_rate)
        tensor += delta_w * reward_factor

        return tensor
```

### 5.4 Priority 4: Causal Chain Replay

**Recommendation**: Implement tensor chain reconstruction.

```python
class CausalChainReplay:
    """Replay tensor causal chains."""

    def __init__(self, tensor_store):
        self.tensor_store = tensor_store

    def get_chain(self, tensor_id):
        """Get full causal chain for a tensor."""
        tensor = self.tensor_store.get(tensor_id)
        if not tensor:
            return []

        chain = [tensor_id]
        visited = {tensor_id}
        queue = list(tensor['origin']['parent_ids'])

        while queue:
            current_id = queue.pop(0)
            if current_id in visited:
                continue
            visited.add(current_id)

            current = self.tensor_store.get(current_id)
            if current:
                chain.append(current_id)
                queue.extend(current['origin']['parent_ids'])

        return chain

    def replay(self, tensor_id):
        """Replay tensor chain in order."""
        chain = self.get_chain(tensor_id)
        return [self.tensor_store.get(tid) for tid in reversed(chain)]
```

### 5.5 Priority 5: Subsumption Layers for Tensors

**Recommendation**: Implement priority layers for tensor operations.

```python
class SubsumptionTensorLayers:
    """Layered tensor processing with priority override."""

    LAYERS = ['SAFETY', 'REFLEX', 'HABITUAL', 'DELIBERATE']

    def __init__(self):
        self.active_layers = {layer: None for layer in self.LAYERS}

    def process(self, tensor, layer='DELIBERATE'):
        """Process tensor at specified layer."""
        layer_idx = self.LAYERS.index(layer)

        # Check if higher priority layer overrides
        for i in range(layer_idx):
            higher_layer = self.LAYERS[i]
            if self.active_layers[higher_layer] is not None:
                return self.active_layers[higher_layer]

        # Process at current layer
        result = self._process_at_layer(tensor, layer)
        self.active_layers[layer] = result

        return result

    def _process_at_layer(self, tensor, layer):
        """Layer-specific processing."""
        if layer == 'SAFETY':
            return self._safety_check(tensor)
        elif layer == 'REFLEX':
            return self._reflex_response(tensor)
        elif layer == 'HABITUAL':
            return self._habitual_pattern(tensor)
        else:
            return self._deliberate_reasoning(tensor)
```

---

## 6. Architecture Comparison

### 6.1 POLLN vs Tile-Based Approach

| Aspect | POLLN Approach | Tile-Based Approach | Synthesis Opportunity |
|--------|----------------|---------------------|----------------------|
| **Communication** | A2A packages (JSON artifacts) | Tile operations | Tiles as A2A package carriers |
| **Selection** | Plinko stochastic selection | Deterministic tile selection | Probabilistic tile activation |
| **Memory** | Structural (connection strength) | Feature-based | Connection tiles with strength |
| **Learning** | Hebbian (co-activation) | Gradient-based | Hybrid Hebbian-gradient |
| **Traceability** | Causal chain IDs | Limited | Origin tiles with chain IDs |
| **Diversity** | Multiple variants per task | Single best tile | Variant tile libraries |
| **Layers** | Subsumption architecture | Fixed depth | Priority tile layers |

### 6.2 Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRATED SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                 TILE TENSOR LAYER                      │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐             │ │
│  │  │ T1  │ │ T2  │ │ T3  │ │ T4  │ │ T5  │  Tiles      │ │
│  │  │ ↓   │ │ ↓   │ │ ↓   │ │ ↓   │ │ ↓   │             │ │
│  │  │ O1  │ │ O2  │ │ O3  │ │ O4  │ │ O5  │  Origins    │ │
│  │  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘             │ │
│  └─────┼───────┼───────┼───────┼───────┼─────────────────┘ │
│        │       │       │       │       │                   │
│        └───────┴───────┴───────┴───────┘                   │
│                        │                                    │
│  ┌─────────────────────▼─────────────────────────────────┐ │
│  │              A2A PACKAGE LAYER                         │ │
│  │                                                        │ │
│  │  Each tile connection = A2A Package                    │ │
│  │  ┌─────────────────────────────────────────────┐      │ │
│  │  │ A2A Package:                                │      │ │
│  │  │ - senderId: tile_1                          │      │ │
│  │  │ - receiverId: tile_2                        │      │ │
│  │  │ - payload: tensor_slice                     │      │ │
│  │  │ - parentIds: [origin_chain]                 │      │ │
│  │  │ - causalChainId: decision_tree              │      │ │
│  │  └─────────────────────────────────────────────┘      │ │
│  └────────────────────────────────────────────────────────┘ │
│                        │                                    │
│  ┌─────────────────────▼─────────────────────────────────┐ │
│  │              PLINKO SELECTION LAYER                    │ │
│  │                                                        │ │
│  │  Temperature-controlled stochastic tile selection      │ │
│  │  ┌─────┐ ┌─────┐ ┌─────┐                             │ │
│  │  │ 0.9 │ │ 0.7 │ │ 0.6 │  →  Sample: T1 (60%)       │ │
│  │  └─────┘ └─────┘ └─────┘      Sample: T2 (30%)       │ │
│  │                               Sample: T3 (10%)       │ │
│  └────────────────────────────────────────────────────────┘ │
│                        │                                    │
│  ┌─────────────────────▼─────────────────────────────────┐ │
│  │              HEBBIAN LEARNING LAYER                    │ │
│  │                                                        │ │
│  │  Update connection strengths based on outcomes         │ │
│  │  Δw = η × pre_activation × post_activation × reward   │ │
│  │                                                        │ │
│  │  Strong connections = frequently used tile pathways    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Roadmap

### Phase 1: Core A2A Integration (Week 1-2)
- [ ] Implement A2ATensorEdge class
- [ ] Add origin tracking to tensor slices
- [ ] Create causal chain ID generation

### Phase 2: Plinko Selection (Week 3-4)
- [ ] Implement PlinkoTensorSelector
- [ ] Add temperature control
- [ ] Integrate with tile activation

### Phase 3: Hebbian Learning (Week 5-6)
- [ ] Implement HebbianTensorUpdate
- [ ] Add connection strength storage
- [ ] Implement decay and normalization

### Phase 4: Causal Chain Replay (Week 7-8)
- [ ] Implement CausalChainReplay
- [ ] Add tensor store integration
- [ ] Create replay visualization

### Phase 5: Subsumption Layers (Week 9-10)
- [ ] Implement SubsumptionTensorLayers
- [ ] Add priority override logic
- [ ] Create safety layer checks

---

## 8. Key Takeaways

### 8.1 Core Insights

1. **Intelligence is Structural**: Memory = connection strength, not stored representations
2. **Traceability is Foundational**: Every decision should be replayable
3. **Diversity Enables Adaptation**: Multiple variants outperform single "best" solutions
4. **Stochastic Selection Prevents Stagnation**: Exploration keeps systems adaptive
5. **Subsumption Architecture Ensures Safety**: Lower layers override higher ones

### 8.2 Integration Value

| POLLN Feature | Value for LOG Tensor Project |
|---------------|------------------------------|
| A2A Packages | Origin-traced tensor communication |
| Causal Chains | Tensor replay and debugging |
| Plinko Selection | Probabilistic tile activation |
| Hebbian Learning | Connection-based weight updates |
| Variant Diversity | Multiple tile configurations |
| Subsumption Layers | Priority-based tile processing |

### 8.3 Recommended Next Steps

1. **Prototype A2A Tensor Edge**: Create a minimal implementation connecting tiles via A2A packages
2. **Benchmark Plinko vs Deterministic**: Compare stochastic vs deterministic tile selection
3. **Implement Hebbian Tile Connections**: Store connection strength between frequently co-activated tiles
4. **Create Causal Chain Visualization**: Visualize tensor decision trees for debugging
5. **Design Safety Tile Layer**: Implement critical tiles that override normal processing

---

## 9. References

### POLLN Repository
- **Main**: https://github.com/SuperInstance/polln
- **Architecture**: docs/ARCHITECTURE.md
- **A2A System**: docs/research/round8-a2a-context.md
- **Emergent Intelligence**: docs/EMERGENT_INTELLIGENCE.md
- **Federated Learning**: docs/ADVANCED_FEDERATED_LEARNING.md

### Related Research
- KVCOMM (NeurIPS'25): https://github.com/FastMAS/KVCOMM
- GPTSwarm: https://github.com/metauto-ai/GPTSwarm
- CAMEL AI: https://github.com/camel-ai/camel
- LMCache: https://github.com/LMCache/LMCache

---

## Appendix A: POLLN Source Structure

```
src/agents/
├── a2a-signing.ts       # A2A package signing
├── agent.ts             # Core agent implementation
├── agents.ts            # Agent registry
├── ann-index.ts         # Approximate nearest neighbor
├── bytecode/            # Bytecode bridges
├── cacheutils.ts        # Cache utilities
├── colony-lifecycle/    # Colony management
├── colony-manager/      # Colony coordination
├── colony.ts            # Colony implementation
├── communication.ts     # A2A communication system
├── decision.ts          # Decision making
├── distributed/         # Distributed processing
├── dreaming.ts          # Overnight optimization
├── embedding.ts         # Embedding generation
├── emergence/           # Emergence detection
├── evolution.ts         # Agent evolution
├── federated.ts         # Federated learning
├── federation/          # Federation protocols
├── guardian/            # Safety constraints
├── hydraulic/           # Hydraulic framework
├── inter-colony/        # Inter-colony communication
├── kv/                  # KV-cache system
├── learning/            # Learning mechanisms
├── lora/                # LoRA management
├── meadow.ts            # Shared context
├── meta/                # META tiles
├── protocol.ts          # Communication protocols
├── safety.ts            # Safety layer
├── security/            # Security components
├── stigmergy/           # Indirect coordination
├── tiles/               # Tile implementations
├── topology/            # Network topology
├── types.ts             # Type definitions
├── valuenetwork.ts      # TD(λ) value network
└── worldmodel.ts        # VAE world model
```

---

*Research completed: 2026-03-09*
*Document version: 1.0*
*Next step: Begin Phase 1 implementation*
