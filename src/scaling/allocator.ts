/**
 * Resource Allocator
 *
 * Manages allocation of resources to agents
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { ResourceAllocation, ResourceMetrics } from './types.js';

/**
 * Allocation request
 */
interface AllocationRequest {
  agentId: string;
  cpu: number;
  memory: number;
  kvCache?: number;
  priority: number;
  timeout?: number;
}

/**
 * Allocation pool
 */
interface AllocationPool {
  totalCPU: number;
  totalMemory: number;
  totalKVCache: number;
  allocatedCPU: number;
  allocatedMemory: number;
  allocatedKVCache: number;
}

/**
 * Resource Allocator
 */
export class ResourceAllocator extends EventEmitter {
  private allocations: Map<string, ResourceAllocation> = new Map();
  private pool: AllocationPool;
  private pendingRequests: Map<string, AllocationRequest> = new Map();

  constructor(pool: AllocationPool) {
    super();
    this.pool = pool;
  }

  /**
   * Request resource allocation
   */
  public async request(request: AllocationRequest): Promise<boolean> {
    // Check if resources available
    const available = this.checkAvailability(request);

    if (!available) {
      // Add to pending queue
      this.pendingRequests.set(request.agentId, request);
      this.emit('queued', request);
      return false;
    }

    // Allocate resources
    const allocation: ResourceAllocation = {
      agentId: request.agentId,
      cpu: request.cpu,
      memory: request.memory,
      kvCache: request.kvCache,
      priority: request.priority,
      expiresAt: request.timeout ? Date.now() + request.timeout : undefined,
    };

    this.allocate(allocation);
    return true;
  }

  /**
   * Check if resources are available
   */
  private checkAvailability(request: AllocationRequest): boolean {
    const availableCPU =
      this.pool.totalCPU - this.pool.allocatedCPU - request.cpu;
    const availableMemory =
      this.pool.totalMemory - this.pool.allocatedMemory - request.memory;
    const availableKVCache = request.kvCache
      ? this.pool.totalKVCache - this.pool.allocatedKVCache - request.kvCache
      : 0;

    return (
      availableCPU >= 0 &&
      availableMemory >= 0 &&
      (!request.kvCache || availableKVCache >= 0)
    );
  }

  /**
   * Allocate resources
   */
  private allocate(allocation: ResourceAllocation): void {
    this.allocations.set(allocation.agentId, allocation);

    // Update pool
    this.pool.allocatedCPU += allocation.cpu;
    this.pool.allocatedMemory += allocation.memory;
    if (allocation.kvCache) {
      this.pool.allocatedKVCache += allocation.kvCache;
    }

    this.emit('allocated', allocation);
  }

  /**
   * Release resources
   */
  public release(agentId: string): void {
    const allocation = this.allocations.get(agentId);

    if (!allocation) {
      return;
    }

    // Update pool
    this.pool.allocatedCPU -= allocation.cpu;
    this.pool.allocatedMemory -= allocation.memory;
    if (allocation.kvCache) {
      this.pool.allocatedKVCache -= allocation.kvCache;
    }

    this.allocations.delete(agentId);
    this.emit('released', allocation);

    // Try to fulfill pending requests
    this.processPendingQueue();
  }

  /**
   * Process pending allocation queue
   */
  private processPendingQueue(): void {
    // Sort by priority
    const sorted = Array.from(this.pendingRequests.values()).sort(
      (a, b) => b.priority - a.priority
    );

    for (const request of sorted) {
      if (this.checkAvailability(request)) {
        this.pendingRequests.delete(request.agentId);

        const allocation: ResourceAllocation = {
          agentId: request.agentId,
          cpu: request.cpu,
          memory: request.memory,
          kvCache: request.kvCache,
          priority: request.priority,
          expiresAt: request.timeout
            ? Date.now() + request.timeout
            : undefined,
        };

        this.allocate(allocation);
        this.emit('allocated_from_queue', allocation);
      }
    }
  }

  /**
   * Get allocation for agent
   */
  public getAllocation(agentId: string): ResourceAllocation | undefined {
    return this.allocations.get(agentId);
  }

  /**
   * Get all allocations
   */
  public getAllAllocations(): ResourceAllocation[] {
    return Array.from(this.allocations.values());
  }

  /**
   * Get pool utilization
   */
  public getUtilization(): {
    cpu: number;
    memory: number;
    kvCache: number;
  } {
    return {
      cpu: this.pool.allocatedCPU / this.pool.totalCPU,
      memory: this.pool.allocatedMemory / this.pool.totalMemory,
      kvCache: this.pool.totalKVCache > 0
        ? this.pool.allocatedKVCache / this.pool.totalKVCache
        : 0,
    };
  }

  /**
   * Get available resources
   */
  public getAvailable(): {
    cpu: number;
    memory: number;
    kvCache: number;
  } {
    return {
      cpu: this.pool.totalCPU - this.pool.allocatedCPU,
      memory: this.pool.totalMemory - this.pool.allocatedMemory,
      kvCache: this.pool.totalKVCache - this.pool.allocatedKVCache,
    };
  }

  /**
   * Expand pool
   */
  public expandPool(resources: Partial<AllocationPool>): void {
    if (resources.totalCPU) {
      this.pool.totalCPU += resources.totalCPU;
    }
    if (resources.totalMemory) {
      this.pool.totalMemory += resources.totalMemory;
    }
    if (resources.totalKVCache) {
      this.pool.totalKVCache += resources.totalKVCache;
    }

    this.emit('pool_expanded', resources);

    // Try to fulfill pending requests
    this.processPendingQueue();
  }

  /**
   * Shrink pool
   */
  public shrinkPool(resources: Partial<AllocationPool>): void {
    // Ensure we don't shrink below allocated
    const newCPU = this.pool.totalCPU - (resources.totalCPU || 0);
    const newMemory = this.pool.totalMemory - (resources.totalMemory || 0);
    const newKVCache = this.pool.totalKVCache - (resources.totalKVCache || 0);

    if (
      newCPU < this.pool.allocatedCPU ||
      newMemory < this.pool.allocatedMemory ||
      newKVCache < this.pool.allocatedKVCache
    ) {
      throw new Error('Cannot shrink pool below allocated resources');
    }

    if (resources.totalCPU) {
      this.pool.totalCPU -= resources.totalCPU;
    }
    if (resources.totalMemory) {
      this.pool.totalMemory -= resources.totalMemory;
    }
    if (resources.totalKVCache) {
      this.pool.totalKVCache -= resources.totalKVCache;
    }

    this.emit('pool_shrunk', resources);
  }

  /**
   * Get pending request count
   */
  public getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Clear expired allocations
   */
  public clearExpired(): void {
    const now = Date.now();

    for (const [agentId, allocation] of this.allocations) {
      if (allocation.expiresAt && allocation.expiresAt < now) {
        this.release(agentId);
        this.emit('expired', allocation);
      }
    }
  }

  /**
   * Get pool size
   */
  public getPoolSize(): AllocationPool {
    return { ...this.pool };
  }

  /**
   * Convert to metrics
   */
  public toMetrics(): ResourceMetrics {
    const utilization = this.getUtilization();

    return {
      cpu: {
        usage: utilization.cpu * 100,
        available: this.pool.totalCPU - this.pool.allocatedCPU,
        total: this.pool.totalCPU,
      },
      memory: {
        usage: utilization.memory * 100,
        used: this.pool.allocatedMemory,
        total: this.pool.totalMemory,
        heapUsed: 0,
        heapTotal: 0,
      },
      network: {
        requestRate: 0,
        bandwidth: 0,
        connections: this.allocations.size,
      },
      agents: {
        total: this.allocations.size,
        active: this.allocations.size,
        dormant: 0,
        spawning: 0,
        terminating: 0,
      },
      tasks: {
        queueDepth: this.pendingRequests.size,
        pending: this.pendingRequests.size,
        running: this.allocations.size,
        completed: 0,
        failed: 0,
        averageLatency: 0,
      },
      kvCache: {
        anchorCount: 0,
        totalSize: this.pool.allocatedKVCache,
        hitRate: 0,
        compressionRatio: 0,
      },
    };
  }
}
