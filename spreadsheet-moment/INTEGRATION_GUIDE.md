# Spreadsheet-Moment Integration Guide

**Comprehensive guide for integrating with Spreadsheet-Moment**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![docs](https://img.shields.io/badge/docs-rigorous-blue)](docs/)
[![TypeScript](https://img.shields.io/badge/typescript-5.7%2B-blue)](https://www.typescriptlang.org/)

**Repository:** https://github.com/SuperInstance/spreadsheet-moment
**Last Updated:** 2026-03-18
**Version:** 0.1.0

---

## Table of Contents

1. [Overview](#overview)
2. [API Integration](#api-integration)
3. [WebSocket Integration](#websocket-integration)
4. [Claw Agent Integration](#claw-agent-integration)
5. [Third-Party Integrations](#third-party-integrations)
6. [Webhooks](#webhooks)
7. [Authentication](#authentication)
8. [Examples](#examples)

---

## Overview

### Integration Types

Spreadsheet-Moment supports multiple integration patterns:

```
┌─────────────────────────────────────────────────────────────┐
│              SPREADSHEET-MOMENT INTEGRATION                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  REST API    │  │  WebSocket   │  │   Webhooks   │     │
│  │  Integration │  │  Integration │  │  Integration │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│          │                 │                 │              │
│          └─────────────────┼─────────────────┘              │
│                            ▼                                │
│                   ┌──────────────┐                          │
│                   │ Spreadsheet- │                          │
│                   │   Moment     │                          │
│                   └──────────────┘                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Integration Benefits

**For Developers:**
- RESTful API for CRUD operations
- Real-time updates via WebSocket
- Webhook notifications for events
- OAuth 2.0 authentication
- Comprehensive SDK support

**For Users:**
- Seamless data synchronization
- Automated workflows
- Real-time collaboration
- Custom integrations
- Extended functionality

---

## API Integration

### Getting Started

**Base URL:**
```
Production: https://api.spreadsheet-moment.com
Staging: https://staging-api.spreadsheet-moment.com
Development: http://localhost:8080
```

### Authentication

**OAuth 2.0 Flow:**
```javascript
// 1. Redirect user to authorization URL
const authUrl = `https://api.spreadsheet-moment.com/oauth/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=read write`;

window.location.href = authUrl;

// 2. Handle callback
const code = new URLSearchParams(window.location.search).get('code');

// 3. Exchange code for access token
const response = await fetch('https://api.spreadsheet-moment.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
  }),
});

const { access_token } = await response.json();
```

**Using Access Token:**
```javascript
const response = await fetch('https://api.spreadsheet-moment.com/api/v1/sheets', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json',
  },
});
```

### Core API Operations

**Create Sheet:**
```javascript
const sheet = await fetch('https://api.spreadsheet-moment.com/api/v1/sheets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'My Integration Sheet',
    columns: [
      { id: 'A', title: 'Name', type: 'text' },
      { id: 'B', title: 'Value', type: 'number' },
      { id: 'C', title: 'Date', type: 'date' },
    ],
  }),
}).then(r => r.json());
```

**Read Sheet:**
```javascript
const sheet = await fetch(
  `https://api.spreadsheet-moment.com/api/v1/sheets/${sheetId}`,
  {
    headers: {
      'Authorization': `Bearer ${access_token}`,
    },
  }
).then(r => r.json());
```

**Update Cell:**
```javascript
const cell = await fetch(
  `https://api.spreadsheet-moment.com/api/v1/sheets/${sheetId}/cells/A1`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value: 'Hello World',
      format: {
        bold: true,
        color: '#FF0000',
      },
    }),
  }
).then(r => r.json());
```

**Batch Operations:**
```javascript
const result = await fetch(
  `https://api.spreadsheet-moment.com/api/v1/sheets/${sheetId}/cells/batch`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operations: [
        { cellId: 'A1', value: 'Name' },
        { cellId: 'B1', value: 'Value' },
        { cellId: 'A2', value: 'John' },
        { cellId: 'B2', value: 42 },
      ],
    }),
  }
).then(r => r.json());
```

---

## WebSocket Integration

### Connection

**Establish Connection:**
```javascript
const ws = new WebSocket(
  `wss://api.spreadsheet-moment.com/ws?token=${access_token}`
);

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};
```

### Subscriptions

**Subscribe to Sheet Updates:**
```javascript
ws.send(JSON.stringify({
  action: 'subscribe',
  resource: 'sheet',
  id: sheetId,
}));

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'cell_updated':
      console.log('Cell updated:', message.cellId, message.value);
      break;
    case 'row_inserted':
      console.log('Row inserted:', message.rowIndex);
      break;
    case 'sheet_deleted':
      console.log('Sheet deleted:', message.sheetId);
      break;
  }
};
```

**Subscribe to Multiple Sheets:**
```javascript
ws.send(JSON.stringify({
  action: 'subscribe',
  resource: 'sheet',
  ids: [sheetId1, sheetId2, sheetId3],
}));
```

### Real-time Collaboration

**Cursor Position:**
```javascript
// Broadcast cursor position
ws.send(JSON.stringify({
  action: 'cursor',
  sheetId: sheetId,
  cellId: 'A1',
  userId: currentUserId,
}));

// Receive other users' cursors
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'cursor') {
    displayCursor(message.userId, message.cellId);
  }
};
```

**Multi-user Editing:**
```javascript
// Send edit
ws.send(JSON.stringify({
  action: 'edit',
  sheetId: sheetId,
  cellId: 'A1',
  value: 'New Value',
  userId: currentUserId,
}));

// Receive edit
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'edit') {
    if (message.userId !== currentUserId) {
      applyEdit(message.cellId, message.value);
    }
  }
};
```

---

## Claw Agent Integration

### Agent Configuration

**Create Claw Agent:**
```javascript
const agent = await fetch(
  'https://api.spreadsheet-moment.com/api/v1/claw/agents',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 'monitoring-agent',
      cellId: 'A1',
      model: 'gpt-4',
      equipment: ['MEMORY', 'REASONING'],
      triggers: [
        {
          source: 'B1',
          condition: 'value > 100',
          action: 'alert',
        },
      ],
    }),
  }
).then(r => r.json());
```

### Agent Communication

**Send Message to Agent:**
```javascript
ws.send(JSON.stringify({
  action: 'agent_message',
  agentId: 'monitoring-agent',
  message: {
    type: 'trigger',
    data: { value: 150 },
  },
}));
```

**Receive Agent Response:**
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'agent_response') {
    console.log('Agent response:', message.response);

    // Update sheet with agent response
    updateCell(message.cellId, message.response);
  }
};
```

### Agent Triggers

**Configure Triggers:**
```javascript
const trigger = await fetch(
  `https://api.spreadsheet-moment.com/api/v1/claw/agents/${agentId}/triggers`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'B2',
      condition: 'value != null',
      action: 'analyze',
    }),
  }
).then(r => r.json());
```

**Handle Trigger Events:**
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'agent_trigger') {
    console.log('Trigger fired:', message.trigger);

    // Process trigger
    processTrigger(message.trigger);
  }
};
```

---

## Third-Party Integrations

### Google Sheets Integration

**Import from Google Sheets:**
```javascript
const importJob = await fetch(
  'https://api.spreadsheet-moment.com/api/v1/integrations/google-sheets/import',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      spreadsheetId: '1BxiMvs0XRA5nFMdKbBdB_3lfs',
      range: 'Sheet1!A1:Z1000',
    }),
  }
).then(r => r.json());
```

**Export to Google Sheets:**
```javascript
const exportJob = await fetch(
  `https://api.spreadsheet-moment.com/api/v1/integrations/google-sheets/export`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sheetId: sheetId,
      spreadsheetId: '1BxiMvs0XRA5nFMdKbBdB_3lfs',
      range: 'Sheet1!A1',
    }),
  }
).then(r => r.json());
```

### Microsoft Excel Integration

**Import Excel File:**
```javascript
const formData = new FormData();
formData.append('file', excelFile);

const importJob = await fetch(
  'https://api.spreadsheet-moment.com/api/v1/integrations/excel/import',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
    },
    body: formData,
  }
).then(r => r.json());
```

**Export to Excel:**
```javascript
const exportJob = await fetch(
  `https://api.spreadsheet-moment.com/api/v1/integrations/excel/export`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sheetId: sheetId,
      format: 'xlsx',
    }),
  }
).then(r => r.json());

// Download file
window.location.href = exportJob.downloadUrl;
```

### Database Integration

**Import from Database:**
```javascript
const importJob = await fetch(
  'https://api.spreadsheet-moment.com/api/v1/integrations/database/import',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      connection: {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'mydb',
        username: 'user',
        password: 'pass',
      },
      query: 'SELECT * FROM users',
      sheetId: sheetId,
    }),
  }
).then(r => r.json());
```

---

## Webhooks

### Webhook Configuration

**Create Webhook:**
```javascript
const webhook = await fetch(
  'https://api.spreadsheet-moment.com/api/v1/webhooks',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://your-app.com/webhooks/spreadsheet',
      events: ['cell.updated', 'row.inserted', 'sheet.deleted'],
      secret: 'webhook-secret-key',
    }),
  }
).then(r => r.json());
```

### Webhook Events

**Cell Updated Event:**
```json
{
  "event": "cell.updated",
  "timestamp": "2026-03-18T10:30:00Z",
  "sheetId": "sheet-123",
  "cellId": "A1",
  "oldValue": "Old Value",
  "newValue": "New Value",
  "userId": "user-456"
}
```

**Row Inserted Event:**
```json
{
  "event": "row.inserted",
  "timestamp": "2026-03-18T10:30:00Z",
  "sheetId": "sheet-123",
  "rowIndex": 5,
  "userId": "user-456"
}
```

**Sheet Deleted Event:**
```json
{
  "event": "sheet.deleted",
  "timestamp": "2026-03-18T10:30:00Z",
  "sheetId": "sheet-123",
  "userId": "user-456"
}
```

### Webhook Handler

**Express.js Example:**
```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();

app.post('/webhooks/spreadsheet', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;

  // Verify signature
  const hmac = crypto.createHmac('sha256', 'webhook-secret-key');
  hmac.update(payload);
  const digest = hmac.digest('hex');

  if (signature !== digest) {
    return res.status(401).send('Invalid signature');
  }

  // Parse event
  const event = JSON.parse(payload);

  // Handle event
  switch (event.event) {
    case 'cell.updated':
      handleCellUpdated(event);
      break;
    case 'row.inserted':
      handleRowInserted(event);
      break;
    case 'sheet.deleted':
      handleSheetDeleted(event);
      break;
  }

  res.sendStatus(200);
});

app.listen(3000);
```

---

## Authentication

### OAuth 2.0 Scopes

**Available Scopes:**
- `read` - Read spreadsheets
- `write` - Modify spreadsheets
- `delete` - Delete spreadsheets
- `admin` - Administrative operations
- `claw` - Claw agent management

**Request Scopes:**
```javascript
const authUrl = `https://api.spreadsheet-moment.com/oauth/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent('read write claw')}`;
```

### API Key Authentication

**Create API Key:**
```javascript
const apiKey = await fetch(
  'https://api.spreadsheet-moment.com/api/v1/api-keys',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'My Integration',
      scopes: ['read', 'write'],
    }),
  }
).then(r => r.json());
```

**Use API Key:**
```javascript
const response = await fetch('https://api.spreadsheet-moment.com/api/v1/sheets', {
  headers: {
    'X-API-Key': apiKey.key,
    'Content-Type': 'application/json',
  },
});
```

---

## Examples

### Complete Integration Example

```javascript
class SpreadsheetMomentClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.spreadsheet-moment.com/api/v1';
    this.ws = null;
  }

  async createSheet(name, columns) {
    const response = await fetch(`${this.baseUrl}/sheets`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, columns }),
    });

    return response.json();
  }

  async getSheet(sheetId) {
    const response = await fetch(`${this.baseUrl}/sheets/${sheetId}`, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    return response.json();
  }

  async updateCell(sheetId, cellId, value) {
    const response = await fetch(
      `${this.baseUrl}/sheets/${sheetId}/cells/${cellId}`,
      {
        method: 'PATCH',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      }
    );

    return response.json();
  }

  connectWebSocket(onMessage) {
    this.ws = new WebSocket(
      `wss://api.spreadsheet-moment.com/ws?api_key=${this.apiKey}`
    );

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message);
    };

    return this.ws;
  }

  subscribe(sheetId) {
    this.ws.send(
      JSON.stringify({
        action: 'subscribe',
        resource: 'sheet',
        id: sheetId,
      })
    );
  }
}

// Usage
const client = new SpreadsheetMomentClient(API_KEY);

// Create sheet
const sheet = await client.createSheet('My Sheet', [
  { id: 'A', title: 'Name', type: 'text' },
  { id: 'B', title: 'Value', type: 'number' },
]);

// Connect WebSocket
client.connectWebSocket((message) => {
  console.log('Received:', message);
});

// Subscribe to updates
client.subscribe(sheet.id);

// Update cell
await client.updateCell(sheet.id, 'A1', 'Hello');
```

---

**Last Updated:** 2026-03-18
**Version:** 0.1.0
**Contributors:** See [CONTRIBUTORS.md](CONTRIBUTORS.md)
