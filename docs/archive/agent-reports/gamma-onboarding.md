# Agent Gamma: Onboarding - Colony Formation & Murmuration

**Agent Code Name**: `colony-agent`
**Phase**: 4 - Colony Formation
**Specialty**: Biofilms, murmuration, memory formation

---

## Mission Statement

Implement colony formation and optimization mechanisms—where agents self-organize into efficient biofilms that exhibit murmuration (emergent coordination) and develop persistent memory from successful patterns.

---

## Your Context

### What Exists (Phase 1: Foundation)

**Core Types** (`src/microbiome/types.ts`):
- `ColonyStructure` interface (id, members, communicationChannels, formationTime, stability, coEvolutionBonus)
- `DigitalTerrarium.graft()` - Basic colony creation

### What Phase 2 Adds

Before you start, Phase 2 will have completed:
- `SymbiosisManager` - Colonies form based on symbiotic relationships
- `CompetitionEngine` - Colonies compete for resources
- Agents with established interdependencies

### What Phase 3 Adds

Before you start, Phase 3 will have completed:
- `EvolutionEngine` - Colony-level selection (group evolution)
- `FitnessEvaluator` - Colony fitness evaluation
- Agents evolved to work well together

### What You Need to Build

Create three new systems:

1. **Colony System** (`src/microbiome/colony.ts`)
2. **Murmuration Engine** (`src/microbiome/murmuration.ts`)
3. **Memory System** (`src/microbiome/colony-memory.ts`)

---

## File by File Guide

### 1. `src/microbiome/colony.ts`

Implement colony lifecycle and management:

```typescript
export class ColonySystem {
  // Colony discovery (find good combinations)
  discoverColonies(agents: MicrobiomeAgent[]): ColonyProposal[];

  // Colony formation
  formColony(members: MicrobiomeAgent[]): Colony;

  // Colony dissolution
  dissolveColony(colonyId: string): void;

  // Colony lifecycle (birth, growth, stability, death)
  updateColony(colony: Colony): ColonyState;

  // Direct A2A communication (bypass overhead)
  establishDirectChannels(colony: Colony): void;

  // Colony specialization
  specialize(colony: Colony, task: Task): Specialization;
}
```

**Key behaviors to implement**:
- **Discovery**: Find agent combinations that work well together
- **Formation**: Create stable colonies from successful combinations
- **Optimization**: Co-evolve members for efficiency
- **Differentiation**: Members specialize for colony function
- **Lifecycle**: Colonies emerge, stabilize, and eventually dissolve

### 2. `src/microbiome/murmuration.ts`

Implement emergent coordination (muscle memory):

```typescript
export class MurmurationEngine {
  // Detect murmuration (emergent coordination)
  detectMurmuration(colony: Colony): MurmurationPattern;

  // Learn murmuration (from repeated interaction)
  learnMurmuration(colony: Colony): MurmurationMemory;

  // Execute murmuration (fast, coordinated action)
  executeMurmuration(colony: Colony, task: Task): TaskResult;

  // Optimization (co-evolution for efficiency)
  optimizeMurmuration(pattern: MurmurationPattern): MurmurationPattern;

  // Muscle memory (automatic execution)
  automatemMurmuration(colony: Colony, pattern: MurmurationPattern): void;
}
```

**Key behaviors to implement**:
- **Pattern detection**: Find emergent coordination patterns
- **Learning**: Repeated patterns become automatic
- **Speed**: Murmuration is 100x faster than ad-hoc coordination
- **Efficiency**: Co-evolved members minimize overhead
- **Automation**: Patterns become "muscle memory"

### 3. `src/microbiome/colony-memory.ts`

Implement memory formation from successful patterns:

```typescript
export class ColonyMemory {
  // Pattern storage
  storePattern(colony: Colony, pattern: Pattern): void;

  // Pattern retrieval
  retrievePattern(colony: Colony, task: Task): Pattern;

  // Memory consolidation (strengthen important patterns)
  consolidate(pattern: Pattern): void;

  // Memory decay (weaken unused patterns)
  decay(pattern: Pattern): void;

  // Transfer memory (to new colonies)
  transferMemory(source: Colony, target: Colony): void;
}
```

**Key behaviors to implement**:
- **Storage**: Save successful patterns as memory
- **Retrieval**: Recall patterns for similar situations
- **Consolidation**: Strengthen frequently-used patterns
- **Decay**: Forget unused patterns
- **Transfer**: Share memory between colonies

---

## Integration Points

### With Phase 1 Systems

**ColonySystem** integrates with:
- `DigitalTerrarium.graft()`: Enhanced colony formation
- `SymbiosisManager`: Colonies form around symbiotic relationships
- `MetabolismManager`: Colonies share resources efficiently

### With Phase 2 Systems

**MurmurationEngine** uses:
- `SymbiosisManager`: Optimize symbiotic communication
- `CompetitionEngine`: Colonies compete as units

### With Phase 3 Systems

**ColonyMemory** works with:
- `EvolutionEngine`: Evolve memorable patterns
- `FitnessEvaluator`: High-fitness patterns become memory

---

## Success Criteria

Your phase is complete when:

1. **Colony System**
   - [ ] Colonies auto-discover from successful interactions
   - [ ] Formation is efficient and stable
   - [ ] Direct communication channels work
   - [ ] Specialization emerges from colony needs

2. **Murmuration Engine**
   - [ ] Murmuration patterns are detected
   - [ ] Repeated patterns become automatic
   - [ ] Murmuration is 100x faster than ad-hoc
   - [ ] Co-evolution optimizes colonies

3. **Memory System**
   - [ ] Successful patterns are stored
   - [ ] Memory retrieval works for similar tasks
   - [ ] Consolidation strengthens important patterns
   - [ ] Memory transfer works between colonies

4. **Testing**
   - [ ] 90%+ test coverage
   - [ ] Integration tests pass
   - [ ] Performance benchmarks met (100x speedup)

5. **Documentation**
   - [ ] Updated `gamma-roadmap.md` with progress
   - [ ] Code comments and JSDoc complete
   - [ ] Examples in `docs/examples/phase4/`

---

## Development Workflow

1. **Start**: Read this doc and `gamma-roadmap.md`
2. **Build**: Create files one at a time, testing as you go
3. **Integrate**: Ensure compatibility with Phase 1-3 code
4. **Test**: Write comprehensive tests for each module
5. **Document**: Update roadmap with your progress
6. **Compact**: Before finishing, summarize your work

---

## Example: Colony Formation

```typescript
import { ColonySystem } from './colony.js';

const colonySystem = new ColonySystem();

// Agents discover they work well together
const agents = [textParser, sentimentAnalyzer, summarizer];

// Form a colony
const colony = colonySystem.formColony(agents);

// Direct communication channels (bypass A2A overhead)
colonySystem.establishDirectChannels(colony);

// Colony is now 100x more efficient
const efficiency = colony.coEvolutionBonus; // 0.9 = 90% bonus
```

---

## Notes

- **Emergence**: Colonies form naturally, not by design
- **Efficiency**: Direct communication is key advantage
- **Memory**: Successful colonies become "frozen" patterns
- **Flexibility**: Colonies can dissolve when no longer useful

---

*Good luck, Agent Gamma. The colony becomes greater than sum of parts through your work.*
