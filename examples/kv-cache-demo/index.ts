/**
 * KV-Cache Demo
 *
 * Demonstrates:
 * - Anchor-based KV-cache compression
 * - Similarity matching for cache hits
 * - Offset prediction for accurate reconstruction
 * - Performance comparisons
 */

import {
  KVAnchorPool,
  AnchorMatcher,
  OffsetPredictor,
} from '../../src/core/index.js';
import { config, type ConversationTurn } from './config.js';
import { v4 as uuidv4 } from 'uuid';

let anchorPool: KVAnchorPool;
let matcher: AnchorMatcher;
let offsetPredictor: OffsetPredictor;

// Performance tracking
let totalQueries = 0;
let cacheHits = 0;
let cacheMisses = 0;
let totalComputationTime = 0;
let cachedComputationTime = 0;

/**
 * Initialize the KV-cache system
 */
async function initializeSystem(): Promise<void> {
  console.log('KV-Cache Demo');
  console.log('=============\n');

  console.log('Initializing KV-cache system...');

  // Create anchor pool
  anchorPool = new KVAnchorPool(config.anchorPool);

  console.log(`  Anchor pool capacity: ${config.anchorPool.maxAnchors} anchors`);
  console.log(`  Similarity threshold: ${config.anchorPool.similarityThreshold}`);
  console.log(`  Compression method: ${config.anchorPool.compressionMethod} quantization`);
  console.log(`  ANN index: ${config.anchorPool.enableANN ? 'enabled' : 'disabled'}`);

  // Create matcher
  matcher = new AnchorMatcher(config.matcher);

  // Create offset predictor
  offsetPredictor = new OffsetPredictor(config.offsetPredictor);

  console.log();
}

/**
 * Generate a simulated conversation turn
 */
function generateConversationTurn(
  conversationId: string,
  turnNumber: number,
  previousTokens: number[][]
): ConversationTurn {
  const tokens: number[] = [];
  const vocabSize = config.simulation.vocabularySize;
  const seqLength = config.simulation.tokenSequenceLength;

  // Decide whether to repeat tokens or generate new ones
  const shouldRepeat = Math.random() < config.simulation.repeatProbability && previousTokens.length > 0;

  if (shouldRepeat) {
    // Reuse some tokens from previous turns
    const sourceTurn = previousTokens[Math.floor(Math.random() * previousTokens.length)];
    const overlapSize = Math.floor(Math.random() * (seqLength - 1)) + 1;

    for (let i = 0; i < overlapSize; i++) {
      tokens.push(sourceTurn[i]);
    }

    // Add some new tokens
    for (let i = overlapSize; i < seqLength; i++) {
      tokens.push(Math.floor(Math.random() * vocabSize));
    }
  } else {
    // Generate entirely new tokens
    for (let i = 0; i < seqLength; i++) {
      tokens.push(Math.floor(Math.random() * vocabSize));
    }
  }

  // Generate a query string (simplified)
  const query = generateQueryString(tokens);

  return {
    conversationId,
    turnNumber,
    query,
    tokens,
  };
}

/**
 * Generate a query string from tokens
 */
function generateQueryString(tokens: number[]): string {
  const phrases = [
    'What is', 'Tell me about', 'Explain', 'How does', 'Why',
    'Describe', 'Compare', 'Analyze', 'Discuss', 'Define'
  ];
  const topics = [
    'machine learning', 'deep learning', 'neural networks', 'AI',
    'data science', 'algorithms', 'programming', 'software',
    'computer vision', 'natural language', 'robotics', 'automation'
  ];

  const phrase = phrases[tokens[0] % phrases.length];
  const topic = topics[tokens[1] % topics.length];

  return `${phrase} ${topic}?`;
}

/**
 * Process a conversation turn
 */
async function processTurn(turn: ConversationTurn): Promise<void> {
  console.log(`Conversation ${turn.conversationId}, Turn ${turn.turnNumber}`);
  console.log(`  Query: "${turn.query}"`);
  console.log(`  Tokens: [${turn.tokens.slice(0, 5).join(', ')}${turn.tokens.length > 5 ? ',...' : ''}]`);

  totalQueries++;

  // Create a mock KV-cache segment
  const mockSegment = createMockKVSegment(turn);

  // Try to find matching anchor
  const startTime = Date.now();
  const matches = matcher.findMatches(anchorPool, mockSegment);
  const matchTime = Date.now() - startTime;

  if (matches.length > 0 && matches[0].similarity >= config.matcher.similarityThreshold) {
    // Cache hit
    cacheHits++;

    const bestMatch = matches[0];
    console.log(`  Found cache match!`);
    console.log(`    Similarity: ${bestMatch.similarity.toFixed(2)}`);
    console.log(`    Token overlap: ${bestMatch.tokenOverlap}/${turn.tokens.length}`);
    console.log(`    Anchor: ${bestMatch.anchor.anchorId}`);

    console.log(`  Cache HIT! Saved computation`);

    // Predict offset
    const offset = offsetPredictor.predictOffset(bestMatch.anchor, mockSegment);
    console.log(`  Offset predicted: [${offset.predictedOffset[0].slice(0, 3).map(v => v.toFixed(2)).join(', ')}...]`);
    console.log(`  Confidence: ${offset.confidence.toFixed(2)}`);

    // Update anchor usage
    anchorPool.updateUsage(bestMatch.anchor.anchorId);

    // Track time (cached is faster)
    cachedComputationTime += matchTime;
  } else {
    // Cache miss
    cacheMisses++;

    if (matches.length > 0) {
      console.log(`  No cache match (below threshold)`);
      console.log(`    Best similarity: ${matches[0].similarity.toFixed(2)}`);
    } else {
      console.log(`  No cache match (pool empty or no matches)`);
    }

    // Create new anchor
    const anchor = anchorPool.addAnchor(mockSegment);
    console.log(`  Created anchor: ${anchor.anchorId}`);
    console.log(`  Cache stored (${turn.tokens.length} tokens)`);

    // Track time (full computation)
    totalComputationTime += matchTime + 100; // Simulated computation time
  }

  console.log();
}

/**
 * Create a mock KV-cache segment
 */
function createMockKVSegment(turn: ConversationTurn): any {
  const embeddingDim = config.anchorPool.embeddingDim;
  const keyDim = config.anchorPool.keyProjectionDim;
  const valueDim = config.anchorPool.valueProjectionDim;

  // Generate mock key and value caches
  const keyCache: number[][] = [];
  const valueCache: number[][] = [];

  for (let i = 0; i < turn.tokens.length; i++) {
    const keyRow: number[] = [];
    const valueRow: number[] = [];

    for (let j = 0; j < keyDim; j++) {
      keyRow.push((Math.random() - 0.5) * 2);
    }

    for (let j = 0; j < valueDim; j++) {
      valueRow.push((Math.random() - 0.5) * 2);
    }

    keyCache.push(keyRow);
    valueCache.push(valueRow);
  }

  // Generate embedding
  const embedding: number[] = [];
  for (let i = 0; i < embeddingDim; i++) {
    embedding.push((Math.random() - 0.5) * 2);
  }

  return {
    layerId: 0,
    segmentId: uuidv4(),
    tokens: turn.tokens,
    keyCache,
    valueCache,
    metadata: {
      createdAt: Date.now(),
      modelHash: 'mock-model-v1',
      agentId: turn.conversationId,
      conversationId: turn.conversationId,
      turnNumber: turn.turnNumber,
      position: 0,
      length: turn.tokens.length,
    },
    embedding,
  };
}

/**
 * Display performance summary
 */
function displayPerformanceSummary(): void {
  console.log('Performance Summary:');
  console.log(`  Total queries: ${totalQueries}`);
  console.log(`  Cache hits: ${cacheHits} (${((cacheHits / totalQueries) * 100).toFixed(0)}%)`);
  console.log(`  Cache misses: ${cacheMisses} (${((cacheMisses / totalQueries) * 100).toFixed(0)}%)`);
  console.log();

  // Anchor pool stats
  const poolStats = anchorPool.getStats();
  console.log('  Anchor pool stats:');
  console.log(`    Total anchors: ${poolStats.anchorCount}`);
  console.log(`    Avg quality score: ${poolStats.avgQualityScore.toFixed(2)}`);
  console.log(`    Avg compression ratio: ${poolStats.avgCompressionRatio.toFixed(1)}x`);
  console.log();

  // Performance comparison
  const speedup = totalQueries / (cacheMisses + cacheHits * 0.1);
  const memorySaved = (cacheHits / totalQueries) * (1 - 1 / config.anchorPool.minCompressionRatio);

  console.log('  Performance comparison:');
  console.log(`    Without cache: ${totalQueries} full computations`);
  console.log(`    With cache: ${cacheMisses} full + ${cacheHits} cached`);
  console.log(`    Speedup: ${speedup.toFixed(1)}x`);
  console.log(`    Memory saved: ${(memorySaved * 100).toFixed(0)}%`);
  console.log();

  // Top anchors
  const topAnchors = anchorPool.getTopAnchors(5);
  console.log('  Top anchors by usage:');

  for (let i = 0; i < topAnchors.length; i++) {
    const anchor = topAnchors[i];
    console.log(
      `    ${i + 1}. ${anchor.anchorId}: ${anchor.usageCount} uses ` +
      `(quality: ${anchor.qualityScore.toFixed(2)})`
    );
  }

  console.log();
}

/**
 * Run the demo
 */
async function runDemo(): Promise<void> {
  await initializeSystem();

  console.log('Simulating multi-turn conversations...');
  console.log();

  const tokenHistory: number[][] = [];

  // Generate conversations
  for (let convId = 1; convId <= config.simulation.numConversations; convId++) {
    const conversationId = `conv-${convId}`;

    for (let turnNum = 1; turnNum <= config.simulation.turnsPerConversation; turnNum++) {
      const turn = generateConversationTurn(conversationId, turnNum, tokenHistory);
      await processTurn(turn);

      tokenHistory.push(turn.tokens);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear token history between conversations (topic shift)
    if (Math.random() < config.simulation.topicShiftProbability) {
      tokenHistory.length = 0;
    }
  }

  // Display summary
  displayPerformanceSummary();

  console.log('Demo complete!');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { runDemo };
