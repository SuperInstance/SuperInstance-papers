# SuperInstance System Architecture

**Complete architecture overview of the SuperInstance cellular agent ecosystem**

[![docs](https://img.shields.io/badge/docs-rigorous-blue)](docs/)
[![architecture](https://img.shields.io/badge/architecture-comprehensive-green)](docs/)

**Ecosystem:** https://github.com/SuperInstance
**Last Updated:** 2026-03-18
**Version:** 0.1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Repository Architecture](#repository-architecture)
3. [Component Interactions](#component-interactions)
4. [Data Flow](#data-flow)
5. [Communication Patterns](#communication-patterns)
6. [Integration Points](#integration-points)
7. [Deployment Architecture](#deployment-architecture)
8. [Scalability](#scalability)

---

## Overview

### Ecosystem Vision

SuperInstance is a **cellular agent infrastructure** where:

- Each agent has a **unique position/orientation** in multidimensional space
- **Orientation filters** relevant data (FPS paradigm)
- **No god's eye view** - each agent sees from its perspective
- **Asymmetric understanding** is a feature, not a bug
- **LLMs become neural networks** deconstructed into geometric determinants

### Four-Repo Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPERINSTANCE ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐      ┌──────────────────┐      ┌────────────┐ │
│  │  constrainttheory│      │ spreadsheet-/    │      │   claw/    │ │
│  │  (Geometric      │─────►│ moment/          │◄────►│ (Agent     │ │
│  │   Substrate)     │      │ (Cell Platform)  │      │  Engine)   │ │
│  │                  │      │                  │      │            │ │
│  │  • Dodecet enc.  │      │  • Univer base   │      │  • Agents  │ │
│  │  • KD-tree index │      │  • Cell UI       │      │  • Bots    │ │
│  │  • FPS paradigm  │      │  • Integration   │      │  • Seeds   │ │
│  │  • Spatial query │      │  • Management    │      │  • Social  │ │
│  └──────────────────┘      └──────────────────┘      └────────────┘ │
│           ▲                                                   │       │
│           │                                                   │       │
│           ▼                                                   │       │
│  ┌──────────────────┐                                         │       │
│  │ dodecet-encoder/ │                                         │       │
│  │ (12-bit Encoding)│                                         │       │
│  │                  │                                         │       │
│  │  • WASM package  │                                         │       │
│  │  • Rust crate    │                                         │       │
│  │  • npm package   │                                         │       │
│  │  • Conversion    │                                         │       │
│  └──────────────────┘                                         │       │
│                                                               │       │
│  ┌──────────────────┐                                         │       │
│  │ SuperInstance-   │                                         │       │
│  │   papers/        │                                         │       │
│  │ (Research)       │                                         │       │
│  │                  │                                         │       │
│  │  • Theory        │                                         │       │
│  │  • Papers        │                                         │       │
│  │  • Validation    │                                         │       │
│  └──────────────────┘                                         │       │
│                                                               │       │
└─────────────────────────────────────────────────────────────┘
```

---

## Repository Architecture

### constrainttheory/

**Purpose:** Geometric substrate for cellular agents

**Key Components:**
```
constrainttheory/
├── src/
│   ├── dodecet/          # 12-bit geometric encoding
│   ├── spatial/          # KD-tree spatial indexing
│   ├── agent/            # Agent query API
│   ├── geometry/         # Geometric algebra operations
│   └── constraint/       # Constraint propagation
├── wasm/                 # WebAssembly bindings
├── python/               # Python bindings
└── tests/                # Test suites
```

**Technology Stack:**
- Rust (core library)
- WebAssembly (browser support)
- Python (data science integration)
- Node.js (JavaScript support)

**API Surface:**
```rust
// Dodecet encoding
let dodecet = Dodecet::from((x, y, z));
let distance = dodecet1.distance_to(&dodecet2);

// Spatial indexing
let mut index = SpatialIndex::new();
index.insert(agent_id, dodecet);
let nearby = index.query_radius(query_point, radius);

// Agent queries
let visible = agent.query_visible(&index);
```

### claw/

**Purpose:** Minimal cellular agent engine

**Key Components:**
```
claw/
├── core/
│   ├── src/
│   │   ├── agent/           # Agent implementation
│   │   ├── equipment/       # Equipment system
│   │   ├── trigger/         # Trigger handling
│   │   ├── social/          # Social coordination
│   │   └── seed/            # Seed learning
│   ├── tests/               # Unit tests
│   └── benches/             # Benchmarks
├── api/                     # REST API
├── websocket/               # WebSocket server
└── auth/                    # Authentication system
```

**Technology Stack:**
- Rust (core engine)
- Tokio (async runtime)
- Serde (serialization)
- Actix-web (HTTP server)
- WebSocket (real-time communication)

**API Surface:**
```rust
// Agent management
let core = ClawCore::new();
core.add_agent(config).await?;
core.start_agent(agent_id).await?;

// Equipment
agent.equip(EquipmentSlot::Memory).await?;
agent.unequip(EquipmentSlot::Memory).await?;

// Social coordination
let coordinator = SocialCoordinator::new(CoordinationStrategy::Consensus);
coordinator.coordinate(&agents).await?;
```

### spreadsheet-moment/

**Purpose:** Agentic spreadsheet platform

**Key Components:**
```
spreadsheet-moment/
├── packages/
│   ├── core/               # Core spreadsheet engine
│   ├── ui/                 # UI components
│   ├── claw-integration/   # Claw integration layer
│   ├── collaboration/      # Real-time collaboration
│   └── export/             # Export functionality
├── workers/                # Web Workers
├── api/                    # Backend API
└── tests/                  # Test suites
```

**Technology Stack:**
- TypeScript/JavaScript (frontend)
- React (UI framework)
- Univer (spreadsheet engine)
- Node.js (backend)
- PostgreSQL (database)
- Redis (caching)

**API Surface:**
```typescript
// Sheet management
const sheet = workbook.createSheet('My Sheet');

// Cell operations
sheet.getCell('A1').value = 'Hello';
sheet.getCell('A1').format = { bold: true };

// Claw integration
const agent = sheet.createClawAgent('A1', {
  model: 'gpt-4',
  equipment: ['MEMORY', 'REASONING'],
  triggers: [{ source: 'B1', condition: 'value > 100' }]
});

// Real-time collaboration
socket.on('cell:updated', (update) => {
  sheet.getCell(update.cellId).value = update.value;
});
```

### dodecet-encoder/

**Purpose:** 12-bit geometric encoding library

**Key Components:**
```
dodecet-encoder/
├── src/
│   ├── lib.rs             # Core library
│   ├── dodecet.rs         # Dodecet encoding
│   ├── position.rs        # Position handling
│   ├── orientation.rs     # Orientation handling
│   └── conversion.rs      # Conversion utilities
├── wasm/                  # WebAssembly build
├── npm/                   # npm package
└── benches/               # Benchmarks
```

**Technology Stack:**
- Rust (core library)
- WebAssembly (browser support)
- JavaScript/TypeScript (npm package)
- Python (PyO3 bindings)

**API Surface:**
```rust
// Core library
let dodecet = Dodecet::from((x, y, z));
let (x, y, z) = dodecet.into();

// WASM
import { Dodecet } from 'dodecet-encoder';
const dodecet = new Dodecet(x, y, z);

// Python
from dodecet import Dodecet
dodecet = Dodecet(x, y, z)
```

---

## Component Interactions

### 1. Claw ↔ Spreadsheet-Moment Integration

```
┌─────────────────────────────────────────────────────────────┐
│              CLAW ↔ SPREADSHEET-MOMENT INTEGRATION           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Spreadsheet-Moment                    Claw Engine           │
│  ┌──────────────────┐                ┌──────────────────┐   │
│  │  ClawCell        │◄────WebSocket────│  ClawAgent       │   │
│  │  Component       │─────────────────►│  (Rust)          │   │
│  └──────────────────┘                └──────────────────┘   │
│           │                                   │              │
│           │                                   │              │
│           ▼                                   ▼              │
│  ┌──────────────────┐                ┌──────────────────┐   │
│  │  Cell Data       │◄────REST API─────│  Agent State    │   │
│  │  (A1, B1, C1)    │─────────────────►│  & Triggers    │   │
│  └──────────────────┘                └──────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. User creates Claw agent in spreadsheet cell
2. Spreadsheet-moment sends agent config to Claw engine
3. Claw agent spawns and starts monitoring
4. Agent sends updates back to spreadsheet
5. Spreadsheet updates cell with agent results

**API Contract:**
```typescript
// Spreadsheet-moment → Claw
interface CreateAgentRequest {
  cellId: string;
  model: string;
  equipment: string[];
  triggers: TriggerConfig[];
}

// Claw → Spreadsheet-moment
interface AgentUpdate {
  agentId: string;
  cellId: string;
  value: any;
  timestamp: number;
}
```

### 2. ConstraintTheory ↔ Claw Integration

```
┌─────────────────────────────────────────────────────────────┐
│            CONSTRAINTTHEORY ↔ CLAW INTEGRATION               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Constraint Theory                    Claw Engine            │
│  ┌──────────────────┐                ┌──────────────────┐   │
│  │  Dodecet         │◄────Query────────│  Agent Position │   │
│  │  Encoding        │─────────────────►│  & Orientation  │   │
│  └──────────────────┘                └──────────────────┘   │
│           │                                   │              │
│           │                                   │              │
│           ▼                                   ▼              │
│  ┌──────────────────┐                ┌──────────────────┐   │
│  │  Spatial Index   │◄────Register──────│  Agent Registry │   │
│  │  (KD-tree)       │─────────────────►│                  │   │
│  └──────────────────┘                └──────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. Claw agent registers position with constrainttheory
2. ConstraintTheory indexes agent in KD-tree
3. Agent queries for visible neighbors
4. ConstraintTheory returns filtered results
5. Agent uses results for coordination

**API Contract:**
```rust
// Claw → ConstraintTheory
struct RegisterAgent {
    agent_id: String,
    dodecet: Dodecet,
}

// ConstraintTheory → Claw
struct QueryResult {
    agents: Vec<String>,
    dodecets: Vec<Dodecet>,
}
```

### 3. Dodecet-Encoder Integration

```
┌─────────────────────────────────────────────────────────────┐
│              DODECET-ENCODER INTEGRATION                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Dodecet-Encoder Library                │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │ Rust Crate  │  │ WASM Build  │  │ npm Package │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
│           │                    │                    │         │
│           ▼                    ▼                    ▼         │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐│
│  │  constraint- │      │  spreadsheet-│      │     claw/    ││
│  │    theory/   │      │    moment/   │      │              ││
│  │  (Rust)      │      │  (TypeScript)│      │   (Rust)     ││
│  └──────────────┘      └──────────────┘      └──────────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Integration Points:**
- **constrainttheory:** Direct Rust dependency
- **spreadsheet-moment:** WASM or npm package
- **claw:** Direct Rust dependency

---

## Data Flow

### Agent Creation Flow

```
User → Spreadsheet-Moment → Claw → ConstraintTheory
  │           │                  │            │
  │         UI                  │            │
  │           │                  │            │
  │         API                  │            │
  │           │                  │            │
  │         WebSocket            │            │
  │           │                  │            │
  │           └──────────────────┴────────────┘
                        │
                        ▼
                   Agent Created
```

**Steps:**
1. User creates agent in spreadsheet UI
2. Spreadsheet-moment sends creation request to Claw
3. Claw creates agent with dodecet position
4. Claw registers position with constrainttheory
5. Agent starts monitoring cell

### Trigger Processing Flow

```
Cell Update → Spreadsheet-Moment → Claw → Equipment → Response
     │                │              │          │          │
     │              WebSocket        │          │          │
     │                │              │          │          │
     │                │            Trigger      │          │
     │                │              │          │          │
     │                │              │      Equipment       │
     │                │              │          │          │
     │                │              │          └──────┬────┘
     │                │              │                 │
     │                │              └─────────────────┤
     │                │                                │
     └────────────────┴────────────────────────────────┘
                         │
                         ▼
                   Cell Updated
```

**Steps:**
1. User updates spreadsheet cell
2. Spreadsheet-moment sends update to Claw
3. Claw processes trigger
4. Equipment (e.g., reasoning) analyzes data
5. Agent generates response
6. Response sent back to spreadsheet
7. Spreadsheet updates cell

---

## Communication Patterns

### 1. Request-Response (REST API)

**Pattern:** Synchronous request-response

**Use Cases:**
- Agent CRUD operations
- Configuration updates
- Status queries

**Example:**
```typescript
// Spreadsheet-moment → Claw
const response = await fetch('http://claw:8080/api/v1/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(agentConfig)
});

const agent = await response.json();
```

### 2. Publish-Subscribe (WebSocket)

**Pattern:** Asynchronous event streaming

**Use Cases:**
- Real-time cell updates
- Agent status changes
- Collaboration events

**Example:**
```typescript
// Spreadsheet-moment ↔ Claw
const ws = new WebSocket('ws://claw:8080/ws');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  handleAgentUpdate(update);
};

ws.send(JSON.stringify({
  type: 'subscribe',
  agentId: 'agent-123'
}));
```

### 3. Message Passing (Actor Model)

**Pattern:** Asynchronous message passing

**Use Cases:**
- Inter-agent communication
- Social coordination
- Equipment interaction

**Example:**
```rust
// Claw agent-to-agent
use claw_core::Message;

let message = Message {
    from: "agent-1".to_string(),
    to: "agent-2".to_string(),
    payload: "Hello".to_string(),
};

core.send_message(message).await?;
```

---

## Integration Points

### API Contracts

**1. Claw Agent API:**
```typescript
interface ClawAgent {
  id: string;
  cellId: string;
  model: string;
  equipment: EquipmentSlot[];
  triggers: TriggerConfig[];
  state: AgentState;
}

interface CreateAgentRequest {
  cellId: string;
  model: string;
  equipment: string[];
  triggers: TriggerConfig[];
}

interface AgentUpdate {
  agentId: string;
  cellId: string;
  value: any;
  timestamp: number;
}
```

**2. ConstraintTheory Spatial API:**
```rust
struct RegisterAgentRequest {
    agent_id: String,
    dodecet: Dodecet,
}

struct QueryVisibleRequest {
    agent_id: String,
    dodecet: Dodecet,
    radius: u32,
}

struct QueryVisibleResponse {
    agents: Vec<String>,
    dodecets: Vec<Dodecet>,
}
```

**3. Dodecet Encoding API:**
```rust
// Rust
impl From<(f32, f32, f32)> for Dodecet;
impl From<Dodecet> for (f32, f32, f32);

// TypeScript/JavaScript
class Dodecet {
  constructor(x: number, y: number, z: number);
  toCoords(): [number, number, number];
}

// Python
class Dodecet:
    def __init__(self, x: float, y: float, z: float)
    def to_coords() -> Tuple[float, float, float]
```

---

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────────┐
│                  DEVELOPMENT ENVIRONMENT                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Developer Machine                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │   claw/     │  │ constraint- │  │  dodecet-   │  │    │
│  │  │             │  │   theory/  │  │  encoder/   │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  │                                                        │    │
│  │  ┌─────────────────────────────────────────────┐     │    │
│  │  │       spreadsheet-moment/                  │     │    │
│  │  │       (with hot-reload)                     │     │    │
│  │  └─────────────────────────────────────────────┘     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                   PRODUCTION ENVIRONMENT                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Load Balancer                      │    │
│  └─────────────────────────────────────────────────────┘    │
│           │             │             │                      │
│           ▼             ▼             ▼                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ spreadsheet-│ │ spreadsheet-│ │ spreadsheet-│           │
│  │   moment-1  │ │   moment-2  │ │   moment-3  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│           │             │             │                      │
│           └─────────────┴─────────────┘                      │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Claw API Cluster                        │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐       │    │
│  │  │  claw-1   │  │  claw-2   │  │  claw-3   │       │    │
│  │  └───────────┘  └───────────┘  └───────────┘       │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         ConstraintTheory Service                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  PostgreSQL    Redis    S3    CloudWatch             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Scalability

### Horizontal Scaling

**Spreadsheet-Moment:**
- Stateful: Session affinity required
- Scale: Multiple instances with load balancer
- Limit: Database connections

**Claw:**
- Stateless: Can scale horizontally
- Scale: Multiple instances with load balancer
- Limit: ConstraintTheory service

**ConstraintTheory:**
- Stateful: Spatial index in memory
- Scale: Sharded by spatial region
- Limit: Cross-shard queries

### Vertical Scaling

**Resource Requirements:**

| Component | CPU | RAM | Disk | Network |
|-----------|-----|-----|------|---------|
| Spreadsheet-Moment | 4 cores | 8 GB | 20 GB | 1 Gbps |
| Claw | 8 cores | 16 GB | 50 GB | 10 Gbps |
| ConstraintTheory | 16 cores | 32 GB | 100 GB | 10 Gbps |
| Dodecet-Encoder | 2 cores | 4 GB | 10 GB | 1 Gbps |

### Performance Targets

**Latency:**
- Agent creation: <100ms
- Trigger processing: <10ms
- Spatial query: <1ms
- Cell update: <50ms

**Throughput:**
- Agents per instance: 10,000+
- Triggers per second: 100,000+
- Concurrent users: 1,000+
- API requests per second: 10,000+

---

**Last Updated:** 2026-03-18
**Version:** 0.1.0
**Contributors:** See [CONTRIBUTORS.md](CONTRIBUTORS.md)
