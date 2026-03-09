# WAVE 6 BACKEND ARCHITECTURE DIAGRAMS

**Visual representations of the scalable backend architecture for 10,000+ cells at 60fps**

---

## 1. OVERALL SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SPREADSHEET CLIENTS                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Excel   │  │ Sheets  │  │ Airtable│  │ Excel   │  │ Sheets  │        │
│  │Client 1 │  │Client 2 │  │Client 3 │  │Client 4 │  │Client 5 │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │            │              │
│       └────────────┴────────────┴────────────┴────────────┘              │
│                                │                                        │
│                           WebSocket (WSS)                               │
│                                │                                        │
└────────────────────────────────┼────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                      LOAD BALANCER (NGINX)                              │
│                     WebSocket Passthrough                               │
│                         Sticky Sessions: OFF                             │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
┌───────────────▼──┐  ┌──────────▼────────┐  ┌──▼──────────────┐
│  Application    │  │   Application     │  │  Application    │
│  Server 1       │  │   Server 2        │  │  Server 3       │
│  (Node.js)      │  │   (Node.js)       │  │  (Node.js)      │
│                 │  │                   │  │                 │
│  • 3K conns     │  │   • 3K conns      │  │  • 4K conns     │
│  • WebSocket Mgr│  │   • WebSocket Mgr │  │  • WebSocket Mgr│
│  • Cell Router  │  │   • Cell Router   │  │  • Cell Router  │
│  • State Sync   │  │   • State Sync    │  │  • State Sync   │
└───────┬─────────┘  └─────────┬─────────┘  └────────┬────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────────────┐
│                         MESSAGE QUEUE (Redis)                            │
│                     Pub/Sub for Cell Updates                            │
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│  │ Channel: cells │  │ Channel: sens  │  │ Channel: events│           │
│  └────────────────┘  └────────────────┘  └────────────────┘           │
└───────┬──────────────────────────────────────────────────────┬────────┘
        │                                                      │
        │                                                      │
┌───────▼──────────┐  ┌────────────────────────────────────────▼───────┐
│  FOUR-TIER CACHE │  │            DATABASE CLUSTER                      │
│                  │  │                                                     │
│  ┌────────────┐  │  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ L1: In-    │  │  │  │ Redis       │  │ MongoDB     │  │PostgreSQL│ │
│  │ Memory     │  │  │  │ (L2 Cache)  │  │ (L3 Store)  │  │(L4 Archive)│ │
│  │            │  │  │  │             │  │             │  │          │ │
│  │ • 10K cells│  │  │  │ • 100K cells│  │ • Unlimited │  │•Unlimited│ │
│  │ • <0.1ms   │  │  │  │ • <1ms      │  │ • <10ms     │  │• <100ms  │ │
│  │ • LRU      │  │  │  │ • TTL 5min  │  │ • 30 days   │  │•Permanent│ │
│  └──────┬─────┘  │  │  └──────┬──────┘  └──────┬──────┘  └────┬─────┘ │
│         │         │  │         │                │               │       │
│         └─────────┼──────────┘                │               │       │
│                   │                            │               │       │
└───────────────────┴────────────────────────────┴───────────────┘     │
                                                                        │
┌───────────────────────────────────────────────────────────────────────┤
│                         EXTERNAL SERVICES                               │
│  • LLM APIs (OpenAI, Anthropic)                                        │
│  • Federated Learning Service                                           │
│  • Meadow (Pattern Repository)                                          │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. FOUR-TIER CACHE ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CELL STATE LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────┐                                                         │
│  │  CELL CREATED  │                                                         │
│  └────────┬───────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│  ┌────────────────┐     ACCESS FREQUENCY DETERMINES TIER                   │
│  │     L1         │     ─────────────────────────────────────               │
│  │  IN-MEMORY     │     HOT (accessed every second)                        │
│  │                │     • 10,000 cells capacity                            │
│  │ • 10K cells    │     • <0.1ms latency                                   │
│  │ • <0.1ms       │     • LRU eviction                                     │
│  │ • LRU evict    │     • Example: Active spreadsheet cells                │
│  └───────┬────────┘                                                          │
│          │ (cooling - not accessed in 1 sec)                                │
│          ▼                                                                  │
│  ┌────────────────┐                                                         │
│  │     L2         │     WARM (accessed every minute)                       │
│  │    REDIS       │     ─────────────────────────────────────               │
│  │                │     • 100,000 cells capacity                           │
│  │ • 100K cells   │     • <1ms latency                                     │
│  │ • <1ms         │     • TTL 5 minutes                                    │
│  │ • TTL 5min     │     • Example: Recently edited cells                   │
│  └───────┬────────┘                                                          │
│          │ (cooling - not accessed in 5 min)                                │
│          ▼                                                                  │
│  ┌────────────────┐                                                         │
│  │     L3         │     COLD (accessed rarely)                              │
│  │   MONGODB      │     ─────────────────────────────────────               │
│  │                │     • Unlimited capacity                                │
│  │ • Unlimited    │     • <10ms latency                                    │
│  │ • <10ms        │     • 30 day retention                                 │
│  │ • 30 days      │     • Example: Historical cell data                    │
│  └───────┬────────┘                                                          │
│          │ (aging - older than 30 days)                                     │
│          ▼                                                                  │
│  ┌────────────────┐                                                         │
│  │     L4         │     FROZEN (archive only)                               │
│  │  POSTGRESQL    │     ─────────────────────────────────────               │
│  │                │     • Unlimited capacity                                │
│  │ • Unlimited    │     • <100ms latency                                   │
│  │ • <100ms       │     • Permanent                                        │
│  │ • Permanent    │     • Example: Audit trail, compliance                │
│  └────────────────┘                                                         │
│                                                                               │
│  PROMOTION: L4→L3→L2→L1  (when accessed)                                    │
│  DEMOTION:  L1→L2→L3→L4  (when cooling/aging)                               │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. SENSATION PROPAGATION WITH SPATIAL INDEXING

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPATIAL INDEX GRID (100x100)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   0    10   20   30   40   50   60   70   80   90                         │
│ 0 ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐                     │
│   │    │    │    │    │    │    │    │    │    │    │                     │
│ 1 ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤                     │
│   │    │    │    │    │    │    │    │    │    │    │                     │
│ 2 ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤                     │
│   │    │    │    │    │    │    │    │    │    │    │                     │
│ 3 ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤                     │
│   │    │    │    │    │    │    │    │    │    │    │                     │
│ 4 ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤                     │
│   │    │    │    │    │    │    │    │    │    │    │                     │
│ 5 ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤                     │
│   │    │    │    │    │    │    │    │    │    │    │                     │
│   │    │    │    │●●●●│    │    │    │    │    │    │                     │
│   │    │    │    │●●A●│    │    │    │    │    │    │  ← Cell A at (7,8)    │
│   │    │    │    │●●●●│    │    │    │    │    │    │                     │
│ 6 ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤                     │
│   │    │    │    │    │    │    │    │    │    │    │                     │
│ 7 ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤                     │
│   │    │    │    │    │    │    │    │    │    │    │                     │
│ 8 ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤                     │
│   │    │    │    │    │    │    │    │    │    │    │                     │
│ 9 ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤                     │
│   │    │    │    │    │    │    │    │    │    │    │                     │
│10 ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤                     │
│   │    │    │    │    │    │    │    │    │    │    │                     │
│                                                                               │
│   ● = Cell in grid                                                            │
│   A = Active cell (source of sensation)                                       │
│                                                                               │
│   NEIGHBORHOOD LOOKUP (radius=5):                                            │
│   ┌──────────────────┐                                                       │
│   │                  │                                                       │
│   │    ●  ●  ●  ●    │  ← Only check 11x11 grid = 121 cells                 │
│   │    ●  ●  ●  ●    │     instead of all 10,000 cells                      │
│   │    ●  ●  ●  ●    │                                                       │
│   │    ●  ●[A]●  ●    │  ← O(121) instead of O(10,000)                     │
│   │    ●  ●  ●  ●    │     99% faster!                                     │
│   │    ●  ●  ●  ●    │                                                       │
│   │    ●  ●  ●  ●    │                                                       │
│   │                  │                                                       │
│   └──────────────────┘                                                       │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. CASCADE CONTROL WITH TTL AND DAMPING

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SENSATION CASCADE PROPAGATION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  SOURCE CELL (Cell A) creates sensation                                     │
│  ─────────────────────────────────────                                       │
│  • Type: VALUE_CHANGE                                                        │
│  • Value: 100.0                                                              │
│  • TTL: 5                                                                   │
│  • Damping: 0.8                                                              │
│                                                                               │
│  HOP 0: Source Cell                                                          │
│  ─────────────────────                                                       │
│  Cell A: 100.0 strength (TTL=5)                                              │
│    │                                                                          │
│    ├─► Cell B: 80.0 strength (TTL=4)  ← 20% damping                         │
│    │   │                                                                      │
│    │   └─► Cell E: 64.0 strength (TTL=3)                                    │
│    │                                                                          │
│    ├─► Cell C: 80.0 strength (TTL=4)                                        │
│    │   │                                                                      │
│    │   └─► Cell F: 64.0 strength (TTL=3)                                    │
│    │                                                                          │
│    └─► Cell D: 80.0 strength (TTL=4)                                        │
│        │                                                                      │
│        └─► Cell G: 64.0 strength (TTL=3)                                     │
│                                                                               │
│  HOP 2: 9 cells receive                                                      │
│  ─────────────────────                                                       │
│  Each of the 3 cells from hop 1 spreads to 3 more                           │
│  Total: 9 cells at 51.2 strength (TTL=2)                                    │
│                                                                               │
│  HOP 3: 27 cells receive                                                     │
│  ─────────────────────                                                       │
│  Each of the 9 cells spreads to 3 more                                      │
│  Total: 27 cells at 41.0 strength (TTL=1)                                   │
│                                                                               │
│  HOP 4: 81 cells receive                                                     │
│  ─────────────────────                                                       │
│  Each of the 27 cells spreads to 3 more                                     │
│  Total: 81 cells at 32.8 strength (TTL=0)                                   │
│                                                                               │
│  HOP 5: CASCADE STOPS                                                        │
│  ─────────────────────                                                       │
│  TTL reaches 0, no further propagation                                       │
│                                                                               │
│  TOTAL CELLS REACHED: 1 + 3 + 9 + 27 + 81 = 121 cells                       │
│  MAX STRENGTH: 100.0 (source)                                               │
│  MIN STRENGTH: 32.8 (edge)                                                   │
│  CASCAD DEPTH: 5 hops                                                        │
│                                                                               │
│  WITHOUT CONTROL:                                                           │
│  ──────────────────                                                           │
│  • No TTL: Could reach all 10,000 cells                                     │
│  • No damping: All cells at 100.0 strength                                  │
│  • Result: System overload, runaway cascade                                 │
│                                                                               │
│  WITH CONTROL:                                                              │
│  ────────────────                                                            │
│  • TTL=5: Limits to 121 cells                                               │
│  • Damping=0.8: Signal decays to 33%                                        │
│  • Result: Controlled, local influence                                      │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. ADAPTIVE LOCKING STATE MACHINE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ADAPTIVE LOCKING STATE MACHINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐                                                            │
│  │  START       │                                                            │
│  │  OPTIMISTIC  │  ← Default mode (fast)                                    │
│  └──────┬───────┘                                                            │
│         │                                                                     │
│         │ Process update                                                      │
│         ▼                                                                     │
│  ┌─────────────────────────┐                                                │
│  │  Track Conflicts        │                                                │
│  │  ─────────────────────  │                                                │
│  │  conflict_rate =        │                                                │
│  │    conflicts / window   │                                                │
│  │  window = 100 ops       │                                                │
│  └──────┬──────────────────┘                                                │
│         │                                                                     │
│         │                                                                     │
│         ├─────────────────────────────┐                                      │
│         │                             │                                      │
│         ▼                             ▼                                      │
│  conflict_rate < 5%           conflict_rate >= 5%                          │
│         │                             │                                      │
│         ▼                             ▼                                      │
│  ┌──────────────┐              ┌──────────────┐                              │
│  │ OPTIMISTIC   │              │ PESSIMISTIC  │                              │
│  │ MODE         │              │ MODE         │                              │
│  │              │              │              │                              │
│  │ • No locks   │              │ • Acquire    │                              │
│  │ • Fast       │              │   lock       │                              │
│  │ • 416K ops/s │              │ • Slow       │                              │
│  │ • 1.9ms avg  │              │ • 13K ops/s  │                              │
│  └──────┬───────┘              │ • 7.4ms avg  │                              │
│         │                       └──────┬───────┘                              │
│         │                              │                                      │
│         │                              │                                      │
│         │         Monitor rate           │                                      │
│         │         < 1% for 100 ops       │                                      │
│         │                              │                                      │
│         └──────────────────────────────┘                                      │
│                                        │                                      │
│                                        ▼                                      │
│                                Switch back to                                │
│                                optimistic                                    │
│                                                                               │
│  CONFLICT RESOLUTION:                                                       │
│  ─────────────────────                                                       │
│  • Last-Write-Wins (timestamp) - Default                                     │
│  • Highest-Version-Wins - Sequences                                          │
│  • Merge-Values (average) - Numeric data                                      │
│  • User-Choice - Manual resolution                                            │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. WEBSOCKET MESSAGE FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WEBSOCKET MESSAGE FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  CLIENT (Excel/Sheets)                                                      │
│  ────────────────────                                                       │
│  1. User edits cell A1                                                       │
│  2. WebSocket sends:                                                         │
│     {                                                                        │
│       "type": "cell_update",                                                 │
│       "cell_id": "A1",                                                       │
│       "value": 42,                                                           │
│       "timestamp": 1234567890                                                │
│     }                                                                        │
│                                                                               │
│           ↓ WebSocket (WSS)                                                  │
│                                                                               │
│  LOAD BALANCER                                                               │
│  ────────────────                                                            │
│  • Routes to available server                                                │
│  • No sticky sessions needed                                                 │
│                                                                               │
│           ↓                                                                  │
│                                                                               │
│  APPLICATION SERVER                                                          │
│  ──────────────────                                                           │
│  1. Receive message                                                          │
│  2. Parse JSON                                                              │
│  3. Validate request                                                        │
│  4. Update local state                                                       │
│  5. Publish to Redis                                                         │
│                                                                               │
│           ↓ Redis Pub/Sub                                                    │
│                                                                               │
│  ALL SERVERS                                                                 │
│  ─────────────                                                               │
│  • Subscribe to Redis channel                                                │
│  • Receive update                                                            │
│  • Update local cache                                                        │
│  • Forward to connected clients                                              │
│                                                                               │
│           ↓ WebSocket (WSS)                                                  │
│                                                                               │
│  OTHER CLIENTS                                                               │
│  ─────────────                                                               │
│  • Receive update in real-time                                               │
│  • Update UI immediately                                                    │
│  • Show "live" indicator                                                    │
│                                                                               │
│  TIMELINE:                                                                   │
│  ─────────                                                                  │
│  T+0ms:    Client sends update                                               │
│  T+1ms:    Server receives                                                   │
│  T+2ms:    State updated in L1 cache                                        │
│  T+3ms:    Published to Redis                                                │
│  T+4ms:    Other servers receive                                             │
│  T+5ms:    Other clients receive update                                     │
│  ─────────                                                                  │
│  Total: 5ms end-to-end                                                       │
│                                                                               │
│  BATCHING (for efficiency):                                                  │
│  ──────────────────────────                                                  │
│  • Collect messages for 1-10ms                                              │
│  • Send as single batch                                                      │
│  • Reduces overhead                                                         │
│  • Improves throughput                                                      │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. PRODUCTION DEPLOYMENT TOPOLOGY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  INTERNET                                                                    │
│  ────────                                                                    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │              DNS (Round Robin)                              │          │
│  └──────────────────────────────────────────────────────────────┘          │
│       │                                                                      │
│       ├─────────────────────────────────────────────────────┐                │
│       │                                                     │                │
│       ▼                                                     ▼                │
│  ┌──────────────────┐                            ┌──────────────────┐             │
│  │  LOAD BALANCER 1 │                            │  LOAD BALANCER 2 │             │
│  │  (Active)        │                            │  (Standby)       │             │
│  │  Nginx           │                            │  Nginx           │             │
│  └────────┬─────────┘                            └──────────────────┘             │
│           │                                                                      │
│           ├────────────┬────────────┬────────────┐                            │
│           │            │            │            │                            │
│           ▼            ▼            ▼            ▼                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│  │   App    │  │   App    │  │   App    │  │   App    │                        │
│  │ Server 1 │  │ Server 2 │  │ Server 3 │  │ Server 4 │                        │
│  │          │  │          │  │          │  │          │                        │
│  │ 3K conns │  │ 3K conns │  │ 3K conns │  │ 3K conns │                        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                        │
│       │             │             │             │                              │
│       └─────────────┴─────────────┴─────────────┘                              │
│                     │                                                           │
│                     ├───────────────────────────────┐                         │
│                     │                               │                         │
│                     ▼                               ▼                         │
│          ┌──────────────────┐           ┌────────────────────┐                │
│          │  Redis Cluster   │           │  Database Cluster  │                │
│          │                  │           │                    │                │
│          │  ┌────────────┐  │           │  ┌─────────────┐  │                │
│          │  │ Master     │  │           │  │ MongoDB     │  │                │
│          │  │ (Primary)  │  │           │  │ Primary     │  │                │
│          │  └──────┬─────┘  │           │  └──────┬──────┘  │                │
│          │         │         │           │         │         │                │
│          │  ┌──────┴─────┐  │           │  ┌──────┴──────┐  │                │
│          │  │ Replica 1  │  │           │  │ Replica 1  │  │                │
│          │  └────────────┘  │           │  └─────────────┘  │                │
│          │  ┌────────────┐  │           │  ┌─────────────┐  │                │
│          │  │ Replica 2  │  │           │  │ Replica 2  │  │                │
│          │  └────────────┘  │           │  └─────────────┘  │                │
│          │                  │           │                    │                │
│          └──────────────────┘           │  ┌─────────────┐  │                │
│                                       │  │ PostgreSQL  │  │                │
│                                       │  │ Primary     │  │                │
│                                       │  └──────┬──────┘  │                │
│                                       │  ┌──────┴──────┐  │                │
│                                       │  │ Standby     │  │                │
│                                       │  └─────────────┘  │                │
│                                       │                    │                │
│                                       └────────────────────┘                │
│                     │                                                           │
│                     ├───────────────────────────────────┐                     │
│                     │                                   │                     │
│                     ▼                                   ▼                     │
│          ┌──────────────────┐              ┌────────────────────┐              │
│          │  Monitoring      │              │  External APIs     │              │
│          │                  │              │                    │              │
│          │  • Prometheus    │              │  • OpenAI API      │              │
│          │  • Grafana       │              │  • Anthropic API   │              │
│          │  • AlertManager  │              │  • Federated Lrn   │              │
│          └──────────────────┘              │  • Meadow          │              │
│                                             └────────────────────┘              │
│                                                                               │
│  CAPACITY PLANNING:                                                         │
│  ──────────────────                                                          │
│  • 10,000 concurrent connections                                             │
│  • 60fps update rate                                                         │
│  • 600,000 messages/sec total                                               │
│  • 150,000 messages/sec per server                                          │
│  • 4 servers (3 active + 1 standby)                                         │
│  • Auto-scaling: Add server when >80% capacity                             │
│                                                                               │
│  HIGH AVAILABILITY:                                                          │
│  ───────────────────                                                          │
│  • Redundant load balancers (active-standby)                                │
│  • Multiple app servers (3+ for HA)                                          │
│  • Redis cluster (1 master + 2 replicas)                                     │
│  • MongoDB replica set (3 nodes)                                             │
│  • PostgreSQL primary + standby                                              │
│  • Automatic failover                                                        │
│  • Health checks every 10s                                                  │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary

These diagrams illustrate:

1. **Overall Architecture** - Full system from clients to databases
2. **Four-Tier Cache** - Cell state lifecycle and promotion/demotion
3. **Spatial Indexing** - Grid-based O(1) neighborhood lookups
4. **Cascade Control** - TTL and damping prevent runaway cascades
5. **Adaptive Locking** - State machine for switching between strategies
6. **Message Flow** - End-to-end WebSocket message timeline
7. **Production Deployment** - HA topology with redundancy and scaling

**All designed to support 10,000+ cells at 60fps with significant margin for growth.**

---

**Diagrams Created:** 2026-03-09
**Author:** Wave 6 Backend Simulation Team
**Status:** READY FOR IMPLEMENTATION
