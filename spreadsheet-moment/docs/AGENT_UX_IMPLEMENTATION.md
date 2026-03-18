# Agent UX Implementation Guide

**Version:** 1.0.0
**Last Updated:** March 16, 2026
**Project:** Spreadsheet Moment - Agentic Spreadsheet Platform

---

## Overview

This guide provides implementation teams with concrete steps to deliver the UX patterns and prototypes specified in the companion documents. It includes code examples, architecture decisions, and integration points.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Setup](#architecture-setup)
3. [Component Implementation](#component-implementation)
4. [State Management](#state-management)
5. [Animation System](#animation-system)
6. [Natural Language Integration](#natural-language-integration)
7. [Testing Strategy](#testing-strategy)
8. [Performance Guidelines](#performance-guidelines)
9. [Accessibility Implementation](#accessibility-implementation)
10. [Deployment Checklist](#deployment-checklist)

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
cd spreadsheet-moment/packages/agent-ui
npm install

# Install additional UI dependencies
npm install @radix-ui/react-icons @radix-ui/react-popover
npm install framer-motion @react-three/fiber @react-three/drei
npm install zustand immer
```

### File Structure

```
packages/agent-ui/src/
├── components/
│   ├── agent/
│   │   ├── AgentCell.tsx           # Main agent cell component
│   │   ├── AgentState.tsx          # State visualization
│   │   ├── AgentConnections.tsx    # Connection rendering
│   │   └── AgentDetails.tsx        # Detail panel
│   ├── ecosystem/
│   │   ├── LivingEcosystem.tsx     # Ecosystem visualization
│   │   ├── ColonyView.tsx          # Colony grouping
│   │   └── SignalLayer.tsx         # Chemical signals
│   ├── builder/
│   │   ├── NLAgentBuilder.tsx      # Natural language builder
│   │   ├── ConversationPanel.tsx   # Chat interface
│   │   └── AgentPreview.tsx        # Live preview
│   ├── debugger/
│   │   ├── SpatialDebugger.tsx     # 3D debugger
│   │   ├── TimeScrubber.tsx        # Timeline control
│   │   └── ErrorHighlighter.tsx    # Error visualization
│   └── shared/
│       ├── AnimationProvider.tsx   # Animation context
│       ├── StatusIndicator.tsx     # Reusable status
│       └── Tooltip.tsx             # Enhanced tooltips
├── hooks/
│   ├── useAgentState.ts            # Agent state management
│   ├── useAnimation.ts             # Animation hooks
│   ├── useNLParser.ts              # Natural language parsing
│   └── use3DView.ts                # 3D visualization
├── store/
│   ├── agentStore.ts               # Global agent state
│   ├── uiStore.ts                  # UI state
│   └── connectionStore.ts          # Connection state
├── utils/
│   ├── animations.ts               # Animation utilities
│   ├── colors.ts                   # Color system
│   └── accessibility.ts            # A11y helpers
└── types/
    ├── agent.types.ts              # Agent type definitions
    ├── ui.types.ts                 # UI type definitions
    └── animation.types.ts          # Animation types
```

### Minimal Implementation

```typescript
// packages/agent-ui/src/components/agent/AgentCell.tsx

import React from 'react';
import { useAgentStore } from '../../store/agentStore';
import { AgentStateIndicator } from '../shared/StatusIndicator';
import { animations } from '../../utils/animations';
import clsx from 'clsx';

interface AgentCellProps {
  id: string;
  onClick?: () => void;
}

export const AgentCell: React.FC<AgentCellProps> = ({ id, onClick }) => {
  const agent = useAgentStore(state => state.agents[id]);

  if (!agent) return null;

  return (
    <div
      className={clsx(
        'agent-cell',
        `state-${agent.state.status.toLowerCase()}`,
        animations[agent.state.status]
      )}
      onClick={onClick}
      role="gridcell"
      aria-label={`Agent ${agent.name}, ${agent.state.status}`}
      tabIndex={0}
    >
      <AgentStateIndicator status={agent.state.status} />
      <span className="agent-value">{agent.value}</span>
    </div>
  );
};
```

---

## Architecture Setup

### Component Architecture

```typescript
// packages/agent-ui/src/types/ui.types.ts

export interface UIComponentConfig {
  // Core UI components
  AgentCell: AgentCellConfig;
  ConnectionVisualizer: ConnectionConfig;
  ConfigurationPanel: PanelConfig;
  SpatialDebugger: DebuggerConfig;

  // Theme
  theme: {
    mode: 'light' | 'dark' | 'auto';
    animations: boolean;
    reducedMotion: boolean;
  };

  // Layout
  layout: {
    zoomLevel: number;
    gridSize: number;
    showGrid: boolean;
  };
}

export interface AgentCellConfig {
  size: 'small' | 'medium' | 'large';
  showConnections: boolean;
  animationIntensity: 'subtle' | 'normal' | 'prominent';
  showDetails: boolean;
}
```

### State Management Architecture

```typescript
// packages/agent-ui/src/store/agentStore.ts

import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AgentState {
  agents: Record<string, Agent>;
  connections: Connection[];
  colonies: Colony[];
}

interface AgentActions {
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  addConnection: (connection: Connection) => void;
  updateColonyDetection: () => void;
}

export const useAgentStore = create<AgentState & AgentActions>()(
  devtools(
    persist(
      (set, get) => ({
        agents: {},
        connections: [],
        colonies: [],

        addAgent: (agent) => set((state) => ({
          agents: { ...state.agents, [agent.id]: agent }
        })),

        updateAgent: (id, updates) => set((state) => ({
          agents: {
            ...state.agents,
            [id]: { ...state.agents[id], ...updates }
          }
        })),

        removeAgent: (id) => set((state) => {
          const agents = { ...state.agents };
          delete agents[id];
          return { agents };
        }),

        addConnection: (connection) => set((state) => ({
          connections: [...state.connections, connection]
        })),

        updateColonyDetection: () => {
          const { agents } = get();
          const colonies = detectColonies(Object.values(agents));
          set({ colonies });
        }
      }),
      { name: 'agent-store' }
    )
  )
);
```

### Animation System

```typescript
// packages/agent-ui/src/utils/animations.ts

export const ANIMATION_CONFIG = {
  durations: {
    fast: 150,
    normal: 300,
    slow: 600
  },
  easings: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'
  }
};

export const agentAnimations = {
  idle: {
    keyframes: [
      { transform: 'scale(1)', opacity: '1' },
      { transform: 'scale(1.02)', opacity: '0.95' },
      { transform: 'scale(1)', opacity: '1' }
    ],
    duration: 2000,
    iterations: Infinity,
    easing: 'ease-in-out'
  },

  thinking: {
    keyframes: [
      { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.4)' },
      { boxShadow: '0 0 0 10px rgba(59, 130, 246, 0)' },
      { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' }
    ],
    duration: 1500,
    iterations: Infinity,
    easing: 'ease-out'
  },

  error: {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(0)' }
    ],
    duration: 400,
    iterations: 1,
    easing: 'ease-in-out'
  }
};

// Hook for using animations
export const useAgentAnimation = (status: AgentStatus) => {
  const animation = agentAnimations[status.toLowerCase()];

  return {
    style: {
      animation: `${animation.duration}ms ${animation.easing} ${animation.iterations === Infinity ? 'infinite' : '1'}`,
      animationName: status.toLowerCase()
    }
  };
};
```

---

## Component Implementation

### 1. Agent Cell Component

```typescript
// packages/agent-ui/src/components/agent/AgentCell.tsx

import React, { useEffect, useRef } from 'react';
import { useAgentStore } from '../../store/agentStore';
import { useAgentAnimation } from '../../utils/animations';
import { AgentStateIndicator } from '../shared/StatusIndicator';
import clsx from 'clsx';

interface AgentCellProps {
  id: string;
  className?: string;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const AgentCell: React.FC<AgentCellProps> = ({
  id,
  className,
  onClick,
  onContextMenu
}) => {
  const agent = useAgentStore(state => state.agents[id]);
  const animation = useAgentAnimation(agent?.state.status || 'IDLE');
  const ref = useRef<HTMLDivElement>(null);

  // Subscribe to agent updates
  useEffect(() => {
    if (!agent) return;

    const unsubscribe = useAgentStore.getState().subscribe(
      id,
      (updates) => {
        // Handle real-time updates
        console.log('Agent updated:', updates);
      }
    );

    return unsubscribe;
  }, [agent?.id]);

  if (!agent) {
    return <div className="agent-cell empty" />;
  }

  const { status, progress, value } = agent.state;

  return (
    <div
      ref={ref}
      className={clsx(
        'agent-cell',
        `status-${status.toLowerCase()}`,
        className
      )}
      style={animation.style}
      onClick={onClick}
      onContextMenu={onContextMenu}
      role="gridcell"
      aria-label={`Agent ${agent.name}, status: ${status}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick?.();
        if (e.key === 'Delete') useAgentStore.getState().removeAgent(id);
      }}
    >
      {/* Status indicator */}
      <AgentStateIndicator status={status} />

      {/* Value display */}
      <div className="agent-value">
        {status === 'THINKING' ? (
          <ThinkingProgress progress={progress} />
        ) : (
          <span>{formatValue(value)}</span>
        )}
      </div>

      {/* Connection points */}
      {(agent.connections?.length > 0) && (
        <div className="connection-points">
          {agent.connections.map(conn => (
            <ConnectionPoint key={conn.id} connection={conn} />
          ))}
        </div>
      )}

      {/* Error tooltip */}
      {status === 'ERROR' && (
        <ErrorTooltip error={agent.state.error} />
      )}
    </div>
  );
};
```

### 2. Connection Visualizer

```typescript
// packages/agent-ui/src/components/agent/AgentConnections.tsx

import React, { useMemo } from 'react';
import { useAgentStore } from '../../store/agentStore';
import { getCellPosition } from '../../utils/positions';

interface AgentConnectionsProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export const AgentConnections: React.FC<AgentConnectionsProps> = ({
  containerRef
}) => {
  const agents = useAgentStore(state => state.agents);
  const connections = useAgentStore(state => state.connections);

  const connectionPaths = useMemo(() => {
    return connections.map(conn => {
      const fromAgent = agents[conn.from];
      const toAgent = agents[conn.to];

      if (!fromAgent || !toAgent) return null;

      const from = getCellPosition(fromAgent.id);
      const to = getCellPosition(toAgent.id);

      const path = calculateConnectionPath(from, to, conn.type);

      return { conn, path };
    }).filter(Boolean);
  }, [agents, connections]);

  return (
    <svg className="connections-layer">
      <defs>
        {/* Arrow marker */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
        </marker>

        {/* Glow filter for active connections */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {connectionPaths.map(({ conn, path }) => (
        <g key={conn.id} className="connection">
          {/* Connection line */}
          <path
            d={path}
            stroke={getConnectionColor(conn.type)}
            strokeWidth={2}
            fill="none"
            markerEnd="url(#arrowhead)"
            className={conn.active ? 'active' : 'inactive'}
          />

          {/* Data flow animation */}
          {conn.active && (
            <circle r="3" fill="currentColor">
              <animateMotion
                dur="1s"
                repeatCount="indefinite"
                path={path}
              />
            </circle>
          )}

          {/* Connection label */}
          <text
            x={midpoint(path).x}
            y={midpoint(path).y - 10}
            className="connection-label"
          >
            {conn.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

function calculateConnectionPath(
  from: Point,
  to: Point,
  type: ConnectionType
): string {
  switch (type) {
    case 'data':
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

    case 'trigger':
      // Curved line for triggers
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2 - 20;
      return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;

    case 'dependency':
      // Dashed line handled by CSS
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

    default:
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }
}
```

### 3. Natural Language Builder

```typescript
// packages/agent-ui/src/components/builder/NLAgentBuilder.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useAgentStore } from '../../store/agentStore';
import { parseUserIntent } from '../../utils/nl-parser';

interface NLAgentBuilderProps {
  onComplete: (config: AgentConfig) => void;
  onCancel: () => void;
}

export const NLAgentBuilder: React.FC<NLAgentBuilderProps> = ({
  onComplete,
  onCancel
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<Partial<AgentConfig>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Parse intent
      const result = await parseUserIntent(input);

      // Add system response
      const systemMessage: Message = {
        role: 'system',
        content: result.response,
        timestamp: Date.now(),
        suggestions: result.suggestions,
        confidence: result.confidence
      };
      setMessages(prev => [...prev, systemMessage]);

      // Update config
      setConfig(prev => ({ ...prev, ...result.config }));

      // Check if ready to create
      if (result.confidence > 0.8) {
        setTimeout(() => {
          onComplete(result.config);
        }, 1000);
      }
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        role: 'system',
        content: 'I had trouble understanding that. Could you rephrase?',
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="nl-agent-builder">
      {/* Header */}
      <div className="builder-header">
        <h3>Build Your Agent</h3>
        <p>Tell me what you want your agent to do</p>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <p>Try something like:</p>
            <ul>
              <li>"Monitor temperature and alert if > 80°C"</li>
              <li>"Fetch stock prices every 5 minutes"</li>
              <li>"Analyze customer sentiment from reviews"</li>
            </ul>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Live Preview */}
      {Object.keys(config).length > 0 && (
        <div className="config-preview">
          <AgentMiniPreview config={config} />
        </div>
      )}

      {/* Input */}
      <div className="input-container">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Describe what you want your agent to do..."
          disabled={isLoading}
        />
        <div className="input-actions">
          <button onClick={onCancel} variant="ghost">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            variant="primary"
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## State Management

### Agent Store Pattern

```typescript
// packages/agent-ui/src/store/agentStore.ts

import create from 'zustand';
import { devtools } from 'zustand/middleware';

interface AgentStore {
  // State
  agents: Record<string, Agent>;
  connections: Connection[];
  colonies: Colony[];
  selection: string | null;

  // Actions
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  selectAgent: (id: string | null) => void;

  // Connection actions
  addConnection: (connection: Connection) => void;
  removeConnection: (id: string) => void;

  // Colony detection
  updateColonies: () => void;

  // Subscription
  subscribe: (agentId: string, callback: (updates: any) => void) => () => void;
}

export const useAgentStore = create<AgentStore>()(
  devtools((set, get) => ({
    // Initial state
    agents: {},
    connections: [],
    colonies: [],
    selection: null,

    // Agent actions
    addAgent: (agent) => set((state) => ({
      agents: { ...state.agents, [agent.id]: agent }
    })),

    updateAgent: (id, updates) => set((state) => ({
      agents: {
        ...state.agents,
        [id]: { ...state.agents[id], ...updates }
      }
    })),

    removeAgent: (id) => set((state) => {
      const agents = { ...state.agents };
      const connections = state.connections.filter(
        c => c.from !== id && c.to !== id
      );
      delete agents[id];
      return { agents, connections };
    }),

    selectAgent: (id) => set({ selection: id }),

    // Connection actions
    addConnection: (connection) => set((state) => ({
      connections: [...state.connections, connection]
    })),

    removeConnection: (id) => set((state) => ({
      connections: state.connections.filter(c => c.id !== id)
    })),

    // Colony detection
    updateColonies: () => {
      const { agents } = get();
      const colonies = detectColonies(Object.values(agents));
      set({ colonies });
    },

    // Subscription
    subscribe: (agentId, callback) => {
      // Implement WebSocket or event subscription
      const unsubscribe = subscribeToAgentUpdates(agentId, callback);
      return unsubscribe;
    }
  }))
);
```

---

## Animation System

### Framer Motion Integration

```typescript
// packages/agent-ui/src/components/shared/AnimatedAgentCell.tsx

import { motion } from 'framer-motion';
import { AgentCellProps } from './AgentCell';

export const AnimatedAgentCell: React.FC<AgentCellProps> = (props) => {
  const variants = {
    idle: {
      scale: [1, 1.02, 1],
      opacity: [1, 0.95, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    thinking: {
      boxShadow: [
        '0 0 0 0 rgba(59, 130, 246, 0.4)',
        '0 0 0 10px rgba(59, 130, 246, 0)',
        '0 0 0 0 rgba(59, 130, 246, 0)'
      ],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeOut'
      }
    },
    error: {
      x: [0, -10, 10, -10, 0],
      transition: {
        duration: 0.4,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <motion.div
      className="agent-cell"
      animate={props.status.toLowerCase()}
      variants={variants}
      {...props}
    />
  );
};
```

---

## Natural Language Integration

### LLM Integration

```typescript
// packages/agent-ui/src/utils/nl-parser.ts

import { openai } from '../lib/openai';

export async function parseUserIntent(
  input: string
): Promise<ParsedIntentResult> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are an agent configuration assistant. Parse user requests
        into structured agent configurations.

        Respond in JSON with this schema:
        {
          "intent": "monitor|analyze|predict|automate|notify",
          "trigger": { "type": "...", "value": "..." },
          "action": { "type": "...", "target": "..." },
          "confidence": 0.0-1.0,
          "response": "string",
          "suggestions": ["..."]
        }`
      },
      {
        role: 'user',
        content: input
      }
    ],
    functions: [parseIntentFunction],
    function_call: { name: 'parse_intent' }
  });

  const functionCall = response.choices[0].message.function_call;
  return JSON.parse(functionCall.arguments);
}

const parseIntentFunction = {
  name: 'parse_intent',
  description: 'Parse user intent for agent configuration',
  parameters: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: ['monitor', 'analyze', 'predict', 'automate', 'notify']
      },
      trigger: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          value: {}
        }
      },
      action: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          target: { type: 'string' }
        }
      },
      confidence: { type: 'number' },
      response: { type: 'string' },
      suggestions: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['intent', 'confidence', 'response']
  }
};
```

---

## Testing Strategy

### Component Tests

```typescript
// packages/agent-ui/src/components/agent/__tests__/AgentCell.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { AgentCell } from '../AgentCell';

describe('AgentCell', () => {
  const mockAgent = {
    id: 'test-agent',
    name: 'Test Agent',
    type: 'monitor',
    state: {
      status: 'IDLE',
      value: 42
    }
  };

  beforeEach(() => {
    useAgentStore.setState({ agents: { [mockAgent.id]: mockAgent } });
  });

  it('renders agent with correct status', () => {
    render(<AgentCell id={mockAgent.id} />);
    expect(screen.getByRole('gridcell')).toHaveAttribute(
      'aria-label',
      'Agent Test Agent, status: IDLE'
    );
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<AgentCell id={mockAgent.id} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('gridcell'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard navigation', () => {
    render(<AgentCell id={mockAgent.id} />);

    const cell = screen.getByRole('gridcell');
    cell.focus();

    fireEvent.keyDown(cell, { key: 'Enter' });
    // Should trigger click behavior

    fireEvent.keyDown(cell, { key: 'Delete' });
    // Should delete agent
  });

  it('shows error state', () => {
    useAgentStore.setState({
      agents: {
        [mockAgent.id]: {
          ...mockAgent,
          state: { status: 'ERROR', error: 'Test error' }
        }
      }
    });

    render(<AgentCell id={mockAgent.id} />);
    expect(screen.getByRole('gridcell')).toHaveClass('status-error');
  });
});
```

### Integration Tests

```typescript
// packages/agent-ui/src/__tests__/integration/AgentBuilder.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { NLAgentBuilder } from '../../components/builder/NLAgentBuilder';

describe('NL Agent Builder Integration', () => {
  it('creates agent from natural language', async () => {
    const onComplete = jest.fn();

    render(<NLAgentBuilder onComplete={onComplete} />);

    // Type input
    const input = screen.getByPlaceholderText(/describe what you want/i);
    fireEvent.change(input, {
      target: { value: 'Monitor temperature and alert if > 80°C' }
    });

    // Send
    fireEvent.click(screen.getByText('Send'));

    // Wait for parsing
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'monitor',
          trigger: expect.objectContaining({
            type: 'threshold',
            value: 80
          })
        })
      );
    });
  });
});
```

---

## Performance Guidelines

### Optimization Checklist

```typescript
// packages/agent-ui/src/utils/performance.ts

export const performanceOptimizations = {
  // 1. Memoization
  memoizeExpensiveCalculations: () => {
    // Use useMemo for expensive computations
    const visibleAgents = useMemo(
      () => agents.filter(a => isInViewport(a)),
      [agents, viewport]
    );
  },

  // 2. Virtualization
  useVirtualizationForManyAgents: (agentCount: number) => {
    if (agentCount > 100) {
      return {
        useVirtualScroll: true,
        windowSize: 20
      };
    }
  },

  // 3. Throttling
  throttleExpensiveOperations: () => {
    const throttledUpdate = useThrottledCallback(
      (data) => updateAgent(data),
      100 // Update at most every 100ms
    );
  },

  // 4. Lazy loading
  lazyLoadComponents: () => {
    const SpatialDebugger = lazy(() => import('./SpatialDebugger'));
    const NLAgentBuilder = lazy(() => import('./NLAgentBuilder'));
  },

  // 5. Canvas rendering for many elements
  useCanvasForManyAgents: (count: number) => {
    if (count > 50) {
      return 'canvas';
    }
    return 'svg';
  }
};
```

---

## Accessibility Implementation

### WCAG 2.1 Compliance

```typescript
// packages/agent-ui/src/utils/accessibility.ts

export const a11y = {
  // Keyboard navigation
  keyboardNavigation: {
    tabOrder: 'logical',
    shortcuts: {
      createAgent: 'Ctrl+N',
      editAgent: 'Ctrl+E',
      deleteAgent: 'Delete',
      openDebugger: 'Ctrl+D'
    }
  },

  // Screen reader support
  screenReader: {
    announceAgentState: (agent: Agent) => {
      return `Agent ${agent.name}, status: ${agent.state.status}`;
    },
    announceConnection: (conn: Connection) => {
      return `Connected to agent ${conn.to}, type: ${conn.type}`;
    }
  },

  // Focus indicators
  focusIndicator: {
    show: true,
    style: '2px solid #3B82F6',
    outline: true
  },

  // Reduced motion
  reducedMotion: () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
};
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All components tested
- [ ] Accessibility audit passed
- [ ] Performance benchmarks met
- [ ] TypeScript compiles without errors
- [ ] All dependencies audited
- [ ] Documentation complete

### Build & Deploy

```bash
# Build for production
npm run build

# Run tests
npm run test

# Check bundle size
npm run size

# Deploy to staging
npm run deploy:staging

# Run smoke tests
npm run test:smoke

# Deploy to production
npm run deploy:production
```

### Post-Deployment

- [ ] Monitor performance metrics
- [ ] Check error rates
- [ ] Validate user flows
- [ ] Collect user feedback
- [ ] Monitor accessibility
- [ ] Review analytics

---

## Conclusion

This implementation guide provides everything needed to build the UX patterns specified in the research documents. Follow the checklist, use the code examples, and refer to the architecture diagrams for successful implementation.

**Next Steps:**
1. Set up development environment
2. Implement core components
3. Add animations and polish
4. Test thoroughly
5. Deploy and iterate

---

**Document Version:** 1.0.0
**Last Updated:** March 16, 2026
**Maintained By:** UX Research Team, Spreadsheet Moment Project
