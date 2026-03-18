# Migration FAQ

Frequently asked questions about migrating to Spreadsheet Moment from competing platforms.

## General Questions

### Q: How long does migration typically take?
**A:** Migration time varies by complexity:
- Simple workbooks (data only): 5-15 minutes
- Medium complexity (formulas): 30-60 minutes
- Complex (automations/VBA): 2-6 hours
- Enterprise migration: 1-5 days

### Q: Will I lose any data during migration?
**A:** When following our guides properly, data integrity is maintained. We recommend:
1. Always backup before migrating
2. Validate data after import
3. Use our validation tools
4. Test with sample data first

### Q: Can I migrate multiple files at once?
**A:** Yes, use our batch conversion tools:
```bash
sm-batch-convert ./files --format csv --parallel 4
```

### Q: Do I need programming knowledge to migrate?
**A:** Basic migrations can be done through our web interface. Complex migrations may require:
- Basic command line knowledge
- Understanding of JSON for configurations
- Familiarity with your current platform's export features

### Q: What if I need help with migration?
**A:** Support options include:
- Free: Community Discord, GitHub Discussions, documentation
- Paid: Professional migration services, dedicated support
- Enterprise: On-site migration teams

---

## Excel Migration

### Q: Will all my Excel formulas work?
**A:** 95%+ of Excel formulas have direct equivalents. The 5% that don't typically:
- Have better alternatives in Spreadsheet Moment
- Can be converted using our translation tools
- May require Cell Agents for complex logic

### Q: What about VBA macros?
**A:** VBA macros convert to Cell Agents:
- Simple macros: Direct conversion to Cell Agents
- Complex macros: May need refactoring
- Our AI can help suggest Cell Agent equivalents

### Q: Can I import .xlsx files directly?
**A:** Yes, direct import is supported:
```bash
sm-import-excel workbook.xlsx --workbook "Imported"
```

### Q: Will my formatting be preserved?
**A:** Most formatting is preserved:
- Cell formatting: Yes
- Conditional formatting: Yes
- Charts: Yes (may need adjustments)
- Pivot tables: Converted to dynamic tables

### Q: How do I handle Excel add-ins?
**A:** Excel add-ins typically replace with:
- Native Spreadsheet Moment features
- Cell Agent automations
- IO Connections for external data
- Our AI capabilities

---

## Google Sheets Migration

### Q: How do I export from Google Sheets?
**A:** Multiple options:
1. **Web UI**: File → Download → CSV
2. **API**: Use our export tools
3. **Batch**: Export entire folders

### Q: Will Apps Script work?
**A:** Apps Script converts to Cell Agents:
- Triggers → Cell Agent triggers
- Functions → Cell Agent functions
- Services → IO Connections

### Q: What about real-time collaboration?
**A:** Spreadsheet Moment offers enhanced collaboration:
- Real-time cursors
- Live editing
- Better performance
- More granular permissions

### Q: Can I keep using Google services?
**A:** Yes, via IO Connections:
- Google Drive: File connections
- Gmail: Email integrations
- Google Calendar: Calendar sync
- Google Analytics: Data connections

---

## Airtable Migration

### Q: How do I handle Airtable relationships?
**A:** Relationships convert to:
- VLOOKUP formulas for simple relations
- FILTER functions for one-to-many
- Intermediate sheets for many-to-many

### Q: What about Airtable views?
**A:** Views convert to Spreadsheet Moment views:
- Grid → Filtered grid view
- Kanban → Kanban view
- Calendar → Calendar view
- Gallery → Gallery view
- Form → Form interface

### Q: Can I migrate Airtable automations?
**A:** Automations convert to Cell Agents:
- Triggers → Cell Agent triggers
- Actions → Cell Agent actions
- Custom scripts → JavaScript functions

### Q: What about Airtable forms?
**A:** Forms convert to:
- Native Spreadsheet Moment forms
- Better validation
- Custom styling
- Automated workflows

---

## Notion Migration

### Q: How do I handle Notion pages vs databases?
**A:** Migration strategy:
- Databases → Sheets
- Pages → Documentation sheets
- Linked databases → Formulas and Cell Agents

### Q: What about Notion's block system?
**A:** Blocks convert to:
- Text blocks → Rich text cells
- Headings → Heading cells
- Lists → Bulleted/numbered lists
- Code blocks → Code cells
- Callouts → Highlighted cells

### Q: Can I migrate Notion formulas?
**A:** Yes, with enhancements:
- Basic formulas: Direct conversion
- Rollups: Enhanced aggregation
- Relations: LOOKUP formulas
- Advanced formulas: Cell Agents

### Q: What about Notion templates?
**A:** Templates convert to:
- Spreadsheet Moment templates
- Cell Agent templates
- Form templates

---

## Jupyter Migration

### Q: How do Jupyter notebooks convert?
**A:** Conversion process:
- Code cells → Python cells or formulas
- Markdown cells → Documentation
- Outputs → Result cells
- Visualizations → Charts

### Q: Can I still use Python?
**A:** Yes, enhanced Python integration:
- Native Python cells
- Better performance
- Real-time collaboration
- Integration with formulas

### Q: What about pandas DataFrames?
**A:** DataFrames convert to:
- Sheet data
- Named ranges
- Queryable data structures

### Q: Can I use scikit-learn?
**A:** Yes, via Python integration:
- Import in Python cells
- Train models
- Make predictions
- Display results

---

## Technical Questions

### Q: What file formats are supported?
**A:** Supported formats:
- **Import**: CSV, Excel (.xlsx), JSON
- **Export**: CSV, Excel (.xlsx), JSON, PDF

### Q: Is there a file size limit?
**A:** Technical limits:
- CSV: Up to 10GB
- Excel: Up to 1GB
- Recommended: <100K rows per sheet for performance

### Q: How do you handle large datasets?
**A:** Optimization strategies:
- Lazy loading
- Pagination
- Data sampling
- Web Workers for processing

### Q: Can I automate migration?
**A:** Yes, multiple options:
- CLI tools for batch operations
- API for custom automation
- Docker containers for deployments
- CI/CD integration

### Q: What about data validation?
**A:** Validation tools:
- Schema validation
- Data type checking
- Formula validation
- Integrity checks

---

## Performance Questions

### Q: Is Spreadsheet Moment faster?
**A:** Performance improvements:
- Calculations: 2-10x faster
- Large datasets: 5-20x faster
- Real-time sync: <100ms
- File loading: 3-5x faster

### Q: How does it handle complex formulas?
**A:** Optimization:
- Lazy evaluation
- Caching
- Parallel processing
- WebAssembly calculations

### Q: What about memory usage?
**A:** Efficient memory:
- Streaming imports
- On-demand loading
- Automatic cleanup
- Memory pooling

---

## Security Questions

### Q: Is my data secure?
**A:** Security features:
- Encryption at rest
- Encryption in transit
- Access controls
- Audit logs

### Q: Can I self-host?
**A:** Yes, self-hosting options:
- Docker deployment
- Kubernetes
- On-premise
- Private cloud

### Q: What about data privacy?
**A:** Privacy guarantees:
- No data mining
- No third-party sharing
- Full data ownership
- GDPR compliant

---

## Cost Questions

### Q: Is Spreadsheet Moment free?
**A:** Cost structure:
- Open source: Free
- Self-hosted: No subscription
- Cloud service: Competitive pricing
- Enterprise: Custom pricing

### Q: Are there hidden costs?
**A:** Transparent pricing:
- No per-seat fees
- No usage limits (self-hosted)
- No feature gates
- No data export fees

### Q: How does it compare to Excel 365?
**A:** Cost savings:
- Excel 365: $99.99/year/user
- Spreadsheet Moment: $0 (self-hosted)
- Savings: 100% on software costs

---

## Collaboration Questions

### Q: How many users can collaborate?
**A:** Collaboration limits:
- Self-hosted: Unlimited
- Cloud: Based on plan
- Performance scales with users

### Q: Can I control permissions?
**A:** Granular permissions:
- Workbook level
- Sheet level
- Row level
- Cell level

### Q: Is there version control?
**A:** Advanced versioning:
- Automatic saves
- Version history
- Diff viewing
- Rollback capability

---

## Post-Migration Questions

### Q: How do I learn to use Spreadsheet Moment?
**A:** Learning resources:
- Interactive tutorials
- Video tutorials
- Documentation
- Community support

### Q: What if I find bugs?
**A:** Support channels:
- GitHub Issues
- Discord community
- Email support
- Enterprise SLA

### Q: Can I contribute?
**A:** Yes! Contribute via:
- GitHub pull requests
- Feature requests
- Documentation improvements
- Community support

### Q: How often are updates released?
**A:** Release cadence:
- Stable: Monthly releases
- Beta: Weekly releases
- Hotfixes: As needed
- Roadmap: Public GitHub projects

---

## Enterprise Questions

### Q: Do you offer enterprise support?
**A:** Enterprise services:
- Dedicated migration teams
- Custom integrations
- On-site training
- 24/7 support

### Q: Can you handle large migrations?
**A:** Enterprise migrations:
- Millions of rows
- Thousands of files
- Complex automations
- Custom solutions

### Q: What about compliance?
**A:** Compliance support:
- SOC 2 Type II
- GDPR
- HIPAA
- ISO 27001

### Q: Can you provide training?
**A:** Training programs:
- On-site training
- Virtual workshops
- Custom curriculum
- Train-the-trainer

---

## Getting Help

### Q: Where can I get help?
**A:** Support options:
- **Free**: Discord, GitHub, Documentation
- **Community**: Stack Overflow, Reddit
- **Paid**: Professional services
- **Enterprise**: Dedicated support

### Q: How do I report issues?
**A:** Report via:
- GitHub Issues
- Discord #bugs channel
- Email: support@spreadsheetmoment.com
- Enterprise: Account manager

### Q: Can I request features?
**A:** Feature requests:
- GitHub Discussions
- Discord #features channel
- Roadmap voting
- Enterprise: Custom development

---

## Additional Resources

- **Documentation**: https://docs.spreadsheetmoment.com
- **GitHub**: https://github.com/SuperInstance/spreadsheet-moment
- **Discord**: https://discord.gg/spreadsheetmoment
- **Blog**: https://blog.spreadsheetmoment.com
- **YouTube**: https://youtube.com/@spreadsheetmoment

---

**Last Updated**: 2026-03-15
**Version**: 1.0.0