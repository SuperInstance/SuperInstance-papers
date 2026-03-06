# Mycelium Living Intelligence - Database Schema Documentation

## Overview

This document provides comprehensive documentation for the Mycelium Living Intelligence database schema, designed based on thorough analysis of the project documentation and multi-reviewer synthesis.

## Schema Statistics

- **Total Models**: 45
- **Total Sections**: 13
- **Database**: SQLite (via Prisma ORM)

---

## Section 1: Identity & Personal LOGOS

### `Gardener` (Core Entity)
The gardener (not "user") is an active cultivator of their personal LOGOS - the emergent intelligence that understands, anticipates, and serves intentions.

**Key Fields:**
- `logos` (Json): Personal pattern profile with embeddings and preferences
- `vitality`, `momentum`, `coherence`, `resonance`: System health metrics
- `trustLevel`: Progression through seedling → sapling → tree → elder
- `fpicConsent`: Indigenous knowledge governance compliance

### `GardenerProfile`
Public profile for marketplace and social features.

---

## Section 2: Agent Architecture

### Entity Hierarchy
```
AgentCategory (sensor, processor, decision, executor)
└── AgentType (vision, text, intent, navigational, etc.)
    └── AgentInstance (running process)
```

### `AgentCategory`
Taxonomy of agent roles. Includes `svadharma` field for philosophical grounding (Sanskrit: "one's proper duty").

### `AgentType`
Defines specialized functions with:
- Neural model specifications (`modelFamily`, `defaultParams`)
- SPORE protocol topics (`inputTopics`, `outputTopic`)
- Performance targets (`targetLatencyMs`, `maxMemoryMB`)

### `AgentInstance`
Running agent with:
- Model state (`modelHash`, `parameterCount`)
- Runtime state (`status`: dormant, active, hibernating)
- Value function (karmic record of successes/failures)

### `AgentGraph` (LOG - Learned Optimization Graph)
Dynamic structure of agent connections with:
- Emergent metrics (`coherence`, `clustering`, `avgPathLength`)
- Context signature for optimal topology

### `AgentSynapse` (Hebbian Learning)
Connection between agents following Hebb's principle: "Neurons that fire together, wire together."
- `weight`: Connection strength
- `coactivationCount`: Tracking joint activations
- `learningRate`, `decayRate`: Learning parameters
- `rewardStrength`: Reward modulation

---

## Section 3: Behavioral Artifacts

### Data Flow
```
Log (raw events)
  └── Logline (compressed embedding)
        └── Loom (reusable routine)
              └── Loomery (collection)
```

### `Log`
Record of events with context-action-outcome pattern.
- `demonstration`: Was this a deliberate teaching?
- `feedback`: User feedback on outcome

### `Logline`
Compressed behavioral seed (64-1024 dimensions).
- `embedding`: Latent representation (Japanese Ma concept)
- `differentialPrivacyEpsilon`, `differentialPrivacyDelta`: DP parameters
- `signature`: Cryptographic integrity

### `Loom`
Reusable, optimized routine - "muscle memory of the system."
- `version`, `parentLoomId`: Version control lineage
- `optimizationHistory`: Track improvements over time
- `preconditions`, `postconditions`: When applicable, expected outcomes
- `isCertified`: Marketplace certification

### `Loomery`
Personal library of looms with organization features.

---

## Section 4: Plinko Decision Layer

### `DiscriminatorType`
Filters for Plinko: safety, coherence, timing.
- `passThreshold`: Minimum score to pass

### `PlinkoDecision`
Audit trail for interpretability (Layer 2 of Safety Architecture).
- `proposals`: Agent bids with confidence scores
- `discriminatorResults`: Filter outcomes
- `temperature`: Exploration temperature
- `explanation`: Human-readable explanation

---

## Section 5: World Model & Dreaming

### `WorldModel`
Learned environment simulator following Ha & Schmidhuber (2018).
- Architecture: VAE Encoder + GRU Transition + MLP Reward
- Performance: `predictionAccuracy`, `reconstructionLoss`, `klDivergence`

### `DreamSession`
Overnight optimization with multi-scale dreaming:
- **Micro-dreams**: Motor skill refinement
- **Meso-dreams**: Routine optimization
- **Macro-dreams**: Loom combination

---

## Section 6: Collective Intelligence

### `Grove`
Community for sharing looms and topology seeds.
- `governance`: open, moderated, invite-only
- `fpicCompliant`: Indigenous knowledge governance

### `GroveMembership`
Member roles and contribution tracking.

### `GroveItem`
Shared items with community stats.

### `Loomcast`
Shareable loom subscription ("podcast for behaviors").
- `privacyLevel`: none, aggregated, anonymized

### `MarketplaceListing`
Buy/sell/trade looms.
- `indigenousConsent`: Indigenous knowledge compliance
- `benefitSharePercent`: For indigenous benefit-sharing

### `MarketplaceReview`
Verified purchase reviews.

### `EchoChain`
Shared pattern improvement chains.
- `hopIndex`: Position in improvement chain
- `improvementFactor`: How much better than original

### `TopologySeed`
Compressed agent configuration.

### `Current`
Trends in shared patterns.

### `FederatedContribution`
Privacy-preserving contributions with differential privacy parameters.

---

## Section 7: Safety Infrastructure

### Four-Layer Safety Architecture

#### Layer 1: Constitutional AI
**`ConstitutionalConstraint`**
Hard constraints that cannot be overridden:
- `human_autonomy`: Do not override human decisions
- `harm_prevention`: Do not cause harm
- `privacy`: Do not expose personal data
- `truthfulness`: Do not deceive

#### Layer 2: Interpretability
All `PlinkoDecision` records include human-readable explanations.

#### Layer 3: Oversight
**`EmergencyControl`**
- Kill switch
- Safe mode
- Rollback capability
- Human override authority

#### Layer 4: Monitoring
**`SafetyAuditLog`**
Comprehensive audit trail for:
- Constraint violations
- Capability emergence detection
- Kill switch activations
- Rollbacks

### `SystemCheckpoint`
Point-in-time system state for rollback.

---

## Section 8: Indigenous Knowledge Governance

### FPIC Protocol Implementation

### `KnowledgeSource`
Attribution tracking for indigenous knowledge:
- `fpicStatus`: pending, approved, restricted, denied
- `restrictions`: Usage restrictions
- `sacredKnowledge`: Flag for sacred content
- `benefitRequired`: Benefit-sharing requirements

### `GovernanceCouncil`
Indigenous governance with veto power:
- `vetoPower`: True for actual veto authority
- `approvalRequired`: What requires council approval

### `CouncilDecision`
Record of council decisions with voting.

---

## Section 9: Vitality & Metrics

### `VitalitySnapshot`
Historical tracking of system health:
- Core metrics: vitality, momentum, coherence, resonance
- Graph metrics: agent counts, synapse stats
- Usage: logs, looms executed, decisions

---

## Section 10: Notifications

### `Notification`
User notifications with action support.

---

## Section 11: Research

### `ResearchContribution`
Track research contributions to open questions.

---

## Section 12: Roadmap

### `DevelopmentMilestone`
Track development phases and deliverables.

---

## Key Design Decisions

### 1. Privacy-First Design
- Differential privacy parameters on all shared patterns
- Explicit privacy levels for loomcasts
- Privacy vulnerability acknowledgment

### 2. Hebbian Learning
- Synaptic weights with decay and reward modulation
- Coactivation tracking for "fire together, wire together"

### 3. Multi-Scale Dreaming
- Micro, meso, macro dream sessions
- World model with counterfactual augmentation

### 4. Four-Layer Safety
- Constitutional constraints (non-overridable)
- Interpretability (all decisions explainable)
- Oversight (human-in-loop, kill switch)
- Monitoring (continuous auditing)

### 5. Indigenous Knowledge Governance
- FPIC protocol compliance
- Governance council with veto power
- Benefit-sharing framework
- Sacred knowledge protection

### 6. Emergent Properties
- Vitality metrics as core health indicators
- Graph coherence and clustering
- Momentum for improvement tracking

---

## Entity Relationship Diagram (Conceptual)

```
Gardener
├── profile: GardenerProfile
├── logs[] → Log → logline → Logline → loom → Loom
│     └── loomery → LoomeryItem → Loom
├── loomeries[] → Loomery
├── groveMemberships[] → GroveMembership → Grove
│     └── items[] → GroveItem
├── marketplaceItems[] → MarketplaceListing
│     └── reviews[] → MarketplaceReview
├── dreamSessions[] → DreamSession
│     └── worldModel → WorldModel
├── agentGraphs[] → AgentGraph
│     └── members[] → AgentGraphMember → AgentInstance
│           ├── connections[] → AgentSynapse
│           └── type → AgentType → AgentCategory
├── plinkoDecisions[] → PlinkoDecision
├── vitalityHistory[] → VitalitySnapshot
├── federatedContributions[] → FederatedContribution
├── echoContributions[] → EchoChain
├── safetyAuditLogs[] → SafetyAuditLog
├── notifications[] → Notification
└── echoContributions[] → EchoChain

Safety Infrastructure:
├── ConstitutionalConstraint (global)
├── EmergencyControl (per gardener/global)
├── SystemCheckpoint[] → per gardener
└── SafetyAuditLog[] → per gardener

Indigenous Governance:
├── KnowledgeSource[] (global)
├── GovernanceCouncil (global)
└── CouncilDecision[] → per council

Research & Roadmap:
├── ResearchContribution[] (global)
├── Current[] (global)
└── DevelopmentMilestone[] (global)
```

---

## Migration Notes

This schema is designed for SQLite but can be migrated to PostgreSQL or other databases for production use. Key considerations:

1. JSON fields: Consider using proper relational tables for frequently queried JSON data
2. Vector search: For production, use pgvector extension for logline embeddings
3. Full-text search: Add proper search indexes for log content
4. Partitioning: Partition VitalitySnapshot by time for large-scale deployments

---

## Version History

- **v2.0** (March 2026): Comprehensive redesign based on thorough project analysis
- **v1.0**: Initial schema
