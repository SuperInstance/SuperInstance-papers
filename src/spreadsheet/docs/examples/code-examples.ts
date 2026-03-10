/**
 * Example: Generating code examples for endpoints
 */

import { CodeExampleGenerator } from '../index.js';
import type { EndpointConfig } from '../index.js';

const generator = new CodeExampleGenerator(
  'https://api.polln.ai',
  'your-api-key-here'
);

const endpoint: EndpointConfig = {
  path: '/api/v1/spreadsheets/{spreadsheetId}/cells',
  method: 'post',
  summary: 'Create a new cell',
  description: 'Creates a new living cell in the spreadsheet',
  tags: ['Cells'],
  parameters: [
    {
      name: 'spreadsheetId',
      in: 'path',
      description: 'Spreadsheet UUID',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
  ],
  requestBody: {
    description: 'Cell configuration',
    contentType: 'application/json',
    schema: {
      type: 'object',
      properties: {
        position: {
          type: 'object',
          properties: {
            column: { type: 'string' },
            row: { type: 'integer' },
            sheet: { type: 'string' },
          },
          required: ['column', 'row'],
        },
        value: { type: 'string' },
        formula: { type: 'string' },
      },
      required: ['position'],
    },
  },
  responses: [
    {
      code: '201',
      description: 'Cell created successfully',
      contentType: 'application/json',
      schema: { $ref: 'LogCell' },
    },
    {
      code: '400',
      description: 'Invalid request',
      contentType: 'application/json',
      schema: { $ref: 'Error' },
    },
  ],
};

// Generate all code examples
const examples = generator.generateForEndpoint(endpoint);

console.log('=== cURL ===');
console.log(examples.find(e => e.language === 'curl')?.code);
console.log('\n=== JavaScript ===');
console.log(examples.find(e => e.language === 'javascript')?.code);
console.log('\n=== TypeScript ===');
console.log(examples.find(e => e.language === 'typescript')?.code);
console.log('\n=== Python ===');
console.log(examples.find(e => e.language === 'python')?.code);
