# Claw Core Schema Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Claw Structure](#claw-structure)
4. [Model Configuration](#model-configuration)
5. [State Machine](#state-machine)
6. [Equipment System](#equipment-system)
7. [Trigger Mechanisms](#trigger-mechanisms)
8. [Social Relationships](#social-relationships)
9. [Memory Architecture](#memory-architecture)
10. [Error Handling](#error-handling)
11. [Examples](#examples)
12. [Best Practices](#best-practices)
13. [Validation Rules](#validation-rules)

---

## Introduction

The **Claw Schema** defines the fundamental structure of a Claw - a minimal cellular agent with ML model capabilities. Claws are autonomous AI agents that form the building blocks of distributed cellular programming systems.

### What is a Claw?

A Claw is a **self-contained AI agent** that:

- **Thinks** using an LLM or ML model
- **Acts** through equipped modules (equipment)
- **Collaborates** through social relationships
- **Evolves** through learning and adaptation
- **Scales** by spawning child agents

### Key Innovation

> "Claws represent a new paradigm: cellular programming where simple agents self-organize into complex adaptive systems. Each claw is minimal yet powerful, capable of independent reasoning while seamlessly collaborating with others."

---

## Core Concepts

### 1. Minimal Viable Agent

A Claw contains only what's needed:

```
┌─────────────────────────────────────┐
│           CLAW AGENT                │
│  ┌─────────┐    ┌──────────────┐   │
│  │  Model  │    │   Equipment  │   │
│  │  (Brain)│    │  (Tools)     │   │
│  └─────────┘    └──────────────┘   │
│         │              │            │
│         └──────┬───────┘            │
│                │                    │
│         ┌──────▼──────┐            │
│         │   Trigger   │            │
│         │  (When to   │            │
│         │   activate) │            │
│         └─────────────┘            │
└─────────────────────────────────────┘
```

### 2. Social Intelligence

Claws form relationships:

- **Master-Slave**: Parallel work distribution
- **Co-Worker**: Peer collaboration and consensus
- **Peer**: Loose coordination and communication

### 3. Cellular Growth

Claws can spawn other claws:

```
Parent Claw
    │
    ├──► Slave Claw 1 (work unit)
    ├──► Slave Claw 2 (work unit)
    └──► Slave Claw 3 (work unit)
```

---

## Claw Structure

### Required Fields

Every Claw must have:

```json
{
  "id": "uuid-v4-string",
  "model": { /* model configuration */ },
  "seed": { /* behavior definition */ },
  "state": "DORMANT|THINKING|PROCESSING|ERROR",
  "equipment": [ /* equipped modules */ ],
  "config": { /* runtime settings */ }
}
```

### Optional Fields

```json
{
  "name": "Human-readable name",
  "relationships": { /* social connections */ },
  "triggers": { /* activation conditions */ },
  "memory": { /* memory configuration */ },
  "metrics": { /* performance metrics */ },
  "error_handling": { /* error recovery */ },
  "metadata": { /* additional info */ }
}
```

---

## Model Configuration

The `model` field defines the AI that powers the Claw's intelligence.

### Model Providers

Supported providers:

| Provider | Description | Best For |
|----------|-------------|----------|
| `deepseek` | DeepSeek API | Cost-effective, high performance |
| `openai` | OpenAI GPT models | General purpose |
| `anthropic` | Claude models | Complex reasoning |
| `cloudflare` | Cloudflare Workers AI | Edge deployment |
| `deepinfra` | Open source models | Custom model selection |
| `ollama` | Local models | Privacy, zero cost |
| `together` | Together AI | Specialized models |
| `azure` | Azure OpenAI | Enterprise integration |
| `google` | Google AI/Vertex | Google ecosystem |
| `huggingface` | HF Inference API | Research models |
| `custom` | Custom endpoint | Specialized deployment |

### Model Configuration Example

```json
{
  "provider": "deepseek",
  "model_name": "deepseek-chat",
  "endpoint": "https://api.deepseek.com/v1",
  "api_key": "sk-...",
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 2048,
    "top_p": 0.9,
    "top_k": 40,
    "frequency_penalty": 0,
    "presence_penalty": 0
  },
  "capabilities": ["chat", "function_calling", "json_mode"],
  "rate_limits": {
    "requests_per_minute": 60,
    "tokens_per_minute": 150000,
    "concurrent_requests": 3
  },
  "fallback_models": [
    {
      "provider": "openai",
      "model_name": "gpt-4"
    }
  ]
}
```

### Model Parameters

| Parameter | Range | Default | Purpose |
|-----------|-------|---------|---------|
| `temperature` | 0.0 - 2.0 | 0.7 | Response randomness |
| `max_tokens` | 1 - ∞ | 2048 | Max response length |
| `top_p` | 0.0 - 1.0 | 0.9 | Nucleus sampling |
| `top_k` | 1 - ∞ | 40 | Top-k sampling |
| `frequency_penalty` | -2.0 - 2.0 | 0 | Reduce repetition |
| `presence_penalty` | -2.0 - 2.0 | 0 | Encourage new topics |

---

## State Machine

Claws operate through a well-defined state machine:

```
┌──────────────┐
│   DORMANT    │ ◄───────┐
│   (Waiting)  │         │
└──────┬───────┘         │
       │ Trigger         │
       ▼                 │
┌──────────────┐         │
│   THINKING   │         │
│  (Reasoning) │         │
└──────┬───────┘         │
       │ Plan            │
       ▼                 │
┌──────────────┐    ┌────┴─────┐
│  PROCESSING  │    │   IDLE   │
│   (Acting)   │    │ Timeout  │
└──────┬───────┘    └──────────┘
       │
       │ Complete/Error
       ▼
┌──────────────┐
│   DORMANT    │ ◄──┐
└──────────────┘    │
       ▲            │
       │ Error      │
┌──────┴───────┐    │
│    ERROR     │────┘
│  (Recovering)│
└──────────────┘
```

### State Descriptions

| State | Description | Transitions |
|-------|-------------|-------------|
| `DORMANT` | Inactive, waiting for trigger | → THINKING |
| `THINKING` | Model inference active | → PROCESSING, ERROR |
| `PROCESSING` | Executing actions/tools | → DORMANT, ERROR |
| `ERROR` | Recovering from failure | → DORMANT, TERMINATING |
| `TERMINATING` | Graceful shutdown | → TERMINATED |
| `TERMINATED` | Stopped permanently | (none) |

### State Transitions

```json
{
  "state": "DORMANT",
  "transitions": {
    "on_trigger": "THINKING",
    "on_complete": "DORMANT",
    "on_error": "ERROR",
    "on_terminate": "TERMINATING"
  }
}
```

---

## Equipment System

Equipment provides specialized capabilities to Claws.

### Equipment Slots

| Slot | Purpose | Example Modules |
|------|---------|-----------------|
| `MEMORY` | Semantic/episodic storage | vector_database, semantic_memory |
| `REASONING` | Multi-step inference | reasoning_chain, planner |
| `CONSENSUS` | Distributed voting | consensus_voter, tripartite |
| `SPREADSHEET` | Data manipulation | data_processor, analyzer |
| `DISTILLATION` | Model compression | model_distiller, optimizer |
| `COORDINATION` | Multi-agent orchestration | team_coordinator, scheduler |
| `MONITORING` | Metrics collection | metrics_collector, profiler |
| `COMMUNICATION` | Message passing | message_broker, pubsub |

### Equipment Configuration

```json
{
  "equipment": [
    {
      "slot": "MEMORY",
      "module_type": "semantic_memory_v1",
      "config": {
        "max_entries": 10000,
        "retention_policy": "lru",
        "embedding_model": "text-embedding-ada-002"
      },
      "priority": 8,
      "enabled": true
    },
    {
      "slot": "CONSENSUS",
      "module_type": "consensus_voter",
      "config": {
        "voting_power": 0.34,
        "protocol": "tripartite"
      },
      "priority": 9
    }
  ]
}
```

### Dynamic Equipment

Equipment can be added/removed at runtime:

```javascript
// Add equipment
claw.equip({
  slot: "REASONING",
  module_type: "planner_v2",
  config: { max_depth: 10 }
});

// Remove equipment
claw.unequip("MEMORY");

// Check equipment
if (claw.has_equipment("CONSENSUS")) {
  // Use consensus capabilities
}
```

---

## Trigger Mechanisms

Triggers determine when a Claw activates.

### Trigger Types

#### 1. Periodic Trigger

Time-based activation:

```json
{
  "type": "periodic",
  "config": {
    "interval": "PT5M",
    "phase": "PT0S",
    "max_jitter": "PT30S"
  }
}
```

**ISO 8601 Duration Format:**
- `PT5M` - Every 5 minutes
- `PT1H` - Every 1 hour
- `PT30S` - Every 30 seconds
- `PT1H30M` - Every 1 hour 30 minutes

#### 2. Data-Driven Trigger

Threshold-based activation:

```json
{
  "type": "data_driven",
  "config": {
    "condition": {
      "field": "memory.usage_percent",
      "operator": ">",
      "value": 80,
      "window": "PT5M",
      "aggregation": "avg"
    },
    "check_interval": "PT1M",
    "cooldown": "PT5M"
  }
}
```

**Operators:**
- `>` - Greater than
- `<` - Less than
- `>=` - Greater or equal
- `<=` - Less or equal
- `==` - Equal
- `!=` - Not equal
- `in` - In array
- `not_in` - Not in array

#### 3. Event-Based Trigger

Event-driven activation:

```json
{
  "type": "event_based",
  "config": {
    "event_pattern": "consensus.round_complete",
    "filter": {
      "source": "consensus_service",
      "min_severity": "info"
    }
  }
}
```

**Pattern Matching:**
- `consensus.round_complete` - Exact match
- `memory.overflow.*` - Wildcard match
- `^error\\..*critical$` - Regex match

#### 4. Hybrid Trigger

Combined conditions:

```json
{
  "type": "hybrid",
  "config": {
    "triggers": [
      {
        "type": "periodic",
        "config": {"interval": "PT1H"}
      },
      {
        "type": "data_driven",
        "config": {
          "condition": {
            "field": "queue_depth",
            "operator": ">",
            "value": 100
          }
        }
      }
    ],
    "logic": "OR"
  }
}
```

**Logic Operations:**
- `AND` - All triggers must match
- `OR` - Any trigger must match
- `NOT` - Activates when no triggers match

---

## Social Relationships

Claws form social networks for coordination.

### Relationship Types

#### Master-Slave

```json
{
  "relationships": {
    "master_of": [
      "uuid-of-slave-1",
      "uuid-of-slave-2",
      "uuid-of-slave-3"
    ]
  }
}
```

**Use Cases:**
- Parallel processing
- Task distribution
- Workload scaling

#### Co-Worker

```json
{
  "relationships": {
    "coworkers": [
      {
        "claw_id": "uuid-of-coworker",
        "relationship_type": "consensus"
      },
      {
        "claw_id": "uuid-of-validator",
        "relationship_type": "validate"
      }
    ]
  }
}
```

**Relationship Types:**
- `validate` - Validation and verification
- `consensus` - Joint decision making
- `parallel` - Parallel work execution
- `sequential` - Sequential processing
- `adversarial` - Opposing perspectives

#### Peer

```json
{
  "relationships": {
    "peers": [
      "uuid-of-peer-1",
      "uuid-of-peer-2"
    ]
  }
}
```

**Use Cases:**
- Loose coordination
- Information sharing
- Event notification

---

## Memory Architecture

Claws have sophisticated memory systems.

### Memory Types

#### Semantic Memory

```json
{
  "memory": {
    "semantic_memory": {
      "enabled": true,
      "max_entries": 10000,
      "retention_policy": "lru",
      "embedding_model": "text-embedding-ada-002"
    }
  }
}
```

**Retention Policies:**
- `lru` - Least recently used
- `lfu` - Least frequently used
- `fifo` - First in, first out
- `importance` - Importance-based

#### Working Memory

```json
{
  "memory": {
    "working_memory": {
      "max_items": 100,
      "expiration_ms": 3600000
    }
  }
}
```

#### Episodic Memory

```json
{
  "memory": {
    "episodic_memory": {
      "enabled": true,
      "max_episodes": 1000,
      "compression_threshold": 100
    }
  }
}
```

---

## Error Handling

Robust error handling for production reliability.

### Error Handling Configuration

```json
{
  "error_handling": {
    "max_consecutive_errors": 10,
    "error_recovery_strategy": "retry",
    "fallback_claw": "uuid-of-fallback-claw",
    "notification_channels": [
      "slack://alerts-channel",
      "email://team@example.com"
    ],
    "error_blacklist": [
      "authentication_failed",
      "permission_denied"
    ]
  }
}
```

### Recovery Strategies

| Strategy | Description |
|----------|-------------|
| `retry` | Retry with exponential backoff |
| `fallback` | Switch to fallback model/claw |
| `escalate` | Escalate to parent/master claw |
| `terminate` | Gracefully terminate |

---

## Examples

### Example 1: Simple Periodic Claw

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "MemoryOptimizer",
  "model": {
    "provider": "deepseek",
    "model_name": "deepseek-chat",
    "parameters": {
      "temperature": 0.7,
      "max_tokens": 2048
    }
  },
  "seed": {
    "seed_id": "seed-8f7d2a-periodic"
  },
  "state": "DORMANT",
  "equipment": [
    {
      "slot": "MEMORY",
      "module_type": "semantic_memory_v1",
      "config": {
        "max_entries": 10000,
        "retention_policy": "lru"
      }
    }
  ],
  "config": {
    "timeout": {
      "execution_timeout_ms": 30000
    },
    "retry_policy": {
      "max_retries": 3
    }
  },
  "triggers": {
    "type": "periodic",
    "config": {
      "interval": "PT5M"
    }
  },
  "metadata": {
    "version": "1.0.0",
    "created_at": "2026-03-15T10:00:00Z",
    "tags": ["optimization", "memory"]
  }
}
```

### Example 2: Co-Worker Claw with Multiple Equipment

```json
{
  "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "name": "ConsensusValidator",
  "model": {
    "provider": "anthropic",
    "model_name": "claude-3-opus",
    "parameters": {
      "temperature": 0.3,
      "max_tokens": 4096
    },
    "fallback_models": [
      {
        "provider": "deepseek",
        "model_name": "deepseek-chat"
      }
    ]
  },
  "seed": {
    "seed_id": "seed-a7c4d2-event_based"
  },
  "state": "PROCESSING",
  "equipment": [
    {
      "slot": "CONSENSUS",
      "module_type": "consensus_voter",
      "config": {
        "voting_power": 0.34
      }
    },
    {
      "slot": "COORDINATION",
      "module_type": "team_coordinator",
      "config": {
        "max_team_size": 10
      }
    }
  ],
  "relationships": {
    "coworkers": [
      {
        "claw_id": "550e8400-e29b-41d4-a716-446655440000",
        "relationship_type": "consensus"
      }
    ]
  },
  "config": {
    "timeout": {
      "execution_timeout_ms": 60000
    },
    "execution": {
      "parallel_execution": true
    }
  },
  "triggers": {
    "type": "event_based",
    "config": {
      "event_pattern": "consensus.round_complete"
    }
  },
  "metrics": {
    "execution": {
      "total_executions": 1250,
      "successful_executions": 1198
    }
  },
  "error_handling": {
    "max_consecutive_errors": 5,
    "error_recovery_strategy": "fallback"
  },
  "metadata": {
    "version": "2.1.0",
    "created_at": "2026-03-10T14:30:00Z",
    "updated_at": "2026-03-15T09:15:00Z",
    "tags": ["consensus", "validation"],
    "description": "Validates consensus rounds and participates in tripartite decision making"
  }
}
```

### Example 3: Master Claw with Slaves

```json
{
  "id": "7ba7b820-9dad-11d1-80b4-00c04fd430c9",
  "name": "DataPipelineMaster",
  "model": {
    "provider": "openai",
    "model_name": "gpt-4",
    "parameters": {
      "temperature": 0.5,
      "max_tokens": 8192
    }
  },
  "seed": {
    "seed_id": "seed-2c8e3b-data_driven"
  },
  "state": "PROCESSING",
  "equipment": [
    {
      "slot": "COORDINATION",
      "module_type": "pipeline_coordinator",
      "config": {
        "max_parallel_jobs": 10
      }
    }
  ],
  "relationships": {
    "master_of": [
      "slave-claw-1-uuid",
      "slave-claw-2-uuid",
      "slave-claw-3-uuid"
    ]
  },
  "config": {
    "execution": {
      "parallel_execution": true,
      "max_iterations": 1000
    }
  },
  "triggers": {
    "type": "data_driven",
    "config": {
      "condition": {
        "field": "pipeline.queue_depth",
        "operator": ">",
        "value": 10
      }
    }
  },
  "metadata": {
    "version": "1.5.0",
    "description": "Master claw coordinating data pipeline processing across multiple slaves"
  }
}
```

---

## Best Practices

### 1. Model Selection

**Choose models based on task complexity:**

```json
// Simple tasks - Use fast, cost-effective models
{
  "model": {
    "provider": "deepseek",
    "model_name": "deepseek-chat"
  }
}

// Complex reasoning - Use high-capability models
{
  "model": {
    "provider": "anthropic",
    "model_name": "claude-3-opus"
  }
}
```

### 2. Temperature Tuning

**Adjust based on task type:**

| Task | Temperature | Reason |
|------|-------------|--------|
| Fact extraction | 0.0 - 0.3 | Minimize hallucination |
| Code generation | 0.2 - 0.5 | Balance creativity and accuracy |
| Brainstorming | 0.7 - 1.0 | Maximize diversity |
| Creative writing | 0.8 - 1.2 | Encourage originality |

### 3. Equipment Selection

**Equip only what's needed:**

```json
{
  "equipment": [
    {
      "slot": "MEMORY",
      "module_type": "semantic_memory_v1",
      "priority": 8
    }
    // Don't equip CONSENSUS if working alone
    // Don't equip COORDINATION if not managing others
  ]
}
```

### 4. Trigger Design

**Balance responsiveness and efficiency:**

```json
// Good: Appropriate interval for monitoring
{
  "type": "periodic",
  "config": {"interval": "PT5M"}
}

// Bad: Too frequent, wastes resources
{
  "type": "periodic",
  "config": {"interval": "PT1S"}
}

// Good: Prevents flapping
{
  "type": "data_driven",
  "config": {
    "condition": {...},
    "cooldown": "PT5M"
  }
}
```

### 5. Error Handling

**Always configure fallbacks:**

```json
{
  "model": {
    "provider": "anthropic",
    "model_name": "claude-3-opus",
    "fallback_models": [
      {
        "provider": "deepseek",
        "model_name": "deepseek-chat"
      }
    ]
  },
  "error_handling": {
    "max_consecutive_errors": 5,
    "error_recovery_strategy": "fallback"
  }
}
```

### 6. Resource Management

**Set appropriate limits:**

```json
{
  "config": {
    "timeout": {
      "execution_timeout_ms": 30000,
      "thinking_timeout_ms": 10000
    },
    "resources": {
      "max_memory_mb": 512,
      "max_cpu_percent": 80
    }
  }
}
```

### 7. Memory Configuration

**Choose right retention policy:**

```json
{
  "memory": {
    "semantic_memory": {
      "retention_policy": "lru"  // For general use
      // "lfu" - For frequently accessed items
      // "importance" - For critical information
    }
  }
}
```

---

## Validation Rules

### Required Fields

All Claws must have:

1. ✅ `id` - Valid UUID v4
2. ✅ `model` - Valid model configuration
3. ✅ `seed` - Valid seed reference
4. ✅ `state` - Valid state enum
5. ✅ `equipment` - Array (can be empty)
6. ✅ `config` - Runtime configuration object

### Model Compatibility

Validation rules:

- ✅ `provider` must be supported
- ✅ `model_name` must be available on provider
- ✅ `api_key` must be provided (except for local models)
- ✅ `temperature` must be in valid range (0.0 - 2.0)
- ✅ `max_tokens` must be positive

### Equipment Validation

Rules:

- ✅ `slot` must be valid equipment slot
- ✅ No duplicate slots
- ✅ `priority` must be 1-10
- ✅ `enabled` must be boolean

### Trigger Validation

Rules:

- ✅ `type` must be valid trigger type
- ✅ Periodic: valid ISO 8601 duration
- ✅ Data-driven: valid operator and field
- ✅ Event-based: valid event pattern
- ✅ Hybrid: minimum 2 triggers

### State Machine Validation

Valid transitions:

```
DORMANT → THINKING
THINKING → PROCESSING
THINKING → ERROR
PROCESSING → DORMANT
PROCESSING → ERROR
ERROR → DORMANT
ERROR → TERMINATING
* → TERMINATING → TERMINATED
```

---

## Architecture Integration

### Relationship with Other Schemas

The Claw schema integrates with:

1. **Seed Schema** (`seed-schema.json`)
   - Defines behavior and learning
   - Claws reference seeds for initialization

2. **Social Schema** (`social-schema.json`)
   - Defines relationships and coordination
   - Claws use social protocols for collaboration

3. **Equipment Schemas** (future)
   - Define specialized modules
   - Claws equip modules for capabilities

### Data Flow

```
┌─────────────────────────────────────────────┐
│              CLAW ECOSYSTEM                 │
│                                             │
│  ┌─────────────┐      ┌──────────────┐     │
│  │  SEED SCHEMA│ ───▶ │  CLAW SCHEMA │     │
│  │  (Behavior) │      │  (Agent)     │     │
│  └─────────────┘      └──────┬───────┘     │
│                              │              │
│                              ▼              │
│                     ┌──────────────┐       │
│                     │SOCIAL SCHEMA │       │
│                     │(Coordination)│       │
│                     └──────────────┘       │
└─────────────────────────────────────────────┘
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Claw** | Cellular agent with ML model |
| **Seed** | Learnable behavior definition |
| **Equipment** | Specialized capability module |
| **Trigger** | Condition that activates claw |
| **State** | Current operational status |
| **Model** | AI/LLM that powers intelligence |
| **Relationship** | Social connection to other claws |
| **Consensus** | Distributed decision-making |
| **Memory** | Information storage and retrieval |
| **Distillation** | Model compression optimization |

---

## Future Extensions

Planned enhancements:

1. **Multi-Model Claws** - Support for multiple models simultaneously
2. **Dynamic Equipment Loading** - Runtime equipment discovery
3. **Advanced Memory** - Hierarchical memory systems
4. **Federated Learning** - Cross-claw knowledge sharing
5. **Self-Modification** - Claws that modify their own structure

---

**Schema Version:** 1.0.0
**Last Updated:** 2026-03-15
**Maintainer:** SuperInstance Project
