# SuperInstance REST API Design

## Overview
RESTful API for managing SuperInstance cells in the POLLN system. Each endpoint supports rate-based change mechanics, confidence tracking, and origin-centric references.

## Base URL
```
https://api.superinstance.ai/v1
```

## Authentication
- API Key: `X-API-Key` header
- JWT Bearer Token: `Authorization: Bearer <token>`
- Rate limiting: 100 requests/minute per API key

## Common Headers
```
Content-Type: application/json
X-API-Key: <your-api-key>
Accept: application/json
```

## Error Responses
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {},
    "timestamp": "2026-03-11T12:00:00Z"
  }
}
```

## API Endpoints

### 1. SuperInstance Management

#### GET `/instances`
List all SuperInstances with optional filtering.

**Query Parameters:**
- `type` (optional): Filter by instance type (data_block, process, api, etc.)
- `state` (optional): Filter by instance state (running, idle, error, etc.)
- `spreadsheetId` (optional): Filter by spreadsheet ID
- `limit` (optional, default: 50): Maximum number of instances to return
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "instances": [
    {
      "id": "instance-123",
      "type": "data_block",
      "name": "Sales Data",
      "description": "Quarterly sales data",
      "state": "running",
      "cellPosition": {"row": 1, "col": 1, "sheet": "Sheet1"},
      "spreadsheetId": "spreadsheet-456",
      "createdAt": "2026-03-11T10:00:00Z",
      "updatedAt": "2026-03-11T10:05:00Z",
      "confidenceScore": 0.95,
      "confidenceZone": "GREEN"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### POST `/instances`
Create a new SuperInstance.

**Request Body:**
```json
{
  "type": "data_block",
  "name": "New Data Instance",
  "description": "Description of the instance",
  "cellPosition": {
    "row": 1,
    "col": 1,
    "sheet": "Sheet1"
  },
  "spreadsheetId": "spreadsheet-456",
  "configuration": {
    "resources": {
      "cpu": 10,
      "memory": 100,
      "storage": 1000,
      "network": 10
    },
    "constraints": {
      "maxRuntime": 60000,
      "maxMemory": 500,
      "networkQuota": 100,
      "allowedOperations": ["read", "write"],
      "disallowedOperations": ["delete"]
    },
    "policies": {
      "isolationLevel": "partial",
      "dataEncryption": true,
      "auditLogging": true,
      "backupFrequency": 60,
      "retentionPeriod": 30
    }
  },
  "capabilities": ["read", "write", "storage"],
  "initialData": {}
}
```

**Response:**
```json
{
  "instance": {
    "id": "instance-123",
    "type": "data_block",
    "name": "New Data Instance",
    "description": "Description of the instance",
    "state": "initialized",
    "cellPosition": {"row": 1, "col": 1, "sheet": "Sheet1"},
    "spreadsheetId": "spreadsheet-456",
    "createdAt": "2026-03-11T10:00:00Z",
    "updatedAt": "2026-03-11T10:00:00Z",
    "configuration": {},
    "confidenceScore": 1.0,
    "confidenceZone": "GREEN"
  },
  "rateState": {
    "currentValue": {},
    "rateOfChange": {
      "value": 0,
      "acceleration": 0,
      "timestamp": "2026-03-11T10:00:00Z",
      "confidence": 1.0
    },
    "lastUpdate": "2026-03-11T10:00:00Z"
  }
}
```

#### GET `/instances/{instanceId}`
Get details of a specific SuperInstance.

**Response:**
```json
{
  "instance": {
    "id": "instance-123",
    "type": "data_block",
    "name": "Sales Data",
    "description": "Quarterly sales data",
    "state": "running",
    "cellPosition": {"row": 1, "col": 1, "sheet": "Sheet1"},
    "spreadsheetId": "spreadsheet-456",
    "createdAt": "2026-03-11T10:00:00Z",
    "updatedAt": "2026-03-11T10:05:00Z",
    "configuration": {},
    "capabilities": ["read", "write", "storage"],
    "permissions": {},
    "confidenceScore": 0.95,
    "confidenceZone": "GREEN"
  },
  "metrics": {
    "cpuUsage": 15.5,
    "memoryUsage": 45.2,
    "diskUsage": 120.8,
    "networkIn": 1024,
    "networkOut": 512,
    "requestCount": 150,
    "errorRate": 0.02,
    "latency": {
      "p50": 45,
      "p90": 120,
      "p95": 200,
      "p99": 500,
      "max": 1000
    }
  },
  "rateState": {
    "currentValue": {},
    "rateOfChange": {
      "value": 0.5,
      "acceleration": 0.1,
      "timestamp": "2026-03-11T10:05:00Z",
      "confidence": 0.9
    },
    "lastUpdate": "2026-03-11T10:05:00Z"
  }
}
```

#### PUT `/instances/{instanceId}`
Update a SuperInstance configuration.

**Request Body:**
```json
{
  "name": "Updated Instance Name",
  "description": "Updated description",
  "configuration": {
    "resources": {
      "cpu": 20,
      "memory": 200
    }
  }
}
```

**Response:** Updated instance details.

#### DELETE `/instances/{instanceId}`
Terminate and remove a SuperInstance.

**Response:**
```json
{
  "success": true,
  "message": "Instance terminated successfully",
  "terminatedAt": "2026-03-11T10:10:00Z"
}
```

### 2. Instance Lifecycle Management

#### POST `/instances/{instanceId}/activate`
Activate a SuperInstance.

**Response:**
```json
{
  "success": true,
  "state": "running",
  "activatedAt": "2026-03-11T10:06:00Z"
}
```

#### POST `/instances/{instanceId}/deactivate`
Deactivate a SuperInstance.

**Response:**
```json
{
  "success": true,
  "state": "idle",
  "deactivatedAt": "2026-03-11T10:07:00Z"
}
```

#### POST `/instances/{instanceId}/terminate`
Terminate a SuperInstance (forceful shutdown).

**Response:**
```json
{
  "success": true,
  "state": "terminated",
  "terminatedAt": "2026-03-11T10:08:00Z"
}
```

### 3. Rate-Based Change Operations

#### POST `/instances/{instanceId}/rate/update`
Update rate-based state tracking.

**Request Body:**
```json
{
  "value": 42.5,
  "timestamp": "2026-03-11T10:09:00Z",
  "confidence": 0.95
}
```

**Response:**
```json
{
  "rateState": {
    "currentValue": 42.5,
    "rateOfChange": {
      "value": 2.5,
      "acceleration": 0.1,
      "timestamp": "2026-03-11T10:09:00Z",
      "confidence": 0.95
    },
    "lastUpdate": "2026-03-11T10:09:00Z"
  },
  "confidenceScore": 0.92,
  "confidenceZone": "GREEN",
  "deadbandTriggered": false
}
```

#### POST `/instances/{instanceId}/rate/predict`
Predict future state based on current rate.

**Request Body:**
```json
{
  "atTime": "2026-03-11T10:15:00Z"
}
```

**Response:**
```json
{
  "predictedValue": 57.5,
  "predictionTime": "2026-03-11T10:15:00Z",
  "confidence": 0.85,
  "basedOnRate": {
    "value": 2.5,
    "acceleration": 0.1,
    "timestamp": "2026-03-11T10:09:00Z"
  }
}
```

#### GET `/instances/{instanceId}/rate/history`
Get rate change history.

**Query Parameters:**
- `startTime` (optional): Start timestamp
- `endTime` (optional): End timestamp
- `limit` (optional, default: 100): Maximum data points

**Response:**
```json
{
  "history": [
    {
      "timestamp": "2026-03-11T10:00:00Z",
      "value": 40.0,
      "rate": 2.0,
      "acceleration": 0.0,
      "confidence": 1.0
    },
    {
      "timestamp": "2026-03-11T10:05:00Z",
      "value": 42.5,
      "rate": 2.5,
      "acceleration": 0.1,
      "confidence": 0.95
    }
  ],
  "total": 2
}
```

### 4. Message Passing Between Instances

#### POST `/instances/{instanceId}/messages`
Send a message to a SuperInstance.

**Request Body:**
```json
{
  "type": "data",
  "recipient": "instance-456",
  "payload": {
    "operation": "update",
    "data": {"sales": 15000}
  },
  "priority": "normal",
  "ttl": 30000
}
```

**Response:**
```json
{
  "messageId": "msg-789",
  "status": "sent",
  "sentAt": "2026-03-11T10:10:00Z",
  "estimatedDelivery": "2026-03-11T10:10:01Z"
}
```

#### GET `/instances/{instanceId}/messages`
Get messages for an instance.

**Query Parameters:**
- `type` (optional): Filter by message type
- `status` (optional): Filter by status (pending, delivered, read)
- `limit` (optional, default: 50): Maximum messages
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-789",
      "type": "data",
      "sender": "instance-123",
      "recipient": "instance-456",
      "payload": {},
      "timestamp": "2026-03-11T10:10:00Z",
      "status": "delivered",
      "priority": "normal"
    }
  ],
  "total": 1,
  "unread": 0
}
```

### 5. Instance Connections

#### POST `/instances/{instanceId}/connections`
Create a connection to another instance.

**Request Body:**
```json
{
  "targetInstanceId": "instance-456",
  "connectionType": "data_flow",
  "bandwidth": 1000,
  "latency": 10,
  "reliability": 0.99
}
```

**Response:**
```json
{
  "connection": {
    "id": "conn-abc",
    "source": "instance-123",
    "target": "instance-456",
    "type": "data_flow",
    "bandwidth": 1000,
    "latency": 10,
    "reliability": 0.99,
    "establishedAt": "2026-03-11T10:11:00Z",
    "status": "active"
  }
}
```

#### GET `/instances/{instanceId}/connections`
Get all connections for an instance.

**Response:**
```json
{
  "connections": [
    {
      "id": "conn-abc",
      "source": "instance-123",
      "target": "instance-456",
      "type": "data_flow",
      "bandwidth": 1000,
      "latency": 10,
      "reliability": 0.99,
      "establishedAt": "2026-03-11T10:11:00Z",
      "status": "active"
    }
  ],
  "total": 1
}
```

#### DELETE `/instances/{instanceId}/connections/{connectionId}`
Disconnect from another instance.

**Response:**
```json
{
  "success": true,
  "disconnectedAt": "2026-03-11T10:12:00Z"
}
```

### 6. System Monitoring

#### GET `/system/status`
Get overall system status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-11T10:13:00Z",
  "instances": {
    "total": 150,
    "byType": {
      "data_block": 50,
      "process": 30,
      "api": 20,
      "learning_agent": 10,
      "terminal": 5,
      "other": 35
    },
    "byState": {
      "running": 100,
      "idle": 30,
      "error": 5,
      "terminated": 15
    }
  },
  "resources": {
    "totalCPU": 1500,
    "usedCPU": 850,
    "totalMemory": 15000,
    "usedMemory": 9200,
    "totalStorage": 50000,
    "usedStorage": 32000
  },
  "performance": {
    "averageLatency": 45,
    "errorRate": 0.02,
    "throughput": 1500
  }
}
```

#### GET `/system/metrics`
Get detailed system metrics.

**Query Parameters:**
- `timeRange` (optional): Time range (1h, 24h, 7d, 30d)
- `metric` (optional): Specific metric to retrieve

**Response:**
```json
{
  "metrics": {
    "cpuUsage": [
      {"timestamp": "2026-03-11T10:00:00Z", "value": 45.2},
      {"timestamp": "2026-03-11T10:05:00Z", "value": 47.8}
    ],
    "memoryUsage": [
      {"timestamp": "2026-03-11T10:00:00Z", "value": 65.3},
      {"timestamp": "2026-03-11T10:05:00Z", "value": 67.1}
    ],
    "requestRate": [
      {"timestamp": "2026-03-11T10:00:00Z", "value": 150},
      {"timestamp": "2026-03-11T10:05:00Z", "value": 165}
    ],
    "errorRate": [
      {"timestamp": "2026-03-11T10:00:00Z", "value": 0.02},
      {"timestamp": "2026-03-11T10:05:00Z", "value": 0.018}
    ]
  },
  "timeRange": "1h",
  "dataPoints": 12
}
```

### 7. Confidence Cascade Operations

#### GET `/instances/{instanceId}/confidence`
Get confidence metrics for an instance.

**Response:**
```json
{
  "confidenceScore": 0.92,
  "confidenceZone": "GREEN",
  "history": [
    {"timestamp": "2026-03-11T10:00:00Z", "score": 1.0, "zone": "GREEN"},
    {"timestamp": "2026-03-11T10:05:00Z", "score": 0.95, "zone": "GREEN"},
    {"timestamp": "2026-03-11T10:10:00Z", "score": 0.92, "zone": "GREEN"}
  ],
  "factors": {
    "dataQuality": 0.95,
    "updateFrequency": 0.90,
    "errorRate": 0.98,
    "neighborConsensus": 0.85
  }
}
```

#### POST `/instances/{instanceId}/confidence/adjust`
Manually adjust confidence score.

**Request Body:**
```json
{
  "adjustment": 0.05,
  "reason": "manual_calibration",
  "notes": "Increasing confidence based on recent performance"
}
```

**Response:**
```json
{
  "previousScore": 0.92,
  "newScore": 0.97,
  "previousZone": "GREEN",
  "newZone": "GREEN",
  "adjustedAt": "2026-03-11T10:14:00Z"
}
```

### 8. WebSocket API

#### WebSocket Endpoint: `wss://api.superinstance.ai/v1/ws`

**Connection:**
```javascript
const ws = new WebSocket('wss://api.superinstance.ai/v1/ws?apiKey=YOUR_API_KEY');
```

**Message Types:**
1. **Instance Events:** Real-time updates on instance state changes
2. **Rate Updates:** Live rate-based change notifications
3. **Message Delivery:** Real-time message delivery notifications
4. **System Alerts:** System-wide alerts and notifications

**Example Subscription:**
```json
{
  "type": "subscribe",
  "subscriptions": [
    {"resource": "instance", "id": "instance-123", "events": ["state_change", "rate_update"]},
    {"resource": "system", "events": ["alert", "metric_update"]}
  ]
}
```

## Rate Limiting
- **Tier 1 (Free):** 100 requests/minute, 10 concurrent instances
- **Tier 2 (Pro):** 1000 requests/minute, 100 concurrent instances
- **Tier 3 (Enterprise):** 10000 requests/minute, unlimited instances

## Error Codes
- `400`: Bad Request - Invalid input parameters
- `401`: Unauthorized - Missing or invalid API key
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource not found
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side error
- `503`: Service Unavailable - System maintenance or overload

## Versioning
API version is included in the URL path (`/v1/`). Breaking changes will result in a new version number.

## Deprecation Policy
Endpoints will be deprecated with 6 months notice before removal. Deprecated endpoints will return a `Deprecation` header.