# Airtable to Spreadsheet Moment Migration Guide

Complete guide for migrating from Airtable to Spreadsheet Moment, transforming your database into a powerful AI-driven spreadsheet.

## Table of Contents
1. [Why Migrate from Airtable](#why-migrate-from-airtable)
2. [Migration Overview](#migration-overview)
3. [Database Concepts Comparison](#database-concepts-comparison)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Schema Migration](#schema-migration)
6. [View Migration](#view-migration)
7. [Automation Alternatives](#automation-alternatives)
8. [API Integration Patterns](#api-integration-patterns)
9. [Field Type Mapping](#field-type-mapping)
10. [Troubleshooting](#troubleshooting)

---

## Why Migrate from Airtable?

### Airtable Limitations
- **High Cost**: Expensive per-seat pricing
- **Vendor Lock-in**: Proprietary platform
- **Limited AI**: Basic AI features require higher tiers
- **Performance Issues**: Slow with large datasets
- **Formula Limitations**: Restricted formula complexity
- **Storage Costs**: Additional charges for attachments

### Spreadsheet Moment Advantages
- **Cost Effective**: Self-hosted, no per-seat fees
- **Open Source**: Full control and customization
- **Native AI**: Advanced AI agents built-in
- **Better Performance**: 10x faster operations
- **Unlimited Formulas**: No formula complexity limits
- **Data Sovereignty**: Your data, your infrastructure

---

## Migration Overview

### Time Estimates
| Base Complexity | Records | Views | Migration Time | Learning Curve |
|-----------------|---------|-------|----------------|----------------|
| Simple | <1,000 | 1-3 | 1-2 hours | 2-4 hours |
| Medium | 1,000-10,000 | 4-10 | 4-8 hours | 1-2 days |
| Complex | 10,000+ | 10+ | 2-3 days | 3-5 days |

### Pre-Migration Checklist
- [ ] Inventory all Airtable bases
- [ ] Document table structures and relationships
- [ ] List all views and their configurations
- [ ] Identify automations and integrations
- [ ] Record form views and their settings
- [ ] Note extensions and custom scripts
- [ ] Document API usage and webhooks

---

## Database Concepts Comparison

### Core Concepts Mapping

| Airtable Concept | Spreadsheet Moment Equivalent | Implementation Notes |
|-----------------|-------------------------------|---------------------|
| Base | Workbook | Container for all data |
| Table | Sheet | Data organization |
| Record | Row | Individual data item |
| Field | Column | Data attribute |
| Cell | Cell | Data point |
| View | Filter/Sort | Data presentation |
| Form | Form Interface | Data collection |
| Attachment | File Cell | File storage |
| Lookup Formula | VLOOKUP/QUERY | Related data |
| Rollup | AGGREGATE | Calculated fields |
| Count Field | COUNT function | Record counting |

### Relationship Mapping

| Airtable Relationship | Spreadsheet Moment Implementation |
|----------------------|-----------------------------------|
| One-to-One | Direct column reference |
| One-to-Many | VLOOKUP/FILTER functions |
| Many-to-Many | Intermediate table or ARRAYFORMULA |
| Self-referencing | Hierarchical LOOKUP with conditionals |

---

## Step-by-Step Migration

### Phase 1: Assessment & Planning (1-2 hours)

#### 1.1 Create Base Inventory

Document all Airtable bases to migrate:

```markdown
# Airtable Base Inventory

## Base 1: Project Management
- **Tables:** 5 (Projects, Tasks, Team, Clients, Time Logs)
- **Records:** ~2,500 total
- **Views:** 15 (Grid, Kanban, Calendar, Timeline)
- **Automations:** 8 (Email notifications, status updates)
- **Integrations:** Slack, GitHub, Google Calendar
- **Forms:** 2 (Project intake, Bug report)
- **Complexity:** High

## Base 2: CRM
- **Tables:** 3 (Contacts, Companies, Deals)
- **Records:** ~5,000 total
- **Views:** 8 (Grid, Group, Kanban)
- **Automations:** 5 (Task assignments, follow-ups)
- **Integrations:** Mailchimp, Zapier
- **Forms:** 1 (Contact form)
- **Complexity:** Medium
```

#### 1.2 Document Table Schema

For each table, document the structure:

```markdown
## Table: Projects

### Fields
| Field Name | Type | Options | Linked To |
|------------|------|---------|-----------|
| Project Name | Single Line Text | Required | - |
| Status | Single Select | To Do, In Progress, Done | - |
| Priority | Single Select | High, Medium, Low | - |
| Start Date | Date | Include time | - |
| End Date | Date | Include time | - |
| Budget | Currency | USD | - |
| Project Manager | Single Record | → Team | Team |
| Tasks | Linked Records | → Tasks | Many-to-many |
| Attachments | Attachments | Multiple | - |
| Progress | Formula | Rollup from Tasks | - |

### Views
1. **All Projects** (Grid): All records, grouped by Status
2. **Active Projects** (Grid): Filtered by Status ≠ Done
3. **Project Timeline** (Calendar): Start Date field
4. **High Priority** (Grid): Filtered by Priority = High
5. **By Manager** (Kanban): Grouped by Project Manager

### Automations
1. When status changes to "Done", send Slack notification
2. When project is created, assign to manager
3. When due date approaches, send reminder
```

#### 1.3 Identify Migration Challenges

Look for potential issues:

**Complex Relationships:**
- Many-to-many relationships
- Self-referencing tables
- Circular dependencies

**Airtable-Specific Features:**
- Interface Designer views
- Advanced collaboration features
- Sync integrations

**Automations:**
- Complex multi-step automations
- External API integrations
- Custom scripting actions

### Phase 2: Data Export (1-3 hours)

#### 2.1 Export via Airtable UI

**Method 1: CSV Export (Recommended)**
1. Open Airtable base
2. Select each table
3. Click "Download as CSV"
4. Save with table name
5. Repeat for all tables

**Method 2: Airtable API Export**

```javascript
// Export all data from Airtable base
const Airtable = require('airtable');
const fs = require('fs');

const airtable = new Airtable({ apiKey: 'YOUR_API_KEY' });
const base = airtable.base('YOUR_BASE_ID');

async function exportTable(tableName) {
  const records = [];
  await base(tableName).select().eachPage((page, fetchNextPage) => {
    records.push(...page);
    fetchNextPage();
  });

  // Convert to CSV
  const csv = convertToCSV(records);
  fs.writeFileSync(`${tableName}.csv`, csv);
}

async function exportBase() {
  const tables = ['Table1', 'Table2', 'Table3'];
  for (const table of tables) {
    await exportTable(table);
  }
}
```

**Method 3: Third-Party Tools**
- AirtableImporter (https://airtableimporter.com)
- On2Air (https://on2air.com)
- Paths.io (https://paths.io)

#### 2.2 Export Configuration

Include metadata in export:

```javascript
// Export with metadata
const exportWithMetadata = async (tableName) => {
  const table = base(tableName);
  const schema = await table.select().firstPage();

  const exportData = {
    tableName,
    fields: schema.map(field => ({
      name: field.name,
      type: field.type,
      options: field.options
    })),
    records: await getAllRecords(table),
    views: await getViewsConfig(table)
  };

  fs.writeFileSync(`${tableName}_full.json`, JSON.stringify(exportData, null, 2));
};
```

### Phase 3: Schema Migration (2-4 hours)

#### 3.1 Create Workbook Structure

```javascript
// Create workbook matching Airtable base
const createWorkbookFromSchema = async (schema) => {
  const workbook = await createWorkbook({
    name: schema.baseName
  });

  // Create sheets for each table
  for (const table of schema.tables) {
    await createSheetFromTable(workbook, table);
  }

  return workbook;
};
```

#### 3.2 Field Type Mapping

**Text Fields:**
```javascript
// Single Line Text
{ name: 'Project Name', type: 'text', required: true }

// Long Text / Notes
{ name: 'Description', type: 'text', multiline: true }

// Email
{ name: 'Contact Email', type: 'email', validation: true }

// URL
{ name: 'Website', type: 'url', validation: true }
```

**Number Fields:**
```javascript
// Number
{ name: 'Quantity', type: 'number', format: 'number' }

// Currency
{ name: 'Price', type: 'number', format: 'currency', symbol: '$' }

// Percent
{ name: 'Discount', type: 'number', format: 'percent' }

// Rating
{ name: 'Score', type: 'number', min: 1, max: 5, integer: true }
```

**Date Fields:**
```javascript
// Date
{ name: 'Start Date', type: 'date', includeTime: false }

// Date with Time
{ name: 'Meeting Time', type: 'date', includeTime: true }

// Date Range
{
  name: 'Project Duration',
  type: 'date',
  startField: 'Start Date',
  endField: 'End Date'
}
```

**Selection Fields:**
```javascript
// Single Select
{
  name: 'Status',
  type: 'select',
  options: ['To Do', 'In Progress', 'Done'],
  default: 'To Do',
  colorMap: {
    'To Do': 'red',
    'In Progress': 'yellow',
    'Done': 'green'
  }
}

// Multiple Select
{
  name: 'Tags',
  type: 'multiselect',
  options: ['Urgent', 'Important', 'Review'],
  allowMultiple: true
}
```

**Relationship Fields:**
```javascript
// Linked Records (Single)
{
  name: 'Project Manager',
  type: 'lookup',
  targetSheet: 'Team',
  displayField: 'Name'
}

// Linked Records (Multiple)
{
  name: 'Tasks',
  type: 'lookup',
  targetSheet: 'Tasks',
  displayField: 'Task Name',
  multiple: true
}

// Lookup Field (from related table)
{
  name: 'Manager Email',
  type: 'formula',
  formula: 'LOOKUP(Project Manager, Team, Email)'
}
```

**Attachment Fields:**
```javascript
// Attachments
{
  name: 'Documents',
  type: 'file',
  multiple: true,
  maxSize: '10MB',
  allowedTypes: ['pdf', 'doc', 'docx', 'jpg', 'png']
}
```

**Formula Fields:**
```javascript
// Formula
{
  name: 'Total',
  type: 'formula',
  formula: '=Quantity * Price'
}

// Rollup (from linked records)
{
  name: 'Task Count',
  type: 'formula',
  formula: '=COUNT(Tasks)'
}

// Rollup with aggregation
{
  name: 'Total Budget',
  type: 'formula',
  formula: '=SUM(Tasks.Budget)'
}

// Concatenation
{
  name: 'Full Name',
  type: 'formula',
  formula: '=CONCAT(First Name, " ", Last Name)'
}
```

#### 3.3 Implement Relationships

**One-to-Many Relationship:**
```javascript
// Airtable: Projects → Tasks (one project has many tasks)
// Spreadsheet Moment: Use VLOOKUP or FILTER

// In Tasks sheet, add Project reference
{
  name: 'Project',
  type: 'lookup',
  targetSheet: 'Projects',
  displayField: 'Project Name'
}

// In Projects sheet, count tasks
{
  name: 'Task Count',
  type: 'formula',
  formula: '=COUNT(FILTER(Tasks!A:A, Tasks!D:D = A2))'
}
```

**Many-to-Many Relationship:**
```javascript
// Airtable: Projects ↔ Team (junction table)
// Spreadsheet Moment: Use intermediate sheet or array formulas

// Method 1: Intermediate sheet
// Sheet: ProjectTeam
// Columns: ProjectID, TeamID, Role

// Method 2: Array formula (simpler)
// In Projects sheet:
{
  name: 'Team Members',
  type: 'formula',
  formula: '=TEXTJOIN(", ", TRUE, FILTER(Team!B:B, Team!A:A = A2))'
}
```

### Phase 4: Data Import (1-2 hours)

#### 4.1 Import CSV Data

```javascript
// Import CSV to sheet
const importCSV = async (workbookId, sheetName, csvPath) => {
  const csv = fs.readFileSync(csvPath, 'utf8');
  const data = parseCSV(csv);

  await createSheet(workbookId, {
    name: sheetName,
    data: data
  });
};
```

#### 4.2 Handle Linked Records

```javascript
// Process linked records after import
const processLinkedRecords = async (workbookId) => {
  // Get all sheets
  const sheets = await getSheets(workbookId);

  // Process relationships
  for (const sheet of sheets) {
    for (const field of sheet.fields) {
      if (field.type === 'lookup') {
        await resolveLookup(workbookId, sheet.name, field);
      }
    }
  }
};

const resolveLookup = async (workbookId, sheetName, field) => {
  const sheet = await getSheet(workbookId, sheetName);
  const targetSheet = await getSheet(workbookId, field.targetSheet);

  for (const row of sheet.rows) {
    const lookupValue = row[field.name];
    const targetRecord = findRecord(targetSheet, lookupValue);
    if (targetRecord) {
      row[field.name + '_ID'] = targetRecord.id;
    }
  }
};
```

### Phase 5: View Migration (2-4 hours)

#### 5.1 Grid View → Filtered View

**Airtable Grid View:**
- All records
- Grouped by field
- Sorted by field
- Filter conditions

**Spreadsheet Moment Implementation:**
```javascript
// Create filtered view
const createFilteredView = async (sheetId, config) => {
  return await createView({
    sheetId,
    name: config.name,
    type: 'grid',
    filters: config.filters,
    sortBy: config.sortBy,
    groupBy: config.groupBy
  });
};

// Example
await createFilteredView('projects', {
  name: 'Active Projects',
  filters: [
    { field: 'Status', operator: '!=', value: 'Done' }
  ],
  sortBy: [
    { field: 'Priority', order: 'desc' },
    { field: 'Start Date', order: 'asc' }
  ]
});
```

#### 5.2 Kanban View → Grouped View

**Airtable Kanban View:**
- Records grouped by select field
- Drag-and-drop between groups
- Color-coded cards

**Spreadsheet Moment Implementation:**
```javascript
// Create Kanban-style view
const createKanbanView = async (sheetId, config) => {
  return await createView({
    sheetId,
    name: config.name,
    type: 'kanban',
    groupBy: config.field,
    cardConfig: {
      titleField: config.titleField,
      subtitleFields: config.subtitleFields,
      colorField: config.colorField
    }
  });
};

// Example
await createKanbanView('tasks', {
  name: 'Task Board',
  field: 'Status',
  titleField: 'Task Name',
  subtitleFields: ['Assignee', 'Due Date'],
  colorField: 'Priority'
});
```

#### 5.3 Calendar View → Timeline View

**Airtable Calendar View:**
- Records as events on calendar
- Date field for positioning
- Color coding by field

**Spreadsheet Moment Implementation:**
```javascript
// Create calendar view
const createCalendarView = async (sheetId, config) => {
  return await createView({
    sheetId,
    name: config.name,
    type: 'calendar',
    dateField: config.dateField,
    endDateField: config.endDateField,
    titleField: config.titleField,
    colorField: config.colorField
  });
};

// Example
await createCalendarView('projects', {
  name: 'Project Timeline',
  dateField: 'Start Date',
  endDateField: 'End Date',
  titleField: 'Project Name',
  colorField: 'Status'
});
```

#### 5.4 Form View → Form Interface

**Airtable Form View:**
- Custom form for data entry
- Field validation
- Confirmation message

**Spreadsheet Moment Implementation:**
```javascript
// Create form interface
const createFormView = async (sheetId, config) => {
  return await createForm({
    name: config.name,
    targetSheet: sheetId,
    fields: config.fields,
    validation: config.validation,
    onSubmit: config.onSubmit,
    confirmationMessage: config.confirmationMessage
  });
};

// Example
await createFormView('projects', {
  name: 'Project Intake',
  fields: [
    { name: 'Project Name', required: true },
    { name: 'Description', type: 'textarea' },
    { name: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'] },
    { name: 'Start Date', type: 'date' }
  ],
  validation: {
    requireAuth: true,
    rateLimit: 5 // per hour
  },
  onSubmit: async (data) => {
    await notifySlack(`New project: ${data['Project Name']}`);
  },
  confirmationMessage: 'Thank you! Your project has been submitted.'
});
```

### Phase 6: Automation Migration (3-6 hours)

#### 6.1 Common Automation Patterns

**Pattern 1: Status Change Notification**

**Airtable Automation:**
- When: Status changes to "Done"
- Action: Send Slack message

**Spreadsheet Moment Cell Agent:**
```javascript
{
  name: 'NotifyOnComplete',
  trigger: {
    sheet: 'Projects',
    field: 'Status',
    value: 'Done'
  },
  action: async (record) => {
    await slack.sendMessage({
      channel: '#projects',
      text: `Project "${record['Project Name']}" is complete!`
    });

    await email.send({
      to: record['Project Manager Email'],
      subject: 'Project Completed',
      body: `Great job! Project "${record['Project Name']}" is done.`
    });
  }
}
```

**Pattern 2: Auto-Assign Tasks**

**Airtable Automation:**
- When: New record created
- Action: Assign to team member

**Spreadsheet Moment Cell Agent:**
```javascript
{
  name: 'AutoAssignTask',
  trigger: {
    sheet: 'Tasks',
    event: 'onCreate'
  },
  action: async (record) => {
    // Find available team member
    const assignee = await findAvailableAssignee(record['Project']);

    // Update record
    await updateRecord('Tasks', record.id, {
      'Assignee': assignee.name,
      'Assigned Date': new Date()
    });

    // Send notification
    await notify(assignee, `You've been assigned to: ${record['Task Name']}`);
  }
}
```

**Pattern 3: Date-Based Reminder**

**Airtable Automation:**
- When: Due date is tomorrow
- Action: Send reminder email

**Spreadsheet Moment Cell Agent:**
```javascript
{
  name: 'SendDueDateReminder',
  schedule: '0 9 * * *', // 9 AM daily
  action: async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueTasks = await queryRecords('Tasks', {
      filter: {
        'Due Date': tomorrow,
        'Status': ['!=', 'Done']
      }
    });

    for (const task of dueTasks) {
      await email.send({
        to: task['Assignee Email'],
        subject: 'Task Due Tomorrow',
        body: `Reminder: "${task['Task Name']}" is due tomorrow.`
      });
    }
  }
}
```

**Pattern 4: Rollup Calculation**

**Airtable Automation:**
- When: Linked records change
- Action: Update rollup field

**Spreadsheet Moment Formula:**
```javascript
// No automation needed - use reactive formula
{
  name: 'Total Budget',
  type: 'formula',
  formula: '=SUM(FILTER(Tasks!Budget, Tasks!ProjectID = A2))'
}
```

**Pattern 5: Webhook Integration**

**Airtable Automation:**
- When: Record matches condition
- Action: Send webhook

**Spreadsheet Moment Cell Agent:**
```javascript
{
  name: 'SendWebhook',
  trigger: {
    sheet: 'Deals',
    field: 'Stage',
    value: 'Closed Won'
  },
  action: async (record) => {
    await fetch('https://api.example.com/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deal_id: record.id,
        amount: record['Amount'],
        close_date: record['Close Date']
      })
    });
  }
}
```

---

## API Integration Patterns

### Airtable API → Spreadsheet Moment API

**Airtable API Pattern:**
```javascript
const airtable = require('airtable');
const base = airtable.base('APP_ID');

// Create record
base('Table1').create({
  'Name': 'John',
  'Email': 'john@example.com'
}, (err, record) => {
  if (err) console.error(err);
  console.log(record.getId());
});
```

**Spreadsheet Moment API Pattern:**
```javascript
// Create record
const record = await createRecord('Sheet1', {
  'Name': 'John',
  'Email': 'john@example.com'
});

console.log(record.id);
```

### Webhook Migration

**Airtable Webhooks:**
```javascript
// Airtable sends webhook on record changes
// Payload includes record data and change type
```

**Spreadsheet Moment Webhooks:**
```javascript
// Configure webhook endpoint
await createWebhook({
  url: 'https://your-server.com/webhook',
  events: ['onCreate', 'onUpdate', 'onDelete'],
  sheet: 'Contacts'
});

// Handle webhook
app.post('/webhook', async (req, res) => {
  const { event, record } = req.body;

  if (event === 'onCreate') {
    await processNewRecord(record);
  }

  res.sendStatus(200);
});
```

---

## Field Type Mapping

### Complete Mapping Table

| Airtable Type | Spreadsheet Moment Type | Notes |
|---------------|------------------------|-------|
| Single line text | Text | Full compatibility |
| Long text | Text (multiline) | Supports rich text |
| Email | Email | With validation |
| Phone number | Phone | Format validation |
| Number | Number | All formats supported |
| Currency | Number (currency) | Multiple currencies |
| Percent | Number (percent) | Auto-format |
| Duration | Number (duration) | Seconds/milliseconds |
| Rating | Number (integer) | Min/max validation |
| Count | Formula | COUNT function |
| Auto number | Auto-increment | Built-in feature |
| Single select | Select | Color coding |
| Multiple select | Multi-select | Array support |
| Checkbox | Boolean | True/false |
| Date | Date | Include time option |
| Date range | Date (range) | Start/end fields |
| Phone number | Phone | Format validation |
| URL | URL | Link validation |
| Email | Email | Validation |
| Attachment | File | Multiple files |
| Lookup | Formula | VLOOKUP/FILTER |
| Rollup | Formula | Aggregation |
| Lookup from multiple records | Formula | ARRAYFORMULA |
| Formula | Formula | Enhanced syntax |
| Created time | System field | Auto-populated |
| Created by | System field | Auto-populated |
| Last modified time | System field | Auto-updated |
| Last modified by | System field | Auto-updated |
| Barcode | Text | Special formatting |
| Button | Action | Cell Agent trigger |

---

## Troubleshooting

### Common Issues

**Issue 1: Linked Record References Lost**
- **Cause:** IDs don't match after import
- **Solution:** Rebuild relationships using field matching

**Issue 2: Formulas Not Calculating**
- **Cause:** Field names changed
- **Solution:** Update formula references

**Issue 3: Large Dataset Slow**
- **Cause:** Too many complex formulas
- **Solution:** Use Cell Agents, implement caching

**Issue 4: View Permissions Not Working**
- **Cause:** Different permission model
- **Solution:** Configure row-level permissions

**Issue 5: Automation Not Triggering**
- **Cause:** Trigger conditions changed
- **Solution:** Update Cell Agent triggers

---

## Best Practices

### 1. Plan Schema Carefully
- Map all Airtable tables to sheets
- Define relationships clearly
- Plan for future growth

### 2. Test Import with Sample Data
- Start with small dataset
- Validate all formulas
- Test relationships

### 3. Implement Gradually
- Migrate one table at a time
- Test thoroughly
- Train team progressively

### 4. Leverage AI Features
- Use Cell Agents for automation
- Implement smart validation
- Enable predictive analysis

### 5. Monitor Performance
- Track calculation times
- Optimize complex formulas
- Use caching where appropriate

---

## Additional Resources

### Migration Tools
- **Schema Converter**: Convert Airtable schema to Spreadsheet Moment
- **Data Importer**: Bulk import from Airtable API
- **View Builder**: Create views from Airtable configurations

### Documentation
- [Cell Agent API](../docs/CELL_AGENT_API.md)
- [IO Connections](../docs/IO_CONNECTIONS.md)
- [Form Builder](../docs/FORM_BUILDER.md)

### Community
- [GitHub Discussions](https://github.com/SuperInstance/spreadsheet-moment/discussions)
- [Discord Server](https://discord.gg/spreadsheetmoment)
- [Migration Examples](https://github.com/SuperInstance/spreadsheet-moment/tree/main/examples/migrations)

---

**Last Updated**: 2026-03-15
**Version**: 1.0.0