# Spreadsheet Moment - API Documentation

**Version:** 2.0.0
**Base URL:** `https://api.spreadsheet-moment.example.com`
**Last Updated:** March 15, 2026

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [GraphQL API](#graphql-api)
- [REST API](#rest-api)
- [WebSocket API](#websocket-api)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Overview

Spreadsheet Moment provides three API interfaces:

1. **GraphQL API** - Primary interface for cell operations
2. **REST API** - Traditional RESTful endpoints
3. **WebSocket API** - Real-time subscriptions

All APIs use JSON for request/response bodies and support CORS for cross-origin requests.

---

## Authentication

### Authentication Methods

**JWT Token Authentication (Recommended):**

```bash
curl -X POST https://api.spreadsheet-moment.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900,
  "token_type": "Bearer"
}
```

**Using the Token:**

```bash
curl https://api.spreadsheet-moment.example.com/api/v2/cells \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### OAuth2

**Google OAuth:**

```bash
curl https://api.spreadsheet-moment.example.com/auth/google \
  -H "Content-Type: application/json" \
  -d '{"code": "google-oauth-code"}'
```

**GitHub OAuth:**

```bash
curl https://api.spreadsheet-moment.example.com/auth/github \
  -H "Content-Type: application/json" \
  -d '{"code": "github-oauth-code"}'
```

---

## GraphQL API

### Endpoint

```
POST https://api.spreadsheet-moment.example.com/graphql
```

### Schema

#### Types

**Cell:**

```graphql
type Cell {
  id: ID!
  type: CellType!
  data: JSON!
  state: CellState!
  connections: [Connection!]!
  behavior: Behavior
  context: Context
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum CellType {
  PREDICTOR
  CONTROLLER
  MONITOR
  CONSENSUS
  IO
}

enum CellState {
  INITIALIZING
  ACTIVE
  PAUSED
  ERROR
  TERMINATED
}

type Behavior {
  add: Function
  predict: Function
  control: Function
  monitor: Function
}

type Context {
  precision: String
  confidence: Float
  timeout: Int
}

type Connection {
  id: ID!
  type: ConnectionType!
  source: String!
  target: String!
  config: JSON!
}

enum ConnectionType {
  HTTP
  WEBSOCKET
  SERIAL
  GPIO
  FILE
}
```

#### Queries

**Get Cell:**

```graphql
query GetCell($id: ID!) {
  cell(id: $id) {
    id
    type
    data
    state
    connections {
      id
      type
      source
      target
    }
  }
}
```

**Variables:**

```json
{
  "id": "cell_123abc"
}
```

**Response:**

```json
{
  "data": {
    "cell": {
      "id": "cell_123abc",
      "type": "PREDICTOR",
      "data": {"value": 42},
      "state": "ACTIVE",
      "connections": []
    }
  }
}
```

**List Cells:**

```graphql
query ListCells($filter: CellFilter) {
  cells(filter: $filter) {
    id
    type
    data
    state
  }
}

input CellFilter {
  type: CellType
  state: CellState
  limit: Int
  offset: Int
}
```

**Get Statistics:**

```graphql
query GetStatistics {
  statistics {
    totalCells
    activeCells
    errorCells
    averageUptime
  }
}
```

#### Mutations

**Create Cell:**

```graphql
mutation CreateCell($input: CreateCellInput!) {
  createCell(input: $input) {
    id
    type
    data
    state
  }
}

input CreateCellInput {
  type: CellType!
  data: JSON!
  behavior: BehaviorInput
  context: ContextInput
}

input BehaviorInput {
  add: String
  predict: String
  control: String
  monitor: String
}

input ContextInput {
  precision: String
  confidence: Float
  timeout: Int
}
```

**Variables:**

```json
{
  "input": {
    "type": "PREDICTOR",
    "data": {"value": 42},
    "context": {
      "precision": "high",
      "confidence": 0.98
    }
  }
}
```

**Update Cell:**

```graphql
mutation UpdateCell($id: ID!, $input: UpdateCellInput!) {
  updateCell(id: $id, input: $input) {
    id
    data
    state
    updatedAt
  }
}

input UpdateCellInput {
  data: JSON
  state: CellState
}
```

**Delete Cell:**

```graphql
mutation DeleteCell($id: ID!) {
  deleteCell(id: $id)
}
```

**Create Connection:**

```graphql
mutation CreateConnection($input: CreateConnectionInput!) {
  createConnection(input: $input) {
    id
    type
    source
    target
  }
}

input CreateConnectionInput {
  type: ConnectionType!
  source: String!
  target: String!
  config: JSON!
}
```

#### Subscriptions

**Cell Updated:**

```graphql
subscription CellUpdated($id: ID!) {
  cellUpdated(id: $id) {
    id
    data
    state
    updatedAt
  }
}
```

**Connection Event:**

```graphql
subscription ConnectionEvents($cellId: ID!) {
  connectionEvents(cellId: $cellId) {
    id
    type
    data
    timestamp
  }
}
```

---

## REST API

### Base URL

```
https://api.spreadsheet-moment.example.com/api/v2
```

### Endpoints

#### Cells

**List Cells:**

```http
GET /api/v2/cells
```

**Query Parameters:**
- `type` (optional): Filter by cell type
- `state` (optional): Filter by cell state
- `limit` (optional): Maximum results (default: 50)
- `offset` (optional): Results offset (default: 0)

**Response:**

```json
{
  "cells": [
    {
      "id": "cell_123abc",
      "type": "PREDICTOR",
      "data": {"value": 42},
      "state": "ACTIVE",
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:05:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

**Create Cell:**

```http
POST /api/v2/cells
```

**Request Body:**

```json
{
  "type": "PREDICTOR",
  "data": {"value": 42},
  "behavior": {
    "predict": "return data.value * 2"
  },
  "context": {
    "precision": "high",
    "confidence": 0.98
  }
}
```

**Response:** `201 Created`

```json
{
  "id": "cell_123abc",
  "type": "PREDICTOR",
  "data": {"value": 42},
  "state": "INITIALIZING",
  "createdAt": "2026-03-15T10:00:00Z",
  "updatedAt": "2026-03-15T10:00:00Z"
}
```

**Get Cell:**

```http
GET /api/v2/cells/{cell_id}
```

**Response:** `200 OK`

```json
{
  "id": "cell_123abc",
  "type": "PREDICTOR",
  "data": {"value": 42},
  "state": "ACTIVE",
  "connections": [],
  "behavior": {
    "predict": "return data.value * 2"
  },
  "context": {
    "precision": "high",
    "confidence": 0.98
  },
  "createdAt": "2026-03-15T10:00:00Z",
  "updatedAt": "2026-03-15T10:05:00Z"
}
```

**Update Cell:**

```http
PATCH /api/v2/cells/{cell_id}
```

**Request Body:**

```json
{
  "data": {"value": 100},
  "state": "ACTIVE"
}
```

**Response:** `200 OK`

```json
{
  "id": "cell_123abc",
  "data": {"value": 100},
  "state": "ACTIVE",
  "updatedAt": "2026-03-15T10:10:00Z"
}
```

**Delete Cell:**

```http
DELETE /api/v2/cells/{cell_id}
```

**Response:** `204 No Content`

#### Connections

**List Connections:**

```http
GET /api/v2/cells/{cell_id}/connections
```

**Response:** `200 OK`

```json
{
  "connections": [
    {
      "id": "conn_456def",
      "type": "HTTP",
      "source": "cell_123abc",
      "target": "https://api.example.com/data",
      "config": {
        "interval": 1000
      }
    }
  ]
}
```

**Create Connection:**

```http
POST /api/v2/cells/{cell_id}/connections
```

**Request Body:**

```json
{
  "type": "HTTP",
  "target": "https://api.example.com/data",
  "config": {
    "method": "GET",
    "interval": 1000,
    "headers": {
      "Authorization": "Bearer token"
    }
  }
}
```

**Response:** `201 Created`

```json
{
  "id": "conn_456def",
  "type": "HTTP",
  "source": "cell_123abc",
  "target": "https://api.example.com/data",
  "config": {
    "method": "GET",
    "interval": 1000
  }
}
```

**Delete Connection:**

```http
DELETE /api/v2/cells/{cell_id}/connections/{connection_id}
```

**Response:** `204 No Content`

#### Templates

**List Templates:**

```http
GET /api/v2/templates
```

**Response:** `200 OK`

```json
{
  "templates": [
    {
      "id": "tpl_789ghi",
      "name": "Predictor Cell",
      "description": "A cell that predicts future values",
      "type": "PREDICTOR",
      "config": {
        "data": {"value": 0},
        "behavior": {
          "predict": "return data.value + 1"
        }
      }
    }
  ]
}
```

**Create Cell from Template:**

```http
POST /api/v2/templates/{template_id}/cells
```

**Request Body:**

```json
{
  "data": {"value": 42}
}
```

**Response:** `201 Created`

```json
{
  "id": "cell_123abc",
  "type": "PREDICTOR",
  "data": {"value": 42},
  "state": "ACTIVE"
}
```

#### Health

**Health Check:**

```http
GET /health
```

**Response:** `200 OK`

```json
{
  "status": "healthy",
  "timestamp": "2026-03-15T10:00:00Z",
  "version": "2.0.0"
}
```

**Readiness Check:**

```http
GET /ready
```

**Response:** `200 OK`

```json
{
  "ready": true,
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "io_drivers": "healthy"
  }
}
```

---

## WebSocket API

### Connection

**Endpoint:**

```
wss://api.spreadsheet-moment.example.com/ws
```

**Authentication:**

```javascript
const ws = new WebSocket('wss://api.spreadsheet-moment.example.com/ws');

// Send authentication message
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your-jwt-token'
}));
```

### Events

**Cell Updated:**

```json
{
  "type": "cell.updated",
  "data": {
    "id": "cell_123abc",
    "data": {"value": 100},
    "state": "ACTIVE",
    "updatedAt": "2026-03-15T10:10:00Z"
  }
}
```

**Connection Event:**

```json
{
  "type": "connection.event",
  "data": {
    "id": "conn_456def",
    "cellId": "cell_123abc",
    "type": "HTTP",
    "data": {"value": 42},
    "timestamp": "2026-03-15T10:10:00Z"
  }
}
```

**Error Event:**

```json
{
  "type": "error",
  "data": {
    "message": "Cell processing failed",
    "code": "CELL_ERROR",
    "cellId": "cell_123abc",
    "timestamp": "2026-03-15T10:10:00Z"
  }
}
```

### Commands

**Subscribe to Cell:**

```json
{
  "type": "subscribe",
  "channel": "cell",
  "cellId": "cell_123abc"
}
```

**Unsubscribe from Cell:**

```json
{
  "type": "unsubscribe",
  "channel": "cell",
  "cellId": "cell_123abc"
}
```

**Update Cell:**

```json
{
  "type": "update",
  "cellId": "cell_123abc",
  "data": {"value": 100}
}
```

---

## Rate Limiting

### Rate Limits

| Plan | Requests | Window |
|------|----------|--------|
| Free | 100 | 15 minutes |
| Pro | 1,000 | 15 minutes |
| Enterprise | 10,000 | 15 minutes |

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1647360000
```

### Rate Limit Error

**Response:** `429 Too Many Requests`

```json
{
  "error": "Rate limit exceeded",
  "limit": 100,
  "remaining": 0,
  "reset": 1647360000
}
```

---

## Error Handling

### Error Format

All errors follow this format:

```json
{
  "error": {
    "code": "CELL_NOT_FOUND",
    "message": "Cell with ID 'cell_123abc' not found",
    "details": {
      "cellId": "cell_123abc"
    },
    "timestamp": "2026-03-15T10:00:00Z"
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_REQUEST` | 400 | Invalid request format |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `CELL_NOT_FOUND` | 404 | Cell does not exist |
| `CONNECTION_NOT_FOUND` | 404 | Connection does not exist |
| `CELL_EXISTS` | 409 | Cell already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |

### HTTP Status Codes

| Status | Description |
|--------|-------------|
| `200 OK` | Request successful |
| `201 Created` | Resource created |
| `204 No Content` | Request successful, no content returned |
| `400 Bad Request` | Invalid request |
| `401 Unauthorized` | Authentication required |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Resource not found |
| `409 Conflict` | Resource conflict |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Server error |

---

## Examples

### Python Example

```python
import requests
import websocket
import json

# REST API Example
def create_cell():
    url = "https://api.spreadsheet-moment.example.com/api/v2/cells"
    headers = {
        "Authorization": "Bearer your-token",
        "Content-Type": "application/json"
    }
    data = {
        "type": "PREDICTOR",
        "data": {"value": 42},
        "context": {
            "precision": "high",
            "confidence": 0.98
        }
    }
    response = requests.post(url, headers=headers, json=data)
    return response.json()

# WebSocket Example
def subscribe_cell(cell_id):
    url = "wss://api.spreadsheet-moment.example.com/ws"
    ws = websocket.WebSocket()
    ws.connect(url)

    # Authenticate
    ws.send(json.dumps({
        "type": "auth",
        "token": "your-token"
    }))

    # Subscribe
    ws.send(json.dumps({
        "type": "subscribe",
        "channel": "cell",
        "cellId": cell_id
    }))

    # Listen for updates
    while True:
        message = ws.recv()
        data = json.loads(message)
        print(f"Cell update: {data}")
```

### JavaScript Example

```javascript
// REST API Example
async function createCell() {
  const response = await fetch('https://api.spreadsheet-moment.example.com/api/v2/cells', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'PREDICTOR',
      data: { value: 42 },
      context: {
        precision: 'high',
        confidence: 0.98
      }
    })
  });
  return await response.json();
}

// GraphQL Example
async function getCell(id) {
  const query = `
    query GetCell($id: ID!) {
      cell(id: $id) {
        id
        type
        data
        state
      }
    }
  `;

  const response = await fetch('https://api.spreadsheet-moment.example.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables: { id }
    })
  });
  return await response.json();
}

// WebSocket Example
function subscribeCell(cellId) {
  const ws = new WebSocket('wss://api.spreadsheet-moment.example.com/ws');

  ws.onopen = () => {
    // Authenticate
    ws.send(JSON.stringify({
      type: 'auth',
      token: 'your-token'
    }));

    // Subscribe
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'cell',
      cellId
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Cell update:', data);
  };
}
```

### cURL Example

```bash
# Create Cell
curl -X POST https://api.spreadsheet-moment.example.com/api/v2/cells \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PREDICTOR",
    "data": {"value": 42},
    "context": {
      "precision": "high",
      "confidence": 0.98
    }
  }'

# Get Cell
curl https://api.spreadsheet-moment.example.com/api/v2/cells/cell_123abc \
  -H "Authorization: Bearer your-token"

# Update Cell
curl -X PATCH https://api.spreadsheet-moment.example.com/api/v2/cells/cell_123abc \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {"value": 100}
  }'

# Delete Cell
curl -X DELETE https://api.spreadsheet-moment.example.com/api/v2/cells/cell_123abc \
  -H "Authorization: Bearer your-token"
```

---

## Best Practices

### Pagination

For large result sets, use pagination:

```graphql
query ListCells($limit: Int!, $offset: Int!) {
  cells(limit: $limit, offset: $offset) {
    id
    type
    data
  }
}
```

### Batching

Use GraphQL batching for multiple requests:

```graphql
query BatchOperations {
  cell1: cell(id: "cell_1") {
    id
    data
  }
  cell2: cell(id: "cell_2") {
    id
    data
  }
  cell3: cell(id: "cell_3") {
    id
    data
  }
}
```

### Caching

Implement caching for frequently accessed data:

```javascript
// Cache cell data for 5 minutes
const cache = new Map();

async function getCachedCell(cellId) {
  const cached = cache.get(cellId);
  if (cached && Date.now() - cached.timestamp < 300000) {
    return cached.data;
  }

  const data = await getCell(cellId);
  cache.set(cellId, {
    data,
    timestamp: Date.now()
  });
  return data;
}
```

### Error Handling

Always handle errors gracefully:

```javascript
try {
  const cell = await createCell();
  console.log('Cell created:', cell);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    console.log('Rate limited, retry later');
  } else if (error.code === 'CELL_EXISTS') {
    console.log('Cell already exists');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Conclusion

This API documentation covers all major endpoints and operations for the Spreadsheet Moment platform. For additional help:

- See [Examples](#examples) for code samples
- Check [Error Handling](#error-handling) for troubleshooting
- Review [Rate Limiting](#rate-limiting) for usage limits

---

**Document Version:** 2.0.0
**Last Updated:** March 15, 2026
**Maintained By:** Spreadsheet Moment API Team
