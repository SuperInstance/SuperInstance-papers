# Disaster Recovery Testing Procedures

## Overview

Regular disaster recovery testing ensures that POLLN colonies can recover from failures within defined RTO/RPO targets.

## Testing Schedule

| Test Type | Frequency | Duration | Participants |
|-----------|-----------|----------|--------------|
| Backup Verification | Daily | Automated | System |
| Restore Validation | Weekly | 30 min | DR Team |
| Failover Drill | Monthly | 2 hours | All Teams |
| Full DR Test | Quarterly | 4 hours | All Teams |
| Red Team Exercise | Annually | 1-2 days | All Teams |

---

## 1. Daily Backup Verification

### Purpose

Ensure all backups are created successfully and can be restored.

### Procedure

```bash
# Automated test script
npm run dr:test:daily-backup

# Manual verification
npm run backup:list -- --status COMPLETED --today
npm run backup:validate -- --latest
npm run backup:integrity-check -- --latest
```

### Success Criteria

- All scheduled backups completed
- All backups pass integrity check
- Latest backup can be restored (dry-run)

### Alerting

```typescript
// Triggers alerts if:
- Any backup fails
- Backup size changes by > 50%
- Backup duration exceeds threshold
- Validation fails
```

---

## 2. Weekly Restore Validation

### Purpose

Verify that backups can be restored successfully.

### Procedure

```bash
# 1. Select random backup from past week
BACKUP_ID=$(npm run backup:list -- --random --days 7 --json | jq -r '.backups[0].id')

# 2. Perform dry-run restore
npm run backup:restore -- $BACKUP_ID --dry-run --validate

# 3. Check consistency
npm run dr:check-consistency -- --backup-id $BACKUP_ID

# 4. Document results
npm run dr:log-test -- --type restore --backup-id $BACKUP_ID
```

### Success Criteria

- Restore validation passes
- No consistency errors
- All components restorable
- RPO target met (backup age < 5 min for incremental)

### Rollback

No rollback needed (dry-run only).

---

## 3. Monthly Failover Drill

### Purpose

Practice failover procedures and measure actual RTO.

### Pre-Test Checklist

- [ ] All stakeholders notified
- [ ] Maintenance window scheduled
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Communication plan ready

### Procedure

#### Phase 1: Preparation (15 min)

```bash
# 1. Document current state
npm run dr:capture-state -- --label pre-failover

# 2. Verify health
npm run dr:health

# 3. Create pre-test backup
npm run backup:create -- --tags pre-failover-test

# 4. Notify team
npm run dr:notify -- --message "Failover drill starting in 5 minutes"
```

#### Phase 2: Execution (15 min target)

```bash
# 1. Trigger failover
START_TIME=$(date +%s)
npm run failover:trigger -- secondary-region-1 \
  --reason "Monthly failover drill" \
  --backup

# 2. Monitor failover
npm run failover:status -- --watch

# 3. Verify success
npm run dr:health -- --region secondary-region-1
END_TIME=$(date +%s)
RTO=$((END_TIME - START_TIME))
```

#### Phase 3: Validation (10 min)

```bash
# 1. Run health checks
npm run dr:health -- --region secondary-region-1

# 2. Run smoke tests
npm run dr:smoke-test -- --region secondary-region-1

# 3. Verify data integrity
npm run dr:check-consistency -- --region secondary-region-1

# 4. Measure RPO
npm run backup:list -- --latest --region secondary-region-1
```

#### Phase 4: Cleanup (20 min)

```bash
# 1. Failback to primary
npm run failover:failback -- --target us-east-1 --validate

# 2. Verify primary health
npm run dr:health

# 3. Sync any data differences
npm run replication:sync -- --source secondary-region-1 --target us-east-1

# 4. Document results
npm run dr:log-results -- --rto $RTO --rpo $RPO
```

### Success Criteria

- RTO < 15 minutes
- RPO < 5 minutes
- No data loss
- All health checks pass
- No user-facing errors

### Rollback Procedure

If failover fails:

```bash
# 1. Stop failover
npm run failover:cancel

# 2. Restore from pre-test backup
npm run backup:restore -- <pre-test-backup-id> --mode rollback

# 3. Verify primary health
npm run dr:health

# 4. Document failure
npm run dr:log-failure -- --reason "<description>"
```

---

## 4. Quarterly Full DR Test

### Purpose

Comprehensive test of all DR capabilities including cold restore.

### Scope

- Backup creation
- Cross-region restore
- Cold standby provisioning
- Data validation
- User access validation
- Performance validation

### Timeline

| Activity | Duration |
|-----------|----------|
| Preparation | 30 min |
| Backup Test | 30 min |
| Restore Test | 60 min |
| Validation | 45 min |
| Cleanup | 30 min |
| Documentation | 45 min |
| **Total** | **4 hours** |

### Procedure

#### Part 1: Backup System Test (45 min)

```bash
# 1. Test all backup types
npm run backup:create -- --type full
npm run backup:create -- --type incremental
npm run backup:create -- --type snapshot

# 2. Test backup retention
npm run backup:apply-retention

# 3. Test backup scheduling
npm run backup:test-schedule

# 4. Validate all backups
npm run backup:validate-all
```

#### Part 2: Restore System Test (60 min)

```bash
# 1. Test full restore to test environment
npm run backup:restore -- <latest-full-backup> \
  --mode full \
  --target colony-test \
  --validate

# 2. Test incremental restore
npm run backup:restore -- <latest-incremental-backup> \
  --mode full \
  --target colony-test \
  --validate

# 3. Test selective restore
npm run backup:restore -- <latest-backup> \
  --mode selective \
  --components AGENTS,SYNAPSES \
  --target colony-test

# 4. Test point-in-time recovery
npm run backup:restore -- <backup-id> \
  --mode rollback \
  --validate
```

#### Part 3: Cold Standby Test (60 min)

```bash
# 1. Provision new colony in DR region
npm run colony:provision -- --region eu-west-1 --name dr-test

# 2. Restore from backup to DR region
npm run backup:restore -- <latest-backup> \
  --target colony-dr-test \
  --target-region eu-west-1

# 3. Verify DR colony functionality
npm run dr:health -- --region eu-west-1
npm run smoke-test -- --region eu-west-1

# 4. Test cleanup
npm run colony:destroy -- --region eu-west-1 --name dr-test
```

#### Part 4: Failover Test (30 min)

```bash
# 1. Test automatic failover
npm run failover:test-auto -- --scenario colony-failure

# 2. Test manual failover
npm run failover:trigger -- test-region --reason "DR test"

# 3. Test failback
npm run failover:failback -- --target primary --validate
```

#### Part 5: Data Validation (30 min)

```bash
# 1. Verify backup integrity
npm run backup:verify-integrity -- --all

# 2. Verify data consistency
npm run dr:check-consistency -- --detailed

# 3. Verify no data loss
npm run dr:compare-state -- --backup <backup-id>

# 4. Verify checksums
npm run backup:verify-checksums -- --all
```

### Success Criteria

- All backup types functional
- All restore modes successful
- Cold standby provisionable within 60 min
- Data integrity verified
- No data loss detected
- Performance within acceptable bounds
- RTO < 15 min for hot standby
- RTO < 60 min for cold standby
- RPO < 5 min

### Test Report Template

```markdown
# DR Test Report - QX 2026

## Executive Summary
- Date: [Date]
- Test Type: Quarterly DR Test
- Overall Result: [PASS/FAIL]
- RTO Achieved: [X] minutes
- RPO Achieved: [X] minutes

## Test Results

### Backup System
- Full Backup: [PASS/FAIL]
- Incremental Backup: [PASS/FAIL]
- Snapshot Backup: [PASS/FAIL]
- Retention Policy: [PASS/FAIL]
- Backup Integrity: [PASS/FAIL]

### Restore System
- Full Restore: [PASS/FAIL]
- Incremental Restore: [PASS/FAIL]
- Selective Restore: [PASS/FAIL]
- Point-in-Time Recovery: [PASS/FAIL]

### Failover System
- Automatic Failover: [PASS/FAIL]
- Manual Failover: [PASS/FAIL]
- Failback: [PASS/FAIL]

### Cold Standby
- Provisioning: [PASS/FAIL]
- Restore to Cold Standby: [PASS/FAIL]
- Time to Operational: [X] minutes

### Data Integrity
- Consistency Check: [PASS/FAIL]
- Data Loss Check: [PASS/FAIL]
- Checksum Validation: [PASS/FAIL]

## Issues Found
1. [Issue description]
2. [Issue description]

## Action Items
1. [Action item]
2. [Action item]

## Recommendations
1. [Recommendation]
2. [Recommendation]

## Next Test Date
[Date]
```

---

## 5. Annual Red Team Exercise

### Purpose

Simulate realistic disaster scenario to test full DR capabilities.

### Scenario Examples

1. **Ransomware Attack**
   - Data encryption detected
   - Backup contamination
   - Need for clean restore

2. **Region-Wide Outage**
   - Complete AWS region failure
   - Multi-site dependency issues
   - DNS and network complications

3. **Data Corruption Cascade**
   - Corrupted data replicated
   - Need to identify clean recovery point
   - Transaction replay challenges

4. ** Insider Threat**
   - Malicious admin activity
   - Backup deletion
   - Access control issues

### Exercise Structure

#### Phase 1: Planning (2 weeks)

- Define scenario
- Set objectives
- Schedule participants
- Prepare environment

#### Phase 2: Execution (1-2 days)

- Inject disaster
- Monitor response
- Introduce complications
- Track metrics

#### Phase 3: Analysis (1 week)

- Review response
- Identify gaps
- Document lessons
- Update procedures

### Success Metrics

- Detection time
- Response time
- Recovery time
- Data loss amount
- Communication effectiveness
- Procedure adherence

---

## Test Environment Setup

### Dedicated Test Colony

```bash
# Provision test colony
npm run colony:provision -- --name dr-test \
  --environment testing \
  --region us-east-1 \
  --size small

# Configure test storage
npm run storage:setup -- --bucket polln-dr-test

# Initialize test data
npm run dr:populate-test-data
```

### Test Data

```bash
# Generate synthetic test data
npm run dr:generate-test-data -- --agents 100 \
  --synapses 500 \
  --days 30

# Validate test data
npm run dr:validate-test-data
```

---

## Continuous Testing

### Automated Tests

```typescript
// Run automatically
- Backup integrity checks (daily)
- Health verification (hourly)
- Replication lag checks (continuous)

// Alert on failure
- Backup failures
- Health check failures
- Replication lag > threshold
```

### Chaos Engineering

```bash
# Random failure injection
npm run chaos:inject -- --type random \
  --frequency daily \
  --severity low

# Specific failure scenarios
npm run chaos:inject -- --type network-partition \
  --regions us-east-1,us-west-2
npm run chaos:inject -- --type agent-failure \
  --percentage 20
npm run chaos:inject -- --type storage-latency \
  --latency 5000
```

---

## Documentation

### Test Logs

All tests must be logged:

```bash
# Log test start
npm run dr:log-test -- --start \
  --type <test-type> \
  --participants <participants>

# Log test results
npm run dr:log-test -- --complete \
  --result <result> \
  --rto <rto> \
  --rpo <rpo> \
  --issues <issues>
```

### Post-Mortem

For failed tests:

1. Timeline of events
2. Root cause analysis
3. Impact assessment
4. Action items
5. Prevention measures

---

## Test Maintenance

### Monthly

- Review test results
- Update test procedures
- Address action items
- Train team members

### Quarterly

- Revise test scenarios
- Update success criteria
- Adjust test environment
- Refresh test data

### Annually

- Major test procedure overhaul
- Update all documentation
- Red team exercise planning
- Full DR capability review
