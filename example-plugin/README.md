# Hello World Example Plugin

A simple example plugin demonstrating the POLLN plugin API.

## Features

This plugin demonstrates:

- **Toolbar Button**: Adds a "Say Hello" button to the toolbar
- **Menu Item**: Adds a "Hello World" item to the menu
- **Custom Cell Type**: Creates a "hello-cell" type that displays greetings
- **Data Source**: Registers a data source that provides greeting messages
- **Event Handling**: Subscribes to cell change events
- **Storage**: Persists greeting count across sessions
- **Notifications**: Displays greeting notifications

## Installation

1. Build the plugin:
```bash
npm install
npm run build
```

2. Install in Polln:
```bash
npm install @polln/example-plugin
```

## Usage

Once installed and activated:

1. Click the "Say Hello" button in the toolbar
2. Select "Hello World" from the menu
3. Create a cell with type "hello-cell" and configure it:
```json
{
  "greeting": "Hello",
  "target": "World"
}
```
4. Query the hello-data-source for random greetings

## API Demonstrated

### Cell API
```typescript
// Read cells
const cell = await context.api.cells.getCell('A1');

// Write cells
await context.api.cells.setCellValue('A1', 'Hello');

// Watch for changes
context.api.cells.watchCell('A1', (cell) => {
  console.log('Cell changed:', cell);
});
```

### UI API
```typescript
// Show notification
context.api.ui.showNotification({
  type: 'info',
  title: 'Hello',
  message: 'World',
  duration: 3000,
});

// Register toolbar button
context.api.ui.registerToolbar({
  id: 'my-button',
  label: 'Click Me',
  onClick: () => console.log('Clicked!'),
});
```

### Data Source API
```typescript
// Register data source
context.api.data.registerDataSource({
  id: 'my-source',
  name: 'My Data Source',
  type: 'custom',
  config: {},
  query: async (query) => {
    return { data: 'results' };
  },
});

// Query data source
const results = await context.api.data.queryDataSource('my-source', {});
```

### Event API
```typescript
// Subscribe to events
context.api.events.on('cell:changed', (data) => {
  console.log('Cell changed:', data);
});

// Emit events
context.api.events.emit('custom:event', { data: 'value' });
```

### Storage API
```typescript
// Store data
await context.api.storage.set('key', 'value');

// Retrieve data
const value = await context.api.storage.get('key');

// List keys
const keys = await context.api.storage.list();
```

### Logger
```typescript
context.logger.debug('Debug message');
context.logger.info('Info message');
context.logger.warn('Warning message');
context.logger.error('Error message');
```

## Configuration

The plugin can be configured via Polln's plugin settings:

```json
{
  "greeting": "Hello",
  "target": "World",
  "greetings": ["Hello", "Hi", "Greetings"]
}
```

## Permissions

This plugin requests the following permissions:

- `READ_CELLS`: To read cell values for greeting customization
- `UI_CUSTOMIZATION`: To add toolbar buttons and menu items
- `NOTIFICATIONS`: To display greeting notifications

## Development

1. Clone the Polln repository
2. Navigate to `example-plugin`
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Watch for changes: `npm run watch`

## License

MIT

## Author

POLLN Team
