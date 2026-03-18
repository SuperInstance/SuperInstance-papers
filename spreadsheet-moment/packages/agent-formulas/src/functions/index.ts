/**
 * Agent Formula Functions
 *
 * Export all Claw formula functions for Univer integration
 *
 * @module agent-formulas/functions
 */

export { CLAW_NEW } from './CLAW_NEW';
export { CLAW_QUERY } from './CLAW_QUERY';
export { CLAW_CANCEL } from './CLAW_CANCEL';
export { CLAW_EQUIP } from './CLAW_EQUIP';
export { CLAW_TRIGGER } from './CLAW_TRIGGER';
export { CLAW_RELATE } from './CLAW_RELATE';

// Export function array for easy registration
export const CLAW_FUNCTIONS = [
  { name: 'CLAW_NEW', fn: () => import('./CLAW_NEW').then(m => m.CLAW_NEW) },
  { name: 'CLAW_QUERY', fn: () => import('./CLAW_QUERY').then(m => m.CLAW_QUERY) },
  { name: 'CLAW_CANCEL', fn: () => import('./CLAW_CANCEL').then(m => m.CLAW_CANCEL) },
  { name: 'CLAW_EQUIP', fn: () => import('./CLAW_EQUIP').then(m => m.CLAW_EQUIP) },
  { name: 'CLAW_TRIGGER', fn: () => import('./CLAW_TRIGGER').then(m => m.CLAW_TRIGGER) },
  { name: 'CLAW_RELATE', fn: () => import('./CLAW_RELATE').then(m => m.CLAW_RELATE) }
];
