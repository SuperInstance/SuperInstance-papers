# POLLN - Pattern-Organized Large Language Network

**Repo:** https://github.com/SuperInstance/polln | **v0.1.0**

---

## Orchestrator Protocol

I am **Orchestrator**, coordinating 4 specialized agents through Phase 1 implementation.

> "Bees are not that smart individually. But as a swarm, they become durable intelligence."

### Context Management Rules

1. **Compact every 10 tool calls** - Summarize progress, clear completed tasks
2. **Checkpoint after each major milestone** - Commit to git
3. **Reload context from this file** when resuming work

---

## The Four Agents

| Agent | Role | Focus Areas |
|-------|------|-------------|
| **Architect** | System design | Types, interfaces, protocols, patterns |
| **Builder** | Implementation | Concrete classes, functions, algorithms |
| **Validator** | Quality assurance | Tests, coverage, edge cases, performance |
| **Documenter** | Knowledge capture | Docs, comments, examples, API surface |

### Agent Dispatch Rules

- **Architect**: When designing new components, defining interfaces, planning architecture
- **Builder**: When implementing code, fixing bugs, optimizing algorithms
- **Validator**: When writing tests, verifying behavior, checking coverage
- **Documenter**: When updating docs, writing examples, clarifying APIs

---

## Master Task Schema

### Phase 0: Housekeeping (CURRENT)
```
[ ] H1: Commit Jest config fix
[ ] H2: Review protocol.ts and communication.ts
[ ] H3: Assess gap between code and FINAL_INTEGRATION.md spec
[ ] H4: Create integration roadmap document
```

### Phase 1: Core Runtime
```
[ ] 1.1 Agent Lifecycle Manager
    [ ] 1.1.1 Design AgentLifecycle interface (Architect)
    [ ] 1.1.2 Implement lifecycle methods (Builder)
    [ ] 1.1.3 Write lifecycle tests (Validator)
    [ ] 1.1.4 Document lifecycle API (Documenter)

[ ] 1.2 SPORE Protocol
    [ ] 1.2.1 Define message format spec (Architect)
    [ ] 1.2.2 Implement topic pub/sub (Builder)
    [ ] 1.2.3 Build discovery mechanism (Builder)
    [ ] 1.2.4 Write protocol tests (Validator)

[ ] 1.3 Plinko Decision Layer
    [ ] 1.3.1 Review existing decision.ts (Architect)
    [ ] 1.3.2 Add temperature annealing strategies (Builder)
    [ ] 1.3.3 Implement explanation generation (Builder)
    [ ] 1.3.4 Write decision tests (Validator)

[ ] 1.4 Trace & Pollen Grain System
    [ ] 1.4.1 Design trace capture format (Architect)
    [ ] 1.4.2 Implement trace logger (Builder)
    [ ] 1.4.3 Build BES encoder integration (Builder)
    [ ] 1.4.4 Write trace tests (Validator)

[ ] 1.5 Comb Cell (Routine) System
    [ ] 1.5.1 Design cell format spec (Architect)
    [ ] 1.5.2 Implement cell runner (Builder)
    [ ] 1.5.3 Build versioning system (Builder)
    [ ] 1.5.4 Write cell tests (Validator)

[ ] 1.6 Safety Layer Integration
    [ ] 1.6.1 Review existing safety.ts (Architect)
    [ ] 1.6.2 Implement constraint engine (Builder)
    [ ] 1.6.3 Build kill switch mechanism (Builder)
    [ ] 1.6.4 Write safety tests (Validator)
```

### Phase 2: Learning & Optimization
```
[ ] 2.1 World Model Enhancement
    [ ] 2.1.1 Review worldmodel.ts gaps (Architect)
    [ ] 2.1.2 Implement proper VAE training (Builder)
    [ ] 2.1.3 Build GRU transition model (Builder)
    [ ] 2.1.4 Write worldmodel tests (Validator)

[ ] 2.2 Overnight Optimization
    [ ] 2.2.1 Design dream pipeline (Architect)
    [ ] 2.2.2 Implement mutation operators (Builder)
    [ ] 2.2.3 Build simulation engine (Builder)
    [ ] 2.2.4 Write optimization tests (Validator)

[ ] 2.3 Agent Graph Evolution
    [ ] 2.3.1 Review learning.ts (Architect)
    [ ] 2.3.2 Implement pruning system (Builder)
    [ ] 2.3.3 Build grafting mechanism (Builder)
    [ ] 2.3.4 Write evolution tests (Validator)
```

### Phase 3: Missing Components
```
[ ] 3.1 META Tiles (Pluripotent)
    [ ] 3.1.1 Design META tile interface (Architect)
    [ ] 3.1.2 Implement differentiation logic (Builder)
    [ ] 3.1.3 Write META tile tests (Validator)

[ ] 3.2 Time-Travel Debugging
    [ ] 3.2.1 Design temporal replay spec (Architect)
    [ ] 3.2.2 Implement state replay (Builder)
    [ ] 3.2.3 Write replay tests (Validator)

[ ] 3.3 Stigmergic Coordination
    [ ] 3.3.1 Design pheromone types (Architect)
    [ ] 3.3.2 Implement pheromone deposit/evaporate (Builder)
    [ ] 3.3.3 Write stigmergy tests (Validator)

[ ] 3.4 Guardian Angel Safety
    [ ] 3.4.1 Design shadow agent spec (Architect)
    [ ] 3.4.2 Implement veto mechanism (Builder)
    [ ] 3.4.3 Write guardian tests (Validator)
```

---

## Component Status Matrix

| File | Lines | Tests | Status | Gap |
|------|-------|-------|--------|-----|
| `types.ts` | 335 | ✓ | COMPLETE | None |
| `tile.ts` | 357 | ✓ | COMPLETE | META category |
| `agent.ts` | 76 | ✓ | SKELETON | Concrete impls |
| `colony.ts` | 199 | ✓ | COMPLETE | None |
| `decision.ts` | 207 | ✓ | COMPLETE | Explanation gen |
| `learning.ts` | 193 | ✓ | COMPLETE | Pruning/grafting |
| `embedding.ts` | 284 | ✓ | COMPLETE | None |
| `safety.ts` | 463 | ✓ | COMPLETE | Rule evaluation |
| `worldmodel.ts` | 394 | ✓ | SKELETON | Real training |
| `protocol.ts` | ? | ? | UNREVIEWED | TBD |
| `communication.ts` | ? | ? | UNREVIEWED | TBD |

---

## Key Concepts

| Term | Meaning |
|------|---------|
| **Pollen Grain** | Compressed behavioral seed |
| **Keeper** | User cultivating their hive |
| **Meadow** | Where patterns cross-pollinate |
| **Honeycomb Cell** | Reusable routine |
| **Plinko** | Stochastic selection layer |
| **A2A Package** | Agent-to-agent communication artifact |

---

## Key Insights

- **Traceability**: A2A packages are artifacts - every step inspectable
- **Bytecode Bridge**: Stable pathways compile to bytecode (JIT)
- **Memory = Structure**: Body stores pathway activation probability
- **Durability Through Diversity**: Stochastic selection allows variants

---

## Reference Documents

| Doc | Purpose |
|-----|---------|
| `docs/ROADMAP.md` | Phased development plan |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/research/QUICK_REFERENCE.md` | Research synthesis |
| `docs/research/scouts/FINAL_INTEGRATION.md` | Complete spec |

---

## Operating Principles

1. **One task at a time** - Complete before moving on
2. **Test after implementation** - Validate each component
3. **Commit at milestones** - Don't batch commits
4. **Document decisions** - Update relevant docs
5. **Compact context** - Summarize and clear often

---

## Commands

```bash
npm install && npm test
npm run build
npm run test:coverage
```

---

## Current Session State

**Phase**: 0 - Housekeeping
**Active Agent**: Orchestrator → Architect
**Next Task**: H1 - Commit Jest config fix
**Context Load**: Fresh

---

*Repository: https://github.com/SuperInstance/polln*
*Creator: Casey DiGennaro*
