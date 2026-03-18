# CLAW Seed Quick Reference

## Seed Structure

```json
{
  "id": "seed-8f7d2a-periodic",
  "purpose": "Clear description of what seed does",
  "trigger": {
    "type": "periodic|data_driven|event_based|hybrid",
    "config": { /* trigger-specific config */ }
  },
  "learning_strategy": {
    "type": "reinforcement|supervised|unsupervised|few_shot",
    "config": { /* strategy-specific config */ }
  },
  "default_equipment": ["MEMORY", "REASONING"],
  "training_data": {
    "data_source": "data://path/to/data",
    "iterations": 1000,
    "learning_rate": 0.001
  }
}
```

## Trigger Types

| Type | When to Use | Config |
|------|-------------|--------|
| **periodic** | Time-based activation | `interval: "PT5M"` |
| **data_driven** | Threshold-based | `condition: {field, operator, value}` |
| **event_based** | React to events | `event_pattern: "error.*"` |
| **hybrid** | Combine triggers | `triggers: [...], logic: "AND|OR"` |

## Learning Strategies

| Strategy | Best For | Key Config |
|----------|----------|------------|
| **reinforcement** | Optimization | `reward_function, exploration_rate` |
| **supervised** | Classification | `label_source, label_quality` |
| **unsupervised** | Pattern discovery | `pattern_type: clustering` |
| **few_shot** | Rapid learning | `examples: [...]` |

## Equipment Slots

| Slot | Purpose |
|------|---------|
| **MEMORY** | Storage, retrieval |
| **REASONING** | Inference, planning |
| **CONSENSUS** | Coordination, voting |
| **SPREADSHEET** | Data analysis |
| **DISTILLATION** | Model compression |
| **COORDINATION** | Orchestration |

## Training Parameters

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `iterations` | 100 | Training passes |
| `learning_rate` | 0.001 | Optimization step size |
| `batch_size` | 32 | Examples per step |
| `validation_split` | 0.2 | Test fraction |
| `early_stopping.patience` | 10 | Iterations before stop |

## Stabilization

| Score | Status | Action |
|-------|--------|--------|
| **≥0.9** | Stable | Ready for distillation |
| **0.8-0.89** | Mostly Stable | Consider more training |
| **<0.8** | Unstable | Needs more training |

## Common Patterns

```json
// Monitor-Optimize
{
  "trigger": {"type": "periodic", "interval": "PT5M"},
  "learning_strategy": {"type": "reinforcement"},
  "equipment": ["MEMORY", "REASONING"]
}

// Event-Response
{
  "trigger": {"type": "event_based", "event_pattern": "error.*"},
  "learning_strategy": {"type": "few_shot"},
  "equipment": ["COORDINATION"]
}

// Threshold Alert
{
  "trigger": {"type": "data_driven", "condition": {"field": "cpu", "operator": ">", "value": 0.9}},
  "learning_strategy": {"type": "supervised"},
  "equipment": ["SPREADSHEET"]
}
```

## Best Practices

1. **Purpose**: Be specific (20-200 chars)
2. **Trigger**: Match natural behavior
3. **Strategy**: Start with few-shot for prototyping
4. **Equipment**: Start with minimum viable
5. **Training**: Use defaults, then tune
6. **Stability**: Wait for score ≥0.9 before deployment
7. **Distillation**: Compress for production

## Quick Examples

### Memory Optimization
```json
{
  "id": "seed-mem-opt-001",
  "purpose": "Optimize memory retention to minimize latency",
  "trigger": {"type": "periodic", "interval": "PT5M"},
  "learning_strategy": {"type": "reinforcement"},
  "default_equipment": ["MEMORY", "REASONING"]
}
```

### Anomaly Detection
```json
{
  "id": "seed-anomaly-001",
  "purpose": "Detect anomalies in consensus rounds",
  "trigger": {"type": "event_based", "event_pattern": "consensus.*"},
  "learning_strategy": {"type": "supervised"},
  "default_equipment": ["CONSENSUS"]
}
```

### Auto-Scaling
```json
{
  "id": "seed-autoscale-001",
  "purpose": "Scale resources based on workload",
  "trigger": {"type": "data_driven", "condition": {"field": "queue", "operator": ">", "value": 100}},
  "learning_strategy": {"type": "reinforcement"},
  "default_equipment": ["COORDINATION", "SPREADSHEET"]
}
```

## File Locations

- **Schema**: `/claw/schemas/seed-schema.json`
- **Full Docs**: `/claw/docs/SEED_SCHEMA.md`
- **This Guide**: `/claw/docs/SEED_QUICK_REFERENCE.md`
