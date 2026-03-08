# Server-Sent Events

## Overview

The POLLN WebSocket API sends real-time events to subscribed clients. Events are pushed from the server to clients without explicit requests.

## Colony Events

Events related to colony-wide state and operations.

### Event Types

- `agent_registered` - New agent registered
- `agent_unregistered` - Agent removed
- `agent_activated` - Agent activated
- `agent_deactivated` - Agent deactivated
- `stats_updated` - Colony statistics updated
- `dream_completed` - Dream cycle completed
- `error` - Colony error

### Event Format

```typescript
{
  type: 'event:colony',
  payload: {
    colonyId: 'colony-1',
    eventType: 'agent_registered',
    data: {
      agentId: 'agent-1',
      typeId: 'task-agent'
    }
  }
}
```

## Agent Events

Events related to individual agent operations.

### Event Types

- `state_updated` - Agent state changed
- `executed` - Agent executed
- `succeeded` - Agent execution succeeded
- `failed` - Agent execution failed
- `value_changed` - Agent value function changed
- `error` - Agent error

### Event Format

```typescript
{
  type: 'event:agent',
  payload: {
    agentId: 'agent-1',
    colonyId: 'colony-1',
    eventType: 'succeeded',
    data: {
      result: 'Task completed'
    }
  }
}
```

## Dream Events

Events related to dream cycle operations.

### Event Format

```typescript
{
  type: 'event:dream',
  payload: {
    colonyId: 'colony-1',
    dreamId: 'dream-1',
    episode: {
      id: 'episode-1',
      states: [ /* state sequence */ ]
    },
    metrics: {
      loss: 0.234,
      reconstructionError: 0.123,
      klDivergence: 0.045
    }
  }
}
```

## Stats Events

Events related to statistics updates.

### Event Format

```typescript
{
  type: 'event:stats',
  payload: {
    colonyId: 'colony-1',
    stats: {
      totalAgents: 100,
      activeAgents: 75,
      dormantAgents: 25
    },
    timestamp: 1699123456789
  }
}
```
