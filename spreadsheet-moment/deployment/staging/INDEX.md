# Spreadsheet Moment - Staging Deployment Index

**Quick navigation to all staging deployment resources.**

---

## Quick Links

- **[Summary](SUMMARY.md)** - Executive summary and deliverables checklist
- **[Deployment Guide](README.md)** - Comprehensive deployment documentation
- **[Runbook](RUNBOOK.md)** - Operational procedures and incident response

---

## Configuration Files

### Environment Setup
- **[.env.staging.template](.env.staging.template)** - Environment variables template
- **[docker-compose.staging.yml](docker-compose.staging.yml)** - Docker Compose orchestration
- **[Dockerfile](Dockerfile)** - Multi-stage Docker build configuration
- **[entrypoint.sh](entrypoint.sh)** - Container entrypoint script
- **[health-check.js](health-check.js)** - Health check server

### Monitoring Configuration
- **[prometheus.yml](prometheus.yml)** - Prometheus metrics collection
- **[prometheus-alerts.yml](prometheus-alerts.yml)** - Alert rules and thresholds
- **[grafana/dashboard.json](grafana/dashboard.json)** - Grafana dashboard configuration
- **[loki-config.yml](loki-config.yml)** - Log aggregation configuration
- **[promtail-config.yml](promtail-config.yml)** - Log collection configuration

### CI/CD
- **[.github/workflows/deploy-staging.yml](../.github/workflows/deploy-staging.yml)** - GitHub Actions workflow

### Deployment Scripts
- **[scripts/deploy.sh](scripts/deploy.sh)** - Bash deployment script
- **[scripts/deploy.ps1](scripts/deploy.ps1)** - PowerShell deployment script

### Infrastructure as Code
- **[terraform/main.tf](terraform/main.tf)** - Terraform configuration
- **[terraform/variables.tf](terraform/variables.tf)** - Terraform variables
- **[terraform/outputs.tf](terraform/outputs.tf)** - Terraform outputs
- **[kubernetes/deployment.yaml](kubernetes/deployment.yaml)** - Kubernetes manifests

---

## Getting Started

### 1. Local Staging (Fastest)

```bash
# Copy environment template
cp .env.staging.template .env.staging

# Edit with your values
nano .env.staging

# Start services
docker-compose -f docker-compose.staging.yml up -d

# Check status
docker-compose -f docker-compose.staging.yml ps

# View logs
docker-compose -f docker-compose.staging.yml logs -f
```

### 2. Cloud Staging (Production)

```bash
# Provision infrastructure
cd terraform
terraform init
terraform plan
terraform apply

# Configure kubectl
aws eks update-kubeconfig --name spreadsheet-moment-staging --region us-east-1

# Deploy application
kubectl apply -f ../kubernetes/deployment.yaml

# Verify deployment
kubectl get pods -n staging
kubectl get services -n staging
```

### 3. Automated Deployment

```bash
# Linux/Mac
./scripts/deploy.sh

# Windows PowerShell
.\scripts\deploy.ps1

# With options
./scripts/deploy.sh --skip-tests --dry-run
```

---

## Service Endpoints

### Local Staging
- Application: http://localhost:3000
- Health Check: http://localhost:3001/health
- Metrics: http://localhost:3001/metrics
- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686

### Cloud Staging
- Application: https://staging.spreadsheet-moment.superinstance.ai
- API: https://staging-api.spreadsheet-moment.superinstance.ai
- Health: https://staging-api.spreadsheet-moment.superinstance.ai/health
- Metrics: https://staging-api.spreadsheet-moment.superinstance.ai/metrics

---

## Monitoring

### Grafana Dashboards
- **Application Dashboard**: Request rate, latency, errors, active agents
- **Infrastructure Dashboard**: CPU, memory, disk, network
- **Database Dashboard**: Connections, queries, replication lag

**Access:** http://localhost:3000 (admin/admin)

### Prometheus Metrics
- Application metrics: `spreadsheet_moment_*`
- HTTP metrics: `http_*`
- Business metrics: `agent_*`, `websocket_*`

**Access:** http://localhost:9090

### Jaeger Tracing
- Distributed tracing for requests
- Performance analysis
- Error tracking

**Access:** http://localhost:16686

---

## Troubleshooting

### Quick Checks

```bash
# Check pod status
kubectl get pods -n staging

# Check pod logs
kubectl logs -f deployment/spreadsheet-moment -n staging

# Describe pod
kubectl describe pod <pod-name> -n staging

# Check resources
kubectl top pods -n staging
kubectl top nodes

# Check events
kubectl get events -n staging --sort-by='.lastTimestamp'
```

### Common Issues

**Pods not starting?**
- Check resources: `kubectl describe pod <pod-name> -n staging`
- Check logs: `kubectl logs <pod-name> -n staging`
- Check image: `kubectl describe pod <pod-name> -n staging | grep Image`

**High memory usage?**
- Check usage: `kubectl top pods -n staging`
- Scale up: `kubectl scale deployment spreadsheet-moment --replicas=5 -n staging`

**Database connection errors?**
- Check endpoint: `kubectl get secrets -n staging`
- Test connection: `kubectl run -it --rm debug --image=postgres:15 -- psql $DATABASE_URL`

**Rollback needed?**
- Quick rollback: `kubectl rollout undo deployment/spreadsheet-moment -n staging`
- Check status: `kubectl rollout status deployment/spreadsheet-moment -n staging`

---

## Maintenance

### Daily Tasks
- Check error logs
- Verify metrics
- Review alerts

### Weekly Tasks
- Clean up old Docker images
- Check disk space
- Review database performance

### Monthly Tasks
- Update dependencies
- Security audit
- Backup verification

---

## Documentation

### Essential Reading
1. **[SUMMARY.md](SUMMARY.md)** - Start here for overview
2. **[README.md](README.md)** - Comprehensive deployment guide
3. **[RUNBOOK.md](RUNBOOK.md)** - Operational procedures

### Additional Resources
- [Project Architecture](../../docs/ARCHITECTURE.md)
- [API Reference](../../docs/API_REFERENCE.md)
- [Troubleshooting Guide](../../docs/TROUBLESHOOTING.md)
- [Phase 4 Plan](../../PHASE_4_PLAN.md)

---

## Support

### Getting Help
- **Documentation:** Start with [README.md](README.md)
- **Issues:** https://github.com/SuperInstance/spreadsheet-moment/issues
- **Discussions:** https://github.com/SuperInstance/spreadsheet-moment/discussions
- **Email:** devops@superinstance.ai

### Emergency Contacts
- **On-Call:** on-call@superinstance.ai
- **DevOps:** devops@superinstance.ai
- **Support:** support@superinstance.ai

### Status Pages
- **Staging:** https://staging.spreadsheet-moment.superinstance.ai
- **Grafana:** http://localhost:3000
- **Prometheus:** http://localhost:9090

---

## Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Dependencies installed (Docker, kubectl, terraform)
- [ ] Tests passing
- [ ] Security scan clean
- [ ] Documentation updated

### Deployment
- [ ] Backup created
- [ ] Infrastructure provisioned
- [ ] Application deployed
- [ ] Health checks passing
- [ ] Smoke tests passing

### Post-Deployment
- [ ] Monitoring configured
- [ ] Alerts tested
- [ ] Documentation updated
- [ ] Team notified
- [ ] Success metrics validated

---

## Version History

**v1.0 (2026-03-16)**
- Initial staging infrastructure
- Complete CI/CD pipeline
- Comprehensive monitoring
- Full documentation

---

**Last Updated:** 2026-03-16
**Maintained By:** Spreadsheet Moment DevOps Team
**Environment:** Staging
