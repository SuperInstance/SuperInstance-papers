/**
 * Deadband Controller
 * 
 * Implements deadband range threshold logic for autonomous operation vs teacher calls.
 * The agent operates autonomously within the deadband range and calls the teacher
 * when operating outside the acceptable range.
 */

export interface DeadbandConfig {
  /** Lower bound of deadband (0.0 - 1.0) */
  low: number;
  /** Upper bound of deadband (0.0 - 1.0) */
  high: number;
  /** Hysteresis factor to prevent oscillation at boundaries */
  hysteresis: number;
  /** Time window for moving average in milliseconds */
  smoothingWindowMs: number;
  /** Adaptive learning rate for deadband adjustment */
  adaptivityRate: number;
}

export interface DeadbandState {
  /** Current position relative to deadband */
  position: 'within' | 'below' | 'above';
  /** Distance from nearest boundary (negative if within) */
  distance: number;
  /** Whether teacher should be called */
  shouldCallTeacher: boolean;
  /** Recent confidence readings for smoothing */
  recentReadings: number[];
  /** Last state change timestamp */
  lastStateChange: number;
  /** Adaptive deadband adjustments */
  adjustments: DeadbandAdjustment[];
}

export interface DeadbandAdjustment {
  timestamp: number;
  direction: 'expand' | 'contract';
  amount: number;
  reason: string;
}

export type TeacherCallReason = 
  | 'below_deadband'
  | 'above_deadband'
  | 'simulation_mismatch'
  | 'learning_opportunity'
  | 'high_stakes_task';

export interface TeacherCallDecision {
  shouldCall: boolean;
  reason: TeacherCallReason | null;
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedBenefit: number;
}

/**
 * DeadbandController manages the range within which the agent operates autonomously.
 * Outside this range, the agent calls a teacher for guidance.
 */
export class DeadbandController {
  private config: DeadbandConfig;
  private state: DeadbandState;
  private callHistory: Array<{ timestamp: number; reason: TeacherCallReason }> = [];
  private adaptiveLow: number;
  private adaptiveHigh: number;

  constructor(config: Partial<DeadbandConfig> = {}) {
    this.config = {
      low: config.low ?? 0.6,
      high: config.high ?? 0.9,
      hysteresis: config.hysteresis ?? 0.05,
      smoothingWindowMs: config.smoothingWindowMs ?? 5000,
      adaptivityRate: config.adaptivityRate ?? 0.01,
    };

    this.adaptiveLow = this.config.low;
    this.adaptiveHigh = this.config.high;

    this.state = {
      position: 'within',
      distance: 0,
      shouldCallTeacher: false,
      recentReadings: [],
      lastStateChange: Date.now(),
      adjustments: [],
    };
  }

  /**
   * Evaluate current confidence against deadband boundaries
   */
  evaluate(confidence: number): TeacherCallDecision {
    // Update recent readings for smoothing
    this.updateRecentReadings(confidence);
    const smoothedConfidence = this.getSmoothedConfidence();

    // Determine position relative to deadband
    const position = this.getPosition(smoothedConfidence);
    const distance = this.calculateDistance(smoothedConfidence);

    // Update state
    this.updateState(position, distance);

    // Make teacher call decision
    return this.makeDecision(smoothedConfidence, position);
  }

  /**
   * Check if simulation results match actual outcomes
   */
  evaluateSimulation(
    expectedConfidence: number,
    actualConfidence: number,
    tolerance: number = 0.1
  ): TeacherCallDecision {
    const mismatch = Math.abs(expectedConfidence - actualConfidence);
    
    if (mismatch > tolerance) {
      return {
        shouldCall: true,
        reason: 'simulation_mismatch',
        confidence: actualConfidence,
        urgency: this.determineUrgency(actualConfidence),
        estimatedBenefit: mismatch * 0.5, // Learning benefit proportional to mismatch
      };
    }

    return {
      shouldCall: false,
      reason: null,
      confidence: actualConfidence,
      urgency: 'low',
      estimatedBenefit: 0,
    };
  }

  /**
   * Record a teacher call for analytics
   */
  recordTeacherCall(reason: TeacherCallReason): void {
    this.callHistory.push({
      timestamp: Date.now(),
      reason,
    });

    // Prune old history (keep last 100 calls)
    if (this.callHistory.length > 100) {
      this.callHistory = this.callHistory.slice(-100);
    }
  }

  /**
   * Adapt deadband based on learning progress
   */
  adapt(learningProgress: number): void {
    if (learningProgress > 0.8) {
      // Learning is going well, can expand deadband (more autonomy)
      const expansion = this.config.adaptivityRate * learningProgress;
      this.adaptiveLow = Math.max(0.4, this.adaptiveLow - expansion);
      this.adaptiveHigh = Math.min(0.95, this.adaptiveHigh + expansion * 0.5);
      
      this.recordAdjustment('expand', expansion, 'good_learning_progress');
    } else if (learningProgress < 0.3) {
      // Learning is struggling, contract deadband (more guidance)
      const contraction = this.config.adaptivityRate * (1 - learningProgress);
      this.adaptiveLow = Math.min(this.config.low, this.adaptiveLow + contraction);
      this.adaptiveHigh = Math.max(this.config.high, this.adaptiveHigh - contraction * 0.5);
      
      this.recordAdjustment('contract', contraction, 'learning_difficulty');
    }
  }

  /**
   * Get current deadband boundaries
   */
  getBoundaries(): { low: number; high: number } {
    return {
      low: this.adaptiveLow,
      high: this.adaptiveHigh,
    };
  }

  /**
   * Get call frequency statistics
   */
  getCallStatistics(): {
    totalCalls: number;
    callsByReason: Record<TeacherCallReason, number>;
    callsInLastHour: number;
    averageIntervalMs: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const callsInLastHour = this.callHistory.filter(c => c.timestamp > oneHourAgo).length;

    const callsByReason: Record<TeacherCallReason, number> = {
      below_deadband: 0,
      above_deadband: 0,
      simulation_mismatch: 0,
      learning_opportunity: 0,
      high_stakes_task: 0,
    };

    for (const call of this.callHistory) {
      callsByReason[call.reason]++;
    }

    // Calculate average interval
    let averageIntervalMs = 0;
    if (this.callHistory.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < this.callHistory.length; i++) {
        intervals.push(this.callHistory[i].timestamp - this.callHistory[i - 1].timestamp);
      }
      averageIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }

    return {
      totalCalls: this.callHistory.length,
      callsByReason,
      callsInLastHour,
      averageIntervalMs,
    };
  }

  /**
   * Reset controller state
   */
  reset(): void {
    this.adaptiveLow = this.config.low;
    this.adaptiveHigh = this.config.high;
    this.state = {
      position: 'within',
      distance: 0,
      shouldCallTeacher: false,
      recentReadings: [],
      lastStateChange: Date.now(),
      adjustments: [],
    };
    this.callHistory = [];
  }

  /**
   * Get current state for serialization
   */
  getState(): DeadbandState {
    return { ...this.state };
  }

  // Private methods

  private updateRecentReadings(confidence: number): void {
    const now = Date.now();
    this.state.recentReadings.push(confidence);
    
    // Prune old readings
    const cutoff = now - this.config.smoothingWindowMs;
    // Keep only recent readings (simplified - in production would track timestamps)
    if (this.state.recentReadings.length > 20) {
      this.state.recentReadings = this.state.recentReadings.slice(-20);
    }
  }

  private getSmoothedConfidence(): number {
    if (this.state.recentReadings.length === 0) return 0.5;
    
    // Simple moving average
    const sum = this.state.recentReadings.reduce((a, b) => a + b, 0);
    return sum / this.state.recentReadings.length;
  }

  private getPosition(confidence: number): 'within' | 'below' | 'above' {
    // Apply hysteresis to prevent oscillation
    const lowWithHysteresis = this.state.position === 'below' 
      ? this.adaptiveLow + this.config.hysteresis 
      : this.adaptiveLow;
    const highWithHysteresis = this.state.position === 'above'
      ? this.adaptiveHigh - this.config.hysteresis
      : this.adaptiveHigh;

    if (confidence < lowWithHysteresis) return 'below';
    if (confidence > highWithHysteresis) return 'above';
    return 'within';
  }

  private calculateDistance(confidence: number): number {
    if (confidence < this.adaptiveLow) {
      return this.adaptiveLow - confidence;
    }
    if (confidence > this.adaptiveHigh) {
      return confidence - this.adaptiveHigh;
    }
    // Within deadband - return negative distance (how far inside)
    const distanceFromLow = confidence - this.adaptiveLow;
    const distanceFromHigh = this.adaptiveHigh - confidence;
    return -Math.min(distanceFromLow, distanceFromHigh);
  }

  private updateState(position: 'within' | 'below' | 'above', distance: number): void {
    if (position !== this.state.position) {
      this.state.lastStateChange = Date.now();
    }
    this.state.position = position;
    this.state.distance = distance;
  }

  private makeDecision(
    confidence: number,
    position: 'within' | 'below' | 'above'
  ): TeacherCallDecision {
    if (position === 'below') {
      return {
        shouldCall: true,
        reason: 'below_deadband',
        confidence,
        urgency: this.determineUrgency(confidence),
        estimatedBenefit: Math.abs(this.state.distance) * 0.8,
      };
    }

    if (position === 'above') {
      // Above deadband might indicate overconfidence or need for validation
      return {
        shouldCall: true,
        reason: 'above_deadband',
        confidence,
        urgency: 'medium',
        estimatedBenefit: this.state.distance * 0.3,
      };
    }

    return {
      shouldCall: false,
      reason: null,
      confidence,
      urgency: 'low',
      estimatedBenefit: 0,
    };
  }

  private determineUrgency(confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence < 0.3) return 'critical';
    if (confidence < 0.5) return 'high';
    if (confidence < 0.6) return 'medium';
    return 'low';
  }

  private recordAdjustment(
    direction: 'expand' | 'contract',
    amount: number,
    reason: string
  ): void {
    this.state.adjustments.push({
      timestamp: Date.now(),
      direction,
      amount,
      reason,
    });

    // Keep last 50 adjustments
    if (this.state.adjustments.length > 50) {
      this.state.adjustments = this.state.adjustments.slice(-50);
    }
  }
}

export default DeadbandController;
