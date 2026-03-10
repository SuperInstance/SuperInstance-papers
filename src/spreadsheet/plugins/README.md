# POLLN Plugin System

A comprehensive, secure, and extensible plugin system for POLLN spreadsheets.

## Overview

The POLLN plugin system enables third-party developers to extend spreadsheet functionality through a secure, sandboxed environment. Plugins can add custom cell types, data sources, UI elements, and much more.

## Table of Contents

- [Architecture](#architecture)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
- [Plugin Development](#plugin-development)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Best Practices](#best-practices)

## Architecture

The plugin system consists of several core components:

```
┌─────────────────────────────────────────────────────────────┐
│                     Plugin Manager                          │
│  - Registry & Lifecycle                                     │
│  - Dependency Resolution                                    │
│  - Permission Management                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                      Plugin Host                            │
│  - WASM Sandbox                                            │
│  - Resource Limits                                          │
│  - Security Context                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    Plugin API Surface                       │
│  - Cell Operations                                          │
│  - UI Extensions                                            │
│  - Data Sources                                             │
│  - Events                                                   │
│  - Storage                                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                     Your Plugin                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 🔒 Security-First Design
- **WebAssembly Sandboxing**: Plugins run in isolated WASM environments
- **Capability-Based Security**: Plugins request specific permissions
- **Code Signing**: Verify plugin authenticity and integrity
- **Resource Limits**: Control memory, CPU, and network usage

### 🧩 Extensibility
- **Custom Cell Types**: Create specialized cell behaviors
- **Data Sources**: Integrate external data providers
- **UI Extensions**: Add toolbar buttons, menu items, panels
- **Event Handlers**: React to spreadsheet events
- **Middleware**: Intercept and modify cell/data operations

### 🔧 Developer Experience
- **TypeScript First**: Full type definitions
- **Hot Reload**: Rapid development iteration
- **Comprehensive API**: Rich set of capabilities
- **Easy Testing**: Built-in testing utilities
- **Clear Errors**: Helpful validation messages

### 📦 Distribution
- **NPM Packages**: Publish plugins to npm
- **Local Development**: Load from filesystem
- **Version Management**: Semantic versioning support
- **Dependency Resolution**: Automatic dependency handling

## Getting Started

### Installation

The plugin system is included with POLLN. No additional installation required.

### Quick Example

```typescript
import { createPluginManager } from '@polln/spreadsheet/plugins';

// Create plugin manager
const manager = createPluginManager('1.0.0');

// Install a plugin
await manager.installPlugin('@polln/example-plugin');

// Load the plugin
await manager.loadPlugin('example-hello-world');

// Use the plugin
const status = manager.getPluginStatus('example-hello-world');
console.log(status); // { state: 'active', ... }
```

## Plugin Development

### 1. Create Plugin Manifest

Create a `polln-plugin.json` file:

```json
{
  "id": "my-awesome-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "Does awesome things",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "license": "MIT",
  "pollnVersion": "1.0.0",
  "main": "dist/index.js",
  "extensions": [
    {
      "type": "COMMAND",
      "id": "my-command",
      "name": "My Command",
      "description": "Does something cool"
    }
  ],
  "permissions": [
    {
      "type": "READ_CELLS",
      "reason": "To read cell values for processing"
    }
  ]
}
```

### 2. Implement Plugin

Create `src/index.ts`:

```typescript
import type { PluginAPI, PluginContext } from '@polln/spreadsheet/plugins';

export default function createPlugin(): PluginAPI {
  let context: PluginContext;

  return {
    async activate(ctx: PluginContext) {
      context = ctx;
      context.logger.info('Plugin activated!');

      // Register extensions
      context.api.events.on('cell:changed', handleCellChange);
    },

    async deactivate() {
      context.logger.info('Plugin deactivated');

      // Cleanup
      context.api.events.off('cell:changed', handleCellChange);
    },

    extensions: {
      'my-command': async (params) => {
        return { result: 'Hello from plugin!' };
      }
    }
  };
}

function handleCellChange(data: any) {
  console.log('Cell changed:', data);
}
```

### 3. Build and Test

```bash
npm install
npm run build
npm test
```

### 4. Publish

```bash
npm publish
```

## API Reference

### Plugin Context

The plugin context provides access to all plugin APIs:

```typescript
interface PluginContext {
  plugin: {
    id: string;
    version: string;
    manifest: PluginManifest;
  };
  api: {
    cells: CellAPI;
    ui: UIAPI;
    data: DataSourceAPI;
    events: EventAPI;
    storage: StorageAPI;
  };
  logger: PluginLogger;
  config: PluginConfig;
  security: SecurityContext;
}
```

### Cell API

```typescript
// Read cells
const cell = await context.api.cells.getCell('A1');
const cells = await context.api.cells.getCellsInRange({
  from: { row: 1, col: 1 },
  to: { row: 10, col: 10 }
});

// Write cells
await context.api.cells.setCellValue('A1', 'Hello');
await context.api.cells.setCellFormula('A2', '=SUM(A1:A10)');

// Create/delete cells
const newCellId = await context.api.cells.createCell(
  { row: 5, col: 5 },
  'input'
);
await context.api.cells.deleteCell('B2');

// Watch for changes
const unsubscribe = context.api.cells.watchCell('A1', (cell) => {
  console.log('Cell changed:', cell);
});

// Query cells
const results = await context.api.cells.queryCells({
  type: 'input',
  filter: (cell) => cell.value > 100
});
```

### UI API

```typescript
// Register toolbar button
context.api.ui.registerToolbar({
  id: 'my-button',
  label: 'Click Me',
  icon: 'star',
  onClick: async () => {
    console.log('Button clicked!');
  }
});

// Register menu item
context.api.ui.registerMenuItem({
  id: 'my-menu-item',
  label: 'My Action',
  onClick: async () => {
    console.log('Menu item clicked!');
  }
});

// Show notification
context.api.ui.showNotification({
  type: 'success',
  title: 'Success!',
  message: 'Operation completed',
  duration: 3000
});

// Show dialog
const result = await context.api.ui.showDialog({
  title: 'Confirm Action',
  content: 'Are you sure?',
  buttons: [
    { id: 'yes', label: 'Yes', type: 'primary' },
    { id: 'no', label: 'Cancel', type: 'secondary' }
  ]
});
```

### Data Source API

```typescript
// Register data source
context.api.data.registerDataSource({
  id: 'my-data-source',
  name: 'My Data Source',
  type: 'custom',
  config: { apiKey: 'secret' },
  query: async (query) => {
    // Fetch data from external API
    const response = await fetch('https://api.example.com/data');
    return await response.json();
  }
});

// Query data source
const data = await context.api.data.queryDataSource(
  'my-data-source',
  { limit: 10 }
);

// List data sources
const sources = await context.api.data.listDataSources();
```

### Event API

```typescript
// Subscribe to events
context.api.events.on('cell:changed', (data) => {
  console.log('Cell changed:', data);
});

// Subscribe once
context.api.events.once('plugin:loaded', (data) => {
  console.log('Plugin loaded:', data);
});

// Unsubscribe
const handler = (data) => console.log(data);
context.api.events.on('custom:event', handler);
context.api.events.off('custom:event', handler);

// Emit events
context.api.events.emit('custom:event', { data: 'value' });

// List available events
const events = await context.api.events.listEvents();
```

### Storage API

```typescript
// Store data
await context.api.storage.set('key', { value: 'data' });

// Retrieve data
const data = await context.api.storage.get('key');

// Delete data
await context.api.storage.delete('key');

// List all keys
const keys = await context.api.storage.list();

// Clear all data
await context.api.storage.clear();
```

### Logger

```typescript
// Log messages
context.logger.debug('Debug message', { extra: 'data' });
context.logger.info('Info message');
context.logger.warn('Warning message');
context.logger.error('Error message', new Error('details'));
```

### Configuration

```typescript
// Get configuration value
const value = context.config.get('mySetting', 'defaultValue');

// Set configuration value
context.config.set('mySetting', 'newValue');

// Watch for changes
const unwatch = context.config.watch('mySetting', (newValue) => {
  console.log('Setting changed:', newValue);
});

// Get all configuration
const allConfig = context.config.getAll();
```

### Security

```typescript
// Check permission
if (context.security.hasPermission('READ_CELLS')) {
  // Perform operation
}

// Request permission
const granted = await context.security.requestPermission('WRITE_CELLS');
if (granted) {
  // Perform operation
}

// Execute with elevated privileges
const result = await context.security.executeWithPrivileges(async () => {
  // Perform privileged operation
  return sensitiveData;
});
```

## Security Model

### Sandboxing

Plugins run in WebAssembly sandboxes with the following restrictions:

- **Memory Isolation**: Separate memory space
- **CPU Limits**: Maximum execution time
- **Network Controls**: Rate-limited requests
- **File System**: No direct access

### Permission Model

Plugins use capability-based security:

| Permission | Description | Risk Level |
|------------|-------------|------------|
| `READ_CELLS` | Read cell values | Low |
| `WRITE_CELLS` | Modify cell values | Medium |
| `DELETE_CELLS` | Delete cells | Medium |
| `READ_DATA` | Read data sources | Low |
| `WRITE_DATA` | Write to data sources | Medium |
| `NETWORK_ACCESS` | Make network requests | Medium |
| `FILE_READ` | Read local files | High |
| `FILE_WRITE` | Write local files | High |
| `SYSTEM_INFO` | Access system information | High |
| `UI_CUSTOMIZATION` | Modify UI | Low |
| `STORAGE_ACCESS` | Access plugin storage | Low |

### Code Signing

Recommended plugins should be code-signed:

```json
{
  "signature": {
    "algorithm": "RS256",
    "value": "...",
    "certificateUrl": "https://example.com/cert.pem",
    "signer": {
      "name": "Trusted Developer",
      "email": "dev@trusted.com",
      "organization": "Trusted Inc."
    },
    "timestamp": 1234567890
  }
}
```

## Best Practices

### 1. Minimal Permissions

Request only the permissions you need:

```json
{
  "permissions": [
    {
      "type": "READ_CELLS",
      "reason": "To read cell values for analysis"
    }
  ]
}
```

### 2. Error Handling

Always handle errors gracefully:

```typescript
async activate(context: PluginContext) {
  try {
    await initializePlugin(context);
  } catch (error) {
    context.logger.error('Failed to initialize', error);
    context.api.ui.showNotification({
      type: 'error',
      title: 'Initialization Failed',
      message: error.message
    });
  }
}
```

### 3. Resource Cleanup

Clean up resources in deactivate:

```typescript
async deactivate() {
  // Unsubscribe from events
  this.subscriptions.forEach(unsub => unsub());

  // Clear timers
  clearInterval(this.intervalId);

  // Close connections
  await this.connection.close();
}
```

### 4. Logging

Use appropriate log levels:

```typescript
context.logger.debug('Detailed debugging info');
context.logger.info('Normal operation messages');
context.logger.warn('Warning conditions');
context.logger.error('Error conditions');
```

### 5. Configuration

Use configuration for user-customizable settings:

```typescript
const timeout = context.config.get('timeout', 5000);
const retryCount = context.config.get('retryCount', 3);
```

### 6. Storage

Use namespaced storage keys:

```typescript
const STORAGE_PREFIX = 'my-plugin:';
await context.api.storage.set(`${STORAGE_PREFIX}data`, value);
```

### 7. Type Safety

Use TypeScript for type safety:

```typescript
interface MyPluginConfig {
  timeout: number;
  retryCount: number;
}

const config = context.config.get<MyPluginConfig>('config');
```

## Advanced Topics

### Hot Reload

Enable hot reload for development:

```typescript
await manager.enableHotReload('my-plugin', {
  preserveState: true,
  reloadDependencies: false,
  onReload: (event) => {
    console.log('Plugin reloaded:', event);
  }
});
```

### Dependency Injection

Share dependencies between plugins:

```typescript
// Plugin 1 exports a service
extensions: {
  'my-service': new MyService()
}

// Plugin 2 uses the service
const service = await context.api.events.emit('service:get', 'my-service');
```

### Custom Extensions

Create custom extension points:

```typescript
// Register extension point
context.api.events.emit('extension:register', {
  type: 'custom:analyzer',
  id: 'my-analyzer',
  handler: async (data) => {
    return analyze(data);
  }
});
```

## Troubleshooting

### Plugin Won't Load

Check the validation result:

```typescript
const validation = manager.getPluginValidation('my-plugin');
console.log(validation.errors);
```

### Permission Denied

Ensure permission is granted:

```typescript
const granted = await context.security.requestPermission('WRITE_CELLS');
if (!granted) {
  console.log('Permission denied');
}
```

### Resource Limits Exceeded

Adjust resource limits:

```typescript
await manager.loadPlugin('my-plugin', {
  resourceLimits: {
    maxMemoryBytes: 128 * 1024 * 1024,
    maxExecutionTime: 10000
  }
});
```

## Resources

- [Example Plugin](../../example-plugin)
- [API Reference](./types.ts)
- [Test Suite](./__tests__/PluginSystem.test.ts)
- [Plugin Manifest Schema](./types.ts#PluginManifest)

## License

MIT

## Support

For questions or issues, please visit:
- GitHub: https://github.com/SuperInstance/polln
- Discord: https://discord.gg/polln
- Email: support@polln.ai
