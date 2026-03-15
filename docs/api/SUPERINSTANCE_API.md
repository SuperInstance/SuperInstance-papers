# SuperInstance API Documentation

**Version:** 1.0.0
**Last Updated:** 2026-03-14
**Base URL:** `https://api.superinstance.ai`

---

## Overview

SuperInstance provides comprehensive APIs for distributed consensus, routing, coordination, and hardware integration. Complete documentation for all interfaces.

### API Interfaces

- **REST API:** Standard HTTP endpoints for CRUD operations
- **WebSocket API:** Real-time streaming and bidirectional communication
- **Python SDK:** Native Python library with async support
- **JavaScript/TypeScript SDK:** Browser and Node.js clients
- **Rust FFI:** High-performance Rust bindings

---

## Quick Start

### REST API

```bash
# Health check
curl https://api.superinstance.ai/health

# Create consensus instance
curl -X POST https://api.superinstance.ai/v1/consensus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"nodes": 5, "algorithm": "bio_inspired"}'
```

### WebSocket API

```javascript
const ws = new WebSocket('wss://api.superinstance.ai/v1/stream');
ws.send(JSON.stringify({type: 'auth', token: 'YOUR_API_KEY'}));
```

### Python SDK

```python
from superinstance import SuperInstanceClient
client = SuperInstanceClient(api_key="YOUR_API_KEY")
consensus = client.create_consensus(nodes=5)
result = consensus.propose(value=42)
```

### JavaScript SDK

```typescript
import { SuperInstanceClient } from '@superinstance/sdk';
const client = new SuperInstanceClient('YOUR_API_KEY');
const consensus = await client.createConsensus({nodes: 5});
const result = await consensus.propose(42);
```

---

## REST API Endpoints

### Consensus Operations

#### Create Consensus Instance
```http
POST /v1/consensus
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "nodes": 5,
  "algorithm": "bio_inspired",
  "config": {
    "timeout": 30000,
    "retries": 3
  }
}
```

**Response:**
```json
{
  "instance_id": "cons_abc123",
  "status": "initializing",
  "nodes": [
    {"id": 0, "status": "active"},
    {"id": 1, "status": "active"},
    {"id": 2, "status": "active"},
    {"id": 3, "status": "active"},
    {"id": 4, "status": "active"}
  ]
}
```

#### Propose Value
```http
POST /v1/consensus/{instance_id}/propose
Authorization: Bearer YOUR_API_KEY

{
  "value": 42,
  "proposer_id": 0
}
```

#### Get Status
```http
GET /v1/consensus/{instance_id}
Authorization: Bearer YOUR_API_KEY
```

### Routing Operations

#### SE(3)-Equivariant Routing
```http
POST /v1/routing/se3
Authorization: Bearer YOUR_API_KEY

{
  "source": {"x": 0, "y": 0, "z": 0},
  "destination": {"x": 10, "y": 20, "z": 30}
}
```

### Origin Tracking

#### Create Origin Tracker
```http
POST /v1/origin
Authorization: Bearer YOUR_API_KEY

{
  "data": {"temperature": 25.0},
  "origin": {
    "source": "sensor_DHT22",
    "location": "room1"
  }
}
```

#### Trace Provenance
```http
GET /v1/origin/{tracking_id}/trace
Authorization: Bearer YOUR_API_KEY
```

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('wss://api.superinstance.ai/v1/stream');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'YOUR_API_KEY'
}));

// Subscribe to channels
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['consensus-updates', 'routing-events']
}));
```

### Event Types

- `consensus_reached` - Consensus achieved
- `node_status_change` - Node status updated
- `routing_update` - Routing table changed
- `origin_verified` - Origin tracking verified

---

## Authentication

All API requests require authentication using an API key:

```bash
curl https://api.superinstance.ai/v1/consensus \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Obtaining API Keys

1. Sign up at https://superinstance.ai
2. Navigate to API Settings
3. Generate new API key
4. Store securely (never commit to git)

### Security Best Practices

- ✅ Store API keys in environment variables
- ✅ Rotate keys regularly
- ✅ Use different keys for development/production
- ✅ Monitor key usage
- ❌ Never commit keys to version control
- ❌ Never share keys in plaintext

---

## Rate Limits

| Tier | Requests/Minute | Burst |
|------|-----------------|-------|
| Free | 100 | 200 |
| Pro | 1,000 | 2,000 |
| Enterprise | Custom | Custom |

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1647259200
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "CONSENSUS_TIMEOUT",
    "message": "Consensus not reached within timeout",
    "details": {
      "instance_id": "cons_abc123",
      "timeout": 30000
    }
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

---

## SDK Documentation

### Python SDK

**Installation:**
```bash
pip install superinstance
```

**Documentation:** [Python SDK](sdk/python/README.md)

**Examples:** [Python Examples](sdk/python/examples/)

### JavaScript SDK

**Installation:**
```bash
npm install @superinstance/sdk
```

**Documentation:** [JavaScript SDK](sdk/javascript/README.md)

**Examples:** [JavaScript Examples](sdk/javascript/examples/)

### Rust Integration

**Documentation:** [Rust Crates](../../crates/README.md)

**Examples:** [Rust Examples](../../examples/)

---

## Support & Resources

### Documentation

- [Main Documentation](../README.md)
- [Research Papers](../research/README.md)
- [Tutorials](../../tutorials/README.md)
- [Deployment Guide](../../deployment/README.md)

### Community

- **GitHub Issues:** https://github.com/SuperInstance/SuperInstance-papers/issues
- **GitHub Discussions:** https://github.com/SuperInstance/SuperInstance-papers/discussions
- **Email:** api-support@superinstance.ai
- **Status Page:** https://status.superinstance.ai

---

**API Version:** 1.0.0
**Base URL:** https://api.superinstance.ai
**Documentation Last Updated:** 2026-03-14

---

*Complete API documentation for building distributed consensus applications.*
