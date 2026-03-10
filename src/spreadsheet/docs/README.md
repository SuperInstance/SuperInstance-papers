# POLLN Spreadsheet API Documentation Generator

Comprehensive OpenAPI 3.1 and AsyncAPI 2.0 documentation generation for the POLLN Spreadsheet API.

## Features

- **OpenAPI 3.1 Specification**: Full compliance with the latest OpenAPI specification
- **AsyncAPI 2.0 Support**: Complete WebSocket event documentation
- **JSDoc Parsing**: Extract documentation from TypeScript source code
- **Type Schema Generation**: Convert TypeScript types to JSON Schema
- **Code Examples**: Auto-generate examples in JavaScript, Python, and cURL
- **Multiple Output Formats**: JSON, YAML, Markdown, and HTML
- **HTML Templates**: Beautiful documentation pages with multiple themes
- **CLI Tool**: Easy-to-use command-line interface
- **TypeScript**: Written in TypeScript with full type safety

## Installation

```bash
npm install @polln/spreadsheet-docs
```

## Quick Start

### Using the CLI

```bash
# Generate documentation
npx polln-docs generate

# Specify output directory
npx polln-docs generate -o ./docs/api

# Customize title and version
npx polln-docs generate -t "My API" -v "2.0.0"

# Serve documentation locally
npx polln-docs serve -p 8080

# Validate OpenAPI spec
npx polln-docs validate -f ./openapi.json
```

### Using the API

```typescript
import { createDocumentationGenerator } from '@polln/spreadsheet-docs';

const generator = createDocumentationGenerator({
  title: 'POLLN Spreadsheet API',
  version: '1.0.0',
  description: 'API for living spreadsheet cells',
  servers: [
    { url: 'https://api.polln.ai', description: 'Production' },
  ],
});

// Export to directory
await generator.exportToDirectory('./docs/api');
```

## Components

### OpenAPISpecGenerator

Generates OpenAPI 3.1 specifications for REST API endpoints.

```typescript
import { OpenAPISpecGenerator } from '@polln/spreadsheet-docs';

const generator = new OpenAPISpecGenerator({
  title: 'My API',
  version: '1.0.0',
  description: 'API description',
  servers: [{ url: 'https://api.example.com' }],
  tags: [{ name: 'Endpoints' }],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
    },
  },
});

generator.addCommonSchemas();
generator.addCommonEndpoints();

const spec = generator.generate();
console.log(spec.exportJSON());
```

### WebSocketDocGenerator

Generates AsyncAPI 2.0 specifications for WebSocket events.

```typescript
import { WebSocketDocGenerator } from '@polln/spreadsheet-docs';

const generator = new WebSocketDocGenerator(
  'My WebSocket API',
  '1.0.0',
  'Real-time events'
);

generator.addCommonEvents();

const spec = generator.generate();
console.log(spec.exportJSON());
```

### TypeSchemaGenerator

Converts TypeScript types to JSON Schema.

```typescript
import { TypeSchemaGenerator } from '@polln/spreadsheet-docs';

const generator = new TypeSchemaGenerator(['./src/**/*.ts']);

const schema = generator.generateSchemaFromTypeName('LogCell');
console.log(schema);
```

### APIDocumenter

Extracts JSDoc comments and endpoint documentation.

```typescript
import { APIDocumenter } from '@polln/spreadsheet-docs';

const documenter = new APIDocumenter(process.cwd(), ['./src/api/**/*.ts']);

const endpoints = documenter.extractEndpoints('./src/api/controllers.ts');
const markdown = documenter.generateMarkdown(endpoints);
```

### CodeExampleGenerator

Generates code examples in multiple languages.

```typescript
import { CodeExampleGenerator } from '@polln/spreadsheet-docs';

const generator = new CodeExampleGenerator('https://api.example.com');

const examples = generator.generateForEndpoint(endpointConfig);
```

## API Documentation Structure

### Schemas

The following schemas are included by default:

- **LogCell**: A living spreadsheet cell with sensation, memory, and agency
- **CellPosition**: Position of a cell in the spreadsheet
- **CellSensation**: Sensory input from other cells
- **CellMemory**: Cell memory state
- **CellReasoning**: Cell reasoning trace
- **Spreadsheet**: A collection of living cells
- **Colony**: A colony of coordinated cells
- **ColonyStats**: Colony statistics
- **Error**: Error response

### Endpoints

Default REST API endpoints:

- `GET /api/v1/spreadsheets` - List all spreadsheets
- `POST /api/v1/spreadsheets` - Create a spreadsheet
- `GET /api/v1/spreadsheets/{spreadsheetId}/cells` - List cells
- `GET /api/v1/spreadsheets/{spreadsheetId}/cells/{cellId}` - Get cell details
- `POST /api/v1/spreadsheets/{spreadsheetId}/cells` - Create a cell
- `PUT /api/v1/spreadsheets/{spreadsheetId}/cells/{cellId}` - Update a cell
- `GET /api/v1/colonies` - List colonies
- `GET /api/v1/colonies/{colonyId}/stats` - Get colony statistics

### WebSocket Events

Default WebSocket events:

- `CellUpdated` - Cell value changed
- `CellSensation` - Cell detected a change
- `ColonyStats` - Colony statistics update
- `AgentLifecycle` - Agent spawned/activated/deactivated
- `DreamEpisode` - Colony generated a dream

## Output Formats

### JSON

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "POLLN Spreadsheet API",
    "version": "1.0.0"
  },
  "paths": {}
}
```

### YAML

```yaml
openapi: 3.1.0
info:
  title: POLLN Spreadsheet API
  version: 1.0.0
paths: {}
```

### Markdown

```markdown
# API Documentation

## Endpoints

### Cells

#### List all cells
**Endpoint:** `GET /api/v1/spreadsheets/{spreadsheetId}/cells`

...
```

### HTML

Beautiful, responsive documentation pages with:
- ReDoc theme
- Swagger UI theme
- Elements theme
- Custom theme

## Configuration

Create a `polln.docs.config.json` file:

```json
{
  "title": "My API",
  "version": "1.0.0",
  "description": "API description",
  "servers": [
    { "url": "https://api.example.com", "description": "Production" }
  ],
  "tags": [
    { "name": "Cells", "description": "Cell operations" }
  ],
  "securitySchemes": {
    "bearerAuth": {
      "type": "http",
      "scheme": "bearer"
    }
  }
}
```

## CLI Commands

### generate

Generate API documentation.

```bash
polln-docs generate [options]

Options:
  -o, --output <dir>      Output directory (default: ./docs/api)
  -t, --title <title>     API title
  -v, --version <version> API version
  -d, --description <desc> API description
  -s, --servers <urls...> API server URLs
  --format <format...>    Output formats (default: json,yaml,markdown,html)
```

### validate

Validate OpenAPI specification.

```bash
polln-docs validate [options]

Options:
  -f, --file <path>       Path to OpenAPI spec file (default: ./openapi.json)
```

### serve

Start a local documentation server.

```bash
polln-docs serve [options]

Options:
  -p, --port <port>       Port number (default: 8080)
  -d, --dir <dir>         Documentation directory (default: ./docs/api)
  -o, --open              Open browser automatically
```

### init

Initialize documentation configuration.

```bash
polln-docs init [options]

Options:
  -o, --output <file>     Config file path (default: ./polln.docs.config.json)
```

## TypeScript Types

Full TypeScript definitions are included:

```typescript
import type {
  OpenAPIDocument,
  InfoObject,
  SchemaObject,
  EndpointConfig,
  WebSocketEventConfig,
  // ... and more
} from '@polln/spreadsheet-docs';
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/SuperInstance/polln/issues
- Email: support@polln.ai

---

Generated with ❤️ by POLLN
