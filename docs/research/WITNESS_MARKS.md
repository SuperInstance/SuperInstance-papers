# Witness Marks - Federated Knowledge Pointers

## Concept

When the garbage collector reduces/compresses the system, instead of silent deletion, leave a **witness mark** - a semantic signal that information was removed and the answer exists elsewhere in the federated network.

## Analogy

Like pruning weights from a neural network, but leaving a trace that says:
> "Something was here. The knowledge is federated into the fabric. Seek elsewhere."

## Implementation Patterns

### 1. Redaction Marker
```typescript
interface WitnessMark {
  type: 'redacted' | 'federated' | 'compressed';
  originalSize: number;
  compressedTo?: string;  // Reference to cold storage
  federatedNodes?: string[];  // Which nodes might have this info
  timestamp: number;
  hash: string;  // Content hash for retrieval
}
```

### 2. Ghost References
```typescript
// Before GC: Full context
const context = { /* lots of data */ };

// After GC: Witness mark
const context = {
  __witness__: {
    marker: "🔍 Knowledge federated",
    seekAt: ["node-alpha", "node-beta"],
    contentHash: "sha256:abc123..."
  }
};
```

### 3. Semantic Compression
```typescript
// Hot memory (working)
{ fullImplementation: "...500 lines..." }

// Warm memory (ready)
{ summary: "Does X via Y pattern", witnessMark: {...} }

// Cold memory (archived)
{ witnessMark: { federated: true, seekAt: "archive://..." } }
```

## Use Cases

1. **Agent Memory Management**: When an agent's context overflows, compress with witness marks
2. **Knowledge Transfer**: Signal to next-generation agents what knowledge exists but isn't local
3. **Cross-Agent Discovery**: "I don't know, but node-X might"
4. **Nightly Cycle**: Hot → Warm → Cold transitions with federated pointers

## Philosophy

- **Transparency**: Never silently lose information
- **Federation**: Knowledge is distributed, not centralized
- **Graceful Degradation**: System gets smaller but remains navigable
- **Self-Documenting**: The gaps tell a story

## Related Concepts

- **Stigmergic Coordination**: Pheromones fade but leave traces
- **Value Networks**: TD(λ) predictions of where knowledge lives
- **World Model**: Dreaming to reconstruct federated knowledge
- **META Tiles**: Agents that know what they don't know

## Implementation Priority

Phase 4 or later - requires:
- Stable garbage collection baseline
- Federated node discovery
- Content-addressed storage
- Cross-agent knowledge routing

---

*Created: 2026-03-07*
*Status: Concept - Future Implementation*
