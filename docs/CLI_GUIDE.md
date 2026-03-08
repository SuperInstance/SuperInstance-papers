# POLLN CLI Guide

## Overview

The POLLN CLI provides a comprehensive command-line interface for managing POLLN (Pattern-Organized Large Language Network) colonies. It enables you to initialize colonies, manage agents, run dream cycles, synchronize with federations, and monitor cache performance.

## Installation & Setup

### Building the CLI

```bash
# Install dependencies
npm install

# Build the project
npm run build

# CLI is now available at dist/cli/index.js
```

### Running the CLI

```bash
# Using npm script
npm run cli -- [command] [options]

# Or directly with node
node dist/cli/index.js [command] [options]

# Example
npm run cli -- init --name "My Colony"
```

## Quick Start Guide

### 1. Initialize a Colony

```bash
polln init --name "My First Colony" --force
```

This creates:
- `.pollnrc` - Configuration file
- `.polln/` - Data directory with colony state

### 2. Check Colony Status

```bash
polln status
```

Output includes:
- Colony information (ID, name, uptime)
- Statistics (agents, dreams, syncs)
- Cache performance
- Configuration status

### 3. Create Agents

```bash
# Create a task agent
polln agents spawn task --category "data-analysis"

# Create a role agent
polln agents spawn role --category "coordinator"

# Create a core agent
polln agents spawn core --category "system-monitor"
```

### 4. List Agents

```bash
# List all agents
polln agents list

# Filter by type
polln agents list --type task

# Filter by status
polln agents list --status active

# Output as JSON
polln agents list --json
```

### 5. Run Dream Cycle

```bash
# Run with default settings
polln dream

# Custom episodes and temperature
polln dream --episodes 20 --temperature 0.7 --verbose
```

### 6. Monitor Cache

```bash
# View cache statistics
polln cache stats

# Watch in real-time
polln cache stats --watch

# Clear cache
polln cache clear --force
```

## Command Reference

### init

Initialize a new POLLN colony.

```bash
polln init [options]
```

**Options:**
- `-n, --name <name>` - Colony name
- `-d, --data-dir <path>` - Custom data directory
- `-f, --force` - Overwrite existing configuration
- `--no-federation` - Disable federated learning
- `--no-dreaming` - Disable dream optimization
- `--interactive` - Interactive mode with prompts

**Example:**
```bash
polln init --name "Research Colony" --data-dir ./data --force
```

### status

Display colony health and statistics.

```bash
polln status [options]
```

**Options:**
- `-j, --json` - Output as JSON

**Output Sections:**
1. Colony Information - ID, status, uptime
2. Statistics - Agent counts, dreams, syncs
3. Cache - Size, hits, misses, hit rate
4. Configuration - Feature flags, limits

### agents

Manage colony agents.

#### agents list

List all agents with filtering options.

```bash
polln agents list [options]
```

**Options:**
- `-t, --type <type>` - Filter by agent type
- `-s, --status <status>` - Filter by status
- `-j, --json` - Output as JSON

**Output Columns:**
- ID - First 8 characters of agent ID
- Type - Agent type (TASK, ROLE, CORE, META)
- Category - Agent category
- Status - Current status (ACTIVE, INACTIVE, TERMINATED)
- Created - Time since creation
- Last Activity - Time since last activity

#### agents spawn

Create a new agent.

```bash
polln agents spawn <type> [options]
```

**Arguments:**
- `<type>` - Agent type: task, role, core, meta

**Options:**
- `-c, --category <category>` - Agent category (default: "default")
- `-m, --metadata <json>` - Metadata as JSON string
- `--interactive` - Interactive mode

**Examples:**
```bash
# Simple task agent
polln agents spawn task

# Task agent with category
polln agents spawn task --category "ml-pipeline"

# Agent with metadata
polln agents spawn role --category "orchestrator" --metadata '{"priority": "high", "maxWorkers": 5}'

# Interactive mode
polln agents spawn core --interactive
```

#### agents kill

Terminate an active agent.

```bash
polln agents kill <id>
```

**Arguments:**
- `<id>` - Agent ID (first 8+ characters)

**Example:**
```bash
# Find agent ID first
polln agents list
# Output: ID: a1b2c3d4

# Kill the agent
polln agents kill a1b2c3d4
```

#### agents inspect

Show detailed information about an agent.

```bash
polln agents inspect <id>
```

**Output Sections:**
- Basic Information - ID, type, category, status
- Timing - Created, last activity, age
- Metadata - Custom metadata key-value pairs

### dream

Trigger dream cycle for policy optimization.

```bash
polln dream [options]
```

**Options:**
- `-e, --episodes <count>` - Number of dream episodes (default: 10)
- `-t, --temperature <temp>` - Exploration temperature 0-1 (default: 0.5)
- `-i, --interactive` - Interactive mode
- `-v, --verbose` - Verbose output

**How it works:**
1. Simulates dream episodes based on agent experiences
2. Optimizes policies using dream-based learning
3. Updates colony statistics
4. Reports performance metrics

**Temperature Guide:**
- Low (0.0-0.3): Exploit known patterns
- Medium (0.4-0.7): Balance exploration and exploitation
- High (0.8-1.0): Explore new patterns aggressively

### sync

Synchronize colony with federation.

```bash
polln sync [options]
```

**Options:**
- `-p, --push` - Push local updates only
- `-l, --pull` - Pull updates only
- `-f, --force` - Force sync even with conflicts
- `-i, --interactive` - Interactive mode
- `-v, --verbose` - Verbose output

**Requirements:**
- Federation must be enabled in configuration
- Valid federation endpoint configured

**Example:**
```bash
# Enable federation first
polln config --set federation.enabled=true

# Then sync
polln sync --verbose
```

### cache

Manage KV-cache.

#### cache stats

Display cache performance statistics.

```bash
polln cache stats [options]
```

**Options:**
- `-j, --json` - Output as JSON
- `-w, --watch` - Watch mode (updates every second)

**Metrics:**
- Size - Current cache size
- Hits - Cache hits count
- Misses - Cache misses count
- Hit Rate - Percentage of cache hits
- Miss Rate - Percentage of cache misses

#### cache clear

Clear the cache.

```bash
polln cache clear [options]
```

**Options:**
- `-f, --force` - Skip confirmation prompt
- `-v, --verbose` - Verbose output

**Use cases:**
- Free up memory
- Reset cache statistics
- Force cache rebuild

#### cache simulate

Simulate cache activity for testing.

```bash
polln cache simulate [options]
```

**Options:**
- `-n, --operations <count>` - Number of operations (default: 100)
- `-h, --hit-rate <rate>` - Target hit rate 0-1 (default: 0.7)

**Purpose:**
- Test cache performance
- Populate cache statistics
- Benchmark cache behavior

### config

Manage POLLN configuration.

```bash
polln config [options]
```

**Options:**
- `-s, --set <key=value>` - Set configuration value
- `-g, --get <key>` - Get configuration value
- `-l, --list` - List all configuration
- `--edit` - Open config in editor

**Examples:**
```bash
# List all configuration
polln config --list

# Get specific value
polln config --get colonyName

# Set value
polln config --set federation.enabled=true

# Set nested value
polln config --set 'agents.maxCount=200'

# Edit in default editor
polln config --edit
```

## Configuration

### File Location

- **Project**: `.pollnrc` in project directory
- **Global**: `~/.polln/config.json`

### Configuration Structure

```json
{
  "colonyId": "colony-1234567890-abc123",
  "colonyName": "My Colony",
  "dataDir": "./.polln",
  "federation": {
    "enabled": false,
    "endpoint": "https://federation.polln.dev",
    "colonyId": null
  },
  "dreaming": {
    "enabled": true,
    "schedule": "0 2 * * *"
  },
  "cache": {
    "maxSize": 1000,
    "ttl": 3600
  },
  "agents": {
    "maxCount": 100,
    "defaultType": "task"
  },
  "logging": {
    "level": "info",
    "file": null
  }
}
```

### Configuration Options

#### federation
- `enabled` - Enable federated learning (default: false)
- `endpoint` - Federation server URL
- `colonyId` - Federation colony ID

#### dreaming
- `enabled` - Enable dream optimization (default: true)
- `schedule` - Cron schedule for automatic dreams

#### cache
- `maxSize` - Maximum cache entries (default: 1000)
- `ttl` - Time-to-live in seconds (default: 3600)

#### agents
- `maxCount` - Maximum agent count (default: 100)
- `defaultType` - Default agent type (task, role, core)

#### logging
- `level` - Log level (debug, info, warn, error)
- `file` - Optional log file path

## Agent Types

### TASK Agents
Single-purpose, ephemeral agents for specific tasks.

**Use cases:**
- Data processing
- Transient computations
- One-off operations

**Lifecycle:** Short-lived, terminated after completion

### ROLE Agents
Ongoing responsibility agents with persistent roles.

**Use cases:**
- Coordination
- Monitoring
- Persistent services

**Lifecycle:** Long-lived, active until explicitly terminated

### CORE Agents
Essential, always-active agents for core functions.

**Use cases:**
- System management
- Critical services
- Colony operations

**Lifecycle:** Always active, critical for colony operation

### META Agents
Pluripotent agents that differentiate based on signals.

**Use cases:**
- Adaptive behavior
- Dynamic specialization
- Multi-function support

**Lifecycle:** Differentiates based on environmental signals

## Advanced Usage

### Batch Operations

```bash
# Create multiple agents
for type in task role core; do
  polln agents spawn $type --category "batch-$type"
done
```

### Monitoring

```bash
# Watch colony status
watch -n 5 'polln status'

# Watch cache statistics
polln cache stats --watch
```

### Automation

```bash
# Scheduled dream cycles
cron "0 2 * * *" cd /path/to/colony && polln dream --episodes 50

# Automatic sync
cron "*/30 * * * *" cd /path/to/colony && polln sync --pull
```

### Integration with CI/CD

```bash
# In CI pipeline
polln init --name "CI Colony" --force
polln agents spawn task --category "test"
polln dream --episodes 10
polln cache stats --json > cache-report.json
```

## Troubleshooting

### Colony Not Found

```bash
# Check if initialized
ls -la .pollnrc

# Initialize if needed
polln init --name "My Colony"
```

### Agent Not Found

```bash
# List all agents to find correct ID
polln agents list

# Use full ID or sufficient prefix
polln agents inspect <full-id>
polln agents inspect <first-8-chars>
```

### Permission Issues

```bash
# Check data directory permissions
ls -la .polln/

# Fix permissions if needed
chmod 755 .polln/
```

### Configuration Errors

```bash
# Validate configuration
cat .pollnrc | jq .

# Reset to defaults
polln init --force
```

## Best Practices

1. **Initialize in Project Root**
   ```bash
   cd /path/to/project
   polln init --name "Project Colony"
   ```

2. **Use Descriptive Agent Categories**
   ```bash
   polln agents spawn task --category "data-pipeline-stage1"
   ```

3. **Monitor Colony Health**
   ```bash
   polln status
   polln cache stats
   ```

4. **Regular Dream Cycles**
   ```bash
   polln dream --episodes 20 --temperature 0.5
   ```

5. **Cache Maintenance**
   ```bash
   polln cache stats
   polln cache clear --force  # When needed
   ```

6. **Backup Configuration**
   ```bash
   cp .pollnrc .pollnrc.backup
   ```

## Support

For more information:
- GitHub: https://github.com/SuperInstance/polln
- Documentation: See `docs/` directory
- Issues: https://github.com/SuperInstance/polln/issues
