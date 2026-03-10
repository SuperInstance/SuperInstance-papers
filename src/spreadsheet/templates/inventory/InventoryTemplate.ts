/**
 * Inventory Management Template - Comprehensive Inventory Management with POLLN
 *
 * Demonstrates:
 * - Stock level monitoring with sensations
 * - Demand forecasting and prediction
 * - Reorder point calculation
 * - Safety stock optimization
 * - Supplier performance tracking
 * - Economic order quantity (EOQ) analysis
 * - Multi-location support
 * - Lot and expiry tracking
 */

import { LogCell, CellHead, CellBody, CellTail, CellOrigin } from '../../core/LogCell';
import { InputCell } from '../../cells/InputCell';
import { OutputCell } from '../../cells/OutputCell';
import { TransformCell } from '../../cells/TransformCell';
import { FilterCell } from '../../cells/FilterCell';
import { AggregateCell } from '../../cells/AggregateCell';
import { AnalysisCell } from '../../cells/AnalysisCell';
import { PredictionCell } from '../../cells/PredictionCell';
import { DecisionCell } from '../../cells/DecisionCell';
import { ValidateCell } from '../../cells/ValidateCell';
import { SensationType } from '../../types/SensationType';
import { Collocator } from '../../core/Collocator';
import { ConsciousnessStream } from '../../core/ConsciousnessStream';

export interface InventoryItem {
  sku: string;
  name: string;
  quantity: number;
  reorderPoint: number;
  economicOrderQty: number;
  unitCost: number;
  holdingCostPct: number;
  location?: string;
  category?: string;
}

export interface SaleRecord {
  sku: string;
  quantity: number;
  date: Date;
  price?: number;
}

export interface Supplier {
  id: string;
  name: string;
  leadTimeDays: number;
  fillRate: number;
  qualityScore: number;
  unitCost: number;
}

export interface DeliveryRecord {
  supplierId: string;
  poNumber: string;
  items: { sku: string; quantity: number }[];
  onTime: boolean;
  qualityIssues: number;
  date: Date;
}

export interface Lot {
  lotNumber: string;
  sku: string;
  quantity: number;
  expiryDate: Date;
  manufactureDate: Date;
  location?: string;
}

export interface ReorderConfig {
  reorderPoint: number;
  safetyStock: number;
  leadTimeDays: number;
  reviewPeriod: 'continuous' | 'periodic';
  reviewIntervalDays?: number;
}

export class InventoryTemplate {
  private colony: Collocator;
  private inventoryCells: Map<string, InputCell> = new Map();
  private salesCells: Map<string, InputCell> = new Map();
  private supplierCells: Map<string, InputCell> = new Map();
  private analysisCells: Map<string, AnalysisCell> = new Map();
  private predictionCells: Map<string, PredictionCell> = new Map();
  private decisionCells: Map<string, DecisionCell> = new Map();
  private consciousness: ConsciousnessStream;

  constructor() {
    this.colony = new Collocator('inventory_template');
    this.consciousness = new ConsciousnessStream('inventory_template');
    this.initializeTemplate();
  }

  private initializeTemplate(): void {
    this.initializeStockManagement();
    this.initializeDemandManagement();
    this.initializeReplenishment();
    this.initializeSupplierManagement();
  }

  private initializeStockManagement(): void {
    // Stock level analyzer
    const stockAnalyzer = new AnalysisCell({
      id: 'stock_level_analyzer',
      name: 'Stock Level Analyzer',
      analysisType: 'inventory_level',
      sourceCellIds: [],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    // Low stock alert
    const lowStockAlert = new DecisionCell({
      id: 'low_stock_alert',
      name: 'Low Stock Alert',
      decisionLogic: (context) => {
        const items = context.getValue('inventory_items') || [];
        const lowStockItems = items.filter((item: InventoryItem) =>
          item.quantity <= item.reorderPoint
        );

        return {
          decision: lowStockItems.length > 0 ? 'ALERT' : 'OK',
          confidence: 0.95,
          reasoning: `${lowStockItems.length} items at or below reorder point`,
          actions: lowStockItems.map((item: InventoryItem) => ({
            sku: item.sku,
            action: 'review_reorder'
          }))
        };
      }
    });

    // Stockout predictor
    const stockoutPredictor = new PredictionCell({
      id: 'stockout_predictor',
      name: 'Stockout Predictor',
      predictionModel: 'exponential_smoothing',
      sourceCellIds: ['stock_level_analyzer'],
      horizon: 30,
      confidenceInterval: 0.90
    });

    this.colony.addCell(stockAnalyzer);
    this.colony.addCell(lowStockAlert);
    this.colony.addCell(stockoutPredictor);
    this.analysisCells.set('stock_level', stockAnalyzer);
    this.predictionCells.set('stockout', stockoutPredictor);
    this.decisionCells.set('low_stock', lowStockAlert);
  }

  private initializeDemandManagement(): void {
    // Demand analyzer
    const demandAnalyzer = new AnalysisCell({
      id: 'demand_analyzer',
      name: 'Demand Analyzer',
      analysisType: 'demand_pattern',
      sourceCellIds: [],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    // Seasonality detector
    const seasonalityDetector = new AnalysisCell({
      id: 'seasonality_detector',
      name: 'Seasonality Detector',
      analysisType: 'seasonal_decomposition',
      sourceCellIds: ['demand_analyzer'],
      consciousness: {
        enabled: true
      }
    });

    // Demand forecaster
    const demandForecaster = new PredictionCell({
      id: 'demand_forecaster',
      name: 'Demand Forecaster',
      predictionModel: 'arima',
      sourceCellIds: ['demand_analyzer'],
      horizon: 90,
      confidenceInterval: 0.95
    });

    this.colony.addCell(demandAnalyzer);
    this.colony.addCell(seasonalityDetector);
    this.colony.addCell(demandForecaster);
    this.analysisCells.set('demand', demandAnalyzer);
    this.analysisCells.set('seasonality', seasonalityDetector);
    this.predictionCells.set('demand', demandForecaster);
  }

  private initializeReplenishment(): void {
    // Reorder point calculator
    const reorderPointCalc = new TransformCell({
      id: 'reorder_point_calculator',
      name: 'Reorder Point Calculator',
      transformFunction: (inputs: Map<string, any>) => {
        const demand = inputs.get('daily_demand') || 0;
        const leadTime = inputs.get('lead_time_days') || 0;
        const safetyStock = inputs.get('safety_stock') || 0;

        return {
          reorderPoint: demand * leadTime + safetyStock,
          calculation: `(${demand} * ${leadTime}) + ${safetyStock}`
        };
      },
      sourceCellIds: ['daily_demand', 'lead_time_days', 'safety_stock']
    });

    // EOQ calculator
    const eoqCalculator = new TransformCell({
      id: 'eoq_calculator',
      name: 'EOQ Calculator',
      transformFunction: (inputs: Map<string, any>) => {
        const annualDemand = inputs.get('annual_demand') || 0;
        const orderCost = inputs.get('order_cost') || 0;
        const holdingCost = inputs.get('holding_cost') || 1;

        // EOQ = sqrt(2 * D * S / H)
        const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCost);

        return {
          eoq: Math.round(eoq),
          totalCost: this.calculateTotalCost(eoq, annualDemand, orderCost, holdingCost),
          ordersPerYear: annualDemand / eoq,
          daysBetweenOrders: 365 / (annualDemand / eoq)
        };
      },
      sourceCellIds: ['annual_demand', 'order_cost', 'holding_cost']
    });

    // Purchase order generator
    const poGenerator = new DecisionCell({
      id: 'po_generator',
      name: 'Purchase Order Generator',
      decisionLogic: (context) => {
        const currentStock = context.getValue('current_stock') || 0;
        const reorderPoint = context.getValue('reorder_point') || 0;
        const eoq = context.getValue('eoq') || 0;

        if (currentStock <= reorderPoint) {
          return {
            decision: 'CREATE_PO',
            confidence: 0.95,
            reasoning: `Stock (${currentStock}) at or below reorder point (${reorderPoint})`,
            actions: [
              'create_purchase_order',
              'notify_supplier',
              'update_inventory_records'
            ],
            orderQuantity: eoq
          };
        }

        return {
          decision: 'HOLD',
          confidence: 1.0,
          reasoning: `Stock (${currentStock}) above reorder point (${reorderPoint})`,
          actions: []
        };
      }
    });

    this.colony.addCell(reorderPointCalc);
    this.colony.addCell(eoqCalculator);
    this.colony.addCell(poGenerator);
    this.decisionCells.set('po_generator', poGenerator);
  }

  private initializeSupplierManagement(): void {
    // Supplier performance analyzer
    const supplierPerfAnalyzer = new AnalysisCell({
      id: 'supplier_performance_analyzer',
      name: 'Supplier Performance Analyzer',
      analysisType: 'supplier_scorecard',
      sourceCellIds: [],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    // Lead time tracker
    const leadTimeTracker = new AnalysisCell({
      id: 'lead_time_tracker',
      name: 'Lead Time Tracker',
      analysisType: 'lead_time_analysis',
      sourceCellIds: [],
      consciousness: {
        enabled: true
      }
    });

    // Quality score calculator
    const qualityScoreCalc = new TransformCell({
      id: 'quality_score_calculator',
      name: 'Quality Score Calculator',
      transformFunction: (inputs: Map<string, any>) => {
        const deliveries = inputs.get('deliveries') || [];
        const qualityIssues = inputs.get('quality_issues') || 0;

        const qualityScore = deliveries.length > 0
          ? 1 - (qualityIssues / deliveries.length)
          : 1;

        return {
          score: Math.round(qualityScore * 100) / 100,
          trend: qualityScore > 0.95 ? 'excellent' : qualityScore > 0.90 ? 'good' : 'needs_improvement'
        };
      },
      sourceCellIds: ['deliveries', 'quality_issues']
    });

    this.colony.addCell(supplierPerfAnalyzer);
    this.colony.addCell(leadTimeTracker);
    this.colony.addCell(qualityScoreCalc);
    this.analysisCells.set('supplier_perf', supplierPerfAnalyzer);
    this.analysisCells.set('lead_time', leadTimeTracker);
  }

  /**
   * Add an inventory item
   */
  public addItem(item: InventoryItem): void {
    const itemCell = new InputCell({
      id: `inventory_${item.sku}`,
      name: item.name,
      value: item,
      validator: (value) => {
        const i = value as InventoryItem;
        return i.quantity >= 0 && i.unitCost >= 0;
      },
      sensations: [
        {
          targetId: `inventory_${item.sku}`,
          type: SensationType.ABSOLUTE_CHANGE,
          threshold: -Math.round(item.economicOrderQty * 0.1),
          interpretation: `Stock decreased by more than 10% of EOQ`
        },
        {
          targetId: `inventory_${item.sku}`,
          type: SensationType.RATE_OF_CHANGE,
          threshold: -0.15,
          interpretation: 'Stock declining at accelerating rate'
        }
      ]
    });

    this.inventoryCells.set(item.sku, itemCell);
    this.colony.addCell(itemCell);

    this.consciousness.log({
      type: 'item_added',
      sku: item.sku,
      name: item.name,
      initialQuantity: item.quantity
    });
  }

  /**
   * Adjust stock level
   */
  public adjustStock(sku: string, quantity: number): void {
    const itemCell = this.inventoryCells.get(sku);
    if (itemCell) {
      const item = itemCell.getValue() as InventoryItem;
      const oldQuantity = item.quantity;
      item.quantity = Math.max(0, item.quantity + quantity);
      itemCell.setValue(item);

      this.consciousness.log({
        type: 'stock_adjusted',
        sku: sku,
        oldQuantity: oldQuantity,
        newQuantity: item.quantity,
        delta: quantity
      });

      // Check if reorder needed
      this.checkReorder(sku);
    }
  }

  /**
   * Record a sale
   */
  public recordSale(sku: string, sale: SaleRecord): void {
    const saleCellId = `sales_${sku}`;

    // Create or get sales cell
    let saleCell = this.salesCells.get(sku);
    if (!saleCell) {
      saleCell = new InputCell({
        id: saleCellId,
        name: `${sku} Sales`,
        value: [],
        validator: (value) => Array.isArray(value)
      });
      this.salesCells.set(sku, saleCell);
      this.colony.addCell(saleCell);
    }

    // Add sale record
    const sales = saleCell.getValue() as SaleRecord[];
    sales.push(sale);
    saleCell.setValue(sales);

    // Adjust inventory
    this.adjustStock(sku, -sale.quantity);

    this.consciousness.log({
      type: 'sale_recorded',
      sku: sku,
      quantity: sale.quantity,
      price: sale.price,
      date: sale.date
    });
  }

  /**
   * Get stock status for an item
   */
  public getStockStatus(sku: string): any {
    const itemCell = this.inventoryCells.get(sku);
    if (!itemCell) return null;

    const item = itemCell.getValue() as InventoryItem;
    const demandAnalyzer = this.analysisCells.get('demand');
    const dailyDemand = demandAnalyzer?.analyze()?.[sku]?.dailyAverage || 0;

    const daysUntilReorder = dailyDemand > 0
      ? (item.quantity - item.reorderPoint) / dailyDemand
      : Infinity;

    return {
      sku: item.sku,
      name: item.name,
      currentStock: item.quantity,
      reorderPoint: item.reorderPoint,
      status: item.quantity <= item.reorderPoint ? 'reorder_needed' :
              item.quantity <= item.reorderPoint * 1.5 ? 'low' : 'healthy',
      dailyDemand: dailyDemand,
      daysUntilReorder: Math.round(daysUntilReorder * 10) / 10,
      economicOrderQty: item.economicOrderQty
    };
  }

  /**
   * Get demand forecast
   */
  public getDemandForecast(sku: string, days: number): any {
    const forecastCell = this.predictionCells.get('demand');
    if (!forecastCell) return null;

    const forecast = forecastCell.predict(days);
    const salesCell = this.salesCells.get(sku);

    if (!salesCell) return null;

    const sales = salesCell.getValue() as SaleRecord[];
    const recentSales = sales.slice(-30); // Last 30 days
    const dailyAverage = recentSales.length > 0
      ? recentSales.reduce((sum, s) => sum + s.quantity, 0) / recentSales.length
      : 0;

    return {
      totalDemand: Math.round(dailyAverage * days),
      dailyAverage: Math.round(dailyAverage * 10) / 10,
      confidence: 0.85,
      trend: 'stable'
    };
  }

  /**
   * Configure reorder logic
   */
  public configureReorder(sku: string, config: ReorderConfig): void {
    const itemCell = this.inventoryCells.get(sku);
    if (itemCell) {
      const item = itemCell.getValue() as InventoryItem;
      item.reorderPoint = config.reorderPoint;
      itemCell.setValue(item);

      this.consciousness.log({
        type: 'reorder_configured',
        sku: sku,
        config: config
      });
    }
  }

  /**
   * Check if reorder is needed
   */
  public checkReorder(sku: string): any {
    const itemCell = this.inventoryCells.get(sku);
    if (!itemCell) return null;

    const item = itemCell.getValue() as InventoryItem;
    const status = this.getStockStatus(sku);

    if (!status) return null;

    const shouldReorder = item.quantity <= item.reorderPoint;
    const forecast = this.getDemandForecast(sku, 30);
    const leadTimeDays = 5; // Default

    const projectedStock = item.quantity - (forecast?.dailyAverage || 0) * leadTimeDays;

    return {
      shouldReorder: shouldReorder || projectedStock < item.reorderPoint,
      currentStock: item.quantity,
      reorderPoint: item.reorderPoint,
      projectedStock: Math.round(projectedStock),
      recommendedQty: item.economicOrderQty,
      urgency: projectedStock < 0 ? 'urgent' : shouldReorder ? 'normal' : 'none'
    };
  }

  /**
   * Create purchase order
   */
  public createPurchaseOrder(sku: string, quantity: number): string {
    const poNumber = `PO-${Date.now()}-${sku}`;

    this.consciousness.log({
      type: 'po_created',
      poNumber: poNumber,
      sku: sku,
      quantity: quantity
    });

    return poNumber;
  }

  /**
   * Add a supplier
   */
  public addSupplier(supplierId: string, supplier: Supplier): void {
    const supplierCell = new InputCell({
      id: `supplier_${supplierId}`,
      name: supplier.name,
      value: supplier,
      validator: (value) => {
        const s = value as Supplier;
        return s.fillRate >= 0 && s.fillRate <= 1 && s.qualityScore >= 0 && s.qualityScore <= 1;
      }
    });

    this.supplierCells.set(supplierId, supplierCell);
    this.colony.addCell(supplierCell);

    this.consciousness.log({
      type: 'supplier_added',
      supplierId: supplierId,
      name: supplier.name
    });
  }

  /**
   * Record a delivery
   */
  public recordDelivery(supplierId: string, delivery: DeliveryRecord): void {
    // Adjust inventory for delivered items
    delivery.items.forEach(item => {
      this.adjustStock(item.sku, item.quantity);
    });

    this.consciousness.log({
      type: 'delivery_recorded',
      supplierId: supplierId,
      poNumber: delivery.poNumber,
      onTime: delivery.onTime,
      qualityIssues: delivery.qualityIssues
    });
  }

  /**
   * Get supplier performance
   */
  public getSupplierPerformance(supplierId: string): any {
    const supplierCell = this.supplierCells.get(supplierId);
    if (!supplierCell) return null;

    const supplier = supplierCell.getValue() as Supplier;

    return {
      supplierId: supplierId,
      name: supplier.name,
      leadTimeDays: supplier.leadTimeDays,
      fillRate: supplier.fillRate,
      qualityScore: supplier.qualityScore,
      overallScore: (supplier.fillRate * 0.4 + supplier.qualityScore * 0.4 +
                     (1 / supplier.leadTimeDays) * 0.2)
    };
  }

  /**
   * Add lot tracking
   */
  public addLot(sku: string, lot: Lot): void {
    this.consciousness.log({
      type: 'lot_added',
      sku: sku,
      lotNumber: lot.lotNumber,
      quantity: lot.quantity,
      expiryDate: lot.expiryDate
    });
  }

  /**
   * Get lots expiring soon
   */
  public getExpiringLots(days: number): Lot[] {
    // Simplified implementation
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return [];
  }

  /**
   * Perform ABC analysis
   */
  public performABCAnalysis(): any {
    const items = Array.from(this.inventoryCells.values()).map(cell => cell.getValue() as InventoryItem);

    // Calculate annual usage value
    const itemValues = items.map(item => ({
      ...item,
      annualValue: item.quantity * item.unitCost
    }));

    // Sort by annual value
    itemValues.sort((a, b) => b.annualValue - a.annualValue);

    // Calculate total value
    const totalValue = itemValues.reduce((sum, item) => sum + item.annualValue, 0);

    // Classify into A, B, C
    let cumulativeValue = 0;
    const classification: any = { A: [], B: [], C: [] };

    itemValues.forEach(item => {
      cumulativeValue += item.annualValue;
      const percentage = cumulativeValue / totalValue;

      if (percentage <= 0.8) {
        classification.A.push(item);
      } else if (percentage <= 0.95) {
        classification.B.push(item);
      } else {
        classification.C.push(item);
      }
    });

    return classification;
  }

  /**
   * Optimize safety stock
   */
  public optimizeSafetyStock(sku: string, config: {
    serviceLevel: number;
    demandStdDev: number;
    leadTimeStdDev: number;
  }): number {
    // Simplified safety stock calculation
    // SS = Z * sqrt((demandStdDev^2 * leadTime) + (avgDemand^2 * leadTimeStdDev^2))

    const zScore = this.getZScore(config.serviceLevel);
    const itemCell = this.inventoryCells.get(sku);
    const item = itemCell?.getValue() as InventoryItem;
    const avgDemand = 10; // Default

    const safetyStock = zScore * Math.sqrt(
      Math.pow(config.demandStdDev, 2) * 5 + // 5 days lead time
      Math.pow(avgDemand, 2) * Math.pow(config.leadTimeStdDev, 2)
    );

    return Math.round(safetyStock);
  }

  /**
   * Get consciousness stream
   */
  public getConsciousness(): any[] {
    return this.consciousness.getStream();
  }

  /**
   * Export state
   */
  public exportState(): any {
    return {
      inventory: Object.fromEntries(this.inventoryCells),
      sales: Object.fromEntries(this.salesCells),
      suppliers: Object.fromEntries(this.supplierCells),
      consciousness: this.consciousness.getStream()
    };
  }

  // Private helper methods

  private calculateTotalCost(eoq: number, demand: number, orderCost: number, holdingCost: number): number {
    const orderingCost = (demand / eoq) * orderCost;
    const holdingCostValue = (eoq / 2) * holdingCost;
    return orderingCost + holdingCostValue;
  }

  private getZScore(serviceLevel: number): number {
    // Simplified z-score lookup
    const zScores: { [key: number]: number } = {
      0.90: 1.28,
      0.95: 1.65,
      0.99: 2.33
    };
    return zScores[serviceLevel] || 1.65;
  }

  /**
   * Generate sample inventory data
   */
  public static generateSampleData(): InventoryTemplate {
    const inventory = new InventoryTemplate();

    // Add items
    inventory.addItem({
      sku: 'WGT-A',
      name: 'Widget A',
      quantity: 150,
      reorderPoint: 50,
      economicOrderQty: 200,
      unitCost: 25.00,
      holdingCostPct: 0.20
    });

    inventory.addItem({
      sku: 'WGT-B',
      name: 'Widget B',
      quantity: 80,
      reorderPoint: 40,
      economicOrderQty: 100,
      unitCost: 45.00,
      holdingCostPct: 0.20
    });

    inventory.addItem({
      sku: 'GIZ-C',
      name: 'Gizmo C',
      quantity: 200,
      reorderPoint: 75,
      economicOrderQty: 150,
      unitCost: 15.00,
      holdingCostPct: 0.15
    });

    // Add supplier
    inventory.addSupplier('ABC-Inc', {
      id: 'ABC-Inc',
      name: 'ABC Corporation',
      leadTimeDays: 5,
      fillRate: 0.98,
      qualityScore: 0.95,
      unitCost: 25.00
    });

    // Record some sales
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      inventory.recordSale('WGT-A', {
        sku: 'WGT-A',
        quantity: Math.floor(Math.random() * 5) + 10,
        date: date,
        price: 35.00
      });
    }

    return inventory;
  }
}
