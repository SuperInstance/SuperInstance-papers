# SuperInstance MVP Documentation

**Complete documentation for the SuperInstance Minimal Working MVP**

---

## Welcome!

SuperInstance is a system for running **cellular agents** (called "claws") inside spreadsheet cells. This documentation will help you get started, understand the system, and contribute to its development.

---

## Quick Links

- 📖 **[Getting Started Guide](./GETTING_STARTED.md)** - New? Start here!
- 🔧 **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- 📚 **[Tutorial](./TUTORIAL.md)** - Hands-on tutorial
- 🏗️ **[Architecture](./MVP_ARCHITECTURE.md)** - How it works
- ❓ **[FAQ](./FAQ.md)** - Common questions
- 🤝 **[Contributing](./CONTRIBUTING.md)** - How to contribute

---

## Quick Start (3 Minutes)

### 1. Install & Start (2 minutes)

```bash
git clone https://github.com/SuperInstance/minimal-claw-server.git
cd minimal-claw-server
npm install
npm start
```

### 2. Create an Agent (1 minute)

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

### 3. Trigger the Agent (30 seconds)

```bash
curl -X POST http://localhost:8080/api/v1/agents/{AGENT_ID}/trigger
```

**That's it!** You've created and triggered your first agent. 🎉

---

## Documentation by Topic

### Getting Started

| Document | Description | Time |
|----------|-------------|------|
| [Getting Started Guide](./GETTING_STARTED.md) | Installation, first agent, basic usage | 10 min |
| [Tutorial](./TUTORIAL.md) | Build a complete multi-agent system | 30 min |
| [FAQ](./FAQ.md) | Common questions and answers | 5 min |

### Reference

| Document | Description |
|----------|-------------|
| [API Reference](./API_REFERENCE.md) | Complete API documentation |
| [Architecture](./MVP_ARCHITECTURE.md) | System architecture and design |
| [Glossary](#glossary) | Terms and definitions |

### Development

| Document | Description |
|----------|-------------|
| [Contributing Guide](./CONTRIBUTING.md) | How to contribute |
| [Code of Conduct](./CONTRIBUTING.md#code-of-conduct) | Community guidelines |
| [Development Workflow](./CONTRIBUTING.md#development-workflow) | How we work |

---

## What is SuperInstance?

SuperInstance puts **AI agents inside spreadsheet cells**. Each agent can:
- Watch for changes
- Think about what to do
- Take action automatically
- Coordinate with other agents

### Key Concepts

**Agent (Claw)**
A minimal cellular agent with an ML model that can reason, learn, and adapt.

**Equipment**
Modular capabilities (MEMORY, REASONING, etc.) that can be equipped/unequipped.

**Trigger**
Determines when an agent activates (manual, data, periodic, event).

**Cell**
A single cell in a spreadsheet where an agent can live.

---

## Examples

### Basic Agent

```javascript
// Create an agent
const agent = await createAgent({
  model: 'deepseek-chat',
  seed: 'Monitor temperature and alert if > 100°C',
  equipment: ['MEMORY', 'REASONING'],
  trigger: { type: 'data', source: 'sensor_1' },
  cellId: { sheetId: 'sheet1', row: 0, col: 0 }
});

// Trigger the agent
await triggerAgent(agent.id, { temperature: 105 });
```

### Real-Time Monitoring

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE',
    agentId: agent.id
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Agent update:', message);
};
```

---

## Glossary

### Agent States

- **IDLE** - Agent is waiting for a trigger
- **THINKING** - Agent is processing data
- **ACTING** - Agent is taking action
- **EQUIPPING** - Agent is adding equipment
- **UNEQUIPPING** - Agent is removing equipment
- **ERROR** - Agent encountered an error

### Equipment Slots

- **MEMORY** - State persistence
- **REASONING** - Decision making
- **CONSENSUS** - Multi-agent agreement
- **SPREADSHEET** - Cell integration
- **DISTILLATION** - Model compression
- **COORDINATION** - Multi-agent orchestration

### Trigger Types

- **manual** - Only triggers when explicitly called
- **data** - Triggers when data changes
- **periodic** - Triggers on a schedule
- **event** - Triggers when a specific event occurs

---

## Project Status

### Current Phase: MVP (Round 8) ✅

**Completed**:
- ✅ Minimal CLAW server
- ✅ REST API
- ✅ WebSocket support
- ✅ Agent state management
- ✅ Equipment system
- ✅ Trigger system
- ✅ Cell integration
- ✅ Interactive demo
- ✅ Comprehensive documentation

**Limitations** (Honest Assessment):
- ❌ No real AI integration (just simulation)
- ❌ No persistence (data lost on restart)
- ❌ No authentication or security
- ❌ No actual spreadsheet integration

### Roadmap

| Round | Focus | Status |
|-------|-------|--------|
| 8 | MVP | ✅ Complete |
| 9 | Real AI Integration | 📋 Planned |
| 10 | Spreadsheet Integration | 📋 Planned |
| 11 | Persistence & Security | 📋 Planned |
| 12 | Advanced Features | 📋 Planned |
| 13+ | Production Hardening | 📋 Planned |

---

## Repositories

### Core Repositories

- **[minimal-claw-server](https://github.com/SuperInstance/minimal-claw-server)** - Core API server
- **[spreadsheet-claw-integration](https://github.com/SuperInstance/spreadsheet-claw-integration)** - Integration library
- **[spreadsheet-moment](https://github.com/SuperInstance/spreadsheet-moment)** - Spreadsheet platform
- **[claw](https://github.com/SuperInstance/claw)** - Agent engine

### Related Repositories

- **[constrainttheory](https://github.com/SuperInstance/constrainttheory)** - Geometric substrate
- **[dodecet-encoder](https://github.com/SuperInstance/dodecet-encoder)** - 12-bit encoding
- **[SuperInstance-papers](https://github.com/SuperInstance/SuperInstance-papers)** - Research papers

---

## Support

### Getting Help

- 📖 **Documentation** - You're here!
- ❓ **FAQ** - [Frequently Asked Questions](./FAQ.md)
- 🐛 **Issues** - [Report bugs](https://github.com/SuperInstance/minimal-claw-server/issues)
- 💡 **Discussions** - [Ask questions](https://github.com/SuperInstance/minimal-claw-server/discussions)

### Community

- 🌟 **GitHub** - [Star the repo](https://github.com/SuperInstance/minimal-claw-server)
- 👀 **Watch** - Get updates
- 🍴 **Fork** - Contribute

---

## License

MIT License - see [LICENSE](https://github.com/SuperInstance/minimal-claw-server/blob/main/LICENSE) file for details.

---

## Next Steps

**New here?** Start with the [Getting Started Guide](./GETTING_STARTED.md).

**Want to learn more?** Check out the [Tutorial](./TUTORIAL.md).

**Ready to contribute?** Read the [Contributing Guide](./CONTRIBUTING.md).

**Just want to explore?** See the [API Reference](./API_REFERENCE.md).

---

**Happy building! 🚀**
