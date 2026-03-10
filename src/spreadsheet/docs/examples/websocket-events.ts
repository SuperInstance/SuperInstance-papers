/**
 * Example: Adding custom WebSocket events
 */

import { WebSocketDocGenerator } from '../index.js';

const generator = new WebSocketDocGenerator(
  'Custom WebSocket API',
  '1.0.0',
  'Custom real-time events'
);

// Add custom event
generator.addEvent({
  channel: 'custom/{resourceId}',
  direction: 'subscribe',
  summary: 'Custom resource updated',
  description: 'Emitted when a custom resource is updated',
  message: {
    name: 'CustomResourceUpdated',
    summary: 'Resource update event',
    payload: {
      type: 'object',
      properties: {
        resourceId: { type: 'string', format: 'uuid' },
        eventType: {
          type: 'string',
          enum: ['created', 'updated', 'deleted'],
        },
        data: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'number' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
      required: ['resourceId', 'eventType', 'timestamp'],
    },
    examples: [
      {
        payload: {
          resourceId: '550e8400-e29b-41d4-a716-446655440000',
          eventType: 'updated',
          data: {
            name: 'example',
            value: 42,
          },
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      },
    ],
  },
});

// Add publish event (client -> server)
generator.addEvent({
  channel: 'commands',
  direction: 'publish',
  summary: 'Client command',
  description: 'Commands sent by clients',
  message: {
    name: 'ClientCommand',
    payload: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          enum: ['create', 'update', 'delete', 'query'],
        },
        resourceId: { type: 'string', format: 'uuid' },
        parameters: { type: 'object' },
      },
      required: ['command'],
    },
    examples: [
      {
        payload: {
          command: 'create',
          parameters: {
            name: 'new resource',
            value: 100,
          },
        },
      },
    ],
  },
});

// Export
const spec = generator.generate();
console.log(JSON.stringify(spec, null, 2));
