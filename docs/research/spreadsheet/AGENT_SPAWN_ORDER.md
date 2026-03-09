# AGENT_SPAWN_ORDER.md - Execution Sequence for Implementation Agents

**Exact Instructions for glm-4.7 Implementation Agents**

---

## Overview

This document provides the exact spawn order, prompts, and expected outputs for each implementation agent. Follow this sequence precisely to ensure dependencies are satisfied.

---

## Pre-Spawn Checklist

Before spawning any agents, verify:
- [ ] All planning documents created and reviewed
- [ ] CLAUDE.md updated with new paradigm
- [ ] CELL_ONTOLOGY.md reviewed
- [ ] MASTER_PLAN.md reviewed
- [ ] DECISION_LOG.md reviewed
- [ ] User has confirmed they are ready for implementation

---

## Wave 1: Foundation (Days 1-14)

### Agent 1: foundation-agent-1 (Days 1-3)

**Spawn Prompt**:
```
You are implementing the LogCell base class for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for the complete cell anatomy
- Read docs/research/spreadsheet/MASTER_PLAN.md for the overall architecture

## Your Task
Create the foundational LogCell class in src/spreadsheet/core/LogCell.ts

## Requirements
1. Implement the LogCell interface with head, body, tail, origin
2. Create the CellState enum (DORMANT, SENSING, PROCESSING, OUTPUTTING, ERROR)
3. Implement lifecycle methods: activate(), process(), learn(), deactivate()
4. Implement inspection methods: inspect(), getTrace(), getHistory()
5. Write comprehensive unit tests with 90%+ coverage

## Files to Create
- src/spreadsheet/core/LogCell.ts
- src/spreadsheet/core/__tests__/LogCell.test.ts

## TypeScript Interface to Implement
interface LogCell {
  id: CellId;
  type: CellType;
  position: CellPosition;
  state: CellState;
  logicLevel: LogicLevel;
  head: CellHead;
  body: CellBody;
  tail: CellTail;
  origin: CellOrigin;

  activate(): Promise<void>;
  process(input: any): Promise<CellOutput>;
  learn(feedback: Feedback): Promise<void>;
  deactivate(): Promise<void>;

  inspect(): CellInspection;
  getTrace(): ReasoningTrace;
  getHistory(): ExecutionHistory;
}

## Success Criteria
- [ ] LogCell class compiles without errors
- [ ] All lifecycle methods work correctly
- [ ] 90%+ test coverage
- [ ] Code follows existing project conventions
```

---

### Agent 2: foundation-agent-2 (Days 4-6)

**Spawn Prompt**:
```
You are implementing the CellHead and Sensation system for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for the head anatomy and sensation types
- Read src/spreadsheet/core/LogCell.ts (created by foundation-agent-1) for integration

## Your Task
Create the CellHead class and Sensation system in:
- src/spreadsheet/core/CellHead.ts
- src/spreadsheet/core/Sensation.ts

## Requirements
1. Implement CellHead with input channels, recognizers, and validators
2. Implement the SensationType enum (6 types: absolute, velocity, trend, presence, pattern, anomaly)
3. Implement the Sensation interface with source, type, value, confidence
4. Implement sensation detection algorithms
5. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/core/CellHead.ts
- src/spreadsheet/core/Sensation.ts
- src/spreadsheet/core/__tests__/CellHead.test.ts
- src/spreadsheet/core/__tests__/Sensation.test.ts

## Success Criteria
- [ ] CellHead receives inputs correctly
- [ ] All 6 sensation types work
- [ ] Sensation detection algorithms accurate
- [ ] 90%+ test coverage
```

---

### Agent 3: foundation-agent-3 (Days 7-9)

**Spawn Prompt**:
```
You are implementing the CellBody (processing/reasoning) for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for the body anatomy
- Read src/spreadsheet/core/LogCell.ts for integration

## Your Task
Create the CellBody class in src/spreadsheet/core/CellBody.ts

## Requirements
1. Implement CellBody with logic, memory, trace, and selfModel
2. Implement the ProcessingLogic interface
3. Implement ExecutionMemory for storing past executions
4. Implement ReasoningTrace generation (step-by-step reasoning)
5. Implement CellSelfModel for self-awareness
6. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/core/CellBody.ts
- src/spreadsheet/core/__tests__/CellBody.test.ts

## Success Criteria
- [ ] CellBody processes inputs correctly
- [ ] Reasoning trace is generated
- [ ] Memory stores and retrieves executions
- [ ] 90%+ test coverage
```

---

### Agent 4: foundation-agent-4 (Days 10-12)

**Spawn Prompt**:
```
You are implementing the CellTail (output/action) for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for the tail anatomy
- Read src/spreadsheet/core/LogCell.ts for integration

## Your Task
Create the CellTail class in src/spreadsheet/core/CellTail.ts

## Requirements
1. Implement CellTail with outputs, effects, actions, and subscribers
2. Implement OutputChannel for value emission
3. Implement Effect for cell-to-cell effects
4. Implement Action for external actions
5. Implement subscriber notification system
6. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/core/CellTail.ts
- src/spreadsheet/core/__tests__/CellTail.test.ts

## Success Criteria
- [ ] CellTail emits outputs correctly
- [ ] Effects propagate to other cells
- [ ] Subscribers are notified
- [ ] 90%+ test coverage
```

---

### Agent 5: foundation-agent-5 (Days 13-14)

**Spawn Prompt**:
```
You are implementing the CellOrigin (self-reference) and Origin-Centered Coordinates for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for the origin anatomy
- Read docs/research/spreadsheet/DECISION_LOG.md for why origin-centered design

## Your Task
Create the CellOrigin and Coordinates classes in:
- src/spreadsheet/core/CellOrigin.ts
- src/spreadsheet/core/Coordinates.ts

## Requirements
1. Implement CellOrigin with id, position, selfAwareness, and watchedCells
2. Implement OriginCenteredCoordinates for coordinate transformation
3. Implement toRelative() and toAbsolute() methods
4. Implement WatchedCell tracking
5. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/core/CellOrigin.ts
- src/spreadsheet/core/Coordinates.ts
- src/spreadsheet/core/__tests__/CellOrigin.test.ts
- src/spreadsheet/core/__tests__/Coordinates.test.ts

## Success Criteria
- [ ] Origin-centered coordinates work correctly
- [ ] Watched cells are tracked
- [ ] Coordinate transformations accurate
- [ ] 90%+ test coverage
```

---

## Wave 2: Cell Types (Days 15-28)

### Agent 6: celltypes-agent-1 (Days 15-17)

**Spawn Prompt**:
```
You are implementing InputCell and OutputCell for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for cell type specifications
- Read src/spreadsheet/core/LogCell.ts for the base class

## Your Task
Create InputCell and OutputCell in src/spreadsheet/cells/

## Requirements
1. Implement InputCell extending LogCell
2. InputCell receives user data, external data  and formulas
3. Implement OutputCell extending LogCell
4. OutputCell produces final results
5. Both cell type has L0 logic (pure computation)
6. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/cells/InputCell.ts
- src/spreadsheet/cells/OutputCell.ts
- src/spreadsheet/cells/__tests__/InputCell.test.ts
- src/spreadsheet/cells/__tests__/OutputCell.test.ts

## Success Criteria
- [ ] InputCell receives all input types
- [ ] OutputCell produces results correctly
- [ ] Both work with L0 logic
- [ ] 90%+ test coverage
```

---

### Agent 7: celltypes-agent-2 (Days 18-20)

**Spawn Prompt**:
```
You are implementing TransformCell and FilterCell for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for cell type specifications
- Read src/spreadsheet/core/LogCell.ts for the base class

## Your Task
Create TransformCell and FilterCell in src/spreadsheet/cells/

## Requirements
1. Implement TransformCell for data transformation
2. TransformCell supports common transformations (map, reduce, etc.)
3. Implement FilterCell for filtering/selection
4. FilterCell supports condition-based filtering
5. Both cell types use L0-L1 logic
6. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/cells/TransformCell.ts
- src/spreadsheet/cells/FilterCell.ts
- src/spreadsheet/cells/__tests__/TransformCell.test.ts
- src/spreadsheet/cells/__tests__/FilterCell.test.ts

## Success Criteria
- [ ] TransformCell transforms data correctly
- [ ] FilterCell filters correctly
- [ ] Both support L0-L1 logic
- [ ] 90%+ test coverage
```

---

### Agent 8: celltypes-agent-3 (Days 21-23)

**Spawn Prompt**:
```
You are implementing AggregateCell and ValidateCell for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for cell type specifications
- Read src/spreadsheet/core/LogCell.ts for the base class

## Your Task
Create AggregateCell and ValidateCell in src/spreadsheet/cells/

## Requirements
1. Implement AggregateCell for aggregation/summarization
2. AggregateCell supports sum, average, count, min, max, etc.
3. Implement ValidateCell for validation/checking
4. ValidateCell supports rules-based validation
5. Both use L0-L1 logic
6. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/cells/AggregateCell.ts
- src/spreadsheet/cells/ValidateCell.ts
- src/spreadsheet/cells/__tests__/AggregateCell.test.ts
- src/spreadsheet/cells/__tests__/ValidateCell.test.ts

## Success Criteria
- [ ] AggregateCell aggregates correctly
- [ ] ValidateCell validates correctly
- [ ] Both support L0-L1 logic
- [ ] 90%+ test coverage
```

---

### Agent 9: celltypes-agent-4 (Days 24-26)

**Spawn Prompt**:
```
You are implementing AnalysisCell for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for AnalysisCell specification
- Read src/spreadsheet/core/LogCell.ts for the base class

## Your Task
Create AnalysisCell in src/spreadsheet/cells/AnalysisCell.ts

## Requirements
1. Implement AnalysisCell extending LogCell
2. Support L2 (distilled agent) and L3 (full LLM) logic
3. Implement analysis reasoning (observation, inference, conclusion)
4. Generate confidence scores
5. Generate explanations
6. Integrate with existing LLM adapters in src/core/
7. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/cells/AnalysisCell.ts
- src/spreadsheet/cells/__tests__/AnalysisCell.test.ts

## Success Criteria
- [ ] AnalysisCell performs analysis correctly
- [ ] L2 and L3 logic dispatch works
- [ ] Confidence scores are generated
- [ ] Explanations are clear
- [ ] 90%+ test coverage
```

---

### Agent 10: celltypes-agent-5 (Days 27-28)

**Spawn Prompt**:
```
You are implementing PredictionCell and DecisionCell for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for cell type specifications
- Read src/spreadsheet/cells/AnalysisCell.ts (just created)

## Your Task
Create PredictionCell and DecisionCell in src/spreadsheet/cells/

## Requirements
1. Implement PredictionCell for forecasting/prediction
2. PredictionCell uses time series analysis
3. Implement DecisionCell for decision making
4. DecisionCell integrates with POLLN's Plinko system
5. Both support L2/L3 logic
6. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/cells/PredictionCell.ts
- src/spreadsheet/cells/DecisionCell.ts
- src/spreadsheet/cells/__tests__/PredictionCell.test.ts
- src/spreadsheet/cells/__tests__/DecisionCell.test.ts

## Success Criteria
- [ ] PredictionCell predicts correctly
- [ ] DecisionCell makes good decisions
- [ ] Plinko integration works
- [ ] 90%+ test coverage
```

---

## Wave 3: Reasoning (Days 29-42)

### Agent 11: reasoning-agent-1 (Days 29-31)

**Spawn Prompt**:
```
You are implementing the ReasoningTrace system for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for ReasoningTrace specification
- Read src/spreadsheet/core/CellBody.ts for integration

## Your Task
Create the ReasoningTrace system in src/spreadsheet/reasoning/ReasoningTrace.ts

## Requirements
1. Implement ReasoningTrace with steps, dependencies, confidence, totalTime
2. Implement ReasoningStep with 8 types (observation, analysis, inference, prediction, decision, action, validation, explanation)
3. Implement dependency tracking between steps
4. Implement confidence aggregation
5. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/reasoning/ReasoningTrace.ts
- src/spreadsheet/reasoning/__tests__/ReasoningTrace.test.ts

## Success Criteria
- [ ] ReasoningTrace captures all steps
- [ ] Dependencies are tracked
- [ ] Confidence is aggregated correctly
- [ ] 90%+ test coverage
```

---

### Agent 12: reasoning-agent-2 (Days 32-34)

**Spawn Prompt**:
```
You are implementing the LogicLevels system (L0-L3) for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for LogicLevel specification
- Read docs/research/spreadsheet/DECISION_LOG.md for why we4 levels

## Your Task
Create the LogicLevels system in src/spreadsheet/reasoning/LogicLevels.ts

## Requirements
1. Implement LogicLevel enum (L0_LOGIC, L1_PATTERN, L2_AGENT, L3_LLM)
2. Implement LogicDispatcher for routing to appropriate level
3. Implement cost estimation for each level
4. Implement level selection based on task complexity
5. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/reasoning/LogicLevels.ts
- src/spreadsheet/reasoning/__tests__/LogicLevels.test.ts

## Success Criteria
- [ ] Logic levels dispatch correctly
- [ ] Cost estimation is accurate
- [ ] Level selection is appropriate
- [ ] 90%+ test coverage
```

---

### Agent 13: reasoning-agent-3 (Days 35-37)

**Spawn Prompt**:
```
You are implementing the LearningEngine for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for learning specification
- Read src/spreadsheet/core/CellBody.ts for memory integration

## Your Task
Create the LearningEngine in src/spreadsheet/reasoning/LearningEngine.ts

## Requirements
1. Implement LearningEngine for learning from feedback
2. Support pattern extraction from examples
3. Implement confidence adjustment based on feedback
4. Support L2 learning (distillation)
5. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/reasoning/LearningEngine.ts
- src/spreadsheet/reasoning/__tests__/LearningEngine.test.ts

## Success Criteria
- [ ] LearningEngine learns from feedback
- [ ] Patterns are extracted correctly
- [ ] Confidence adjusts appropriately
- [ ] 90%+ test coverage
```

---

### Agent 14: reasoning-agent-4 (Days 38-40)

**Spawn Prompt**:
```
You are implementing the CoordinationEngine for multi-cell coordination in the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/CELL_ONTOLOGY.md for coordination specification
- Read src/spreadsheet/core/CellOrigin.ts for watched cells

## Your Task
Create the CoordinationEngine in src/spreadsheet/reasoning/CoordinationEngine.ts

## Requirements
1. Implement CoordinationEngine for coordinating multiple cells
2. Support sequential and parallel coordination
3. Implement dependency resolution
4. Handle coordination failures gracefully
5. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/reasoning/CoordinationEngine.ts
- src/spreadsheet/reasoning/__tests__/CoordinationEngine.test.ts

## Success Criteria
- [ ] Multi-cell coordination works
- [ ] Dependencies are resolved
- [ ] Failures are handled gracefully
- [ ] 90%+ test coverage
```

---

### Agent 15: reasoning-agent-5 (Days 41-42)

**Spawn Prompt**:
```
You are implementing the DistillationEngine for L3→L2 conversion in the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/MASTER_PLAN.md for distillation strategy
- Read src/spreadsheet/reasoning/LogicLevels.ts for level definitions

## Your Task
Create the DistillationEngine in src/spreadsheet/reasoning/DistillationEngine.ts

## Requirements
1. Implement DistillationEngine for converting L3 to L2
2. Trigger distillation after 100+ successful uses
3. Preserve 95%+ functionality
4. Track distillation metrics
5. Write comprehensive unit tests

## Files to Create
- src/spreadsheet/reasoning/DistillationEngine.ts
- src/spreadsheet/reasoning/__tests__/DistillationEngine.test.ts

## Success Criteria
- [ ] Distillation converts L3→L2
- [ ] Trigger conditions work
- [ ] Functionality is preserved
- [ ] 90%+ test coverage
```

---

## Wave 4: Platform (Days 43-56)

### Agent 16: platform-agent-1 (Days 43-46)

**Spawn Prompt**:
```
You are implementing the Excel adapter and custom functions for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/SIDE_PANEL_SPECS.md for Excel integration
- Read src/spreadsheet/cells/ for available cell types

## Your Task
Create the Excel integration in src/spreadsheet/platform/excel/

## Requirements
1. Implement ExcelAdapter wrapping Office.js
2. Implement custom functions: =AGENT(), =INSPECT(), =WATCH()
3. Implement cell-to-Excel-cell binding
4. Handle Excel events
5. Write integration tests

## Files to Create
- src/spreadsheet/platform/excel/ExcelAdapter.ts
- src/spreadsheet/platform/excel/CustomFunctions.ts
- src/spreadsheet/platform/excel/__tests__/ExcelAdapter.test.ts

## Success Criteria
- [ ] Excel adapter works with Office.js
- [ ] Custom functions work in Excel
- [ ] Cell binding works
- [ ] Integration tests pass
```

---

### Agent 17: platform-agent-2 (Days 47-49)

**Spawn Prompt**:
```
You are implementing the Task Pane UI for Excel in the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/SIDE_PANEL_SPECS.md for UI specifications
- Read src/spreadsheet/core/ for cell inspection

## Your Task
Create the Task Pane UI in src/spreadsheet/ui/

## Requirements
1. Implement TaskPane React component
2. Implement CellInspector for viewing cell details
3. Implement TraceViewer for reasoning traces
4. Implement SensationMonitor for watching cells
5. Use Zustand for state management
6. Write component tests

## Files to Create
- src/spreadsheet/ui/TaskPane.tsx
- src/spreadsheet/ui/CellInspector.tsx
- src/spreadsheet/ui/TraceViewer.tsx
- src/spreadsheet/ui/__tests__/TaskPane.test.tsx

## Success Criteria
- [ ] Task pane renders correctly
- [ ] Cell inspection works
- [ ] Trace viewing works
- [ ] Component tests pass
```

---

### Agent 18: platform-agent-3 (Days 50-52)

**Spawn Prompt**:
```
You are implementing the Google Sheets adapter for the POLLN spreadsheet integration.

## Context
- Read docs/research/spreadsheet/SIDE_PANEL_SPECS.md for Google Sheets integration
- Read src/spreadsheet/platform/excel/ExcelAdapter.ts for adapter pattern

## Your Task
Create the Google Sheets integration in src/spreadsheet/platform/googlesheets/

## Requirements
1. Implement SheetsAdapter wrapping Apps Script
2. Implement sidebar UI
3. Implement custom functions for Sheets
4. Handle Sheets events
5. Write integration tests

## Files to Create
- src/spreadsheet/platform/googlesheets/SheetsAdapter.ts
- src/spreadsheet/platform/googlesheets/CustomFunctions.ts
- src/spreadsheet/platform/googlesheets/__tests__/SheetsAdapter.test.ts

## Success Criteria
- [ ] Sheets adapter works
- [ ] Sidebar renders
- [ ] Custom functions work
- [ ] Integration tests pass
```

---

### Agent 19: platform-agent-4 (Days 53-56)

**Spawn Prompt**:
```
You are writing integration tests for the POLLN spreadsheet integration.

## Context
- Read all src/spreadsheet/ files for understanding
- Read docs/research/spreadsheet/MASTER_PLAN.md for test requirements

## Your Task
Create comprehensive integration tests in src/spreadsheet/__tests__/integration/

## Requirements
1. Test end-to-end cell workflows
2. Test multi-cell coordination
3. Test platform integration (Excel/Sheets)
4. Test learning and distillation
5. Test error handling and recovery

## Files to Create
- src/spreadsheet/__tests__/integration/cell-workflow.test.ts
- src/spreadsheet/__tests__/integration/coordination.test.ts
- src/spreadsheet/__tests__/integration/learning.test.ts

## Success Criteria
- [ ] All integration tests pass
- [ ] Coverage > 85%
- [ ] Error cases tested
- [ ] Performance acceptable
```

---

## Wave 5: Polish (Days 57-70)

### Agent 20: polish-agent-1 (Days 57-60)

**Spawn Prompt**:
```
You are implementing the final Inspector and TraceViewer components for the POLLN spreadsheet integration.

## Context
- Read src/spreadsheet/ui/ for existing components
- Read docs/research/spreadsheet/SIDE_PANEL_SPECS.md for UI specs

## Your Task
Polish the Inspector and TraceViewer in src/spreadsheet/ui/

## Requirements
1. Enhance Inspector with full cell details
2. Enhance TraceViewer with step navigation
3. Add search and filter capabilities
4. Add export functionality (JSON, markdown)
5. Write component tests

## Files to Modify
- src/spreadsheet/ui/CellInspector.tsx
- src/spreadsheet/ui/TraceViewer.tsx

## Success Criteria
- [ ] Inspector shows all cell details
- [ ] TraceViewer navigates steps
- [ ] Export works
- [ ] Component tests pass
```

---

### Agent 21: polish-agent-2 (Days 61-63)

**Spawn Prompt**:
```
You are implementing the SensationMonitor and Template Gallery for the POLLN spreadsheet integration.

## Context
- Read src/spreadsheet/core/Sensation.ts for sensation system
- Read docs/research/spreadsheet/SIDE_PANEL_SPECS.md for UI specs

## Your Task
Create SensationMonitor and TemplateGallery in src/spreadsheet/ui/

## Requirements
1. Implement SensationMonitor for watching cell changes
2. Implement TemplateGallery for pre-built templates
3. Create 5 starter templates (Sales Analysis, Expense Tracking, Data Cleaning, Report Generation, Forecasting)
4. Support template import/export
5. Write component tests

## Files to Create
- src/spreadsheet/ui/SensationMonitor.tsx
- src/spreadsheet/ui/TemplateGallery.tsx
- src/spreadsheet/templates/*.ts
- src/spreadsheet/ui/__tests__/SensationMonitor.test.tsx

## Success Criteria
- [ ] SensationMonitor shows changes
- [ ] TemplateGallery has 5 templates
- [ ] Import/export works
- [ ] Component tests pass
```

---

### Agent 22: polish-agent-3 (Days 64-67)

**Spawn Prompt**:
```
You are optimizing performance for the POLLN spreadsheet integration.

## Context
- Read all src/spreadsheet/ files for understanding
- Profile the application to find bottlenecks

## Your Task
Optimize performance across the spreadsheet integration

## Requirements
1. Profile and identify bottlenecks
2. Implement caching where needed
3. Optimize cell coordination
4. Reduce memory footprint
5. Target <200ms for typical operations

## Files to Modify
- Various files based on profiling results

## Success Criteria
- [ ] Typical operations < 200ms
- [ ] Memory footprint acceptable
- [ ] No performance regressions
- [ ] Benchmarks pass
```

---

### Agent 23: polish-agent-4 (Days 68-70)

**Spawn Prompt**:
```
You are completing documentation and examples for the POLLN spreadsheet integration.

## Context
- Read all src/spreadsheet/ files for understanding
- Read docs/research/spreadsheet/ for existing docs

## Your Task
Complete documentation and create examples

## Requirements
1. Update README with spreadsheet integration docs
2. Create API documentation for all public classes
3. Create 5 example use cases
4. Create getting started guide
5. Update CLAUDE.md with final status

## Files to Create/Modify
- docs/spreadsheet/README.md
- docs/spreadsheet/API.md
- examples/spreadsheet/*.ts
- CLAUDE.md

## Success Criteria
- [ ] Documentation complete
- [ ] Examples work
- [ ] Getting started guide clear
- [ ] CLAUDE.md updated
```

---

## Post-Spawn Verification

After all agents complete:

1. Run full test suite: `npm test`
2. Check coverage: `npm run test:coverage`
3. Build project: `npm run build`
4. Verify Excel integration
5. Verify Google Sheets integration
6. Create final commit

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: ✅ Complete - Ready for Agent Spawning
**Total Agents**: 23 agents across 5 waves
