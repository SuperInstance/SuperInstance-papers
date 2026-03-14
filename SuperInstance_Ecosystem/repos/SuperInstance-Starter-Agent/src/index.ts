/**
 * SuperInstance Starter Agent
 * 
 * A minimal agent framework with origin-centric computation and modular equipment
 */

export * from './types';
export { OriginCore } from './OriginCore';
export { BaseEquipment } from './equipment/BaseEquipment';
export { EquipmentRegistry } from './equipment/EquipmentRegistry';

// Default export for convenience
import { OriginCore } from './OriginCore';
export default OriginCore;
