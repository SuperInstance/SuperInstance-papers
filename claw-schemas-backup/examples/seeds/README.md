# CLAW Seed Examples

This directory contains example seed configurations demonstrating various patterns and use cases for the CLAW framework.

## Example Seeds

### 1. Memory Optimizer Seed
**File**: `memory-optimizer-seed.json`

A periodic seed that optimizes memory retention schedules to minimize access latency while maintaining semantic coherence.

**Key Features:**
- **Trigger**: Periodic (every 5 minutes)
- **Learning Strategy**: Reinforcement learning
- **Equipment**: MEMORY, REASONING
- **Use Case**: Continuous memory optimization
- **Status**: Stabilized (score: 0.94), ready for distillation

**When to Use:**
- Systems with high memory churn
- Latency-sensitive applications
- Semantic memory systems

### 2. Consensus Anomaly Detector Seed
**File**: `consensus-anomaly-detector-seed.json`

An event-driven seed that detects anomalies in consensus rounds and triggers intervention protocols.

**Key Features:**
- **Trigger**: Event-based (consensus.round_complete)
- **Learning Strategy**: Supervised learning
- **Equipment**: CONSENSUS, COORDINATION
- **Use Case**: Fault detection and intervention
- **Status**: Stabilized (score: 0.96), production-ready

**When to Use:**
- Distributed consensus systems
- Fault-tolerant applications
- Security monitoring

### 3. Autoscaler Seed
**File**: `autoscaler-seed.json`

A hybrid seed that scales computational resources based on workload demand while minimizing cost.

**Key Features:**
- **Trigger**: Hybrid (data-driven OR event-based)
- **Learning Strategy**: Reinforcement learning
- **Equipment**: SPREADSHEET, COORDINATION
- **Use Case**: Dynamic resource scaling
- **Status**: Stabilized (score: 0.93), not distilled (complex logic)

**When to Use:**
- Cloud infrastructure
- Auto-scaling systems
- Cost optimization

## How to Use These Examples

### 1. Learn from Examples
Study the example seeds to understand:
- How to structure seed purposes
- Which trigger types to use for different scenarios
- How to configure learning strategies
- What equipment combinations work well
- How to interpret stabilization metrics

### 2. Adapt to Your Use Case
Modify examples for your needs:
```bash
cp memory-optimizer-seed.json my-seed.json
# Edit my-seed.json with your specific purpose, trigger, etc.
```

### 3. Validate Your Seed
Use the schema to validate:
```bash
claw validate-seed my-seed.json
```

### 4. Train Your Seed
Train with your data:
```bash
claw train-seed my-seed.json --data my-training-data.parquet
```

### 5. Monitor Stabilization
Watch training progress:
```bash
claw monitor-seed my-seed.json
```

### 6. Deploy When Ready
Deploy once stabilized:
```bash
claw deploy-seed my-seed.json
```

## Seed Patterns Reference

### Monitor-Optimize Pattern
**Example**: Memory Optimizer
- **Trigger**: Periodic
- **Strategy**: Reinforcement
- **Equipment**: MEMORY, REASONING
- **Best For**: Continuous optimization

### Event-Response Pattern
**Example**: Consensus Anomaly Detector
- **Trigger**: Event-based
- **Strategy**: Supervised
- **Equipment**: CONSENSUS, COORDINATION
- **Best For**: Reactive behaviors

### Adaptive Control Pattern
**Example**: Autoscaler
- **Trigger**: Hybrid
- **Strategy**: Reinforcement
- **Equipment**: SPREADSHEET, COORDINATION
- **Best For**: Complex control systems

## Common Modifications

### Change Trigger Type
Replace trigger section with desired type:
```json
"trigger": {
  "type": "periodic",
  "interval": "PT10M"  // Change interval as needed
}
```

### Adjust Learning Rate
Tune for your problem:
```json
"learning_rate": 0.0001  // Lower for complex problems
```

### Add Equipment
Include more capabilities:
```json
"default_equipment": ["MEMORY", "REASONING", "COORDINATION"]
```

### Modify Optimization Target
Optimize for different goals:
```json
"optimization_target": {
  "primary": "cost",  // Change to "speed", "accuracy", or "memory"
  "secondary": "speed"
}
```

## Tips for Creating Seeds

1. **Start Simple**: Begin with few-shot learning for rapid prototyping
2. **Iterate**: Refine purpose and parameters based on results
3. **Monitor**: Watch stabilization score during training
4. **Validate**: Always test on holdout data
5. **Version**: Track seed versions as you iterate

## Troubleshooting

### Seed Never Stabilizes
- Increase training iterations
- Decrease learning rate
- Add more training data
- Simplify purpose
- Try different learning strategy

### Poor Performance
- Check training data quality
- Verify equipment availability
- Adjust optimization targets
- Review trigger conditions
- Ensure sufficient training examples

### High Latency
- Reduce equipment complexity
- Enable distillation
- Optimize batch size
- Consider edge deployment

## Next Steps

- Read the full [SEED_SCHEMA.md](../../docs/SEED_SCHEMA.md) documentation
- Check the [Quick Reference](../../docs/SEED_QUICK_REFERENCE.md)
- Review the [JSON Schema](../../schemas/seed-schema.json)
- Explore other CLAW framework documentation

## Contributing

Have a great seed example? We welcome contributions!
1. Follow the seed schema
2. Include realistic parameters
3. Add documentation explaining the use case
4. Submit a PR

---

**Last Updated**: 2026-03-15
**Framework Version**: 1.0.0
