# SpreadsheetMoment - Quick Reference Guide

**For Developers and Operators**

---

## Common Commands

### Development

```bash
# Start local development server
npm run dev

# Run tests
npm test                          # Unit tests
npm run test:integration          # Integration tests
npm run test:e2e                  # E2E tests
npm run test:coverage             # Coverage report

# Code quality
npm run lint                      # Check code style
npm run lint:fix                  # Fix linting issues
npm run type-check                # TypeScript type check
npm run format                    # Format code

# Build
npm run build                     # Build for production
```

### Deployment

```bash
# Deploy to environments
npm run deploy:staging            # Deploy to staging
npm run deploy:production         # Deploy to production

# Monitor logs
npm run tail                      # Tail local logs
npm run tail:staging              # Tail staging logs
npm run tail:production           # Tail production logs

# Database operations
npm run db:migrate                # Run migrations (production)
npm run db:migrate:staging        # Run migrations (staging)
npm run db:backup                 # Backup database
npm run db:restore                # Restore from backup

# Metrics
npm run metrics                   # View metrics
npm run cost                      # View cost breakdown
```

### Wrangler CLI

```bash
# Authentication
wrangler login                    # Login to Cloudflare
wrangler logout                   # Logout
wrangler whoami                   # Show current user

# Workers
wrangler deploy                   # Deploy to production
wrangler deploy --env staging     # Deploy to staging
wrangler rollback                 # Rollback to previous version
wrangler deployments list         # List deployments

# D1 Database
wrangler d1 create <name>         # Create database
wrangler d1 list                  # List databases
wrangler d1 execute <db> --command="<SQL>"
wrangler d1 backups create <db>   # Create backup
wrangler d1 backups list <db>     # List backups

# R2 Storage
wrangler r2 bucket create <name>  # Create bucket
wrangler r2 bucket list           # List buckets
wrangler r2 object put <bucket> <key> <file>
wrangler r2 object get <bucket> <key>

# KV Namespace
wrangler kv:namespace create <name> --preview=false
wrangler kv:key list --namespace-id=<id>
wrangler kv:key get --namespace-id=<id> <key>

# Durable Objects
wrangler durable-objects          # List objects
wrangler tail                     # Tail object logs
```

---

## Environment Variables

### Required

```bash
# Cloudflare
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_API_TOKEN="your-api-token"

# AI/ML
OPENAI_API_KEY="sk-..."

# Authentication
JWT_SECRET="your-jwt-secret"
ENCRYPTION_KEY="your-encryption-key"

# OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### Optional

```bash
# SuperInstance
SUPERINSTANCE_API_KEY="your-superinstance-key"
SUPERINSTANCE_ENDPOINT="https://api.superinstance.io"

# Monitoring
SLACK_WEBHOOK="https://hooks.slack.com/..."
PAGERDUTY_KEY="your-pagerduty-key"

# Feature Flags
ENABLE_HARDWARE=true
ENABLE_NLP=true
ENABLE_3D_PRINTING=true
```

---

## API Endpoints

### Authentication

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/profile
POST   /api/v1/auth/token
```

### Workspaces

```
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/:id
PATCH  /api/v1/workspaces/:id
DELETE /api/v1/workspaces/:id
GET    /api/v1/workspaces/:id/collaborators
```

### Cells

```
GET    /api/v1/workspaces/:id/cells
POST   /api/v1/workspaces/:id/cells
GET    /api/v1/workspaces/:id/cells/:cellId
PATCH  /api/v1/workspaces/:id/cells/:cellId
DELETE /api/v1/workspaces/:id/cells/:cellId
```

### Tensor Operations

```
POST   /api/v1/workspaces/:id/tensor/transform
POST   /api/v1/workspaces/:id/tensor/query
GET    /api/v1/workspaces/:id/tensor/dimensions
```

### NLP

```
POST   /api/v1/nlp/query
POST   /api/v1/nlp/what-if
POST   /api/v1/nlp/generate-ui
```

### Hardware

```
POST   /api/v1/hardware/connect
GET    /api/v1/hardware/:id/status
POST   /api/v1/hardware/:id/disconnect
```

### Health

```
GET    /health
GET    /health/db
GET    /health/storage
GET    /health/objects
GET    /health/vectors
```

---

## Database Schema (Quick Reference)

### Key Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, email, subscription_tier |
| `workspaces` | Spreadsheet workspaces | id, owner_id, name |
| `tensor_cells` | Multi-dimensional cells | id, workspace_id, value, temperature |
| `vector_connections` | Cell relationships | source_cell_id, target_cell_id, strength |
| `dashboard_pages` | UI views | workspace_id, page_type, layout_config |
| `nlp_queries` | Query history | user_id, query, result |
| `hardware_connections` | Device connections | device_type, endpoint_url, status |
| `what_if_scenarios` | Scenarios | base_state, modifications, results |

### Common Queries

```sql
-- Get hot cells in workspace
SELECT * FROM tensor_cells
WHERE workspace_id = ? AND temperature > 0.7
ORDER BY temperature DESC, updated_at DESC
LIMIT 50;

-- Get user's workspaces
SELECT w.*, u.display_name as owner_name
FROM workspaces w
JOIN users u ON w.owner_id = u.id
WHERE w.id IN (
  SELECT workspace_id FROM workspace_collaborators WHERE user_id = ?
)
ORDER BY w.updated_at DESC;

-- Search cells by tags
SELECT * FROM tensor_cells
WHERE workspace_id = ?
AND ',' || tags || ',' LIKE '%,' || ? || ',%'
ORDER BY name;

-- Get active hardware connections
SELECT * FROM hardware_connections
WHERE workspace_id = ? AND status = 'online'
AND datetime(last_heartbeat) > datetime('now', '-60 seconds');

-- Recent NLP queries by user
SELECT * FROM nlp_queries
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 20;
```

---

## Troubleshooting

### Quick Fixes

**Worker won't start:**
```bash
# Check syntax
npm run type-check

# Check Wrangler auth
wrangler whoami

# View logs
wrangler tail --format pretty
```

**Database errors:**
```bash
# Check database exists
wrangler d1 list

# Verify schema
wrangler d1 execute <db> --command="SELECT name FROM sqlite_master WHERE type='table';"

# Check backup status
wrangler d1 backups list <db>
```

**High latency:**
```bash
# Check CPU time
wrangler metrics

# View slow queries
# Check database indexes

# Enable caching
# Review KV hit rate
```

**Hardware connection failed:**
```bash
# Check USB permissions
ls -la /dev/ttyUSB*

# Test serial connection
screen /dev/ttyUSB0 115200

# Check device status
curl http://localhost:9000/api/hardware/status
```

### Performance Tips

1. **Enable caching** for frequently accessed data
2. **Use batch operations** instead of individual requests
3. **Optimize database queries** with proper indexes
4. **Compress large payloads** before transmission
5. **Use WebSockets** for real-time updates
6. **Implement request deduplication**
7. **Archive old data** to cold storage

---

## Monitoring Dashboards

### Key Metrics

**Request Metrics:**
- Request rate (req/s)
- P50, P95, P99 latency
- Error rate (%)
- Success rate (%)

**Database Metrics:**
- Query latency (ms)
- Rows read/sec
- Storage used (GB)
- Cache hit rate (%)

**Durable Objects:**
- Active objects
- Messages sent/sec
- Storage used (GB)
- Memory usage (MB)

**Business Metrics:**
- Active users
- Cells created
- NLP queries
- Hardware connections
- What-if scenarios

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | 1% | 5% |
| P95 latency | 500ms | 1000ms |
| CPU usage | 70% | 90% |
| Memory usage | 80% | 95% |
| Queue depth | 1000 | 5000 |

---

## File Locations

### Configuration
```
wrangler.toml                  # Worker configuration
package.json                   # Dependencies and scripts
tsconfig.json                  # TypeScript config
.env                           # Environment variables (local)
```

### Source Code
```
src/
├── index.ts                   # Entry point
├── workers/                   # Worker implementations
│   ├── api-gateway.ts
│   ├── cell-engine.ts
│   ├── nlp-worker.ts
│   └── ...
├── services/                  # Business logic
│   ├── tensor/
│   ├── nlp/
│   └── hardware/
├── middleware/                # Request middleware
│   ├── auth.ts
│   ├── rate-limit.ts
│   └── ...
└── utils/                     # Utilities
    ├── crypto.ts
    ├── metrics.ts
    └── ...
```

### Tests
```
tests/
├── unit/                      # Unit tests
├── integration/               # Integration tests
├── e2e/                       # E2E tests
└── performance/               # Load tests
```

### Deployment
```
deployment/cloudflare/
├── migrations/                # Database migrations
├── scripts/                   # Deployment scripts
└── monitoring/                # Dashboards and alerts
```

---

## Git Workflow

### Branch Strategy
```
main          → Production
staging       → Staging environment
feature/*     → New features
bugfix/*      → Bug fixes
hotfix/*      → Emergency fixes
```

### Commit Standards
```
feat: add tensor cell temperature propagation
fix: resolve WebSocket connection timeout
docs: update deployment guide
test: add integration tests for NLP
refactor: optimize database queries
chore: update dependencies
```

### Deployment Flow
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR
git push origin feature/new-feature

# 4. After review, merge to staging
git checkout staging
git merge feature/new-feature

# 5. Deploy to staging
npm run deploy:staging

# 6. Test on staging

# 7. Merge to main and deploy production
git checkout main
git merge staging
npm run deploy:production
```

---

## Cost Optimization Checklist

- [ ] Enable KV caching for hot data
- [ ] Batch database operations
- [ ] Use CDN for static assets
- [ ] Implement request deduplication
- [ ] Compress large payloads
- [ ] Archive old data to cold storage
- [ ] Optimize database indexes
- [ ] Use read replicas for analytics
- [ ] Monitor and optimize cold starts
- [ ] Review and delete unused resources

---

## Security Checklist

### Deployment
- [ ] Enable Cloudflare Access
- [ ] Configure OAuth providers
- [ ] Set up rate limiting
- [ ] Enable WAF rules
- [ ] Configure SSL/TLS
- [ ] Set up CSP headers
- [ ] Enable HSTS

### Data Protection
- [ ] Encrypt sensitive data at rest
- [ ] Use TLS 1.3 for transit
- [ ] Implement API key rotation
- [ ] Enable audit logging
- [ ] Set up backup encryption
- [ ] Configure data retention policies

### Access Control
- [ ] Implement RBAC
- [ ] Use least privilege principle
- [ ] Enable MFA for admin accounts
- [ ] Regular access reviews
- [ ] Monitor for suspicious activity

---

## Emergency Procedures

### Rollback Deployment
```bash
# Automatic rollback (via CI/CD)
# Manual rollback
wrangler rollback --env production

# Verify
curl https://api.spreadsheetmoment.com/health
```

### Restore Database
```bash
# List backups
wrangler d1 backups list spreadsheetmoment-prod

# Restore from backup
wrangler d1 backups restore spreadsheetmoment-prod <backup-id>
```

### Scale Up (High Traffic)
```bash
# Workers auto-scale, but you can:
# 1. Enable caching
# 2) Use queue for async operations
# 3) Implement rate limiting
# 4) Add read replicas
```

---

## Useful Links

- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **Wrangler Docs:** https://developers.cloudflare.com/workers/wrangler/
- **D1 Database:** https://developers.cloudflare.com/d1/
- **Durable Objects:** https://developers.cloudflare.com/durable-objects/
- **Vectorize:** https://developers.cloudflare.com/vectorize/
- **R2 Storage:** https://developers.cloudflare.com/r2/

---

## Support Contacts

- **Infrastructure:** infrastructure@spreadsheetmoment.com
- **Security:** security@spreadsheetmoment.com
- **On-Call:** +1 (555) 123-4567
- **Slack:** #spreadsheetmoment-ops

---

**Last Updated:** 2026-03-14
**Version:** 1.0
