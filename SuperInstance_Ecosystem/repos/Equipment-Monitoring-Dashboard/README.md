# @superinstance/equipment-monitoring-dashboard

> Real-time visualization equipment for monitoring agent activity, thinking processes, and cell states in the SuperInstance ecosystem.

## Overview

The Monitoring Dashboard is a specialized equipment that provides comprehensive real-time visualization of agent activities within the SuperInstance ecosystem. It offers:

- **Real-time Agent Visualization**: See what each agent is "thinking about" in their role
- **Cell-by-cell State Display**: Monitor individual cell states with confidence indicators
- **Provenance Chain Visualization**: Track the history and transformations of data
- **Confidence Zone Indicators**: Visual GREEN/YELLOW/RED status for quick health assessment
- **Equipment Status Monitoring**: Track which equipment each agent has equipped
- **Historical Playback**: Review and replay past agent decisions

## Installation

```bash
npm install @superinstance/equipment-monitoring-dashboard
```

## Quick Start

```typescript
import { MonitoringDashboard } from '@superinstance/equipment-monitoring-dashboard';
import { OriginCore } from '@superinstance/starter-agent';

// Create a monitoring dashboard
const dashboard = new MonitoringDashboard({
  port: 3001,
  enablePlayback: true,
});

// Start the dashboard
await dashboard.start();

// Equip to an agent
const agent = new OriginCore({ id: 'my-agent' });
await agent.equip('MonitoringDashboard');

// The dashboard is now available at http://localhost:3001
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MonitoringDashboard                          │
│                      (Equipment)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ ActivityTracker │  │  CellVisualizer │  │ RealTimeMonitor│  │
│  │                 │  │                 │  │                │  │
│  │ • Track agents  │  │ • Cell states   │  │ • WebSocket    │  │
│  │ • Thinking proc │  │ • Confidence    │  │ • Real-time    │  │
│  │ • Events        │  │ • Grid display  │  │ • Subscribers  │  │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                │
│                    ┌───────────▼───────────┐                    │
│                    │   DashboardServer     │                    │
│                    │                       │                    │
│                    │ • HTTP API            │                    │
│                    │ • WebSocket Server    │                    │
│                    │ • Static Dashboard    │                    │
│                    │ • Playback Control    │                    │
│                    └───────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### MonitoringDashboard

The main equipment class that integrates all monitoring capabilities.

```typescript
const dashboard = new MonitoringDashboard({
  port: 3001,              // HTTP server port
  host: 'localhost',       // Server host
  updateIntervalMs: 100,   // Update frequency
  maxActivitiesStored: 1000,
  enablePlayback: true,    // Enable historical playback
  playbackMaxEntries: 10000,
  autoStart: true,         // Auto-start on first equip
});
```

### ActivityTracker

Tracks agent activities and thinking processes.

```typescript
import { ActivityTracker } from '@superinstance/equipment-monitoring-dashboard';

const tracker = new ActivityTracker({
  maxActivitiesStored: 1000,
  thinkingTimeoutMs: 30000,
  trackThoughtProcess: true,
});

// Track thinking
tracker.startThinking('agent-id', 'Analyzing input data...');
tracker.addThoughtStep('agent-id', 'Processing step 1 complete', 0.85);
tracker.endThinking('agent-id', 'Analysis complete');

// Get activities
const activities = tracker.getActivities({
  agentId: 'agent-id',
  type: 'thinking',
  since: Date.now() - 60000,
});
```

### CellVisualizer

Visualizes cell states and confidence zones.

```typescript
import { CellVisualizer } from '@superinstance/equipment-monitoring-dashboard';

const visualizer = new CellVisualizer({
  theme: {
    colors: {
      green: '#22c55e',
      yellow: '#eab308',
      red: '#ef4444',
      background: '#0f172a',
      text: '#f8fafc',
      accent: '#3b82f6',
    },
    cellSize: 40,
    animationDuration: 300,
  },
});

// Get zone statistics
const stats = visualizer.getZoneStatistics();
// Map { 'GREEN' => { count: 10, percentage: 50 }, ... }

// Generate visualizations
const ascii = visualizer.toASCII();
const html = visualizer.toHTML();
const json = visualizer.toJSON();
```

### RealTimeMonitor

WebSocket-based real-time updates.

```typescript
import { RealTimeMonitor } from '@superinstance/equipment-monitoring-dashboard';

const monitor = new RealTimeMonitor(tracker, visualizer, {
  port: 3002,
  heartbeatIntervalMs: 30000,
  maxConnections: 100,
});

await monitor.start();

// Broadcast updates
monitor.broadcastActivity(activity);
monitor.broadcastCellUpdate('cell-1', { value: 42 });
```

### DashboardServer

HTTP/WebSocket server for the dashboard UI.

```typescript
import { DashboardServer } from '@superinstance/equipment-monitoring-dashboard';

const server = new DashboardServer(tracker, visualizer, monitor, {
  port: 3001,
  enableCors: true,
  serveStatic: true,
});

await server.start();

// Get metrics
const metrics = server.getMetrics();

// Playback control
server.controlPlayback('play');
server.controlPlayback('speed', 2.0);
```

## API Endpoints

### HTTP API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/state` | GET | Current dashboard state |
| `/api/metrics` | GET | Dashboard metrics |
| `/api/agents` | GET | List all agents |
| `/api/agents/:id` | GET | Get specific agent |
| `/api/cells` | GET | List all cells |
| `/api/cells/:id` | GET | Get specific cell |
| `/api/cells/:id/provenance` | GET | Get cell provenance |
| `/api/activities` | GET | Get activities (with filters) |
| `/api/playback` | GET | Get playback state |
| `/api/playback/control` | POST | Control playback |
| `/api/playback/history` | GET | Get historical entries |
| `/api/visualize/ascii` | GET | ASCII visualization |
| `/api/visualize/html` | GET | HTML visualization |

### WebSocket Messages

```typescript
// Subscribe to updates
{ type: 'subscription', payload: { agentIds: ['agent-1'], zones: ['GREEN'] } }

// Request state
{ type: 'get_state' }

// Playback control
{ type: 'playback_control', payload: { action: 'play' } }
```

## Confidence Zones

The dashboard uses a three-tier confidence zone system:

| Zone | Range | Color | Status |
|------|-------|-------|--------|
| GREEN | ≥ 0.9 | 🟢 | High confidence |
| YELLOW | 0.6 - 0.9 | 🟡 | Medium confidence |
| RED | < 0.6 | 🔴 | Low confidence |

## Activity Types

The tracker monitors various activity types:

- `thinking` - Agent is processing thoughts
- `processing` - Agent is processing a task
- `waiting` - Agent is waiting for input/resources
- `communicating` - Agent is sending/receiving messages
- `equipping` - Agent is equipping equipment
- `unequipping` - Agent is unequipping equipment
- `error` - Agent encountered an error
- `idle` - Agent is idle
- `learning` - Agent is learning/improving
- `optimizing` - Agent is optimizing itself

## Historical Playback

Review past agent decisions with the playback feature:

```typescript
// Start playback
server.controlPlayback('play');

// Adjust speed
server.controlPlayback('speed', 2.0);

// Jump to specific point
server.controlPlayback('step', 500);

// Pause
server.controlPlayback('pause');

// Stop and reset
server.controlPlayback('stop');

// Get history
const history = server.getHistory(
  Date.now() - 3600000, // From 1 hour ago
  Date.now()            // To now
);
```

## Integration with OriginCore

```typescript
import { OriginCore } from '@superinstance/starter-agent';
import { MonitoringDashboard } from '@superinstance/equipment-monitoring-dashboard';

// Create dashboard
const dashboard = new MonitoringDashboard();
await dashboard.start();

// Create agent
const agent = new OriginCore({
  id: 'main-agent',
  debug: true,
});

// Register and equip
agent.registerEquipment(dashboard);
await agent.equip('MonitoringDashboard');

// Agent activities are now tracked
await agent.processTask({
  id: 'task-1',
  type: 'analysis',
  query: 'Analyze the data',
});

// View in dashboard at http://localhost:3001
```

## Configuration Options

```typescript
interface MonitoringDashboardConfig {
  // Server settings
  port: number;              // Default: 3001
  host: string;              // Default: 'localhost'
  updateIntervalMs: number;  // Default: 100
  
  // Storage settings
  maxActivitiesStored: number;      // Default: 1000
  playbackMaxEntries: number;       // Default: 10000
  
  // Feature flags
  enablePlayback: boolean;   // Default: true
  enableWebSocket: boolean;  // Default: true
  enableHttpServer: boolean; // Default: true
  autoStart: boolean;        // Default: true
}
```

## Dashboard UI

The built-in dashboard provides:

- **Header**: System metrics (agent count, cell count, green zone percentage)
- **Agent List**: All registered agents with status indicators
- **Cell Grid**: Visual grid showing cell states
- **Thinking Panel**: Current agent thought process
- **Activity Feed**: Recent activities timeline

Access the dashboard at `http://localhost:3001` after starting.

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  AgentActivity,
  ActivityType,
  AgentSnapshot,
  ThinkingState,
  CellVisualization,
  DashboardState,
  DashboardMetrics,
  ConfidenceZone,
  // ... and more
} from '@superinstance/equipment-monitoring-dashboard';
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

## Related Packages

- `@superinstance/starter-agent` - Core SuperInstance agent framework
- `@superinstance/equipment-memory` - Memory equipment for agents
- `@superinstance/equipment-reasoning` - Reasoning equipment for agents
