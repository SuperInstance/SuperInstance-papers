# Natural Language Interface for Spreadsheet Cells

A comprehensive natural language interface for querying and explaining spreadsheet cells. This module allows users to interact with cells using plain English queries, without needing to understand the underlying technical details.

## Features

### 1. **Natural Language Query Engine**
Parse and execute natural language queries against spreadsheet cells.

- **Filter Queries**: "Show me cells with value > 100"
- **Trend Queries**: "Which cells are trending up?"
- **Explain Queries**: "Explain why A1 shows an error"
- **Highlight Queries**: "Highlight all prediction cells"
- **Aggregate Queries**: "What's the average of column B?"
- **Search Queries**: "Search for 'sales'"

### 2. **Voice Command Support**
Browser-based speech recognition for voice input.

- Uses Web Speech API
- Real-time transcription
- Command execution from voice input
- Multi-language support

### 3. **Plain Language Explanations**
Explain cell decisions and behavior in human-readable terms.

- Cell state explanations
- Error analysis and suggestions
- Reasoning trace breakdown
- Confidence indicators

### 4. **React UI Components**
Pre-built React components for easy integration.

- QueryBar: Natural language input with suggestions
- ExplanationPanel: Display explanations in a friendly format
- CellExplanationCard: Compact cell information cards

## Architecture

```
src/spreadsheet/nl/
├── NLQueryEngine.ts      # Main query execution engine
├── QueryParser.ts        # Natural language parser
├── CellExplainer.ts      # Plain language explanations
├── VoiceCommand.ts       # Voice input handling
├── index.ts              # Module exports
└── __tests__/
    └── nl-query.test.ts  # Comprehensive tests
```

## Usage

### Basic Query Execution

```typescript
import { NLQueryEngine, QueryContext, CellData } from '@polln/spreadsheet/nl';

// Create engine
const engine = new NLQueryEngine();

// Prepare context
const cells = new Map<string, CellData>();
cells.set('A1', {
  id: 'A1',
  type: CellType.PREDICTION,
  state: CellState.EMITTING,
  position: { row: 1, col: 1 },
  value: 150,
  confidence: 0.9,
});

const cellHistory = new Map();
cellHistory.set('A1', [
  { value: 100, timestamp: Date.now() - 2000 },
  { value: 125, timestamp: Date.now() - 1000 },
  { value: 150, timestamp: Date.now() },
]);

const context: QueryContext = { cells, cellHistory };

// Execute query
const result = await engine.executeQuery('show me cells with value > 100', context);

console.log(result);
// {
//   success: true,
//   results: [{ id: 'A1', row: 1, col: 1 }],
//   count: 1,
//   explanation: 'Found 1 cells where value greater than 100.'
// }
```

### Voice Commands

```typescript
import { VoiceCommand, VoiceState } from '@polln/spreadsheet/nl';

// Create voice command handler
const voiceCommand = new VoiceCommand({
  language: 'en-US',
  onStateChange: (event) => {
    console.log('Voice state:', event.state);
  },
  onTranscript: (transcript) => {
    console.log('Transcript:', transcript);
  },
  onError: (error) => {
    console.error('Voice error:', error);
  },
});

// Start listening
voiceCommand.startListening();

// Execute command from transcript
const result = await voiceCommand.executeCommand(transcript, context);
```

### Cell Explanations

```typescript
import { CellExplainer, ExplanationDetail } from '@polln/spreadsheet/nl';

const explainer = new CellExplainer();

const explanation = explainer.explainCell(cell, ExplanationDetail.DETAILED);

console.log(explanation);
// {
//   summary: 'A1 (prediction) is emitting with value: 150.00 (90.0% confidence)',
//   details: [
//     'Cell Type: prediction',
//     'Description: Makes predictions about future values based on historical data.',
//     'Current State: emitting',
//     'Recent history (3 changes):',
//     '[10:30:00] 100.00',
//     '[10:30:01] 125.00',
//     '[10:30:02] 150.00'
//   ],
//   confidence: 0.9,
//   suggestions: [
//     'Monitor prediction accuracy over time',
//     'Consider adjusting the prediction horizon if accuracy is low'
//   ]
// }
```

### React Components

```typescript
import React, { useState } from 'react';
import { QueryBar, ExplanationPanel } from '@polln/spreadsheet/ui/components';
import { NLQueryEngine, QueryContext } from '@polln/spreadsheet/nl';

function SpreadsheetWithNL() {
  const [queryResult, setQueryResult] = useState(null);
  const [explanation, setExplanation] = useState(null);

  const engine = new NLQueryEngine();
  const context: QueryContext = { /* ... */ };

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

## Supported Query Types

### Filter Queries

Filter cells based on values, types, or states:

- "Show me cells with value > 100"
- "Which cells have errors?"
- "Show all prediction cells"
- "Filter cells where confidence < 0.5"
- "Show me cells with value < 50"

**Operators supported**: `>`, `<`, `>=`, `<=`, `=`, `contains`

### Trend Queries

Find cells with trending values:

- "Which cells are trending up?"
- "Which cells are trending down?"
- "Show trending up cells"

Trend is calculated from the last 3 historical values.

### Explain Queries

Get explanations for cell behavior:

- "Explain why A1 shows an error"
- "Why is B2 red?"
- "Explain why C3 has low confidence"

### Highlight Queries

Highlight cells of specific types:

- "Highlight all prediction cells"
- "Highlight decision cells"

### Aggregate Queries

Calculate aggregates across cells:

- "What's the average of column B"
- "Count all cells with errors"
- "Calculate the sum of column A"

**Functions supported**: `sum`, `average`, `count`, `min`, `max`

### Search Queries

Search for text in cell values:

- "Search for 'sales'"
- "Find cells containing 'error'"

## Query Patterns

The query parser uses regex-based pattern matching. Here are the main patterns:

### Numeric Comparisons
- `/show (?:me )?(?:all )?cells?(?: with)?(?: value)? ([><=]+)\s*(\d+(?:\.\d+)?)/i`
- `/(?:show|list|display|filter) (?:me )?(?:all )?(.+?) cells?/i`

### Aggregates
- `/what(?:'s| is)?(?: the)? (sum|average|avg|mean|count|min|max) of (.+)/i`
- `/calculate (?:the )?(sum|average|avg|mean|count|min|max)(?: of)? (.+)/i`

### Trends
- `/which cells?(?: are)?(?: )?(trending|going) (up|down|higher|lower)/i`

### Explanations
- `/explain (?:why )?(.+?)(?: shows| has| is)?(?: an)?(.+)?/i`
- `/why (?:does )?(.+?)(?: show| have| is)?(?: an)?(.+)?/i`

### Searches
- `/search (?:for )?["'](.+?)["']/i`
- `/find (?:cells? )?(?:containing|with) ["'](.+?)["']/i`

## Cell Type Keywords

The following keywords map to cell types:

- `prediction` → `CellType.PREDICTION`
- `decision` → `CellType.DECISION`
- `analysis` → `CellType.ANALYSIS`
- `input` → `CellType.INPUT`
- `output` → `CellType.OUTPUT`
- `transform` → `CellType.TRANSFORM`
- `filter` → `CellType.FILTER`
- `aggregate` → `CellType.AGGREGATE`
- `validate` → `CellType.VALIDATE`
- `storage` → `CellType.STORAGE`

## State Keywords

The following keywords map to cell states:

- `error` → `CellState.ERROR`
- `processing` → `CellState.PROCESSING`
- `dormant` → `CellState.DORMANT`
- `sensing` → `CellState.SENSING`
- `emitting` → `CellState.EMITTING`
- `learning` → `CellState.LEARNING`

## Error Handling

The system provides helpful error messages:

```typescript
const result = await engine.executeQuery('invalid query', context);

if (!result.success) {
  console.error(result.error);
  // "Could not parse query"
}
```

### Common Errors

1. **"Could not parse query"**: The query doesn't match any known pattern
2. **"Empty query"**: No input provided
3. **"No filter pattern matched"**: Filter syntax is incorrect
4. **"No aggregate pattern matched"**: Aggregate syntax is incorrect

## Testing

Run the test suite:

```bash
npm test src/spreadsheet/nl/__tests__/nl-query.test.ts
```

The test suite includes:

- Query parser tests for all query types
- Query engine execution tests
- Cell explainer tests
- Integration tests
- Edge case handling

## Performance Considerations

1. **Query Parsing**: Regex-based parsing is fast (typically < 1ms)
2. **Query Execution**: O(n) where n is the number of cells
3. **Trend Analysis**: Requires historical data (last 3 values)
4. **Suggestions**: Generated on-demand based on input

## Future Enhancements

Potential improvements for future versions:

1. **AI-Powered Parsing**: Integrate with LLMs for more natural understanding
2. **Context-Aware Queries**: Remember previous queries for context
3. **Multi-Language Support**: Extend beyond English
4. **Fuzzy Matching**: Handle typos and approximate matches
5. **Query History**: Save and replay previous queries
6. **Advanced Analytics**: More sophisticated trend analysis
7. **Voice Training**: Custom voice command training

## Browser Compatibility

### Voice Commands
- Chrome/Edge: Full support
- Safari: Partial support
- Firefox: No support (use polyfill)

### React Components
- All modern browsers with React 18+
- Requires TypeScript 5+

## License

MIT

## Contributing

Contributions welcome! Please see the main project README for guidelines.
