# @superinstance/equipment-memory-hierarchy

A comprehensive 4-tier cognitive memory system implementing Working, Episodic, Semantic, and Procedural memory with automatic consolidation and forgetting curves.

## Overview

This equipment provides a sophisticated cognitive memory architecture inspired by human memory systems. It implements four distinct memory tiers, each with specific characteristics and automatic consolidation between them.

### Memory Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│                     HIERARCHICAL MEMORY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              WORKING MEMORY (Tier 1)                     │    │
│  │  • Fast access, limited capacity (7±2 items)            │    │
│  │  • Attention-based decay                                │    │
│  │  • Immediate context                                    │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │ Consolidation (high importance)    │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              EPISODIC MEMORY (Tier 2)                    │    │
│  │  • Events with timestamps                               │    │
│  │  • Emotional context                                    │    │
│  │  • Source tracking                                      │    │
│  │  • Forgetting curve (Ebbinghaus)                        │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │ Pattern extraction                 │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              SEMANTIC MEMORY (Tier 3)                    │    │
│  │  • Facts and concepts                                   │    │
│  │  • Relationship graph                                   │    │
│  │  • Importance-weighted                                  │    │
│  │  • Slow decay                                           │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │ Skill learning                     │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              PROCEDURAL MEMORY (Tier 4)                  │    │
│  │  • Skills and procedures                                │    │
│  │  • Automatic execution triggers                         │    │
│  │  • Success rate tracking                                │    │
│  │  • Expertise progression                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install @superinstance/equipment-memory-hierarchy
```

## Quick Start

```typescript
import { HierarchicalMemory } from '@superinstance/equipment-memory-hierarchy';

// Create the hierarchical memory system
const memory = new HierarchicalMemory();

// Start the system (enables auto-consolidation and decay)
memory.start();

// Add to working memory
const workingItem = memory.addToWorkingMemory(
  { task: 'Process user request', priority: 'high' },
  { importance: 0.8, tags: ['task', 'urgent'] }
);

// Add an episode
const episode = memory.addEpisode(
  'User login event',
  { userId: 'user-123', ipAddress: '192.168.1.1' },
  {
    importance: 0.6,
    emotionalContext: { valence: 0.5, arousal: 0.3, dominance: 0.5 },
    participants: ['user-123'],
    tags: ['auth', 'login']
  }
);

// Add a concept
const concept = memory.addConcept('User Authentication', {
  definition: 'Process of verifying user identity',
  attributes: { type: 'security', criticality: 'high' },
  category: 'security'
});

// Add a skill/procedure
const skill = memory.addSkill(
  'Authenticate User',
  [
    { order: 1, action: 'validateCredentials', parameters: {} },
    { order: 2, action: 'checkPermissions', parameters: {} },
    { order: 3, action: 'createSession', parameters: {} }
  ],
  {
    description: 'Standard user authentication flow',
    triggers: [{ condition: 'context.action == "login"', priority: 0.8 }]
  }
);

// Search across all tiers
const results = memory.search({
  query: 'authentication',
  minImportance: 0.5,
  limit: 10
});

// Get statistics
const stats = memory.getStatistics();
console.log('Working Memory:', stats.working);
console.log('Episodic Memory:', stats.episodic);
console.log('Semantic Memory:', stats.semantic);
console.log('Procedural Memory:', stats.procedural);

// Stop the system
memory.stop();
```

## Memory Tiers in Detail

### Working Memory

Short-term, high-speed memory with limited capacity following Miller's Law (7±2 items).

```typescript
import { WorkingMemory } from '@superinstance/equipment-memory-hierarchy';

const workingMemory = new WorkingMemory({
  capacity: 7,           // Maximum items
  decayInterval: 5000,   // Check decay every 5 seconds
  attentionThreshold: 0.1, // Remove items below this attention
  autoConsolidate: true  // Auto-promote important items
});

// Add items
const item = workingMemory.add(
  { message: 'Remember this!' },
  0.7,  // importance
  ['note', 'urgent']  // tags
);

// Set focus (increases attention for focused item)
workingMemory.setFocus(item.id);

// Get consolidation candidates
const candidates = workingMemory.getConsolidationCandidates();
```

### Episodic Memory

Stores events and experiences with temporal and emotional context.

```typescript
import { EpisodicMemory } from '@superinstance/equipment-memory-hierarchy';

const episodicMemory = new EpisodicMemory({
  maxCapacity: 10000,
  consolidationThreshold: 0.7,
  emotionalWeighting: true
});

// Add an episode
const episode = episodicMemory.add(
  'Server crash detected',
  { serverId: 'srv-01', error: 'OutOfMemory' },
  {
    importance: 0.9,
    emotionalContext: {
      valence: -0.8,  // Negative event
      arousal: 0.9,   // High arousal (urgent)
      dominance: 0.3  // Low control
    },
    source: { type: 'perception', agentId: 'monitor-01' },
    tags: ['incident', 'server', 'critical']
  }
);

// Query episodes
const recentIncidents = episodicMemory.query({
  tags: ['incident'],
  minImportance: 0.7,
  limit: 10
});

// Calculate retention (Ebbinghaus curve)
const retention = episodicMemory.calculateRetention(episode);
```

### Semantic Memory

Stores facts, concepts, and their relationships.

```typescript
import { SemanticMemory, SemanticRelationType } from '@superinstance/equipment-memory-hierarchy';

const semanticMemory = new SemanticMemory({
  maxConcepts: 50000,
  autoCategorize: true
});

// Add concepts
const user = semanticMemory.add('User', {
  definition: 'An entity that interacts with the system',
  attributes: { hasId: true, hasSession: true },
  category: 'entity'
});

const session = semanticMemory.add('Session', {
  definition: 'A period of user interaction',
  attributes: { hasToken: true, hasExpiry: true },
  category: 'entity'
});

// Create relationships
semanticMemory.relate(
  user.id,
  session.id,
  SemanticRelationType.HAS_A,
  { strength: 0.9, bidirectional: false }
);

// Query related concepts
const related = semanticMemory.getRelated(user.id, {
  type: SemanticRelationType.HAS_A
});
```

### Procedural Memory

Stores skills and procedures with automatic execution triggers.

```typescript
import { ProceduralMemory } from '@superinstance/equipment-memory-hierarchy';

const proceduralMemory = new ProceduralMemory({
  maxSkills: 1000,
  autoExecution: true,
  expertiseThreshold: 50
});

// Add a skill
const skill = proceduralMemory.add(
  'Handle Error',
  [
    { order: 1, action: 'logError', parameters: { level: 'error' } },
    { order: 2, action: 'notifyTeam', parameters: { channel: 'alerts' } },
    { order: 3, action: 'attemptRecovery', parameters: {} }
  ],
  {
    triggers: [
      { condition: 'context.error !== undefined', priority: 0.9, cooldown: 5000 }
    ]
  }
);

// Execute a skill
const result = await proceduralMemory.execute(
  skill.id,
  { error: new Error('Test error') },
  async (step, context) => {
    console.log(`Executing: ${step.action}`);
    return { success: true };
  }
);

// Check for automatic triggers
const triggers = proceduralMemory.checkSkillTriggers({ error: new Error('Test') });
```

## Memory Consolidation

Automatic consolidation moves memories between tiers based on importance, access frequency, and patterns.

```typescript
import { MemoryConsolidation } from '@superinstance/equipment-memory-hierarchy';

const consolidation = new MemoryConsolidation(
  workingMemory,
  episodicMemory,
  semanticMemory,
  proceduralMemory,
  {
    workingToEpisodic: {
      accessThreshold: 3,
      importanceThreshold: 0.6
    },
    episodicToSemantic: {
      occurrenceThreshold: 3,  // Same event 3+ times
      importanceThreshold: 0.7
    }
  }
);

// Run consolidation cycle
const results = await consolidation.runConsolidation();

// Or start automatic consolidation
consolidation.startAutoConsolidation(60000); // Every minute
```

## Forgetting Curve

Implements the Ebbinghaus forgetting curve for natural memory decay:

```
Retention = e^(-t/S)

Where:
- t = time since last reinforcement
- S = memory strength (importance-weighted)
```

Reconsolidation strengthens memories when accessed, following spaced repetition principles.

## Events

Subscribe to memory events for monitoring and reactive behaviors:

```typescript
import { MemoryEventType } from '@superinstance/equipment-memory-hierarchy';

memory.subscribe(MemoryEventType.ITEM_ADDED, (event) => {
  console.log(`Item added to ${event.tier}: ${event.itemId}`);
});

memory.subscribe(MemoryEventType.CONSOLIDATION_COMPLETED, (event) => {
  console.log(`Consolidated from ${event.data?.sourceTier} to ${event.tier}`);
});

memory.subscribe(MemoryEventType.SKILL_EXECUTED, (event) => {
  console.log(`Skill executed: ${event.itemId}, success: ${event.data?.success}`);
});
```

## API Reference

### HierarchicalMemory

Main class that orchestrates all memory tiers.

| Method | Description |
|--------|-------------|
| `start()` | Start the memory system |
| `stop()` | Stop the memory system |
| `addToWorkingMemory(content, options)` | Add to working memory |
| `addEpisode(event, details, options)` | Add episodic memory |
| `addConcept(concept, options)` | Add semantic concept |
| `addSkill(skill, steps, options)` | Add procedural skill |
| `search(options)` | Search across tiers |
| `getById(id)` | Get item from any tier |
| `consolidate()` | Run consolidation cycle |
| `getStatistics()` | Get memory statistics |
| `subscribe(eventType, handler)` | Subscribe to events |

## Configuration

```typescript
const memory = new HierarchicalMemory({
  working: {
    capacity: 7,
    decayInterval: 5000,
    attentionThreshold: 0.1,
    autoConsolidate: true
  },
  episodic: {
    maxCapacity: 10000,
    consolidationThreshold: 0.7,
    emotionalWeighting: true,
    temporalResolution: 1000
  },
  semantic: {
    maxConcepts: 50000,
    relationshipThreshold: 0.1,
    confidenceThreshold: 0.3,
    autoCategorize: true
  },
  procedural: {
    maxSkills: 1000,
    autoExecution: true,
    learningThreshold: 3,
    expertiseThreshold: 50,
    forgettingThreshold: 0.2
  },
  enableAutoConsolidation: true,
  consolidationInterval: 60000,
  enableForgetting: true,
  forgettingCheckInterval: 300000
});
```

## License

MIT
