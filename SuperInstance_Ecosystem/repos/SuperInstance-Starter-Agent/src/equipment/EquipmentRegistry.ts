/**
 * Equipment Registry
 * 
 * Central registry for discovering and loading equipment
 */

import type { Equipment, EquipmentSlot, OriginCore } from '../types';
import { BaseEquipment } from './BaseEquipment';

export interface EquipmentManifest {
  name: string;
  package: string;
  slot: EquipmentSlot;
  description: string;
  dependencies: string[];
}

export class EquipmentRegistry {
  private static instance: EquipmentRegistry;
  private equipment: Map<string, () => Equipment> = new Map();
  private manifests: Map<string, EquipmentManifest> = new Map();
  
  private constructor() {}
  
  static getInstance(): EquipmentRegistry {
    if (!EquipmentRegistry.instance) {
      EquipmentRegistry.instance = new EquipmentRegistry();
    }
    return EquipmentRegistry.instance;
  }
  
  /**
   * Register an equipment factory
   */
  register(name: string, factory: () => Equipment, manifest?: EquipmentManifest): void {
    this.equipment.set(name, factory);
    if (manifest) {
      this.manifests.set(name, manifest);
    }
  }
  
  /**
   * Create an equipment instance
   */
  create(name: string): Equipment | null {
    const factory = this.equipment.get(name);
    return factory ? factory() : null;
  }
  
  /**
   * List all available equipment
   */
  listAll(): EquipmentManifest[] {
    return Array.from(this.manifests.values());
  }
  
  /**
   * List equipment for a specific slot
   */
  listForSlot(slot: EquipmentSlot): EquipmentManifest[] {
    return Array.from(this.manifests.values()).filter(m => m.slot === slot);
  }
  
  /**
   * Equip an agent with equipment by name
   */
  async equipAgent(agent: OriginCore, equipmentName: string): Promise<boolean> {
    const equipment = this.create(equipmentName);
    if (!equipment) {
      return false;
    }
    agent.registerEquipment(equipment);
    return agent.equip(equipmentName);
  }
  
  /**
   * Equip an agent with all default equipment for a task type
   */
  async equipDefaults(agent: OriginCore, taskType: string): Promise<void> {
    const defaults = this.getDefaultEquipment(taskType);
    for (const name of defaults) {
      await this.equipAgent(agent, name);
    }
  }
  
  /**
   * Get default equipment for a task type
   */
  private getDefaultEquipment(taskType: string): string[] {
    const defaults: Record<string, string[]> = {
      decision: ['EscalationEngine', 'TripartiteConsensus'],
      analysis: ['HierarchicalMemory', 'EscalationEngine'],
      generation: ['EscalationEngine'],
      distillation: ['CellLogicDistiller', 'HierarchicalMemory'],
      coordination: ['SwarmCoordinator', 'HierarchicalMemory'],
      learning: ['SelfImprovement', 'HierarchicalMemory'],
      visualization: ['POLLNInterface'],
      monitoring: ['MonitoringDashboard'],
      improvement: ['SelfImprovement'],
    };
    return defaults[taskType] || [];
  }
}

// Export singleton
export const registry = EquipmentRegistry.getInstance();
