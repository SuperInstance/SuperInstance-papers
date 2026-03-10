/**
 * POLLN Spreadsheet SDK - Colony API
 *
 * Provides colony management operations including agent deployment,
 * configuration management, monitoring, and event streaming.
 *
 * @module spreadsheet/sdk/ColonyAPI
 */

import type { POLLNClient } from './POLLNClient.js';
import type {
  ColonyConfig,
  ColonyState,
  ColonyMetadata,
  ResourceBudget,
  AgentConfig,
  PaginatedResponse,
  EventHandler,
  EventType,
} from './Types.js';

/**
 * Colony API Class
 *
 * Provides comprehensive colony management operations including
 * creation, deployment, monitoring, and agent management.
 *
 * @example
 * ```typescript
 * const client = await createClient();
 * const colonyAPI = await client.colonies();
 *
 * // Create a colony
 * const colony = await colonyAPI.create({
 *   name: 'my-colony',
 *   maxAgents: 100,
 *   resourceBudget: { totalCompute: 1000, totalMemory: 2048 }
 * });
 *
 * // Deploy an agent
 * const agent = await colonyAPI.deployAgent(colony.id, {
 *   category: 'ephemeral',
 *   goal: 'process-data'
 * });
 * ```
 */
export class ColonyAPI {
  constructor(private client: POLLNClient) {}

  // ==========================================================================
  // Colony Management
  // ==========================================================================

  /**
   * Create a new colony
   *
   * @param config - Colony configuration
   * @returns Created colony state
   *
   * @example
   * ```typescript
   * const colony = await colonyAPI.create({
   *   name: 'data-processing',
   *   maxAgents: 50,
   *   resourceBudget: {
   *     totalCompute: 500,
   *     totalMemory: 1024,
   *     totalNetwork: 100
   *   },
   *   metadata: {
   *     description: 'Colony for data processing tasks',
   *     tags: ['data', 'processing']
   *   }
   * });
   * ```
   */
  async create(config: ColonyConfig): Promise<ColonyState> {
    const response = await this.client.makeRequest<ColonyState>({
      method: 'POST',
      path: '/api/v1/colonies',
      body: {
        name: config.name,
        maxAgents: config.maxAgents || 100,
        resourceBudget: config.resourceBudget || {},
        distributed: config.distributed || false,
        metadata: config.metadata || {},
      },
    });

    return response.data;
  }

  /**
   * Get a colony by ID
   *
   * @param colonyId - Colony ID
   * @returns Colony state or null if not found
   *
   * @example
   * ```typescript
   * const colony = await colonyAPI.get('colony-123');
   * console.log('Colony name:', colony.name);
   * console.log('Active agents:', colony.activeAgents);
   * ```
   */
  async get(colonyId: string): Promise<ColonyState | null> {
    try {
      const response = await this.client.makeRequest<ColonyState>({
        method: 'GET',
        path: `/api/v1/colonies/${colonyId}`,
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
   * Update a colony
   *
   * @param colonyId - Colony ID
   * @param updates - Updates to apply
   * @returns Updated colony state
   *
   * @example
   * ```typescript
   * const colony = await colonyAPI.update('colony-123', {
   *   name: 'updated-colony-name',
   *   maxAgents: 200
   * });
   * ```
   */
  async update(
    colonyId: string,
    updates: Partial<Pick<ColonyConfig, 'name' | 'maxAgents' | 'resourceBudget' | 'metadata'>>
  ): Promise<ColonyState> {
    const response = await this.client.makeRequest<ColonyState>({
      method: 'PATCH',
      path: `/api/v1/colonies/${colonyId}`,
      body: updates,
    });

    return response.data;
  }

  /**
   * Delete a colony
   *
   * @param colonyId - Colony ID
   * @returns True if deleted successfully
   *
   * @example
   * ```typescript
   * await colonyAPI.delete('colony-123');
   * ```
   */
  async delete(colonyId: string): Promise<boolean> {
    const response = await this.client.makeRequest<{ success: boolean }>({
      method: 'DELETE',
      path: `/api/v1/colonies/${colonyId}`,
    });

    return response.data.success;
  }

  /**
   * List all colonies
   *
   * @param pagination - Optional pagination options
   * @returns Paginated colony results
   *
   * @example
   * ```typescript
   * const colonies = await colonyAPI.list({
   *   page: 1,
   *   pageSize: 20
   * });
   *
   * console.log(`Found ${colonies.total} colonies`);
   * ```
   */
  async list(pagination?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<ColonyState>> {
    const params: Record<string, string> = {};

    if (pagination) {
      params.page = pagination.page?.toString() || '1';
      params.pageSize = pagination.pageSize?.toString() || '20';
    }

    const response = await this.client.makeRequest<PaginatedResponse<ColonyState>>({
      method: 'GET',
      path: '/api/v1/colonies',
      params,
    });

    return response.data;
  }

  // ==========================================================================
  // Colony Configuration
  // ==========================================================================

  /**
   * Get colony configuration
   *
   * @param colonyId - Colony ID
   * @returns Colony configuration
   *
   * @example
   * ```typescript
   * const config = await colonyAPI.getConfig('colony-123');
   * console.log('Max agents:', config.maxAgents);
   * ```
   */
  async getConfig(colonyId: string): Promise<ColonyConfig> {
    const response = await this.client.makeRequest<ColonyConfig>({
      method: 'GET',
      path: `/api/v1/colonies/${colonyId}/config`,
    });

    return response.data;
  }

  /**
   * Update colony configuration
   *
   * @param colonyId - Colony ID
   * @param config - New configuration
   * @returns Updated configuration
   *
   * @example
   * ```typescript
   * const config = await colonyAPI.updateConfig('colony-123', {
   *   maxAgents: 200,
   *   resourceBudget: { totalCompute: 2000, totalMemory: 4096 }
   * });
   * ```
   */
  async updateConfig(colonyId: string, config: Partial<ColonyConfig>): Promise<ColonyConfig> {
    const response = await this.client.makeRequest<ColonyConfig>({
      method: 'PATCH',
      path: `/api/v1/colonies/${colonyId}/config`,
      body: config,
    });

    return response.data;
  }

  /**
   * Get colony metadata
   *
   * @param colonyId - Colony ID
   * @returns Colony metadata
   *
   * @example
   * ```typescript
   * const metadata = await colonyAPI.getMetadata('colony-123');
   * console.log('Description:', metadata.description);
   * ```
   */
  async getMetadata(colonyId: string): Promise<ColonyMetadata> {
    const response = await this.client.makeRequest<ColonyMetadata>({
      method: 'GET',
      path: `/api/v1/colonies/${colonyId}/metadata`,
    });

    return response.data;
  }

  /**
   * Update colony metadata
   *
   * @param colonyId - Colony ID
   * @param metadata - New metadata
   * @returns Updated metadata
   *
   * @example
   * ```typescript
   * const metadata = await colonyAPI.updateMetadata('colony-123', {
   *   description: 'Updated description',
   *   tags: ['data', 'processing', 'v2']
   * });
   * ```
   */
  async updateMetadata(colonyId: string, metadata: Partial<ColonyMetadata>): Promise<ColonyMetadata> {
    const response = await this.client.makeRequest<ColonyMetadata>({
      method: 'PATCH',
      path: `/api/v1/colonies/${colonyId}/metadata`,
      body: metadata,
    });

    return response.data;
  }

  // ==========================================================================
  // Resource Management
  // ==========================================================================

  /**
   * Get colony resource budget
   *
   * @param colonyId - Colony ID
   * @returns Current resource budget
   *
   * @example
   * ```typescript
   * const budget = await colonyAPI.getResourceBudget('colony-123');
   * console.log('Total compute:', budget.totalCompute);
   * ```
   */
  async getResourceBudget(colonyId: string): Promise<ResourceBudget> {
    const response = await this.client.makeRequest<ResourceBudget>({
      method: 'GET',
      path: `/api/v1/colonies/${colonyId}/resources`,
    });

    return response.data;
  }

  /**
   * Update resource budget
   *
   * @param colonyId - Colony ID
   * @param budget - New resource budget
   * @returns Updated budget
   *
   * @example
   * ```typescript
   * const budget = await colonyAPI.updateResourceBudget('colony-123', {
   *   totalCompute: 2000,
   *   totalMemory: 4096,
   *   totalNetwork: 200
   * });
   * ```
   */
  async updateResourceBudget(colonyId: string, budget: ResourceBudget): Promise<ResourceBudget> {
    const response = await this.client.makeRequest<ResourceBudget>({
      method: 'PATCH',
      path: `/api/v1/colonies/${colonyId}/resources`,
      body: budget,
    });

    return response.data;
  }

  /**
   * Get resource utilization
   *
   * @param colonyId - Colony ID
   * @returns Resource utilization statistics
   *
   * @example
   * ```typescript
   * const util = await colonyAPI.getResourceUtilization('colony-123');
   * console.log('CPU usage:', util.cpuPercent);
   * console.log('Memory usage:', util.memoryPercent);
   * ```
   */
  async getResourceUtilization(colonyId: string): Promise<{
    cpuPercent: number;
    memoryPercent: number;
    networkPercent: number;
    agentCount: number;
    activeTaskCount: number;
  }> {
    const response = await this.client.makeRequest<{
      cpuPercent: number;
      memoryPercent: number;
      networkPercent: number;
      agentCount: number;
      activeTaskCount: number;
    }>({
      method: 'GET',
      path: `/api/v1/colonies/${colonyId}/utilization`,
    });

    return response.data;
  }

  // ==========================================================================
  // Agent Management
  // ==========================================================================

  /**
   * Deploy an agent to a colony
   *
   * @param colonyId - Colony ID
   * @param config - Agent configuration
   * @returns Deployed agent info
   *
   * @example
   * ```typescript
   * const agent = await colonyAPI.deployAgent('colony-123', {
   *   category: 'ephemeral',
   *   typeId: 'data-processor',
   *   goal: 'Process CSV files',
   *   modelFamily: 'default',
   *   inputTopics: ['csv-data'],
   *   outputTopic: 'processed-data'
   * });
   * ```
   */
  async deployAgent(colonyId: string, config: AgentConfig): Promise<{
    agentId: string;
    colonyId: string;
    config: AgentConfig;
    status: string;
    deployedAt: number;
  }> {
    const response = await this.client.makeRequest<{
      agentId: string;
      colonyId: string;
      config: AgentConfig;
      status: string;
      deployedAt: number;
    }>({
      method: 'POST',
      path: `/api/v1/colonies/${colonyId}/agents`,
      body: config,
    });

    return response.data;
  }

  /**
   * List agents in a colony
   *
   * @param colonyId - Colony ID
   * @param pagination - Optional pagination options
   * @returns Paginated agent results
   *
   * @example
   * ```typescript
   * const agents = await colonyAPI.listAgents('colony-123', {
   *   page: 1,
   *   pageSize: 50
   * });
   * ```
   */
  async listAgents(
    colonyId: string,
    pagination?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<{
    agentId: string;
    category: string;
    status: string;
    createdAt: number;
  }>> {
    const params: Record<string, string> = {};

    if (pagination) {
      params.page = pagination.page?.toString() || '1';
      params.pageSize = pagination.pageSize?.toString() || '50';
    }

    const response = await this.client.makeRequest<PaginatedResponse<{
      agentId: string;
      category: string;
      status: string;
      createdAt: number;
    }>>({
      method: 'GET',
      path: `/api/v1/colonies/${colonyId}/agents`,
      params,
    });

    return response.data;
  }

  /**
   * Get agent details
   *
   * @param colonyId - Colony ID
   * @param agentId - Agent ID
   * @returns Agent details
   *
   * @example
   * ```typescript
   * const agent = await colonyAPI.getAgent('colony-123', 'agent-456');
   * ```
   */
  async getAgent(colonyId: string, agentId: string): Promise<{
    agentId: string;
    colonyId: string;
    config: AgentConfig;
    status: string;
    state: unknown;
    statistics: {
      successCount: number;
      failureCount: number;
      avgLatencyMs: number;
      totalTasks: number;
    };
  }> {
    const response = await this.client.makeRequest<{
      agentId: string;
      colonyId: string;
      config: AgentConfig;
      status: string;
      state: unknown;
      statistics: {
        successCount: number;
        failureCount: number;
        avgLatencyMs: number;
        totalTasks: number;
      };
    }>({
      method: 'GET',
      path: `/api/v1/colonies/${colonyId}/agents/${agentId}`,
    });

    return response.data;
  }

  /**
   * Remove an agent from a colony
   *
   * @param colonyId - Colony ID
   * @param agentId - Agent ID
   * @returns True if removed successfully
   *
   * @example
   * ```typescript
   * await colonyAPI.removeAgent('colony-123', 'agent-456');
   * ```
   */
  async removeAgent(colonyId: string, agentId: string): Promise<boolean> {
    const response = await this.client.makeRequest<{ success: boolean }>({
      method: 'DELETE',
      path: `/api/v1/colonies/${colonyId}/agents/${agentId}`,
    });

    return response.data.success;
  }

  /**
   * Activate an agent
   *
   * @param colonyId - Colony ID
   * @param agentId - Agent ID
   * @returns Updated agent status
   *
   * @example
   * ```typescript
   * await colonyAPI.activateAgent('colony-123', 'agent-456');
   * ```
   */
  async activateAgent(colonyId: string, agentId: string): Promise<{ status: string }> {
    const response = await this.client.makeRequest<{ status: string }>({
      method: 'POST',
      path: `/api/v1/colonies/${colonyId}/agents/${agentId}/activate`,
    });

    return response.data;
  }

  /**
   * Deactivate an agent
   *
   * @param colonyId - Colony ID
   * @param agentId - Agent ID
   * @returns Updated agent status
   *
   * @example
   * ```typescript
   * await colonyAPI.deactivateAgent('colony-123', 'agent-456');
   * ```
   */
  async deactivateAgent(colonyId: string, agentId: string): Promise<{ status: string }> {
    const response = await this.client.makeRequest<{ status: string }>({
      method: 'POST',
      path: `/api/v1/colonies/${colonyId}/agents/${agentId}/deactivate`,
    });

    return response.data;
  }

  // ==========================================================================
  // Monitoring and Metrics
  // ==========================================================================

  /**
   * Get colony statistics
   *
   * @param colonyId - Colony ID
   * @returns Colony statistics
   *
   * @example
   * ```typescript
   * const stats = await colonyAPI.getStats('colony-123');
   * console.log('Total agents:', stats.totalAgents);
   * console.log('Shannon diversity:', stats.shannonDiversity);
   * ```
   */
  async getStats(colonyId: string): Promise<{
    totalAgents: number;
    activeAgents: number;
    dormantAgents: number;
    shannonDiversity: number;
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    avgTaskLatencyMs: number;
  }> {
    const response = await this.client.makeRequest<{
      totalAgents: number;
      activeAgents: number;
      dormantAgents: number;
      shannonDiversity: number;
      totalTasks: number;
      successfulTasks: number;
      failedTasks: number;
      avgTaskLatencyMs: number;
    }>({
      method: 'GET',
      path: `/api/v1/colonies/${colonyId}/stats`,
    });

    return response.data;
  }

  /**
   * Get colony metrics
   *
   * @param colonyId - Colony ID
   * @param timeRange - Time range for metrics (e.g., '1h', '24h', '7d')
   * @returns Colony metrics over time
   *
   * @example
   * ```typescript
   * const metrics = await colonyAPI.getMetrics('colony-123', '24h');
   * console.log('Metrics:', metrics.dataPoints);
   * ```
   */
  async getMetrics(colonyId: string, timeRange: string = '1h'): Promise<{
    timeRange: string;
    dataPoints: Array<{
      timestamp: number;
      activeAgents: number;
      taskRate: number;
      avgLatencyMs: number;
      errorRate: number;
    }>;
  }> {
    const response = await this.client.makeRequest<{
      timeRange: string;
      dataPoints: Array<{
        timestamp: number;
        activeAgents: number;
        taskRate: number;
        avgLatencyMs: number;
        errorRate: number;
      }>;
    }>({
      method: 'GET',
      path: `/api/v1/colonies/${colonyId}/metrics`,
      params: { timeRange },
    });

    return response.data;
  }

  /**
   * Get agent performance metrics
   *
   * @param colonyId - Colony ID
   * @param agentId - Agent ID
   * @param timeRange - Time range for metrics
   * @returns Agent performance metrics
   *
   * @example
   * ```typescript
   * const metrics = await colonyAPI.getAgentMetrics('colony-123', 'agent-456', '1h');
   * ```
   */
  async getAgentMetrics(
    colonyId: string,
    agentId: string,
    timeRange: string = '1h'
  ): Promise<{
    timeRange: string;
    dataPoints: Array<{
      timestamp: number;
      successRate: number;
      avgLatencyMs: number;
      taskCount: number;
    }>;
  }> {
    const response = await this.client.makeRequest<{
      timeRange: string;
      dataPoints: Array<{
        timestamp: number;
        successRate: number;
        avgLatencyMs: number;
        taskCount: number;
      }>;
    }>({
      method: 'GET',
      path: `/api/v1/colonies/${colonyId}/agents/${agentId}/metrics`,
      params: { timeRange },
    });

    return response.data;
  }

  // ==========================================================================
  // Event Streaming
  // ==========================================================================

  /**
   * Subscribe to colony events
   *
   * @param colonyId - Colony ID
   * @param eventType - Event type to subscribe to
   * @param handler - Event handler
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = await colonyAPI.subscribe(
   *   'colony-123',
   *   'agent:spawned',
   *   (event) => {
   *     console.log('Agent spawned:', event.data);
   *   }
   * );
   *
   * // Later: unsubscribe();
   * ```
   */
  async subscribe(
    colonyId: string,
    eventType: EventType,
    handler: EventHandler
  ): Promise<() => Promise<void>> {
    const wsClient = await this.client.websocket();
    await wsClient.connect();

    const subscriptionId = await wsClient.subscribe(eventType, handler, { source: colonyId });

    return async () => {
      await wsClient.unsubscribe(subscriptionId);
    };
  }

  /**
   * Stream colony metrics in real-time
   *
   * @param colonyId - Colony ID
   * @param handler - Metric handler
   * @param interval - Update interval in milliseconds
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = await colonyAPI.streamMetrics(
   *   'colony-123',
   *   (metrics) => {
   *     console.log('Active agents:', metrics.activeAgents);
   *   },
   *   1000
   * );
   * ```
   */
  async streamMetrics(
    colonyId: string,
    handler: (metrics: { activeAgents: number; taskRate: number; avgLatencyMs: number }) => void | Promise<void>,
    interval: number = 1000
  ): Promise<() => Promise<void>> {
    const wsClient = await this.client.websocket();
    await wsClient.connect();

    const metricHandler: EventHandler = async (event) => {
      if (event.type === 'colony:updated' && event.source === colonyId) {
        await handler(event.data as { activeAgents: number; taskRate: number; avgLatencyMs: number });
      }
    };

    await wsClient.subscribe('colony:updated', metricHandler, { source: colonyId });

    return async () => {
      await wsClient.unsubscribe('colony:updated');
    };
  }

  // ==========================================================================
  // Task Execution
  // ==========================================================================

  /**
   * Execute a task in a colony
   *
   * @param colonyId - Colony ID
   * @param task - Task to execute
   * @returns Task execution result
   *
   * @example
   * ```typescript
   * const result = await colonyAPI.executeTask('colony-123', {
   *   type: 'data-processing',
   *   input: { data: [1, 2, 3] },
   *   agentId: 'agent-456' // optional
   * });
   * ```
   */
  async executeTask<T = unknown, R = unknown>(
    colonyId: string,
    task: {
      type?: string;
      agentId?: string;
      input: T;
      timeout?: number;
    }
  ): Promise<{
    taskId: string;
    agentId: string;
    success: boolean;
    output: R;
    executionTimeMs: number;
  }> {
    const response = await this.client.makeRequest<{
      taskId: string;
      agentId: string;
      success: boolean;
      output: R;
      executionTimeMs: number;
    }>({
      method: 'POST',
      path: `/api/v1/colonies/${colonyId}/tasks`,
      body: task,
    });

    return response.data;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default ColonyAPI;
