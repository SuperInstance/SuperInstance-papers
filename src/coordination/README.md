# Coordination

**Status**: Core Module | **Maturity**: Production-Ready

## What Is This Directory?

 This directory implements **stigmergic coordination** - a way for agents to coordinate indirectly through environmental modifications. Think of it like ants leaving pheromone trails that other ants follow.

## For Future Agents: Key Concept

```
┌────────────────────────────────────────────────────────────────────┐
│                    STIGMERGY EXPLAINED                              │
├────────────────────────────────────────────────────────────────────┤
│   Instead of:                                                       │
│   ┌─────────┐      direct message      ┌─────────┐                 │
│   │ Agent A │ ────────────────────────▶│ Agent B │                 │
│   └─────────┘                           └─────────┘                 │
│                                                                     │
│   We use:                                                           │
│   ┌─────────┐      deposit signal     ┌───────────┐                │
│   │ Agent A │ ─────────────────────▶ │Environment│                │
│   └─────────┘                          └───────────┘                │
│                                              │                      │
│                              sense signal    │                      │
│                                              ▼                      │
│                                         ┌─────────┐                 │
│                                         │ Agent B │                 │
│                                         └─────────┘                 │
│                                                                     │
│   BENEFITS: No central coordinator, emergent behavior, scalable    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## Files In This Directory

| File | Purpose | Key Exports |
|------|---------|-------------|
| `stigmergy.ts` | Core stigmergy implementation | `Stigmergy`, `PheromoneType`, `TrailFollower` |
| `index.ts` | Module exports | Re-exports everything |

## Pheromone Types

Agents can leave different types of "digital pheromones":

| Type | Meaning | Use Case |
|------|---------|----------|
| `PATHWAY` | Good route found | "This approach worked well" |
| `RESOURCE` | Resource location | "Found useful data here" |
| `DANGER` | Hazard warning | "This path leads to errors" |
| `NEST` | Home base | "Central coordination point" |
| `RECRUIT` | Help needed | "Need assistance with this" |

## How It Works

### 1. Deposit a Pheromone

```typescript
import { Stigmergy, PheromoneType } from './coordination';

// Create the stigmergy system
const stigmergy = new Stigmergy({
  maxPheromones: 1000,
  defaultHalfLife: 60000,  // Pheromones decay over time
  detectionRadius: 0.5
});

// Agent deposits a pheromone (signal)
const pheromone = stigmergy.deposit({
  type: PheromoneType.PATHWAY,
  sourceId: 'agent-001',
  position: {
    taskType: 'sentiment-analysis',
    contextHash: 'abc123'
  },
  strength: 0.8,
  metadata: {
    success: true,
    latencyMs: 45
  }
});
```

### 2. Sense Pheromones

```typescript
// Agent senses nearby pheromones
const nearby = stigmergy.sense({
  taskType: 'sentiment-analysis',
  contextHash: 'abc123'
});

// Decide based on signals
if (nearby.some(p => p.type === PheromoneType.DANGER)) {
  // Avoid this path
} else if (nearby.some(p => p.type === PheromoneType.PATHWAY && p.strength > 0.7)) {
  // Follow the strong trail
}
```

### 3. Pheromone Decay

```typescript
// Pheromones evaporate over time (half-life)
// Strong trails persist, weak ones fade
// This allows the system to adapt to changing conditions

// Start automatic evaporation
stigmergy.startEvaporation();

// Stop when done
stigmergy.stopEvaporation();
```

## Key Classes

### Stigmergy

The main coordination system:

```typescript
class Stigmergy extends EventEmitter {
  // Deposit a pheromone
  deposit(params: {
    type: PheromoneType;
    sourceId: string;
    position: Position;
    strength?: number;
    metadata?: Record<string, unknown>;
    halfLife?: number;
  }): Pheromone

  // Sense nearby pheromones
  sense(position: Position, radius?: number): Pheromone[]

  // Follow the strongest trail
  followTrail(position: Position, type: PheromoneType): Pheromone | null

  // Reinforce an existing pheromone
  reinforce(pheromoneId: string, amount?: number): void

  // Evaporation control
  startEvaporation(): void
  stopEvaporation(): void

  // Statistics
  getStats(): StigmergyStats
}
```

### TrailFollower

Helper for following trails:

```typescript
import { TrailFollower, PheromoneType } from './coordination';

const follower = new TrailFollower(stigmergy, {
  preferredType: PheromoneType.PATHWAY,
  avoidanceType: PheromoneType.DANGER
});

// Get recommended direction
const recommendation = follower.recommend(currentPosition);

if (recommendation.shouldProceed) {
  // Follow the trail
  await agent.process(recommendation.targetPosition);
} else {
  // Avoid or explore differently
}
```

## Emergent Behavior

Stigmergy enables **emergent coordination** without centralized control:

```
Time 0: Agent A finds a good path, deposits PATHWAY pheromone
Time 1: Agent B senses the PATHWAY, follows it, reinforces
Time 2: Agent C senses the reinforced trail, follows it
Time N: A well-worn trail emerges naturally

Meanwhile:
- Agent X hits an error, deposits DANGER pheromone
- Other agents avoid that area
- The DANGER pheromone eventually evaporates
- Agents can try that path again later
```

## Events

The Stigmergy system emits events:

```typescript
stigmergy.on('deposited', (pheromone: Pheromone) => {
  console.log(`New ${pheromone.type} signal at ${pheromone.position}`);
});

stigmergy.on('evaporated', (pheromone: Pheromone) => {
  console.log(`Signal faded: ${pheromone.id}`);
});

stigmergy.on('reinforced', (pheromone: Pheromone) => {
  console.log(`Trail strengthened: ${pheromone.id}`);
});
```

## Position Types

Positions can be defined in multiple ways:

```typescript
interface Position {
  topic?: string;        // "sentiment-analysis"
  taskType?: string;     // "classification"
  contextHash?: string;  // Hash of context
  coordinates?: number[]; // Numerical coordinates
}
```

## Integration with Other Systems

### With Colony

```typescript
// Colony uses stigmergy for agent coordination
colony.registerAgent(agent);
// Agent can now deposit/sense pheromones
```

### With Tiles

```typescript
// Tiles can leave signals about their performance
tile.on('complete', (result) => {
  stigmergy.deposit({
    type: result.success ? PheromoneType.PATHWAY : PheromoneType.DANGER,
    sourceId: tile.id,
    position: { taskType: tile.type }
  });
});
```

### With Meadow

```typescript
// Meadow can share pheromone signals across colonies
meadow.share(stigmergy.exportPheromones());
meadow.importPheromones(remotePheromones);
```

## Configuration

```typescript
interface StigmergyConfig {
  maxPheromones: number;        // Maximum signals stored
  defaultHalfLife: number;      // Decay time in ms
  evaporationInterval: number;  // How often to check decay
  detectionRadius: number;      // How close to sense
  reinforcementRate: number;    // How much to strengthen
}
```

## Testing

```bash
# Run coordination tests
npm test -- --testPathPattern=coordination

# Run stigmergy tests specifically
npx vitest run src/coordination/__tests__/stigmergy.test.ts
```

## Common Patterns

### Pattern 1: Task Routing

```typescript
// Before executing a task, check for existing trails
const trails = stigmergy.sense({ taskType: 'sentiment' });

if (trails.length > 0) {
  // Someone has done this before
  const bestTrail = trails.reduce((a, b) =>
    a.strength > b.strength ? a : b
  );

  // Use the successful approach
  return bestTrail.metadata.approach;
}
```

### Pattern 2: Error Avoidance

```typescript
// When an error occurs, mark the path
try {
  await riskyOperation();
} catch (error) {
  stigmergy.deposit({
    type: PheromoneType.DANGER,
    sourceId: agent.id,
    position: { contextHash: contextHash },
    metadata: { error: error.message }
  });
}
```

### Pattern 3: Resource Discovery

```typescript
// When finding a good resource, share it
const resource = await findResource();

stigmergy.deposit({
  type: PheromoneType.RESOURCE,
  sourceId: agent.id,
  position: { topic: resource.topic },
  strength: resource.quality,
  metadata: { location: resource.location }
});
```

## See Also

- `src/core/distributed/pheromones.ts` - Distributed pheromones
- `src/spreadsheet/tiles/stigmergy.ts` - Tile-level stigmergy
- `docs/research/smp-paper/notes/stigmergic-coordination.md` - Research

---

*Part of POLLN - Pattern-Organized Large Language Network*
*SuperInstance.AI | MIT License*
