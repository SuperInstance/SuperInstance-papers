/**
 * Sensation System for LOG Cells
 *
 * The sensation system allows cells to be aware of changes in other cells
 * without direct dependencies. This enables emergent behavior and coordination.
 *
 * Six sensation types:
 * - ABSOLUTE_CHANGE: State delta (new - old)
 * - RATE_OF_CHANGE: First derivative (d/dt)
 * - ACCELERATION: Second derivative (d²/dt²)
 * - PRESENCE: Cell exists/active
 * - PATTERN: Pattern match detected
 * - ANOMALY: Deviation from expected
 */

/**
 * The six types of sensations a cell can detect
 */
export enum SensationType {
  /** State difference: new_value - old_value */
  ABSOLUTE_CHANGE = 'absolute',

  /** First derivative: rate of change over time */
  RATE_OF_CHANGE = 'velocity',

  /** Second derivative: acceleration/trend over time */
  ACCELERATION = 'trend',

  /** Cell exists and is active */
  PRESENCE = 'existence',

  /** Pattern recognized in cell's output */
  PATTERN = 'recognition',

  /** Deviation from expected behavior */
  ANOMALY = 'outlier',
}

/**
 * Cell reference for sensation source
 */
export interface CellReference {
  row: number;
  col: number;
  sheet?: string;
}

/**
 * A sensation represents a cell's awareness of changes in another cell
 */
export interface Sensation {
  /** Which cell this sensation is about */
  source: CellReference;

  /** Type of sensation detected */
  type: SensationType;

  /** Calculated sensation value (magnitude of change) */
  value: number;

  /** Previous value (for absolute change) */
  previousValue?: number;

  /** Current value (for absolute change) */
  currentValue?: number;

  /** Expected value (for anomaly detection) */
  expectedValue?: number;

  /** Timestamp when sensation was detected */
  timestamp: number;

  /** Confidence score (0-1) in this sensation */
  confidence: number;
}

/**
 * Configuration for watching a cell for sensations
 */
export interface SensationConfig {
  /** Which cell to watch */
  targetCell: CellReference;

  /** What types of changes to sense */
  sensationTypes: SensationType[];

  /** Sensitivity threshold (minimum value to trigger) */
  threshold: number;

  /** How often to sample (milliseconds) */
  sampleRate: number;

  /** Callback when sensation triggers */
  onSensation: (sensation: Sensation) => void;
}

/**
 * History of values for calculating derivatives
 */
export interface ValueHistory {
  values: number[];
  timestamps: number[];
  maxLength: number;
}

/**
 * Pattern definition for pattern matching
 */
export interface PatternDefinition {
  name: string;
  pattern: RegExp | number[] | ((value: any) => boolean);
  confidence: number;
}

/**
 * Statistics for anomaly detection
 */
export interface AnomalyStatistics {
  mean: number;
  stdDev: number;
  count: number;
  lastUpdated: number;
}

/**
 * Create a new sensation
 */
export function createSensation(
  source: CellReference,
  type: SensationType,
  value: number,
  confidence: number = 1.0,
  additionalData?: {
    previousValue?: number;
    currentValue?: number;
    expectedValue?: number;
  }
): Sensation {
  return {
    source,
    type,
    value,
    timestamp: Date.now(),
    confidence,
    ...additionalData,
  };
}

/**
 * Sensation detector - analyzes cell values and detects sensations
 */
export class SensationDetector {
  private valueHistories: Map<string, ValueHistory>;
  private anomalyStats: Map<string, AnomalyStatistics>;
  private patterns: Map<string, PatternDefinition[]>;

  constructor() {
    this.valueHistories = new Map();
    this.anomalyStats = new Map();
    this.patterns = new Map();
  }

  /**
   * Get history key for a cell reference
   */
  private getHistoryKey(ref: CellReference): string {
    return `${ref.sheet || 'default'}:${ref.row}:${ref.col}`;
  }

  /**
   * Get or create value history for a cell
   */
  private getHistory(ref: CellReference, maxLength: number = 10): ValueHistory {
    const key = this.getHistoryKey(ref);
    let history = this.valueHistories.get(key);

    if (!history) {
      history = {
        values: [],
        timestamps: [],
        maxLength,
      };
      this.valueHistories.set(key, history);
    }

    return history;
  }

  /**
   * Update value history with new value
   */
  private updateHistory(history: ValueHistory, value: number): void {
    history.values.push(value);
    history.timestamps.push(Date.now());

    // Maintain max length
    while (history.values.length > history.maxLength) {
      history.values.shift();
      history.timestamps.shift();
    }
  }

  /**
   * Detect absolute change sensation
   */
  detectAbsoluteChange(
    source: CellReference,
    oldValue: number | undefined,
    newValue: number,
    threshold: number = 0
  ): Sensation | null {
    if (oldValue === undefined) {
      return null;
    }

    const change = newValue - oldValue;

    if (Math.abs(change) < threshold) {
      return null;
    }

    return createSensation(
      source,
      SensationType.ABSOLUTE_CHANGE,
      change,
      1.0,
      { previousValue: oldValue, currentValue: newValue }
    );
  }

  /**
   * Detect rate of change (velocity) sensation
   */
  detectRateOfChange(
    source: CellReference,
    newValue: number,
    threshold: number = 0
  ): Sensation | null {
    const history = this.getHistory(source, 3);

    if (history.values.length < 2) {
      this.updateHistory(history, newValue);
      return null;
    }

    const lastValue = history.values[history.values.length - 1];
    const lastTimestamp = history.timestamps[history.timestamps.length - 1];
    const currentTime = Date.now();

    // Calculate rate of change per millisecond
    const timeDelta = currentTime - lastTimestamp;
    const valueDelta = newValue - lastValue;

    // Avoid division by zero
    if (timeDelta === 0) {
      return null;
    }

    const rateOfChange = valueDelta / timeDelta;

    if (Math.abs(rateOfChange) < threshold) {
      this.updateHistory(history, newValue);
      return null;
    }

    this.updateHistory(history, newValue);

    return createSensation(
      source,
      SensationType.RATE_OF_CHANGE,
      rateOfChange,
      0.8,
      { previousValue: lastValue, currentValue: newValue }
    );
  }

  /**
   * Detect acceleration (trend) sensation
   */
  detectAcceleration(
    source: CellReference,
    newValue: number,
    threshold: number = 0
  ): Sensation | null {
    const history = this.getHistory(source, 4);

    if (history.values.length < 3) {
      this.updateHistory(history, newValue);
      return null;
    }

    // Calculate rates of change between consecutive points
    const rates: number[] = [];
    for (let i = 1; i < history.values.length; i++) {
      const valueDelta = history.values[i] - history.values[i - 1];
      const timeDelta = history.timestamps[i] - history.timestamps[i - 1];

      if (timeDelta > 0) {
        rates.push(valueDelta / timeDelta);
      }
    }

    if (rates.length < 2) {
      this.updateHistory(history, newValue);
      return null;
    }

    // Calculate acceleration (change in rate of change)
    const acceleration = rates[rates.length - 1] - rates[rates.length - 2];

    if (Math.abs(acceleration) < threshold) {
      this.updateHistory(history, newValue);
      return null;
    }

    this.updateHistory(history, newValue);

    return createSensation(
      source,
      SensationType.ACCELERATION,
      acceleration,
      0.7,
      { currentValue: newValue }
    );
  }

  /**
   * Detect presence sensation
   */
  detectPresence(
    source: CellReference,
    isActive: boolean
  ): Sensation | null {
    if (!isActive) {
      return null;
    }

    return createSensation(
      source,
      SensationType.PRESENCE,
      1.0,
      1.0
    );
  }

  /**
   * Detect pattern sensation
   */
  detectPattern(
    source: CellReference,
    value: any,
    patterns: PatternDefinition[]
  ): Sensation | null {
    for (const pattern of patterns) {
      let matches = false;

      if (pattern.pattern instanceof RegExp) {
        matches = pattern.pattern.test(String(value));
      } else if (Array.isArray(pattern.pattern)) {
        matches = pattern.pattern.includes(value);
      } else if (typeof pattern.pattern === 'function') {
        matches = pattern.pattern(value);
      }

      if (matches) {
        return createSensation(
          source,
          SensationType.PATTERN,
          1.0,
          pattern.confidence,
          { currentValue: value }
        );
      }
    }

    return null;
  }

  /**
   * Update anomaly statistics for a cell
   */
  private updateAnomalyStats(ref: CellReference, value: number): void {
    const key = this.getHistoryKey(ref);
    let stats = this.anomalyStats.get(key);

    if (!stats) {
      stats = {
        mean: value,
        stdDev: 0,
        count: 1,
        lastUpdated: Date.now(),
      };
      this.anomalyStats.set(key, stats);
      return;
    }

    // Online algorithm for updating mean and stdDev
    const count = stats.count + 1;
    const delta = value - stats.mean;
    const newMean = stats.mean + delta / count;
    const newStdDev = Math.sqrt(
      (stats.count * stats.stdDev * stats.stdDev + delta * (value - newMean)) / count
    );

    stats.mean = newMean;
    stats.stdDev = newStdDev;
    stats.count = count;
    stats.lastUpdated = Date.now();
  }

  /**
   * Detect anomaly sensation
   */
  detectAnomaly(
    source: CellReference,
    value: number,
    threshold: number = 2.0 // Standard deviations
  ): Sensation | null {
    this.updateAnomalyStats(source, value);

    const key = this.getHistoryKey(source);
    const stats = this.anomalyStats.get(key);

    if (!stats || stats.count < 3 || stats.stdDev === 0) {
      return null;
    }

    // Calculate z-score
    const zScore = Math.abs((value - stats.mean) / stats.stdDev);

    if (zScore < threshold) {
      return null;
    }

    return createSensation(
      source,
      SensationType.ANOMALY,
      zScore,
      Math.min(zScore / threshold, 1.0),
      { expectedValue: stats.mean, currentValue: value }
    );
  }

  /**
   * Detect all configured sensations for a cell
   */
  detectSensations(
    source: CellReference,
    value: number | any,
    oldValue: number | any,
    config: SensationConfig
  ): Sensation[] {
    const sensations: Sensation[] = [];
    const numericValue = typeof value === 'number' ? value : 0;
    const numericOldValue = typeof oldValue === 'number' ? oldValue : undefined;

    for (const sensationType of config.sensationTypes) {
      let sensation: Sensation | null = null;

      switch (sensationType) {
        case SensationType.ABSOLUTE_CHANGE:
          sensation = this.detectAbsoluteChange(
            source,
            numericOldValue,
            numericValue,
            config.threshold
          );
          break;

        case SensationType.RATE_OF_CHANGE:
          sensation = this.detectRateOfChange(
            source,
            numericValue,
            config.threshold
          );
          break;

        case SensationType.ACCELERATION:
          sensation = this.detectAcceleration(
            source,
            numericValue,
            config.threshold
          );
          break;

        case SensationType.PRESENCE:
          sensation = this.detectPresence(source, value !== null && value !== undefined);
          break;

        case SensationType.PATTERN:
          const cellPatterns = this.patterns.get(this.getHistoryKey(source)) || [];
          sensation = this.detectPattern(source, value, cellPatterns);
          break;

        case SensationType.ANOMALY:
          if (typeof numericValue === 'number') {
            sensation = this.detectAnomaly(
              source,
              numericValue,
              config.threshold
            );
          }
          break;
      }

      if (sensation) {
        sensations.push(sensation);
      }
    }

    return sensations;
  }

  /**
   * Register a pattern for a cell
   */
  registerPattern(ref: CellReference, pattern: PatternDefinition): void {
    const key = this.getHistoryKey(ref);
    let cellPatterns = this.patterns.get(key);

    if (!cellPatterns) {
      cellPatterns = [];
      this.patterns.set(key, cellPatterns);
    }

    cellPatterns.push(pattern);
  }

  /**
   * Clear history for a cell
   */
  clearHistory(ref: CellReference): void {
    const key = this.getHistoryKey(ref);
    this.valueHistories.delete(key);
    this.anomalyStats.delete(key);
  }

  /**
   * Clear all histories and statistics
   */
  clearAll(): void {
    this.valueHistories.clear();
    this.anomalyStats.clear();
    this.patterns.clear();
  }
}

/**
 * Utility function to format sensation for display
 */
export function formatSensation(sensation: Sensation): string {
  const { source, type, value, confidence } = sensation;
  const sheet = source.sheet || 'default';
  const cellRef = `${sheet}!${String.fromCharCode(65 + source.col)}${source.row + 1}`;

  let valueStr = '';
  switch (type) {
    case SensationType.ABSOLUTE_CHANGE:
      valueStr = `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
      break;
    case SensationType.RATE_OF_CHANGE:
      valueStr = `${(value * 1000).toFixed(2)}/s`;
      break;
    case SensationType.ACCELERATION:
      valueStr = `${(value * 1000000).toFixed(2)}/s²`;
      break;
    case SensationType.PRESENCE:
      valueStr = 'active';
      break;
    case SensationType.PATTERN:
      valueStr = 'matched';
      break;
    case SensationType.ANOMALY:
      valueStr = `${value.toFixed(2)}σ`;
      break;
  }

  return `${cellRef}: ${type} (${valueStr}) [${(confidence * 100).toFixed(0)}%]`;
}
