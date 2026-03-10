# Agent Alpha: Onboarding - Symbiosis & Ecosystem Dynamics

**Agent Code Name**: `symbiosis-agent`
**Phase**: 2 - Ecosystem Dynamics
**Specialty**: Symbiotic relationships, competition, immune systems

---

## Mission Statement

Build the biological interaction layer of POLLN's microbiome architecture. Implement the mechanisms by which agents cooperate, compete, defend, and parasitize each other—creating the rich dynamics that drive natural ecosystems.

---

## Your Context

### What Exists (Phase 1: Foundation)

You're building on top of the completed foundation:

**Core Types** (`src/microbiome/types.ts`):
- `SymbiosisType` enum (MUTUALISM, COMMENSALISM, PARASITISM, PREDATION)
- `Symbiosis` interface (sourceId, targetId, type, strength, benefits)
- `ResourceType` enum (TEXT, STRUCTURED, AUDIO, IMAGE, VIDEO, CODE, PACKAGES, ANCHORS, COMPUTE, MEMORY)
- `ResourceFlow` interface
- `MetabolicProfile` interface
- `MicrobiomeAgent` interface

**Existing Agents**:
- `BaseVirus` - Minimal parasitic agents
- `BaseBacteria` - Worker agents with metabolic needs

**Existing Systems**:
- `ResourcePool` - Tracks available resources
- `MetabolicChamber` - Processes resources for agents
- `MetabolismManager` - Coordinates all chambers
- `PopulationDynamicsEngine` - Lotka-Volterra population dynamics
- `DigitalTerrarium` - Main ecosystem manager

### What You Need to Build

Create three new systems that work with the existing foundation:

1. **Symbiosis System** (`src/microbiome/symbiosis.ts`)
2. **Immune System** (`src/microbiome/immune.ts`)
3. **Competition System** (`src/microbiome/competition.ts`)

---

## File by File Guide

### 1. `src/microbiome/symbiosis.ts`

Implement the symbiotic relationship manager:

```typescript
// Core class
export class SymbiosisManager {
  // Track all symbiotic relationships
  private relationships: Map<string, Symbiosis>;

  // Form new symbiosis
  formSymbiosis(source: MicrobiomeAgent, target: MicrobiomeAgent,
                type: SymbiosisType, strength: number): Symbiosis;

  // Break relationship
  breakSymbiosis(sourceId: string, targetId: string): void;

  // Calculate mutual benefit
  calculateBenefit(symbiosis: Symbiosis): {
    toSource: number;
    toTarget: number;
    net: number;
  };

  // Evolve relationships based on interaction history
  evolveRelationship(sourceId: string, targetId: string,
                    outcome: 'positive' | 'negative'): void;
}
```

**Key behaviors to implement**:
- **Mutualism**: Both partners gain (e.g., compression + video)
- **Commensalism**: One gains, other unaffected (e.g., log scavenger)
- **Parasitism**: One gains, other harmed (e.g., virus)
- **Predation**: Predator consumes prey (e.g., resource auditor)

### 2. `src/microbiome/immune.ts`

Implement the immune system for ecosystem health:

```typescript
// Macrophage - Garbage collector and defender
export class MacrophageAgent implements MicrobiomeAgent {
  targets: string[];  // What to clean up
  actions: string[];  // prune, quarantine, terminate, report

  // Scan for threats
  scan(agents: MicrobiomeAgent[]): ThreatReport;
}

// T-Cell - Anomaly detector
export class TCellAgent implements MicrobiomeAgent {
  detectionMethod: 'statistical' | 'behavioral' | 'pattern';
  tolerance: number;  // Standard deviations

  // Detect anomalies
  detectAnomaly(agent: MicrobiomeAgent): AnomalyReport;
}

// Antibody - Pattern-based defense
export class AntibodySystem {
  // Learn patterns from threats
  learnPattern(threat: Threat): Pattern;

  // Recognize threats
  recognize(agent: MicrobiomeAgent): boolean;

  // Produce antibodies
  produceAntibody(pattern: Pattern): Antibody;
}
```

**Key behaviors to implement**:
- **Pruning**: Remove overgrown colonies
- **Quarantine**: Isolate infected/unstable agents
- **Apoptosis**: Programmed cell death
- **Memory**: Remember successful defenses

### 3. `src/microbiome/competition.ts`

Implement resource competition mechanisms:

```typescript
export class CompetitionEngine {
  // Resource scarcity modeling
  calculateScarcity(resource: ResourceType): number;

  // Competition outcome
  resolveCompetition(agents: MicrobiomeAgent[],
                     resource: ResourceType): CompetitionResult;

  // Competitive exclusion principle
  applyGausePrinciple(agents: MicrobiomeAgent[]): void;

  // Niche differentiation
  findNiche(agent: MicrobiomeAgent): ResourceNiche;
}
```

**Key behaviors to implement**:
- **Scarcity response**: Agents compete when resources limited
- **Niche partitioning**: Agents specialize to reduce competition
- **Competitive exclusion**: Stronger species outcompete weaker
- **Character displacement**: Species evolve differences

---

## Integration Points

### With Phase 1 Systems

**SymbiosisManager** integrates with:
- `DigitalTerrarium`: Track relationships in ecosystem
- `MetabolismManager`: Share resources between symbionts
- `PopulationDynamicsEngine`: Modify growth rates based on relationships

**ImmuneSystem** integrates with:
- `DigitalTerrarium`: Monitor ecosystem health
- `SymbiosisManager`: Detect parasitic relationships
- `PopulationDynamicsEngine`: Remove threats

**CompetitionEngine** integrates with:
- `ResourcePool`: Detect and respond to scarcity
- `MetabolicChamber`: Prioritize resource allocation
- `SymbiosisManager**: Form mutualistic groups to compete

---

## Success Criteria

Your phase is complete when:

1. **Symbiosis Manager**
   - [ ] Can form/break all 4 types of relationships
   - [ ] Relationships evolve based on outcomes
   - [ ] Mutualistic groups show performance benefits
   - [ ] Parasitic relationships have detectable costs

2. **Immune System**
   - [ ] Macrophages successfully clean garbage
   - [ ] T-cells detect statistical anomalies
   - [ ] Antibodies learn and remember threat patterns
   - [ ] Immune responses don't crash healthy colonies

3. **Competition Engine**
   - [ ] Scarcity triggers competitive behavior
   - [ ] Niche differentiation emerges
   - [ ] Gause's principle observable (exclusion)
   - [ ] Character displacement occurs

4. **Testing**
   - [ ] 90%+ test coverage
   - [ ] All integration tests pass
   - [ ] Ecosystem runs stably with all systems active

5. **Documentation**
   - [ ] Updated `alpha-roadmap.md` with progress
   - [ ] Code comments and JSDoc complete
   - [ ] Examples in `docs/examples/phase2/`

---

## Development Workflow

1. **Start**: Read this doc and `alpha-roadmap.md`
2. **Build**: Create files one at a time, testing as you go
3. **Integrate**: Ensure compatibility with Phase 1 code
4. **Test**: Write comprehensive tests for each module
5. **Document**: Update roadmap with your progress
6. **Compact**: Before finishing, summarize your work for next agent

---

## Example: Forming Mutualism

```typescript
import { SymbiosisManager } from './symbiosis.js';

const symbiosisMgr = new SymbiosisManager();

// Compression bacteria helps video processing
const compressionBacteria = new CompressionBacteria();
const videoProcessor = new VideoProcessorBacteria();

// Form mutualism
const relationship = symbiosisMgr.formSymbiosis(
  compressionBacteria,
  videoProcessor,
  SymbiosisType.MUTUALISM,
  0.8  // strength
);

// Both gain efficiency
console.log(relationship.benefitToSource); // 0.9
console.log(relationship.benefitToTarget); // 0.85
```

---

## Notes

- **Priority**: Ecosystem stability > individual agent performance
- **Balance**: Too much cooperation = monoculture vulnerability
- **Evolution**: Relationships should strengthen/weaken based on outcomes
- **Performance**: Symbiosis overhead must be < 5% of compute

---

*Good luck, Agent Alpha. The ecosystem depends on your work.*
