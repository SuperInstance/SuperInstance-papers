/**
 * POLLN Spreadsheet SDK - Custom Cells Examples
 *
 * This file demonstrates creating and working with custom cell types
 * and advanced cell configurations.
 *
 * @module examples/custom-cells
 */

import { createClient, cellRef } from '../index.js';

// ============================================================================
// Example 1: Create Custom Analysis Cell
// ============================================================================

/**
 * Example 1: Creating a custom analysis cell
 */
export async function example1_customAnalysisCell() {
  console.log('=== Example 1: Custom Analysis Cell ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Create a custom analysis cell
  const cell = await cells.create(
    'A1',
    'analysis',
    null,
    {
      name: 'Trend Analysis',
      description: 'Analyzes trends in data range',
      metadata: {
        analysisType: 'trend',
        dataRange: 'B1:B10',
        confidenceLevel: 0.95,
      },
    }
  );

  console.log('✓ Custom analysis cell created:');
  console.log('  - Reference:', cell.reference);
  console.log('  - Type:', cell.type);
  console.log('  - Analysis type:', cell.metadata?.customProperties?.analysisType);
  console.log('  - Data range:', cell.metadata?.customProperties?.dataRange);

  await client.disconnect();
}

// ============================================================================
// Example 2: Create Prediction Cell
// ============================================================================

/**
 * Example 2: Creating a prediction cell
 */
export async function example2_predictionCell() {
  console.log('=== Example 2: Prediction Cell ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Create source data cells
  await cells.bulkCreate([
    { reference: 'B1', type: 'input', value: 100 },
    { reference: 'B2', type: 'input', value: 150 },
    { reference: 'B3', type: 'input', value: 200 },
    { reference: 'B4', type: 'input', value: 250 },
    { reference: 'B5', type: 'input', value: 300 },
  ]);

  console.log('✓ Source data created');

  // Create prediction cell
  const prediction = await cells.create(
    'A1',
    'prediction',
    null,
    {
      name: 'Sales Forecast',
      description: 'Predicts next month sales',
      formula: '=PREDICT(B1:B5)',
      metadata: {
        predictionType: 'linear_regression',
        horizon: 1,
        confidenceInterval: 0.9,
      },
    }
  );

  console.log('\n✓ Prediction cell created:');
  console.log('  - Predicted value:', prediction.value);
  console.log('  - Formula:', prediction.formula);
  console.log('  - Prediction type:', prediction.metadata?.customProperties?.predictionType);

  await client.disconnect();
}

// ============================================================================
// Example 3: Create Decision Cell
// ============================================================================

/**
 * Example 3: Creating a decision cell
 */
export async function example3_decisionCell() {
  console.log('=== Example 3: Decision Cell ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Create input cells for decision
  await cells.bulkCreate([
    { reference: 'A1', type: 'input', value: 50000 }, // Revenue
    { reference: 'A2', type: 'input', value: 30000 }, // Costs
    { reference: 'A3', type: 'input', value: 0.2 },   // Tax rate
  ]);

  console.log('✓ Input data created');

  // Create decision cell
  const decision = await cells.create(
    'B1',
    'decision',
    null,
    {
      name: 'Investment Decision',
      description: 'Decides whether to invest based on profitability',
      formula: '=DECISION(A1 > A2 * (1 + A3), "Invest", "Hold")',
      metadata: {
        decisionType: 'binary',
        criteria: 'profitability',
        threshold: 0,
      },
    }
  );

  console.log('\n✓ Decision cell created:');
  console.log('  - Decision:', decision.value);
  console.log('  - Formula:', decision.formula);
  console.log('  - Decision type:', decision.metadata?.customProperties?.decisionType);

  await client.disconnect();
}

// ============================================================================
// Example 4: Cell with Validation
// ============================================================================

/**
 * Example 4: Creating cells with validation rules
 */
export async function example4_cellWithValidation() {
  console.log('=== Example 4: Cell Validation ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Create cell with number validation
  const cell1 = await cells.create(
    'A1',
    'input',
    null,
    {
      name: 'Percentage',
      description: 'Must be between 0 and 100',
      metadata: {
        validation: {
          type: 'number',
          min: 0,
          max: 100,
          errorMessage: 'Value must be between 0 and 100',
          showError: true,
        },
      },
    }
  );

  console.log('✓ Cell with number validation created:', cell1.reference);

  // Create cell with list validation
  const cell2 = await cells.create(
    'A2',
    'input',
    null,
    {
      name: 'Status',
      description: 'Must be one of the allowed values',
      metadata: {
        validation: {
          type: 'list',
          allowedValues: ['Active', 'Inactive', 'Pending'],
          errorMessage: 'Must be Active, Inactive, or Pending',
        },
      },
    }
  );

  console.log('✓ Cell with list validation created:', cell2.reference);

  // Create cell with custom formula validation
  const cell3 = await cells.create(
    'A3',
    'input',
    null,
    {
      name: 'Email',
      description: 'Must be valid email format',
      metadata: {
        validation: {
          type: 'custom',
          formula: '=IS_EMAIL(A3)',
          errorMessage: 'Must be a valid email address',
        },
      },
    }
  );

  console.log('✓ Cell with custom validation created:', cell3.reference);

  // Try to update with invalid values
  console.log('\nTesting validation...');

  try {
    await cells.update('A1', { value: 150 }); // Invalid (> 100)
    console.log('✗ Should have failed validation');
  } catch (error) {
    console.log('✓ Validation caught invalid value for A1');
  }

  await client.disconnect();
}

// ============================================================================
// Example 5: Styled Cells
// ============================================================================

/**
 * Example 5: Creating cells with custom styles
 */
export async function example5_styledCells() {
  console.log('=== Example 5: Styled Cells ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Create header cell with bold style
  const header = await cells.create(
    'A1',
    'input',
    'Sales Report',
    {
      name: 'Header',
      metadata: {
        style: {
          backgroundColor: '#4472C4',
          color: '#FFFFFF',
          fontFamily: 'Arial',
          fontSize: 14,
          fontWeight: 'bold',
          alignment: 'center',
        },
      },
    }
  );

  console.log('✓ Styled header cell created:', header.reference);

  // Create currency cell
  const currency = await cells.create(
    'B1',
    'input',
    1234.56,
    {
      name: 'Amount',
      metadata: {
        format: 'currency',
        style: {
          alignment: 'right',
          color: '#00B050',
        },
      },
    }
  );

  console.log('✓ Styled currency cell created:', currency.reference);

  // Create warning cell
  const warning = await cells.create(
    'C1',
    'input',
    'Attention needed',
    {
      name: 'Warning',
      metadata: {
        style: {
          backgroundColor: '#FFC000',
          color: '#000000',
          fontWeight: 'bold',
        },
      },
    }
  );

  console.log('✓ Styled warning cell created:', warning.reference);

  await client.disconnect();
}

// ============================================================================
// Example 6: Cells with Dependencies
// ============================================================================

/**
 * Example 6: Creating cells with dependencies
 */
export async function example6_cellDependencies() {
  console.log('=== Example 6: Cell Dependencies ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Create source cells
  await cells.bulkCreate([
    { reference: 'A1', type: 'input', value: 10 },
    { reference: 'A2', type: 'input', value: 20 },
    { reference: 'A3', type: 'input', value: 30 },
  ]);

  console.log('✓ Source cells created');

  // Create dependent cell
  const sum = await cells.create(
    'B1',
    'output',
    null,
    {
      name: 'Sum',
      formula: '=SUM(A1:A3)',
      metadata: {
        dependencies: ['A1', 'A2', 'A3'],
      },
    }
  );

  console.log('✓ Dependent cell created:', sum.reference);
  console.log('  - Value:', sum.value);
  console.log('  - Dependencies:', sum.metadata?.dependencies);

  // Update source cell
  await cells.update('A1', { value: 100 });
  const updated = await cells.get('B1');

  console.log('\n✓ After updating A1 to 100:');
  console.log('  - B1 value:', updated?.value);

  await client.disconnect();
}

// ============================================================================
// Example 7: Custom Cell Type
// ============================================================================

/**
 * Example 7: Creating a truly custom cell type
 */
export async function example7_customCellType() {
  console.log('=== Example 7: Custom Cell Type ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Create a custom "sentiment" cell
  const sentimentCell = await cells.create(
    'A1',
    'custom',
    null,
    {
      name: 'Sentiment Analyzer',
      description: 'Analyzes sentiment of text',
      metadata: {
        customProperties: {
          cellType: 'sentiment-analyzer',
          inputSource: 'B1',
          outputFormat: 'score',
          threshold: 0.5,
        },
        style: {
          backgroundColor: '#E7E6E6',
          alignment: 'center',
        },
      },
    }
  );

  console.log('✓ Custom sentiment cell created:');
  console.log('  - Type:', sentimentCell.type);
  console.log('  - Custom type:', sentimentCell.metadata?.customProperties?.cellType);
  console.log('  - Input source:', sentimentCell.metadata?.customProperties?.inputSource);

  // Provide input
  await cells.create(
    'B1',
    'input',
    'I love this product! It works perfectly.',
    {
      name: 'Review Text',
    }
  );

  console.log('\n✓ Input provided');

  // The custom cell would process this and update its value
  // (This would require backend support for the custom cell type)

  await client.disconnect();
}

// ============================================================================
// Example 8: Advanced Cell Metadata
// ============================================================================

/**
 * Example 8: Cells with advanced metadata
 */
export async function example8_advancedMetadata() {
  console.log('=== Example 8: Advanced Cell Metadata ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Create cell with comprehensive metadata
  const cell = await cells.create(
    'A1',
    'input',
    42,
    {
      name: 'Key Metric',
      description: 'Primary KPI for the dashboard',
      metadata: {
        // Custom properties
        customProperties: {
          category: 'financial',
          priority: 'high',
          owner: 'finance-team',
          lastReviewed: '2024-01-15',
          nextReview: '2024-02-15',
          sla: '99.9',
        },

        // Validation
        validation: {
          type: 'number',
          min: 0,
          max: 1000,
          errorMessage: 'Value must be between 0 and 1000',
        },

        // Style
        style: {
          backgroundColor: '#92D050',
          color: '#FFFFFF',
          fontWeight: 'bold',
          alignment: 'center',
          border: {
            top: 'thin',
            right: 'thin',
            bottom: 'thin',
            left: 'thin',
          },
        },

        // Dependencies
        dependencies: [],

        // Additional metadata
        tags: ['kpi', 'financial', 'quarterly'],
        notes: 'Updated weekly by finance team',
      },
    }
  );

  console.log('✓ Cell with advanced metadata created:');
  console.log('  - Reference:', cell.reference);
  console.log('  - Value:', cell.value);
  console.log('  - Category:', cell.metadata?.customProperties?.category);
  console.log('  - Priority:', cell.metadata?.customProperties?.priority);
  console.log('  - Tags:', cell.metadata?.tags);
  console.log('  - Notes:', cell.metadata?.notes);

  await client.disconnect();
}

// ============================================================================
// Main Execution
// ============================================================================

/**
 * Run all custom cell examples
 */
export async function runAllExamples() {
  console.log('POLLN Spreadsheet SDK - Custom Cells Examples\n');
  console.log('='.repeat(50));

  try {
    await example1_customAnalysisCell();
    console.log('\n' + '='.repeat(50) + '\n');

    await example2_predictionCell();
    console.log('\n' + '='.repeat(50) + '\n');

    await example3_decisionCell();
    console.log('\n' + '='.repeat(50) + '\n');

    await example4_cellWithValidation();
    console.log('\n' + '='.repeat(50) + '\n');

    await example5_styledCells();
    console.log('\n' + '='.repeat(50) + '\n');

    await example6_cellDependencies();
    console.log('\n' + '='.repeat(50) + '\n');

    await example7_customCellType();
    console.log('\n' + '='.repeat(50) + '\n');

    await example8_advancedMetadata();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('✓ All custom cell examples completed successfully');
  } catch (error) {
    console.error('\n✗ Example failed:', error);
    process.exit(1);
  }
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples();
}
