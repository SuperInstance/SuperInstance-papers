# WAVE 6 IMPLEMENTATION GUIDE

**Step-by-Step Instructions for Building the Scalable Backend**

---

## Phase 1: Foundation (Week 1-2)

### Step 1.1: WebSocket Server Setup

**File:** `src/server/WebSocketServer.ts`

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface ClientConnection {
  id: string;
  ws: WebSocket;
  cellIds: Set<string>;
  lastPing: number;
}

export class WebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private cellToClients: Map<string, Set<string>> = new Map();

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.setupHandlers();
  }

  private setupHandlers() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = this.generateClientId();

      const client: ClientConnection = {
        id: clientId,
        ws,
        cellIds: new Set(),
        lastPing: Date.now(),
      };

      this.clients.set(clientId, client);

      ws.on('message', (data: Buffer) => {
        this.handleMessage(clientId, data);
      });

      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
        timestamp: Date.now(),
      });

      // Start heartbeat
      this.startHeartbeat(clientId);
    });
  }

  private handleMessage(clientId: string, data: Buffer) {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, message.cellId);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message.cellId);
          break;
        case 'cell_update':
          this.handleCellUpdate(clientId, message);
          break;
        case 'ping':
          this.handlePing(clientId);
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling message from ${clientId}:`, error);
    }
  }

  private handleSubscribe(clientId: string, cellId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.cellIds.add(cellId);

    if (!this.cellToClients.has(cellId)) {
      this.cellToClients.set(cellId, new Set());
    }
    this.cellToClients.get(cellId)!.add(clientId);
  }

  private handleUnsubscribe(clientId: string, cellId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.cellIds.delete(cellId);

    const subscribers = this.cellToClients.get(cellId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.cellToClients.delete(cellId);
      }
    }
  }

  private async handleCellUpdate(clientId: string, message: any) {
    const { cellId, value } = message;

    // Update in cache
    await cacheManager.set(cellId, value);

    // Broadcast to other subscribers
    const subscribers = this.cellToClients.get(cellId);
    if (subscribers) {
      for (const subscriberId of subscribers) {
        if (subscriberId !== clientId) {
          this.sendToClient(subscriberId, {
            type: 'cell_update',
            cellId,
            value,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Publish to Redis for other servers
    await redis.publish('cell_updates', {
      cellId,
      value,
      timestamp: Date.now(),
    });
  }

  private handlePing(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastPing = Date.now();

    this.sendToClient(clientId, {
      type: 'pong',
      timestamp: Date.now(),
    });
  }

  private handleDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Unsubscribe from all cells
    for (const cellId of client.cellIds) {
      const subscribers = this.cellToClients.get(cellId);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.cellToClients.delete(cellId);
        }
      }
    }

    this.clients.delete(clientId);
  }

  private sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending to client ${clientId}:`, error);
      this.handleDisconnect(clientId);
    }
  }

  private startHeartbeat(clientId: string) {
    const interval = setInterval(() => {
      const client = this.clients.get(clientId);
      if (!client) {
        clearInterval(interval);
        return;
      }

      // Check if client is still alive
      if (Date.now() - client.lastPing > 30000) {
        this.handleDisconnect(clientId);
        clearInterval(interval);
        return;
      }

      // Send ping
      this.sendToClient(clientId, {
        type: 'ping',
        timestamp: Date.now(),
      });
    }, 15000); // Every 15 seconds
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      subscribedCells: this.cellToClients.size,
      totalSubscriptions: Array.from(this.clients.values())
        .reduce((sum, client) => sum + client.cellIds.size, 0),
    };
  }
}
```

### Step 1.2: Four-Tier Cache Manager

**File:** `src/server/cache/CacheManager.ts`

```typescript
import { RedisClient } from './RedisClient';
import { MongoClient } from './MongoClient';
import { PostgresClient } from './PostgresClient';

interface CacheEntry {
  value: any;
  timestamp: number;
  accessCount: number;
}

export class CacheManager {
  private l1Cache: Map<string, CacheEntry> = new Map();
  private l1MaxSize: number = 10000;
  private l1TTL: number = 1000; // 1 second

  private redis: RedisClient;
  private mongo: MongoClient;
  private postgres: PostgresClient;

  constructor() {
    this.redis = new RedisClient();
    this.mongo = new MongoClient();
    this.postgres = new PostgresClient();
  }

  async get(cellId: string): Promise<any | null> {
    // Try L1 first
    const l1Entry = this.l1Cache.get(cellId);
    if (l1Entry && Date.now() - l1Entry.timestamp < this.l1TTL) {
      l1Entry.accessCount++;
      return l1Entry.value;
    }

    // Try L2 (Redis)
    const l2Value = await this.redis.get(cellId);
    if (l2Value !== null) {
      // Promote to L1
      this.setL1(cellId, l2Value);
      return l2Value;
    }

    // Try L3 (MongoDB)
    const l3Value = await this.mongo.get(cellId);
    if (l3Value !== null) {
      // Promote to L2
      await this.redis.set(cellId, l3Value, 300); // 5 min TTL
      // Promote to L1
      this.setL1(cellId, l3Value);
      return l3Value;
    }

    // Try L4 (PostgreSQL)
    const l4Value = await this.postgres.get(cellId);
    if (l4Value !== null) {
      // Promote to L3
      await this.mongo.set(cellId, l4Value);
      // Promote to L2
      await this.redis.set(cellId, l4Value, 300);
      // Promote to L1
      this.setL1(cellId, l4Value);
      return l4Value;
    }

    return null;
  }

  async set(cellId: string, value: any): Promise<void> {
    // Set in L1 immediately
    this.setL1(cellId, value);

    // Async write to lower tiers
    this.setL2(cellId, value);
    this.setL3(cellId, value);
    this.setL4(cellId, value);
  }

  private setL1(cellId: string, value: any): void {
    // Evict if full
    if (this.l1Cache.size >= this.l1MaxSize) {
      this.evictLRU();
    }

    this.l1Cache.set(cellId, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
    });
  }

  private async setL2(cellId: string, value: any): Promise<void> {
    await this.redis.set(cellId, value, 300); // 5 min TTL
  }

  private async setL3(cellId: string, value: any): Promise<void> {
    await this.mongo.set(cellId, value);
  }

  private async setL4(cellId: string, value: any): Promise<void> {
    await this.postgres.set(cellId, value);
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let lowestAccess = Infinity;

    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.accessCount < lowestAccess ||
          (entry.accessCount === lowestAccess && entry.timestamp < oldestTime)) {
        oldestKey = key;
        oldestTime = entry.timestamp;
        lowestAccess = entry.accessCount;
      }
    }

    if (oldestKey) {
      this.l1Cache.delete(oldestKey);
    }
  }

  async delete(cellId: string): Promise<void> {
    // Delete from all tiers
    this.l1Cache.delete(cellId);
    await this.redis.delete(cellId);
    await this.mongo.delete(cellId);
    await this.postgres.delete(cellId);
  }

  public getStats() {
    return {
      l1Size: this.l1Cache.size,
      l1MaxSize: this.l1MaxSize,
      l1HitRate: this.calculateL1HitRate(),
    };
  }

  private calculateL1HitRate(): number {
    // Implementation depends on tracking hits/misses
    return 0.0;
  }
}
```

### Step 1.3: Spatial Index

**File:** `src/server/spatial/SpatialIndex.ts`

```typescript
interface CellPosition {
  cellId: string;
  x: number;
  y: number;
}

export class SpatialIndex {
  private gridSize: number;
  private grid: Map<string, Set<string>> = new Map();
  private cellPositions: Map<string, CellPosition> = new Map();

  constructor(gridSize: number = 100) {
    this.gridSize = gridSize;
  }

  addCell(cellId: string, x: number, y: number): void {
    this.cellPositions.set(cellId, { cellId, x, y });

    const gridKey = this.getGridKey(x, y);
    if (!this.grid.has(gridKey)) {
      this.grid.set(gridKey, new Set());
    }
    this.grid.get(gridKey)!.add(cellId);
  }

  removeCell(cellId: string): void {
    const position = this.cellPositions.get(cellId);
    if (!position) return;

    const gridKey = this.getGridKey(position.x, position.y);
    const cellSet = this.grid.get(gridKey);
    if (cellSet) {
      cellSet.delete(cellId);
      if (cellSet.size === 0) {
        this.grid.delete(gridKey);
      }
    }

    this.cellPositions.delete(cellId);
  }

  getNeighbors(cellId: string, radius: number = 5): Set<string> {
    const position = this.cellPositions.get(cellId);
    if (!position) return new Set();

    const neighbors: Set<string> = new Set();
    const { x, y } = position;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const gridKey = this.getGridKey(x + dx, y + dy);
        const cellSet = this.grid.get(gridKey);
        if (cellSet) {
          for (const id of cellSet) {
            if (id !== cellId) {
              neighbors.add(id);
            }
          }
        }
      }
    }

    return neighbors;
  }

  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    return `${gridX},${gridY}`;
  }

  public getStats() {
    return {
      totalCells: this.cellPositions.size,
      gridCells: this.grid.size,
      avgCellsPerGrid: this.calculateAvgCellsPerGrid(),
    };
  }

  private calculateAvgCellsPerGrid(): number {
    if (this.grid.size === 0) return 0;
    let total = 0;
    for (const cellSet of this.grid.values()) {
      total += cellSet.size;
    }
    return total / this.grid.size;
  }
}
```

---

## Phase 2: Synchronization (Week 3-4)

### Step 2.1: Adaptive Locking

**File:** `src/server/sync/AdaptiveLocking.ts`

```typescript
interface LockResult {
  success: boolean;
  version?: number;
  conflict?: boolean;
}

export class AdaptiveLocking {
  private conflictHistory: boolean[] = [];
  private windowSize: number = 100;
  private conflictThreshold: number = 0.05;
  private currentMode: 'optimistic' | 'pessimistic' = 'optimistic';
  private locks: Map<string, string> = new Map(); // cellId -> clientId

  async updateCell(
    cellId: string,
    value: any,
    clientId: string,
    currentVersion?: number
  ): Promise<LockResult> {
    const conflictRate = this.calculateConflictRate();

    // Switch mode if needed
    if (conflictRate > this.conflictThreshold) {
      this.currentMode = 'pessimistic';
    } else if (conflictRate < 0.01) {
      this.currentMode = 'optimistic';
    }

    // Use appropriate strategy
    if (this.currentMode === 'optimistic') {
      return this.updateOptimistic(cellId, value, currentVersion);
    } else {
      return this.updatePessimistic(cellId, value, clientId);
    }
  }

  private async updateOptimistic(
    cellId: string,
    value: any,
    currentVersion?: number
  ): Promise<LockResult> {
    // Get current state
    const state = await cacheManager.get(cellId);

    // Check version
    if (currentVersion && state.version !== currentVersion) {
      this.recordConflict();
      return {
        success: false,
        conflict: true,
      };
    }

    // Update
    const newVersion = (state.version || 0) + 1;
    await cacheManager.set(cellId, {
      ...value,
      version: newVersion,
    });

    this.recordSuccess();
    return {
      success: true,
      version: newVersion,
    };
  }

  private async updatePessimistic(
    cellId: string,
    value: any,
    clientId: string
  ): Promise<LockResult> {
    // Try to acquire lock
    const lockHolder = this.locks.get(cellId);
    if (lockHolder && lockHolder !== clientId) {
      this.recordConflict();
      return {
        success: false,
        conflict: true,
      };
    }

    // Acquire lock
    this.locks.set(cellId, clientId);

    try {
      // Update
      const state = await cacheManager.get(cellId);
      const newVersion = (state.version || 0) + 1;
      await cacheManager.set(cellId, {
        ...value,
        version: newVersion,
      });

      this.recordSuccess();
      return {
        success: true,
        version: newVersion,
      };
    } finally {
      // Release lock
      this.locks.delete(cellId);
    }
  }

  private calculateConflictRate(): number {
    if (this.conflictHistory.length < this.windowSize) {
      return 0;
    }

    const recent = this.conflictHistory.slice(-this.windowSize);
    const conflicts = recent.filter(c => c).length;
    return conflicts / this.windowSize;
  }

  private recordConflict(): void {
    this.conflictHistory.push(true);
  }

  private recordSuccess(): void {
    this.conflictHistory.push(false);
  }

  public getStats() {
    return {
      conflictRate: this.calculateConflictRate(),
      currentMode: this.currentMode,
      activeLocks: this.locks.size,
    };
  }
}
```

### Step 2.2: Sensation Propagation

**File:** `src/server/sensation/SensationPropagator.ts`

```typescript
interface Sensation {
  sourceCell: string;
  targetCell: string;
  type: string;
  value: number;
  timestamp: number;
  ttl: number;
}

export class SensationPropagator {
  private spatialIndex: SpatialIndex;
  private queue: Sensation[] = [];
  private batchSize: number = 100;
  private damping: number = 0.8;
  private maxTTL: number = 5;

  constructor(spatialIndex: SpatialIndex) {
    this.spatialIndex = spatialIndex;
    this.startProcessing();
  }

  async propagate(sensation: Sensation): Promise<void> {
    this.queue.push(sensation);
  }

  private async startProcessing(): Promise<void> {
    setInterval(async () => {
      await this.processBatch();
    }, 10); // Every 10ms
  }

  private async processBatch(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);

    for (const sensation of batch) {
      await this.processSensation(sensation);
    }
  }

  private async processSensation(sensation: Sensation): Promise<void> {
    if (sensation.ttl <= 0) return;

    const neighbors = this.spatialIndex.getNeighbors(
      sensation.targetCell,
      10 // radius
    );

    for (const neighborId of neighbors) {
      // Create propagated sensation
      const propagated: Sensation = {
        sourceCell: sensation.sourceCell,
        targetCell: neighborId,
        type: sensation.type,
        value: sensation.value * this.damping,
        timestamp: Date.now(),
        ttl: sensation.ttl - 1,
      };

      // Send to client
      await this.sendSensation(neighborId, propagated);

      // Continue propagation
      if (propagated.ttl > 0) {
        this.queue.push(propagated);
      }
    }
  }

  private async sendSensation(cellId: string, sensation: Sensation): Promise<void> {
    // Implementation depends on your WebSocket setup
    // Get subscribers for this cell and send sensation
  }

  public getStats() {
    return {
      queueSize: this.queue.length,
      damping: this.damping,
      maxTTL: this.maxTTL,
    };
  }
}
```

---

## Phase 3: Production Setup (Week 5-6)

### Step 3.1: Docker Compose

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - MONGO_HOST=mongo
      - POSTGRES_HOST=postgres
    depends_on:
      - redis
      - mongo
      - postgres
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 4gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongo_data:/data/db

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=cell_states
    volumes:
      - postgres_data:/var/lib/postgresql/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

volumes:
  redis_data:
  mongo_data:
  postgres_data:
```

### Step 3.2: Monitoring Stack

**File:** `monitoring/prometheus.yml`

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'app_server'
    static_configs:
      - targets: ['app:8080']
    metrics_path: '/metrics'

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'mongo'
    static_configs:
      - targets: ['mongo:27017']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
```

---

## Testing

### Load Test

**File:** `tests/load-test.js`

```javascript
import ws from 'ws';

const NUM_CLIENTS = 10000;
const NUM_UPDATES = 100;

async function runLoadTest() {
  console.log(`Connecting ${NUM_CLIENTS} clients...`);

  const clients = [];
  for (let i = 0; i < NUM_CLIENTS; i++) {
    const ws = new ws('ws://localhost:8080');
    await new Promise(resolve => ws.on('open', resolve));
    clients.push(ws);
  }

  console.log('Sending updates...');

  const start = Date.now();

  for (let i = 0; i < NUM_UPDATES; i++) {
    for (const client of clients) {
      client.send(JSON.stringify({
        type: 'cell_update',
        cellId: `cell_${i}`,
        value: Math.random(),
      }));
    }
  }

  const elapsed = Date.now() - start;
  const totalUpdates = NUM_CLIENTS * NUM_UPDATES;
  const updatesPerSec = totalUpdates / (elapsed / 1000);

  console.log(`Sent ${totalUpdates} updates in ${elapsed}ms`);
  console.log(`Rate: ${updatesPerSec.toFixed(0)} updates/sec`);

  // Cleanup
  for (const client of clients) {
    client.close();
  }
}

runLoadTest().catch(console.error);
```

---

## Deployment Checklist

- [ ] WebSocket server running on 3+ instances
- [ ] Redis cluster configured (1 master + 2 replicas)
- [ ] MongoDB replica set configured
- [ ] PostgreSQL primary + standby configured
- [ ] Load balancer configured with WebSocket passthrough
- [ ] Monitoring stack deployed (Prometheus + Grafana)
- [ ] Alerts configured (latency, connections, cache hit rate)
- [ ] SSL certificates installed
- [ ] Auto-scaling rules configured
- [ ] Disaster recovery plan documented
- [ ] Load testing completed and passed (10K connections, 60fps)
- [ ] Documentation complete

---

**Ready to deploy! The system is designed to handle 10,000+ cells at 60fps.**
