# Rate Limiting

## Overview

The POLLN WebSocket API enforces rate limits to ensure fair usage and prevent abuse. Rate limits are enforced per connection.

## Rate Limit Configuration

```typescript
interface RateLimitConfig {
  requestsPerMinute: number;  // Maximum requests per minute
  burstLimit: number;         // Maximum burst requests
  windowMs: number;           // Time window in milliseconds
}
```

### Default Configuration

```typescript
{
  requestsPerMinute: 100,
  burstLimit: 10,
  windowMs: 60000  // 1 minute
}
```

## Rate Limit Response

When rate limited, you'll receive:

```typescript
{
  type: 'error',
  payload: null,
  success: false,
  error: {
    code: 'RATE_LIMITED',
    message: 'Rate limit exceeded'
  }
}
```

## Handling Rate Limits

### Exponential Backoff

```typescript
async function sendWithBackoff(message: ClientMessage) {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const response = await sendAndWait(message);
      return response;
    } catch (error) {
      if (error.code === 'RATE_LIMITED') {
        attempts++;
        const delay = Math.pow(2, attempts) * 1000;  // 1s, 2s, 4s, 8s, 16s
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retry attempts reached');
}
```

## Rate Limit Best Practices

### 1. Subscribe Instead of Polling

```typescript
// Bad: Poll every second
setInterval(() => {
  queryStats('colony-1');
}, 1000);

// Good: Subscribe to stats updates
subscribeToStats('colony-1');
```

### 2. Cache Responses

```typescript
const cache = new Map<string, { data: unknown; expires: number }>();

async function cachedQuery(key: string, fn: Function) {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const data = await fn();
  cache.set(key, {
    data,
    expires: Date.now() + 60000  // 1 minute cache
  });
  return data;
}
```

### 3. Use WebSocket Efficiently

```typescript
// Bad: Open multiple connections
const ws1 = new WebSocket('ws://localhost:3000/api/ws');
const ws2 = new WebSocket('ws://localhost:3000/api/ws');

// Good: Use a single connection
const ws = new WebSocket('ws://localhost:3000/api/ws');
// Subscribe to multiple resources on one connection
```
