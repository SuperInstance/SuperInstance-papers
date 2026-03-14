# @superinstance/equipment-hardware-scaler

> Equipment auto-scaling across hardware resources with cloud API overflow support

A powerful npm package that intelligently scales your compute tasks between local hardware and cloud APIs based on real-time resource availability and cost optimization.

## Features

- 🖥️ **Real-time Hardware Monitoring** - Monitors CPU, memory, and GPU availability
- ☁️ **Cloud Overflow** - Automatically routes tasks to cloud when local resources exhausted
- 💰 **Cost-Aware Routing** - Local-first processing saves money, cloud for overflow
- 📉 **Graceful Scale-Down** - Returns to local processing when load decreases
- 🔌 **Multiple Cloud Providers** - Supports OpenAI, Anthropic, and local execution
- 📊 **Cost Tracking** - Tracks cost savings from local-first processing

## Installation

```bash
npm install @superinstance/equipment-hardware-scaler
```

## Quick Start

```typescript
import { HardwareScaler } from '@superinstance/equipment-hardware-scaler';

// Initialize the scaler
const scaler = new HardwareScaler({
  cpuThreshold: 80,      // Overflow to cloud when CPU > 80%
  memoryThreshold: 85,   // Overflow when memory > 85%
  gpuThreshold: 90,      // Overflow when GPU > 90%
  costCeiling: 100,      // Max $100 cloud spend
  preferredCloudProvider: 'openai'
});

// Start monitoring
await scaler.start();

// Process tasks
const result = await scaler.processTask({
  id: 'task-1',
  type: 'compute',
  payload: { data: 'your-data-here' },
  estimatedResources: {
    cpu: 2,
    memory: 500,
    tokens: 1000
  }
});

console.log(result);
// {
//   taskId: 'task-1',
//   success: true,
//   cost: 0,           // $0 because processed locally
//   provider: 'local',
//   processingTime: 120
// }

// Get statistics
const stats = scaler.getStats();
console.log(stats);

// Stop when done
await scaler.stop();
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HardwareScaler                        │
│  ┌─────────────────────────────────────────────────────┐│
│  │              AdaptiveScheduler                       ││
│  │   ┌─────────────┐        ┌──────────────────────┐  ││
│  │   │   Local     │◄──────►│   ResourceMonitor    │  ││
│  │   │  Processing │        │  (CPU/Mem/GPU)       │  ││
│  │   └──────┬──────┘        └──────────────────────┘  ││
│  │          │                                          ││
│  │          │ (overflow)                               ││
│  │          ▼                                          ││
│  │   ┌─────────────────────────────────────────────┐  ││
│  │   │              CloudBridge                     │  ││
│  │   │  ┌────────┐ ┌───────────┐ ┌───────────┐    │  ││
│  │   │  │ OpenAI │ │ Anthropic │ │   Local   │    │  ││
│  │   │  └────────┘ └───────────┘ └───────────┘    │  ││
│  │   └─────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Components

### HardwareScaler

The main entry point that orchestrates all components.

```typescript
const scaler = new HardwareScaler({
  enableLocalProcessing: true,
  enableCloudOverflow: true,
  cpuThreshold: 80,
  memoryThreshold: 85,
  gpuThreshold: 90,
  costCeiling: 100,
  monitoringInterval: 5000,
  cloudConfigs: {
    openai: {
      apiKey: 'sk-...',
      model: 'gpt-4'
    },
    anthropic: {
      apiKey: 'sk-ant-...',
      model: 'claude-3'
    }
  }
});
```

### ResourceMonitor

Monitors hardware resources in real-time.

```typescript
import { ResourceMonitor } from '@superinstance/equipment-hardware-scaler';

const monitor = new ResourceMonitor({ interval: 1000 });

monitor.onMetrics((metrics) => {
  console.log('CPU:', metrics.cpu.percentage + '%');
  console.log('Memory:', metrics.memory.percentage + '%');
  console.log('GPU:', metrics.gpu.available ? metrics.gpu.percentage + '%' : 'N/A');
});

await monitor.start();
```

### CloudBridge

Manages cloud provider connections and routing.

```typescript
import { CloudBridge } from '@superinstance/equipment-hardware-scaler';

const bridge = new CloudBridge({
  openai: { apiKey: 'sk-...' },
  anthropic: { apiKey: 'sk-ant-...' }
}, 'openai');

const result = await bridge.execute({
  id: 'task-1',
  type: 'chat',
  payload: { messages: [...] }
}, 'openai');
```

### AdaptiveScheduler

Makes intelligent scheduling decisions.

```typescript
import { AdaptiveScheduler } from '@superinstance/equipment-hardware-scaler';

const scheduler = new AdaptiveScheduler({
  cpuThreshold: 80,
  memoryThreshold: 85,
  gpuThreshold: 90,
  costCeiling: 100,
  preferLocal: true
});

const decision = scheduler.schedule(task, metrics, context);
// {
//   taskId: 'task-1',
//   location: 'local',
//   reason: 'CPU within limits; Memory within limits; Local processing is free',
//   estimatedCost: 0,
//   estimatedTime: 120,
//   confidence: 0.85
// }
```

## API Reference

### HardwareScalerConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableLocalProcessing` | `boolean` | `true` | Enable local processing |
| `enableCloudOverflow` | `boolean` | `true` | Enable cloud overflow |
| `cpuThreshold` | `number` | `80` | CPU % threshold for overflow |
| `memoryThreshold` | `number` | `85` | Memory % threshold for overflow |
| `gpuThreshold` | `number` | `90` | GPU % threshold for overflow |
| `costCeiling` | `number` | `100` | Maximum cloud spend in USD |
| `monitoringInterval` | `number` | `5000` | Resource check interval (ms) |
| `aggressiveScaling` | `boolean` | `false` | Enable aggressive scaling |
| `cloudConfigs` | `object` | `{}` | Cloud provider configurations |
| `preferredCloudProvider` | `string` | `'openai'` | Default cloud provider |

### Task Interface

```typescript
interface Task {
  id: string;
  type: string;
  payload: unknown;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  estimatedResources?: {
    cpu?: number;      // CPU cores needed
    memory?: number;   // Memory in MB
    gpu?: number;      // GPU memory in MB
    tokens?: number;   // Estimated tokens
    duration?: number; // Estimated time in ms
  };
  deadline?: number;   // Unix timestamp
  maxCost?: number;    // Maximum cost in USD
  preferredLocation?: 'local' | 'cloud';
}
```

### ScalerStats

```typescript
interface ScalerStats {
  totalTasksProcessed: number;
  localTasksProcessed: number;
  cloudTasksProcessed: number;
  totalCostIncurred: number;
  estimatedSavings: number;
  averageProcessingTime: number;
  currentUtilization: ResourceMetrics;
  scaleUpEvents: number;
  scaleDownEvents: number;
  uptimeSeconds: number;
}
```

## Events

Listen to scale events:

```typescript
scaler.onScaleEvent((event, data) => {
  console.log(`Event: ${event}`);
  console.log('Metrics:', data.metrics);
  console.log('Decision:', data.decision);
});
```

Event types:
- `scale_up` - Scaling to cloud
- `scale_down` - Scaling back to local
- `overflow` - Task routed to cloud
- `cost_warning` - Approaching cost ceiling

## Cost Optimization

The scaler is designed to maximize local processing:

```typescript
const costSummary = scaler.getCostSummary();
// {
//   totalSpent: 2.45,
//   totalSaved: 15.80,
//   cloudPercentage: 12.5,
//   localPercentage: 87.5
// }
```

## Development

```bash
# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

MIT © SuperInstance Team
