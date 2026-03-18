# Migration Quick Reference Card

Quick reference for common migration tasks and commands.

## Installation

```bash
# Install CLI tools
npm install -g @spreadsheet-moment/migrate-tools

# Install Python SDK
pip install spreadsheet-moment-migrate

# Docker
docker pull spreadsheetmoment/migrate-tools:latest
```

## Common Commands

### Excel Migration

```bash
# Import Excel file
sm-import-excel workbook.xlsx --workbook "Migrated"

# Translate formulas
sm-translate-excel "=VLOOKUP(A2,B2:C10,2,FALSE)"

# Batch convert
sm-batch-convert ./excel-files --format csv
```

### Google Sheets Migration

```bash
# Export from Google Sheets
sm-export-sheets SHEET_ID --format csv

# Translate formulas
sm-translate-sheets "=QUERY(A1:E100, \"SELECT A\")"

# Import to Spreadsheet Moment
sm-import-csv data.csv --workbook "Migrated"
```

### Airtable Migration

```bash
# Export Airtable base
sm-export-airtable BASE_ID --output ./export

# Import to Spreadsheet Moment
sm-import-airtable ./export --workbook "Migrated"
```

### Notion Migration

```bash
# Export Notion workspace
sm-export-notion --workspace-id WORKSPACE_ID

# Migrate databases
sm-migrate-notion-db database_id --sheet "Data"
```

### Jupyter Migration

```bash
# Convert notebook
sm-convert-notebook analysis.ipynb --output workbook.sm

# Migrate Python cells
sm-migrate-python notebook.ipynb --sheet "Analysis"
```

## Formula Quick Reference

### Excel → Spreadsheet Moment

| Excel | Spreadsheet Moment |
|-------|-------------------|
| =VLOOKUP(A2,B2:C10,2,FALSE) | =LOOKUP(A2,B2:B10,C2:C10) |
| =INDEX(C2:C10,MATCH(A2,B2:B10,0)) | =LOOKUP(A2,B2:B10,C2:C10) |
| =CONCATENATE(A1," ",B1) | =CONCAT(A1," ",B1) |
| =SUMIF(A2:A10,">100",B2:B10) | =SUMIF(A2:A10,">100",B2:B10) |

### Google Sheets → Spreadsheet Moment

| Google Sheets | Spreadsheet Moment |
|---------------|-------------------|
| =QUERY(A1:E100,"SELECT A") | =SQL("SELECT A FROM range") |
| =IMPORTRANGE("key","Sheet1!A1") | =IMPORT_WORKBOOK("id","Sheet1!A1") |
| =ARRAYFORMULA(A2:A100*B2:B100) | =A2:A100*B2:B100 |
| =GOOGLETRANSLATE(A1,"en","es") | =TRANSLATE(A1,"en","es") |

## Field Type Mapping

### Airtable → Spreadsheet Moment

| Airtable | Spreadsheet Moment |
|----------|-------------------|
| Single Line Text | Text |
| Long Text | Text (multiline) |
| Number | Number |
| Currency | Number (currency) |
| Single Select | Select |
| Multiple Select | Multi-select |
| Date | Date |
| Checkbox | Boolean |
| Attachment | File |
| Lookup | Formula |

### Notion → Spreadsheet Moment

| Notion | Spreadsheet Moment |
|--------|-------------------|
| Title | Text (primary) |
| Text | Text |
| Number | Number |
| Select | Select |
| Multi-select | Multi-select |
| Date | Date |
| Person | Lookup |
| Files | File |
| Checkbox | Boolean |
| Formula | Formula |

## Validation Commands

```bash
# Validate data
sm-validate-data data.csv --schema schema.json

# Compare files
sm-compare source.xlsx target.sm

# Quality check
sm-quality-check --workbook "Migrated"
```

## Troubleshooting

```bash
# Check format
sm-check-format data.csv

# Validate formula
sm-validate-formula "=SUM(A1:A10)"

# Debug translation
sm-debug-formula "=VLOOKUP(A2,B2:C10,2,FALSE)" --verbose

# Recover from error
sm-recover --migration-id MIGRATION_ID
```

## Support Resources

- **Documentation**: https://docs.spreadsheetmoment.com
- **GitHub**: https://github.com/SuperInstance/spreadsheet-moment
- **Discord**: https://discord.gg/spreadsheetmoment
- **Email**: support@spreadsheetmoment.com

---

**Version**: 1.0.0
**Last Updated**: 2026-03-15