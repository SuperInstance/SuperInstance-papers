# Wave 7 Quick Start Guide

**For Developers Implementing POLLN Wave 7**

**Version:** 1.0
**Date:** 2026-03-09
**Audience:** Developers implementing Wave 7 features

---

## Overview

Wave 7 adds three major feature sets to POLLN:
1. **Authentication & Authorization** - JWT-based auth, RBAC, API keys
2. **Rate Limiting & Abuse Prevention** - Multi-tier protection, DDoS prevention
3. **Cell Garden** - Interactive visualization of spreadsheet cell ecosystems

**Estimated Timeline:** 13 weeks
**Team Size:** 2-3 developers recommended
**Priority:** High (Production readiness)

---

## Prerequisites

Before starting Wave 7 implementation, ensure:

- [x] Waves 1-3 complete (Core spreadsheet cells)
- [x] Wave 4-5 in progress (UI components)
- [x] Familiarity with existing codebase:
  - `src/core/security/crypto.ts` (signing/encryption)
  - `src/api/rate-limit.ts` (rate limiting foundation)
  - `src/spreadsheet/` (spreadsheet architecture)

---

## Phase 1: Authentication (Weeks 1-4)

### Step 1: Set Up JWT Infrastructure (Week 1)

**Start here:** `src/api/auth/jwt-issuer.ts`

```typescript
// 1. Create types first
// src/api/auth/types.ts
export interface PollnJWTClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
  polln: {
    userId: string;
    spreadsheetId?: string;
    accountId: string;
    tier: 'free' | 'pro' | 'enterprise';
    permissions: Permission[];
    quotas: ResourceQuota;
    agentLimits: AgentLimits;
  };
}

// 2. Create token issuer
// src/api/auth/jwt-issuer.ts
import { KeyManager, SignatureService } from '../../core/security';

export class PollnTokenIssuer {
  constructor(
    private keyManager: KeyManager,
    private signatureService: SignatureService,
    private config: AuthConfig
  ) {}

  async issueToken(user: User, context: AuthContext): Promise<string> {
    // Implementation in WAVE7_RESEARCH.md
  }

  validateToken(token: string): PollnJWTClaims | null {
    // Implementation in WAVE7_RESEARCH.md
  }
}
```

**Integration Point:** Use existing `src/core/security/crypto.ts`:
```typescript
import { createSecurityManager } from '../../core/security/crypto';

const securityManager = createSecurityManager();
const signatureService = securityManager.getSignatureService();
const keyManager = securityManager.getKeyManager();
```

**Testing:**
```bash
# Create test file
touch src/api/auth/__tests__/jwt-issuer.test.ts

# Run tests
npm test -- src/api/auth/__tests__/jwt-issuer.test.ts
```

### Step 2: Implement RBAC (Week 2)

**Start here:** `src/api/auth/rbac.ts`

**Key Decisions:**
- Use existing Permission enum from research
- Implement role-permission mapping
- Create authorization middleware

**Integration:** Add to existing API routes:
```typescript
// src/api/routes/spreadsheet.ts
import { authorize } from '../auth/middleware';

router.get(
  '/spreadsheets/:id',
  authenticate,
  authorize(Permission.READ_CELLS),
  getSpreadsheet
);
```

### Step 3: API Key Management (Week 3)

**Security Note:** API keys must be encrypted at rest using existing crypto module:
```typescript
import { EncryptionService } from '../../core/security/crypto';

const encrypted = encryptionService.encrypt(keySecret);
```

**Key Design Decision:** Only show key secret once during creation
```typescript
const response = await apiKeyService.createKey(request);
// response.keySecret is plaintext, only returned once
console.log(`Save this key: ${response.keySecret}`); // Never shown again
```

### Step 4: Session Management (Week 4)

**WebSocket Integration:**
```typescript
// src/api/websocket/auth-handler.ts
import { SessionManager } from '../auth/session-manager';

wsServer.on('connection', async (ws, req) => {
  const sessionId = req.query.sessionId;
  const session = await sessionManager.getSession(sessionId);

  if (!session) {
    ws.close(4001, 'Invalid session');
    return;
  }

  // Attach session to websocket
  (ws as any).session = session;
});
```

---

## Phase 2: Rate Limiting (Weeks 5-7)

### Step 1: Extend Rate Limiter (Week 5)

**Start here:** `src/api/rate-limit/multi-tier.ts`

**Integration with existing rate-limit.ts:**
```typescript
import { RateLimiter } from './rate-limit';

class MultiTierRateLimiter extends EventEmitter {
  private limiters: Map<string, RateLimiter> = new Map();

  constructor(storage: RateLimitStorage, config: MultiTierConfig) {
    super();
    // Use existing RateLimiter for each tier
    this.limiters.set('global', new RateLimiter({
      maxRequests: config.global.maxRequests,
      windowMs: config.global.windowMs,
      algorithm: 'sliding-window',
      keyPrefix: 'ratelimit:global',
      distributed: true,
    }, storage));

    // Add more tiers...
  }
}
```

### Step 2: DDoS Protection (Week 6)

**Key Design:** IP reputation scoring with automatic blacklisting
```typescript
class DDoSProtection {
  private ipReputation: Map<string, number> = new Map();
  private ipBlacklist: Set<string> = new Set();

  async checkRequest(request: IncomingMessage): Promise<DDoSResult> {
    const ip = this.extractIP(request);

    // Check blacklist first (fast path)
    if (this.ipBlacklist.has(ip)) {
      return { allowed: false, reason: 'IP blacklisted' };
    }

    // Check reputation
    const reputation = this.ipReputation.get(ip) ?? 1.0;
    if (reputation < 0.2) {
      this.ipBlacklist.add(ip);
      return { allowed: false, reason: 'Low reputation' };
    }

    // Continue with checks...
  }
}
```

### Step 3: Fair Usage (Week 7)

**Quota Storage:** Use existing storage pattern from rate-limit.ts
```typescript
interface QuotaStorage {
  save(accountId: string, quota: UsageQuota): Promise<void>;
  load(accountId: string): Promise<UsageQuota | null>;
  delete(accountId: string): Promise<void>;
}
```

---

## Phase 3: Cell Garden (Weeks 8-13)

### Step 1: Core Garden (Week 8)

**Start here:** `src/spreadsheet/garden/cell-garden.ts`

**Integration with existing colony:**
```typescript
import { SpreadsheetColony } from '../spreadsheet-colony';

class CellGarden {
  constructor(private colony: SpreadsheetColony) {}

  private extractGraph(): GardenGraph {
    const nodes: GardenNode[] = [];

    // Extract from colony bindings
    for (const [cellAddress, binding] of this.colony.bindings) {
      const agent = this.colony.agents.get(binding.agentId);
      if (!agent) continue;

      nodes.push({
        id: cellAddress,
        type: agent.type,
        status: agent.status,
        // ... more properties
      });
    }

    return { nodes, edges: [] };
  }
}
```

### Step 2: Layout Algorithms (Week 9)

**Recommendation:** Use D3 force simulation for force-directed layout
```bash
npm install d3-force
```

```typescript
import { forceSimulation, forceManyBody, forceLink, forceCenter } from 'd3-force';

private forceDirectedLayout(graph: GardenGraph): LayoutGraph {
  const simulation = forceSimulation(graph.nodes)
    .force('charge', forceManyBody().strength(-100))
    .force('link', forceLink(graph.edges).id(d => d.id))
    .force('center', forceCenter(width / 2, height / 2));

  // Run simulation
  for (let i = 0; i < 300; i++) {
    simulation.tick();
  }

  return { nodes: graph.nodes, edges: graph.edges };
}
```

### Step 3: Rendering (Week 10)

**Choice:** Canvas for performance, SVG for quality
```typescript
// Canvas renderer (faster for large graphs)
class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  render(container: HTMLElement, layout: LayoutGraph): void {
    container.appendChild(this.canvas);
    this.drawNodes(layout.nodes);
    this.drawEdges(layout.edges);
  }
}

// SVG renderer (better for quality)
class SVGRenderer {
  private svg: SVGSVGElement;

  render(container: HTMLElement, layout: LayoutGraph): void {
    container.appendChild(this.svg);
    this.createNodeElements(layout.nodes);
    this.createEdgeElements(layout.edges);
  }
}
```

### Step 4: Interaction (Week 11)

**Event Handling:**
```typescript
class GardenInteraction {
  attach(container: HTMLElement): void {
    container.addEventListener('click', this.handleClick.bind(this));
    container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    container.addEventListener('wheel', this.handleWheel.bind(this));
  }

  private handleClick(event: MouseEvent): void {
    const cellId = this.getCellAtPosition(event);
    if (cellId) {
      this.garden.selectCell(cellId);
      this.showCellDetails(cellId);
    }
  }
}
```

### Step 5: Animation (Week 12)

**Time-Lapse System:**
```typescript
class GardenTimeLapse {
  private history: GardenSnapshot[] = [];

  captureSnapshot(): void {
    this.history.push({
      timestamp: Date.now(),
      graph: this.garden.extractGraph(),
    });
  }

  async play(from: number, to: number): Promise<void> {
    const snapshots = this.generateSnapshots(from, to, 60);

    for (const snapshot of snapshots) {
      this.garden.render(snapshot.graph);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

### Step 6: UI Integration (Week 13)

**React Component:**
```typescript
// src/spreadsheet/garden/ui/garden-view.tsx
import React, { useRef, useEffect } from 'react';

export const GardenView: React.FC<GardenViewProps> = ({ spreadsheetId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gardenRef = useRef<CellGarden | null>(null);

  useEffect(() => {
    // Initialize garden
    const garden = new CellGarden(colony, config);
    garden.render(canvasRef.current!);
    gardenRef.current = garden;

    return () => {
      // Cleanup
    };
  }, [spreadsheetId]);

  return (
    <div className="garden-view">
      <canvas ref={canvasRef} />
      <GardenControls garden={gardenRef.current} />
      <DetailsPanel />
    </div>
  );
};
```

---

## Development Workflow

### 1. Setup Development Environment

```bash
# Install dependencies
npm install

# Install Wave 7 specific dependencies
npm install d3-force  # For force-directed layout
npm install jsonwebtoken  # For JWT handling
npm install bcrypt  # For password hashing

# Set up environment variables
cp .env.example .env
# Edit .env with your values
```

### 2. Create Branch

```bash
git checkout -b feature/wave7-auth
# Or for specific component
git checkout -b feature/wave7-cell-garden
```

### 3. Implementation Loop

```bash
# 1. Write code
# 2. Write tests
npm test -- --watch

# 3. Check coverage
npm test -- --coverage

# 4. Lint
npm run lint

# 5. Build
npm run build

# 6. Commit
git commit -m "feat: implement JWT token issuer"
```

### 4. Testing Strategy

**Unit Tests:** Each module should have comprehensive unit tests
```typescript
describe('PollnTokenIssuer', () => {
  it('should issue valid JWT token');
  it('should validate token');
  it('should reject expired tokens');
  it('should refresh tokens');
});
```

**Integration Tests:** Test feature interactions
```typescript
describe('Authentication Flow', () => {
  it('should login and access protected resource');
  it('should refresh expired token');
  it('should revoke API key');
});
```

**Performance Tests:** Ensure scalability
```typescript
describe('Rate Limiter Performance', () => {
  it('should handle 10,000 requests/second');
  it('should not leak memory');
});
```

---

## Common Patterns

### Error Handling

```typescript
// Standard error response
class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
  }
}

// Usage
try {
  const user = await validateToken(token);
} catch (error) {
  if (error instanceof AuthError) {
    return res.status(error.statusCode).json({
      error: error.message,
    });
  }
  throw error;
}
```

### Middleware Pattern

```typescript
// Composable middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    const user = await validateToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

export const authorize = (permission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const hasPermission = await permissionChecker.hasPermission(
      req.user,
      permission,
      req.context
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};
```

### Storage Pattern

```typescript
// Interface for flexibility
interface Storage<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

// In-memory implementation
class InMemoryStorage<T> implements Storage<T> {
  private store = new Map<string, T>();

  async get(key: string): Promise<T | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// Redis implementation (for production)
class RedisStorage<T> implements Storage<T> {
  // Implementation using Redis client
}
```

---

## Debugging Tips

### Enable Debug Logging

```typescript
// Set environment variable
DEBUG=polln:* npm test

// In code
const debug = require('debug')('polln:auth');
debug('Issuing token for user %s', user.id);
```

### Inspect JWT Tokens

```bash
# Decode JWT (for debugging)
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | jq -R 'split(".") | .[1] | @base64d | fromjson'
```

### Monitor Rate Limits

```typescript
// Add logging to rate limiter
rateLimiter.on('allowed', (data) => {
  console.log(`Request allowed for ${data.key}: ${data.remaining} remaining`);
});

rateLimiter.on('blocked', (data) => {
  console.log(`Request blocked for ${data.key}: retry after ${data.retryAfter}ms`);
});
```

### Visualize Garden

```typescript
// Export garden as JSON for inspection
const graph = garden.extractGraph();
console.log(JSON.stringify(graph, null, 2));

// Export as GraphML for external tools
const graphml = garden.export('graphml');
fs.writeFileSync('garden.graphml', graphml);
```

---

## Performance Considerations

### JWT Validation

**Issue:** JWT validation on every request is expensive

**Solution:** Short-lived tokens with caching
```typescript
const tokenCache = new LRUCache<string, PollnJWTClaims>({ max: 1000 });

function validateTokenCached(token: string): PollnJWTClaims | null {
  const cached = tokenCache.get(token);
  if (cached) return cached;

  const validated = validateToken(token);
  if (validated) {
    tokenCache.set(token, validated);
  }

  return validated;
}
```

### Rate Limiting

**Issue:** Too many storage hits

**Solution:** Use Redis with pipeline
```typescript
const pipeline = redis.pipeline();
pipeline.get(`ratelimit:${key1}`);
pipeline.get(`ratelimit:${key2}`);
pipeline.get(`ratelimit:${key3}`);
const results = await pipeline.exec();
```

### Garden Rendering

**Issue:** Large graphs are slow to render

**Solution:** Virtualization and level-of-detail
```typescript
// Only render visible nodes
const visibleNodes = nodes.filter(node => isInViewport(node, camera));

// Simplify rendering when zoomed out
if (camera.zoom < 0.5) {
  // Render as simple circles
  drawSimpleCircle(node);
} else {
  // Render detailed node
  drawDetailedNode(node);
}
```

---

## Security Checklist

Before deploying any Wave 7 component, ensure:

- [ ] All secrets are in environment variables
- [ ] API keys are encrypted at rest
- [ ] JWTs have short expiration (15 minutes)
- [ ] Rate limits are enforced at all tiers
- [ ] IP addresses are logged for security events
- [ ] Input validation on all endpoints
- [ ] Output encoding to prevent XSS
- [ ] SQL injection prevention
- [ ] CORS properly configured
- [ ] HTTPS enforced in production

---

## Getting Help

### Documentation

- `WAVE7_RESEARCH.md` - Complete feature research
- `WAVE7_DIAGRAMS.md` - Architecture diagrams
- `WAVE7_CHECKLIST.md` - Implementation checklist

### Code Examples

- `src/api/auth/__tests__/` - Test examples
- `src/api/rate-limit/__tests__/` - Test examples
- `src/spreadsheet/garden/__tests__/` - Test examples

### Team Communication

- Daily standup: Progress, blockers, next steps
- Weekly review: Demo completed features
- Slack: #wave7-implementation channel

---

## Milestones

### Week 4: Authentication Complete ✅
- JWT token issuance and validation
- RBAC system with roles and permissions
- API key management
- Session management

### Week 7: Rate Limiting Complete ✅
- Multi-tier rate limiting
- DDoS protection
- Fair usage enforcement

### Week 13: Cell Garden Complete ✅
- Graph extraction and layout
- Canvas/SVG rendering
- Interactive controls
- Time-lapse animation
- UI integration

### Week 15: Production Ready 🚀
- All tests passing
- Security audit complete
- Performance benchmarks met
- Documentation complete
- Deployment ready

---

**Happy Coding! 🚀**

Remember: Wave 7 is about making POLLN production-ready for enterprise deployments. Focus on security, scalability, and user experience. The Cell Garden is our "killer feature" - make it beautiful and intuitive!

---

**Quick Reference:**
- Research: `docs/research/spreadsheet/WAVE7_RESEARCH.md`
- Diagrams: `docs/research/spreadsheet/WAVE7_DIAGRAMS.md`
- Checklist: `docs/research/spreadsheet/WAVE7_CHECKLIST.md`
- Quick Start: `docs/research/spreadsheet/WAVE7_QUICKSTART.md` (this file)
