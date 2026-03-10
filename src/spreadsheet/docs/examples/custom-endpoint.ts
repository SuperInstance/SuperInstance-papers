/**
 * Example: Adding custom endpoints to the documentation
 */

import { OpenAPISpecGenerator } from '../index.js';
import type { DocConfig } from '../types.js';

const config: DocConfig = {
  title: 'Custom POLLN API',
  version: '2.0.0',
  description: 'Custom API with additional endpoints',
  servers: [{ url: 'https://api.custom.com' }],
  tags: [{ name: 'Custom', description: 'Custom operations' }],
  securitySchemes: {},
};

const generator = new OpenAPISpecGenerator(config);

// Add custom endpoint
generator.addPath({
  path: '/api/v2/custom/{id}',
  method: 'post',
  summary: 'Custom operation',
  description: 'Performs a custom operation',
  tags: ['Custom'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      description: 'Resource ID',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  requestBody: {
    description: 'Request payload',
    contentType: 'application/json',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        value: { type: 'number' },
      },
      required: ['name'],
    },
    example: {
      name: 'example',
      value: 42,
    },
  },
  responses: [
    {
      code: '200',
      description: 'Success',
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
        },
      },
    },
    {
      code: '400',
      description: 'Bad request',
      contentType: 'application/json',
      schema: { $ref: 'Error' },
    },
  ],
});

// Add custom schema
generator.addSchema('CustomResource', {
  type: 'object',
  description: 'A custom resource',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name'],
});

// Export
const spec = generator.generate();
console.log(JSON.stringify(spec, null, 2));
