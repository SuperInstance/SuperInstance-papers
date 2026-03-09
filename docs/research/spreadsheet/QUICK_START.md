# POLLN Spreadsheet Integration - Quick Start Guide

This guide will help you set up and run the POLLN spreadsheet integration in under 30 minutes.

## Prerequisites

- Node.js 18+ installed
- Google account with Google Sheets access
- Git installed
- Basic knowledge of TypeScript/JavaScript

## Step 1: Clone and Setup POLLN (5 minutes)

```bash
# Clone the repository
git clone https://github.com/SuperInstance/polln.git
cd polln

# Install dependencies
npm install

# Build the project
npm run build
```

## Step 2: Set Up POLLN WebSocket Server (5 minutes)

```bash
# Create environment file
cat > .env << EOF
PORT=3000
NODE_ENV=development
GOOGLE_CREDENTIALS_PATH=./credentials.json
DATABASE_URL=postgresql://user:password@localhost:5432/polln
REDIS_URL=redis://localhost:6379
EOF

# Start the server
npm run dev
```

The server should start on `http://localhost:3000`

## Step 3: Set Up Google Cloud Project (10 minutes)

### 3.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project: "POLLN Spreadsheet Integration"
3. Note the Project ID

### 3.2 Enable APIs

1. Navigate to **APIs & Services** → **Library**
2. Enable the following APIs:
   - Google Sheets API
   - Google Drive API

### 3.3 Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: "POLLN Spreadsheet Add-on"
5. Authorized redirect URIs:
   ```
   https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercallback
   ```
6. Click **Create**

7. Download the credentials JSON and save as `credentials.json`

## Step 4: Create Apps Script Add-on (10 minutes)

### 4.1 Install clasp CLI

```bash
npm install -g @google/clasp
```

### 4.2 Login to Google

```bash
clasp login
```

### 4.3 Create Apps Script Project

```bash
# Create new directory for add-on
mkdir polln-add-on
cd polln-add-on

# Create Apps Script project
clasp create --title "POLLN Spreadsheet Add-on" --type sheets
```

### 4.4 Copy Add-on Code

Create `Code.js` with the following content:

```javascript
/**
 * POLLN Spreadsheet Add-on
 */

// Configuration
const POLLN_SERVER_URL = 'http://localhost:3000';
const AGENT_PREFIX = 'AGENT:';

/**
 * Triggered when user edits a cell
 */
function onEdit(e) {
  const range = e.range;
  const value = range.getValue();

  // Check if this is an agent command
  if (typeof value === 'string' && value.startsWith(AGENT_PREFIX)) {
    handleAgentCommand(range, value);
  }
}

/**
 * Handle agent command in cell
 */
function handleAgentCommand(range, command) {
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  const cell = range.getA1Notation();
  const prompt = command.replace(AGENT_PREFIX, '').trim();

  // Show loading state
  range.setValue('🤖 Thinking...')
       .setFontColor('#999999');

  // Create agent request
  const request = {
    spreadsheetId,
    cell,
    prompt,
    context: getContext(range)
  };

  // Send to POLLN server
  spawnAgentAsync(request, range);
}

/**
 * Get context around cell
 */
function getContext(range) {
  return {
    sheetName: range.getSheet().getName(),
    row: range.getRow(),
    col: range.getColumn(),
    value: range.getValue()
  };
}

/**
 * Spawn agent asynchronously
 */
function spawnAgentAsync(request, range) {
  const requestId = generateId();

  // Send spawn request
  try {
    UrlFetchApp.fetch(POLLN_SERVER_URL + '/api/spawn', {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify({
        ...request,
        requestId
      }),
      muteHttpExceptions: true
    });

    // Poll for result
    pollForResult(requestId, range);
  } catch (error) {
    range.setValue('❌ Error: ' + error.message)
         .setFontColor('#cc0000');
  }
}

/**
 * Poll for agent result
 */
function pollForResult(requestId, range) {
  const maxAttempts = 30;
  let attempts = 0;

  const poll = () => {
    if (attempts >= maxAttempts) {
      range.setValue('❌ Timeout')
           .setFontColor('#cc0000');
      return;
    }

    try {
      const response = UrlFetchApp.fetch(
        POLLN_SERVER_URL + `/api/result/${requestId}`
      );

      const result = JSON.parse(response.getContentText());

      if (result.status === 'complete') {
        range.setValue(result.output)
             .setFontColor('#000000')
             .setNote(`Agent ID: ${result.agentId}\nConfidence: ${result.confidence}%`);
      } else if (result.status === 'failed') {
        range.setValue('❌ ' + result.error)
             .setFontColor('#cc0000');
      } else {
        attempts++;
        Utilities.sleep(1000);
        poll();
      }
    } catch (error) {
      range.setValue('❌ Error: ' + error.message)
           .setFontColor('#cc0000');
    }
  };

  poll();
}

/**
 * Generate unique ID
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Add-on menu
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🐝 POLLN')
    .addItem('📊 Show Agent Status', 'showAgentStatus')
    .addItem('🔄 Refresh Agents', 'refreshAgents')
    .addSeparator()
    .addItem('⚙️ Settings', 'openSettings')
    .addToUi();
}

/**
 * Show agent status
 */
function showAgentStatus() {
  const html = HtmlService.createHtmlOutput(`
    <h1>🐝 POLLN Colony Status</h1>
    <p>POLLN Spreadsheet Integration is running!</p>
    <div id="status">
      <p><strong>Server:</strong> ${POLLN_SERVER_URL}</p>
      <p><strong>Status:</strong> Connected</p>
    </div>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { color: #ff6b6b; }
    </style>
  `)
  .setWidth(300)
  .setHeight(200);

  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Refresh agents
 */
function refreshAgents() {
  SpreadsheetApp.getUi().alert('Agents refreshed!');
}

/**
 * Open settings
 */
function openSettings() {
  const html = HtmlService.createHtmlOutput(`
    <h1>⚙️ Settings</h1>
    <p>POLLN Server URL:</p>
    <input type="text" value="${POLLN_SERVER_URL}" style="width: 100%;">
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { color: #ff6b6b; }
    </style>
  `)
  .setWidth(400)
  .setHeight(300);

  SpreadsheetApp.getUi().showModalDialog(html, 'Settings');
}
```

### 4.5 Update appscript.json

Create `appscript.json`:

```json
{
  "timeZone": "America/New_York",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Sheets",
        "serviceId": "sheets",
        "version": "v4"
      }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "sheets": {
    "macros": []
  },
  "addOns": {
    "common": {
      "name": "POLLN Spreadsheet Integration",
      "logoUrl": "https://raw.githubusercontent.com/SuperInstance/polln/main/docs/logo.png",
      "layoutProperties": {
        "primaryColorRgb": "#ff6b6b"
      }
    },
    "sheets": {
      "homepageTrigger": {
        "runFunction": "showAgentStatus"
      }
    }
  }
}
```

### 4.6 Deploy Add-on

```bash
# Push to Apps Script
clasp push

# Deploy
clasp deploy
```

## Step 5: Test the Integration (5 minutes)

### 5.1 Open Google Sheets

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet

### 5.2 Add the POLLN Add-on

1. Click **Extensions** → **Add-ons** → **Get add-ons**
2. Search for "POLLN"
3. Install the add-on

### 5.3 Test Agent Command

1. In any cell, type:
   ```
   AGENT: Say hello to POLLN
   ```

2. Press Enter

3. Watch the cell show:
   - 🤖 Thinking... (gray text)
   - After a few seconds: "Hello from POLLN! 🐝"

### 5.4 Check Agent Status

1. Click **🐝 POLLN** → **📊 Show Agent Status**
2. See sidebar with agent information

## Troubleshooting

### Issue: "🤔 Thinking..." stays forever

**Solution:**
1. Check POLLN server is running: `curl http://localhost:3000/health`
2. Check browser console for errors
3. Verify POLLN_SERVER_URL in Code.js

### Issue: "❌ Error: Network error"

**Solution:**
1. Verify CORS is enabled on POLLN server
2. Check firewall settings
3. Ensure Apps Script can reach localhost (use ngrok for testing)

### Issue: Add-on doesn't appear in menu

**Solution:**
1. Refresh the spreadsheet
2. Check `onOpen()` function exists
3. Verify add-on deployment succeeded

### Issue: OAuth authentication fails

**Solution:**
1. Verify credentials.json is correct
2. Check OAuth consent screen is configured
3. Ensure all required scopes are included

## Development Tips

### Using ngrok for Local Testing

```bash
# Install ngrok
brew install ngrok  # macOS
# or
choco install ngrok  # Windows

# Start ngrok tunnel
ngrok http 3000

# Update POLLN_SERVER_URL in Code.js
const POLLN_SERVER_URL = 'https://YOUR_NGROK_URL.ngrok.io';
```

### Debugging

1. **Server logs:**
   ```bash
   # View server logs
   npm run dev
   ```

2. **Apps Script logs:**
   - Go to Apps Script Dashboard
   - Click "Executions"
   - View recent runs

3. **Browser console:**
   - Open browser DevTools (F12)
   - Check Console tab for errors

### Testing Different Agent Commands

```javascript
// In any cell, type:

AGENT: Summarize the data above
AGENT: Calculate the total of column B
AGENT: What's the trend in this data?
AGENT: Create a chart from these numbers
AGENT: Find outliers in this dataset
```

## Next Steps

1. **Customize Agent Behavior**
   - Edit `src/spreadsheet/agents/` to create custom agents
   - Modify prompts and responses

2. **Add More Features**
   - Multi-agent collaboration
   - Cell-to-cell learning
   - Visualization of agent networks

3. **Deploy to Production**
   - Set up production server (AWS/GCP/Azure)
   - Configure domain and SSL
   - Set up monitoring and logging

## Resources

- [POLLN Documentation](https://github.com/SuperInstance/polln)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Apps Script Guides](https://developers.google.com/apps-script/guides)
- [clasp CLI](https://github.com/google/clasp)

## Support

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/SuperInstance/polln/issues)
2. Ask questions in [GitHub Discussions](https://github.com/SuperInstance/polln/discussions)
3. Join our [Discord Community](https://discord.gg/polln)

---

**Congratulations!** 🎉

You now have a working POLLN spreadsheet integration. Start experimenting with agent commands and watch your spreadsheet come alive!

**What to try next:**
- Create multiple agents that collaborate
- Train agents on your data
- Build custom agent types
- Visualize agent colonies

Happy agent farming! 🐝
