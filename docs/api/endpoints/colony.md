# Colony Management Endpoints

## Overview

Colony management endpoints allow you to monitor colony state, manage agents at the colony level, and receive colony-wide events.

## Subscribe to Colony Events

Subscribe to events for a specific colony.

### Request

```typescript
{
  type: 'subscribe:colony',
  payload: {
    colonyId: 'colony-1',
    events: ['agent_registered', 'stats_updated']
  }
}
```

### Event Types

- `agent_registered`: New agent registered
- `agent_unregistered`: Agent removed
- `agent_activated`: Agent activated
- `agent_deactivated`: Agent deactivated
- `stats_updated`: Colony statistics updated
- `dream_completed`: Dream cycle completed
- `error`: Colony error

## Query Stats

Query colony statistics.

### Request

```typescript
{
  type: 'query:stats',
  payload: {
    colonyId: 'colony-1',
    includeKVCache: true,
    includeAgents: false
  }
}
```

### Response

```typescript
{
  type: 'response:stats',
  payload: {
    colonyId: 'colony-1',
    stats: {
      totalAgents: 100,
      activeAgents: 75,
      dormantAgents: 25,
      totalCompute: 1000,
      totalMemory: 1000,
      totalNetwork: 1000,
      shannonDiversity: 2.34
    },
    kvCacheStats: {
      hits: 850,
      misses: 150,
      hitRate: 0.85
    }
  }
}
```

## Colony Statistics

### Metrics

| Metric | Type | Description |
|--------|------|-------------|
| totalAgents | number | Total number of agents |
| activeAgents | number | Number of active agents |
| dormantAgents | number | Number of dormant agents |
| totalCompute | number | Total compute budget |
| totalMemory | number | Total memory budget |
| totalNetwork | number | Total network budget |
| shannonDiversity | number | Shannon diversity index |
