# Stigmergy

A TypeScript library for bio-inspired coordination through indirect communication. Like ants leaving pheromone trails, agents leave signals that influence others' behavior.

## What is Stigmergy?

Stigmergy is a coordination mechanism where agents communicate indirectly by modifying their environment. Instead of direct messages, they leave "pheromones" - persistent signals that other agents can detect and respond to.

Think of it like Wikipedia editors flagging pages that need attention. Other editors see the flags and know where to focus their efforts.

This approach is particularly powerful for:

- **Decentralized coordination** without central control
- **Dynamic task allocation** based on real-time conditions
- **Self-organizing systems** that adapt to changing demands
- **Swarm intelligence** with simple rules, complex behaviors
- **Distributed optimization** through collective action

## Installation

```bash
npm install stigmergy
```

## Quick Start

```typescript
import { Stigmergy, PheromoneType, TrailFollower } from 'stigmergy';

// Create a stigmergic environment
const stigmergy = new Stigmergy({
  maxPheromones: 1000,
  defaultHalfLife: 60000,    // 60 seconds
  detectionRadius: 0.5       // How "close" counts as nearby
});

// Deposit a pheromone
const signal = stigmergy.deposit(
  'agent-123',               // Source ID
  PheromoneType.RESOURCE,    // Type of signal
  { x: 10, y: 20 },          // Position
  0.8,                       // Strength (0-1)
  new Map([['priority', 'high']])  // Metadata
);

// Another agent detects nearby signals
const detected = stigmergy.detect(
  { x: 9, y: 19 },           // Current position
  [PheromoneType.RESOURCE]   // Types to look for
);

console.log(`Found ${detected.nearby.length} signals`);
console.log(`Strongest: ${detected.strongest?.type}`);
```

## Pheromone Types

The system defines five standard pheromone types:

| Type | Description | Use Case |
|------|-------------|----------|
| PATHWAY | Route or navigation aid | "This is a good path" |
| RESOURCE | Location of value | "Resources available here" |
| DANGER | Hazard or risk warning | "Avoid this area" |
| NEST | Central coordination point | "Home base location" |
| RECRUIT | Help needed | "Need assistance here" |

You can also create custom types for your specific domain.

## Core Concepts

### 1. Pheromone Properties

Each pheromone has several properties that affect its behavior:

- **Strength (0-1)**: How strong the signal is
- **Half-life**: How quickly the signal decays
- **Position**: Where the signal is located
- **Metadata**: Additional context information
- **Source ID**: Which agent created it

### 2. Evaporation

Signals naturally decay over time, simulating:
- Memory fading
- Changing conditions
- Preventing stale information

```typescript
// Evaporation happens automatically, but you can trigger it manually
stigmergy.evaporate();
```

### 3. Reinforcement

Agents can strengthen signals by following them:

```typescript
// Agent follows a trail, reinforcing it
stigmergy.follow(pheromoneId, followerId);
```

This models how ant trails get stronger as more ants use them.

## Advanced Usage

### Trail Following

The `TrailFollower` class provides a higher-level API for agents:

```typescript
const follower = new TrailFollower(stigmergy, 'agent-456');

// Follow a specific type of trail
const result = follower.followTrail(
  { x: 5, y: 5 },                   // Current position
  PheromoneType.RESOURCE            // What to look for
);

if (result.found) {
  console.log(`Found trail: ${result.pheromone?.id}`);
  console.log(`Direction: ${JSON.stringify(result.direction)}`);

  // Leave our own signal
  const ourSignal = follower.leaveSignal(
    PheromoneType.RESOURCE,
    { x: 5, y: 5 },
    0.9,                           // Our confidence in this area
    new Map([['found', 5], ['quality', 'excellent']])
  );
}
```

### Event Monitoring

The system emits events for monitoring and debugging:

```typescript
stigmergy.on('deposit', (data) => {
  console.log(`New ${data.type} signal at ${data.position}`);
});

stigmergy.on('evaporated', (data) => {
  console.log(`${data.count} signals evaporated`);
});

stigmergy.on('followed', (data) => {
  console.log(`Agent ${data.followerId} followed trail ${data.pheromoneId}`);
});
```

### Position Formats

The system supports two position formats:

```typescript
// 1. Coordinate-based with proximity detection
const coordPos = { coordinates: [x, y, z] };

// 2. Topic/Task-based for abstract spaces
const topicPos = {
  topic: 'payment-processing',
  taskType: 'fraud-detection'
};

// 3. Hash-based for content addressing
const hashPos = { contextHash: 'sha256-of-context' };
```

Distances are calculated differently for each format:
- Coordinates: Euclidean distance
- Topics: 0 if exact match, 1 otherwise
- Hash: Similar comparison approach

## Real-World Examples

### 1. Task Distribution System

```typescript
class DistributedWorkerPool {
  private stigmergy: Stigmergy;
  private followers: Map<string, TrailFollower>;

  constructor() {
    this.stigmergy = new Stigmergy();
    this.followers = new Map();
  }

  submitTask(task: Task) {
    // Mark task needs processing
    this.stigmergy.deposit(
      'system',
      PheromoneType.RECRUIT,
      { taskType: task.type },
      task.priority,
      new Map([
        ['taskId', task.id],
        ['deadline', task.deadline],
        ['complexity', task.complexity]
      ])
    );
  }

  registerWorker(workerId: string) {
    const follower = new TrailFollower(this.stigmergy, workerId);
    this.followers.set(workerId, follower);

    // Worker picks up tasks by following RECRUIT signals
    setInterval(() => {
      const result = follower.followTrail(
        { taskType: 'available' },
        PheromoneType.RECRUIT
      );

      if (result.found) {
        this.processTask(workerId, result.pheromone);
      }
    }, 1000);
  }

  private processTask(workerId: string, signal: Pheromone) {
    // Process the task...
    // Leave RESOURCE signal when done
    this.stigmergy.deposit(
      workerId,
      PheromoneType.RESOURCE,
      signal.position,
      1.0,
      new Map([['workerId', workerId], ['completed', Date.now()]])
    );
  }
}
```

### 2. Load Balancing Algorithm

```typescript
class StigmergicLoadBalancer {
  private stigmergy: Stigmergy;

  constructor() {
    this.stigmergy = new Stigmergy({
      evaporationInterval: 1000,  // Fast updates
      detectionRadius: 0.3        // Fine granularity
    });
  }

  // Servers mark their current load
  reportLoad(serverId: string, load: number, position: ServerPosition) {
    // Higher load = lower signal strength
    const signalStrength = Math.max(0, 1 - (load / 100));

    this.stigmergy.deposit(
      serverId,
      PheromoneType.RESOURCE,  // "Healthy server capacity"
      position,
      signalStrength,
      new Map([
        ['serverId', serverId],
        ['currentLoad', load],
        ['timestamp', Date.now()]
      ])
    );
  }

  // Route requests to least loaded servers
  routeRequest(): ServerPosition | null {
    const detected = this.stigmergy.detect(
      { region: 'available' },
      [PheromoneType.RESOURCE]
    );

    if (detected.strongest) {
      // Follow signal reinforces it (positive feedback)
      this.stigmergy.follow(detected.strongest.id, 'load-balancer');
      return detected.strongest.position;
    }

    return null;  // No healthy servers
  }
}
```

## Performance Characteristics

- **O(1)** deposit operations
- **O(n)** detection where n is pheromones within radius
- **Automatic cleanup** through evaporation
- **Memory efficient** with configurable limits

## API Reference

### Stigmergy Class

```typescript
constructor(config?: Partial<StigmergyConfig>)

// Core operations
deposit(sourceId: string, type: PheromoneType, position: Position, strength?: number, metadata?: Map<string, unknown>): Pheromone
follow(pheromoneId: string, followerId: string): void
detect(position: Position, types?: PheromoneType[]): { nearby: Pheromone[]; strongest: Pheromone | null }
evaporate(): void
reset(): void

// Management
getStats(): Stats
shutdown(): void
```

### TrailFollower Class

```typescript
constructor(stigmergy: Stigmergy, agentId: string)

followTrail(currentPosition: Position, targetType: PheromoneType): FollowResult
leaveSignal(type: PheromoneType, position: Position, strength?: number, metadata?: Map<string, unknown>): Pheromone
getFollowedCount(): number
```

### Configuration

```typescript
interface StigmergyConfig {
  maxPheromones: number;         // Maximum signals allowed
  defaultHalfLife: number;       // Milliseconds to lose 50% strength
  evaporationInterval: number;   // How often to run evaporation
  detectionRadius: number;       // How close counts as "nearby"
  reinforcementRate: number;     // How much to strengthen on follow
}
```

## Testing

```bash
npm test
```

The library includes comprehensive unit tests covering:
- Pheromone lifecycle (deposit, detection, evaporation)
- Position-based detection
- Event emission
- Trail following behavior
- Edge cases and error handling

## Design Patterns

### 1. Gradient Following
```typescript
// Follow increasing signal strength
const searchGradient = (current: Position, type: PheromoneType) => {
  const nearby = stigmergy.detect(current, [type]).nearby;
  nearby.sort((a, b) => b.strength - a.strength);
  return nearby[0]?.position;
};
```

### 2. Q-Learning Integration
```typescript
// Use pheromone strength as Q-values
const getQValue = (state: Position, action: string) => {
  const detected = stigmergy.detect(state, [PheromoneType.PATHWAY]);
  return detected.strongest?.strength || 0;
};
```

### 3. Consensus Building
```typescript
// Multiple agents agreeing on a value
const buildConsensus = (proposals: Array<{value: number, proposer: string}>) => {
  const positions = proposals.map((p, i) => ({
    coordinates: [Math.cos(i * 2*Math.PI / proposals.length), Math.sin(i * 2*Math.PI / proposals.length)]
  }));

  // Each proposer deposits signal
  proposals.forEach((prop, i) => {
    stigmergy.deposit(
      prop.proposer,
      PheromoneType.RESOURCE,
      positions[i],
      prop.value,
      new Map([['proposal', prop.value]])
    );
  });

  // Read consensus value
  return stigmergy.detect(positions[0], [PheromoneType.RESOURCE]);
};
```

## Limitations

- **No persistence** - Signals are in-memory only
- **Single process** - Designed for single-node use (use federation for distributed)
- **Eventual consistency** - No guarantees about signal visibility timing
- **Memory management** - Requires set limits to prevent unbounded growth

## Related

- [confidence-cascade](https://github.com/SuperInstance/confidence-cascade) - Decision confidence system
- [microbiome](https://github.com/SuperInstance/microbiome) - Complete ecosystem simulation
- [POLLN](https://github.com/SuperInstance/Polln-whitepapers) - Research and theory papers

---

*Inspired by ant colonies, designed for distributed systems*