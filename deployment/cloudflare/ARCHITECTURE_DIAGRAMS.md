# Cloudflare Architecture Diagrams - SpreadsheetMoment
**Visual Implementation Guide**
**Last Updated:** 2026-03-14

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE EDGE NETWORK                       │
│                    (300+ Locations Worldwide)                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         WORKERS LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    API GATEWAY WORKER                         │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  • Request Routing & Authentication                     │  │  │
│  │  │  • Rate Limiting & Quota Management                     │  │  │
│  │  │  • CORS & Error Handling                                │  │  │
│  │  │  • API Versioning                                       │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────┬────────────────────────────────────────┬───────────┘  │
│             │                                        │               │
│             ▼                                        ▼               │
│  ┌──────────────────────┐              ┌──────────────────────────┐│
│  │   CELL ENGINE        │              │      NLP WORKER          ││
│  │   WORKER             │              │                          ││
│  │  • Tensor Compute    │              │  • Natural Language      ││
│  │  • Temperature       │              │  • Vector Embeddings      ││
│  │  • Formulas          │              │  • Semantic Search       ││
│  │  • Dependencies      │              │  • What-If Scenarios     ││
│  └──────────────────────┘              └──────────────────────────┘│
│             │                                        │               │
│             ▼                                        ▼               │
│  ┌──────────────────────┐              ┌──────────────────────────┐│
│  │  HARDWARE INTEGRATION│              │   COLLABORATION          ││
│  │  WORKER              │              │   WORKER                 ││
│  │  • Arduino/ESP32     │              │  • Real-time Sync        ││
│  │  • Jetson            │              │  • Presence              ││
│  │  • Edge Displays     │              │  • Cursors               ││
│  │  • Sensor Streams    │              │  • Conflict Resolution   ││
│  └──────────────────────┘              └──────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DURABLE OBJECTS LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              WORKSPACE COORDINATOR                            │  │
│  │  • Manages workspace state                                   │  │
│  │  • Coordinates user sessions                                │  │
│  │  • Broadcasts updates to participants                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              CELL UPDATE MANAGER                              │  │
│  │  • Processes cell updates                                    │  │
│  │  • Propagates temperature changes                           │  │
│  │  • Updates vector embeddings                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              COLLABORATION SESSION                            │  │
│  │  • Manages WebSocket connections                             │  │
│  │  • Tracks user presence & cursors                            │  │
│  │  • Resolves edit conflicts                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              HARDWARE CONNECTION POOL                         │  │
│  │  • Manages device connections                                │  │
│  │  • Processes sensor data streams                             │  │
│  │  • Monitors device health                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │     D1      │  │     R2      │  │     KV      │  │ Vectorize │ │
│  │  (Database) │  │  (Storage)  │  │   (Cache)   │  │ (Vectors) │ │
│  │             │  │             │  │             │  │           │ │
│  │ • Users     │  │ • Files     │  │ • Sessions  │  │ • Cells   │ │
│  │ • Workspaces│  │ • Assets    │  │ • Cache     │  │ • Queries │ │
│  │ • Cells     │  │ • Backups   │  │ • Rate Limit│  │ • Docs    │ │
│  │ • History   │  │ • Exports   │  │             │  │           │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │   OpenAI    │  │  Google     │  │   GitHub    │  │ Super     │ │
│  │             │  │   OAuth     │  │   OAuth     │  │ Instance  │ │
│  │ • GPT-4     │  │             │  │             │  │           │ │
│  │ • Embeddings│  │             │  │             │  │ • Tensors │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │  Arduino    │  │  3D Print   │  │  Edge       │               │
│  │  Cloud      │  │  Services   │  │  Displays   │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Request Flow Diagram

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. HTTP Request
     ▼
┌─────────────────────────────────────────────┐
│         CLOUDFLARE EDGE NETWORK              │
│  (Route to nearest data center)              │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│         API GATEWAY WORKER                  │
├─────────────────────────────────────────────┤
│  1. Parse request                           │
│  2. Authenticate (JWT/API Key)              │
│  3. Rate limit check                         │
│  4. Route to appropriate handler            │
└────┬───────────┬───────────┬────────────────┘
     │           │           │
     ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌──────────┐
│   API   │ │   NLP   │ │ Hardware  │
│  Routes │ │ Queries │ │ Requests  │
└────┬────┘ └────┬────┘ └────┬─────┘
     │           │           │
     ▼           ▼           ▼
┌─────────────────────────────────────────────┐
│         DURABLE OBJECTS                      │
├─────────────────────────────────────────────┤
│  • Workspace Coordinator                    │
│  • Cell Update Manager                      │
│  • Collaboration Session                    │
│  • Hardware Connection Pool                 │
└────┬───────────┬───────────┬────────────────┘
     │           │           │
     ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌──────────┐
│    D1   │ │Vectorize│ │    R2    │
│ Database│ │  Search │ │  Storage │
└────┬────┘ └────┬────┘ └────┬─────┘
     │           │           │
     └───────────┴───────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│         RESPONSE ASSEMBLY                   │
├─────────────────────────────────────────────┤
│  1. Gather results from all services        │
│  2. Format response                         │
│  3. Add caching headers                     │
│  4. Return to user                          │
└─────────────────────────────────────────────┘
```

---

## 3. Real-time Collaboration Flow

```
┌──────────┐                    ┌──────────┐
│  User A  │                    │  User B  │
└─────┬────┘                    └─────┬────┘
      │                               │
      │ 1. Connect to workspace       │
      └───────────┬───────────────────┘
                  ▼
    ┌─────────────────────────────────┐
    │   WORKSPACE COORDINATOR         │
    │   (Durable Object)              │
    ├─────────────────────────────────┤
    │  • Accept WebSocket connection  │
    │  • Add user to session          │
    │  • Broadcast user joined        │
    └───────────┬─────────────────────┘
                │
                ▼
    ┌─────────────────────────────────┐
    │         User A edits cell       │
    │         cell A1 = 42            │
    └───────────┬─────────────────────┘
                │
                ▼
    ┌─────────────────────────────────┐
    │   CELL UPDATE MANAGER           │
    │   (Durable Object)              │
    ├─────────────────────────────────┤
    │  1. Update cell value in D1     │
    │  2. Calculate new temperature   │
    │  3. Update vector embedding     │
    │  4. Notify dependencies         │
    │  5. Broadcast to participants   │
    └───────────┬─────────────────────┘
                │
                ▼
    ┌─────────────────────────────────┐
    │   COLLABORATION SESSION         │
    │   (Durable Object)              │
    ├─────────────────────────────────┤
    │  1. Receive update notification │
    │  2. Broadcast to all users      │
    │  3. Update cursor positions     │
    │  4. Detect conflicts            │
    └───────────┬─────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
   ┌────────┐      ┌────────┐
   │ User A │      │ User B │
   │ sees:  │      │ sees:  │
   │ A1=42  │      │ A1=42  │
   └────────┘      └────────┘
```

---

## 4. NLP Query Flow

```
┌──────────┐
│  User    │
│  Query:  │
│ "Show me │
│  cells   │
│  > 40"   │
└─────┬────┘
      │
      ▼
┌─────────────────────────────────────────┐
│         API GATEWAY                     │
│  1. Receive query                       │
│  2. Authenticate user                   │
│  3. Route to NLP Worker                 │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│         NLP WORKER                      │
├─────────────────────────────────────────┤
│  1. Parse natural language              │
│  2. Extract intent and parameters       │
│  3. Generate embedding for query        │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│         VECTORIZE INDEX                 │
├─────────────────────────────────────────┤
│  1. Search for similar cells            │
│  2. Filter by workspace                 │
│  3. Return top N matches                │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│         OPENAI GPT-4                    │
├─────────────────────────────────────────┤
│  1. Context: Query + Cell matches       │
│  2. Generate: SQL query or filter       │
│  3. Return structured response          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│         D1 DATABASE                     │
├─────────────────────────────────────────┤
│  1. Execute generated query              │
│  2. Filter cells matching criteria      │
│  3. Return results                      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│         FORMAT RESPONSE                 │
├─────────────────────────────────────────┤
│  1. Structure results                   │
│  2. Add metadata (count, latency)       │
│  3. Return JSON to user                 │
└────────────┬────────────────────────────┘
             │
             ▼
┌──────────┐
│  User    │
│  sees:   │
│  42, 57, │
│  81, ... │
└──────────┘
```

---

## 5. Hardware Integration Flow

```
┌──────────────┐
│   Arduino    │
│   Device     │
└──────┬───────┘
       │ 1. Sensor reading: 25°C
       ▼
┌─────────────────────────────────────────┐
│    HARDWARE CONNECTION POOL             │
│    (Durable Object)                    │
├─────────────────────────────────────────┤
│  1. Receive sensor data                 │
│  2. Verify device is online             │
│  3. Update heartbeat timestamp          │
│  4. Route to connected cells            │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    CELL UPDATE MANAGER                  │
├─────────────────────────────────────────┤
│  1. Identify connected cells            │
│  2. Update cell values                  │
│  3. Trigger temperature propagation     │
│  4. Update vector embeddings            │
│  5. Store reading in history            │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    WORKSPACE COORDINATOR                │
├─────────────────────────────────────────┤
│  1. Notify participants of update       │
│  2. Broadcast to all connected users    │
│  3. Trigger UI refresh                  │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    REAL-TIME DASHBOARD                  │
├─────────────────────────────────────────┤
│  • Cell value updates instantly         │
│  • Temperature propagates               │
│  • Connected visualizations refresh     │
│  • Historical data logged               │
└─────────────────────────────────────────┘
```

---

## 6. Database Schema Relationships

```
┌─────────────┐
│    users    │
├─────────────┤
│ id          │──┐
│ email       │  │
│ display_name│  │
│ ────────────│  │
└─────────────┘  │
                 │
     ┌───────────┴───────────┐
     │                       │
     ▼                       ▼
┌─────────────┐      ┌──────────────┐
│ workspaces  │      │ api_keys     │
├─────────────┤      ├──────────────┤
│ id          │──┐  │ id           │
│ owner_id    │  │  │ user_id      │
│ name        │  │  │ key_hash     │
│ ────────────│  │  │ scopes       │
└─────────────┘  │  │ ─────────────│
                 │  └──────────────┘
                 │
     ┌───────────┴───────────┬─────────────┐
     │                       │             │
     ▼                       ▼             ▼
┌─────────────┐      ┌──────────────┐ ┌─────────────┐
│workspace_  │      │ tensor_cells │ │ sessions    │
│collaborators│      ├──────────────┤ ├─────────────┤
├─────────────┤      │ id           │ │ id          │
│ workspace_id│──┐  │ workspace_id │◄─┤ workspace_id│
│ user_id     │  │  │ value        │ │ user_id     │
│ role        │  │  │ temperature  │ │ ────────────│
│ ────────────│  │  │ ────────────│ └─────────────┘
└─────────────┘  │  └──────────────┘
                 │
                 │
     ┌───────────┴───────────┬─────────────┐
     │                       │             │
     ▼                       ▼             ▼
┌─────────────┐      ┌──────────────┐ ┌─────────────┐
│vector_      │      │  dashboard_  │ │   cell_     │
│connections  │      │    pages     │ │  history    │
├─────────────┤      ├──────────────┤ ├─────────────┤
│ source_id   │      │ workspace_id │ │ cell_id     │
│ target_id   │      │ layout_config│ │ old_value   │
│ strength    │      │ ────────────│ │ new_value   │
│ ────────────│      └──────────────┘ │ ────────────│
└─────────────┘                       └─────────────┘

┌─────────────┐      ┌──────────────┐
│ nlp_queries │      │hardware_     │
├─────────────┤      │connections   │
│ user_id     │      ├──────────────┤
│ workspace_id│      │ endpoint_url │
│ query       │      │ status       │
│ ────────────│      │ ────────────│
└─────────────┘      └──────────────┘
```

---

## 7. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT                                  │
├─────────────────────────────────────────────────────────────────┤
│  • Local development (wrangler dev --local)                     │
│  • Local D1 database (in-memory)                                │
│  • Local R2 (mock)                                             │
│  • Hot reload                                                   │
│  • Fast iteration                                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ deploy
┌─────────────────────────────────────────────────────────────────┐
│                     STAGING                                      │
├─────────────────────────────────────────────────────────────────┤
│  • api-staging.spreadsheetmoment.com                            │
│  • Staging D1 database                                          │
│  • Staging R2 bucket                                            │
│  • Pre-production testing                                       │
│  • User acceptance testing                                      │
│  • Performance testing                                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ deploy (after tests pass)
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUCTION                                   │
├─────────────────────────────────────────────────────────────────┤
│  • api.spreadsheetmoment.com                                    │
│  • Production D1 database                                       │
│  • Production R2 bucket                                         │
│  • Global edge deployment                                       │
│  • Real user traffic                                            │
│  • Monitoring & alerting active                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MONITORING                                   │
├─────────────────────────────────────────────────────────────────┤
│  • Cloudflare Analytics Engine                                   │
│  • Custom metrics (latency, errors)                             │
│  • Alerts (error rate, latency, costs)                          │
│  • Log aggregation                                              │
│  • Performance dashboards                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Cost Optimization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CACHE CHECK (KV)                             │
├─────────────────────────────────────────────────────────────────┤
│  • Check if request cached                                      │
│  • Return cached response if valid                              │
│  • Cache hit: $0.00001 per read                                 │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼ (cache miss)
┌─────────────────────────────────────────────────────────────────┐
│                    RATE LIMIT CHECK                             │
├─────────────────────────────────────────────────────────────────┤
│  • Check user quota                                             │
│  • Block if exceeded                                            │
│  • Prevents expensive operations                                │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼ (within quota)
┌─────────────────────────────────────────────────────────────────┐
│                    BATCH OPERATIONS                             │
├─────────────────────────────────────────────────────────────────┤
│  • Batch multiple database writes                                │
│  • Reduces request count                                        │
│  • Lower cost                                                   │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    QUERY OPTIMIZATION                           │
├─────────────────────────────────────────────────────────────────┤
│  • Use prepared statements                                      │
│  • Leverage indexes                                             │
│  • Return only needed columns                                   │
│  • Implement pagination                                         │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESULT CACHING                               │
├─────────────────────────────────────────────────────────────────┤
│  • Store response in KV                                         │
│  • Set appropriate TTL                                          │
│  • Next request serves from cache                               │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSE                                     │
├─────────────────────────────────────────────────────────────────┤
│  • Add caching headers                                          │
│  • Enable CDN caching                                           │
│  • Compress response                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE ACCESS (Zero Trust)                     │
├─────────────────────────────────────────────────────────────────┤
│  • DDoS Protection                                              │
│  • Web Application Firewall (WAF)                               │
│  • Bot Management                                               │
│  • Rate Limiting                                                │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              AUTHENTICATION                                     │
├─────────────────────────────────────────────────────────────────┤
│  • Cloudflare Access JWT (Google/GitHub OAuth)                  │
│  • API Key Authentication (programmatic)                        │
│  • JWT Validation (public key)                                  │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              AUTHORIZATION                                      │
├─────────────────────────────────────────────────────────────────┤
│  • Role-Based Access Control (RBAC)                             │
│  • Workspace permissions (owner, editor, viewer)                │
│  • Resource-level permissions                                   │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              DATA ENCRYPTION                                    │
├─────────────────────────────────────────────────────────────────┤
│  • TLS 1.3 for all connections                                  │
│  • Sensitive data encrypted at rest                             │
│  • API keys encrypted with AES-256                              │
│  • Secrets stored in environment variables                      │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              AUDIT & LOGGING                                    │
├─────────────────────────────────────────────────────────────────┤
│  • All requests logged                                          │
│  • Cell change history tracked                                  │
│  • User actions audited                                         │
│  • Security events flagged                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Scaling Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: 1-100 USERS                         │
├─────────────────────────────────────────────────────────────────┤
│  • Single Worker instance                                       │
│  • Basic D1 database                                            │
│  • Minimal R2 storage                                          │
│  • Cost: ~$8/month                                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ (scale)
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2: 100-1K USERS                        │
├─────────────────────────────────────────────────────────────────┤
│  • Multiple Workers (auto-scaling)                              │
│  • Durable Objects for collaboration                            │
│  • Optimized D1 queries                                         │
│  • Cost: ~$100/month                                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ (scale)
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 3: 1K-10K USERS                        │
├─────────────────────────────────────────────────────────────────┤
│  • Worker-to-Worker communication                               │
│  • Dedicated NLP Worker                                         │
│  • Aggressive caching strategy                                  │
│  • Cost: ~$500/month                                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ (scale)
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 4: 10K-100K USERS                       │
├─────────────────────────────────────────────────────────────────┤
│  • Specialized Workers (API, NLP, Hardware, Storage)            │
│  • Data archiving to cold storage                               │
│  • Query optimization and read replicas                         │
│  • Cost: ~$1,285/month                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Legend

- **Worker**: Serverless compute function
- **Durable Object**: Coordinated state with low-latency sync
- **D1**: SQLite-based database
- **R2**: Object storage (S3-compatible)
- **KV**: Key-value cache
- **Vectorize**: Vector similarity search
- **Queue**: Asynchronous job processing

---

**Document Version:** 1.0
**Last Updated:** 2026-03-14
**Status:** Complete
