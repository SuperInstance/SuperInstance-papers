# POLLN Spreadsheet Database Layer

Comprehensive database layer for the POLLN spreadsheet system with PostgreSQL, Redis caching, transaction support, and audit logging.

## Features

- **PostgreSQL** with connection pooling (using `pg` package)
- **Redis** caching with configurable TTL (using existing `ioredis` package)
- **Transaction support** with automatic rollback on errors
- **Prepared statements** for performance
- **Full TypeScript types** for type safety
- **Migration system** with version tracking and rollback support
- **Audit logging** for compliance and debugging
- **Health monitoring** for database and cache connections
- **Batch operations** for efficient bulk updates
- **Optimistic locking** with version checking

## Installation

```bash
npm install pg @types/pg
```

## Quick Start

```typescript
import { DatabaseManager, CellRepository, SpreadsheetRepository } from '@polln/spreadsheet/database';

// Create database manager
const dbManager = new DatabaseManager({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'polln',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    pool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  },
  cache: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: 0,
    keyPrefix: 'polln',
  },
});

// Initialize
await dbManager.initialize();

// Create repositories
const cellRepo = new CellRepository(dbManager);
const spreadsheetRepo = new SpreadsheetRepository(dbManager);

// Create a spreadsheet
const spreadsheet = await spreadsheetRepo.create({
  name: 'My Spreadsheet',
  description: 'A test spreadsheet',
  ownerId: 'user-123',
  rowCount: 1000,
  colCount: 26,
});

// Create a cell
const cell = await cellRepo.create({
  spreadsheetId: spreadsheet.id,
  row: 1,
  col: 1,
  type: CellType.INPUT,
  value: 42,
});

// Query cells
const cells = await cellRepo.findBySpreadsheet(spreadsheet.id);

// Update a cell
const updated = await cellRepo.update(cell.id, { value: 100 });

// Delete a cell
await cellRepo.delete(cell.id);

// Cleanup
await dbManager.close();
```

## Repositories

### CellRepository

Manages cell CRUD operations, batch operations, and range queries.

```typescript
const cellRepo = new CellRepository(dbManager);

// Find by ID
const cell = await cellRepo.findById('cell-123');

// Find by position
const cell = await cellRepo.findByPosition('sheet-123', 1, 1);

// Find by range
const cells = await cellRepo.findByRange('sheet-123', {
  startRow: 1,
  endRow: 10,
  startCol: 1,
  endCol: 5,
});

// Create
const cell = await cellRepo.create({
  spreadsheetId: 'sheet-123',
  row: 1,
  col: 1,
  type: CellType.INPUT,
  value: 42,
});

// Update with optimistic locking
const updated = await cellRepo.update(cell.id, { value: 100 }, cell.version);

// Delete
await cellRepo.delete(cell.id);

// Batch operations
const cells = await cellRepo.batchCreate([
  { spreadsheetId: 'sheet-123', row: 1, col: 1, type: CellType.INPUT },
  { spreadsheetId: 'sheet-123', row: 1, col: 2, type: CellType.INPUT },
]);

const updated = await cellRepo.batchUpdate([
  { id: 'cell-1', updates: { value: 100 }, expectedVersion: 1 },
  { id: 'cell-2', updates: { value: 200 }, expectedVersion: 1 },
]);
```

### SpreadsheetRepository

Manages spreadsheet CRUD operations, permissions, and share links.

```typescript
const spreadsheetRepo = new SpreadsheetRepository(dbManager);

// Find by ID
const spreadsheet = await spreadsheetRepo.findById('sheet-123');

// Find by user
const spreadsheets = await spreadsheetRepo.findByUser('user-123');

// Create
const spreadsheet = await spreadsheetRepo.create({
  name: 'My Spreadsheet',
  ownerId: 'user-123',
});

// Update
const updated = await spreadsheetRepo.update('sheet-123', {
  name: 'Updated Name',
});

// Permissions
await spreadsheetRepo.grantPermission({
  spreadsheetId: 'sheet-123',
  userId: 'user-456',
  permissionLevel: PermissionLevel.EDIT,
  grantedBy: 'user-123',
});

const hasPermission = await spreadsheetRepo.hasPermission(
  'sheet-123',
  'user-456',
  PermissionLevel.EDIT
);

// Share links
const shareLink = await spreadsheetRepo.createShareLink({
  spreadsheetId: 'sheet-123',
  permissionLevel: PermissionLevel.VIEW,
  createdBy: 'user-123',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
});

// Export/Import
const exportJob = await spreadsheetRepo.createExport({
  spreadsheetId: 'sheet-123',
  userId: 'user-123',
  format: ExportFormat.XLSX,
});
```

### UserRepository

Manages user accounts, sessions, and OAuth integration.

```typescript
const userRepo = new UserRepository(dbManager);

// Find by email
const user = await userRepo.findByEmail('user@example.com');

// Create
const user = await userRepo.create({
  email: 'user@example.com',
  displayName: 'User Name',
  provider: AuthProvider.LOCAL,
  providerId: 'local-123',
});

// OAuth integration
const user = await userRepo.findOrCreateOAuthUser(
  AuthProvider.GOOGLE,
  'google-123',
  'user@example.com',
  {
    displayName: 'User Name',
    avatarUrl: 'https://example.com/avatar.png',
  }
);

// Sessions
const session = await userRepo.createSession({
  userId: user.id,
  token: 'session-token',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
});

const validSession = await userRepo.findSessionByToken('session-token');
```

### AuditRepository

Manages audit logs for compliance and debugging.

```typescript
const auditRepo = new AuditRepository(dbManager);

// Create audit log
await auditRepo.create({
  eventType: AuditEventType.CELL_CREATED,
  userId: 'user-123',
  spreadsheetId: 'sheet-123',
  cellId: 'cell-123',
  action: 'create',
  details: { value: 42 },
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0',
});

// Query audit logs
const logs = await auditRepo.find({
  userId: 'user-123',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});

// Generate compliance reports
const report = await auditRepo.generateComplianceReport(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

// Activity timeline
const timeline = await auditRepo.getActivityTimeline(
  new Date('2024-01-01'),
  new Date('2024-12-31'),
  'day'
);
```

## Transactions

Execute multiple operations in a single transaction:

```typescript
await dbManager.transaction(async (tx) => {
  // Create spreadsheet
  const spreadsheet = await tx.query(
    'INSERT INTO spreadsheets (id, name, owner_id) VALUES ($1, $2, $3) RETURNING *',
    ['sheet-123', 'My Sheet', 'user-123']
  );

  // Create cells
  await tx.query(
    'INSERT INTO cells (id, spreadsheet_id, row, col, type) VALUES ($1, $2, $3, $4, $5)',
    ['cell-1', 'sheet-123', 1, 1, 'input']
  );

  // All operations will be committed automatically
});

// Transactions automatically rollback on error
```

## Migrations

Run database migrations:

```typescript
import { MigrationRunner } from '@polln/spreadsheet/database';

const runner = new MigrationRunner(dbManager);

// Initialize migrations table
await runner.initialize();

// Run pending migrations
await runner.migrate();

// Rollback a migration
await runner.rollback(1);

// Get status
const status = await runner.getStatus();
console.log(status);
// { current: 2, latest: 2, pending: [], applied: [...] }
```

## Caching

Use Redis caching for improved performance:

```typescript
// Set cache
await dbManager.cacheSet('key', { data: 'value' }, 60); // 60 second TTL

// Get cache
const value = await dbManager.cacheGet('key');

// Delete cache
await dbManager.cacheDelete('key');

// Delete by pattern
await dbManager.cacheDeletePattern('spreadsheet:*');

// Clear all cache
await dbManager.cacheClear();
```

## Health Monitoring

Check database and cache health:

```typescript
const health = await dbManager.healthCheck();

console.log(health);
// {
//   healthy: true,
//   database: {
//     connected: true,
//     latency: 5,
//     poolSize: 5,
//     availableConnections: 3
//   },
//   cache: {
//     connected: true,
//     latency: 2,
//     memoryUsage: '10.5M',
//     hitRate: 0.85
//   },
//   timestamp: 2024-01-01T00:00:00.000Z
// }
```

## Error Handling

All errors extend the base `DatabaseError` class:

```typescript
import {
  NotFoundError,
  VersionMismatchError,
  PermissionDeniedError,
  ValidationError,
} from '@polln/spreadsheet/database';

try {
  await cellRepo.update('cell-123', { value: 100 }, 1);
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Cell not found');
  } else if (error instanceof VersionMismatchError) {
    console.log('Cell was modified by another user');
  } else if (error instanceof PermissionDeniedError) {
    console.log('User lacks permission');
  }
}
```

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=polln
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cache
CACHE_KEY_PREFIX=polln
```

## Schema

The database schema includes the following tables:

- **users** - User accounts
- **sessions** - User sessions
- **spreadsheets** - Spreadsheet metadata
- **cells** - Cell data and state
- **cell_history** - Cell version history
- **spreadsheet_permissions** - User permissions
- **share_links** - Shareable links
- **audit_logs** - Audit trail
- **exports** - Export jobs
- **imports** - Import jobs

## Testing

Run tests:

```bash
npm test src/spreadsheet/database/__tests__
```

## License

MIT
