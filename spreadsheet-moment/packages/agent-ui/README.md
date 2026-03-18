# @spreadsheet-moment/agent-ui

**React UI components** for agent visualization and interaction.

[![Tests](https://img.shields.io/badge/Tests-100%25-brightgreen.svg)](https://github.com/SuperInstance/spreadsheet-moment)
[![Coverage](https://img.shields.io/badge/Coverage-70%25-brightgreen.svg)](https://github.com/SuperInstance/spreadsheet-moment)

## Overview

The `@spreadsheet-moment/agent-ui` package provides React components for visualizing and interacting with agents in the Spreadsheet Moment platform.

## Features

### AgentVisualizer
Pulsing biological agent display with real-time status:

```typescript
import { AgentVisualizer } from '@spreadsheet-moment/agent-ui';

<AgentVisualizer
  agentId="claw_123"
  state="thinking"
  confidence={0.8}
  onStateChange={(newState) => console.log(newState)}
/>
```

### TraceViewer
Execution trace timeline visualization:

```typescript
import { TraceViewer } from '@spreadsheet-moment/agent-ui';

<TraceViewer
  traceId="trace_456"
  steps={executionSteps}
  onStepClick={(step) => console.log(step)}
/>
```

### StatusIndicator
Real-time agent status with animations:

```typescript
import { StatusIndicator } from '@spreadsheet-moment/agent-ui';

<StatusIndicator
  state="thinking"
  progress={0.6}
  message="Analyzing data..."
/>
```

### ReasoningStream
Live reasoning display with streaming updates:

```typescript
import { ReasoningStream } from '@spreadsheet-moment/agent-ui';

<ReasoningStream
  agentId="claw_123"
  streamUrl="ws://localhost:8080/ws"
  onReasoningComplete={(result) => console.log(result)}
/>
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      UI LAYER                                │
├─────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │              AgentVisualizer                      │       │
│  │  • Pulsing animations                             │       │
│  │  • Biological metaphors                           │       │
│  │  • State visualization                            │       │
│  └──────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │              TraceViewer                          │       │
│  │  • Timeline visualization                         │       │
│  │  • Step-by-step execution                         │       │
│  │  • Interactive exploration                        │       │
│  └──────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │              StatusIndicator                      │       │
│  │  • Real-time status                                │       │
│  │  • Progress bars                                   │       │
│  │  • Color-coded states                              │       │
│  └──────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │              ReasoningStream                      │       │
│  │  • Live updates                                    │       │
│  │  • Streaming content                               │       │
│  │  • Markdown rendering                              │       │
│  └──────────────────────────────────────────────────┘       │
│                                                                   │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
pnpm add @spreadsheet-moment/agent-ui
```

## Usage

### Basic Setup

```typescript
import {
  AgentVisualizer,
  TraceViewer,
  StatusIndicator,
  ReasoningStream
} from '@spreadsheet-moment/agent-ui';

function App() {
  return (
    <div>
      <AgentVisualizer agentId="claw_123" state="thinking" />
      <StatusIndicator state="thinking" progress={0.5} />
      <TraceViewer traceId="trace_456" steps={steps} />
      <ReasoningStream agentId="claw_123" />
    </div>
  );
}
```

### Customization

```typescript
<AgentVisualizer
  agentId="claw_123"
  state="thinking"
  size="large"
  colorScheme="dark"
  showLabel={true}
  animationSpeed="slow"
  onStateChange={(state) => console.log(state)}
/>
```

## Components

### AgentVisualizer

| Prop | Type | Description |
|------|------|-------------|
| `agentId` | string | Agent identifier |
| `state` | ClawState | Current state |
| `confidence` | number | Confidence score (0-1) |
| `size` | 'small' \| 'medium' \| 'large' | Display size |
| `colorScheme` | 'light' \| 'dark' | Color theme |
| `onStateChange` | function | State change callback |

### TraceViewer

| Prop | Type | Description |
|------|------|-------------|
| `traceId` | string | Trace identifier |
| `steps` | TraceStep[] | Execution steps |
| `selectedStep` | string | Selected step ID |
| `onStepClick` | function | Step click callback |
| `showTimestamp` | boolean | Show timestamps |

### StatusIndicator

| Prop | Type | Description |
|------|------|-------------|
| `state` | ClawState | Current state |
| `progress` | number | Progress (0-1) |
| `message` | string | Status message |
| `showProgress` | boolean | Show progress bar |

### ReasoningStream

| Prop | Type | Description |
|------|------|-------------|
| `agentId` | string | Agent identifier |
| `streamUrl` | string | WebSocket URL |
| `onComplete` | function | Completion callback |
| `onError` | function | Error callback |

## Styling

### CSS Variables

```css
--agent-color-idle: #9ca3af;
--agent-color-thinking: #8b5cf6;
--agent-color-acting: #f59e0b;
--agent-color-complete: #10b981;
--agent-color-error: #ef4444;
--agent-size-small: 24px;
--agent-size-medium: 48px;
--agent-size-large: 72px;
```

### Custom Styles

```typescript
import { AgentVisualizer } from '@spreadsheet-moment/agent-ui';
import './custom-styles.css';

<AgentVisualizer
  agentId="claw_123"
  state="thinking"
  className="custom-agent"
/>
```

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run storybook
pnpm storybook
```

## Performance

- **Render time**: <16ms (60fps)
- **Update latency**: <50ms
- **Memory overhead**: ~10MB per 100 components
- **Bundle size**: ~50KB gzipped

## License

Apache-2.0

## Links

- [GitHub](https://github.com/SuperInstance/spreadsheet-moment)
- [Documentation](https://docs.spreadsheet-moment.dev)
- [Storybook](https://storybook.spreadsheet-moment.dev)
