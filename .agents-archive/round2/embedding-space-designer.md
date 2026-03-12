# Round 2 Agent: Embedding Space Designer

**Mission**: Design the Behavioral Embedding Space (BES) architecture with privacy preservation for pollen grain representation.

---

## Context from Round 1

Round 1 Privacy Learning research identified:
- **6 attack vectors** on federated learning
- **ε < 1.0 differential privacy** required for safe sharing
- **Embedding reidentification** is a critical risk
- **Behavioral embeddings CANNOT be truly anonymous**

Key challenge: How to share useful behavioral patterns without exposing keeper identity?

---

## Research Questions

1. **Embedding Architecture**
   - What dimensionality for behavioral embeddings?
   - What information should pollen grains encode?
   - How to compress agent behavior patterns?

2. **Privacy Mechanisms**
   - Differential privacy implementation details?
   - Noise calibration for ε < 1.0?
   - Privacy accounting across operations?

3. **Utility-Privacy Tradeoffs**
   - How much utility loss from DP noise?
   - Optimal dimensionality reduction?
   - Aggregation thresholds (k-anonymity)?

4. **Embedding Operations**
   - How to combine pollen grains?
   - Similarity metrics between behaviors?
   - Transfer learning across keepers?

5. **Attack Resistance**
   - Defenses against gradient inversion?
   - Defenses against membership inference?
   - Defenses against embedding reidentification?

---

## Required Outputs

1. **BES Architecture Specification**
   ```python
   class BehavioralEmbeddingSpace:
       def encode(self, agent_behavior) -> Embedding:
           pass

       def decode(self, embedding) -> BehaviorSpec:
           pass
   ```

2. **Privacy-Preserving Sharing Protocol**
   ```
   Step 1: Clip gradients
   Step 2: Add calibrated noise
   Step 3: Aggregate (k ≥ 10)
   Step 4: Dimensionality reduction
   Step 5: Release with privacy budget accounting
   ```

3. **Privacy Budget Tracker**
   - Per-keeper ε tracking
   - Privacy accounting formulas
   - Budget depletion handling

4. **Similarity Metrics**
   - Distance functions for behavioral embeddings
   - Clustering for pattern discovery
   - Cross-keeper matching

5. **Attack Analysis**
   - Threat model for each attack vector
   - Mitigation effectiveness
   - Residual risks

---

## Privacy Requirements (from Round 1)

| Attack | Mitigation | Parameters |
|--------|------------|------------|
| Gradient Inversion | DP noise | σ = √(2 ln(1.25/δ)) / ε |
| Model Inversion | Output perturbation | ε < 1.0 |
| Membership Inference | Regularization + DP | ε < 1.0 |
| Property Inference | Adversarial training | ε < 1.0 |
| Embedding Reidentification | k-anonymity + reduction | k ≥ 10, 1024 → 64 dims |
| Backdoor | Robust aggregation | Median/trimmed mean |

---

## Embedding Information Content

What should pollen grains encode?

1. **Task Performance** - How well does this pattern perform?
2. **Context Conditions** - When does this pattern work?
3. **Resource Profile** - What resources does it need?
4. **Failure Modes** - When does it break?
5. **Complementary Patterns** - What works well with it?

---

## Success Criteria

- [ ] BES architecture specified
- [ ] Privacy mechanisms designed
- [ ] Utility-privacy tradeoff analyzed
- [ ] Attack resistance evaluated
- [ ] Privacy accounting system defined
- [ ] Integration with Meadow sharing

---

## Output Location

Write findings to: `docs/research/round2-embedding-space.md`

Report synthesis to: `docs/round2-synthesis/README.md`
