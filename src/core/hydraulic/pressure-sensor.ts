/**
 * POLLN Pressure Sensor
 *
 * Detects system "pressure" - the combination of:
 * - Incoming signals from other agents
 * - External task demand
 * - Internal agent state
 *
 * Based on EMERGENT_GRANULAR_INTELLIGENCE research:
 * Pᵢ(t) = Σⱼ wᵢⱼ · Aⱼ(t) + λ·Φᵢ(t) + Ψᵢ(t)
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Pressure,
  HydraulicConfig,
  HydraulicEvent,
  HydraulicEventType,
  PressureAnalysis,
} from './types';

export class PressureSensor extends EventEmitter {
  private config: HydraulicConfig;
  private pressures: Map<string, Pressure> = new Map();
  private pressureHistory: Map<string, number[]> = new Map();
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<HydraulicConfig> = {}) {
    super();
    this.config = {
      pressureUpdateInterval: 1000,
      pressureDecayRate: 0.01,
      maxPressure: 1.0,
      ...config,
      alertThresholds: {
        highPressure: 0.8,
        lowFlow: 0.1,
        highResistance: 0.7,
        lowReservoir: 0.2,
        ...config.alertThresholds,
      },
    };
  }

  /**
   * Start monitoring pressure
   */
  start(): void {
    if (this.updateTimer) return;

    this.updateTimer = setInterval(() => {
      this.updateAllPressures();
    }, this.config.pressureUpdateInterval);
  }

  /**
   * Stop monitoring pressure
   */
  stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Register an agent for pressure monitoring
   */
  registerAgent(agentId: string, initialPressure: number = 0): void {
    const pressure: Pressure = {
      id: uuidv4(),
      agentId,
      value: initialPressure,
      components: {
        incoming: 0,
        external: 0,
        internal: 0,
      },
      timestamp: Date.now(),
    };

    this.pressures.set(agentId, pressure);
    this.pressureHistory.set(agentId, []);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.pressures.delete(agentId);
    this.pressureHistory.delete(agentId);
  }

  /**
   * Update pressure for a specific agent
   * Pᵢ(t) = Σⱼ wᵢⱼ · Aⱼ(t) + λ·Φᵢ(t) + Ψᵢ(t)
   */
  updatePressure(
    agentId: string,
    incoming: number,
    external: number,
    internal: number
  ): Pressure {
    const existing = this.pressures.get(agentId);
    if (!existing) {
      throw new Error(`Agent ${agentId} not registered`);
    }

    // Apply decay to previous pressure
    const decayedPressure = existing.value * (1 - this.config.pressureDecayRate);

    // Calculate new pressure
    const newValue = Math.min(
      this.config.maxPressure,
      decayedPressure + incoming + external + internal
    );

    const updated: Pressure = {
      ...existing,
      value: newValue,
      components: {
        incoming,
        external,
        internal,
      },
      timestamp: Date.now(),
    };

    this.pressures.set(agentId, updated);

    // Update history
    const history = this.pressureHistory.get(agentId) || [];
    history.push(newValue);
    if (history.length > 100) {
      history.shift();
    }
    this.pressureHistory.set(agentId, history);

    // Check for pressure events
    this.checkPressureEvents(agentId, updated, existing);

    return updated;
  }

  /**
   * Get current pressure for an agent
   */
  getPressure(agentId: string): Pressure | undefined {
    return this.pressures.get(agentId);
  }

  /**
   * Get all pressures
   */
  getAllPressures(): Map<string, Pressure> {
    return new Map(this.pressures);
  }

  /**
   * Get pressure history for an agent
   */
  getPressureHistory(agentId: string): number[] {
    return this.pressureHistory.get(agentId) || [];
  }

  /**
   * Analyze pressure trends and make predictions
   */
  analyzePressure(agentId: string): PressureAnalysis | null {
    const pressure = this.pressures.get(agentId);
    const history = this.pressureHistory.get(agentId);

    if (!pressure || !history || history.length < 3) {
      return null;
    }

    // Determine trend
    const recent = history.slice(-10);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const older = history.slice(-20, -10);
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    let trend: 'rising' | 'falling' | 'stable';
    if (avg > olderAvg + 0.05) {
      trend = 'rising';
    } else if (avg < olderAvg - 0.05) {
      trend = 'falling';
    } else {
      trend = 'stable';
    }

    // Simple forecast using linear extrapolation
    const forecast: number[] = [];
    const slope = trend === 'rising' ? 0.02 : trend === 'falling' ? -0.02 : 0;
    for (let i = 1; i <= 5; i++) {
      forecast.push(Math.max(0, Math.min(1, avg + slope * i)));
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (trend === 'rising' && forecast[4] > this.config.alertThresholds.highPressure) {
      recommendations.push('Consider throttling incoming requests');
      recommendations.push('Spawn additional agents to distribute load');
    } else if (trend === 'falling' && forecast[4] < 0.1) {
      recommendations.push('Agent may be underutilized');
      recommendations.push('Consider hibernating or repurposing');
    }

    return {
      agentId,
      currentPressure: pressure.value,
      trend,
      forecast,
      recommendations,
    };
  }

  /**
   * Get agents with highest pressure
   */
  getHighestPressureAgents(count: number = 5): Array<{ agentId: string; pressure: number }> {
    const sorted = Array.from(this.pressures.entries())
      .map(([agentId, pressure]) => ({ agentId, pressure: pressure.value }))
      .sort((a, b) => b.pressure - a.pressure);

    return sorted.slice(0, count);
  }

  /**
   * Get agents with lowest pressure
   */
  getLowestPressureAgents(count: number = 5): Array<{ agentId: string; pressure: number }> {
    const sorted = Array.from(this.pressures.entries())
      .map(([agentId, pressure]) => ({ agentId, pressure: pressure.value }))
      .sort((a, b) => a.pressure - b.pressure);

    return sorted.slice(0, count);
  }

  /**
   * Update all pressures with decay
   */
  private updateAllPressures(): void {
    for (const [agentId, pressure] of this.pressures) {
      const decayed = pressure.value * (1 - this.config.pressureDecayRate);
      const updated: Pressure = {
        ...pressure,
        value: decayed,
        timestamp: Date.now(),
      };
      this.pressures.set(agentId, updated);

      // Update history
      const history = this.pressureHistory.get(agentId) || [];
      history.push(decayed);
      if (history.length > 100) {
        history.shift();
      }
      this.pressureHistory.set(agentId, history);
    }
  }

  /**
   * Check for pressure-related events
   */
  private checkPressureEvents(agentId: string, updated: Pressure, previous: Pressure): void {
    const spikeThreshold = this.config.alertThresholds.highPressure;
    const dropThreshold = 0.1;

    // Pressure spike
    if (updated.value >= spikeThreshold && previous.value < spikeThreshold) {
      const event: HydraulicEvent = {
        type: HydraulicEventType.PRESSURE_SPIKE,
        timestamp: Date.now(),
        severity: updated.value > 0.9 ? 'critical' : 'warning',
        componentId: agentId,
        description: `Pressure spike detected for agent ${agentId}`,
        data: {
          pressure: updated.value,
          previous: previous.value,
        },
      };
      this.emit('event', event);
    }

    // Pressure drop
    if (updated.value <= dropThreshold && previous.value > dropThreshold) {
      const event: HydraulicEvent = {
        type: HydraulicEventType.PRESSURE_DROP,
        timestamp: Date.now(),
        severity: 'info',
        componentId: agentId,
        description: `Pressure drop detected for agent ${agentId}`,
        data: {
          pressure: updated.value,
          previous: previous.value,
        },
      };
      this.emit('event', event);
    }
  }

  /**
   * Get pressure statistics
   */
  getStats(): {
    avgPressure: number;
    maxPressure: number;
    minPressure: number;
    variance: number;
  } {
    const values = Array.from(this.pressures.values()).map(p => p.value);
    if (values.length === 0) {
      return { avgPressure: 0, maxPressure: 0, minPressure: 0, variance: 0 };
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;

    return {
      avgPressure: avg,
      maxPressure: max,
      minPressure: min,
      variance,
    };
  }
}
