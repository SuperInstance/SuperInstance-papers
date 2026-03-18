# Deployment Guide for Minimal CLAW Server

Complete guide for deploying the Minimal CLAW Server to various environments.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Deployment Options](#deployment-options)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Monitoring](#monitoring)
7. [Backup & Recovery](#backup--recovery)
8. [Maintenance](#maintenance)

---

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git installed
- At least 2GB RAM available
- 10GB disk space available

### 5-Minute Setup

```bash
# Clone the repository
git clone https://github.com/SuperInstance/minimal-claw-server.git
cd minimal-claw-server

# Copy environment template
cp .env.example .env

# Start services
docker-compose up -d

# Check health
curl http://localhost:8080/health

# View logs
docker-compose logs -f
```

That's it! Your CLAW server is now running at `http://localhost:8080`

---

## Deployment Options

### Comparison Matrix

| Option | Difficulty | Scalability | Cost | Best For |
|--------|-----------|-------------|------|----------|
| **Local Docker** | Easy | Low | Free | Development, testing |
| **Docker Compose** | Easy | Medium | Low | Small production deployments |
| **AWS ECS** | Medium | High | Low-Medium | Production, scalable |
| **AWS EC2** | Easy | Medium | Medium | Full control, simple |
| **Heroku** | Easy | Medium | Medium | Quick deployment, managed |
| **Vercel** | Medium | High | Free-Low | Serverless, global CDN |

### Recommended Setup

**For Development**: Local Docker
**For Staging**: Docker Compose on VPS
**For Production**: AWS ECS or Heroku

---

## Local Development

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# Start with admin tools
docker-compose --profile with-admin-tools up -d

# View logs
docker-compose logs -f claw-server

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Accessing Services

- **CLAW Server**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **WebSocket**: ws://localhost:8080/ws
- **Adminer** (DB UI): http://localhost:8081
- **Redis Commander**: http://localhost:8082

---

## Docker Deployment

### Build Images

```bash
# Build production image
docker build --target production -t minimal-claw-server:latest .

# Build for specific platform
docker buildx build --platform linux/amd64 --target production -t minimal-claw-server:latest .
```

### Run Container

```bash
# Run with environment variables
docker run -d \
  --name claw-server \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_PASSWORD=your-password \
  minimal-claw-server:latest

# View logs
docker logs -f claw-server

# Stop container
docker stop claw-server
```

### Docker Compose

```bash
# Start production stack
docker-compose -f docker-compose.yml up -d

# Scale services
docker-compose up -d --scale claw-server=3

# View status
docker-compose ps
```

---

## Cloud Deployment

### AWS Deployment

See [AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md) for detailed instructions.

**Quick Start (ECS)**:

```bash
# Create ECR repository
aws ecr create-repository --repository-name minimal-claw-server

# Build and push image
docker build -t minimal-claw-server .
aws ecr get-login-password | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com
docker tag minimal-claw-server:latest YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/minimal-claw-server:latest
docker push YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/minimal-claw-server:latest

# Deploy to ECS
aws ecs create-service --cluster claw-cluster --service-name claw-service --task-definition minimal-claw-server
```

### Heroku Deployment

See [HEROKU_DEPLOYMENT.md](docs/HEROKU_DEPLOYMENT.md) for detailed instructions.

**Quick Start**:

```bash
# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret

# Add addons
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini

# Deploy
git push heroku main
```

### Vercel Deployment

See [VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md) for detailed instructions.

**Quick Start**:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

---

## Monitoring

### Prometheus + Grafana Setup

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access Grafana
open http://localhost:3000

# Login (default credentials)
# Username: admin
# Password: admin
```

### Metrics Endpoint

The server exposes Prometheus metrics at `/metrics`:

```bash
curl http://localhost:8080/metrics
```

### Health Check

```bash
curl http://localhost:8080/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" },
    "agents": { "status": "ok", "count": 0 }
  }
}
```

---

## Backup & Recovery

### Automated Backups

```bash
# Run backup script
./scripts/backup.sh --all

# Schedule backups (cron)
0 2 * * * /path/to/minimal-claw-server/scripts/backup.sh --all
```

### Manual Backup

```bash
# Backup database
docker exec claw-postgres pg_dump -U clawuser clawdb > backup.sql

# Backup Redis
docker exec claw-redis redis-cli --rdb - > redis_backup.rdb

# Backup configuration
tar -czf config-backup.tar.gz .env docker-compose.yml nginx/
```

### Restore from Backup

```bash
# Use rollback script
./scripts/rollback.sh backups/db_backup_20240101_020000.sql.gz

# Manual database restore
docker exec -i claw-postgres psql -U clawuser clawdb < backup.sql

# Manual Redis restore
docker cp redis_backup.rdb claw-redis:/data/dump.rdb
docker-compose restart redis
```

---

## Maintenance

### Update Deployment

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Or use deployment script
./scripts/deploy.sh production
```

### Database Migrations

```bash
# Run migrations
docker exec claw-postgres psql -U clawuser -d clawdb -f /docker-entrypoint-initdb.d/migrations.sql

# Or use migration script
./scripts/migrate.sh up
```

### Log Management

```bash
# View logs
docker-compose logs -f claw-server

# Rotate logs
docker exec claw-server logrotate /etc/logrotate.d/claw-server

# Clear old logs
docker exec claw-server find /app/logs -name "*.log" -mtime +7 -delete
```

### Performance Tuning

**Database**:

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM agents;

-- Create indexes
CREATE INDEX idx_agents_state ON agents(state);
CREATE INDEX idx_agents_created_at ON agents(created_at);

-- Vacuum and analyze
VACUUM ANALYZE;
```

**Redis**:

```bash
# Monitor Redis
docker exec claw-redis redis-cli INFO

# Optimize memory
docker exec claw-redis redis-cli MEMORY PURGE
```

---

## Troubleshooting

### Common Issues

**Server won't start**:

```bash
# Check logs
docker-compose logs claw-server

# Check port availability
netstat -tulpn | grep 8080

# Check environment variables
docker-compose config
```

**Database connection errors**:

```bash
# Test database connection
docker exec claw-postgres pg_isready -U clawuser

# Check database logs
docker-compose logs postgres

# Verify credentials
docker-compose exec claw-server env | grep DB_
```

**High memory usage**:

```bash
# Check container stats
docker stats

# Restart services
docker-compose restart

# Clear cache
docker exec claw-redis redis-cli FLUSHALL
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more detailed troubleshooting.

---

## Security

### Production Checklist

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts
- [ ] Configure backups
- [ ] Review security headers

See [SECURITY.md](SECURITY.md) for detailed security guidelines.

---

## Scaling

### Horizontal Scaling

```bash
# Scale using Docker Compose
docker-compose up -d --scale claw-server=3

# Scale using Kubernetes
kubectl scale deployment claw-server --replicas=3

# Scale using ECS
aws ecs update-service --cluster claw-cluster --service claw-service --desired-count 3
```

### Vertical Scaling

```bash
# Upgrade instance size (AWS)
aws ecs update-service --cluster claw-cluster --service claw-service --task-definition minimal-claw-server:2

# Upgrade dyno size (Heroku)
heroku dyno:resize standard-2x

# Upgrade resources (Docker)
docker update --memory 2g --cpus 2 claw-server
```

See [SCALING.md](SCALING.md) for detailed scaling strategies.

---

## Support

- **Documentation**: https://docs.superinstance.ai
- **Issues**: https://github.com/SuperInstance/minimal-claw-server/issues
- **Discussions**: https://github.com/SuperInstance/minimal-claw-server/discussions
- **Email**: support@superinstance.ai

---

## License

MIT License - see LICENSE file for details
