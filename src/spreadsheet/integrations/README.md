# POLLN Integration Connectors

Pre-built integration connectors for external services. Enables POLLN cells to interact with Slack, Microsoft Teams, GitHub, PostgreSQL databases, and custom webhooks.

## Overview

The integration system provides:

- **Unified API** - Consistent interface across all connectors
- **Lifecycle Management** - Initialize, connect, disconnect, dispose
- **Rate Limiting** - Built-in rate limit tracking and enforcement
- **Error Handling** - Comprehensive error types and retry logic
- **Event Emission** - EventEmitter-based event system
- **Health Monitoring** - Health checks and metrics
- **Webhook Support** - Receive webhooks from external services
- **Security** - Signature verification and credential masking

## Installation

```bash
npm install pg  # For database connector
```

## Quick Start

```typescript
import {
  IntegrationManager,
  createSlackConnector,
  createGitHubConnector,
} from '@polln/spreadsheet/integrations';

// Create manager
const manager = new IntegrationManager();
await manager.initialize();

// Create and register Slack connector
const slack = createSlackConnector({
  id: 'slack-1',
  name: 'My Slack',
  apiToken: process.env.SLACK_API_TOKEN,
  defaultChannel: '#general',
});

await manager.registerIntegration(slack, slack.config);
await manager.connectIntegration('slack-1');

// Send a message
await manager.send('slack-1', 'message', {
  channel: '#general',
  text: 'Hello from POLLN!',
});
```

## Connectors

### Slack Connector

Send messages, handle slash commands, upload files, and monitor channels.

```typescript
import { createSlackConnector } from '@polln/spreadsheet/integrations';

const slack = createSlackConnector({
  id: 'slack-1',
  name: 'Slack Integration',
  apiToken: 'xoxb-your-token',
  signingSecret: 'your-signing-secret',
  defaultChannel: '#general',
});

// Send message
await slack.send('message', {
  channel: '#general',
  text: 'Hello!',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Hello* from POLLN!',
      },
    },
  ],
});

// Upload file
await slack.send('upload', {
  file: Buffer.from('Hello World'),
  filename: 'hello.txt',
  channels: ['#general'],
});

// Handle slash commands
slack.on('slashCommand', async (command) => {
  console.log('Command:', command.command, command.text);
});
```

### Microsoft Teams Connector

Send messages, adaptive cards, and handle bot framework interactions.

```typescript
import { createTeamsConnector } from '@polln/spreadsheet/integrations';

const teams = createTeamsConnector({
  id: 'teams-1',
  name: 'Teams Integration',
  appId: 'your-app-id',
  appPassword: 'your-app-password',
  tenantId: 'your-tenant-id',
});

// Send message
await teams.send('message', {
  conversationId: '19:...',
  text: 'Hello from POLLN!',
});

// Send adaptive card
await teams.send('card', {
  conversationId: '19:...',
  card: {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: 'Hello from POLLN!',
      },
    ],
  },
});
```

### GitHub Connector

Manage repositories, issues, pull requests, files, and workflows.

```typescript
import { createGitHubConnector } from '@polln/spreadsheet/integrations';

const github = createGitHubConnector({
  id: 'github-1',
  name: 'GitHub Integration',
  apiToken: process.env.GITHUB_TOKEN,
  defaultOwner: 'my-org',
  defaultRepo: 'my-repo',
});

// Get repository
const repo = await github.send('repo', {
  owner: 'octocat',
  repo: 'Hello-World',
});

// Create issue
const issue = await github.send('createIssue', {
  owner: 'octocat',
  repo: 'Hello-World',
  title: 'Issue from POLLN',
  body: 'This issue was created by POLLN',
  labels: ['bug', 'automation'],
});

// Create pull request
const pr = await github.send('createPR', {
  owner: 'octocat',
  repo: 'Hello-World',
  title: 'PR from POLLN',
  head: 'feature-branch',
  base: 'main',
  body: 'This PR was created by POLLN',
});

// Trigger workflow
await github.send('triggerWorkflow', {
  owner: 'octocat',
  repo: 'Hello-World',
  workflow: 'ci.yml',
  ref: 'main',
  inputs: { param1: 'value1' },
});
```

### Database Connector

Query PostgreSQL databases with a powerful query builder.

```typescript
import { createDatabaseConnector, QueryBuilder } from '@polln/spreadsheet/integrations';

const db = createDatabaseConnector({
  id: 'db-1',
  name: 'Production Database',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'user',
  password: 'password',
  poolSize: 20,
});

// Raw query
const result = await db.send('query', {
  text: 'SELECT * FROM users WHERE active = $1',
  parameters: [true],
});

// Query builder
const query = QueryBuilder.select('users')
  .where('active = $1', true)
  .orderBy('created_at', 'DESC')
  .limit(10);

const users = await db.send('select', {
  table: 'users',
  ...query.build(),
});

// Transaction
const tx = await db.send('transaction', {});
await tx.query('INSERT INTO logs (message) VALUES ($1)', ['Log message']);
await tx.commit();

// Streaming query
await db.send('stream', {
  text: 'SELECT * FROM large_table',
  onRow: (row) => {
    console.log('Received row:', row);
  },
});
```

### Webhook Receiver

Receive webhooks from external services with signature verification.

```typescript
import { WebhookReceiver } from '@polln/spreadsheet/integrations';

const receiver = new WebhookReceiver({
  port: 3000,
  path: '/webhook',
  secret: 'your-webhook-secret',
  verifySignature: true,
  replayPrevention: true,
});

await receiver.start();

// Register route
receiver.registerRoute('github-push', {
  integrationId: 'github-1',
  cellId: 'cell-1',
});

// Handle events
receiver.on('webhook:processed', (event) => {
  console.log('Webhook processed:', event.webhookId);
});

receiver.on('signature:invalid', (event) => {
  console.error('Invalid signature:', event.webhookId);
});
```

## Integration Manager

Central orchestration for all integrations.

```typescript
import { IntegrationManager } from '@polln/spreadsheet/integrations';

const manager = new IntegrationManager();
await manager.initialize();

// Register integrations
await manager.registerIntegration(slack, slack.config);
await manager.registerIntegration(github, github.config);

// Connect to services
await manager.connectIntegration('slack-1');
await manager.connectIntegration('github-1');

// Send operations
await manager.send('slack-1', 'message', { channel: '#general', text: 'Hello' });
await manager.send('github-1', 'createIssue', { title: 'New Issue' });

// Health checks
const health = await manager.checkAllHealth();
console.log('Health status:', health);

// Get metrics
const metrics = manager.getAllMetrics();
console.log('Metrics:', metrics);

// Event handling
manager.onIntegrationEvent((event) => {
  console.log('Integration event:', event.type, event.integrationId);
});

// Cleanup
await manager.dispose();
```

## Cell Mapping

Map external events to cells and cell outputs to operations.

```typescript
const config = {
  id: 'slack-1',
  name: 'Slack',
  type: IntegrationType.SLACK,
  enabled: true,
  credentials: { apiToken: '...' },
  cellMapping: {
    // Map events to cells
    eventToCell: {
      'message': 'cell-1',
      'slashCommand': 'cell-2',
      'webhook': 'cell-3',
    },
    // Map cell outputs to operations
    cellToOperation: {
      'cell-4': 'message',
      'cell-5': 'upload',
    },
    // Transform data
    transforms: {
      'message': (data) => ({
        channel: data.channel,
        text: JSON.stringify(data),
      }),
    },
  },
};
```

## Rate Limiting

Automatic rate limit tracking and enforcement.

```typescript
const config = {
  id: 'github-1',
  name: 'GitHub',
  type: IntegrationType.GITHUB,
  credentials: { apiToken: '...' },
  rateLimit: {
    maxRequests: 5000,
    windowMs: 3600000, // 1 hour
  },
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    retryableStatusCodes: [403, 429, 500, 502, 503, 504],
  },
};
```

## Webhook Signature Verification

Verify webhook signatures for security.

```typescript
import { GitHubConnector } from '@polln/spreadsheet/integrations';

// Verify GitHub webhook
const isValid = GitHubConnector.verifyWebhookSignature(
  payload,
  signature,
  secret
);

// Verify Slack webhook
import { SlackConnector } from '@polln/spreadsheet/integrations';

const isValid = SlackConnector.verifyRequestSignature(
  signingSecret,
  body,
  signature,
  timestamp
);
```

## Error Handling

Comprehensive error types and handling.

```typescript
import { ErrorCode, IntegrationError } from '@polln/spreadsheet/integrations';

try {
  await manager.send('github-1', 'createIssue', { title: 'Test' });
} catch (error: IntegrationError) {
  switch (error.code) {
    case ErrorCode.RATE_LIMITED:
      console.log('Rate limited, retry after:', error.retryDelay);
      break;
    case ErrorCode.UNAUTHORIZED:
      console.log('Invalid credentials');
      break;
    case ErrorCode.NETWORK_ERROR:
      console.log('Network error, will retry');
      break;
  }
}
```

## Security Best Practices

1. **Never hardcode credentials**
   ```typescript
   // ❌ Bad
   const apiToken = 'xoxb-hardcoded-token';

   // ✅ Good
   const apiToken = process.env.SLACK_API_TOKEN;
   ```

2. **Mask credentials in logs**
   ```typescript
   import { maskCredentials } from '@polln/spreadsheet/integrations';

   const masked = maskCredentials(config);
   console.log('Config:', masked);
   ```

3. **Use webhook signatures**
   ```typescript
   const receiver = new WebhookReceiver({
     secret: process.env.WEBHOOK_SECRET,
     verifySignature: true,
   });
   ```

4. **Validate configurations**
   ```typescript
   import { validateIntegrationConfig } from '@polln/spreadsheet/integrations';

   const validation = validateIntegrationConfig(config);
   if (!validation.valid) {
     console.error('Invalid config:', validation.errors);
   }
   ```

## Testing

```typescript
import { createSlackConnector } from '@polln/spreadsheet/integrations';

const slack = createSlackConnector({
  id: 'test-slack',
  name: 'Test Slack',
  apiToken: 'test-token',
});

// Test connection
await slack.connect();
const isConnected = slack.isConnected();

// Test operation
const result = await slack.send('message', {
  channel: '#test',
  text: 'Test message',
});

console.log('Result:', result.success, result.data);
```

## License

MIT
