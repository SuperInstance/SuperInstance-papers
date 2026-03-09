/**
 * POLLN Spreadsheet Integration - Cell API
 *
 * REST API endpoints for cell operations.
 * Supports CRUD operations, state queries, and batch operations.
 */

import { CellType, CellState, LogicLevel } from '../../core/types';

/**
 * Cell data transfer object
 */
export interface CellDTO {
  id: string;
  type: CellType;
  state: CellState;
  logicLevel: LogicLevel;
  value: unknown;
  confidence: number;

  // Head (inputs)
  inputs: Array<{
    source: string;
    value: unknown;
  }>;

  // Tail (outputs)
  outputs: Array<{
    target: string;
    value: unknown;
  }>;

  // Origin (watching)
  watching: string[];

  // Metadata
  createdAt: number;
  updatedAt: number;
  executionCount: number;
}

/**
 * Batch operation result
 */
export interface BatchResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
}

/**
 * API client configuration
 */
export interface CellAPIConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Cell API Client
 */
export class CellAPI {
  private config: Required<CellAPIConfig>;

  constructor(config: CellAPIConfig) {
    this.config = {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };
  }

  /**
   * Get a single cell by ID
   */
  async getCell(cellId: string): Promise<CellDTO> {
    const response = await this.request(`/cells/${cellId}`, {
      method: 'GET',
    });
    return response.json();
  }

  /**
   * Get multiple cells by IDs
   */
  async getCells(cellIds: string[]): Promise<CellDTO[]> {
    const response = await this.request('/cells/batch', {
      method: 'POST',
      body: JSON.stringify({ ids: cellIds }),
    });
    return response.json();
  }

  /**
   * Get all cells in a range
   */
  async getCellsInRange(startRow: number, endRow: number, startCol: number, endCol: number): Promise<CellDTO[]> {
    const response = await this.request(
      `/cells?startRow=${startRow}&endRow=${endRow}&startCol=${startCol}&endCol=${endCol}`,
      { method: 'GET' }
    );
    return response.json();
  }

  /**
   * Create a new cell
   */
  async createCell(cell: Partial<CellDTO>): Promise<CellDTO> {
    const response = await this.request('/cells', {
      method: 'POST',
      body: JSON.stringify(cell),
    });
    return response.json();
  }

  /**
   * Update a cell
   */
  async updateCell(cellId: string, updates: Partial<CellDTO>): Promise<CellDTO> {
    const response = await this.request(`/cells/${cellId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.json();
  }

  /**
   * Delete a cell
   */
  async deleteCell(cellId: string): Promise<void> {
    await this.request(`/cells/${cellId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Batch create cells
   */
  async batchCreateCells(cells: Partial<CellDTO>[]): Promise<BatchResult> {
    const response = await this.request('/cells/batch', {
      method: 'POST',
      body: JSON.stringify({ cells }),
    });
    return response.json();
  }

  /**
   * Batch update cells
   */
  async batchUpdateCells(updates: Array<{ id: string; changes: Partial<CellDTO> }>): Promise<BatchResult> {
    const response = await this.request('/cells/batch', {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
    return response.json();
  }

  /**
   * Get cell consciousness stream
   */
  async getConsciousness(cellId: string, limit: number = 50): Promise<Array<{
    timestamp: number;
    thought: string;
    state: CellState;
    confidence: number;
  }>> {
    const response = await this.request(`/cells/${cellId}/consciousness?limit=${limit}`, {
      method: 'GET',
    });
    return response.json();
  }

  /**
   * Get cell neighbors (for whisper protocol)
   */
  async getNeighbors(cellId: string, radius: number = 1): Promise<CellDTO[]> {
    const response = await this.request(`/cells/${cellId}/neighbors?radius=${radius}`, {
      method: 'GET',
    });
    return response.json();
  }

  /**
   * Entangle two cells
   */
  async entangleCells(cell1Id: string, cell2Id: string, mode: 'sync' | 'mirror' | 'complement'): Promise<void> {
    await this.request('/cells/entangle', {
      method: 'POST',
      body: JSON.stringify({ cell1: cell1Id, cell2: cell2Id, mode }),
    });
  }

  /**
   * Disentangle cells
   */
  async disentangleCells(cell1Id: string, cell2Id: string): Promise<void> {
    await this.request('/cells/entangle', {
      method: 'DELETE',
      body: JSON.stringify({ cell1: cell1Id, cell2: cell2Id }),
    });
  }

  /**
   * Make HTTP request
   */
  private async request(path: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.baseURL}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.config.headers,
          ...(options.headers as Record<string, string>),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

/**
 * Singleton API client instance
 */
let apiInstance: CellAPI | null = null;

export function getCellAPI(config?: CellAPIConfig): CellAPI {
  if (!apiInstance && config) {
    apiInstance = new CellAPI(config);
  }
  return apiInstance!;
}

export default CellAPI;
