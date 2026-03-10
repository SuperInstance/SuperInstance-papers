/**
 * DataGenerators - Test data generation utilities for POLLN testing
 *
 * Provides utilities for generating various types of test data including
 * random cell data, formulas, time series, and anomaly injection.
 */

import type {
  CellData,
  TestDataConfig,
  FormulaGeneratorOptions,
  TimeSeriesPoint,
  AnomalyConfig,
} from './types.js';
import { CellType } from '../core/types.js';

/**
 * Seeded random number generator for reproducible tests
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generate next random number
   */
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate random integer in range
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float in range
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Generate random boolean
   */
  nextBoolean(): boolean {
    return this.next() > 0.5;
  }

  /**
   * Pick random element from array
   */
  nextItem<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffle array
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Generator for random cell data
 */
export class RandomDataGenerator {
  private random: SeededRandom;

  constructor(seed: number = Date.now()) {
    this.random = new SeededRandom(seed);
  }

  /**
   * Generate random cell data
   *
   * @param config - Configuration for data generation
   * @returns 2D array of cell data
   *
   * @example
   * ```typescript
   * const generator = new RandomDataGenerator(42); // Seeded for reproducibility
   * const data = generator.generate({
   *   rows: 10,
   *   columns: 5,
   *   dataType: 'number',
   *   numberRange: [0, 100]
   * });
   * ```
   */
  generate(config: TestDataConfig): CellData[][] {
    const data: CellData[][] = [];
    const {
      rows,
      columns,
      dataType = 'mixed',
      numberRange = [0, 100],
      stringLength = [5, 20],
      nullProbability = 0.1,
    } = config;

    for (let row = 0; row < rows; row++) {
      const rowData: CellData[] = [];
      for (let col = 0; col < columns; col++) {
        // Determine if this cell should be null
        if (this.random.next() < nullProbability) {
          rowData.push({ value: null });
          continue;
        }

        // Generate value based on data type
        const value = this.generateValue(dataType, numberRange, stringLength);
        rowData.push({ value, type: this.getRandomType() });
      }
      data.push(rowData);
    }

    return data;
  }

  /**
   * Generate a single random value
   *
   * @param dataType - Type of value to generate
   * @param numberRange - Range for number generation
   * @param stringLength - Range for string length
   * @returns Random value
   */
  generateValue(
    dataType: string,
    numberRange: [number, number],
    stringLength: [number, number]
  ): unknown {
    switch (dataType) {
      case 'number':
        return this.random.nextFloat(numberRange[0], numberRange[1]);

      case 'string':
        return this.generateRandomString(stringLength[0], stringLength[1]);

      case 'boolean':
        return this.random.nextBoolean();

      case 'json':
        return this.generateRandomJson();

      case 'mixed':
      default:
        const types = ['number', 'string', 'boolean'];
        return this.generateValue(
          this.random.nextItem(types),
          numberRange,
          stringLength
        );
    }
  }

  /**
   * Generate random string
   *
   * @param minLength - Minimum string length
   * @param maxLength - Maximum string length
   * @returns Random string
   */
  generateRandomString(minLength: number, maxLength: number): string {
    const length = this.random.nextInt(minLength, maxLength);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[this.random.nextInt(0, chars.length - 1)];
    }
    return result;
  }

  /**
   * Generate random JSON object
   *
   * @returns Random JSON object
   */
  generateRandomJson(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    const keys = ['name', 'value', 'status', 'count', 'active'];
    const numKeys = this.random.nextInt(1, keys.length);

    for (let i = 0; i < numKeys; i++) {
      const key = keys[i];
      const value = this.generateValue('mixed', [0, 100], [5, 10]);
      obj[key] = value;
    }

    return obj;
  }

  /**
   * Get random cell type
   *
   * @returns Random cell type
   */
  private getRandomType(): CellType {
    const types = [
      CellType.INPUT,
      CellType.TRANSFORM,
      CellType.AGGREGATE,
      CellType.ANALYSIS,
    ];
    return this.random.nextItem(types);
  }
}

/**
 * Generator for spreadsheet formulas
 */
export class FormulaGenerator {
  /**
   * Generate a random formula
   *
   * @param options - Formula generation options
   * @returns Formula string
   *
   * @example
   * ```typescript
   * const formula = FormulaGenerator.generate({
   *   complexity: 'moderate',
   *   type: 'arithmetic'
   * });
   * // Returns: "=A1+B2*3"
   * ```
   */
  static generate(options: FormulaGeneratorOptions = {}): string {
    const {
      complexity = 'moderate',
      type = 'arithmetic',
      depth = 2,
    } = options;

    switch (type) {
      case 'arithmetic':
        return this.generateArithmetic(complexity, depth);

      case 'logical':
        return this.generateLogical(complexity, depth);

      case 'statistical':
        return this.generateStatistical(complexity);

      case 'text':
        return this.generateText(complexity);

      default:
        return this.generateArithmetic(complexity, depth);
    }
  }

  /**
   * Generate arithmetic formula
   *
   * @param complexity - Formula complexity
   * @param depth - Nesting depth
   * @returns Arithmetic formula
   */
  private static generateArithmetic(complexity: string, depth: number): string {
    const operators = ['+', '-', '*', '/'];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    if (depth <= 0) {
      return `=${this.generateCellRef()} ${operator} ${this.generateCellRef()}`;
    }

    const left = complexity === 'complex'
      ? this.generateArithmetic(complexity, depth - 1)
      : this.generateCellRef();

    const right = complexity === 'complex'
      ? this.generateArithmetic(complexity, depth - 1)
      : this.generateCellRef();

    return `=(${left} ${operator} ${right})`;
  }

  /**
   * Generate logical formula
   *
   * @param complexity - Formula complexity
   * @param depth - Nesting depth
   * @returns Logical formula
   */
  private static generateLogical(complexity: string, depth: number): string {
    const operators = ['>', '<', '>=', '<=', '=', '<>'];

    if (depth <= 0 || complexity === 'simple') {
      const operator = operators[Math.floor(Math.random() * operators.length)];
      return `=IF(${this.generateCellRef()} ${operator} ${this.generateCellRef()}, TRUE, FALSE)`;
    }

    return `=AND(${this.generateLogical('simple', 0)}, ${this.generateLogical('simple', 0)})`;
  }

  /**
   * Generate statistical formula
   *
   * @param complexity - Formula complexity
   * @returns Statistical formula
   */
  private static generateStatistical(complexity: string): string {
    const functions = ['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'STDEV'];

    if (complexity === 'simple') {
      const func = functions[Math.floor(Math.random() * functions.length)];
      return `=${func}(${this.generateCellRange()})`;
    }

    // Complex: nested statistical functions
    const func1 = functions[Math.floor(Math.random() * functions.length)];
    const func2 = functions[Math.floor(Math.random() * functions.length)];
    return `=${func1}(${this.generateCellRange()}) + ${func2}(${this.generateCellRange()})`;
  }

  /**
   * Generate text formula
   *
   * @param complexity - Formula complexity
   * @returns Text formula
   */
  private static generateText(complexity: string): string {
    if (complexity === 'simple') {
      const functions = ['UPPER', 'LOWER', 'PROPER', 'LEN'];
      const func = functions[Math.floor(Math.random() * functions.length)];
      return `=${func}(${this.generateCellRef()})`;
    }

    return `=CONCATENATE(${this.generateCellRef()}, " ", ${this.generateCellRef()})`;
  }

  /**
   * Generate cell reference (e.g., A1, B2)
   *
   * @returns Cell reference
   */
  private static generateCellRef(): string {
    const col = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
    const row = Math.floor(Math.random() * 100) + 1;
    return `${col}${row}`;
  }

  /**
   * Generate cell range (e.g., A1:B10)
   *
   * @returns Cell range
   */
  private static generateCellRange(): string {
    const startCol = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const startRow = Math.floor(Math.random() * 100) + 1;
    const endCol = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const endRow = Math.floor(Math.random() * 100) + 1;
    return `${startCol}${startRow}:${endCol}${endRow}`;
  }
}

/**
 * Generator for time series data
 */
export class TimeSeriesGenerator {
  /**
   * Generate time series data
   *
   * @param count - Number of data points
   * @param options - Generation options
   * @returns Array of time series points
   *
   * @example
   * ```typescript
   * const series = TimeSeriesGenerator.generate(100, {
   *   trend: 'upward',
   *   seasonality: true,
   *   noise: 0.1
   * });
   * ```
   */
  static generate(
    count: number,
    options: {
      startValue?: number;
      trend?: 'upward' | 'downward' | 'flat';
      volatility?: number;
      seasonality?: boolean;
      noise?: number;
      interval?: number; // milliseconds between points
    } = {}
  ): TimeSeriesPoint[] {
    const {
      startValue = 100,
      trend = 'flat',
      volatility = 0.05,
      seasonality = false,
      noise = 0.02,
      interval = 1000,
    } = options;

    const data: TimeSeriesPoint[] = [];
    let currentValue = startValue;
    let timestamp = Date.now();

    for (let i = 0; i < count; i++) {
      // Apply trend
      const trendDelta = trend === 'upward' ? 0.1 : trend === 'downward' ? -0.1 : 0;

      // Apply seasonality (sine wave)
      const seasonalDelta = seasonality ? Math.sin(i / 10) * 2 : 0;

      // Apply noise
      const noiseDelta = (Math.random() - 0.5) * noise * currentValue;

      // Apply volatility
      const volatilityDelta = (Math.random() - 0.5) * volatility * currentValue;

      currentValue += trendDelta + seasonalDelta + noiseDelta + volatilityDelta;

      data.push({
        timestamp,
        value: Math.max(0, currentValue), // Ensure non-negative
        metadata: {
          index: i,
          trend: trendDelta,
          seasonal: seasonalDelta,
          noise: noiseDelta,
          volatility: volatilityDelta,
        },
      });

      timestamp += interval;
    }

    return data;
  }

  /**
   * Generate time series with specific pattern
   *
   * @param pattern - Pattern type
   * @param count - Number of points
   * @returns Array of time series points
   */
  static generatePattern(
    pattern: 'linear' | 'exponential' | 'logarithmic' | 'sine' | 'cosine',
    count: number
  ): TimeSeriesPoint[] {
    const data: TimeSeriesPoint[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < count; i++) {
      const x = i / count;
      let value: number;

      switch (pattern) {
        case 'linear':
          value = 100 * x;
          break;
        case 'exponential':
          value = Math.exp(x * 5);
          break;
        case 'logarithmic':
          value = Math.log((x + 1) * 100);
          break;
        case 'sine':
          value = 50 + 50 * Math.sin(x * Math.PI * 4);
          break;
        case 'cosine':
          value = 50 + 50 * Math.cos(x * Math.PI * 4);
          break;
        default:
          value = 100 * x;
      }

      data.push({
        timestamp: timestamp + i * 1000,
        value,
        metadata: { pattern, index: i },
      });
    }

    return data;
  }
}

/**
 * Anomaly injection for testing edge cases
 */
export class AnomalyInjector {
  /**
   * Inject anomalies into data
   *
   * @param data - Original data
   * @param anomalies - Anomaly configurations
   * @returns Data with injected anomalies
   *
   * @example
   * ```typescript
   * const data = [1, 2, 3, 4, 5];
   * const withAnomalies = AnomalyInjector.inject(data, [
   *   { type: 'spike', index: 2, magnitude: 10 },
   *   { type: 'missing', index: 4 }
   * ]);
   * ```
   */
  static inject(
    data: number[],
    anomalies: Array<AnomalyConfig & { index?: number }>
  ): (number | null)[] {
    const result = [...data];

    anomalies.forEach((anomaly) => {
      const index = anomaly.index ?? Math.floor(Math.random() * result.length);

      switch (anomaly.type) {
        case 'spike':
          result[index] = result[index] * (anomaly.magnitude ?? 10);
          break;

        case 'drop':
          result[index] = result[index] / (anomaly.magnitude ?? 10);
          break;

        case 'outlier':
          result[index] = (anomaly.magnitude ?? 1000);
          break;

        case 'missing':
          result[index] = null;
          break;

        case 'duplicate':
          if (index > 0) {
            result[index] = result[index - 1];
          }
          break;
      }
    });

    return result;
  }

  /**
   * Inject anomalies into time series
   *
   * @param series - Original time series
   * @param anomalies - Anomaly configurations
   * @returns Time series with anomalies
   */
  static injectIntoTimeSeries(
    series: TimeSeriesPoint[],
    anomalies: Array<AnomalyConfig & { index?: number }>
  ): TimeSeriesPoint[] {
    const result = series.map((point) => ({ ...point }));

    anomalies.forEach((anomaly) => {
      const index = anomaly.index ?? Math.floor(Math.random() * result.length);

      if (index >= 0 && index < result.length) {
        const point = result[index];

        switch (anomaly.type) {
          case 'spike':
            point.value *= (anomaly.magnitude ?? 10);
            point.metadata = { ...point.metadata, anomaly: 'spike' };
            break;

          case 'drop':
            point.value /= (anomaly.magnitude ?? 10);
            point.metadata = { ...point.metadata, anomaly: 'drop' };
            break;

          case 'outlier':
            point.value = (anomaly.magnitude ?? 1000);
            point.metadata = { ...point.metadata, anomaly: 'outlier' };
            break;

          case 'missing':
            point.value = NaN;
            point.metadata = { ...point.metadata, anomaly: 'missing' };
            break;

          case 'duplicate':
            if (index > 0) {
              point.value = result[index - 1].value;
              point.metadata = { ...point.metadata, anomaly: 'duplicate' };
            }
            break;
        }
      }
    });

    return result;
  }

  /**
   * Generate common anomaly scenarios
   *
   * @param scenario - Scenario type
   * @param dataLength - Length of data array
   * @returns Array of anomaly configurations
   */
  static generateScenario(
    scenario: 'sparse' | 'frequent' | 'clustered' | 'extreme',
    dataLength: number
  ): Array<AnomalyConfig & { index: number }> {
    const anomalies: Array<AnomalyConfig & { index: number }> = [];

    switch (scenario) {
      case 'sparse':
        // Few anomalies spread out
        for (let i = 0; i < 3; i++) {
          anomalies.push({
            type: 'spike',
            index: Math.floor(dataLength * (i + 1) / 4),
            magnitude: 10,
          });
        }
        break;

      case 'frequent':
        // Many anomalies throughout
        for (let i = 0; i < dataLength; i += 10) {
          anomalies.push({
            type: i % 20 === 0 ? 'missing' : 'outlier',
            index: i,
            magnitude: 5,
          });
        }
        break;

      case 'clustered':
        // Cluster of anomalies in one section
        const clusterStart = Math.floor(dataLength / 2);
        for (let i = 0; i < 10; i++) {
          anomalies.push({
            type: 'spike',
            index: clusterStart + i,
            magnitude: Math.random() * 10 + 5,
          });
        }
        break;

      case 'extreme':
        // Extreme values
        anomalies.push({
          type: 'outlier',
          index: Math.floor(dataLength / 2),
          magnitude: 10000,
        });
        break;
    }

    return anomalies;
  }
}

/**
 * Edge case generators for comprehensive testing
 */
export class EdgeCaseGenerator {
  /**
   * Generate null/undefined values
   *
   * @returns Array of null/undefined values
   */
  static generateNullValues(): (null | undefined)[] {
    return [null, undefined, null, undefined, null];
  }

  /**
   * Generate extreme numbers
   *
   * @returns Array of extreme numbers
   */
  static generateExtremeNumbers(): number[] {
    return [
      Number.MAX_VALUE,
      Number.MIN_VALUE,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      0,
      -0,
      Number.NaN,
    ];
  }

  /**
   * Generate empty/whitespace strings
   *
   * @returns Array of empty/whitespace strings
   */
  static generateEmptyStrings(): string[] {
    return ['', ' ', '  ', '\t', '\n', '\r\n', ' \t \n '];
  }

  /**
   * Generate special characters
   *
   * @returns Array of strings with special characters
   */
  static generateSpecialCharacters(): string[] {
    return [
      '!@#$%^&*()',
      '[]{};:,.<>?',
      '`~\'"|\\/',
      '\u0000\u0001\u0002',
      '中文日本語한국어',
      '🎉🎊🎈',
      'µ©®™§¶',
    ];
  }

  /**
   * Generate mixed type arrays
   *
   * @returns Array with mixed types
   */
  static generateMixedTypes(): unknown[] {
    return [
      42,
      'string',
      true,
      false,
      null,
      undefined,
      [],
      {},
      () => {},
      new Date(),
      /regex/,
    ];
  }

  /**
   * Generate circular reference objects
   *
   * @returns Object with circular references
   */
  static generateCircularReference(): Record<string, unknown> {
    const obj: Record<string, unknown> = { name: 'circular' };
    obj.self = obj;
    obj.parent = { child: obj };
    return obj;
  }

  /**
   * Generate deeply nested structures
   *
   * @param depth - Nesting depth
   * @returns Nested object
   */
  static generateNestedStructure(depth: number = 10): Record<string, unknown> {
    let result: Record<string, unknown> = { value: 'deep' };
    for (let i = 0; i < depth; i++) {
      result = { nested: result };
    }
    return result;
  }

  /**
   * Generate large data sets for stress testing
   *
   * @param size - Number of items
   * @returns Large array
   */
  static generateLargeDataSet(size: number = 10000): number[] {
    return Array.from({ length: size }, (_, i) => i);
  }

  /**
   * Generate duplicate values
   *
   * @param count - Number of duplicates
   * @returns Array with duplicates
   */
  static generateDuplicates(count: number = 100): number[] {
    const value = 42;
    return Array.from({ length: count }, () => value);
  }

  /**
   * Generate unsorted data for sorting tests
   *
   * @param count - Number of items
   * @returns Unsorted array
   */
  static generateUnsortedData(count: number = 100): number[] {
    const data = Array.from({ length: count }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [data[i], data[j]] = [data[j], data[i]];
    }
    return data;
  }
}

/**
 * Factory for creating various data generators
 */
export class DataGeneratorFactory {
  /**
   * Create a random data generator
   *
   * @param seed - Optional seed for reproducibility
   * @returns RandomDataGenerator instance
   */
  static random(seed?: number): RandomDataGenerator {
    return new RandomDataGenerator(seed);
  }

  /**
   * Create a formula generator
   *
   * @returns FormulaGenerator (static class)
   */
  static formula(): typeof FormulaGenerator {
    return FormulaGenerator;
  }

  /**
   * Create a time series generator
   *
   * @returns TimeSeriesGenerator (static class)
   */
  static timeSeries(): typeof TimeSeriesGenerator {
    return TimeSeriesGenerator;
  }

  /**
   * Create an anomaly injector
   *
   * @returns AnomalyInjector (static class)
   */
  static anomalies(): typeof AnomalyInjector {
    return AnomalyInjector;
  }

  /**
   * Create an edge case generator
   *
   * @returns EdgeCaseGenerator (static class)
   */
  static edgeCases(): typeof EdgeCaseGenerator {
    return EdgeCaseGenerator;
  }
}
