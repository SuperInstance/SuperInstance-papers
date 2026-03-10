# Tile Debugging Tools: The Fisherman's Guide to Fixing Broken SMPbots

**Agent**: Orchestrator - Debugging & Diagnostics Specialist
**Date**: 2026-03-09
**Status**: Comprehensive Debugging System Design
**Voice**: Commercial fisherman - practical tips from the deck

---

## The Hook: When Your SMPbot Goes Sideways

Look, I've spent 20 years pulling nets out of the Pacific. When something's tangled, you don't curse the ocean. You trace the line, find the knot, and fix it.

SMP tiles are no different. You've got a reasoning chain that's supposed to catch fraud, predict demand, diagnose patients. But something's wrong. The confidence is tanking. The outputs are garbage. The humans are angry.

You need tools. Not theory. Tools that let you:
- **See what the tile is thinking** (variable inspection)
- **Stop it mid-stream** (breakpoints)
- **Watch the data flow** (execution traces)
- **Ask "what if this tile was different"** (what-if analysis)

This is your toolbox. Real tools. For real problems.

---

## Part 1: The Debugging Workflow

### Step 1: Recognize You've Got a Problem

Your SMPbot is broken if:
- **Confidence is too low** - Zone 3 (RED) all the time
- **Confidence is too high** - Zone 1 (GREEN) but wrong answers
- **Inconsistent results** - Same input, different outputs
- **Slow execution** - Taking longer than expected
- **Weird errors** - Stuff that shouldn't happen

**Fisherman tip**: "If the net's coming up empty three times in a row, something's wrong with the trawl. Don't blame the fish."

### Step 2: Fire Up the Tile Debugger

```typescript
// One command opens the debugger
const debugger = new TileDebugger({
  smpbotId: 'fraud-detection-v2',
  debugMode: true,
  logLevel: 'verbose',
  traceExecution: true,
  recordState: true
});

// The debugger UI appears
```

```
┌─────────────────────────────────────────────────────────────┐
│          TILE DEBUGGER - fraud-detection-v2                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Status: DEBUG MODE ON 🔍                                  │
│  Current Input: Application #312 (Sarah Johnson)           │
│  Last Output: CONFIDENCE 34% - Zone 2 (NEEDS REVIEW)       │
│                                                             │
│  [▶ Step Forward]  [⏸ Pause]  [⏮ Step Back]  [🔄 Replay]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Set Breakpoints on Tile State

Here's the breakthrough: You don't break on LINE NUMBERS (tiles don't have lines). You break on TILE STATES.

```typescript
// Example: "Stop when confidence drops below 50%"
debugger.setBreakpoint({
  type: 'tile_state',
  tileId: 'FRAUD_TILE_001',
  condition: 'state.confidence < 0.5',
  action: 'pause_and_inspect'
});

// Example: "Stop when error count spikes"
debugger.setBreakpoint({
  type: 'tile_state',
  tileId: 'FRAUD_TILE_002',
  condition: 'state.errorCount > 5',
  action: 'pause_and_inspect'
});

// Example: "Stop when ANY tile goes RED zone"
debugger.setBreakpoint({
  type: 'colony_state',
  condition: 'colony.zone === "RED"',
  action: 'pause_and_inspect'
});
```

**Fisherman tip**: "Don't set breakpoints on everything. Set 'em where the money is. Where's the decision that actually matters?"

### Step 4: Step Through the Reasoning Chain

```typescript
// Step forward through execution
while (true) {
  const event = await debugger.stepForward();

  console.log(`Tile ${event.tileId} executed:`);
  console.log(`  Input: ${JSON.stringify(event.input)}`);
  console.log(`  Output: ${JSON.stringify(event.output)}`);
  console.log(`  Confidence: ${event.confidence}`);
  console.log(`  State: ${JSON.stringify(event.state)}`);

  // Inspect variables at this point
  if (event.tileId === 'FRAUD_TILE_002') {
    const vars = await debugger.inspectVariables(event.tileId);
    console.log('Variables:', vars);
  }

  // Stop at breakpoint
  if (event.breakpointHit) {
    console.log('BREAKPOINT HIT - Paused for inspection');
    break;
  }
}
```

### Step 5: Inspect Variables at Any Point

```typescript
// Get current state of a specific tile
const tileState = await debugger.getTileState('FRAUD_TILE_002');
console.log('Tile State:', tileState);
// {
//   confidence: 0.34,
//   errorCount: 2,
//   lastInput: {...},
//   lastOutput: {...},
//   internalVariables: {
//     patternMatchScore: 0.87,
//     similarityThreshold: 0.80,
//     matchedPatterns: ['application-stacking', 'synthetic-identity']
//   }
// }

// Get state at a specific timestamp (time travel!)
const pastState = await debugger.getTileState(
  'FRAUD_TILE_002',
  timestamp - 300000  // 5 minutes ago
);

// Compare states
const diff = await debugger.compareStates(pastState, tileState);
console.log('What changed:', diff);
// [
//   { field: 'confidence', oldValue: 0.45, newValue: 0.34 },
//   { field: 'patternMatchScore', oldValue: 0.72, newValue: 0.87 }
// ]
```

### Step 6: Fix It and Verify

```typescript
// Modify variables and test the fix
await debugger.setVariable('FRAUD_TILE_002', 'similarityThreshold', 0.75);

// Replay execution with the fix
const result = await debugger.replayFromCurrentPosition();

// Check if confidence improved
if (result.confidence > 0.5) {
  console.log('Fix worked! Saving new threshold.');
  await debugger.commitChanges();
} else {
  console.log('Fix didnt work. Try something else.');
  await debugger.discardChanges();
}
```

---

## Part 2: Visual Debugging Features

### 2.1 Tile State Visualization

See what the tile is thinking in real-time:

```
┌─────────────────────────────────────────────────────────────┐
│  TILE STATE VISUALIZER - FRAUD_TILE_002                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CONFIDENCE GAUGE                                           │
│  ┌────────────────────────────────────┐                    │
│  │ ████████████░░░░░░░░  34%          │ ← Current confidence │
│  └────────────────────────────────────┘                    │
│  Zone: YELLOW (Needs Investigation)                         │
│                                                             │
│  INPUT FLOW                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Application #312 → [FRAUD_TILE_001] → Score: 34%    │   │
│  │         ↓                                           │   │
│  │   [FRAUD_TILE_002] ← Pattern: application-stacking  │   │
│  │         ↓                                           │   │
│  │   Score: 87% → [FRAUD_TILE_003]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  INTERNAL VARIABLES                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ patternMatchScore:     0.87  ████████████████████░░ │   │
│  │ similarityThreshold:   0.80  ████████████████░░░░░░ │   │
│  │ historicalMatches:     23    Count                 │   │
│  │ fraudPatternsFound:    2     [app-stacking, synth-id]│
│  │ riskFactors:           7     [age, income, debt...] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  DECISION LOG                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 09:47:23.123 → Matched pattern: application-stacking│   │
│  │ 09:47:23.145 → Score: 0.87 (threshold: 0.80)       │   │
│  │ 09:47:23.167 → Decision: HIGH_RISK                 │   │
│  │ 09:47:23.189 → Triggered: FRAUD_TILE_003           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Execution Trace Visualization

See the full causal chain of decisions:

```
┌─────────────────────────────────────────────────────────────┐
│  EXECUTION TRACE - Application #312                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TIMELINE (47ms total)                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TILE_001 │ TILE_002 │ TILE_003 │ TILE_004 │ OUTPUT │   │
│  │   12ms   │   23ms   │   8ms    │   4ms    │  done  │   │
│  │ ████████ │ ████████████████████ │ ████ │         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  CRITICAL PATH                                              │
│  TILE_001 → TILE_002 → TILE_003 → OUTPUT                   │
│      ↓         ↓                                           │
│    (12ms)    (23ms) ← BOTTLENECK                           │
│                                                             │
│  CONFIDENCE CASCADE                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TILE_001: 34% ████░░░░░░░░░░░░░░░  Zone: YELLOW    │   │
│  │    ↓                                                  │   │
│  │ TILE_002: 87% ████████████████████░  Zone: RED      │   │
│  │    ↓                                                  │   │
│  │ TILE_003: 94% █████████████████████  Zone: RED      │   │
│  │    ↓                                                  │   │
│  │ FINAL: 94.2% FRAUD (HIGH CONFIDENCE)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  TILE INTERACTIONS                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TILE_001 sent to TILE_002: "Needs investigation"    │   │
│  │ TILE_002 sent to TILE_003: "Pattern: app-stacking"  │   │
│  │ TILE_003 sent to OUTPUT: "Verified: 7 applications" │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [📥 Download Full Trace]  [🔍 Inspect Tile]  [🔄 Replay]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Confidence Flow Visualization

Watch how confidence evolves through the chain:

```
┌─────────────────────────────────────────────────────────────┐
│  CONFIDENCE FLOW DIAGRAM                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    INPUT DATA                               │
│                    (Application #312)                       │
│                           │                                 │
│                           ▼                                 │
│              ┌─────────────────────┐                       │
│              │   FRAUD_TILE_001    │                       │
│              │   Confidence: 34%   │ ← Low confidence      │
│              │   Zone: YELLOW      │   triggers cascade    │
│              └─────────┬───────────┘                       │
│                        │                                   │
│                        ▼ (needs investigation)             │
│              ┌─────────────────────┐                       │
│              │   FRAUD_TILE_002    │                       │
│              │   Pattern: 87%      │ ← High pattern match │
│              │   Zone: RED         │   escalates           │
│              └─────────┬───────────┘                       │
│                        │                                   │
│                        ▼ (high risk detected)              │
│              ┌─────────────────────┐                       │
│              │   FRAUD_TILE_003    │                       │
│              │   Verified: 94%     │ ← Confirmation        │
│              │   Zone: RED         │   solidifies risk     │
│              └─────────┬───────────┘                       │
│                        │                                   │
│                        ▼                                   │
│              ┌─────────────────────┐                       │
│              │     OUTPUT          │                       │
│              │   FINAL: 94.2%      │                       │
│              │   FRAUD CONFIRMED   │                       │
│              └─────────────────────┘                       │
│                                                             │
│  CONFIDENCE TRANSFORMATIONS                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 34% → 87%: Pattern analysis boosted confidence     │   │
│  │ 87% → 94%: Network verification confirmed risk     │   │
│  │                                                     │   │
│  │ Multiplier effect: 34% × 2.56 = 94.2%             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Fisherman tip**: "Watch the confidence flow like you watch water through the nets. Where's it getting backed up? Where's it leaking? That's where your problem is."

---

## Part 3: Error Diagnosis Patterns

### Pattern 1: The Confidence Death Spiral

**Symptoms**: Confidence keeps dropping with each tile

**What's Happening**:
```
TILE_001: 70% confidence
TILE_002: 50% confidence (dropped!)
TILE_003: 30% confidence (dropped again!)
TILE_004: 10% confidence (tanked)
```

**Root Cause**: Each tile multiplies confidence. If one tile is overly conservative, the whole chain dies.

**How to Debug**:
```typescript
// Set breakpoint on confidence drops
debugger.setBreakpoint({
  type: 'confidence_drop',
  condition: 'previousConfidence - currentConfidence > 0.15',
  action: 'pause_and_analyze'
});

// When breakpoint hits, inspect:
const tileState = await debugger.getTileState(currentTile);
console.log('Why did confidence drop?', tileState.decisionLog);

// Common causes:
// - Overly strict thresholds
// - Missing training data
// - Wrong model for this task
// - Input data quality issues
```

**Fix**:
```typescript
// Option 1: Relax the conservative tile's threshold
await debugger.setVariable('TILE_002', 'confidenceThreshold', 0.6);  // Was 0.8

// Option 2: Remove the problematic tile
const result = await debugger.whatIf('remove_tile', { tileId: 'TILE_002' });
console.log('Better without TILE_002?', result.improvement);

// Option 3: Replace with a different model
const newResult = await debugger.whatIf('replace_model', {
  tileId: 'TILE_002',
  newModel: 'less-conservative-classifier'
});
```

### Pattern 2: The Overconfident Tile

**Symptoms**: Confidence is 99% but outputs are wrong

**What's Happening**:
```
TILE_001: 99% confidence → Output: "NOT FRAUD"
Reality: This IS fraud (confirmed by human reviewer)
```

**Root Cause**: Tile is hallucinating confidence. It's seen similar patterns before and assumes this is the same.

**How to Debug**:
```typescript
// Check the tile's training history
const trainingHistory = await debugger.getTrainingHistory('TILE_001');
console.log('What was this tile trained on?', trainingHistory);

// Check for concept drift
const drift = await debugger.detectConceptDrift('TILE_001');
console.log('Has the data distribution changed?', drift.detected);

// Inspect the actual features used
const features = await debugger.getFeatureImportance('TILE_001', currentInput);
console.log('Which features drove the decision?', features);
// Output might show:
// {
//   topFeatures: [
//     { name: 'email_domain', value: 'gmail.com', weight: 0.8 },
//     { name: 'ip_address', value: '192.168.1.1', weight: 0.15 }
//   ]
// }
// Problem: Tile is over-weighting generic features
```

**Fix**:
```typescript
// Option 1: Add adversarial training
await debugger.retrainWithAdversarialExamples('TILE_001', [
  { input: fakeNotFraud, label: 'FRAUD' },
  { input: fakeNotFraud2, label: 'FRAUD' }
]);

// Option 2: Adjust confidence calibration
await debugger.setVariable('TILE_001', 'confidenceCalibration', 'temperature_scaling');

// Option 3: Add a sanity check tile
const sanityTile = await debugger.createTile({
  name: 'SANITY_CHECK',
  model: 'rule-based-validator',
  prompt: 'Double-check high-confidence decisions',
  trigger: 'confidence > 0.9'
});
```

### Pattern 3: The Timeout Tile

**Symptoms**: One tile takes forever, blocks everything

**What's Happening**:
```
TILE_001: 10ms ✓
TILE_002: 5000ms ✗ (SLOW!)
TILE_003: Blocked
```

**Root Cause**: Tile is making too many LLM calls, or processing too much data, or stuck in a loop.

**How to Debug**:
```typescript
// Profile the slow tile
const profile = await debugger.profileTile('TILE_002');
console.log('Where's the time going?', profile);
// Output:
// {
//   totalTime: 5000,
//   breakdown: {
//     llmCalls: 4500,  // 90% of time!
//     dataProcessing: 400,
//     other: 100
//   },
//   llmCallCount: 47  // Making 47 LLM calls?!
// }

// Inspect the inputs
const inputSize = await debugger.getInputSize('TILE_002');
console.log('How much data?', inputSize);
// Output: "15,000 tokens" → That's too much!

// Check for loops
const loops = await debugger.detectLoops('TILE_002');
console.log('Any infinite loops?', loops.detected);
```

**Fix**:
```typescript
// Option 1: Cache LLM calls
await debugger.setVariable('TILE_002', 'cacheEnabled', true);

// Option 2: Batch LLM calls
await debugger.setVariable('TILE_002', 'batchSize', 10);

// Option 3: Add timeout with fallback
await debugger.setVariable('TILE_002', 'timeout', 1000);
await debugger.setVariable('TILE_002', 'fallbackStrategy', 'use_cached');

// Option 4: Switch to smaller model
const result = await debugger.whatIf('replace_model', {
  tileId: 'TILE_002',
  newModel: 'distilled-llama-7b'  // Instead of gpt-4
});
console.log('Faster with small model?', result.speedup);
```

### Pattern 4: The Phantom Error

**Symptoms**: Error appears once, never reproduces

**What's Happening**:
```
09:47:23 → Error: "Division by zero in TILE_003"
09:47:24 → Try again → Works fine
09:47:25 → Try again → Works fine
```

**Root Cause**: Race condition, timing issue, or non-deterministic LLM output

**How to Debug**:
```typescript
// Enable full recording (including random seeds)
debugger.startRecording({
  captureRandomSeeds: true,
  captureTiming: true,
  captureLLMOutputs: true
});

// Reproduce the error (might take many tries)
while (true) {
  const result = await debugger.execute();

  if (result.error) {
    debugger.stopRecording();
    debugger.saveRecording('phantom_error.json');
    break;
  }
}

// Load the recording and inspect
debugger.loadRecording('phantom_error.json');
debugger.startReplay();

// Step through EXACTLY as it happened
const event = await debugger.stepForward();
console.log('Random seed:', event.randomSeed);
console.log('Timing:', event.timing);
console.log('LLM output:', event.llmOutput);
```

**Fix**:
```typescript
// Option 1: Fix the actual bug (e.g., handle zero division)
await debugger.setVariable('TILE_003', 'divideByZeroHandling', 'return_zero');

// Option 2: Add deterministic mode
await debugger.setVariable('TILE_003', 'deterministicMode', true);

// Option 3: Add retry with backoff
await debugger.setVariable('TILE_003', 'retryOnFailure', true);
await debugger.setVariable('TILE_003', 'maxRetries', 3);
```

---

## Part 4: Real-World Debugging Examples

### Example 1: Debugging the Fraud Detection Tile

**The Problem**: Maya's credit union is blocking legitimate applicants. The fraud tile is flagging teachers as fraudsters.

**Step 1: Reproduce the Issue**
```typescript
// Load the problematic application
const testCase = {
  applicant: 'Sarah Johnson, Teacher, 42, $65k income',
  loanAmount: 15000,
  purpose: 'Home renovation'
};

// Run through the fraud detection tile
const result = await fraudTile.execute(testCase);
console.log('Result:', result);
// Output: { confidence: 0.94, decision: 'FRAUD', zone: 'RED' }
// Wait, why is this fraud?
```

**Step 2: Inspect the Decision**
```typescript
// See which tiles flagged this
const trace = await debugger.getExecutionTrace(result.traceId);
console.log('Tile decisions:', trace.tiles);
// Output:
// [
//   { tile: 'FRAUD_TILE_001', confidence: 0.34, zone: 'YELLOW' },
//   { tile: 'FRAUD_TILE_002', confidence: 0.87, zone: 'RED', reason: 'Pattern: application-stacking' },
//   { tile: 'FRAUD_TILE_003', confidence: 0.94, zone: 'RED', reason: '7 applications found' }
// ]

// Hmm, TILE_002 thinks this is application stacking
```

**Step 3: Dive Into TILE_002**
```typescript
// Get TILE_002's internal state
const tileState = await debugger.getTileState('FRAUD_TILE_002', result.timestamp);
console.log('Pattern match details:', tileState.patternMatch);
// Output:
// {
//   matchedPattern: 'application-stacking',
//   similarity: 0.87,
//   indicators: [
//     'Multiple applications in 48 hours',
//     'Similar employment history',
//     'Phone number matches'
//   ]
// }

// But Sarah only applied HERE. Why does it think she applied elsewhere?
```

**Step 4: Check the Network Check Tile**
```typescript
// See what TILE_003 actually found
const networkCheck = await debugger.inspectTile('FRAUD_TILE_003', result.timestamp);
console.log('Network check result:', networkCheck.queryResult);
// Output:
// {
//   query: 'Sarah Johnson, Portland OR',
//   results: 7,
//   institutions: ['Chase', 'BofA', 'Wells Fargo', ...],
//   timeframe: 'last 48 hours'
// }

// Oh! The tile is searching by name + city, not name + SSN
// Sarah Johnson is a common name. These are DIFFERENT Sarah Johnsons!
```

**Step 5: Fix the Bug**
```typescript
// Modify the network check query to include SSN
await debugger.setVariable('FRAUD_TILE_003', 'queryFields', ['name', 'ssn', 'dob']);
await debugger.setVariable('FRAUD_TILE_003', 'queryFields', ['name', 'city']);  // Remove this!

// Replay with the fix
const newResult = await debugger.replayWithFix();
console.log('New result:', newResult);
// Output: { confidence: 0.12, decision: 'LEGITIMATE', zone: 'GREEN' }

// Fixed! The tile now correctly identifies this as legitimate
```

**Fisherman tip**: "The bug wasn't in the AI. It was in the QUERY. The AI was doing exactly what we told it to do - we just told it wrong."

### Example 2: Debugging the Counterfactual Diagnosis Tile

**The Problem**: Dr. Chen's diagnosis tile is giving weird results. Pulmonary embolism probability keeps changing every time she runs it.

**Step 1: Reproduce the Non-Determinism**
```typescript
// Run the diagnosis 10 times with the same patient data
const patientData = {
  age: 58,
  symptoms: ['chest pain', 'elevated d-dimer'],
  vitals: { bp: '165/105', hr: 112 }
};

const results = [];
for (let i = 0; i < 10; i++) {
  const result = await diagnosisTile.execute(patientData);
  results.push(result.peProbability);
}

console.log('PE Probabilities:', results);
// Output: [0.287, 0.291, 0.284, 0.289, 0.286, 0.292, 0.285, 0.288, 0.290, 0.283]
// Variance: 0.009 (not huge, but concerning for medical decisions)
```

**Step 2: Check for Random Seeds**
```typescript
// Enable deterministic mode
await debugger.setVariable('Diagnosis_CounterfactualEngine', 'deterministicMode', true);
await debugger.setVariable('Diagnosis_CounterfactualEngine', 'randomSeed', 42);

// Run again 10 times
const deterministicResults = [];
for (let i = 0; i < 10; i++) {
  const result = await diagnosisTile.execute(patientData);
  deterministicResults.push(result.peProbability);
}

console.log('Deterministic results:', deterministicResults);
// Output: [0.287, 0.287, 0.287, 0.287, 0.287, 0.287, 0.287, 0.287, 0.287, 0.287]
// Perfect! The non-determinism was from random seed variation
```

**Step 3: But Why Was It Varying?**
```typescript
// Check what uses randomness
const randomUsages = await debugger.findRandomness('Diagnosis_CounterfactualEngine');
console.log('Random operations:', randomUsages);
// Output:
// [
//   { operation: 'monte_carlo_sampling', iterations: 1000 },
//   { operation: 'parameter_jitter', range: 0.05 }
// ]

// The tile runs 1000 Monte Carlo simulations with parameter jitter
// Different random seeds = slightly different simulation results
```

**Step 4: Is 1000 Iterations Enough?**
```typescript
// Test convergence with different iteration counts
const convergenceTest = await debugger.testConvergence([100, 500, 1000, 5000, 10000]);
console.log('Convergence:', convergenceTest);
// Output:
// {
//   100: { mean: 0.31, std: 0.08, converged: false },
//   500: { mean: 0.29, std: 0.03, converged: false },
//   1000: { mean: 0.287, std: 0.009, converged: true },
//   5000: { mean: 0.2865, std: 0.004, converged: true },
//   10000: { mean: 0.2863, std: 0.003, converged: true }
// }

// 1000 iterations is reasonable. More iterations help but have diminishing returns
```

**Step 5: Add Confidence Intervals**
```typescript
// The fix isn't to eliminate variance, but to QUANTIFY it
await debugger.setVariable('Diagnosis_CounterfactualEngine', 'reportConfidenceIntervals', true);

// Now the output includes uncertainty
const result = await diagnosisTile.execute(patientData);
console.log('Result with CI:', result);
// Output:
// {
//   peProbability: 0.287,
//   confidenceInterval: [0.278, 0.296],  // 95% CI
//   standardError: 0.009,
//   recommendation: "PE probability 28.7% (95% CI: 27.8%-29.6%)"
// }

// Dr. Chen now sees the uncertainty and can explain it to patients
```

**Fisherman tip**: "Don't hide the variance. Show it. Doctors need to know the certainty level. A 28.7% ± 0.3% probability is different from 28.7% ± 5%."

---

## Part 5: Integration with Development Workflow

### Debug Mode Indicator

Your SMPbot should clearly show when it's in debug mode:

```typescript
// Add debug mode indicator to the tile
class DebuggableTile {
  constructor(config) {
    this.debugMode = config.debugMode || false;

    if (this.debugMode) {
      this.showDebugIndicator();
    }
  }

  showDebugIndicator() {
    // Visual indicator in the UI
    const indicator = {
      icon: '🔍',
      color: 'amber',
      text: 'DEBUG MODE',
      tooltip: 'Tile is running with full instrumentation enabled'
    };

    // Add to tile UI
    this.ui.addIndicator(indicator);

    // Log to console
    console.log(`[DEBUG] Tile ${this.id} running in debug mode`);
  }
}
```

### Conditional Debugging

Only enable debugging when needed:

```typescript
// Environment-based debug mode
const isProduction = process.env.NODE_ENV === 'production';
const shouldDebug = !isProduction || process.env.FORCE_DEBUG === 'true';

const tile = new SMPBot({
  id: 'fraud-detection-v2',
  debugMode: shouldDebug,
  logLevel: shouldDebug ? 'verbose' : 'error'
});
```

### Debug Presets

Common debugging configurations:

```typescript
const debugPresets = {
  // Quick overview (minimal overhead)
  quick: {
    traceExecution: true,
    recordState: false,
    logLevel: 'info'
  },

  // Full investigation (max overhead)
  full: {
    traceExecution: true,
    recordState: true,
    logLevel: 'verbose',
    captureLLMCalls: true,
    recordTimings: true,
    saveSnapshots: true
  },

  // Performance profiling
  performance: {
    traceExecution: true,
    recordTimings: true,
    profileMemory: true,
    logLevel: 'warn'
  },

  // Error hunting
  errors: {
    traceExecution: true,
    recordErrors: true,
    recordStackTraces: true,
    logLevel: 'error'
  }
};

// Use preset
const tile = new SMPBot({
  id: 'fraud-detection-v2',
  debugConfig: debugPresets.full
});
```

---

## Part 6: The Fisherman's Debugging Checklist

When your SMPbot goes sideways, work through this checklist:

### Phase 1: Quick Assessment (5 minutes)
- [ ] Is it in debug mode?
- [ ] What's the current confidence level?
- [ ] Which zone is it in (GREEN/YELLOW/RED)?
- [ ] Any obvious errors in the logs?
- [ ] Is it slow, wrong, or both?

### Phase 2: Identify the Culprit (15 minutes)
- [ ] Run with execution trace enabled
- [ ] Which tile has the lowest confidence?
- [ ] Which tile takes the longest?
- [ ] Any tiles timing out?
- [ ] Set breakpoint on the suspicious tile

### Phase 3: Deep Dive (30 minutes)
- [ ] Inspect the tile's internal variables
- [ ] Check the input data quality
- [ ] Review the tile's decision log
- [ ] Compare with a known-good case
- [ ] Check for concept drift

### Phase 4: Test the Fix (15 minutes)
- [ ] Modify variables with the debugger
- [ ] Replay execution with the fix
- [ ] Verify confidence improved
- [ ] Check for side effects
- [ ] Commit or discard changes

### Phase 5: Long-term Fix (1 hour)
- [ ] Update the tile's code/model
- [ ] Add unit tests for this case
- [ ] Update documentation
- [ ] Share learning with team
- [ ] Monitor for recurrence

---

## Part 7: Advanced Debugging Techniques

### Technique 1: Differential Debugging

Compare your broken tile with a working one:

```typescript
// Run the same input through two different tiles
const input = { /* test data */ };

const brokenResult = await brokenTile.execute(input);
const workingResult = await workingTile.execute(input);

// Compare the execution paths
const diff = await debugger.compareExecutions(brokenResult.traceId, workingResult.traceId);
console.log('Differences:', diff);
// Output:
// {
//   divergeAt: 'TILE_003',
//   brokenPath: { confidence: 0.34, decision: 'REJECT' },
//   workingPath: { confidence: 0.87, decision: 'ACCEPT' },
//   stateDiff: {
//     threshold: { broken: 0.8, working: 0.5 }  // Aha!
//   }
// }
```

### Technique 2: Binary Search Debugging

Find the exact point where things break:

```typescript
// You have a working case and a broken case
// Binary search to find the breaking input

const workingInput = { /* known good */ };
const brokenInput = { /* known bad */ };

const breakingPoint = await debugger.binarySearch(workingInput, brokenInput, async (input) => {
  const result = await tile.execute(input);
  return result.confidence > 0.5;  // Returns true if working
});

console.log('Breaking input:', breakingPoint);
// Output: "The tile breaks when income > $100k"
```

### Technique 3: Adversarial Testing

Find edge cases that break your tile:

```typescript
// Automatically generate adversarial examples
const adversarialExamples = await debugger.generateAdversarialExamples(tile, {
  target: 'confidence',
  direction: 'decrease',  // Find inputs that lower confidence
  maxIterations: 1000
});

console.log('Worst cases:', adversarialExamples.slice(0, 10));
// Output:
// [
//   { input: {...}, confidence: 0.02, reason: 'extreme values' },
//   { input: {...}, confidence: 0.05, reason: 'missing fields' },
//   ...
// ]
```

### Technique 4: Causal Debugging

Understand WHY a tile made a decision:

```typescript
// Get the causal chain for a decision
const causalChain = await debugger.getCausalChain(result.traceId);

console.log('Causal chain:', causalChain);
// Output:
// {
//   decision: 'FRAUD',
//   causes: [
//     { factor: 'multiple_applications', contribution: 0.4 },
//     { factor: 'synthetic_identity', contribution: 0.3 },
//     { factor: 'income_discrepancy', contribution: 0.2 },
//     { factor: 'other_factors', contribution: 0.1 }
//   ],
//   counterfactuals: [
//     { change: 'remove_multiple_applications', newConfidence: 0.54 },
//     { change: 'fix_income_discrepancy', newConfidence: 0.74 }
//   ]
// }
```

---

## Conclusion: The Fisherman's Philosophy

Debugging SMP tiles is like fixing a trawler net:

1. **Don't guess** - Trace the line, find the knot
2. **One thing at a time** - Fix one break, then check the next
3. **Trust your tools** - The debugger doesn't lie
4. **Learn from every catch** - Every bug teaches you something
5. **Share the knowledge** - Tell the crew what you found

The tools in this document let you:
- **See** what tiles are thinking (state visualization)
- **Stop** them mid-stream (breakpoints)
- **Ask** what-if questions (what-if analysis)
- **Learn** from mistakes (post-mortem analysis)

This isn't just debugging. This is **understanding**. And understanding is how you build systems that actually work.

---

**Status**: Comprehensive debugging system designed
**Next Steps**: Build the Tile Debugger UI, add to SMP white paper
**Confidence**: High - These are proven techniques, adapted for SMP tiles

---

*Debugging isn't a chore. It's how you learn what your system is really doing.*
*The debugger is your friend. Use it.*
