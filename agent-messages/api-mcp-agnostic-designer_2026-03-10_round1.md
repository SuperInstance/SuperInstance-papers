# API/MCP Agnostic Designer - Research Round 1
**Date:** 2026-03-10
**Agent:** API/MCP Agnostic Designer
**Focus:** Universal integration protocol for SMPbots
**Time Spent:** 2 hours

---

## 1. CURRENT INTEGRATION LANDSCAPE ANALYSIS

### 1.1 Existing Integration Patterns Found

#### **Integration Connector System** (`src/spreadsheet/integrations/`)
- **Pattern:** Unified connector interface for external services
- **Components:**
  - `IntegrationConnector` base interface
  - `IntegrationManager` for orchestration
  - Type-safe configuration system
  - Built-in rate limiting, error handling, health checks
- **Supported Platforms:** Slack, Microsoft Teams, GitHub, PostgreSQL, Webhooks
- **Key Insight:** Already has a well-designed adapter pattern for external services

#### **Protocol Adapter System** (`src/microbiome/protocol-adapter.ts`)
- **Pattern:** Bidirectional protocol translation between systems
- **Components:**
  - Message type mappings (SPORE ↔ Core)
  - Channel routing tables
  - Type translation with fallbacks
  - Event emission for cross-system communication
- **Key Insight:** Excellent pattern for translating between different protocol domains

#### **API System** (`src/api/`)
- **Pattern:** Multi-protocol API layer
- **Components:**
  - REST API endpoints
  - WebSocket real-time communication
  - TypeScript type definitions
  - Authentication and rate limiting
- **Key Insight:** Supports multiple communication patterns (request/response, pub/sub)

### 1.2 MCP (Model Context Protocol) Analysis

**MCP Concept:** Protocol for LLMs to interact with external tools and data sources
- **Key Features:** Tool calling, context management, state persistence
- **Relevance to SMPbots:** Similar need for LLM integration with external systems
- **Existing POLLN Capabilities:** Already has tool integration patterns via connectors

### 1.3 Gaps and Opportunities

1. **No Universal SMPbot Protocol:** Current systems are service-specific
2. **Limited Platform Abstraction:** Connectors are tied to specific APIs
3. **No Formal Protocol Specification:** Ad-hoc integration patterns
4. **Missing Cross-Platform State Sync:** No unified state management across platforms

---

## 2. UNIVERSAL INTEGRATION PROTOCOL SPECIFICATION

### 2.1 Protocol Design Principles

1. **Agnostic to Underlying Protocol:** Works with REST, WebSocket, gRPC, MCP, etc.
2. **Platform Independent:** Abstracts Discord, Slack, Web, CLI, etc.
3. **Bidirectional Communication:** Full duplex message flow
4. **State Synchronization:** Consistent state across all platforms
5. **Extensible Type System:** Support for new message types and platforms

### 2.2 Core Protocol Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UNIVERSAL INTEGRATION PROTOCOL           │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Platform Adapters (Discord, Slack, Web, CLI)     │
│  Layer 3: Message Router & Transformer                      │
│  Layer 2: Protocol Abstraction (REST/WS/gRPC/MCP)          │
│  Layer 1: Transport Layer (HTTP, TCP, IPC, etc.)           │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Protocol Message Format

```typescript
/**
 * Universal Integration Protocol Message
 */
interface UIPMessage {
  // Core identification
  id: string;
  timestamp: number;
  protocolVersion: string;

  // Message routing
  source: {
    platform: PlatformType;
    channel: string;
    userId?: string;
    sessionId?: string;
  };
  target: {
    platform: PlatformType;
    channel: string;
    userId?: string;
    sessionId?: string;
  };

  // Message content
  type: MessageType;
  payload: unknown;

  // Metadata
  metadata: {
    confidence?: number;  // SMP confidence score
    priority?: MessagePriority;
    ttl?: number;  // Time-to-live in ms
    tags?: string[];
    traceId?: string;  // For distributed tracing
  };

  // State synchronization
  state?: {
    sessionState?: Record<string, unknown>;
    userState?: Record<string, unknown>;
    platformState?: Record<string, unknown>;
  };
}

/**
 * Platform types
 */
enum PlatformType {
  DISCORD = 'discord',
  SLACK = 'slack',
  TEAMS = 'teams',
  WEB = 'web',
  CLI = 'cli',
  API = 'api',
  MCP = 'mcp',
  CUSTOM = 'custom'
}

/**
 * Message types
 */
enum MessageType {
  // Core message types
  TEXT = 'text',
  COMMAND = 'command',
  QUERY = 'query',
  RESPONSE = 'response',
  ERROR = 'error',

  // Rich content
  FILE = 'file',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',

  // Interactive
  BUTTON = 'button',
  SELECT = 'select',
  FORM = 'form',
  CARD = 'card',

  // System
  HEARTBEAT = 'heartbeat',
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  STATE_SYNC = 'state_sync'
}

/**
 * Message priority
 */
enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

### 2.4 Protocol Operations

#### **2.4.1 Message Flow**
```
User (Discord) → Discord Adapter → Message Router → SMPbot Core
SMPbot Core → Message Router → Discord Adapter → User (Discord)
```

#### **2.4.2 State Synchronization**
```typescript
interface StateSyncOperation {
  operation: 'SET' | 'UPDATE' | 'DELETE' | 'MERGE';
  key: string;
  value?: unknown;
  timestamp: number;
  platform: PlatformType;
  scope: 'SESSION' | 'USER' | 'GLOBAL';
}
```

#### **2.4.3 Platform Capability Discovery**
```typescript
interface PlatformCapabilities {
  platform: PlatformType;
  supportedMessageTypes: MessageType[];
  maxMessageSize: number;
  supportsFiles: boolean;
  supportsRealtime: boolean;
  rateLimits: RateLimitConfig;
  authenticationMethods: AuthMethod[];
}
```

---

## 3. ADAPTER FRAMEWORK DESIGN

### 3.1 Adapter Interface

```typescript
/**
 * Universal Platform Adapter Interface
 */
interface UniversalPlatformAdapter {
  // Identification
  readonly platform: PlatformType;
  readonly adapterId: string;
  readonly capabilities: PlatformCapabilities;

  // Lifecycle
  initialize(config: AdapterConfig): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Message handling
  send(message: UIPMessage): Promise<SendResult>;
  receive(callback: (message: UIPMessage) => Promise<void>): void;

  // State management
  getState(scope: StateScope, key?: string): Promise<unknown>;
  setState(scope: StateScope, key: string, value: unknown): Promise<void>;
  syncState(operations: StateSyncOperation[]): Promise<void>;

  // Platform-specific operations
  platformSpecific?: {
    [operation: string]: (params: unknown) => Promise<unknown>;
  };
}

/**
 * Adapter configuration
 */
interface AdapterConfig {
  platform: PlatformType;
  adapterId: string;
  credentials: Record<string, string>;
  options: {
    autoConnect?: boolean;
    reconnectAttempts?: number;
    messageQueueSize?: number;
    stateSyncInterval?: number;
  };
  capabilities?: Partial<PlatformCapabilities>;  // Override auto-detection
}
```

### 3.2 Built-in Adapters

#### **3.2.1 Discord Adapter**
- **Protocol:** Discord API (REST + WebSocket)
- **Features:** Text channels, voice, reactions, embeds
- **State Sync:** Guild/channel/user states

#### **3.2.2 Slack Adapter**
- **Protocol:** Slack API (Events API + WebSocket)
- **Features:** Messages, threads, blocks, modals
- **State Sync:** Workspace/channel/user states

#### **3.2.3 Web Adapter**
- **Protocol:** HTTP/WebSocket + SSE
- **Features:** Browser sessions, real-time updates
- **State Sync:** Session/localStorage states

#### **3.2.4 CLI Adapter**
- **Protocol:** STDIN/STDOUT + IPC
- **Features:** Interactive prompts, streaming output
- **State Sync:** Process/session states

#### **3.2.5 MCP Adapter**
- **Protocol:** Model Context Protocol
- **Features:** Tool calling, context management
- **State Sync:** Session/tool states

### 3.3 Message Router & Transformer

```typescript
/**
 * Message Router
 */
class MessageRouter {
  private adapters: Map<PlatformType, UniversalPlatformAdapter>;
  private routingRules: RoutingRule[];
  private transformers: MessageTransformer[];

  // Route message to appropriate adapter(s)
  async route(message: UIPMessage): Promise<void> {
    // Apply routing rules
    const targets = this.applyRoutingRules(message);

    // Transform message for each target platform
    for (const target of targets) {
      const transformed = await this.transformMessage(message, target.platform);
      await target.adapter.send(transformed);
    }
  }

  // Register message transformer
  registerTransformer(transformer: MessageTransformer): void {
    this.transformers.push(transformer);
  }

  // Add routing rule
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
  }
}

/**
 * Routing rule
 */
interface RoutingRule {
  match: (message: UIPMessage) => boolean;
  targets: Array<{
    platform: PlatformType;
    channel?: string;
    transform?: (message: UIPMessage) => UIPMessage;
  }>;
  priority: number;
}

/**
 * Message transformer
 */
interface MessageTransformer {
  platform: PlatformType;
  transform: (message: UIPMessage) => Promise<UIPMessage>;
  canTransform: (message: UIPMessage) => boolean;
}
```

### 3.4 Protocol Abstraction Layer

```typescript
/**
 * Protocol Abstraction
 */
abstract class ProtocolAdapter {
  abstract protocol: ProtocolType;

  // Convert UIP message to protocol-specific format
  abstract serialize(message: UIPMessage): unknown;

  // Convert protocol-specific format to UIP message
  abstract deserialize(data: unknown): UIPMessage;

  // Handle protocol-specific errors
  abstract handleError(error: unknown): UIPMessage;
}

/**
 * Protocol implementations
 */
class RESTProtocolAdapter extends ProtocolAdapter {
  protocol: ProtocolType = ProtocolType.REST;
  // ... implementation
}

class WebSocketProtocolAdapter extends ProtocolAdapter {
  protocol: ProtocolType = ProtocolType.WEBSOCKET;
  // ... implementation
}

class MCPProtocolAdapter extends ProtocolAdapter {
  protocol: ProtocolType = ProtocolType.MCP;
  // ... implementation
}
```

---

## 4. IMPLEMENTATION ROADMAP

### Phase 1: Core Protocol Foundation (Week 1-2)
1. **Define TypeScript interfaces** for UIP messages, adapters, routers
2. **Implement base adapter class** with common functionality
3. **Create message router** with basic routing rules
4. **Develop test harness** for protocol validation

### Phase 2: Platform Adapters (Week 3-4)
1. **Implement Discord adapter** using existing integration patterns
2. **Implement Slack adapter** leveraging current SlackConnector
3. **Create Web adapter** for browser/HTTP integration
4. **Build CLI adapter** for terminal interaction

### Phase 3: Advanced Features (Week 5-6)
1. **State synchronization system** across platforms
2. **Message transformation pipeline** for format conversion
3. **Protocol abstraction layer** (REST/WS/gRPC/MCP)
4. **Capability discovery** and negotiation

### Phase 4: Integration & Testing (Week 7-8)
1. **Integrate with SMPbot framework** (coordinate with Bot Framework Architect)
2. **Cross-platform testing** with real scenarios
3. **Performance optimization** and load testing
4. **Documentation and examples**

### Phase 5: MCP Specialization (Week 9-10)
1. **Deep MCP integration** for LLM tool calling
2. **Context management** across platforms
3. **Tool discovery and composition**
4. **MCP server implementation** for POLLN tools

---

## 5. COORDINATION WITH OTHER AGENTS

### Bot Framework Architect
- **Integration Point:** SMPbot message handling via UIP
- **Collaboration:** Define SMPbot message types and state requirements
- **Timeline:** Coordinate Phase 4 integration

### SuperInstance Schema Designer
- **Integration Point:** UIP messages as SuperInstance types
- **Collaboration:** Ensure UIP types align with SuperInstance schema
- **Timeline:** Review during Phase 1 type definitions

### Tile System Evolution Planner
- **Integration Point:** Platform adapters as tile types
- **Collaboration:** Design adapter tiles for spreadsheet integration
- **Timeline:** Discuss during Phase 2 adapter implementation

---

## 6. KEY INSIGHTS & RECOMMENDATIONS

### 6.1 Leverage Existing Patterns
- **Reuse IntegrationConnector interface** from current system
- **Adapt ProtocolAdapter pattern** for cross-platform translation
- **Utilize API type system** for consistency

### 6.2 Design for Extensibility
- **Plugin architecture** for new platform adapters
- **Modular protocol support** (add REST, WS, gRPC, MCP independently)
- **Configurable routing rules** for complex workflows

### 6.3 Focus on State Management
- **Critical for SMPbots** to maintain context across platforms
- **Distributed state sync** for multi-platform sessions
- **Conflict resolution** for concurrent state updates

### 6.4 MCP Integration Strategy
- **Treat MCP as first-class protocol** alongside REST/WebSocket
- **Leverage MCP for LLM tool integration** while maintaining agnosticism
- **Design adapters that can use MCP when available**, fall back to native APIs

---

## 7. NEXT STEPS

1. **Present findings** to Orchestrator and team
2. **Refine protocol specification** based on feedback
3. **Begin Phase 1 implementation** (type definitions, base classes)
4. **Coordinate with Bot Framework Architect** on SMPbot integration
5. **Create detailed design documents** for each adapter type

---

**Research Status:** ✅ Complete for Round 1
**Key Deliverables:** Protocol specification, adapter framework design, implementation roadmap
**Next Round Focus:** Detailed type definitions and base implementation

---

*Prepared by API/MCP Agnostic Designer for POLLN R&D Phase*
*Date: 2026-03-10*
*Time: 2 hours research + analysis*