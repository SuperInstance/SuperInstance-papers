/**
 * Analytics Dashboard Template - Comprehensive Analytics with POLLN
 *
 * Demonstrates:
 * - Multi-source data ingestion
 * - Transformation pipeline (ETL)
 * - Real-time aggregation
 * - KPI calculation and tracking
 * - Trend analysis
 * - Anomaly detection
 * - Predictive forecasting
 * - Alert generation
 * - Report generation
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

export interface DataSource {
  id: string;
  type: 'database' | 'api' | 'file' | 'stream' | 'spreadsheet';
  connection: string;
  query?: string;
  refreshInterval?: number; // seconds
  schema?: any;
}

export interface KPI {
  id: string;
  name: string;
  calculation: string;
  groupBy?: string[];
  thresholds?: {
    warning?: number;
    critical?: number;
  };
  format?: 'currency' | 'percentage' | 'number' | 'duration';
}

export interface Alert {
  id: string;
  name: string;
  kpi: string;
  condition: 'above_threshold' | 'below_threshold' | 'rate_of_change' | 'anomaly';
  threshold?: number;
  severity: 'info' | 'warning' | 'critical';
  actions: string[];
  recipients?: string[];
  cooldown?: number; // seconds
}

export interface FunnelStep {
  step: string;
  kpi: string;
  filter?: any;
}

export interface CohortConfig {
  groupBy: string;
  metric: string;
  periods: number[];
}

export class AnalyticsTemplate {
  private colony: Collocator;
  private dataSources: Map<string, InputCell> = new Map();
  private kpiCells: Map<string, TransformCell> = new Map();
  private aggregationCells: Map<string, AggregateCell> = new Map();
  private analysisCells: Map<string, AnalysisCell> = new Map();
  private predictionCells: Map<string, PredictionCell> = new Map();
  private alertCells: Map<string, DecisionCell> = new Map();
  private consciousness: ConsciousnessStream;

  constructor() {
    this.colony = new Collocator('analytics_template');
    this.consciousness = new ConsciousnessStream('analytics_template');
    this.initializeTemplate();
  }

  private initializeTemplate(): void {
    this.initializeDataLayer();
    this.initializeProcessingLayer();
    this.initializeAnalyticsLayer();
    this.initializePresentationLayer();
  }

  private initializeDataLayer(): void {
    // Data quality validator
    const dataQualityValidator = new ValidateCell({
      id: 'data_quality_validator',
      name: 'Data Quality Validator',
      validationRules: [
        { field: 'completeness', rule: '>= 0.95' },
        { field: 'accuracy', rule: '>= 0.98' },
        { field: 'timeliness', rule: '<= 300' } // 5 minutes
      ]
    });

    this.colony.addCell(dataQualityValidator);

    this.consciousness.log({
      type: 'layer_initialized',
      layer: 'data'
    });
  }

  private initializeProcessingLayer(): void {
    // Time series aggregator
    const timeSeriesAggregator = new AggregateCell({
      id: 'time_series_aggregator',
      name: 'Time Series Aggregator',
      aggregationType: 'sum',
      sourceCellIds: [],
      groupBy: ['timestamp'],
      sensations: [
        {
          targetId: 'time_series_aggregator',
          type: SensationType.RATE_OF_CHANGE,
          threshold: 0.20,
          interpretation: 'Time series values changed significantly'
        }
      ]
    });

    // Data transformer
    const dataTransformer = new TransformCell({
      id: 'data_transformer',
      name: 'Data Transformer',
      transformFunction: (inputs: Map<string, any>) => {
        const rawData = inputs.get('raw_data') || [];
        return rawData.map((item: any) => this.transformData(item));
      },
      sourceCellIds: [],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    this.colony.addCell(timeSeriesAggregator);
    this.colony.addCell(dataTransformer);
    this.aggregationCells.set('time_series', timeSeriesAggregator);

    this.consciousness.log({
      type: 'layer_initialized',
      layer: 'processing'
    });
  }

  private initializeAnalyticsLayer(): void {
    // Trend analyzer
    const trendAnalyzer = new AnalysisCell({
      id: 'trend_analyzer',
      name: 'Trend Analyzer',
      analysisType: 'trend',
      sourceCellIds: ['time_series_aggregator'],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    // Anomaly detector
    const anomalyDetector = new AnalysisCell({
      id: 'anomaly_detector',
      name: 'Anomaly Detector',
      analysisType: 'anomaly_detection',
      sourceCellIds: ['time_series_aggregator'],
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    // Predictor
    const predictor = new PredictionCell({
      id: 'predictor',
      name: 'Predictor',
      predictionModel: 'exponential_smoothing',
      sourceCellIds: ['time_series_aggregator'],
      horizon: 30,
      confidenceInterval: 0.95
    });

    this.colony.addCell(trendAnalyzer);
    this.colony.addCell(anomalyDetector);
    this.colony.addCell(predictor);
    this.analysisCells.set('trend', trendAnalyzer);
    this.analysisCells.set('anomaly', anomalyDetector);
    this.predictionCells.set('default', predictor);

    this.consciousness.log({
      type: 'layer_initialized',
      layer: 'analytics'
    });
  }

  private initializePresentationLayer(): void {
    // Dashboard aggregator
    const dashboardAggregator = new AggregateCell({
      id: 'dashboard_aggregator',
      name: 'Dashboard Aggregator',
      aggregationType: 'composite',
      sourceCellIds: ['trend_analyzer', 'anomaly_detector', 'predictor']
    });

    // Alert manager
    const alertManager = new DecisionCell({
      id: 'alert_manager',
      name: 'Alert Manager',
      decisionLogic: (context) => {
        const anomalies = context.getValue('anomalies') || [];
        const criticalAnomalies = anomalies.filter((a: any) => a.severity === 'critical');

        return {
          decision: criticalAnomalies.length > 0 ? 'ALERT' : 'OK',
          confidence: 0.95,
          reasoning: `${criticalAnomalies.length} critical anomalies detected`,
          actions: criticalAnomalies.length > 0 ? ['send_alerts', 'log_incident'] : []
        };
      }
    });

    // Report generator
    const reportGenerator = new TransformCell({
      id: 'report_generator',
      name: 'Report Generator',
      transformFunction: (inputs: Map<string, any>) => {
        return this.generateReport(inputs);
      },
      sourceCellIds: ['dashboard_aggregator']
    });

    this.colony.addCell(dashboardAggregator);
    this.colony.addCell(alertManager);
    this.colony.addCell(reportGenerator);
    this.alertCells.set('manager', alertManager);

    this.consciousness.log({
      type: 'layer_initialized',
      layer: 'presentation'
    });
  }

  /**
   * Add a data source
   */
  public addDataSource(id: string, config: DataSource): void {
    const sourceCell = new InputCell({
      id: `source_${id}`,
      name: `${id} Data Source`,
      value: [],
      validator: (data) => this.validateData(data, config.schema),
      sensations: [
        {
          targetId: `source_${id}`,
          type: SensationType.ABSOLUTE_CHANGE,
          threshold: 1,
          interpretation: 'New data received'
        }
      ]
    });

    this.dataSources.set(id, sourceCell);
    this.colony.addCell(sourceCell);

    this.consciousness.log({
      type: 'data_source_added',
      id: id,
      type: config.type,
      connection: config.connection
    });
  }

  /**
   * Ingest data from a source
   */
  public ingestData(sourceId: string, data: any[]): void {
    const sourceCell = this.dataSources.get(sourceId);
    if (sourceCell) {
      sourceCell.setValue(data);

      this.consciousness.log({
        type: 'data_ingested',
        source: sourceId,
        recordCount: data.length,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Add a KPI
   */
  public addKPI(id: string, config: KPI): void {
    const kpiCell = new TransformCell({
      id: `kpi_${id}`,
      name: config.name,
      transformFunction: (inputs: Map<string, any>) => {
        return this.calculateKPI(config.calculation, inputs);
      },
      sourceCellIds: Array.from(this.dataSources.keys()).map(s => `source_${s}`),
      consciousness: {
        enabled: true,
        logReasoning: true
      }
    });

    this.kpiCells.set(id, kpiCell);
    this.colony.addCell(kpiCell);

    // Add aggregation if groupBy specified
    if (config.groupBy && config.groupBy.length > 0) {
      const aggCell = new AggregateCell({
        id: `kpi_agg_${id}`,
        name: `${config.name} (Aggregated)`,
        aggregationType: 'sum',
        sourceCellIds: [`kpi_${id}`],
        groupBy: config.groupBy,
        sensations: config.thresholds ? [
          {
            targetId: `kpi_agg_${id}`,
            type: SensationType.RATE_OF_CHANGE,
            threshold: config.thresholds.warning || 0.10,
            interpretation: `KPI ${id} exceeded warning threshold`
          }
        ] : []
      });

      this.aggregationCells.set(id, aggCell);
      this.colony.addCell(aggCell);
    }

    this.consciousness.log({
      type: 'kpi_added',
      id: id,
      name: config.name,
      calculation: config.calculation
    });
  }

  /**
   * Add an alert
   */
  public addAlert(id: string, config: Alert): void {
    const alertCell = new DecisionCell({
      id: `alert_${id}`,
      name: config.name,
      decisionLogic: (context) => {
        const kpiValue = context.getValue(`kpi_${config.kpi}`);
        const threshold = config.threshold;

        let triggered = false;
        let reasoning = '';

        switch (config.condition) {
          case 'above_threshold':
            triggered = kpiValue > threshold;
            reasoning = `KPI ${config.kpi} (${kpiValue}) above threshold (${threshold})`;
            break;
          case 'below_threshold':
            triggered = kpiValue < threshold;
            reasoning = `KPI ${config.kpi} (${kpiValue}) below threshold (${threshold})`;
            break;
          case 'rate_of_change':
            const previousValue = context.getValue(`kpi_${config.kpi}_previous`);
            const rateOfChange = (kpiValue - previousValue) / previousValue;
            triggered = Math.abs(rateOfChange) > threshold;
            reasoning = `KPI ${config.kpi} changed by ${(rateOfChange * 100).toFixed(1)}%`;
            break;
          case 'anomaly':
            const anomalyScore = context.getValue(`anomaly_score_${config.kpi}`);
            triggered = anomalyScore > threshold;
            reasoning = `Anomaly detected in ${config.kpi} (score: ${anomalyScore})`;
            break;
        }

        return {
          decision: triggered ? 'ALERT' : 'OK',
          confidence: 0.90,
          reasoning: reasoning,
          actions: triggered ? config.actions : []
        };
      }
    });

    this.alertCells.set(id, alertCell);
    this.colony.addCell(alertCell);

    this.consciousness.log({
      type: 'alert_added',
      id: id,
      kpi: config.kpi,
      condition: config.condition,
      severity: config.severity
    });
  }

  /**
   * Check all alerts
   */
  public checkAlerts(): any[] {
    const alerts: any[] = [];

    this.alertCells.forEach((cell, id) => {
      const result = cell.decide();
      if (result.decision === 'ALERT') {
        alerts.push({
          id: id,
          ...result,
          timestamp: new Date()
        });
      }
    });

    return alerts;
  }

  /**
   * Get dashboard data
   */
  public getDashboardData(): any {
    const dashboard: any = {
      kpis: {},
      trends: {},
      anomalies: [],
      predictions: {}
    };

    // Collect KPI values
    this.kpiCells.forEach((cell, id) => {
      dashboard.kpis[id] = cell.getValue();
    });

    // Collect trends
    const trendAnalyzer = this.analysisCells.get('trend');
    if (trendAnalyzer) {
      dashboard.trends = trendAnalyzer.analyze();
    }

    // Collect anomalies
    const anomalyDetector = this.analysisCells.get('anomaly');
    if (anomalyDetector) {
      dashboard.anomalies = anomalyDetector.analyze();
    }

    // Collect predictions
    const predictor = this.predictionCells.get('default');
    if (predictor) {
      dashboard.predictions = predictor.predict(30);
    }

    return dashboard;
  }

  /**
   * Create a funnel
   */
  public createFunnel(id: string, steps: FunnelStep[]): any {
    const funnel: any = {
      id: id,
      steps: steps,
      analyze: () => this.analyzeFunnel(steps)
    };

    this.consciousness.log({
      type: 'funnel_created',
      id: id,
      steps: steps.length
    });

    return funnel;
  }

  /**
   * Analyze a funnel
   */
  private analyzeFunnel(steps: FunnelStep[]): any {
    const analysis: any = {
      conversionRates: [],
      dropoffs: [],
      totalDropoff: 0
    };

    let previousCount = 0;

    steps.forEach((step, index) => {
      const kpiCell = this.kpiCells.get(step.kpi);
      if (kpiCell) {
        const count = kpiCell.getValue() as number;

        if (index === 0) {
          previousCount = count;
        } else {
          const conversionRate = count / previousCount;
          const dropoff = previousCount - count;

          analysis.conversionRates.push({
            from: steps[index - 1].step,
            to: step.step,
            rate: conversionRate
          });

          analysis.dropoffs.push({
            step: step.step,
            count: dropoff,
            percentage: dropoff / previousCount
          });

          previousCount = count;
        }
      }
    });

    analysis.totalDropoff = steps[0] ? (this.kpiCells.get(steps[0].kpi)?.getValue() || 0) - previousCount : 0;

    return analysis;
  }

  /**
   * Create a cohort
   */
  public createCohort(id: string, config: CohortConfig): any {
    const cohort: any = {
      id: id,
      config: config,
      analyze: () => this.analyzeCohort(config)
    };

    this.consciousness.log({
      type: 'cohort_created',
      id: id,
      groupBy: config.groupBy
    });

    return cohort;
  }

  /**
   * Analyze a cohort
   */
  private analyzeCohort(config: CohortConfig): any {
    // Simplified cohort analysis
    // In production, would use more sophisticated algorithms
    return {
      curves: [],
      best: null,
      worst: null
    };
  }

  /**
   * Generate a report
   */
  public generateReport(config: {
    type: string;
    period: string;
    include: string[];
    format: string;
  }): any {
    const dashboard = this.getDashboardData();

    const report: any = {
      type: config.type,
      period: config.period,
      generated: new Date(),
      summary: {
        totalKPIs: Object.keys(dashboard.kpis).length,
        anomalies: dashboard.anomalies.length,
        trend: dashboard.trends.direction || 'stable'
      },
      data: {}
    };

    if (config.include.includes('kpis')) {
      report.data.kpis = dashboard.kpis;
    }

    if (config.include.includes('trends')) {
      report.data.trends = dashboard.trends;
    }

    if (config.include.includes('anomalies')) {
      report.data.anomalies = dashboard.anomalies;
    }

    this.consciousness.log({
      type: 'report_generated',
      type: config.type,
      period: config.period
    });

    return report;
  }

  /**
   * Send a report
   */
  public sendReport(report: any, config: {
    to: string[];
    subject: string;
    body: string;
  }): void {
    this.consciousness.log({
      type: 'report_sent',
      recipients: config.to,
      subject: config.subject
    });

    // In production, would actually send email
    console.log(`Report sent to ${config.to.join(', ')}`);
  }

  /**
   * Detect anomalies
   */
  public detectAnomalies(kpiId: string): any[] {
    const anomalyDetector = this.analysisCells.get('anomaly');
    if (anomalyDetector) {
      const anomalies = anomalyDetector.analyze();
      return anomalies.filter((a: any) => a.kpi === kpiId);
    }
    return [];
  }

  /**
   * Enable real-time monitoring
   */
  public enableRealTimeMonitoring(sourceId: string, config: {
    websocketUrl: string;
    onData: (data: any) => void;
  }): void {
    this.consciousness.log({
      type: 'realtime_enabled',
      source: sourceId,
      url: config.websocketUrl
    });

    // In production, would establish WebSocket connection
    console.log(`Real-time monitoring enabled for ${sourceId}`);
  }

  /**
   * Add custom transformation
   */
  public addTransformation(id: string, config: {
    input: string[];
    transform: (data: any) => any;
  }): void {
    const transformCell = new TransformCell({
      id: `transform_${id}`,
      name: `${id} Transform`,
      transformFunction: (inputs: Map<string, any>) => {
        const inputData: any = {};
        config.input.forEach(key => {
          inputData[key] = inputs.get(key);
        });
        return config.transform(inputData);
      },
      sourceCellIds: config.input
    });

    this.colony.addCell(transformCell);

    this.consciousness.log({
      type: 'transformation_added',
      id: id,
      input: config.input
    });
  }

  /**
   * Register custom KPI
   */
  public registerKPI(id: string, config: {
    calculator: (data: any) => number;
    aggregator: string;
    formatter: (value: number) => string;
  }): void {
    this.consciousness.log({
      type: 'custom_kpi_registered',
      id: id
    });

    // Store for later use
    this.colony.setMetadata(id, config);
  }

  /**
   * Register custom data source
   */
  public registerDataSource(type: string, config: {
    connector: (config: any) => Promise<any>;
    schema: any;
  }): void {
    this.consciousness.log({
      type: 'custom_source_registered',
      type: type
    });

    // Store for later use
    this.colony.setMetadata(`source_${type}`, config);
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
      dataSources: Object.fromEntries(this.dataSources),
      kpis: Object.fromEntries(this.kpiCells),
      aggregations: Object.fromEntries(this.aggregationCells),
      alerts: Object.fromEntries(this.alertCells),
      consciousness: this.consciousness.getStream()
    };
  }

  // Private helper methods

  private validateData(data: any, schema?: any): boolean {
    if (!schema) return true;
    // Simple validation - in production would use schema validator
    return Array.isArray(data) && data.length > 0;
  }

  private transformData(item: any): any {
    // Basic transformation - in production would be more sophisticated
    return {
      ...item,
      _timestamp: new Date(),
      _processed: true
    };
  }

  private calculateKPI(calculation: string, inputs: Map<string, any>): number {
    // Simplified KPI calculation - in production would use expression parser
    const match = calculation.match(/(\w+)\((\w+)\)/);
    if (match) {
      const [, func, field] = match;
      const data = inputs.get(field) || [];

      switch (func) {
        case 'sum':
          return (data as any[]).reduce((sum, item) => sum + (item.value || 0), 0);
        case 'avg':
          return data.length > 0
            ? (data as any[]).reduce((sum, item) => sum + (item.value || 0), 0) / data.length
            : 0;
        case 'count':
          return data.length;
        default:
          return 0;
      }
    }

    return 0;
  }

  /**
   * Generate sample analytics data
   */
  public static generateSampleData(): AnalyticsTemplate {
    const analytics = new AnalyticsTemplate();

    // Add data source
    analytics.addDataSource('sales', {
      type: 'database',
      connection: 'postgresql://localhost/sales',
      query: 'SELECT * FROM sales'
    });

    // Ingest sample data
    const sampleSales = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: Math.floor(Math.random() * 1000) + 100,
      quantity: Math.floor(Math.random() * 10) + 1
    }));

    analytics.ingestData('sales', sampleSales);

    // Add KPIs
    analytics.addKPI('daily_revenue', {
      name: 'Daily Revenue',
      calculation: 'sum(amount)',
      groupBy: ['date'],
      format: 'currency'
    });

    analytics.addKPI('total_sales', {
      name: 'Total Sales',
      calculation: 'count(*)',
      format: 'number'
    });

    // Add alerts
    analytics.addAlert('revenue_drop', {
      name: 'Revenue Drop Alert',
      kpi: 'daily_revenue',
      condition: 'below_threshold',
      threshold: 5000,
      severity: 'warning',
      actions: ['notify_team', 'log_incident']
    });

    return analytics;
  }
}
