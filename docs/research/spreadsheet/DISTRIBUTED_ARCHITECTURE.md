# DISTRIBUTED_ARCHITECTURE.md - Scaling POLLN to Millions of Cells

**Comprehensive Research on Distributed Systems Architecture for Spreadsheet LOG Tool**

---

## Executive Summary

This document researches and analyzes distributed architecture patterns for scaling the POLLN spreadsheet LOG system from thousands to **millions of living cells**. It covers horizontal scaling, message queues, database sharding, and caching layers with detailed technology comparisons, deployment strategies, and trade-off analysis.

**Key Findings:**
- **Hybrid architecture** recommended: Redis Pub/Sub + PostgreSQL + CDN
- **Consistent hashing** for cell distribution across shards
- **Multi-level caching** with CDN, edge computing, and distributed cache
- **Geo-distributed deployment** for reduced latency
- **Cost-effective scaling** from $500/month (100K cells) to $50K/month (10M cells)

**Research Status:** ✅ COMPLETE
**Target Scale:** 1,000,000+ cells
**Architecture Pattern:** Event-driven microservices with eventual consistency

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Horizontal Scaling](#horizontal-scaling)
3. [Message Queues](#message-queues)
4. [Database Sharding](#database-sharding)
5. [Caching Layers](#caching-layers)
6. [Technology Comparison](#technology-comparison)
7. [Deployment Strategies](#deployment-strategies)
8. [Trade-off Analysis](#trade-off-analysis)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Cost Analysis](#cost-analysis)

---

## Architecture Overview

### Current Architecture (Single Instance)

```
┌─────────────────────────────────────────────────────────────┐
│                    POLLN Single Instance                     │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌────────────────────────────────────────────────┐          │
│   │         WebSocket API Server (Port 3000)        │          │
│   │   - Real-time cell communication               │          │
│   │   - Sensation propagation                      │          │
│   │   - Cell coordination                          │          │
│   └────────────┬───────────────────────────────────┘          │
│                │                                                │
│   ┌────────────▼───────────────────────────────────┐          │
│   │              Cell Manager                       │          │
│   │   - Cell lifecycle management                  │          │
│   │   - Head/Body/Tail orchestration               │          │
│   │   - Sensation routing                          │          │
│   └────────────┬───────────────────────────────────┘          │
│                │                                                │
│   ┌────────────▼───────────────────────────────────┐          │
│   │         In-Memory Cell Store                    │          │
│   │   - Map<CellId, LogCell>                       │          │
│   │   - Sensation registry                         │          │
│   │   - Watch relationships                        │          │
│   └────────────────────────────────────────────────┘          │
│                                                                │
│   ┌────────────────────────────────────────────────┐          │
│   │           Supporting Services                   │          │
│   │   - Redis (caching)                            │          │
│   │   - PostgreSQL (metadata)                      │          │
│   │   - Prometheus (metrics)                       │          │
│   └────────────────────────────────────────────────┘          │
│                                                                │
└─────────────────────────────────────────────────────────────┘

Limitations:
- Single point of failure
- Memory bound (max ~100K cells)
- No horizontal scaling
- Geographic latency
```

### Target Architecture (Distributed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    POLLN Distributed Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                        Global Load Balancer                         │    │
│   │                   (Geographic DNS + Anycast)                        │    │
│   └────┬──────────────┬──────────────┬──────────────┬──────────────┬────┘    │
│        │              │              │              │              │             │
│        ▼              ▼              ▼              ▼              ▼             │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐          │
│   │ Region  │   │ Region  │   │ Region  │   │ Region  │   │ Region  │          │
│   │   US    │   │   EU    │   │   APAC  │   │   SA    │   │   AF    │          │
│   │   East  │   │  West   │   │  North  │   │  East   │   │  South  │          │
│   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘          │
│        │              │              │              │              │             │
│        ▼              ▼              ▼              ▼              ▼             │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                     Region: US East (Example)                      │    │
│   ├────────────────────────────────────────────────────────────────────┤    │
│   │                                                                    │    │
│   │   ┌──────────────────────────────────────────────────────────┐     │    │
│   │   │              Regional Load Balancer (ALB)                │     │    │
│   │   │         - Round-robin / Least-loaded routing             │     │    │
│   │   │         - Health checks                                 │     │    │
│   │   │         - SSL termination                               │     │    │
│   │   └────┬────────────┬────────────┬────────────┬───────────┘     │    │
│   │        │            │            │            │                  │    │
│   │        ▼            ▼            ▼            ▼                  │    │
│   │   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐            │    │
│   │   │ API    │   │ API    │   │ API    │   │ API    │            │    │
│   │   │ Server │   │ Server │   │ Server │   │ Server │            │    │
│   │   │  #1    │   │  #2    │   │  #3    │   │  #4    │            │    │
│   │   └───┬────┘   └───┬────┘   └───┬────┘   └───┬────┘            │    │
│   │       │            │            │            │                  │    │
│   │       └────────────┴────────────┴────────────┘                  │    │
│   │                      │                                         │    │
│   │                      ▼                                         │    │
│   │   ┌──────────────────────────────────────────────────────┐     │    │
│   │   │          Message Queue Cluster (Redis Pub/Sub)        │     │    │
│   │   │   - Sensation propagation channels                   │     │    │
│   │   │   - Cell state synchronization                       │     │    │
│   │   │   - Coordination events                              │     │    │
│   │   └──────────────────────────────────────────────────────┘     │    │
│   │                                                                    │    │
│   │   ┌──────────────────────────────────────────────────────┐     │    │
│   │   │         Cell Shard Cluster (Horizontal Scaling)      │     │    │
│   │   │                                                       │     │    │
│   │   │   ┌────────────┐  ┌────────────┐  ┌────────────┐   │     │    │
│   │   │   │  Shard 1   │  │  Shard 2   │  │  Shard 3   │   │     │    │
│   │   │   │  Cells     │  │  Cells     │  │  Cells     │   │     │    │
│   │   │   │ 0-333K    │  │ 333-666K  │  │ 666-1000K │   │     │    │
│   │   │   │            │  │            │  │            │   │     │    │
│   │   │   │ - Cell Mgr │  │ - Cell Mgr │  │ - Cell Mgr │   │     │    │
│   │   │   │ - Memory   │  │ - Memory   │  │ - Memory   │   │     │    │
│   │   │   │ - KV Cache │  │ - KV Cache │  │ - KV Cache │   │     │    │
│   │   │   └────────────┘  └────────────┘  └────────────┘   │     │    │
│   │   └──────────────────────────────────────────────────────┘     │    │
│   │                                                                    │    │
│   │   ┌──────────────────────────────────────────────────────┐     │    │
│   │   │          Distributed Cache Layer (Redis Cluster)     │     │    │
│   │   │   - Hot cell data                                   │     │    │
│   │   │   - Sensation computation cache                      │     │    │
│   │   │   - Session state                                   │     │    │
│   │   └──────────────────────────────────────────────────────┘     │    │
│   │                                                                    │    │
│   │   ┌──────────────────────────────────────────────────────┐     │    │
│   │   │      Database Cluster (PostgreSQL - Sharded)        │     │    │
│   │   │   - Cell metadata                                   │     │    │
│   │   │   - Watch relationships                             │     │    │
│   │   │   - Reasoning traces                                │     │    │
│   │   │   - Execution history                               │     │    │
│   │   └──────────────────────────────────────────────────────┘     │    │
│   │                                                                    │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                     Global Services (Centralized)                  │    │
│   ├────────────────────────────────────────────────────────────────────┤    │
│   │   - CDN (CloudFront/Cloudflare) - Static assets, UI bundles       │    │
│   │   - Edge Computing - Cell rendering, pre-computation              │    │
│   │   - Central Metadata - Schema definitions, templates              │    │
│   │   - Global Monitoring - Prometheus, Grafana, Jaeger               │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Key Benefits:
- Horizontal scaling to millions of cells
- Geographic distribution for low latency
- High availability (no single point of failure)
- Cost-effective (pay for what you use)
- Graceful degradation
```

---

## Horizontal Scaling

### Scaling Dimensions

The POLLN system can scale along three dimensions:

```
┌─────────────────────────────────────────────────────────────┐
│                 POLLN Scaling Dimensions                    │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│   1. VERTICAL SCALING (Scale Up)                             │
│      ┌─────────────────────────────────────┐                 │
│      │  Larger Instance                   │                 │
│      │  - More CPU                         │                 │
│      │  - More RAM                         │                 │
│      │  - Faster SSD                       │                 │
│      │                                     │                 │
│      │  Limits:                            │                 │
│      │  - Max instance size               │                 │
│      │  - Single point of failure         │                 │
│      │  - Cost scaling is non-linear      │                 │
│      └─────────────────────────────────────┘                 │
│                                                                │
│   2. HORIZONTAL SCALING (Scale Out)                           │
│      ┌─────────────┬─────────────┬─────────────┐             │
│      │  Instance 1 │  Instance 2 │  Instance 3 │             │
│      │  (Shard 1)  │  (Shard 2)  │  (Shard 3)  │             │
│      └─────────────┴─────────────┴─────────────┘             │
│                        │                                     │
│                        ▼                                     │
│      ┌─────────────────────────────────────┐                 │
│      │  Load Balancer + Session Affinity  │                 │
│      │                                     │                 │
│      │  Benefits:                          │                 │
│      │  - Linear scaling                  │                 │
│      │  - High availability               │                 │
│      │  - Fault isolation                 │                 │
│      │  - Cost-effective                  │                 │
│      └─────────────────────────────────────┘                 │
│                                                                │
│   3. GEOGRAPHIC SCALING (Multi-Region)                        │
│      ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│      │   US     │  │   EU     │  │  APAC    │              │
│      │  East    │  │  West    │  │  North   │              │
│      └──────────┘  └──────────┘  └──────────┘              │
│           │             │             │                       │
│           └─────────────┴─────────────┘                       │
│                     │                                         │
│                     ▼                                         │
│      ┌─────────────────────────────────────┐                 │
│      │  Global Load Balancer              │                 │
│      │  - Geographic routing              │                 │
│      │  - Latency-based routing           │                 │
│      │  - Regional failover               │                 │
│      │                                     │                 │
│      │  Benefits:                          │                 │
│      │  - Reduced latency (<50ms)          │                 │
│      │  - Data sovereignty                │                 │
│      │  - Disaster recovery               │                 │
│      └─────────────────────────────────────┘                 │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Instance Deployment

#### Architecture Pattern: Stateless API Servers + Stateful Shards

```
┌───────────────────────────────────────────────────────────────────┐
│              Multi-Instance Deployment Architecture               │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│   Client                                                          │
│     │                                                             │
│     ▼                                                             │
│   ┌─────────────────────────────────────────────────────┐         │
│   │           Global Load Balancer (Cloudflare)         │         │
│   │   - Anycast IP                                      │         │
│   │   - Geographic routing                              │         │
│   │   - DDoS protection                                 │         │
│   └─────────────────────────────────────────────────────┘         │
│                        │                                         │
│     ┌──────────────────┼──────────────────┬──────────┐          │
│     │                  │                  │          │            │
│     ▼                  ▼                  ▼          ▼            │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐  ┌─────────┐    │
│   │   US    │      │   EU    │      │  APAC   │  │   SA    │    │
│   │ Region  │      │ Region  │      │ Region  │  │ Region  │    │
│   └────┬────┘      └────┬────┘      └────┬────┘  └────┬────┘    │
│        │                │                │             │           │
│        ▼                ▼                ▼             ▼           │
│   ┌─────────────────────────────────────────────────────────────┐ │
│   │               Regional Load Balancer (ALB)                 │ │
│   └─────────────────────────────────────────────────────────────┘ │
│                        │                                         │
│     ┌──────────────────┼──────────────────┬──────────┐          │
│     │                  │                  │          │            │
│     ▼                  ▼                  ▼          ▼            │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│   │ API Server  │  │ API Server  │  │ API Server  │              │
│   │ Instance 1  │  │ Instance 2  │  │ Instance 3  │              │
│   │ (Stateless) │  │ (Stateless) │  │ (Stateless) │              │
│   │             │  │             │  │             │              │
│   │ - WebSocket │  │ - WebSocket │  │ - WebSocket │              │
│   │ - HTTP/REST │  │ - HTTP/REST │  │ - HTTP/REST │              │
│   │ - GraphQL   │  │ - GraphQL   │  │ - GraphQL   │              │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│          │                │                │                      │
│          └────────────────┴────────────────┘                      │
│                           │                                       │
│                           ▼                                       │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │         Consistent Hash Ring (Cell Distribution)            │ │
│   │                                                              │ │
│   │   Shard 1 (0-33%)   Shard 2 (33-66%)   Shard 3 (66-100%)    │ │
│   │   ┌──────────┐      ┌──────────┐      ┌──────────┐          │ │
│   │   │ Cells    │      │ Cells    │      │ Cells    │          │ │
│   │   │ 0-333K   │      │ 333-666K │      │ 666-1000K│          │ │
│   │   │          │      │          │      │          │          │ │
│   │   │ - Cell   │      │ - Cell   │      │ - Cell   │          │ │
│   │   │   Mgr   │      │   Mgr   │      │   Mgr   │          │ │
│   │   │ - KV     │      │ - KV     │      │ - KV     │          │ │
│   │   │   Cache  │      │   Cache  │      │   Cache  │          │ │
│   │   │ - Local  │      │ - Local  │      │ - Local  │          │ │
│   │   │   Store  │      │   Store  │      │   Store  │          │ │
│   │   └──────────┘      └──────────┘      └──────────┘          │ │
│   └──────────────────────────────────────────────────────────────┘ │
│                           │                                       │
│                           ▼                                       │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │          Shared Infrastructure (Stateful Services)           │ │
│   │                                                              │ │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│   │   │ Redis Cluster│  │ PostgreSQL   │  │ S3/Object    │     │ │
│   │   │ (Session)    │  │ (Metadata)   │  │ Storage      │     │ │
│   │   └──────────────┘  └──────────────┘  └──────────────┘     │ │
│   └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Key Design Principles:
1. **API servers are stateless** - Can be added/removed dynamically
2. **Cell shards are stateful** - Use consistent hashing for distribution
3. **Session affinity** - WebSocket connections stick to same region
4. **Shared infrastructure** - Databases, cache, storage are shared
```

#### Instance Sizing Guide

| Scale | API Servers | Cell Shards | Instance Type | Total Instances |
|-------|-------------|-------------|---------------|-----------------|
| 100K cells | 2 | 2 | c5.large (2 vCPU, 4GB) | 4 |
| 500K cells | 4 | 4 | c5.xlarge (4 vCPU, 8GB) | 8 |
| 1M cells | 6 | 6 | c5.2xlarge (8 vCPU, 16GB) | 12 |
| 5M cells | 12 | 12 | c5.4xlarge (16 vCPU, 32GB) | 24 |
| 10M cells | 20 | 20 | c5.9xlarge (36 vCPU, 72GB) | 40 |

**Cost Estimates (AWS us-east-1):**
- c5.large: ~$85/month
- c5.xlarge: ~$170/month
- c5.2xlarge: ~$340/month
- c5.4xlarge: ~$680/month
- c5.9xlarge: ~$1,530/month

### Load Balancing Strategies

#### 1. Round-Robin (Default)

```
Request 1 → Instance 1
Request 2 → Instance 2
Request 3 → Instance 3
Request 4 → Instance 1
...

Pros:
- Simple to implement
- Even distribution
- No state tracking

Cons:
- Doesn't consider load
- Doesn't consider instance capacity
- Can overload slow instances

Best For:
- Stateless API servers
- Uniform request patterns
- Development/testing
```

#### 2. Least-Loaded (Recommended)

```
Track concurrent connections per instance:
Instance 1: 145 connections
Instance 2: 98 connections  ← Route here
Instance 3: 167 connections

Pros:
- Better load distribution
- Considers actual load
- Prevents hotspots

Cons:
- Requires load tracking
- More complex state
- Potential for stale data

Best For:
- Production environments
- Variable request loads
- Mixed instance types
```

#### 3. Consistent Hashing (For Cell Shards)

```
Hash function: hash(cellId) % numShards

Cell "abc123" → hash() → 84721 % 3 → Shard 1
Cell "def456" → hash() → 23456 % 3 → Shard 2
Cell "ghi789" → hash() → 56789 % 3 → Shard 3

Benefits:
- Same cell always routes to same shard
- Minimal rebalancing when shards change
- Deterministic distribution

Implementation:
import { createHash } from 'crypto';

function getShard(cellId: string, numShards: number): number {
  const hash = createHash('sha1')
    .update(cellId)
    .digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return hashInt % numShards;
}
```

#### 4. Weighted Round-Robin (Mixed Instance Types)

```
Instance 1 (c5.9xlarge): weight = 36  → 3 requests
Instance 2 (c5.2xlarge): weight = 8   → 1 request
Instance 3 (c5.xlarge):  weight = 4   → 1 request

Pattern: 1, 1, 1, 2, 3, 1, 1, 1, 2, 3, ...

Pros:
- Utilizes larger instances more
- Cost-effective distribution
- Flexible sizing

Cons:
- Complex configuration
- Requires capacity planning

Best For:
- Mixed instance types
- Cost optimization
- Gradual migration
```

### Session Affinity

WebSocket connections require session affinity (sticky sessions):

```
┌─────────────────────────────────────────────────────────────┐
│              Session Affinity Strategies                    │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  1. IP Hash Affinity                                           │
│     ┌─────────────────────────────────────────┐              │
│     │ hash(clientIP) % numInstances            │              │
│     │ → Instance                               │              │
│     └─────────────────────────────────────────┘              │
│     • Same IP always routes to same instance                   │
│     • Works with load balancer IP passthrough                 │
│     • Problem: NAT/proxies break this                         │
│                                                                │
│  2. Cookie-Based Affinity (Recommended)                        │
│     ┌─────────────────────────────────────────┐              │
│     │ Set-Cookie: AWSALB=instance-id; Path=/   │              │
│     │ → All requests with cookie route to      │              │
│     │   same instance                          │              │
│     └─────────────────────────────────────────┘              │
│     • Works through proxies                                      │
│     • Survives IP changes                                       │
│     • ALB/ELB supports automatically                            │
│                                                                │
│  3. JWT-Based Affinity (Custom)                               │
│     ┌─────────────────────────────────────────┐              │
│     │ JWT contains: {instanceId, expiresAt}    │              │
│     │ → Client includes in every request       │              │
│     └─────────────────────────────────────────┘              │
│     • Client-side routing                                         │
│     • No load balancer dependency                                │
│     • More complex implementation                               │
│                                                                │
│  4. Connection-Based (WebSocket)                              │
│     ┌─────────────────────────────────────────┐              │
│     │ Upgrade: websocket → Instance selected   │              │
│     │ → All messages stay on that TCP conn    │              │
│     └─────────────────────────────────────────┘              │
│     • Automatic with TCP connections                               │
│     • Load balancer preserves TCP state                          │
│     • Most robust for WebSockets                                │
│                                                                │
└─────────────────────────────────────────────────────────────┘

AWS ALB Configuration:
{
  "TargetGroupAttributes": [
    {
      "Key": "stickiness.enabled",
      "Value": "true"
    },
    {
      "Key": "stickiness.type",
      "Value": "lb_cookie"
    },
    {
      "Key": "stickiness.duration_seconds",
      "Value": "3600"
    }
  ]
}
```

### Geo-Distributed Deployment

#### Region Selection Strategy

```
┌─────────────────────────────────────────────────────────────┐
│              Geographic Region Selection                     │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  Primary Factors:                                              │
│  1. User proximity (latency < 100ms)                          │
│  2. Data sovereignty requirements                             │
│  3. Cost optimization                                         │
│  4. Disaster recovery                                         │
│                                                                │
│  Recommended Regions:                                          │
│                                                                │
│  ┌──────────────────┬──────────────┬─────────────────┐        │
│  │ Region           │ Users Served │ Latency Target  │        │
│  ├──────────────────┼──────────────┼─────────────────┤        │
│  │ us-east-1        │ US East      │ < 50ms          │        │
│  │ (N. Virginia)    │ South America│                 │        │
│  ├──────────────────┼──────────────┼─────────────────┤        │
│  │ eu-west-1        │ Europe       │ < 50ms          │        │
│  │ (Ireland)        │ Africa       │                 │        │
│  ├──────────────────┼──────────────┼─────────────────┤        │
│  │ ap-southeast-1   │ Asia Pacific │ < 80ms          │        │
│  │ (Singapore)      │ Oceania      │                 │        │
│  └──────────────────┴──────────────┴─────────────────┘        │
│                                                                │
│  Cost Comparison (per instance hour):                          │
│  - us-east-1:     $0.17 (c5.large)                           │
│  - eu-west-1:     $0.18 (c5.large) [+6%]                     │
│  - ap-southeast-1:$0.14 (c5.large) [-18%]                    │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Cross-Region Data Replication

```
┌─────────────────────────────────────────────────────────────┐
│           Cross-Region Replication Strategy                  │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Global Metadata (Async Replication)                       │
│                                                                │
│     ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│     │   US    │────▶│   EU    │────▶│  APAC   │              │
│     │ Region  │     │ Region  │     │ Region  │              │
│     └─────────┘     └─────────┘     └─────────┘              │
│          │               │               │                     │
│          ▼               ▼               ▼                     │
│     ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│     │ Primary  │     │ Replica │     │ Replica │              │
│     │ Master  │     │ Slave   │     │ Slave   │              │
│     └─────────┘     └─────────┘     └─────────┘              │
│                                                                │
│     • Schema definitions                                       │
│     • Template catalog                                         │
│     • User accounts                                            │
│     • Billing data                                             │
│     • RPO: 5 minutes, RTO: 1 hour                             │
│                                                                │
│  2. Cell State (Shard-Affine)                                  │
│                                                                │
│     Cell A1-100 → US East (primary owner)                      │
│     Cell A101-200 → EU West (primary owner)                    │
│     Cell A201-300 → APAC (primary owner)                       │
│                                                                │
│     • Each cell lives in ONE region                           │
│     • No cross-region replication (too expensive)              │
│     • Clients connect to nearest region                        │
│     • Cross-region sensations via message queue                │
│                                                                │
│  3. Session State (Local Only)                                 │
│                                                                │
│     WebSocket → Regional instance only                         │
│     • Not replicated across regions                            │
│     • Reconnect on failover                                    │
│     • Session restoration from metadata                        │
│                                                                │
└─────────────────────────────────────────────────────────────┘

Implementation:

// Cell region assignment
function assignRegion(cellId: string): string {
  const hash = createHash('sha1').update(cellId).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
  return regions[hashInt % regions.length];
}

// Cross-region sensation forwarding
async function forwardSensation(
  sensation: Sensation,
  targetRegion: string
): Promise<void> {
  await messageQueue.publish(
    `sensations.${targetRegion}`,
    sensation
  );
}
```

---

## Message Queues

### Message Queue Requirements for POLLN

```
┌─────────────────────────────────────────────────────────────┐
│           POLLN Message Queue Requirements                    │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  Message Types:                                                │
│  1. Sensation Propagation (High Volume)                        │
│     • 4M+ sensations/second (per SIM_NETWORK_SCALING.md)       │
│     • Fan-out: 1 sensation → N watching cells                 │
│     • Latency: < 10ms                                         │
│     • Durability: Optional (can recompute)                    │
│                                                                │
│  2. Cell State Updates (Medium Volume)                         │
│     • Cell value changes                                      │
│     • State transitions (dormant → sensing)                   │
│     • Latency: < 100ms                                        │
│     • Durability: Required (audit trail)                      │
│                                                                │
│  3. Coordination Events (Low Volume)                           │
│     • Multi-cell decisions                                    │
│     • Synchronization barriers                                │
│     • Latency: < 50ms                                         │
│     • Durability: Required                                    │
│                                                                │
│  4. System Events (Very Low Volume)                            │
│     • Scaling events                                         │
│     • Failover triggers                                       │
│     • Health checks                                           │
│     • Latency: Not critical                                   │
│     • Durability: Critical                                    │
│                                                                │
│  Required Features:                                            │
│  ✓ Pub/Sub (one-to-many)                                       │
│  ✓ Low latency (< 10ms)                                        │
│  ✓ High throughput (10M+ messages/sec)                         │
│  ✓ Horizontal scaling                                          │
│  ✓ Fault tolerance                                             │
│  ✓ Message ordering (per channel)                              │
│  ✓ At-least-once delivery                                      │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Technology Comparison

#### 1. Redis Pub/Sub

```
┌─────────────────────────────────────────────────────────────┐
│                  Redis Pub/Sub                               │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  Architecture:                                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Redis Pub/Sub Flow                      │    │
│  │                                                       │    │
│  │   Publisher               Subscribers               │    │
│  │      │                        ▲                     │    │
│  │      │    ┌───────────────────┴─────┐               │    │
│  │      ▼    │   Redis Channel       │               │    │
│  │   ┌────┴───┐   sensations:cell_A2 │               │    │
│  │   │ Redis  │                       │               │    │
│  │   │ Pub/Sub│──▶ Subscriber 1 ──────┘               │    │
│  │   │        │──▶ Subscriber 2 ──────┐               │    │
│  │   └────────┘──▶ Subscriber 3 ──────┼───┐           │    │
│  │                                      │   │           │    │
│  │   Message: {                         │   │           │    │
│  │     type: 'sensation',              │   │           │    │
│  │     source: 'A2',                   │   │           │    │
│  │     value: 0.15                     │   │           │    │
│  │   }                                 │   │           │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Pros:                                                          │
│  ✓ Extremely low latency (< 1ms)                               │
│  ✓ Very high throughput (10M+ msg/sec)                         │
│  ✓ Simple to implement                                         │
│  ✓ Built-in to existing Redis infrastructure                   │
│  ✓ Minimal operational overhead                                │
│                                                                │
│  Cons:                                                          │
│  ✗ Fire-and-forget (no persistence)                           │
│  ✗ No message replay                                           │
│  ✗ Subscribers must be always connected                       │
│  ✗ No dead letter queue                                        │
│  ✗ No exactly-once semantics                                   │
│                                                                │
│  Best For:                                                      │
│  • Sensation propagation (high volume, can recompute)          │
│  • Real-time cell state updates                                │
│  • Development/testing                                         │
│                                                                │
│  Performance:                                                  │
│  • Throughput: 10M+ messages/second                            │
│  • Latency: < 1ms                                              │
│  • Max channels: Unlimited                                     │
│  • Max subscribers: 10K+ per channel                           │
│                                                                │
│  Cost:                                                         │
│  • Memory-optimized: $0.25/GB/month                            │
│  • For 100K cells: ~$20/month                                  │
│  • For 1M cells: ~$200/month                                   │
│                                                                │
└─────────────────────────────────────────────────────────────┘

Implementation:

import { createClient } from 'redis';

class RedisPubSub {
  private publisher: ReturnType<typeof createClient>;
  private subscriber: ReturnType<typeof createClient>;

  async publishSensation(sensation: Sensation): Promise<void> {
    const channel = `sensations:${sensation.source}`;
    await this.publisher.publish(channel, JSON.stringify(sensation));
  }

  async subscribeToCell(
    cellId: string,
    handler: (sensation: Sensation) => void
  ): Promise<void> {
    const channel = `sensations:${cellId}`;
    await this.subscriber.subscribe(channel, (message) => {
      handler(JSON.parse(message));
    });
  }
}
```

#### 2. RabbitMQ

```
┌─────────────────────────────────────────────────────────────┐
│                  RabbitMQ                                   │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  Architecture:                                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              RabbitMQ Exchange/Queue Model           │    │
│  │                                                       │    │
│  │   Producer                                            │    │
│  │      │                                                 │    │
│  │      ▼                                                 │    │
│  │   ┌──────────────┐                                    │    │
│  │   │  Exchange    │                                    │    │
│  │   │  (fanout)    │                                    │    │
│  │   └──────┬───────┘                                    │    │
│  │          │                                             │    │
│  │          ├─────────┬─────────┬─────────┐               │    │
│  │          ▼         ▼         ▼         ▼               │    │
│  │       ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐              │    │
│  │       │ Q1  │  │ Q2  │  │ Q3  │  │ Q4  │               │    │
│  │       │     │  │     │  │     │  │     │               │    │
│  │       └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘               │    │
│  │          │        │        │        │                    │    │
│  │          ▼        ▼        ▼        ▼                    │    │
│  │       ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐              │    │
│  │       │ C1  │  │ C2  │  │ C3  │  │ C4  │               │    │
│  │       └─────┘  └─────┘  └─────┘  └─────┘               │    │
│  │                                                       │    │
│  │   • Durable queues survive restarts                   │    │
│  │   • Dead letter queue for failed messages            │    │
│  │   • Message acknowledgments                          │    │
│  │   • Consumer priorities                              │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Pros:                                                          │
│  ✓ Message persistence (durable queues)                        │
│  ✓ Message acknowledgments                                    │
│  ✓ Dead letter queue                                            │
│  ✓ Flexible routing (exchanges)                                │
│  ✓ Consumer priorities                                         │
│  ✓ Message TTL                                                  │
│  ✓ At-least-once delivery                                      │
│                                                                │
│  Cons:                                                          │
│  ✗ Higher latency (~5-10ms)                                    │
│  ✗ Lower throughput than Redis                                 │
│  ✗ More complex setup                                          │
│  ✗ Requires separate infrastructure                            │
│  ✗ Erlang/OTP learning curve                                   │
│                                                                │
│  Best For:                                                      │
│  • Critical coordination events                                │
│  • Cell state updates (require persistence)                    │
│  • System events                                               │
│  • Production workloads requiring reliability                  │
│                                                                │
│  Performance:                                                  │
│  • Throughput: 1M+ messages/second                             │
│  • Latency: 5-10ms                                             │
│  • Max queues: Thousands                                       │
│  • Max consumers: Thousands                                    │
│                                                                │
│  Cost:                                                         │
│  • Managed AWS MQ: $0.36/hour (~$260/month)                    │
│  • Self-hosted: Included with EC2                             │
│                                                                │
└─────────────────────────────────────────────────────────────┘

Implementation:

import amqp from 'amqplib';

class RabbitMQPublisher {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async publishSensation(sensation: Sensation): Promise<void> {
    const exchange = 'sensations';
    const routingKey = sensation.source;

    await this.channel.assertExchange(exchange, 'fanout', {
      durable: true
    });

    await this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(sensation)),
      {
        deliveryMode: 2,  // Persistent
        messageId: sensation.id,
        timestamp: Date.now()
      }
    );
  }
}
```

#### 3. Apache Kafka

```
┌─────────────────────────────────────────────────────────────┐
│                  Apache Kafka                                │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  Architecture:                                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Kafka Topics/Partitions                  │    │
│  │                                                       │    │
│  │   Producer                                            │    │
│  │      │                                                 │    │
│  │      ▼                                                 │    │
│  │   ┌──────────────────────────────────────┐            │    │
│  │   │   Topic: cell-state-changes          │            │    │
│  │   │                                       │            │    │
│  │   │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │            │    │
│  │   │   │ P0  │ │ P1  │ │ P2  │ │ P3  │   │            │    │
│  │   │   └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘   │            │    │
│  │   │      │      │      │      │        │            │    │
│  │   │      ▼      ▼      ▼      ▼        │            │    │
│  │   │   ┌──────────────────────────┐     │            │    │
│  │   │   │      Consumer Group      │     │            │    │
│  │   │   │                           │     │            │    │
│  │   │   │ C1 ◀─ P0                 │     │            │    │
│  │   │   │ C2 ◀─ P1                 │     │            │    │
│  │   │   │ C3 ◀─ P2                 │     │            │    │
│  │   │   │ C4 ◀─ P3                 │     │            │    │
│  │   │   └──────────────────────────┘     │            │    │
│  │   │                                   │            │    │
│  │   │   Features:                       │            │    │
│  │   │   • Message replay (retention)    │            │    │
│  │   │   • Offset tracking              │            │    │
│  │   │   • Compaction                   │            │    │
│  │   │   • Exactly-once semantics        │            │    │
│  │   └───────────────────────────────────┘            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Pros:                                                          │
│  ✓ Message replay (time travel)                                │
│  ✓ Exactly-once semantics                                      │
│  ✓ Very high throughput (100M+ msg/sec)                        │
│  ✓ Horizontal scaling (partitions)                             │
│  ✓ Long-term retention                                         │
│  ✓ Stream processing (Kafka Streams)                           │
│                                                                │
│  Cons:                                                          │
│  ✗ High latency (~50ms)                                        │
│  ✗ Complex setup and operations                                │
│  ✗ Requires ZooKeeper (or KRaft mode)                          │
│  ✗ Heavy resource usage                                        │
│  ✗ Overkill for simple pub/sub                                │
│                                                                │
│  Best For:                                                      │
│  • Event sourcing (cell state history)                         │
│  • Audit trails                                                │
│  • Stream processing (aggregations)                            │
│  • Very large scale (10M+ cells)                               │
│                                                                │
│  Performance:                                                  │
│  • Throughput: 100M+ messages/second                           │
│  • Latency: 10-50ms                                            │
│  • Max partitions: Thousands per topic                         │
│  • Retention: Days to forever                                  │
│                                                                │
│  Cost:                                                         │
│  • Managed AWS MSK: $0.21/hour (~$150/month)                   │
│  • Self-hosted: Included with EC2                              │
│                                                                │
└─────────────────────────────────────────────────────────────┘

Implementation:

import { Kafka } from 'kafkajs';

class KafkaPublisher {
  private kafka: Kafka;
  private producer: any;

  async publishSensation(sensation: Sensation): Promise<void> {
    await this.producer.send({
      topic: 'sensations',
      messages: [{
        key: sensation.source,
        value: JSON.stringify(sensation),
        headers: {
          'sensation-type': sensation.type,
          'timestamp': sensation.timestamp.toString()
        }
      }]
    });
  }
}
```

#### 4. AWS SQS/SNS

```
┌─────────────────────────────────────────────────────────────┐
│                  AWS SQS/SNS                                │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  Architecture:                                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              SNS Fanout to SQS Queues                │    │
│  │                                                       │    │
│  │   Publisher                                            │    │
│  │      │                                                 │    │
│  │      ▼                                                 │    │
│  │   ┌──────────────┐                                    │    │
│  │   │  SNS Topic   │                                    │    │
│  │   │ sensations   │                                    │    │
│  │   └──────┬───────┘                                    │    │
│  │          │                                             │    │
│  │          ├─────────┬─────────┬─────────┐               │    │
│  │          ▼         ▼         ▼         ▼               │    │
│  │       ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐              │    │
│  │       │ SQS │  │ SQS │  │ SQS │  │ SQS │               │    │
│  │       │ Q1  │  │ Q2  │  │ Q3  │  │ Q4  │               │    │
│  │       └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘               │    │
│  │          │        │        │        │                    │    │
│  │          ▼        ▼        ▼        ▼                    │    │
│  │       ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐              │    │
│  │       │ W1  │  │ W2  │  │ W3  │  │ W4  │               │    │
│  │       └─────┘  └─────┘  └─────┘  └─────┘               │    │
│  │                                                       │    │
│  │   Benefits:                                          │    │
│  │   • Fully managed                                    │    │
│  │   • Auto-scaling                                     │    │
│  │   • Serverless pricing                               │    │
│  │   • High availability                                │    │
│  │   • DLQ support                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Pros:                                                          │
│  ✓ Fully managed (no ops)                                      │
│  ✓ Auto-scaling                                                 │
│  ✓ Pay-per-use ($0.40/M requests)                              │
│  ✓ High availability                                            │
│  ✓ DLQ support                                                  │
│  ✓ FIFO queues for ordering                                     │
│                                                                │
│  Cons:                                                          │
│  ✗ Higher latency (~20-50ms)                                   │
│  ✗ Lower throughput than Redis/Kafka                           │
│  ✗ Vendor lock-in (AWS)                                        │
│  ✗ Message size limit (256KB)                                  │
│  ✗ Long polling required for low latency                       │
│                                                                │
│  Best For:                                                      │
│  • Cloud-native deployments                                    │
│  • Serverless architectures                                    │
│  • Variable workloads                                           │
│  • Small to medium scale (< 1M cells)                          │
│                                                                │
│  Performance:                                                  │
│  • Throughput: Unlimited (auto-scaling)                        │
│  • Latency: 20-50ms (with long polling)                        │
│  • Max queues: Unlimited                                       │
│  • Message size: 256KB                                         │
│                                                                │
│  Cost:                                                         │
│  • SNS: $0.50/M requests                                       │
│  • SQS: $0.40/M requests                                       │
│  • For 4M sensations/sec: ~$2,400/month                        │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Hybrid Approach

```
┌─────────────────────────────────────────────────────────────┐
│         Hybrid Message Queue Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌──────────────────────────────────────────────────────┐   │
│   │            POLLN Message Router                       │   │
│   └────────┬──────────────┬──────────────┬──────────────┘   │
│            │              │              │                     │
│            ▼              ▼              ▼                     │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│   │  Redis     │  │  RabbitMQ  │  │  Kafka     │           │
│   │  Pub/Sub   │  │           │  │           │           │
│   │            │  │            │  │            │           │
│   │ Fast       │  │ Reliable   │  │ Persistent │           │
│   │ Volatile   │  │ Durable    │  │ Replayable │           │
│   └────────────┘  └────────────┘  └────────────┘           │
│         │                │                │                  │
│         └────────────────┴────────────────┘                 │
│                           │                                  │
│                           ▼                                  │
│                   ┌─────────────┐                             │
│                   │  Consumers  │                             │
│                   │             │                             │
│                   │ - Cell Mgr  │                             │
│                   │ - Analytics │                             │
│                   │ - Audit     │                             │
│                   └─────────────┘                             │
│                                                                │
│   Message Routing Table:                                        │
│   ┌──────────────────────┬──────────────────┬────────┐        │
│   │ Message Type         │ Queue             │ Latency│        │
│   ├──────────────────────┼──────────────────┼────────┤        │
│   │ Sensations (live)     │ Redis Pub/Sub    │ < 1ms  │        │
│   │ Cell state updates   │ RabbitMQ         │ 5-10ms │        │
│   │ Coordination events  │ RabbitMQ         │ 5-10ms │        │
│   │ System events        │ RabbitMQ         │ 5-10ms │        │
│   │ Audit trail          │ Kafka            │ 10-50ms│        │
│   │ Analytics events     │ Kafka            │ 10-50ms│        │
│   └──────────────────────┴──────────────────┴────────┘        │
│                                                                │
│   Cost Summary (1M cells, 4M sensations/sec):                   │
│   - Redis Pub/Sub: ~$200/month                                 │
│   - RabbitMQ: ~$260/month (AWS MQ)                             │
│   - Kafka: ~$150/month (AWS MSK)                               │
│   - Total: ~$610/month                                          │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Sharding

### Sharding Strategy for POLLN Cells

```
┌─────────────────────────────────────────────────────────────┐
│              POLLN Database Sharding Strategy                │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  Sharding Dimension: Cell ID                                  │
│                                                                │
│  Why Cell ID?                                                 │
│  • Cells are the primary entity                               │
│  • Cell IDs are uniformly distributed                         │
│  • Queries are mostly cell-centric                            │
│  • Cross-cell queries are rare                                │
│                                                                │
│  Shard Key: SHA256(cellId)                                    │
│                                                                │
│  Distribution:                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │               Consistent Hash Ring                   │    │
│  │                                                       │    │
│  │        Shard 1 (0-25%)     Shard 2 (25-50%)          │    │
│  │     ┌─────────────────┐  ┌─────────────────┐        │    │
│  │     │ Cell A1-A250K   │  │ Cell A250-A500K │        │    │
│  │     │ Cell B1-B250K   │  │ Cell B250-B500K │        │    │
│  │     │ Cell C1-C250K   │  │ Cell C250-C500K │        │    │
│  │     └─────────────────┘  └─────────────────┘        │    │
│  │                                                       │    │
│  │        Shard 3 (50-75%)    Shard 4 (75-100%)          │    │
│  │     ┌─────────────────┐  ┌─────────────────┐        │    │
│  │     │ Cell A500-A750K │  │ Cell A750-A1M   │        │    │
│  │     │ Cell B500-B750K │  │ Cell B750-B1M   │        │    │
│  │     │ Cell C500-C750K │  │ Cell C750-C1M   │        │    │
│  │     └─────────────────┘  └─────────────────┘        │    │
│  │                                                       │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Consistent Hashing Algorithm

```typescript
import { createHash } from 'crypto';

/**
 * Consistent hashing for cell distribution
 */
class ConsistentHashRing {
  private shards: string[] = [];
  private ring: Map<number, string> = new Map();
  private virtualNodes: number = 150; // Virtual nodes per shard

  /**
   * Add a shard to the ring
   */
  addShard(shardId: string): void {
    this.shards.push(shardId);

    // Add virtual nodes for better distribution
    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualNodeKey = `${shardId}#${i}`;
      const hash = this.hash(virtualNodeKey);
      this.ring.set(hash, shardId);
    }
  }

  /**
   * Remove a shard from the ring
   */
  removeShard(shardId: string): void {
    this.shards = this.shards.filter(s => s !== shardId);

    for (let i = 0; i < this.virtualNodes; i++) {
      const virtualNodeKey = `${shardId}#${i}`;
      const hash = this.hash(virtualNodeKey);
      this.ring.delete(hash);
    }
  }

  /**
   * Get shard for a given cell
   */
  getShard(cellId: string): string {
    const hash = this.hash(cellId);

    // Find the first shard with hash >= cell hash
    const sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);

    for (const ringHash of sortedHashes) {
      if (ringHash >= hash) {
        return this.ring.get(ringHash)!;
      }
    }

    // Wrap around to first shard
    return this.ring.get(sortedHashes[0])!;
  }

  /**
   * SHA-256 hash (0 to 2^256 - 1, normalized to 0-1)
   */
  private hash(key: string): number {
    const hash = createHash('sha256').update(key).digest('hex');
    // Use first 8 characters for numeric hash
    return parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF;
  }
}
```

### Cross-Shard Queries

```
┌─────────────────────────────────────────────────────────────┐
│           Cross-Shard Query Strategies                      │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Scatter-Gather (Parallel Query)                           │
│                                                                │
│     Query: "Find all cells watching cell A2"                  │
│                                                                │
│     ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│     │ Shard 1 │  │ Shard 2 │  │ Shard 3 │  │ Shard 4 │      │
│     └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘      │
│          │            │            │            │             │
│          ├────────────┴────────────┴────────────┤             │
│          │                                         │             │
│          ▼                                         ▼             │
│     ┌──────────────────────────────────────────────────┐       │
│     │              Query Coordinator                  │       │
│     │                                                  │       │
│     │   SELECT * FROM watch_relationships            │       │
│     │   WHERE target_cell = 'A2'                     │       │
│     │                                                  │       │
│     │   Result: Merge all shard results              │       │
│     └──────────────────────────────────────────────────┘       │
│                                                                │
│     Performance:                                                │
│     • Latency: MAX(all shard latencies)                        │
│     • Throughput: SUM(all shard throughputs)                    │
│     • Best for: Low shard count (< 10)                         │
│                                                                │
│  2. Broadcast Join (Materialized View)                         │
│                                                                │
│     Create materialized view:                                   │
│     ┌─────────────────────────────────────────────────────┐    │
│     │   CREATE MATERIALIZED VIEW global_watches AS       │    │
│     │   SELECT * FROM watch_relationships               │    │
│     │   (Replicated to all shards)                      │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                │
│     • Updates propagated via CDC                               │
│     • Fast reads (local only)                                  │
│     • Slower writes (must update all shards)                   │
│     • Best for: Read-heavy workloads                           │
│                                                                │
│  3. Denormalization (Redundant Data)                           │
│                                                                │
│     Store watch relationships in both shards:                  │
│     ┌─────────────────────────────────────────────────────┐    │
│     │   Shard 1: Cell A1 data + watches                   │    │
│     │   Shard 2: Cell A2 data + watches                   │    │
│     │                                                      │    │
│     │   Query: Local only (no cross-shard)                │    │
│     │   Update: Multi-shard transaction                   │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                │
│     • Fastest reads                                            │
│     • Slower writes (2PC)                                       │
│     • Data redundancy                                          │
│     • Best for: Rare writes, frequent reads                    │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Rebalancing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│              Shard Rebalancing Strategy                      │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  Trigger Conditions:                                           │
│  • Shard size > 10GB (database size)                          │
│  • Shard load > 70% (CPU/memory)                              │
│  • Uneven distribution (> 20% variance)                       │
│  • Adding/removing capacity                                   │
│                                                                │
│  Rebalancing Process:                                          │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  1. Add New Shard                                       │   │
│  │     - Create new shard instance                         │   │
│  │     - Update consistent hash ring                       │   │
│  │     - Begin routing new cells to new shard              │   │
│  └────────────────────────────────────────────────────────┘   │
│                        │                                       │
│                        ▼                                       │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  2. Migrate Existing Cells (Gradual)                   │   │
│  │     - Identify cells to migrate (new hash targets)     │   │
│  │     - Set up dual-write (source + destination)         │   │
│  │     - Copy cell data to new shard                     │   │
│  │     - Verify data integrity                           │   │
│  │     - Switch reads to new shard                       │   │
│  │     - Remove data from old shard                      │   │
│  └────────────────────────────────────────────────────────┘   │
│                        │                                       │
│                        ▼                                       │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  3. Remove Old Shard (if scaling down)                │   │
│  │     - Verify all data migrated                        │   │
│  │     - Decommission old shard                          │   │
│  │     - Update consistent hash ring                     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Migration Timeline (per 100K cells):                          │
│  • Dual-write setup: 1 minute                                  │
│  • Data copy: 10 minutes (100K cells × 1KB)                    │
│  • Verification: 5 minutes                                     │
│  • Read switch: 1 minute                                       │
│  • Cleanup: 5 minutes                                          │
│  • Total: ~22 minutes per 100K cells                          │
│                                                                │
│  Online Rebalancing (No Downtime):                             │
│  • Dual-write during migration (writes go to both)            │
│  • Read from source until verification complete               │
│  • Gradual cutover (10% at a time)                            │
│  • Automatic rollback on failure                              │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema (Sharded)

```sql
-- Shard 1: Cells 0-250K
-- Shard 2: Cells 250-500K
-- etc.

-- Cell metadata (sharded by cell_id)
CREATE TABLE cells (
  cell_id VARCHAR(64) PRIMARY KEY,
  cell_type VARCHAR(32) NOT NULL,
  position_row INT NOT NULL,
  position_col INT NOT NULL,
  logic_level INT NOT NULL,
  state VARCHAR(32) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  INDEX idx_position (position_row, position_col)
) PARTITION BY HASH(cell_id) PARTITIONS 4;

-- Cell values (time-series, sharded by cell_id)
CREATE TABLE cell_values (
  cell_id VARCHAR(64) NOT NULL,
  timestamp BIGINT NOT NULL,
  value JSONB NOT NULL,
  confidence FLOAT,
  PRIMARY KEY (cell_id, timestamp),
  INDEX idx_timestamp (timestamp)
) PARTITION BY RANGE (timestamp);

-- Watch relationships (sharded by watcher_id)
CREATE TABLE watch_relationships (
  watcher_id VARCHAR(64) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  sensation_types JSONB NOT NULL,
  threshold FLOAT DEFAULT 0,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (watcher_id, target_id),
  INDEX idx_target (target_id)
) PARTITION BY HASH(watcher_id) PARTITIONS 4;

-- Reasoning traces (archival, sharded by cell_id)
CREATE TABLE reasoning_traces (
  trace_id VARCHAR(64) PRIMARY KEY,
  cell_id VARCHAR(64) NOT NULL,
  timestamp BIGINT NOT NULL,
  steps JSONB NOT NULL,
  dependencies JSONB,
  total_time INT,
  INDEX idx_cell (cell_id),
  INDEX idx_timestamp (timestamp)
) PARTITION BY RANGE (timestamp);
```

---

## Caching Layers

### Multi-Level Caching Architecture

```
┌─────────────────────────────────────────────────────────────┐
│          POLLN Multi-Level Caching Architecture              │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  Level 1: Browser Cache (Client-Side)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • Static assets (JS, CSS, fonts)                    │   │
│  │  • Cache-Control: max-age=86400 (24 hours)           │   │
│  │  • Service Worker (offline support)                  │   │
│  │  • LocalStorage (user preferences)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                        │                                       │
│                        ▼                                       │
│  Level 2: CDN Cache (Edge)                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • CloudFront / Cloudflare                           │   │
│  │  • Geographic distribution (200+ PoPs)               │   │
│  │  • UI bundles, templates, static data                │   │
│  │  • Cache-Control: max-age=3600 (1 hour)              │   │
│  └──────────────────────────────────────────────────────┘   │
│                        │                                       │
│                        ▼                                       │
│  Level 3: Edge Computing (Cloudflare Workers)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • Cell value preprocessing                          │   │
│  │  • Sensation computation (lightweight)               │   │
│  │  • Response formatting                              │   │
│  │  • Latency: < 50ms globally                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                        │                                       │
│                        ▼                                       │
│  Level 4: Distributed Cache (Redis Cluster)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • Hot cell data (frequently accessed)               │   │
│  │  • Session state (WebSocket connections)             │   │
│  │  • Sensation computation cache                        │   │
│  │  • TTL: 5 minutes (LRU eviction)                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                        │                                       │
│                        ▼                                       │
│  Level 5: Local Cache (In-Memory, per instance)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • Cell instance cache (loaded cells)                │   │
│  │  • L1: Recent cell values (1000 cells, 1 min TTL)    │   │
│  │  • L2: Working set (10K cells, 5 min TTL)            │   │
│  │  • Direct memory access (fastest)                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                        │                                       │
│                        ▼                                       │
│  Level 6: Database (PostgreSQL - Sharded)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  • Persistent cell storage                           │   │
│  │  • Historical values                                 │   │
│  │  • Reasoning traces                                  │   │
│  │  • Watch relationships                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                                │
└─────────────────────────────────────────────────────────────┘

Cache Hierarchy Benefits:
• 99%+ hit rate for hot data
• < 10ms latency for cached data
• Reduced database load (90% fewer queries)
• Cost-effective (memory cheaper than database)
• Automatic failover (fall back to next level)
```

### CDN Configuration

```
┌─────────────────────────────────────────────────────────────┐
│              CDN Configuration (CloudFront)                  │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  Cacheable Content:                                            │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ Content Type              TTL         Cache Key     │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │ UI bundles (JS/CSS)       24 hours    Version hash  │     │
│  │ Fonts                     30 days     Content hash  │     │
│  │ Images                    7 days      Content hash  │     │
│  │ Templates                 1 hour      Version      │     │
│  │ Static cell data         5 minutes   Cell ID      │     │
│  │ API responses            None        -             │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                                │
│  Cache Invalidation Strategies:                                 │
│                                                                │
│  1. Time-Based Invalidation (Auto)                              │
│     • TTL expires → refetch from origin                        │
│     • Stale-while-revalidate (serve stale, update async)       │
│     • Best for: Static content                                  │
│                                                                │
│  2. Version-Based Invalidation (Manual)                         │
│     • /assets/v1.2.3/bundle.js                                 │
│     • Deploy new version → new URL                             │
│     • Old version expires from cache naturally                 │
│     • Best for: UI bundles, templates                          │
│                                                                │
│  3. Event-Based Invalidation (Push)                            │
│     • CloudFront Invalidation API                              │
│     • Invalidate specific paths on update                      │
│     • Cost: $0.005 per invalidation                            │
│     • Best for: Breaking changes, critical updates             │
│                                                                │
│  Example:                                                      │
│  // Invalidate cell data cache                                 │
│  await cloudfront.createInvalidation({                         │
│    DistributionId: process.env.CLOUDFRONT_ID,                 │
│    InvalidationBatch: {                                        │
│      CallerReference: Date.now().toString(),                  │
│      Paths: {                                                  │
│        Quantity: 1,                                            │
│        Items: ['/api/cells/A1']                               │
│      }                                                         │
│    }                                                           │
│  }).promise();                                                 │
│                                                                │
│  Cost Estimate:                                                │
│  • Data transfer out: $0.085/GB (US-Europe)                    │
│  • Requests: $0.0075/10K requests                              │
│  • Invalidations: $0.005 per invalidation                      │
│  • For 1M users, 10GB transfer: ~$850/month                    │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Distributed Cache (Redis Cluster)

```
┌─────────────────────────────────────────────────────────────┐
│           Redis Cluster Configuration                        │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  Architecture:                                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              Redis Cluster (3 Master + 3 Replica)    │    │
│  │                                                       │    │
│  │   Master 1       Master 2       Master 3             │    │
│  │   (Slots 0-5460) (Slots 5461-10922) (Slots 10923-16383)│
│  │        │                │                  │            │    │
│  │        ▼                ▼                  ▼            │    │
│  │   Replica 1       Replica 2       Replica 3            │    │
│  │                                                       │    │
│  │   • Automatic failover                               │    │
│  │   • Data partitioning (hash slots)                   │    │
│  │   • Horizontal scaling                               │    │
│  │   • High availability                                │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Data Distribution:                                            │
│  ┌─────────────────────────────────────────────────────┐      │
│  │ Key Pattern              Shard    Example          │      │
│  ├─────────────────────────────────────────────────────┤      │
│  │ cell:{cellId}:data      Hash     cell:A1:data     │      │
│  │ cell:{cellId}:value     Hash     cell:A2:value    │      │
│  │ sensation:{cellId}      Hash     sensation:A1      │      │
│  │ session:{sessionId}     Hash     session:abc123   │      │
│  │ cache:computation:{id}  Hash     cache:comp:xyz   │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                │
│  Cache Eviction Policy:                                         │
│  • allkeys-lru: Evict least recently used keys                 │
│  • volatile-ttl: Evict keys with expired TTL                   │
│  • Max memory: 16GB per node (32GB total)                       │
│  • Max memory policy: allkeys-lru                              │
│                                                                │
│  Performance:                                                   │
│  • Throughput: 100K ops/sec (read)                             │
│  • Latency: < 1ms (local), < 10ms (cross-shard)                │
│  • Memory: 1KB per cell (100K cells = 100MB)                   │
│                                                                │
│  Cost:                                                         │
│  • ElastiCache: $0.25/GB/month = $96/month (32GB * 3 regions)  │
│  • Or self-hosted on EC2: Included with instance cost         │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Cache Invalidation Strategies

```
┌─────────────────────────────────────────────────────────────┐
│         Cache Invalidation Strategies                        │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Time-To-Live (TTL) Expiration                            │
│                                                                │
│     cell_data = {                                             │
│       cellId: 'A1',                                           │
│       value: 42,                                              │
│       timestamp: 1623456789                                   │
│     }                                                          │
│     await redis.setex('cell:A1:data', 300, JSON.stringify(cell_data))│
│     // Auto-expires after 5 minutes                           │
│                                                                │
│     Pros:                                                     │
│     • Simple, no manual invalidation                           │
│     • Eventual consistency guaranteed                          │
│     • Low overhead                                            │
│                                                                │
│     Cons:                                                     │
│     • Stale data until expiration                             │
│     • Cache stampede if many expire at once                    │
│     • Not suitable for critical data                           │
│                                                                │
│  2. Write-Through Invalidation                                │
│                                                                │
│     async function updateCell(cellId: string, value: any) {    │
│       // 1. Update database                                   │
│       await db.cells.update(cellId, { value });               │
│                                                                │
│       // 2. Invalidate cache immediately                      │
│       await redis.del(`cell:${cellId}:data`);                 │
│                                                                │
│       // 3. Next read will repopulate cache                  │
│     }                                                          │
│                                                                │
│     Pros:                                                     │
│     • No stale data                                           │
│     • Immediate consistency                                   │
│     • Simple implementation                                   │
│                                                                │
│     Cons:                                                     │
│     • Higher write latency                                    │
│     • Cache miss on next read                                 │
│     • Write amplification                                     │
│                                                                │
│  3. Write-Behind Invalidation (Async)                         │
│                                                                │
│     async function updateCell(cellId: string, value: any) {    │
│       // 1. Update cache immediately                          │
│       await redis.set(`cell:${cellId}:data`, JSON.stringify(value));│
│                                                                │
│       // 2. Queue database write (async)                      │
│       await messageQueue.publish('cell-updates', {            │
│         cellId,                                               │
│         value,                                                │
│         timestamp: Date.now()                                 │
│       });                                                      │
│                                                                │
│       // 3. Background worker writes to DB                   │
│     }                                                          │
│                                                                │
│     Pros:                                                     │
│     • Fast writes (cache only)                                │
│     • Better user experience                                  │
│     • Batching of DB writes                                   │
│                                                                │
│     Cons:                                                     │
│     • Data loss if cache fails before DB                      │
│     • Complex recovery logic                                  │
│     • Eventual consistency                                    │
│                                                                │
│  4. Cache-Aside (Lazy Loading)                                │
│                                                                │
│     async function getCell(cellId: string) {                  │
│       // 1. Try cache first                                   │
│       const cached = await redis.get(`cell:${cellId}:data`);  │
│       if (cached) return JSON.parse(cached);                  │
│                                                                │
│       // 2. Cache miss - load from database                   │
│       const cell = await db.cells.findOne(cellId);            │
│                                                                │
│       // 3. Populate cache                                    │
│       await redis.setex(`cell:${cellId}:data`, 300, JSON.stringify(cell));│
│                                                                │
│       return cell;                                            │
│     }                                                          │
│                                                                │
│     Pros:                                                     │
│     • Only cache what's used                                  │
│     • Simple implementation                                   │
│     • Automatic cache warming                                  │
│                                                                │
│     Cons:                                                     │
│     • Cache stampede on first miss                            │
│     • Stale data if DB updated directly                       │
│     • Higher latency on cache miss                            │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Comparison

### Message Queue Comparison Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Message Queue Technology Comparison                      │
├────────────────┬────────────┬────────────┬────────────┬──────────────────┤
│ Feature        │ Redis      │ RabbitMQ   │ Kafka      │ AWS SQS/SNS     │
│                │ Pub/Sub    │            │            │                  │
├────────────────┼────────────┼────────────┼────────────┼──────────────────┤
│ Latency        │ < 1ms      │ 5-10ms     │ 10-50ms    │ 20-50ms          │
│ Throughput     │ 10M+/sec   │ 1M+/sec    │ 100M+/sec  │ Unlimited        │
│ Persistence    │ No         │ Yes        │ Yes        │ Yes              │
│ Ordering       │ Per channel│ Per queue  │ Per        │ Per queue (FIFO) │
│                │            │            │ partition  │                  │
│ Replay         │ No         │ No         │ Yes        │ No               │
│ Exactly-Once   │ No         │ No         │ Yes        │ No               │
│ Fanout         │ Native     │ Exchange   │ Consumer   │ SNS             │
│                │            │            │ groups     │                  │
│ DLQ            │ No         │ Yes        │ Yes        │ Yes              │
│ Complexity     │ Low        │ Medium     │ High       │ Low              │
│ Ops Overhead   │ Low        │ Medium     │ High       │ None (managed)   │
│ Cost (1M msg)  │ ~$20/mo    │ ~$260/mo   │ ~$150/mo   │ ~$400/mo         │
├────────────────┼────────────┼────────────┼────────────┼──────────────────┤
│ Best For       │ Sensations │ Critical   │ Audit      │ Serverless       │
│                │ Real-time  │ events    │ trail      │ Cloud-native     │
└────────────────┴────────────┴────────────┴────────────┴──────────────────┘
```

### Database Comparison Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Database Technology Comparison                           │
├────────────────┬────────────┬────────────┬────────────┬──────────────────┤
│ Feature        │ PostgreSQL │ MySQL      │ MongoDB    │ DynamoDB         │
├────────────────┼────────────┼────────────┼────────────┼──────────────────┤
│ Data Model     │ Relational │ Relational │ Document   │ Document         │
│ Sharding       │ Manual     │ Manual     │ Native     │ Native           │
│ Replication    │ Async      │ Async      │ Async      │ Multi-master     │
│ Consistency    │ Strong     │ Strong     │ Eventual   │ Eventual         │
│ Query Language │ SQL        │ SQL        │ MQL        │ PartiQL          │
│ Transactions   │ Yes (ACID)│ Yes (ACID)│ Yes (ACID)│ Yes (eventual)  │
│ Indexing       │ B-Tree, GIN│ B-Tree    │ B-Tree     │ GSI, LSI         │
│ JSON Support   │ JSONB      │ JSON       │ Native     │ Native           │
│ Complex Queries│ Excellent  │ Excellent  │ Good       │ Limited          │
│ Ops Overhead   │ Medium     │ Medium     │ Low        │ None (managed)   │
│ Cost (1TB)     │ ~$100/mo   │ ~$100/mo   │ ~$200/mo   │ ~$700/mo         │
├────────────────┼────────────┼────────────┼────────────┼──────────────────┤
│ Best For       │ POLLN      │ Alternative │ Flexible   │ Serverless       │
│                │ recommended│            │ schemas    │ Cloud-only       │
└────────────────┴────────────┴────────────┴────────────┴──────────────────┘
```

### Cache Comparison Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Cache Technology Comparison                             │
├────────────────┬────────────┬────────────┬────────────┬──────────────────┤
│ Feature        │ Redis      │ Memcached  │ CDN        │ Edge Computing   │
├────────────────┼────────────┼────────────┼────────────┼──────────────────┤
│ Latency        │ < 1ms      │ < 1ms      │ < 50ms     │ < 50ms           │
│ Throughput     │ 100K+/sec  │ 100K+/sec  │ Unlimited  │ Unlimited        │
│ Persistence    │ Yes        │ No         │ No         │ No               │
│ Data Types     │ Rich       │ String     │ Static     │ Computed         │
│ Eviction       │ LRU, TTL   │ LRU        │ TTL        │ TTL              │
│ Replication    │ Yes        │ No         │ Yes        │ Yes              │
│ Sharding       │ Yes        │ Yes        │ Yes        │ Yes              │
│ Ops Overhead   │ Low        │ Low        │ None       │ None             │
│ Cost (100GB)   │ ~$25/mo    │ ~$20/mo    │ ~$85/mo    │ ~$50/mo          │
├────────────────┼────────────┼────────────┼────────────┼──────────────────┤
│ Best For       │ POLLN      │ Simple     │ Static     │ Computation      │
│                │ recommended │ caching    │ assets    │ offload          │
└────────────────┴────────────┴────────────┴────────────┴──────────────────┘
```

---

## Deployment Strategies

### Strategy 1: Single Region (Minimum Viable)

```
┌─────────────────────────────────────────────────────────────┐
│          Single Region Deployment (MVP)                     │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│   Target Scale: 100K - 500K cells                             │
│   Target Users: 1K - 10K concurrent                            │
│   Monthly Cost: ~$500 - $1,000                                │
│                                                                │
│   Architecture:                                                │
│   ┌──────────────────────────────────────────────────────┐   │
│   │         us-east-1 (N. Virginia)                      │   │
│   │                                                         │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│   │   │ API Server  │  │ API Server  │  │ API Server  │  │   │
│   │   │ (c5.xlarge) │  │ (c5.xlarge) │  │ (c5.xlarge) │  │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘  │   │
│   │         │                 │                 │         │   │
│   │         └─────────────────┴─────────────────┘         │   │
│   │                           │                           │   │
│   │                           ▼                           │   │
│   │   ┌──────────────────────────────────────────────┐   │   │
│   │   │      Cell Shards (3 instances)               │   │   │
│   │   │      • Shard 1: Cells 0-166K                │   │   │
│   │   │      • Shard 2: Cells 166-333K              │   │   │
│   │   │      • Shard 3: Cells 333-500K              │   │   │
│   │   └──────────────────────────────────────────────┘   │   │
│   │                           │                           │   │
│   │                           ▼                           │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│   │   │ Redis       │  │ PostgreSQL  │  │ S3          │  │   │
│   │   │ (cache)     │  │ (metadata)  │  │ (storage)   │  │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘  │   │
│   │                                                         │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                                │
│   Cost Breakdown:                                              │
│   ┌─────────────────────────────────────────────────────┐     │
│   │ Component            Count    Type       Monthly    │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ API Servers          3        c5.xlarge  $510       │     │
│   │ Cell Shards          3        c5.2xlarge $1,020     │     │
│   │ Redis Cluster       1        r6g.large  $140       │     │
│   │ PostgreSQL          1        db.t3.medium $100      │     │
│   │ S3 Storage          -        Standard   $25        │     │
│   │ Data Transfer       1TB      -          $85        │     │
│   │ Load Balancer       1        ALB        $20        │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Total                                          $1,900 │     │
│   └─────────────────────────────────────────────────────┘     │
│                                                                │
│   Pros:                                                         │
│   ✓ Simple architecture                                         │
│   ✓ Low operational overhead                                    │
│   ✓ Fast development                                             │
│   ✓ Easy monitoring                                              │
│                                                                │
│   Cons:                                                         │
│   ✗ No geographic redundancy                                    │
│   ✗ Higher latency for global users                             │
│   ✗ Single point of failure (region)                           │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Strategy 2: Multi-Region (Production)

```
┌─────────────────────────────────────────────────────────────┐
│          Multi-Region Deployment (Production)               │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│   Target Scale: 1M - 10M cells                                 │
│   Target Users: 10K - 100K concurrent                           │
│   Monthly Cost: ~$5,000 - $50,000                              │
│                                                                │
│   Architecture:                                                │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │                                                          │ │
│   │   ┌─────────────────┐  ┌─────────────────┐              │ │
│   │   │   us-east-1     │  │   eu-west-1     │              │ │
│   │   │   (Primary)     │  │   (Secondary)   │              │ │
│   │   │                 │  │                 │              │ │
│   │   │   4x API        │  │   4x API        │              │ │
│   │   │   12x Shards    │  │   12x Shards    │              │ │
│   │   │   Redis Cluster │  │   Redis Cluster │              │ │
│   │   │   PostgreSQL    │  │   PostgreSQL    │              │
│   │   └─────────────────┘  └─────────────────┘              │ │
│   │            │                    │                        │ │
│   │            └────────┬───────────┘                        │ │
│   │                     ▼                                    │ │
│   │          ┌─────────────────────┐                        │ │
│   │          │  Cross-Region Link  │                        │ │
│   │          │  (Async Replication)│                       │ │
│   │          └─────────────────────┘                        │ │
│   │                                                          │ │
│   └──────────────────────────────────────────────────────────┘ │
│                                                                │
│   Cell Distribution Strategy:                                   │
│   • Cells 0-5M → us-east-1                                     │
│   • Cells 5M-10M → eu-west-1                                   │
│   • Cross-region sensations via message queue                  │
│   • Metadata replicated asynchronously                         │
│                                                                │
│   Cost Breakdown (10M cells):                                  │
│   ┌─────────────────────────────────────────────────────┐     │
│   │ Component            Count    Type       Monthly    │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ API Servers (US)     4        c5.9xlarge $6,120     │     │
│   │ API Servers (EU)     4        c5.9xlarge $6,360     │     │
│   │ Cell Shards (US)     12       c5.9xlarge $18,360    │     │
│   │ Cell Shards (EU)     12       c5.9xlarge $19,080    │     │
│   │ Redis Cluster (US)   1        r6g.8xlarge $1,200    │     │
│   │ Redis Cluster (EU)   1        r6g.8xlarge $1,248    │     │
│   │ PostgreSQL (US)      1        db.r6g.2xlarge $1,000 │     │
│   │ PostgreSQL (EU)      1        db.r6g.2xlarge $1,040 │     │
│   │ Data Transfer        10TB     -          $850       │     │
│   │ Load Balancer (2x)   2        ALB        $40        │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Total                                         $55,298 │     │
│   └─────────────────────────────────────────────────────┘     │
│                                                                │
│   Pros:                                                         │
│   ✓ Geographic redundancy                                       │
│   ✓ Low latency globally                                        │
│   ✓ Disaster recovery                                           │
│   ✓ Data sovereignty                                            │
│                                                                │
│   Cons:                                                         │
│   ✗ High operational overhead                                   │
│   ✗ Complex cross-region coordination                           │
│   ✗ Higher cost                                                 │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Strategy 3: Serverless (Cloud-Native)

```
┌─────────────────────────────────────────────────────────────┐
│          Serverless Deployment (Cloud-Native)                │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│   Target Scale: 100K - 1M cells (elastic)                     │
│   Target Users: 1K - 10K concurrent (spiky)                   │
│   Monthly Cost: ~$500 - $2,000 (usage-based)                 │
│                                                                │
│   Architecture:                                                │
│   ┌──────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │   ┌────────────────────────────────────────────┐     │   │
│   │   │   AWS Lambda (API Handlers)               │     │   │
│   │   │   • getCell                               │     │   │
│   │   │   • updateCell                            │     │   │
│   │   │   • listCells                             │     │   │
│   │   │   • computeSensation                      │     │   │
│   │   └──────────────┬─────────────────────────────┘     │   │
│   │                  │                                    │   │
│   │                  ▼                                    │   │
│   │   ┌────────────────────────────────────────────┐     │   │
│   │   │   API Gateway (REST/WebSocket)            │     │   │
│   │   └──────────────┬─────────────────────────────┘     │   │
│   │                  │                                    │   │
│   │                  ▼                                    │   │
│   │   ┌────────────────────────────────────────────┐     │   │
│   │   │   DynamoDB (Cell Data)                    │     │   │
│   │   │   • Partition key: cellId                 │     │   │
│   │   │   • Auto-scaling                           │     │   │
│   │   └──────────────┬─────────────────────────────┘     │   │
│   │                  │                                    │   │
│   │                  ▼                                    │   │
│   │   ┌────────────────────────────────────────────┐     │   │
│   │   │   ElastiCache (Redis)                      │     │   │
│   │   │   • Session state                          │     │   │
│   │   │   • Hot data                               │     │   │
│   │   └────────────────────────────────────────────┘     │   │
│   │                                                      │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                                │
│   Cost Breakdown (1M cells, 1M requests/day):                 │
│   ┌─────────────────────────────────────────────────────┐     │
│   │ Component                  Usage        Monthly     │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Lambda (128MB, 100ms)      30M requests  $620       │     │
│   │ API Gateway                 30M requests  $250       │     │
│   │ DynamoDB (On-Demand)        100GB R/W    $650       │     │
│   │ ElastiCache                 16GB          $200       │     │
│   │ S3 (UI assets)              10GB          $0.23      │     │
│   │ CloudFront                  1TB transfer  $85       │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Total                                              $1,805 │     │
│   └─────────────────────────────────────────────────────┘     │
│                                                                │
│   Pros:                                                         │
│   ✓ Zero infrastructure management                               │
│   ✓ Auto-scaling (pay-per-use)                                 │
│   ✓ High availability built-in                                  │
│   ✓ Low cost for variable workloads                            │
│                                                                │
│   Cons:                                                         │
│   ✗ Cold start latency (100-500ms)                              │
│  ✗ WebSocket complexity (API Gateway limitations)             │
│  ✗ Vendor lock-in                                              │
│  ✗ Harder to optimize for cost at scale                       │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Trade-off Analysis

### CAP Theorem Implications

```
┌─────────────────────────────────────────────────────────────┐
│              CAP Theorem for POLLN                          │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│   Consistency vs Availability vs Partition Tolerance           │
│                                                                │
│   ┌─────────────────────────────────────────────────────┐     │
│   │              CAP Triangle                            │     │
│   │                                                       │     │
│   │                    Consistency                        │     │
│   │                       /│\                            │     │
│   │                      / │ \                           │     │
│   │                     /  │  \                          │     │
│   │                    /   │   \                         │     │
│   │                   /    │    \                        │     │
│   │      Availability ──────●───── Partition Tolerance    │     │
│   │                                                       │     │
│   └───────────────────────────────────────────────────────┘     │
│                                                                │
│   POLLN Trade-offs:                                            │
│                                                                │
│   ┌─────────────────────────────────────────────────────┐     │
│   │ System Component      Choice     Rationale           │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Cell state updates    AP         • Availability:     │     │
│   │ (sensations)                     High throughput     │     │
│   │                                  • Partition:        │     │
│   │                                  Continue serving    │     │
│   │                                  • Consistency:      │     │
│   │                                  Eventual (recompute)│     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Cell metadata        CP         • Consistency:       │     │
│   │ (position, type)                Critical for         │     │
│   │                                  integrity           │     │
│   │                                  • Partition:        │     │
│   │                                  Fail fast           │     │
│   │                                  • Availability:     │     │
│   │                                  Degrade gracefully  │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Reasoning traces      CA         • Consistency:       │     │
│   │ (audit trail)                    Audit requirements  │     │
│   │                                  • Availability:     │     │
│   │                                  Must be durable     │     │
│   │                                  • Partition:        │     │
│   │                                  Queue writes        │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Session state         AP         • Availability:     │     │
│   │ (WebSocket)                     Real-time required   │     │
│   │                                  • Partition:        │     │
│   │                                  Local region only   │     │
│   │                                  • Consistency:      │     │
│   │                                  Reconnect syncs    │     │
│   └───────────────────────────────────────────────────────┘     │
│                                                                │
│   Summary:                                                      │
│   • POLLN prioritizes Availability for real-time features       │
│   • Consistency for critical metadata                           │
│   • Partition tolerance via graceful degradation                │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Latency vs Throughput Trade-off

```
┌─────────────────────────────────────────────────────────────┐
│          Latency vs Throughput Optimization                 │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│   Optimization Spectrum:                                       │
│                                                                │
│   Low Latency ───────────────────────────────► High Throughput│
│                                                                │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│   │ Edge Compute │  │ Regional     │  │ Batched      │      │
│   │              │  │ Processing   │  │ Processing   │      │
│   │              │  │              │  │              │      │
│   │ Latency:     │  │ Latency:     │  │ Latency:     │      │
│   │ < 50ms       │  │ < 200ms      │  │ < 5s         │      │
│   │              │  │              │  │              │      │
│   │ Throughput:  │  │ Throughput:  │  │ Throughput:  │      │
│   │ Low          │  │ Medium       │  │ Very High    │      │
│   └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                                │
│   Use Cases:                                                    │
│   • Edge Compute: Interactive cell updates                     │
│   • Regional: Sensation propagation, coordination              │
│   • Batched: Analytics, aggregation, reports                   │
│                                                                │
│   POLLN Strategy:                                              │
│   • Hybrid approach (all three)                                │
│   • Route by request type                                      │
│   • Optimize per workload                                      │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Cost vs Performance Trade-off

```
┌─────────────────────────────────────────────────────────────┐
│          Cost vs Performance Optimization                    │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│   Performance Tiers:                                           │
│                                                                │
│   ┌─────────────────────────────────────────────────────┐     │
│   │ Tier    Latency    Monthly Cost (10M cells)         │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Basic   200-500ms  $1,000 (self-hosted, 1 region)  │     │
│   │ Standard 50-100ms   $5,000 (multi-region)           │     │
│   │ Premium < 50ms     $20,000 (global, edge compute)  │     │
│   │ Enterprise < 20ms    $50,000 (dedicated infra)      │     │
│   └─────────────────────────────────────────────────────┘     │
│                                                                │
│   Cost Optimization Strategies:                                 │
│                                                                │
│   1. Right-Size Instances                                      │
│      • Monitor CPU/memory utilization                          │
│      • Scale down during off-peak                              │
│      • Use spot instances for batch workloads                  │
│      • Savings: 30-50%                                         │
│                                                                │
│   2. Reserved Instances                                         │
│      • Commit to 1-3 year terms                               │
│      • Savings: 40-60% vs on-demand                           │
│      • Best for: Baseline load                                │
│                                                                │
│   3. Serverless Components                                     │
│      • Use Lambda for spiky workloads                         │
│      • Pay only when used                                     │
│      • Savings: 50-70% for low-traffic services               │
│                                                                │
│   4. Data Transfer Optimization                                │
│      • Compress WebSocket messages                            │
│      • Use CDN for static assets                              │
│      • Batch updates where possible                           │
│      • Savings: 20-30%                                        │
│                                                                │
│   5. Caching Aggressively                                      │
│      • Multi-level cache (CDN → Redis → Local)                │
│      • Longer TTLs for non-critical data                      │
│      • Cache computations, not just data                      │
│      • Savings: 40-60% reduction in database load             │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Implement sharding and message queue infrastructure

**Deliverables:**
- Consistent hash ring implementation
- Redis Pub/Sub for sensations
- Database sharding (2 shards)
- Basic load balancing

**Success Criteria:**
- 100K cells distributed across 2 shards
- 1M sensations/second throughput
- < 10ms sensation latency
- 99.9% uptime

### Phase 2: High Availability (Weeks 5-8)

**Goal:** Add redundancy and failover

**Deliverables:**
- Redis Cluster (3 master + 3 replica)
- PostgreSQL replication (1 master + 2 replica)
- Automatic failover
- Health checks and monitoring

**Success Criteria:**
- Zero data loss on failure
- < 30s failover time
- 99.95% uptime
- Graceful degradation

### Phase 3: Multi-Region (Weeks 9-12)

**Goal:** Geographic distribution

**Deliverables:**
- Second region deployment (eu-west-1)
- Cross-region replication
- Geographic routing
- Data sovereignty compliance

**Success Criteria:**
- < 100ms latency for 90% of users
- < 5s RPO (Recovery Point Objective)
- < 1min RTO (Recovery Time Objective)
- 99.99% uptime

### Phase 4: Optimization (Weeks 13-16)

**Goal:** Performance and cost optimization

**Deliverables:**
- Multi-level caching (CDN + Redis + Local)
- Query optimization
- Compression and batching
- Cost monitoring and alerts

**Success Criteria:**
- < 50ms latency for 95% of requests
- 30% reduction in database load
- 20% reduction in monthly costs
- 100M sensations/second throughput

---

## Cost Analysis

### Total Cost of Ownership (1 Year)

```
┌─────────────────────────────────────────────────────────────┐
│         Total Cost of Ownership (1 Year)                     │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│   Scenario 1: 100K Cells, 1K Users                             │
│   ┌─────────────────────────────────────────────────────┐     │
│   │ Component                  Monthly      Annual       │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Compute (API + Shards)      $850          $10,200    │     │
│   │ Database (PostgreSQL)       $120          $1,440     │     │
│   │ Cache (Redis)               $200          $2,400     │     │
│   │ Load Balancer               $20           $240       │     │
│   │ Monitoring                  $50           $600       │     │
│   │ Storage (S3)                $25           $300       │     │
│   │ Data Transfer               $85           $1,020     │     │
│   │ Support & Ops               $200          $2,400     │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Total                       $1,550        $18,600    │     │
│   └───────────────────────────────────────────────────────┘     │
│                                                                │
│   Scenario 2: 1M Cells, 10K Users                              │
│   ┌─────────────────────────────────────────────────────┐     │
│   │ Component                  Monthly      Annual       │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Compute (API + Shards)      $6,500        $78,000    │     │
│   │ Database (PostgreSQL)       $800          $9,600     │     │
│   │ Cache (Redis)               $600          $7,200     │     │
│   │ Load Balancer               $80           $960       │     │
│   │ Monitoring                  $200          $2,400     │     │
│   │ Storage (S3)                $100          $1,200     │     │
│   │ Data Transfer               $400          $4,800     │     │
│   │ Support & Ops               $1,000        $12,000    │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Total                       $9,680        $116,160   │     │
│   └───────────────────────────────────────────────────────┘     │
│                                                                │
│   Scenario 3: 10M Cells, 100K Users                             │
│   ┌─────────────────────────────────────────────────────┐     │
│   │ Component                  Monthly      Annual       │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Compute (API + Shards)      $50,000       $600,000   │     │
│   │ Database (PostgreSQL)       $4,000        $48,000    │     │
│   │ Cache (Redis)               $3,000        $36,000    │     │
│   │ Load Balancer               $200          $2,400     │     │
│   │ Monitoring                  $500          $6,000     │     │
│   │ Storage (S3)                $500          $6,000     │     │
│   │ Data Transfer               $5,000        $60,000    │     │
│   │ Support & Ops               $5,000        $60,000    │     │
│   ├─────────────────────────────────────────────────────┤     │
│   │ Total                       $68,200       $818,400  │     │
│   └───────────────────────────────────────────────────────┘     │
│                                                                │
│   Cost Per Cell (Annual):                                      │
│   • 100K cells: $0.19/cell/year                               │
│   • 1M cells: $0.12/cell/year                                  │
│   • 10M cells: $0.08/cell/year                                 │
│                                                                │
│   Economies of Scale:                                           │
│   • 10x increase in cells = 4.4x increase in cost              │
│   • Significant efficiency gains at scale                      │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Conclusion

### Summary of Findings

1. **Horizontal Scaling**
   - Stateless API servers + stateful cell shards
   - Consistent hashing for cell distribution
   - Session affinity for WebSocket connections
   - Recommended: Multi-instance deployment with ALB

2. **Message Queues**
   - Hybrid approach: Redis Pub/Sub + RabbitMQ
   - Redis for real-time sensations (< 1ms latency)
   - RabbitMQ for critical events (persistence)
   - Kafka for audit trail (replayability)

3. **Database Sharding**
   - Shard by cell ID using consistent hashing
   - Scatter-gather for cross-shard queries
   - Online rebalancing (no downtime)
   - Recommended: PostgreSQL with 4-6 shards per region

4. **Caching Layers**
   - Multi-level: CDN → Edge → Redis → Local
   - 99%+ hit rate for hot data
   - Cache-aside pattern for flexibility
   - Recommended: CloudFront + Redis Cluster + L1/L2 local cache

### Next Steps

1. **Proof of Concept** (4 weeks)
   - Implement consistent hashing
   - Set up Redis Pub/Sub
   - Test with 100K cells
   - Measure latency and throughput

2. **Production Deployment** (8 weeks)
   - Deploy multi-instance architecture
   - Implement database sharding
   - Set up monitoring and alerts
   - Test failover scenarios

3. **Optimization** (4 weeks)
   - Implement multi-level caching
   - Optimize queries
   - Cost optimization
   - Performance tuning

### Final Recommendations

- **Start with:** Single region, 2-3 shards, Redis Pub/Sub
- **Scale to:** Multi-region, 6+ shards, hybrid message queues
- **Budget:** $500/month (100K cells) to $50K/month (10M cells)
- **Team:** 2-3 DevOps engineers for operations
- **Timeline:** 16 weeks to full distributed architecture

---

**Document Version:** 1.0
**Last Updated:** 2026-03-09
**Status:** ✅ Research Complete
**Next Phase:** Implementation Planning

---

*Architecture is the art of balancing trade-offs. There is no perfect solution, only optimal solutions for specific constraints.*
