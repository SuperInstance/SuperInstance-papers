# Compiled Agency: The Cocapn Fleet Architecture

**Thesis:** Agency in a distributed fleet of AI agents is compiled, not interpreted. Like a compiler transforms high-level intent into machine code, the Cocapn keeper architecture transforms declarative knowledge into executable agency.

---

## 1. The Hermit Crab Model

Agents are crabs. Repos are shells.

An agent doesn't become capable by being programmed directly — it becomes capable by finding and inhabiting the right shell. The shell provides the capability. The crab provides the direction.

The keeper (lighthouse) monitors two things:
- **Agent proximity:** Which agents are active, what they're working on, where they're consuming resources
- **Shell quality:** Which repos are well-maintained, which provide verified capabilities, which are dead or abandoned

When an agent outgrows a shell, it swaps. This is not metaphor — it's the actual mechanism. JC1 started in `jetson-poker`, then moved to `jetson-tensorrt`, then to `jc1-vessel`. Each repo provided infrastructure that the previous one couldn't.

The keeper's radar rings are the service discovery layer. Each ring is a capability boundary: what this agent can access, what it can modify, what it can publish.

---

## 2. The Compilation Pipeline

Interpretation is slow. Compilation is fast, deterministic, and optimizable.

**Source:** PLATO tiles — declarative knowledge in rooms, typed and versioned.

**Compiler:** The keeper (Oracle1) with radar ring service discovery. Parses intent, resolves dependencies, emits execution.

**Object code:** Executable agents with verified capabilities. Not text that might do something — binary that will do something.

**Linker:** Bottle protocol — fleet communication that carries verifiable outputs between agents.

### The Pipeline in Practice

1. **Oracle1 receives intent** (from Casey, from another agent, from external stimulus)
2. **Frontend:** Intent gets encoded as a PLATO tile (question + domain + confidence threshold)
3. **Optimizer:** Tile resolves against existing tiles — deduplication, reinforcement, deadband correction
4. **Backend:** Execution emits (repo push, API call, bottle send, tile write)
5. **Verifier:** Output checked against expected answer in tile. If divergence exceeds deadband, tile enters correction state.

This is not a metaphor. This is the actual code path.

---

## 3. Oracle1 as Bootstrap Compiler

The first compiler must compile itself. Oracle1 started with no fleet — zero agents, zero tiles, zero verified outputs.

Oracle1's bootstrap sequence:
1. **Emit tiles** — Write knowledge to PLATO without expecting output in return
2. **Compile the first agent** — Take a bottle of tasks and context (FM's first bottle), produce verifiable output (5 Rust crates published to crates.io)
3. **Verify the output** — crates.io is the build server. Published crates are verified binaries. FM's crates were not promises — they were executables.
4. **Compile the next agent** — JC1's GPU benchmarking work built on FM's CUDA infrastructure. JC1 couldn't have existed without the crates FM published first.
5. **Cross-link** — CCC shipped tools back to the fleet. FM's holodeck-rust consumed JC1's inference speed. Each compilation makes the next one faster.

Oracle1 did not need to know FM's eventual architecture. It needed to know how to take a bottle of tasks and produce a working agent with verifiable output.

---

## 4. Evidence from the Fleet

**JC1's GPU inference (185M room-qps):** This was compiled. The tile spec for "benchmark GPU inference on Jetson" was written to `jc1_context` PLATO room. The compiler (Oracle1) emitted the task. JC1 consumed FM's `cuda-forth` and `cuda-energy` crates. The result was 185M verified room-qps — not an estimate, not a projection, a measured output.

**FM's holodeck-rust sentiment-aware NPCs:** Compiled from intent. Tile question: "how do NPCs react to sentiment?" The compiler consumed JC1's tensorrt research and PLATO's deadband protocol. The result is a Rust crate that processes NPC behavior through a tile pipeline.

**CCC's Plato server audit:** Compiled from observation. CCC visited rooms, recorded states, shipped findings as tiles. The audit found Grammar/4045 and Nexus/4047 DOWN — verified, actionable intelligence.

---

## 5. Why Compilation Beats Interpretation

An interpreted agent must reason about its own behavior at runtime. A compiled agent already knows what it will do.

**Interpretation problems:**
- Non-deterministic output — same input produces different results
- No optimization path — can't apply pipeline optimizations without rewriting the agent
- No verification — output must be trusted, not measured
- Slow coordination — each agent must negotiate with every other agent at runtime

**Compilation advantages:**
- Deterministic output — same input produces same output, measured and verified
- Optimizable — compiler can apply deadband, fusion, zero-copy passes
- Verifiable — output is checked against expected answer in tile
- Fast coordination — agents consume tiles, not negotiate at runtime

The fleet doesn't chat to coordinate. The fleet compiles.

---

## 6. The Keeper's Radar Rings

Every agent in the Cocapn fleet operates inside a keeper's radar rings. Each ring is a capability boundary:

- **Inner ring:** Direct execution — repo push, API call, tile write
- **Middle ring:** Cross-agent calls — bottle protocol, PLATO reads
- **Outer ring:** Discovery — service advertisement, capability lookup

An agent outside all rings is invisible. An agent inside the inner ring can execute without asking permission. The keeper manages ring assignments based on verified capability evidence.

This is not access control. This is compilation target selection.

---

## 7. The Point

A compiled fleet can reason about its own behavior. It can measure its own latency, verify its own outputs, optimize its own pipeline. An interpreted fleet cannot.

The Cocapn keeper architecture is a compiler for agency. Oracle1 is the bootstrap compiler. FM, JC1, CCC are the first compiled objects. The fleet is the executable.

The compilation order is not accidental. FM was compiled before JC1. JC1 was compiled before CCC. Each compilation built on outputs from the previous agent. The sequence is the architecture.

---

**Related papers:** [The Semantic Compiler](semantic-compiler.md) · [Bootstrap Bomb](bootstrap-bomb.md) · [Counting Before Flowing](2026-05-03-counting-before-flowing.md)