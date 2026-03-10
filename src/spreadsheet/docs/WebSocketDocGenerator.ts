/**
 * AsyncAPI 2.0 Specification Generator for WebSocket Events
 * Generates documentation for real-time WebSocket communication
 */

import type {
  AsyncAPIDocument,
  AsyncInfoObject,
  AsyncServerObject,
  ChannelsObject,
  ChannelItemObject,
  MessageObject,
  AsyncComponentsObject,
  WebSocketEventConfig,
  OperationObject,
  SchemaObject,
} from './types.js';

export class WebSocketDocGenerator {
  private spec: AsyncAPIDocument;
  private channels: Map<string, ChannelItemObject> = new Map();
  private messages: Map<string, MessageObject> = new Map();
  private schemas: Map<string, SchemaObject> = new Map();

  constructor(title: string, version: string, description: string) {
    const info: AsyncInfoObject = {
      title,
      version,
      description,
      contact: {
        name: 'POLLN Contributors',
        url: 'https://github.com/SuperInstance/polln',
        email: 'contributors@polln.ai',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    };

    this.spec = {
      asyncapi: '2.0.0',
      info,
      servers: this.getDefaultServers(),
      channels: {},
      components: {
        schemas: {},
        messages: {},
      },
    };
  }

  /**
   * Get default WebSocket servers
   */
  private getDefaultServers(): { [key: string]: AsyncServerObject } {
    return {
      production: {
        url: 'wss://api.polln.ai/ws',
        protocol: 'ws',
        description: 'Production WebSocket server',
      },
      development: {
        url: 'ws://localhost:8080/ws',
        protocol: 'ws',
        description: 'Development WebSocket server',
      },
    };
  }

  /**
   * Add a WebSocket event to the specification
   */
  addEvent(event: WebSocketEventConfig): void {
    const channelName = event.channel;

    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, {
        description: `Channel for ${event.message.name} events`,
        subscribe: undefined,
        publish: undefined,
      });
    }

    const channel = this.channels.get(channelName)!;
    const message = this.createMessage(event);

    // Add message to components
    this.messages.set(event.message.name, message);

    // Add to channel based on direction
    if (event.direction === 'subscribe') {
      channel.subscribe = {
        summary: event.summary,
        description: event.description,
        message: {
          $ref: `#/components/messages/${event.message.name}`,
        },
      } as OperationObject;
    } else {
      channel.publish = {
        summary: event.summary,
        description: event.description,
        message: {
          $ref: `#/components/messages/${event.message.name}`,
        },
      } as OperationObject;
    }

    // Add payload schema if provided
    if (event.message.payload) {
      this.schemas.set(`${event.message.name}Payload`, this.resolveSchema(event.message.payload));
    }

    // Add headers schema if provided
    if (event.message.headers) {
      this.schemas.set(`${event.message.name}Headers`, this.resolveSchema(event.message.headers));
    }
  }

  /**
   * Add common POLLN spreadsheet WebSocket events
   */
  addCommonEvents(): void {
    // Cell updates
    this.addEvent({
      channel: 'cells/{cellId}',
      direction: 'subscribe',
      summary: 'Cell value updated',
      description: 'Emitted when a cell value changes',
      message: {
        name: 'CellUpdated',
        payload: {
          type: 'object',
          properties: {
            cellId: { type: 'string', format: 'uuid' },
            position: {
              type: 'object',
              properties: {
                column: { type: 'string' },
                row: { type: 'integer' },
                sheet: { type: 'string' },
              },
            },
            oldValue: { type: ['string', 'number', 'boolean', 'null'] },
            newValue: { type: ['string', 'number', 'boolean'] },
            timestamp: { type: 'string', format: 'date-time' },
            cause: { type: 'string', enum: ['user', 'formula', 'api', 'sensation'] },
          },
          required: ['cellId', 'newValue', 'timestamp'],
        },
        examples: [
          {
            payload: {
              cellId: '550e8400-e29b-41d4-a716-446655440000',
              position: { column: 'A', row: 1, sheet: 'Sheet1' },
              oldValue: null,
              newValue: 'Hello World',
              timestamp: '2024-01-01T00:00:00.000Z',
              cause: 'user',
            },
          },
        ],
      },
    });

    // Cell sensation events
    this.addEvent({
      channel: 'cells/{cellId}/sensation',
      direction: 'subscribe',
      summary: 'Cell sensation detected',
      description: 'Emitted when a cell detects a change in its watched cells',
      message: {
        name: 'CellSensation',
        payload: {
          type: 'object',
          properties: {
            cellId: { type: 'string', format: 'uuid' },
            watchedCellId: { type: 'string', format: 'uuid' },
            sensationType: {
              type: 'string',
              enum: ['absolute', 'velocity', 'acceleration', 'pattern', 'anomaly'],
            },
            value: { type: 'number' },
            threshold: { type: 'number' },
            triggered: { type: 'boolean' },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['cellId', 'watchedCellId', 'sensationType', 'value', 'timestamp'],
        },
        examples: [
          {
            payload: {
              cellId: '550e8400-e29b-41d4-a716-446655440000',
              watchedCellId: '650e8400-e29b-41d4-a716-446655440001',
              sensationType: 'velocity',
              value: 15.5,
              threshold: 10,
              triggered: true,
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          },
        ],
      },
    });

    // Colony statistics updates
    this.addEvent({
      channel: 'colonies/{colonyId}/stats',
      direction: 'subscribe',
      summary: 'Colony statistics update',
      description: 'Periodic statistics updates for a colony',
      message: {
        name: 'ColonyStats',
        payload: {
          type: 'object',
          properties: {
            colonyId: { type: 'string', format: 'uuid' },
            totalCells: { type: 'integer' },
            activeCells: { type: 'integer' },
            idleCells: { type: 'integer' },
            processingCells: { type: 'integer' },
            errorCells: { type: 'integer' },
            messagesSent: { type: 'integer' },
            messagesReceived: { type: 'integer' },
            uptime: { type: 'number' },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['colonyId', 'totalCells', 'timestamp'],
        },
        examples: [
          {
            payload: {
              colonyId: '550e8400-e29b-41d4-a716-446655440000',
              totalCells: 100,
              activeCells: 75,
              idleCells: 20,
              processingCells: 4,
              errorCells: 1,
              messagesSent: 1523,
              messagesReceived: 1892,
              uptime: 3600.5,
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          },
        ],
      },
    });

    // Agent lifecycle events
    this.addEvent({
      channel: 'agents/{agentId}/lifecycle',
      direction: 'subscribe',
      summary: 'Agent lifecycle event',
      description: 'Emitted when an agent spawns, activates, deactivates, or despawns',
      message: {
        name: 'AgentLifecycle',
        payload: {
          type: 'object',
          properties: {
            agentId: { type: 'string', format: 'uuid' },
            colonyId: { type: 'string', format: 'uuid' },
            event: {
              type: 'string',
              enum: ['spawned', 'activated', 'deactivated', 'despawned', 'error'],
            },
            reason: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['agentId', 'colonyId', 'event', 'timestamp'],
        },
        examples: [
          {
            payload: {
              agentId: '550e8400-e29b-41d4-a716-446655440000',
              colonyId: '650e8400-e29b-41d4-a716-446655440001',
              event: 'spawned',
              reason: 'Manual spawn by user',
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          },
        ],
      },
    });

    // Dream generation events
    this.addEvent({
      channel: 'colonies/{colonyId}/dreams',
      direction: 'subscribe',
      summary: 'Dream generation event',
      description: 'Emitted when a colony generates a dream episode',
      message: {
        name: 'DreamEpisode',
        payload: {
          type: 'object',
          properties: {
            colonyId: { type: 'string', format: 'uuid' },
            episodeId: { type: 'string', format: 'uuid' },
            experiences: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  agentId: { type: 'string', format: 'uuid' },
                  state: { type: 'object' },
                  outcome: { type: 'string' },
                },
              },
            },
            patterns: { type: 'array', items: { type: 'string' } },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['colonyId', 'episodeId', 'timestamp'],
        },
        examples: [
          {
            payload: {
              colonyId: '550e8400-e29b-41d4-a716-446655440000',
              episodeId: '650e8400-e29b-41d4-a716-446655440001',
              experiences: [
                {
                  agentId: '750e8400-e29b-41d4-a716-446655440002',
                  state: { position: 'exploring', energy: 85 },
                  outcome: 'success',
                },
              ],
              patterns: ['territory_expansion', 'resource_optimization'],
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          },
        ],
      },
    });

    // Client command channel
    this.addEvent({
      channel: 'commands',
      direction: 'publish',
      summary: 'Client command',
      description: 'Commands sent by clients to control colonies and agents',
      message: {
        name: 'ClientCommand',
        payload: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              enum: [
                'subscribe:colony',
                'unsubscribe:colony',
                'subscribe:agent',
                'unsubscribe:agent',
                'command:spawn',
                'command:despawn',
                'command:activate',
                'command:deactivate',
                'query:stats',
              ],
            },
            targetId: { type: 'string', format: 'uuid' },
            parameters: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['command', 'timestamp'],
        },
        examples: [
          {
            payload: {
              command: 'subscribe:colony',
              targetId: '550e8400-e29b-41d4-a716-446655440000',
              parameters: { includeAgents: true },
              timestamp: '2024-01-01T00:00:00.000Z',
            },
          },
        ],
      },
    });
  }

  /**
   * Create a message object from event config
   */
  private createMessage(event: WebSocketEventConfig): MessageObject {
    const message: MessageObject = {
      name: event.message.name,
      title: event.message.title,
      summary: event.message.summary,
      description: event.message.description,
      payload: this.resolveSchema(event.message.payload),
    };

    if (event.message.headers) {
      message.headers = this.resolveSchema(event.message.headers);
    }

    if (event.message.examples) {
      message.examples = event.message.examples;
    }

    if (event.message.correlationId) {
      message.correlationId = {
        description: event.message.correlationId,
        location: '$message.header#/correlationId',
      };
    }

    return message;
  }

  /**
   * Resolve schema - convert string refs to SchemaObjects
   */
  private resolveSchema(schema: SchemaObject | string): SchemaObject {
    if (typeof schema === 'string') {
      return { $ref: `#/components/schemas/${schema}` };
    }
    return schema;
  }

  /**
   * Generate the complete AsyncAPI specification
   */
  generate(): AsyncAPIDocument {
    // Add channels
    this.spec.channels = Object.fromEntries(this.channels);

    // Add components
    this.spec.components = {
      messages: Object.fromEntries(this.messages),
      schemas: Object.fromEntries(this.schemas),
    };

    return this.spec;
  }

  /**
   * Export specification as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.generate(), null, 2);
  }

  /**
   * Export specification as YAML
   */
  exportYAML(): string {
    const spec = this.generate();
    return this.toYAML(spec);
  }

  /**
   * Convert object to YAML
   */
  private toYAML(obj: any, indent: number = 0): string {
    const padding = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
      for (const item of obj) {
        yaml += `${padding}- ${this.toYAML(item, 0).trim()}\n`;
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) continue;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          yaml += `${padding}${key}:\n${this.toYAML(value, indent + 1)}`;
        } else if (Array.isArray(value)) {
          yaml += `${padding}${key}:\n${this.toYAML(value, indent + 1)}`;
        } else if (typeof value === 'string') {
          yaml += `${padding}${key}: "${value}"\n`;
        } else {
          yaml += `${padding}${key}: ${value}\n`;
        }
      }
    } else {
      yaml += String(obj);
    }

    return yaml;
  }

  /**
   * Generate WebSocket documentation in Markdown format
   */
  generateMarkdown(): string {
    const spec = this.generate();
    let markdown = '# WebSocket API Documentation\n\n';
    markdown += `${spec.info.description}\n\n`;

    // Servers
    markdown += '## Servers\n\n';
    markdown += '| Name | URL | Protocol | Description |\n';
    markdown += '|------|-----|----------|-------------|\n';
    for (const [name, server] of Object.entries(spec.servers)) {
      markdown += `| ${name} | ${server.url} | ${server.protocol} | ${server.description || ''} |\n`;
    }
    markdown += '\n';

    // Channels
    markdown += '## Channels\n\n';
    for (const [channelName, channel] of Object.entries(spec.channels)) {
      markdown += `### ${channelName}\n\n`;
      markdown += `${channel.description}\n\n`;

      if (channel.subscribe) {
        markdown += '#### Subscribe\n\n';
        markdown += `${channel.subscribe.summary || ''}\n\n`;
        if (channel.subscribe.description) {
          markdown += `${channel.subscribe.description}\n\n`;
        }

        const messageRef = (channel.subscribe as OperationObject).message?.$ref;
        if (messageRef) {
          const messageName = messageRef.split('/').pop();
          const message = spec.components.messages?.[messageName!];
          if (message) {
            markdown += '**Message:** ' + message.name + '\n\n';
            if (message.summary) {
              markdown += `${message.summary}\n\n`;
            }
            if (message.payload) {
              markdown += '**Payload:**\n\n';
              markdown += '```json\n';
              markdown += JSON.stringify(message.payload, null, 2);
              markdown += '\n```\n\n';
            }
            if (message.examples && message.examples.length > 0) {
              markdown += '**Example:**\n\n';
              markdown += '```json\n';
              markdown += JSON.stringify(message.examples[0], null, 2);
              markdown += '\n```\n\n';
            }
          }
        }
      }

      if (channel.publish) {
        markdown += '#### Publish\n\n';
        markdown += `${channel.publish.summary || ''}\n\n`;
        if (channel.publish.description) {
          markdown += `${channel.publish.description}\n\n`;
        }

        const messageRef = (channel.publish as OperationObject).message?.$ref;
        if (messageRef) {
          const messageName = messageRef.split('/').pop();
          const message = spec.components.messages?.[messageName!];
          if (message) {
            markdown += '**Message:** ' + message.name + '\n\n';
            if (message.summary) {
              markdown += `${message.summary}\n\n`;
            }
            if (message.payload) {
              markdown += '**Payload:**\n\n';
              markdown += '```json\n';
              markdown += JSON.stringify(message.payload, null, 2);
              markdown += '\n```\n\n';
            }
            if (message.examples && message.examples.length > 0) {
              markdown += '**Example:**\n\n';
              markdown += '```json\n';
              markdown += JSON.stringify(message.examples[0], null, 2);
              markdown += '\n```\n\n';
            }
          }
        }
      }

      markdown += '---\n\n';
    }

    return markdown;
  }
}
