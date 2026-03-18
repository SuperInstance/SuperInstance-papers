# Claw Social Architecture

A comprehensive schema for distributed multi-agent coordination, defining how AI agents (claws) work together as slaves, co-workers, and masters through social relationships.

## Overview

Claws are **social entities** that can:
- Spawn other claws as slaves for parallel work
- Establish peer relationships as co-workers for collaboration
- Coordinate via consensus protocols for decision-making
- Adapt their social structure dynamically based on workload

This enables **cellular programming at scale** - where simple agents self-organize into complex, adaptive systems.

## Key Innovation

> "Claws are not just coordinated - they are social. They form relationships, build trust, negotiate consensus, and self-organize into teams. This social architecture enables emergent intelligence through collaboration."

## Documentation

| Document | Description |
|----------|-------------|
| **[SOCIAL_SCHEMA.md](docs/SOCIAL_SCHEMA.md)** | Comprehensive documentation of social architecture concepts, patterns, and best practices |
| **[SOCIAL_SCHEMA_QUICK_REFERENCE.md](docs/SOCIAL_SCHEMA_QUICK_REFERENCE.md)** | Quick reference guide with cheat sheets and common patterns |
| **[social-schema.json](schemas/social-schema.json)** | JSON Schema definition for validation and tooling |
| **[social-config-example.json](examples/social-config-example.json)** | Complete example configuration |

## Quick Start

### 1. Understand Relationship Types

```
Master → Slave:     Parallel processing (⬇️)
Claw ↔ Co-Worker:   Collaboration (🤝)
Claw ↔ Peer:        Decentralized (🔄)
Claw → Delegate:    Specialized tasks (➡️)
Claw → Observer:    Monitoring (👁️)
```

### 2. Choose Coordination Strategy

- **PARALLEL**: Execute simultaneously, aggregate results
- **SEQUENTIAL**: Execute one after another
- **CONSENSUS**: All must agree
- **MAJORITY_VOTE**: Majority decides
- **WEIGHTED**: Weight by confidence
- **PIPELINE**: Multi-stage workflow
- **MAP_REDUCE**: Big data processing

### 3. Select Consensus Protocol

- **TRIPARTITE**: Pathos + Logos + Ethos (ethical decisions)
- **BYZANTINE**: Byzantine fault tolerance (adversarial)
- **PAXOS/RAFT**: Distributed systems consensus
- **SIMPLE**: Fast majority vote

### 4. Configure Communication

- **WEB_SOCKET**: Real-time bidirectional
- **MESSAGE_QUEUE**: Async messaging
- **SHARED_MEMORY**: Direct memory access
- **HTTP**: Simple REST API
- **GRPC**: High-performance streaming

## Example Configuration

```json
{
  "claw_relationships": [
    {
      "from_claw": "master-claw",
      "to_claw": "worker-claw",
      "relationship_type": "slave",
      "config": {
        "slave_config": {
          "master_claw": "master-claw",
          "slave_count": 5,
          "distribution_strategy": "round_robin",
          "coordination_channel": "task_queue"
        }
      }
    }
  ]
}
```

See [social-config-example.json](examples/social-config-example.json) for more examples.

## Directory Structure

```
claw/
├── schemas/
│   └── social-schema.json          # JSON Schema definition
├── docs/
│   ├── SOCIAL_SCHEMA.md            # Full documentation
│   └── SOCIAL_SCHEMA_QUICK_REFERENCE.md  # Quick reference
├── examples/
│   └── social-config-example.json  # Example configuration
└── README.md                       # This file
```

## Common Patterns

### Pattern 1: Master-Slave for Parallel Work

```json
{
  "relationship_type": "slave",
  "config": {
    "slave_config": {
      "slave_count": 5,
      "distribution_strategy": "round_robin",
      "coordination_channel": "task_queue"
    }
  }
}
```

### Pattern 2: Co-Worker Validation

```json
{
  "relationship_type": "coworker",
  "config": {
    "coworker_config": {
      "relationship_type": "validate",
      "consensus_strategy": {"type": "unanimous"}
    }
  }
}
```

### Pattern 3: Tripartite Ethical Decision

```json
{
  "type": "TRIPARTITE",
  "tripartite_config": {
    "pathos_claw": "emotional-ai",
    "logos_claw": "logical-ai",
    "ethos_claw": "ethical-ai"
  }
}
```

## Validation

Validate your configuration against the schema:

```bash
# Using ajv-cli
npx ajv validate -s claw/schemas/social-schema.json -d your-config.json

# Using Python jsonschema
jsonschema -i claw/schemas/social-schema.json your-config.json
```

## Best Practices

✅ **DO:**
- Use slaves for parallel processing
- Use co-workers for validation
- Set appropriate timeouts
- Implement retry logic
- Monitor claw health
- Use reputation systems

❌ **DON'T:**
- Spawn unlimited slaves
- Ignore communication failures
- Use wrong consensus protocol
- Forget fallback strategies
- Skip error handling
- Assume all claws are honest

## Use Cases

### Web Scraping Cluster
- Master claw spawns 10 slaves
- Distributes URLs via hash-based routing
- Aggregates results using merge strategy

### Code Review System
- Coder claw writes code
- Validator claw reviews
- Unanimous consensus required
- Referee claw resolves disputes

### Ethical Decision Making
- Pathos claw: emotional perspective
- Logos claw: logical perspective
- Ethos claw: ethical perspective
- Dialectical synthesis for decisions

### Multi-Modal Analysis
- Parallel analysis across multiple claws
- Each specializes in different modality
- Merge results for comprehensive understanding

## Advanced Features

### Dynamic Reconfiguration
Claws can adapt their social structure based on:
- Load levels (spawn slaves when busy)
- Error rates (add validators when unreliable)
- Idle time (terminate slaves to save resources)

### Reputation Systems
Track claw reliability for:
- Weighted decision making
- Expert selection
- Trust-based collaboration

### Emergent Teams
Claws self-organize into teams based on:
- Required capabilities
- Current availability
- Reputation scores
- Task requirements

## Contributing

Contributions welcome! Please:
1. Follow the existing schema structure
2. Add comprehensive documentation
3. Provide examples
4. Test with real configurations

## License

Part of the Claw distributed multi-agent system.

## Related Projects

- **Claw Core**: Core claw agent framework
- **Claw Runtime**: Runtime environment for claws
- **Claw Monitoring**: Observability and metrics

## Support

For questions or issues:
- See documentation in `docs/`
- Check examples in `examples/`
- Review schema in `schemas/`

---

**Status**: Ready for production use
**Last Updated**: 2026-03-15
**Version**: 1.0.0
