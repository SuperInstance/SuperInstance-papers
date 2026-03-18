# Spreadsheet Moment - Staging Runbook

**Environment:** Staging
**Purpose:** Operational procedures for common scenarios
**Last Updated:** 2026-03-16

---

## Table of Contents

1. [Incident Response](#incident-response)
2. [Deployment Procedures](#deployment-procedures)
3. [Scaling Operations](#scaling-operations)
4. [Database Operations](#database-operations)
5. [Performance Tuning](#performance-tuning)
6. [Security Incidents](#security-incidents)

---

## Incident Response

### Severity Levels

**SEV1 - Critical**
- System completely down
- Data loss or corruption
- Security breach
- **Response Time:** 15 minutes
- **Escalation:** CTO, VP Engineering

**SEV2 - High**
- Major functionality broken
- Severe performance degradation
- Data inconsistency suspected
- **Response Time:** 1 hour
- **Escalation:** Engineering Manager

**SEV3 - Medium**
- Partial functionality broken
- Moderate performance issues
- Minor data inconsistencies
- **Response Time:** 4 hours
- **Escalation:** Team Lead

**SEV4 - Low**
- Minor issues
- Cosmetic problems
- Documentation errors
- **Response Time:** 24 hours
- **Escalation:** None

### Incident Response Process

**1. Detection**
```bash
# Check alerts
kubectl get events -n staging --sort-by='.lastTimestamp'

# Check pod status
kubectl get pods -n staging

# Check error logs
kubectl logs -l app=spreadsheet-moment -n staging --tail=100
```

**2. Assessment**
```bash
# Determine scope
kubectl describe pods -n staging

# Check resource usage
kubectl top pods -n staging
kubectl top nodes

# Check metrics
curl https://staging.spreadsheet-moment.superinstance.ai/metrics
```

**3. Mitigation**
```bash
# Immediate rollback if needed
kubectl rollout undo deployment/spreadsheet-moment -n staging

# Scale up if resource issue
kubectl scale deployment spreadsheet-moment --replicas=10 -n staging

# Enable debug logging
kubectl set env deployment/spreadsheet-moment LOG_LEVEL=debug -n staging
```

**4. Resolution**
```bash
# Apply fix
kubectl apply -f deployment/staging/kubernetes/deployment.yaml

# Verify resolution
curl https://staging.spreadsheet-moment.superinstance.ai/health

# Run smoke tests
pnpm test:e2e --env=staging
```

**5. Post-Mortem**
- Document root cause
- Identify prevention measures
- Create action items
- Update runbook

---

## Deployment Procedures

### Standard Deployment

**Pre-Deployment Checklist:**
- [ ] All tests passing
- [ ] Security scan clean
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Rollback plan prepared

**Deployment Steps:**

```bash
# 1. Verify current state
kubectl get pods -n staging
curl https://staging.spreadsheet-moment.superinstance.ai/health

# 2. Deploy
./deployment/staging/scripts/deploy.sh

# 3. Monitor rollout
kubectl rollout status deployment/spreadsheet-moment -n staging

# 4. Verify deployment
kubectl get pods -n staging
curl https://staging.spreadsheet-moment.superinstance.ai/health

# 5. Run smoke tests
pnpm test:e2e --env=staging

# 6. Monitor metrics
# Check Grafana dashboard
```

### Blue-Green Deployment

**For zero-downtime deployment:**

```bash
# 1. Deploy to green environment
kubectl apply -f deployment/staging/kubernetes/deployment-green.yaml

# 2. Verify green environment
curl https://staging-green.spreadsheet-moment.superinstance.ai/health

# 3. Switch traffic
kubectl patch ingress spreadsheet-moment-ingress -n staging -p '{"spec":{"rules":[{"host":"staging.spreadsheet-moment.superinstance.ai","http":{"paths":[{"path":"/","pathType":"Prefix","backend":{"service":{"name":"spreadsheet-moment-green","port":{"number":3000}}}}]}}]}}'

# 4. Monitor and rollback if needed
```

### Canary Deployment

**For gradual rollout:**

```bash
# 1. Deploy canary (10% traffic)
kubectl apply -f deployment/staging/kubernetes/deployment-canary.yaml

# 2. Monitor canary metrics
kubectl logs -l app=spreadsheet-moment-canary -n staging

# 3. Gradually increase traffic
# Update service to send 20%, 30%, etc.

# 4. Full rollout or rollback
```

---

## Scaling Operations

### Horizontal Pod Autoscaling

**Check HPA status:**

```bash
kubectl get hpa -n staging
```

**Manual scaling:**

```bash
# Scale up
kubectl scale deployment spreadsheet-moment --replicas=10 -n staging

# Scale down
kubectl scale deployment spreadsheet-moment --replicas=3 -n staging
```

**Auto-scaling configuration:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spreadsheet-moment-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spreadsheet-moment
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Vertical Pod Autoscaling

**Enable VPA:**

```bash
kubectl apply -f deployment/staging/kubernetes/vpa.yaml
```

**Check VPA recommendations:**

```bash
kubectl describe vpa spreadsheet-moment-vpa -n staging
```

### Cluster Scaling

**Scale node group:**

```bash
aws eks update-nodegroup-config \
  --cluster-name spreadsheet-moment-staging \
  --nodegroup-name spreadsheet-moment-node-group \
  --scaling-config minSize=3,maxSize=20,desiredSize=5 \
  --region us-east-1
```

---

## Database Operations

### Connection Pool Tuning

**Check pool status:**

```bash
kubectl exec -it <pod-name> -n staging -- psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

**Adjust pool size:**

```yaml
env:
  - name: DATABASE_POOL_MIN
    value: "5"
  - name: DATABASE_POOL_MAX
    value: "20"
```

### Slow Query Analysis

**Enable slow query log:**

```bash
kubectl exec -it <pod-name> -n staging -- psql $DATABASE_URL -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"
```

**Analyze slow queries:**

```bash
kubectl exec -it <pod-name> -n staging -- psql $DATABASE_URL -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

### Database Backup

**Manual backup:**

```bash
# Create backup
kubectl exec -it <pod-name> -n staging -- pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
kubectl exec -i <pod-name> -n staging -- psql $DATABASE_URL < backup-20260316.sql
```

**Automated backup:**

```bash
# AWS RDS automated backups
aws rds create-db-snapshot \
  --db-instance-identifier spreadsheet-moment-staging \
  --db-snapshot-identifier spreadsheet-moment-backup-$(date +%Y%m%d)
```

### Database Migration

**Run migrations:**

```bash
kubectl exec -it <pod-name> -n staging -- pnpm prisma migrate deploy
```

**Rollback migration:**

```bash
kubectl exec -it <pod-name> -n staging -- pnpm prisma migrate resolve --rolled-back migration_name
```

---

## Performance Tuning

### Memory Optimization

**Identify memory leaks:**

```bash
# Check memory usage
kubectl top pods -n staging

# Get detailed metrics
kubectl exec -it <pod-name> -n staging -- node --inspect
```

**Optimize memory limits:**

```yaml
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "2Gi"
```

### CPU Optimization

**Profile CPU usage:**

```bash
kubectl exec -it <pod-name> -n staging -- node --prof
```

**Optimize CPU allocation:**

```yaml
resources:
  requests:
    cpu: "250m"
  limits:
    cpu: "1000m"
```

### Network Optimization

**Check network latency:**

```bash
kubectl exec -it <pod-name> -n staging -- ping spreadsheet-moment-postgres-staging
```

**Optimize service mesh:**

```bash
# Enable connection pooling
kubectl set env deployment/spreadsheet-moment DATABASE_POOL_MAX=20 -n staging
```

### Cache Optimization

**Redis cache tuning:**

```bash
# Check cache hit rate
kubectl exec -it redis-0 -n staging -- redis-cli INFO stats

# Flush cache if needed
kubectl exec -it redis-0 -n staging -- redis-cli FLUSHDB
```

---

## Security Incidents

### Unauthorized Access

**Detect unauthorized access:**

```bash
# Check authentication logs
kubectl logs -l app=spreadsheet-moment -n staging | grep "Failed authentication"

# Check for suspicious activity
kubectl logs -l app=spreadsheet-moment -n staging | grep "Unauthorized"
```

**Respond to unauthorized access:**

```bash
# 1. Rotate secrets
kubectl delete secret spreadsheet-moment-secret -n staging
kubectl create secret generic spreadsheet-moment-secret --from-literal=JWT_SECRET=$(openssl rand -base64 32)

# 2. Restart deployment
kubectl rollout restart deployment/spreadsheet-moment -n staging

# 3. Enable additional logging
kubectl set env deployment/spreadsheet-moment LOG_LEVEL=debug -n staging
```

### Data Breach

**Respond to data breach:**

```bash
# 1. Isolate affected systems
kubectl scale deployment spreadsheet-moment --replicas=0 -n staging

# 2. Preserve evidence
kubectl logs -l app=spreadsheet-moment -n staging > evidence.log

# 3. Notify stakeholders
# Send security alert

# 4. Investigate and patch
# Analyze logs, identify vulnerability, apply patch

# 5. Restore from clean backup
# After cleanup, restore from verified backup
```

### DDoS Attack

**Mitigate DDoS:**

```bash
# 1. Enable rate limiting
kubectl annotate ingress spreadsheet-moment-ingress nginx.ingress.kubernetes.io/limit-rps="100" -n staging

# 2. Scale up
kubectl scale deployment spreadsheet-moment --replicas=20 -n staging

# 3. Enable Cloudflare protection
# Configure Cloudflare security settings

# 4. Block malicious IPs
kubectl annotate ingress spreadsheet-moment-ingress nginx.ingress.kubernetes.io/block-cidrs="1.2.3.4/32" -n staging
```

---

## Maintenance Windows

### Scheduled Maintenance

**Pre-Maintenance:**
1. Notify stakeholders 24 hours in advance
2. Create maintenance window in incident management system
3. Prepare rollback plan
4. Backup current state

**During Maintenance:**
1. Put system in maintenance mode
2. Perform maintenance tasks
3. Verify system health
4. Take system out of maintenance mode

**Post-Maintenance:**
1. Monitor for issues
2. Document changes
3. Close maintenance window

### Rolling Updates

**Zero-downtime updates:**

```bash
# Kubernetes handles rolling updates automatically
kubectl set image deployment/spreadsheet-moment \
  spreadsheet-moment=spreadsheet-moment:new-version \
  -n staging

# Monitor progress
kubectl rollout status deployment/spreadsheet-moment -n staging
```

---

## Communication

### Alert Channels

- **Slack:** #spreadsheet-moment-alerts
- **Email:** devops@superinstance.ai
- **PagerDuty:** On-call rotation

### Status Updates

**Incident status updates:**

```
[SEV2] High Error Rate - Investigation in Progress
Impact: Users experiencing slow load times
Started: 2026-03-16 14:30 UTC
Next Update: 2026-03-16 15:00 UTC
```

---

**Last Updated:** 2026-03-16
**Maintained By:** Spreadsheet Moment DevOps Team
**Version:** 1.0
