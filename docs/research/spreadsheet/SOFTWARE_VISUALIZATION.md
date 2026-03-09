# Software Visualization - Reverse Engineering in Spreadsheets

**"Making Code Architecture Visible and Inspectable in Every Cell"**

---

## Executive Summary

This document defines a comprehensive Software Visualization system for reverse engineering code architecture within spreadsheet environments. The system transforms complex codebases into inspectable, navigable visual representations directly in spreadsheet cells.

**Core Philosophy**: Every code structure, relationship, and execution path should be immediately visible and explorable from a spreadsheet interface.

### Key Capabilities

1. **Architecture Visualization** - See the structure of code at a glance
2. **Interactive Exploration** - Drill down from system to function level
3. **Real-Time Tracing** - Watch execution flow through boxes
4. **Visual Diffing** - Compare architectures across versions
5. **Spreadsheet-Native** - All visualization in cells, side panels, and hover states

---

## Table of Contents

1. [Visualization System Architecture](#1-visualization-system-architecture)
2. [Code Architecture Representation](#2-code-architecture-representation)
3. [Spreadsheet UI Components](#3-spreadsheet-ui-components)
4. [Interactive Exploration](#4-interactive-exploration)
5. [Visual Diff and Comparison](#5-visual-diff-and-comparison)
6. [Real-Time Execution Visualization](#6-real-time-execution-visualization)
7. [TypeScript Interface Definitions](#7-typescript-interface-definitions)
8. [Implementation Patterns](#8-implementation-patterns)

---

## 1. Visualization System Architecture

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Visualization Pipeline                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CODE SOURCE                                                      │
│    ├── Repository (GitHub, GitLab, local)                      │
│    ├── AST Parsers (TypeScript, Python, Java)                   │
│    ├── Metadata (Git history, authors, changesets)               │
│    └── Dependencies (imports, requires, packages)                │
│           │                                                       │
│           ▼                                                       │
│  EXTRACTION LAYER                                                │
│    ├── Static Analysis                                          │
│    ├── Dynamic Tracing                                          │
│    ├── Pattern Recognition                                      │
│    └── Relationship Detection                                    │
│           │                                                       │
│           ▼                                                       │
│  TRANSFORMATION LAYER                                            │
│    ├── Box Extraction (Fractured Boxes)                         │
│    ├── Graph Generation (Call graphs, dependency maps)          │
│    ├── Metric Calculation (Complexity, coupling, coverage)       │
│    └── Layout Algorithms (Hierarchical, force-directed)          │
│           │                                                       │
│           ▼                                                       │
│  RENDERING LAYER                                                 │
│    ├── Spreadsheet Cells (Inline cards)                           │
│    ├── Side Panels (Detailed inspection)                         │
│    ├── Hover States (Quick info)                                │
│    ├── Context Menus (Actions)                                  │
│    └── Export Formats (PNG, SVG, JSON)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Components

```typescript
interface VisualizationSystem {
  // Extraction
  extractor: CodeExtractor;
  parser: ASTParser;
  analyzer: StaticAnalyzer;

  // Transformation
  boxer: BoxExtractor;
  grapher: GraphGenerator;
  metrics: MetricCalculator;

  // Rendering
  renderer: SpreadsheetRenderer;
  ui: UIComponentRegistry;
  exporter: VisualizationExporter;

  // Interaction
  explorer: InteractiveExplorer;
  differ: VisualDiffer;
  tracer: ExecutionTracer;
}
```

---

## 2. Code Architecture Representation

### 2.1 Representation Hierarchy

```
REPOSITORY
├─ MODULE (File/Directory)
│  ├─ CLASS
│  │  ├─ METHOD
│  │  │  ├─ PARAMETERS
│  │  │  ├─ RETURN TYPE
│  │  │  └─ CALLS (outgoing references)
│  │  └─ FIELDS
│  ├─ FUNCTION
│  │  └─ (same as method)
│  └─ DEPENDENCIES
└─ RELATIONSHIPS
   ├─ IMPORTS (Module → Module)
   ├─ CALLS (Method → Method)
   ├─ INHERITS (Class → Class)
   └─ IMPLEMENTS (Class → Interface)
```

### 2.2 Box Type Mappings

```typescript
enum BoxType {
  // Code Structure Boxes
  REPOSITORY = 'repository',        // Root of codebase
  MODULE = 'module',                // File/directory
  CLASS = 'class',                  // Class declaration
  INTERFACE = 'interface',          // Interface
  METHOD = 'method',                // Function/method
  FUNCTION = 'function',            // Standalone function
  FIELD = 'field',                  // Class field/property

  // Analysis Boxes
  COMPLEXITY = 'complexity',        // Complexity metrics
  COVERAGE = 'coverage',            // Test coverage
  DEPENDENCY = 'dependency',        // Dependency analysis
  DUPLICATION = 'duplication',      // Code duplication
  SMELL = 'smell',                  // Code smells

  // Execution Boxes
  CALL = 'call',                    // Function call
  RETURN = 'return',                // Return statement
  EXCEPTION = 'exception',          // Exception handling
  LOOP = 'loop',                    // Loop iteration

  // Data Flow Boxes
  INPUT = 'input',                  // Data input
  OUTPUT = 'output',                // Data output
  TRANSFORM = 'transform',          // Data transformation
}

interface BoxCategory {
  type: BoxType;
  category: 'structure' | 'analysis' | 'execution' | 'data';
  color: string;
  icon: string;
}
```

### 2.3 Architecture Box Schema

```typescript
interface ArchitectureBox {
  // Identity
  id: string;
  type: BoxType;
  name: string;
  qualifiedName: string;              // e.g., "com.example.MyClass.myMethod"

  // Location
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;

  // Structure
  parent?: string;                   // Parent box ID
  children: string[];               // Child box IDs
  siblings: string[];               // Sibling box IDs

  // Relationships
  imports: string[];                // Imported modules
  importedBy: string[];             // Files importing this
  calls: string[];                   // Methods called
  calledBy: string[];               // Methods calling this
  extends?: string;                 // Extends class
  implements: string[];             // Implements interfaces

  // Metrics
  complexity: number;               // Cyclomatic complexity
  linesOfCode: number;
  parameterCount: number;
  returnCount: number;
  exceptionCount: number;
  coupling: number;                 // Coupling metric
  cohesion: number;                 // Cohesion metric

  // Coverage
  testCoverage?: number;            // 0-1
  testsPassed?: number;
  testsFailed?: number;

  // Analysis
  smells: CodeSmell[];
  duplications: Duplication[];

  // Metadata
  authors: string[];
  lastModified: number;
  gitCommit?: string;

  // Visualization
  position?: BoxPosition;
  size?: BoxSize;
  color: string;
  icon: string;
}

interface CodeSmell {
  type: 'long-method' | 'long-class' | 'feature-envy' | 'duplicate-code';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

interface Duplication {
  duplicateBox: string;
  lines: number[];
  similarity: number;
}
```

---

## 3. Spreadsheet UI Components

### 3.1 Cell-Based Box Display

**Compact Box Card** (72px height for minimal footprint):

```
┌─────────────────────────────────────┐
│ 📦 MODULE  src/app.ts       🟢     │
│ Main application entry point         │
│ ⚡ 45ms  🔗 12 deps  ✅ 85%         │
└─────────────────────────────────────┘

WIDTH: 280px
HEIGHT: 72px
```

**Detailed Box Card** (for expanded views):

```
┌─────────────────────────────────────────────────────────────────┐
│ 📦 MODULE                                  src/app.ts         🟢  │
├─────────────────────────────────────────────────────────────────┤
│ Main application entry point. Initializes Express server      │
│ and connects to database.                                      │
│                                                                  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  📊 STRUCTURE (12 children)           🔗 RELATIONSHIPS          │
│  └─ Classes: 3                        └─ Imports: 5             │
│  └─ Functions: 9                      └─ Imported by: 1         │
│                                                                  │
│  📈 METRICS                          🧪 COVERAGE               │
│  • Complexity: 45 (high)             • Lines: 85%               │
│  • LOC: 1,234                       • Branches: 72%             │
│  • Coupling: 15                      • Functions: 78%            │
│                                                                  │
│  ⚠️  ISSUES (2)                                                    │
│  • High complexity in initialize()                            │
│  • Missing error handling in start()                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

WIDTH: 480px
HEIGHT: auto (min 320px)
```

### 3.2 Side Panel Inspector

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Architecture Inspector                     [Full Graph] [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [📋 Overview] [📊 Metrics] [🔗 Dependencies] [📈 Timeline]     │
│  [🧪 Tests] [⚠️ Issues] [📝 Code] [⚙️ Settings]                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  OVERVIEW                                                  │ │
│  │  ─────────────────────────────────────────────────────  │ │
│  │  This module is the main entry point for the application. │ │
│  │  It handles:                                                │ │
│  │  • Server initialization                                  │ │
│  │  • Database connection                                   │ │
│  │  • Route registration                                     │ │
│  │  • Middleware setup                                      │ │
│  │                                                           │ │
│  │  **Dependencies:** Express, MongoDB, Redis, JWT            │ │
│  │  **Used by:** 1 other module                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [↓ Show Code]  [📤 Export]  [🔍 Find Usages]                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

SIDE PANEL WIDTH: 400px
MAX-HEIGHT: 80vh
```

### 3.3 Hover Quick Info

```
┌─────────────────────────────────────────┐
│  📦 src/app.ts                           │
├─────────────────────────────────────────┤
│  Complexity: 45  LOC: 1,234              │
│  Tests: 85%  Modified: 2h ago             │
│                                          │
│  [Click to inspect]                       │
└─────────────────────────────────────────┘

APPEARS: 200ms after hover
AUTO-HIDE: After 5s
MAX-WIDTH: 300px
```

---

## 4. Interactive Exploration

### 4.1 Drill-Down Navigation

```typescript
interface DrillDownPath {
  root: string;                      // Repository ID
  current: string;                   // Current box ID
  path: BoxNode[];                   // Navigation path

  // Navigation history
  backStack: string[];
  forwardStack: string[];
}

interface BoxNode {
  boxId: string;
  boxName: string;
  boxType: BoxType;
  depth: number;
}

class InteractiveExplorer {
  private currentPath: DrillDownPath;
  private renderer: SpreadsheetRenderer;

  /**
   * Drill down into a box
   */
  async drillDown(boxId: string): Promise<void> {
    const box = await this.loadBox(boxId);

    // Update navigation path
    this.currentPath.current = boxId;
    this.currentPath.path.push({
      boxId: box.id,
      boxName: box.name,
      boxType: box.type,
      depth: this.currentPath.path.length,
    });

    // Render children
    await this.renderChildren(box);

    // Update UI
    this.updateBreadcrumbs();
    this.updateBackButton();
  }

  /**
   * Navigate up one level
   */
  async navigateUp(): Promise<void> {
    const currentBox = await this.loadBox(this.currentPath.current);

    if (currentBox.parent) {
      await this.drillDown(currentBox.parent);
    } else {
      // Already at root
      return;
    }
  }

  /**
   * Navigate to specific box
   */
  async navigateTo(boxId: string): Promise<void> {
    // Find path from current to target
    const path = await this.findPath(this.currentPath.current, boxId);

    // Navigate through path
    for (const step of path) {
      await this.drillDown(step);
    }
  }

  /**
   * Show overview
   */
  async showOverview(): Promise<void> {
    const repository = await this.loadRepository(this.currentPath.root);
    await this.renderOverview(repository);
  }

  private async loadBox(boxId: string): Promise<ArchitectureBox> {
    // Load box from storage or API
    throw new Error('Not implemented');
  }

  private async renderChildren(box: ArchitectureBox): Promise<void> {
    // Render child boxes in spreadsheet
    throw new Error('Not implemented');
  }

  private updateBreadcrumbs(): void {
    // Update breadcrumb navigation
  }

  private updateBackButton(): void {
    // Enable/disable back button
  }

  private async findPath(from: string, to: string): Promise<string[]> {
    // Use BFS to find shortest path
    throw new Error('Not implemented');
  }
}
```

### 4.2 Relationship Traversal

```typescript
interface RelationshipTraversal {
  /**
   * Follow imports from a module
   */
  async followImports(moduleId: string): Promise<ArchitectureBox[]> {
    const module = await this.loadBox(moduleId);
    const imports: ArchitectureBox[] = [];

    for (const importRef of module.imports) {
      const importedBox = await this.resolveImport(importRef);
      if (importedBox) {
        imports.push(importedBox);
      }
    }

    return imports;
  }

  /**
   * Find all usages of a module
   */
  async findUsages(moduleId: string): Promise<ArchitectureBox[]> {
    const module = await this.loadBox(moduleId);
    const usages: ArchitectureBox[] = [];

    for (const usageRef of module.importedBy) {
      const usingBox = await this.loadBox(usageRef);
      if (usingBox) {
        usages.push(usingBox);
      }
    }

    return usages;
  }

  /**
   * Trace call chain
   */
  async traceCallChain(methodId: string): Promise<CallChain> {
    const method = await this.loadBox(methodId);
    const chain: CallNode[] = [];

    // Build call tree
    await this.buildCallTree(method, chain, new Set());

    return {
      root: method,
      nodes: chain,
      depth: this.calculateDepth(chain),
    };
  }

  /**
   * Find all callers of a method
   */
  async findCallers(methodId: string): Promise<ArchitectureBox[]> {
    const method = await this.loadBox(methodId);
    const callers: ArchitectureBox[] = [];

    for (const callerRef of method.calledBy) {
      const caller = await this.loadBox(callerRef);
      if (caller) {
        callers.push(caller);
      }
    }

    return callers;
  }

  private async buildCallTree(
    method: ArchitectureBox,
    chain: CallNode[],
    visited: Set<string>
  ): Promise<void> {
    if (visited.has(method.id)) return;
    visited.add(method.id);

    const node: CallNode = {
      method: method,
      calls: [],
    };

    for (const calleeId of method.calls) {
      const callee = await this.loadBox(calleeId);
      if (callee) {
        await this.buildCallTree(callee, node.calls, visited);
      }
    }

    chain.push(node);
  }

  private calculateDepth(chain: CallNode[]): number {
    let maxDepth = 0;

    for (const node of chain) {
      const childDepth = this.calculateDepth(node.calls);
      if (childDepth + 1 > maxDepth) {
        maxDepth = childDepth + 1;
      }
    }

    return maxDepth;
  }
}

interface CallChain {
  root: ArchitectureBox;
  nodes: CallNode[];
  depth: number;
}

interface CallNode {
  method: ArchitectureBox;
  calls: CallNode[];
}
```

---

## 5. Visual Diff and Comparison

### 5.1 Architecture Diff View

```typescript
interface VisualDiffer {
  /**
   * Compare two versions of architecture
   */
  async compareVersions(
    beforeVersion: string,
    afterVersion: string
  ): Promise<ArchitectureDiff> {
    const before = await this.loadArchitecture(beforeVersion);
    const after = await this.loadArchitecture(afterVersion);

    return {
      versionBefore: beforeVersion,
      versionAfter: afterVersion,
      timestampBefore: before.timestamp,
      timestampAfter: after.timestamp,

      added: this.findAdded(before, after),
      removed: this.findRemoved(before, after),
      modified: this.findModified(before, after),

      metrics: this.calculateMetricsDiff(before, after),
    };
  }

  /**
   * Render diff in spreadsheet
   */
  async renderDiff(diff: ArchitectureDiff): Promise<void> {
    // Side-by-side comparison
    await this.renderSideBySide(diff);

    // Highlight changes
    await this.highlightChanges(diff);

    // Generate summary
    await this.renderSummary(diff);
  }

  private findAdded(
    before: CodeArchitecture,
    after: CodeArchitecture
  ): ArchitectureBox[] {
    const afterIds = new Set(after.boxes.map(b => b.id));
    const beforeIds = new Set(before.boxes.map(b => b.id));

    return after.boxes.filter(b => !beforeIds.has(b.id));
  }

  private findRemoved(
    before: CodeArchitecture,
    after: CodeArchitecture
  ): ArchitectureBox[] {
    const afterIds = new Set(after.boxes.map(b => b.id));
    const beforeIds = new Set(before.boxes.map(b => b.id));

    return before.boxes.filter(b => !afterIds.has(b.id));
  }

  private findModified(
    before: CodeArchitecture,
    after: CodeArchitecture
  ): ModifiedBox[] {
    const modified: ModifiedBox[] = [];

    for (const afterBox of after.boxes) {
      const beforeBox = before.boxes.find(b => b.id === afterBox.id);

      if (beforeBox && !this.areBoxesEqual(beforeBox, afterBox)) {
        modified.push({
          boxId: afterBox.id,
          before: beforeBox,
          after: afterBox,
          changes: this.calculateChanges(beforeBox, afterBox),
        });
      }
    }

    return modified;
  }

  private areBoxesEqual(a: ArchitectureBox, b: ArchitectureBox): boolean {
    return (
      a.name === b.name &&
      a.type === b.type &&
      a.filePath === b.filePath &&
      a.startLine === b.startLine &&
      a.endLine === b.endLine &&
      a.complexity === b.complexity
    );
  }

  private calculateChanges(
    before: ArchitectureBox,
    after: ArchitectureBox
  ): BoxChange[] {
    const changes: BoxChange[] = [];

    // Check for metric changes
    if (before.complexity !== after.complexity) {
      changes.push({
        type: 'metric',
        field: 'complexity',
        before: before.complexity,
        after: after.complexity,
      });
    }

    // Check for relationship changes
    const addedCalls = after.calls.filter(c => !before.calls.includes(c));
    if (addedCalls.length > 0) {
      changes.push({
        type: 'relationship',
        change: 'added',
        field: 'calls',
        values: addedCalls,
      });
    }

    const removedCalls = before.calls.filter(c => !after.calls.includes(c));
    if (removedCalls.length > 0) {
      changes.push({
        type: 'relationship',
        change: 'removed',
        field: 'calls',
        values: removedCalls,
      });
    }

    return changes;
  }
}

interface ArchitectureDiff {
  versionBefore: string;
  versionAfter: string;
  timestampBefore: number;
  timestampAfter: number;

  added: ArchitectureBox[];
  removed: ArchitectureBox[];
  modified: ModifiedBox[];

  metrics: MetricsDiff;
}

interface ModifiedBox {
  boxId: string;
  before: ArchitectureBox;
  after: ArchitectureBox;
  changes: BoxChange[];
}

interface BoxChange {
  type: 'metric' | 'relationship' | 'location' | 'metadata';
  change: 'added' | 'removed' | 'modified';
  field: string;
  before?: any;
  after?: any;
  values?: any[];
}

interface MetricsDiff {
  totalBoxes: number;
  totalComplexity: number;
  averageComplexity: number;
  totalLOC: number;
}
```

### 5.2 Diff Visualization in Spreadsheet

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Architecture Diff                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Comparing: [v1.2.3 ▼] vs [v1.3.0 ▼]                             │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  📈 SUMMARY                                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Boxes: +12  -5  (net: +7)                                 │ │
│  │ Complexity: +45  -23  (net: +22)                          │ │
│  │ LOC: +1,234  -567  (net: +667)                            │ │
│  │ Tests: +85% coverage                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  ➕ ADDED (12)                                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 📄 src/features/auth/AuthService.ts (new)                  │ │
│  │ 📄 src/features/user/UserService.ts (new)                  │ │
│  │ 📄 src/features/payment/PaymentService.ts (new)             │ │
│  │ ...                                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ➖ REMOVED (5)                                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 📄 src/legacy/LegacyAuth.ts (deleted)                      │ │
│  │ 📄 src/old/OldParser.ts (deleted)                          │ │
│  │ ...                                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ✏️  MODIFIED (8)                                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 📄 src/app.ts                                                  │ │
│  │    • Complexity: 45 → 52 (+7) 🔴                            │ │
│  │    • Added calls: AuthService, UserService                   │ │
│  │    • Removed calls: LegacyAuth                               │ │
│  │                                                              │ │
│  │ 📄 src/routes/api.ts                                          │ │
│  │    • Added 3 new routes                                     │ │
│  │    • Complexity: 12 → 15 (+3) 🟡                           │ │
│  │                                                              │ │
│  │ ...                                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [Export Diff]  [View Full Graph]  [Commit Changes]              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Real-Time Execution Visualization

### 6.1 Execution Tracing

```typescript
interface ExecutionTracer {
  private activeTraces: Map<string, ExecutionTrace> = new Map();

  /**
   * Start tracing execution
   */
  async startTrace(config: TraceConfig): Promise<string> {
    const traceId = this.generateTraceId();

    const trace: ExecutionTrace = {
      id: traceId,
      config: config,
      status: 'running',
      startTime: Date.now(),
      events: [],
      nodes: ExecutionNode[],
      edges: ExecutionEdge[],
    };

    this.activeTraces.set(traceId, trace);

    // Start monitoring
    await this.monitorExecution(trace);

    return traceId;
  }

  /**
   * Record execution event
   */
  async recordEvent(
    traceId: string,
    event: ExecutionEvent
  ): Promise<void> {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;

    trace.events.push(event);

    // Update visualization
    await this.updateVisualization(trace, event);
  }

  /**
   * Stop tracing
   */
  async stopTrace(traceId: string): Promise<ExecutionTrace> {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    trace.status = 'completed';
    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;

    // Generate final report
    trace.report = await this.generateReport(trace);

    return trace;
  }

  /**
   * Get real-time trace status
   */
  async getTraceStatus(traceId: string): Promise<TraceStatus> {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    return {
      id: trace.id,
      status: trace.status,
      duration: Date.now() - trace.startTime,
      eventCount: trace.events.length,
      currentNode: this.getCurrentNode(trace),
    };
  }

  private async monitorExecution(trace: ExecutionTrace): Promise<void> {
    // Implementation depends on tracing mechanism
    // Could use:
    // - DTrace/SystemTap for system-level
    // - AST instrumentation for code-level
    // - Bytecode instrumentation for runtime
    throw new Error('Not implemented');
  }

  private async updateVisualization(
    trace: ExecutionTrace,
    event: ExecutionEvent
  ): Promise<void> {
    // Update spreadsheet visualization in real-time
    throw new Error('Not implemented');
  }

  private async generateReport(trace: ExecutionTrace): Promise<TraceReport> {
    return {
      traceId: trace.id,
      duration: trace.duration,
      eventCount: trace.events.length,
      nodeCount: trace.nodes.length,
      edgeCount: trace.edges.length,
      hottestPath: this.findHottestPath(trace),
      bottlenecks: this.findBottlenecks(trace),
    };
  }

  private findHottestPath(trace: ExecutionTrace): ExecutionPath {
    // Find most frequently executed path
    throw new Error('Not implemented');
  }

  private findBottlenecks(trace: ExecutionTrace): Bottleneck[] {
    // Find performance bottlenecks
    throw new Error('Not implemented');
  }
}

interface TraceConfig {
  // Target
  target: 'method' | 'module' | 'repository';
  targetId: string;

  // Scope
  includeChildren: boolean;
  depth: number;

  // Filtering
  eventTypes: TraceEventType[];

  // Sampling
  sampleRate: number;  // 0.0 - 1.0

  // Duration
  maxDuration?: number;
}

type TraceEventType =
  | 'method_call'
  | 'method_return'
  | 'exception'
  | 'loop_iteration'
  | 'branch_taken'
  | 'variable_access';

interface ExecutionTrace {
  id: string;
  config: TraceConfig;
  status: 'running' | 'completed' | 'error';

  startTime: number;
  endTime?: number;
  duration?: number;

  events: ExecutionEvent[];
  nodes: ExecutionNode[];
  edges: ExecutionEdge[];

  report?: TraceReport;
}

interface ExecutionEvent {
  id: string;
  timestamp: number;
  type: TraceEventType;

  source: {
    boxId: string;
    boxName: string;
    filePath: string;
    line: number;
  };

  data: {
    callee?: string;
    args?: any[];
    returnValue?: any;
    exception?: any;
    branchCondition?: string;
    loopIndex?: number;
    variableName?: string;
    variableValue?: any;
  };
}

interface ExecutionNode {
  id: string;
  box: ArchitectureBox;
  executionCount: number;
  avgDuration: number;
  totalDuration: number;
}

interface ExecutionEdge {
  id: string;
  fromNode: string;
  toNode: string;
  callCount: number;
}

interface TraceStatus {
  id: string;
  status: 'running' | 'completed' | 'error';
  duration: number;
  eventCount: number;
  currentNode?: ExecutionNode;
}

interface TraceReport {
  traceId: string;
  duration: number;
  eventCount: number;
  nodeCount: number;
  edgeCount: number;
  hottestPath: ExecutionPath;
  bottlenecks: Bottleneck[];
}

interface ExecutionPath {
  nodes: ExecutionNode[];
  edges: ExecutionEdge[];
  totalDuration: number;
  callCount: number;
}

interface Bottleneck {
  node: ExecutionNode;
  type: 'slow' | 'frequent' | 'error-prone';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}
```

### 6.2 Real-Time Visualization in Spreadsheet

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ Execution Trace                                      [Stop]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tracing: src/app.ts → main()                                   │
│  Duration: 2.3s  Events: 145  Status: 🟢 Running               │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  ⏳ CURRENT NODE                                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📄 src/app.ts:45 → main()                                │ │
│  │    Calling: AuthService.initialize()                      │ │
│  │    Args: { config: {...} }                                  │ │
│  │    Duration so far: 45ms                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                             │                                  │
│                             ▼                                  │
│  📊 CALL STACK (3 frames)                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 1. main() - src/app.ts:45                                   │ │
│  │ 2. init() - src/app.ts:23                                    │ │
│  │ 3. bootstrap() - src/bootstrap.ts:12                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  📈 EXECUTION GRAPH (Real-time)                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │     main()                                                    │ │
│ │       ████                                                    │ │
│ │         │                                                      │ │
│ │         ├─→ init() ─→ bootstrap()                          │ │
│  │         │                                                      │ │
│  │         └─→ connect() ─→ authenticate()                    │ │
│  │                 ████ ████ ████                               │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ⚠️  ISSUES (0 detected)                                         │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  📊 METRICS (Live)                                               │
│  • Total executions: 45                                        │
│  • Average duration: 52ms                                       │
│  • Max depth: 5                                                │
│  • Errors: 0                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

UPDATES: Every 100ms
AUTO-SCROLL: Yes
```

---

## 7. TypeScript Interface Definitions

### 7.1 Code Visualizer

```typescript
/**
 * Main visualizer for code architecture
 */
interface CodeVisualizer {
  /**
   * Visualize entire repository
   */
  visualizeRepository(
    repositoryPath: string,
    options?: VisualizationOptions
  ): Promise<VisualizationResult>;

  /**
   * Visualize specific module
   */
  visualizeModule(
    modulePath: string,
    options?: VisualizationOptions
  ): Promise<VisualizationResult>;

  /**
   * Visualize specific class or function
   */
  visualizeBox(
    boxId: string,
    options?: VisualizationOptions
  ): Promise<VisualizationResult>;

  /**
   * Generate visualization graph
   */
  generateGraph(
    boxes: ArchitectureBox[],
    options?: GraphOptions
  ): Promise<GraphVisualization>;
}

interface VisualizationOptions {
  // Scope
  depth?: number;                    // How deep to traverse
  includeTests?: boolean;          // Include test files

  // Filtering
  boxTypes?: BoxType[];             // Filter by box type
  complexityThreshold?: number;    // Minimum complexity to show
  namePattern?: RegExp;            // Filter by name pattern

  // Layout
  layout?: 'hierarchical' | 'force' | 'circular';
  groupByModule?: boolean;          // Group by module/file

  // Metrics
  showMetrics?: boolean;
  showComplexity?: boolean;
  showCoverage?: boolean;

  // Relationships
  showImports?: boolean;
  showCalls?: boolean;
  showDependencies?: boolean;
}

interface VisualizationResult {
  repositoryId: string;
  boxes: ArchitectureBox[];
  graph: GraphVisualization;
  metrics: RepositoryMetrics;
  timestamp: number;
}

interface GraphVisualization {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: GraphLayout;

  // Rendering
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface GraphNode {
  id: string;
  box: ArchitectureBox;

  position: {
    x: number;
    y: number;
  };

  size: {
    width: number;
    height: number;
  };

  // Style
  color: string;
  borderColor: string;
  borderWidth: number;

  // Labels
  showLabel: boolean;
  showIcon: boolean;
  showMetrics: boolean;

  // State
  selected: boolean;
  highlighted: boolean;
  collapsed: boolean;
}

interface GraphEdge {
  id: string;
  from: string;  // Source node ID
  to: string;    // Target node ID

  // Type
  type: 'import' | 'call' | 'extends' | 'implements';

  // Style
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';

  // Label
  label?: string;

  // Animation
  animated: boolean;
  highlighted: boolean;

  // Metrics
  callCount?: number;    // For call edges
}

interface GraphLayout {
  type: 'hierarchical' | 'force' | 'circular' | 'manual';

  // Hierarchical layout
  hierarchical?: {
    direction: 'tb' | 'bt' | 'lr' | 'rl';
    levelSpacing: number;
    nodeSpacing: number;
  };

  // Force-directed layout
  force?: {
    repulsion: number;
    attraction: number;
    damping: number;
    iterations: number;
  };

  // Circular layout
  circular?: {
    sortBy: 'name' | 'type' | 'random';
    startAngle: number;
  };
}

interface RepositoryMetrics {
  // Structure
  totalBoxes: number;
  totalModules: number;
  totalClasses: number;
  totalFunctions: number;

  // Complexity
  totalComplexity: number;
  averageComplexity: number;
  maxComplexity: number;

  // Size
  totalLOC: number;
  averageLOC: number;

  // Relationships
  totalImports: number;
  totalCalls: number;
  averageCoupling: number;

  // Testing
  totalTests: number;
  averageCoverage: number;

  // Issues
  totalSmells: number;
  totalDuplications: number;
}
```

### 7.2 Spreadsheet UI Renderer

```typescript
/**
 * Render visualizations in spreadsheet format
 */
interface SpreadsheetUI {
  /**
   * Render box in a cell
   */
  renderBoxCell(
    box: ArchitectureBox,
    cellRef: string,
    style?: BoxStyle
  ): Promise<void>;

  /**
   * Render graph across cells
   */
  renderGraphCells(
    graph: GraphVisualization,
    startCell: string,
    options?: GraphRenderOptions
  ): Promise<GraphRenderResult>;

  /**
   * Render inspector panel
   */
  renderInspector(
    box: ArchitectureBox,
    tab?: InspectorTab
  ): Promise<void>;

  /**
   * Render hover tooltip
   */
  renderHoverTooltip(
    box: ArchitectureBox,
    position: HoverPosition
  ): Promise<void>;

  /**
   * Update box status
   */
  updateBoxStatus(
    boxId: string,
    status: BoxStatus
  ): Promise<void>;

  /**
   * Highlight boxes
   */
  highlightBoxes(
    boxIds: string[],
    highlight: boolean
  ): Promise<void>;
}

interface BoxStyle {
  compact?: boolean;
  showMetrics?: boolean;
  showIcon?: boolean;
  showStatus?: boolean;
  color?: string;
  borderLeft?: string;
}

interface GraphRenderOptions {
  cellWidth?: number;
  cellHeight?: number;
  spacing?: number;
  showLabels?: boolean;
  showConnections?: boolean;
}

interface GraphRenderResult {
  cellsUsed: string[];
  actualWidth: number;
  actualHeight: number;
  renderTime: number;
}

interface HoverPosition {
  x: number;
  y: number;
  anchor?: 'top' | 'bottom' | 'left' | 'right';
}

enum BoxStatus {
  READY = 'ready',
  LOADING = 'loading',
  ERROR = 'error',
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

enum InspectorTab {
  OVERVIEW = 'overview',
  STRUCTURE = 'structure',
  METRICS = 'metrics',
  RELATIONSHIPS = 'relationships',
  TESTS = 'tests',
  ISSUES = 'issues',
  CODE = 'code',
}
```

### 7.3 Interactive Explorer

```typescript
/**
 * Interactive exploration of architecture
 */
interface InteractiveExplorer {
  /**
   * Drill down into box
   */
  drillDown(boxId: string): Promise<void>;

  /**
   * Navigate up
   */
  navigateUp(): Promise<void>;

  /**
   * Navigate to specific box
   */
  navigateTo(boxId: string): Promise<void>;

  /**
   * Navigate to root
   */
  navigateToRoot(): Promise<void>;

  /**
   * Get current navigation path
   */
  getCurrentPath(): DrillDownPath;

  /**
   * Search for boxes
   */
  searchBoxes(query: SearchQuery): Promise<ArchitectureBox[]>;

  /**
   * Filter boxes
   */
  filterBoxes(filter: BoxFilter): Promise<ArchitectureBox[]>;

  /**
   * Follow relationship
   */
  followRelationship(
    boxId: string,
    relationshipType: 'imports' | 'calls' | 'used-by'
  ): Promise<ArchitectureBox[]>;

  /**
   * Trace execution path
   */
  traceExecution(methodId: string): Promise<ExecutionPath>;
}

interface DrillDownPath {
  root: string;
  current: string;
  path: BoxNode[];
  backStack: string[];
  forwardStack: string[];
}

interface BoxNode {
  boxId: string;
  boxName: string;
  boxType: BoxType;
  depth: number;
}

interface SearchQuery {
  text?: string;
  boxTypes?: BoxType[];
  complexityRange?: [number, number];
  authors?: string[];
  dateRange?: [number, number];
}

interface BoxFilter {
  boxTypes?: BoxType[];
  complexityThreshold?: number;
  hasTests?: boolean;
  hasIssues?: boolean;
  authors?: string[];
  modules?: string[];
}
```

### 7.4 Visual Differ

```typescript
/**
 * Compare architectures visually
 */
interface VisualDiffer {
  /**
   * Compare two versions
   */
  compareVersions(
    versionBefore: string,
    versionAfter: string
  ): Promise<ArchitectureDiff>;

  /**
   * Compare two commits
   */
  compareCommits(
    commitBefore: string,
    commitAfter: string
  ): Promise<ArchitectureDiff>;

  /**
   * Compare branches
   */
  compareBranches(
    branch1: string,
    branch2: string
  ): Promise<ArchitectureDiff>;

  /**
   * Render diff in spreadsheet
   */
  renderDiff(
    diff: ArchitectureDiff,
    startCell: string,
    options?: DiffRenderOptions
  ): Promise<void>;

  /**
   * Export diff as report
   */
  exportDiff(
    diff: ArchitectureDiff,
    format: 'markdown' | 'html' | 'pdf'
  ): Promise<string>;
}

interface DiffRenderOptions {
  style?: 'side-by-side' | 'unified' | 'summary-only';
  showMetrics?: boolean;
  showContext?: boolean;
  contextLines?: number;
  highlightChanges?: boolean;
}
```

### 7.5 Execution Visualizer

```typescript
/**
 * Visualize real-time execution
 */
interface ExecutionVisualizer {
  /**
   * Start tracing execution
   */
  startTrace(config: TraceConfig): Promise<string>;

  /**
   * Stop tracing
   */
  stopTrace(traceId: string): Promise<ExecutionTrace>;

  /**
   * Get trace status
   */
  getTraceStatus(traceId: string): Promise<TraceStatus>;

  /**
   * Render live trace in spreadsheet
   */
  renderLiveTrace(
    traceId: string,
    startCell: string,
    options?: TraceRenderOptions
  ): Promise<void>;

  /**
   * Render trace timeline
   */
  renderTraceTimeline(
    traceId: string,
    startCell: string
  ): Promise<void>;

  /**
   * Render execution graph
   */
  renderExecutionGraph(
    traceId: string,
    startCell: string
  ): Promise<void>;
}

interface TraceConfig {
  target: 'method' | 'module' | 'repository';
  targetId: string;

  includeChildren?: boolean;
  depth?: number;

  eventTypes?: TraceEventType[];
  sampleRate?: number;

  maxDuration?: number;
}

interface TraceRenderOptions {
  updateInterval?: number;
  showCallStack?: boolean;
  showMetrics?: boolean;
  showGraph?: boolean;
  autoScroll?: boolean;
}
```

---

## 8. Implementation Patterns

### 8.1 Cell Layout Algorithms

```typescript
/**
 * Calculate layout for rendering boxes in cells
 */
class CellLayoutCalculator {
  /**
   * Layout hierarchical graph in cells
   */
  layoutHierarchical(
    graph: GraphVisualization,
    startCell: string,
    options: GraphRenderOptions
  ): GraphRenderResult {
    const levels = this.calculateLevels(graph);
    const positions = this.assignCellPositions(levels, startCell, options);

    return {
      cellsUsed: positions.map(p => p.cellRef),
      actualWidth: this.calculateWidth(positions, options),
      actualHeight: this.calculateHeight(positions, options),
      renderTime: Date.now(),
    };
  }

  /**
   * Calculate hierarchical levels
   */
  private calculateLevels(graph: GraphVisualization): Map<number, GraphNode[]> {
    const levels = new Map<number, GraphNode[]>();
    const visited = new Set<string>();

    const calculateLevel = (nodeId: string, depth: number): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      if (!levels.has(depth)) {
        levels.set(depth, []);
      }

      const node = graph.nodes.find(n => n.id === nodeId);
      if (node) {
        levels.get(depth)!.push(node);

        // Process children (outgoing edges)
        const children = graph.edges
          .filter(e => e.from === nodeId)
          .map(e => e.to);

        for (const childId of children) {
          calculateLevel(childId, depth + 1);
        }
      }
    };

    // Find root nodes (no incoming edges)
    const roots = graph.nodes.filter(node =>
      !graph.edges.some(edge => edge.to === node.id)
    );

    for (const root of roots) {
      calculateLevel(root.id, 0);
    }

    return levels;
  }

  /**
   * Assign cell positions
   */
  private assignCellPositions(
    levels: Map<number, GraphNode[]>,
    startCell: string,
    options: GraphRenderOptions
  ): CellPosition[] {
    const positions: CellPosition[] = [];
    const { cellWidth = 80, cellHeight = 20, spacing = 1 } = options;

    let currentRow = 0;
    let currentCol = 0;

    for (const [level, nodes] of levels) {
      for (const node of nodes) {
        const cellRef = this.calculateCellRef(
          startCell,
          currentRow,
          currentCol
        );

        positions.push({
          cellRef,
          nodeId: node.id,
          row: currentRow,
          col: currentCol,
          width: cellWidth,
          height: this.calculateNodeHeight(node, cellHeight),
        });

        currentCol += cellWidth + spacing;
      }

      currentRow += this.calculateLevelHeight(level, cellHeight) + spacing;
      currentCol = 0;
    }

    return positions;
  }

  private calculateCellRef(
    startCell: string,
    row: number,
    col: number
  ): string {
    // Convert row/col to cell reference (e.g., "A1")
    const colLetter = String.fromCharCode(65 + col); // A, B, C, ...
    const rowNum = row + 1;
    return `${colLetter}${rowNum}`;
  }

  private calculateNodeHeight(node: GraphNode, baseHeight: number): number {
    const metricsHeight = node.showMetrics ? 40 : 0;
    return baseHeight + metricsHeight;
  }

  private calculateLevelHeight(level: number, baseHeight: number): number {
    // Return height of tallest node in level
    return baseHeight;
  }
}

interface CellPosition {
  cellRef: string;
  nodeId: string;
  row: number;
  col: number;
  width: number;
  height: number;
}
```

### 8.2 Real-Time Update Strategy

```typescript
/**
 * Handle real-time updates to visualization
 */
class RealTimeUpdater {
  private spreadsheet: SpreadsheetUI;
  private updateQueue: UpdateTask[] = [];
  private isProcessing: boolean = false;

  /**
   * Queue update task
   */
  queueUpdate(update: UpdateTask): void {
    this.updateQueue.push(update);
    this.processQueue();
  }

  /**
   * Process update queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.updateQueue.length > 0) {
        const update = this.updateQueue.shift()!;
        await this.applyUpdate(update);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Apply update to spreadsheet
   */
  private async applyUpdate(update: UpdateTask): Promise<void> {
    switch (update.type) {
      case 'box-status':
        await this.spreadsheet.updateBoxStatus(
          update.boxId,
          update.status
        );
        break;

      case 'box-highlight':
        await this.spreadsheet.highlightBoxes(
          update.boxIds,
          update.highlight
        );
        break;

      case 'trace-event':
        await this.updateTraceVisualization(
          update.traceId,
          update.event
        );
        break;

      case 'graph-update':
        await this.updateGraphVisualization(
          update.graph
        );
        break;
    }
  }

  private async updateTraceVisualization(
    traceId: string,
    event: ExecutionEvent
  ): Promise<void> {
    // Update live trace visualization
    throw new Error('Not implemented');
  }

  private async updateGraphVisualization(
    graph: GraphVisualization
  ): Promise<void> {
    // Update graph in spreadsheet
    throw new Error('Not implemented');
  }
}

interface UpdateTask {
  type: 'box-status' | 'box-highlight' | 'trace-event' | 'graph-update';
  boxId?: string;
  boxIds?: string[];
  status?: BoxStatus;
  highlight?: boolean;
  traceId?: string;
  event?: ExecutionEvent;
  graph?: GraphVisualization;
}
```

### 8.3 Performance Optimization

```typescript
/**
 * Optimize visualization performance
 */
class VisualizationOptimizer {
  /**
   * Reduce number of boxes for visualization
   */
  simplifyBoxes(
    boxes: ArchitectureBox[],
    targetCount: number
  ): ArchitectureBox[] {
    // Group by importance
    const importanceScores = boxes.map(box => ({
      box,
      score: this.calculateImportance(box),
    }));

    // Sort by score
    importanceScores.sort((a, b) => b.score - a.score);

    // Return top N
    return importanceScores
      .slice(0, targetCount)
      .map(item => item.box);
  }

  /**
   * Collapse less important boxes
   */
  collapseBoxes(
    boxes: ArchitectureBox[],
    threshold: number
  ): ArchitectureBox[] {
    return boxes.map(box => {
      if (box.importance && box.importance < threshold) {
        // Create collapsed version
        return {
          ...box,
          collapsed: true,
          children: [], // Hide children
        };
      }
      return box;
    });
  }

  /**
   * Cache visualization results
   */
  private cache = new Map<string, CachedVisualization>();

  async getCachedVisualization(
    key: string,
    factory: () => Promise<VisualizationResult>
  ): Promise<VisualizationResult> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const result = await factory();
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Calculate importance score
   */
  private calculateImportance(box: ArchitectureBox): number {
    let score = 0;

    // Complexity contributes to importance
    score += box.complexity * 0.3;

    // Number of relationships
    score += box.calls.length * 0.2;
    score += box.calledBy.length * 0.2;

    // Test coverage
    if (box.testCoverage) {
      score += box.testCoverage * 0.1;
    }

    // Issues
    score -= box.smells.length * 0.5;

    return score;
  }

  /**
   * Virtualize rendering for large graphs
   */
  async virtualizedRender(
    graph: GraphVisualization,
    viewport: Viewport
  ): Promise<GraphVisualization> {
    // Only render nodes in viewport
    const visibleNodes = graph.nodes.filter(node =>
      this.isInViewport(node, viewport)
    );

    const visibleEdges = graph.edges.filter(edge =>
      visibleNodes.some(n => n.id === edge.from) &&
      visibleNodes.some(n => n.id === edge.to)
    );

    return {
      ...graph,
      nodes: visibleNodes,
      edges: visibleEdges,
    };
  }

  private isInViewport(node: GraphNode, viewport: Viewport): boolean {
    return (
      node.position.x >= viewport.x &&
      node.position.x <= viewport.x + viewport.width &&
      node.position.y >= viewport.y &&
      node.position.y <= viewport.y + viewport.height
    );
  }
}

interface CachedVisualization {
  result: VisualizationResult;
  timestamp: number;
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

---

## UI Patterns

### Pattern 1: Progressive Revelation

1. **Level 0**: Repository overview (total boxes, metrics)
2. **Level 1**: Module breakdown (boxes per file)
3. **Level 2**: Class/function details (methods, fields)
4. **Level 3**: Implementation code (source view)

### Pattern 2: Context-Aware Actions

Right-click menu options change based on box type:

```
┌─────────────────────────────────┐
│  Method Box Actions:              │
│  ├─ 🔍 Find Callers               │
│  ├─ 🔗 Find Callees               │
│  ├─ 📊 View Metrics               │
│  ├─ 🧪 Run Tests                  │
│  ├─ 📝 View Code                   │
│  └─ ⚙️  Configure                  │
│                                  │
│  Module Box Actions:               │
│  ├─ 🔍 Find Dependents            │
│  ├─ 📦 View Contents              │
│  ├─ 📊 Metrics Summary            │
│  └─ 📄 Open File                  │
└─────────────────────────────────┘
```

### Pattern 3: Status Indication

```typescript
enum BoxStatus {
  READY = 'ready',           // Green - Loaded and ready
  LOADING = 'loading',     // Yellow - Fetching data
  ERROR = 'error',         // Red - Failed to load
  ACTIVE = 'active',       // Blue - Currently being traced
  DISABLED = 'disabled',     // Gray - Filtered out
}

const statusColors = {
  ready: '#22C55E',
  loading: '#EAB308',
  error: '#EF4444',
  active: '#3B82F6',
  disabled: '#9CA3AF',
};
```

### Pattern 4: Color Coding by Category

```typescript
const categoryColors: Record<BoxType, string> = {
  // Structure
  repository: '#64748B',     // Slate
  module: '#3B82F6',          // Blue
  class: '#8B5CF6',           // Purple
  interface: '#A855F7',       // Violet
  method: '#06B6D4',           // Cyan
  function: '#14B8A6',         // Teal
  field: '#64748B',           // Slate

  // Analysis
  complexity: '#F59E0B',       // Amber
  coverage: '#10B981',          // Emerald
  dependency: '#6366F1',       // Indigo
  duplication: '#EF4444',       // Red
  smell: '#F97316',            // Orange

  // Execution
  call: '#FBBF24',             // Yellow
  return: '#34D399',           // Green
  exception: '#EF4444',        // Red
  loop: '#A855F7',             // Purple

  // Data
  input: '#3B82F6',             // Blue
  output: '#10B981',            // Green
  transform: '#8B5CF6',         // Purple
};
```

---

## Conclusion

This Software Visualization system provides comprehensive capabilities for reverse engineering code architecture directly in spreadsheets:

### Key Features

1. **Multi-Level Visualization**: From repository overview to function-level details
2. **Interactive Exploration**: Drill-down, search, and relationship traversal
3. **Real-Time Tracing**: Watch execution flow as code runs
4. **Visual Diffing**: Compare architectures across versions
5. **Spreadsheet-Native**: All visualization in cells, panels, and hover states

### Implementation Phases

**Phase 1**: Basic Visualization
- Box extraction from AST
- Simple cell rendering
- Basic navigation

**Phase 2**: Interactive Features
- Drill-down navigation
- Relationship tracing
- Search and filtering

**Phase 3**: Advanced Analysis
- Real-time execution tracing
- Visual diff and comparison
- Performance metrics

**Phase 4**: Optimization
- Virtualization for large graphs
- Caching strategies
- Progressive loading

---

**Document Status**: ✅ Complete
**Last Updated**: 2026-03-08
**Version**: 1.0.0
**Next Phase**: Implementation

---

*Making code architecture as visible and interactive as a spreadsheet, one box at a time.* 📊✨
