# Chapter 4: How It Works

**Under the hood, but readable.**

---

## The SMP Formula

Everything starts with a simple equation:

```
Seed + Model + Prompt = SMPbot
```

Three ingredients, one intelligent agent. Let's break down what each piece actually does.

### Seed: Your Data

The **seed** is your domain knowledge. It's what makes the bot specifically yours, not a generic assistant. In spreadsheet terms, a seed can be:

- **Cells**: A range of values you want to analyze
- **Columns**: Data categories you care about
- **Ranges**: Multi-dimensional datasets

The seed provides **context**—the world your bot operates in. Without it, you've got a smart assistant with no domain. With it, you've got a specialist that knows your specific problem space.

**Example**: If you're building a bot to detect fraudulent transactions, your seed is your transaction history—all the legitimate and fraudulent examples you've collected.

### Model: AI Loaded Once, Runs Everywhere

The **model** is the AI engine. Here's the key insight: **you load it once**, then it runs everywhere across your tiles.

This is different from traditional approaches where each component might need its own model. In SMP, the model is a shared resource that tiles tap into as needed. Think of it like a central power plant that distributes electricity to different buildings—each building gets what it needs, but there's only one generator.

**Why this matters**: Efficiency and consistency. You're not loading multiple models. You're not managing different AI versions. You've got one source of intelligence that gets applied precisely where needed.

### Prompt: What You Want Done

The **prompt** is your instruction. It tells the bot what task to perform on your seed data. In spreadsheet terms, this is like writing a formula—you're specifying the operation.

**Example**: "Given this transaction data (seed), determine if each transaction is fraudulent (prompt)."

Put it together, and you've got an intelligent agent that:

1. **Understands your domain** (via seed)
2. **Has access to AI intelligence** (via model)
3. **Knows what to do** (via prompt)

---

## Tile Types: The Hierarchy

Not all tiles are created equal. SMPtiles exist in a hierarchy based on complexity and capability.

### Scriptbots: Deterministic and Fast

At the bottom of the hierarchy are **Scriptbots**—the simplest, fastest tiles.

**Characteristics**:
- **Deterministic**: Same input always produces same output
- **No ML required**: Pure logic, rules, or lookups
- **Blazing fast**: Execute in microseconds
- **100% confidence**: They don't guess, they know

**When to use them**: Whenever you can express a task as a clear rule.

**Examples**:
```
Scriptbot 1: "Is this number greater than 100?"
Scriptbot 2: "Does this email match the regex pattern?"
Scriptbot 3: "Is this date within the last 30 days?"
```

**The power of Scriptbots**: They handle the easy cases instantly, reserving more expensive processing for ambiguous situations. It's like having a triage nurse who handles obvious cases before calling the specialist.

### SMPbots: ML-Enhanced Probabilists

Next up are **SMPbots**—these use machine learning to handle uncertainty.

**Characteristics**:
- **Probabilistic**: They deal in confidence, not certainties
- **Learn from data**: They improve with examples
- **Pattern recognition**: They spot trends humans might miss
- **Confidence scores**: They tell you how sure they are

**When to use them**: When you need pattern recognition but not full reasoning.

**Examples**:
```
SMPbot 1: "Is this sentiment positive? (confidence: 0.87)"
SMPbot 2: "Does this pattern match known fraud signatures? (confidence: 0.72)"
SMPbot 3: "Is this request safe to process? (confidence: 0.94)"
```

**The power of SMPbots**: They handle the middle ground—cases that require learning but not complex reasoning. They're your workhorses, processing the vast majority of real-world scenarios.

### Teacher Tiles: Full LLM Reasoning

At the top are **Teacher Tiles**—these invoke the full power of large language models.

**Characteristics**:
- **Complex reasoning**: Multi-step logic
- **Context understanding**: Nuance and ambiguity handled
- **Spawns sub-tiles**: Can create new tiles as needed
- **Expensive**: Use sparingly

**When to use them**: For edge cases, ambiguity, and complexity.

**Examples**:
```
Teacher Tile 1: "This request is unusual. Analyze context and decide."
Teacher Tile 2: "Conflicting signals detected. Synthesize and explain."
Teacher Tile 3: "Novel situation. Create new detection tile."
```

**The power of Teacher Tiles**: They're the safety net and the innovators. They handle what the simpler tiles can't, and they can spawn new tiles to handle recurring patterns they discover.

---

## Deconstruction: Breaking LLMs into Tiles

Here's where SMP gets genuinely innovative. We don't just use LLMs—we **deconstruct** them into inspectable, improvable components.

### The Problem with Monolithic LLMs

Traditional LLMs are black boxes:

```
Input → [175 Billion Parameters] → Output
```

You send in a prompt, magic happens inside, and an answer comes out. You can't see:

- **HOW** it decided
- **WHAT** it considered
- **WHY** it weighted factors that way
- **WHEN** it became confident

It's like asking a genius mathematician for the answer to a complex problem. You get the right answer, but you don't see the work.

### The SMP Solution: Decision Boundary Extraction

SMP deconstructs LLMs by extracting their **decision boundaries**—the lines they draw between categories.

**Key insight**: Intelligence isn't in the weights. It's in the decision boundaries learned during training. We can extract those boundaries as independent tiles.

**How it works**:

1. **Run the LLM** on diverse inputs
2. **Identify decision points**—where the model makes discriminating choices
3. **Extract the decision boundary**—what separates yes from no at that point
4. **Create a tile** that captures that specific decision
5. **Compose tiles** to approximate the full LLM behavior

**Concrete example**: Sentiment analysis

A monolithic LLM analyzing "I love this product but hate the price" would just give you an answer: "Mixed sentiment, slightly positive."

An SMP tile system would break this down:

```
Tile 1: Tokenize → ["I", "love", "this", "product", "but", "hate", "the", "price"]

Tile 2: Analyze "love" → POSITIVE (confidence: 0.95)
Tile 3: Analyze "but" → NEGATION_MARKER (confidence: 0.99)
Tile 4: Analyze "hate" → NEGATIVE (confidence: 0.93)

Tile 5: Negation Detector → "Negation at position 5, affects forward"
Tile 6: Apply Negation → Reduce negative score by 70%

Tile 7: Integrate → Positive (0.72), Negative (0.23), Neutral (0.05)
```

See the difference? You can see **exactly how** each decision was made. You can debug individual tiles. You can improve one without touching others.

### The Minimum Viable Tile

What's the simplest tile that still provides value? We call it the **Minimum Viable Tile (MVT)**—a binary discriminator that:

1. **Decides**: Yes or no on a specific question
2. **Explains**: Shows you what factors mattered
3. **Learns**: Improves from examples
4. **Composes**: Has clear inputs and outputs

**Example MVT**: Is confidence high enough to proceed without help?

```typescript
decide: (confidence: number) => confidence > 0.8
explain: () => "0.87 > 0.8 → proceed"
confidence: () => 1.0  // deterministic
```

Simple. Inspectable. Composable. And any complex computation can be built from MVTs composed together.

---

## Self-Supervised Learning: The Teacher-Student Loop

Here's the real magic: tiles can learn from the full LLM, gradually becoming experts in their domains.

### The Traditional Problem

In traditional knowledge distillation:

- **Large teacher model** teaches **small student model**
- Student is always **worse than** teacher
- Different architectures → information loss
- Output matching only, no reasoning transfer

### The SMP Breakthrough

SMP introduces **Self-Supervised Tile Learning (SSTL)**—where the teacher and student are the **same model**, just operating at different scales.

**The key insight**: Since tiles are structural components of the full model, they can achieve **perfect teacher performance** on their domains.

**How it works**:

```
┌─────────────────────────────────────────────────────────────┐
│              SELF-SUPERVISED LEARNING LOOP                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. DIAGNOSIS                                              │
│      Teacher identifies tile weak areas:                    │
│      "You fail when negation appears with technical terms"  │
│                                                             │
│   2. SYNTHETIC DATA GENERATION                              │
│      Teacher generates focused training:                    │
│      - 1000 examples of technical terms + negation          │
│      - Each includes reasoning trace                        │
│                                                             │
│   3. TILE TRAINING                                          │
│      Tile learns from teacher's reasoning:                  │
│      Input: (example, teacher_reasoning)                    │
│      Output: teacher_decision                               │
│                                                             │
│   4. VALIDATION                                             │
│      Teacher tests tile on synthetic + real data:           │
│      Performance: 67% → 94%                                 │
│                                                             │
│   5. ITERATION                                              │
│      Repeat until tile ≈ teacher on domain                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Why this works**:

1. **Architectural matching**: Tile is a structural copy, so it can match teacher's representations exactly
2. **Representation learning**: Tile learns teacher's internal thought process, not just outputs
3. **Adaptive counterfactuals**: Teacher generates exactly the examples tile needs, focused on weak areas
4. **Inspectable training**: Reasoning traces become training signal

**The result**: Tiles can become **indistinguishable from teacher** on their specialized domains.

### Convergence Guarantee

If a tile's local view captures sufficient information for its task, it will converge to teacher performance:

```
lim(k→∞) P_tile(y | x∈domain, θ_tile_k) = P_teacher(y | x, θ_full)
```

This is **not true** in traditional distillation, where the student asymptotically approaches but never reaches teacher performance.

**Why this matters**: You get the full model's capability in a specialized component, with massive speed and efficiency gains.

---

## The Schrödinger Thing: Peeking at Quantum Inference

Here's the mind-bending part that makes SMP truly different.

### The Quantum Metaphor

In quantum mechanics, a system exists in **superposition**—multiple states at once—until measured. Only then does it "collapse" to a definite state.

**Monolithic LLMs work the same way**:

```
Prompt → |ψ⟩ (superposition of reasoning paths)
       → [BLACK BOX]
       → Output (collapsed state)
```

You send a prompt, the model explores multiple reasoning paths internally, then collapses to a single output. But you never see the superposition—the reasoning process, the alternative paths considered, the confidence oscillations.

**You only get the cat, dead or alive.** You don't see the quantum dance.

### SMPtiles Peek Inside

SMPtiles are measurement devices that **peek at the quantum inference state** before full collapse.

```
Input → |ψ⟩ (full superposition)
       → Tile₁ measures: "Is sentiment positive?" → |ψ₁⟩
       → Tile₂ measures: "Is negation present?" → |ψ₂⟩
       → Tile₃ measures: "Confidence high enough?" → |ψ₃⟩
       → Integrated understanding → Output
```

Each tile performs a **partial measurement**—collapsing one dimension of the inference state while preserving others. You see the reasoning trajectory, not just the destination.

**Why "peek" not "observe"?**

"Observe" sounds final, like a physicist recording a measurement. "Peek" is mischievous—curious, exploratory, like catching a glimpse behind the curtain.

And that peek changes everything.

### The Incremental Collapse

**Monolithic LLM**: One big collapse, all-or-nothing.

**SMPtiles**: Incremental collapse, each tile revealing one aspect.

```
Monolithic:
Prompt → [MAGIC] → Output

SMP:
Prompt → [Sentiment peek] → partial state 1
       → [Negation peek] → partial state 2
       → [Confidence peek] → partial state 3
       → integrated understanding → Output
```

### Why This Matters

When you can see:
- How confidence wavers during reasoning
- Which patterns compete for attention
- Where the model explores multiple interpretations
- How features activate and propagate

**You stop seeing AI as magic and start seeing it as process.**

This is **inspectable AI**—not because we added explainability layers after the fact, but because we built visibility into the architecture from day one.

### The Memorable Explanation

Want to explain this to someone who's never taken a physics class?

> **Monolithic LLMs are like a magician performing in complete darkness.** You hear the incantations, feel the magic energy building, and then suddenly—a rabbit appears on your shoulder!
>
> **SMPtiles are like turning on the lights one by one.** Now you can see:
> > - The hat where the rabbit was hiding
> > - The sleeve where it was concealed
> > - The misdirection that made you look away
> > - The sleight of hand that did the work
>
> **The magic is still there.** But now you can appreciate the craft—and maybe even learn to do it yourself.

---

## Putting It All Together

Let's see how these pieces work together in a real scenario.

### Scenario: Fraud Detection Bot

**Seed**: Transaction history (10,000 legitimate, 500 fraudulent)

**Model**: GPT-4 (loaded once)

**Prompt**: "Analyze each transaction for fraud risk"

**Tile Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                  FRAUD DETECTION PIPELINE                    │
├─────────────────────────────────────────────────────────────┤
                                                             │
│   INPUT: New transaction T                                   │
│                                                             │
│   Tile 1 (Scriptbot): Basic Validation                       │
│   ────────────────────────────────                           │
│   - Is amount > 0?                           │
│   - Is account active?                        │
│   - Is currency supported?                    │
│   → If any fail: REJECT immediately                              │
│   → If all pass: Proceed to Tile 2                           │
│                                                             │
│   Tile 2 (Scriptbot): Geographic Check                       │
│   ─────────────────────────────────                           │
│   - Is location within usual pattern?                        │
│   - Is IP address consistent with account location?          │
│   → FAIL: Flag for review                                   │
│   → PASS: Proceed to Tile 3                                 │
│                                                             │
│   Tile 3 (SMPbot): Pattern Recognition                       │
│   ──────────────────────────────                             │
│   Input: Transaction features (amount, time, merchant, etc.) │
│   ML Model: Trained on historical fraud patterns            │
│   Output: {                                                  │
│     fraud_probability: 0.73,                                 │
│     confidence: 0.89,                                       │
│     risk_factors: ["unusual amount", "new merchant"]        │
│   }                                                          │
│                                                             │
│   Tile 4 (SMPbot): Confidence Check                          │
│   ──────────────────────────────                             │
│   Input: Tile 3 confidence                                  │
│   Decision: confidence < 0.8 → Request Teacher help         │
│   → 0.89 > 0.8 → Proceed to Tile 5                          │
│                                                             │
│   Tile 5 (SMPbot): Risk Scoring                              │
│   ───────────────────────────                               │
│   Input: Tile 3 fraud probability                           │
│   Decision:                                                 │
│     - < 0.3: LOW RISK → Auto-approve                         │
│     - 0.3 - 0.7: MEDIUM RISK → Flag for review              │
│     - > 0.7: HIGH RISK → Block and alert                    │
│   → 0.73 → HIGH RISK → Block                                │
│                                                             │
│   OUTPUT: Transaction blocked, fraud alert sent              │
│           Reasoning trace available for audit                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### What Happens Over Time

**Week 1**: Scriptbots handle 80% of transactions instantly. SMPbots handle the rest.

**Week 2**: Teacher Tile reviews false positives. Generates synthetic examples of edge cases.

**Week 3**: SMPbots retrain on synthetic data. Accuracy improves from 87% to 94%.

**Week 4**: New fraud pattern emerges. Teacher Tile detects it, creates new SMPbot specialized for this pattern.

**Month 6**: System has evolved. New tiles added. Old tiles refined. Performance at 98% with full audit trail.

**The key**: You didn't retrain the whole system. You improved individual tiles based on actual performance. That's the power of SMP.

---

## The Aha Moments

If you take nothing else from this chapter, remember these five insights:

### 1. Intelligence is in Decision Boundaries, Not Weights

Don't be impressed by parameter count. Look at the **decision boundaries**—what distinctions can the system make? SMP extracts those boundaries as inspectable tiles.

### 2. Partial Measurement Reveals Reasoning Trajectory

Don't accept the black box. Use tiles to **peek** at the inference process. See how confidence evolves, which features matter, where alternatives were considered.

### 3. Simple Tiles First, Complex Tiles Later

Don't start with LLMs for everything. Start with **Scriptbots** (deterministic rules), upgrade to **SMPbots** (ML) when errors appear, use **Teacher Tiles** (LLM) only for complexity.

### 4. Tiles Can Match Teacher Performance

Don't accept that students must always be worse than teachers. With architectural matching and representation learning, **tiles can reach teacher-equivalent performance** on their domains.

### 5. Inspectability Enables Engineering

Don't treat AI as alchemy. When you can see every decision, you can **debug like software**, **improve surgically**, and **understand completely**. That transforms AI from mystery to engineering discipline.

---

**Next Chapter**: Chapter 5 explores real-world applications—what you can build with SMPtiles and how they're changing industries from finance to healthcare.

---

*Word count: ~1,180*
