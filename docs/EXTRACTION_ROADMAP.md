# SuperInstance Extraction Roadmap

**Date:** 2026-03-18
**Agent:** Round 1 - Repository Analysis and Modularization Planning
**Status:** Draft - Step-by-Step Extraction Plan

---

## Executive Summary

This document provides a **detailed, step-by-step extraction roadmap** to modularize the SuperInstance ecosystem from 4 bloated repositories into 7 focused repositories (3 core + 2 supporting + 2 extension).

**Timeline:** 4 weeks
**Risk:** Medium (mitigated by comprehensive testing)
**Impact:** 30% code reduction, clearer architecture, working MVP

---

## Extraction Phases Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTRACTION TIMELINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Week 1: CORE CLEANUP                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ constraint-  │  │    claw/    │  │ spreadsheet-│            │
│  │ theory/     │  │             │  │ moment/     │            │
│  │             │  │             │  │             │            │
│  │ • Remove    │  │ • Remove    │  │ • Remove    │            │
│  │   bloat     │  │   extensions│  │   hardware  │            │
│  │ • Clean docs│  │ • Clean docs│  │ • Fix tests │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                   │
│  Week 2: EXTENSION CREATION                                       │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │ claw-       │  │ constraint- │                               │
│  │ extensions/ │  │ theory-ml-  │                               │
│  │ (NEW)       │  │ demo/ (NEW) │                               │
│  │             │  │             │                               │
│  │ • Create    │  │ • Create    │                               │
│  │   repo      │  │   repo      │                               │
│  │ • Extract   │  │ • Extract   │                               │
│  │   advanced  │  │   ML demos  │                               │
│  │   features  │  │             │                               │
│  └─────────────┘  └─────────────┘                               │
│                                                                   │
│  Week 3: INTEGRATION TESTING                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Integration Test Suite                      │    │
│  │                                                          │    │
│  │  • Test claw without extensions                          │    │
│  │  • Test constrainttheory without ML demos                │    │
│  │  • Test spreadsheet-moment without AI plugins            │    │
│  │  • Verify all APIs still work                           │    │
│  │  • Performance benchmarks                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Week 4: DOCUMENTATION & POLISH                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Documentation Update                        │    │
│  │                                                          │    │
│  │  • Update all READMEs                                    │    │
│  │  • Create integration guides                             │    │
│  │  • Add migration notes                                   │    │
│  │  • Final polish                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Week 1: Core Cleanup

### Day 1-2: constrainttheory/ Cleanup

#### Step 1.1: Audit Current Structure
```bash
cd /c/Users/casey/polln/constrainttheory

# List all files
find . -type f -name "*.md" | grep -E "(SUMMARY|PLAN|ROUND|PHASE)" > /tmp/ct_docs.txt

# Count files by type
find . -type f -name "*.pdf" | wc -l  # Research PDFs
find . -type f -name "*.rs" | wc -l   # Rust files
find experiments/ -type f 2>/dev/null | wc -l  # Experiment files
```

**Expected Output:**
- PDFs: ~10 files (move to SuperInstance-papers)
- Summary docs: ~15 files (consolidate to 1-2)
- Experiment files: 0 (empty directory)

#### Step 1.2: Remove Empty Directories
```bash
# Remove empty experiments directory
rmdir experiments/ 2>/dev/null || echo "Not empty or doesn't exist"

# Verify removal
ls -la | grep experiments
```

#### Step 1.3: Move Research PDFs
```bash
# Create directory in SuperInstance-papers
mkdir -p ../SuperInstance-papers/constrainttheory-research

# Move all PDFs
find . -maxdepth 1 -type f -name "*.pdf" -exec mv {} ../SuperInstance-papers/constrainttheory-research/ \;

# Verify move
ls ../SuperInstance-papers/constrainttheory-research/
```

#### Step 1.4: Consolidate Documentation
```bash
# Create archive for historical docs
mkdir -p .archive/historical-docs

# Move round/phase summaries
find . -maxdepth 1 -type f \( -name "*ROUND*.md" -o -name "*PHASE*.md" -o -name "*SUMMARY*.md" \) -exec mv {} .archive/historical-docs/ \;

# Keep only essential docs
# KEEP: README.md, DISCLAIMER.md, QUICK_START.md, API.md
```

#### Step 1.5: Clean tools/ Directory
```bash
# Audit tools/
cd tools/
ls -la

# Identify: utilities vs demos
# KEEP: utilities, scripts
# REMOVE: demos, visualizations (move to constrainttheory-ml-demo)

cd ..
```

#### Step 1.6: Update constrainttheory README
```markdown
# Constraint Theory

## Recent Changes (2026-03-18)
- Removed research PDFs (moved to SuperInstance-papers)
- Consolidated documentation
- Removed empty directories
- Focused on core geometric engine

## Quick Start
[Installation instructions]
```

**Verification:**
```bash
# Run tests
cargo test

# Verify compilation
cargo build --release

# Check LOC
find crates/constraint-theory-core/src -name "*.rs" -exec wc -l {} + | tail -1
# Target: <2,500 LOC (was 2,244)
```

---

### Day 3-4: claw/ Cleanup

#### Step 1.7: Audit Extensions Directory
```bash
cd /c/Users/casey/polln/claw

# List all extensions
ls -la extensions/

# Count extensions
ls extensions/ | wc -l  # Should be 15+

# Identify: claw-related vs openclaw-related
# claw-related: memory-core (maybe)
# openclaw-related: anthropic, openai, discord, etc.
```

#### Step 1.8: Remove extensions/ Directory
```bash
# BACKUP FIRST (just in case)
# mv extensions/ extensions.backup/

# Remove extensions directory
rm -rf extensions/

# Verify removal
ls -la | grep extensions
```

**CRITICAL:** Verify no core claw code depends on extensions
```bash
# Check for imports
grep -r "extensions/" core/src/
# Should return nothing

# Check for extension dependencies
grep -r "anthropic\|openai\|discord" core/src/
# Should return nothing
```

#### Step 1.9: Remove Wrong AGENTS.md
```bash
# Check if AGENTS.md belongs to openclaw
head -20 AGENTS.md

# If it mentions openclaw, remove it
rm AGENTS.md

# Verify removal
ls AGENTS.md
```

#### Step 1.10: Clean Historical Documentation
```bash
# Create archive
mkdir -p .archive/historical-docs

# Move historical summaries
find . -maxdepth 1 -type f \( -name "*SUMMARY*.md" -o -name "*BUILD*.md" -o -name "*FIX*.md" \) -exec mv {} .archive/historical-docs/ \;

# Keep only essential docs
# KEEP: README.md, DISCLAIMERS.md, ONBOARDING.md, API.md
```

#### Step 1.11: Update claw README
```markdown
# Claw - Cellular Agent Engine

## Recent Changes (2026-03-18)
- Removed extensions directory (15+ unrelated openclaw extensions)
- Removed incorrect AGENTS.md
- Focused on core agent engine
- Production authentication system complete

## Quick Start
[Installation instructions]
```

**Verification:**
```bash
# Run tests
cd core
cargo test

# Verify compilation
cargo build --release

# Check LOC
find src -name "*.rs" -exec wc -l {} + | tail -1
# Target: <12,000 LOC (was 15,686)
```

---

### Day 5: spreadsheet-moment/ Cleanup

#### Step 1.12: Audit Current Structure
```bash
cd /c/Users/casey/polln/spreadsheet-moment

# List all documentation
find . -maxdepth 1 -type f -name "*.md" > /tmp/sm_docs.txt

# Count tests
find tests -name "*.test.ts" -o -name "*.spec.ts" | wc -l

# Check package structure
ls -la packages/
```

#### Step 1.13: Remove hardware-marketplace/
```bash
# Verify it's unrelated
ls hardware-marketplace/

# Remove directory
rm -rf hardware-marketplace/

# Verify removal
ls -la | grep hardware
```

#### Step 1.14: Fix Failing Tests
```bash
# Run tests
pnpm test

# Identify failures
pnpm test 2>&1 | grep "FAIL" > /tmp/test_failures.txt

# Fix high-priority failures
# Priority 1: API key validation
# Priority 2: Test infrastructure
# Priority 3: WebSocket timing

# Target: 95%+ passing (256/268)
```

#### Step 1.15: Clean Historical Documentation
```bash
# Create archive
mkdir -p .archive/historical-docs

# Move historical docs
find . -maxdepth 1 -type f \( -name "*PHASE*.md" -o -name "*WEEK*.md" -o -name "*ROUND*.md" \) -exec mv {} .archive/historical-docs/ \;

# Keep essential docs
# KEEP: README.md, DISCLAIMERS.md, BENCHMARKS.md
```

#### Step 1.16: Update spreadsheet-moment README
```markdown
# Spreadsheet Moment

## Recent Changes (2026-03-18)
- Removed hardware-marketplace (unrelated feature)
- Fixed failing tests (target: 95%+ passing)
- Focused on core Univer + agent integration
- Cleaned up documentation

## Quick Start
[Installation instructions]
```

**Verification:**
```bash
# Run tests
pnpm test

# Verify compilation
pnpm build

# Check passing rate
# Target: 95%+ (256/268 tests)
```

---

## Week 2: Extension Creation

### Day 6-7: Create claw-extensions Repository

#### Step 2.1: Create New Repository
```bash
cd /c/Users/casey/polln

# Create directory
mkdir claw-extensions
cd claw-extensions

# Initialize git
git init

# Create README
cat > README.md << 'EOF'
# Claw Extensions

Advanced equipment, integrations, and examples for the Claw cellular agent engine.

**Status:** Extension repository - Optional features for Claw core

**Repository:** https://github.com/SuperInstance/claw-extensions

## Structure

```
claw-extensions/
├── equipment/          Advanced equipment modules
├── integrations/       LLM and service integrations
├── social/             Advanced coordination patterns
└── examples/           Usage examples
```

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
claw_extensions = "0.1.0"
```

## See Also

- **Claw Core:** https://github.com/SuperInstance/claw
EOF

# Create basic structure
mkdir -p equipment integrations social examples
touch equipment/mod.rs integrations/mod.rs social/mod.rs examples/mod.rs
```

#### Step 2.2: Extract Advanced Equipment
```bash
# From claw/core, extract advanced equipment
cd /c/Users/ccasey/polln/claw/core/src/equipment

# Identify advanced equipment (beyond basic slots)
# KEEP in core: slots.rs, loading.rs
# MOVE to extensions: hierarchical_memory.rs, monitoring.rs

# Copy to extensions (don't move yet - testing first)
cp hierarchical_memory.rs /c/Users/casey/polln/claw-extensions/equipment/
cp monitoring.rs /c/Users/casey/polln/claw-extensions/equipment/
```

#### Step 2.3: Create Extension Integration Templates
```bash
cd /c/Users/casey/polln/claw-extensions/integrations

# Create OpenAI connector template
cat > openai.rs << 'EOF'
// OpenAI integration for Claw agents
// Usage: Add this equipment to enable OpenAI API access

pub struct OpenAIConnector {
    api_key: String,
    model: String,
}

impl OpenAIConnector {
    pub fn new(api_key: String, model: String) -> Self {
        Self { api_key, model }
    }

    pub async fn chat(&self, prompt: &str) -> Result<String, Error> {
        // OpenAI API call
        Ok("response".to_string())
    }
}
EOF

# Create Anthropic connector template
cat > anthropic.rs << 'EOF'
// Anthropic integration for Claw agents
// Similar structure to OpenAI
EOF
```

#### Step 2.4: Create Example Configurations
```bash
cd /c/Users/casey/polln/claw-extensions/examples

# Create advanced equipment example
cat > advanced_equipment.rs << 'EOF'
use claw_extensions::equipment::{HierarchicalMemory, Monitoring};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Use advanced equipment
    let memory = HierarchicalMemory::new();
    let monitoring = Monitoring::new();

    // Configure agent with advanced equipment
    // ...

    Ok(())
}
EOF
```

#### Step 2.5: Create Cargo.toml
```bash
cd /c/Users/ccasey/polln/claw-extensions

cat > Cargo.toml << 'EOF'
[package]
name = "claw-extensions"
version = "0.1.0"
edition = "2021"
description = "Advanced equipment and integrations for Claw agents"

[dependencies]
claw-core = { path = "../claw/core" }
tokio = { version = "1.42", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
EOF
```

---

### Day 8-9: Create constrainttheory-ml-demo Repository

#### Step 2.6: Create New Repository
```bash
cd /c/Users/ccasey/polln

# Create directory
mkdir constrainttheory-ml-demo
cd constrainttheory-ml-demo

# Initialize git
git init

# Create README
cat > README.md << 'EOF'
# ConstraintTheory ML Demos

Machine learning demos, visualizations, and tutorials for ConstraintTheory.

**Status:** Demo repository - Educational examples and visualizations

**Repository:** https://github.com/SuperInstance/constrainttheory-ml-demo

## Demos

- **ML Embeddings:** Real-world ML embedding examples
- **Visualization:** 3D geometric visualizations
- **Tutorials:** Step-by-step ML integration guides

## See Also

- **ConstraintTheory Core:** https://github.com/SuperInstance/constrainttheory
EOF

# Create structure
mkdir -p demos visualizations tutorials
```

#### Step 2.7: Extract ML Demos
```bash
# From constrainttheory, extract ML-related content
cd /c/Users/ccasey/polln/constrainttheory

# Find ML-related files
find . -type f -name "*ml*" -o -name "*embedding*" -o -name "*demo*"

# Copy to ML demo repo
# (Don't move yet - testing first)
cp -r tools/ml-demos/* /c/Users/ccasey/polln/constrainttheory-ml-demo/demos/
```

#### Step 2.8: Create Visualization Demos
```bash
cd /c/Users/ccasey/polln/constrainttheory-ml-demo/visualizations

# Create 3D visualization demo
cat > 3d_visualizer.py << 'EOF'
#!/usr/bin/env python3
"""
3D Visualization of ConstraintTheory geometric operations
"""

import plotly.graph_objects as go
from constrainttheory import Dodecet, Manifold

def visualize_manifold(manifold: Manifold):
    """Visualize 3D manifold"""
    fig = go.Figure(data=[go.Scatter3d(
        x=manifold.x_coords(),
        y=manifold.y_coords(),
        z=manifold.z_coords(),
        mode='markers'
    )])

    fig.show()

if __name__ == "__main__":
    # Create and visualize manifold
    manifold = Manifold::new(200)
    visualize_manifold(manifold)
EOF
chmod +x 3d_visualizer.py
```

#### Step 2.9: Create Tutorial
```bash
cd /c/Users/ccasey/polln/constrainttheory-ml-demo/tutorials

cat > ML_INTEGRATION.md << 'EOF'
# ML Integration Tutorial

## Using ConstraintTheory with ML Embeddings

### Step 1: Install Dependencies
\`\`\`bash
pip install constrainttheory numpy scikit-learn
\`\`\`

### Step 2: Encode ML Embeddings as Dodecets
\`\`\`python
from constrainttheory import Dodecet
import numpy as np

# Assume we have a 3D embedding
embedding = np.array([1.5, 2.3, 0.8])

# Encode as dodecet
dodecet = Dodecet.from_coords(embedding[0], embedding[1], embedding[2])
\`\`\`

### Step 3: Query Similar Embeddings
\`\`\`python
# Build KD-tree from embeddings
tree = KDTree()
for emb in embeddings:
    tree.insert(emb.id, Dodecet.from_coords(*emb))

# Find similar embeddings
similar = tree.query(center=dodecet, radius=10)
\`\`\`
EOF
```

---

## Week 3: Integration Testing

### Day 10-12: Core Testing

#### Step 3.1: Test claw Without Extensions
```bash
cd /c/Users/ccasey/polln/claw/core

# Run full test suite
cargo test --all

# Verify all tests pass
# Expected: 163/163 passing

# Test core functionality
cargo test --test agent_lifecycle
cargo test --test equipment_system
cargo test --test social_coordination

# Performance benchmarks
cargo test --release -- --nocapture benchmark
```

#### Step 3.2: Test constrainttheory Without ML Demos
```bash
cd /c/Users/ccasey/polln/constrainttheory

# Run full test suite
cargo test --all

# Verify all tests pass
# Expected: 68/68 passing

# Test core functionality
cargo test --test geometric_encoding
cargo test --test spatial_queries
cargo test --test manifold_operations

# Performance benchmarks
cargo test --release -- --nocapture benchmark
```

#### Step 3.3: Test spreadsheet-moment Without AI Plugins
```bash
cd /c/Users/ccasey/polln/spreadsheet-moment

# Run test suite
pnpm test

# Verify passing rate
# Target: 95%+ (256/268 tests)

# Test core functionality
pnpm test agent-core
pnpm test agent-ui

# Integration tests
pnpm test:integration
```

#### Step 3.4: Cross-Repository Integration Tests
```bash
# Test claw + constrainttheory integration
cd /c/Users/ccasey/polln

# Create integration test
mkdir -p integration-tests
cat > integration-tests/claw_constrainttheory.rs << 'EOF'
use claw_core::{ClawCore, AgentConfig};
use constraint_theory_core::{KDTree, Dodecet};

#[tokio::test]
async fn test_agent_with_spatial_queries() {
    // Create claw agent
    let mut core = ClawCore::new();

    // Create agent with geometric position
    let config = AgentConfig {
        id: "geo-agent".to_string(),
        position: Some(Dodecet::from_coords(1.0, 2.0, 3.0)),
        // ...
    };

    core.add_agent(config).await.unwrap();

    // Query spatial neighbors
    let tree = KDTree::new();
    tree.insert("geo-agent".to_string(), Dodecet::from_coords(1.0, 2.0, 3.0));

    let neighbors = tree.query(/* ... */);

    assert!(!neighbors.is_empty());
}
EOF

# Run integration test
cargo test --test integration_tests
```

#### Step 3.5: Performance Validation
```bash
# Benchmark claw agent operations
cd /c/Users/ccasey/polln/claw/core
cargo bench --bench agent_operations

# Benchmark constrainttheory spatial queries
cd /c/Users/ccasey/polln/constrainttheory
cargo bench --bench spatial_queries

# Verify targets:
# - Agent creation: <10ms
# - Trigger response: <100ms
# - Spatial query: <100μs
```

---

### Day 13-14: Extension Testing

#### Step 3.6: Test claw-extensions
```bash
cd /c/Users/ccasey/polln/claw-extensions

# Build extensions
cargo build

# Test equipment
cargo test --test hierarchical_memory
cargo test --test monitoring

# Test integrations
cargo test --test openai_connector
cargo test --test anthropic_connector
```

#### Step 3.7: Test constrainttheory-ml-demo
```bash
cd /c/Users/ccasey/polln/constrainttheory-ml-demo

# Run ML demos
cd demos
python ml_embedding_demo.py

# Run visualizations
cd ../visualizations
python 3d_visualizer.py

# Verify all demos work
```

---

## Week 4: Documentation & Polish

### Day 15-16: Update READMEs

#### Step 4.1: Update constrainttheory README
```bash
cd /c/Users/ccasey/polln/constrainttheory

cat > README.md << 'EOF'
# Constraint Theory

**Geometric substrate for cellularized agent infrastructure**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]
[![Tests](https://img.shields.io/badge/tests-68%20passing-success)]
[![docs](https://img.shields.io/badge/docs-rigorous-blue)]

**Live Demo:** https://constraint-theory.superinstance.ai

## What is Constraint Theory?

Constraint Theory provides a geometric substrate for cellular agents:

- **12-bit geometric encoding** via dodecet-encoder
- **Spatial queries** via KD-tree index (O(log n) complexity)
- **Manifold operations** for constraint solving
- **Deterministic computation** via geometric constraints

## Quick Start

### Installation

\`\`\`bash
cargo add constraint-theory-core
\`\`\`

### Basic Usage

\`\`\`rust
use constraint_theory_core::{Dodecet, KDTree};

// Encode position as dodecet
let position = Dodecet::from_coords(1.5, 2.3, 0.8);

// Build spatial index
let mut tree = KDTree::new();
tree.insert("agent-1".to_string(), position);

// Query neighbors
let neighbors = tree.query(/* ... */);
\`\`\`

## Architecture

- **Core:** Geometric encoding, spatial queries, manifold operations
- **WASM:** Browser bindings for web applications
- **Integration:** Works with dodecet-encoder for 12-bit encoding

## Performance

- Spatial query: <100μs for 10k agents
- Memory usage: O(n) for n agents
- Complexity: O(log n) for queries

## See Also

- **Dodecet Encoder:** https://github.com/SuperInstance/dodecet-encoder
- **ML Demos:** https://github.com/SuperInstance/constrainttheory-ml-demo
- **Research Papers:** https://github.com/SuperInstance/SuperInstance-papers

## License

MIT
EOF
```

#### Step 4.2: Update claw README
```bash
cd /c/Users/ccasey/polln/claw

cat > README.md << 'EOF'
# Claw - Minimal Cellular Agent Engine

**A Rust-based cellular agent engine for spreadsheet integration**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]
[![Tests](https://img.shields.io/badge/tests-163%20passing-success)]
[![Rust](https://img.shields.io/badge/rust-1.85%2B-orange)]

**Repository:** https://github.com/SuperInstance/claw
**Status:** Production-ready with authentication

## What is Claw?

Claw enables spreadsheet cells to host intelligent, autonomous agents:

- **Agent lifecycle:** Create, start, stop agents
- **Equipment system:** Dynamic module loading
- **Social coordination:** Master-slave, co-worker patterns
- **REST + WebSocket APIs:** Real-time communication

## Quick Start

### Installation

\`\`\`bash
cargo add claw-core
\`\`\`

### Basic Usage

\`\`\`rust
use claw_core::{ClawCore, AgentConfig, EquipmentSlot};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut core = ClawCore::new();

    let config = AgentConfig {
        id: "temp-monitor".to_string(),
        model: "deepseek-chat".to_string(),
        equipment: vec![EquipmentSlot::Memory],
        triggers: vec!["cell:B1".to_string()],
    };

    core.add_agent(config).await?;
    core.start().await?;

    Ok(())
}
\`\`\`

## Architecture

- **Core:** Agent lifecycle, equipment slots, social patterns
- **API:** REST + WebSocket servers
- **Auth:** Production authentication (API keys + JWT)

## Performance

- Agent creation: <10ms
- Trigger response: <100ms
- Memory: <10MB per agent

## See Also

- **Extensions:** https://github.com/SuperInstance/claw-extensions
- **Spreadsheet Integration:** https://github.com/SuperInstance/spreadsheet-moment

## License

MIT
EOF
```

#### Step 4.3: Update spreadsheet-moment README
```bash
cd /c/Users/ccasey/polln/spreadsheet-moment

cat > README.md << 'EOF'
# Spreadsheet Moment

**Agentic spreadsheet platform built on Univer**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]
[![Tests](https://img.shields.io/badge/tests-256%20Fpassing-success)]

**Repository:** https://github.com/SuperInstance/spreadsheet-moment
**Status:** Integration with Claw agents

## What is Spreadsheet Moment?

Spreadsheet Moment adds cellular agent hosting to Univer:

- **Agent cells:** Host agents in spreadsheet cells
- **Real-time updates:** WebSocket communication
- **Agent coordination:** Multi-cell collaboration
- **Univer base:** Full spreadsheet functionality

## Quick Start

### Installation

\`\`\`bash
pnpm install @spreadsheet-moment/core
\`\`\`

### Basic Usage

\`\`\`typescript
import { AgentCell, Spreadsheet } from '@spreadsheet-moment/core';

const spreadsheet = new Spreadsheet();
const agentCell = spreadsheet.createAgentCell('A1', {
  agentType: 'temperature-monitor',
  dataSource: 'B1',
  equipment: ['memory', 'reasoning']
});
\`\`\`

## Architecture

- **agent-core:** Core agent platform
- **agent-ui:** UI components for agents
- **Univer integration:** Spreadsheet base

## Performance

- Spreadsheet load: <2s
- Agent cell creation: <100ms
- UI response: <50ms

## See Also

- **Claw Engine:** https://github.com/SuperInstance/claw
- **Univer:** https://github.com/dream-num/univer

## License

MIT
EOF
```

---

### Day 17: Create Integration Guides

#### Step 4.4: Create Claw Integration Guide
```bash
cd /c/Users/ccasey/polln/claw

cat > docs/INTEGRATION_GUIDE.md << 'EOF'
# Claw Integration Guide

## Integrating Claw with Spreadsheet Moment

### Step 1: Install Dependencies

\`\`\`bash
cargo add claw-core
pnpm install @spreadsheet-moment/core
\`\`\`

### Step 2: Start Claw Server

\`\`\`bash
cd claw/core
cargo run --bin server
# Server starts on http://localhost:8080
\`\`\`

### Step 3: Connect from Spreadsheet

\`\`\`typescript
import { ClawClient } from '@spreadsheet-moment/core';

const client = new ClawClient('http://localhost:8080');
await client.connect();

// Create agent
const agent = await client.createAgent({
  id: 'temp-monitor',
  cellRef: 'A1',
  model: 'deepseek-chat'
});
\`\`\`

### Step 4: Monitor Data Changes

\`\`\`typescript
// Subscribe to cell changes
spreadsheet.onCellChange('B1', async (value) => {
  // Agent receives trigger
  await client.triggerAgent('temp-monitor', { value });
});
\`\`\`

## API Reference

### REST API

\`\`\`typescript
// Create agent
POST /api/agents
{
  "id": "temp-monitor",
  "cellRef": "A1",
  "model": "deepseek-chat"
}

// Query state
GET /api/agents/{id}/state

// Execute action
POST /api/agents/{id}/actions
{
  "action": "analyze"
}
\`\`\`

### WebSocket API

\`\`\`typescript
// Connect
const ws = new WebSocket('ws://localhost:8080/ws');

// Subscribe to agent
ws.send(JSON.stringify({
  type: 'subscribe',
  agentId: 'temp-monitor'
}));

// Receive updates
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Agent state:', update.state);
};
\`\`\`
EOF
```

#### Step 4.5: Create ConstraintTheory Integration Guide
```bash
cd /c/Users/ccasey/polln/constrainttheory

cat > docs/INTEGRATION_GUIDE.md << 'EOF'
# ConstraintTheory Integration Guide

## Integrating ConstraintTheory with Claw

### Step 1: Install Dependencies

\`\`\`bash
cargo add constraint-theory-core
cargo add claw-core
cargo add dodecet-encoder
\`\`\`

### Step 2: Add Geometric Positioning to Agents

\`\`\`rust
use claw_core::{AgentConfig, ClawCore};
use constraint_theory_core::{Dodecet, KDTree};
use dodecet_encoder::Dodecet as DodecetEncoder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut core = ClawCore::new();
    let mut tree = KDTree::new();

    // Create agent with geometric position
    let config = AgentConfig {
        id: "geo-agent".to_string(),
        position: Some(Dodecet::from_coords(1.0, 2.0, 3.0)),
        // ...
    };

    let agent_id = core.add_agent(config).await?;

    // Insert into spatial index
    tree.insert(agent_id, Dodecet::from_coords(1.0, 2.0, 3.0));

    Ok(())
}
\`\`\`

### Step 3: Query Spatial Neighbors

\`\`\`rust
use constraint_theory_core::QueryParams;

// Find neighbors within radius
let neighbors = tree.query(QueryParams {
    center: agent_position,
    radius: Dodecet::from_coords(10.0, 10.0, 10.0),
    limit: 10
});

// Coordinate with neighbors
for neighbor_id in neighbors {
    core.send_message(agent_id, neighbor_id, "coordinate").await?;
}
\`\`\`

## Use Cases

### Spatial Filtering

Agents only see neighbors within geometric radius:

\`\`\`rust
// Agent A1 at position (1, 2, 3)
// Agent A2 at position (1.1, 2.1, 3.1)  <- Visible
// Agent A3 at position (100, 200, 300)  <- Not visible

let visible = tree.query(/* radius=10 */);
// Returns: [A2]
\`\`\`

### FPS-Style Perspective

Each agent has unique view based on position:

\`\`\`rust
// Agent A1 perspective
let a1_neighbors = tree.query_from_position(a1_position);

// Agent A2 perspective (different!)
let a2_neighbors = tree.query_from_position(a2_position);
\`\`\`
EOF
```

---

### Day 18-20: Final Polish

#### Step 4.6: Create Migration Notes
```bash
cd /c/Users/ccasey/polln

cat > docs/MIGRATION_NOTES.md << 'EOF'
# Migration Notes - Modularization (2026-03-18)

## What Changed?

### Repositories Restructured

**Before:**
- 4 bloated repositories with lots of extras

**After:**
- 3 focused core repositories
- 2 extension repositories
- 2 supporting repositories

### constrainttheory/

**Removed:**
- Research PDFs (moved to SuperInstance-papers)
- ML demos (moved to constrainttheory-ml-demo)
- Historical documentation (archived)
- Empty experiments/ directory

**Impact:** None - core functionality unchanged

### claw/

**Removed:**
- extensions/ directory (15+ unrelated openclaw extensions)
- Wrong AGENTS.md file
- Historical documentation (archived)

**Impact:** None - core agent engine unchanged

**New:** claw-extensions repository for advanced features

### spreadsheet-moment/

**Removed:**
- hardware-marketplace/ (unrelated feature)
- Historical documentation (archived)

**Impact:** None - core spreadsheet functionality unchanged

**New:** Fixed failing tests (now 95%+ passing)

## Migration Guide

### For constrainttheory Users

**No changes required** - if you're using core functionality:

\`\`\`rust
use constraint_theory_core::{Dodecet, KDTree};
// Still works!
\`\`\`

**If you were using ML demos:**

\`\`\`bash
# Old location
import from constrainttheory.tools.ml_demos

# New location
import from constrainttheory_ml_demo
\`\`\`

### For claw Users

**No changes required** - if you're using core functionality:

\`\`\`rust
use claw_core::{ClawCore, AgentConfig};
// Still works!
\`\`\`

**If you were using extensions:**

\`\`\`bash
# Old location (removed)
use claw::extensions::openai

# New location
use claw_extensions::integrations::openai
\`\`\`

### For spreadsheet-moment Users

**No changes required** - all functionality unchanged:

\`\`\`typescript
import { Spreadsheet } from '@spreadsheet-moment/core';
// Still works!
\`\`\`

## Upgrading Dependencies

### constrainttheory

\`\`\`toml
# No version change needed
[dependencies]
constraint-theory-core = "0.1.0"
\`\`\`

### claw

\`\`\`toml
# No version change needed
[dependencies]
claw-core = "0.1.0"

# If using extensions, add:
claw-extensions = "0.1.0"
\`\`\`

### spreadsheet-moment

\`\`\`json
{
  "dependencies": {
    "@spreadsheet-moment/core": "0.1.0"
  }
}
\`\`\`

## Breaking Changes

**None!** All core APIs remain unchanged.

## Questions?

See:
- [Integration Guides](./INTEGRATION_GUIDES.md)
- [Repository Documentation](../README.md)
- [GitHub Issues](https://github.com/SuperInstance/[repo]/issues)
EOF
```

#### Step 4.7: Final Testing
```bash
# Test all core repos
cd /c/Users/ccasey/polln/constrainttheory && cargo test --all
cd /c/Users/ccasey/polln/claw/core && cargo test --all
cd /c/Users/ccasey/polln/spreadsheet-moment && pnpm test
cd /c/Users/ccasey/polln/dodecet-encoder && cargo test --all

# Test extension repos
cd /c/Users/ccasey/polln/claw-extensions && cargo test --all
cd /c/Users/ccasey/polln/constrainttheory-ml-demo && python demos/test_all.py

# Verify all tests pass
# Expected: All tests passing
```

#### Step 4.8: Create Release Checklist
```bash
cd /c/Users/ccasey/polln

cat > docs/RELEASE_CHECKLIST.md << 'EOF'
# Release Checklist - Modularization Complete

## Pre-Release

- [x] All core repos tested (constrainttheory, claw, spreadsheet-moment, dodecet-encoder)
- [x] All extension repos tested (claw-extensions, constrainttheory-ml-demo)
- [x] All READMEs updated
- [x] Integration guides created
- [x] Migration notes published
- [x] Documentation complete

## Release

- [ ] Tag all repos with `v0.1.0-modular`
- [ ] Push tags to GitHub
- [ ] Create GitHub releases
- [ ] Publish release notes

## Post-Release

- [ ] Monitor for issues
- [ ] Respond to questions
- [ ] Update documentation based on feedback
- [ ] Plan next iteration

## Rollback Plan

If critical issues found:

1. Revert to previous commit
2. Document issues
3. Fix issues
4. Re-test
5. Re-release

## Success Criteria

- [ ] All tests passing
- [ ] Zero critical bugs
- [ ] Performance targets met
- [ ] Documentation clear
- [ ] Community feedback positive
EOF
```

---

## Risk Mitigation

### Backup Strategy

Before any destructive operation:

```bash
# Create backup branch
git checkout -b backup-before-cleanup
git push origin backup-before-cleanup

# Create tag
git tag backup-$(date +%Y%m%d)
git push origin backup-$(date +%Y%m%d)
```

### Rollback Procedure

If extraction fails:

```bash
# Revert to backup
git checkout backup-before-cleanup
git branch -D cleanup-branch

# Start over with lessons learned
```

### Testing Strategy

After each extraction step:

1. Run full test suite
2. Verify compilation
3. Check performance benchmarks
4. Validate integration points

If any fail:
1. Stop extraction
2. Identify issue
3. Fix issue
4. Re-test
5. Continue extraction

---

## Success Metrics

### Code Reduction

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Total LOC | 27,000 | ~19,000 | 30% |
| constrainttheory LOC | 2,244 | ~2,000 | 11% |
| claw LOC | 15,686 | ~11,000 | 30% |
| spreadsheet-moment LOC | ~5,000 | ~4,000 | 20% |
| dodecet-encoder LOC | 4,066 | 4,066 | 0% |

### Repository Clarity

| Metric | Before | After |
|--------|--------|-------|
| Core repos | 4 | 3 |
| Extension repos | 0 | 2 |
| Supporting repos | 2 | 2 |
| Total repos | 6 | 7 |
| Purpose clarity | Low | High |

### Test Coverage

| Repository | Before | After | Target |
|------------|--------|-------|--------|
| constrainttheory | 68/68 | 68/68 | 100% |
| claw | 163/163 | 163/163 | 100% |
| spreadsheet-moment | 192/268 | 256/268 | 95%+ |
| dodecet-encoder | 170/170 | 170/170 | 100% |

---

## Timeline Summary

| Week | Activities | Deliverables |
|------|------------|--------------|
| **Week 1** | Core cleanup | 3 cleaned core repos |
| **Week 2** | Extension creation | 2 new extension repos |
| **Week 3** | Integration testing | All tests passing |
| **Week 4** | Documentation & polish | Ready for release |

---

**Status:** ✅ Extraction Roadmap Complete
**Next:** Execute roadmap (4 weeks)
**Timeline:** Week 1 start immediately
**Impact:** 30% code reduction, clearer architecture
