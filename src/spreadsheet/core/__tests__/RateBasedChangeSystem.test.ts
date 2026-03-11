/**
 * Unit tests for Rate-Based Change Mechanics System
 *
 * Tests the mathematical implementations from the Rate-Based Change Mechanics white paper:
 * - Theorem 2.1: Rate-State Duality
 * - Theorem 3.1: Euler Discretization
 * - Theorem 4.1: Gaussian Deadband false positive rates
 * - Theorem 5.1: State Bounds from Rate Bounds
 * - Theorem 6.1: Sensitivity Formula
 * - Theorem 7.3: Taylor Expansion with Rates
 * - Theorem 9.1-9.4: Implementation Verification
 */

import { RateBasedChangeSystem, DeadbandConfig, RateStatistics } from '../RateBasedChangeSystem';
import { CellReference } from '../Sensation';

describe('RateBasedChangeSystem', () => {
  let system: RateBasedChangeSystem;
  let testCell: CellReference;

  beforeEach(() => {
    system = new RateBasedChangeSystem();
    testCell = { row: 0, col: 0, sheet: 'TestSheet' };
  });

  describe('Theorem 2.1: Rate-State Duality', () => {
    it('should integrate constant rate correctly', () => {
      const initialValue = 10;
      const constantRate = (t: number) => 2; // Constant rate of 2
      const startTime = 0;
      const endTime = 5;

      const result = system.integrateRate(initialValue, constantRate, startTime, endTime, 100);

      // ∫2 dt from 0 to 5 = 10, plus initial 10 = 20
      expect(result).toBeCloseTo(20, 1);
    });

    it('should integrate linear rate correctly', () => {
      const initialValue = 0;
      const linearRate = (t: number) => t; // r(t) = t
      const startTime = 0;
      const endTime = 3;

      const result = system.integrateRate(initialValue, linearRate, startTime, endTime, 1000);

      // ∫t dt from 0 to 3 = t²/2 = 9/2 = 4.5
      expect(result).toBeCloseTo(4.5, 2);
    });

    it('should integrate sinusoidal rate correctly', () => {
      const initialValue = 0;
      const sinRate = (t: number) => Math.cos(t); // r(t) = cos(t)
      const startTime = 0;
      const endTime = Math.PI / 2;

      const result = system.integrateRate(initialValue, sinRate, startTime, endTime, 1000);

      // ∫cos(t) dt from 0 to π/2 = sin(π/2) - sin(0) = 1 - 0 = 1
      expect(result).toBeCloseTo(1, 3);
    });
  });

  describe('Theorem 3.1: Euler Discretization', () => {
    it('should compute Euler step correctly', () => {
      const currentValue = 10;
      const currentRate = 2;
      const timeStep = 3;

      const result = system.eulerStep(currentValue, currentRate, timeStep);

      // x_{k+1} = x_k + r_k Δt = 10 + 2*3 = 16
      expect(result).toBe(16);
    });

    it('should handle negative rates', () => {
      const currentValue = 20;
      const currentRate = -5;
      const timeStep = 2;

      const result = system.eulerStep(currentValue, currentRate, timeStep);

      // 20 + (-5)*2 = 10
      expect(result).toBe(10);
    });

    it('should handle zero time step', () => {
      const currentValue = 15;
      const currentRate = 10;
      const timeStep = 0;

      const result = system.eulerStep(currentValue, currentRate, timeStep);

      // No change when Δt = 0
      expect(result).toBe(15);
    });
  });

  describe('Theorem 4.1: Gaussian Deadband Mathematics', () => {
    it('should detect anomalies outside statistical deadband', () => {
      // Build up statistics
      const stats: RateStatistics = {
        mean: 100,
        variance: 25, // stdDev = 5
        stdDev: 5,
        count: 100,
        lastUpdated: Date.now(),
      };

      const config: DeadbandConfig = {
        type: 'statistical',
        lowerBound: 3, // 3 sigma
        upperBound: 3,
      };

      // Test values at different sigma distances
      const testCases = [
        { rate: 100, expectedAnomaly: false }, // At mean
        { rate: 110, expectedAnomaly: false }, // 2 sigma (within 3 sigma)
        { rate: 115, expectedAnomaly: false }, // 3 sigma (at boundary)
        { rate: 116, expectedAnomaly: true },  // 3.2 sigma (outside)
        { rate: 85, expectedAnomaly: false },  // -3 sigma (at boundary)
        { rate: 84, expectedAnomaly: true },   // -3.2 sigma (outside)
      ];

      // Mock the statistics for the test cell
      const key = `${testCell.sheet}:${testCell.row}:${testCell.col}`;
      (system as any).rateStats.set(key, stats);
      system.setDeadbandConfig(testCell, config);

      testCases.forEach(({ rate, expectedAnomaly }) => {
        const result = system.checkAnomaly(testCell, rate);
        expect(result.isAnomaly).toBe(expectedAnomaly);
      });
    });

    it('should compute correct deadband bounds', () => {
      const stats: RateStatistics = {
        mean: 50,
        variance: 100, // stdDev = 10
        stdDev: 10,
        count: 100,
        lastUpdated: Date.now(),
      };

      const config: DeadbandConfig = {
        type: 'statistical',
        lowerBound: 2,
        upperBound: 2,
      };

      const key = `${testCell.sheet}:${testCell.row}:${testCell.col}`;
      (system as any).rateStats.set(key, stats);
      system.setDeadbandConfig(testCell, config);

      const result = system.checkAnomaly(testCell, 75); // 2.5 sigma

      // Bounds should be 50 ± 2*10 = [30, 70]
      expect(result.deadband.lower).toBeCloseTo(30, 1);
      expect(result.deadband.upper).toBeCloseTo(70, 1);
      expect(result.isAnomaly).toBe(true); // 75 > 70
      expect(result.deviation).toBeCloseTo(5, 1); // 75 - 70 = 5
    });

    it('should handle fixed deadbands', () => {
      const config: DeadbandConfig = {
        type: 'fixed',
        lowerBound: -10,
        upperBound: 10,
      };

      system.setDeadbandConfig(testCell, config);

      const testCases = [
        { rate: 5, expectedAnomaly: false },
        { rate: -5, expectedAnomaly: false },
        { rate: 15, expectedAnomaly: true },
        { rate: -15, expectedAnomaly: true },
      ];

      testCases.forEach(({ rate, expectedAnomaly }) => {
        const result = system.checkAnomaly(testCell, rate);
        expect(result.isAnomaly).toBe(expectedAnomaly);
      });
    });
  });

  describe('Theorem 5.1: State Bounds from Rate Bounds', () => {
    it('should compute correct state bounds', () => {
      const initialValue = 100;
      const maxRate = 5;
      const elapsedTime = 10;

      const bounds = system.computeStateBounds(initialValue, maxRate, elapsedTime);

      // Bound = maxRate * elapsedTime = 5 * 10 = 50
      // Lower = 100 - 50 = 50, Upper = 100 + 50 = 150
      expect(bounds.lower).toBe(50);
      expect(bounds.upper).toBe(150);
    });

    it('should handle zero elapsed time', () => {
      const initialValue = 50;
      const maxRate = 10;
      const elapsedTime = 0;

      const bounds = system.computeStateBounds(initialValue, maxRate, elapsedTime);

      // No time elapsed, so bounds are just the initial value
      expect(bounds.lower).toBe(50);
      expect(bounds.upper).toBe(50);
    });

    it('should handle negative max rate (absolute value used)', () => {
      const initialValue = 0;
      const maxRate = -3; // Should use absolute value
      const elapsedTime = 5;

      const bounds = system.computeStateBounds(initialValue, maxRate, elapsedTime);

      // Bound = | -3 | * 5 = 15
      expect(bounds.lower).toBe(-15);
      expect(bounds.upper).toBe(15);
    });
  });

  describe('Theorem 6.1: Sensitivity Formula', () => {
    it('should compute sensitivity correctly', () => {
      const testCases = [
        { currentTime: 10, perturbationTime: 5, expected: 1 }, // τ ≤ t
        { currentTime: 10, perturbationTime: 10, expected: 1 }, // τ = t
        { currentTime: 10, perturbationTime: 15, expected: 0 }, // τ > t
      ];

      testCases.forEach(({ currentTime, perturbationTime, expected }) => {
        const sensitivity = system.computeSensitivity(currentTime, perturbationTime);
        expect(sensitivity).toBe(expected);
      });
    });
  });

  describe('Theorem 7.3: Taylor Expansion with Rates', () => {
    it('should predict state using velocity only', () => {
      const currentState = 100;
      const rates = { velocity: 2 };
      const timeStep = 5;

      const prediction = system.predictState(currentState, rates, timeStep);

      // x(t+Δt) = x(t) + vΔt = 100 + 2*5 = 110
      expect(prediction).toBe(110);
    });

    it('should predict state using velocity and acceleration', () => {
      const currentState = 100;
      const rates = { velocity: 2, acceleration: 0.5 };
      const timeStep = 4;

      const prediction = system.predictState(currentState, rates, timeStep);

      // x(t+Δt) = x + vΔt + ½aΔt² = 100 + 2*4 + 0.5*0.5*16 = 100 + 8 + 4 = 112
      expect(prediction).toBeCloseTo(112, 1);
    });

    it('should predict state using higher-order rates', () => {
      const currentState = 0;
      const rates = {
        velocity: 1,
        acceleration: 1,
        jerk: 1,
        snap: 1,
        crackle: 1,
        pop: 1,
      };
      const timeStep = 1;

      const prediction = system.predictState(currentState, rates, timeStep);

      // Taylor expansion with Δt=1:
      // 0 + 1*1 + 0.5*1*1 + (1/6)*1*1 + (1/24)*1*1 + (1/120)*1*1 + (1/720)*1*1
      // = 1 + 0.5 + 0.1667 + 0.0417 + 0.0083 + 0.0014 ≈ 1.718
      expect(prediction).toBeCloseTo(1.718, 3);
    });

    it('should handle missing rates (use available ones)', () => {
      const currentState = 50;
      const rates = { acceleration: 2 }; // No velocity
      const timeStep = 3;

      const prediction = system.predictState(currentState, rates, timeStep);

      // Only acceleration term: ½aΔt² = 0.5*2*9 = 9
      // Plus initial state: 50 + 9 = 59
      expect(prediction).toBeCloseTo(59, 1);
    });
  });

  describe('Rate Estimation and Processing', () => {
    it('should estimate rate from history', () => {
      // Create a test history with known rates
      const history = [
        { timestamp: 0, value: 0, rate: 1 },
        { timestamp: 1, value: 1, rate: 1 },
        { timestamp: 2, value: 3, rate: 2 }, // Acceleration: rate changed from 1 to 2
      ];

      const estimatedRate = (system as any).estimateRateFromHistory(history, 1);

      // Between timestamps 1 and 2: (3-1)/(2-1) = 2
      expect(estimatedRate).toBeCloseTo(2, 1);
    });

    it('should process values and compute rates', () => {
      const timestamp1 = Date.now();
      const timestamp2 = timestamp1 + 1000; // 1 second later
      const timestamp3 = timestamp2 + 1000; // Another second

      // Process first value
      const entry1 = system.processValue(testCell, 0, timestamp1);
      expect(entry1.value).toBe(0);
      expect(entry1.rate).toBe(0); // No previous value

      // Process second value
      const entry2 = system.processValue(testCell, 10, timestamp2);
      expect(entry2.value).toBe(10);
      expect(entry2.rate).toBeCloseTo(0.01, 3); // 10/1000 = 0.01 per ms = 10 per second

      // Process third value
      const entry3 = system.processValue(testCell, 30, timestamp3);
      expect(entry3.value).toBe(30);
      // Rate: (30-10)/1000 = 0.02 per ms = 20 per second
      expect(entry3.rate).toBeCloseTo(0.02, 3);
      // Acceleration: (0.02-0.01)/1000 = 0.00001 per ms² = 10 per s²
      expect(entry3.acceleration).toBeCloseTo(0.00001, 7);
    });

    it('should maintain history length limit', () => {
      const maxLength = 5;
      const limitedSystem = new RateBasedChangeSystem(maxLength);

      // Add more values than max length
      for (let i = 0; i < 10; i++) {
        limitedSystem.processValue(testCell, i, Date.now() + i * 1000);
      }

      const history = limitedSystem.getHistory(testCell);
      expect(history.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe('Adaptive Statistics', () => {
    it('should update statistics with exponential smoothing', () => {
      const key = `${testCell.sheet}:${testCell.row}:${testCell.col}`;
      const alpha = 0.1;

      // First update
      const stats1 = (system as any).updateRateStatistics(key, 100, alpha);
      expect(stats1.mean).toBe(100);
      expect(stats1.count).toBe(1);

      // Second update
      const stats2 = (system as any).updateRateStatistics(key, 110, alpha);
      // New mean = 100 + 0.1*(110-100) = 101
      expect(stats2.mean).toBeCloseTo(101, 1);
      expect(stats2.count).toBe(2);

      // Third update
      const stats3 = (system as any).updateRateStatistics(key, 90, alpha);
      // New mean = 101 + 0.1*(90-101) = 101 - 1.1 = 99.9
      expect(stats3.mean).toBeCloseTo(99.9, 1);
      expect(stats3.count).toBe(3);
      expect(stats3.stdDev).toBeGreaterThan(0); // Should have non-zero std dev
    });

    it('should handle adaptive deadbands with minimum width', () => {
      const config: DeadbandConfig = {
        type: 'adaptive',
        lowerBound: 2,
        upperBound: 2,
        minWidth: 10,
        alpha: 0.1,
      };

      // Create statistics with very small std dev
      const stats: RateStatistics = {
        mean: 50,
        variance: 0.25, // stdDev = 0.5
        stdDev: 0.5,
        count: 100,
        lastUpdated: Date.now(),
      };

      const key = `${testCell.sheet}:${testCell.row}:${testCell.col}`;
      (system as any).rateStats.set(key, stats);
      system.setDeadbandConfig(testCell, config);

      const result = system.checkAnomaly(testCell, 60);

      // Without minWidth: bounds would be 50 ± 2*0.5 = [49, 51] (width = 2)
      // With minWidth=10: bounds should be 50 ± 5 = [45, 55]
      expect(result.deadband.upper - result.deadband.lower).toBeCloseTo(10, 1);
      expect(result.deadband.lower).toBeCloseTo(45, 1);
      expect(result.deadband.upper).toBeCloseTo(55, 1);
      expect(result.isAnomaly).toBe(true); // 60 > 55
    });
  });

  describe('Theorem 9.1-9.4: Implementation Verification', () => {
    it('should verify implementation with known functions', () => {
      const verification = system.verifyImplementation();

      // Rate estimation error should be small
      expect(verification.rateEstimationError).toBeLessThan(0.1);

      // Integration error should be small
      expect(verification.integrationError).toBeLessThan(0.01);

      // Deadband coverage should match theoretical value
      expect(verification.deadbandCoverage).toBeCloseTo(0.997, 3);
    });

    it('should compute convergence time estimates', () => {
      const initialError = 100;
      const decayRate = 0.1; // 10% decay per time unit
      const tolerance = 1;

      const convergenceTime = (system as any).estimateConvergenceTime(
        initialError,
        decayRate,
        tolerance
      );

      // Solve: 100 * e^{-0.1t} = 1
      // e^{-0.1t} = 0.01
      // -0.1t = ln(0.01) = -4.605
      // t = 46.05
      expect(convergenceTime).toBeCloseTo(46.05, 1);
    });
  });

  describe('Utility Methods', () => {
    it('should clear cell history and statistics', () => {
      // Add some data
      system.processValue(testCell, 100);
      system.processValue(testCell, 110);

      // Verify data exists
      expect(system.getHistory(testCell).length).toBeGreaterThan(0);
      expect(system.getStatistics(testCell)).toBeDefined();

      // Clear cell
      system.clearCell(testCell);

      // Verify cleared
      expect(system.getHistory(testCell).length).toBe(0);
      expect(system.getStatistics(testCell)).toBeUndefined();
    });

    it('should clear all data', () => {
      const cell1 = { row: 0, col: 0 };
      const cell2 = { row: 1, col: 1 };

      // Add data to multiple cells
      system.processValue(cell1, 100);
      system.processValue(cell2, 200);

      // Clear all
      system.clearAll();

      // Verify all cleared
      expect(system.getHistory(cell1).length).toBe(0);
      expect(system.getHistory(cell2).length).toBe(0);
    });
  });
});