# API Overview

Complete API reference for POLLN's client SDK, server API, and WebSocket interface.

## Table of Contents

- [Client SDK](#client-sdk) - TypeScript/JavaScript client library
- [Server API](#server-api) - REST API endpoints
- [WebSocket API](#websocket-api) - Real-time communication
- [Type Definitions](#type-definitions) - TypeScript types

---

## Client SDK

The official TypeScript/JavaScript client for interacting with POLLN colonies.

### Installation

```bash
npm install polln
```

### Basic Usage

```typescript
import { Colony, LogCell, TransformCell } from 'polln'

// Create a colony
const colony = new Colony('my-colony')

// Add cells
const cell = new LogCell('A1', { initialValue: 100 })
colony.addCell(cell)

// Start the colony
await colony.start()

// Update cells
await cell.update(200)

// Stop the colony
await colony.stop()
```

---

## Core Classes

### Colony

Manages a collection of cells and their lifecycle.

#### Constructor

```typescript
new Colony(id: string, config?: ColonyConfig)
```

#### Configuration

```typescript
interface ColonyConfig {
  maxSize?: number
  communication?: CommunicationConfig
  persistence?: PersistenceConfig
  monitoring?: MonitoringConfig
}
```

#### Methods

##### `start()`

Start the colony and all cells.

```typescript
await colony.start()
```

##### `stop()`

Stop the colony gracefully.

```typescript
await colony.stop()
```

##### `addCell(cell)`

Add a cell to the colony.

```typescript
colony.addCell(cell: Cell): void
```

##### `removeCell(id)`

Remove a cell from the colony.

```typescript
colony.removeCell(id: string): void
```

##### `getCell(id)`

Get a cell by ID.

```typescript
const cell = colony.getCell(id: string): Cell | undefined
```

##### `updateCell(id, value)`

Update a cell's value.

```typescript
await colony.updateCell(id: string, value: any): Promise<void>
```

##### `getCells()`

Get all cells in the colony.

```typescript
const cells = colony.getCells(): Map<string, Cell>
```

---

### Cell

Base class for all cell types.

#### Properties

```typescript
class Cell {
  id: string
  state: CellState
  config: CellConfig
  head: CellHead
  body: CellBody
  tail: CellTail
}
```

#### Methods

##### `update(value)`

Update the cell's value.

```typescript
await cell.update(value: any): Promise<void>
```

##### `getState()`

Get the current state.

```typescript
const state = cell.getState(): CellState
```

##### `getHistory()`

Get value history.

```typescript
const history = cell.getHistory(): HistoryEntry[]
```

##### `reset()`

Reset to initial value.

```typescript
cell.reset(): void
```

---

## Server API

REST API for managing colonies and cells.

### Base URL

```
http://localhost:3000/api
```

### Authentication

Most endpoints require authentication:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/colonies
```

---

### Endpoints

#### Colony Endpoints

##### List Colonies

```http
GET /api/colonies
```

**Response:**

```json
{
  "colonies": [
    {
      "id": "my-colony",
      "size": 10,
      "status": "running",
      "createdAt": "2024-03-09T12:00:00Z"
    }
  ]
}
```

##### Create Colony

```http
POST /api/colonies
Content-Type: application/json

{
  "id": "my-colony",
  "config": {
    "maxSize": 100
  }
}
```

**Response:**

```json
{
  "id": "my-colony",
  "status": "created"
}
```

##### Get Colony

```http
GET /api/colonies/:id
```

**Response:**

```json
{
  "id": "my-colony",
  "size": 10,
  "status": "running",
  "cells": ["cell1", "cell2", ...]
}
```

##### Delete Colony

```http
DELETE /api/colonies/:id
```

**Response:**

```json
{
  "status": "deleted"
}
```

##### Start Colony

```http
POST /api/colonies/:id/start
```

##### Stop Colony

```http
POST /api/colonies/:id/stop
```

---

#### Cell Endpoints

##### List Cells

```http
GET /api/colonies/:id/cells
```

##### Create Cell

```http
POST /api/colonies/:id/cells
Content-Type: application/json

{
  "id": "cell1",
  "type": "LogCell",
  "config": {
    "initialValue": 100
  }
}
```

##### Get Cell

```http
GET /api/colonies/:id/cells/:cellId
```

##### Update Cell

```http
PUT /api/colonies/:id/cells/:cellId
Content-Type: application/json

{
  "value": 200
}
```

##### Delete Cell

```http
DELETE /api/colonies/:id/cells/:cellId
```

---

## WebSocket API

Real-time bidirectional communication with colonies.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws')

ws.onopen = () => {
  console.log('Connected to POLLN')
}
```

### Authentication

Send authentication message after connecting:

```javascript
ws.send(JSON.stringify({
  type: 'auth',
  token: 'YOUR_TOKEN'
}))
```

### Messages

#### Client → Server

##### Subscribe to Colony

```json
{
  "type": "subscribe",
  "colony": "my-colony"
}
```

##### Update Cell

```json
{
  "type": "update",
  "colony": "my-colony",
  "cell": "cell1",
  "value": 200
}
```

##### Get Cell State

```json
{
  "type": "get",
  "colony": "my-colony",
  "cell": "cell1"
}
```

#### Server → Client

##### Cell Update

```json
{
  "type": "update",
  "colony": "my-colony",
  "cell": "cell1",
  "value": 200,
  "timestamp": "2024-03-09T12:00:00Z"
}
```

##### Cell Alert

```json
{
  "type": "alert",
  "colony": "my-colony",
  "cell": "cell1",
  "alert": "threshold_exceeded",
  "message": "Value exceeded threshold"
}
```

##### Error

```json
{
  "type": "error",
  "message": "Cell not found",
  "code": "CELL_NOT_FOUND"
}
```

### Example Usage

```javascript
const ws = new WebSocket('ws://localhost:3000/ws')

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'YOUR_TOKEN'
  }))

  // Subscribe to colony
  ws.send(JSON.stringify({
    type: 'subscribe',
    colony: 'my-colony'
  }))
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)

  switch (message.type) {
    case 'update':
      console.log(`Cell ${message.cell} updated:`, message.value)
      break
    case 'alert':
      console.log(`Alert from ${message.cell}:`, message.message)
      break
    case 'error':
      console.error('Error:', message.message)
      break
  }
}

// Update a cell
function updateCell(cellId, value) {
  ws.send(JSON.stringify({
    type: 'update',
    colony: 'my-colony',
    cell: cellId,
    value: value
  }))
}
```

---

## Type Definitions

### Core Types

```typescript
interface CellState {
  value: any
  timestamp: Date
  version: number
  metadata?: Record<string, any>
}

interface CellConfig {
  initialValue?: any
  head?: HeadConfig
  body?: BodyConfig
  tail?: TailConfig
}

interface HeadConfig {
  sensation?: SensationType
  threshold?: number
  sources?: string[]
  debounce?: number
}

interface BodyConfig {
  analyzer?: AnalyzerType
  rules?: Rule[]
  learning?: LearningConfig
}

interface TailConfig {
  action?: ActionType
  targets?: string[]
  format?: string
}
```

### Sensation Types

```typescript
type SensationType =
  | 'absolute_change'
  | 'rate_of_change'
  | 'acceleration'
  | 'presence'
  | 'pattern'
  | 'anomaly'

interface SensationConfig {
  type: SensationType
  threshold?: number
  window?: number
  method?: string
}
```

### Action Types

```typescript
type ActionType =
  | 'notify'
  | 'update'
  | 'trigger'
  | 'store'
  | 'log'
  | 'none'

interface ActionConfig {
  type: ActionType
  targets?: string[]
  format?: string
  condition?: string
}
```

### Colony Types

```typescript
interface ColonyConfig {
  maxSize?: number
  communication?: CommunicationConfig
  persistence?: PersistenceConfig
  monitoring?: MonitoringConfig
}

interface CommunicationConfig {
  protocol: 'websocket' | 'http'
  heartbeat: number
}

interface PersistenceConfig {
  enabled: boolean
  store: 'memory' | 'redis' | 'database'
  ttl?: number
}

interface MonitoringConfig {
  enabled: boolean
  metrics?: boolean
  traces?: boolean
  logs?: boolean
}
```

---

## Error Handling

### Error Codes

| Code | Description |
|------|-------------|
| `COLONY_NOT_FOUND` | Colony does not exist |
| `CELL_NOT_FOUND` | Cell does not exist |
| `INVALID_CONFIG` | Invalid cell configuration |
| `THRESHOLD_EXCEEDED` | Sensation threshold exceeded |
| `AUTH_FAILED` | Authentication failed |
| `PERMISSION_DENIED` | Insufficient permissions |

### Error Response

```json
{
  "error": {
    "code": "CELL_NOT_FOUND",
    "message": "Cell 'cell1' not found in colony 'my-colony'",
    "details": {}
  }
}
```

### Handling Errors

```typescript
try {
  await colony.updateCell('cell1', 200)
} catch (error) {
  if (error.code === 'CELL_NOT_FOUND') {
    console.error('Cell does not exist')
  } else {
    console.error('Unknown error:', error.message)
  }
}
```

---

## Rate Limiting

API requests are rate-limited:

- **Default**: 100 requests per minute
- **WebSocket**: 10 messages per second

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1646832000
```

---

## Pagination

List endpoints support pagination:

```http
GET /api/colonies?page=1&limit=20
```

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## Next Steps

- [Type Definitions](./types) - Complete type reference
- [Examples](../../examples/) - API usage examples
- [Advanced Topics](../advanced/) - Performance, security

---

**Need help?** Join our [Discord community](https://discord.gg/polln) or check [Examples](../../examples/)!
