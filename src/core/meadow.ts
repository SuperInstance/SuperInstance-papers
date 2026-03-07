/**
 * POLLN Meadow System
 * Pattern-Organized Large Language Network
 *
 * The Meadow is where colonies share and cross-pollinate knowledge.
 * Implements community management, knowledge sharing with FPIC consent,
 * discovery, and governance for multi-colony collaboration.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { PollenGrain, EmbeddingVector } from './types.js';

// ============================================================================
// Meadow Types
// ============================================================================

/**
 * Permission levels for community members
 */
export enum CommunityPermission {
  KEEPER = 'KEEPER',           // Full control over own colony
  MODERATOR = 'MODERATOR',     // Can moderate community content
  CONTRIBUTOR = 'CONTRIBUTOR', // Can share pollen grains
  OBSERVER = 'OBSERVER'        // Read-only access
}

/**
 * Community visibility settings
 */
export enum CommunityVisibility {
  PUBLIC = 'PUBLIC',           // Discoverable by all
  PRIVATE = 'PRIVATE',         // Invite-only
  RESTRICTED = 'RESTRICTED'    // Application required
}

/**
 * FPIC Consent status for knowledge sharing
 * Based on UNDRIP and CARE Principles
 */
export enum FPICStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',    // No indigenous knowledge involved
  PENDING = 'PENDING',              // Consent process initiated
  GRANTED = 'GRANTED',              // Free, Prior, and Informed Consent obtained
  CONDITIONAL = 'CONDITIONAL',      // Consent with specific conditions
  REVOKED = 'REVOKED',              // Consent revoked by community
  EXEMPT = 'EXEMPT'                 // Knowledge created by colony, not indigenous
}

/**
 * Restriction levels for indigenous knowledge
 */
export enum RestrictionLevel {
  PUBLIC = 'PUBLIC',           // Use with attribution only
  ATTRIBUTED = 'ATTRIBUTED',   // Must include attribution
  RESTRICTED = 'RESTRICTED',   // Limited use, specific conditions
  SACRED = 'SACRED',           // Community approval required for each use
  FORBIDDEN = 'FORBIDDEN'      // Never allowed in system
}

/**
 * TK Labels (Traditional Knowledge Labels from Local Contexts)
 */
export interface TKLabels {
  attribution?: boolean;       // TK Attribution
  nonCommercial?: boolean;     // TK Non-Commercial
  culturallySensitive?: boolean; // TK Culturally Sensitive
  secret?: boolean;           // TK Secret/Sacred
  community?: string[];       // Specific communities
}

/**
 * Community metadata
 */
export interface CommunityConfig {
  id: string;
  name: string;
  description: string;
  visibility: CommunityVisibility;
  createdBy: string;           // Keeper ID
  createdAt: number;

  // Optional settings
  maxMembers?: number;
  tags?: string[];
  language?: string;
  region?: string;
}

/**
 * Community state
 */
export interface CommunityState {
  id: string;
  memberCount: number;
  pollenGrainCount: number;
  lastActivity: number;
  isActive: boolean;
}

/**
 * Community membership
 */
export interface CommunityMembership {
  id: string;
  communityId: string;
  keeperId: string;
  permission: CommunityPermission;
  joinedAt: number;
  invitedBy?: string;
}

/**
 * Shared pollen grain with FPIC metadata
 */
export interface SharedPollenGrain extends PollenGrain {
  communityId: string;
  sharedBy: string;            // Keeper ID

  // Community tags for discovery
  tags?: string[];             // Community-added tags (separate from metadata)

  // FPIC Metadata
  fpicStatus: FPICStatus;
  fpicConsentId?: string;      // Reference to consent record
  restrictionLevel: RestrictionLevel;
  tkLabels?: TKLabels;

  // Attribution
  indigenousSources?: string[];  // Communities/traditions
  attributionStatement?: string;

  // Usage tracking
  usageCount: number;
  lastUsed?: number;

  // Community feedback
  rating?: number;
  reviewCount?: number;

  sharedAt: number;
}

/**
 * FPIC Consent record
 */
export interface FPICConsent {
  id: string;
  knowledgeId: string;         // Shared pollen grain ID
  indigenousCommunity: string; // Community name

  // FPIC Elements
  isFree: boolean;             // Free from coercion
  isPrior: boolean;            // Before use
  isInformed: boolean;         // With full understanding
  hasConsent: boolean;         // Consent obtained

  // Consent details
  consentDate: number;
  contactPerson: string;
  contactMethod: string;
  conditions?: string[];       // Specific conditions if any

  // Documentation
  documentationUrl?: string;
  meetingNotes?: string;

  // Ongoing
  isValid: boolean;
  lastReviewed: number;
  reviewFrequency: number;     // Days between reviews
}

/**
 * Benefit sharing record
 */
export interface BenefitSharing {
  id: string;
  knowledgeId: string;
  indigenousCommunity: string;

  // Benefit calculation
  totalRevenue: number;
  communityShare: number;
  sharePercentage: number;

  // Distribution
  distributed: boolean;
  distributionDate?: number;
  distributionMethod: string;

  // Capacity building
  capacityBuilding?: string[];
  technologyTransfer?: string[];

  createdAt: number;
}

/**
 * Search filters for discovery
 */
export interface DiscoveryFilters {
  query?: string;
  tags?: string[];
  communities?: string[];
  restrictionLevel?: RestrictionLevel;
  fpicStatus?: FPICStatus;
  minRating?: number;
  createdBy?: string;
  dateRange?: { start: number; end: number };
}

/**
 * Recommendation result
 */
export interface Recommendation {
  pollenGrain: SharedPollenGrain;
  relevanceScore: number;
  reason: string;
}

/**
 * Community rule
 */
export interface CommunityRule {
  id: string;
  communityId: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: number;
  isActive: boolean;
}

/**
 * Moderation action
 */
export interface ModerationAction {
  id: string;
  communityId: string;
  targetId: string;           // User or resource ID
  targetType: 'member' | 'pollen_grain';
  action: 'warn' | 'suspend' | 'remove' | 'ban';
  reason: string;
  moderatedBy: string;
  moderatedAt: number;
  expiresAt?: number;
}

/**
 * Meadow statistics
 */
export interface MeadowStats {
  totalCommunities: number;
  totalMembers: number;
  totalPollenGrains: number;
  activeCommunities: number;
  fpicComplianceRate: number;
  benefitsDistributed: number;
}

// ============================================================================
// Meadow System
// ============================================================================

/**
 * Meadow - Community and knowledge sharing system
 *
 * Implements:
 * - Community management (create/delete, membership, permissions)
 * - Knowledge sharing (pollen grain exchange, FPIC consent, attribution)
 * - Discovery (search, browse, recommendations)
 * - Governance (rules, moderation, benefit distribution)
 */
export class Meadow extends EventEmitter {
  // Communities
  private communities: Map<string, CommunityConfig> = new Map();
  private communityStates: Map<string, CommunityState> = new Map();
  private memberships: Map<string, CommunityMembership> = new Map();

  // Knowledge sharing
  private sharedGrains: Map<string, SharedPollenGrain> = new Map();
  private fpicConsents: Map<string, FPICConsent> = new Map();
  private benefitSharing: Map<string, BenefitSharing> = new Map();

  // Governance
  private communityRules: Map<string, CommunityRule[]> = new Map();
  private moderationActions: Map<string, ModerationAction> = new Map();
  private bannedUsers: Map<string, Set<string>> = new Map(); // communityId -> userIds

  // Indexes for discovery
  private grainByCommunity: Map<string, Set<string>> = new Map();
  private grainByTag: Map<string, Set<string>> = new Map();
  private grainByCreator: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.initialize();
  }

  private initialize(): void {
    this.communities = new Map();
    this.communityStates = new Map();
    this.memberships = new Map();
    this.sharedGrains = new Map();
    this.fpicConsents = new Map();
    this.benefitSharing = new Map();
    this.communityRules = new Map();
    this.moderationActions = new Map();
    this.bannedUsers = new Map();
    this.grainByCommunity = new Map();
    this.grainByTag = new Map();
    this.grainByCreator = new Map();
  }

  // ============================================================================
  // Community Management
  // ============================================================================

  /**
   * Create a new community
   */
  createCommunity(config: Omit<CommunityConfig, 'id' | 'createdAt'>): CommunityConfig {
    const community: CommunityConfig = {
      ...config,
      id: uuidv4(),
      createdAt: Date.now(),
    };

    this.communities.set(community.id, community);

    // Initialize state
    const state: CommunityState = {
      id: community.id,
      memberCount: 0,
      pollenGrainCount: 0,
      lastActivity: Date.now(),
      isActive: true,
    };
    this.communityStates.set(community.id, state);

    // Creator becomes first member with KEEPER permission
    this.addMember(community.id, config.createdBy, CommunityPermission.KEEPER);

    this.emit('community:created', community);
    return community;
  }

  /**
   * Delete a community
   */
  deleteCommunity(communityId: string, requesterId: string): boolean {
    const community = this.communities.get(communityId);
    if (!community) {
      throw new Error('Community not found');
    }

    // Check if requester is the creator
    if (community.createdBy !== requesterId) {
      throw new Error('Only community creator can delete the community');
    }

    // Remove all memberships
    const members = this.getCommunityMembers(communityId);
    for (const member of members) {
      this.memberships.delete(member.id);
    }

    // Remove all shared grains
    const grains = this.getCommunityPollenGrains(communityId);
    for (const grain of grains) {
      this.removePollenGrain(grain.id, requesterId);
    }

    // Clean up indexes
    this.grainByCommunity.delete(communityId);
    this.communityRules.delete(communityId);
    this.bannedUsers.delete(communityId);

    this.communities.delete(communityId);
    this.communityStates.delete(communityId);

    this.emit('community:deleted', { communityId, deletedBy: requesterId });
    return true;
  }

  /**
   * Get community by ID
   */
  getCommunity(communityId: string): CommunityConfig | undefined {
    return this.communities.get(communityId);
  }

  /**
   * List all communities (with optional filtering)
   */
  listCommunities(filters?: {
    visibility?: CommunityVisibility;
    createdBy?: string;
    tags?: string[];
    activeOnly?: boolean;
  }): CommunityConfig[] {
    let communities = Array.from(this.communities.values());

    if (filters?.visibility) {
      communities = communities.filter(c => c.visibility === filters.visibility);
    }

    if (filters?.createdBy) {
      communities = communities.filter(c => c.createdBy === filters.createdBy);
    }

    if (filters?.tags && filters.tags.length > 0) {
      communities = communities.filter(c =>
        c.tags?.some(tag => filters.tags!.includes(tag))
      );
    }

    if (filters?.activeOnly) {
      communities = communities.filter(c => {
        const state = this.communityStates.get(c.id);
        return state?.isActive ?? false;
      });
    }

    return communities;
  }

  // ============================================================================
  // Membership Management
  // ============================================================================

  /**
   * Add a member to a community
   */
  addMember(
    communityId: string,
    keeperId: string,
    permission: CommunityPermission,
    invitedBy?: string
  ): CommunityMembership {
    const community = this.communities.get(communityId);
    if (!community) {
      throw new Error('Community not found');
    }

    // Check if user is banned
    const banned = this.bannedUsers.get(communityId);
    if (banned?.has(keeperId)) {
      throw new Error('User is banned from this community');
    }

    // Check if already a member
    const existing = Array.from(this.memberships.values()).find(
      m => m.communityId === communityId && m.keeperId === keeperId
    );
    if (existing) {
      throw new Error('User is already a member');
    }

    const membership: CommunityMembership = {
      id: uuidv4(),
      communityId,
      keeperId,
      permission,
      joinedAt: Date.now(),
      invitedBy,
    };

    this.memberships.set(membership.id, membership);

    // Update member count
    const state = this.communityStates.get(communityId);
    if (state) {
      state.memberCount++;
      state.lastActivity = Date.now();
    }

    this.emit('member:added', membership);
    return membership;
  }

  /**
   * Remove a member from a community
   */
  removeMember(communityId: string, keeperId: string, requesterId: string): boolean {
    const membership = Array.from(this.memberships.values()).find(
      m => m.communityId === communityId && m.keeperId === keeperId
    );

    if (!membership) {
      throw new Error('Membership not found');
    }

    // Check permissions
    const requesterMembership = this.getMembership(communityId, requesterId);
    if (!requesterMembership) {
      throw new Error('Requester is not a member');
    }

    // Can only remove if: (1) removing self, (2) is KEEPER, (3) is MODERATOR
    const canRemove =
      keeperId === requesterId ||
      requesterMembership.permission === CommunityPermission.KEEPER ||
      requesterMembership.permission === CommunityPermission.MODERATOR;

    if (!canRemove) {
      throw new Error('Insufficient permissions to remove member');
    }

    // Cannot remove the creator
    const community = this.communities.get(communityId);
    if (community?.createdBy === keeperId) {
      throw new Error('Cannot remove community creator');
    }

    this.memberships.delete(membership.id);

    // Update member count
    const state = this.communityStates.get(communityId);
    if (state) {
      state.memberCount--;
      state.lastActivity = Date.now();
    }

    this.emit('member:removed', { communityId, keeperId, removedBy: requesterId });
    return true;
  }

  /**
   * Update member permission
   */
  updateMemberPermission(
    communityId: string,
    keeperId: string,
    newPermission: CommunityPermission,
    requesterId: string
  ): CommunityMembership {
    const membership = Array.from(this.memberships.values()).find(
      m => m.communityId === communityId && m.keeperId === keeperId
    );

    if (!membership) {
      throw new Error('Membership not found');
    }

    // Only KEEPER can change permissions
    const requesterMembership = this.getMembership(communityId, requesterId);
    if (requesterMembership?.permission !== CommunityPermission.KEEPER) {
      throw new Error('Only KEEPER can change permissions');
    }

    // Cannot change creator's permission
    const community = this.communities.get(communityId);
    if (community?.createdBy === keeperId) {
      throw new Error('Cannot change creator permissions');
    }

    membership.permission = newPermission;

    this.emit('member:permission_updated', membership);
    return membership;
  }

  /**
   * Get membership for a user in a community
   */
  getMembership(communityId: string, keeperId: string): CommunityMembership | undefined {
    return Array.from(this.memberships.values()).find(
      m => m.communityId === communityId && m.keeperId === keeperId
    );
  }

  /**
   * Get all members of a community
   */
  getCommunityMembers(communityId: string): CommunityMembership[] {
    return Array.from(this.memberships.values()).filter(
      m => m.communityId === communityId
    );
  }

  /**
   * Get all communities for a user
   */
  getUserCommunities(keeperId: string): CommunityMembership[] {
    return Array.from(this.memberships.values()).filter(
      m => m.keeperId === keeperId
    );
  }

  /**
   * Check if user has permission in community
   */
  hasPermission(
    communityId: string,
    keeperId: string,
    requiredPermission: CommunityPermission
  ): boolean {
    const membership = this.getMembership(communityId, keeperId);
    if (!membership) {
      return false;
    }

    const permissionLevels = [
      CommunityPermission.OBSERVER,
      CommunityPermission.CONTRIBUTOR,
      CommunityPermission.MODERATOR,
      CommunityPermission.KEEPER,
    ];

    const userLevel = permissionLevels.indexOf(membership.permission);
    const requiredLevel = permissionLevels.indexOf(requiredPermission);

    return userLevel >= requiredLevel;
  }

  // ============================================================================
  // Knowledge Sharing
  // ============================================================================

  /**
   * Share a pollen grain to a community
   */
  sharePollenGrain(
    grain: Omit<SharedPollenGrain, 'id' | 'sharedAt' | 'updatedAt' | 'usageCount'>,
    requesterId: string
  ): SharedPollenGrain {
    const community = this.communities.get(grain.communityId);
    if (!community) {
      throw new Error('Community not found');
    }

    // Check if user is CONTRIBUTOR or higher
    if (!this.hasPermission(grain.communityId, requesterId, CommunityPermission.CONTRIBUTOR)) {
      throw new Error('Insufficient permissions to share');
    }

    // Validate FPIC status
    if (grain.indigenousSources && grain.indigenousSources.length > 0) {
      if (grain.fpicStatus === FPICStatus.NOT_REQUIRED || grain.fpicStatus === FPICStatus.EXEMPT) {
        throw new Error('FPIC consent required for indigenous knowledge');
      }

      if (grain.fpicStatus === FPICStatus.GRANTED || grain.fpicStatus === FPICStatus.CONDITIONAL) {
        if (!grain.fpicConsentId) {
          throw new Error('FPIC consent ID required when status is GRANTED or CONDITIONAL');
        }
      }
    }

    // Check if FORBIDDEN knowledge
    if (grain.restrictionLevel === RestrictionLevel.FORBIDDEN) {
      throw new Error('Forbidden knowledge cannot be shared');
    }

    const sharedGrain: SharedPollenGrain = {
      ...grain,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      sharedAt: Date.now(),
    };

    this.sharedGrains.set(sharedGrain.id, sharedGrain);

    // Update indexes
    if (!this.grainByCommunity.has(grain.communityId)) {
      this.grainByCommunity.set(grain.communityId, new Set());
    }
    this.grainByCommunity.get(grain.communityId)!.add(sharedGrain.id);

    if (!this.grainByCreator.has(grain.sharedBy)) {
      this.grainByCreator.set(grain.sharedBy, new Set());
    }
    this.grainByCreator.get(grain.sharedBy)!.add(sharedGrain.id);

    if (grain.tags) {
      for (const tag of grain.tags) {
        if (!this.grainByTag.has(tag)) {
          this.grainByTag.set(tag, new Set());
        }
        this.grainByTag.get(tag)!.add(sharedGrain.id);
      }
    }

    // Update community stats
    const state = this.communityStates.get(grain.communityId);
    if (state) {
      state.pollenGrainCount++;
      state.lastActivity = Date.now();
    }

    this.emit('pollen_grain:shared', sharedGrain);
    return sharedGrain;
  }

  /**
   * Get a shared pollen grain
   */
  getPollenGrain(grainId: string): SharedPollenGrain | undefined {
    return this.sharedGrains.get(grainId);
  }

  /**
   * Get all pollen grains in a community
   */
  getCommunityPollenGrains(communityId: string): SharedPollenGrain[] {
    const grainIds = this.grainByCommunity.get(communityId);
    if (!grainIds) {
      return [];
    }

    return Array.from(grainIds)
      .map(id => this.sharedGrains.get(id))
      .filter((g): g is SharedPollenGrain => g !== undefined);
  }

  /**
   * Remove a pollen grain
   */
  removePollenGrain(grainId: string, requesterId: string): boolean {
    const grain = this.sharedGrains.get(grainId);
    if (!grain) {
      throw new Error('Pollen grain not found');
    }

    // Check if user is the creator or has elevated permissions
    const membership = this.getMembership(grain.communityId, requesterId);
    const isCreator = grain.sharedBy === requesterId;
    const isModerator = membership?.permission === CommunityPermission.MODERATOR;
    const isKeeper = membership?.permission === CommunityPermission.KEEPER;

    if (!isCreator && !isModerator && !isKeeper) {
      throw new Error('Insufficient permissions to remove pollen grain');
    }

    // Remove from indexes
    this.grainByCommunity.get(grain.communityId)?.delete(grainId);
    this.grainByCreator.get(grain.sharedBy)?.delete(grainId);
    if (grain.tags) {
      for (const tag of grain.tags) {
        this.grainByTag.get(tag)?.delete(grainId);
      }
    }

    this.sharedGrains.delete(grainId);

    // Update community stats
    const state = this.communityStates.get(grain.communityId);
    if (state) {
      state.pollenGrainCount--;
      state.lastActivity = Date.now();
    }

    this.emit('pollen_grain:removed', { grainId, removedBy: requesterId });
    return true;
  }

  /**
   * Rate a pollen grain
   */
  ratePollenGrain(grainId: string, rating: number, requesterId: string): SharedPollenGrain {
    const grain = this.sharedGrains.get(grainId);
    if (!grain) {
      throw new Error('Pollen grain not found');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Update rating (simple average for now)
    const currentRating = grain.rating || 0;
    const currentCount = grain.reviewCount || 0;
    const newCount = currentCount + 1;
    const newRating = (currentRating * currentCount + rating) / newCount;

    grain.rating = newRating;
    grain.reviewCount = newCount;
    grain.updatedAt = Date.now();

    this.emit('pollen_grain:rated', { grainId, rating, ratedBy: requesterId });
    return grain;
  }

  /**
   * Record usage of a pollen grain
   */
  recordUsage(grainId: string): SharedPollenGrain {
    const grain = this.sharedGrains.get(grainId);
    if (!grain) {
      throw new Error('Pollen grain not found');
    }

    grain.usageCount++;
    grain.lastUsed = Date.now();

    // Check if SACRED - each use requires approval
    if (grain.restrictionLevel === RestrictionLevel.SACRED) {
      this.emit('pollen_grain:sacred_use', grain);
    }

    return grain;
  }

  // ============================================================================
  // FPIC Consent Management
  // ============================================================================

  /**
   * Create FPIC consent record
   */
  createFPICConsent(
    consent: Omit<FPICConsent, 'id' | 'lastReviewed'>
  ): FPICConsent {
    const fpicConsent: FPICConsent = {
      ...consent,
      id: uuidv4(),
      lastReviewed: Date.now(),
    };

    this.fpicConsents.set(fpicConsent.id, fpicConsent);

    this.emit('fpic:consent_created', fpicConsent);
    return fpicConsent;
  }

  /**
   * Get FPIC consent by ID
   */
  getFPICConsent(consentId: string): FPICConsent | undefined {
    return this.fpicConsents.get(consentId);
  }

  /**
   * Update FPIC consent (e.g., renewal, condition changes)
   */
  updateFPICConsent(
    consentId: string,
    updates: Partial<FPICConsent>,
    requesterId: string
  ): FPICConsent {
    const consent = this.fpicConsents.get(consentId);
    if (!consent) {
      throw new Error('FPIC consent not found');
    }

    // Update consent
    Object.assign(consent, updates);
    consent.lastReviewed = Date.now();

    this.emit('fpic:consent_updated', consent);
    return consent;
  }

  /**
   * Revoke FPIC consent
   */
  revokeFPICConsent(consentId: string, reason: string): FPICConsent {
    const consent = this.fpicConsents.get(consentId);
    if (!consent) {
      throw new Error('FPIC consent not found');
    }

    consent.isValid = false;
    consent.lastReviewed = Date.now();

    // Update all associated grains to REVOKED status
    for (const grain of this.sharedGrains.values()) {
      if (grain.fpicConsentId === consentId) {
        grain.fpicStatus = FPICStatus.REVOKED;
        this.emit('pollen_grain:fpic_revoked', { grainId: grain.id, reason });
      }
    }

    this.emit('fpic:consent_revoked', { consentId, reason });
    return consent;
  }

  /**
   * Check if FPIC consent needs review
   */
  checkFPICReviewNeeded(consentId: string): boolean {
    const consent = this.fpicConsents.get(consentId);
    if (!consent || !consent.isValid) {
      return false;
    }

    const daysSinceReview = (Date.now() - consent.lastReviewed) / (1000 * 60 * 60 * 24);
    return daysSinceReview >= consent.reviewFrequency;
  }

  /**
   * Get all FPIC consents for a community
   */
  getCommunityFPICConsents(communityId: string): FPICConsent[] {
    const consents: FPICConsent[] = [];

    for (const grain of this.getCommunityPollenGrains(communityId)) {
      if (grain.fpicConsentId) {
        const consent = this.fpicConsents.get(grain.fpicConsentId);
        if (consent) {
          consents.push(consent);
        }
      }
    }

    return consents;
  }

  // ============================================================================
  // Benefit Sharing
  // ============================================================================

  /**
   * Calculate benefit share for indigenous knowledge
   */
  calculateBenefit(
    knowledgeId: string,
    totalRevenue: number,
    sharePercentage: number
  ): BenefitSharing {
    const grain = this.sharedGrains.get(knowledgeId);
    if (!grain) {
      throw new Error('Knowledge not found');
    }

    if (!grain.indigenousSources || grain.indigenousSources.length === 0) {
      throw new Error('No indigenous sources associated with this knowledge');
    }

    const communityShare = totalRevenue * (sharePercentage / 100);

    const benefit: BenefitSharing = {
      id: uuidv4(),
      knowledgeId,
      indigenousCommunity: grain.indigenousSources[0], // Primary community
      totalRevenue,
      communityShare,
      sharePercentage,
      distributed: false,
      distributionMethod: 'Pending',
      createdAt: Date.now(),
    };

    this.benefitSharing.set(benefit.id, benefit);

    this.emit('benefit:calculated', benefit);
    return benefit;
  }

  /**
   * Record benefit distribution
   */
  distributeBenefit(
    benefitId: string,
    distributionMethod: string,
    requesterId: string
  ): BenefitSharing {
    const benefit = this.benefitSharing.get(benefitId);
    if (!benefit) {
      throw new Error('Benefit record not found');
    }

    benefit.distributed = true;
    benefit.distributionDate = Date.now();
    benefit.distributionMethod = distributionMethod;

    this.emit('benefit:distributed', benefit);
    return benefit;
  }

  /**
   * Get total benefits for a community
   */
  getCommunityBenefits(indigenousCommunity: string): BenefitSharing[] {
    return Array.from(this.benefitSharing.values()).filter(
      b => b.indigenousCommunity === indigenousCommunity
    );
  }

  // ============================================================================
  // Discovery
  // ============================================================================

  /**
   * Search for pollen grains
   */
  search(filters: DiscoveryFilters): SharedPollenGrain[] {
    let results = Array.from(this.sharedGrains.values());

    // Filter by query (search in metadata)
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter(g =>
        g.metadata.agentTypes?.some(t => t.toLowerCase().includes(query)) ||
        g.id.toLowerCase().includes(query)
      );
    }

    // Filter by communities
    if (filters.communities && filters.communities.length > 0) {
      results = results.filter(g => filters.communities!.includes(g.communityId));
    }

    // Filter by restriction level
    if (filters.restrictionLevel) {
      results = results.filter(g => g.restrictionLevel <= filters.restrictionLevel!);
    }

    // Filter by FPIC status
    if (filters.fpicStatus) {
      results = results.filter(g => g.fpicStatus === filters.fpicStatus);
    }

    // Filter by minimum rating
    if (filters.minRating) {
      results = results.filter(g => (g.rating || 0) >= filters.minRating!);
    }

    // Filter by creator
    if (filters.createdBy) {
      results = results.filter(g => g.sharedBy === filters.createdBy);
    }

    // Filter by date range
    if (filters.dateRange) {
      results = results.filter(g =>
        g.sharedAt >= filters.dateRange!.start &&
        g.sharedAt <= filters.dateRange!.end
      );
    }

    return results;
  }

  /**
   * Get recommendations for a user
   */
  getRecommendations(keeperId: string, limit: number = 10): Recommendation[] {
    const userCommunities = this.getUserCommunities(keeperId).map(m => m.communityId);
    const recommendations: Recommendation[] = [];

    // Get grains from user's communities
    for (const communityId of userCommunities) {
      const grains = this.getCommunityPollenGrains(communityId);

      for (const grain of grains) {
        // Skip user's own grains
        if (grain.sharedBy === keeperId) continue;

        // Calculate relevance score based on:
        // - Rating
        // - Usage count
        // - Recency
        const ratingScore = grain.rating || 0;
        const usageScore = Math.min(grain.usageCount / 100, 1);
        const recencyScore = Math.max(0, 1 - (Date.now() - grain.sharedAt) / (30 * 24 * 60 * 60 * 1000));

        const relevanceScore = (ratingScore / 5) * 0.5 + usageScore * 0.3 + recencyScore * 0.2;

        recommendations.push({
          pollenGrain: grain,
          relevanceScore,
          reason: this.generateRecommendationReason(grain),
        });
      }
    }

    // Sort by relevance and return top N
    recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return recommendations.slice(0, limit);
  }

  /**
   * Generate explanation for recommendation
   */
  private generateRecommendationReason(grain: SharedPollenGrain): string {
    const reasons: string[] = [];

    if (grain.rating && grain.rating >= 4) {
      reasons.push('highly rated');
    }

    if (grain.usageCount > 50) {
      reasons.push('popular');
    }

    const daysSinceShared = (Date.now() - grain.sharedAt) / (24 * 60 * 60 * 1000);
    if (daysSinceShared < 7) {
      reasons.push('recently shared');
    }

    if (reasons.length === 0) {
      return 'may be of interest';
    }

    return reasons.join(', ');
  }

  /**
   * Browse communities
   */
  browseCommunities(options?: {
    sortBy?: 'members' | 'grains' | 'activity' | 'created';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  }): (CommunityConfig & { state: CommunityState })[] {
    let results = Array.from(this.communities.values()).map(c => ({
      ...c,
      state: this.communityStates.get(c.id)!,
    }));

    // Filter out private communities
    results = results.filter(c => c.visibility !== CommunityVisibility.PRIVATE);

    // Sort
    const sortBy = options?.sortBy || 'members';
    const sortOrder = options?.sortOrder || 'desc';

    results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'members':
          comparison = a.state.memberCount - b.state.memberCount;
          break;
        case 'grains':
          comparison = a.state.pollenGrainCount - b.state.pollenGrainCount;
          break;
        case 'activity':
          comparison = a.state.lastActivity - b.state.lastActivity;
          break;
        case 'created':
          comparison = a.createdAt - b.createdAt;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Limit
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // ============================================================================
  // Governance
  // ============================================================================

  /**
   * Create a community rule
   */
  createRule(
    communityId: string,
    title: string,
    description: string,
    createdBy: string
  ): CommunityRule {
    if (!this.hasPermission(communityId, createdBy, CommunityPermission.KEEPER)) {
      throw new Error('Only KEEPER can create rules');
    }

    const rule: CommunityRule = {
      id: uuidv4(),
      communityId,
      title,
      description,
      createdBy,
      createdAt: Date.now(),
      isActive: true,
    };

    if (!this.communityRules.has(communityId)) {
      this.communityRules.set(communityId, []);
    }
    this.communityRules.get(communityId)!.push(rule);

    this.emit('rule:created', rule);
    return rule;
  }

  /**
   * Get community rules
   */
  getRules(communityId: string): CommunityRule[] {
    return this.communityRules.get(communityId) || [];
  }

  /**
   * Perform moderation action
   */
  moderate(
    communityId: string,
    targetId: string,
    targetType: 'member' | 'pollen_grain',
    action: 'warn' | 'suspend' | 'remove' | 'ban',
    reason: string,
    moderatedBy: string
  ): ModerationAction {
    if (!this.hasPermission(communityId, moderatedBy, CommunityPermission.MODERATOR)) {
      throw new Error('Insufficient permissions for moderation');
    }

    const moderationAction: ModerationAction = {
      id: uuidv4(),
      communityId,
      targetId,
      targetType,
      action,
      reason,
      moderatedBy,
      moderatedAt: Date.now(),
    };

    this.moderationActions.set(moderationAction.id, moderationAction);

    // Execute action
    switch (action) {
      case 'remove':
        if (targetType === 'pollen_grain') {
          this.removePollenGrain(targetId, moderatedBy);
        } else {
          this.removeMember(communityId, targetId, moderatedBy);
        }
        break;

      case 'ban':
        if (targetType === 'member') {
          this.removeMember(communityId, targetId, moderatedBy);
          if (!this.bannedUsers.has(communityId)) {
            this.bannedUsers.set(communityId, new Set());
          }
          this.bannedUsers.get(communityId)!.add(targetId);
        }
        break;

      case 'suspend':
        // Create temporary ban (30 days)
        if (targetType === 'member') {
          moderationAction.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
          if (!this.bannedUsers.has(communityId)) {
            this.bannedUsers.set(communityId, new Set());
          }
          this.bannedUsers.get(communityId)!.add(targetId);
        }
        break;

      case 'warn':
        // Just log the warning
        break;
    }

    this.emit('moderation:action', moderationAction);
    return moderationAction;
  }

  /**
   * Get moderation history for a community
   */
  getModerationHistory(communityId: string): ModerationAction[] {
    return Array.from(this.moderationActions.values()).filter(
      a => a.communityId === communityId
    );
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get overall meadow statistics
   */
  getStats(): MeadowStats {
    const totalCommunities = this.communities.size;
    const totalMembers = this.memberships.size;
    const totalPollenGrains = this.sharedGrains.size;
    const activeCommunities = Array.from(this.communityStates.values()).filter(
      s => s.isActive && (Date.now() - s.lastActivity) < 30 * 24 * 60 * 60 * 1000
    ).length;

    // Calculate FPIC compliance rate
    const indigenousGrains = Array.from(this.sharedGrains.values()).filter(
      g => g.indigenousSources && g.indigenousSources.length > 0
    );
    const compliantGrains = indigenousGrains.filter(
      g => g.fpicStatus === FPICStatus.GRANTED || g.fpicStatus === FPICStatus.CONDITIONAL
    );
    const fpicComplianceRate = indigenousGrains.length > 0
      ? compliantGrains.length / indigenousGrains.length
      : 1;

    // Calculate total benefits distributed
    const benefitsDistributed = Array.from(this.benefitSharing.values())
      .filter(b => b.distributed)
      .reduce((sum, b) => sum + b.communityShare, 0);

    return {
      totalCommunities,
      totalMembers,
      totalPollenGrains,
      activeCommunities,
      fpicComplianceRate,
      benefitsDistributed,
    };
  }

  /**
   * Get community statistics
   */
  getCommunityStats(communityId: string): CommunityState | undefined {
    return this.communityStates.get(communityId);
  }
}
