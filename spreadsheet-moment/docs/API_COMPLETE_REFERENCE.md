# SpreadsheetMoment Complete API Reference

**Version:** 1.0.0
**Last Updated:** 2026-03-17
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Cell API](#cell-api)
6. [Agent API](#agent-api)
7. [Claw API](#claw-api)
8. [Equipment API](#equipment-api)
9. [WebSocket API](#websocket-api)
10. [Batch Operations](#batch-operations)
11. [Search and Filter](#search-and-filter)
12. [Export and Import](#export-and-import)

---

## Overview

The SpreadsheetMoment API provides comprehensive access to spreadsheet cells, agents, and Claw integration features. The API follows RESTful principles and uses JSON for request and response bodies.

**Base URL:** `https://api.spreadsheetmoment.com/v1`

**Content-Type:** `application/json`

### API Clients

```typescript
// JavaScript/TypeScript
import { SpreadsheetMomentClient } from '@spreadsheetmoment/sdk';

const client = new SpreadsheetMomentClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.spreadsheetmoment.com/v1'
});
```

```python
# Python
from spreadsheetmoment import Client

client = Client(
    api_key='your-api-key',
    base_url='https://api.spreadsheetmoment.com/v1'
)
```

```rust
// Rust
use spreadsheet_moment::Client;

let client = Client::new("your-api-key")
    .base_url("https://api.spreadsheetmoment.com/v1");
```

---

## Authentication

All API requests require authentication via Bearer token.

### Headers

```
Authorization: Bearer <your-api-key>
Content-Type: application/json
```

### Obtaining an API Key

1. Log in to SpreadsheetMoment dashboard
2. Navigate to Settings > API Keys
3. Click "Generate New Key"
4. Store the key securely (it won't be shown again)

### API Key Types

| Type | Scope | Use Case |
|------|-------|----------|
| `read_only` | Read operations only | Analytics, reporting |
| `read_write` | Full CRUD operations | Application integration |
| `admin` | All operations including user management | Administrative tools |

### Example

```bash
curl -X GET "https://api.spreadsheetmoment.com/v1/spreadsheets" \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json"
```

---

## Error Handling

The API uses standard HTTP status codes and returns detailed error messages.

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid cell reference",
    "details": {
      "field": "cellId",
      "value": "Z999",
      "constraint": "Must be valid Excel-style reference (A1-XFD1048576)"
    },
    "requestId": "req_abc123xyz",
    "timestamp": "2026-03-17T10:30:00Z"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Successful delete or update |
| 400 | Bad Request | Invalid request format or parameters |
| 401 | Unauthorized | Invalid or missing API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Codes

```
VALIDATION_ERROR        - Invalid input data
AUTHENTICATION_ERROR    - Invalid credentials
AUTHORIZATION_ERROR     - Insufficient permissions
NOT_FOUND_ERROR         - Resource not found
CONFLICT_ERROR          - Resource conflict
RATE_LIMIT_ERROR        - Rate limit exceeded
INTERNAL_ERROR          - Server error
```

---

## Rate Limiting

### Limits

| Plan | Requests/min | Requests/day | Concurrent requests |
|------|--------------|--------------|---------------------|
| Free | 60 | 1,000 | 5 |
| Pro | 600 | 100,000 | 20 |
| Enterprise | Unlimited | Unlimited | 100 |

### Rate Limit Headers

```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 598
X-RateLimit-Reset: 1647523200
```

### Handling Rate Limits

```typescript
// Exponential backoff
async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    const retryAfter = response.headers.get('Retry-After') || Math.pow(2, i);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  }

  throw new Error('Max retries exceeded');
}
```

---

## Cell API

### Get Cell

```http
GET /spreadsheets/{spreadsheetId}/cells/{cellId}
```

**Parameters:**

| Name | Type | Location | Description |
|------|------|----------|-------------|
| spreadsheetId | string | path | Spreadsheet ID |
| cellId | string | path | Cell reference (e.g., "A1") |

**Response:**

```json
{
  "cellId": "A1",
  "value": "Hello World",
  "formula": null,
  "format": {
    "bold": false,
    "italic": false,
    "backgroundColor": "#ffffff"
  },
  "metadata": {
    "lastModified": "2026-03-17T10:30:00Z",
    "modifiedBy": "user_123"
  }
}
```

### Update Cell

```http
PUT /spreadsheets/{spreadsheetId}/cells/{cellId}
```

**Request Body:**

```json
{
  "value": "New Value",
  "formula": "=SUM(B1:B10)",
  "format": {
    "bold": true,
    "fontSize": 14
  }
}
```

**Response:**

```json
{
  "cellId": "A1",
  "value": "New Value",
  "formula": "=SUM(B1:B10)",
  "format": {
    "bold": true,
    "fontSize": 14
  },
  "computedValue": 150,
  "metadata": {
    "lastModified": "2026-03-17T10:35:00Z",
    "modifiedBy": "user_123"
  }
}
```

### Batch Update Cells

```http
POST /spreadsheets/{spreadsheetId}/cells/batch
```

**Request Body:**

```json
{
  "updates": [
    {
      "cellId": "A1",
      "value": "Value 1"
    },
    {
      "cellId": "A2",
      "value": "Value 2"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "updated": 2,
  "failed": 0,
  "results": [
    {
      "cellId": "A1",
      "status": "updated"
    },
    {
      "cellId": "A2",
      "status": "updated"
    }
  ]
}
```

### Get Cell Range

```http
GET /spreadsheets/{spreadsheetId}/ranges/{range}
```

**Parameters:**

| Name | Type | Location | Description |
|------|------|----------|-------------|
| range | string | path | Range reference (e.g., "A1:B10") |

**Response:**

```json
{
  "range": "A1:B10",
  "values": [
    ["A1", "B1"],
    ["A2", "B2"],
    ...
  ],
  "formats": [...],
  "metadata": {
    "rowCount": 10,
    "columnCount": 2
  }
}
```

---

## Agent API

### Create Agent

```http
POST /spreadsheets/{spreadsheetId}/agents
```

**Request Body:**

```json
{
  "cellId": "A1",
  "type": "SENSOR",
  "config": {
    "model": "deepseek-chat",
    "seed": "Monitor temperature changes",
    "trigger": {
      "type": "data_change",
      "conditions": {
        "threshold": 100
      }
    },
    "equipment": ["MEMORY", "REASONING"]
  }
}
```

**Response:**

```json
{
  "agentId": "agent_abc123",
  "cellId": "A1",
  "type": "SENSOR",
  "state": "DORMANT",
  "config": {
    "model": "deepseek-chat",
    "seed": "Monitor temperature changes",
    "trigger": { ... },
    "equipment": ["MEMORY", "REASONING"]
  },
  "createdAt": "2026-03-17T10:30:00Z",
  "createdBy": "user_123"
}
```

### Get Agent

```http
GET /spreadsheets/{spreadsheetId}/agents/{agentId}
```

**Response:**

```json
{
  "agentId": "agent_abc123",
  "cellId": "A1",
  "type": "SENSOR",
  "state": "THINKING",
  "config": { ... },
  "execution": {
    "lastRun": "2026-03-17T10:35:00Z",
    "duration": 2500,
    "result": "Temperature within normal range"
  },
  "equipment": [
    {
      "type": "MEMORY",
      "status": "equipped",
      "lastUsed": "2026-03-17T10:35:00Z"
    }
  ],
  "metadata": {
    "createdAt": "2026-03-17T10:30:00Z",
    "updatedAt": "2026-03-17T10:35:00Z"
  }
}
```

### Update Agent

```http
PUT /spreadsheets/{spreadsheetId}/agents/{agentId}
```

**Request Body:**

```json
{
  "config": {
    "seed": "Updated monitoring behavior",
    "equipment": ["MEMORY", "REASONING", "CONSENSUS"]
  }
}
```

### Delete Agent

```http
DELETE /spreadsheets/{spreadsheetId}/agents/{agentId}
```

**Response:**

```json
{
  "success": true,
  "message": "Agent deleted successfully",
  "agentId": "agent_abc123"
}
```

### Trigger Agent

```http
POST /spreadsheets/{spreadsheetId}/agents/{agentId}/trigger
```

**Request Body:**

```json
{
  "context": {
    "manual": true,
    "reason": "User requested execution"
  }
}
```

**Response:**

```json
{
  "executionId": "exec_xyz789",
  "agentId": "agent_abc123",
  "state": "THINKING",
  "startedAt": "2026-03-17T10:40:00Z"
}
```

### Get Agent Execution History

```http
GET /spreadsheets/{spreadsheetId}/agents/{agentId}/executions
```

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| limit | number | Number of results (default: 20) |
| offset | number | Pagination offset |
| state | string | Filter by state |
| startDate | string | Filter by start date |
| endDate | string | Filter by end date |

**Response:**

```json
{
  "executions": [
    {
      "executionId": "exec_xyz789",
      "state": "COMPLETED",
      "startedAt": "2026-03-17T10:40:00Z",
      "completedAt": "2026-03-17T10:40:02Z",
      "duration": 2000,
      "result": "Action completed successfully"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Claw API

### Create Claw

```http
POST /claws
```

**Request Body:**

```json
{
  "cellId": "A1",
  "type": "SMP",
  "model": "deepseek-chat",
  "seed": {
    "purpose": "Process moment data",
    "trigger": {
      "type": "data_change",
      "source": "cell_range",
      "range": "B1:B10"
    }
  },
  "equipment": ["MEMORY", "REASONING", "CONSENSUS"],
  "socialConfig": {
    "slaves": ["A2", "A3"],
    "coWorkers": ["A4"],
    "coordinationStrategy": "PARALLEL"
  }
}
```

**Response:**

```json
{
  "clawId": "claw_def456",
  "cellId": "A1",
  "type": "SMP",
  "state": "DORMANT",
  "model": "deepseek-chat",
  "seed": { ... },
  "equipment": ["MEMORY", "REASONING", "CONSENSUS"],
  "socialConfig": { ... },
  "createdAt": "2026-03-17T10:30:00Z"
}
```

### Get Claw

```http
GET /claws/{clawId}
```

**Response:**

```json
{
  "clawId": "claw_def456",
  "cellId": "A1",
  "type": "SMP",
  "state": "THINKING",
  "model": "deepseek-chat",
  "seed": {
    "purpose": "Process moment data",
    "trigger": { ... },
    "learnedBehavior": {
      "patterns": [...],
      "optimized": true
    }
  },
  "equipment": [
    {
      "type": "MEMORY",
      "status": "equipped",
      "usageCount": 15,
      "lastUsed": "2026-03-17T10:35:00Z"
    }
  ],
  "socialConfig": {
    "slaves": [
      {
        "clawId": "claw_ghi789",
        "cellId": "A2",
        "status": "active"
      }
    ],
    "coordinationStrategy": "PARALLEL"
  },
  "statistics": {
    "totalExecutions": 100,
    "successRate": 0.98,
    "avgExecutionTime": 2500
  }
}
```

### Update Claw

```http
PUT /claws/{clawId}
```

**Request Body:**

```json
{
  "equipment": ["MEMORY", "REASONING", "COORDINATION"],
  "socialConfig": {
    "coordinationStrategy": "CONSENSUS"
  }
}
```

### Equip Equipment

```http
POST /claws/{clawId}/equipment
```

**Request Body:**

```json
{
  "equipment": "CONSENSUS",
  "config": {
    "threshold": 0.8,
    "timeout": 5000
  }
}
```

### Unequip Equipment

```http
DELETE /claws/{clawId}/equipment/{equipmentType}
```

**Response:**

```json
{
  "success": true,
  "muscleMemoryTriggers": [
    {
      "condition": "consensus_required",
      "trigger": "multiple_agents_active",
      "autoRequip": true
    }
  ]
}
```

### Coordinate Claws

```http
POST /claws/{clawId}/coordinate
```

**Request Body:**

```json
{
  "strategy": "PARALLEL",
  "participants": ["claw_ghi789", "claw_jkl012"],
  "aggregationMethod": "MAJORITY_VOTE",
  "timeout": 10000
}
```

**Response:**

```json
{
  "coordinationId": "coord_mno345",
  "strategy": "PARALLEL",
  "participants": [
    {
      "clawId": "claw_ghi789",
      "status": "executing"
    },
    {
      "clawId": "claw_jkl012",
      "status": "executing"
    }
  ],
  "startedAt": "2026-03-17T10:45:00Z"
}
```

---

## Equipment API

### List Available Equipment

```http
GET /equipment
```

**Response:**

```json
{
  "equipment": [
    {
      "type": "MEMORY",
      "name": "Hierarchical Memory",
      "description": "Multi-level memory system for state persistence",
      "slots": 1,
      "cost": {
        "memory": 10,
        "cpu": 5
      }
    },
    {
      "type": "REASONING",
      "name": "Escalation Engine",
      "description": "Decision-making and reasoning system",
      "slots": 1,
      "cost": {
        "memory": 15,
        "cpu": 10
      }
    }
  ]
}
```

### Get Equipment Details

```http
GET /equipment/{equipmentType}
```

**Response:**

```json
{
  "type": "CONSENSUS",
  "name": "Tripartite Consensus",
  "description": "Multi-agent consensus validation",
  "version": "2.0.0",
  "config": {
    "threshold": {
      "type": "number",
      "default": 0.7,
      "min": 0,
      "max": 1
    },
    "timeout": {
      "type": "number",
      "default": 5000,
      "min": 1000,
      "max": 60000
    }
  },
  "requirements": {
    "minAgents": 3,
    "supportedTypes": ["SMP", "SENSOR"]
  }
}
```

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('wss://api.spreadsheetmoment.com/v1/ws', {
  headers: {
    'Authorization': 'Bearer your-api-key'
  }
});
```

### Message Format

```json
{
  "type": "message_type",
  "payload": { ... },
  "timestamp": "2026-03-17T10:30:00Z",
  "messageId": "msg_abc123"
}
```

### Subscribe to Events

```json
{
  "type": "subscribe",
  "channels": [
    "spreadsheet:abc123",
    "agent:agent_xyz",
    "claw:claw_def"
  ]
}
```

### Event Types

| Type | Description | Payload |
|------|-------------|---------|
| `cell_updated` | Cell value changed | `{ cellId, value, oldValue }` |
| `agent_created` | Agent created | `{ agentId, config }` |
| `agent_state_changed` | Agent state changed | `{ agentId, oldState, newState }` |
| `claw_triggered` | Claw execution started | `{ clawId, executionId }` |
| `claw_completed` | Claw execution finished | `{ clawId, result }` |
| `equipment_changed` | Equipment equipped/unequipped | `{ clawId, equipment, action }` |

### Example

```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'agent_state_changed':
      console.log(`Agent ${message.payload.agentId} is now ${message.payload.newState}`);
      break;

    case 'claw_completed':
      console.log(`Claw execution result:`, message.payload.result);
      break;
  }
};
```

---

## Batch Operations

### Execute Batch

```http
POST /batch
```

**Request Body:**

```json
{
  "operations": [
    {
      "method": "PUT",
      "path": "/spreadsheets/abc123/cells/A1",
      "body": { "value": "Value 1" }
    },
    {
      "method": "POST",
      "path": "/spreadsheets/abc123/agents",
      "body": {
        "cellId": "B1",
        "type": "SENSOR",
        "config": { "seed": "Test" }
      }
    }
  ],
  "options": {
    "atomic": false,
    "stopOnError": true
  }
}
```

**Response:**

```json
{
  "batchId": "batch_xyz",
  "status": "completed",
  "results": [
    {
      "index": 0,
      "status": 200,
      "body": { "cellId": "A1", "value": "Value 1" }
    },
    {
      "index": 1,
      "status": 201,
      "body": { "agentId": "agent_abc", ... }
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

---

## Search and Filter

### Search Cells

```http
GET /spreadsheets/{spreadsheetId}/search
```

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| q | string | Search query |
| type | string | Filter by content type |
| range | string | Limit search to range |
| caseSensitive | boolean | Case-sensitive search |

**Response:**

```json
{
  "results": [
    {
      "cellId": "A5",
      "value": "Hello World",
      "highlights": ["<mark>Hello</mark> World"],
      "score": 0.95
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 20,
    "offset": 0
  }
}
```

### Filter Agents

```http
GET /spreadsheets/{spreadsheetId}/agents
```

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| type | string | Filter by type |
| state | string | Filter by state |
| equipment | string | Filter by equipment |
| createdAfter | string | Filter by creation date |

---

## Export and Import

### Export Spreadsheet

```http
GET /spreadsheets/{spreadsheetId}/export
```

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| format | string | Export format (xlsx, csv, json) |
| includeAgents | boolean | Include agent configurations |
| includeEquipment | boolean | Include equipment data |

**Response:**

Binary file download with appropriate Content-Type header.

### Import Spreadsheet

```http
POST /spreadsheets/{spreadsheetId}/import
```

**Request:** Multipart form data with file

**Response:**

```json
{
  "success": true,
  "imported": {
    "cells": 100,
    "agents": 5,
    "equipment": 10
  },
  "warnings": [
    "Agent A1 skipped: invalid configuration"
  ]
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { SpreadsheetMomentClient } from '@spreadsheetmoment/sdk';

const client = new SpreadsheetMomentClient({
  apiKey: process.env.SPREADSHEETMOMENT_API_KEY
});

// Create spreadsheet
const spreadsheet = await client.spreadsheets.create({
  name: 'My Spreadsheet'
});

// Update cell
await client.cells.update(spreadsheet.id, 'A1', {
  value: 'Hello World'
});

// Create agent
const agent = await client.agents.create(spreadsheet.id, {
  cellId: 'A1',
  type: 'SENSOR',
  config: {
    seed: 'Monitor changes'
  }
});

// Subscribe to events
client.ws.subscribe(`spreadsheet:${spreadsheet.id}`, (event) => {
  console.log('Event:', event);
});
```

### Python

```python
from spreadsheetmoment import Client

client = Client(api_key='your-api-key')

# Create spreadsheet
spreadsheet = client.spreadsheets.create(name='My Spreadsheet')

# Update cell
client.cells.update(spreadsheet.id, 'A1', value='Hello World')

# Create agent
agent = client.agents.create(
    spreadsheet.id,
    cell_id='A1',
    type='SENSOR',
    config={'seed': 'Monitor changes'}
)
```

---

## Changelog

### v1.0.0 (2026-03-17)
- Initial production release
- Complete Cell, Agent, Claw, and Equipment APIs
- WebSocket real-time updates
- Batch operations support
- Comprehensive error handling

---

## Support

- **Documentation:** https://docs.spreadsheetmoment.com
- **API Status:** https://status.spreadsheetmoment.com
- **Support Email:** api-support@spreadsheetmoment.com
- **GitHub Issues:** https://github.com/SuperInstance/spreadsheet-moment/issues

---

**License:** Apache 2.0
**Copyright:** SuperInstance Team
