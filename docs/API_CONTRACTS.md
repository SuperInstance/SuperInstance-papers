# SuperInstance API Contracts

**Project:** SuperInstance Ecosystem - Cross-Repository Communication Protocols
**Repositories:** claw/, spreadsheet-moment/, papers/
**Version:** 1.0.0
**Last Updated:** 2026-03-15

---

## Table of Contents

1. [Overview](#overview)
2. [Communication Architecture](#communication-architecture)
3. [Message Protocol](#message-protocol)
4. [WebSocket API](#websocket-api)
5. [HTTP REST API](#http-rest-api)
6. [TypeScript Interfaces](#typescript-interfaces)
7. [Event System](#event-system)
8. [Error Handling](#error-handling)
9. [Security](#security)
10. [Performance](#performance)

---

## Overview

### Purpose

This document defines the API contracts between repositories in the SuperInstance ecosystem:

- **claw/**: Minimal cellular agent engine
- **spreadsheet-moment/**: Univer-based spreadsheet platform
- **papers/**: Research and algorithms

### Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    spreadsheet-moment/                          │
│                   (Univer + React + TS)                         │
│                                                                  │
│  ┌────────────────┐              ┌─────────────────┐           │
│  │  Frontend UI   │              │  Backend Node   │           │
│  │  • Reasoning   │◄────WebSocket►│  • API Router   │           │
│  │  • HITL        │              │  • Auth         │           │
│  │  • Editor      │              │  • Validation   │           │
│  └────────────────┘              └────────┬─────────┘           │
│                                           │                      │
│                                           │ HTTP/gRPC            │
│                                           ▼                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   claw/ Engine                         │   │
│  │  • Agent processing                                    │   │
│  │  • Model inference                                      │   │
│  │  • Seed learning                                        │   │
│  │  • Equipment management                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                           │                      │
│                                           │ (Optional)           │
│                                           ▼                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Rust Backend (Optional)                    │   │
│  │  • GPU acceleration (10-1000x)                          │   │
│  │  • Memory optimization                                  │   │
│  │  • Batch processing                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**: Each repo has clear responsibility
2. **Loose Coupling**: Minimal dependencies between repos
3. **Type Safety**: Shared TypeScript interfaces
4. **Performance**: Binary protocol for high-throughput scenarios
5. **Scalability**: Support for 10,000+ concurrent cells

---

## Communication Architecture

### Deployment Modes

#### Mode 1: Embedded (Default)

```
spreadsheet-moment/ Node.js backend
  └─> claw/ imported as npm package
  └─> In-process communication
  └─> Fastest (<10ms overhead)
  └─> Single deployment
```

**Use Case:** Development, small deployments (<1000 cells)

#### Mode 2: Separate Process

```
spreadsheet-moment/ Node.js backend
  └─> HTTP/gRPC → claw/ Node.js service
  └─> Separate deployments
  └─> Scalable
  └─> ~50ms latency
```

**Use Case:** Production, medium deployments (1000-10000 cells)

#### Mode 3: Rust Backend

```
spreadsheet-moment/ Node.js backend
  └─> HTTP/gRPC → Rust backend
      └─> claw/ embedded via Neon FFI
      └─> GPU acceleration
      └─> 10-1000x speedup
```

**Use Case:** Large deployments (>10000 cells), GPU workloads

### Communication Protocols

| Scenario | Protocol | Latency | Throughput | Use When |
|----------|----------|---------|------------|----------|
| UI Updates | WebSocket | <10ms | High | Real-time streaming |
| API Calls | HTTP/REST | 50-100ms | Medium | CRUD operations |
| Batch Processing | gRPC | 20-50ms | Very High | 1000+ cells |
| Direct Link | Neon FFI | <1ms | Highest | Rust backend |

---

## Message Protocol

### Message Envelope

All messages share a common envelope format:

```typescript
interface MessageEnvelope {
  // Metadata
  version: '1.0';
  traceId: string;
  timestamp: number;
  source: 'claw' | 'spreadsheet' | 'papers';
  target: 'claw' | 'spreadsheet' | 'papers';

  // Payload
  type: MessageType;
  payload: unknown;

  // Optional
  correlationId?: string;
  replyTo?: string;
  priority?: number;
  ttl?: number;
}
```

### Binary Protocol (High Performance)

For high-throughput scenarios (1000+ cells), use binary protocol:

```typescript
// Binary message format
interface BinaryMessage {
  // Header (16 bytes)
  version: Uint8;        // 1 byte
  messageType: Uint8;    // 1 byte
  priority: Uint8;       // 1 byte
  flags: Uint8;          // 1 byte
  traceId: Uint64;       // 8 bytes
  timestamp: Uint64;     // 8 bytes

  // Payload (variable length)
  payloadLength: Uint32; // 4 bytes
  payload: Uint8Array;   // N bytes
}

// Total: 28 bytes + N bytes payload
```

**Benefits:**
- 10x smaller than JSON
- Faster serialization/deserialization
- Better for GPU memory transfer

---

## WebSocket API

### Connection

```typescript
// Client connects to server
const ws = new WebSocket('ws://localhost:3001/claw');

// Handshake
ws.send(JSON.stringify({
  version: '1.0',
  type: 'handshake',
  payload: {
    clientType: 'spreadsheet',
    capabilities: ['streaming', 'binary', 'compression']
  }
}));

// Server acknowledges
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'handshake_ack') {
    console.log('Connected to Claw engine');
  }
};
```

### Message Types

#### From spreadsheet-moment/ to claw/

```typescript
// Subscribe to cell updates
interface SubscribeMessage {
  type: 'subscribe';
  payload: {
    cellId: string;
    sheetId: string;
    triggerType: 'change' | 'interval' | 'manual';
    options?: {
      throttle?: number;  // ms
      batch?: boolean;
      binary?: boolean;
    };
  };
}

// Unsubscribe from cell
interface UnsubscribeMessage {
  type: 'unsubscribe';
  payload: {
    cellId: string;
    sheetId: string;
  };
}

// Trigger claw processing
interface TriggerMessage {
  type: 'trigger';
  payload: {
    cellId: string;
    triggerData: {
      oldValue: unknown;
      newValue: unknown;
      timestamp: number;
    };
    context: {
      sheetId: string;
      workbookId: string;
    };
  };
}

// Human approval
interface ApprovalMessage {
  type: 'approval';
  payload: {
    traceId: string;
    approved: boolean;
    reason?: string;
  };
}

// Equipment change
interface EquipmentMessage {
  type: 'equipment';
  payload: {
    cellId: string;
    action: 'equip' | 'unequip';
    equipment: EquipmentSlot;
  };
}

// Relationship change
interface RelationshipMessage {
  type: 'relationship';
  payload: {
    fromCellId: string;
    toCellId: string;
    action: 'add' | 'remove';
    relationship: RelationshipType;
  };
}
```

#### From claw/ to spreadsheet-moment/

```typescript
// Reasoning step (streaming)
interface ReasoningStepMessage {
  type: 'reasoning_step';
  payload: {
    traceId: string;
    cellId: string;
    step: {
      number: number;
      content: string;
      confidence: number;
      timestamp: number;
    };
  };
}

// State change
interface StateChangeMessage {
  type: 'state_change';
  payload: {
    cellId: string;
    oldState: AgentCellState;
    newState: AgentCellState;
    reason?: string;
  };
}

// Approval required
interface ApprovalRequiredMessage {
  type: 'approval_required';
  payload: {
    traceId: string;
    cellId: string;
    action: unknown;
    reasoning: string;
    confidence: number;
    timeout: number;  // ms
  };
}

// Action completed
interface ActionCompletedMessage {
  type: 'action_completed';
  payload: {
    traceId: string;
    cellId: string;
    result: {
      success: boolean;
      output: unknown;
      confidence: number;
      processingTime: number;
    };
  };
}

// Error
interface ErrorMessage {
  type: 'error';
  payload: {
    traceId: string;
    cellId?: string;
    error: {
      code: string;
      message: string;
      details?: unknown;
    };
    retryable: boolean;
  };
}

// Batch update (for 1000+ cells)
interface BatchUpdateMessage {
  type: 'batch_update';
  payload: {
    updates: Array<{
      cellId: string;
      state: AgentCellState;
      lastActivity: number;
    }>;
  };
}
```

### WebSocket Lifecycle

```
1. CONNECT
   spreadsheet-moment/ → claw/
   { type: 'handshake', capabilities: [...] }

2. HANDSHAKE_ACK
   claw/ → spreadsheet-moment/
   { type: 'handshake_ack', serverInfo: {...} }

3. SUBSCRIBE
   spreadsheet-moment/ → claw/
   { type: 'subscribe', cellId: 'B2' }

4. SUBSCRIBE_ACK
   claw/ → spreadsheet-moment/
   { type: 'subscribe_ack', cellId: 'B2', status: 'ok' }

5. TRIGGER (when cell changes)
   spreadsheet-moment/ → claw/
   { type: 'trigger', cellId: 'B2', data: {...} }

6. REASONING_STEP (streaming)
   claw/ → spreadsheet-moment/
   { type: 'reasoning_step', step: {...} }
   { type: 'reasoning_step', step: {...} }
   { type: 'reasoning_step', step: {...} }

7. STATE_CHANGE
   claw/ → spreadsheet-moment/
   { type: 'state_change', newState: 'THINKING' }

8. APPROVAL_REQUIRED (if confidence low)
   claw/ → spreadsheet-moment/
   { type: 'approval_required', action: {...} }

9. APPROVAL
   spreadsheet-moment/ → claw/
   { type: 'approval', approved: true }

10. ACTION_COMPLETED
    claw/ → spreadsheet-moment/
    { type: 'action_completed', result: {...} }

11. UNSUBSCRIBE
    spreadsheet-moment/ → claw/
    { type: 'unsubscribe', cellId: 'B2' }

12. DISCONNECT
    Either side → connection closes
```

---

## HTTP REST API

### Base URL

```
Development: http://localhost:3001/api
Production:  https://api.superinstance.io/v1
```

### Authentication

```typescript
// JWT token in Authorization header
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### Endpoints

#### Claw Management

```typescript
// Create claw
POST /api/claws
Request: {
  cellId: string;
  config: ClawCellConfig;
}
Response: {
  id: string;
  status: 'created';
  claw: ClawSummary;
}

// Get claw
GET /api/claws/:id
Response: {
  id: string;
  config: ClawCellConfig;
  state: AgentCellState;
  metrics: ClawMetrics;
}

// List claws
GET /api/claws?sheetId=:sheetId
Response: {
  claws: ClawSummary[];
  total: number;
  page: number;
  pageSize: number;
}

// Update claw
PATCH /api/claws/:id
Request: {
  config: Partial<ClawCellConfig>;
}
Response: {
  id: string;
  status: 'updated';
  claw: ClawSummary;
}

// Delete claw
DELETE /api/claws/:id
Response: {
  id: string;
  status: 'deleted';
}

// Trigger claw
POST /api/claws/:id/trigger
Request: {
  data: unknown;
}
Response: {
  traceId: string;
  status: 'processing';
}
```

#### Equipment Management

```typescript
// Equip equipment
POST /api/claws/:id/equipment
Request: {
  equipment: EquipmentSlot;
  config?: unknown;
}
Response: {
  status: 'equipped';
  equipment: EquipmentSummary;
}

// Unequip equipment
DELETE /api/claws/:id/equipment/:slot
Response: {
  status: 'unequipped';
  muscleMemory?: unknown;
}

// List equipment
GET /api/claws/:id/equipment
Response: {
  equipment: EquipmentSummary[];
}
```

#### Relationship Management

```typescript
// Add relationship
POST /api/claws/:id/relationships
Request: {
  targetCellId: string;
  type: RelationshipType;
  strategy?: CoordinationStrategy;
}
Response: {
  status: 'added';
  relationship: RelationshipSummary;
}

// Remove relationship
DELETE /api/claws/:id/relationships/:targetId
Response: {
  status: 'removed';
}

// List relationships
GET /api/claws/:id/relationships
Response: {
  relationships: RelationshipSummary[];
}
```

#### State Management

```typescript
// Get state
GET /api/claws/:id/state
Response: {
  state: AgentCellState;
  confidence: number;
  lastActivity: number;
}

// Set state (manual override)
PUT /api/claws/:id/state
Request: {
  state: AgentCellState;
  reason?: string;
}
Response: {
  status: 'updated';
  state: AgentCellState;
}
```

#### Metrics & Monitoring

```typescript
// Get metrics
GET /api/claws/:id/metrics
Response: {
  processing: {
    totalTriggers: number;
    totalErrors: number;
    avgLatency: number;
    avgConfidence: number;
  };
  resources: {
    memoryBytes: number;
    cpuPercent: number;
  };
  costs: {
    totalCost: number;
    costPerTrigger: number;
    modelCosts: Record<string, number>;
  };
}

// Get batch metrics (for 1000+ claws)
GET /api/metrics/batch?cellIds=:ids
Response: {
  metrics: Array<{
    cellId: string;
    state: AgentCellState;
    lastActivity: number;
    errorRate: number;
  }>;
}
```

---

## TypeScript Interfaces

### Shared Types

```typescript
// @superinstance/shared-types

/**
 * Agent cell states
 */
export enum AgentCellState {
  DORMANT = 'DORMANT',
  THINKING = 'THINKING',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  POSTED = 'POSTED',
  ARCHIVED = 'ARCHIVED',
  ERROR = 'ERROR'
}

/**
 * Agent cell types
 */
export enum AgentCellType {
  SENSOR = 'SENSOR',
  ANALYZER = 'ANALYZER',
  CONTROLLER = 'CONTROLLER',
  ORCHESTRATOR = 'ORCHESTRATOR'
}

/**
 * Equipment slots
 */
export enum EquipmentSlot {
  MEMORY = 'MEMORY',
  REASONING = 'REASONING',
  CONSENSUS = 'CONSENSUS',
  SPREADSHEET = 'SPREADSHEET',
  DISTILLATION = 'DISTILLATION',
  PERCEPTION = 'PERCEPTION',
  COORDINATION = 'COORDINATION',
  COMMUNICATION = 'COMMUNICATION',
  SELF_IMPROVEMENT = 'SELF_IMPROVEMENT',
  MONITORING = 'MONITORING'
}

/**
 * Relationship types
 */
export enum RelationshipType {
  SLAVE = 'slave',
  COWORKER = 'coworker',
  PEER = 'peer',
  DELEGATE = 'delegate',
  OBSERVER = 'observer'
}

/**
 * Coordination strategies
 */
export enum CoordinationStrategy {
  PARALLEL = 'PARALLEL',
  SEQUENTIAL = 'SEQUENTIAL',
  CONSENSUS = 'CONSENSUS',
  MAJORITY_VOTE = 'MAJORITY_VOTE',
  WEIGHTED = 'WEIGHTED',
  PIPELINE = 'PIPELINE',
  MAP_REDUCE = 'MAP_REDUCE'
}

/**
 * Model providers
 */
export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek',
  CLOUDFLARE = 'cloudflare',
  GOOGLE = 'google',
  COHERE = 'cohere',
  MISTRAL = 'mistral',
  META = 'meta',
  REPLICATE = 'replicate',
  HUGGINGFACE = 'huggingface',
  CUSTOM = 'custom'
}

/**
 * Learning strategies
 */
export enum LearningStrategy {
  REINFORCEMENT = 'reinforcement',
  SUPERVISED = 'supervised',
  UNSUPERVISED = 'unsupervised',
  FEW_SHOT = 'few_shot'
}

/**
 * Trigger conditions
 */
export interface TriggerCondition {
  type: 'cell_change' | 'formula' | 'time' | 'external' | 'manual';
  cellId?: string;
  threshold?: number;
  interval?: number;
  expression?: string;
  enabled: boolean;
}

/**
 * Claw configuration
 */
export interface ClawCellConfig {
  id: string;
  type: AgentCellType;
  position: [number, number];

  // Model
  model: {
    provider: ModelProvider;
    model: string;
    apiKey?: string;
    endpoint?: string;
  };

  // Seed
  seed: {
    purpose: string;
    trigger: TriggerCondition;
    learningStrategy: LearningStrategy;
    trainingData?: string;
  };

  // Equipment
  equipment: EquipmentSlot[];

  // Social
  relationships: RelationshipConfig[];

  // State
  state: AgentCellState;
  confidence: number;

  // Metadata
  createdAt: number;
  updatedAt: number;
  version: number;
}

/**
 * Relationship configuration
 */
export interface RelationshipConfig {
  type: RelationshipType;
  targetCell: string;
  strategy?: CoordinationStrategy;
  options?: {
    timeout?: number;
    retryLimit?: number;
    priority?: number;
  };
}

/**
 * Claw summary (for lists)
 */
export interface ClawSummary {
  id: string;
  cellId: string;
  type: AgentCellType;
  state: AgentCellState;
  confidence: number;
  lastActivity: number;
  hasErrors: boolean;
}

/**
 * Claw metrics
 */
export interface ClawMetrics {
  processing: {
    totalTriggers: number;
    totalErrors: number;
    avgLatency: number;
    avgConfidence: number;
    successRate: number;
  };
  resources: {
    memoryBytes: number;
    cpuPercent: number;
  };
  costs: {
    totalCost: number;
    costPerTrigger: number;
    modelCosts: Record<ModelProvider, number>;
  };
}

/**
 * Equipment summary
 */
export interface EquipmentSummary {
  name: string;
  slot: EquipmentSlot;
  version: string;
  equipped: boolean;
  lastUsed?: number;
}

/**
 * Relationship summary
 */
export interface RelationshipSummary {
  id: string;
  type: RelationshipType;
  targetCell: string;
  strategy?: CoordinationStrategy;
  status: 'active' | 'inactive' | 'error';
  lastInteraction?: number;
}
```

---

## Event System

### Event Types

```typescript
/**
 * Base event
 */
export interface ClawEvent {
  type: string;
  traceId: string;
  timestamp: number;
  source: string;
  data: unknown;
}

/**
 * State change event
 */
export interface StateChangeEvent extends ClawEvent {
  type: 'state_change';
  data: {
    cellId: string;
    oldState: AgentCellState;
    newState: AgentCellState;
    reason?: string;
  };
}

/**
 * Error event
 */
export interface ErrorEvent extends ClawEvent {
  type: 'error';
  data: {
    cellId: string;
    error: {
      code: string;
      message: string;
      stack?: string;
    };
    recoverable: boolean;
  };
}

/**
 * Action event
 */
export interface ActionEvent extends ClawEvent {
  type: 'action';
  data: {
    cellId: string;
    action: string;
    result: unknown;
    confidence: number;
  };
}

/**
 * Approval event
 */
export interface ApprovalEvent extends ClawEvent {
  type: 'approval';
  data: {
    cellId: string;
    action: unknown;
    reasoning: string;
    confidence: number;
  };
}
```

### Event Emitter

```typescript
// In spreadsheet-moment/
import { EventEmitter } from 'events';

class ClawEventManager extends EventEmitter {
  // Subscribe to all claw events
  subscribe(callback: (event: ClawEvent) => void): void {
    this.on('claw_event', callback);
  }

  // Subscribe to specific event type
  subscribeTo(
    type: string,
    callback: (event: ClawEvent) => void
  ): void {
    this.on(type, callback);
  }

  // Emit event
  emit(event: ClawEvent): void {
    super.emit('claw_event', event);
    super.emit(event.type, event);
  }
}

// Usage
const manager = new ClawEventManager();

manager.subscribeTo('state_change', (event) => {
  console.log(`Cell ${event.data.cellId} changed to ${event.data.newState}`);
});

manager.subscribeTo('error', (event) => {
  console.error(`Error in cell ${event.data.cellId}:`, event.data.error);
});
```

---

## Error Handling

### Error Codes

```typescript
export enum ErrorCode {
  // General errors (1000-1999)
  UNKNOWN_ERROR = 1000,
  INVALID_REQUEST = 1001,
  UNAUTHORIZED = 1002,
  FORBIDDEN = 1003,
  NOT_FOUND = 1004,
  RATE_LIMITED = 1005,

  // Claw errors (2000-2999)
  CLAW_NOT_FOUND = 2000,
  CLAW_ALREADY_EXISTS = 2001,
  CLAW_INVALID_STATE = 2002,
  CLAW_PROCESSING_FAILED = 2003,

  // Model errors (3000-3999)
  MODEL_NOT_CONFIGURED = 3000,
  MODEL_RATE_LIMITED = 3001,
  MODEL_ERROR = 3002,
  MODEL_TIMEOUT = 3003,

  // Equipment errors (4000-4999)
  EQUIPMENT_NOT_FOUND = 4000,
  EQUIPMENT_SLOT_OCCUPIED = 4001,
  EQUIPMENT_INCOMPATIBLE = 4002,

  // Relationship errors (5000-5999)
  RELATIONSHIP_NOT_FOUND = 5000,
  RELATIONSHIP_ALREADY_EXISTS = 5001,
  RELATIONSHIP_INVALID_TARGET = 5002,

  // Validation errors (6000-6999)
  VALIDATION_ERROR = 6000,
  TRACE_COLLISION = 6001,
  RECURSIVE_LOOP = 6002
}

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    stack?: string;
  };
  traceId: string;
  timestamp: number;
}
```

### Error Handling Pattern

```typescript
// In claw/
try {
  const result = await claw.process(input);
} catch (error) {
  if (error instanceof ClawError) {
    // Handle known claw errors
    switch (error.code) {
      caseErrorCode.RECURSIVE_LOOP:
        // Log and block
        logger.warn('Recursive loop detected', { traceId: error.traceId });
        return { blocked: true, reason: 'Recursive loop' };

      case ErrorCode.MODEL_RATE_LIMITED:
        // Retry with backoff
        await retryWithBackoff(() => claw.process(input));
        break;

      default:
        // Unknown error
        throw error;
    }
  } else {
    // Unexpected error
    throw new ClawError(ErrorCode.UNKNOWN_ERROR, error.message);
  }
}
```

---

## Security

### Authentication

```typescript
/**
 * JWT token payload
 */
export interface JWTPayload {
  sub: string;           // User ID
  iat: number;           // Issued at
  exp: number;           // Expires at
  permissions: string[]; // ['claw:read', 'claw:write', ...]
}

/**
 * Permission scopes
 */
export enum Permission {
  CLAW_READ = 'claw:read',
  CLAW_WRITE = 'claw:write',
  CLAW_DELETE = 'claw:delete',
  EQUIPMENT_MANAGE = 'equipment:manage',
  RELATIONSHIP_MANAGE = 'relationship:manage',
  METRICS_READ = 'metrics:read'
}
```

### Input Validation

```typescript
import { z } from 'zod';

/**
 * Validate claw config
 */
export const ClawConfigSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.nativeEnum(AgentCellType),
  position: z.tuple([z.number(), z.number()]),
  model: z.object({
    provider: z.nativeEnum(ModelProvider),
    model: z.string().min(1),
    apiKey: z.string().min(10).optional()
  }),
  seed: z.object({
    purpose: z.string().min(10).max(1000),
    trigger: z.object({
      type: z.enum(['cell_change', 'formula', 'time', 'external', 'manual']),
      cellId: z.string().optional(),
      threshold: z.number().optional(),
      enabled: z.boolean()
    }),
    learningStrategy: z.nativeEnum(LearningStrategy)
  }),
  equipment: z.array(z.nativeEnum(EquipmentSlot)).max(10),
  confidence: z.number().min(0).max(1)
});

/**
 * Validate trigger data
 */
export const TriggerDataSchema = z.object({
  cellId: z.string(),
  oldValue: z.any(),
  newValue: z.any(),
  timestamp: z.number()
});
```

### Rate Limiting

```typescript
/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number;      // Time window (ms)
  maxRequests: number;   // Max requests per window
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
}

/**
 * Default rate limits
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // General API
  '/api/claws': {
    windowMs: 60000,  // 1 minute
    maxRequests: 100
  },

  // WebSocket connections
  '/ws/claw': {
    windowMs: 60000,
    maxRequests: 10
  },

  // Expensive operations
  '/api/claws/:id/trigger': {
    windowMs: 60000,
    maxRequests: 20
  }
};
```

---

## Performance

### Batching

```typescript
/**
 * Batch trigger request
 */
export interface BatchTriggerRequest {
  triggers: Array<{
    cellId: string;
    data: unknown;
  }>;
  options: {
    parallel?: boolean;
    timeout?: number;
  };
}

/**
 * Batch trigger response
 */
export interface BatchTriggerResponse {
  results: Array<{
    cellId: string;
    success: boolean;
    traceId?: string;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    processingTime: number;
  };
}
```

### Streaming

```typescript
/**
 * Stream reasoning steps
 */
export async function* streamReasoning(
  clawId: string,
  input: unknown
): AsyncGenerator<ReasoningStepMessage> {
  const response = await fetch(`/api/claws/${clawId}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        yield data;
      }
    }
  }
}

// Usage
for await (const step of streamReasoning('claw_001', inputData)) {
  console.log(`Step ${step.payload.step.number}:`, step.payload.step.content);
}
```

### Caching

```typescript
/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number;           // Time to live (ms)
  maxSize: number;       // Max cache entries
  strategy: 'lru' | 'fifo' | 'lfu';
}

/**
 * Cache claw responses
 */
export class ClawResponseCache {
  private cache = new Map<string, { value: unknown; expires: number }>();

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: unknown, ttl: number = 60000): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });

    // Enforce max size
    if (this.cache.size > this.config.maxSize) {
      this.evict();
    }
  }

  private evict(): void {
    switch (this.config.strategy) {
      case 'lru':
        // Evict least recently used
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
        break;
      // ... other strategies
    }
  }
}
```

---

## Versioning

### API Versioning

```typescript
/**
 * API version header
 */
const API_VERSION = '1.0';

/**
 * Versioned endpoint
 */
GET /api/v1/claws/:id

/**
 * Response includes version
 */
{
  "version": "1.0",
  "data": { ... }
}
```

### Compatibility

- **Major version**: Breaking changes
- **Minor version**: New features, backward compatible
- **Patch version**: Bug fixes

**Deprecation Policy:**
- Announce 6 months before breaking changes
- Support previous major version for 12 months
- Provide migration guide

---

## Testing

### Contract Tests

```typescript
import { ClawCellConfig, TriggerDataSchema } from '@superinstance/shared-types';

describe('API Contract: Claw Configuration', () => {
  it('should validate claw config', () => {
    const config: ClawCellConfig = {
      id: 'claw_001',
      type: AgentCellType.SENSOR,
      position: [0, 0],
      model: {
        provider: ModelProvider.DEEPSEEK,
        model: 'deepseek-chat'
      },
      seed: {
        purpose: 'Monitor cell changes',
        trigger: {
          type: 'cell_change',
          cellId: 'B2',
          enabled: true
        },
        learningStrategy: LearningStrategy.REINFORCEMENT
      },
      equipment: [EquipmentSlot.MEMORY, EquipmentSlot.REASONING],
      state: AgentCellState.DORMANT,
      confidence: 0.5,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };

    const result = ClawConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject invalid claw config', () => {
    const invalidConfig = {
      id: '',  // Too short
      type: 'INVALID_TYPE',
      // Missing required fields
    };

    const result = ClawConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });
});
```

---

**Version:** 1.0.0
**Status:** Ready for Implementation
**Last Updated:** 2026-03-15

**Maintained By:** Schema Architect Team
**Feedback:** https://github.com/SuperInstance/api-contracts/issues
