# Context Menu Integration - Visual Overview

**Quick reference diagrams for POLLN spreadsheet context menu system**

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER WORKSPACE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Excel      │  │Google Sheets │  │  Future...   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│         ┌─────────────────▼─────────────────┐                   │
│         │     POLLN INTEGRATION LAYER       │                   │
│         │  ┌─────────────────────────────┐  │                   │
│         │  │  Context Detection Engine   │  │                   │
│         │  │  - Static patterns          │  │                   │
│         │  │  - Semantic patterns        │  │                   │
│         │  │  - User patterns            │  │                   │
│         │  └──────────┬──────────────────┘  │                   │
│         │             │                     │                   │
│         │  ┌──────────▼──────────────────┐  │                   │
│         │  │   Agent Scoring System      │  │                   │
│         │  │  - Pattern match (40%)      │  │                   │
│         │  │  - Historical success (30%) │  │                   │
│         │  │  - User preference (20%)    │  │                   │
│         │  │  - Confidence (10%)         │  │                   │
│         │  └──────────┬──────────────────┘  │                   │
│         │             │                     │                   │
│         │  ┌──────────▼──────────────────┐  │                   │
│         │  │   Plinko Selection Layer    │  │                   │
│         │  │  - Softmax transformation   │  │                   │
│         │  │  - Temperature control      │  │                   │
│         │  │  - Probabilistic choice     │  │                   │
│         │  └──────────┬──────────────────┘  │                   │
│         │             │                     │                   │
│         │  ┌──────────▼──────────────────┐  │                   │
│         │  │   Suggestion Renderer       │  │                   │
│         │  │  - Menu items               │  │                   │
│         │  │  - Sidebar widgets          │  │                   │
│         │  │  - Task pane                │  │                   │
│         │  └──────────┬──────────────────┘  │                   │
│         └─────────────┼─────────────────────┘                   │
│                       │                                         │
└───────────────────────┼─────────────────────────────────────────┘
                        │
        ┌───────────────▼────────────────┐
        │   POLLN AGENT COLONY          │
        │  ┌─────────────────────────┐  │
        │  │ DataAnalyst Agent       │  │
        │  │ DataFormatter Agent     │  │
        │  │ PatternCompleter Agent  │  │
        │  │ FormulaExplainer Agent  │  │
        │  │ FormulaOptimizer Agent  │  │
        │  │ ...more agents...       │  │
        │  └─────────────────────────┘  │
        │  ┌─────────────────────────┐  │
        │  │ Learning Cache          │  │
        │  │ - User feedback         │  │
        │  │ - Pattern history       │  │
        │  │ - Success rates         │  │
        │  └─────────────────────────┘  │
        └───────────────────────────────┘
```

---

## User Experience Flow

```
┌────────────────────────────────────────────────────────────────┐
│                     USER INTERACTION FLOW                      │
└────────────────────────────────────────────────────────────────┘

┌─────────────┐
│ USER WORKS  │
│ in sheet    │
└──────┬──────┘
       │
       │ User right-clicks cell/range
       ▼
┌─────────────────────┐
│ CAPTURE CONTEXT     │ ◄── Fast (<100ms)
│ - Cell values       │
│ - Formulas          │
│ - Formatting        │
│ - Selection size    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ DETECT PATTERNS     │ ◄── Fast (<200ms)
│ - Static patterns   │
│ - Semantic patterns │
│ - User preferences  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ SCORE AGENTS        │ ◄── Fast (<300ms)
│ - Calculate scores  │
│ - Apply Plinko      │
│ - Select top 3-5    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ SHOW SUGGESTIONS    │
│ ┌─────────────────┐ │
│ │📊 Analyze data  │ │
│ │🧹 Format data   │ │
│ │⬇️ Complete...   │ │
│ │💡 Explain...    │ │
│ │⚡ Suggest...    │ │
│ └─────────────────┘ │
└──────┬──────────────┘
       │
       │ User clicks suggestion
       ▼
┌─────────────────────┐
│ EXECUTE AGENT       │ ◄── Medium (<2s)
│ - Show progress     │
│ - Run computation   │
│ - Update UI         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ SHOW RESULT         │
│ - Flash cells       │
│ - Show toast        │
│ - Enable undo       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ LEARN (async)       │ ◄── Background
│ - Record feedback   │
│ - Update agent      │
│ - Refine patterns   │
└─────────────────────┘
```

---

## Suggestion Types

```
┌──────────────────────────────────────────────────────────────────┐
│                      SUGGESTION TYPES                            │
└──────────────────────────────────────────────────────────────────┘

1. 📊 ANALYZE DATA
   Trigger: Numeric data, dates, mixed content
   Action: Summary statistics, insights, visualizations
   Example: "150 rows of sales data detected"

2. 🧹 FORMAT DATA
   Trigger: Inconsistent formatting, pattern mismatches
   Action: Clean, standardize, normalize
   Example: "Mixed date formats (MM/DD/YYYY and DD/MM/YYYY)"

3. ⬇️ COMPLETE PATTERN
   Trigger: Incomplete sequences, repeating patterns
   Action: Fill down, predict next values
   Example: "Date sequence detected: Jan, Feb, Mar..."

4. 💡 EXPLAIN FORMULA
   Trigger: Formula selected, complex expressions
   Action: Break down, explain logic, suggest improvements
   Example: "Complex VLOOKUP detected"

5. ⚡ SUGGEST IMPROVEMENTS
   Trigger: Suboptimal formulas, large ranges
   Action: Optimize performance, suggest alternatives
   Example: "VLOOKUP on entire column (slow)"
```

---

## Learning System

```
┌──────────────────────────────────────────────────────────────────┐
│                    LEARNING ARCHITECTURE                         │
└──────────────────────────────────────────────────────────────────┘

USER ACTION
    │
    ├─ Accept suggestion → Positive feedback
    ├─ Dismiss suggestion → Negative feedback
    └─ Ignore → Neutral feedback
    │
    ▼
┌─────────────────────┐
│ COLLECT FEEDBACK    │
│ - Action type       │
│ - Timestamp         │
│ - Context           │
│ - Time to decision  │
│ - Undo occurred?    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ UPDATE AGENT SCORE  │
│ successCount++      │
│ valueFunction += Δ  │
│ patternConfidence  │
└──────┬──────────────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌──────────────┐  ┌──────────────┐
│ IMMEDIATE    │  │ SESSION      │
│ Cache update │  │ Pattern      │
│ (<100ms)     │  │ analysis     │
│              │  │ (on close)   │
└──────────────┘  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ LONG-TERM    │
                  │ Colony       │
                  │ knowledge    │
                  │ (periodic)   │
                  └──────────────┘
```

---

## Privacy Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      PRIVACY LAYERS                              │
└──────────────────────────────────────────────────────────────────┘

USER DATA
    │
    ▼
┌─────────────────────┐
│ CLASSIFY DATA       │
│ - Public            │ ─┐
│ - Private           │  │ Safe to share
│ - Sensitive         │  │
│ - Critical          │ ─┘ Never share
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ USER CONSENT        │
│ - Local only?       │ ─┐ Stay on device
│ - Share patterns?   │ ─┘ Anonymized sharing
│ - Share data?       │ ─┘ Explicit opt-in
└──────┬──────────────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌──────────────┐  ┌──────────────┐
│ LOCAL        │  │ CLOUD        │
│ Processing   │  │ Processing   │
│ - IndexedDB  │  │ - Encrypted  │
│ - Cache      │  │ - Anonymized │
│ - Never sent │  │ - Removable  │
└──────────────┘  └──────────────┘
```

---

## Performance Targets

```
┌──────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE BUDGET                            │
└──────────────────────────────────────────────────────────────────┘

Menu Appearance:     <100ms  │▓▓▓▓░░░░░░░░░░ 30%
Pattern Detection:   <200ms  │▓▓▓▓▓▓▓▓░░░░░░ 60%
Agent Scoring:       <300ms  │▓▓▓▓▓▓▓▓▓▓▓▓░░ 90%
─────────────────────────────┼──────────────────
SUGGESTION TOTAL:    <500ms  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%

Agent Execution:     <2s     │▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%
Learning Update:     <100ms  │▓▓▓░░░░░░░░░░ 30% (async)

Memory Usage:        <100MB  │▓▓▓▓▓▓▓▓▓▓░░░░ 70%
Network:             <1MB    │▓░░░░░░░░░░░░ 10%
```

---

## Implementation Roadmap

``┌──────────────────────────────────────────────────────────────────┐
│                    6-8 WEEK TIMELINE                             │
└──────────────────────────────────────────────────────────────────┘

WEEK 1-2: FOUNDATION
├─ Excel add-in structure
├─ Google Sheets Apps Script
├─ POLLN client library
└─ Basic context detection
│
WEEK 3-4: AGENTS
├─ DataAnalyst
├─ DataFormatter
├─ PatternCompleter
├─ FormulaExplainer
└─ FormulaOptimizer
│
WEEK 5-6: LEARNING
├─ Local cache
├─ Feedback collection
├─ Pattern extraction
└─ Agent improvement
│
WEEK 7: UI/UX
├─ Onboarding
├─ Settings
├─ Privacy controls
└─ Accessibility
│
WEEK 8: POLISH
├─ Testing
├─ Performance
└─ Documentation
```

---

## Success Metrics Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│                   90-DAY SUCCESS TARGETS                         │
└──────────────────────────────────────────────────────────────────┘

USER ENGAGEMENT
┌─────────────────────────────┬──────────┬─────────┐
│ Metric                      │ Target   │ Current │
├─────────────────────────────┼──────────┼─────────┤
│ Adoption Rate               │   15%    │    -    │
│ Weekly Active Users         │   60%    │    -    │
│ Suggestions/Session         │   3-5    │    -    │
│ Acceptance Rate             │   25%    │    -    │
│ User Satisfaction           │  4.0/5   │    -    │
└─────────────────────────────┴──────────┴─────────┘

PERFORMANCE
┌─────────────────────────────┬──────────┬─────────┐
│ Metric                      │ Target   │ Current │
├─────────────────────────────┼──────────┼─────────┤
│ Menu Latency (p95)          │ <100ms   │    -    │
│ Suggestion Generation (p95) │ <500ms   │    -    │
│ Agent Execution (p95)       │ <2s      │    -    │
│ Memory Usage                │ <100MB   │    -    │
└─────────────────────────────┴──────────┴─────────┘

QUALITY
┌─────────────────────────────┬──────────┬─────────┐
│ Metric                      │ Target   │ Current │
├─────────────────────────────┼──────────┼─────────┤
│ Suggestion Relevance        │   70%    │    -    │
│ Pattern Recognition         │   80%    │    -    │
│ False Positive Rate         │  <10%    │    -    │
└─────────────────────────────┴──────────┴─────────┘

PRIVACY
┌─────────────────────────────┬──────────┬─────────┐
│ Metric                      │ Target   │ Current │
├─────────────────────────────┼──────────┼─────────┤
│ Data Leakage Incidents      │    0     │    0    │
│ User Control                │  100%    │  100%   │
│ Anonymized Sharing          │  100%    │    -    │
└─────────────────────────────┴──────────┴─────────┘
```

---

## File Structure

```
polln-spreadsheet-integration/
├── excel-addin/
│   ├── manifest.xml
│   ├── src/
│   │   ├── taskpane.html
│   │   ├── taskpane.ts
│   │   ├── commands.ts
│   │   ├── context-menu.ts
│   │   ├── agents/
│   │   │   ├── data-analyst.ts
│   │   │   ├── data-formatter.ts
│   │   │   ├── pattern-completer.ts
│   │   │   ├── formula-explainer.ts
│   │   │   └── formula-optimizer.ts
│   │   ├── learning/
│   │   │   ├── feedback.ts
│   │   │   ├── patterns.ts
│   │   │   └── storage.ts
│   │   └── privacy.ts
│   └── package.json
│
├── google-sheets-addon/
│   ├── appsscript.json
│   ├── Code.gs
│   ├── Sidebar.html
│   ├── agents/
│   │   ├── data-analyst.gs
│   │   ├── data-formatter.gs
│   │   ├── pattern-completer.gs
│   │   ├── formula-explainer.gs
│   │   └── formula-optimizer.gs
│   ├── learning/
│   │   ├── feedback.gs
│   │   ├── patterns.gs
│   │   └── storage.gs
│   └── privacy.gs
│
└── shared/
    ├── polln-client.ts
    ├── pattern-detection.ts
    ├── agent-scoring.ts
    └── types.ts
```

---

**Document Version:** 1.0
**Last Updated:** 2026-03-08
**Related:** CONTEXT_MENU_SPECS.md (full specification)
