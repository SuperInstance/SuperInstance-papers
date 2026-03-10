# Backup and Disaster Recovery Strategy

**Comprehensive BDR Plan for POLLN Spreadsheet LOG System**

---

## Executive Summary

This document defines the complete backup and disaster recovery (BDR) strategy for the POLLN Spreadsheet LOG System. The strategy ensures business continuity, data durability, and rapid recovery from failures while optimizing costs through tiered storage and intelligent lifecycle management.

**Key Metrics**:
- **RTO (Recovery Time Objective)**: 1-4 hours depending on service tier
- **RPO (Recovery Point Objective)**: 0-15 minutes depending on data criticality
- **Data Durability**: 99.999999999% (11 nines)
- **Annual Availability Target**: 99.95%+

---

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Backup Technologies](#backup-technologies)
3. [Storage Tiers](#storage-tiers)
4. [Retention Policies](#retention-policies)
5. [Restore Procedures](#restore-procedures)
6. [Disaster Recovery](#disaster-recovery)
7. [Automation](#automation)
8. [Cost Optimization](#cost-optimization)
9. [RTO/RPO Matrix](#rtorpo-matrix)
10. [DR Runbook Templates](#dr-runbook-templates)

---

## Backup Strategy

### 1. Database Backups

#### Primary Database (RDS PostgreSQL)

**Continuous Backup**:
```yaml
ContinuousBackup:
  enabled: true
  retention_period: 35 days
  point_in_time_recovery: true
  granularity: 1 second
```

**Daily Snapshots**:
```yaml
DailySnapshots:
  schedule: "03:00 UTC"
  retention: 90 days
  compression: true
  encryption: AES-256
```

**Weekly Full Backups**:
```yaml
WeeklyFull:
  schedule: "Sunday 02:00 UTC"
  retention: 52 weeks
  storage_class: STANDARD_IA
```

**Cross-Region Replication**:
```yaml
CrossRegion:
  enabled: true
  source: us-east-1
  destination: us-west-2
  replication_delay: < 1 hour
```

#### Database Types and Backup Strategies

| Database Type | Backup Method | Frequency | Retention | RPO |
|--------------|--------------|-----------|-----------|-----|
| PostgreSQL (RDS) | Automated + PITR | Continuous | 35 days | 0s |
| MongoDB (DocumentDB) | Automated + Snapshots | Continuous | 35 days | 0s |
| Redis (ElastiCache) | Snapshots | Hourly | 7 days | 1h |
| DynamoDB | On-demand + PITR | Continuous | 35 days | 0s |

#### Backup Commands

```bash
# Manual RDS snapshot creation
aws rds create-db-snapshot \
  --db-instance-identifier polln-production \
  --db-snapshot-id polln-manual-$(date +%Y%m%d-%H%M%S)

# Point-in-time restore
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier polln-production \
  --target-db-instance-identifier polln-restored \
  --restore-time 2025-03-09T14:30:00Z

# Export snapshot to S3
aws rds start-export-task \
  --source-arn arn:aws:rds:us-east-1:123456789012:snapshot:polln-manual \
  --s3-bucket-name polln-backups \
  --iam-role-arn arn:aws:iam::123456789012:role/ExportRole
```

---

### 2. File System Backups

#### EBS Volumes (Application Storage)

**Snapshot Strategy**:
```yaml
EBSSnapshots:
  frequent:
    schedule: "Every 4 hours"
    retention: 7 days
    storage_class: STANDARD

  daily:
    schedule: "03:00 UTC"
    retention: 30 days
    storage_class: STANDARD_IA

  weekly:
    schedule: "Sunday 02:00 UTC"
    retention: 12 weeks
    storage_class: GLACIER
```

**Lifecycle Policy**:
```json
{
  "Rules": [
    {
      "RuleId": "EBS-Lifecycle",
      "Description": "Transition snapshots to cold storage",
      "ResourceTypes": ["volume"],
      "Schedule": {
        "CreateRule": {
          "Interval": 24,
          "IntervalUnit": "HOURS"
        },
        "RetainRule": {
          "Count": 30
        },
        "FastRestoreRule": {
          "Count": 7,
          "Interval": 12,
          "IntervalUnit": "HOURS"
        }
      }
    }
  ]
}
```

#### EFS (Shared File System)

**Backup Configuration**:
```yaml
EFSBackup:
  enabled: true
  schedule:
    - cron: "cron(0 3 * * ? *)"
      retention: 90 days

  cross_region:
    enabled: true
    destination: us-west-2
    copy_schedule: "Sunday 04:00 UTC"
```

**AWS Backup Policy for EFS**:
```json
{
  "BackupPlan": {
    "BackupPlanName": "EFS-Daily-Backup",
    "Rules": [
      {
        "RuleName": "Daily-90-Day",
        "TargetBackupVault": "PollnBackupVault",
        "ScheduleExpression": "cron(0 3 * * ? *)",
        "Lifecycle": {
          "DeleteAfter": 90
        },
        "CopyActions": [
          {
            "DestinationBackupVaultArn": "arn:aws:backup:us-west-2:123456789012:backup-vault:PollnDRVault",
            "Lifecycle": {
              "DeleteAfter": 90
            }
          }
        ]
      }
    ]
  }
}
```

---

### 3. Configuration Backups

#### Infrastructure as Code (IaC)

```yaml
ConfigurationBackup:
  sources:
    - CloudFormation templates
    - Terraform state files
    - Helm charts
    - Kubernetes manifests

  storage:
    type: S3
    bucket: polln-config-backups
    versioning: enabled
    encryption: AES-256

  schedule:
    - on_change: immediate
    - periodic: every 6 hours
```

**Automated Configuration Backup Script**:
```typescript
// scripts/backup-config.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudFormationClient, ExportStackCommand } from '@aws-sdk/client-cloudformation';
import * as fs from 'fs/promises';

const s3 = new S3Client({});
const cf = new CloudFormationClient({});

async function backupConfiguration() {
  const timestamp = new Date().toISOString();

  // Backup CloudFormation templates
  const stacks = ['polln-production', 'polln-database', 'polln-networking'];

  for (const stackName of stacks) {
    const template = await cf.send(
      new ExportStackCommand({ StackName: stackName })
    );

    await s3.send(new PutObjectCommand({
      Bucket: 'polln-config-backups',
      Key: `cloudformation/${stackName}/${timestamp}.json`,
      Body: JSON.stringify(template),
    }));
  }

  // Backup Terraform state
  const tfState = await fs.readFile('terraform/terraform.tfstate');
  await s3.send(new PutObjectCommand({
    Bucket: 'polln-config-backups',
    Key: `terraform/${timestamp}.tfstate`,
    Body: tfState,
  }));

  console.log('Configuration backup complete');
}
```

---

### 4. Secret Backups

#### AWS Secrets Manager

```yaml
SecretsBackup:
  enabled: true
  encryption: KMS
  rotation: automatic

  backup_schedule:
    - before_rotation: true
    - on_change: true
    - periodic: daily

  storage:
    type: S3
    bucket: polln-secret-backups
    encryption: KMS
    access: IAM-restricted
```

**Secret Backup with Encryption**:
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { KMSClient, EncryptCommand } from '@aws-sdk/client-kms';

async function backupSecrets() {
  const secrets = await client.send(new ListSecretsCommand({}));

  for (const secret of secrets.SecretList) {
    const value = await client.send(new GetSecretValueCommand({
      SecretId: secret.ARN,
    }));

    // Encrypt with KMS before storing
    const encrypted = await kms.send(new EncryptCommand({
      KeyId: 'alias/polln-backup-key',
      Plaintext: Buffer.from(value.SecretString),
    }));

    await s3.send(new PutObjectCommand({
      Bucket: 'polln-secret-backups',
      Key: `secrets/${secret.Name}/${Date.now()}.enc`,
      Body: encrypted.CiphertextBlob,
      Encryption: 'aws:kms',
    }));
  }
}
```

---

### 5. Application State Backups

#### Cell State Snapshots

```yaml
CellStateBackup:
  enabled: true
  format: JSON

  incremental:
    schedule: every 5 minutes
    retention: 24 hours

  full:
    schedule: hourly
    retention: 7 days

  compression: gzip
  encryption: AES-256
```

**Cell State Backup Implementation**:
```typescript
import { LogCell } from '@polln/spreadsheet/core';

interface CellStateSnapshot {
  timestamp: number;
  cells: Array<{
    id: string;
    type: string;
    position: { row: number; col: number };
    state: string;
    head: any;
    body: any;
    tail: any;
  }>;
}

async function backupCellState(cells: Map<string, LogCell>): Promise<void> {
  const snapshot: CellStateSnapshot = {
    timestamp: Date.now(),
    cells: Array.from(cells.values()).map(cell => ({
      id: cell.id,
      type: cell.type,
      position: cell.position,
      state: cell.state,
      head: cell.head,
      body: cell.body,
      tail: cell.tail,
    })),
  };

  await s3.send(new PutObjectCommand({
    Bucket: 'polln-cell-state',
    Key: `snapshots/${new Date().toISOString()}.json.gz`,
    Body: gzip(JSON.stringify(snapshot)),
    ContentType: 'application/json',
    ContentEncoding: 'gzip',
  }));
}
```

---

## Backup Technologies

### 1. AWS Backup

**Centralized Backup Management**:
```yaml
AWSBackup:
  vaults:
    production:
      region: us-east-1
      encryption: KMS

    dr:
      region: us-west-2
      encryption: KMS

  plans:
    database-hourly:
      resources:
        - arn:aws:rds:*:*:db:polln-*
      schedule: "cron(0 0/1 * * ? *)"
      retention: 35 days
      copy_to_dr: true

    efs-daily:
      resources:
        - arn:aws:elasticfilesystem:*:*:access-point/fsap-*
      schedule: "cron(0 3 * * ? *)"
      retention: 90 days
      copy_to_dr: true
```

**AWS Backup Policy Example**:
```json
{
  "BackupPlan": {
    "BackupPlanName": "Polln-Production-Plan",
    "AdvancedBackupSettings": [
      {
        "ResourceType": "EC2",
        "BackupOptions": {
          "WindowsVSS": "enabled"
        }
      }
    ],
    "Rules": [
      {
        "RuleName": "Hourly-35-Day",
        "TargetBackupVault": "arn:aws:backup:us-east-1:123456789012:backup-vault:PollnVault",
        "ScheduleExpression": "cron(0 0/1 * * ? *)",
        "StartWindowMinutes": 60,
        "CompletionWindowMinutes": 180,
        "Lifecycle": {
          "DeleteAfter": 35,
          "MoveToColdStorageAfter": 30
        },
        "CopyActions": [
          {
            "DestinationBackupVaultArn": "arn:aws:backup:us-west-2:123456789012:backup-vault:PollnDRVault",
            "Lifecycle": {
              "DeleteAfter": 35
            }
          }
        ]
      }
    ],
    "Resources": [
      "arn:aws:rds:us-east-1:123456789012:db:polln-production",
      "arn:aws:ec2:us-east-1:123456789012:volume/vol-*"
    ]
  }
}
```

---

### 2. Custom Backup Scripts

**Automated Backup Orchestrator**:
```typescript
// scripts/backup-orchestrator.ts
import { Scheduler } from '@polln/utils/scheduler';

class BackupOrchestrator {
  private scheduler: Scheduler;

  constructor() {
    this.scheduler = new Scheduler();
  }

  async start() {
    // Database backups
    this.schedule('database-hourly', '0 * * * *', () => this.backupDatabase());
    this.schedule('database-daily', '0 3 * * *', () => this.createFullSnapshot());

    // Cell state backups
    this.schedule('cells-incremental', '*/5 * * * *', () => this.backupCellStateIncremental());
    this.schedule('cells-full', '0 * * * *', () => this.backupCellStateFull());

    // Configuration backups
    this.schedule('config-periodic', '0 */6 * * *', () => this.backupConfiguration());

    // Secrets backup
    this.schedule('secrets-daily', '0 4 * * *', () => this.backupSecrets());
  }

  private schedule(name: string, cron: string, handler: () => Promise<void>) {
    this.scheduler.schedule(name, cron, async () => {
      try {
        await handler();
        await this.notifySuccess(name);
      } catch (error) {
        await this.notifyFailure(name, error);
        await this.createAlert(name, error);
      }
    });
  }

  private async notifySuccess(task: string) {
    console.log(`✅ ${task} completed successfully`);
    // Send to CloudWatch metrics
    await cloudwatch.putMetricData({
      Namespace: 'Polln/Backup',
      MetricData: [{
        MetricName: 'BackupSuccess',
        Dimensions: [{ Name: 'Task', Value: task }],
        Value: 1,
      }],
    }).promise();
  }

  private async notifyFailure(task: string, error: Error) {
    console.error(`❌ ${task} failed:`, error);
    await cloudwatch.putMetricData({
      Namespace: 'Polln/Backup',
      MetricData: [{
        MetricName: 'BackupFailure',
        Dimensions: [{ Name: 'Task', Value: task }],
        Value: 1,
      }],
    }).promise();
  }

  private async createAlert(task: string, error: Error) {
    await sns.publish({
      TopicArn: process.env.ALERT_TOPIC_ARN,
      Message: JSON.stringify({
        task,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      Subject: `❌ Backup Failed: ${task}`,
    }).promise();
  }
}
```

---

### 3. Snapshot Strategies

#### EBS Snapshot Optimization

**Fast Snapshot Restore (FSR)**:
```yaml
EBSSnapshots:
  fast_restore:
    enabled: true
    availability_zones:
      - us-east-1a
      - us-east-1b
      - us-east-1c
    restore_time: 15 minutes

  lifecycle:
    transition_to_standard_ia: 7 days
    transition_to_glacier: 30 days
    delete_after: 90 days
```

**Smart Snapshot Strategy**:
```typescript
class SmartSnapshotManager {
  async createSnapshot(volumeId: string, tier: 'critical' | 'standard' | 'archive') {
    const snapshot = await ec2.createSnapshot({
      VolumeId: volumeId,
      TagSpecifications: [{
        ResourceType: 'snapshot',
        Tags: [
          { Key: 'Tier', Value: tier },
          { Key: 'CreatedAt', Value: new Date().toISOString() },
          { Key: 'Retention', Value: this.getRetentionDays(tier).toString() },
        ],
      }],
    }).promise();

    // Enable FSR for critical tier
    if (tier === 'critical') {
      await this.enableFastRestore(snapshot.SnapshotId);
    }

    return snapshot;
  }

  private getRetentionDays(tier: string): number {
    switch (tier) {
      case 'critical': return 90;
      case 'standard': return 30;
      case 'archive': return 7;
      default: return 30;
    }
  }

  private async enableFastRestore(snapshotId: string) {
    await ec2.enableFastSnapshotRestore({
      AvailabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
      SnapshotId: snapshotId,
    }).promise();
  }
}
```

---

### 4. Logical vs Physical Backups

#### Comparison Table

| Aspect | Logical Backup | Physical Backup |
|--------|---------------|-----------------|
| **Format** | SQL dump | Binary copy |
| **Portability** | High | Low |
| **Speed** | Slower | Faster |
| **Granularity** | Database, table | Entire instance |
| **Cross-Version** | Possible | Limited |
| **Compression** | High | Medium |
| **Use Case** | Migration, partial restore | DR, full restore |

#### PostgreSQL Logical Backups

```bash
# pg_dump for logical backup
pg_dump \
  --host=polln-production.xxx.us-east-1.rds.amazonaws.com \
  --port=5432 \
  --username=polln_admin \
  --dbname=polln_db \
  --format=custom \
  --compress=9 \
  --file=/tmp/polln_backup_$(date +%Y%m%d).dump

# Upload to S3
aws s3 cp /tmp/polln_backup_*.dump \
  s3://polln-backups/logical/$(date +%Y/%m/%d)/
```

#### PostgreSQL Physical Backups

RDS automated backups provide physical backups. For additional control:

```typescript
import { RDSClient, CreateDBSnapshotCommand } from '@aws-sdk/client-rds';

async function createPhysicalSnapshot() {
  const client = new RDSClient({});

  await client.send(new CreateDBSnapshotCommand({
    DBInstanceIdentifier: 'polln-production',
    DBSnapshotIdentifier: `polln-physical-${Date.now()}`,
    Tags: [
      { Key: 'Type', Value: 'physical' },
      { Key: 'Automated', Value: 'true' },
    ],
  }));
}
```

---

### 5. Incremental Backup Optimization

**Differential vs Incremental**:

```yaml
IncrementalStrategy:
  backup_method: incremental

  incremental:
    backup_changed_blocks_only: true
    scan_rate: optimized
    compression: true

  differential:
    since_last_full: true
    merge_incrementals: daily
```

**Time-Based Incremental Backups**:
```typescript
class IncrementalBackupManager {
  async performIncrementalBackup(lastBackupTime: Date) {
    const changes = await this.getChangesSince(lastBackupTime);

    const backup = {
      type: 'incremental',
      base: lastBackupTime,
      timestamp: new Date(),
      changes: changes,
      checksum: this.calculateChecksum(changes),
    };

    await this.uploadBackup(backup);
  }

  private async getChangesSince(since: Date) {
    // Get only changed data
    return await this.query(`
      SELECT * FROM cells
      WHERE updated_at > $1
    `, [since]);
  }

  async restoreFromIncrementals(base: Date, target: Date) {
    const incrementals = await this.listIncrementals(base, target);

    // Start from base snapshot
    let state = await this.loadSnapshot(base);

    // Apply each incremental in order
    for (const inc of incrementals) {
      state = this.applyChanges(state, inc.changes);
    }

    return state;
  }
}
```

---

## Storage Tiers

### 1. Hot Storage (Immediate Access)

**Purpose**: Frequently accessed data requiring sub-second access

```yaml
HotStorage:
  technologies:
    - RDS Multi-AZ
    - EBS gp3
    - S3 Standard

  characteristics:
    availability: 99.99%
    latency: < 100ms
    throughput: high

  use_cases:
    - Active databases
    - Current cell states
    - Hot user data

  cost_per_gb_month: $0.023 (S3)
```

**Hot Storage Architecture**:
```
┌─────────────────────────────────────────────────┐
│              HOT STORAGE TIER                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │         RDS Multi-AZ (Primary)          │   │
│  │   Availability: 99.99%                  │   │
│  │   Latency: < 10ms                       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │     EBS gp3 (Application Volumes)       │   │
│  │   IOPS: Configurable (3,000-16,000)     │   │
│  │   Throughput: Up to 1,000 MB/s          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │     S3 Standard (Current Data)          │   │
│  │   Latency: First byte < 100ms           │   │
│  │   Availability: 99.99%                  │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

### 2. Warm Storage (Frequent Access)

**Purpose**: Data accessed weekly to monthly

```yaml
WarmStorage:
  technologies:
    - S3 Standard-IA
    - EBS snapshots (recent)

  characteristics:
    availability: 99.9%
    retrieval_fee: $0.01/GB
    minimum_storage: 30 days

  use_cases:
    - Recent backups (7-30 days)
    - Monthly reports
    - Training data

  cost_per_gb_month: $0.0125
```

**Warm Storage Transition Rules**:
```json
{
  "LifecycleConfiguration": {
    "Rules": [
      {
        "Id": "Hot-to-Warm",
        "Filter": {
          "Prefix": "backups/"
        },
        "Status": "Enabled",
        "Transitions": [
          {
            "Days": 30,
            "StorageClass": "STANDARD_IA"
          }
        ]
      }
    ]
  }
}
```

---

### 3. Cold Storage (Archive)

**Purpose**: Data accessed monthly to quarterly

```yaml
ColdStorage:
  technologies:
    - S3 Glacier Flexible Retrieval
    - EBS snapshots (older)

  characteristics:
    availability: 99.99%
    retrieval_time: 1-12 hours
    minimum_storage: 90 days

  use_cases:
    - Compliance archives
    - Old backups (30-90 days)
    - Audit trails

  cost_per_gb_month: $0.004
```

**Cold Storage Transition**:
```json
{
  "Transitions": [
    {
      "Days": 90,
      "StorageClass": "GLACIER"
    }
  ]
}
```

---

### 4. Glacier for Long-Term Archive

**Purpose**: Rarely accessed data, regulatory retention

```yaml
GlacierStorage:
  tiers:
    flexible_retrieval:
      retrieval_time: 1-12 hours
      cost_per_gb_month: $0.004
      min_storage: 90 days

    deep_archive:
      retrieval_time: 12-48 hours
      cost_per_gb_month: $0.00099
      min_storage: 180 days

  use_cases:
    - Regulatory compliance (7+ years)
    - Legal holds
    - Historical data
    - Disaster recovery vaults
```

**Glacier Vault Configuration**:
```typescript
import { S3Client, PutBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3';

async function configureGlacierVault() {
  const client = new S3Client({});

  await client.send(new PutBucketLifecycleConfigurationCommand({
    Bucket: 'polln-archive',
    LifecycleConfiguration: {
      Rules: [
        {
          Id: 'Transition-to-Glacier',
          Filter: { Prefix: 'backups/' },
          Status: 'Enabled',
          Transitions: [
            {
              Days: 90,
              StorageClass: 'GLACIER',
            },
            {
              Days: 365,
              StorageClass: 'DEEP_ARCHIVE',
            },
          ],
          Expiration: {
            Days: 2555, // 7 years
          },
        },
      ],
    },
  }));
}
```

---

### 5. Lifecycle Policies

**Comprehensive Lifecycle Strategy**:

```yaml
LifecyclePolicy:
  rules:
    daily_snapshots:
      create: every 4 hours
      retain: 7 days
      storage: HOT

    weekly_snapshots:
      create: Sunday 02:00 UTC
      retain: 4 weeks
      storage: WARM

    monthly_snapshots:
      create: 1st of month
      retain: 12 months
      storage: COLD

    yearly_snapshots:
      create: January 1st
      retain: 7 years
      storage: GLACIER
```

**AWS Backup Lifecycle Policy**:
```json
{
  "BackupRule": {
    "RuleName": "Monthly-7-Year",
    "TargetBackupVault": "PollnArchiveVault",
    "ScheduleExpression": "cron(0 2 1 * ? *)",
    "Lifecycle": {
      "MoveToColdStorageAfter": 90,
      "DeleteAfter": 2555
    },
    "CopyActions": [
      {
        "DestinationBackupVaultArn": "arn:aws:backup:us-west-2:123456789012:backup-vault:PollnDRVault",
        "Lifecycle": {
          "MoveToColdStorageAfter": 90,
          "DeleteAfter": 2555
        }
      }
    ]
  }
}
```

---

## Retention Policies

### 1. Regulatory Requirements

**Data Retention by Regulation**:

| Regulation | Data Type | Retention Period | Storage Tier |
|------------|-----------|-----------------|--------------|
| **SOC 2** | All logs | 7 years | Glacier |
| **GDPR** | Personal data | As per contract | Warm |
| **HIPAA** | PHI | 6 years | Cold |
| **SOX** | Financial records | 7 years | Glacier |
| **CCPA** | Personal data | As per request | Warm |

**Implementation**:
```typescript
class RetentionManager {
  private retentionRules: Map<string, RetentionRule> = new Map();

  constructor() {
    // Initialize retention rules
    this.retentionRules.set('financial', {
      period: 7 * 365, // 7 years
      storage: 'GLACIER',
      regulations: ['SOX', 'SOC'],
    });

    this.retentionRules.set('user-data', {
      period: 365, // 1 year
      storage: 'STANDARD_IA',
      regulations: ['GDPR', 'CCPA'],
      deletionRequired: true,
    });

    this.retentionRules.set('audit-logs', {
      period: 7 * 365, // 7 years
      storage: 'DEEP_ARCHIVE',
      regulations: ['SOC', 'HIPAA'],
    });
  }

  async applyRetention(dataType: string, createdAt: Date) {
    const rule = this.retentionRules.get(dataType);
    if (!rule) return;

    const expirationDate = new Date(createdAt);
    expirationDate.setDate(expirationDate.getDate() + rule.period);

    // Tag for lifecycle management
    await this.tagForRetention(dataType, expirationDate, rule.storage);
  }

  private async tagForRetention(
    dataType: string,
    expiresAt: Date,
    storage: string
  ) {
    await s3.putObjectTagging({
      Bucket: 'polln-data',
      Key: `${dataType}/${new Date().toISOString()}`,
      Tagging: {
        TagSet: [
          { Key: 'Retention', Value: expiresAt.toISOString() },
          { Key: 'StorageClass', Value: storage },
          { Key: 'Managed', Value: 'true' },
        ],
      },
    }).promise();
  }
}
```

---

### 2. Business Needs by Data Type

**Data Classification Matrix**:

| Data Classification | Retention | Storage | Access Frequency |
|---------------------|-----------|---------|------------------|
| **Critical** | 7 years | Glacier → Cold → Warm → Hot | Daily |
| **Important** | 1 year | Warm → Hot | Weekly |
| **Useful** | 90 days | Standard | Monthly |
| **Transient** | 7 days | Hot | Continuous |

**Classification Rules**:
```typescript
enum DataClassification {
  CRITICAL = 'critical',      // Financial, compliance
  IMPORTANT = 'important',    // Business records
  USEFUL = 'useful',          // Analytics, reporting
  TRANSIENT = 'transient',    // Cache, temporary
}

interface RetentionPolicy {
  classification: DataClassification;
  retention: {
    hot: number;    // days
    warm: number;   // days
    cold: number;   // days
    glacier: number; // years
  };
  access: {
    frequency: string;
    responseTime: string;
  };
}

const RETENTION_POLICIES: Record<DataClassification, RetentionPolicy> = {
  [DataClassification.CRITICAL]: {
    classification: DataClassification.CRITICAL,
    retention: { hot: 30, warm: 60, cold: 90, glacier: 7 },
    access: { frequency: 'daily', responseTime: '< 1s' },
  },
  [DataClassification.IMPORTANT]: {
    classification: DataClassification.IMPORTANT,
    retention: { hot: 7, warm: 30, cold: 60, glacier: 0 },
    access: { frequency: 'weekly', responseTime: '< 5s' },
  },
  [DataClassification.USEFUL]: {
    classification: DataClassification.USEFUL,
    retention: { hot: 1, warm: 7, cold: 30, glacier: 0 },
    access: { frequency: 'monthly', responseTime: '< 1m' },
  },
  [DataClassification.TRANSIENT]: {
    classification: DataClassification.TRANSIENT,
    retention: { hot: 7, warm: 0, cold: 0, glacier: 0 },
    access: { frequency: 'continuous', responseTime: '< 100ms' },
  },
};
```

---

### 3. Cost Optimization

**Retention Cost Analysis**:

```typescript
class RetentionCostOptimizer {
  async analyzeRetentionCosts() {
    const analysis = {
      current: await this.calculateCurrentCosts(),
      optimized: await this.calculateOptimizedCosts(),
      savings: await this.calculatePotentialSavings(),
    };

    return analysis;
  }

  private async calculateCurrentCosts() {
    // Analyze current storage distribution
    const storage = await this.getStorageDistribution();

    return {
      hot: storage.hot.gb * 0.023,
      warm: storage.warm.gb * 0.0125,
      cold: storage.cold.gb * 0.004,
      glacier: storage.glacier.gb * 0.00099,
      total: 0,
    };
  }

  private async calculateOptimizedCosts() {
    // Apply optimization rules
    const rules = [
      'Move data not accessed in 30 days to WARM',
      'Move data not accessed in 90 days to COLD',
      'Move data not accessed in 365 days to GLACIER',
      'Delete data past retention period',
    ];

    const optimized = await this.applyOptimizationRules(rules);
    return this.calculateCosts(optimized);
  }

  private async applyOptimizationRules(rules: string[]) {
    // Implement lifecycle policy transitions
    // based on access patterns
  }
}
```

---

### 4. Legal Hold Handling

**Legal Hold Process**:

```typescript
class LegalHoldManager {
  private legalHolds: Map<string, LegalHold> = new Map();

  async placeLegalHold(dataIdentifier: string, holdInfo: LegalHoldInfo) {
    const hold: LegalHold = {
      id: generateId(),
      dataIdentifier,
      caseNumber: holdInfo.caseNumber,
      holdDate: new Date(),
      expiration: holdInfo.expiration,
      status: 'ACTIVE',
      notes: holdInfo.notes,
    };

    this.legalHolds.set(dataIdentifier, hold);

    // Tag objects to prevent deletion
    await this.tagForLegalHold(dataIdentifier, hold.id);

    // Notify stakeholders
    await this.notifyLegalHoldPlaced(hold);
  }

  private async tagForLegalHold(identifier: string, holdId: string) {
    await s3.putObjectTagging({
      Bucket: 'polln-data',
      Key: identifier,
      Tagging: {
        TagSet: [
          { Key: 'LegalHold', Value: 'true' },
          { Key: 'LegalHoldId', Value: holdId },
          { Key: 'DeletionBlocked', Value: 'true' },
        ],
      },
    }).promise();
  }

  async releaseLegalHold(holdId: string) {
    const hold = this.legalHolds.get(holdId);
    if (!hold) throw new Error('Hold not found');

    hold.status = 'RELEASED';
    hold.releaseDate = new Date();

    await this.untagFromLegalHold(hold.dataIdentifier, holdId);
    await this.notifyLegalHoldReleased(hold);
  }

  async checkLegalHold(identifier: string): Promise<boolean> {
    const tags = await s3.getObjectTagging({
      Bucket: 'polln-data',
      Key: identifier,
    }).promise();

    return tags.TagSet.some(t => t.Key === 'LegalHold' && t.Value === 'true');
  }
}
```

---

### 5. Data Disposal Procedures

**Secure Data Deletion**:

```typescript
class DataDisposalManager {
  async scheduleDisposal(dataType: string, identifier: string) {
    // Check for legal holds
    const holdExists = await this.legalHoldManager.checkLegalHold(identifier);
    if (holdExists) {
      throw new Error('Cannot delete: Legal hold in place');
    }

    // Verify retention period has passed
    const canDelete = await this.verifyRetentionExpired(dataType, identifier);
    if (!canDelete) {
      throw new Error('Cannot delete: Retention period not expired');
    }

    // Schedule deletion
    await this.scheduleSecureDeletion(identifier);
  }

  private async verifyRetentionExpired(
    dataType: string,
    identifier: string
  ): Promise<boolean> {
    const policy = RETENTION_POLICIES[dataType];
    const metadata = await this.getMetadata(identifier);

    const expiration = new Date(metadata.createdAt);
    expiration.setDate(
      expiration.getDate() +
      policy.retention.hot +
      policy.retention.warm +
      policy.retention.cold +
      (policy.retention.glacier * 365)
    );

    return new Date() > expiration;
  }

  async performSecureDeletion(identifier: string) {
    // Multi-step secure deletion
    await this.deleteFromAllStorage(identifier);
    await this.expireFromBackups(identifier);
    await this.removeFromCache(identifier);
    await this.logDisposal(identifier);
  }

  private async deleteFromAllStorage(identifier: string) {
    // Delete from all storage tiers
    await s3.deleteObject({
      Bucket: 'polln-data',
      Key: identifier,
    }).promise();

    // Also delete from backup buckets
    await s3.deleteObject({
      Bucket: 'polln-backups',
      Key: identifier,
    }).promise();

    // And from archive
    await s3.deleteObject({
      Bucket: 'polln-archive',
      Key: identifier,
    }).promise();
  }

  private async expireFromBackups(identifier: string) {
    // Remove from backup snapshots
    // This requires careful handling to maintain backup integrity
  }

  private async removeFromCache(identifier: string) {
    // Clear from any caches
    await cloudfront.createInvalidation({
      DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: 1,
          Items: [`/data/${identifier}`],
        },
      },
    }).promise();
  }

  private async logDisposal(identifier: string) {
    // Create audit log of deletion
    await this.auditLogger.log({
      action: 'SECURE_DELETE',
      identifier,
      timestamp: new Date().toISOString(),
      performedBy: 'system',
      reason: 'Retention expired',
    });
  }
}
```

---

## Restore Procedures

### 1. RTO Targets by Service Tier

**Service Tier Matrix**:

| Service Tier | RTO | RPO | Priority | Restore Strategy |
|--------------|-----|-----|----------|-----------------|
| **Tier 0: Critical** | 1 hour | 0s | P0 | Hot standby, auto-failover |
| **Tier 1: High** | 2 hours | 5 min | P1 | Warm standby, manual failover |
| **Tier 2: Medium** | 4 hours | 15 min | P2 | Backup restore |
| **Tier 3: Low** | 24 hours | 1 day | P3 | Backup restore |

**Service Classification**:

```typescript
enum ServiceTier {
  CRITICAL = 0,  // Core database, authentication
  HIGH = 1,      // Application servers, API
  MEDIUM = 2,    // Analytics, reporting
  LOW = 3,       // Dev tools, test environments
}

interface ServiceRestoreTarget {
  service: string;
  tier: ServiceTier;
  rto: number; // hours
  rpo: number; // seconds/minutes
  restoreStrategy: string;
}

const RESTORE_TARGETS: ServiceRestoreTarget[] = [
  {
    service: 'RDS PostgreSQL',
    tier: ServiceTier.CRITICAL,
    rto: 1,
    rpo: 0,
    restoreStrategy: 'Multi-AZ failover',
  },
  {
    service: 'Application Servers',
    tier: ServiceTier.HIGH,
    rto: 2,
    rpo: 300, // 5 minutes
    restoreStrategy: 'ASG scaling + AMI restore',
  },
  {
    service: 'Cell State Store',
    tier: ServiceTier.CRITICAL,
    rto: 1,
    rpo: 0,
    restoreStrategy: 'DynamoDB PITR',
  },
  {
    service: 'File Storage',
    tier: ServiceTier.MEDIUM,
    rto: 4,
    rpo: 900, // 15 minutes
    restoreStrategy: 'EFS backup restore',
  },
];
```

---

### 2. Point-in-Time Recovery

**PITR Configuration**:

```yaml
PITR:
  enabled: true
  retention_days: 35
  earliest_restore: 2025-02-02  # 35 days ago

  databases:
    postgresql:
      enabled: true
      backup_retention: 35 days

    dynamodb:
      enabled: true
      backup_retention: 35 days

    documentdb:
      enabled: true
      backup_retention: 35 days
```

**PITR Restore Script**:
```typescript
class PITRManager {
  async restoreToTimestamp(
    sourceInstance: string,
    targetInstance: string,
    timestamp: Date
  ) {
    // Validate timestamp is within retention window
    const isValid = await this.validateTimestamp(timestamp);
    if (!isValid) {
      throw new Error('Timestamp outside retention window');
    }

    // Perform restore
    const restore = await rds.restoreDBInstanceToPointInTime({
      SourceDBInstanceIdentifier: sourceInstance,
      TargetDBInstanceIdentifier: targetInstance,
      RestoreTime: timestamp,
      PubliclyAccessible: false,
      MultiAZ: true,
      Tags: [
        { Key: 'RestoreType', Value: 'PITR' },
        { Key: 'RestoreTimestamp', Value: timestamp.toISOString() },
      ],
    }).promise();

    // Wait for restore to complete
    await this.waitForRestore(restore.DBInstance.DBInstanceIdentifier);

    // Verify restore
    await this.verifyRestore(targetInstance, timestamp);

    return restore;
  }

  private async validateTimestamp(timestamp: Date): Promise<boolean> {
    const earliest = new Date();
    earliest.setDate(earliest.getDate() - 35); // 35 day retention

    const latest = new Date();

    return timestamp >= earliest && timestamp <= latest;
  }

  private async verifyRestore(instanceId: string, timestamp: Date) {
    // Connect and verify data
    const client = await this.connectToInstance(instanceId);

    // Check a known table record
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM cells
      WHERE created_at <= $1
    `, [timestamp]);

    console.log(`Verified ${result.rows[0].count} records from restore point`);
  }
}
```

---

### 3. Partial Restore Options

**Selective Data Restore**:

```typescript
class PartialRestoreManager {
  async restoreTable(
    sourceInstance: string,
    table: string,
    whereClause?: string
  ) {
    // Create temporary restore instance
    const tempInstance = await this.createTempInstance(sourceInstance);

    try {
      // Extract data from temp instance
      const data = await this.extractTable(tempInstance, table, whereClause);

      // Load into target instance
      await this.loadTable(table, data);

      // Verify data integrity
      await this.verifyPartialRestore(table, data);

    } finally {
      // Clean up temp instance
      await this.deleteTempInstance(tempInstance);
    }
  }

  async restoreSingleCell(cellId: string) {
    // Restore from cell state snapshots
    const snapshots = await this.listCellSnapshots(cellId);

    // Find most recent snapshot
    const latest = snapshots.sort((a, b) =>
      b.timestamp - a.timestamp
    )[0];

    // Load cell state
    const state = await this.loadCellState(latest.key);

    // Restore to current system
    await this.applyCellState(cellId, state);
  }

  async restoreDateRange(
    table: string,
    startDate: Date,
    endDate: Date
  ) {
    const query = `
      SELECT * FROM ${table}
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at ASC
    `;

    const data = await this.queryFromBackup(query, [startDate, endDate]);

    // Batch insert
    await this.batchInsert(table, data);
  }
}
```

---

### 4. Cross-Region Restore

**DR Region Configuration**:

```yaml
CrossRegionRestore:
  primary: us-east-1
  dr: us-west-2

  replication:
    database: true
    storage: true
    latency: < 1 minute

  failover:
    automatic: false
    dns_failover: true
    route53_health_check: true
```

**Cross-Region Restore Script**:
```typescript
class CrossRegionRestoreManager {
  async failoverToDR() {
    console.log('Initiating cross-region failover to us-west-2');

    // 1. Update DNS to point to DR region
    await this.updateDNS('us-west-2');

    // 2. Promote DR read replica to master
    await this.promoteReadReplica();

    // 3. Update application configuration
    await this.updateApplicationConfig({
      databaseEndpoint: process.env.DR_DB_ENDPOINT,
      region: 'us-west-2',
    });

    // 4. Scale up DR infrastructure
    await this.scaleDRInfrastructure();

    // 5. Verify failover
    await this.verifyFailover();

    console.log('Failover complete');
  }

  async failbackToPrimary() {
    console.log('Initiating failback to us-east-1');

    // 1. Reverse replicate from DR to primary
    await this.setupReverseReplication();

    // 2. Wait for sync
    await this.waitForReplicationSync();

    // 3. Update DNS back to primary
    await this.updateDNS('us-east-1');

    // 4. Depromote DR instance
    await this.depromoteDRInstance();

    console.log('Failback complete');
  }

  private async updateDNS(region: string) {
    const route53 = new Route53Client({});

    await route53.changeResourceRecordSets({
      HostedZoneId: process.env.HOSTED_ZONE_ID,
      ChangeBatch: {
        Changes: [{
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: 'api.polln.ai',
            Type: 'CNAME',
            SetIdentifier: region,
            Region: region,
            Failover: region === 'us-east-1' ? 'PRIMARY' : 'SECONDARY',
            TTL: 60,
            ResourceRecords: [{
              Value: `loadbalancer-${region}.polln.ai`,
            }],
            HealthCheckId: process.env.ROUTE53_HEALTH_CHECK_ID,
          },
        }],
      },
    }).promise();
  }
}
```

---

### 5. Testing Restore Procedures

**Automated Restore Testing**:

```typescript
class RestoreTestManager {
  async scheduleWeeklyRestoreTest() {
    // Every Sunday at 4 AM UTC
    const schedule = 'cron(0 4 ? * SUN *)';

    await events.putRule({
      Name: 'weekly-restore-test',
      ScheduleExpression: schedule,
      State: 'ENABLED',
    }).promise();

    await events.putTargets({
      Rule: 'weekly-restore-test',
      Targets: [{
        Id: 'restore-test-lambda',
        Arn: process.env.RESTORE_TEST_LAMBDA_ARN,
      }],
    }).promise();
  }

  async performRestoreTest() {
    const testId = generateId();
    const timestamp = new Date();

    console.log(`Starting restore test ${testId}`);

    try {
      // 1. Create test instance from backup
      const testInstance = await this.createTestInstance(timestamp);
      console.log(`Created test instance: ${testInstance}`);

      // 2. Verify data integrity
      const integrityCheck = await this.verifyDataIntegrity(testInstance);
      console.log(`Data integrity check: ${integrityCheck.passed ? 'PASS' : 'FAIL'}`);

      // 3. Run smoke tests
      const smokeTest = await this.runSmokeTests(testInstance);
      console.log(`Smoke test: ${smokeTest.passed ? 'PASS' : 'FAIL'}`);

      // 4. Measure restore time
      const restoreTime = smokeTest.duration;
      console.log(`Restore time: ${restoreTime}ms`);

      // 5. Record metrics
      await this.recordRestoreMetrics({
        testId,
        timestamp,
        restoreTime,
        integrity: integrityCheck.passed,
        smokeTest: smokeTest.passed,
      });

      // 6. Cleanup test instance
      await this.deleteTestInstance(testInstance);

      console.log(`Restore test ${testId} complete`);

    } catch (error) {
      console.error(`Restore test ${testId} failed:`, error);
      await this.createAlert('Restore test failed', error);
      throw error;
    }
  }

  private async createTestInstance(timestamp: Date): Promise<string> {
    const instanceName = `polln-restore-test-${Date.now()}`;

    await rds.restoreDBInstanceToPointInTime({
      SourceDBInstanceIdentifier: 'polln-production',
      TargetDBInstanceIdentifier: instanceName,
      RestoreTime: timestamp,
      DBInstanceClass: 'db.t3.micro', // Small for testing
      PubliclyAccessible: false,
    }).promise();

    // Wait for instance to be available
    await this.waitForInstance(instanceName, 'available');

    return instanceName;
  }

  private async verifyDataIntegrity(instance: string) {
    const client = await this.connectToInstance(instance);

    // Check critical tables
    const checks = await Promise.all([
      this.checkTableCount(client, 'cells', 1000),
      this.checkTableCount(client, 'users', 100),
      this.checkTableCount(client, 'colonies', 50),
    ]);

    return {
      passed: checks.every(c => c.passed),
      checks,
    };
  }

  private async runSmokeTests(instance: string) {
    const startTime = Date.now();

    // Test basic CRUD operations
    const client = await this.connectToInstance(instance);

    try {
      // Create
      await client.query('INSERT INTO test_table (id, data) VALUES ($1, $2)', [
        generateId(),
        'test data',
      ]);

      // Read
      const result = await client.query('SELECT * FROM test_table WHERE data = $1', [
        'test data',
      ]);

      // Update
      await client.query('UPDATE test_table SET data = $1 WHERE data = $2', [
        'updated data',
        'test data',
      ]);

      // Delete
      await client.query('DELETE FROM test_table WHERE data = $1', [
        'updated data',
      ]);

      return {
        passed: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }
}
```

---

## Disaster Recovery

### 1. Failure Scenarios

**Disaster Scenario Matrix**:

| Scenario | Likelihood | Impact | Detection | Recovery Time |
|----------|-----------|--------|-----------|---------------|
| **AZ Failure** | Medium | High | Auto (5 min) | 1-2 hours |
| **Region Failure** | Low | Critical | Auto (5 min) | 4-8 hours |
| **Database Corruption** | Low | Critical | Manual (1 hour) | 2-4 hours |
| **Ransomware** | Low | Critical | Manual (1 day) | 1-2 weeks |
| **Data Center Loss** | Very Low | Critical | Auto (5 min) | 4-8 hours |
| **Network Partition** | Medium | Medium | Auto (1 min) | Variable |

**Scenario Response Plans**:

```typescript
enum DisasterScenario {
  AVAILABILITY_ZONE_FAILURE = 'az_failure',
  REGION_FAILURE = 'region_failure',
  DATABASE_CORRUPTION = 'db_corruption',
  RANSOMWARE = 'ransomware',
  DATA_CENTER_LOSS = 'data_center_loss',
  NETWORK_PARTITION = 'network_partition',
}

interface DisasterResponsePlan {
  scenario: DisasterScenario;
  detectionMethod: string;
  autoResponse: string[];
  manualSteps: string[];
  estimatedRecoveryTime: string;
  communicationPlan: CommunicationPlan;
}
```

---

### 2. Recovery Runbooks

**Runbook Template**:

```markdown
# Disaster Recovery Runbook: [Scenario Name]

## Scenario
- **Name**: [Scenario name]
- **Severity**: [P0/P1/P2/P3]
- **Trigger**: [What triggers this runbook]

## Detection
- **Automated Alerts**: [CloudWatch alarms]
- **Manual Detection**: [How to detect manually]
- **Verification Steps**: [How to verify scenario occurred]

## Immediate Actions (First 15 Minutes)
1. [Action 1]
2. [Action 2]
3. [Action 3]

## Recovery Steps
1. [Detailed recovery step 1]
2. [Detailed recovery step 2]
3. [Detailed recovery step 3]

## Verification
- [ ] [Verification check 1]
- [ ] [Verification check 2]
- [ ] [Verification check 3]

## Communication
- **Stakeholders**: [Who to notify]
- **Channels**: [Email, Slack, PagerDuty]
- **Templates**: [Message templates]

## Escalation
- **Level 1**: [Who]
- **Level 2**: [Who]
- **Level 3**: [Who]

## Post-Incident
- **RCA Required**: [Yes/No]
- **Timeline**: [When RCA is due]
- **Improvements**: [What to improve]
```

**Example Runbook: Database Corruption**:
```markdown
# Disaster Recovery Runbook: Database Corruption

## Scenario
- **Name**: Database Corruption
- **Severity**: P0 (Critical)
- **Trigger**: Data integrity checks fail, database becomes unresponsive

## Detection
- **Automated Alerts**:
  - CloudWatch alarm: `DatabaseStatus != "available"`
  - Error rate > 5%
- **Manual Detection**:
  - Query failures
  - Inconsistent query results
- **Verification Steps**:
  ```bash
  aws rds describe-db-instances --db-instance-identifier polln-production
  psql -h polln-production.xxx.us-east-1.rds.amazonaws.com -U admin -c "SELECT 1"
  ```

## Immediate Actions (First 15 Minutes)
1. **Alert On-Call DBA** (PageDuty)
2. **Verify extent of corruption**:
   ```bash
   aws rds describe-db-log-files --db-instance-identifier polln-production
   ```
3. **Enable enhanced monitoring**:
   ```bash
   aws rds modify-db-instance --db-instance-identifier polln-production \
     --monitoring-interval 60 --monitoring-role-arn [ROLE_ARN]
   ```

## Recovery Steps
1. **Assess corruption level**:
   ```sql
   -- Check for corrupted tables
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema NOT IN ('pg_catalog', 'information_schema');

   -- Run integrity checks
   VACUUM FULL;
   REINDEX DATABASE polln_db;
   ```

2. **If minor corruption**:
   - Run `pg_dump` to extract good data
   - Create new instance from scratch
   - Import data

3. **If major corruption**:
   - Identify last known good backup
   - Perform point-in-time recovery to before corruption
   - Use: `aws rds restore-db-instance-to-point-in-time`

4. **Example PITR**:
   ```bash
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier polln-production \
     --target-db-instance-identifier polln-restored \
     --restore-time 2025-03-09T14:00:00Z \
     --db-instance-class db.m5.xlarge \
     --multi-az \
     --publicly-accessible
   ```

## Verification
- [ ] Database is in `available` state
- [ ] Can connect to database
- [ ] Run query: `SELECT COUNT(*) FROM cells;` (expect > 0)
- [ ] Run query: `SELECT COUNT(*) FROM users;` (expect > 0)
- [ ] Verify cell count matches expected
- [ ] Run application smoke tests

## Communication
- **Stakeholders**:
  - Engineering team (Slack: #engineering)
  - Product team (Slack: #product)
  - Support team (Email: support@polln.ai)
- **Channels**:
  - Primary: Slack #incidents
  - Secondary: Email distribution list
  - Customer: Status page update
- **Templates**:
  ```
  Subject: 🔴 INCIDENT: Database Corruption - Recovery in Progress

  We are currently experiencing database corruption issues and are actively
  working to restore service. Data recovery from backups is underway.

  Current Status: RECOVERING
  ETA: 2-4 hours
  Next Update: 30 minutes
  ```

## Escalation
- **Level 1**: On-Call DBA (immediate)
- **Level 2**: Engineering Manager (15 min)
- **Level 3**: CTO (1 hour if unresolved)

## Post-Incident
- **RCA Required**: Yes
- **Timeline**: Within 5 business days
- **Improvements**:
  - Implement additional integrity checks
  - Consider adding read replica for failover
  - Review backup retention policy
  - Schedule DR drill
```

---

### 3. Communication Plans

**Incident Communication Strategy**:

```typescript
interface CommunicationPlan {
  internal: InternalCommunication;
  external: ExternalCommunication;
  escalation: EscalationPlan;
}

interface InternalCommunication {
  channels: string[];
  stakeholders: string[];
  updateFrequency: string;
  templates: MessageTemplate[];
}

interface ExternalCommunication {
  customerStatus: boolean;
  publicStatusPage: boolean;
  socialMedia: boolean;
  templates: MessageTemplate[];
}

interface EscalationPlan {
  levels: EscalationLevel[];
  criteria: EscalationCriteria;
}
```

**Communication Template Manager**:
```typescript
class CommunicationManager {
  async notifyIncident(incident: Incident) {
    const template = await this.getTemplate(incident.severity);
    const message = this.fillTemplate(template, incident);

    // Internal notification
    await this.sendInternalNotification(message);

    // External notification (if needed)
    if (incident.customerImpact) {
      await this.sendCustomerNotification(message);
      await this.updateStatusPage(incident);
    }
  }

  async sendUpdate(incident: Incident, update: IncidentUpdate) {
    const message = this.formatUpdate(update);

    await this.sendInternalNotification(message);

    if (incident.customerImpact) {
      await this.updateStatusPage({ ...incident, ...update });
    }
  }

  private async sendInternalNotification(message: string) {
    // Slack
    await slack.chat.postMessage({
      channel: '#incidents',
      text: message,
      blocks: this.formatSlackMessage(message),
    });

    // Email
    await ses.sendEmail({
      Source: 'incidents@polln.ai',
      Destination: {
        ToAddresses: ['engineering@polln.ai'],
      },
      Message: {
        Subject: { Data: `🔴 ${message.subject}` },
        Body: {
          Text: { Data: message.body },
        },
      },
    }).promise();
  }

  private async updateStatusPage(incident: Incident) {
    await statuspage.updateIncident({
      incident_id: incident.id,
      status: incident.status,
      message: incident.customerMessage,
    });
  }
}
```

---

### 4. DR Testing Schedule

**Testing Cadence**:

```yaml
DRTesting:
  smoke_tests:
    frequency: weekly
    duration: 30 minutes
    scope: basic functionality

  restore_tests:
    frequency: monthly
    duration: 2 hours
    scope: restore from backup, verify data

  failover_tests:
    frequency: quarterly
    duration: 4 hours
    scope: full failover to DR, failback

  full_drill:
    frequency: annually
    duration: 1 day
    scope: simulated disaster, full response
```

**Test Automation**:
```typescript
class DRTestScheduler {
  async scheduleTests() {
    // Weekly smoke tests
    await this.scheduleSmokeTest('cron(0 4 ? * SUN *)');

    // Monthly restore tests
    await this.scheduleRestoreTest('cron(0 2 1 * ? *)');

    // Quarterly failover tests
    await this.scheduleFailoverTest('cron(0 1 1 * JAN/3 ? *)');

    // Annual full drill
    await this.scheduleFullDrill('cron(0 0 1 JAN ? *)');
  }

  async executeSmokeTest() {
    console.log('Starting weekly smoke test');

    const testCases = [
      this.testDatabaseConnectivity(),
      this.testAPICheck(),
      this.testAuthentication(),
      this.testBasicCellOperation(),
    ];

    const results = await Promise.allSettled(testCases);

    const passed = results.filter(r => r.status === 'fulfilled').length;
    const total = results.length;

    console.log(`Smoke test: ${passed}/${total} passed`);

    if (passed < total) {
      await this.createAlert('Smoke test failures detected');
    }
  }

  async executeRestoreTest() {
    console.log('Starting monthly restore test');

    const restoreTester = new RestoreTestManager();
    await restoreTester.performRestoreTest();
  }

  async executeFailoverTest() {
    console.log('Starting quarterly failover test');

    // This is a coordinated event
    // Notify all teams
    await this.notifyTeamsOfFailoverTest();

    // Execute failover to DR
    await this.performFailover();

    // Verify DR region is operational
    await this.verifyDROperational();

    // Run full test suite
    await this.runFullTestSuite();

    // Failback to primary
    await this.performFailback();

    // Generate report
    await this.generateFailoverReport();
  }
}
```

---

### 5. Post-Incident Review

**RCA Template**:

```markdown
# Post-Incident Review: [Incident Title]

## Executive Summary
- **Incident Date**: [Date/time]
- **Duration**: [X hours]
- **Severity**: [P0/P1/P2/P3]
- **Root Cause**: [One sentence summary]

## Timeline
| Time | Event | Duration |
|------|-------|----------|
| T+0 | [What happened] | - |
| T+5min | [Response action] | 5 min |
| T+30min | [Another action] | 25 min |
| T+2h | [Resolution] | 1.5h |

## Impact Analysis
- **Customers Affected**: [Number or percentage]
- **Data Loss**: [Yes/No, if yes how much]
- **Service Downtime**: [Duration]
- **Financial Impact**: [Estimated cost]

## Root Cause Analysis
### What Happened
[Detailed description of what happened]

### Why It Happened
[Root cause analysis - use 5 Whys if helpful]

### Contributing Factors
- [Factor 1]
- [Factor 2]
- [Factor 3]

## Resolution
### Immediate Actions Taken
1. [Action 1]
2. [Action 2]
3. [Action 3]

### Permanent Fix Implemented
- [Fix description]
- [Implementation date]
- [Verified by]

## Prevention
### Short-term Actions (Next 30 Days)
- [ ] [Action 1] - [Owner] - [Due Date]
- [ ] [Action 2] - [Owner] - [Due Date]

### Long-term Actions (Next 90 Days)
- [ ] [Action 1] - [Owner] - [Due Date]
- [ ] [Action 2] - [Owner] - [Due Date]

### Process Improvements
- [Improvement 1]
- [Improvement 2]

## Lessons Learned
### What Went Well
- [Positive outcome 1]
- [Positive outcome 2]

### What Could Have Gone Better
- [Area for improvement 1]
- [Area for improvement 2]

### Action Items
- [ ] [Action item] - [Owner] - [Due date]

## Appendices
### Logs and Screenshots
[Attach relevant logs, screenshots, metrics]

### Communication Log
- [T+0] Initial notification sent
- [T+30min] Customer notification sent
- [T+2h] Resolution notification sent

## Approval
- **Incident Commander**: [Name] - [Date]
- **Engineering Manager**: [Name] - [Date]
- **CTO**: [Name] - [Date]
```

---

## Automation

### 1. Scheduled Backups

**Backup Scheduler Configuration**:

```typescript
class BackupScheduler {
  private scheduler: Scheduler;

  constructor() {
    this.scheduler = new Scheduler();
  }

  async initialize() {
    // Database backups
    this.scheduleDatabaseBackups();

    // File system backups
    this.scheduleFileSystemBackups();

    // Configuration backups
    this.scheduleConfigurationBackups();

    // Cell state backups
    this.scheduleCellStateBackups();

    // Secrets backup
    this.scheduleSecretsBackup();
  }

  private scheduleDatabaseBackups() {
    // Continuous backups via RDS automated backups
    // Additional manual snapshots

    // Daily snapshot at 3 AM UTC
    this.scheduler.schedule('db-daily-snapshot', '0 3 * * *', async () => {
      await this.createDatabaseSnapshot('daily');
    });

    // Weekly snapshot on Sunday at 2 AM UTC
    this.scheduler.schedule('db-weekly-snapshot', '0 2 ? * SUN *', async () => {
      await this.createDatabaseSnapshot('weekly');
    });

    // Monthly snapshot on 1st at 1 AM UTC
    this.scheduler.schedule('db-monthly-snapshot', '0 1 1 * ? *', async () => {
      await this.createDatabaseSnapshot('monthly');
    });
  }

  private scheduleFileSystemBackups() {
    // EBS snapshots every 4 hours
    this.scheduler.schedule('ebs-snapshot', '0 */4 * * *', async () => {
      await this.createEBSSnapshots();
    });

    // EFS backup daily at 3 AM UTC
    this.scheduler.schedule('efs-backup', '0 3 * * *', async () => {
      await this.createEFSBackup();
    });
  }

  private scheduleCellStateBackups() {
    // Incremental every 5 minutes
    this.scheduler.schedule('cells-incremental', '*/5 * * * *', async () => {
      await this.createIncrementalCellBackup();
    });

    // Full backup hourly
    this.scheduler.schedule('cells-full', '0 * * * *', async () => {
      await this.createFullCellBackup();
    });
  }
}
```

---

### 2. Backup Validation

**Automated Validation**:

```typescript
class BackupValidator {
  async validateBackup(backupId: string): Promise<ValidationResult> {
    const checks = [
      this.checkExists(backupId),
      this.checkIntegrity(backupId),
      this.checkCompleteness(backupId),
      this.checkEncrypted(backupId),
      this.checkRetention(backupId),
    ];

    const results = await Promise.allSettled(checks);

    return {
      backupId,
      valid: results.every(r => r.status === 'fulfilled'),
      checks: results.map((r, i) => ({
        name: ['exists', 'integrity', 'completeness', 'encrypted', 'retention'][i],
        passed: r.status === 'fulfilled',
        error: r.status === 'rejected' ? r.reason : null,
      })),
      timestamp: new Date(),
    };
  }

  async validateRecentBackups() {
    const recentBackups = await this.listRecentBackups(24); // Last 24 hours

    const validations = await Promise.all(
      recentBackups.map(b => this.validateBackup(b.id))
    );

    const failed = validations.filter(v => !v.valid);

    if (failed.length > 0) {
      await this.createAlert('Backup validation failures', {
        failedBackups: failed.map(f => f.backupId),
      });
    }

    return {
      total: validations.length,
      passed: validations.filter(v => v.valid).length,
      failed: failed.length,
    };
  }

  private async checkIntegrity(backupId: string): Promise<boolean> {
    // For RDS snapshots, AWS handles this
    // For S3 backups, check checksum

    const backup = await this.getBackupMetadata(backupId);

    if (backup.type === 's3') {
      const expectedChecksum = backup.checksum;
      const actualChecksum = await this.calculateChecksum(backup.location);

      return expectedChecksum === actualChecksum;
    }

    return true; // RDS handles integrity
  }

  private async calculateChecksum(location: string): Promise<string> {
    const object = await s3.getObject({
      Bucket: location.bucket,
      Key: location.key,
    }).promise();

    return crypto
      .createHash('sha256')
      .update(object.Body)
      .digest('hex');
  }
}
```

---

### 3. Restore Testing Automation

**Automated Restore Testing**:

```typescript
class AutomatedRestoreTesting {
  async runDailyRestoreTest() {
    const snapshot = await this.getRandomRecentSnapshot();

    console.log(`Testing restore from snapshot: ${snapshot.id}`);

    const startTime = Date.now();

    try {
      // Create test instance
      const testInstance = await this.restoreFromSnapshot(snapshot);

      // Verify
      const verification = await this.verifyRestore(testInstance, snapshot);

      // Record metrics
      const duration = Date.now() - startTime;
      await this.recordMetrics({
        snapshotId: snapshot.id,
        duration,
        verified: verification.passed,
      });

      // Cleanup
      await this.deleteTestInstance(testInstance);

      return {
        success: true,
        duration,
        verification,
      };

    } catch (error) {
      await this.createAlert('Automated restore test failed', {
        snapshotId: snapshot.id,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async verifyRestore(
    instance: string,
    snapshot: BackupSnapshot
  ): Promise<VerificationResult> {
    const checks = [
      {
        name: 'instance_available',
        check: async () => {
          const status = await rds.describeDBInstances({
              DBInstanceIdentifier: instance,
            }).promise();

          return status.DBInstances[0].DBInstanceStatus === 'available';
        },
      },
      {
        name: 'table_count',
        check: async () => {
          const client = await this.connectToInstance(instance);
          const result = await client.query(`
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
          `);

          return result.rows[0].count >= snapshot.metadata.tableCount;
        },
      },
      {
        name: 'row_count',
        check: async () => {
          const client = await this.connectToInstance(instance);
          const result = await client.query('SELECT COUNT(*) FROM cells');

          return result.rows[0].count >= snapshot.metadata.rowCount - 100; // Allow small delta
        },
      },
    ];

    const results = await Promise.all(
      checks.map(async c => ({
        name: c.name,
        passed: await c.check(),
      }))
    );

    return {
      passed: results.every(r => r.passed),
      checks: results,
    };
  }
}
```

---

### 4. Alerting on Failures

**Alert Configuration**:

```typescript
interface AlertConfig {
  name: string;
  condition: string;
  threshold: number;
  period: number;
  actions: AlertAction[];
}

class BackupAlertManager {
  private cloudwatch: CloudWatchClient;
  private sns: SNSClient;

  async setupAlerts() {
    const alerts: AlertConfig[] = [
      {
        name: 'Backup-Failure',
        condition: 'BackupFailure > 0',
        threshold: 0,
        period: 300, // 5 minutes
        actions: [
          { type: 'sns', topic: 'arn:aws:sns:...:backup-alerts' },
          { type: 'pagerduty', service: 'backup-service' },
        ],
      },
      {
        name: 'Restore-Test-Failure',
        condition: 'RestoreTestFailure > 0',
        threshold: 0,
        period: 3600, // 1 hour
        actions: [
          { type: 'sns', topic: 'arn:aws:sns:...:backup-alerts' },
          { type: 'slack', channel: '#incidents' },
        ],
      },
      {
        name: 'Backup-Age',
        condition: 'BackupAge > 3600',
        threshold: 3600, // 1 hour
        period: 300,
        actions: [
          { type: 'sns', topic: 'arn:aws:sns:...:backup-alerts' },
        ],
      },
    ];

    for (const alert of alerts) {
      await this.createAlarm(alert);
    }
  }

  private async createAlarm(config: AlertConfig) {
    await this.cloudwatch.putMetricAlarm({
      AlarmName: config.name,
      MetricName: 'BackupStatus',
      Namespace: 'Polln/Backup',
      Statistic: 'Sum',
      Period: config.period,
      EvaluationPeriods: 1,
      Threshold: config.threshold,
      ComparisonOperator: 'GreaterThanThreshold',
      TreatMissingData: 'breaching',
      AlarmActions: config.actions
        .filter(a => a.type === 'sns')
        .map(a => (a as any).topic),
    }).promise();
  }

  async sendAlert(alertType: string, details: any) {
    const message = {
      alertType,
      timestamp: new Date().toISOString(),
      details,
      severity: this.getSeverity(alertType),
    };

    // Send to SNS
    await this.sns.publish({
      TopicArn: process.env.ALERT_TOPIC_ARN,
      Message: JSON.stringify(message),
      Subject: `🔴 ${alertType}`,
    }).promise();

    // Send to Slack
    await this.sendToSlack(message);

    // Send to PagerDuty for critical alerts
    if (this.getSeverity(alertType) === 'critical') {
      await this.sendToPagerDuty(message);
    }
  }

  private async sendToSlack(message: any) {
    await slack.chat.postMessage({
      channel: '#backup-alerts',
      attachments: [{
        color: message.severity === 'critical' ? 'danger' : 'warning',
        title: `🔴 ${message.alertType}`,
        text: JSON.stringify(message.details, null, 2),
        ts: Math.floor(new Date(message.timestamp).getTime() / 1000),
      }],
    });
  }
}
```

---

### 5. Compliance Reporting

**Automated Compliance Reports**:

```typescript
class ComplianceReporter {
  async generateBackupComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const backups = await this.listBackupsInPeriod(startDate, endDate);

    const report: ComplianceReport = {
      period: { start: startDate, end: endDate },
      summary: {
        totalBackups: backups.length,
        successful: backups.filter(b => b.status === 'completed').length,
        failed: backups.filter(b => b.status === 'failed').length,
        compliance: this.calculateCompliance(backups),
      },
      byType: this.groupByType(backups),
      retention: this.analyzeRetention(backups),
      locations: this.analyzeLocations(backups),
      recommendations: await this.generateRecommendations(backups),
    };

    // Generate report documents
    await this.generatePDFReport(report);
    await this.uploadReportToAuditLog(report);

    return report;
  }

  private calculateCompliance(backups: Backup[]): ComplianceMetrics {
    const required = 24 * 7; // Hourly backups for a week
    const actual = backups.filter(b => b.status === 'completed').length;

    return {
      percentage: (actual / required) * 100,
      meetsThreshold: (actual / required) >= 0.99, // 99% threshold
      gaps: this.identifyGaps(backups),
    };
  }

  private identifyGaps(backups: Backup[]): BackupGap[] {
    const gaps: BackupGap[] = [];
    const sorted = backups.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
      const gapHours = gap / (1000 * 60 * 60);

      if (gapHours > 2) { // More than 2 hours between backups
        gaps.push({
          start: sorted[i - 1].timestamp,
          end: sorted[i].timestamp,
          duration: gapHours,
          severity: gapHours > 24 ? 'critical' : 'warning',
        });
      }
    }

    return gaps;
  }

  private async generateRecommendations(
    backups: Backup[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check for failed backups
    const failedCount = backups.filter(b => b.status === 'failed').length;
    if (failedCount > 0) {
      recommendations.push({
        priority: 'high',
        category: 'reliability',
        title: 'Address backup failures',
        description: `${failedCount} backups failed during reporting period`,
        action: 'Review backup logs and fix underlying issues',
      });
    }

    // Check retention compliance
    const oldBackups = backups.filter(b => {
      const age = Date.now() - b.timestamp.getTime();
      return age > 90 * 24 * 60 * 60 * 1000; // 90 days
    });

    if (oldBackups.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'retention',
        title: 'Review backup retention',
        description: `${oldBackups.length} backups exceed 90-day retention`,
        action: 'Transition to cold storage or delete as appropriate',
      });
    }

    // Check cross-region replication
    const replicated = backups.filter(b => b.replicated === true).length;
    const replicationRate = (replicated / backups.length) * 100;

    if (replicationRate < 95) {
      recommendations.push({
        priority: 'high',
        category: 'dr',
        title: 'Improve cross-region replication',
        description: `Only ${replicationRate}% of backups replicated to DR region`,
        action: 'Review replication configuration and fix failures',
      });
    }

    return recommendations;
  }
}
```

---

## Cost Optimization

### 1. Storage Tier Optimization

**Intelligent Tiering**:

```typescript
class StorageTierOptimizer {
  async analyzeAndOptimize() {
    const storage = await this.getStorageDistribution();
    const accessPatterns = await this.analyzeAccessPatterns();

    const recommendations = await this.generateTieringRecommendations(
      storage,
      accessPatterns
    );

    for (const rec of recommendations) {
      if (rec.savings > 10) { // Only if savings > $10/month
        await this.applyTiering(rec);
      }
    }
  }

  private async generateTieringRecommendations(
    storage: StorageDistribution,
    patterns: AccessPattern[]
  ): Promise<TieringRecommendation[]> {
    const recommendations: TieringRecommendation[] = [];

    for (const item of storage.items) {
      const lastAccess = patterns.find(p => p.key === item.key)?.lastAccess;
      const daysSinceAccess = this.daysSince(lastAccess);

      if (daysSinceAccess > 30 && item.tier !== 'STANDARD_IA') {
        const savings = this.calculateSavings(item, 'STANDARD_IA');

        recommendations.push({
          key: item.key,
          currentTier: item.tier,
          recommendedTier: 'STANDARD_IA',
          reason: `Not accessed in ${daysSinceAccess} days`,
          savings,
          action: 'transition',
        });
      }

      if (daysSinceAccess > 90 && item.tier !== 'GLACIER') {
        const savings = this.calculateSavings(item, 'GLACIER');

        recommendations.push({
          key: item.key,
          currentTier: item.tier,
          recommendedTier: 'GLACIER',
          reason: `Not accessed in ${daysSinceAccess} days`,
          savings,
          action: 'transition',
        });
      }
    }

    return recommendations;
  }

  private calculateSavings(item: StorageItem, targetTier: string): number {
    const currentCost = this.getTierCost(item.tier);
    const targetCost = this.getTierCost(targetTier);

    return (currentCost - targetCost) * item.sizeGB;
  }

  private getTierCost(tier: string): number {
    const costs = {
      'STANDARD': 0.023,
      'STANDARD_IA': 0.0125,
      'GLACIER': 0.004,
      'DEEP_ARCHIVE': 0.00099,
    };

    return costs[tier] || costs['STANDARD'];
  }
}
```

---

### 2. Retention Tuning

**Retention Optimization**:

```typescript
class RetentionOptimizer {
  async optimizeRetention() {
    const dataTypes = await this.listAllDataTypes();
    const recommendations: RetentionRecommendation[] = [];

    for (const dataType of dataTypes) {
      const currentPolicy = await this.getRetentionPolicy(dataType);
      const usage = await this.analyzeDataUsage(dataType);

      const optimizedPolicy = this.calculateOptimalRetention(
        currentPolicy,
        usage
      );

      if (optimizedPolicy.cost < currentPolicy.cost) {
        recommendations.push({
          dataType,
          currentPolicy,
          optimizedPolicy,
          savings: currentPolicy.cost - optimizedPolicy.cost,
          riskLevel: this.assessRisk(currentPolicy, optimizedPolicy),
        });
      }
    }

    return recommendations;
  }

  private calculateOptimalRetention(
    current: RetentionPolicy,
    usage: DataUsage
  ): RetentionPolicy {
    // Based on last access date
    const daysSinceAccess = this.daysSince(usage.lastAccess);

    // Add buffer based on access frequency
    let buffer = 30; // 30 day default buffer
    if (usage.accessFrequency === 'daily') buffer = 90;
    if (usage.accessFrequency === 'weekly') buffer = 180;
    if (usage.accessFrequency === 'monthly') buffer = 365;

    // Check regulatory requirements
    const requiredRetention = this.getRequiredRetention(current.dataType);

    return {
      ...current,
      retentionDays: Math.max(daysSinceAccess + buffer, requiredRetention),
    };
  }

  private getRequiredRetention(dataType: string): number {
    const requirements = {
      'financial': 7 * 365, // 7 years for SOX
      'audit': 7 * 365, // 7 years for SOC
      'personal': 365, // 1 year for GDPR
      'user-data': 365,
    };

    return requirements[dataType] || 90; // Default 90 days
  }
}
```

---

### 3. Compression

**Compression Strategy**:

```typescript
class BackupCompressionManager {
  async compressBackup(backupId: string): Promise<CompressionResult> {
    const backup = await this.getBackup(backupId);

    console.log(`Original size: ${backup.size} bytes`);

    // Determine best compression algorithm
    const algorithm = await this.selectCompressionAlgorithm(backup);

    // Compress
    const compressed = await this.compress(backup.data, algorithm);

    console.log(`Compressed size: ${compressed.length} bytes`);
    console.log(`Compression ratio: ${backup.size / compressed.length}x`);

    // Upload compressed version
    await this.uploadCompressed(backupId, compressed);

    // Update metadata
    await this.updateBackupMetadata(backupId, {
      compressed: true,
      algorithm,
      originalSize: backup.size,
      compressedSize: compressed.length,
    });

    return {
      originalSize: backup.size,
      compressedSize: compressed.length,
      ratio: backup.size / compressed.length,
      spaceSaved: backup.size - compressed.length,
      algorithm,
    };
  }

  private async selectCompressionAlgorithm(
    backup: Backup
  ): Promise<CompressionAlgorithm> {
    // Test different algorithms on a sample
    const sample = backup.data.slice(0, 10000); // 10KB sample

    const algorithms = [
      { name: 'gzip', level: 6 },
      { name: 'gzip', level: 9 },
      { name: 'brotli', quality: 11 },
    ];

    let best = algorithms[0];
    let bestRatio = 0;

    for (const algo of algorithms) {
      const compressed = await this.compress(sample, algo);
      const ratio = sample.length / compressed.length;

      if (ratio > bestRatio) {
        best = algo;
        bestRatio = ratio;
      }
    }

    return best;
  }

  private async compress(
    data: Buffer,
    algorithm: CompressionAlgorithm
  ): Promise<Buffer> {
    if (algorithm.name === 'gzip') {
      return gzipSync(data, { level: algorithm.level });
    }

    if (algorithm.name === 'brotli') {
      return brotliCompressSync(data, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: algorithm.quality,
        },
      });
    }

    throw new Error(`Unknown algorithm: ${algorithm.name}`);
  }
}
```

---

### 4. Deduplication

**Deduplication Strategy**:

```typescript
class DeduplicationManager {
  private chunkSize = 4 * 1024 * 1024; // 4MB chunks
  private hashCache: Map<string, string> = new Map();

  async deduplicateBackup(backupId: string): Promise<DeduplicationResult> {
    const backup = await this.getBackup(backupId);

    const chunks = await this.chunkData(backup.data, this.chunkSize);
    const uniqueChunks: Map<string, Buffer> = new Map();
    const chunkManifest: string[] = [];

    let deduplicatedBytes = 0;

    for (const chunk of chunks) {
      const hash = this.hashChunk(chunk);

      if (this.hashCache.has(hash)) {
        // Chunk already exists, just reference it
        chunkManifest.push(hash);
        deduplicatedBytes += chunk.length;
      } else {
        // New chunk, store it
        uniqueChunks.set(hash, chunk);
        this.hashCache.set(hash, hash);
        chunkManifest.push(hash);
      }
    }

    // Store unique chunks
    for (const [hash, data] of uniqueChunks) {
      await this.storeChunk(hash, data);
    }

    // Store manifest
    await this.storeManifest(backupId, chunkManifest);

    const compressionRatio = backup.data.length /
      (uniqueChunks.size * this.chunkSize);

    return {
      originalSize: backup.data.length,
      deduplicatedSize: uniqueChunks.size * this.chunkSize,
      spaceSaved: deduplicatedBytes,
      compressionRatio,
      uniqueChunks: uniqueChunks.size,
      totalChunks: chunks.length,
    };
  }

  private hashChunk(chunk: Buffer): string {
    return createHash('sha256')
      .update(chunk)
      .digest('hex');
  }

  private async chunkData(
    data: Buffer,
    size: number
  ): Promise<Buffer[]> {
    const chunks: Buffer[] = [];

    for (let i = 0; i < data.length; i += size) {
      chunks.push(data.slice(i, i + size));
    }

    return chunks;
  }

  async reassembleBackup(manifestId: string): Promise<Buffer> {
    const manifest = await this.getManifest(manifestId);
    const chunks: Buffer[] = [];

    for (const hash of manifest.chunks) {
      const chunk = await this.getChunk(hash);
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }
}
```

---

### 5. Cross-Region Transfer Costs

**Cost Optimization for Cross-Region Replication**:

```typescript
class CrossRegionCostOptimizer {
  async optimizeCrossRegionTransfer() {
    const transfers = await this.analyzeCrossRegionTransfers();

    const optimizations = transfers.map(transfer => ({
      transfer,
      recommendations: this.generateOptimizationRecommendations(transfer),
    }));

    for (const opt of optimizations) {
      await this.applyOptimizations(opt);
    }
  }

  private generateOptimizationRecommendations(
    transfer: CrossRegionTransfer
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // 1. Batch transfers
    if (transfer.frequency === 'continuous' && transfer.dataSize < 100 * 1024 * 1024) {
      recommendations.push({
        type: 'batch',
        description: 'Batch small transfers to reduce requests',
        estimatedSavings: transfer.cost * 0.2,
        implementation: 'Accumulate data and transfer in batches',
      });
    }

    // 2. Use S3 Transfer Acceleration
    if (transfer.distance > 5000 && transfer.dataSize > 5 * 1024 * 1024 * 1024) {
      recommendations.push({
        type: 'acceleration',
        description: 'Enable S3 Transfer Acceleration for long-distance transfers',
        estimatedSavings: (transfer.transferTime / 3600) * 50, // Time-based cost
        implementation: 'Add Transfer Acceleration endpoint',
      });
    }

    // 3. Compress before transfer
    if (!transfer.compressed && transfer.compressionRatio > 2) {
      recommendations.push({
        type: 'compression',
        description: 'Compress data before transfer',
        estimatedSavings: transfer.cost * (1 - 1 / transfer.compressionRatio),
        implementation: 'Enable gzip compression for transfers',
      });
    }

    // 4. Schedule during off-peak
    if (transfer.urgency !== 'critical') {
      recommendations.push({
        type: 'scheduling',
        description: 'Schedule transfers during off-peak hours',
        estimatedSavings: transfer.cost * 0.1, // Potential data transfer savings
        implementation: 'Delay transfers to off-peak window',
      });
    }

    return recommendations;
  }
}
```

---

## RTO/RPO Matrix

### Complete Recovery Objectives

| Service Component | Tier | RTO | RPO | Backup Method | Restore Method |
|------------------|------|-----|-----|---------------|----------------|
| **Primary Database (RDS)** | 0 | 1h | 0s | Multi-AZ + PITR | Auto-failover |
| **Cell State (DynamoDB)** | 0 | 1h | 0s | PITR | Table restore |
| **Authentication** | 0 | 1h | 5m | Snapshots | Multi-AZ failover |
| **Application Servers** | 1 | 2h | 5m | AMI snapshots | ASG scaling |
| **API Gateway** | 1 | 2h | 0s | Configuration | Deploy backup |
| **Cell Processing** | 1 | 2h | 15m | State snapshots | Restore state |
| **File Storage (EFS)** | 2 | 4h | 15m | Daily backups | Backup restore |
| **Analytics DB** | 2 | 4h | 1d | Daily snapshots | Snapshot restore |
| **Logs (CloudWatch)** | 2 | 4h | 1h | Export to S3 | S3 restore |
| **Dev Tools** | 3 | 24h | 1d | Weekly backups | Manual restore |
| **Test Environment** | 3 | 24h | 1d | Weekly backups | Manual restore |
| **Monitoring Data** | 3 | 24h | 1d | Daily export | S3 restore |

---

## DR Runbook Templates

### Quick Reference Runbooks

#### 1. Database Failover
```bash
# Immediate Actions (0-5 min)
1. Check RDS status: aws rds describe-db-instances
2. If failover needed: aws rds failover-db-instance
3. Verify promotion: aws rds describe-db-instances

# Validation (5-15 min)
1. Test DB connection
2. Run health checks
3. Monitor metrics
```

#### 2. Cross-Region Failover
```bash
# Initiate Failover (0-30 min)
1. Update Route53: aws route53 change-resource-record-sets
2. Promote DR replica: aws rds promote-read-replica
3. Scale DR ASG: aws autoscaling set-desired-capacity

# Validate (30-60 min)
1. Run smoke tests
2. Monitor error rates
3. Check performance
```

#### 3. Ransomware Response
```bash
# Isolate (0-15 min)
1. Disable inbound traffic
2. Stop affected instances
3. Revoke compromised credentials

# Assess (15-60 min)
1. Identify scope of encryption
2. Determine patient zero
3. Check for data exfiltration

# Recover (1-24 hours)
1. Restore from clean backups
2. Scan for backdoors
3. Rotate all credentials
4. Patch vulnerabilities
```

---

## Conclusion

This comprehensive backup and disaster recovery strategy ensures:

1. **Data Durability**: 99.999999999% (11 nines) through multi-layer backups
2. **Rapid Recovery**: RTO of 1-4 hours depending on service tier
3. **Minimal Data Loss**: RPO of 0-15 minutes through continuous backups
4. **Cost Efficiency**: Optimized through intelligent tiering and lifecycle management
5. **Compliance**: Meets SOC 2, SOX, HIPAA, and GDPR requirements
6. **Automation**: Minimal manual intervention required
7. **Testability**: Regular automated testing validates recovery procedures

**Next Steps**:
1. Implement automated backup scheduler
2. Set up cross-region replication
3. Configure lifecycle policies
4. Implement backup validation
5. Schedule regular DR drills
6. Set up monitoring and alerting

---

**Document Version**: 1.0
**Last Updated**: 2026-03-09
**Status**: ✅ Complete
**Owner**: Infrastructure Team
**Review Cycle**: Quarterly
**Next Review**: 2026-06-09
