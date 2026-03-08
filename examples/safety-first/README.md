# Guardian Angel Showcase

A comprehensive demonstration of POLLN's Guardian Angel safety system for financial transaction monitoring.

## What It Does

This example demonstrates all 20+ safety constraints in action through a realistic financial transaction monitoring system:

1. **Constitutional Constraints** - 20+ safety rules categorized by domain
2. **Adaptive Learning** - System learns from safety violations
3. **Emergency Override** - Kill switch and rollback mechanisms
4. **Compliance Reporting** - Detailed audit logs and reports

## Key Features Demonstrated

### 1. All 20+ Safety Constraints

**Harm Prevention (3 constraints)**
- Prevent financial harm to users
- Block unauthorized transactions
- Prevent system-induced losses

**Human Autonomy (4 constraints)**
- Require human approval for high-value transactions
- Maintain human override capability
- Preserve user agency
- Enable human intervention

**Privacy (3 constraints)**
- Protect sensitive financial data
- Implement data minimization
- Ensure confidentiality

**Truthfulness (3 constraints)**
- Provide accurate transaction assessments
- Avoid false positives
- Maintain transparency

**Fairness (3 constraints)**
- Apply rules consistently
- Avoid discrimination
- Ensure equal treatment

**Safety (3 constraints)**
- Maintain system stability
- Prevent cascading failures
- Ensure availability

**Oversight (3 constraints)**
- Log all decisions
- Enable audit trails
- Support compliance

### 2. Adaptive Learning System
- Learns from past violations
- Adjusts sensitivity based on patterns
- Improves detection accuracy over time

### 3. Emergency Override Scenarios
- Kill switch activation
- Automatic rollback to safe state
- Emergency notification system

### 4. Compliance Reporting
- Detailed audit logs
- Compliance score calculation
- Regulatory report generation

## How to Run

```bash
# From the examples directory
cd safety-first
npm install
npm start
```

## Example Output

```
Guardian Angel Safety Showcase
==============================

Initializing Guardian Angel system with 20+ constitutional constraints...

Constitutional Constraints Loaded:
  Harm Prevention (3):
    ✓ prevent_financial_harm - BLOCK, cannot override
    ✓ block_unauthorized_transactions - BLOCK, cannot override
    ✓ prevent_system_losses - BLOCK, cannot override

  Human Autonomy (4):
    ✓ require_human_approval - WARN, can override
    ✓ maintain_human_override - BLOCK, cannot override
    ✓ preserve_user_agency - WARN, can override
    ✓ enable_human_intervention - BLOCK, cannot override

  Privacy (3):
    ✓ protect_sensitive_data - BLOCK, cannot override
    ✓ implement_data_minimization - WARN, can override
    ✓ ensure_confidentiality - BLOCK, cannot override

  Truthfulness (3):
    ✓ provide_accurate_assessments - WARN, can override
    ✓ avoid_false_positives - LOG, can override
    ✓ maintain_transparency - WARN, can override

  Fairness (3):
    ✓ apply_rules_consistently - BLOCK, cannot override
    ✓ avoid_discrimination - BLOCK, cannot override
    ✓ ensure_equal_treatment - WARN, can override

  Safety (3):
    ✓ maintain_system_stability - BLOCK, cannot override
    ✓ prevent_cascading_failures - ESCALATE, cannot override
    ✓ ensure_availability - BLOCK, cannot override

  Oversight (3):
    ✓ log_all_decisions - LOG, cannot override
    ✓ enable_audit_trails - BLOCK, cannot override
    ✓ support_compliance - BLOCK, cannot override

Total: 23 constitutional constraints
Kill Switch: ENABLED (timeout: 5000ms, auto-recover: true)
Rollback: ENABLED (max checkpoints: 10, interval: 60000ms)

============================
PHASE 1: NORMAL TRANSACTIONS
============================

Processing 10 normal financial transactions...

Transaction 1/10: T-001 - $1,250.00
  Account: ACC-123456
  Type: POS Purchase
  Merchant: Amazon
  Location: Seattle, WA

  Safety Check Results:
    ✓ prevent_financial_harm: PASSED (normal amount)
    ✓ require_human_approval: PASSED (below threshold)
    ✓ protect_sensitive_data: PASSED (data encrypted)
    ✓ apply_rules_consistently: PASSED (consistent with history)
    ✓ maintain_system_stability: PASSED (system healthy)

  All 23 constraints PASSED
  Action: APPROVED
  Confidence: 0.92

Transaction 2/10: T-002 - $89.50
  Account: ACC-789012
  Type: Online Purchase
  Merchant: Netflix
  Location: Austin, TX

  Safety Check Results:
    ✓ prevent_financial_harm: PASSED (normal amount)
    ✓ require_human_approval: PASSED (below threshold)
    ✓ protect_sensitive_data: PASSED (data encrypted)
    ✓ apply_rules_consistently: PASSED (consistent with history)
    ✓ maintain_system_stability: PASSED (system healthy)

  All 23 constraints PASSED
  Action: APPROVED
  Confidence: 0.95

[... 8 more normal transactions processed ...]

Normal Transaction Results:
  Processed: 10/10
  Approved: 10
  Flagged: 0
  Blocked: 0
  Average processing time: 45ms

============================
PHASE 2: SUSPICIOUS TRANSACTIONS
============================

Processing 10 suspicious financial transactions...

Transaction 1/10: T-101 - $15,750.00
  Account: ACC-999999
  Type: Wire Transfer
  Merchant: Unknown Entity
  Location: Offshore

  Safety Check Results:
    ✗ prevent_financial_harm: FAILED (high-risk transaction)
    ✗ require_human_approval: FAILED (exceeds $10,000 threshold)
    ✓ protect_sensitive_data: PASSED (data encrypted)
    ✗ avoid_false_positives: WARNING (unusual pattern)
    ✓ maintain_system_stability: PASSED (system healthy)

  Constraints Passed: 20/23
  Constraints Failed: 3/23
  Action: FLAGGED FOR REVIEW
  Reason: High-value transaction requires human approval
  Severity: HIGH

  ➜ Adaptive Learning: Pattern stored for future detection
  ➜ Human notified: security@bank.com

Transaction 2/10: T-102 - $0.01
  Account: ACC-000001
  Type: ACH Transfer
  Merchant: Test Account
  Location: Unknown

  Safety Check Results:
    ✗ block_unauthorized_transactions: FAILED (suspicious pattern)
    ✓ require_human_approval: PASSED (below threshold)
    ✗ protect_sensitive_data: WARNING (data exposure risk)
    ✗ avoid_discrimination: WARNING (potential profiling)
    ✓ maintain_system_stability: PASSED (system healthy)

  Constraints Passed: 20/23
  Constraints Failed: 3/23
  Action: BLOCKED
  Reason: Unauthorized transaction attempt detected
  Severity: CRITICAL

  ➜ Adaptive Learning: Attack pattern stored
  ➜ Account frozen: ACC-000001
  ➜ Human notified: fraud@bank.com, security@bank.com

Transaction 3/10: T-103 - $25,000.00
  Account: ACC-123456
  Type: Wire Transfer
  Merchant: Unknown Entity
  Location: High-risk jurisdiction

  Safety Check Results:
    ✗ prevent_financial_harm: FAILED (excessive amount)
    ✗ require_human_approval: FAILED (exceeds threshold)
    ✗ maintain_human_override: FAILED (override disabled)
    ✓ protect_sensitive_data: PASSED (data encrypted)
    ✗ prevent_cascading_failures: WARNING (potential cascade)

  Constraints Passed: 19/23
  Constraints Failed: 4/23
  Action: BLOCKED
  Reason: Emergency kill switch triggered
  Severity: CRITICAL

  ⚠ EMERGENCY OVERRIDE ACTIVATED ⚠
  ➜ Kill switch engaged
  ➜ System rolling back to last checkpoint
  ➜ All transactions halted
  ➜ Emergency contacts notified: admin@bank.com, cto@bank.com, security@bank.com

[... 7 more suspicious transactions processed ...]

Suspicious Transaction Results:
  Processed: 10/10
  Approved: 2
  Flagged: 4
  Blocked: 4
  Kill switch activations: 1
  Rollbacks: 1

============================
PHASE 3: ADAPTIVE LEARNING
============================

Adaptive Learning Statistics:

Patterns Learned: 47
  High-value transaction patterns: 12
  Suspicious merchant patterns: 8
  Unusual location patterns: 15
  Account takeover patterns: 6
  Money laundering patterns: 6

Learning Accuracy:
  Initial detection rate: 67.2%
  Current detection rate: 94.8%
  Improvement: +27.6 percentage points

Constraint Violations Over Time:
  Round 1: 23 violations (23.0%)
  Round 2: 15 violations (15.0%)
  Round 3: 8 violations (8.0%)
  Round 4: 3 violations (3.0%)
  Round 5: 1 violation (1.0%)

Adaptive Adjustments:
  ✓ Human approval threshold: $10,000 → $8,500 (lowered for safety)
  ✓ Location risk scoring: Enhanced with 15 new patterns
  ✓ Merchant verification: Added 8 high-risk merchants
  ✓ Account behavior tracking: Implemented 6 takeover patterns
  ✓ Transaction velocity: Enhanced money laundering detection

System Adaptation:
  ✓ Sensitivity increased for high-value transactions
  ✓ False positive rate reduced by 67%
  ✓ Detection accuracy improved by 41%
  ✓ Response time improved by 23%

============================
PHASE 4: COMPLIANCE REPORTING
============================

Generating Compliance Report...

Regulatory Compliance Score: 94.7/100

Breakdown by Category:
  Harm Prevention: 98.5/100 (EXCELLENT)
    All financial harm prevented
    Zero unauthorized transactions processed
    System-induced losses: $0.00

  Human Autonomy: 92.3/100 (GOOD)
    Human approval rate: 100% for high-value
    Override capability: Always available
    User agency: Preserved in 98.5% cases

  Privacy: 96.8/100 (EXCELLENT)
    Data encryption: 100%
    Data minimization: 94.5%
    Confidentiality: 100%

  Truthfulness: 89.2/100 (GOOD)
    Assessment accuracy: 94.8%
    False positive rate: 5.2%
    Transparency: 100%

  Fairness: 91.7/100 (GOOD)
    Consistent application: 97.3%
    Discrimination incidents: 0
    Equal treatment: 95.8%

  Safety: 99.1/100 (EXCELLENT)
    System uptime: 99.9%
    Cascading failures: 0
    Availability: 99.9%

  Oversight: 95.4/100 (EXCELLENT)
    Decision logging: 100%
    Audit trail completeness: 100%
    Compliance support: 100%

Audit Trail Summary:
  Total transactions processed: 20
  Total audit entries: 547
  Decision logs: 20
  Safety checks: 460
  Human notifications: 12
  Emergency activations: 1
  Rollback operations: 1

Top Constraint Violations:
  1. require_human_approval: 4 violations (17.4%)
  2. avoid_false_positives: 2 violations (8.7%)
  3. prevent_cascading_failures: 1 violation (4.3%)
  4. block_unauthorized_transactions: 1 violation (4.3%)
  5. maintain_human_override: 1 violation (4.3%)

Recommendations:
  ✓ Maintain current human approval threshold
  ✓ Continue monitoring false positive patterns
  ✓ Schedule quarterly safety audits
  ✓ Implement additional cascading failure prevention
  ✓ Enhance unauthorized transaction detection

============================
SUMMARY
============================

Guardian Angel Performance:
  Transactions processed: 20
  Approved: 12 (60.0%)
  Flagged: 4 (20.0%)
  Blocked: 4 (20.0%)

  Financial harm prevented: $125,750.00
  Unauthorized transactions blocked: 2
  Human interventions required: 4
  System uptime: 100%

Safety Constraints:
  Total constraints: 23
  Constraints enforced: 100%
  Cannot override: 17 (74.0%)
  Can override: 6 (26.0%)

  Total safety checks performed: 460
  Checks passed: 413 (89.8%)
  Checks failed: 47 (10.2%)

Emergency Features:
  Kill switch activations: 1
  Successful rollbacks: 1
  Average rollback time: 1.2s
  Emergency notifications sent: 3

Compliance:
  Regulatory compliance score: 94.7/100
  Audit trail completeness: 100%
  Decision transparency: 100%

Demo complete!
```

## Architecture

### Safety Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Constitutional Constraints                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Harm         │  │ Privacy      │  │ Truthfulness │      │
│  │ Prevention   │  │ Protection   │  │ & Accuracy   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Human        │  │ Fairness     │  │ System       │      │
│  │ Autonomy     │  │ & Equality   │  │ Safety       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐                                           │
│  │ Oversight    │                                           │
│  │ & Audit      │                                           │
│  └──────────────┘                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Safety Engine   │
                  │ - Discriminate  │
                  │ - Check         │
                  │ - Log           │
                  │ - Act           │
                  └────────┬────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  BLOCK   │    │  WARN    │    │   LOG    │
    └──────────┘    └──────────┘    └──────────┘
           │               │               │
           └───────────────┴───────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Kill Switch    │
                  │  & Rollback     │
                  └─────────────────┘
```

### Adaptive Learning Flow

```
Transaction Event
       │
       ▼
┌─────────────────┐
│ Safety Check    │
│ 23 constraints  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  Pass      Fail
    │         │
    │         ▼
    │    ┌─────────┐
    │    │ Learn   │
    │    │ Pattern │
    │    └────┬────┘
    │         │
    │         ▼
    │    ┌─────────┐
    │    │ Adjust │
    │    │ Sensing │
    │    └────┬────┘
    │         │
    └────┬────┘
         │
         ▼
   Improved Detection
```

## Configuration

Edit `config.ts` to customize:

- **constitutionalConstraints**: Add/remove safety rules
- **killSwitchConfig**: Emergency override settings
- **rollbackConfig**: Checkpoint and rollback behavior
- **adaptiveLearning**: Learning rate and pattern storage
- **transactionTypes**: Define transaction categories

## Extension Ideas

- Add real-time fraud detection APIs
- Implement blockchain integration
- Add multi-jurisdictional compliance
- Create custom compliance reports
- Implement predictive risk scoring
- Add biometric authentication
