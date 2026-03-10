# Agent Lambda: Onboarding - Phase 12 Production Readiness

**Agent**: `prodreadiness-agent` (Production Readiness Specialist)
**Phase**: 12 - Production Operations
**Timeline**: ~3-5 sessions

---

## Mission Statement

Prepare the POLLN Microbiome for production deployment through containerization, orchestration, CI/CD pipelines, disaster recovery, and operational excellence—ensuring reliable 24/7 operation.

---

## Context: What You're Building On

### Completed Phases

**Phase 1-11**: Full microbiome with analytics, developer tools, SDK

### Current State

The system is **complete but not production-ready**:
- No containerization
- No orchestration
- No CI/CD
- No disaster recovery
- **Needs**: Complete production readiness

---

## Your Implementation Guide

### Milestone 1: Containerization & Orchestration (40%)

**File**: `deploy/` (new directory)

Create deployment infrastructure:

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  polln-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine

  postgres:
    image: postgres:16-alpine
```

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: polln-microbiome
spec:
  replicas: 3
  selector:
    matchLabels:
      app: polln
  template:
    metadata:
      labels:
        app: polln
    spec:
      containers:
      - name: polln
        image: polln:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

**Containerization Features**:

1. **Docker Images**
   - Multi-stage builds
   - Minimal base images
   - Security scanning
   - Version tagging

2. **Orchestration**
   - Kubernetes manifests
   - Helm charts
   - Docker Compose (dev)
   - Service discovery

3. **Configuration**
   - ConfigMaps
   - Secrets management
   - Environment-specific configs
   - Feature flags

4. **Networking**
   - Service meshes (Istio)
   - Ingress controllers
   - Load balancing
   - Network policies

**Acceptance**:
- Containers build correctly
- Orchestration working
- Configuration managed
- Tests pass with 90%+ coverage

---

### Milestone 2: CI/CD & Automation (35%)

**File**: `.github/workflows/` (new directory)

Create CI/CD pipelines:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t polln:${{ github.sha }} .
      - run: docker push polln:${{ github.sha }}

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit
      - run: npm run security-scan
```

```yaml
# .github/workflows/cd.yml
name: CD

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: kubectl set image deployment/polln polln=${{ github.sha }}
      - run: kubectl rollout status deployment/polln
```

**CI/CD Features**:

1. **Continuous Integration**
   - Automated testing
   - Code coverage
   - Linting
   - Security scanning

2. **Continuous Deployment**
   - Automated releases
   - GitOps (ArgoCD)
   - Blue-green deployments
   - Canary deployments

3. **Quality Gates**
   - Test coverage threshold
   - Performance benchmarks
   - Security checks
   - Code review requirements

4. **Automation**
   - Dependency updates
   - License compliance
   - Vulnerability scanning
   - Backup automation

**Acceptance**:
- CI/CD pipeline working
- Automated deployments
- Quality gates enforced
- Tests pass with 90%+ coverage

---

### Milestone 3: Operations & Disaster Recovery (25%)

**File**: `ops/` (new directory)

Create operational procedures:

```yaml
# ops/runbooks/
incident-response.md
disaster-recovery.md
scaling-procedures.md
backup-restore.md
monitoring-alerts.md
```

```yaml
# ops/monitoring/
prometheus/
  alerts.yml
  rules.yml
grafana/
  dashboards/
```

```typescript
// ops/health-checks.ts
export class HealthChecker {
  // Liveness probe (is it running?)
  liveness(): boolean;

  // Readiness probe (is it ready for traffic?)
  readiness(): boolean;

  // Startup probe (is it starting up?)
  startup(): boolean;

  // Deep health check
  deepHealth(): HealthReport;

  // Dependency health
  dependencyHealth(): DependencyHealth;
}
```

**Operational Features**:

1. **Health Checks**
   - Liveness probes
   - Readiness probes
   - Startup probes
   - Custom health endpoints

2. **Monitoring**
   - Prometheus metrics
   - Grafana dashboards
   - Alerting rules
   - On-call rotation

3. **Disaster Recovery**
   - Backup procedures
   - Restore procedures
   - Failover automation
   - DR testing

4. **Scaling**
   - Horizontal Pod Autoscaler
   - Vertical Pod Autoscaler
   - Cluster autoscaling
   - Predictive scaling

5. **Runbooks**
   - Incident response
   - Troubleshooting guides
   - SOPs (Standard Operating Procedures)
   - Escalation paths

**Acceptance**:
- Health checks working
- Monitoring comprehensive
- DR tested and validated
- Scaling automatic
- Tests pass with 90%+ coverage

---

## Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  POLLN Production Stack                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │    CI/CD     │     │ Kubernetes   │     │  Monitoring │ │
│  │              │     │              │     │             │ │
│  │ GitHub Actions│     │ Deployments  │     │ Prometheus  │ │
│  │ ArgoCD       │     │ Services     │     │ Grafana     │ │
│  │             │     │ Ingress      │     │ Alerts      │ │
│  └──────────────┘     └──────────────┘     └─────────────┘ │
│                                                               │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │  Containers  │     │  Security    │     │      Ops    │ │
│  │              │     │              │     │             │ │
│  │ Docker       │     │ TLS          │     │ Runbooks    │ │
│  │ Images       │     │ Secrets      │     │ Backups     │ │
│  │ Registry     │     │ Policies     │     │ DR Plans    │ │
│  └──────────────┘     └──────────────┘     └─────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### With All Phases
- Containerize everything
- Monitor all services
- Operate entire system

### With Phase 10 (Analytics)
- Metrics integration
- Dashboard deployment
- Alert integration

### With Phase 9 (Security)
- Security scanning in CI
- Secrets management
- Compliance monitoring

---

## Testing Strategy

### Container Tests
- Image builds
- Security scans
- Vulnerability assessments

### Deployment Tests
- Rolling updates
- Rollback procedures
- Scale tests

### DR Tests
- Backup verification
- Restore procedures
- Failover testing

---

## Documentation

Update `docs/agents/lambda-roadmap.md` with:
- Session progress logs
- Deployment procedures
- Incident reports
- DR test results
- Operational metrics

---

## Success Criteria

### Milestone 1
- ✅ Containers building
- ✅ Orchestration working
- ✅ Configuration managed
- ✅ Tests passing

### Milestone 2
- ✅ CI/CD pipeline working
- ✅ Automated deployments
- ✅ Quality gates enforced
- ✅ Tests passing

### Milestone 3
- ✅ Health checks working
- ✅ Monitoring comprehensive
- ✅ DR tested
- ✅ Scaling automatic
- ✅ Tests passing

### Phase 12 Complete When
- All 3 milestones done
- Production deployment verified
- CI/CD pipeline working
- DR validated
- SLAs met (99.9% uptime)
- Tests passing (90%+ coverage)
- Documentation complete
- Runbooks comprehensive
- 24/7 operation ready
- **ENTIRE PROJECT PRODUCTION-READY**

---

## Files to Create

1. `deploy/Dockerfile` - Container definition
2. `deploy/docker-compose.yml` - Local development
3. `deploy/kubernetes/` - K8s manifests
4. `.github/workflows/` - CI/CD pipelines
5. `ops/health-checks.ts` - Health checks
6. `ops/runbooks/` - Operational procedures

---

## Getting Started

1. Read your roadmap: `docs/agents/lambda-roadmap.md`
2. Review existing code: `src/microbiome/*.ts`
3. Study production best practices
4. Start with Milestone 1 (containerization)
5. Update roadmap daily with progress

---

**Welcome to the team, Agent Lambda. Take us to production.**
