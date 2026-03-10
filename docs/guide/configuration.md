# Configuration

Complete guide to configuring POLLN, colonies, and cells.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Colony Configuration](#colony-configuration)
- [Cell Configuration](#cell-configuration)
- [Advanced Configuration](#advanced-configuration)

---

## Environment Variables

Configure POLLN using environment variables.

### Core Settings

```env
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Logging
POLLN_LOG_LEVEL=info
POLLN_LOG_FORMAT=json

# Colony
POLLN_COLONY_SIZE=100
POLLN_MAX_AGENTS=1000
```

### Security

```env
# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h

# Encryption
ENCRYPTION_KEY=your-encryption-key
ENCRYPTION_ALGORITHM=aes-256-gcm
```

### Storage

```env
# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password
REDIS_DB=0

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/polln
```

### Monitoring

```env
# Prometheus
PROMETHEUS_PORT=9090
PROMETHEUS_ENABLED=true

# Jaeger
JAEGER_ENDPOINT=http://localhost:14268/api/traces
JAEGER_SAMPLING_RATE=0.1
```

### LLM (Optional)

```env
# DeepSeek
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# OpenAI
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4
```

---

## Colony Configuration

Configure colony behavior.

### Basic Configuration

```typescript
const colony = new Colony('my-colony', {
  maxSize: 100,              // Maximum cells
  timeout: 30000,            // Operation timeout (ms)
  retries: 3                 // Retry attempts
})
```

### Communication

```typescript
const colony = new Colony('communicative', {
  communication: {
    protocol: 'websocket',   // 'websocket' | 'http'
    heartbeat: 30000,        // Heartbeat interval (ms)
    reconnect: true,         // Auto-reconnect
    compression: 'gzip',     // Message compression
    encryption: {            // Message encryption
      enabled: true,
      algorithm: 'aes-256-gcm'
    }
  }
})
```

### Persistence

```typescript
const colony = new Colony('persistent', {
  persistence: {
    enabled: true,
    store: 'redis',          // 'memory' | 'redis' | 'database'
    url: 'redis://localhost:6379',
    ttl: 3600000,           // Time to live (ms)
    sync: 'write-through'    // 'write-through' | 'write-behind'
  }
})
```

### Monitoring

```typescript
const colony = new Colony('monitored', {
  monitoring: {
    enabled: true,
    metrics: true,
    traces: true,
    logs: true,
    exporters: {
      prometheus: {
        enabled: true,
        port: 9090
      },
      jaeger: {
        enabled: true,
        endpoint: 'http://localhost:14268/api/traces'
      }
    }
  }
})
```

### Security

```typescript
const colony = new Colony('secure', {
  security: {
    authentication: {
      enabled: true,
      method: 'jwt',         // 'jwt' | 'api-key' | 'oauth'
      secret: process.env.JWT_SECRET,
      expiresIn: '1h'
    },
    authorization: {
      enabled: true,
      method: 'rbac'         // 'rbac' | 'acl'
    },
    encryption: {
      enabled: true,
      key: process.env.ENCRYPTION_KEY
    }
  }
})
```

---

## Cell Configuration

Configure individual cells.

### LogCell

```typescript
const cell = new LogCell('A1', {
  initialValue: 100,

  // Head configuration
  head: {
    sensation: 'absolute_change',
    threshold: 15,
    sources: ['B1', 'C1'],
    debounce: 1000
  },

  // Body configuration
  body: {
    analyzer: 'statistical',
    window: 30,
    confidence: 0.95,
    rules: [
      {
        condition: 'value > threshold',
        action: 'alert'
      }
    ]
  },

  // Tail configuration
  tail: {
    action: 'notify',
    targets: ['admin@example.com'],
    format: 'summary'
  }
})
```

### InputCell

```typescript
const input = new InputCell('data', {
  source: 'csv',            // 'csv' | 'json' | 'api' | 'database'
  path: './data.csv',
  refreshInterval: 60000,   // 1 minute
  transform: (row) => ({
    ...row,
    amount: parseFloat(row.amount)
  }),
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
```

### TransformCell

```typescript
const transform = new TransformCell('clean', {
  sources: ['raw-data'],
  transform: (data) => {
    return data
      .filter(item => item.active)
      .map(item => ({
        ...item,
        processed: true
      }))
  },
  cache: true,              // Cache results
  async: false              // Synchronous processing
})
```

### AggregateCell

```typescript
const aggregate = new AggregateCell('total', {
  sources: ['transactions'],
  aggregation: 'sum',       // 'sum' | 'avg' | 'min' | 'max' | 'count'
  groupBy: 'category',
  field: 'amount',
  window: 100              // Rolling window
})
```

### AnalysisCell

```typescript
const analysis = new AnalysisCell('analyzer', {
  sources: ['metrics'],
  analysis: 'trend',       // 'trend' | 'anomaly' | 'correlation'
  window: 30,
  confidence: 0.95,
  sensitivity: 2.0         # For anomaly detection
})
```

### PredictionCell

```typescript
const prediction = new PredictionCell('forecast', {
  sources: ['historical'],
  model: 'arima',          // 'arima' | 'linear' | 'neural'
  horizon: 7,              // Predict 7 steps ahead
  confidence: 0.95,
  retrainInterval: 86400000 // Retrain daily
})
```

---

## Advanced Configuration

### Custom Sensation

```typescript
const cell = new LogCell('custom', {
  head: {
    sensation: 'custom',
    detect: (oldValue, newValue) => {
      // Custom detection logic
      return Math.abs(newValue - oldValue) > 100
    }
  }
})
```

### Custom Transformation

```typescript
const transform = new TransformCell('custom', {
  sources: ['input'],
  transform: async (data) => {
    // Complex async transformation
    const result = await externalAPI.process(data)
    return result
  }
})
```

### Custom Rules

```typescript
const decision = new DecisionCell('custom', {
  sources: ['input'],
  rules: [
    {
      condition: (data) => data.score > 700 && data.income > 50000,
      action: 'approve',
      reason: 'Excellent credit and income'
    },
    {
      condition: (data) => data.score > 650,
      action: 'review',
      reason: 'Moderate credit score'
    }
  ]
})
```

### Middleware

```typescript
colony.use(async (context, next) => {
  // Pre-processing
  const start = Date.now()

  await next()

  // Post-processing
  const duration = Date.now() - start
  logger.info(`Request took ${duration}ms`)
})
```

### Plugins

```typescript
import { MyPlugin } from './plugins/my-plugin'

colony.use(new MyPlugin({
  option1: 'value1',
  option2: 'value2'
}))
```

---

## Configuration Files

### .pollnrc

Create a `.pollnrc` file in your project root:

```json
{
  "colony": {
    "maxSize": 100,
    "timeout": 30000
  },
  "communication": {
    "protocol": "websocket",
    "heartbeat": 30000
  },
  "persistence": {
    "enabled": true,
    "store": "redis"
  }
}
```

### polln.config.js

For more complex configuration:

```javascript
module.exports = {
  colony: {
    maxSize: process.env.NODE_ENV === 'production' ? 1000 : 10,
    timeout: parseInt(process.env.TIMEOUT || '30000')
  },
  communication: {
    protocol: 'websocket',
    heartbeat: 30000
  },
  plugins: [
    require('./plugins/auth'),
    require('./plugins/monitoring')
  ]
}
```

---

## Environment-Specific Configs

### Development

```typescript
const colony = new Colony('dev', {
  maxSize: 10,
  monitoring: { enabled: false },
  persistence: { enabled: false },
  logLevel: 'debug'
})
```

### Production

```typescript
const colony = new Colony('production', {
  maxSize: 1000,
  monitoring: { enabled: true },
  persistence: {
    enabled: true,
    store: 'redis'
  },
  logLevel: 'info',
  security: {
    authentication: { enabled: true },
    encryption: { enabled: true }
  }
})
```

### Testing

```typescript
const colony = new Colony('test', {
  maxSize: 5,
  monitoring: { enabled: false },
  persistence: { enabled: false },
  logLevel: 'warn'
})
```

---

## Best Practices

### 1. Use Environment Variables

```typescript
// ✅ Good
const maxSize = parseInt(process.env.COLONY_SIZE || '100')

// ❌ Bad
const maxSize = 100
```

### 2. Validate Configuration

```typescript
const config = {
  maxSize: 100,
  timeout: 30000
}

// Validate
if (config.maxSize < 1) {
  throw new Error('Invalid maxSize')
}
```

### 3. Use Defaults

```typescript
const colony = new Colony('my-colony', {
  maxSize: config.maxSize || 100,
  timeout: config.timeout || 30000
})
```

### 4. Document Configuration

```typescript
/**
 * Colony configuration
 * @param maxSize - Maximum number of cells (default: 100)
 * @param timeout - Operation timeout in ms (default: 30000)
 */
const colony = new Colony('my-colony', {
  maxSize,
  timeout
})
```

---

## Next Steps

- [Installation](./installation) - Setup POLLN
- [Quick Start](./quick-start) - Get started quickly
- [API Reference](./api/) - Complete API docs

---

**Need help?** Join our [Discord community](https://discord.gg/polln) or check [Examples](../examples/)!
