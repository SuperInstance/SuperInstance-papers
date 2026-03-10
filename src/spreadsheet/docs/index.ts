/**
 * POLLN Spreadsheet API Documentation Generator
 * Comprehensive OpenAPI 3.1 and AsyncAPI 2.0 documentation generation
 */

export { OpenAPISpecGenerator } from './OpenAPISpecGenerator.js';
export { TypeSchemaGenerator } from './TypeSchemaGenerator.js';
export { APIDocumenter } from './APIDocumenter.js';
export { CodeExampleGenerator } from './CodeExampleGenerator.js';
export { WebSocketDocGenerator } from './WebSocketDocGenerator.js';

export type {
  // OpenAPI 3.1 Types
  OpenAPIDocument,
  InfoObject,
  ServerObject,
  PathsObject,
  PathItemObject,
  OperationObject,
  ComponentsObject,
  SchemaObject,
  SecuritySchemeObject,
  SecurityRequirementObject,
  TagObject,
  ParameterObject,
  RequestBodyObject,
  ResponsesObject,
  ResponseObject,
  MediaTypeObject,
  ExternalDocumentationObject,
  ExampleObject,
  HeaderObject,
  OAuthFlowsObject,
  OAuthFlowObject,
  XMLObject,
  DiscriminatorObject,
  LinkObject,
  CallbackObject,
  CallbacksObject,
  EncodingObject,

  // AsyncAPI 2.0 Types
  AsyncAPIDocument,
  AsyncInfoObject,
  AsyncServerObject,
  AsyncServerVariableObject,
  ChannelsObject,
  ChannelItemObject,
  AsyncComponentsObject,
  MessageObject,
  CorrelationIdObject,

  // Documentation Generation Types
  DocConfig,
  EndpointConfig,
  ParameterConfig,
  RequestConfig,
  ResponseConfig,
  HeaderConfig,
  WebSocketEventConfig,
  MessageConfig,
  JSDocComment,
  JSDocTag,
  TypeScriptType,
  PropertyType,
  CodeExample,
  DocTemplate,
  GeneratedDocumentation,
} from './types.js';

import { OpenAPISpecGenerator } from './OpenAPISpecGenerator.js';
import { TypeSchemaGenerator } from './TypeSchemaGenerator.js';
import { APIDocumenter } from './APIDocumenter.js';
import { CodeExampleGenerator } from './CodeExampleGenerator.js';
import { WebSocketDocGenerator } from './WebSocketDocGenerator.js';
import type { DocConfig, GeneratedDocumentation } from './types.js';
import fs from 'fs';
import path from 'path';

/**
 * Main documentation generator class
 * Orchestrates all documentation generation components
 */
export class DocumentationGenerator {
  private openapi: OpenAPISpecGenerator;
  private websocket: WebSocketDocGenerator;
  private documenter: APIDocumenter;
  private exampleGenerator: CodeExampleGenerator;
  private typeGenerator: TypeSchemaGenerator;

  constructor(config: DocConfig, sourceFiles: string[]) {
    this.openapi = new OpenAPISpecGenerator(config);
    this.websocket = new WebSocketDocGenerator(
      config.title,
      config.version,
      config.description
    );
    this.documenter = new APIDocumenter(process.cwd(), sourceFiles);
    this.exampleGenerator = new CodeExampleGenerator();
    this.typeGenerator = new TypeSchemaGenerator(sourceFiles);

    // Add common schemas and endpoints
    this.openapi.addCommonSchemas();
    this.openapi.addCommonEndpoints();
    this.websocket.addCommonEvents();
  }

  /**
   * Generate complete documentation package
   */
  async generate(): Promise<GeneratedDocumentation> {
    return {
      openapi: this.openapi.generate(),
      asyncapi: this.websocket.generate(),
      examples: [],
      templates: [],
      timestamp: new Date().toISOString(),
      version: this.openapi.generate().info.version,
    };
  }

  /**
   * Export documentation to files
   */
  async exportToDirectory(outputDir: string): Promise<void> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Export OpenAPI JSON
    const openapiJson = this.openapi.exportJSON();
    fs.writeFileSync(
      path.join(outputDir, 'openapi.json'),
      openapiJson
    );

    // Export OpenAPI YAML
    const openapiYaml = this.openapi.exportYAML();
    fs.writeFileSync(
      path.join(outputDir, 'openapi.yaml'),
      openapiYaml
    );

    // Export AsyncAPI JSON
    const asyncapiJson = this.websocket.exportJSON();
    fs.writeFileSync(
      path.join(outputDir, 'asyncapi.json'),
      asyncapiJson
    );

    // Export AsyncAPI YAML
    const asyncapiYaml = this.websocket.exportYAML();
    fs.writeFileSync(
      path.join(outputDir, 'asyncapi.yaml'),
      asyncapiYaml
    );

    // Export Markdown documentation
    const markdown = this.generateMarkdown();
    fs.writeFileSync(
      path.join(outputDir, 'README.md'),
      markdown
    );

    // Export HTML documentation
    const html = this.generateHTML();
    fs.writeFileSync(
      path.join(outputDir, 'index.html'),
      html
    );

    console.log(`Documentation exported to ${outputDir}`);
  }

  /**
   * Generate comprehensive Markdown documentation
   */
  private generateMarkdown(): string {
    let markdown = '# API Documentation\n\n';

    const openapi = this.openapi.generate();

    // Title and description
    markdown += `## ${openapi.info.title}\n\n`;
    markdown += `${openapi.info.description}\n\n`;
    markdown += `**Version:** ${openapi.info.version}\n\n`;

    // Table of contents
    markdown += '## Table of Contents\n\n';
    markdown += '- [Introduction](#introduction)\n';
    markdown += '- [Authentication](#authentication)\n';
    markdown += '- [REST API Endpoints](#rest-api-endpoints)\n';
    markdown += '- [WebSocket Events](#websocket-events)\n';
    markdown += '- [Data Models](#data-models)\n';
    markdown += '- [Code Examples](#code-examples)\n\n';

    // Introduction
    markdown += '## Introduction\n\n';
    markdown += 'Welcome to the POLLN Spreadsheet API documentation. ';
    markdown += 'This API provides programmatic access to living spreadsheet cells, ';
    markdown += 'colonies, and real-time events.\n\n';

    // Authentication
    markdown += '## Authentication\n\n';
    markdown += 'All API requests require authentication using an API key:\n\n';
    markdown += '```http\n';
    markdown += 'Authorization: Bearer YOUR_API_KEY\n';
    markdown += '```\n\n';
    markdown += 'To obtain an API key, please contact [support@polln.ai](mailto:support@polln.ai).\n\n';

    // REST API Endpoints
    markdown += '## REST API Endpoints\n\n';

    const groupedPaths = this.groupPathsByTag(openapi.paths);
    for (const [tag, paths] of groupedPaths.entries()) {
      markdown += `### ${tag}\n\n`;

      for (const { path, method, operation } of paths) {
        markdown += `#### ${operation.summary || path}\n\n`;
        markdown += `${operation.description || ''}\n\n`;
        markdown += `**Endpoint:** \`${method.toUpperCase()} ${path}\`\n\n`;

        if (operation.deprecated) {
          markdown += '> ⚠️ **Deprecated**: This endpoint is deprecated.\n\n';
        }

        // Parameters
        if (operation.parameters && operation.parameters.length > 0) {
          markdown += 'Parameters:\n\n';
          markdown += '| Name | Type | In | Required | Description |\n';
          markdown += '|------|------|-----|----------|-------------|\n';

          for (const param of operation.parameters) {
            const type = this.getTypeString(param.schema);
            const required = param.required ? 'Yes' : 'No';
            markdown += `| ${param.name} | ${type} | ${param.in} | ${required} | ${param.description || ''} |\n`;
          }
          markdown += '\n';
        }

        // Request body
        if (operation.requestBody) {
          markdown += '**Request Body:**\n\n';
          const content = operation.requestBody.content?.['application/json'];
          if (content?.schema) {
            markdown += '```json\n';
            markdown += JSON.stringify(this.generateExampleFromSchema(content.schema), null, 2);
            markdown += '\n```\n\n';
          }
        }

        // Responses
        markdown += '**Responses:**\n\n';
        for (const [code, response] of Object.entries(operation.responses)) {
          markdown += `- **${code}**: ${response.description}\n`;
        }
        markdown += '\n';

        markdown += '---\n\n';
      }
    }

    // WebSocket Events
    markdown += '## WebSocket Events\n\n';
    markdown += this.websocket.generateMarkdown();

    // Data Models
    markdown += '## Data Models\n\n';
    if (openapi.components?.schemas) {
      for (const [name, schema] of Object.entries(openapi.components.schemas)) {
        markdown += `### ${name}\n\n`;
        if (schema.description) {
          markdown += `${schema.description}\n\n`;
        }
        markdown += '```json\n';
        markdown += JSON.stringify(schema, null, 2);
        markdown += '\n```\n\n';
      }
    }

    // Code Examples
    markdown += '## Code Examples\n\n';
    markdown += '### JavaScript (Fetch API)\n\n';
    markdown += '```javascript\n';
    markdown += `const response = await fetch('${openapi.servers?.[0]?.url}/api/v1/spreadsheets', {\n`;
    markdown += `  method: 'GET',\n`;
    markdown += `  headers: {\n`;
    markdown += `    'Authorization': 'Bearer YOUR_API_KEY',\n`;
    markdown += `  },\n`;
    markdown += `});\n\n`;
    markdown += `const data = await response.json();\n`;
    markdown += `console.log(data);\n`;
    markdown += '```\n\n';

    markdown += '### Python (requests)\n\n';
    markdown += '```python\n';
    markdown += `import requests\n\n`;
    markdown += `url = '${openapi.servers?.[0]?.url}/api/v1/spreadsheets'\n`;
    markdown += `headers = {\n`;
    markdown += `    'Authorization': 'Bearer YOUR_API_KEY',\n`;
    markdown += `}\n\n`;
    markdown += `response = requests.get(url, headers=headers)\n`;
    markdown += `data = response.json()\n`;
    markdown += `print(data)\n`;
    markdown += '```\n\n';

    markdown += '### cURL\n\n';
    markdown += '```bash\n';
    markdown += `curl -X GET "${openapi.servers?.[0]?.url}/api/v1/spreadsheets" \\\n`;
    markdown += `  -H "Authorization: Bearer YOUR_API_KEY"\n`;
    markdown += '```\n\n';

    return markdown;
  }

  /**
   * Generate HTML documentation
   */
  private generateHTML(): string {
    const openapi = this.openapi.generate();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${openapi.info.title} - API Documentation</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 20px; margin: -20px -20px 40px; }
    h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .version { background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; }
    .endpoint { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .method { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 0.85rem; margin-right: 10px; }
    .method.get { background: #61affe; color: white; }
    .method.post { background: #49cc90; color: white; }
    .method.put { background: #fca130; color: white; }
    .method.delete { background: #f93e3e; color: white; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    pre { background: #2d2d2d; color: #f8f8f2; padding: 20px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; color: inherit; }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>${openapi.info.title}</h1>
      <p>${openapi.info.description}</p>
      <span class="version">Version ${openapi.info.version}</span>
    </div>
  </header>

  <div class="container">
    <h2>API Endpoints</h2>
    ${this.generateEndpointsHTML(openapi.paths)}
  </div>
</body>
</html>`;
  }

  /**
   * Generate HTML for endpoints
   */
  private generateEndpointsHTML(paths: any): string {
    let html = '';

    for (const [path, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (method === 'parameters' || method === 'summary' || method === 'description') continue;

        const op = operation as any;
        html += `
  <div class="endpoint">
    <h3><span class="method ${method}">${method.toUpperCase()}</span> ${path}</h3>
    <p>${op.summary || ''}</p>
    <p>${op.description || ''}</p>
  </div>`;
      }
    }

    return html;
  }

  /**
   * Group paths by tag
   */
  private groupPathsByTag(paths: any): Map<string, Array<{ path: string; method: string; operation: any }>> {
    const grouped = new Map<string, Array<{ path: string; method: string; operation: any }>>();

    for (const [path, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (method === 'parameters' || method === 'summary' || method === 'description') continue;

        const op = operation as any;
        const tag = (op.tags && op.tags[0]) || 'General';

        if (!grouped.has(tag)) {
          grouped.set(tag, []);
        }

        grouped.get(tag)!.push({ path, method, operation: op });
      }
    }

    return grouped;
  }

  /**
   * Get type string from schema
   */
  private getTypeString(schema: any): string {
    if (schema.$ref) {
      return schema.$ref.split('/').pop() || 'object';
    }
    if (schema.type) {
      return Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type;
    }
    return 'any';
  }

  /**
   * Generate example from schema
   */
  private generateExampleFromSchema(schema: any): any {
    if (schema.$ref) {
      return { _ref: schema.$ref };
    }

    if (schema.example) {
      return schema.example;
    }

    if (schema.enum) {
      return schema.enum[0];
    }

    switch (schema.type) {
      case 'string':
        return schema.format === 'uuid' ? '550e8400-e29b-41d4-a716-446655440000' : 'example';
      case 'number':
      case 'integer':
        return schema.default ?? schema.minimum ?? 0;
      case 'boolean':
        return true;
      case 'array':
        return schema.items ? [this.generateExampleFromSchema(schema.items)] : [];
      case 'object':
        if (schema.properties) {
          const obj: any = {};
          for (const [name, prop] of Object.entries(schema.properties)) {
            if (!schema.required?.includes(name)) continue;
            obj[name] = this.generateExampleFromSchema(prop);
          }
          return obj;
        }
        return {};
      default:
        return null;
    }
  }
}

/**
 * Create a new documentation generator with default configuration
 */
export function createDocumentationGenerator(config?: Partial<DocConfig>): DocumentationGenerator {
  const defaultConfig: DocConfig = {
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
  };

  const mergedConfig = { ...defaultConfig, ...config };

  return new DocumentationGenerator(mergedConfig, []);
}
