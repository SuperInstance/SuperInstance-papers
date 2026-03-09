# Confidence Scoring System - Summary

**Quick Reference Guide**

---

## What is Confidence Scoring?

POLLN induces logic from simulations (not code). Confidence scoring answers: **"How much can I trust this cell?"**

---

## The 6 Dimensions

| Dimension | What it Measures | Algorithm |
|-----------|------------------|-----------|
| **Pattern Stability** | Variance in outputs for similar inputs | Clustering variance |
| **Simulation Coverage** | % of input space simulated | Voronoi volume estimation |
| **Input Diversity** | Variety of training inputs | Pairwise distance entropy |
| **Output Consistency** | Input similarity → output similarity | Pearson correlation |
| **Edge Case Handling** | Success on adversarial inputs | Edge case test suite |
| **Historical Success** | Production track record | Weighted success rate |

---

## Threshold Matrix

| Score | Category | Action | Color |
|-------|----------|--------|-------|
| **0.95-1.00** | Excellent | Use induced, full speed | 🟢 |
| **0.85-0.95** | High | Use induced, monitor | 🟢 |
| **0.70-0.85** | Good | Use induced, fallback ready | 🟡 |
| **0.50-0.70** | Moderate | Prefer LLM, cache | 🟡 |
| **0.30-0.50** | Low | Always LLM, flag | 🟠 |
| **0.00-0.30** | Very Low | Always LLM, disable | 🔴 |

---

## Dynamic Updates

Confidence changes with:

| Trigger | Delta | Learning Rate |
|---------|-------|---------------|
| Success | +0.01 | 0.1 |
| Failure | -0.05 | 0.5 |
| Positive Feedback | +0.05 | 0.3 |
| Negative Feedback | -0.10 | 0.3 |
| Pattern Break | -0.30 | 0.8 |
| Time Decay | -0.001/day | 0.05 |

---

## User Communication

### Visual Indicators
- **Score 0.95+:** 🟢 ✓✓ Excellent
- **Score 0.85-0.95:** 🟢 ✓ High
- **Score 0.70-0.85:** 🟡 ⚠ Good
- **Score 0.50-0.70:** 🟡 ⚠⚠ Moderate
- **Score 0.30-0.50:** 🟠 ⚠⚠⚠ Low
- **Score <0.30:** 🔴 ✗ Very Low

### Display Format
```
┌─────────────────────────────────────┐
│ ⚠ 74% - Good                        │
│ ████████████████░░░░░░ 🟡           │
│                                     │
│ Pattern Stability:     92% ✓ up    │
│ Simulation Coverage:   68% ⚠ stable│
│ Input Diversity:       78% ✓ up    │
│ Output Consistency:   85% ✓ up     │
│ Edge Case Handling:   32% ⚠⚠ down  │
│ Historical Success:   95% ✓✓ stable│
│                                     │
│ ⚠ Limited simulation (68%)         │
│ ⚠ Edge case handling (32%)         │
│                                     │
│ → Add edge case tests               │
│ → Run more simulations              │
└─────────────────────────────────────┘
```

---

## System Decision Logic

```typescript
if (confidence >= 0.85) {
  useInducedLogic();
  aggressiveCache();
  minimalMonitoring();
} else if (confidence >= 0.70) {
  useInducedLogic();
  conservativeCache();
  standardMonitoring();
  prepareFallback();
} else if (confidence >= 0.50) {
  useHybridExecution(); // Both induced + LLM
  conservativeCache();
  standardMonitoring();
} else {
  useLLM(); // Skip induced
  noCache();
  intensiveMonitoring();
  flagForReview();
}
```

---

## Real Examples

### Example 1: Email Classification (High)
```
Overall: 96% - Excellent ✓✓

Pattern Stability:     98% ✓
Simulation Coverage:   95% ✓
Input Diversity:       92% ✓
Output Consistency:   97% ✓
Edge Case Handling:   94% ✓
Historical Success:   96% ✓✓

All dimensions excellent. No concerns.
```

### Example 2: Text Summarization (Moderate)
```
Overall: 74% - Good ⚠

Pattern Stability:     82% ✓
Simulation Coverage:   68% ⚠ ← Gap
Input Diversity:       75% ✓
Output Consistency:   79% ✓
Edge Case Handling:   62% ⚠ ← Weak
Historical Success:   78% ✓

⚠ Limited simulation (68%)
⚠ Edge case handling (62%)

→ Add edge case tests
→ Test empty/long inputs
```

### Example 3: Complex Reasoning (Low)
```
Overall: 42% - Moderate ⚠⚠

Pattern Stability:     38% ⚠⚠
Simulation Coverage:   45% ⚠
Input Diversity:       52% ⚠
Output Consistency:   35% ⚠⚠
Edge Case Handling:   28% ⚠⚠⚠
Historical Success:   48% ⚠

⚠⚠ Pattern unstable (38%)
⚠⚠ Outputs inconsistent (35%)
⚠⚠ Poor edge case handling (28%)
⚠ Limited coverage (45%)

→ Task too complex for induction
→ Using LLM instead
→ Flagged for review
```

---

## Key Algorithms

### Pattern Stability
```typescript
// Cluster similar inputs, measure output variance
const clusters = clusterByInputSimilarity(observations);
const variances = clusters.map(c => variance(c.outputs));
const stability = 1 - average(variances);
```

### Output Consistency
```typescript
// Correlation between input & output similarity
const correlation = pearsonCorrelation(
  inputSimilarities,
  outputSimilarities
);
const consistency = (correlation + 1) / 2;
```

### Historical Success
```typescript
// Weighted success rate with exponential decay
const weightedSuccess = sum(
  success * exp(-age / oneWeekMs)
);
return weightedSuccess / totalWeight;
```

---

## Integration Points

### 1. Cell Execution
```typescript
async function execute(input) {
  const decision = getDecision(confidence);

  let result;
  if (decision.useInduced) {
    result = await induced.execute(input);
  } else {
    result = await llm.execute(input);
  }

  // Update confidence
  confidence = scorer.update(event);
  return result;
}
```

### 2. UI Display
```typescript
<ConfidenceBadge score={confidence.overall}>
  <ProgressBar value={confidence.overall} />
  <DimensionBreakdown dimensions={confidence.dimensions} />
  <UncertaintyList uncertainty={confidence.uncertainty} />
</ConfidenceBadge>
```

### 3. Analytics
```typescript
trackEvent('confidence_score', {
  componentId: cell.id,
  overall: confidence.overall,
  dimensions: confidence.dimensions,
  trend: history.trend,
});
```

---

## Best Practices

1. **Always show confidence** - Never hide uncertainty from users
2. **Explain the WHY** - Show which dimensions are weak
3. **Provide action items** - Tell users how to improve
4. **Update frequently** - Confidence should evolve with usage
5. **Set appropriate thresholds** - Context matters (safety vs. cost)
6. **Monitor trends** - Catch degrading patterns early

---

## Quick Checklist

When implementing confidence scoring:

- [ ] Calculate all 6 dimensions
- [ ] Use appropriate weight preset for context
- [ ] Implement dynamic updates
- [ ] Show confidence to users
- [ ] Explain uncertainties
- [ ] Provide improvement suggestions
- [ ] Track history and trends
- [ ] Set up alerts for low confidence
- [ ] Implement fallback logic
- [ ] Test with edge cases

---

## References

- Full Specification: `CONFIDENCE_SCORING_SPECS.md`
- Pattern Induction: `PATTERN_INDUCTION_SPECS.md`
- Cell Types: `CELL_TYPE_SPECS.md`
- Weight System: `WEIGHT_SYSTEM_SPECS.md`

---

**Last Updated:** 2026-03-08
**Version:** 1.0.0
