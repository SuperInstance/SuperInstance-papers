# Claw Schema Examples

This directory contains example Claw configurations demonstrating various patterns and use cases.

## Files

### simple-claw-example.json
A basic Claw configuration showing:
- Minimal viable agent setup
- Periodic trigger configuration
- Basic equipment (MEMORY + REASONING)
- Simple error handling
- Standard DeepSeek model configuration

**Use Cases:**
- Learning Claw structure
- Testing basic functionality
- Understanding core concepts

### advanced-claw-example.json
A production-ready Claw configuration showing:
- Complex trigger mechanisms (hybrid)
- Multiple equipment modules
- Social relationships (master, coworkers, peers)
- Advanced memory configuration
- Comprehensive error handling
- Detailed metrics collection
- Fallback model configuration

**Use Cases:**
- Production deployments
- Multi-agent coordination
- High-availability scenarios

## Quick Start

### 1. Validate a Configuration

Use JSON Schema validation:

```bash
# Using ajv-cli
ajv validate -s ../schemas/claw-schema.json -d simple-claw-example.json

# Using Python
python -m jsonschema ../schemas/claw-schema.json simple-claw-example.json
```

### 2. Load in Code

**JavaScript/TypeScript:**
```javascript
import Ajv from 'ajv';
import clawSchema from '../schemas/claw-schema.json';
import simpleClaw from './simple-claw-example.json';

const ajv = new Ajv();
const validate = ajv.compile(clawSchema);

if (validate(simpleClaw)) {
  console.log('Valid Claw configuration!');
  // Use the configuration
} else {
  console.error('Validation errors:', validate.errors);
}
```

**Python:**
```python
import json
from jsonschema import validate, Draft202012Validator

with open('../schemas/claw-schema.json') as f:
    schema = json.load(f)

with open('simple-claw-example.json') as f:
    claw_config = json.load(f)

# Validate
Draft202012Validator(schema).validate(claw_config)
print("Valid Claw configuration!")
```

**Rust:**
```rust
use serde_json::Value;
use jsonschema::{JSONSchema, Draft};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let schema: Value = serde_json::from_str(
        &std::fs::read_to_string("../schemas/claw-schema.json")?
    )?;

    let instance: Value = serde_json::from_str(
        &std::fs::read_to_string("simple-claw-example.json")?
    )?;

    let validator = JSONSchema::compile(&schema, Draft::Draft202012)?;
    let result = validator.validate(&instance);

    if let Err(errors) = result {
        for error in errors {
            println!("Validation error: {}", error);
        }
    } else {
        println!("Valid Claw configuration!");
    }

    Ok(())
}
```

## Configuration Patterns

### Periodic Monitoring

```json
{
  "triggers": {
    "type": "periodic",
    "config": {
      "interval": "PT5M"
    }
  }
}
```

### Event-Driven Response

```json
{
  "triggers": {
    "type": "event_based",
    "config": {
      "event_pattern": "consensus.round_complete"
    }
  }
}
```

### Data-Driven Activation

```json
{
  "triggers": {
    "type": "data_driven",
    "config": {
      "condition": {
        "field": "memory.usage_percent",
        "operator": ">",
        "value": 80
      }
    }
  }
}
```

### Hybrid Triggers

```json
{
  "triggers": {
    "type": "hybrid",
    "config": {
      "triggers": [
        {"type": "periodic", "config": {"interval": "PT1H"}},
        {"type": "event_based", "config": {"event_pattern": "alert.*"}}
      ],
      "logic": "OR"
    }
  }
}
```

## Model Selection Guide

### Cost-Effective (Simple Tasks)
```json
{
  "model": {
    "provider": "deepseek",
    "model_name": "deepseek-chat",
    "parameters": {
      "temperature": 0.7
    }
  }
}
```

### High-Capability (Complex Reasoning)
```json
{
  "model": {
    "provider": "anthropic",
    "model_name": "claude-3-opus",
    "parameters": {
      "temperature": 0.3,
      "max_tokens": 8192
    }
  }
}
```

### With Fallback
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
  }
}
```

## Equipment Combinations

### Memory-Optimized
```json
{
  "equipment": [
    {
      "slot": "MEMORY",
      "module_type": "semantic_memory_v1",
      "priority": 10
    }
  ]
}
```

### Coordination-Focused
```json
{
  "equipment": [
    {
      "slot": "CONSENSUS",
      "module_type": "consensus_voter",
      "priority": 9
    },
    {
      "slot": "COORDINATION",
      "module_type": "team_coordinator",
      "priority": 8
    }
  ]
}
```

### Full-Stack
```json
{
  "equipment": [
    {"slot": "MEMORY", "module_type": "semantic_memory_v1"},
    {"slot": "REASONING", "module_type": "reasoning_chain"},
    {"slot": "CONSENSUS", "module_type": "consensus_voter"},
    {"slot": "COORDINATION", "module_type": "team_coordinator"},
    {"slot": "MONITORING", "module_type": "metrics_collector"}
  ]
}
```

## Social Relationship Patterns

### Master-Slave (Parallel Processing)
```json
{
  "relationships": {
    "master_of": [
      "slave-1-uuid",
      "slave-2-uuid",
      "slave-3-uuid"
    ]
  }
}
```

### Co-Worker (Consensus)
```json
{
  "relationships": {
    "coworkers": [
      {
        "claw_id": "coworker-1-uuid",
        "relationship_type": "consensus"
      },
      {
        "claw_id": "coworker-2-uuid",
        "relationship_type": "validate"
      }
    ]
  }
}
```

### Peer (Loose Coordination)
```json
{
  "relationships": {
    "peers": [
      "peer-1-uuid",
      "peer-2-uuid"
    ]
  }
}
```

## Common Mistakes to Avoid

### 1. Missing Required Fields
```json
// ❌ Missing required fields
{
  "id": "some-id",
  "model": {...}
}

// ✅ All required fields
{
  "id": "some-id",
  "model": {...},
  "seed": {...},
  "state": "DORMANT",
  "equipment": [],
  "config": {...}
}
```

### 2. Invalid State Transitions
```json
// ❌ Invalid transition (can't go from DORMANT to PROCESSING directly)
{
  "state": "PROCESSING"  // Must go through THINKING first
}

// ✅ Valid transition
{
  "state": "THINKING"  // Then PROCESSING
}
```

### 3. Duplicate Equipment Slots
```json
// ❌ Duplicate MEMORY slot
{
  "equipment": [
    {"slot": "MEMORY", ...},
    {"slot": "MEMORY", ...}  // Duplicate!
  ]
}

// ✅ Unique slots
{
  "equipment": [
    {"slot": "MEMORY", ...},
    {"slot": "REASONING", ...}
  ]
}
```

### 4. Invalid Time Durations
```json
// ❌ Invalid ISO 8601 duration
{
  "interval": "5 minutes"  // Wrong format
}

// ✅ Valid ISO 8601 duration
{
  "interval": "PT5M"  // Correct format
}
```

## Testing Your Configurations

### Local Validation Script

Create a test script:

```bash
#!/bin/bash
# validate-claw.sh

SCHEMA="../schemas/claw-schema.json"
CONFIG=$1

if [ -z "$CONFIG" ]; then
  echo "Usage: ./validate-claw.sh <config-file>"
  exit 1
fi

echo "Validating $CONFIG against $SCHEMA..."

if ajv validate -s "$SCHEMA" -d "$CONFIG" --strict=false; then
  echo "✅ Configuration is valid!"
  exit 0
else
  echo "❌ Configuration has errors:"
  ajv validate -s "$SCHEMA" -d "$CONFIG" --strict=false
  exit 1
fi
```

Usage:
```bash
chmod +x validate-claw.sh
./validate-claw.sh simple-claw-example.json
```

## Next Steps

1. **Read the full schema documentation:** `../docs/CLAW_SCHEMA.md`
2. **Explore the social schema:** `../docs/SOCIAL_SCHEMA.md`
3. **Check the seed schema:** `../schemas/seed-schema.json`
4. **Build your first Claw:** Start with `simple-claw-example.json` and modify

## Support

For questions or issues:
- Documentation: `../docs/`
- Schema validation: `../schemas/`
- Examples: This directory

---

**Last Updated:** 2026-03-15
**Schema Version:** 1.0.0
