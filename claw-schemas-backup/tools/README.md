# Equipment System Tools

This directory contains utility tools for working with the Equipment system.

## Available Tools

### validate-equipment.ts

Validate equipment definitions against the equipment schema.

**Usage:**
```bash
npm install typescript
npx ts-node validate-equipment.ts <equipment-file.json>
```

**Examples:**
```bash
# Validate example equipment
npx ts-node validate-equipment.ts ../examples/equipment-examples.json

# Validate custom equipment
npx ts-node validate-equipment.ts ./my-custom-equipment.json
```

**Features:**
- JSON Schema validation
- Business logic validation
- Cost/benefit ratio analysis
- Deadband range validation
- Dependency and conflict checking

**Exit Codes:**
- `0`: All equipment valid
- `1`: One or more equipment invalid

### calculate-cost-benefit.ts

Calculate cost/benefit ratios for equipment optimization.

**Usage:**
```bash
npx ts-node calculate-cost-benefit.ts <equipment-file.json>
```

**Features:**
- Calculate total cost metrics
- Calculate total benefit metrics
- Compute cost/benefit ratio
- Compare multiple equipment
- Recommend optimal equipment

### test-triggers.ts

Test muscle memory triggers under various conditions.

**Usage:**
```bash
npx ts-node test-triggers.ts <equipment-file.json> <test-scenarios.json>
```

**Features:**
- Simulate trigger conditions
- Test trigger firing logic
- Verify cooldown behavior
- Test priority ordering
- Validate trigger effectiveness

### profile-equipment.ts

Profile equipment performance characteristics.

**Usage:**
```bash
npx ts-node profile-equipment.ts <equipment-file.json>
```

**Features:**
- Memory usage profiling
- CPU usage profiling
- Latency measurement
- Throughput testing
- Resource leak detection

## Development

### Setup

```bash
# Install dependencies
npm install -D typescript @types/node

# Build tools
npm run build
```

### Running Tests

```bash
# Run all tool tests
npm test

# Run specific tool tests
npm test -- validate-equipment
```

### Adding New Tools

1. Create new TypeScript file in `tools/`
2. Add shebang and documentation
3. Export main function
4. Add to this README

**Template:**
```typescript
#!/usr/bin/env node

/**
 * Tool Description
 *
 * Usage: node tool-name.ts <args>
 */

import fs from 'fs';
import path from 'path';

async function main() {
  // Implementation
}

main().catch(console.error);
```

## Examples

### Example 1: Validate Equipment

```bash
$ npx ts-node validate-equipment.ts ../examples/equipment-examples.json

🔍 Validating: /path/to/equipment-examples.json

📦 Found 7 equipment definition(s)

============================================================
Validating: ternary-memory
============================================================

✅ ternary-memory is valid!
   Slot: MEMORY
   Version: 1.0.0
   Capabilities: 3

⚠️  Warnings:
  • High cost/benefit ratio (1.50 / 1.25). Consider if benefits justify the costs.

============================================================
Summary
============================================================
✅ Valid: 7
❌ Invalid: 0
📦 Total: 7
```

### Example 2: Calculate Cost/Benefit

```bash
$ npx ts-node calculate-cost-benefit.ts ternary-memory.json

📊 Cost/Benefit Analysis: ternary-memory

Costs:
  • Memory: 10.00 MB
  • CPU: 2.50%
  • Latency: 0.50 ms
  • Monetary: $0.0000/use
  • Energy: 0.01 J/use
  • Total Cost Score: 1.50

Benefits:
  • Accuracy: +15.0%
  • Speed: 3.00x multiplier
  • Confidence: +10.0%
  • Capabilities: 3 new
  • Reliability: +8.0%
  • Total Benefit Score: 1.25

Cost/Benefit Ratio: 1.20 (lower is better)

Recommendation: ✅ Good value - benefits outweigh costs
```

## Contributing

When adding new tools:

1. **Follow conventions:** Use TypeScript, add documentation
2. **Handle errors:** Provide clear error messages
3. **Exit codes:** Use appropriate exit codes (0=success, 1=error)
4. **Testing:** Add tests for your tools
5. **Documentation:** Update this README

## License

MIT License - See [LICENSE](../../LICENSE) for details.
