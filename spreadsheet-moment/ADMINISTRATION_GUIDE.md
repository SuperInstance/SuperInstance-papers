# Spreadsheet-Moment Administration Guide

**Comprehensive guide for administrators of Spreadsheet-Moment platforms**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![docs](https://img.shields.io/badge/docs-rigorous-blue)](docs/)
[![TypeScript](https://img.shields.io/badge/typescript-5.7%2B-blue)](https://www.typescriptlang.org/)

**Repository:** https://github.com/SuperInstance/spreadsheet-moment
**Last Updated:** 2026-03-18
**Version:** 0.1.0

---

## Table of Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [User Management](#user-management)
4. [Security](#security)
5. [Monitoring](#monitoring)
6. [Backup & Recovery](#backup--recovery)
7. [Performance Tuning](#performance-tuning)
8. [Troubleshooting](#troubleshooting)

---

## Installation

### System Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 8GB
- Disk: 20GB SSD
- Network: 100 Mbps

**Recommended:**
- CPU: 8+ cores
- RAM: 16GB+
- Disk: 50GB NVMe SSD
- Network: 1 Gbps

### Deployment Options

#### 1. Docker Deployment

```bash
# Pull image
docker pull superinstance/spreadsheet-moment:latest

# Run container
docker run -d \
  --name spreadsheet-moment \
  -p 8080:8080 \
  -v /var/lib/spreadsheet-moment:/data \
  -e DATABASE_URL=postgresql://user:pass@db:5432/spreadsheet \
  superinstance/spreadsheet-moment:latest
```

#### 2. Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spreadsheet-moment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spreadsheet-moment
  template:
    metadata:
      labels:
        app: spreadsheet-moment
    spec:
      containers:
      - name: app
        image: superinstance/spreadsheet-moment:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### 3. Bare Metal Deployment

```bash
# Install dependencies
apt-get update
apt-get install -y nodejs npm postgresql nginx

# Clone repository
git clone https://github.com/SuperInstance/spreadsheet-moment.git
cd spreadsheet-moment

# Install dependencies
npm install

# Build
npm run build

# Configure
cp .env.example .env
nano .env  # Edit configuration

# Run
npm run start:prod
```

---

## Configuration

### Environment Variables

**Core Configuration:**
```bash
# Server
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/spreadsheet
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Redis (for caching)
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL=3600

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=86400
SESSION_SECRET=another-secret-key

# File Storage
STORAGE_TYPE=s3  # or local
AWS_S3_BUCKET=spreadsheet-moment
AWS_REGION=us-east-1
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=/var/log/spreadsheet-moment/app.log

# Features
FEATURE_CLAW_INTEGRATION=true
FEATURE_REALTIME_COLLABORATION=true
FEATURE_EXPORT_TO_PDF=true
```

### Advanced Configuration

**Rate Limiting:**
```javascript
// config/rate-limits.js
module.exports = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
  },
  websocket: {
    maxConnections: 100,
    messagesPerSecond: 10,
  },
  export: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxConcurrent: 5,
  },
};
```

**Feature Flags:**
```javascript
// config/features.js
module.exports = {
  clawIntegration: process.env.FEATURE_CLAW_INTEGRATION === 'true',
  realtimeCollaboration: process.env.FEATURE_REALTIME_COLLABORATION === 'true',
  exportToPDF: process.env.FEATURE_EXPORT_TO_PDF === 'true',
  advancedCharts: process.env.FEATURE_ADVANCED_CHARTS === 'true',
  customFunctions: process.env.FEATURE_CUSTOM_FUNCTIONS === 'true',
};
```

---

## User Management

### User Roles

**Role Hierarchy:**
```
Owner (100%)
  ├─ Admin (80%)
  │   ├─ Editor (60%)
  │   │   └─ Viewer (20%)
  └─ Billing (70%)
```

**Permissions:**

| Permission | Owner | Admin | Editor | Viewer |
|------------|-------|-------|--------|--------|
| View sheets | ✅ | ✅ | ✅ | ✅ |
| Edit sheets | ✅ | ✅ | ✅ | ❌ |
| Share sheets | ✅ | ✅ | ✅ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ |
| Delete sheets | ✅ | ✅ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ | ❌ |
| Configure integrations | ✅ | ✅ | ❌ | ❌ |

### User Creation

**Via API:**
```bash
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "role": "editor",
    "password": "secure-password"
  }'
```

**Via Admin Panel:**
1. Navigate to /admin/users
2. Click "Add User"
3. Fill in user details
4. Select role
5. Click "Create"

### User Management Operations

**Update User:**
```bash
curl -X PATCH http://localhost:8080/api/v1/users/$USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "role": "admin",
    "status": "active"
  }'
```

**Delete User:**
```bash
curl -X DELETE http://localhost:8080/api/v1/users/$USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Reset Password:**
```bash
curl -X POST http://localhost:8080/api/v1/users/$USER_ID/reset-password \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"new_password": "temporary-password"}'
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
    expiresIn: process.env.JWT_EXPIRY || '24h',
    algorithm: 'HS256',
    issuer: 'spreadsheet-moment',
    audience: 'spreadsheet-moment-users',
  },
  session: {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict',
    },
  },
};
```

### Authorization

**Middleware:**
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }

  function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  }
}
```

### Security Headers

**Helmet Configuration:**
```javascript
// middleware/security.js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
}));
```

### Rate Limiting

**Express Rate Limit:**
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
```

---

## Monitoring

### Application Metrics

**Prometheus Metrics:**
```javascript
// monitoring/metrics.js
const promClient = require('prom-client');

// HTTP request duration
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// Active connections
const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

// Database query duration
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

module.exports = {
  httpRequestDuration,
  activeConnections,
  dbQueryDuration,
  register: promClient.register,
};
```

### Health Checks

**Health Endpoint:**
```javascript
// routes/health.js
const { Pool } = require('pg');
const redis = require('redis');

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Database check
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('SELECT 1');
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
  }

  // Redis check
  try {
    const client = redis.createClient(process.env.REDIS_URL);
    await client.ping();
    health.checks.redis = 'ok';
  } catch (error) {
    health.checks.redis = 'error';
    health.status = 'degraded';
  }

  // Disk space check
  const diskUsage = require('diskusage');
  try {
    const { available, free } = await diskUsage.check('/');
    health.checks.disk = {
      status: 'ok',
      available: `${(available / 1e9).toFixed(2)} GB`,
      free: `${(free / 1e9).toFixed(2)} GB`,
    };
  } catch (error) {
    health.checks.disk = 'error';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Logging

**Winston Configuration:**
```javascript
// logging/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'spreadsheet-moment' },
  transports: [
    new winston.transports.File({
      filename: '/var/log/spreadsheet-moment/error.log',
      level: 'error',
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10,
    }),
    new winston.transports.File({
      filename: '/var/log/spreadsheet-moment/combined.log',
      maxsize: 100 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

module.exports = logger;
```

---

## Backup & Recovery

### Database Backup

**Automated Backups:**
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/spreadsheet-moment"
DATABASE_URL="postgresql://user:pass@localhost:5432/spreadsheet"

mkdir -p $BACKUP_DIR

# Database backup
pg_dump $DATABASE_URL > $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz \
  s3://spreadsheet-moment-backups/db_$DATE.sql.gz

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

**Cron Job:**
```cron
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup.sh
```

### Restore Procedure

**From Backup:**
```bash
# Stop application
systemctl stop spreadsheet-moment

# Download backup
aws s3 cp s3://spreadsheet-moment-backups/db_20260318_020000.sql.gz .

# Decompress
gunzip db_20260318_020000.sql.gz

# Restore
psql postgresql://user:pass@localhost:5432/spreadsheet < db_20260318_020000.sql

# Restart application
systemctl start spreadsheet-moment
```

### Disaster Recovery

**Recovery Plan:**
1. **Assessment:** Determine scope of failure
2. **Restore:** Restore from latest backup
3. **Verification:** Test database integrity
4. **Service:** Restart application
5. **Monitoring:** Verify all systems operational

**RTO/RPO:**
- **Recovery Time Objective (RTO):** 4 hours
- **Recovery Point Objective (RPO):** 24 hours

---

## Performance Tuning

### Database Optimization

**Connection Pooling:**
```javascript
// config/database.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query optimization
const optimizedQuery = `
  SELECT
    s.id, s.name, s.created_at,
    COUNT(DISTINCT c.id) as cell_count
  FROM sheets s
  LEFT JOIN cells c ON c.sheet_id = s.id
  WHERE s.user_id = $1
  GROUP BY s.id
  ORDER BY s.updated_at DESC
  LIMIT 20
`;
```

### Caching Strategy

**Redis Caching:**
```javascript
// cache/redis.js
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

async function cacheGet(key) {
  const cached = await client.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function cacheSet(key, value, ttl = 3600) {
  await client.setex(key, ttl, JSON.stringify(value));
}

async function cacheInvalidate(pattern) {
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(keys);
  }
}
```

### Load Balancing

**Nginx Configuration:**
```nginx
upstream spreadsheet_backend {
    least_conn;
    server app1:8080 weight=5;
    server app2:8080 weight=5;
    server app3:8080 weight=5;
}

server {
    listen 80;
    server_name spreadsheet.example.com;

    location / {
        proxy_pass http://spreadsheet_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Troubleshooting

### Common Issues

**1. High Memory Usage:**

**Symptoms:**
- Application OOM
- Slow response times

**Diagnosis:**
```bash
# Check memory usage
free -h

# Check process memory
ps aux | grep node

# Heap snapshot
node --heap-prof app.js
```

**Solutions:**
- Increase Node.js heap size: `--max-old-space-size=4096`
- Implement proper cleanup in event handlers
- Use streaming for large file operations

**2. Slow Database Queries:**

**Diagnosis:**
```sql
-- Enable slow query log
ALTER DATABASE spreadsheet SET log_min_duration_statement = 1000;

-- Analyze query performance
EXPLAIN ANALYZE SELECT ...;
```

**Solutions:**
- Add appropriate indexes
- Rewrite queries for efficiency
- Use connection pooling
- Implement query caching

**3. WebSocket Connection Issues:**

**Diagnosis:**
```bash
# Check WebSocket connections
netstat -an | grep :8080

# Monitor WebSocket messages
wscat -c ws://localhost:8080/ws
```

**Solutions:**
- Implement heartbeat mechanism
- Use sticky sessions in load balancer
- Increase timeout values
- Implement reconnection logic

### Debugging Tools

**Node.js Inspector:**
```bash
# Enable inspector
node --inspect app.js

# Connect with Chrome DevTools
chrome://inspect
```

**Logging:**
```bash
# View application logs
tail -f /var/log/spreadsheet-moment/combined.log

# View error logs
tail -f /var/log/spreadsheet-moment/error.log

# Search logs
grep "ERROR" /var/log/spreadsheet-moment/combined.log
```

---

**Last Updated:** 2026-03-18
**Version:** 0.1.0
**Contributors:** See [CONTRIBUTORS.md](CONTRIBUTORS.md)
