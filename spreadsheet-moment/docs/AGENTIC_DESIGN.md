# SpreadsheetMoment - Agentic Integration Design

**Document Version:** 1.0
**Last Updated:** 2026-03-15
**Status:** Design Phase

---

## Table of Contents

1. [Design Overview](#design-overview)
2. [Agentic Architecture](#agentic-architecture)
3. [Component Design](#component-design)
4. [Data Flow](#data-flow)
5. [API Design](#api-design)
6. [Extension Points](#extension-points)
7. [Integration Patterns](#integration-patterns)
8. [Implementation Details](#implementation-details)

---

## Design Overview

### Core Philosophy

**Extend, Don't Replace:**
- Univer provides excellent spreadsheet foundation
- We add agentic intelligence through plugins
- Minimal changes to Univer core
- Clean separation of concerns

**Key Principles:**
1. **Plugin-First**: All agentic features through Univer plugin system
2. **Type-Safe**: Leverage TypeScript for compile-time guarantees
3. **Observable**: Use reactive patterns for real-time updates
4. **Testable**: Every component independently testable
5. **Performant**: Maintain Univer's performance characteristics

### Design Goals

**Functional Goals:**
- ✅ Every cell can become an intelligent agent
- ✅ Visual Thinking: See AI reasoning before actions
- ✅ Human-in-the-Loop: Approve or reject agent actions
- ✅ Origin-Centric Design: Prevent recursive loops
- ✅ Agent Handshake: Detect and filter bot interactions
- ✅ Intelligent AI Routing: Always use cheapest provider

**Non-Functional Goals:**
- ⚡ <100ms cell creation time
- ⚡ <2s reasoning generation (first), <500ms (cached)
- ⚡ <50ms cell update time
- ⚡ Support for 100K+ cells
- 🎨 80%+ test coverage
- 🔒 Zero security vulnerabilities

---

## Agentic Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Univer UI (Enhanced)                      │   │
│  │  • Spreadsheet grid (canvas-based)                   │   │
│  │  • Formula bar                                       │   │
│  │  • Toolbar and menus                                 │   │
│  │  • Properties panel                                  │   │
│  │  • NEW: Reasoning panel (Visual Thinking)            │   │
│  │  • NEW: HITL buttons (Approve/Reject)                │   │
│  │  • NEW: Agent configuration panel                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Univer Application                     │   │
│  │  • Workbook management                                │   │
│  │  • Worksheet management                               │   │
│  │  • Command execution (undo/redo)                      │   │
│  │  • Formula calculation                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Agentic Application Plugin                  │   │
│  │  • Agent cell lifecycle management                    │   │
│  │  • Visual Thinking workflow orchestration             │   │
│  │  • HITL state management                             │   │
│  │  • Multi-cell coordination                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Univer Domain Models                  │   │
│  │  • Workbook, Worksheet, Range                        │   │
│  │  • Cell data (value, formula, style)                  │   │
│  │  • Dependency graph                                   │   │
│  │  • Command history                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Agentic Domain Models                    │   │
│  │  • AgentCell (extends ICellData)                     │   │
│  │  • TraceProtocol (collision detection)               │   │
│  │  • OriginCentricDesign (source-based logic)           │   │
│  │  • AgentHandshake (bot detection)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Univer Infrastructure                  │   │
│  │  • Plugin system                                     │   │
│  │  • Dependency injection                              │   │
│  │  • Event bus                                         │   │
│  │  • Observable state management                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Agentic Infrastructure                   │   │
│  │  • AI Provider abstraction                           │   │
│  │  • Intelligent routing logic                         │   │
│  │  • Cost tracking                                     │   │
│  │  • Caching layer                                     │   │
│  │  • WebSocket transport (real-time)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  • Cloudflare Workers AI (FREE)                             │
│  • DeepSeek API ($0.014/1K tokens)                          │
│  • OpenAI API ($0.01/1K tokens)                             │
│  • Anthropic API ($0.00025/1K tokens)                       │
│  • Hardware APIs (Arduino, sensors)                        │
│  • Database connections                                    │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

**1. User Interface Layer**
- Render spreadsheet grid (Univer)
- Display agent reasoning steps (our addition)
- Show HITL approval buttons (our addition)
- Agent configuration UI (our addition)

**2. Application Layer**
- Manage workbook/worksheet lifecycle (Univer)
- Execute commands with undo/redo (Univer)
- Orchestrate agent workflows (our addition)
- Manage HITL state transitions (our addition)

**3. Domain Layer**
- Core spreadsheet data models (Univer)
- Agent cell extensions (our addition)
- Trace protocol logic (our addition)
- Origin-centric design rules (our addition)

**4. Infrastructure Layer**
- Plugin system and DI (Univer)
- AI provider abstraction (our addition)
- Intelligent routing (our addition)
- Real-time communication (our addition)

---

## Component Design

### 1. Agent Cell Model

**Extends Univer's ICellData:**

```typescript
/**
 * Agent cell data model
 * Extends Univer's ICellData with agentic properties
 */
import { ICellData } from '@univerjs/core';

export interface IAgentCellData extends ICellData {
  // === Base properties from Univer ===
  // v: string | number | undefined;  // value
  // f: string | undefined;           // formula
  // s: ISheetStyle | undefined;      // style

  // === Agentic extensions ===

  /**
   * Unique origin identifier for Origin-Centric Design
   * Format: "origin_{timestamp}_{random}"
   */
  origin_id?: string;

  /**
   * Trace ID for tracking operation paths
   * Used for recursive loop detection
   */
  trace_id?: string;

  /**
   * Cell type classification
   */
  cell_type?: AgentCellType;

  /**
   * Current state in the agent lifecycle
   */
  state?: AgentCellState;

  /**
   * Step-by-step reasoning trace
   * Markdown-formatted reasoning steps
   */
  reasoning?: string[];

  /**
   * Persistent memory across sessions
   * Learned patterns and procedures
   */
  memory?: string[];

  /**
   * Learned procedures (extracted from reasoning)
   * Reusable action patterns
   */
  procedures?: IProcedure[];

  /**
   * Whether human approval is required
   */
  requires_approval?: boolean;

  /**
   * Queue of approved actions awaiting execution
   */
  approved_actions?: IAction[];

  /**
   * Agent configuration
   */
  config?: IAgentConfig;

  /**
   * Timestamp of last update
   */
  last_update?: string;
}

/**
 * Agent cell types
 */
export enum AgentCellType {
  SENSOR = 'sensor',           // Reads from external sources
  ANALYZER = 'analyzer',       // Processes data with ML
  CONTROLLER = 'controller',   // Sends commands externally
  ORCHESTRATOR = 'orchestrator' // Coordinates multiple cells
}

/**
 * Agent cell states
 */
export enum AgentCellState {
  DORMANT = 'dormant',         // Inactive, waiting for trigger
  THINKING = 'thinking',       // Generating reasoning
  NEEDS_REVIEW = 'needs_review', // Awaiting human approval
  POSTED = 'posted',           // Action executed
  ARCHIVED = 'archived',       // Rejected or completed
  ERROR = 'error'              // Error occurred
}

/**
 * Learned procedure structure
 */
export interface IProcedure {
  id: string;
  name: string;
  description: string;
  steps: string[];
  trigger_pattern: string;
  success_rate: number;
}

/**
 * Action structure for HITL workflow
 */
export interface IAction {
  id: string;
  type: string;
  target: string;              // cell reference or external
  payload: unknown;
  timestamp: string;
}

/**
 * Agent configuration
 */
export interface IAgentConfig {
  /**
   * Cell type
   */
  type: AgentCellType;

  /**
   * External connection configuration
   */
  connection?: IConnectionConfig;

  /**
   * AI provider preferences
   */
  ai_providers?: string[];

  /**
   * Whether to require approval
   */
  require_approval?: boolean;

  /**
   * Watched cells (for orchestrators)
   */
  watch_cells?: string[];

  /**
   * Additional custom configuration
   */
  custom?: Record<string, unknown>;
}

/**
 * Connection configuration
 */
export interface IConnectionConfig {
  type: 'api' | 'database' | 'hardware' | 'websocket';
  endpoint: string;
  protocol: 'http' | 'https' | 'websocket' | 'mqtt' | 'serial';
  auth?: {
    type: 'bearer' | 'basic' | 'custom';
    credentials?: Record<string, string>;
  };
  polling_interval?: number;
}
```

### 2. Trace Protocol

**Recursive Loop Detection:**

```typescript
/**
 * Trace Protocol for Origin-Centric Design
 * Detects and prevents recursive loops in cell dependencies
 */
import { IDisposable } from '@univerjs/core';

export class TraceProtocol implements IDisposable {
  private readonly _traces = new Map<string, ITrace>();

  /**
   * Generate a new trace ID for an operation
   * @param originId The origin cell ID
   * @returns Trace ID
   */
  generate(originId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const traceId = `trace_${timestamp}_${random}_${originId}`;

    this._traces.set(traceId, {
      trace_id: traceId,
      origin_id: originId,
      path: [originId],
      created_at: timestamp,
      updated_at: timestamp,
      state: TraceState.ACTIVE
    });

    return traceId;
  }

  /**
   * Check for trace collision (recursive loop)
   * @param traceId The trace ID
   * @param currentCell The current cell being evaluated
   * @returns True if collision detected (should block)
   */
  checkCollision(traceId: string, currentCell: string): boolean {
    const trace = this._traces.get(traceId);
    if (!trace) {
      return false;
    }

    // Check if current cell is already in path (recursive loop)
    if (trace.path.includes(currentCell)) {
      console.warn(
        `[TraceProtocol] Recursive loop detected: ${traceId} at ${currentCell}`
      );
      console.warn(`[TraceProtocol] Path: ${trace.path.join(' → ')}`);

      // Mark trace as failed
      trace.state = TraceState.FAILED;
      trace.error = `Recursive loop at ${currentCell}`;
      trace.updated_at = Date.now();

      return true;
    }

    // Add current cell to path
    trace.path.push(currentCell);
    trace.updated_at = Date.now();

    return false;
  }

  /**
   * Complete a trace successfully
   * @param traceId The trace ID
   */
  complete(traceId: string): void {
    const trace = this._traces.get(traceId);
    if (trace) {
      trace.state = TraceState.COMPLETED;
      trace.completed_at = Date.now();
      trace.updated_at = Date.now();
    }
  }

  /**
   * Get trace information
   * @param traceId The trace ID
   * @returns Trace data or undefined
   */
  getTrace(traceId: string): ITrace | undefined {
    return this._traces.get(traceId);
  }

  /**
   * Clean up old traces
   * @param maxAge Maximum age in milliseconds (default: 10 minutes)
   */
  cleanup(maxAge: number = 10 * 60 * 1000): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [traceId, trace] of this._traces.entries()) {
      if (now - trace.created_at > maxAge) {
        expired.push(traceId);
      }
    }

    expired.forEach(traceId => this._traces.delete(traceId));
  }

  /**
   * Dispose of the trace protocol
   */
  dispose(): void {
    this._traces.clear();
  }
}

/**
 * Trace data structure
 */
interface ITrace {
  trace_id: string;
  origin_id: string;
  path: string[];
  created_at: number;
  updated_at: number;
  completed_at?: number;
  state: TraceState;
  error?: string;
}

/**
 * Trace states
 */
enum TraceState {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

### 3. Agent Handshake Protocol

**Bot Detection and Filtering:**

```typescript
/**
 * Agent Handshake Protocol
 * Detects and filters bot-to-bot interactions
 */
export class AgentHandshakeProtocol {
  private readonly _agentSignatures = [
    'agent', 'bot', 'automated', 'auto-reply', 'auto',
    'claude', 'gpt', 'chatgpt', 'ai-assistant', 'ai assistant',
    'github-actions', 'dependabot', 'renovate', 'gitbot',
    'bot-', '-bot', '_bot', 'bot_', 'automation'
  ];

  private readonly _jsonProtocolPatterns = [
    /"agent":\s*"/i,
    /"bot":\s*"/i,
    /"type":\s*"agent"/i,
    /"type":\s*"bot"/i
  ];

  /**
   * Detect if a message is from an automated agent
   * @param message The message to check
   * @returns Detection result
   */
  detect(message: string): IHandshakeResult {
    const normalized = message.toLowerCase().trim();

    // Check for agent signatures
    for (const signature of this._agentSignatures) {
      if (normalized.includes(signature)) {
        return {
          is_agent: true,
          signature: signature,
          confidence: 0.9,
          action: HandshakeAction.ARCHIVE,
          response: this._generateResponse(signature)
        };
      }
    }

    // Check for JSON agent protocol
    for (const pattern of this._jsonProtocolPatterns) {
      if (pattern.test(message)) {
        return {
          is_agent: true,
          signature: 'json-protocol',
          confidence: 0.95,
          action: HandshakeAction.ARCHIVE,
          response: '🤝 Agent Handshake: JSON protocol detected'
        };
      }
    }

    // Not an agent
    return {
      is_agent: false,
      confidence: 0.1,
      action: HandshakeAction.REVIEW
    };
  }

  /**
   * Add custom agent signature
   * @param signature The signature to add
   */
  addSignature(signature: string): void {
    this._agentSignatures.push(signature.toLowerCase());
  }

  /**
   * Remove an agent signature
   * @param signature The signature to remove
   */
  removeSignature(signature: string): void {
    const index = this._agentSignatures.indexOf(signature.toLowerCase());
    if (index !== -1) {
      this._agentSignatures.splice(index, 1);
    }
  }

  /**
   * Generate handshake response
   * @param signature The detected signature
   * @returns Response message
   */
  private _generateResponse(signature: string): string {
    return `🤝 Agent Handshake: ${signature} detected and archived by SuperInstance Agent`;
  }
}

/**
 * Handshake result
 */
interface IHandshakeResult {
  is_agent: boolean;
  signature?: string;
  confidence: number;
  action: HandshakeAction;
  response?: string;
}

/**
 * Handshake actions
 */
enum HandshakeAction {
  REVIEW = 'review',       // Review by human
  ARCHIVE = 'archive',     // Auto-archive
  BLOCK = 'block'          // Block entirely
}
```

### 4. Intelligent AI Router

**Cost-Optimized Provider Selection:**

```typescript
/**
 * Intelligent AI Router
 * Selects the best AI provider based on cost, capability, and availability
 */
import { Observable } from 'rxjs';

export interface IAIProvider {
  id: string;
  name: string;
  cost_per_1k: number;
  capabilities: string[];
  is_available: boolean;
  call(prompt: string, options?: IAIOptions): Promise<IAIResponse>;
}

export interface IAIOptions {
  max_tokens?: number;
  temperature?: number;
  model?: string;
}

export interface IAIResponse {
  content: string;
  model: string;
  tokens: number;
  cost: number;
  provider: string;
}

export class IntelligentAIRouter {
  private readonly _providers: Map<string, IAIProvider>;
  private readonly _costTracker: CostTracker;

  constructor() {
    this._providers = new Map();
    this._costTracker = new CostTracker();
  }

  /**
   * Register an AI provider
   * @param provider The provider to register
   */
  registerProvider(provider: IAIProvider): void {
    this._providers.set(provider.id, provider);
  }

  /**
   * Select the best provider for a given request
   * @param requirements The requirements
   * @returns Selected provider
   */
  selectProvider(requirements: IProviderRequirements): IAIProvider | null {
    const { needs_reasoning, max_cost, min_quality } = requirements;

    // Filter available providers
    const available = Array.from(this._providers.values()).filter(
      p => p.is_available
    );

    if (available.length === 0) {
      return null;
    }

    // Sort by cost (cheapest first)
    available.sort((a, b) => a.cost_per_1k - b.cost_per_1k);

    // If reasoning needed, prefer specialized providers
    if (needs_reasoning) {
      const reasoningProviders = available.filter(
        p => p.capabilities.includes('reasoning')
      );
      if (reasoningProviders.length > 0) {
        return reasoningProviders[0];
      }
    }

    // Check cost constraint
    if (max_cost !== undefined) {
      const affordable = available.filter(
        p => p.cost_per_1k <= max_cost
      );
      if (affordable.length > 0) {
        return affordable[0];
      }
    }

    // Check quality constraint
    if (min_quality !== undefined) {
      const qualityProviders = available.filter(
        p => p.capabilities.includes('high-quality')
      );
      if (qualityProviders.length > 0) {
        return qualityProviders[0];
      }
    }

    // Return cheapest available
    return available[0];
  }

  /**
   * Call AI with automatic provider selection
   * @param prompt The prompt
   * @param requirements The requirements
   * @returns AI response
   */
  async call(
    prompt: string,
    requirements: IProviderRequirements
  ): Promise<IAIResponse> {
    const provider = this.selectProvider(requirements);

    if (!provider) {
      throw new Error('No available AI provider');
    }

    const response = await provider.call(prompt, requirements.options);

    // Track cost
    this._costTracker.track({
      provider: provider.id,
      model: response.model,
      tokens: response.tokens,
      cost: response.cost,
      timestamp: Date.now()
    });

    return response;
  }

  /**
   * Get cost statistics
   * @returns Cost statistics
   */
  getCostStats(): ICostStats {
    return this._costTracker.getStats();
  }
}

/**
 * Provider requirements
 */
interface IProviderRequirements {
  needs_reasoning?: boolean;
  max_cost?: number;
  min_quality?: number;
  options?: IAIOptions;
}

/**
 * Cost tracker
 */
class CostTracker {
  private readonly _records: ICostRecord[] = [];

  track(record: ICostRecord): void {
    this._records.push(record);
  }

  getStats(): ICostStats {
    const totalCost = this._records.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = this._records.reduce((sum, r) => sum + r.tokens, 0);

    const byProvider = new Map<string, { cost: number; tokens: number }>();
    for (const record of this._records) {
      const stats = byProvider.get(record.provider) || { cost: 0, tokens: 0 };
      stats.cost += record.cost;
      stats.tokens += record.tokens;
      byProvider.set(record.provider, stats);
    }

    return {
      total_cost: totalCost,
      total_tokens: totalTokens,
      by_provider: Object.fromEntries(byProvider),
      record_count: this._records.length
    };
  }
}

interface ICostRecord {
  provider: string;
  model: string;
  tokens: number;
  cost: number;
  timestamp: number;
}

interface ICostStats {
  total_cost: number;
  total_tokens: number;
  by_provider: Record<string, { cost: number; tokens: number }>;
  record_count: number;
}
```

---

## Data Flow

### Visual Thinking Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: User triggers agent cell                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: AgentCellPlugin intercepts trigger                  │
│  - Generates trace_id                                       │
│  - Sets cell state to THINKING                              │
│  - Emits onThinking event                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: ReasoningService generates reasoning                │
│  - Calls IntelligentAIRouter.selectProvider()              │
│  - Calls selected AI provider with prompt                  │
│  - Streams reasoning steps as they arrive                  │
│  - Each step updates cell.reasoning array                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: ReasoningPanel displays steps in real-time          │
│  - Subscribes to reasoning observable                       │
│  - Renders each step as it arrives                          │
│  - Shows pulsing indicator while thinking                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Reasoning complete, transition to NEEDS_REVIEW     │
│  - ReasoningService emits onComplete event                  │
│  - AgentCellPlugin updates cell state                       │
│  - Shows HITL buttons in ReasoningPanel                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6a: User approves                                     │
│  - HITLButtons.approve() called                             │
│  - Action queued for execution                              │
│  - cell.state transitions to POSTED                        │
│  - Value written to cell                                   │
│                                                              │
│ Step 6b: User rejects                                      │
│  - HITLButtons.reject() called                              │
│  - cell.state transitions to ARCHIVED                      │
│  - Reasoning saved for review                              │
└─────────────────────────────────────────────────────────────┘
```

### Cell Dependency Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Cell A1 updates → triggers dependent cells                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ TraceProtocol.checkCollision() for each dependent           │
│                                                              │
│  For each dependent cell:                                   │
│  1. Check if cell already in trace path                     │
│  2. If yes → recursive loop detected, block update          │
│  3. If no → add to path, continue                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Update dependent cells that passed collision check          │
│  - Recalculate formulas                                     │
│  - Trigger agent cells                                      │
│  - Emit update events                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ TraceProtocol.complete()                                    │
│  - Mark trace as completed                                  │
│  - Clean up old traces                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## API Design

### Plugin Registration

```typescript
/**
 * Main agent plugin registration
 */
import { Plugin, Inject } from '@univerjs/core';

export class AgentCellPlugin extends Plugin {
  static override type = PluginType.Scope;
  static override PLUGIN_NAME = 'AGENT_CELL_PLUGIN';

  @inject(InjectionKey.Identifier) private _identifier: IIdentifierService;

  override onMounted(): void {
    // Register our custom cell type
    this._registerCellType();

    // Register custom commands
    this._registerCommands();

    // Register custom formula functions
    this._registerFunctions();

    // Register UI components
    this._registerUI();
  }

  private _registerCellType(): void {
    // Register agent cell type with Univer
    this._cellModel.registerCellType<IAgentCellData>('agent', {
      // Default values
      defaultValue: {
        v: '',
        t: CellValueType.STRING,
        cell_type: AgentCellType.SENSOR,
        state: AgentCellState.DORMANT,
        reasoning: [],
        memory: [],
        requires_approval: true
      },

      // Validator
      validator: (value: unknown): value is IAgentCellData => {
        return true; // TODO: Implement validation
      },

      // Renderer
      renderer: AgentCellRenderer
    });
  }

  private _registerCommands(): void {
    // Approve action command
    this._commandService.registerCommand({
      id: 'agent.approve',
      handler: (accessor: ICommandParameters, cellId: string) => {
        return this._handleApprove(cellId);
      }
    });

    // Reject action command
    this._commandService.registerCommand({
      id: 'agent.reject',
      handler: (accessor: ICommandParameters, cellId: string) => {
        return this._handleReject(cellId);
      }
    });

    // Create agent cell command
    this._commandService.registerCommand({
      id: 'agent.create',
      handler: (accessor: ICommandParameters, params: ICreateAgentParams) => {
        return this._handleCreate(params);
      }
    });
  }

  private _registerFunctions(): void {
    // =AGENT.THINK(prompt) formula function
    this._formulaService.registerFunction({
      id: 'AGENT.THINK',
      handler: (prompt: string) => {
        return this._handleAgentThink(prompt);
      }
    });

    // =AGENT.LEARN(data) formula function
    this._formulaService.registerFunction({
      id: 'AGENT.LEARN',
      handler: (data: unknown) => {
        return this._handleAgentLearn(data);
      }
    });
  }

  private _registerUI(): void {
    // Register reasoning panel
    this._uiManager.registerComponent({
      key: 'reasoning-panel',
      type: ComponentType.Panel,
      component: ReasoningPanel
    });

    // Register agent config panel
    this._uiManager.registerComponent({
      key: 'agent-config-panel',
      type: ComponentType.Modal,
      component: AgentConfigPanel
    });
  }
}
```

### Formula Functions

```typescript
/**
 * Custom formula functions
 */
export class AgentFormulaFunctions {
  /**
   * =AGENT.THINK(prompt)
   * Generate reasoning for a given prompt
   */
  static AGENT_THINK(prompt: string): string {
    const router = container.resolve<IntelligentAIRouter>('AIRouter');

    // Call AI with reasoning
    const response = await router.call(prompt, {
      needs_reasoning: true
    });

    return response.content;
  }

  /**
   * =AGENT.LEARN(data)
   * Learn patterns from data
   */
  static AGENT_LEARN(data: unknown[]): string {
    // Extract patterns from data
    const patterns = this._extractPatterns(data);

    // Store in cell memory
    const cell = this._getCurrentCell();
    cell.memory = cell.memory || [];
    cell.memory.push(...patterns);

    return `Learned ${patterns.length} patterns`;
  }

  /**
   * =AGENT.COORDINATE(cells)
   * Coordinate multiple agent cells
   */
  static AGENT_COORDINATE(cells: string[]): string {
    // Trigger all cells in parallel
    const promises = cells.map(cellId =>
      this._triggerAgent(cellId)
    );

    await Promise.all(promises);

    return `Coordinated ${cells.length} cells`;
  }

  /**
   * =AGENT.PREDICT(range)
   * Predict next value in range
   */
  static AGENT_PREDICT(range: string[]): number {
    // Analyze historical data
    const history = range.map(v => parseFloat(v));

    // Apply prediction model
    const prediction = this._predictNext(history);

    return prediction;
  }
}
```

---

## Extension Points

### Univer Hooks

```typescript
/**
 * Lifecycle hooks we can tap into
 */
export class AgentHooks {
  /**
   * Hook into cell value changes
   */
  @Hook(HookType.AfterCellValueChange)
  afterCellValueChange(
    workbookId: string,
    worksheetId: string,
    cellId: string,
    newValue: unknown,
    oldValue: unknown
  ): void {
    // Check if this is an agent cell
    const cell = this._getCell(workbookId, worksheetId, cellId);
    if (cell.cell_type) {
      // Trigger agent workflow
      this._triggerAgent(cell);
    }

    // Check for agent cells watching this cell
    this._notifyWatchers(cellId);
  }

  /**
   * Hook into formula calculation
   */
  @Hook(HookType.BeforeFormulaCalculation)
  beforeFormulaCalculation(
    workbookId: string,
    worksheetId: string,
    cellId: string,
    formula: string
  ): boolean {
    // Check for recursive loops
    const cell = this._getCell(workbookId, worksheetId, cellId);

    if (cell.trace_id) {
      const hasCollision = this._traceProtocol.checkCollision(
        cell.trace_id,
        cellId
      );

      if (hasCollision) {
        // Block the calculation
        return false;
      }
    }

    // Allow calculation
    return true;
  }

  /**
   * Hook into command execution
   */
  @Hook(HookType.AfterCommandExecution)
  afterCommandExecution(
    commandId: string,
    params: unknown
  ): void {
    // Track agent-related commands
    if (commandId.startsWith('agent.')) {
      this._trackAgentCommand(commandId, params);
    }
  }
}
```

---

## Implementation Details

### Phase 1: Foundation (Week 1)

**Package Setup:**
```bash
# Create agent packages
mkdir -p packages/agent-core/src
mkdir -p packages/agent-ui/src
mkdir -p packages/agent-ai/src
mkdir -p packages/agent-formulas/src

# Add package.json files
# (See detailed structure in FORK_STRATEGY.md)
```

**Core Interfaces:**
- [ ] Define IAgentCellData interface
- [ ] Define enums (AgentCellType, AgentCellState)
- [ ] Define supporting interfaces (IProcedure, IAction, IAgentConfig)

### Phase 2: Trace Protocol (Week 2)

**Implementation:**
- [ ] Implement TraceProtocol class
- [ ] Add collision detection
- [ ] Add trace cleanup
- [ ] Write unit tests

**Integration:**
- [ ] Hook into formula calculation
- [ ] Hook into cell value changes
- [ ] Add trace visualization

### Phase 3: Agent Core (Weeks 3-4)

**Cell Management:**
- [ ] Implement CellManager
- [ ] Implement StateManager
- [ ] Add cell lifecycle hooks
- [ ] Write integration tests

**Configuration:**
- [ ] Implement configuration UI
- [ ] Add connection management
- [ ] Add provider preferences

### Phase 4: Visual Thinking (Weeks 5-6)

**Reasoning Service:**
- [ ] Implement ReasoningService
- [ ] Add streaming support
- [ ] Integrate AI providers
- [ ] Add caching

**UI Components:**
- [ ] Build ReasoningPanel
- [ ] Build HITLButtons
- [ ] Build CellRenderer
- [ ] Add animations

### Phase 5: AI Integration (Weeks 7-8)

**Provider Implementation:**
- [ ] Cloudflare provider
- [ ] DeepSeek provider
- [ ] OpenAI provider
- [ ] Anthropic provider

**Router:**
- [ ] Implement IntelligentAIRouter
- [ ] Add cost tracking
- [ ] Add usage analytics

**Handshake:**
- [ ] Implement AgentHandshakeProtocol
- [ ] Add signature management
- [ ] Add filtering logic

---

## Success Criteria

### Functional Requirements

- [ ] All agent cell types working
- [ ] Visual Thinking displaying correctly
- [ ] HITL workflow functional
- [ ] Trace Protocol detecting loops
- [ ] Agent Handshake filtering bots
- [ ] AI routing selecting providers

### Non-Functional Requirements

- [ ] <100ms cell creation time
- [ ] <2s reasoning generation time
- [ ] <50ms cell update time
- [ ] 80%+ test coverage
- [ ] Zero security vulnerabilities
- [ ] Responsive UI

### Integration Requirements

- [ ] All Univer features working
- [ ] Plugin system functional
- [ ] Formula functions registered
- [ ] Commands registered
- [ ] UI components integrated

---

**Document Maintainer:** SpreadsheetMoment Architecture Team
**Last Updated:** 2026-03-15
**Status:** Design Phase - Ready for Implementation
