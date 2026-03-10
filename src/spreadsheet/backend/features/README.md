# Feature Flags and Experiments System

A comprehensive feature flag and A/B testing system for the POLLN spreadsheet, providing zero-downtime rollouts, user segmentation, and statistical analysis.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Flag Types](#flag-types)
- [Rollout Strategies](#rollout-strategies)
- [A/B Testing](#a-b-testing)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [CLI Tools](#cli-tools)
- [Best Practices](#best-practices)
- [Incident Response](#incident-response)

## Overview

The feature flag system enables:

- **Zero-downtime deployments**: Roll out features gradually
- **Targeted rollouts**: Release to specific user segments
- **A/B testing**: Run experiments with statistical analysis
- **Kill switches**: Instantly disable problematic features
- **Performance**: <100ms flag evaluation with Redis caching
- **Safety**: Consistent hashing ensures users see consistent behavior

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Feature Flag System                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐         ┌─────────────────┐           │
│  │ FeatureFlag     │         │ Experiment      │           │
│  │ Manager         │◄────────┤ Tracker         │           │
│  └────────┬────────┘         └─────────────────┘           │
│           │                                                   │
│           ├──────────────────────────────────┐              │
│           ▼                                  ▼              │
│  ┌─────────────────┐              ┌─────────────────┐      │
│  │ FlagStorage     │              │ UserSegmenter   │      │
│  │                 │              │                 │      │
│  │ • PostgreSQL    │              │ • Attributes    │      │
│  │ • Redis Cache   │              │ • Behaviors     │      │
│  └─────────────────┘              └─────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Components

- **FeatureFlagManager**: Core flag evaluation and management
- **FlagStorage**: PostgreSQL persistence with Redis caching
- **UserSegmenter**: User segmentation and consistent hashing
- **ExperimentTracker**: A/B testing with statistical analysis

## Flag Types

### Boolean Flags

Simple on/off flags for binary features.

```typescript
const flag = await manager.createFlag({
  name: 'new_dashboard',
  description: 'Enable new dashboard UI',
  type: FlagType.BOOLEAN,
  state: FlagState.ENABLED,
  environment: 'production',
  defaultValue: false
});
```

### Percentage Flags

Gradual rollout based on user percentage (0-100%).

```typescript
const flag = await manager.createFlag({
  name: 'gradual_rollout',
  description: 'Gradual rollout of new feature',
  type: FlagType.PERCENTAGE,
  state: FlagState.ROLLOUT,
  rolloutPercentage: 10,  // Start at 10%
  rolloutStrategy: 'gradual'
});
```

### Experiment Flags

A/B test variants with statistical tracking.

```typescript
const flag = await manager.createFlag({
  name: 'button_color_experiment',
  description: 'Test different button colors',
  type: FlagType.EXPERIMENT,
  experimentId: 'exp_123',
  variants: [
    { id: 'control', weight: 0.5, payload: { color: 'green' } },
    { id: 'treatment', weight: 0.5, payload: { color: 'blue' } }
  ]
});
```

### Multivariate Flags

Multiple variants for complex testing.

```typescript
const flag = await manager.createFlag({
  name: 'pricing_plans',
  description: 'Test different pricing structures',
  type: FlagType.MULTIVARIATE,
  variants: [
    { id: 'basic', weight: 0.3, payload: { price: 9 } },
    { id: 'pro', weight: 0.5, payload: { price: 19 } },
    { id: 'enterprise', weight: 0.2, payload: { price: 49 } }
  ]
});
```

## Rollout Strategies

### Immediate Rollout

Release to all users at once (not recommended for production).

```typescript
await manager.updateFlag(flagId, {
  state: FlagState.ENABLED
});
```

### Gradual Rollout

Increase percentage over time.

```typescript
// Using CLI
./scripts/rollout-flag.sh -n new_feature -s 10 -d 1440

// Or programmatically
await manager.startRollout(flagId, {
  steps: [
    { percentage: 10, duration: 60, waitDuration: 1440 },
    { percentage: 25, duration: 60, waitDuration: 1440 },
    { percentage: 50, duration: 60, waitDuration: 1440 },
    { percentage: 75, duration: 60, waitDuration: 1440 },
    { percentage: 100, duration: 60, waitDuration: 0 }
  ]
});
```

### Targeted Rollout

Release to specific user segments.

```typescript
// Create segment for beta testers
await segmenter.createSegment({
  name: 'Beta Testers',
  rules: [{
    type: 'attribute',
    condition: {
      attribute: 'role',
      operator: 'equals',
      value: 'beta_tester'
    }
  }]
});

// Flag only enables for beta testers
const flag = await manager.createFlag({
  name: 'beta_feature',
  type: FlagType.BOOLEAN,
  rules: [{
    name: 'Beta users only',
    condition: {
      type: 'segment',
      operator: 'equals',
      value: 'beta_testers'
    },
    value: true
  }]
});
```

## A/B Testing

### Create Experiment

```typescript
const experiment = await tracker.createExperiment({
  name: 'Checkout Flow Test',
  description: 'Test simplified checkout',
  hypothesis: 'Simplified checkout increases conversions',
  successMetric: 'conversion_rate',
  targetMetric: 'purchase',
  minSampleSize: 1000,
  confidenceLevel: 0.95,
  variants: [
    {
      id: 'control',
      name: 'Current Flow',
      isControl: true,
      allocationWeight: 0.5,
      payload: { steps: 5 }
    },
    {
      id: 'simplified',
      name: 'Simplified Flow',
      isControl: false,
      allocationWeight: 0.5,
      payload: { steps: 3 }
    }
  ]
});

await tracker.startExperiment(experiment.id);
```

### Assign Variant

```typescript
const assignment = await tracker.getVariant(experiment.id, userId);

// Use variant payload in application
const checkoutSteps = assignment.variant.payload.steps;
```

### Track Conversion

```typescript
await tracker.trackConversion({
  userId: 'user123',
  experimentId: experiment.id,
  variantId: assignment.variantId,
  eventName: 'purchase',
  value: 99.99
});
```

### Get Results

```typescript
const results = await tracker.getResults(experiment.id);

console.log(results.statisticalSignificance);
// {
//   pValue: 0.02,
//   isSignificant: true,
//   confidence: 0.95,
//   winner: 'simplified',
//   testUsed: 'z-test'
// }
```

## Installation

### Database Setup

```bash
# Run migration
psql -U postgres -d polln -f src/spreadsheet/backend/features/create-schema.sql
```

### Environment Variables

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=polln
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Redis (optional but recommended)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Feature Flags
FLAG_ENVIRONMENT=production
FLAG_CACHE_TTL=60
FLAG_EVAL_TIMEOUT=100
```

### Initialize Components

```typescript
import {
  FeatureFlagManager,
  FlagStorage,
  UserSegmenter,
  ExperimentTracker
} from '@polln/spreadsheet';

const storage = new FlagStorage({
  postgresql: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT)
  },
  cacheEnabled: true,
  cacheTTL: 60
});

const segmenter = new UserSegmenter({
  postgresql: {
    host: process.env.POSTGRES_HOST,
    // ... other config
  }
});

const tracker = new ExperimentTracker({
  postgresql: {
    host: process.env.POSTGRES_HOST,
    // ... other config
  },
  segmenter
});

const manager = new FeatureFlagManager({
  storage,
  segmenter,
  experimentTracker: tracker,
  environment: process.env.FLAG_ENVIRONMENT,
  cacheEnabled: true,
  cacheTTL: 60,
  evaluationTimeout: 100
});
```

## Usage

### Evaluate Flag

```typescript
const context = {
  userId: 'user123',
  attributes: {
    plan: 'premium',
    region: 'us-west'
  }
};

const result = await manager.evaluateFlag('new_dashboard', context);

if (result.value) {
  // Show new dashboard
} else {
  // Show old dashboard
}
```

### Evaluate Multiple Flags

```typescript
const flags = ['new_dashboard', 'new_navbar', 'dark_mode'];
const results = await manager.evaluateFlags(flags, context);

results.forEach((result, flagId) => {
  console.log(`${flagId}: ${result.value}`);
});
```

### Update User Attributes

```typescript
await segmenter.updateUserAttributes('user123', {
  plan: 'premium',
  role: 'admin',
  region: 'us-west',
  customAttributes: {
    department: 'engineering'
  }
});
```

### Enable Kill Switch

```typescript
await manager.enableKillSwitch('problematic_flag', 'Critical bug discovered');

// All evaluations now return false
```

## API Reference

### FeatureFlagManager

#### Methods

- `createFlag(definition)`: Create a new flag
- `updateFlag(id, updates)`: Update flag configuration
- `deleteFlag(id)`: Delete a flag
- `getFlag(id)`: Get flag by ID
- `listFlags(filters)`: List all flags
- `evaluateFlag(id, context)`: Evaluate flag for user
- `evaluateFlags(ids, context)`: Evaluate multiple flags
- `enableFlag(id)`: Enable a flag
- `disableFlag(id)`: Disable a flag
- `enableKillSwitch(id, reason)`: Enable kill switch
- `disableKillSwitch(id)`: Disable kill switch
- `startRollout(id, plan)`: Start gradual rollout

### UserSegmenter

#### Methods

- `createSegment(segment)`: Create user segment
- `updateSegment(id, updates)`: Update segment
- `deleteSegment(id)`: Delete segment
- `getSegment(id)`: Get segment by ID
- `listSegments(activeOnly)`: List all segments
- `getUserSegments(userId)`: Get user's segments
- `assignUserToSegments(userId, attributes)`: Assign user to segments
- `getPercentageBucket(userId, flagId)`: Get user's bucket (0-99)
- `updateUserAttributes(userId, attributes)`: Update user attributes
- `recordBehavior(behavior)`: Record user behavior

### ExperimentTracker

#### Methods

- `createExperiment(experiment)`: Create experiment
- `updateExperiment(id, updates)`: Update experiment
- `startExperiment(id)`: Start experiment
- `pauseExperiment(id)`: Pause experiment
- `completeExperiment(id, winner)`: Complete experiment
- `deleteExperiment(id)`: Delete experiment
- `getExperiment(id)`: Get experiment by ID
- `listExperiments(filters)`: List all experiments
- `getVariant(experimentId, userId)`: Get user's variant
- `trackConversion(event)`: Track conversion event
- `getResults(experimentId)`: Get experiment results

## CLI Tools

### create-flag.sh

Create a new feature flag.

```bash
./scripts/create-flag.sh \
  -n new_dashboard \
  -d "Enable new dashboard UI" \
  -e production \
  -t boolean
```

### rollout-flag.sh

Start a gradual rollout.

```bash
./scripts/rollout-flag.sh \
  -n new_feature \
  -s 10 \
  -d 60 \
  -w 1440
```

### cleanup-experiment.sh

Clean up old experiments.

```bash
./scripts/cleanup-experiment.sh \
  -s completed \
  -d 90 \
  -e
```

## Best Practices

### 1. Flag Naming

Use descriptive, consistent names:

```
feature_module_action
new_dashboard_ui
api_v2_endpoints
payment_stripe_integration
```

### 2. Rollout Phases

Always test in stages:

1. **Development**: Internal testing
2. **Staging**: QA testing
3. **Production (1%)**: Canary release
4. **Production (10%)**: Extended testing
5. **Production (50%)**: Monitor metrics
6. **Production (100%)**: Full rollout

### 3. Kill Switches

Always include kill switches for risky features:

```typescript
const flag = await manager.createFlag({
  name: 'risky_feature',
  killSwitchEnabled: false,  // Ready to kill if needed
  // ... other config
});
```

### 4. Experiment Design

- **Sample Size**: Calculate required sample size upfront
- **Duration**: Run experiments for at least 1-2 weeks
- **Metrics**: Track both primary and secondary metrics
- **Segments**: Consider segment-specific results

### 5. Performance

- Use Redis caching for <100ms evaluation
- Batch flag evaluations when possible
- Monitor evaluation times
- Set appropriate cache TTLs

### 6. Safety

- Test flags in development first
- Use gradual rollouts for production
- Monitor error rates and performance
- Have rollback plans ready

## Incident Response

### Feature Causing Issues

1. **Enable Kill Switch**
   ```bash
   curl -X POST /api/flags/FLAG_ID/kill \
     -H "Content-Type: application/json" \
     -d '{"reason": "High error rate"}'
   ```

2. **Verify Impact**
   ```bash
   # Check error rates
   curl /api/flags/FLAG_ID/stats
   ```

3. **Investigate Logs**
   ```bash
   # View recent evaluations
   curl /api/flags/FLAG_ID/evaluations?limit=100
   ```

4. **Fix and Test**

5. **Disable Kill Switch**
   ```bash
   curl -X DELETE /api/flags/FLAG_ID/kill
   ```

### Rollout Issues

1. **Pause Rollout**
   ```typescript
   await manager.updateFlag(flagId, {
     state: FlagState.DISABLED
   });
   ```

2. **Analyze Metrics**
   ```typescript
   const stats = await manager.getFlagStats(flagId);
   ```

3. **Decide: Rollback or Continue**

4. **Update Rollout Plan if Needed**

### Database Issues

1. **Check Health**
   ```typescript
   const health = await storage.healthCheck();
   // { postgresql: true, redis: true }
   ```

2. **Fallback to Defaults**
   - System returns defaultValue if storage is unavailable
   - Logs errors for monitoring

3. **Alert On-Call**

## Performance Targets

- **Flag Evaluation**: <100ms (p95)
- **Cache Hit Rate**: >95%
- **Database Queries**: <10ms
- **Rollout Updates**: <1s

## Monitoring

### Key Metrics

- Flag evaluation rate
- Cache hit/miss ratio
- Error rate by flag
- Rollout progress
- Experiment conversion rates

### Alerts

- High error rate on flag
- Cache hit rate <90%
- Evaluation time >200ms
- Database connection issues

## Support

For issues or questions:

- GitHub: https://github.com/SuperInstance/polln
- Documentation: https://docs.polln.ai
- Email: support@polln.ai
