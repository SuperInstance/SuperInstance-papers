/**
 * Example usage of the POLLN NLP Spreadsheet Parser
 *
 * This example demonstrates various features of the natural language
 * to formula conversion system.
 */

import { NLParser } from './index.js';
import type { SpreadsheetContext } from './types.js';

/**
 * Basic usage example
 */
async function basicExample() {
  console.log('=== Basic Usage Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  // Simple sum
  const sum = await parser.parseToFormula('sum the sales column');
  console.log('Input: "sum the sales column"');
  console.log('Formula:', sum.formula);
  console.log('Explanation:', sum.explanation);
  console.log('Intent:', sum.intent.type);
  console.log();

  // Average calculation
  const average = await parser.parseToFormula('calculate the average of A1 to A10');
  console.log('Input: "calculate the average of A1 to A10"');
  console.log('Formula:', average.formula);
  console.log('Complexity:', average.complexity);
  console.log();

  // Filter with condition
  const filter = await parser.parseToFormula('filter values greater than 100');
  console.log('Input: "filter values greater than 100"');
  console.log('Formula:', filter.formula);
  console.log('Entities:', filter.entities.map(e => e.type));
  console.log();
}

/**
 * Context-aware example
 */
async function contextAwareExample() {
  console.log('=== Context-Aware Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  // Set up spreadsheet context
  const context: Partial<SpreadsheetContext> = {
    sheetName: 'SalesData',
    sheets: ['SalesData', 'Expenses', 'Summary'],
    headers: {
      A: 'Date',
      B: 'Product',
      C: 'Quantity',
      D: 'Price',
      E: 'Revenue',
      F: 'Category'
    },
    columnTypes: {
      A: 'date',
      B: 'string',
      C: 'number',
      D: 'number',
      E: 'number',
      F: 'string'
    },
    namedRanges: {
      'SalesRange': 'E1:E100',
      'QuantityRange': 'C1:C100',
      'ProductData': 'A1:F100'
    }
  };

  parser.updateContext('SalesData', context);

  // Use context for parsing
  const totalRevenue = await parser.parseToFormula('sum the sales range', 'SalesData');
  console.log('Input: "sum the sales range"');
  console.log('Formula:', totalRevenue.formula);
  console.log('Explanation:', totalRevenue.explanation);
  console.log();

  const avgQuantity = await parser.parseToFormula('what is the average quantity', 'SalesData');
  console.log('Input: "what is the average quantity"');
  console.log('Formula:', avgQuantity.formula);
  console.log();
}

/**
 * Ambiguity handling example
 */
async function ambiguityExample() {
  console.log('=== Ambiguity Handling Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  // Clear request (no ambiguity)
  const clear = await parser.parseWithClarification('sum A1 to A10');
  console.log('Input: "sum A1 to A10"');
  console.log('Needs clarification:', clear.needsClarification);
  console.log('Formula:', clear.formula.formula);
  console.log();

  // Ambiguous request
  const ambiguous = await parser.parseWithClarification('calculate it');
  console.log('Input: "calculate it"');
  console.log('Needs clarification:', ambiguous.needsClarification);

  if (ambiguous.needsClarification && ambiguous.clarificationQuestions) {
    console.log('Clarification questions:');
    ambiguous.clarificationQuestions.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.question}`);
      console.log(`     Options: ${q.options.join(', ')}`);
    });
  }
  console.log();
}

/**
 * Formula explanation example
 */
async function explanationExample() {
  console.log('=== Formula Explanation Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  const formulas = [
    '=SUM(A1:A10)',
    '=AVERAGEIF(B1:B100,">100")',
    '=IF(C1>0,"Positive","Negative")',
    '=VLOOKUP(A1,B1:C10,2,FALSE)',
    '=SUMIFS(D1:D100,A1:A100,">100",B1:B100,"Sales")'
  ];

  for (const formula of formulas) {
    const explanation = await parser.explainFormula(formula);
    console.log(`Formula: ${formula}`);
    console.log(`Explanation: ${explanation}`);
    console.log();
  }
}

/**
 * Auto-completion example
 */
async function completionExample() {
  console.log('=== Auto-Completion Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  const partials = ['SU', 'AVER', 'IF', 'VLOO'];

  for (const partial of partials) {
    const suggestions = parser.suggestCompletion(partial);
    console.log(`Partial: "${partial}"`);

    if (suggestions.length > 0) {
      console.log('Suggestions:');
      suggestions.slice(0, 3).forEach(s => {
        console.log(`  - ${s.text}: ${s.description} (relevance: ${s.relevance.toFixed(2)})`);
      });
    }
    console.log();
  }
}

/**
 * Learning from corrections example
 */
async function learningExample() {
  console.log('=== Learning from Corrections Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  // Initial parsing (might be incorrect)
  const result1 = await parser.parseToFormula('sum the entire column', 'Sheet1');
  console.log('First attempt:', result1.formula);

  // User provides correction
  parser.provideCorrection('Sheet1', 'sum the entire column', '=SUM(A:A)');
  console.log('User correction: =SUM(A:A)');

  // Second attempt (should use correction)
  const result2 = await parser.parseToFormula('sum the entire column', 'Sheet1');
  console.log('Second attempt:', result2.formula);
  console.log();

  // Provide feedback
  parser.provideFeedback('Sheet1', 'sum the entire column', 'positive');
  console.log('Feedback: positive');
  console.log();
}

/**
 * Multi-turn conversation example
 */
async function conversationExample() {
  console.log('=== Multi-Turn Conversation Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  parser.updateContext('Sheet1', {
    headers: { A: 'Sales', B: 'Expenses', C: 'Profit' }
  });

  const queries = [
    'sum the sales',
    'now sum the expenses',
    'calculate the profit',
    'what is the profit margin'
  ];

  for (const query of queries) {
    const result = await parser.parseToFormula(query, 'Sheet1');
    console.log(`Query: "${query}"`);
    console.log(`Formula: ${result.formula}`);
    console.log();
  }

  // Show conversation history
  const history = parser['contextManager'].getConversationHistory('Sheet1');
  console.log(`Total interactions: ${history.length}`);
  console.log();
}

/**
 * Intent detection example
 */
async function intentExample() {
  console.log('=== Intent Detection Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  const queries = [
    'calculate the sum of sales',
    'analyze the trends in the data',
    'go to cell B10',
    'format column A as currency',
    'create a bar chart',
    'filter values greater than 100',
    'sort by column A descending',
    'validate the data for errors',
    'convert column A to uppercase',
    'aggregate sales by region'
  ];

  for (const query of queries) {
    const intent = parser.detectIntent(query);
    console.log(`Query: "${query}"`);
    console.log(`Intent: ${intent.type} (confidence: ${intent.confidence.toFixed(2)})`);
    console.log(`Action: ${intent.action}`);
    console.log();
  }
}

/**
 * Entity extraction example
 */
async function entityExample() {
  console.log('=== Entity Extraction Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  const queries = [
    'sum A1 to Z100',
    'filter values greater than 500',
    'calculate 50% of the total sales',
    'find the maximum value in column B',
    'count rows where A1 contains "text"'
  ];

  for (const query of queries) {
    const entities = parser.extractEntities(query);
    console.log(`Query: "${query}"`);
    console.log('Entities:');

    entities.forEach(e => {
      console.log(`  - ${e.type}: "${e.text}" (confidence: ${e.confidence.toFixed(2)})`);
    });
    console.log();
  }
}

/**
 * Statistics and monitoring example
 */
async function statisticsExample() {
  console.log('=== Statistics and Monitoring Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  // Perform various operations
  const operations = [
    () => parser.parseToFormula('sum A1', 'Sheet1'),
    () => parser.parseToFormula('average B1', 'Sheet1'),
    () => parser.parseToFormula('count C1', 'Sheet1'),
    () => parser.parseToFormula('max D1', 'Sheet1'),
    () => parser.parseToFormula('min E1', 'Sheet1')
  ];

  for (const op of operations) {
    await op();
  }

  // Get statistics
  const stats = parser.getStatistics();
  console.log('Statistics:');
  console.log(`  Total contexts: ${stats.totalContexts}`);
  console.log(`  Total conversations: ${stats.totalConversations}`);
  console.log(`  Total corrections: ${stats.totalCorrections}`);
  console.log(`  Average confidence: ${stats.averageConfidence.toFixed(2)}`);
  console.log();

  // Get cost tracking
  const costs = parser.getCostTracking();
  console.log('Cost Tracking:');
  console.log(`  Total tokens: ${costs.totalTokens}`);
  console.log(`  Total cost: $${costs.totalCost.toFixed(4)}`);
  console.log(`  Requests: ${costs.requestCount}`);
  console.log();
}

/**
 * State persistence example
 */
async function persistenceExample() {
  console.log('=== State Persistence Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  // Set up some state
  parser.updateContext('Sheet1', {
    headers: { A: 'Test' },
    columnTypes: { A: 'string' }
  });

  await parser.parseToFormula('sum the test column', 'Sheet1');
  parser.provideFeedback('Sheet1', 'sum the test column', 'positive');

  // Export state
  const state = parser.exportState();
  console.log('Exported state:');
  console.log(`  Contexts: ${Object.keys(state.contexts).length}`);
  console.log(`  Conversations: ${Object.keys(state.conversationHistory).length}`);
  console.log();

  // Import state into new parser
  const newParser = new NLParser({ provider: 'mock' });
  newParser.importState(state);

  // Verify state was imported
  const context = newParser['contextManager'].getContext('Sheet1');
  console.log('Imported context:');
  console.log(`  Headers: ${JSON.stringify(context?.headers)}`);

  const history = newParser['contextManager'].getConversationHistory('Sheet1');
  console.log(`  History entries: ${history.length}`);
  console.log(`  Feedback: ${history[0].feedback}`);
  console.log();
}

/**
 * Complex business scenario example
 */
async function businessScenarioExample() {
  console.log('=== Business Scenario Example ===\n');

  const parser = new NLParser({ provider: 'mock' });

  // Set up sales dashboard context
  parser.updateContext('SalesDashboard', {
    headers: {
      A: 'Date',
      B: 'Salesperson',
      C: 'Product',
      D: 'Quantity',
      E: 'Unit Price',
      F: 'Total Revenue',
      G: 'Region',
      H: 'Category'
    },
    columnTypes: {
      A: 'date',
      B: 'string',
      C: 'string',
      D: 'number',
      E: 'number',
      F: 'number',
      G: 'string',
      H: 'string'
    },
    namedRanges: {
      'Revenue': 'F1:F1000',
      'Quantity': 'D1:D1000',
      'SalesData': 'A1:H1000'
    }
  });

  const businessQueries = [
    'calculate total revenue',
    'what is the average order value',
    'find the top performing salesperson',
    'calculate revenue by region',
    'show month over month growth',
    'identify products with low sales'
  ];

  for (const query of businessQueries) {
    const result = await parser.parseToFormula(query, 'SalesDashboard');
    console.log(`Business Question: "${query}"`);
    console.log(`Formula: ${result.formula}`);
    console.log(`Explanation: ${result.explanation}`);
    console.log(`Complexity: ${result.complexity}/10`);
    console.log();
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await basicExample();
    await contextAwareExample();
    await ambiguityExample();
    await explanationExample();
    await completionExample();
    await learningExample();
    await conversationExample();
    await intentExample();
    await entityExample();
    await statisticsExample();
    await persistenceExample();
    await businessScenarioExample();

    console.log('=== All Examples Completed Successfully ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export {
  basicExample,
  contextAwareExample,
  ambiguityExample,
  explanationExample,
  completionExample,
  learningExample,
  conversationExample,
  intentExample,
  entityExample,
  statisticsExample,
  persistenceExample,
  businessScenarioExample,
  runAllExamples
};
