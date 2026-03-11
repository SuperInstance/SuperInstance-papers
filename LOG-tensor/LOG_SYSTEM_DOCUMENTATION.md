# LEDGER-ORGANIZING-GRAPH (LOG) SYSTEM
## Pilot-Attention Tiles for Real-Time Intelligence

**Version:** v5.0 (Paradigm Shift: Tiles Induce Themselves)
**Generated via Kimi (Moonshot AI)**

---

## THE PARADIGM SHIFT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OLD WAY (Scratch Jr):
  Functions defined first → Then used
  Library selected → Then applied
  
NEW WAY (LOG):
  Functions INDUCE themselves from need
  Library is for RESEARCH and LUCID DREAMING
  In the moment, the LARGER AGENT distills

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Tiles find themselves as often as they are chosen from a library.
 The library is for research and lucid dreaming.
 In the moment, the larger agent it is distilling is the first instinct."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## CORE PRINCIPLES

### 1. CHANGE vs VALUES

```
VALUES are state (recorded for reference)
CHANGE is what's happening (what matters in real-time)

"A smell is only a smell if you were smelling something else before."

Monitoring VALUES = Static attention
Monitoring CHANGE = Dynamic attention (what pilots do)
```

### 2. UNEXPECTED RATE DETECTION

```
"So much of real-time is when you expect the results you read.
 You pay less attention and let the model infer the rest of the story.
 Scanning for UNEXPECTED RATES OF CHANGE is the basics of focus."
 
Focus = Σ(unexpected_rate_i × importance_i)
```

### 3. PILOT ATTENTION MODEL

```
┌─────────────────────────────────────────────────────────────────┐
│                 PILOT ATTENTION TIERS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ALWAYS MONITORED:                                              │
│    - Airspeed, Altitude, Heading, Attitude                     │
│    - Continuous scan, always in HOT memory                      │
│    - No change detection needed - always attended               │
│                                                                 │
│  CHANGE MONITORED:                                              │
│    - Fuel, Weather, Traffic, Engine temp                       │
│    - Only noticed when changing unexpectedly                    │
│    - Alert when rate > expected_rate + threshold               │
│                                                                 │
│  INFERRED:                                                      │
│    - Traffic intent, ATC intent, Remaining fuel                 │
│    - Not directly observed, inferred from context               │
│    - Model fills in the story                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. MEMORY TIERS

```
┌─────────────────────────────────────────────────────────────────┐
│  HOT (Context Window)                                          │
│    - Immediate attention                                       │
│    - All ALWAYS monitored items                                │
│    - Recent unexpected changes                                 │
│    - Capacity: ~100 items                                      │
│                                                                 │
│  MED (Recent, Quick Access)                                    │
│    - Recently accessed                                         │
│    - Promoted from COLD on access                              │
│    - Capacity: ~1000 items                                     │
│                                                                 │
│  COLD (Stored, Indexed)                                        │
│    - Indexed for retrieval                                     │
│    - Historical data, patterns                                 │
│    - Capacity: ~10000 items                                    │
│                                                                 │
│  ARCHIVE (Unstructured)                                        │
│    - "Might be important"                                      │
│    - No index, raw storage                                     │
│    - For future pattern discovery                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## WHY-TRACING (LOG)

### The Child's "Why" Algorithm

```
"Like a kid asking why and breaking apart the pieces until 
 the raw data come out and the guiding mathematics can be 
 inferred inductively through the variations of answer"

Algorithm:
  1. Start with result
  2. Ask "why" → follow edge backward
  3. Repeat until reaching raw data
  4. Collect variations from multiple traces
  5. INFER mathematics from variations
```

### Graph Structure

```
Result Node
    │
    ├── why → Intermediate Node (inference)
    │         │
    │         ├── why → Raw Data Node (sensor)
    │         │
    │         └── why → Another Raw Data Node
    │
    └── why → Another Intermediate
              │
              └── why → Raw Data Node

TRACE PATH: Result → Intermediate → Raw Data
INFERRED MATH: Pattern across multiple traces
```

---

## CHANGE DETECTION TILES (75 Total)

### By Category

| Category | Tiles | Focus |
|----------|-------|-------|
| CHANGE | 10 | Rate, delta, acceleration |
| MEMORY | 8 | Tier management, promotion |
| INDUCTION | 1 | Self-discovering tiles |
| PILOT | 12 | Pilot attention patterns |
| WHY_TRACE | 6 | Graph traversal |
| DISTILL | 10 | Agent distillation |
| INFERRED | 10 | Context inference |
| EMERGE | 10 | Self-organizing tiles |
| EXPERIENCE | 8 | Experience encoding |

### Key Tiles

```
┌─────────────────────────────────────────────────────────────────┐
│ TILE   │ CHANGE       │ ATTENTION │ DESCRIPTION               │
├─────────────────────────────────────────────────────────────────┤
│ dlt    │ delta        │ CHANGE    │ x₂ - x₁                   │
│ rte    │ rate         │ CHANGE    │ (x₂-x₁)/dt                │
│ acc    │ acceleration │ CHANGE    │ (v₂-v₁)/dt                │
│ jrk    │ jerk         │ CHANGE    │ (a₂-a₁)/dt                │
│ unx    │ unexpected   │ CHANGE    │ |rate - expected| > thresh│
│ thr    │ threshold    │ CHANGE    │ val > thresh              │
│ ALT    │ altitude     │ ALWAYS    │ Pilot always monitors     │
│ SPE    │ speed        │ ALWAYS    │ Pilot always monitors     │
│ HEA    │ heading      │ ALWAYS    │ Pilot always monitors     │
│ Fuel   │ fuel level   │ CHANGE    │ Notice when changing      │
│ Wthr   │ weather      │ CHANGE    │ Notice when changing      │
│ Trf    │ traffic      │ INFERRED  │ Inferred from context     │
│ ATC    │ ATC intent   │ INFERRED  │ Inferred from context     │
└─────────────────────────────────────────────────────────────────┘
```

---

## TILE INDUCTION SYSTEM

### Self-Organizing Functions

```python
class TileInductionSystem:
    """
    Tiles induce themselves from need, not library selection.
    
    "The distillation from the more intelligent agent learns
     WHY the current system is working, not THIS WORKED ELSEWHERE."
    """
    
    def induce_tile(self, need: str, context: Dict) -> str:
        # 1. Check if similar need already satisfied
        # 2. If not, DISTILL from larger agent
        # 3. Create new tile from distillation
        # 4. Register for future use
        pass
```

### Induction Examples

| Need Statement | Induced Tile |
|----------------|--------------|
| "delta for altitude" | `lambda p, c: c - p` |
| "rate for speed" | `lambda p, c, dt: (c-p)/dt` |
| "threshold for altitude" | `lambda v, t: v > t` |
| "unexpected change detection" | `lambda v, e, t: abs(v-e) > t` |

---

## EXPERIENCE ENCODING

### Chemistry vs Experience

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"The chemistry of the scent particle is not the artifact.
 The EXPERIENCE of learning what the chemistry did to the moment
 is what is encoded as function."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATA (Chemistry):
  - Raw sensor readings
  - Static values
  - What the sensor "sees"

EXPERIENCE (Function):
  - What was learned from data
  - The relationship between data and outcome
  - Imprinted during first encounters
  - Averages were still uncertain, temperatures set high

```

### Experience Tiles

| Tile | Data | Experience Learned |
|------|------|-------------------|
| LGHT | Light level | Time of day, mood association |
| SNDS | Sound level | Alertness, comfort patterns |
| TEMP | Temperature | Warmth feeling, activity patterns |
| HUMD | Humidity | Dryness perception, comfort |
| PRSH | Pressure | Weather perception, anticipation |

---

## DISTILLATION VS MIMICRY

### Wrong Approach (Mimicry)

```
"This worked in another system. Might be something to try."
→ Copies solution from elsewhere
→ May not understand WHY it works
→ Fragile, breaks in new contexts
```

### Right Approach (Distillation)

```
"Why does the current system work?"
→ Understands local structure
→ Learns the PRINCIPLE, not just the pattern
→ Robust, adapts to new contexts
→ Induces upgrades to Logistics-Organization-Graph
```

---

## THE LARGER AGENT

### First Instinct

```
In the moment, an agent's first instinct is NOT the library.

The library is for:
  - Research
  - Lucid dreaming
  - Background knowledge

The larger agent is for:
  - Immediate distillation
  - Context-specific function induction
  - Real-time adaptation

"Agents in tiles can be directed to research the library as part 
 of their bootstrapping their own system together to run the cell."
```

---

## UPGRADE PATH: Logistics-Organization-Graph

```
Componentized LOG:
  ├── Nodes (data + function)
  ├── Edges (why/how relationships)
  ├── Memory Tiers (HOT/MED/COLD/ARCHIVE)
  ├── Attention (ALWAYS/CHANGE/INFERRED)
  └── Induction (self-organizing functions)

Upgrades induced through:
  1. Distillation from larger agent
  2. Why-tracing through graph
  3. Variation analysis across traces
  4. Mathematics inference from patterns
```

---

## BENCHMARKS

```
┌─────────────────────────────────────────────────────────────────┐
│ BENCHMARK                  │ RESULT                           │
├─────────────────────────────────────────────────────────────────┤
│ Change detection (values)  │ O(1) per observation             │
│ Unexpected rate check      │ O(1) per observation             │
│ Why-trace depth d          │ O(d) graph traversal             │
│ Tile induction             │ O(context_size) distillation     │
│ Memory tier promotion      │ O(1) per access                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## FILES CREATED

| File | Description |
|------|-------------|
| `pilot_attention_tiles.json` | 75 tiles in 9 categories |
| `ledger_organizing_graph.py` | Complete LOG implementation |
| `LOG_SYSTEM_DOCUMENTATION.md` | This document |

---

## NEXT CYCLE QUESTIONS

1. How to optimize why-trace for common patterns?
2. Can we predict which tiles will induce?
3. How to balance library size vs distillation speed?
4. What is the optimal memory tier transition policy?
5. How to encode multi-modal experience (sight + sound + smell)?

---

*LOG System v5.0 - Pilot Attention Tiles*
*"Change is what's happening. Values are just state."*
