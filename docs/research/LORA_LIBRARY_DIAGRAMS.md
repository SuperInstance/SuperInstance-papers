# Library of Experts: Architecture Diagrams

**Companion to:** `LORA_LIBRARY_ARCHITECTURE.md`
**Date:** 2026-03-07

---

## Diagram 1: High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LIBRARY OF EXPERTS SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     POLLN COLONY COORDINATION                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │  PLINKO  │  │  A2A     │  │ HEBBIAN  │  │ STIGMERGY│          │   │
│  │  │  SELECTION│  │ PACKAGES │  │ LEARNING │  │ COORD    │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│        ┌───────────────────────────┼───────────────────────────┐           │
│        ▼                           ▼                           ▼           │
│  ┌──────────┐              ┌──────────┐              ┌──────────┐        │
│  │  AGENT 1 │              │  AGENT 2 │              │  AGENT 3 │        │
│  │          │              │          │              │          │        │
│  │ Task:    │              │ Task:    │              │ Task:    │        │
│  │ Generate │              │ Validate │              │ Optimize │        │
│  │ Code     │              │ Code     │              │ Code     │        │
│  │          │              │          │              │          │        │
│  │ LoRAs:   │              │ LoRAs:   │              │ LoRAs:   │        │
│  │ • Python │              │ • Python │              │ • Python │        │
│  │ • Syntax │              │ • Semant-│              │ • Debug  │        │
│  │ • Algo-  │              │   ics    │              │ • Perfor-│        │
│  │   rithms │              │ • Types  │              │   mance  │        │
│  └─────┬────┘              └─────┬────┘              └─────┬────┘        │
│        │                        │                        │              │
│        └────────────────────────┼────────────────────────┘              │
│                                 │                                       │
│        ┌────────────────────────┼────────────────────────┐              │
│        ▼                        ▼                        ▼              │
│  ┌──────────┐           ┌──────────┐            ┌──────────┐            │
│  │  BASE    │           │  LORA    │            │  LORA    │            │
│  │  MODEL   │◄──────────▶│  LIBRARY│◄───────────▶│  CACHE   │            │
│  │  < 1B    │           │          │            │          │            │
│  │  params  │           │ Storage: │            │ Fast     │            │
│  │          │           │ • 100+   │            │ access   │            │
│  │ Shared   │           │   LoRAs  │            │ to       │            │
│  │ by all   │           │ • Meta   │            │ recently │            │
│  │ agents   │           │   data   │            │ used     │            │
│  └──────────┘           └──────────┘            └──────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 2: LoRA Adapter Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LORA ADAPTER ANATOMY                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Base Model Layer (Frozen):                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  W₀ ∈ ℝ^(d×d) = 1,000,000 parameters (for d=1000)                   │   │
│  │                                                                       │   │
│  │  Standard: h = W₀x + b                                              │   │
│  │  With LoRA: h = W₀x + BAx + b                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  LoRA Adapter (Trainable):                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ΔW = B·A (rank r decomposition)                                     │   │
│  │                                                                       │   │
│  │  B ∈ ℝ^(d×r): 1000 × 8 = 8,000 parameters                           │   │
│  │  A ∈ ℝ^(r×d): 8 × 1000 = 8,000 parameters                           │   │
│  │  Total: 16,000 parameters (1.6% of base)                            │   │
│  │                                                                       │   │
│  │  Initialization:                                                     │   │
│  │    • A: Random normal (N(0, 0.01))                                  │   │
│  │    • B: Zeros                                                        │   │
│  │                                                                       │   │
│  │  Scaling: ΔW_scaled = (α/r) · BA                                     │   │
│  │    • α: Scaling hyperparameter (typically 16-64)                    │   │
│  │    • r: Rank (8-64)                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  Forward Pass:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  h = W₀x + ΔWx                                                         │   │
│  │    = W₀x + BAx                                                         │   │
│  │    = W₀x + B(Ax)                                                       │   │
│  │                                                                       │   │
│  │  Efficient computation:                                               │   │
│  │    1. Compute Ax: (r×d) × (d×1) = r operations                      │   │
│  │    2. Compute B(Ax): (d×r) × (r×1) = d operations                   │   │
│  │    Total: d + r vs d² for full layer                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 3: LoRA Composition

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LORA COMPOSITION                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Individual LoRAs:                                                         │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│  │  LoRA 1      │    │  LoRA 2      │    │  LoRA 3      │                 │
│  │  Python      │    │  Algorithms  │    │  Debugging   │                 │
│  │              │    │              │    │              │                 │
│  │  B₁ · A₁     │    │  B₂ · A₂     │    │  B₃ · A₃     │                 │
│  │  rank: 16    │    │  rank: 16    │    │  rank: 8     │                 │
│  │  weight: 0.5 │    │  weight: 0.3 │    │  weight: 0.2 │                 │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                 │
│         │                   │                   │                          │
│         └───────────────────┼───────────────────┘                          │
│                             │                                              │
│                             ▼                                              │
│  Linear Composition:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ΔW_total = w₁·B₁A₁ + w₂·B₂A₂ + w₃·B₃A₃                             │   │
│  │                                                                       │   │
│  │  Where w₁ + w₂ + w₃ = 1 (normalization)                              │   │
│  │                                                                       │   │
│  │  Final output: h = W₀x + ΔW_total·x                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Alternative: SVD Merging                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Compute combined: ΔW_temp = B₁A₁ + B₂A₂ + B₃A₃                   │   │
│  │  2. Factorize: ΔW_temp = UΣV^T (SVD)                                 │   │
│  │  3. Truncate: Keep top r singular values                            │   │
│  │  4. Result: ΔW_efficient = U[:, :r] · Σ[:r, :r] · V[:, :r]^T         │   │
│  │                                                                       │   │
│  │  Benefits:                                                            │   │
│  │    • Controls effective rank                                         │   │
│  │    • Reduces interference                                            │   │
│  │    • More stable composition                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 4: Training Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LORA TRAINING PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: Knowledge Extraction                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Large Model (GPT-4, Claude)                                        │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  Input: "Write a Python function for binary search"         │    │   │
│  │  │  Output: [Full solution with reasoning]                     │    │   │
│  │  │  Hidden States: [All layer activations]                    │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                           │                                        │   │
│  │                           ▼                                        │   │
│  │  Training Pair:                                                        │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  Input: "Write a Python function for binary search"         │    │   │
│  │  │  Target: Full solution from teacher                        │    │   │
│  │  │  Teacher States: Hidden states for distillation            │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  Repeat for 1K-10K examples per expertise                           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  PHASE 2: LoRA Distillation                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Base Model (< 1B params, frozen)                                    │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  W₀: Frozen pre-trained weights                            │    │   │
│  │  │  LoRA A, B: Trainable                                       │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                           │                                        │   │
│  │                           ▼                                        │   │
│  │  Forward Pass:                                                        │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  h_student = W₀x + BAx                                     │    │   │
│  │  │  h_teacher = TeacherModel(x)                              │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                           │                                        │   │
│  │                           ▼                                        │   │
│  │  Loss Computation:                                                    │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  L_total = α·L_task + (1-α)·L_distill + β·L_hidden          │    │   │
│  │  │                                                              │    │   │
│  │  │  Where:                                                       │    │   │
│  │  │    L_task = CrossEntropy(h_student, target)                 │    │   │
│  │  │    L_distill = KL(h_student, h_teacher)                    │    │   │
│  │  │    L_hidden = MSE(h_student_hidden, h_teacher_hidden)      │    │   │
│  │  │    α = 0.5, β = 0.2                                        │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                           │                                        │   │
│  │                           ▼                                        │   │
│  │  Backward Pass: (Only A, B receive gradients)                       │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  A ← A - lr·∇_A L_total                                    │    │   │
│  │  │  B ← B - lr·∇_B L_total                                    │    │   │
│  │  │  W₀ remains frozen                                         │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  Train for 5-10 epochs with early stopping                           │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  PHASE 3: Validation                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Test Set Evaluation:                                                │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  Metrics:                                                    │    │   │
│  │  │    • Task-specific accuracy                                 │    │   │
│  │  │    • Comparison to teacher model                            │    │   │
│  │  │    • Parameter count                                        │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                           │                                        │   │
│  │                           ▼                                        │   │
│  │  Interference Testing:                                                │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  Test with other active LoRAs:                              │    │   │
│  │  │    • Performance degradation                                │    │   │
│  │  │    • Subspace overlap                                       │    │   │
│  │  │    • Conflict identification                                │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  PHASE 4: Library Integration                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Save LoRA:                                                           │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  Files:                                                      │    │   │
│  │  │    • adapter.safetensors (A, B matrices)                    │    │   │
│  │  │    • metadata.json (expertise, performance, etc.)           │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                           │                                        │   │
│  │                           ▼                                        │   │
│  │  Index for Retrieval:                                                 │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  • Vector embeddings of expertise                           │    │   │
│  │  │  • ANN index for similarity search                          │    │   │
│  │  │  • Compatibility matrix                                     │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 5: A2A Package Flow for LoRA Swap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LORA SWAP PROTOCOL                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Agent State Change Detected:                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Agent 1: "Task requires debugging expertise"                        │   │
│  │  Current LoRAs: [Python, Syntax]                                     │   │
│  │  Needed: [Python, Debugging]                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  Create A2A Request Package:                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  {                                                                  │   │
│  │    id: "pkg-123",                                                   │   │
│  │    type: "lora-swap-request",                                       │   │
│  │    senderId: "agent-1",                                             │   │
│  │    receiverId: "colony",                                            │   │
│  │    payload: {                                                       │   │
│  │      currentComposition: {                                          │   │
│  │        loras: [                                                     │   │
│  │          { loraId: "python", weight: 0.6 },                         │   │
│  │          { loraId: "syntax", weight: 0.4 }                          │   │
│  │        ]                                                            │   │
│  │      },                                                             │   │
│  │      requestedChanges: [                                            │   │
│  │        { loraId: "debugging", action: "add", weight: 0.4 },         │   │
│  │        { loraId: "syntax", action: "remove" }                       │   │
│  │      ],                                                             │   │
│  │      reason: "Task requires debugging expertise"                    │   │
│  │    },                                                               │   │
│  │    parentIds: ["pkg-122"],                                          │   │
│  │    causalChainId: "chain-456",                                      │   │
│  │    layer: "DELIBERATE"                                              │   │
│  │  }                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  Colony Processes Request:                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Validate request                                                │   │
│  │  2. Check LoRA availability                                         │   │
│  │  3. Check for conflicts                                             │   │
│  │  4. Predict performance of new composition                          │   │
│  │  5. Approve or deny                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  Colony Responds:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  {                                                                  │   │
│  │    id: "pkg-124",                                                   │   │
│  │    type: "lora-swap-response",                                      │   │
│  │    senderId: "colony",                                              │   │
│  │    receiverId: "agent-1",                                           │   │
│  │    payload: {                                                       │   │
│  │      success: true,                                                 │   │
│  │      newComposition: {                                              │   │
│  │        loras: [                                                     │   │
│  │          { loraId: "python", weight: 0.6 },                         │   │
│  │          { loraId: "debugging", weight: 0.4 }                       │   │
│  │        ]                                                            │   │
│  │      },                                                             │   │
│  │      estimatedPerformance: 0.87,                                    │   │
│  │      swapTimeMs: 12                                                 │   │
│  │    },                                                               │   │
│  │    parentIds: ["pkg-123"],                                          │   │
│  │    causalChainId: "chain-456",                                      │   │
│  │    layer: "REFLEX"                                                  │   │
│  │  }                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  Agent Executes Swap:                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Receive response                                                │   │
│  │  2. Unload "syntax" LoRA                                            │   │
│  │  3. Load "debugging" LoRA                                           │   │
│  │  4. Apply new composition to model                                  │   │
│  │  5. Resume task processing                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 6: Emergent Ability Discovery

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMERGENT ABILITY DISCOVERY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: Test Individual LoRAs                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  LoRA A (Python Coding):                                             │   │
│  │    Task 1 (Code syntax):    0.92                                    │   │
│  │    Task 2 (Code execution):  0.88                                    │   │
│  │    Task 3 (Debugging):       0.15 ← Not specialized                  │   │
│  │                                                                      │   │
│  │  LoRA B (Algorithms):                                                │   │
│  │    Task 1 (Code syntax):    0.12                                    │   │
│  │    Task 2 (Code execution):  0.18                                    │   │
│  │    Task 4 (Optimization):    0.85                                    │   │
│  │                                                                      │   │
│  │  LoRA C (Debugging):                                                 │   │
│  │    Task 1 (Code syntax):    0.10                                    │   │
│  │    Task 3 (Debugging):       0.90                                    │   │
│  │    Task 5 (Error analysis):  0.82                                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  Step 2: Test All Combinations                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  A+B:                                                                 │   │
│  │    Task 1: 0.93 (slight improvement)                                 │   │
│  │    Task 4: 0.87 (transfer from A)                                    │   │
│  │    Task 5: 0.08 (no improvement)                                     │   │
│  │                                                                      │   │
│  │  A+C:                                                                 │   │
│  │    Task 1: 0.91 (stable)                                             │   │
│  │    Task 3: 0.92 (C dominates)                                        │   │
│  │    Task 5: 0.85 (A+C transfer) ← EMERGENT                            │   │
│  │                                                                      │   │
│  │  B+C:                                                                 │   │
│  │    Task 4: 0.86 (B dominates)                                        │   │
│  │    Task 5: 0.88 (C dominates)                                        │   │
│  │    Task 6: 0.75 (B+C synergy) ← EMERGENT                            │   │
│  │                                                                      │   │
│  │  A+B+C:                                                               │   │
│  │    Task 6: 0.94 (strong emergence) ← SUPER-ADDITIVE                  │   │
│  │    Task 7: 0.82 (novel capability) ← NOVEL EMERGENCE                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  Step 3: Analyze Emergence                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Task 5 Performance:                                                 │   │
│  │    A alone: 0.15                                                     │   │
│  │    C alone: 0.82                                                     │   │
│  │    A+C:     0.85 ← Small improvement (+0.03)                        │   │
│  │    Synergy: (0.85 - 0.82) / 0.82 = 3.7% ← WEAK SYNERGY              │   │
│  │                                                                      │   │
│  │  Task 6 Performance:                                                 │   │
│  │    A alone: 0.08                                                     │   │
│  │    B alone: 0.12                                                     │   │
│  │    C alone: 0.10                                                     │   │
│  │    B+C:     0.75 ← STRONG EMERGENCE                                 │   │
│  │    Synergy: (0.75 - 0.12) / 0.12 = 525% ← STRONG SYNERGY            │   │
│  │                                                                      │   │
│  │  Task 7 Performance:                                                 │   │
│  │    A alone: 0.05                                                     │   │
│  │    B alone: 0.08                                                     │   │
│  │    C alone: 0.06                                                     │   │
│  │    A+B+C:   0.82 ← NOVEL EMERGENCE                                 │   │
│  │    None of the individual LoRAs can do Task 7!                     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│                                    ▼                                       │
│  Step 4: Catalog Emergent Abilities                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Emergent Ability 1: "Code Optimization with Debugging"             │   │
│  │    Source: B+C (Algorithms + Debugging)                             │   │
│  │    Tasks: 6 (Optimization + error analysis)                        │   │
│  │    Performance: 0.75                                                │   │
│  │    Synergy: 525%                                                    │   │
│  │    Reusability: High (transfers to 4+ tasks)                       │   │
│  │                                                                      │   │
│  │  Emergent Ability 2: "Full-Stack Debugging"                         │   │
│  │    Source: A+B+C (Python + Algorithms + Debugging)                  │   │
│  │    Tasks: 7 (End-to-end debugging workflow)                        │   │
│  │    Performance: 0.82                                                │   │
│  │    Novel: Yes (no individual LoRA can do this)                     │   │
│  │    Reusability: Medium (specific to debugging)                     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 7: Comparison to Alternatives

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE COMPARISON                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Traditional Fine-Tuning:                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Single Large Model (175B params)                                    │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  Task A: Fine-tune ALL parameters → Model A (175B)          │    │   │
│  │  │  Task B: Fine-tune ALL parameters → Model B (175B)          │    │   │
│  │  │  Task C: Fine-tune ALL parameters → Model C (175B)          │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  Total: 3 × 175B = 525B parameters                                  │   │
│  │  Switching: Load entire new model                                   │   │
│  │  Composition: Not possible                                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Mixture of Experts (MoE):                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Router + Expert Networks                                           │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │                                                              │    │   │
│  │  │  Input → Router → [Expert 1, Expert 2, ..., Expert N]      │    │   │
│  │  │                      │                                       │    │   │
│  │  │                      ▼                                       │    │   │
│  │  │                 Selected Expert Output                      │    │   │
│  │  │                                                              │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  Total: Router (small) + N × Expert (large)                         │   │
│  │  Switching: Router selection                                        │   │
│  │  Composition: One expert at a time                                  │   │
│  │  Limitation: Experts don't interact                                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  LoRA Library (Our Approach):                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Base Model + LoRA Adapters                                         │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │                                                              │    │   │
│  │  │  Base Model (< 1B) + [LoRA 1, LoRA 2, ..., LoRA M]        │    │   │
│  │  │                        │                                    │    │   │
│  │  │                        ▼                                    │    │   │
│  │  │                 Merged Output                               │    │   │
│  │  │                                                              │    │   │
│  │  │  Agent 1: Base + [LoRA 1, LoRA 3]                            │    │   │
│  │  │  Agent 2: Base + [LoRA 2, LoRA 4]                            │    │   │
│  │  │  Agent 3: Base + [LoRA 1, LoRA 2, LoRA 5]                    │    │   │
│  │  │                                                              │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  Total: Base (1B) + M × LoRA (0.016B each) = 1B + 0.16M            │   │
│  │  Switching: Swap LoRAs (< 1ms)                                     │   │
│  │  Composition: Multiple LoRAs simultaneously                         │   │
│  │  Advantage: Emergent capabilities                                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 8: Memory Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GPU MEMORY LAYOUT                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  System Memory (16GB GPU Example):                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Base Model (1B params, fp16): 2GB                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │ ████████████████████████████████████████████████████████   │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  Activations (batch=1, seq=2048): 4GB                               │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │ ████████████████████████████████████████████████████████   │    │   │
│  │  │ ████████████████████████████████████████████████████████   │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  LoRA Cache (5 LoRAs, rank=16): 160MB                              │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │ ████  LoRA 1: Python                                         │    │   │
│  │  │ ████  LoRA 2: Algorithms                                     │    │   │
│  │  │ ████  LoRA 3: Debugging                                      │    │   │
│  │  │ ████  LoRA 4: Creative Writing                               │    │   │
│  │  │ ████  LoRA 5: Math                                           │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  KV Cache (2048 tokens): 2GB                                        │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │ ████████████████████████████████████████████████████████   │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  Agent States (10 agents): 100MB                                   │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │ ██   Agent 1-10 states                                        │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  Overhead: 7.74GB                                                   │   │
│  │  Available for growth: ~1GB                                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  LoRA Swap Operation:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  1. Check cache: LoRA 6 already loaded?                             │   │
│  │     If yes: Skip to step 3                                          │   │
│  │     If no: Continue to step 2                                      │   │
│  │                                                                      │   │
│  │  2. Load LoRA 6 from disk to GPU (32MB, ~5ms)                      │   │
│  │     - Check available memory                                        │   │
│  │     - If full, evict least recently used LoRA                       │   │
│  │     - Copy LoRA matrices to GPU                                     │   │
│  │                                                                      │   │
│  │  3. Update agent composition                                        │   │
│  │     - Remove LoRA 2 from agent's active list                       │   │
│  │     - Add LoRA 6 to agent's active list                            │   │
│  │                                                                      │   │
│  │  4. Recompute merged weights                                        │   │
│  │     - ΔW_new = Σ w_i · (B_i · A_i)                                  │   │
│  │     - Apply to model                                               │   │
│  │                                                                      │   │
│  │  Total time: ~10-15ms                                               │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 9: Training Scaling Laws

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SCALING LAWS                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Performance vs Data Size:                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Performance                                                         │   │
│  │     ▲                                                                │   │
│  │  1.0│                                    ╭────────────               │   │
│  │     │                                  ╱                            │   │
│  │  0.8│                            ╭─────╯                             │   │
│  │     │                        ╱─╯                                      │   │
│  │  0.6│                  ╭────╯                                         │   │
│  │     │              ╱─╯                                                │   │
│  │  0.4│        ╭────╯                                                   │   │
│  │     │    ╱─╯                                                          │   │
│  │  0.2│ ───╯                                                            │   │
│  │     │                                                                  │   │
│  │  0.0└──────────────────────────────────────────────────▶               │   │
│  │      100   1K    10K   100K    1M    10M                              │   │
│  │                       Training Examples                               │   │
│  │                                                                      │   │
│  │  Formula: P ≈ a · log(data_size) + b                                │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Performance vs LoRA Rank:                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Performance                                                         │   │
│  │     ▲                                                                │   │
│  │  1.0│                              ╭────                              │   │
│  │     │                            ╱    ╰─                           │   │
│  │  0.8│                        ╭───╯       ╰──                        │   │
│  │     │                    ╱─╯              ╰─                      │   │
│  │  0.6│              ╭────╯                   ╰─                    │   │
│  │     │         ╱───╯                          ╰─                  │   │
│  │  0.4│   ╭───╯                                  ╰─                │   │
│  │     │ ──╯                                        ╰─              │   │
│  │  0.2│╱                                              ╰─           │   │
│  │     │                                                  ╰─        │   │
│  │  0.0└───────────────────────────────────────────────────────▶      │   │
│  │      4    8    16   32    64    128    256                         │   │
│  │                           LoRA Rank                              │   │
│  │                                                                      │   │
│  │  Formula: P ≈ c · sqrt(rank) / (1 + sqrt(rank))                   │   │
│  │          (diminishing returns after rank ~ 32)                     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Optimal Rank Selection:                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  Task Complexity × Data Availability                                │   │
│  │                                                                      │   │
│  │  High Data, Low Complexity:  rank = 8                              │   │
│  │  High Data, High Complexity: rank = 16-32                          │   │
│  │  Low Data, Low Complexity:   rank = 4                              │   │
│  │  Low Data, High Complexity:  rank = 8-16 (use distillation)        │   │
│  │                                                                      │   │
│  │  General Rule: rank ≈ min(64, sqrt(base_model_dim))                │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*End of Diagrams*
