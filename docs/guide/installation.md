# Installation

Learn how to install and configure POLLN in your project.

## Prerequisites

Before installing POLLN, ensure you have:

- **Node.js** version 18.0.0 or higher
- **npm** version 8.0.0 or higher (comes with Node.js)
- **TypeScript** version 5.0 or higher (if using TypeScript)

Check your versions:

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v8.0.0 or higher
tsc --version   # Should be v5.0 or higher
```

## Installation Methods

### npm (Recommended)

Install POLLN using npm:

```bash
npm install polln
```

### yarn

If you prefer yarn:

```bash
yarn add polln
```

### pnpm

For pnpm users:

```bash
pnpm add polln
```

## Development Dependencies

For TypeScript projects, install type definitions:

```bash
npm install --save-dev @types/node@^22.10.6
```

## Optional Dependencies

POLLN has optional features that require additional packages:

### Spreadsheet Export/Import

```bash
npm install xlsx pdfkit jspdf
```

### Full Features

```bash
npm install polln
npm install xlsx pdfkit jspdf @tensorflow/tfjs
```

## Configuration

### TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Environment Variables

Create a `.env` file in your project root:

```env
# POLLN Configuration
POLLN_LOG_LEVEL=info
POLLN_COLONY_SIZE=10
POLLN_MAX_AGENTS=100

# Optional: LLM Configuration
# DEEPSEEK_API_KEY=your_api_key_here
# OPENAI_API_KEY=your_api_key_here

# Optional: Redis (for distributed colonies)
# REDIS_URL=redis://localhost:6379

# Optional: Monitoring
# PROMETHEUS_PORT=9090
# JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

### Package.json Scripts

Add useful scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

## Verification

Create a test file `test-polln.ts`:

```typescript
import { Colony, LogCell } from 'polln'

async function testPolln() {
  const colony = new Colony('test')
  const cell = new LogCell('test-cell', { initialValue: 'Hello POLLN!' })

  colony.addCell(cell)
  await colony.start()

  console.log('POLLN is working!', cell.state.value)

  await colony.stop()
}

testPolln().catch(console.error)
```

Run it:

```bash
npx tsx test-polln.ts
```

## Docker Installation

For containerized environments:

```bash
# Pull the official image
docker pull ghcr.io/superinstance/polln:latest

# Or build from source
docker build -t polln .
```

### Docker Compose

```yaml
version: '3.8'
services:
  polln:
    image: ghcr.io/superinstance/polln:latest
    ports:
      - "3000:3000"
    environment:
      - POLLN_LOG_LEVEL=info
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Common Issues

### Issue: "Cannot find module 'polln'"

**Solution**: Make sure you're in the right directory and dependencies are installed:

```bash
npm install
```

### Issue: TypeScript compilation errors

**Solution**: Ensure your `tsconfig.json` is configured correctly (see above).

### Issue: Port already in use

**Solution**: Change the port in your environment variables:

```env
POLLN_PORT=3001
```

## Next Steps

After installation:

1. Read the [Quick Start Guide](./quick-start)
2. Explore [Core Concepts](./concepts/)
3. Check out [Examples](../../examples/)

## Uninstallation

To remove POLLN:

```bash
npm uninstall polln
```

And remove any configuration files you created.

---

**Need help?** Join our [Discord community](https://discord.gg/polln) or check the [troubleshooting guide](../advanced/troubleshooting).
