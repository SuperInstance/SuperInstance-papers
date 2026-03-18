# Common Migration Tools and Utilities

Comprehensive collection of tools, utilities, and scripts to streamline your migration to Spreadsheet Moment from any platform.

## Table of Contents
1. [Overview](#overview)
2. [Installation](#installation)
3. [Data Import/Export Tools](#data-importexport-tools)
4. [Formula Translation Tools](#formula-translation-tools)
5. [Batch Conversion Utilities](#batch-conversion-utilities)
6. [Validation Tools](#validation-tools)
7. [API Migration Scripts](#api-migration-scripts)
8. [Template Migration](#template-migration)
9. [Success Metrics](#success-metrics)
10. [Troubleshooting](#troubleshooting)

---

## Overview

These tools are designed to work with all migration paths:
- Excel → Spreadsheet Moment
- Google Sheets → Spreadsheet Moment
- Airtable → Spreadsheet Moment
- Notion → Spreadsheet Moment
- Jupyter → Spreadsheet Moment

### Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| **Import/Export** | CSV, Excel, API | Data transfer |
| **Translation** | Formula, Script | Code conversion |
| **Validation** | Data, Schema | Integrity checks |
| **Automation** | Batch, Schedule | Process automation |
| **Monitoring** | Progress, Metrics | Track migration |

---

## Installation

### CLI Tools Installation

```bash
# Install all migration tools
npm install -g @spreadsheet-moment/migrate-tools

# Or install individual tools
npm install -g @spreadsheet-moment/import-csv
npm install -g @spreadsheet-moment/convert-excel
npm install -g @spreadsheet-moment/translate-formulas
```

### Python SDK Installation

```bash
# Install Python migration SDK
pip install spreadsheet-moment-migrate

# Or with conda
conda install -c spreadsheet-moment spreadsheet-moment-migrate
```

### Docker Setup

```bash
# Pull migration tools image
docker pull spreadsheetmoment/migrate-tools:latest

# Run migration container
docker run -it spreadsheetmoment/migrate-tools bash
```

---

## Data Import/Export Tools

### CSV Import/Export

**Tool: `sm-import-csv`**

```bash
# Import single CSV file
sm-import-csv data.csv --workbook "My Workbook" --sheet "Data"

# Import multiple CSV files
sm-import-csv ./data/*.csv --workbook "Imported Data"

# Import with custom delimiter
sm-import-csv data.csv --delimiter "," --encoding "UTF-8"

# Import with header row
sm-import-csv data.csv --headers --sheet "Imported Data"

# Dry run (test without importing)
sm-import-csv data.csv --dry-run
```

**Node.js API:**
```javascript
const { importCSV } = require('@spreadsheet-moment/import-csv');

// Import CSV file
const result = await importCSV('data.csv', {
  workbookId: 'workbook_123',
  sheetName: 'Imported Data',
  delimiter: ',',
  encoding: 'UTF-8',
  headers: true,
  dryRun: false
});

console.log(`Imported ${result.rows} rows`);
```

**Python API:**
```python
from spreadsheet_moment import import_csv

# Import CSV file
result = import_csv(
    'data.csv',
    workbook_id='workbook_123',
    sheet_name='Imported Data',
    delimiter=',',
    encoding='UTF-8',
    headers=True
)

print(f"Imported {result.rows} rows")
```

### Excel Import/Export

**Tool: `sm-import-excel`**

```bash
# Import Excel file
sm-import-excel workbook.xlsx --workbook "Migrated Workbook"

# Import specific sheet
sm-import-excel workbook.xlsx --sheet "Sheet1" --target "Data"

# Import with formulas
sm-import-excel workbook.xlsx --include-formulas

# Import with formatting
sm-import-excel workbook.xlsx --include-formatting

# Import all sheets
sm-import-excel workbook.xlsx --all-sheets
```

**Node.js API:**
```javascript
const { importExcel } = require('@spreadsheet-moment/import-excel');

// Import Excel file
const result = await importExcel('workbook.xlsx', {
  includeFormulas: true,
  includeFormatting: true,
  sheetNames: ['Sheet1', 'Sheet2'],
  convertFormulas: true
});
```

### Database Import

**Tool: `sm-import-db`**

```bash
# Import from PostgreSQL
sm-import-db \
  --type postgresql \
  --host localhost \
  --database mydb \
  --query "SELECT * FROM users" \
  --sheet "Users"

# Import from MySQL
sm-import-db \
  --type mysql \
  --host localhost \
  --database mydb \
  --table users \
  --sheet "Imported Users"

# Import with credentials
sm-import-db \
  --type postgresql \
  --host localhost \
  --user admin \
  --password secret \
  --database mydb \
  --query "SELECT * FROM sales" \
  --sheet "Sales Data"
```

**Node.js API:**
```javascript
const { importFromDatabase } = require('@spreadsheet-moment/import-db');

// Import from database
const result = await importFromDatabase({
  type: 'postgresql',
  host: 'localhost',
  database: 'mydb',
  user: 'admin',
  password: 'secret',
  query: 'SELECT * FROM users',
  targetSheet: 'Users'
});
```

---

## Formula Translation Tools

### Excel Formula Translator

**Tool: `sm-translate-excel`**

```bash
# Translate Excel formula
sm-translate-excel "=VLOOKUP(A2, B2:C10, 2, FALSE)"

# Translate from file
sm-translate-excel --file formulas.txt --output translated.txt

# Interactive mode
sm-translate-excel --interactive

# Batch translate
sm-translate-excel --batch formulas.csv
```

**Supported Conversions:**

| Excel | Spreadsheet Moment | Notes |
|-------|-------------------|-------|
| =VLOOKUP(A2,B2:C10,2,FALSE) | =LOOKUP(A2,B2:B10,C2:C10) | Enhanced syntax |
| =INDEX(C2:C10,MATCH(A2,B2:B10,0)) | =LOOKUP(A2,B2:B10,C2:C10) | Simplified |
| =CONCATENATE(A1," ",B1) | =CONCAT(A1," ",B1) | Modern syntax |
| =SUMIF(A2:A10,">100",B2:B10) | =SUMIF(A2:A10,">100",B2:B10) | Compatible |

**Node.js API:**
```javascript
const { translateFormula } = require('@spreadsheet-moment/translate-formulas');

// Translate formula
const translated = translateFormula('=VLOOKUP(A2, B2:C10, 2, FALSE)', {
  source: 'excel',
  target: 'spreadsheet-moment'
});

console.log(translated); // =LOOKUP(A2, B2:B10, C2:C10)
```

### Google Sheets Formula Translator

**Tool: `sm-translate-sheets`**

```bash
# Translate Google Sheets formula
sm-translate-sheets "=QUERY(A1:E100, \"SELECT A, SUM(E) GROUP BY A\")"

# Translate QUERY function
sm-translate-sheets "=QUERY(A1:E100, 'SELECT A, B WHERE C > 100')"

# Translate IMPORTRANGE
sm-translate-sheets "=IMPORTRANGE(\"spreadsheet_key\", \"Sheet1!A1:B10\")"
```

**Python API:**
```python
from spreadsheet_moment import translate_sheets_formula

# Translate formula
translated = translate_sheets_formula(
    '=QUERY(A1:E100, "SELECT A, SUM(E) GROUP BY A")'
)

print(translated)
# =SQL("SELECT A, SUM(E) FROM range GROUP BY A")
```

---

## Batch Conversion Utilities

### Batch File Conversion

**Tool: `sm-batch-convert`**

```bash
# Convert all Excel files in directory
sm-batch-convert ./excel-files --format csv --output ./converted

# Convert with parallel processing
sm-batch-convert ./excel-files --parallel 4

# Convert with logging
sm-batch-convert ./excel-files --log conversion.log

# Convert with error handling
sm-batch-convert ./excel-files --continue-on-error
```

**Configuration File:**
```json
{
  "input": "./excel-files",
  "output": "./converted",
  "format": "csv",
  "parallel": 4,
  "options": {
    "includeFormulas": true,
    "includeFormatting": false
  },
  "logging": {
    "file": "conversion.log",
    "level": "info"
  }
}
```

**Node.js API:**
```javascript
const { batchConvert } = require('@spreadsheet-moment/batch-convert');

// Batch convert files
await batchConvert({
  input: './excel-files',
  output: './converted',
  format: 'csv',
  parallel: 4,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percent}%`);
  },
  onComplete: (results) => {
    console.log(`Converted ${results.successful} files`);
    console.log(`Failed: ${results.failed} files`);
  }
});
```

### Batch Formula Translation

**Tool: `sm-batch-translate`**

```bash
# Translate all formulas in file
sm-batch-translate workbook.xlsx --output translated.xlsx

# Translate with sheet mapping
sm-batch-translate workbook.xlsx --mapping sheet-map.json

# Translate with validation
sm-batch-translate workbook.xlsx --validate
```

**Mapping File:**
```json
{
  "Sheet1": {
    "A1": "=VLOOKUP(A2, B2:C10, 2, FALSE)",
    "B2": "=SUM(A2:A10)"
  },
  "Sheet2": {
    "C1": "=AVERAGE(B2:B20)"
  }
}
```

---

## Validation Tools

### Data Validation

**Tool: `sm-validate-data`**

```bash
# Validate CSV file
sm-validate-data data.csv --schema schema.json

# Validate Excel file
sm-validate-data workbook.xlsx --sheet "Data"

# Validate with rules
sm-validate-data data.csv --rules validation-rules.json

# Generate validation report
sm-validate-data data.csv --report validation-report.html
```

**Schema File:**
```json
{
  "fields": [
    {
      "name": "id",
      "type": "integer",
      "required": true,
      "unique": true
    },
    {
      "name": "name",
      "type": "string",
      "required": true,
      "maxLength": 100
    },
    {
      "name": "email",
      "type": "email",
      "required": true
    },
    {
      "name": "amount",
      "type": "number",
      "minimum": 0
    }
  ]
}
```

**Node.js API:**
```javascript
const { validateData } = require('@spreadsheet-moment/validate');

// Validate data
const result = await validateData('data.csv', {
  schema: './schema.json',
  rules: {
    id: { required: true, unique: true },
    name: { required: true, maxLength: 100 },
    email: { type: 'email' },
    amount: { minimum: 0 }
  }
});

console.log(`Valid: ${result.valid}`);
console.log(`Errors: ${result.errors.length}`);
```

### Schema Validation

**Tool: `sm-validate-schema`**

```bash
# Validate schema
sm-validate-schema schema.json

# Compare schemas
sm-validate-schema schema1.json schema2.json --diff

# Generate schema from data
sm-validate-schema data.csv --generate-schema --output schema.json
```

---

## API Migration Scripts

### OAuth Migration

**Tool: `sm-migrate-oauth`**

```bash
# Migrate Google OAuth
sm-migrate-oauth --provider google --client-id YOUR_ID

# Migrate Microsoft OAuth
sm-migrate-oauth --provider microsoft --tenant YOUR_TENANT

# Test OAuth connection
sm-migrate-oauth --test --provider google
```

**Node.js API:**
```javascript
const { migrateOAuth } = require('@spreadsheet-moment/oauth');

// Migrate OAuth credentials
await migrateOAuth({
  provider: 'google',
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: 'http://localhost:3000/callback'
});
```

### Webhook Migration

**Tool: `sm-migrate-webhooks`**

```bash
# Migrate webhooks
sm-migrate-webhooks --source airtable --target spreadsheet-moment

# List webhooks
sm-migrate-webhooks --list --source airtable

# Test webhook
sm-migrate-webhooks --test --webhook-id WEBHOOK_ID
```

---

## Template Migration

### Excel Template Migration

**Tool: `sm-migrate-template`**

```bash
# Migrate Excel template
sm-migrate-template template.xlsx --output template.sm

# Migrate with formatting
sm-migrate-template template.xlsx --include-formatting

# Migrate with formulas
sm-migrate-template template.xlsx --include-formulas
```

**Node.js API:**
```javascript
const { migrateTemplate } = require('@spreadsheet-moment/template');

// Migrate template
const template = await migrateTemplate('template.xlsx', {
  includeFormatting: true,
  includeFormulas: true,
  preserveStyles: true
});

// Save template
await template.save('template.sm');
```

### Google Sheets Template Migration

**Tool: `sm-migrate-sheets-template`**

```bash
# Migrate Google Sheets template
sm-migrate-sheets-template SHEET_ID --output template.sm

# Migrate with permissions
sm-migrate-sheets-template SHEET_ID --include-permissions
```

---

## Success Metrics

### Migration Progress Tracker

**Tool: `sm-track-migration`**

```bash
# Start tracking migration
sm-track-migration --start --source excel --files 100

# Update progress
sm-track-migration --update --completed 25

# Generate report
sm-track-migration --report --output migration-report.json

# Complete migration
sm-track-migration --complete
```

**Metrics Tracked:**

| Metric | Description | Target |
|--------|-------------|--------|
| Files Processed | Number of files migrated | 100% |
| Data Integrity | Data accuracy after migration | 100% |
| Formula Accuracy | Formulas working correctly | 95%+ |
| Performance | Speed improvement | 2x+ |
| User Satisfaction | User feedback | 4/5+ |

### Quality Metrics

**Tool: `sm-quality-check`**

```bash
# Run quality checks
sm-quality-check --workbook "Migrated Data"

# Generate quality report
sm-quality-check --report quality-report.html

# Compare with source
sm-quality-check --compare source.xlsx target.sm
```

**Quality Checks:**
- Data completeness
- Formula accuracy
- Formatting preservation
- Performance comparison
- User acceptance

---

## Troubleshooting

### Common Issues

**Issue 1: Import Fails**
```bash
# Check file format
sm-check-format data.csv

# Validate encoding
sm-check-encoding data.csv

# Fix common issues
sm-fix-csv data.csv --output fixed.csv
```

**Issue 2: Formula Translation Errors**
```bash
# Validate formula
sm-validate-formula "=VLOOKUP(A2, B2:C10, 2, FALSE)"

# Test translation
sm-test-translation "=SUM(A1:A10)" --source excel

# Debug formula
sm-debug-formula "=VLOOKUP(A2, B2:C10, 2, FALSE)" --verbose
```

**Issue 3: Performance Issues**
```bash
# Analyze performance
sm-analyze-performance workbook.sm

# Optimize workbook
sm-optimize workbook.sm --output optimized.sm

# Profile calculations
sm-profile-calculations workbook.sm
```

**Issue 4: Large File Handling**
```bash
# Split large file
sm-split-file large.csv --chunks 1000 --output ./chunks

# Process in batches
sm-process-batch ./chunks --parallel 4

# Merge results
sm-merge-results ./chunks/output --output merged.sm
```

### Error Recovery

**Tool: `sm-recover`**

```bash
# Recover from failed migration
sm-recover --migration-id MIGRATION_ID

# Resume interrupted migration
sm-recover --resume --checkpoint checkpoint.json

# Rollback migration
sm-recover --rollback --migration-id MIGRATION_ID
```

---

## Best Practices

### 1. Backup Before Migration
```bash
# Create backup
sm-backup --source ./data --output ./backup

# Verify backup
sm-verify-backup ./backup
```

### 2. Test Migration First
```bash
# Test with sample data
sm-migrate --test --sample-size 100

# Dry run migration
sm-migrate --dry-run --source ./data
```

### 3. Monitor Progress
```bash
# Start monitoring
sm-monitor --start

# Get status
sm-monitor --status

# Stop monitoring
sm-monitor --stop
```

### 4. Validate Results
```bash
# Validate migrated data
sm-validate --source ./source --target ./migrated

# Compare results
sm-compare source.xlsx target.sm
```

---

## Additional Resources

### Documentation
- [API Documentation](../docs/API_DOCUMENTATION.md)
- [Migration Guides](../migrations/)
- [Tool Reference](https://tools.spreadsheetmoment.com)

### Community
- [GitHub Issues](https://github.com/SuperInstance/spreadsheet-moment/issues)
- [Discord Server](https://discord.gg/spreadsheetmoment)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/spreadsheet-moment)

### Support
- **Email**: support@spreadsheetmoment.com
- **Documentation**: https://docs.spreadsheetmoment.com
- **Blog**: https://blog.spreadsheetmoment.com

---

## Tool Index

| Tool | Purpose | Link |
|------|---------|------|
| sm-import-csv | Import CSV files | [Documentation](#csv-importexport) |
| sm-import-excel | Import Excel files | [Documentation](#excel-importexport) |
| sm-import-db | Import database data | [Documentation](#database-import) |
| sm-translate-excel | Translate Excel formulas | [Documentation](#excel-formula-translator) |
| sm-translate-sheets | Translate Sheets formulas | [Documentation](#google-sheets-formula-translator) |
| sm-batch-convert | Batch file conversion | [Documentation](#batch-file-conversion) |
| sm-validate-data | Validate data integrity | [Documentation](#data-validation) |
| sm-track-migration | Track migration progress | [Documentation](#migration-progress-tracker) |
| sm-quality-check | Check migration quality | [Documentation](#quality-metrics) |
| sm-recover | Recover from errors | [Documentation](#error-recovery) |

---

**Last Updated**: 2026-03-15
**Version**: 1.0.0
**License**: MIT