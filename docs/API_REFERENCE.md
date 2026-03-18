# API Reference

**Complete API documentation for the Minimal CLAW Server**

---

## Base URL

```
http://localhost:8080
```

All endpoints are prefixed with `/api/v1` unless otherwise noted.

---

## Authentication

**Current Status**: Not implemented in MVP

The MVP does not require authentication. All endpoints are publicly accessible.

**Planned**: API key and JWT authentication will be added in a future round.

---

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

---

## Health Check

### GET /health

Check if the server is running.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-03-18T12:00:00Z",
  "uptime": 12345,
  "agents": 5
}
```

**Status Codes**:
- `200 OK` - Server is healthy

**Example**:
```bash
curl http://localhost:8080/health
```

---

## Agent Management

### List All Agents

### GET /api/v1/agents

Get a list of all agents.

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Maximum number of agents to return |
| `offset` | number | No | Number of agents to skip |
| `state` | string | No | Filter by agent state (IDLE, THINKING, ACTING, etc.) |

**Response**:
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "model": "deepseek-chat",
        "seed": "Monitor cell A1",
        "equipment": ["MEMORY", "REASONING"],
        "trigger": {
          "type": "data",
          "source": "spreadsheet"
        },
        "state": "IDLE",
        "cellId": {
          "sheetId": "sheet1",
          "row": 0,
          "col": 0
        },
        "createdAt": "2026-03-18T12:00:00Z",
        "updatedAt": "2026-03-18T12:00:00Z"
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  }
}
```

**Status Codes**:
- `200 OK` - Success

**Example**:
```bash
curl http://localhost:8080/api/v1/agents
curl http://localhost:8080/api/v1/agents?state=IDLE&limit=5
```

---

### Create Agent

### POST /api/v1/agents

Create a new agent.

**Request Body**:

```json
{
  "model": "deepseek-chat",
  "seed": "Monitor cell A1 for temperature changes",
  "equipment": ["MEMORY", "REASONING"],
  "trigger": {
    "type": "data",
    "source": "spreadsheet"
  },
  "cellId": {
    "sheetId": "sheet1",
    "row": 0,
    "col": 0
  }
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | AI model to use (e.g., "deepseek-chat") |
| `seed` | string | Yes | Natural language description of agent's purpose |
| `equipment` | array | Yes | List of equipment slots to equip |
| `trigger` | object | Yes | Trigger configuration |
| `trigger.type` | string | Yes | Trigger type: "manual", "data", "periodic", "event" |
| `trigger.source` | string | No | Trigger source (for type="data") |
| `trigger.interval` | number | No | Interval in milliseconds (for type="periodic") |
| `cellId` | object | No | Cell to attach agent to |
| `cellId.sheetId` | string | No | Sheet identifier |
| `cellId.row` | number | No | Row index (0-based) |
| `cellId.col` | number | No | Column index (0-based) |

**Equipment Options**:
- `MEMORY` - State persistence
- `REASONING` - Decision making
- `CONSENSUS` - Multi-agent agreement
- `SPREADSHEET` - Cell integration
- `DISTILLATION` - Model compression
- `COORDINATION` - Multi-agent orchestration

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "model": "deepseek-chat",
    "seed": "Monitor cell A1 for temperature changes",
    "equipment": ["MEMORY", "REASONING"],
    "trigger": {
      "type": "data",
      "source": "spreadsheet"
    },
    "state": "IDLE",
    "cellId": {
      "sheetId": "sheet1",
      "row": 0,
      "col": 0
    },
    "createdAt": "2026-03-18T12:00:00Z",
    "updatedAt": "2026-03-18T12:00:00Z"
  }
}
```

**Status Codes**:
- `201 Created` - Agent created successfully
- `400 Bad Request` - Invalid request body

**Example**:
```bash
curl -X POST http://localhost:8080/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "seed": "Monitor cell A1",
    "equipment": ["MEMORY", "REASONING"],
    "trigger": {"type": "data"},
    "cellId": {"sheetId": "sheet1", "row": 0, "col": 0}
  }'
```

---

### Get Agent by ID

### GET /api/v1/agents/:id

Get details of a specific agent.

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "model": "deepseek-chat",
    "seed": "Monitor cell A1",
    "equipment": ["MEMORY", "REASONING"],
    "trigger": {
      "type": "data",
      "source": "spreadsheet"
    },
    "state": "IDLE",
    "cellId": {
      "sheetId": "sheet1",
      "row": 0,
      "col": 0
    },
    "createdAt": "2026-03-18T12:00:00Z",
    "updatedAt": "2026-03-18T12:00:00Z"
  }
}
```

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - Agent not found

**Example**:
```bash
curl http://localhost:8080/api/v1/agents/550e8400-e29b-41d4-a716-446655440000
```

---

### Update Agent

### PATCH /api/v1/agents/:id

Update an existing agent.

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

**Request Body**:

All fields are optional. Only include fields you want to update.

```json
{
  "seed": "Updated seed description",
  "equipment": ["MEMORY", "REASONING", "CONSENSUS"],
  "trigger": {
    "type": "periodic",
    "interval": 10000
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "model": "deepseek-chat",
    "seed": "Updated seed description",
    "equipment": ["MEMORY", "REASONING", "CONSENSUS"],
    "trigger": {
      "type": "periodic",
      "interval": 10000
    },
    "state": "IDLE",
    "cellId": {
      "sheetId": "sheet1",
      "row": 0,
      "col": 0
    },
    "createdAt": "2026-03-18T12:00:00Z",
    "updatedAt": "2026-03-18T12:05:00Z"
  }
}
```

**Status Codes**:
- `200 OK` - Agent updated successfully
- `404 Not Found` - Agent not found
- `400 Bad Request` - Invalid request body

**Example**:
```bash
curl -X PATCH http://localhost:8080/api/v1/agents/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "seed": "Updated seed description"
  }'
```

---

### Delete Agent

### DELETE /api/v1/agents/:id

Delete an agent.

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Agent deleted successfully",
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Status Codes**:
- `200 OK` - Agent deleted successfully
- `404 Not Found` - Agent not found

**Example**:
```bash
curl -X DELETE http://localhost:8080/api/v1/agents/550e8400-e29b-41d4-a716-446655440000
```

---

## Agent Actions

### Trigger Agent

### POST /api/v1/agents/:id/trigger

Trigger an agent to start thinking and acting.

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

**Request Body** (Optional):

```json
{
  "data": {
    "value": 42,
    "source": "manual_trigger"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "agentId": "550e8400-e29b-41d4-a716-446655440000",
    "previousState": "IDLE",
    "currentState": "THINKING",
    "triggeredAt": "2026-03-18T12:05:00Z"
  }
}
```

**Status Codes**:
- `200 OK` - Agent triggered successfully
- `404 Not Found` - Agent not found
- `409 Conflict` - Agent is already in THINKING or ACTING state

**Example**:
```bash
curl -X POST http://localhost:8080/api/v1/agents/550e8400-e29b-41d4-a716-446655440000/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "data": {"value": 42}
  }'
```

---

### Get Agent State

### GET /api/v1/agents/:id/state

Get the current state of an agent.

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

**Response**:
```json
{
  "success": true,
  "data": {
    "agentId": "550e8400-e29b-41d4-a716-446655440000",
    "state": "IDLE",
    "stateHistory": [
      {
        "state": "IDLE",
        "timestamp": "2026-03-18T12:00:00Z"
      },
      {
        "state": "THINKING",
        "timestamp": "2026-03-18T12:05:00Z"
      },
      {
        "state": "ACTING",
        "timestamp": "2026-03-18T12:05:02Z"
      },
      {
        "state": "IDLE",
        "timestamp": "2026-03-18T12:05:03Z"
      }
    ],
    "lastTriggeredAt": "2026-03-18T12:05:00Z",
    "lastActionAt": "2026-03-18T12:05:03Z"
  }
}
```

**Status Codes**:
- `200 OK` - Success
- `404 Not Found` - Agent not found

**Example**:
```bash
curl http://localhost:8080/api/v1/agents/550e8400-e29b-41d4-a716-446655440000/state
```

---

### Equip Agent

### POST /api/v1/agents/:id/equip

Equip an agent with additional equipment.

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

**Request Body**:

```json
{
  "equipment": ["CONSENSUS", "COORDINATION"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "agentId": "550e8400-e29b-41d4-a716-446655440000",
    "previousState": "IDLE",
    "currentState": "EQUIPPING",
    "equipment": ["MEMORY", "REASONING", "CONSENSUS", "COORDINATION"],
    "equippedAt": "2026-03-18T12:05:00Z"
  }
}
```

**Status Codes**:
- `200 OK` - Equipment added successfully
- `404 Not Found` - Agent not found
- `400 Bad Request` - Invalid equipment slot

**Example**:
```bash
curl -X POST http://localhost:8080/api/v1/agents/550e8400-e29b-41d4-a716-446655440000/equip \
  -H "Content-Type: application/json" \
  -d '{
    "equipment": ["CONSENSUS"]
  }'
```

---

### Unequip Agent

### POST /api/v1/agents/:id/unequip

Remove equipment from an agent.

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Agent UUID |

**Request Body**:

```json
{
  "equipment": ["CONSENSUS"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "agentId": "550e8400-e29b-41d4-a716-446655440000",
    "previousState": "IDLE",
    "currentState": "UNEQUIPPING",
    "equipment": ["MEMORY", "REASONING"],
    "unequippedAt": "2026-03-18T12:05:00Z"
  }
}
```

**Status Codes**:
- `200 OK` - Equipment removed successfully
- `404 Not Found` - Agent not found
- `400 Bad Request` - Invalid equipment slot

**Example**:
```bash
curl -X POST http://localhost:8080/api/v1/agents/550e8400-e29b-41d4-a716-446655440000/unequip \
  -H "Content-Type: application/json" \
  -d '{
    "equipment": ["CONSENSUS"]
  }'
```

---

## Cell Integration

### Get Agent by Cell

### GET /api/v1/cells/:sheetId/:row/:col/agent

Get the agent attached to a specific cell.

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sheetId` | string | Yes | Sheet identifier |
| `row` | number | Yes | Row index (0-based) |
| `col` | number | Yes | Column index (0-based) |

**Response**:
```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "model": "deepseek-chat",
      "seed": "Monitor cell A1",
      "equipment": ["MEMORY", "REASONING"],
      "trigger": {
        "type": "data",
        "source": "spreadsheet"
      },
      "state": "IDLE",
      "cellId": {
        "sheetId": "sheet1",
        "row": 0,
        "col": 0
      },
      "createdAt": "2026-03-18T12:00:00Z",
      "updatedAt": "2026-03-18T12:00:00Z"
    },
    "cellId": {
      "sheetId": "sheet1",
      "row": 0,
      "col": 0
    }
  }
}
```

**Status Codes**:
- `200 OK` - Agent found
- `404 Not Found` - No agent attached to this cell

**Example**:
```bash
curl http://localhost:8080/api/v1/cells/sheet1/0/0/agent
```

---

## WebSocket API

### Connect to WebSocket

### WS /ws

Establish a WebSocket connection for real-time agent updates.

**Connection URL**:
```
ws://localhost:8080/ws
```

**Message Format (Client → Server)**:

```json
{
  "type": "SUBSCRIBE",
  "agentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Message Types**:
- `SUBSCRIBE` - Subscribe to updates for a specific agent
- `UNSUBSCRIBE` - Unsubscribe from agent updates

**Message Format (Server → Client)**:

```json
{
  "type": "AGENT_STATE_CHANGE",
  "agentId": "550e8400-e29b-41d4-a716-446655440000",
  "oldState": "IDLE",
  "newState": "THINKING",
  "timestamp": "2026-03-18T12:05:00Z"
}
```

**Message Types**:
- `SUBSCRIBED` - Subscription confirmed
- `AGENT_STATE_CHANGE` - Agent state changed
- `AGENT_DELETED` - Agent was deleted
- `ERROR` - Error occurred

**Example (JavaScript)**:

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  console.log('Connected to WebSocket');

  // Subscribe to agent updates
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE',
    agentId: '550e8400-e29b-41d4-a716-446655440000'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);

  switch (message.type) {
    case 'SUBSCRIBED':
      console.log(`Subscribed to agent ${message.agentId}`);
      break;
    case 'AGENT_STATE_CHANGE':
      console.log(`Agent ${message.agentId}: ${message.oldState} → ${message.newState}`);
      break;
    case 'AGENT_DELETED':
      console.log(`Agent ${message.agentId} was deleted`);
      break;
    case 'ERROR':
      console.error('WebSocket error:', message.error);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket connection closed');
};
```

**Example (Python)**:

```python
import asyncio
import websockets
import json

async def websocket_client():
    uri = "ws://localhost:8080/ws"

    async with websockets.connect(uri) as websocket:
        # Subscribe to agent updates
        subscribe_message = {
            "type": "SUBSCRIBE",
            "agentId": "550e8400-e29b-41d4-a716-446655440000"
        }
        await websocket.send(json.dumps(subscribe_message))

        # Listen for messages
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            print(f"Received: {data}")

asyncio.run(websocket_client())
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `AGENT_NOT_FOUND` | Agent with specified ID not found |
| `INVALID_AGENT_ID` | Invalid agent ID format |
| `INVALID_STATE` | Invalid agent state |
| `INVALID_EQUIPMENT` | Invalid equipment slot |
| `INVALID_TRIGGER_TYPE` | Invalid trigger type |
| `INVALID_CELL_ID` | Invalid cell ID |
| `CELL_ALREADY_OCCUPIED` | Cell already has an agent |
| `AGENT_IN_USE` | Agent is busy (in THINKING or ACTING state) |
| `MISSING_REQUIRED_FIELD` | Missing required field in request |
| `INVALID_JSON` | Invalid JSON in request body |

---

## Rate Limiting

**Current Status**: Not implemented in MVP

The MVP does not enforce rate limits.

**Planned**: Rate limiting will be added in a future round.

---

## SDKs and Libraries

### JavaScript/TypeScript

```typescript
import { SpreadsheetClawIntegration } from '@superinstance/spreadsheet-claw-integration';

const integration = new SpreadsheetClawIntegration({
  integrationConfig: {
    clawServerUrl: 'http://localhost:8080',
  },
});

const agent = await integration.createAgentForCell(
  { sheetId: 'sheet1', row: 0, col: 0 },
  {
    model: 'deepseek-chat',
    seed: 'Monitor cell value changes',
    equipment: ['MEMORY', 'REASONING'],
    trigger: { type: 'data', source: 'spreadsheet' },
  }
);
```

### Python

```python
import requests

base_url = "http://localhost:8080"

# Create agent
response = requests.post(
    f"{base_url}/api/v1/agents",
    json={
        "model": "deepseek-chat",
        "seed": "Monitor cell A1",
        "equipment": ["MEMORY", "REASONING"],
        "trigger": {"type": "data"},
        "cellId": {"sheetId": "sheet1", "row": 0, "col": 0}
    }
)

agent = response.json()
print(f"Created agent: {agent['data']['id']}")
```

---

## Testing the API

### Using curl

```bash
# Health check
curl http://localhost:8080/health

# Create agent
curl -X POST http://localhost:8080/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "seed": "Monitor cell A1",
    "equipment": ["MEMORY", "REASONING"],
    "trigger": {"type": "data"},
    "cellId": {"sheetId": "sheet1", "row": 0, "col": 0}
  }'

# List agents
curl http://localhost:8080/api/v1/agents

# Get agent by cell
curl http://localhost:8080/api/v1/cells/sheet1/0/0/agent

# Trigger agent
curl -X POST http://localhost:8080/api/v1/agents/{AGENT_ID}/trigger
```

### Using Postman

1. Import the API collection (see `/docs/postman-collection.json`)
2. Set base URL to `http://localhost:8080`
3. Run requests

---

## Changelog

### Version 0.1.0 (2026-03-18)
- Initial MVP release
- Basic CRUD operations for agents
- WebSocket support for real-time updates
- Cell-to-agent mapping
- Equipment system
- Trigger system

---

**Need help? Check out the [Getting Started Guide](./GETTING_STARTED.md) or [Tutorial](./TUTORIAL.md)!**
