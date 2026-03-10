/**
 * POLLN Spreadsheet SDK - Sheet API
 *
 * Provides sheet management operations including creation, deletion,
 * metadata management, permissions, and versioning.
 *
 * @module spreadsheet/sdk/SheetAPI
 */

import type { POLLNClient } from './POLLNClient.js';
import type {
  Sheet,
  SheetMetadata,
  SheetPermissions,
  SheetQuery,
  PaginatedResponse,
  EventHandler,
  EventType,
} from './Types.js';

/**
 * Sheet API Class
 *
 * Provides comprehensive sheet management operations.
 *
 * @example
 * ```typescript
 * const client = await createClient();
 * const sheetAPI = await client.sheets();
 *
 * // Create a sheet
 * const sheet = await sheetAPI.create({
 *   name: 'My Sheet',
 *   rowCount: 100,
 *   columnCount: 26,
 *   metadata: { description: 'Monthly report' }
 * });
 *
 * // List sheets
 * const sheets = await sheetAPI.list();
 * ```
 */
export class SheetAPI {
  constructor(private client: POLLNClient) {}

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Create a new sheet
   *
   * @param config - Sheet configuration
   * @returns Created sheet
   *
   * @example
   * ```typescript
   * const sheet = await sheetAPI.create({
   *   name: 'Sales Report',
   *   rowCount: 1000,
   *   columnCount: 52,
   *   metadata: {
   *     description: 'Annual sales data',
   *     tags: ['sales', '2024'],
   *     author: 'John Doe'
   *   }
   * });
   * ```
   */
  async create(config: {
    name: string;
    rowCount?: number;
    columnCount?: number;
    metadata?: SheetMetadata;
    permissions?: Partial<SheetPermissions>;
  }): Promise<Sheet> {
    const response = await this.client.makeRequest<Sheet>({
      method: 'POST',
      path: '/api/v1/sheets',
      body: {
        name: config.name,
        rowCount: config.rowCount || 1000,
        columnCount: config.columnCount || 26,
        metadata: config.metadata || {},
        permissions: config.permissions,
      },
    });

    return response.data;
  }

  /**
   * Get a sheet by ID
   *
   * @param sheetId - Sheet ID
   * @returns Sheet data or null if not found
   *
   * @example
   * ```typescript
   * const sheet = await sheetAPI.get('sheet-123');
   * console.log('Sheet name:', sheet.name);
   * ```
   */
  async get(sheetId: string): Promise<Sheet | null> {
    try {
      const response = await this.client.makeRequest<Sheet>({
        method: 'GET',
        path: `/api/v1/sheets/${sheetId}`,
      });

      return response.data;
    } catch (error) {
      const err = error as { code?: string };
      if (err.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a sheet
   *
   * @param sheetId - Sheet ID
   * @param updates - Updates to apply
   * @returns Updated sheet
   *
   * @example
   * ```typescript
   * const sheet = await sheetAPI.update('sheet-123', {
   *   name: 'Updated Sheet Name',
   *   rowCount: 2000
   * });
   * ```
   */
  async update(
    sheetId: string,
    updates: Partial<Pick<Sheet, 'name' | 'rowCount' | 'columnCount' | 'metadata'>>
  ): Promise<Sheet> {
    const response = await this.client.makeRequest<Sheet>({
      method: 'PATCH',
      path: `/api/v1/sheets/${sheetId}`,
      body: updates,
    });

    return response.data;
  }

  /**
   * Delete a sheet
   *
   * @param sheetId - Sheet ID
   * @returns True if deleted successfully
   *
   * @example
   * ```typescript
   * await sheetAPI.delete('sheet-123');
   * ```
   */
  async delete(sheetId: string): Promise<boolean> {
    const response = await this.client.makeRequest<{ success: boolean }>({
      method: 'DELETE',
      path: `/api/v1/sheets/${sheetId}`,
    });

    return response.data.success;
  }

  /**
   * Duplicate a sheet
   *
   * @param sheetId - Source sheet ID
   * @param newName - Name for the duplicate
   * @returns Duplicated sheet
   *
   * @example
   * ```typescript
   * const duplicate = await sheetAPI.duplicate('sheet-123', 'Sheet Copy');
   * ```
   */
  async duplicate(sheetId: string, newName?: string): Promise<Sheet> {
    const response = await this.client.makeRequest<Sheet>({
      method: 'POST',
      path: `/api/v1/sheets/${sheetId}/duplicate`,
      body: { name: newName },
    });

    return response.data;
  }

  // ==========================================================================
  // List and Query
  // ==========================================================================

  /**
   * List all sheets
   *
   * @param query - Optional query filters
   * @returns Paginated sheet results
   *
   * @example
   * ```typescript
   * const sheets = await sheetAPI.list({
   *   pagination: { page: 1, pageSize: 20 }
   * });
   *
   * console.log(`Found ${sheets.total} sheets`);
   * ```
   */
  async list(query: SheetQuery = {}): Promise<PaginatedResponse<Sheet>> {
    const params: Record<string, string> = {};

    if (query.name) {
      params.name = query.name;
    }

    if (query.tags && query.tags.length > 0) {
      params.tags = query.tags.join(',');
    }

    if (query.author) {
      params.author = query.author;
    }

    if (query.pagination) {
      params.page = query.pagination.page?.toString() || '1';
      params.pageSize = query.pagination.pageSize?.toString() || '20';
      params.sortBy = query.pagination.sortBy || 'name';
      params.sortOrder = query.pagination.sortOrder || 'asc';
    }

    const response = await this.client.makeRequest<PaginatedResponse<Sheet>>({
      method: 'GET',
      path: '/api/v1/sheets',
      params,
    });

    return response.data;
  }

  /**
   * Find sheets by name
   *
   * @param name - Sheet name (supports partial match)
   * @returns Matching sheets
   *
   * @example
   * ```typescript
   * const sheets = await sheetAPI.findByName('Sales');
   * ```
   */
  async findByName(name: string): Promise<Sheet[]> {
    const result = await this.list({ name });
    return result.data;
  }

  /**
   * Find sheets by tags
   *
   * @param tags - Tags to search for
   * @returns Sheets with matching tags
   *
   * @example
   * ```typescript
   * const sheets = await sheetAPI.findByTags(['sales', '2024']);
   * ```
   */
  async findByTags(tags: string[]): Promise<Sheet[]> {
    const result = await this.list({ tags });
    return result.data;
  }

  /**
   * Find sheets by author
   *
   * @param author - Author name
   * @returns Sheets by the author
   *
   * @example
   * ```typescript
   * const sheets = await sheetAPI.findByAuthor('John Doe');
   * ```
   */
  async findByAuthor(author: string): Promise<Sheet[]> {
    const result = await this.list({ author });
    return result.data;
  }

  // ==========================================================================
  // Metadata Management
  // ==========================================================================

  /**
   * Get sheet metadata
   *
   * @param sheetId - Sheet ID
   * @returns Sheet metadata
   *
   * @example
   * ```typescript
   * const metadata = await sheetAPI.getMetadata('sheet-123');
   * console.log('Description:', metadata.description);
   * ```
   */
  async getMetadata(sheetId: string): Promise<SheetMetadata> {
    const response = await this.client.makeRequest<SheetMetadata>({
      method: 'GET',
      path: `/api/v1/sheets/${sheetId}/metadata`,
    });

    return response.data;
  }

  /**
   * Update sheet metadata
   *
   * @param sheetId - Sheet ID
   * @param metadata - New metadata
   * @returns Updated metadata
   *
   * @example
   * ```typescript
   * const metadata = await sheetAPI.updateMetadata('sheet-123', {
   *   description: 'Updated description',
   *   tags: ['sales', '2024', 'q1']
   * });
   * ```
   */
  async updateMetadata(sheetId: string, metadata: Partial<SheetMetadata>): Promise<SheetMetadata> {
    const response = await this.client.makeRequest<SheetMetadata>({
      method: 'PATCH',
      path: `/api/v1/sheets/${sheetId}/metadata`,
      body: metadata,
    });

    return response.data;
  }

  /**
   * Add tags to a sheet
   *
   * @param sheetId - Sheet ID
   * @param tags - Tags to add
   * @returns Updated metadata
   *
   * @example
   * ```typescript
   * await sheetAPI.addTags('sheet-123', ['important', 'q1-2024']);
   * ```
   */
  async addTags(sheetId: string, tags: string[]): Promise<SheetMetadata> {
    const currentMetadata = await this.getMetadata(sheetId);
    const existingTags = currentMetadata.tags || [];
    const allTags = [...new Set([...existingTags, ...tags])];

    return this.updateMetadata(sheetId, { tags: allTags });
  }

  /**
   * Remove tags from a sheet
   *
   * @param sheetId - Sheet ID
   * @param tags - Tags to remove
   * @returns Updated metadata
   *
   * @example
   * ```typescript
   * await sheetAPI.removeTags('sheet-123', ['old-tag']);
   * ```
   */
  async removeTags(sheetId: string, tags: string[]): Promise<SheetMetadata> {
    const currentMetadata = await this.getMetadata(sheetId);
    const existingTags = currentMetadata.tags || [];
    const filteredTags = existingTags.filter(tag => !tags.includes(tag));

    return this.updateMetadata(sheetId, { tags: filteredTags });
  }

  /**
   * Set custom property
   *
   * @param sheetId - Sheet ID
   * @param key - Property key
   * @param value - Property value
   * @returns Updated metadata
   *
   * @example
   * ```typescript
   * await sheetAPI.setCustomProperty('sheet-123', 'department', 'Sales');
   * ```
   */
  async setCustomProperty(sheetId: string, key: string, value: unknown): Promise<SheetMetadata> {
    const currentMetadata = await this.getMetadata(sheetId);
    const customProps = currentMetadata.customProperties || {};

    return this.updateMetadata(sheetId, {
      customProperties: { ...customProps, [key]: value },
    });
  }

  /**
   * Get custom property
   *
   * @param sheetId - Sheet ID
   * @param key - Property key
   * @returns Property value or undefined
   *
   * @example
   * ```typescript
   * const department = await sheetAPI.getCustomProperty('sheet-123', 'department');
   * ```
   */
  async getCustomProperty(sheetId: string, key: string): Promise<unknown> {
    const metadata = await this.getMetadata(sheetId);
    return metadata.customProperties?.[key];
  }

  // ==========================================================================
  // Permissions Management
  // ==========================================================================

  /**
   * Get sheet permissions
   *
   * @param sheetId - Sheet ID
   * @returns Sheet permissions
   *
   * @example
   * ```typescript
   * const permissions = await sheetAPI.getPermissions('sheet-123');
   * console.log('Read users:', permissions.read);
   * ```
   */
  async getPermissions(sheetId: string): Promise<SheetPermissions> {
    const response = await this.client.makeRequest<SheetPermissions>({
      method: 'GET',
      path: `/api/v1/sheets/${sheetId}/permissions`,
    });

    return response.data;
  }

  /**
   * Update sheet permissions
   *
   * @param sheetId - Sheet ID
   * @param permissions - New permissions
   * @returns Updated permissions
   *
   * @example
   * ```typescript
   * const permissions = await sheetAPI.updatePermissions('sheet-123', {
   *   read: ['user-1', 'user-2'],
   *   write: ['user-1'],
   *   public: false
   * });
   * ```
   */
  async updatePermissions(sheetId: string, permissions: Partial<SheetPermissions>): Promise<SheetPermissions> {
    const response = await this.client.makeRequest<SheetPermissions>({
      method: 'PATCH',
      path: `/api/v1/sheets/${sheetId}/permissions`,
      body: permissions,
    });

    return response.data;
  }

  /**
   * Grant read permission
   *
   * @param sheetId - Sheet ID
   * @param userIds - User IDs to grant read access
   * @returns Updated permissions
   *
   * @example
   * ```typescript
   * await sheetAPI.grantRead('sheet-123', ['user-1', 'user-2']);
   * ```
   */
  async grantRead(sheetId: string, userIds: string[]): Promise<SheetPermissions> {
    const currentPermissions = await this.getPermissions(sheetId);
    const readUsers = [...new Set([...currentPermissions.read, ...userIds])];

    return this.updatePermissions(sheetId, { read: readUsers });
  }

  /**
   * Grant write permission
   *
   * @param sheetId - Sheet ID
   * @param userIds - User IDs to grant write access
   * @returns Updated permissions
   *
   * @example
   * ```typescript
   * await sheetAPI.grantWrite('sheet-123', ['user-1']);
   * ```
   */
  async grantWrite(sheetId: string, userIds: string[]): Promise<SheetPermissions> {
    const currentPermissions = await this.getPermissions(sheetId);
    const writeUsers = [...new Set([...currentPermissions.write, ...userIds])];

    return this.updatePermissions(sheetId, { write: writeUsers });
  }

  /**
   * Grant admin permission
   *
   * @param sheetId - Sheet ID
   * @param userIds - User IDs to grant admin access
   * @returns Updated permissions
   *
   * @example
   * ```typescript
   * await sheetAPI.grantAdmin('sheet-123', ['user-1']);
   * ```
   */
  async grantAdmin(sheetId: string, userIds: string[]): Promise<SheetPermissions> {
    const currentPermissions = await this.getPermissions(sheetId);
    const adminUsers = [...new Set([...currentPermissions.admin, ...userIds])];

    return this.updatePermissions(sheetId, { admin: adminUsers });
  }

  /**
   * Revoke read permission
   *
   * @param sheetId - Sheet ID
   * @param userIds - User IDs to revoke read access
   * @returns Updated permissions
   *
   * @example
   * ```typescript
   * await sheetAPI.revokeRead('sheet-123', ['user-2']);
   * ```
   */
  async revokeRead(sheetId: string, userIds: string[]): Promise<SheetPermissions> {
    const currentPermissions = await this.getPermissions(sheetId);
    const readUsers = currentPermissions.read.filter(id => !userIds.includes(id));

    return this.updatePermissions(sheetId, { read: readUsers });
  }

  /**
   * Revoke write permission
   *
   * @param sheetId - Sheet ID
   * @param userIds - User IDs to revoke write access
   * @returns Updated permissions
   *
   * @example
   * ```typescript
   * await sheetAPI.revokeWrite('sheet-123', ['user-2']);
   * ```
   */
  async revokeWrite(sheetId: string, userIds: string[]): Promise<SheetPermissions> {
    const currentPermissions = await this.getPermissions(sheetId);
    const writeUsers = currentPermissions.write.filter(id => !userIds.includes(id));

    return this.updatePermissions(sheetId, { write: writeUsers });
  }

  /**
   * Set sheet visibility
   *
   * @param sheetId - Sheet ID
   * @param isPublic - Whether sheet should be public
   * @returns Updated permissions
   *
   * @example
   * ```typescript
   * await sheetAPI.setPublic('sheet-123', true);
   * ```
   */
  async setPublic(sheetId: string, isPublic: boolean): Promise<SheetPermissions> {
    return this.updatePermissions(sheetId, { public: isPublic });
  }

  // ==========================================================================
  // Versioning
  // ==========================================================================

  /**
   * Get sheet versions
   *
   * @param sheetId - Sheet ID
   * @returns List of sheet versions
   *
   * @example
   * ```typescript
   * const versions = await sheetAPI.getVersions('sheet-123');
   * console.log(`Found ${versions.length} versions`);
   * ```
   */
  async getVersions(sheetId: string): Promise<Array<{ version: number; createdAt: number; description?: string }>> {
    const response = await this.client.makeRequest<Array<{ version: number; createdAt: number; description?: string }>>({
      method: 'GET',
      path: `/api/v1/sheets/${sheetId}/versions`,
    });

    return response.data;
  }

  /**
   * Create a sheet version snapshot
   *
   * @param sheetId - Sheet ID
   * @param description - Optional version description
   * @returns New version info
   *
   * @example
   * ```typescript
   * const version = await sheetAPI.createVersion('sheet-123', 'Before major changes');
   * console.log('Created version:', version.version);
   * ```
   */
  async createVersion(sheetId: string, description?: string): Promise<{ version: number; createdAt: number }> {
    const response = await this.client.makeRequest<{ version: number; createdAt: number }>({
      method: 'POST',
      path: `/api/v1/sheets/${sheetId}/versions`,
      body: { description },
    });

    return response.data;
  }

  /**
   * Restore sheet to a specific version
   *
   * @param sheetId - Sheet ID
   * @param version - Version number to restore
   * @returns Restored sheet
   *
   * @example
   * ```typescript
   * const sheet = await sheetAPI.restoreVersion('sheet-123', 5);
   * console.log('Restored to version', sheet.version);
   * ```
   */
  async restoreVersion(sheetId: string, version: number): Promise<Sheet> {
    const response = await this.client.makeRequest<Sheet>({
      method: 'POST',
      path: `/api/v1/sheets/${sheetId}/versions/${version}/restore`,
    });

    return response.data;
  }

  // ==========================================================================
  // Export/Import
  // ==========================================================================

  /**
   * Export sheet data
   *
   * @param sheetId - Sheet ID
   * @param format - Export format
   * @returns Exported data
   *
   * @example
   * ```typescript
   * const data = await sheetAPI.export('sheet-123', 'json');
   * ```
   */
  async export(sheetId: string, format: 'json' | 'csv' | 'xlsx' = 'json'): Promise<unknown> {
    const response = await this.client.makeRequest<unknown>({
      method: 'GET',
      path: `/api/v1/sheets/${sheetId}/export`,
      params: { format },
    });

    return response.data;
  }

  /**
   * Import data into sheet
   *
   * @param sheetId - Sheet ID
   * @param data - Data to import
   * @param format - Data format
   * @returns Import result
   *
   * @example
   * ```typescript
   * const result = await sheetAPI.import('sheet-123', data, 'json');
   * console.log(`Imported ${result.importedCount} cells`);
   * ```
   */
  async import(
    sheetId: string,
    data: unknown,
    format: 'json' | 'csv' = 'json'
  ): Promise<{ importedCount: number; errors: string[] }> {
    const response = await this.client.makeRequest<{ importedCount: number; errors: string[] }>({
      method: 'POST',
      path: `/api/v1/sheets/${sheetId}/import`,
      body: { data, format },
    });

    return response.data;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get sheet statistics
   *
   * @param sheetId - Sheet ID
   * @returns Sheet statistics
   *
   * @example
   * ```typescript
   * const stats = await sheetAPI.getStats('sheet-123');
   * console.log('Total cells:', stats.totalCells);
   * ```
   */
  async getStats(sheetId: string): Promise<{
    totalCells: number;
    cellsByType: Record<string, number>;
    cellsByStatus: Record<string, number>;
    lastModified: number;
  }> {
    const response = await this.client.makeRequest<{
      totalCells: number;
      cellsByType: Record<string, number>;
      cellsByStatus: Record<string, number>;
      lastModified: number;
    }>({
      method: 'GET',
      path: `/api/v1/sheets/${sheetId}/stats`,
    });

    return response.data;
  }

  // ==========================================================================
  // Subscriptions
  // ==========================================================================

  /**
   * Subscribe to sheet events
   *
   * @param eventType - Event type to subscribe to
   * @param handler - Event handler
   * @param filter - Optional filter criteria
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = await sheetAPI.subscribe(
   *   'sheet:updated',
   *   (event) => {
   *     console.log('Sheet updated:', event.data);
   *   }
   * );
   *
   * // Later: unsubscribe();
   * ```
   */
  async subscribe(
    eventType: EventType,
    handler: EventHandler,
    filter?: { source?: string; idPattern?: string }
  ): Promise<() => Promise<void>> {
    const wsClient = await this.client.websocket();
    await wsClient.connect();

    const subscriptionId = await wsClient.subscribe(eventType, handler, filter);

    return async () => {
      await wsClient.unsubscribe(subscriptionId);
    };
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default SheetAPI;
