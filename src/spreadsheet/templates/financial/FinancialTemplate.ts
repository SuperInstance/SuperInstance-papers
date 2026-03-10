/**
 * Financial Template - Comprehensive Financial Management with POLLN
 *
 * Demonstrates:
 * - Revenue tracking with trend analysis
 * - Expense categorization with variance detection
 * - Budget planning with real-time monitoring
 * - Cash flow projection
 * - Financial ratio calculation
 * - Multi-source data aggregation
 * - Intelligent forecasting
 * - Alert generation
 */

import { LogCell, CellHead, CellBody, CellTail, CellOrigin } from '../../core/LogCell';
import { InputCell } from '../../cells/InputCell';
import { OutputCell } from '../../cells/OutputCell';
import { TransformCell } from '../../cells/TransformCell';
import { AggregateCell } from '../../cells/AggregateCell';
import { AnalysisCell } from '../../cells/AnalysisCell';
import { PredictionCell } from '../../cells/PredictionCell';
import { DecisionCell } from '../../cells/DecisionCell';
import { ValidateCell } from '../../cells/ValidateCell';
import { SensationType } from '../../types/SensationType';
import { Collocator } from '../../core/Collocator';
import { ConsciousnessStream } from '../../core/ConsciousnessStream';

export interface RevenueSource {
  id: string;
  name: string;
  monthly: { [month: string]: number };
  category: 'product' | 'service' | 'subscription' | 'other';
}

export interface ExpenseCategory {
  id: string;
  name: string;
  budget: number;
  actual: number;
  items: ExpenseItem[];
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  date: Date;
  approved: boolean;
  vendor?: string;
}

export interface CashFlowItem {
  id: string;
  type: 'inflow' | 'outflow';
  category: string;
  amount: number;
  date: Date;
  recurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
}

export interface FinancialRatio {
  name: string;
  value: number;
  interpretation: string;
  trend: 'improving' | 'stable' | 'declining';
}

export class FinancialTemplate {
  private colony: Collocator;
  private revenueCells: Map<string, InputCell> = new Map();
  private expenseCells: Map<string, InputCell> = new Map();
  private analysisCells: Map<string, AnalysisCell> = new Map();
  private predictionCells: Map<string, PredictionCell> = new Map();
  private decisionCells: Map<string, DecisionCell> = new Map();
  private consciousness: ConsciousnessStream;

  constructor() {
    this.colony = new Collocator('financial_template');
    this.consciousness = new ConsciousnessStream('financial_template');
    this.initializeTemplate();
  }

  private initializeTemplate(): void {
    // Initialize revenue tracking
    this.initializeRevenueTracking();

    // Initialize expense tracking
    this.initializeExpenseTracking();

    // Initialize cash flow management
    this.initializeCashFlow();

    // Initialize financial ratios
    this.initializeFinancialRatios();

    // Initialize alert system
    this.initializeAlertSystem();
  }

  private initializeRevenueTracking(): void {
    // Total revenue aggregation cell
    const totalRevenue = new AggregateCell({
      id: 'total_revenue',
      name: 'Total Revenue',
      aggregationType: 'sum',
      sourceCellIds: [],
      sensations: [
        {
          targetId: 'total_revenue',
          type: SensationType.RATE_OF_CHANGE,
          threshold: 0.10,
          interpretation: 'Revenue growth rate exceeds 10%'
        }
      ]
    });

    // Revenue trend analysis
    const revenueTrend = new AnalysisCell({
      id: 'revenue_trend_analysis',
      name: 'Revenue Trend Analysis',
      analysisType: 'trend',
      sourceCellIds: ['total_revenue'],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    // Revenue forecast
    const revenueForecast = new PredictionCell({
      id: 'revenue_forecast',
      name: 'Revenue Forecast',
      predictionModel: 'linear_regression',
      sourceCellIds: ['total_revenue'],
      horizon: 90, // 90 days
      confidenceInterval: 0.95
    });

    this.colony.addCell(totalRevenue);
    this.colony.addCell(revenueTrend);
    this.colony.addCell(revenueForecast);
    this.analysisCells.set('revenue_trend', revenueTrend);
    this.predictionCells.set('revenue', revenueForecast);
  }

  private initializeExpenseTracking(): void {
    // Total expenses aggregation
    const totalExpenses = new AggregateCell({
      id: 'total_expenses',
      name: 'Total Expenses',
      aggregationType: 'sum',
      sourceCellIds: [],
      sensations: [
        {
          targetId: 'total_expenses',
          type: SensationType.ABSOLUTE_CHANGE,
          threshold: 5000,
          interpretation: 'Expense change exceeds $5,000'
        }
      ]
    });

    // Budget variance analysis
    const budgetVariance = new AnalysisCell({
      id: 'budget_variance_analysis',
      name: 'Budget Variance Analysis',
      analysisType: 'variance',
      sourceCellIds: ['total_expenses'],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    // Expense forecast
    const expenseForecast = new PredictionCell({
      id: 'expense_forecast',
      name: 'Expense Forecast',
      predictionModel: 'moving_average',
      sourceCellIds: ['total_expenses'],
      horizon: 60,
      confidenceInterval: 0.90
    });

    this.colony.addCell(totalExpenses);
    this.colony.addCell(budgetVariance);
    this.colony.addCell(expenseForecast);
    this.analysisCells.set('budget_variance', budgetVariance);
    this.predictionCells.set('expenses', expenseForecast);
  }

  private initializeCashFlow(): void {
    // Operating cash flow calculation
    const operatingCashFlow = new TransformCell({
      id: 'operating_cash_flow',
      name: 'Operating Cash Flow',
      transformFunction: (inputs: Map<string, any>) => {
        const revenue = inputs.get('total_revenue') || 0;
        const expenses = inputs.get('total_expenses') || 0;
        return revenue - expenses;
      },
      sourceCellIds: ['total_revenue', 'total_expenses']
    });

    // Cash flow trend
    const cashFlowTrend = new AnalysisCell({
      id: 'cash_flow_trend',
      name: 'Cash Flow Trend',
      analysisType: 'trend',
      sourceCellIds: ['operating_cash_flow'],
      consciousness: {
        enabled: true
      }
    });

    // Cash position forecast
    const cashForecast = new PredictionCell({
      id: 'cash_forecast',
      name: 'Cash Position Forecast',
      predictionModel: 'exponential_smoothing',
      sourceCellIds: ['operating_cash_flow'],
      horizon: 90,
      confidenceInterval: 0.95
    });

    this.colony.addCell(operatingCashFlow);
    this.colony.addCell(cashFlowTrend);
    this.colony.addCell(cashForecast);
    this.analysisCells.set('cash_flow_trend', cashFlowTrend);
    this.predictionCells.set('cash', cashForecast);
  }

  private initializeFinancialRatios(): void {
    // Current ratio calculation
    const currentRatio = new TransformCell({
      id: 'current_ratio',
      name: 'Current Ratio',
      transformFunction: (inputs: Map<string, any>) => {
        const currentAssets = inputs.get('current_assets') || 0;
        const currentLiabilities = inputs.get('current_liabilities') || 1;
        return currentAssets / currentLiabilities;
      },
      sourceCellIds: ['current_assets', 'current_liabilities']
    });

    // Gross margin analysis
    const grossMargin = new TransformCell({
      id: 'gross_margin',
      name: 'Gross Margin',
      transformFunction: (inputs: Map<string, any>) => {
        const revenue = inputs.get('total_revenue') || 0;
        const cogs = inputs.get('cost_of_goods_sold') || 0;
        return revenue > 0 ? (revenue - cogs) / revenue : 0;
      },
      sourceCellIds: ['total_revenue', 'cost_of_goods_sold']
    });

    // Net profit margin
    const netProfitMargin = new TransformCell({
      id: 'net_profit_margin',
      name: 'Net Profit Margin',
      transformFunction: (inputs: Map<string, any>) => {
        const netIncome = inputs.get('net_income') || 0;
        const revenue = inputs.get('total_revenue') || 1;
        return netIncome / revenue;
      },
      sourceCellIds: ['net_income', 'total_revenue']
    });

    // Ratio interpretation
    const ratioAnalysis = new AnalysisCell({
      id: 'ratio_analysis',
      name: 'Financial Ratio Analysis',
      analysisType: 'composite',
      sourceCellIds: ['current_ratio', 'gross_margin', 'net_profit_margin'],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    this.colony.addCell(currentRatio);
    this.colony.addCell(grossMargin);
    this.colony.addCell(netProfitMargin);
    this.colony.addCell(ratioAnalysis);
    this.analysisCells.set('ratio_analysis', ratioAnalysis);
  }

  private initializeAlertSystem(): void {
    // Budget overrun alert
    const budgetAlert = new DecisionCell({
      id: 'budget_overrun_alert',
      name: 'Budget Overrun Alert',
      decisionLogic: (context) => {
        const actual = context.getValue('total_expenses') || 0;
        const budget = context.getValue('total_budget') || Infinity;
        const variance = (actual - budget) / budget;

        return {
          decision: variance > 0.10 ? 'ALERT' : 'OK',
          confidence: 0.95,
          reasoning: `Variance: ${(variance * 100).toFixed(1)}%`,
          actions: variance > 0.10 ? ['notify_manager', 'create_report'] : []
        };
      }
    });

    // Cash flow warning
    const cashFlowAlert = new DecisionCell({
      id: 'cash_flow_warning',
      name: 'Cash Flow Warning',
      decisionLogic: (context) => {
        const cashPosition = context.getValue('operating_cash_flow') || 0;
        const forecast = context.getPrediction('cash_forecast');
        const projectedCash = forecast?.day30?.value || cashPosition;

        return {
          decision: projectedCash < 0 ? 'WARNING' : 'OK',
          confidence: 0.90,
          reasoning: `Projected cash: $${projectedCash.toFixed(2)}`,
          actions: projectedCash < 0 ? ['alert_treasury', 'reduce_expenses'] : []
        };
      }
    });

    // Revenue anomaly detection
    const revenueAnomaly = new DecisionCell({
      id: 'revenue_anomaly_alert',
      name: 'Revenue Anomaly Alert',
      decisionLogic: (context) => {
        const currentRevenue = context.getValue('total_revenue') || 0;
        const forecast = context.getPrediction('revenue_forecast');
        const expectedRevenue = forecast?.value || currentRevenue;
        const deviation = Math.abs(currentRevenue - expectedRevenue) / expectedRevenue;

        return {
          decision: deviation > 0.20 ? 'ANOMALY' : 'NORMAL',
          confidence: 0.85,
          reasoning: `Deviation: ${(deviation * 100).toFixed(1)}% from forecast`,
          actions: deviation > 0.20 ? ['investigate', 'update_forecast'] : []
        };
      }
    });

    this.colony.addCell(budgetAlert);
    this.colony.addCell(cashFlowAlert);
    this.colony.addCell(revenueAnomaly);
    this.decisionCells.set('budget_alert', budgetAlert);
    this.decisionCells.set('cash_alert', cashFlowAlert);
    this.decisionCells.set('revenue_anomaly', revenueAnomaly);
  }

  /**
   * Add a revenue source to the template
   */
  public addRevenueSource(source: RevenueSource): void {
    const cellId = `revenue_${source.id}`;

    const revenueCell = new InputCell({
      id: cellId,
      name: `${source.name} Revenue`,
      value: source.monthly,
      validator: (value) => {
        const monthly = value as { [month: string]: number };
        return Object.values(monthly).every(v => v >= 0 && v < 1000000000);
      },
      sensations: [
        {
          targetId: cellId,
          type: SensationType.RATE_OF_CHANGE,
          threshold: 0.15,
          interpretation: `${source.name} revenue changed by more than 15%`
        }
      ]
    });

    this.revenueCells.set(source.id, revenueCell);
    this.colony.addCell(revenueCell);

    // Log to consciousness
    this.consciousness.log({
      type: 'revenue_source_added',
      source: source.id,
      name: source.name,
      category: source.category
    });
  }

  /**
   * Add an expense category to the template
   */
  public addExpenseCategory(category: ExpenseCategory): void {
    const cellId = `expense_${category.id}`;

    const expenseCell = new InputCell({
      id: cellId,
      name: `${category.name} Expenses`,
      value: category.actual,
      validator: (value) => value >= 0 && value <= category.budget * 1.5,
      sensations: [
        {
          targetId: cellId,
          type: SensationType.ABSOLUTE_CHANGE,
          threshold: category.budget * 0.10,
          interpretation: `${category.name} expense changed by more than 10% of budget`
        }
      ]
    });

    this.expenseCells.set(category.id, expenseCell);
    this.colony.addCell(expenseCell);

    // Check budget variance
    const variance = (category.actual - category.budget) / category.budget;
    if (Math.abs(variance) > 0.10) {
      this.consciousness.log({
        type: 'budget_variance',
        category: category.id,
        variance: variance,
        interpretation: variance > 0 ? 'Over budget' : 'Under budget'
      });
    }
  }

  /**
   * Log a single expense item
   */
  public logExpense(categoryId: string, item: ExpenseItem): void {
    const cellId = `expense_${categoryId}`;
    const expenseCell = this.expenseCells.get(categoryId);

    if (expenseCell) {
      const currentTotal = expenseCell.getValue() as number;
      expenseCell.setValue(currentTotal + item.amount);
    }
  }

  /**
   * Set budget for a category
   */
  public setBudget(categoryId: string, budget: number): void {
    const expenseCell = this.expenseCells.get(categoryId);
    if (expenseCell) {
      expenseCell.setMetadata('budget', budget);
      this.consciousness.log({
        type: 'budget_set',
        category: categoryId,
        budget: budget
      });
    }
  }

  /**
   * Get revenue trend analysis
   */
  public getRevenueTrend(): any {
    const trendCell = this.analysisCells.get('revenue_trend');
    return trendCell?.analyze();
  }

  /**
   * Get variance alerts
   */
  public getVarianceAlerts(): any[] {
    const alerts: any[] = [];

    this.decisionCells.forEach((cell, id) => {
      const decision = cell.decide();
      if (decision.decision !== 'OK') {
        alerts.push({
          type: id,
          ...decision
        });
      }
    });

    return alerts;
  }

  /**
   * Get cash flow forecast
   */
  public getCashForecast(days: number): any {
    const forecastCell = this.predictionCells.get('cash');
    return forecastCell?.predict(days);
  }

  /**
   * Get financial ratios
   */
  public getFinancialRatios(): FinancialRatio[] {
    const ratios: FinancialRatio[] = [];

    const currentRatio = this.colony.getCell('current_ratio')?.getValue();
    const grossMargin = this.colony.getCell('gross_margin')?.getValue();
    const netProfitMargin = this.colony.getCell('net_profit_margin')?.getValue();

    if (currentRatio !== undefined) {
      ratios.push({
        name: 'Current Ratio',
        value: currentRatio,
        interpretation: currentRatio > 2 ? 'Strong liquidity' : currentRatio > 1 ? 'Adequate liquidity' : 'Poor liquidity',
        trend: 'stable'
      });
    }

    if (grossMargin !== undefined) {
      ratios.push({
        name: 'Gross Margin',
        value: grossMargin,
        interpretation: grossMargin > 0.5 ? 'Excellent' : grossMargin > 0.3 ? 'Good' : 'Needs improvement',
        trend: 'stable'
      });
    }

    if (netProfitMargin !== undefined) {
      ratios.push({
        name: 'Net Profit Margin',
        value: netProfitMargin,
        interpretation: netProfitMargin > 0.2 ? 'Excellent' : netProfitMargin > 0.1 ? 'Good' : 'Needs improvement',
        trend: 'stable'
      });
    }

    return ratios;
  }

  /**
   * Create a planning scenario
   */
  public createScenario(name: string): any {
    return {
      name: name,
      setRevenueGrowth: (rate: number) => {
        this.consciousness.log({
          type: 'scenario_param',
          scenario: name,
          param: 'revenue_growth',
          value: rate
        });
      },
      setExpenseReduction: (rate: number) => {
        this.consciousness.log({
          type: 'scenario_param',
          scenario: name,
          param: 'expense_reduction',
          value: rate
        });
      }
    };
  }

  /**
   * Run a scenario projection
   */
  public runScenario(scenario: any): any {
    const revenueForecast = this.predictionCells.get('revenue')?.predict(90);
    const expenseForecast = this.predictionCells.get('expenses')?.predict(60);

    return {
      revenue: revenueForecast,
      expenses: expenseForecast,
      netIncome: (revenueForecast?.value || 0) - (expenseForecast?.value || 0)
    };
  }

  /**
   * Add a custom financial ratio
   */
  public addCustomRatio(name: string, config: any): void {
    const customRatio = new TransformCell({
      id: `ratio_${name.toLowerCase().replace(/\s+/g, '_')}`,
      name: name,
      transformFunction: (inputs: Map<string, any>) => {
        const numerator = inputs.get(config.numerator[0]) || 0;
        const denominator = inputs.get(config.denominator[0]) || 1;
        return numerator / denominator;
      },
      sourceCellIds: [config.numerator[0], config.denominator[0]]
    });

    this.colony.addCell(customRatio);
    this.consciousness.log({
      type: 'custom_ratio_added',
      name: name,
      config: config
    });
  }

  /**
   * Enable multi-currency support
   */
  public enableMultiCurrency(currencies: string[]): void {
    this.consciousness.log({
      type: 'multi_currency_enabled',
      currencies: currencies
    });

    // Create currency conversion cells
    currencies.forEach(currency => {
      if (currency !== 'USD') {
        const conversionCell = new TransformCell({
          id: `convert_${currency}_to_usd`,
          name: `${currency} to USD`,
          transformFunction: (inputs: Map<string, any>) => {
            const amount = inputs.get(`amount_${currency}`) || 0;
            const rate = inputs.get(`rate_${currency}`) || 1;
            return amount * rate;
          },
          sourceCellIds: [`amount_${currency}`, `rate_${currency}`]
        });

        this.colony.addCell(conversionCell);
      }
    });
  }

  /**
   * Set exchange rate for currency
   */
  public setExchangeRate(currency: string, rate: number): void {
    const rateCell = new InputCell({
      id: `rate_${currency}`,
      name: `${currency} Exchange Rate`,
      value: rate,
      validator: (value) => value > 0
    });

    this.colony.addCell(rateCell);
    this.consciousness.log({
      type: 'exchange_rate_set',
      currency: currency,
      rate: rate
    });
  }

  /**
   * Get consciousness stream
   */
  public getConsciousness(): any[] {
    return this.consciousness.getStream();
  }

  /**
   * Export template state
   */
  public exportState(): any {
    return {
      revenue: Object.fromEntries(this.revenueCells),
      expenses: Object.fromEntries(this.expenseCells),
      analysis: Object.fromEntries(this.analysisCells),
      predictions: Object.fromEntries(this.predictionCells),
      decisions: Object.fromEntries(this.decisionCells),
      consciousness: this.consciousness.getStream()
    };
  }

  /**
   * Generate sample data for demonstration
   */
  public static generateSampleData(): FinancialTemplate {
    const template = new FinancialTemplate();

    // Add revenue sources
    template.addRevenueSource({
      id: 'product_sales',
      name: 'Product Sales',
      category: 'product',
      monthly: {
        january: 125000,
        february: 148000,
        march: 158000
      }
    });

    template.addRevenueSource({
      id: 'services',
      name: 'Consulting Services',
      category: 'service',
      monthly: {
        january: 45000,
        february: 52000,
        march: 58000
      }
    });

    template.addRevenueSource({
      id: 'subscriptions',
      name: 'SaaS Subscriptions',
      category: 'subscription',
      monthly: {
        january: 32000,
        february: 36500,
        march: 41000
      }
    });

    // Add expense categories
    template.addExpenseCategory({
      id: 'payroll',
      name: 'Payroll',
      budget: 150000,
      actual: 148500,
      items: []
    });

    template.addExpenseCategory({
      id: 'marketing',
      name: 'Marketing',
      budget: 50000,
      actual: 52000,
      items: []
    });

    template.addExpenseCategory({
      id: 'operations',
      name: 'Operations',
      budget: 35000,
      actual: 33800,
      items: []
    });

    return template;
  }
}
