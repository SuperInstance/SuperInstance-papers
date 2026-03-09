# Tokenization Protocol - Quick Reference

**Breakdown Engine Round 2 - Quick Start Guide**

---

## Protocol at a Glance

```
Input Text → [Tokenization] → [Token Flow] → [Attention] → [Embeddings] → Reasoning
     ↓             ↓               ↓            ↓            ↓              ↓
  Tokens     Trajectories    Patterns      Clusters     Decisions
```

---

## Core Concepts

### 5-Layer Protocol Stack

1. **Tokenization Disclosure** - Raw text → tokens
2. **Token Flow Mapping** - Token trajectories through layers
3. **Attention Patterns** - Which tokens attend to which
4. **Embedding Space** - How tokens cluster semantically
5. **Reasoning Integration** - Map tokens to 18 reasoning types

---

## Quick Start Examples

### 1. Get Tokenization Disclosure

```typescript
import { TokenizationService } from '@polln/tokenization';

const service = new TokenizationService();

const disclosure = await service.discloseTokenization(
  "The quick brown fox",
  "gpt-4-turbo"
);

console.log(disclosure.tokens);
// [
//   {id: 464, text: "The", position: 0, ...},
//   {id: 4280, text: " quick", position: 1, ...},
//   {id: 10864, text: " brown", position: 2, ...},
//   {id: 26376, text: " fox", position: 3, ...}
// ]
```

### 2. Extract Token Flow

```typescript
const flow = await service.extractTokenFlow(
  "Explain quantum computing",
  "claude-3-opus"
);

console.log(flow.token_trajectories[0].layer_states);
// Shows how "quantum" transforms through each layer
```

### 3. Get Attention Patterns

```typescript
const attention = await service.extractAttentionPatterns(
  "Compare AI and ML",
  "gemini-pro"
);

console.log(attention.layers[0].heads[0].specialization);
// {primary_role: "comparison", secondary_roles: ["semantics"]}
```

### 4. Visualize Embeddings

```typescript
const embeddings = await service.visualizeEmbeddings(
  "Machine learning is fascinating",
  "llama-3-70b"
);

console.log(embeddings.clusters);
// Shows semantic clusters of related tokens
```

### 5. Map to Reasoning Steps

```typescript
const reasoning = await service.mapTokensToReasoning(
  "Analyze the data before deciding"
);

console.log(reasoning.contributing_tokens);
// Shows which tokens trigger which reasoning types
```

---

## Supported LLMs

| LLM | Tokenization | Layers | Heads | Status |
|-----|--------------|--------|-------|--------|
| **GPT-4 Turbo** | BPE | Variable | Variable | ✅ Supported |
| **Claude 3 Opus** | BPE | Variable | Variable | ✅ Supported |
| **Gemini Pro** | SentencePiece | Variable | Variable | ✅ Supported |
| **LLaMA 3 70B** | SentencePiece | 80 | 8 | ✅ Supported |
| **BERT** | WordPiece | 12 | 12 | ✅ Supported |

---

## Protocol Message Format

### Basic Disclosure

```json
{
  "version": "1.0",
  "llm_id": "gpt-4-turbo",
  "timestamp": 1709920800000,
  "disclosure_id": "td_20240308_001",
  "input_text": "Your text here",
  "tokens": [...],
  "strategy": {...},
  "stats": {...}
}
```

### Token Flow

```json
{
  "disclosure_id": "tf_20240308_001",
  "token_trajectories": [
    {
      "token_id": 4280,
      "layer_states": [
        {"layer": 0, "embedding": [...], ...},
        {"layer": 1, "embedding": [...], ...}
      ]
    }
  ]
}
```

### Attention Patterns

```json
{
  "disclosure_id": "attn_20240308_001",
  "layers": [
    {
      "layer_number": 0,
      "heads": [
        {
          "head_number": 0,
          "pattern_type": "local",
          "specialization": {...}
        }
      ]
    }
  ]
}
```

---

## Reasoning Step Integration

### 18 Reasoning Types

| Type | Token Pattern | Example |
|------|---------------|---------|
| **Decomposition** | Structural tokens | "and", "or", "but" |
| **Analysis** | Descriptive tokens | "analyze", "examine" |
| **Synthesis** | Integration tokens | "combine", "merge" |
| **Evaluation** | Comparative tokens | "better", "worse" |
| **Decision** | Modal tokens | "should", "must" |
| **Planning** | Temporal tokens | "first", "then" |
| **Validation** | Check tokens | "verify", "confirm" |
| **Explanation** | Causal tokens | "because", "therefore" |
| **Prioritization** | Order tokens | "most", "least" |
| **Information Retrieval** | Query tokens | "what", "how" |
| **Iteration** | Repetitive tokens | "again", "retry" |
| **Meta-Cognition** | Self-reflection | "I think", "believe" |
| **Abstraction** | General tokens | "concept", "idea" |
| **Concretization** | Specific tokens | "example", "instance" |
| **Generalization** | Broad tokens | "always", "never" |
| **Specialization** | Narrow tokens | "specifically", "precisely" |
| **Analogy** | Comparison tokens | "like", "similar" |
| **Reflection** | Review tokens | "consider", "reflect" |

---

## Integration with POLLN

### KV-Cache System

```typescript
// Use token flow to optimize KV-cache
const flow = await service.extractTokenFlow(input, model);
const cacheOptimization = kvCacheOptimizer.optimize(flow);
```

### ANN Index

```typescript
// Use embeddings for similarity search
const embeddings = await service.visualizeEmbeddings(input, model);
const similar = annIndex.search(embeddings.embeddings[0].embedding);
```

### Transformer Tiles

```typescript
// Use attention patterns to guide tile specialization
const attention = await service.extractAttentionPatterns(input, model);
const tileSpecialization = transformerTile.specialize(attention);
```

### Meta Tiles

```typescript
// Use token-reasoning mapping for META differentiation
const reasoning = await service.mapTokensToReasoning(input);
const metaDifferentiation = metaTile.differentiate(reasoning);
```

---

## Visualization Tools

### Token Flow Visualization

```typescript
import { TokenFlowVisualizer } from '@polln/visualization';

const visualizer = new TokenFlowVisualizer();

const viz = await visualizer.visualizeFlow(tokenFlow);
// Generates interactive D3.js visualization
```

### Attention Heatmap

```typescript
import { AttentionHeatmap } from '@polln/visualization';

const heatmap = new AttentionHeatmap();

const plot = await heatmap.plot(attentionPatterns);
// Generates matplotlib-style heatmap
```

### Embedding Projection

```typescript
import { EmbeddingProjector } from '@polln/visualization';

const projector = new EmbeddingProjector();

const projection = await projector.projectTSNE(embeddings);
// Generates 2D t-SNE projection
```

---

## Performance Tips

### Optimize for Speed

```typescript
// Use caching for repeated tokenizations
const cachedDisclosure = await service.discloseTokenizationCached(
  input,
  model
);

// Batch processing
const disclosures = await service.discloseTokenizationBatch(
  inputs,
  model
);
```

### Optimize for Memory

```typescript
// Stream large texts
const stream = await service.discloseTokenizationStream(
  largeText,
  model,
  {chunkSize: 1000}
);

for await (const chunk of stream) {
  processChunk(chunk);
}
```

---

## Common Patterns

### Detect Attention Sinks

```typescript
const attention = await service.extractAttentionPatterns(input, model);
const sinks = service.detectAttentionSinks(attention);

// Tokens that receive disproportionate attention
// Usually initial tokens (BOS) or special tokens
```

### Find Redundant Tokens

```typescript
const embeddings = await service.visualizeEmbeddings(input, model);
const redundant = service.findRedundantTokens(embeddings);

// Tokens with high semantic similarity
// Good candidates for compression
```

### Track Reasoning Transitions

```typescript
const reasoning = await service.mapTokensToReasoning(input);
const transitions = service.analyzeTransitions(reasoning);

// How reasoning shifts between types
// Identifies decision points in reasoning chains
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **Token count mismatch** | Different tokenizers | Use cross-LLM mapping |
| **Missing embeddings** | LLM not supported | Check LLM adapter availability |
| **Slow disclosure** | Large text | Use streaming or caching |
| **Invalid disclosure** | Schema validation failed | Check JSON schema compliance |

### Debug Mode

```typescript
const disclosure = await service.discloseTokenization(
  input,
  model,
  {debug: true}
);

// Includes verbose logging and intermediate results
```

---

## API Reference

### Core Methods

```typescript
class TokenizationService {
  // Tokenization
  discloseTokenization(input: string, model: string): Promise<TokenizationDisclosure>

  // Token Flow
  extractTokenFlow(input: string, model: string): Promise<TokenFlowMap>

  // Attention
  extractAttentionPatterns(input: string, model: string): Promise<AttentionPatternDisclosure>

  // Embeddings
  visualizeEmbeddings(input: string, model: string): Promise<EmbeddingSpaceDisclosure>

  // Reasoning
  mapTokensToReasoning(input: string): Promise<TokenReasoningMap>

  // Cross-LLM
  mapTokensAcrossLLMs(tokenId: number, fromLLM: string, toLLM: string): Promise<TokenMapping>
}
```

---

## File Locations

### Documentation

```
docs/research/spreadsheet/
├── BREAKDOWN_R2_TOKENIZATION_PROTOCOL.md    # Full specification (50+ pages)
├── BREAKDOWN_R2_SUMMARY.md                   # Executive summary
└── BREAKDOWN_R2_QUICKREF.md                  # This file
```

### Implementation

```
src/tokenization/
├── core/
│   ├── protocol.ts              # Core protocol definitions
│   ├── tokenization.ts          # Tokenization disclosure
│   ├── token-flow.ts            # Token flow extraction
│   ├── attention.ts             # Attention patterns
│   └── embeddings.ts            # Embedding space
├── adapters/
│   ├── gpt4.ts                  # GPT-4 adapter
│   ├── claude.ts                # Claude adapter
│   ├── gemini.ts                # Gemini adapter
│   └── llama.ts                 # LLaMA adapter
├── reasoning/
│   └── reasoning-mapper.ts      # Reasoning integration
└── visualization/
    ├── flow-viz.ts              # Token flow visualization
    ├── attention-viz.ts         # Attention heatmap
    └── embedding-viz.ts         # Embedding projection
```

---

## Quick Commands

```bash
# Install dependencies
npm install @polln/tokenization

# Run examples
npm run example:tokenization
npm run example:attention
npm run example:embeddings

# Run tests
npm test src/tokenization

# Generate documentation
npm run docs:tokenization
```

---

## Next Steps

1. ✅ Read the full protocol specification
2. ✅ Try the quick start examples
3. ✅ Explore the visualization tools
4. ✅ Integrate with your POLLN agents
5. ✅ Provide feedback and improvements

---

## Support

- **Documentation**: See full protocol specification
- **Examples**: Check `/examples/tokenization/`
- **Issues**: GitHub issue tracker
- **Discussions**: POLLN Discord server

---

**Quick Reference Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: ✅ Ready for Use

---

*Need more details? See the full protocol specification:*
**`BREAKDOWN_R2_TOKENIZATION_PROTOCOL.md`**
