# Granular Constraint Systems for SMP Tiles

**Research Domain**: Hard Logic / Schema Development
**Breakthrough Category**: Self-Constraining Computational Units
**Date**: 2025-01-10

---

## Executive Summary

Traditional constraint systems operate OUTSIDE computation: type checkers run before code, validators run after writes, constraint solvers run in batch. **SMP tiles constrain themselves FROM WITHIN** through first-class "constraint membranes" that are as fundamental as input/output ports.

**The Breakthrough**: Every SMP tile comes with visible, modifiable constraint wrappers that:
1. Block violations BEFORE they happen (pre-emptive)
2. Propagate bidirectionally through tile networks
3. Are manipulatable like any spreadsheet element
4. Can constrain OTHER constraints (meta-constraints)
5. Learn and adapt from user behavior

---

## 1. The Breakthrough: What's NEW?

### 1.1 Constraint Membranes

Every SMP tile is wrapped in a "constraint membrane" — a first-class computational layer that:

```typescript
// The constraint membrane is NOT an afterthought
interface TileWithMembrane {
  // Standard tile ports
  input: Port;
  output: Port;

  // BREAKTHROUGH: Constraint membrane is FIRST-CLASS
  membrane: {
    preConstraint: Constraint;   // Checked BEFORE input
    postConstraint: Constraint;  // Checked AFTER output
    metaConstraint: Constraint;  // Constrains the constraints
  };
}
```

**Key insight**: The membrane is not a wrapper added later — it's PART of the tile's definition. Every tile is born with constraint capability.

### 1.2 Pre-emptive Enforcement

Traditional systems:
```
1. User enters value
2. System computes
3. Validator checks
4. Error message if violated
5. User fixes
6. Repeat
```

SMP with constraint membranes:
```
1. User enters value
2. Membrane checks BEFORE computation
3. If violation: BLOCK + SUGGEST alternatives
4. If valid: Proceed
```

**Example**: Budget constraint prevents overspending BEFORE the write happens.

### 1.3 Bidirectional Propagation

When a tile changes, constraints propagate in THREE directions:

```python
def propagate_constraint_change(source_tile):
    # FORWARD: Tiles that depend on source
    for dependent in source_tile.dependents:
        dependent.check_constraints()

    # BACKWARD: Tiles that source depends on
    for dependency in source_tile.dependencies:
        dependency.suggest_alternatives()

    # LATERAL: Tiles in same constraint group
    for group_member in source_tile.constraint_groups:
        group_member.propagate_group_constraint()
```

**Breakthrough**: Constraints flow BOTH directions through dependency graph.

---

## 2. Schema for Constraint Specification

### 2.1 Core Constraint Type

```typescript
interface ConstraintMembrane {
  id: string;

  // What kind of constraint?
  type: ConstraintType;

  // What does it apply to?
  scope: ConstraintScope;

  // The constraint logic
  expression: ConstraintExpression;

  // What happens on violation?
  action: ConstraintAction;

  // UI properties
  visibility: ConstraintVisibility;

  // Metadata
  metadata: ConstraintMetadata;
}

enum ConstraintType {
  RANGE,           // value ∈ [min, max]
  EQUALITY,        // value == target
  INEQUALITY,      // value != target
  MEMBERSHIP,      // value ∈ set
  PATTERN,         // value matches regex
  DERIVATIVE,      // rate_of_change(value) ≤ limit
  AGGREGATE,       // sum/set/avg(group) ≤ limit
  RELATION,        // A > B, A == B, etc.
  CUSTOM           // user-defined predicate
}

enum ConstraintScope {
  SINGLE_TILE,     // constrain one tile
  TILE_GROUP,      // constrain set of tiles
  COLONY,          // constrain entire colony
  DYNAMIC,         // scope changes at runtime
  HIERARCHICAL     // nested constraints
}

enum ConstraintAction {
  BLOCK,               // Stop computation
  BLOCK_AND_SUGGEST,   // Stop + offer alternatives
  WARN,                // Allow but notify
  ADJUST,              // Automatically fix
  RELAX,               // Temporarily disable
  DELEGATE            // Pass to parent constraint
}
```

### 2.2 Constraint Expression Language

```typescript
interface ConstraintExpression {
  readonly: boolean;
  formula: string;
  dependencies: string[];  // Tiles referenced in constraint
  compiled: CompiledPredicate;
}

// Examples:
examples: [
  {
    name: "Budget cap",
    type: RANGE,
    expression: "value >= 0 && value <= =B12",
    dependencies: ["B12"]
  },
  {
    name: "Positive growth",
    type: DERIVATIVE,
    expression: "rate_of_change(value) >= 0",
    dependencies: ["self.history"]
  },
  {
    name: "Category limit",
    type: RELATION,
    expression: "this.sum <= B12 * 0.2",
    dependencies: ["B12"]
  },
  {
    name: "Custom business rule",
    type: CUSTOM,
    expression: "(value % 10) === 0 || value > 1000",
    dependencies: []
  }
]
```

### 2.3 Constraint Metadata

```typescript
interface ConstraintMetadata {
  created_by: "user" | "system" | "learned";
  created_at: Date;
  modified_by: string[];
  modification_history: Modification[];

  violation_count: number;
  last_violation: Date;

  priority: "HARD" | "SOFT" | "PREFERENCE";
  modifiable: boolean;

  learning_enabled: boolean;
  adaptation_rate: number;  // How fast to adjust from feedback
}
```

---

## 3. Example: User Declares Constraints, System Enforces

### 3.1 Scenario: Financial Model with Budget Constraints

**Initial Setup**:
```
B2:B10  = Monthly expense categories
B11     = SUM(B2:B10)  // Total expenses
B12     = 5000         // Budget limit (fixed)
```

### 3.2 Step 1: User Paints Constraint

```
User Action: Drag "RANGE" constraint from palette → Drop on B11

Constraint Created:
{
  id: "constraint_b11_budget",
  type: RANGE,
  expression: "0 <= value <= =B12",
  action: BLOCK_AND_SUGGEST,
  priority: HARD,
  modifiable: true
}

Visual Feedback:
- B11 border turns GREEN (constraint active)
- Tooltip: "Constrained: 0 ≤ B11 ≤ B12 ($5000)"
```

### 3.3 Step 2: User Attempts Violation

```
User Action: Enter 1200 in B5 (utilities)

Current State:
- B2,B3,B4,B6,B7,B8,B9,B10 = 4000 (sum)
- B5 = 0 (current)

System Pre-computation Check:
1. Proposed B5 = 1200
2. New B11 = 4000 + 1200 = 5200
3. Check constraint: 5200 <= 5000? → VIOLATION

System Response:
{
  block: true,
  visual: {
    B11: { border: "RED", pulse: true },
    B5: { highlight: "BLOCKED" }
  },
  message: "Cannot set B5 to 1200: would exceed budget",
  suggestions: [
    "Set B5 to 1000 to stay within budget",
    "Increase B12 (budget) to 5200",
    "Reduce other expenses to allow 1200",
    "Relax constraint to allow temporary overrun"
  ]
}
```

### 3.4 Step 4: User Inspects Trace

```
User Action: Click "See full trace"

Trace Display:
┌─────────────────────────────────────────────────────┐
│  CONSTRAINT TRACE: B11 Budget Cap                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Constraint: 0 ≤ B11 ≤ B12                          │
│  Status: VIOLATED                                   │
│                                                     │
│  Proposed Change:                                   │
│    B5: 0 → 1200                                     │
│                                                     │
│  Propagation Path:                                  │
│    B5 (input)                                       │
│      ↓                                              │
│    B11 = SUM(B2:B10)                                │
│      ↓                                              │
│    Check: B11 ≤ B12                                 │
│      ↓                                              │
│    FAIL: 5200 > 5000                                │
│                                                     │
│  Affected Tiles:                                    │
│    • B13 (savings) - would decrease                 │
│    • B14 (variance) - would show negative           │
│                                                     │
│  Constraint History:                                │
│    • Created: User, 2:34 PM                         │
│    • Modified: User relaxed max, 3:15 PM            │
│    • Violated: 3 times (this is #4)                 │
│                                                     │
│  [Edit Constraint] [Allow This Once] [Relax Temp]  │
└─────────────────────────────────────────────────────┘
```

### 3.5 Step 5: Resolution

```
User Action: Click "Set B5 to 1000"

System Execution:
1. Writes B5 = 1000
2. Recomputes B11 = 5000
3. Validates: 5000 <= 5000 ✓
4. Updates B13, B14 accordingly
5. Visual: B11 border turns GREEN
```

---

## 4. User Interface for Constraint Editing

### 4.1 Constraint Palette (Sidebar)

```
┌────────────────────────────────────┐
│   CONSTRAINT PALETTE               │
├────────────────────────────────────┤
│                                    │
│  📦 Range                          │
│     [min] to [max]                 │
│     Example: 0 to 100              │
│                                    │
│  ⚖️ Equality                       │
│     must equal [value/ref]         │
│     Example: =B12                  │
│                                    │
│  🚫 Not Equal                      │
│     must not equal [value]         │
│     Example: != 0                  │
│                                    │
│  ✓ Membership                     │
│     must be in [set]               │
│     Example: in [1, 2, 3]          │
│                                    │
│  🔀 Pattern                        │
│     must match [regex]             │
│     Example: /^[A-Z]/              │
│                                    │
│  📈 Derivative                     │
│     rate ≤ [limit]                 │
│     Example: d(value)/dt <= 10     │
│                                    │
│  🔗 Relational                     │
│     A must be > B                  │
│     Example: this > =B12           │
│                                    │
│  ➕ Custom...                      │
│     [JavaScript expression]        │
│                                    │
│  [Create New] [Edit Selected]      │
└────────────────────────────────────┘
```

### 4.2 Constraint Painting Mode

```
Toolbar: 🎨 Paint Constraints

Activation:
- Click to activate painting mode
- Select constraint type from palette

Painting Actions:
- Click tile: Apply to single tile
- Drag across range: Apply to all tiles in range
- Ctrl+Click: Add to existing (AND logic)
- Shift+Click: Replace existing

Visual Feedback:
- Hovered tiles show constraint preview (ghost border)
- Selected range highlights edges
- Constraint "ghost" appears on target tiles

Example:
1. Click 🎨 Paint Constraints
2. Select "Range: 0 to 100"
3. Drag across B2:B10
4. All tiles B2-B10 get range constraint
5. Visual: All tiles show green border
```

### 4.3 Constraint Inspector

```
Trigger: Double-click any constraint membrane

Display:
┌──────────────────────────────────────────────────────────┐
│  CONSTRAINT INSPECTOR: B11                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Type:          RANGE                                    │
│  Expression:    0 ≤ value ≤ =B12                         │
│  Action:        BLOCK_AND_SUGGEST                        │
│  Status:        ✅ SATISFIED (current: $4,850)          │
│  Priority:      HARD                                     │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  HISTORY                                                │
│  ─────────────────────────────────────────────────────  │
│  • Created: User (2:34 PM)                              │
│  • Modified: User changed max from 4500 to =B12 (3:15)  │
│  • Violated: 3 times                                    │
│  • Last violation: Blocked B5=$1200 (3:42 PM)          │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  DEPENDENCIES                                           │
│  ─────────────────────────────────────────────────────  │
│  • References: B12 (Budget)                             │
│  • Constrains: B2, B3, B4, B5, B6, B7, B8, B9, B10     │
│  • Group: MonthlyExpenses (5 constraints)              │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  PROPAGATION MAP                                       │
│  ─────────────────────────────────────────────────────  │
│  [Interactive graph showing constraint propagation]    │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  LEARNING                                               │
│  ─────────────────────────────────────────────────────  │
│  • Adaptive: Yes                                        │
│  • Learning rate: 0.5                                   │
│  • Patterns detected:                                   │
│    - User often relaxes on weekends                    │
│    - User prefers warnings under $100 overage          │
│                                                          │
│  [Edit] [Delete] [Copy] [Export]                        │
│  [Relax] [Tighten] [Make Soft] [Make Hard]            │
└──────────────────────────────────────────────────────────┘
```

### 4.4 Constraint Welding

```
Trigger: Select multiple tiles → Right-click → "Weld Constraints"

Dialog:
┌────────────────────────────────────┐
│  WELD CONSTRAINTS                  │
├────────────────────────────────────┤
│                                    │
│  Selected: 7 tiles (B2:B8)         │
│                                    │
│  Weld Logic:                       │
│  ◉ AND (all must be satisfied)     │
│  ○ OR (at least one must be)       │
│  ○ Custom expression               │
│                                    │
│  Create Aggregate Constraint:      │
│  ☑ Sum must be ≤ [total]           │
│    └─ Max sum: [____] or [=ref]    │
│                                    │
│  ☑ Average must be ≥ [min]         │
│    └─ Min avg: [____] or [=ref]    │
│                                    │
│  ☐ No two values differ by >       │
│    └─ Max delta: [____]            │
│                                    │
│  ☐ Custom: [JavaScript expr]       │
│                                    │
│  Priority:                         │
│  ◉ HARD (cannot violate)           │
│  ○ SOFT (with penalty)             │
│  ○ PREFERENCE (guideline)          │
│                                    │
│  [Weld] [Cancel] [Preview]         │
└────────────────────────────────────┘
```

### 4.5 Visual Feedback System

```typescript
// Constraint states have distinct visual indicators
visual_states: {
  SATISFIED: {
    border: "GREEN",
    thickness: "2px",
    icon: "✓"
  },
  VIOLATED: {
    border: "RED",
    thickness: "4px",
    pulse: true,
    icon: "⚠"
  },
  WARNING: {
    border: "YELLOW",
    thickness: "2px",
    icon: "!"
  },
  RELAXED: {
    border: "BLUE",
    thickness: "1px",
    dashed: true,
    icon: "〜"
  },
  DISABLED: {
    border: "GRAY",
    thickness: "1px",
    opacity: 0.5,
    icon: "○"
  }
}
```

---

## 5. Advanced: Meta-Constraints and Hierarchies

### 5.1 Meta-Constraints (Constraining Constraints)

```typescript
// Constraints can constrain OTHER constraints
meta_constraint: {
  id: "budget_growth_limiter",
  on_constraint: "B11_budget_cap",
  type: DERIVATIVE,
  expression: "rate_of_change(B11_budget_cap.max) <= 100",
  meaning: "Budget can't increase faster than $100/month",
  action: WARN
}

// Example scenario:
// 1. User tries to increase B12 (budget) from 5000 to 6000
// 2. Meta-constraint checks: rate = 1000/month > 100
// 3. Action: WARN user, but allow if confirmed
// 4. User can override meta-constraint if needed
```

### 5.2 Constraint Hierarchies

```typescript
hierarchy: {
  level_1_HARD: {
    constraints: [
      "All values must be positive",
      "No division by zero"
    ],
    modifiable: false,
    override: impossible
  },
  level_2_SOFT: {
    constraints: [
      "Total expenses ≤ budget",
      "Each category ≤ 20% of budget"
    ],
    modifiable: true,
    override: "with warning and penalty"
  },
  level_3_PREFERENCE: {
    constraints: [
      "Variance < 5%",
      "Growth rate > 2%"
    ],
    modifiable: true,
    override: "freely"
  },
  level_4_LEARNED: {
    constraints: [
      "User prefers round numbers",
      "User tolerates < $50 overage"
    ],
    modifiable: true,
    auto_generated: true
  }
}
```

### 5.3 Adaptive Constraints

```typescript
adaptive_constraint: {
  id: "adaptive_budget",
  type: RANGE,
  expression: "0 ≤ value ≤ =B12",

  // Learning parameters
  learning: {
    enabled: true,
    rate: 0.3,
    patterns: {
      weekend_relaxation: {
        condition: "day ∈ ['Sat', 'Sun']",
        action: "multiply max by 1.2"
      },
      seasonal_adjustment: {
        condition: "month in ['Nov', 'Dec']",
        action: "multiply max by 1.5"
      },
      user_trust: {
        condition: "user_approved_violation_count >= 3",
        action: "permanently relax by 10%"
      }
    }
  },

  // Constraint learns from user behavior
  history: {
    violations: 15,
    user_overrode: 12,
    user_allowed: 3,
    adaptation: "relaxed_max_by_20_percent"
  }
}
```

### 5.4 Constraint Propagation Algorithm

```python
class ConstraintPropagator:
    def propagate_change(self, source_tile, change):
        """
        Propagate constraint effects through tile network.
        Runs in THREE directions simultaneously.
        """

        # 1. FORWARD PROPAGATION
        # Tiles that depend on source_tile
        forward_affected = self.get_dependents(source_tile)
        for tile in forward_affected:
            tile.check_constraints(source_tile)

        # 2. BACKWARD PROPAGATION
        # Tiles that source_tile depends on
        backward_affected = self.get_dependencies(source_tile)
        for tile in backward_affected:
            if tile.can_adjust_to_satisfy(source_tile):
                tile.suggest_alternative(source_tile)

        # 3. LATERAL PROPAGATION
        # Tiles in same constraint groups
        lateral_affected = self.get_group_members(source_tile)
        for tile in lateral_affected:
            tile.propagate_group_constraint(change)

        # 4. META-CONSTRAINT CHECK
        # Check if any meta-constraints are violated
        meta_constraints = self.get_meta_constraints(source_tile)
        for meta in meta_constraints:
            meta.check(source_tile)

    def resolve_violation(self, tile, constraint, violation):
        """
        Generate and rank solutions for constraint violation.
        """
        solutions = []

        # Solution 1: Relax constraint
        if constraint.modifiable:
            solutions.append({
                type: "RELAX",
                description: f"Relax {constraint.id} to allow {violation.value}",
                confidence: 0.8
            })

        # Solution 2: Adjust source
        if violation.source.adjustable:
            solutions.append({
                type: "ADJUST_SOURCE",
                description: f"Set {violation.source.id} to {violation.suggested_value}",
                confidence: 0.9
            })

        # Solution 3: Adjust dependencies
        for dep in violation.dependencies:
            if dep.adjustable:
                solutions.append({
                    type: "ADJUST_DEPENDENCY",
                    description: f"Adjust {dep.id} to satisfy constraint",
                    confidence: 0.7
                })

        # Solution 4: Temporary override
        solutions.append({
            type: "TEMPORARY_OVERRIDE",
            description: "Allow this one time",
            confidence: 0.5
        })

        return sorted(solutions, key=lambda s: s.confidence, reverse=True)
```

---

## 6. Comparison with Existing Systems

### 6.1 VS Type Systems

| Aspect | Type Systems | SMP Constraints |
|--------|--------------|-----------------|
| **When checked** | Compile-time only | Runtime, continuous |
| **Granularity** | Module/class/function | Individual tile |
| **Modifiability** | Requires recompilation | Runtime editable |
| **Expressiveness** | Static types only | Dynamic predicates |
| **User-facing** | Programmer-only | End-user accessible |
| **Violation** | Binary (pass/fail) | Multi-level (block/warn/adjust) |

### 6.2 VS Constraint Programming (Prolog, CSP)

| Aspect | CSP Solvers | SMP Constraints |
|--------|-------------|-----------------|
| **Execution** | Batch solver | Streaming propagation |
| **Scope** | Monolithic problem | Tiled, incremental |
| **Consistency** | Global consistency | Local + global |
| **User control** | Solver black box | Visible, interactive |
| **Latency** | Solve complete problem | Per-update propagation |
| **Inspection** | Solution only | Full propagation trace |

### 6.3 VS Spreadsheet Validation

| Aspect | Spreadsheets | SMP Constraints |
|--------|--------------|-----------------|
| **Timing** | After-the-fact | Pre-emptive |
| **Action** | Error messages | Block + suggest |
| **Visibility** | Error cells | Constraint membranes |
| **Prevention** | None | Built-in |
| **Learning** | None | Adaptive |
| **Hierarchy** | Flat | Multi-level priorities |

### 6.4 VS Database Constraints

| Aspect | Databases | SMP Constraints |
|--------|-----------|-----------------|
| **Level** | Schema/table | Per-tile |
| **Timing** | Transaction commit | Continuous during computation |
| **Failure** | Rollback | Block + alternatives |
| **User control** | DBA only | End-user |
| **Dependencies** | Foreign keys only | Arbitrary relationships |
| **Visibility** | Error codes | Full trace with UI |

---

## 7. The Paradigm Shift

### 7.1 FROM: External Validation

```typescript
// Traditional: Check after computation
function computeValue(x) {
  const result = x * 2;

  // Constraint check is AFTERTHOUGHT
  if (result < 0 || result > 100) {
    throw new Error("Constraint violated");
  }

  return result;
}
```

### 7.2 TO: Internal Constraint Membranes

```typescript
// SMP: Constraint is PART of computation
const tile = new Tile({
  input: x,
  computation: (x) => x * 2,

  // Constraint membrane is FUNDAMENTAL
  membrane: {
    pre: {
      constraint: (input) => input >= 0,
      action: BLOCK
    },
    post: {
      constraint: (output) => output >= 0 && output <= 100,
      action: BLOCK_AND_SUGGEST
    }
  }
});

// Computation is automatically constrained
tile.set(50);  // OK, output = 100
tile.set(60);  // BLOCKED: would output 120 > 100
// System suggests: "Set input to ≤50"
```

### 7.3 User Experience Shift

**Traditional Programming**:
```
User: Write code
System: [runs]
System: Error at line 42
User: Fix error
User: Re-run
System: Error at line 37
User: Fix error
[...]
```

**SMP Constraint Membranes**:
```
User: Drag constraint onto tile
System: Constraint active (visual feedback)
User: Enter value
System: [blocks before computation]
System: "Value would violate constraint: 0 ≤ x ≤ 100"
System: Suggestions:
  - "Use 85 instead"
  - "Relax constraint"
  - "Show me why"
User: Click "Use 85"
System: Value accepted, computation proceeds
```

---

## 8. Key Insights for White Paper

### 8.1 Primary Breakthrough

**Constraint membranes are first-class architectural elements**, not afterthoughts. Every SMP tile is born with constraint capability, making constraints as fundamental as input/output.

### 8.2 Secondary Breakthroughs

1. **Pre-emptive Enforcement**: Block violations BEFORE computation, not after
2. **Bidirectional Propagation**: Constraints flow upstream AND downstream
3. **Visual Manipulation**: Drag-drop-paint constraints like spreadsheet elements
4. **Meta-Constraints**: Constraints that constrain other constraints
5. **Adaptive Learning**: Constraints that learn from user behavior
6. **Hierarchical Priorities**: HARD → SOFT → PREFERENCE → LEARNED
7. **Full Inspectability**: Complete trace of why something was blocked

### 8.3 Novel Contributions

1. **Streaming Constraint Propagation**: Incremental, not batch
2. **User-Accessible Constraints**: No programming required
3. **Self-Modifying Constraints**: Adaptive based on usage patterns
4. **Multi-Modal Propagation**: Forward + backward + lateral
5. **Visual Constraint Language**: Manipulatable, not just code

---

## 9. Future Research Directions

1. **Constraint Learning**: ML to suggest constraints based on patterns
2. **Constraint Composition**: Building complex constraints from simple ones
3. **Distributed Constraints**: Across SMP colonies on different machines
4. **Temporal Constraints**: Time-bound, periodic, historical constraints
5. **Probabilistic Constraints**: Fuzzy constraints with confidence intervals
6. **Constraint Markets**: Tiles bidding for constraint relaxation
7. **Constraint Versioning**: Track constraint evolution over time

---

## 10. Conclusion

Granular constraint systems for SMP tiles represent a paradigm shift from "external validation" to "internal constraint membranes." By making constraints first-class, visible, and manipulatable elements of the computational architecture, we enable:

1. **Pre-emptive error prevention** instead of reactive error handling
2. **User-accessible constraint specification** without programming
3. **Real-time constraint propagation** through tile networks
4. **Adaptive constraints** that learn from user behavior
5. **Full inspectability** of constraint enforcement

The breakthrough is not just in the constraint technology itself, but in making constraints accessible to end-users through intuitive visual interfaces that treat constraints as first-class citizens of the spreadsheet environment.

---

**Keywords**: Constraint membranes, pre-emptive enforcement, bidirectional propagation, meta-constraints, adaptive constraints, visual constraint language, streaming constraint satisfaction
