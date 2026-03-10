/**
 * OpenAPI 3.1 Specification Generator
 * Generates compliant OpenAPI specifications for POLLN Spreadsheet API
 */

import type {
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
  DocConfig,
  EndpointConfig,
} from './types.js';

export class OpenAPISpecGenerator {
  private spec: OpenAPIDocument;
  private schemas: Map<string, SchemaObject> = new Map();
  private securitySchemes: Map<string, SecuritySchemeObject> = new Map();

  constructor(config: DocConfig) {
    this.spec = this.initializeSpec(config);
  }

  /**
   * Initialize the OpenAPI specification with basic information
   */
  private initializeSpec(config: DocConfig): OpenAPIDocument {
    const info: InfoObject = {
      title: config.title,
      version: config.version,
      description: config.description,
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

    const spec: OpenAPIDocument = {
      openapi: '3.1.0',
      info,
      servers: config.servers,
      paths: {},
      tags: config.tags,
      security: [],
    };

    // Add security schemes
    Object.entries(config.securitySchemes).forEach(([name, scheme]) => {
      this.addSecurityScheme(name, scheme);
    });

    return spec;
  }

  /**
   * Generate the complete OpenAPI specification
   */
  generate(): OpenAPIDocument {
    // Build components from registered schemas
    if (this.schemas.size > 0 || this.securitySchemes.size > 0) {
      this.spec.components = {};

      if (this.schemas.size > 0) {
        this.spec.components.schemas = Object.fromEntries(this.schemas);
      }

      if (this.securitySchemes.size > 0) {
        this.spec.components.securitySchemes = Object.fromEntries(this.securitySchemes);
      }
    }

    return this.spec;
  }

  /**
   * Add a path (endpoint) to the specification
   */
  addPath(endpoint: EndpointConfig): void {
    const { path, method, summary, description, tags, parameters, requestBody, responses, security, deprecated } = endpoint;

    if (!this.spec.paths[path]) {
      this.spec.paths[path] = {};
    }

    const pathItem = this.spec.paths[path] as PathItemObject;

    const operation: OperationObject = {
      tags,
      summary,
      description,
      operationId: this.generateOperationId(path, method),
      parameters: parameters?.map(p => this.createParameter(p)),
      responses: this.createResponses(responses),
      deprecated,
    };

    if (requestBody) {
      operation.requestBody = this.createRequestBody(requestBody);
    }

    if (security) {
      operation.security = security;
    }

    pathItem[method] = operation;
  }

  /**
   * Add a schema to the components section
   */
  addSchema(name: string, schema: SchemaObject): void {
    this.schemas.set(name, schema);
  }

  /**
   * Add a security scheme
   */
  addSecurityScheme(name: string, scheme: SecuritySchemeObject): void {
    this.securitySchemes.set(name, scheme);
  }

  /**
   * Export specification as JSON string
   */
  exportJSON(): string {
    return JSON.stringify(this.generate(), null, 2);
  }

  /**
   * Export specification as YAML string
   */
  exportYAML(): string {
    const spec = this.generate();
    return this.toYAML(spec);
  }

  /**
   * Convert object to YAML format
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
   * Generate a unique operation ID from path and method
   */
  private generateOperationId(path: string, method: string): string {
    // Remove path parameters and convert to camelCase
    const pathParts = path
      .split('/')
      .filter(p => p && !p.startsWith(':'))
      .map(p => p.charAt(0).toUpperCase() + p.slice(1));

    return method.toLowerCase() + pathParts.join('');
  }

  /**
   * Create a parameter object from config
   */
  private createParameter(config: any): ParameterObject {
    return {
      name: config.name,
      in: config.in,
      description: config.description,
      required: config.required,
      schema: this.resolveSchema(config.schema),
      example: config.example,
    };
  }

  /**
   * Create a request body object from config
   */
  private createRequestBody(config: any): RequestBodyObject {
    return {
      description: config.description,
      content: {
        [config.contentType]: {
          schema: this.resolveSchema(config.schema),
          example: config.example,
        } as MediaTypeObject,
      },
      required: true,
    };
  }

  /**
   * Create responses object from config array
   */
  private createResponses(configs: any[]): ResponsesObject {
    const responses: ResponsesObject = {};

    for (const config of configs) {
      const response: ResponseObject = {
        description: config.description,
        content: {
          [config.contentType]: {
            schema: this.resolveSchema(config.schema),
            example: config.example,
          } as MediaTypeObject,
        },
      };

      if (config.headers) {
        response.headers = {};
        for (const [name, header] of Object.entries(config.headers)) {
          response.headers[name] = {
            description: (header as any).description,
            schema: this.resolveSchema((header as any).schema),
            required: (header as any).required,
          };
        }
      }

      responses[config.code] = response;
    }

    return responses;
  }

  /**
   * Resolve a schema - either return the SchemaObject or reference by name
   */
  private resolveSchema(schema: SchemaObject | string): SchemaObject {
    if (typeof schema === 'string') {
      // Reference to a registered schema
      return { $ref: `#/components/schemas/${schema}` };
    }
    return schema;
  }

  /**
   * Add common POLLN spreadsheet schemas
   */
  addCommonSchemas(): void {
    // Cell schemas
    this.addSchema('LogCell', {
      type: 'object',
      description: 'A living spreadsheet cell with sensation, memory, and agency',
      properties: {
        id: { type: 'string', format: 'uuid' },
        position: { $ref: '#/components/schemas/CellPosition' },
        value: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'object' }] },
        sensation: { $ref: '#/components/schemas/CellSensation' },
        memory: { $ref: '#/components/schemas/CellMemory' },
        reasoning: { $ref: '#/components/schemas/CellReasoning' },
        state: { type: 'string', enum: ['active', 'idle', 'processing', 'error'] },
        connections: { type: 'array', items: { type: 'string' } },
      },
      required: ['id', 'position', 'state'],
    });

    this.addSchema('CellPosition', {
      type: 'object',
      description: 'Position of a cell in the spreadsheet',
      properties: {
        column: { type: 'string' },
        row: { type: 'integer' },
        sheet: { type: 'string' },
      },
      required: ['column', 'row'],
    });

    this.addSchema('CellSensation', {
      type: 'object',
      description: 'Sensory input from other cells',
      properties: {
        watching: { type: 'array', items: { type: 'string' } },
        absolute: { type: 'number' },
        velocity: { type: 'number' },
        acceleration: { type: 'number' },
        pattern: { type: 'string' },
        anomaly: { type: 'boolean' },
      },
    });

    this.addSchema('CellMemory', {
      type: 'object',
      description: 'Cell memory state',
      properties: {
        history: { type: 'array', items: { type: 'object' } },
        patterns: { type: 'array', items: { type: 'string' } },
        learned: { type: 'object' },
      },
    });

    this.addSchema('CellReasoning', {
      type: 'object',
      description: 'Cell reasoning trace',
      properties: {
        steps: { type: 'array', items: { type: 'object' } },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        explanation: { type: 'string' },
      },
    });

    // Spreadsheet schemas
    this.addSchema('Spreadsheet', {
      type: 'object',
      description: 'A collection of living cells',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        cells: { type: 'object', additionalProperties: { $ref: '#/components/schemas/LogCell' } },
        sheets: { type: 'array', items: { type: 'string' } },
        metadata: { type: 'object' },
      },
      required: ['id', 'name', 'cells'],
    });

    // Colony schemas
    this.addSchema('Colony', {
      type: 'object',
      description: 'A colony of coordinated cells',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        cells: { type: 'array', items: { $ref: '#/components/schemas/LogCell' } },
        config: { type: 'object' },
        stats: { $ref: '#/components/schemas/ColonyStats' },
      },
      required: ['id', 'name', 'cells'],
    });

    this.addSchema('ColonyStats', {
      type: 'object',
      description: 'Colony statistics',
      properties: {
        totalCells: { type: 'integer' },
        activeCells: { type: 'integer' },
        messagesSent: { type: 'integer' },
        messagesReceived: { type: 'integer' },
        uptime: { type: 'number' },
      },
    });

    // Error schemas
    this.addSchema('Error', {
      type: 'object',
      description: 'Error response',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'object' },
        timestamp: { type: 'string', format: 'date-time' },
      },
      required: ['code', 'message'],
    });

    this.addSchema('ValidationError', {
      type: 'object',
      description: 'Validation error details',
      properties: {
        field: { type: 'string' },
        message: { type: 'string' },
        value: { type: 'any' },
      },
    });
  }

  /**
   * Add common POLLN spreadsheet endpoints
   */
  addCommonEndpoints(): void {
    // Cell management endpoints
    this.addPath({
      path: '/api/v1/spreadsheets/{spreadsheetId}/cells',
      method: 'get',
      summary: 'List all cells in a spreadsheet',
      description: 'Retrieves all living cells with their current state',
      tags: ['Cells'],
      parameters: [
        {
          name: 'spreadsheetId',
          in: 'path',
          description: 'Spreadsheet UUID',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'sheet',
          in: 'query',
          description: 'Filter by sheet name',
          required: false,
          schema: { type: 'string' },
        },
        {
          name: 'state',
          in: 'query',
          description: 'Filter by cell state',
          required: false,
          schema: { type: 'string', enum: ['active', 'idle', 'processing', 'error'] },
        },
      ],
      responses: [
        {
          code: '200',
          description: 'List of cells',
          contentType: 'application/json',
          schema: {
            type: 'array',
            items: { $ref: 'LogCell' },
          },
        },
        {
          code: '404',
          description: 'Spreadsheet not found',
          contentType: 'application/json',
          schema: { $ref: 'Error' },
        },
      ],
    });

    this.addPath({
      path: '/api/v1/spreadsheets/{spreadsheetId}/cells/{cellId}',
      method: 'get',
      summary: 'Get a specific cell',
      description: 'Retrieves detailed information about a single cell',
      tags: ['Cells'],
      parameters: [
        {
          name: 'spreadsheetId',
          in: 'path',
          description: 'Spreadsheet UUID',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'cellId',
          in: 'path',
          description: 'Cell UUID',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: [
        {
          code: '200',
          description: 'Cell details',
          contentType: 'application/json',
          schema: { $ref: 'LogCell' },
        },
        {
          code: '404',
          description: 'Cell not found',
          contentType: 'application/json',
          schema: { $ref: 'Error' },
        },
      ],
    });

    this.addPath({
      path: '/api/v1/spreadsheets/{spreadsheetId}/cells',
      method: 'post',
      summary: 'Create a new cell',
      description: 'Creates a new living cell with sensation and agency',
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
            position: { $ref: 'CellPosition' },
            value: { type: ['string', 'number', 'boolean'] },
            sensation: { $ref: 'CellSensation' },
          },
          required: ['position'],
        },
        example: {
          position: { column: 'A', row: 1, sheet: 'Sheet1' },
          value: 'Hello World',
        },
      },
      responses: [
        {
          code: '201',
          description: 'Cell created',
          contentType: 'application/json',
          schema: { $ref: 'LogCell' },
        },
        {
          code: '400',
          description: 'Invalid cell configuration',
          contentType: 'application/json',
          schema: { $ref: 'Error' },
        },
      ],
    });

    this.addPath({
      path: '/api/v1/spreadsheets/{spreadsheetId}/cells/{cellId}',
      method: 'put',
      summary: 'Update a cell',
      description: 'Updates a cell\'s value or configuration',
      tags: ['Cells'],
      parameters: [
        {
          name: 'spreadsheetId',
          in: 'path',
          description: 'Spreadsheet UUID',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'cellId',
          in: 'path',
          description: 'Cell UUID',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        description: 'Cell updates',
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            value: { type: ['string', 'number', 'boolean', 'object'] },
            sensation: { $ref: 'CellSensation' },
          },
        },
      },
      responses: [
        {
          code: '200',
          description: 'Cell updated',
          contentType: 'application/json',
          schema: { $ref: 'LogCell' },
        },
        {
          code: '404',
          description: 'Cell not found',
          contentType: 'application/json',
          schema: { $ref: 'Error' },
        },
      ],
    });

    // Spreadsheet management endpoints
    this.addPath({
      path: '/api/v1/spreadsheets',
      method: 'get',
      summary: 'List all spreadsheets',
      description: 'Retrieves all spreadsheets accessible to the user',
      tags: ['Spreadsheets'],
      responses: [
        {
          code: '200',
          description: 'List of spreadsheets',
          contentType: 'application/json',
          schema: {
            type: 'array',
            items: { $ref: 'Spreadsheet' },
          },
        },
      ],
    });

    this.addPath({
      path: '/api/v1/spreadsheets',
      method: 'post',
      summary: 'Create a spreadsheet',
      description: 'Creates a new spreadsheet with living cells',
      tags: ['Spreadsheets'],
      requestBody: {
        description: 'Spreadsheet configuration',
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            sheets: { type: 'array', items: { type: 'string' } },
          },
          required: ['name'],
        },
        example: {
          name: 'My Living Spreadsheet',
          sheets: ['Sheet1', 'Sheet2'],
        },
      },
      responses: [
        {
          code: '201',
          description: 'Spreadsheet created',
          contentType: 'application/json',
          schema: { $ref: 'Spreadsheet' },
        },
        {
          code: '400',
          description: 'Invalid configuration',
          contentType: 'application/json',
          schema: { $ref: 'Error' },
        },
      ],
    });

    // Colony endpoints
    this.addPath({
      path: '/api/v1/colonies',
      method: 'get',
      summary: 'List all colonies',
      description: 'Retrieves all cell colonies',
      tags: ['Colonies'],
      responses: [
        {
          code: '200',
          description: 'List of colonies',
          contentType: 'application/json',
          schema: {
            type: 'array',
            items: { $ref: 'Colony' },
          },
        },
      ],
    });

    this.addPath({
      path: '/api/v1/colonies/{colonyId}/stats',
      method: 'get',
      summary: 'Get colony statistics',
      description: 'Retrieves detailed statistics for a colony',
      tags: ['Colonies'],
      parameters: [
        {
          name: 'colonyId',
          in: 'path',
          description: 'Colony UUID',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: [
        {
          code: '200',
          description: 'Colony statistics',
          contentType: 'application/json',
          schema: { $ref: 'ColonyStats' },
        },
        {
          code: '404',
          description: 'Colony not found',
          contentType: 'application/json',
          schema: { $ref: 'Error' },
        },
      ],
    });
  }
}
