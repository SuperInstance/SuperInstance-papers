# Google Docs/Sheets Integration Architecture for POLLN

**Vision:** "Self-Deconstructing Spreadsheet Agents" - Every cell contains an agent that forms, learns, and deconstructs based on natural language input.

**Author:** POLLN Integration Architecture Team
**Date:** 2025-03-08
**Status:** Technical Architecture Document
**Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Google Sheets API v4 Analysis](#google-sheets-api-v4-analysis)
3. [Integration Architecture Options](#integration-architecture-options)
4. [Technical Constraints & Solutions](#technical-constraints--solutions)
5. [MVP Implementation Plan](#mvp-implementation-plan)
6. [Other Platform Analysis](#other-platform-analysis)
7. [Code Examples](#code-examples)
8. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### Core Metaphor Mapping

| POLLN Concept | Spreadsheet Element |
|---------------|---------------------|
| **Pollen** | Cell values (JSON data) |
| **Bees** | Active agents in cells |
| **Models** | Agent patterns/formulas |
| **Bots** | Reflex-based cell behaviors |
| **Hive** | The spreadsheet itself |

### Integration Challenge

**Goal:** Users type natural language in cells → Agents form, learn, collaborate → Results appear in cells

**Challenge:** Google Sheets is stateless, batch-oriented, and designed for formulas—not autonomous agents.

**Solution:** Hybrid architecture with:
- **Client-side:** Sheets Add-on (Apps Script) for UI and immediate feedback
- **Server-side:** POLLN WebSocket API for agent orchestration
- **Bridge:** Polling-based synchronization with optimistic UI updates

---

## Google Sheets API v4 Analysis

### Capabilities

#### 1. **Real-Time Collaboration**

Google Sheets DOES support real-time collaboration, but through proprietary channels—not publicly exposed APIs.

```typescript
// What we CAN'T do:
// - Subscribe to cell change events via WebSocket
// - Receive push notifications when users edit cells

// What we CAN do:
// - Poll for changes using drive.changes API
// - Use Apps Script triggers (onEdit, onChange)
// - Batch read/write operations efficiently
```

#### 2. **Batch Operations (Critical for Performance)**

```typescript
// GOOD: Batch operation (1 API call)
const response = await sheets.spreadsheets.values.batchGet({
  spreadsheetId: '...',
  ranges: ['Sheet1!A1:B10', 'Sheet2!C1:D5']
});

// BAD: Individual operations (10 API calls)
for (let i = 1; i <= 10; i++) {
  await sheets.spreadsheets.values.get({
    spreadsheetId: '...',
    range: `Sheet1!A${i}`
  });
}
```

**Key Methods:**
- `spreadsheets.values.batchGet` - Read multiple ranges
- `spreadsheets.values.batchUpdate` - Write multiple ranges
- `spreadsheets.batchUpdate` - Complex operations (format, merge, etc.)

#### 3. **Apps Script Triggers**

```javascript
// Apps Script code (runs in Google's infrastructure)
function onEdit(e) {
  // Triggered when user edits a cell
  const range = e.range;
  const value = range.getValue();

  // Can call external APIs (with limitations)
  const response = UrlFetchApp.fetch('https://polln-api.com/process', {
    method: 'POST',
    payload: JSON.stringify({ cell: range.getA1Notation(), value })
  });
}
```

**Limitations:**
- Execution time limit: 30 seconds (add-ons), 6 minutes (time-driven)
- External API call quotas: 20,000 calls/day
- No WebSocket support
- No persistent background processes

### Key Limitations for Agent Systems

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **No native push notifications** | Can't react instantly to changes | Polling + Apps Script triggers |
| **Stateless execution** | Agents lose memory between runs | Server-side state management |
| **Execution time limits** | Complex agent decisions may timeout | Async processing + status polling |
| **No WebSocket in Apps Script** | Can't maintain persistent connections | External WebSocket server + polling |
| **Quota limits** | Heavy usage hits caps | Batch operations + caching |

---

## Integration Architecture Options

### Option 1: Pure Apps Script (Client-Side Only)

```
┌─────────────────────────────────────────┐
│         Google Sheets UI                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      Apps Script Add-on                 │
│  ┌───────────────────────────────────┐  │
│  │   POLLN Core (transpiled)         │  │
│  │   - Colony                        │  │
│  │   - Agents                        │  │
│  │   - Plinko Decision               │  │
│  │   - Hebbian Learning              │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Spreadsheet Bridge              │  │
│  │   - onEdit trigger                │  │
│  │   - Cell → Agent mapping          │  │
│  │   - Formula parsing               │  │
│  └───────────────────────────────────┘  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     PropertiesService (State)           │
│  - Agent memories                       │
│  - Colony state                         │
│  - Learning synapses                    │
└─────────────────────────────────────────┘
```

**Pros:**
- Simple deployment (no server needed)
- Direct spreadsheet access
- Free tier available

**Cons:**
- 30-second execution limit
- No persistent background processes
- Limited external API calls
- Can't run full POLLN system (too complex)

**Verdict:** ❌ Not viable for full agent system

---

### Option 2: Hybrid (Apps Script + WebSocket Server) ⭐ RECOMMENDED

```
┌─────────────────────────────────────────────────────┐
│              Google Sheets Browser                  │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│         Apps Script Add-on (Client)                 │
│  ┌───────────────────────────────────────────────┐  │
│  │   Cell Detector                                │  │
│  │   - Detects "AGENT:" prefix                    │  │
│  │   - Extracts natural language                  │  │
│  │   - Maps cell → agent ID                       │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │   UI Renderer                                  │  │
│  │   - Shows agent status in sidebar              │  │
│  │   - Displays decision confidence               │  │
│  │   - Agent controls (spawn/kill)                │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │   POLLN Client Library (transpiled TS)        │  │
│  │   - WebSocket client                          │  │
│  │   - Message serialization                     │  │
│  │   - Optimistic UI updates                     │  │
│  └───────────────────────────────────────────────┘  │
└───────────────┬───────────────────────────────────────┘
                │
                │ WebSocket (ws:// or wss://)
                │
                ▼
┌─────────────────────────────────────────────────────┐
│         POLLN WebSocket Server (Node.js)            │
│  ┌───────────────────────────────────────────────┐  │
│  │   Session Manager                             │  │
│  │   - Maps spreadsheet ID → colony              │  │
│  │   - Maintains agent lifecycle                 │  │
│  │   - Handles user authentication               │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │   POLLN Core Engine                           │  │
│  │   - Colony management                         │  │
│  │   - Agent orchestration                       │  │
│  │   - Plinko decision layer                     │  │
│  │   - Hebbian learning                          │  │
│  │   - World model dreaming                      │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │   Spreadsheet Bridge                          │  │
│  │   - Sheets API client                         │  │
│  │   - Batch read/write operations               │  │
│  │   - Cell → Agent synchronization             │  │
│  └───────────────────────────────────────────────┘  │
└───────────────┬───────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│         Persistence Layer                           │
│  - PostgreSQL (agent memories, synapses)            │
│  - Redis (session state, caching)                   │
│  - S3 (world models, dreams)                        │
└─────────────────────────────────────────────────────┘
```

**Data Flow:**

1. **User types in cell:** `"AGENT: Summarize the column to the left"`

2. **Apps Script detects:**
```javascript
function onEdit(e) {
  const cell = e.range;
  const value = cell.getValue();

  if (typeof value === 'string' && value.startsWith('AGENT:')) {
    const agentRequest = {
      spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
      cell: cell.getA1Notation(),
      prompt: value.replace('AGENT:', '').trim(),
      context: {
        sheetName: cell.getSheet().getName(),
        row: cell.getRow(),
        col: cell.getColumn()
      }
    };

    // Send to POLLN server
    pollnClient.spawnAgent(agentRequest);
  }
}
```

3. **POLLN Server processes:**
```typescript
// Server-side agent spawning
async function spawnAgent(request: AgentRequest) {
  // 1. Create agent in colony
  const agent = await colony.spawnAgent({
    type: 'TaskAgent',
    initialObservation: {
      context: request.context,
      prompt: request.prompt
    }
  });

  // 2. Run Plinko decision layer
  const decision = await plinkoLayer.select([
    { agent: agent, proposal: 'interpret_natural_language' },
    { agent: agent, proposal: 'fetch_sheet_context' }
  ], 0.7); // temperature

  // 3. Execute action
  const result = await agent.execute(decision.selected);

  // 4. Write back to spreadsheet
  await sheetsClient.updateCell(request.spreadsheetId, request.cell, {
    value: result.output,
    note: `Agent: ${agent.id}\nConfidence: ${decision.confidence}`,
    color: getConfidenceColor(decision.confidence)
  });
}
```

**Pros:**
- Full POLLN capabilities available
- Real-time agent coordination via WebSocket
- Persistent agent memory
- Scalable to multiple users

**Cons:**
- Requires server deployment
- More complex architecture
- OAuth 2.0 setup needed

**Verdict:** ✅ **Recommended for production**

---

### Option 3: Browser Extension

```
┌─────────────────────────────────────────┐
│         Browser Extension                │
│  ┌───────────────────────────────────┐  │
│  │   Content Script                  │  │
│  │   - Injects into sheets.google.com│  │
│  │   - Detects cell edits            │  │
│  │   - Renders agent UI overlay      │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Background Service Worker       │  │
│  │   - WebSocket client              │  │
│  │   - Message routing               │  │
│  │   - Local caching                 │  │
│  └───────────────────────────────────┘  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         POLLN WebSocket Server           │
│         (Same as Option 2)               │
└─────────────────────────────────────────┘
```

**Pros:**
- Direct DOM manipulation (no Apps Script)
- Can intercept all user actions
- Better performance (no polling)

**Cons:**
- Chrome Web Store approval process
- Updates require store review
- Limited to Chrome/Edge
- Harder to install (users need extension)

**Verdict:** ⚠️ Good for power users, but Apps Script is more accessible

---

## Technical Constraints & Solutions

### 1. Latency: Making Agents Feel Instant

**Problem:** Apps Script execution → Server processing → Sheet update = 500ms+ latency

**Solution:** Optimistic UI + Asynchronous Updates

```javascript
// Apps Script - Immediate feedback
function onEdit(e) {
  const cell = e.range;
  const value = cell.getValue();

  if (isAgentCommand(value)) {
    // IMMEDIATE: Show "thinking" indicator
    cell.setFontColor('#999999')
         .setValue('🤖 Thinking...');

    // ASYNC: Spawn agent in background
    spawnAgentAsync(cell, value)
      .then(result => {
        // Update when ready
        cell.setFontColor('#000000')
             .setValue(result.output);
      });
  }
}

function spawnAgentAsync(cell, prompt) {
  return new Promise((resolve) => {
    // Send to server, poll for result
    const requestId = generateId();
    UrlFetchApp.fetch(POLLN_ENDPOINT + '/spawn', {
      method: 'POST',
      payload: JSON.stringify({
        requestId,
        cell: cell.getA1Notation(),
        prompt
      })
    });

    // Poll for result (every 2 seconds)
    const pollInterval = setInterval(() => {
      const response = UrlFetchApp.fetch(
        POLLN_ENDPOINT + `/result/${requestId}`
      );
      const result = JSON.parse(response.getContentText());

      if (result.complete) {
        clearInterval(pollInterval);
        resolve(result);
      }
    }, 2000);
  });
}
```

**Latency Targets:**
- UI Feedback: < 100ms (optimistic update)
- Agent Spawn: < 500ms (server processing)
- Result Display: < 2s (async update)

---

### 2. State Persistence: Where Agent Memory Lives

**Problem:** Apps Script is stateless—agents forget everything between executions

**Solution:** Server-side state with periodic snapshots

```typescript
// Server-side agent state management
class SpreadsheetColonyManager {
  private colonies: Map<string, Colony> = new Map();

  async getOrCreateColony(spreadsheetId: string): Promise<Colony> {
    // Check cache first
    if (this.colonies.has(spreadsheetId)) {
      return this.colonies.get(spreadsheetId)!;
    }

    // Load from database or create new
    let colonyState = await db.loadColony(spreadsheetId);

    if (!colonyState) {
      colonyState = {
        id: spreadsheetId,
        agents: [],
        synapses: [],
        created: new Date()
      };
    }

    const colony = new Colony(colonyState);
    this.colonies.set(spreadsheetId, colony);

    return colony;
  }

  // Periodic snapshot (every 30 seconds)
  @Cron('*/30 * * * * *')
  async snapshotColonies() {
    for (const [id, colony] of this.colonies.entries()) {
      await db.saveColony(id, colony.getState());
    }
  }
}
```

**Memory Hierarchy:**
1. **Hot Memory (RAM):** Active colonies on server
2. **Warm Memory (Redis):** Session state, recent decisions
3. **Cold Memory (Postgres):** Agent memories, synapses, dreams

---

### 3. Security: Sandbox Boundaries

**Problem:** Agents need spreadsheet access but shouldn't leak data

**Solution:** OAuth 2.0 + Per-Sheet Scoping

```typescript
// OAuth scope configuration
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets', // Full access
  // OR
  'https://www.googleapis.com/auth/spreadsheets.readonly', // Read-only
];

// Per-sheet isolation
class SpreadsheetSecurityContext {
  async authorizeAccess(
    userId: string,
    spreadsheetId: string,
    operation: 'read' | 'write'
  ): Promise<boolean> {
    // Check if user has access
    const hasAccess = await this.userHasAccess(userId, spreadsheetId);
    if (!hasAccess) return false;

    // Create scoped credentials
    const scopedClient = await this.createScopedClient({
      spreadsheetId,
      operation,
      userId
    });

    return true;
  }
}
```

**Security Layers:**
1. **Google OAuth:** User grants Sheets access
2. **Per-Sheet Tokens:** Each spreadsheet gets unique token
3. **Agent Sandboxing:** Agents can't access arbitrary cells
4. **Audit Logging:** All agent actions logged

---

### 4. Scalability: Multiple Users, Multiple Colonies

**Problem:** 100 users with 10 agents each = 1,000 concurrent agents

**Solution:** Distributed coordination + Load balancing

```typescript
// Multi-colony orchestration
class DistributedColonyOrchestrator {
  private loadBalancer: ColonyLoadBalancer;

  async routeAgentRequest(request: AgentRequest): Promise<Agent> {
    // Find or create colony for spreadsheet
    const colonyId = request.spreadsheetId;

    // Check if colony exists
    let colony = await this.findColony(colonyId);

    if (!colony) {
      // Load balance to least loaded server
      const server = await this.loadBalancer.selectServer();
      colony = await server.createColony(colonyId);
    }

    // Spawn agent in colony
    return colony.spawnAgent(request);
  }
}
```

**Scaling Strategy:**
- **Horizontal:** Multiple POLLN servers behind load balancer
- **Vertical:** Colony isolation per spreadsheet
- **Caching:** Redis for shared state
- **Queue:** Kafka for message streaming

---

## MVP Implementation Plan

### Phase 1: Foundation (2 weeks) ⭐⭐⭐

**Goal:** Basic cell → agent communication

**Deliverables:**
1. Apps Script add-on skeleton
2. POLLN WebSocket server (minimal)
3. Cell change detection
4. Agent spawn request/response

**Files:**
```
src/spreadsheet/
├── apps-script/
│   ├── Code.js              # Main add-on code
│   ├── appscript.json       # Add-on manifest
│   └── polln-client.js      # POLLN client library
├── server/
│   ├── SpreadsheetServer.ts # WebSocket server
│   ├── session.ts           # Session management
│   └── sheets-api.ts        # Sheets API client
└── types/
    └── spreadsheet.ts       # Type definitions
```

**Key Code:**

**apps-script/Code.js**
```javascript
/**
 * POLLN Spreadsheet Add-on
 *
 * Detects agent commands in cells and communicates
 * with POLLN WebSocket server.
 */

// Configuration
const POLLN_SERVER_URL = 'ws://localhost:3000';
const AGENT_PREFIX = 'AGENT:';

/**
 * Triggered when user edits a cell
 */
function onEdit(e) {
  const range = e.range;
  const value = range.getValue();

  // Check if this is an agent command
  if (typeof value === 'string' && value.startsWith(AGENT_PREFIX)) {
    handleAgentCommand(range, value);
  }
}

/**
 * Handle agent command in cell
 */
function handleAgentCommand(range, command) {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const cell = range.getA1Notation();
  const prompt = command.replace(AGENT_PREFIX, '').trim();

  // Show loading state
  range.setValue('🤖 Thinking...')
       .setFontColor('#999999')
       .setFontWeight('normal');

  // Create agent request
  const request = {
    type: 'SPAWN_AGENT',
    payload: {
      spreadsheetId,
      cell,
      prompt,
      context: getContext(range)
    }
  };

  // Send to POLLN server
  sendToPollnServer(request);

  // Poll for result
  pollForResult(cell, request.id);
}

/**
 * Get context around cell
 */
function getContext(range) {
  const sheet = range.getSheet();
  return {
    sheetName: sheet.getName(),
    row: range.getRow(),
    col: range.getColumn(),
    // Get nearby cells for context
    above: range.offset(-1, 0).getValue(),
    left: range.offset(0, -1).getValue()
  };
}

/**
 * Send message to POLLN server
 */
function sendToPollnServer(request) {
  // In MVP, use HTTP polling
  // In v2, upgrade to WebSocket

  const endpoint = POLLN_SERVER_URL + '/api/spawn';

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(request),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    return JSON.parse(response.getContentText());
  } catch (error) {
    console.error('Failed to send to POLLN server:', error);
    return { error: error.toString() };
  }
}

/**
 * Poll for agent result
 */
function pollForResult(cell, requestId) {
  const maxAttempts = 30; // 30 seconds max
  let attempts = 0;

  const poll = () => {
    if (attempts >= maxAttempts) {
      cell.setValue('❌ Timeout')
           .setFontColor('#cc0000');
      return;
    }

    const response = UrlFetchApp.fetch(
      POLLN_SERVER_URL + `/api/result/${requestId}`
    );

    const result = JSON.parse(response.getContentText());

    if (result.status === 'complete') {
      // Display result
      cell.setValue(result.output)
           .setFontColor('#000000')
           .setFontWeight('bold')
           .setNote(`Agent: ${result.agentId}\nConfidence: ${result.confidence}%`);
    } else if (result.status === 'failed') {
      cell.setValue('❌ ' + result.error)
           .setFontColor('#cc0000');
    } else {
      // Still processing, poll again
      attempts++;
      Utilities.sleep(1000);
      poll();
    }
  };

  poll();
}

/**
 * Add-on menu
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🐝 POLLN')
    .addItem('📊 Show Agent Status', 'showAgentStatus')
    .addItem('🔄 Refresh Agents', 'refreshAgents')
    .addItem('⚙️ Settings', 'openSettings')
    .addToUi();
}

/**
 * Show agent status in sidebar
 */
function showAgentStatus() {
  const html = HtmlService.createHtmlOutput(`
    <h1>POLLN Agents</h1>
    <div id="agents">
      <p>Loading agents...</p>
    </div>
    <script>
      // Fetch agent status from server
      fetch('/api/agents')
        .then(r => r.json())
        .then(agents => {
          document.getElementById('agents').innerHTML =
            agents.map(a => `
              <div>
                <strong>${a.id}</strong><br>
                Status: ${a.status}<br>
                Cell: ${a.cell}
              </div>
            `).join('');
        });
    </script>
  `);

  SpreadsheetApp.getUi().showSidebar(html);
}
```

**server/SpreadsheetServer.ts**
```typescript
/**
 * POLLN Spreadsheet WebSocket Server
 *
 * Handles WebSocket connections from spreadsheet add-ons,
 * manages agent lifecycles, and coordinates with Sheets API.
 */

import WebSocket, { WebSocketServer } from 'ws';
import { Colony } from '../core/colony.js';
import { TaskAgent } from '../core/agents.js';

interface SpreadsheetSession {
  spreadsheetId: string;
  userId: string;
  socket: WebSocket;
  colony: Colony;
  agents: Map<string, TaskAgent>;
}

export class SpreadsheetServer {
  private wss: WebSocketServer;
  private sessions: Map<string, SpreadsheetSession> = new Map();

  constructor(port: number = 3000) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (socket, request) => {
      this.handleConnection(socket, request);
    });

    console.log(`POLLN Spreadsheet Server listening on port ${port}`);
  }

  private async handleConnection(socket: WebSocket, request: any) {
    // Authenticate session (in MVP, skip auth)
    const spreadsheetId = this.extractSpreadsheetId(request);

    // Create or get colony
    const session = await this.createSession(spreadsheetId, socket);

    socket.on('message', async (data: string) => {
      await this.handleMessage(session, JSON.parse(data));
    });

    socket.on('close', () => {
      this.handleDisconnect(session);
    });
  }

  private async createSession(
    spreadsheetId: string,
    socket: WebSocket
  ): Promise<SpreadsheetSession> {
    // Check if session exists
    if (this.sessions.has(spreadsheetId)) {
      return this.sessions.get(spreadsheetId)!;
    }

    // Create new colony for spreadsheet
    const colony = new Colony({
      id: spreadsheetId,
      config: {
        agentLimit: 100,
        learningRate: 0.1
      }
    });

    const session: SpreadsheetSession = {
      spreadsheetId,
      userId: 'user-' + spreadsheetId, // MVP: simple user ID
      socket,
      colony,
      agents: new Map()
    };

    this.sessions.set(spreadsheetId, session);

    return session;
  }

  private async handleMessage(
    session: SpreadsheetSession,
    message: any
  ) {
    switch (message.type) {
      case 'SPAWN_AGENT':
        await this.spawnAgent(session, message.payload);
        break;

      case 'KILL_AGENT':
        await this.killAgent(session, message.payload.agentId);
        break;

      case 'GET_STATUS':
        await this.sendStatus(session);
        break;
    }
  }

  private async spawnAgent(
    session: SpreadsheetSession,
    payload: any
  ) {
    const { cell, prompt, context } = payload;

    // Create agent
    const agent = await session.colony.spawnAgent({
      type: 'task',
      initialObservation: {
        cell,
        prompt,
        context
      }
    });

    session.agents.set(agent.id, agent);

    // Run agent (in MVP, simple execution)
    const result = await this.executeAgent(agent, prompt);

    // Send result back to spreadsheet
    session.socket.send(JSON.stringify({
      type: 'AGENT_COMPLETE',
      payload: {
        agentId: agent.id,
        cell,
        output: result.output,
        confidence: result.confidence
      }
    }));
  }

  private async executeAgent(agent: TaskAgent, prompt: string) {
    // MVP: Simple mock execution
    // In v2, integrate LLM

    const responses = {
      'summarize': 'Summary: Data analyzed',
      'calculate': 'Result: 42',
      'default': 'Processed: ' + prompt
    };

    const lowerPrompt = prompt.toLowerCase();
    let output = responses.default;

    if (lowerPrompt.includes('summarize')) {
      output = responses.summarize;
    } else if (lowerPrompt.includes('calculate') || lowerPrompt.includes('count')) {
      output = responses.calculate;
    }

    return {
      output,
      confidence: 0.85
    };
  }

  private async killAgent(session: SpreadsheetSession, agentId: string) {
    const agent = session.agents.get(agentId);
    if (agent) {
      await session.colony.removeAgent(agentId);
      session.agents.delete(agentId);
    }
  }

  private async sendStatus(session: SpreadsheetSession) {
    const agents = Array.from(session.agents.values()).map(agent => ({
      id: agent.id,
      status: agent.status,
      cell: agent.initialObservation.cell
    }));

    session.socket.send(JSON.stringify({
      type: 'STATUS_UPDATE',
      payload: { agents }
    }));
  }

  private handleDisconnect(session: SpreadsheetSession) {
    // Keep colony alive for 5 minutes
    setTimeout(() => {
      if (session.socket.readyState === WebSocket.CLOSED) {
        this.sessions.delete(session.spreadsheetId);
      }
    }, 5 * 60 * 1000);
  }

  private extractSpreadsheetId(request: any): string {
    // In MVP, generate from URL
    // In production, parse from OAuth token
    return 'spreadsheet-' + Math.random().toString(36).substr(2, 9);
  }
}
```

---

### Phase 2: Agent Intelligence (3 weeks) ⭐⭐⭐

**Goal:** Agents can actually do useful work

**Deliverables:**
1. LLM integration (OpenAI/Anthropic)
2. Plinko decision layer
3. Hebbian learning between cells
4. Multi-agent collaboration

**New Files:**
```
src/spreadsheet/
├── agents/
│   ├── SpreadsheetAgent.ts    # Base spreadsheet agent
│   ├── SummarizerAgent.ts     # Summarizes data
│   ├── CalculatorAgent.ts     # Performs calculations
│   └── AnalystAgent.ts        # Analyzes patterns
├── learning/
│   └── CellSynapseManager.ts  # Manages cell-to-cell synapses
└── llm/
    └── SpreadsheetLLMAdapter.ts
```

**Key Feature: Cell-to-Cell Learning**

```typescript
/**
 * Cell Synapse Manager
 *
 * Strengthens connections between cells that work well together.
 * Example: If cell A5 asks B5 for help, and it works well,
 * strengthen synapse A5 -> B5.
 */

class CellSynapseManager {
  private synapses: Map<string, Map<string, number>> = new Map();

  /**
   * Strengthen connection between cells
   */
  strengthen(sourceCell: string, targetCell: string, amount: number = 0.1) {
    if (!this.synapses.has(sourceCell)) {
      this.synapses.set(sourceCell, new Map());
    }

    const connections = this.synapses.get(sourceCell)!;
    const currentStrength = connections.get(targetCell) || 0;
    connections.set(targetCell, Math.min(1.0, currentStrength + amount));
  }

  /**
   * Get strongest connections for cell
   */
  getStrongestConnections(cell: string, limit: number = 5): string[] {
    const connections = this.synapses.get(cell);
    if (!connections) return [];

    return Array.from(connections.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([targetCell, strength]) => targetCell);
  }

  /**
   * Recommend collaborators for cell
   */
  recommendCollaborators(cell: string): string[] {
    // Find cells that this cell has successfully worked with
    return this.getStrongestConnections(cell, 3);
  }
}
```

**Usage Example:**

```javascript
// In spreadsheet
// Cell A1: AGENT: Analyze sales data
// Cell B1: AGENT: Calculate trends

// After successful collaboration:
// A1 learns that B1 is good for trend calculations
// Next time A1 needs trends, it automatically asks B1
```

---

### Phase 3: UI Polish (2 weeks) ⭐⭐

**Goal:** Make it feel magical

**Deliverables:**
1. Beautiful sidebar with agent visualization
2. Real-time agent status updates
3. Agent controls (pause, resume, kill)
4. Confetti on agent success 🎉

**New Files:**
```
src/spreadsheet/ui/
├── sidebar.html               # Main sidebar UI
├── agent-card.html            # Individual agent card
├── colony-visualization.html  # Colony graph view
└── styles.css                 # Custom styles
```

**UI Preview:**

```html
<!-- sidebar.html -->
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <div class="sidebar">
      <div class="header">
        <h1>🐝 POLLN Colony</h1>
        <div class="stats">
          <span id="agent-count">0</span> agents active
        </div>
      </div>

      <div class="agents-list" id="agents-list">
        <!-- Agents rendered here -->
      </div>

      <div class="controls">
        <button onclick="spawnAgent()">+ Spawn Agent</button>
        <button onclick="showVisualization()">📊 View Colony</button>
      </div>
    </div>

    <script src="sidebar.js"></script>
  </body>
</html>
```

---

## Other Platform Analysis

### Excel (Office.js API) 🥈 PRIORITY #2

**API:** Office JavaScript API (Office.js)

**Pros:**
- Better API than Google Sheets (real-time events)
- Larger user base in enterprise
- Better performance (desktop app)

**Cons:**
- More complex deployment (AppSource)
- Windows/Mac only (no Linux)
- TypeScript required (but POLLN is TS!)

**Integration Pattern:** Similar to Google Sheets, but using Office.js

```typescript
// Excel add-in (TypeScript)
Excel.run(async (context) => {
  const range = context.workbook.getSelectedRange();
  range.values = [['AGENT: Analyze this']];

  // Real-time event listener
  range.onChanged.add((event) => {
    if (event.value.startsWith('AGENT:')) {
      spawnAgent(event.value);
    }
  });

  await context.sync();
});
```

**Estimated Effort:** Medium (already using TypeScript)

---

### Airtable 🥉 PRIORITY #3

**API:** REST API + Scripting Extensions

**Pros:**
- Modern API with webhooks
- Built-in automations
- Powerful filtering

**Cons:**
- Smaller user base
- Pricing (paid plans required)
- Less flexible than Sheets

**Integration Pattern:** Webhook-based

```typescript
// Airtable webhook handler
app.post('/webhook/airtable', async (req, res) => {
  const { records } = req.body;

  for (const record of records) {
    if (record.cellValue.startsWith('AGENT:')) {
      await spawnAgent(record);
    }
  }

  res.sendStatus(200);
});
```

**Estimated Effort:** Low (simple webhooks)

---

### Notion Databases 🏅 HONORABLE MENTION

**API:** Notion API (REST)

**Pros:**
- Growing popularity
- Clean API design
- Database-like structure

**Cons:**
- No real-time events (polling required)
- Limited formula capabilities
- Smaller market

**Estimated Effort:** Low-Medium

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Apps Script execution timeout** | High | High | Async processing + status polling |
| **Sheets API quota limits** | Medium | Medium | Batch operations + caching |
| **WebSocket connection drops** | Medium | High | Auto-reconnect + state recovery |
| **OAuth token expiration** | Low | Medium | Token refresh logic |
| **Scalability bottlenecks** | Medium | High | Distributed architecture |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Google changes API** | Low | High | Version locking + migration path |
| **User adoption friction** | Medium | High | Excellent UX + tutorials |
| **Privacy concerns** | Medium | Medium | Transparent data handling |
| **Competition** | High | Medium | Focus on unique agent features |

---

## Next Steps

### Immediate Actions (This Week)

1. **Set up development environment**
   ```bash
   # Create Apps Script project
   npx clasp create --title "POLLN Spreadsheet Add-on" --type sheets

   # Install dependencies
   npm install --save-dev @types/google-apps-script
   ```

2. **Create minimal viable prototype**
   - Apps Script add-on that detects "AGENT:" prefix
   - Simple WebSocket server that logs messages
   - Manual testing in Google Sheets

3. **Document findings**
   - Record latency measurements
   - Test with different agent complexities
   - Identify breaking points

### MVP Roadmap Summary

| Phase | Duration | Complexity | Status |
|-------|----------|------------|--------|
| **Phase 1: Foundation** | 2 weeks | ⭐⭐⭐ | Ready to start |
| **Phase 2: Intelligence** | 3 weeks | ⭐⭐⭐⭐ | Blocked on Phase 1 |
| **Phase 3: UI Polish** | 2 weeks | ⭐⭐ | Blocked on Phase 2 |
| **Phase 4: Scaling** | 3 weeks | ⭐⭐⭐⭐⭐ | Blocked on Phase 3 |

**Total Time to MVP:** 10 weeks

---

## Conclusion

The recommended approach is **Option 2: Hybrid Architecture (Apps Script + WebSocket Server)**.

This approach:
- ✅ Leverages Google Sheets as the UI layer
- ✅ Provides full POLLN capabilities on the server
- ✅ Scales to multiple users and spreadsheets
- ✅ Maintains security with OAuth 2.0
- ✅ Allows for rapid iteration

**Key Success Factors:**
1. **Optimistic UI** for perceived performance
2. **Async processing** to avoid timeouts
3. **Server-side state** for agent memory
4. **Batch operations** for API efficiency
5. **Cell-to-cell learning** for emergent intelligence

**Vision Realization:**
With this architecture, users will be able to type natural language in cells and watch agents form, learn, and deconstruct—turning spreadsheets into living, thinking colonies.

---

## Appendix: Code Examples

### A. Complete Apps Script Add-on

[See `apps-script/Code.js` in Phase 1]

### B. Complete WebSocket Server

[See `server/SpreadsheetServer.ts` in Phase 1]

### C. Sheets API Client

```typescript
/**
 * Google Sheets API Client
 *
 * Wrapper around Google Sheets API v4 with batch operations
 * and error handling.
 */

import { google } from 'googleapis';

export class SheetsClient {
  private sheets: any;

  constructor(credentials: any) {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /**
   * Read multiple ranges in one batch call
   */
  async batchGet(spreadsheetId: string, ranges: string[]) {
    const response = await this.sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges
    });

    return response.data.valueRanges;
  }

  /**
   * Write multiple ranges in one batch call
   */
  async batchUpdate(spreadsheetId: string, updates: any[]) {
    const data = updates.map(update => ({
      range: update.range,
      values: update.values
    }));

    const response = await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data
      }
    });

    return response.data;
  }

  /**
   * Update single cell with metadata
   */
  async updateCell(
    spreadsheetId: string,
    cell: string,
    data: {
      value: any;
      note?: string;
      color?: { red: number; green: number; blue: number };
    }
  ) {
    // Update value
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: cell,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[data.value]] }
    });

    // Update note and formatting if provided
    if (data.note || data.color) {
      const requests: any[] = [];

      if (data.note) {
        requests.push({
          updateCells: {
            range: {
              sheetId: 0,
              startRowIndex: parseInt(cell.match(/\d+/)![0]) - 1,
              endRowIndex: parseInt(cell.match(/\d+/)![0]),
              startColumnIndex: cell.charCodeAt(0) - 65,
              endColumnIndex: cell.charCodeAt(0) - 64
            },
            rows: [{ values: [{ note: data.note }] }],
            fields: 'note'
          }
        });
      }

      if (data.color) {
        requests.push({
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: parseInt(cell.match(/\d+/)![0]) - 1,
              endRowIndex: parseInt(cell.match(/\d+/)![0]),
              startColumnIndex: cell.charCodeAt(0) - 65,
              endColumnIndex: cell.charCodeAt(0) - 64
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: data.color
              }
            },
            fields: 'userEnteredFormat.backgroundColor'
          }
        });
      }

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests }
      });
    }
  }
}
```

### D. Agent Cell Mapping

```typescript
/**
 * Agent Cell Mapper
 *
 * Maps spreadsheet cells to agents and vice versa.
 * Handles cell notation parsing (A1, B2, etc.)
 */

export class AgentCellMapper {
  private cellToAgent: Map<string, string> = new Map();
  private agentToCell: Map<string, string> = new Map();

  /**
   * Register agent for cell
   */
  register(agentId: string, cell: string) {
    this.cellToAgent.set(cell, agentId);
    this.agentToCell.set(agentId, cell);
  }

  /**
   * Get agent for cell
   */
  getAgent(cell: string): string | undefined {
    return this.cellToAgent.get(cell);
  }

  /**
   * Get cell for agent
   */
  getCell(agentId: string): string | undefined {
    return this.agentToCell.get(agentId);
  }

  /**
   * Unregister agent
   */
  unregister(agentId: string) {
    const cell = this.agentToCell.get(agentId);
    if (cell) {
      this.cellToAgent.delete(cell);
      this.agentToCell.delete(agentId);
    }
  }

  /**
   * Parse cell notation (e.g., "A1" -> {col: 0, row: 0})
   */
  static parseCell(cell: string): { col: number; row: number } {
    const match = cell.match(/^([A-Z]+)(\d+)$/);
    if (!match) throw new Error(`Invalid cell notation: ${cell}`);

    const col = match[1]
      .split('')
      .reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1;
    const row = parseInt(match[2]) - 1;

    return { col, row };
  }

  /**
   * Convert coordinates to cell notation (e.g., {col: 0, row: 0} -> "A1")
   */
  static toCell(col: number, row: number): string {
    const colLetter = String.fromCharCode(65 + (col % 26));
    const rowNum = row + 1;
    return `${colLetter}${rowNum}`;
  }
}
```

---

**Document End**

For questions or clarifications, please contact the POLLN Integration Architecture Team.
