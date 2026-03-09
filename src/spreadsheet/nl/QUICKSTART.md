# Natural Language Interface - Quick Start Guide

## Installation

The NL interface is included in the main POLLN package. No additional installation needed.

```bash
npm install polln
```

## Basic Usage

### 1. Import the Components

```typescript
import { NLQueryEngine, QueryContext, CellData } from 'polln/spreadsheet/nl';
import { CellType, CellState } from 'polln/spreadsheet/core/types';
```

### 2. Create a Query Engine

```typescript
const engine = new NLQueryEngine();
```

### 3. Prepare Your Data

```typescript
// Create cell data
const cells = new Map<string, CellData>();
cells.set('A1', {
  id: 'A1',
  type: CellType.PREDICTION,
  state: CellState.EMITTING,
  position: { row: 1, col: 1 },
  value: 150,
  confidence: 0.9,
});

// Add history for trend analysis
const cellHistory = new Map();
cellHistory.set('A1', [
  { value: 100, timestamp: Date.now() - 2000 },
  { value: 125, timestamp: Date.now() - 1000 },
  { value: 150, timestamp: Date.now() },
]);

// Create context
const context: QueryContext = { cells, cellHistory };
```

### 4. Execute a Query

```typescript
const result = await engine.executeQuery('show me cells with value > 100', context);

console.log(result);
// {
//   success: true,
//   results: [{ id: 'A1', row: 1, col: 1 }],
//   count: 1,
//   explanation: 'Found 1 cells where value greater than 100.'
// }
```

## React Integration

```typescript
import React, { useState } from 'react';
import { QueryBar, ExplanationPanel } from 'polln/spreadsheet/ui/components';

function MySpreadsheet() {
  const [queryResult, setQueryResult] = useState(null);

  const handleQuery = async (query: string) => {
    const result = await engine.executeQuery(query, context);
    setQueryResult(result);
  };

  return (
    <div>
      <QueryBar
        onQuery={handleQuery}
        placeholder="Ask about your cells..."
        showVoiceButton={true}
        showSuggestions={true}
      />

      {queryResult && (
        <ExplanationPanel
          queryResult={queryResult}
          showSuggestions={true}
        />
      )}
    </div>
  );
}
```

## Common Query Patterns

### Filter by Value
```typescript
// Greater than
await engine.executeQuery('value > 100', context);

// Less than
await engine.executeQuery('value < 50', context);

// Range
await engine.executeQuery('value >= 10 and value <= 100', context);
```

### Filter by Type
```typescript
await engine.executeQuery('show prediction cells', context);
await engine.executeQuery('show decision cells', context);
await engine.executeQuery('show analysis cells', context);
```

### Filter by State
```typescript
await engine.executeQuery('show cells with errors', context);
await engine.executeQuery('show processing cells', context);
```

### Trend Analysis
```typescript
await engine.executeQuery('trending up', context);
await engine.executeQuery('trending down', context);
```

### Explanations
```typescript
await engine.executeQuery('explain why A1 shows an error', context);
await engine.executeQuery('why is B2 red?', context);
```

### Aggregates
```typescript
await engine.executeQuery('average of column B', context);
await engine.executeQuery('count cells with errors', context);
await engine.executeQuery('sum of column A', context);
```

## Voice Commands

```typescript
import { VoiceCommand } from 'polln/spreadsheet/nl';

const voiceCommand = new VoiceCommand({
  language: 'en-US',
  onTranscript: async (transcript) => {
    const result = await engine.executeQuery(transcript, context);
    console.log('Voice query result:', result);
  },
  onError: (error) => {
    console.error('Voice error:', error);
  },
});

// Start listening
voiceCommand.startListening();

// Stop listening
voiceCommand.stopListening();
```

## Cell Explanations

```typescript
import { CellExplainer, ExplanationDetail } from 'polln/spreadsheet/nl';

const explainer = new CellExplainer();

const explanation = explainer.explainCell(
  {
    id: 'A1',
    type: CellType.PREDICTION,
    state: CellState.EMITTING,
    value: 150,
    confidence: 0.9,
  },
  ExplanationDetail.DETAILED
);

console.log(explanation.summary);
// "A1 (prediction) is emitting with value: 150.00 (90.0% confidence)"

console.log(explanation.details);
// [
//   "Cell Type: prediction",
//   "Description: Makes predictions about future values...",
//   "Current State: emitting",
//   ...
// ]
```

## Query Suggestions

```typescript
const suggestions = engine.getSuggestions('show');

console.log(suggestions);
// [
//   "Show me cells with value > 100",
//   "Which cells have errors?",
//   "Show all prediction cells",
//   "Filter cells where confidence < 0.5"
// ]
```

## Error Handling

```typescript
const result = await engine.executeQuery('invalid query', context);

if (!result.success) {
  console.error('Query failed:', result.error);
  // Handle error
}

// Check for specific errors
if (result.error?.includes('parse')) {
  console.log('Try rephrasing your query');
}
```

## Supported Cell Types

- `input` - Input cells
- `output` - Output cells
- `prediction` - Prediction cells
- `decision` - Decision cells
- `analysis` - Analysis cells
- `transform` - Transform cells
- `filter` - Filter cells
- `aggregate` - Aggregate cells
- `validate` - Validation cells
- `explain` - Explanation cells

## Supported Cell States

- `dormant` - Idle state
- `sensing` - Receiving input
- `processing` - Processing data
- `emitting` - Producing output
- `learning` - Learning from data
- `error` - Error state

## Best Practices

### 1. Provide Context
Always include cell history for trend analysis:
```typescript
const cellHistory = new Map();
cellHistory.set('A1', [
  { value: 100, timestamp: Date.now() - 2000 },
  { value: 125, timestamp: Date.now() - 1000 },
  { value: 150, timestamp: Date.now() },
]);
```

### 2. Handle Errors Gracefully
```typescript
const result = await engine.executeQuery(query, context);
if (!result.success) {
  // Show user-friendly error message
  showError(result.error || 'Query failed');
  return;
}
```

### 3. Use Suggestions
Provide query suggestions to help users:
```typescript
const suggestions = engine.getSuggestions(partialQuery);
// Display suggestions to user
```

### 4. Explain Results
Use the explainer to provide context:
```typescript
const explanation = explainer.explainQuery(query, results);
// Display explanation to user
```

## Testing

```typescript
import { exampleQueries } from 'polln/spreadsheet/nl/__tests__/nl-query.test';

// Test with example queries
for (const query of exampleQueries) {
  const result = await engine.executeQuery(query, context);
  console.log(`Query: ${query}`);
  console.log(`Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
}
```

## Troubleshooting

### Query Not Parsing
- Check query syntax
- Try simpler query
- Use exact keywords (e.g., "prediction" not "predict")

### No Results Returned
- Verify cell data exists in context
- Check cell values match query criteria
- Ensure cell history is provided for trend queries

### Voice Not Working
- Check browser compatibility (Chrome/Edge recommended)
- Verify microphone permissions
- Check browser console for errors

## Next Steps

1. Read the full [README.md](./README.md) for detailed documentation
2. Explore [nl-query.test.ts](./__tests__/nl-query.test.ts) for more examples
3. Check [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for architecture details

## Support

For issues or questions:
- Check the test suite for examples
- Review the README documentation
- Open an issue on GitHub
