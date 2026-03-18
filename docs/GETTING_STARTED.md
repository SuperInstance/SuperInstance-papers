# Getting Started with SuperInstance

**A friendly guide to getting cellular agents working in your spreadsheets**

---

## Welcome!

SuperInstance is a system for running **cellular agents** (called "claws") inside spreadsheet cells. Think of it like having tiny AI assistants living in each cell of your spreadsheet, watching for changes and taking action.

This guide will help you:
- Understand what SuperInstance does
- Get the system running in 5 minutes
- Create your first agent
- Learn what's possible (and what isn't yet)

---

## What is SuperInstance?

### The Big Idea

Traditional spreadsheets are passive - they just sit there waiting for you to type something. SuperInstance makes your spreadsheet **active** by putting AI agents in cells that can:
- Watch for changes
- Think about what to do
- Take action automatically
- Coordinate with other agents

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    SPREADSHEET                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │   A1    │  │   B1    │  │   C1    │  │   D1    │       │
│  │ CLAW()  │  │ CLAW()  │  │ CLAW()  │  │ CLAW()  │       │
│  │         │  │         │  │         │  │         │       │
│  │ Agent 1 │  │ Agent 2 │  │ Agent 3 │  │ Agent 4 │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
```

Each agent in a cell can:
- **Monitor** - Watch for data changes
- **Think** - Process the data with AI
- **Act** - Update cells, send alerts, trigger other agents

---

## What Can I Do With This?

### Right Now (MVP)

✅ **Create agents** in spreadsheet cells
✅ **Trigger agents** manually or on data changes
✅ **Watch agents** think and act in real-time
✅ **Equip agents** with different capabilities
✅ **Build demos** and prototypes

### Coming Soon

❌ Real AI integration (DeepSeek, GPT, Claude)
❌ Actual reasoning and learning
❌ Multi-agent coordination
❌ Persistence (save agents between sessions)
❌ Authentication and security

---

## System Requirements

### What You Need

- **Node.js** 18+ (download from [nodejs.org](https://nodejs.org))
- **npm** (comes with Node.js)
- **A web browser** (Chrome, Firefox, Safari, Edge)
- **Terminal/Command Prompt** (for running commands)

### Platform Support

- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Linux (Ubuntu, Fedora, etc.)

---

## Installation (5 Minutes)

### Step 1: Install Node.js

1. Go to [nodejs.org](https://nodejs.org)
2. Download the LTS version
3. Run the installer
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### Step 2: Get the Code

You have two options:

**Option A: Download from GitHub**
```bash
git clone https://github.com/SuperInstance/minimal-claw-server.git
cd minimal-claw-server
```

**Option B: Download ZIP**
1. Go to https://github.com/SuperInstance/minimal-claw-server
2. Click "Code" → "Download ZIP"
3. Extract the files
4. Open a terminal in that folder

### Step 3: Install Dependencies

```bash
npm install
```

This will download all the needed packages (might take a minute).

### Step 4: Start the Server

```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║           MINIMAL CLAW SERVER - MVP DEMONSTRATION          ║
╠════════════════════════════════════════════════════════════╣
║  Status: Running                                           ║
║  Port: 8080                                                ║
║  Health: http://localhost:8080/health                      ║
║  Agents: 0                                                 ║
╚════════════════════════════════════════════════════════════╝
```

**Success!** The server is now running.

---

## Your First Agent (3 Minutes)

### Method 1: Using the Demo Interface (Easiest)

1. **Keep the server running** (don't close that terminal)
2. **Open the demo**:
   - Find the `demo.html` file in the minimal-claw-server folder
   - Double-click it to open in your browser
3. **Create an agent**:
   - Click on cell A1 (it should highlight)
   - Click "Create Agent"
   - Watch the agent appear!
4. **Trigger the agent**:
   - Click "Trigger Agent"
   - Watch the state change: IDLE → THINKING → ACTING → IDLE

### Method 2: Using curl (Command Line)

Open a **new terminal** (keep the server running in the first one):

```bash
# Create an agent
curl -X POST http://localhost:8080/api/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "seed": "Monitor cell A1",
    "equipment": ["MEMORY", "REASONING"],
    "trigger": {"type": "data"},
    "cellId": {"sheetId": "sheet1", "row": 0, "col": 0}
  }'
```

You'll get back a JSON response with your agent's ID.

```bash
# Trigger the agent
curl -X POST http://localhost:8080/api/v1/agents/{YOUR_AGENT_ID}/trigger
```

### Method 3: Using JavaScript

Create a file called `my-agent.js`:

```javascript
const axios = require('axios');

async function createAgent() {
  try {
    const response = await axios.post('http://localhost:8080/api/v1/agents', {
      model: 'deepseek-chat',
      seed: 'Monitor cell A1',
      equipment: ['MEMORY', 'REASONING'],
      trigger: { type: 'data' },
      cellId: { sheetId: 'sheet1', row: 0, col: 0 }
    });

    console.log('Agent created:', response.data);

    // Trigger the agent
    const triggerResponse = await axios.post(
      `http://localhost:8080/api/v1/agents/${response.data.id}/trigger`
    );
    console.log('Agent triggered:', triggerResponse.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

createAgent();
```

Run it:
```bash
node my-agent.js
```

---

## Understanding Agents

### Agent States

Agents go through different states:

| State | Meaning | What's Happening |
|-------|---------|------------------|
| **IDLE** | Waiting | Agent is ready, waiting for a trigger |
| **THINKING** | Processing | Agent is analyzing data and deciding what to do |
| **ACTING** | Acting | Agent is taking action (updating cells, etc.) |
| **EQUIPPING** | Equipping | Agent is adding new equipment |
| **UNEQUIPPING** | Unequipping | Agent is removing equipment |
| **ERROR** | Error | Something went wrong |

### Equipment

Agents can be "equipped" with different capabilities:

| Equipment | What It Does |
|-----------|--------------|
| **MEMORY** | Lets agent remember things |
| **REASONING** | Lets agent make decisions |
| **CONSENSUS** | Lets agent work with other agents |
| **SPREADSHEET** | Lets agent read/write cells |
| **DISTILLATION** | Compresses agent's knowledge |
| **COORDINATION** | Manages multi-agent tasks |

### Triggers

Agents can be triggered in different ways:

| Trigger Type | When It Fires |
|--------------|---------------|
| **manual** | Only when you manually trigger it |
| **data** | When data changes in the cell |
| **periodic** | On a time schedule (every N seconds) |
| **event** | When a specific event occurs |

---

## Common Use Cases

### 1. Monitor a Cell Value

```javascript
// Agent that watches cell A1
const agent = await createAgent({
  model: 'deepseek-chat',
  seed: 'Alert if temperature exceeds 100',
  equipment: ['MEMORY', 'REASONING'],
  trigger: { type: 'data', source: 'temperature_sensor' },
  cellId: { sheetId: 'sheet1', row: 0, col: 0 }
});
```

### 2. Periodic Check

```javascript
// Agent that checks every 5 seconds
const agent = await createAgent({
  model: 'deepseek-chat',
  seed: 'Check system status every 5 seconds',
  equipment: ['MEMORY'],
  trigger: { type: 'periodic', interval: 5000 }
});
```

### 3. Data Pipeline

```javascript
// Create a chain of agents
const agent1 = await createAgent({
  seed: 'Fetch data from API',
  cellId: { sheetId: 'sheet1', row: 0, col: 0 }
});

const agent2 = await createAgent({
  seed: 'Process the data',
  cellId: { sheetId: 'sheet1', row: 0, col: 1 }
});

const agent3 = await createAgent({
  seed: 'Generate report',
  cellId: { sheetId: 'sheet1', row: 0, col: 2 }
});
```

---

## Next Steps

### Learn More

- 📖 **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- 📚 **[Tutorial](./TUTORIAL.md)** - Step-by-step tutorial
- 🏗️ **[Architecture](./ARCHITECTURE.md)** - How it works under the hood
- 🤝 **[Contributing](./CONTRIBUTING.md)** - How to contribute

### Try Things Out

- ✅ Create multiple agents in different cells
- ✅ Try different equipment combinations
- ✅ Experiment with trigger types
- ✅ Watch real-time updates in the demo

### Get Help

- 🐛 **[Report Bugs](https://github.com/SuperInstance/minimal-claw-server/issues)** - Found a problem?
- 💡 **[Feature Requests](https://github.com/SuperInstance/minimal-claw-server/issues)** - Have an idea?
- 💬 **[Discussions](https://github.com/SuperInstance/minimal-claw-server/discussions)** - Ask questions

---

## FAQ

**Q: Is this production-ready?**
A: No! This is an MVP (Minimum Viable Product). It works for demos and prototypes, but isn't ready for production use.

**Q: Can I use this with Excel?**
A: Not yet. Right now it only works with our demo interface. Integration with spreadsheet-moment (based on Univer) is coming.

**Q: Do agents actually use AI?**
A: Not in the MVP. The framework is there, but actual AI integration (DeepSeek, GPT, etc.) hasn't been added yet. Agents currently just simulate thinking.

**Q: Will I lose my agents if I restart the server?**
A: Yes. The MVP doesn't have persistence - everything is stored in memory and lost when the server stops.

**Q: Is this secure?**
A: No. The MVP has no authentication or authorization. Anyone who can access the server can do anything. Don't use this in production!

**Q: Can I run multiple agents at once?**
A: Yes! You can create as many agents as you want. Each agent runs independently.

**Q: What's the difference between a Claw and a Bot?**
A:
- **Claw**: Has an AI model, can reason and learn
- **Bot**: No AI model, just follows simple rules

The MVP only implements Claws (without real AI yet).

---

## Troubleshooting

### Server Won't Start

**Problem**: `Error: listen EADDRINUSE: address already in use :::8080`

**Solution**: Something else is using port 8080. Either:
1. Stop the other program using port 8080
2. Change the port in `src/index.js` (look for `PORT`)

### Can't Connect to Server

**Problem**: `ECONNREFUSED` when trying to connect

**Solution**: Make sure the server is running! You should see the startup message in your terminal.

### Agent Creation Fails

**Problem**: `400 Bad Request` when creating an agent

**Solution**: Check your JSON:
- Make sure all required fields are present
- Verify equipment values are valid (MEMORY, REASONING, etc.)
- Check trigger type is valid (manual, data, periodic, event)

### Demo Page Not Working

**Problem**: Demo page loads but nothing happens

**Solution**:
1. Check the server is running
2. Open browser's developer console (F12) and look for errors
3. Make sure you're opening `demo.html` from the same folder as the server

---

## What's Next?

The MVP is just the beginning! Here's what's coming:

### Round 9: Real AI Integration
- Connect to DeepSeek, GPT, Claude
- Actual reasoning and decision-making
- Real intelligence in agents

### Round 10: Spreadsheet Integration
- Connect to spreadsheet-moment
- Real cell value monitoring
- Two-way data flow

### Round 11: Persistence & Security
- Save agents to database
- User authentication
- API key validation

### Round 12+: Advanced Features
- Multi-agent coordination
- Seed learning system
- Social architecture

---

## License

MIT License - see LICENSE file for details

---

**Ready to dive deeper? Check out the [API Reference](./API_REFERENCE.md)!**
