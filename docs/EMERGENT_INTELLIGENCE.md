# Emergent Granular Intelligence System

## Overview

The Emergent Granular Intelligence (EGI) system implements the hydraulic system metaphor for detecting and managing emergent intelligence in multi-agent systems. Based on the research in `docs/research/EMERGENT_GRANULAR_INTELLIGENCE_*.md`, this system provides:

- **Hydraulic Framework**: Models agent interactions as fluid dynamics (pressure, flow, valves, pumps)
- **Emergence Detection**: Identifies novel capabilities that emerge from agent collaboration
- **Enhanced Stigmergy**: Advanced indirect coordination with decay modeling, interference handling, and adaptive signals

## Installation

The EGI system is included in the POLLN core library:

```typescript
import {
  // Hydraulic Framework
  PressureSensor,
  FlowMonitor,
  ValveController,
  PumpManager,
  ReservoirManager,

  // Emergence Detection
  EmergenceDetector,
  EmergenceCatalog,
  EmergenceAnalyzer,
  EmergenceMetricsCalculator,

  // Enhanced Stigmergy
  EnhancedStigmergy,
} from 'polln/core';
```

## Quick Start

### Basic Emergence Detection

```typescript
import { EmergenceDetector } from 'polln/core';

// Create detector
const detector = new EmergenceDetector({
  minEmergenceScore: 0.7,
  autoCatalog: true,
});

// Register agent capabilities
detector.registerAgentCapabilities('agent-1', ['syntax', 'parsing']);
detector.registerAgentCapabilities('agent-2', ['security', 'scanning']);
detector.registerAgentCapabilities('agent-3', ['optimization', 'analysis']);

// Analyze causal chains for emergence
const chains = await getCausalChains();
const analysis = await detector.analyzeEmergence(chains);

console.log(`Found ${analysis.behaviors.length} emergent behaviors`);
console.log(`Emergence score: ${analysis.metrics.overallScore}`);
```

### Hydraulic Monitoring

```typescript
import { PressureSensor, FlowMonitor, ValveController } from 'polln/core';

// Create hydraulic components
const pressureSensor = new PressureSensor();
const flowMonitor = new FlowMonitor();
const valveController = new ValveController();

// Register agents
pressureSensor.registerAgent('agent-1', 0.5);
valveController.registerValve('agent-1');

// Monitor pressure
const pressure = pressureSensor.updatePressure(
  'agent-1',
  0.3,  // incoming signals
  0.2,  // external demand
  0.1   // internal state
);

console.log(`Agent pressure: ${pressure.value}`);

// Make stochastic selection
const decision = valveController.selectAgent([
  { agentId: 'agent-1', score: 0.8 },
  { agentId: 'agent-2', score: 0.6 },
], 1.0); // temperature

console.log(`Selected: ${decision.agentId}`);
```

### Enhanced Stigmergy

```typescript
import { EnhancedStigmergy, PheromoneType } from 'polln/core';

const stigmergy = new EnhancedStigmergy({
  maxPheromones: 1000,
  defaultHalfLife: 60000,
});

// Deposit pheromone with adaptive strength
const position = { topic: 'code-review' };
const pheromone = stigmergy.deposit(
  'agent-1',
  PheromoneType.PATHWAY,
  position,
  1.0
);

// Detect with interference applied
const detected = stigmergy.detect(position);
console.log(`Nearby pheromones: ${detected.nearby.length}`);
console.log(`Interference patterns: ${detected.interference.length}`);

// Create and visualize trail
const trailId = stigmergy.startTrail(position);
stigmergy.addToTrail(trailId, pheromone.id, position, pheromone.strength);

const visualization = stigmergy.visualizeTrail(trailId);
console.log(`Trail length: ${visualization.totalLength}`);
```

## CLI Commands

### Monitor Emergence Metrics

```bash
npm run emergence:metrics
```

Display complexity, novelty, and synergy metrics.

### List Cataloged Abilities

```bash
npm run emergence:catalog -- --top 20
```

Show top 20 emergent abilities in the catalog.

### Check Hydraulic Status

```bash
npm run hydraulic:status
```

Display pressure, flow, valves, and pump statistics.

### Real-time Monitoring

```bash
npm run emergence:watch -- --interval 5000
```

Monitor emergence in real-time (updates every 5 seconds).

## Web Dashboard

Start the web dashboard:

```typescript
import { EmergenceDashboard } from 'polln/dashboard';

const dashboard = new EmergenceDashboard(3000);
await dashboard.start();

// Dashboard available at http://localhost:3000
```

The dashboard provides:
- Real-time emergence metrics
- Hydraulic system visualization
- Emergent behavior tracking
- Cataloged abilities browser
- Stigmergy trail visualization

## Architecture

### Hydraulic Framework

The hydraulic framework models agent interactions as a fluid system:

| Component | Description | Implementation |
|-----------|-------------|----------------|
| **Pressure** | Task demand/signal strength | `PressureSensor` |
| **Flow** | Information transfer | `FlowMonitor` |
| **Valves** | Stochastic routing | `ValveController` |
| **Pumps** | Capability amplification | `PumpManager` |
| **Reservoirs** | Cached patterns | `ReservoirManager` |
| **Pipes** | Communication pathways | Managed by `FlowMonitor` |

**Pressure Equation:**
```
Pᵢ(t) = Σⱼ wᵢⱼ · Aⱼ(t) + λ·Φᵢ(t) + Ψᵢ(t)
```

**Flow Equation:**
```
Qᵢⱼ = σ(Pⱼ - Pᵢ) · wᵢⱼ · (1 - Rᵢⱼ)
```

### Emergence Detection

The emergence detector identifies novel capabilities through:

1. **Novelty Detection**
   - Outcome novelty: Never seen before
   - Composition novelty: New agent combination
   - Assembly novelty: Capabilities never co-located

2. **Metrics Calculation**
   - Complexity: Graph entropy, pathway diversity
   - Novelty: Outcome, pathway, composition metrics
   - Synergy: Mutual information, integration

3. **Pattern Recognition**
   - Identify repeating agent compositions
   - Track outcome consistency
   - Measure pattern strength

**Emergence Condition:**
```
∃E : ¬∃aᵢ ∈ A, capability(aᵢ) ⊢ E
  ∧ ∃path = (a₁, a₂, ..., aₖ) : compose(path) ⊢ E
```

### Enhanced Stigmergy

Advanced stigmergic coordination with:

- **Decay Modeling**: Exponential, linear, logistic, or custom decay functions
- **Trail Visualization**: Track and visualize pheromone trails
- **Interference Handling**: Detect constructive/destructive signal interactions
- **Adaptive Strength**: Adjust signal strength based on crowding and interference

## Examples

### Example 1: Code Review Colony

```typescript
import {
  Colony,
  EmergenceDetector,
  EnhancedStigmergy,
  PheromoneType,
} from 'polln/core';

// Create colony
const colony = new Colony({
  id: 'code-review-colony',
  maxAgents: 50,
});

// Initialize emergence detection
const detector = new EmergenceDetector();
detector.registerAgentCapabilities('syntax-validator', ['syntax', 'parsing']);
detector.registerAgentCapabilities('security-scanner', ['security', 'vulnerability']);
detector.registerAgentCapabilities('performance-analyzer', ['performance', 'optimization']);

// Initialize stigmergy
const stigmergy = new EnhancedStigmergy();

// Process code review
const result = await colony.process({
  type: 'code-review',
  code: sampleCode,
});

// Analyze for emergence
const chains = result.causalChains;
const analysis = await detector.analyzeEmergence(chains);

if (analysis.behaviors.length > 0) {
  console.log('Emergent behaviors detected!');
  for (const behavior of analysis.behaviors) {
    console.log(`- ${behavior.name} (score: ${behavior.emergenceScore})`);
  }
}
```

### Example 2: Research Assistant

```typescript
import {
  EmergenceCatalog,
  EmergenceCategory,
} from 'polln/core';

const catalog = new EmergenceCatalog();

// Catalog emergent ability
const ability = catalog.catalogBehavior({
  id: 'behavior-1',
  name: 'Cross-Domain Synthesis',
  description: 'Synthesizes insights from multiple research domains',
  discoveredAt: Date.now(),
  causalChainId: 'chain-1',
  participatingAgents: ['researcher-1', 'analyst-2', 'synthesizer-3'],
  capabilities: ['analysis', 'synthesis', 'writing'],
  outcome: 'Novel research hypothesis',
  emergenceScore: 0.85,
  noveltyFactors: {
    novelOutcome: true,
    novelComposition: true,
    novelAssembly: true,
    surprise: true,
  },
  validationStatus: 'candidate',
  lastSeen: Date.now(),
  occurrenceCount: 1,
});

if (ability) {
  console.log(`Cataloged: ${ability.name}`);

  // Add validation
  catalog.addValidationRecord(
    ability.id,
    'expert-reviewer',
    'passed',
    'Validated through peer review'
  );

  // Add example
  catalog.addExample(
    ability.id,
    'Literature review in climate science',
    { query: 'climate trends' },
    { hypothesis: 'Novel climate pattern' },
    ['researcher-1', 'analyst-2', 'synthesizer-3'],
    'Published in journal'
  );
}
```

## Testing

Run tests for emergence components:

```bash
# Test hydraulic framework
npm test -- src/core/hydraulic/__tests__

# Test emergence detection
npm test -- src/core/emergence/__tests__

# Test enhanced stigmergy
npm test -- src/core/stigmergy/__tests__

# Test all emergence components
npm test -- emergence
```

## API Reference

### Hydraulic Framework

#### PressureSensor

```typescript
const sensor = new PressureSensor(config);

// Register agent
sensor.registerAgent(agentId, initialPressure);

// Update pressure
const pressure = sensor.updatePressure(agentId, incoming, external, internal);

// Get pressure
const current = sensor.getPressure(agentId);

// Analyze trends
const analysis = sensor.analyzePressure(agentId);

// Get statistics
const stats = sensor.getStats();
```

#### FlowMonitor

```typescript
const monitor = new FlowMonitor(config);

// Register pipe
const pipe = monitor.registerPipe(sourceId, targetId, weight, capacity);

// Calculate flow
const flow = monitor.calculateFlow(pipeId, sourcePressure, targetPressure);

// Analyze flow
const analysis = monitor.analyzeFlow(pipeId);

// Detect bottlenecks
const bottlenecks = monitor.detectBottlenecks();
```

#### ValveController

```typescript
const controller = new ValveController(config);

// Register valve
const valve = controller.registerValve(agentId);

// Make stochastic selection
const decision = controller.selectAgent(candidates, temperature);

// Adjust temperature
controller.adjustTemperature(delta);

// Set aperture
controller.setAperture(agentId, aperture);
```

### Emergence Detection

#### EmergenceDetector

```typescript
const detector = new EmergenceDetector(config);

// Register capabilities
detector.registerAgentCapabilities(agentId, capabilities);

// Analyze emergence
const analysis = await detector.analyzeEmergence(chains);

// Get behaviors
const behaviors = detector.getAllBehaviors();
const candidates = detector.getBehaviorsByStatus('candidate');

// Validate behavior
detector.validateBehavior(behaviorId, 'validated');
```

#### EmergenceCatalog

```typescript
const catalog = new EmergenceCatalog(config);

// Catalog behavior
const ability = catalog.catalogBehavior(behavior);

// Get abilities
const all = catalog.getAllAbilities();
const top = catalog.getTopAbilities(10);
const byCategory = catalog.getAbilitiesByCategory(EmergenceCategory.COMPOSITION);

// Add validation
catalog.addValidationRecord(abilityId, validator, result, notes);

// Add example
catalog.addExample(abilityId, context, input, output, agents, outcome);

// Search
const results = catalog.searchByCapability('syntax');
```

## Research Foundation

This implementation is based on the research series:

1. **EMERGENT_GRANULAR_INTELLIGENCE.md** (~32K words)
   - Hydraulic system metaphor
   - Mathematical framework
   - Emergence detection algorithms

2. **EMERGENT_GRANULAR_INTELLIGENCE_IMPLEMENTATION.md** (~31K words)
   - Code examples and patterns
   - Best practices
   - Testing strategies

3. **EMERGENT_GRANULAR_INTELLIGENCE_VALIDATION.md** (~27K words)
   - Experimental protocols
   - Validation criteria
   - Reproducibility guidelines

## Contributing

When contributing to the EGI system:

1. Ensure all tests pass
2. Add tests for new features
3. Update documentation
4. Follow the hydraulic metaphor
5. Maintain research alignment

## License

MIT License - See LICENSE file for details
