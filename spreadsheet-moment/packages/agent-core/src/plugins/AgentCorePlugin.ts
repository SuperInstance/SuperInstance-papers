/**
 * Univer Plugin: Agent Core
 *
 * Integrates SpreadsheetMoment's agentic capabilities with Univer:
 * - Trace Protocol for recursive loop detection
 * - Agent Cell Model extensions
 * - State Manager integration
 * - Dependency injection setup
 *
 * @packageDocumentation
 */

import {
  Plugin,
  IUniverInstanceService,
  ICommandService,
} from '@univerjs/core';

import {
  TraceProtocol,
  StateManager,
  AgentHandshakeProtocol,
  IAgentCellData,
  AgentCellState,
} from '../index';

// Type definitions for Univer interfaces that may not be exported
interface ICellModel {
  getValue(row: number, col: number): any;
  setValue(row: number, col: number, value: any): void;
}

interface Injector {
  add(binding: [symbol, { useValue: any }]): void;
}

interface IWorkbook {
  getSheetBySheetId(sheetId: string): IWorksheet | null;
}

interface IWorksheet {
  getCellModel(): ICellModel;
}

// CommandType enum fallback
const CommandType = {
  COMMAND: 1,
  OPERATION: 2,
  OBSOLETE: 3,
} as const;

/**
 * Agent Core Plugin Configuration
 */
export interface IAgentCorePluginConfig {
  /** Enable trace protocol (default: true) */
  enableTrace?: boolean;

  /** Enable state management (default: true) */
  enableStateManagement?: boolean;

  /** Enable agent handshake (default: true) */
  enableHandshake?: boolean;

  /** Maximum trace history (default: 1000) */
  maxTraceHistory?: number;

  /** Trace cleanup interval in milliseconds (default: 3600000 = 1 hour) */
  traceCleanupInterval?: number;
}

/**
 * Service token for Trace Protocol
 */
export const ITraceProtocol = Symbol('ITraceProtocol');

/**
 * Service token for State Manager
 */
export const IStateManager = Symbol('IStateManager');

/**
 * Service token for Agent Handshake Protocol
 */
export const IAgentHandshakeProtocol = Symbol('IAgentHandshakeProtocol');

/**
 * Agent Core Plugin
 *
 * Main plugin that integrates all agentic functionality with Univer
 */
export class AgentCorePlugin extends Plugin {
  private _traceProtocol?: TraceProtocol;
  private _stateManager?: StateManager;
  private _handshakeProtocol?: AgentHandshakeProtocol;
  private _univerInstanceService: IUniverInstanceService | null = null;
  private _commandService: ICommandService | null = null;
  private _injector: Injector | null = null;

  constructor(
    config: IAgentCorePluginConfig = {},
    univerInstanceService?: IUniverInstanceService,
    commandService?: ICommandService,
    injector?: Injector
  ) {
    super('AGENT_CORE_PLUGIN');
    if (univerInstanceService) this._univerInstanceService = univerInstanceService;
    if (commandService) this._commandService = commandService;
    if (injector) this._injector = injector;
  }

  /**
   * Initialize plugin services
   */
  override onStarting(): void {
    // Initialize Trace Protocol
    this._traceProtocol = new TraceProtocol();

    // Initialize State Manager
    this._stateManager = new StateManager();

    // Initialize Agent Handshake Protocol
    this._handshakeProtocol = new AgentHandshakeProtocol();

    // Register services with dependency injection
    if (this._injector) {
      this._injector.add([ITraceProtocol, { useValue: this._traceProtocol }]);
      this._injector.add([IStateManager, { useValue: this._stateManager }]);
      this._injector.add([IAgentHandshakeProtocol, { useValue: this._handshakeProtocol }]);
    }

    console.log('[AgentCorePlugin] Initialized successfully');
  }

  /**
   * Register command interceptors
   */
  override onRendered(): void {
    // Intercept cell value changes to apply trace protocol
    if (this._commandService) {
      this._commandService.registerCommand({
        id: 'agent.operation.set-cell-value',
        type: 3 as unknown as typeof CommandType.OBSOLETE,
        handler: (_accessor: unknown, params: unknown) => {
          return this._handleCellOperation(params as Record<string, unknown>);
        },
      });
    }

    console.log('[AgentCorePlugin] Command interceptors registered');
  }

  /**
   * Handle cell operation with trace protocol
   */
  private _handleCellOperation(params: Record<string, unknown>): boolean {
    const { unitId, subUnitId, row, col } = params as {
      unitId: string;
      subUnitId: string;
      row: number;
      col: number;
    };

    // Get cell model
    if (!this._univerInstanceService) {
      return false;
    }

    const workbook = (this._univerInstanceService as unknown as { getUniverSheetInstance: (id: string) => IWorkbook | null }).getUniverSheetInstance(unitId);
    if (!workbook) {
      return false;
    }

    const worksheet = workbook.getSheetBySheetId(subUnitId);
    if (!worksheet) {
      return false;
    }

    const cellModel = worksheet.getCellModel();
    const cell = cellModel.getValue(row, col);

    // Check if this is an agent cell
    const agentData = this._extractAgentData(cell);

    if (agentData) {
      // Apply trace protocol
      if (agentData.trace_id && agentData.origin_id) {
        const hasCollision = this._traceProtocol?.checkCollision(
          agentData.trace_id,
          `${unitId}:${subUnitId}:${row}:${col}`
        );

        if (hasCollision) {
          console.warn('[AgentCorePlugin] Recursive loop detected, blocking operation');
          return false;
        }
      }

      // Update state if needed
      if (agentData.state && this._stateManager) {
        const updated = this._stateManager.transition(
          agentData,
          AgentCellState.THINKING
        );
        this._updateAgentCell(cellModel, row, col, updated);
      }
    }

    return true;
  }

  /**
   * Extract agent data from cell
   */
  private _extractAgentData(cell: unknown): IAgentCellData | null {
    if (!cell || typeof cell !== 'object') {
      return null;
    }

    const cellObj = cell as Record<string, unknown>;

    // Check for agent-specific properties
    if ('origin_id' in cellObj || 'cell_type' in cellObj || 'state' in cellObj) {
      return cell as IAgentCellData;
    }

    return null;
  }

  /**
   * Update agent cell in model
   */
  private _updateAgentCell(
    cellModel: ICellModel,
    row: number,
    col: number,
    agentData: IAgentCellData
  ): void {
    const current = cellModel.getValue(row, col) || {};
    const updated = { ...current, ...agentData };
    cellModel.setValue(row, col, updated);
  }

  /**
   * Clean up on disposal
   */
  override dispose(): void {
    this._traceProtocol?.dispose();
    console.log('[AgentCorePlugin] Disposed');
  }
}

/**
 * Factory function to create the plugin with config
 */
export function createAgentCorePlugin(
  config?: IAgentCorePluginConfig,
  univerInstanceService?: IUniverInstanceService,
  commandService?: ICommandService,
  injector?: Injector
) {
  return new AgentCorePlugin(config || {}, univerInstanceService, commandService, injector);
}
