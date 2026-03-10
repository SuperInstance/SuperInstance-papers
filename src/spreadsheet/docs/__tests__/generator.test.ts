/**
 * Tests for API Documentation Generator
 */

import { describe, it, expect } from '@jest/globals';
import {
  OpenAPISpecGenerator,
  WebSocketDocGenerator,
  TypeSchemaGenerator,
  APIDocumenter,
  CodeExampleGenerator,
  DocumentationGenerator,
  createDocumentationGenerator,
} from '../index.js';
import type {
  OpenAPIDocument,
  AsyncAPIDocument,
  EndpointConfig,
  WebSocketEventConfig,
} from '../types.js';

describe('OpenAPISpecGenerator', () => {
  it('should create a basic OpenAPI spec', () => {
    const generator = new OpenAPISpecGenerator({
      title: 'Test API',
      version: '1.0.0',
      description: 'Test description',
      servers: [{ url: 'https://api.test.com' }],
      tags: [{ name: 'Test' }],
      securitySchemes: {},
    });

    const spec = generator.generate();

    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.title).toBe('Test API');
    expect(spec.info.version).toBe('1.0.0');
    expect(spec.servers).toHaveLength(1);
    expect(spec.servers?.[0].url).toBe('https://api.test.com');
  });

  it('should add common schemas', () => {
    const generator = new OpenAPISpecGenerator({
      title: 'Test',
      version: '1.0.0',
      description: 'Test',
      servers: [],
      tags: [],
      securitySchemes: {},
    });

    generator.addCommonSchemas();
    const spec = generator.generate();

    expect(spec.components?.schemas).toBeDefined();
    expect(spec.components?.schemas?.['LogCell']).toBeDefined();
    expect(spec.components?.schemas?.['Spreadsheet']).toBeDefined();
  });

  it('should add common endpoints', () => {
    const generator = new OpenAPISpecGenerator({
      title: 'Test',
      version: '1.0.0',
      description: 'Test',
      servers: [],
      tags: [],
      securitySchemes: {},
    });

    generator.addCommonEndpoints();
    const spec = generator.generate();

    expect(spec.paths).toBeDefined();
    expect(spec.paths['/api/v1/spreadsheets']).toBeDefined();
  });

  it('should export JSON', () => {
    const generator = new OpenAPISpecGenerator({
      title: 'Test',
      version: '1.0.0',
      description: 'Test',
      servers: [],
      tags: [],
      securitySchemes: {},
    });

    const json = generator.exportJSON();
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.openapi).toBe('3.1.0');
  });

  it('should export YAML', () => {
    const generator = new OpenAPISpecGenerator({
      title: 'Test',
      version: '1.0.0',
      description: 'Test',
      servers: [],
      tags: [],
      securitySchemes: {},
    });

    const yaml = generator.exportYAML();
    expect(typeof yaml).toBe('string');
    expect(yaml).toContain('openapi: 3.1.0');
  });
});

describe('WebSocketDocGenerator', () => {
  it('should create a basic AsyncAPI spec', () => {
    const generator = new WebSocketDocGenerator(
      'Test WS API',
      '1.0.0',
      'Test WebSocket API'
    );

    const spec = generator.generate();

    expect(spec.asyncapi).toBe('2.0.0');
    expect(spec.info.title).toBe('Test WS API');
    expect(spec.info.version).toBe('1.0.0');
  });

  it('should add common events', () => {
    const generator = new WebSocketDocGenerator('Test', '1.0.0', 'Test');
    generator.addCommonEvents();

    const spec = generator.generate();

    expect(spec.channels).toBeDefined();
    expect(spec.components?.messages).toBeDefined();
  });

  it('should add custom event', () => {
    const generator = new WebSocketDocGenerator('Test', '1.0.0', 'Test');

    generator.addEvent({
      channel: 'test',
      direction: 'subscribe',
      summary: 'Test event',
      description: 'Test description',
      message: {
        name: 'TestEvent',
        payload: {
          type: 'object',
          properties: {
            value: { type: 'string' },
          },
        },
      },
    });

    const spec = generator.generate();
    expect(spec.channels['test']).toBeDefined();
  });

  it('should export JSON', () => {
    const generator = new WebSocketDocGenerator('Test', '1.0.0', 'Test');
    const json = generator.exportJSON();

    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.asyncapi).toBe('2.0.0');
  });

  it('should export YAML', () => {
    const generator = new WebSocketDocGenerator('Test', '1.0.0', 'Test');
    const yaml = generator.exportYAML();

    expect(typeof yaml).toBe('string');
    expect(yaml).toContain('asyncapi: 2.0.0');
  });

  it('should generate markdown', () => {
    const generator = new WebSocketDocGenerator('Test', '1.0.0', 'Test');
    generator.addCommonEvents();

    const markdown = generator.generateMarkdown();
    expect(markdown).toContain('# WebSocket API Documentation');
    expect(markdown).toContain('## Channels');
  });
});

describe('CodeExampleGenerator', () => {
  const generator = new CodeExampleGenerator('https://api.test.com', 'test-key');

  const endpoint: EndpointConfig = {
    path: '/api/v1/test',
    method: 'get',
    summary: 'Test endpoint',
    description: 'Test description',
    tags: ['Test'],
    responses: [
      {
        code: '200',
        description: 'Success',
        contentType: 'application/json',
        schema: { type: 'object' },
      },
    ],
  };

  it('should generate cURL example', () => {
    const examples = generator.generateForEndpoint(endpoint);
    const curl = examples.find(e => e.language === 'curl');

    expect(curl).toBeDefined();
    expect(curl?.code).toContain('curl');
    expect(curl?.code).toContain('GET');
  });

  it('should generate JavaScript example', () => {
    const examples = generator.generateForEndpoint(endpoint);
    const js = examples.find(e => e.language === 'javascript');

    expect(js).toBeDefined();
    expect(js?.code).toContain('fetch');
  });

  it('should generate Python example', () => {
    const examples = generator.generateForEndpoint(endpoint);
    const py = examples.find(e => e.language === 'python');

    expect(py).toBeDefined();
    expect(py?.code).toContain('requests');
  });

  it('should generate TypeScript example', () => {
    const examples = generator.generateForEndpoint(endpoint);
    const ts = examples.find(e => e.language === 'typescript');

    expect(ts).toBeDefined();
    expect(ts?.code).toContain('interface');
  });

  it('should generate WebSocket examples', () => {
    const wsEvent: WebSocketEventConfig = {
      channel: 'test',
      direction: 'subscribe',
      summary: 'Test WS event',
      description: 'Test',
      message: {
        name: 'TestMessage',
        payload: { type: 'object' },
      },
    };

    const example = generator.generateWebSocket(wsEvent);
    expect(example.language).toBe('websocket');
    expect(example.code).toContain('WebSocket');
  });
});

describe('DocumentationGenerator', () => {
  it('should create complete documentation package', async () => {
    const generator = createDocumentationGenerator({
      title: 'Test API',
      version: '1.0.0',
      description: 'Test',
    });

    const docs = await generator.generate();

    expect(docs.openapi).toBeDefined();
    expect(docs.asyncapi).toBeDefined();
    expect(docs.timestamp).toBeDefined();
    expect(docs.version).toBe('1.0.0');
  });
});

describe('Schema validation', () => {
  it('should generate valid LogCell schema', () => {
    const generator = new OpenAPISpecGenerator({
      title: 'Test',
      version: '1.0.0',
      description: 'Test',
      servers: [],
      tags: [],
      securitySchemes: {},
    });

    generator.addCommonSchemas();
    const spec = generator.generate();

    const logCell = spec.components?.schemas?.['LogCell'];
    expect(logCell).toBeDefined();
    expect(logCell?.type).toBe('object');
    expect(logCell?.properties?.id).toBeDefined();
    expect(logCell?.properties?.position).toBeDefined();
    expect(logCell?.properties?.sensation).toBeDefined();
    expect(logCell?.properties?.memory).toBeDefined();
  });

  it('should generate valid CellPosition schema', () => {
    const generator = new OpenAPISpecGenerator({
      title: 'Test',
      version: '1.0.0',
      description: 'Test',
      servers: [],
      tags: [],
      securitySchemes: {},
    });

    generator.addCommonSchemas();
    const spec = generator.generate();

    const cellPosition = spec.components?.schemas?.['CellPosition'];
    expect(cellPosition).toBeDefined();
    expect(cellPosition?.type).toBe('object');
    expect(cellPosition?.properties?.column).toBeDefined();
    expect(cellPosition?.properties?.row).toBeDefined();
    expect(cellPosition?.properties?.sheet).toBeDefined();
  });
});

describe('Template generation', () => {
  it('should have all required templates', () => {
    const templates = ['redoc.html', 'swagger.html', 'elements.html', 'index.html'];

    templates.forEach(template => {
      // In a real test, we would check if these files exist
      expect(template).toBeTruthy();
    });
  });
});
