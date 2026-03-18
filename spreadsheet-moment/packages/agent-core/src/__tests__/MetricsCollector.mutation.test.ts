/**
 * MetricsCollector Mutation Tests
 *
 * These tests are specifically designed to kill common mutations that Stryker
 * would introduce. Each test targets a specific type of mutation to ensure
 * our tests are robust and catch behavioral changes.
 *
 * Common Mutations Targeted:
 * - Arithmetic: x + 1 → x - 1, x * 2 → x / 2
 * - Logical: if (cond) → if (!cond), && → ||, || → &&
 * - Relational: x > y → x >= y, x === y → x !== y
 * - Conditional: x ? y : z → !x ? y : z
 * - Array: push(x) → pop(x), includes(x) → !includes(x)
 *
 * @packageDocumentation
 */

import { MetricsCollector } from '../monitoring/MetricsCollector';
import { MetricType, MetricCategory } from '../monitoring/MetricsCollector';

describe('MetricsCollector Mutation Tests', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('Arithmetic Mutations', () => {
    it('should ADD counter values (not subtract)', () => {
      // This test kills the mutation: value += amount → value -= amount
      collector.recordCounter('test', 5);
      collector.recordCounter('test', 3);

      const result = collector.getCounter('test');

      // If += was mutated to -=, result would be 2 instead of 8
      expect(result).toBe(8);
      expect(result).not.toBe(2);
    });

    it('should sum multiple counter increments', () => {
      // Kills: total = a + b → total = a - b
      collector.recordCounter('multi', 10);
      collector.recordCounter('multi', 20);
      collector.recordCounter('multi', 30);

      expect(collector.getCounter('multi')).toBe(60);
      expect(collector.getCounter('multi')).not.toBe(0); // Would be 60 - 60
      expect(collector.getCounter('multi')).not.toBe(-40); // Would be 10 - 20 - 30
    });

    it('should increment counters by positive amounts', () => {
      // Kills: value += amount → value *= amount
      collector.recordCounter('multiply_test', 5);
      collector.recordCounter('multiply_test', 3);

      const result = collector.getCounter('multiply_test');

      // If += was mutated to *=, result would be 15 instead of 8
      expect(result).toBe(8);
      expect(result).not.toBe(15);
    });
  });

  describe('Logical Mutations', () => {
    it('should reset counters to zero (not keep values)', () => {
      // Kills: reset() { value = 0 } → reset() { value = 1 } or skip reset
      collector.recordCounter('reset_test', 100);
      collector.reset();

      // If reset was mutated to not work, value would still be 100
      expect(collector.getCounter('reset_test')).toBe(0);
      expect(collector.getCounter('reset_test')).not.toBe(100);
    });

    it('should handle missing counters as zero (not undefined)', () => {
      // Kills: return this.counters.get(key) || 0 → return this.counters.get(key)
      const result = collector.getCounter('nonexistent');

      // If || 0 was removed, result would be undefined
      expect(result).toBe(0);
      expect(result).not.toBeUndefined();
    });

    it('should respect category filtering (AND, not OR)', () => {
      // Kills: if (cat1 && cat2) → if (cat1 || cat2)
      collector.recordCounter('cat1', 1, { type: 'A', category: 'X' });
      collector.recordCounter('cat2', 2, { type: 'B', category: 'Y' });
      collector.recordCounter('cat3', 3, { type: 'A', category: 'Y' });

      const result = collector.getCounterByTags({ type: 'A', category: 'Y' });

      // If && was mutated to ||, result would be 6 (1+2+3) instead of 3
      expect(result).toBe(3);
      expect(result).not.toBe(6);
    });
  });

  describe('Relational Mutations', () => {
    it('should use strict greater than (not greater or equal)', () => {
      // Kills: if (value > threshold) → if (value >= threshold)
      const thresholdCollector = new MetricsCollector();
      thresholdCollector.setAlertThreshold('test', MetricType.GAUGE, 100);

      thresholdCollector.recordGauge('test', 100);

      // If > was mutated to >=, this would trigger alert at exactly 100
      const alerts = thresholdCollector.getAlerts();
      expect(alerts.length).toBe(0);

      thresholdCollector.recordGauge('test', 101);
      const alerts2 = thresholdCollector.getAlerts();
      expect(alerts2.length).toBe(1);
    });

    it('should distinguish between zero and non-zero', () => {
      // Kills: if (value !== 0) → if (value == 0)
      collector.recordCounter('zero_test', 0);

      const hasValue = collector.hasMetric('zero_test');

      // Should have metric even if value is 0
      expect(hasValue).toBe(true);
    });
  });

  describe('Array Mutations', () => {
    it('should append to histogram buckets (not remove)', () => {
      // Kills: histogram.push(value) → histogram.pop(value)
      collector.recordHistogram('test', 10);
      collector.recordHistogram('test', 20);
      collector.recordHistogram('test', 30);

      const stats = collector.getHistogramStats('test');

      // If push was mutated to pop, count would decrease
      expect(stats.count).toBe(3);
      expect(stats.count).not.toBeLessThan(3);
    });

    it('should include values in array (not exclude)', () => {
      // Kills: if (array.includes(value)) → if (!array.includes(value))
      collector.recordCounter('includes_test', 5, { type: 'A' });
      collector.recordCounter('includes_test', 10, { type: 'B' });

      const allCounters = collector.getAllCounters();

      // If includes was negated, one counter would be missing
      expect(allCounters.length).toBeGreaterThanOrEqual(2);
    });

    it('should find minimum value correctly', () => {
      // Kills: Math.min(...values) → Math.max(...values)
      const values = [10, 5, 20, 3, 15];
      values.forEach(v => collector.recordHistogram('min_test', v));

      const stats = collector.getHistogramStats('min_test');

      // If min was mutated to max, would return 20 instead of 3
      expect(stats.min).toBe(3);
      expect(stats.min).not.toBe(20);
    });

    it('should find maximum value correctly', () => {
      // Kills: Math.max(...values) → Math.min(...values)
      const values = [10, 5, 20, 3, 15];
      values.forEach(v => collector.recordHistogram('max_test', v));

      const stats = collector.getHistogramStats('max_test');

      // If max was mutated to min, would return 3 instead of 20
      expect(stats.max).toBe(20);
      expect(stats.max).not.toBe(3);
    });
  });

  describe('Conditional Mutations', () => {
    it('should create new counter if not exists', () => {
      // Kills: if (!exists) create → if (exists) create
      collector.recordCounter('new_test', 5);

      // Should create new counter, not skip it
      expect(collector.getCounter('new_test')).toBe(5);
      expect(collector.getCounter('new_test')).not.toBe(0);
    });

    it('should update existing counter if exists', () => {
      // Kills: if (exists) update → if (!exists) update
      collector.recordCounter('update_test', 5);
      collector.recordCounter('update_test', 3);

      // Should update existing counter, not create new one
      expect(collector.getCounter('update_test')).toBe(8);
      expect(collector.getCounter('update_test')).not.toBe(3);
    });

    it('should use correct aggregation type', () => {
      // Kills: type === 'SUM' → type !== 'SUM'
      collector.recordCounter('sum_test', 5);
      collector.recordCounter('sum_test', 3);

      // Should sum, not replace
      expect(collector.getCounter('sum_test')).toBe(8);
    });
  });

  describe('String Mutations', () => {
    it('should match exact metric names (case-sensitive)', () => {
      // Kills: name.toLowerCase() → name.toUpperCase()
      collector.recordCounter('CaseSensitive', 5);

      // Should not match different cases
      expect(collector.getCounter('casesensitive')).toBe(0);
      expect(collector.getCounter('CASESENSITIVE')).toBe(0);
      expect(collector.getCounter('CaseSensitive')).toBe(5);
    });

    it('should handle empty metric names', () => {
      // Kills: if (name) → if (!name)
      expect(() => {
        collector.recordCounter('', 5);
      }).not.toThrow();
    });
  });

  describe('Mathematical Properties', () => {
    it('should calculate average correctly', () => {
      // Kills: avg = sum / count → avg = sum * count or other mutation
      const values = [10, 20, 30, 40, 50];
      values.forEach(v => collector.recordHistogram('avg_test', v));

      const stats = collector.getHistogramStats('avg_test');

      const expectedAvg = (10 + 20 + 30 + 40 + 50) / 5;
      expect(stats.avg).toBeCloseTo(expectedAvg, 2);
      expect(stats.avg).not.toBe(150); // Would be sum * count
      expect(stats.avg).not.toBe(30); // Would be median
    });

    it('should calculate sum correctly', () => {
      // Kills: sum = values.reduce((a,b) => a+b) → sum = values.reduce((a,b) => a-b)
      const values = [10, 20, 30, 40, 50];
      values.forEach(v => collector.recordHistogram('sum_test', v));

      const stats = collector.getHistogramStats('sum_test');

      expect(stats.sum).toBe(150);
      expect(stats.sum).not.toBe(-90); // Would be 10-20-30-40-50
    });
  });

  describe('Boundary Mutations', () => {
    it('should handle zero values', () => {
      // Kills: value > 0 → value >= 0 or value < 0
      collector.recordCounter('zero_value', 0);

      expect(collector.getCounter('zero_value')).toBe(0);
      expect(collector.hasMetric('zero_value')).toBe(true);
    });

    it('should handle negative values in gauges', () => {
      // Kills: if (value < 0) throw → if (value <= 0) throw or skip check
      collector.recordGauge('negative_test', -10);

      expect(collector.getGauge('negative_test')).toBe(-10);
    });

    it('should handle very large values', () => {
      // Kills: value > MAX_SAFE_INTEGER → value >= MAX_SAFE_INTEGER
      const largeValue = Number.MAX_SAFE_INTEGER;

      collector.recordCounter('large_test', largeValue);

      expect(collector.getCounter('large_test')).toBe(largeValue);
    });

    it('should handle very small decimal values', () => {
      // Kills: if (value < 0.001) skip → if (value <= 0.001) skip
      collector.recordHistogram('small_test', 0.0001);

      const stats = collector.getHistogramStats('small_test');

      expect(stats.min).toBeCloseTo(0.0001, 5);
    });
  });

  describe('Tag Mutations', () => {
    it('should match all tags (AND logic)', () => {
      // Kills: tags.match(query) → tags.matchAny(query)
      collector.recordCounter('tag_test1', 1, { env: 'prod', region: 'us' });
      collector.recordCounter('tag_test2', 2, { env: 'dev', region: 'us' });
      collector.recordCounter('tag_test3', 3, { env: 'prod', region: 'eu' });

      const result = collector.getCounterByTags({ env: 'prod', region: 'us' });

      // Should only match first counter (AND logic)
      expect(result).toBe(1);
      expect(result).not.toBe(6); // Would match all (OR logic)
    });

    it('should handle missing tags', () => {
      // Kills: if (tags) → if (!tags)
      collector.recordCounter('no_tags', 5);

      expect(collector.getCounter('no_tags')).toBe(5);
    });
  });

  describe('Timestamp Mutations', () => {
    it('should use current time (not fixed time)', () => {
      // Kills: Date.now() → fixed timestamp
      const before = Date.now();
      collector.recordCounter('timestamp_test', 1);
      const after = Date.now();

      const metric = collector.getMetric('timestamp_test');

      if (metric && metric.timestamp) {
        expect(metric.timestamp).toBeGreaterThanOrEqual(before);
        expect(metric.timestamp).toBeLessThanOrEqual(after);
      }
    });

    it('should respect time windows', () => {
      // Kills: if (withinWindow) → if (!withinWindow)
      collector.recordCounter('window_test', 1);
      collector.recordCounter('window_test', 2, {}, Date.now() - 10000); // 10s ago

      const recent = collector.getCounterInTimeWindow('window_test', 5000); // 5s window

      // Should only count recent value
      expect(recent).toBe(1);
      expect(recent).not.toBe(3); // Would include old value
    });
  });
});
