# POLLN Spreadsheet I/O Module

Comprehensive import/export system for cell networks with support for multiple formats, validation, migration, and conflict resolution.

## Features

### Export Formats
- **JSON** - Complete cell state with metadata, history, and traces
- **CSV** - Tabular format for spreadsheet compatibility
- **Excel** - Multi-sheet workbooks with formatting
- **PDF** - Human-readable reports with visualization
- **POLLN** - Custom binary format for efficient storage

### Import Sources
- **File** - Import from local files
- **Clipboard** - Paste data directly
- **URL** - Fetch from remote sources
- **Drag & Drop** - Intuitive file handling

### Advanced Features
- Schema validation with detailed error reporting
- Version migration between format versions
- Conflict resolution strategies
- Progress tracking for large operations
- Partial imports and incremental updates

## Installation

```bash
# Core dependencies are included in POLLN
# Optional dependencies for additional formats:
npm install xlsx pdfkit jspdf
```

## Quick Start

### Exporting

```typescript
import { Exporter, ExportFormat } from '@polln/spreadsheet/io';

const exporter = new Exporter();
const cells = [/* your LogCell instances */];

// Export to JSON
const result = await exporter.export(cells, {
  format: ExportFormat.JSON,
  includeMetadata: true,
  includeHistory: true,
  pretty: true,
});

// Download the file
const blob = new Blob([result.data], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// ... save to disk
```

### Importing

```typescript
import { Importer, ImportSource } from '@polln/spreadsheet/io';

const importer = new Importer();

// Import from file
const result = await importer.import(
  ImportSource.FILE,
  fileBuffer,
  {
    source: 'file',
    validateSchema: true,
    mergeStrategy: 'merge',
    conflictResolution: 'keep_newer',
    migrateVersions: true,
  },
  existingCellsMap
);

if (result.success) {
  console.log(`Imported ${result.imported.cells} cells`);
}
```

### Validation

```typescript
import { SchemaValidator } from '@polln/spreadsheet/io';

const validator = new SchemaValidator();
const validationResult = validator.validateNetwork(networkData);

if (!validationResult.valid) {
  console.error('Validation errors:', validationResult.errors);
  console.warn('Warnings:', validationResult.warnings);
}
```

### Migration

```typescript
import { getMigrationEngine } from '@polln/spreadsheet/io';

const engine = getMigrationEngine();

// Check if migration is needed
if (engine.needsMigration(network.version, '1.0.0')) {
  // Migrate to latest version
  const result = await engine.migrate(network, '1.0.0');

  if (result.success) {
    console.log(`Migrated ${result.migratedCells} cells`);
  }
}
```

## React Components

### Export/Import Toolbar

```tsx
import { ExportImportToolbar } from '@polln/spreadsheet/io/ui';

function MySpreadsheet() {
  const [cells, setCells] = useState([]);

  const handleExport = (data, statistics) => {
    console.log('Export complete:', statistics);
  };

  const handleImport = (result) => {
    if (result.success) {
      console.log('Import complete:', result.imported);
    }
  };

  return (
    <div>
      <ExportImportToolbar
        cells={cells}
        onExportComplete={handleExport}
        onImportComplete={handleImport}
      />
      {/* Your spreadsheet UI */}
    </div>
  );
}
```

## API Reference

### Exporter

#### `export(cells, config, progressCallback?)`

Export cells to specified format.

**Parameters:**
- `cells: LogCell[]` - Array of cells to export
- `config: ExportConfig` - Export configuration
- `progressCallback?: ProgressCallback` - Progress updates

**Returns:** `Promise<{ data: any; statistics: ExportStatistics }>`

### Importer

#### `import(source, data, config, existingCells?, progressCallback?)`

Import cells from various sources.

**Parameters:**
- `source: ImportSource` - Import source type
- `data: any` - Data to import
- `config: ImportConfig` - Import configuration
- `existingCells?: Map<CellId, LogCell>` - Existing cells for merge
- `progressCallback?: ProgressCallback` - Progress updates

**Returns:** `Promise<ImportResult>`

### SchemaValidator

#### `validateNetwork(network)`

Validate network structure and data.

**Parameters:**
- `network: NetworkExport` - Network to validate

**Returns:** `ValidationResult`

#### `validateVersion(version)`

Check version compatibility.

**Parameters:**
- `version: string` - Version string

**Returns:** `boolean`

### MigrationEngine

#### `migrate(data, targetVersion, progressCallback?)`

Migrate network to target version.

**Parameters:**
- `data: NetworkExport` - Network to migrate
- `targetVersion: string` - Target version
- `progressCallback?: ProgressCallback` - Progress updates

**Returns:** `Promise<MigrationResult>`

## Configuration

### Export Config

```typescript
interface ExportConfig {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeHistory?: boolean;
  includeTrace?: boolean;
  compress?: boolean;
  password?: string;
  version?: string;
  pretty?: boolean;
}
```

### Import Config

```typescript
interface ImportConfig {
  source: ImportSource;
  validateSchema?: boolean;
  mergeStrategy?: MergeStrategy;
  conflictResolution?: ConflictResolution;
  migrateVersions?: boolean;
  targetVersion?: string;
}
```

### Merge Strategies

- `REPLACE` - Replace entire network
- `MERGE` - Merge with existing cells
- `APPEND` - Append new cells only
- `SKIP` - Skip existing cells

### Conflict Resolution

- `KEEP_IMPORT` - Use imported data
- `KEEP_EXISTING` - Keep existing data
- `KEEP_NEWER` - Use newer timestamp
- `KEEP_HIGHER_VERSION` - Use higher version number
- `MANUAL` - Require manual resolution

## File Formats

### POLLN Binary Format

Custom binary format with the following structure:

```
Header (32 bytes):
  - Magic: 0x504F4C4E ("POLL")
  - Version: 4 bytes
  - Flags: 4 bytes
  - Compression: 1 byte
  - Encryption: 1 byte
  - Metadata size: 4 bytes
  - Cell count: 4 bytes
  - Connection count: 4 bytes

Metadata:
  - JSON string

Cells:
  - JSON array

Connections:
  - JSON array (optional)
```

## Error Handling

All I/O operations include comprehensive error handling:

```typescript
try {
  const result = await importer.import(source, data, config);
} catch (error) {
  if (error.code === 'INVALID_FORMAT') {
    // Handle format error
  } else if (error.code === 'SCHEMA_VALIDATION_FAILED') {
    // Handle validation error
  } else if (error.code === 'MIGRATION_FAILED') {
    // Handle migration error
  }
}
```

## Performance Considerations

- Large exports (>1000 cells) use streaming to avoid memory issues
- Binary format is most efficient for large networks
- Validation can be disabled for trusted sources
- Progress callbacks are recommended for UI operations

## Testing

```bash
# Run I/O tests
npm test src/spreadsheet/io/__tests__/io.test.ts

# Run with coverage
npm run test:coverage -- src/spreadsheet/io
```

## Browser Support

- Modern browsers with ES2022 support
- File API for file operations
- Clipboard API for clipboard operations
- Fetch API for URL imports

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting.

## See Also

- [Main POLLN Documentation](../../README.md)
- [Cell System](../cells/README.md)
- [Core Types](../core/README.md)
