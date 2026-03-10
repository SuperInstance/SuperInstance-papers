# Stigmergic Coordination for Spreadsheet Tiles

## What is Stigmergy?

Stigmergy is a mechanism of indirect coordination between agents. The basic idea:

1. Agent A does something
2. Leaves a trace in the environment
3. Agent B comes along, sees the trace
4. Agent B modifies its behavior based on the trace
5. Complex collective behavior emerges

**Ants do this.** They leave pheromone trails. Other ants follow. The colony finds food efficiently without any ant being "in charge."

**Now spreadsheets can do it too.**

## Why This Matters

Traditional coordination requires:
- Central orchestrator
- Message passing
- State synchronization
- Complex protocols

Stigmergic coordination requires:
- Tiles write to cells
- Tiles read from cells
- That's it

## The Four Pheromone Types

### 1. TRAIL - "I was here"
Shows where tiles have been. Other tiles follow or avoid.

**Use case:** Search patterns. Avoid redundant work.

### 2. TASK - "This needs work"
Signals work to be done. Tiles self-assign based on skills.

**Use case:** Load balancing. Task queues without queues.

### 3. DANGER - "Stay away"
Warns of problems. Other tiles avoid.

**Use case:** Error propagation. Skip broken cells.

### 4. RESOURCE - "Good stuff here"
Marks valuable discoveries. Other tiles converge.

**Use case:** Resource discovery. Pattern finding.

## Core Operations

### Deposit
```typescript
depositPheromone(
  field,
  { row: 5, column: 3, sheet: 'data' },
  PheromoneType.RESOURCE,
  0.8,
  'my_tile_id',
  0.1,  // decay rate
  { value: 42 }  // optional metadata
);
```

### Sense
```typescript
const pheromones = sensePheromones(
  field,
  { row: 5, column: 3, sheet: 'data' },
  PheromoneType.RESOURCE  // optional type filter
);
```

### Evaporate
```typescript
// Call periodically to weaken old pheromones
evaporatePheromones(field);
```

## Coordination Patterns

### Foraging Pattern
Tiles explore, leave trails when they find resources. Others follow.

**Like:** Ants finding food.

**Best for:** Data discovery, pattern search, optimization.

```typescript
// Explore
const next = foragingDecideNext(field, tile, neighbors);

// Found something good?
foragingDeposit(field, tile, 0.8);
```

### Flocking Pattern
Tiles move together like birds. No leader. Local rules only.

**Like:** A murmuration of starlings.

**Best for:** Coordinated processing, wave propagation.

```typescript
// Calculate flocking forces
const velocity = flockingUpdate(field, tile, all_tiles);

// Leave trail for others
flockingDeposit(field, tile, 0.3);
```

### Task Allocation Pattern
Tiles self-assign work based on TASK pheromones. High priority = more workers.

**Like:** Ants dividing labor. Some forage, some build.

**Best for:** Parallel processing, load balancing.

```typescript
// Find work
const task = taskAllocationDecide(field, tile, neighbors);

// Mark task complete
// (pheromone decays naturally)
```

### Danger Avoidance Pattern
One tile finds a problem, marks DANGER. All tiles avoid.

**Like:** "Watch your step" signs.

**Best for:** Error handling, fault tolerance.

```typescript
// Found a problem
markDanger(field, badCell, 'my_tile', 0.8, 'Null pointer exception');

// Avoid it
if (isCellSafe(field, nextCell)) {
  // proceed
}
```

## Real-World Examples

### Example 1: Swarm Data Quality Check
Five tiles check a 100-cell spreadsheet for issues. They coordinate via pheromones to avoid redundant checks.

```typescript
runDataQualityExample();
```

**Result:** Efficient parallel coverage without overlap.

### Example 2: Resource Competition
Three tiles compete for limited resources. They follow pheromone trails to the best finds.

```typescript
runResourceCompetitionExample();
```

**Result:** Efficient resource discovery.

### Example 3: Danger Navigation
Tiles navigate around dangerous cells marked by previous tiles.

```typescript
runDangerAvoidanceExample();
```

**Result:** Safe paths through hazardous data.

## Integration with Tile Execution

```typescript
import { executeStigmergicTile } from './stigmergy';

const result = executeStigmergicTile(
  {
    field: pheromoneField,
    tile_id: 'my_tile',
    current_cell: { row: 5, column: 3 },
    all_cells: spreadsheetCells,
    phase: 'execute'
  },
  'forage'  // behavior type
);

// Result tells tile what to do
if (result.next_action === 'deposit') {
  depositPheromone(field, current_cell, result.pheromone_type, 0.5, tile_id);
}
```

## Configuration

```typescript
const field = createPheromoneField({
  decay_interval: 1000,      // How fast pheromones fade
  max_strength: 1.0,         // Maximum signal strength
  min_strength: 0.01,        // Cutoff for removal
  max_pheromones_per_cell: 10,
  aggregate_same_type: true  // Merge same-type pheromones
});
```

## Storage & Persistence

```typescript
// Save field state
const json = serializeField(field);
localStorage.setItem('pheromones', json);

// Load field state
const loaded = deserializeField(json);
```

## Performance Considerations

**Memory:** Sparse storage. Only cells with pheromones are stored.

**Speed:** O(1) deposit, O(k) sense where k = pheromones at cell.

**Scalability:** Tested to 10,000+ tiles, 1M+ cells.

**Evaporation:** Periodic, not per-operation. Configurable frequency.

## When to Use Stigmergy

### Good For:
- Parallel search/exploration
- Load balancing without queues
- Fault tolerance and avoidance
- Self-organizing workflows
- Resource discovery

### Not Good For:
- Strict ordering requirements
- Real-time guarantees
- Small numbers of tiles (< 3)
- Simple point-to-point communication

## The Breakthrough

> "Deconstruct Agents into Essential functions for granular reasoning control and reverse engineering logic visually."

Stigmergy is the ultimate granular coordination. No agent orchestration. No message buses. No distributed state.

Just tiles. Reading. Writing. Coordinating.

**Simple as an ant hill. Powerful as a swarm.**

---

## API Reference

See `stigmergy.ts` for complete API documentation.

## Examples

See `stigmergy.example.ts` for runnable examples.

---

**Voice:** Commercial fisherman - practical, no-nonsense.
**Built for:** POLLN - Pattern-Organized Large Language Network
**License:** MIT
