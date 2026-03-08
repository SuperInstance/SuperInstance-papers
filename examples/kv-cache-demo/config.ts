/**
 * KV-Cache Demo Configuration
 */

export const config = {
  // Anchor pool configuration
  anchorPool: {
    maxAnchors: 100,
    maxAgeMs: 3600000, // 1 hour
    minQualityScore: 0.7,
    minCompressionRatio: 2.0,
    similarityThreshold: 0.85,
    maxMatches: 5,
    keyProjectionDim: 64,
    valueProjectionDim: 64,
    quantizationBits: 8,
    embeddingDim: 128,
    enableClustering: true,
    numClusters: 10,
    clusterThreshold: 0.7,
    enableLRU: true,
    lruSampleSize: 10,
    enableAdvancedCompression: true,
    compressionMethod: 'uniform' as const,
    enableANN: true,
    annAlgorithm: 'hnsw' as const,
    annRebuildThreshold: 50,
  },

  // Matcher configuration
  matcher: {
    similarityThreshold: 0.85,
    maxMatches: 5,
    useTokenOverlap: true,
    usePositionalAlignment: true,
    embeddingWeight: 0.6,
    tokenWeight: 0.3,
    positionWeight: 0.1,
  },

  // Offset predictor configuration
  offsetPredictor: {
    windowSize: 10,
    learningRate: 0.01,
    smoothingFactor: 0.9,
    minConfidence: 0.6,
  },

  // Simulation configuration
  simulation: {
    numConversations: 5,
    turnsPerConversation: 4,
    tokenSequenceLength: 5,
    vocabularySize: 10000,
    repeatProbability: 0.6, // Probability of repeating tokens
    topicShiftProbability: 0.2, // Probability of changing topic
  },
};

export interface ConversationTurn {
  conversationId: string;
  turnNumber: number;
  query: string;
  tokens: number[];
}
