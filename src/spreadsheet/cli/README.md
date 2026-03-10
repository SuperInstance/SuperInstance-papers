# POLLN Spreadsheet CLI

Comprehensive CLI tool for POLLN spreadsheet operations and management. Manage living spreadsheets with intelligent cells, agent colonies, and powerful analysis capabilities.

## Installation

The CLI is included with the POLLN package. After building:

```bash
npm run build
npm link
```

Or run directly:

```bash
node dist/spreadsheet/cli/index.js
```

## Quick Start

```bash
# Create a new spreadsheet
polln-sheet sheet create my-data

# Set a cell value
polln-sheet cell set <sheet-id> A1 "Hello World"

# Create an analysis colony
polln-sheet colony create analyzer --sheet <sheet-id>

# Start the development server
polln-sheet server dev
```

## Commands

### Spreadsheet Management

#### Create Spreadsheet

```bash
polln-sheet sheet create <name> [options]
```

**Options:**
- `-d, --description <text>` - Spreadsheet description
- `-r, --rows <number>` - Number of rows (default: 1000)
- `-c, --cols <number>` - Number of columns (default: 26)
- `-t, --template <type>` - Template: basic, financial, analytics (default: basic)

**Examples:**
```bash
# Create with defaults
polln-sheet sheet create finances

# Create financial spreadsheet
polln-sheet sheet create budget --template financial --description "Monthly budget"

# Create large analytics sheet
polln-sheet sheet create analytics --rows 5000 --cols 50 --template analytics
```

#### List Spreadsheets

```bash
polln-sheet sheet list [options]
```

**Options:**
- `-a, --all` - Include archived spreadsheets
- `--sort <field>` - Sort by: name, created, modified (default: modified)

**Examples:**
```bash
# List all active sheets
polln-sheet sheet list

# List all including archived, sorted by name
polln-sheet sheet list --all --sort name
```

#### Spreadsheet Information

```bash
polln-sheet sheet info <id> [options]
```

**Options:**
- `--stats` - Include statistics

**Examples:**
```bash
# Show basic info
polln-sheet sheet info abc123...

# Show with statistics
polln-sheet sheet info abc123... --stats
```

#### Delete Spreadsheet

```bash
polln-sheet sheet delete <id> [options]
```

**Options:**
- `-f, --force` - Force deletion without confirmation
- `--archive` - Archive instead of deleting

**Examples:**
```bash
# Archive spreadsheet
polln-sheet sheet delete abc123... --archive

# Force delete
polln-sheet sheet delete abc123... --force
```

#### Duplicate Spreadsheet

```bash
polln-sheet sheet duplicate <id> <newName> [options]
```

**Options:**
- `--include-data` - Include cell data
- `--include-formulas` - Include formulas

**Examples:**
```bash
# Duplicate with data
polln-sheet sheet duplicate abc123... "Copy Name" --include-data

# Duplicate with formulas
polln-sheet sheet duplicate abc123... "Copy Name" --include-formulas
```

#### Export Spreadsheet

```bash
polln-sheet sheet export <id> [options]
```

**Options:**
- `-f, --format <type>` - Format: json, csv, xlsx, pdf (default: json)
- `-o, --output <path>` - Output file path

**Examples:**
```bash
# Export to JSON
polln-sheet sheet export abc123... --format json --output data.json

# Export to CSV
polln-sheet sheet export abc123... --format csv --output data.csv
```

#### Import Spreadsheet

```bash
polln-sheet sheet import <file> [options]
```

**Options:**
- `-n, --name <name>` - Spreadsheet name
- `--format <type>` - File format: auto, json, csv, xlsx (default: auto)

**Examples:**
```bash
# Import from CSV
polln-sheet sheet import data.csv --name "Imported Data"

# Import from JSON
polln-sheet sheet import data.json --name "Imported Data"
```

### Cell Operations

#### Get Cell Value

```bash
polln-sheet cell get <sheetId> <cellRef> [options]
```

**Options:**
- `--history` - Include value history
- `--dependencies` - Show cell dependencies

**Examples:**
```bash
# Get cell value
polln-sheet cell get abc123... A1

# Get with history
polln-sheet cell get abc123... A1 --history

# Get with dependencies
polln-sheet cell get abc123... B1 --dependencies
```

#### Set Cell Value

```bash
polln-sheet cell set <sheetId> <cellRef> <value> [options]
```

**Options:**
- `-t, --type <type>` - Value type: auto, string, number, boolean, formula (default: auto)
- `--formula` - Treat value as formula
- `--no-calculate` - Don't recalculate dependencies

**Examples:**
```bash
# Set text value
polln-sheet cell set abc123... A1 "Hello World"

# Set number
polln-sheet cell set abc123... B1 42

# Set formula
polln-sheet cell set abc123... C1 "=A1+B1" --formula

# Set without recalculation
polln-sheet cell set abc123... D1 100 --no-calculate
```

#### Batch Operations

```bash
polln-sheet cell batch <sheetId> [options]
```

**Options:**
- `-f, --file <path>` - Batch operations file (JSON)
- `--json <json>` - Batch operations as JSON string

**Example batch file:**
```json
[
  {
    "action": "set",
    "cellRef": "A1",
    "value": "Title"
  },
  {
    "action": "set",
    "cellRef": "B1",
    "value": 100
  },
  {
    "action": "set",
    "cellRef": "C1",
    "formula": "=B1*2"
  }
]
```

**Usage:**
```bash
# From file
polln-sheet cell batch abc123... --file operations.json

# From JSON string
polln-sheet cell batch abc123... --json '[{"action":"set","cellRef":"A1","value":"Test"}]'
```

#### Query Cells

```bash
polln-sheet cell query <sheetId> [options]
```

**Options:**
- `--type <type>` - Filter by cell type
- `--value <pattern>` - Filter by value pattern
- `--formula <pattern>` - Filter by formula pattern
- `--modified <date>` - Modified since date
- `--limit <number>` - Limit results (default: 100)

**Examples:**
```bash
# Find all formulas
polln-sheet cell query abc123... --type formula

# Find cells containing "total"
polln-sheet cell query abc123... --value total

# Find modified cells
polln-sheet cell query abc123... --modified 2024-01-01
```

#### Cell Dependencies

```bash
polln-sheet cell deps <sheetId> <cellRef> [options]
```

**Options:**
- `--tree` - Show dependency tree
- `--circular` - Check for circular references

**Examples:**
```bash
# Show dependencies
polln-sheet cell deps abc123... C1

# Check for circular references
polln-sheet cell deps abc123... C1 --circular
```

#### Evaluate Formula

```bash
polln-sheet cell eval <sheetId> <cellRef> [options]
```

**Options:**
- `--debug` - Show evaluation steps
- `--trace` - Trace evaluation path

**Examples:**
```bash
# Evaluate cell
polln-sheet cell eval abc123... C1

# Debug evaluation
polln-sheet cell eval abc123... C1 --debug
```

#### Watch Cell Changes

```bash
polln-sheet cell watch <sheetId> <cellRef> [options]
```

**Options:**
- `-t, --timeout <ms>` - Watch timeout in ms (default: 30000)
- `--once` - Wait for single change then exit

**Examples:**
```bash
# Watch for changes
polln-sheet cell watch abc123... A1

# Watch for single change
polln-sheet cell watch abc123... A1 --once

# Watch with custom timeout
polln-sheet cell watch abc123... A1 --timeout 60000
```

### Colony Management

#### Create Colony

```bash
polln-sheet colony create <name> [options]
```

**Options:**
- `-s, --sheet <id>` - Associate with spreadsheet
- `-t, --type <type>` - Colony type: analysis, prediction, optimization (default: analysis)
- `--agents <number>` - Initial agent count (default: 5)

**Examples:**
```bash
# Create analysis colony
polln-sheet colony create analyzer --sheet abc123...

# Create with 10 agents
polln-sheet colony create analyzer --sheet abc123... --agents 10

# Create prediction colony
polln-sheet colony create predictor --sheet abc123... --type prediction
```

#### Deploy Agents

```bash
polln-sheet colony deploy <colonyId> [options]
```

**Options:**
- `-t, --type <type>` - Agent type to deploy
- `-c, --count <number>` - Number of agents to deploy (default: 1)
- `--config <path>` - Agent configuration file

**Examples:**
```bash
# Deploy 5 agents
polln-sheet colony deploy xyz789... --count 5

# Deploy with custom type
polln-sheet colony deploy xyz789... --type analysis --count 3
```

#### Monitor Colony

```bash
polln-sheet colony monitor <colonyId> [options]
```

**Options:**
- `-r, --refresh <ms>` - Refresh interval in ms (default: 1000)
- `--metrics` - Show detailed metrics
- `--stream` - Stream updates continuously

**Examples:**
```bash
# Monitor colony
polln-sheet colony monitor xyz789...

# Monitor with metrics
polln-sheet colony monitor xyz789... --metrics

# Stream updates
polln-sheet colony monitor xyz789... --stream
```

#### Colony Metrics

```bash
polln-sheet colony metrics <colonyId> [options]
```

**Options:**
- `-p, --period <duration>` - Time period: 1h, 24h, 7d (default: 1h)
- `--format <type>` - Output format: table, json, csv (default: table)

**Examples:**
```bash
# Show metrics for last hour
polln-sheet colony metrics xyz789...

# Show 24h metrics as JSON
polln-sheet colony metrics xyz789... --period 24h --format json

# Export metrics as CSV
polln-sheet colony metrics xyz789... --format csv > metrics.csv
```

#### Stop Colony

```bash
polln-sheet colony stop <colonyId> [options]
```

**Options:**
- `-f, --force` - Force stop without waiting
- `--save` - Save state before stopping

**Examples:**
```bash
# Stop gracefully
polln-sheet colony stop xyz789...

# Force stop
polln-sheet colony stop xyz789... --force

# Stop and save
polln-sheet colony stop xyz789... --save
```

#### Colony Configuration

```bash
polln-sheet colony config <colonyId> [options]
```

**Options:**
- `--get <key>` - Get configuration value
- `--set <key=value>` - Set configuration value
- `--list` - List all configuration

**Examples:**
```bash
# List all config
polln-sheet colony config xyz789... --list

# Get specific value
polln-sheet colony config xyz789... --get maxAgents

# Set value
polln-sheet colony config xyz789... --set learningRate=0.2
```

#### List Colonies

```bash
polln-sheet colony list [options]
```

**Options:**
- `-a, --all` - Include stopped colonies
- `--sheet <id>` - Filter by spreadsheet

**Examples:**
```bash
# List active colonies
polln-sheet colony list

# List all colonies
polln-sheet colony list --all

# List colonies for sheet
polln-sheet colony list --sheet abc123...
```

### Server Management

#### Development Server

```bash
polln-sheet server dev [options]
```

**Options:**
- `-p, --port <number>` - Port number (default: 3000)
- `-h, --host <address>` - Host address (default: localhost)
- `--hot-reload` - Enable hot reload
- `--inspect` - Enable inspector

**Examples:**
```bash
# Start dev server
polln-sheet server dev

# Start on custom port
polln-sheet server dev --port 4000

# Start with hot reload
polln-sheet server dev --hot-reload
```

#### Production Server

```bash
polln-sheet server start [options]
```

**Options:**
- `-p, --port <number>` - Port number (default: 8080)
- `-w, --workers <number>` - Number of workers (default: 4)
- `--cluster` - Enable cluster mode

**Examples:**
```bash
# Start production server
polln-sheet server start

# Start with cluster mode
polln-sheet server start --cluster --workers 8
```

#### Health Check

```bash
polln-sheet server health [options]
```

**Options:**
- `-u, --url <url>` - Server URL (default: http://localhost:8080)
- `--verbose` - Detailed health information

**Examples:**
```bash
# Check health
polln-sheet server health

# Check with verbose output
polln-sheet server health --verbose

# Check specific server
polln-sheet server health --url https://api.example.com
```

#### Server Statistics

```bash
polln-sheet server stats [options]
```

**Options:**
- `-u, --url <url>` - Server URL (default: http://localhost:8080)
- `--live` - Live statistics update

**Examples:**
```bash
# Get statistics
polln-sheet server stats

# Live updates
polln-sheet server stats --live
```

#### View Logs

```bash
polln-sheet server logs [options]
```

**Options:**
- `-f, --follow` - Follow log output
- `-n, --lines <number>` - Number of lines (default: 100)
- `--level <level>` - Log level filter

**Examples:**
```bash
# View logs
polln-sheet server logs

# Follow logs
polln-sheet server logs --follow

# View last 50 lines
polln-sheet server logs --lines 50
```

### Configuration

#### Manage Configuration

```bash
polln-sheet config [options]
```

**Options:**
- `-s, --set <key=value>` - Set configuration value
- `-g, --get <key>` - Get configuration value
- `-l, --list` - List all configuration
- `--edit` - Open config in editor
- `--validate` - Validate configuration

**Examples:**
```bash
# List all config
polln-sheet config --list

# Get value
polln-sheet config --get server.port

# Set value
polln-sheet config --set server.port=3000

# Edit in editor
polln-sheet config --edit

# Validate configuration
polln-sheet config --validate
```

### Interactive Mode

```bash
polln-sheet interactive
polln-sheet i
```

Starts an interactive REPL for running commands.

### Help

```bash
polln-sheet help
polln-sheet help --detailed
```

Show help information with examples.

## Global Options

- `-c, --config <path>` - Path to configuration file
- `-v, --verbose` - Enable verbose output
- `-q, --quiet` - Quiet mode (minimal output)
- `--json` - Output in JSON format
- `--no-color` - Disable colored output
- `-h, --help` - Show help
- `--version` - Show version number

## Configuration

Configuration is stored in:
- Project: `.polln-sheet.json` (current directory)
- Global: `~/.polln/config.json`

Example configuration:

```json
{
  "dataDir": "~/.polln/sheets",
  "server": {
    "host": "localhost",
    "port": 8080,
    "workers": 4,
    "cluster": false
  },
  "spreadsheets": {
    "defaultRows": 1000,
    "defaultCols": 26,
    "defaultTemplate": "basic",
    "autoSave": true,
    "autoSaveInterval": 60000
  },
  "cells": {
    "maxHistory": 10,
    "enableDependencies": true,
    "enableFormulas": true
  },
  "colonies": {
    "maxAgents": 100,
    "defaultType": "analysis",
    "spawnRate": 1.0,
    "learningRate": 0.1
  },
  "cli": {
    "defaultOutput": "table",
    "color": true,
    "verbose": false,
    "confirmDestructive": true
  },
  "features": {
    "enableML": true,
    "enableCollaboration": false,
    "enableGPU": false
  }
}
```

## Environment Variables

- `POLLN_CONFIG` - Path to configuration file
- `POLLN_LOG_LEVEL` - Log level (debug, info, warn, error)
- `POLLN_JSON_OUTPUT` - Enable JSON output
- `POLLN_SERVER_HOST` - Default server host
- `POLLN_SERVER_PORT` - Default server port
- `POLLN_DATA_DIR` - Data directory path

## Output Formats

The CLI supports multiple output formats:

- **table** - Formatted table output (default)
- **json** - JSON output
- **csv** - CSV output (for some commands)

Use `--json` global option or `--format` command option to specify.

## Examples

### Complete Workflow

```bash
# 1. Create a financial spreadsheet
polln-sheet sheet create budget --template financial

# 2. Add some data
polln-sheet cell set <sheet-id> A2 "January"
polln-sheet cell set <sheet-id> B2 5000
polln-sheet cell set <sheet-id> C2 3000
polln-sheet cell set <sheet-id> D2 "=B2-C2" --formula

# 3. Create an analysis colony
polln-sheet colony create analyzer --sheet <sheet-id> --type analysis --agents 5

# 4. Monitor the colony
polln-sheet colony monitor <colony-id> --stream

# 5. View results
polln-sheet cell get <sheet-id> D2 --history
```

### Batch Operations

```bash
# Create batch operations file
cat > operations.json << EOF
[
  {"action": "set", "cellRef": "A1", "value": "Month"},
  {"action": "set", "cellRef": "B1", "value": "Income"},
  {"action": "set", "cellRef": "C1", "value": "Expenses"},
  {"action": "set", "cellRef": "D1", "value": "Balance"},
  {"action": "set", "cellRef": "D2", "formula": "=B2-C2"}
]
EOF

# Apply batch operations
polln-sheet cell batch <sheet-id> --file operations.json
```

### Analysis Pipeline

```bash
# Create spreadsheet
polln-sheet sheet create sales-data

# Import CSV data
polln-sheet sheet import sales.csv --name "Sales Data"

# Create prediction colony
polln-sheet colony create predictor --sheet <sheet-id> --type prediction --agents 10

# Deploy more agents
polln-sheet colony deploy <colony-id> --count 5

# Monitor metrics
polln-sheet colony metrics <colony-id> --period 24h --format json > metrics.json

# Export results
polln-sheet sheet export <sheet-id> --format csv --output results.csv
```

## Error Handling

The CLI provides clear error messages:

```bash
# Invalid cell reference
$ polln-sheet cell get <id> INVALID
✗ Invalid cell reference: INVALID

# Spreadsheet not found
$ polln-sheet cell get nonexistent A1
✗ Spreadsheet not found: nonexistent

# Validation errors
$ polln-sheet config --set server.port=99999
✗ Invalid server port: 99999
```

## Tips

1. **Use tab completion** - Many shells support tab completion for commands
2. **Pipe output** - Use `--json` and pipe to `jq` for advanced filtering
3. **Batch operations** - Use batch operations for multiple cell updates
4. **Watch mode** - Use `--stream` for monitoring colonies and servers
5. **Configuration** - Set up default values in config file for convenience

## Support

- Documentation: https://github.com/SuperInstance/polln
- Issues: https://github.com/SuperInstance/polln/issues
- License: MIT
