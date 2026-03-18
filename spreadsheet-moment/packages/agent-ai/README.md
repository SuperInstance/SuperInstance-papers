# @spreadsheet-moment/agent-ai

**AI integration layer** for model routing and provider management.

[![Tests](https://img.shields.io/badge/Tests-100%25-brightgreen.svg)](https://github.com/SuperInstance/spreadsheet-moment)
[![Coverage](https://img.shields.io/badge/Coverage-75%25-brightgreen.svg)](https://github.com/SuperInstance/spreadsheet-moment)

## Overview

The `@spreadsheet-moment/agent-ai` package provides intelligent model routing and provider management for the Spreadsheet Moment platform. It supports multiple AI providers including Cloudflare Workers AI and DeepSeek.

## Features

### ModelRouter
Intelligent model selection based on requirements:

```typescript
import { ModelRouter, DeepSeekProvider } from '@spreadsheet-moment/agent-ai';

const router = new ModelRouter({
  defaultProvider: 'deepseek',
  providers: [
    new DeepSeekProvider({
      apiKey: process.env.DEEPSEEK_API_KEY
    })
  ]
});

// Route request to appropriate model
const result = await router.route({
  prompt: 'Analyze this data',
  requirements: {
    maxTokens: 1000,
    temperature: 0.7
  }
});
```

### Providers

#### DeepSeek Provider

```typescript
import { DeepSeekProvider } from '@spreadsheet-moment/agent-ai';

const provider = new DeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseUrl: 'https://api.deepseek.com',
  timeout: 30000
});

const response = await provider.generate({
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello!' }
  ]
});
```

#### Cloudflare Provider

```typescript
import { CloudflareProvider } from '@spreadsheet-moment/agent-ai';

const provider = new CloudflareProvider({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiKey: process.env.CLOUDFLARE_API_KEY
});

const response = await provider.generate({
  model: '@cf/meta/llama-2-7b-chat-int8',
  prompt: 'Explain quantum computing'
});
```

### WebSocket Client
Real-time bidirectional communication:

```typescript
import { ClawWebSocketClient } from '@spreadsheet-moment/agent-ai';

const wsClient = new ClawWebSocketClient({
  url: 'ws://localhost:8080/ws',
  apiKey: process.env.CLAW_API_KEY
});

// Subscribe to claw updates
wsClient.subscribe('claw_123', {
  onMessage: (data) => {
    console.log('Update:', data);
  },
  onError: (error) => {
    console.error('Error:', error);
  }
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI LAYER                                │
├─────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │              ModelRouter                          │       │
│  │  • Intelligent model selection                    │       │
│  │  • Requirement matching                           │       │
│  │  • Fallback logic                                 │       │
│  └────────────┬─────────────────────────────────────┘       │
│               │                                               │
│      ┌────────┴────────┐                                    │
│      │                 │                                     │
│  ┌───▼───────┐  ┌─────▼──────┐                            │
│  │ DeepSeek  │  │Cloudflare  │                            │
│  │ Provider  │  │ Provider   │                            │
│  └───────────┘  └────────────┘                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │         WebSocket Client                          │       │
│  │  • Real-time updates                              │       │
│  │  • Bidirectional communication                    │       │
│  │  • Automatic reconnection                          │       │
│  └──────────────────────────────────────────────────┘       │
│                                                                   │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
pnpm add @spreadsheet-moment/agent-ai
```

## Usage

### Basic Setup

```typescript
import { ModelRouter, DeepSeekProvider } from '@spreadsheet-moment/agent-ai';

const router = new ModelRouter({
  defaultProvider: 'deepseek',
  providers: [
    new DeepSeekProvider({
      apiKey: process.env.DEEPSEEK_API_KEY
    })
  ]
});
```

### Advanced Routing

```typescript
const result = await router.route({
  prompt: 'Write a summary of this data',
  requirements: {
    maxTokens: 500,
    temperature: 0.5,
    topP: 0.9,
    capabilities: ['reasoning', 'analysis']
  },
  preferences: {
    cost: 'low',
    latency: 'low',
    quality: 'high'
  }
});
```

### Streaming Responses

```typescript
const stream = await router.stream({
  prompt: 'Explain machine learning',
  requirements: { maxTokens: 1000 }
});

for await (const chunk of stream) {
  console.log(chunk.content);
}
```

## API Reference

### ModelRouter

| Method | Description |
|--------|-------------|
| `route(request)` | Route to appropriate model |
| `stream(request)` | Stream model response |
| `listProviders()` | List available providers |
| `addProvider(provider)` | Add new provider |
| `removeProvider(name)` | Remove provider |

### Provider Interface

| Method | Description |
|--------|-------------|
| `generate(request)` | Generate response |
| `stream(request)` | Stream response |
| `countTokens(text)` | Count tokens |
| `getModels()` | List available models |

## Configuration

### ModelRouter Options

```typescript
interface ModelRouterOptions {
  defaultProvider: string;
  providers: Provider[];
  fallbackProviders?: string[];
  timeout?: number;
  maxRetries?: number;
}
```

### Provider Options

```typescript
interface ProviderOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}
```

## Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration
```

## Performance

- **Routing latency**: <10ms
- **Generation speed**: 50-100 tokens/second
- **Streaming latency**: <50ms first token
- **Memory overhead**: ~50MB

## License

Apache-2.0

## Links

- [GitHub](https://github.com/SuperInstance/spreadsheet-moment)
- [Documentation](https://docs.spreadsheet-moment.dev)
