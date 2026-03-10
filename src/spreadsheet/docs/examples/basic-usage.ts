/**
 * Basic usage example for the POLLN API Documentation Generator
 */

import { createDocumentationGenerator } from '../index.js';

async function main() {
  // Create a documentation generator with custom configuration
  const generator = createDocumentationGenerator({
    title: 'POLLN Spreadsheet API',
    version: '1.0.0',
    description: 'API for living spreadsheet cells with sensation, memory, and agency',
    servers: [
      {
        url: 'https://api.polln.ai',
        description: 'Production server',
      },
      {
        url: 'http://localhost:8080',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Cells', description: 'Living cell operations' },
      { name: 'Spreadsheets', description: 'Spreadsheet management' },
      { name: 'Colonies', description: 'Colony operations' },
      { name: 'WebSocket', description: 'Real-time events' },
    ],
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT bearer token authentication',
      },
    },
  });

  // Generate and export documentation
  await generator.exportToDirectory('./docs/api');

  console.log('Documentation generated successfully!');
  console.log('Files created:');
  console.log('  - openapi.json');
  console.log('  - openapi.yaml');
  console.log('  - asyncapi.json');
  console.log('  - asyncapi.yaml');
  console.log('  - README.md');
  console.log('  - index.html');
}

main().catch(console.error);
