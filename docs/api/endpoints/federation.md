# Federation Endpoints

## Overview

Federation endpoints enable coordination between multiple POLLN colonies, allowing for distributed learning and knowledge sharing.

## Current Status

The federation endpoints are currently under development. Future versions will support:

- Colony registration and discovery
- Federated learning coordination
- Knowledge sharing between colonies
- Cross-colony agent migration

## Planned Endpoints

### Register Colony

```typescript
{
  type: 'command:federate:register',
  payload: {
    colonyId: 'colony-1',
    capabilities: {
      maxAgents: 1000,
      supportedTypes: ['task-agent', 'role-agent', 'core-agent']
    }
  }
}
```

### Discover Colonies

```typescript
{
  type: 'query:federate:discover',
  payload: {
    filter: {
      minAgents: 100,
      capabilities: ['task-agent']
    }
  }
}
```

### Sync Models

```typescript
{
  type: 'command:federate:sync',
  payload: {
    colonyId: 'colony-1',
    models: ['value-network', 'world-model']
  }
}
```

## Federation Architecture

```text
+-------------------+       +-------------------+
| Colony A          |       | Colony B          |
|                   |       |                   |
|  Local Learning   |<----->|  Local Learning   |
|  Model Updates    |       |  Model Updates    |
+-------------------+       +-------------------+
          ^                           ^
          |                           |
          v                           v
    +-----------+             +-----------+
    | Coordinator             | Coordinator
    |           |             |           |
    +-----------+             +-----------+
          ^                           ^
          |                           |
          +-----------+---------------+
                      |
                  Federated Model
```

## Benefits

- **Privacy**: Colonies keep local data private
- **Scalability**: Distribute learning across many colonies
- **Robustness**: No single point of failure
- **Knowledge Sharing**: Learn from diverse experiences
