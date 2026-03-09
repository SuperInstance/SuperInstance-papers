# Side Panel Code Samples

**Quick Reference for Common Implementation Patterns**

---

## Table of Contents

1. [React Components](#1-react-components)
2. [State Management](#2-state-management)
3. [WebSocket Service](#3-websocket-service)
4. [Platform Adapters](#4-platform-adapters)
5. [Performance Patterns](#5-performance-patterns)
6. [Testing Patterns](#6-testing-patterns)

---

## 1. React Components

### 1.1 Agent Status Indicator

```typescript
// src/panel/components/AgentStatusIndicator.tsx
import React from 'react';
import { usePanelStore } from '../store';

interface AgentStatusIndicatorProps {
  agentId: string;
  compact?: boolean;
}

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  agentId,
  compact = false,
}) => {
  const agent = usePanelStore((state) => state.agents.get(agentId));

  if (!agent) return null;

  const statusConfig = {
    idle: { icon: '⚪', label: 'Idle', color: '#9CA3AF' },
    running: { icon: '🔄', label: 'Running', color: '#3B82F6' },
    completed: { icon: '✅', label: 'Complete', color: '#10B981' },
    error: { icon: '❌', label: 'Error', color: '#EF4444' },
  };

  const config = statusConfig[agent.status];

  return (
    <div
      className={`agent-status ${compact ? 'compact' : 'full'}`}
      style={{ color: config.color }}
    >
      <span className="status-icon">{config.icon}</span>
      {!compact && <span className="status-label">{config.label}</span>}
      {agent.status === 'running' && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${agent.progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
```

### 1.2 Agent List with Virtual Scrolling

```typescript
// src/panel/components/AgentList.tsx
import React from 'react';
import { FixedSizeList } from 'react-window';
import { usePanelStore } from '../store';
import { AgentStatusIndicator } from './AgentStatusIndicator';

export const AgentList: React.FC = () => {
  const agents = usePanelStore((state) => Array.from(state.agents.values()));
  const selectAgent = usePanelStore((state) => state.selectAgent);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const agent = agents[index];

    return (
      <div
        style={style}
        className="agent-item"
        onDoubleClick={() => selectAgent(agent.id)}
      >
        <span className="cell-ref">{agent.cellRef}</span>
        <AgentStatusIndicator agentId={agent.id} compact />
      </div>
    );
  };

  return (
    <div className="agent-list">
      <FixedSizeList
        height={600}
        itemCount={agents.length}
        itemSize={80}
        width="100%"
      >
        {Row}
      </FixedSizeList>
    </div>
  );
};
```

### 1.3 Inspector View

```typescript
// src/panel/components/InspectorView.tsx
import React, { useState, useEffect } from 'react';
import { usePanelStore } from '../store';
import { AgentStatusIndicator } from './AgentStatusIndicator';

export const InspectorView: React.FC = () => {
  const selectedAgentId = usePanelStore((state) => state.selectedAgentId);
  const agent = usePanelStore((state) =>
    selectedAgentId ? state.agents.get(selectedAgentId) : undefined
  );
  const [activeTab, setActiveTab] = useState<'details' | 'trace' | 'a2a'>('details');

  if (!agent) {
    return <div className="inspector-empty">Select an agent to inspect</div>;
  }

  return (
    <div className="inspector-view">
      <div className="inspector-header">
        <h3>Agent Inspector</h3>
        <span className="agent-id">{agent.id}</span>
      </div>

      <div className="inspector-tabs">
        {['details', 'trace', 'a2a'].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab as any)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="inspector-content">
        {activeTab === 'details' && (
          <div className="agent-details">
            <div className="detail-row">
              <span>Cell:</span>
              <span>{agent.cellRef}</span>
            </div>
            <div className="detail-row">
              <span>Status:</span>
              <AgentStatusIndicator agentId={agent.id} compact />
            </div>
            <div className="detail-row">
              <span>Progress:</span>
              <span>{agent.progress}%</span>
            </div>
          </div>
        )}

        {activeTab === 'trace' && <ExecutionTrace agentId={agent.id} />}
        {activeTab === 'a2a' && <A2APackages agentId={agent.id} />}
      </div>
    </div>
  );
};

const ExecutionTrace: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [trace, setTrace] = useState([]);

  useEffect(() => {
    fetch(`/api/agents/${agentId}/trace`)
      .then((res) => res.json())
      .then(setTrace);
  }, [agentId]);

  return (
    <div className="execution-trace">
      {trace.length === 0 ? (
        <p>No trace available</p>
      ) : (
        <ul>
          {trace.map((step: any, i) => (
            <li key={i}>
              <span className="timestamp">
                {new Date(step.timestamp).toLocaleTimeString()}
              </span>
              <span className="action">{step.action}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const A2APackages: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    fetch(`/api/agents/${agentId}/a2a`)
      .then((res) => res.json())
      .then(setPackages);
  }, [agentId]);

  return (
    <div className="a2a-packages">
      {packages.length === 0 ? (
        <p>No A2A packages</p>
      ) : (
        <ul>
          {packages.map((pkg: any, i) => (
            <li key={i}>
              <span className="package-id">{pkg.id}</span>
              <span className="package-type">{pkg.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## 2. State Management

### 2.1 Zustand Store Setup

```typescript
// src/panel/store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AgentState {
  id: string;
  cellRef: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  result?: unknown;
  error?: string;
  lastUpdate: number;
}

interface PanelStore {
  // UI State
  selectedAgentId: string | null;
  activeTab: 'agents' | 'inspector' | 'learning' | 'cost' | 'settings';
  collapsedSections: string[];

  // Agent State
  agents: Map<string, AgentState>;

  // Connection State
  isConnected: boolean;
  connectionError: string | null;

  // Actions
  selectAgent: (id: string) => void;
  setActiveTab: (tab: PanelStore['activeTab']) => void;
  updateAgent: (id: string, update: Partial<AgentState>) => void;
  removeAgent: (id: string) => void;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
}

export const usePanelStore = create<PanelStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial State
        selectedAgentId: null,
        activeTab: 'agents',
        collapsedSections: [],
        agents: new Map(),
        isConnected: false,
        connectionError: null,

        // Actions
        selectAgent: (id) =>
          set({ selectedAgentId: id, activeTab: 'inspector' }),

        setActiveTab: (tab) => set({ activeTab: tab }),

        updateAgent: (id, update) =>
          set((state) => {
            const agents = new Map(state.agents);
            const existing = agents.get(id);
            agents.set(id, {
              ...existing,
              ...update,
              lastUpdate: Date.now(),
            } as AgentState);
            return { agents };
          }),

        removeAgent: (id) =>
          set((state) => {
            const agents = new Map(state.agents);
            agents.delete(id);
            return { agents };
          }),

        setConnected: (connected) => set({ isConnected: connected }),

        setConnectionError: (error) => set({ connectionError: error }),
      }),
      {
        name: 'polln-panel-storage',
        partialize: (state) => ({
          activeTab: state.activeTab,
          collapsedSections: state.collapsedSections,
        }),
      }
    ),
    { name: 'POLLN Panel' }
  )
);
```

### 2.2 Store Selectors

```typescript
// src/panel/store/selectors.ts
import { usePanelStore } from './index';

// Memoized selectors
export const useAgents = () =>
  usePanelStore((state) => Array.from(state.agents.values()));

export const useSelectedAgent = () =>
  usePanelStore((state) =>
    state.selectedAgentId ? state.agents.get(state.selectedAgentId) : undefined
  );

export const useActiveAgents = () =>
  usePanelStore((state) =>
    Array.from(state.agents.values()).filter((a) => a.status === 'running')
  );

export const useConnectionStatus = () =>
  usePanelStore((state) => ({
    isConnected: state.isConnected,
    error: state.connectionError,
  }));
```

---

## 3. WebSocket Service

### 3.1 Basic WebSocket Client

```typescript
// src/panel/services/websocket.ts
import { io, Socket } from 'socket.io-client';

export class PanelWebSocketService {
  private socket: Socket | null = null;
  private reconnectTimer: number | null = null;

  constructor(private config: { url: string; token: string }) {}

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(this.config.url, {
      auth: { token: this.config.token },
      reconnection: true,
      reconnectionDelay: 5000,
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to POLLN server');
      this.emit('subscribe:colony', {
        colonyId: this.getColonyId(),
        events: ['agent:spawned', 'agent:updated', 'agent:completed'],
      });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from POLLN server');
    });

    this.socket.on('event:agent', (data) => {
      this.handleAgentEvent(data);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleAgentEvent(data: {
    agentId: string;
    eventType: string;
    data: unknown;
  }): void {
    const { agentId, eventType, data: eventData } = data;

    switch (eventType) {
      case 'status:changed':
        this.store?.updateAgent(agentId, { status: eventData.status });
        break;
      case 'progress:updated':
        this.store?.updateAgent(agentId, { progress: eventData.progress });
        break;
      case 'result:ready':
        this.store?.updateAgent(agentId, {
          status: 'completed',
          result: eventData.result,
          progress: 100,
        });
        break;
    }
  }

  emit(event: string, data: unknown): void {
    this.socket?.emit(event, data);
  }

  disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
    }
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private getColonyId(): string {
    // Get from spreadsheet metadata
    return 'spreadsheet-123';
  }

  private store = {
    updateAgent: (id: string, update: unknown) => {
      // Update Zustand store
      import('../store').then(({ usePanelStore }) => {
        usePanelStore.getState().updateAgent(id, update);
      });
    },
  };
}
```

### 3.2 Reconnection Logic

```typescript
// Enhanced reconnection with exponential backoff
class ReconnectingWebSocket {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000;

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect();
    }, delay) as unknown as number;
  }

  private resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}
```

---

## 4. Platform Adapters

### 4.1 Excel Adapter

```typescript
// src/spreadsheet/excel/adapter.ts
export class ExcelAdapter implements PlatformAdapter {
  async registerPanel(): Promise<void> {
    return new Promise((resolve, reject) => {
      Office.context.document.taskPanes.add({
        id: 'POLLN.SidePanel',
        title: 'POLLN Agents',
        url: this.getPanelURL(),
        width: 350,
        canClose: true,
        canResize: true,
      });

      Office.context.document.taskPanes
        .getById('POLLN.SidePanel')
        .onVisibleChanged.add(() => {
          resolve();
        });
    });
  }

  async showPanel(): Promise<void> {
    await Office.context.document.taskPanes.getById('POLLN.SidePanel').show();
  }

  async hidePanel(): Promise<void> {
    await Office.context.document.taskPanes.getById('POLLN.SidePanel').hide();
  }

  async sendMessage(action: string, payload: unknown): Promise<void> {
    const message = { type: 'fromSpreadsheet', action, payload, timestamp: Date.now() };

    Office.context.document.customXmlParts.addAsync(JSON.stringify(message));
  }

  onMessage(action: string, handler: (payload: unknown) => void): void {
    Office.context.document.addHandlerAsync(
      Office.EventType.DialogMessageReceived,
      (args) => {
        const message = JSON.parse(args.message);
        if (message.action === action) {
          handler(message.payload);
        }
      }
    );
  }

  async loadState(): Promise<PanelState> {
    return new Promise((resolve) => {
      Office.context.document.customXmlParts.getByNamespaceAsync(
        'https://polln.ai/state',
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded && result.value.length > 0) {
            result.value.get(0).getXmlAsync((xmlResult) => {
              const state = JSON.parse(xmlResult.value);
              resolve(state);
            });
          } else {
            resolve(this.getDefaultState());
          }
        }
      );
    });
  }

  async saveState(state: Partial<PanelState>): Promise<void> {
    const currentState = await this.loadState();
    const newState = { ...currentState, ...state };

    return new Promise((resolve, reject) => {
      Office.context.document.customXmlParts.addAsync(
        JSON.stringify(newState),
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve();
          } else {
            reject(result.error);
          }
        }
      );
    });
  }

  private getPanelURL(): string {
    return process.env.NODE_ENV === 'development'
      ? 'https://localhost:3000/taskpane.html'
      : 'https://cdn.polln.ai/excel/taskpane.html';
  }

  private getDefaultState(): PanelState {
    return {
      selectedAgentId: null,
      activeTab: 'agents',
      collapsedSections: [],
    };
  }
}
```

### 4.2 Google Sheets Adapter

```typescript
// src/spreadsheet/sheets/adapter.ts
export class SheetsAdapter implements PlatformAdapter {
  async registerPanel(): Promise<void> {
    // Registration happens via Apps Script
    // This is a no-op for Sheets
  }

  async showPanel(): Promise<void> {
    await this.invokeServerFunction('showSidebar');
  }

  async hidePanel(): Promise<void> {
    await this.invokeServerFunction('hideSidebar');
  }

  async sendMessage(action: string, payload: unknown): Promise<void> {
    const message = { type: 'fromPanel', action, payload, timestamp: Date.now() };
    await this.invokeServerFunction('receiveMessage', message);
  }

  onMessage(action: string, handler: (payload: unknown) => void): void {
    // Poll for messages
    const pollInterval = setInterval(async () => {
      const messages = await this.invokeServerFunction<string[]>('getPendingMessages');
      messages.forEach((messageStr) => {
        const message = JSON.parse(messageStr);
        if (message.action === action) {
          handler(message.payload);
        }
      });
    }, 100);

    // Cleanup on unmount
    return () => clearInterval(pollInterval);
  }

  async loadState(): Promise<PanelState> {
    const stateJson = await this.invokeServerFunction<string>('getPanelState');
    return stateJson ? JSON.parse(stateJson) : this.getDefaultState();
  }

  async saveState(state: Partial<PanelState>): Promise<void> {
    const currentState = await this.loadState();
    const newState = { ...currentState, ...state };
    await this.invokeServerFunction('savePanelState', JSON.stringify(newState));
  }

  private async invokeServerFunction<T>(functionName: string, ...args: unknown[]): Promise<T> {
    return new Promise((resolve, reject) => {
      (window as any).google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        [functionName](...args);
    });
  }

  private getDefaultState(): PanelState {
    return {
      selectedAgentId: null,
      activeTab: 'agents',
      collapsedSections: [],
    };
  }
}
```

---

## 5. Performance Patterns

### 5.1 Update Batching

```typescript
// src/panel/services/batcher.ts
export class UpdateBatcher {
  private updateQueue: Map<string, unknown> = new Map();
  private batchTimer: number | null = null;
  private readonly batchInterval = 100; // ms

  queueUpdate(key: string, value: unknown): void {
    this.updateQueue.set(key, value);

    if (this.batchTimer === null) {
      this.batchTimer = window.setTimeout(() => {
        this.flushUpdates();
      }, this.batchInterval) as unknown as number;
    }
  }

  private flushUpdates(): void {
    if (this.updateQueue.size === 0) {
      this.batchTimer = null;
      return;
    }

    const updates = Object.fromEntries(this.updateQueue);
    this.updateQueue.clear();

    // Apply updates
    this.applyUpdates(updates);

    this.batchTimer = null;
  }

  private applyUpdates(updates: Record<string, unknown>): void {
    // Apply to store
    Object.entries(updates).forEach(([key, value]) => {
      // Update logic
    });
  }
}
```

### 5.2 Debouncing

```typescript
// src/panel/hooks/use-debounce.ts
import { useEffect, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  const timeoutRef = useRef<number | null>(null);

  return ((...args: Parameters<T>) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      func(...args);
      timeoutRef.current = null;
    }, wait) as unknown as number;
  }) as T;
}

// Usage
const debouncedSearch = useDebounce((query: string) => {
  performSearch(query);
}, 300);
```

### 5.3 Throttling

```typescript
// src/panel/hooks/use-throttle.ts
import { useRef } from 'react';

export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle = false;

  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  }) as T;
}

// Usage
const throttledScroll = useThrottle((position: number) => {
  updateScrollPosition(position);
}, 100);
```

---

## 6. Testing Patterns

### 6.1 Component Testing

```typescript
// src/panel/components/__tests__/AgentStatusIndicator.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentStatusIndicator } from '../AgentStatusIndicator';
import { usePanelStore } from '../../store';

describe('AgentStatusIndicator', () => {
  beforeEach(() => {
    usePanelStore.setState({
      agents: new Map([
        [
          'agent-1',
          {
            id: 'agent-1',
            cellRef: 'A1',
            status: 'running',
            progress: 50,
            lastUpdate: Date.now(),
          },
        ],
      ]),
    });
  });

  it('renders running status', () => {
    render(<AgentStatusIndicator agentId="agent-1" />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders compact view when prop is true', () => {
    const { container } = render(
      <AgentStatusIndicator agentId="agent-1" compact />
    );
    expect(container.querySelector('.compact')).toBeInTheDocument();
  });

  it('shows progress bar when status is running', () => {
    render(<AgentStatusIndicator agentId="agent-1" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

### 6.2 Store Testing

```typescript
// src/panel/store/__tests__/index.test.ts
import { usePanelStore } from '../index';

describe('PanelStore', () => {
  beforeEach(() => {
    usePanelStore.setState({
      agents: new Map(),
      selectedAgentId: null,
      activeTab: 'agents',
    });
  });

  it('updates agent state', () => {
    usePanelStore.getState().updateAgent('agent-1', {
      id: 'agent-1',
      cellRef: 'A1',
      status: 'running',
      progress: 0,
      lastUpdate: Date.now(),
    });

    const agent = usePanelStore.getState().agents.get('agent-1');
    expect(agent?.status).toBe('running');
  });

  it('selects agent and switches tab', () => {
    usePanelStore.getState().selectAgent('agent-1');

    const state = usePanelStore.getState();
    expect(state.selectedAgentId).toBe('agent-1');
    expect(state.activeTab).toBe('inspector');
  });

  it('removes agent', () => {
    usePanelStore.getState().updateAgent('agent-1', {
      id: 'agent-1',
      cellRef: 'A1',
      status: 'idle',
      progress: 0,
      lastUpdate: Date.now(),
    });

    usePanelStore.getState().removeAgent('agent-1');

    const agent = usePanelStore.getState().agents.get('agent-1');
    expect(agent).toBeUndefined();
  });
});
```

### 6.3 Service Testing

```typescript
// src/panel/services/__tests__/websocket.test.ts
import { PanelWebSocketService } from '../websocket';

describe('PanelWebSocketService', () => {
  let ws: PanelWebSocketService;

  beforeEach(() => {
    ws = new PanelWebSocketService({
      url: 'http://localhost:3000',
      token: 'test-token',
    });
  });

  it('connects to server', async () => {
    ws.connect();
    // Wait for connection
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(ws.isConnected()).toBe(true);
  });

  it('emits events', () => {
    ws.connect();
    ws.emit('test-event', { data: 'test' });
    // Assert emit was called
  });

  it('handles agent events', () => {
    const handleAgentEvent = jest.fn();
    ws.on('agent:updated', handleAgentEvent);

    // Simulate event
    ws.handleAgentEvent({
      agentId: 'agent-1',
      eventType: 'status:changed',
      data: { status: 'running' },
    });

    expect(handleAgentEvent).toHaveBeenCalled();
  });

  afterEach(() => {
    ws.disconnect();
  });
});
```

---

## Quick Reference

### Essential Commands

```bash
# Install dependencies
npm install react react-dom zustand socket.io-client

# Install dev dependencies
npm install -D @types/react @types/react-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Build
npm run build

# Test
npm run test
npm run test:watch

# Development
npm run dev
```

### File Structure

```
src/panel/
├── components/
│   ├── AgentStatusIndicator.tsx
│   ├── AgentList.tsx
│   ├── InspectorView.tsx
│   └── index.ts
├── services/
│   ├── websocket.ts
│   └── batcher.ts
├── store/
│   ├── index.ts
│   └── selectors.ts
├── hooks/
│   ├── use-debounce.ts
│   └── use-throttle.ts
├── App.tsx
└── index.tsx
```

---

**Document Status:** Complete
**Last Updated:** 2026-03-08
**Purpose:** Quick code reference for side panel implementation
