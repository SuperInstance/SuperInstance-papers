# Claw Cell User Guide

## Introduction

Claw cells are AI-powered cellular agents that bring intelligent automation to your spreadsheet. Each Claw agent operates within a cell and can reason, learn, and take actions based on your configuration.

## What is a Claw Cell?

A Claw cell is a special type of cell that contains an AI agent instead of a static value or formula. Claw agents can:

- **Reason** about data and make intelligent decisions
- **Learn** from patterns and improve over time
- **Act** on your behalf with human-in-the-loop approval
- **Coordinate** with other Claw agents for complex workflows

## Getting Started

### Creating Your First Claw Agent

1. **Select a cell** - Click on any empty cell in your spreadsheet
2. **Open Claw configuration** - Click the "Create Claw" button in the toolbar or use the keyboard shortcut `Ctrl+Shift+C`
3. **Configure your agent** - Fill in the basic configuration:
   - **Name**: A descriptive name for your agent
   - **Purpose**: What you want the agent to do
   - **Model**: The AI model to use (DeepSeek, Cloudflare, etc.)
   - **Equipment**: Capabilities to enable

4. **Save** - Click "Save Configuration" to create the agent

### Basic Configuration

#### Agent Name
Give your agent a clear, descriptive name. This helps you identify agents in the status bar and management panel.

Example names:
- "Temperature Monitor"
- "Sales Analyzer"
- "Data Validator"
- "Report Generator"

#### Purpose
Describe what the agent should do in natural language. Be specific about:
- What data to monitor
- What conditions to check
- What actions to take

Example purposes:
- "Monitor cell B2 for temperature readings above 100 degrees and alert if detected"
- "Analyze weekly sales data in range A1:G10 and identify trends"
- "Validate email addresses in column C and flag invalid entries"

#### Model Selection

| Provider | Model | Best For |
|----------|-------|----------|
| DeepSeek | deepseek-chat | General reasoning, analysis |
| DeepSeek | deepseek-coder | Code generation, technical tasks |
| Cloudflare | @cf/meta/llama-2-7b-chat-int8 | Fast, lightweight tasks |
| OpenAI | gpt-4 | Complex reasoning |
| Anthropic | claude-3-opus | Advanced analysis |

### Trigger Types

Claw agents can be triggered in different ways:

#### Manual Trigger
The agent runs only when you explicitly trigger it.

```
Trigger Type: Manual
```

Use for:
- On-demand analysis
- Periodic reviews
- One-time tasks

#### Data-Driven Trigger
The agent monitors specific cells and runs when data changes.

```
Trigger Type: Data
Data Source: A1:B10
```

Use for:
- Real-time monitoring
- Automatic validation
- Change detection

#### Periodic Trigger
The agent runs at regular intervals.

```
Trigger Type: Periodic
Interval: 60000 (every 60 seconds)
```

Use for:
- Scheduled reports
- Regular checks
- Time-based workflows

#### Event-Driven Trigger
The agent responds to specific events.

```
Trigger Type: Event
Event Type: cell.changed
```

Use for:
- Custom integrations
- Complex workflows
- External triggers

## Equipment System

Equipment slots determine what capabilities your Claw agent has. Each slot provides specific functionality:

### Required Equipment (Always Equipped)

| Slot | Icon | Description |
|------|------|-------------|
| **MEMORY** | Brain | Hierarchical memory for context and learning |
| **REASONING** | Thinking | Advanced reasoning and decision-making |
| **SPREADSHEET** | Chart | Direct cell integration and manipulation |

### Optional Equipment

| Slot | Icon | Description | Use Case |
|------|------|-------------|----------|
| **CONSENSUS** | Handshake | Multi-agent agreement | When multiple agents need to agree |
| **DISTILLATION** | Target | Model compression | For optimizing performance |
| **COORDINATION** | Game | Multi-agent orchestration | For swarm behavior |

### Equipment Best Practices

1. **Start with required equipment only** - Add optional equipment as needed
2. **Monitor resource usage** - More equipment means more memory
3. **Use distillation for frequently used agents** - Optimizes model size
4. **Enable coordination for multi-agent tasks** - Essential for parallel work

## Agent States

Claw agents go through various states during their lifecycle:

| State | Color | Description | Icon |
|-------|-------|-------------|------|
| **DORMANT** | Gray | Agent is idle, waiting for trigger | Sleep |
| **THINKING** | Purple | Agent is processing and reasoning | Brain |
| **NEEDS_REVIEW** | Yellow | Agent needs your approval | Handshake |
| **POSTED** | Green | Agent completed successfully | Checkmark |
| **ERROR** | Red | Agent encountered an error | X |
| **ARCHIVED** | Light Gray | Agent is archived | Archive |

## Real-Time Updates

Claw agents communicate their status in real-time via WebSocket:

### Status Updates
- State changes are reflected immediately
- Reasoning steps are streamed live
- Actions appear as they happen

### Activity Feed
View all agent activity in the status bar:
- Agent name and location
- Current state
- Recent actions
- Error messages

## Human-in-the-Loop (HITL)

Some Claw actions require your approval before execution:

1. **Agent requests approval** - Yellow "Needs Review" state
2. **Review the reasoning** - Check what the agent wants to do
3. **Approve or Reject** - Click the appropriate button
4. **Agent proceeds** - State changes to Posted or Error

### When HITL is Required

HITL is automatically enabled for:
- Writing to multiple cells
- Deleting data
- Sending external messages
- Triggering other agents
- High-confidence threshold not met

### Configuring HITL

You can configure HITL behavior in advanced settings:
- **Always require approval** - All actions need approval
- **Confidence threshold** - Require approval below threshold
- **Action types** - Select which action types need approval

## Claw Agent Management

### Management Panel

Access the Claw management panel from the toolbar to:
- View all agents
- Filter by state
- Search by name/purpose
- Edit configurations
- Trigger agents
- Delete agents

### Status Indicators

The status bar shows:
- Total agents count
- Active agents (thinking/acting)
- Idle agents
- Agents with errors
- Connected agents

### Bulk Operations

Select multiple agents to:
- Trigger all selected
- Pause all selected
- Delete all selected

## Advanced Features

### Learning Strategy

Configure how your agent learns:

#### Reinforcement Learning
- Learns from rewards/penalties
- Best for goal-oriented tasks
- Improves over time

#### Supervised Learning
- Learns from labeled examples
- Best for classification tasks
- Requires training data

#### Unsupervised Learning
- Discovers patterns on its own
- Best for clustering/analysis
- No labels required

### Social Architecture

Enable multi-agent coordination:

#### Slave Spawning
Create worker agents for parallel tasks:
- Master agent coordinates
- Slaves execute subtasks
- Results are aggregated

#### Co-Worker Collaboration
Enable peer-to-peer agent communication:
- Agents share information
- Distributed problem solving
- Consensus building

## API Integration

### HTTP API

Create and manage agents via REST API:

```typescript
// Create agent
POST /api/claws
{
  "config": {
    "id": "A1",
    "type": "SENSOR",
    "model": { "provider": "deepseek", "model": "deepseek-chat" },
    "seed": {
      "purpose": "Monitor temperature",
      "trigger": { "type": "data", "cellId": "B2" },
      "learningStrategy": "reinforcement"
    },
    "equipment": ["MEMORY", "REASONING", "SPREADSHEET"]
  }
}

// Trigger agent
POST /api/claws/A1/trigger

// Query agent state
GET /api/claws/A1

// Cancel agent
POST /api/claws/A1/cancel

// Delete agent
DELETE /api/claws/A1
```

### WebSocket API

Subscribe to real-time updates:

```typescript
// Connect
const ws = new WebSocket('wss://api.example.com/claws/ws?token=YOUR_API_KEY');

// Subscribe to agent
ws.send(JSON.stringify({
  type: 'subscribe',
  traceId: 'unique-trace-id',
  timestamp: Date.now(),
  payload: { clawId: 'A1', cellId: 'A1', sheetId: 'sheet-1' }
}));

// Receive updates
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle: state_change, reasoning_step, action_completed, error
};
```

## Best Practices

### Performance

1. **Use appropriate models** - Don't use GPT-4 for simple tasks
2. **Minimize equipment** - Only equip what you need
3. **Set reasonable timeouts** - Prevent runaway agents
4. **Monitor resource usage** - Keep an eye on memory

### Reliability

1. **Test before deploying** - Run agents manually first
2. **Use HITL for critical actions** - Don't auto-approve everything
3. **Monitor for errors** - Check the error indicator regularly
4. **Keep agents focused** - One purpose per agent

### Security

1. **Protect API keys** - Never share or commit keys
2. **Use HITL for sensitive operations** - Review before executing
3. **Limit agent permissions** - Only enable needed equipment
4. **Audit agent activity** - Review action history regularly

## Troubleshooting

### Agent Stuck in THINKING

- Check WebSocket connection
- Verify API key is valid
- Check server logs for errors
- Try canceling and re-triggering

### Agent Shows ERROR

- Review error message in status
- Check configuration for issues
- Verify data sources are valid
- Check API rate limits

### WebSocket Disconnects

- Check network connection
- Verify server is running
- Check for proxy/firewall issues
- Agent will auto-reconnect

### Poor Performance

- Reduce equipment slots
- Use a lighter model
- Check for memory leaks
- Restart the agent

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+C` | Create new Claw agent |
| `Ctrl+Shift+T` | Trigger selected agent |
| `Ctrl+Shift+A` | Approve pending action |
| `Ctrl+Shift+R` | Reject pending action |
| `Ctrl+Shift+M` | Open management panel |
| `Esc` | Cancel/close dialog |

## Getting Help

- **Documentation**: Check this guide and API documentation
- **Community**: Join our Discord for support
- **Issues**: Report bugs on GitHub
- **Examples**: See the template gallery for examples

---

**Version**: 1.0.0
**Last Updated**: March 2026
**Author**: SpreadsheetMoment Team
