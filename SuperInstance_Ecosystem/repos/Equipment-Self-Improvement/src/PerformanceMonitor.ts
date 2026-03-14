/**
 * PerformanceMonitor - Monitors agent performance metrics
 * 
 * Tracks accuracy, latency, cost, and other key performance indicators
 * to enable data-driven self-improvement decisions.
 */

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  metricType: MetricType;
  value: number;
  unit: string;
  context: Record<string, unknown>;
  agentId?: string;
  cellId?: string;
  tileId?: string;
}

export type MetricType = 
  | 'accuracy'
  | 'latency'
  | 'cost'
  | 'throughput'
  | 'error_rate'
  | 'memory_usage'
  | 'cpu_usage'
  | 'response_quality'
  | 'task_completion_rate'
  | 'consensus_agreement';

export interface MetricThreshold {
  metricType: MetricType;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  metrics: Map<MetricType, MetricSummary>;
  trends: Map<MetricType, MetricTrend>;
  anomalies: PerformanceAnomaly[];
}

export interface MetricSummary {
  metricType: MetricType;
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface MetricTrend {
  metricType: MetricType;
  direction: 'improving' | 'declining' | 'stable';
  slope: number;
  confidence: number;
  dataPoints: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface PerformanceAnomaly {
  id: string;
  timestamp: Date;
  metricType: MetricType;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  possibleCauses: string[];
}

export interface ImprovementOpportunity {
  id: string;
  metricType: MetricType;
  currentValue: number;
  targetValue: number;
  potentialGain: number;
  priority: number;
  recommendations: string[];
  affectedComponents: string[];
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private thresholds: Map<MetricType, MetricThreshold> = new Map();
  private maxHistorySize: number;
  private anomalyListeners: ((anomaly: PerformanceAnomaly) => void)[] = [];

  constructor(maxHistorySize: number = 10000) {
    this.maxHistorySize = maxHistorySize;
    this.initializeDefaultThresholds();
  }

  /**
   * Initialize default performance thresholds
   */
  private initializeDefaultThresholds(): void {
    this.thresholds.set('accuracy', {
      metricType: 'accuracy',
      minValue: 0,
      maxValue: 1,
      targetValue: 0.95,
      warningThreshold: 0.85,
      criticalThreshold: 0.7
    });

    this.thresholds.set('latency', {
      metricType: 'latency',
      minValue: 0,
      targetValue: 100,
      warningThreshold: 500,
      criticalThreshold: 2000
    });

    this.thresholds.set('error_rate', {
      metricType: 'error_rate',
      minValue: 0,
      maxValue: 1,
      targetValue: 0.01,
      warningThreshold: 0.05,
      criticalThreshold: 0.1
    });

    this.thresholds.set('cost', {
      metricType: 'cost',
      minValue: 0,
      targetValue: 0.01,
      warningThreshold: 0.1,
      criticalThreshold: 1.0
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): PerformanceMetric {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);
    this.trimHistory();

    // Check for threshold violations
    this.checkThresholds(fullMetric);

    return fullMetric;
  }

  /**
   * Record multiple metrics at once
   */
  recordMetrics(metrics: Array<Omit<PerformanceMetric, 'id' | 'timestamp'>>): PerformanceMetric[] {
    return metrics.map(m => this.recordMetric(m));
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(
    metricType: MetricType,
    since?: Date,
    until?: Date
  ): PerformanceMetric[] {
    return this.metrics.filter(m => {
      if (m.metricType !== metricType) return false;
      if (since && m.timestamp < since) return false;
      if (until && m.timestamp > until) return false;
      return true;
    });
  }

  /**
   * Get metrics by agent
   */
  getMetricsByAgent(
    agentId: string,
    since?: Date
  ): PerformanceMetric[] {
    return this.metrics.filter(m => {
      if (m.agentId !== agentId) return false;
      if (since && m.timestamp < since) return false;
      return true;
    });
  }

  /**
   * Get metrics by cell
   */
  getMetricsByCell(
    cellId: string,
    since?: Date
  ): PerformanceMetric[] {
    return this.metrics.filter(m => {
      if (m.cellId !== cellId) return false;
      if (since && m.timestamp < since) return false;
      return true;
    });
  }

  /**
   * Calculate summary statistics for a metric type
   */
  calculateSummary(
    metricType: MetricType,
    since?: Date,
    until?: Date
  ): MetricSummary | null {
    const metrics = this.getMetricsByType(metricType, since, until);
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    // Calculate median
    const median = n % 2 === 0
      ? (values[n / 2 - 1] + values[n / 2]) / 2
      : values[Math.floor(n / 2)];

    // Calculate standard deviation
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      metricType,
      count: n,
      sum,
      mean,
      median,
      min: values[0],
      max: values[n - 1],
      stdDev,
      percentiles: {
        p50: values[Math.floor(n * 0.5)],
        p75: values[Math.floor(n * 0.75)],
        p90: values[Math.floor(n * 0.9)],
        p95: values[Math.floor(n * 0.95)],
        p99: values[Math.floor(n * 0.99)]
      }
    };
  }

  /**
   * Analyze trends for all metric types
   */
  analyzeTrends(periodMs: number = 3600000): Map<MetricType, MetricTrend> {
    const trends = new Map<MetricType, MetricTrend>();
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodMs);

    for (const metricType of this.getMetricTypes()) {
      const trend = this.calculateTrend(metricType, periodStart, now);
      if (trend) {
        trends.set(metricType, trend);
      }
    }

    return trends;
  }

  /**
   * Calculate trend for a specific metric type
   */
  private calculateTrend(
    metricType: MetricType,
    periodStart: Date,
    periodEnd: Date
  ): MetricTrend | null {
    const metrics = this.getMetricsByType(metricType, periodStart, periodEnd);
    if (metrics.length < 2) return null;

    // Sort by timestamp
    const sorted = [...metrics].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Simple linear regression
    const n = sorted.length;
    const xMean = (n - 1) / 2;
    const yMean = sorted.reduce((s, m) => s + m.value, 0) / n;

    let numerator = 0;
    let denominator = 0;

    sorted.forEach((m, i) => {
      numerator += (i - xMean) * (m.value - yMean);
      denominator += Math.pow(i - xMean, 2);
    });

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // Determine direction based on slope and metric type
    // For metrics like accuracy, positive slope = improving
    // For metrics like latency, negative slope = improving
    const improvingMetrics: MetricType[] = ['accuracy', 'throughput', 'task_completion_rate', 'consensus_agreement'];
    const direction = this.determineTrendDirection(slope, metricType, improvingMetrics);

    // Calculate R-squared for confidence
    const rSquared = this.calculateRSquared(sorted, slope, yMean);

    return {
      metricType,
      direction,
      slope,
      confidence: rSquared,
      dataPoints: n,
      periodStart,
      periodEnd
    };
  }

  /**
   * Determine if trend is improving, declining, or stable
   */
  private determineTrendDirection(
    slope: number,
    metricType: MetricType,
    improvingMetrics: MetricType[]
  ): 'improving' | 'declining' | 'stable' {
    const threshold = 0.001; // Slope threshold for "stable"
    
    if (Math.abs(slope) < threshold) {
      return 'stable';
    }

    const isPositiveGood = improvingMetrics.includes(metricType);
    
    if (isPositiveGood) {
      return slope > 0 ? 'improving' : 'declining';
    } else {
      return slope < 0 ? 'improving' : 'declining';
    }
  }

  /**
   * Calculate R-squared for trend confidence
   */
  private calculateRSquared(
    metrics: PerformanceMetric[],
    slope: number,
    yMean: number
  ): number {
    const n = metrics.length;
    let ssTotal = 0;
    let ssResidual = 0;

    metrics.forEach((m, i) => {
      const predicted = yMean + slope * (i - (n - 1) / 2);
      ssTotal += Math.pow(m.value - yMean, 2);
      ssResidual += Math.pow(m.value - predicted, 2);
    });

    return ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
  }

  /**
   * Detect anomalies in recent metrics
   */
  detectAnomalies(recentPeriodMs: number = 300000): PerformanceAnomaly[] {
    const anomalies: PerformanceAnomaly[] = [];
    const now = new Date();
    const recentStart = new Date(now.getTime() - recentPeriodMs);

    for (const metricType of this.getMetricTypes()) {
      const recentMetrics = this.getMetricsByType(metricType, recentStart);
      const historicalMetrics = this.getMetricsByType(
        metricType,
        new Date(now.getTime() - recentPeriodMs * 10),
        recentStart
      );

      if (historicalMetrics.length < 10) continue;

      const historical = this.calculateSummary(
        metricType,
        new Date(now.getTime() - recentPeriodMs * 10),
        recentStart
      );

      if (!historical) continue;

      for (const metric of recentMetrics) {
        const deviation = Math.abs(metric.value - historical.mean) / historical.stdDev;
        
        if (deviation > 2) {
          anomalies.push({
            id: this.generateId(),
            timestamp: metric.timestamp,
            metricType,
            expectedValue: historical.mean,
            actualValue: metric.value,
            deviation,
            severity: this.getAnomalySeverity(deviation),
            description: `${metricType} value ${metric.value} deviates ${deviation.toFixed(2)} standard deviations from mean ${historical.mean.toFixed(2)}`,
            possibleCauses: this.identifyPossibleCauses(metricType, deviation)
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Get anomaly severity based on deviation
   */
  private getAnomalySeverity(deviation: number): 'low' | 'medium' | 'high' | 'critical' {
    if (deviation > 5) return 'critical';
    if (deviation > 4) return 'high';
    if (deviation > 3) return 'medium';
    return 'low';
  }

  /**
   * Identify possible causes for anomalies
   */
  private identifyPossibleCauses(metricType: MetricType, _deviation: number): string[] {
    const causes: Record<MetricType, string[]> = {
      accuracy: [
        'Model drift',
        'Data distribution change',
        'Training data quality issues',
        'Concept drift in target domain'
      ],
      latency: [
        'Resource contention',
        'Network issues',
        'Increased load',
        'Memory pressure'
      ],
      cost: [
        'Increased API usage',
        'Inefficient queries',
        'Resource leaks',
        'Scaling issues'
      ],
      throughput: [
        'Bottleneck in pipeline',
        'Resource limits',
        'Queue buildup',
        'External dependencies'
      ],
      error_rate: [
        'System instability',
        'Configuration changes',
        'External service issues',
        'Code regressions'
      ],
      memory_usage: [
        'Memory leaks',
        'Large data processing',
        'Inefficient caching',
        'Unoptimized algorithms'
      ],
      cpu_usage: [
        'Compute-intensive operations',
        'Inefficient algorithms',
        'Parallelization issues',
        'Background processes'
      ],
      response_quality: [
        'Model degradation',
        'Prompt engineering issues',
        'Context limitations',
        'Training data gaps'
      ],
      task_completion_rate: [
        'Task complexity increase',
        'Agent capability limits',
        'Resource constraints',
        'External dependencies'
      ],
      consensus_agreement: [
        'Agent divergence',
        'Opinion polarization',
        'Knowledge gaps',
        'Conflicting objectives'
      ]
    };

    return causes[metricType] || ['Unknown cause'];
  }

  /**
   * Identify improvement opportunities
   */
  identifyImprovementOpportunities(): ImprovementOpportunity[] {
    const opportunities: ImprovementOpportunity[] = [];

    for (const [metricType, threshold] of this.thresholds) {
      const summary = this.calculateSummary(metricType);
      if (!summary || !threshold.targetValue) continue;

      const currentValue = summary.mean;
      const targetValue = threshold.targetValue;

      // For metrics where lower is better
      const improvingMetrics: MetricType[] = ['latency', 'cost', 'error_rate', 'memory_usage', 'cpu_usage'];
      const isLowerBetter = improvingMetrics.includes(metricType);

      const gap = isLowerBetter
        ? currentValue - targetValue
        : targetValue - currentValue;

      if (gap > 0) {
        const potentialGain = (gap / (isLowerBetter ? currentValue : targetValue)) * 100;

        opportunities.push({
          id: this.generateId(),
          metricType,
          currentValue,
          targetValue,
          potentialGain,
          priority: this.calculatePriority(metricType, potentialGain, gap),
          recommendations: this.generateRecommendations(metricType, currentValue, targetValue),
          affectedComponents: this.identifyAffectedComponents(metricType)
        });
      }
    }

    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate priority for improvement opportunity
   */
  private calculatePriority(
    metricType: MetricType,
    _potentialGain: number,
    gap: number
  ): number {
    // Base priority weights
    const weights: Record<MetricType, number> = {
      accuracy: 10,
      error_rate: 9,
      latency: 7,
      cost: 6,
      throughput: 5,
      memory_usage: 4,
      cpu_usage: 4,
      response_quality: 8,
      task_completion_rate: 9,
      consensus_agreement: 7
    };

    const baseWeight = weights[metricType] || 5;
    const gapScore = Math.min(gap * 10, 10);

    return (baseWeight * 0.6 + gapScore * 0.4);
  }

  /**
   * Generate recommendations for improvement
   */
  private generateRecommendations(
    metricType: MetricType,
    currentValue: number,
    targetValue: number
  ): string[] {
    const recommendations: Record<MetricType, string[]> = {
      accuracy: [
        'Review and update training data',
        'Implement ensemble methods',
        'Add domain-specific features',
        'Increase model complexity or capacity'
      ],
      latency: [
        'Implement caching strategies',
        'Optimize query patterns',
        'Use async processing where possible',
        'Scale horizontally for load distribution'
      ],
      cost: [
        'Implement request batching',
        'Use cheaper models for simple tasks',
        'Optimize prompt lengths',
        'Cache frequent responses'
      ],
      throughput: [
        'Parallelize independent operations',
        'Implement queue-based processing',
        'Optimize database queries',
        'Scale resources based on load'
      ],
      error_rate: [
        'Implement retry mechanisms',
        'Add input validation',
        'Improve error handling',
        'Add circuit breakers for external services'
      ],
      memory_usage: [
        'Implement memory pooling',
        'Stream large datasets',
        'Optimize data structures',
        'Clear unused caches periodically'
      ],
      cpu_usage: [
        'Offload to GPU where applicable',
        'Optimize algorithms',
        'Use worker threads for heavy computation',
        'Implement load balancing'
      ],
      response_quality: [
        'Refine prompt templates',
        'Add context examples',
        'Implement quality checks',
        'Use specialized models for domains'
      ],
      task_completion_rate: [
        'Simplify complex tasks',
        'Add intermediate checkpoints',
        'Improve error recovery',
        'Enhance planning capabilities'
      ],
      consensus_agreement: [
        'Align agent objectives',
        'Improve communication protocols',
        'Add confidence calibration',
        'Implement conflict resolution'
      ]
    };

    const base = recommendations[metricType] || ['Analyze root cause'];
    
    return [
      `Current: ${currentValue.toFixed(4)}, Target: ${targetValue.toFixed(4)}`,
      ...base
    ];
  }

  /**
   * Identify components affected by metric
   */
  private identifyAffectedComponents(metricType: MetricType): string[] {
    const components: Record<MetricType, string[]> = {
      accuracy: ['Model', 'Training Pipeline', 'Feature Engineering'],
      latency: ['API Gateway', 'Processing Pipeline', 'Database'],
      cost: ['Model Selection', 'Request Handler', 'Caching Layer'],
      throughput: ['Queue System', 'Worker Pool', 'Load Balancer'],
      error_rate: ['Error Handler', 'Input Validator', 'Circuit Breaker'],
      memory_usage: ['Memory Manager', 'Cache System', 'Data Processor'],
      cpu_usage: ['Compute Engine', 'Worker Pool', 'Scheduler'],
      response_quality: ['Model', 'Prompt Engine', 'Context Manager'],
      task_completion_rate: ['Task Planner', 'Executor', 'Monitor'],
      consensus_agreement: ['Consensus Engine', 'Agent Pool', 'Deliberation System']
    };

    return components[metricType] || ['Unknown'];
  }

  /**
   * Create a performance snapshot
   */
  createSnapshot(): PerformanceSnapshot {
    const metrics = new Map<MetricType, MetricSummary>();
    const trends = this.analyzeTrends();

    for (const metricType of this.getMetricTypes()) {
      const summary = this.calculateSummary(metricType);
      if (summary) {
        metrics.set(metricType, summary);
      }
    }

    return {
      timestamp: new Date(),
      metrics,
      trends,
      anomalies: this.detectAnomalies()
    };
  }

  /**
   * Set custom threshold for a metric
   */
  setThreshold(threshold: MetricThreshold): void {
    this.thresholds.set(threshold.metricType, threshold);
  }

  /**
   * Get threshold for a metric
   */
  getThreshold(metricType: MetricType): MetricThreshold | undefined {
    return this.thresholds.get(metricType);
  }

  /**
   * Subscribe to anomaly events
   */
  onAnomaly(listener: (anomaly: PerformanceAnomaly) => void): void {
    this.anomalyListeners.push(listener);
  }

  /**
   * Check thresholds and notify listeners
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.metricType);
    if (!threshold) return;

    const anomaly = this.evaluateThreshold(metric, threshold);
    if (anomaly) {
      this.anomalyListeners.forEach(listener => listener(anomaly));
    }
  }

  /**
   * Evaluate if metric violates threshold
   */
  private evaluateThreshold(
    metric: PerformanceMetric,
    threshold: MetricThreshold
  ): PerformanceAnomaly | null {
    const improvingMetrics: MetricType[] = ['latency', 'cost', 'error_rate', 'memory_usage', 'cpu_usage'];
    const isLowerBetter = improvingMetrics.includes(metric.metricType);

    if (threshold.criticalThreshold) {
      const isCritical = isLowerBetter
        ? metric.value > threshold.criticalThreshold
        : metric.value < threshold.criticalThreshold;

      if (isCritical) {
        return {
          id: this.generateId(),
          timestamp: metric.timestamp,
          metricType: metric.metricType,
          expectedValue: threshold.targetValue || threshold.criticalThreshold,
          actualValue: metric.value,
          deviation: Math.abs(metric.value - (threshold.targetValue || threshold.criticalThreshold)),
          severity: 'critical',
          description: `${metric.metricType} violated critical threshold`,
          possibleCauses: this.identifyPossibleCauses(metric.metricType, 5)
        };
      }
    }

    return null;
  }

  /**
   * Get all metric types that have been recorded
   */
  private getMetricTypes(): MetricType[] {
    const types = new Set<MetricType>();
    this.metrics.forEach(m => types.add(m.metricType));
    return Array.from(types);
  }

  /**
   * Trim history to max size
   */
  private trimHistory(): void {
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.maxHistorySize);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(since?: Date): PerformanceMetric[] {
    return since
      ? this.metrics.filter(m => m.timestamp >= since)
      : [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get metric count
   */
  getMetricCount(): number {
    return this.metrics.length;
  }
}
