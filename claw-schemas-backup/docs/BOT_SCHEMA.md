# Bot Schema Documentation

**Version:** 1.0.0
**Last Updated:** 2026-03-15
**Schema Location:** `claw/schemas/bot-schema.json`

---

## Table of Contents

1. [Overview](#overview)
2. [Bot vs Claw: Critical Distinction](#bot-vs-claw-critical-distinction)
3. [Schema Structure](#schema-structure)
4. [Core Types](#core-types)
5. [Validation Rules](#validation-rules)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)
8. [Implementation Guidelines](#implementation-guidelines)

---

## Overview

The **Bot Schema** defines the structure for **Bot** entities - minimal automation loops designed for simple, fast, reliable task execution without machine learning overhead.

### Key Characteristics

- **Dumb Automation:** Executes predefined loops without learning or adaptation
- **Deterministic:** Same inputs produce same outputs
- **Lightweight:** Minimal resource footprint
- **Reliable:** Predictable execution patterns
- **Fast:** No ML model loading or inference overhead

### When to Use Bots

Use Bots for:
- Repetitive task automation
- Scheduled data synchronization
- System monitoring and alerting
- File system maintenance
- Simple state-based actions
- API polling and processing
- Batch processing operations

### When NOT to Use Bots

Avoid Bots for:
- Tasks requiring learning or adaptation
- Complex decision making
- Pattern recognition
- Natural language processing
- Image/audio processing
- Predictive analytics
(Use **Claw** agents for these instead)

---

## Bot vs Claw: Critical Distinction

### Architecture Comparison

| Aspect | Bot | Claw |
|--------|-----|------|
| **ML Model** | None | Yes (required) |
| **Intelligence** | Dumb automation | Intelligent agent |
| **Learning** | No learning | Can learn and adapt |
| **Decision Making** | Rule-based | AI-powered reasoning |
| **Complexity** | Simple loops | Complex cognitive tasks |
| **Resource Usage** | Minimal | Higher (model inference) |
| **Startup Time** | Instant | Model loading time |
| **Use Case** | Automation | Intelligence |

### Mental Model

```
Bot = for loop {
    execute predefined action
    wait for interval
    repeat
}

Claw = AI agent {
    load ML model
    perceive environment
    reason and plan
    take intelligent action
    learn from feedback
    repeat
}
```

### Example Scenarios

**Bot Example:**
```json
{
    "id": "file_cleanup_bot",
    "loop": {
        "type": "function_reference",
        "target": "cleanup.delete_old_files"
    },
    "interval": {
        "fixed_rate": 86400000
    },
    "state": "IDLE"
}
```
This bot runs every 24 hours and deletes files older than a threshold. No intelligence needed.

**Claw Example:**
```json
{
    "id": "content_moderator_agent",
    "model": "toxicity_classifier_v2",
    "capabilities": ["text_analysis", "context_awareness"],
    "learning": true
}
```
This agent uses ML to understand context and make nuanced moderation decisions.

---

## Schema Structure

### Root Properties

```typescript
interface Bot {
    // Required
    id: string;              // Unique identifier
    loop: LoopDefinition;    // What to execute
    interval: IntervalConfig; // When to execute
    state: BotState;         // Current state
    triggers: Trigger[];     // Execution triggers

    // Optional
    name?: string;           // Human-readable name
    description?: string;    // Detailed description
    version?: string;        // Semantic version
    config?: BotConfig;      // Runtime configuration
    metadata?: BotMetadata;  // Creation and modification info
    error_handling?: ErrorHandling; // Error strategy
}
```

### Property Descriptions

#### id (Required)
- **Type:** `string`
- **Format:** Alphanumeric with hyphens/underscores
- **Length:** 1-128 characters
- **Purpose:** Unique identifier across all bots
- **Example:** `"data_sync_bot_v1"`

#### name (Optional)
- **Type:** `string`
- **Length:** 1-256 characters
- **Purpose:** Human-readable name for UI/display
- **Example:** `"Data Synchronization Bot"`

#### description (Optional)
- **Type:** `string`
- **MaxLength:** 2048 characters
- **Purpose:** Explain what the bot does and why
- **Example:** `"Syncs customer data from CRM to database every 5 minutes"`

#### version (Optional)
- **Type:** `string` (Semantic Versioning)
- **Pattern:** `MAJOR.MINOR.PATCH`
- **Purpose:** Track configuration changes
- **Example:** `"2.1.0"`

---

## Core Types

### BotState Enum

Current operational state of the bot.

```typescript
enum BotState {
    IDLE = "IDLE",       // Not running, waiting for next trigger
    RUNNING = "RUNNING", // Actively executing loop function
    PAUSED = "PAUSED",   // Suspended, will not execute
    ERROR = "ERROR"      // Error encountered, needs attention
}
```

**State Transitions:**
```
IDLE -> RUNNING (trigger fires)
RUNNING -> IDLE (execution completes)
RUNNING -> ERROR (error occurs)
ERROR -> IDLE (error resolved)
IDLE -> PAUSED (manual pause)
PAUSED -> IDLE (manual resume)
```

### TriggerType Enum

Type of trigger that initiates execution.

```typescript
enum TriggerType {
    TIME_BASED = "time_based",         // Schedule-based
    CONDITION_BASED = "condition_based", // Predicate evaluation
    EVENT_BASED = "event_based"        // External events
}
```

### LoopDefinition Type

Definition of what the bot executes each iteration.

```typescript
interface LoopDefinition {
    type: "function_reference" | "inline_code" | "external_module";
    target: string;
    language?: "javascript" | "python" | "rust" | "bash" | "sql" | "none";
    entry_point?: string;
    args?: Record<string, any>;
}
```

**Types Explained:**

1. **function_reference**: Call a named function
   ```json
   {
       "type": "function_reference",
       "target": "bots.cleanup.delete_old_files",
       "args": {
           "directory": "/tmp",
           "age_hours": 24
       }
   }
   ```

2. **inline_code**: Execute inline script
   ```json
   {
       "type": "inline_code",
       "target": "console.log('Hello World');",
       "language": "javascript"
   }
   ```

3. **external_module**: Load external module
   ```json
   {
       "type": "external_module",
       "target": "module:data_processor@process_batch",
       "entry_point": "run"
   }
   ```

### IntervalConfig Type

Timing configuration for execution.

```typescript
interface IntervalConfig {
    // Option 1: Fixed rate
    fixed_rate?: number;  // milliseconds, 1-3600000

    // Option 2: Cron schedule
    cron?: string;
    timezone?: string;

    // Option 3: Dynamic
    dynamic?: string;  // function reference
}
```

**Examples:**

```json
// Fixed rate: every 5 minutes
{
    "fixed_rate": 300000
}

// Cron: every hour
{
    "cron": "0 * * * *",
    "timezone": "UTC"
}

// Dynamic: calculate next interval
{
    "dynamic": "functions.calculate_backoff"
}
```

### Trigger Types

#### TimeBasedTrigger
```json
{
    "id": "daily_trigger",
    "type": "time_based",
    "enabled": true,
    "config": {
        "schedule": "0 2 * * *",
        "timezone": "America/New_York"
    }
}
```

#### ConditionBasedTrigger
```json
{
    "id": "threshold_trigger",
    "type": "condition_based",
    "enabled": true,
    "config": {
        "condition": "metrics.cpu_usage > 80",
        "check_interval": 5000
    }
}
```

#### EventBasedTrigger
```json
{
    "id": "webhook_trigger",
    "type": "event_based",
    "enabled": true,
    "config": {
        "event_source": "webhook",
        "event_type": "data.updated",
        "filter": {
            "source": "production"
        }
    }
}
```

---

## Validation Rules

### Required Fields

The following fields MUST be present:
- `id` - Unique identifier
- `loop` - Loop definition
- `interval` - Timing configuration
- `state` - Current state
- `triggers` - At least one trigger (empty array allowed)

### ID Validation

- **Pattern:** `^[a-zA-Z0-9_-]+$`
- **MinLength:** 1
- **MaxLength:** 128
- **Examples:**
  - Valid: `"bot_1"`, `"data-sync"`, `"bot_v2"`
  - Invalid: `"bot 1"`, `"bot/sync"`, `""`

### Interval Constraints

- **Minimum:** 1 millisecond
- **Maximum:** 1 hour (3,600,000 ms)
- **Fixed Rate:** Must be between min and max
- **Cron:** Must be valid cron expression
- **Timezone:** Must be valid IANA timezone

### Loop Function Validation

- **type:** Must be one of the three types
- **target:** Cannot be empty string
- **language:** Required for `inline_code` type
- **args:** Must be object if present

### Trigger Validation

- **type:** Must be valid TriggerType enum
- **enabled:** Must be boolean (default: true)
- **config:** Must match trigger type configuration

### State Validation

- Must be one of: `IDLE`, `RUNNING`, `PAUSED`, `ERROR`
- Case-sensitive (all uppercase)

---

## Usage Examples

### Example 1: Simple Scheduled Bot

**Use Case:** Send daily summary email at 9 AM

```json
{
    "id": "daily_summary_email",
    "name": "Daily Summary Email Bot",
    "description": "Sends a summary of daily metrics to the team",
    "version": "1.0.0",
    "loop": {
        "type": "function_reference",
        "target": "email.send_summary",
        "args": {
            "recipients": ["team@example.com"],
            "template": "daily_summary"
        }
    },
    "interval": {
        "cron": "0 9 * * *",
        "timezone": "America/New_York"
    },
    "state": "IDLE",
    "triggers": [
        {
            "id": "morning_trigger",
            "type": "time_based",
            "enabled": true,
            "config": {
                "schedule": "0 9 * * *",
                "timezone": "America/New_York"
            }
        }
    ],
    "config": {
        "max_retries": 3,
        "timeout": 60000,
        "enabled": true,
        "logging": {
            "level": "info",
            "log_to_file": true
        }
    },
    "error_handling": {
        "on_error": "retry",
        "max_retries": 3,
        "backoff_strategy": "exponential",
        "alert_channels": ["slack:#alerts"]
    },
    "metadata": {
        "created_at": "2026-03-15T10:00:00Z",
        "created_by": "admin@example.com",
        "tags": ["email", "reporting", "daily"]
    }
}
```

### Example 2: Event-Driven Bot

**Use Case:** Process uploaded files immediately

```json
{
    "id": "file_processor_bot",
    "name": "File Processor",
    "description": "Processes files as soon as they are uploaded",
    "version": "2.1.0",
    "loop": {
        "type": "function_reference",
        "target": "files.process_upload",
        "args": {
            "validate": true,
            "generate_thumbnail": true
        }
    },
    "interval": {
        "fixed_rate": 1000
    },
    "state": "IDLE",
    "triggers": [
        {
            "id": "upload_event",
            "type": "event_based",
            "enabled": true,
            "config": {
                "event_source": "kafka",
                "event_type": "file.uploaded",
                "filter": {
                    "status": "pending"
                }
            }
        }
    ],
    "config": {
        "max_retries": 5,
        "timeout": 300000,
        "enabled": true
    },
    "error_handling": {
        "on_error": "retry",
        "max_retries": 5,
        "backoff_strategy": "exponential_with_jitter"
    },
    "metadata": {
        "tags": ["files", "processing", "event-driven"]
    }
}
```

### Example 3: Conditional Monitoring Bot

**Use Case:** Monitor disk space and alert when low

```json
{
    "id": "disk_monitor_bot",
    "name": "Disk Space Monitor",
    "description": "Monitors disk usage and alerts when exceeding threshold",
    "version": "1.0.0",
    "loop": {
        "type": "inline_code",
        "target": "const { execSync } = require('child_process'); const usage = execSync('df -h / | awk \\'NR==2{print $5}\\'').toString(); return parseInt(usage);",
        "language": "javascript"
    },
    "interval": {
        "fixed_rate": 60000
    },
    "state": "RUNNING",
    "triggers": [
        {
            "id": "disk_threshold",
            "type": "condition_based",
            "enabled": true,
            "config": {
                "condition": "disk_usage_percent > 85",
                "check_interval": 60000
            }
        }
    ],
    "config": {
        "custom": {
            "threshold_percent": 85,
            "alert_levels": {
                "warning": 75,
                "critical": 90
            }
        }
    },
    "error_handling": {
        "on_error": "alert",
        "alert_channels": ["pagerduty:disk-monitor", "slack:#ops"]
    },
    "metadata": {
        "tags": ["monitoring", "infrastructure", "alerts"]
    }
}
```

### Example 4: Multi-Trigger Bot

**Use Case:** Data sync with multiple trigger sources

```json
{
    "id": "multi_source_sync_bot",
    "name": "Multi-Source Data Sync",
    "description": "Synchronizes data from multiple sources",
    "version": "3.0.0",
    "loop": {
        "type": "external_module",
        "target": "module:sync_engine@run",
        "entry_point": "sync_all_sources"
    },
    "interval": {
        "fixed_rate": 300000
    },
    "state": "IDLE",
    "triggers": [
        {
            "id": "scheduled_sync",
            "type": "time_based",
            "enabled": true,
            "config": {
                "schedule": "*/30 * * * *"
            }
        },
        {
            "id": "webhook_trigger",
            "type": "event_based",
            "enabled": true,
            "config": {
                "event_source": "webhook",
                "event_type": "sync.requested"
            }
        },
        {
            "id": "manual_trigger",
            "type": "event_based",
            "enabled": true,
            "config": {
                "event_source": "api",
                "event_type": "manual.sync"
            }
        }
    ],
    "config": {
        "max_retries": 3,
        "timeout": 600000,
        "enabled": true
    },
    "error_handling": {
        "on_error": "retry",
        "max_retries": 3,
        "backoff_strategy": "exponential"
    },
    "metadata": {
        "tags": ["sync", "multi-source", "automation"]
    }
}
```

---

## Best Practices

### 1. Naming Conventions

**Bot IDs:**
- Use lowercase with underscores
- Include purpose or function
- Include version if multiple versions exist
- Examples: `"data_sync_v2"`, `"cleanup_bot"`, `"monitor_prod"`

**Bot Names:**
- Human-readable and descriptive
- Use title case
- Include action and purpose
- Examples: `"Data Sync Bot"`, `"Cleanup Automation"`, `"Production Monitor"`

### 2. State Management

**Best Practices:**
- Always initialize state to `IDLE` for new bots
- Transition to `PAUSED` instead of deleting temporarily disabled bots
- Use `ERROR` state to indicate problems requiring attention
- Never leave bots in `RUNNING` state when not actually running

### 3. Error Handling Strategies

**Choose the right strategy:**

| Strategy | Use Case |
|----------|----------|
| `retry` | Transient failures (network, API rate limits) |
| `continue` | Non-critical errors, can skip failed items |
| `stop` | Critical errors requiring manual intervention |
| `alert` | Errors that need visibility but shouldn't stop execution |

**Backoff Strategies:**
```json
{
    "backoff_strategy": "exponential_with_jitter",
    "backoff_base": 1000,
    "max_retries": 5
}
```

### 4. Trigger Design

**Multiple Triggers:**
```json
{
    "triggers": [
        {
            "id": "primary_schedule",
            "type": "time_based",
            "enabled": true
        },
        {
            "id": "manual_override",
            "type": "event_based",
            "enabled": true
        }
    ]
}
```

**Trigger Priority:**
- Event-based triggers fire immediately
- Time-based triggers fire on schedule
- Condition-based triggers check continuously

### 5. Interval Selection

**Guidelines:**
- Too frequent: Resource waste, API rate limits
- Too infrequent: Stale data, missed events
- Consider: Task duration, resource availability, external constraints

**Examples:**
- File cleanup: Daily or hourly (not real-time)
- API sync: Every 5-15 minutes (respect rate limits)
- Monitoring: Every 10-60 seconds (balance freshness vs load)
- Critical alerts: Event-based (immediate)

### 6. Configuration Management

**Externalize Configuration:**
```json
{
    "config": {
        "custom": {
            "api_endpoint": "${API_ENDPOINT}",
            "api_key": "${API_KEY}",
            "threshold": "${THRESHOLD}"
        }
    }
}
```

**Environment-Specific Configs:**
- Use different config values for dev/staging/prod
- Store secrets in environment variables
- Validate config at startup

### 7. Logging and Monitoring

**Recommended Logging:**
```json
{
    "config": {
        "logging": {
            "level": "info",
            "include_timestamps": true,
            "log_to_file": true
        }
    }
}
```

**Log Levels:**
- `debug`: Detailed loop execution info
- `info`: Normal execution, trigger fires
- `warn`: Retry attempts, minor issues
- `error`: Failed execution, error state
- `fatal`: Critical failures, bot stopped

### 8. Version Management

**Semantic Versioning:**
- `MAJOR`: Breaking changes (config structure, behavior)
- `MINOR`: New features (new triggers, config options)
- `PATCH`: Bug fixes, documentation

**Example Evolution:**
```json
// v1.0.0 - Initial release
// v1.1.0 - Added new trigger type
// v1.1.1 - Fixed retry bug
// v2.0.0 - Changed loop definition structure
```

---

## Implementation Guidelines

### Validation Implementation

```rust
use serde_json::Value;
use jsonschema::{JSONSchema, Draft};

fn validate_bot(bot: &Value) -> Result<(), Vec<String>> {
    let schema_json = include_str!("../schemas/bot-schema.json");
    let schema: Value = serde_json::from_str(schema_json)?;
    let compiled = JSONSchema::options()
        .with_draft(Draft::Draft202012)
        .compile(&schema)?;

    let result = compiled.validate(bot);

    if let Err(errors) = result {
        let error_messages: Vec<String> = errors
            .map(|e| e.to_string())
            .collect();
        return Err(error_messages);
    }

    Ok(())
}
```

### State Machine Implementation

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum BotState {
    Idle,
    Running,
    Paused,
    Error,
}

impl BotState {
    pub fn can_transition_to(&self, new_state: &BotState) -> bool {
        match (self, new_state) {
            (BotState::Idle, BotState::Running) => true,
            (BotState::Running, BotState::Idle) => true,
            (BotState::Running, BotState::Error) => true,
            (BotState::Error, BotState::Idle) => true,
            (BotState::Idle, BotState::Paused) => true,
            (BotState::Paused, BotState::Idle) => true,
            _ => false,
        }
    }
}
```

### Trigger Execution

```rust
pub struct TriggerExecutor {
    scheduler: Scheduler,
    event_bus: EventBus,
}

impl TriggerExecutor {
    pub async fn execute_triggers(&self, bot: &Bot) -> Result<()> {
        for trigger in &bot.triggers {
            if !trigger.enabled {
                continue;
            }

            match trigger.trigger_type {
                TriggerType::TimeBased => {
                    self.scheduler.schedule(bot, trigger).await?;
                }
                TriggerType::ConditionBased => {
                    self.monitor_condition(bot, trigger).await?;
                }
                TriggerType::EventBased => {
                    self.event_bus.subscribe(bot, trigger).await?;
                }
            }
        }
        Ok(())
    }
}
```

### Loop Execution

```rust
pub async fn execute_loop(bot: &Bot) -> Result<LoopResult> {
    let start = Instant::now();

    // Update state to running
    bot.set_state(BotState::Running).await?;

    // Execute based on loop type
    let result = match bot.loop_definition.type_ {
        LoopType::FunctionReference => {
            execute_function_reference(&bot.loop_definition).await?
        }
        LoopType::InlineCode => {
            execute_inline_code(&bot.loop_definition).await?
        }
        LoopType::ExternalModule => {
            execute_external_module(&bot.loop_definition).await?
        }
    };

    let duration = start.elapsed();

    // Update state back to idle
    bot.set_state(BotState::Idle).await?;

    Ok(LoopResult {
        success: result,
        duration,
        timestamp: Utc::now(),
    })
}
```

### Error Handling

```rust
pub async fn handle_bot_error(bot: &Bot, error: Error) -> Result<()> {
    match &bot.error_handling.on_error {
        OnErrorStrategy::Retry => {
            for attempt in 0..bot.error_handling.max_retries {
                let delay = calculate_backoff(
                    attempt,
                    &bot.error_handling.backoff_strategy,
                    bot.error_handling.backoff_base,
                );

                tokio::time::sleep(delay).await;

                if execute_loop(bot).await.is_ok() {
                    return Ok(());
                }
            }
            bot.set_state(BotState::Error).await?;
        }
        OnErrorStrategy::Continue => {
            log::error!("Bot {} error: {:?}", bot.id, error);
        }
        OnErrorStrategy::Stop => {
            bot.set_state(BotState::Error).await?;
        }
        OnErrorStrategy::Alert => {
            send_alerts(&bot.error_handling.alert_channels, &error).await?;
        }
    }
    Ok(())
}
```

---

## Schema Validation Tools

### Command Line Validation

```bash
# Validate a bot configuration
validate-bot --config bot-config.json

# Validate and show detailed errors
validate-bot --config bot-config.json --verbose

# Validate multiple bots
validate-bot --directory ./bots/
```

### Programmatic Validation

```python
import json
from jsonschema import validate, Draft202012Validator

def validate_bot(bot_config):
    with open('bot-schema.json') as f:
        schema = json.load(f)

    validator = Draft202012Validator(schema)
    errors = list(validator.iter_errors(bot_config))

    if errors:
        for error in errors:
            print(f"Validation error: {error.message}")
            print(f"Path: {list(error.path)}")
        return False

    return True
```

---

## Migration from Claw to Bot

**When to Migrate:**
- You don't need ML capabilities
- Performance is critical
- Resource constraints exist
- Tasks are simple and repetitive

**Migration Steps:**
1. Remove model-related fields
2. Convert intelligent logic to simple loops
3. Replace reasoning with rule-based logic
4. Simplify error handling
5. Remove learning/adaptation code

**Example Migration:**

Before (Claw):
```json
{
    "model": "decision_tree_v1",
    "capabilities": ["classification", "learning"],
    "feedback_loop": true
}
```

After (Bot):
```json
{
    "loop": {
        "type": "function_reference",
        "target": "rules.classify",
        "args": {
            "threshold": 0.75
        }
    }
}
```

---

## Frequently Asked Questions

**Q: Can a Bot become a Claw later?**
A: Yes, but requires migration. Add model field and convert loop to use ML inference.

**Q: What's the performance difference?**
A: Bots are 10-100x faster than Claws (no model loading/inference overhead).

**Q: Can I have both Bot and Claw in same system?**
A: Absolutely! They complement each other. Use Bots for automation, Claws for intelligence.

**Q: How do I choose between Bot and Claw?**
A: Ask: "Does this need to learn or make complex decisions?" If yes → Claw. If no → Bot.

**Q: Can Bots trigger Claws?**
A: Yes! A common pattern is Bot (automation) → triggers → Claw (intelligence).

**Q: What happens if a Bot crashes?**
A: It transitions to ERROR state. Based on error_handling config, it may retry, alert, or stop.

---

## Additional Resources

- **Schema File:** `claw/schemas/bot-schema.json`
- **Examples:** `claw/examples/bots/`
- **Tests:** `claw/tests/bot_schema_tests.rs`
- **Related:**
  - Claw Schema: `claw/schemas/claw-schema.json`
  - Automation Best Practices: `claw/docs/AUTOMATION_GUIDE.md`

---

**Document Version:** 1.0.0
**Last Updated:** 2026-03-15
**Maintainer:** SuperInstance Team

**Note:** This schema is designed for simplicity and performance. For complex AI-powered tasks, refer to the Claw schema documentation.