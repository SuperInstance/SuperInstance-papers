# Production Deployment Guide - SpreadsheetMoment

**Repository:** spreadsheet-moment
**Environment:** Production
**Version:** 1.0.0
**Date:** 2026-03-16
**Status:** Production Ready

---

## Quick Start

### Prerequisites

1. **Cloudflare Account** (Free tier sufficient for initial deployment)
2. **Domain Name** (optional, can use `.workers.dev` subdomain)
3. **GitHub Repository** (for automated deployments)
4. **API Keys** (Claw API, DeepSeek, OpenAI, Anthropic - optional)

### Initial Deployment

```bash
# 1. Install dependencies
pnpm install

# 2. Build for production
pnpm build

# 3. Login to Cloudflare
npx wrangler login

# 4. Create production resources
npx wrangler kv:namespace create CELLS --env production
npx wrangler kv:namespace create CACHE --env production
npx wrangler d1 create CELLS_DB --env production

# 5. Update wrangler.production.toml with resource IDs

# 6. Set production secrets
npx wrangler secret put CLAW_API_KEY --env production
npx wrangler secret put SESSION_SECRET --env production
npx wrangler secret put ENCRYPTION_KEY --env production

# 7. Deploy to production
npx wrangler publish --env production

# 8. Verify deployment
curl https://spreadsheet-moment.com/health
```

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTS (Browsers)                        │
│                    • Spreadsheet UI                         │
│                    • Agent Visualization                    │
│                    • Real-time Updates                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓ HTTPS/WSS
┌─────────────────────────────────────────────────────────────┐
│                 CLOUDFLARE EDGE NETWORK                      │
│  • Global CDN (300+ locations)                              │
│  • DDoS Protection                                          │
│  • SSL/TLS Termination                                      │
│  • HTTP/3 Support                                           │
│  • Edge Caching                                             │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ↓                                     ↓
┌───────────────────┐              ┌──────────────────┐
│  CLOUDFLARE       │              │  CLOUDFLARE      │
│  WORKERS          │              │  PAGES           │
│  • API Routes     │              │  • Static Assets │
│  • WebSocket      │              │  • JavaScript    │
│  • Business Logic │              │  • CSS           │
│  • Auth Layer     │              │  • Images        │
└───────────────────┘              └──────────────────┘
        │                                     │
        └──────────────────┬──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ↓                  ↓                  ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  KV STORAGE  │  │  D1 DATABASE │  │  R2 STORAGE  │
│  • Cell Data │  │  • Users     │  │  • Files     │
│  • Cache     │  │  • Sessions  │  │  • Assets    │
└──────────────┘  └──────────────┘  └──────────────┘
                           │
                           ↓
                  ┌──────────────┐
                  │  CLAW API    │
                  │  • Agents    │
                  │  • ML Models │
                  │  • Compute   │
                  └──────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React + TypeScript | User interface |
| **Spreadsheet** | Univer | Spreadsheet engine |
| **Backend** | Cloudflare Workers | Serverless compute |
| **Database** | Cloudflare D1 | SQL database |
| **Storage** | Cloudflare KV | Key-value store |
| **Assets** | Cloudflare R2 | Object storage |
| **CDN** | Cloudflare CDN | Global edge network |
| **Security** | Cloudflare WAF | DDoS protection |
| **Monitoring** | Cloudflare Analytics | Observability |

---

## Deployment Procedures

### Standard Deployment

```bash
# 1. Ensure all tests pass
pnpm test

# 2. Build for production
pnpm build

# 3. Deploy to production
npx wrangler publish --env production

# 4. Verify health
curl https://spreadsheet-moment.com/health

# 5. Monitor logs
npx wrangler tail --env production
```

### Blue-Green Deployment

```bash
# 1. Deploy to green environment
npx wrangler publish --env green

# 2. Run health checks on green
curl https://green.spreadsheet-moment.com/health

# 3. Gradually shift traffic (0% → 100%)
# Use Cloudflare Traffic Manager or wrangler routes

# 4. Monitor for issues
npx wrangler tail --env green

# 5. If issues, rollback to blue
# If successful, promote green to new blue
```

### Rollback Procedure

```bash
# 1. Immediate rollback (if critical issues)
npx wrangler rollback [version] --env production

# 2. Or rollback to previous deployment
npx wrangler publish --env production --compatibility-date 2024-01-01

# 3. Verify rollback
curl https://spreadsheet-moment.com/health

# 4. Monitor logs
npx wrangler tail --env production
```

---

## Configuration

### Environment Variables

```bash
# Production Environment Variables
ENVIRONMENT=production
API_VERSION=1.0.0
LOG_LEVEL=info

# Claw API
CLAW_API_BASE_URL=https://api.clawengine.com
CLAW_API_VERSION=v1

# Feature Flags
FEATURE_WEBSOCKET=true
FEATURE_REAL_TIME_UPDATES=true
FEATURE_COLLABORATIVE_EDITING=true
FEATURE_AI_INTEGRATION=true

# Security
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100
CORS_ENABLED=true
CORS_ALLOWED_ORIGINS=https://spreadsheet-moment.com

# Cache
CACHE_ENABLED=true
CACHE_TTL_SECONDS=3600
```

### Secrets Management

```bash
# Set production secrets
npx wrangler secret put CLAW_API_KEY --env production
npx wrangler secret put DEEPSEEK_API_KEY --env production
npx wrangler secret put OPENAI_API_KEY --env production
npx wrangler secret put ANTHROPIC_API_KEY --env production
npx wrangler secret put SESSION_SECRET --env production
npx wrangler secret put ENCRYPTION_KEY --env production

# List secrets (values not shown)
npx wrangler secret list --env production

# Delete secret
npx wrangler secret delete SECRET_NAME --env production
```

---

## Monitoring

### Health Checks

```bash
# Basic health check
curl https://spreadsheet-moment.com/health

# Detailed health check
curl https://spreadsheet-moment.com/health/detailed

# Metrics endpoint
curl https://spreadsheet-moment.com/metrics
```

### Log Monitoring

```bash
# Tail logs in real-time
npx wrangler tail --env production

# Filter logs by level
npx wrangler tail --env production --format pretty | grep ERROR

# Export logs (last 1000 lines)
npx wrangler tail --env production --once | head -1000
```

### Metrics Monitoring

```bash
# View current metrics
curl https://spreadsheet-moment.com/metrics

# View specific metric
curl https://spreadsheet-moment.com/metrics?type=requests

# Historical metrics (Cloudflare Dashboard)
# https://dash.cloudflare.com/
```

---

## Troubleshooting

### Common Issues

#### 1. High Error Rate

```bash
# Check error logs
npx wrangler tail --env production | grep ERROR

# Check Claw API status
curl https://api.clawengine.com/health

# Scale up if needed
npx wrangler scales --env production
```

#### 2. High Latency

```bash
# Check latency metrics
curl https://spreadsheet-moment.com/metrics?type=latency

# Check cache hit rate
curl https://spreadsheet-moment.com/metrics?type=cache

# Clear cache if needed
npx wrangler cache purge --url=https://spreadsheet-moment.com/*
```

#### 3. WebSocket Failures

```bash
# Check WebSocket health
curl https://spreadsheet-moment.com/health/websocket

# Test WebSocket connection
wscat -c wss://spreadsheet-moment.com/ws

# Check WebSocket logs
npx wrangler tail --env production | grep websocket
```

#### 4. Database Issues

```bash
# Check database health
curl https://spreadsheet-moment.com/health/database

# Run database diagnostics
npx wrangler d1 execute CELLS_DB --env production --command="SELECT 1"

# Check database metrics
curl https://spreadsheet-moment.com/metrics?type=database
```

---

## Security

### Security Checklist

- [ ] HTTPS enforced (TLS 1.3 only)
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] CORS policy configured
- [ ] Rate limiting enabled
- [ ] Input validation enabled
- [ ] Output sanitization enabled
- [ ] Secrets rotated (90-day cycle)
- [ ] API keys secured
- [ ] DDoS protection enabled
- [ ] WAF rules configured

### Security Audit

```bash
# Run security audit
pnpm audit

# Check for vulnerabilities
npx wrangler deploy --dry-run --env production

# Review security headers
curl -I https://spreadsheet-moment.com

# Test CORS configuration
curl -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://spreadsheet-moment.com/api/test
```

---

## Performance

### Performance Optimization

```bash
# Build optimized bundle
pnpm build --production

# Analyze bundle size
pnpm build -- --report

# Run Lighthouse audit
npx lighthouse https://spreadsheet-moment.com --view

# Check Core Web Vitals
curl https://spreadsheet-moment.com/metrics?type=webvitals
```

### Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **First Contentful Paint** | < 1.5s | TBD | 🔄 |
| **Largest Contentful Paint** | < 2.5s | TBD | 🔄 |
| **First Input Delay** | < 100ms | TBD | 🔄 |
| **Cumulative Layout Shift** | < 0.1 | TBD | 🔄 |
| **Time to Interactive** | < 3.5s | TBD | 🔄 |
| **Bundle Size** | < 300KB | TBD | 🔄 |

---

## Backup & Recovery

### Backup Strategy

```bash
# Export KV namespace data
npx wrangler kv:bulk get --namespace-id=YOUR_KV_ID --prefix=cells > backup.json

# Export D1 database
npx wrangler d1 export CELLS_DB --env production > backup.sql

# Export R2 bucket
npx wrangler r2 object list SPREADSHEET_ASSETS --env production > assets.txt

# Backup all assets
npx wrangler r2 object get SPREADSHEET_ASSETS/* --env production > backup.zip
```

### Recovery Procedures

```bash
# Restore KV namespace
npx wrangler kv:bulk put --namespace-id=YOUR_KV_ID --path=backup.json

# Restore D1 database
npx wrangler d1 execute CELLS_DB --env production --file=backup.sql

# Restore R2 bucket
npx wrangler r2 object put SPREADSHEET_ASSETS --env production --file=backup.zip
```

---

## Maintenance

### Regular Maintenance Tasks

**Daily:**
- Check error rates
- Review performance metrics
- Monitor security alerts

**Weekly:**
- Review deployment logs
- Check resource usage
- Test backup recovery

**Monthly:**
- Rotate secrets
- Update dependencies
- Review and optimize queries

**Quarterly:**
- Security audit
- Performance review
- Capacity planning

---

## Support

### Emergency Contacts

| Role | Contact | Hours |
|------|---------|-------|
| On-Call Engineer | [Slack #on-call] | 24/7 |
| Engineering Lead | [email] | Business hours |
| DevOps Engineer | [Slack #devops] | 24/7 |

### Resources

- **Documentation:** https://docs.spreadsheet-moment.com
- **GitHub:** https://github.com/SuperInstance/spreadsheet-moment
- **Status Page:** https://status.spreadsheet-moment.com
- **Support:** support@spreadsheet-moment.com

---

**Production Guide Version:** 1.0.0
**Last Updated:** 2026-03-16
**Next Review:** 2026-06-16
