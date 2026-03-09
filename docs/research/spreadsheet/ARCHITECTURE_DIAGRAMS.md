# POLLN Spreadsheet Integration - Architecture Diagrams

This document contains visual architecture diagrams for the POLLN/Google Sheets integration.

## Table of Contents
1. [System Overview](#system-overview)
2. [Data Flow](#data-flow)
3. [Component Architecture](#component-architecture)
4. [Deployment Architecture](#deployment-architecture)
5. [Sequence Diagrams](#sequence-diagrams)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   Google     │         │   POLLN      │                     │
│  │   Sheets     │◄────────┤   Server     │                     │
│  │              │  HTTPS  │              │                     │
│  │  ┌────────┐  │         │  ┌────────┐  │                     │
│  │  │  Apps  │  │         │  │ POLLN  │  │                     │
│  │  │Script  │  │         │  │ Core   │  │                     │
│  │  └────────┘  │         │  └────────┘  │                     │
│  └──────────────┘         └──────────────┘                     │
│         │                          │                            │
│         │ OAuth 2.0                │                            │
│         ▼                          ▼                            │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │  Google      │         │  PostgreSQL  │                     │
│  │  Drive API   │         │  Database    │                     │
│  └──────────────┘         └──────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPONENT MAP                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐         ┌──────────────────────┐    │
│  │   Sheets Add-on      │         │   POLLN Server        │    │
│  │   (Apps Script)      │         │   (Node.js)           │    │
│  ├──────────────────────┤         ├──────────────────────┤    │
│  │                      │         │                      │    │
│  │  ┌────────────────┐  │         │  ┌────────────────┐  │    │
│  │  │ Cell Detector  │  │         │  │Session Manager │  │    │
│  │  └────────────────┘  │         │  └────────────────┘  │    │
│  │                      │         │                      │    │
│  │  ┌────────────────┐  │         │  ┌────────────────┐  │    │
│  │  │ UI Renderer    │  │         │  │Colony Manager  │  │    │
│  │  └────────────────┘  │         │  └────────────────┘  │    │
│  │                      │         │                      │    │
│  │  ┌────────────────┐  │         │  ┌────────────────┐  │    │
│  │  │POLLN Client    │  │─────────┤  │Agent Orch.     │  │    │
│  │  └────────────────┘  │ WebSocket│  └────────────────┘  │    │
│  │                      │         │                      │    │
│  └──────────────────────┘         │  ┌────────────────┐  │    │
│                                   │  │Sheets API      │  │    │
│                                   │  │Client          │  │    │
│                                   │  └────────────────┘  │    │
│                                   │                      │    │
│                                   └──────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Agent Lifecycle Flow

```
USER INPUT
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER TYPES IN CELL                                          │
│    "AGENT: Summarize the column to the left"                   │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. APPS SCRIPT DETECTS COMMAND                                 │
│    - onEdit() trigger fires                                    │
│    - Checks for "AGENT:" prefix                                │
│    - Extracts prompt and context                               │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. IMMEDIATE UI FEEDBACK (< 100ms)                             │
│    - Cell shows "🤖 Thinking..."                               │
│    - Color changes to gray                                     │
│    - Note added with request ID                                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. SEND TO POLLN SERVER (WebSocket)                            │
│    {                                                            │
│      type: "SPAWN_AGENT",                                      │
│      payload: {                                                │
│        spreadsheetId: "...",                                   │
│        cell: "A1",                                             │
│        prompt: "Summarize...",                                 │
│        context: { sheetName, row, col, neighbors }            │
│      }                                                          │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. POLLN SERVER PROCESSES                                      │
│    - Gets or creates colony for spreadsheet                    │
│    - Spawns agent with initial observation                     │
│    - Runs Plinko decision layer                                │
│    - Executes selected action                                  │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. AGENT EXECUTION                                             │
│    - Interpret natural language prompt                         │
│    - Fetch sheet context (via Sheets API)                      │
│    - Perform calculation/analysis                              │
│    - Learn from outcome (Hebbian)                              │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. WRITE BACK TO SPREADSHEET                                   │
│    - Update cell with result                                   │
│    - Set color based on confidence                             │
│    - Add note with agent ID and stats                          │
│    - Strengthen cell-to-cell synapses                          │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. UPDATE SIDEBAR UI                                           │
│    - Show agent status in sidebar                              │
│    - Display confidence score                                  │
│    - Show active connections to other cells                    │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Agent Collaboration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ CELL A1: "AGENT: Analyze sales trend"                          │
└─────────────────────────────────────────────────────────────────┘
    │
    │ Agent spawned in A1
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ AGENT A1: "I need help calculating trend"                      │
└─────────────────────────────────────────────────────────────────┘
    │
    │ Checks cell synapses
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ SYNAPSE MANAGER: "B2 is good at calculations (strength: 0.9)"  │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ CREATE A2A PACKAGE                                              │
│ {                                                                │
│   from: "A1",                                                   │
│   to: "B2",                                                     │
│   type: "COLLABORATION_REQUEST",                                │
│   payload: {                                                    │
│     task: "calculate_trend",                                    │
│     data: [...]                                                 │
│   }                                                             │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ AGENT B2: "Calculating trend..."                                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ B2 RETURNS RESULT TO A1                                         │
│ {                                                                │
│   from: "B2",                                                   │
│   to: "A1",                                                     │
│   type: "COLLABORATION_RESPONSE",                               │
│   payload: {                                                    │
│     result: "+15% increase",                                    │
│     confidence: 0.92                                            │
│   }                                                             │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ A1 SYNAPSES STRENGTHENED                                        │
│ A1 -> B2: 0.9 → 0.95 (successful collaboration)                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ A1 DISPLAYS FINAL RESULT                                        │
│ "Sales trend: +15% increase (calculated with B2)"              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Apps Script Add-on Structure

```
apps-script/
│
├── Code.js                    # Main entry point
│   ├── onEdit()              # Cell change trigger
│   ├── onOpen()              # Menu setup
│   ├── handleAgentCommand()  # Process AGENT: prefix
│   └── pollForResult()       # Async result polling
│
├── polln-client.js           # POLLN WebSocket client
│   ├── connect()             # WebSocket connection
│   ├── send()                # Send messages
│   ├── on()                  # Event handlers
│   └── disconnect()          # Cleanup
│
├── ui/
│   ├── sidebar.html          # Main sidebar
│   ├── agent-card.html       # Agent status card
│   ├── colony-graph.html     # Colony visualization
│   └── styles.css            # Custom styles
│
└── appscript.json            # Add-on manifest
    ├── addons                # Add-on configuration
    ├── oauthScopes           # Required OAuth scopes
    └── runtimeVersion        # V8 runtime enabled
```

### POLLN Server Structure

```
src/spreadsheet/
│
├── server/
│   ├── SpreadsheetServer.ts      # WebSocket server
│   ├── session.ts                # Session management
│   └── sheets-api.ts             # Sheets API client
│
├── agents/
│   ├── SpreadsheetAgent.ts       # Base spreadsheet agent
│   ├── SummarizerAgent.ts        # Summarizes data
│   ├── CalculatorAgent.ts        # Performs calculations
│   ├── AnalystAgent.ts           # Analyzes patterns
│   └── CommunicatorAgent.ts      # Cell-to-cell communication
│
├── learning/
│   ├── CellSynapseManager.ts     # Cell-to-cell synapses
│   ├── SpreadsheetLearning.ts    # Learning algorithms
│   └── PatternMemory.ts          # Pattern storage
│
├── llm/
│   ├── SpreadsheetLLMAdapter.ts  # LLM integration
│   ├── PromptBuilder.ts          # Prompt construction
│   └── ResponseParser.ts         # Response parsing
│
└── types/
    ├── spreadsheet.ts            # Type definitions
    ├── agents.ts                 # Agent types
    └── messages.ts               # Message types
```

---

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────────────┐
│ DEVELOPER MACHINE                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   clasp      │         │   npm run    │                     │
│  │   (Apps      │         │   dev        │                     │
│  │   Script     │─────────┤   (POLLN     │                     │
│  │   CLI)       │ deploy  │   Server)    │                     │
│  └──────────────┘         └──────────────┘                     │
│         │                          │                            │
│         │                          │                            │
│         ▼                          ▼                            │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │  Google      │         │  localhost   │                     │
│  │  Apps Script │         │  :3000       │                     │
│  │  (dev)       │         │              │                     │
│  └──────────────┘         └──────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER                            │
│                   (nginx / AWS ALB)                             │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  POLLN       │ │  POLLN       │ │  POLLN       │
│  Server 1    │ │  Server 2    │ │  Server 3    │
│              │ │              │ │              │
│  ┌────────┐  │ │  ┌────────┐  │ │  ┌────────┐  │
│  │Colony  │  │ │  │Colony  │  │ │  │Colony  │  │
│  │Manager │  │ │  │Manager │  │ │  │Manager │  │
│  └────────┘  │ │  └────────┘  │ │  └────────┘  │
│              │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   PostgreSQL     │
              │   (Primary)      │
              └──────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   PostgreSQL     │
              │   (Replica 1)    │
              └──────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   PostgreSQL     │
              │   (Replica 2)    │
              └──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      CACHE LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   Redis      │         │   Redis      │                     │
│  │   Cluster    │─────────│   Sentinel   │                     │
│  │              │ backup  │              │                     │
│  └──────────────┘         └──────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE QUEUE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │    Kafka     │─────────│    Kafka     │                     │
│  │  Broker 1    │ cluster │  Broker 2    │                     │
│  └──────────────┘         └──────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagrams

### Agent Spawn Sequence

```
USER           APPS SCRIPT      POLLN SERVER       COLONY          AGENT
 │                  │                │               │             │
 │─Type "AGENT:"   │                │               │             │
 │  in cell         │                │               │             │
 │                  │                │               │             │
 │                  │                │               │             │
 │                  │─onEdit()       │               │             │
 │                  │  trigger       │               │             │
 │                  │                │               │             │
 │                  │─Show "Thinking"               │             │
 │                  │  in cell       │               │             │
 │                  │                │               │             │
 │                  │─SPAWN_AGENT    │               │             │
 │                  │  (WebSocket)   │               │             │
 │                  │───────────────>│               │             │
 │                  │                │               │             │
 │                  │                │─getOrCreate   │             │
 │                  │                │  Colony()      │             │
 │                  │                │--------------->│             │
 │                  │                │<───────────────│             │
 │                  │                │               │             │
 │                  │                │─spawnAgent()  │             │
 │                  │                │───────────────>│             │
 │                  │                │               │             │
 │                  │                │               │─new         │
 │                  │                │               │  Agent()    │
 │                  │                │               │             │
 │                  │                │<──────────────│             │
 │                  │                │               │             │
 │                  │                │─execute()     │             │
 │                  │                │───────────────>│────────────>│
 │                  │                │               │             │
 │                  │                │               │<────────────│
 │                  │                │<──────────────│             │
 │                  │                │               │             │
 │                  │<─AGENT_COMPLETE│               │             │
 │                  │  (WebSocket)   │               │             │
 │                  │───────────────<│               │             │
 │                  │                │               │             │
 │                  │─Update cell    │               │             │
 │                  │  with result   │               │             │
 │                  │                │               │             │
 │─See result       │                │               │             │
 │  in cell         │                │               │             │
 │<─────────────────│                │               │             │
 │                  │                │               │             │
```

### Multi-Agent Collaboration Sequence

```
AGENT A1       SYNAPSE MGR     AGENT B2       SHEETS API
    │                │              │              │
    │─Need help      │              │              │
    │  with task     │              │              │
    │                │              │              │
    │─getStrongest() │              │              │
    │  connections   │              │              │
    │───────────────>│              │              │
    │<───────────────│              │              │
    │  return: [B2]  │              │              │
    │                │              │              │
    │─A2A Package    │              │              │
    │  to B2         │              │              │
    │──────────────────────────────>│              │
    │                │              │              │
    │                │              │─Fetch data   │
    │                │              │─────────────>│
    │                │              │<─────────────│
    │                │              │              │
    │                │              │─Process      │
    │                │              │  data        │
    │                │              │              │
    │                │              │─A2A Package  │
    │                │              │  to A1       │
    │<──────────────────────────────│              │
    │                │              │              │
    │─strengthen()   │              │              │
    │  A1->B2        │              │              │
    │───────────────>│              │              │
    │                │              │              │
    │                │              │              │
```

### Error Recovery Sequence

```
USER           APPS SCRIPT      POLLN SERVER       COLONY
 │                  │                │               │
 │─Type "AGENT:"   │                │               │
 │  in cell         │                │               │
 │                  │                │               │
 │                  │─SPAWN_AGENT    │               │
 │                  │───────────────>│               │
 │                  │                │               │
 │                  │                │─spawnAgent()  │
 │                  │                │──────────────>│
 │                  │                │               │
 │                  │                │<─ERROR         │
 │                  │                │  (timeout)    │
 │                  │                │               │
 │                  │<─AGENT_FAILED  │               │
 │                  │  (WebSocket)   │               │
 │                  │<────────────────│               │
 │                  │                │               │
 │                  │─Show error     │               │
 │                  │  in cell       │               │
 │                  │                │               │
 │─See error        │                │               │
 │  message         │                │               │
 │<─────────────────│                │               │
 │                  │                │               │
 │─Retry           │                │               │
 │  (click retry)  │                │               │
 │                  │                │               │
 │                  │─SPAWN_AGENT    │               │
 │                  │  (retry)       │               │
 │                  │───────────────>│               │
 │                  │                │               │
 │                  │                │─spawnAgent()  │
 │                  │                │──────────────>│
 │                  │                │               │
 │                  │<─AGENT_SUCCESS │               │
 │                  │  (WebSocket)   │               │
 │                  │<────────────────│               │
 │                  │                │               │
 │                  │─Update cell    │               │
 │                  │  with success  │               │
 │                  │                │               │
```

---

## Network Topology

### WebSocket Connection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT: Apps Script Add-on                                     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ 1. WebSocket handshake
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ LOAD BALANCER                                                  │
│ - WebSocket upgrade                                            │
│ - Session affinity (sticky sessions)                           │
│ - SSL termination                                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ 2. Route to available server
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ POLLN SERVER INSTANCE                                          │
│ - WebSocket connection established                             │
│ - Session created                                              │
│ - Assigned to server                                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ 3. Session persistence
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ REDIS CLUSTER                                                  │
│ - Session state stored                                        │
│ - Replicated across nodes                                     │
│ - Auto-failover                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Session State

```typescript
interface SpreadsheetSession {
  // Identification
  sessionId: string;
  spreadsheetId: string;
  userId: string;

  // Connection
  socket: WebSocket;
  connectedAt: Date;
  lastActivity: Date;

  // Colony
  colony: Colony;
  colonyState: ColonyState;

  // Agents
  agents: Map<string, SpreadsheetAgent>;
  activeAgents: string[];

  // Metadata
  permissions: Permission[];
  quota: QuotaInfo;
}

interface SpreadsheetAgent {
  id: string;
  cell: string;
  type: AgentType;
  status: AgentStatus;
  createdAt: Date;
  lastActivity: Date;

  // Learning
  synapses: Map<string, number>; // cell -> strength
  experiences: Experience[];

  // State
  observation: Observation;
  decision: Decision | null;
  outcome: Outcome | null;
}
```

### Message Types

```typescript
// Client → Server
type ClientMessage =
  | { type: 'SPAWN_AGENT'; payload: SpawnAgentPayload }
  | { type: 'KILL_AGENT'; payload: KillAgentPayload }
  | { type: 'GET_STATUS'; payload: GetStatusPayload }
  | { type: 'PING'; payload: PingPayload };

// Server → Client
type ServerMessage =
  | { type: 'AGENT_SPAWNED'; payload: AgentSpawnedPayload }
  | { type: 'AGENT_COMPLETE'; payload: AgentCompletePayload }
  | { type: 'AGENT_FAILED'; payload: AgentFailedPayload }
  | { type: 'STATUS_UPDATE'; payload: StatusUpdatePayload }
  | { type: 'PONG'; payload: PongPayload };

interface SpawnAgentPayload {
  spreadsheetId: string;
  cell: string;
  prompt: string;
  context: CellContext;
}

interface AgentCompletePayload {
  agentId: string;
  cell: string;
  output: string;
  confidence: number;
  metadata: AgentMetadata;
}

interface CellContext {
  sheetName: string;
  row: number;
  col: number;
  neighbors: {
    above: any;
    below: any;
    left: any;
    right: any;
  };
}
```

---

## Performance Considerations

### Latency Breakdown

```
Total End-to-End Latency: ~500ms

┌─────────────────────────────────────────────────────────────────┐
│ LATENCY COMPONENTS                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. UI Update (optimistic)          10ms                        │
│     └─ Cell color change                                        │
│                                                                  │
│  2. Apps Script Processing          50ms                        │
│     ├─ Trigger execution                                       │
│     ├─ Context extraction                                     │
│     └─ WebSocket send                                          │
│                                                                  │
│  3. Network Round Trip              100ms                       │
│     ├─ Client → Server                                        │
│     └─ Server → Client                                        │
│                                                                  │
│  4. Server Processing                300ms                      │
│     ├─ Colony lookup                                           │
│     ├─ Agent spawn                                             │
│     ├─ Plinko decision                                         │
│     ├─ LLM call (200ms)                                        │
│     └─ Result preparation                                     │
│                                                                  │
│  5. Sheets API Write                 40ms                       │
│     ├─ Batch update                                            │
│     └─ Formatting                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Optimization Strategies

1. **Parallel Processing**
   ```
   Multiple agents process simultaneously
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │ Agent 1 │  │ Agent 2 │  │ Agent 3 │
   └─────────┘  └─────────┘  └─────────┘
       │            │            │
       └────────────┴────────────┘
                   │
                   ▼
           Batch Sheets API update
   ```

2. **Caching**
   ```
   ┌─────────────────────────────────────────────────────────────────┐
   │ CACHE STRATEGY                                                  │
   ├─────────────────────────────────────────────────────────────────┤
   │                                                                  │
   │  L1: In-Memory (Server)         │  Hot colonies                 │
   │  L2: Redis                      │  Session state                │
   │  L3: PostgreSQL                 │  Persistent data              │
   │                                                                  │
│   Cache Hit Rates:                                              │
│   - Colony lookups: 95%                                        │
│   - Agent data: 80%                                            │
│   - Sheet context: 70%                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
   ```

3. **Batch Operations**
   ```
   Before (individual calls):
   updateCell(A1) → 40ms
   updateCell(B1) → 40ms
   updateCell(C1) → 40ms
   Total: 120ms

   After (batch):
   batchUpdate([A1, B1, C1]) → 50ms
   Total: 50ms (2.4x faster)
   ```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ SECURITY LAYERS                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ L1: Google OAuth 2.0                                      │ │
│  │ - User authentication                                     │ │
│  │ - Spreadsheet access permissions                          │ │
│  │ - Token refresh flow                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ L2: POLLN Server Authentication                            │ │
│  │ - JWT token validation                                    │ │
│  │ - Session management                                      │ │
│  │ - Rate limiting                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ L3: Agent Sandboxing                                       │ │
│  │ - Cell access isolation                                    │ │
│  │ - Resource quotas                                          │ │
│  │ - Execution timeout                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ L4: Data Encryption                                        │ │
│  │ - TLS for all communications                               │ │
│  │ - Encrypted database storage                               │ │
│  │ - Secure key management                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ L5: Audit Logging                                          │ │
│  │ - All agent actions logged                                │ │
│  │ - Data access tracking                                    │ │
│  │ - Security event monitoring                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

**Document End**

These diagrams provide a visual representation of the POLLN spreadsheet integration architecture. For implementation details, see [GOOGLE_DOCS_INTEGRATION.md](./GOOGLE_DOCS_INTEGRATION.md).
