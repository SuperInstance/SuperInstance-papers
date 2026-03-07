/**
 * POLLN A2APackage Communication System
 * Agent-to-Agent messaging with causal chains
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import type { A2APackage, PrivacyLevel, SubsumptionLayer } from './types';

export interface A2APackageSystemConfig {
  historySize: number;
  defaultPrivacyLevel: PrivacyLevel;
  defaultLayer: SubsumptionLayer;
}

export interface PackageMetadata {
  epsilon: number;
  delta: number;
  noiseScale: number;
}

/**
 * A2APackageSystem - Communication layer for agent-to-agent messaging
 *
 * Key insight: "A2A packages ARE artifacts. Every communication is
 * visible, inspectable, stored, and replayable."
 */
export class A2APackageSystem extends EventEmitter {
  private config: A2APackageSystemConfig;
  private packages: Map<string, A2APackage> = new Map();
  private messageHistory: Map<string, A2APackage[]> = new Map();
  private causalChains: Map<string, string[]> = new Map();

  constructor(config?: Partial<A2APackageSystemConfig>) {
    super();
    this.config = {
      historySize: 100,
      defaultPrivacyLevel: 'COLONY',
      defaultLayer: 'HABITUAL',
      ...config
    };
  }

  /**
   * Create a new A2A package
   */
  async createPackage<T>(
    senderId: string,
    receiverId: string,
    type: string,
    payload: T,
    options?: {
      privacyLevel?: PrivacyLevel;
      layer?: SubsumptionLayer;
      parentIds?: string[];
      dpMetadata?: PackageMetadata;
    }
  ): Promise<A2APackage<T>> {
    const id = uuidv4();
    const timestamp = Date.now();
    const causalChainId = uuidv4();

    const pkg: A2APackage<T> = {
      id,
      timestamp,
      senderId,
      receiverId,
      type,
      payload,
      parentIds: options?.parentIds || [],
      causalChainId,
      privacyLevel: options?.privacyLevel || this.config.defaultPrivacyLevel,
      layer: options?.layer || this.config.defaultLayer,
      dpMetadata: options?.dpMetadata,
    };

    // Store package
    this.packages.set(id, pkg);

    // Add to sender history
    this.addToHistory(senderId, pkg);

    // Track causal chain
    this.updateCausalChain(pkg);

    this.emit('package_created', pkg);

    return pkg;
  }

  /**
   * Get package by ID
   */
  getPackage<T>(id: string): A2APackage<T> | undefined {
    return this.packages.get(id) as A2APackage<T> | undefined;
  }

  /**
   * Get message history for an agent
   */
  getHistory(agentId: string, limit?: number): A2APackage[] {
    const history = this.messageHistory.get(agentId) || [];
    return history.slice(-(limit || this.config.historySize));
  }

  /**
   * Get full causal chain for a package
   */
  getCausalChain(packageId: string): string[] {
    const pkg = this.packages.get(packageId);
    if (!pkg) return [];

    const chain: string[] = [packageId];
    const visited = new Set<string>([packageId]);
    const queue = [...pkg.parentIds];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentPkg = this.packages.get(currentId);
      if (currentPkg) {
        chain.push(currentId);
        queue.push(...currentPkg.parentIds);
      }
    }

    return chain;
  }

  /**
   * Replay a causal chain
   */
  async replayChain(packageId: string): Promise<A2APackage[]> {
    const chain = this.getCausalChain(packageId);
    return chain
      .map(id => this.packages.get(id))
      .filter((pkg): pkg is A2APackage => pkg !== undefined)
      .reverse();
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.packages.clear();
    this.messageHistory.clear();
    this.causalChains.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalPackages: number;
    historySize: number;
    uniqueChains: number;
  } {
    return {
      totalPackages: this.packages.size,
      historySize: this.config.historySize,
      uniqueChains: this.causalChains.size,
    };
  }

  /**
   * Add package to history
   */
  private addToHistory(agentId: string, pkg: A2APackage): void {
    if (!this.messageHistory.has(agentId)) {
      this.messageHistory.set(agentId, []);
    }

    const history = this.messageHistory.get(agentId)!;
    history.push(pkg);

    // Trim if needed
    if (history.length > this.config.historySize) {
      history.shift();
    }
  }

  /**
   * Update causal chain tracking
   */
  private updateCausalChain(pkg: A2APackage): void {
    if (!this.causalChains.has(pkg.causalChainId)) {
      this.causalChains.set(pkg.causalChainId, []);
    }

    const chain = this.causalChains.get(pkg.causalChainId)!;
    chain.push(pkg.id);

    // Also add parent IDs to chain
    for (const parentId of pkg.parentIds) {
      if (!chain.includes(parentId)) {
        chain.push(parentId);
      }
    }
  }
}
