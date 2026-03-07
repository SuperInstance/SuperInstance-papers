# Temperature Control & Annealing in POLLN

**Research Agent:** Orchestrator
**Date:** 2026-03-06
**Mission:** Design adaptive temperature/annealing system for POLLN
**Status:** COMPLETE

---

## Executive Summary

Temperature control in POLLN is the **primary mechanism for balancing exploration and exploitation** across multiple decision layers. Inspired by AlphaGo's temperature parameter for move selection, POLLN uses temperature to control randomness in:

1. **Tile/Agent selection** (Plinko layer)
2. **Action choice** within selected agents
3. **Variant generation** during overnight evolution
4. **Day/night cycle transitions**

This document provides a comprehensive framework for implementing **adaptive temperature management** with concrete TypeScript pseudocode.

---

## Table of Contents

1. [What Should Temperature Control?](#1-what-should-temperature-control)
2. [Temperature Scheduling Strategies](#2-temperature-scheduling-strategies)
3. [Tile-Specific Temperature Policies](#3-tile-specific-temperature-policies)
4. [Day/Night Temperature Cycles](#4-daynight-temperature-cycles)
5. [Simulated Annealing for Optimization](#5-simulated-annealing-for-optimization)
6. [Implementation Architecture](#6-implementation-architecture)
7. [TypeScript Reference Implementation](#7-typescript-reference-implementation)

---

## 1. What Should Temperature Control?

### 1.1 Hierarchy of Temperature-Controlled Decisions

```
┌─────────────────────────────────────────────────────────────────┐
│                 TEMPERATURE CONTROL HIERARCHY                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LEVEL 1: COLONY-LEVEL TEMPERATURE (T_colony)                   │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Controls: Which tile/agent gets activated             │     │
│  │ Location: Plinko layer selection                      │     │
│  │ Range: 0.1 (exploit) → 10.0 (explore)                │     │
│  │                                                         │     │
│  │ High T: Try diverse tiles, discover new patterns      │     │
│  │ Low T: Stick to proven tiles, maximize performance    │     │
│  └───────────────────────────────────────────────────────┘     │
│                        │                                        │
│                        ▼                                        │
│  LEVEL 2: TILE-LEVEL TEMPERATURE (T_tile)                       │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Controls: Action selection within tile                │     │
│  │ Location: Individual agent decision logic             │     │
│  │ Range: 0.01 (deterministic) → 5.0 (very random)      │     │
│  │                                                         │     │
│  │ High T: Explore diverse actions for this tile         │     │
│  │ Low T: Execute best-known action for this tile        │     │
│  └───────────────────────────────────────────────────────┘     │
│                        │                                        │
│                        ▼                                        │
│  LEVEL 3: MUTATION TEMPERATURE (T_mutation)                     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Controls: Variant generation strength                 │     │
│  │ Location: Overnight evolution pipeline                │     │
│  │ Range: 0.01 (tiny changes) → 2.0 (large changes)    │     │
│  │                                                         │     │
│  │ High T: Generate diverse variants, explore widely     │     │
│  │ Low T: Refine existing variants, exploit locally      │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Temperature Control Points

| Decision Point | Temperature Parameter | Effect |
|----------------|----------------------|--------|
| **Plinko Selection** | `T_plinko` | Controls tile/agent selection randomness |
| **Action Sampling** | `T_action` | Controls action choice within selected tile |
| **Variant Mutation** | `T_mutation` | Controls mutation strength in evolution |
| **Dream Exploration** | `T_dream` | Controls exploration in world model dreaming |
| **Cross-Pollination** | `T_cross` | Controls how much to mix from external pollen |

### 1.3 Temperature Effects on Behavior

**High Temperature (Exploration Mode):**
- Probabilities become more uniform
- Less likely options get selected more often
- System discovers new patterns
- Higher variance in outcomes
- Slower convergence but better global optima

**Low Temperature (Exploitation Mode):**
- Probabilities become more peaked
- Best options dominate selection
- System refines known patterns
- Lower variance in outcomes
- Faster convergence to local optima

---

## 2. Temperature Scheduling Strategies

### 2.1 Time-Based Scheduling

#### Linear Decay

```typescript
/**
 * Linear temperature decay
 * Simple, predictable exploration-exploitation transition
 */
function linearDecay(
  step: number,
  T_initial: number,
  T_min: number,
  T_max_steps: number
): number {
  const progress = Math.min(step / T_max_steps, 1.0);
  return T_min + (T_initial - T_min) * (1 - progress);
}

// Example: Day cycle
// T_initial = 5.0 (morning exploration)
// T_min = 0.5 (evening exploitation)
// T_max_steps = steps in a day
```

#### Exponential Decay

```typescript
/**
 * Exponential temperature decay
 * Fast initial exploration, slow refinement
 */
function exponentialDecay(
  step: number,
  T_initial: number,
  decay_rate: number
): number {
  return T_initial * Math.pow(decay_rate, step);
}

// Example: Learning cycle
// T_initial = 10.0
// decay_rate = 0.995
// After 1000 steps: T ≈ 0.6
```

#### Cosine Annealing

```typescript
/**
 * Cosine annealing
 * Smooth cyclical exploration-exploitation
 */
function cosineAnnealing(
  step: number,
  T_initial: number,
  T_min: number,
  period: number
): number {
  return T_min + 0.5 * (T_initial - T_min) *
    (1 + Math.cos((2 * Math.PI * step) / period));
}

// Example: Daily rhythm
// period = steps in 24 hours
// Creates smooth day/night temperature cycle
```

#### Inverse Time Decay

```typescript
/**
 * Inverse time decay
 * Standard in reinforcement learning
 */
function inverseTimeDecay(
  step: number,
  T_initial: number,
  decay: number
): number {
  return T_initial / (1 + decay * step);
}

// Example: Continuous learning
// T_initial = 5.0
// decay = 0.001
```

### 2.2 Performance-Based Scheduling

#### Entropy-Triggered Adjustment

```typescript
/**
 * Adjust temperature based on selection entropy
 * High entropy = need more structure (lower T)
 * Low entropy = need more exploration (raise T)
 */
class EntropyBasedTemperature {
  private currentTemp: number;
  private targetEntropy: number;
  private adjustmentRate: number;

  constructor(
    initialTemp: number,
    targetEntropy: number,
    adjustmentRate: number = 0.01
  ) {
    this.currentTemp = initialTemp;
    this.targetEntropy = targetEntropy;
    this.adjustmentRate = adjustmentRate;
  }

  /**
   * Calculate Shannon entropy of probability distribution
   */
  private calculateEntropy(probabilities: number[]): number {
    return -probabilities.reduce((sum, p) => {
      return p > 0 ? sum + p * Math.log(p) : sum;
    }, 0);
  }

  /**
   * Update temperature based on observed entropy
   */
  update(selectionProbabilities: number[]): number {
    const currentEntropy = this.calculateEntropy(selectionProbabilities);
    const entropyError = this.targetEntropy - currentEntropy;

    // Adjust temperature: negative feedback loop
    // If entropy too high (too random), decrease T
    // If entropy too low (too deterministic), increase T
    this.currentTemp *= Math.exp(-this.adjustmentRate * entropyError);

    // Clamp to reasonable bounds
    this.currentTemp = Math.max(0.01, Math.min(10.0, this.currentTemp));

    return this.currentTemp;
  }
}
```

#### Performance-Triggered Adjustment

```typescript
/**
 * Adjust temperature based on performance metrics
 * Poor performance = increase exploration
 * Good performance = decrease exploration
 */
class PerformanceBasedTemperature {
  private currentTemp: number;
  private performanceHistory: number[] = [];
  private windowSize: number = 100;

  constructor(initialTemp: number) {
    this.currentTemp = initialTemp;
  }

  /**
   * Update temperature based on recent performance
   */
  update(performance: number): number {
    this.performanceHistory.push(performance);

    if (this.performanceHistory.length > this.windowSize) {
      this.performanceHistory.shift();
    }

    // Calculate trend
    if (this.performanceHistory.length < 10) {
      return this.currentTemp;
    }

    const recent = this.performanceHistory.slice(-10);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const avgAll = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;

    // If performance declining, increase temperature (explore more)
    // If performance improving, decrease temperature (exploit more)
    if (avgRecent < avgAll * 0.95) {
      // Performance dropping - explore more
      this.currentTemp = Math.min(10.0, this.currentTemp * 1.1);
    } else if (avgRecent > avgAll * 1.05) {
      // Performance improving - exploit more
      this.currentTemp = Math.max(0.1, this.currentTemp * 0.95);
    }

    return this.currentTemp;
  }
}
```

### 2.3 Hybrid Scheduling

```typescript
/**
 * Combined time-based and performance-based temperature
 */
class HybridTemperatureScheduler {
  private timeScheduler: (step: number) => number;
  private performanceAdjuster: PerformanceBasedTemperature;
  private timeWeight: number;

  constructor(
    timeScheduler: (step: number) => number,
    performanceWeight: number = 0.3
  ) {
    this.timeScheduler = timeScheduler;
    this.performanceAdjuster = new PerformanceBasedTemperature(
      timeScheduler(0)
    );
    this.timeWeight = 1 - performanceWeight;
  }

  getTemperature(step: number, performance: number): number {
    // Time-based component
    const timeTemp = this.timeScheduler(step);

    // Performance-based component
    const perfTemp = this.performanceAdjuster.update(performance);

    // Weighted combination
    return this.timeWeight * timeTemp +
           (1 - this.timeWeight) * perfTemp;
  }
}
```

---

## 3. Tile-Specific Temperature Policies

### 3.1 Tile Categories & Temperature Ranges

```typescript
/**
 * Different tile types have different optimal temperature ranges
 */
enum TileCategory {
  PERCEPTION = 'perception',     // Sense the world
  DECISION = 'decision',         // Make choices
  ACTION = 'action',             // Do things
  MEMORY = 'memory',             // Remember/forget
  COMMUNICATION = 'communication', // Talk to other tiles
  LEARNING = 'learning',         // Improve behavior
  SAFETY = 'safety',             // Prevent harm
  META = 'meta'                 // Reason about tiles
}

interface TileTemperaturePolicy {
  category: TileCategory;
  baseTemperature: number;
  temperatureRange: [number, number];
  adaptationRate: number;
  explorationBonus: number;
}

/**
 * Temperature policies for different tile categories
 */
const TILE_TEMPERATURE_POLICIES: Record<TileCategory, TileTemperaturePolicy> = {
  [TileCategory.PERCEPTION]: {
    category: TileCategory.PERCEPTION,
    baseTemperature: 0.5,
    temperatureRange: [0.1, 2.0],
    adaptationRate: 0.01,
    explorationBonus: 0.0,
    // Low T: Perception should be stable and reliable
  },

  [TileCategory.DECISION]: {
    category: TileCategory.DECISION,
    baseTemperature: 2.0,
    temperatureRange: [0.5, 5.0],
    adaptationRate: 0.02,
    explorationBonus: 0.5,
    // Medium-high T: Decisions need exploration for novelty
  },

  [TileCategory.ACTION]: {
    category: TileCategory.ACTION,
    baseTemperature: 1.0,
    temperatureRange: [0.2, 3.0],
    adaptationRate: 0.015,
    explorationBonus: 0.2,
    // Low-medium T: Actions should be somewhat reliable
  },

  [TileCategory.MEMORY]: {
    category: TileCategory.MEMORY,
    baseTemperature: 0.3,
    temperatureRange: [0.05, 1.0],
    adaptationRate: 0.005,
    explorationBonus: 0.0,
    // Very low T: Memory retrieval should be deterministic
  },

  [TileCategory.COMMUNICATION]: {
    category: TileCategory.COMMUNICATION,
    baseTemperature: 1.5,
    temperatureRange: [0.3, 4.0],
    adaptationRate: 0.02,
    explorationBonus: 0.3,
    // Medium T: Communication can have variation
  },

  [TileCategory.LEARNING]: {
    category: TileCategory.LEARNING,
    baseTemperature: 3.0,
    temperatureRange: [1.0, 8.0],
    adaptationRate: 0.03,
    explorationBonus: 1.0,
    // High T: Learning needs maximum exploration
  },

  [TileCategory.SAFETY]: {
    category: TileCategory.SAFETY,
    baseTemperature: 0.01,
    temperatureRange: [0.01, 0.1],
    adaptationRate: 0.001,
    explorationBonus: 0.0,
    // Minimal T: Safety must be deterministic
  },

  [TileCategory.META]: {
    category: TileCategory.META,
    baseTemperature: 2.5,
    temperatureRange: [0.5, 6.0],
    adaptationRate: 0.025,
    explorationBonus: 0.7,
    // Medium-high T: Meta-reasoning benefits from exploration
  },
};
```

### 3.2 Adaptive Tile Temperature

```typescript
/**
 * Per-tile adaptive temperature management
 */
class TileTemperatureManager {
  private tilePolicies: Map<string, TileTemperaturePolicy>;
  private tilePerformance: Map<string, number[]> = new Map();
  private windowSize: number = 50;

  constructor() {
    this.tilePolicies = new Map();
  }

  /**
   * Register a tile with its temperature policy
   */
  registerTile(tileId: string, category: TileCategory): void {
    const policy = TILE_TEMPERATURE_POLICIES[category];
    this.tilePolicies.set(tileId, policy);
    this.tilePerformance.set(tileId, []);
  }

  /**
   * Get temperature for a tile at this moment
   */
  getTemperature(tileId: string, performance: number): number {
    const policy = this.tilePolicies.get(tileId);
    if (!policy) {
      throw new Error(`No temperature policy for tile: ${tileId}`);
    }

    // Update performance history
    const history = this.tilePerformance.get(tileId)!;
    history.push(performance);
    if (history.length > this.windowSize) {
      history.shift();
    }

    // Calculate performance-based adjustment
    let adjustment = 0;
    if (history.length >= 10) {
      const recent = history.slice(-10);
      const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
      const avgHistory = history.reduce((a, b) => a + b, 0) / history.length;

      // Performance-based adjustment
      if (avgRecent < avgHistory * 0.9) {
        // Poor performance - increase temperature
        adjustment = policy.adaptationRate * policy.baseTemperature;
      } else if (avgRecent > avgHistory * 1.1) {
        // Good performance - decrease temperature
        adjustment = -policy.adaptationRate * policy.baseTemperature;
      }
    }

    // Calculate final temperature
    const baseTemp = policy.baseTemperature + policy.explorationBonus;
    let newTemp = baseTemp + adjustment;

    // Clamp to policy range
    const [min, max] = policy.temperatureRange;
    newTemp = Math.max(min, Math.min(max, newTemp));

    return newTemp;
  }

  /**
   * Get temperatures for multiple tiles (for Plinko selection)
   */
  getTemperatures(tileIds: string[], performances: Map<string, number>): Map<string, number> {
    const temperatures = new Map<string, number>();

    for (const tileId of tileIds) {
      const perf = performances.get(tileId) ?? 0.5;
      temperatures.set(tileId, this.getTemperature(tileId, perf));
    }

    return temperatures;
  }
}
```

### 3.3 Context-Aware Tile Temperature

```typescript
/**
 * Context-aware temperature adjustment
 * Different contexts require different exploration levels
 */
class ContextAwareTemperatureManager {
  private baseManager: TileTemperatureManager;

  constructor() {
    this.baseManager = new TileTemperatureManager();
  }

  /**
   * Get temperature with context awareness
   */
  getTemperatureWithContext(
    tileId: string,
    performance: number,
    context: {
      timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      taskDifficulty: 'easy' | 'medium' | 'hard';
      uncertainty: number;  // 0-1
      errorRate: number;    // 0-1
    }
  ): number {
    // Get base temperature
    let temp = this.baseManager.getTemperature(tileId, performance);

    // Time of day adjustment
    switch (context.timeOfDay) {
      case 'morning':
        temp *= 1.5;  // Explore more in morning
        break;
      case 'afternoon':
        temp *= 1.0;  // Normal
        break;
      case 'evening':
        temp *= 0.7;  // Exploit more in evening
        break;
      case 'night':
        temp *= 0.5;  // Minimal exploration at night
        break;
    }

    // Task difficulty adjustment
    switch (context.taskDifficulty) {
      case 'easy':
        temp *= 0.8;  // Less exploration for easy tasks
        break;
      case 'medium':
        temp *= 1.0;  // Normal
        break;
      case 'hard':
        temp *= 1.5;  // More exploration for hard tasks
        break;
    }

    // Uncertainty adjustment
    if (context.uncertainty > 0.7) {
      temp *= 2.0;  // Explore much more when uncertain
    } else if (context.uncertainty > 0.4) {
      temp *= 1.3;  // Explore more when somewhat uncertain
    }

    // Error rate adjustment
    if (context.errorRate > 0.3) {
      temp *= 1.5;  // Explore more when errors are high
    }

    return temp;
  }
}
```

---

## 4. Day/Night Temperature Cycles

### 4.1 Biological Rhythm Inspiration

```
┌─────────────────────────────────────────────────────────────────┐
│                 POLLN CIRCADIAN RHYTHM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HUMAN ANALOG:                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ MORNING: High alertness, ready for new challenges    │      │
│  │ AFTERNOON: Steady performance, routine tasks        │      │
│  │ EVENING: Reflection, consolidation                 │      │
│  │ NIGHT: Sleep, dreaming, unconscious optimization    │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  POLLN EQUIVALENT:                                              │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ MORNING (6am-12pm):  HIGH TEMPERATURE                │      │
│  │   • Explore new tile combinations                   │      │
│  │   • Try new variants                                │      │
│  │   • Maximum exploration                             │      │
│  │   • T_plinko = 5.0                                  │      │
│  ├──────────────────────────────────────────────────────┤      │
│  │ AFTERNOON (12pm-6pm): MEDIUM TEMPERATURE            │      │
│  │   • Balance exploration and exploitation            │      │
│  │   • Refine working patterns                         │      │
│  │   • T_plinko = 2.0                                  │      │
│  ├──────────────────────────────────────────────────────┤      │
│  │ EVENING (6pm-12am): LOW TEMPERATURE                 │      │
│  │   • Exploit known good patterns                    │      │
│  │   • Minimize risk                                   │      │
│  │   • T_plinko = 0.5                                  │      │
│  ├──────────────────────────────────────────────────────┤      │
│  │ NIGHT (12am-6am): NEAR-ZERO TEMPERATURE            │      │
│  │   • No active exploration                           │      │
│  │   • Dreaming optimization runs                     │      │
│  │   • T_plinko = 0.01 (near-deterministic)           │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Circadian Temperature Controller

```typescript
/**
 * Circadian rhythm-based temperature control
 */
class CircadianTemperatureController {
  private dayStart: number = 6 * 60 * 60 * 1000;  // 6am in ms
  private afternoonStart: number = 12 * 60 * 60 * 1000;  // 12pm
  private eveningStart: number = 18 * 60 * 60 * 1000;  // 6pm
  private nightStart: number = 0;  // 12am

  private morningTemp: number = 5.0;
  private afternoonTemp: number = 2.0;
  private eveningTemp: number = 0.5;
  private nightTemp: number = 0.01;

  /**
   * Get temperature based on time of day
   */
  getTemperatureForTime(timestamp: number): number {
    const hour = (timestamp % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000);

    if (hour >= 6 && hour < 12) {
      // Morning: smooth ramp up to morning temp
      const progress = (hour - 6) / 6;
      return this.nightTemp +
             (this.morningTemp - this.nightTemp) *
             this.smoothStep(progress);
    } else if (hour >= 12 && hour < 18) {
      // Afternoon: smooth transition from morning to afternoon
      const progress = (hour - 12) / 6;
      return this.morningTemp +
             (this.afternoonTemp - this.morningTemp) *
             this.smoothStep(progress);
    } else if (hour >= 18 && hour < 24) {
      // Evening: smooth transition from afternoon to evening
      const progress = (hour - 18) / 6;
      return this.afternoonTemp +
             (this.eveningTemp - this.afternoonTemp) *
             this.smoothStep(progress);
    } else {
      // Night: smooth transition from evening to night
      const progress = hour / 6;
      return this.eveningTemp +
             (this.nightTemp - this.eveningTemp) *
             this.smoothStep(progress);
    }
  }

  /**
   * Smooth step function for smooth transitions
   */
  private smoothStep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  /**
   * Is it nighttime (dreaming mode)?
   */
  isNighttime(timestamp: number): boolean {
    const hour = (timestamp % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000);
    return hour < 6 || hour >= 0;  // 12am-6am
  }

  /**
   * Get dreaming temperature (for overnight optimization)
   */
  getDreamingTemperature(): number {
    return 2.0;  // Moderate exploration during dreams
  }
}
```

### 4.3 Adaptive Day/Night Cycles

```typescript
/**
 * Adaptive day/night cycle based on keeper activity
 */
class AdaptiveDayNightCycle {
  private baseController: CircadianTemperatureController;
  private keeperActivityPattern: number[] = [];
  private adaptationFactor: number = 0.1;

  /**
   * Track keeper activity
   */
  recordActivity(timestamp: number, activityLevel: number): void {
    const hour = (timestamp % (24 * 60 * 60 * 1000)) / (60 * 60 * 60 * 1000);
    this.keeperActivityPattern[hour] = activityLevel;
  }

  /**
   * Get adaptive temperature
   */
  getAdaptiveTemperature(timestamp: number): number {
    const baseTemp = this.baseController.getTemperatureForTime(timestamp);
    const hour = (timestamp % (24 * 60 * 60 * 1000)) / (60 * 60 * 60 * 1000);

    // Adjust based on keeper activity pattern
    const activityLevel = this.keeperActivityPattern[hour] ?? 0.5;

    if (activityLevel > 0.7) {
      // High activity - increase exploration
      return baseTemp * (1 + this.adaptationFactor);
    } else if (activityLevel < 0.3) {
      // Low activity - decrease exploration
      return baseTemp * (1 - this.adaptationFactor);
    }

    return baseTemp;
  }

  /**
   * Detect when keeper goes to sleep
   */
  detectSleepTime(): number {
    // Find hour with lowest activity
    let minHour = 0;
    let minActivity = 1.0;

    for (let hour = 0; hour < 24; hour++) {
      const activity = this.keeperActivityPattern[hour] ?? 0;
      if (activity < minActivity) {
        minActivity = activity;
        minHour = hour;
      }
    }

    return minHour;
  }
}
```

---

## 5. Simulated Annealing for Optimization

### 5.1 Classical Simulated Annealing

```typescript
/**
 * Simulated Annealing for optimization
 * Used in overnight evolution pipeline
 */
class SimulatedAnnealingOptimizer {
  private initialTemp: number;
  private finalTemp: number;
  private coolingRate: number;
  private iterations: number;

  constructor(
    initialTemp: number = 100.0,
    finalTemp: number = 0.01,
    coolingRate: number = 0.95,
    iterations: number = 1000
  ) {
    this.initialTemp = initialTemp;
    this.finalTemp = finalTemp;
    this.coolingRate = coolingRate;
    this.iterations = iterations;
  }

  /**
   * Optimize a function using simulated annealing
   */
  optimize<T>(
    initialSolution: T,
    energyFunction: (solution: T) => number,
    neighborFunction: (solution: T, temperature: number) => T
  ): { solution: T; energy: number; history: number[] } {
    let currentSolution = initialSolution;
    let currentEnergy = energyFunction(currentSolution);
    let bestSolution = currentSolution;
    let bestEnergy = currentEnergy;
    let temperature = this.initialTemp;

    const history: number[] = [];

    for (let i = 0; i < this.iterations; i++) {
      // Generate neighbor solution
      const neighborSolution = neighborFunction(currentSolution, temperature);
      const neighborEnergy = energyFunction(neighborSolution);

      // Accept or reject
      const deltaEnergy = neighborEnergy - currentEnergy;

      if (deltaEnergy < 0 || Math.random() < Math.exp(-deltaEnergy / temperature)) {
        // Accept
        currentSolution = neighborSolution;
        currentEnergy = neighborEnergy;

        if (currentEnergy < bestEnergy) {
          bestSolution = currentSolution;
          bestEnergy = currentEnergy;
        }
      }

      // Cool down
      temperature = Math.max(
        this.finalTemp,
        temperature * this.coolingRate
      );

      history.push(currentEnergy);
    }

    return { solution: bestSolution, energy: bestEnergy, history };
  }
}
```

### 5.2 Adaptive Simulated Annealing

```typescript
/**
 * Adaptive simulated annealing with self-adjusting parameters
 */
class AdaptiveSimulatedAnnealing {
  private temperature: number;
  private acceptedCount: number = 0;
  private rejectedCount: number = 0;
  private targetAcceptanceRate: number = 0.44;
  private windowSize: number = 100;

  /**
   * Update temperature based on acceptance rate
   */
  private updateTemperature(): void {
    const total = this.acceptedCount + this.rejectedCount;
    if (total < this.windowSize) {
      return;
    }

    const acceptanceRate = this.acceptedCount / total;

    // Adjust temperature to maintain target acceptance rate
    if (acceptanceRate < this.targetAcceptanceRate) {
      // Too few acceptances - increase temperature
      this.temperature *= 1.1;
    } else if (acceptanceRate > this.targetAcceptanceRate + 0.1) {
      // Too many acceptances - decrease temperature faster
      this.temperature *= 0.9;
    } else {
      // Good acceptance rate - normal cooling
      this.temperature *= 0.95;
    }

    // Reset counters
    this.acceptedCount = 0;
    this.rejectedCount = 0;
  }

  /**
   * Optimize with adaptive temperature
   */
  optimize<T>(
    initialSolution: T,
    energyFunction: (solution: T) => number,
    neighborFunction: (solution: T, temperature: number) => T,
    maxIterations: number = 1000
  ): T {
    let currentSolution = initialSolution;
    let currentEnergy = energyFunction(initialSolution);
    this.temperature = 100.0;

    for (let i = 0; i < maxIterations; i++) {
      // Generate neighbor
      const neighbor = neighborFunction(currentSolution, this.temperature);
      const neighborEnergy = energyFunction(neighbor);

      // Acceptance probability
      const delta = neighborEnergy - currentEnergy;
      const acceptProb = delta < 0 ? 1.0 : Math.exp(-delta / this.temperature);

      if (Math.random() < acceptProb) {
        currentSolution = neighbor;
        currentEnergy = neighborEnergy;
        this.acceptedCount++;
      } else {
        this.rejectedCount++;
      }

      // Update temperature periodically
      if (i % 10 === 0) {
        this.updateTemperature();
      }
    }

    return currentSolution;
  }
}
```

### 5.3 Simulated Annealing for Pathway Optimization

```typescript
/**
 * Use simulated annealing to optimize agent pathways
 */
class PathwayOptimizer {
  private annealer: AdaptiveSimulatedAnnealing;

  constructor() {
    this.annealer = new AdaptiveSimulatedAnnealing();
  }

  /**
   * Optimize pathway (sequence of agents)
   */
  optimizePathway(
    initialPathway: string[],
    performanceFunction: (pathway: string[]) => Promise<number>
  ): Promise<string[]> {
    return this.annealer.optimize(
      initialPathway,
      async (pathway) => {
        // Energy = negative performance (minimize)
        const perf = await performanceFunction(pathway);
        return -perf;
      },
      (pathway, temperature) => {
        // Generate neighbor pathway
        return this.mutatePathway(pathway, temperature);
      },
      500  // iterations
    );
  }

  /**
   * Mutate pathway based on temperature
   */
  private mutatePathway(pathway: string[], temperature: number): string[] {
    const mutated = [...pathway];
    const mutationType = Math.random();

    if (mutationType < 0.3) {
      // Swap two agents
      const i = Math.floor(Math.random() * mutated.length);
      const j = Math.floor(Math.random() * mutated.length);
      [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
    } else if (mutationType < 0.6) {
      // Insert agent
      const i = Math.floor(Math.random() * (mutated.length + 1));
      const newAgent = this.getRandomAgent();
      mutated.splice(i, 0, newAgent);
    } else {
      // Remove agent
      if (mutated.length > 1) {
        const i = Math.floor(Math.random() * mutated.length);
        mutated.splice(i, 1);
      }
    }

    return mutated;
  }

  private getRandomAgent(): string {
    // In practice, this would select from available agents
    return 'agent_' + Math.floor(Math.random() * 100);
  }
}
```

---

## 6. Implementation Architecture

### 6.1 Temperature Management System

```typescript
/**
 * Central temperature management system
 */
interface TemperatureConfig {
  // Colony-level settings
  colony: {
    initialTemp: number;
    minTemp: number;
    maxTemp: number;
    scheduler: 'linear' | 'exponential' | 'cosine' | 'adaptive';
  };

  // Tile-level settings
  tiles: Map<TileCategory, TileTemperaturePolicy>;

  // Circadian settings
  circadian: {
    enabled: boolean;
    morningTemp: number;
    afternoonTemp: number;
    eveningTemp: number;
    nightTemp: number;
  };

  // Annealing settings
  annealing: {
    enabled: boolean;
    coolingRate: number;
    targetAcceptanceRate: number;
  };
}

/**
 * Main temperature manager
 */
class TemperatureManager {
  private config: TemperatureConfig;
  private colonyScheduler: (step: number) => number;
  private tileManager: TileTemperatureManager;
  private circadianController: CircadianTemperatureController;
  private step: number = 0;

  constructor(config: Partial<TemperatureConfig>) {
    this.config = this.mergeConfig(config);
    this.colonyScheduler = this.createScheduler(this.config.colony.scheduler);
    this.tileManager = new TileTemperatureManager();
    this.circadianController = new CircadianTemperatureController();
  }

  /**
   * Get colony-level temperature
   */
  getColonyTemperature(performance?: number): number {
    let temp = this.colonyScheduler(this.step);

    // Apply circadian adjustment if enabled
    if (this.config.circadian.enabled) {
      const circadianTemp = this.circadianController.getTemperatureForTime(Date.now());
      temp = (temp + circadianTemp) / 2;
    }

    // Apply performance adjustment if provided
    if (performance !== undefined) {
      const adjustment = (performance - 0.5) * -0.5;
      temp = Math.max(0.1, temp + adjustment);
    }

    return Math.max(this.config.colony.minTemp, Math.min(this.config.colony.maxTemp, temp));
  }

  /**
   * Get tile-level temperature
   */
  getTileTemperature(tileId: string, performance: number): number {
    return this.tileManager.getTemperature(tileId, performance);
  }

  /**
   * Advance step counter
   */
  advanceStep(): void {
    this.step++;
  }

  /**
   * Create scheduler function
   */
  private createScheduler(type: string): (step: number) => number {
    switch (type) {
      case 'linear':
        return (step) => linearDecay(step, 5.0, 0.1, 10000);
      case 'exponential':
        return (step) => exponentialDecay(step, 5.0, 0.999);
      case 'cosine':
        return (step) => cosineAnnealing(step, 5.0, 0.1, 1000);
      case 'adaptive':
        return (step) => 2.0;  // Base temperature, adjusted by performance
      default:
        return (step) => 2.0;
    }
  }

  private mergeConfig(partial: Partial<TemperatureConfig>): TemperatureConfig {
    return {
      colony: {
        initialTemp: 5.0,
        minTemp: 0.1,
        maxTemp: 10.0,
        scheduler: 'cosine',
        ...partial.colony
      },
      tiles: partial.tiles ?? new Map(),
      circadian: {
        enabled: true,
        morningTemp: 5.0,
        afternoonTemp: 2.0,
        eveningTemp: 0.5,
        nightTemp: 0.01,
        ...partial.circadian
      },
      annealing: {
        enabled: true,
        coolingRate: 0.95,
        targetAcceptanceRate: 0.44,
        ...partial.annealing
      }
    };
  }
}
```

### 6.2 Integration with Plinko Layer

```typescript
/**
 * Enhanced Plinko layer with temperature management
 */
class TemperatureControlledPlinko {
  private temperatureManager: TemperatureManager;
  private basePlinko: PlinkoLayer;

  constructor(temperatureManager: TemperatureManager) {
    this.temperatureManager = temperatureManager;
    this.basePlinko = new PlinkoLayer({
      temperature: temperatureManager.getColonyTemperature(),
      minTemperature: 0.1,
      decayRate: 0.001
    });
  }

  /**
   * Process proposals with adaptive temperature
   */
  async process(proposals: AgentProposal[]): Promise<PlinkoResult> {
    // Get current colony temperature
    const colonyTemp = this.temperatureManager.getColonyTemperature();

    // Get tile-specific temperatures
    const tileTemps = new Map<string, number>();
    for (const proposal of proposals) {
      const tileTemp = this.temperatureManager.getTileTemperature(
        proposal.agentId,
        proposal.confidence
      );
      tileTemps.set(proposal.agentId, tileTemp);
    }

    // Adjust proposal confidences based on tile temperatures
    const adjustedProposals = proposals.map(p => {
      const tileTemp = tileTemps.get(p.agentId) ?? 1.0;
      const tempFactor = tileTemp / colonyTemp;
      return {
        ...p,
        confidence: p.confidence * tempFactor
      };
    });

    // Process with base Plinko
    const result = await this.basePlinko.process(adjustedProposals);

    // Advance step
    this.temperatureManager.advanceStep();

    return result;
  }
}
```

---

## 7. TypeScript Reference Implementation

### 7.1 Complete Temperature System

```typescript
/**
 * POLLN Temperature Control System
 * Complete reference implementation
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

enum TileCategory {
  PERCEPTION = 'perception',
  DECISION = 'decision',
  ACTION = 'action',
  MEMORY = 'memory',
  COMMUNICATION = 'communication',
  LEARNING = 'learning',
  SAFETY = 'safety',
  META = 'meta'
}

interface TemperaturePolicy {
  baseTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  adaptationRate: number;
  explorationBonus: number;
}

interface TemperatureContext {
  step: number;
  performance: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  taskDifficulty: 'easy' | 'medium' | 'hard';
  uncertainty: number;
  errorRate: number;
}

// ============================================================================
// TEMPERATURE SCHEDULERS
// ============================================================================

interface TemperatureScheduler {
  (step: number): number;
}

const TemperatureSchedulers: Record<string, TemperatureScheduler> = {
  linear: (step: number) => {
    const T_initial = 5.0;
    const T_min = 0.1;
    const T_max = 10000;
    const progress = Math.min(step / T_max, 1.0);
    return T_min + (T_initial - T_min) * (1 - progress);
  },

  exponential: (step: number) => {
    const T_initial = 5.0;
    const decay_rate = 0.999;
    return T_initial * Math.pow(decay_rate, step);
  },

  cosine: (step: number) => {
    const T_initial = 5.0;
    const T_min = 0.1;
    const period = 1000;
    return T_min + 0.5 * (T_initial - T_min) *
      (1 + Math.cos((2 * Math.PI * step) / period));
  },

  inverseTime: (step: number) => {
    const T_initial = 5.0;
    const decay = 0.001;
    return T_initial / (1 + decay * step);
  }
};

// ============================================================================
// TILE TEMPERATURE POLICIES
// ============================================================================

const TILE_POLICIES: Record<TileCategory, TemperaturePolicy> = {
  [TileCategory.PERCEPTION]: {
    baseTemperature: 0.5,
    minTemperature: 0.1,
    maxTemperature: 2.0,
    adaptationRate: 0.01,
    explorationBonus: 0.0
  },
  [TileCategory.DECISION]: {
    baseTemperature: 2.0,
    minTemperature: 0.5,
    maxTemperature: 5.0,
    adaptationRate: 0.02,
    explorationBonus: 0.5
  },
  [TileCategory.ACTION]: {
    baseTemperature: 1.0,
    minTemperature: 0.2,
    maxTemperature: 3.0,
    adaptationRate: 0.015,
    explorationBonus: 0.2
  },
  [TileCategory.MEMORY]: {
    baseTemperature: 0.3,
    minTemperature: 0.05,
    maxTemperature: 1.0,
    adaptationRate: 0.005,
    explorationBonus: 0.0
  },
  [TileCategory.COMMUNICATION]: {
    baseTemperature: 1.5,
    minTemperature: 0.3,
    maxTemperature: 4.0,
    adaptationRate: 0.02,
    explorationBonus: 0.3
  },
  [TileCategory.LEARNING]: {
    baseTemperature: 3.0,
    minTemperature: 1.0,
    maxTemperature: 8.0,
    adaptationRate: 0.03,
    explorationBonus: 1.0
  },
  [TileCategory.SAFETY]: {
    baseTemperature: 0.01,
    minTemperature: 0.01,
    maxTemperature: 0.1,
    adaptationRate: 0.001,
    explorationBonus: 0.0
  },
  [TileCategory.META]: {
    baseTemperature: 2.5,
    minTemperature: 0.5,
    maxTemperature: 6.0,
    adaptationRate: 0.025,
    explorationBonus: 0.7
  }
};

// ============================================================================
// CIRCADIAN CONTROLLER
// ============================================================================

class CircadianController {
  private morningStart: number = 6;
  private afternoonStart: number = 12;
  private eveningStart: number = 18;

  getCircadianFactor(): number {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 12) {
      return 1.5;  // Morning: high exploration
    } else if (hour >= 12 && hour < 18) {
      return 1.0;  // Afternoon: normal
    } else if (hour >= 18 && hour < 24) {
      return 0.7;  // Evening: lower exploration
    } else {
      return 0.5;  // Night: minimal exploration
    }
  }

  isNighttime(): boolean {
    const hour = new Date().getHours();
    return hour < 6 || hour >= 0;
  }
}

// ============================================================================
// MAIN TEMPERATURE MANAGER
// ============================================================================

class POLLNTemperatureManager {
  private scheduler: TemperatureScheduler;
  private circadianController: CircadianController;
  private tilePolicies: Map<string, TemperaturePolicy>;
  private tilePerformance: Map<string, number[]>;
  private windowSize: number = 50;
  private step: number = 0;

  constructor(
    schedulerType: string = 'cosine',
    circadianEnabled: boolean = true
  ) {
    this.scheduler = TemperatureSchedulers[schedulerType] || TemperatureSchedulers.cosine;
    this.circadianController = new CircadianController();
    this.tilePolicies = new Map();
    this.tilePerformance = new Map();
  }

  /**
   * Register a tile with its category
   */
  registerTile(tileId: string, category: TileCategory): void {
    this.tilePolicies.set(tileId, TILE_POLICIES[category]);
    this.tilePerformance.set(tileId, []);
  }

  /**
   * Get colony-level temperature
   */
  getColonyTemperature(performance?: number): number {
    let temp = this.scheduler(this.step);

    // Apply circadian adjustment
    const circadianFactor = this.circadianController.getCircadianFactor();
    temp *= circadianFactor;

    // Apply performance adjustment
    if (performance !== undefined) {
      const adjustment = (performance - 0.5) * -0.5;
      temp = Math.max(0.1, temp + adjustment);
    }

    return Math.max(0.01, Math.min(10.0, temp));
  }

  /**
   * Get tile-level temperature
   */
  getTileTemperature(tileId: string, performance: number): number {
    const policy = this.tilePolicies.get(tileId);
    if (!policy) {
      return 1.0;  // Default temperature
    }

    // Update performance history
    const history = this.tilePerformance.get(tileId)!;
    history.push(performance);
    if (history.length > this.windowSize) {
      history.shift();
    }

    // Calculate performance-based adjustment
    let adjustment = 0;
    if (history.length >= 10) {
      const recent = history.slice(-10);
      const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
      const avgHistory = history.reduce((a, b) => a + b, 0) / history.length;

      if (avgRecent < avgHistory * 0.9) {
        adjustment = policy.adaptationRate * policy.baseTemperature;
      } else if (avgRecent > avgHistory * 1.1) {
        adjustment = -policy.adaptationRate * policy.baseTemperature;
      }
    }

    // Calculate final temperature
    let temp = policy.baseTemperature + policy.explorationBonus + adjustment;
    temp = Math.max(policy.minTemperature, Math.min(policy.maxTemperature, temp));

    return temp;
  }

  /**
   * Get context-aware temperature
   */
  getContextualTemperature(tileId: string, context: TemperatureContext): number {
    let temp = this.getTileTemperature(tileId, context.performance);

    // Apply time-of-day adjustment
    switch (context.timeOfDay) {
      case 'morning':
        temp *= 1.2;
        break;
      case 'afternoon':
        temp *= 1.0;
        break;
      case 'evening':
        temp *= 0.8;
        break;
      case 'night':
        temp *= 0.5;
        break;
    }

    // Apply task difficulty adjustment
    switch (context.taskDifficulty) {
      case 'easy':
        temp *= 0.8;
        break;
      case 'medium':
        temp *= 1.0;
        break;
      case 'hard':
        temp *= 1.5;
        break;
    }

    // Apply uncertainty adjustment
    if (context.uncertainty > 0.7) {
      temp *= 2.0;
    } else if (context.uncertainty > 0.4) {
      temp *= 1.3;
    }

    // Apply error rate adjustment
    if (context.errorRate > 0.3) {
      temp *= 1.5;
    }

    return Math.max(0.01, Math.min(10.0, temp));
  }

  /**
   * Advance simulation step
   */
  advanceStep(): void {
    this.step++;
  }

  /**
   * Get current step
   */
  getStep(): number {
    return this.step;
  }

  /**
   * Reset temperature manager
   */
  reset(): void {
    this.step = 0;
    this.tilePerformance.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  POLLNTemperatureManager,
  TemperatureScheduler,
  TemperatureSchedulers,
  TemperaturePolicy,
  TemperatureContext,
  TileCategory,
  CircadianController
};
```

### 7.2 Usage Examples

```typescript
/**
 * Example usage of temperature management system
 */

// Initialize temperature manager
const tempManager = new POLLNTemperatureManager('cosine', true);

// Register tiles
tempManager.registerTile('vision_sensor', TileCategory.PERCEPTION);
tempManager.registerTile('text_generator', TileCategory.ACTION);
tempManager.registerTile('decision_maker', TileCategory.DECISION);
tempManager.registerTile('safety_monitor', TileCategory.SAFETY);

// Get temperatures for Plinko selection
const colonyTemp = tempManager.getColonyTemperature(0.75);
const visionTemp = tempManager.getTileTemperature('vision_sensor', 0.8);
const decisionTemp = tempManager.getTileTemperature('decision_maker', 0.6);
const safetyTemp = tempManager.getTileTemperature('safety_monitor', 0.95);

console.log('Colony Temperature:', colonyTemp);
console.log('Vision Temperature:', visionTemp);
console.log('Decision Temperature:', decisionTemp);
console.log('Safety Temperature:', safetyTemp);

// Get context-aware temperature
const contextTemp = tempManager.getContextualTemperature('decision_maker', {
  step: 1000,
  performance: 0.7,
  timeOfDay: 'morning',
  taskDifficulty: 'hard',
  uncertainty: 0.6,
  errorRate: 0.2
});

console.log('Contextual Temperature:', contextTemp);

// Advance simulation
tempManager.advanceStep();
```

---

## 8. Key Findings & Recommendations

### 8.1 Summary of Answers

**1. What should temperature control in POLLN?**

Temperature should control randomness at **multiple hierarchical levels**:
- **Colony-level**: Controls which tile/agent gets activated (Plinko layer)
- **Tile-level**: Controls action selection within each tile
- **Mutation-level**: Controls variant generation strength
- **Dream-level**: Controls exploration in world model simulations

**2. How do we schedule temperature changes?**

Multiple complementary strategies:
- **Time-based**: Linear, exponential, cosine, or inverse-time decay
- **Performance-based**: Adjust based on recent performance trends
- **Entropy-based**: Maintain target entropy in selection distributions
- **Hybrid**: Combine time-based and performance-based approaches

**3. Should different tile types have different temperatures?**

**Yes**, each tile category has optimal temperature ranges:
- **Perception/Memory/Safety**: Low temperatures (0.01-1.0) for stability
- **Decision/Communication**: Medium temperatures (0.5-5.0) for balance
- **Learning/Meta**: High temperatures (1.0-8.0) for exploration

**4. How does temperature relate to day/night cycles?**

Temperature should follow **circadian rhythms**:
- **Morning (6am-12pm)**: High temperature (T=5.0) for exploration
- **Afternoon (12pm-6pm)**: Medium temperature (T=2.0) for balance
- **Evening (6pm-12am)**: Low temperature (T=0.5) for exploitation
- **Night (12am-6am)**: Near-zero temperature (T=0.01) for dreaming

**5. What about simulated annealing for optimization?**

Simulated annealing is ideal for **overnight pathway optimization**:
- Used in dreaming pipeline to optimize agent pathways
- Adaptive version maintains target acceptance rate
- Can optimize sequences, weights, and architectures

### 8.2 Implementation Recommendations

**Phase 1: Basic Temperature Control**
1. Implement colony-level temperature scheduler (cosine annealing)
2. Add tile-specific temperature policies
3. Integrate with existing Plinko layer

**Phase 2: Adaptive Temperature**
1. Add performance-based temperature adjustment
2. Implement entropy-based temperature regulation
3. Add circadian rhythm controller

**Phase 3: Advanced Features**
1. Simulated annealing for overnight optimization
2. Context-aware temperature adjustment
3. Multi-scale temperature hierarchy

**Phase 4: Monitoring & Debugging**
1. Temperature tracking and visualization
2. Performance correlation analysis
3. Adaptive parameter tuning

---

## 9. Open Questions

1. **Optimal initial temperatures**: What are the best T_initial values for each tile category?
2. **Temperature interaction**: How do colony and tile temperatures optimally interact?
3. **Crisis detection**: When should temperature be drastically increased?
4. **Multi-colony settings**: Should different colonies have different temperatures?
5. **Transfer learning**: Can optimal temperatures transfer between keepers?

---

**Document Status:** COMPLETE
**Next Steps:** Implement Phase 1 temperature control system
**Review Date:** After initial implementation

---

*Research Agent:* Orchestrator
*Date:* 2026-03-06
*Repository:* https://github.com/SuperInstance/POLLN
