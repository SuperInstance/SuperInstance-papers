/**
 * CLAW_NEW Formula Function
 *
 * Creates a new Claw agent in the current cell
 *
 * @syntax =CLAW_NEW(purpose, [type], [model], [equipment])
 * @param purpose - Natural language description of what the claw should do
 * @param type - Agent type (SENSOR, ANALYZER, CONTROLLER, ORCHESTRATOR). Default: SENSOR
 * @param model - Model provider (deepseek, cloudflare, openai, anthropic). Default: deepseek
 * @param equipment - Comma-separated list of equipment slots. Default: MEMORY,REASONING
 * @returns Claw agent ID
 *
 * @example
 * =CLAW_NEW("Monitor stock prices", "SENSOR", "deepseek", "MEMORY,REASONING")
 * =CLAW_NEW("Analyze sales trends", "ANALYZER")
 * =CLAW_NEW("Coordinate inventory across warehouses", "ORCHESTRATOR", "cloudflare")
 *
 * @version 3.0.0 - Phase 3: Enhanced singleton management with disposal
 */

import { FunctionType, type Nullable, type InterpreterValue, EquipmentSlot } from '../types';
import { v4 as uuidv4 } from 'uuid';
import ClawClientManager from '../utils/ClawClientManager';
import type {
  ClawAgentType,
  ModelProvider,
  ClawCellConfig,
  TriggerCondition
} from '../types';

/**
 * Default model configurations per provider
 */
const DEFAULT_MODELS: Record<string, string> = {
  deepseek: 'deepseek-chat',
  cloudflare: '@cf/meta/llama-2-7b-chat-int8',
  openai: 'gpt-4',
  anthropic: 'claude-3-opus-20240229'
};

/**
 * Parse equipment string to array
 */
function parseEquipment(equipmentStr: string): EquipmentSlot[] {
  if (!equipmentStr || equipmentStr.trim() === '') {
    return ['MEMORY' as EquipmentSlot, 'REASONING' as EquipmentSlot];
  }
  return equipmentStr
    .split(',')
    .map(e => e.trim().toUpperCase() as EquipmentSlot)
    .filter(e => Object.values(EquipmentSlot).includes(e));
}

/**
 * Create trigger condition from default
 */
function createDefaultTrigger(cellId: string): TriggerCondition {
  return {
    type: 'cell_change',
    cellId
  };
}

/**
 * Create claw cell configuration
 */
function createClawConfig(
  cellId: string,
  position: [number, number],
  purpose: string,
  type: string,
  model: string,
  equipment: EquipmentSlot[]
): ClawCellConfig {
  const clawId = `claw_${uuidv4()}`;
  const provider = model.toLowerCase() as ModelProvider;

  return {
    id: clawId,
    type: type.toUpperCase() as ClawAgentType,
    position,
    model: {
      provider,
      model: DEFAULT_MODELS[provider] || model,
      apiKey: process.env[`${provider.toUpperCase()}_API_KEY`]
    },
    seed: {
      purpose,
      trigger: createDefaultTrigger(cellId),
      learningStrategy: 'reinforcement'
    },
    equipment,
    relationships: [],
    state: 'DORMANT',
    confidence: 0.5
  };
}

/**
 * CLAW_NEW formula function implementation
 *
 * Phase 3 enhancements:
 * - Uses ClawClientManager for proper singleton management
 * - Supports disposal for cleanup
 * - Enhanced error handling
 * - Better validation
 */
export const CLAW_NEW = {
  id: 10001,
  type: FunctionType.Function,
  name: 'CLAW_NEW',
  description: 'Create a new Claw agent in the current cell',
  minParams: 1,
  maxParams: 4,

  parameters: [
    {
      name: 'purpose',
      description: 'Natural language description of what the claw should do',
      type: 'string',
      required: true
    },
    {
      name: 'type',
      description: 'Agent type (SENSOR, ANALYZER, CONTROLLER, ORCHESTRATOR)',
      type: 'string',
      required: false
    },
    {
      name: 'model',
      description: 'Model provider (deepseek, cloudflare, openai, anthropic)',
      type: 'string',
      required: false
    },
    {
      name: 'equipment',
      description: 'Comma-separated list of equipment slots',
      type: 'string',
      required: false
    }
  ],

  returns: {
    type: 'string',
    description: 'Claw agent ID'
  },

  execute: async function (
    this: any,
    purpose: string,
    type: string = 'SENSOR',
    model: string = 'deepseek',
    equipment: string = 'MEMORY,REASONING'
  ): Promise<Nullable<InterpreterValue>> {
    try {
      // Get context from Univer
      const context = this?.context || {};
      const cellId = context.cellId || 'unknown';
      const position = context.position || [0, 0];

      // Validate inputs
      if (!purpose || typeof purpose !== 'string' || purpose.trim() === '') {
        throw new Error('CLAW_NEW: Purpose is required and must be a non-empty string');
      }

      // Validate agent type
      const validTypes = ['SENSOR', 'ANALYZER', 'CONTROLLER', 'ORCHESTRATOR'];
      const agentType = type.toUpperCase();
      if (!validTypes.includes(agentType)) {
        throw new Error(`CLAW_NEW: Invalid agent type "${type}". Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate model provider
      const validProviders = ['deepseek', 'cloudflare', 'openai', 'anthropic'];
      const provider = model.toLowerCase();
      if (!validProviders.includes(provider)) {
        throw new Error(`CLAW_NEW: Invalid model provider "${model}". Must be one of: ${validProviders.join(', ')}`);
      }

      // Parse equipment
      const equipmentList = parseEquipment(equipment);
      if (equipmentList.length === 0) {
        throw new Error('CLAW_NEW: No valid equipment slots provided');
      }

      // Create claw configuration
      const config = createClawConfig(
        cellId,
        position,
        purpose.trim(),
        agentType,
        provider,
        equipmentList
      );

      // Get ClawClient singleton
      const client = ClawClientManager.getClient();
      let clawId = config.id;

      if (client) {
        try {
          // Call API to create claw
          const response = await client.createClaw({
            config: config as unknown as import('@spreadsheet-moment/agent-core').ClawCellConfig,
            context: {
              sheetId: context.sheetId || 'default',
              userId: context.userId,
              sessionId: context.sessionId
            }
          });

          clawId = response.clawId || clawId;

          // Subscribe to updates if WebSocket is enabled
          if (client.getConnectionStatus().websocket) {
            client.subscribeToClaw(clawId, cellId, context.sheetId || 'default');
          }

        } catch (apiError) {
          console.warn('CLAW_NEW: Backend API unavailable, using local config:', apiError);
          // Fall back to local-only mode
        }
      } else {
        // Running in local-only mode
        console.log('CLAW_NEW: Running in local-only mode (no API configured)');
      }

      // Return claw ID
      return clawId;

    } catch (error) {
      console.error('CLAW_NEW Error:', error);
      return `#ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
};

export default CLAW_NEW;
