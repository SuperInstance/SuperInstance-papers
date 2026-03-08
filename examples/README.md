# POLLN Examples

This directory contains example applications demonstrating various POLLN capabilities.

## Available Examples

### 1. Basic Colony
**Location:** `examples/basic-colony/`

A simple demonstration of POLLN's core capabilities:
- Setting up a colony with multiple agents
- Agent-to-agent (A2A) communication
- Plinko stochastic selection for decision making
- Hebbian learning for reinforcement

**Run:**
```bash
cd examples/basic-colony
npm install
npm start
```

**What you'll learn:**
- How to create and manage a colony
- How agents communicate with traceable A2A packages
- How Plinko selection enables adaptive decision making
- Basic agent lifecycle management

### 2. Research Assistant
**Location:** `examples/research-assistant/`

A sophisticated demonstration of advanced POLLN features:
- META tiles for flexible, pluripotent agent differentiation
- World model dreaming for policy optimization
- Multi-step research workflows
- Dynamic agent specialization based on task demands

**Run:**
```bash
cd examples/research-assistant
npm install
npm start
```

**What you'll learn:**
- How META tiles differentiate based on environmental signals
- Attractor dynamics and Thompson sampling
- Dream-based policy optimization with PPO
- Mathematical foundations of pluripotent agents

### 3. Code Reviewer
**Location:** `examples/code-reviewer/`

A demonstration of value network predictions:
- Multiple specialized agents for code review
- TD(λ) value predictions for code quality assessment
- Trajectory tracking for learning from reviews
- Agent coordination through Plinko selection

**Run:**
```bash
cd examples/code-reviewer
npm install
npm start
```

**What you'll learn:**
- How value networks predict long-term outcomes
- TD(λ) learning with eligibility traces
- Trajectory-based learning
- Specialized agent coordination

### 4. KV-Cache Demo
**Location:** `examples/kv-cache-demo/`

A demonstration of KV-cache optimization:
- Anchor-based KV-cache compression and reuse
- Similarity matching for cache hits
- Offset prediction for accurate reconstruction
- Performance comparisons

**Run:**
```bash
cd examples/kv-cache-demo
npm install
npm start
```

**What you'll learn:**
- How anchor-based compression works
- Similarity matching with embeddings
- Offset prediction for cache reuse
- Performance optimization techniques

## Common Commands

### Install Dependencies
Each example has its own dependencies. Install them before running:
```bash
cd examples/[example-name]
npm install
```

### Run an Example
```bash
cd examples/[example-name]
npm start
```

### Development Mode
Watch for changes and auto-restart:
```bash
cd examples/[example-name]
npm run dev
```

### Build
Compile TypeScript to JavaScript:
```bash
cd examples/[example-name]
npm run build
```

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn package manager
- TypeScript (included in devDependencies)

## Architecture Overview

All examples follow a similar structure:

```
examples/
├── basic-colony/
│   ├── README.md          # Example documentation
│   ├── config.ts          # Configuration options
│   ├── agents.ts          # Agent implementations
│   ├── index.ts           # Entry point
│   └── package.json       # Dependencies
├── research-assistant/
│   ├── README.md
│   ├── config.ts
│   ├── index.ts
│   └── package.json
├── code-reviewer/
│   ├── README.md
│   ├── config.ts
│   ├── reviewers.ts       # Specialized review agents
│   ├── index.ts
│   └── package.json
└── kv-cache-demo/
    ├── README.md
    ├── config.ts
    ├── index.ts
    └── package.json
```

## Learning Path

We recommend exploring examples in this order:

1. **Start with Basic Colony** - Learn fundamental concepts
2. **Try Research Assistant** - Explore META tiles and dreaming
3. **Review Code Reviewer** - Understand value networks
4. **Experiment with KV-Cache** - Learn optimization techniques

## Customization

Each example can be customized by editing its `config.ts` file:

- Adjust agent behavior
- Change learning rates
- Modify thresholds and parameters
- Enable/disable features

## Extending Examples

Want to build something new?

1. Copy an example directory as a template
2. Modify the config and agents for your use case
3. Experiment with different POLLN modules

## Getting Help

- Read the main [POLLN README](../../README.md)
- Check the [Architecture Documentation](../../docs/ARCHITECTURE.md)
- Review the [Quick Reference](../../docs/research/QUICK_REFERENCE.md)

## Contributing

Have an idea for a new example? We'd love to see it!

1. Create a new directory under `examples/`
2. Follow the existing structure
3. Add comprehensive documentation
4. Include configuration options
5. Submit a pull request

## License

MIT License - See [LICENSE](../../LICENSE) for details.
