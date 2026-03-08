# Multi-Colony Orchestration Demo

This example demonstrates how to use POLLN's multi-colony orchestration capabilities to manage multiple colonies working together.

## Features Demonstrated

- **Colony Manager**: Orchestrate multiple colonies
- **Load Balancing**: Distribute work across colonies
- **Health Monitoring**: Track colony health
- **Auto-Scaling**: Automatically scale colonies based on load
- **Inter-Colony Communication**: Message passing between colonies
- **Dashboard**: Real-time monitoring dashboard

## Setup

```bash
npm install
npm run build
```

## Running the Demo

```bash
node demo.js
```

## What the Demo Does

1. **Initialize Orchestrator**: Creates a colony orchestrator with resource budgets
2. **Provision Colonies**: Sets up multiple specialized colonies
3. **Schedule Work**: Distributes workloads across colonies
4. **Monitor Health**: Tracks health status of all colonies
5. **Auto-Scaling**: Demonstrates automatic scaling based on load
6. **Dashboard**: Shows real-time metrics and visualization

## CLI Commands

You can also use the CLI to manage colonies:

```bash
# List all colonies
npm run colony:list

# Create a new colony
npm run colony:create

# Show colony status
npm run colony:status

# Scale a colony
npm run colony:scale <colonyId> --up

# Migrate agents
npm run colony:migrate --source <sourceId> --target <targetId>
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Colony Orchestrator                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │ Scheduler   │ │Load Balancer│ │  Resource Tracker   │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
│  ┌─────────────┐ ┌─────────────────────────────────────┐  │
│  │Health Monitor│ │          Dashboard                 │  │
│  └─────────────┘ └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐    ┌───────▼───────┐    ┌───────▼───────┐
│  Colony 1     │    │  Colony 2     │    │  Colony 3     │
│  (Compute)    │    │  (Memory)     │    │  (General)    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Inter-Colony Comm │
                    │  (Bridge/Queue)  │
                    └───────────────────┘
```

## Key Concepts

### Colony Orchestration

The orchestrator manages multiple colonies, handling:
- Provisioning new colonies
- Load balancing work
- Health monitoring
- Resource tracking
- Auto-scaling

### Load Balancing

Multiple strategies are available:
- **Round Robin**: Distribute evenly
- **Least Loaded**: Send to least busy colony
- **Weighted**: Based on available resources
- **Consistent Hash**: Same workload to same colony
- **Adaptive**: Learn from performance

### Health Monitoring

Continuous health checks track:
- Colony state
- Resource utilization
- Agent activity
- Error rates
- Performance metrics

### Auto-Scaling

Automatically scale colonies:
- **Horizontal**: Add/remove colonies
- **Vertical**: Resize colony resources
- **Triggers**: CPU, memory, network thresholds
- **Cooldown**: Prevent rapid scaling

## Monitoring

The dashboard provides:
- Real-time metrics
- Health status
- Resource utilization
- Alert notifications
- Historical trends

## Extending the Demo

You can extend this demo to:
- Add custom colony specializations
- Implement custom load balancing strategies
- Create custom health checks
- Add inter-colony communication patterns
- Integrate with external monitoring systems

## Next Steps

- Explore the `colony-manager` module for advanced features
- Check out `inter-colony` for communication patterns
- See `colony-lifecycle` for provisioning and scaling
- Build custom dashboards with `dashboard` module
