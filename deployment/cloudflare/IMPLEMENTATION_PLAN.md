# SpreadsheetMoment - Cloudflare Implementation Plan
**Round 1 Implementation Strategy**
**Version:** 1.0
**Last Updated:** 2026-03-14
**Status:** Ready for Round 2 Prototyping

---

## Executive Summary

This document provides a comprehensive implementation plan for deploying SpreadsheetMoment to Cloudflare Workers. The plan is organized into practical phases for Round 2 prototyping, with detailed checklists, code structure design, CI/CD pipeline configuration, and cost projections.

### Key Objectives
- Deploy a functional prototype on Cloudflare Workers within 6 weeks
- Establish development, staging, and production environments
- Implement core features: real-time collaboration, tensor cells, NLP queries
- Maintain budget-friendly operations with clear cost scaling projections
- Build a foundation for rapid iteration and feature expansion

---

## Phase 1: Foundation Setup (Week 1-2)

### 1.1 Cloudflare Account Configuration

#### Account Setup Checklist
- [ ] Create Cloudflare account (if not exists)
  - URL: https://dash.cloudflare.com/sign-up
  - Verify email address
  - Enable 2FA authentication

- [ ] Upgrade to Workers Paid Plan
  - Required for Durable Objects
  - Cost: $5/month base
  - URL: https://dash.cloudflare.com/[account-id]/workers/plans

- [ ] Record Account Details
  ```bash
  # Store securely in password manager
  Account ID: ___________________
  Email: ___________________
  API Token: ___________________
  ```

#### Domain Configuration
- [ ] Purchase or transfer domain
  - Recommended: spreadsheetmoment.com
  - Alternative: dev.spreadsheetmoment.net (for prototyping)

- [ ] Configure DNS Records
  ```bash
  # Add to Cloudflare DNS > Records
  Type: A, Name: api, Content: [Temporary origin], Proxy: On
  Type: CNAME, Name: www, Content: spreadsheetmoment.com, Proxy: On
  Type: CNAME, Name: app, Content: spreadsheetmoment.com, Proxy: On
  Type: CNAME, Name: staging, Content: spreadsheetmoment.com, Proxy: On
  ```

#### Team Setup
- [ ] Create Cloudflare Teams (if multi-user)
  - Add team members
  - Configure roles (Owner, Admin, Developer)
  - Set up SSO (if available)

### 1.2 Local Development Environment

#### Prerequisites Installation
```bash
# Verify Node.js version (must be 18+)
node --version  # Should output v18.0.0 or higher

# Install Wrangler CLI globally
npm install -g wrangler

# Verify installation
wrangler --version  # Should output 3.x.x

# Authenticate with Cloudflare
wrangler login

# Verify authentication
wrangler whoami  # Should show your email
```

#### Project Setup
```bash
# Clone repository (or create new)
git clone https://github.com/SuperInstance/polln.git
cd polln

# Navigate to Cloudflare deployment directory
cd deployment/cloudflare

# Install dependencies
npm install

# Copy configuration templates
cp wrangler.example.toml wrangler.toml
cp .env.example .env

# Create required directories
mkdir -p src/workers
mkdir -p src/durable-objects
mkdir -p src/middleware
mkdir -p src/services
mkdir -p src/utils
mkdir -p scripts
mkdir -p tests
mkdir -p migrations
```

#### Configure wrangler.toml
```toml
# Edit wrangler.toml with your values
name = "spreadsheetmoment"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Add your Account ID
account_id = "your-account-id-here"  # From Cloudflare dashboard

# Environment configurations
[env.production]
name = "spreadsheetmoment-prod"
routes = [
  { pattern = "api.spreadsheetmoment.com/*", zone_name = "spreadsheetmoment.com" }
]

[env.staging]
name = "spreadsheetmoment-staging"
routes = [
  { pattern = "api-staging.spreadsheetmoment.com/*", zone_name = "spreadsheetmoment.com" }
]

[env.development]
name = "spreadsheetmoment-dev"
```

### 1.3 Database & Storage Resources

#### Create D1 Databases
```bash
# Production database
wrangler d1 create spreadsheetmoment-prod
# Output will show database_id - save this!

# Staging database
wrangler d1 create spreadsheetmoment-staging
# Save this ID too

# Development database (optional)
wrangler d1 create spreadsheetmoment-dev
```

#### Update wrangler.toml with Database IDs
```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "spreadsheetmoment-prod"
database_id = "paste-your-production-id-here"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "spreadsheetmoment-staging"
database_id = "paste-your-staging-id-here"
```

#### Create R2 Buckets
```bash
# Production bucket
wrangler r2 bucket create spreadsheetmoment-prod

# Staging bucket
wrangler r2 bucket create spreadsheetmoment-staging

# Verify buckets created
wrangler r2 bucket list
```

#### Create KV Namespaces
```bash
# Production KV
wrangler kv:namespace create "KV" --preview=false
# Save the namespace ID

# Staging KV
wrangler kv:namespace create "KV" --preview=true
# Save this ID too
```

#### Update wrangler.toml with KV IDs
```toml
[[env.production.kv_namespaces]]
binding = "KV"
id = "paste-production-kv-id-here"

[[env.staging.kv_namespaces]]
binding = "KV"
id = "paste-staging-kv-id-here"
```

#### Create Vectorize Indexes
```bash
# Cell similarity index
wrangler vectorize create spreadsheetmoment-cells \
  --dimensions=1536 \
  --metric=cosine \
  --metadata-fields=workspace_id:string,cell_type:string,temperature:number

# Query history index
wrangler vectorize create spreadsheetmoment-queries \
  --dimensions=1536 \
  --metric=cosine \
  --metadata-fields=user_id:string,workspace_id:string,query_type:string

# List indexes to verify
wrangler vectorize list
```

#### Create Queues
```bash
# Analytics events queue
wrangler queues create analytics-events

# Backup jobs queue
wrangler queues create backup-jobs

# Verify queues
wrangler queues list
```

### 1.4 Initial Database Migration

#### Apply Schema to Databases
```bash
# Production database
wrangler d1 execute spreadsheetmoment-prod \
  --file=deployment/cloudflare/migrations/001_initial_schema.sql

# Staging database
wrangler d1 execute spreadsheetmoment-staging \
  --file=deployment/cloudflare/migrations/001_initial_schema.sql

# Verify tables created
wrangler d1 execute spreadsheetmoment-prod \
  --command="SELECT name FROM sqlite_master WHERE type='table';"
```

#### Seed Initial Data
```bash
# Create admin user (production)
wrangler d1 execute spreadsheetmoment-prod --command="
  INSERT INTO users (id, email, display_name, subscription_tier)
  VALUES ('admin-uuid', 'admin@spreadsheetmoment.com', 'Admin', 'premium');
"

# Create example workspace
wrangler d1 execute spreadsheetmoment-prod --command="
  INSERT INTO workspaces (id, owner_id, name, description)
  VALUES ('workspace-uuid', 'admin-uuid', 'Example Workspace', 'Welcome to SpreadsheetMoment');
"
```

---

## Phase 2: Environment & Secrets Configuration (Week 2)

### 2.1 Secrets Management

#### Generate Secure Keys
```bash
# Generate JWT secret
openssl rand -base64 32
# Save output as JWT_SECRET

# Generate encryption key
openssl rand -base64 32
# Save output as ENCRYPTION_KEY

# Generate database encryption key
openssl rand -base64 32
# Save output as DB_ENCRYPTION_KEY
```

#### Set Production Secrets
```bash
# OpenAI API key
wrangler secret put OPENAI_API_KEY --env production
# Paste your key when prompted

# SuperInstance API key
wrangler secret put SUPERINSTANCE_API_KEY --env production

# JWT secret
wrangler secret put JWT_SECRET --env production
# Paste generated JWT_SECRET

# Encryption key
wrangler secret put ENCRYPTION_KEY --env production

# Database encryption key
wrangler secret put DB_ENCRYPTION_KEY --env production

# OAuth credentials
wrangler secret put GOOGLE_CLIENT_ID --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production

# CloudFlare Access public key
wrangler secret put ACCESS_PUBLIC_KEY --env production
```

#### Set Staging Secrets
```bash
# Repeat for staging environment
wrangler secret put OPENAI_API_KEY --env staging
wrangler secret put SUPERINSTANCE_API_KEY --env staging
wrangler secret put JWT_SECRET --env staging
# ... (repeat for all secrets)
```

### 2.2 OAuth Provider Setup

#### Google OAuth
1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable Google+ API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
   - Application type: Web application
   - Authorized redirect URIs:
     - `https://api.spreadsheetmoment.com/auth/callback/google`
     - `https://api-staging.spreadsheetmoment.com/auth/callback/google`
6. Save Client ID and Client Secret

#### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in details:
   - Application name: SpreadsheetMoment
   - Homepage URL: `https://spreadsheetmoment.com`
   - Authorization callback URL:
     - `https://api.spreadsheetmoment.com/auth/callback/github`
     - `https://api-staging.spreadsheetmoment.com/auth/callback/github`
4. Save Client ID and Client Secret

### 2.3 Environment Variables

#### Create .env File
```bash
# .env (development)
OPENAI_API_KEY=sk-...
SUPERINSTANCE_API_KEY=si-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
ENCRYPTION_KEY=...
DB_ENCRYPTION_KEY=...
ENVIRONMENT=development
```

#### Load Environment Variables in Code
```typescript
// src/env.ts
export interface Env {
  // Database bindings
  DB: D1Database
  R2: R2Bucket
  KV: KVNamespace

  // Durable Objects
  WORKSPACE_COORDINATOR: DurableObjectNamespace
  CELL_UPDATE_MANAGER: DurableObjectNamespace
  COLLABORATION_SESSION: DurableObjectNamespace
  HARDWARE_CONNECTION_POOL: DurableObjectNamespace

  // Vectorize
  VECTORS: VectorizeIndex

  // Queues
  ANALYTICS_QUEUE: Queue<Schema>
  BACKUP_QUEUE: Queue<Schema>

  // Secrets
  OPENAI_API_KEY: string
  SUPERINSTANCE_API_KEY: string
  JWT_SECRET: string
  ENCRYPTION_KEY: string
  DB_ENCRYPTION_KEY: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  ACCESS_PUBLIC_KEY: string

  // Environment variables
  ENVIRONMENT: string
  API_VERSION: string
  LOG_LEVEL: string
}
```

---

## Phase 3: Code Structure & Implementation (Week 3-4)

### 3.1 Project Directory Structure

```
deployment/cloudflare/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── env.ts                      # Environment interface
│   │
│   ├── workers/                    # Worker implementations
│   │   ├── api-gateway.ts          # Main API router
│   │   ├── cell-engine.ts          # Tensor cell computations
│   │   ├── nlp-worker.ts           # NLP query processing
│   │   ├── hardware-worker.ts      # Hardware integration
│   │   ├── collaboration-worker.ts # Real-time collaboration
│   │   └── storage-worker.ts       # R2 storage management
│   │
│   ├── durable-objects/            # Durable Objects
│   │   ├── workspace-coordinator.ts
│   │   ├── cell-update-manager.ts
│   │   ├── collaboration-session.ts
│   │   └── hardware-connection-pool.ts
│   │
│   ├── middleware/                 # Request processing
│   │   ├── auth.ts                 # Authentication
│   │   ├── cors.ts                 # CORS handling
│   │   ├── rate-limit.ts           # Rate limiting
│   │   ├── error-handler.ts        # Error handling
│   │   └── validation.ts           # Request validation
│   │
│   ├── services/                   # Business logic
│   │   ├── ai/
│   │   │   ├── openai.ts           # OpenAI integration
│   │   │   └── embeddings.ts       # Vector embeddings
│   │   ├── hardware/
│   │   │   ├── arduino.ts          # Arduino integration
│   │   │   └── jetson.ts           # Jetson integration
│   │   ├── storage/
│   │   │   ├── r2.ts               # R2 operations
│   │   │   └── backup.ts           # Backup/restore
│   │   └ analytics/
│   │       └── metrics.ts          # Metrics collection
│   │
│   ├── routes/                     # API routes
│   │   ├── auth.ts                 # Authentication endpoints
│   │   ├── workspaces.ts           # Workspace CRUD
│   │   ├── cells.ts                # Cell operations
│   │   ├── tensor.ts               # Tensor operations
│   │   ├── nlp.ts                  # NLP endpoints
│   │   ├── hardware.ts             # Hardware endpoints
│   │   └── collaboration.ts        # Real-time sync
│   │
│   ├── models/                     # Data models
│   │   ├── user.ts
│   │   ├── workspace.ts
│   │   ├── cell.ts
│   │   ├── tensor.ts
│   │   └── hardware.ts
│   │
│   └── utils/                      # Utilities
│       ├── crypto.ts               # Encryption
│       ├── jwt.ts                  # JWT handling
│       ├── logger.ts               # Logging
│       ├── errors.ts               # Error classes
│       └── validators.ts           # Input validation
│
├── tests/                          # Tests
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   └── e2e/                        # End-to-end tests
│
├── scripts/                        # Utility scripts
│   ├── migrate.ts                  # Database migrations
│   ├── seed.ts                     # Seed data
│   ├── backup.ts                   # Backup utilities
│   ├── restore.ts                  # Restore utilities
│   └── vectorize.ts                # Vector embeddings
│
├── migrations/                     # SQL migrations
│   ├── 001_initial_schema.sql
│   └── 002_add_indexes.sql
│
├── wrangler.toml                   # Wrangler configuration
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### 3.2 Core Implementation Files

#### Main Entry Point (src/index.ts)
```typescript
import { Router } from 'itty-router'
import { cors } from './middleware/cors'
import { auth } from './middleware/auth'
import { errorHandler } from './middleware/error-handler'
import { Env } from './env'

// Import routes
import authRoutes from './routes/auth'
import workspaceRoutes from './routes/workspaces'
import cellRoutes from './routes/cells'
import tensorRoutes from './routes/tensor'
import nlpRoutes from './routes/nlp'
import hardwareRoutes from './routes/hardware'
import collaborationRoutes from './routes/collaboration'

// Create router
const router = Router()

// Apply middleware
router.all('*', cors)
router.all('*', auth)

// Register routes
router.route('/auth', authRoutes)
router.route('/workspaces', workspaceRoutes)
router.route('/cells', cellRoutes)
router.route('/tensor', tensorRoutes)
router.route('/nlp', nlpRoutes)
router.route('/hardware', hardwareRoutes)
router.route('/collaboration', collaborationRoutes)

// Health check
router.get('/health', () => ({ status: 'ok', timestamp: Date.now() }))

// Error handling
router.all('*', errorHandler)

// Export Cloudflare Worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return router.handle(request, env, ctx).catch(errorHandler)
  }
}
```

#### API Gateway Worker (src/workers/api-gateway.ts)
```typescript
import { Env } from '../env'
import { authenticateRequest } from '../middleware/auth'
import { rateLimit } from '../middleware/rate-limit'

export class APIGatewayWorker {
  constructor(private env: Env) {}

  async handle(request: Request): Promise<Response> {
    // Authenticate
    const user = await authenticateRequest(request, this.env)
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Rate limit
    const allowed = await rateLimit(user.id, this.env)
    if (!allowed) {
      return new Response('Too Many Requests', { status: 429 })
    }

    // Route to appropriate handler
    const url = new URL(request.url)
    const path = url.pathname

    // ... routing logic

    return new Response('OK')
  }
}
```

#### Workspace Coordinator Durable Object (src/durable-objects/workspace-coordinator.ts)
```typescript
import { DurableObject } from 'cloudflare:workers'
import { Env } from '../env'

export class WorkspaceCoordinator implements DurableObject {
  private state: DurableObjectState
  private env: Env
  private sessions: Map<string, WebSocket>

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.sessions = new Map()
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    switch (path) {
      case '/connect':
        return this.handleConnect(request)
      case '/broadcast':
        return this.handleBroadcast(request)
      default:
        return new Response('Not Found', { status: 404 })
    }
  }

  private async handleConnect(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const workspaceId = searchParams.get('workspaceId')

    if (!userId || !workspaceId) {
      return new Response('Missing parameters', { status: 400 })
    }

    // Upgrade to WebSocket
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    await this.sessions.set(userId, server)

    server.accept()
    server.send(JSON.stringify({
      type: 'connected',
      workspaceId,
      userId
    }))

    return new Response(null, { status: 101, webSocket: client })
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const { type, data } = await request.json()

    // Broadcast to all connected clients
    const message = JSON.stringify({ type, data })

    this.sessions.forEach((ws, userId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    })

    return new Response('OK')
  }
}
```

### 3.3 Key Services Implementation

#### OpenAI Service (src/services/ai/openai.ts)
```typescript
export class OpenAIService {
  constructor(private apiKey: string) {}

  async embedText(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    })

    const data = await response.json()
    return data.data[0].embedding
  }

  async processQuery(query: string, context: any): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a spreadsheet assistant...'
          },
          {
            role: 'user',
            content: query
          }
        ]
      })
    })

    return await response.json()
  }
}
```

### 3.4 Testing Setup

#### Unit Tests (tests/unit/cell.test.ts)
```typescript
import { describe, it, expect } from 'vitest'
import { CellEngine } from '../../src/workers/cell-engine'

describe('CellEngine', () => {
  it('should update cell value', async () => {
    const engine = new CellEngine()
    const result = await engine.updateCell('cell-1', { value: 42 })
    expect(result.value).toBe(42)
  })

  it('should propagate temperature', async () => {
    const engine = new CellEngine()
    await engine.propagateTemperature('cell-1', 0.5)
    // Verify propagation logic
  })
})
```

#### Integration Tests (tests/integration/workspace.test.ts)
```typescript
import { describe, it, expect } from 'vitest'
import { Env, populateEnv } from '@cloudflare/vitest-pool-workers'
import type { WorkerEnv } from '../src/env'

describe('Workspace API', () => {
  it('should create workspace', async () => {
    const response = await Env.fetch('http://localhost/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Workspace' })
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.name).toBe('Test Workspace')
  })
})
```

### 3.5 Build & Development Scripts

#### Update package.json Scripts
```json
{
  "scripts": {
    "dev": "wrangler dev --local",
    "dev:remote": "wrangler dev",
    "deploy": "npm run build && wrangler deploy",
    "deploy:staging": "npm run build && wrangler deploy --env staging",
    "deploy:production": "npm run build && wrangler deploy --env production",
    "build": "tsc",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "db:migrate": "wrangler d1 execute spreadsheetmoment-prod --file=migrations/001_initial_schema.sql",
    "db:migrate:staging": "wrangler d1 execute spreadsheetmoment-staging --file=migrations/001_initial_schema.sql",
    "db:backup": "node scripts/backup.js",
    "logs": "wrangler tail --format pretty",
    "logs:staging": "wrangler tail --env staging --format pretty",
    "metrics": "wrangler metrics --format json"
  }
}
```

---

## Phase 4: CI/CD Pipeline (Week 4-5)

### 4.1 GitHub Actions Workflow

#### Create .github/workflows/deploy.yml
```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: deployment/cloudflare/package-lock.json

      - name: Install dependencies
        working-directory: deployment/cloudflare
        run: npm ci

      - name: Type check
        working-directory: deployment/cloudflare
        run: npm run type-check

      - name: Lint
        working-directory: deployment/cloudflare
        run: npm run lint

      - name: Run tests
        working-directory: deployment/cloudflare
        run: npm test

  deploy-staging:
    name: Deploy to Staging
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://api-staging.spreadsheetmoment.com
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: deployment/cloudflare
        run: npm ci

      - name: Deploy to Cloudflare Staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env staging
          workingDirectory: deployment/cloudflare

      - name: Run smoke tests
        working-directory: deployment/cloudflare
        run: npm run test:smoke-staging
        env:
          STAGING_API_URL: https://api-staging.spreadsheetmoment.com

  deploy-production:
    name: Deploy to Production
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://api.spreadsheetmoment.com
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: deployment/cloudflare
        run: npm ci

      - name: Deploy to Cloudflare Production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env production
          workingDirectory: deployment/cloudflare

      - name: Run production tests
        working-directory: deployment/cloudflare
        run: npm run test:smoke-production
        env:
          PRODUCTION_API_URL: https://api.spreadsheetmoment.com

      - name: Notify deployment
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment successful!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 4.2 GitHub Secrets Configuration

#### Required Secrets
Navigate to: GitHub Repository > Settings > Secrets and variables > Actions

Add the following secrets:

```
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
SLACK_WEBHOOK=your-slack-webhook-url (optional)
OPENAI_API_KEY=your-openai-api-key
SUPERINSTANCE_API_KEY=your-superinstance-api-key
```

#### Create Cloudflare API Token
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use template: "Edit Cloudflare Workers"
4. Configure permissions:
   - Account > Cloudflare Workers > Edit
   - Account > Workers Scripts > Edit
   - Account > D1 > Edit
   - Account > Workers KV Storage > Edit
   - Account > Workers R2 Storage > Edit
5. Set zone resources to include your domain
6. Create token and copy it

### 4.3 Smoke Tests

#### Create tests/smoke.ts
```typescript
describe('Smoke Tests', () => {
  const baseUrl = process.env.STAGING_API_URL || 'http://localhost:8787'

  it('health check returns 200', async () => {
    const response = await fetch(`${baseUrl}/health`)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.status).toBe('ok')
  })

  it('API version endpoint works', async () => {
    const response = await fetch(`${baseUrl}/api/v1/version`)
    expect(response.status).toBe(200)
  })
})
```

---

## Phase 5: Monitoring & Operations (Week 5-6)

### 5.1 Cloudflare Analytics Setup

#### Enable Analytics Engine
```bash
# Create analytics dataset
wrangler analytics-engine create spreadsheetmoment-analytics
```

#### Add Analytics to Worker
```typescript
// src/utils/analytics.ts
export async function trackMetrics(
  env: Env,
  event: FetchEvent,
  latency: number
): Promise<void> {
  const url = new URL(event.request.url)

  await env.ANALYTICS.writeDataPoint({
    blobs: [url.pathname, event.request.method],
    doubles: [latency],
    indexes: [event.response?.status || 200]
  })
}
```

### 5.2 Alert Configuration

#### Set Up Cloudflare Alerts
1. Go to: Workers & Pages > Your Worker > Metrics
2. Configure alerts:

| Alert Name | Condition | Threshold | Action |
|------------|-----------|-----------|--------|
| High Error Rate | error_rate | > 5% | Email + Slack |
| High Latency | p95_latency | > 1s | Email |
| CPU Usage | cpu_time | > 80% | PagerDuty |
| Cost Spike | daily_cost | > $100 | Email |

### 5.3 Logging & Debugging

#### Configure Log Collection
```bash
# Tail logs in real-time
wrangler tail --env production --format pretty

# Save logs to file
wrangler tail --env production > logs/production.log
```

#### Implement Structured Logging
```typescript
// src/utils/logger.ts
export class Logger {
  constructor(private env: Env) {}

  info(message: string, data?: any) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString()
    }))
  }

  error(message: string, error?: Error) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.stack,
      timestamp: new Date().toISOString()
    }))
  }
}
```

### 5.4 Backup Strategy

#### Automated Backups
```typescript
// scripts/backup.ts
export async function backupWorkspace(
  workspaceId: string,
  env: Env
): Promise<void> {
  // Export workspace data
  const data = await exportWorkspaceData(workspaceId, env)

  // Compress
  const compressed = await compress(data)

  // Upload to R2
  const backupKey = `backups/workspaces/${workspaceId}/${Date.now()}.tar.gz`
  await env.R2.put(backupKey, compressed)

  // Update backup metadata
  await env.DB.prepare(`
    INSERT INTO backups (workspace_id, backup_type, r2_key, size_bytes)
    VALUES (?, 'scheduled', ?, ?)
  `).bind(workspaceId, backupKey, compressed.size).run()
}
```

#### Schedule Backups (Cron Triggers)
```toml
# Add to wrangler.toml
[[env.production.triggers]]
crons = ["0 2 * * *"]  # 2 AM daily
```

---

## Phase 6: Cost Management & Optimization (Week 6)

### 6.1 Cost Projection by Phase

#### Development Phase (Months 1-3)
| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Workers (Paid Plan) | Base fee | $5.00 |
| D1 Database | 1GB storage, 1M rows | $2.00 |
| R2 Storage | 10GB storage, 100K operations | $0.50 |
| Durable Objects | 100K requests, 1GB storage | $0.50 |
| KV | 100MB storage, 1M reads | $0.10 |
| Vectorize | 10K searches, 1K vectors | $0.01 |
| **Total Development** | | **~$8.11/month** |

#### Staging Phase (Months 4-6)
| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Workers | 1M requests | $5.00 |
| D1 Database | 5GB storage, 5M rows | $5.00 |
| R2 Storage | 50GB storage, 500K operations | $2.50 |
| Durable Objects | 500K requests, 5GB storage | $1.50 |
| KV | 500MB storage, 5M reads | $0.25 |
| Vectorize | 100K searches, 10K vectors | $0.10 |
| **Total Staging** | | **~$14.35/month** |

#### Production Phase (Months 7-12)
| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Workers | 10M requests | $25.00 |
| D1 Database | 50GB storage, 50M rows | $37.50 |
| R2 Storage | 500GB storage, 5M operations | $22.50 |
| Durable Objects | 5M requests, 50GB storage | $15.00 |
| KV | 5GB storage, 50M reads | $2.50 |
| Vectorize | 1M searches, 100K vectors | $1.00 |
| **Total Production** | | **~$103.50/month** |

#### Scale Phase (Year 2+)
Per 100K active users:
| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Workers | 100M requests | $500.00 |
| D1 Database | 500GB storage, 500M rows | $375.00 |
| R2 Storage | 5TB storage, 50M operations | $225.00 |
| Durable Objects | 50M requests, 500GB storage | $150.00 |
| KV | 50GB storage, 500M reads | $25.00 |
| Vectorize | 10M searches, 1M vectors | $10.00 |
| **Total Scale** | | **~$1,285.00/month** |

### 6.2 Cost Optimization Strategies

#### 1. Caching Strategy
```typescript
// Implement aggressive caching
const cacheHeaders = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'CDN-Cache-Control': 'public, max-age=31536000'
}

// Cache static assets
response.headers.set('Cache-Control', 'public, max-age=31536000')
```

#### 2. Batch Operations
```typescript
// Batch database writes
await env.DB.batch([
  env.DB.prepare('INSERT INTO cells ...'),
  env.DB.prepare('INSERT INTO cells ...'),
  env.DB.prepare('INSERT INTO cells ...')
])
```

#### 3. Query Optimization
```typescript
// Use prepared statements
const stmt = env.DB.prepare('SELECT * FROM cells WHERE workspace_id = ?')
const result = await stmt.bind(workspaceId).all()

// Use indexes effectively
// Create covering indexes for hot queries
CREATE INDEX idx_cells_workspace_hot ON tensor_cells(workspace_id, id, value, temperature);
```

#### 4. Data Archiving
```typescript
// Archive old data to cold storage
async function archiveOldCells(env: Env) {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const oldCells = await env.DB.prepare(`
    SELECT * FROM tensor_cells WHERE updated_at < ?
  `).bind(cutoffDate.toISOString()).all()

  // Upload to R2 with lifecycle rules
  await env.R2.put(`archive/cells-${Date.now()}.json`, JSON.stringify(oldCells))

  // Delete from active database
  await env.DB.prepare(`
    DELETE FROM tensor_cells WHERE updated_at < ?
  `).bind(cutoffDate.toISOString()).run()
}
```

#### 5. Resource Limits
```typescript
// Implement per-user quotas
async function checkQuota(userId: string, env: Env): Promise<boolean> {
  const user = await env.DB.prepare(
    'SELECT usage_quota FROM users WHERE id = ?'
  ).bind(userId).first()

  const usage = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM usage_logs
    WHERE user_id = ? AND created_at > datetime('now', '-1 month')
  `).bind(userId).first()

  return usage.count < user.usage_quota
}
```

### 6.3 Budget Alerts

#### Set Up Budget Notifications
```typescript
// scripts/cost-monitor.ts
async function monitorCosts() {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/analytics_dashboard`,
    {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    }
  )

  const data = await response.json()
  const currentCost = calculateTotalCost(data)

  if (currentCost > BUDGET_THRESHOLD) {
    await sendAlert({
      subject: 'Cloudflare cost threshold exceeded',
      body: `Current cost: $${currentCost}`,
      severity: 'warning'
    })
  }
}
```

---

## Implementation Checklist Summary

### Week 1-2: Foundation
- [ ] Cloudflare account setup
- [ ] Domain configuration
- [ ] Local development environment
- [ ] D1 databases created
- [ ] R2 buckets created
- [ ] KV namespaces created
- [ ] Vectorize indexes created
- [ ] Queues created
- [ ] Database migrations applied
- [ ] Initial data seeded

### Week 2-3: Environment
- [ ] Secrets generated
- [ ] Production secrets configured
- [ ] Staging secrets configured
- [ ] OAuth providers set up
- [ ] Environment variables configured
- [ ] wrangler.toml finalized

### Week 3-4: Code Implementation
- [ ] Directory structure created
- [ ] Main entry point implemented
- [ ] API Gateway worker implemented
- [ ] Cell Engine worker implemented
- [ ] NLP worker implemented
- [ ] Durable Objects implemented
- [ ] Middleware implemented
- [ ] Routes implemented
- [ ] Services implemented
- [ ] Tests written

### Week 4-5: CI/CD
- [ ] GitHub Actions workflow created
- [ ] Secrets configured
- [ ] Smoke tests written
- [ ] Staging deployment tested
- [ ] Production deployment tested

### Week 5-6: Operations
- [ ] Analytics Engine enabled
- [ ] Alerts configured
- [ ] Logging configured
- [ ] Backup strategy implemented
- [ ] Cost monitoring set up
- [ ] Runbooks documented

---

## Next Steps for Round 2 Prototyping

### Immediate Actions (Day 1-7)
1. **Set up Cloudflare account** - Complete account creation and verification
2. **Configure domain** - Purchase and configure DNS
3. **Initialize local environment** - Install tools and dependencies
4. **Create databases** - Set up D1, R2, KV, Vectorize
5. **Apply migrations** - Initialize database schema

### Short-term Goals (Week 2-4)
1. **Implement core workers** - API Gateway, Cell Engine, NLP
2. **Build Durable Objects** - Workspace coordination, collaboration
3. **Set up authentication** - OAuth integration
4. **Create CI/CD pipeline** - GitHub Actions workflow
5. **Deploy to staging** - First production-like deployment

### Medium-term Goals (Week 5-6)
1. **Implement monitoring** - Analytics, logging, alerts
2. **Optimize costs** - Caching, batching, archiving
3. **Test thoroughly** - Unit, integration, e2e tests
4. **Document operations** - Runbooks, troubleshooting guides
5. **Deploy to production** - Full production deployment

### Success Criteria
- [ ] All workers deployed and functional
- [ ] Real-time collaboration working
- [ ] NLP queries operational
- [ ] Monitoring and alerting active
- [ ] Costs within projected budget
- [ ] Documentation complete
- [ ] Team trained on operations

---

## Support & Resources

### Documentation
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/
- **D1 Database:** https://developers.cloudflare.com/d1/
- **Durable Objects:** https://developers.cloudflare.com/durable-objects/
- **Vectorize:** https://developers.cloudflare.com/vectorize/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/

### Community
- **Cloudflare Discord:** https://discord.gg/cloudflaredev
- **Workers Subreddit:** https://reddit.com/r/cloudflareworkers
- **Stack Overflow:** Tag questions with `cloudflare-workers`

### Emergency Contacts
- **Cloudflare Support:** https://support.cloudflare.com/
- **Infrastructure Lead:** [To be assigned]
- **On-Call Rotation:** [To be established]

---

**Document Version:** 1.0
**Last Updated:** 2026-03-14
**Next Review:** 2026-03-21
**Status:** Ready for Round 2 Prototyping

**Prepared By:** Cloudflare Implementation Specialist (Round 1)
**Reviewed By:** [To be assigned in Round 2]
