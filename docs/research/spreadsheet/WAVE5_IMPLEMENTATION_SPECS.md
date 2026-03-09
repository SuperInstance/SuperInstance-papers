# Wave 5 Implementation Specifications

**Technical Deep-Dive for Real-Time Cell Communication Protocols**

---

## Table of Contents

1. [WebSocket Architecture](#websocket-architecture)
2. [Cell Whisper Implementation](#cell-whisper-implementation)
3. [Quantum Entanglement Implementation](#quantum-entanglement-implementation)
4. [Consciousness Stream Implementation](#consciousness-stream-implementation)
5. [State Synchronization Strategy](#state-synchronization-strategy)
6. [API Design](#api-design)
7. [Performance Optimization](#performance-optimization)

---

## WebSocket Architecture

### Connection Management

```typescript
// src/spreadsheet/api/WebSocketManager.ts

interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  heartbeatInterval: number;
  maxReconnectAttempts: number;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: CellMessage[] = [];
  private subscribers: Map<string, Set<WebSocketHandler>> = new Map();

  connect(): void {
    this.ws = new WebSocket(this.config.url);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.flushQueue();
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const message: CellMessage = JSON.parse(event.data);
      this.routeMessage(message);
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }

  // Route message to subscribers
  private routeMessage(message: CellMessage): void {
    const handlers = this.subscribers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  // Subscribe to message type
  subscribe(messageType: string, handler: WebSocketHandler): () => void {
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, new Set());
    }
    this.subscribers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(messageType)!.delete(handler);
    };
  }

  // Send message (queue if not connected)
  send(message: CellMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()!;
      this.ws.send(JSON.stringify(message));
    }
  }
}
```

### Message Protocol

```typescript
// src/spreadsheet/api/protocol.ts

enum CellMessageType {
  // Cell lifecycle
  CELL_ACTIVATED = 'cell_activated',
  CELL_DEACTIVATED = 'cell_deactivated',
  CELL_STATE_CHANGE = 'cell_state_change',

  // Sensation system
  SENSATION_TRIGGERED = 'sensation_triggered',
  SENSATION_BATCH = 'sensation_batch',

  // Whisper protocol
  WHISPER_BROADCAST = 'whisper_broadcast',
  WHISPER_RECEIVE = 'whisper_receive',

  // Entanglement
  ENTANGLE_CREATE = 'entangle_create',
  ENTANGLE_BREAK = 'entangle_break',
  ENTANGLE_SYNC = 'entangle_sync',

  // Consciousness
  CONSCIOUSNESS_UPDATE = 'consciousness_update',
  CONSCIOUSNESS_QUERY = 'consciousness_query',

  // Memory
  MEMORY_REMEMBER = 'memory_remember',
  MEMORY_RECALL = 'memory_recall',
  MEMORY_FORGET = 'memory_forget',

  // Attention
  ATTENTION_REQUEST = 'attention_request',
  ATTENTION_ALLOCATE = 'attention_allocate',
  ATTENTION_RELEASE = 'attention_release',

  // Pulse
  PULSE_TRANSMIT = 'pulse_transmit',
  PULSE_RECEIVE = 'pulse_receive',
}

interface CellMessage {
  type: CellMessageType;
  cellId: string;
  timestamp: number;
  messageId: string;
  payload: unknown;
}

// Message factory
class MessageFactory {
  static create(type: CellMessageType, cellId: string, payload: unknown): CellMessage {
    return {
      type,
      cellId,
      timestamp: Date.now(),
      messageId: uuid(),
      payload,
    };
  }
}
```

---

## Cell Whisper Implementation

### Core Whisper System

```typescript
// src/spreadsheet/communication/WhisperSystem.ts

interface WhisperConfig {
  radius: number;           // Neighborhood radius (cells)
  ttl: number;             // Time-to-live (hops)
  decay: number;           // Confidence decay per hop
  propagationDelay: number; // Milliseconds between hops
}

interface WhisperMessage {
  id: string;
  sourceCell: CellId;
  topic: SensationType;
  magnitude: number;
  timestamp: number;
  hops: number;
  visited: Set<CellId>;
  confidence: number;
}

class WhisperSystem {
  private config: WhisperConfig;
  private wsManager: WebSocketManager;
  private cellRegistry: CellRegistry;
  private pendingWhispers: Map<string, WhisperMessage> = new Map();

  constructor(config: WhisperConfig, wsManager: WebSocketManager) {
    this.config = config;
    this.wsManager = wsManager;
    this.cellRegistry = CellRegistry.getInstance();

    // Subscribe to sensation events
    wsManager.subscribe(CellMessageType.SENSATION_TRIGGERED, (msg) => {
      this.onSensationTriggered(msg);
    });

    // Subscribe to whisper receives
    wsManager.subscribe(CellMessageType.WHISPER_RECEIVE, (msg) => {
      this.onWhisperReceive(msg);
    });
  }

  // Cell detects a sensation
  private onSensationTriggered(message: CellMessage): void {
    const sensation = message.payload as Sensation;

    // Create whisper
    const whisper: WhisperMessage = {
      id: uuid(),
      sourceCell: sensation.source,
      topic: sensation.type,
      magnitude: sensation.value,
      timestamp: Date.now(),
      hops: 0,
      visited: new Set([sensation.source]),
      confidence: sensation.confidence,
    };

    // Propagate to neighborhood
    this.propagateWhisper(whisper);
  }

  // Propagate whisper to neighbors
  private propagateWhisper(whisper: WhisperMessage): void {
    if (whisper.hops >= this.config.ttl) {
      return; // Reached max hops
    }

    if (whisper.confidence < 0.1) {
      return; // Too weak
    }

    const sourceCell = this.cellRegistry.get(whisper.sourceCell);
    if (!sourceCell) return;

    // Get neighbors within radius
    const neighbors = this.getNeighbors(sourceCell, this.config.radius);

    for (const neighbor of neighbors) {
      if (whisper.visited.has(neighbor.id)) {
        continue; // Already visited
      }

      // Send whisper to neighbor
      const message = MessageFactory.create(
        CellMessageType.WHISPER_RECEIVE,
        whisper.sourceCell,
        whisper
      );
      this.wsManager.send(message);

      // Mark as visited
      whisper.visited.add(neighbor.id);
    }

    // Schedule next hop
    setTimeout(() => {
      whisper.hops++;
      whisper.confidence *= this.config.decay;
      this.propagateWhisper(whisper);
    }, this.config.propagationDelay);
  }

  // Cell receives a whisper
  private onWhisperReceive(message: CellMessage): void {
    const whisper = message.payload as WhisperMessage;
    const targetCell = this.cellRegistry.get(message.cellId);

    if (!targetCell) return;

    // Check if cell is interested in this sensation type
    const head = targetCell.head;
    if (!head.isWatching(whisper.topic)) {
      return; // Not interested
    }

    // Check threshold
    if (Math.abs(whisper.magnitude) < head.getThreshold(whisper.topic)) {
      return; // Below threshold
    }

    // Deliver sensation
    head.receiveSensation({
      source: whisper.sourceCell,
      type: whisper.topic,
      value: whisper.magnitude,
      timestamp: whisper.timestamp,
      confidence: whisper.confidence,
    });
  }

  // Get neighbors within radius
  private getNeighbors(cell: LogCell, radius: number): LogCell[] {
    const neighbors: LogCell[] = [];
    const pos = cell.position;

    for (let dRow = -radius; dRow <= radius; dRow++) {
      for (let dCol = -radius; dCol <= radius; dCol++) {
        if (dRow === 0 && dCol === 0) continue; // Skip self

        const neighborPos = {
          row: pos.row + dRow,
          col: pos.col + dCol,
        };

        const neighbor = this.cellRegistry.getByPosition(neighborPos);
        if (neighbor) {
          neighbors.push(neighbor);
        }
      }
    }

    return neighbors;
  }
}
```

### Performance Optimization

```typescript
// Spatial indexing for efficient neighbor lookup

class SpatialIndex {
  private grid: Map<string, Set<CellId>> = new Map();
  private cellSize: number; // Size of each grid cell

  constructor(cellSize: number = 10) {
    this.cellSize = cellSize;
  }

  // Add cell to spatial index
  add(cell: LogCell): void {
    const key = this.getGridKey(cell.position);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(cell.id);
  }

  // Remove cell from spatial index
  remove(cell: LogCell): void {
    const key = this.getGridKey(cell.position);
    this.grid.get(key)?.delete(cell.id);
  }

  // Get cells within radius
  query(position: CellPosition, radius: number): CellId[] {
    const results: CellId[] = [];
    const centerKey = this.getGridKey(position);
    const [centerRow, centerCol] = centerKey.split(',').map(Number);

    // Calculate grid cell range
    const gridRadius = Math.ceil(radius / this.cellSize);

    for (let dRow = -gridRadius; dRow <= gridRadius; dRow++) {
      for (let dCol = -gridRadius; dCol <= gridRadius; dCol++) {
        const key = `${centerRow + dRow},${centerCol + dCol}`;
        const cellIds = this.grid.get(key);
        if (cellIds) {
          results.push(...cellIds);
        }
      }
    }

    return results;
  }

  private getGridKey(position: CellPosition): string {
    const row = Math.floor(position.row / this.cellSize);
    const col = Math.floor(position.col / this.cellSize);
    return `${row},${col}`;
  }
}
```

---

## Quantum Entanglement Implementation

### Entanglement Registry

```typescript
// src/spreadsheet/communication/EntanglementRegistry.ts

interface EntangledPair {
  id: string;
  cellA: CellId;
  cellB: CellId;
  strength: number;       // 0-1, coupling strength
  syncMode: 'state' | 'value' | 'derivative';
  createdAt: number;
  lastSync: number;
}

class EntanglementRegistry {
  private pairs: Map<string, EntangledPair> = new Map();
  private cellToPair: Map<CellId, Set<string>> = new Map();
  private wsManager: WebSocketManager;
  private cellRegistry: CellRegistry;

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    this.cellRegistry = CellRegistry.getInstance();

    // Subscribe to cell changes
    wsManager.subscribe(CellMessageType.CELL_STATE_CHANGE, (msg) => {
      this.onCellChange(msg);
    });

    // Subscribe to entanglement commands
    wsManager.subscribe(CellMessageType.ENTANGLE_CREATE, (msg) => {
      this.onCreateEntanglement(msg);
    });

    wsManager.subscribe(CellMessageType.ENTANGLE_BREAK, (msg) => {
      this.onBreakEntanglement(msg);
    });
  }

  // Create entanglement
  createEntanglement(
    cellA: CellId,
    cellB: CellId,
    syncMode: EntangledPair['syncMode'] = 'value',
    strength: number = 1.0
  ): string {
    const pair: EntangledPair = {
      id: uuid(),
      cellA,
      cellB,
      strength,
      syncMode,
      createdAt: Date.now(),
      lastSync: Date.now(),
    };

    this.pairs.set(pair.id, pair);

    // Update cell-to-pair mapping
    if (!this.cellToPair.has(cellA)) {
      this.cellToPair.set(cellA, new Set());
    }
    if (!this.cellToPair.has(cellB)) {
      this.cellToPair.set(cellB, new Set());
    }
    this.cellToPair.get(cellA)!.add(pair.id);
    this.cellToPair.get(cellB)!.add(pair.id);

    // Notify clients
    const message = MessageFactory.create(
      CellMessageType.ENTANGLE_CREATE,
      cellA,
      { pairId: pair.id, cellA, cellB, syncMode, strength }
    );
    this.wsManager.send(message);

    return pair.id;
  }

  // Break entanglement
  breakEntanglement(pairId: string): void {
    const pair = this.pairs.get(pairId);
    if (!pair) return;

    // Remove from cell-to-pair mapping
    this.cellToPair.get(pair.cellA)?.delete(pairId);
    this.cellToPair.get(pair.cellB)?.delete(pairId);

    // Remove pair
    this.pairs.delete(pairId);

    // Notify clients
    const message = MessageFactory.create(
      CellMessageType.ENTANGLE_BREAK,
      pair.cellA,
      { pairId }
    );
    this.wsManager.send(message);
  }

  // Handle cell change
  private onCellChange(message: CellMessage): void {
    const { cellId, payload } = message;
    const pairIds = this.cellToPair.get(cellId);

    if (!pairIds || pairIds.size === 0) return;

    for (const pairId of pairIds) {
      const pair = this.pairs.get(pairId);
      if (!pair) continue;

      const partnerId = pair.cellA === cellId ? pair.cellB : pair.cellA;
      const partner = this.cellRegistry.get(partnerId);

      if (!partner) continue;

      // Sync based on mode
      const syncPayload = this.calculateSync(pair, payload);

      const syncMessage = MessageFactory.create(
        CellMessageType.ENTANGLE_SYNC,
        partnerId,
        {
          pairId,
          sourceId: cellId,
          ...syncPayload,
        }
      );
      this.wsManager.send(syncMessage);

      pair.lastSync = Date.now();
    }
  }

  // Calculate synchronized value
  private calculateSync(pair: EntangledPair, payload: unknown): unknown {
    const currentValue = (payload as any).value;

    switch (pair.syncMode) {
      case 'state':
        return { state: (payload as any).state };

      case 'value':
        return { value: currentValue };

      case 'derivative':
        // Get partner's current value
        const partner = this.cellRegistry.get(pair.cellB);
        const partnerValue = partner?.value || 0;
        const delta = (currentValue - partnerValue) * pair.strength;
        return { value: partnerValue + delta, delta };

      default:
        return { value: currentValue };
    }
  }

  // Get entanglements for a cell
  getEntanglements(cellId: CellId): EntangledPair[] {
    const pairIds = this.cellToPair.get(cellId) || new Set();
    return Array.from(pairIds)
      .map(id => this.pairs.get(id))
      .filter((p): p is EntangledPair => p !== undefined);
  }
}
```

---

## Consciousness Stream Implementation

### Stream Generation

```typescript
// src/spreadsheet/consciousness/ConsciousnessStream.ts

interface ConsciousnessEntry {
  timestamp: number;
  type: 'perception' | 'feeling' | 'thought' | 'action';
  content: string;
  confidence: number;
  emotionalTone: 'alert' | 'calm' | 'excited' | 'confused' | 'bored';
  metadata?: Record<string, unknown>;
}

class ConsciousnessStream {
  private cellId: CellId;
  private entries: ConsciousnessEntry[] = [];
  private maxEntries: number = 1000; // Circular buffer
  private summary: string = '';
  private wsManager: WebSocketManager;

  constructor(cellId: CellId, wsManager: WebSocketManager) {
    this.cellId = cellId;
    this.wsManager = wsManager;

    // Subscribe to cell events
    wsManager.subscribe(CellMessageType.CELL_STATE_CHANGE, (msg) => {
      if (msg.cellId === cellId) {
        this.onStateChange(msg);
      }
    });
  }

  // Record an experience
  experience(
    type: ConsciousnessEntry['type'],
    content: string,
    confidence: number = 1,
    metadata?: Record<string, unknown>
  ): void {
    const entry: ConsciousnessEntry = {
      timestamp: Date.now(),
      type,
      content,
      confidence,
      emotionalTone: this.calculateEmotionalTone(),
      metadata,
    };

    this.addEntry(entry);

    // Broadcast update
    const message = MessageFactory.create(
      CellMessageType.CONSCIOUSNESS_UPDATE,
      this.cellId,
      { entry }
    );
    this.wsManager.send(message);
  }

  // Add entry to circular buffer
  private addEntry(entry: ConsciousnessEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Update summary every 100 entries
    if (this.entries.length % 100 === 0) {
      this.updateSummary();
    }
  }

  // Generate first-person narrative
  private generateNarration(event: CellEvent): string {
    const templates = {
      sensation: [
        "I feel {source} changing {type} by {magnitude}",
        "I notice {source} is {magnitude} more {type}",
        "{source} feels {magnitude} in {type}",
      ],
      processing: [
        "I'm thinking about {input}, my confidence is {confidence}",
        "Considering {input}, I'm {confidence}% sure",
        "Analyzing {input} with {confidence} confidence",
      ],
      output: [
        "I decided to output {value} because {reasoning}",
        "Based on my analysis, I chose {value}",
        "I'm {confidence}% confident in {value}",
      ],
      error: [
        "I'm confused: {error}",
        "Something went wrong: {error}",
        "I don't understand: {error}",
      ],
    };

    const templateList = templates[event.type] || templates.processing;
    const template = templateList[Math.floor(Math.random() * templateList.length)];

    return template.replace(/\{(\w+)\}/g, (_, key) => {
      return String(event[key] || `[${key}]`);
    });
  }

  // Calculate emotional tone based on recent entries
  private calculateEmotionalTone(): ConsciousnessEntry['emotionalTone'] {
    if (this.entries.length < 5) return 'calm';

    const recent = this.entries.slice(-10);
    const errorCount = recent.filter(e => e.type === 'error').length;
    const actionCount = recent.filter(e => e.type === 'action').length;
    const avgConfidence = recent.reduce((sum, e) => sum + e.confidence, 0) / recent.length;

    if (errorCount > 3) return 'confused';
    if (actionCount > 5) return 'excited';
    if (avgConfidence < 0.5) return 'bored';
    if (avgConfidence > 0.9) return 'alert';
    return 'calm';
  }

  // Update summary (periodic)
  private updateSummary(): void {
    // Use LLM to generate summary or use simple heuristic
    const recent = this.entries.slice(-100);

    const typeCounts = recent.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'processing';

    const avgConfidence = recent.reduce((sum, e) => sum + e.confidence, 0) / recent.length;

    this.summary = `I've been mostly ${dominantType}, with ${avgConfidence.toFixed(2)} avg confidence.`;
  }

  // Query consciousness
  recall(query: string, timeWindow?: { start: number; end: number }): ConsciousnessEntry[] {
    let entries = this.entries;

    if (timeWindow) {
      entries = entries.filter(e =>
        e.timestamp >= timeWindow.start &&
        e.timestamp <= timeWindow.end
      );
    }

    // Simple text search (can be enhanced with embeddings)
    const queryLower = query.toLowerCase();
    return entries.filter(e =>
      e.content.toLowerCase().includes(queryLower) ||
      e.type.toLowerCase().includes(queryLower)
    );
  }

  // Get recent entries
  getRecent(count: number = 10): ConsciousnessEntry[] {
    return this.entries.slice(-count);
  }

  // Get summary
  getSummary(): string {
    return this.summary;
  }
}
```

---

## State Synchronization Strategy

### Optimistic Updates

```typescript
// src/spreadsheet/sync/StateSync.ts

interface StateUpdate {
  cellId: CellId;
  version: number;
  state: CellState;
  value: unknown;
  timestamp: number;
}

class StateSync {
  private wsManager: WebSocketManager;
  private pendingUpdates: Map<CellId, StateUpdate> = new Map();
  private confirmedVersions: Map<CellId, number> = new Map();
  private cellRegistry: CellRegistry;

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    this.cellRegistry = CellRegistry.getInstance();

    // Subscribe to state updates
    wsManager.subscribe(CellMessageType.CELL_STATE_CHANGE, (msg) => {
      this.onRemoteStateChange(msg);
    });
  }

  // Optimistic update (local)
  optimisticUpdate(cellId: CellId, update: Partial<StateUpdate>): void {
    const cell = this.cellRegistry.get(cellId);
    if (!cell) return;

    const currentVersion = this.confirmedVersions.get(cellId) || 0;
    const newUpdate: StateUpdate = {
      cellId,
      version: currentVersion + 1,
      state: update.state || cell.state,
      value: update.value !== undefined ? update.value : cell.value,
      timestamp: Date.now(),
    };

    // Apply locally immediately
    this.applyUpdate(newUpdate);

    // Store as pending
    this.pendingUpdates.set(cellId, newUpdate);

    // Send to server
    const message = MessageFactory.create(
      CellMessageType.CELL_STATE_CHANGE,
      cellId,
      newUpdate
    );
    this.wsManager.send(message);
  }

  // Handle remote state change
  private onRemoteStateChange(message: CellMessage): void {
    const update = message.payload as StateUpdate;

    // Check version
    const confirmedVersion = this.confirmedVersions.get(update.cellId) || 0;
    const pendingUpdate = this.pendingUpdates.get(update.cellId);

    if (pendingUpdate && pendingUpdate.version > update.version) {
      // Our pending update is newer, ignore remote
      return;
    }

    // Apply remote update
    this.applyUpdate(update);

    // Mark as confirmed
    this.confirmedVersions.set(update.cellId, update.version);
    this.pendingUpdates.delete(update.cellId);
  }

  // Apply update to cell
  private applyUpdate(update: StateUpdate): void {
    const cell = this.cellRegistry.get(update.cellId);
    if (!cell) return;

    cell.state = update.state;
    cell.value = update.value;
    cell.lastUpdate = update.timestamp;
  }

  // Resolve conflicts (last-write-wins with version check)
  resolveConflict(cellId: CellId, remoteUpdate: StateUpdate): void {
    const pendingUpdate = this.pendingUpdates.get(cellId);

    if (!pendingUpdate) {
      this.applyUpdate(remoteUpdate);
      return;
    }

    // Compare timestamps
    if (remoteUpdate.timestamp > pendingUpdate.timestamp) {
      // Remote is newer
      this.applyUpdate(remoteUpdate);
      this.pendingUpdates.delete(cellId);
    } else {
      // Local is newer, re-send
      const message = MessageFactory.create(
        CellMessageType.CELL_STATE_CHANGE,
        cellId,
        pendingUpdate
      );
      this.wsManager.send(message);
    }
  }
}
```

### Batching Strategy

```typescript
// src/spreadsheet/sync/BatchSync.ts

interface BatchConfig {
  maxBatchSize: number;
  maxBatchDelay: number; // milliseconds
}

class BatchSync {
  private config: BatchConfig;
  private batch: CellMessage[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private wsManager: WebSocketManager;

  constructor(config: BatchConfig, wsManager: WebSocketManager) {
    this.config = config;
    this.wsManager = wsManager;
  }

  // Add message to batch
  add(message: CellMessage): void {
    this.batch.push(message);

    // Send immediately if batch is full
    if (this.batch.length >= this.config.maxBatchSize) {
      this.flush();
      return;
    }

    // Set timer if not already set
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flush();
      }, this.config.maxBatchDelay);
    }
  }

  // Flush batch to server
  private flush(): void {
    if (this.batch.length === 0) return;

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Send batch
    const batchMessage = MessageFactory.create(
      CellMessageType.SENSATION_BATCH,
      'system',
      { messages: this.batch }
    );
    this.wsManager.send(batchMessage);

    // Clear batch
    this.batch = [];
  }

  // Force flush (e.g., on disconnect)
  forceFlush(): void {
    this.flush();
  }
}
```

---

## API Design

### REST Endpoints

```typescript
// src/spreadsheet/api/routes.ts

import express from 'express';

const router = express.Router();

// Cell inspection
router.get('/api/cells/:id/consciousness', async (req, res) => {
  const cell = await cellRegistry.get(req.params.id);
  const consciousness = cell.getConsciousness();

  res.json({
    entries: consciousness.getRecent(50),
    summary: consciousness.getSummary(),
  });
});

router.get('/api/cells/:id/sensations', async (req, res) => {
  const cell = await cellRegistry.get(req.params.id);
  const sensations = cell.getSensations({
    limit: parseInt(req.query.limit as string) || 100,
    type: req.query.type as SensationType,
  });

  res.json({ sensations });
});

router.get('/api/cells/:id/attention', async (req, res) => {
  const cell = await cellRegistry.get(req.params.id);
  const attention = cell.getAttentionAllocation();

  res.json({ attention });
});

// Cell control
router.post('/api/cells/:id/entangle', async (req, res) => {
  const { targetCellId, syncMode, strength } = req.body;

  const pairId = entanglementRegistry.createEntanglement(
    req.params.id,
    targetCellId,
    syncMode,
    strength
  );

  res.json({ pairId });
});

router.post('/api/cells/:id/whisper', async (req, res) => {
  const { topic, magnitude } = req.body;

  whisperSystem.whisper(req.params.id, topic, magnitude);

  res.json({ success: true });
});

router.post('/api/cells/:id/remember', async (req, res) => {
  const { data, context } = req.body;

  const memoryId = await memoryPalace.remember(req.params.id, data, context);

  res.json({ memoryId });
});

// Grid operations
router.get('/api/grid/diffusion', async (req, res) => {
  const diffusion = await diffusionSystem.getState();

  res.json({ diffusion });
});

router.get('/api/grid/pulses', async (req, res) => {
  const pulses = await pulseSystem.getActivePulses();

  res.json({ pulses });
});

router.post('/api/grid/highway', async (req, res) => {
  const { path, velocity } = req.body;

  const highwayId = await pulseSystem.createHighway(path, velocity);

  res.json({ highwayId });
});

export default router;
```

---

## Performance Optimization

### Message Compression

```typescript
// src/spreadsheet/api/Compression.ts

import zlib from 'zlib';

class MessageCompressor {
  // Compress batch of messages
  static compressBatch(messages: CellMessage[]): Buffer {
    const json = JSON.stringify(messages);
    return zlib.gzipSync(json);
  }

  // Decompress batch
  static decompressBatch(buffer: Buffer): CellMessage[] {
    const json = zlib.gunzipSync(buffer).toString();
    return JSON.parse(json);
  }

  // Compress single message (only if large)
  static compressIfLarge(message: CellMessage): CellMessage | { compressed: true, data: Buffer } {
    const json = JSON.stringify(message);
    const size = Buffer.byteLength(json);

    if (size > 1024) { // 1KB threshold
      return {
        compressed: true,
        data: zlib.gzipSync(json),
      };
    }

    return message;
  }
}
```

### Cell Virtualization

```typescript
// src/spreadsheet/ui/CellVirtualization.ts

interface VirtualGridConfig {
  viewportRows: number;
  viewportCols: number;
  bufferRows: number;
  bufferCols: number;
}

class CellVirtualizer {
  private config: VirtualGridConfig;
  private visibleCells: Set<CellId> = new Set();
  private activeCells: Set<CellId> = new Set();

  constructor(config: VirtualGridConfig) {
    this.config = config;
  }

  // Update visible cells based on scroll position
  updateVisible(scrollRow: number, scrollCol: number): void {
    const newVisible = new Set<CellId>();

    for (let row = scrollRow; row < scrollRow + this.config.viewportRows; row++) {
      for (let col = scrollCol; col < scrollCol + this.config.viewportCols; col++) {
        const cellId = `${String.fromCharCode(65 + col)}${row + 1}`;
        newVisible.add(cellId);
      }
    }

    // Activate newly visible cells
    for (const cellId of newVisible) {
      if (!this.visibleCells.has(cellId)) {
        this.activateCell(cellId);
      }
    }

    // Deactivate no-longer-visible cells
    for (const cellId of this.visibleCells) {
      if (!newVisible.has(cellId)) {
        this.deactivateCell(cellId);
      }
    }

    this.visibleCells = newVisible;
  }

  private activateCell(cellId: CellId): void {
    const cell = cellRegistry.get(cellId);
    if (cell) {
      cell.activate();
      this.activeCells.add(cellId);
    }
  }

  private deactivateCell(cellId: CellId): void {
    const cell = cellRegistry.get(cellId);
    if (cell) {
      cell.deactivate();
      this.activeCells.delete(cellId);
    }
  }

  getActiveCells(): Set<CellId> {
    return this.activeCells;
  }
}
```

---

**Document Version**: 1.0
**Created**: 2026-03-09
**Status**: ✅ Complete - Ready for Implementation
**Dependencies**: WAVE5_CREATIVE_INSIGHTS.md

---

*"These specifications transform abstract insights into concrete implementations. The future is living, breathing cells."*
