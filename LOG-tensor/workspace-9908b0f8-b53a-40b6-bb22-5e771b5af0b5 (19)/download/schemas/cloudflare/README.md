# SuperInstance.AI - Cloudflare Deployment Guide

Complete deployment documentation for SuperInstance.AI with BYOC (Bring Your Own Cloudflare) architecture.

## Overview

SuperInstance.AI supports three deployment modes:

| Mode | Description | Best For |
|------|-------------|----------|
| **Portal** | Free tier on our shared Cloudflare account | Quick start, evaluation |
| **User Cloudflare (BYOC)** | Your own Cloudflare account | Production, custom domains, control |
| **Local** | Self-hosted on your machine | Privacy, offline, development |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SuperInstance.AI Portal                     │
│                      (portal.superinstance.ai)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Frontend   │    │  API Gateway │    │  Auth Service│     │
│  │   (Pages)    │◄──►│   (Worker)   │◄──►│   (Worker)   │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    SMP Orchestrator                       │  │
│  │  (Durable Object - manages all SMP Cells and Bots)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐            │
│         ▼                    ▼                    ▼            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  SMP Cell   │    │  SMP Bot    │    │ Cold Logic  │        │
│  │   (DO)      │    │  (Worker)   │    │  Checker    │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                    │                    │            │
│         └────────────────────┼────────────────────┘            │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Storage Layer                           │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌──────────┐ ┌────────────┐   │  │
│  │  │ KV  │ │ R2  │ │ D1  │ │Vectorize │ │  Queues    │   │  │
│  │  └─────┘ └─────┘ └─────┘ └──────────┘ └────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Option 1: Portal Mode (Free)

1. Visit [superinstance.ai](https://superinstance.ai)
2. Sign up with email or OAuth (GitHub, Google)
3. Start creating SMP bots immediately
4. No configuration required

### Option 2: BYOC (Your Cloudflare)

1. Sign up at [superinstance.ai](https://superinstance.ai)
2. Go to Settings → Cloudflare Connection
3. Click "Connect Cloudflare Account"
4. Authorize OAuth permissions:
   - `workers:write`, `workers:read`
   - `storage:read`, `storage:write`
5. Your resources are auto-provisioned

### Option 3: Local Installation

```bash
# Download installer
curl -fsSL https://superinstance.ai/install.sh | bash

# Or with npm
npx create-superinstance-app

# Or clone and build
git clone https://github.com/superInstance/superinstance.git
cd superinstance
npm install && npm run setup
```

## BYOC Architecture

When you connect your Cloudflare account, SuperInstance.AI provisions:

### Workers (Serverless Compute)

| Worker | Purpose | Binding |
|--------|---------|---------|
| `si-api-gateway` | Main API entry point | All bindings |
| `si-smp-orchestrator` | Manages SMP cells and bots | Durable Objects |
| `si-cold-logic` | Background health checking | Queue, D1 |
| `si-vector-rag` | Document embedding and retrieval | Vectorize, R2 |
| `si-conditional-geometry` | Geometry computations | KV, D1 |
| `si-foldable-tensor` | Tensor operations | KV, D1 |
| `si-channel-depth` | Learning curve computations | KV, D1 |

### Durable Objects (Stateful Compute)

| Class | Purpose | Instances |
|-------|---------|-----------|
| `SMPCellDO` | Locked program state | Per SMP Cell |
| `SessionManagerDO` | User sessions | Per active user |
| `SMPBotDO` | Bot execution state | Per SMP Bot |

### KV Namespaces

| Binding | Purpose | TTL |
|---------|---------|-----|
| `SESSIONS` | Auth tokens, session data | 7 days |
| `CACHE` | API response cache | 1 hour |
| `CONFIGS` | User preferences, settings | Persistent |
| `EXECUTIONS` | Execution history index | 30 days |

### R2 Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `si-documents-{userId}` | RAG documents | Private |
| `si-exports-{userId}` | User exports | Public (signed URLs) |
| `si-models` | Cached model weights | Private |

### D1 Databases

| Database | Purpose | Size |
|----------|---------|------|
| `si-main-{userId}` | User data, bots, executions | 5GB (free) |

### Vectorize Indexes

| Index | Dimensions | Metric | Purpose |
|-------|------------|--------|---------|
| `si-embeddings-{userId}` | 1536 | cosine | RAG memory |
| `si-documents-{userId}` | 1536 | cosine | Document search |

## API Configuration

### OpenAI-Compatible APIs

SuperInstance.AI supports any OpenAI-compatible API:

```typescript
// Configuration example
const provider = {
  name: 'custom',
  baseUrl: 'https://your-api.com/v1',
  encryptedKey: 'encrypted_key_here',
  models: ['model-1', 'model-2'],
  supportsStreaming: true,
  supportsFunctionCalling: true,
  supportsVision: false
};
```

### Pre-configured Providers

| Provider | Models | Streaming | Functions | Vision |
|----------|--------|-----------|-----------|--------|
| OpenAI | GPT-4, GPT-3.5 | ✓ | ✓ | ✓ |
| Anthropic | Claude 3 | ✓ | ✓ | ✓ |
| DeepSeek | Reasoner, Chat | ✓ | ✓ | ✗ |
| DeepInfra | Llama, Mixtral | ✓ | ✓ | ✗ |
| Moonshot | Kimi models | ✓ | ✗ | ✗ |
| Local | Ollama, LM Studio | ✓ | Varies | Varies |

### Local LLM Support

```bash
# Start Ollama (automatic detection)
ollama serve

# Or configure custom endpoint
export LOCAL_LLM_URL=http://localhost:11434/v1
```

## One-Click Download

The local installer includes everything needed:

```
superinstance-local/
├── package.json
├── wrangler.toml         # Local Wrangler config
├── schema.sql           # SQLite migrations
├── src/
│   ├── index.ts         # Main Worker
│   ├── cells/           # SMP Cells
│   ├── bots/            # SMP Bots
│   ├── rag/             # Vector RAG
│   └── cold-logic/      # Checkers
├── frontend/            # Next.js app
├── install.sh           # Installer script
└── .env.example         # Environment template
```

### Local Architecture

```
┌─────────────────────────────────────────┐
│         Your Machine (localhost)        │
├─────────────────────────────────────────┤
│  ┌──────────┐    ┌──────────────────┐  │
│  │ Frontend │    │  Miniflare       │  │
│  │ :3000    │◄──►│  (CF Simulator)  │  │
│  └──────────┘    │  :8787           │  │
│                  └──────────────────┘  │
│                          │              │
│                          ▼              │
│                  ┌──────────────┐      │
│                  │   SQLite     │      │
│                  │   :memory:   │      │
│                  └──────────────┘      │
│                          │              │
│                          ▼              │
│                  ┌──────────────┐      │
│                  │   Ollama     │      │
│                  │   :11434     │      │
│                  └──────────────┘      │
└─────────────────────────────────────────┘
```

## Security

### Authentication

- **JWT tokens** with configurable TTL
- **OAuth 2.0** for Cloudflare connection
- **API keys** for programmatic access
- **MFA** optional (TOTP, email)

### Encryption

- **AES-256-GCM** for stored secrets
- **TLS 1.3** for transit
- **Encrypted API keys** in database
- **Signed URLs** for R2 access

### Rate Limiting

| Endpoint Category | Rate Limit |
|-------------------|------------|
| Default | 60 req/min |
| API | 100 req/min |
| Bot Execution | 30 req/min |
| RAG Query | 50 req/min |

## Monitoring

### Built-in Analytics

- Execution count and latency
- Token usage per bot
- Error rates and types
- Storage utilization
- Vector index size

### Alerts

Configure alerts for:
- Bot errors exceeding threshold
- Cold Logic check failures
- Rate limit approaching
- Storage quota warnings
- Vector index capacity

### Export

Export metrics to:
- Cloudflare Analytics
- Custom webhook
- Slack integration
- Email reports

## Pricing

### Free Tier (Portal Mode)

| Resource | Limit |
|----------|-------|
| SMP Bots | 5 |
| Executions/day | 100 |
| Storage | 100 MB |
| Vectors | 10,000 |
| RAG Documents | 50 |

### BYOC (Your Cloudflare)

Limited only by your Cloudflare plan:
- Workers Paid: $5/month + usage
- D1: 5GB included
- R2: 10GB included
- Vectorize: 5M vectors included

### Local

No limits - uses your hardware.

## Development

### Local Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Generate types
npm run generate:types

# Database migrations
npm run db:migrate
```

### Deployment

```bash
# Deploy to Cloudflare
npx wrangler deploy

# Deploy frontend
npx wrangler pages deploy ./dist
```

## File Structure

```
schemas/cloudflare/
├── config_schema.json        # Main CF configuration
├── user_config_schema.json   # User preferences & BYOC
├── installation_schema.json  # One-click download config
├── deployment_schema.json    # Master deployment manifest
├── master_schema.json        # Schema index
├── types.ts                  # TypeScript interfaces
├── schema.sql               # D1 migrations
├── wrangler.toml            # Wrangler template
└── README.md                # This file
```

## Support

- Documentation: [docs.superinstance.ai](https://docs.superinstance.ai)
- Discord: [discord.gg/superinstance](https://discord.gg/superinstance)
- GitHub: [github.com/superInstance](https://github.com/superInstance)
- Email: support@superinstance.ai

## License

MIT License - See [LICENSE](LICENSE) for details.
