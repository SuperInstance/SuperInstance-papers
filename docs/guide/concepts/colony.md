# Colony Architecture

Cells organize into colonies for coordination, communication, and scalability. A colony is a group of cells working together toward a common goal.

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                      COLONY                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐      │
│   │ Cell 1 │  │ Cell 2 │  │ Cell 3 │  │ Cell 4 │      │
│   └────────┘  └────────┘  └────────┘  └────────┘      │
│        │            │            │            │         │
│        └────────────┴────────────┴────────────┘         │
│                      │                                   │
│              ┌───────┴────────┐                          │
│              │  Coordinator   │                          │
│              └────────────────┘                          │
│                      │                                   │
│              ┌───────┴────────┐                          │
│              │  Communication │                          │
│              │    Protocol     │                          │
│              └────────────────┘                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Creating a Colony

```typescript
import { Colony, LogCell } from 'polln'

// Create a colony
const colony = new Colony('analytics', {
  maxSize: 100,              // Maximum cells
  communication: {
    protocol: 'websocket',
    heartbeat: 30000         // 30s heartbeat
  },
  persistence: {
    enabled: true,
    store: 'redis'
  }
})

// Add cells
const cell1 = new LogCell('A1')
const cell2 = new LogCell('A2')
colony.addCells([cell1, cell2])

// Start the colony
await colony.start()
```

## Colony Lifecycle

### Initialization

```typescript
const colony = new Colony('my-colony')
// Colony is created but not started
```

### Starting

```typescript
await colony.start()
// All cells are initialized
// Communication is established
// Event handlers are registered
```

### Running

```typescript
// Colony is active
// Cells can communicate
// Updates are processed
```

### Stopping

```typescript
await colony.stop()
// Graceful shutdown
// All cells are stopped
// Resources are released
```

## Cell Communication

### Direct Communication

Cells can send messages directly:

```typescript
// Cell A sends to Cell B
await colony.sendMessage('A', 'B', {
  type: 'update',
  value: 100
})

// Cell B receives the message
cellB.on('message', (from, message) => {
  console.log(`Received from ${from}:`, message)
})
```

### Broadcast

Send to all cells:

```typescript
await colony.broadcast({
  type: 'alert',
  message: 'System maintenance in 5 minutes'
})
```

### Pub/Sub

Publish/subscribe pattern:

```typescript
// Subscribe to topics
cellA.subscribe('price-changes')
cellB.subscribe('price-changes')

// Publish updates
colony.publish('price-changes', { symbol: 'AAPL', price: 150 })
```

## Coordination

### Sequential Execution

Execute cells in sequence:

```typescript
colony.setExecutionMode('sequential')

// Cell A → Cell B → Cell C
// Each cell waits for previous to complete
```

### Parallel Execution

Execute cells in parallel:

```typescript
colony.setExecutionMode('parallel')

// All cells run simultaneously
// Independent processing
```

### Conditional Execution

Execute based on conditions:

```typescript
colony.setExecutionMode('conditional')

// Cells execute when their conditions are met
cellA.condition = () => cellB.state.value > 100
```

## Scalability

### Horizontal Scaling

Add more colonies:

```typescript
const colony1 = new Colony('colony-1', { location: 'us-east-1' })
const colony2 = new Colony('colony-2', { location: 'us-west-1' })

// Colonies can communicate
colony1.connectTo(colony2)
```

### Load Balancing

Distribute cells across colonies:

```typescript
const balancer = new ColonyBalancer()
balancer.addColony(colony1)
balancer.addColony(colony2)

// Automatically distribute cells
balancer.distribute([cell1, cell2, cell3, cell4])
```

## Persistence

### In-Memory

```typescript
const colony = new Colony('ephemeral', {
  persistence: { enabled: false }
})
```

### Redis

```typescript
const colony = new Colony('persistent', {
  persistence: {
    enabled: true,
    store: 'redis',
    url: 'redis://localhost:6379'
  }
})
```

### Database

```typescript
const colony = new Colony('database', {
  persistence: {
    enabled: true,
    store: 'database',
    url: 'postgresql://localhost/polln'
  }
})
```

## Monitoring

### Metrics

```typescript
colony.on('metrics', (metrics) => {
  console.log('Colony metrics:', metrics)
  // { size: 10, active: 8, updates: 100, errors: 0 }
})
```

### Events

```typescript
colony.on('cell-added', (cell) => {
  console.log('Cell added:', cell.id)
})

colony.on('cell-removed', (cellId) => {
  console.log('Cell removed:', cellId)
})

colony.on('error', (error) => {
  console.error('Colony error:', error)
})
```

## Best Practices

### 1. Colony Size

Keep colonies focused:

```typescript
// ✅ Good: Focused colony
const analytics = new Colony('analytics')

// ❌ Bad: Monolithic colony
const everything = new Colony('everything')
```

### 2. Communication

Minimize cross-cell communication:

```typescript
// ✅ Good: Direct processing
const result = new TransformCell('result', {
  sources: ['input'],
  transform: processDirectly
})

// ❌ Bad: Excessive messaging
cell1.on('update', () => cell2.update())
cell2.on('update', () => cell3.update())
```

### 3. Error Handling

Handle errors gracefully:

```typescript
colony.on('error', (error) => {
  logger.error('Colony error:', error)
  // Retry, notify, or fail gracefully
})
```

### 4. Resource Management

Clean up resources:

```typescript
try {
  await colony.start()
  // Do work
} finally {
  await colony.stop()  // Always stop
}
```

## Multi-Colony Systems

### Hierarchical Colonies

```
┌─────────────────────────────────────┐
│         Parent Colony               │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────┐    ┌──────────┐     │
│  │ Child 1  │    │ Child 2  │     │
│  └──────────┘    └──────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### Federated Colonies

```
┌──────────────┐    ┌──────────────┐
│   Colony A   │    │   Colony B   │
│   us-east-1  │◄──►│   us-west-1  │
└──────────────┘    └──────────────┘
       │                    │
       └──────────┬─────────┘
                  ▼
         ┌────────────────┐
         │  Coordinator   │
         └────────────────┘
```

## Next Steps

- [Communication](./communication) - Cell-to-cell messaging
- [Cell Types](./cell-types) - Available cell types
- [Examples](../../examples/) - Real-world examples

---

**Ready to build?** See the [Quick Start Guide](../quick-start) or explore [Examples](../../examples/)!
