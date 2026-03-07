/**
 * POLLN Meadow System Tests
 * Comprehensive tests for community management, knowledge sharing, and governance
 */

import {
  Meadow,
  CommunityPermission,
  CommunityVisibility,
  FPICStatus,
  RestrictionLevel,
  type CommunityConfig,
  type SharedPollenGrain,
  type FPICConsent,
  type BenefitSharing,
  type DiscoveryFilters,
  type Recommendation,
  type CommunityRule,
  type ModerationAction,
  type TKLabels,
} from '../meadow';
import type { EmbeddingMetadata, EmbeddingVector } from '../types';

// Helper to create a test pollen grain metadata
function createTestMetadata(overrides?: Partial<EmbeddingMetadata>): EmbeddingMetadata {
  return {
    dimension: 128,
    sourceLogCount: 10,
    sourceLogIds: ['log1', 'log2'],
    agentTypes: ['test-agent'],
    usageCount: 0,
    successRate: 1.0,
    isPrivate: false,
    ...overrides,
  };
}

// Helper to add a tag to metadata for testing
function createTestMetadataWithTags(tags: string[]): EmbeddingMetadata {
  return {
    dimension: 128,
    sourceLogCount: 10,
    sourceLogIds: ['log1', 'log2'],
    agentTypes: ['test-agent'],
    usageCount: 0,
    successRate: 1.0,
    isPrivate: false,
  };
}

// Helper to create a test embedding
function createTestEmbedding(): EmbeddingVector {
  return new Array(128).fill(0).map(() => Math.random());
}

describe('Meadow System', () => {
  let meadow: Meadow;
  let testCommunity: CommunityConfig;
  let testKeeperId: string;
  let anotherKeeperId: string;

  beforeEach(() => {
    meadow = new Meadow();
    testKeeperId = 'keeper-1';
    anotherKeeperId = 'keeper-2';

    // Create a test community
    testCommunity = meadow.createCommunity({
      name: 'Test Community',
      description: 'A community for testing',
      visibility: CommunityVisibility.PUBLIC,
      createdBy: testKeeperId,
      tags: ['test', 'demo'],
    });
  });

  describe('Community Management', () => {
    describe('createCommunity', () => {
      it('should create a public community', () => {
        const community = meadow.createCommunity({
          name: 'New Community',
          description: 'A new test community',
          visibility: CommunityVisibility.PUBLIC,
          createdBy: 'creator-1',
        });

        expect(community.id).toBeDefined();
        expect(community.name).toBe('New Community');
        expect(community.visibility).toBe(CommunityVisibility.PUBLIC);
        expect(community.createdAt).toBeDefined();
      });

      it('should create a private community', () => {
        const community = meadow.createCommunity({
          name: 'Private Community',
          description: 'A private community',
          visibility: CommunityVisibility.PRIVATE,
          createdBy: 'creator-1',
        });

        expect(community.visibility).toBe(CommunityVisibility.PRIVATE);
      });

      it('should add creator as first KEEPER member', () => {
        const memberships = meadow.getCommunityMembers(testCommunity.id);
        expect(memberships).toHaveLength(1);
        expect(memberships[0].keeperId).toBe(testKeeperId);
        expect(memberships[0].permission).toBe(CommunityPermission.KEEPER);
      });

      it('should initialize community state', () => {
        const state = meadow.getCommunityStats(testCommunity.id);
        expect(state).toBeDefined();
        expect(state?.memberCount).toBe(1);
        expect(state?.pollenGrainCount).toBe(0);
        expect(state?.isActive).toBe(true);
      });
    });

    describe('deleteCommunity', () => {
      it('should allow creator to delete community', () => {
        const result = meadow.deleteCommunity(testCommunity.id, testKeeperId);
        expect(result).toBe(true);

        const community = meadow.getCommunity(testCommunity.id);
        expect(community).toBeUndefined();
      });

      it('should not allow non-creator to delete community', () => {
        expect(() => {
          meadow.deleteCommunity(testCommunity.id, anotherKeeperId);
        }).toThrow('Only community creator can delete');
      });

      it('should remove all memberships when deleting', () => {
        meadow.addMember(testCommunity.id, anotherKeeperId, CommunityPermission.CONTRIBUTOR);
        meadow.deleteCommunity(testCommunity.id, testKeeperId);

        const members = meadow.getCommunityMembers(testCommunity.id);
        expect(members).toHaveLength(0);
      });
    });

    describe('getCommunity', () => {
      it('should return community by ID', () => {
        const community = meadow.getCommunity(testCommunity.id);
        expect(community).toBeDefined();
        expect(community?.id).toBe(testCommunity.id);
      });

      it('should return undefined for non-existent community', () => {
        const community = meadow.getCommunity('non-existent');
        expect(community).toBeUndefined();
      });
    });

    describe('listCommunities', () => {
      it('should return all communities', () => {
        const communities = meadow.listCommunities();
        expect(communities).toHaveLength(1);
        expect(communities[0].id).toBe(testCommunity.id);
      });

      it('should filter by visibility', () => {
        meadow.createCommunity({
          name: 'Private Community',
          description: 'Private',
          visibility: CommunityVisibility.PRIVATE,
          createdBy: 'creator-2',
        });

        const publicCommunities = meadow.listCommunities({
          visibility: CommunityVisibility.PUBLIC,
        });
        expect(publicCommunities).toHaveLength(1);
      });

      it('should filter by creator', () => {
        const communities = meadow.listCommunities({
          createdBy: testKeeperId,
        });
        expect(communities).toHaveLength(1);
        expect(communities[0].createdBy).toBe(testKeeperId);
      });

      it('should filter by tags', () => {
        const communities = meadow.listCommunities({
          tags: ['test'],
        });
        expect(communities).toHaveLength(1);
        expect(communities[0].tags).toContain('test');
      });

      it('should filter active communities only', () => {
        const state = meadow.getCommunityStats(testCommunity.id);
        if (state) state.isActive = false;

        const activeCommunities = meadow.listCommunities({
          activeOnly: true,
        });
        expect(activeCommunities).toHaveLength(0);
      });
    });
  });

  describe('Membership Management', () => {
    beforeEach(() => {
      // Add another keeper as member
      meadow.addMember(testCommunity.id, anotherKeeperId, CommunityPermission.CONTRIBUTOR);
    });

    describe('addMember', () => {
      it('should add a new member', () => {
        const newMemberId = 'keeper-3';
        const membership = meadow.addMember(
          testCommunity.id,
          newMemberId,
          CommunityPermission.OBSERVER
        );

        expect(membership.id).toBeDefined();
        expect(membership.keeperId).toBe(newMemberId);
        expect(membership.permission).toBe(CommunityPermission.OBSERVER);
      });

      it('should update member count', () => {
        const initialCount = meadow.getCommunityStats(testCommunity.id)?.memberCount;
        meadow.addMember(testCommunity.id, 'keeper-3', CommunityPermission.OBSERVER);

        const newCount = meadow.getCommunityStats(testCommunity.id)?.memberCount;
        expect(newCount).toBe(initialCount! + 1);
      });

      it('should not add duplicate members', () => {
        expect(() => {
          meadow.addMember(testCommunity.id, anotherKeeperId, CommunityPermission.OBSERVER);
        }).toThrow('User is already a member');
      });

      it('should not add banned users', () => {
        meadow.moderate(
          testCommunity.id,
          anotherKeeperId,
          'member',
          'ban',
          'Violating rules',
          testKeeperId
        );

        expect(() => {
          meadow.addMember(testCommunity.id, anotherKeeperId, CommunityPermission.OBSERVER);
        }).toThrow('User is banned from this community');
      });

      it('should throw for non-existent community', () => {
        expect(() => {
          meadow.addMember('non-existent', 'keeper-3', CommunityPermission.OBSERVER);
        }).toThrow('Community not found');
      });
    });

    describe('removeMember', () => {
      it('should allow member to remove themselves', () => {
        const result = meadow.removeMember(testCommunity.id, anotherKeeperId, anotherKeeperId);
        expect(result).toBe(true);

        const membership = meadow.getMembership(testCommunity.id, anotherKeeperId);
        expect(membership).toBeUndefined();
      });

      it('should allow KEEPER to remove members', () => {
        const result = meadow.removeMember(testCommunity.id, anotherKeeperId, testKeeperId);
        expect(result).toBe(true);
      });

      it('should allow MODERATOR to remove members', () => {
        const moderatorId = 'moderator-1';
        meadow.addMember(testCommunity.id, moderatorId, CommunityPermission.MODERATOR);

        const result = meadow.removeMember(testCommunity.id, anotherKeeperId, moderatorId);
        expect(result).toBe(true);
      });

      it('should not allow OBSERVER to remove members', () => {
        const observerId = 'observer-1';
        meadow.addMember(testCommunity.id, observerId, CommunityPermission.OBSERVER);

        expect(() => {
          meadow.removeMember(testCommunity.id, anotherKeeperId, observerId);
        }).toThrow('Insufficient permissions to remove member');
      });

      it('should not allow removing community creator', () => {
        // Create a separate community with a different creator
        const otherCommunity = meadow.createCommunity({
          name: 'Other Community',
          description: 'Another community',
          visibility: CommunityVisibility.PUBLIC,
          createdBy: anotherKeeperId,
        });

        // Add testKeeperId as a MODERATOR to the other community
        meadow.addMember(otherCommunity.id, testKeeperId, CommunityPermission.MODERATOR);

        expect(() => {
          meadow.removeMember(otherCommunity.id, anotherKeeperId, testKeeperId);
        }).toThrow('Cannot remove community creator');
      });
    });

    describe('updateMemberPermission', () => {
      it('should allow KEEPER to update permissions', () => {
        const membership = meadow.updateMemberPermission(
          testCommunity.id,
          anotherKeeperId,
          CommunityPermission.MODERATOR,
          testKeeperId
        );

        expect(membership.permission).toBe(CommunityPermission.MODERATOR);
      });

      it('should not allow non-KEEPER to update permissions', () => {
        expect(() => {
          meadow.updateMemberPermission(
            testCommunity.id,
            anotherKeeperId,
            CommunityPermission.MODERATOR,
            anotherKeeperId
          );
        }).toThrow('Only KEEPER can change permissions');
      });

      it('should not allow changing creator permissions', () => {
        expect(() => {
          meadow.updateMemberPermission(
            testCommunity.id,
            testKeeperId,
            CommunityPermission.MODERATOR,
            testKeeperId
          );
        }).toThrow('Cannot change creator permissions');
      });
    });

    describe('getMembership', () => {
      it('should return membership for user in community', () => {
        const membership = meadow.getMembership(testCommunity.id, anotherKeeperId);
        expect(membership).toBeDefined();
        expect(membership?.keeperId).toBe(anotherKeeperId);
      });

      it('should return undefined for non-member', () => {
        const membership = meadow.getMembership(testCommunity.id, 'non-member');
        expect(membership).toBeUndefined();
      });
    });

    describe('getCommunityMembers', () => {
      it('should return all members of community', () => {
        const members = meadow.getCommunityMembers(testCommunity.id);
        expect(members.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('getUserCommunities', () => {
      it('should return all communities for user', () => {
        const userCommunities = meadow.getUserCommunities(testKeeperId);
        expect(userCommunities).toHaveLength(1);
        expect(userCommunities[0].communityId).toBe(testCommunity.id);
      });
    });

    describe('hasPermission', () => {
      it('should return true for matching permission', () => {
        const hasPermission = meadow.hasPermission(
          testCommunity.id,
          testKeeperId,
          CommunityPermission.KEEPER
        );
        expect(hasPermission).toBe(true);
      });

      it('should return true for higher permission level', () => {
        const hasPermission = meadow.hasPermission(
          testCommunity.id,
          testKeeperId,
          CommunityPermission.OBSERVER
        );
        expect(hasPermission).toBe(true);
      });

      it('should return false for lower permission level', () => {
        const hasPermission = meadow.hasPermission(
          testCommunity.id,
          anotherKeeperId,
          CommunityPermission.MODERATOR
        );
        expect(hasPermission).toBe(false);
      });

      it('should return false for non-member', () => {
        const hasPermission = meadow.hasPermission(
          testCommunity.id,
          'non-member',
          CommunityPermission.OBSERVER
        );
        expect(hasPermission).toBe(false);
      });
    });
  });

  describe('Knowledge Sharing', () => {
    let testGrain: SharedPollenGrain;

    beforeEach(() => {
      // Create FPIC consent for indigenous knowledge
      const consent = meadow.createFPICConsent({
        knowledgeId: 'knowledge-1',
        indigenousCommunity: 'Māori',
        isFree: true,
        isPrior: true,
        isInformed: true,
        hasConsent: true,
        consentDate: Date.now(),
        contactPerson: 'Community Representative',
        contactMethod: 'In-person meeting',
        reviewFrequency: 365,
        isValid: true,
        isValid: true,
      });

      // Create a test pollen grain
      testGrain = meadow.sharePollenGrain({
        communityId: testCommunity.id,
        sharedBy: testKeeperId,
        gardenerId: testKeeperId,
        embedding: createTestEmbedding(),
        metadata: createTestMetadata(),
        tags: ['test-tag'],
        fpicStatus: FPICStatus.GRANTED,
        fpicConsentId: consent.id,
        restrictionLevel: RestrictionLevel.ATTRIBUTED,
        indigenousSources: ['Māori'],
        attributionStatement: 'Based on Māori traditional knowledge',
      }, testKeeperId);
    });

    describe('sharePollenGrain', () => {
      it('should share a pollen grain', () => {
        expect(testGrain.id).toBeDefined();
        expect(testGrain.communityId).toBe(testCommunity.id);
        expect(testGrain.sharedBy).toBe(testKeeperId);
      });

      it('should require CONTRIBUTOR permission or higher', () => {
        const observerId = 'observer-1';
        meadow.addMember(testCommunity.id, observerId, CommunityPermission.OBSERVER);

        expect(() => {
          meadow.sharePollenGrain({
            communityId: testCommunity.id,
            sharedBy: observerId,
            gardenerId: observerId,
            embedding: createTestEmbedding(),
            metadata: createTestMetadata(),
            fpicStatus: FPICStatus.EXEMPT,
            restrictionLevel: RestrictionLevel.PUBLIC,
          }, observerId);
        }).toThrow('Insufficient permissions to share');
      });

      it('should require FPIC consent for indigenous knowledge', () => {
        expect(() => {
          meadow.sharePollenGrain({
            communityId: testCommunity.id,
            sharedBy: testKeeperId,
            gardenerId: testKeeperId,
            embedding: createTestEmbedding(),
            metadata: createTestMetadata(),
            fpicStatus: FPICStatus.NOT_REQUIRED,
            restrictionLevel: RestrictionLevel.PUBLIC,
            indigenousSources: ['Māori'],
          }, testKeeperId);
        }).toThrow('FPIC consent required for indigenous knowledge');
      });

      it('should not allow FORBIDDEN knowledge', () => {
        expect(() => {
          meadow.sharePollenGrain({
            communityId: testCommunity.id,
            sharedBy: testKeeperId,
            gardenerId: testKeeperId,
            embedding: createTestEmbedding(),
            metadata: createTestMetadata(),
            fpicStatus: FPICStatus.EXEMPT,
            restrictionLevel: RestrictionLevel.FORBIDDEN,
          }, testKeeperId);
        }).toThrow('Forbidden knowledge cannot be shared');
      });

      it('should require consent ID when FPIC status is GRANTED', () => {
        expect(() => {
          meadow.sharePollenGrain({
            communityId: testCommunity.id,
            sharedBy: testKeeperId,
            gardenerId: testKeeperId,
            embedding: createTestEmbedding(),
            metadata: createTestMetadata(),
            fpicStatus: FPICStatus.GRANTED,
            restrictionLevel: RestrictionLevel.ATTRIBUTED,
            indigenousSources: ['Lakota'],
          }, testKeeperId);
        }).toThrow('FPIC consent ID required');
      });

      it('should update community pollen grain count', () => {
        const state = meadow.getCommunityStats(testCommunity.id);
        expect(state?.pollenGrainCount).toBeGreaterThan(0);
      });
    });

    describe('getPollenGrain', () => {
      it('should return pollen grain by ID', () => {
        const grain = meadow.getPollenGrain(testGrain.id);
        expect(grain).toBeDefined();
        expect(grain?.id).toBe(testGrain.id);
      });

      it('should return undefined for non-existent grain', () => {
        const grain = meadow.getPollenGrain('non-existent');
        expect(grain).toBeUndefined();
      });
    });

    describe('getCommunityPollenGrains', () => {
      it('should return all grains in community', () => {
        const grains = meadow.getCommunityPollenGrains(testCommunity.id);
        expect(grains).toContain(testGrain);
      });
    });

    describe('removePollenGrain', () => {
      it('should allow creator to remove their grain', () => {
        const result = meadow.removePollenGrain(testGrain.id, testKeeperId);
        expect(result).toBe(true);

        const grain = meadow.getPollenGrain(testGrain.id);
        expect(grain).toBeUndefined();
      });

      it('should allow MODERATOR to remove grains', () => {
        const moderatorId = 'moderator-1';
        meadow.addMember(testCommunity.id, moderatorId, CommunityPermission.MODERATOR);

        const result = meadow.removePollenGrain(testGrain.id, moderatorId);
        expect(result).toBe(true);
      });

      it('should not allow non-creator to remove grains', () => {
        expect(() => {
          meadow.removePollenGrain(testGrain.id, anotherKeeperId);
        }).toThrow('Insufficient permissions to remove pollen grain');
      });
    });

    describe('ratePollenGrain', () => {
      it('should rate a pollen grain', () => {
        const ratedGrain = meadow.ratePollenGrain(testGrain.id, 5, anotherKeeperId);
        expect(ratedGrain.rating).toBe(5);
        expect(ratedGrain.reviewCount).toBe(1);
      });

      it('should calculate average rating', () => {
        meadow.ratePollenGrain(testGrain.id, 4, anotherKeeperId);
        meadow.ratePollenGrain(testGrain.id, 5, testKeeperId);

        const grain = meadow.getPollenGrain(testGrain.id);
        expect(grain?.rating).toBe(4.5);
        expect(grain?.reviewCount).toBe(2);
      });

      it('should throw for invalid rating', () => {
        expect(() => {
          meadow.ratePollenGrain(testGrain.id, 6, anotherKeeperId);
        }).toThrow('Rating must be between 1 and 5');
      });
    });

    describe('recordUsage', () => {
      it('should record usage of pollen grain', () => {
        const grain = meadow.recordUsage(testGrain.id);
        expect(grain.usageCount).toBe(1);
        expect(grain.lastUsed).toBeDefined();
      });

      it('should emit event for SACRED knowledge', () => {
        let sacredEventEmitted = false;
        meadow.on('pollen_grain:sacred_use', () => {
          sacredEventEmitted = true;
        });

        // Create SACRED grain
        const consent = meadow.createFPICConsent({
          knowledgeId: 'knowledge-2',
          indigenousCommunity: 'Lakota',
          isFree: true,
          isPrior: true,
          isInformed: true,
          hasConsent: true,
          consentDate: Date.now(),
          contactPerson: 'Representative',
          contactMethod: 'Meeting',
          reviewFrequency: 365,
        isValid: true,
        });

        const sacredGrain = meadow.sharePollenGrain({
          communityId: testCommunity.id,
          sharedBy: testKeeperId,
          gardenerId: testKeeperId,
          embedding: createTestEmbedding(),
          metadata: createTestMetadata(),
          fpicStatus: FPICStatus.GRANTED,
          fpicConsentId: consent.id,
          restrictionLevel: RestrictionLevel.SACRED,
          indigenousSources: ['Lakota'],
        }, testKeeperId);

        meadow.recordUsage(sacredGrain.id);
        expect(sacredEventEmitted).toBe(true);
      });
    });
  });

  describe('FPIC Consent Management', () => {
    describe('createFPICConsent', () => {
      it('should create FPIC consent record', () => {
        const consent = meadow.createFPICConsent({
          knowledgeId: 'knowledge-1',
          indigenousCommunity: 'Māori',
          isFree: true,
          isPrior: true,
          isInformed: true,
          hasConsent: true,
          consentDate: Date.now(),
          contactPerson: 'Representative',
          contactMethod: 'Meeting',
          reviewFrequency: 365,
        isValid: true,
          isValid: true,
        });

        expect(consent.id).toBeDefined();
        expect(consent.indigenousCommunity).toBe('Māori');
        expect(consent.isValid).toBe(true);
      });
    });

    describe('getFPICConsent', () => {
      it('should return consent by ID', () => {
        const consent = meadow.createFPICConsent({
          knowledgeId: 'knowledge-1',
          indigenousCommunity: 'Lakota',
          isFree: true,
          isPrior: true,
          isInformed: true,
          hasConsent: true,
          consentDate: Date.now(),
          contactPerson: 'Rep',
          contactMethod: 'Email',
          reviewFrequency: 365,
        isValid: true,
        });

        const retrieved = meadow.getFPICConsent(consent.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(consent.id);
      });
    });

    describe('updateFPICConsent', () => {
      it('should update consent record', () => {
        const consent = meadow.createFPICConsent({
          knowledgeId: 'knowledge-1',
          indigenousCommunity: 'Yoruba',
          isFree: true,
          isPrior: true,
          isInformed: true,
          hasConsent: true,
          consentDate: Date.now(),
          contactPerson: 'Rep',
          contactMethod: 'Meeting',
          reviewFrequency: 365,
        isValid: true,
        });

        const updated = meadow.updateFPICConsent(
          consent.id,
          { conditions: ['Must include attribution'] },
          testKeeperId
        );

        expect(updated.conditions).toContain('Must include attribution');
      });
    });

    describe('revokeFPICConsent', () => {
      it('should revoke consent', () => {
        const consent = meadow.createFPICConsent({
          knowledgeId: 'knowledge-1',
          indigenousCommunity: 'Haudenosaunee',
          isFree: true,
          isPrior: true,
          isInformed: true,
          hasConsent: true,
          consentDate: Date.now(),
          contactPerson: 'Rep',
          contactMethod: 'Meeting',
          reviewFrequency: 365,
        isValid: true,
        });

        const revoked = meadow.revokeFPICConsent(consent.id, 'Community request');
        expect(revoked.isValid).toBe(false);
      });
    });

    describe('checkFPICReviewNeeded', () => {
      it('should return false for new consent', () => {
        const consent = meadow.createFPICConsent({
          knowledgeId: 'knowledge-1',
          indigenousCommunity: 'Māori',
          isFree: true,
          isPrior: true,
          isInformed: true,
          hasConsent: true,
          consentDate: Date.now(),
          contactPerson: 'Rep',
          contactMethod: 'Meeting',
          reviewFrequency: 365,
        isValid: true,
        });

        const needsReview = meadow.checkFPICReviewNeeded(consent.id);
        expect(needsReview).toBe(false);
      });
    });
  });

  describe('Benefit Sharing', () => {
    describe('calculateBenefit', () => {
      it('should calculate benefit share', () => {
        const consent = meadow.createFPICConsent({
          knowledgeId: 'knowledge-1',
          indigenousCommunity: 'Māori',
          isFree: true,
          isPrior: true,
          isInformed: true,
          hasConsent: true,
          consentDate: Date.now(),
          contactPerson: 'Rep',
          contactMethod: 'Meeting',
          reviewFrequency: 365,
        isValid: true,
        });

        const grain = meadow.sharePollenGrain({
          communityId: testCommunity.id,
          sharedBy: testKeeperId,
          gardenerId: testKeeperId,
          embedding: createTestEmbedding(),
          metadata: createTestMetadata(),
          fpicStatus: FPICStatus.GRANTED,
          fpicConsentId: consent.id,
          restrictionLevel: RestrictionLevel.ATTRIBUTED,
          indigenousSources: ['Māori'],
        }, testKeeperId);

        const benefit = meadow.calculateBenefit(grain.id, 10000, 10);
        expect(benefit.communityShare).toBe(1000);
        expect(benefit.distributed).toBe(false);
      });

      it('should throw for non-indigenous knowledge', () => {
        const grain = meadow.sharePollenGrain({
          communityId: testCommunity.id,
          sharedBy: testKeeperId,
          gardenerId: testKeeperId,
          embedding: createTestEmbedding(),
          metadata: createTestMetadata(),
          fpicStatus: FPICStatus.EXEMPT,
          restrictionLevel: RestrictionLevel.PUBLIC,
        }, testKeeperId);

        expect(() => {
          meadow.calculateBenefit(grain.id, 10000, 10);
        }).toThrow('No indigenous sources associated');
      });
    });

    describe('distributeBenefit', () => {
      it('should record benefit distribution', () => {
        const consent = meadow.createFPICConsent({
          knowledgeId: 'knowledge-1',
          indigenousCommunity: 'Lakota',
          isFree: true,
          isPrior: true,
          isInformed: true,
          hasConsent: true,
          consentDate: Date.now(),
          contactPerson: 'Rep',
          contactMethod: 'Meeting',
          reviewFrequency: 365,
        isValid: true,
        });

        const grain = meadow.sharePollenGrain({
          communityId: testCommunity.id,
          sharedBy: testKeeperId,
          gardenerId: testKeeperId,
          embedding: createTestEmbedding(),
          metadata: createTestMetadata(),
          fpicStatus: FPICStatus.GRANTED,
          fpicConsentId: consent.id,
          restrictionLevel: RestrictionLevel.ATTRIBUTED,
          indigenousSources: ['Lakota'],
        }, testKeeperId);

        const benefit = meadow.calculateBenefit(grain.id, 10000, 10);
        const distributed = meadow.distributeBenefit(benefit.id, 'Bank Transfer', testKeeperId);

        expect(distributed.distributed).toBe(true);
        expect(distributed.distributionMethod).toBe('Bank Transfer');
        expect(distributed.distributionDate).toBeDefined();
      });
    });
  });

  describe('Discovery', () => {
    beforeEach(() => {
      // Create multiple grains for testing
      meadow.sharePollenGrain({
        communityId: testCommunity.id,
        sharedBy: testKeeperId,
        gardenerId: testKeeperId,
        embedding: createTestEmbedding(),
        metadata: createTestMetadata({
          agentTypes: ['test-agent', 'planning-agent'],
        }),
        fpicStatus: FPICStatus.EXEMPT,
        restrictionLevel: RestrictionLevel.PUBLIC,
      }, testKeeperId);
    });

    describe('search', () => {
      it('should search all grains when no filters', () => {
        const results = meadow.search({});
        expect(results.length).toBeGreaterThan(0);
      });

      it('should filter by query', () => {
        const results = meadow.search({ query: 'test' });
        expect(results.length).toBeGreaterThan(0);
      });

      it('should filter by communities', () => {
        const results = meadow.search({ communities: [testCommunity.id] });
        expect(results.length).toBeGreaterThan(0);
      });

      it('should filter by restriction level', () => {
        const results = meadow.search({
          restrictionLevel: RestrictionLevel.ATTRIBUTED,
        });
        expect(results.every(g => g.restrictionLevel <= RestrictionLevel.ATTRIBUTED)).toBe(true);
      });

      it('should filter by creator', () => {
        const results = meadow.search({ createdBy: testKeeperId });
        expect(results.every(g => g.sharedBy === testKeeperId)).toBe(true);
      });

      it('should filter by minimum rating', () => {
        // Rate a grain
        const grains = meadow.getCommunityPollenGrains(testCommunity.id);
        if (grains.length > 0) {
          meadow.ratePollenGrain(grains[0].id, 5, anotherKeeperId);

          const results = meadow.search({ minRating: 4 });
          expect(results.every(g => (g.rating || 0) >= 4)).toBe(true);
        }
      });
    });

    describe('getRecommendations', () => {
      it('should return recommendations for user', () => {
        const recommendations = meadow.getRecommendations(anotherKeeperId, 5);
        expect(recommendations.length).toBeLessThanOrEqual(5);
      });

      it('should not recommend user\'s own grains', () => {
        const recommendations = meadow.getRecommendations(testKeeperId);
        expect(recommendations.every(r => r.pollenGrain.sharedBy !== testKeeperId)).toBe(true);
      });

      it('should include relevance score', () => {
        const recommendations = meadow.getRecommendations(anotherKeeperId);
        expect(recommendations.every(r => typeof r.relevanceScore === 'number')).toBe(true);
      });

      it('should include recommendation reason', () => {
        const recommendations = meadow.getRecommendations(anotherKeeperId);
        expect(recommendations.every(r => typeof r.reason === 'string')).toBe(true);
      });
    });

    describe('browseCommunities', () => {
      it('should return communities sorted by members', () => {
        const results = meadow.browseCommunities({
          sortBy: 'members',
          sortOrder: 'desc',
        });
        expect(results.length).toBeGreaterThan(0);
      });

      it('should exclude private communities', () => {
        meadow.createCommunity({
          name: 'Private',
          description: 'Private community',
          visibility: CommunityVisibility.PRIVATE,
          createdBy: 'creator-1',
        });

        const results = meadow.browseCommunities();
        expect(results.every(c => c.visibility !== CommunityVisibility.PRIVATE)).toBe(true);
      });

      it('should limit results', () => {
        const results = meadow.browseCommunities({ limit: 1 });
        expect(results.length).toBe(1);
      });
    });
  });

  describe('Governance', () => {
    beforeEach(() => {
      // Add another keeper as member for governance tests
      meadow.addMember(testCommunity.id, anotherKeeperId, CommunityPermission.CONTRIBUTOR);
    });

    describe('createRule', () => {
      it('should allow KEEPER to create rules', () => {
        const rule = meadow.createRule(
          testCommunity.id,
          'Test Rule',
          'This is a test rule',
          testKeeperId
        );

        expect(rule.id).toBeDefined();
        expect(rule.title).toBe('Test Rule');
        expect(rule.isActive).toBe(true);
      });

      it('should not allow non-KEEPER to create rules', () => {
        expect(() => {
          meadow.createRule(
            testCommunity.id,
            'Test Rule',
            'This is a test rule',
            anotherKeeperId
          );
        }).toThrow('Only KEEPER can create rules');
      });
    });

    describe('getRules', () => {
      it('should return community rules', () => {
        meadow.createRule(
          testCommunity.id,
          'Rule 1',
          'Description 1',
          testKeeperId
        );

        const rules = meadow.getRules(testCommunity.id);
        expect(rules).toHaveLength(1);
        expect(rules[0].title).toBe('Rule 1');
      });
    });

    describe('moderate', () => {
      it('should allow MODERATOR to warn users', () => {
        const action = meadow.moderate(
          testCommunity.id,
          anotherKeeperId,
          'member',
          'warn',
          'Rule violation',
          testKeeperId
        );

        expect(action.action).toBe('warn');
        expect(action.targetId).toBe(anotherKeeperId);
      });

      it('should allow MODERATOR to remove pollen grains', () => {
        // Create grain by anotherKeeperId (who is already a member)
        const grain = meadow.sharePollenGrain({
          communityId: testCommunity.id,
          sharedBy: anotherKeeperId,
          gardenerId: anotherKeeperId,
          embedding: createTestEmbedding(),
          metadata: createTestMetadata(),
          fpicStatus: FPICStatus.EXEMPT,
          restrictionLevel: RestrictionLevel.PUBLIC,
        }, anotherKeeperId);

        const action = meadow.moderate(
          testCommunity.id,
          grain.id,
          'pollen_grain',
          'remove',
          'Inappropriate content',
          testKeeperId
        );

        expect(action.action).toBe('remove');
        expect(meadow.getPollenGrain(grain.id)).toBeUndefined();
      });

      it('should ban users and prevent rejoining', () => {
        // First add a member to ban
        const userToBan = 'user-to-ban';
        meadow.addMember(testCommunity.id, userToBan, CommunityPermission.CONTRIBUTOR);

        const action = meadow.moderate(
          testCommunity.id,
          userToBan,
          'member',
          'ban',
          'Severe violation',
          testKeeperId
        );

        expect(action.action).toBe('ban');

        // Try to rejoin
        expect(() => {
          meadow.addMember(testCommunity.id, userToBan, CommunityPermission.OBSERVER);
        }).toThrow('User is banned from this community');
      });

      it('should suspend users temporarily', () => {
        const action = meadow.moderate(
          testCommunity.id,
          anotherKeeperId,
          'member',
          'suspend',
          'Temporary suspension',
          testKeeperId
        );

        expect(action.action).toBe('suspend');
        expect(action.expiresAt).toBeDefined();
        expect(action.expiresAt!).toBeGreaterThan(Date.now());
      });

      it('should not allow OBSERVER to moderate', () => {
        const observerId = 'observer-1';
        meadow.addMember(testCommunity.id, observerId, CommunityPermission.OBSERVER);

        expect(() => {
          meadow.moderate(
            testCommunity.id,
            anotherKeeperId,
            'member',
            'warn',
            'Warning',
            observerId
          );
        }).toThrow('Insufficient permissions for moderation');
      });
    });

    describe('getModerationHistory', () => {
      it('should return moderation actions for community', () => {
        meadow.moderate(
          testCommunity.id,
          anotherKeeperId,
          'member',
          'warn',
          'Warning',
          testKeeperId
        );

        const history = meadow.getModerationHistory(testCommunity.id);
        expect(history).toHaveLength(1);
        expect(history[0].action).toBe('warn');
      });
    });
  });

  describe('Statistics', () => {
    describe('getStats', () => {
      it('should return overall statistics', () => {
        const stats = meadow.getStats();

        expect(stats.totalCommunities).toBe(1);
        expect(stats.totalMembers).toBeGreaterThan(0);
        expect(stats.activeCommunities).toBe(1);
        expect(stats.fpicComplianceRate).toBeGreaterThanOrEqual(0);
        expect(stats.fpicComplianceRate).toBeLessThanOrEqual(1);
      });

      it('should calculate FPIC compliance rate correctly', () => {
        const consent = meadow.createFPICConsent({
          knowledgeId: 'knowledge-1',
          indigenousCommunity: 'Māori',
          isFree: true,
          isPrior: true,
          isInformed: true,
          hasConsent: true,
          consentDate: Date.now(),
          contactPerson: 'Rep',
          contactMethod: 'Meeting',
          reviewFrequency: 365,
        isValid: true,
        });

        meadow.sharePollenGrain({
          communityId: testCommunity.id,
          sharedBy: testKeeperId,
          gardenerId: testKeeperId,
          embedding: createTestEmbedding(),
          metadata: createTestMetadata(),
          fpicStatus: FPICStatus.GRANTED,
          fpicConsentId: consent.id,
          restrictionLevel: RestrictionLevel.ATTRIBUTED,
          indigenousSources: ['Māori'],
        }, testKeeperId);

        const stats = meadow.getStats();
        expect(stats.fpicComplianceRate).toBe(1);
      });
    });

    describe('getCommunityStats', () => {
      it('should return community statistics', () => {
        const stats = meadow.getCommunityStats(testCommunity.id);

        expect(stats).toBeDefined();
        expect(stats?.memberCount).toBeGreaterThan(0);
        expect(stats?.pollenGrainCount).toBeGreaterThanOrEqual(0);
        expect(stats?.isActive).toBe(true);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete knowledge sharing workflow', () => {
      // 1. Create community
      const community = meadow.createCommunity({
        name: 'Integration Test Community',
        description: 'Testing complete workflow',
        visibility: CommunityVisibility.PUBLIC,
        createdBy: testKeeperId,
      });

      // 2. Add members
      meadow.addMember(community.id, anotherKeeperId, CommunityPermission.CONTRIBUTOR);

      // 3. Create FPIC consent
      const consent = meadow.createFPICConsent({
        knowledgeId: 'knowledge-1',
        indigenousCommunity: 'Māori',
        isFree: true,
        isPrior: true,
        isInformed: true,
        hasConsent: true,
        consentDate: Date.now(),
        contactPerson: 'Representative',
        contactMethod: 'Meeting',
        conditions: ['Must include attribution in all uses'],
        reviewFrequency: 365,
        isValid: true,
      });

      // 4. Share knowledge
      const grain = meadow.sharePollenGrain({
        communityId: community.id,
        sharedBy: testKeeperId,
        gardenerId: testKeeperId,
        embedding: createTestEmbedding(),
        metadata: createTestMetadata({
          agentTypes: ['test-agent'],
        }),
        fpicStatus: FPICStatus.GRANTED,
        fpicConsentId: consent.id,
        restrictionLevel: RestrictionLevel.ATTRIBUTED,
        indigenousSources: ['Māori'],
        attributionStatement: 'Based on Māori traditional knowledge',
      }, testKeeperId);

      // 5. Rate the knowledge
      meadow.ratePollenGrain(grain.id, 5, anotherKeeperId);

      // 6. Use the knowledge
      meadow.recordUsage(grain.id);

      // 7. Calculate benefits
      const benefit = meadow.calculateBenefit(grain.id, 10000, 10);

      // 8. Distribute benefits
      meadow.distributeBenefit(benefit.id, 'Bank Transfer', testKeeperId);

      // 9. Verify statistics
      const stats = meadow.getStats();
      expect(stats.totalCommunities).toBe(2);
      expect(stats.totalPollenGrains).toBeGreaterThan(0);

      // 10. Search for knowledge
      const searchResults = meadow.search({
        communities: [community.id],
        minRating: 4,
      });
      expect(searchResults).toContain(grain);

      // 11. Get recommendations
      const recommendations = meadow.getRecommendations(anotherKeeperId);
      expect(recommendations.some(r => r.pollenGrain.id === grain.id)).toBe(true);
    });

    it('should handle moderation workflow', () => {
      // 1. Create community
      const community = meadow.createCommunity({
        name: 'Moderation Test Community',
        description: 'Testing moderation',
        visibility: CommunityVisibility.PUBLIC,
        createdBy: testKeeperId,
      });

      // 2. Add members
      const problematicUser = 'user-1';
      meadow.addMember(community.id, problematicUser, CommunityPermission.CONTRIBUTOR);

      // 3. Add moderator
      const moderatorId = 'moderator-1';
      meadow.addMember(community.id, moderatorId, CommunityPermission.MODERATOR);

      // 4. Create community rules
      meadow.createRule(
        community.id,
        'No Spam',
        'Do not share spam content',
        testKeeperId
      );

      // 5. User shares inappropriate content
      const grain = meadow.sharePollenGrain({
        communityId: community.id,
        sharedBy: problematicUser,
        gardenerId: problematicUser,
        embedding: createTestEmbedding(),
        metadata: createTestMetadata(),
        fpicStatus: FPICStatus.EXEMPT,
        restrictionLevel: RestrictionLevel.PUBLIC,
      }, problematicUser);

      // 6. Moderator removes content
      meadow.moderate(
        community.id,
        grain.id,
        'pollen_grain',
        'remove',
        'Spam content',
        moderatorId
      );

      // 7. Moderator warns user
      const warning = meadow.moderate(
        community.id,
        problematicUser,
        'member',
        'warn',
        'First warning for spam',
        moderatorId
      );

      expect(warning.action).toBe('warn');

      // 8. Verify content removed
      expect(meadow.getPollenGrain(grain.id)).toBeUndefined();

      // 9. Check moderation history
      const history = meadow.getModerationHistory(community.id);
      expect(history.length).toBe(2);
    });
  });
});
