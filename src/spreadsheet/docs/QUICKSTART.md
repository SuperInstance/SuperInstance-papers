# Quick Start Guide - POLLN API Documentation Generator

Get up and running with the POLLN API Documentation Generator in 5 minutes.

## Installation

```bash
# Install as a dependency
npm install @polln/spreadsheet-docs

# Or use directly with npx
npx @polln/spreadsheet-docs generate
```

## Option 1: Using the CLI (Fastest)

### Generate Documentation

```bash
# Generate with default settings
npx polln-docs generate

# Custom output directory
npx polln-docs generate -o ./my-docs

# Customize API info
npx polln-docs generate \
  --title "My API" \
  --version "2.0.0" \
  --description "My custom API"
```

### View Documentation

```bash
# Start local server (opens browser automatically)
npx polln-docs serve --open

# Custom port
npx polln-docs serve -p 3000
```

### Validate Specification

```bash
# Validate generated spec
npx polln-docs validate -f ./docs/api/openapi.json
```

## Option 2: Using TypeScript (Most Flexible)

### Basic Setup

```typescript
import { createDocumentationGenerator } from '@polln/spreadsheet-docs';

const generator = createDocumentationGenerator({
  title: 'My API',
  version: '1.0.0',
  description: 'My awesome API',
});

await generator.exportToDirectory('./docs');
```

### With Custom Configuration

```typescript
import { createDocumentationGenerator } from '@polln/spreadsheet-docs';

const generator = createDocumentationGenerator({
  title: 'My API',
  version: '1.0.0',
  description: 'API description',
  servers: [
    { url: 'https://api.example.com', description: 'Production' },
    { url: 'http://localhost:8080', description: 'Development' },
  ],
  tags: [
    { name: 'Users', description: 'User operations' },
    { name: 'Posts', description: 'Post operations' },
  ],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
});

await generator.exportToDirectory('./docs');
```

## Option 3: Individual Components

### Generate OpenAPI Spec Only

```typescript
import { OpenAPISpecGenerator } from '@polln/spreadsheet-docs';

const generator = new OpenAPISpecGenerator({
  title: 'My API',
  version: '1.0.0',
  description: 'My API',
  servers: [{ url: 'https://api.example.com' }],
  tags: [],
  securitySchemes: {},
});

// Add custom endpoint
generator.addPath({
  path: '/api/v1/users',
  method: 'get',
  summary: 'List users',
  description: 'Get all users',
  tags: ['Users'],
  responses: [
    {
      code: '200',
      description: 'Success',
      contentType: 'application/json',
      schema: {
        type: 'array',
        items: { type: 'object' },
      },
    },
  ],
});

const spec = generator.generate();
console.log(spec.exportJSON());
```

### Generate WebSocket Docs Only

```typescript
import { WebSocketDocGenerator } from '@polln/spreadsheet-docs';

const generator = new WebSocketDocGenerator(
  'My WebSocket API',
  '1.0.0',
  'Real-time events'
);

generator.addEvent({
  channel: 'users/{userId}',
  direction: 'subscribe',
  summary: 'User updated',
  description: 'Emitted when user data changes',
  message: {
    name: 'UserUpdated',
    payload: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        name: { type: 'string' },
      },
    },
  },
});

const spec = generator.generate();
console.log(spec.exportJSON());
```

### Generate Code Examples

```typescript
import { CodeExampleGenerator } from '@polln/spreadsheet-docs';

const generator = new CodeExampleGenerator('https://api.example.com');

const examples = generator.generateForEndpoint({
  path: '/api/v1/users',
  method: 'post',
  summary: 'Create user',
  description: 'Create a new user',
  tags: ['Users'],
  requestBody: {
    description: 'User data',
    contentType: 'application/json',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
  },
  responses: [
    {
      code: '201',
      description: 'User created',
      contentType: 'application/json',
      schema: { type: 'object' },
    },
  ],
});

// Get cURL example
const curl = examples.find(e => e.language === 'curl');
console.log(curl?.code);
```

## Output Files

After running the generator, you'll get:

```
docs/api/
├── openapi.json       # OpenAPI specification (JSON)
├── openapi.yaml       # OpenAPI specification (YAML)
├── asyncapi.json      # AsyncAPI specification (JSON)
├── asyncapi.yaml      # AsyncAPI specification (YAML)
├── README.md          # Markdown documentation
└── index.html         # HTML documentation
```

## Viewing the Documentation

### Option 1: CLI Server

```bash
npx polln-docs serve --open
```

### Option 2: Python HTTP Server

```bash
cd docs/api
python -m http.server 8080
# Open http://localhost:8080
```

### Option 3: Node.js HTTP Server

```bash
npx http-server docs/api -p 8080 -o
```

### Option 4: VS Code Live Server

1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

## Common Tasks

### Add Custom Endpoint

```typescript
generator.addPath({
  path: '/api/v1/custom',
  method: 'post',
  summary: 'Custom operation',
  description: 'Does something custom',
  tags: ['Custom'],
  requestBody: {
    description: 'Request body',
    contentType: 'application/json',
    schema: { type: 'object' },
  },
  responses: [
    {
      code: '200',
      description: 'Success',
      contentType: 'application/json',
      schema: { type: 'object' },
    },
  ],
});
```

### Add Custom Schema

```typescript
generator.addSchema('MyCustomType', {
  type: 'object',
  description: 'My custom type',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    value: { type: 'number' },
  },
  required: ['id', 'name'],
});
```

### Add WebSocket Event

```typescript
wsGenerator.addEvent({
  channel: 'events',
  direction: 'subscribe',
  summary: 'Event occurred',
  description: 'Emitted when something happens',
  message: {
    name: 'MyEvent',
    payload: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        data: { type: 'object' },
      },
    },
  },
});
```

## Next Steps

1. **Customize Configuration**
   - Edit `polln.docs.config.json` or pass config options
   - Add your servers, tags, and security schemes

2. **Add Your Endpoints**
   - Use `generator.addPath()` for each endpoint
   - Reference schemas using `{ $ref: 'SchemaName' }`

3. **Add Your Schemas**
   - Use `generator.addSchema()` for data models
   - Use `$ref` to reference schemas in endpoints

4. **Add WebSocket Events**
   - Use `wsGenerator.addEvent()` for real-time events
   - Define message payloads and examples

5. **Generate and Test**
   - Run `npx polln-docs generate`
   - Test with `npx polln-docs serve`
   - Validate with `npx polln-docs validate`

## Troubleshooting

### "Cannot find module"

Make sure you're using the correct import:
```typescript
// Correct
import { createDocumentationGenerator } from '@polln/spreadsheet-docs';

// Wrong
import { createDocumentationGenerator } from 'polln-spreadsheet-docs';
```

### "Port already in use"

Use a different port:
```bash
npx polln-docs serve -p 3001
```

### "Schema not found"

Make sure you add schemas before referencing them:
```typescript
// Add schema first
generator.addSchema('MyType', { ... });

// Then reference it
generator.addPath({
  // ...
  requestBody: {
    schema: { $ref: 'MyType' }, // Now it works!
  },
});
```

## Resources

- **Full Documentation:** `README.md`
- **Implementation Details:** `IMPLEMENTATION_SUMMARY.md`
- **Examples:** `examples/` directory
- **Type Definitions:** `types.ts`

## Support

Need help? Open an issue at:
https://github.com/SuperInstance/polln/issues

---

Happy documenting! 🚀
