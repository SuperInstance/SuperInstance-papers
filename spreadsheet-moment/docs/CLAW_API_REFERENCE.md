# Claw API Reference

## Overview

The Claw API provides programmatic access to create, manage, and interact with Claw agents. This document covers all endpoints, WebSocket communication, and SDK usage.

## Base URL

```
Production: https://api.superinstance.ai
Development: http://localhost:8080
```

## Authentication

All API requests require authentication via Bearer token:

```http
Authorization: Bearer YOUR_API_KEY
```

API keys must be at least 20 characters long and should be kept secure.

---

## REST API Endpoints

### Create Claw Agent

Creates a new Claw agent in a cell.

**Endpoint**: `POST /api/claws`

**Request Body**:
```typescript
interface CreateClawRequest {
  config: ClawCellConfig;
  context?: {
    sheetId: string;
    userId?: string;
    sessionId?: string;
  };
}

interface ClawCellConfig {
  id: string;
  type: ClawType;
  position: [number, number];
  model: {
    provider: ModelProvider;
    model: string;
    apiKey?: string;
    baseUrl?: string;
  };
  seed: {
    purpose: string;
    trigger: TriggerCondition;
    learningStrategy: LearningStrategy;
  };
  equipment: EquipmentSlot[];
  relationships: Relationship[];
  state: ClawState;
  confidence: number;
  maxReasoningSteps?: number;
  timeout?: number;
  enableHandshake?: boolean;
}
```

**Response**:
```typescript
interface CreateClawResponse {
  clawId: string;
  status: 'created' | 'pending' | 'error';
  message?: string;
  config: ClawCellConfig;
}
```

**Example**:
```bash
curl -X POST https://api.superinstance.ai/api/claws \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "id": "A1",
      "type": "SENSOR",
      "position": [0, 0],
      "model": {
        "provider": "deepseek",
        "model": "deepseek-chat"
      },
      "seed": {
        "purpose": "Monitor temperature readings",
        "trigger": { "type": "data", "cellId": "B2" },
        "learningStrategy": "reinforcement"
      },
      "equipment": ["MEMORY", "REASONING", "SPREADSHEET"],
      "relationships": [],
      "state": "DORMANT",
      "confidence": 0.8
    }
  }'
```

---

### Query Claw Agent

Get the current state and information about a Claw agent.

**Endpoint**: `GET /api/claws/:clawId`

**Query Parameters**:
- `includeReasoning` (boolean) - Include reasoning steps
- `includeMemory` (boolean) - Include memory contents
- `includeRelationships` (boolean) - Include agent relationships

**Response**:
```typescript
interface QueryClawResponse {
  clawId: string;
  state: ClawStateInfo;
  reasoning?: ReasoningStep[];
  memory?: string[];
  relationships?: Relationship[];
  exists: boolean;
}

interface ClawStateInfo {
  clawId: string;
  state: ClawState;
  reasoning: ReasoningStep[];
  memory: string[];
  confidence: number;
  error?: string;
  lastUpdated: number;
}
```

**Example**:
```bash
curl -X GET "https://api.superinstance.ai/api/claws/A1?includeReasoning=true" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### Trigger Claw Agent

Trigger a Claw agent to start processing.

**Endpoint**: `POST /api/claws/:clawId/trigger`

**Request Body**:
```typescript
interface TriggerClawRequest {
  clawId: string;
  data?: any;
  traceId?: string;
  force?: boolean;
}
```

**Response**:
```typescript
interface TriggerClawResponse {
  clawId: string;
  traceId: string;
  status: 'triggered' | 'already_running' | 'error';
  message?: string;
}
```

**Example**:
```bash
curl -X POST https://api.superinstance.ai/api/claws/A1/trigger \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data": {"temperature": 85}}'
```

---

### Cancel Claw Agent

Cancel a running Claw agent.

**Endpoint**: `POST /api/claws/:clawId/cancel`

**Request Body**:
```typescript
interface CancelClawRequest {
  clawId: string;
  reason?: string;
}
```

**Response**:
```typescript
interface CancelClawResponse {
  clawId: string;
  status: 'cancelled' | 'not_running' | 'error';
  message?: string;
}
```

**Example**:
```bash
curl -X POST https://api.superinstance.ai/api/claws/A1/cancel \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"reason": "User requested cancellation"}'
```

---

### Approve/Reject Claw Action

Approve or reject a pending Claw action that requires human-in-the-loop.

**Endpoint**: `POST /api/claws/:clawId/approve`

**Request Body**:
```typescript
interface ApproveClawRequest {
  clawId: string;
  traceId: string;
  approved: boolean;
  reason?: string;
}
```

**Response**:
```typescript
interface ApproveClawResponse {
  clawId: string;
  traceId: string;
  status: 'approved' | 'rejected' | 'not_found' | 'error';
  message?: string;
}
```

**Example**:
```bash
curl -X POST https://api.superinstance.ai/api/claws/A1/approve \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "traceId": "trace_123",
    "approved": true
  }'
```

---

### Delete Claw Agent

Delete a Claw agent.

**Endpoint**: `DELETE /api/claws/:clawId`

**Response**: `204 No Content` on success

**Example**:
```bash
curl -X DELETE https://api.superinstance.ai/api/claws/A1 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

### Get Claw History

Get the history of a Claw agent's states and actions.

**Endpoint**: `GET /api/claws/:clawId/history`

**Query Parameters**:
- `limit` (number) - Maximum number of history entries (default: 100)

**Response**:
```typescript
ClawStateInfo[]
```

**Example**:
```bash
curl -X GET "https://api.superinstance.ai/api/claws/A1/history?limit=50" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## WebSocket API

### Connection

Connect to the WebSocket endpoint with authentication:

```javascript
const ws = new WebSocket('wss://api.superinstance.ai/ws?token=YOUR_API_KEY');
```

### Message Format

All WebSocket messages follow this format:

```typescript
interface WebSocketMessage {
  type: WebSocketMessageType;
  traceId: string;
  timestamp: number;
  payload: any;
}
```

### Client-to-Server Messages

#### Subscribe

Subscribe to updates for a specific Claw agent.

```typescript
{
  type: 'subscribe',
  traceId: 'unique-trace-id',
  timestamp: 1700000000000,
  payload: {
    clawId: 'A1',
    cellId: 'A1',
    sheetId: 'sheet-1'
  }
}
```

#### Unsubscribe

Unsubscribe from Claw agent updates.

```typescript
{
  type: 'unsubscribe',
  traceId: 'unique-trace-id',
  timestamp: 1700000000000,
  payload: {
    clawId: 'A1',
    cellId: 'A1',
    sheetId: 'sheet-1'
  }
}
```

#### Trigger

Trigger an agent via WebSocket.

```typescript
{
  type: 'trigger',
  traceId: 'unique-trace-id',
  timestamp: 1700000000000,
  payload: {
    clawId: 'A1',
    data: { temperature: 85 }
  }
}
```

#### Approve/Reject

Approve or reject a pending action.

```typescript
{
  type: 'approve', // or 'reject'
  traceId: 'unique-trace-id',
  timestamp: 1700000000000,
  payload: {
    clawId: 'A1',
    traceId: 'action-trace-id'
  }
}
```

#### Cancel

Cancel a running agent.

```typescript
{
  type: 'cancel',
  traceId: 'unique-trace-id',
  timestamp: 1700000000000,
  payload: {
    clawId: 'A1'
  }
}
```

### Server-to-Client Messages

#### State Change

Agent state has changed.

```typescript
{
  type: 'state_change',
  traceId: 'trace-id',
  timestamp: 1700000000000,
  payload: {
    clawId: 'A1',
    cellId: 'A1',
    state: 'THINKING',
    reasoning: [],
    confidence: 0.9
  }
}
```

#### Reasoning Step

Agent has completed a reasoning step.

```typescript
{
  type: 'reasoning_step',
  traceId: 'trace-id',
  timestamp: 1700000000000,
  payload: {
    clawId: 'A1',
    cellId: 'A1',
    step: {
      stepNumber: 1,
      content: 'Analyzing temperature data...',
      timestamp: 1700000000000,
      confidence: 0.85
    },
    isFinal: false
  }
}
```

#### Approval Required

Agent needs human approval for an action.

```typescript
{
  type: 'approval_required',
  traceId: 'trace-id',
  timestamp: 1700000000000,
  payload: {
    clawId: 'A1',
    cellId: 'A1',
    traceId: 'action-trace-id',
    action: {
      type: 'update_cell',
      target: 'B3',
      data: { value: 'Alert: High temperature' },
      confidence: 0.75
    },
    reasoning: 'Temperature exceeded threshold',
    confidence: 0.75,
    timeout: 60000
  }
}
```

#### Action Completed

Agent has completed an action.

```typescript
{
  type: 'action_completed',
  traceId: 'trace-id',
  timestamp: 1700000000000,
  payload: {
    clawId: 'A1',
    cellId: 'A1',
    action: {
      type: 'update_cell',
      target: 'B3',
      data: { value: 'Updated' },
      confidence: 0.9
    }
  }
}
```

#### Error

Agent encountered an error.

```typescript
{
  type: 'error',
  traceId: 'trace-id',
  timestamp: 1700000000000,
  payload: {
    clawId: 'A1',
    cellId: 'A1',
    error: 'Model API rate limit exceeded',
    code: 'RATE_LIMITED'
  }
}
```

---

## TypeScript SDK

### Installation

```bash
npm install @spreadsheet-moment/agent-core
```

### Usage

```typescript
import { ClawClient, ClawState, EquipmentSlot } from '@spreadsheet-moment/agent-core';

// Create client
const client = new ClawClient({
  baseUrl: 'https://api.superinstance.ai',
  wsUrl: 'wss://api.superinstance.ai/ws',
  apiKey: 'your-api-key-here',
  timeout: 30000,
  maxRetries: 3,
  enableWebSocket: true,
  debug: false
});

// Create agent
const createResponse = await client.createClaw({
  config: {
    id: 'A1',
    type: 'SENSOR',
    position: [0, 0],
    model: {
      provider: 'deepseek',
      model: 'deepseek-chat'
    },
    seed: {
      purpose: 'Monitor temperature',
      trigger: { type: 'data', cellId: 'B2' },
      learningStrategy: 'reinforcement'
    },
    equipment: [EquipmentSlot.MEMORY, EquipmentSlot.REASONING],
    relationships: [],
    state: ClawState.DORMANT,
    confidence: 0.8
  },
  context: {
    sheetId: 'sheet-1'
  }
});

console.log('Created agent:', createResponse.clawId);

// Subscribe to updates
client.on('stateChange', (payload) => {
  console.log('State changed:', payload.state);
});

client.on('reasoningStep', (payload) => {
  console.log('Reasoning:', payload.step.content);
});

client.on('approvalRequired', async (payload) => {
  console.log('Action needs approval:', payload.action);
  // Approve or reject
  await client.approveClaw({
    clawId: payload.clawId,
    traceId: payload.traceId,
    approved: true
  });
});

// Subscribe to agent
client.subscribeToClaw('A1', 'A1', 'sheet-1');

// Trigger agent
await client.triggerClaw({
  clawId: 'A1',
  data: { temperature: 85 }
});

// Query agent state
const queryResponse = await client.queryClaw({
  clawId: 'A1',
  includeReasoning: true
});

console.log('Agent state:', queryResponse.state);

// Cancel agent
await client.cancelClaw({
  clawId: 'A1',
  reason: 'User cancelled'
});

// Delete agent
await client.deleteClaw('A1');

// Cleanup
client.dispose();
```

---

## Enums

### ClawState

```typescript
enum ClawState {
  DORMANT = 'DORMANT',
  THINKING = 'THINKING',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  POSTED = 'POSTED',
  ARCHIVED = 'ARCHIVED',
  ERROR = 'ERROR'
}
```

### ClawType

```typescript
enum ClawType {
  SENSOR = 'SENSOR',
  ANALYZER = 'ANALYZER',
  CONTROLLER = 'CONTROLLER',
  ORCHESTRATOR = 'ORCHESTRATOR'
}
```

### ModelProvider

```typescript
enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek',
  CLOUDFLARE = 'cloudflare'
}
```

### EquipmentSlot

```typescript
enum EquipmentSlot {
  MEMORY = 'MEMORY',
  REASONING = 'REASONING',
  LEARNING = 'LEARNING',
  PERCEPTION = 'PERCEPTION',
  ACTION = 'ACTION',
  COMMUNICATION = 'COMMUNICATION'
}
```

### TriggerType

```typescript
enum TriggerType {
  CELL_CHANGE = 'cell_change',
  FORMULA = 'formula',
  TIME = 'time',
  EXTERNAL = 'external',
  MANUAL = 'manual'
}
```

### LearningStrategy

```typescript
enum LearningStrategy {
  REINFORCEMENT = 'reinforcement',
  SUPERVISED = 'supervised',
  UNSUPERVISED = 'unsupervised'
}
```

### WebSocketMessageType

```typescript
enum WebSocketMessageType {
  // Client -> Server
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  TRIGGER = 'trigger',
  APPROVE = 'approve',
  REJECT = 'reject',
  CANCEL = 'cancel',
  QUERY = 'query',

  // Server -> Client
  CELL_UPDATE = 'cell_update',
  REASONING_STEP = 'reasoning_step',
  STATE_CHANGE = 'state_change',
  APPROVAL_REQUIRED = 'approval_required',
  ACTION_COMPLETED = 'action_completed',
  ERROR = 'error',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected'
}
```

---

## Error Handling

### Error Codes

```typescript
enum ClawErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  TIMEOUT = 'TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_STATE = 'INVALID_STATE',
  RECURSIVE_LOOP = 'RECURSIVE_LOOP'
}
```

### Error Response

```typescript
interface ClawAPIError {
  code: ClawErrorCode;
  message: string;
  details?: any;
  clawId?: string;
}
```

### HTTP Status Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request body |
| 401 | UNAUTHORIZED | Invalid or missing API key |
| 404 | NOT_FOUND | Agent not found |
| 409 | ALREADY_EXISTS | Agent already exists |
| 429 | RATE_LIMITED | Rate limit exceeded |
| 500 | INTERNAL_ERROR | Server error |

---

## Rate Limits

| Plan | Requests/min | WebSocket connections |
|------|--------------|----------------------|
| Free | 60 | 1 |
| Pro | 600 | 5 |
| Enterprise | Unlimited | Unlimited |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per minute
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

**Version**: 1.0.0
**Last Updated**: March 2026
