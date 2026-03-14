# Cloudflare Quick Start Guide - SpreadsheetMoment
**Rapid Implementation Checklist for Round 2**
**Last Updated:** 2026-03-14

---

## 30-Minute Setup Checklist

### Prerequisites (5 min)
```bash
# 1. Install Node.js 18+
node --version  # Must be v18+

# 2. Install Wrangler CLI
npm install -g wrangler

# 3. Login to Cloudflare
wrangler login

# 4. Verify installation
wrangler whoami
```

### Account Setup (10 min)
```bash
# 1. Get your Account ID from:
# https://dash.cloudflare.com -> Workers & Pages -> Account ID

# 2. Upgrade to Workers Paid Plan ($5/mo)
# Required for Durable Objects
# https://dash.cloudflare.com/[account-id]/workers/plans

# 3. Record your details:
Account ID: ___________________
Email: ___________________
```

### Resource Creation (10 min)
```bash
# 1. Create D1 Database
wrangler d1 create spreadsheetmoment-prod
# Save the database_id: ___________________

# 2. Create R2 Bucket
wrangler r2 bucket create spreadsheetmoment-prod

# 3. Create KV Namespace
wrangler kv:namespace create "KV" --preview=false
# Save the namespace ID: ___________________

# 4. Create Vectorize Index
wrangler vectorize create spreadsheetmoment-cells \
  --dimensions=1536 \
  --metric=cosine
```

### Configuration (5 min)
```bash
# 1. Copy template
cp deployment/cloudflare/wrangler.example.toml wrangler.toml

# 2. Edit wrangler.toml with your IDs
account_id = "your-account-id"
database_id = "your-database-id"
kv_id = "your-kv-id"

# 3. Set secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
```

---

## Daily Development Commands

### Local Development
```bash
# Start local dev server
cd deployment/cloudflare
npm run dev

# Start with remote backend
npm run dev:remote

# Run tests
npm test

# Type check
npm run type-check

# Lint code
npm run lint
```

### Deployment Commands
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# View logs
npm run logs

# View staging logs
npm run logs:staging
```

### Database Commands
```bash
# Run migrations
npm run db:migrate

# Backup database
npm run db:backup

# Execute query
wrangler d1 execute spreadsheetmoment-prod \
  --command="SELECT * FROM users LIMIT 10"
```

---

## One-Week Sprint Plan

### Day 1: Setup
- [ ] Complete 30-minute setup
- [ ] Configure domain DNS
- [ ] Set up OAuth providers
- [ ] Test local development

### Day 2: Core Workers
- [ ] Implement API Gateway
- [ ] Implement Cell Engine
- [ ] Implement NLP Worker
- [ ] Write unit tests

### Day 3: Durable Objects
- [ ] Implement Workspace Coordinator
- [ ] Implement Cell Update Manager
- [ ] Implement Collaboration Session
- [ ] Test real-time features

### Day 4: Integration
- [ ] Connect all workers
- [ ] Implement authentication
- [ ] Set up middleware
- [ ] Write integration tests

### Day 5: Deploy & Test
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Fix critical bugs
- [ ] Deploy to production

---

## Cost Quick Reference

### Development Phase
- **Total:** ~$8/month
- Workers: $5 (base fee)
- D1: $2 (1GB storage)
- R2: $0.50 (10GB storage)
- Other: $0.50

### Production Phase (100K users)
- **Total:** ~$100/month
- Workers: $25 (10M requests)
- D1: $37.50 (50M rows)
- R2: $22.50 (500GB storage)
- DO: $15 (5M requests)

### Scale Phase (1M users)
- **Total:** ~$1,285/month
- Workers: $500 (100M requests)
- D1: $375 (500M rows)
- R2: $225 (5TB storage)
- DO: $150 (50M requests)

---

## Troubleshooting Quick Fixes

### Issue: "Durable Objects not enabled"
```bash
# Solution: Enable in dashboard
# Navigate to: Workers & Pages > Settings > Durable Objects
# Requires Workers Paid plan ($5/month)
```

### Issue: "Database locked"
```bash
# Check for long-running queries
wrangler d1 execute spreadsheetmoment-prod --command="
  SELECT * FROM sqlite_master WHERE sql LIKE '%TRANSACTION%';
"
```

### Issue: "High latency"
```bash
# Check Worker logs
wrangler tail --env production

# Check CPU usage
wrangler metrics --env production
```

### Issue: "Deployment failed"
```bash
# Check wrangler.toml syntax
wrangler deploy --dry-run

# Verify all resources exist
wrangler d1 list
wrangler r2 bucket list
wrangler kv:namespace list
```

---

## Essential URLs

### Cloudflare Dashboard
- **Main:** https://dash.cloudflare.com
- **Workers:** https://dash.cloudflare.com/[account-id]/workers
- **D1:** https://dash.cloudflare.com/[account-id]/workers/d1
- **R2:** https://dash.cloudflare.com/[account-id]/r2
- **Analytics:** https://dash.cloudflare.com/[account-id]/analytics

### External Services
- **OpenAI:** https://platform.openai.com/api-keys
- **Google OAuth:** https://console.cloud.google.com/
- **GitHub OAuth:** https://github.com/settings/developers

### Documentation
- **Workers Docs:** https://developers.cloudflare.com/workers/
- **D1 Docs:** https://developers.cloudflare.com/d1/
- **DO Docs:** https://developers.cloudflare.com/durable-objects/
- **Wrangler:** https://developers.cloudflare.com/workers/wrangler/

---

## Emergency Rollback Procedure

### If Deployment Fails
```bash
# 1. Rollback to previous version
wrangler rollback --env production

# 2. Or deploy specific version
wrangler deploy --env production --version PREVIOUS_VERSION_ID

# 3. Verify rollback
curl https://api.spreadsheetmoment.com/health
```

### Database Rollback
```bash
# List backups
wrangler d1 backups list spreadsheetmoment-prod

# Restore from backup
wrangler d1 backups restore spreadsheetmoment-prod BACKUP_ID
```

---

## Monitoring Dashboard Metrics

### Key Metrics to Watch
- **Error Rate:** Should be < 1%
- **P95 Latency:** Should be < 100ms
- **CPU Usage:** Should be < 80%
- **Request Count:** Track for capacity planning
- **Daily Cost:** Monitor for budget alerts

### Alert Thresholds
| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 1% | > 5% |
| P95 Latency | > 500ms | > 1000ms |
| CPU Usage | > 70% | > 80% |
| Daily Cost | > $50 | > $100 |

---

## Team Contact List

### Primary Contacts
- **Cloudflare Lead:** [Name] - [Email] - [Slack]
- **Backend Lead:** [Name] - [Email] - [Slack]
- **DevOps Lead:** [Name] - [Email] - [Slack]

### On-Call Rotation
- **Week 1:** [Name] - [Phone]
- **Week 2:** [Name] - [Phone]
- **Week 3:** [Name] - [Phone]

---

## Quick Code Snippets

### Add New API Endpoint
```typescript
// src/routes/new-endpoint.ts
import { Router } from 'itty-router'

const router = Router()

router.get('/api/v1/new-endpoint', async (request, env) => {
  const data = await env.DB.prepare('SELECT * FROM table').all()
  return Response.json(data)
})

export default router
```

### Add New Durable Object
```typescript
// src/durable-objects/new-object.ts
export class NewObject implements DurableObject {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    return new Response('OK')
  }
}
```

### Add Database Query
```typescript
// Prepared statement
const stmt = env.DB.prepare('SELECT * FROM cells WHERE workspace_id = ?')
const result = await stmt.bind(workspaceId).all()

// Batch query
await env.DB.batch([
  env.DB.prepare('INSERT INTO cells ...'),
  env.DB.prepare('INSERT INTO cells ...')
])
```

---

## Success Criteria

### Round 2 Goals
- [ ] API Gateway deployed and functional
- [ ] Real-time collaboration working via Durable Objects
- [ ] NLP queries operational with OpenAI
- [ ] Database migrations applied
- [ ] CI/CD pipeline active
- [ ] Monitoring and alerting configured
- [ ] Costs under $150/month
- [ ] Documentation complete

### Ready for Round 3 When:
- All Round 2 goals achieved
- System stable for 1 week
- User acceptance testing passed
- Performance benchmarks met
- Security review completed

---

**Version:** 1.0
**Last Updated:** 2026-03-14
**Status:** Ready for Round 2 Implementation
