# SuperInstance MVP - Quick Start Guide

**Last Updated:** March 18, 2026
**Version:** 1.0.0-mvp
**Time to Get Started:** 5-10 minutes

---

## What Can You Do Right Now?

This Quick Start focuses on **what actually works** in the MVP. We have three components ready to use:

### ✅ Working Components

1. **constrainttheory** - Interactive geometric constraint visualizations
2. **dodecet-encoder** - 12-bit encoding library for Rust/WASM/JS
3. **spreadsheet-moment** - Agentic spreadsheet platform (with limitations)

### ❌ Not Ready Yet

4. **claw** - Agent execution engine (in development, skip for now)

---

## Option 1: Try constrainttheory (Easiest - No Installation)

### Live Demo (2 minutes)

Visit the interactive demo: **https://constraint-theory.superinstance.ai**

**What you'll see:**
- Pythagorean manifold visualizer
- Dodecet encoding demo
- Calculus operations
- ML embedding examples

**What you'll learn:**
- How geometric constraints enable deterministic computation
- FPS-style perspective for agents
- O(log n) spatial queries

---

## Option 2: Use dodecet-encoder (Easy - Rust/npm)

### Installation (2 minutes)

**For Rust projects:**

```bash
# Add to Cargo.toml
cargo add dodecet-encoder

# Or clone and test locally
git clone https://github.com/SuperInstance/dodecet-encoder.git
cd dodecet-encoder
cargo test --release
```

**For JavaScript/TypeScript projects:**

```bash
# npm package (coming soon to npm)
npm install dodecet-encoder

# Or clone and build WASM
git clone https://github.com/SuperInstance/dodecet-encoder.git
cd dodecet-encoder/wasm
npm install
npm run build
```

### Basic Usage (3 minutes)

**Rust Example:**

```rust
use dodecet_encoder::{Dodecet, geometric::Point3D};

fn main() {
    // Create a 12-bit dodecet
    let d = Dodecet::from_hex(0xABC);
    println!("Hex: {}", d.to_hex_string());  // "ABC"
    println!("Decimal: {}", d.value());       // 2748

    // 3D geometry (6 bytes vs 24 bytes for f64)
    let point = Point3D::new(0x100, 0x200, 0x300);
    let origin = Point3D::new(0, 0, 0);
    let distance = point.distance_to(&origin);
    println!("Distance: {}", distance);

    // Normalized 0.0-1.0
    let normalized: f64 = d.normalize();
    println!("Normalized: {}", normalized);  // 0.6708...

    // Signed -2048 to 2047
    let signed: i16 = d.as_signed();
    println!("Signed: {}", signed);  // 700
}
```

**JavaScript/WASM Example:**

```javascript
import { Dodecet, Point3D } from 'dodecet-encoder';

// Create a dodecet
const d = new Dodecet(0xABC);
console.log('Hex:', d.toHexString());  // "ABC"
console.log('Decimal:', d.value());    // 2748

// 3D geometry
const point = new Point3D(0x100, 0x200, 0x300);
const origin = new Point3D(0, 0, 0);
const distance = point.distanceTo(origin);
console.log('Distance:', distance);
```

### Run Examples (1 minute)

```bash
cd dodecet-encoder

# Rust examples
cargo run --example basic_usage
cargo run --example geometric_shapes
cargo run --example hex_editor

# See all examples
cargo run --example
```

---

## Option 3: Explore spreadsheet-moment (Moderate - TypeScript/Node)

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git

### Installation (3 minutes)

```bash
# Clone the repository
git clone https://github.com/SuperInstance/spreadsheet-moment.git
cd spreadsheet-moment

# Install dependencies
pnpm install

# Build packages
pnpm build

# Start development server
pnpm dev
```

**Note:** This will take 3-5 minutes on first run due to dependencies.

### Open the Spreadsheet (1 minute)

1. Open your browser to **http://localhost:3000**
2. You'll see the Univer spreadsheet interface
3. Try the agent formula examples (if available)

### What Works Right Now

- ✅ Spreadsheet interface loads
- ✅ StateManager tracks agent state
- ✅ TraceProtocol records operations
- ✅ ClawClient communicates with API
- ✅ React UI components render

### What Doesn't Work Yet

- ❌ Live agent execution (claw-core not ready)
- ❌ CLAW_NEW formulas (needs claw backend)
- ❌ Real-time agent updates

**Current Status:** This is a **frontend framework** waiting for the claw backend. Use it to:
- Learn the architecture
- Experiment with the UI
- Build prototypes
- Contribute to development

---

## Option 4: Clone and Explore All Repositories (Advanced)

### Clone Everything (2 minutes)

```bash
# Create workspace directory
mkdir superinstance-mvp
cd superinstance-mvp

# Clone all repositories
git clone https://github.com/SuperInstance/constrainttheory.git
git clone https://github.com/SuperInstance/dodecet-encoder.git
git clone https://github.com/SuperInstance/spreadsheet-moment.git
git clone https://github.com/SuperInstance/claw.git
git clone https://github.com/SuperInstance/SuperInstance-papers.git
```

### Test What Works (5 minutes)

```bash
# Test constrainttheory (should pass all 174 tests)
cd constrainttheory
cargo test --release

# Test dodecet-encoder (should pass all 170 tests)
cd ../dodecet-encoder
cargo test --release

# Test spreadsheet-moment (should pass ~90% of tests)
cd ../spreadsheet-moment
pnpm test

# Skip claw for now (doesn't compile yet)
# cd ../claw
# cargo test  # This will fail - 56 compilation errors
```

---

## Common Issues

### Issue: "pnpm: command not found"

**Solution:**

```bash
# Install pnpm
npm install -g pnpm

# Or use npm instead
npm install
npm run dev
```

### Issue: "cargo: command not found"

**Solution:**

```bash
# Install Rust from https://rustup.rs/
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Issue: spreadsheet-moment tests fail

**Expected behavior:** ~30 tests fail (known issues)

**Solution:** Focus on what works:
- StateManager tests (25/25 passing)
- TraceProtocol tests (20/20 passing)
- ClawClient tests (18/18 passing)

### Issue: claw doesn't compile

**Expected behavior:** 56 compilation errors (known issue)

**Solution:** Skip claw for now, it's in active development

---

## Next Steps

### Learn More

1. **Read the research papers:**
   ```bash
   cd SuperInstance-papers
   ls *.pdf
   ```

2. **Explore the documentation:**
   - constrainttheory: [MATHEMATICAL_FOUNDATIONS_DEEP_DIVE.md](constrainttheory/docs/MATHEMATICAL_FOUNDATIONS_DEEP_DIVE.md)
   - dodecet-encoder: [README.md](dodecet-encoder/README.md)
   - spreadsheet-moment: [ARCHITECTURE.md](spreadsheet-moment/docs/ARCHITECTURE.md)

3. **Try the examples:**
   ```bash
   # dodecet-encoder examples
   cd dodecet-encoder
   cargo run --example basic_usage

   # constrainttheory web demo (local)
   cd constrainttheory/web-simulator
   npm install
   npm run dev
   ```

### Contribute

We welcome contributions! Areas of particular interest:

- **constrainttheory:** 3D rigidity, n-dimensional generalization
- **dodecet-encoder:** Additional geometric operations, optimizations
- **spreadsheet-moment:** Fix failing tests, improve documentation
- **claw:** Fix compilation errors (if you're a Rust expert!)

See [CONTRIBUTING.md](CONTRIBUTING.md) in each repository for guidelines.

---

## Summary

| Component | Installation Time | Works? | Recommended For |
|-----------|------------------|--------|-----------------|
| **constrainttheory demo** | 0 min (web) | ✅ Yes | Learning, exploration |
| **dodecet-encoder** | 2 min | ✅ Yes | Rust/WASM projects |
| **spreadsheet-moment** | 5 min | ⚠️ Partial | Prototyping, learning |
| **claw** | - | ❌ No | Skip for now |

**Recommended Path for Beginners:**
1. Try the constrainttheory live demo (2 min)
2. Install dodecet-encoder and run examples (5 min)
3. Explore spreadsheet-moment if you're interested (10 min)
4. Read the research papers to understand the vision

**Recommended Path for Developers:**
1. Clone all repositories (2 min)
2. Test constrainttheory and dodecet-encoder (5 min)
3. Explore spreadsheet-moment codebase (10 min)
4. Read architecture docs and contribute (ongoing)

---

## Get Help

- **GitHub Issues:** https://github.com/SuperInstance/[repo]/issues
- **GitHub Discussions:** https://github.com/orgs/SuperInstance/discussions
- **Documentation:** See each repository's README and docs folder

---

## What's Next?

This MVP is a **research release**, not a production release. We're actively developing:

1. **Fixing claw-core** - Resolving compilation errors
2. **Completing integration** - Connecting all components
3. **Production hardening** - Security, performance, monitoring

**Timeline:** 2-3 months for functional end-to-end integration

Stay tuned for updates by watching the repositories on GitHub!

---

**Happy exploring!**

**SuperInstance Team**
**March 18, 2026**
**Version: 1.0.0-mvp**
