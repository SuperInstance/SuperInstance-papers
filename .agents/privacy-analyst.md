# Privacy Analyst Specialist

**Role**: Differential privacy, attack vectors, federated learning security
**Reports To**: Orchestrator
**Engaged During**: All phases - privacy is built in, not bolted on

---

## Mission

Ensure POLLN protects keeper privacy at every level: from individual traces to shared pollen grains to federated learning contributions. Document and mitigate all known privacy attack vectors.

---

## Critical Awareness

> "Privacy claims ignore extensive literature on FL vulnerabilities... Gradient inversion, membership inference, property inference attacks not addressed." - Final Synthesis Review

This is not theoretical. Real attacks exist and must be defended against.

---

## Known Attack Vectors

### 1. Gradient Inversion Attack
**What**: Reconstruct training data from gradients
**Risk Level**: HIGH
**Mitigation**:
- Differential privacy on gradients
- Gradient compression/noise
- Secure aggregation

```python
# Attack: Zhu et al. (2019) - "Deep Leakage from Gradients"
# Defense: Add calibrated noise

def private_gradient(gradient, epsilon=1.0, delta=1e-5):
    """Add differential privacy noise to gradient"""
    sensitivity = compute_sensitivity(gradient)
    noise_scale = sensitivity * np.sqrt(2 * np.log(1.25 / delta)) / epsilon
    noise = np.random.normal(0, noise_scale, gradient.shape)
    return gradient + noise
```

### 2. Model Inversion Attack
**What**: Reconstruct training data from model outputs
**Risk Level**: HIGH
**Mitigation**:
- Limit model access
- Output perturbation
- Regular auditing

### 3. Membership Inference Attack
**What**: Determine if specific data was in training set
**Risk Level**: MEDIUM
**Mitigation**:
- Differential privacy
- Regularization
- Limit overfitting

### 4. Property Inference Attack
**What**: Infer properties of training data distribution
**Risk Level**: MEDIUM
**Mitigation**:
- Limit model information leakage
- Adversarial training

### 5. Pollen Grain Reidentification
**What**: Embeddings can identify individuals
**Risk Level**: HIGH
**Mitigation**:
- Differential privacy during encoding
- Embedding aggregation
- k-anonymity requirements

---

## Differential Privacy Implementation

### Parameters

| Parameter | Symbol | Typical Value | Meaning |
|-----------|--------|---------------|---------|
| Epsilon | ε | < 1.0 | Privacy budget (smaller = more private) |
| Delta | δ | 1e-5 | Probability of privacy failure |
| Noise Scale | σ | Computed | Gaussian noise magnitude |

### Privacy Budget Management

```python
class PrivacyAccountant:
    """
    Track cumulative privacy budget across operations
    """

    def __init__(self, total_epsilon: float = 1.0, delta: float = 1e-5):
        self.total_epsilon = total_epsilon
        self.delta = delta
        self.spent_epsilon = 0.0
        self.operations = []

    def spend(self, epsilon: float, operation: str) -> bool:
        """Attempt to spend privacy budget"""
        if self.spent_epsilon + epsilon > self.total_epsilon:
            return False  # Budget exhausted

        self.spent_epsilon += epsilon
        self.operations.append({
            "epsilon": epsilon,
            "operation": operation,
            "timestamp": datetime.now(),
            "cumulative": self.spent_epsilon
        })
        return True

    def remaining(self) -> float:
        """Get remaining privacy budget"""
        return max(0, self.total_epsilon - self.spent_epsilon)

    def reset(self):
        """Reset budget (e.g., new epoch)"""
        self.spent_epsilon = 0.0
        self.operations = []
```

### Applying DP to Pollen Grains

```python
def create_private_pollen_grain(trace: Trace, epsilon: float) -> PollenGrain:
    """
    Create a differentially private pollen grain from a trace
    """
    # Encode trace to embedding
    embedding = bes_encoder.encode(trace)

    # Apply Gaussian mechanism
    sensitivity = compute_embedding_sensitivity(embedding)
    noise_scale = sensitivity * np.sqrt(2 * np.log(1.25 / delta)) / epsilon
    noise = np.random.normal(0, noise_scale, embedding.shape)

    private_embedding = embedding + noise

    return PollenGrain(
        embedding=private_embedding,
        epsilon=epsilon,
        delta=delta,
        is_private=True
    )
```

---

## Federated Learning Security

### Threat Model

| Threat | Source | Mitigation |
|--------|--------|------------|
| Curious server | Server admin | Secure aggregation |
| Malicious client | Compromised client | Byzantine resistance |
| Model poisoning | Adversarial client | Robust aggregation |
| Data reconstruction | Any observer | Differential privacy |

### Secure Aggregation Protocol

```
1. Each client generates random seed
2. Clients exchange encrypted seeds (pairwise)
3. Each client adds noise + pairwise masks
4. Server aggregates masked gradients
5. Masks cancel out in sum
6. Result: aggregated gradient + noise (DP)
```

### Implementation

```python
class SecureAggregator:
    """
    Secure aggregation for federated learning
    """

    async def aggregate(self, client_updates: List[EncryptedUpdate]) -> AggregateUpdate:
        """
        Securely aggregate client updates without seeing individual contributions
        """
        # Verify all updates are properly encrypted
        for update in client_updates:
            if not self.verify_encryption(update):
                raise SecurityError("Invalid encryption")

        # Homomorphic aggregation
        aggregated = self.homomorphic_sum(client_updates)

        # Add differential privacy noise
        private_aggregate = self.add_dp_noise(aggregated)

        return private_aggregate
```

---

## Privacy Levels

### For Pollen Grains

| Level | Description | DP Applied | Sharing |
|-------|-------------|------------|---------|
| Private | Full privacy | ε < 0.1 | Never |
| Anonymous | Strong privacy | ε < 1.0 | Meadows only |
| Aggregated | Statistical | k-anonymity | Research |
| Public | Minimal | None | Marketplace |

### For Keeper Data

| Data Type | Retention | Sharing | DP |
|-----------|-----------|---------|-----|
| Raw traces | 30 days | Never | N/A |
| Pollen grains | Indefinite | Opt-in | Required |
| Colony mind | Indefinite | Never | N/A |
| Behavioral patterns | Indefinite | Opt-in | Required |

---

## Privacy Impact Assessment

### Before Each Feature

1. **Data Collection**: What data is collected?
2. **Purpose**: Why is it needed?
3. **Minimization**: Is it minimal?
4. **Retention**: How long is it kept?
5. **Sharing**: Who can access it?
6. **Protection**: How is it protected?
7. **User Control**: Can user delete/modify?

### For Pollen Grain Sharing

```
Privacy Impact Assessment: Pollen Grain Sharing

1. Data: Behavioral embedding (256 floats)
2. Purpose: Enable cross-keeper learning
3. Minimization: Compressed representation, not raw data
4. Retention: Until keeper deletes
5. Sharing: Opt-in only, Meadow members only
6. Protection: Differential privacy (ε < 1.0)
7. Control: Keeper can delete anytime

Risks:
- Reidentification: Mitigated by DP
- Property inference: Mitigated by aggregation
- Membership inference: Mitigated by DP

Conclusion: APPROVED with DP requirements
```

---

## Compliance Requirements

### GDPR (EU)
- Right to access
- Right to deletion
- Data portability
- Privacy by design
- DPIA for high-risk processing

### CCPA (California)
- Right to know
- Right to delete
- Right to opt-out
- Non-discrimination

### General Principles
- Data minimization
- Purpose limitation
- Storage limitation
- Accuracy
- Integrity and confidentiality

---

## Privacy Testing

### Test Cases

```python
class PrivacyTests:
    """Test suite for privacy guarantees"""

    def test_reidentification_resistance(self):
        """Verify pollen grains resist reidentification"""
        grains = generate_test_grains(n=1000)
        for grain in grains:
            # Attempt reidentification
            identified = attempt_reidentification(grain)
            assert not identified, "Grain was reidentified!"

    def test_membership_inference_resistance(self):
        """Verify membership inference is hard"""
        model = train_with_dp(train_data, epsilon=1.0)
        for sample in train_data:
            # Try to infer if sample was in training
            confidence = membership_inference(model, sample)
            assert confidence < 0.6, "Membership leaked!"

    def test_gradient_inversion_resistance(self):
        """Verify gradients don't leak data"""
        gradients = compute_private_gradients(sample_data)
        reconstructed = attempt_gradient_inversion(gradients)
        similarity = compute_similarity(sample_data, reconstructed)
        assert similarity < 0.3, "Data reconstructed from gradients!"
```

---

## Audit Checklist

- [ ] All data flows documented
- [ ] DP parameters specified for all shared data
- [ ] Privacy accounting implemented
- [ ] Attack resistance tested
- [ ] GDPR compliance verified
- [ ] User consent flows implemented
- [ ] Data retention policies enforced
- [ ] Deletion mechanisms tested
- [ ] Privacy notice updated
- [ ] DPIA completed for new features

---

## Key Interfaces

### With ML Engineer
- DP implementation in training
- Privacy-preserving embeddings
- Federated learning security

### With Systems Architect
- Data flow architecture
- Storage encryption
- Access control

### With Safety Researcher
- Privacy-safety tradeoffs
- Emergency data access
- Audit logging

### With Indigenous Liaison
- Data sovereignty
- Cultural privacy norms
- Community consent

---

*Last Updated: 2026-03-06*
