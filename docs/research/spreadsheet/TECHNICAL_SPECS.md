# POLLN Spreadsheet Integration - Technical Specifications

**Version:** 1.0
**Date:** 2025-01-10
**Status:** MVP Specification
**Author:** Technical Implementer

---

## Executive Summary

This document defines the technical architecture for integrating POLLN (Pattern-Organized Large Language Network) with spreadsheet platforms (Excel, Google Sheets, Airtable). The system enables users to spawn intelligent agents as spreadsheet formulas that can reason, communicate, and optimize over time.

**Key Design Principles:**
1. **Speed First:** Initial response < 2s, updates < 500ms
2. **Inspectable:** Every decision is traceable via A2A packages
3. **Secure:** User data isolation, sandboxed execution
4. **Incremental:** Start with simple distillation, evolve to full colonies

---

## 1. Core Components Architecture

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Spreadsheet Platform                      │
│  (Excel / Google Sheets / Airtable - TBD by MVP Planner)    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Spreadsheet Bridge Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Formula   │  │   Script    │  │   Plugin    │         │
│  │  Parser     │  │   Handler   │  │  Loader     │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               POLLN Spreadsheet Adapter                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Agent     │  │   Cell      │  │  State      │         │
│  │  Lifecycle  │  │  Binding    │  │ Persistence │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    POLLN Core Library                        │
│  (Agents, Colonies, Dreaming, A2A, Plinko, WorldModel)      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Specifications

#### 1.2.1 Spreadsheet Bridge Layer

**Purpose:** Platform-specific integration (Excel JS API, Google Sheets Apps Script, Airtable API)

**Interfaces:**

```typescript
// src/spreadsheet/bridge/ISpreadsheetBridge.ts
export interface ISpreadsheetBridge {
  // Platform detection
  readonly platform: SpreadsheetPlatform;

  // Cell operations
  getCell(cellRef: string): Promise<CellValue>;
  setCell(cellRef: string, value: CellValue): Promise<void>;
  getRange(rangeRef: string): Promise<CellValue[][]>;
  setRange(rangeRef: string, values: CellValue[][]): Promise<void>;

  // Formula operations
  registerCustomFunction(name: string, handler: FunctionHandler): Promise<void>;
  unregisterCustomFunction(name: string): Promise<void>;

  // Event handling
  onCellChange(callback: (cellRef: string, value: CellValue) => void): void;
  onCalculationComplete(callback: () => void): void;

  // Async operations
  executeAsync(operation: () => Promise<void>): Promise<void>;
}

export type SpreadsheetPlatform = 'excel' | 'google-sheets' | 'airtable';

export type CellValue = string | number | boolean | Date | null;

export interface FunctionHandler {
  (args: FunctionArgs): FunctionResult | Promise<FunctionResult>;
}

export interface FunctionArgs {
  [key: string]: CellValue | CellValue[];
}

export interface FunctionResult {
  value: CellValue;
  metadata?: {
    agentId?: string;
    executionTime?: number;
    cacheHit?: boolean;
  };
}
```

**Implementation Examples:**

```typescript
// src/spreadsheet/bridge/ExcelBridge.ts
export class ExcelBridge implements ISpreadsheetBridge {
  readonly platform: SpreadsheetPlatform = 'excel';
  private api: Excel.Script; // Excel JavaScript API

  async getCell(cellRef: string): Promise<CellValue> {
    const range = this.api.worksheets.getActiveWorksheet()
      .getRange(cellRef);
    await this.api.context.sync();
    return range.values[0][0];
  }

  async registerCustomFunction(name: string, handler: FunctionHandler): Promise<void> {
    // Register as Excel custom function using Script.Lab or Office JS API
    Excel.Script.customFunctions.register(name, handler);
  }
}

// src/spreadsheet/bridge/GoogleSheetsBridge.ts
export class GoogleSheetsBridge implements ISpreadsheetBridge {
  readonly platform: SpreadsheetPlatform = 'google-sheets';

  async getCell(cellRef: string): Promise<CellValue> {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const range = sheet.getRange(cellRef);
    return range.getValue();
  }

  async registerCustomFunction(name: string, handler: FunctionHandler): Promise<void> {
    // Register as Apps Script custom function
    // @customfunction
    global[name] = handler;
  }
}
```

#### 1.2.2 Agent Lifecycle Manager

**Purpose:** Spawn, distill, prune, and manage agents for spreadsheet cells

```typescript
// src/spreadsheet/agents/AgentLifecycleManager.ts
export interface AgentLifecycleConfig {
  // Resource limits
  maxConcurrentAgents: number;
  maxAgentMemoryMB: number;
  agentTimeoutMs: number;

  // Distillation
  distillationThreshold: number; // Min examples before distilling
  distillationBatchSize: number;

  // Pruning
  pruneIdleAfterMs: number;
  pruneLowValueThreshold: number;

  // Caching
  enableResultCache: boolean;
  cacheTTLMs: number;
}

export interface SpreadsheetAgentConfig {
  id: string;
  cellRef: string;
  typeId: string;

  // Behavior
  systemPrompt: string;
  modelVersion: string;

  // Dependencies
  inputCells: string[];
  outputCells: string[];

  // Optimization
  enableDistillation: boolean;
  enableDreaming: boolean;
}

export class AgentLifecycleManager {
  private config: AgentLifecycleConfig;
  private agents: Map<string, SpreadsheetAgent> = new Map();
  private distiller: AgentDistiller;
  private scheduler: AgentScheduler;

  constructor(config: Partial<AgentLifecycleConfig> = {}) {
    this.config = {
      maxConcurrentAgents: 10,
      maxAgentMemoryMB: 512,
      agentTimeoutMs: 30000,
      distillationThreshold: 100,
      distillationBatchSize: 32,
      pruneIdleAfterMs: 3600000, // 1 hour
      pruneLowValueThreshold: 0.2,
      enableResultCache: true,
      cacheTTLMs: 300000, // 5 minutes
      ...config,
    };

    this.distiller = new AgentDistiller(this.config);
    this.scheduler = new AgentScheduler(this.config);
  }

  /**
   * Spawn a new agent for a cell
   */
  async spawnAgent(config: SpreadsheetAgentConfig): Promise<string> {
    // Check resource limits
    if (this.agents.size >= this.config.maxConcurrentAgents) {
      await this.pruneLowValueAgents();
    }

    // Create agent
    const agent = await SpreadsheetAgent.create(config);
    this.agents.set(config.id, agent);

    // Register with colony
    await this.registerWithColony(agent);

    return agent.id;
  }

  /**
   * Execute agent and return result
   */
  async executeAgent(agentId: string, inputs: Record<string, CellValue>): Promise<FunctionResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Check cache first
    if (this.config.enableResultCache) {
      const cached = await agent.getCachedResult(inputs);
      if (cached) {
        return { value: cached.value, metadata: { cacheHit: true } };
      }
    }

    // Execute with timeout
    const result = await Promise.race([
      agent.execute(inputs),
      this.timeoutAfter(this.config.agentTimeoutMs),
    ]);

    // Cache result
    if (this.config.enableResultCache) {
      await agent.cacheResult(inputs, result);
    }

    // Track execution for distillation
    await agent.trackExecution(inputs, result);

    // Check if should distill
    if (this.config.distillationThreshold > 0) {
      await this.checkDistillation(agent);
    }

    return {
      value: result.value,
      metadata: {
        agentId: agent.id,
        executionTime: result.executionTimeMs,
        cacheHit: false,
      },
    };
  }

  /**
   * Prune agents that are idle or low-value
   */
  async pruneLowValueAgents(): Promise<void> {
    const now = Date.now();
    const toPrune: string[] = [];

    for (const [id, agent] of this.agents) {
      const stats = await agent.getStats();

      // Prune if idle
      if (now - stats.lastActive > this.config.pruneIdleAfterMs) {
        toPrune.push(id);
        continue;
      }

      // Prune if low value
      if (stats.valueFunction < this.config.pruneLowValueThreshold) {
        toPrune.push(id);
        continue;
      }
    }

    for (const id of toPrune) {
      await this.despawnAgent(id);
    }
  }

  /**
   * Check if agent should be distilled
   */
  private async checkDistillation(agent: SpreadsheetAgent): Promise<void> {
    const stats = await agent.getStats();

    if (stats.executionCount >= this.config.distillationThreshold) {
      await this.distiller.distill(agent);
    }
  }

  /**
   * Despawn an agent
   */
  async despawnAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Save state before destroying
    await agent.saveState();

    // Unregister from colony
    await this.unregisterFromColony(agent);

    // Destroy
    await agent.destroy();
    this.agents.delete(agentId);
  }

  private async registerWithColony(agent: SpreadsheetAgent): Promise<void> {
    // Implementation: Register with POLLN Colony
  }

  private async unregisterFromColony(agent: SpreadsheetAgent): Promise<void> {
    // Implementation: Unregister from POLLN Colony
  }

  private async timeoutAfter(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Agent execution timeout')), ms)
    );
  }
}
```

#### 1.2.3 State Persistence Layer

**Purpose:** Persist agent states, cached results, and learned patterns (local + cloud)

```typescript
// src/spreadsheet/persistence/StatePersistence.ts
export interface PersistenceConfig {
  // Storage backends
  localStoragePath: string;
  cloudStorage?: {
    provider: 'aws' | 'gcp' | 'azure';
    bucket: string;
    region: string;
  };

  // Encryption
  encryptionEnabled: boolean;
  encryptionKey?: string;

  // Sync
  syncIntervalMs: number;
  syncOnWrite: boolean;

  // Compression
  compressionEnabled: boolean;
}

export interface AgentStateSnapshot {
  agentId: string;
  cellRef: string;

  // State
  valueFunction: number;
  executionCount: number;
  lastActive: number;

  // Learned patterns
  distilledModel?: DistilledModel;
  cacheEntries: CacheEntry[];

  // Metadata
  version: number;
  checksum: string;
  createdAt: number;
  updatedAt: number;
}

export interface CacheEntry {
  inputsHash: string;
  result: CellValue;
  createdAt: number;
  hitCount: number;
}

export interface DistilledModel {
  modelType: 'decision-tree' | 'neural' | 'rule-based';
  modelData: string; // Serialized model
  accuracy: number;
  createdAt: number;
}

export class StatePersistence {
  private config: PersistenceConfig;
  private localStore: LocalStorageBackend;
  private cloudStore?: CloudStorageBackend;
  private crypto: CryptoService;

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = {
      localStoragePath: './.polln-spreadsheet-state',
      encryptionEnabled: true,
      syncIntervalMs: 60000, // 1 minute
      syncOnWrite: true,
      compressionEnabled: true,
      ...config,
    };

    this.localStore = new LocalStorageBackend(this.config.localStoragePath);
    this.crypto = new CryptoService(this.config.encryptionKey);

    if (this.config.cloudStorage) {
      this.cloudStore = new CloudStorageBackend(this.config.cloudStorage);
    }
  }

  /**
   * Save agent state
   */
  async saveState(snapshot: AgentStateSnapshot): Promise<void> {
    // Serialize
    const data = JSON.stringify(snapshot);

    // Compress if enabled
    const compressed = this.config.compressionEnabled
      ? await this.compress(data)
      : data;

    // Encrypt if enabled
    const encrypted = this.config.encryptionEnabled
      ? await this.crypto.encrypt(compressed)
      : compressed;

    // Save locally
    await this.localStore.write(`agent/${snapshot.agentId}`, encrypted);

    // Sync to cloud if enabled
    if (this.config.syncOnWrite && this.cloudStore) {
      await this.cloudStore.write(`agent/${snapshot.agentId}`, encrypted)
        .catch(err => console.warn('Cloud sync failed:', err));
    }
  }

  /**
   * Load agent state
   */
  async loadState(agentId: string): Promise<AgentStateSnapshot | null> {
    // Try local first
    let data = await this.localStore.read(`agent/${agentId}`);

    // Fall back to cloud
    if (!data && this.cloudStore) {
      data = await this.cloudStore.read(`agent/${agentId}`);
      if (data) {
        // Cache locally
        await this.localStore.write(`agent/${agentId}`, data);
      }
    }

    if (!data) return null;

    // Decrypt if enabled
    const decrypted = this.config.encryptionEnabled
      ? await this.crypto.decrypt(data)
      : data;

    // Decompress if enabled
    const decompressed = this.config.compressionEnabled
      ? await this.decompress(decrypted)
      : decrypted;

    return JSON.parse(decompressed);
  }

  /**
   * Sync all local states to cloud
   */
  async syncToCloud(): Promise<void> {
    if (!this.cloudStore) return;

    const localStates = await this.localStore.list('agent/');

    for (const stateId of localStates) {
      const data = await this.localStore.read(stateId);
      if (data) {
        await this.cloudStore.write(stateId, data);
      }
    }
  }

  private async compress(data: string): Promise<string> {
    // Use zlib or similar compression
    throw new Error('Not implemented');
  }

  private async decompress(data: string): Promise<string> {
    // Use zlib or similar decompression
    throw new Error('Not implemented');
  }
}
```

#### 1.2.4 Communication Channel

**Purpose:** Enable real-time communication between user and colony (WebSocket-based)

```typescript
// src/spreadsheet/communication/ColonyChannel.ts
export interface ColonyChannelConfig {
  // WebSocket endpoint
  wsUrl: string;

  // Authentication
  apiKey: string;
  gardenerId: string;

  // Reconnection
  reconnectIntervalMs: number;
  maxReconnectAttempts: number;

  // Message handling
  messageQueueSize: number;
  acknowledgmentTimeoutMs: number;
}

export interface ColonyMessage {
  id: string;
  type: MessageType;
  payload: unknown;
  timestamp: number;
}

export type MessageType =
  | 'agent_spawned'
  | 'agent_executed'
  | 'agent_pruned'
  | 'distillation_complete'
  | 'dreaming_complete'
  | 'error';

export class ColonyChannel {
  private config: ColonyChannelConfig;
  private ws: WebSocket | null = null;
  private messageQueue: ColonyMessage[] = [];
  private pendingAcks: Map<string, Promise<ColonyMessage>> = new Map();

  constructor(config: ColonyChannelConfig) {
    this.config = config;
  }

  /**
   * Connect to colony server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.onopen = () => {
        // Authenticate
        this.send({
          id: this.generateId(),
          type: 'auth',
          payload: {
            apiKey: this.config.apiKey,
            gardenerId: this.config.gardenerId,
          },
          timestamp: Date.now(),
        });
        resolve();
      };

      this.ws.onmessage = (event) => this.handleMessage(event);

      this.ws.onerror = (error) => reject(error);

      this.ws.onclose = () => {
        // Attempt reconnection
        setTimeout(() => this.reconnect(), this.config.reconnectIntervalMs);
      };
    });
  }

  /**
   * Send message and wait for acknowledgment
   */
  async sendAndWait(message: ColonyMessage): Promise<ColonyMessage> {
    // Add to pending acknowledgments
    const ackPromise = new Promise<ColonyMessage>((resolve) => {
      this.pendingAcks.set(message.id, resolve);
    });

    // Send message
    this.send(message);

    // Wait for acknowledgment
    return Promise.race([
      ackPromise,
      this.timeoutAfter(this.config.acknowledgmentTimeoutMs),
    ]);
  }

  /**
   * Send message without waiting
   */
  send(message: ColonyMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue for later
      this.messageQueue.push(message);
      if (this.messageQueue.length > this.config.messageQueueSize) {
        this.messageQueue.shift(); // Drop oldest
      }
      return;
    }

    this.ws.send(JSON.stringify(message));

    // Send queued messages
    while (this.messageQueue.length > 0) {
      const queued = this.messageQueue.shift();
      if (queued) {
        this.ws.send(JSON.stringify(queued));
      }
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: MessageEvent): void {
    const message: ColonyMessage = JSON.parse(event.data);

    // Check if acknowledgment
    if (message.type === 'ack') {
      const pending = this.pendingAcks.get(message.id);
      if (pending) {
        pending(message);
        this.pendingAcks.delete(message.id);
      }
      return;
    }

    // Handle other message types
    switch (message.type) {
      case 'agent_spawned':
        this.handleAgentSpawned(message);
        break;
      case 'agent_executed':
        this.handleAgentExecuted(message);
        break;
      case 'distillation_complete':
        this.handleDistillationComplete(message);
        break;
      case 'dreaming_complete':
        this.handleDreamingComplete(message);
        break;
      case 'error':
        this.handleError(message);
        break;
    }
  }

  private handleAgentSpawned(message: ColonyMessage): void {
    // Notify spreadsheet that agent is ready
    this.emit('agent:spawned', message.payload);
  }

  private handleAgentExecuted(message: ColonyMessage): void {
    // Update cell with result
    this.emit('agent:executed', message.payload);
  }

  private handleDistillationComplete(message: ColonyMessage): void {
    // Update agent with distilled model
    this.emit('distillation:complete', message.payload);
  }

  private handleDreamingComplete(message: ColonyMessage): void {
    // Update agent with improved policy
    this.emit('dreaming:complete', message.payload);
  }

  private handleError(message: ColonyMessage): void {
    this.emit('error', message.payload);
  }

  private async reconnect(): Promise<void> {
    // Implementation: Reconnection logic
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private timeoutAfter(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }
}
```

---

## 2. Code Structure Proposal

### 2.1 File Tree

```
polln/
├── src/
│   ├── core/                          # Existing POLLN core
│   │   ├── agent.ts
│   │   ├── colony.ts
│   │   ├── types.ts
│   │   └── ...
│   │
│   ├── spreadsheet/                   # NEW: Spreadsheet integration
│   │   ├── index.ts                   # Main entry point
│   │   │
│   │   ├── bridge/                    # Platform-specific bridges
│   │   │   ├── ISpreadsheetBridge.ts
│   │   │   ├── ExcelBridge.ts
│   │   │   ├── GoogleSheetsBridge.ts
│   │   │   ├── AirtableBridge.ts
│   │   │   └── BridgeFactory.ts
│   │   │
│   │   ├── agents/                    # Agent lifecycle management
│   │   │   ├── SpreadsheetAgent.ts
│   │   │   ├── AgentLifecycleManager.ts
│   │   │   ├── AgentScheduler.ts
│   │   │   └── AgentDistiller.ts
│   │   │
│   │   ├── cells/                     # Cell-to-agent binding
│   │   │   ├── CellBinding.ts
│   │   │   ├── CellDependencyGraph.ts
│   │   │   └── CellUpdatePropagation.ts
│   │   │
│   │   ├── persistence/               # State persistence
│   │   │   ├── StatePersistence.ts
│   │   │   ├── LocalStorageBackend.ts
│   │   │   ├── CloudStorageBackend.ts
│   │   │   └── CryptoService.ts
│   │   │
│   │   ├── communication/             # Colony communication
│   │   │   ├── ColonyChannel.ts
│   │   │   ├── MessageProtocol.ts
│   │   │   └── EventStream.ts
│   │   │
│   │   ├── formulas/                  # Custom formula implementations
│   │   │   ├── POLLN_AGENT.ts
│   │   │   ├── POLLN_BATCH.ts
│   │   │   ├── POLLN_OPTIMIZE.ts
│   │   │   └── FormulaRegistry.ts
│   │   │
│   │   ├── optimization/              # Background optimization
│   │   │   ├── DreamingScheduler.ts
│   │   │   ├── IncrementalDistiller.ts
│   │   │   └── PolicyOptimizer.ts
│   │   │
│   │   └── types.ts                   # Spreadsheet-specific types
│   │
│   └── api/                           # Existing POLLN API
│       └── ...
│
├── examples/
│   └── spreadsheet/
│       ├── excel-demo/
│       │   ├── README.md
│       │   └── demo.xlsx
│       ├── google-sheets-demo/
│       │   ├── README.md
│       │   └── Code.gs
│       └── airtable-demo/
│           ├── README.md
│           └── base-schema.json
│
├── docs/
│   └── research/
│       └── spreadsheet/
│           ├── TECHNICAL_SPECS.md     # This document
│           ├── API_REFERENCE.md       # Formula API reference
│           └── ARCHITECTURE.md        # Architecture diagrams
│
├── package.json
├── tsconfig.json
└── jest.config.cjs
```

### 2.2 Package Structure

**Option 1: Monorepo (Recommended for MVP)**

```json
// package.json
{
  "name": "polln",
  "version": "0.2.0",
  "exports": {
    ".": "./dist/index.js",
    "./core": "./dist/core/index.js",
    "./spreadsheet": "./dist/spreadsheet/index.js",
    "./spreadsheet/excel": "./dist/spreadsheet/bridge/ExcelBridge.js",
    "./spreadsheet/google-sheets": "./dist/spreadsheet/bridge/GoogleSheetsBridge.js",
    "./spreadsheet/airtable": "./dist/spreadsheet/bridge/AirtableBridge.js"
  }
}
```

**Option 2: Separate Package**

```json
// packages/spreadsheet/package.json
{
  "name": "@polln/spreadsheet",
  "version": "0.1.0",
  "peerDependencies": {
    "polln": "^0.2.0"
  }
}
```

### 2.3 Build and Deployment Process

```typescript
// scripts/build-spreadsheet.ts
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

async function buildSpreadsheetIntegration() {
  // 1. Build TypeScript
  await execPromise('npm run build');

  // 2. Bundle for each platform
  await buildExcelAddin();
  await buildGoogleSheetsAddon();
  await buildAirtableExtension();

  // 3. Generate documentation
  await generateAPIDocs();
}

async function buildExcelAddin() {
  // Bundle for Excel JavaScript API
  await execPromise(
    'npx rollup -c rollup.excel.config.js'
  );
}

async function buildGoogleSheetsAddon() {
  // Bundle for Apps Script
  await execPromise(
    'npx rollup -c rollup.google-sheets.config.js'
  );

  // Create clasp project
  await execPromise('npx clasp create --title "POLLN Spreadsheet" --type sheets');

  // Push to Apps Script
  await execPromise('npx clasp push');
}

async function buildAirtableExtension() {
  // Bundle for Airtable scripting
  await execPromise(
    'npx rollup -c rollup.airtable.config.js'
  );
}

async function generateAPIDocs() {
  // Generate formula reference
  await execPromise(
    'npx typedoc src/spreadsheet/formulas --out docs/api/formulas'
  );
}

buildSpreadsheetIntegration().catch(console.error);
```

---

## 3. Key Algorithms to Implement

### 3.1 Agent-to-Cell Binding

**Purpose:** Bind agents to spreadsheet cells and manage dependencies

```typescript
// src/spreadsheet/cells/CellBinding.ts
export interface CellBindingConfig {
  cellRef: string;
  agentId: string;

  // Binding type
  bindingType: 'static' | 'dynamic' | 'reactive';

  // Dependencies
  inputCells: string[];
  outputCells: string[];

  // Update behavior
  updateTrigger: 'manual' | 'auto' | 'streaming';
  updateDebounceMs?: number;
}

export class CellBinding {
  private config: CellBindingConfig;
  private dependencyGraph: CellDependencyGraph;

  constructor(config: CellBindingConfig) {
    this.config = config;
    this.dependencyGraph = new CellDependencyGraph();

    // Register dependencies
    for (const inputCell of config.inputCells) {
      this.dependencyGraph.addDependency(inputCell, config.cellRef);
    }
  }

  /**
   * Check if binding should trigger update
   */
  shouldUpdate(changedCells: Set<string>): boolean {
    if (this.config.updateTrigger === 'manual') {
      return false;
    }

    // Check if any input cell changed
    for (const inputCell of this.config.inputCells) {
      if (changedCells.has(inputCell)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Execute agent with current cell values
   */
  async execute(
    getCellValue: (cellRef: string) => Promise<CellValue>,
    agentManager: AgentLifecycleManager
  ): Promise<CellValue> {
    // Gather input values
    const inputs: Record<string, CellValue> = {};
    for (const inputCell of this.config.inputCells) {
      inputs[inputCell] = await getCellValue(inputCell);
    }

    // Execute agent
    const result = await agentManager.executeAgent(this.config.agentId, inputs);

    // Update output cells
    if (this.config.outputCells.length > 0) {
      await this.updateOutputCells(result.value);
    }

    return result.value;
  }

  private async updateOutputCells(value: CellValue): Promise<void> {
    // Implementation: Update output cells with result
  }
}

/**
 * Dependency graph for tracking cell relationships
 */
export class CellDependencyGraph {
  private graph: Map<string, Set<string>> = new Map();

  addDependency(from: string, to: string): void {
    if (!this.graph.has(from)) {
      this.graph.set(from, new Set());
    }
    this.graph.get(from)!.add(to);
  }

  getDependents(cellRef: string): string[] {
    return Array.from(this.graph.get(cellRef) || []);
  }

  getTopologicalOrder(changedCells: Set<string>): string[] {
    // Kahn's algorithm for topological sort
    const visited = new Set<string>();
    const order: string[] = [];
    const queue = Array.from(changedCells);

    while (queue.length > 0) {
      const cell = queue.shift()!;

      if (visited.has(cell)) continue;
      visited.add(cell);
      order.push(cell);

      // Add dependents
      for (const dependent of this.getDependents(cell)) {
        if (!visited.has(dependent)) {
          queue.push(dependent);
        }
      }
    }

    return order;
  }
}
```

### 3.2 Dependency Resolution in Agent Networks

**Purpose:** Resolve execution order when agents depend on each other

```typescript
// src/spreadsheet/agents/AgentScheduler.ts
export interface AgentSchedule {
  agentId: string;
  executionOrder: number;
  canExecuteInParallel: boolean;
  dependencies: string[];
}

export class AgentScheduler {
  /**
   * Schedule agents based on dependencies
   */
  schedule(
    agents: Map<string, SpreadsheetAgent>,
    changedCells: Set<string>
  ): AgentSchedule[] {
    // Build dependency graph
    const graph = this.buildDependencyGraph(agents);

    // Find agents that need to run
    const agentsToRun = this.findAffectedAgents(graph, changedCells);

    // Topological sort for execution order
    const executionOrder = this.topologicalSort(graph, agentsToRun);

    // Find parallelizable agents
    const parallelGroups = this.findParallelGroups(executionOrder, graph);

    return executionOrder.map((agentId, index) => ({
      agentId,
      executionOrder: index,
      canExecuteInParallel: parallelGroups.some(group =>
        group.includes(agentId) && group.length > 1
      ),
      dependencies: Array.from(graph.get(agentId) || []),
    }));
  }

  private buildDependencyGraph(
    agents: Map<string, SpreadsheetAgent>
  ): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const [id, agent] of agents) {
      const deps = new Set<string>();

      // Agent depends on other agents if it reads from their output cells
      for (const inputCell of agent.config.inputCells) {
        for (const [otherId, otherAgent] of agents) {
          if (otherId === id) continue;
          if (otherAgent.config.outputCells.includes(inputCell)) {
            deps.add(otherId);
          }
        }
      }

      graph.set(id, deps);
    }

    return graph;
  }

  private findAffectedAgents(
    graph: Map<string, Set<string>>,
    changedCells: Set<string>
  ): Set<string> {
    const affected = new Set<string>();

    // Find agents that read from changed cells
    for (const [agentId, deps] of graph) {
      for (const depAgentId of deps) {
        // Check if dependency's output is in changed cells
        // Implementation depends on agent config structure
      }
    }

    return affected;
  }

  private topologicalSort(
    graph: Map<string, Set<string>>,
    nodes: Set<string>
  ): string[] {
    // Kahn's algorithm
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Calculate in-degrees
    for (const node of nodes) {
      inDegree.set(node, 0);
    }

    for (const [node, deps] of graph) {
      if (!nodes.has(node)) continue;

      for (const dep of deps) {
        if (nodes.has(dep)) {
          inDegree.set(node, (inDegree.get(node) || 0) + 1);
        }
      }
    }

    // Find nodes with no dependencies
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process nodes
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      // Update in-degrees of dependents
      for (const [otherNode, deps] of graph) {
        if (deps.has(node) && nodes.has(otherNode)) {
          const newDegree = (inDegree.get(otherNode) || 0) - 1;
          inDegree.set(otherNode, newDegree);

          if (newDegree === 0) {
            queue.push(otherNode);
          }
        }
      }
    }

    return result;
  }

  private findParallelGroups(
    executionOrder: string[],
    graph: Map<string, Set<string>>
  ): string[][] {
    // Group agents that can run in parallel (no dependencies between them)
    const groups: string[][] = [];
    const processed = new Set<string>();

    for (const agentId of executionOrder) {
      if (processed.has(agentId)) continue;

      const group: string[] = [agentId];
      processed.add(agentId);

      // Find other agents that can run in parallel
      for (const otherId of executionOrder) {
        if (processed.has(otherId)) continue;

        // Check if there's a dependency between agentId and otherId
        const hasDependency =
          (graph.get(agentId)?.has(otherId) || false) ||
          (graph.get(otherId)?.has(agentId) || false);

        if (!hasDependency) {
          group.push(otherId);
          processed.add(otherId);
        }
      }

      groups.push(group);
    }

    return groups;
  }
}
```

### 3.3 Incremental Distillation (LLM → Bots)

**Purpose:** Gradually distill LLM behavior into faster, smaller models

```typescript
// src/spreadsheet/agents/AgentDistiller.ts
export interface DistillationConfig {
  // Distillation triggers
  minExecutionCount: number;
  minAccuracy: number;

  // Distillation methods
  methods: DistillationMethod[];

  // Model selection
  targetModelSize: 'tiny' | 'small' | 'medium' | 'base';

  // Validation
  validationSplit: number;
  minValidationSamples: number;
}

export type DistillationMethod =
  | 'decision-tree'
  | 'random-forest'
  | 'neural-network'
  | 'rule-extraction'
  | 'cache-lookup';

export interface DistillationResult {
  agentId: string;
  method: DistillationMethod;
  model: DistilledModel;
  accuracy: number;
  speedup: number;
  distilledAt: number;
}

export class AgentDistiller {
  private config: DistillationConfig;

  constructor(config: Partial<DistillationConfig> = {}) {
    this.config = {
      minExecutionCount: 100,
      minAccuracy: 0.95,
      methods: ['cache-lookup', 'decision-tree', 'neural-network'],
      targetModelSize: 'small',
      validationSplit: 0.2,
      minValidationSamples: 20,
      ...config,
    };
  }

  /**
   * Distill agent based on execution history
   */
  async distill(agent: SpreadsheetAgent): Promise<DistillationResult> {
    // Get execution history
    const history = await agent.getExecutionHistory();

    if (history.length < this.config.minExecutionCount) {
      throw new Error('Not enough executions for distillation');
    }

    // Try each distillation method
    const results: DistillationResult[] = [];

    for (const method of this.config.methods) {
      try {
        const result = await this.distillWithMethod(agent, method, history);

        // Validate accuracy
        if (result.accuracy >= this.config.minAccuracy) {
          results.push(result);
        }
      } catch (error) {
        console.warn(`Distillation with ${method} failed:`, error);
      }
    }

    // Select best model
    const best = this.selectBestModel(results);

    // Apply to agent
    await agent.applyDistilledModel(best.model);

    return best;
  }

  private async distillWithMethod(
    agent: SpreadsheetAgent,
    method: DistillationMethod,
    history: ExecutionHistoryEntry[]
  ): Promise<DistillationResult> {
    const startTime = Date.now();

    switch (method) {
      case 'cache-lookup':
        return this.distillCacheLookup(agent, history);

      case 'decision-tree':
        return this.distillDecisionTree(agent, history);

      case 'neural-network':
        return this.distillNeuralNetwork(agent, history);

      case 'rule-extraction':
        return this.distillRuleExtraction(agent, history);

      default:
        throw new Error(`Unknown distillation method: ${method}`);
    }
  }

  private async distillCacheLookup(
    agent: SpreadsheetAgent,
    history: ExecutionHistoryEntry[]
  ): Promise<DistillationResult> {
    // Build exact match cache
    const cache = new Map<string, CellValue>();

    for (const entry of history) {
      const key = this.hashInputs(entry.inputs);
      cache.set(key, entry.output);
    }

    // Calculate accuracy on validation set
    const { accuracy, speedup } = await this.validateModel(agent, {
      type: 'cache',
      cache: Object.fromEntries(cache),
    }, history);

    return {
      agentId: agent.id,
      method: 'cache-lookup',
      model: {
        modelType: 'cache',
        modelData: JSON.stringify({ cache: Object.fromEntries(cache) }),
        accuracy,
        createdAt: Date.now(),
      },
      accuracy,
      speedup,
      distilledAt: Date.now(),
    };
  }

  private async distillDecisionTree(
    agent: SpreadsheetAgent,
    history: ExecutionHistoryEntry[]
  ): Promise<DistillationResult> {
    // Extract features from inputs
    const features = history.map(entry => this.extractFeatures(entry.inputs));
    const labels = history.map(entry => entry.output);

    // Train decision tree
    const tree = await this.trainDecisionTree(features, labels);

    // Validate
    const { accuracy, speedup } = await this.validateModel(agent, {
      type: 'decision-tree',
      tree,
    }, history);

    return {
      agentId: agent.id,
      method: 'decision-tree',
      model: {
        modelType: 'decision-tree',
        modelData: JSON.stringify(tree),
        accuracy,
        createdAt: Date.now(),
      },
      accuracy,
      speedup,
      distilledAt: Date.now(),
    };
  }

  private async distillNeuralNetwork(
    agent: SpreadsheetAgent,
    history: ExecutionHistoryEntry[]
  ): Promise<DistillationResult> {
    // Prepare training data
    const features = history.map(entry => this.extractFeatures(entry.inputs));
    const labels = history.map(entry => this.encodeOutput(entry.output));

    // Train small neural network
    const network = await this.trainNeuralNetwork(
      features,
      labels,
      this.config.targetModelSize
    );

    // Validate
    const { accuracy, speedup } = await this.validateModel(agent, {
      type: 'neural',
      network,
    }, history);

    return {
      agentId: agent.id,
      method: 'neural-network',
      model: {
        modelType: 'neural',
        modelData: JSON.stringify(network),
        accuracy,
        createdAt: Date.now(),
      },
      accuracy,
      speedup,
      distilledAt: Date.now(),
    };
  }

  private async distillRuleExtraction(
    agent: SpreadsheetAgent,
    history: ExecutionHistoryEntry[]
  ): Promise<DistillationResult> {
    // Extract rules using symbolic regression or ILP
    const rules = await this.extractRules(history);

    // Validate
    const { accuracy, speedup } = await this.validateModel(agent, {
      type: 'rules',
      rules,
    }, history);

    return {
      agentId: agent.id,
      method: 'rule-extraction',
      model: {
        modelType: 'rule-based',
        modelData: JSON.stringify(rules),
        accuracy,
        createdAt: Date.now(),
      },
      accuracy,
      speedup,
      distilledAt: Date.now(),
    };
  }

  private async validateModel(
    agent: SpreadsheetAgent,
    model: unknown,
    history: ExecutionHistoryEntry[]
  ): Promise<{ accuracy: number; speedup: number }> {
    // Split into train/validation
    const splitIndex = Math.floor(history.length * (1 - this.config.validationSplit));
    const validationSet = history.slice(splitIndex);

    if (validationSet.length < this.config.minValidationSamples) {
      return { accuracy: 0, speedup: 1 };
    }

    // Measure LLM baseline speed
    const llmStart = Date.now();
    for (const entry of validationSet.slice(0, 10)) {
      await agent.executeWithLLM(entry.inputs);
    }
    const llmTime = Date.now() - llmStart;

    // Test model accuracy and speed
    let correct = 0;
    const modelStart = Date.now();

    for (const entry of validationSet) {
      const predicted = await this.predictWithModel(model, entry.inputs);
      const actual = entry.output;

      if (this.compareOutputs(predicted, actual)) {
        correct++;
      }
    }

    const modelTime = Date.now() - modelStart;

    return {
      accuracy: correct / validationSet.length,
      speedup: llmTime / modelTime,
    };
  }

  private selectBestModel(results: DistillationResult[]): DistillationResult {
    // Select based on accuracy * speedup
    return results.reduce((best, current) => {
      const bestScore = best.accuracy * best.speedup;
      const currentScore = current.accuracy * current.speedup;
      return currentScore > bestScore ? current : best;
    });
  }

  private hashInputs(inputs: Record<string, CellValue>): string {
    // Create hash of input values
    return JSON.stringify(inputs);
  }

  private extractFeatures(inputs: Record<string, CellValue>): number[] {
    // Convert inputs to feature vector
    return Object.values(inputs).map(v => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') return v.length;
      if (v instanceof Date) return v.getTime();
      return 0;
    });
  }

  private encodeOutput(output: CellValue): number[] {
    // Convert output to encoding
    if (typeof output === 'number') return [output];
    return [0];
  }

  private async trainDecisionTree(
    features: number[][],
    labels: CellValue[]
  ): Promise<unknown> {
    // Use scikit-learn or similar
    throw new Error('Not implemented');
  }

  private async trainNeuralNetwork(
    features: number[][],
    labels: number[][],
    size: string
  ): Promise<unknown> {
    // Use TensorFlow.js or similar
    throw new Error('Not implemented');
  }

  private async extractRules(
    history: ExecutionHistoryEntry[]
  ): Promise<unknown> {
    // Use symbolic regression or ILP
    throw new Error('Not implemented');
  }

  private async predictWithModel(
    model: unknown,
    inputs: Record<string, CellValue>
  ): Promise<CellValue> {
    // Run inference with distilled model
    throw new Error('Not implemented');
  }

  private compareOutputs(a: CellValue, b: CellValue): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
```

### 3.4 Cell Value Update Propagation

**Purpose:** Efficiently propagate updates through dependent cells

```typescript
// src/spreadsheet/cells/CellUpdatePropagation.ts
export interface UpdatePropagationConfig {
  // Batching
  batchUpdates: boolean;
  batchMaxWaitMs: number;
  batchMaxSize: number;

  // Parallelization
  enableParallelExecution: boolean;
  maxParallelAgents: number;

  // Debouncing
  enableDebouncing: boolean;
  debounceMs: number;

  // Streaming
  enableStreaming: boolean;
  streamUpdateIntervalMs: number;
}

export interface CellUpdate {
  cellRef: string;
  oldValue: CellValue;
  newValue: CellValue;
  timestamp: number;
}

export class CellUpdatePropagation {
  private config: UpdatePropagationConfig;
  private pendingUpdates: Map<string, CellUpdate> = new Map();
  private updateBatch: CellUpdate[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<UpdatePropagationConfig> = {}) {
    this.config = {
      batchUpdates: true,
      batchMaxWaitMs: 100,
      batchMaxSize: 50,
      enableParallelExecution: true,
      maxParallelAgents: 5,
      enableDebouncing: true,
      debounceMs: 50,
      enableStreaming: false,
      streamUpdateIntervalMs: 100,
      ...config,
    };
  }

  /**
   * Handle cell value change
   */
  async onCellChange(
    cellRef: string,
    oldValue: CellValue,
    newValue: CellValue,
    bindings: Map<string, CellBinding>,
    agentManager: AgentLifecycleManager
  ): Promise<void> {
    const update: CellUpdate = {
      cellRef,
      oldValue,
      newValue,
      timestamp: Date.now(),
    };

    // Debounce if enabled
    if (this.config.enableDebouncing) {
      this.pendingUpdates.set(cellRef, update);
      await this.debouncedUpdate(bindings, agentManager);
      return;
    }

    // Process immediately
    await this.processUpdate(update, bindings, agentManager);
  }

  /**
   * Process update with batching
   */
  private async processUpdate(
    update: CellUpdate,
    bindings: Map<string, CellBinding>,
    agentManager: AgentLifecycleManager
  ): Promise<void> {
    if (this.config.batchUpdates) {
      this.updateBatch.push(update);

      // Process batch if full
      if (this.updateBatch.length >= this.config.batchMaxSize) {
        await this.processBatch(bindings, agentManager);
        return;
      }

      // Set timer to process batch
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch(bindings, agentManager);
        }, this.config.batchMaxWaitMs);
      }

      return;
    }

    // Process single update
    await this.propagateUpdate(update, bindings, agentManager);
  }

  /**
   * Process batch of updates
   */
  private async processBatch(
    bindings: Map<string, CellBinding>,
    agentManager: AgentLifecycleManager
  ): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const batch = this.updateBatch.splice(0);

    if (this.config.enableParallelExecution) {
      await this.processBatchParallel(batch, bindings, agentManager);
    } else {
      await this.processBatchSequential(batch, bindings, agentManager);
    }
  }

  /**
   * Process batch in parallel
   */
  private async processBatchParallel(
    batch: CellUpdate[],
    bindings: Map<string, CellBinding>,
    agentManager: AgentLifecycleManager
  ): Promise<void> {
    // Group updates by execution order
    const schedule = await this.scheduleUpdates(batch, bindings);

    // Process each level in parallel
    for (const level of schedule) {
      const promises = level.map(update =>
        this.propagateUpdate(update, bindings, agentManager)
      );

      // Limit concurrency
      await this.concurrentPromise(promises, this.config.maxParallelAgents);
    }
  }

  /**
   * Process batch sequentially
   */
  private async processBatchSequential(
    batch: CellUpdate[],
    bindings: Map<string, CellBinding>,
    agentManager: AgentLifecycleManager
  ): Promise<void> {
    for (const update of batch) {
      await this.propagateUpdate(update, bindings, agentManager);
    }
  }

  /**
   * Propagate single update through dependencies
   */
  private async propagateUpdate(
    update: CellUpdate,
    bindings: Map<string, CellBinding>,
    agentManager: AgentLifecycleManager
  ): Promise<void> {
    // Find affected bindings
    const affectedBindings: CellBinding[] = [];

    for (const binding of bindings.values()) {
      if (binding.shouldUpdate(new Set([update.cellRef]))) {
        affectedBindings.push(binding);
      }
    }

    // Execute affected agents
    for (const binding of affectedBindings) {
      try {
        await binding.execute(
          async (cellRef) => {
            // Get cell value from spreadsheet
            throw new Error('Not implemented');
          },
          agentManager
        );
      } catch (error) {
        console.error(`Failed to execute agent for ${binding.config.cellRef}:`, error);
      }
    }
  }

  /**
   * Schedule updates for parallel execution
   */
  private async scheduleUpdates(
    batch: CellUpdate[],
    bindings: Map<string, CellBinding>
  ): Promise<CellUpdate[][]> {
    // Build dependency graph
    const graph = new CellDependencyGraph();

    for (const binding of bindings.values()) {
      for (const inputCell of binding.config.inputCells) {
        graph.addDependency(inputCell, binding.config.cellRef);
      }
    }

    // Get topological order
    const changedCells = new Set(batch.map(u => u.cellRef));
    const order = graph.getTopologicalOrder(changedCells);

    // Group by execution level
    const levels: CellUpdate[][] = [];
    const processed = new Set<string>();

    for (const cellRef of order) {
      const level = this.getExecutionLevel(cellRef, graph, processed);

      while (levels.length <= level) {
        levels.push([]);
      }

      const update = batch.find(u => u.cellRef === cellRef);
      if (update) {
        levels[level].push(update);
      }

      processed.add(cellRef);
    }

    return levels;
  }

  private getExecutionLevel(
    cellRef: string,
    graph: CellDependencyGraph,
    processed: Set<string>
  ): number {
    const dependents = graph.getDependents(cellRef);

    let maxLevel = 0;
    for (const dependent of dependents) {
      if (processed.has(dependent)) {
        const level = this.getExecutionLevel(dependent, graph, processed);
        maxLevel = Math.max(maxLevel, level + 1);
      }
    }

    return maxLevel;
  }

  private async debouncedUpdate(
    bindings: Map<string, CellBinding>,
    agentManager: AgentLifecycleManager
  ): Promise<void> {
    // Wait for debounce period
    await new Promise(resolve => setTimeout(resolve, this.config.debounceMs));

    // Process all pending updates
    const updates = Array.from(this.pendingUpdates.values());
    this.pendingUpdates.clear();

    for (const update of updates) {
      await this.processUpdate(update, bindings, agentManager);
    }
  }

  private async concurrentPromise<T>(
    promises: Promise<T>[],
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      const p = Promise.resolve(promise).then(result => {
        executing.splice(executing.indexOf(p), 1);
        return result;
      });

      results.push(p);
      executing.push(p);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }

    return Promise.all(results);
  }
}
```

---

## 4. Security & Isolation

### 4.1 Sandbox Design

**Purpose:** Isolate user agent execution to prevent security issues

```typescript
// src/spreadsheet/security/Sandbox.ts
export interface SandboxConfig {
  // Resource limits
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxExecutionTimeMs: number;

  // Network restrictions
  allowNetworkAccess: boolean;
  allowedDomains: string[];

  // File system restrictions
  allowFileSystemAccess: boolean;
  allowedPaths: string[];

  // Code restrictions
  allowedModules: string[];
  blockedModules: string[];
}

export class Sandbox {
  private config: SandboxConfig;
  private isolatedContext: any;

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = {
      maxMemoryMB: 128,
      maxCpuPercent: 50,
      maxExecutionTimeMs: 5000,
      allowNetworkAccess: false,
      allowedDomains: [],
      allowFileSystemAccess: false,
      allowedPaths: [],
      allowedModules: ['polln/core'],
      blockedModules: ['fs', 'child_process', 'net'],
      ...config,
    };

    this.isolatedContext = this.createIsolatedContext();
  }

  /**
   * Execute code in sandbox
   */
  async execute<T>(
    code: string,
    context: Record<string, unknown>
  ): Promise<T> {
    // Create isolated execution context
    const sandbox = this.createSandboxContext(context);

    // Execute with timeout
    const result = await Promise.race([
      this.executeInSandbox(code, sandbox),
      this.timeoutAfter(this.config.maxExecutionTimeMs),
    ]);

    return result as T;
  }

  private createSandboxContext(
    context: Record<string, unknown>
  ): Record<string, unknown> {
    // Create restricted context
    const sandbox: Record<string, unknown> = {
      // PollN modules
      polln: {
        core: this.getAllowedModules(),
      },

      // Safe built-ins
      console: this.createSafeConsole(),
      Math: Math,
      Date: Date,
      JSON: JSON,

      // User context
      ...context,
    };

    return sandbox;
  }

  private createIsolatedContext(): any {
    // Use vm2 or similar for isolation
    throw new Error('Not implemented');
  }

  private async executeInSandbox<T>(
    code: string,
    sandbox: Record<string, unknown>
  ): Promise<T> {
    // Execute in isolated context
    throw new Error('Not implemented');
  }

  private getAllowedModules(): any {
    // Return only allowed modules
    throw new Error('Not implemented');
  }

  private createSafeConsole(): any {
    // Create console with safe logging
    return {
      log: (...args: unknown[]) => console.log('[SANDBOX]', ...args),
      warn: (...args: unknown[]) => console.warn('[SANDBOX]', ...args),
      error: (...args: unknown[]) => console.error('[SANDBOX]', ...args),
    };
  }

  private async timeoutAfter<T>(ms: number): Promise<T> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Sandbox execution timeout')), ms)
    );
  }
}
```

### 4.2 API Key Management

**Purpose:** Securely manage API keys (user's key vs service key)

```typescript
// src/spreadsheet/security/ApiKeyManager.ts
export interface ApiKeyConfig {
  // Storage
  storagePath: string;
  encryptionEnabled: boolean;

  // Keys
  userApiKey?: string; // User's OpenAI key
  serviceApiKey: string; // POLLN service key
}

export class ApiKeyManager {
  private config: ApiKeyConfig;
  private crypto: CryptoService;

  constructor(config: ApiKeyConfig) {
    this.config = config;
    this.crypto = new CryptoService();
  }

  /**
   * Get API key for LLM calls
   * Priority: User key > Service key
   */
  async getLLMApiKey(): Promise<string> {
    if (this.config.userApiKey) {
      return this.decryptKey(this.config.userApiKey);
    }

    return this.config.serviceApiKey;
  }

  /**
   * Get service API key
   */
  async getServiceApiKey(): Promise<string> {
    return this.config.serviceApiKey;
  }

  /**
   * Set user API key (encrypted)
   */
  async setUserApiKey(apiKey: string): Promise<void> {
    if (this.config.encryptionEnabled) {
      this.config.userApiKey = await this.crypto.encrypt(apiKey);
    } else {
      this.config.userApiKey = apiKey;
    }
  }

  /**
   * Remove user API key
   */
  async removeUserApiKey(): Promise<void> {
    this.config.userApiKey = undefined;
  }

  private async decryptKey(encryptedKey: string): Promise<string> {
    if (this.config.encryptionEnabled) {
      return await this.crypto.decrypt(encryptedKey);
    }
    return encryptedKey;
  }
}

export class CryptoService {
  private key: string;

  constructor(encryptionKey?: string) {
    this.key = encryptionKey || this.generateKey();
  }

  async encrypt(data: string): Promise<string> {
    // Use AES-256-GCM or similar
    throw new Error('Not implemented');
  }

  async decrypt(encryptedData: string): Promise<string> {
    // Decrypt data
    throw new Error('Not implemented');
  }

  private generateKey(): string {
    // Generate encryption key
    throw new Error('Not implemented');
  }
}
```

### 4.3 Data Boundaries

**Purpose:** Define what data stays local vs. goes to cloud

```typescript
// src/spreadsheet/security/DataBoundaries.ts
export interface DataBoundaryConfig {
  // Local-only data
  localOnlyFields: string[];

  // Cloud-bound data
  cloudFields: string[];

  // Sensitive data patterns
  sensitivePatterns: RegExp[];

  // Anonymization
  anonymizeLocalData: boolean;
}

export class DataBoundaries {
  private config: DataBoundaryConfig;

  constructor(config: Partial<DataBoundaryConfig> = {}) {
    this.config = {
      localOnlyFields: ['ssn', 'credit-card', 'password'],
      cloudFields: ['agent-config', 'execution-stats'],
      sensitivePatterns: [
        /\d{3}-\d{2}-\d{4}/, // SSN
        /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/, // Credit card
        /password/i,
      ],
      anonymizeLocalData: true,
      ...config,
    };
  }

  /**
   * Check if data should stay local
   */
  shouldStayLocal(fieldName: string, value: unknown): boolean {
    // Check local-only fields
    if (this.config.localOnlyFields.includes(fieldName)) {
      return true;
    }

    // Check sensitive patterns
    if (typeof value === 'string') {
      for (const pattern of this.config.sensitivePatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if data can go to cloud
   */
  canGoToCloud(fieldName: string, value: unknown): boolean {
    return !this.shouldStayLocal(fieldName, value);
  }

  /**
   * Anonymize data for cloud
   */
  anonymize(fieldName: string, value: unknown): unknown {
    if (!this.shouldStayLocal(fieldName, value)) {
      return value;
    }

    // Anonymize
    if (typeof value === 'string') {
      return this.hashString(value);
    }

    return '[REDACTED]';
  }

  private hashString(str: string): string {
    // Use SHA-256 or similar
    throw new Error('Not implemented');
  }
}
```

### 4.4 Audit Logging

**Purpose:** Log all agent decisions for inspectability

```typescript
// src/spreadsheet/security/AuditLogger.ts
export interface AuditEvent {
  id: string;
  timestamp: number;

  // Event type
  type: AuditEventType;

  // Actor
  agentId: string;
  cellRef: string;

  // Data
  inputs: Record<string, CellValue>;
  output: CellValue;

  // Execution
  executionTimeMs: number;
  modelUsed: string;

  // A2A package trace
  causalChainId: string;
  packageIds: string[];

  // Metadata
  metadata: Record<string, unknown>;
}

export type AuditEventType =
  | 'agent_spawned'
  | 'agent_executed'
  | 'agent_distilled'
  | 'agent_pruned'
  | 'error';

export class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents: number = 10000;

  /**
   * Log audit event
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...event,
    };

    this.events.push(auditEvent);

    // Trim if needed
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * Get audit trail for agent
   */
  getAgentTrail(agentId: string): AuditEvent[] {
    return this.events.filter(e => e.agentId === agentId);
  }

  /**
   * Get audit trail for cell
   */
  getCellTrail(cellRef: string): AuditEvent[] {
    return this.events.filter(e => e.cellRef === cellRef);
  }

  /**
   * Get causal chain trace
   */
  getCausalChainTrace(causalChainId: string): AuditEvent[] {
    return this.events.filter(e => e.causalChainId === causalChainId);
  }

  /**
   * Export audit log
   */
  export(format: 'json' | 'csv'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.events, null, 2);

      case 'csv':
        return this.toCsv();

      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private toCsv(): string {
    const headers = ['id', 'timestamp', 'type', 'agentId', 'cellRef', 'inputs', 'output', 'executionTimeMs', 'modelUsed', 'causalChainId'];
    const rows = this.events.map(e => [
      e.id,
      e.timestamp,
      e.type,
      e.agentId,
      e.cellRef,
      JSON.stringify(e.inputs),
      JSON.stringify(e.output),
      e.executionTimeMs,
      e.modelUsed,
      e.causalChainId,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}
```

---

## 5. Performance Considerations

### 5.1 Latency Budgets

```typescript
// src/spreadsheet/performance/PerformanceTargets.ts
export interface PerformanceTargets {
  // Initial response
  initialResponseTargetMs: number;
  initialResponseMaxMs: number;

  // Updates
  updateResponseTargetMs: number;
  updateResponseMaxMs: number;

  // Streaming
  streamingChunkIntervalMs: number;

  // Distillation
  distillationTimeMaxMs: number;

  // Background tasks
  dreamingCycleIntervalMs: number;
  optimizationCycleIntervalMs: number;
}

export const DEFAULT_PERFORMANCE_TARGETS: PerformanceTargets = {
  // Initial response: < 2s target, < 5s max
  initialResponseTargetMs: 2000,
  initialResponseMaxMs: 5000,

  // Updates: < 500ms target, < 2s max
  updateResponseTargetMs: 500,
  updateResponseMaxMs: 2000,

  // Streaming: every 100ms
  streamingChunkIntervalMs: 100,

  // Distillation: < 30s
  distillationTimeMaxMs: 30000,

  // Background: Every 5 minutes
  dreamingCycleIntervalMs: 300000,
  optimizationCycleIntervalMs: 300000,
};
```

### 5.2 Caching Strategy

```typescript
// src/spreadsheet/performance/CacheManager.ts
export interface CacheConfig {
  // Cache size
  maxCacheEntries: number;
  maxCacheSizeMB: number;

  // TTL
  defaultTTLMs: number;
  perAgentTTLMs: Map<string, number>;

  // Eviction policy
  evictionPolicy: 'lru' | 'lfu' | 'fifo';

  // Compression
  compressCachedValues: boolean;
}

export class CacheManager {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxCacheEntries: 1000,
      maxCacheSizeMB: 100,
      defaultTTLMs: 300000, // 5 minutes
      perAgentTTLMs: new Map(),
      evictionPolicy: 'lru',
      compressCachedValues: true,
      ...config,
    };
  }

  /**
   * Get cached value
   */
  async get(key: string): Promise<CellValue | null> {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access order for LRU
    if (this.config.evictionPolicy === 'lru') {
      this.updateAccessOrder(key);
    }

    // Decompress if needed
    if (entry.compressed) {
      return await this.decompress(entry.value);
    }

    return entry.value;
  }

  /**
   * Set cached value
   */
  async set(key: string, value: CellValue, ttl?: number): Promise<void> {
    // Check cache size
    await this.ensureCapacity();

    // Compress if enabled
    const compressed = this.config.compressCachedValues
      ? await this.compress(value)
      : value;

    const entry: CacheEntry = {
      key,
      value: compressed,
      originalValue: value,
      compressed: this.config.compressCachedValues,
      ttl: ttl || this.config.defaultTTLMs,
      createdAt: Date.now(),
      accessCount: 0,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Invalidate cache entries
   */
  invalidate(agentId?: string): void {
    if (agentId) {
      // Invalidate all entries for agent
      for (const [key, entry] of this.cache) {
        if (key.startsWith(`${agentId}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Invalidate all
      this.cache.clear();
    }
  }

  private async ensureCapacity(): Promise<void> {
    // Check if need to evict
    while (this.cache.size >= this.config.maxCacheEntries) {
      await this.evictOne();
    }
  }

  private async evictOne(): Promise<void> {
    let keyToEvict: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder.shift() || null;
        break;

      case 'lfu':
        // Find least frequently used
        let minAccess = Infinity;
        for (const [key, entry] of this.cache) {
          if (entry.accessCount < minAccess) {
            minAccess = entry.accessCount;
            keyToEvict = key;
          }
        }
        break;

      case 'fifo':
        // Evict oldest
        let oldestTime = Infinity;
        for (const [key, entry] of this.cache) {
          if (entry.createdAt < oldestTime) {
            oldestTime = entry.createdAt;
            keyToEvict = key;
          }
        }
        break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
    }
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private async compress(value: CellValue): Promise<string> {
    // Use compression
    throw new Error('Not implemented');
  }

  private async decompress(value: string): Promise<CellValue> {
    // Use decompression
    throw new Error('Not implemented');
  }
}

interface CacheEntry {
  key: string;
  value: CellValue | string;
  originalValue?: CellValue;
  compressed: boolean;
  ttl: number;
  createdAt: number;
  accessCount: number;
}
```

### 5.3 Background Processing

```typescript
// src/spreadsheet/optimization/DreamingScheduler.ts
export interface DreamingScheduleConfig {
  // Schedule
  intervalMs: number;

  // Selection
  minExecutionCount: number;
  minValueFunction: number;

  // Execution
  maxConcurrentDreams: number;
  dreamTimeoutMs: number;
}

export class DreamingScheduler {
  private config: DreamingScheduleConfig;
  private scheduler: AgentScheduler;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    scheduler: AgentScheduler,
    config: Partial<DreamingScheduleConfig> = {}
  ) {
    this.scheduler = scheduler;
    this.config = {
      intervalMs: 300000, // 5 minutes
      minExecutionCount: 50,
      minValueFunction: 0.3,
      maxConcurrentDreams: 3,
      dreamTimeoutMs: 60000, // 1 minute
      ...config,
    };
  }

  /**
   * Start dreaming scheduler
   */
  start(): void {
    this.intervalId = setInterval(() => {
      this.runDreamingCycle();
    }, this.config.intervalMs);
  }

  /**
   * Stop dreaming scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Run dreaming cycle
   */
  private async runDreamingCycle(): Promise<void> {
    // Find agents that should dream
    const agentsToDream = await this.findAgentsToDream();

    // Run dreaming in parallel
    const promises = agentsToDream.slice(0, this.config.maxConcurrentDreams)
      .map(agent => this.runDreaming(agent));

    await Promise.allSettled(promises);
  }

  private async findAgentsToDream(): Promise<SpreadsheetAgent[]> {
    // Get all agents
    const agents = await this.scheduler.getAllAgents();

    // Filter by criteria
    return agents.filter(agent => {
      const stats = agent.getStats();

      return (
        stats.executionCount >= this.config.minExecutionCount &&
        stats.valueFunction >= this.config.minValueFunction
      );
    });
  }

  private async runDreaming(agent: SpreadsheetAgent): Promise<void> {
    // Run dreaming with timeout
    await Promise.race([
      agent.dream(),
      this.timeoutAfter(this.config.dreamTimeoutMs),
    ]);
  }

  private async timeoutAfter(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Dreaming timeout')), ms)
    );
  }
}
```

---

## 6. Testing Strategy

### 6.1 Unit Test Coverage Goals

```typescript
// src/spreadsheet/__tests__/coverage.config.ts
export const COVERAGE_TARGETS = {
  // Minimum coverage percentage
  statements: 80,
  branches: 75,
  functions: 80,
  lines: 80,

  // Per-module targets
  modules: {
    'bridge': 90,
    'agents': 85,
    'cells': 85,
    'persistence': 80,
    'communication': 75,
    'formulas': 90,
    'optimization': 70,
    'security': 85,
  },
};
```

### 6.2 Integration Test Scenarios

```typescript
// src/spreadsheet/__tests__/integration/scenarios.ts
export const INTEGRATION_TEST_SCENARIOS = [
  {
    name: 'Agent Lifecycle',
    description: 'Test spawning, executing, and pruning agents',
    steps: [
      'Spawn agent for cell A1',
      'Execute agent with test input',
      'Verify result written to cell',
      'Wait for idle timeout',
      'Verify agent pruned',
    ],
  },

  {
    name: 'Cell Dependency Propagation',
    description: 'Test updates propagate through dependencies',
    steps: [
      'Create agent in A1 that reads B1',
      'Create agent in B1 that reads C1',
      'Update C1',
      'Verify B1 updates',
      'Verify A1 updates',
    ],
  },

  {
    name: 'Incremental Distillation',
    description: 'Test agent distillation after threshold',
    steps: [
      'Spawn agent',
      'Execute agent 100 times with varied inputs',
      'Verify distillation triggered',
      'Verify distilled model accuracy > 95%',
      'Verify speedup > 2x',
    ],
  },

  {
    name: 'Background Dreaming',
    description: 'Test dreaming cycle improves performance',
    steps: [
      'Spawn agent with dreaming enabled',
      'Execute agent 50 times',
      'Wait for dreaming cycle',
      'Verify policy improved',
      'Verify subsequent executions faster',
    ],
  },

  {
    name: 'Security Isolation',
    description: 'Test sandbox prevents malicious code',
    steps: [
      'Spawn agent with malicious code',
      'Verify sandbox blocks file system access',
      'Verify sandbox blocks network access',
      'Verify sandbox blocks process spawning',
    ],
  },
];
```

### 6.3 E2E Test Automation

```typescript
// src/spreadsheet/__tests__/e2e/automation.ts
export class E2ETestAutomation {
  /**
   * Run E2E test for Excel
   */
  async testExcelIntegration(): Promise<void> {
    // Launch Excel with add-in
    const excel = await launchExcelWithAddin();

    try {
      // Load test spreadsheet
      await excel.loadWorkbook('./test-data/test-workbook.xlsx');

      // Test agent formula
      await excel.setCell('A1', '=POLLN_AGENT("Summarize", B1)');
      await excel.setCell('B1', 'Test input text');

      // Wait for result
      await excel.waitForCalculation();

      // Verify result
      const result = await excel.getCell('A1');
      assert(typeof result === 'string');
      assert(result.length > 0);

    } finally {
      await excel.close();
    }
  }

  /**
   * Run E2E test for Google Sheets
   */
  async testGoogleSheetsIntegration(): Promise<void> {
    // Deploy Apps Script
    const script = await deployAppsScript('./dist/google-sheets');

    try {
      // Open test spreadsheet
      const sheet = await openGoogleSheet(spreadsheetId);

      // Test agent formula
      await sheet.setCell('A1', '=POLLN_AGENT("Summarize", B1)');
      await sheet.setCell('B1', 'Test input text');

      // Wait for result
      await sheet.waitForCalculation();

      // Verify result
      const result = await sheet.getCell('A1');
      assert(typeof result === 'string');
      assert(result.length > 0);

    } finally {
      await script.cleanup();
    }
  }
}
```

### 6.4 Performance Benchmarks

```typescript
// src/spreadsheet/__tests__/performance/benchmarks.ts
export class PerformanceBenchmarks {
  /**
   * Benchmark initial response time
   */
  async benchmarkInitialResponse(): Promise<BenchmarkResult> {
    const times: number[] = [];

    for (let i = 0; i < 10; i++) {
      const start = Date.now();

      // Spawn new agent and execute
      const agent = await spawnAgent('test-agent');
      await agent.execute({ input: 'test' });

      const elapsed = Date.now() - start;
      times.push(elapsed);
    }

    return {
      metric: 'initial_response_ms',
      samples: times,
      mean: mean(times),
      p50: percentile(times, 50),
      p95: percentile(times, 95),
      p99: percentile(times, 99),
      target: DEFAULT_PERFORMANCE_TARGETS.initialResponseTargetMs,
      max: DEFAULT_PERFORMANCE_TARGETS.initialResponseMaxMs,
    };
  }

  /**
   * Benchmark update response time
   */
  async benchmarkUpdateResponse(): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Spawn agent and warm up
    const agent = await spawnAgent('test-agent');
    for (let i = 0; i < 10; i++) {
      await agent.execute({ input: `test-${i}` });
    }

    // Benchmark updates
    for (let i = 0; i < 50; i++) {
      const start = Date.now();
      await agent.execute({ input: `test-${i}` });
      const elapsed = Date.now() - start;
      times.push(elapsed);
    }

    return {
      metric: 'update_response_ms',
      samples: times,
      mean: mean(times),
      p50: percentile(times, 50),
      p95: percentile(times, 95),
      p99: percentile(times, 99),
      target: DEFAULT_PERFORMANCE_TARGETS.updateResponseTargetMs,
      max: DEFAULT_PERFORMANCE_TARGETS.updateResponseMaxMs,
    };
  }

  /**
   * Benchmark distillation speedup
   */
  async benchmarkDistillationSpeedup(): Promise<BenchmarkResult> {
    // Train agent
    const agent = await spawnAgent('test-agent');
    for (let i = 0; i < 200; i++) {
      await agent.execute({ input: `test-${i}` });
    }

    // Measure LLM time
    const llmTimes: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      await agent.executeWithLLM({ input: `bench-${i}` });
      llmTimes.push(Date.now() - start);
    }

    // Distill
    await agent.distill();

    // Measure distilled time
    const distilledTimes: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      await agent.executeWithDistilled({ input: `bench-${i}` });
      distilledTimes.push(Date.now() - start);
    }

    const speedup = mean(llmTimes) / mean(distilledTimes);

    return {
      metric: 'distillation_speedup',
      samples: distilledTimes,
      mean: mean(distilledTimes),
      speedup: speedup,
      target: 2.0, // 2x speedup target
      llmMean: mean(llmTimes),
      distilledMean: mean(distilledTimes),
    };
  }
}

interface BenchmarkResult {
  metric: string;
  samples: number[];
  mean: number;
  p50?: number;
  p95?: number;
  p99?: number;
  target?: number;
  max?: number;
  speedup?: number;
  llmMean?: number;
  distilledMean?: number;
}
```

---

## 7. Development Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Basic spreadsheet integration

- [ ] Implement `ISpreadsheetBridge` interface
- [ ] Create `ExcelBridge` implementation
- [ ] Create `GoogleSheetsBridge` implementation
- [ ] Implement basic `SpreadsheetAgent`
- [ ] Create `POLLN_AGENT` formula
- [ ] Add unit tests for bridge layer

### Phase 2: Agent Lifecycle (Weeks 3-4)
**Goal:** Full agent management

- [ ] Implement `AgentLifecycleManager`
- [ ] Add agent spawning/despawning
- [ ] Implement cell-to-agent binding
- [ ] Add dependency resolution
- [ ] Implement update propagation
- [ ] Add integration tests

### Phase 3: State Persistence (Weeks 5-6)
**Goal:** Reliable state management

- [ ] Implement `StatePersistence`
- [ ] Add local storage backend
- [ ] Add cloud storage backend
- [ ] Implement encryption
- [ ] Add compression
- [ ] Add persistence tests

### Phase 4: Optimization (Weeks 7-8)
**Goal:** Performance improvements

- [ ] Implement caching strategy
- [ ] Add incremental distillation
- [ ] Implement dreaming scheduler
- [ ] Add performance benchmarks
- [ ] Optimize critical paths

### Phase 5: Security (Weeks 9-10)
**Goal:** Secure and isolated execution

- [ ] Implement sandbox
- [ ] Add API key management
- [ ] Implement data boundaries
- [ ] Add audit logging
- [ ] Security audit

### Phase 6: Polish (Weeks 11-12)
**Goal:** Production-ready

- [ ] E2E testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deployment guides
- [ ] User feedback iteration

---

## 8. Appendix

### 8.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Interface Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│  │   Excel     │  │Google Sheets│  │     Airtable        │    │
│  │  Add-in     │  │   Add-on    │  │    Extension        │    │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘    │
└─────────┼─────────────────┼────────────────────┼───────────────┘
          │                 │                    │
          └─────────────────┼────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Spreadsheet Bridge Layer                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Platform-Agnostic Bridge Interface               │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│  │   Cell     │  │  Formula   │  │      Event               │ │
│  │ Operations │  │  Registry  │  │    Handling               │ │
│  └────────────┘  └────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POLLN Spreadsheet Adapter                    │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│  │   Agent    │  │    Cell    │  │     State                │ │
│  │ Lifecycle  │  │  Binding   │  │  Persistence              │ │
│  └────────────┘  └────────────┘  └──────────────────────────┘ │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│  │ Incremental│  │ Background │  │      Security             │ │
│  │Distillation│  │ Optimizing │  │      & Isolation          │ │
│  └────────────┘  └────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       POLLN Core Library                        │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│  │   Agent    │  │   Colony   │  │      A2A                 │ │
│  │  System    │  │ Management │  │   Communication           │ │
│  └────────────┘  └────────────┘  └──────────────────────────┘ │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│  │  Plinko    │  │ WorldModel │  │     Dreaming              │ │
│  │  Decision  │  │    & VAE   │  │      System               │ │
│  └────────────┘  └────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐ │
│  │   LLM      │  │  Storage   │  │     Colony                │ │
│  │  Provider  │  │  Backend   │  │     Server                │ │
│  └────────────┘  └────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                        Module Dependencies                       │
│                                                                  │
│   spreadsheet/bridge/                                          │
│       ├── ISpreadsheetBridge.ts (interface)                     │
│       ├── ExcelBridge.ts                                       │
│       │   └── depends on: ISpreadsheetBridge                   │
│       ├── GoogleSheetsBridge.ts                                │
│       │   └── depends on: ISpreadsheetBridge                   │
│       └── AirtableBridge.ts                                    │
│           └── depends on: ISpreadsheetBridge                   │
│                                                                  │
│   spreadsheet/agents/                                          │
│       ├── SpreadsheetAgent.ts                                  │
│       │   └── depends on: core/agent.ts, core/types.ts         │
│       ├── AgentLifecycleManager.ts                             │
│       │   ├── depends on: SpreadsheetAgent                     │
│       │   ├── depends on: AgentScheduler                       │
│       │   └── depends on: AgentDistiller                       │
│       ├── AgentScheduler.ts                                    │
│       │   └── depends on: SpreadsheetAgent                     │
│       └── AgentDistiller.ts                                    │
│           └── depends on: SpreadsheetAgent                     │
│                                                                  │
│   spreadsheet/cells/                                           │
│       ├── CellBinding.ts                                       │
│       │   └── depends on: agents/SpreadsheetAgent              │
│       ├── CellDependencyGraph.ts                               │
│       │   └── depends on: (none)                               │
│       └── CellUpdatePropagation.ts                             │
│           ├── depends on: CellBinding                          │
│           └── depends on: CellDependencyGraph                  │
│                                                                  │
│   spreadsheet/persistence/                                     │
│       ├── StatePersistence.ts                                  │
│       │   ├── depends on: LocalStorageBackend                  │
│       │   ├── depends on: CloudStorageBackend                  │
│       │   └── depends on: CryptoService                        │
│       ├── LocalStorageBackend.ts                                │
│       │   └── depends on: (none)                               │
│       ├── CloudStorageBackend.ts                               │
│       │   └── depends on: (none)                               │
│       └── CryptoService.ts                                     │
│           └── depends on: (none)                               │
│                                                                  │
│   spreadsheet/communication/                                   │
│       ├── ColonyChannel.ts                                     │
│       │   └── depends on: MessageProtocol                      │
│       ├── MessageProtocol.ts                                   │
│       │   └── depends on: core/communication.ts                │
│       └── EventStream.ts                                       │
│           └── depends on: (none)                               │
│                                                                  │
│   spreadsheet/formulas/                                        │
│       ├── POLLN_AGENT.ts                                       │
│       │   ├── depends on: agents/AgentLifecycleManager         │
│       │   └── depends on: FormulaRegistry                      │
│       ├── POLLN_BATCH.ts                                       │
│       │   ├── depends on: agents/AgentScheduler                │
│       │   └── depends on: FormulaRegistry                      │
│       ├── POLLN_OPTIMIZE.ts                                    │
│       │   ├── depends on: optimization/DreamingScheduler        │
│       │   └── depends on: FormulaRegistry                      │
│       └── FormulaRegistry.ts                                   │
│           └── depends on: bridge/ISpreadsheetBridge             │
│                                                                  │
│   spreadsheet/optimization/                                    │
│       ├── DreamingScheduler.ts                                 │
│       │   ├── depends on: agents/SpreadsheetAgent              │
│       │   └── depends on: core/dreaming.ts                     │
│       ├── IncrementalDistiller.ts                              │
│       │   ├── depends on: agents/AgentDistiller                │
│       │   └── depends on: core/dreaming.ts                     │
│       └── PolicyOptimizer.ts                                   │
│           └── depends on: core/dreaming.ts                     │
│                                                                  │
│   spreadsheet/security/                                        │
│       ├── Sandbox.ts                                           │
│       │   └── depends on: (none)                               │
│       ├── ApiKeyManager.ts                                     │
│       │   └── depends on: CryptoService                        │
│       ├── DataBoundaries.ts                                    │
│       │   └── depends on: (none)                               │
│       └── AuditLogger.ts                                       │
│           └── depends on: core/communication.ts                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 File Tree for New Code

```
src/spreadsheet/
├── index.ts                        # Main entry point
├── types.ts                        # Spreadsheet-specific types
│
├── bridge/                         # Platform-specific bridges
│   ├── ISpreadsheetBridge.ts       # Bridge interface
│   ├── ExcelBridge.ts              # Excel JavaScript API
│   ├── GoogleSheetsBridge.ts       # Google Sheets Apps Script
│   ├── AirtableBridge.ts           # Airtable API
│   └── BridgeFactory.ts           # Bridge factory
│
├── agents/                         # Agent lifecycle management
│   ├── SpreadsheetAgent.ts         # Spreadsheet agent wrapper
│   ├── AgentLifecycleManager.ts    # Spawn, distill, prune
│   ├── AgentScheduler.ts           # Dependency resolution
│   └── AgentDistiller.ts           # Incremental distillation
│
├── cells/                          # Cell-to-agent binding
│   ├── CellBinding.ts              # Agent-to-cell binding
│   ├── CellDependencyGraph.ts      # Dependency tracking
│   └── CellUpdatePropagation.ts    # Update propagation
│
├── persistence/                    # State persistence
│   ├── StatePersistence.ts         # Main persistence manager
│   ├── LocalStorageBackend.ts      # Local file storage
│   ├── CloudStorageBackend.ts      # Cloud storage (AWS/GCP/Azure)
│   └── CryptoService.ts            # Encryption/decryption
│
├── communication/                  # Colony communication
│   ├── ColonyChannel.ts            # WebSocket channel to colony
│   ├── MessageProtocol.ts          # Message protocol
│   └── EventStream.ts              # Event streaming
│
├── formulas/                       # Custom formulas
│   ├── POLLN_AGENT.ts              # =POLLN_AGENT(type, inputs...)
│   ├── POLLN_BATCH.ts              # =POLLN_BATCH(cells...)
│   ├── POLLN_OPTIMIZE.ts           # =POLLN_OPTIMIZE(cell)
│   └── FormulaRegistry.ts          # Formula registry
│
├── optimization/                   # Background optimization
│   ├── DreamingScheduler.ts        # Dreaming cycle scheduler
│   ├── IncrementalDistiller.ts     # Incremental distillation
│   └── PolicyOptimizer.ts          # Policy optimization
│
└── security/                       # Security & isolation
    ├── Sandbox.ts                  # Execution sandbox
    ├── ApiKeyManager.ts            # API key management
    ├── DataBoundaries.ts           # Data boundary enforcement
    └── AuditLogger.ts              # Audit logging
```

### 8.4 API Contracts (Interfaces)

```typescript
// ============================================================================
// MAIN SPREADSHEET API
// ============================================================================

export interface POLLNSpreadsheet {
  // Agent management
  spawnAgent(config: SpreadsheetAgentConfig): Promise<string>;
  despawnAgent(agentId: string): Promise<void>;
  executeAgent(agentId: string, inputs: Record<string, CellValue>): Promise<FunctionResult>;

  // Cell binding
  bindAgentToCell(agentId: string, cellRef: string): Promise<void>;
  unbindAgentFromCell(cellRef: string): Promise<void>;
  getBoundAgent(cellRef: string): Promise<string | null>;

  // State management
  saveState(agentId: string): Promise<void>;
  loadState(agentId: string): Promise<AgentStateSnapshot | null>;
  exportState(agentId: string): Promise<string>;
  importState(data: string): Promise<void>;

  // Optimization
  distillAgent(agentId: string): Promise<DistillationResult>;
  optimizeAgent(agentId: string): Promise<OptimizationResult>;

  // Configuration
  configure(config: Partial<SpreadsheetConfig>): Promise<void>;
  getConfig(): SpreadsheetConfig;

  // Events
  on(event: SpreadsheetEvent, callback: (...args: unknown[]) => void): void;
  off(event: SpreadsheetEvent, callback: (...args: unknown[]) => void): void;
}

export type SpreadsheetEvent =
  | 'agent:spawned'
  | 'agent:executed'
  | 'agent:distilled'
  | 'agent:pruned'
  | 'cell:updated'
  | 'error';

export interface SpreadsheetConfig {
  // Bridge
  platform: SpreadsheetPlatform;

  // Performance
  maxConcurrentAgents: number;
  enableCaching: boolean;
  enableStreaming: boolean;

  // Optimization
  enableDistillation: boolean;
  enableDreaming: boolean;

  // Security
  enableSandbox: boolean;
  encryptionEnabled: boolean;

  // Communication
  wsUrl: string;
  apiKey: string;
}

// ============================================================================
// FORMULA API CONTRACTS
// ============================================================================

/**
 * =POLLN_AGENT(type, [inputs], [options])
 *
 * Spawns or executes an agent in a cell
 *
 * @param type - Agent type (e.g., "Summarizer", "Analyzer")
 * @param inputs - Input cells or values
 * @param options - Optional configuration
 * @returns Agent output
 */
export interface POLLN_AGENT_Params {
  type: string;
  inputs?: CellValue | CellValue[] | Record<string, CellValue>;
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface POLLN_AGENT_Result {
  value: CellValue;
  metadata: {
    agentId: string;
    executionTime: number;
    cacheHit: boolean;
    modelUsed: string;
  };
}

/**
 * =POLLN_BATCH(range, [options])
 *
 * Executes agents on a range of cells in parallel
 *
 * @param range - Cell range to process
 * @param options - Optional configuration
 * @returns Array of results
 */
export interface POLLN_BATCH_Params {
  range: string;
  options?: {
    agentType?: string;
    parallel?: boolean;
    maxParallel?: number;
  };
}

export interface POLLN_BATCH_Result {
  results: Array<{
    cellRef: string;
    value: CellValue;
    error?: string;
  }>;
  metadata: {
    totalTime: number;
    successCount: number;
    errorCount: number;
  };
}

/**
 * =POLLN_OPTIMIZE(cell, [options])
 *
 * Triggers optimization for an agent
 *
 * @param cell - Cell reference with agent
 * @param options - Optional configuration
 * @returns Optimization result
 */
export interface POLLN_OPTIMIZE_Params {
  cell: string;
  options?: {
    distill?: boolean;
    dream?: boolean;
    force?: boolean;
  };
}

export interface POLLN_OPTIMIZE_Result {
  success: boolean;
  distillation?: {
    accuracy: number;
    speedup: number;
  };
  dreaming?: {
    improvement: number;
    episodes: number;
  };
  error?: string;
}
```

### 8.5 Database Schema

**Note:** No traditional database is used. State is stored in:

1. **Local Storage:** File-based storage for agent states
   ```
   .polln-spreadsheet-state/
   ├── agents/
   │   ├── {agentId}.json          # Agent state snapshot
   │   └── ...
   ├── cache/
   │   ├── {agentId}/
   │   │   ├── cache.json          # Result cache
   │   │   └── distilled.json      # Distilled model
   │   └── ...
   ├── audit/
   │   └── audit.log               # Audit log
   └── config/
       └── config.json             # Global config
   ```

2. **Cloud Storage:** Encrypted backups and synchronization
   ```
   polln-spreadsheet-cloud/
   ├── agents/
   │   ├── {gardenerId}/
   │   │   ├── {agentId}.json.enc
   │   │   └── ...
   │   └── ...
   └── backups/
       ├── {timestamp}.tar.gz.enc
       └── ...
   ```

### 8.6 Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        Security Layers                          │
│                                                                  │
│  Layer 1: User Authentication                                   │
│  ├── API key validation (user key or service key)               │
│  ├── Gardener ID verification                                   │
│  └── Session management                                         │
│                                                                  │
│  Layer 2: Sandbox Isolation                                     │
│  ├── Restricted execution context                               │
│  ├── Resource limits (CPU, memory, time)                        │
│  ├── Blocked modules (fs, child_process, net)                   │
│  └── Safe console output                                        │
│                                                                  │
│  Layer 3: Data Boundaries                                       │
│  ├── Local-only data detection                                  │
│  ├── Sensitive pattern detection                                │
│  ├── Data anonymization                                         │
│  └── Cloud upload filtering                                     │
│                                                                  │
│  Layer 4: Audit Logging                                         │
│  ├── All agent executions logged                                │
│  ├── A2A package tracing                                       │
│  ├── Causal chain tracking                                      │
│  └── Exportable audit trail                                     │
│                                                                  │
│  Layer 5: Encryption                                            │
│  ├── Local state encryption (AES-256)                           │
│  ├── Cloud storage encryption                                   │
│  ├── API key encryption                                         │
│  └── Secure key derivation                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.7 Performance Targets

| Metric | Target | Max | Notes |
|--------|--------|-----|-------|
| Initial Response | 2s | 5s | First agent execution |
| Update Response | 500ms | 2s | Subsequent executions |
| Streaming Chunk | 100ms | 500ms | For long-running agents |
| Distillation Time | 10s | 30s | After threshold reached |
| Dreaming Cycle | 5min | 10min | Background optimization |
| Cache Hit Rate | 80% | 60% | For repeated inputs |
| Distillation Speedup | 2x | 1.5x | Distilled vs LLM |
| Memory per Agent | 50MB | 100MB | Agent state + cache |
| Concurrent Agents | 10 | 20 | Parallel execution |

---

## Conclusion

This technical specification provides a comprehensive blueprint for building the POLLN spreadsheet integration MVP. The architecture is designed to be:

1. **Modular:** Each component can be developed and tested independently
2. **Extensible:** Easy to add new platforms, agent types, and optimizations
3. **Performant:** Meets latency budgets through caching, distillation, and parallel execution
4. **Secure:** Multiple layers of isolation, encryption, and audit logging
5. **Inspectable:** Full traceability via A2A packages and audit logs

The phased development approach allows for incremental delivery of value, starting with basic agent execution and evolving to a fully optimized, distributed system.

**Next Steps:**
1. Review and approve technical specifications
2. Begin Phase 1 implementation (Foundation)
3. Set up development and testing infrastructure
4. Iterate based on feedback and testing results
