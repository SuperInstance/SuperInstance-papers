/**
 * CLAW_QUERY Formula Function
 *
 * Query claw state and information
 * =CLAW_QUERY(claw_id, [include_reasoning], [include_memory])
 *
 * @version 3.0.0 - Phase 3: Enhanced singleton management with disposal
 */

import { FunctionType, type Nullable, type InterpreterValue } from '../types';
import ClawClientManager from '../utils/ClawClientManager';

export const CLAW_QUERY = {
  id: 10002,
  type: FunctionType.Function,
  name: 'CLAW_QUERY',
  description: 'Query claw state and information',
  minParams: 1,
  maxParams: 3,

  parameters: [
    {
      name: 'claw_id',
      description: 'ID of the claw to query',
      type: 'string',
      required: true
    },
    {
      name: 'include_reasoning',
      description: 'Include reasoning steps in response',
      type: 'boolean',
      required: false
    },
    {
      name: 'include_memory',
      description: 'Include memory in response',
      type: 'boolean',
      required: false
    }
  ],

  returns: {
    type: 'string',
    description: 'JSON string with claw state information'
  },

  execute: async function (
    this: any,
    clawId: string,
    includeReasoning: boolean = true,
    includeMemory: boolean = false
  ): Promise<Nullable<InterpreterValue>> {
    try {
      if (!clawId || typeof clawId !== 'string' || clawId.trim() === '') {
        throw new Error('CLAW_QUERY: claw_id is required and must be a non-empty string');
      }

      // Get ClawClient singleton
      const client = ClawClientManager.getClient();

      if (!client) {
        return '#ERROR: Claw API not configured (local-only mode)';
      }

      const response = await client.queryClaw({
        clawId: clawId.trim(),
        includeReasoning,
        includeMemory,
        includeRelationships: false
      });

      if (!response.exists) {
        return `#ERROR: Claw ${clawId} not found`;
      }

      const result = {
        clawId: response.clawId,
        state: response.state.state,
        confidence: response.state.confidence,
        reasoning: includeReasoning ? response.reasoning : undefined,
        memory: includeMemory ? response.memory : undefined,
        lastUpdated: response.state.lastUpdated
      };

      return JSON.stringify(result, null, 2);

    } catch (error) {
      console.error('CLAW_QUERY Error:', error);

      if (error instanceof Error) {
        return `#ERROR: ${error.message}`;
      }

      return '#ERROR: Unknown error occurred';
    }
  }
};

export default CLAW_QUERY;
