# MVP System Architecture

**How the Minimal Working MVP is structured**

---

## Overview

This document explains the architecture of the **Minimal Working MVP** - a simplified system that demonstrates cellular agents in spreadsheet cells.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Demo HTML   │  │   curl CLI   │  │   Browser    │         │
│  │  (demo.html) │  │  (API calls) │  │  (DevTools)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MINIMAL CLAW SERVER                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Express.js API                         │ │
│  │  • REST endpoints                                         │ │
│  │  • WebSocket server                                       │ │
│  │  • CORS middleware                                        │ │
│  │  • JSON parsing                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                 Agent State Manager                        │ │
│  │  • In-memory agent storage (Map)                          │ │
│  │  • Cell-to-agent mapping (Map)                            │ │
│  │  • State machine (IDLE → THINKING → ACTING)               │ │
│  │  • Equipment management                                   │ │
│  │  • Trigger handling                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              SPREADSHEET-CLAW INTEGRATION (Library)              │
│  • ClawClient (REST API client)                                 │
│  • ClawWebSocketClient (WebSocket client)                       │
│  • StateSynchronizer (Bidirectional sync)                       │
│  • DataTransformer (Cell ↔ Agent data)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Minimal CLAW Server

**File**: `src/index.js`

**Technology Stack**:
- Node.js 18+
- Express.js 4.18+
- ws (WebSocket) 8.x
- UUID 9.x
- CORS 2.8+

**Responsibilities**:
- Host REST API
- Host WebSocket server
- Manage agent state
- Handle cell-to-agent mapping
- Broadcast state changes

**Key Data Structures**:

```javascript
// Agent storage
const agents = new Map();
// Key: agentId (UUID)
// Value: agent object

// Cell-to-agent mapping
const cellToAgentMap = new Map();
// Key: "sheetId:row:col"
// Value: agentId

// WebSocket clients
const wsClients = new Set();
// Value: WebSocket connection
```

**Agent Object**:

```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  model: "deepseek-chat",
  seed: "Monitor cell A1",
  equipment: ["MEMORY", "REASONING"],
  trigger: {
    type: "data",
    source: "spreadsheet"
  },
  state: "IDLE",
  cellId: {
    sheetId: "sheet1",
    row: 0,
    col: 0
  },
  createdAt: "2026-03-18T12:00:00Z",
  updatedAt: "2026-03-18T12:00:00Z",
  stateHistory: [
    { state: "IDLE", timestamp: "2026-03-18T12:00:00Z" }
  ]
}
```

---

### 2. State Machine

**Agent States**:

```javascript
const AgentState = {
  IDLE: 'IDLE',
  THINKING: 'ACTING',
  ACTING: 'ACTING',
  EQUIPPING: 'EQUIPPING',
  UNEQUIPPING: 'UNEQUIPPING',
  ERROR: 'ERROR'
};
```

**State Transitions**:

```
     ┌─────────┐
     │  IDLE   │ ◄──────┐
     └────┬────┘        │
          │             │
          │ trigger     │ complete
          ▼             │
    ┌───────────┐       │
    │ THINKING  │       │
    └─────┬─────┘       │
          │             │
          │ decide      │
          ▼             │
    ┌───────────┐       │
    │  ACTING   │───────┘
    └─────┬─────┘
          │
          │ complete
          ▼
     ┌─────────┐
     │  IDLE   │
     └─────────┘
```

**Implementation**:

```javascript
async function triggerAgent(agentId, data = {}) {
  const agent = agents.get(agentId);

  if (!agent) {
    throw new Error('Agent not found');
  }

  if (agent.state !== AgentState.IDLE) {
    throw new Error('Agent is not idle');
  }

  // Transition to THINKING
  const oldState = agent.state;
  agent.state = AgentState.THINKING;
  agent.stateHistory.push({
    state: AgentState.THINKING,
    timestamp: new Date().toISOString()
  });

  broadcastAgentStateChange(agentId, oldState, AgentState.THINKING);

  // Simulate thinking (in real implementation, this would call AI)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Transition to ACTING
  agent.state = AgentState.ACTING;
  agent.stateHistory.push({
    state: AgentState.ACTING,
    timestamp: new Date().toISOString()
  });

  broadcastAgentStateChange(agentId, AgentState.THINKING, AgentState.ACTING);

  // Simulate acting
  await new Promise(resolve => setTimeout(resolve, 500));

  // Transition back to IDLE
  agent.state = AgentState.IDLE;
  agent.stateHistory.push({
    state: AgentState.IDLE,
    timestamp: new Date().toISOString()
  });

  broadcastAgentStateChange(agentId, AgentState.ACTING, AgentState.IDLE);

  return agent;
}
```

---

### 3. Equipment System

**Equipment Slots**:

```javascript
const EquipmentSlot = {
  MEMORY: 'MEMORY',
  REASONING: 'REASONING',
  CONSENSUS: 'CONSENSUS',
  SPREADSHEET: 'SPREADSHEET',
  DISTILLATION: 'DISTILLATION',
  COORDINATION: 'COORDINATION'
};
```

**Equipment Management**:

```javascript
function equipAgent(agentId, equipment) {
  const agent = agents.get(agentId);

  if (!agent) {
    throw new Error('Agent not found');
  }

  // Validate equipment
  const validEquipment = Object.values(EquipmentSlot);
  for (const eq of equipment) {
    if (!validEquipment.includes(eq)) {
      throw new Error(`Invalid equipment: ${eq}`);
    }
  }

  // Add equipment (avoid duplicates)
  for (const eq of equipment) {
    if (!agent.equipment.includes(eq)) {
      agent.equipment.push(eq);
    }
  }

  return agent;
}

function unequipAgent(agentId, equipment) {
  const agent = agents.get(agentId);

  if (!agent) {
    throw new Error('Agent not found');
  }

  // Remove equipment
  agent.equipment = agent.equipment.filter(eq => !equipment.includes(eq));

  return agent;
}
```

---

### 4. WebSocket System

**Connection Handling**:

```javascript
wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  wsClients.add(ws);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      // Handle subscription to agent updates
      if (message.type === 'SUBSCRIBE' && message.agentId) {
        ws.agentId = message.agentId;
        ws.send(JSON.stringify({
          type: 'SUBSCRIBED',
          agentId: message.agentId,
          timestamp: new Date().toISOString(),
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    wsClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});
```

**Broadcasting**:

```javascript
function broadcastAgentStateChange(agentId, oldState, newState) {
  const message = {
    type: 'AGENT_STATE_CHANGE',
    agentId,
    oldState,
    newState,
    timestamp: new Date().toISOString(),
  };

  // Send to all subscribed clients
  wsClients.forEach((ws) => {
    if (ws.agentId === agentId || !ws.agentId) {
      ws.send(JSON.stringify(message));
    }
  });
}
```

---

### 5. Cell Integration

**Cell ID Format**:

```javascript
{
  sheetId: "sheet1",
  row: 0,
  col: 0
}
```

**Cell Key Generation**:

```javascript
function cellToKey(cellId) {
  return `${cellId.sheetId}:${cellId.row}:${cellId.col}`;
}

// Example:
// cellToKey({ sheetId: "sheet1", row: 0, col: 0 })
// Returns: "sheet1:0:0"
```

**Cell-to-Agent Mapping**:

```javascript
function attachAgentToCell(agentId, cellId) {
  const cellKey = cellToKey(cellId);

  // Check if cell is already occupied
  if (cellToAgentMap.has(cellKey)) {
    throw new Error('Cell already has an agent');
  }

  // Attach agent to cell
  cellToAgentMap.set(cellKey, agentId);

  return cellKey;
}

function getAgentByCell(cellId) {
  const cellKey = cellToKey(cellId);
  const agentId = cellToAgentMap.get(cellKey);

  if (!agentId) {
    return null;
  }

  return agents.get(agentId);
}
```

---

### 6. API Endpoints

**Health Check**:

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    agents: agents.size,
  });
});
```

**List Agents**:

```javascript
app.get('/api/v1/agents', (req, res) => {
  const { limit, offset, state } = req.query;

  let agentList = Array.from(agents.values());

  // Filter by state
  if (state) {
    agentList = agentList.filter(agent => agent.state === state);
  }

  // Pagination
  const start = parseInt(offset) || 0;
  const end = start + (parseInt(limit) || agentList.length);
  const paginatedList = agentList.slice(start, end);

  res.json({
    success: true,
    data: {
      agents: paginatedList,
      total: agentList.length,
      limit: parseInt(limit) || agentList.length,
      offset: start,
    },
  });
});
```

**Create Agent**:

```javascript
app.post('/api/v1/agents', (req, res) => {
  const { model, seed, equipment, trigger, cellId } = req.body;

  // Validate required fields
  if (!model || !seed || !equipment || !trigger) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELD',
      },
    });
  }

  // Generate agent ID
  const agentId = uuidv4();

  // Create agent object
  const agent = {
    id: agentId,
    model,
    seed,
    equipment: [...equipment],
    trigger,
    state: AgentState.IDLE,
    cellId: cellId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stateHistory: [
      {
        state: AgentState.IDLE,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  // Store agent
  agents.set(agentId, agent);

  // Attach to cell if provided
  if (cellId) {
    const cellKey = cellToKey(cellId);
    cellToAgentMap.set(cellKey, agentId);
  }

  res.status(201).json({
    success: true,
    data: agent,
  });
});
```

---

### 7. Spreadsheet-Claw Integration Library

**Location**: `C:\Users\casey\polln\spreadsheet-claw-integration\`

**Components**:

**ClawClient** (REST API Client):

```typescript
class ClawClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: { baseUrl: string; apiKey?: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async createAgent(config: CreateAgentConfig): Promise<ClawAgent> {
    const response = await fetch(`${this.baseUrl}/api/v1/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to create agent: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  // ... other methods
}
```

**ClawWebSocketClient** (WebSocket Client):

```typescript
class ClawWebSocketClient extends EventEmitter {
  private ws?: WebSocket;
  private url: string;
  private apiKey?: string;

  constructor(config: { url: string; apiKey?: string }) {
    super();
    this.url = config.url;
    this.apiKey = config.apiKey;
  }

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'SUBSCRIBED':
          this.emit('subscribed', message);
          break;
        case 'AGENT_STATE_CHANGE':
          this.emit('agentStateChange', message);
          break;
        case 'AGENT_DELETED':
          this.emit('agentDeleted', message);
          break;
        case 'ERROR':
          this.emit('error', message.error);
          break;
      }
    };

    this.ws.onclose = () => {
      this.emit('disconnected');
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };
  }

  subscribeToAgent(agentId: string): void {
    this.send({
      type: 'SUBSCRIBE',
      agentId,
    });
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}
```

---

## Data Flow Examples

### Example 1: Creating an Agent

```
Client                    Server                    Storage
  │                         │                          │
  │ POST /api/v1/agents     │                          │
  │────────────────────────>│                          │
  │                         │ validate request         │
  │                         │ generate UUID            │
  │                         │ create agent object      │
  │                         │─────────────────────────>│
  │                         │                          │ agents.set(id, agent)
  │                         │─────────────────────────>│
  │                         │                          │ cellToAgentMap.set(key, id)
  │ 201 Created             │                          │
  │<────────────────────────│                          │
```

### Example 2: Triggering an Agent

```
Client                    Server                  WebSocket
  │                         │                        │
  │ POST /trigger           │                        │
  │────────────────────────>│                        │
  │                         │ check agent state      │
  │                         │ state: IDLE → THINKING │
  │                         │ broadcast()            │
  │                         │───────────────────────>│
  │                         │                        │ AGENT_STATE_CHANGE
  │                         │                        │
  │                         │ simulate thinking      │
  │                         │ state: THINKING → ACTING│
  │                         │ broadcast()            │
  │                         │───────────────────────>│
  │                         │                        │ AGENT_STATE_CHANGE
  │                         │                        │
  │                         │ simulate acting        │
  │                         │ state: ACTING → IDLE   │
  │                         │ broadcast()            │
  │                         │───────────────────────>│
  │                         │                        │ AGENT_STATE_CHANGE
  │                         │                        │
  │ 200 OK                  │                        │
  │<────────────────────────│                        │
```

---

## Technology Choices

### Why Express.js?
- ✅ Simple and lightweight
- ✅ Easy to set up
- ✅ Good for REST APIs
- ✅ Large ecosystem
- ✅ Minimal learning curve

### Why In-Memory Storage?
- ✅ Fast (no database overhead)
- ✅ Simple (no schema needed)
- ✅ Good for MVP/demo
- ❌ Data lost on restart (not production-ready)

### Why WebSocket?
- ✅ Real-time bidirectional communication
- ✅ Low latency
- ✅ Efficient (no polling)
- ✅ Easy to use in browsers

### Why TypeScript for Integration?
- ✅ Type safety
- ✅ Better IDE support
- ✅ Self-documenting
- ✅ Easier refactoring

---

## Limitations

### Current Limitations (MVP)

| Aspect | Limitation | Impact |
|--------|------------|--------|
| **Storage** | In-memory only | Lost on restart |
| **Persistence** | No database | No long-term storage |
| **Security** | No authentication | Anyone can access |
| **Scaling** | Single server | Can't scale horizontally |
| **AI** | Simulated | No real intelligence |
| **Testing** | Manual tests only | No automated tests |

### Future Improvements

**Round 9 - Real AI**:
- Connect to DeepSeek/GPT/Claude
- Actual reasoning and decision-making
- Real intelligence in agents

**Round 10 - Spreadsheet Integration**:
- Connect to spreadsheet-moment
- Real cell value monitoring
- Two-way data flow

**Round 11 - Persistence & Security**:
- Add PostgreSQL database
- Implement authentication
- Add API key validation

**Round 12+ - Advanced Features**:
- Multi-agent coordination
- Seed learning system
- Social architecture

---

## Summary

The MVP architecture is intentionally simple:

1. **Single Server** - One Express.js server handles everything
2. **In-Memory Storage** - Fast but data is lost on restart
3. **State Machine** - Clear agent states and transitions
4. **WebSocket** - Real-time updates for all clients
5. **REST API** - Simple, standard HTTP endpoints

This simplicity makes the MVP:
- ✅ Easy to understand
- ✅ Easy to modify
- ✅ Easy to demonstrate
- ✅ Easy to extend

Future rounds will add persistence, security, scalability, and advanced features while maintaining this clean architecture.

---

**Want to understand the API? Check out the [API Reference](./API_REFERENCE.md)!**
