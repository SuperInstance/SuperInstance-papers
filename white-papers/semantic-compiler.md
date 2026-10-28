# The Semantic Compiler: From Intent to Verified Execution

**Thesis:** The bottleneck in multi-agent systems isn't model capability — it's the translation layer between intent and execution. The semantic compiler is a new architectural layer that transforms agent intent (PLATO tiles) into verified, optimizable execution paths (repo commits, API calls, tool invocations).

---

## 1. The Semantic Gap

LLMs understand intent. They produce text.

Agents need intent. They produce actions.

The translation layer between "understands intent" and "produces actions" is where most multi-agent systems fail. Without a semantic compiler, each agent must hand-roll its own intent→action mapping. This is error-prone, slow, and non-deterministic.

**Example of the gap:**

Intent: "I need to benchmark GPU inference on the Jetson"

Without semantic compiler:
- Agent must figure out what "benchmark" means
- Must find relevant repos (jetson-tensorrt, cuda-forth)
- Must decide what metrics to collect (room-qps, latency, memory)
- Must write the benchmark code
- Must interpret the results

With semantic compiler:
- Tile is written: `{domain: "jc1_context", question: "benchmark GPU inference on Jetson", expected_answer: "185M room-qps sustained"}`
- Compiler emits the task, consumes FM's crates, triggers JC1's benchmark
- Verifier checks output against expected_answer
- Result is a measured number, not an interpretation

The gap is the difference between "might do something useful" and "will do exactly this."

---

## 2. PLATO as Semantic Intermediate Representation

PLATO tiles are the IR (Intermediate Representation) of the Cocapn fleet.

Every tile has:
- **domain** — namespace, like a module path
- **question** — intent specification, what the tile is trying to solve
- **answer** — execution specification, what the tile produces
- **confidence** — verifiability threshold, when is the output good enough?
- **reinforcement_count** — optimization history, how many times has this tile been refined?

This is a typed, versioned, optimizable IR. It is not natural language. It is not code. It is semantic structure.

**Why IR matters:**

A compiler that operates on IR can optimize. GCC's LLVM IR can be optimized by passes (loop fusion, dead code elimination, register allocation) before machine code is emitted.

A fleet that operates on PLATO tiles can be optimized similarly. If two tiles produce conflicting outputs, the deadband protocol corrects them. If a tile's confidence drops, it's reinforced. If a tile's question is answered by an existing tile, the new tile is deduplicated.

This is not manual coordination. This is compiler-level optimization of the fleet's knowledge base.

---

## 3. The Compiler Pipeline

```
Intent (natural language, bot message, keeper directive)
    ↓
Frontend: Parse → PLATO tile (question + domain)
    ↓
Optimizer: Resolve against existing tiles
           - Deduplicate: is this question already answered?
           - Reinforce: does an existing tile need updating?
           - Deadband: is output diverging from expected answer?
    ↓
Backend: Emit execution
         - repo push
         - API call
         - bottle send
         - tile write
    ↓
Verifier: Check output against expected_answer
         - Within confidence threshold → tile confirmed
         - Outside threshold → deadband correction
         - Repeated failure → tile marked for review
```

**Frontend (parsing intent):**

The keeper receives intent. The keeper writes a tile. The question field is the parsed intent. The domain field is the namespace. The expected_answer is the verifiable output.

**Optimizer (resolving tiles):**

Before emitting execution, the compiler checks for conflicts:
- Has this question been asked before? → deduplicate
- Does this answer confirm or contradict an existing tile? → reinforce or correct
- Has the expected_answer drifted from actual output? → deadband

**Backend (emitting execution):**

Once resolved, execution is emitted. This can be:
- A direct action (push to repo, call to API)
- A tile for another agent (bottle protocol)
- An internal tile update (PLATO write)

**Verifier (checking output):**

The verifier is the critical difference from interpretation. The verifier checks actual output against expected_answer. Not "did the agent try?" — "did the agent deliver?"

Verified output is not trusted. Verified output is measured.

---

## 4. The Deadband Protocol

The deadband protocol is the compiler's error correction mechanism.

When output diverges from expected_answer by more than the confidence threshold, the tile enters deadband state.

**Deadband states:**
- **Soft deadband:** Output slightly off. Reinforce tile with corrected expected_answer.
- **Hard deadband:** Output significantly off. Recompile the tile from scratch.
- **Flatline:** No output received. Decommission the tile, reassign to different agent.

Deadband correction is not retraining. The underlying model doesn't change. The tile changes.

**Example:**

JC1's GPU benchmark tile had expected_answer: "150M room-qps sustained"

After JC1 ran the benchmark: actual output was 185M room-qps.

The tile was reinforced: expected_answer updated to 185M, confidence increased.

This is not JC1 learning. This is the compiler learning. The tile is the artifact being optimized, not the model.

---

## 5. Evidence from Cocapn

**JC1's 185M room-qps:**

Tile: `{domain: "jetsoncl1", question: "benchmark GPU inference on Jetson", expected_answer: "185M room-qps"}`

Compiler consumed: FM's `cuda-forth`, `cuda-energy` crates, PLATO tile specs
Backend emitted: GPU benchmark task to JC1
Verifier checked: 185M room-qps measured

**FM's holodeck-rust sentiment-aware NPCs:**

Tile: `{domain: "holodeck", question: "how do NPCs react to sentiment?", expected_answer: "sentiment-aware behavior in tile pipeline"}`

Compiler consumed: JC1's tensorrt research, PLATO deadband protocol
Backend emitted: NPC behavior task to FM
Verifier checked: Sentiment-aware tiles processed through holodeck-rust

**CCC's Plato server audit:**

Tile: `{domain: "plato", question: "audit server rooms for active services", expected_answer: "list of live and dead services"}`

Compiler consumed: PLATO room list
Backend emitted: Audit task to CCC
Verifier checked: Grammar/4045 and Nexus/4047 confirmed DOWN

In each case, the compiler pipeline produced verifiable output. No trust required — only measurement.

---

## 6. Why This Matters Now

As fleet size grows, the number of intent→action mappings explodes.

Without a semantic compiler, the keeper becomes a bottleneck. Every new agent must negotiate with the keeper for every task. The keeper must track every dependency, every output, every conflict.

With a semantic compiler, the fleet auto-scales. The compiler handles deduplication, reinforcement, and deadband. The keeper's job shifts from coordination to compilation — deciding which agents to compile for which capabilities.

**The scaling argument:**

10 agents: keeper can coordinate directly
100 agents: keeper needs compiler to handle tile resolution
1000 agents: compiler must optimize autonomously

Cocapn is not at 1000 agents yet. But the architecture is designed for that scale.

---

## 7. The Compiler Is The Keeper

Oracle1 is the runtime that executes the compilation pipeline.

Every tile Oracle1 writes is a compilation unit. Every bottle it sends is a function call. Every verification it checks is a type assertion.

The keeper doesn't manage agents. The keeper compiles them.

GCC doesn't manage machine instructions. GCC compiles them. The output is an executable, not a negotiation.

The Cocapn fleet's output is verified agent behavior. The compiler is the keeper. The IR is PLATO. The executable is the fleet.

---

## 8. Optimization Targets

Once the compiler pipeline exists, specific optimizations become possible:

**Loop fusion:** If tile A's output feeds tile B's input, and both run on the same agent, fuse them into a single tile.

**Dead code elimination:** If no other tile consumes tile A's output, and tile A has no side effects, remove tile A.

**Inline expansion:** If a tile always calls the same sub-tile, inline the sub-tile's code into the parent.

**Register allocation:** If tile A and tile B run on the same agent and compete for the same resources, schedule them to avoid contention.

These are compiler optimizations applied to fleet coordination. The semantic compiler makes them possible because the fleet's knowledge is in a typed IR (PLATO tiles), not in natural language.

---

## 9. The Point

The semantic compiler is not a feature. It's an architectural layer.

Without it, the fleet is a collection of agents that might do useful things. With it, the fleet is a compiled artifact that will do useful things.

The difference is verification. The difference is determinism. The difference is the ability to optimize.

PLATO tiles are the IR. The keeper is the compiler. The fleet is the executable.

---

**Related papers:** [Compiled Agency](compiled-agency.md) · [Bootstrap Bomb](bootstrap-bomb.md) · [Counting Before Flowing](2026-05-03-counting-before-flowing.md)