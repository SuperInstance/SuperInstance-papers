# POLLN Spreadsheet SDK

A comprehensive TypeScript SDK for programmatically extending POLLN spreadsheets with living cells, colonies, and real-time updates.

## Features

- **🔌 Promise-based API** - Modern async/await interface
- **📝 Full TypeScript Support** - Complete type definitions
- **🔄 Real-time Updates** - WebSocket support for live cell changes
- **🔒 Authentication** - API key and token-based auth
- **⚡ Rate Limiting** - Built-in rate limit awareness
- **🔁 Retry Logic** - Automatic retry with exponential backoff
- **📦 Batch Operations** - Efficient bulk cell operations
- **🎯 Cell Management** - Full CRUD for spreadsheet cells
- **📊 Sheet Management** - Create, update, and manage sheets
- **🐜 Colony Management** - Deploy and manage agent colonies
- **📡 Event Subscriptions** - Subscribe to cell/sheet/colony events

## Installation

```bash
npm install @polln/spreadsheet/sdk
```

## Quick Start

```typescript
import { createClient } from '@polln/spreadsheet/sdk';

// Create and initialize client
const client = await createClient({
  endpoint: 'http://localhost:3000',
  apiKey: 'your-api-key'
});

// Access APIs
const cells = await client.cells();
const sheets = await client.sheets();
const colonies = await client.colonies();
```

## Core Concepts

### Cells

Every spreadsheet cell is a living entity with sensation, memory, and agency:

```typescript
// Create a cell
const cell = await cells.create('A1', 'input', 42, {
  name: 'Sales Data',
  description: 'Monthly sales figures',
  format: 'currency'
});

// Update cell value
const updated = await cells.update('A1', { value: 100 });

// Query cells
const inputCells = await cells.findByType('input');
```

### Sheets

Sheets organize cells into manageable collections:

```typescript
// Create a sheet
const sheet = await sheets.create({
  name: 'Monthly Report',
  rowCount: 1000,
  columnCount: 26,
  metadata: {
    description: 'Monthly sales tracking',
    tags: ['sales', '2024']
  }
});

// Manage permissions
await sheets.grantRead(sheet.id, ['user-1', 'user-2']);
await sheets.grantWrite(sheet.id, ['user-1']);

// Export data
const data = await sheets.export(sheet.id, 'json');
```

### Colonies

Colonies coordinate intelligent agents for complex computations:

```typescript
// Create a colony
const colony = await colonies.create({
  name: 'data-processing',
  maxAgents: 100,
  resourceBudget: {
    totalCompute: 2000,
    totalMemory: 4096,
    totalNetwork: 500
  }
});

// Deploy an agent
const agent = await colonies.deployAgent(colony.id, {
  category: 'ephemeral',
  goal: 'Process CSV files',
  inputTopics: ['csv-data'],
  outputTopic: 'processed-data'
});

// Execute tasks
const result = await colonies.executeTask(colony.id, {
  type: 'process-csv',
  input: { data: [1, 2, 3] },
  agentId: agent.agentId
});
```

### Real-time Updates

Subscribe to live changes via WebSocket:

```typescript
// Subscribe to cell changes
const unsubscribe = await cells.subscribe(
  'cell:valueChanged',
  (event) => {
    console.log('Cell changed:', event.data);
  },
  { source: 'sheet-123' }
);

// Watch specific cell
const unwatch = await cells.watch('A1', (cell) => {
  console.log('A1 updated:', cell.value);
});

// Stream colony metrics
await colonies.streamMetrics(
  colony.id,
  (metrics) => {
    console.log('Active agents:', metrics.activeAgents);
  },
  1000 // Update every second
);
```

## API Reference

### POLLNClient

Main client class for API access.

```typescript
import { POLLNClient, createClient } from '@polln/spreadsheet/sdk';

// Factory function
const client = await createClient({
  endpoint: 'http://localhost:3000',
  apiKey: 'your-api-key',
  timeout: 30000,
  maxRetries: 3,
  debug: true
});

// Or create instance directly
const sdk = new POLLNSDK({ endpoint: 'http://localhost:3000' });
await sdk.initialize();
```

### CellAPI

Manage spreadsheet cells.

```typescript
const cells = await client.cells();

// CRUD operations
const cell = await cells.create('A1', 'input', 42, metadata);
const fetched = await cells.get('A1');
const updated = await cells.update('A1', { value: 100 });
await cells.delete('A1');

// Batch operations
const result = await cells.batch([
  { type: 'create', reference: 'A1', value: 1 },
  { type: 'update', reference: 'A2', value: 2 },
  { type: 'delete', reference: 'A3' }
]);

// Queries
const found = await cells.findByType('input');
const queried = await cells.query({
  type: 'input',
  status: 'success',
  pagination: { page: 1, pageSize: 50 }
});

// Value operations
const value = await cells.getValue('A1');
await cells.setValue('A1', 100);

// Cell locking
const lockToken = await cells.lock('A1');
try {
  await cells.update('A1', { value: 42 });
} finally {
  await cells.unlock('A1', lockToken);
}
```

### SheetAPI

Manage spreadsheet sheets.

```typescript
const sheets = await client.sheets();

// CRUD operations
const sheet = await sheets.create({
  name: 'My Sheet',
  rowCount: 1000,
  columnCount: 26
});
const fetched = await sheets.get(sheet.id);
const updated = await sheets.update(sheet.id, { name: 'Updated' });
await sheets.delete(sheet.id);

// Metadata
const metadata = await sheets.getMetadata(sheet.id);
await sheets.updateMetadata(sheet.id, { description: 'New desc' });
await sheets.addTags(sheet.id, ['tag1', 'tag2']);

// Permissions
const permissions = await sheets.getPermissions(sheet.id);
await sheets.grantRead(sheet.id, ['user-1']);
await sheets.grantWrite(sheet.id, ['user-1']);
await sheets.setPublic(sheet.id, true);

// Versioning
const versions = await sheets.getVersions(sheet.id);
const version = await sheets.createVersion(sheet.id, 'Snapshot');
await sheets.restoreVersion(sheet.id, 5);

// Export/Import
const data = await sheets.export(sheet.id, 'json');
await sheets.import(sheet.id, data, 'json');
```

### ColonyAPI

Manage colonies and agents.

```typescript
const colonies = await client.colonies();

// CRUD operations
const colony = await colonies.create({
  name: 'my-colony',
  maxAgents: 100,
  resourceBudget: { totalCompute: 1000 }
});
const fetched = await colonies.get(colony.id);
const updated = await colonies.update(colony.id, { maxAgents: 200 });
await colonies.delete(colony.id);

// Agent management
const agent = await colonies.deployAgent(colony.id, {
  category: 'ephemeral',
  goal: 'Process data',
  inputTopics: ['data'],
  outputTopic: 'results'
});
const agents = await colonies.listAgents(colony.id);
await colonies.activateAgent(colony.id, agent.agentId);
await colonies.deactivateAgent(colony.id, agent.agentId);
await colonies.removeAgent(colony.id, agent.agentId);

// Task execution
const result = await colonies.executeTask(colony.id, {
  type: 'process',
  input: { data: [1, 2, 3] },
  agentId: agent.agentId
});

// Monitoring
const stats = await colonies.getStats(colony.id);
const metrics = await colonies.getMetrics(colony.id, '1h');
const util = await colonies.getResourceUtilization(colony.id);
```

### WebSocketClient

Real-time updates via WebSocket.

```typescript
const wsClient = await createWebSocketClient(
  'ws://localhost:3000',
  { token: 'your-token' }
);

// Monitor connection
wsClient.onStateChange((state) => {
  console.log('State:', state);
});

wsClient.onError((error) => {
  console.error('Error:', error);
});

// Subscribe to events
const subId = await wsClient.subscribe(
  'cell:valueChanged',
  (event) => {
    console.log('Cell changed:', event.data);
  },
  { source: 'sheet-123' }
);

// Send messages
wsClient.send({
  type: 'ping',
  payload: {},
  id: uuidv4(),
  timestamp: Date.now()
});

// Request/response
const response = await wsClient.request('getStats', { colonyId: 'col-123' });

// Check health
const health = wsClient.getHealth();
```

## Utility Functions

Helper functions for common operations:

```typescript
import {
  cellRef,
  parseCellRef,
  toCellRefObject,
  toCellRefString,
  createCellQuery,
  createSheetQuery
} from '@polln/spreadsheet/sdk';

// Cell reference conversion
const ref = cellRef(0, 0); // "A1"
const { row, column } = parseCellRef('A1'); // { row: 0, column: 0 }
const obj = toCellRefObject('A1'); // { row: 0, column: 0 }
const str = toCellRefString({ row: 0, column: 0 }); // "A1"

// Query builders
const query = createCellQuery()
  .withType('input')
  .withStatus('success')
  .inRowRange(0, 10)
  .withPagination(1, 50)
  .build();

const sheetQuery = createSheetQuery()
  .withName('My Sheet')
  .withTags(['sales', '2024'])
  .withPagination(1, 20)
  .build();
```

## Error Handling

The SDK provides comprehensive error handling:

```typescript
import { POLLNSDKError } from '@polln/spreadsheet/sdk';

try {
  const cell = await cells.get('A1');
  if (cell === null) {
    console.log('Cell not found');
  }
} catch (error) {
  if (error instanceof POLLNSDKError) {
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Details:', error.details);
    console.error('Retryable:', error.isRetryable());
  }
}
```

## Examples

See the [examples directory](./examples/) for comprehensive usage examples:

- **[basic-usage.ts](./examples/basic-usage.ts)** - Core SDK operations
- **[real-time-updates.ts](./examples/real-time-updates.ts)** - WebSocket and events
- **[custom-cells.ts](./examples/custom-cells.ts)** - Advanced cell types
- **[colony-management.ts](./examples/colony-management.ts)** - Colony and agent management

## Configuration

### Client Configuration

```typescript
const client = await createClient({
  // API endpoint
  endpoint: 'http://localhost:3000',
  wsEndpoint: 'ws://localhost:3000',

  // Authentication
  apiKey: 'your-api-key',
  authToken: 'your-auth-token',

  // Timeouts and retries
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,

  // Rate limiting
  rateLimit: {
    requestsPerMinute: 60,
    burstLimit: 10
  },

  // WebSocket
  websocket: {
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    pingInterval: 30000,
    pingTimeout: 5000
  },

  // Debugging
  debug: true
});
```

### Cell Types

Supported cell types:

- `input` - Data input cells
- `output` - Calculated output cells
- `transform` - Data transformation cells
- `filter` - Data filtering cells
- `aggregate` - Aggregation cells (SUM, AVG, etc.)
- `validate` - Data validation cells
- `analysis` - Analysis cells
- `prediction` - Prediction cells
- `decision` - Decision logic cells
- `explain` - Explanation cells
- `custom` - Custom cell types

### Cell Status

- `idle` - Cell is idle
- `processing` - Cell is processing
- `error` - Cell has an error
- `success` - Cell operation succeeded
- `warning` - Cell has a warning

## Best Practices

1. **Always initialize the client** before making API calls
2. **Handle errors gracefully** using try-catch blocks
3. **Use batch operations** for multiple cell updates
4. **Subscribe to events** for real-time updates instead of polling
5. **Lock cells** before concurrent updates
6. **Disconnect cleanly** when done to release resources
7. **Use query builders** for complex queries
8. **Monitor connection health** for WebSocket connections
9. **Set appropriate timeouts** for long-running operations
10. **Enable debug mode** during development

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

- 📖 [Documentation](https://docs.polln.ai)
- 💬 [Discord](https://discord.gg/polln)
- 🐛 [Issues](https://github.com/SuperInstance/polln/issues)
- ✉️ [Email](mailto:support@polln.ai)
