# Wave 7: Architecture Diagrams

**Visual Supplements for WAVE7_RESEARCH.md**

---

## 1. Authentication Flow Diagram

```
┌─────────────┐                              ┌──────────────────┐
│   Client    │                              │  Auth Service    │
│ (Spreadsheet│                              │                  │
│   Runtime)  │                              │                  │
└──────┬──────┘                              └────────┬─────────┘
       │                                               │
       │ 1. POST /auth/login                           │
       │    { credentials }                            │
       ├──────────────────────────────────────────────>│
       │                                               │
       │                                    ┌──────────┴──────────┐
       │                                    │  Validate Credentials│
       │                                    │  Generate JWT        │
       │                                    │  Create Session      │
       │                                    └──────────┬──────────┘
       │                                               │
       │ 2. { accessToken, refreshToken }              │
       │<──────────────────────────────────────────────┤
       │                                               │
       │ 3. Store token securely                       │
       │                                               │
       │                                               │
       │ 4. API Request with Bearer Token              │
       ├──────────────────────────────────────────────>│
       │                                               │
       │                                    ┌──────────┴──────────┐
       │                                    │  Validate JWT        │
       │                                    │  Check Permissions   │
       │                                    │  Rate Limit Check    │
       │                                    └──────────┬──────────┘
       │                                               │
       │ 5. { allowed: true, user, permissions }       │
       │<──────────────────────────────────────────────┤
       │                                               │
       │ 6. Proceed to protected resource              │
       │                                               │
```

---

## 2. Multi-Tier Rate Limiting Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Rate Limiting Pipeline                      │
└─────────────────────────────────────────────────────────────────┘

Incoming Request
       │
       ▼
┌──────────────────┐
│  Global Limiter  │ 10,000 req/sec
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│  Account Limiter │ Based on tier (Free/Pro/Enterprise)
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│ Spreadsheet Limit│ 60 req/min per spreadsheet
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│   Agent Limiter  │ 10 req/min per agent
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│     IP Limit     │ 20 req/min per IP
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│  DDoS Protection │ Pattern analysis, IP reputation
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│  Fair Usage Check│ Quota enforcement
└─────────┬────────┘
          │
          ▼
   [ALLOWED] or [BLOCKED]
```

---

## 3. Cell Garden Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                       CELL GARDEN VIEW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │                    Controls                           │    │
│   │  [Zoom In] [Zoom Out] [Filter] [Layout] [Export]      │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                 │
│   ┌─────────────────────────────────────────────────────┐       │
│   │                                                     │       │
│   │   🌱 A1 ──────────→ 🌿 B2 ──────→ 🌳 C3           │       │
│   │    │                  │             │                │       │
│   │    │                  │             │                │       │
│   │    ▼                  ▼             ▼                │       │
│   │   🌿 A2 ──────────→ 🌳 B3 ──────→ 🌳 C4           │       │
│   │    │                  │             │                │       │
│   │    │                  │             │                │       │
│   │    ▼                  ▼             ▼                │       │
│   │   🌿 A3 ──────────→ 🌱 B4 ──────→ 🍂 C5           │       │
│   │                                                     │       │
│   │   Legend:                                           │       │
│   │   🌱 Input Cell (Seed)                             │       │
│   │   🌿 Processing Cell (Growing)                     │       │
│   │   🌳 Output Cell (Mature)                          │       │
│   │   🍂 Inactive Cell (Decaying)                      │       │
│   │   ─── Data Flow                                    │       │
│   │   🔗 Dependency                                    │       │
│   │                                                     │       │
│   └─────────────────────────────────────────────────────┘       │
│                                                                 │
│   ┌─────────────────────────────────────────────────────┐       │
│   │  Selected: C3                                       │       │
│   │  Type: Output                                       │       │
│   │  Status: Active                                     │       │
│   │  Connections: 2                                     │       │
│   │  Last Update: 2 minutes ago                         │       │
│   │  [View Details] [Edit] [Delete]                     │       │
│   └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Color Schemes:
├─ By Type: Input(green), Transform(orange), Output(blue)
├─ By Status: Active(green), Inactive(gray), Error(red)
├─ By Age: Young(bright), Old(dark)
└─ By Activity: Low(yellow), High(red)

Layout Options:
├─ Force-Directed: Physics-based, organic
├─ Hierarchical: Tree-based, topological
├─ Circular: Arranged in circle
└─ Grid: Sheet-based positioning
```

---

## 4. Session Management Flow

```
┌──────────────┐                                    ┌──────────────┐
│    Client    │                                    │   Server     │
└──────┬───────┘                                    └──────┬───────┘
       │                                                    │
       │ 1. POST /auth/login                                │
       ├───────────────────────────────────────────────────>│
       │                                                    │
       │                                         ┌──────────┴──────────┐
       │                                         │  Validate User       │
       │                                         │  Create Session      │
       │                                         │  Generate Tokens     │
       │                                         └──────────┬──────────┘
       │                                                    │
       │ 2. { accessToken, refreshToken, sessionId }        │
       │<───────────────────────────────────────────────────┤
       │                                                    │
       │ 3. WebSocket Connection with sessionId             │
       ├───────────────────────────────────────────────────>│
       │                                                    │
       │                                         ┌──────────┴──────────┐
       │                                         │  Validate Session    │
       │                                         │  Setup WebSocket     │
       │                                         └──────────┬──────────┘
       │                                                    │
       │ 4. WebSocket Connected                             │
       │<───────────────────────────────────────────────────┤
       │                                                    │
       │ 5. [WebSocket Messages]                            │
       │<═══════════════════════════════════════════════════╡
       │                                                    │
       │ 6. Periodic session refresh (heartbeat)            │
       ├───────────────────────────────────────────────────>│
       │                                                    │
       │ 7. Session updated (extends expiry)                │
       │<───────────────────────────────────────────────────┤
       │                                                    │
```

---

## 5. API Key Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     API KEY LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────┘

1. Creation
   │
   ├─ User generates API key via dashboard
   ├─ System generates keyId and keySecret
   ├─ keySecret is encrypted and stored
   ├─ Full key returned: polln_abc123.xyz789...
   └─ **Key secret only shown once**

2. Usage
   │
   ├─ Client includes key in Authorization header
   ├─ Server validates keyId and decrypts keySecret
   ├─ Check if key is active and not expired
   ├─ Check IP whitelist (if configured)
   ├─ Enforce rate limits
   └─ Allow request if all checks pass

3. Monitoring
   │
   ├─ Track last used timestamp
   ├─ Log usage metrics
   ├─ Detect anomalous patterns
   └─ Alert on suspicious activity

4. Rotation
   │
   ├─ User initiates key rotation
   ├─ New key generated
   ├─ Old key marked for deprecation
   ├─ Grace period for migration
   └─ Old key expires after grace period

5. Revocation
   │
   ├─ User revokes key (compromised/unused)
   ├─ System marks key as revoked
   ├─ All subsequent requests rejected
   └─ Audit log updated

States: active → expiring → expired/revoked
```

---

## 6. DDoS Protection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DDoS DETECTION FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Incoming Request
       │
       ▼
┌──────────────────┐
│  IP Blacklist    │ Is IP blacklisted?
└─────────┬────────┘
          │
          ├─ Yes → [BLOCKED]
          │
          └─ No → ▼
┌──────────────────┐
│ IP Reputation    │ Score > threshold?
└─────────┬────────┘
          │
          ├─ No → [BLOCKED]
          │
          └─ Yes → ▼
┌──────────────────┐
│ Pattern Analysis │ Suspicious patterns?
└─────────┬────────┘
          │
          ├─ Yes → Decrease reputation
          │         │
          │         └─ If score < 0.2 → Blacklist IP
          │
          └─ No → ▼
┌──────────────────┐
│  Rate Limit      │ Within limits?
└─────────┬────────┘
          │
          ├─ No → Decrease reputation
          │         │
          │         └─ Check if should blacklist
          │
          └─ Yes → Increase reputation
                    │
                    ▼
              [ALLOWED]

Reputation Scoring:
├─ Starts at 1.0
├─ +0.01 for each successful request
├─ -0.1 for each rate limit exceeded
├─ Blacklist if score < 0.2
└─ Decay over time (recover to 1.0)
```

---

## 7. Cell Garden Time-Lapse

```
┌─────────────────────────────────────────────────────────────────┐
│                   TIME-LAPSE ANIMATION                          │
└─────────────────────────────────────────────────────────────────┘

T = 0 (Start)
┌─────────────────┐
│  A1: 🌱         │  One input cell
└─────────────────┘

         ↓

T = 1 hour
┌─────────────────┐
│  A1: 🌿         │  Cell growing
│  A2: 🌱         │  New cell added
└─────────────────┘

         ↓

T = 1 day
┌─────────────────────────────┐
│  A1: 🌳                    │  Mature output
│  A2: 🌿 → B1: 🌱           │  New downstream cell
│  A3: 🌱                    │  Another input
└─────────────────────────────┘

         ↓

T = 1 week
┌─────────────────────────────────────────────┐
│  A1: 🌳                                   │
│  A2: 🌿 → B1: 🌿 → C1: 🌳                 │  Complex network
│  A3: 🌿 → B2: 🌱                          │  formed
│  A4: 🌱                                   │  Growth patterns
│       ↘                                   │  visible
│        B3: 🌱                             │
└─────────────────────────────────────────────┘

         ↓

T = 1 month
┌──────────────────────────────────────────────────────────────┐
│  Dense ecosystem with:                                        │
│  - 50+ cells                                                  │
│  - Complex entanglement networks                              │
│  - Emergent patterns                                          │
│  - Active growth in some regions                              │
│  - Decay in unused regions                                    │
└──────────────────────────────────────────────────────────────┘

Animation Controls:
├─ Play/Pause
├─ Speed control (1x, 2x, 4x, 8x)
├─ Time slider (scrub through history)
├─ Skip to specific date
└─ Export as video
```

---

## 8. Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    WAVE 7 COMPONENTS                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Spreadsheet UI  │────▶│  Auth Service    │────▶│  User Database   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌──────────────────┐     ┌──────────────────┐
│  Cell Garden     │     │  Rate Limiter    │
│  Visualization   │────▶│  Multi-Tier      │
└──────────────────┘     └──────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌──────────────────┐     ┌──────────────────┐
│  Spreadsheet     │     │  DDoS Protection  │
│  Colony          │────▶│  IP Reputation    │
└──────────────────┘     └──────────────────┘
         │
         │
         ▼
┌──────────────────┐
│  Core POLLN      │
│  Agents          │
└──────────────────┘

Data Flow:
1. UI requests garden visualization
2. Auth validates JWT token
3. Rate limiter checks all tiers
4. Garden extracts graph from colony
5. Renderer creates visual representation
6. UI displays interactive garden
```

---

## 9. Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                              │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Network Security
├─ TLS/SSL for all connections
├─ CORS policy
└─ IP whitelisting (optional)

Layer 2: Authentication
├─ JWT token validation
├─ API key validation
├─ Session validation
└─ Multi-factor authentication (optional)

Layer 3: Authorization
├─ Role-based access control (RBAC)
├─ Permission checking
├─ Resource-level permissions
└─ Ownership validation

Layer 4: Rate Limiting
├─ Global rate limits
├─ Per-account limits
├─ Per-resource limits
└─ IP-based limits

Layer 5: Abuse Prevention
├─ DDoS protection
├─ IP reputation
├─ Pattern analysis
└─ Blacklist management

Layer 6: Data Security
├─ Encryption at rest
├─ Encryption in transit
├─ Secure key management
└─ Audit logging

Layer 7: Application Security
├─ Input validation
├─ Output encoding
├─ SQL injection prevention
└─ XSS prevention
```

---

## 10. Implementation Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│               IMPLEMENTATION DEPENDENCIES                       │
└─────────────────────────────────────────────────────────────────┘

Wave 7 Dependencies:
│
├─ Core POLLN (Complete)
│  ├─ Agents
│  ├─ Colony
│  ├─ Decision System
│  └─ Learning System
│
├─ Security Module (Complete)
│  ├─ src/core/security/crypto.ts ✓
│  ├─ src/core/security/audit.ts ✓
│  └─ src/core/security/hardening.ts ✓
│
├─ Rate Limiting (Complete)
│  └─ src/api/rate-limit.ts ✓
│
├─ Spreadsheet Waves 1-3 (Complete)
│  ├─ LogCell, CellHead, CellBody, CellTail ✓
│  ├─ InputCell, OutputCell, TransformCell ✓
│  ├─ FilterCell, AggregateCell, ValidateCell ✓
│  └─ AnalysisCell, PredictionCell, DecisionCell ✓
│
├─ Spreadsheet Wave 4-5 (Pending)
│  ├─ UI Components
│  ├─ Cell Renderer
│  └─ Grid Display
│
└─ Wave 7 (This Research)
   ├─ Authentication & Authorization
   ├─ Rate Limiting Enhancement
   └─ Cell Garden Visualization

Critical Path:
1. Complete Wave 4-5 (UI foundation)
2. Implement Authentication (Wave 7)
3. Enhance Rate Limiting (Wave 7)
4. Build Cell Garden (Wave 7)
5. Integration & Testing
```

---

**Document Status:** Diagrams complete
**Related:** WAVE7_RESEARCH.md
**Purpose:** Visual supplements for implementation planning
