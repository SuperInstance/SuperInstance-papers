# Agent Management Endpoints

## Overview

Agent management endpoints allow you to control agent lifecycle, query agent state, and monitor agent activity.

## Subscribe to Agent Events

Subscribe to events for a specific agent.

### Request

```typescript
{
  type: 'subscribe:agent',
  payload: {
    agentId: 'agent-1',
    events: ['state_updated', 'succeeded', 'failed']
  }
}
```

### Payload

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| agentId | string | Yes | Agent ID to subscribe to |
| events | string[] | Yes | Event types to receive |

### Event Types

- `state_updated`: Agent state changed
- `executed`: Agent executed
- `succeeded`: Agent execution succeeded
- `failed`: Agent execution failed
- `value_changed`: Agent value function changed
- `error`: Agent error

## Query Agent

Query the current state of a specific agent.

### Request

```typescript
{
  type: 'query:agent',
  payload: {
    agentId: 'agent-1',
    includeHistory: false
  }
}
```

### Response

```typescript
{
  type: 'response:agent',
  payload: {
    agent: {
      id: 'agent-1',
      typeId: 'task-agent',
      status: 'active',
      valueFunction: 0.75,
      successRate: 0.85,
      lastActive: 1699123456789,
      avgLatencyMs: 45.5
    },
    config: {
      // Agent configuration
    }
  }
}
```

## Spawn Agent

Spawn a new agent in the colony.

### Request

```typescript
{
  type: 'command:spawn',
  payload: {
    typeId: 'task-agent',
    config: {
      // Agent-specific configuration
    }
  }
}
```

## Activate Agent

Activate a dormant agent.

### Request

```typescript
{
  type: 'command:activate',
  payload: {
    agentId: 'agent-1'
  }
}
```

## Deactivate Agent

Deactivate an active agent.

### Request

```typescript
{
  type: 'command:deactivate',
  payload: {
    agentId: 'agent-1'
  }
}
```

## Examples

### Monitor Agent Performance

```typescript
// Subscribe to agent events
client.subscribeToAgent('agent-1', ['succeeded', 'failed']);

client.on('agent:event', (event) => {
  if (event.eventType === 'succeeded') {
    console.log('Agent succeeded:', event.data);
  } else if (event.eventType === 'failed') {
    console.error('Agent failed:', event.data);
  }
});
```
