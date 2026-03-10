# Natural Language Processing for POLLN Spreadsheets

A comprehensive natural language to formula parser for spreadsheet applications, enabling users to create Excel-compatible formulas using plain English.

## Features

- **Natural Language Understanding**: Convert plain English requests into Excel formulas
- **Intent Recognition**: Automatically detect user intent (calculation, analysis, filtering, etc.)
- **Entity Extraction**: Identify cell references, ranges, values, operations, and conditions
- **Formula Generation**: Create optimized Excel-compatible formulas
- **Context Awareness**: Maintain spreadsheet context and conversation history
- **Learning System**: Learn from user corrections and feedback
- **LLM Integration**: Support for OpenAI, Anthropic, and local models
- **Cost Tracking**: Monitor token usage and API costs

## Installation

```bash
npm install @polln/spreadsheet-nlp
```

## Quick Start

```typescript
import { NLParser } from '@polln/spreadsheet-nlp';

// Create parser with mock provider (for testing)
const parser = new NLParser({ provider: 'mock' });

// Parse natural language to formula
const result = await parser.parseToFormula('sum the sales column');

console.log(result.formula);      // '=SUM(A1:A100)'
console.log(result.explanation);  // 'Calculate the sum of values in range A1 to A100'
console.log(result.intent);       // { type: 'create_formula', confidence: 0.9, action: '...' }
console.log(result.entities);     // [{ type: 'operation', text: 'sum', ... }]
```

## Usage Examples

### Basic Formula Generation

```typescript
// Simple sum
const sum = await parser.parseToFormula('sum A1 to A10');
// → '=SUM(A1:A10)'

// Average calculation
const average = await parser.parseToFormula('calculate the average of column B');
// → '=AVERAGE(B:B)'

// Complex conditions
const filtered = await parser.parseToFormula('sum values greater than 100');
// → '=SUMIF(A1:A100,">100")'
```

### Context-Aware Parsing

```typescript
// Set up spreadsheet context
parser.updateContext('Sheet1', {
  headers: {
    A: 'Sales',
    B: 'Quantity',
    C: 'Revenue'
  },
  columnTypes: {
    A: 'number',
    B: 'number',
    C: 'number'
  },
  namedRanges: {
    'SalesData': 'A1:A100',
    'RevenueRange': 'C1:C100'
  }
});

// Use context for better parsing
const result = await parser.parseToFormula('sum the sales data', 'Sheet1');
// → '=SUM(SalesData)'
```

### Handling Ambiguity

```typescript
// Request clarification for ambiguous inputs
const result = await parser.parseWithClarification('calculate it');

if (result.needsClarification) {
  console.log('Clarification needed:');
  result.clarificationQuestions?.forEach(q => {
    console.log(`- ${q.question}`);
    console.log(`  Options: ${q.options.join(', ')}`);
  });
}
```

### Formula Explanation

```typescript
// Explain formulas in natural language
const explanation = await parser.explainFormula('=SUMIF(A1:A100,">100",B1:B100)');
// → 'Sums values in range B1 to B100 where corresponding values in A1 to A100 are greater than 100'
```

### Auto-Completion

```typescript
// Get formula suggestions
const suggestions = parser.suggestCompletion('SU');

console.log(suggestions);
// [
//   { text: 'SUM(', label: 'SUM', description: 'Adds all numbers in a range', relevance: 0.9 },
//   { text: 'SUMIF(', label: 'SUMIF', description: 'Sums values that meet criteria', relevance: 0.9 },
//   { text: 'SUMIFS(', label: 'SUMIFS', description: 'Sums values that meet multiple criteria', relevance: 0.9 }
// ]
```

### Learning from Corrections

```typescript
// Provide correction to improve future results
const result = await parser.parseToFormula('sum the column', 'Sheet1');
// → '=SUM(A1:A10)' (incorrect)

parser.provideCorrection('Sheet1', 'sum the column', '=SUM(A:A)');

// Future requests will use the correction
const corrected = await parser.parseToFormula('sum the column', 'Sheet1');
// → '=SUM(A:A)' (corrected)
```

### LLM Integration

```typescript
// Use OpenAI for advanced understanding
const parser = new NLParser({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  maxTokens: 1000,
  temperature: 0.7,
  enableCostTracking: true,
  enableCache: true
});

// Or use Anthropic
const parser = new NLParser({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-opus-20240229'
});
```

## Supported Intents

The parser can recognize and handle the following intent types:

- **create_formula**: Generate calculation formulas
- **analyze**: Perform data analysis
- **navigate**: Navigate to specific cells/ranges
- **format**: Apply formatting
- **chart**: Create charts and visualizations
- **filter**: Filter data based on conditions
- **sort**: Sort data
- **validate**: Validate data
- **transform**: Transform data
- **aggregate**: Aggregate data

## Entity Types

The parser extracts the following entity types:

- **cell**: Individual cell references (A1, B5, etc.)
- **range**: Cell ranges (A1:Z100, A:A, etc.)
- **value**: Numbers, percentages, dates, strings
- **operation**: Excel functions and operations
- **function**: Named Excel functions
- **condition**: Comparison and logical conditions

## State Persistence

```typescript
// Export state for persistence
const state = parser.exportState();

// Save to database or file
fs.writeFileSync('nlp-state.json', JSON.stringify(state));

// Import state later
const savedState = JSON.parse(fs.readFileSync('nlp-state.json', 'utf-8'));
parser.importState(savedState);
```

## Cost Tracking

```typescript
// Get cost tracking information
const costs = parser.getCostTracking();

console.log(`Total tokens: ${costs.totalTokens}`);
console.log(`Total cost: $${costs.totalCost.toFixed(4)}`);
console.log(`Requests: ${costs.requestCount}`);
console.log(`Average cost per request: $${(costs.totalCost / costs.requestCount).toFixed(4)}`);
```

## API Reference

### NLParser

Main class for natural language to formula conversion.

#### Constructor

```typescript
constructor(config?: NLPEngineConfig)
```

#### Methods

- **parseToFormula(text, sheetName?)**: Parse natural language to formula
- **parseWithClarification(text, sheetName?)**: Parse with clarification for ambiguity
- **explainFormula(formula, sheetName?)**: Explain formula in natural language
- **detectIntent(text)**: Detect intent from text
- **extractEntities(text)**: Extract entities from text
- **suggestCompletion(partial)**: Get formula completion suggestions
- **provideFeedback(sheetName, input, feedback)**: Provide feedback on results
- **provideCorrection(sheetName, input, correction)**: Provide correction
- **updateContext(sheetName, context)**: Update spreadsheet context
- **getCostTracking()**: Get cost tracking information
- **clearCache()**: Clear NLP engine cache

### Types

```typescript
interface SpreadsheetIntent {
  type: 'create_formula' | 'analyze' | 'navigate' | 'format' | 'chart' | 'filter' | 'sort' | 'validate' | 'transform' | 'aggregate';
  confidence: number;
  action: string;
}

interface Entity {
  type: 'cell' | 'range' | 'value' | 'operation' | 'function' | 'condition';
  text: string;
  position: { start: number; end: number };
  resolved: ResolvedEntity;
  confidence: number;
}

interface ParsedFormula {
  formula: string;
  explanation: string;
  intent: SpreadsheetIntent;
  entities: Entity[];
  complexity: number;
  warnings: string[];
}

interface NLPEngineConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'mock';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  enableCostTracking?: boolean;
  enableCache?: boolean;
  cacheTTL?: number;
}
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- NLParser.test.ts

# Run with coverage
npm run test:coverage
```

## Performance Considerations

- **Caching**: Enable caching to reduce API calls and costs
- **Cost Tracking**: Monitor token usage when using LLM providers
- **Context Limits**: Conversation history is limited to 50 entries per sheet
- **Cache Size**: LLM response cache is limited to 1000 entries

## Best Practices

1. **Always provide context** when possible for better accuracy
2. **Use specific language** instead of vague terms
3. **Provide corrections** to improve future results
4. **Monitor costs** when using LLM providers
5. **Enable caching** for frequently repeated queries
6. **Handle ambiguity** with clarification questions

## Examples

### Sales Dashboard

```typescript
parser.updateContext('Sales', {
  headers: {
    A: 'Date',
    B: 'Product',
    C: 'Quantity',
    D: 'Price',
    E: 'Revenue'
  },
  columnTypes: {
    A: 'date',
    B: 'string',
    C: 'number',
    D: 'number',
    E: 'number'
  }
});

// Total revenue
const total = await parser.parseToFormula('calculate total revenue', 'Sales');

// Average order value
const avgOrder = await parser.parseToFormula('what is the average order value', 'Sales');

// Top selling product
const topProduct = await parser.parseToFormula('find the product with highest revenue', 'Sales');
```

### Financial Analysis

```typescript
parser.updateContext('Financials', {
  headers: {
    A: 'Category',
    B: 'January',
    C: 'February',
    D: 'March'
  }
});

// Month-over-month growth
const growth = await parser.parseToFormula(
  'calculate the growth rate from January to March',
  'Financials'
);

// Variance analysis
const variance = await parser.parseToFormula(
  'compare actual to budget and show variance',
  'Financials'
);
```

## License

MIT

## Contributing

Contributions are welcome! Please see the main POLLN repository for guidelines.
