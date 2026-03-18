/**
 * CLAW_TRIGGER Formula Function
 *
 * Manually trigger a Claw agent
 *
 * @syntax =CLAW_TRIGGER(claw_id, [data])
 * @param claw_id - ID of the claw agent
 * @param data - Optional data to pass to the claw (JSON string or any value)
 * @returns Result from the claw (string output or error message)
 *
 * @example
 * =CLAW_TRIGGER("claw_abc123")
 * =CLAW_TRIGGER("claw_abc123", "{\"value\": 100}")
 * =CLAW_TRIGGER(A1, B2)
 */

import { FunctionType, type Nullable, type InterpreterValue } from '../types';
import type { ClawFunctionType } from '../types';

/**
 * Parse data parameter (can be JSON string or direct value)
 */
function parseData(data: any): any {
  if (data === undefined || data === null) {
    return {};
  }

  // If it's a string, try to parse as JSON
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      // Not JSON, return as string
      return { value: data };
    }
  }

  // Otherwise, wrap in object
  return { value: data };
}

/**
 * CLAW_TRIGGER formula function implementation
 */
export const CLAW_TRIGGER: ClawFunctionType = {
  id: 10003,
  type: FunctionType.Function,
  name: 'CLAW_TRIGGER',
  description: 'Manually trigger a Claw agent',
  minParams: 1,
  maxParams: 2,

  parameters: [
    {
      name: 'claw_id',
      description: 'ID of the claw agent',
      type: 'string',
      required: true
    },
    {
      name: 'data',
      description: 'Optional data to pass to the claw (JSON string or any value)',
      type: 'any',
      required: false
    }
  ],

  returns: {
    type: 'string',
    description: 'Result from the claw (string output or error message)'
  },

  execute: async function (
    this: any,
    clawId: string,
    data?: any
  ): Promise<Nullable<InterpreterValue>> {
    try {
      // Validate inputs
      if (!clawId || typeof clawId !== 'string' || clawId.trim() === '') {
        throw new Error('CLAW_TRIGGER: Claw ID is required and must be a non-empty string');
      }

      // Parse data
      const parsedData = parseData(data);

      // Call API to trigger claw
      if (typeof fetch !== 'undefined') {
        try {
          const apiUrl = process.env.CLAW_API_URL || '/api/claws';
          const response = await fetch(`${apiUrl}/${encodeURIComponent(clawId.trim())}/trigger`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CLAW_API_KEY || ''}`
            },
            body: JSON.stringify({ data: parsedData })
          });

          if (response.ok) {
            const result = await response.json();
            return result.output || result.result || JSON.stringify(result);
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to trigger claw');
          }
        } catch (error) {
          console.warn('CLAW_TRIGGER: Backend API unavailable:', error);
          throw new Error('Backend API unavailable');
        }
      }

      // No fetch available (server-side rendering)
      throw new Error('Fetch API not available');

    } catch (error) {
      console.error('CLAW_TRIGGER Error:', error);
      return `#ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export default CLAW_TRIGGER;
