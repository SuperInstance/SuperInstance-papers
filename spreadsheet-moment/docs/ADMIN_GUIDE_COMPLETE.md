# SpreadsheetMoment Administrator Guide

**Version:** 1.0.0
**Last Updated:** 2026-03-17
**Audience:** System Administrators, DevOps Engineers

---

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [User Management](#user-management)
6. [Security](#security)
7. [Monitoring](#monitoring)
8. [Backup and Recovery](#backup-and-recovery)
9. [Performance Tuning](#performance-tuning)
10. [Troubleshooting](#troubleshooting)
11. [API Management](#api-management)
12. [Maintenance](#maintenance)

---

## Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                           │
└────────────────────┬────────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼───┐      ┌─────▼─────┐     ┌────▼────┐
│  Web  │      │   API     │     │   WS    │
│ Server│      │  Server   │     │ Server  │
└───┬───┘      └─────┬─────┘     └────┬────┘
    │                │                │
    └────────────────┼────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼───┐      ┌─────▼─────┐     ┌────▼────┐
│PostgreSQL│   │   Redis   │     │  S3/    │
│Database  │   │   Cache   │     │ Storage │
└──────────┘   └───────────┘     └─────────┘
```

### Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Web Server** | Frontend application | Next.js 15, React 19 |
| **API Server** | REST API endpoints | Node.js, Express |
| **WebSocket Server** | Real-time updates | Socket.io |
| **PostgreSQL** | Primary database | PostgreSQL 15 |
| **Redis** | Caching, sessions | Redis 7 |
| **S3 Storage** | File storage | AWS S3 / MinIO |

---

## System Requirements

### Minimum Requirements

| Resource | Requirement |
|----------|-------------|
| **CPU** | 4 cores |
| **RAM** | 8 GB |
| **Storage** | 50 GB SSD |
| **Network** | 100 Mbps |

### Recommended Production

| Resource | Requirement |
|----------|-------------|
| **CPU** | 8+ cores |
| **RAM** | 16+ GB |
| **Storage** | 200+ GB SSD |
| **Network** | 1 Gbps |

### Software Requirements

- **Node.js:** 18.x or higher
- **npm/pnpm:** 8.x or higher
- **PostgreSQL:** 15.x or higher
- **Redis:** 7.x or higher
- **Docker:** 24.x (optional)

---

## Installation

### Docker Installation (Recommended)

**1. Clone Repository**

```bash
git clone https://github.com/SuperInstance/spreadsheet-moment.git
cd spreadsheet-moment
```

**2. Configure Environment**

```bash
cp .env.example .env
nano .env
```

**3. Start Services**

```bash
docker-compose up -d
```

**4. Initialize Database**

```bash
docker-compose exec api npm run db:migrate
docker-compose exec api npm run db:seed
```

### Manual Installation

**1. Install Dependencies**

```bash
# Frontend
cd website
npm install

# Backend
cd api
npm install
```

**2. Configure Environment**

```bash
# Copy example env files
cp website/.env.example website/.env.local
cp api/.env.example api/.env

# Edit configuration
nano website/.env.local
nano api/.env
```

**3. Setup Database**

```bash
cd api

# Create database
npm run db:create

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

**4. Build and Start**

```bash
# Build frontend
cd ../website
npm run build

# Start services
npm run start &  # Frontend
cd ../api && npm run start &  # API
```

### Kubernetes Deployment

**1. Create Namespace**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: spreadsheet-moment
```

**2. Deploy using Helm**

```bash
helm install spreadsheet-moment ./deployment/helm \
  --namespace spreadsheet-moment \
  --set replicaCount=3 \
  --set postgresql.enabled=true \
  --set redis.enabled=true
```

---

## Configuration

### Environment Variables

**Core Configuration:**

```bash
# Application
NODE_ENV=production
APP_URL=https://spreadsheetmoment.com
API_URL=https://api.spreadsheetmoment.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/spreadsheet_moment
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Authentication
JWT_SECRET=your-jwt-secret-min-32-characters
JWT_EXPIRY=7d
SESSION_SECRET=your-session-secret-min-32-characters

# Claw Integration
CLAW_API_URL=http://localhost:8080
CLAW_API_KEY=your-claw-api-key-min-20-chars

# WebSocket
WS_PORT=3001
WS_HEARTBEAT_INTERVAL=30000

# Storage
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=spreadsheet-moment-data

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info
```

### Feature Flags

```bash
# Enable/disable features
FEATURE_AGENTS=true
FEATURE_CLAWS=true
FEATURE_EQUIPMENT=true
FEATURE_WEBSOCKET=true
FEATURE_COLLABORATION=true
FEATURE_EXPORT=true

# Experimental features
FEATURE_ADVANCED_EQUIPMENT=false
FEATURE_ML_MODELS=false
```

### Performance Configuration

```bash
# Cache settings
CACHE_TTL=3600
CACHE_MAX_ITEMS=10000

# Rate limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=600

# Agent execution
AGENT_TIMEOUT=30000
AGENT_MAX_CONCURRENT=100
AGENT_RETRY_ATTEMPTS=3
```

---

## User Management

### Creating Users

**Via CLI:**

```bash
npm run users:create -- \
  --email admin@example.com \
  --password "SecurePassword123!" \
  --role admin \
  --name "Admin User"
```

**Via API:**

```bash
curl -X POST https://api.spreadsheetmoment.com/v1/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "role": "user",
    "name": "New User"
  }'
```

### User Roles

| Role | Permissions |
|------|-------------|
| **user** | Create/edit spreadsheets, basic features |
| **pro** | Advanced features, higher limits |
| **admin** | Full access, user management |
| **superadmin** | System configuration, all access |

### Managing Permissions

```bash
# Update user role
npm run users:update -- --email user@example.com --role pro

# Disable user
npm run users:disable -- --email user@example.com

# Enable user
npm run users:enable -- --email user@example.com

# Delete user
npm run users:delete -- --email user@example.com --confirm
```

### Bulk User Operations

```bash
# Import users from CSV
npm run users:import -- --file users.csv

# Export users
npm run users:export -- --output users-backup.json

# Batch update roles
npm run users:batch-update -- --file role-updates.csv
```

---

## Security

### Authentication

**JWT Configuration:**

```javascript
// config/auth.js
module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
    algorithm: 'HS256'
  },
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true
  }
};
```

**Multi-Factor Authentication (MFA):**

```bash
# Enable MFA globally
MFA_REQUIRED=true
MFA_ISSUER=SpreadsheetMoment

# Or per-user
npm run users:update -- --email user@example.com --mfa required
```

### API Key Management

```bash
# Generate API key
npm run apikeys:generate -- --user user@example.com --scope read_write

# List API keys
npm run apikeys:list -- --user user@example.com

# Revoke API key
npm run apikeys:revoke -- --key key_xxx
```

### Security Headers

The application sets these security headers automatically:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
```

### Audit Logging

```bash
# View audit logs
npm run audit:logs -- --tail

# Export audit logs
npm run audit:export -- --start 2026-03-01 --end 2026-03-17

# Search audit logs
npm run audit:search -- --user user@example.com --action login
```

---

## Monitoring

### Health Checks

**Application Health:**

```bash
# Check application health
curl https://api.spreadsheetmoment.com/health

# Response
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "storage": "healthy",
    "websocket": "healthy"
  }
}
```

**Database Health:**

```bash
curl https://api.spreadsheetmoment.com/health/database
```

### Metrics

**Prometheus Metrics:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'spreadsheet-moment'
    static_configs:
      - targets: ['api:9090']
```

**Key Metrics:**

- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency
- `agent_executions_total` - Agent executions
- `agent_execution_duration_seconds` - Agent execution time
- `websocket_connections_active` - Active WebSocket connections
- `database_connections_active` - Database connections

### Dashboards

**Grafana Dashboard:**

Import the provided dashboard:
```bash
grafana-dashboard-import dashboard.json
```

**Key Panels:**
- Request rate and latency
- Error rate by endpoint
- Agent execution metrics
- Database performance
- Memory and CPU usage

### Alerts

**Alert Rules:**

```yaml
# alerts.yml
groups:
  - name: spreadsheet-moment
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: AgentExecutionSlow
        expr: histogram_quantile(0.95, agent_execution_duration_seconds) > 10
        for: 5m
        annotations:
          summary: "Agent execution is slow"

      - alert: DatabaseConnectionsExhausted
        expr: database_connections_active / database_connections_max > 0.9
        for: 2m
        annotations:
          summary: "Database connections near limit"
```

---

## Backup and Recovery

### Database Backup

**Automated Backups:**

```bash
# Daily backup cron
0 2 * * * /usr/local/bin/backup-spreadsheet-moment.sh
```

**Manual Backup:**

```bash
# Full backup
pg_dump -U postgres spreadsheet_moment > backup-$(date +%Y%m%d).sql

# Compressed backup
pg_dump -U postgres spreadsheet_moment | gzip > backup-$(date +%Y%m%d).sql.gz
```

**Backup Script:**

```bash
#!/bin/bash
# backup-spreadsheet-moment.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/spreadsheet-moment"
S3_BUCKET="s3://your-backup-bucket"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U postgres spreadsheet_moment | gzip > $BACKUP_DIR/db-$DATE.sql.gz

# Redis backup
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis-$DATE.rdb

# Upload to S3
aws s3 sync $BACKUP_DIR $S3_BUCKET/backups/$DATE/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete
```

### Recovery

**Database Recovery:**

```bash
# Stop services
systemctl stop spreadsheet-moment-api

# Restore database
gunzip -c backup-20260317.sql.gz | psql -U postgres spreadsheet_moment

# Start services
systemctl start spreadsheet-moment-api
```

**Disaster Recovery:**

```bash
# Full recovery from S3
aws s3 sync s3://your-backup-bucket/backups/20260317 /tmp/restore/

# Restore database
gunzip -c /tmp/restore/db-20260317.sql.gz | psql -U postgres spreadsheet_moment

# Restore Redis
cp /tmp/restore/redis-20260317.rdb /var/lib/redis/dump.rdb
systemctl restart redis
```

---

## Performance Tuning

### Database Optimization

**PostgreSQL Configuration:**

```sql
-- postgresql.conf
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
```

**Index Optimization:**

```sql
-- Add indexes for common queries
CREATE INDEX idx_spreadsheets_user_id ON spreadsheets(user_id);
CREATE INDEX idx_agents_spreadsheet_id ON agents(spreadsheet_id);
CREATE INDEX idx_agents_state ON agents(state);
CREATE INDEX idx_executions_agent_id ON executions(agent_id, created_at);
```

### Redis Optimization

```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Node.js Optimization

```javascript
// Cluster mode
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Start server
  require('./server');
}
```

### Caching Strategy

```javascript
// Cache frequently accessed data
const cacheStrategy = {
  spreadsheets: { ttl: 3600, maxSize: 1000 },
  agents: { ttl: 300, maxSize: 5000 },
  cells: { ttl: 60, maxSize: 10000 },
  users: { ttl: 1800, maxSize: 1000 }
};
```

---

## Troubleshooting

### Common Issues

**Database Connection Issues:**

```bash
# Check connection
psql -U postgres -h localhost -d spreadsheet_moment

# Check pool
SELECT count(*) FROM pg_stat_activity WHERE datname = 'spreadsheet_moment';

# Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'spreadsheet_moment'
  AND state = 'idle'
  AND query_start < NOW() - INTERVAL '10 minutes';
```

**Redis Connection Issues:**

```bash
# Check Redis
redis-cli ping

# Monitor commands
redis-cli monitor

# Check memory
redis-cli info memory
```

**WebSocket Issues:**

```bash
# Check WebSocket server
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" \
  https://api.spreadsheetmoment.com/ws
```

**Performance Issues:**

```bash
# Profile Node.js
node --prof server.js
node --prof-process isolate-*.log > profile.txt

# Check memory
node --inspect server.js
# Open chrome://inspect
```

### Log Analysis

```bash
# View recent errors
grep "ERROR" /var/log/spreadsheet-moment/app.log | tail -100

# Count errors by type
grep "ERROR" /var/log/spreadsheet-moment/app.log | \
  awk '{print $5}' | sort | uniq -c | sort -rn

# Monitor logs in real-time
tail -f /var/log/spreadsheet-moment/app.log | grep --color "ERROR\|WARN"
```

---

## API Management

### Rate Limiting

```javascript
// Configure rate limits
const rateLimits = {
  global: {
    windowMs: 60 * 1000,
    max: 600
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 10
  },
  api: {
    windowMs: 60 * 1000,
    max: 100
  }
};
```

### API Versioning

```
/v1/spreadsheets  - Current version
/v2/spreadsheets  - Next version (beta)
```

### API Deprecation

```javascript
// Add deprecation header
app.use('/v1/old-endpoint', (req, res, next) => {
  res.setHeader('X-API-Deprecated', 'true');
  res.setHeader('X-API-Sunset', '2026-06-01');
  res.setHeader('Link', '</v2/new-endpoint>; rel="successor-version"');
  next();
});
```

---

## Maintenance

### Regular Maintenance Tasks

**Daily:**
- Check health endpoints
- Monitor error rates
- Review audit logs

**Weekly:**
- Database vacuum
- Log rotation
- Security updates check

**Monthly:**
- Full backup verification
- Performance review
- Security audit

### Updates

**Application Update:**

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Rebuild
npm run build

# Restart services
systemctl restart spreadsheet-moment-api
systemctl restart spreadsheet-moment-web
```

**Security Updates:**

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### Scaling

**Horizontal Scaling:**

```bash
# Add more API servers
kubectl scale deployment spreadsheet-moment-api --replicas=5

# Add more WebSocket servers
kubectl scale deployment spreadsheet-moment-ws --replicas=3
```

**Vertical Scaling:**

```yaml
# Increase resources
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

---

## Support

### Contact Support

- **Email:** admin-support@spreadsheetmoment.com
- **Slack:** #spreadsheet-moment-admin
- **Emergency:** +1-XXX-XXX-XXXX

### Documentation

- **Admin Docs:** https://docs.spreadsheetmoment.com/admin
- **API Docs:** https://docs.spreadsheetmoment.com/api
- **Runbooks:** https://docs.spreadsheetmoment.com/runbooks

---

**Document Version:** 1.0.0
**Last Updated:** March 17, 2026
**Next Review:** June 17, 2026
