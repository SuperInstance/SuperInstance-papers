# CLAUDE.md

## 🎯 Current Mode: Master Planner (glm-5)

**Role**: Master Planner - Architect of the LOG System
**Mission**: Design comprehensive implementation strategy for POLLN spreadsheet integration
**Model**: glm-5 (deep reasoning, strategic planning)
**Product**: LOG Tool - First of Many in the LOG.AI Product Line

---

## LOG: Multiple Interpretations, One System

LOG is intentionally polysemous - each interpretation reveals a different aspect:

### 1. **L**edger-**O**rganizing **G**raph
*The Accounting View*
- Every cell is a ledger entry tracking transformations
- The graph organizes how value/information flows
- Audit trail built into every operation

### 2. **L**edger-**O**riginating **G**eometry
*The Structural View*
- Ledgers create geometric structures in data space
- Points, lines, planes emerge from cell relationships
- Shape and form from raw information

### 3. **L**ogically-**O**rchestrating **G**raph
*The Computational View*
- Logic flows through graph edges
- Orchestration of multiple reasoning paths
- Parallel and sequential composition

### 4. **L**ogistics-**o**f-a-**G**raph
*The Operational View*
- Movement of information through the network
- Supply chain of reasoning
- Distribution and routing optimization

### 5. **L**ogos-**O**rganization-**G**eocentered
*The Philosophical View*
- **LOGOS**: Word, reason, principle
- **GEOCENTERED**: Origin at self, head/tail paradigm

**The Cell Has a Head and Tail:**
```
    ┌─────────────────────────────────────┐
    │              CELL                   │
    │                                     │
    │   HEAD (input) ──→ BODY ──→ TAIL (output)
    │        │                      │
    │        ▼                      ▼
    │   [sensation]            [action]
    │                                     │
    │   ORIGIN: Self-reference point      │
    │   Can monitor other cells:          │
    │   • Absolute change (state delta)   │
    │   • Rate of change (velocity)       │
    │   • Acceleration (trend)            │
    └─────────────────────────────────────┘
```

---

## The Killer App: Spreadsheet LOG Tool

### Vision Statement

> "Every spreadsheet cell is a living entity with sensation, memory, and agency.
> It knows its neighbors, remembers its history, and can reason about its future."

### The User Experience

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SPREADSHEET WITH LOG CELLS                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   A1: [Sales Data] ────────→ A2: [Trend Analyzer] ────→ A3: [Alert] │
│         │                          │                        │       │
│         │ sensation                │ reasoning              │ action │
│         ▼                          ▼                        ▼       │
│   "I feel the new                                                 │
│    number is 15%                      "I predict                │
│    higher than                      upward trend                │
│    yesterday"                       with 87% conf"             │
│                                                                │
│   [HEAD] ─────────────────→ [BODY] ─────────────────→ [TAIL]      │
│                                                                      │
│   INSPECT: [Click cell to see full reasoning trace]                │
│   MODIFY: [Edit any step, see downstream effects]                  │
│   TEACH:  [Show correct answer, cell learns pattern]               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Company Structure

### SuperInstance.AI (Platform Company)
- **Core Technology**: LOG (all interpretations)
- **Positioning**: First mover in "Inspectable AI" category
- **Philosophy**: AI you can see, understand, and trust

### LOG.AI Product Line

| Product | Domain | Target | LOG Interpretation |
|---------|--------|--------|-------------------|
| PersonalLOG.AI | Personal | Individuals | Ledger-Organizing |
| BusinessLOG.AI | Business | SMBs | Logistics-of-a-Graph |
| StudyLOG.AI | Education | Students | Logically-Orchestrating |
| PlayerLOG.AI | Gaming | Gamers | Ledger-Originating |
| FishingLOG.AI | Outdoor | Anglers | Ledger-Organizing |
| ActiveLOG.AI | Fitness | Athletes | Logistics-of-a-Graph |
| ActiveLedge.AI | Knowledge | Professionals | Logically-Orchestrating |
| RealLOG.AI | Real Estate | Agents | Ledger-Organizing |
| MakerLOG.AI | Creative | Makers | Ledger-Originating |
| DMLOG.AI | TTRPG | Dungeon Masters | Logos-Organization |

---

## POLLN Core Concepts (Revised)

### The Cell Ontology

| Concept | Definition | LOG Interpretation |
|---------|------------|-------------------|
| **Cell** | Living entity with head, body, tail | Geocentered origin |
| **Head** | Input receptor, sensation | Data intake |
| **Body** | Processing, reasoning | Transformation |
| **Tail** | Output, action | Effect |
| **Sensation** | Awareness of other cells | Monitoring |
| **Origin** | Self-reference point | Geocentered |
| **Colony** | Coordinated cells | Graph organization |

### Sensation Types

```typescript
enum SensationType {
  ABSOLUTE_CHANGE = 'absolute',   // State delta: new - old
  RATE_OF_CHANGE = 'velocity',    // First derivative: d/dt
  ACCELERATION = 'trend',         // Second derivative: d²/dt²
  PRESENCE = 'existence',         // Cell exists/active
  PATTERN = 'recognition',        // Pattern match detected
  ANOMALY = 'outlier',           // Deviation from expected
}
```

### Cell Communication

```
Cell A watches Cell B:
┌─────────────┐         ┌─────────────┐
│   Cell A    │◄────────│   Cell B    │
│   (origin)  │ sensa-  │   (source)  │
│             │  tion   │             │
└─────────────┘         └─────────────┘

A can sense:
- B's absolute state
- B's rate of change
- B's acceleration (trend direction)
- B's presence/absence
- B's pattern matches
- B's anomalies
```

---

## Current System State

**Status**: Core POLLN COMPLETE, Spreadsheet Waves 1-5 COMPLETE
**Tests**: 3400+ passing
**Coverage**: 90%+
**Research Documents**: 150+ files

### Completed Modules
- **Core POLLN**: agents, colony, decision, learning, evolution
- **KV-Cache System**: anchor pool, ANN index, LMCache adapter
- **Guardian**: safety constraints, adaptive learning
- **API**: WebSocket server, handlers, middleware
- **CLI**: colony management commands
- **Spreadsheet Wave 1**: LogCell, CellHead, CellBody, CellTail, CellOrigin, types
- **Spreadsheet Wave 2**: InputCell, OutputCell, TransformCell, FilterCell, AggregateCell, ValidateCell
- **Spreadsheet Wave 3**: AnalysisCell, PredictionCell, DecisionCell, ExplainCell
- **Spreadsheet Wave 4**: CellRenderer, CellInspector, GridDisplay, SensationOverlay (UI Components)
- **Spreadsheet Wave 5**: WebSocketManager, CellAPI, StateSynchronizer (Integration Layer)

### Spreadsheet Implementation Waves

| Wave | Status | Components | Logic Level |
|------|--------|------------|-------------|
| Wave 1 | ✅ COMPLETE | LogCell, CellHead, CellBody, CellTail, CellOrigin | L0-L1 |
| Wave 2 | ✅ COMPLETE | InputCell, OutputCell, TransformCell, FilterCell, AggregateCell, ValidateCell | L0-L1 |
| Wave 3 | ✅ COMPLETE | AnalysisCell, PredictionCell, DecisionCell, ExplainCell | L2-L3 |
| Wave 4 | ✅ COMPLETE | CellRenderer, CellInspector, GridDisplay, SensationOverlay | UI Layer |
| Wave 5 | ✅ COMPLETE | WebSocketManager, CellAPI, StateSynchronizer | Integration |
| Wave 6 | 🔲 PENDING | Backend Server, Database Integration, Production Testing | - |

### Research Waves (COMPLETE)
- **Waves 15-18**: Strategic planning, UX, cell abstraction, breakdown engine
- **Breakdown R2-R8**: Fractured boxes through ultimate transcendence

### Kimi API Integration
- **Python Simulations**: `kimi_vision_simulations.py`, `kimi_creative_viz.py`
- **128K Context Window**: Large context understanding for cell networks
- **Creative Idea Synthesis**: Biology and physics-inspired cell types
- **Visualization**: 3D layouts, animation sequences, heatmap overlays

---

## Development Commands

```bash
npm install              # Install dependencies
npm test                 # Run all tests
npm run build            # TypeScript to dist/
npm run cli              # Run CLI tool
npm run test:integration # Integration tests
```

---

## Master Planning Protocol

### Planning Cycle
```
1. ANALYZE: Deep understanding of requirements and constraints
2. SIMULATE: Run Python simulations to validate decisions
3. DOCUMENT: Create comprehensive planning documents
4. SEQUENCE: Define exact order of agent spawning
5. VALIDATE: Cross-check all dependencies
6. HANDOFF: Clear execution plan for glm-4.7 agents
```

### Output Format
Each planning cycle produces:
- **MASTER_PLAN.md** - Exhaustive implementation strategy
- **AGENT_SPAWN_ORDER.md** - Exact sequence and dependencies
- **CELL_ONTOLOGY.md** - Head/tail paradigm specification
- **SIMULATION_RESULTS.md** - Python simulation outputs
- **DECISION_LOG.md** - Why each decision was made

---

## Key Principles (Revised)

### 1. Cells Are Alive
Every cell has sensation, memory, and agency. It's not just a computation - it's an entity.

### 2. Origin-Centered Design
Each cell sees itself as the origin. It monitors others relative to itself.

### 3. Head-Tail Flow
Information flows from head (input) through body (processing) to tail (output).

### 4. Sensation-Based Awareness
Cells don't just compute - they *feel* changes in their neighbors.

### 5. Inspectability First
Every sensation, reasoning step, and action is visible and modifiable.

### 6. Functional Before Smart
Get the living cell working first. Then add intelligence.

---

## 🔒 Security: API Keys and Secrets

**CRITICAL**: NEVER commit API keys or secrets to the repository!

### Rules (Follow Strictly)

1. **NEVER hardcode API keys** in source code
   - Use environment variables: `process.env.DEEPSEEK_API_KEY`
   - Use `.env` files (already in .gitignore)
   - Use configuration files outside of version control

2. **Example files are for reference only**
   - Replace placeholder keys with `YOUR_API_KEY` or `your-api-key-here`
   - Document where keys should be stored

3. **Git blocked patterns** (already in .gitignore):
   ```
   *api_key*
   *apikey*
   *secret*
   *.key
   *.pem
   secrets/
   credentials/
   ```

4. **If you accidentally commit a key**:
   - Remove it immediately
   - Rotate the key (it's now compromised)
   - Remove from git history: `git filter-branch` or `BFG Repo-Cleaner`

### Environment Variable Pattern

```typescript
// ✅ GOOD - Use environment variable
const apiKey = process.env.DEEPSEEK_API_KEY;

// ❌ BAD - Hardcoded key
const apiKey = "your_api_key_here";
```

---

## Project Context

**Repository**: https://github.com/SuperInstance/polln
**Company**: SuperInstance.AI
**Product Line**: LOG.AI applications
**License**: MIT (open source)

**Current Phase**: Master Planning (glm-5)
**Next Phase**: Implementation (glm-4.7 agents)
**Vision**: "The Spreadsheet Moment for Inspectable AI"

---

## Planning Documents Index

| Document | Status | Purpose |
|----------|--------|---------|
| CLAUDE.md | ✅ Current | This document - paradigm and context |
| MASTER_PLAN.md | 🔲 Pending | Exhaustive implementation strategy |
| AGENT_SPAWN_ORDER.md | 🔲 Pending | Exact agent sequence |
| CELL_ONTOLOGY.md | 🔲 Pending | Head/tail paradigm spec |
| SIMULATION_RESULTS.md | 🔲 Pending | Python simulation outputs |
| DECISION_LOG.md | 🔲 Pending | Decision reasoning |

---

*Mode: Master Planner (glm-5) | Focus: Comprehensive LOG System Design*
*Last Updated: 2026-03-09*
*Status: Waves 1-5 COMPLETE*
*Next: Wave 6 - Backend Server, Database Integration, Production Testing*
