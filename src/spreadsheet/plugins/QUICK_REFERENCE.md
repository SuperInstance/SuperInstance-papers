# POLLN Plugin System - Quick Reference Card

## Installation & Setup

```bash
# Create plugin manager
import { createPluginManager } from '@polln/spreadsheet/plugins';
const manager = createPluginManager('1.0.0');

# Install plugin
await manager.installPlugin('path/to/plugin');

# Load plugin
await manager.loadPlugin('plugin-id');
```

## Plugin Manifest Structure

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Description",
  "author": { "name": "Author", "email": "email@example.com" },
  "license": "MIT",
  "pollnVersion": "1.0.0",
  "main": "dist/index.js",
  "extensions": [...],
  "permissions": [...]
}
```

## Plugin Template

```typescript
import type { PluginAPI, PluginContext } from '@polln/spreadsheet/plugins';

export default function createPlugin(): PluginAPI {
  let context: PluginContext;

  return {
    async activate(ctx: PluginContext) {
      context = ctx;
      // Initialize plugin
    },

    async deactivate() {
      // Cleanup
    },

    extensions: {
      'extension-id': async (params) => {
        return { result: 'value' };
      }
    }
  };
}
```

## API Quick Reference

### Cells
```typescript
await context.api.cells.getCell('A1');
await context.api.cells.setCellValue('A1', 'value');
context.api.cells.watchCell('A1', (cell) => {});
```

### UI
```typescript
context.api.ui.registerToolbar({ id, label, onClick });
context.api.ui.showNotification({ type, title, message });
await context.api.ui.showDialog({ title, buttons });
```

### Data Sources
```typescript
context.api.data.registerDataSource({ id, name, query });
await context.api.data.queryDataSource('id', query);
```

### Events
```typescript
context.api.events.on('event-name', handler);
context.api.events.emit('event-name', data);
```

### Storage
```typescript
await context.api.storage.set('key', value);
await context.api.storage.get('key');
```

### Logger
```typescript
context.logger.info('message');
context.logger.error('error', error);
```

## Extension Points

- `CELL_TYPE`: Custom cell types
- `DATA_SOURCE`: External data integration
- `COMMAND`: Custom commands
- `TOOLBAR_BUTTON`: Toolbar buttons
- `MENU_ITEM`: Menu items
- `SIDEBAR_PANEL`: UI panels
- `CELL_RENDERER`: Custom rendering
- `THEME`: Visual themes
- `EVENT_HANDLER`: Event subscriptions
- `MIDDLEWARE`: Operation interception

## Permissions

- `READ_CELLS`: Read cell values
- `WRITE_CELLS`: Modify cells
- `DELETE_CELLS`: Delete cells
- `NETWORK_ACCESS`: Network requests
- `UI_CUSTOMIZATION`: Modify UI
- `STORAGE_ACCESS`: Plugin storage
- `NOTIFICATIONS`: Show notifications

## Utility Functions

```typescript
import {
  isValidPluginId,
  sanitizePluginId,
  parseVersion,
  compareVersions,
  satisfiesVersion
} from '@polln/spreadsheet/plugins';

isValidPluginId('my-plugin'); // true
sanitizePluginId('My Plugin'); // 'my-plugin'
parseVersion('1.2.3'); // { major: 1, minor: 2, patch: 3 }
compareVersions('1.0.0', '2.0.0'); // -1
satisfiesVersion('1.2.3', '^1.0.0'); // true
```

## Hot Reload

```typescript
await manager.enableHotReload('plugin-id', {
  preserveState: true,
  reloadDependencies: false,
  onReload: (event) => {}
});
```

## Error Handling

```typescript
try {
  await manager.loadPlugin('plugin-id');
} catch (error) {
  const validation = manager.getPluginValidation('plugin-id');
  console.error(validation.errors);
}
```

## Testing

```bash
npm test                        # Run tests
npm run test:coverage          # With coverage
npm run test:watch             # Watch mode
```

## Common Patterns

### Permission Check
```typescript
if (context.security.hasPermission('READ_CELLS')) {
  // Perform operation
}
```

### Configuration
```typescript
const value = context.config.get('key', 'default');
context.config.set('key', 'value');
```

### Event Subscription with Cleanup
```typescript
const handlers = [];
handlers.push(context.api.events.on('event', handler));
// Cleanup
handlers.forEach(h => context.api.events.off('event', h));
```

### Storage Namespacing
```typescript
const PREFIX = 'my-plugin:';
await context.api.storage.set(`${PREFIX}key`, value);
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Plugin won't load | Check validation errors |
| Permission denied | Request permission first |
| Resource limit hit | Increase limits in options |
| Hot reload not working | Check file permissions |
| Dependency conflict | Check version requirements |

## Resources

- Full Docs: `src/spreadsheet/plugins/README.md`
- Example: `example-plugin/`
- Types: `src/spreadsheet/plugins/types.ts`
- Tests: `src/spreadsheet/plugins/__tests__/`

## Version Compatibility

| Plugin Version | Polln Version |
|----------------|---------------|
| 1.0.x | 1.0.x |
| 1.x.x | 1.0.x - 1.999.x |

## Support

- GitHub: https://github.com/SuperInstance/polln
- Discord: https://discord.gg/polln
- Email: support@polln.ai
