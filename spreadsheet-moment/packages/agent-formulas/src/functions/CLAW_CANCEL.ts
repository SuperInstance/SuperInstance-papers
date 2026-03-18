/**
 * CLAW_CANCEL Formula Function
 *
 * Cancel running claw execution
 * =CLAW_CANCEL(claw_id, [reason])
 *
 * @version 3.0.0 - Phase 3: Enhanced singleton management with disposal
 */

import { FunctionType, type Nullable, type InterpreterValue } from '../types';
import ClawClientManager from '../utils/ClawClientManager';

export const CLAW_CANCEL = {
  id: 10003,
  type: FunctionType.Function,
  name: 'CLAW_CANCEL',
  description: 'Cancel running claw execution',
  minParams: 1,
  maxParams: 2,

  parameters: [
    {
      name: 'claw_id',
      description: 'ID of the claw to cancel',
      type: 'string',
      required: true
    },
    {
      name: 'reason',
      description: 'Reason for cancellation',
      type: 'string',
      required: false
    }
  ],

  returns: {
    type: 'string',
    description: 'Cancellation status'
  },

  execute: async function (
    this: any,
    clawId: string,
    reason: string = 'User cancelled'
  ): Promise<Nullable<InterpreterValue>> {
    try {
      if (!clawId || typeof clawId !== 'string' || clawId.trim() === '') {
        throw new Error('CLAW_CANCEL: claw_id is required and must be a non-empty string');
      }

      // Get ClawClient singleton
      const client = ClawClientManager.getClient();

      if (!client) {
        return '#ERROR: Claw API not configured (local-only mode)';
      }

      const response = await client.cancelClaw({
        clawId: clawId.trim(),
        reason: reason.trim() || 'User cancelled'
      });

      if (response.status === 'cancelled') {
        return `CANCELLED: ${clawId}`;
      } else if (response.status === 'not_running') {
        return `NOT_RUNNING: ${clawId}`;
      } else {
        return `#ERROR: ${response.message || 'Failed to cancel claw'}`;
      }

    } catch (error) {
      console.error('CLAW_CANCEL Error:', error);

      if (error instanceof Error) {
        return `#ERROR: ${error.message}`;
      }

      return '#ERROR: Unknown error occurred';
    }
  }
};

export default CLAW_CANCEL;
