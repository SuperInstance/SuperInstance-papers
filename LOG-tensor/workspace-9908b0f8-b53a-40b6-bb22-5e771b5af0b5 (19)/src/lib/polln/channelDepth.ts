/**
 * POLLN-RTT Round 5: Channel Depth
 * 
 * Depth(s) = ∫₀^t visits(τ) × e^(-λ(t-τ)) dτ
 * Cost(s) = Base × e^(-α × Depth(s))
 * 
 * Water metaphor: channels carved → thoughts find ocean with NO WORK
 */

export interface Visit {
  timestamp: number;
  intensity: number;
}

export interface DepthParameters {
  lambda: number;  // Decay rate
  alpha: number;   // Cost sensitivity
  baseCost: number;
}

export interface DepthResult {
  depth: number;
  cost: number;
  timestamp: number;
}

export interface LearningCurve {
  times: number[];
  depths: number[];
  costs: number[];
}

export class ChannelDepth {
  private lambda: number;
  private alpha: number;
  private baseCost: number;
  private visits: Visit[];

  constructor(params: Partial<DepthParameters> = {}) {
    this.lambda = params.lambda ?? 0.1;
    this.alpha = params.alpha ?? 0.5;
    this.baseCost = params.baseCost ?? 1.0;
    this.visits = [];
  }

  /**
   * Record a visit
   */
  recordVisit(timestamp: number, intensity: number = 1.0): void {
    this.visits.push({ timestamp, intensity });
  }

  /**
   * Compute channel depth
   * Depth(s) = ∫₀^t visits(τ) × e^(-λ(t-τ)) dτ
   * 
   * Discretized as: Depth = Σ visits(τ_i) × e^(-λ(t-τ_i))
   */
  computeDepth(currentTime: number): number {
    let depth = 0;
    
    for (const visit of this.visits) {
      const timeDiff = currentTime - visit.timestamp;
      const decay = Math.exp(-this.lambda * timeDiff);
      depth += visit.intensity * decay;
    }
    
    return depth;
  }

  /**
   * Compute cognitive cost
   * Cost(s) = Base × e^(-α × Depth(s))
   * 
   * Higher channel depth = lower cognitive cost
   */
  computeCognitiveCost(currentTime: number): number {
    const depth = this.computeDepth(currentTime);
    return this.baseCost * Math.exp(-this.alpha * depth);
  }

  /**
   * Simulate learning over time
   * Returns how depth and cost evolve with repeated visits
   */
  simulateLearning(nVisits: number, timeSpan: number): LearningCurve {
    const times: number[] = [];
    const depths: number[] = [];
    const costs: number[] = [];

    for (let i = 0; i < nVisits; i++) {
      const t = (i + 1) * timeSpan / nVisits;
      this.recordVisit(t, 1.0);
      
      const depth = this.computeDepth(t);
      const cost = this.computeCognitiveCost(t);
      
      times.push(t);
      depths.push(depth);
      costs.push(cost);
    }

    return { times, depths, costs };
  }

  /**
   * Get cost reduction percentage
   */
  getCostReduction(currentTime: number): number {
    const cost = this.computeCognitiveCost(currentTime);
    return (1 - cost / this.baseCost) * 100;
  }

  /**
   * Clear visit history
   */
  clear(): void {
    this.visits = [];
  }

  /**
   * Get visit count
   */
  get visitCount(): number {
    return this.visits.length;
  }

  /**
   * Get parameters
   */
  getParams(): DepthParameters {
    return {
      lambda: this.lambda,
      alpha: this.alpha,
      baseCost: this.baseCost
    };
  }

  /**
   * Set parameters
   */
  setParams(params: Partial<DepthParameters>): void {
    if (params.lambda !== undefined) this.lambda = params.lambda;
    if (params.alpha !== undefined) this.alpha = params.alpha;
    if (params.baseCost !== undefined) this.baseCost = params.baseCost;
  }

  /**
   * Compute steady-state depth (theoretical maximum)
   */
  computeSteadyStateDepth(visitRate: number): number {
    // At steady state with regular visits, depth converges to visitRate / lambda
    return visitRate / this.lambda;
  }

  /**
   * Compute mastery level (0-1)
   */
  computeMasteryLevel(currentTime: number): number {
    const cost = this.computeCognitiveCost(currentTime);
    // Mastery = 1 - normalized cost
    return 1 - (cost / this.baseCost);
  }
}

export default ChannelDepth;
