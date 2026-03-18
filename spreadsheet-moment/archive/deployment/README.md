# Spreadsheet Moment - Staging Deployment Guide

**Environment:** Staging
**Last Updated:** 2026-03-16
**Status:** Production-Ready Infrastructure

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Deployment Methods](#deployment-methods)
5. [Monitoring & Observability](#monitoring--observability)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Overview

The staging environment provides a production-like testing ground for Spreadsheet Moment. It includes:

- **Infrastructure**: AWS EKS, RDS PostgreSQL, ElastiCache Redis
- **Container Orchestration**: Docker Compose (local) / Kubernetes (cloud)
- **Monitoring**: Prometheus, Grafana, Jaeger, Loki
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Load Balancing**: NGINX Ingress Controller
- **SSL/TLS**: Cert-Manager with Let's Encrypt

**Staging URL:** https://staging.spreadsheet-moment.superinstance.ai

---

## Prerequisites

### Required Tools

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **kubectl**: 1.28+ (for Kubernetes deployment)
- **terraform**: 1.0+ (for infrastructure provisioning)
- **awscli**: 2.0+ (for AWS management)
- **pnpm**: 8.0+ (for package management)

### Required Accounts

- **GitHub**: Repository access
- **AWS**: EC2, EKS, RDS, ElastiCache permissions
- **Cloudflare**: DNS management (optional)

### Environment Setup

```bash
# Clone repository
git clone https://github.com/SuperInstance/spreadsheet-moment.git
cd spreadsheet-moment

# Install dependencies
pnpm install

# Copy environment template
cp deployment/staging/.env.staging.template deployment/staging/.env.staging

# Edit environment variables
nano deployment/staging/.env.staging
```

---

## Quick Start

### Local Staging (Docker Compose)

**Fastest way to test staging locally:**

```bash
# Build and start all services
cd deployment/staging
docker-compose -f docker-compose.staging.yml up -d

# View logs
docker-compose -f docker-compose.staging.yml logs -f

# Stop services
docker-compose -f docker-compose.staging.yml down
```

**Access Points:**
- Application: http://localhost:3000
- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686

### Cloud Staging (Kubernetes)

**For cloud deployment:**

```bash
# 1. Provision infrastructure with Terraform
cd deployment/staging/terraform
terraform init
terraform plan
terraform apply

# 2. Configure kubectl
aws eks update-kubeconfig --name spreadsheet-moment-staging --region us-east-1

# 3. Deploy application
kubectl apply -f ../kubernetes/deployment.yaml

# 4. Verify deployment
kubectl get pods -n staging
kubectl get services -n staging
```

---

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

**Using deployment scripts:**

```bash
# Linux/Mac
./deployment/staging/scripts/deploy.sh

# Windows PowerShell
.\deployment\staging\scripts\deploy.ps1

# With options
./deployment/staging/scripts/deploy.sh --skip-tests --dry-run
```

**Features:**
- ✅ Automated testing
- ✅ Docker image building
- ✅ Health check validation
- ✅ Smoke tests
- ✅ Rollback capability
- ✅ Notification sending

### Method 2: GitHub Actions CI/CD

**Automated deployment on push to `develop` branch:**

```yaml
# .github/workflows/deploy-staging.yml automatically:
# 1. Runs all tests
# 2. Scans for security vulnerabilities
# 3. Builds Docker image
# 4. Deploys to Kubernetes
# 5. Runs smoke tests
# 6. Sends notifications
```

**Manual trigger:**
1. Go to Actions tab in GitHub
2. Select "Deploy to Staging" workflow
3. Click "Run workflow"
4. Choose options (staging, staging-rollback, skip tests)

### Method 3: Manual Deployment

**Step-by-step manual deployment:**

```bash
# 1. Build Docker image
docker build -f deployment/staging/Dockerfile -t spreadsheet-moment:staging .

# 2. Run tests
pnpm test
pnpm test:integration

# 3. Deploy to Docker Compose
docker-compose -f deployment/staging/docker-compose.staging.yml up -d

# OR Deploy to Kubernetes
kubectl set image deployment/spreadsheet-moment \
  spreadsheet-moment=spreadsheet-moment:staging \
  -n staging

# 4. Wait for rollout
kubectl rollout status deployment/spreadsheet-moment -n staging

# 5. Verify health
curl https://staging.spreadsheet-moment.superinstance.ai/health
```

---

## Monitoring & Observability

### Metrics Collection

**Prometheus Metrics:**

```
# Application Metrics
- spreadsheet_moment_uptime_seconds
- spreadsheet_moment_memory_bytes
- spreadsheet_moment_cpu_usage_total
- spreadsheet_moment_active_connections

# HTTP Metrics
- http_requests_total{method, status}
- http_request_duration_seconds{path}
- http_response_size_bytes

# Business Metrics
- agent_active_count
- agent_creations_total
- websocket_connections_current
```

**Access Prometheus:** http://localhost:9090

### Visualization

**Grafana Dashboards:**

1. **Application Dashboard**
   - Request rate & latency
   - Error rate
   - Active agents
   - WebSocket connections

2. **Infrastructure Dashboard**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network I/O

3. **Database Dashboard**
   - Connection pool
   - Query performance
   - Replication lag
   - Slow queries

**Access Grafana:** http://localhost:3000 (admin/admin)

### Logging

**Log Aggregation with Loki:**

```bash
# View logs
docker-compose -f deployment/staging/docker-compose.staging.yml logs -f app

# View specific service logs
docker-compose -f deployment/staging/docker-compose.staging.yml logs -f prometheus
docker-compose -f deployment/staging/docker-compose.staging.yml logs -f grafana

# Tail logs in Kubernetes
kubectl logs -f deployment/spreadsheet-moment -n staging
```

**Log Levels:**
- `error`: Application errors
- `warn`: Warning messages
- `info`: Informational messages
- `debug`: Debug messages (staging only)

### Distributed Tracing

**Jaeger Tracing:**

**Access Jaeger:** http://localhost:16686

**Trace Key Operations:**
- HTTP requests
- Database queries
- Claw API calls
- WebSocket connections

---

## Rollback Procedures

### Automated Rollback

**Using deployment script:**

```bash
# Rollback to previous version
./deployment/staging/scripts/deploy.sh --rollback

# PowerShell
.\deployment\staging\scripts\deploy.ps1 -Rollback
```

### Manual Rollback

**Docker Compose:**

```bash
# Stop current deployment
docker-compose -f deployment/staging/docker-compose.staging.yml down

# Pull previous image
docker pull spreadsheet-moment:staging-previous

# Start previous version
docker-compose -f deployment/staging/docker-compose.staging.yml up -d
```

**Kubernetes:**

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/spreadsheet-moment -n staging

# View rollout status
kubectl rollout status deployment/spreadsheet-moment -n staging

# View rollout history
kubectl rollout history deployment/spreadsheet-moment -n staging

# Rollback to specific revision
kubectl rollout undo deployment/spreadsheet-moment --to-revision=2 -n staging
```

### Rollback Verification

```bash
# Check deployment health
kubectl get pods -n staging

# Verify application health
curl https://staging.spreadsheet-moment.superinstance.ai/health

# Run smoke tests
pnpm test:e2e --env=staging
```

---

## Troubleshooting

### Common Issues

#### Issue: Pods Not Starting

**Symptoms:**
- Pods stuck in `Pending` state
- Pods stuck in `CrashLoopBackOff` state

**Solutions:**

```bash
# Check pod status
kubectl get pods -n staging

# Describe pod for details
kubectl describe pod <pod-name> -n staging

# View pod logs
kubectl logs <pod-name> -n staging

# Common causes:
# 1. Insufficient resources → Check node capacity
# 2. Image pull errors → Check image name and registry
# 3. ConfigMap/Secret missing → Check dependencies
```

#### Issue: High Memory Usage

**Symptoms:**
- OOMKilled errors
- Pods restarting frequently

**Solutions:**

```bash
# Check resource usage
kubectl top pods -n staging
kubectl top nodes

# Increase memory limits in deployment.yaml
resources:
  limits:
    memory: 2Gi  # Increase from 1Gi

# Apply changes
kubectl apply -f deployment/staging/kubernetes/deployment.yaml
```

#### Issue: Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- Timeout errors

**Solutions:**

```bash
# Check database endpoint
kubectl get secrets spreadsheet-moment-secret -n staging -o jsonpath='{.data.DATABASE_URL}' | base64 -d

# Test database connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql $DATABASE_URL

# Common causes:
# 1. Wrong database URL → Check secret
# 2. Security group blocking → Check SG rules
# 3. Database not reachable → Check VPC routing
```

#### Issue: High CPU Usage

**Symptoms:**
- Slow response times
- High latency

**Solutions:**

```bash
# Check CPU usage
kubectl top pods -n staging

# Scale up deployment
kubectl scale deployment spreadsheet-moment --replicas=5 -n staging

# Enable HPA for auto-scaling
kubectl autoscale deployment spreadsheet-moment \
  --cpu-percent=70 --min=3 --max=10 -n staging
```

### Debug Mode

**Enable debug logging:**

```bash
# Set log level to debug
kubectl set env deployment/spreadsheet-moment LOG_LEVEL=debug -n staging

# View debug logs
kubectl logs -f deployment/spreadsheet-moment -n staging
```

### Health Checks

**Manual health verification:**

```bash
# Application health
curl https://staging.spreadsheet-moment.superinstance.ai/health

# Readiness check
curl https://staging.spreadsheet-moment.superinstance.ai/ready

# Metrics endpoint
curl https://staging.spreadsheet-moment.superinstance.ai/metrics

# Database health
kubectl exec -it <pod-name> -n staging -- psql $DATABASE_URL -c "SELECT 1"
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Check error logs for anomalies
- Verify metrics are within normal ranges
- Review alerts and take action if needed

**Weekly:**
- Review and clean up old Docker images
- Check disk space usage
- Review database performance metrics
- Update dependencies if needed

**Monthly:**
- Review and update documentation
- Review and optimize costs
- Security audit and vulnerability scanning
- Backup verification

### Updates and Upgrades

**Application Updates:**

```bash
# Update to latest version
git pull origin develop
pnpm install
pnpm build

# Deploy
./deployment/staging/scripts/deploy.sh
```

**Kubernetes Updates:**

```bash
# Update cluster version
aws eks update-cluster-version \
  --name spreadsheet-moment-staging \
  --kubernetes-version 1.29 \
  --region us-east-1
```

**Database Updates:**

```bash
# Run migrations
kubectl exec -it <pod-name> -n staging -- pnpm prisma migrate deploy
```

### Backup and Recovery

**Database Backups:**

```bash
# Create manual backup
kubectl exec -it <pod-name> -n staging -- pg_dump $DATABASE_URL > backup.sql

# Restore from backup
kubectl exec -i <pod-name> -n staging -- psql $DATABASE_URL < backup.sql
```

**Disaster Recovery:**

```bash
# 1. Provision new infrastructure
terraform apply -var="environment=staging-recovery"

# 2. Restore from backup
kubectl apply -f deployment/staging/kubernetes/deployment.yaml

# 3. Verify recovery
curl https://staging-recovery.spreadsheet-moment.superinstance.ai/health
```

---

## Best Practices

### Security

- ✅ Use secrets for sensitive data (never commit to Git)
- ✅ Enable RBAC for Kubernetes access
- ✅ Use network policies to restrict traffic
- ✅ Regularly update dependencies
- ✅ Scan for vulnerabilities
- ✅ Use HTTPS/TLS for all communications

### Performance

- ✅ Enable HPA for auto-scaling
- ✅ Use resource limits effectively
- ✅ Monitor metrics regularly
- ✅ Optimize database queries
- ✅ Use caching (Redis) where appropriate
- ✅ Profile and optimize hot paths

### Reliability

- ✅ Use liveness and readiness probes
- ✅ Implement proper error handling
- ✅ Use circuit breakers for external APIs
- ✅ Implement retry logic with exponential backoff
- ✅ Test rollback procedures regularly
- ✅ Use PodDisruptionBudgets for availability

---

## Support

**Documentation:**
- [Architecture](../ARCHITECTURE.md)
- [API Reference](../API_REFERENCE.md)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)

**Links:**
- GitHub: https://github.com/SuperInstance/spreadsheet-moment
- Staging: https://staging.spreadsheet-moment.superinstance.ai
- Grafana: http://localhost:3000

**Contacts:**
- DevOps: devops@superinstance.ai
- Issues: https://github.com/SuperInstance/spreadsheet-moment/issues

---

**Last Updated:** 2026-03-16
**Maintained By:** Spreadsheet Moment DevOps Team
