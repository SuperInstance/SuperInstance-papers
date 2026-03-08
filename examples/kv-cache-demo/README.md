# KV-Cache Demo

A demonstration of POLLN's KV-cache optimization capabilities:
- Anchor-based KV-cache compression and reuse
- Similarity matching for cache hits
- Offset prediction for accurate reconstruction
- Performance comparisons between cached and non-cached approaches

## What It Does

This example simulates LLM attention KV-cache management:

1. **Anchor Pool**: Stores compressed KV-cache segments as reusable anchors
2. **Anchor Matcher**: Finds similar anchors for new requests
3. **Offset Predictor**: Predicts adjustments needed for anchor reuse
4. **Performance Tracking**: Measures cache hit rates and speedup

The system learns which cache patterns are worth sharing and optimizes for reuse.

## How to Run

```bash
# From the examples directory
cd kv-cache-demo
npm install
npm start
```

## Configuration

Edit `config.ts` to customize:

- `maxAnchors`: Maximum number of cached anchors
- `similarityThreshold`: Minimum similarity for cache hits
- `compressionRatio`: Target compression ratio
- `enableANN`: Use approximate nearest neighbor search

## Example Output

```
KV-Cache Demo
=============

Initializing KV-cache system...
  Anchor pool capacity: 100 anchors
  Similarity threshold: 0.85
  Compression method: uniform quantization
  ANN index: enabled

Simulating multi-turn conversations...

Conversation 1, Turn 1
  Query: "What is machine learning?"
  Tokens: [1234, 5678, 9012, 3456, 7890]
  No cache match (pool empty)
  Created anchor: anchor-1
  Cache stored (5 tokens)

Conversation 1, Turn 2
  Query: "Tell me more about deep learning"
  Tokens: [1234, 5678, 3456, 7890, 1111]
  Found cache match!
    Similarity: 0.92
    Token overlap: 4/5
    Anchor: anchor-1
  Cache HIT! Saved computation
  Offset predicted: [0.02, -0.01, 0.00]

Conversation 2, Turn 1
  Query: "Explain neural networks"
  Tokens: [9999, 8888, 7777, 6666, 5555]
  No cache match (below threshold)
  Created anchor: anchor-2
  Cache stored (5 tokens)

[... more conversations ...]

Performance Summary:
  Total queries: 20
  Cache hits: 12 (60%)
  Cache misses: 8 (40%)

  Anchor pool stats:
    Total anchors: 8
    Avg quality score: 0.87
    Avg compression ratio: 4.2x

  Performance comparison:
    Without cache: 20 full computations
    With cache: 8 full + 12 cached
    Speedup: 2.1x
    Memory saved: 58%

  Top anchors by usage:
    anchor-1: 4 uses (similarity: 0.91)
    anchor-3: 3 uses (similarity: 0.88)
    anchor-2: 2 uses (similarity: 0.86)

Demo complete!
```

## Key Concepts Demonstrated

1. **Anchor-Based Compression**: KV-caches stored as compressed shared references
2. **Similarity Matching**: Finding reusable cache segments via embeddings
3. **Offset Prediction**: Predicting adjustments for accurate reconstruction
4. **LRU Eviction**: Managing pool size with least-recently-used policy
5. **ANN Index**: Fast approximate nearest neighbor search

## KV-Cache Compression

The system uses several techniques:

1. **Quantization**: Reduce precision from FP32 to 4/8-bit
2. **Projection**: Lower-dimensional embedding space
3. **Clustering**: Group similar anchors for efficient lookup
4. **Delta Encoding**: Store only differences from anchor

```
Original KV-cache: [seq_len, d_model] * 2 * 4 bytes
Compressed anchor: [d_embed] * 4 bytes (quantized)
Compression ratio: ~4-10x
```

## Similarity Metrics

Anchors are matched using combined metrics:

- **Embedding Similarity**: Cosine similarity of compressed embeddings
- **Token Overlap**: Jaccard similarity of token sets
- **Positional Alignment**: Deviation in sequence positions

```
combined_score = 0.6 * embed_sim + 0.3 * token_overlap + 0.1 * position_align
```

## Performance Benefits

Cache reuse provides:

- **Computation Savings**: Skip attention computation for cached segments
- **Memory Reduction**: Store one anchor instead of many similar caches
- **Latency Improvement**: Faster inference with cache hits

Typical results:
- 2-5x speedup on repetitive queries
- 50-80% memory reduction
- 60-80% cache hit rate in conversations

## Extension Ideas

- Implement distributed anchor pool across multiple workers
- Add adaptive similarity threshold based on hit rate
- Create visualization of anchor clusters
- Integrate with real LLM attention layers
- Implement federated anchor sharing via Meadow
- Add reinforcement learning for anchor selection
