/**
 * Base Equipment Class
 * 
 * Abstract base class for all equipment modules
 */

import type {
  Equipment,
  EquipmentSlot,
  OriginCore,
  Tile,
  CostMetrics,
  BenefitMetrics,
  TriggerThresholds,
  EquipmentDescription,
} from '../types';

export abstract class BaseEquipment implements Equipment {
  abstract readonly name: string;
  abstract readonly slot: EquipmentSlot;
  abstract readonly version: string;
  abstract readonly description: string;
  
  abstract readonly cost: CostMetrics;
  abstract readonly benefit: BenefitMetrics;
  abstract readonly triggerThresholds: TriggerThresholds;
  
  async equip(_agent: OriginCore): Promise<void> {
    // Override in subclass for initialization logic
  }
  
  async unequip(_agent: OriginCore): Promise<void> {
    // Override in subclass for cleanup logic
  }
  
  describe(): EquipmentDescription {
    return {
      name: this.name,
      slot: this.slot,
      purpose: this.description,
      whenToUse: [],
      whenToRemove: [],
      dependencies: [],
      conflicts: [],
    };
  }
  
  abstract asTile(): Tile;
}
