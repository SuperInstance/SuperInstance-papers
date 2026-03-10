# Financial Spreadsheet Template

A comprehensive financial management template built with POLLN living cells, demonstrating advanced sensation, analysis, and prediction capabilities.

## Overview

This template provides a complete financial management system with:
- **Revenue Tracking**: Multi-source revenue aggregation with trend analysis
- **Expense Analysis**: Categorized expense monitoring with variance detection
- **Budget Planning**: Dynamic budget allocation with real-time variance tracking
- **Cash Flow Projection**: Intelligent forecasting based on historical patterns
- **Financial Ratios**: Automated calculation of key performance indicators

## Template Structure

```
FinancialTemplate
├── Revenue Section
│   ├── Revenue Sources (InputCell)
│   ├── Revenue Aggregation (AggregateCell)
│   ├── Trend Analysis (AnalysisCell)
│   └── Revenue Forecast (PredictionCell)
├── Expense Section
│   ├── Expense Categories (InputCell)
│   ├── Expense Validation (ValidateCell)
│   ├── Budget Comparison (AnalysisCell)
│   └── Expense Projection (PredictionCell)
├── Cash Flow Section
│   ├── Operating Cash Flow (TransformCell)
│   ├── Investing Activities (TransformCell)
│   ├── Financing Activities (TransformCell)
│   └── Cash Forecast (PredictionCell)
└── Analytics Section
    ├── Financial Ratios (AnalysisCell)
    ├── Variance Analysis (AnalysisCell)
    ├── Performance Metrics (AggregateCell)
    └── Alerts (DecisionCell)
```

## Key Features

### 1. Revenue Tracking with Trend Analysis

**Living Cells Monitor:**
- Month-over-month growth rates
- Seasonal pattern detection
- Revenue velocity (rate of change)
- Revenue acceleration (trend direction)
- Anomaly detection (sudden spikes/drops)

**Example Cell Configuration:**
```typescript
const revenueCell = new InputCell({
  id: 'revenue_jan',
  value: 125000,
  sensations: [
    {
      targetId: 'revenue_dec',
      type: SensationType.ABSOLUTE_CHANGE,
      threshold: 10000
    },
    {
      targetId: 'revenue_dec',
      type: SensationType.RATE_OF_CHANGE,
      threshold: 0.15
    }
  ]
});
```

### 2. Expense Analysis with Variance Detection

**Automated Detection:**
- Budget overruns
- Unusual expense patterns
- Category spending trends
- Cost reduction opportunities
- Vendor performance issues

**Variance Alert System:**
```typescript
const expenseVariance = new DecisionCell({
  id: 'expense_variance_alert',
  decisionLogic: (context) => {
    const actual = context.getValue('actual_expenses');
    const budget = context.getValue('budgeted_expenses');
    const variance = (actual - budget) / budget;

    if (variance > 0.10) {
      return {
        decision: 'ALERT',
        confidence: 0.95,
        reasoning: `Expense variance ${variance}% exceeds 10% threshold`,
        actions: ['notify_manager', 'create_variance_report']
      };
    }
  }
});
```

### 3. Cash Flow Projection

**Intelligent Forecasting:**
- Historical pattern analysis
- Seasonal adjustments
- Payment cycle modeling
- Working capital optimization
- Liquidity risk assessment

**Prediction Cell Example:**
```typescript
const cashForecast = new PredictionCell({
  id: 'cash_forecast',
  predictionModel: 'linear_regression',
  features: ['historical_cash', 'seasonal_factor', 'payment_cycle'],
  horizon: 90, // 90-day forecast
  confidenceInterval: 0.95
});
```

### 4. Financial Ratios Automation

**Real-time Calculation:**
- **Liquidity Ratios**: Current, Quick, Cash
- **Profitability Ratios**: Gross Margin, Operating Margin, Net Margin
- **Efficiency Ratios**: Asset Turnover, Inventory Turnover
- **Solvency Ratios**: Debt-to-Equity, Interest Coverage

## Consciousness Streams

Every financial cell maintains a consciousness stream showing:
- **Sensation Log**: What changes were detected
- **Reasoning Trace**: How conclusions were reached
- **Decision Path**: Why actions were taken
- **Prediction History**: Forecast accuracy over time

### Example Consciousness Stream

```json
{
  "cellId": "revenue_trend_analysis",
  "timestamp": "2026-03-09T10:30:00Z",
  "consciousness": {
    "sensations": [
      {
        "type": "RATE_OF_CHANGE",
        "target": "revenue_feb",
        "value": 0.187,
        "interpretation": "Strong upward momentum"
      }
    ],
    "reasoning": [
      "Revenue increased 18.7% from previous month",
      "This exceeds 12-month average of 8.3%",
      "Seasonal factor indicates +2% expected for March",
      "Confidence in continued growth: 87%"
    ],
    "prediction": {
      "value": 158000,
      "confidence": 0.87,
      "reasoning": "Based on trend acceleration and seasonal patterns"
    }
  }
}
```

## Usage Examples

### Basic Revenue Tracking

```typescript
import { FinancialTemplate } from '@spreadsheet/templates/financial';

const template = new FinancialTemplate();

// Add revenue source
template.addRevenueSource('product_sales', {
  january: 125000,
  february: 148000,
  march: 158000
});

// Get trend analysis
const trend = template.getRevenueTrend();
console.log(trend);
// {
//   direction: 'increasing',
//   rate: 0.187,
//   acceleration: 0.034,
//   forecast: { april: 175000, confidence: 0.87 }
// }
```

### Expense Monitoring with Alerts

```typescript
// Set budget
template.setBudget('marketing', 50000);

// Log expense
template.logExpense('marketing', 'google_ads', 15000);

// Check for alerts
const alerts = template.getVarianceAlerts();
if (alerts.length > 0) {
  console.log('Budget alerts:', alerts);
}
```

### Cash Flow Forecasting

```typescript
// Get 90-day cash forecast
const forecast = template.getCashForecast(90);

console.log('Projected cash position:', forecast);
// {
//   day30: { cash: 285000, confidence: 0.92 },
//   day60: { cash: 320000, confidence: 0.85 },
//   day90: { cash: 355000, confidence: 0.78 }
// }
```

## Advanced Features

### 1. Multi-Currency Support

```typescript
template.enableMultiCurrency(['USD', 'EUR', 'GBP']);
template.setExchangeRate('EUR', 1.08);
```

### 2. Scenario Planning

```typescript
const scenario = template.createScenario('optimistic');
scenario.setRevenueGrowth(0.15);
scenario.setExpenseReduction(0.05);

const projection = template.runScenario(scenario);
```

### 3. Custom Ratios

```typescript
template.addCustomRatio('burn_rate', {
  numerator: ['expenses', 'monthly'],
  denominator: ['cash', 'current'],
  interpretation: (value) => {
    if (value > 0.2) return 'High burn rate - warning';
    if (value > 0.1) return 'Moderate burn rate';
    return 'Healthy burn rate';
  }
});
```

## Performance Optimization

- **Lazy Evaluation**: Cells only compute when accessed
- **Incremental Updates**: Only affected cells recalculate
- **Caching**: Computed values cached with TTL
- **Batch Processing**: Multiple updates processed together
- **Parallel Computation**: Independent cells compute concurrently

## Best Practices

1. **Start Simple**: Begin with basic revenue/expense tracking
2. **Add Sensations Gradually**: Monitor what matters most
3. **Tune Thresholds**: Adjust sensitivity to reduce false positives
4. **Review Consciousness**: Regularly audit cell reasoning
5. **Validate Predictions**: Compare forecasts with actuals

## Extending the Template

### Adding Custom Revenue Sources

```typescript
template.registerRevenueSource('subscription_recurring', {
  validator: (value) => value > 0 && value < 1000000,
  aggregator: 'sum',
  predictor: 'arima'
});
```

### Custom Expense Categories

```typescript
template.addExpenseCategory('r&d', {
  budget: 100000,
  alertThreshold: 0.90,
  approvalRequired: true
});
```

## Troubleshooting

### Issue: Cells not updating
**Solution**: Check that sensations are properly configured and targets exist

### Issue: False alerts
**Solution**: Adjust sensation thresholds based on historical variance

### Issue: Slow performance
**Solution**: Enable caching and reduce frequency of non-critical sensations

## Related Templates

- **Project Template**: For project budgeting and resource planning
- **Analytics Template**: For deeper financial data analysis
- **Inventory Template**: For inventory-based cash flow planning

## License

MIT License - see LICENSE file for details
