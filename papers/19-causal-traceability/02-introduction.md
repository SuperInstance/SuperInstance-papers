# Introduction

## 1.1 Motivation

Modern AI systems are increasingly autonomous, making decisions that affect human lives. When these systems fail or behave unexpectedly, we need to understand why. Traditional debugging approaches fall short because emergent behaviors arise from complex interactions, not individual component failures.

### 1.1.1 The Explainability Problem

| Approach | Problem | Limitation |
|----------|---------|------------|
| Post-hoc Explanation | Reconstructs after the fact | Often incorrect |
| Model Inspection | Examines internal states | Doesn't capture context |
| Input-Output Analysis | Tests behavior | No causal insight |
| **Causal Traceability** | Records causality in real-time | Complete provenance |

### 1.1.2 Why Traceability Matters

**Question**: Why record causality instead of explaining later?

**Answer**: Three fundamental reasons:

1. **Accuracy**: Reconstruction is error-prone; recording is exact
2. **Trust**: Users trust systems they can audit
3. **Intervention**: Causal knowledge enables effective correction

## 1.2 The Causal Chain Approach

### 1.2.1 Causal Chains

Every decision has a causal chain - a sequence of (action, evidence) pairs leading from initial conditions to the current state:

```
Initial State → Agent observes → Action 1 → Environment changes
                     ↓
              Agent observes → Action 2 → Environment changes
                     ↓
              Agent observes → Action 3 (decision)
```

### 1.2.2 Traceability Requirements

For a system to be traceable, it must:

1. **Record Evidence**: What did the agent observe?
2. **Record Actions**: What did the agent do?
3. **Link Causally**: Which evidence caused which action?
4. **Preserve History**: Maintain complete chains

### 1.2.3 Traceability vs Explainability

| Aspect | Explainability | Traceability |
|--------|---------------|--------------|
| Timing | After the fact | During execution |
| Accuracy | Approximate | Exact |
| Completeness | Partial | Full |
| Trust | Low | High |
| Overhead | None | Low |

## 1.3 Positioning

### 1.3.1 Related Work

**SHAP/LIME** [Lundberg & Lee, 2017]: Post-hoc feature importance. We provide real-time causality.

**Attention Visualization** [Bahdanau et al., 2015]: Shows what model attends to. We show why.

**Causal Inference** [Pearl, 2009]: Infers causality from data. We record it directly.

**Provenance Systems** [Moreau et al., 2011]: Track data lineage. We extend to decisions.

### 1.3.2 Our Contributions

1. **Causal Chain Framework**: Mathematical formalization of decision causality
2. **Traceability Score**: Quantifiable measure of system transparency
3. **Minimal Overhead**: O(log n) per decision
4. **Intervention Framework**: Use traces for effective correction

## 1.4 Dissertation Structure

- **Chapter 2**: Mathematical Framework - Definitions, theorems, proofs
- **Chapter 3**: Implementation - Algorithms, data structures
- **Chapter 4**: Validation - Experiments, benchmarks
- **Chapter 5**: Thesis Defense - Anticipated objections
- **Chapter 6**: Conclusion - Impact and future work

---

## Bibliography

```bibtex
@inproceedings{lundberg2017unified,
  title={A Unified Approach to Interpreting Model Predictions},
  author={Lundberg, Scott M and Lee, Su-In},
  booktitle={NeurIPS},
  year={2017}
}

@book{pearl2009causality,
  title={Causality: Models, Reasoning, and Inference},
  author={Pearl, Judea},
  year={2009},
  publisher={Cambridge University Press}
}

@article{moreau2011prov,
  title={The PROV Data Model and Abstract Syntax Notation},
  author={Moreau, Luc and Missier, Paolo and others},
  journal={W3C Recommendation},
  year={2011}
}
```

---

*Part of the SuperInstance Mathematical Framework*
