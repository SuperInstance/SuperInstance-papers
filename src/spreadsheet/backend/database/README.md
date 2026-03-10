# POLLN Database Layer

Comprehensive PostgreSQL database implementation for the POLLN spreadsheet system with living cells, consciousness tracking, and real-time collaboration.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Repositories  │  Connection Manager  │  Query Optimizer   │
├─────────────────────────────────────────────────────────────┤
│                     PostgreSQL Database                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tables  │  Indexes  │  Triggers  │  RLS Policies   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
database/
├── schema.sql                    # Complete database schema
├── migrations/                   # Database migrations
│   ├── 001_initial.sql          # Base tables
│   ├── 002_indexes.sql          # Performance indexes
│   ├── 003_triggers.sql         # Automation triggers
│   ├── 004_rls.sql              # Row-level security
│   └── 005_functions.sql        # Utility functions
├── repositories/                 # Data access layer
│   ├── UserRepository.ts
│   ├── SpreadsheetRepository.ts
│   ├── CellRepository.ts
│   ├── ConsciousnessRepository.ts
│   └── CollaborationRepository.ts
├── ConnectionManager.ts          # Connection pooling
├── QueryOptimizer.ts             # Query optimization
├── Database.test.ts              # Test suite
└── README.md                     # This file
```

## Entity Relationship Diagram

```
┌─────────────┐
│    Users    │
│─────────────│
│ id          │───┐
│ email       │   │
│ username    │   │
│ created_at  │   │
└─────────────┘   │
                  │
                  ▼
          ┌───────────────┐
          │ Spreadsheets  │
          │───────────────│
          │ id            │───┐
          │ owner_id      │   │
          │ name          │   │
          │ version       │   │
          └───────────────┘   │
                              │
                              ▼
                      ┌───────────────┐
                      │    Sheets     │
                      │───────────────│
                      │ id            │───┐
                      │ spreadsheet_id│   │
                      │ name          │   │
                      │ position      │   │
                      └───────────────┘   │
                                          │
                                          ▼
                                  ┌───────────────┐
                                  │    Cells      │
                                  │───────────────│
                                  │ id            │───┐
                                  │ sheet_id      │   │
                                  │ cell_type     │   │
                                  │ value         │   │
                                  │ formula       │   │
                                  └───────────────┘   │
                                                      │
                      ┌───────────────────────────────┘
                      │
      ┌───────────────┼───────────────┬──────────────┐
      ▼               ▼               ▼              ▼
┌───────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐
│Versions   │  │Dependencies  │  │Comments  │  │Consciousness │
│───────────│  │──────────────│  │──────────│  │──────────────│
│cell_id    │  │dependent_id  │  │cell_id   │  │cell_id       │
│version    │  │dependency_id │  │content   │  │sensation_type│
│value      │  └──────────────┘  └──────────┘  │timestamp     │
└───────────│                                      │internal_state│
            └──────────────────────────────────────┴──────────────┘
```

## Core Concepts

### 1. The Living Cell

Every cell is more than just data - it's an entity with:

- **Head**: Input receptor (sensation data)
- **Body**: Processing and reasoning
- **Tail**: Output and action

```sql
CREATE TABLE cells (
  id UUID PRIMARY KEY,
  sheet_id UUID NOT NULL,
  cell_type cell_type NOT NULL,
  column_ref VARCHAR(10) NOT NULL,
  row_ref INTEGER NOT NULL,
  state cell_state NOT NULL,
  value TEXT,
  formula TEXT,
  head_data JSONB NOT NULL DEFAULT '{}',
  tail_data JSONB NOT NULL DEFAULT '{}'
);
```

### 2. Cell Consciousness

Cells maintain time-series awareness of their state:

```sql
CREATE TABLE cell_consciousness (
  id UUID PRIMARY KEY,
  cell_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  sensation_type sensation_type NOT NULL,
  sensation_data JSONB NOT NULL,
  internal_state JSONB NOT NULL,
  reasoning_trace JSONB
);
```

**Sensation Types:**
- `absolute_change`: State delta (new - old)
- `rate_of_change`: First derivative (d/dt)
- `acceleration`: Second derivative (d²/dt²)
- `presence`: Cell exists/active
- `pattern`: Pattern match detected
- `anomaly`: Deviation from expected

### 3. Cell Dependencies

The dependency graph enables:
- Impact analysis
- Circular dependency detection
- Optimized recalculation order

```sql
CREATE TABLE cell_dependencies (
  id UUID PRIMARY KEY,
  dependent_cell_id UUID NOT NULL,
  dependency_cell_id UUID NOT NULL,
  dependency_type VARCHAR(50) NOT NULL
);
```

### 4. Row-Level Security (RLS)

Multi-tenant data isolation with fine-grained permissions:

```sql
-- Users can only access their own data
CREATE POLICY users_view_own ON users
  FOR SELECT USING (id = current_user_id());

-- Public spreadsheets are viewable by all
CREATE POLICY spreadsheets_view_public ON spreadsheets
  FOR SELECT USING (is_public = TRUE);
```

## Migration Guide

### Running Migrations

```bash
# Install migration tool (e.g., dbmate, node-pg-migrate)
npm install -g dbmate

# Run all pending migrations
dbmate migrate

# Rollback last migration
dbmate rollback

# Create new migration
dbmate new add_new_feature
```

### Manual Migration Execution

```bash
# Connect to database
psql -h localhost -U postgres -d polln

# Execute migrations
\i migrations/001_initial.sql
\i migrations/002_indexes.sql
\i migrations/003_triggers.sql
\i migrations/004_rls.sql
\i migrations/005_functions.sql
```

## Repository Usage

### UserRepository

```typescript
import { UserRepository } from './repositories/UserRepository';

const userRepo = new UserRepository(pool);

// Create user
const user = await userRepo.create({
  email: 'user@example.com',
  username: 'testuser',
  displayName: 'Test User',
});

// Find or create via OAuth
const { user, created } = await userRepo.findOrCreateByOAuth(
  'google',
  'google-user-id',
  'google@example.com',
  { sub: 'google-user-id' },
  { email: 'user@example.com', username: 'user' }
);

// Update user
await userRepo.update(user.id, {
  displayName: 'Updated Name',
});

// Deactivate user
await userRepo.deactivate(user.id);
```

### SpreadsheetRepository

```typescript
import { SpreadsheetRepository } from './repositories/SpreadsheetRepository';

const spreadsheetRepo = new SpreadsheetRepository(pool);

// Create spreadsheet
const spreadsheet = await spreadsheetRepo.create({
  ownerId: userId,
  name: 'My Spreadsheet',
  description: 'Description',
  isPublic: false,
});

// Add sheets
const sheet = await spreadsheetRepo.createSheet(
  spreadsheet.id,
  'Sheet1',
  0
);

// Grant permissions
await spreadsheetRepo.grantPermission(
  spreadsheet.id,
  otherUserId,
  'editor',
  userId
);

// Create snapshot
await spreadsheetRepo.createSnapshot(
  spreadsheet.id,
  spreadsheet.version,
  userId,
  { name: 'Before changes' }
);
```

### CellRepository

```typescript
import { CellRepository } from './repositories/CellRepository';

const cellRepo = new CellRepository(pool);

// Create cell
const cell = await cellRepo.create({
  sheetId: sheetId,
  columnRef: 'A',
  rowRef: 1,
  value: '100',
  formula: '=100',
});

// Update cell
await cellRepo.update(cell.id, {
  value: '200',
  formula: '=200',
});

// Batch operations
const cells = await cellRepo.batchCreate([
  { sheetId, columnRef: 'A', rowRef: 1, value: 'A1' },
  { sheetId, columnRef: 'A', rowRef: 2, value: 'A2' },
]);

// Get dependencies
const dependencies = await cellRepo.getDependencies(cell.id);

// Get version history
const versions = await cellRepo.getVersions(cell.id);
```

### ConsciousnessRepository

```typescript
import { ConsciousnessRepository } from './repositories/ConsciousnessRepository';

const consciousnessRepo = new ConsciousnessRepository(pool);

// Record consciousness event
await consciousnessRepo.record({
  cellId: cell.id,
  sensationType: 'absolute_change',
  sensationData: {
    value: 100,
    previous: 90,
    delta: 10,
  },
  calculationDurationMs: 50,
});

// Get recent consciousness data
const recent = await consciousnessRepo.getRecent(cell.id, {
  hours: 24,
  limit: 1000,
});

// Detect anomalies
const anomalies = await consciousnessRepo.detectAnomalies(cell.id, {
  hours: 24,
  stdDevs: 3,
});

// Get trend analysis
const trend = await consciousnessRepo.getTrend(cell.id, 24);
```

### CollaborationRepository

```typescript
import { CollaborationRepository } from './repositories/CollaborationRepository';

const collabRepo = new CollaborationRepository(pool);

// Create session
const session = await collabRepo.createSession({
  spreadsheetId: spreadsheet.id,
  startedBy: userId,
});

// Add participant
await collabRepo.addParticipant({
  sessionId: session.id,
  userId: userId,
  role: 'editor',
});

// Record event
await collabRepo.recordEvent(
  session.id,
  userId,
  'cell_updated',
  { columnRef: 'A', rowRef: 1, value: 'New Value' }
);

// Get active users
const activeUsers = await collabRepo.getActiveUsers(spreadsheet.id);
```

## Connection Management

### Basic Usage

```typescript
import { getConnectionManager } from './ConnectionManager';

const connectionManager = getConnectionManager({
  host: 'localhost',
  port: 5432,
  database: 'polln',
  user: 'postgres',
  password: 'password',
});

// Connect
await connectionManager.connect();

// Execute query
const result = await connectionManager.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// Transaction
await connectionManager.transaction(async (client) => {
  await client.query('INSERT INTO cells ...');
  await client.query('UPDATE sheets ...');
});

// Get statistics
const stats = connectionManager.getStats();
console.log('Query count:', stats.queryCount);

// Disconnect
await connectionManager.disconnect();
```

### Connection Pooling

The connection manager uses PgBouncer-style connection pooling:

```typescript
const poolConfig = {
  max: 20,              // Maximum pool size
  min: 5,               // Minimum pool size
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 5000,  // Error if connection takes > 5s
};
```

## Query Optimization

### Prepared Statements

```typescript
import { QueryOptimizer } from './QueryOptimizer';

const optimizer = new QueryOptimizer(pool);

// Prepare statement
await optimizer.prepareStatement('get_user_by_id',
  'SELECT * FROM users WHERE id = $1'
);

// Execute prepared statement
const result = await optimizer.executePrepared('get_user_by_id', [userId]);
```

### Query Caching

```typescript
// Enable caching
const optimizer = new QueryOptimizer(pool, {
  cacheEnabled: true,
  cacheTtl: 60000,  // 1 minute
  maxCacheSize: 1000,
});

// Execute with caching
const result = await optimizer.cachedQuery('user_' + userId, async () => {
  return await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
});
```

### Batch Operations

```typescript
// Batch insert
const items = Array.from({ length: 1000 }, (_, i) => ({
  id: `id-${i}`,
  value: `value-${i}`,
}));

await optimizer.batch(items, async (batch) => {
  await pool.query(
    'INSERT INTO table (id, value) VALUES ' +
    batch.map((_, i) => `($${i*2+1}, $${i*2+2})`).join(',')
  );
}, { batchSize: 100 });
```

### N+1 Query Prevention

```typescript
// Preload relations efficiently
const users = await getUsers();
const userIds = users.map(u => u.id);

const preferences = await optimizer.preloadRelations(
  users,
  async (ids) => {
    const result = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = ANY($1)',
      [ids]
    );
    return new Map(result.rows.map(r => [r.user_id, r]));
  }
);
```

## Performance Tuning

### Index Strategy

Key indexes for performance:

```sql
-- Cell position lookups (most common)
CREATE INDEX idx_cells_position ON cells(sheet_id, column_position, row_position);

-- Active cells only
CREATE INDEX idx_cells_state ON cells(sheet_id, state) WHERE state = 'active';

-- Full-text search
CREATE INDEX idx_cells_content_gin ON cells USING gin(
  to_tsvector('english', COALESCE(value, '') || ' ' || COALESCE(formula, ''))
);

-- Time-series consciousness data
CREATE INDEX idx_cell_consciousness_cell_time ON cell_consciousness(cell_id, timestamp DESC);

-- Dependency graph traversal
CREATE INDEX idx_cell_dependencies_graph ON cell_dependencies(dependent_cell_id, dependency_cell_id);
```

### Materialized Views

For complex aggregations:

```sql
CREATE MATERIALIZED VIEW cell_statistics AS
SELECT
  s.id as spreadsheet_id,
  COUNT(c.id) as cell_count,
  COUNT(c.id) FILTER (WHERE c.state = 'active') as active_cells,
  MAX(c.updated_at) as last_activity
FROM spreadsheets s
LEFT JOIN sheets sh ON s.id = sh.spreadsheet_id
LEFT JOIN cells c ON sh.id = c.sheet_id
GROUP BY s.id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY cell_statistics;
```

### Query Examples

**Find all cells that depend on a given cell:**

```sql
SELECT * FROM get_dependent_cells('cell-id-here');
```

**Detect circular dependencies:**

```sql
SELECT * FROM detect_circular_dependencies('cell-id-here');
```

**Get consciousness trend:**

```sql
SELECT * FROM get_consciousness_trend('cell-id-here', 24);
```

**Search cells:**

```sql
SELECT * FROM search_spreadsheet('spreadsheet-id', 'search query');
```

## Backup Procedures

### Logical Backup (pg_dump)

```bash
# Full backup
pg_dump -h localhost -U postgres -d polln > backup.sql

# Schema only
pg_dump -h localhost -U postgres -d polln --schema-only > schema.sql

# Data only
pg_dump -h localhost -U postgres -d polln --data-only > data.sql

# Specific tables
pg_dump -h localhost -U postgres -d polln -t cells -t cell_versions > cells.sql
```

### Physical Backup (pg_basebackup)

```bash
# Base backup for replication
pg_basebackup -h localhost -D /var/lib/postgresql/backup -U postgres -P -W
```

### Restore

```bash
# Restore from SQL dump
psql -h localhost -U postgres -d polln_new < backup.sql

# Or use psql interactively
psql -h localhost -U postgres -d polln
\i backup.sql
```

## Monitoring

### Health Check

```typescript
const isHealthy = await connectionManager.testConnection();
if (!isHealthy) {
  console.error('Database health check failed');
}
```

### Statistics

```typescript
const stats = connectionManager.getStats();
console.log({
  isConnected: stats.isConnected,
  totalCount: stats.totalCount,
  idleCount: stats.idleCount,
  waitingCount: stats.waitingCount,
  queryCount: stats.queryCount,
  errorCount: stats.errorCount,
  lastHealthCheck: stats.lastHealthCheck,
});
```

### Slow Query Logging

```typescript
connectionManager.on('slowQuery', ({ text, params, duration, rowCount }) => {
  console.warn(`Slow query (${duration}ms):`, text);
  console.warn('Params:', params);
  console.warn('Rows:', rowCount);
});
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- UserRepository

# Run with coverage
npm test -- --coverage

# Run performance benchmarks
npm test -- --testNamePattern="Performance"
```

## Security

### Row-Level Security

All tables have RLS policies ensuring:

1. Users can only access their own data
2. Public spreadsheets are viewable by all
3. Permission checks for shared spreadsheets

### Setting User Context

For RLS to work, set the user context:

```typescript
await connectionManager.query(
  'SELECT set_config($1, $2, TRUE)',
  ['app.user_id', userId]
);
```

### Best Practices

1. **Never trust client input** - Always validate and sanitize
2. **Use parameterized queries** - Prevent SQL injection
3. **Enable SSL** - Encrypt database connections
4. **Regular backups** - Test restore procedures
5. **Monitor slow queries** - Optimize bottlenecks
6. **Use transactions** - Ensure data consistency
7. **Implement rate limiting** - Prevent abuse
8. **Audit sensitive operations** - Track changes

## License

MIT

## Contributing

1. Create migration for schema changes
2. Update repository interfaces
3. Add tests for new functionality
4. Update documentation
5. Submit PR for review
