# Production Runbook - Claw API Integration

**Version:** 1.0.0 - Week 4: Production Deployment
**Date:** 2026-03-15
**Purpose:** Operational procedures for production incidents

---

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [Quick Reference](#quick-reference)
3. [Common Incidents](#common-incidents)
4. [Troubleshooting Procedures](#troubleshooting-procedures)
5. [Performance Issues](#performance-issues)
6. [Security Incidents](#security-incidents)
7. [Maintenance Tasks](#maintenance-tasks)
8. [Recovery Procedures](#recovery-procedures)

---

## Emergency Contacts

| Role | Name | Contact | Hours |
|------|------|---------|-------|
| On-Call Engineer | [Name] | [Phone/Slack] | 24/7 |
| Engineering Lead | [Name] | [Phone/Slack] | Business Hours |
| Product Manager | [Name] | [Email/Slack] | Business Hours |
| DevOps Engineer | [Name] | [Phone/Slack] | 24/7 |

---

## Quick Reference

### Essential Commands

```bash
# Check health status
curl http://app:3000/health

# Check metrics
curl http://app:3000/metrics

# View logs
kubectl logs -f deployment/spreadsheet-moment -n production

# Restart deployment
kubectl rollout restart deployment/spreadsheet-moment -n production

# Scale up
kubectl scale deployment spreadsheet-moment --replicas=5 -n production

# Check pod status
kubectl get pods -n production -l app=spreadsheet-moment
```

### Key Metrics

- **Error Rate:** < 1% (alert if > 5%)
- **P95 Latency:** < 200ms (alert if > 500ms)
- **P99 Latency:** < 500ms (alert if > 1000ms)
- **Memory Usage:** < 80% (alert if > 90%)
- **CPU Usage:** < 70% (alert if > 85%)
- **WebSocket Connections:** > 0 per instance
- **Success Rate:** > 99%

### Important URLs

- **Application:** https://app.example.com
- **Health Check:** https://app.example.com/health
- **Metrics:** https://app.example.com/metrics
- **Grafana:** https://grafana.example.com
- **Prometheus:** https://prometheus.example.com
- **Logs:** https://logs.example.com

---

## Common Incidents

### Incident 1: High Error Rate

**Severity:** Critical
**Alert:** `HighErrorRate`

#### Symptoms
- Error rate > 5% for > 5 minutes
- Increased 5xx HTTP responses
- Client connection failures

#### Diagnosis

```bash
# Check error rate
kubectl logs -f deployment/spreadsheet-moment -n production | grep ERROR

# Check error metrics
curl http://app:3000/metrics | grep errors_total

# Check recent errors
kubectl logs --since=5m deployment/spreadsheet-moment -n production
```

#### Resolution Steps

1. **Immediate Actions**
   ```bash
   # Check if Claw API is healthy
   curl https://api.example.com/health

   # If Claw API is down, check status page
   curl https://status.example.com

   # Scale up to handle increased load
   kubectl scale deployment spreadsheet-moment --replicas=10 -n production
   ```

2. **Investigate Root Cause**
   ```bash
   # Check for recent deployments
   kubectl rollout history deployment/spreadsheet-moment -n production

   # Check for configuration changes
   kubectl get configmap -n production

   # Review error logs for patterns
   kubectl logs --tail=1000 deployment/spreadsheet-moment -n production | jq '.error'
   ```

3. **Fix and Verify**
   ```bash
   # If recent deployment caused issues, rollback
   kubectl rollout undo deployment/spreadsheet-moment -n production

   # Monitor error rate
   watch -n 5 'curl -s http://app:3000/metrics | grep errors_total'

   # Verify health
   curl http://app:3000/health
   ```

#### Escalation
- If not resolved in 15 minutes, escalate to Engineering Lead
- If not resolved in 30 minutes, page CTO

---

### Incident 2: High Memory Usage

**Severity:** Warning
**Alert:** `HighMemoryUsage`

#### Symptoms
- Memory usage > 80% for > 5 minutes
- Pods being OOMKilled
- Slow response times

#### Diagnosis

```bash
# Check memory usage
kubectl top pods -n production -l app=spreadsheet-moment

# Check memory limits
kubectl describe deployment spreadsheet-moment -n production | grep -A 5 Limits

# Check for memory leaks
kubectl exec -it <pod-name> -n production -- node --heap-prof
```

#### Resolution Steps

1. **Immediate Actions**
   ```bash
   # Scale up to increase total memory
   kubectl scale deployment spreadsheet-moment --replicas=5 -n production

   # Restart pods to free memory
   kubectl rollout restart deployment/spreadsheet-moment -n production
   ```

2. **Investigate Root Cause**
   ```bash
   # Check for memory leaks in application
   kubectl exec -it <pod-name> -n production -- node --inspect

   # Review memory profiling data
   kubectl logs <pod-name> -n production | grep "Memory usage"
   ```

3. **Long-term Fix**
   ```yaml
   # Increase memory limits in deployment manifest
   resources:
     limits:
       memory: "1Gi"
     requests:
       memory: "512Mi"
   ```

#### Prevention
- Set up memory profiling
- Implement memory leak detection in tests
- Review memory usage trends weekly

---

### Incident 3: WebSocket Connection Failures

**Severity:** Critical
**Alert:** `WebSocketDisconnected`

#### Symptoms
- Clients unable to establish WebSocket connections
- Frequent disconnections
- Real-time updates not working

#### Diagnosis

```bash
# Check WebSocket connections
curl http://app:3000/metrics | grep websocket_connections_active

# Check WebSocket error logs
kubectl logs deployment/spreadsheet-moment -n production | grep -i websocket

# Test WebSocket connection
wscat -c wss://api.example.com/ws
```

#### Resolution Steps

1. **Immediate Actions**
   ```bash
   # Check WebSocket URL configuration
   kubectl get configmap claw-config -n production -o yaml

   # Verify API key authentication
   kubectl get secret claw-secrets -n production -o yaml | grep api-key

   # Check load balancer WebSocket support
   kubectl describe service spreadsheet-moment -n production
   ```

2. **Common Fixes**
   ```bash
   # Update WebSocket URL if incorrect
   kubectl edit configmap claw-config -n production

   # Restart deployment to pick up changes
   kubectl rollout restart deployment/spreadsheet-moment -n production

   # Verify connection
   wscat -c wss://app.example.com/ws -H "Authorization: Bearer <token>"
   ```

3. **Network Issues**
   ```bash
   # Check firewall rules
   kubectl get networkpolicy -n production

   # Check ingress rules
   kubectl get ingress -n production

   # Test network connectivity
   kubectl exec -it <pod-name> -n production -- curl wss://api.example.com/ws
   ```

---

### Incident 4: High Latency

**Severity:** Warning
**Alert:** `HighLatency`

#### Symptoms
- P95 latency > 500ms
- P99 latency > 1000ms
- Client timeouts

#### Diagnosis

```bash
# Check latency metrics
curl http://app:3000/metrics | grep http_request_duration_ms

# Check Claw API latency
curl -w "@curl-format.txt" -o /dev/null -s https://api.example.com/health

# Check database/connection pool
kubectl logs deployment/spreadsheet-moment -n production | grep -i pool
```

#### Resolution Steps

1. **Immediate Actions**
   ```bash
   # Scale up to handle increased load
   kubectl scale deployment spreadsheet-moment --replicas=10 -n production

   # Check for slow queries or operations
   kubectl logs --tail=1000 deployment/spreadsheet-moment -n production | grep -i slow
   ```

2. **Investigate Root Cause**
   ```bash
   # Check Claw API performance
   time curl https://api.example.com/api/claws

   # Check network latency
   kubectl exec -it <pod-name> -n production -- ping api.example.com

   # Review performance profiling
   kubectl logs deployment/spreadsheet-moment -n production | grep "Performance"
   ```

3. **Optimization**
   ```bash
   # Enable caching if not already enabled
   kubectl set env deployment/spreadsheet-moment FEATURE_CACHING=true -n production

   # Increase connection pool size
   kubectl set env deployment/spreadsheet-moment CONNECTION_POOL_SIZE=20 -n production
   ```

---

### Incident 5: Rate Limiting

**Severity:** Warning
**Alert:** `RateLimited`

#### Symptoms
- HTTP 429 responses
- "Rate limit exceeded" errors
- Request throttling

#### Diagnosis

```bash
# Check rate limit metrics
curl http://app:3000/metrics | grep rate_limit

# Check recent 429 responses
kubectl logs deployment/spreadsheet-moment -n production | grep "429"

# Check request rate
curl http://app:3000/metrics | grep http_requests_total
```

#### Resolution Steps

1. **Immediate Actions**
   ```bash
   # Check current rate limit configuration
   kubectl get configmap claw-config -n production -o yaml

   # Implement exponential backoff (should be automatic)
   # Verify retry configuration
   kubectl get deployment spreadsheet-moment -n production -o yaml | grep retry
   ```

2. **Increase Rate Limit**
   ```bash
   # Contact Claw API support to increase rate limit
   # Update rate limit configuration if needed
   kubectl set env deployment/spreadsheet-moment CLAW_MAX_RETRIES=10 -n production
   ```

3. **Reduce Request Rate**
   ```bash
   # Implement request batching
   # Enable caching to reduce redundant requests
   # Use WebSocket for real-time updates instead of polling
   ```

---

## Troubleshooting Procedures

### Health Check Failures

#### Symptom: Health check returns 503

```bash
# Run health check
curl http://app:3000/health

# Check individual health checks
curl http://app:3000/health | jq '.checks'

# Check specific health check
curl http://app:3000/health | jq '.checks[] | select(.name == "api")'
```

#### Resolution

```bash
# Fix failed health check
# Example: API health check failing
kubectl edit configmap claw-config -n production

# Restart deployment
kubectl rollout restart deployment/spreadsheet-moment -n production

# Verify health
curl http://app:3000/health
```

### Pod Crashes

#### Symptom: Pods restarting frequently

```bash
# Check pod restart count
kubectl get pods -n production -l app=spreadsheet-moment

# Check pod logs
kubectl logs <pod-name> -n production --previous

# Check pod events
kubectl describe pod <pod-name> -n production
```

#### Resolution

```bash
# Identify crash reason from logs
kubectl logs <pod-name> -n production --previous | tail -100

# Common fixes:
# 1. Out of memory - increase memory limits
# 2. Configuration error - fix environment variables
# 3. Unhandled exception - check application logs

# After fix, restart deployment
kubectl rollout restart deployment/spreadsheet-moment -n production
```

### Deployment Failures

#### Symptom: New deployment not rolling out

```bash
# Check rollout status
kubectl rollout status deployment/spreadsheet-moment -n production

# Check deployment events
kubectl describe deployment spreadsheet-moment -n production

# Check pod status
kubectl get pods -n production -l app=spreadsheet-moment
```

#### Resolution

```bash
# Check image pull errors
kubectl describe pod <pod-name> -n production | grep Image

# Fix and retry
# If image error: fix image name/registry
# If config error: fix environment variables
# If resource error: adjust resource limits

# Rollback if needed
kubectl rollout undo deployment/spreadsheet-moment -n production
```

---

## Performance Issues

### Slow Startup

#### Symptom: Pods taking > 60s to become ready

```bash
# Check pod startup time
kubectl get pods -n production -l app=spreadsheet-moment -o jsonpath='{.items[*].status.startTime}'

# Check startup logs
kubectl logs <pod-name> -n production
```

#### Resolution

```bash
# Optimize startup:
# 1. Reduce dependencies loaded at startup
# 2. Implement lazy loading
# 3. Increase readiness probe initial delay
kubectl edit deployment spreadsheet-moment -n production

# Update readiness probe
spec:
  template:
    spec:
      containers:
      - name: app
        readinessProbe:
          initialDelaySeconds: 30
```

### Memory Leaks

#### Symptom: Memory usage increasing over time

```bash
# Monitor memory usage over time
kubectl top pod <pod-name> -n production --containers

# Enable memory profiling
kubectl set env deployment/spreadsheet-moment NODE_OPTIONS="--max-old-space-size=512" -n production
```

#### Resolution

```bash
# Restart pods periodically if needed
kubectl rollout restart deployment/spreadsheet-moment -n production

# Implement memory profiling
# Add to application:
const v8 = require('v8');
setInterval(() => {
  console.log('Memory usage:', v8.getHeapStatistics());
}, 60000);
```

---

## Security Incidents

### Unauthorized Access

#### Symptom: Failed authentication attempts

```bash
# Check auth failures
kubectl logs deployment/spreadsheet-moment -n production | grep "Unauthorized"

# Check API key usage
curl http://app:3000/metrics | grep api_key_invalid
```

#### Resolution

```bash
# If API key compromised:
# 1. Rotate API key immediately
kubectl delete secret claw-secrets -n production
kubectl create secret generic claw-secrets --from-literal=api-key=<new-key>

# 2. Restart deployment
kubectl rollout restart deployment/spreadsheet-moment -n production

# 3. Monitor for suspicious activity
kubectl logs -f deployment/spreadsheet-moment -n production | grep -i "unauthorized\|forbidden"
```

### DDoS Attack

#### Symptom: Massive spike in requests

```bash
# Check request rate
curl http://app:3000/metrics | grep http_requests_total

# Check source IPs
kubectl logs deployment/spreadsheet-moment -n production | grep "Remote address"
```

#### Resolution

```bash
# Enable rate limiting
kubectl annotate ingress spreadsheet-moment nginx.ingress.kubernetes.io/limit-rps="100"

# Implement IP blocking
# Add to ingress annotations:
# nginx.ingress.kubernetes.io/block-cidrs: "10.0.0.0/8"

# Scale up to handle load
kubectl scale deployment spreadsheet-moment --replicas=20 -n production

# Enable CDN caching
# Configure CDN to cache static content
```

---

## Maintenance Tasks

### Weekly Tasks

```bash
# Review error rates
curl http://app:3000/metrics | grep errors_total

# Review performance metrics
curl http://app:3000/metrics | grep http_request_duration_ms

# Check for memory leaks
kubectl top pods -n production -l app=spreadsheet-moment

# Review logs for issues
kubectl logs --since=7d deployment/spreadsheet-moment -n production | grep ERROR
```

### Monthly Tasks

```bash
# Review and update dependencies
npm audit
npm update

# Review configuration
kubectl get configmap -n production
kubectl get secret -n production

# Test disaster recovery procedures
# (Simulate failover)

# Review and update runbook
# (Based on incidents from past month)
```

### Quarterly Tasks

```bash
# Performance tuning
# - Review and optimize queries
# - Update resource limits
# - Optimize caching strategy

# Security audit
# - Review access controls
# - Update dependencies
# - Review security policies

# Capacity planning
# - Review growth trends
# - Plan scaling strategies
# - Update resource quotas
```

---

## Recovery Procedures

### Full System Recovery

```bash
# 1. Assess damage
kubectl get pods -n production
kubectl get pvc -n production
kubectl get pv -n production

# 2. Restore from backup if needed
kubectl apply -f backups/production-2026-03-15/

# 3. Restart all services
kubectl rollout restart deployment -n production

# 4. Verify health
for pod in $(kubectl get pods -n production -l app=spreadsheet-moment -o name); do
  kubectl exec $pod -n production -- curl http://localhost:3000/health
done

# 5. Monitor for issues
kubectl logs -f -n production -l app=spreadsheet-moment
```

### Database Recovery

```bash
# 1. Stop application
kubectl scale deployment spreadsheet-moment --replicas=0 -n production

# 2. Restore database
pg_restore -U user -h localhost -d database_name backup.sql

# 3. Verify data
psql -U user -h localhost -d database_name -c "SELECT COUNT(*) FROM claws;"

# 4. Restart application
kubectl scale deployment spreadsheet-moment --replicas=3 -n production

# 5. Verify functionality
curl http://app:3000/health
```

---

**Runbook Version:** 1.0.0
**Last Updated:** 2026-03-15
**Next Review:** 2026-06-15
