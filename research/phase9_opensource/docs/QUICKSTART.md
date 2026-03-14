# SuperInstance Quickstart Guide

Get up and running with SuperInstance in under 5 minutes.

## Prerequisites

Before you begin, ensure you have:
- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **Python** >= 3.10 ([Download](https://python.org/))
- **Git** ([Download](https://git-scm.com/))
- **Docker** (optional, for containerized setup)

## Option 1: Automated Setup (Recommended)

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/SuperInstance/SuperInstance-papers.git
cd SuperInstance-papers

# Run automated setup
python research/phase9_opensource/tools/setup_dev_env.py
```

This script will:
- Check all prerequisites
- Install Node.js dependencies
- Install Python dependencies
- Set up development environment
- Configure pre-commit hooks
- Run initial tests

### Verify Installation

```bash
# Run health check
npm run health-check

# Run example simulation
npm run example
```

## Option 2: Manual Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/SuperInstance/SuperInstance-papers.git
cd SuperInstance-papers
```

### Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (for simulations)
cd research/simulations
pip install -r requirements.txt
cd ../..
```

### Step 3: Set Up Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Not required for basic usage
```

### Step 4: Run Tests

```bash
# Run TypeScript tests
npm test

# Run Python simulation tests (optional)
cd research/simulations
python -m pytest tests/
```

## Your First SuperInstance Program

### Hello World (Tile Creation)

Create a file `hello.ts`:

```typescript
import { SuperInstance, Tile, TileType } from '@superinstance/core';

async function main() {
  // Create a SuperInstance instance
  const si = new SuperInstance();

  // Create a compute tile
  const tile = await si.createTile({
    type: TileType.COMPUTE,
    config: {
      cores: 4,
      memory: '4GB'
    }
  });

  console.log(`Created tile: ${tile.id}`);

  // Execute a task
  const result = await tile.execute({
    command: 'echo "Hello from SuperInstance!"'
  });

  console.log(result.output);
  // Output: Hello from SuperInstance!

  // Cleanup
  await si.shutdown();
}

main().catch(console.error);
```

Run it:

```bash
npx ts-node hello.ts
```

### Basic Confidence Cascade

Create a file `cascade.ts`:

```typescript
import { SuperInstance, ConfidenceCascade, Tile } from '@superinstance/core';

async function main() {
  const si = new SuperInstance();

  // Create a network of tiles
  const tiles = await si.createTileNetwork([
    { type: 'compute' },
    { type: 'storage' },
    { type: 'network' }
  ]);

  // Create confidence cascade
  const cascade = new ConfidenceCascade({
    tiles,
    threshold: 0.8,
    iterations: 100
  });

  // Propagate confidence
  await cascade.propagate();

  // Check results
  tiles.forEach(tile => {
    console.log(`Tile ${tile.id}: confidence=${cascade.getConfidence(tile.id)}`);
  });

  await si.shutdown();
}

main().catch(console.error);
```

## Running Simulations

### Python Simulation

Create a file `simulation.py`:

```python
from superinstance.simulations import hydraulic_intelligence
from superinstance.core import Tile, TileNetwork

# Create tile network
network = TileNetwork(num_tiles=10)
tiles = [Tile(type='compute') for _ in range(10)]
network.add_tiles(tiles)

# Run hydraulic intelligence simulation
result = hydraulic_intelligence.compute_flow(network)

print(f"Max pressure: {result.max_pressure}")
print(f"Flow conservation: {abs(result.flow_in - result.flow_out) < 1e-6}")
```

Run it:

```bash
cd research/simulations
python simulation.py
```

### GPU-Accelerated Simulation

Enable GPU acceleration:

```python
from superinstance.simulations import hydraulic_intelligence

# Enable GPU (requires CUDA)
result = hydraulic_intelligence.compute_flow(
    network,
    gpu_enabled=True
)
```

## Next Steps

### Learn More

- [Complete Tutorial](TUTORIALS.md) - Step-by-step tutorials
- [API Reference](API_REFERENCE.md) - Full API documentation
- [Architecture Guide](ARCHITECTURE.md) - System design
- [Research Papers](PAPERS_GUIDE.md) - Mathematical foundations

### Explore Examples

```bash
# Browse examples directory
cd examples/

# Run specific example
npm run example:confidence-cascade
npm run example:agent-network
npm run example:self-play
```

### Join the Community

- [GitHub Discussions](https://github.com/SuperInstance/SuperInstance-papers/discussions)
- [Discord Community](https://discord.gg/superinstance)
- [Contributing Guide](../CONTRIBUTING.md)

## Common Issues

### Issue: "Cannot find module '@superinstance/core'"

**Solution**: Run `npm install` to install dependencies.

### Issue: "Python module not found"

**Solution**: Ensure you're in the `research/simulations` directory and run `pip install -r requirements.txt`.

### Issue: "CUDA not available"

**Solution**: GPU acceleration requires CUDA-compatible hardware. Disable GPU:
```typescript
const si = new SuperInstance({ gpu: false });
```

### Issue: "Port already in use"

**Solution**: Change the port in `.env`:
```
PORT=3001
```

## IDE Setup

### VSCode

Install recommended extensions:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
```

Open the project:
```bash
code .
```

### PyCharm

1. Open project directory
2. Configure Python interpreter (3.10+)
3. Enable TypeScript support
4. Install recommended plugins

## Development Mode

### Start Development Server

```bash
# Start all services
npm run dev

# Start specific services
npm run dev:api
npm run dev:ui
npm run dev:simulations
```

### Run Tests in Watch Mode

```bash
# TypeScript tests
npm run test:watch

# Python tests
cd research/simulations
pytest --watch
```

### Build for Production

```bash
# Create production build
npm run build

# Run production server
npm run start
```

## Docker Setup (Optional)

### Using Docker Compose

```bash
# Start all services
docker-compose up

# Run specific service
docker-compose up api
docker-compose up simulations

# Run tests in Docker
docker-compose run --rm api npm test
```

### Build Docker Image

```bash
# Build image
docker build -t superinstance .

# Run container
docker run -p 8000:8000 superinstance
```

## Getting Help

### Quick Help

- **Documentation**: [docs/](.)
- **Examples**: [examples/](../../examples)
- **Issues**: [GitHub Issues](https://github.com/SuperInstance/SuperInstance-papers/issues)

### Community Support

- **Discord**: Real-time help
- **Discussions**: Ask questions
- **Stack Overflow**: Tag with `superinstance`

### Reporting Bugs

Found a bug? [Create an issue](https://github.com/SuperInstance/SuperInstance-papers/issues/new?template=bug_report.md)

## What's Next?

Congratulations! You're now set up with SuperInstance. Here are some suggested paths:

### For Developers
- Read the [Contributing Guide](../../CONTRIBUTING.md)
- Find a [good first issue](https://github.com/SuperInstance/SuperInstance-papers/labels/good%20first%20issue)
- Join the [Discord community](https://discord.gg/superinstance)

### For Researchers
- Read the [Research Papers Guide](PAPERS_GUIDE.md)
- Explore [simulation examples](../../research/simulations)
- Contribute to [research discussions](https://github.com/SuperInstance/SuperInstance-papers/discussions/category/research)

### For Learners
- Follow the [Tutorial Series](TUTORIALS.md)
- Run the [example programs](../../examples)
- Watch the [video tutorials](https://www.youtube.com/@SuperInstance)

---

**Ready to dive deeper?** Check out the [complete documentation](.) or [start contributing](../../CONTRIBUTING.md)!

**Last Updated**: 2026-03-13
