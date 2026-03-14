# @superinstance/equipment-self-improvement

> Self-modifying equipment that distills what agents need to know for stable tiling.

## Overview

This equipment enables SuperInstance agents to continuously improve their own performance through:

- **Performance Monitoring** - Track metrics like accuracy, latency, cost, and detect anomalies
- **Knowledge Distillation** - Extract stable patterns from agent observations
- **Tile Optimization** - Optimize knowledge structures for stable tiling
- **Self-Modification** - Modify parameters and configurations to improve performance
- **Maturation** - "Mature into cells" by transforming complex structures into streamlined components

## Installation

```bash
npm install @superinstance/equipment-self-improvement
```

## Quick Start

```typescript
import { SelfImprovement } from '@superinstance/equipment-self-improvement';

// Create the self-improvement equipment
const selfImprovement = new SelfImprovement({
  autoImprove: true,
  improvementIntervalMs: 300000, // 5 minutes
});

// Record performance metrics
selfImprovement.recordMetric({
  metricType: 'accuracy',
  value: 0.95,
  unit: 'ratio',
  context: { taskId: 'task-123' }
});

// Add observations for knowledge distillation
selfImprovement.addObservation({
  agentId: 'agent-1',
  context: { domain: 'finance' },
  inputs: { query: 'Analyze stock trends' },
  actions: [
    { type: 'analyze', parameters: { depth: 'full' }, result: 'success', success: true }
  ],
  outcomes: { accuracy: 0.92, latency: 150 },
  success: true,
  duration: 1500
});

// Add tiles for optimization
selfImprovement.addTile({
  name: 'decision-tile',
  type: 'decision',
  size: 'meso',
  complexity: 0.6,
  stability: 0.8,
  efficiency: 0.85,
  dependencies: [],
  knowledge: {
    patterns: [],
    rules: [],
    examples: [],
    constraints: []
  },
  metadata: {
    version: '1.0',
    author: 'system',
    tags: ['decision', 'core'],
    description: 'Core decision making tile',
    maturityLevel: 0.5,
    deconstructionLevel: 0
  }
});

// Run an improvement cycle
const result = await selfImprovement.runImprovementCycle();
console.log('Improvement result:', result.overallImprovement);

// Mature into streamlined cells
const maturation = await selfImprovement.matureIntoCells({
  targetComplexityReduction: 0.3,
  minStabilityThreshold: 0.7
});
console.log('Maturation complete:', maturation.resultingCells.length, 'cells');
```

## Core Components

### PerformanceMonitor

Tracks and analyzes performance metrics over time.

```typescript
import { PerformanceMonitor } from '@superinstance/equipment-self-improvement';

const monitor = new PerformanceMonitor(10000); // Max 10k metrics

// Record metrics
monitor.recordMetric({
  metricType: 'latency',
  value: 150,
  unit: 'ms',
  context: { endpoint: '/api/process' }
});

// Get performance snapshot
const snapshot = monitor.createSnapshot();

// Detect anomalies
const anomalies = monitor.detectAnomalies();

// Get improvement opportunities
const opportunities = monitor.identifyImprovementOpportunities();
```

#### Supported Metric Types

- `accuracy` - Correctness of outputs (0-1)
- `latency` - Response time in milliseconds
- `cost` - Resource cost per operation
- `throughput` - Operations per time unit
- `error_rate` - Error frequency (0-1)
- `memory_usage` - Memory consumption
- `cpu_usage` - CPU utilization
- `response_quality` - Quality score of responses
- `task_completion_rate` - Successful task completion ratio
- `consensus_agreement` - Agreement level in consensus operations

### KnowledgeDistiller

Extracts reusable patterns from agent observations.

```typescript
import { KnowledgeDistiller } from '@superinstance/equipment-self-improvement';

const distiller = new KnowledgeDistiller({
  minSampleSize: 10,
  minConfidence: 0.7,
  minSuccessRate: 0.6
});

// Add observations
distiller.addObservation({
  agentId: 'agent-1',
  context: { task: 'analysis' },
  inputs: { data: '...' },
  actions: [
    { type: 'process', parameters: {}, result: 'done', success: true }
  ],
  outcomes: { score: 0.9 },
  success: true,
  duration: 100
});

// Run distillation
const result = distiller.distill();

// Get patterns
const patterns = distiller.getPatterns();
const stablePatterns = distiller.getStablePatterns();
```

#### Pattern Categories

- `decision` - Decision-making patterns
- `transformation` - Data transformation patterns
- `validation` - Validation and checking patterns
- `optimization` - Performance optimization patterns
- `coordination` - Multi-agent coordination patterns
- `recovery` - Error recovery patterns
- `learning` - Learning and adaptation patterns
- `communication` - Inter-agent communication patterns

### TileOptimizer

Optimizes tile structures for stability and efficiency.

```typescript
import { TileOptimizer } from '@superinstance/equipment-self-improvement';

const optimizer = new TileOptimizer();

// Add tiles
const tile = optimizer.addTile({
  name: 'analysis-tile',
  type: 'transformation',
  size: 'meso',
  complexity: 0.7,
  stability: 0.6,
  efficiency: 0.8,
  dependencies: [],
  knowledge: {
    patterns: ['pattern-1'],
    rules: [
      { id: 'r1', condition: 'input.size > 100', action: 'batch', priority: 1, confidence: 0.9 }
    ],
    examples: [],
    constraints: []
  },
  metadata: {
    version: '1.0',
    author: 'system',
    tags: ['analysis'],
    description: 'Analysis tile',
    maturityLevel: 0.5,
    deconstructionLevel: 0
  }
});

// Analyze stability
const analysis = optimizer.analyzeStability(tile.id);

// Run optimization
const result = optimizer.optimize();

// Deconstruct complex tiles
const deconstruction = optimizer.deconstruct(tile.id);
```

#### Tile Sizes

- `nano` - Smallest unit, single operation
- `micro` - Small composite, few operations
- `meso` - Medium composite, moderate complexity
- `macro` - Large composite, high complexity

### SelfModifier

Enables controlled self-modification of parameters and configurations.

```typescript
import { SelfModifier } from '@superinstance/equipment-self-improvement';

const modifier = new SelfModifier({
  policy: {
    allowedTypes: ['parameter_adjustment', 'threshold_change'],
    requireApproval: false,
    riskTolerance: 'moderate'
  }
});

// Propose a modification
const proposal = modifier.proposeModification(
  'parameter_adjustment',
  'learning_rate',
  0.15,
  'Improve adaptation speed',
  'optimization_cycle'
);

// Apply modification
const result = modifier.applyModification(proposal.id);

// Auto-propose modifications
const proposals = modifier.autoProposeModifications();
```

#### Modification Types

- `parameter_adjustment` - Adjust operational parameters
- `threshold_change` - Modify thresholds and limits
- `rule_modification` - Update knowledge rules
- `pattern_update` - Update distilled patterns
- `tile_restructure` - Restructure tile organization
- `dependency_change` - Modify tile dependencies
- `algorithm_swap` - Swap algorithms
- `weight_adjustment` - Adjust weights
- `strategy_change` - Change strategies
- `constraint_modification` - Modify constraints

## Maturation Process

The "mature into cells" process transforms complex structures into streamlined, stable components:

```typescript
const maturation = await selfImprovement.matureIntoCells({
  targetComplexityReduction: 0.3,  // Reduce complexity by 30%
  minStabilityThreshold: 0.7,      // Minimum stability for mature cells
  maxCellSize: 'micro',            // Maximum size after maturation
  preservePatterns: true,          // Preserve stable patterns
  verbose: true                    // Log maturation steps
});

console.log('Before:', maturation.beforeCellCount, 'cells');
console.log('After:', maturation.afterCellCount, 'cells');
console.log('Complexity reduction:', maturation.complexityReduction);
console.log('Stability improvement:', maturation.stabilityImprovement);
```

### Maturation Steps

1. **Identify High-Complexity Tiles** - Find tiles exceeding complexity thresholds
2. **Deconstruct Tiles** - Split into smaller, more manageable cells
3. **Optimize Structures** - Run tile optimization
4. **Merge Similar Cells** - Combine cells with overlapping patterns
5. **Remove Unstable Cells** - Discard cells below stability threshold
6. **Final Optimization** - Ensure overall system stability

## Improvement Cycles

Run automatic improvement cycles:

```typescript
// Start automatic improvement
selfImprovement.startAutoImprovement();

// Or run manually
const result = await selfImprovement.runImprovementCycle();

console.log('Metrics analyzed:', result.metricsAnalyzed);
console.log('Anomalies detected:', result.anomaliesDetected);
console.log('Patterns extracted:', result.patternsExtracted);
console.log('Tiles optimized:', result.tilesOptimized);
console.log('Modifications applied:', result.modificationsApplied);
console.log('Overall improvement:', result.overallImprovement);

// Stop automatic improvement
selfImprovement.stopAutoImprovement();
```

### Improvement Cycle Phases

1. **Performance Analysis** - Analyze metrics and detect anomalies
2. **Knowledge Distillation** - Extract and refine patterns
3. **Tile Optimization** - Optimize tile structures
4. **Self Modification** - Apply beneficial modifications

## State Persistence

Export and import complete state:

```typescript
// Export state
const state = selfImprovement.exportState();
// Save to file/database...

// Import state
selfImprovement.importState(state);
```

## Monitoring and Reporting

```typescript
// Get current status
const status = selfImprovement.getStatus();
console.log('Health:', status.health);
console.log('Average stability:', status.averageStability);
console.log('Patterns distilled:', status.patternsDistilled);

// Get improvement history
const history = selfImprovement.getImprovementHistory();

// Get maturity history
const maturity = selfImprovement.getMaturityHistory();
console.log('Current maturity:', selfImprovement.getCurrentMaturity());
```

## API Reference

### SelfImprovement

Main equipment class that integrates all components.

#### Constructor

```typescript
new SelfImprovement(config?: SelfImprovementConfig)
```

#### Methods

| Method | Description |
|--------|-------------|
| `recordMetric(metric)` | Record a performance metric |
| `recordMetrics(metrics)` | Record multiple metrics |
| `getPerformanceSnapshot()` | Get current performance snapshot |
| `detectAnomalies()` | Detect performance anomalies |
| `getImprovementOpportunities()` | Get identified improvement opportunities |
| `addObservation(observation)` | Add observation for distillation |
| `addObservations(observations)` | Add multiple observations |
| `distillKnowledge()` | Run knowledge distillation |
| `getPatterns()` | Get all distilled patterns |
| `getStablePatterns()` | Get patterns suitable for tiling |
| `addTile(tile)` | Add a tile for optimization |
| `addTiles(tiles)` | Add multiple tiles |
| `getTiles()` | Get all tiles |
| `analyzeTileStability(id)` | Analyze tile stability |
| `optimizeTiles()` | Run tile optimization |
| `deconstructTile(id)` | Deconstruct a tile |
| `proposeModification(...)` | Propose a modification |
| `applyModification(id)` | Apply a proposed modification |
| `getPendingModifications()` | Get pending modification proposals |
| `getModificationHistory()` | Get modification history |
| `autoProposeModifications()` | Auto-generate modification proposals |
| `startAutoImprovement()` | Start automatic improvement cycles |
| `stopAutoImprovement()` | Stop automatic improvement |
| `runImprovementCycle()` | Run a complete improvement cycle |
| `matureIntoCells(options)` | Run maturation process |
| `deconstructComplexLogic(threshold)` | Deconstruct high-complexity tiles |
| `getStatus()` | Get current status |
| `getImprovementHistory()` | Get improvement history |
| `getMaturityHistory()` | Get maturity history |
| `getCurrentMaturity()` | Get current maturity level |
| `exportState()` | Export complete state |
| `importState(state)` | Import state |

## License

MIT
