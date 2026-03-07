# POLLN Integration Roadmap

**Generated:** 2026-03-06
**Status:** Phase 0 → Phase 1 Transition

---

## Gap Analysis: Code vs FINAL_INTEGRATION.md Spec

### Fully Implemented ✓

| Component | File | Lines | Notes |
|-----------|------|-------|-------|
| Core Types | `types.ts` | 335 | A2A, Agent, Synapse, Plinko, Embedding, Safety |
| Living Tiles | `tile.ts` | 357 | BaseTile, TilePipeline, TileLifecycleManager |
| Colony Management | `colony.ts` | 199 | Registration, state, activation |
| Plinko Decision | `decision.ts` | 207 | Gumbel-Softmax, discriminators, safety override |
| Hebbian Learning | `learning.ts` | 193 | Oja's rule, eligibility traces, pruning |
| BES Embeddings | `embedding.ts` | 284 | Multi-tier DP, privacy budgets |
| Safety Layer | `safety.ts` | 463 | Constitutional constraints, kill switch, rollback |
| World Model | `worldmodel.ts` | 394 | VAE + GRU + MLP (skeleton) |
| SPORE Protocol | `protocol.ts` | 92 | Pub/sub messaging |
| A2A Communication | `communication.ts` | 203 | Package system with causal chains |

**Total Lines of Code: ~2,500**

---

### Partially Implemented ⚠

| Component | Gap | Priority | Effort |
|-----------|-----|----------|--------|
| **BaseAgent** | Only skeleton, needs concrete impls | HIGH | Medium |
| **World Model** | Simplified training, needs real VAE/GRU | MEDIUM | High |
| **Plinko** | Missing explanation generation | LOW | Low |

---

### Not Implemented (From FINAL_INTEGRATION.md)

| Component | Description | Priority | Phase |
|-----------|-------------|----------|-------|
| **META Tiles** | Pluripotent agents that can differentiate | HIGH | Phase 3 |
| **Tile Succession** | Knowledge transfer on agent death | HIGH | Phase 1 |
| **Environmental Philosophy** | Cradle effects on tile behavior | MEDIUM | Phase 2 |
| **Shannon Diversity** | Population balance metric | MEDIUM | Phase 1 |
| **Guardian Angel** | Shadow agent with veto power | MEDIUM | Phase 3 |
| **Stigmergic Coordination** | Virtual pheromones | LOW | Phase 3 |
| **Knowledge Stages** | Ephemeral → Working → Embedded → Fossil | MEDIUM | Phase 2 |
| **Bytecode Bridge** | JIT compilation of stable pathways | LOW | Phase 4 |
| **Overnight Evolution** | Automated improvement pipeline | MEDIUM | Phase 2 |
| **Time-Travel Debug** | Temporal state replay | LOW | Phase 3 |

---

## Phase 1 Priority: Core Runtime Completion

### Must Have (Blocking)

1. **Concrete Agent Implementations**
   - TaskAgent (ephemeral)
   - RoleAgent (knowledge succession)
   - CoreAgent (long-lived wisdom)

2. **Tile Succession Protocol**
   - Knowledge extraction before death
   - Successor initialization
   - Pattern handoff

3. **Shannon Diversity Index**
   - Population tracking
   - Minimum viable threshold (0.7)
   - Diversity-triggered spawning

### Should Have (Important)

4. **Enhanced World Model Training**
   - Real VAE reconstruction loss
   - KL divergence tracking
   - Proper backpropagation

5. **Explanation Generation**
   - Why was agent selected?
   - What discriminators passed/failed?
   - Human-readable decision rationale

---

## Implementation Order

```
Week 1: Core Agents
├── Day 1-2: TaskAgent implementation
├── Day 3-4: RoleAgent with succession
└── Day 5: CoreAgent with backup

Week 2: Colony Balance
├── Day 1-2: Shannon Diversity tracking
├── Day 3-4: Homeostatic population control
└── Day 5: Diversity-triggered spawning

Week 3: Knowledge Transfer
├── Day 1-2: Knowledge extraction protocol
├── Day 3-4: Successor initialization
└── Day 5: End-to-end succession test

Week 4: Integration
├── Day 1-2: Full agent lifecycle test
├── Day 3-4: Performance benchmarks
└── Day 5: Documentation and examples
```

---

## Success Criteria

### Phase 1 Complete When:

- [ ] All 3 agent types implemented
- [ ] Tile succession working end-to-end
- [ ] Shannon Diversity tracking active
- [ ] All tests passing (>80% coverage)
- [ ] API documented with examples

### Metrics

| Metric | Target |
|--------|--------|
| Test Coverage | >80% |
| Agent Latency | <100ms |
| Decision Time | <10ms |
| Succession Time | <50ms |
| Diversity Index | >0.7 |

---

## Next Session

**Start with:** TaskAgent implementation
**File to create:** `src/core/agents/task-agent.ts`
**Test file:** `src/core/__tests__/agents/task-agent.test.ts`

---

*Orchestrator Note: This roadmap should be updated after each major milestone.*
