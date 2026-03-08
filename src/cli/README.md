# POLLN CLI

A command-line interface for managing POLLN (Pattern-Organized Large Language Network) colonies.

## Installation

After building the project, the CLI is available at `dist/cli/index.js`.

```bash
# Build the CLI
npm run build

# Run directly
node dist/cli/index.js --help

# Or use npm script
npm run cli -- --help
```

## Quick Start

```bash
# Initialize a new colony
polln init --name "My Colony"

# Check colony status
polln status

# Create your first agent
polln agents spawn task --category "analysis"

# List all agents
polln agents list

# Run dream cycle
polln dream --episodes 10

# Check cache statistics
polln cache stats
```

## Commands

### `polln init`

Initialize a new POLLN colony in the current directory.

```bash
polln init [options]

Options:
  -n, --name <name>        Colony name
  -d, --data-dir <path>    Data directory path
  -f, --force              Overwrite existing configuration
  --no-federation          Disable federated learning
  --no-dreaming            Disable dream-based optimization
  --interactive            Interactive mode
```

### `polln status`

Show colony health and statistics.

```bash
polln status [options]

Options:
  -j, --json    Output as JSON
```

### `polln agents`

Manage colony agents.

#### `polln agents list`

List all agents.

```bash
polln agents list [options]

Options:
  -t, --type <type>    Filter by agent type
  -s, --status <status>  Filter by status
  -j, --json           Output as JSON
```

#### `polln agents spawn`

Create a new agent.

```bash
polln agents spawn <type> [options]

Arguments:
  <type>    Agent type (task, role, core, meta)

Options:
  -c, --category <category>    Agent category (default: "default")
  -m, --metadata <json>       Metadata as JSON string
  --interactive               Interactive mode
```

#### `polln agents kill`

Terminate an agent.

```bash
polln agents kill <id>

Arguments:
  <id>    Agent ID (or first 8+ characters)
```

#### `polln agents inspect`

Show detailed information about an agent.

```bash
polln agents inspect <id>

Arguments:
  <id>    Agent ID (or first 8+ characters)
```

### `polln dream`

Trigger dream cycle for policy optimization.

```bash
polln dream [options]

Options:
  -e, --episodes <count>      Number of dream episodes (default: 10)
  -t, --temperature <temp>    Dream exploration temperature (default: 0.5)
  -i, --interactive           Interactive mode
  -v, --verbose               Verbose output
```

### `polln sync`

Sync colony with federation.

```bash
polln sync [options]

Options:
  -p, --push       Push local updates to federation
  -l, --pull       Pull updates from federation
  -f, --force      Force sync even if conflicts exist
  -i, --interactive Interactive mode
  -v, --verbose    Verbose output
```

### `polln cache`

Manage KV-cache.

#### `polln cache stats`

Show KV-cache statistics.

```bash
polln cache stats [options]

Options:
  -j, --json     Output as JSON
  -w, --watch    Watch mode (update every second)
```

#### `polln cache clear`

Clear KV-cache.

```bash
polln cache clear [options]

Options:
  -f, --force     Force clear without confirmation
  -v, --verbose   Verbose output
```

#### `polln cache simulate`

Simulate cache activity (for testing).

```bash
polln cache simulate [options]

Options:
  -n, --operations <count>    Number of operations (default: 100)
  -h, --hit-rate <rate>      Target hit rate 0-1 (default: 0.7)
```

### `polln config`

Manage POLLN configuration.

```bash
polln config [options]

Options:
  -s, --set <key=value>    Set configuration value
  -g, --get <key>          Get configuration value
  -l, --list               List all configuration
  --edit                   Open config in editor
```

### `polln version`

Show detailed version information.

```bash
polln version
```

## Configuration

The CLI stores configuration in `.pollnrc` in your project directory. Example configuration:

```json
{
  "colonyId": "colony-1234567890-abc123",
  "colonyName": "My Colony",
  "dataDir": "./.polln",
  "federation": {
    "enabled": false,
    "endpoint": "https://federation.polln.dev"
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
    "level": "info"
  }
}
```

Global configuration is stored in `~/.polln/config.json`.

## Agent Types

- **TASK**: Single-purpose, ephemeral agents for specific tasks
- **ROLE**: Ongoing responsibility agents with persistent roles
- **CORE**: Essential, always-active agents for core functions
- **META**: Pluripotent agents that differentiate based on signals

## Examples

### Interactive Colony Setup

```bash
polln init --interactive
```

### Create Agents with Metadata

```bash
polln agents spawn task --category "data-processing" --metadata '{"priority": "high", "timeout": 5000}'
```

### Filter Agents by Type

```bash
polln agents list --type task --status active
```

### Run Dream Cycle with Custom Parameters

```bash
polln dream --episodes 20 --temperature 0.7 --verbose
```

### Watch Cache Statistics in Real-time

```bash
polln cache stats --watch
```

### Federation Sync

```bash
# Push only
polln sync --push

# Pull only
polln sync --pull

# Both ways
polln sync
```

## Development

```bash
# Build the CLI
npm run build

# Run CLI tests
npm run test:cli

# Run CLI directly
npm run cli -- [command] [options]
```

## Project Structure

```
src/cli/
├── commands/
│   ├── init.ts          # Initialize colony
│   ├── status.ts        # Show colony status
│   ├── agents.ts        # Agent management
│   ├── dream.ts         # Dream cycle
│   ├── sync.ts          # Federation sync
│   └── cache.ts         # Cache management
├── utils/
│   ├── config.ts        # Configuration management
│   ├── colony-state.ts  # Colony state persistence
│   └── output.ts        # Terminal output formatting
├── __tests__/
│   ├── cli.test.ts      # Unit tests
│   └── integration.test.ts  # Integration tests
└── index.ts             # CLI entry point
```

## License

MIT
