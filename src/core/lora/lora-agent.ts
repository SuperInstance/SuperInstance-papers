/**
 * LoRA-Enhanced Agent
 *
 * Agent that uses LoRA tool belts for dynamic expertise
 * Extends BaseAgent with LoRA-specific capabilities
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from '../agent.js';
import type { AgentConfig, A2APackage } from '../types.js';
import { PrivacyLevel, SubsumptionLayer } from '../types.js';
import type {
  LoRAAdapter,
  LoRAComposition,
  LoRASwapRequest,
  LoRASwapResponse,
  LoRADiscoveryRequest,
  LoRADiscoveryResponse,
  LoRASwapRequestPayload,
  LoRAAgentConfig,
} from './types.js';
import { LoRALibrary, LoRAToolBelt } from './tool-belt.js';
import { ExpertRegistry } from './expert-registry.js';

/**
 * LoRA-Enhanced Agent
 * Agent that can dynamically load and swap LoRA adapters
 */
export class LoRAEnhancedAgent extends BaseAgent<LoRAAgentConfig> {
  private loraLibrary: LoRALibrary;
  private loraToolBelt: LoRAToolBelt;
  private expertRegistry: ExpertRegistry;
  private currentComposition: LoRAComposition | null = null;
  private minPerformanceThreshold: number;
  private enableAutoSelect: boolean;
  private maxLoRAs: number;

  // Performance tracking
  private recentPerformance: number[] = [];
  private performanceHistorySize = 10;

  constructor(
    config: LoRAAgentConfig,
    loraLibrary: LoRALibrary,
    expertRegistry: ExpertRegistry
  ) {
    super(config);

    this.loraLibrary = loraLibrary;
    this.expertRegistry = expertRegistry;
    this.loraToolBelt = new LoRAToolBelt(loraLibrary, config.id);
    this.minPerformanceThreshold = config.minPerformanceThreshold ?? 0.7;
    this.enableAutoSelect = config.enableAutoSelect ?? true;
    this.maxLoRAs = config.maxLoRAs ?? 3;
  }

  /**
   * Initialize the agent with initial LoRAs
   */
  async initialize(): Promise<void> {
    const initialLoRAs = (this.config as LoRAAgentConfig).initialLoRAs;
    if (initialLoRAs && initialLoRAs.length > 0) {
      await this.loraToolBelt.initialize(initialLoRAs);
      this.currentComposition = this.loraToolBelt.getCurrentComposition();
    }

    this.touch();
  }

  /**
   * Process input with current LoRA composition
   */
  async process<T>(input: T): Promise<A2APackage<T>> {
    this.touch();

    // Extract task description from input
    const task = this.extractTaskFromInput(input);

    // Check if current composition is suitable
    if (this.enableAutoSelect && this.shouldAutoSelect(task)) {
      await this.autoSelectLoRAs(task);
    }

    // Process with current composition
    const result = await this.processWithLoRAs(input);

    // Record performance
    this.recordPerformance(result.payload ? 1 : 0);

    return result;
  }

  /**
   * Process input with active LoRAs applied
   */
  private async processWithLoRAs<T>(input: T): Promise<A2APackage<T>> {
    // Get merged LoRA weights
    const mergedDelta = this.loraToolBelt.mergeCurrentLoRAs();

    // Apply to base model (simplified - in production, actual model forward pass)
    // For now, return a placeholder response
    const response: A2APackage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: this.config.inputTopics[0] ?? 'unknown',
      type: 'lora-agent-response',
      payload: input,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: PrivacyLevel.COLONY,
      layer: SubsumptionLayer.DELIBERATE,
    };

    return response;
  }

  /**
   * Request LoRA swap from colony
   */
  async requestLoRASwap(changes: LoRASwapRequestPayload['requestedChanges']): Promise<LoRAComposition | null> {
    if (!this.currentComposition) {
      return null;
    }

    const request: LoRASwapRequest = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'lora-swap-request',
      payload: {
        currentComposition: this.currentComposition,
        requestedChanges: changes,
        reason: 'Agent requested LoRA swap',
      },
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: PrivacyLevel.COLONY,
      layer: SubsumptionLayer.DELIBERATE,
    };

    // Process swap locally (simplified - in production, send to colony)
    const responsePayload = await this.loraToolBelt.processSwapRequest(request.payload);

    if (responsePayload.success && responsePayload.newComposition) {
      this.currentComposition = responsePayload.newComposition;
      return this.currentComposition;
    }

    return null;
  }

  /**
   * Auto-select LoRAs based on task
   */
  async autoSelectLoRAs(task: string): Promise<LoRAComposition> {
    const newComposition = await this.loraToolBelt.autoSelectLoRAs(task, this.maxLoRAs);
    this.currentComposition = newComposition;
    return newComposition;
  }

  /**
   * Discover compatible LoRAs for a task
   */
  async discoverLoRAs(task: string): Promise<LoRAAdapter[]> {
    return this.loraLibrary.findLoRAs(task, this.maxLoRAs);
  }

  /**
   * Check if should auto-select new LoRAs
   */
  private shouldAutoSelect(task: string): boolean {
    if (!this.currentComposition || this.currentComposition.loras.length === 0) {
      return true;
    }

    // Check recent performance
    const avgPerf = this.getAveragePerformance();
    if (avgPerf < this.minPerformanceThreshold) {
      return true;
    }

    // Check if current LoRAs are relevant to task
    const taskLower = task.toLowerCase();
    const relevantCount = this.currentComposition.loras.filter(({ loraId }) => {
      const lora = this.loraLibrary.getLoRA(loraId);
      return lora?.expertise.some(exp => taskLower.includes(exp.toLowerCase()));
    }).length;

    return relevantCount === 0;
  }

  /**
   * Extract task description from input
   */
  private extractTaskFromInput<T>(input: T): string {
    if (typeof input === 'string') {
      return input;
    }

    if (typeof input === 'object' && input !== null) {
      if ('task' in input && typeof input.task === 'string') {
        return input.task;
      }

      if ('prompt' in input && typeof input.prompt === 'string') {
        return input.prompt;
      }

      if ('query' in input && typeof input.query === 'string') {
        return input.query;
      }
    }

    return 'generic task';
  }

  /**
   * Record performance metric
   */
  private recordPerformance(performance: number): void {
    this.recentPerformance.push(performance);

    if (this.recentPerformance.length > this.performanceHistorySize) {
      this.recentPerformance.shift();
    }

    // Update value function
    this.updateValueFunction(performance > 0.5 ? 0.1 : -0.1);
  }

  /**
   * Get average recent performance
   */
  private getAveragePerformance(): number {
    if (this.recentPerformance.length === 0) {
      return 0.5;
    }

    return this.recentPerformance.reduce((a, b) => a + b, 0) / this.recentPerformance.length;
  }

  /**
   * Get current composition
   */
  getCurrentComposition(): LoRAComposition | null {
    return this.currentComposition;
  }

  /**
   * Get active LoRA IDs
   */
  getActiveLoRAIds(): string[] {
    return this.currentComposition?.loras.map(l => l.loraId) ?? [];
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    this.currentComposition = null;
    this.recentPerformance = [];
    this.touch();
  }
}

/**
 * LoRA Colony Agent
 * Special agent that manages LoRA library for the colony
 */
export class LoRAColonyAgent extends BaseAgent {
  private loraLibrary: LoRALibrary;
  private expertRegistry: ExpertRegistry;

  constructor(
    config: AgentConfig,
    loraLibrary: LoRALibrary,
    expertRegistry: ExpertRegistry
  ) {
    super(config);
    this.loraLibrary = loraLibrary;
    this.expertRegistry = expertRegistry;
  }

  /**
   * Initialize colony agent
   */
  async initialize(): Promise<void> {
    await this.loraLibrary.initialize();
    this.touch();
  }

  /**
   * Process LoRA-related requests from other agents
   */
  async process<T>(input: T): Promise<A2APackage<T>> {
    this.touch();

    const response: A2APackage<T> = {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: 'colony',
      type: 'lora-colony-response',
      payload: input,
      parentIds: [],
      causalChainId: uuidv4(),
      privacyLevel: PrivacyLevel.COLONY,
      layer: SubsumptionLayer.REFLEX,
    };

    return response;
  }

  /**
   * Handle LoRA discovery request
   */
  handleDiscoveryRequest(request: LoRADiscoveryRequest): LoRADiscoveryResponse {
    const { task, maxCount, currentComposition } = request.payload;

    const suggestions = this.loraLibrary.findLoRAs(task, maxCount);
    const performanceEstimates = new Map<string, number>();

    for (const lora of suggestions) {
      performanceEstimates.set(lora.id, lora.avgPerformance);
    }

    const conflicts = currentComposition
      ? this.loraLibrary.checkConflicts(currentComposition)
      : [];

    return {
      id: uuidv4(),
      timestamp: Date.now(),
      senderId: this.id,
      receiverId: request.senderId,
      type: 'lora-discovery-response',
      payload: {
        suggestions,
        performanceEstimates,
        conflicts,
      },
      parentIds: [request.id],
      causalChainId: request.causalChainId,
      privacyLevel: PrivacyLevel.COLONY,
      layer: SubsumptionLayer.REFLEX,
    };
  }

  /**
   * Get library statistics
   */
  getLibraryStatistics() {
    return {
      loraCount: this.loraLibrary.listLoRAs().length,
      memoryStats: this.loraLibrary.getMemoryStats(),
      registryStats: this.expertRegistry.getStatistics(),
    };
  }

  /**
   * Shutdown colony agent
   */
  async shutdown(): Promise<void> {
    await this.loraLibrary.shutdown();
    this.touch();
  }
}
