# Dream Cycle Endpoints

## Overview

Dream cycle endpoints allow you to trigger and monitor dream-based policy optimization, which improves agent behavior through simulated episodes.

## Subscribe to Dream Events

Subscribe to dream cycle events for a colony.

### Request

```typescript
{
  type: 'subscribe:dreams',
  payload: {
    colonyId: 'colony-1'
  }
}
```

### Response

```typescript
{
  type: 'event:dream',
  payload: {
    colonyId: 'colony-1',
    dreamId: 'dream-1',
    episode: {
      id: 'episode-1',
      states: [ /* state sequence */ ],
      actions: [ /* action sequence */ ],
      rewards: [ /* reward sequence */ ]
    },
    metrics: {
      loss: 0.234,
      reconstructionError: 0.123,
      klDivergence: 0.045
    }
  }
}
```

## Trigger Dream Cycle

Trigger a dream cycle for a colony or specific agent.

### Request

```typescript
{
  type: 'command:dream',
  payload: {
    colonyId: 'colony-1',
    agentId: 'agent-1',
    episodeCount: 10
  }
}
```

### Payload

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| colonyId | string | No | Colony ID to trigger dream cycle for |
| agentId | string | No | Optional specific agent ID |
| episodeCount | number | No | Number of dream episodes to generate (default: 10) |

## Dream Metrics

| Metric | Type | Description |
|--------|------|-------------|
| loss | number | Total loss (combined reconstruction + KL) |
| reconstructionError | number | Reconstruction error (lower is better) |
| klDivergence | number | KL divergence (lower is better) |
