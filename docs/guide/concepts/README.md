# LOG System Overview

The LOG (Ledger-Organizing Graph) system is the foundation of POLLN. It's a paradigm where every cell is a living entity with sensation, memory, and agency.

## Multiple Interpretations of LOG

LOG is intentionally polysemous - each interpretation reveals a different aspect of the system:

### 1. Ledger-Organizing Graph
*The Accounting View*

Every cell is a ledger entry tracking transformations. The graph organizes how value/information flows through the system, with an audit trail built into every operation.

```
[A1: $1000] ──→ [A2: Tax = 10%] ──→ [A3: $900]
     │                              │
     └──────→ [A4: Total = $1900] ←──┘
```

### 2. Ledger-Originating Geometry
*The Structural View*

Ledgers create geometric structures in data space. Points, lines, and planes emerge from cell relationships, creating shape and form from raw information.

```
     Value
       ↑
       │    ● A3
       │   ╱ ╲
       │  ╱   ╲
       │ ●A1  ●A2
       │
       └────────────────→ Time
```

### 3. Logically-Orchestrating Graph
*The Computational View*

Logic flows through graph edges. The orchestration of multiple reasoning paths enables parallel and sequential composition of operations.

```
┌─────────────┐
│   Input     │
└──────┬──────┘
       │
   ┌───┴───┬─────┐
   ▼       ▼     ▼
[AND]   [OR]  [NOT]
   │       │     │
   └───┬───┴─────┘
       ▼
   ┌─────────┐
   │  Output │
   └─────────┘
```

### 4. Logistics-of-a-Graph
*The Operational View*

Movement of information through the network. The supply chain of reasoning, with distribution and routing optimization.

```
Warehouse (A1) → Logistics (A2) → Customer (A3)
                   ↑
                   │
              Route Optimization
```

### 5. Logos-Organization-Geocentered
*The Philosophical View*

- **LOGOS**: Word, reason, principle
- **ORGANIZATION**: Structured arrangement
- **GEOCENTERED**: Origin at self, head/tail paradigm

## The Cell: Head, Body, Tail

Every cell in POLLN has three components:

### Head (Input/Sensation)
The head receives data and "feels" changes from other cells or external sources.

```typescript
const cell = new LogCell('A1', {
  head: {
    sensation: 'absolute_change',  // What to feel
    threshold: 0.15,              // When to react
    sources: ['B1', 'C1']         // Who to watch
  }
})
```

### Body (Processing/Reasoning)
The body transforms inputs using logic, patterns, or machine learning.

```typescript
body: {
  analyzer: 'statistical',
  window: 7,                    // 7-day window
  confidence: 0.95              // 95% confidence
}
```

### Tail (Output/Action)
The tail produces results and can trigger actions in other cells.

```typescript
tail: {
  action: 'notify',
  targets: ['admin@company.com'],
  format: 'summary'
}
```

## Cell Anatomy

```
┌─────────────────────────────────────────────────────────────┐
│                        CELL                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   HEAD                  BODY                  TAIL          │
│  [Input]  ──────────→ [Process]  ──────────→ [Output]       │
│     │                      │                      │         │
│     │ Sensation            │ Reasoning            │ Action  │
│     ▼                      ▼                      ▼         │
│  • Monitor            • Transform              • Update     │
│  • Detect             • Analyze               • Notify     │
│  • Receive            • Decide                • Trigger    │
│                                                              │
│   ORIGIN: Self-Reference Point                               │
│   ────────────────────────────────                           │
│   Can monitor other cells:                                   │
│   • Absolute change (state delta)                            │
│   • Rate of change (velocity)                                │
│   • Acceleration (trend)                                     │
│   • Presence/absence                                         │
│   • Pattern matches                                          │
│   • Anomalies                                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Origin-Centered Design

Each cell sees itself as the origin (0,0,0) in a coordinate system. All other cells are positioned relative to it.

```
        Cell B
           ↑
           │ (0, +1)
           │
Cell C ←── Cell A ──→ Cell D
(-1, 0)    ORIGIN     (+1, 0)
           │
           │ (0, -1)
           ↓
        Cell E
```

This enables:
- **Relative positioning**: Cells know their neighbors
- **Spatial reasoning**: Cells can reason about position
- **Local computation**: Each cell computes independently
- **Emergent behavior**: Global patterns from local rules

## Sensation Types

Cells don't just compute - they *feel* changes:

### Absolute Change
```typescript
// State delta: new - old
sensation: 'absolute_change'
// Example: Value went from 100 to 150 = +50
```

### Rate of Change
```typescript
// First derivative: d/dt
sensation: 'rate_of_change'
// Example: Changing at 10 units per second
```

### Acceleration
```typescript
// Second derivative: d²/dt²
sensation: 'acceleration'
// Example: Rate is increasing (trending up)
```

### Presence
```typescript
// Cell exists/active
sensation: 'presence'
// Example: Cell B is now active
```

### Pattern
```typescript
// Pattern match detected
sensation: 'pattern'
// Example: Detected seasonal pattern
```

### Anomaly
```typescript
// Deviation from expected
sensation: 'anomaly'
// Example: Value is 3σ from mean
```

## Colony Architecture

Cells organize into colonies for coordination and scalability:

```
┌─────────────────────────────────────────────────────────┐
│                      COLONY                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐      │
│   │ Cell 1 │  │ Cell 2 │  │ Cell 3 │  │ Cell 4 │      │
│   └────────┘  └────────┘  └────────┘  └────────┘      │
│        │            │            │            │         │
│        └────────────┴────────────┴────────────┘         │
│                      │                                   │
│              ┌───────┴────────┐                          │
│              │  Coordinator   │                          │
│              └────────────────┘                          │
│                      │                                   │
│              ┌───────┴────────┐                          │
│              │  Communication │                          │
│              │    Protocol     │                          │
│              └────────────────┘                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Colony Benefits

- **Coordination**: Cells work together toward goals
- **Communication**: Direct message passing between cells
- **Scalability**: Add/remove cells dynamically
- **Resilience**: Colony survives cell failures
- **Learning**: Shared knowledge across cells

## Information Flow

```
┌───────────────────────────────────────────────────────────┐
│                    INFORMATION FLOW                        │
├───────────────────────────────────────────────────────────┤
│                                                            │
│   External Input                                          │
│        │                                                   │
│        ▼                                                   │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐             │
│   │ Cell A  │───→│ Cell B  │───→│ Cell C  │             │
│   └─────────┘    └─────────┘    └─────────┘             │
│        │              │              │                    │
│        │              │              │                    │
│        ▼              ▼              ▼                    │
│   [Sensation]   [Reasoning]    [Action]                  │
│        │              │              │                    │
│        └──────────────┴──────────────┘                    │
│                       │                                   │
│                       ▼                                   │
│              External Output                              │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. Cells Are Alive
Every cell has sensation, memory, and agency. It's not just a computation - it's an entity.

### 2. Origin-Centered
Each cell sees itself as the origin. It monitors others relative to itself.

### 3. Head-Tail Flow
Information flows from head (input) through body (processing) to tail (output).

### 4. Sensation-Based Awareness
Cells don't just compute - they *feel* changes in their neighbors.

### 5. Inspectability
Every sensation, reasoning step, and action is visible and modifiable.

### 6. Functional Before Smart
Get the living cell working first. Then add intelligence.

## Next Steps

- [Head/Body/Tail Paradigm](./head-body-tail) - Deep dive into cell structure
- [Cell Types](./cell-types) - All available cell types
- [Sensation Types](./sensation) - Complete sensation reference
- [Colony Architecture](./colony) - How colonies work
- [Communication](./communication) - Cell-to-cell messaging

---

**Ready to build?** Check out the [Quick Start Guide](../quick-start) or explore [Cell Types](./cell-types)!
