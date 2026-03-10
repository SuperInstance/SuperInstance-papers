/**
 * Code Example Generator
 * Generates usage examples in multiple languages for API documentation
 */

import type {
  SchemaObject,
  EndpointConfig,
  CodeExample,
  WebSocketEventConfig,
} from './types.js';

export class CodeExampleGenerator {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = 'https://api.polln.ai', apiKey: string = 'YOUR_API_KEY') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Generate all code examples for an endpoint
   */
  generateForEndpoint(endpoint: EndpointConfig): CodeExample[] {
    const examples: CodeExample[] = [];

    examples.push(this.generateCurl(endpoint));
    examples.push(this.generateJavaScript(endpoint));
    examples.push(this.generateTypeScript(endpoint));
    examples.push(this.generatePython(endpoint));
    examples.push(this.generateNodeFetch(endpoint));

    return examples;
  }

  /**
   * Generate cURL example
   */
  generateCurl(endpoint: EndpointConfig): CodeExample {
    let curl = `curl -X ${endpoint.method.toUpperCase()} \\\n`;
    curl += `  "${this.baseUrl}${endpoint.path}" \\\n`;
    curl += `  -H "Content-Type: application/json" \\\n`;
    curl += `  -H "Authorization: Bearer ${this.apiKey}"`;

    // Add query parameters
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query');
    if (queryParams && queryParams.length > 0) {
      const params = queryParams
        .map(p => `${p.name}=${this.exampleValueForType(p.schema)}`)
        .join('&');
      curl = `curl -X ${endpoint.method.toUpperCase()} \\\n`;
      curl += `  "${this.baseUrl}${endpoint.path}?${params}" \\\n`;
      curl += `  -H "Authorization: Bearer ${this.apiKey}"`;
    }

    // Add request body
    if (endpoint.requestBody) {
      const bodyExample = this.generateExampleFromSchema(endpoint.requestBody.schema);
      curl += ` \\\n  -d '${JSON.stringify(bodyExample, null, 2)}'`;
    }

    return {
      language: 'curl',
      title: `${endpoint.summary} (cURL)`,
      description: 'Example using cURL command-line tool',
      code: curl,
    };
  }

  /**
   * Generate JavaScript (fetch) example
   */
  generateJavaScript(endpoint: EndpointConfig): CodeExample {
    let js = `fetch('${this.baseUrl}${endpoint.path}', {\n`;
    js += `  method: '${endpoint.method.toUpperCase()}',\n`;
    js += `  headers: {\n`;
    js += `    'Content-Type': 'application/json',\n`;
    js += `    'Authorization': 'Bearer ${this.apiKey}',\n`;
    js += `  },`;

    // Add query parameters
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query');
    if (queryParams && queryParams.length > 0) {
      const params = queryParams
        .map(p => `${p.name}=${this.exampleValueForType(p.schema)}`)
        .join('&');
      js = `fetch('${this.baseUrl}${endpoint.path}?${params}', {\n`;
      js += `  method: '${endpoint.method.toUpperCase()}',\n`;
      js += `  headers: {\n`;
      js += `    'Authorization': 'Bearer ${this.apiKey}',\n`;
      js += `  },`;
    }

    // Add request body
    if (endpoint.requestBody) {
      const bodyExample = this.generateExampleFromSchema(endpoint.requestBody.schema);
      js += `\n  body: JSON.stringify(${JSON.stringify(bodyExample, null, 2)}),`;
    }

    js += `\n})\n`;
    js += `.then(response => response.json())\n`;
    js += `.then(data => console.log(data))\n`;
    js += `.catch(error => console.error('Error:', error));`;

    return {
      language: 'javascript',
      title: `${endpoint.summary} (JavaScript)`,
      description: 'Example using Fetch API',
      code: js,
    };
  }

  /**
   * Generate TypeScript example
   */
  generateTypeScript(endpoint: EndpointConfig): CodeExample {
    let ts = `interface RequestOptions {\n`;
    ts += `  method: string;\n`;
    ts += `  headers: Record<string, string>;\n`;

    if (endpoint.requestBody) {
      ts += `  body?: string;\n`;
    }

    ts += `}\n\n`;

    // Add request type
    if (endpoint.requestBody) {
      ts += this.generateTypeInterface(endpoint.requestBody.schema, 'RequestBody');
    }

    // Add response type
    if (endpoint.responses.length > 0) {
      ts += this.generateTypeInterface(endpoint.responses[0].schema, 'ResponseBody');
    }

    ts += `\nasync function ${this.toCamelCase(endpoint.summary)}(): Promise<ResponseBody> {\n`;
    ts += `  const options: RequestOptions = {\n`;
    ts += `    method: '${endpoint.method.toUpperCase()}',\n`;
    ts += `    headers: {\n`;
    ts += `      'Content-Type': 'application/json',\n`;
    ts += `      'Authorization': 'Bearer ${this.apiKey}',\n`;
    ts += `    },\n`;
    ts += `  };\n\n`;

    if (endpoint.requestBody) {
      const bodyExample = this.generateExampleFromSchema(endpoint.requestBody.schema);
      ts += `  const body: RequestBody = ${JSON.stringify(bodyExample, null, 2)};\n`;
      ts += `  options.body = JSON.stringify(body);\n\n`;
    }

    ts += `  const response = await fetch('${this.baseUrl}${endpoint.path}', options);\n`;
    ts += `  if (!response.ok) {\n`;
    ts += `    throw new Error(\`HTTP error! status: \${response.status}\`);\n`;
    ts += `  }\n`;
    ts += `  return await response.json();\n`;
    ts += `}\n\n`;
    ts += `// Usage\n`;
    ts += `${this.toCamelCase(endpoint.summary)}().then(data => console.log(data));`;

    return {
      language: 'typescript',
      title: `${endpoint.summary} (TypeScript)`,
      description: 'TypeScript example with type definitions',
      code: ts,
    };
  }

  /**
   * Generate Python (requests) example
   */
  generatePython(endpoint: EndpointConfig): CodeExample {
    let py = `import requests\n\n`;

    // Add request body type
    if (endpoint.requestBody) {
      py += `from typing import Dict, Any\n\n`;
      const bodyExample = this.generateExampleFromSchema(endpoint.requestBody.schema);
      py += `data: Dict[str, Any] = ${JSON.stringify(bodyExample, null, 2)}\n\n`;
    }

    py += `url = '${this.baseUrl}${endpoint.path}'\n`;
    py += `headers = {\n`;
    py += `    'Content-Type': 'application/json',\n`;
    py += `    'Authorization': 'Bearer ${this.apiKey}',\n`;
    py += `}\n\n`;

    // Add query parameters
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query');
    if (queryParams && queryParams.length > 0) {
      const params = queryParams
        .map(p => `    '${p.name}': ${this.pythonExampleValueForType(p.schema)}`)
        .join(',\n');
      py += `params = {\n${params}\n}\n\n`;
    }

    py += `try:\n`;
    py += `    response = requests.${endpoint.method.toLowerCase()}(`;

    if (queryParams && queryParams.length > 0) {
      py += `url, params=params, `;
    } else {
      py += `url, `;
    }

    if (endpoint.requestBody) {
      py += `json=data, `;
    }

    py += `headers=headers)\n`;
    py += `    response.raise_for_status()\n`;
    py += `    result = response.json()\n`;
    py += `    print(result)\n`;
    py += `except requests.exceptions.HTTPError as err:\n`;
    py += `    print(f'HTTP Error: {err}')\n`;
    py += `except requests.exceptions.RequestException as err:\n`;
    py += `    print(f'Request Error: {err}')`;

    return {
      language: 'python',
      title: `${endpoint.summary} (Python)`,
      description: 'Python example using requests library',
      code: py,
    };
  }

  /**
   * Generate Node.js fetch example
   */
  generateNodeFetch(endpoint: EndpointConfig): CodeExample {
    let node = `const fetch = require('node-fetch');\n\n`;

    // Add request body type
    if (endpoint.requestBody) {
      const bodyExample = this.generateExampleFromSchema(endpoint.requestBody.schema);
      node += `const body = ${JSON.stringify(bodyExample, null, 2)};\n\n`;
    }

    node += `async function makeRequest() {\n`;
    node += `  try {\n`;
    node += `    const response = await fetch('${this.baseUrl}${endpoint.path}', {\n`;
    node += `      method: '${endpoint.method.toUpperCase()}',\n`;
    node += `      headers: {\n`;
    node += `        'Content-Type': 'application/json',\n`;
    node += `        'Authorization': 'Bearer ${this.apiKey}',\n`;
    node += `      },`;

    if (endpoint.requestBody) {
      node += `\n      body: JSON.stringify(body),`;
    }

    node += `\n    });\n\n`;
    node += `    if (!response.ok) {\n`;
    node += `      throw new Error(\`HTTP error! status: \${response.status}\`);\n`;
    node += `    }\n\n`;
    node += `    const data = await response.json();\n`;
    node += `    console.log(data);\n`;
    node += `    return data;\n`;
    node += `  } catch (error) {\n`;
    node += `    console.error('Error:', error);\n`;
    node += `  }\n`;
    node += `}\n\n`;
    node += `makeRequest();`;

    return {
      language: 'javascript',
      title: `${endpoint.summary} (Node.js)`,
      description: 'Node.js example using node-fetch',
      code: node,
    };
  }

  /**
   * Generate WebSocket example
   */
  generateWebSocket(event: WebSocketEventConfig): CodeExample {
    let js = `const ws = new WebSocket('wss://api.polln.ai/ws');\n\n`;

    js += `ws.onopen = () => {\n`;
    js += `  console.log('Connected to WebSocket');\n\n`;

    if (event.direction === 'publish') {
      const messageExample = this.generateExampleFromSchema(event.message.payload);
      js += `  // Send ${event.message.name} event\n`;
      js += `  ws.send(JSON.stringify({\n`;
      js += `    type: '${event.message.name}',\n`;
      js += `    payload: ${JSON.stringify(messageExample, null, 2)},\n`;
      js += `    timestamp: Date.now(),\n`;
      js += `  }));\n`;
    } else {
      js += `  // Subscribe to ${event.message.name} events\n`;
      js += `  ws.send(JSON.stringify({\n`;
      js += `    type: 'subscribe',\n`;
      js += `    channel: '${event.channel}',\n`;
      js += `  }));\n`;
    }

    js += `};\n\n`;

    js += `ws.onmessage = (event) => {\n`;
    js += `  const message = JSON.parse(event.data);\n`;
    js += `  console.log('Received:', message);\n`;
    js += `};\n\n`;

    js += `ws.onerror = (error) => {\n`;
    js += `  console.error('WebSocket error:', error);\n`;
    js += `};\n\n`;

    js += `ws.onclose = () => {\n`;
    js += `  console.log('WebSocket connection closed');\n`;
    js += `};`;

    return {
      language: 'websocket',
      title: `${event.message.name} (WebSocket)`,
      description: event.description,
      code: js,
    };
  }

  /**
   * Generate Python WebSocket example
   */
  generatePythonWebSocket(event: WebSocketEventConfig): CodeExample {
    let py = `import websocket\n`;
    py += `import json\n\n`;

    py += `def on_message(ws, message):\n`;
    py += `    data = json.loads(message)\n`;
    py += `    print(f"Received: {data}")\n\n`;

    py += `def on_error(ws, error):\n`;
    py += `    print(f"Error: {error}")\n\n`;

    py += `def on_close(ws, close_status_code, close_msg):\n`;
    py += `    print("Connection closed")\n\n`;

    py += `def on_open(ws):\n`;
    py += `    print("Connected to WebSocket")\n\n`;

    if (event.direction === 'publish') {
      const messageExample = this.generateExampleFromSchema(event.message.payload);
      py += `    # Send ${event.message.name} event\n`;
      py += `    ws.send(json.dumps({\n`;
      py += `        'type': '${event.message.name}',\n`;
      py += `        'payload': ${JSON.stringify(messageExample, null, 2)},\n`;
      py += `        'timestamp': int(time.time() * 1000),\n`;
      py += `    }))\n`;
    } else {
      py += `    # Subscribe to ${event.message.name} events\n`;
      py += `    ws.send(json.dumps({\n`;
      py += `        'type': 'subscribe',\n`;
      py += `        'channel': '${event.channel}',\n`;
      py += `    }))\n`;
    }

    py += `\nif __name__ == "__main__":\n`;
    py += `    import time\n`;
    py += `    ws = websocket.WebSocketApp(\n`;
    py += `        'wss://api.polln.ai/ws',\n`;
    py += `        on_open=on_open,\n`;
    py += `        on_message=on_message,\n`;
    py += `        on_error=on_error,\n`;
    py += `        on_close=on_close,\n`;
    py += `    )\n`;
    py += `    ws.run_forever()`;

    return {
      language: 'python',
      title: `${event.message.name} (WebSocket)`,
      description: event.description,
      code: py,
    };
  }

  /**
   * Generate example data from schema
   */
  private generateExampleFromSchema(schema: SchemaObject | string): any {
    if (typeof schema === 'string') {
      return { $ref: schema };
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

    if (schema.$ref) {
      return { $ref: schema.$ref };
    }

    switch (schema.type) {
      case 'string':
        if (schema.format === 'uuid') {
          return '550e8400-e29b-41d4-a716-446655440000';
        }
        if (schema.format === 'date-time') {
          return '2024-01-01T00:00:00.000Z';
        }
        if (schema.format === 'email') {
          return 'user@example.com';
        }
        return schema.example || 'example string';
      case 'number':
      case 'integer':
        return schema.default ?? schema.minimum ?? 0;
      case 'boolean':
        return true;
      case 'array':
        if (schema.items) {
          return [this.generateExampleFromSchema(schema.items as SchemaObject)];
        }
        return [];
      case 'object':
        if (schema.properties) {
          const obj: any = {};
          for (const [name, prop] of Object.entries(schema.properties)) {
            if (!schema.required?.includes(name)) {
              continue; // Skip optional properties
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
   * Generate TypeScript interface from schema
   */
  private generateTypeInterface(schema: SchemaObject | string, name: string): string {
    if (typeof schema === 'string') {
      return `export type ${name} = any; // ${schema}\n`;
    }

    let ts = `export interface ${name} {\n`;

    if (schema.type === 'object' && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const optional = !schema.required?.includes(propName);
        const propType = this.tsTypeFromSchema(propSchema as SchemaObject);
        ts += `  ${propName}${optional ? '?' : ''}: ${propType};\n`;
      }
    } else {
      ts = `export type ${name} = ${this.tsTypeFromSchema(schema)};\n`;
    }

    return ts + '}\n';
  }

  /**
   * Get TypeScript type from schema
   */
  private tsTypeFromSchema(schema: SchemaObject): string {
    if (schema.$ref) {
      return schema.$ref.replace('#/components/schemas/', '');
    }

    switch (schema.type) {
      case 'string':
        return schema.format === 'uuid' ? 'string' : 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        if (schema.items) {
          const itemType = this.tsTypeFromSchema(schema.items as SchemaObject);
          return `${itemType}[]`;
        }
        return 'any[]';
      case 'object':
        return 'Record<string, any>';
      default:
        return 'any';
    }
  }

  /**
   * Get example value for a type (cURL format)
   */
  private exampleValueForType(schema: SchemaObject | string): string {
    if (typeof schema === 'string') {
      return 'value';
    }

    if (schema.enum) {
      return schema.enum[0];
    }

    switch (schema.type) {
      case 'string':
        return schema.example || 'value';
      case 'number':
      case 'integer':
        return String(schema.default ?? schema.minimum ?? 0);
      case 'boolean':
        return 'true';
      default:
        return 'value';
    }
  }

  /**
   * Get Python example value for a type
   */
  private pythonExampleValueForType(schema: SchemaObject | string): string {
    if (typeof schema === 'string') {
      return "'value'";
    }

    if (schema.enum) {
      return `'${schema.enum[0]}'`;
    }

    switch (schema.type) {
      case 'string':
        return `'${schema.example || 'value'}'`;
      case 'number':
      case 'integer':
        return String(schema.default ?? schema.minimum ?? 0);
      case 'boolean':
        return 'True';
      default:
        return "'value'";
    }
  }

  /**
   * Convert to camelCase
   */
  private toCamelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }
}
