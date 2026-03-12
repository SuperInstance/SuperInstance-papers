# Round 2 Agent: Coordination Protocol Architect

**Mission**: Design specific agent communication protocols for POLLN based on Round 1 MARL findings.

---

## Context from Round 1

Round 1 Multi-Agent Systems research identified:
- **CTDE pattern**: Centralized training, decentralized execution
- **Communication types**: Continuous, discrete, targeted, scheduled
- **Key algorithms**: CommNet (differentiable), TarMAC (targeted), SchedNet (scheduled)
- **Critical need**: Heterogeneous agent coordination

---

## Research Questions

1. **Message Protocol Design**
   - What should A2A (agent-to-agent) packages contain?
   - How to structure coordinator → specialist messages?
   - How to structure specialist → coordinator responses?

2. **Communication Scheduling**
   - When should agents communicate? (event-driven, periodic, learned)
   - How to minimize communication overhead?
   - How to handle asynchronous messaging?

3. **Attention Mechanisms**
   - How do coordinators attend to relevant specialists?
   - How do specialists filter coordinator instructions?
   - Multi-head attention for heterogeneous agents?

4. **Consensus Protocols**
   - How do coordinators reach decisions?
   - Raft/Paxos adaptations for agent systems?
   - Conflict resolution mechanisms?

5. **Stigmergy Implementation**
   - How to implement pheromone-like indirect communication?
   - Pathway strength signaling between agents?
   - Environment modification patterns?

---

## Required Outputs

1. **A2A Package Specification**
   ```typescript
   interface A2APackage {
     // Define the structure
   }
   ```

2. **Communication Protocol Specification**
   - Message types and schemas
   - Timing and scheduling
   - Error handling

3. **Attention Mechanism Design**
   - Coordinator attention over specialists
   - Specialist attention over coordinator messages
   - Computational complexity analysis

4. **Consensus Algorithm Adaptation**
   - POLLN-specific consensus requirements
   - Failure handling
   - Performance characteristics

5. **Implementation Pseudocode**
   - For each major component

---

## Constraints from Round 1

- Must support **heterogeneous agents** (different capabilities)
- Must handle **dynamic agent populations** (creation/destruction)
- Must work with **subsumption layers** (safety overrides)
- Must integrate with **Plinko selection** (stochastic routing)
- Must preserve **privacy** (DP-compliant messaging)

---

## Success Criteria

- [ ] Complete A2A package specification
- [ ] Communication protocol documented
- [ ] Attention mechanism designed
- [ ] Consensus algorithm adapted
- [ ] Integration points with other components identified
- [ ] Complexity analysis completed

---

## Output Location

Write findings to: `docs/research/round2-coordination-protocols.md`

Report synthesis to: `docs/round2-synthesis/README.md`
