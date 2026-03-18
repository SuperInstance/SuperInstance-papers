/**
 * CLAW_EQUIP Formula Function
 *
 * Equips equipment to a Claw agent
 *
 * @syntax =CLAW_EQUIP(claw_id, equipment)
 * @param claw_id - ID of the claw agent
 * @param equipment - Equipment slot to equip (MEMORY, REASONING, CONSENSUS, SPREADSHEET, DISTILLATION, COORDINATION)
 * @returns Success status (TRUE) or error message
 *
 * @example
 * =CLAW_EQUIP("claw_abc123", "CONSENSUS")
 * =CLAW_EQUIP(A1, "SPREADSHEET")
 */

import { FunctionType, type Nullable, type InterpreterValue } from '../types';
import type { ClawFunctionType, EquipmentSlot } from '../types';

/**
 * Validate equipment slot
 */
function isValidEquipment(equipment: string): equipment is EquipmentSlot {
  const validSlots = ['MEMORY', 'REASONING', 'CONSENSUS', 'SPREADSHEET', 'DISTILLATION', 'COORDINATION'];
  return validSlots.includes(equipment.toUpperCase());
}

/**
 * CLAW_EQUIP formula function implementation
 */
export const CLAW_EQUIP: ClawFunctionType = {
  id: 10002,
  type: FunctionType.Function,
  name: 'CLAW_EQUIP',
  description: 'Equip equipment to a Claw agent',
  minParams: 2,
  maxParams: 2,

  parameters: [
    {
      name: 'claw_id',
      description: 'ID of the claw agent',
      type: 'string',
      required: true
    },
    {
      name: 'equipment',
      description: 'Equipment slot to equip (MEMORY, REASONING, CONSENSUS, SPREADSHEET, DISTILLATION, COORDINATION)',
      type: 'string',
      required: true
    }
  ],

  returns: {
    type: 'boolean',
    description: 'Success status (TRUE) or error message'
  },

  execute: async function (
    this: any,
    context: any,
    clawId: string,
    equipment: string
  ): Promise<Nullable<InterpreterValue>> {
    try {
      // Validate inputs
      if (!clawId || typeof clawId !== 'string' || clawId.trim() === '') {
        throw new Error('CLAW_EQUIP: Claw ID is required and must be a non-empty string');
      }

      if (!equipment || typeof equipment !== 'string' || equipment.trim() === '') {
        throw new Error('CLAW_EQUIP: Equipment is required and must be a non-empty string');
      }

      // Validate equipment slot
      const equipmentSlot = equipment.toUpperCase();
      if (!isValidEquipment(equipmentSlot)) {
        throw new Error(
          `CLAW_EQUIP: Invalid equipment slot "${equipment}". ` +
          `Must be one of: MEMORY, REASONING, CONSENSUS, SPREADSHEET, DISTILLATION, COORDINATION`
        );
      }

      // Call API to equip equipment
      if (typeof fetch !== 'undefined') {
        try {
          const apiUrl = process.env.CLAW_API_URL || '/api/claws';
          const response = await fetch(`${apiUrl}/${encodeURIComponent(clawId.trim())}/equipment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CLAW_API_KEY || ''}`
            },
            body: JSON.stringify({ equipment: equipmentSlot })
          });

          if (response.ok) {
            return true; // Success
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to equip equipment');
          }
        } catch (error) {
          console.warn('CLAW_EQUIP: Backend API unavailable:', error);
          throw new Error('Backend API unavailable');
        }
      }

      // No fetch available (server-side rendering)
      throw new Error('Fetch API not available');

    } catch (error) {
      console.error('CLAW_EQUIP Error:', error);
      return `#ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export default CLAW_EQUIP;
