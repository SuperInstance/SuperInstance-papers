# CLAW Seed Schema Documentation

## Overview

The **Seed** is the fundamental unit of behavior in the CLAW (Cellular Learning Agent Workflow) framework. Seeds represent a new paradigm in cellular programming where agent behaviors are encoded as machine-learnable prompts that evolve through experience.

### Key Innovation: Cellular Programming with Learnable Seeds

Traditional programming uses hard-coded logic. Machine learning uses fixed model architectures. **CLAW Seeds** combine both:

- **Behavior as Seed**: Agent behaviors are defined as natural language prompts ("seeds")
- **Learning through Experience**: Seeds interact with environments and learn optimal behaviors
- **Stabilization**: Learned behaviors are stabilized into reliable, reproducible patterns
- **Distillation**: Stabilized seeds can be distilled into specialized, efficient models

This creates a **cellular programming model** where:
- Each seed is a "cell" with specific behavior
- Seeds are triggered by specific conditions (periodic, data-driven, event-based)
- Seeds learn and adapt to their environment
- Seeds can reproduce (be cloned) and specialize (be distilled)

---

## Seed Anatomy

A seed consists of:

1. **Purpose**: Natural language description of behavior
2. **Trigger**: When the seed activates
3. **Learning Strategy**: How the seed learns
4. **Equipment**: Tools and capabilities the seed uses
5. **Training Data**: Experience the seed learns from
6. **Learned Parameters**: Stabilized behavior after training
7. **Stabilization Metrics**: Performance indicators

### Seed Lifecycle

```
[Created] -> [Training] -> [Stabilized] -> [Distilled] -> [Deployed]
    |           |             |              |             |
    v           v             v              v             v
  Define    Optimize    Validate       Compress      Execute
  Behavior  Parameters  Performance   into Model     in Prod
```

---

## Core Concepts

### 1. Purpose

The **purpose** is a natural language description of what the seed does. It serves as the behavior template that gets optimized during training.

**Example:**
```json
{
  "purpose": "Monitor memory usage patterns and optimize retention schedules to minimize access latency while maintaining semantic coherence"
}
```

**Best Practices:**
- Be specific about what the seed does
- Mention both goals and constraints
- Include trade-offs (e.g., "minimize latency while maintaining accuracy")
- Keep it between 20-200 characters for optimal learning

### 2. Trigger Conditions

Triggers determine when a seed activates. CLAW supports four types:

#### Periodic Triggers
Activate on a time schedule (cron-like).

```json
{
  "trigger": {
    "type": "periodic",
    "interval": "PT5M",     // Every 5 minutes
    "phase": "PT0S",        // Start immediately
    "max_jitter": "PT30S"   // Add up to 30s random delay
  }
}
```

**Use Cases:**
- Regular maintenance tasks
- Periodic health checks
- Scheduled data processing
- Batch optimization

#### Data-Driven Triggers
Activate when data meets certain conditions.

```json
{
  "trigger": {
    "type": "data_driven",
    "condition": {
      "field": "memory.usage",
      "operator": ">",
      "value": 0.85,
      "window": "PT5M",       // Over last 5 minutes
      "aggregation": "avg"    // Average usage
    },
    "check_interval": "PT1M",
    "cooldown": "PT5M"
  }
}
```

**Use Cases:**
- Threshold-based alerting
- Anomaly detection
- Resource scaling
- Performance optimization

#### Event-Based Triggers
Activate in response to specific events.

```json
{
  "trigger": {
    "type": "event_based",
    "event_pattern": "consensus.round_complete",
    "filter": {
      "min_severity": "info"
    }
  }
}
```

**Use Cases:**
- Event-driven workflows
- Reactive behaviors
- Message processing
- State transitions

#### Hybrid Triggers
Combine multiple trigger types with logic (AND/OR/NOT).

```json
{
  "trigger": {
    "type": "hybrid",
    "triggers": [
      {"type": "periodic", "interval": "PT1H"},
      {"type": "event_based", "event_pattern": "emergency.*"}
    ],
    "logic": "OR"  // Activate on schedule OR emergency
  }
}
```

### 3. Learning Strategies

Learning strategies define how seeds learn from experience.

#### Reinforcement Learning
Learn through trial and error with rewards.

```json
{
  "learning_strategy": {
    "type": "reinforcement",
    "config": {
      "reward_function": "memory_access_latency_reward",
      "exploration_rate": 0.1,
      "exploration_decay": 0.995,
      "discount_factor": 0.99
    }
  }
}
```

**Best For:**
- Optimization problems
- Sequential decision making
- Resource allocation
- Control systems

#### Supervised Learning
Learn from labeled examples.

```json
{
  "learning_strategy": {
    "type": "supervised",
    "config": {
      "label_source": "human_feedback",
      "label_quality": "high"
    }
  }
}
```

**Best For:**
- Classification tasks
- Pattern recognition
- Prediction problems
- Quality control

#### Unsupervised Learning
Learn patterns from unlabeled data.

```json
{
  "learning_strategy": {
    "type": "unsupervised",
    "config": {
      "pattern_type": "clustering"
    }
  }
}
```

**Best For:**
- Anomaly detection
- Clustering
- Dimensionality reduction
- Feature discovery

#### Few-Shot Learning
Learn from minimal examples with meta-learning.

```json
{
  "learning_strategy": {
    "type": "few_shot",
    "config": {
      "examples": [
        {
          "input": {"memory_usage": 0.9},
          "output": {"action": "garbage_collect"}
        }
      ],
      "meta_learning_rate": 0.01
    }
  }
}
```

**Best For:**
- Rapid prototyping
- Low-data scenarios
- Transfer learning
- Quick adaptation

### 4. Equipment Slots

Equipment provides specialized capabilities to seeds.

| Equipment | Purpose | Example Use Cases |
|-----------|---------|-------------------|
| **MEMORY** | Semantic storage and retrieval | Caching, state management, knowledge base |
| **REASONING** | Multi-step inference | Planning, optimization, analysis |
| **CONSENSUS** | Distributed coordination | Voting, agreement protocols, fault tolerance |
| **SPREADSHEET** | Data manipulation | Analytics, reporting, transformations |
| **DISTILLATION** | Model compression | Optimization, deployment, edge computing |
| **COORDINATION** | Multi-agent orchestration | Workflow management, task distribution |

```json
{
  "default_equipment": ["MEMORY", "REASONING"]
}
```

### 5. Training Configuration

Defines how seeds learn from data.

```json
{
  "training_data": {
    "data_source": "data://memory/access_logs.parquet",
    "data_format": "parquet",
    "iterations": 1000,
    "learning_rate": 0.001,
    "batch_size": 64,
    "validation_split": 0.2,
    "early_stopping": {
      "enabled": true,
      "patience": 20,
      "min_delta": 0.0001
    },
    "optimization_target": {
      "primary": "speed",
      "secondary": "memory"
    }
  }
}
```

**Key Parameters:**
- `iterations`: Number of training passes
- `learning_rate`: Step size for optimization (lower = slower but more stable)
- `batch_size`: Examples per training step
- `validation_split`: Fraction held out for testing
- `early_stopping`: Prevent overfitting by stopping when no improvement
- `optimization_target`: What to optimize for (accuracy, speed, cost, memory)

### 6. Learned Parameters

After training, seeds contain optimized parameters.

```json
{
  "learned_parameters": {
    "version": 3,
    "parameters": {
      "weights": [0.234, -0.567, 0.891],
      "biases": [0.123, 0.456],
      "thresholds": {
        "critical": 0.85,
        "warning": 0.70
      }
    },
    "checksum": "sha256:a1b2c3d4...",
    "training_timestamp": "2026-03-15T10:00:00Z",
    "performance_estimate": 0.97
  }
}
```

### 7. Stabilization Metrics

Indicate whether a seed has reached stable performance.

```json
{
  "stabilization_metrics": {
    "is_stabilized": true,
    "convergence_iteration": 847,
    "stability_score": 0.94,
    "final_metrics": {
      "accuracy": 0.97,
      "latency_mean_ms": 23.5,
      "memory_mb": 128
    }
  }
}
```

**Stability Score:**
- **1.0**: Perfectly stable
- **0.9-0.99**: Stable, ready for distillation
- **0.8-0.89**: Mostly stable, consider more training
- **<0.8**: Not stable, needs more training

### 8. Distillation Configuration

After stabilization, seeds can be distilled into smaller, faster models.

```json
{
  "distillation_config": {
    "enabled": true,
    "target_size_mb": 10,
    "target_latency_ms": 5,
    "temperature": 2.0,
    "compression_ratio": 0.1,
    "preserve_accuracy": 0.95
  }
}
```

**Distillation Process:**
1. Teacher model: Full seed with all learned parameters
2. Student model: Smaller model that mimics teacher
3. Knowledge transfer: Student learns from teacher's outputs
4. Result: 10x smaller model with 95% of teacher's accuracy

---

## Seed Creation Guide

### Step 1: Define Purpose

Start with a clear, specific purpose.

**Good:**
```json
{
  "purpose": "Detect memory leaks by monitoring allocation patterns and triggering garbage collection when fragmentation exceeds 40%"
}
```

**Bad:**
```json
{
  "purpose": "Do memory stuff"  // Too vague
}
```

### Step 2: Choose Trigger

Select trigger type based on when behavior should activate.

| Trigger Type | Use When... | Example |
|--------------|-------------|---------|
| **Periodic** | Behavior runs on schedule | Health checks every 5 minutes |
| **Data-Driven** | Behavior responds to thresholds | Scale up when CPU > 80% |
| **Event-Based** | Behavior reacts to events | Handle errors when they occur |
| **Hybrid** | Behavior needs complex triggers | Run hourly OR on emergency events |

### Step 3: Select Learning Strategy

Match strategy to problem type.

| Strategy | Best For | Requires |
|----------|----------|----------|
| **Reinforcement** | Optimization, control | Reward function |
| **Supervised** | Classification, prediction | Labeled data |
| **Unsupervised** | Pattern discovery | Unlabeled data |
| **Few-Shot** | Rapid learning | Few examples |

### Step 4: Configure Equipment

Select equipment based on capabilities needed.

```json
{
  "default_equipment": ["MEMORY", "REASONING", "COORDINATION"]
}
```

### Step 5: Set Training Parameters

Start with defaults, then tune.

```json
{
  "training_data": {
    "iterations": 1000,        // Start here
    "learning_rate": 0.001,    // Decrease if unstable
    "batch_size": 64,          // Increase if memory allows
    "validation_split": 0.2    // Standard split
  }
}
```

### Step 6: Train and Validate

Monitor training progress:

```json
{
  "stabilization_metrics": {
    "is_stabilized": false,
    "stability_score": 0.72,  // Need more training
    "performance_history": [
      {"iteration": 100, "accuracy": 0.65},
      {"iteration": 200, "accuracy": 0.78},
      {"iteration": 300, "accuracy": 0.82}
    ]
  }
}
```

Continue training until `stability_score >= 0.9`.

### Step 7: Distill (Optional)

For production deployment, distill to smaller model.

```json
{
  "distillation_config": {
    "enabled": true,
    "compression_ratio": 0.1,  // 10x smaller
    "preserve_accuracy": 0.95  // Keep 95% accuracy
  }
}
```

---

## Example Seeds

### Example 1: Memory Optimization Seed

```json
{
  "id": "seed-mem-opt-001",
  "purpose": "Monitor memory access patterns and optimize retention schedules to minimize latency while maintaining semantic coherence",
  "trigger": {
    "type": "periodic",
    "interval": "PT5M",
    "phase": "PT0S",
    "max_jitter": "PT30S"
  },
  "learning_strategy": {
    "type": "reinforcement",
    "config": {
      "reward_function": "negative_latency_reward",
      "exploration_rate": 0.1,
      "discount_factor": 0.95
    }
  },
  "default_equipment": ["MEMORY", "REASONING"],
  "training_data": {
    "data_source": "data://memory/access_logs.parquet",
    "iterations": 2000,
    "learning_rate": 0.0005,
    "batch_size": 128,
    "optimization_target": {
      "primary": "speed",
      "secondary": "memory"
    }
  },
  "metadata": {
    "version": "1.0.0",
    "tags": ["optimization", "memory"]
  }
}
```

### Example 2: Consensus Anomaly Detection Seed

```json
{
  "id": "seed-consensus-anomaly-001",
  "purpose": "Detect anomalies in consensus rounds and trigger intervention when deviation exceeds 2 standard deviations",
  "trigger": {
    "type": "event_based",
    "event_pattern": "consensus.round_complete"
  },
  "learning_strategy": {
    "type": "supervised",
    "config": {
      "label_source": "human_expert_review",
      "label_quality": "high"
    }
  },
  "default_equipment": ["CONSENSUS", "COORDINATION"],
  "training_data": {
    "data_source": "data://consensus/historical_anomalies.jsonl",
    "iterations": 500,
    "learning_rate": 0.01,
    "optimization_target": {
      "primary": "accuracy",
      "thresholds": {"min_recall": 0.99}
    }
  },
  "metadata": {
    "version": "1.2.0",
    "tags": ["consensus", "fault-tolerance", "security"]
  }
}
```

### Example 3: Auto-Scaling Seed

```json
{
  "id": "seed-autoscale-001",
  "purpose": "Automatically scale computational resources based on workload demand and cost optimization",
  "trigger": {
    "type": "data_driven",
    "condition": {
      "field": "workload.queue_depth",
      "operator": ">",
      "value": 100,
      "window": "PT2M",
      "aggregation": "avg"
    },
    "check_interval": "PT30S",
    "cooldown": "PT5M"
  },
  "learning_strategy": {
    "type": "reinforcement",
    "config": {
      "reward_function": "cost_performance_reward",
      "exploration_rate": 0.05
    }
  },
  "default_equipment": ["SPREADSHEET", "COORDINATION"],
  "training_data": {
    "data_source": "data://scaling/historical_workload.parquet",
    "iterations": 5000,
    "learning_rate": 0.0001,
    "optimization_target": {
      "primary": "cost",
      "secondary": "speed"
    }
  },
  "metadata": {
    "version": "2.0.0",
    "tags": ["scaling", "optimization", "cost"]
  }
}
```

---

## Best Practices

### 1. Purpose Design
- **Be Specific**: Clear purposes train faster
- **Include Trade-offs**: Mention constraints explicitly
- **Use Domain Language**: Match your problem domain terminology
- **Keep it Focused**: One seed, one responsibility

### 2. Trigger Selection
- **Match Natural Behavior**: Align triggers with problem characteristics
- **Avoid Flapping**: Use cooldowns for data-driven triggers
- **Consider Overhead**: Frequent periodic triggers have costs
- **Hybrid is Powerful**: Combine triggers for complex conditions

### 3. Learning Strategy
- **Start Simple**: Few-shot for prototyping, supervised for quality
- **Match Data Availability**: Use unsupervised if you lack labels
- **Reinforcement for Control**: Best for optimization and control problems
- **Tune Learning Rate**: Lower = slower but more stable

### 4. Equipment Selection
- **Minimum Viable**: Start with minimum equipment needed
- **Capability Match**: Select equipment for required capabilities
- **Consider Cost**: More equipment = more resources
- **Test Combinations**: Some equipment work better together

### 5. Training Configuration
- **Start with Defaults**: Use provided defaults as baseline
- **Monitor Validation**: Watch for overfitting
- **Use Early Stopping**: Prevent training too long
- **Target Your Goal**: Optimize for what matters (speed, accuracy, cost)

### 6. Stabilization
- **Wait for Stability**: Don't deploy before `stability_score >= 0.9`
- **Monitor Convergence**: Check if performance plateaued
- **Validate Real-World**: Test on holdout data
- **Version Control**: Track learned parameter versions

### 7. Distillation
- **Distill When Stable**: Only distill stabilized seeds
- **Set Realistic Targets**: Can't maintain 100% accuracy with 100x compression
- **Test After Distillation**: Validate distilled model performance
- **Keep Original**: Save full model for future retraining

---

## Common Patterns

### Pattern 1: Monitor-Optimize Loop

```json
{
  "trigger": {"type": "periodic", "interval": "PT5M"},
  "learning_strategy": {"type": "reinforcement"},
  "default_equipment": ["MEMORY", "REASONING"]
}
```

**Use For:** Continuous optimization problems

### Pattern 2: Event-Response

```json
{
  "trigger": {"type": "event_based", "event_pattern": "error.*"},
  "learning_strategy": {"type": "few_shot"},
  "default_equipment": ["COORDINATION"]
}
```

**Use For:** Reactive error handling and recovery

### Pattern 3: Threshold Alerting

```json
{
  "trigger": {
    "type": "data_driven",
    "condition": {"field": "cpu", "operator": ">", "value": 0.9}
  },
  "learning_strategy": {"type": "supervised"},
  "default_equipment": ["SPREADSHEET"]
}
```

**Use For:** Monitoring and alerting systems

### Pattern 4: Adaptive Control

```json
{
  "trigger": {"type": "hybrid", "logic": "OR"},
  "learning_strategy": {"type": "reinforcement"},
  "default_equipment": ["MEMORY", "REASONING", "COORDINATION"]
}
```

**Use For:** Complex control systems with multiple inputs

---

## Validation Rules

The seed schema enforces these validation rules:

1. **Purpose**: Must be non-empty string with minimum 20 characters
2. **Trigger**: At least one trigger condition required
3. **Learning Strategy**: Must be compatible with trigger type
4. **Equipment**: At least one equipment slot required
5. **Training**: Valid data source and format required
6. **IDs**: Must follow pattern `seed-{hash}-{type}`
7. **Timestamps**: Must be ISO 8601 format
8. **Numerical Constraints**: Learning rates, rates, scores in valid ranges

---

## FAQ

### Q: How long does seed training take?
**A:** Depends on iterations and data size. Typical seeds train in 5-30 minutes on modern hardware.

### Q: Can I update a seed after deployment?
**A:** Yes. Retrain with new data, increment version, and redeploy. System handles graceful migration.

### Q: What if a seed never stabilizes?
**A:** Try:
- Increasing training iterations
- Adjusting learning rate (usually lower)
- Adding more training data
- Simplifying the purpose
- Trying different learning strategy

### Q: Can seeds share learned parameters?
**A:** Yes! Seeds can clone parameters from similar seeds for transfer learning.

### Q: How do I debug a failing seed?
**A:** Check:
1. Trigger logs (is it activating?)
2. Training metrics (is it learning?)
3. Stabilization score (is it stable?)
4. Equipment availability (are tools available?)

### Q: What's the maximum seed size?
**A:** No hard limit, but seeds >100MB may impact performance. Consider distillation for large seeds.

---

## References

- **CLAW Architecture**: See `/claw/docs/ARCHITECTURE.md`
- **Equipment System**: See `/claw/docs/EQUIPMENT.md`
- **Training Guide**: See `/claw/docs/TRAINING.md`
- **API Reference**: See `/claw/docs/API_REFERENCE.md`

---

**Version**: 1.0.0
**Last Updated**: 2026-03-15
**Schema**: `/claw/schemas/seed-schema.json`
