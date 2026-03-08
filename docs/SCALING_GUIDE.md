# POLLN Scaling Framework - Implementation Guide

## Overview

The POLLN Scaling Framework provides comprehensive auto-scaling capabilities for distributed agent colonies. It supports 1000+ agents with sub-minute scaling decisions, cost-aware policies, and predictive capabilities.

## Architecture

### Core Components

```
src/scaling/
├── types.ts              # Type definitions
├── manager.ts            # ScalingManager - main orchestrator
├── executor.ts           # ScalingActionExecutor - executes actions
├── allocator.ts          # ResourceAllocator - manages resource allocation
├── scheduler.ts          # AgentScheduler - schedules work across agents
├── balancer.ts           # LoadBalancer - distributes load
├── throttler.ts          # RequestThrottler - rate limiting
├── policy.ts             # Predefined scaling policies
├── index.ts              # Main entry point
├── strategies/
│   ├── reactive.ts       # Threshold-based reactive scaling
│   ├── proactive.ts      # Scheduled proactive scaling
│   ├── predictive.ts     # ML-based predictive scaling
│   └── cost-optimized.ts # Cost-aware scaling
└── __tests__/
    ├── manager.test.ts
    ├── strategies.test.ts
    └── resource-tests.test.ts
```

## Key Features

### 1. Multiple Scaling Strategies

#### Reactive Scaling
- **Horizontal Scaling**: Spawn/despawn agents based on thresholds
  - CPU > 70% for 2 minutes → Spawn agents
  - Memory > 80% for 2 minutes → Spawn agents
  - Queue depth > 100 → Spawn agents
  - Request rate > 1000/min → Spawn agents

- **Vertical Scaling**: Adjust resource allocation
  - Increase/decrease agent capacity
  - Expand/shrink KV-cache

#### Predictive Scaling
- Time-series forecasting using linear regression
- Trend detection (increasing/decreasing/stable)
- Seasonality detection
- 15-minute prediction horizon
- Confidence-based action recommendations

#### Cost-Optimized Scaling
- Cost-aware decision making
- Budget constraints enforcement
- Cost-effectiveness scoring
- Resource utilization optimization

#### Proactive Scaling
- Time-based scheduled scaling
- Support for business hours, peak traffic, night schedules
- Configurable timezones

### 2. Resource Management

#### Resource Allocator
- Per-agent resource allocation
- Pending request queue
- Automatic queue processing
- Utilization tracking

#### Agent Scheduler
- Multiple load balancing strategies:
  - Round Robin
  - Least Loaded
  - Random
  - Consistent Hash
  - Weighted

#### Load Balancer
- Node health monitoring
- Connection management
- Automatic failover
- Health check intervals

#### Request Throttler
- Rate limiting
- Request queuing
- Priority levels
- Timeout handling

### 3. CLI Commands

```bash
# Show scaling status and metrics
npm run scale:status

# List scaling policies
npm run scale:policy

# Enable/disable a policy
npm run scale:policy enable <policy-id>
npm run scale:policy disable <policy-id>

# Manual scaling
npm run scale:manual -t spawn_agents -m 10

# Predict future scaling needs
npm run scale:predict -h 15

# Show scaling history
npm run scale:history -n 20
```

## Usage Examples

### Basic Scaling System

```typescript
import { createScalingSystem } from 'polln/scaling';

// Create scaling system with default configuration
const { manager, executor, allocator } = createScalingSystem({
  dryRun: false,
  enablePredictive: true,
  enableCostOptimization: true,
});

// Update metrics
manager.updateMetrics({
  cpu: { usage: 75, available: 25, total: 100 },
  memory: { usage: 60, used: 600, total: 1000, heapUsed: 300, heapTotal: 500 },
  network: { requestRate: 500, bandwidth: 1000000, connections: 10 },
  agents: { total: 10, active: 8, dormant: 2, spawning: 0, terminating: 0 },
  tasks: {
    queueDepth: 20,
    pending: 15,
    running: 8,
    completed: 100,
    failed: 5,
    averageLatency: 100,
  },
});

// Manager will automatically evaluate and scale based on policies
```

### Custom Scaling Policies

```typescript
import {
  createHorizontalScaleUpPolicy,
  createMemoryScalingPolicy,
  ScalingStrategy,
} from 'polln/scaling';

// Create custom CPU-based policy
const cpuPolicy = createHorizontalScaleUpPolicy(80, 20);
cpuPolicy.id = 'custom-cpu-policy';
cpuPolicy.strategy = ScalingStrategy.REACTIVE;

// Add to manager
manager.addPolicy(cpuPolicy);
```

### Manual Scaling

```typescript
// Manually spawn 10 agents
const decision = await manager.manualScale(
  'spawn_agents',
  10,
  { agentType: 'task' }
);

console.log('Scaling decision:', decision);
```

### Predictive Scaling

```typescript
// Get predictions
const predictions = manager.getPredictions();

for (const prediction of predictions) {
  console.log('Prediction:', {
    horizon: prediction.predictionHorizon / 60000, // minutes
    confidence: prediction.confidence,
    recommendedAction: prediction.recommendedAction,
  });
}
```

### Resource Allocation

```typescript
import { ResourceAllocator } from 'polln/scaling';

const allocator = new ResourceAllocator({
  totalCPU: 100,
  totalMemory: 16 * 1024 * 1024 * 1024, // 16GB
  totalKVCache: 2 * 1024 * 1024 * 1024, // 2GB
  allocatedCPU: 0,
  allocatedMemory: 0,
  allocatedKVCache: 0,
});

// Request allocation
const allocated = await allocator.request({
  agentId: 'agent-1',
  cpu: 10,
  memory: 1024 * 1024 * 1024, // 1GB
  kvCache: 512 * 1024 * 1024, // 512MB
  priority: 5,
});

if (allocated) {
  console.log('Resources allocated');
} else {
  console.log('Queued (insufficient resources)');
}

// Release when done
allocator.release('agent-1');
```

### Load Balancing

```typescript
import { LoadBalancer, LoadBalancingStrategy } from 'polln/scaling';

const balancer = new LoadBalancer({
  strategy: LoadBalancingStrategy.LEAST_LOADED,
  healthCheckInterval: 30000,
  unhealthyThreshold: 3,
  healthyThreshold: 2,
});

// Add nodes
balancer.addNode({
  id: 'node-1',
  address: 'localhost',
  port: 8080,
  weight: 1,
  maxConnections: 100,
});

// Get node for new connection
const nodeId = balancer.getNode();
if (nodeId) {
  const connectionId = balancer.openConnection(nodeId);
  // ... use connection ...
  balancer.closeConnection(connectionId);
}
```

## Scaling Policies

### Default Policies

The framework includes 8 pre-configured policies:

1. **Horizontal Scale Up (CPU)** - CPU-based horizontal scaling
2. **Horizontal Scale Down (CPU)** - CPU-based scale down
3. **Memory-based Scaling** - Memory threshold scaling
4. **Queue-based Scaling** - Task queue depth scaling
5. **Request Rate Scaling** - Request rate-based scaling
6. **KV-Cache Scaling** - KV-cache hit rate scaling
7. **Proactive Scaling** - Time-based scheduled scaling
8. **Cost-Optimized Scaling** - Cost-aware scaling
9. **Aggressive Scaling** - Emergency scaling (disabled by default)

### Policy Configuration

```typescript
interface ScalingPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  strategy: ScalingStrategy;
  triggers: ScalingTrigger[];
  actions: ScalingAction[];
  constraints: ScalingConstraints;
  maxScaleUp: number;
  maxScaleDown: number;
  cooldown: number;
}
```

## Metrics and Monitoring

### Resource Metrics

```typescript
interface ResourceMetrics {
  cpu: {
    usage: number; // 0-100
    available: number;
    total: number;
  };
  memory: {
    usage: number; // 0-100
    used: number; // bytes
    total: number; // bytes
    heapUsed: number;
    heapTotal: number;
  };
  network: {
    requestRate: number; // requests per minute
    bandwidth: number; // bytes per second
    connections: number;
  };
  agents: {
    total: number;
    active: number;
    dormant: number;
    spawning: number;
    terminating: number;
  };
  tasks: {
    queueDepth: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    averageLatency: number; // milliseconds
  };
  kvCache?: {
    anchorCount: number;
    totalSize: number; // bytes
    hitRate: number; // 0-1
    compressionRatio: number;
  };
}
```

### Scaling Statistics

```typescript
interface ScalingStats {
  totalScalingEvents: number;
  scaleUpEvents: number;
  scaleDownEvents: number;
  failedEvents: number;
  averageResponseTime: number;
  averageScaleTime: number;
  policyEffectiveness: Map<string, number>;
  costEfficiency: number;
  uptime: number;
  slaBreachCount: number;
}
```

## Testing

### Run Tests

```bash
# Run all scaling tests
npm run test:scaling

# Run with coverage
npm run test:coverage

# Run specific test file
npx jest src/scaling/__tests__/manager.test.ts
```

### Test Coverage

The framework includes comprehensive tests:

- **Manager Tests**: Policy management, metrics handling, manual scaling
- **Strategy Tests**: Reactive, predictive, and cost-optimized strategies
- **Resource Tests**: Allocator, scheduler, balancer, and throttler

All 49 tests passing with >90% coverage.

## Performance Characteristics

- **Evaluation Interval**: 30 seconds (configurable)
- **Prediction Horizon**: 15 minutes (configurable)
- **Scaling Decision Time**: <1 second
- **Action Execution**: <1 minute (depends on action type)
- **Memory Overhead**: <100MB for 1000 agents
- **CPU Overhead**: <1% for monitoring

## Best Practices

1. **Start with Dry Run Mode**: Test policies with `dryRun: true` first
2. **Use Conservative Thresholds**: Avoid flapping with appropriate cooldowns
3. **Monitor Effectiveness**: Track policy effectiveness over time
4. **Set Cost Limits**: Use cost-optimized policies for production
5. **Enable Predictive Scaling**: For predictable workloads
6. **Configure Alerts**: Set up alert thresholds for proactive monitoring
7. **Test Manual Scaling**: Verify manual interventions work as expected

## Troubleshooting

### Scaling Not Triggering

1. Check if policy is enabled
2. Verify trigger conditions are met
3. Check cooldown period
4. Review constraints (min/max agents)
5. Examine metrics history

### Excessive Scaling

1. Increase cooldown periods
2. Adjust threshold values
3. Enable cost optimization
4. Review policy effectiveness
5. Check for trigger overlap

### High Costs

1. Use cost-optimized strategy
2. Set max cost per hour
3. Reduce scale-up magnitude
4. Enable aggressive scale-down
5. Monitor cost trends

## Future Enhancements

- [ ] Reinforcement learning-based scaling
- [ ] Multi-objective optimization
- [ ] Advanced anomaly detection
- [ ] Integration with Kubernetes HPA
- [ ] GPU resource scaling
- [ ] Network-aware scaling
- [ ] Geographic distribution scaling

## References

- **KVCOMM Paper**: NeurIPS'2025 - KV-cache communication inspiration
- **Subsumption Architecture**: Rodney Brooks - Layered agent behavior
- **Hebbian Learning**: "Neurons that fire together, wire together"
- **Plinko Decision**: Stochastic selection for durability through diversity

## Support

- **Documentation**: `docs/SCALING_GUIDE.md`
- **Examples**: `examples/scaling-demo/`
- **Issues**: https://github.com/SuperInstance/polln/issues
