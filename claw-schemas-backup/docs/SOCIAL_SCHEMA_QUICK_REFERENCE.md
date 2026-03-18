# Claw Social Schema - Quick Reference

## Relationship Types at a Glance

| Type | Symbol | When to Use | Example |
|------|--------|-------------|---------|
| **Slave** | ⬇️ | Parallel processing, task distribution | Master spawns 5 slaves for web scraping |
| **Co-Worker** | 🤝 | Validation, consensus, collaboration | Coder + Reviewer pair |
| **Peer** | 🔄 | Decentralized collaboration | P2P network nodes |
| **Delegate** | ➡️ | Specialized tasks | Generalist → Security specialist |
| **Observer** | 👁️ | Monitoring, learning | Student observes expert |

## Coordination Strategies Cheat Sheet

```bash
# PARALLEL - Speed up independent tasks
participant_claws: [A, B, C]
aggregation_method: merge
timeout: 30s overall, 10s each

# SEQUENTIAL - Pipeline processing
execution_order: [A → B → C]
timeout: 60s total

# CONSENSUS - All must agree
participant_claws: [A, B, C]
agreement_threshold: 100%

# MAJORITY_VOTE - Democratic decisions
participant_claws: [A, B, C, D, E]
agreement_threshold: >50%

# WEIGHTED - Trust-based
participant_claws: {A: 0.8, B: 0.6, C: 0.4}
aggregation: weighted_average

# PIPELINE - Multi-stage workflow
execution_order: [fetch → parse → analyze → index]
each_passes_to_next: true

# MAP_REDUCE - Big data
participant_claws: [mapper1, mapper2, reducer]
map_then_reduce: true
```

## Consensus Protocols Quick Pick

```
Need ethical decision?
└─ Use TRIPARTITE (Pathos + Logos + Ethos)

Adversarial environment?
└─ Use BYZANTINE (fault tolerant)

Simple fast decision?
└─ Use SIMPLE (majority vote)

Distributed system?
└─ Use PAXOS or RAFT (proven)

Blockchain?
└─ Use POW/POS/DPOS (decentralized)
```

## Communication Protocol Selection

```
Real-time interaction?
└─ WEB_SOCKET (bidirectional, low latency)

Decoupled async?
└─ MESSAGE_QUEUE (Redis, RabbitMQ)

Co-located claws?
└─ SHARED_MEMORY (fastest)

Human-in-loop?
└─ SPREADSHEET (Google Sheets)

Simple API?
└─ HTTP/REST (universal)

High-performance?
└─ GRPC (streaming, low latency)
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
      "consensus_strategy": {"type": "unanimous"},
      "fallback_strategy": {"type": "referee"}
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
    "ethos_claw": "ethical-ai",
    "synthesis_method": "dialectical"
  }
}
```

## Distribution Strategies

| Strategy | Use Case | Example |
|----------|----------|---------|
| `round_robin` | Equal distribution | Batch processing |
| `hash` | Consistent routing | User-specific tasks |
| `random` | Load balancing | Request handling |
| `least_loaded` | Dynamic optimization | Variable workloads |
| `affinity` | Data locality | Cache-aware |
| `broadcast` | All need data | Notifications |

## Quick Configuration Templates

### Template 1: Web Scraping Cluster

```json
{
  "master_claw": "scraper-master",
  "slave_count": 10,
  "distribution_strategy": "hash",
  "coordination_channel": "scrape_tasks",
  "termination_condition": {"type": "on_completion"}
}
```

### Template 2: Code Review Pair

```json
{
  "primary_claw": "coder",
  "coworker_claw": "reviewer",
  "relationship_type": "validate",
  "consensus_strategy": {"type": "unanimous"},
  "synchronization": {"mode": "synchronous"}
}
```

### Template 3: Ethical Decision Panel

```json
{
  "type": "TRIPARTITE",
  "participants": ["pathos", "logos", "ethos"],
  "quorum": {"type": "unanimous"},
  "synthesis_method": "integration"
}
```

## Best Practices Summary

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

## Performance Tips

1. **Load Balancing**: Use dynamic distribution with `least_loaded`
2. **Timeouts**: Set `per_claw_timeout_ms` < `overall_timeout_ms`
3. **Batching**: Use `batch_size` for message queues
4. **Caching**: Enable caching for repeated tasks
5. **Monitoring**: Track claw metrics and reputation

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Slaves not responding | Check timeout, increase retries |
| Consensus timeout | Lower threshold, use faster protocol |
| High latency | Switch to WebSocket or shared memory |
| Unbalanced load | Use dynamic load balancing |
| Communication errors | Check authentication, encryption |

## Schema Validation

```bash
# Validate your social schema
npx ajv validate -s claw/schemas/social-schema.json -d your-config.json

# Or using the schema
const Ajv = require('ajv');
const ajv = new Ajv();
const validate = ajv.compile(require('./social-schema.json'));
const valid = validate(yourConfig);
```

## File Locations

```
claw/
├── schemas/
│   └── social-schema.json     # JSON Schema definition
└── docs/
    ├── SOCIAL_SCHEMA.md       # Full documentation
    └── SOCIAL_SCHEMA_QUICK_REFERENCE.md  # This file
```

## Additional Resources

- Full Documentation: `claw/docs/SOCIAL_SCHEMA.md`
- Schema Definition: `claw/schemas/social-schema.json`
- Examples: See documentation for detailed examples
- Best Practices: See documentation for guidelines

---

**Need Help?** Check the full documentation at `SOCIAL_SCHEMA.md`
