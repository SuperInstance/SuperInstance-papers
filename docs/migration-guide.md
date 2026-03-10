# POLLN Migration Guide

Import spreadsheets from other platforms into POLLN format with living, sensing cells.

---

## Table of Contents

- [Overview](#overview)
- [Supported Platforms](#supported-platforms)
- [Installation](#installation)
- [Platform-Specific Guides](#platform-specific-guides)
  - [Excel](#excel-migration)
  - [Google Sheets](#google-sheets-migration)
  - [Airtable](#airtable-migration)
  - [Notion](#notion-migration)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

POLLN migration tools convert static spreadsheet data into living LogCells with sensation, memory, and agency. Each imported cell becomes a self-aware entity that can:

- **Sense** changes in neighboring cells
- **Reason** about data using converted formulas
- **Act** on insights through automated responses
- **Learn** patterns from data history

### Key Features

- ✅ Support for 100K+ cells
- ✅ Formula conversion (300+ Excel functions)
- ✅ Formatting preservation
- ✅ Progress tracking
- ✅ Rollback capability
- ✅ Comprehensive error reporting

---

## Supported Platforms

| Platform | Compatibility | Status | Notes |
|----------|--------------|--------|-------|
| **Excel** (.xlsx, .xlsm) | Full | ✅ Stable | 300+ functions, formatting, multiple sheets |
| **Google Sheets** | Full | ✅ Stable | API-based, real-time sync available |
| **Airtable** | Partial | ✅ Stable | Tables, fields, formulas; views not supported |
| **Notion** | Partial | ✅ Stable | Databases, properties; page content not supported |

---

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Migration tools are now available
import { ExcelImporter, MigrationOrchestrator } from '@polln/spreadsheet';
```

### Required Dependencies

```json
{
  "xlsx": "^0.18.5",
  "googleapis": "^126.0.1",
  "airtable": "^0.12.2",
  "@notionhq/client": "^2.2.15"
}
```

---

## Platform-Specific Guides

### Excel Migration

#### Basic Import

```typescript
import { ExcelImporter } from '@polln/spreadsheet/migration';

const importer = new ExcelImporter();

const result = await importer.import('data.xlsx', {
  preserveFormatting: true,
  convertFormulas: true,
  maxCellCount: 100000,
  onProgress: (progress) => {
    console.log(`${progress.stage}: ${progress.message} (${progress.current}/${progress.total})`);
  }
});

console.log(`Imported ${result.cells.length} cells from ${result.sheets.length} sheets`);
```

#### Advanced Options

```typescript
const result = await importer.import('financial-model.xlsx', {
  // Preserve cell formatting
  preserveFormatting: true,

  // Convert Excel formulas to POLLN reasoning
  convertFormulas: true,

  // Include chart data (visual representation not supported)
  includeCharts: false,

  // Maximum cell limit
  maxCellCount: 50000,

  // Import specific sheets only
  sheetFilter: ['Summary', 'Data', 'Analysis'],

  // Progress tracking
  onProgress: (progress) => {
    updateUI(progress);
  }
});
```

#### Handling Warnings

```typescript
if (result.warnings.length > 0) {
  console.warn('Import warnings:');

  for (const warning of result.warnings) {
    console.warn(`[${warning.severity}] ${warning.type}: ${warning.message}`);
    if (warning.sheet) console.warn(`  Sheet: ${warning.sheet}`);
    if (warning.cell) console.warn(`  Cell: ${warning.cell}`);
  }
}
```

#### Error Handling

```typescript
if (result.errors.some(e => e.fatal)) {
  console.error('Fatal errors occurred:');
  for (const error of result.errors.filter(e => e.fatal)) {
    console.error(`[${error.type}] ${error.message}`);
  }
  // Handle fatal error
} else {
  // Import successful with non-fatal errors
  console.log('Import completed with warnings');
}
```

---

### Google Sheets Migration

#### Setup

```typescript
import { GoogleSheetsImporter } from '@polln/spreadsheet/migration';

const importer = new GoogleSheetsImporter();

// Authenticate with Google OAuth
const authenticated = await importer.authenticate({
  clientId: 'your-client-id.apps.googleusercontent.com',
  clientSecret: 'your-client-secret',
  redirectUri: 'http://localhost:3000/auth/callback',
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ]
});

if (!authenticated) {
  throw new Error('Authentication failed');
}
```

#### Import

```typescript
const result = await importer.import({
  spreadsheetId: '1BxiMvs0XRA5nFMdKvBdBZjGMUUqpt35fsaga88jan8o',
  sheetFilter: ['Sheet1', 'Sheet2'],
  preserveFormatting: true,
  convertFormulas: true,
  includePermissions: true,
  maxCellCount: 50000,
  onProgress: (progress) => console.log(progress)
});
```

#### Real-Time Sync

```typescript
// Enable real-time updates
await importer.enableRealtimeSync(spreadsheetId, (updates) => {
  console.log('Real-time update received:', updates);
  // Update POLLN cells with new data
});

// Later, disable sync
await importer.disableRealtimeSync();
```

---

### Airtable Migration

#### Setup

```typescript
import { AirtableImporter } from '@polln/spreadsheet/migration';

const importer = new AirtableImporter();

// Set API credentials
importer.setCredentials({
  apiKey: 'patYourApiKeyHere',
  baseId: 'appYourBaseIdHere'
});
```

#### Import

```typescript
const result = await importer.import({
  tables: ['Table 1', 'Table 2'],
  includeViews: false,  // Views are UI-only, not data
  convertFormulas: true,
  followLinkedRecords: true,  // Requires additional API calls
  maxRecords: 10000,
  onProgress: (progress) => console.log(progress)
});
```

#### Field Type Mapping

| Airtable Type | POLLN Equivalent |
|---------------|-----------------|
| Single line text | String value |
| Number | Number value |
| Single select | String value (category) |
| Multiple select | Array of strings |
| Date | Date object |
| Checkbox | Boolean value |
| Attachment | File metadata (URL) |
| Linked records | Cell references |
| Formula | TransformCell reasoning |
| Lookup | Cell with reference |
| Rollup | AggregateCell |

---

### Notion Migration

#### Setup

```typescript
import { NotionImporter } from '@polln/spreadsheet/migration';

const importer = new NotionImporter();

// Set API credentials
importer.setCredentials({
  apiKey: 'secret_yourNotionApiKey',
  databaseId: 'your-database-id'
});
```

#### Import

```typescript
const result = await importer.import({
  databaseId: 'your-database-id',
  includePages: false,  // Only import database properties
  convertFormulas: true,
  followRelations: true,
  maxRecords: 5000,
  onProgress: (progress) => console.log(progress)
});
```

#### Property Type Mapping

| Notion Type | POLLN Equivalent |
|-------------|-----------------|
| Title | String value |
| Rich text | Plain text string |
| Number | Number value |
| Select | String value (category) |
| Multi-select | Array of strings |
| Date | Date object |
| Checkbox | Boolean value |
| Formula | TransformCell reasoning |
| Relation | Cell references |
| Rollup | AggregateCell |
| People | Array of user IDs |
| Files | File metadata (URL) |

---

## Advanced Features

### Smart Import (Auto-Detect Platform)

```typescript
import { quickImport } from '@polln/spreadsheet/migration';

// Auto-detect platform from file path or URL
const result = await quickImport('data.xlsx', {
  maxCellCount: 100000,
  onProgress: (p) => console.log(p)
});

// Also works with URLs
const gsResult = await quickImport('https://docs.google.com/spreadsheets/d/...', {
  googleSheetsConfig: { clientId, clientSecret, redirectUri }
});
```

### Compatibility Check

```typescript
import { getPlatformCompatibility } from '@polln/spreadsheet/migration';

const compatibility = getPlatformCompatibility('excel');

console.log(`Platform: ${compatibility.platform}`);
console.log(`Compatibility: ${compatibility.compatibility}`);
console.log(`Supported features: ${compatibility.supportedFeatures.join(', ')}`);
console.log(`Unsupported features: ${compatibility.unsupportedFeatures.join(', ')}`);
```

### Feature Mapping

```typescript
import { MigrationValidator } from '@polln/spreadsheet/migration';

const validator = new MigrationValidator();

// Get all feature mappings for a platform
const mappings = validator.getFeatureMappings('excel');

for (const mapping of mappings) {
  console.log(`${mapping.sourceFeature} -> ${mapping.pollnEquivalent || 'N/A'}`);
  console.log(`  Complexity: ${mapping.conversionComplexity}`);
  if (mapping.notes) console.log(`  Notes: ${mapping.notes}`);
}
```

### Rollback Planning

```typescript
import { createMigrationOrchestrator } from '@polln/spreadsheet/migration';

const orchestrator = createMigrationOrchestrator();

// Create rollback plan before migration
const rollbackPlan = orchestrator.createRollbackPlan('excel', 50000);

console.log(`Can rollback: ${rollbackPlan.canRollback}`);
console.log(`Method: ${rollbackPlan.rollbackMethod}`);
console.log(`Estimated time: ${rollbackPlan.estimatedTime} minutes`);

for (const step of rollbackPlan.steps) {
  console.log(`${step.order}. ${step.action}: ${step.description} (${step.automated ? 'auto' : 'manual'})`);
}
```

### Custom Formula Conversion

```typescript
import { FormulaConverter } from '@polln/spreadsheet/migration';

const converter = new FormulaConverter();

// Define custom function mappings
const customFormula = converter.convertExcelFormula(
  '=MYCUSTOMFUNCTION(A1, B1)',
  'Sheet1',
  {
    preserveReferences: false,
    strictMode: true,
    customFunctions: {
      'MYCUSTOMFUNCTION': 'custom_logic'
    }
  }
);

console.log(customFormula); // "custom_logic(cell("Sheet1", "A1"), cell("Sheet1", "B1"))"
```

### Style Conversion

```typescript
import { StyleConverter } from '@polln/spreadsheet/migration';

const converter = new StyleConverter();

// Convert Excel style to POLLN style
const style = converter.convertExcelStyle(excelCellStyleObject);

// Result includes font, fill, border, alignment, etc.
console.log(style);
/*
{
  font: { name: 'Arial', size: 12, bold: true, color: { rgb: 'FF0000' } },
  fill: { type: 'solid', color: { rgb: 'FFFF00' } },
  alignment: { horizontal: 'center', vertical: 'center' }
}
*/
```

---

## Troubleshooting

### Common Issues

#### Issue: "Authentication failed" (Google Sheets)

**Solution:** Ensure OAuth credentials are correct and redirect URI matches your Google Cloud Console configuration.

```typescript
// Verify credentials
const config = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI
};

await importer.authenticate(config);
```

#### Issue: "Cell count exceeds maximum"

**Solution:** Increase `maxCellCount` or filter sheets/tables.

```typescript
// Increase limit
const result = await importer.import('large-file.xlsx', {
  maxCellCount: 200000  // Default is 100000
});

// Or filter specific sheets
const result = await importer.import('large-file.xlsx', {
  sheetFilter: ['Summary', 'Key Metrics']
});
```

#### Issue: "Formula conversion failed"

**Solution:** Check for unsupported functions or syntax.

```typescript
import { MigrationValidator } from '@polln/spreadsheet/migration';

const validator = new MigrationValidator();

// Check if function is supported
const mapping = validator.getFeatureMapping('excel', 'VLOOKUP');

if (mapping.conversionComplexity === 'unsupported') {
  console.warn('VLOOKUP is not supported. Consider using index/match or POLLN lookup cells.');
}
```

#### Issue: "Import is slow for large files"

**Solution:** Use progress tracking and consider batching.

```typescript
const result = await importer.import('huge-file.xlsx', {
  maxCellCount: 100000,
  sheetFilter: ['Sheet1'],  // Start with smaller subset
  onProgress: (progress) => {
    // Update UI to show progress
    updateProgressBar(progress.current / progress.total);
  }
});
```

---

## Best Practices

### 1. Test Import First

Before migrating large datasets, test with a small subset:

```typescript
// Test with first sheet only
const testResult = await importer.import('data.xlsx', {
  sheetFilter: ['Sheet1'],
  maxCellCount: 1000,
  onProgress: (p) => console.log(p)
});

// Validate results
if (testResult.errors.some(e => e.fatal)) {
  console.error('Test import failed. Review errors before full migration.');
} else {
  console.log('Test import successful. Proceeding with full migration...');
}
```

### 2. Check Compatibility

Always review compatibility before migration:

```typescript
const compatibility = getPlatformCompatibility('excel');

if (compatibility.compatibility !== 'full') {
  console.warn('Partial compatibility detected:');
  console.warn('Unsupported:', compatibility.unsupportedFeatures.join(', '));

  for (const partial of compatibility.partialSupport) {
    console.warn(`${partial.feature}:`, partial.limitations.join(', '));
  }
}
```

### 3. Monitor Progress

Use progress callbacks for user feedback:

```typescript
const result = await importer.import('data.xlsx', {
  onProgress: (progress) => {
    const percentage = Math.round((progress.current / progress.total) * 100);
    console.log(`[${progress.stage}] ${percentage}%: ${progress.message}`);
    if (progress.sheet) console.log(`  Sheet: ${progress.sheet}`);
  }
});
```

### 4. Handle Errors Gracefully

```typescript
const result = await importer.import('data.xlsx', options);

// Separate fatal and non-fatal errors
const fatalErrors = result.errors.filter(e => e.fatal);
const nonFatalErrors = result.errors.filter(e => !e.fatal);

if (fatalErrors.length > 0) {
  console.error('Migration failed with fatal errors:');
  for (const error of fatalErrors) {
    console.error(`  ${error.type}: ${error.message}`);
  }
  // Rollback or notify user
} else if (nonFatalErrors.length > 0) {
  console.warn('Migration completed with non-fatal errors:');
  for (const error of nonFatalErrors) {
    console.warn(`  ${error.type}: ${error.message}`);
  }
  // Proceed with caution
} else {
  console.log('Migration completed successfully!');
}
```

### 5. Validate Results

```typescript
import { MigrationValidator } from '@polln/spreadsheet/migration';

const validator = new MigrationValidator();

// Validate imported cells
const validation = await validator.validateImportedCells(result.cells);

if (!validation.valid) {
  console.error('Validation failed:');
  for (const error of validation.errors) {
    console.error(`  [${error.category}] ${error.message}`);
  }
}

// Check warnings
for (const warning of validation.warnings) {
  console.warn(`  [${warning.category}] ${warning.message}`);
}
```

### 6. Plan Rollback

Always have a rollback plan for large migrations:

```typescript
const rollbackPlan = orchestrator.createRollbackPlan('excel', result.cells.length);

console.log('Rollback Plan:');
console.log(`  Method: ${rollbackPlan.rollbackMethod}`);
console.log(`  Estimated time: ${rollbackPlan.estimatedTime} minutes`);
console.log('  Steps:');

for (const step of rollbackPlan.steps) {
  const status = step.automated ? '✓' : '○';
  console.log(`    ${status} ${step.order}. ${step.description}`);
}
```

---

## API Reference

### ExcelImporter

```typescript
class ExcelImporter {
  import(filePath: string, options?: ExcelImportOptions): Promise<ExcelImportResult>
  static getSupportedVersion(): string
  static isSupported(filePath: string): boolean
}
```

### GoogleSheetsImporter

```typescript
class GoogleSheetsImporter {
  authenticate(config: GoogleSheetsConfig): Promise<boolean>
  setAccessToken(token: string): void
  import(options: GoogleSheetsImportOptions): Promise<GoogleSheetsImportResult>
  enableRealtimeSync(spreadsheetId: string, callback: (updates: any) => void): Promise<void>
  disableRealtimeSync(): Promise<void>
}
```

### MigrationOrchestrator

```typescript
class MigrationOrchestrator {
  detectPlatform(source: string): string | null
  getCompatibility(platform: string): CompatibilityReport | null
  smartImport(source: string, options?: any): Promise<ImportResult>
  createRollbackPlan(platform: string, dataSize: number): RollbackPlan
}
```

---

## Additional Resources

- **Formula Reference**: See [FormulaConverter.ts](../src/spreadsheet/migration/FormulaConverter.ts) for complete function mappings
- **Style Reference**: See [StyleConverter.ts](../src/spreadsheet/migration/StyleConverter.ts) for style conversion details
- **Cell Ontology**: See [CELL_ONTOLOGY.md](./research/spreadsheet/CELL_ONTOLOGY.md) for POLLN cell architecture
- **Examples**: See `examples/migration/` for code samples

---

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review compatibility reports for your platform
3. Check existing GitHub issues
4. Create a new issue with details

---

**Version**: 1.0.0
**Last Updated**: 2026-03-09
**License**: MIT
