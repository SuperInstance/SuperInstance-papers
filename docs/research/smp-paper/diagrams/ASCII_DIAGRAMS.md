# ASCII Diagrams for SMP White Paper

**Created**: 2026-03-09
**Purpose**: Visual representations of core SMP concepts
**Format**: ASCII art optimized for markdown rendering

---

## 1. Confidence Flow Diagram

Shows how confidence cascades through sequential and parallel tile execution.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONFIDENCE FLOW THROUGH TILES                            │
└─────────────────────────────────────────────────────────────────────────────┘

INPUT DATA: [Customer Transaction Records]
     │
     ▼
┌─────────────────┐
│  TILE 1: Parse  │  Confidence: 0.98  ◄─── High confidence, proceed
│   Transaction   │
└────────┬────────┘
         │
    ┌────┴────┐
    │ SPLIT   │
    └────┬────┘
         │
    ┌────┴──────────────────────────────┐
    │                                   │
    ▼                                   ▼
┌──────────────┐                 ┌──────────────┐
│ TILE 2A:     │                 │ TILE 2B:     │
│ Amount Check │ Confidence: 0.95│ Category     │
└──────┬───────┘                 └──────┬───────┘
       │                                │
       │                         Confidence: 0.72 ◄─── Medium confidence
       │                                │
    ┌──┴────────────┐              ┌────┴─────┐
    │               │              │ REQUEST  │
    ▼               ▼              │ REFACTOR │
┌────────┐    ┌────────┐          └────┬─────┘
│TILE 3A │    │TILE 3B │               │
│ Fraud  │    │ Valid  │               ▼
│ Score  │    │ Amount│          ┌──────────┐
└───┬────┘    └───┬───┘          │ TILE 2C: │
    │             │               │ Human    │
Confidence:    Confidence:        │ Review   │
   0.89           0.96            └──────────┘
    │             │                     │
    └──────┬──────┘                     │
           │                            │
           ▼                            ▼
      ┌─────────┐               Confidence: 0.35
      │ TILE 4: │               ◄───────────────── Low confidence,
      │ Merge   │                           human review required
      │ Results │
      └────┬────┘
           │
           ▼
    FINAL CONFIDENCE: 0.91
    ◄───────────────── Weighted average of all branches
```

**Caption**: Confidence scores flow through tiles like water through pipes. High confidence (green) means automatic processing. Medium confidence (yellow) triggers refinement. Low confidence (red) requires human intervention. Parallel tiles maintain independent confidence until merged.

---

## 2. Three-Zone Model

The confidence threshold system that determines tile behavior.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THREE-ZONE CONFIDENCE MODEL                         │
└─────────────────────────────────────────────────────────────────────────────┘

    1.0 ┤                                              ╱╲    FRICTIONLESS ZONE
        │                                          ╱━━━━╲  (GREEN)
        │                                       ╱━━━━━━━━╲
        │                                    ╱━━━━━━━━━━━━╲
        │                                 ╱━━━━━━━━━━━━━━━━━━╲
        │                              ╱━━━━━━━━━━━━━━━━━━━━━━━━╲
    0.8 ┤                           ╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
        │                        ╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
        │                     ╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
        │                  ╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
    0.7 ┤───────────────╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲───
        │           ╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
        │        ╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
        │      ╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
        │    ╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
    0.5 ┤──╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
        │ ╱━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
        │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╲
        │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    0.3 ┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    0.1 ┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        └──────────────────────────────────────────────────────────────────────
         RED ZONE              YELLOW ZONE                GREEN ZONE
    (HUMAN INTERVENTION)    (REFACTOR/REFINE)          (AUTOMATIC)

    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │ 0.0 - 0.3       │    │ 0.3 - 0.7       │    │ 0.7 - 1.0       │
    │                 │    │                 │    │                 │
    │ • Stop execution│    │ • Add sub-tiles │    │ • Full speed    │
    │ • Flag human    │    │ • Refine prompt │    │ • No intervention│
    │ • Log failure   │    │ • Try alternate │    │ • Cache results │
    │ • Request help  │    │ • Adjust params │    │ • Update model  │
    └─────────────────┘    └─────────────────┘    └─────────────────┘

    ACTION TRIGGERS:
    ┌──────────────────────────────────────────────────────────────────────┐
    │ Confidence 0.25 → HUMAN REVIEW: "Ambiguous transaction category"    │
    │ Confidence 0.52 → REFACTOR:   "Break into sub-tiles for precision" │
    │ Confidence 0.88 → AUTO:        "Process and cache for 24h"         │
    └──────────────────────────────────────────────────────────────────────┘
```

**Caption**: The three-zone model creates clear boundaries for tile behavior. Green zone (0.7-1.0) is frictionless - automatic processing with caching. Yellow zone (0.3-0.7) triggers refinement through sub-tiling or prompt adjustment. Red zone (0.0-0.3) stops execution and requests human intervention. Thresholds are configurable per tile type.

---

## 3. Stigmergic Coordination

How tiles leave "pheromones" (data traces) that guide other tiles.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STIGMERGIC TILE COORDINATION                           │
└─────────────────────────────────────────────────────────────────────────────┘

    TIME STEP 1: Tile A writes "pheromones" to cell
    ────────────────────────────────────────────────────────────────────────

    ┌─────────────────────────────────────────────────────────────────────┐
    │ SPREADSHEET GRID                                                    │
    ├─────────────────────────────────────────────────────────────────────┤
    │   A   │   B   │   C   │   D   │   E   │   F   │   G   │   H   │    │
    ├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤    │
    │ 1     │DATA   │       │       │       │       │       │       │    │
    │       │ [5.2] │       │       │       │       │       │       │    │
    ├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤    │
    │ 2     │       │TILE A │       │       │       │       │       │    │
    │       │       │ writes│       │       │       │       │       │    │
    ├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤    │
    │ 3     │       │  ◄────┼── Pheromone Trail ────┐       │       │    │
    │       │       │       │confidence: 0.92       │       │       │    │
    ├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤    │
    │ 4     │       │       │       │       │       │       │       │    │
    │       │       │       │       │       │       │       │       │    │
    └───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┘    │
                                                                     │    │
    TILE A deposits:                                                    │    │
    {                                                                  │    │
      "source_tile": "TILE_A_001",                                     │    │
      "confidence": 0.92,                                              │    │
      "timestamp": "2026-03-09T14:32:15Z",                             │    │
      "data_hash": "a7f3c9d2",                                         │    │
      "scent_decay": 24  # hours                                       │    │
    }                                                                  │    │
                                                                     │    │
    ──────────────────────────────────────────────────────────────────────

    TIME STEP 2: Tiles B and C sense pheromones, adjust behavior
    ────────────────────────────────────────────────────────────────────────

    ┌─────────────────────────────────────────────────────────────────────┐
    │   A   │   B   │   C   │   D   │   E   │   F   │   G   │   H   │    │
    ├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤    │
    │ 1     │DATA   │       │       │       │       │       │       │    │
    │       │ [5.2] │       │       │       │       │       │       │    │
    ├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤    │
    │ 2     │TILE B │TILE A │       │       │       │       │       │    │
    │       │senses │ wrote │       │       │       │       │       │    │
    ├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤    │
    │ 3     │       │  ◄────┼── Strong Scent Detected ────┐ TILE C│    │
    │       │       │       │"Use this output!" │       │ senses│    │
    │       │       │       │      ╔════════════╧════════╗│      │    │
    ├───────┼───────┼───────┼───────┴───────╧───────┼───────┼───────┤    │
    │ 4     │       │       │                       │       │      │    │
    │       │       │       │                       │       │      │    │
    └───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┘    │
                                                                     │    │
    TILE B: "Detected high-confidence output from TILE_A"              │    │
            → Action: Skip reprocessing, use TILE_A result              │    │
                                                                     │    │
    TILE C: "Detected high-confidence output from TILE_A"              │    │
            → Action: Build on TILE_A result, don't recompute           │    │
                                                                     │    │
    ──────────────────────────────────────────────────────────────────────

    PHEROMONE DATA STRUCTURE:
    ┌──────────────────────────────────────────────────────────────────────┐
    struct Pheromone {                                                     │
        tile_id: UUID,              # Which tile left this                │
        cell_ref: CellAddress,       # Where deposited                    │
        confidence: float,           # Output confidence                  │
        timestamp: DateTime,         # When deposited                     │
        scent_strength: float,       # Current strength (decays over time) │
        metadata: JSON,              # Tile-specific data                 │
        consumer_count: int,         # How many tiles used this           │
    }                                                                    │
    └──────────────────────────────────────────────────────────────────────┘

    COORDINATION PATTERNS:
    ┌──────────────────────────────────────────────────────────────────────┐
    │ 1. TRAIL FOLLOWING:  Tiles follow high-confidence paths             │
    │ 2. SCENT AVOIDANCE:  Tiles avoid stale/low-confidence cells         │
    │ 3. COLONY OPTIMIZATION: Tiles converge on best solutions            │
    │ 4. QUORUM SENSING:   Tiles wait until threshold tiles agree         │
    └──────────────────────────────────────────────────────────────────────┘
```

**Caption**: Stigmergy is how ants coordinate through pheromone trails. SMP tiles do the same with data. When a tile writes output, it deposits "scent" (confidence, timestamp, metadata). Other tiles sense this scent and adjust behavior - following strong trails, avoiding weak ones, converging on best solutions. No direct communication needed - the spreadsheet cells become the coordination medium.

---

## 4. Counterfactual Tree

A single root tile branching into multiple parallel scenarios.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COUNTERFACTUAL TILE TREE                               │
└─────────────────────────────────────────────────────────────────────────────┘

    ROOT TILE: "Investment Decision Engine"
    ────────────────────────────────────────────
    Input: $10M portfolio, risk tolerance: Medium
    Question: "What if we adjust allocation strategy?"

                              ROOT TILE
                         confidence: 0.94
                                 │
                                 │  SPLIT into 5 scenarios
                                 │
        ┌────────────────────────┼────────────────────────┐
        │           │            │            │           │
        ▼           ▼            ▼            ▼           ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │ TILE A │ │ TILE B │ │ TILE C │ │ TILE D │ │ TILE E │
    │Baseline│ │Aggressive│ │Conservative│ │Balanced│ │Custom│
    │Strategy│ │Growth  │ │ Income  │ │ 50/50  │ │ Mix   │
    └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
        │           │            │            │           │
        ▼           ▼            ▼            ▼           ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Return: │ │Return: │ │Return: │ │Return: │ │Return: │
    │  7.2%  │ │ 12.8%  │ │  4.5%  │ │  8.1%  │ │  9.3%  │
    │Risk:   │ │Risk:   │ │Risk:   │ │Risk:   │ │Risk:   │
    │  Med   │ │  High  │ │  Low   │ │  Med   │ │  Med   │
    │Conf:   │ │Conf:   │ │Conf:   │ │Conf:   │ │Conf:   │
    │  0.91  │ │  0.73  │ │  0.96  │ │  0.88  │ │  0.82  │
    └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
        │           │            │            │           │
        │           │            │            │           │
        └───────────┴────────────┴────────────┴───────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ MERGE TILE    │
                    │ Compare & Rank│
                    └───────┬───────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  TOP 3      │ │  METRICS    │ │ RECOMMEND   │
    │  Scenarios  │ │  Comparison │ │    Action   │
    │             │ │             │ │             │
    │ 1. Tile C   │ │ Risk/Return │ │ Select Tile  │
    │    (0.96)   │ │   Scatter   │ │ C with 20%  │
    │ 2. Tile A   │ │ Distribution│ │ allocation  │
    │    (0.91)   │ │ Stress Test │ │             │
    │ 3. Tile D   │ │ Monte Carlo │ │ Confidence: │
    │    (0.88)   │ │             │ │    0.94     │
    └─────────────┘ └─────────────┘ └─────────────┘

    EXECUTION FLOW:
    ┌──────────────────────────────────────────────────────────────────────┐
    │ T=0ms:   Root tile receives request                                   │
    │ T=50ms:  Root tiles spawns 5 parallel scenario tiles                  │
    │ T=200ms: All 5 tiles complete analysis (parallel execution)          │
    │ T=250ms: Merge tile collects and ranks results                       │
    │ T=300ms: Recommendation tile outputs final decision                  │
    │                                                                       │
    │ TOTAL TIME: 300ms (vs. 1000ms sequential)                            │
    │ SPEEDUP: 3.3x from parallel counterfactual execution                 │
    └──────────────────────────────────────────────────────────────────────┘

    BRANCHING PATTERNS:
    ┌──────────────────────────────────────────────────────────────────────┐
    │ PARAMETER SWEEP:   Vary one parameter across N values               │
    │ STRATEGY SPACE:    Explore N different strategies                    │
    │ TIME HORIZONS:     Short, medium, long-term projections             │
    │ SENSITIVITY:       Low, medium, high sensitivity scenarios          │
    │ EXTERNAL EVENTS:   Bull, bear, black swan scenarios                 │
    └──────────────────────────────────────────────────────────────────────┘
```

**Caption**: Counterfactual trees let SMPbots explore multiple scenarios in parallel. A root tile spawns N child tiles, each exploring different assumptions, strategies, or parameters. Results merge into a comprehensive view with ranked recommendations. Parallel execution provides 3-10x speedup vs. sequential analysis. Users see all scenarios with confidence scores, making decisions transparent.

---

## 5. Tile Memory Hierarchy

Four-tier memory system from registers to long-term storage.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TILE MEMORY HIERARCHY                               │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │                        MEMORY SPEED PYRAMID                          │
    │                                                                     │
    │                              ▲                                       │
    │                             ╱ ╲                                      │
    │                            ╱   ╲     L1: REGISTER CACHE             │
    │                           ╱─────╲    ~1ns access                    │
    │                          ╱  L1   ╲   ~10 items                      │
    │                         ╱─────────╲  Tile-local context             │
    │                        ╱           ╲                                 │
    │                       ╱─────────────╲                                │
    │                      ╱     L2       ╲     L2: WORKING MEMORY        │
    │                     ╱   WORKING     ╲    ~10ms access                │
    │                    ╱    MEMORY      ╲   ~1000 items                  │
    │                   ╱─────────────────╲  Session context               │
    │                  ╱                   ╲                               │
    │                 ╱─────────────────────╲                              │
    │                ╱        L3             ╲    L3: SESSION STORE        │
    │               ╱      SESSION            ╲   ~100ms access            │
    │              ╱       MEMORY              ╲  ~100k items               │
    │             ╱─────────────────────────────╲ User session              │
    │            ╱                               ╲                           │
    │           ╱─────────────────────────────────╲                         │
    │          ╱              L4                  ╲  L4: LONG-TERM          │
    │         ╱          LONG-TERM                ╲     MEMORY             │
    │        ╱            MEMORY                   ╲ ~1s access             │
    │       ╱                                      ╲ Unlimited items        │
    │      ╱────────────────────────────────────────╲ Persistent storage    │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    DETAILED HIERARCHY:
    ──────────────────────────────────────────────────────────────────────

    L1: REGISTER CACHE (Tile-Local, Ultra-Fast)
    ┌──────────────────────────────────────────────────────────────────────┐
    struct RegisterCache {                                                 │
        active_prompt: str,           # Current executing prompt            │
        input_window: List[Token],    # Last 100 input tokens              │
        confidence_score: float,      # Current confidence                  │
        execution_state: State,       # Running/Paused/Complete            │
        tile_id: UUID,               # This tile's identifier             │
        parent_id: UUID,             # Parent tile (if any)               │
        child_ids: List[UUID],       # Spawned children                   │
    }                                                                    │
    │                                                                      │
    │ SIZE: ~1KB per tile    LIFETIME: Tile execution duration            │
    │ ACCESS: Direct reference   EVICTION: Tile completion                │
    └──────────────────────────────────────────────────────────────────────┘

    L2: WORKING MEMORY (Session Context, Fast)
    ┌──────────────────────────────────────────────────────────────────────┐
    struct WorkingMemory {                                                 │
        conversation_history: List[Message],  # Chat context              │
        recent_outputs: Map[UUID, Result],     # Last 100 tile results    │
        variable_bindings: Map[str, Value],    # Named variables          │
        pheromone_trail: List[Pheromone],      # Recent scents            │
        constraint_state: ConstraintSet,       # Active constraints       │
        execution_stack: List[Frame],          # Call stack               │
    }                                                                    │
    │                                                                      │
    │ SIZE: ~100KB per session   LIFETIME: User session (~1 hour)         │
    │ ACCESS: Hash lookup         EVICTION: LRU, session end              │
    └──────────────────────────────────────────────────────────────────────┘

    L3: SESSION STORE (User Context, Medium)
    ┌──────────────────────────────────────────────────────────────────────┐
    struct SessionStore {                                                  │
        user_profile: UserProfile,           # Preferences, history       │
        tile_library: Map[UUID, TileSpec],   # User's tile collection    │
        cached_patterns: Map[Pattern, Result], # Learned patterns         │
        performance_metrics: Metrics,         # Tile performance stats    │
        collaboration_state: State,           # Shared editing state     │
        error_history: List[Error],           # Past errors for learning  │
    }                                                                    │
    │                                                                      │
    │ SIZE: ~10MB per user      LIFETIME: User account                    │
    │ ACCESS: Indexed query       EVICTION: Manual delete, retention      │
    └──────────────────────────────────────────────────────────────────────┘

    L4: LONG-TERM MEMORY (Persistent, Slow)
    ┌──────────────────────────────────────────────────────────────────────┐
    struct LongTermMemory {                                                │
        learned_models: Map[UUID, Model],      # Trained tile models      │
        knowledge_graph: Graph,                # Concept relationships    │
        historical_performance: TimeSeries,    # Performance over time    │
        best_practices: List[Pattern],         # Proven tile patterns     │
        global_statistics: Stats,              # Aggregate metrics        │
        backup_snapshots: List[Snapshot],      # Point-in-time backups    │
    }                                                                    │
    │                                                                      │
    │ SIZE: Unlimited          LIFETIME: Permanent                         │
    │ ACCESS: Database query     EVICTION: Archive policy                  │
    └──────────────────────────────────────────────────────────────────────┘

    MEMORY FLOW EXAMPLE:
    ──────────────────────────────────────────────────────────────────────

    User: "Analyze last month's sales"
      │
      ▼
    L1: Load tile config, parse prompt
      │
      ▼
    L2: Check conversation history, get recent sales data
      │ (cache miss)
      ▼
    L3: Load user's preferred analysis patterns
      │ (cache miss)
      ▼
    L4: Query historical sales database
      │
      ▼
    L4 → L3 → L2 → L1: Data cascades back through hierarchy
      │
      ▼
    Execute analysis with all context available
```

**Caption**: SMP tiles use a four-tier memory hierarchy balancing speed and capacity. L1 registers hold tile-local state (~1ns access). L2 working memory maintains session context (~10ms). L3 session store persists user patterns (~100ms). L4 long-term storage archives learned models and knowledge (~1s). Data cascades up and down based on access patterns - hot data stays fast in L1/L2, cold data lives in L4. This gives tiles the context awareness of a human expert while maintaining computational efficiency.

---

## 6. Composition Types

Visual representation of how tiles combine.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TILE COMPOSITION TYPES                              │
└─────────────────────────────────────────────────────────────────────────────┘

    1. SEQUENTIAL COMPOSITION (Pipeline)
    ──────────────────────────────────────────

    Input Data
       │
       ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │ TILE A  │────▶│ TILE B  │────▶│ TILE C  │────▶│ TILE D  │
    │ Extract │     │ Clean  │     │ Analyze│     │ Report │
    │ Fields  │     │ Data   │     │ Trends │     │ Results│
    └─────────┘     └─────────┘     └─────────┘     └─────────┘
       │               │               │               │
       ▼               ▼               ▼               ▼
    Raw Data       Clean Data     Analysis      Final Report
                   (0.95)         (0.87)          (0.92)

    USE CASE: Data processing pipeline
    CONFIDENCE: Multiplies through pipeline: 0.95 × 0.87 × 0.92 = 0.76
    FAILURE MODE: Any tile < 0.3 stops pipeline
    SPEED: Sequential, sum of all tile times

    ──────────────────────────────────────────────────────────────────────

    2. PARALLEL COMPOSITION (Map)
    ──────────────────────────────────────────

                    Input Data
                        │
                        ▼
              ┌─────────────────┐
              │  Data Splitter  │
              └────┬──────┬─────┘
                   │      │
        ┌──────────┘      └──────────┐
        │                            │
        ▼                            ▼
    ┌─────────┐                  ┌─────────┐
    │ TILE A  │                  │ TILE B  │
    │ Process │                  │ Process │
    │ Region 1│                  │ Region 2│
    └────┬────┘                  └────┬────┘
         │                            │
         └──────────┐      ┌──────────┘
                    │      │
                    ▼      ▼
              ┌─────────────────┐
              │  Result Merger  │
              └────────┬────────┘
                       │
                       ▼
                  Combined Result

    USE CASE: Parallel data processing, regions
    CONFIDENCE: Average of all branches
    FAILURE MODE: Individual failures don't stop others
    SPEED: Parallel, max of all tile times

    ──────────────────────────────────────────────────────────────────────

    3. CONDITIONAL COMPOSITION (Branch)
    ──────────────────────────────────────────

    Input Data
       │
       ▼
    ┌─────────────────┐
    │   Condition     │
    │   Evaluator     │
    └────────┬────────┘
             │
      Confidence Score
             │
        ┌────┴────┐
        │         │
    Score < 0.5   Score ≥ 0.5
        │         │
        ▼         ▼
    ┌─────────┐ ┌─────────┐
    │ TILE A  │ │ TILE B  │
    │ Refine  │ │ Process │
    │ Output  │ │ Direct  │
    └────┬────┘ └────┬────┘
         │          │
         └────┬─────┘
              │
              ▼
         Result

    USE CASE: Confidence-based routing
    CONFIDENCE: Determines path
    FAILURE MODE: Low confidence triggers refinement
    SPEED: One branch executed

    ──────────────────────────────────────────────────────────────────────

    4. REDUCE COMPOSITION (Aggregate)
    ──────────────────────────────────────────

    Input Data Stream
       │
       ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ TILE A  │   │ TILE B  │   │ TILE C  │   │ TILE D  │
    │ Analyze │   │ Analyze │   │ Analyze │   │ Analyze │
    │ Item 1  │   │ Item 2  │   │ Item 3  │   │ Item N  │
    └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘
         │             │             │             │
         └─────────────┴─────────────┴─────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  REDUCE TILE  │
                    │  Aggregate    │
                    │  Results      │
                    └───────┬───────┘
                            │
                            ▼
                      Summary Statistics

    USE CASE: Batch processing, map-reduce
    CONFIDENCE: Weighted average, min, or custom function
    FAILURE MODE: Failed items excluded from aggregation
    SPEED: Parallel analysis, single reduce

    ──────────────────────────────────────────────────────────────────────

    5. FEEDBACK COMPOSITION (Loop)
    ┌──────────────────────────────────────────────────────────────────────┐
    │                                                                      │
    │     Input              ┌─────────┐                                  │
    │       │                │         │                                  │
    │       ▼                │         │         Iterations               │
    │  ┌─────────┐      Output│   ┌───┴──────┐                            │
    │  │ TILE A  │───────────┼──▶│ Feedback │───┐                        │
    │  │ Process │           │   │  Filter  │   │                        │
    │  └────┬────┘           │   └──────────┘   │                        │
    │       │                │         │         │                        │
    │       │                │         ▼         ▼                        │
    │       │                │    Confidence < 0.8?                       │
    │       │                │         │         │                        │
    │       │                │    Yes   │    No                          │
    │       │                │      ┌──┴───┐    │                        │
    │       │                │      │      │    ▼                        │
    │       │                └──────┤      ├──▶Output                    │
    │       │                       │      │                              │
    │       │                       └──┬───┘                              │
    │       │                          │                                   │
    │       └──────────────────────────┘                                   │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘

    USE CASE: Iterative refinement, optimization
    CONFIDENCE: Loop continues until threshold met
    FAILURE MODE: Max iterations prevents infinite loops
    SPEED: Variable, depends on convergence

    ──────────────────────────────────────────────────────────────────────

    6. HIERARCHICAL COMPOSITION (Tree)
    ┌──────────────────────────────────────────────────────────────────────┐
    │                                                                      │
    │                          ROOT TILE                                   │
    │                        "Orchestrate"                                 │
    │                              │                                       │
    │         ┌─────────┬──────────┼──────────┬─────────┐                  │
    │         │         │          │          │         │                  │
    │         ▼         ▼          ▼          ▼         ▼                  │
    │    ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐               │
    │    │ TILE A ││ TILE B ││ TILE C ││ TILE D ││ TILE E │               │
    │    │Sub-Tree││Sub-Tree││Leaf    ││Leaf    ││Sub-Tree│               │
    │    └───┬────┘└───┬────┘└────────┘└────────┘└───┬────┘               │
    │        │         │                             │                    │
    │        ▼         ▼                             ▼                    │
    │    ┌───────┐ ┌───────┐                   ┌──────────┐               │
    │    │Tile A1│ │Tile B1│                   │Tile E1   │               │
    │    │Tile A2│ │Tile B2│                   │Tile E2   │               │
    │    └───────┘ └───────┘                   └──────────┘               │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘

    USE CASE: Complex multi-stage workflows
    CONFIDENCE: Propagates up tree from leaves
    FAILURE MODE: Sub-tree failures contained locally
    SPEED: Parallel sub-trees, sequential within
```

**Caption**: SMP tiles compose in six fundamental patterns. Sequential for pipelines, parallel for maps, conditional for branching, reduce for aggregation, feedback for loops, and hierarchical for complex workflows. Each pattern has defined confidence propagation, failure modes, and performance characteristics. These patterns combine to create arbitrarily complex tile ecosystems while maintaining predictable behavior.

---

## 7. Distributed Tile Network

Tiles running across multiple devices and locations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DISTRIBUTED TILE NETWORK                               │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │                        NETWORK TOPOLOGY                              │
    │                                                                     │
    │    LAPTOP                    CLOUD                    EDGE          │
    │  (Your Device)           (AWS/GCP/Azure)          (IoT/Phone)       │
    │                                                                     │
    │  ┌───────────┐        ┌─────────────────┐    ┌──────────────────┐   │
    │  │ Tile A    │◄──────▶│  Load Balancer │◄───▶│ Tile F           │   │
    │  │ Local     │  TLS   │  Global Router │ TLS │ Edge Processing  │   │
    │  │ Data     │        └────────┬────────┘    │ Sensor Fusion     │   │
    │  └───────────┘                 │             └──────────────────┘   │
    │       │                        │                    │               │
    │       │                        │                    │               │
    │  ┌───────────┐          ┌─────┴─────────┐    ┌──────────────────┐   │
    │  │ Tile B    │          │               │    │ Tile G           │   │
    │  │ UI/Chat   │          │  COMPUTE CLUSTER│   │ Mobile UI        │   │
    │  └───────────┘          │               │    │ Notifications    │   │
    │       │                 │               │    └──────────────────┘   │
    │       │                 │               │             │               │
    │       │                 │               │             │               │
    │  ┌───────────┐     ┌─────┴─────┐   ┌─────┴─────┐ ┌─────┴─────┐       │
    │  │ Tile C    │     │           │   │           │ │           │       │
    │  │ Cache     │     │ Tile D    │   │ Tile E    │ │ Tile H    │       │
    │  │ Manager   │     │ Heavy     │   │ Model     │ │ Local     │       │
    │  └───────────┘     │ Compute   │   │ Training  │ │ Storage   │       │
    │                    │ (GPU)     │   │ (GPU)     │ │           │       │
    │                    └───────────┘   └───────────┘ └───────────┘       │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    COMMUNICATION PROTOCOLS:
    ┌──────────────────────────────────────────────────────────────────────┐
    │                                                                      │
    │  TILE A (Laptop)  ───────▶  TILE D (Cloud GPU)                       │
    │       │                        │                                     │
    │       │ 1. Serialize request  │                                     │
    │       │ 2. Sign with tile key │                                     │
    │       │ 3. Send over HTTPS    │                                     │
    │       │       │                │                                     │
    │       │       ▼                │                                     │
    │       │  TILE D receives       │                                     │
    │       │  validates signature   │                                     │
    │       │  processes on GPU      │                                     │
    │       │       │                │                                     │
    │       │       ▼                │                                     │
    │       │  TILE D responds       │                                     │
    │       │  + confidence          │                                     │
    │       │  + execution time      │                                     │
    │       │  + cost incurred       │                                     │
    │       │       │                │                                     │
    │       ◄────────────────────────┘                                     │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘

    REQUEST ROUTING ALGORITHM:
    ┌──────────────────────────────────────────────────────────────────────┐
    struct TileRequest {                                                   │
        tile_id: UUID,                    # Target tile                   │
        input_data: Data,                 # Input payload                 │
        requirements: Requirements,        # Latency, cost, privacy        │
    }                                                                     │
                                                                              │
    fn route_request(request: TileRequest) -> Location {                     │
        if request.requirements.privacy == Strict:                           │
            return Location::LocalDevice  # Keep sensitive data local      │
                                                                              │
        if request.requirements.latency < 50ms:                              │
            if tile_available(Location::EdgeDevice):                        │
                return Location::EdgeDevice  # Fastest response            │
            return Location::LocalDevice                                      │
                                                                              │
        if request.requirements.compute == Heavy:                            │
            return Location::CloudGPU  # Heavy compute to cloud             │
                                                                              │
        # Default: balance cost and performance                              │
        return load_balance(Location::Cloud, Location::Edge)                 │
    }                                                                       │
    └──────────────────────────────────────────────────────────────────────┘

    DISTRIBUTED EXECUTION EXAMPLE:
    ┌──────────────────────────────────────────────────────────────────────┐
    │                                                                      │
    │  USER: "Analyze this medical image for anomalies"                    │
    │        [Selects 50MB MRI scan]                                       │
    │                                                                      │
    │  TILE A (Laptop): "Privacy required, keep data local"               │
    │    └─▶ Spawns TILE B (Local) for preprocessing                       │
    │        "Reduce image to features"                                     │
    │                                                                      │
    │  TILE B (Laptop): "Features extracted (50MB → 5KB)"                  │
    │    └─▶ Sends features to TILE D (Cloud GPU)                          │
    │        "Analyze with AI model"                                       │
    │                                                                      │
    │  TILE D (Cloud GPU): "Running deep learning model..."                │
    │    Confidence: 0.94, Time: 2.3s                                      │
    │    └─▶ Returns results to TILE A                                     │
    │                                                                      │
    │  TILE A (Laptop): "Displaying results to user"                       │
    │        + Confidence overlay                                           │
    │        + Human review option                                         │
    │                                                                      │
    │  DATA FLOW: Laptop → Cloud → Laptop                                  │
    │  PRIVACY: Sensitive medical data never leaves laptop                 │
    │  SPEED: 2.5s total (vs 45s local only)                               │
    │  COST: $0.003 for cloud inference                                    │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘

    FAULT TOLERANCE:
    ┌──────────────────────────────────────────────────────────────────────┐
    │                                                                      │
    │  TILE D (Cloud) goes offline:                                        │
    │    1. Load balancer detects failure                                   │
    │    2. Request rerouted to TILE E (backup GPU)                        │
    │    3. TILE A notified of new location                                 │
    │    4. Execution continues seamlessly                                  │
    │                                                                      │
    │  Network partition (laptop loses connection):                         │
    │    1. TILE A switches to local-only mode                              │
    │    2. Queued requests paused                                         │
    │    3. User notified: "Offline mode, reduced functionality"           │
    │    4. On reconnect: sync state, resume processing                    │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘
```

**Caption**: SMP tiles run across your laptop, cloud GPUs, and edge devices. A global load balancer routes tiles based on privacy, latency, and compute requirements. Sensitive data stays local by default. Heavy computation goes to cloud GPUs. Low-latency needs go to edge devices. The system is fault-tolerant - if a tile fails, requests route to backups. If you go offline, tiles switch to local mode. This gives you the power of a cloud data center with the privacy of a local device.

---

## 8. Federated Learning Flow

Multiple institutions sharing learned tiles, not raw data.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FEDERATED TILE LEARNING                               │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │                        PARTICIPATING INSTITUTIONS                   │
    │                                                                     │
    │   HOSPITAL A              HOSPITAL B              HOSPITAL C        │
    │   (Boston, MA)           (Seattle, WA)          (Austin, TX)       │
    │                                                                     │
    │  ┌───────────┐          ┌───────────┐          ┌───────────┐       │
    │  │ 50,000    │          │ 75,000    │          │ 40,000    │       │
    │  │ Patient   │          │ Patient   │          │ Patient   │       │
    │  │ Records  │          │ Records  │          │ Records  │       │
    │  └───────────┘          └───────────┘          └───────────┘       │
    │       │                      │                      │               │
    │       │ PRIVATE              │ PRIVATE              │ PRIVATE       │
    │       │ DATA                 │ DATA                 │ DATA          │
    │       │                      │                      │               │
    │       ▼                      ▼                      ▼               │
    │  ┌───────────┐          ┌───────────┐          ┌───────────┐       │
    │  │ TILE A    │          │ TILE B    │          │ TILE C    │       │
    │  │ "Diagnose │          │ "Diagnose │          │ "Diagnose │       │
    │  │  Pneumonia│          │  Pneumonia│          │  Pneumonia│       │
    │  │  from X-Ray│          │  from X-Ray│          │  from X-Ray│       │
    │  └─────┬─────┘          └─────┬─────┘          └─────┬─────┘       │
    │        │                      │                      │               │
    │        │ LOCAL                │ LOCAL                │ LOCAL        │
    │        │ TRAINING             │ TRAINING             │ TRAINING      │
    │        │                      │                      │               │
    │        ▼                      ▼                      ▼               │
    │  ┌───────────┐          ┌───────────┐          ┌───────────┐       │
    │  │ Learned  │          │ Learned  │          │ Learned  │       │
    │  │ Tile     │          │ Tile     │          │ Tile     │       │
    │  │ Weights  │          │ Weights  │          │ Weights  │       │
    │  │ v1.0     │          │ v1.0     │          │ v1.0     │       │
    │  └───────────┘          └───────────┘          └───────────┘       │
    │        │                      │                      │               │
    │        │ SHARE                │ SHARE                │ SHARE        │
    │        │ TILES                │ TILES                │ TILES        │
    │        │ ONLY                 │ ONLY                 │ ONLY         │
    │       └──────────────────────┴──────────────────────┘               │
    │                              │                                        │
    │                              ▼                                        │
    │                    ┌─────────────────┐                               │
    │                    │  AGGREGATION    │                               │
    │                    │  SERVER         │                               │
    │                    │  (Federated)    │                               │
    │                    └────────┬────────┘                               │
    │                             │                                        │
    │                             │ Federated Averaging                   │
    │                             ▼                                        │
    │                    ┌─────────────────┐                               │
    │                    │  GLOBAL TILE    │                               │
    │                    │  v1.1           │                               │
    │                    │  (Combined      │                               │
    │                    │   Knowledge)    │                               │
    │                    └────────┬────────┘                               │
    │                             │                                        │
    │              ┌──────────────┼──────────────┐                        │
    │              │              │              │                        │
    │              ▼              ▼              ▼                        │
    │        ┌───────────┐  ┌───────────┐  ┌───────────┐                  │
    │        │ Receive   │  │ Receive   │  │ Receive   │                  │
    │        │ Global    │  │ Global    │  │ Global    │                  │
    │        │ Tile v1.1 │  │ Tile v1.1 │  │ Tile v1.1 │                  │
    │        └───────────┘  └───────────┘  └───────────┘                  │
    │                                                                      │
    └─────────────────────────────────────────────────────────────────────┘

    FEDERATED LEARNING CYCLE:
    ┌──────────────────────────────────────────────────────────────────────┐
    │                                                                      │
    │  ROUND 1:                                                           │
    │    Hospital A trains on 50,000 patients → Tile Weights A (2.3MB)     │
    │    Hospital B trains on 75,000 patients → Tile Weights B (2.3MB)     │
    │    Hospital C trains on 40,000 patients → Tile Weights C (2.3MB)     │
    │                                                                      │
    │  ROUND 2:                                                           │
    │    All hospitals send weights (not data) to aggregation server       │
    │    Server computes: W_global = (W_A + W_B + W_C) / 3                 │
    │                                                                      │
    │  ROUND 3:                                                           │
    │    Server sends global weights v1.1 to all hospitals                 │
    │    Each hospital continues local training from v1.1                 │
    │                                                                      │
    │  ROUND 4:                                                           │
    │    Hospitals send updated weights back                               │
    │    Server aggregates, produces v1.2                                  │
    │    Cycle repeats...                                                  │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘

    PRIVACY GUARANTEE:
    ┌──────────────────────────────────────────────────────────────────────┐
    │                                                                      │
    │  What's shared:                                                      │
    │    ✓ Tile weights (learned parameters)                               │
    │    ✓ Model architecture                                              │
    │    ✓ Training statistics (loss, accuracy)                            │
    │                                                                      │
    │  What's NOT shared:                                                  │
    │    ✗ Raw patient data                                                │
    │    ✗ Individual X-ray images                                         │
    │    ✗ Patient demographics                                             │
    │    ✗ Hospital-specific patterns                                      │
    │                                                                      │
    │  Result:                                                             │
    │    All hospitals benefit from collective knowledge                  │
    │    No patient data ever leaves local hospital                       │
    │    HIPAA compliant by design                                        │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘

    PERFORMANCE IMPROVEMENT:
    ┌──────────────────────────────────────────────────────────────────────┐
    │                                                                      │
    │  Hospital A (alone):       87% accuracy, 15 false negatives/1000     │
    │  Hospital B (alone):       91% accuracy, 11 false negatives/1000     │
    │  Hospital C (alone):       84% accuracy, 18 false negatives/1000     │
    │                                                                      │
    │  After federated learning:                                          │
    │    All hospitals:          96% accuracy, 3 false negatives/1000      │
    │                                                                      │
    │  Improvement: +9% accuracy, -73% false negatives                    │
    │                                                                      │
    │  Knowledge transfer:                                                 │
    │    Hospital A learned rare patterns from B and C                     │
    │    Hospital B learned demographic variations from A and C             │
    │    Hospital C learned advanced techniques from A and B                │
    │                                                                      │
    └──────────────────────────────────────────────────────────────────────┘

    TILE EXCHANGE PROTOCOL:
    ┌──────────────────────────────────────────────────────────────────────┐
    struct FederatedTile {                                                 │
        tile_id: UUID,                   # Tile identifier                 │
        version: int,                    # Model version                   │
        weights: Tensor,                 # Learned parameters              │
        metadata: {                                                     │
            training_samples: int,        # Data size used                │
            epochs: int,                  # Training iterations            │
            accuracy: float,              # Performance metrics            │
            loss: float,                  # Training loss                 │
        },                                                              │
        institution_signature: Signature,  # Verify origin                │
        differential_privacy: Noise,      # Privacy protection            │
    }                                                                    │
    └──────────────────────────────────────────────────────────────────────┘
```

**Caption**: Federated learning lets hospitals share learned tiles without sharing patient data. Each hospital trains a diagnostic tile on their private X-ray database. Only the learned weights (a few megabytes) travel to a central server, not the raw data (terabytes). The server averages the weights into a global tile, then sends it back. All hospitals benefit from each other's knowledge while keeping patient data private. After federation, accuracy jumps from 87-91% to 96%, and false negatives drop 73%. This is how SMP enables medical AI breakthroughs while maintaining HIPAA compliance.

---

## Summary

These diagrams illustrate the core SMP concepts:

1. **Confidence Flow**: How confidence scores cascade through tile execution
2. **Three-Zone Model**: Clear boundaries for automatic, refine, or manual intervention
3. **Stigmergic Coordination**: Tiles communicating through spreadsheet cells
4. **Counterfactual Trees**: Parallel scenario exploration
5. **Memory Hierarchy**: Four-tier system balancing speed and capacity
6. **Composition Types**: Six patterns for combining tiles
7. **Distributed Network**: Tiles across laptop, cloud, and edge devices
8. **Federated Learning**: Sharing learned tiles without sharing raw data

Each diagram is optimized for markdown rendering and includes detailed captions explaining the concepts.

---

**Document**: `docs/research/smp-paper/diagrams/ASCII_DIAGRAMS.md`
**Created**: 2026-03-09
**For**: SMP White Paper
**Format**: ASCII diagrams for markdown compatibility
