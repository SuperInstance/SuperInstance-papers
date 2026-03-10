/**
 * POLLN Spreadsheet SDK - Basic Usage Examples
 *
 * This file demonstrates the basic usage of the POLLN Spreadsheet SDK.
 *
 * @module examples/basic-usage
 */

import { POLLNSDK, createClient, cellRef } from '../index.js';

// ============================================================================
// Example 1: Initialize SDK and Create a Sheet
// ============================================================================

/**
 * Example 1: Basic SDK initialization and sheet creation
 */
export async function example1_basicInitialization() {
  console.log('=== Example 1: Basic SDK Initialization ===\n');

  // Create and initialize SDK client
  const client = await createClient({
    endpoint: 'http://localhost:3000',
    apiKey: 'your-api-key', // Replace with your actual API key
    debug: true, // Enable debug logging
  });

  console.log('✓ SDK initialized');
  console.log('  - Connected:', client.isInitialized());
  console.log('  - Authenticated:', client.isAuthenticated());

  // Get sheet API
  const sheets = await client.sheets();

  // Create a new sheet
  const sheet = await sheets.create({
    name: 'Monthly Sales Report',
    rowCount: 100,
    columnCount: 26,
    metadata: {
      description: 'Monthly sales tracking sheet',
      tags: ['sales', 'report', '2024'],
      author: 'John Doe',
    },
  });

  console.log('\n✓ Sheet created:');
  console.log('  - ID:', sheet.id);
  console.log('  - Name:', sheet.name);
  console.log('  - Rows:', sheet.rowCount);
  console.log('  - Columns:', sheet.columnCount);

  // Disconnect when done
  await client.disconnect();
  console.log('\n✓ Disconnected');
}

// ============================================================================
// Example 2: Create and Manage Cells
// ============================================================================

/**
 * Example 2: Creating and managing cells
 */
export async function example2_cellManagement() {
  console.log('=== Example 2: Cell Management ===\n');

  const client = await createClient();
  const cells = await client.cells();
  const sheets = await client.sheets();

  // Create a sheet
  const sheet = await sheets.create({
    name: 'Data Sheet',
    rowCount: 50,
    columnCount: 10,
  });

  console.log('✓ Sheet created:', sheet.id);

  // Create input cells
  const cellA1 = await cells.create('A1', 'input', 100, {
    name: 'Sales Q1',
    description: 'First quarter sales',
    format: 'currency',
  });

  const cellA2 = await cells.create('A2', 'input', 150, {
    name: 'Sales Q2',
    description: 'Second quarter sales',
    format: 'currency',
  });

  const cellA3 = await cells.create('A3', 'input', 200, {
    name: 'Sales Q3',
    description: 'Third quarter sales',
    format: 'currency',
  });

  console.log('\n✓ Input cells created:');
  console.log('  - A1:', cellA1.value);
  console.log('  - A2:', cellA2.value);
  console.log('  - A3:', cellA3.value);

  // Create an output cell with formula
  const cellA4 = await cells.create(
    'A4',
    'output',
    null,
    {
      name: 'Total Sales',
      description: 'Sum of all quarters',
      formula: '=SUM(A1:A3)',
    }
  );

  console.log('\n✓ Output cell created:');
  console.log('  - A4 (Total):', cellA4.value);
  console.log('  - Formula:', cellA4.formula);

  // Update a cell value
  const updated = await cells.update('A1', { value: 120 });
  console.log('\n✓ Cell A1 updated:', updated.value);

  // Get cell value
  const value = await cells.getValue('A1');
  console.log('✓ Cell A1 value:', value);

  // Get multiple cells
  const multipleCells = await cells.getMultiple(['A1', 'A2', 'A3']);
  console.log('\n✓ Multiple cells retrieved:');
  for (const [ref, cell] of multipleCells) {
    console.log(`  - ${ref}: ${cell.value}`);
  }

  await client.disconnect();
}

// ============================================================================
// Example 3: Query and Filter Cells
// ============================================================================

/**
 * Example 3: Querying and filtering cells
 */
export async function example3_cellQueries() {
  console.log('=== Example 3: Cell Queries ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Find all input cells
  const inputCells = await cells.findByType('input');
  console.log('✓ Input cells found:', inputCells.length);

  // Find cells with error status
  const errorCells = await cells.findByStatus('error');
  console.log('✓ Error cells found:', errorCells.length);

  // Complex query using query builder
  const { createCellQuery } = await import('../index.js');

  const query = createCellQuery()
    .withType('input')
    .withStatus('success')
    .inRowRange(0, 10)
    .withPagination(1, 20)
    .build();

  const result = await cells.query(query);
  console.log('\n✓ Query results:');
  console.log('  - Total:', result.total);
  console.log('  - Page:', result.page);
  console.log('  - Has next:', result.hasNext);

  await client.disconnect();
}

// ============================================================================
// Example 4: Batch Operations
// ============================================================================

/**
 * Example 4: Batch cell operations
 */
export async function example4_batchOperations() {
  console.log('=== Example 4: Batch Operations ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Bulk create cells
  const bulkCreateResult = await cells.bulkCreate([
    { reference: 'B1', type: 'input', value: 10 },
    { reference: 'B2', type: 'input', value: 20 },
    { reference: 'B3', type: 'input', value: 30 },
    { reference: 'B4', type: 'output', value: 0, metadata: { formula: '=SUM(B1:B3)' } },
  ]);

  console.log('✓ Bulk created', bulkCreateResult.length, 'cells');

  // Bulk update cells
  const bulkUpdateResult = await cells.bulkUpdate([
    { reference: 'B1', value: 15 },
    { reference: 'B2', value: 25 },
    { reference: 'B3', value: 35 },
  ]);

  console.log('✓ Bulk updated', bulkUpdateResult.length, 'cells');

  // Batch operations
  const batchResult = await cells.batch([
    { type: 'update', reference: 'B1', value: 100 },
    { type: 'update', reference: 'B2', value: 200 },
    { type: 'delete', reference: 'B3' },
  ]);

  console.log('\n✓ Batch operation results:');
  console.log('  - Total:', batchResult.total);
  console.log('  - Successful:', batchResult.successful);
  console.log('  - Failed:', batchResult.failed);
  console.log('  - Execution time:', batchResult.executionTimeMs, 'ms');

  await client.disconnect();
}

// ============================================================================
// Example 5: Sheet Management
// ============================================================================

/**
 * Example 5: Advanced sheet management
 */
export async function example5_sheetManagement() {
  console.log('=== Example 5: Sheet Management ===\n');

  const client = await createClient();
  const sheets = await client.sheets();

  // Create a sheet
  const sheet = await sheets.create({
    name: 'Financial Report',
    rowCount: 200,
    columnCount: 52,
    metadata: {
      description: 'Annual financial data',
      tags: ['finance', '2024'],
    },
  });

  console.log('✓ Sheet created:', sheet.id);

  // Update sheet metadata
  const metadata = await sheets.updateMetadata(sheet.id, {
    description: 'Annual financial report - updated',
    tags: ['finance', '2024', 'audited'],
  });

  console.log('\n✓ Metadata updated:', metadata.description);

  // Add tags
  await sheets.addTags(sheet.id, ['quarterly', 'consolidated']);
  console.log('✓ Tags added');

  // Set custom property
  await sheets.setCustomProperty(sheet.id, 'department', 'Finance');
  console.log('✓ Custom property set');

  // Update permissions
  const permissions = await sheets.updatePermissions(sheet.id, {
    read: ['user-1', 'user-2'],
    write: ['user-1'],
    public: false,
  });

  console.log('\n✓ Permissions updated:');
  console.log('  - Read users:', permissions.read.length);
  console.log('  - Write users:', permissions.write.length);
  console.log('  - Public:', permissions.public);

  // Get sheet statistics
  const stats = await sheets.getStats(sheet.id);
  console.log('\n✓ Sheet statistics:');
  console.log('  - Total cells:', stats.totalCells);
  console.log('  - Cells by type:', stats.cellsByType);
  console.log('  - Cells by status:', stats.cellsByStatus);

  // Create version snapshot
  const version = await sheets.createVersion(sheet.id, 'Before Q4 update');
  console.log('\n✓ Version created:', version.version);

  await client.disconnect();
}

// ============================================================================
// Example 6: Colony Management
// ============================================================================

/**
 * Example 6: Colony and agent management
 */
export async function example6_colonyManagement() {
  console.log('=== Example 6: Colony Management ===\n');

  const client = await createClient();
  const colonies = await client.colonies();

  // Create a colony
  const colony = await colonies.create({
    name: 'data-processing',
    maxAgents: 50,
    resourceBudget: {
      totalCompute: 1000,
      totalMemory: 2048,
      totalNetwork: 100,
    },
    metadata: {
      description: 'Colony for data processing tasks',
      tags: ['data', 'processing'],
    },
  });

  console.log('✓ Colony created:', colony.id);
  console.log('  - Name:', colony.name);
  console.log('  - Max agents:', colony.totalAgents);

  // Deploy an agent
  const agent = await colonies.deployAgent(colony.id, {
    category: 'ephemeral',
    typeId: 'csv-processor',
    goal: 'Process CSV files',
    modelFamily: 'default',
    inputTopics: ['csv-data'],
    outputTopic: 'processed-data',
  });

  console.log('\n✓ Agent deployed:', agent.agentId);
  console.log('  - Status:', agent.status);
  console.log('  - Deployed at:', new Date(agent.deployedAt).toISOString());

  // List agents
  const agents = await colonies.listAgents(colony.id);
  console.log('\n✓ Agents in colony:', agents.data.length);

  // Get colony statistics
  const stats = await colonies.getStats(colony.id);
  console.log('\n✓ Colony statistics:');
  console.log('  - Total agents:', stats.totalAgents);
  console.log('  - Active agents:', stats.activeAgents);
  console.log('  - Shannon diversity:', stats.shannonDiversity);

  // Get resource utilization
  const util = await colonies.getResourceUtilization(colony.id);
  console.log('\n✓ Resource utilization:');
  console.log('  - CPU:', util.cpuPercent, '%');
  console.log('  - Memory:', util.memoryPercent, '%');
  console.log('  - Network:', util.networkPercent, '%');

  await client.disconnect();
}

// ============================================================================
// Example 7: Error Handling
// ============================================================================

/**
 * Example 7: Proper error handling
 */
export async function example7_errorHandling() {
  console.log('=== Example 7: Error Handling ===\n');

  const client = await createClient();
  const cells = await client.cells();

  // Try to get non-existent cell
  try {
    const cell = await cells.get('ZZ999');
    if (cell === null) {
      console.log('✓ Cell not found (handled gracefully)');
    }
  } catch (error) {
    console.error('✗ Error:', error);
  }

  // Handle batch operation errors
  try {
    const result = await cells.batch([
      { type: 'create', reference: 'A1', value: 1 },
      { type: 'update', reference: 'INVALID', value: 2 }, // This will fail
      { type: 'delete', reference: 'B1' },
    ]);

    console.log('\n✓ Batch completed with errors:');
    console.log('  - Successful:', result.successful);
    console.log('  - Failed:', result.failed);

    // Check individual results
    for (const opResult of result.results) {
      if (!opResult.success) {
        console.log('  - Failed operation:', opResult.operation.reference);
        console.log('    Error:', opResult.error?.message);
      }
    }
  } catch (error) {
    console.error('✗ Batch error:', error);
  }

  await client.disconnect();
}

// ============================================================================
// Main Execution
// ============================================================================

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('POLLN Spreadsheet SDK - Basic Usage Examples\n');
  console.log('=' .repeat(50));

  try {
    await example1_basicInitialization();
    console.log('\n' + '='.repeat(50) + '\n');

    await example2_cellManagement();
    console.log('\n' + '='.repeat(50) + '\n');

    await example3_cellQueries();
    console.log('\n' + '='.repeat(50) + '\n');

    await example4_batchOperations();
    console.log('\n' + '='.repeat(50) + '\n');

    await example5_sheetManagement();
    console.log('\n' + '='.repeat(50) + '\n');

    await example6_colonyManagement();
    console.log('\n' + '='.repeat(50) + '\n');

    await example7_errorHandling();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('✓ All examples completed successfully');
  } catch (error) {
    console.error('\n✗ Example failed:', error);
    process.exit(1);
  }
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples();
}
