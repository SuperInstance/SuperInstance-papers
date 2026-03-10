/**
 * API Documentation Extractor
 * Extracts JSDoc comments and TypeScript types for documentation
 */

import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import type {
  SchemaObject,
  JSDocComment,
  JSDocTag,
  EndpointConfig,
  CodeExample,
} from './types.js';
import { TypeSchemaGenerator } from './TypeSchemaGenerator.js';

export class APIDocumenter {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private schemaGenerator: TypeSchemaGenerator;

  constructor(projectRoot: string, filePaths: string[]) {
    const configPath = ts.findConfigFile(
      projectRoot,
      ts.sys.fileExists,
      'tsconfig.json'
    );

    if (!configPath) {
      throw new Error('Could not find tsconfig.json');
    }

    const configContent = ts.readConfigFile(configPath, ts.sys.readFile).config;
    const compilerOptions: ts.CompilerOptions = {
      ...configContent.compilerOptions,
      allowJs: true,
    };

    this.program = ts.createProgram(filePaths, compilerOptions);
    this.checker = this.program.getTypeChecker();
    this.schemaGenerator = new TypeSchemaGenerator(filePaths);
  }

  /**
   * Extract all JSDoc comments from a source file
   */
  extractJSDocComments(filePath: string): Map<string, JSDocComment> {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`Source file not found: ${filePath}`);
    }

    const comments = new Map<string, JSDocComment>();

    const visit = (node: ts.Node) => {
      const jsDocTags = ts.getJSDocTags(node);
      if (jsDocTags.length > 0 || ts.getJSDocComments(node)) {
        const comment = this.parseJSDoc(node);
        const name = this.getNodeName(node);
        if (name && comment) {
          comments.set(name, comment);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return comments;
  }

  /**
   * Parse JSDoc comment from a node
   */
  private parseJSDoc(node: ts.Node): JSDocComment | null {
    const tags: JSDocTag[] = [];
    let description = '';
    let deprecated = false;
    const see: string[] = [];

    // Get comment ranges
    const sourceFile = node.getSourceFile();
    const commentRanges = ts.getLeadingCommentRanges(
      sourceFile.text,
      node.getStart(sourceFile)
    ) ?? [];

    if (commentRanges.length === 0) {
      return null;
    }

    // Get the JSDoc tags
    const jsDocTags = ts.getJSDocTags(node);
    for (const tag of jsDocTags) {
      const tagText = ts.getTextOfJSDocTag(tag);
      const tagName = tag.tagName.text;

      const tagData: JSDocTag = {
        tag: tagName,
        description: tagText,
      };

      // Extract type and name from tag
      if (tag.kind === ts.SyntaxKind.JSDocTag) {
        const typeExpression = (tag as any).typeExpression;
        if (typeExpression) {
          tagData.type = this.checker.typeToString(
            this.checker.getTypeFromTypeNode(typeExpression)
          );
        }
        if ((tag as any).name) {
          tagData.name = (tag as any).name.text;
        }
      }

      tags.push(tagData);

      // Extract special tags
      if (tagName === 'deprecated') {
        deprecated = true;
      }
      if (tagName === 'see') {
        see.push(tagText);
      }
    }

    // Get main description
    const jsDocComments = ts.getJSDocComments(node);
    if (jsDocComments) {
      description = jsDocComments.map(c => c.text).join('\n');
    }

    return {
      description,
      tags,
      deprecated,
      see: see.length > 0 ? see : undefined,
    };
  }

  /**
   * Get node name for documentation
   */
  private getNodeName(node: ts.Node): string | null {
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      return node.name?.getText() ?? null;
    }
    if (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node)) {
      const parentName = node.parent?.name?.getText() ?? '';
      const name = node.name?.getText() ?? '';
      return parentName ? `${parentName}.${name}` : name;
    }
    return null;
  }

  /**
   * Extract endpoint documentation from a controller class
   */
  extractEndpoints(controllerClassPath: string): EndpointConfig[] {
    const endpoints: EndpointConfig[] = [];
    const sourceFile = this.program.getSourceFile(controllerClassPath);

    if (!sourceFile) {
      return endpoints;
    }

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node)) {
        // Extract endpoints from class methods
        for (const member of node.members) {
          if (ts.isMethodDeclaration(member)) {
            const endpoint = this.extractEndpoint(member);
            if (endpoint) {
              endpoints.push(endpoint);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return endpoints;
  }

  /**
   * Extract endpoint configuration from a method
   */
  private extractEndpoint(method: ts.MethodDeclaration): EndpointConfig | null {
    const methodName = method.name?.getText();
    if (!methodName) {
      return null;
    }

    const jsDocTags = ts.getJSDocTags(method);
    let path = '';
    let httpMethod = 'get';
    let summary = '';
    let description = '';
    const tags: string[] = [];
    const deprecated = jsDocTags.some(t => t.tagName.text === 'deprecated');

    // Parse JSDoc tags for endpoint metadata
    for (const tag of jsDocTags) {
      const tagName = tag.tagName.text;
      const tagText = ts.getTextOfJSDocTag(tag);

      switch (tagName) {
        case 'path':
        case 'route':
          path = tagText;
          break;
        case 'method':
          httpMethod = tagText.toLowerCase();
          break;
        case 'summary':
          summary = tagText;
          break;
        case 'description':
        case 'desc':
          description = tagText;
          break;
        case 'tag':
        case 'category':
          tags.push(tagText);
          break;
      }
    }

    if (!path) {
      // Try to infer path from method name
      path = this.inferPathFromMethodName(methodName);
    }

    // Extract parameters
    const parameters = this.extractParameters(method);

    // Extract request body
    const requestBody = this.extractRequestBody(method);

    // Extract response type
    const responses = this.extractResponses(method);

    return {
      path,
      method: httpMethod as any,
      summary: summary || methodName,
      description,
      tags,
      parameters,
      requestBody,
      responses,
      deprecated,
    };
  }

  /**
   * Infer route path from method name
   */
  private inferPathFromMethodName(methodName: string): string {
    // Common patterns
    const patterns: Record<string, string> = {
      get: '/api/v1/resource',
      list: '/api/v1/resources',
      create: '/api/v1/resource',
      update: '/api/v1/resource/:id',
      delete: '/api/v1/resource/:id',
    };

    for (const [key, value] of Object.entries(patterns)) {
      if (methodName.toLowerCase().startsWith(key)) {
        return value;
      }
    }

    return `/api/v1/${methodName}`;
  }

  /**
   * Extract parameters from method signature
   */
  private extractParameters(method: ts.MethodDeclaration): any[] {
    const parameters: any[] = [];

    for (const param of method.parameters) {
      const name = param.name?.getText() ?? '';
      const type = this.checker.getTypeAtLocation(param.type!);
      const schema = this.schemaGenerator.convertTypeToSchema(type);

      // Determine parameter location
      let location: 'query' | 'header' | 'path' | 'cookie' = 'query';
      const jsDocTags = ts.getJSDocTags(param);
      for (const tag of jsDocTags) {
        if (tag.tagName.text === 'param') {
          const tagText = ts.getTextOfJSDocTag(tag);
          if (tagText.includes('header')) location = 'header';
          if (tagText.includes('path')) location = 'path';
          if (tagText.includes('cookie')) location = 'cookie';
        }
      }

      // Path parameters are required
      const required = location === 'path' || !param.questionToken;

      parameters.push({
        name,
        in: location,
        description: this.getParameterDescription(param),
        required,
        schema,
      });
    }

    return parameters;
  }

  /**
   * Get parameter description from JSDoc
   */
  private getParameterDescription(param: ts.ParameterDeclaration): string {
    const jsDocTags = ts.getJSDocTags(param);
    for (const tag of jsDocTags) {
      if (tag.tagName.text === 'param') {
        return ts.getTextOfJSDocTag(tag);
      }
    }
    return param.name?.getText() ?? '';
  }

  /**
   * Extract request body configuration
   */
  private extractRequestBody(method: ts.MethodDeclaration): any | null {
    // Look for a parameter that could be a request body
    for (const param of method.parameters) {
      const name = param.name?.getText() ?? '';
      const type = this.checker.getTypeAtLocation(param.type!);
      const schema = this.schemaGenerator.convertTypeToSchema(type);

      // Body parameters are typically objects
      if (schema.type === 'object' && name !== 'id' && name !== 'options') {
        return {
          description: `Request body for ${method.name?.getText()}`,
          contentType: 'application/json',
          schema,
        };
      }
    }

    return null;
  }

  /**
   * Extract response configurations
   */
  private extractResponses(method: ts.MethodDeclaration): any[] {
    const responses: any[] = [];

    // Get return type
    const returnType = this.checker.getTypeAtLocation(method);
    const returnSchema = this.schemaGenerator.convertTypeToSchema(returnType);

    // Success response
    responses.push({
      code: '200',
      description: 'Successful response',
      contentType: 'application/json',
      schema: returnSchema,
    });

    // Check for error responses in JSDoc
    const jsDocTags = ts.getJSDocTags(method);
    for (const tag of jsDocTags) {
      if (tag.tagName.text === 'throws') {
        const tagText = ts.getTextOfJSDocTag(tag);
        const match = tagText.match(/(\d+)\s+-\s+(.+)/);
        if (match) {
          responses.push({
            code: match[1],
            description: match[2],
            contentType: 'application/json',
            schema: { $ref: 'Error' },
          });
        }
      }
    }

    // Default error response
    responses.push({
      code: '500',
      description: 'Internal server error',
      contentType: 'application/json',
      schema: { $ref: 'Error' },
    });

    return responses;
  }

  /**
   * Generate example requests and responses
   */
  generateExamples(endpoint: EndpointConfig): CodeExample[] {
    const examples: CodeExample[] = [];

    // Generate cURL example
    examples.push(this.generateCurlExample(endpoint));

    // Generate JavaScript example
    examples.push(this.generateJavaScriptExample(endpoint));

    // Generate Python example
    examples.push(this.generatePythonExample(endpoint));

    return examples;
  }

  /**
   * Generate cURL example
   */
  private generateCurlExample(endpoint: EndpointConfig): CodeExample {
    let curl = `curl -X ${endpoint.method.toUpperCase()} \\
  "https://api.polln.ai${endpoint.path}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY"`;

    if (endpoint.requestBody) {
      const example = this.generateExampleFromSchema(endpoint.requestBody.schema);
      curl += ` \\\n  -d '${JSON.stringify(example, null, 2)}'`;
    }

    return {
      language: 'curl',
      title: `${endpoint.summary} (cURL)`,
      description: `Example request using cURL`,
      code: curl,
    };
  }

  /**
   * Generate JavaScript example
   */
  private generateJavaScriptExample(endpoint: EndpointConfig): CodeExample {
    let js = `const response = await fetch('https://api.polln.ai${endpoint.path}', {
  method: '${endpoint.method.toUpperCase()}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY',
  },`;

    if (endpoint.requestBody) {
      const example = this.generateExampleFromSchema(endpoint.requestBody.schema);
      js += `\n  body: JSON.stringify(${JSON.stringify(example, null, 2)}),`;
    }

    js += `\n});

const data = await response.json();
console.log(data);`;

    return {
      language: 'javascript',
      title: `${endpoint.summary} (JavaScript)`,
      description: `Example request using fetch API`,
      code: js,
    };
  }

  /**
   * Generate Python example
   */
  private generatePythonExample(endpoint: EndpointConfig): CodeExample {
    let python = `import requests

url = 'https://api.polln.ai${endpoint.path}'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY',
}`;

    if (endpoint.requestBody) {
      const example = this.generateExampleFromSchema(endpoint.requestBody.schema);
      python += `\ndata = ${JSON.stringify(example, null, 2)}\n`;
      python += `\nresponse = requests.${endpoint.method.toLowerCase()}(url, json=data, headers=headers)`;
    } else {
      python += `\nresponse = requests.${endpoint.method.toLowerCase()}(url, headers=headers)`;
    }

    python += `\n\nprint(response.json())`;

    return {
      language: 'python',
      title: `${endpoint.summary} (Python)`,
      description: `Example request using requests library`,
      code: python,
    };
  }

  /**
   * Generate example data from schema
   */
  private generateExampleFromSchema(schema: SchemaObject): any {
    if (schema.$ref) {
      // Return reference name
      return schema.$ref;
    }

    if (schema.example) {
      return schema.example;
    }

    if (schema.enum) {
      return schema.enum[0];
    }

    if (schema.const) {
      return schema.const;
    }

    switch (schema.type) {
      case 'string':
        return schema.format === 'uuid' ? '00000000-0000-0000-0000-000000000000' : 'string';
      case 'number':
      case 'integer':
        return schema.minimum ?? schema.default ?? 0;
      case 'boolean':
        return true;
      case 'array':
        return schema.items ? [this.generateExampleFromSchema(schema.items as SchemaObject)] : [];
      case 'object':
        if (schema.properties) {
          const obj: any = {};
          for (const [name, prop] of Object.entries(schema.properties)) {
            if (!(schema.required?.includes(name)) && (prop as SchemaObject).default === undefined) {
              continue; // Skip optional properties for brevity
            }
            obj[name] = this.generateExampleFromSchema(prop as SchemaObject);
          }
          return obj;
        }
        return {};
      default:
        return null;
    }
  }

  /**
   * Generate markdown documentation
   */
  generateMarkdown(endpoints: EndpointConfig[]): string {
    let markdown = '# API Documentation\n\n';

    // Group by tags
    const grouped = new Map<string, EndpointConfig[]>();
    for (const endpoint of endpoints) {
      const tag = endpoint.tags[0] || 'General';
      if (!grouped.has(tag)) {
        grouped.set(tag, []);
      }
      grouped.get(tag)!.push(endpoint);
    }

    // Generate sections
    for (const [tag, tagEndpoints] of grouped.entries()) {
      markdown += `## ${tag}\n\n`;

      for (const endpoint of tagEndpoints) {
        markdown += `### ${endpoint.summary}\n\n`;
        markdown += `${endpoint.description}\n\n`;

        markdown += `**Endpoint:** \`${endpoint.method.toUpperCase()} ${endpoint.path}\`\n\n`;

        if (endpoint.deprecated) {
          markdown += `> **Deprecated:** This endpoint is deprecated.\n\n`;
        }

        if (endpoint.parameters && endpoint.parameters.length > 0) {
          markdown += '#### Parameters\n\n';
          markdown += '| Name | Type | In | Required | Description |\n';
          markdown += '|------|------|-----|----------|-------------|\n';

          for (const param of endpoint.parameters) {
            const type = typeof param.schema === 'string' ? param.schema : JSON.stringify(param.schema.type);
            markdown += `| ${param.name} | \`${type}\` | ${param.in} | ${param.required ? 'Yes' : 'No'} | ${param.description} |\n`;
          }
          markdown += '\n';
        }

        if (endpoint.requestBody) {
          markdown += '#### Request Body\n\n';
          markdown += '```json\n';
          markdown += JSON.stringify(this.generateExampleFromSchema(endpoint.requestBody.schema), null, 2);
          markdown += '\n```\n\n';
        }

        markdown += '#### Responses\n\n';
        for (const response of endpoint.responses) {
          markdown += `- **${response.code}**: ${response.description}\n`;
        }
        markdown += '\n';

        markdown += '#### Example\n\n';
        const example = this.generateCurlExample(endpoint);
        markdown += '```bash\n' + example.code + '\n```\n\n';
        markdown += '---\n\n';
      }
    }

    return markdown;
  }
}
