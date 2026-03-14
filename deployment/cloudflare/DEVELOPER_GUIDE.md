# Developer Onboarding Guide - Cloudflare Workers
**SpreadsheetMoment Implementation**
**Last Updated:** 2026-03-14

---

## Welcome to the Team!

This guide will help you get started with developing SpreadsheetMoment on Cloudflare Workers. You'll be building a cutting-edge spreadsheet platform with real-time collaboration, AI-powered features, and hardware integration.

---

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Development Workflow](#development-workflow)
3. [Code Organization](#code-organization)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Environment Setup

### 1. Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **Git** installed ([Download](https://git-scm.com/))
- **Cloudflare account** ([Sign up](https://dash.cloudflare.com/sign-up))
- **GitHub account** with access to the repository

### 2. Install Development Tools

```bash
# Install Node.js (if not already installed)
# Verify version
node --version  # Should be v18.0.0 or higher

# Install Wrangler CLI globally
npm install -g wrangler

# Verify installation
wrangler --version  # Should be 3.x.x

# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami  # Should show your email
```

### 3. Clone Repository

```bash
# Clone the repository
git clone https://github.com/SuperInstance/polln.git
cd polln

# Navigate to Cloudflare deployment directory
cd deployment/cloudflare

# Install dependencies
npm install
```

### 4. Configure Environment

```bash
# Copy configuration template
cp wrangler.example.toml wrangler.toml

# Edit wrangler.toml with your Cloudflare Account ID
# Get your Account ID from: https://dash.cloudflare.com
# Click "Workers & Pages" > "Account ID" (top right)

# Create .env file for local development
cat > .env << EOF
OPENAI_API_KEY=your-openai-api-key
SUPERINSTANCE_API_KEY=your-superinstance-api-key
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
ENVIRONMENT=development
EOF
```

### 5. Verify Setup

```bash
# Start local development server
npm run dev

# You should see:
# ⎔ Starting local server...
# ⎔ Listening on http://localhost:8787

# Test health endpoint
curl http://localhost:8787/health
# Should return: {"status":"ok","timestamp":...}
```

---

## Development Workflow

### Daily Development Flow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Start development server
npm run dev

# 4. Make changes and test
# Edit files in src/ directory

# 5. Run tests
npm test

# 6. Type check
npm run type-check

# 7. Lint code
npm run lint
npm run lint:fix  # Auto-fix issues

# 8. Format code
npm run format

# 9. Commit changes
git add .
git commit -m "feat: description of your changes"

# 10. Push and create PR
git push origin feature/your-feature-name
```

### Working with Durable Objects

```bash
# Start dev server with Durable Objects enabled
npm run dev

# Durable Objects will be available in local mode
# Test Durable Object endpoints:
curl http://localhost:8787/api/workspaces/WS_ID/realtime

# View Durable Object state
# Logs will show DO operations
```

### Database Development

```bash
# Access local D1 database
# Local database is in-memory for development

# Execute query against local database
wrangler d1 execute spreadsheetmoment-dev --local \
  --command="SELECT * FROM users LIMIT 10"

# Run migrations locally
wrangler d1 execute spreadsheetmoment-dev --local \
  --file=migrations/001_initial_schema.sql

# Query production database (for debugging)
wrangler d1 execute spreadsheetmoment-prod \
  --command="SELECT COUNT(*) FROM tensor_cells"
```

### Testing API Endpoints

```bash
# Health check
curl http://localhost:8787/health

# Create workspace (requires authentication)
curl -X POST http://localhost:8787/api/v1/workspaces \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Workspace"}'

# Get cells (requires authentication)
curl http://localhost:8787/api/v1/workspaces/WS_ID/cells

# NLP query (requires authentication)
curl -X POST http://localhost:8787/api/v1/nlp/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Show me cells with value > 40"}'
```

---

## Code Organization

### Project Structure

```
deployment/cloudflare/
├── src/
│   ├── index.ts                    # Main entry point
│   │
│   ├── workers/                    # Worker implementations
│   │   ├── api-gateway.ts          # API router & middleware
│   │   ├── cell-engine.ts          # Tensor computations
│   │   ├── nlp-worker.ts           # NLP processing
│   │   └── hardware-worker.ts      # Hardware integration
│   │
│   ├── durable-objects/            # Durable Objects
│   │   ├── workspace-coordinator.ts
│   │   ├── cell-update-manager.ts
│   │   └── collaboration-session.ts
│   │
│   ├── middleware/                 # Request processing
│   │   ├── auth.ts                 # Authentication
│   │   ├── cors.ts                 # CORS handling
│   │   └── rate-limit.ts           # Rate limiting
│   │
│   ├── routes/                     # API routes
│   │   ├── workspaces.ts
│   │   ├── cells.ts
│   │   └── nlp.ts
│   │
│   ├── services/                   # Business logic
│   │   ├── ai/
│   │   │   └── openai.ts
│   │   └── storage/
│   │       └── r2.ts
│   │
│   └── utils/                      # Utilities
│       ├── crypto.ts
│       ├── logger.ts
│       └── validators.ts
│
├── tests/                          # Tests
│   ├── unit/
│   └── integration/
│
├── scripts/                        # Utility scripts
│   └── backup.ts
│
├── migrations/                     # SQL migrations
│   └── 001_initial_schema.sql
│
├── wrangler.toml                   # Cloudflare config
├── package.json
└── tsconfig.json
```

### Creating a New Worker

```typescript
// src/workers/new-worker.ts
import { Env } from '../env'

export class NewWorker {
  constructor(private env: Env) {}

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    switch (path) {
      case '/api/v1/new-endpoint':
        return this.handleNewEndpoint(request)
      default:
        return new Response('Not Found', { status: 404 })
    }
  }

  private async handleNewEndpoint(request: Request): Promise<Response> {
    // Your logic here
    return Response.json({ message: 'Success' })
  }
}
```

### Creating a New Durable Object

```typescript
// src/durable-objects/new-object.ts
import { DurableObject } from 'cloudflare:workers'
import { Env } from '../env'

export class NewObject implements DurableObject {
  private state: DurableObjectState
  private env: Env

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    switch (path) {
      case '/connect':
        return this.handleConnect(request)
      case '/update':
        return this.handleUpdate(request)
      default:
        return new Response('Not Found', { status: 404 })
    }
  }

  private async handleConnect(request: Request): Promise<Response> {
    // Connection logic
    return new Response('Connected')
  }

  private async handleUpdate(request: Request): Promise<Response> {
    // Update logic
    // Use this.state.storage.put() to persist data
    await this.state.storage.put('key', 'value')
    return new Response('Updated')
  }
}
```

### Adding Database Queries

```typescript
// Single query
const user = await env.DB.prepare(
  'SELECT * FROM users WHERE id = ?'
).bind(userId).first()

// Multiple queries
const users = await env.DB.prepare(
  'SELECT * FROM users WHERE subscription_tier = ?'
).bind('premium').all()

// Batch queries
await env.DB.batch([
  env.DB.prepare('INSERT INTO cells ...'),
  env.DB.prepare('UPDATE workspaces ...'),
  env.DB.prepare('DELETE FROM cache ...')
])

// Transaction
await env.DB.batch([
  env.DB.prepare('BEGIN TRANSACTION'),
  env.DB.prepare('INSERT INTO cells ...'),
  env.DB.prepare('COMMIT')
])
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- cell-engine.test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

### Writing Tests

```typescript
// tests/unit/cell-engine.test.ts
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
    const cell = await engine.getCell('cell-1')
    expect(cell.temperature).toBeGreaterThan(0)
  })
})
```

### Integration Tests

```typescript
// tests/integration/workspace.test.ts
import { describe, it, expect } from 'vitest'
import { Env, populateEnv } from '@cloudflare/vitest-pool-workers'

describe('Workspace API', () => {
  it('should create workspace', async () => {
    const response = await fetch('http://localhost/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Workspace' })
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.name).toBe('Test Workspace')
  })
})
```

---

## Deployment

### Deploy to Staging

```bash
# Deploy to staging
npm run deploy:staging

# View staging logs
npm run logs:staging

# Test staging deployment
curl https://api-staging.spreadsheetmoment.com/health
```

### Deploy to Production

```bash
# Ensure tests pass first
npm test

# Deploy to production
npm run deploy:production

# View production logs
npm run logs

# Monitor production
curl https://api.spreadsheetmoment.com/health
```

### Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Migration scripts tested
- [ ] Staging deployment verified
- [ ] Rollback plan prepared
- [ ] Team notified

---

## Troubleshooting

### Common Issues

#### Issue: "Cannot find module"

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Issue: "Durable Objects not enabled"

**Solution:**
1. Go to Cloudflare Dashboard
2. Navigate to: Workers & Pages > Settings > Durable Objects
3. Enable Durable Objects (requires Workers Paid Plan)

#### Issue: "Database locked"

**Solution:**
```bash
# Check for long-running queries
wrangler d1 execute spreadsheetmoment-prod --command="
  SELECT * FROM sqlite_master WHERE sql LIKE '%TRANSACTION%';
"

# Restart worker if needed
wrangler deploy --env production
```

#### Issue: "High latency"

**Solution:**
```bash
# Check worker logs
npm run logs

# Check CPU usage
wrangler metrics --env production

# Optimize queries
# Add indexes to hot queries
CREATE INDEX idx_cells_workspace_hot ON tensor_cells(workspace_id, id);
```

### Getting Help

1. **Check logs:** `npm run logs`
2. **Check metrics:** `wrangler metrics`
3. **Read documentation:** See `IMPLEMENTATION_PLAN.md`
4. **Ask team:** Slack #cloudflare-workers
5. **Cloudflare Discord:** https://discord.gg/cloudflaredev

---

## Best Practices

### Performance

1. **Use caching** for frequently accessed data
2. **Batch operations** to reduce request count
3. **Optimize queries** with proper indexes
4. **Compress responses** before sending
5. **Use WebSocket** for real-time features

### Security

1. **Validate all inputs** before processing
2. **Encrypt sensitive data** at rest
3. **Use prepared statements** for database queries
4. **Implement rate limiting** for expensive operations
5. **Log security events** for auditing

### Code Quality

1. **Write tests** for all new features
2. **Document code** with clear comments
3. **Use TypeScript** for type safety
4. **Follow linting rules** consistently
5. **Review code** before merging

### Collaboration

1. **Use feature branches** for development
2. **Write descriptive commit messages**
3. **Create pull requests** for review
4. **Communicate changes** to team
5. **Document decisions** in README

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev              # Start local dev server
npm test                # Run tests
npm run type-check      # TypeScript type check
npm run lint            # Lint code

# Deployment
npm run deploy:staging     # Deploy to staging
npm run deploy:production  # Deploy to production

# Monitoring
npm run logs              # View production logs
npm run logs:staging      # View staging logs

# Database
npm run db:migrate        # Run migrations
npm run db:backup         # Backup database
```

### Important Files

- `wrangler.toml` - Cloudflare configuration
- `src/index.ts` - Main entry point
- `src/env.ts` - Environment interface
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

### Key URLs

- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Workers Docs:** https://developers.cloudflare.com/workers/
- **D1 Docs:** https://developers.cloudflare.com/d1/
- **Wrangler Docs:** https://developers.cloudflare.com/workers/wrangler/

---

## Next Steps

1. **Complete environment setup** (30 minutes)
2. **Read IMPLEMENTATION_PLAN.md** for full context
3. **Explore existing code** to understand patterns
4. **Set up development tools** (VS Code, extensions)
5. **Join team communication channels** (Slack, Discord)
6. **Pick up a task** from the project board
7. **Start coding!**

---

## Resources

### Internal Documentation
- `IMPLEMENTATION_PLAN.md` - Comprehensive implementation guide
- `QUICK_START.md` - Quick reference guide
- `ARCHITECTURE.md` - System architecture documentation
- `ARCHITECTURE_DIAGRAMS.md` - Visual architecture diagrams

### External Resources
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [D1 Database Guide](https://developers.cloudflare.com/d1/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

### Community
- [Cloudflare Discord](https://discord.gg/cloudflaredev)
- [Workers Subreddit](https://reddit.com/r/cloudflareworkers)
- [Stack Overflow (cloudflare-workers)](https://stackoverflow.com/questions/tagged/cloudflare-workers)

---

## Questions?

- **Technical Lead:** [Name] - [Email]
- **Cloudflare Specialist:** [Name] - [Email]
- **Team Slack:** #cloudflare-workers
- **Emergency Contacts:** See `QUICK_START.md`

---

**Welcome aboard! Let's build something amazing.** 🚀

---

**Version:** 1.0
**Last Updated:** 2026-03-14
**Status:** Ready for Onboarding
