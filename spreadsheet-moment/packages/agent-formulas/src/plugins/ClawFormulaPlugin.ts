/**
 * Claw Formula Plugin for Univer
 *
 * Registers Claw formula functions with the Univer formula engine
 *
 * @module agent-formulas/plugins
 */

import { CLAW_NEW } from '../functions/CLAW_NEW';
import { CLAW_EQUIP } from '../functions/CLAW_EQUIP';
import { CLAW_TRIGGER } from '../functions/CLAW_TRIGGER';
import { CLAW_RELATE } from '../functions/CLAW_RELATE';
import type { ClawFunctionType } from '../types';

const PLUGIN_NAME = 'CLAW_FORMULA_PLUGIN';

/**
 * Function service interface (simplified for type safety)
 */
interface IFunctionService {
  registerFunction(func: unknown): void;
  unregisterFunction?(id: number): void;
}

/**
 * Claw Formula Plugin
 *
 * Provides methods to register Claw formula functions
 */
export class ClawFormulaPlugin {
  private _functionService: IFunctionService | null = null;
  private _registeredFunctions: number[] = [];

  constructor(functionService?: IFunctionService) {
    if (functionService) {
      this._functionService = functionService;
    }
  }

  /**
   * Set the function service
   */
  setFunctionService(service: IFunctionService): void {
    this._functionService = service;
  }

  /**
   * Plugin initialization
   */
  initialize(): void {
    this._registerFunctions();
  }

  /**
   * Register all Claw formula functions
   */
  private _registerFunctions(): void {
    if (!this._functionService) {
      console.warn(`[${PLUGIN_NAME}] Function service not available, skipping registration`);
      return;
    }

    const functions: ClawFunctionType[] = [
      CLAW_NEW as unknown as ClawFunctionType,
      CLAW_EQUIP as unknown as ClawFunctionType,
      CLAW_TRIGGER as unknown as ClawFunctionType,
      CLAW_RELATE as unknown as ClawFunctionType,
    ];

    for (const func of functions) {
      try {
        this._functionService.registerFunction(func);
        this._registeredFunctions.push(func.id);
      } catch (error) {
        console.error(`[${PLUGIN_NAME}] Failed to register function ${func.name}:`, error);
      }
    }

    console.log(`[${PLUGIN_NAME}] Registered ${this._registeredFunctions.length} Claw formula functions:`);
    console.log(`  - CLAW_NEW (id: ${CLAW_NEW.id})`);
    console.log(`  - CLAW_EQUIP (id: ${CLAW_EQUIP.id})`);
    console.log(`  - CLAW_TRIGGER (id: ${CLAW_TRIGGER.id})`);
    console.log(`  - CLAW_RELATE (id: ${CLAW_RELATE.id})`);
  }

  /**
   * Plugin cleanup
   */
  dispose(): void {
    // Unregister functions if the service supports it
    if (this._functionService?.unregisterFunction) {
      for (const id of this._registeredFunctions) {
        try {
          this._functionService.unregisterFunction(id);
        } catch (error) {
          console.error(`[${PLUGIN_NAME}] Failed to unregister function ${id}:`, error);
        }
      }
    }
    this._registeredFunctions = [];
    console.log(`[${PLUGIN_NAME}] Disposed`);
  }
}

export default ClawFormulaPlugin;
