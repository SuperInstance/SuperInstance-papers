/**
 * POLLN Valve Controller
 *
 * Controls information routing through the system
 * Implements Plinko stochastic selection with temperature control
 *
 * Valves determine:
 * - Which agent handles a task
 * - How much information flows through
 * - When to throttle or block flow
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Valve,
  HydraulicConfig,
  HydraulicEvent,
  HydraulicEventType,
} from './types';

export interface ValveDecision {
  agentId: string;
  selected: boolean;
  probability: number;
  gumbelNoise: number;
}

export class ValveController extends EventEmitter {
  private config: HydraulicConfig;
  private valves: Map<string, Valve> = new Map();
  private decisionHistory: Map<string, ValveDecision[]> = new Map();

  constructor(config: Partial<HydraulicConfig> = {}) {
    super();
    this.config = {
      valveUpdateInterval: 100,
      defaultTemperature: 1.0,
      minTemperature: 0.1,
      temperatureDecayRate: 0.001,
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
   * Register a valve for an agent
   */
  registerValve(agentId: string): Valve {
    const valve: Valve = {
      id: uuidv4(),
      agentId,
      state: 'open',
      aperture: 1.0,
      temperature: this.config.defaultTemperature,
      throughput: 0,
      lastDecision: Date.now(),
    };

    this.valves.set(agentId, valve);
    this.decisionHistory.set(agentId, []);

    return valve;
  }

  /**
   * Unregister a valve
   */
  unregisterValve(agentId: string): void {
    this.valves.delete(agentId);
    this.decisionHistory.delete(agentId);
  }

  /**
   * Make a stochastic selection decision
   * Uses Gumbel-Softmax for differentiable sampling
   */
  selectAgent(
    candidates: Array<{ agentId: string; score: number }>,
    temperature?: number
  ): ValveDecision {
    if (candidates.length === 0) {
      throw new Error('No candidates provided');
    }

    if (candidates.length === 1) {
      return {
        agentId: candidates[0].agentId,
        selected: true,
        probability: 1.0,
        gumbelNoise: 0,
      };
    }

    // Use valve temperature or provided temperature
    const temp = temperature ?? this.config.defaultTemperature;

    // Extract scores
    const scores = candidates.map(c => c.score);

    // Generate Gumbel noise
    const gumbelNoises = scores.map(() => {
      const u = Math.random();
      return -Math.log(-Math.log(u));
    });

    // Apply Gumbel-Softmax trick
    const noisyScores = scores.map((score, i) => (score + gumbelNoises[i]) / temp);

    // Calculate softmax probabilities
    const maxScore = Math.max(...noisyScores);
    const expScores = noisyScores.map(s => Math.exp(s - maxScore));
    const sumExpScores = expScores.reduce((a, b) => a + b, 0);
    const probabilities = expScores.map(e => e / sumExpScores);

    // Sample from categorical distribution
    const rand = Math.random() * sumExpScores;
    let cumSum = 0;
    let selectedIndex = 0;

    for (let i = 0; i < probabilities.length; i++) {
      cumSum += probabilities[i];
      if (rand <= cumSum) {
        selectedIndex = i;
        break;
      }
    }

    const selected = candidates[selectedIndex];
    const decision: ValveDecision = {
      agentId: selected.agentId,
      selected: true,
      probability: probabilities[selectedIndex],
      gumbelNoise: gumbelNoises[selectedIndex],
    };

    // Record decision
    const history = this.decisionHistory.get(selected.agentId) || [];
    history.push(decision);
    if (history.length > 100) {
      history.shift();
    }
    this.decisionHistory.set(selected.agentId, history);

    // Update valve
    this.updateValve(selected.agentId, {
      lastDecision: Date.now(),
      throughput: (this.valves.get(selected.agentId)?.throughput || 0) + 1,
    });

    return decision;
  }

  /**
   * Get valve for an agent
   */
  getValve(agentId: string): Valve | undefined {
    return this.valves.get(agentId);
  }

  /**
   * Get all valves
   */
  getAllValves(): Map<string, Valve> {
    return new Map(this.valves);
  }

  /**
   * Update valve state
   */
  updateValve(agentId: string, updates: Partial<Valve>): Valve | null {
    const valve = this.valves.get(agentId);
    if (!valve) return null;

    const updated: Valve = {
      ...valve,
      ...updates,
    };

    this.valves.set(agentId, updated);

    // Emit events for state changes
    if (updates.state && updates.state !== valve.state) {
      if (updates.state === 'open') {
        const event: HydraulicEvent = {
          type: HydraulicEventType.VALVE_OPEN,
          timestamp: Date.now(),
          severity: 'info',
          componentId: agentId,
          description: `Valve opened for agent ${agentId}`,
          data: { aperture: updated.aperture },
        };
        this.emit('event', event);
      } else if (updates.state === 'closed') {
        const event: HydraulicEvent = {
          type: HydraulicEventType.VALVE_CLOSE,
          timestamp: Date.now(),
          severity: 'warning',
          componentId: agentId,
          description: `Valve closed for agent ${agentId}`,
          data: {},
        };
        this.emit('event', event);
      }
    }

    return updated;
  }

  /**
   * Adjust temperature for all valves
   */
  adjustTemperature(delta: number): void {
    for (const valve of this.valves.values()) {
      const newTemp = Math.max(
        this.config.minTemperature,
        Math.min(2.0, valve.temperature + delta)
      );
      valve.temperature = newTemp;
    }
  }

  /**
   * Decay temperature over time (explore less, exploit more)
   */
  decayTemperature(): void {
    for (const valve of this.valves.values()) {
      if (valve.temperature > this.config.minTemperature) {
        valve.temperature *= (1 - this.config.temperatureDecayRate);
        valve.temperature = Math.max(
          this.config.minTemperature,
          valve.temperature
        );
      }
    }
  }

  /**
   * Set valve aperture (throttle control)
   */
  setAperture(agentId: string, aperture: number): void {
    const valve = this.valves.get(agentId);
    if (!valve) return;

    valve.aperture = Math.max(0, Math.min(1, aperture));

    if (valve.aperture < 0.1) {
      valve.state = 'closed';
    } else if (valve.aperture < 0.7) {
      valve.state = 'throttled';
    } else {
      valve.state = 'open';
    }
  }

  /**
   * Get decision history for an agent
   */
  getDecisionHistory(agentId: string): ValveDecision[] {
    return this.decisionHistory.get(agentId) || [];
  }

  /**
   * Get selection statistics for an agent
   */
  getSelectionStats(agentId: string): {
    selected: number;
    avgProbability: number;
    recentThroughput: number;
  } | null {
    const history = this.decisionHistory.get(agentId);
    const valve = this.valves.get(agentId);

    if (!history || !valve) return null;

    const selected = history.filter(d => d.selected).length;
    const avgProbability = history.reduce((sum, d) => sum + d.probability, 0) / history.length;
    const recentThroughput = history.slice(-10).filter(d => d.selected).length;

    return {
      selected,
      avgProbability,
      recentThroughput,
    };
  }

  /**
   * Reset all valves
   */
  resetAll(): void {
    for (const valve of this.valves.values()) {
      valve.state = 'open';
      valve.aperture = 1.0;
      valve.temperature = this.config.defaultTemperature;
      valve.throughput = 0;
      valve.lastDecision = Date.now();
    }

    for (const history of this.decisionHistory.values()) {
      history.length = 0;
    }
  }

  /**
   * Get valve statistics
   */
  getStats(): {
    totalValves: number;
    openValves: number;
    closedValves: number;
    throttledValves: number;
    avgTemperature: number;
    avgThroughput: number;
  } {
    const valves = Array.from(this.valves.values());

    return {
      totalValves: valves.length,
      openValves: valves.filter(v => v.state === 'open').length,
      closedValves: valves.filter(v => v.state === 'closed').length,
      throttledValves: valves.filter(v => v.state === 'throttled').length,
      avgTemperature: valves.length > 0
        ? valves.reduce((sum, v) => sum + v.temperature, 0) / valves.length
        : 0,
      avgThroughput: valves.length > 0
        ? valves.reduce((sum, v) => sum + v.throughput, 0) / valves.length
        : 0,
    };
  }
}
