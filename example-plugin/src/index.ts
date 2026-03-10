/**
 * Example Plugin - Hello World
 *
 * A simple example plugin demonstrating the POLLN plugin API.
 * This plugin shows how to:
 * - Register toolbar buttons
 * - Register menu items
 * - Create custom cell types
 * - Register data sources
 * - Handle events
 * - Use storage
 * - Display notifications
 */

import type {
  PluginAPI,
  PluginContext,
  CellData,
  CellRenderer,
  DataSource,
  ToolbarButton,
  MenuItem,
  Notification,
} from '../../src/spreadsheet/plugins/types';

/**
 * Plugin API implementation
 */
export default function createPlugin(): PluginAPI {
  let context: PluginContext;
  let greetingCount = 0;

  return {
    /**
     * Activate the plugin
     */
    async activate(ctx: PluginContext): Promise<void> {
      context = ctx;
      context.logger.info('Hello World plugin activating...');

      // Register toolbar button
      const toolbarButton: ToolbarButton = {
        id: 'hello-toolbar-button',
        label: 'Say Hello',
        onClick: () => handleSayHello(),
      };
      context.api.ui.registerToolbar(toolbarButton);

      // Register menu item
      const menuItem: MenuItem = {
        id: 'hello-menu-item',
        label: 'Say Hello',
        onClick: () => handleSayHello(),
      };
      context.api.ui.registerMenuItem(menuItem);

      // Register custom cell renderer
      const cellRenderer: CellRenderer = {
        cellType: 'hello-cell',
        render: (cell: CellData) => {
          const config = cell.value as { greeting: string; target: string };
          return {
            type: 'div',
            props: {
              className: 'hello-cell',
              style: {
                padding: '10px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '5px',
              },
            },
            children: [
              {
                type: 'span',
                props: {
                  style: { fontSize: '18px', fontWeight: 'bold' },
                },
                children: `${config.greeting || 'Hello'}, ${config.target || 'World'}!`,
              },
            ],
          };
        },
      };
      context.api.ui.registerCellRenderer(cellRenderer);

      // Register data source
      const dataSource: DataSource = {
        id: 'hello-data-source',
        name: 'Hello Data Source',
        type: 'greetings',
        config: {
          greetings: ['Hello', 'Hi', 'Greetings', 'Salutations', 'Howdy'],
        },
        query: async (query: unknown) => {
          const config = dataSource.config as { greetings: string[] };
          return {
            greetings: config.greetings,
            random: config.greetings[Math.floor(Math.random() * config.greetings.length)],
          };
        },
      };
      context.api.data.registerDataSource(dataSource);

      // Subscribe to events
      context.api.events.on('cell:changed', handleCellChanged);

      // Load greeting count from storage
      try {
        const savedCount = await context.api.storage.get('greetingCount');
        if (typeof savedCount === 'number') {
          greetingCount = savedCount;
        }
      } catch (error) {
        // First run, count starts at 0
      }

      // Register custom command
      context.api.events.emit('command:register', {
        commandId: 'hello-world',
        handler: handleSayHello,
      });

      context.logger.info('Hello World plugin activated successfully');
    },

    /**
     * Deactivate the plugin
     */
    async deactivate(): Promise<void> {
      context.logger.info('Hello World plugin deactivating...');

      // Save greeting count to storage
      await context.api.storage.set('greetingCount', greetingCount);

      // Unsubscribe from events
      context.api.events.off('cell:changed', handleCellChanged);

      context.logger.info('Hello World plugin deactivated');
    },

    /**
     * Extension implementations
     */
    extensions: {
      // Command extension
      'hello-command': async (params: { name?: string }) => {
        const name = params?.name || 'World';
        const greeting = getGreeting();
        return { message: `${greeting}, ${name}!` };
      },

      // Toolbar button extension
      'hello-toolbar': () => {
        handleSayHello();
      },

      // Menu item extension
      'hello-menu': () => {
        handleSayHello();
      },

      // Cell type extension
      'hello-cell': async (cell: CellData) => {
        const config = cell.value as { greeting: string; target: string };
        const greeting = config.greeting || getGreeting();
        const target = config.target || 'World';
        return { message: `${greeting}, ${target}!` };
      },

      // Data source extension
      'hello-data-source': async (query: { type?: string }) => {
        const greetings = ['Hello', 'Hi', 'Greetings', 'Salutations', 'Howdy'];

        switch (query?.type) {
          case 'random':
            return { greeting: greetings[Math.floor(Math.random() * greetings.length)] };
          case 'all':
            return { greetings };
          default:
            return { greeting: greetings[0] };
        }
      },
    },
  };

  /**
   * Handle "Say Hello" action
   */
  async function handleSayHello(): Promise<void> {
    greetingCount++;
    const greeting = getGreeting();
    const name = await getName();

    // Show notification
    const notification: Notification = {
      type: 'info',
      title: `${greeting}, ${name}!`,
      message: `This is greeting #${greetingCount} from the Hello World plugin!`,
      duration: 3000,
    };
    context.api.ui.showNotification(notification);

    // Log
    context.logger.info(`Displayed greeting #${greetingCount}`);

    // Save count
    await context.api.storage.set('greetingCount', greetingCount);

    // Emit event
    context.api.events.emit('hello:displayed', {
      greeting,
      name,
      count: greetingCount,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle cell changed event
   */
  async function handleCellChanged(data: unknown): Promise<void> {
    // Check if a hello-cell was changed
    const cellData = data as { cell: CellData };
    if (cellData.cell.type === 'hello-cell') {
      context.logger.debug('Hello cell changed:', cellData.cell);
    }
  }

  /**
   * Get a random greeting
   */
  function getGreeting(): string {
    const greetings = ['Hello', 'Hi', 'Greetings', 'Salutations', 'Howdy', 'Hey there'];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Get the name to greet
   */
  async function getName(): Promise<string> {
    try {
      // Try to get name from storage
      const savedName = await context.api.storage.get('userName');
      if (typeof savedName === 'string' && savedName) {
        return savedName;
      }
    } catch (error) {
      // Use default
    }

    // Try to get from a cell
    try {
      const cell = await context.api.cells.getCell('A1');
      if (typeof cell.value === 'string' && cell.value) {
        // Save for future use
        await context.api.storage.set('userName', cell.value);
        return cell.value;
      }
    } catch (error) {
      // Cell doesn't exist, use default
    }

    return 'World';
  }
}

/**
 * Plugin metadata
 */
export const metadata = {
  id: 'example-hello-world',
  name: 'Hello World Example Plugin',
  version: '1.0.0',
  description: 'A simple example plugin demonstrating the POLLN plugin API',
  author: 'POLLN Team',
  license: 'MIT',
};
