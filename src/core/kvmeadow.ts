/**
 * POLLN KV-Cache Meadow Marketplace
 * Pattern-Organized Large Language Network
 *
 * A marketplace for trading KV-cache anchors in the Meadow ecosystem.
 * Enables agents to share, discover, and trade high-quality KV-anchors
 * across colonies while tracking value, reputation, and provenance.
 *
 * Key Features:
 * - AnchorMarket: Trading KV-anchors with value tracking
 * - AnchorPollen: Cross-pollination of anchors as pollen grains
 * - CommunityAnchorPool: Shared anchor pool with voting and curation
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { KVAnchor, KVCacheSegment, AnchorMatch } from './kvanchor.js';
import type { PollenGrain, EmbeddingVector } from './types.js';

// ============================================================================
// KV-Meadow Types
// ============================================================================

/**
 * Anchor listing in the marketplace
 */
export interface AnchorListing {
  id: string;
  anchorId: string;
  anchor: KVAnchor;

  // Marketplace metadata
  listedBy: string;           // Keeper/colony ID
  listedAt: number;
  price: number;              // Virtual currency or reputation points

  // Classification
  contextType: string;        // Type of context (e.g., "code", "conversation", "analysis")
  tags: string[];

  // Quality metrics
  qualityScore: number;       // 0-1
  relevanceScore: number;     // 0-1

  // Trading status
  isActive: boolean;
  tradeCount: number;
  totalEarnings: number;

  // Expiration
  expiresAt?: number;
}

/**
 * Request for anchors in the marketplace
 */
export interface AnchorRequest {
  id: string;
  requesterId: string;
  contextType: string;
  requirements: {
    minQualityScore?: number;
    layerIds?: number[];
    maxAge?: number;
    tags?: string[];
  };
  budget: number;
  status: 'open' | 'filled' | 'expired' | 'cancelled';
  createdAt: number;
  expiresAt: number;
  filledBy?: string;  // Listing ID that filled the request
}

/**
 * Anchor pollen grain for cross-pollination
 */
export interface AnchorPollen extends PollenGrain {
  // Anchor-specific data
  anchorId: string;
  anchor: KVAnchor;

  // Pollen metadata
  contextType: string;
  lineage: string[];          // Chain of anchor sources
  provenance: ProvenanceData;

  // Cross-pollination tracking
  crossPollinatedCount: number;
  lastCrossPollinated?: number;

  // Value tracking
  marketValue: number;

  createdFrom: string;        // Listing ID or request ID
  createdAt: number;
}

/**
 * Provenance tracking for anchors
 */
export interface ProvenanceData {
  originalCreator: string;
  sourceColony: string;
  sourceContextId?: string;
  modificationHistory: ProvenanceModification[];
  indigenousSources?: string[];
  fpicStatus?: 'granted' | 'conditional' | 'revoked' | 'exempt';
}

/**
 * Modification in provenance chain
 */
export interface ProvenanceModification {
  modifiedBy: string;
  modifiedAt: number;
  modificationType: 'compression' | 'fusion' | 'optimization' | 'customization';
  description: string;
}

/**
 * Vote for community anchor pool
 */
export interface AnchorVote {
  id: string;
  anchorId: string;
  voterId: string;
  vote: 'up' | 'down' | 'abstain';
  weight: number;
  reason?: string;
  votedAt: number;
}

/**
 * Community anchor entry
 */
export interface CommunityAnchor {
  anchorId: string;
  anchor: KVAnchor;

  // Community metrics
  totalVotes: number;
  netScore: number;           // sum of weighted votes
  qualityRating: number;      // 0-1 based on votes

  // Curation status
  status: 'pending' | 'approved' | 'retired' | 'deprecated';
  curatedBy?: string;         // Moderator/keeper who approved
  curatedAt?: number;

  // Retirement
  retirementReason?: string;
  retiredAt?: number;

  // Usage
  usageCount: number;
  lastUsed?: number;

  // Value
  communityValue: number;     // Value to the community
  rewardPool: number;         // Rewards distributed to contributors

  addedAt: number;
  updatedAt: number;
}

/**
 * Marketplace statistics
 */
export interface MarketplaceStats {
  totalListings: number;
  activeListings: number;
  totalRequests: number;
  openRequests: number;
  totalTrades: number;
  totalVolume: number;
  averagePrice: number;
  topContextTypes: Array<{ type: string; count: number }>;
}

/**
 * Community pool statistics
 */
export interface CommunityPoolStats {
  totalAnchors: number;
  approvedAnchors: number;
  pendingAnchors: number;
  retiredAnchors: number;
  totalVotes: number;
  averageQuality: number;
  totalUsageCount: number;
  totalRewardsDistributed: number;
}

// ============================================================================
// Anchor Market
// ============================================================================

/**
 * AnchorMarket - Marketplace for trading KV-anchors
 *
 * Agents can:
 * - List anchors for trade
 * - Request specific anchor types
 * - Buy/sell anchors with virtual currency
 * - Track reputation and earnings
 */
export class AnchorMarket extends EventEmitter {
  private listings: Map<string, AnchorListing> = new Map();
  private requests: Map<string, AnchorRequest> = new Map();
  private trades: Array<{
    id: string;
    listingId: string;
    requestId: string;
    buyerId: string;
    sellerId: string;
    price: number;
    timestamp: number;
  }> = [];

  // Reputation tracking
  private sellerReputation: Map<string, number> = new Map();
  private buyerReputation: Map<string, number> = new Map();

  // Configuration
  private config = {
    maxListingsPerSeller: 100,
    maxRequestsPerBuyer: 50,
    defaultExpirationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    minPrice: 1,
    maxPrice: 10000,
    commissionRate: 0.05, // 5% commission on trades
  };

  constructor() {
    super();
  }

  // ========================================================================
  // Listing Management
  // ========================================================================

  /**
   * List an anchor for trade
   */
  listAnchor(
    anchor: KVAnchor,
    sellerId: string,
    options: {
      contextType: string;
      tags?: string[];
      price?: number;
      expiresAt?: number;
    }
  ): AnchorListing {
    // Validate seller limits
    const sellerListings = this.getSellerListings(sellerId);
    if (sellerListings.length >= this.config.maxListingsPerSeller) {
      throw new Error('Maximum listings reached for seller');
    }

    // Validate price
    const price = options.price ?? this.calculateDefaultPrice(anchor);
    if (price < this.config.minPrice || price > this.config.maxPrice) {
      throw new Error(`Price must be between ${this.config.minPrice} and ${this.config.maxPrice}`);
    }

    const listing: AnchorListing = {
      id: uuidv4(),
      anchorId: anchor.anchorId,
      anchor,
      listedBy: sellerId,
      listedAt: Date.now(),
      price,
      contextType: options.contextType,
      tags: options.tags || [],
      qualityScore: anchor.qualityScore,
      relevanceScore: this.calculateRelevanceScore(anchor, options.contextType),
      isActive: true,
      tradeCount: 0,
      totalEarnings: 0,
      expiresAt: options.expiresAt ?? Date.now() + this.config.defaultExpirationMs,
    };

    this.listings.set(listing.id, listing);

    this.emit('anchor:listed', listing);
    return listing;
  }

  /**
   * Get listing by ID
   */
  getListing(listingId: string): AnchorListing | undefined {
    return this.listings.get(listingId);
  }

  /**
   * Get all active listings
   */
  getListings(filters?: {
    contextType?: string;
    sellerId?: string;
    minQuality?: number;
    maxPrice?: number;
    tags?: string[];
    activeOnly?: boolean;
  }): AnchorListing[] {
    let results = Array.from(this.listings.values());

    if (filters?.contextType) {
      results = results.filter(l => l.contextType === filters.contextType);
    }

    if (filters?.sellerId) {
      results = results.filter(l => l.listedBy === filters.sellerId);
    }

    if (filters?.minQuality) {
      results = results.filter(l => l.qualityScore >= filters.minQuality!);
    }

    if (filters?.maxPrice) {
      results = results.filter(l => l.price <= filters.maxPrice!);
    }

    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter(l =>
        filters.tags!.some(tag => l.tags.includes(tag))
      );
    }

    if (filters?.activeOnly) {
      results = results.filter(l => l.isActive && !this.isExpired(l));
    }

    return results.sort((a, b) => b.listedAt - a.listedAt);
  }

  /**
   * Search listings by query
   */
  searchListings(query: string, limit: number = 20): AnchorListing[] {
    const lowerQuery = query.toLowerCase();
    return this.getListings({ activeOnly: true })
      .filter(l =>
        l.contextType.toLowerCase().includes(lowerQuery) ||
        l.tags.some(t => t.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit);
  }

  /**
   * Cancel a listing
   */
  cancelListing(listingId: string, sellerId: string): boolean {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.listedBy !== sellerId) {
      throw new Error('Only seller can cancel their listing');
    }

    listing.isActive = false;

    this.emit('listing:cancelled', listing);
    return true;
  }

  // ========================================================================
  // Request Management
  // ========================================================================

  /**
   * Create a request for anchors
   */
  createRequest(
    requesterId: string,
    contextType: string,
    requirements: AnchorRequest['requirements'],
    budget: number,
    durationMs?: number
  ): AnchorRequest {
    // Validate buyer limits
    const buyerRequests = this.getBuyerRequests(requesterId);
    if (buyerRequests.length >= this.config.maxRequestsPerBuyer) {
      throw new Error('Maximum requests reached for buyer');
    }

    const request: AnchorRequest = {
      id: uuidv4(),
      requesterId,
      contextType,
      requirements,
      budget,
      status: 'open',
      createdAt: Date.now(),
      expiresAt: Date.now() + (durationMs ?? this.config.defaultExpirationMs),
    };

    this.requests.set(request.id, request);

    this.emit('request:created', request);
    return request;
  }

  /**
   * Get request by ID
   */
  getRequest(requestId: string): AnchorRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Get all open requests
   */
  getOpenRequests(filters?: {
    contextType?: string;
    requesterId?: string;
    minBudget?: number;
  }): AnchorRequest[] {
    let results = Array.from(this.requests.values())
      .filter(r => r.status === 'open' && !this.isRequestExpired(r));

    if (filters?.contextType) {
      results = results.filter(r => r.contextType === filters.contextType);
    }

    if (filters?.requesterId) {
      results = results.filter(r => r.requesterId === filters.requesterId);
    }

    if (filters?.minBudget) {
      results = results.filter(r => r.budget >= filters.minBudget!);
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Fill a request with a listing
   */
  fillRequest(requestId: string, listingId: string, buyerId: string): {
    success: boolean;
    tradeId?: string;
    reason?: string;
  } {
    const request = this.requests.get(requestId);
    const listing = this.listings.get(listingId);

    if (!request) {
      return { success: false, reason: 'Request not found' };
    }

    if (!listing) {
      return { success: false, reason: 'Listing not found' };
    }

    if (request.status !== 'open') {
      return { success: false, reason: 'Request not open' };
    }

    if (!listing.isActive) {
      return { success: false, reason: 'Listing not active' };
    }

    if (this.isRequestExpired(request)) {
      request.status = 'expired';
      return { success: false, reason: 'Request expired' };
    }

    if (this.isExpired(listing)) {
      listing.isActive = false;
      return { success: false, reason: 'Listing expired' };
    }

    // Check requirements
    if (request.requirements.minQualityScore && listing.qualityScore < request.requirements.minQualityScore) {
      return { success: false, reason: 'Quality score below requirement' };
    }

    if (request.requirements.layerIds && !request.requirements.layerIds.includes(listing.anchor.layerId)) {
      return { success: false, reason: 'Layer not in required list' };
    }

    if (listing.price > request.budget) {
      return { success: false, reason: 'Price exceeds budget' };
    }

    // Execute trade
    const trade = this.executeTrade(listingId, requestId, buyerId);

    request.status = 'filled';
    request.filledBy = listingId;

    return { success: true, tradeId: trade.id };
  }

  /**
   * Cancel a request
   */
  cancelRequest(requestId: string, requesterId: string): boolean {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.requesterId !== requesterId) {
      throw new Error('Only requester can cancel their request');
    }

    request.status = 'cancelled';

    this.emit('request:cancelled', request);
    return true;
  }

  // ========================================================================
  // Trading
  // ========================================================================

  /**
   * Execute a trade between buyer and seller
   */
  private executeTrade(
    listingId: string,
    requestId: string,
    buyerId: string
  ): { id: string; listingId: string; requestId: string; buyerId: string; sellerId: string; price: number; timestamp: number } {
    const listing = this.listings.get(listingId)!;
    const request = this.requests.get(requestId)!;

    // Calculate price with commission
    const commission = listing.price * this.config.commissionRate;
    const sellerEarnings = listing.price - commission;

    // Create trade record
    const trade = {
      id: uuidv4(),
      listingId,
      requestId,
      buyerId,
      sellerId: listing.listedBy,
      price: listing.price,
      timestamp: Date.now(),
    };

    this.trades.push(trade);

    // Update listing
    listing.tradeCount++;
    listing.totalEarnings += sellerEarnings;

    // Update reputation
    this.updateReputation(listing.listedBy, sellerEarnings, 'seller');
    this.updateReputation(buyerId, listing.price, 'buyer');

    this.emit('trade:executed', trade);
    return trade;
  }

  /**
   * Get trade history
   */
  getTradeHistory(filters?: {
    buyerId?: string;
    sellerId?: string;
    listingId?: string;
    limit?: number;
  }): Array<{
    id: string;
    listingId: string;
    requestId: string;
    buyerId: string;
    sellerId: string;
    price: number;
    timestamp: number;
  }> {
    let results = [...this.trades];

    if (filters?.buyerId) {
      results = results.filter(t => t.buyerId === filters.buyerId);
    }

    if (filters?.sellerId) {
      results = results.filter(t => t.sellerId === filters.sellerId);
    }

    if (filters?.listingId) {
      results = results.filter(t => t.listingId === filters.listingId);
    }

    results.sort((a, b) => b.timestamp - a.timestamp);

    return filters?.limit ? results.slice(0, filters.limit) : results;
  }

  // ========================================================================
  // Reputation
  // ========================================================================

  /**
   * Get reputation score for an agent
   */
  getReputation(agentId: string, role: 'seller' | 'buyer'): number {
    const reputation = role === 'seller'
      ? this.sellerReputation.get(agentId)
      : this.buyerReputation.get(agentId);

    return reputation ?? 0.5; // Default neutral reputation
  }

  /**
   * Update reputation based on trade
   */
  private updateReputation(agentId: string, amount: number, role: 'seller' | 'buyer'): void {
    const reputationMap = role === 'seller' ? this.sellerReputation : this.buyerReputation;
    const current = reputationMap.get(agentId) ?? 0.5;

    // Exponential moving average
    const alpha = 0.1;
    const normalizedAmount = amount / 1000; // Normalize to 0-1 range
    const updated = current + alpha * (normalizedAmount - current);

    reputationMap.set(agentId, Math.max(0, Math.min(1, updated)));
  }

  // ========================================================================
  // Statistics
  // ========================================================================

  /**
   * Get marketplace statistics
   */
  getStats(): MarketplaceStats {
    const activeListings = this.getListings({ activeOnly: true });
    const openRequests = this.getOpenRequests();

    const contextTypeCounts = new Map<string, number>();
    for (const listing of this.listings.values()) {
      if (listing.isActive) {
        contextTypeCounts.set(
          listing.contextType,
          (contextTypeCounts.get(listing.contextType) || 0) + 1
        );
      }
    }

    const topContextTypes = Array.from(contextTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalVolume = this.trades.reduce((sum, t) => sum + t.price, 0);
    const averagePrice = this.trades.length > 0 ? totalVolume / this.trades.length : 0;

    return {
      totalListings: this.listings.size,
      activeListings: activeListings.length,
      totalRequests: this.requests.size,
      openRequests: openRequests.length,
      totalTrades: this.trades.length,
      totalVolume,
      averagePrice,
      topContextTypes,
    };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private getSellerListings(sellerId: string): AnchorListing[] {
    return this.getListings({ sellerId, activeOnly: false });
  }

  private getBuyerRequests(requesterId: string): AnchorRequest[] {
    return this.getOpenRequests({ requesterId });
  }

  private isExpired(listing: AnchorListing): boolean {
    return listing.expiresAt ? listing.expiresAt < Date.now() : false;
  }

  private isRequestExpired(request: AnchorRequest): boolean {
    return request.expiresAt < Date.now();
  }

  private calculateDefaultPrice(anchor: KVAnchor): number {
    // Base price on quality and usage
    const qualityMultiplier = anchor.qualityScore * 100;
    const usageBonus = Math.min(anchor.usageCount * 10, 500);
    return Math.floor(qualityMultiplier + usageBonus);
  }

  private calculateRelevanceScore(anchor: KVAnchor, contextType: string): number {
    // Simple relevance calculation - in production would be more sophisticated
    return anchor.qualityScore;
  }

  /**
   * Clean up expired listings and requests
   */
  cleanup(): number {
    let cleaned = 0;

    for (const listing of this.listings.values()) {
      if (this.isExpired(listing) && listing.isActive) {
        listing.isActive = false;
        cleaned++;
      }
    }

    for (const request of this.requests.values()) {
      if (this.isRequestExpired(request) && request.status === 'open') {
        request.status = 'expired';
        cleaned++;
      }
    }

    return cleaned;
  }
}

// ============================================================================
// Anchor Pollen
// ============================================================================

/**
 * AnchorPollen - Anchor exchange as pollen grains
 *
 * Converts anchors to shareable pollen format for cross-pollination
 * between keepers. Tracks lineage and provenance.
 */
export class AnchorPollenManager extends EventEmitter {
  private pollenGrains: Map<string, AnchorPollen> = new Map();

  // Indexes
  private pollenByContextType: Map<string, Set<string>> = new Map();
  private pollenByCreator: Map<string, Set<string>> = new Map();

  /**
   * Convert an anchor to a pollen grain for sharing
   */
  anchorToPollen(
    anchor: KVAnchor,
    source: string,
    options: {
      contextType: string;
      tags?: string[];
      provenance: Omit<ProvenanceData, 'modificationHistory'>;
    }
  ): AnchorPollen {
    const pollenId = uuidv4();
    const now = Date.now();

    const pollen: AnchorPollen = {
      id: pollenId,
      gardenerId: options.provenance.originalCreator,
      embedding: anchor.embedding,
      metadata: {
        dimension: anchor.embedding.length,
        sourceLogCount: 1,
        sourceLogIds: [anchor.anchorId],
        agentTypes: [options.contextType],
        graphSnapshot: undefined,
        usageCount: anchor.usageCount,
        successRate: anchor.qualityScore,
        lastUsed: anchor.lastUsed,
        isPrivate: false,
      },
      createdAt: now,
      updatedAt: now,

      // Anchor-specific
      anchorId: anchor.anchorId,
      anchor,
      contextType: options.contextType,
      lineage: [options.provenance.originalCreator],
      provenance: {
        ...options.provenance,
        modificationHistory: [],
      },
      crossPollinatedCount: 0,
      marketValue: this.calculateMarketValue(anchor),
      createdFrom: source,
    };

    this.pollenGrains.set(pollenId, pollen);

    // Update indexes
    this.updateIndexes(pollen);

    this.emit('pollen:created', pollen);
    return pollen;
  }

  /**
   * Convert pollen back to anchor
   */
  pollenToAnchor(pollenId: string): KVAnchor | undefined {
    const pollen = this.pollenGrains.get(pollenId);
    return pollen?.anchor;
  }

  /**
   * Cross-pollinate an anchor to another keeper
   */
  crossPollinate(
    pollenId: string,
    targetKeeperId: string,
    modifications?: Omit<ProvenanceModification, 'modifiedBy' | 'modifiedAt'>
  ): AnchorPollen {
    const originalPollen = this.pollenGrains.get(pollenId);
    if (!originalPollen) {
      throw new Error('Pollen grain not found');
    }

    // Create new pollen grain for target
    const newPollenId = uuidv4();
    const now = Date.now();

    const newPollen: AnchorPollen = {
      ...originalPollen,
      id: newPollenId,
      gardenerId: targetKeeperId,
      createdAt: now,
      updatedAt: now,

      // Update lineage
      lineage: [...originalPollen.lineage, targetKeeperId],

      // Add modification history
      provenance: {
        ...originalPollen.provenance,
        modificationHistory: [
          ...originalPollen.provenance.modificationHistory,
          ...(modifications ? [{
            ...modifications,
            modifiedBy: targetKeeperId,
            modifiedAt: now,
          }] : []),
        ],
      },

      // Update cross-pollination tracking
      crossPollinatedCount: originalPollen.crossPollinatedCount + 1,
      lastCrossPollinated: now,

      // Reset usage for new owner
      metadata: {
        ...originalPollen.metadata,
        usageCount: 0,
      },
    };

    this.pollenGrains.set(newPollenId, newPollen);
    this.updateIndexes(newPollen);

    // Update original pollen cross-pollination count
    originalPollen.crossPollinatedCount++;
    originalPollen.lastCrossPollinated = now;

    this.emit('pollen:cross_pollinated', {
      originalPollenId: pollenId,
      newPollenId,
      targetKeeperId,
    });

    return newPollen;
  }

  /**
   * Get pollen grain by ID
   */
  getPollen(pollenId: string): AnchorPollen | undefined {
    return this.pollenGrains.get(pollenId);
  }

  /**
   * Get pollen by context type
   */
  getPollenByContextType(contextType: string): AnchorPollen[] {
    const pollenIds = this.pollenByContextType.get(contextType);
    if (!pollenIds) return [];

    return Array.from(pollenIds)
      .map(id => this.pollenGrains.get(id))
      .filter((p): p is AnchorPollen => p !== undefined);
  }

  /**
   * Get pollen by creator
   */
  getPollenByCreator(creatorId: string): AnchorPollen[] {
    const pollenIds = this.pollenByCreator.get(creatorId);
    if (!pollenIds) return [];

    return Array.from(pollenIds)
      .map(id => this.pollenGrains.get(id))
      .filter((p): p is AnchorPollen => p !== undefined);
  }

  /**
   * Track pollen lineage
   */
  getLineage(pollenId: string): Array<{
    pollenId: string;
    keeperId: string;
    timestamp: number;
  }> {
    const pollen = this.pollenGrains.get(pollenId);
    if (!pollen) return [];

    // In production, this would track the full lineage tree
    return pollen.lineage.map((keeperId, index) => ({
      pollenId: index === 0 ? pollenId : `${pollenId}-${index}`,
      keeperId,
      timestamp: pollen.createdAt + index * 1000, // Simplified
    }));
  }

  /**
   * Get provenance for pollen
   */
  getProvenance(pollenId: string): ProvenanceData | undefined {
    const pollen = this.pollenGrains.get(pollenId);
    return pollen?.provenance;
  }

  /**
   * Update pollen metadata
   */
  updatePollen(
    pollenId: string,
    updates: Partial<AnchorPollen>
  ): AnchorPollen {
    const pollen = this.pollenGrains.get(pollenId);
    if (!pollen) {
      throw new Error('Pollen grain not found');
    }

    Object.assign(pollen, updates, { updatedAt: Date.now() });

    this.emit('pollen:updated', pollen);
    return pollen;
  }

  /**
   * Search pollen by tags or context type
   */
  searchPollen(query: {
    contextType?: string;
    tags?: string[];
    minMarketValue?: number;
    maxCrossPollinations?: number;
  }): AnchorPollen[] {
    let results = Array.from(this.pollenGrains.values());

    if (query.contextType) {
      results = results.filter(p => p.contextType === query.contextType);
    }

    if (query.minMarketValue) {
      results = results.filter(p => p.marketValue >= query.minMarketValue!);
    }

    if (query.maxCrossPollinations) {
      results = results.filter(p => p.crossPollinatedCount <= query.maxCrossPollinations!);
    }

    return results.sort((a, b) => b.marketValue - a.marketValue);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalPollenGrains: number;
    totalCrossPollinations: number;
    averageMarketValue: number;
    topContextTypes: Array<{ type: string; count: number }>;
  } {
    const totalCrossPollinations = Array.from(this.pollenGrains.values())
      .reduce((sum, p) => sum + p.crossPollinatedCount, 0);

    const totalMarketValue = Array.from(this.pollenGrains.values())
      .reduce((sum, p) => sum + p.marketValue, 0);

    const contextTypeCounts = new Map<string, number>();
    for (const pollen of this.pollenGrains.values()) {
      contextTypeCounts.set(
        pollen.contextType,
        (contextTypeCounts.get(pollen.contextType) || 0) + 1
      );
    }

    const topContextTypes = Array.from(contextTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalPollenGrains: this.pollenGrains.size,
      totalCrossPollinations,
      averageMarketValue: this.pollenGrains.size > 0 ? totalMarketValue / this.pollenGrains.size : 0,
      topContextTypes,
    };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private updateIndexes(pollen: AnchorPollen): void {
    // Context type index
    if (!this.pollenByContextType.has(pollen.contextType)) {
      this.pollenByContextType.set(pollen.contextType, new Set());
    }
    this.pollenByContextType.get(pollen.contextType)!.add(pollen.id);

    // Creator index
    if (!this.pollenByCreator.has(pollen.gardenerId)) {
      this.pollenByCreator.set(pollen.gardenerId, new Set());
    }
    this.pollenByCreator.get(pollen.gardenerId)!.add(pollen.id);
  }

  private calculateMarketValue(anchor: KVAnchor): number {
    // Market value based on quality and usage
    return Math.floor(anchor.qualityScore * 1000 + anchor.usageCount * 50);
  }
}

// ============================================================================
// Community Anchor Pool
// ============================================================================

/**
 * CommunityAnchorPool - Shared anchor pool for the meadow
 *
 * Community-curated high-value anchors with:
 * - Voting on anchor quality
 * - Approval workflow
 * - Anchor retirement/refresh
 * - Reward distribution
 */
export class CommunityAnchorPool extends EventEmitter {
  private anchors: Map<string, CommunityAnchor> = new Map();
  private votes: Map<string, AnchorVote[]> = new Map(); // anchorId -> votes

  // Configuration
  private config = {
    approvalThreshold: 0.6,     // Net score / total votes needed for approval
    retirementThreshold: 0.3,   // Below this, anchors get flagged for review
    minVotesForApproval: 3,     // Minimum votes before considering approval
    voteWeightBase: 1.0,        // Base weight for votes
    rewardPoolPercentage: 0.1,  // 10% of value goes to reward pool
  };

  constructor() {
    super();
  }

  // ========================================================================
  // Anchor Management
  // ========================================================================

  /**
   * Submit an anchor to the community pool
   */
  submitAnchor(
    anchor: KVAnchor,
    submittedBy: string,
    contextType: string
  ): CommunityAnchor {
    const communityAnchor: CommunityAnchor = {
      anchorId: anchor.anchorId,
      anchor,
      totalVotes: 0,
      netScore: 0,
      qualityRating: anchor.qualityScore,
      status: 'pending',
      usageCount: 0,
      communityValue: this.calculateInitialCommunityValue(anchor),
      rewardPool: 0,
      addedAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.anchors.set(anchor.anchorId, communityAnchor);
    this.votes.set(anchor.anchorId, []);

    this.emit('anchor:submitted', communityAnchor);
    return communityAnchor;
  }

  /**
   * Get community anchor by ID
   */
  getAnchor(anchorId: string): CommunityAnchor | undefined {
    return this.anchors.get(anchorId);
  }

  /**
   * Get all anchors with optional filters
   */
  getAnchors(filters?: {
    status?: CommunityAnchor['status'];
    curatedBy?: string;
    minQuality?: number;
    limit?: number;
  }): CommunityAnchor[] {
    let results = Array.from(this.anchors.values());

    if (filters?.status) {
      results = results.filter(a => a.status === filters.status);
    }

    if (filters?.curatedBy) {
      results = results.filter(a => a.curatedBy === filters.curatedBy);
    }

    if (filters?.minQuality) {
      results = results.filter(a => a.qualityRating >= filters.minQuality!);
    }

    // Sort by quality rating and community value
    results.sort((a, b) => {
      const scoreA = a.qualityRating * a.communityValue;
      const scoreB = b.qualityRating * b.communityValue;
      return scoreB - scoreA;
    });

    return filters?.limit ? results.slice(0, filters.limit) : results;
  }

  /**
   * Get approved anchors for use
   */
  getApprovedAnchors(limit?: number): CommunityAnchor[] {
    return this.getAnchors({
      status: 'approved',
      minQuality: 0.7,
      limit,
    });
  }

  /**
   * Approve a pending anchor
   */
  approveAnchor(anchorId: string, curatedBy: string): CommunityAnchor {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) {
      throw new Error('Anchor not found');
    }

    if (anchor.status !== 'pending') {
      throw new Error('Only pending anchors can be approved');
    }

    anchor.status = 'approved';
    anchor.curatedBy = curatedBy;
    anchor.curatedAt = Date.now();
    anchor.updatedAt = Date.now();

    this.emit('anchor:approved', anchor);
    return anchor;
  }

  /**
   * Retire an anchor
   */
  retireAnchor(anchorId: string, reason: string, retiredBy: string): CommunityAnchor {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) {
      throw new Error('Anchor not found');
    }

    anchor.status = 'retired';
    anchor.retirementReason = reason;
    anchor.retiredAt = Date.now();
    anchor.updatedAt = Date.now();

    this.emit('anchor:retired', anchor);
    return anchor;
  }

  /**
   * Deprecate an anchor (soft retirement)
   */
  deprecateAnchor(anchorId: string, reason: string): CommunityAnchor {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) {
      throw new Error('Anchor not found');
    }

    anchor.status = 'deprecated';
    anchor.updatedAt = Date.now();

    this.emit('anchor:deprecated', { anchor, reason });
    return anchor;
  }

  /**
   * Refresh an anchor (update with new data)
   */
  refreshAnchor(anchorId: string, newAnchor: KVAnchor): CommunityAnchor {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) {
      throw new Error('Anchor not found');
    }

    anchor.anchor = newAnchor;
    anchor.qualityRating = newAnchor.qualityScore;
    anchor.updatedAt = Date.now();

    // Reset status to pending if it was deprecated
    if (anchor.status === 'deprecated') {
      anchor.status = 'pending';
    }

    this.emit('anchor:refreshed', anchor);
    return anchor;
  }

  // ========================================================================
  // Voting
  // ========================================================================

  /**
   * Vote on an anchor
   */
  vote(
    anchorId: string,
    voterId: string,
    vote: 'up' | 'down' | 'abstain',
    reason?: string
  ): AnchorVote {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) {
      throw new Error('Anchor not found');
    }

    // Check if already voted
    const votes = this.votes.get(anchorId) || [];
    const existingVote = votes.find(v => v.voterId === voterId);

    if (existingVote) {
      // Update existing vote
      existingVote.vote = vote;
      existingVote.reason = reason;
      existingVote.votedAt = Date.now();
    } else {
      // Create new vote
      const newVote: AnchorVote = {
        id: uuidv4(),
        anchorId,
        voterId,
        vote,
        weight: this.calculateVoteWeight(voterId, anchor),
        reason,
        votedAt: Date.now(),
      };

      votes.push(newVote);
      this.votes.set(anchorId, votes);
    }

    // Recalculate anchor scores
    this.recalculateScores(anchorId);

    // Check if anchor should be auto-approved
    this.checkAutoApproval(anchorId);

    this.emit('vote:cast', { anchorId, voterId, vote });
    return votes.find(v => v.voterId === voterId)!;
  }

  /**
   * Get votes for an anchor
   */
  getVotes(anchorId: string): AnchorVote[] {
    return this.votes.get(anchorId) || [];
  }

  /**
   * Get vote summary for an anchor
   */
  getVoteSummary(anchorId: string): {
    total: number;
    up: number;
    down: number;
    abstain: number;
    netScore: number;
    approvalRating: number;
  } {
    const votes = this.votes.get(anchorId) || [];

    let up = 0;
    let down = 0;
    let abstain = 0;
    let weightedNet = 0;

    for (const vote of votes) {
      switch (vote.vote) {
        case 'up':
          up++;
          weightedNet += vote.weight;
          break;
        case 'down':
          down++;
          weightedNet -= vote.weight;
          break;
        case 'abstain':
          abstain++;
          break;
      }
    }

    const total = votes.length;
    const approvalRating = total > 0 ? weightedNet / total : 0;

    return {
      total,
      up,
      down,
      abstain,
      netScore: weightedNet,
      approvalRating,
    };
  }

  // ========================================================================
  // Usage and Rewards
  // ========================================================================

  /**
   * Record usage of a community anchor
   */
  recordUsage(anchorId: string, rewardAmount?: number): CommunityAnchor {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) {
      throw new Error('Anchor not found');
    }

    anchor.usageCount++;
    anchor.lastUsed = Date.now();
    anchor.updatedAt = Date.now();

    // Add to reward pool
    if (rewardAmount) {
      const poolContribution = rewardAmount * this.config.rewardPoolPercentage;
      anchor.rewardPool += poolContribution;
    }

    this.emit('anchor:used', { anchorId, usageCount: anchor.usageCount });
    return anchor;
  }

  /**
   * Distribute rewards to contributors
   */
  distributeRewards(anchorId: string): Map<string, number> {
    const anchor = this.anchors.get(anchorId);
    if (!anchor || anchor.rewardPool === 0) {
      return new Map();
    }

    const votes = this.votes.get(anchorId) || [];
    const upVoters = votes.filter(v => v.vote === 'up');

    if (upVoters.length === 0) {
      return new Map();
    }

    // Distribute rewards proportional to vote weight
    const totalWeight = upVoters.reduce((sum, v) => sum + v.weight, 0);
    const rewards = new Map<string, number>();

    for (const voter of upVoters) {
      const share = (voter.weight / totalWeight) * anchor.rewardPool;
      rewards.set(voter.voterId, share);
    }

    // Clear reward pool after distribution
    anchor.rewardPool = 0;

    this.emit('rewards:distributed', { anchorId, rewards });
    return rewards;
  }

  // ========================================================================
  // Statistics
  // ========================================================================

  /**
   * Get community pool statistics
   */
  getStats(): CommunityPoolStats {
    const anchors = Array.from(this.anchors.values());

    const totalVotes = anchors.reduce((sum, a) => sum + a.totalVotes, 0);
    const averageQuality = anchors.length > 0
      ? anchors.reduce((sum, a) => sum + a.qualityRating, 0) / anchors.length
      : 0;
    const totalUsageCount = anchors.reduce((sum, a) => sum + a.usageCount, 0);
    const totalRewardsDistributed = anchors.reduce((sum, a) => sum + a.rewardPool, 0);

    return {
      totalAnchors: anchors.length,
      approvedAnchors: anchors.filter(a => a.status === 'approved').length,
      pendingAnchors: anchors.filter(a => a.status === 'pending').length,
      retiredAnchors: anchors.filter(a => a.status === 'retired').length,
      totalVotes,
      averageQuality,
      totalUsageCount,
      totalRewardsDistributed,
    };
  }

  /**
   * Get top anchors by various metrics
   */
  getTopAnchors(by: 'quality' | 'usage' | 'value' | 'votes', limit: number = 10): CommunityAnchor[] {
    const anchors = Array.from(this.anchors.values())
      .filter(a => a.status === 'approved');

    switch (by) {
      case 'quality':
        return anchors
          .sort((a, b) => b.qualityRating - a.qualityRating)
          .slice(0, limit);

      case 'usage':
        return anchors
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit);

      case 'value':
        return anchors
          .sort((a, b) => b.communityValue - a.communityValue)
          .slice(0, limit);

      case 'votes':
        return anchors
          .sort((a, b) => b.netScore - a.netScore)
          .slice(0, limit);

      default:
        return anchors.slice(0, limit);
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private recalculateScores(anchorId: string): void {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) return;

    const summary = this.getVoteSummary(anchorId);
    anchor.totalVotes = summary.total;
    anchor.netScore = summary.netScore;
    anchor.qualityRating = Math.max(0, Math.min(1, summary.approvalRating));
    anchor.updatedAt = Date.now();
  }

  private checkAutoApproval(anchorId: string): void {
    const anchor = this.anchors.get(anchorId);
    if (!anchor || anchor.status !== 'pending') return;

    const summary = this.getVoteSummary(anchorId);

    if (summary.total >= this.config.minVotesForApproval) {
      const approvalRatio = summary.netScore / summary.total;

      if (approvalRatio >= this.config.approvalThreshold) {
        this.approveAnchor(anchorId, 'community');
      } else if (approvalRatio <= -this.config.retirementThreshold) {
        this.deprecateAnchor(anchorId, 'Low community rating');
      }
    }
  }

  private calculateVoteWeight(voterId: string, anchor: CommunityAnchor): number {
    // Base weight
    let weight = this.config.voteWeightBase;

    // Bonus for early voters
    const daysSinceAdded = (Date.now() - anchor.addedAt) / (24 * 60 * 60 * 1000);
    if (daysSinceAdded < 1) {
      weight *= 1.5;
    } else if (daysSinceAdded < 7) {
      weight *= 1.2;
    }

    // Bonus for users of the anchor
    // In production, this would check if voter has used this anchor
    // if (anchor.usageCount > 0 && hasUsedAnchor(voterId, anchorId)) {
    //   weight *= 1.3;
    // }

    return weight;
  }

  private calculateInitialCommunityValue(anchor: KVAnchor): number {
    // Based on quality score and potential utility
    return Math.floor(anchor.qualityScore * 100 + anchor.usageCount * 10);
  }
}
