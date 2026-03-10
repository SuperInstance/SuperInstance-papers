# Inventory Management Template

A comprehensive inventory management template built with POLLN living cells, featuring intelligent stock monitoring, demand forecasting, and automated replenishment.

## Overview

This template provides a complete inventory management system with:
- **Stock Level Monitoring**: Real-time inventory tracking with sensation-based alerts
- **Demand Forecasting**: Predictive modeling for inventory planning
- **Reorder Point Calculation**: Automated reorder logic with safety stock optimization
- **Supplier Management**: Vendor performance tracking and scorecard
- **Cost Optimization**: EOQ analysis and holding cost minimization

## Template Structure

```
InventoryTemplate
├── Stock Management
│   ├── Inventory Items (InputCell)
│   ├── Stock Level Tracking (AnalysisCell)
│   ├── Low Stock Alerts (DecisionCell)
│   └── Stockout Prediction (PredictionCell)
├── Demand Management
│   ├── Sales History (InputCell)
│   ├── Demand Analysis (AnalysisCell)
│   ├── Forecast Models (PredictionCell)
│   └── Seasonality Detection (AnalysisCell)
├── Replenishment
│   ├── Reorder Point Calculator (TransformCell)
│   ├── Economic Order Quantity (TransformCell)
│   ├── Purchase Order Generation (DecisionCell)
│   └── Safety Stock Optimization (AnalysisCell)
└── Supplier Management
    ├── Supplier Performance (AnalysisCell)
    ├── Lead Time Tracking (AnalysisCell)
    ├── Quality Score (TransformCell)
    └── Supplier Selection (DecisionCell)
```

## Key Features

### 1. Real-Time Stock Level Monitoring

**Living Cells Monitor:**
- Current stock levels
- Stock velocity (rate of consumption)
- Stock acceleration (demand trends)
- Low stock warnings
- Stockout predictions

**Example Inventory Cell:**
```typescript
const inventoryCell = new InputCell({
  id: 'item_widget_a',
  name: 'Widget A Inventory',
  value: {
    sku: 'WGT-A',
    quantity: 150,
    reorderPoint: 50,
    economicOrderQty: 200
  },
  sensations: [
    {
      targetId: 'item_widget_a',
      type: SensationType.ABSOLUTE_CHANGE,
      threshold: -20,
      interpretation: 'Stock decreased by more than 20 units'
    },
    {
      targetId: 'item_widget_a',
      type: SensationType.RATE_OF_CHANGE,
      threshold: -0.1,
      interpretation: 'Stock declining at accelerating rate'
    }
  ]
});
```

### 2. Intelligent Demand Forecasting

**Forecasting Models:**
- Moving average
- Exponential smoothing
- Linear regression
- Seasonal decomposition
- Machine learning integration

**Forecast Cell Example:**
```typescript
const demandForecast = new PredictionCell({
  id: 'demand_forecast_widget_a',
  name: 'Widget A Demand Forecast',
  predictionModel: 'exponential_smoothing',
  sourceCellIds: ['sales_history_widget_a'],
  horizon: 90, // 90 days
  confidenceInterval: 0.95,
  consciousness: {
    enabled: true,
    logReasoning: true
  }
});
```

### 3. Automated Reorder Logic

**Reorder Decision Factors:**
- Current stock level
- Reorder point
- Safety stock requirements
- Lead time
- Demand forecast
- EOQ optimization

**Reorder Decision Example:**
```typescript
const reorderDecision = new DecisionCell({
  id: 'reorder_decision_widget_a',
  name: 'Widget A Reorder Decision',
  decisionLogic: (context) => {
    const currentStock = context.getValue('item_widget_a');
    const reorderPoint = context.getValue('reorder_point_widget_a');
    const forecast = context.getPrediction('demand_forecast_widget_a');

    const projectedStock = currentStock - forecast.value;
    const shouldReorder = projectedStock < reorderPoint;

    return {
      decision: shouldReorder ? 'REORDER' : 'HOLD',
      confidence: 0.92,
      reasoning: `Projected stock: ${projectedStock}, Reorder point: ${reorderPoint}`,
      actions: shouldReorder ? ['create_po', 'notify_supplier'] : []
    };
  }
});
```

### 4. Supplier Performance Tracking

**Performance Metrics:**
- On-time delivery rate
- Fill rate
- Quality score
- Lead time consistency
- Cost competitiveness

**Supplier Scorecard:**
```typescript
const supplierPerformance = new AnalysisCell({
  id: 'supplier_performance_abc_inc',
  name: 'ABC Inc Performance',
  analysisType: 'supplier_scorecard',
  sourceCellIds: ['deliveries_abc_inc', 'quality_abc_inc', 'lead_times_abc_inc'],
  consciousness: {
    enabled: true,
    logReasoning: true
  }
});

// Cell consciousness tracks:
// - Delivery performance trends
// - Quality issues and patterns
// - Lead time variations
// - Cost comparison vs alternatives
// - Overall supplier health score
```

### 5. Cost Optimization

**EOQ Analysis:**
```typescript
const eoqCalculator = new TransformCell({
  id: 'eoq_calculator_widget_a',
  name: 'Widget A EOQ Calculator',
  transformFunction: (inputs) => {
    const annualDemand = inputs.get('annual_demand');
    const orderCost = inputs.get('order_cost');
    const holdingCost = inputs.get('holding_cost');

    // EOQ = sqrt(2 * D * S / H)
    const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCost);

    return {
      eoq: Math.round(eoq),
      totalCost: calculateTotalCost(eoq, annualDemand, orderCost, holdingCost),
      ordersPerYear: annualDemand / eoq
    };
  },
  sourceCellIds: ['annual_demand', 'order_cost', 'holding_cost']
});
```

## Consciousness Streams

Inventory cells maintain awareness of:
- **Stock Level Changes**: Real-time quantity updates
- **Demand Patterns**: Seasonal and trend changes
- **Supplier Performance**: Delivery and quality issues
- **Cost Fluctuations**: Price changes and their impact
- **Reorder Urgency**: When action is needed

### Example Consciousness Stream

```json
{
  "cellId": "inventory_monitor_widget_a",
  "timestamp": "2026-03-09T16:30:00Z",
  "consciousness": {
    "sensations": [
      {
        "type": "ABSOLUTE_CHANGE",
        "target": "item_widget_a",
        "value": -45,
        "interpretation": "Stock decreased by 45 units (larger than usual)"
      }
    ],
    "reasoning": [
      "Current stock: 150 units",
      "Recent daily consumption: 45 units/day",
      "Stock velocity: -30% from normal",
      "Stock acceleration: negative (demand increasing)",
      "Reorder point: 50 units",
      "At current rate, stockout in 3.3 days",
      "Lead time: 5 days",
      "URGENT: Reorder immediately"
    ],
    "prediction": {
      "stockoutDate": "2026-03-13",
      "confidence": 0.94,
      "recommendedAction": "REORDER",
      "recommendedQty": 200
    }
  }
}
```

## Usage Examples

### Basic Inventory Tracking

```typescript
import { InventoryTemplate } from '@spreadsheet/templates/inventory';

const inventory = new InventoryTemplate();

// Add inventory item
inventory.addItem({
  sku: 'WGT-A',
  name: 'Widget A',
  quantity: 150,
  reorderPoint: 50,
  economicOrderQty: 200,
  unitCost: 25.00,
  holdingCostPct: 0.20
});

// Update stock level
inventory.adjustStock('WGT-A', -25); // Sold 25 units

// Check stock status
const status = inventory.getStockStatus('WGT-A');
console.log(status);
// {
//   sku: 'WGT-A',
//   currentStock: 125,
//   reorderPoint: 50,
//   status: 'healthy',
//   daysUntilReorder: 5.2
// }
```

### Demand Forecasting

```typescript
// Record sales
inventory.recordSale('WGT-A', { quantity: 15, date: new Date() });
inventory.recordSale('WGT-A', { quantity: 20, date: new Date() });
inventory.recordSale('WGT-A', { quantity: 18, date: new Date() });

// Get forecast
const forecast = inventory.getDemandForecast('WGT-A', 30);
console.log('30-day forecast:', forecast);
// {
//   totalDemand: 540,
//   dailyAverage: 18,
//   confidence: 0.87,
//   trend: 'stable'
// }
```

### Reorder Management

```typescript
// Set up reorder logic
inventory.configureReorder('WGT-A', {
  reorderPoint: 50,
  safetyStock: 20,
  leadTimeDays: 5,
  reviewPeriod: 'continuous'
});

// Check if reorder needed
const reorderDecision = inventory.checkReorder('WGT-A');
if (reorderDecision.shouldReorder) {
  console.log('Reorder recommended:', reorderDecision);
  inventory.createPurchaseOrder('WGT-A', reorderDecision.quantity);
}
```

### Supplier Management

```typescript
// Add supplier
inventory.addSupplier('ABC-Inc', {
  name: 'ABC Corporation',
  leadTimeDays: 5,
  fillRate: 0.98,
  qualityScore: 0.95
});

// Track delivery
inventory.recordDelivery('ABC-Inc', {
  poNumber: 'PO-12345',
  items: [{ sku: 'WGT-A', quantity: 200 }],
  onTime: true,
  qualityIssues: 0
});

// Get supplier performance
const performance = inventory.getSupplierPerformance('ABC-Inc');
console.log('Supplier score:', performance.overallScore);
```

## Advanced Features

### 1. Multi-Location Inventory

```typescript
inventory.addLocation('warehouse-1', { type: 'warehouse' });
inventory.addLocation('store-1', { type: 'retail' });

inventory.transferStock('WGT-A', 'warehouse-1', 'store-1', 50);
```

### 2. Lot and Expiry Tracking

```typescript
inventory.addLot('WGT-A', {
  lotNumber: 'LOT-2026-001',
  quantity: 100,
  expiryDate: new Date('2027-12-31'),
  manufactureDate: new Date('2026-01-01')
});

const expiring = inventory.getExpiringLots(30); // Next 30 days
```

### 3. ABC Analysis

```typescript
const abcAnalysis = inventory.performABCAnalysis();
console.log('A items:', abcAnalysis.A); // High value
console.log('B items:', abcAnalysis.B); // Medium value
console.log('C items:', abcAnalysis.C); // Low value
```

### 4. Safety Stock Optimization

```typescript
const optimizedSafetyStock = inventory.optimizeSafetyStock('WGT-A', {
  serviceLevel: 0.95,
  demandStdDev: 15,
  leadTimeStdDev: 1
});

console.log('Optimal safety stock:', optimizedSafetyStock);
```

## Performance Optimization

- **Lazy Evaluation**: Stock levels calculated on demand
- **Incremental Updates**: Only affected items recalculate
- **Batch Processing**: Multiple adjustments processed together
- **Smart Caching**: Frequently accessed data cached
- **Parallel Processing**: Independent items processed concurrently

## Best Practices

1. **Set Accurate Reorder Points**: Base on demand and lead time
2. **Maintain Safety Stock**: Protect against variability
3. **Monitor Supplier Performance**: Track delivery and quality
4. **Regular Cycle Counts**: Verify inventory accuracy
5. **Review Forecasts**: Compare predicted vs actual demand

## Extending the Template

### Custom Reorder Strategies

```typescript
inventory.registerReorderStrategy('just_in_time', {
  calculator: (item, context) => {
    const leadTime = context.getLeadTime(item.preferredSupplier);
    const dailyDemand = context.getDailyDemand(item.sku);
    return {
      reorderPoint: dailyDemand * leadTime,
      safetyStock: 0
    };
  }
});
```

### Custom Forecast Models

```typescript
inventory.registerForecastModel('custom_ml', {
  predictor: async (historicalData, horizon) => {
    // Custom ML model
    return model.predict(historicalData, horizon);
  },
  trainer: async (trainingData) => {
    // Train model
    return trainedModel;
  }
});
```

## Troubleshooting

### Issue: Frequent stockouts
**Solution**: Increase safety stock or reduce lead time

### Issue: Excess inventory
**Solution**: Reduce order quantities or improve demand forecasting

### Issue: Supplier delays
**Solution**: Diversify suppliers or increase safety stock

## Related Templates

- **Financial Template**: For inventory cost analysis
- **Analytics Template**: For demand trend analysis
- **Project Template**: For supply chain projects

## License

MIT License - see LICENSE file for details
