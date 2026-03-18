# SpreadsheetMoment User Guide

**Version:** 1.0.0
**Last Updated:** 2026-03-17
**Audience:** End Users

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Spreadsheet Basics](#spreadsheet-basics)
3. [Working with Cells](#working-with-cells)
4. [Creating Agents](#creating-agents)
5. [Claw Integration](#claw-integration)
6. [Equipment Management](#equipment-management)
7. [Formulas and Functions](#formulas-and-functions)
8. [Collaboration](#collaboration)
9. [Templates](#templates)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)
12. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Getting Started

### What is SpreadsheetMoment?

SpreadsheetMoment is an intelligent spreadsheet platform that combines traditional spreadsheet functionality with AI-powered agents called "Claws". These agents can monitor cells, make decisions, and automate workflows.

### Creating Your Account

1. Visit https://spreadsheetmoment.com
2. Click "Sign Up" in the top right
3. Enter your email and create a password
4. Verify your email address
5. Complete your profile

### Interface Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Menu Bar    │  Spreadsheet Name    │  Share  │  Profile   │
├─────────────────────────────────────────────────────────────┤
│  Toolbar                                                     │
│  [Bold] [Italic] [Align] [Formula] [Agent] [Equipment]     │
├─────────────────────────────────────────────────────────────┤
│        │  A    │  B    │  C    │  D    │  E    │           │
│   ─────┼───────┼───────┼───────┼───────┼───────┤           │
│    1   │ [A1]  │  B1   │  C1   │       │       │           │
│    2   │  A2   │  B2   │  C2   │       │       │           │
│    3   │  A3   │  B3   │  C3   │       │       │           │
│        │       │       │       │       │       │           │
├─────────────────────────────────────────────────────────────┤
│  Status Bar  │  Agent Status  │  Cell Info  │  Zoom        │
└─────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Cell** | Basic unit containing data or formulas |
| **Agent** | AI-powered monitor attached to a cell |
| **Claw** | Advanced agent with ML capabilities |
| **Equipment** | Modules that extend agent capabilities |
| **Trigger** | Event that activates an agent |

---

## Spreadsheet Basics

### Creating a New Spreadsheet

1. Click the "+" button in the sidebar
2. Select "New Spreadsheet"
3. Choose a template or start blank
4. Name your spreadsheet

### Opening an Existing Spreadsheet

1. Click "My Spreadsheets" in the sidebar
2. Browse or search for your spreadsheet
3. Click to open

### Saving Your Work

SpreadsheetMoment auto-saves every 30 seconds. You can also manually save:

- **Windows/Linux:** `Ctrl + S`
- **Mac:** `Cmd + S`

### Sharing Spreadsheets

1. Click the "Share" button in the top right
2. Enter email addresses of collaborators
3. Set permissions (View, Edit, Admin)
4. Click "Send Invites"

---

## Working with Cells

### Selecting Cells

- **Single cell:** Click on the cell
- **Range:** Click and drag across multiple cells
- **Row/Column:** Click on the row number or column letter
- **All cells:** Click the top-left corner button

### Entering Data

1. Click on a cell
2. Type your data
3. Press `Enter` to confirm or `Escape` to cancel

### Editing Cells

1. Double-click on a cell
2. Make your changes
3. Press `Enter` to save

### Cell Formatting

**Text Formatting:**
- **Bold:** `Ctrl/Cmd + B`
- **Italic:** `Ctrl/Cmd + I`
- **Underline:** `Ctrl/Cmd + U`

**Cell Formatting:**
1. Select cell(s)
2. Right-click > Format Cells
3. Choose formatting options:
   - Number format
   - Date format
   - Currency
   - Background color
   - Text color

### Cell References

| Reference Type | Example | Description |
|----------------|---------|-------------|
| Relative | A1 | Changes when copied |
| Absolute | $A$1 | Never changes |
| Mixed | $A1 or A$1 | Partially fixed |
| Range | A1:B10 | Multiple cells |

---

## Creating Agents

### What is an Agent?

Agents are AI-powered monitors that can:
- Watch cell values for changes
- Execute logic when triggered
- Update other cells
- Send notifications

### Agent Types

| Type | Description | Use Case |
|------|-------------|----------|
| **SENSOR** | Monitors data changes | Data validation, alerts |
| **BOT** | Simple automation loop | Periodic updates, polling |
| **SMP** | Advanced ML-powered | Complex decisions, predictions |

### Creating a Basic Agent

1. **Select a cell** where you want the agent
2. **Right-click** and select "Create Agent"
3. **Choose agent type** (SENSOR, BOT, or SMP)
4. **Configure the agent:**
   - Enter a purpose/seed description
   - Select triggers
   - Configure equipment (optional)
5. **Click "Create"**

### Example: Temperature Monitor

```
Cell: A1 (Temperature value)
Agent Type: SENSOR
Seed: "Monitor temperature and alert if exceeds 100 degrees"
Trigger: On data change
Equipment: MEMORY, REASONING
```

### Agent States

| State | Description |
|-------|-------------|
| **DORMANT** | Waiting for trigger |
| **THINKING** | Processing/analyzing |
| **NEEDS_REVIEW** | Waiting for human approval |
| **POSTED** | Completed and posted results |
| **ERROR** | Encountered an error |
| **ARCHIVED** | Disabled/inactive |

### Triggering Agents

**Automatic Triggers:**
- Data change in monitored cell
- Schedule (e.g., every 5 minutes)
- Formula dependency change

**Manual Trigger:**
1. Click on the agent cell
2. Click the "Trigger" button in the toolbar
3. Or use keyboard shortcut: `Ctrl/Cmd + Shift + T`

### Viewing Agent Results

1. Click on the agent cell
2. Open the "Agent Details" panel
3. View:
   - Current state
   - Execution history
   - Reasoning steps
   - Results

---

## Claw Integration

### What is a Claw?

A Claw is an advanced agent with ML capabilities:
- Learns from data
- Makes predictions
- Can coordinate with other Claws
- Uses specialized equipment

### Creating a Claw

1. **Select a cell**
2. **Right-click** > "Create Claw"
3. **Configure:**
   ```
   Type: SMP
   Model: deepseek-chat
   Seed: "Analyze sales trends and predict future values"
   Equipment: [MEMORY, REASONING, CONSENSUS]
   ```
4. **Click "Create Claw"**

### Claw Configuration

**Model Selection:**
- `deepseek-chat` - General purpose
- `deepseek-coder` - Code-focused
- Custom models available

**Seed Definition:**
The seed is a natural language description of the Claw's purpose:

```
Purpose: Monitor inventory levels
Trigger: When stock < reorder_point
Action: Generate purchase order
Learning: Optimize reorder points based on sales history
```

**Equipment Slots:**
Claws have 6 equipment slots:
1. MEMORY - State persistence
2. REASONING - Decision making
3. CONSENSUS - Multi-agent agreement
4. COORDINATION - Swarm orchestration
5. SPREADSHEET - Cell interface
6. DISTILLATION - Model compression

### Social Coordination

Claws can work together:

**Master-Slave:**
```
Master Claw (A1)
  ├── Slave Claw (A2) - Parallel task 1
  └── Slave Claw (A3) - Parallel task 2
```

**Co-Workers:**
```
Claw A (A1) ←→ Claw B (B1)
  Both collaborate on shared task
```

**Coordination Strategies:**
- `PARALLEL` - Execute simultaneously
- `SEQUENTIAL` - Execute in order
- `CONSENSUS` - All must agree
- `MAJORITY_VOTE` - Majority wins

---

## Equipment Management

### Available Equipment

| Equipment | Purpose | Cost |
|-----------|---------|------|
| **MEMORY** | Store and recall information | Low |
| **REASONING** | Complex decision making | Medium |
| **CONSENSUS** | Multi-agent agreement | Medium |
| **COORDINATION** | Orchestrate multiple agents | High |
| **SPREADSHEET** | Advanced cell operations | Low |
| **DISTILLATION** | Compress/optimize models | High |

### Equipping Equipment

1. Click on your agent/claw
2. Click "Manage Equipment"
3. Check the equipment you want
4. Click "Save"

### Muscle Memory

When you unequip equipment, SpreadsheetMoment extracts "muscle memory" triggers:

```
Equipment: REASONING unequipped
Muscle Memory Trigger:
  - Condition: "Complex decision needed"
  - Action: "Auto-reequip REASONING"
```

This ensures the agent re-equips equipment when needed.

---

## Formulas and Functions

### Basic Formulas

Start formulas with `=`:

```
=SUM(A1:A10)          Sum of range
=AVERAGE(B1:B10)      Average of range
=MAX(C1:C10)          Maximum value
=MIN(D1:D10)          Minimum value
=COUNT(E1:E10)        Count of cells
```

### Logical Functions

```
=IF(A1>100, "High", "Low")
=AND(A1>0, B1>0)
=OR(A1="Yes", A1="Y")
=NOT(A1="No")
```

### Text Functions

```
=CONCATENATE(A1, " ", B1)
=LEFT(A1, 5)
=RIGHT(A1, 3)
=LEN(A1)
=UPPER(A1)
=LOWER(A1)
```

### Agent Functions

```
=AGENT_STATE(A1)              Get agent state
=AGENT_RESULT(A1)             Get last result
=TRIGGER_AGENT(A1)            Manually trigger
=EQUIPMENT_STATUS(A1, "MEM")  Check equipment
```

### Custom Functions

Create custom functions using agents:

1. Define function in agent seed
2. Use `=CUSTOM_FUNC(args)`
3. Agent processes and returns result

---

## Collaboration

### Real-Time Collaboration

Multiple users can edit simultaneously:
- See other users' cursors
- Changes sync in real-time
- No conflicts

### Comments

1. Right-click on a cell
2. Select "Add Comment"
3. Type your comment
4. @mention collaborators for notifications

### Version History

1. Click "File" > "Version History"
2. Browse previous versions
3. Click to preview
4. "Restore" to revert

### Sharing Settings

| Permission | Capabilities |
|------------|--------------|
| **View** | View only, no edits |
| **Comment** | View + add comments |
| **Edit** | Full editing rights |
| **Admin** | Edit + manage sharing |

---

## Templates

### Using Templates

1. Click "New Spreadsheet"
2. Browse template gallery
3. Select a template
4. Customize as needed

### Available Templates

- **Budget Tracker** - Personal finance
- **Project Management** - Task tracking
- **Inventory System** - Stock management
- **Sales Pipeline** - CRM functionality
- **Agent Dashboard** - Monitor multiple agents

### Creating Custom Templates

1. Create your spreadsheet
2. Click "File" > "Save as Template"
3. Name and describe your template
4. Choose sharing settings

---

## Best Practices

### Agent Design

1. **Clear Purpose:** Write detailed seed descriptions
2. **Right Equipment:** Only equip what's needed
3. **Test Thoroughly:** Test before deploying
4. **Monitor Performance:** Check execution history

### Performance

1. **Limit Agents:** Don't create unnecessary agents
2. **Batch Updates:** Group cell updates when possible
3. **Use Triggers Wisely:** Avoid overly sensitive triggers
4. **Clean Up:** Archive unused agents

### Security

1. **Review Sharing:** Regularly audit who has access
2. **Use Equipment Carefully:** Some equipment has elevated access
3. **Validate Inputs:** Ensure agents validate incoming data
4. **Backup Regularly:** Export important spreadsheets

---

## Troubleshooting

### Common Issues

**Agent Not Triggering:**
- Check trigger configuration
- Verify agent is in DORMANT state
- Check for conflicting agents

**Slow Performance:**
- Reduce number of active agents
- Check for circular formula references
- Clear browser cache

**WebSocket Disconnected:**
- Check internet connection
- Refresh the page
- Check firewall settings

### Error Messages

| Error | Solution |
|-------|----------|
| "Agent creation failed" | Check API configuration |
| "Equipment unavailable" | Verify equipment compatibility |
| "Rate limit exceeded" | Wait and retry |
| "Invalid cell reference" | Check formula syntax |

### Getting Help

1. **Help Center:** https://help.spreadsheetmoment.com
2. **Community Forum:** https://community.spreadsheetmoment.com
3. **Support Email:** support@spreadsheetmoment.com
4. **In-App Help:** Click "?" icon

---

## Keyboard Shortcuts

### Navigation

| Shortcut | Action |
|----------|--------|
| `Arrow Keys` | Move cell selection |
| `Tab` | Move to next cell |
| `Shift + Tab` | Move to previous cell |
| `Ctrl/Cmd + Home` | Go to A1 |
| `Ctrl/Cmd + End` | Go to last cell |
| `Ctrl/Cmd + G` | Go to specific cell |

### Editing

| Shortcut | Action |
|----------|--------|
| `Enter` | Confirm edit |
| `Escape` | Cancel edit |
| `Delete` | Clear cell |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + C` | Copy |
| `Ctrl/Cmd + V` | Paste |
| `Ctrl/Cmd + X` | Cut |

### Formatting

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + B` | Bold |
| `Ctrl/Cmd + I` | Italic |
| `Ctrl/Cmd + U` | Underline |
| `Ctrl/Cmd + Shift + L` | Left align |
| `Ctrl/Cmd + Shift + E` | Center align |
| `Ctrl/Cmd + Shift + R` | Right align |

### Agents

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Shift + A` | Create agent |
| `Ctrl/Cmd + Shift + T` | Trigger agent |
| `Ctrl/Cmd + Shift + E` | Manage equipment |
| `Ctrl/Cmd + Shift + D` | View agent details |

---

## Glossary

| Term | Definition |
|------|------------|
| **Agent** | AI-powered monitor attached to a cell |
| **Claw** | Advanced agent with ML capabilities |
| **Equipment** | Modules that extend agent capabilities |
| **Seed** | Natural language description of agent purpose |
| **Trigger** | Event that activates an agent |
| **Muscle Memory** | Automatic re-equip triggers |
| **Coordination** | Multi-agent collaboration |
| **WebSocket** | Real-time communication protocol |

---

## Feedback

We're constantly improving SpreadsheetMoment! Share your feedback:

- **Feature Requests:** https://feedback.spreadsheetmoment.com
- **Bug Reports:** support@spreadsheetmoment.com
- **General Feedback:** Use the in-app feedback button

---

**Happy Spreadsheet-ing!**

---

**Document Version:** 1.0.0
**Last Updated:** March 17, 2026
**Next Review:** June 17, 2026
