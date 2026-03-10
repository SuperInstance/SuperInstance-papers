# Quick Start

Get up and running with POLLN in 5 minutes. This guide will walk you through creating your first living spreadsheet with intelligent cells.

## Your First Living Cell

Let's create a simple cell that monitors a value and alerts when it changes significantly.

### Step 1: Create a Project

```bash
mkdir my-polln-app
cd my-polln-app
npm init -y
npm install polln
```

### Step 2: Create Your First Cell

Create `index.ts`:

```typescript
import { Colony, LogCell, TransformCell } from 'polln'

async function main() {
  // Create a colony - a home for your cells
  const colony = new Colony('my-first-colony')

  // Create an input cell that monitors sales data
  const salesCell = new LogCell('A1', {
    initialValue: 1000,
    head: {
      // This cell "feels" absolute changes in value
      sensation: 'absolute_change',
      threshold: 0.15 // Alert when change exceeds 15%
    },
    body: {
      // Process the data
      analyzer: 'basic'
    },
    tail: {
      // Take action when threshold is exceeded
      action: 'notify',
      target: ['admin@company.com']
    }
  })

  // Create a cell that calculates trend
  const trendCell = new TransformCell('A2', {
    sources: ['A1'],
    transform: (value) => {
      // Calculate simple trend
      return {
        current: value,
        direction: value > 1000 ? 'up' : 'down',
        status: value > 1150 ? 'high' : 'normal'
      }
    }
  })

  // Add cells to colony
  colony.addCells([salesCell, trendCell])

  // Start the colony
  await colony.start()

  console.log('Colony is running!')
  console.log('Initial sales:', salesCell.state.value)
  console.log('Trend analysis:', trendCell.state.value)

  // Simulate data updates
  console.log('\nUpdating sales data...')

  // Normal update - no alert
  await salesCell.update(1050)
  console.log('Sales:', salesCell.state.value)
  console.log('Trend:', trendCell.state.value)

  // Large change - triggers alert!
  await salesCell.update(1250)
  console.log('Sales:', salesCell.state.value)
  console.log('Trend:', trendCell.state.value)

  // Graceful shutdown
  await colony.stop()
  console.log('\nColony stopped gracefully')
}

main().catch(console.error)
```

### Step 3: Run Your Program

```bash
npx tsx index.ts
```

**Output:**
```
Colony is running!
Initial sales: 1000
Trend analysis: { current: 1000, direction: 'down', status: 'normal' }

Updating sales data...
Sales: 1050
Trend: { current: 1050, direction: 'up', status: 'normal' }

[ALERT] Sales increased by 19.05% (exceeds 15% threshold)
Sales: 1250
Trend: { current: 1250, direction: 'up', status: 'high' }

Colony stopped gracefully
```

## Building a Data Pipeline

Let's create a more complex example with multiple interconnected cells.

### Step 1: Define Your Pipeline

Create `pipeline.ts`:

```typescript
import {
  Colony,
  InputCell,
  TransformCell,
  AggregateCell,
  FilterCell,
  OutputCell
} from 'polln'

interface SalesData {
  date: string
  product: string
  amount: number
  region: string
}

async function createPipeline() {
  const colony = new Colony('sales-analytics')

  // 1. Input: Raw sales data
  const rawData = new InputCell<SalesData[]>('raw-data', {
    source: 'csv',
    path: './sales.csv'
  })

  // 2. Transform: Clean and normalize
  const cleanData = new TransformCell('clean-data', {
    sources: ['raw-data'],
    transform: (data: SalesData[]) => {
      return data
        .filter(row => row.amount > 0) // Remove invalid entries
        .map(row => ({
          ...row,
          amount: Math.round(row.amount * 100) / 100, // Round to 2 decimals
          date: new Date(row.date).toISOString() // Normalize date format
        }))
    }
  })

  // 3. Filter: Focus on specific region
  const regionData = new FilterCell('region-data', {
    sources: ['clean-data'],
    filter: (data: SalesData[]) => {
      return data.filter(row => row.region === 'North')
    }
  })

  // 4. Aggregate: Calculate daily totals
  const dailyTotals = new AggregateCell('daily-totals', {
    sources: ['region-data'],
    aggregation: 'sum',
    groupBy: 'date',
    field: 'amount'
  })

  // 5. Transform: Calculate trends
  const trendAnalysis = new TransformCell('trends', {
    sources: ['daily-totals'],
    transform: (data) => {
      const values = Object.values(data)
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const trend = values[values.length - 1] > values[0] ? 'up' : 'down'

      return {
        average: Math.round(avg * 100) / 100,
        trend,
        total: values.reduce((a, b) => a + b, 0)
      }
    }
  })

  // 6. Output: Save results
  const output = new OutputCell('output', {
    sources: ['trends'],
    destination: './results.json',
    format: 'json'
  })

  // Wire everything together
  colony.addCells([
    rawData,
    cleanData,
    regionData,
    dailyTotals,
    trendAnalysis,
    output
  ])

  await colony.start()

  // Trigger pipeline
  await rawData.load()

  console.log('Pipeline complete!')
  console.log('Results:', output.state.value)

  await colony.stop()
}

createPipeline().catch(console.error)
```

### Step 2: Create Sample Data

Create `sales.csv`:

```csv
date,product,amount,region
2024-03-01,Widget A,150.50,North
2024-03-01,Widget B,200.00,South
2024-03-02,Widget A,175.25,North
2024-03-02,Widget C,99.99,East
2024-03-03,Widget B,225.00,North
```

### Step 3: Run the Pipeline

```bash
npx tsx pipeline.ts
```

## Real-Time Monitoring

Create a monitoring dashboard that watches cells and alerts on anomalies.

### Create `monitor.ts`:

```typescript
import { Colony, AnalysisCell, DecisionCell, ExplainCell } from 'polln'

async function createMonitor() {
  const colony = new Colony('anomaly-monitor')

  // Analysis cell detects anomalies
  const anomalyDetector = new AnalysisCell('detector', {
    sources: ['data-stream'],
    analysis: 'anomaly-detection',
    sensitivity: 2.0 // 2 standard deviations
  })

  // Decision cell determines action
  const decisionMaker = new DecisionCell('decider', {
    sources: ['detector'],
    rules: [
      {
        condition: 'anomaly.score > 0.8',
        action: 'alert',
        priority: 'high'
      },
      {
        condition: 'anomaly.score > 0.5',
        action: 'log',
        priority: 'medium'
      }
    ]
  })

  // Explain cell provides reasoning
  const explainer = new ExplainCell('explainer', {
    sources: ['detector', 'decider'],
    format: 'natural-language',
    detail: 'full'
  })

  colony.addCells([anomalyDetector, decisionMaker, explainer])

  await colony.start()

  // Monitor data stream
  setInterval(async () => {
    const newValue = await getNextValue() // Your data source

    await colony.updateCell('data-stream', newValue)

    // Check for alerts
    if (decisionMaker.state.value.action === 'alert') {
      console.log('🚨 ANOMALY DETECTED')
      console.log('Explanation:', explainer.state.value)
    }
  }, 5000)

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await colony.stop()
    process.exit(0)
  })
}

createMonitor().catch(console.error)
```

## Next Steps

Congratulations! You've created your first living spreadsheets with POLLN. Now you can:

### Learn More

- [Core Concepts](./concepts/) - Understand the LOG system deeply
- [Cell Reference](./cells/) - Explore all cell types
- [API Reference](./api/) - Complete API documentation

### Build More

- [Examples](../../examples/) - Real-world examples and use cases
- [Advanced Topics](./advanced/) - Performance, security, deployment

### Join the Community

- [GitHub Discussions](https://github.com/SuperInstance/polln/discussions)
- [Discord](https://discord.gg/polln)
- [Twitter](https://twitter.com/polln_ai)

## Common Patterns

### Pattern 1: Cascading Updates

```typescript
// Cell B automatically updates when Cell A changes
const cellA = new LogCell('A', { initialValue: 10 })
const cellB = new TransformCell('B', {
  sources: ['A'],
  transform: (v) => v * 2
})

await cellA.update(20)
console.log(cellB.state.value) // 40
```

### Pattern 2: Conditional Logic

```typescript
const decisionCell = new DecisionCell('decision', {
  sources: ['input'],
  rules: [
    { condition: 'value > 100', action: 'approve' },
    { condition: 'value > 50', action: 'review' },
    { condition: 'true', action: 'reject' }
  ]
})
```

### Pattern 3: Multi-Source Aggregation

```typescript
const aggregator = new AggregateCell('total', {
  sources: ['sales', 'returns', 'refunds'],
  aggregation: 'sum',
  transform: (results) => {
    return {
      gross: results.sales,
      net: results.sales - results.returns - results.refunds
    }
  }
})
```

---

**Ready to dive deeper?** Explore our [examples](../../examples/) or read the [conceptual guide](./concepts/)!
