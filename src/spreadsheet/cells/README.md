# Cell System

Cell types for the spreadsheet-aware data processing units.

## Cell Types
- **LogCell** - Base cell with head/body/tail architecture
- **ExplainCell** - Human-readable explanations
- **AnalysisCell** - Data analysis
- **FilterCell** - Data filtering
- **TransformCell** - Data transformation

- **PredictCell** - Predictions and- **DecisionCell** - Decision making

## Directory Structure
```
cells/
├── core/
│   ├── LogCell.ts          # Base cell class
│   └── types.ts             # Cell types and interfaces
│
├── ExplainCell.ts         # Explanation generation
├── AnalysisCell.ts        # Data analysis
├── FilterCell.ts          # Data filtering
├── TransformCell.ts       # Data transformation
├── PredictCell.ts         # Predictions
└── DecisionCell.ts        # Decision making
```

## Core Concepts
- **Head**: Rece and route input
- **Body**: Process data using logic levels (L1-L4)
- **Tail**: Emit output and- **Origin**: Track cell position in grid

## Logic Levels
- **L1 (Reflex)**: Immediate pattern matching
- **L2 (Agent)**: Reasoning and decision making
- **L3 (LLM)**: Complex reasoning with LLM support
- **L4 (Meta)**: Self-modification and optimization

