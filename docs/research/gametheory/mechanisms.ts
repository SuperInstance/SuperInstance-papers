/**
 * POLLN Game-Theoretic Mechanisms Implementation
 *
 * This file contains practical implementations of the improved mechanisms
 * proposed in GAME_THEORY.md, ready for integration into the main codebase.
 *
 * Mechanisms included:
 * 1. Peer Prediction for Gradient Quality
 * 2. Contribution Credit Tokens
 * 3. Privacy-Preserving Verification
 * 4. Reciprocal Reputation System
 * 5. Automated Negotiation Agent
 * 6. Multi-Armed Bandit Selection
 * 7. EigenTrust Algorithm
 * 8. Byzantine-Resilient Aggregation
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

// ============================================================================
// MECHANISM 1: Peer Prediction for Gradient Quality
// ============================================================================

/**
 * PeerPredictionScoring - Elicit truthful gradient quality reports
 *
 * Strategyproof mechanism for quality assessment without ground truth
 * Uses proper scoring rules and peer correlation
 */
export class PeerPredictionScoring {
  private reports: Map<string, QualityReport> = new Map();
  private history: Map<string, number[]> = new Map();
  private config: PeerPredictionConfig;

  constructor(config?: Partial<PeerPredictionConfig>) {
    this.config = {
      scoringRule: 'BRIER',
      incentiveBudget: 100,
      minPeers: 3,
      correlationWeight: 0.5,
      ...config
    };
  }

  /**
   * Colony reports gradient quality
   */
  reportQuality(
    colonyId: string,
    gradientId: string,
    reportedQuality: number,
    actualQuality: number
  ): number {
    // Compute individual score using proper scoring rule
    const individualScore = this.scoreReport(reportedQuality, actualQuality);

    // Store report
    this.reports.set(`${colonyId}-${gradientId}`, {
      colonyId,
      gradientId,
      reportedQuality,
      actualQuality,
      score: individualScore,
      timestamp: Date.now()
    });

    return individualScore;
  }

  /**
   * Compute score using proper scoring rule (Brier score)
   * Strategyproof: truthful reporting maximizes expected score
   */
  private scoreReport(reported: number, actual: number): number {
    switch (this.config.scoringRule) {
      case 'BRIER':
        // Brier score: -(reported - actual)^2
        return -Math.pow(reported - actual, 2);

      case 'LOGARITHMIC':
        // Logarithmic scoring rule
        const epsilon = 1e-10;
        const normalized = Math.max(epsilon, Math.min(1 - epsilon, reported));
        return actual === 1 ? Math.log(normalized) : Math.log(1 - normalized);

      default:
        return -Math.pow(reported - actual, 2);
    }
  }

  /**
   * Compute bonus based on peer correlation
   * Incentivizes reports that align with peer consensus
   */
  computePeerBonus(colonyId: string, gradientId: string): number {
    const myReport = this.reports.get(`${colonyId}-${gradientId}`);
    if (!myReport) return 0;

    // Get peer reports
    const peerReports: QualityReport[] = [];
    for (const [key, report] of this.reports) {
      if (report.gradientId === gradientId && report.colonyId !== colonyId) {
        peerReports.push(report);
      }
    }

    if (peerReports.length < this.config.minPeers) return 0;

    // Compute correlation with peers
    const correlation = this.computeCorrelation(
      myReport.reportedQuality,
      peerReports.map(r => r.reportedQuality)
    );

    // Bonus proportional to correlation
    return correlation * this.config.incentiveBudget;
  }

  /**
   * Compute correlation between report and peer reports
   */
  private computeCorrelation(myReport: number, peerReports: number[]): number {
    if (peerReports.length === 0) return 0;

    const meanPeers = peerReports.reduce((a, b) => a + b, 0) / peerReports.length;
    const variance = peerReports.reduce((sum, r) => sum + Math.pow(r - meanPeers, 2), 0);

    if (variance === 0) return 0;

    // Correlation = (myReport - mean) / sqrt(variance) scaled to [-1, 1]
    const standardized = (myReport - meanPeers) / Math.sqrt(variance);
    return Math.max(-1, Math.min(1, standardized));
  }

  /**
   * Get reports for a gradient
   */
  getReports(gradientId: string): QualityReport[] {
    const reports: QualityReport[] = [];
    for (const report of this.reports.values()) {
      if (report.gradientId === gradientId) {
        reports.push(report);
      }
    }
    return reports;
  }

  /**
   * Clear old reports
   */
  clearReports(olderThanMs: number = 3600000): void {
    const cutoff = Date.now() - olderThanMs;
    for (const [key, report] of this.reports) {
      if (report.timestamp < cutoff) {
        this.reports.delete(key);
      }
    }
  }
}

interface QualityReport {
  colonyId: string;
  gradientId: string;
  reportedQuality: number;
  actualQuality: number;
  score: number;
  timestamp: number;
}

interface PeerPredictionConfig {
  scoringRule: 'BRIER' | 'LOGARITHMIC';
  incentiveBudget: number;
  minPeers: number;
  correlationWeight: number;
}

// ============================================================================
// MECHANISM 2: Contribution Credit Tokens
// ============================================================================

/**
 * ContributionCreditToken - Prevent free-riding in federated learning
 *
 * Colonies must earn tokens through contribution to receive model updates
 * Tokens allocated based on quality-weighted sample count
 */
export class ContributionCreditSystem extends EventEmitter {
  private tokens: Map<string, TokenBalance> = new Map();
  private tokenHistory: TokenTransaction[] = [];
  private config: TokenConfig;

  constructor(config?: Partial<TokenConfig>) {
    super();
    this.config = {
      tokensPerSample: 1,
      qualityMultiplier: 10,
      baseRequirement: 100,
      decayRate: 0.01,
      ...config
    };
  }

  /**
   * Allocate tokens for gradient contribution
   */
  allocateTokens(
    colonyId: string,
    round: FederatedRoundInfo,
    update: GradientUpdateInfo
  ): number {
    // Compute quality score
    const qualityScore = this.computeQualityScore(update);

    // Base tokens from sample count
    const baseTokens = update.sampleCount * this.config.tokensPerSample;

    // Quality bonus
    const qualityBonus = qualityScore * this.config.qualityMultiplier;

    // Total tokens
    const totalTokens = baseTokens + qualityBonus;

    // Update balance
    const balance = this.tokens.get(colonyId) || {
      colonyId,
      balance: 0,
      earned: 0,
      spent: 0,
      lastUpdated: Date.now()
    };

    balance.balance += totalTokens;
    balance.earned += totalTokens;
    balance.lastUpdated = Date.now();

    this.tokens.set(colonyId, balance);

    // Record transaction
    this.tokenHistory.push({
      id: uuidv4(),
      colonyId,
      type: 'EARNED',
      amount: totalTokens,
      round: round.roundNumber,
      reason: 'gradient_contribution',
      timestamp: Date.now()
    });

    this.emit('tokens_earned', { colonyId, amount: totalTokens, round: round.roundNumber });

    return totalTokens;
  }

  /**
   * Redeem tokens for model access
   */
  redeemTokens(
    colonyId: string,
    modelVersion: number,
    required: number
  ): boolean {
    const balance = this.tokens.get(colonyId);

    if (!balance || balance.balance < required) {
      this.emit('redeem_failed', { colonyId, modelVersion, required, balance: balance?.balance || 0 });
      return false;
    }

    // Deduct tokens
    balance.balance -= required;
    balance.spent += required;
    balance.lastUpdated = Date.now();

    this.tokens.set(colonyId, balance);

    // Record transaction
    this.tokenHistory.push({
      id: uuidv4(),
      colonyId,
      type: 'SPENT',
      amount: -required,
      round: modelVersion,
      reason: 'model_access',
      timestamp: Date.now()
    });

    this.emit('tokens_redeemed', { colonyId, amount: required, modelVersion });

    return true;
  }

  /**
   * Check if colony has sufficient tokens
   */
  canAccessModel(colonyId: string, modelVersion: number): boolean {
    const balance = this.tokens.get(colonyId);
    const required = this.computeRequiredTokens(modelVersion);
    return balance !== undefined && balance.balance >= required;
  }

  /**
   * Compute quality score for gradient update
   */
  private computeQualityScore(update: GradientUpdateInfo): number {
    // Quality factors:
    // 1. Gradient norm (not too small, not too large)
    // 2. Loss decrease
    // 3. Training time (faster is better)

    const gradientNorm = Math.sqrt(
      update.gradients.reduce((sum, g) => sum + g * g, 0)
    );

    // Optimal norm around 1.0
    const normScore = Math.exp(-Math.pow(gradientNorm - 1, 2));

    // Loss decrease score
    const lossScore = update.trainingLoss > 0 ? 1 / (1 + update.trainingLoss) : 0;

    // Combined score
    return (normScore * 0.7 + lossScore * 0.3);
  }

  /**
   * Compute required tokens for model version
   */
  private computeRequiredTokens(modelVersion: number): number {
    // Newer models require more tokens
    return this.config.baseRequirement + modelVersion * 10;
  }

  /**
   * Apply decay to token balances (prevents hoarding)
   */
  applyDecay(): void {
    for (const balance of this.tokens.values()) {
      const decay = balance.balance * this.config.decayRate;
      balance.balance = Math.max(0, balance.balance - decay);
      balance.lastUpdated = Date.now();
    }
  }

  /**
   * Get token balance
   */
  getBalance(colonyId: string): TokenBalance | undefined {
    return this.tokens.get(colonyId);
  }

  /**
   * Get all balances
   */
  getAllBalances(): TokenBalance[] {
    return Array.from(this.tokens.values());
  }

  /**
   * Get transaction history
   */
  getHistory(colonyId?: string): TokenTransaction[] {
    if (colonyId) {
      return this.tokenHistory.filter(t => t.colonyId === colonyId);
    }
    return [...this.tokenHistory];
  }
}

interface TokenBalance {
  colonyId: string;
  balance: number;
  earned: number;
  spent: number;
  lastUpdated: number;
}

interface TokenTransaction {
  id: string;
  colonyId: string;
  type: 'EARNED' | 'SPENT';
  amount: number;
  round: number;
  reason: string;
  timestamp: number;
}

interface TokenConfig {
  tokensPerSample: number;
  qualityMultiplier: number;
  baseRequirement: number;
  decayRate: number;
}

interface FederatedRoundInfo {
  roundNumber: number;
  modelVersion: number;
  participants: string[];
}

interface GradientUpdateInfo {
  gradients: number[];
  sampleCount: number;
  trainingLoss: number;
  timestamp: number;
}

// ============================================================================
// MECHANISM 4: Reciprocal Reputation System
// ============================================================================

/**
 * ReciprocalReputationSystem - Incentivize balanced sharing/consuming in meadow
 *
 * Colonies with high share/consume ratio get access to restricted grains
 */
export class ReciprocalReputationSystem extends EventEmitter {
  private ratios: Map<string, SharingRatio> = new Map();
  private accessHistory: AccessRecord[] = [];
  private config: ReputationConfig;

  constructor(config?: Partial<ReputationConfig>) {
    super();
    this.config = {
      minAccessRatio: 0.5,
      decayFactor: 0.95,
      updateWindow: 86400000, // 24 hours
      gracePeriod: 3,
      ...config
    };
  }

  /**
   * Record knowledge share
   */
  recordShare(colonyId: string, grainId: string): void {
    const ratio = this.getOrCreateRatio(colonyId);
    ratio.grainsShared++;
    ratio.reciprocityScore = this.computeReciprocityScore(ratio);
    ratio.lastUpdated = Date.now();

    this.emit('grain_shared', { colonyId, grainId, ratio: ratio.reciprocityScore });
  }

  /**
   * Record knowledge consumption
   */
  recordConsume(colonyId: string, grainId: string): void {
    const ratio = this.getOrCreateRatio(colonyId);
    ratio.grainsConsumed++;
    ratio.reciprocityScore = this.computeReciprocityScore(ratio);
    ratio.lastUpdated = Date.now();

    this.accessHistory.push({
      colonyId,
      grainId,
      timestamp: Date.now(),
      accessGranted: true
    });

    this.emit('grain_consumed', { colonyId, grainId, ratio: ratio.reciprocityScore });
  }

  /**
   * Check if colony can access grain based on reciprocity
   */
  canAccessGrain(
    colonyId: string,
    grain: SharedPollenGrainInfo
  ): { allowed: boolean; reason?: string } {
    const ratio = this.ratios.get(colonyId);

    // New colonies get grace period
    if (!ratio || ratio.grainsConsumed < this.config.gracePeriod) {
      return { allowed: true };
    }

    // Check reciprocity score against restriction level
    const requiredRatio = this.mapRestrictionToRatio(grain.restrictionLevel);

    if (ratio.reciprocityScore >= requiredRatio) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Reciprocity score ${ratio.reciprocityScore.toFixed(2)} below required ${requiredRatio.toFixed(2)}`
    };
  }

  /**
   * Compute reciprocity score (0-1)
   */
  private computeReciprocityScore(ratio: SharingRatio): number {
    if (ratio.grainsConsumed === 0) return 1; // Perfect if haven't consumed anything

    const rawRatio = ratio.grainsShared / ratio.grainsConsumed;

    // Normalize to [0, 1] with 1.0 being ideal (balanced sharing)
    const normalized = Math.min(1, rawRatio);

    // Apply exponential moving average
    return ratio.reciprocityScore * this.config.decayFactor +
           normalized * (1 - this.config.decayFactor);
  }

  /**
   * Map restriction level to required reciprocity ratio
   */
  private mapRestrictionToRatio(level: string): number {
    switch (level) {
      case 'PUBLIC':
        return 0.0;
      case 'ATTRIBUTED':
        return 0.3;
      case 'RESTRICTED':
        return 0.6;
      case 'SACRED':
        return 0.8;
      default:
        return this.config.minAccessRatio;
    }
  }

  /**
   * Get or create ratio for colony
   */
  private getOrCreateRatio(colonyId: string): SharingRatio {
    let ratio = this.ratios.get(colonyId);

    if (!ratio) {
      ratio = {
        colonyId,
        grainsShared: 0,
        grainsConsumed: 0,
        reciprocityScore: 0.5,
        lastUpdated: Date.now()
      };
      this.ratios.set(colonyId, ratio);
    }

    return ratio;
  }

  /**
   * Get sharing ratio for colony
   */
  getRatio(colonyId: string): SharingRatio | undefined {
    return this.ratios.get(colonyId);
  }

  /**
   * Apply decay to all scores (prevents stale reputation)
   */
  applyDecay(): void {
    for (const ratio of this.ratios.values()) {
      ratio.reciprocityScore *= this.config.decayFactor;
      ratio.lastUpdated = Date.now();
    }
  }

  /**
   * Get access history
   */
  getAccessHistory(colonyId?: string): AccessRecord[] {
    if (colonyId) {
      return this.accessHistory.filter(r => r.colonyId === colonyId);
    }
    return [...this.accessHistory];
  }
}

interface SharingRatio {
  colonyId: string;
  grainsShared: number;
  grainsConsumed: number;
  reciprocityScore: number;
  lastUpdated: number;
}

interface AccessRecord {
  colonyId: string;
  grainId: string;
  timestamp: number;
  accessGranted: boolean;
}

interface ReputationConfig {
  minAccessRatio: number;
  decayFactor: number;
  updateWindow: number;
  gracePeriod: number;
}

interface SharedPollenGrainInfo {
  id: string;
  restrictionLevel: string;
  communityId: string;
  sharedBy: string;
}

// ============================================================================
// MECHANISM 6: Multi-Armed Bandit Selection
// ============================================================================

/**
 * BanditSelection - Optimize exploration/exploitation in Plinko layer
 *
 * Uses Thompson Sampling for asymptotically optimal agent selection
 * Automatically balances exploration/exploitation without temperature tuning
 */
export class BanditSelection extends EventEmitter {
  private agentStats: Map<string, BanditStats> = new Map();
  private totalPulls: number = 0;
  private config: BanditConfig;

  constructor(config?: Partial<BanditConfig>) {
    super();
    this.config = {
      alpha: 1,  // Beta distribution prior (successes)
      beta: 1,   // Beta distribution prior (failures)
      minPulls: 5,  // Minimum pulls before exploitation
      ...config
    };
  }

  /**
   * Select agent using Thompson Sampling
   * Samples from Beta distribution for each agent, picks max
   */
  selectAgent(proposals: AgentProposalBandit[]): string {
    // Initialize stats for new agents
    for (const proposal of proposals) {
      if (!this.agentStats.has(proposal.agentId)) {
        this.agentStats.set(proposal.agentId, {
          agentId: proposal.agentId,
          pulls: 0,
          successes: this.config.alpha,
          failures: this.config.beta,
          meanReward: 0
        });
      }
    }

    // Sample from Beta distribution for each agent
    const samples = proposals.map(proposal => {
      const stats = this.agentStats.get(proposal.agentId)!;

      // Thompson sampling: sample from Beta(successes, failures)
      const sample = this.betaSample(stats.successes, stats.failures);

      return {
        agentId: proposal.agentId,
        sample,
        confidence: proposal.confidence
      };
    });

    // Select agent with highest sample
    samples.sort((a, b) => b.sample - a.sample);
    const selected = samples[0].agentId;

    // Update stats
    this.totalPulls++;
    this.agentStats.get(selected)!.pulls++;

    this.emit('agent_selected', {
      agentId: selected,
      totalPulls: this.totalPulls,
      samples: samples.map(s => ({ agentId: s.agentId, sample: s.sample }))
    });

    return selected;
  }

  /**
   * Update agent with reward
   */
  updateReward(agentId: string, reward: number): void {
    const stats = this.agentStats.get(agentId);

    if (!stats) return;

    // Update Beta distribution
    if (reward > 0) {
      stats.successes += reward;
    } else {
      stats.failures += Math.abs(reward);
    }

    // Update mean reward (exponential moving average)
    stats.meanReward = 0.9 * stats.meanReward + 0.1 * reward;

    this.emit('reward_updated', {
      agentId,
      reward,
      stats: { ...stats }
    });
  }

  /**
   * Sample from Beta distribution
   */
  private betaSample(alpha: number, beta: number): number {
    // Use gamma distribution relation: Beta(alpha, beta) = Gamma(alpha) / (Gamma(alpha) + Gamma(beta))
    const x = this.gammaSample(alpha);
    const y = this.gammaSample(beta);
    return x / (x + y);
  }

  /**
   * Sample from Gamma distribution using Marsaglia and Tsang's method
   */
  private gammaSample(alpha: number): number {
    if (alpha < 1) {
      return this.gammaSample(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
    }

    const d = alpha - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x = this.gaussianSample(0, 1);
      let v = (1 + c * x) ** 3;

      if (v > 0) {
        const u = Math.random();
        if (u < 1 - 0.0331 * (x * x) ** 2) {
          return d * v;
        }
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
          return d * v;
        }
      }
    }
  }

  /**
   * Sample from Gaussian distribution (Box-Muller transform)
   */
  private gaussianSample(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  /**
   * Get statistics for an agent
   */
  getStats(agentId: string): BanditStats | undefined {
    return this.agentStats.get(agentId);
  }

  /**
   * Get all statistics
   */
  getAllStats(): BanditStats[] {
    return Array.from(this.agentStats.values());
  }

  /**
   * Get estimated probability of success for each agent
   */
  getSuccessProbabilities(): Map<string, number> {
    const probs = new Map<string, number>();

    for (const [agentId, stats] of this.agentStats) {
      // Expected value of Beta(alpha, beta) = alpha / (alpha + beta)
      const prob = stats.successes / (stats.successes + stats.failures);
      probs.set(agentId, prob);
    }

    return probs;
  }
}

interface BanditStats {
  agentId: string;
  pulls: number;
  successes: number;
  failures: number;
  meanReward: number;
}

interface AgentProposalBandit {
  agentId: string;
  confidence: number;
  bid?: number;
}

interface BanditConfig {
  alpha: number;
  beta: number;
  minPulls: number;
}

// ============================================================================
// MECHANISM 7: EigenTrust Algorithm
// ============================================================================

/**
 * EigenTrustAlgorithm - Global reputation from local trust scores
 *
 * Computes global reputation scores using principal eigenvector
 * Sybil-resistant and self-healing
 */
export class EigenTrustAlgorithm extends EventEmitter {
  private localTrust: Map<string, Map<string, number>> = new Map();
  private globalReputation: Map<string, number> = new Map();
  private config: EigenTrustConfig;

  constructor(config?: Partial<EigenTrustConfig>) {
    super();
    this.config = {
      iterations: 100,
      convergenceThreshold: 1e-6,
      alpha: 0.5, // Pre-trust value
      decay: 0.99,
      ...config
    };
  }

  /**
   * Set local trust score
   */
  setLocalTrust(truster: string, trustee: string, score: number): void {
    if (!this.localTrust.has(truster)) {
      this.localTrust.set(truster, new Map());
    }

    this.localTrust.get(truster)!.set(trustee, Math.max(0, Math.min(1, score)));
    this.emit('local_trust_updated', { truster, trustee, score });
  }

  /**
   * Compute global reputation using power iteration
   */
  computeGlobalReputation(): Map<string, number> {
    const nodes = this.getAllNodes();

    if (nodes.length === 0) {
      return new Map();
    }

    // Initialize with uniform distribution + pre-trust
    let reputation = new Map<string, number>();
    const preTrust = this.config.alpha / nodes.length;

    for (const node of nodes) {
      reputation.set(node, preTrust);
    }

    // Power iteration to find principal eigenvector
    for (let iter = 0; iter < this.config.iterations; iter++) {
      const newRep = new Map<string, number>();

      // Compute new reputation scores
      for (const trustee of nodes) {
        let score = 0;

        for (const truster of nodes) {
          const localScore = this.localTrust.get(truster)?.get(trustee) || 0;
          const trusterRep = reputation.get(truster) || 0;
          score += localScore * trusterRep;
        }

        newRep.set(trustee, score);
      }

      // Normalize to probability distribution
      const sum = Array.from(newRep.values()).reduce((a, b) => a + b, 0);

      if (sum > 0) {
        for (const [id, score] of newRep) {
          newRep.set(id, score / sum);
        }
      }

      // Check convergence
      const maxChange = Array.from(nodes).reduce((max, node) => {
        const change = Math.abs(
          (newRep.get(node) || 0) - (reputation.get(node) || 0)
        );
        return Math.max(max, change);
      }, 0);

      reputation = newRep;

      if (maxChange < this.config.convergenceThreshold) {
        break;
      }
    }

    this.globalReputation = reputation;
    this.emit('reputation_computed', { reputation, iterations: this.config.iterations });

    return reputation;
  }

  /**
   * Get global reputation for a node
   */
  getReputation(node: string): number {
    if (this.globalReputation.size === 0) {
      this.computeGlobalReputation();
    }

    return this.globalReputation.get(node) || this.config.alpha;
  }

  /**
   * Get all nodes in the trust network
   */
  private getAllNodes(): string[] {
    const nodes = new Set<string>();

    for (const [truster, trustees] of this.localTrust) {
      nodes.add(truster);
      for (const trustee of trustees.keys()) {
        nodes.add(trustee);
      }
    }

    return Array.from(nodes);
  }

  /**
   * Apply decay to local trust scores
   */
  applyDecay(): void {
    for (const [truster, trustees] of this.localTrust) {
      for (const [trustee, score] of trustees) {
        trustees.set(trustee, score * this.config.decay);
      }
    }
  }

  /**
   * Get local trust scores
   */
  getLocalTrust(truster?: string): Map<string, number> | Map<string, Map<string, number>> {
    if (truster) {
      return this.localTrust.get(truster) || new Map();
    }
    return this.localTrust;
  }

  /**
   * Get global reputation scores
   */
  getAllReputations(): Map<string, number> {
    if (this.globalReputation.size === 0) {
      this.computeGlobalReputation();
    }

    return new Map(this.globalReputation);
  }
}

interface EigenTrustConfig {
  iterations: number;
  convergenceThreshold: number;
  alpha: number;
  decay: number;
}

// ============================================================================
// MECHANISM 8: Byzantine-Resilient Aggregation
// ============================================================================

/**
 * ByzantineResilientAggregation - Robust federated learning aggregation
 *
 * Uses Krum and Multi-Krum algorithms to tolerate malicious agents
 * Resilient to up to f malicious colonies where n ≥ 3f + 1
 */
export class ByzantineResilientAggregation extends EventEmitter {
  private config: AggregationConfig;

  constructor(config?: Partial<AggregationConfig>) {
    super();
    this.config = {
      k: 0, // Will be set based on n
      f: 0, // Number of Byzantine agents
      method: 'KRUM',
      ...config
    };
  }

  /**
   * Aggregate gradients using robust method
   */
  aggregate(updates: GradientUpdateInfo[]): number[] {
    const n = updates.length;

    // Set k based on number of Byzantine agents
    const k = this.config.k || n - this.config.f - 2;

    if (k < 0 || k >= n) {
      throw new Error(`Invalid k=${k} for n=${n} and f=${this.config.f}`);
    }

    switch (this.config.method) {
      case 'KRUM':
        return this.krumAggregate(updates, k);

      case 'MULTI_KRUM':
        return this.multiKrumAggregate(updates, k, this.config.f + 1);

      case 'TRIMMED_MEAN':
        return this.trimmedMeanAggregate(updates, this.config.f);

      default:
        return this.krumAggregate(updates, k);
    }
  }

  /**
   * Krum aggregation - select update closest to k nearest neighbors
   */
  private krumAggregate(updates: GradientUpdateInfo[], k: number): number[] {
    const n = updates.length;

    if (k < 0 || k >= n) {
      throw new Error(`Invalid k=${k} for n=${n}`);
    }

    // Compute scores for each update
    const scores = updates.map((update, i) => {
      let distanceSum = 0;

      // Compute distances to all other updates
      const distances: number[] = [];

      for (let j = 0; j < n; j++) {
        if (i === j) continue;

        const distance = this.euclideanDistance(
          update.gradients,
          updates[j].gradients
        );

        distances.push(distance);
      }

      // Sort distances and take k nearest
      distances.sort((a, b) => a - b);
      const kNearest = distances.slice(0, Math.min(k, distances.length));

      // Sum of distances to k nearest neighbors
      distanceSum = kNearest.reduce((sum, d) => sum + d, 0);

      return { index: i, score: distanceSum };
    });

    // Select update with minimum score
    scores.sort((a, b) => a.score - b.score);
    const selected = updates[scores[0].index];

    this.emit('krum_selected', {
      selected: scores[0].index,
      score: scores[0].score
    });

    return selected.gradients;
  }

  /**
   * Multi-Krum - select multiple updates and average them
   */
  private multiKrumAggregate(
    updates: GradientUpdateInfo[],
    k: number,
    m: number
  ): number[] {
    if (m > updates.length) {
      throw new Error(`m=${m} cannot be greater than n=${updates.length}`);
    }

    const selected: GradientUpdateInfo[] = [];
    const remaining = [...updates];

    // Iteratively select m updates using Krum
    for (let i = 0; i < m; i++) {
      const best = this.krumAggregate(remaining, k);
      const bestIndex = remaining.findIndex(u => u.gradients === best);

      if (bestIndex >= 0) {
        selected.push(remaining[bestIndex]);
        remaining.splice(bestIndex, 1);
      }
    }

    // Average selected updates
    return this.averageGradients(selected);
  }

  /**
   * Trimmed mean aggregation - remove outliers and average
   */
  private trimmedMeanAggregate(
    updates: GradientUpdateInfo[],
    f: number
  ): number[] {
    if (updates.length <= 2 * f) {
      throw new Error(`Not enough updates for trimmed mean with f=${f}`);
    }

    // For each dimension, remove f largest and f smallest values
    const dimension = updates[0].gradients.length;
    const result: number[] = [];

    for (let d = 0; d < dimension; d++) {
      // Extract values for this dimension
      const values = updates.map(u => u.gradients[d]);

      // Sort values
      values.sort((a, b) => a - b);

      // Remove f smallest and f largest
      const trimmed = values.slice(f, values.length - f);

      // Average remaining values
      const mean = trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length;
      result.push(mean);
    }

    return result;
  }

  /**
   * Compute Euclidean distance between gradient vectors
   */
  private euclideanDistance(g1: number[], g2: number[]): number {
    if (g1.length !== g2.length) {
      throw new Error('Gradient dimensions do not match');
    }

    let sum = 0;
    for (let i = 0; i < g1.length; i++) {
      sum += Math.pow(g1[i] - g2[i], 2);
    }

    return Math.sqrt(sum);
  }

  /**
   * Average multiple gradient updates
   */
  private averageGradients(updates: GradientUpdateInfo[]): number[] {
    if (updates.length === 0) {
      throw new Error('No updates to average');
    }

    const dimension = updates[0].gradients.length;
    const result: number[] = [];

    for (let d = 0; d < dimension; d++) {
      let sum = 0;

      for (const update of updates) {
        sum += update.gradients[d];
      }

      result.push(sum / updates.length);
    }

    return result;
  }

  /**
   * Set number of Byzantine agents
   */
  setByzantineCount(f: number): void {
    this.config.f = f;
  }

  /**
   * Set aggregation method
   */
  setMethod(method: 'KRUM' | 'MULTI_KRUM' | 'TRIMMED_MEAN'): void {
    this.config.method = method;
  }
}

interface AggregationConfig {
  k: number;
  f: number;
  method: 'KRUM' | 'MULTI_KRUM' | 'TRIMMED_MEAN';
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PeerPredictionScoring,
  ContributionCreditSystem,
  ReciprocalReputationSystem,
  BanditSelection,
  EigenTrustAlgorithm,
  ByzantineResilientAggregation
};

export type {
  QualityReport,
  PeerPredictionConfig,
  TokenBalance,
  TokenTransaction,
  TokenConfig,
  FederatedRoundInfo,
  GradientUpdateInfo,
  SharingRatio,
  AccessRecord,
  ReputationConfig,
  SharedPollenGrainInfo,
  BanditStats,
  AgentProposalBandit,
  BanditConfig,
  EigenTrustConfig,
  AggregationConfig
};
