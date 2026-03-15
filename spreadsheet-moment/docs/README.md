# SpreadsheetMoment Documentation

Welcome to the SpreadsheetMoment documentation. This guide will help you get started with living spreadsheets powered by intelligent agents.

## 🚀 Quick Links

- **[Getting Started](GETTING_STARTED.md)** — Setup and basic usage
- **[Architecture](ARCHITECTURE.md)** — System design and components
- **[Cell Agent API](CELL_AGENT_API.md)** — Complete API reference
- **[I/O Connections](IO_CONNECTIONS.md)** — External integrations
- **[OpenCLAW Integration](OPENCLAW_INTEGRATION.md)** — NLP system integration

## 📚 Documentation Structure

### Core Guides

- **Getting Started** — Install SpreadsheetMoment and create your first agent cell
- **Architecture** — Understand how SpreadsheetMoment works under the hood
- **Cell Agent API** — Complete API reference for cell agents
- **I/O Connections** — Connect cells to hardware, APIs, and databases

### Advanced Topics

- **OpenCLAW Integration** — Integrate with OpenCLAW NLP system
- **Deployment** — Deploy to Cloudflare Workers, Docker, or desktop
- **Performance** — Optimize your spreadsheets for speed and efficiency

### Educational Content

- **[Educational](educational/)** — Introduction slides and tutorials
- **[Technical](technical/)** — Deep-dive technical documentation
- **[General](general/)** — Overview and concepts for non-technical users

## 🎯 Getting Started

### 1. Installation

```bash
npm install @spreadsheet-moment/core
```

### 2. Create Your First Agent Cell

```typescript
import { SuperInstance } from '@spreadsheet-moment/core';

const cell = SuperInstance.create({
  type: 'sensor',
  behavior: 'monitor',
  connections: ['arduino://A0']
});
```

### 3. Connect to Hardware

```typescript
cell.connect('arduino', { pin: 'A0', mode: 'input' });
```

### 4. Watch Your Cell Come Alive

```typescript
cell.on('update', (data) => {
  console.log('Sensor reading:', data);
});
```

## 🌐 Live Resources

- **Website:** https://spreadsheet-moment.pages.dev
- **Custom Domain:** https://spreadsheet.superinstance.ai
- **GitHub:** https://github.com/SuperInstance/spreadsheet-moment
- **Issues:** https://github.com/SuperInstance/spreadsheet-moment/issues
- **Discussions:** https://github.com/SuperInstance/spreadsheet-moment/discussions

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## 📞 Getting Help

- **Documentation:** Start here!
- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Questions and ideas
- **Email:** support@superinstance.ai

---

**From ancient cells to living spreadsheets — the next evolution of data.**

*Powered by SuperInstance — Distributed intelligence for everyone.*
