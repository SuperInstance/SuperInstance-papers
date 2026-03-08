# Disaster Recovery Runbooks

## Overview

This document contains operational runbooks for handling disaster scenarios in POLLN colonies.

## Table of Contents

1. [Colony Failure](#colony-failure)
2. [Region Failure](#region-failure)
3. [Data Corruption](#data-corruption)
4. [Backup Failure](#backup-failure)
5. [Network Partition](#network-partition)
6. [Complete Site Loss](#complete-site-loss)

---

## Colony Failure

### Symptoms

- Colony unresponsive to health checks
- All agents returning errors
- High error rate (> 10%)
- Resource exhaustion

### Diagnosis

```bash
# Check colony health
npm run dr:health

# Check agent status
npm run agents:list

# Check resource usage
npm run resources:stats

# View logs
npm run logs:tail -- --level ERROR
```

### Resolution Steps

#### 1. Quick Recovery (Attempt First)

```bash
# 1. Check if colony is just stuck
npm run colony:ping

# 2. Attempt graceful restart
npm run colony:restart -- --graceful

# 3. Monitor recovery
npm run dr:health -- --watch
```

#### 2. If Quick Recovery Fails

```bash
# 1. Trigger automatic failover (if configured)
npm run failover:trigger -- secondary-region-1 \
  --reason "Colony failure - quick recovery failed"

# 2. Monitor failover progress
npm run failover:status -- --watch

# 3. Verify colony health in new region
npm run dr:health -- --region secondary-region-1
```

#### 3. Manual Failover (If Automatic Fails)

```bash
# 1. Create emergency backup
npm run backup:create -- --type snapshot \
  --tags emergency --reason "Pre-failover backup"

# 2. Stop primary colony
npm run colony:stop -- --force

# 3. Promote standby colony
npm run colony:promote -- --region secondary-region-1

# 4. Update DNS
npm run dns:update -- --region secondary-region-1

# 5. Verify
npm run dr:health
```

### Estimated RTO

- Quick Recovery: 1-2 minutes
- Automatic Failover: 5 minutes
- Manual Failover: 15-30 minutes

### Post-Incident Actions

1. Document root cause
2. Update monitoring/alerts
3. Test recovery procedures
4. Review failover logs

---

## Region Failure

### Symptoms

- Entire region unreachable
- Network timeouts to all services
- Storage unavailable
- DNS resolution failures

### Diagnosis

```bash
# Check region health
npm run dr:regional-health -- --region us-east-1

# Check connectivity to storage
npm run storage:test -- --region us-east-1

# Check network routing
npm run network:trace -- --region us-east-1
```

### Resolution Steps

#### 1. Confirm Region Failure

```bash
# Multiple independent checks
curl https://us-east-1.polln.internal/health
curl https://backup-storage-us-east-1.s3.amazonaws.com/health
ping us-east-1.polln.internal

# If all fail, declare region failure
```

#### 2. Initiate Cross-Region Failover

```bash
# 1. Trigger failover to healthy region
npm run failover:trigger -- us-west-2 \
  --reason "Region failure - us-east-1 unreachable" \
  --backup

# 2. Monitor failover
npm run failover:status -- --watch

# 3. Verify in new region
npm run dr:health -- --region us-west-2
npm run colony:status -- --region us-west-2
```

#### 3. Update Global Configuration

```bash
# 1. Update DNS records
npm run dns:update -- --primary us-west-2

# 2. Update load balancer
npm run lb:update -- --disable us-east-1 --enable us-west-2

# 3. Update monitoring configuration
npm run monitoring:update-config -- --primary us-west-2
```

### Estimated RTO

- Detection: 1-2 minutes
- Failover: 5-10 minutes
- Verification: 2-3 minutes
- **Total: 10-15 minutes**

### Recovery to Original Region

```bash
# 1. Verify original region is healthy
npm run dr:regional-health -- --region us-east-1

# 2. Sync data back to original region
npm run replication:sync -- --source us-west-2 --target us-east-1

# 3. Perform controlled failback
npm run failover:failback -- --target us-east-1 --validate

# 4. Update DNS back
npm run dns:update -- --primary us-east-1
```

---

## Data Corruption

### Symptoms

- Inconsistent agent states
- Value network anomalies
- Checksum validation failures
- Unexpected behavior in decisions

### Diagnosis

```bash
# 1. Run consistency checks
npm run dr:check-consistency

# 2. Validate backups
npm run backup:validate -- --latest

# 3. Check audit logs for anomalies
npm run audit:check -- --since "1 hour ago"

# 4. Compare with known good state
npm run state:compare -- --backup <good-backup-id>
```

### Resolution Steps

#### 1. Identify Extent of Corruption

```bash
# Check what's corrupted
npm run dr:check-consistency -- --detailed

# Determine affected components
npm run dr:diagnose -- --component agents,synapses,value-network
```

#### 2. Determine Recovery Point

```bash
# Find last known good backup
npm run backup:list -- --before $(date -d '2 hours ago' +%s) \
  --status COMPLETED

# Validate backup integrity
npm run backup:validate -- <backup-id>
```

#### 3. Perform Point-in-Time Recovery

```bash
# 1. Stop colony to prevent further corruption
npm run colony:stop

# 2. Create backup of current (corrupted) state
npm run backup:create -- --type snapshot --tags corrupted-state

# 3. Restore from good backup
npm run backup:restore -- <good-backup-id> \
  --mode rollback \
  --validate

# 4. Replay transactions after recovery point
npm run audit:replay -- --since <backup-timestamp>

# 5. Start colony
npm run colony:start

# 6. Verify
npm run dr:health
npm run dr:check-consistency
```

### Estimated RTO

- Detection: 15-30 minutes
- Recovery: 30-45 minutes
- Verification: 15 minutes
- **Total: 60-90 minutes**

### Prevention

1. Enable continuous consistency checking
2. Implement audit logging
3. Regular backup validation
4. Automated corruption detection

---

## Backup Failure

### Symptoms

- Scheduled backups failing
- Backup validation errors
- Storage unreachable
- Backup size anomalies

### Diagnosis

```bash
# Check backup status
npm run backup:list -- --status FAILED --limit 10

# Check storage connectivity
npm run storage:test

# Check backup logs
npm run logs:tail -- --component backup --level ERROR
```

### Resolution Steps

#### 1. Identify Failure Type

```bash
# Storage issue?
npm run storage:test

# Permission issue?
npm run storage:check-permissions

# Resource issue?
npm run resources:check

# Configuration issue?
npm run backup:validate-config
```

#### 2. Fix Underlying Issue

```bash
# Example: Fix storage permissions
aws s3api put-bucket-acl \
  --bucket polln-backups \
  --grant-write AWS:id:<backup-service-account>

# Example: Clear stuck backup
npm run backup:cancel -- <stuck-backup-id>
```

#### 3. Create Catch-up Backup

```bash
# Create full backup immediately
npm run backup:create -- --type full --tags catch-up

# Validate backup
npm run backup:validate -- <new-backup-id>

# Verify backup chain integrity
npm run backup:verify-chain -- <new-backup-id>
```

#### 4. Verify Backup Schedule

```bash
# Check scheduler status
npm run backup:schedule-status

# Restart scheduler if needed
npm run backup:schedule-restart
```

### Estimated RTO

- Issue Resolution: 15-30 minutes
- Catch-up Backup: 10-20 minutes
- Validation: 5 minutes
- **Total: 30-60 minutes**

---

## Network Partition

### Symptoms

- Colony can't reach backup storage
- Agents can't communicate
- Split-brain scenarios
- Inconsistent state across regions

### Diagnosis

```bash
# Check network connectivity
npm run network:check -- --all-regions

# Check quorum
npm run cluster:quorum

# Check for split-brain
npm run cluster:check-split-brain
```

### Resolution Steps

#### 1. Identify Partition Scope

```bash
# Which regions are affected?
npm run network:check -- --all-regions

# Can any region form quorum?
npm run cluster:find-quorum
```

#### 2. If Primary Region Is Partitioned

```bash
# 1. Check if primary can still function
npm run dr:health -- --region us-east-1

# 2. If not, trigger failover from healthy region
npm run failover:trigger -- us-west-2 \
  --reason "Network partition - primary isolated"

# 3. Resolve partition when network heals
npm run network:resolve-partition -- --primary us-east-1
```

#### 3. If Split-Brain Occurs

```bash
# 1. Identify which region has quorum
npm run cluster:find-quorum

# 2. Fence non-quorum regions
npm run cluster:fence -- --region <non-quorum-region>

# 3. Merge states when network heals
npm run cluster:merge-state -- --primary <quorum-region>

# 4. Resolve conflicts
npm run cluster:resolve-conflicts -- --strategy last-write-wins
```

### Estimated RTO

- Detection: 1-2 minutes
- Failover: 3-5 minutes
- Merge/Resolution: 5-10 minutes
- **Total: 10-20 minutes**

---

## Complete Site Loss

### Symptoms

- Entire data center unavailable
- No access to infrastructure
- All services in region down
- No backups accessible in-region

### Resolution Steps

#### 1. Activate DR Plan

```bash
# 1. Declare disaster
npm run dr:declare-disaster -- --region us-east-1 \
  --reason "Complete site loss"

# 2. Activate cold standby in different region
npm run dr:activate-standby -- --region eu-west-1

# 3. Restore from offsite backups
npm run backup:restore -- <latest-offsite-backup> \
  --mode full \
  --target-region eu-west-1 \
  --validate
```

#### 2. Provision Infrastructure

```bash
# 1. Provision new colony infrastructure
npm run infra:provision -- --region eu-west-1 \
  --size production

# 2. Configure networking
npm run network:setup -- --region eu-west-1

# 3. Configure storage
npm run storage:setup -- --region eu-west-1
```

#### 3. Restore Operations

```bash
# 1. Start restored colony
npm run colony:start -- --region eu-west-1

# 2. Update DNS to point to new region
npm run dns:emergency-update -- --region eu-west-1

# 3. Verify operations
npm run dr:health -- --region eu-west-1
npm run smoke-test
```

### Estimated RTO

- Declaration: 5 minutes
- Provisioning: 30-45 minutes
- Restore: 20-30 minutes
- Verification: 10 minutes
- **Total: 60-90 minutes**

### Post-Disaster

1. Assess damage to primary site
2. Decide whether to rebuild or relocate
3. Update DR documentation
4. Conduct post-mortem
5. Test all DR procedures

---

## Communication During Incidents

### Internal Communication

1. **Immediately**
   - Notify on-call engineer
   - Post to #incidents Slack channel
   - Create incident ticket

2. **Every 15 Minutes**
   - Update incident status
   - Post progress to Slack
   - Update incident ticket

3. **Resolution**
   - Post summary to Slack
   - Complete incident ticket
   - Schedule post-mortem

### External Communication (If User-Impact)

1. **Initial Impact**
   - Update status page
   - Post service alert
   - Estimate resolution time

2. **Updates**
   - Update status page hourly
   - Send email updates for major incidents

3. **Resolution**
   - Post incident summary
   - Update status page to "All Systems Operational"

---

## Runbook Maintenance

### Monthly

- Review runbook accuracy
- Update contact information
- Test critical procedures
- Update based on lessons learned

### Quarterly

- Full runbook audit
- Update all procedures
- Test all runbooks
- Training for on-call team

### Annually

- Major runbook revision
- Red team exercises
- Complete DR testing
- Documentation overhaul
