/**
 * POLLN Flow Monitor
 *
 * Tracks information flow between agents
 * Flow = σ(P_target - P_source) · weight · (1 - resistance)
 *
 * Monitors:
 * - Information transfer rates
 * - Communication pathway efficiency
 * - Bottlenecks and blockages
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Flow,
  Pipe,
  HydraulicConfig,
  HydraulicEvent,
  HydraulicEventType,
  FlowAnalysis,
} from './types';

export class FlowMonitor extends EventEmitter {
  private config: HydraulicConfig;
  private flows: Map<string, Flow> = new Map();
  private pipes: Map<string, Pipe> = new Map();
  private flowHistory: Map<string, Flow[]> = new Map();
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<HydraulicConfig> = {}) {
    super();
    this.config = {
      flowUpdateInterval: 1000,
      minFlowThreshold: 0.01,
      maxFlowRate: 1.0,
      ...config,
      alertThresholds: {
        highPressure: 0.8,
        lowFlow: 0.1,
        highResistance: 0.7,
        lowReservoir: 0.2,
        ...config.alertThresholds,
      },
    };
  }

  /**
   * Start monitoring flow
   */
  start(): void {
    if (this.updateTimer) return;

    this.updateTimer = setInterval(() => {
      this.updateAllFlows();
    }, this.config.flowUpdateInterval);
  }

  /**
   * Stop monitoring flow
   */
  stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Register a communication pipe between agents
   */
  registerPipe(
    sourceId: string,
    targetId: string,
    weight: number,
    capacity: number = 1.0
  ): Pipe {
    const pipe: Pipe = {
      id: uuidv4(),
      sourceId,
      targetId,
      weight,
      capacity,
      resistance: 0,
      latency: 0,
      state: 'active',
    };

    this.pipes.set(pipe.id, pipe);
    this.flowHistory.set(pipe.id, []);

    return pipe;
  }

  /**
   * Update pipe resistance
   */
  updatePipeResistance(pipeId: string, resistance: number): void {
    const pipe = this.pipes.get(pipeId);
    if (!pipe) return;

    pipe.resistance = Math.max(0, Math.min(1, resistance));

    // Update state based on resistance
    if (pipe.resistance > 0.8) {
      pipe.state = 'blocked';
    } else if (pipe.resistance > 0.5) {
      pipe.state = 'degraded';
    } else {
      pipe.state = 'active';
    }

    // Check for blockage event
    if (pipe.state === 'blocked') {
      const event: HydraulicEvent = {
        type: HydraulicEventType.FLOW_BLOCKAGE,
        timestamp: Date.now(),
        severity: 'warning',
        componentId: pipeId,
        description: `Flow blockage detected between ${pipe.sourceId} and ${pipe.targetId}`,
        data: {
          resistance: pipe.resistance,
          sourceId: pipe.sourceId,
          targetId: pipe.targetId,
        },
      };
      this.emit('event', event);
    }
  }

  /**
   * Calculate and update flow for a pipe
   * Qᵢⱼ = σ(Pⱼ - Pᵢ) · wᵢⱼ · (1 - Rᵢⱼ)
   */
  calculateFlow(
    pipeId: string,
    sourcePressure: number,
    targetPressure: number
  ): Flow {
    const pipe = this.pipes.get(pipeId);
    if (!pipe) {
      throw new Error(`Pipe ${pipeId} not found`);
    }

    // Calculate pressure gradient
    const gradient = targetPressure - sourcePressure;

    // Sigmoid activation function
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
    const activation = sigmoid(gradient);

    // Calculate flow rate
    const rate = activation * pipe.weight * (1 - pipe.resistance) * pipe.capacity;

    const flow: Flow = {
      id: uuidv4(),
      sourceId: pipe.sourceId,
      targetId: pipe.targetId,
      rate: Math.max(0, Math.min(this.config.maxFlowRate, rate)),
      pressure: {
        source: sourcePressure,
        target: targetPressure,
        gradient,
      },
      resistance: pipe.resistance,
      timestamp: Date.now(),
    };

    this.flows.set(flow.id, flow);

    // Update history
    const history = this.flowHistory.get(pipeId) || [];
    history.push(flow);
    if (history.length > 100) {
      history.shift();
    }
    this.flowHistory.set(pipeId, history);

    // Check for flow events
    this.checkFlowEvents(pipeId, flow, pipe);

    return flow;
  }

  /**
   * Get current flow for a pipe
   */
  getFlow(pipeId: string): Flow | undefined {
    return this.flows.get(pipeId);
  }

  /**
   * Get all flows
   */
  getAllFlows(): Map<string, Flow> {
    return new Map(this.flows);
  }

  /**
   * Get flow history for a pipe
   */
  getFlowHistory(pipeId: string): Flow[] {
    return this.flowHistory.get(pipeId) || [];
  }

  /**
   * Analyze flow for a specific pipe
   */
  analyzeFlow(pipeId: string): FlowAnalysis | null {
    const pipe = this.pipes.get(pipeId);
    const history = this.flowHistory.get(pipeId);

    if (!pipe || !history || history.length < 3) {
      return null;
    }

    // Calculate average flow rate
    const avgFlow = history.reduce((sum, f) => sum + f.rate, 0) / history.length;

    // Calculate efficiency (actual vs theoretical max)
    const theoreticalMax = pipe.weight * pipe.capacity;
    const efficiency = theoreticalMax > 0 ? avgFlow / theoreticalMax : 0;

    // Identify bottlenecks
    const bottlenecks: string[] = [];
    if (pipe.resistance > 0.5) {
      bottlenecks.push(`High resistance: ${(pipe.resistance * 100).toFixed(1)}%`);
    }
    if (efficiency < 0.3) {
      bottlenecks.push(`Low efficiency: ${(efficiency * 100).toFixed(1)}%`);
    }
    if (pipe.state === 'blocked') {
      bottlenecks.push('Pipe is blocked');
    }

    // Generate optimizations
    const optimizations: string[] = [];
    if (pipe.resistance > 0.3) {
      optimizations.push('Reduce resistance by increasing agent capacity');
    }
    if (pipe.weight < 0.5 && efficiency > 0.7) {
      optimizations.push('Consider increasing weight to strengthen pathway');
    }
    if (bottlenecks.length > 0) {
      optimizations.push('Activate pump to boost flow');
    }

    return {
      sourceId: pipe.sourceId,
      targetId: pipe.targetId,
      currentFlow: avgFlow,
      efficiency,
      bottlenecks,
      optimizations,
    };
  }

  /**
   * Get pipes with highest flow
   */
  getHighestFlowPipes(count: number = 5): Array<{ pipeId: string; flow: number }> {
    const flows: Array<{ pipeId: string; flow: number }> = [];

    for (const [pipeId, history] of this.flowHistory) {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        flows.push({ pipeId, flow: latest.rate });
      }
    }

    flows.sort((a, b) => b.flow - a.flow);
    return flows.slice(0, count);
  }

  /**
   * Get pipes with lowest flow
   */
  getLowestFlowPipes(count: number = 5): Array<{ pipeId: string; flow: number }> {
    const flows: Array<{ pipeId: string; flow: number }> = [];

    for (const [pipeId, history] of this.flowHistory) {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        flows.push({ pipeId, flow: latest.rate });
      }
    }

    flows.sort((a, b) => a.flow - b.flow);
    return flows.slice(0, count);
  }

  /**
   * Detect bottlenecks in the system
   */
  detectBottlenecks(): Array<{ pipeId: string; severity: number; reason: string }> {
    const bottlenecks: Array<{ pipeId: string; severity: number; reason: string }> = [];

    for (const [pipeId, pipe] of this.pipes) {
      let severity = 0;
      const reasons: string[] = [];

      if (pipe.resistance > 0.7) {
        severity += 0.5;
        reasons.push(`High resistance: ${(pipe.resistance * 100).toFixed(1)}%`);
      }

      const history = this.flowHistory.get(pipeId);
      if (history && history.length > 0) {
        const avgFlow = history.reduce((sum, f) => sum + f.rate, 0) / history.length;
        if (avgFlow < this.config.minFlowThreshold) {
          severity += 0.3;
          reasons.push(`Low flow rate: ${avgFlow.toFixed(3)}`);
        }
      }

      if (pipe.state === 'blocked') {
        severity += 0.8;
        reasons.push('Pipe is blocked');
      }

      if (severity > 0.5) {
        bottlenecks.push({
          pipeId,
          severity: Math.min(1, severity),
          reason: reasons.join(', '),
        });
      }
    }

    bottlenecks.sort((a, b) => b.severity - a.severity);
    return bottlenecks;
  }

  /**
   * Update all flows with decay
   */
  private updateAllFlows(): void {
    for (const [flowId, flow] of this.flows) {
      const decayed = flow.rate * 0.99; // Slow decay
      const updated: Flow = {
        ...flow,
        rate: decayed,
        timestamp: Date.now(),
      };
      this.flows.set(flowId, updated);
    }
  }

  /**
   * Check for flow-related events
   */
  private checkFlowEvents(pipeId: string, flow: Flow, pipe: Pipe): void {
    // Flow surge
    if (flow.rate > this.config.maxFlowRate * 0.9) {
      const event: HydraulicEvent = {
        type: HydraulicEventType.FLOW_SURGE,
        timestamp: Date.now(),
        severity: 'warning',
        componentId: pipeId,
        description: `Flow surge detected between ${pipe.sourceId} and ${pipe.targetId}`,
        data: {
          flowRate: flow.rate,
          capacity: pipe.capacity,
        },
      };
      this.emit('event', event);
    }

    // Low flow
    if (flow.rate < this.config.minFlowThreshold && pipe.state === 'active') {
      const event: HydraulicEvent = {
        type: HydraulicEventType.FLOW_BLOCKAGE,
        timestamp: Date.now(),
        severity: 'info',
        componentId: pipeId,
        description: `Low flow detected between ${pipe.sourceId} and ${pipe.targetId}`,
        data: {
          flowRate: flow.rate,
          threshold: this.config.minFlowThreshold,
        },
      };
      this.emit('event', event);
    }
  }

  /**
   * Get flow statistics
   */
  getStats(): {
    totalFlow: number;
    avgFlowRate: number;
    maxFlowRate: number;
    minFlowRate: number;
    activePipes: number;
    blockedPipes: number;
  } {
    const flows = Array.from(this.flows.values());
    const rates = flows.map(f => f.rate);
    const activePipes = Array.from(this.pipes.values()).filter(p => p.state === 'active').length;
    const blockedPipes = Array.from(this.pipes.values()).filter(p => p.state === 'blocked').length;

    return {
      totalFlow: rates.reduce((a, b) => a + b, 0),
      avgFlowRate: rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0,
      maxFlowRate: rates.length > 0 ? Math.max(...rates) : 0,
      minFlowRate: rates.length > 0 ? Math.min(...rates) : 0,
      activePipes,
      blockedPipes,
    };
  }
}
