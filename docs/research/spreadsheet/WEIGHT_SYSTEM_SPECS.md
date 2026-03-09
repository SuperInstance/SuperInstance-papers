# Weight System Specifications
## Spreadsheet Intelligence Layer

**Core Principle**: The intelligence is in the WEIGHTS, not in the cells themselves.

Weights represent learned connections between cells - they encode "how much does Cell A influence Cell B?" through experience, not formulas. This is the spreadsheet's memory structure.

---

## Table of Contents

1. [Core Interfaces](#core-interfaces)
2. [Hebbian Learning Algorithm](#hebbian-learning-algorithm)
3. [Weight Visualization](#weight-visualization)
4. [Propagation Rules](#propagation-rules)
5. [User Control](#user-control)
6. [Example Networks](#example-networks)
7. [Implementation Notes](#implementation-notes)

---

## Core Interfaces

### CellWeight

```typescript
interface CellWeight {
  // Identification
  id: string;                    // Unique weight ID
  sourceCell: string;            // e.g., "A1"
  targetCell: string;            // e.g., "B2"

  // Current Value
  value: number;                 // 0.0 to 1.0

  // Learning Configuration
  learningRate: number;          // Default: 0.1
  decayRate: number;             // Default: 0.001
  lastUpdate: Date;

  // Constraints
  minValue: number;              // Default: 0.0
  maxValue: number;              // Default: 1.0

  // State
  isFrozen: boolean;             // Prevent learning updates
  isManualOnly: boolean;         // Only user can change

  // Traceability
  history: WeightEvent[];        // Full event history
  creationReason: string;        // Why this weight was created

  // Metadata
  createdAt: Date;
  updateCount: number;
  totalReinforcement: number;    // Sum of all positive updates
  totalPunishment: number;       // Sum of all negative updates
}
```

### WeightEvent

Every weight change is recorded for full traceability:

```typescript
interface WeightEvent {
  id: string;
  timestamp: Date;

  // Value Change
  oldValue: number;
  newValue: number;
  delta: number;                 // newValue - oldValue

  // Cause
  trigger: WeightTrigger;        // What caused the change

  // Context
  context?: {
    sourceCellValue?: any;
    targetCellValue?: any;
    correlation?: number;        // If Hebbian update
    reward?: number;             // If reward-based
    cascadeSource?: string;      // If propagation
  };

  // Provenance
  userId?: string;               // If manual edit
  sessionId: string;             // Spreadsheet session
}
```

### WeightTrigger

```typescript
enum WeightTrigger {
  // Automatic
  HEBBIAN_REINFORCEMENT = 'hebbian_reinforcement',
  HEBBIAN_DECAY = 'hebbian_decay',
  NORMALIZATION = 'normalization',
  COMPETITIVE_INHIBITION = 'competitive_inhibition',
  TRANSITIVE_REINFORCEMENT = 'transitive_reinforcement',

  // Manual
  MANUAL_EDIT = 'manual_edit',
  MANUAL_FREEZE = 'manual_freeze',
  MANUAL_RESET = 'manual_reset',

  // System
  WEIGHT_CREATION = 'weight_creation',
  WEIGHT_INHERITANCE = 'weight_inheritance',
  WEIGHT_PROPAGATION = 'weight_propagation'
}
```

### WeightNetwork

```typescript
interface WeightNetwork {
  id: string;
  spreadsheetId: string;

  // All weights
  weights: Map<string, CellWeight>;

  // Indexes for fast lookup
  outgoingWeights: Map<string, string[]>;    // source -> [weightIds]
  incomingWeights: Map<string, string[]>;    // target -> [weightIds]

  // Network statistics
  stats: {
    totalWeights: number;
    averageWeight: number;
    strongestPath: {source: string, target: string, value: number};
    hubCells: string[];                       // Highly connected
    orphanCells: string[];                    // Isolated
  };

  // Global configuration
  config: WeightNetworkConfig;
}
```

### WeightNetworkConfig

```typescript
interface WeightNetworkConfig {
  // Learning defaults
  defaultLearningRate: number;        // 0.1
  defaultDecayRate: number;           // 0.001

  // Normalization
  normalizeOutgoing: boolean;         // true
  normalizationStrategy: 'softmax' | 'sum' | 'none';

  // Pruning
  pruneThreshold: number;             // 0.01 - remove weak weights
  pruneInterval: number;              // Check every N updates

  // Inhibition
  enableCompetitiveInhibition: boolean; // true
  inhibitionFactor: number;           // 0.5 - how much to weaken competitors

  // Transitive reinforcement
  enableTransitiveReinforcement: boolean; // true
  transitiveFactor: number;           // 0.3 - strength of transitive updates

  // Temporal
  decayEnabled: boolean;              // true
  decayInterval: number;              // Apply every N seconds
}
```

---

## Hebbian Learning Algorithm

### Core Principle

> "Neurons that fire together, wire together."

In spreadsheet context: **Cells that are used together, develop stronger connections.**

### When Weights Update

Weights update in response to:

1. **Cell Value Changes**: When source cell's value changes
2. **Formula Execution**: When target cell uses source in calculation
3. **User Rewards**: When user marks an outcome as "good" or "bad"
4. **Time Decay**: Periodic weakening of unused connections
5. **Propagation**: Cascading updates from other weight changes

### Update Algorithm

```typescript
function updateWeight(
  weight: CellWeight,
  sourceActivity: number,    // 0.0 to 1.0 - how active source is
  targetActivity: number,    // 0.0 to 1.0 - how active target is
  correlation: number        // -1.0 to 1.0 - do they correlate?
): CellWeight {

  // 1. Calculate Hebbian delta
  // Classic: Δw = η * x * y
  // With correlation: Δw = η * x * y * corr

  const hebbianDelta = weight.learningRate
    * sourceActivity
    * targetActivity
    * correlation;

  // 2. Apply update
  const newValue = clamp(
    weight.value + hebbianDelta,
    weight.minValue,
    weight.maxValue
  );

  // 3. Create event
  const event: WeightEvent = {
    id: generateId(),
    timestamp: new Date(),
    oldValue: weight.value,
    newValue: newValue,
    delta: newValue - weight.value,
    trigger: WeightTrigger.HEBBIAN_REINFORCEMENT,
    context: {
      correlation: correlation,
      sourceCellValue: sourceActivity,
      targetCellValue: targetActivity
    },
    sessionId: currentSessionId
  };

  // 4. Update weight
  const updatedWeight: CellWeight = {
    ...weight,
    value: newValue,
    lastUpdate: new Date(),
    updateCount: weight.updateCount + 1,
    totalReinforcement: hebbianDelta > 0
      ? weight.totalReinforcement + hebbianDelta
      : weight.totalReinforcement,
    totalPunishment: hebbianDelta < 0
      ? weight.totalPunishment + Math.abs(hebbianDelta)
      : weight.totalPunishment,
    history: [event, ...weight.history].slice(0, 100) // Keep last 100
  };

  return updatedWeight;
}
```

### Activity Detection

```typescript
// How "active" is a cell?
function calculateCellActivity(
  cell: Cell,
  context: SpreadsheetContext
): number {

  // Factors that increase activity:
  // 1. Value changed recently (0.0 to 0.4)
  const recencyScore = cell.secondsSinceLastUpdate < 5
    ? 0.4 * (1 - cell.secondsSinceLastUpdate / 5)
    : 0;

  // 2. Value is significantly different from default (0.0 to 0.3)
  const deviationScore = 0.3 * Math.min(
    Math.abs(cell.value - cell.defaultValue) / cell.defaultValue,
    1
  );

  // 3. Used in formula execution (0.0 to 0.3)
  const usageScore = cell.usedInCalculationRecently ? 0.3 : 0;

  return recencyScore + deviationScore + usageScore;
}
```

### Correlation Detection

```typescript
// Do source and target cells correlate?
function calculateCorrelation(
  sourceCell: Cell,
  targetCell: Cell,
  history: CellHistory[]
): number {

  // 1. Direct causality: Is source used in target's formula? (0.0 to 1.0)
  let causality = 0;
  if (targetCell.formula?.references.includes(sourceCell.id)) {
    causality = 1.0;
  }

  // 2. Temporal correlation: Does source change before target? (0.0 to 0.5)
  const temporalCorr = calculateTemporalCorrelation(
    sourceCell.valueHistory,
    targetCell.valueHistory,
    lag: 1 // Look 1 step ahead
  );

  // 3. Pattern correlation: Do their values move together? (0.0 to 0.5)
  const patternCorr = calculatePearsonCorrelation(
    sourceCell.valueHistory.slice(-10),  // Last 10 values
    targetCell.valueHistory.slice(-10)
  );

  return 0.5 * causality + 0.25 * temporalCorr + 0.25 * patternCorr;
}
```

### Decay Algorithm

```typescript
function applyDecay(weight: CellWeight): CellWeight {
  if (!weight.isFrozen) {
    // Exponential decay: w(t) = w(0) * e^(-λt)
    const decayFactor = Math.exp(-weight.decayRate);
    const newValue = Math.max(
      weight.value * decayFactor,
      weight.minValue
    );

    return {
      ...weight,
      value: newValue,
      lastUpdate: new Date(),
      history: [{
        id: generateId(),
        timestamp: new Date(),
        oldValue: weight.value,
        newValue: newValue,
        delta: newValue - weight.value,
        trigger: WeightTrigger.HEBBIAN_DECAY,
        sessionId: currentSessionId
      }, ...weight.history]
    };
  }
  return weight;
}
```

### Normalization

```typescript
// Ensure outgoing weights from a cell sum to 1.0 (softmax)
function normalizeOutgoingWeights(
  sourceCell: string,
  weights: CellWeight[]
): CellWeight[] {

  // Get all outgoing weights from source
  const outgoing = weights.filter(w => w.sourceCell === sourceCell);
  const others = weights.filter(w => w.sourceCell !== sourceCell);

  if (outgoing.length === 0) return weights;

  // Apply softmax normalization
  const sumExp = outgoing.reduce((sum, w) => sum + Math.exp(w.value), 0);

  const normalized = outgoing.map(w => ({
    ...w,
    value: Math.exp(w.value) / sumExp,
    history: [{
      id: generateId(),
      timestamp: new Date(),
      oldValue: w.value,
      newValue: Math.exp(w.value) / sumExp,
      delta: (Math.exp(w.value) / sumExp) - w.value,
      trigger: WeightTrigger.NORMALIZATION,
      sessionId: currentSessionId
    }, ...w.history]
  }));

  return [...others, ...normalized];
}
```

---

## Weight Visualization

### Visual Mapping

Weights are rendered as connection lines between cells:

```typescript
interface WeightVisualization {
  // Line Properties
  thickness: number;        // 1px to 8px (based on value)
  color: WeightColor;       // Based on trend
  opacity: number;          // 0.1 to 1.0 (based on value)
  style: LineStyle;         // solid or dashed (frozen)

  // Animations
  pulseSpeed?: number;      // For recently updated weights
  flowDirection?: 'source→target' | 'bidirectional';
}
```

### Thickness Mapping

```
Weight Value  |  Line Thickness  |  Visual Meaning
--------------|------------------|------------------
0.0 - 0.1     |  1px             |  Barely visible
0.1 - 0.3     |  2px             |  Weak connection
0.3 - 0.5     |  3px             |  Moderate connection
0.5 - 0.7     |  5px             |  Strong connection
0.7 - 0.9     |  7px             |  Very strong
0.9 - 1.0     |  8px + glow      |  Maximum strength
```

### Color Mapping

```typescript
enum WeightColor {
  // Trend-based
  INCREASING = '#3B82F6',      // Blue - getting stronger
  STABLE = '#94A3B8',          // Gray - stable
  DECREASING = '#EF4444',      // Red - getting weaker

  // State-based
  FROZEN = '#6366F1',          // Indigo - locked
  MANUAL = '#F59E0B',          // Amber - user-set

  // Special
  REWARD_PATH = '#10B981',     // Green - part of rewarded path
  CASCADE = '#8B5CF6'          // Purple - propagating change
}
```

Trend detection:
```typescript
function determineWeightColor(weight: CellWeight): WeightColor {
  if (weight.isFrozen) return WeightColor.FROZEN;
  if (weight.isManualOnly) return WeightColor.MANUAL;

  // Check last 5 events for trend
  const recentEvents = weight.history.slice(0, 5);
  const avgDelta = recentEvents.reduce((sum, e) => sum + e.delta, 0) / recentEvents.length;

  if (avgDelta > 0.01) return WeightColor.INCREASING;
  if (avgDelta < -0.01) return WeightColor.DECREASING;
  return WeightColor.STABLE;
}
```

### Opacity Mapping

```typescript
function calculateOpacity(weight: CellWeight): number {
  // Weak weights are more transparent
  return 0.2 + (weight.value * 0.8);  // Range: 0.2 to 1.0
}
```

### Line Style

```typescript
enum LineStyle {
  SOLID = 'solid',           // Normal active weight
  DASHED = 'dashed',         // Frozen weight
  DOTTED = 'dotted',         // Very weak (< 0.1)
  DOUBLE = 'double'          // Reciprocal strong connection (both ways)
}
```

### Interactions

#### Hover

```typescript
interface WeightTooltip {
  // Basic info
  weight: CellWeight;

  // Quick stats
  currentValue: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  lastUpdate: Date;

  // Recent history (sparkline)
  historySparkline: {
    data: number[];          // Last 10 values
    min: number;
    max: number;
  };

  // Quick actions
  actions: ['freeze', 'edit', 'reset', 'delete'];
}
```

Visual example:
```
┌─────────────────────────────────────┐
│  A1 → B2                            │
│  ████████░░ 0.75                    │
│                                     │
│  Trend: ↑ Increasing                │
│  Last: 2s ago (+0.05)               │
│                                     │
│  [🔒 Freeze] [✏️ Edit] [↺ Reset]    │
└─────────────────────────────────────┘
```

#### Click (Inspector Panel)

```typescript
interface WeightInspector {
  weight: CellWeight;

  // Value control
  currentValue: number;
  slider: { min: 0, max: 1, step: 0.01 };
  presetButtons: [0.1, 0.5, 0.9];

  // History timeline
  historyTimeline: {
    events: WeightEvent[];
    sparkline: Chart;
    filters: ['all', 'reinforcement', 'decay', 'manual'];
  };

  // Learning controls
  learningParams: {
    learningRate: number;
    decayRate: number;
    frozen: boolean;
    manualOnly: boolean;
  };

  // Analytics
  analytics: {
    totalUpdates: number;
    avgReinforcement: number;
    avgPunishment: number;
    strengthPercentile: number;  // vs all weights
  };

  // Actions
  actions: [
    'freeze',
    'unfreeze',
    'reset_to_learned',
    'edit_manually',
    'delete',
    'export_history'
  ];
}
```

Inspector layout:
```
┌──────────────────────────────────────────────────────────┐
│  Weight Inspector: A1 → B2                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Current Value: ████████████████░░░░ 0.75              │
│                                                          │
│  Quick Set: [Weak 0.1] [Med 0.5] [Strong 0.9]          │
│                                                          │
│  ──────────────────────────────────────────────────    │
│  History Timeline (Last 100 events)                     │
│                                                          │
│     1.0 ┤                                      ╱───      │
│     0.8 ┤                           ╱╱╱               │
│     0.6 ┤                    ╱╱╱╱                    │
│     0.4 ┤              ╱╱╱╱                         │
│     0.2 ┤        ╱╱╱╱                              │
│     0.0 ┤────────────────────────────────────────    │
│         10s  8s   6s   4s   2s   now                 │
│                                                          │
│  Filter: [All] [Reinforce] [Decay] [Manual]           │
│                                                          │
│  ──────────────────────────────────────────────────    │
│  Event Log                                              │
│                                                          │
│  • now     +0.05  Hebbian reinforcement                │
│  • 5s ago  +0.02  Hebbian reinforcement                │
│  • 12s ago -0.01  Decay                                │
│  • 20s ago +0.10  Manual edit (user: casey)           │
│                                                          │
│  ──────────────────────────────────────────────────    │
│  Learning Parameters                                    │
│                                                          │
│  Learning Rate: [━━━░░] 0.10                            │
│  Decay Rate:    [░░░━░] 0.001                           │
│                                                          │
│  ☐ Frozen  ☐ Manual Only                               │
│                                                          │
│  ──────────────────────────────────────────────────    │
│  Analytics                                              │
│                                                          │
│  Total Updates: 47                                       │
│  Avg Reinforcement: +0.043                              │
│  Avg Punishment: -0.007                                 │
│  Strength: 85th percentile (stronger than 85%)         │
│                                                          │
│  ──────────────────────────────────────────────────    │
│  Actions                                                │
│                                                          │
│  [🔒 Freeze] [↺ Reset to Learned] [🗑️ Delete]          │
│  [📤 Export History] [🔍 Trace Propagation]            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Right-Click (Context Menu)

```
┌──────────────────┐
│  Edit Weight     │
│  Freeze Weight   │
│  Reset Weight    │
│  ─────────────   │
│  Trace Source    │
│  Trace Target    │
│  ─────────────   │
│  Delete Weight   │
└──────────────────┘
```

#### Drag (Manual Adjustment)

Click and drag on a connection line to adjust weight like a slider:
- Drag toward source → Decrease weight
- Drag toward target → Increase weight
- Visual feedback: Line thickness updates in real-time

---

## Propagation Rules

### 1. Direct Propagation (Normalization)

When one weight changes, other weights from the same source adjust to maintain normalization:

```typescript
function propagateNormalization(
  changedWeight: CellWeight,
  allWeights: CellWeight[]
): CellWeight[] {

  const outgoing = allWeights.filter(
    w => w.sourceCell === changedWeight.sourceCell
  );

  if (outgoing.length <= 1) return allWeights;

  // Calculate adjustment factor
  const oldSum = outgoing.reduce((sum, w) => sum + w.value, 0);
  const newSum = oldSum - changedWeight.oldValue + changedWeight.value;
  const factor = (1.0 - changedWeight.value) / (1.0 - changedWeight.oldValue);

  // Adjust other weights proportionally
  return allWeights.map(w => {
    if (w.sourceCell === changedWeight.sourceCell && w.id !== changedWeight.id) {
      const newValue = clamp(w.value * factor, w.minValue, w.maxValue);
      return {
        ...w,
        value: newValue,
        history: [{
          id: generateId(),
          timestamp: new Date(),
          oldValue: w.value,
          newValue: newValue,
          delta: newValue - w.value,
          trigger: WeightTrigger.NORMALIZATION,
          context: { cascadeSource: changedWeight.id },
          sessionId: currentSessionId
        }, ...w.history]
      };
    }
    return w;
  });
}
```

### 2. Competitive Inhibition

Strong weight to one target weakens connections to competing targets:

```typescript
function applyCompetitiveInhibition(
  strengthenedWeight: CellWeight,
  allWeights: CellWeight[],
  inhibitionFactor: number = 0.5
): CellWeight[] {

  const competitors = allWeights.filter(
    w => w.sourceCell === strengthenedWeight.sourceCell
      && w.targetCell !== strengthenedWeight.targetCell
      && !w.isFrozen
  );

  return allWeights.map(w => {
    if (competitors.some(c => c.id === w.id)) {
      // Weaken competitors proportional to strength increase
      const weakening = strengthenedWeight.delta * inhibitionFactor;
      const newValue = Math.max(w.value - weakening, w.minValue);

      return {
        ...w,
        value: newValue,
        history: [{
          id: generateId(),
          timestamp: new Date(),
          oldValue: w.value,
          newValue: newValue,
          delta: newValue - w.value,
          trigger: WeightTrigger.COMPETITIVE_INHIBITION,
          context: { cascadeSource: strengthenedWeight.id },
          sessionId: currentSessionId
        }, ...w.history]
      };
    }
    return w;
  });
}
```

### 3. Transitive Reinforcement

If A→B and B→C are both strong, reinforce A→C:

```typescript
function applyTransitiveReinforcement(
  weights: CellWeight[],
  transitiveFactor: number = 0.3
): CellWeight[] {

  const updates: CellWeight[] = [];

  // Find all A→B→C chains
  for (const ab of weights) {
    for (const bc of weights) {
      if (ab.targetCell === bc.sourceCell) {
        // Found chain A→B→C
        const ac = weights.find(
          w => w.sourceCell === ab.sourceCell && w.targetCell === bc.targetCell
        );

        if (ac && !ac.isFrozen) {
          // Both A→B and B→C are strong (> 0.7)
          if (ab.value > 0.7 && bc.value > 0.7) {
            const reinforcement = (ab.value * bc.value) * transitiveFactor;
            const newValue = Math.min(ac.value + reinforcement, ac.maxValue);

            updates.push({
              ...ac,
              value: newValue,
              history: [{
                id: generateId(),
                timestamp: new Date(),
                oldValue: ac.value,
                newValue: newValue,
                delta: newValue - ac.value,
                trigger: WeightTrigger.TRANSITIVE_REINFORCEMENT,
                context: {
                  viaCell: ab.targetCell,
                  viaWeight1: ab.id,
                  viaWeight2: bc.id
                },
                sessionId: currentSessionId
              }, ...ac.history]
            });
          }
        }
      }
    }
  }

  // Merge updates
  const updatedIds = new Set(updates.map(u => u.id));
  return weights.map(w => updates.find(u => u.id === w.id) || w);
}
```

### 4. Reward Propagation

When a target cell is "rewarded" (user marks outcome as good), reinforce all contributors:

```typescript
function propagateReward(
  targetCell: string,
  rewardAmount: number,  // 0.0 to 1.0
  weights: CellWeight[]
): CellWeight[] {

  // Find all weights that point to target
  const contributors = weights.filter(
    w => w.targetCell === targetCell && !w.isFrozen
  );

  if (contributors.length === 0) return weights;

  // Distribute reward proportionally to current weight strength
  const totalStrength = contributors.reduce((sum, w) => sum + w.value, 0);

  return weights.map(w => {
    const contributor = contributors.find(c => c.id === w.id);
    if (contributor) {
      // Stronger weights get more reward
      const rewardShare = (contributor.value / totalStrength) * rewardAmount;
      const newValue = Math.min(w.value + rewardShare, w.maxValue);

      return {
        ...w,
        value: newValue,
        history: [{
          id: generateId(),
          timestamp: new Date(),
          oldValue: w.value,
          newValue: newValue,
          delta: newValue - w.value,
          trigger: WeightTrigger.HEBBIAN_REINFORCEMENT,
          context: { reward: rewardShare },
          sessionId: currentSessionId
        }, ...w.history]
      };
    }
    return w;
  });
}
```

### Propagation Cascade

```typescript
async function propagateWeightChange(
  initialChange: CellWeight,
  network: WeightNetwork
): Promise<void> {

  const queue: CellWeight[] = [initialChange];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    // Apply different propagation strategies
    let updated = network.weights;

    // 1. Normalization
    updated = propagateNormalization(current, updated);

    // 2. Competitive inhibition
    if (network.config.enableCompetitiveInhibition) {
      updated = applyCompetitiveInhibition(current, updated);
    }

    // 3. Transitive reinforcement (periodically)
    if (network.config.enableTransitiveReinforcement) {
      updated = applyTransitiveReinforcement(updated);
    }

    // Queue newly changed weights for propagation
    for (const w of updated) {
      if (w.lastUpdate > current.lastUpdate && !visited.has(w.id)) {
        queue.push(w);
      }
    }

    network.weights = updated;

    // Visual feedback
    await renderWeightUpdate(current);
  }
}
```

---

## User Control

### Weight States

```typescript
enum WeightState {
  AUTO_LEARNING = 'auto_learning',      // System updates via Hebbian
  FROZEN = 'frozen',                     // Locked, no updates
  MANUAL_ONLY = 'manual_only',          // Only user can change
  RESET_PENDING = 'reset_pending'       // Can revert to learned
}
```

### Manual Override Options

#### 1. Direct Edit

```typescript
interface ManualWeightEdit {
  weightId: string;
  newValue: number;
  reason?: string;                      // User's note
  userId: string;
}
```

#### 2. Slider Adjustment

```typescript
interface WeightSlider {
  weightId: string;
  value: number;                        // 0.0 to 1.0
  min: number;
  max: number;
  step: number;                         // 0.01
  presetValues: number[];               // [0.1, 0.5, 0.9]
}
```

#### 3. Preset Buttons

```typescript
const WEIGHT_PRESETS = {
  WEAK: { value: 0.1, label: 'Weak' },
  MEDIUM: { value: 0.5, label: 'Medium' },
  STRONG: { value: 0.9, label: 'Strong' },
  NONE: { value: 0.0, label: 'None' }
};
```

### Weight Actions

```typescript
interface WeightAction {
  type: WeightActionType;
  weightId: string;
  userId: string;
  timestamp: Date;
}

enum WeightActionType {
  FREEZE = 'freeze',                   // Lock weight
  UNFREEZE = 'unfreeze',               // Unlock weight
  RESET = 'reset',                     // Reset to learned value
  DELETE = 'delete',                   // Remove weight
  EXPORT = 'export',                   // Export weight history
  TRACE = 'trace'                      // Trace propagation
}
```

### Reset to Learned

```typescript
function resetToLearned(weight: CellWeight): CellWeight {
  // Calculate "learned" value from history
  // Exclude manual edits, average reinforcement events

  const learnedEvents = weight.history.filter(
    e => e.trigger === WeightTrigger.HEBBIAN_REINFORCEMENT
  );

  if (learnedEvents.length === 0) return weight;

  // Average all reinforcement deltas
  const avgDelta = learnedEvents.reduce(
    (sum, e) => sum + e.delta, 0
  ) / learnedEvents.length;

  // Apply to initial value
  const learnedValue = clamp(
    weight.history[weight.history.length - 1].oldValue + avgDelta,
    weight.minValue,
    weight.maxValue
  );

  return {
    ...weight,
    value: learnedValue,
    isManualOnly: false,
    history: [{
      id: generateId(),
      timestamp: new Date(),
      oldValue: weight.value,
      newValue: learnedValue,
      delta: learnedValue - weight.value,
      trigger: WeightTrigger.MANUAL_RESET,
      sessionId: currentSessionId
    }, ...weight.history]
  };
}
```

### Weight Inheritance

#### Copying Cells

```typescript
interface CopyBehavior {
  copyWeights: boolean;                // Default: true
  resetWeights: boolean;               // Default: false
  inheritLearningParams: boolean;      // Default: true
}

function copyCellWithWeights(
  sourceCell: string,
  targetCell: string,
  network: WeightNetwork,
  behavior: CopyBehavior
): CellWeight[] {

  const newWeights: CellWeight[] = [];

  // Copy outgoing weights
  const outgoing = network.outgoingWeights.get(sourceCell) || [];
  for (const weightId of outgoing) {
    const original = network.weights.get(weightId)!;

    const newWeight: CellWeight = {
      ...original,
      id: generateId(),
      sourceCell: targetCell,
      value: behavior.resetWeights ? 0.1 : original.value,
      history: behavior.resetWeights ? [] : [...original.history],
      createdAt: new Date(),
      creationReason: `copied from ${sourceCell}`,
      updateCount: 0
    };

    newWeights.push(newWeight);
  }

  return newWeights;
}
```

#### Template Weights

```typescript
interface WeightTemplate {
  id: string;
  name: string;
  description: string;

  // Template weights (relative cell references)
  weights: TemplateWeight[];

  // Metadata
  createdAt: Date;
  createdBy: string;
  usageCount: number;
}

interface TemplateWeight {
  sourcePattern: string;               // e.g., "{row}1"
  targetPattern: string;               // e.g., "{row}2"
  value: number;
  learningRate: number;
  decayRate: number;
}

function applyTemplate(
  template: WeightTemplate,
  targetCells: string[],
  network: WeightNetwork
): CellWeight[] {

  const newWeights: CellWeight[] = [];

  for (const target of targetCells) {
    const row = extractRowNumber(target);

    for (const tw of template.weights) {
      const source = tw.sourcePattern.replace('{row}', row.toString());
      const targetCell = tw.targetPattern.replace('{row}', row.toString());

      const newWeight: CellWeight = {
        id: generateId(),
        sourceCell: source,
        targetCell: targetCell,
        value: tw.value,
        learningRate: tw.learningRate,
        decayRate: tw.decayRate,
        minValue: 0.0,
        maxValue: 1.0,
        isFrozen: false,
        isManualOnly: false,
        history: [],
        creationReason: `template "${template.name}"`,
        createdAt: new Date(),
        updateCount: 0,
        totalReinforcement: 0,
        totalPunishment: 0
      };

      newWeights.push(newWeight);
    }
  }

  return newWeights;
}
```

### Export/Import

```typescript
interface WeightExport {
  version: string;                     // Format version
  timestamp: Date;
  spreadsheetId: string;

  // All weights
  weights: CellWeight[];

  // Network statistics
  stats: {
    totalWeights: number;
    averageWeight: number;
    distribution: Histogram;
  };
}

// Export to JSON
function exportWeights(
  network: WeightNetwork,
  format: 'json' | 'csv'
): string {

  if (format === 'json') {
    return JSON.stringify({
      version: '1.0',
      timestamp: new Date(),
      spreadsheetId: network.spreadsheetId,
      weights: Array.from(network.weights.values()),
      stats: network.stats
    }, null, 2);
  }

  if (format === 'csv') {
    const headers = [
      'sourceCell', 'targetCell', 'value', 'learningRate', 'decayRate',
      'isFrozen', 'updateCount', 'createdAt'
    ];

    const rows = Array.from(network.weights.values()).map(w => [
      w.sourceCell, w.targetCell, w.value, w.learningRate, w.decayRate,
      w.isFrozen, w.updateCount, w.createdAt.toISOString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Import from JSON
function importWeights(
  data: string,
  network: WeightNetwork
): WeightNetwork {

  const imported: WeightExport = JSON.parse(data);

  for (const weight of imported.weights) {
    network.weights.set(weight.id, {
      ...weight,
      history: [],  // Reset history on import
      creationReason: 'imported'
    });
  }

  // Rebuild indexes
  rebuildIndexes(network);

  return network;
}
```

### Analytics

```typescript
interface WeightAnalytics {
  // Distribution
  distribution: {
    histogram: Histogram;              // Value distribution
    percentiles: {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
  };

  // Top weights
  topWeights: {
    strongest: CellWeight[];           // Top 10 by value
    mostActive: CellWeight[];          // Top 10 by update count
    fastestGrowing: CellWeight[];      // Top 10 by recent trend
  };

  // Network properties
  network: {
    hubCells: string[];                // Highly connected
    orphanCells: string[];             // Isolated
    strongPaths: Path[];               // Strongest paths
    clusters: Cluster[];               // Weight clusters
  };

  // Learning dynamics
  learning: {
    avgLearningRate: number;
    avgDecayRate: number;
    totalUpdates: number;
    frozenRatio: number;               // % frozen
    manualRatio: number;               // % manual-only
  };
}

function generateAnalytics(
  network: WeightNetwork
): WeightAnalytics {

  const weights = Array.from(network.weights.values());

  // Distribution
  const values = weights.map(w => w.value);
  const histogram = computeHistogram(values, bins: 20);
  const percentiles = computePercentiles(values, [10, 25, 50, 75, 90]);

  // Top weights
  const strongest = weights
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const mostActive = weights
    .sort((a, b) => b.updateCount - a.updateCount)
    .slice(0, 10);

  const fastestGrowing = weights
    .map(w => ({
      weight: w,
      trend: computeRecentTrend(w)
    }))
    .sort((a, b) => b.trend - a.trend)
    .slice(0, 10)
    .map(item => item.weight);

  // Network analysis
  const outgoingCounts = new Map<string, number>();
  const incomingCounts = new Map<string, number>();

  for (const w of weights) {
    outgoingCounts.set(
      w.sourceCell,
      (outgoingCounts.get(w.sourceCell) || 0) + 1
    );
    incomingCounts.set(
      w.targetCell,
      (incomingCounts.get(w.targetCell) || 0) + 1
    );
  }

  const hubCells = Array.from(outgoingCounts.entries())
    .filter(([_, count]) => count > 5)
    .sort((a, b) => b[1] - a[1])
    .map(([cell, _]) => cell);

  const allCells = new Set([
    ...weights.map(w => w.sourceCell),
    ...weights.map(w => w.targetCell)
  ]);

  const orphanCells = Array.from(allCells).filter(cell =>
    !outgoingCounts.has(cell) && !incomingCounts.has(cell)
  );

  return {
    distribution: {
      histogram,
      percentiles: {
        p10: percentiles[0],
        p25: percentiles[1],
        p50: percentiles[2],
        p75: percentiles[3],
        p90: percentiles[4]
      }
    },
    topWeights: {
      strongest,
      mostActive,
      fastestGrowing
    },
    network: {
      hubCells,
      orphanCells,
      strongPaths: findStrongestPaths(weights, 10),
      clusters: findClusters(weights)
    },
    learning: {
      avgLearningRate: average(weights.map(w => w.learningRate)),
      avgDecayRate: average(weights.map(w => w.decayRate)),
      totalUpdates: weights.reduce((sum, w) => sum + w.updateCount, 0),
      frozenRatio: weights.filter(w => w.isFrozen).length / weights.length,
      manualRatio: weights.filter(w => w.isManualOnly).length / weights.length
    }
  };
}
```

---

## Example Networks

### Example 1: Budget Calculator

**Scenario**: A simple budget spreadsheet with income sources and expense categories.

```
Income Sources:  B2 (Salary), B3 (Freelance), B4 (Investments)
Expense Categories:  D2 (Rent), D3 (Food), D4 (Transport), D5 (Savings)
Total Income:      B5
Total Expenses:    D6
Balance:           B7 (B5 - D6)
```

**Learned Weights** (after user repeatedly adjusts budget):

```typescript
const budgetWeights: CellWeight[] = [
  // Income → Total Income (strong, direct formula)
  {
    sourceCell: 'B2', targetCell: 'B5', value: 0.95,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.10 },
      { trigger: 'hebbian_reinforcement', delta: +0.05 },
      { trigger: 'hebbian_reinforcement', delta: +0.02 }
    ]
  },
  {
    sourceCell: 'B3', targetCell: 'B5', value: 0.85,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.08 },
      { trigger: 'hebbian_reinforcement', delta: +0.04 }
    ]
  },

  // Total Income → Balance (strong, direct formula)
  {
    sourceCell: 'B5', targetCell: 'B7', value: 0.98,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.15 },
      { trigger: 'hebbian_reinforcement', delta: +0.10 }
    ]
  },

  // Expenses → Total Expenses (strong)
  {
    sourceCell: 'D2', targetCell: 'D6', value: 0.92,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.12 }
    ]
  },
  {
    sourceCell: 'D3', targetCell: 'D6', value: 0.88,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.09 }
    ]
  },

  // Total Expenses → Balance (negative correlation, but still strong)
  {
    sourceCell: 'D6', targetCell: 'B7', value: 0.94,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.13 }
    ]
  },

  // Transitive: Salary → Balance (via Total Income)
  {
    sourceCell: 'B2', targetCell: 'B7', value: 0.65,
    history: [
      { trigger: 'transitive_reinforcement', delta: +0.15, viaCell: 'B5' }
    ]
  },

  // Savings → Balance (positive, user rewards saving more)
  {
    sourceCell: 'D5', targetCell: 'B7', value: 0.78,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.20 },
      { trigger: 'manual_edit', delta: +0.10, userId: 'user123' }
    ]
  }
];
```

**Visualization**:
- Thick blue lines from income cells to B5, then to B7
- Thick red lines from expense cells to D6, then to B7
- Medium purple line from B2 to B7 (transitive)
- Extra-thick green line from D5 (Savings) to B7 (user-rewarded)

---

### Example 2: Project Management

**Scenario**: Task dependencies and resource allocation.

```
Tasks:           A2 (Design), A3 (Development), A4 (Testing), A5 (Deploy)
Resources:       B2 (Designer), B3 (Developer), B4 (QA Engineer)
Completion:      C2, C3, C4, C5 (percentage complete)
Project Status:  C6 (overall progress)
```

**Learned Weights** (after project completion):

```typescript
const projectWeights: CellWeight[] = [
  // Task dependencies (strong)
  {
    sourceCell: 'A2', targetCell: 'A3', value: 0.90,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.15 },
      { trigger: 'hebbian_reinforcement', delta: +0.10 }
    ],
    context: { type: 'dependency' }
  },
  {
    sourceCell: 'A3', targetCell: 'A4', value: 0.85,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.12 }
    ]
  },
  {
    sourceCell: 'A4', targetCell: 'A5', value: 0.88,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.13 }
    ]
  },

  // Resource → Task assignments (strong)
  {
    sourceCell: 'B2', targetCell: 'A2', value: 0.92,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.18 }
    ]
  },
  {
    sourceCell: 'B3', targetCell: 'A3', value: 0.95,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.20 }
    ]
  },

  // Completion → Status (very strong)
  {
    sourceCell: 'C2', targetCell: 'C6', value: 0.25,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.05 }
    ]
  },
  {
    sourceCell: 'C3', targetCell: 'C6', value: 0.35,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.08 }
    ]
  },
  {
    sourceCell: 'C4', targetCell: 'C6', value: 0.30,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.06 }
    ]
  },
  {
    sourceCell: 'C5', targetCell: 'C6', value: 0.10,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.02 }
    ]
  },

  // Bottleneck detection (Testing blocks Deploy)
  {
    sourceCell: 'A4', targetCell: 'C6', value: 0.60,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.20 },
      { trigger: 'manual_edit', delta: +0.10, userId: 'manager', reason: 'Bottleneck' }
    ]
  }
];
```

**Visualization**:
- Chain of strong dependencies: A2 → A3 → A4 → A5
- Resource assignments: B2 → A2, B3 → A3 (thick lines)
- Completion contributions: C3 (Development) has thickest line to C6
- Bottleneck highlighted: A4 (Testing) has extra-thick line to C6 (manually boosted)

---

### Example 3: Machine Learning Hyperparameter Tuning

**Scenario**: Neural network training with hyperparameters and metrics.

```
Hyperparameters:  B2 (Learning Rate), B3 (Batch Size), B4 (Layers)
Metrics:          C2 (Training Loss), C3 (Validation Loss), C4 (Accuracy)
Model Status:     C5 (Overall Score)
```

**Learned Weights** (after many training runs):

```typescript
const mlWeights: CellWeight[] = [
  // Hyperparameters → Metrics (learned sensitivity)
  {
    sourceCell: 'B2', targetCell: 'C2', value: 0.75,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.15 },
      { trigger: 'hebbian_reinforcement', delta: +0.10 },
      { trigger: 'hebbian_decay', delta: -0.02 }
    ],
    context: { sensitivity: 'high' }
  },
  {
    sourceCell: 'B2', targetCell: 'C3', value: 0.82,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.18 },
      { trigger: 'hebbian_reinforcement', delta: +0.12 }
    ]
  },
  {
    sourceCell: 'B3', targetCell: 'C2', value: 0.45,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.08 },
      { trigger: 'hebbian_decay', delta: -0.03 }
    ],
    context: { sensitivity: 'medium' }
  },
  {
    sourceCell: 'B4', targetCell: 'C4', value: 0.90,
    history: [
      { trigger: 'hebbian_reinforcement', delta: +0.22 },
      { trigger: 'hebbian_reinforcement', delta: +0.15 }
    ],
    context: { sensitivity: 'very_high' }
  },

  // Metrics → Overall Score (user-defined importance)
  {
    sourceCell: 'C2', targetCell: 'C5', value: 0.30,
    history: [
      { trigger: 'manual_edit', delta: -0.20, userId: 'researcher', reason: 'Less important' }
    ],
    isManualOnly: true
  },
  {
    sourceCell: 'C3', targetCell: 'C5', value: 0.50,
    history: [
      { trigger: 'manual_edit', delta: +0.30, userId: 'researcher', reason: 'Most important' }
    ],
    isManualOnly: true
  },
  {
    sourceCell: 'C4', targetCell: 'C5', value: 0.20,
    history: [
      { trigger: 'manual_edit', delta: +0.10, userId: 'researcher' }
    ],
    isManualOnly: true
  },

  // Transitive: Learning Rate → Overall Score (via Validation Loss)
  {
    sourceCell: 'B2', targetCell: 'C5', value: 0.68,
    history: [
      { trigger: 'transitive_reinforcement', delta: +0.25, viaCell: 'C3' }
    ]
  }
];
```

**Visualization**:
- Strong lines from B4 (Layers) to C4 (Accuracy) - very sensitive
- Medium line from B2 (Learning Rate) to C3 (Validation Loss) - important
- Weak line from B3 (Batch Size) to C2 (Training Loss) - less important
- Manual weights (orange color) from metrics to C5 (Overall Score)
- Strong purple line from B2 to C5 (transitive via Validation Loss)

---

## Implementation Notes

### Performance Considerations

1. **Lazy Rendering**: Only render weights for visible cells
2. **Level of Detail**: Show fewer weights when zoomed out
3. **Threshold Culling**: Don't render weights below 0.05
4. **Bundling**: Group parallel connections to reduce visual clutter

### Storage Strategy

```typescript
interface WeightStorage {
  // In-memory cache
  cache: Map<string, CellWeight>;

  // Persistent storage
  persistence: {
    type: 'indexeddb' | 'localstorage' | 'server';
    syncInterval: number;              // Auto-save every N seconds
  };

  // Compression
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'lzma';
    threshold: number;                 // Compress histories > 100 events
  };
}
```

### Conflict Resolution

When multiple users edit the same weight:

```typescript
interface ConflictResolution {
  strategy: 'last_write_wins' | 'merge' | 'require_manual';

  merge: {
    averageValues: boolean;            // Average conflicting values
    keepAllHistory: boolean;           // Preserve all events
    markConflicted: boolean;           // Flag for manual review
  };
}
```

### Testing Strategy

```typescript
interface WeightTests {
  // Unit tests
  unit: [
    'weightUpdateCalculation',
    'normalizationPreservesSum',
    'decayDecreasesValue',
    'freezePreventsUpdate'
  ];

  // Integration tests
  integration: [
    'propagationCascade',
    'transitiveReinforcement',
    'competitiveInhibition',
    'rewardPropagation'
  ];

  // UI tests
  ui: [
    'hoverTooltipShowsCorrectData',
    'clickOpensInspector',
    'dragAdjustsWeight',
    'contextMenuActionsWork'
  ];
}
```

---

## Summary

The weight system makes spreadsheet intelligence **tangible**:

- **Visible**: Connection lines show learned relationships
- **Traceable**: Every weight change is recorded
- **Controllable**: Users can override, freeze, or reset any weight
- **Emergent**: Intelligence grows from Hebbian learning, not formulas

The core philosophy: **Intelligence is in the weights, not the cells.** Users can see, touch, and shape this intelligence directly.

---

**Next Steps**:
1. Implement core weight data structures
2. Build visualization layer (connection lines)
3. Create interaction layer (hover, click, drag)
4. Implement Hebbian learning algorithm
5. Add propagation rules
6. Build inspector panel
7. Create export/import functionality
8. Add analytics dashboard
