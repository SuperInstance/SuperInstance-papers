# Round 1 Agent: Privacy-Preserving Learning Researcher

**Languages**: English, Japanese (プライバシー保護学習), Chinese (隐私保护学习), German (privatsphäre-schutzendes Lernen), French (apprentissage préservant la confidentialité), Spanish (aprendizaje con privacidad), Korean (프라이버시 보존 학습), Russian (конфиденциальное обучение)

---

## Mission

Research privacy-preserving machine learning: differential privacy, federated learning security, gradient inversion attacks, and how to share behavioral patterns without exposing personal data.

---

## Research Questions

1. What are all known privacy attacks on federated learning?
2. How does differential privacy work and what are the tradeoffs?
3. Can embeddings (pollen grains) be used to identify individuals?
4. What privacy guarantees are actually achievable?
5. How do we implement privacy accounting?

---

## Critical Context

> "Privacy claims ignore extensive literature on FL vulnerabilities... Gradient inversion, membership inference, property inference attacks not addressed." - Final Synthesis

This is a KNOWN vulnerability. Our research must find real solutions.

---

## Search Terms by Language

| Language | Search Terms |
|----------|--------------|
| English | "differential privacy", "federated learning attacks", "gradient inversion", "membership inference", "model inversion" |
| Japanese | "差分プライバシー", "連合学習 攻撃", "勾配 inversion", "メンバーシップ推論" |
| Chinese | "差分隐私", "联邦学习攻击", "梯度反转", "成员推断" |
| German | "differentelle Privatsphäre", "Federated Learning Angriffe", "Gradienteninversion" |
| French | "confidentialité différentielle", "attaques fédérées", "inversion de gradient" |
| Spanish | "privacidad diferencial", "ataques aprendizaje federado", "inversión de gradiente" |
| Korean | "차등 프라이버시", "연합 학습 공격", "그라디언트 반전" |
| Russian | "дифференциальная приватность", "атаки на федеративное обучение" |

---

## Known Attack Vectors to Research

### 1. Gradient Inversion Attack
- Zhu et al. (2019) "Deep Leakage from Gradients"
- Can reconstruct training data from gradients
- Mitigations: gradient noise, compression

### 2. Membership Inference Attack
- Shokri et al. (2017)
- Determine if specific data was in training set
- Mitigations: differential privacy, regularization

### 3. Model Inversion Attack
- Fredrikson et al. (2015)
- Reconstruct training data from model outputs
- Mitigations: output perturbation, access limits

### 4. Property Inference Attack
- Infer properties of training distribution
- Mitigations: adversarial training, DP

### 5. Embedding Reidentification
- Can embeddings identify individuals?
- k-anonymity, l-diversity requirements

---

## Differential Privacy Deep Dive

```
(ε, δ)-DIFFERENTIAL PRIVACY:

A mechanism M satisfies (ε, δ)-DP if for all neighboring datasets D, D':

P[M(D) ∈ S] ≤ exp(ε) · P[M(D') ∈ S] + δ

Parameters:
- ε (epsilon): Privacy budget (smaller = more private)
- δ (delta): Probability of privacy failure

For pollen grains, we add Gaussian noise:
grain' = grain + N(0, σ²I)
where σ = sqrt(2 * ln(1.25/δ)) / ε

Tradeoff:
- Lower ε = more privacy, less utility
- Privacy budget depletes with each query
- Need privacy accounting
```

---

## Deliverables

1. **Attack Catalog** - All known attacks with mitigations
2. **DP Implementation Guide** - How to implement differential privacy
3. **Privacy Accounting System** - How to track budget
4. **Embedding Privacy Analysis** - Can pollen grains identify keepers?
5. **Privacy Budget Recommendations** - What ε, δ to use

---

## Key Questions for POLLN

1. What ε, δ should we use for pollen grain sharing?
2. How do we do privacy accounting across operations?
3. Can we guarantee embeddings don't leak identity?
4. What's the privacy-utility tradeoff for our use case?
5. How do we handle privacy for federated learning?

---

## Output Format

```markdown
## Attack: [Name]
**Paper**: [Citation]
**Risk Level**: [Low/Medium/High/Critical]

### Description
[What does this attack do?]

### Feasibility
[How hard is it to execute?]

### Mitigation
[How do we prevent it?]

### POLLN Impact
[What's our exposure?]
```

---

## Report Back

After completing research, update:
- `docs/research/privacy-attacks.md`
- `.agents/privacy-analyst.md` (with findings)
- `docs/ARCHITECTURE.md` (privacy sections)

Then report findings to Orchestrator for synthesis.
