# Frequently Asked Questions

**Common questions about SuperInstance**

---

## General Questions

### What is SuperInstance?

SuperInstance is a system for running **cellular agents** (called "claws") inside spreadsheet cells. Think of it like having tiny AI assistants living in each cell of your spreadsheet, watching for changes and taking action.

### Is this production-ready?

**No!** This is an MVP (Minimum Viable Product) / demo. It works for demonstrations and prototypes, but it is **not ready for production use**.

**Missing features**:
- ❌ No real AI integration (just simulation)
- ❌ No persistence (data lost on restart)
- ❌ No authentication or security
- ❌ No actual spreadsheet integration

### What can I do with this right now?

✅ Create agents in spreadsheet cells
✅ Trigger agents manually or on data changes
✅ Watch agents think and act in real-time
✅ Build demos and prototypes
✅ Learn the concepts

### What's the difference between a Claw and a Bot?

**Claw**:
- Has an AI model
- Can reason and learn
- Slower (model inference)
- Use for complex decisions

**Bot**:
- No AI model
- Just deterministic logic
- Faster (pure code)
- Use for simple automation

The MVP only implements Claws (without real AI yet).

---

## Installation & Setup

### How do I install SuperInstance?

```bash
# Clone the repository
git clone https://github.com/SuperInstance/minimal-claw-server.git
cd minimal-claw-server

# Install dependencies
npm install

# Start the server
npm start
```

See the [Getting Started Guide](./GETTING_STARTED.md) for detailed instructions.

### What do I need to run this?

- **Node.js** 18 or higher
- **npm** (comes with Node.js)
- A web browser (for the demo)
- A terminal/command prompt

### Can I run this on Windows/Mac/Linux?

Yes! It works on all three platforms.

### The server won't start - port 8080 is already in use

Something else is using port 8080. Either:
1. Stop the other program using port 8080
2. Change the port in `src/index.js` (look for `PORT`)

### I get "EADDRINUSE" error

This means port 8080 is already in use. See the previous answer.

---

## Usage

### How do I create my first agent?

**Option 1: Using the demo**
1. Start the server: `npm start`
2. Open `demo.html` in your browser
3. Click a cell
4. Click "Create Agent"

**Option 2: Using curl**
```bash
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

See the [Tutorial](./TUTORIAL.md) for a complete walkthrough.

### How do I trigger an agent?

```bash
curl -X POST http://localhost:8080/api/v1/agents/{AGENT_ID}/trigger
```

Or use the demo interface and click "Trigger Agent".

### How do I see all my agents?

```bash
curl http://localhost:8080/api/v1/agents
```

### How do I delete an agent?

```bash
curl -X DELETE http://localhost:8080/api/v1/agents/{AGENT_ID}
```

### What are agent states?

- **IDLE** - Agent is waiting for a trigger
- **THINKING** - Agent is processing data
- **ACTING** - Agent is taking action
- **EQUIPPING** - Agent is adding equipment
- **UNEQUIPPING** - Agent is removing equipment
- **ERROR** - Something went wrong

### What is equipment?

Equipment are modules that give agents capabilities:

| Equipment | Purpose |
|-----------|---------|
| MEMORY | Remember things |
| REASONING | Make decisions |
| CONSENSUS | Work with other agents |
| SPREADSHEET | Read/write cells |
| DISTILLATION | Compress knowledge |
| COORDINATION | Manage multi-agent tasks |

### What are triggers?

Triggers determine when agents activate:

| Trigger | When It Fires |
|---------|---------------|
| manual | Only when you trigger it |
| data | When data changes |
| periodic | On a schedule (every N seconds) |
| event | When a specific event occurs |

---

## Technical Questions

### Does this use real AI?

**Not in the MVP.** The framework is ready, but actual AI integration (DeepSeek, GPT, Claude) hasn't been added yet. Agents currently just simulate thinking by changing states.

Real AI integration is planned for **Round 9**.

### Will I lose my agents if I restart the server?

**Yes.** The MVP doesn't have persistence - everything is stored in memory and lost when the server stops.

Persistence (database) is planned for **Round 11**.

### Is this secure?

**No.** The MVP has no authentication or authorization. Anyone who can access the server can do anything.

Security is planned for **Round 11**.

### Can I use this with Excel?

**Not yet.** Right now it only works with our demo interface. Integration with spreadsheet-moment (based on Univer) is planned for **Round 10**.

### Can I run multiple agents at once?

Yes! You can create as many agents as you want. Each agent runs independently.

### How many agents can I create?

There's no hard limit in the MVP. However, since everything is in-memory, you're limited by:
- Available RAM
- CPU performance
- Node.js heap size

In practice, you can probably run hundreds or thousands of agents.

### How do I monitor agents in real-time?

Use the WebSocket connection:

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE',
    agentId: 'your-agent-id'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Agent update:', message);
};
```

See the [API Reference](./API_REFERENCE.md) for more details.

---

## Architecture & Design

### Why cellular agents?

Cellular agents offer:
- **Scalability** - Each agent is independent
- **Flexibility** - Easy to add/remove agents
- **Parallelism** - Agents can work simultaneously
- **Locality** - Each agent has a specific context

### Why spreadsheets?

Spreadsheets are:
- **Familiar** - Everyone knows how to use them
- **Visual** - Easy to see what's happening
- **Structured** - Grid organization is natural
- **Accessible** - Low barrier to entry

### What's the difference between this and Excel macros?

| Aspect | SuperInstance | Excel Macros |
|--------|---------------|--------------|
| **AI** | Has AI models (planned) | No AI |
| **Parallel** | Agents run independently | Sequential |
| **Real-time** | WebSocket updates | Manual refresh |
| **Scalable** | Thousands of agents | Limited |
| **Language** | JavaScript/TypeScript | VBA |

### Why Node.js/Express?

- ✅ Simple and lightweight
- ✅ Easy to learn
- ✅ Great for REST APIs
- ✅ Large ecosystem
- ✅ Cross-platform

### Why in-memory storage?

- ✅ Fast (no database overhead)
- ✅ Simple (no schema needed)
- ✅ Good for MVP/demo
- ❌ Data lost on restart (not production-ready)

---

## Troubleshooting

### The server crashes when I create an agent

Check the server logs for errors. Common issues:
- Missing required fields in request
- Invalid equipment slot
- Invalid trigger type
- Malformed JSON

### Agent stays in THINKING state forever

This shouldn't happen in the MVP (agents automatically transition to ACTING then IDLE). If it does:
1. Check the server logs for errors
2. Verify the agent ID is correct
3. Try restarting the server

### WebSocket connection fails

Make sure:
1. The server is running
2. You're connecting to the correct URL (`ws://localhost:8080/ws`)
3. No firewall is blocking the connection

### Demo page doesn't work

1. Make sure the server is running
2. Check browser's developer console (F12) for errors
3. Verify you opened `demo.html` from the correct folder
4. Try a different browser

### Can't connect to the server

1. Check the server is running (`npm start`)
2. Verify the URL (`http://localhost:8080`)
3. Check firewall settings
4. Try `curl http://localhost:8080/health` to test

---

## Future Development

### What's coming next?

**Round 9** - Real AI Integration:
- Connect to DeepSeek, GPT, Claude
- Actual reasoning and decision-making
- Real intelligence in agents

**Round 10** - Spreadsheet Integration:
- Connect to spreadsheet-moment
- Real cell value monitoring
- Two-way data flow

**Round 11** - Persistence & Security:
- Add PostgreSQL database
- Implement authentication
- Add API key validation

**Round 12+** - Advanced Features:
- Multi-agent coordination
- Seed learning system
- Social architecture

### When will it be production-ready?

Probably after **Round 15** (the final round). We need to add:
- Persistence
- Security
- Testing
- Documentation
- Performance optimization
- Error handling
- Monitoring

### Can I contribute?

Yes! See the [Contributing Guide](./CONTRIBUTING.md) for details.

### How do I report a bug?

Open an issue on GitHub:
https://github.com/SuperInstance/minimal-claw-server/issues

### How do I request a feature?

Open an issue on GitHub with the "enhancement" label:
https://github.com/SuperInstance/minimal-claw-server/issues

---

## Licensing

### What license is this under?

MIT License. See LICENSE file for details.

### Can I use this in commercial projects?

Yes! The MIT license allows commercial use.

### Can I modify the code?

Yes! The MIT license allows modifications.

---

## Getting Help

### Where can I ask questions?

- GitHub Issues: https://github.com/SuperInstance/minimal-claw-server/issues
- GitHub Discussions: https://github.com/SuperInstance/minimal-claw-server/discussions

### Is there documentation?

Yes! Check out:
- [Getting Started Guide](./GETTING_STARTED.md)
- [API Reference](./API_REFERENCE.md)
- [Tutorial](./TUTORIAL.md)
- [Architecture](./MVP_ARCHITECTURE.md)

### Is there a community?

Not yet! We're just getting started. Follow the GitHub repo for updates.

---

## Miscellaneous

### Why is it called "SuperInstance"?

It's a play on "spreadsheet" + "instance" = "superinstance". Also implies something bigger and more powerful than a regular spreadsheet.

### Why "Claw"?

Claw is a minimal cellular agent with an ML model. The name suggests something that can grab and manipulate data.

### Why "Seed"?

A seed is a machine-learnable behavior definition. You plant the seed (natural language description), train it on data, and get a specialized agent.

### What's the "FPS paradigm"?

FPS = First-Person Shooter. In traditional agent systems, all agents see everything (RTS - Real-Time Strategy). In SuperInstance, each agent has a unique position/orientation and only sees relevant data (like players in an FPS game).

This enables:
- O(log n) spatial queries
- Information filtering by perspective
- Natural compartmentalization
- Better scalability

Learn more in the [constrainttheory](https://github.com/SuperInstance/constrainttheory) repo.

---

**Still have questions? Open an issue on GitHub!**
