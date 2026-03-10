# POLLN Spreadsheet Security Middleware

Comprehensive security suite for POLLN spreadsheet operations with defense in depth.

## Overview

The security middleware provides enterprise-grade protection for spreadsheet operations including:

- **Authentication & Authorization**: Session management, JWT validation, permission checks
- **Role-Based Access Control (RBAC)**: Hierarchical permissions, role inheritance, scoped access
- **Permission Checking**: Cell-level, row-level, column-level, and range-based permissions
- **Audit Logging**: Comprehensive audit trail with tamper evidence and compliance support
- **Data Classification**: Automatic PII detection and sensitivity labeling
- **Security Validation**: XSS, SQL injection, formula injection prevention

## Installation

```bash
npm install @polln/spreadsheet-security
```

## Quick Start

```typescript
import {
  AuthMiddleware,
  RBACManager,
  PermissionChecker,
  DataClassifier,
  AuditLogger
} from '@polln/spreadsheet-security';

// Initialize components
const auth = new AuthMiddleware();
const rbac = new RBACManager();
const permChecker = new PermissionChecker();
const classifier = new DataClassifier();
const audit = new AuditLogger();

// Create session
const session = await auth.createSession(
  'user123',
  'john.doe',
  ['editor'],
  permissions,
  '127.0.0.1',
  'Mozilla/5.0...'
);

// Check permissions
const canEdit = await permChecker.canWriteCell('user123', {
  sheetId: 'sheet1',
  row: 5,
  column: 3
});

// Classify data
const classification = classifier.classify('john@example.com');
console.log(classification.classification); // 'restricted'
console.log(classification.piiTypes); // ['email']

// Log event
await audit.logAccess('user123', 'sheet1', 'read', {
  ipAddress: '127.0.0.1'
});
```

## Components

### 1. AuthMiddleware

Handles authentication and authorization.

```typescript
import { AuthMiddleware } from '@polln/spreadsheet-security';

const auth = new AuthMiddleware();

// Authenticate request
const result = await auth.authenticate(req);

// Authorize with permission
const authz = await auth.authorize(req, {
  id: 'perm1',
  resource: 'spreadsheet',
  action: 'read'
});

// Middleware for Express
app.use(auth.requireAuth());
app.use(auth.requirePermission({
  id: 'perm1',
  resource: 'spreadsheet',
  action: 'write'
}));
```

**Features:**
- Session management with configurable TTL
- Failed login attempt tracking
- Account lockout after max attempts
- Token validation and refresh
- IP and User Agent tracking

### 2. RBACManager

Manages roles, permissions, and assignments.

```typescript
import { RBACManager, SystemRole } from '@polln/spreadsheet-security';

const rbac = new RBACManager();

// Create custom role
await rbac.createRole({
  id: 'analyst',
  name: 'Data Analyst',
  description: 'Can read and analyze data',
  permissions: [
    {
      id: 'analyst-read',
      resource: 'spreadsheet',
      action: 'read'
    }
  ],
  isSystemRole: false,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Assign role to user
await rbac.assignRole('user123', 'analyst');

// Check permissions
const hasPermission = await rbac.hasPermission('user123', {
  id: 'test',
  resource: 'spreadsheet',
  action: 'read'
});

// Get user roles
const roles = await rbac.getUserRoles('user123');
```

**Features:**
- System roles (Owner, Admin, Editor, Viewer, Commenter, Guest)
- Custom role creation
- Role assignment with scope
- Permission aggregation from roles
- Role inheritance and cloning
- Permission expiration

### 3. PermissionChecker

Fine-grained permission checking at multiple levels.

```typescript
import { PermissionChecker } from '@polln/spreadsheet-security';

const checker = new PermissionChecker();

// Cell-level permissions
const canRead = await checker.canReadCell('user123', {
  sheetId: 'sheet1',
  row: 5,
  column: 3
});

const canWrite = await checker.canWriteCell('user123', {
  sheetId: 'sheet1',
  row: 5,
  column: 3
});

// Row-level permissions
const canReadRow = await checker.canReadRow('user123', 'sheet1', 5);

// Column-level permissions
const canReadColumn = await checker.canReadColumn('user123', 'sheet1', 3);

// Range permissions
const canAccessRange = await checker.canAccessRange('user123', {
  sheetId: 'sheet1',
  startRow: 1,
  startColumn: 1,
  endRow: 10,
  endColumn: 5
}, 'read');

// Get restricted cells
const restricted = await checker.getRestrictedCells('user123', {
  sheetId: 'sheet1',
  startRow: 1,
  startColumn: 1,
  endRow: 10,
  endColumn: 10
}, 'write');
```

**Features:**
- Cell, row, column, and range-level permissions
- Permission inheritance (sheet → range → row/column → cell)
- Performance-cached permission decisions
- Permission scope matching
- Bulk permission checks

### 4. DataClassifier

Automatic PII detection and data classification.

```typescript
import { DataClassifier, DataClassification, PIIType } from '@polln/spreadsheet-security';

const classifier = new DataClassifier();

// Classify a value
const result = classifier.classify('john@example.com');
console.log(result.classification); // DataClassification.RESTRICTED
console.log(result.piiTypes); // [PIIType.EMAIL]
console.log(result.confidence); // 0.95

// Classify with column hints
const result = classifier.classifyCellValue('john@example.com', 'email');

// Classify entire row
const rowResults = classifier.classifyRow({
  name: 'John Doe',
  email: 'john@example.com',
  ssn: '123-45-6789'
});

// Mask PII
const masked = classifier.maskPII('john@example.com', '*');
console.log(masked); // '***********'

// Generate classification report
const report = classifier.generateClassificationReport(data);
console.log(report.summary.piiCells); // 5
console.log(report.recommendations); // ['Implement encryption...']

// Get PII statistics
const stats = classifier.getPIIStatistics(data);
console.log(stats.rowsWithPII); // 10
console.log(stats.piiTypeCounts); // { email: 5, ssn: 3, ... }
```

**Supported PII Types:**
- Email addresses
- Social Security Numbers (SSN)
- Credit card numbers
- Phone numbers
- IP addresses
- MAC addresses
- Passport numbers
- Driver's license numbers
- Bank account numbers

**Classification Levels:**
- **PUBLIC**: General information
- **INTERNAL**: Internal business data
- **CONFIDENTIAL**: Sensitive business data
- **RESTRICTED**: PII requiring access controls
- **CRITICAL**: Highly sensitive PII (SSN, credit cards)

### 5. SecurityValidator

Input validation and sanitization.

```typescript
import {
  SecurityValidator,
  Severity,
  ThreatCategory
} from '@polln/spreadsheet-security';

const validator = new SecurityValidator();

// Validate input
const result = validator.validate(userInput);

if (!result.valid) {
  console.log('Threats detected:', result.threats);
  // Use sanitized version
  console.log('Sanitized:', result.sanitized);
}

// Validate cell value
const cellResult = validator.validateCellValue('A1', cellValue, 'string');

// Validate formula
const formulaResult = validator.validateFormula('=SUM(A1:A10)');

// Escape functions
const safeHTML = SecurityValidator.escapeHTML(userInput);
const safeSQL = SecurityValidator.escapeSQL(userInput);
const safeShell = SecurityValidator.escapeShell(userInput);
```

**Threat Detection:**
- XSS (Cross-site scripting)
- SQL injection
- Formula injection
- Path traversal
- Command injection
- SSRF (Server-side request forgery)
- Header injection

## Usage Examples

### Example 1: Secure Spreadsheet API

```typescript
import express from 'express';
import {
  authMiddleware,
  permissionChecker,
  auditLogger
} from '@polln/spreadsheet-security';

const app = express();

// Apply authentication
app.use('/api/*', authMiddleware.requireAuth());

// Get cell value
app.get('/api/sheets/:sheetId/cells/:cellId', async (req, res) => {
  const { sheetId, cellId } = req.params;
  const userId = req.user!.id;

  // Check permission
  const canRead = await permissionChecker.canReadCell(userId, {
    sheetId,
    row: parseInt(cellId.match(/R(\d+)/)?.[1] || '1'),
    column: parseInt(cellId.match(/C(\d+)/)?.[1] || '1')
  });

  if (!canRead.granted) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  // Log access
  await auditLogger.logAccess(userId, cellId, 'read', {
    sheetId,
    result: 'success'
  });

  // Get and return cell value
  const value = await getCellValue(sheetId, cellId);
  res.json({ value });
});

// Update cell value
app.put('/api/sheets/:sheetId/cells/:cellId', async (req, res) => {
  const { sheetId, cellId } = req.params;
  const { value } = req.body;
  const userId = req.user!.id;

  // Check permission
  const canWrite = await permissionChecker.canWriteCell(userId, {
    sheetId,
    row: parseInt(cellId.match(/R(\d+)/)?.[1] || '1'),
    column: parseInt(cellId.match(/C(\d+)/)?.[1] || '1')
  });

  if (!canWrite.granted) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  // Classify data
  const classification = dataClassifier.classify(value);
  if (classification.classification === DataClassification.CRITICAL) {
    // Require additional approval for critical data
    await auditLogger.logSecurityEvent(userId, 'critical_data_update', 'high', {
      cellId,
      classification: classification.classification
    });
  }

  // Log modification
  await auditLogger.logModification(userId, cellId, sheetId, row, col, oldValue, value);

  // Update cell
  await updateCellValue(sheetId, cellId, value);
  res.json({ success: true });
});
```

### Example 2: Row-Level Security

```typescript
// Filter rows based on permissions
async function getFilteredRows(
  userId: string,
  sheetId: string
): Promise<number[]> {
  const allRows = await getAllRows(sheetId);
  const restrictedRows = await permissionChecker.getRestrictedRows(
    userId,
    sheetId,
    'read'
  );

  const restrictedSet = new Set(restrictedRows);
  return allRows.filter(row => !restrictedSet.has(row));
}

// Use in API endpoint
app.get('/api/sheets/:sheetId/rows', async (req, res) => {
  const userId = req.user!.id;
  const { sheetId } = req.params;

  const accessibleRows = await getFilteredRows(userId, sheetId);
  const data = await getRowData(sheetId, accessibleRows);

  res.json({ rows: data });
});
```

### Example 3: Data Classification on Import

```typescript
async function importSpreadsheet(
  userId: string,
  file: File
): Promise<{
  success: boolean;
  warnings: string[];
  classifications: Record<string, DataClassification>;
}> {
  const data = await parseSpreadsheet(file);
  const warnings: string[] = [];
  const classifications: Record<string, DataClassification> = {};

  // Classify each cell
  for (const [sheetId, sheet] of Object.entries(data)) {
    for (const [cellRef, value] of Object.entries(sheet)) {
      const result = dataClassifier.classifyCellValue(
        value,
        getColumnFromRef(cellRef)
      );

      if (result.classification !== DataClassification.PUBLIC) {
        warnings.push(
          `Cell ${cellRef} contains ${result.classification} data`
        );
      }

      classifications[cellRef] = result.classification;

      // Log if PII detected
      if (result.piiTypes.length > 0) {
        await auditLogger.logEvent({
          eventType: AuditEventType.DATA_CLASSIFICATION,
          userId,
          resourceId: cellRef,
          resourceType: 'cell',
          action: 'pii_detected',
          details: {
            piiTypes: result.piiTypes,
            classification: result.classification
          },
          result: 'success'
        });
      }
    }
  }

  // Import data
  await importToDatabase(data);

  return {
    success: true,
    warnings,
    classifications
  };
}
```

### Example 4: Custom Role with Scoped Permissions

```typescript
// Create a role with row-scoped permissions
async function createRegionalAnalystRole(region: string): Promise<void> {
  const roleId = `analyst-${region.toLowerCase()}`;

  await rbacManager.createRole({
    id: roleId,
    name: `${region} Analyst`,
    description: `Analyst with access to ${region} data only`,
    permissions: [
      {
        id: `${roleId}-read`,
        resource: 'spreadsheet',
        action: 'read',
        scope: {
          type: 'sheet',
          id: `sheet-${region.toLowerCase()}`
        }
      },
      {
        id: `${roleId}-write`,
        resource: 'spreadsheet',
        action: 'write',
        scope: {
          type: 'range',
          range: {
            sheetId: `sheet-${region.toLowerCase()}`,
            startRow: 2,
            startColumn: 2,
            endRow: 100,
            endColumn: 10
          }
        }
      }
    ],
    isSystemRole: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

// Usage
await createRegionalAnalystRole('EMEA');
await rbacManager.assignRole('user123', 'analyst-emea');
```

## Security Best Practices

### 1. Principle of Least Privilege

Always grant the minimum permissions needed:

```typescript
// Bad: Granting admin access
await rbac.assignRole('user123', SystemRole.ADMIN);

// Good: Granting specific role
await rbac.assignRole('user123', SystemRole.VIEWER);
```

### 2. Always Validate Input

```typescript
// Always validate user input
const result = validator.validate(userInput);
if (!result.valid) {
  throw new Error('Invalid input');
}

// Use sanitized version
const safe = result.sanitized || userInput;
```

### 3. Log Security Events

```typescript
// Log all access to sensitive data
if (classification.classification >= DataClassification.RESTRICTED) {
  await auditLogger.logAccess(userId, resourceId, 'read', {
    classification: classification.classification,
    piiTypes: classification.piiTypes
  });
}
```

### 4. Use Permission Caching Wisely

```typescript
// Cache is automatically managed, but clear when permissions change
await rbac.revokeRole('user123', SystemRole.EDITOR);
permissionChecker.clearUserCache('user123');
```

### 5. Classify Data Before Storage

```typescript
// Always classify data before storing
const classification = classifier.classify(data);
await storeData(data, {
  classification: classification.classification,
  requiresEncryption: classification.classification >= DataClassification.RESTRICTED
});
```

## API Reference

See TypeScript definitions for complete API documentation:

```typescript
import type {
  Permission,
  PermissionScope,
  Role,
  RoleAssignment,
  UserSession,
  AuthenticationResult,
  AuthorizationResult,
  DataClassificationResult,
  SecurityValidationResult,
  AuditEvent,
  AuditFilter
} from '@polln/spreadsheet-security';
```

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tests pass:

```bash
npm test
```

## Support

For issues and questions, please open a GitHub issue.
