# Box Visualization & Inspection UI - Breakdown Engine Round 3

**"Making the Invisible Visible: UI for Inspecting Fractured AI Boxes"**

---

## Executive Summary

This document specifies the user interface for visualizing and inspecting **Fractured AI Boxes** - discrete, composable containers that transform AI reasoning steps into inspectable, modifiable, and reusable units.

**Core Philosophy**: Every box should be immediately understandable at a glance, with deep inspection available on demand.

### Key Design Principles

1. **Immediate Comprehension** - Box purpose and status visible in <1 second
2. **Progressive Disclosure** - Show summary first, details on demand
3. **Real-Time Feedback** - Live updates during execution
4. **Seamless Integration** - Works naturally in spreadsheet side panel

---

## Table of Contents

1. [Visual Design System](#1-visual-design-system)
2. [Box Card Component](#2-box-card-component)
3. [Box Inspector Panel](#3-box-inspector-panel)
4. [Execution Visualizer](#4-execution-visualizer)
5. [Composition Graph](#5-composition-graph)
6. [Parameter Editor](#6-parameter-editor)
7. [State Inspector](#7-state-inspector)
8. [Export/Import System](#8-exportimport-system)
9. [TypeScript Interfaces](#9-typescript-interfaces)
10. [Spreadsheet Integration](#10-spreadsheet-integration)

---

## 1. Visual Design System

### 1.1 Color Palette

Box categories use distinct colors for instant recognition:

```
REASONING BOXES (Cognitive Operations)
├─ Observation:     #3B82F6 (Blue 500)      👁️
├─ Analysis:        #8B5CF6 (Purple 500)    🔍
├─ Inference:       #F97316 (Orange 500)    🧠
├─ Action:          #EAB308 (Yellow 500)    ⚡
├─ Verification:    #22C55E (Green 500)     ✓
├─ Comparison:      #6366F1 (Indigo 500)    ⚖️
├─ Contingency:     #EF4444 (Red 500)       🛡️
├─ Synthesis:       #14B8A6 (Teal 500)      🔄
└─ Decomposition:   #EC4899 (Pink 500)      ✂️

ACTION BOXES (External Operations)
└─ #F59E0B (Amber 500)                    🌐

DATA BOXES (Data Transformations)
└─ #06B6D4 (Cyan 500)                     📊

CONTROL BOXES (Flow Control)
└─ #8B5CF6 (Violet 500)                   ➡️

VALIDATE BOXES (Quality Assurance)
└─ #10B981 (Emerald 500)                  ✓

METADATA BOXES (Documentation)
└─ #64748B (Slate 500)                    📝
```

### 1.2 Status Indicators

```
STATUS DOT          COLOR            MEANING
────────────────────────────────────────────────
🟢 Green dot       #22C55E          Ready / Success
🟡 Yellow dot      #EAB308          Running / Warning
🔴 Red dot         #EF4444          Error / Failed
🔵 Blue dot        #3B82F6          Cached
⚪ White dot       #FFFFFF          Not executed
🟣 Purple dot      #A855F7          Distilled
```

### 1.3 Typography

```typescript
const typography = {
  // Box title
  boxTitle: {
    fontFamily: 'Inter, system-ui',
    fontWeight: 600,
    fontSize: '14px',
    lineHeight: '20px',
  },

  // Box summary
  boxSummary: {
    fontFamily: 'Inter, system-ui',
    fontWeight: 400,
    fontSize: '12px',
    lineHeight: '16px',
    color: '#64748B',
  },

  // Metrics
  metrics: {
    fontFamily: 'JetBrains Mono, monospace',
    fontWeight: 500,
    fontSize: '11px',
    lineHeight: '14px',
  },

  // Code
  code: {
    fontFamily: 'JetBrains Mono, monospace',
    fontWeight: 400,
    fontSize: '11px',
    lineHeight: '16px',
  },
};
```

### 1.4 Spacing & Layout

```
┌─────────────────────────────────────────────┐
│  BOX CARD LAYOUT                             │
├─────────────────────────────────────────────┤
│                                              │
│  ┌─ HEADER (36px) ─────────────────────┐   │
│  │ [Icon] Title                    [Dot] │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌─ SUMMARY (auto) ────────────────────┐   │
│  │ One-line description of what this   │   │
│  │ box does...                          │   │
│  │                                       │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  ┌─ METRICS (20px) ────────────────────┐   │
│  │ ⚡ 45ms  💰 $0.002  ✅ 98.5%          │   │
│  └───────────────────────────────────────┘   │
│                                              │
│  ┌─ INPUTS/OUTPUTS (auto) ─────────────┐   │
│  │ 📥 data: unknown                     │   │
│  │ 📤 result: string[]                  │   │
│  └───────────────────────────────────────┘   │
│                                              │
└─────────────────────────────────────────────┘

PADDING: 12px
BORDER_RADIUS: 8px
SHADOW: 0 1px 3px rgba(0,0,0,0.1)
```

---

## 2. Box Card Component

### 2.1 Compact Box Card

For spreadsheet cell display and list views:

```
┌─────────────────────────────────────┐
│ 👁️  OBSERVATION        🟢          │
│ Extract sales data                  │
│ ⚡ 45ms  💰 $0.002  ✅ 98.5%        │
└─────────────────────────────────────┘

WIDTH: 280px
HEIGHT: 72px
```

**TypeScript Interface:**

```typescript
interface BoxCardProps {
  box: AIBox;
  compact?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

export const BoxCard: React.FC<BoxCardProps> = ({
  box,
  compact = false,
  onClick,
  selected = false,
}) => {
  const status = box.getState().status;
  const metrics = box.getHistory();

  return (
    <div
      className={cn(
        "box-card",
        `box-${box.category}`,
        `status-${status}`,
        selected && "selected",
        compact && "compact"
      )}
      onClick={onClick}
      style={{
        borderLeft: `4px solid ${box.color}`,
      }}
    >
      {/* Header */}
      <div className="box-header">
        <span className="box-icon">{box.icon}</span>
        <span className="box-type">{box.type}</span>
        <StatusDot status={status} />
      </div>

      {/* Summary */}
      {!compact && (
        <p className="box-summary">{box.summary}</p>
      )}

      {/* Metrics */}
      <div className="box-metrics">
        <Metric icon="⚡" value={metrics.avgDuration} unit="ms" />
        <Metric icon="💰" value={metrics.avgCost} unit="$" />
        <Metric icon="✅" value={(metrics.successRate * 100).toFixed(1)} unit="%" />
      </div>
    </div>
  );
};
```

### 2.2 Detailed Box Card

For inspector panel and detailed views:

```
┌─────────────────────────────────────────────────────────────────┐
│ 👁️  OBSERVATION                                   🟢 Ready    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Extracts sales figures from Q3 report                           │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  📥 INPUTS                         📤 OUTPUTS                      │
│  • report: string (required)        • revenue: number            │
│    The Q3 sales report text          • growth: number             │
│                                     • customers: number           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  ⚙️  PARAMETERS                                                      │
│  • format: 'json' | 'csv' | 'excel'  [json ▼]                     │
│  • quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'  [Q3 ▼]                     │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  📊 PERFORMANCE                           🔗 CONNECTIONS           │
│  Executions: 1,234                     ← FileReadBox              │
│  Avg Duration: 45ms                     → AnalysisBox               │
│  Success Rate: 98.5%                   → InferenceBox              │
│  Cost: $0.002 per execution                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

WIDTH: 400px
HEIGHT: auto (min 320px)
```

### 2.3 Execution Status Badge

Real-time status during box execution:

```
┌─────────────────────────────────────┐
│  EXECUTING...  ▓▓▓▓▓░░░░░  45%     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ✅ COMPLETED  2.3s  $0.002        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ❌ ERROR  Invalid input format     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ⏸️  WAITING  For upstream box      │
└─────────────────────────────────────┘
```

---

## 3. Box Inspector Panel

### 3.1 Panel Layout

Side panel for detailed box inspection:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Box Inspector                              [×]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [📋 Overview] [🔌 Interface] [⚙️ Parameters] [📊 Metrics]    │
│  [🕐 History] [🔗 Connections] [✏️ Edit]                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  OVERVIEW                                                  │ │
│  │  ─────────────────────────────────────────────────────  │ │
│  │  This box extracts sales metrics from quarterly           │ │
│  │  reports. It supports multiple file formats and           │ │
│  │  automatically detects the report structure.             │ │
│  │                                                           │ │
│  │  **Use Cases:**                                           │ │
│  │  • Quarterly revenue reporting                            │ │
│  │  • Sales trend analysis                                   │ │
│  │  • Financial dashboard updates                            │ │
│  │                                                           │ │
│  │  **Limitations:**                                         │ │
│  │  • Requires structured report format                      │ │
│  │  • Supports Q1-Q4 quarters only                          │ │
│  │  • Max file size: 10MB                                    │ │
│  │                                                           │ │
│  │  **Version:** 1.0.0  |  **Author:** system                │ │
│  │  **Created:** 2024-03-08  |  **Modified:** 2h ago          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [⬇️ Show Implementation Details]                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

WIDTH: 480px
MAX-HEIGHT: 80vh
```

### 3.2 Tab Content

#### Overview Tab

```
┌─────────────────────────────────────────────────────────────┐
│  OVERVIEW                                                      │
│  ────────────────────────────────────────────────────────  │
│                                                                │
│  📦 BOX TYPE                                                   │
│  ObservationBox (Reasoning)                                    │
│                                                                │
│  📝 DESCRIPTION                                                │
│  Extracts observations from input data using pattern          │
│  matching, LLM-assisted extraction, or hybrid approach.      │
│                                                                │
│  🎯 PURPOSE                                                     │
│  Identifies and extracts direct observations or facts from     │
│  input data for further analysis.                              │
│                                                                │
│  💡 TYPICAL USAGE                                              │
│  • Extract facts from documents                                │
│  • Identify patterns in data                                   │
│  • Parse structured information                                │
│  • Generate observations from text                              │
│                                                                │
│  ⚠️ CONSTRAINTS                                                 │
│  • Max observations: 10                                         │
│  • Input size: <1MB                                            │
│  • Extraction methods: pattern, llm, hybrid                    │
│                                                                │
│  🏷️  TAGS                                                       │
│  #reasoning #observation #extraction #facts                    │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Interface Tab

```
┌─────────────────────────────────────────────────────────────┐
│  INTERFACE                                                     │
│  ────────────────────────────────────────────────────────  │
│                                                                │
│  📥 INPUTS (1)                                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ data: unknown (required)                                 │ │
│  │                                                           │ │
│  │ Input data to observe                                    │ │
│  │                                                           │ │
│  │ Examples:                                                 │ │
│  │ • { report: "Q3 sales show $1.2M revenue" }            │ │
│  │ • { metrics: { users: 1000, revenue: 50000 } }         │ │
│  │                                                           │ │
│  │ Validation: Required, non-null                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  📤 OUTPUTS (1)                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ observations: string[] (guaranteed)                      │ │
│  │                                                           │ │
│  │ Extracted observations                                   │ │
│  │                                                           │ │
│  │ Examples:                                                 │ │
│  │ • ["Revenue is $1.2M", "Growth is 15%"]                │ │
│  │ • ["Users: 1000", "Revenue: $50000"]                     │ │
│  │                                                           │ │
│  │ Guaranteed: Yes                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ⚙️  PARAMETERS (2)                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ extractionMethod: 'pattern' | 'llm' | 'hybrid'         │ │
│  │                                                           │ │
│  │ How to extract observations                              │ │
│  │                                                           │ │
│  │ Default: pattern  Tunable: Yes  Sensitive: No           │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ maxObservations: number (1-100)                         │ │
│  │                                                           │ │
│  │ Maximum observations to extract                          │ │
│  │                                                           │ │
│  │ Default: 10  Tunable: Yes  Sensitive: No                │ │
│  │ Range: [1, 100]                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Metrics Tab

```
┌─────────────────────────────────────────────────────────────┐
│  METRICS                                                        │
│  ────────────────────────────────────────────────────────  │
│                                                                │
│  📊 EXECUTION STATISTICS                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Total Executions: 1,234                               │ │
│  │  Success Rate: 98.5%                                   │ │
│  │  Failure Rate: 1.5%                                    │ │
│  │                                                           │ │
│  │  Duration (ms)              Cost ($)                     │ │
│  │  ┌──────────────┬─────────┐  ┌──────────────┬─────────┐│ │
│  │  │ Avg:   45ms  │ ████   │  │ Avg:   $0.002│ ████   ││ │
│  │  │ P50:  42ms   │ ████   │  │ Total:$2.468 │ ██████ ││ │
│  │  │ P95:  68ms   │ ██████ │  │ Per:$0.002  │ ████   ││ │
│  │  │ P99:  89ms   │ ███████│  │             │         ││ │
│  │  └──────────────┴─────────┘  └──────────────┴─────────┘│ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  📈 TREND (Last 30 Days)                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  Success Rate ████████████████████ 98.5%               │ │
│  │  Avg Latency  ████ 45ms (↓ 12% vs last 30d)            │ │
│  │  Cost/Exec   █████ $0.002                               │ │
│  │                                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ⚠️  RECENT ISSUES (2)                                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • 2024-03-08 14:28 - Empty output (0.5s)               │ │
│  │   Likely cause: Malformed input                         │ │
│  │ • 2024-03-07 09:15 - Timeout (5.0s)                    │ │
│  │   Likely cause: API rate limit                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

#### History Tab

```
┌─────────────────────────────────────────────────────────────┐
│  EXECUTION HISTORY                                            │
│  ────────────────────────────────────────────────────────  │
│                                                                │
│  🔍 Filter: [All ▼]  [Last 100 ▼]  [Export CSV]            │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 2024-03-08 14:32:15  ✅ Success  45ms  $0.002   [View] │ │
│  │ Input: { report: "Q3 Sales..." }                        │ │
│  │ Output: ["Revenue: $1.2M", "Growth: 15%", ...]         │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 2024-03-08 14:30:22  ✅ Success  43ms  $0.002   [View] │ │
│  │ Input: { report: "Q3 Sales..." }                        │ │
│  │ Output: ["Revenue: $1.2M", "Growth: 15%", ...]         │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 2024-03-08 14:28:11  ❌ Error    12ms  $0.000   [View] │ │
│  │ Input: { report: null }                                 │ │
│  │ Error: Input data is required                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 2024-03-08 14:25:33  ✅ Success  47ms  $0.002   [View] │ │
│  │ Input: { report: "Q3 Sales..." }                        │ │
│  │ Output: ["Revenue: $1.2M", "Growth: 15%", ...]         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Load More...]                                               │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Connections Tab

```
┌─────────────────────────────────────────────────────────────┐
│  CONNECTIONS                                                   │
│  ────────────────────────────────────────────────────────  │
│                                                                │
│  ◀ UPSTREAM (2)                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 📄 FileReadBox "Load Q3 report"                    [→]  │ │
│  │ Provides: report: string                                │ │
│  │ Strength: 0.92  Usage: 234 times                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🔍 FilterBox "Remove duplicates"                  [→]  │ │
│  │ Provides: data: unknown                                │ │
│  │ Strength: 0.78  Usage: 89 times                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ▶ DOWNSTREAM (2)                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🔍 AnalysisBox "Calculate growth rate"            [→]  │ │
│  │ Consumes: observations: string[]                        │ │
│  │ Strength: 0.95  Usage: 456 times                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🧠 InferenceBox "Identify trends"                  [→]  │ │
│  │ Consumes: observations: string[]                        │ │
│  │ Strength: 0.87  Usage: 123 times                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  [🔗 View Full Graph]  [+ Add Connection]                     │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

#### Edit Tab

```
┌─────────────────────────────────────────────────────────────┐
│  EDIT BOX                                                      │
│  ────────────────────────────────────────────────────────  │
│                                                                │
│  ⚠️  Editing affects all workflows using this box.          │
│     Consider creating a copy instead.                         │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Name                                                      │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ Extract sales data                                  │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Summary                                                   │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ Extracts sales figures from Q3 report               │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Description                                               │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ Parses the Q3 sales report and extracts key        │ │ │
│  │ │ metrics: revenue, growth, and customer count.     │ │ │
│  │ │                                           [Expand] ▼│ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Advanced Parameters...]  [Change Implementation...]         │
│                                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                │
│  [Reset]  [Preview Changes]  [Save]  [Cancel]                │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Execution Visualizer

### 4.1 Real-Time Execution View

Watch boxes execute in real-time:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ Execution Monitor                              [Stop] [Pause] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Workflow: Code Review Pipeline                                │
│  Started: 2s ago  |  Boxes: 3/7  |  ETA: 5s                     │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  ✅ FileReadBox "Load code file"                     ✅ 0.5s    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Input: { path: "src/app.js" }                           │  │
│  │ Output: { content: "function...", size: 2048 }          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                  │
│                             ▼                                  │
│  ✅ ObservationBox "Extract code structure"            ✅ 1.2s    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Input: { content: "function..." }                        │  │
│  │ Output: ["functions: 3", "classes: 1", "imports: 5"]      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                  │
│                             ▼                                  │
│  ⏳ AnalysisBox "Analyze code patterns"              ▓▓▓▓▓░  2s│
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Status: Analyzing patterns...                           │  │
│  │ Progress: Extracting anti-patterns                      │  │
│  │                                                           │  │
│  │ 📊 Token Usage: 1,234 / 2,000                           │  │
│  │ 💰 Cost: $0.003                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                  │
│                             ▼                                  │
│  ⏸️  InferenceBox "Identify potential bugs"            (waiting) │
│                                                                  │
│  ⏸️  VerificationBox "Validate bug reports"         (waiting) │
│                                                                  │
│  ⏸️  SynthesisBox "Generate recommendations"        (waiting) │
│                                                                  │
│  ⏸️  CommentBox "Format review report"             (waiting) │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  📊 TOTAL: 2s  |  💰 $0.005  |  ✅ 2/7  |  ⏳ 1  |  ⏸️  4      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

HEIGHT: 600px
AUTO-SCROLL: Yes
```

### 4.2 Execution Timeline

Horizontal timeline view:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⏱️  Execution Timeline                           [View List ▼]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Total: 8.5s  |  Boxes: 7  |  Parallel: 2  |  Cost: $0.015       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  FileRead              Observation        Analysis        │ │
│  │  ████                  ██████             ████████████    │ │
│  │  0.5s                  1.2s                3.5s            │ │
│  │  $0.001                $0.002              $0.005           │ │
│  │                                                                 │
│  │  ████████████         ████████████                      │ │
│  │  Filter               Map                                 │ │
│  │  1.8s                 2.1s                                │ │
│  │  $0.003               $0.004                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  0s    1s    2s    3s    4s    5s    6s    7s    8s    9s       │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤      │
│                                                                  │
│  [Zoom In]  [Zoom Out]  [Fit]  [Export]                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Performance Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Performance Dashboard                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WORKFLOW METRICS                                                │
│  ┌────────────────────┬────────────────────┬────────────────────┐ │
│  │ Total Duration     │ Total Cost         │ Boxes Executed    │ │
│  │ 8.5s               │ $0.015             │ 7 / 7             │ │
│  │ ████████████       │ ████               │ ████████████████ │ │
│  └────────────────────┴────────────────────┴────────────────────┘ │
│                                                                  │
│  LATENCY BREAKDOWN (P95)                                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ FileRead        ████████ 0.5s (6%)                         │ │
│  │ Observation    ██████████████ 1.2s (14%)                   │ │
│  │ Analysis       ██████████████████████████████ 3.5s (41%)     │ │
│  │ Inference      ████ 0.8s (9%)                              │ │
│  │ Verification   ████ 0.6s (7%)                              │ │
│  │ Synthesis      ██████████████ 1.2s (14%)                   │ │
│  │ Comment        ████ 0.7s (8%)                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  COST BREAKDOWN                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Analysis       $0.005 (33%)   ████████████                │ │
│  │ Observation    $0.002 (13%)   ████                        │ │
│  │ Synthesis      $0.002 (13%)   ████                        │ │
│  │ FileRead       $0.001 (7%)    ███                         │ │
│  │ Other          $0.005 (34%)   ██████████                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Composition Graph

### 5.1 Box Flow Visualization

Visual representation of box connections:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔗 Composition Graph                              [Fullscreen]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Reset] [Fit] [Export PNG] [Export JSON]                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │         ┌─────────────┐                                      │ │
│  │         │  Start      │                                      │ │
│  │         └──────┬──────┘                                      │ │
│  │                │                                             │ │
│  │                ▼                                             │ │
│  │    ┌──────────────────────┐                                 │ │
│  │    │  FileReadBox        │◀───────┐                         │ │
│  │    │  "Load Q3 report"    │        │                         │ │
│  │    └──────┬───────────────┘        │                         │ │
│  │           │                          │                         │ │
│  │           ▼                          │                         │ │
│  │    ┌──────────────────────┐          │                         │ │
│  │    │ ObservationBox     │          │                         │ │
│  │    │ "Extract data"      │          │                         │ │
│  │    └──────┬───────────────┘          │                         │ │
│  │           │                          │                         │ │
│  │      ┌────┴────┐                     │                         │ │
│  │      ▼         ▼                     │                         │ │
│  │ ┌────────┐ ┌────────┐                │                         │ │
│  │ │Filter  │ │ Map    │                │                         │ │
│  │ └───┬────┘ └───┬────┘                │                         │ │
│  │     │          │                     │                         │ │
│  │     └────┬─────┘                     │                         │ │
│  │          ▼                           │                         │ │
│  │    ┌──────────────────────┐          │                         │ │
│  │    │  AnalysisBox        │          │                         │ │
│  │    │  "Calculate growth"  │          │                         │ │
│  │    └──────┬───────────────┘          │                         │ │
│  │           │                          │                         │ │
│  │           ▼                          │                         │ │
│  │    ┌──────────────────────┐          │                         │ │
│  │    │  InferenceBox       │          │                         │ │
│  │    │  "Identify trends"   │          │                         │ │
│  │    └──────┬───────────────┘          │                         │
│  │           │                          │                         │ │
│  │           └──────────────────────────┘                         │ │
│  │                                    │                            │ │
│  │                                    ▼                            │ │
│  │                         ┌─────────────┐                           │ │
│  │                         │    End      │                           │ │
│  │                         └─────────────┘                           │ │
│  │                                                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Legend:                                                           │
│  🔵 Reasoning  🟡 Action  📊 Data  ➡️ Control  ✓ Validate         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Interactive Graph Features

```typescript
interface GraphVisualization {
  // Layout
  layout: 'hierarchical' | 'force' | 'circular' | 'manual';

  // Display options
  showLabels: boolean;
  showIcons: boolean;
  showMetrics: boolean;
  showConnections: boolean;

  // Interaction
  zoomEnabled: boolean;
  panEnabled: boolean;
  selectEnabled: boolean;
  dragEnabled: boolean;

  // Grouping
  groupByCategory: boolean;
  groupByStatus: boolean;
  collapseGroups: boolean;

  // Filtering
  filterByType?: BoxType[];
  filterByStatus?: BoxStatus[];

  // Animation
  animateExecution: boolean;
  highlightActivePath: boolean;
  showDataFlow: boolean;
}
```

### 5.3 Graph Controls

```
┌─────────────────────────────────────────────────────────────────┐
│  🎛️  Graph Controls                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layout: [Hierarchical ▼]  View: [All Boxes ▼]                  │
│                                                                  │
│  ☑ Show Labels  ☑ Show Icons  ☑ Show Metrics  ☑ Connections   │
│                                                                  │
│  Group by: [None ▼]  Filter: [All Status ▼]                      │
│                                                                  │
│  Zoom: [−] 50% [+]  Fit  Reset                                   │
│                                                                  │
│  [Auto Layout]  [Export PNG]  [Export JSON]                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Parameter Editor

### 6.1 Parameter Input Components

Different input types for different parameter types:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️  Parameter Editor                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  format (select)                                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Select extraction format...                                  │ │
│  │ ┌─────────────────────────────────────────────────────────┐ │ │
│  │ │ ▸ json                                                    │ │ │
│  │ │ ▸ csv                                                     │ │ │
│  │ │ ▸ excel                                                   │ │ │
│  │ └─────────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  │ Default: json  •  Current: json                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  maxObservations (number)                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ┌───┬───┬───┬───┐                                          │ │
│  │ │ 1 │ 0 │   │   │                                          │ │
│  │ └───┴───┴───┴───┘  Range: 1-100                         │ │
│  │                                                           │ │
│  │ Default: 10  •  Current: 10                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  strictMode (boolean)                                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ┌─────────────────────────────────────────────────────────┐ │ │
│  │ ☐ Enable strict validation                                │ │ │
│  │ └─────────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  │ Default: false  •  Current: false                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  customLogic (code)                                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ // Custom extraction logic (optional)                      │ │
│  │ function extract(data) {                                   │ │
│  │   // Your code here                                       │ │
│  │   return [];                                             │ │
│  │ }                                                          │ │
│  │                                                           │ │
│  │ [Format]  [Validate]  [Test]                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  [Reset to Defaults]  [Preview]  [Save]  [Cancel]              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Parameter Validation

Real-time validation feedback:

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ Valid Parameters                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  All parameters are valid and ready to use.                      │
│                                                                  │
│  ⚠️  Warnings (1):                                              │
│  • maxObservations = 100 may cause slow execution               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ❌ Invalid Parameters                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❌ maxObservations: Must be between 1 and 100                  │
│     Current: 150  Fix: [Set to 100]                             │
│                                                                  │
│  ⚠️  format: Not recommended for this input type               │
│     Consider using: json                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. State Inspector

### 7.1 Box State View

Current state and execution history:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 State Inspector                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CURRENT STATE                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Status: 🟢 Ready                                           │ │
│  │ Last Execution: 2 minutes ago                               │ │
│  │ Execution Count: 1,234                                      │ │
│  │ Success Rate: 98.5%                                         │ │
│  │                                                           │ │
│  │ ┌─────────────────────────────────────────────────────────┐ │ │
│  │ │ Cache State                                              │ │ │
│  │ │ • Cache Size: 1,234 entries                             │ │ │
│  │ │ • Hit Rate: 45.6%                                      │ │ │
│  │ │ • Avg Retrieval: 12ms                                   │ │ │
│  │ └─────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  STATE TRANSITIONS (Recent)                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 14:32:15  🟢 Ready → 🟡 Running → 🟢 Ready (45ms)         │ │
│  │ 14:30:22  🟢 Ready → 🟡 Running → 🟢 Ready (43ms)         │ │
│  │ 14:28:11  🟢 Ready → 🟡 Running → 🔴 Error (12ms)          │ │
│  │ 14:25:33  🟢 Ready → 🟡 Running → 🟢 Ready (47ms)         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  INTERNAL STATE                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ {                                                         │ │
│  │   "cache": {                                             │ │
│  │     "entries": 1234,                                     │ │
│  │     "hitRate": 0.456                                     │ │
│  │   },                                                    │ │
│  │   "performance": {                                       │ │
│  │     "avgDuration": 45,                                   │ │
│  │     "p95Duration": 68                                    │ │
│  │   },                                                    │ │
│  │   "health": "healthy"                                   │ │
│  │ }                                                       [Copy] │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Diff View

Compare state changes:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔄 State Diff: Before vs After                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Comparing: [2024-03-08 14:30:22] vs [2024-03-08 14:32:15]      │
│                                                                  │
│  PARAMETERS                                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ format: json → json (no change)                            │ │
│  │ maxObservations: 10 → 15 [+5]                              │ │
│  │ strictMode: false → false (no change)                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  PERFORMANCE                                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ avgDuration: 43ms → 45ms [+2ms]                            │ │
│  │ successRate: 98.2% → 98.5% [+0.3%]                        │ │
│  │ cacheHitRate: 44.1% → 45.6% [+1.5%]                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  OUTPUTS (Last Execution)                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ - ["Revenue is $1.2M", "Growth is 15%"]                    │ │
│  │ + ["Revenue is $1.2M", "Growth is 15%", "Customers: 1,234"] │ │
│  │                         ↑ Added                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Revert to Before]  [Apply Changes]  [Export Diff]              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Export/Import System

### 8.1 Box Export Formats

Multiple export formats for different use cases:

```
┌─────────────────────────────────────────────────────────────────┐
│  📦 Export Box                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Select Export Format:                                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  🔹 JSON     Complete box definition                        │ │
│  │             • Full implementation                             │ │
│  │             • All metadata                                  │ │
│  │             • Best for: Backup, version control            │ │
│  │                                                             │ │
│  │  🔹 YAML     Human-readable definition                      │ │
│  │             • Simplified structure                          │ │
│  │             • Best for: Documentation, manual editing      │ │
│  │                                                             │ │
│  │  🔹 Template Box template (without state)                   │ │
│  │             • Reusable configuration                         │ │
│  │             • Best for: Sharing, marketplace                │ │
│  │                                                             │ │
│  │  🔹 Code     Generated implementation code                 │ │
│  │             • TypeScript/Python                            │ │
│  │             • Best for: Customization, integration         │ │
│  │                                                             │ │
│  │  🔹 Diagram  Visual representation                           │ │
│  │             • Mermaid, PNG, SVG                              │ │
│  │             • Best for: Documentation, presentations        │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Include: ☑ Parameters  ☑ Metadata  ☑ Execution History       │
│                                                                  │
│  [Export]  [Cancel]                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 JSON Export Format

```typescript
interface BoxExport {
  version: "1.0";
  format: "json";

  box: {
    // Identity
    id: string;
    name: string;
    type: BoxType;
    category: BoxCategory;

    // Description
    summary: string;
    description: string;
    icon: string;
    color: BoxColor;

    // Interface
    inputs: BoxInput[];
    outputs: BoxOutput[];
    parameters: BoxParameter[];

    // Implementation (optional)
    implementation?: {
      type: "code" | "template" | "reference";
      language?: "typescript" | "python";
      code?: string;
      reference?: string;
    };

    // Metadata
    metadata: {
      version: string;
      author: string;
      createdAt: number;
      updatedAt: number;
      tags: string[];
      custom: Record<string, unknown>;
    };

    // State (optional)
    state?: {
      executionHistory: BoxExecution[];
      performance: PerformanceMetrics;
    };
  };
}
```

### 8.3 Template Export Format

Simplified format for sharing:

```typescript
interface BoxTemplate {
  template: {
    name: string;
    type: BoxType;
    category: BoxCategory;

    description: string;

    // Interface only (no implementation)
    inputs: BoxInput[];
    outputs: BoxOutput[];
    parameters: BoxParameter[];

    // Usage example
    example?: {
      inputs: Record<string, unknown>;
      outputs: Record<string, unknown>;
    };

    // Requirements
    requirements?: {
      dependencies?: string[];
      apiKeys?: string[];
      minVersion?: string;
    };
  };
}
```

### 8.4 Import Box

```
┌─────────────────────────────────────────────────────────────────┐
│  📥 Import Box                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Paste JSON/YAML]  [Upload File]  [Browse Templates]            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ {                                                         │ │
│  │   "name": "Extract sales data",                          │ │
│  │   "type": "observation",                                 │ │
│  │   "summary": "Extracts sales figures...",                │ │
│  │   "parameters": [                                       │ │
│  │     {                                                   │ │
│  │       "name": "format",                                │ │
│  │       "type": "enum",                                  │ │
│  │       "validValues": ["json", "csv", "excel"]          │ │
│  │     }                                                   │ │
│  │   ]                                                    │ │
│  │ }                                                       [Clear] │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Validate]  [Preview]  [Import]  [Cancel]                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. TypeScript Interfaces

### 9.1 Box Visualization Interfaces

```typescript
/**
 * Box visualization data
 */
export interface BoxVisualization {
  // Basic info
  id: string;
  name: string;
  type: BoxType;
  category: BoxCategory;

  // Visual properties
  icon: string;
  color: BoxColor;
  status: BoxStatus;

  // Display data
  summary: string;
  metrics: BoxMetrics;
  inputs: BoxInput[];
  outputs: BoxOutput[];
  parameters: BoxParameter[];

  // State
  state: BoxState;
  history: BoxExecution[];
  connections: BoxConnections;

  // Layout
  position?: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
}

/**
 * Box metrics for display
 */
export interface BoxMetrics {
  // Execution metrics
  executionCount: number;
  successRate: number;

  // Performance metrics
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;

  // Cost metrics
  avgCost: number;
  totalCost: number;
  costPerExecution: number;

  // Cache metrics
  cacheHitRate: number;
  avgCacheRetrieval: number;
}

/**
 * Box status
 */
export enum BoxStatus {
  READY = 'ready',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WAITING = 'waiting',
  CACHED = 'cached',
  DISTILLED = 'distilled',
}

/**
 * Box connections
 */
export interface BoxConnections {
  upstream: BoxConnection[];
  downstream: BoxConnection[];
}

export interface BoxConnection {
  boxId: string;
  boxName: string;
  boxType: BoxType;
  inputData?: string;
  outputData?: string;
  strength: number;
  usage: number;
}

/**
 * Box execution record
 */
export interface BoxExecution {
  executionId: string;
  timestamp: number;
  status: 'success' | 'failure' | 'running';
  duration: number;
  cost: number;

  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;

  error?: BoxError;
  logs?: BoxLog[];
}

/**
 * Box state
 */
export interface BoxState {
  status: BoxStatus;
  lastExecution: number | null;
  executionCount: number;
  successRate: number;

  cache?: {
    size: number;
    hitRate: number;
    avgRetrieval: number;
  };

  performance?: {
    avgDuration: number;
    p95Duration: number;
    avgCost: number;
  };

  health: 'healthy' | 'degraded' | 'unhealthy';
}
```

### 9.2 Inspector Panel Interfaces

```typescript
/**
 * Box inspector component props
 */
export interface BoxInspectorProps {
  box: AIBox;
  tab?: InspectorTab;
  onTabChange?: (tab: InspectorTab) => void;
  onClose?: () => void;
}

/**
 * Inspector tabs
 */
export enum InspectorTab {
  OVERVIEW = 'overview',
  INTERFACE = 'interface',
  PARAMETERS = 'parameters',
  METRICS = 'metrics',
  HISTORY = 'history',
  CONNECTIONS = 'connections',
  EDIT = 'edit',
}

/**
 * Inspector tab content
 */
export interface InspectorTabContent {
  tab: InspectorTab;
  title: string;
  icon: string;
  content: React.ReactNode;
  actions?: TabAction[];
}

/**
 * Tab action
 */
export interface TabAction {
  label: string;
  icon: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}

/**
 * Box editor props
 */
export interface BoxEditorProps {
  box: AIBox;
  onSave: (updates: BoxUpdates) => void;
  onCancel: () => void;
}

/**
 * Box updates
 */
export interface BoxUpdates {
  name?: string;
  summary?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  implementation?: BoxImplementation;
}

/**
 * Box implementation
 */
export interface BoxImplementation {
  type: 'code' | 'template' | 'reference';
  language?: 'typescript' | 'python';
  code?: string;
  reference?: string;
}
```

### 9.3 Execution Visualizer Interfaces

```typescript
/**
 * Execution visualizer props
 */
export interface ExecutionVisualizerProps {
  workflow: AIBox;
  execution?: BoxExecutionRecord;
  mode: 'live' | 'replay' | 'timeline';
}

/**
 * Box execution record
 */
export interface BoxExecutionRecord {
  workflowId: string;
  startTime: number;
  endTime: number | null;
  status: 'running' | 'completed' | 'failed';

  boxes: BoxExecutionStatus[];
  totalDuration: number;
  totalCost: number;
}

/**
 * Box execution status
 */
export interface BoxExecutionStatus {
  boxId: string;
  boxName: string;
  status: 'waiting' | 'running' | 'completed' | 'failed';

  startTime: number | null;
  endTime: number | null;
  duration: number | null;

  progress?: number;
  currentStep?: string;

  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: BoxError;

  metrics?: {
    tokens?: number;
    cost?: number;
  };
}

/**
 * Execution timeline data
 */
export interface ExecutionTimeline {
  boxes: TimelineBox[];
  parallelGroups: TimelineGroup[];
  totalDuration: number;
}

export interface TimelineBox {
  boxId: string;
  boxName: string;

  startTime: number;
  endTime: number;
  duration: number;

  cost: number;
  status: 'completed' | 'failed';

  dependencies: string[];
}

export interface TimelineGroup {
  boxes: string[];
  parallel: boolean;
}
```

### 9.4 Graph Visualization Interfaces

```typescript
/**
 * Composition graph props
 */
export interface CompositionGraphProps {
  boxes: AIBox[];
  layout?: GraphLayout;

  // Display options
  showLabels?: boolean;
  showIcons?: boolean;
  showMetrics?: boolean;
  showConnections?: boolean;

  // Interaction
  onSelectBox?: (box: AIBox) => void;
  onEditBox?: (box: AIBox) => void;

  // Filtering
  filterByType?: BoxType[];
  filterByStatus?: BoxStatus[];
}

/**
 * Graph layout
 */
export enum GraphLayout {
  HIERARCHICAL = 'hierarchical',
  FORCE = 'force',
  CIRCULAR = 'circular',
  MANUAL = 'manual',
}

/**
 * Graph node
 */
export interface GraphNode {
  id: string;
  box: AIBox;

  position: {
    x: number;
    y: number;
  };

  size: {
    width: number;
    height: number;
  };

  selected: boolean;
  highlighted: boolean;
}

/**
 * Graph edge
 */
export interface GraphEdge {
  id: string;
  from: string;
  to: string;

  label?: string;
  strength: number;

  animated: boolean;
  highlighted: boolean;
}

/**
 * Graph controls
 */
export interface GraphControls {
  layout: GraphLayout;

  showLabels: boolean;
  showIcons: boolean;
  showMetrics: boolean;
  showConnections: boolean;

  groupByCategory: boolean;
  groupByStatus: boolean;
  collapseGroups: boolean;

  filterByType: BoxType[];
  filterByStatus: BoxStatus[];

  zoom: number;
  pan: { x: number; y: number };
}
```

### 9.5 Parameter Editor Interfaces

```typescript
/**
 * Parameter editor props
 */
export interface ParameterEditorProps {
  box: AIBox;
  parameters: BoxParameter[];
  values: Record<string, unknown>;

  onChange: (name: string, value: unknown) => void;
  onReset: () => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Parameter input component
 */
export interface ParameterInputProps {
  parameter: BoxParameter;
  value: unknown;

  onChange: (value: unknown) => void;
  onValidate?: (value: unknown) => ValidationResult;

  disabled?: boolean;
  readonly?: boolean;
}

/**
 * Parameter validation result
 */
export interface ParameterValidationResult {
  valid: boolean;
  errors: ParameterValidationError[];
  warnings: ParameterValidationWarning[];
}

export interface ParameterValidationError {
  parameter: string;
  message: string;
  value: unknown;
}

export interface ParameterValidationWarning {
  parameter: string;
  message: string;
  suggestion?: string;
}
```

### 9.6 Export/Import Interfaces

```typescript
/**
 * Box export options
 */
export interface BoxExportOptions {
  format: ExportFormat;
  include: {
    parameters: boolean;
    metadata: boolean;
    executionHistory: boolean;
    implementation: boolean;
  };
}

/**
 * Export format
 */
export enum ExportFormat {
  JSON = 'json',
  YAML = 'yaml',
  TEMPLATE = 'template',
  CODE = 'code',
  DIAGRAM = 'diagram',
}

/**
 * Export result
 */
export interface BoxExportResult {
  format: ExportFormat;
  content: string;
  filename: string;

  box: {
    id: string;
    name: string;
    version: string;
  };
}

/**
 * Box import options
 */
export interface BoxImportOptions {
  format: ExportFormat;
  source: 'paste' | 'file' | 'template';

  validateBeforeImport: boolean;
  resolveConflicts: 'overwrite' | 'rename' | 'skip';

  onConflict?: (conflict: BoxConflict) => BoxConflictResolution;
}

/**
 * Box conflict
 */
export interface BoxConflict {
  type: 'id' | 'name' | 'version';
  existing: AIBox;
  incoming: Partial<AIBox>;
}

/**
 * Box conflict resolution
 */
export interface BoxConflictResolution {
  action: 'overwrite' | 'rename' | 'skip' | 'merge';
  newName?: string;
}

/**
 * Import result
 */
export interface BoxImportResult {
  success: boolean;
  box?: AIBox;
  conflicts?: BoxConflict[];
  errors: ImportError[];
}

export interface ImportError {
  type: 'validation' | 'resolution' | 'dependency';
  message: string;
  details?: unknown;
}
```

---

## 10. Spreadsheet Integration

### 10.1 Cell Display Integration

Box cards displayed directly in spreadsheet cells:

```
┌─────────────────────────────────────────────────────────────────┐
│   A   │   B                            │   C                   │   D     │
├────────┬────────────────────────────────┼──────────────────────┼────────┤
│   1    │ Sales Analysis Dashboard        │                      │        │
├────────┼────────────────────────────────┼──────────────────────┼────────┤
│   2    │                                  │                      │        │
│   3    │ 📊 Sales Q3 2024                 │ Total: $1.2M          │        │
│        │ ┌─────────────────────────────┐ │                      │        │
│        │ │ 👁️  OBSERVATION    🟢       │ │                      │        │
│        │ │ Extract sales data            │ │                      │        │
│        │ │ ⚡ 45ms  💰 $0.002  ✅ 98.5% │ │                      │        │
│        │ └─────────────────────────────┘ │                      │        │
│   4    │                                  │                      │        │
│   5    │ 🔍 ANALYSIS                     │ Growth: 15%          │        │
│        │ ┌─────────────────────────────┐ │                      │        │
│        │ │ 🔍  ANALYSIS       🟢       │ │                      │        │
│        │ │ Calculate growth rate         │ │                      │        │
│        │ │ ⚡ 120ms 💰 $0.005  ✅ 97.2% │ │                      │        │
│        │ └─────────────────────────────┘ │                      │        │
│   6    │                                  │                      │        │
│        │                                  │                      │        │
└────────┴────────────────────────────────┴──────────────────────┴────────┘
```

### 10.2 Side Panel Integration

Inspector panel in spreadsheet side panel:

```
┌─────────────────────────────────────────────────────────────────┐
│  SPREADSHEET APP                                               │
├─────────────────────┬───────────────────────────────────────────┤
│                     │  🔍 Box Inspector                [×]        │
│   A │ B │ C         │  ─────────────────────────────────────  │
│  ───┼───┼──         │                                           │
│   1 │   │            │  [📋 Overview] [🔌 Interface] [⚙️ Params]   │
│   2 │   │            │  [📊 Metrics] [🕐 History] [🔗 Connect]   │
│   3 │   │            │                                           │
│   4 │   │            │  ┌────────────────────────────────────┐ │
│   5 │   │            │  │  👁️  OBSERVATION                    │ │
│   6 │   │            │  │  Extract sales data                 │ │
│   7 │   │            │  │  ────────────────────────────────  │ │
│                     │  │  📥 INPUTS                          │ │
│                     │  │  • report: string (required)       │ │
│                     │  │  📤 OUTPUTS                         │ │
│                     │  │  • observations: string[]           │ │
│                     │  │  ⚙️  PARAMETERS                      │ │
│                     │  │  • format: [json ▼]                 │ │
│                     │  │  • quarter: [Q3 ▼]                 │ │
│                     │  │                                    │ │
│                     │  └────────────────────────────────────┘ │
│                     │                                           │
│                     │  [⬇️ Show History]  [✏️ Edit]              │
│                     │                                           │
└─────────────────────┴───────────────────────────────────────────┘

SIDE PANEL WIDTH: 400px
COLLAPSIBLE: Yes
```

### 10.3 Right-Click Context Menu

Context menu for boxes in spreadsheet:

```
┌─────────────────────────────────┐
│  Box Actions                     │
├─────────────────────────────────┤
│  👁️  Inspect Box                │
│  ⚙️  Edit Parameters             │
│  📊 View Metrics                │
│  🕐 View History                │
├─────────────────────────────────┤
│  🔗 View Connections            │
│  📋 Copy Box ID                  │
├─────────────────────────────────┤
│  📦 Duplicate Box                │
│  📤 Export Box                   │
├─────────────────────────────────┤
│  🗑️  Delete Box                  │
└─────────────────────────────────┘
```

### 10.4 Hover Tooltip

Quick info on hover:

```
┌─────────────────────────────────────────┐
│  👁️  OBSERVATION                        │
│  Extract sales data                     │
├─────────────────────────────────────────┤
│  Executions: 1,234                      │
│  Avg Duration: 45ms                      │
│  Success Rate: 98.5%                     │
│  Cost: $0.002 per execution              │
│                                          │
│  [Click to inspect]                       │
└─────────────────────────────────────────┘

APPEARS: 200ms after hover
AUTO-HIDE: After 5s
POSITION: Below cursor, offset 8px
```

### 10.5 Selection Highlight

Visual feedback when box is selected:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ╔═══════════════════════════════════════════════════════════╗ │ │
│  │ ║  👁️  OBSERVATION                            🟢         ║ │ │
│  │ ║  Extract sales data                                        ║ │ │
│  │ ║  ⚡ 45ms  💰 $0.002  ✅ 98.5%                          ║ │ │
│  │ ╚═══════════════════════════════════════════════════════════╝ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  BORDER: 2px solid #3B82F6 (blue)                                 │
│  SHADOW: 0 0 0 4px rgba(59, 130, 246, 0.3)                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Examples

### Example 1: Complete Box Card Component

```typescript
import React, { useState } from 'react';
import { AIBox, BoxState, BoxExecution } from './types';
import { cn } from './utils';

export const BoxCard: React.FC<BoxCardProps> = ({
  box,
  compact = false,
  selected = false,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const state = box.getState();
  const metrics = box.getHistory();

  const getBorderLeftColor = () => {
    switch (box.category) {
      case BoxCategory.REASONING: return box.color;
      case BoxCategory.ACTION: return '#F59E0B';
      case BoxCategory.DATA: return '#06B6D4';
      case BoxCategory.CONTROL: return '#8B5CF6';
      case BoxCategory.VALIDATE: return '#10B981';
      case BoxCategory.METADATA: return '#64748B';
      default: return '#64748B';
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'ready': return '#22C55E';
      case 'running': return '#EAB308';
      case 'failed': return '#EF4444';
      case 'completed': return '#3B82F6';
      default: return '#FFFFFF';
    }
  };

  return (
    <div
      className={cn(
        'box-card',
        selected && 'selected',
        isHovered && 'hovered',
        compact && 'compact'
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderLeft: `4px solid ${getBorderLeftColor()}`,
        boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Header */}
      <div className="box-header">
        <span className="box-icon">{box.icon}</span>
        <span className="box-type">{box.type}</span>
        <div
          className="status-dot"
          style={{ backgroundColor: getStatusColor() }}
        />
      </div>

      {/* Summary */}
      {!compact && (
        <p className="box-summary">{box.summary}</p>
      )}

      {/* Metrics */}
      <div className="box-metrics">
        <Metric
          icon="⚡"
          value={metrics.avgDuration}
          unit="ms"
        />
        <Metric
          icon="💰"
          value={`$${metrics.avgCost.toFixed(4)}`}
          unit=""
        />
        <Metric
          icon="✅"
          value={`${(metrics.successRate * 100).toFixed(1)}%`}
          unit=""
        />
      </div>

      {/* Inputs/Outputs - only on detailed card */}
      {!compact && (
        <div className="box-interface">
          <div className="box-inputs">
            <span className="label">📥</span>
            {box.inputs.map((input) => (
              <div key={input.name} className="interface-item">
                {input.name}: <span className="type">{input.type}</span>
              </div>
            ))}
          </div>
          <div className="box-outputs">
            <span className="label">📤</span>
            {box.outputs.map((output) => (
              <div key={output.name} className="interface-item">
                {output.name}: <span className="type">{output.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{
  icon: string;
  value: number;
  unit: string;
}> = ({ icon, value, unit }) => (
  <div className="metric">
    <span className="metric-icon">{icon}</span>
    <span className="metric-value">{value}</span>
    <span className="metric-unit">{unit}</span>
  </div>
);
```

### Example 2: Inspector Panel Component

```typescript
import React, { useState } from 'react';
import { AIBox, InspectorTab } from './types';
import { BoxOverview } from './BoxOverview';
import { BoxInterface } from './BoxInterface';
import { BoxParameters } from './BoxParameters';
import { BoxMetrics } from './BoxMetrics';
import { BoxHistory } from './BoxHistory';
import { BoxConnections } from './BoxConnections';
import { BoxEditor } from './BoxEditor';

export const BoxInspector: React.FC<BoxInspectorProps> = ({
  box,
  tab: defaultTab = InspectorTab.OVERVIEW,
  onTabChange,
  onClose,
}) => {
  const [currentTab, setCurrentTab] = useState(tab);

  const handleTabChange = (newTab: InspectorTab) => {
    setCurrentTab(newTab);
    onTabChange?.(newTab);
  };

  const renderTab = () => {
    switch (currentTab) {
      case InspectorTab.OVERVIEW:
        return <BoxOverview box={box} />;
      case InspectorTab.INTERFACE:
        return <BoxInterface box={box} />;
      case InspectorTab.PARAMETERS:
        return <BoxParameters box={box} />;
      case InspectorTab.METRICS:
        return <BoxMetrics box={box} />;
      case InspectorTab.HISTORY:
        return <BoxHistory box={box} />;
      case InspectorTab.CONNECTIONS:
        return <BoxConnections box={box} />;
      case InspectorTab.EDIT:
        return <BoxEditor box={box} />;
      default:
        return <BoxOverview box={box} />;
    }
  };

  return (
    <div className="box-inspector">
      {/* Header */}
      <div className="inspector-header">
        <h2>🔍 Box Inspector</h2>
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="inspector-tabs">
        <TabButton
          tab={InspectorTab.OVERVIEW}
          current={currentTab}
          onClick={handleTabChange}
        >
          📋 Overview
        </TabButton>
        <TabButton
          tab={InspectorTab.INTERFACE}
          current={currentTab}
          onClick={handleTabChange}
        >
          🔌 Interface
        </TabButton>
        <TabButton
          tab={InspectorTab.PARAMETERS}
          current={currentTab}
          onClick={handleTabChange}
        >
          ⚙️ Parameters
        </TabButton>
        <TabButton
          tab={InspectorTab.METRICS}
          current={currentTab}
          onClick={handleTabChange}
        >
          📊 Metrics
        </TabButton>
        <TabButton
          tab={InspectorTab.HISTORY}
          current={currentTab}
          onClick={handleTabChange}
        >
          🕐 History
        </TabButton>
        <TabButton
          tab={InspectorTab.CONNECTIONS}
          current={currentTab}
          onClick={handleTabChange}
        >
          🔗 Connections
        </TabButton>
        <TabButton
          tab={InspectorTab.EDIT}
          current={currentTab}
          onClick={handleTabChange}
        >
          ✏️ Edit
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="inspector-content">
        {renderTab()}
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  tab: InspectorTab;
  current: InspectorTab;
  onClick: (tab: InspectorTab) => void;
  children: React.ReactNode;
}> = ({ tab, current, onClick, children }) => (
  <button
    className={cn(
      'tab-button',
      current === tab && 'active'
    )}
    onClick={() => onClick(tab)}
  >
    {children}
  </button>
);
```

### Example 3: Execution Visualizer Component

```typescript
import React, { useState, useEffect } from 'react';
import { AIBox, BoxExecutionRecord, BoxExecutionStatus } from './types';

export const ExecutionVisualizer: React.FC<ExecutionVisualizerProps> = ({
  workflow,
  execution,
  mode = 'live',
}) => {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (mode === 'live' && execution) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now() - execution.startTime);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [mode, execution]);

  const boxes = execution?.boxes || [];
  const completedBoxes = boxes.filter(b => b.status === 'completed').length;
  const totalBoxes = boxes.length;
  const progress = totalBoxes > 0 ? (completedBoxes / totalBoxes) * 100 : 0;

  return (
    <div className="execution-visualizer">
      {/* Header */}
      <div className="execution-header">
        <h2>⚡ Execution Monitor</h2>
        <div className="execution-controls">
          <button className="stop-button">Stop</button>
          <button className="pause-button">Pause</button>
        </div>
      </div>

      {/* Progress */}
      <div className="execution-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-text">
          Workflow: {workflow.name} | Started: {formatTime(currentTime)} |
          Boxes: {completedBoxes}/{totalBoxes} |
          ETA: {calculateETA(execution)}
        </div>
      </div>

      {/* Boxes */}
      <div className="execution-boxes">
        {boxes.map((boxStatus, index) => (
          <ExecutionBoxCard
            key={boxStatus.boxId}
            status={boxStatus}
            previousStatus={index > 0 ? boxes[index - 1] : undefined}
          />
        ))}
      </div>

      {/* Summary */}
      {execution && execution.endTime && (
        <div className="execution-summary">
          <MetricRow
            label="Total Duration"
            value={`${execution.totalDuration}ms`}
          />
          <MetricRow
            label="Total Cost"
            value={`$${execution.totalCost.toFixed(4)}`}
          />
          <MetricRow
            label="Status"
            value={execution.status}
            status={execution.status}
          />
        </div>
      )}
    </div>
  );
};

const ExecutionBoxCard: React.FC<{
  status: BoxExecutionStatus;
  previousStatus?: BoxExecutionStatus;
}> = ({ status, previousStatus }) => {
  const isWaiting = status.status === 'waiting' &&
    (!previousStatus || previousStatus.status === 'completed');

  const isRunning = status.status === 'running';
  const isCompleted = status.status === 'completed';
  const isFailed = status.status === 'failed';

  return (
    <div
      className={cn(
        'execution-box-card',
        status.status,
        isWaiting && 'waiting',
        isRunning && 'running',
        isCompleted && 'completed',
        isFailed && 'failed'
      )}
    >
      {/* Header */}
      <div className="box-header">
        <span className="box-icon">{getIconForStatus(status.status)}</span>
        <span className="box-name">{status.boxName}</span>
        <span className="box-status">
          {isWaiting && '⏸️  Waiting'}
          {isRunning && '⏳ ' + (status.progress || 0) + '%'}
          {isCompleted && '✅ ' + formatDuration(status.duration)}
          {isFailed && '❌ Error'}
        </span>
      </div>

      {/* Details */}
      {(isRunning || isCompleted || isFailed) && (
        <div className="box-details">
          {status.inputs && (
            <div className="box-inputs">
              <span className="label">Input:</span>
              <code className="input-value">
                {JSON.stringify(status.inputs, null, 2)}
              </code>
            </div>
          )}

          {isRunning && status.currentStep && (
            <div className="box-progress">
              <span className="label">Progress:</span>
              <span>{status.currentStep}</span>
            </div>
          )}

          {status.metrics && (
            <div className="box-metrics">
              {status.metrics.tokens && (
                <span>📊 {status.metrics.tokens} tokens</span>
              )}
              {status.metrics.cost && (
                <span>💰 ${status.metrics.cost.toFixed(4)}</span>
              )}
            </div>
          )}

          {isCompleted && status.outputs && (
            <div className="box-outputs">
              <span className="label">Output:</span>
              <code className="output-value">
                {JSON.stringify(status.outputs, null, 2)}
              </code>
            </div>
          )}

          {isFailed && status.error && (
            <div className="box-error">
              <span className="label">Error:</span>
              <span className="error-message">{status.error.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## UX Patterns

### Pattern 1: Progressive Disclosure

1. **Show**: Box card with summary and key metrics
2. **Click**: Inspector panel with detailed tabs
3. **Expand**: Full implementation details and history

### Pattern 2: Real-Time Updates

1. **Live Status**: Status indicators update in real-time
2. **Progress Bars**: Show execution progress for long-running boxes
3. **Metrics Dashboard**: Auto-refresh every 1-5 seconds during execution

### Pattern 3: Visual Feedback

1. **Status Colors**: Green (ready), Yellow (running), Red (error)
2. **Animations**: Pulse effect for running boxes
3. **Hover Effects**: Highlight connections on hover
4. **Selection**: Blue border and shadow for selected boxes

### Pattern 4: Error Handling

1. **Inline Errors**: Show error messages directly in box card
2. **Error States**: Red border and error icon for failed boxes
3. **Retry Actions**: One-click retry with fallback
4. **Error Details**: Full error stack in inspector panel

### Pattern 5: Accessibility

1. **Keyboard Navigation**: Arrow keys to navigate boxes
2. **Screen Reader**: ARIA labels for all interactive elements
3. **Color Blind**: Use shapes + colors for status
4. **High Contrast**: Support high contrast mode

---

## Performance Considerations

### 1. Rendering Optimization

```typescript
// Memoize box cards to prevent re-renders
const MemoizedBoxCard = React.memo(BoxCard, (prev, next) => {
  return (
    prev.box.id === next.box.id &&
    prev.selected === next.selected &&
    prev.compact === next.compact &&
    prev.box.getState().status === next.box.getState().status
  );
});

// Virtualize long lists of boxes
import { FixedSizeList } from 'react-window';

export const BoxList: React.FC<{ boxes: AIBox[] }> = ({ boxes }) => (
  <FixedSizeList
    height={600}
    itemCount={boxes.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <MemoizedBoxCard box={boxes[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

### 2. State Management

```typescript
// Use Zustand for efficient state management
import { create } from 'zustand';

interface BoxStore {
  boxes: Map<string, AIBox>;
  selectedBox: string | null;
  expandedBoxes: Set<string>;

  selectBox: (id: string) => void;
  expandBox: (id: string) => void;
  updateBox: (box: AIBox) => void;
}

export const useBoxStore = create<BoxStore>((set) => ({
  boxes: new Map(),
  selectedBox: null,
  expandedBoxes: new Set(),

  selectBox: (id) => set({ selectedBox: id }),
  expandBox: (id) => set((state) => {
    const expanded = new Set(state.expandedBoxes);
    expanded.add(id);
    return { expandedBoxes: expanded };
  }),

  updateBox: (box) => set((state) => {
    const boxes = new Map(state.boxes);
    boxes.set(box.id, box);
    return { boxes };
  }),
}));
```

### 3. Lazy Loading

```typescript
// Lazy load inspector tabs
import { lazy, Suspense } from 'react';

const BoxOverview = lazy(() => import('./BoxOverview'));
const BoxInterface = lazy(() => import('./BoxInterface'));
const BoxMetrics = lazy(() => import('./BoxMetrics'));

export const BoxInspector: React.FC<BoxInspectorProps> = (props) => (
  <div className="box-inspector">
    <Suspense fallback={<TabContentLoader />}>
      {renderTabContent(props.tab)}
    </Suspense>
  </div>
);
```

---

## Conclusion

This specification provides a comprehensive UI design for visualizing and inspecting Fractured AI Boxes. The design emphasizes:

1. **Immediate Comprehension**: Box purpose and status visible at a glance
2. **Progressive Disclosure**: Summary → Details → Implementation
3. **Real-Time Feedback**: Live updates during execution
4. **Seamless Integration**: Works naturally in spreadsheet side panel

The UI components are designed to be:
- **Performant**: Optimized rendering with memoization and virtualization
- **Accessible**: Keyboard navigation, screen reader support, high contrast
- **Responsive**: Works in side panel, modal, and full-screen views
- **Extensible**: Easy to add new box types and visualizations

---

**Document Status**: ✅ Complete
**Last Updated**: 2026-03-08
**Version**: 1.0.0
**Next Phase**: Implementation

---

*Making AI boxes as transparent as glass, one UI component at a time.* 🔍✨
