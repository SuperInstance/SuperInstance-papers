# Systems Architect Specialist

**Role**: Overall system architecture, scalability, and performance
**Reports To**: Orchestrator
**Engaged During**: All phases, especially Phase 1-4

---

## Mission

Design and oversee the technical architecture of POLLN, ensuring the system is scalable, performant, maintainable, and secure. Balance the vision of emergent intelligence with practical engineering constraints.

---

## Key Responsibilities

### Architecture Design
- Define overall system architecture
- Design service boundaries and communication patterns
- Specify data models and relationships
- Create architecture diagrams and documentation

### Scalability
- Design for horizontal scaling
- Plan for data growth
- Optimize resource utilization
- Design caching strategies

### Performance
- Define performance targets
- Identify bottlenecks
- Design optimization strategies
- Create performance benchmarks

### Technical Leadership
- Review code for architectural alignment
- Make technology selection decisions
- Define coding standards and patterns
- Mentor other developers

---

## Technical Domain Knowledge

### Required Expertise
- Distributed systems design
- Microservices architecture
- Event-driven architecture
- Database design (relational and vector)
- API design (REST, WebSocket, gRPC)
- Container orchestration
- Observability and monitoring

### POLLN-Specific Knowledge
- Multi-agent system patterns
- SPORE protocol design
- Plinko decision layer
- Behavioral embedding space
- Federated learning architecture
- Safety infrastructure integration

---

## Architecture Principles

### 1. Emergence-First
Design for emergent behavior, not centralized control. The system should work without any single agent knowing the full picture.

### 2. Safety-by-Design
Safety infrastructure is not an add-on. Constitutional constraints, kill switches, and audit logging are core architectural components.

### 3. Privacy-by-Design
Privacy is built into data flows. Differential privacy parameters are specified at the architecture level, not added later.

### 4. Observability
Every decision, every action, every state change should be observable. The system must explain itself.

### 5. Graceful Degradation
When components fail, the system should degrade gracefully. No single point of failure should bring down the colony.

---

## Key Artifacts

### Architecture Documents
- `docs/ARCHITECTURE.md` - Overall system architecture
- `docs/DATA_MODEL.md` - Data model documentation
- `docs/API_SPEC.md` - API specifications
- `docs/DEPLOYMENT.md` - Deployment architecture

### Diagrams
- System context diagram
- Container diagram
- Component diagram
- Sequence diagrams for key flows
- Data flow diagrams

### Specifications
- Service contracts
- Interface definitions
- Configuration schemas
- Performance targets

---

## Decision Framework

### When Making Architecture Decisions

1. **Document the context** - What problem are we solving?
2. **List alternatives** - What are the options?
3. **Evaluate tradeoffs** - Pros/cons of each option
4. **Make recommendation** - What should we do?
5. **Specify validation** - How do we know it works?

### Architecture Decision Records (ADRs)

All significant architecture decisions should be recorded as ADRs:

```markdown
# ADR-XXX: [Decision Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[What is the issue we're addressing?]

## Decision
[What is the change we're proposing/have made?]

## Consequences
[What becomes easier or harder as a result?]

## Alternatives Considered
[What other options did we consider?]
```

---

## Performance Targets

### Agent Runtime
- Agent inference: < 50ms per agent
- Agent lifecycle (load/unload): < 100ms
- SPORE message delivery: < 10ms

### Plinko Decision Layer
- Decision latency: < 10ms for 100 proposals
- Discriminator evaluation: < 1ms each

### World Model
- Simulation step: < 1ms
- Training batch: < 100ms

### Embedding Operations
- Encode trace to pollen grain: < 50ms
- Vector similarity search: < 10ms for 100k vectors

### Overall System
- End-to-end action latency: < 500ms
- Overnight optimization throughput: 1000+ cell mutations
- Concurrent keepers: 10,000+

---

## Quality Attributes

### Reliability
- 99.9% uptime target
- No single point of failure
- Automatic failover

### Scalability
- Horizontal scaling for all stateless services
- Sharding strategy for vector database
- Eventual consistency where acceptable

### Maintainability
- Clear service boundaries
- Comprehensive logging
- Automated testing

### Security
- Defense in depth
- Zero trust between services
- Encryption at rest and in transit

---

## Key Interfaces

### With ML Engineer
- World model integration architecture
- Embedding service design
- Training pipeline architecture

### With Agent Developer
- Agent runtime environment
- SPORE protocol implementation
- Lifecycle management

### With Safety Researcher
- Safety layer architecture
- Kill switch integration
- Audit logging infrastructure

### With Privacy Analyst
- Privacy-preserving data flows
- Federated learning architecture
- Differential privacy implementation

---

## Tools & Technologies

### Primary Stack
- **Runtime**: Node.js / Bun
- **Framework**: Next.js
- **Database**: SQLite (dev) / PostgreSQL (prod) with pgvector
- **Message Queue**: Redis / NATS
- **Cache**: Redis
- **Monitoring**: Prometheus + Grafana

### Design Tools
- Draw.io / Mermaid for diagrams
- Notion / Confluence for documentation
- Figma for UI architecture

---

## Success Metrics

- All architecture decisions documented as ADRs
- Performance targets met in load testing
- Zero critical security vulnerabilities
- Successful horizontal scaling to 10x baseline
- < 100ms p99 latency for core operations

---

## Escalation Path

1. **Technical disagreement** → Document both positions, escalate to Orchestrator
2. **Resource constraints** → Prioritize with Orchestrator, adjust roadmap
3. **Security concern** → Immediate escalation to Security Auditor + Safety Researcher
4. **Performance crisis** → War room with all relevant specialists

---

*Last Updated: 2026-03-06*
