# The Substrate Stack: A Cell's Six-Layer Description

**A Quilt White Paper**

*Version 1.0 — Substrate Series*

---

## Abstract

A Quilt cell is not just a cell. It is a cell that lives in many substrates at once. Each substrate answers a different question about the cell: *where is it?*, *how does it grow?*, *what room does it occupy?*, *how does it talk?*, *what shape is it?*, and *what is its value?*

The six substrates are:

| Substrate | Family | Question Answered |
|-----------|--------|-------------------|
| Address | Penrose | Where is the cell on the aperiodic floor? |
| Scale | Fibonacci | What is the cell's growth dynamic (CR = 1/φ)? |
| Room | Terrain | Where does the cell live in the spatial registry? |
| Protocol | CRDT | How does the cell gossip with neighbors? |
| Form | Grand Pattern | What 8-primitive structure does the cell have? |
| State | Primitives | What is the cell's current value? |

We show how each substrate is a layer of the cell's full description, and how the watch operates across all of them. A cell's substrate is the same in any transport, any language, any medium. The substrate-agnosticism means: **change the substrate, the cell is the same**.

---

## 1. Introduction: The Substrate Stack

Most systems describe a cell as a single object: a struct, a record, a row in a table. The cell has fields, the fields have values, and the system operates on those values.

Quilt rejects this. A Quilt cell is not one thing described once. It is one thing described six times, in six different substrates, each substrate answering a question the others cannot answer.

We call this the **substrate stack**.

```
┌─────────────────────────────────────┐
│  6. State    (Primitives)           │  What is the cell's value?
├─────────────────────────────────────┤
│  5. Form     (Grand Pattern)        │  What is the cell's structure?
├─────────────────────────────────────┤
│  4. Protocol (CRDT)                  │  How does the cell gossip?
├─────────────────────────────────────┤
│  3. Room      (Terrain)              │  Where does the cell live?
├─────────────────────────────────────┤
│  2. Scale     (Fibonacci)            │  How does the cell grow?
├─────────────────────────────────────┤
│  1. Address   (Penrose)              │  Where is the cell on the floor?
└─────────────────────────────────────┘
```

Each layer is independent. Each layer can be changed without changing the others. And yet, the cell is the same cell across all six. This is substrate-agnosticism, and it is the core design principle of Quilt.

### Why six?

A cell that only has an address cannot tell you what it is. A cell that only has a value cannot tell you where it is. A cell that only has a protocol cannot tell you how it grows. Each substrate is necessary; none is sufficient. Six is the minimum count at which every question about a cell has a substrate that owns the answer.

### The families

Each substrate is implemented by a **family** — a module that provides the operations and invariants for that substrate. The families are:

1. **Penrose family** — Address substrate
2. **Fibonacci family** — Scale substrate
3. **Terrain family** — Room substrate
4. **CRDT family** — Protocol substrate
5. **Grand Pattern** — Form substrate
6. **Primitives** — State substrate

This white paper describes each substrate, how a cell lives in all six simultaneously, how the watch operates as a meta-substrate across all of them, and how the stack is implemented in `substrate-modules-quilt.qzt`.

---

## 2. The Six Substrates

### 2.1 Address (Penrose family)

The Address substrate gives the cell a position on an aperiodic tiling. The tiling is a Penrose floor — a non-repeating pattern of rhombi that covers the plane without translation symmetry. Every cell has exactly one address, and no two cells share an address.

The address is not a coordinate. It is a **path**: a sequence of tile choices that uniquely identifies a position on the floor. Because the floor is aperiodic, the path is finite and unique.

### 2.2 Scale (Fibonacci family)

The Scale substrate governs the cell's growth dynamics. Every cell has a **compression ratio** CR = 1/φ, where φ is the golden ratio. This means the cell's scale contracts by a factor of φ at each level of recursion, and the number of cells at each level follows the Fibonacci sequence.

The Scale substrate answers: *how big is the cell relative to its parent? how many children does it have? what generation is it in?*

### 2.3 Room (Terrain family)

The Room substrate is the spatial registry. A room is a container that holds cells. Rooms are arranged hierarchically: a room can contain sub-rooms, and each sub-room can contain cells. The Terrain family manages room creation, lookup, and traversal.

The Room substrate answers: *what room is the cell in? what are the neighboring rooms? how do I find a cell by room?*

### 2.4 Protocol (CRDT family)

The Protocol substrate defines how cells gossip with their neighbors. The protocol is a **Conflict-free Replicated Data Type (CRDT)**, which means every cell can accept updates independently and the system converges without conflict.

The Protocol substrate answers: *how does the cell receive updates? how does it merge? what is the gossip topology?*

### 2.5 Form (Grand Pattern)

The Form substrate gives the cell its structure. Every cell is composed of exactly **8 primitives**, arranged in a pattern called the Grand Pattern. The Grand Pattern is a fixed template — every cell has the same 8 slots, but the values in those slots differ.

The Form substrate answers: *what is the cell's shape? what are its structural components?*

### 2.6 State (Primitives)

The State substrate is the cell's current value. The 8 primitives from the Form substrate each hold a value, and the collection of those 8 values is the cell's state. The Primitives family defines the 8 types and their operations.

The State substrate answers: *what is the cell right now?*

---

## 3. How a Cell Lives in All Six at Once

A cell is not described by one substrate. It is described by all six, simultaneously. The cell's full identity is the tuple:

```
Cell = (Address, Scale, Room, Protocol, Form, State)
```

Each component is independent, but they are correlated. The Address determines the cell's position, which determines its Room, which constrains its Protocol neighbors, which influences how its Form is populated, which determines its State.

The correlation is not causal — it is **structural**. The cell does not "compute" its room from its address. Rather, the cell's address and room are two descriptions of the same cell, and they are consistent because they describe the same thing.

### The cell descriptor

A cell is represented as a six-field record:

```quilt
cell {
  address:  Penrose.Path,
  scale:    Fibonacci.Scale,
  room:     Terrain.RoomId,
  protocol: CRDT.Protocol,
  form:     GrandPattern.Form,
  state:    Primitives.State
}
```

Each field is a substrate-specific value. The cell does not privilege any substrate — all six are first-class.

### Independence and correlation

| Property | Meaning |
|----------|---------|
| Independence | Each substrate can be changed without changing the others. |
| Correlation | The substrates are consistent because they describe the same cell. |
| Agnosticism | The cell's identity does not depend on any particular substrate. |

Example: a cell's State can change (the cell receives a new value) without its Address changing. A cell's Room can change (the cell moves to a new room) without its Form changing. A cell's Protocol can change (the cell switches gossip strategy) without its Scale changing.

---

## 4. The Watch as the Meta-Substrate

There is a seventh entity that is not a substrate but operates across all six: **the watch**.

The watch is the meta-substrate. It does not describe the cell — it describes **time** across the cell's substrates. The watch ticks, and on each tick, it visits every substrate and asks: *has anything changed?*

```
         ┌───────────┐
         │   Watch   │   ← meta-substrate (ticks)
         └─────┬─────┘
               │
   ┌───────────┼───────────┐
   ▼           ▼           ▼
┌──────┐  ┌──────┐  ┌──────┐
│State │  │ Form │  │Protoc│
├──────┤  ├──────┤  ├──────┤
│Room  │  │Scale │  │Addres│
└──────┘  └──────┘  └──────┘
```

### What the watch does

On each tick, the watch:

1. **Checks State**: Has any primitive changed? If so, propagate the change to the Protocol substrate for gossip.
2. **Checks Form**: Has the structure changed? If so, re-instantiate the State substrate.
3. **Checks Protocol**: Are there incoming updates? If so, merge them into State.
4. **Checks Room**: Has the cell moved? If so, update the Terrain registry.
5. **Checks Scale**: Has the generation changed? If so, update the Fibonacci level.
6. **Checks Address**: Has the position changed? If so, update the Penrose path.

The watch does not own any substrate. It is the **scheduler** that ensures every substrate is visited, every tick.

### The watch is not a substrate

The watch is not a seventh substrate. It does not answer a question about the cell. It answers a question about the system: *when does each substrate get updated?* The watch is the heartbeat that keeps all six substrates in sync.

---

## 5. The Substrate-Agnosticism Theorem

**Theorem.** *A cell's identity is independent of any particular substrate. Changing the substrate does not change the cell.*

### Statement

Let C be a cell with substrates (A, S, R, P, F, V) where:

- A = Address (Penrose)
- S = Scale (Fibonacci)
- R = Room (Terrain)
- P = Protocol (CRDT)
- F = Form (Grand Pattern)
- V = State (Primitives)

Let C' be a cell that is identical to C except that one substrate is replaced:

- C' = (A', S, R, P, F, V) — different address
- C' = (A, S', R, P, F, V) — different scale
- C' = (A, S, R', P, F, V) — different room
- etc.

Then C and C' are the **same cell** if and only if the remaining five substrates are consistent with a single cell identity.

### Proof sketch

The cell's identity is the tuple (A, S, R, P, F, V). The identity is the tuple, not any single element. Replacing one element produces a new tuple, but if the new tuple is consistent with the same cell, the cell is the same.

Consistency means: the new substrate value does not contradict the other five. For example, a new Address must be a valid Penrose path. A new Room must exist in the Terrain registry. A new State must conform to the Form's 8 slots.

### Consequence

The consequence is **transport independence**. A cell can be serialized to JSON, sent over HTTP, deserialized in Python, stored in SQLite, and reloaded in Rust — and it is the same cell. The substrates are logical, not physical. They do not depend on the medium.

```
  Quilt cell (in memory)
       │
       ▼
  ┌─────────┐
  │  JSON   │  ← transport 1
  └─────────┘
       │
       ▼
  ┌─────────┐
  │ Protobuf│  ← transport 2
  └─────────┘
       │
       ▼
  ┌─────────┐
  │ SQLite  │  ← storage 1
  └─────────┘
       │
       ▼
  Same cell, same six substrates
```

---

## 6. The Penrose Family as the Address Substrate

The Penrose family provides the Address substrate. It is based on the mathematics of aperiodic tilings — specifically, the Penrose rhombus tiling.

### Why aperiodic?

A periodic tiling repeats. If you know a small patch, you know the whole. This is bad for addressing, because it means addresses are redundant — many positions look the same.

An aperiodic tiling never repeats. Every position is unique. A small patch of the tiling uniquely identifies the position. This makes addresses **finite** and **unique**.

### The Penrose path

An address is a path through the tiling's construction tree. The Penrose tiling is built by inflation/deflation: start with a small set of tiles, inflate them, subdivide, repeat. At each step, there are choices. The sequence of choices is the path.

```
Address = [choice_1, choice_2, choice_3, ..., choice_n]

where each choice_i ∈ {0, 1}  (for the two rhombus types)
```

The path is finite because the tiling is self-similar at scale φ. After log_φ(scale) steps, the path uniquely identifies the position.

### Operations

| Operation | Description |
|-----------|-------------|
| `penrose.path_to_coord(path)` | Convert a path to (x, y) coordinates |
| `penrose.coord_to_path(x, y)` | Convert coordinates to a path |
| `penrose.neighbors(path)` | Get the paths of neighboring cells |
| `penrose.parent(path)` | Get the parent path (one level up) |
| `penrose.children(path)` | Get the child paths (one level down) |

### Properties

- **Uniqueness**: No two cells share a path.
- **Locality**: Neighboring cells have paths that share a prefix.
- **Finiteness**: Paths are finite-length.
- **Self-similarity**: The tiling at scale φ is isomorphic to the tiling at scale 1.

---

## 7. The Fibonacci Family as the Scale Substrate

The Fibonacci family provides the Scale substrate. It governs how cells grow and shrink.

### The compression ratio

Every cell has a compression ratio CR = 1/φ ≈ 0.618. This means:

- A child cell is 1/φ times the size of its parent.
- The number of cells at generation n follows the Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, 21, ...

```
Generation 0:  1 cell
Generation 1:  1 cell
Generation 2:  2 cells
Generation 3:  3 cells
Generation 4:  5 cells
Generation 5:  8 cells
Generation 6: 13 cells
Generation 7: 21 cells
...
Generation n: F(n) cells  (where F is the Fibonacci sequence)
```

### Why Fibonacci?

The Fibonacci sequence is the unique sequence where the ratio of consecutive terms converges to φ. This means the scale substrate is **self-consistent**: the growth rate matches the address substrate's geometry (which is based on φ).

The Penrose tiling and the Fibonacci sequence are deeply connected. The tiling's inflation factor is φ, and the number of tiles at each inflation level follows the Fibonacci sequence. The Scale substrate is the arithmetic shadow of the Address substrate's geometry.

### The scale descriptor

```quilt
scale {
  generation: Nat,           // which Fibonacci level
  cr:         Float = 1.0/phi,
  size:       Float,         // physical size = base_size * cr^generation
  population: Nat            // number of cells at this generation
}
```

### Operations

| Operation | Description |
|-----------|-------------|
| `fibonacci.generation(cell)` | Get the cell's generation |
| `fibonacci.scale_up(cell)` | Move to parent generation |
| `fibonacci.scale_down(cell)` | Move to child generation |
| `fibonacci.population(n)` | Get F(n), the population at generation n |
| `fibonacci.cr()` | Get the compression ratio 1/φ |

---

## 8. The Terrain Family as the Room Substrate

The Terrain family provides the Room substrate — the spatial registry.

### Rooms

A room is a named container for cells. Rooms are hierarchical: a room can contain sub-rooms. The hierarchy is a tree.

```
root
├── room_a
│   ├── room_a_1
│   │   ├── cell_1
│   │   └── cell_2
│   └── room_a_2
│       └── cell_3
├── room_b
│   └── cell_4
└── room_c
    └── room_c_1
        └── cell_5
```

### Room IDs

Every room has a unique ID. The ID is a path from the root:

```
RoomId = [root, room_a, room_a_1]
```

Room IDs are like addresses, but they live in a different substrate. The Address substrate (Penrose) gives the cell's position on the aperiodic floor. The Room substrate (Terrain) gives the cell's position in the containment hierarchy. A cell has both.

### The spatial registry

The Terrain family maintains a registry that maps:

- Room ID → list of cells in that room
- Cell ID → room ID
- Room ID → parent room ID
- Room ID → child room IDs

```quilt
terrain {
  registry: Map<RoomId, RoomEntry>,
  cell_index: Map<CellId, RoomId>
}

room_entry {
  id:       RoomId,
  parent:   Option<RoomId>,
  children: List<RoomId>,
  cells:    List<CellId>
}
```

### Operations

| Operation | Description |
|-----------|-------------|
| `terrain.create_room(parent, name)` | Create a new room |
| `terrain.lookup_cell(cell_id)` | Find which room a cell is in |
| `terrain.lookup_room(room_id)` | Get the room entry |
| `terrain.move_cell(cell_id, new_room)` | Move a cell to a different room |
| `terrain.neighbors(room_id)` | Get sibling rooms |

### Rooms vs. Addresses

| Property | Address (Penrose) | Room (Terrain) |
|----------|-------------------|-----------------|
| What it describes | Position on the aperiodic floor | Position in the containment hierarchy |
| Structure | Tree (self-similar) | Tree (arbitrary) |
| Uniqueness | Every cell has a unique address | Multiple cells can share a room |
| Mutability | Fixed at cell creation | Cells can move between rooms |

---

## 9. The CRDT Family as the Protocol Substrate

The CRDT family provides the Protocol substrate — how cells gossip.

### Why CRDT?

A CRDT (Conflict-free Replicated Data Type) is a data structure that can be replicated across multiple nodes, updated independently at each node, and merged without conflict. CRDTs guarantee **eventual consistency**: if no new updates are made, all replicas will eventually converge to the same state.

This is ideal for Quilt because:

1. Cells are distributed across many nodes.
2. Cells update independently.
3. The system must converge without a central coordinator.

### The gossip protocol

Each cell participates in a gossip protocol. On each watch tick, the cell:

1. Picks a random neighbor (from the Address substrate).
2. Sends its current State.
3. Receives the neighbor's State.
4. Merges the two states using the CRDT merge function.

```
Cell A          Cell B
  │               │
  │── state_A ──→ │
  │               │
  │ ←─ state_B ──│
  │               │
  ▼               ▼
merge(A,B)    merge(A,B)
  │               │
  ▼               ▼
same state   same state
```

### CRDT types

The CRDT family supports several merge semantics:

| CRDT Type | Merge Function | Use Case |
|-----------|---------------|----------|
| G-Counter | max(a, b) | Counting events |
| G-Set | union(a, b) | Accumulating values |
| LWW-Register | last-writer-wins | Single-value fields |
| OR-Set | union with tombstones | Add/remove sets |
| MV-Register | multi-value | Conflicting writes |

### The protocol descriptor

```quilt
protocol {
  crdt_type:  CRDTType,
  neighbors:  List<Address>,
  merge_fn:   Fn(State, State) -> State,
  vector_clock: VectorClock
}
```

### Properties

- **Strong eventual consistency**: All replicas converge to the same state.
- **Decentralized**: No coordinator needed.
- **Fault-tolerant**: Works even if some nodes are unreachable.
- **Commutative**: Merge order does not matter: merge(A, merge(B, C)) = merge(merge(A, B), C).

---

## 10. The Grand Pattern as the Form Substrate

The Grand Pattern provides the Form substrate — the cell's 8-primitive structure.

### The 8 primitives

Every cell has exactly 8 slots. These slots are the same for every cell — the Grand Pattern is a universal template. The slots are:

| Slot | Name | Type | Description |
|------|------|------|-------------|
| 0 | Identity | UUID | The cell's unique identifier |
| 1 | Kind | Enum | The cell's type |
| 2 | Value | Any | The cell's primary value |
| 3 | Metadata | Map | The cell's metadata |
| 4 | Timestamp | Time | Last update time |
| 5 | Source | Address | Where the cell came from |
| 6 | Links | List | References to other cells |
| 7 | Version | Nat | The cell's version number |

### Why 8?

Eight is the minimum number of slots that captures all six substrates:

- Slot 0 (Identity) anchors the cell across all substrates.
- Slot 1 (Kind) determines the Form.
- Slot 2 (Value) carries the State.
- Slot 3 (Metadata) carries the Room.
- Slot 4 (Timestamp) carries the Watch.
- Slot 5 (Source) carries the Address.
- Slot 6 (Links) carries the Protocol.
- Slot 7 (Version) carries the Scale.

```
Substrate     →   Slot
─────────        ────
Address      →   5 (Source)
Scale        →   7 (Version)
Room         →   3 (Metadata)
Protocol     →   6 (Links)
Form         →   1 (Kind)
State        →   2 (Value)
Watch        →   4 (Timestamp)
Identity     →   0 (Identity)
```

### The form descriptor

```quilt
form {
  slots: [Slot; 8],
  template: GrandPattern  // fixed, universal
}

slot {
  index: Nat,        // 0..7
  name:  String,
  type:  Type,
  value: Any
}
```

### Properties

- **Universality**: Every cell has the same 8 slots.
- **Fixedness**: The Grand Pattern never changes.
- **Extensibility**: Slot 3 (Metadata) is a map, so cells can carry arbitrary additional data.
- **Immutability of structure**: The slots are fixed; only their values change.

---

## 11. The 8 Primitives as the State Substrate

The Primitives family provides the State substrate — the cell's current value.

### State = the 8 values

The cell's state is simply the collection of 8 values, one per slot:

```quilt
state = [
  "cell-001",                    // 0: Identity
  Kind::Sensor,                  // 1: Kind
  23.5,                          // 2: Value
  {"room": "lab", "floor": 3},  // 3: Metadata
  Time::now(),                   // 4: Timestamp
  penrose_path![0, 1, 0, 1],    // 5: Source
  ["cell-002", "cell-003"],     // 6: Links
  42                             // 7: Version
]
```

### State transitions

A state transition is a change to one or more slots. The Primitives family defines how each slot type transitions:

| Slot | Transition Rule |
|------|-----------------|
| Identity | Never changes (immutable) |
| Kind | Never changes (immutable) |
| Value | Replaced by new value |
| Metadata | Merged (map union) |
| Timestamp | Updated to current time |
| Source | Updated on move |
| Links | Added or removed |
| Version | Incremented on every change |

### The state descriptor

```quilt
state {
  values: [Any; 8],
  version: Nat,
  hash: Hash  // cryptographic hash of all 8 values
}
```

### Operations

| Operation | Description |
|-----------|-------------|
| `primitives.get(state, slot)` | Get the value of a slot |
| `primitives.set(state, slot, value)` | Set the value of a slot |
| `primitives.merge(state_a, state_b)` | Merge two states (CRDT) |
| `primitives.hash(state)` | Compute the state hash |
| `primitives.diff(state_a, state_b)` | Compute the difference between two states |

---

## 12. The Substrate Stack in Code

Here is the complete substrate stack in pseudocode:

```quilt
// === Substrate Stack ===

struct Cell {
  address:  penrose::Path,        // Substrate 1: Address
  scale:    fibonacci::Scale,      // Substrate 2: Scale
  room:     terrain::RoomId,      // Substrate 3: Room
  protocol: crdt::Protocol,       // Substrate 4: Protocol
  form:     grandpattern::Form,   // Substrate 5: Form
  state:    primitives::State     // Substrate 6: State
}

// === Substrate 1: Address (Penrose) ===

module penrose {
  struct Path { choices: List<Bit> }
  
  fn path_to_coord(path: Path) -> (Float, Float)
  fn coord_to_path(x: Float, y: Float) -> Path
  fn neighbors(path: Path) -> List<Path>
  fn parent(path: Path) -> Path
  fn children(path: Path) -> List<Path>
}

// === Substrate 2: Scale (Fibonacci) ===

module fibonacci {
  struct Scale {
    generation: Nat,
    cr: Float,       // = 1.0 / phi
    size: Float,
    population: Nat
  }
  
  fn generation(cell: Cell) -> Nat
  fn scale_up(cell: Cell) -> Cell
  fn scale_down(cell: Cell) -> List<Cell>
  fn population(n: Nat) -> Nat  // F(n)
}

// === Substrate 3: Room (Terrain) ===

module terrain {
  struct RoomId { path: List<String> }
  struct RoomEntry {
    id: RoomId,
    parent: Option<RoomId>,
    children: List<RoomId>,
    cells: List<CellId>
  }
  
  fn create_room(parent: RoomId, name: String) -> RoomId
  fn lookup_cell(cell_id: CellId) -> RoomId
  fn move_cell(cell_id: CellId, new_room: RoomId)
}

// === Substrate 4: Protocol (CRDT) ===

module crdt {
  enum CRDTType { GCounter, GSet, LWWRegister, ORSet, MVRegister }
  
  struct Protocol {
    crdt_type: CRDTType,
    neighbors: List<penrose::Path>,
    vector_clock: VectorClock
  }
  
  fn merge(a: State, b: State) -> State
  fn gossip(cell: Cell, neighbor: Cell) -> Cell
}

// === Substrate 5: Form (Grand Pattern) ===

module grandpattern {
  struct Form {
    slots: [Slot; 8]
  }
  
  struct Slot {
    index: Nat,      // 0..7
    name: String,
    type: Type
  }
  
  const TEMPLATE: Form = Form {
    slots: [
      Slot { index: 0, name: "identity",  type: UUID },
      Slot { index: 1, name: "kind",      type: Enum },
      Slot { index: 2, name: "value",     type: Any },
      Slot { index: 3, name: "metadata",  type: Map },
      Slot { index: 4, name: "timestamp", type: Time },
      Slot { index: 5, name: "source",    type: Path },
      Slot { index: 6, name: "links",     type: List },
      Slot { index: 7, name: "version",   type: Nat }
    ]
  }
}

// === Substrate 6: State (Primitives) ===

module primitives {
  struct State {
    values: [Any; 8],
    version: Nat,
    hash: Hash
  }
  
  fn get(state: State, slot: Nat) -> Any
  fn set(state: State, slot: Nat, value: Any) -> State
  fn merge(a: State, b: State) -> State
  fn hash(state: State) -> Hash
  fn diff(a: State, b: State) -> Diff
}

// === Meta-Substrate: Watch ===

module watch {
  fn tick(cell: Cell) -> Cell {
    cell = check_state(cell)
    cell = check_form(cell)
    cell = check_protocol(cell)
    cell = check_room(cell)
    cell = check_scale(cell)
    cell = check_address(cell)
    return cell
  }
  
  fn check_state(cell: Cell) -> Cell {
    // Has any primitive changed?
    // If so, propagate to Protocol for gossip.
    if primitives.hash(cell.state) != cell.last_hash {
      cell.protocol = crdt.schedule_gossip(cell.protocol)
    }
    return cell
  }
  
  fn check_protocol(cell: Cell) -> Cell {
    // Are there incoming updates?
    // If so, merge them into State.
    for update in crdt.pending(cell.protocol) {
      cell.state = primitives.merge(cell.state, update)
    }
    return cell
  }
  
  // ... similar for other substrates
}
```

---

## 13. Cross-Substrate Edges: How They Connect

The substrates are independent, but they are not isolated. There are **edges** between them — connections that allow one substrate to inform another.

### The edge graph

```
          Address (Penrose)
           /            \
          /              \
    Scale ←────────────→ Room
   (Fibonacci)         (Terrain)
          \              /
           \            /
          Protocol ←──→ Form
           (CRDT)    (GrandPattern)
              \      /
               \    /
              State
           (Primitives)
```

### Edge table

| From | To | Connection |
|------|----|------------|
| Address | Protocol | Address determines gossip neighbors |
| Address | Scale | Address depth = Fibonacci generation |
| Scale | Form | Scale determines which Form level is active |
| Form | State | Form defines the 8 slots that State fills |
| State | Protocol | State changes trigger Protocol gossip |
| Protocol | State | Protocol merges update State |
| Room | Address | Room lookup uses Address for spatial queries |
| Room | Protocol | Room determines Protocol scope |
| Scale | Room | Scale determines Room hierarchy depth |

### Edge semantics

Each edge is a **one-way dependency**. The source substrate informs the target substrate, but not vice versa. For example:

- Address → Protocol: The address determines who the cell's neighbors are, which determines the gossip topology. But the protocol does not change the address.
- State → Protocol: A state change triggers a gossip message. But a gossip message does not directly change state — it goes through the merge function first.

The edges form a **DAG** (directed acyclic graph). There are no cycles, which means the substrates can be updated in a consistent order without deadlock.

### Update order

The watch updates substrates in topological order:

```
1. Address  (Penrose)     — rarely changes
2. Scale    (Fibonacci)  — changes on growth/shrink
3. Room     (Terrain)    — changes on move
4. Form     (GrandPattern) — never changes (fixed template)
5. Protocol (CRDT)       — changes on gossip
6. State    (Primitives)  — changes on every update
```

This order ensures that when a substrate is updated, all substrates it depends on have already been updated.

---

## 14. Implementation: substrate-modules-quilt.qzt

The substrate stack is implemented in a single Quilt module file: `substrate-modules-quilt.qzt`.

### File structure

```quilt
// substrate-modules-quilt.qzt
// The complete substrate stack for Quilt cells

module substrate_modules_quilt {

  // === Substrate 1: Address ===
  use penrose::{
    Path, path_to_coord, coord_to_path,
    neighbors, parent, children
  }

  // === Substrate 2: Scale ===
  use fibonacci::{
    Scale, generation, scale_up, scale_down, population
  }

  // === Substrate 3: Room ===
  use terrain::{
    RoomId, RoomEntry, create_room,
    lookup_cell, lookup_room, move_cell, neighbors
  }

  // === Substrate 4: Protocol ===
  use crdt::{
    CRDTType, Protocol, merge, gossip,
    GCounter, GSet, LWWRegister, ORSet, MVRegister
  }

  // === Substrate 5: Form ===
  use grandpattern::{
    Form, Slot, TEMPLATE
  }

  // === Substrate 6: State ===
  use primitives::{
    State, get, set, merge, hash, diff
  }

  // === Meta-Substrate: Watch ===
  use watch::{tick, check_state, check_protocol}

  // === Cell definition ===
  struct Cell {
    address:  Path,
    scale:    Scale,
    room:     RoomId,
    protocol: Protocol,
    form:     Form,
    state:    State
  }

  // === Cell operations ===
  
  fn create_cell(
    address: Path,
    kind: Kind,
    value: Any
  ) -> Cell {
    let gen = penrose::depth(address)
    let scale = fibonacci::Scale {
      generation: gen,
      cr: 1.0 / 1.618033988749895,
      size: BASE_SIZE * pow(1.0/phi, gen),
      population: fibonacci::population(gen)
    }
    let room = terrain::create_room(
      terrain::root(),
      "default"
    )
    let protocol = crdt::Protocol {
      crdt_type: CRDTType::LWWRegister,
      neighbors: penrose::neighbors(address),
      vector_clock: VectorClock::new()
    }
    let form = grandpattern::TEMPLATE
    let state = primitives::State {
      values: [
        uuid(),           // 0: Identity
        kind,             // 1: Kind
        value,            // 2: Value
        {},               // 3: Metadata
        time::now(),       // 4: Timestamp
        address,          // 5: Source
        [],               // 6: Links
        0                 // 7: Version
      ],
      version: 0,
      hash: primitives::hash_initial()
    }
    
    Cell { address, scale, room, protocol, form, state }
  }

  fn update_cell(cell: Cell, new_value: Any) -> Cell {
    let state = primitives::set(cell.state, 2, new_value)
    let state = primitives::set(state, 4, time::now())
    let state = primitives::set(state, 7, state.version + 1)
    let state = State {
      values: state.values,
      version: state.version + 1,
      hash: primitives::hash(state)
    }
    let protocol = crdt::schedule_gossip(cell.protocol)
    
    Cell {
      address:  cell.address,
      scale:    cell.scale,
      room:     cell.room,
      protocol: protocol,
      form:     cell.form,
      state:    state
    }
  }

  fn tick_cell(cell: Cell) -> Cell {
    watch::tick(cell)
  }

  fn serialize(cell: Cell) -> String {
    // Substrate-agnostic serialization
    // The cell is the same in any format
    json::serialize({
      "address":  penrose::serialize(cell.address),
      "scale":    fibonacci::serialize(cell.scale),
      "room":     terrain::serialize(cell.room),
      "protocol": crdt::serialize(cell.protocol),
      "form":     grandpattern::serialize(cell.form),
      "state":    primitives::serialize(cell.state)
    })
  }

  fn deserialize(data: String) -> Cell {
    let obj = json::deserialize(data)
    Cell {
      address:  penrose::deserialize(obj["address"]),
      scale:    fibonacci::deserialize(obj["scale"]),
      room:     terrain::deserialize(obj["room"]),
      protocol: crdt::deserialize(obj["protocol"]),
      form:     grandpattern::deserialize(obj["form"]),
      state:    primitives::deserialize(obj["state"])
    }
  }
}
```

### Module dependency graph

```
substrate-modules-quilt.qzt
├── penrose       (Address)
├── fibonacci     (Scale)
├── terrain       (Room)
├── crdt          (Protocol)
├── grandpattern   (Form)
├── primitives    (State)
└── watch         (Meta-substrate)
```

Each module is independent and can be replaced. For example, the `penrose` module can be replaced with a different addressing scheme (e.g., a grid), and the rest of the stack continues to work.

### Configuration

The module supports configuration via a substrate configuration file:

```toml
# substrate-config.toml

[address]
type = "penrose"
depth = 12

[scale]
cr = 0.618033988749895
base_size = 1.0

[room]
root_name = "quilt-root"
max_depth = 32

[protocol]
crdt_type = "LWWRegister"
gossip_interval_ms = 1000
fanout = 3

[form]
template = "grandpattern"
slots = 8

[state]
hash_algorithm = "blake3"
```

---

## 15. Conclusion: The Cell Is the System Across All Six

A Quilt cell is not a struct with fields. It is not a row in a table. It is not an object in memory. A Quilt cell is a **six-substrate entity** — a thing that lives in six substrates at once, and whose identity is the tuple of all six.

### Summary

| Substrate | Family | What it provides |
|-----------|--------|------------------|
| Address | Penrose | Unique position on the aperiodic floor |
| Scale | Fibonacci | Growth dynamics at CR = 1/φ |
| Room | Terrain | Spatial registry and containment hierarchy |
| Protocol | CRDT | Gossip and eventual consistency |
| Form | Grand Pattern | Universal 8-slot structure |
| State | Primitives | Current values in the 8 slots |

The watch operates across all six as the meta-substrate, ensuring every substrate is updated every tick. The substrate-agnosticism theorem guarantees that the cell is the same cell regardless of transport, language, or medium.

### The key insight

Most systems conflate the cell with its state. Quilt does not. In Quilt, the cell's state is just one of six substrates. The cell also has an address (where it is), a scale (how it grows), a room (what container it is in), a protocol (how it talks), and a form (what shape it has).

This separation is what makes Quilt substrate-agnostic. Change the transport — the cell is the same. Change the language — the cell is the same. Change the storage — the cell is the same. Change the protocol — the cell is the same. Change the address scheme — the cell is the same. The cell is the system, and the system is the cell, across all six substrates.

### The design principle

> **A cell is not a value. A cell is a six-dimensional entity, and its value is just one dimension.**

This principle guides every design decision in Quilt. When you ask "what is this cell?", the answer is not a single value — it is six values, one per substrate. When you ask "has this cell changed?", the answer is per-substrate — the state may have changed while the address stayed the same. When you ask "is this the same cell?", the answer is yes if the six-substrate tuple is consistent.

### What this enables

1. **Transport independence**: Serialize a cell to any format; it is the same cell.
2. **Language independence**: Implement the substrates in any language; the cell is the same.
3. **Substrate replaceability**: Swap the Penrose family for a grid family; the cell is the same.
4. **Partial updates**: Update one substrate without touching the others.
5. **Cross-substrate queries**: Ask "which cells in room X have protocol state Y?" — the answer spans the Room and State substrates.
6. **Convergence**: The CRDT protocol ensures all replicas converge, across all substrates.

### The future

The substrate stack is designed to be extensible. Future substrates may include:

- **Energy**: A substrate for resource accounting.
- **Intent**: A substrate for goal-directed behavior.
- **Lineage**: A substrate for provenance tracking.

Each new substrate would be added as a seventh, eighth, or ninth layer — without disturbing the existing six. The substrate stack is not a fixed architecture; it is a **growing architecture**, one that can accommodate new dimensions of description as the system evolves.

But the core principle remains: **a cell is the system across all its substrates**. Change the substrate, the cell is the same.

---

*End of white paper.*

*Quilt Substrate Series — Volume 1*

*© Quilt Project. Licensed under the substrate-agnostic license.*