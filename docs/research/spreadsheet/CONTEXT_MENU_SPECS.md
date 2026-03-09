# Context Menu Integration - POLLN Spreadsheet AI

**Version:** 1.0.0
**Date:** 2026-03-08
**Status:** Research & Design Specification
**Researcher:** Right-Click Suggestions Researcher

---

## Executive Summary

This document specifies the design and implementation of POLLN's context menu integration for Excel and Google Sheets. The system provides intelligent, context-aware suggestions that learn from user behavior while maintaining respect for user workspace boundaries.

**Core Philosophy:** Helpful assistant, not intrusive malware.

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Platform Integration](#platform-integration)
3. [Suggestion Generation](#suggestion-generation)
4. [Suggestion Types](#suggestion-types)
5. [User Experience Flow](#user-experience-flow)
6. [Learning Strategy](#learning-strategy)
7. [Privacy Architecture](#privacy-architecture)
8. [Implementation Specifications](#implementation-specifications)
9. [Sample Scenarios](#sample-scenarios)
10. [Success Metrics](#success-metrics)

---

## 1. Design Principles

### 1.1 Respect User Workspace

```
Default State: OFF (opt-in)
├── First-run: Gentle onboarding prompt
├── Per-workbook: User controls activation
├── Easy exit: One-click disable anywhere
└── Clear boundaries: Never auto-modify without permission
```

**Rationale:** Spreadsheets often contain critical business data. Users must feel in control.

### 1.2 Smart Timing

```
Show Suggestions When:
├── User right-clicks (always available)
├── Cell content suggests opportunity (smart)
├── Pattern detected across selection (smart)
└── User explicitly opens POLLN panel (always)

Hide When:
├── User working in protected range
├── System detects high keyboard velocity (user focused)
└── User recently dismissed suggestions (grace period)
```

### 1.3 Inspectability

Every suggestion includes:
- **Why**: Brief explanation of relevance
- **Who**: Which agent(s) generated it
- **What**: What action will be taken
- **Undo**: Clear reversal path

### 1.4 Fast Response

```
Target Latency:
├── Menu appearance: <100ms
├── Suggestion generation: <500ms
├── Agent execution: <2s (with progress indicator)
└── Learning update: <100ms (async)
```

---

## 2. Platform Integration

### 2.1 Excel (Office.js)

#### Context Menu Registration

```typescript
// Office.js API for context menu extension
Office.onReady((info) => {
  if (info.host === Office.HostType.Excel) {
    registerContextMenu();
  }
});

async function registerContextMenu() {
  await Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getActiveWorksheet();

    // Register POLLN menu items
    Office.context.document.addHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      onSelectionChanged
    );

    // Add custom context menu items
    // Note: Office.js has limited direct context menu API
    // Alternative: Use ribbon button + keyboard shortcut
  });
}
```

#### Excel Implementation Strategy

**Challenge:** Office.js doesn't provide direct context menu API.

**Solution:**
1. **Primary:** Ribbon button with keyboard shortcut (Ctrl+Shift+P)
2. **Secondary:** Task pane showing context-aware suggestions
3. **Fallback:** Right-click → "POLLN Suggestions" submenu

```typescript
// manifest.xml extension
<ExtensionPoint xsi:type="PrimaryCommandSurface">
  <OfficeTab id="TabHome">
    <Group id="PollnGroup">
      <Label resid="PollnGroup.Label" />
      <Icon>
        <bt:Image size="16" resid="Icon.16x16" />
        <bt:Image size="32" resid="Icon.32x32" />
        <bt:Image size="80" resid="Icon.80x80" />
      </Icon>
      <Control xsi:type="Button" id="PollnSuggestionsButton">
        <Label resid="PollnSuggestions.Label" />
        <TooltipTitle resid="PollnSuggestions.TooltipTitle" />
        <TooltipDescription resid="PollnSuggestions.TooltipDescription" />
        <Supertip>
          <ToolTipTitle resid="PollnSuggestions.SupertipTitle" />
          <ToolTipDescription resid="PollnSuggestions.SupertipDescription" />
        </Supertip>
        <Icon>
          <bt:Image size="16" resid="Icon.16x16" />
          <bt:Image size="32" resid="Icon.32x32" />
          <bt:Image size="80" resid="Icon.80x80" />
        </Icon>
        <Action xsi:type="ShowTaskpane">
          <TaskpaneId>PollnTaskpane</TaskpaneId>
          <Title resid="PollnTaskpane.Title" />
          <Supertip>
            <ToolTipTitle resid="PollnTaskpane.SupertipTitle" />
            <ToolTipDescription resid="PollnTaskpane.SupertipDescription" />
          </Supertip>
        </Action>
      </Control>
    </Group>
  </OfficeTab>
</ExtensionPoint>
```

### 2.2 Google Sheets (Apps Script)

#### Context Menu Registration

```javascript
// Apps Script API for context menu
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // Create POLLN submenu
  ui.createMenu('POLLN')
    .addItem('Analyze Selection', 'analyzeSelection')
    .addItem('Format Data', 'formatData')
    .addItem('Complete Pattern', 'completePattern')
    .addItem('Explain Formula', 'explainFormula')
    .addSeparator()
    .addItem('Open POLLN Panel', 'showSidePanel')
    .addToUi();

  // Add to main context menu (requires additional setup)
  createContextMenu();
}

function createContextMenu() {
  // Use installable trigger for right-click
  // Note: Apps Script doesn't support native context menu
  // Alternative: Custom UI with HTML service
}
```

#### Google Sheets Implementation Strategy

**Challenge:** Apps Script has limited native context menu support.

**Solution:**
1. **Primary:** Custom menu bar (top of screen)
2. **Secondary:** Sidebar with context-aware suggestions
3. **Advanced:** HTML service overlay for right-click simulation

```javascript
// Custom sidebar with context awareness
function showSidePanel() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('POLLN Suggestions')
    .setWidth(300);

  SpreadsheetApp.getUi().showSidebar(html);
}

// Sidebar.html
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <style>
      .suggestion {
        padding: 12px;
        border: 1px solid #ddd;
        margin: 8px 0;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .suggestion:hover {
        background: #f5f5f5;
        border-color: #4285f4;
      }
      .suggestion-icon {
        font-size: 20px;
        margin-right: 8px;
      }
      .suggestion-title {
        font-weight: 500;
        margin-bottom: 4px;
      }
      .suggestion-reason {
        font-size: 12px;
        color: #666;
      }
      .agent-badge {
        display: inline-block;
        background: #e8f0fe;
        color: #1967d2;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        margin-top: 4px;
      }
    </style>
  </head>
  <body>
    <div id="suggestions"></div>

    <script>
      // Fetch suggestions from POLLN server
      function fetchSuggestions() {
        const selection = getSelectionInfo();

        google.script.run
          .withSuccessHandler(displaySuggestions)
          .getSuggestions(selection);
      }

      function displaySuggestions(suggestions) {
        const container = document.getElementById('suggestions');
        container.innerHTML = '';

        suggestions.forEach(s => {
          const div = document.createElement('div');
          div.className = 'suggestion';
          div.innerHTML = `
            <div>
              <span class="suggestion-icon">${s.icon}</span>
              <span class="suggestion-title">${s.title}</span>
            </div>
            <div class="suggestion-reason">${s.reason}</div>
            <div class="agent-badge">Agent: ${s.agent}</div>
          `;
          div.onclick = () => executeSuggestion(s.id);
          container.appendChild(div);
        });
      }

      // Refresh suggestions on selection change
      google.script.run
        .withSuccessHandler(fetchSuggestions)
        .addSelectionChangeListener();
    </script>
  </body>
</html>
```

---

## 3. Suggestion Generation

### 3.1 Context Analysis Pipeline

```
User Right-Click
    ↓
Capture Selection Context
    ├── Cell values
    ├── Formulas
    ├── Formatting
    ├── Data types
    └── Range dimensions
    ↓
Pattern Recognition
    ├── Static patterns (dates, currencies, etc.)
    ├── Semantic patterns (headers, formulas, etc.)
    ├── User patterns (learned preferences)
    └── Colony patterns (successful actions)
    ↓
Agent Selection (Plinko)
    ├── Score proposals
    ├── Apply temperature
    └── Select top N (3-5)
    ↓
Suggestion Rendering
    └── Display in menu/sidebar
```

### 3.2 Pattern Recognition

#### Static Pattern Detection

```typescript
interface StaticPattern {
  type: 'date' | 'number' | 'text' | 'formula' | 'empty' | 'mixed';
  confidence: number;
  features: {
    hasDates: boolean;
    hasNumbers: boolean;
    hasFormulas: boolean;
    hasHeaders: boolean;
    isContiguous: boolean;
    isNumeric: boolean;
    dateFormat?: string;
    numberFormat?: string;
  };
}

function detectStaticPattern(
  range: Excel.Range | GoogleAppsScript.Sheet.Range
): StaticPattern {
  const values = range.getValues();
  const formulas = range.getFormulas();

  // Analyze cell content
  const features = {
    hasDates: values.some(row =>
      row.some(cell => cell instanceof Date)
    ),
    hasNumbers: values.some(row =>
      row.some(cell => typeof cell === 'number')
    ),
    hasFormulas: formulas.some(row =>
      row.some(cell => cell.startsWith('='))
    ),
    isContiguous: true, // Check for gaps
    isNumeric: false,   // All numeric?
  };

  // Calculate confidence score
  let type: StaticPattern['type'] = 'mixed';
  let confidence = 0.5;

  if (features.hasDates && !features.hasNumbers) {
    type = 'date';
    confidence = 0.9;
  } else if (features.isNumeric) {
    type = 'number';
    confidence = 0.85;
  } else if (features.hasFormulas) {
    type = 'formula';
    confidence = 0.8;
  }

  return { type, confidence, features };
}
```

#### Semantic Pattern Detection

```typescript
interface SemanticPattern {
  category: 'header' | 'data' | 'summary' | 'metadata' | 'unknown';
  confidence: number;
  heuristics: {
    position: 'top' | 'bottom' | 'middle';
    hasLabels: boolean;
    hasAggregations: boolean;
    looksLikeTable: boolean;
  };
}

function detectSemanticPattern(
  range: Excel.Range | GoogleAppsScript.Sheet.Range
): SemanticPattern {
  const sheet = range.getSheet();
  const rowIndex = range.getRow();
  const rowCount = range.getRowCount();

  // Position heuristics
  const position = rowIndex === 1 ? 'top' :
                   rowIndex + rowCount > sheet.getLastRow() ? 'bottom' :
                   'middle';

  // Check for labels (first row text, others data)
  const values = range.getValues();
  const hasLabels = values.length > 1 &&
    values[0].every(cell => typeof cell === 'string') &&
    values.slice(1).some(row =>
      row.some(cell => typeof cell === 'number')
    );

  // Check for aggregations (SUM, AVERAGE, etc.)
  const hasAggregations = values.some(row =>
    row.some(cell =>
      typeof cell === 'string' &&
      (/SUM|AVG|COUNT|MAX|MIN/i.test(cell))
    )
  );

  // Determine category
  let category: SemanticPattern['category'] = 'unknown';
  let confidence = 0.5;

  if (position === 'top' && hasLabels) {
    category = 'header';
    confidence = 0.85;
  } else if (position === 'bottom' && hasAggregations) {
    category = 'summary';
    confidence = 0.8;
  } else if (hasLabels && position === 'middle') {
    category = 'data';
    confidence = 0.75;
  }

  return {
    category,
    confidence,
    heuristics: { position, hasLabels, hasAggregations, looksLikeTable: hasLabels }
  };
}
```

### 3.3 Agent Scoring

```typescript
interface AgentProposal {
  agentId: string;
  agentType: 'TaskAgent' | 'RoleAgent' | 'CoreAgent';
  suggestion: Suggestion;
  score: number;
  confidence: number;
  reasoning: string[];
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => Promise<void>;
  agent: string;
  reason: string;
  estimatedTime: number;
}

function scoreAgentProposals(
  context: SelectionContext,
  colony: Colony
): AgentProposal[] {
  const proposals: AgentProposal[] = [];

  // Get relevant agents based on context
  const relevantAgents = colony.getAgentsByCapability([
    'data-analysis',
    'formatting',
    'pattern-completion',
    'formula-explanation',
    'optimization'
  ]);

  // Score each agent's relevance
  for (const agent of relevantAgents) {
    const proposal = agent.generateProposal(context);

    // Calculate score based on:
    // 1. Pattern match (40%)
    // 2. Historical success (30%)
    // 3. User preference (20%)
    // 4. Confidence (10%)

    const patternScore = calculatePatternMatch(context, proposal);
    const successScore = agent.getHistoricalSuccessRate();
    const userScore = getUserPreferenceScore(agent.id);
    const confidenceScore = proposal.confidence;

    proposal.score =
      patternScore * 0.4 +
      successScore * 0.3 +
      userScore * 0.2 +
      confidenceScore * 0.1;

    proposals.push(proposal);
  }

  // Sort by score and return top N
  return proposals
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);  // Top 5 suggestions
}

// Plinko selection (probabilistic, not deterministic)
function selectSuggestions(
  proposals: AgentProposal[],
  temperature: number = 0.7
): Suggestion[] {
  // Softmax transformation
  const expScores = proposals.map(p => Math.exp(p.score / temperature));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  const probs = expScores.map(s => s / sumExp);

  // Probabilistic selection
  const selected: Suggestion[] = [];
  for (let i = 0; i < Math.min(3, proposals.length); i++) {
    const rand = Math.random();
    let cumProb = 0;

    for (let j = 0; j < probs.length; j++) {
      cumProb += probs[j];
      if (rand <= cumProb) {
        selected.push(proposals[j].suggestion);
        break;
      }
    }
  }

  return selected;
}
```

---

## 4. Suggestion Types

### 4.1 Analyze Data

**Trigger:** Numeric data, dates, or mixed content

```typescript
{
  id: 'analyze-data-001',
  title: 'Analyze this data',
  description: 'Get summary statistics and insights',
  icon: '📊',
  agent: 'DataAnalyst',
  reason: 'Detected 150 rows of numeric data',
  action: async () => {
    // Run analysis
    const summary = await analyzeData(range);

    // Create summary sheet
    const summarySheet = workbook.addSheet('Data Analysis');

    // Write results
    summarySheet.getRange('A1').value = 'Summary Statistics';
    summarySheet.getRange('A2').value = `Count: ${summary.count}`;
    summarySheet.getRange('A3').value = `Mean: ${summary.mean}`;
    summarySheet.getRange('A4').value = `Median: ${summary.median}`;
    // ... more stats

    // Add charts
    summarySheet.addChart(summary.createChart());
  }
}
```

### 4.2 Format Data

**Trigger:** Inconsistent formatting, detected patterns

```typescript
{
  id: 'format-data-001',
  title: 'Clean and standardize format',
  description: 'Fix dates, numbers, and text consistency',
  icon: '🧹',
  agent: 'DataFormatter',
  reason: 'Detected mixed date formats (MM/DD/YYYY and DD/MM/YYYY)',
  action: async () => {
    // Detect format patterns
    const patterns = detectFormatPatterns(range);

    // Apply standardization
    for (const pattern of patterns) {
      if (pattern.type === 'date') {
        await standardizeDates(range, pattern.targetFormat);
      } else if (pattern.type === 'number') {
        await standardizeNumbers(range, pattern.decimals);
      } else if (pattern.type === 'text') {
        await standardizeText(range, pattern.case);
      }
    }

    // Show summary
    showNotification(`Formatted ${patterns.length} pattern types`);
  }
}
```

### 4.3 Complete Pattern

**Trigger:** Incomplete sequences, patterns

```typescript
{
  id: 'complete-pattern-001',
  title: 'Complete this pattern',
  description: 'Fill down based on detected sequence',
  icon: '⬇️',
  agent: 'PatternCompleter',
  reason: 'Detected date sequence: Jan, Feb, Mar...',
  action: async () => {
    // Detect pattern
    const pattern = detectSequencePattern(range);

    // Generate predictions
    const predictions = generatePatternContinuation(pattern, 10);

    // Fill down
    const outputRange = range
      .offset(range.getRowCount(), 0, predictions.length, 1);
    outputRange.setValues(predictions);

    // Show confidence
    showNotification(`Filled ${predictions.length} cells (confidence: ${pattern.confidence}%)`);
  }
}
```

### 4.4 Explain Formula

**Trigger:** Formula selected

```typescript
{
  id: 'explain-formula-001',
  title: 'Explain this formula',
  description: 'Break down what this formula does',
  icon: '💡',
  agent: 'FormulaExplainer',
  reason: 'Complex formula detected (VLOOKUP + IFERROR)',
  action: async () => {
    // Parse formula
    const parsed = parseFormula(formula);

    // Generate explanation
    const explanation = await explainFormula(parsed);

    // Create comment
    range.addComment(
      `=POLLN_EXPLANATION\n\n${explanation.summary}\n\n` +
      `Steps:\n${explanation.steps.map((s, i) => `${i+1}. ${s}`).join('\n')}`
    );

    // Alternatively, show in sidebar
    showSidebar({
      title: 'Formula Explanation',
      content: explanation
    });
  }
}
```

### 4.5 Suggest Improvements

**Trigger:** Suboptimal formulas, large ranges

```typescript
{
  id: 'suggest-improvements-001',
  title: 'Optimize this formula',
  description: 'More efficient alternatives available',
  icon: '⚡',
  agent: 'FormulaOptimizer',
  reason: 'VLOOKUP on entire column (slow)',
  action: async () => {
    // Analyze formula
    const analysis = analyzeFormulaPerformance(formula);

    if (analysis.hasOptimizations) {
      // Suggest alternatives
      const suggestions = analysis.optimizations;

      // Show options to user
      showSelectionDialog({
        title: 'Optimization Options',
        options: suggestions.map(s => ({
          label: s.description,
          detail: s.improvement,
          formula: s.formula
        }))
      }).then(selected => {
        if (selected) {
          range.setFormula(selected.formula);
          showNotification('Formula optimized');
        }
      });
    } else {
      showNotification('Formula is already optimized');
    }
  }
}
```

---

## 5. User Experience Flow

### 5.1 Initial Onboarding

```
First Installation
    ↓
Welcome Modal
    ├── "POLLN can help you work smarter"
    ├── Feature highlights (3 key benefits)
    └── [Get Started] [Learn More] [Maybe Later]
    ↓
If "Get Started"
    ├── Quick tour (15 seconds)
    ├── Enable context menu suggestions
    └── Show first suggestion
    ↓
If "Maybe Later"
    └── Add to menu bar (disabled by default)
```

### 5.2 Daily Use Flow

```
User working in spreadsheet
    ↓
User right-clicks cell/range
    ↓
Context Menu Appears (native + POLLN)
    ├── Standard Excel/Sheets items
    └── POLLN Suggestions (3-5 items)
        ├── Icon + Title
        ├── Brief reason
        └── Agent badge
    ↓
[User clicks suggestion]
    ↓
Agent Executes (with progress)
    ├── Show progress indicator
    ├── Allow cancellation
    └── Update in real-time
    ↓
Result Applied
    ├── Visual confirmation (flash cells)
    ├── Undo available (Ctrl+Z)
    └── Toast notification
    ↓
Agent Learns (async)
    ├── Track user choice
    ├── Update success rate
    └── Refine future suggestions
```

### 5.3 Suggestion UI Design

#### Menu Item Structure

```
┌─────────────────────────────────────┐
│ 📊 Analyze this data                │
│    150 rows of numeric data         │
│    Agent: DataAnalyst               │
├─────────────────────────────────────┤
│ 🧹 Clean and standardize format     │
│    Mixed date formats detected      │
│    Agent: DataFormatter             │
├─────────────────────────────────────┤
│ 💡 Explain this formula             │
│    Complex VLOOKUP detected         │
│    Agent: FormulaExplainer          │
├─────────────────────────────────────┤
│ ⬇️ Complete this pattern            │
│    Date sequence detected           │
│    Agent: PatternCompleter          │
├─────────────────────────────────────┤
│ ─────────────────────────────────   │
│ 🔧 POLLN Settings                   │
│ 📖 Open POLLN Panel                 │
└─────────────────────────────────────┘
```

#### Sidebar Design (Alternative)

```
┌─────────────────────────────────────┐
│ POLLN Suggestions           [×]     │
├─────────────────────────────────────┤
│                                     │
│  📊 Analyze this data               │
│  ─────────────────────────────────  │
│  Get summary statistics and         │
│  insights from your selection       │
│                                     │
│  Why: 150 rows of numeric data      │
│  Agent: DataAnalyst                 │
│  Time: ~2 seconds                   │
│                                     │
│  [Run] [Dismiss] [Learn More]       │
│                                     │
├─────────────────────────────────────┤
│  🧹 Clean and standardize format    │
│  ─────────────────────────────────  │
│  Fix dates, numbers, and text       │
│  consistency issues                 │
│                                     │
│  Why: Mixed date formats            │
│  Agent: DataFormatter               │
│  Time: ~1 second                    │
│                                     │
│  [Run] [Dismiss] [Learn More]       │
│                                     │
└─────────────────────────────────────┘
```

---

## 6. Learning Strategy

### 6.1 Feedback Collection

```typescript
interface UserFeedback {
  suggestionId: string;
  action: 'accepted' | 'dismissed' | 'ignored';
  timestamp: number;
  context: SelectionContext;
  timeToDecision: number;
  undoOccurred: boolean;
}

function collectFeedback(
  action: UserFeedback['action'],
  suggestion: Suggestion
): void {
  const feedback: UserFeedback = {
    suggestionId: suggestion.id,
    action,
    timestamp: Date.now(),
    context: getCurrentContext(),
    timeToDecision: Date.now() - suggestionShownTime,
    undoOccurred: false // Will update if undo happens
  };

  // Store in local learning cache
  learningCache.recordFeedback(feedback);

  // Periodic sync to colony
  if (learningCache.shouldSync()) {
    syncToColony(learningCache.getRecentFeedback());
  }
}
```

### 6.2 Agent Improvement

```typescript
function updateAgentFromFeedback(
  agent: BaseAgent,
  feedback: UserFeedback[]
): void {
  // Calculate success rate
  const accepted = feedback.filter(f => f.action === 'accepted').length;
  const total = feedback.length;
  const successRate = accepted / total;

  // Update agent's value function
  agent.updateValueFunction(successRate);

  // Adjust proposal scoring
  if (successRate < 0.3) {
    // Low success: reduce confidence in similar contexts
    agent.adjustStrategy('reduce_sensitivity');
  } else if (successRate > 0.7) {
    // High success: increase confidence
    agent.adjustStrategy('increase_sensitivity');
  }

  // Pattern-specific learning
  const patterns = extractPatterns(feedback);
  for (const pattern of patterns) {
    agent.updatePatternConfidence(pattern, successRate);
  }
}
```

### 6.3 Session-based Learning

```typescript
interface LearningSession {
  sessionId: string;
  startTime: number;
  interactions: UserFeedback[];
  patterns: Map<string, number>; // pattern -> success rate
  preferences: UserPreferences;
}

function createLearningSession(): LearningSession {
  return {
    sessionId: uuidv4(),
    startTime: Date.now(),
    interactions: [],
    patterns: new Map(),
    preferences: loadUserPreferences()
  };
}

function endSession(session: LearningSession): void {
  // Analyze patterns
  const topPatterns = Array.from(session.patterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Update colony knowledge
  colony.updateKnowledge({
    patterns: topPatterns,
    preferences: session.preferences,
    successMetrics: calculateSuccessMetrics(session.interactions)
  });

  // Save to local storage
  saveSession(session);
}
```

---

## 7. Privacy Architecture

### 7.1 Data Handling Principles

```
Local-First Philosophy
├── All learning happens locally (initially)
├── User data never leaves without permission
├── Colony federation is opt-in
└── Clear data visibility
```

### 7.2 Data Classification

```typescript
enum DataSensitivity {
  Public = 'public',           // Safe to share
  Private = 'private',         // User's private data
  Sensitive = 'sensitive',     // Business sensitive
  Critical = 'critical'        // Never share
}

function classifyData(
  data: unknown[][],
  patterns: Pattern[]
): DataSensitivity {
  // Check for sensitive patterns
  if (patterns.some(p => p.type === 'email')) {
    return DataSensitivity.Private;
  }

  if (patterns.some(p => p.type === 'ssn' || p.type === 'credit-card')) {
    return DataSensitivity.Critical;
  }

  // Check for business terms
  if (patterns.some(p => p.type === 'financial-forecast')) {
    return DataSensitivity.Sensitive;
  }

  return DataSensitivity.Public;
}
```

### 7.3 Privacy Controls

```typescript
interface PrivacySettings {
  enableLearning: boolean;
  enableFederation: boolean;
  dataRetentionDays: number;
  shareAnonymousPatterns: boolean;
  shareAnonymizedData: boolean;
  allowedDataTypes: DataSensitivity[];
}

function canShareData(
  data: unknown[][],
  settings: PrivacySettings
): boolean {
  if (!settings.enableFederation) {
    return false;
  }

  const sensitivity = classifyData(data, detectPatterns(data));
  return settings.allowedDataTypes.includes(sensitivity);
}

function anonymizeData(
  data: unknown[][],
  sensitivity: DataSensitivity
): unknown[][] {
  if (sensitivity === DataSensitivity.Public) {
    return data;
  }

  // Apply anonymization
  return data.map(row =>
    row.map(cell => {
      if (typeof cell === 'string' && isEmailAddress(cell)) {
        return hashEmail(cell);
      }
      if (typeof cell === 'number') {
        return addNoise(cell);
      }
      return cell;
    })
  );
}
```

### 7.4 Transparency UI

```
POLLN Privacy Settings
─────────────────────────────────────

Learning
[✓] Enable local learning
[ ] Share patterns with community
[ ] Share anonymized data

Data Retention
Session data: [7] days
Learning history: [30] days

Current Classification
This sheet: Private
Reason: Contains email addresses

Learn More | Reset All | Export My Data
```

---

## 8. Implementation Specifications

### 8.1 Excel Add-in Structure

```
polln-excel-addin/
├── manifest.xml              # Add-in manifest
├── src/
│   ├── taskpane.html         # Side panel UI
│   ├── taskpane.ts           # Side panel logic
│   ├── commands.ts           # Ribbon button handlers
│   ├── context-menu.ts       # Context menu logic
│   ├── agents/               # POLLN agent integration
│   │   ├── data-analyst.ts
│   │   ├── data-formatter.ts
│   │   ├── pattern-completer.ts
│   │   └── formula-optimizer.ts
│   ├── learning/             # Local learning
│   │   ├── feedback.ts
│   │   ├── patterns.ts
│   │   └── storage.ts
│   └── privacy.ts            # Privacy controls
├── package.json
└── tsconfig.json
```

### 8.2 Google Sheets Structure

```
polln-sheets-addon/
├── appsscript.json           # Add-on manifest
├── Code.gs                   # Server-side logic
├── Sidebar.html              # Sidebar UI
├── agents/                   # POLLN agent integration
│   ├── data-analyst.gs
│   ├── data-formatter.gs
│   ├── pattern-completer.gs
│   └── formula-optimizer.gs
├── learning/                 # Local learning
│   ├── feedback.gs
│   ├── patterns.gs
│   └── storage.gs
└── privacy.gs                # Privacy controls
```

### 8.3 Shared POLLN Integration

```typescript
// polln-integration/src/client.ts
export class PollnSpreadsheetClient {
  private colony: Colony;
  private learningCache: LocalLearningCache;

  constructor(config: PollnConfig) {
    this.colony = new Colony({
      id: config.colonyId,
      name: 'Spreadsheet Assistant',
      maxAgents: 50,
      resourceBudget: config.resources
    });

    this.learningCache = new LocalLearningCache(config.storage);
  }

  async getSuggestions(
    context: SelectionContext
  ): Promise<Suggestion[]> {
    // Detect patterns
    const staticPattern = detectStaticPattern(context.range);
    const semanticPattern = detectSemanticPattern(context.range);
    const userPatterns = this.learningCache.getUserPatterns();

    // Get agent proposals
    const proposals = await this.colony.requestProposals({
      static: staticPattern,
      semantic: semanticPattern,
      user: userPatterns,
      context
    });

    // Score and select
    const scored = scoreAgentProposals(proposals, this.colony);
    const selected = selectSuggestions(scored, 0.7);

    return selected;
  }

  async executeSuggestion(
    suggestion: Suggestion
  ): Promise<void> {
    // Execute action
    await suggestion.action();

    // Record feedback
    this.learningCache.recordFeedback({
      suggestionId: suggestion.id,
      action: 'accepted',
      timestamp: Date.now(),
      context: getCurrentContext()
    });

    // Update agent
    const agent = this.colony.getAgent(suggestion.agent);
    agent.updateValueFunction(1.0);
  }

  recordDismissal(suggestion: Suggestion): void {
    this.learningCache.recordFeedback({
      suggestionId: suggestion.id,
      action: 'dismissed',
      timestamp: Date.now(),
      context: getCurrentContext()
    });
  }
}
```

---

## 9. Sample Scenarios

### Scenario 1: Sales Data Analysis

```
Context: User selects range A1:D150 (sales data)
Pattern: Numeric data with headers

User Right-Clicks
    ↓
Menu Shows:
    1. 📊 Analyze this data
       "150 rows of sales data detected"
       Agent: DataAnalyst

    2. 📈 Create sales dashboard
       "Time-series data detected"
       Agent: DashboardBuilder

    3. 🧹 Standardize currency format
       "Mixed currency formats ($, €, £)"
       Agent: DataFormatter

User clicks "Analyze this data"
    ↓
Agent executes:
    - Creates summary sheet
    - Calculates key metrics
    - Generates pivot table
    - Creates charts
    ↓
Result: New sheet with insights
    ↓
Undo available (Ctrl+Z)
Agent learns: User wants analysis on sales data
```

### Scenario 2: Formula Optimization

```
Context: User selects cell with VLOOKUP
Pattern: Formula with entire column reference

User Right-Clicks
    ↓
Menu Shows:
    1. 💡 Explain this formula
       "Complex VLOOKUP detected"
       Agent: FormulaExplainer

    2. ⚡ Optimize this formula
       "Entire column reference (slow)"
       Agent: FormulaOptimizer

    3. 🔧 Convert to INDEX/MATCH
       "Faster alternative available"
       Agent: FormulaRefactorer

User clicks "Optimize this formula"
    ↓
Agent executes:
    - Analyzes formula performance
    - Suggests more efficient alternatives
    - Shows comparison
    ↓
Dialog: "Choose optimization"
    [ ] Use Table reference (fastest)
    [x] Use specific range (balanced)
    [ ] Keep current
    ↓
User selects "Use specific range"
    ↓
Formula updated: =VLOOKUP(A2, Data!A2:B1000, 2, FALSE)
Agent learns: User prefers specific ranges
```

### Scenario 3: Pattern Completion

```
Context: User selects A1:A3 (Jan, Feb, Mar)
Pattern: Date sequence

User Right-Clicks
    ↓
Menu Shows:
    1. ⬇️ Complete this pattern
       "Date sequence detected"
       Agent: PatternCompleter

    2. 📅 Fill to end of year
       "Monthly pattern detected"
       Agent: DateFiller

User clicks "Complete this pattern"
    ↓
Agent executes:
    - Detects pattern (monthly)
    - Generates continuation
    - Fills down
    ↓
Result: Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
    ↓
Agent learns: User wants month completion
```

### Scenario 4: Data Cleaning

```
Context: User selects A1:A500 (customer list)
Pattern: Text data with inconsistencies

User Right-Clicks
    ↓
Menu Shows:
    1. 🧹 Clean and standardize format
       "Inconsistent text casing detected"
       Agent: DataFormatter

    2. 📧 Extract email addresses
       "Email patterns detected"
       Agent: DataExtractor

    3. 🔍 Find duplicates
       "Potential duplicates found"
       Agent: DataDeduplicator

User clicks "Clean and standardize format"
    ↓
Agent executes:
    - Detects casing inconsistencies
    - Applies title case
    - Removes extra spaces
    - Standardizes abbreviations
    ↓
Result: Clean, consistent data
    ↓
Toast: "Cleaned 500 rows (237 changes)"
Agent learns: User wants title case for names
```

---

## 10. Success Metrics

### 10.1 User Engagement

```
Target Metrics (90 days):
├── Adoption Rate: 15% of installers
├── Weekly Active Users: 60% of adopters
├── Suggestions/Session: 3-5
├── Acceptance Rate: 25%+
└── User Satisfaction: 4.0/5.0
```

### 10.2 Performance Metrics

```
Target Technical Metrics:
├── Menu Latency: <100ms (p95)
├── Suggestion Generation: <500ms (p95)
├── Agent Execution: <2s (p95)
├── Memory Usage: <100MB
└── Battery Impact: <2% per hour
```

### 10.3 Learning Metrics

```
Target Learning Metrics:
├── Suggestion Relevance: 70%+ (subjective)
├── Pattern Recognition: 80%+ accuracy
├── User Preference Learning: 60%+ accuracy
└── False Positive Rate: <10%
```

### 10.4 Privacy Metrics

```
Target Privacy Metrics:
├── Data Leakage: 0 incidents
├── User Control: 100% (always opt-in)
├── Transparency: Clear data usage
└── Anonymization: 100% of shared data
```

---

## Appendix A: Keyboard Shortcuts

```
Excel Add-in:
├── Ctrl+Shift+P: Open POLLN panel
├── Ctrl+Shift+A: Analyze selection
├── Ctrl+Shift+F: Format selection
├── Ctrl+Shift+X: Explain formula
└── Esc: Dismiss suggestions

Google Sheets Add-on:
├── Ctrl+Shift+P: Open POLLN sidebar
├── Ctrl+Shift+A: Analyze selection
├── Ctrl+Shift+F: Format selection
├── Ctrl+Shift+X: Explain formula
└── Esc: Dismiss suggestions
```

---

## Appendix B: Error Handling

```typescript
function handleSuggestionError(
  error: Error,
  suggestion: Suggestion
): void {
  // Log error
  console.error('Suggestion failed:', error);

  // Show user-friendly message
  showNotification({
    type: 'error',
    message: `Couldn't complete "${suggestion.title}"`,
    detail: getErrorMessage(error),
    actions: [
      { label: 'Try Again', action: () => retrySuggestion(suggestion) },
      { label: 'Report Issue', action: () => reportIssue(error) },
      { label: 'Dismiss', action: () => {} }
    ]
  });

  // Record failure for learning
  learningCache.recordFeedback({
    suggestionId: suggestion.id,
    action: 'dismissed',
    timestamp: Date.now(),
    error: error.message
  });
}
```

---

## Appendix C: Accessibility

```
Accessibility Requirements:
├── Screen reader support
├── Keyboard navigation
├── High contrast mode
├── Font size scaling
├── Color blind friendly (icons + text)
└── ARIA labels on all interactive elements
```

---

## Conclusion

This specification provides a comprehensive framework for implementing context menu integration in POLLN spreadsheet AI. The design prioritizes:

1. **User Control**: Opt-in, easy to disable, clear boundaries
2. **Intelligence**: Context-aware, learning from behavior
3. **Performance**: Fast response, minimal resource usage
4. **Privacy**: Local-first, transparent data handling
5. **Inspectability**: Every suggestion is explainable

Next steps:
1. Implement Excel add-in (Office.js)
2. Implement Google Sheets add-on (Apps Script)
3. Develop agent proposal system
4. Build learning cache
5. User testing and iteration
6. Beta release and feedback collection

---

**Document Status:** Research Complete
**Next Phase:** Implementation Planning
**Estimated Timeline:** 6-8 weeks to MVP
**Team Size:** 2-3 developers
