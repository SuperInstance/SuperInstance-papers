# POLLN Audit Logging System

Comprehensive audit logging system for SOC 2 Type II, GDPR, HIPAA, and ISO 27001 compliance.

## Features

- **Comprehensive Event Logging**: Track all user actions, system events, and security incidents
- **Multiple Storage Backends**: PostgreSQL with partitioning, S3 archival, Elasticsearch for search
- **Compliance Reporting**: Pre-built reports for SOC 2, GDPR, HIPAA
- **Real-time Monitoring**: Live audit log viewer with filtering and search
- **Performance Optimized**: <100ms logging overhead with async buffering
- **Sensitive Data Protection**: Automatic masking of sensitive fields

## Installation

```bash
npm install @polln/audit
```

## Quick Start

### Backend Integration

```typescript
import { initializeAuditSystem, auditMiddleware, getComplianceReporter } from '@polln/audit';
import express from 'express';

const app = express();

// Initialize audit system
await initializeAuditSystem({
  storage: {
    postgres: {
      host: process.env.DB_HOST,
      database: 'polln_audit',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    s3: {
      bucket: 'audit-logs',
      region: 'us-east-1',
    },
  },
  logger: {
    bufferSize: 100,
    flushInterval: 5000,
    maskSensitiveData: true,
  },
});

// Add audit middleware
app.use(auditMiddleware({
  logBody: true,
  logHeaders: false,
  maskSensitiveData: true,
  excludePaths: ['/health', '/ping'],
}));
```

### Logging Events

```typescript
import { getAuditLogger, AuditOutcome } from '@polln/audit';

const logger = getAuditLogger();

// Log with full details
await logger.log({
  eventType: 'cell_updated',
  category: AuditCategory.DATA_MODIFICATION,
  severity: AuditSeverity.INFO,
  outcome: AuditOutcome.SUCCESS,
  actor: {
    id: 'user-123',
    type: 'user',
    username: 'alice',
    email: 'alice@example.com',
  },
  action: {
    operation: 'update',
    resourceType: 'cell',
    description: 'Updated cell A1',
  },
  resource: {
    type: 'cell',
    id: 'cell-456',
    name: 'A1',
  },
  request: {
    id: 'req-789',
    method: 'PUT',
    path: '/api/cells/cell-456',
  },
  context: {
    environment: 'production',
  },
});

// Quick log helper
await logger.logQuick(
  'login_success',
  'user-123',
  'auth',
  'login',
  AuditOutcome.SUCCESS
);
```

### Querying Events

```typescript
import { getAuditQueryService } from '@polln/audit';

const queryService = getAuditQueryService();

// Query by time range
const events = await queryService.getTimeRangeEvents(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

// Query by user
const userEvents = await queryService.getUserEvents('user-123');

// Get failed events
const failures = await queryService.getFailedEvents();

// Get statistics
const stats = await queryService.getStatistics();
```

### Compliance Reports

```typescript
import { getComplianceReporter, ReportType, ReportFormat } from '@polln/audit';

const reporter = getComplianceReporter();

// Generate SOC 2 user activity report
const soc2Report = await reporter.generateReport(
  ReportType.SOC2_USER_ACTIVITY,
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  ReportFormat.PDF
);

// Generate GDPR data access report
const gdprReport = await reporter.generateReport(
  ReportType.GDPR_DATA_ACCESS,
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  ReportFormat.JSON
);

console.log(soc2Report.summary);
console.log(soc2Report.recommendations);
```

## Frontend Components

### Audit Log Viewer

```tsx
import { AuditLogViewer } from '@polln/ui/admin';

function AuditPage() {
  return (
    <AuditLogViewer
      apiBaseUrl="/api/audit"
      autoRefresh={true}
      refreshInterval={30000}
    />
  );
}
```

### Compliance Dashboard

```tsx
import { ComplianceDashboard } from '@polln/ui/admin';

function CompliancePage() {
  return (
    <ComplianceDashboard
      apiBaseUrl="/api/compliance"
    />
  );
}
```

### Security Report Panel

```tsx
import { SecurityReportPanel } from '@polln/ui/admin';

function SecurityPage() {
  return (
    <SecurityReportPanel
      apiBaseUrl="/api/security"
      autoRefresh={true}
      refreshInterval={30000}
    />
  );
}
```

## Event Types

### Authentication Events
- `login_success` - Successful user login
- `login_failed` - Failed login attempt
- `login_blocked` - Login blocked by security policy
- `token_issued` - Authentication token issued
- `mfa_enabled` - Multi-factor authentication enabled
- `password_changed` - User password changed

### Authorization Events
- `permission_granted` - Permission granted to user
- `access_denied` - Access to resource denied
- `privilege_escalation` - User privilege escalated

### Data Access Events
- `cell_read` - Cell data read
- `sheet_read` - Sheet data read
- `export_initiated` - Data export initiated

### Data Modification Events
- `cell_updated` - Cell data updated
- `cell_deleted` - Cell data deleted
- `sheet_created` - Sheet created
- `bulk_delete` - Bulk data deletion

### Security Events
- `suspicious_activity` - Suspicious activity detected
- `brute_force_detected` - Brute force attack detected
- `data_breach_attempt` - Data breach attempt detected

### Compliance Events
- `gdpr_data_request` - GDPR data access request
- `soc2_audit_completed` - SOC 2 audit completed

## Storage Backends

### PostgreSQL

```typescript
import { PostgreSQLAuditStorage } from '@polln/audit';

const pgStorage = new PostgreSQLAuditStorage({
  host: 'localhost',
  database: 'audit_logs',
  user: 'audit_user',
  password: 'secure_password',
});

await pgStorage.initialize();
```

**Features:**
- Automatic table partitioning by month
- Optimized indexes for common queries
- Retention policy support

### S3 (Cold Storage)

```typescript
import { S3AuditStorage } from '@polln/audit';

const s3Storage = new S3AuditStorage({
  bucket: 'audit-logs-archive',
  region: 'us-east-1',
});

await s3Storage.initialize();
```

**Features:**
- Automatic archival by date
- Cost-effective long-term storage
- Lifecycle policies

### Elasticsearch (Search)

```typescript
import { ElasticsearchAuditStorage } from '@polln/audit';

const esStorage = new ElasticsearchAuditStorage({
  node: 'http://localhost:9200',
});

await esStorage.initialize();
```

**Features:**
- Full-text search
- Aggregations and analytics
- Index lifecycle management

## Performance

- **Logging Overhead**: <100ms per event
- **Buffer Size**: 100 events (configurable)
- **Flush Interval**: 5 seconds (configurable)
- **Throughput**: 10,000+ events/second

## Security

- **Sensitive Data Masking**: Automatic masking of passwords, tokens, API keys
- **Encryption**: Data encrypted at rest and in transit
- **Access Control**: Role-based access to audit logs
- **Tamper Detection**: Immutable audit trail with checksums

## Compliance

### SOC 2 Type II
- User activity reports
- Security incident tracking
- Access review logs
- Change management records

### GDPR
- Data access logs
- Data processing records
- Consent tracking
- Data deletion records

### HIPAA
- Protected health information (PHI) access logs
- Disclosure reporting
- Security incident tracking

## Configuration

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_DATABASE=polln_audit
DB_USER=audit_user
DB_PASSWORD=secure_password

# S3
S3_BUCKET=audit-logs
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Elasticsearch
ES_NODE=http://localhost:9200

# Audit Settings
AUDIT_BUFFER_SIZE=100
AUDIT_FLUSH_INTERVAL=5000
AUDIT_MASK_SENSITIVE=true
AUDIT_SAMPLING_ENABLED=false
```

## Testing

```bash
npm run test:audit
```

## API Endpoints

### Query Events
```
GET /api/audit/events
Query Parameters:
  - startTime: ISO date string
  - endTime: ISO date string
  - actorIds: comma-separated list
  - eventTypes: comma-separated list
  - severities: comma-separated list
  - limit: number (default: 100)
  - offset: number (default: 0)
```

### Export Events
```
GET /api/audit/export?format=json|csv
```

### Compliance Reports
```
GET /api/compliance/reports
Query Parameters:
  - type: ReportType
  - periodStart: ISO date string
  - periodEnd: ISO date string
  - format: json|pdf|csv
```

### Security Alerts
```
GET /api/security/alerts
GET /api/security/metrics
```

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
