/**
 * POLLN KV-Meadow System Tests
 * Comprehensive tests for KV-cache marketplace, pollen exchange, and community pool
 */

import {
  AnchorMarket,
  AnchorPollenManager,
  CommunityAnchorPool,
  type AnchorListing,
  type AnchorRequest,
  type AnchorPollen,
  type CommunityAnchor,
  type MarketplaceStats,
  type CommunityPoolStats,
  type ProvenanceData,
} from '../kvmeadow';
import type { KVAnchor, KVCacheSegment } from '../kvanchor';

// Helper to create a test KV anchor
function createTestKVAnchor(overrides?: Partial<KVAnchor>): KVAnchor {
  return {
    anchorId: overrides?.anchorId || `anchor-${Math.random().toString(36).substr(2, 9)}`,
    layerId: overrides?.layerId || 0,
    segmentId: overrides?.segmentId || 'segment-1',
    compressedKeys: new Float32Array([1, 2, 3, 4]),
    compressedValues: new Float32Array([5, 6, 7, 8]),
    embedding: overrides?.embedding || new Array(128).fill(0).map(() => Math.random()),
    sourceSegmentId: 'source-seg-1',
    sourceAgentId: 'agent-1',
    usageCount: overrides?.usageCount || 0,
    lastUsed: overrides?.lastUsed || Date.now(),
    qualityScore: overrides?.qualityScore || 0.8,
    compressionRatio: overrides?.compressionRatio || 2.5,
    createdAt: overrides?.createdAt || Date.now(),
    updatedAt: overrides?.updatedAt || Date.now(),
  };
}

// Helper to create a test KV cache segment
function createTestKVCacheSegment(): KVCacheSegment {
  return {
    layerId: 0,
    segmentId: `segment-${Math.random().toString(36).substr(2, 9)}`,
    tokens: [1, 2, 3, 4, 5],
    keyCache: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
    valueCache: [[10, 11, 12], [13, 14, 15], [16, 17, 18]],
    metadata: {
      createdAt: Date.now(),
      modelHash: 'model-hash-1',
      agentId: 'agent-1',
      conversationId: 'conv-1',
      turnNumber: 1,
      position: 0,
      length: 5,
    },
  };
}

describe('KV-Meadow System', () => {
  describe('AnchorMarket', () => {
    let market: AnchorMarket;
    let testSellerId: string;
    let testBuyerId: string;
    let testAnchor: KVAnchor;

    beforeEach(() => {
      market = new AnchorMarket();
      testSellerId = 'seller-1';
      testBuyerId = 'buyer-1';
      testAnchor = createTestKVAnchor();
    });

    describe('Listing Management', () => {
      describe('listAnchor', () => {
        it('should list an anchor for trade', () => {
          const listing = market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code',
            tags: ['typescript', 'utility'],
            price: 100,
          });

          expect(listing.id).toBeDefined();
          expect(listing.anchorId).toBe(testAnchor.anchorId);
          expect(listing.listedBy).toBe(testSellerId);
          expect(listing.contextType).toBe('code');
          expect(listing.price).toBe(100);
          expect(listing.tags).toContain('typescript');
          expect(listing.isActive).toBe(true);
        });

        it('should calculate default price when not provided', () => {
          const listing = market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code',
          });

          expect(listing.price).toBeGreaterThan(0);
          expect(listing.price).toBeLessThanOrEqual(10000);
        });

        it('should enforce maximum listings per seller', () => {
          // Max listings is 100, so this should work
          for (let i = 0; i < 100; i++) {
            const anchor = createTestKVAnchor({ anchorId: `anchor-${i}` });
            market.listAnchor(anchor, testSellerId, { contextType: 'code' });
          }

          // This should fail
          const extraAnchor = createTestKVAnchor({ anchorId: 'anchor-extra' });
          expect(() => {
            market.listAnchor(extraAnchor, testSellerId, { contextType: 'code' });
          }).toThrow('Maximum listings reached');
        });

        it('should validate price range', () => {
          expect(() => {
            market.listAnchor(testAnchor, testSellerId, {
              contextType: 'code',
              price: 0, // Too low
            });
          }).toThrow();

          expect(() => {
            market.listAnchor(testAnchor, testSellerId, {
              contextType: 'code',
              price: 20000, // Too high
            });
          }).toThrow();
        });

        it('should set expiration date', () => {
          const expiresAt = Date.now() + 3600000; // 1 hour
          const listing = market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code',
            expiresAt,
          });

          expect(listing.expiresAt).toBe(expiresAt);
        });
      });

      describe('getListing', () => {
        it('should return listing by ID', () => {
          const listing = market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code',
          });

          const retrieved = market.getListing(listing.id);
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe(listing.id);
        });

        it('should return undefined for non-existent listing', () => {
          const retrieved = market.getListing('non-existent');
          expect(retrieved).toBeUndefined();
        });
      });

      describe('getListings', () => {
        beforeEach(() => {
          // Create multiple listings
          market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code',
            tags: ['typescript'],
          });

          market.listAnchor(createTestKVAnchor({ anchorId: 'anchor-2' }), testSellerId, {
            contextType: 'conversation',
            tags: ['chat'],
          });

          market.listAnchor(createTestKVAnchor({ anchorId: 'anchor-3' }), 'seller-2', {
            contextType: 'code',
            tags: ['python'],
          });
        });

        it('should return all listings', () => {
          const listings = market.getListings();
          expect(listings.length).toBe(3);
        });

        it('should filter by context type', () => {
          const listings = market.getListings({ contextType: 'code' });
          expect(listings.length).toBe(2);
          expect(listings.every(l => l.contextType === 'code')).toBe(true);
        });

        it('should filter by seller ID', () => {
          const listings = market.getListings({ sellerId: testSellerId });
          expect(listings.length).toBe(2);
          expect(listings.every(l => l.listedBy === testSellerId)).toBe(true);
        });

        it('should filter by minimum quality', () => {
          const listings = market.getListings({ minQuality: 0.8 });
          expect(listings.every(l => l.qualityScore >= 0.8)).toBe(true);
        });

        it('should filter by maximum price', () => {
          const listing = market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code',
            price: 50,
          });

          const listings = market.getListings({ maxPrice: 75 });
          expect(listings.some(l => l.id === listing.id)).toBe(true);
        });

        it('should filter by tags', () => {
          const listings = market.getListings({ tags: ['typescript'] });
          expect(listings.length).toBe(1);
          expect(listings[0].tags).toContain('typescript');
        });

        it('should return only active listings when activeOnly is true', () => {
          const listing = market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code',
          });

          market.cancelListing(listing.id, testSellerId);

          const activeListings = market.getListings({ activeOnly: true });
          expect(activeListings.every(l => l.id !== listing.id)).toBe(true);
        });
      });

      describe('searchListings', () => {
        beforeEach(() => {
          market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code-analysis',
            tags: ['typescript', 'static-analysis'],
          });

          market.listAnchor(createTestKVAnchor({ anchorId: 'anchor-2' }), testSellerId, {
            contextType: 'conversation',
            tags: ['chat', 'dialogue'],
          });
        });

        it('should search by context type', () => {
          const results = market.searchListings('code');
          expect(results.length).toBeGreaterThan(0);
          expect(results[0].contextType).toContain('code');
        });

        it('should search by tags', () => {
          const results = market.searchListings('typescript');
          expect(results.length).toBe(1);
        });

        it('should limit results', () => {
          const results = market.searchListings('code', 1);
          expect(results.length).toBeLessThanOrEqual(1);
        });
      });

      describe('cancelListing', () => {
        it('should allow seller to cancel their listing', () => {
          const listing = market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code',
          });

          const result = market.cancelListing(listing.id, testSellerId);
          expect(result).toBe(true);

          const updated = market.getListing(listing.id);
          expect(updated?.isActive).toBe(false);
        });

        it('should not allow non-seller to cancel listing', () => {
          const listing = market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code',
          });

          expect(() => {
            market.cancelListing(listing.id, 'other-seller');
          }).toThrow('Only seller can cancel');
        });

        it('should throw error for non-existent listing', () => {
          expect(() => {
            market.cancelListing('non-existent', testSellerId);
          }).toThrow('Listing not found');
        });
      });
    });

    describe('Request Management', () => {
      describe('createRequest', () => {
        it('should create a new request', () => {
          const request = market.createRequest(
            testBuyerId,
            'code',
            {
              minQualityScore: 0.8,
              layerIds: [0, 1],
            },
            500
          );

          expect(request.id).toBeDefined();
          expect(request.requesterId).toBe(testBuyerId);
          expect(request.contextType).toBe('code');
          expect(request.budget).toBe(500);
          expect(request.status).toBe('open');
        });

        it('should enforce maximum requests per buyer', () => {
          // Max requests is 50
          for (let i = 0; i < 50; i++) {
            market.createRequest(testBuyerId, 'code', {}, 100);
          }

          expect(() => {
            market.createRequest(testBuyerId, 'code', {}, 100);
          }).toThrow('Maximum requests reached');
        });

        it('should set expiration date', () => {
          const durationMs = 7200000; // 2 hours
          const request = market.createRequest(
            testBuyerId,
            'code',
            {},
            100,
            durationMs
          );

          expect(request.expiresAt).toBeGreaterThan(Date.now());
          expect(request.expiresAt).toBeLessThanOrEqual(Date.now() + durationMs + 1000);
        });
      });

      describe('getRequest', () => {
        it('should return request by ID', () => {
          const request = market.createRequest(testBuyerId, 'code', {}, 100);

          const retrieved = market.getRequest(request.id);
          expect(retrieved).toBeDefined();
          expect(retrieved?.id).toBe(request.id);
        });

        it('should return undefined for non-existent request', () => {
          const retrieved = market.getRequest('non-existent');
          expect(retrieved).toBeUndefined();
        });
      });

      describe('getOpenRequests', () => {
        beforeEach(() => {
          market.createRequest(testBuyerId, 'code', { minQualityScore: 0.8 }, 500);
          market.createRequest('buyer-2', 'conversation', {}, 300);
        });

        it('should return all open requests', () => {
          const requests = market.getOpenRequests();
          expect(requests.length).toBe(2);
        });

        it('should filter by context type', () => {
          const requests = market.getOpenRequests({ contextType: 'code' });
          expect(requests.length).toBe(1);
          expect(requests[0].contextType).toBe('code');
        });

        it('should filter by requester ID', () => {
          const requests = market.getOpenRequests({ requesterId: testBuyerId });
          expect(requests.length).toBe(1);
        });

        it('should filter by minimum budget', () => {
          const requests = market.getOpenRequests({ minBudget: 400 });
          expect(requests.length).toBe(1);
          expect(requests[0].budget).toBeGreaterThanOrEqual(400);
        });
      });

      describe('fillRequest', () => {
        let request: AnchorRequest;
        let listing: AnchorListing;

        beforeEach(() => {
          request = market.createRequest(
            testBuyerId,
            'code',
            { minQualityScore: 0.7 },
            200
          );

          listing = market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code',
            price: 150,
          });
        });

        it('should successfully fill a request', () => {
          const result = market.fillRequest(request.id, listing.id, testBuyerId);

          expect(result.success).toBe(true);
          expect(result.tradeId).toBeDefined();

          const updatedRequest = market.getRequest(request.id);
          expect(updatedRequest?.status).toBe('filled');
        });

        it('should fail for non-existent request', () => {
          const result = market.fillRequest('non-existent', listing.id, testBuyerId);
          expect(result.success).toBe(false);
          expect(result.reason).toBe('Request not found');
        });

        it('should fail for non-existent listing', () => {
          const result = market.fillRequest(request.id, 'non-existent', testBuyerId);
          expect(result.success).toBe(false);
          expect(result.reason).toBe('Listing not found');
        });

        it('should fail when quality requirement not met', () => {
          const lowQualityRequest = market.createRequest(
            testBuyerId,
            'code',
            { minQualityScore: 0.95 },
            200
          );

          const result = market.fillRequest(lowQualityRequest.id, listing.id, testBuyerId);
          expect(result.success).toBe(false);
          expect(result.reason).toBe('Quality score below requirement');
        });

        it('should fail when price exceeds budget', () => {
          const lowBudgetRequest = market.createRequest(
            testBuyerId,
            'code',
            {},
            100
          );

          const result = market.fillRequest(lowBudgetRequest.id, listing.id, testBuyerId);
          expect(result.success).toBe(false);
          expect(result.reason).toBe('Price exceeds budget');
        });
      });

      describe('cancelRequest', () => {
        it('should allow requester to cancel their request', () => {
          const request = market.createRequest(testBuyerId, 'code', {}, 100);

          const result = market.cancelRequest(request.id, testBuyerId);
          expect(result).toBe(true);

          const updated = market.getRequest(request.id);
          expect(updated?.status).toBe('cancelled');
        });

        it('should not allow non-requester to cancel', () => {
          const request = market.createRequest(testBuyerId, 'code', {}, 100);

          expect(() => {
            market.cancelRequest(request.id, 'other-buyer');
          }).toThrow('Only requester can cancel');
        });
      });
    });

    describe('Reputation', () => {
      describe('getReputation', () => {
        it('should return default reputation for new agent', () => {
          const reputation = market.getReputation('new-agent', 'seller');
          expect(reputation).toBe(0.5);
        });

        it('should return seller reputation', () => {
          const listing = market.listAnchor(testAnchor, testSellerId, {
            contextType: 'code',
            price: 100,
          });

          const request = market.createRequest(
            testBuyerId,
            'code',
            {},
            150
          );

          market.fillRequest(request.id, listing.id, testBuyerId);

          const reputation = market.getReputation(testSellerId, 'seller');
          expect(reputation).toBeGreaterThan(0);
        });
      });
    });

    describe('Statistics', () => {
      beforeEach(() => {
        market.listAnchor(testAnchor, testSellerId, {
          contextType: 'code',
          price: 100,
        });

        market.listAnchor(createTestKVAnchor({ anchorId: 'anchor-2' }), testSellerId, {
          contextType: 'conversation',
          price: 150,
        });

        market.createRequest(testBuyerId, 'code', {}, 200);
        market.createRequest('buyer-2', 'conversation', {}, 300);
      });

      describe('getStats', () => {
        it('should return marketplace statistics', () => {
          const stats = market.getStats();

          expect(stats.totalListings).toBe(2);
          expect(stats.activeListings).toBe(2);
          expect(stats.totalRequests).toBe(2);
          expect(stats.openRequests).toBe(2);
          expect(stats.totalTrades).toBe(0);
        });

        it('should include top context types', () => {
          const stats = market.getStats();

          expect(stats.topContextTypes.length).toBeGreaterThan(0);
          expect(stats.topContextTypes.some(t => t.type === 'code')).toBe(true);
        });
      });
    });

    describe('cleanup', () => {
      it('should clean up expired listings and requests', () => {
        const listing = market.listAnchor(testAnchor, testSellerId, {
          contextType: 'code',
          expiresAt: Date.now() - 1000, // Already expired
        });

        const request = market.createRequest(
          testBuyerId,
          'code',
          {},
          100,
          -1000 // Already expired
        );

        const cleaned = market.cleanup();
        expect(cleaned).toBeGreaterThan(0);

        const updatedListing = market.getListing(listing.id);
        expect(updatedListing?.isActive).toBe(false);
      });
    });
  });

  describe('AnchorPollenManager', () => {
    let pollenManager: AnchorPollenManager;
    let testAnchor: KVAnchor;
    let testKeeperId: string;

    beforeEach(() => {
      pollenManager = new AnchorPollenManager();
      testAnchor = createTestKVAnchor();
      testKeeperId = 'keeper-1';
    });

    describe('anchorToPollen', () => {
      it('should convert anchor to pollen grain', () => {
        const pollen = pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'code',
            tags: ['typescript'],
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
            },
          }
        );

        expect(pollen.id).toBeDefined();
        expect(pollen.anchorId).toBe(testAnchor.anchorId);
        expect(pollen.contextType).toBe('code');
        expect(pollen.lineage).toContain(testKeeperId);
        expect(pollen.provenance.originalCreator).toBe(testKeeperId);
        expect(pollen.crossPollinatedCount).toBe(0);
        expect(pollen.marketValue).toBeGreaterThan(0);
      });

      it('should set indigenous sources and FPIC status', () => {
        const pollen = pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'traditional-knowledge',
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
              indigenousSources: ['Māori'],
              fpicStatus: 'granted',
            },
          }
        );

        expect(pollen.provenance.indigenousSources).toContain('Māori');
        expect(pollen.provenance.fpicStatus).toBe('granted');
      });
    });

    describe('pollenToAnchor', () => {
      it('should convert pollen back to anchor', () => {
        const pollen = pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'code',
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
            },
          }
        );

        const retrievedAnchor = pollenManager.pollenToAnchor(pollen.id);
        expect(retrievedAnchor).toBeDefined();
        expect(retrievedAnchor?.anchorId).toBe(testAnchor.anchorId);
      });

      it('should return undefined for non-existent pollen', () => {
        const anchor = pollenManager.pollenToAnchor('non-existent');
        expect(anchor).toBeUndefined();
      });
    });

    describe('crossPollinate', () => {
      it('should cross-pollinate to another keeper', () => {
        const originalPollen = pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'code',
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
            },
          }
        );

        const targetKeeperId = 'keeper-2';
        const newPollen = pollenManager.crossPollinate(
          originalPollen.id,
          targetKeeperId,
          {
            modificationType: 'customization',
            description: 'Adapted for local use',
          }
        );

        expect(newPollen.id).not.toBe(originalPollen.id);
        expect(newPollen.gardenerId).toBe(targetKeeperId);
        expect(newPollen.lineage).toContain(testKeeperId);
        expect(newPollen.lineage).toContain(targetKeeperId);
        expect(newPollen.provenance.modificationHistory.length).toBe(1); // Only the new modification
        expect(originalPollen.crossPollinatedCount).toBe(1);
      });

      it('should throw error for non-existent pollen', () => {
        expect(() => {
          pollenManager.crossPollinate('non-existent', 'keeper-2');
        }).toThrow('Pollen grain not found');
      });
    });

    describe('getPollen', () => {
      it('should get pollen by ID', () => {
        const pollen = pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'code',
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
            },
          }
        );

        const retrieved = pollenManager.getPollen(pollen.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(pollen.id);
      });
    });

    describe('getPollenByContextType', () => {
      beforeEach(() => {
        pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'code',
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
            },
          }
        );

        pollenManager.anchorToPollen(
          createTestKVAnchor({ anchorId: 'anchor-2' }),
          'listing-2',
          {
            contextType: 'conversation',
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
            },
          }
        );
      });

      it('should get pollen by context type', () => {
        const codePollen = pollenManager.getPollenByContextType('code');
        expect(codePollen.length).toBe(1);
        expect(codePollen[0].contextType).toBe('code');

        const convPollen = pollenManager.getPollenByContextType('conversation');
        expect(convPollen.length).toBe(1);
      });
    });

    describe('getPollenByCreator', () => {
      it('should get pollen by creator', () => {
        pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'code',
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
            },
          }
        );

        const pollen = pollenManager.getPollenByCreator(testKeeperId);
        expect(pollen.length).toBe(1);
        expect(pollen[0].gardenerId).toBe(testKeeperId);
      });
    });

    describe('getLineage', () => {
      it('should track pollen lineage', () => {
        const originalPollen = pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'code',
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
            },
          }
        );

        const newPollen = pollenManager.crossPollinate(
          originalPollen.id,
          'keeper-2'
        );

        const lineage = pollenManager.getLineage(newPollen.id);
        expect(lineage.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('getProvenance', () => {
      it('should return provenance data', () => {
        const pollen = pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'traditional-knowledge',
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
              indigenousSources: ['Māori'],
              fpicStatus: 'conditional',
            },
          }
        );

        const provenance = pollenManager.getProvenance(pollen.id);
        expect(provenance).toBeDefined();
        expect(provenance?.originalCreator).toBe(testKeeperId);
        expect(provenance?.indigenousSources).toContain('Māori');
        expect(provenance?.fpicStatus).toBe('conditional');
      });
    });

    describe('searchPollen', () => {
      beforeEach(() => {
        pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'code',
            tags: ['typescript'],
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
            },
          }
        );

        pollenManager.anchorToPollen(
          createTestKVAnchor({ anchorId: 'anchor-2', qualityScore: 0.9 }),
          'listing-2',
          {
            contextType: 'conversation',
            provenance: {
              originalCreator: 'keeper-2',
              sourceColony: 'colony-2',
            },
          }
        );
      });

      it('should search by context type', () => {
        const results = pollenManager.searchPollen({ contextType: 'code' });
        expect(results.length).toBe(1);
        expect(results[0].contextType).toBe('code');
      });

      it('should filter by minimum market value', () => {
        const results = pollenManager.searchPollen({ minMarketValue: 500 });
        expect(results.every(p => p.marketValue >= 500)).toBe(true);
      });

      it('should filter by maximum cross pollinations', () => {
        const pollen = pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'code',
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
            },
          }
        );

        // Cross-pollinate a few times
        pollenManager.crossPollinate(pollen.id, 'keeper-2');
        pollenManager.crossPollinate(pollen.id, 'keeper-3');

        const results = pollenManager.searchPollen({ maxCrossPollinations: 1 });
        expect(results.every(p => p.crossPollinatedCount <= 1)).toBe(true);
      });
    });

    describe('getStats', () => {
      beforeEach(() => {
        pollenManager.anchorToPollen(
          testAnchor,
          'listing-1',
          {
            contextType: 'code',
            provenance: {
              originalCreator: testKeeperId,
              sourceColony: 'colony-1',
            },
          }
        );

        const pollen = pollenManager.anchorToPollen(
          createTestKVAnchor({ anchorId: 'anchor-2' }),
          'listing-2',
          {
            contextType: 'conversation',
            provenance: {
              originalCreator: 'keeper-2',
              sourceColony: 'colony-2',
            },
          }
        );

        pollenManager.crossPollinate(pollen.id, 'keeper-3');
      });

      it('should return pollen statistics', () => {
        const stats = pollenManager.getStats();

        expect(stats.totalPollenGrains).toBe(3); // 2 original + 1 cross-pollinated
        expect(stats.totalCrossPollinations).toBe(2); // Both original (1) and new pollen (1) have count 1
        expect(stats.averageMarketValue).toBeGreaterThan(0);
        expect(stats.topContextTypes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('CommunityAnchorPool', () => {
    let pool: CommunityAnchorPool;
    let testAnchor: KVAnchor;
    let testSubmitterId: string;

    beforeEach(() => {
      pool = new CommunityAnchorPool();
      testAnchor = createTestKVAnchor();
      testSubmitterId = 'submitter-1';
    });

    describe('submitAnchor', () => {
      it('should submit anchor to community pool', () => {
        const communityAnchor = pool.submitAnchor(
          testAnchor,
          testSubmitterId,
          'code'
        );

        expect(communityAnchor.anchorId).toBe(testAnchor.anchorId);
        expect(communityAnchor.status).toBe('pending');
        expect(communityAnchor.totalVotes).toBe(0);
        expect(communityAnchor.netScore).toBe(0);
        expect(communityAnchor.qualityRating).toBe(testAnchor.qualityScore);
      });

      it('should initialize votes array', () => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');

        const votes = pool.getVotes(testAnchor.anchorId);
        expect(votes).toEqual([]);
      });
    });

    describe('getAnchor', () => {
      it('should get anchor by ID', () => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');

        const retrieved = pool.getAnchor(testAnchor.anchorId);
        expect(retrieved).toBeDefined();
        expect(retrieved?.anchorId).toBe(testAnchor.anchorId);
      });

      it('should return undefined for non-existent anchor', () => {
        const retrieved = pool.getAnchor('non-existent');
        expect(retrieved).toBeUndefined();
      });
    });

    describe('getAnchors', () => {
      beforeEach(() => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');
        pool.submitAnchor(
          createTestKVAnchor({ anchorId: 'anchor-2', qualityScore: 0.9 }),
          testSubmitterId,
          'conversation'
        );
      });

      it('should return all anchors', () => {
        const anchors = pool.getAnchors();
        expect(anchors.length).toBe(2);
      });

      it('should filter by status', () => {
        const pendingAnchors = pool.getAnchors({ status: 'pending' });
        expect(pendingAnchors.length).toBe(2);
        expect(pendingAnchors.every(a => a.status === 'pending')).toBe(true);
      });

      it('should filter by minimum quality', () => {
        const highQualityAnchors = pool.getAnchors({ minQuality: 0.85 });
        expect(highQualityAnchors.length).toBe(1);
        expect(highQualityAnchors[0].qualityRating).toBeGreaterThanOrEqual(0.85);
      });

      it('should limit results', () => {
        const anchors = pool.getAnchors({ limit: 1 });
        expect(anchors.length).toBe(1);
      });
    });

    describe('getApprovedAnchors', () => {
      it('should return only approved anchors', () => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');

        const approvedAnchors = pool.getApprovedAnchors();
        expect(approvedAnchors.length).toBe(0);

        pool.approveAnchor(testAnchor.anchorId, 'curator-1');

        const approvedAfter = pool.getApprovedAnchors();
        expect(approvedAfter.length).toBe(1);
      });
    });

    describe('approveAnchor', () => {
      it('should approve a pending anchor', () => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');

        const approved = pool.approveAnchor(testAnchor.anchorId, 'curator-1');
        expect(approved.status).toBe('approved');
        expect(approved.curatedBy).toBe('curator-1');
        expect(approved.curatedAt).toBeDefined();
      });

      it('should throw error for non-existent anchor', () => {
        expect(() => {
          pool.approveAnchor('non-existent', 'curator-1');
        }).toThrow('Anchor not found');
      });

      it('should only approve pending anchors', () => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');
        pool.approveAnchor(testAnchor.anchorId, 'curator-1');

        expect(() => {
          pool.approveAnchor(testAnchor.anchorId, 'curator-2');
        }).toThrow('Only pending anchors can be approved');
      });
    });

    describe('retireAnchor', () => {
      it('should retire an anchor', () => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');

        const retired = pool.retireAnchor(testAnchor.anchorId, 'No longer relevant', 'curator-1');
        expect(retired.status).toBe('retired');
        expect(retired.retirementReason).toBe('No longer relevant');
        expect(retired.retiredAt).toBeDefined();
      });
    });

    describe('deprecateAnchor', () => {
      it('should deprecate an anchor', () => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');
        pool.approveAnchor(testAnchor.anchorId, 'curator-1');

        const deprecated = pool.deprecateAnchor(testAnchor.anchorId, 'Superseded by newer version');
        expect(deprecated.status).toBe('deprecated');
      });
    });

    describe('refreshAnchor', () => {
      it('should refresh anchor with new data', () => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');
        pool.deprecateAnchor(testAnchor.anchorId, 'Old version');

        const newAnchor = createTestKVAnchor({
          anchorId: testAnchor.anchorId,
          qualityScore: 0.95,
        });

        const refreshed = pool.refreshAnchor(testAnchor.anchorId, newAnchor);
        expect(refreshed.qualityRating).toBe(0.95);
        expect(refreshed.status).toBe('pending'); // Reset from deprecated
      });
    });

    describe('voting', () => {
      beforeEach(() => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');
      });

      describe('vote', () => {
        it('should cast an upvote', () => {
          const vote = pool.vote(testAnchor.anchorId, 'voter-1', 'up');
          expect(vote.vote).toBe('up');
          expect(vote.voterId).toBe('voter-1');
        });

        it('should cast a downvote', () => {
          const vote = pool.vote(testAnchor.anchorId, 'voter-1', 'down');
          expect(vote.vote).toBe('down');
        });

        it('should update existing vote', () => {
          pool.vote(testAnchor.anchorId, 'voter-1', 'up');
          const updated = pool.vote(testAnchor.anchorId, 'voter-1', 'down');

          expect(updated.vote).toBe('down');
        });

        it('should update anchor scores', () => {
          pool.vote(testAnchor.anchorId, 'voter-1', 'up');
          pool.vote(testAnchor.anchorId, 'voter-2', 'up');
          pool.vote(testAnchor.anchorId, 'voter-3', 'down');

          const anchor = pool.getAnchor(testAnchor.anchorId);
          expect(anchor?.totalVotes).toBe(3);
          expect(anchor?.netScore).toBeGreaterThan(0); // 2 up - 1 down
        });
      });

      describe('getVotes', () => {
        it('should return all votes for anchor', () => {
          pool.vote(testAnchor.anchorId, 'voter-1', 'up');
          pool.vote(testAnchor.anchorId, 'voter-2', 'down');

          const votes = pool.getVotes(testAnchor.anchorId);
          expect(votes.length).toBe(2);
        });
      });

      describe('getVoteSummary', () => {
        it('should return vote summary', () => {
          pool.vote(testAnchor.anchorId, 'voter-1', 'up');
          pool.vote(testAnchor.anchorId, 'voter-2', 'up');
          pool.vote(testAnchor.anchorId, 'voter-3', 'down');
          pool.vote(testAnchor.anchorId, 'voter-4', 'abstain');

          const summary = pool.getVoteSummary(testAnchor.anchorId);
          expect(summary.total).toBe(4);
          expect(summary.up).toBe(2);
          expect(summary.down).toBe(1);
          expect(summary.abstain).toBe(1);
          expect(summary.netScore).toBeGreaterThan(0);
        });
      });
    });

    describe('recordUsage', () => {
      it('should record anchor usage', () => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');

        const updated = pool.recordUsage(testAnchor.anchorId, 100);
        expect(updated.usageCount).toBe(1);
        expect(updated.lastUsed).toBeDefined();
        expect(updated.rewardPool).toBeGreaterThan(0);
      });
    });

    describe('distributeRewards', () => {
      it('should distribute rewards to upvoters', () => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');
        pool.recordUsage(testAnchor.anchorId, 1000); // Creates reward pool

        pool.vote(testAnchor.anchorId, 'voter-1', 'up');
        pool.vote(testAnchor.anchorId, 'voter-2', 'up');

        const rewards = pool.distributeRewards(testAnchor.anchorId);
        expect(rewards.size).toBe(2);
        expect(rewards.get('voter-1')).toBeGreaterThan(0);
        expect(rewards.get('voter-2')).toBeGreaterThan(0);

        // Pool should be cleared
        const anchor = pool.getAnchor(testAnchor.anchorId);
        expect(anchor?.rewardPool).toBe(0);
      });

      it('should return empty map for anchor with no rewards', () => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');

        const rewards = pool.distributeRewards(testAnchor.anchorId);
        expect(rewards.size).toBe(0);
      });
    });

    describe('getStats', () => {
      beforeEach(() => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');
        pool.submitAnchor(
          createTestKVAnchor({ anchorId: 'anchor-2', qualityScore: 0.9 }),
          testSubmitterId,
          'conversation'
        );

        pool.vote(testAnchor.anchorId, 'voter-1', 'up');
        pool.vote(testAnchor.anchorId, 'voter-2', 'up');

        pool.approveAnchor(testAnchor.anchorId, 'curator-1');
        pool.recordUsage(testAnchor.anchorId, 100);
      });

      it('should return community pool statistics', () => {
        const stats = pool.getStats();

        expect(stats.totalAnchors).toBe(2);
        expect(stats.approvedAnchors).toBe(1);
        expect(stats.pendingAnchors).toBe(1);
        expect(stats.totalVotes).toBeGreaterThan(0);
        expect(stats.averageQuality).toBeGreaterThan(0);
        expect(stats.totalUsageCount).toBeGreaterThan(0);
      });
    });

    describe('getTopAnchors', () => {
      beforeEach(() => {
        pool.submitAnchor(testAnchor, testSubmitterId, 'code');
        pool.submitAnchor(
          createTestKVAnchor({ anchorId: 'anchor-2', qualityScore: 0.9 }),
          testSubmitterId,
          'conversation'
        );

        pool.approveAnchor(testAnchor.anchorId, 'curator-1');
        pool.approveAnchor('anchor-2', 'curator-1');

        pool.recordUsage(testAnchor.anchorId, 100);
        pool.recordUsage('anchor-2', 200);
      });

      it('should get top anchors by quality', () => {
        const top = pool.getTopAnchors('quality', 2);
        expect(top.length).toBe(2);
        expect(top[0].qualityRating).toBeGreaterThanOrEqual(top[1].qualityRating);
      });

      it('should get top anchors by usage', () => {
        const top = pool.getTopAnchors('usage', 2);
        expect(top.length).toBe(2);
        expect(top[0].usageCount).toBeGreaterThanOrEqual(top[1].usageCount);
      });

      it('should limit results', () => {
        const top = pool.getTopAnchors('quality', 1);
        expect(top.length).toBe(1);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete marketplace to community workflow', () => {
      const market = new AnchorMarket();
      const pollenManager = new AnchorPollenManager();
      const pool = new CommunityAnchorPool();

      const sellerId = 'seller-1';
      const buyerId = 'buyer-1';
      const curatorId = 'curator-1';

      // 1. Create and list anchor
      const anchor = createTestKVAnchor();
      const listing = market.listAnchor(anchor, sellerId, {
        contextType: 'code',
        tags: ['typescript'],
        price: 200,
      });

      // 2. Create request
      const request = market.createRequest(
        buyerId,
        'code',
        { minQualityScore: 0.7 },
        500
      );

      // 3. Fill request (execute trade)
      const fillResult = market.fillRequest(request.id, listing.id, buyerId);
      expect(fillResult.success).toBe(true);

      // 4. Convert to pollen for sharing
      const pollen = pollenManager.anchorToPollen(
        anchor,
        listing.id,
        {
          contextType: 'code',
          tags: ['typescript', 'shared'],
          provenance: {
            originalCreator: sellerId,
            sourceColony: 'colony-1',
          },
        }
      );

      // 5. Cross-pollinate to another keeper
      const newKeeperId = 'keeper-2';
      const crossPollinated = pollenManager.crossPollinate(
        pollen.id,
        newKeeperId,
        {
          modificationType: 'customization',
          description: 'Localized for colony-2',
        }
      );

      expect(crossPollinated.lineage).toContain(newKeeperId);

      // 6. Submit to community pool
      const communityAnchor = pool.submitAnchor(anchor, sellerId, 'code');

      // 7. Vote on anchor
      pool.vote(communityAnchor.anchorId, curatorId, 'up');
      pool.vote(communityAnchor.anchorId, 'voter-1', 'up');
      pool.vote(communityAnchor.anchorId, 'voter-2', 'up');

      // 8. Approve anchor (auto-approved based on votes)
      const updatedAnchor = pool.getAnchor(communityAnchor.anchorId);
      expect(updatedAnchor?.status).toBe('approved');

      // 9. Record usage
      pool.recordUsage(communityAnchor.anchorId, 1000);

      // 10. Distribute rewards
      const rewards = pool.distributeRewards(communityAnchor.anchorId);
      expect(rewards.size).toBeGreaterThan(0);

      // 11. Verify statistics
      const marketStats = market.getStats();
      expect(marketStats.totalTrades).toBe(1);

      const pollenStats = pollenManager.getStats();
      expect(pollenStats.totalPollenGrains).toBe(2); // Original + cross-pollinated

      const poolStats = pool.getStats();
      expect(poolStats.approvedAnchors).toBe(1);
    });

    it('should handle indigenous knowledge with FPIC', () => {
      const pollenManager = new AnchorPollenManager();

      const anchor = createTestKVAnchor();
      const pollen = pollenManager.anchorToPollen(
        anchor,
        'listing-1',
        {
          contextType: 'traditional-knowledge',
          provenance: {
            originalCreator: 'community-elder',
            sourceColony: 'māori-colony',
            sourceContextId: 'traditional-ceremony-1',
            indigenousSources: ['Māori'],
            fpicStatus: 'granted',
          },
        }
      );

      expect(pollen.provenance.indigenousSources).toContain('Māori');
      expect(pollen.provenance.fpicStatus).toBe('granted');

      const provenance = pollenManager.getProvenance(pollen.id);
      expect(provenance?.fpicStatus).toBe('granted');
    });

    it('should handle high-volume trading scenario', () => {
      const market = new AnchorMarket();
      const sellerId = 'seller-1';
      const buyerId = 'buyer-1';

      // Create multiple listings
      const listings: AnchorListing[] = [];
      for (let i = 0; i < 10; i++) {
        const anchor = createTestKVAnchor({ anchorId: `anchor-${i}` });
        const listing = market.listAnchor(anchor, sellerId, {
          contextType: 'code',
          price: 100 + i * 10,
        });
        listings.push(listing);
      }

      // Create matching requests
      for (let i = 0; i < 10; i++) {
        const request = market.createRequest(
          buyerId,
          'code',
          {},
          200
        );

        const fillResult = market.fillRequest(
          request.id,
          listings[i].id,
          buyerId
        );
        expect(fillResult.success).toBe(true);
      }

      // Verify statistics
      const stats = market.getStats();
      expect(stats.totalTrades).toBe(10);
      expect(stats.totalVolume).toBeGreaterThan(0);

      // Verify reputation exists and is tracked
      const sellerReputation = market.getReputation(sellerId, 'seller');
      expect(sellerReputation).toBeGreaterThanOrEqual(0);
      expect(sellerReputation).toBeLessThanOrEqual(1);

      // Verify that reputation has been updated (has a different value than default)
      // The default is 0.5, and with 10 trades it should have moved somewhat
      expect(sellerReputation).not.toBe(0.5);
    });
  });
});
