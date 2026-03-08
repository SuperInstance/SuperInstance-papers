/**
 * POLLN Pump Manager
 *
 * Boosts flow when needed by amplifying agent capabilities
 * Implemented via value network reinforcement
 *
 * Pumps:
 * - Increase signal strength
 * - Spawn additional agents
 * - Reinforce successful pathways
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Pump,
  HydraulicConfig,
  HydraulicEvent,
  HydraulicEventType,
} from './types';

export interface PumpActivation {
  pumpId: string;
  agentId: string;
  boostAmount: number;
  reason: string;
  timestamp: number;
}

export class PumpManager extends EventEmitter {
  private config: HydraulicConfig;
  private pumps: Map<string, Pump> = new Map();
  private activationHistory: PumpActivation[] = [];

  constructor(config: Partial<HydraulicConfig> = {}) {
    super();
    this.config = {
      pumpCapacity: 2.0,
      pumpEfficiency: 0.8,
      pumpCooldown: 5000,
      pumpOverheatThreshold: 10,
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
   * Register a pump for an agent
   */
  registerPump(agentId: string, capacity: number = this.config.pumpCapacity): Pump {
    const pump: Pump = {
      id: uuidv4(),
      agentId,
      capacity,
      currentOutput: 0,
      energy: 100,
      efficiency: this.config.pumpEfficiency,
      state: 'idle',
      lastActivation: 0,
    };

    this.pumps.set(agentId, pump);
    return pump;
  }

  /**
   * Unregister a pump
   */
  unregisterPump(agentId: string): void {
    this.pumps.delete(agentId);
  }

  /**
   * Get pump for an agent
   */
  getPump(agentId: string): Pump | undefined {
    return this.pumps.get(agentId);
  }

  /**
   * Get all pumps
   */
  getAllPumps(): Map<string, Pump> {
    return new Map(this.pumps);
  }

  /**
   * Activate pump to boost flow
   */
  activatePump(
    agentId: string,
    requestedBoost: number,
    reason: string
  ): number {
    const pump = this.pumps.get(agentId);
    if (!pump) {
      throw new Error(`Pump not found for agent ${agentId}`);
    }

    // Check cooldown
    const now = Date.now();
    const timeSinceLastActivation = now - pump.lastActivation;
    if (timeSinceLastActivation < this.config.pumpCooldown) {
      return 0; // Still cooling down
    }

    // Check if overheated
    if (pump.state === 'overheated') {
      // Recovery chance
      if (Math.random() < 0.1) {
        pump.state = 'idle';
        pump.energy = 50;
      } else {
        return 0; // Still overheated
      }
    }

    // Calculate available energy
    const availableBoost = Math.min(requestedBoost, pump.capacity);
    const energyCost = availableBoost / pump.efficiency;

    if (energyCost > pump.energy) {
      // Not enough energy
      return 0;
    }

    // Activate pump
    pump.currentOutput = availableBoost;
    pump.energy -= energyCost;
    pump.state = 'pumping';
    pump.lastActivation = now;

    // Check for overheating
    if (pump.energy < 10) {
      pump.state = 'overheated';
      const event: HydraulicEvent = {
        type: HydraulicEventType.PUMP_OVERHEAT,
        timestamp: now,
        severity: 'warning',
        componentId: pump.id,
        description: `Pump overheated for agent ${agentId}`,
        data: {
          energy: pump.energy,
          capacity: pump.capacity,
        },
      };
      this.emit('event', event);
    } else {
      // Emit activation event
      const event: HydraulicEvent = {
        type: HydraulicEventType.PUMP_ACTIVATE,
        timestamp: now,
        severity: 'info',
        componentId: pump.id,
        description: `Pump activated for agent ${agentId}`,
        data: {
          boostAmount: availableBoost,
          reason,
          energyRemaining: pump.energy,
        },
      };
      this.emit('event', event);
    }

    // Record activation
    this.activationHistory.push({
      pumpId: pump.id,
      agentId,
      boostAmount: availableBoost,
      reason,
      timestamp: now,
    });

    // Keep history manageable
    if (this.activationHistory.length > 1000) {
      this.activationHistory.shift();
    }

    return availableBoost;
  }

  /**
   * Deactivate pump
   */
  deactivatePump(agentId: string): void {
    const pump = this.pumps.get(agentId);
    if (!pump) return;

    pump.currentOutput = 0;
    if (pump.state !== 'overheated') {
      pump.state = 'idle';
    }
  }

  /**
   * Recharge pump energy
   */
  rechargePump(agentId: string, amount: number): void {
    const pump = this.pumps.get(agentId);
    if (!pump) return;

    pump.energy = Math.min(100, pump.energy + amount);

    // Recover from overheating if enough energy
    if (pump.state === 'overheated' && pump.energy > 50) {
      pump.state = 'idle';
    }
  }

  /**
   * Recharge all pumps
   */
  rechargeAll(amount: number): void {
    for (const pump of this.pumps.values()) {
      this.rechargePump(pump.agentId, amount);
    }
  }

  /**
   * Get activation history for an agent
   */
  getActivationHistory(agentId: string, limit: number = 100): PumpActivation[] {
    return this.activationHistory
      .filter(a => a.agentId === agentId)
      .slice(-limit);
  }

  /**
   * Get recent activations across all agents
   */
  getRecentActivations(limit: number = 100): PumpActivation[] {
    return this.activationHistory.slice(-limit);
  }

  /**
   * Get most frequently pumped agents
   */
  getMostPumpedAgents(count: number = 5): Array<{ agentId: string; activations: number }> {
    const counts = new Map<string, number>();

    for (const activation of this.activationHistory) {
      const current = counts.get(activation.agentId) || 0;
      counts.set(activation.agentId, current + 1);
    }

    const sorted = Array.from(counts.entries())
      .map(([agentId, activations]) => ({ agentId, activations }))
      .sort((a, b) => b.activations - a.activations);

    return sorted.slice(0, count);
  }

  /**
   * Get pump statistics
   */
  getStats(): {
    totalPumps: number;
    activePumps: number;
    idlePumps: number;
    overheatedPumps: number;
    avgEnergy: number;
    avgOutput: number;
    totalActivations: number;
  } {
    const pumps = Array.from(this.pumps.values());

    return {
      totalPumps: pumps.length,
      activePumps: pumps.filter(p => p.state === 'pumping').length,
      idlePumps: pumps.filter(p => p.state === 'idle').length,
      overheatedPumps: pumps.filter(p => p.state === 'overheated').length,
      avgEnergy: pumps.length > 0
        ? pumps.reduce((sum, p) => sum + p.energy, 0) / pumps.length
        : 0,
      avgOutput: pumps.length > 0
        ? pumps.reduce((sum, p) => sum + p.currentOutput, 0) / pumps.length
        : 0,
      totalActivations: this.activationHistory.length,
    };
  }

  /**
   * Get pump health status
   */
  getHealthStatus(): Map<string, {
    agentId: string;
    state: string;
    energyLevel: number;
    utilizationRate: number;
    recommendation: string;
  }> {
    const status = new Map();

    for (const pump of this.pumps.values()) {
      const activations = this.getActivationHistory(pump.agentId, 100);
      const utilizationRate = activations.length / 100;

      let recommendation = 'Normal operation';
      if (pump.state === 'overheated') {
        recommendation = 'Allow cooling before reactivation';
      } else if (pump.energy < 20) {
        recommendation = 'Low energy - consider reducing pump usage';
      } else if (utilizationRate > 0.8) {
        recommendation = 'High utilization - consider spawning additional agents';
      } else if (utilizationRate < 0.1 && pump.energy > 80) {
        recommendation = 'Underutilized - pump may not be necessary';
      }

      status.set(pump.agentId, {
        agentId: pump.agentId,
        state: pump.state,
        energyLevel: pump.energy,
        utilizationRate,
        recommendation,
      });
    }

    return status;
  }

  /**
   * Reset all pumps
   */
  resetAll(): void {
    for (const pump of this.pumps.values()) {
      pump.currentOutput = 0;
      pump.energy = 100;
      pump.state = 'idle';
      pump.lastActivation = 0;
    }

    this.activationHistory = [];
  }
}
