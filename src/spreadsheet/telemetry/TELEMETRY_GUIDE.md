# POLLN Telemetry System Guide

## Overview

The POLLN telemetry system is a comprehensive, privacy-first analytics solution designed to collect, process, and export usage data while maintaining full compliance with GDPR and CCPA regulations.

### Key Features

- **Privacy-First Design**: Built-in PII detection, data anonymization, and consent management
- **GDPR/CCPA Compliant**: Full support for right to access, right to be forgotten, and consent management
- **Minimal Performance Impact**: Asynchronous event processing, batching, and sampling
- **Flexible Export**: Support for Mixpanel, Amplitude, PostHog, webhooks, and local files
- **Comprehensive Analytics**: Usage metrics, performance tracking, error monitoring, and feature analysis

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     TelemetryManager                             │
│  - Event collection & queuing                                    │
│  - Session management                                            │
│  - Sampling & batching                                           │
└──────────────┬──────────────┬──────────────┬────────────────────┘
               │              │              │
               ▼              ▼              ▼
    ┌────────────────┐ ┌─────────────┐ ┌──────────────┐
    │ PrivacyManager │ │  Aggregator │ │   Exporter   │
    │                │ │             │ │              │
    │ • PII Detection │ │ • Rollups   │ │ • Mixpanel   │
    │ • Anonymization │ │ • Time Series│ │ • Amplitude  │
    │ • Consent       │ │ • Statistics │ │ • PostHog    │
    │ • Retention     │ │ • Sampling   │ │ • Webhooks   │
    └────────────────┘ └─────────────┘ │ • Local File │
                                     └──────────────┘
                                             ▲
                                             │
                                    ┌────────┴────────┐
                                    │ AnalyticsCollector│
                                    │                  │
                                    │ • Performance    │
                                    │ • Errors         │
                                    │ • Features       │
                                    │ • User Journeys  │
                                    └─────────────────┘
```

## Installation

```bash
# The telemetry system is included in the POLLN spreadsheet package
# No additional installation required
```

## Quick Start

### Basic Usage

```typescript
import {
  createTelemetryManager,
  EventCategory,
  ConsentStatus,
} from '@polln/spreadsheet/telemetry';

// Create telemetry manager
const telemetry = createTelemetryManager({
  enabled: true,
  samplingRate: 1.0, // 100% of events
});

// Track a feature use event
telemetry.trackEvent('feature_use', EventCategory.FEATURE, {
  feature: 'cell_transformations',
  duration: 1500,
});

// Set user consent
telemetry.setConsent(ConsentStatus.OPTED_IN, {
  analytics: true,
  performance: true,
});

// Get statistics
const stats = telemetry.getStats(24); // Last 24 hours
console.log(stats);
```

### Development Mode

```typescript
import { createDevTelemetryManager } from '@polln/spreadsheet/telemetry';

// Creates a manager optimized for development:
// - Exports to local files only
// - No sampling
// - No consent required
// - 5-second flush interval
const telemetry = createDevTelemetryManager();
```

### Production Mode

```typescript
import { createProductionTelemetryManager } from '@polln/spreadsheet/telemetry';

// Creates a manager optimized for production
const telemetry = createProductionTelemetryManager({
  mixpanelApiKey: process.env.MIXPANEL_API_KEY,
  amplitudeApiKey: process.env.AMPLITUDE_API_KEY,
  posthogApiKey: process.env.POSTHOG_API_KEY,
});
```

## Event Types

### UI Events

Track user interactions with the interface:

```typescript
telemetry.trackEvent('ui_click', EventCategory.UI, {
  element: '#save-button',
  text: 'Save',
  container: '.toolbar',
});

telemetry.trackEvent('ui_hover', EventCategory.UI, {
  element: '.cell',
  duration: 2500,
});

telemetry.trackEvent('ui_scroll', EventCategory.UI, {
  position: 75, // Percentage
  direction: 'down',
});
```

### Cell Events

Track spreadsheet cell operations:

```typescript
telemetry.trackEvent('cell_create', EventCategory.CELL, {
  cellType: 'TransformCell',
  location: { row: 5, column: 'C' },
});

telemetry.trackEvent('cell_update', EventCategory.CELL, {
  cellType: 'InputCell',
  location: { row: 3, column: 'A' },
  changeType: 'value',
});

telemetry.trackEvent('cell_transform', EventCategory.CELL, {
  cellType: 'AnalysisCell',
  transformation: 'linear_regression',
  inputSize: 1024,
  outputSize: 256,
  duration: 450,
});
```

### Performance Events

Track performance metrics:

```typescript
telemetry.trackEvent('perf_metric', EventCategory.PERFORMANCE, {
  metric: 'cell_evaluation',
  duration: 150,
  operation: 'transform',
});

// Automatic tracking with analytics collector
const opId = telemetry.analyticsCollector.startPerformanceOperation(
  'complex_calculation',
  userId,
  sessionId
);
// ... perform operation ...
telemetry.analyticsCollector.endPerformanceOperation(opId, userId, sessionId);
```

### Error Events

Track errors and exceptions:

```typescript
telemetry.trackEvent('error_runtime', EventCategory.ERROR, {
  message: 'Failed to evaluate cell formula',
  code: 'EVAL_ERROR',
  component: 'cell_engine',
  action: 'calculate',
});

// Using analytics collector
try {
  // ... code that might fail ...
} catch (error) {
  telemetry.analyticsCollector.trackError(
    error,
    'cell_engine',
    userId,
    sessionId,
    { action: 'calculate' }
  );
}
```

### Feature Events

Track feature usage:

```typescript
// Track feature with automatic duration tracking
const completeTracking = telemetry.analyticsCollector.trackFeatureUse(
  'predictions',
  userId,
  sessionId,
  { model: 'linear_regression' }
);

// ... feature is used ...
completeTracking(); // Records duration
```

## Privacy and Compliance

### GDPR Compliance

The telemetry system includes full GDPR compliance features:

```typescript
// Right to Access - Export user data
const userData = telemetry.exportUserData();
console.log(userData);
// {
//   userId: 'anon_abc123...',
//   consent: { ... },
//   sessions: [ ... ],
//   stats: { ... },
//   featureUsage: Map { ... }
// }

// Right to be Forgotten - Delete all user data
telemetry.deleteUserData();

// Manage consent
telemetry.setConsent(ConsentStatus.OPTED_IN, {
  analytics: true,
  marketing: false,
  performance: true,
});

// Check consent status
const hasConsent = telemetry.privacyManager.hasConsent(userId, 'analytics');
```

### PII Detection and Redaction

```typescript
import { createPrivacyManager } from '@polln/spreadsheet/telemetry';

const privacyManager = createPrivacyManager({
  piiDetection: true,
  anonymization: true,
});

// Detect PII in text
const result = privacyManager.detectPII(
  'Contact john@example.com for support'
);
console.log(result);
// {
//   detected: true,
//   types: [PIIType.EMAIL],
//   sanitized: 'Contact j***@e***.com for support',
//   original: 'Contact john@example.com for support',
//   confidence: 0.9
// }

// Sanitize entire objects
const clean = privacyManager.sanitizeObject({
  name: 'John Doe',
  email: 'john@example.com',
  message: 'This is fine'
});
```

### Data Retention

```typescript
// Configure retention policies
const telemetry = createTelemetryManager({
  retentionPolicy: '90d', // Retain data for 90 days
  privacy: {
    enforceRetention: true,
  },
});

// Check if data should be retained
const shouldRetain = privacyManager.shouldRetainData(
  '2024-01-01T00:00:00Z',
  '90d'
);
```

## Configuration

### Full Configuration Example

```typescript
const telemetry = createTelemetryManager({
  // Enable/disable telemetry
  enabled: true,

  // Sampling configuration
  samplingRate: 0.1, // Sample 10% of events
  samplingStrategy: 'consistent_hash', // Same events always sampled

  // Batching configuration
  batchSize: 100, // Flush after 100 events
  flushInterval: 60000, // Flush every 60 seconds
  maxQueueSize: 10000, // Maximum queue size

  // Data retention
  retentionPolicy: '90d',
  defaultConsent: ConsentStatus.PENDING,

  // Export platforms
  exportPlatforms: [
    {
      platform: ExportPlatform.MIXPANEL,
      enabled: true,
      apiKey: process.env.MIXPANEL_API_KEY,
      interval: 60000,
      batchSize: 100,
      retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        maxBackoffMs: 30000,
      },
    },
    {
      platform: ExportPlatform.LOCAL_FILE,
      enabled: true,
      interval: 300000, // 5 minutes
      batchSize: 500,
      retry: {
        maxAttempts: 2,
        backoffMs: 1000,
        maxBackoffMs: 5000,
      },
      options: {
        outputDir: './telemetry-exports',
      },
    },
  ],

  // Privacy configuration
  privacy: {
    piiDetection: true,
    anonymization: true,
    anonymizeIP: true,
    requireConsent: true,
    consentExpiration: 365, // 1 year
    enforceRetention: true,
    allowedPIIPatterns: [],
    blockedPIIPatterns: [],
  },
});
```

### Sampling Strategies

```typescript
// No sampling - collect all events
samplingStrategy: 'none',

// Random sampling based on samplingRate
samplingStrategy: 'random',

// Consistent per-user sampling
samplingStrategy: 'consistent_hash',

// Consistent per-session sampling
samplingStrategy: 'session_hash',

// Adaptive - sample low-priority events more
samplingStrategy: 'adaptive',
```

## Analytics and Statistics

### Performance Metrics

```typescript
// Get performance statistics for a metric
const perfStats = telemetry.getPerformanceStats('cell_evaluation');
console.log(perfStats);
// {
//   count: 1523,
//   avg: 245.5,
//   min: 12,
//   max: 2340,
//   p50: 180,
//   p95: 890,
//   p99: 1450
// }
```

### Error Tracking

```typescript
// Get top errors
const topErrors = telemetry.getTopErrors(10);
console.log(topErrors);
// [
//   {
//     message: 'Failed to evaluate formula',
//     component: 'cell_engine',
//     count: 234,
//     timestamp: '2024-01-15T10:30:00Z'
//   },
//   ...
// ]
```

### Feature Usage

```typescript
// Get feature usage statistics
const featureStats = telemetry.getFeatureUsageStats();
console.log(featureStats);
// Map {
//   'cell_transformations' => 1523,
//   'predictions' => 892,
//   'collaboration' => 456,
//   ...
// }
```

### Aggregated Statistics

```typescript
// Get statistics for a time window
const stats = telemetry.getStats(24); // Last 24 hours
console.log(stats);
// {
//   windowStart: '2024-01-15T00:00:00Z',
//   windowEnd: '2024-01-16T00:00:00Z',
//   totalEvents: 15234,
//   eventsByCategory: { ... },
//   eventsByType: { ... },
//   uniqueUsers: 456,
//   avgEventsPerUser: 33.4,
//   errorRate: 0.023,
//   performance: { ... }
// }
```

### User Journey Analysis

```typescript
// Get user journey for a session
const journey = telemetry.analyticsCollector.getUserJourney(sessionId);
console.log(journey);
// [
//   {
//     action: 'session_start',
//     timestamp: '2024-01-15T10:00:00Z'
//   },
//   {
//     action: 'feature_use',
//     timestamp: '2024-01-15T10:01:23Z',
//     feature: 'cell_transformations',
//     duration: 1523
//   },
//   ...
// ]
```

## Advanced Usage

### Custom Event Types

```typescript
import { registerEventSchema, EventCategory, EventPriority } from '@polln/spreadsheet/telemetry';

// Define a custom event schema
registerEventSchema({
  type: 'custom_workflow_complete',
  category: EventCategory.CUSTOM,
  priority: EventPriority.NORMAL,
  privacyLevel: 'anonymous',
  required: ['workflowId', 'duration'],
  optional: {
    success: 'boolean',
    stepCount: 'number',
  },
  validators: {
    workflowId: (value) => typeof value === 'string' && value.length > 0,
  },
  sensitive: false,
  description: 'Custom workflow completed',
  version: '1.0.0',
});

// Track the custom event
telemetry.trackEvent('custom_workflow_complete', EventCategory.CUSTOM, {
  workflowId: 'data-pipeline-001',
  duration: 5000,
  success: true,
  stepCount: 5,
});
```

### Standalone Components

```typescript
// Use only the privacy manager
import { createPrivacyManager } from '@polln/spreadsheet/telemetry';

const privacy = createPrivacyManager();
const result = privacy.detectPII('Contact john@example.com');

// Use only the aggregator
import { createAggregator } from '@polln/spreadsheet/telemetry';

const aggregator = createAggregator({
  windowSize: 60000, // 1 minute windows
  enableSampling: true,
  samplingRate: 0.1,
});

aggregator.aggregate(events);
const stats = aggregator.getStats(start, end);
```

## Best Practices

### 1. Always Check Consent

```typescript
// Before collecting sensitive data
if (telemetry.privacyManager.hasConsent(userId, 'analytics')) {
  telemetry.trackEvent(...);
}
```

### 2. Use Appropriate Event Categories

```typescript
// Choose the right category for your events
EventCategory.UI        // Interface interactions
EventCategory.CELL      // Cell operations
EventCategory.PERFORMANCE // Performance metrics
EventCategory.ERROR     // Errors and exceptions
EventCategory.FEATURE   // Feature usage
EventCategory.LIFECYCLE // User lifecycle events
```

### 3. Set Appurate Privacy Levels

```typescript
// Use appropriate privacy levels for your data
PrivacyLevel.SENSITIVE  // Contains PII - maximum protection
PrivacyLevel.PERSONAL   // Potentially identifying
PrivacyLevel.ANONYMOUS  // Anonymous but linkable
PrivacyLevel.AGGREGATED // Fully aggregated
```

### 4. Implement Graceful Shutdown

```typescript
// Clean shutdown
process.on('SIGTERM', async () => {
  await telemetry.shutdown();
  process.exit(0);
});
```

### 5. Monitor Queue Sizes

```typescript
// Check queue sizes to prevent memory issues
const queueSizes = telemetry.exporter.getAllQueueSizes();
console.log(queueSizes);
// { mixpanel: 0, local_file: 150, ... }

// Flush if needed
if (queueSizes.local_file > 1000) {
  await telemetry.flush();
}
```

## Privacy Considerations

### Data Minimization

- Only collect data that is necessary for your analytics
- Use sampling to reduce data collection volume
- Set appropriate retention policies

### User Rights

- **Right to Access**: Use `exportUserData()` to provide user data
- **Right to be Forgotten**: Use `deleteUserData()` to remove all user data
- **Right to Rectification**: Implement UI for users to correct their data
- **Right to Portability**: Provide data in commonly used format

### Consent Management

- Always obtain user consent before collecting data
- Provide clear information about what data is collected and why
- Allow users to easily withdraw consent
- Implement consent expiration and renewal

### Security

- Never log sensitive data or API keys
- Use environment variables for configuration
- Implement proper access controls for exported data
- Follow security best practices for data storage and transmission

## Troubleshooting

### Events Not Appearing in Analytics

1. Check if telemetry is enabled: `telemetry.isEnabled()`
2. Verify consent status: `telemetry.privacyManager.hasConsent(userId)`
3. Check queue sizes: `telemetry.exporter.getAllQueueSizes()`
4. Manually flush: `await telemetry.flush()`

### High Memory Usage

1. Reduce `maxQueueSize` in configuration
2. Enable sampling with lower `samplingRate`
3. Reduce `batchSize` to flush more frequently
4. Clear aggregated data: `telemetry.aggregator.clear()`

### Performance Issues

1. Use adaptive sampling for high-volume events
2. Increase `flushInterval` to reduce flush frequency
3. Use `SamplingStrategy.CONSISTENT_HASH` for predictable sampling
4. Disable unused export platforms

## API Reference

See individual TypeScript files for complete API documentation:

- `types.ts` - Type definitions
- `TelemetryManager.ts` - Main telemetry manager
- `PrivacyManager.ts` - Privacy and compliance
- `AnalyticsCollector.ts` - Analytics collection
- `Aggregator.ts` - Event aggregation
- `Exporter.ts` - Data export
- `EventTypes.ts` - Event schemas and validation

## License

MIT

## Support

For issues, questions, or contributions, please visit the POLLN repository.
