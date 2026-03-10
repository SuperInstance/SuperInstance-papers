# Feature Flags - Quick Start Guide

Get up and running with feature flags in 5 minutes.

## 1. Database Setup

```bash
# Run the migration
psql -U postgres -d polln -f src/spreadsheet/backend/features/create-schema.sql
```

## 2. Create Your First Flag

### Using CLI

```bash
./scripts/create-flag.sh \
  -n my_first_flag \
  -d "Enable my awesome new feature" \
  -e production
```

### Using Code

```typescript
import { FeatureFlagManager } from '@polln/spreadsheet';

const flag = await manager.createFlag({
  name: 'my_first_flag',
  description: 'Enable my awesome new feature',
  type: FlagType.BOOLEAN,
  state: FlagState.ENABLED,
  environment: 'production',
  defaultValue: false,
  createdBy: 'your_user_id',
  tags: ['feature', 'ui'],
  rules: [],
  killSwitchEnabled: false
});
```

## 3. Evaluate in Your Code

```typescript
const result = await manager.evaluateFlag('my_first_flag', {
  userId: 'user123',
  attributes: {
    plan: 'premium'
  }
});

if (result.value) {
  // Show the new feature
  renderNewFeature();
} else {
  // Show the old feature
  renderOldFeature();
}
```

## 4. Gradual Rollout

```bash
# Roll out to 10% of users first
./scripts/rollout-flag.sh -n my_first_flag -s 10 -d 1440

# Monitor metrics, then increase to 50%
./scripts/rollout-flag.sh -n my_first_flag -s 5 -d 1440

# Finally, roll out to 100%
./scripts/rollout-flag.sh -n my_first_flag -s 2 -d 1440
```

## 5. Kill Switch (Emergency)

```bash
# If something goes wrong, kill the flag instantly
curl -X POST http://localhost:3000/api/flags/my_first_flag/kill \
  -H "Content-Type: application/json" \
  -d '{"reason": "High error rate detected"}'
```

Or using code:

```typescript
await manager.enableKillSwitch('my_first_flag', 'Critical bug discovered');
```

## 6. Run an A/B Test

```typescript
// Create experiment
const experiment = await tracker.createExperiment({
  name: 'checkout_button_test',
  description: 'Test blue vs green checkout button',
  hypothesis: 'Blue button increases conversions',
  successMetric: 'checkout_conversion',
  targetMetric: 'purchase',
  minSampleSize: 1000,
  confidenceLevel: 0.95,
  variants: [
    {
      id: 'control',
      name: 'Green Button',
      isControl: true,
      allocationWeight: 0.5,
      payload: { color: 'green', text: 'Buy Now' }
    },
    {
      id: 'treatment',
      name: 'Blue Button',
      isControl: false,
      allocationWeight: 0.5,
      payload: { color: 'blue', text: 'Buy Now' }
    }
  ],
  createdBy: 'your_user_id',
  tags: ['ui', 'checkout']
});

// Start experiment
await tracker.startExperiment(experiment.id);

// Assign user to variant
const assignment = await tracker.getVariant(experiment.id, userId);

// Use variant in UI
const buttonColor = assignment.variant.payload.color;
renderButton({ color: buttonColor });

// Track conversion
await tracker.trackConversion({
  userId: userId,
  experimentId: experiment.id,
  variantId: assignment.variantId,
  eventName: 'purchase',
  value: 99.99
});

// Get results
const results = await tracker.getResults(experiment.id);

if (results.statisticalSignificance?.isSignificant) {
  console.log('Winner:', results.statisticalSignificance.winner);
}
```

## 7. Target Specific Users

```typescript
// Create segment for beta testers
await segmenter.createSegment({
  name: 'Beta Testers',
  description: 'Users who opt into beta testing',
  rules: [{
    type: 'attribute',
    condition: {
      attribute: 'beta_tester',
      operator: 'equals',
      value: true
    }
  }],
  isActive: true
});

// Update user attributes
await segmenter.updateUserAttributes('user123', {
  beta_tester: true,
  plan: 'premium',
  region: 'us-west'
});

// Create flag for beta testers only
const flag = await manager.createFlag({
  name: 'beta_feature',
  description: 'Feature for beta testers only',
  type: FlagType.BOOLEAN,
  state: FlagState.ENABLED,
  environment: 'production',
  defaultValue: false,
  rules: [{
    id: 'beta_only',
    name: 'Beta testers only',
    condition: {
      type: 'attribute',
      operator: 'equals',
      value: true,
      attribute: 'beta_tester'
    },
    value: true,
    priority: 100,
    enabled: true
  }]
});
```

## Common Patterns

### Percentage Rollout

```typescript
// Start at 10%
await manager.createFlag({
  name: 'new_feature',
  type: FlagType.PERCENTAGE,
  rolloutPercentage: 10
});

// Increase to 50% after monitoring
await manager.updateFlag('new_feature', {
  rolloutPercentage: 50
});

// Finally 100%
await manager.updateFlag('new_feature', {
  rolloutPercentage: 100,
  state: FlagState.ENABLED
});
```

### Environment-Specific Flags

```typescript
// Development flag
await manager.createFlag({
  name: 'dev_feature',
  environment: 'development',
  state: FlagState.ENABLED
});

// Production flag
await manager.createFlag({
  name: 'prod_feature',
  environment: 'production',
  state: FlagState.DISABLED
});
```

### Multi-Variant Testing

```typescript
await manager.createFlag({
  name: 'pricing_test',
  type: FlagType.MULTIVARIATE,
  variants: [
    { id: 'basic', weight: 0.3, payload: { price: 9 } },
    { id: 'pro', weight: 0.5, payload: { price: 19 } },
    { id: 'enterprise', weight: 0.2, payload: { price: 49 } }
  ]
});
```

## Best Practices

1. **Start Small**: Roll out to 1-10% first
2. **Monitor Closely**: Check error rates and performance
3. **Use Kill Switches**: Always have a way to disable quickly
4. **Test in Dev**: Verify flags work before production
5. **Document Flags**: Add clear descriptions and tags
6. **Clean Up**: Delete old flags you no longer need

## Troubleshooting

### Flag Not Working

```typescript
// Check flag state
const flag = await manager.getFlag('my_flag');
console.log(flag.state);  // Should be 'enabled'

// Check kill switch
console.log(flag.killSwitchEnabled);  // Should be false

// Check environment
console.log(flag.environment);  // Should match your environment
```

### Wrong User Segment

```typescript
// Check user segments
const segments = await segmenter.getUserSegments('user123');
console.log(segments);  // Array of segments

// Check user attributes
const attributes = await segmenter.getUserAttributes('user123');
console.log(attributes);  // User attributes
```

### Cache Issues

```typescript
// Clear flag cache
await storage.invalidateFlagCache('my_flag');

// Or disable caching temporarily
const manager = new FeatureFlagManager({
  storage,
  segmenter,
  cacheEnabled: false
});
```

## Next Steps

- Read the [full documentation](README.md)
- Check out the [API reference](README.md#api-reference)
- Review [best practices](README.md#best-practices)
- Set up [monitoring](README.md#monitoring)

## Support

Need help? Open an issue on GitHub or contact support@polln.ai.
