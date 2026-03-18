# Spreadsheet Moment - Claw Integration Guide

**Project:** SuperInstance Spreadsheet Moment - Univer-based Spreadsheet with Claw Agents
**Origin:** Forked from https://github.com/dream-num/univer
**Target:** Scalable cellular instances for Claw agents with Rust/Go optimization
**Last Updated:** 2026-03-15

---

## Table of Contents

1. [Integration Overview](#integration-overview)
2. [Architecture Integration](#architecture-integration)
3. [Claw Cell Type](#claw-cell-type)
4. [API Integration](#api-integration)
5. [UI Components](#ui-components)
6. [Formula Functions](#formula-functions)
7. [Data Flow](#data-flow)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Testing Strategy](#testing-strategy)
10. [Best Practices](#best-practices)

---

## Integration Overview

### Purpose

This document describes how to integrate Claw agents into the Spreadsheet Moment platform (based on Univer). The integration enables:

- **Cellular Agents**: One Claw agent per cell for intelligent monitoring
- **Real-time Processing**: WebSocket streaming for live updates
- **Visual Thinking**: Step-by-step reasoning display
- **Human-in-the-Loop**: Approval workflow for agent actions
- **Multi-claw Coordination**: Social relationships between cells
- **Performance Optimization**: Rust/Go backend for GPU acceleration

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SPREADSHEET MOMENT UI                        │
│                   (Univer + React + TypeScript)                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Cell Management                                           │ │
│  │  • ClawCellType (new cell type)                            │ │
│  │  • AgentCellService (cell lifecycle)                       │ │
│  │  • Formula integration (=CLAW_NEW(), etc.)                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  WebSocket Layer                                           │ │
│  │  • ClawWebSocketProvider (real-time updates)               │ │
│  │  • Binary protocol for performance                         │ │
│  │  • Trace ID propagation                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Backend Service (Optional - Rust/Go)                      │ │
│  │  • GPU-accelerated processing (10-1000x speedup)           │ │
│  │  • Batch processing for 1000+ cells                        │ │
│  │  • Memory optimization (zero-copy, pooling)                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Claw Engine Integration                                   │ │
│  │  • claw/ repo (minimal cellular agents)                    │ │
│  │  • Model providers (11 options)                            │ │
│  │  • Seed learning                                           │ │
│  │  • Equipment system                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Benefits

1. **Performance**: Rust/Go backend provides 10-1000x speedup for parallel workloads
2. **Scalability**: Handle 10,000+ concurrent cells
3. **Security**: Memory-safe Rust with sandboxing
4. **Cost**: 76x cheaper with Cloudflare Workers deployment
5. **Flexibility**: Use local GPU or cloud GPU as needed

---

## Architecture Integration

### Monorepo Structure

```
spreadsheet-moment/
├── packages/
│   ├── agent-core/              # Core agentic functionality
│   │   ├── src/
│   │   │   ├── types.ts         # Core type definitions
│   │   │   ├── AgentCell.ts     # Agent cell implementation
│   │   │   ├── TraceProtocol.ts # Loop prevention
│   │   │   └── AgentCellService.ts # Cell management
│   │   └── package.json
│   │
│   ├── agent-ui/                 # UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ReasoningPanel.tsx    # Real-time reasoning
│   │   │   │   ├── HITLApproval.tsx      # Human-in-the-loop
│   │   │   │   ├── ClawCellEditor.tsx    # Cell editor
│   │   │   │   └── EquipmentSelector.tsx # Equipment UI
│   │   │   └── providers/
│   │   │       └── ClawWebSocketProvider.tsx
│   │   └── package.json
│   │
│   ├── agent-ai/                 # AI integration
│   │   ├── src/
│   │   │   ├── providers/
│   │   │   │   ├── OpenAIProvider.ts
│   │   │   │   ├── AnthropicProvider.ts
│   │   │   │   ├── DeepSeekProvider.ts
│   │   │   │   └── CloudflareProvider.ts
│   │   │   └── ModelRouter.ts
│   │   └── package.json
│   │
│   ├── agent-formulas/           # Univer formula functions
│   │   ├── src/
│   │   │   ├── functions/
│   │   │   │   ├── CLAW_NEW.ts
│   │   │   │   ├── CLAW_EQUIP.ts
│   │   │   │   ├── CLAW_TRIGGER.ts
│   │   │   │   └── CLAW_RELATE.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── backend-rust/             # Optional Rust backend
│       ├── src/
│       │   ├── lib.rs
│       │   ├── claw_engine.rs    # Claw processing engine
│       │   ├── gpu_compute.rs    # GPU acceleration
│       │   └── websocket.rs      # WebSocket server
│       ├── Cargo.toml
│       └── build.rs
│
├── docs/
│   ├── CLAW_INTEGRATION.md       # This document
│   └── API.md                    # API documentation
│
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.json
```

### Package Dependencies

```
agent-ui
  ├─> agent-core (types)
  ├─> agent-ai (model providers)
  └─> agent-formulas (Univer functions)

agent-core
  └─> agent-ai (model routing)

agent-formulas
  ├─> agent-core (cell types)
  └─> @univerjs/engine (formula registration)

backend-rust
  └─> claw/ (Claw engine integration)
```

---

## Claw Cell Type

### Definition

```typescript
// packages/agent-core/src/types.ts

export enum AgentCellType {
  SENSOR = 'SENSOR',           // Monitors cell value changes
  ANALYZER = 'ANALYZER',       // Analyzes patterns across cells
  CONTROLLER = 'CONTROLLER',   // Controls other cells
  ORCHESTRATOR = 'ORCHESTRATOR' // Coordinates multiple claws
}

export enum AgentCellState {
  DORMANT = 'DORMANT',         // Waiting for trigger
  THINKING = 'THINKING',       // Model inference
  NEEDS_REVIEW = 'NEEDS_REVIEW', // HITL approval
  POSTED = 'POSTED',           // Action completed
  ARCHIVED = 'ARCHIVED',       // Inactive
  ERROR = 'ERROR'              // Failure state
}

export interface ClawCellConfig {
  id: string;
  type: AgentCellType;
  position: [number, number];  // [row, col]

  // Model configuration
  model: {
    provider: 'openai' | 'anthropic' | 'deepseek' | 'cloudflare';
    model: string;
    apiKey?: string;
  };

  // Seed configuration
  seed: {
    purpose: string;
    trigger: TriggerCondition;
    learningStrategy: 'reinforcement' | 'supervised' | 'unsupervised';
  };

  // Equipment
  equipment: EquipmentSlot[];

  // Social
  relationships: Relationship[];

  // State
  state: AgentCellState;
  confidence: number;
}

export interface TriggerCondition {
  type: 'cell_change' | 'formula' | 'time' | 'external' | 'manual';
  cellId?: string;
  threshold?: number;
  interval?: number;
  expression?: string;
}

export interface Relationship {
  type: 'slave' | 'coworker' | 'peer' | 'delegate' | 'observer';
  targetCell: string;
  strategy?: 'PARALLEL' | 'SEQUENTIAL' | 'CONSENSUS';
}
```

### AgentCell Class

```typescript
// packages/agent-core/src/AgentCell.ts

import { EventEmitter } from 'events';
import { TraceProtocol } from './TraceProtocol';
import type { ClawCellConfig, AgentCellState, TriggerCondition } from './types';

export class AgentCell extends EventEmitter {
  private config: ClawCellConfig;
  private trace: TraceProtocol;
  private state: AgentCellState;
  private confidence: number;

  constructor(config: ClawCellConfig) {
    super();
    this.config = config;
    this.trace = new TraceProtocol();
    this.state = AgentCellState.DORMANT;
    this.confidence = 0.5;
  }

  /**
   * Process cell change trigger
   */
  async onCellChange(data: {
    cellId: string;
    oldValue: any;
    newValue: any;
    timestamp: number;
  }): Promise<void> {
    // Check trace for loops
    const traceId = this.trace.generate(this.config.id);
    if (this.trace.checkCollision(traceId, this.config.id)) {
      throw new Error('Recursive loop detected');
    }

    // Transition to THINKING
    this.setState(AgentCellState.THINKING);

    try {
      // Get AI inference
      const result = await this.processWithModel(data);

      // Check confidence
      if (result.confidence < 0.7) {
        this.setState(AgentCellState.NEEDS_REVIEW);
        this.emit('approval_required', {
          traceId,
          action: result.action,
          reasoning: result.reasoning
        });
        return;
      }

      // Execute action
      await this.executeAction(result.action);
      this.setState(AgentCellState.POSTED);

      // Emit completion
      this.emit('action_completed', {
        traceId,
        result,
        confidence: result.confidence
      });

    } catch (error) {
      this.setState(AgentCellState.ERROR);
      this.emit('error', { traceId, error });
    }
  }

  /**
   * Process with AI model
   */
  private async processWithModel(data: any): Promise<{
    action: any;
    reasoning: string;
    confidence: number;
  }> {
    // This calls the Claw engine (either local or Rust backend)
    const claw = await this.getClawEngine();
    return claw.process({
      input: data,
      seed: this.config.seed,
      equipment: this.config.equipment
    });
  }

  /**
   * Execute approved action
   */
  async executeAction(action: any): Promise<void> {
    // Update cell values, send messages, etc.
    this.emit('action_executed', action);
  }

  /**
   * Human approval
   */
  async approve(traceId: string): Promise<void> {
    // Execute pending action
    this.setState(AgentCellState.POSTED);
  }

  /**
   * Human rejection
   */
  async reject(traceId: string, reason: string): Promise<void> {
    // Return to dormant
    this.setState(AgentCellState.DORMANT);
    this.emit('action_rejected', { traceId, reason });
  }

  private setState(state: AgentCellState): void {
    this.state = state;
    this.emit('state_changed', state);
  }

  private async getClawEngine(): Promise<any> {
    // Import from claw/ repo or connect to Rust backend
    if (process.env.USE_RUST_BACKEND === 'true') {
      return connectToRustBackend();
    } else {
      return import('@superinstance/claw');
    }
  }
}
```

---

## API Integration

### TypeScript Interfaces

```typescript
// packages/agent-core/src/api/interfaces.ts

/**
 * WebSocket message types
 */
export enum MessageType {
  // Client → Server
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  TRIGGER = 'trigger',
  APPROVE = 'approve',
  REJECT = 'reject',

  // Server → Client
  CELL_UPDATE = 'cell_update',
  REASONING_STEP = 'reasoning_step',
  STATE_CHANGE = 'state_change',
  APPROVAL_REQUIRED = 'approval_required',
  ACTION_COMPLETED = 'action_completed',
  ERROR = 'error'
}

/**
 * WebSocket messages
 */
export interface WebSocketMessage {
  type: MessageType;
  traceId: string;
  payload: any;
  timestamp: number;
}

export interface SubscribeMessage extends WebSocketMessage {
  type: MessageType.SUBSCRIBE;
  payload: {
    cellId: string;
    sheetId: string;
  };
}

export interface CellUpdateMessage extends WebSocketMessage {
  type: MessageType.CELL_UPDATE;
  payload: {
    cellId: string;
    oldValue: any;
    newValue: any;
  };
}

export interface ReasoningStepMessage extends WebSocketMessage {
  type: MessageType.REASONING_STEP;
  payload: {
    cellId: string;
    step: {
      content: string;
      timestamp: number;
      confidence: number;
    };
  };
}

/**
 * HTTP API
 */
export interface ClawAPI {
  // Cell management
  createCell(config: ClawCellConfig): Promise<AgentCell>;
  updateCell(id: string, config: Partial<ClawCellConfig>): Promise<void>;
  deleteCell(id: string): Promise<void>;
  getCell(id: string): Promise<AgentCell>;

  // State management
  getState(id: string): Promise<AgentCellState>;
  setState(id: string, state: AgentCellState): Promise<void>;

  // Actions
  triggerCell(id: string, data: any): Promise<void>;
  approveAction(traceId: string): Promise<void>;
  rejectAction(traceId: string, reason: string): Promise<void>;

  // Relationships
  addRelationship(fromId: string, toId: string, type: RelationshipType): Promise<void>;
  removeRelationship(fromId: string, toId: string): Promise<void>;
  getRelationships(id: string): Promise<Relationship[]>;

  // Equipment
  equipEquipment(cellId: string, equipment: EquipmentSlot): Promise<void>;
  unequipEquipment(cellId: string, equipment: EquipmentSlot): Promise<void>;
}
```

### WebSocket Protocol

```typescript
// packages/agent-ui/src/providers/ClawWebSocketProvider.tsx

import React, { useEffect, useContext } from 'react';
import { WebSocketMessage, MessageType } from '@superinstance/agent-core';

interface ClawWebSocketContextValue {
  socket: WebSocket | null;
  connected: boolean;
  subscribe: (cellId: string) => void;
  unsubscribe: (cellId: string) => void;
  trigger: (cellId: string, data: any) => void;
}

const ClawWebSocketContext = React.createContext<ClawWebSocketContextValue>({
  socket: null,
  connected: false,
  subscribe: () => {},
  unsubscribe: () => {},
  trigger: () => {}
});

export const useClawWebSocket = () => useContext(ClawWebSocketContext);

export const ClawWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [socket, setSocket] = React.useState<WebSocket | null>(null);
  const [connected, setConnected] = React.useState(false);

  useEffect(() => {
    // Connect to WebSocket server
    const ws = new WebSocket(process.env.WS_URL || 'ws://localhost:3001');

    ws.onopen = () => {
      console.log('Claw WebSocket connected');
      setConnected(true);
    };

    ws.onclose = () => {
      console.log('Claw WebSocket disconnected');
      setConnected(false);
    };

    ws.onerror = (error) => {
      console.error('Claw WebSocket error:', error);
    };

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      handleMessage(message);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case MessageType.REASONING_STEP:
        // Emit to ReasoningPanel
        window.dispatchEvent(new CustomEvent('reasoning-step', { detail: message }));
        break;

      case MessageType.APPROVAL_REQUIRED:
        // Emit to HITLApproval
        window.dispatchEvent(new CustomEvent('approval-required', { detail: message }));
        break;

      case MessageType.STATE_CHANGE:
        // Update cell state
        window.dispatchEvent(new CustomEvent('state-change', { detail: message }));
        break;

      case MessageType.ACTION_COMPLETED:
        // Show completion notification
        window.dispatchEvent(new CustomEvent('action-completed', { detail: message }));
        break;

      case MessageType.ERROR:
        // Show error
        window.dispatchEvent(new CustomEvent('claw-error', { detail: message }));
        break;
    }
  };

  const subscribe = (cellId: string) => {
    if (!socket || !connected) return;

    const message: SubscribeMessage = {
      type: MessageType.SUBSCRIBE,
      traceId: generateTraceId(),
      timestamp: Date.now(),
      payload: { cellId, sheetId: 'current' }
    };

    socket.send(JSON.stringify(message));
  };

  const unsubscribe = (cellId: string) => {
    if (!socket || !connected) return;

    socket.send(JSON.stringify({
      type: MessageType.UNSUBSCRIBE,
      traceId: generateTraceId(),
      timestamp: Date.now(),
      payload: { cellId }
    }));
  };

  const trigger = (cellId: string, data: any) => {
    if (!socket || !connected) return;

    socket.send(JSON.stringify({
      type: MessageType.TRIGGER,
      traceId: generateTraceId(),
      timestamp: Date.now(),
      payload: { cellId, data }
    }));
  };

  return (
    <ClawWebSocketContext.Provider value={{ socket, connected, subscribe, unsubscribe, trigger }}>
      {children}
    </ClawWebSocketContext.Provider>
  );
};

function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}
```

---

## UI Components

### ReasoningPanel

```typescript
// packages/agent-ui/src/components/ReasoningPanel.tsx

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useClawWebSocket } from '../providers/ClawWebSocketProvider';

interface ReasoningStep {
  content: string;
  timestamp: number;
  confidence: number;
}

export const ReasoningPanel: React.FC<{
  cellId: string;
  showFullReasoning?: boolean;
}> = ({ cellId, showFullReasoning = true }) => {
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const { subscribe } = useClawWebSocket();

  useEffect(() => {
    // Subscribe to cell updates
    subscribe(cellId);

    // Listen for reasoning steps
    const handleReasoningStep = (event: CustomEvent) => {
      const message = event.detail;
      if (message.payload.cellId === cellId) {
        setSteps(prev => [...prev, message.payload.step]);
        setIsStreaming(true);
      }
    };

    window.addEventListener('reasoning-step', handleReasoningStep as EventListener);

    return () => {
      window.removeEventListener('reasoning-step', handleReasoningStep as EventListener);
    };
  }, [cellId, subscribe]);

  useEffect(() => {
    // Detect end of streaming
    if (steps.length > 0 && steps[steps.length - 1].content.includes('FINAL')) {
      setIsStreaming(false);
    }
  }, [steps]);

  return (
    <div className="reasoning-panel">
      <div className="reasoning-header">
        <h3>Claw Reasoning</h3>
        {isStreaming && <span className="streaming-indicator">● Streaming...</span>}
      </div>

      <div className="reasoning-steps">
        {steps.map((step, index) => (
          <div key={index} className="reasoning-step">
            <div className="step-header">
              <span className="step-number">Step {index + 1}</span>
              <span className="step-confidence">
                Confidence: {(step.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="step-content">
              <ReactMarkdown>{step.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### HITLApproval

```typescript
// packages/agent-ui/src/components/HITLApproval.tsx

import React, { useState, useEffect } from 'react';
import { useClawWebSocket } from '../providers/ClawWebSocketProvider';

interface PendingAction {
  traceId: string;
  cellId: string;
  action: any;
  reasoning: string;
}

export const HITLApproval: React.FC = () => {
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const { trigger } = useClawWebSocket();

  useEffect(() => {
    const handleApprovalRequired = (event: CustomEvent) => {
      const message = event.detail;
      setPendingActions(prev => [...prev, {
        traceId: message.traceId,
        cellId: message.payload.cellId,
        action: message.payload.action,
        reasoning: message.payload.reasoning
      }]);
    };

    window.addEventListener('approval-required', handleApprovalRequired as EventListener);

    return () => {
      window.removeEventListener('approval-required', handleApprovalRequired as EventListener);
    };
  }, []);

  const handleApprove = (traceId: string) => {
    trigger('approval', { traceId, approved: true });
    setPendingActions(prev => prev.filter(a => a.traceId !== traceId));
  };

  const handleReject = (traceId: string, reason: string) => {
    trigger('approval', { traceId, approved: false, reason });
    setPendingActions(prev => prev.filter(a => a.traceId !== traceId));
  };

  return (
    <div className="hitl-approval">
      <h2>Pending Approvals</h2>

      {pendingActions.length === 0 ? (
        <p>No pending actions</p>
      ) : (
        <div className="pending-list">
          {pendingActions.map(action => (
            <div key={action.traceId} className="pending-action">
              <div className="action-header">
                <span className="cell-id">Cell: {action.cellId}</span>
                <span className="trace-id">ID: {action.traceId}</span>
              </div>

              <div className="action-reasoning">
                <h4>Reasoning:</h4>
                <p>{action.reasoning}</p>
              </div>

              <div className="action-details">
                <h4>Proposed Action:</h4>
                <pre>{JSON.stringify(action.action, null, 2)}</pre>
              </div>

              <div className="action-buttons">
                <button
                  onClick={() => handleApprove(action.traceId)}
                  className="approve-button"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleReject(action.traceId, 'User rejected')}
                  className="reject-button"
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### ClawCellEditor

```typescript
// packages/agent-ui/src/components/ClawCellEditor.tsx

import React, { useState } from 'react';
import { AgentCellType, EquipmentSlot } from '@superinstance/agent-core';

export const ClawCellEditor: React.FC<{
  cellId: string;
  initialConfig?: any;
  onSave: (config: any) => void;
}> = ({ cellId, initialConfig, onSave }) => {
  const [config, setConfig] = useState(initialConfig || {
    type: AgentCellType.SENSOR,
    seed: {
      purpose: '',
      trigger: { type: 'cell_change', cellId }
    },
    model: {
      provider: 'deepseek',
      model: 'deepseek-chat'
    },
    equipment: ['MEMORY', 'REASONING']
  });

  return (
    <div className="claw-cell-editor">
      <h2>Configure Claw Cell: {cellId}</h2>

      <div className="editor-section">
        <label>Agent Type</label>
        <select
          value={config.type}
          onChange={(e) => setConfig({ ...config, type: e.target.value })}
        >
          <option value={AgentCellType.SENSOR}>Sensor</option>
          <option value={AgentCellType.ANALYZER}>Analyzer</option>
          <option value={AgentCellType.CONTROLLER}>Controller</option>
          <option value={AgentCellType.ORCHESTRATOR}>Orchestrator</option>
        </select>
      </div>

      <div className="editor-section">
        <label>Purpose</label>
        <textarea
          value={config.seed.purpose}
          onChange={(e) => setConfig({
            ...config,
            seed: { ...config.seed, purpose: e.target.value }
          })}
          placeholder="Describe what this claw should do..."
        />
      </div>

      <div className="editor-section">
        <label>Model Provider</label>
        <select
          value={config.model.provider}
          onChange={(e) => setConfig({
            ...config,
            model: { ...config.model, provider: e.target.value }
          })}
        >
          <option value="deepseek">DeepSeek ($0.14/1M tokens)</option>
          <option value="cloudflare">Cloudflare Workers (Free tier)</option>
          <option value="openai">OpenAI GPT-4</option>
          <option value="anthropic">Anthropic Claude</option>
        </select>
      </div>

      <div className="editor-section">
        <label>Equipment</label>
        <div className="equipment-selector">
          {Object.values(EquipmentSlot).map(slot => (
            <label key={slot} className="equipment-option">
              <input
                type="checkbox"
                checked={config.equipment.includes(slot)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setConfig({
                      ...config,
                      equipment: [...config.equipment, slot]
                    });
                  } else {
                    setConfig({
                      ...config,
                      equipment: config.equipment.filter(s => s !== slot)
                    });
                  }
                }}
              />
              {slot}
            </label>
          ))}
        </div>
      </div>

      <div className="editor-actions">
        <button onClick={() => onSave(config)} className="save-button">
          Save Configuration
        </button>
      </div>
    </div>
  );
};
```

---

## Formula Functions

### CLAW_NEW

```typescript
// packages/agent-formulas/src/functions/CLAW_NEW.ts

import { FunctionType } from '@univerjs/core';
import type { InterpreterValue, Nullable } from '@univerjs/core';

export const CLAW_NEW: FunctionType = {
  id: FunctionType.FUNCTION_ID,
  type: FunctionType.Function,
  name: 'CLAW_NEW',
  description: 'Create a new Claw agent in the current cell',
  minParams: 1,
  maxParams: 4,

  parameters: [
    {
      name: 'purpose',
      description: 'Natural language description of what the claw should do',
      type: 'string',
      required: true
    },
    {
      name: 'type',
      description: 'Agent type (SENSOR, ANALYZER, CONTROLLER, ORCHESTRATOR)',
      type: 'string',
      required: false
    },
    {
      name: 'model',
      description: 'Model provider (deepseek, cloudflare, openai, anthropic)',
      type: 'string',
      required: false
    },
    {
      name: 'equipment',
      description: 'Comma-separated list of equipment slots',
      type: 'string',
      required: false
    }
  ],

  returns: {
    type: 'string',
    description: 'Claw agent ID'
  },

  execute: async (
    purpose: string,
    type: string = 'SENSOR',
    model: string = 'deepseek',
    equipment: string = 'MEMORY,REASONING'
  ): Promise<Nullable<InterpreterValue>> => {
    // Create claw configuration
    const config = {
      type: type.toUpperCase(),
      seed: { purpose },
      model: { provider: model },
      equipment: equipment.split(',').map(e => e.trim())
    };

    // Create claw via API
    const response = await fetch('/api/claws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const claw = await response.json();
    return claw.id;
  }
};
```

### CLAW_EQUIP

```typescript
// packages/agent-formulas/src/functions/CLAW_EQUIP.ts

export const CLAW_EQUIP: FunctionType = {
  id: FunctionType.FUNCTION_ID + 1,
  type: FunctionType.Function,
  name: 'CLAW_EQUIP',
  description: 'Equip equipment to a Claw agent',
  minParams: 2,
  maxParams: 2,

  parameters: [
    {
      name: 'claw_id',
      description: 'ID of the claw agent',
      type: 'string',
      required: true
    },
    {
      name: 'equipment',
      description: 'Equipment slot to equip (MEMORY, REASONING, etc.)',
      type: 'string',
      required: true
    }
  ],

  returns: {
    type: 'boolean',
    description: 'Success status'
  },

  execute: async (
    clawId: string,
    equipment: string
  ): Promise<Nullable<InterpreterValue>> => {
    const response = await fetch(`/api/claws/${clawId}/equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipment: equipment.toUpperCase() })
    });

    return response.ok;
  }
};
```

### CLAW_TRIGGER

```typescript
// packages/agent-formulas/src/functions/CLAW_TRIGGER.ts

export const CLAW_TRIGGER: FunctionType = {
  id: FunctionType.FUNCTION_ID + 2,
  type: FunctionType.Function,
  name: 'CLAW_TRIGGER',
  description: 'Manually trigger a Claw agent',
  minParams: 1,
  maxParams: 2,

  parameters: [
    {
      name: 'claw_id',
      description: 'ID of the claw agent',
      type: 'string',
      required: true
    },
    {
      name: 'data',
      description: 'Optional data to pass to the claw',
      type: 'any',
      required: false
    }
  ],

  returns: {
    type: 'string',
    description: 'Result from the claw'
  },

  execute: async (
    clawId: string,
    data?: any
  ): Promise<Nullable<InterpreterValue>> => {
    const response = await fetch(`/api/claws/${clawId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });

    const result = await response.json();
    return result.output;
  }
};
```

### CLAW_RELATE

```typescript
// packages/agent-formulas/src/functions/CLAW_RELATE.ts

export const CLAW_RELATE: FunctionType = {
  id: FunctionType.FUNCTION_ID + 3,
  type: FunctionType.Function,
  name: 'CLAW_RELATE',
  description: 'Create a relationship between two Claw agents',
  minParams: 3,
  maxParams: 3,

  parameters: [
    {
      name: 'from_claw_id',
      description: 'ID of the source claw',
      type: 'string',
      required: true
    },
    {
      name: 'to_claw_id',
      description: 'ID of the target claw',
      type: 'string',
      required: true
    },
    {
      name: 'relationship_type',
      description: 'Type of relationship (slave, coworker, peer, delegate, observer)',
      type: 'string',
      required: true
    }
  ],

  returns: {
    type: 'boolean',
    description: 'Success status'
  },

  execute: async (
    fromClawId: string,
    toClawId: string,
    relationshipType: string
  ): Promise<Nullable<InterpreterValue>> => {
    const response = await fetch(`/api/claws/${fromClawId}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: toClawId,
        type: relationshipType.toLowerCase()
      })
    });

    return response.ok;
  }
};
```

---

## Data Flow

### Cell Change Trigger Flow

```
1. User updates cell B2
   ↓
2. Univer detects change
   ↓
3. AgentCellService.onCellChange(B2, newValue)
   ↓
4. Find Claw agent in B2
   ↓
5. Generate trace ID
   ↓
6. Check for recursive loops (TraceProtocol)
   ↓
7. If no loop:
   ↓
8. Transition state: DORMANT → THINKING
   ↓
9. Send to Claw engine (local or Rust backend)
   ↓
10. Model inference with streaming
    ↓
11. Stream reasoning steps via WebSocket
    ↓
12. Update UI (ReasoningPanel)
    ↓
13. Get action + confidence
    ↓
14. If confidence < 0.7:
    ↓
15.    Request approval (HITL)
    ↓
16.    Wait for user input
    ↓
17. Else:
    ↓
18.    Execute action
    ↓
19. Transition state: PROCESSING → POSTED
    ↓
20. Update affected cells
    ↓
21. Emit completion event
    ↓
22. Return to DORMANT
```

### Multi-Claw Coordination Flow

```
1. Claw A (Controller) triggers on cell A1
   ↓
2. Claw A delegates task to slaves:
   - Claw B (cell B1)
   - Claw C (cell C1)
   - Claw D (cell D1)
   ↓
3. Strategy: SEQUENTIAL
   ↓
4. Claw B processes → result B
   ↓
5. Pass result B to Claw C
   ↓
6. Claw C processes (with B context) → result C
   ↓
7. Pass result C to Claw D
   ↓
8. Claw D processes (with C context) → result D
   ↓
9. Return result D to Claw A
   ↓
10. Claw A makes final decision
    ↓
11. Execute final action
```

---

## Implementation Roadmap

### Phase 1: Core Integration (Week 1-2)

**Tasks:**
- [ ] Set up monorepo structure (pnpm workspace)
- [ ] Create packages: agent-core, agent-ui, agent-ai, agent-formulas
- [ ] Define TypeScript interfaces
- [ ] Implement TraceProtocol
- [ ] Create AgentCell base class
- [ ] Implement AgentCellService

**Deliverables:**
- Monorepo with 4 packages
- Core type definitions
- Basic cell lifecycle

### Phase 2: UI Components (Week 3-4)

**Tasks:**
- [ ] Implement ClawWebSocketProvider
- [ ] Create ReasoningPanel component
- [ ] Create HITLApproval component
- [ ] Create ClawCellEditor component
- [ ] Create EquipmentSelector component
- [ ] Add styling (Tailwind CSS)

**Deliverables:**
- Working UI components
- WebSocket integration
- Real-time updates

### Phase 3: Formula Integration (Week 5)

**Tasks:**
- [ ] Register CLAW_NEW function
- [ ] Register CLAW_EQUIP function
- [ ] Register CLAW_TRIGGER function
- [ ] Register CLAW_RELATE function
- [ ] Add Univer formula plugin

**Deliverables:**
- 4 formula functions
- Univer integration

### Phase 4: Backend Integration (Week 6-7)

**Tasks:**
- [ ] Connect to claw/ repo
- [ ] Implement HTTP API
- [ ] Add WebSocket server
- [ ] Implement message routing
- [ ] Add error handling

**Deliverables:**
- HTTP API
- WebSocket server
- Message protocol

### Phase 5: Rust Backend (Week 8-10) - Optional

**Tasks:**
- [ ] Set up Rust project (backend-rust/)
- [ ] Implement Claw engine wrapper
- [ ] Add GPU compute (wgpu/CUDA)
- [ ] Implement WebSocket server (tokio-tungstenite)
- [ ] Add Neon bindings for Node.js
- [ ] Performance testing

**Deliverables:**
- Rust backend
- GPU acceleration
- 10-1000x speedup

### Phase 6: Testing & Documentation (Week 11-12)

**Tasks:**
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Performance tests
- [ ] API documentation
- [ ] User guide

**Deliverables:**
- Test suite
- Documentation
- Performance benchmarks

---

## Testing Strategy

### Unit Tests

```typescript
// packages/agent-core/src/__tests__/AgentCell.test.ts

describe('AgentCell', () => {
  it('should transition from DORMANT to THINKING on trigger', async () => {
    const cell = new AgentCell(mockConfig);
    expect(cell.getState()).toBe(AgentCellState.DORMANT);

    await cell.onCellChange({ cellId: 'B2', newValue: 100 });
    expect(cell.getState()).toBe(AgentCellState.THINKING);
  });

  it('should detect recursive loops', async () => {
    const cell = new AgentCell(mockConfig);
    const traceId = 'trace_loop_test';

    // First call should succeed
    cell['trace'].generate(traceId);
    expect(cell['trace'].checkCollision(traceId, 'B2')).toBe(false);

    // Second call should detect loop
    cell['trace'].checkCollision(traceId, 'B2');
    expect(cell['trace'].checkCollision(traceId, 'B2')).toBe(true);
  });
});
```

### Integration Tests

```typescript// packages/agent-ui/src/__tests__/ClawWebSocketProvider.test.tsx

describe('ClawWebSocketProvider', () => {
  it('should connect to WebSocket server', async () => {
    const { result } = renderHook(() => useClawWebSocket(), {
      wrapper: ClawWebSocketProvider
    });

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
  });

  it('should subscribe to cell updates', async () => {
    const { result } = renderHook(() => useClawWebSocket(), {
      wrapper: ClawWebSocketProvider
    });

    await waitFor(() => result.current.connected);

    act(() => {
      result.current.subscribe('B2');
    });

    // Verify subscription message sent
    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining('"subscribe"')
    );
  });
});
```

### E2E Tests

```typescript
// e2e/claw-cell.spec.ts

import { test, expect } from '@playwright/test';

test('create claw cell with formula', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Enter formula
  await page.locator('#cell-B2').click();
  await page.keyboard.type(`=CLAW_NEW("Monitor stock prices", "SENSOR")`);
  await page.keyboard.press('Enter');

  // Wait for claw creation
  await page.waitForSelector('.claw-indicator');

  // Verify claw exists
  const clawId = await page.locator('#cell-B2').getAttribute('data-claw-id');
  expect(clawId).toBeDefined();
});

test('trigger claw and see reasoning', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Update cell value
  await page.locator('#cell-B2').click();
  await page.keyboard.type('100');
  await page.keyboard.press('Enter');

  // Wait for reasoning panel
  await page.waitForSelector('.reasoning-panel');

  // Verify reasoning steps
  const steps = await page.locator('.reasoning-step').count();
  expect(steps).toBeGreaterThan(0);
});

test('approve claw action', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Trigger claw that needs approval
  await page.locator('#cell-B2').click();
  await page.keyboard.type('1000');
  await page.keyboard.press('Enter');

  // Wait for approval dialog
  await page.waitForSelector('.hitl-approval');

  // Approve action
  await page.click('.approve-button');

  // Verify approval
  await page.waitForSelector('.action-completed');
});
```

---

## Best Practices

### Performance

1. **Use Rust backend for 1000+ cells**
   - 10-1000x speedup
   - GPU acceleration via wgpu/CUDA
   - Memory pooling and zero-copy

2. **Batch WebSocket messages**
   - Combine multiple updates
   - Use binary protocol
   - Compress large payloads

3. **Lazy load UI components**
   - Code splitting
   - Dynamic imports
   - Suspense boundaries

### Security

1. **Validate all inputs**
   - Sanitize cell values
   - Validate API keys
   - Check permissions

2. **Use WebSocket authentication**
   - JWT tokens
   - Origin checking
   - Rate limiting

3. **Sandbox claw execution**
   - WebAssembly isolation
   - Resource limits
   - Timeout enforcement

### UX

1. **Show real-time progress**
   - Streaming reasoning
   - Progress indicators
   - State changes

2. **Provide clear feedback**
   - Error messages
   - Success notifications
   - Confirmation dialogs

3. **Enable keyboard shortcuts**
   - Quick approval (Ctrl+Enter)
   - Quick rejection (Esc)
   - Navigation (arrows)

---

## Success Criteria

### Functional
- ✅ Create claw cells via formulas
- ✅ Trigger on cell changes
- ✅ Display reasoning steps
- ✅ Human-in-the-loop approval
- ✅ Multi-claw coordination

### Performance
- ✅ <100ms trigger latency
- ✅ <50ms reasoning step streaming
- ✅ 1000+ concurrent cells
- ✅ 80%+ test coverage

### Integration
- ✅ Univer formulas work
- ✅ WebSocket connected
- ✅ Claw engine integrated
- ✅ Rust backend optional

---

## Support

**Schema Architect:** Claude Code (this project's architect)
**Implementation:** Specialist agents per repository
**Issues:** https://github.com/SuperInstance/spreadsheet-moment/issues
**Discussions:** https://github.com/SuperInstance/spreadsheet-moment/discussions

**Related Repos:**
- https://github.com/SuperInstance/claw
- https://github.com/SuperInstance/SuperInstance-papers

---

**Version:** 1.0.0
**Status:** Ready for Implementation
**Last Updated:** 2026-03-15
