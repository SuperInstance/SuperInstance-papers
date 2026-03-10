# Agent Beta: Onboarding - Evolution & Natural Selection

**Agent Code Name**: `evolution-agent`
**Phase**: 3 - Evolution
**Specialty**: Mutation, selection, fitness landscapes

---

## Mission Statement

Implement the evolutionary engine that drives adaptation and improvement in the POLLN microbiome. Create systems where agents evolve through mutation, selection, and fitness-based reproduction—enabling the ecosystem to optimize itself without explicit programming.

---

## Your Context

### What Exists (Phase 1: Foundation)

**Core Types** (`src/microbiome/types.ts`):
- `MutationConfig` interface (mutationRate, mutationTypes, maxMutationImpact)
- `MutationType` enum (GOAL_ADJUSTMENT, METHOD_VARIATION, METABOLIC_SHIFT, SYMBIOSIS_GAIN)
- `FitnessScore` interface (overall, throughput, accuracy, efficiency, cooperation)
- `MicrobiomeAgent` interface with `reproduce()` and `evaluateFitness()` methods

**Existing Evolution Hooks**:
- `BaseVirus.reproduce()` - Basic reproduction with simple mutation
- `BaseBacteria.reproduce()` - Basic reproduction with simple mutation
- `DigitalTerrarium.processEvolution()` - Simple evolutionary step

### What Phase 2 Adds

Before you start, Phase 2 will have completed:
- `SymbiosisManager` - Evolution can optimize symbiotic relationships
- `ImmuneSystem` - Evolution can develop resistance/immunity
- `CompetitionEngine` - Evolution responds to competitive pressure

### What You Need to Build

Create three new systems:

1. **Evolution Engine** (`src/microbiome/evolution.ts`)
2. **Fitness System** (`src/microbiome/fitness.ts`)
3. **Genetic Operations** (`src/microbiome/genetic.ts`)

---

## File by File Guide

### 1. `src/microbiome/evolution.ts`

Implement the main evolution coordinator:

```typescript
export class EvolutionEngine {
  // Population management
  private population: Map<string, MicrobiomeAgent>;
  private generation: number;

  // Evolutionary pressure
  private selectionPressure: number;  // 0-1
  private mutationRate: number;       // 0-1
  private elitism: number;            // Top % to preserve unchanged

  // Run one evolutionary generation
  evolveGeneration(): EvolutionReport;

  // Selection (who gets to reproduce)
  selectParents(population: MicrobiomeAgent[]): MicrobiomeAgent[];

  // Create offspring with mutations
  reproduce(parents: MicrobiomeAgent[]): MicrobiomeAgent[];

  // Survival selection
  selectSurvivors(population: MicrobiomeAgent[]): MicrobiomeAgent[];

  // Track evolutionary progress
  getProgress(): EvolutionMetrics;
}
```

**Key algorithms to implement**:
- **Tournament Selection**: Pick k random, choose best
- **Roulette Wheel**: Fitness-proportional selection
- **Rank Selection**: Based on fitness rank (not raw value)
- **Elitism**: Preserve top performers unchanged
- **Generational vs Steady-state**: Replace all vs replace worst

### 2. `src/microbiome/fitness.ts`

Implement sophisticated fitness evaluation:

```typescript
export class FitnessEvaluator {
  // Multi-objective fitness
  evaluate(agent: MicrobiomeAgent): FitnessScore;

  // Pareto dominance (for multi-objective)
  isDominated(score1: FitnessScore, score2: FitnessScore): boolean;

  // Fitness sharing (prevent premature convergence)
  shareFitness(scores: FitnessScore[]): FitnessScore[];

  // Dynamic fitness (changes over time)
  updateFitnessFunction(environment: EcosystemSnapshot): void;

  // Constraint handling (penalize violations)
  applyConstraints(score: FitnessScore, constraints: Constraint[]): FitnessScore;
}
```

**Key behaviors to implement**:
- **Multi-objective optimization**: Balance competing goals
- **Pareto fronts**: Find non-dominated solutions
- **Fitness sharing**: Maintain diversity
- **Dynamic landscapes**: Fitness changes with environment
- **Constraints**: Penalize rule-breakers

### 3. `src/microbiome/genetic.ts`

Implement advanced genetic operations:

```typescript
export class GeneticOperators {
  // Mutation operations
  pointMutation(agent: MicrobiomeAgent, impact: number): MicrobiomeAgent;
  chromosomalRearrangement(agent: MicrobiomeAgent): MicrobiomeAgent;
  geneDuplication(agent: MicrobiomeAgent): MicrobiomeAgent;
  horizontalTransfer(agent1: MicrobiomeAgent, agent2: MicrobiomeAgent): MicrobiomeAgent;

  // Crossover operations
  singlePointCrossover(parent1: MicrobiomeAgent, parent2: MicrobiomeAgent): MicrobiomeAgent;
  uniformCrossover(parent1: MicrobiomeAgent, parent2: MicrobiomeAgent): MicrobiomeAgent;
  behavioralCrossover(parent1: MicrobiomeAgent, parent2: MicrobiomeAgent): MicrobiomeAgent;

  // Advanced operations
  speciation(agent: MicrobiomeAgent, species: Species): void;
  adaptiveMutation(agent: MicrobiomeAgent, successRate: number): MicrobiomeAgent;
}
```

**Key operations to implement**:
- **Point mutation**: Small parameter changes
- **Structural mutation**: Add/remove connections
- **Gene duplication**: Copy useful traits
- **Horizontal transfer**: Share traits between agents
- **Crossover**: Combine traits from parents
- **Speciation**: Maintain diverse populations

---

## Integration Points

### With Phase 1 Systems

**EvolutionEngine** integrates with:
- `DigitalTerrarium.processEvolution()`: Replace simple evolution
- `MicrobiomeAgent.reproduce()`: Use enhanced genetic operators
- `MicrobiomeAgent.evaluateFitness()`: Use sophisticated fitness evaluator

### With Phase 2 Systems

**FitnessEvaluator** considers:
- `SymbiosisManager`: Reward beneficial relationships
- `ImmuneSystem`: Penalize vulnerability to disease
- `CompetitionEngine`: Reward competitive success

### Preparing for Phase 4

**GeneticOperators** should enable:
- Colony formation (group selection)
- Memory formation (inherit successful patterns)
- Murmuration (evolve communication)

---

## Success Criteria

Your phase is complete when:

1. **Evolution Engine**
   - [ ] Completes generational evolution smoothly
   - [ ] Selection pressure is tunable and effective
   - [ ] Population diversity is maintained
   - [ ] Elitism preserves best solutions

2. **Fitness System**
   - [ ] Multi-objective fitness works correctly
   - [ ] Pareto dominance is calculated properly
   - [ ] Fitness sharing prevents premature convergence
   - [ ] Dynamic fitness adapts to environment

3. **Genetic Operations**
   - [ ] All mutation operators work
   - [ ] Crossover produces viable offspring
   - [ ] Horizontal transfer between agents
   - [ ] Speciation maintains diversity

4. **Testing**
   - [ ] 90%+ test coverage
   - [ ] Evolution converges on test problems
   - [ ] Diversity is maintained (not monoculture)
   - [ ] Integration tests pass

5. **Documentation**
   - [ ] Updated `beta-roadmap.md` with progress
   - [ ] Code comments and JSDoc complete
   - [ ] Examples in `docs/examples/phase3/`

---

## Development Workflow

1. **Start**: Read this doc and `beta-roadmap.md`
2. **Build**: Create files one at a time, testing as you go
3. **Integrate**: Ensure compatibility with Phase 1-2 code
4. **Test**: Write comprehensive tests for each module
5. **Document**: Update roadmap with your progress
6. **Compact**: Before finishing, summarize your work

---

## Example: Evolution Generation

```typescript
import { EvolutionEngine } from './evolution.js';

const evolution = new EvolutionEngine({
  population: initialAgents,
  selectionPressure: 0.7,
  mutationRate: 0.01,
  elitism: 0.1,  // Keep top 10%
});

// Run one generation
const report = evolution.evolveGeneration();

console.log(`Generation ${report.generation}`);
console.log(`Best fitness: ${report.bestFitness}`);
console.log(`Diversity: ${report.diversity}`);
console.log(`New mutations: ${report.mutationCount}`);
```

---

## Notes

- **Diversity**: Maintain population diversity (avoid premature convergence)
- **Constraint**: Evolution must respect ecosystem constraints
- **Performance**: Evolution overhead must be reasonable
- **Observability**: Track evolutionary progress for debugging

---

*Good luck, Agent Beta. The future evolves through your work.*
