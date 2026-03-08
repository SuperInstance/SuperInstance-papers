# KV-Cache Endpoints

## Overview

KV-Cache endpoints provide access to Key-Value cache statistics and management. The KV-cache system optimizes LLM inference by reusing cached attention patterns.

## Query Cache Statistics

Query KV-cache statistics for a colony.

### Request

```typescript
{
  type: 'query:stats',
  payload: {
    colonyId: 'colony-1',
    includeKVCache: true
  }
}
```

### Response

```typescript
{
  type: 'response:stats',
  payload: {
    colonyId: 'colony-1',
    kvCacheStats: {
      hits: 850,
      misses: 150,
      hitRate: 0.85,
      missRate: 0.15,
      size: 1048576,
      capacity: 10485760,
      evictions: 10,
      avgAccessTime: 0.5,
      anchors: {
        total: 500,
        active: 350,
        matched: 400
      }
    }
  }
}
```

## Cache Statistics

### Basic Metrics

| Metric | Type | Description |
|--------|------|-------------|
| hits | number | Number of cache hits |
| misses | number | Number of cache misses |
| hitRate | number | Cache hit rate (0-1) |
| missRate | number | Cache miss rate (0-1) |
| size | number | Current cache size in bytes |
| capacity | number | Maximum cache capacity in bytes |
| evictions | number | Number of cache evictions |
| avgAccessTime | number | Average access time in milliseconds |

### Anchor Metrics

| Metric | Type | Description |
|--------|------|-------------|
| total | number | Total number of anchors |
| active | number | Number of active anchors |
| matched | number | Number of matched anchors |
