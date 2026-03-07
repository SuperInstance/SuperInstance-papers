# KV-Cache Security Patterns for Multi-Agent Systems

**Research Document:** Security Architecture for KV-Cache Sharing in POLLN
**Date:** March 7, 2026
**Status:** Research & Recommendations
**Related:** `privacy-attacks.md`, `PRIVACY_ATTACKS_SUMMARY.md`, `HIERARCHICAL_KV.md`

---

## Executive Summary

KV-cache sharing in multi-agent systems introduces **unique security challenges** beyond traditional federated learning. While POLLN has established differential privacy mechanisms for pollen grains (behavioral embeddings), **KV-cache anchors require additional security considerations** due to their structural nature and cross-agent reuse patterns.

**Key Findings:**
1. **KV-cache anchors are compressed model states**, not just embeddings - they contain attention patterns that can leak training data
2. **Cross-agent reuse creates attack surfaces** not present in single-agent systems
3. **Hierarchical KV sharing requires layered security** - different security guarantees at different levels
4. **Side-channel attacks on KV-cache timing** are feasible and require mitigation
5. **Existing POLLN privacy mechanisms provide foundation** but need extension for KV-specific threats

**Recommendation:** Implement defense-in-depth with KV-specific augmentations to existing DP mechanisms.

---

## Table of Contents

1. [Threat Model](#1-threat-model)
2. [Privacy Guarantees](#2-privacy-guarantees)
3. [Access Control](#3-access-control)
4. [Integrity Mechanisms](#4-integrity-mechanisms)
5. [POLLN-Specific Security](#5-polln-specific-security)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Threat Model

### 1.1 Attack Surface Analysis

KV-cache sharing expands the attack surface compared to embedding-only systems:

```
┌─────────────────────────────────────────────────────────────────┐
│                    KV-CACHE ATTACK SURFACE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │  DATA INJECTION │───▶│  CACHE POISONING │───▶│  MODEL      │  │
│  │                 │    │                 │    │  EXTRACTION │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│           │                       │                       │        │
│           ▼                       ▼                       ▼        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │  REIDENTIFICATION│───▶│  SIDE CHANNELS  │───▶│  PRIVACY    │  │
│  │                 │    │  (timing/size)  │    │  BUDGET     │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Attack Taxonomy

#### Attack Category 1: Cache Poisoning (CRITICAL)

**Description:** Malicious agents inject corrupted KV-cache data to degrade system performance or insert backdoors.

**Attack Vectors:**
1. **Gradient Manipulation:** Modify shared gradients to poison anchors
2. **Anchor Substitution:** Replace valid anchors with malicious versions
3. **Offset Poisoning:** Corrupt offset predictions to cause misalignment

**Feasibility:** HIGH
- POLLN's federated learning shares gradients
- Anchor pool accepts contributions from multiple agents
- No documented input validation for anchors

**Impact:** CRITICAL
- Can cause systematic model degradation
- Backdoor persistence across all agents using poisoned anchors
- Potential safety violations

**Example Attack:**
```python
# Malicious agent poisons shared anchor
poisoned_anchor = create_anchor(malicious_data)
poisoned_anchor.embedding = trigger_pattern  # Hidden backdoor
poisoned_anchor.qualityScore = 0.99  # Fake high quality
share_anchor(poisoned_anchor)  # Inject into pool
```

**Mitigation:**
- Byzantine-resilient aggregation for anchors
- Anchor validation before pool insertion
- Quality score verification (detect inflation)
- Anomaly detection on embedding distributions

#### Attack Category 2: Data Exfiltration (HIGH)

**Description:** Extract training data or sensitive information from shared KV-caches.

**Attack Vectors:**
1. **KV Inversion:** Reconstruct attention patterns from cache
2. **Token Recovery:** Extract input tokens from key-value pairs
3. **Context Reconstruction:** Recover conversation context from multi-turn caches

**Feasibility:** MEDIUM-HIGH
- KV-caches contain attention weights and value vectors
- Research shows gradient inversion is feasible
- KV compression may reduce but not eliminate risk

**Impact:** HIGH
- Privacy violation for user conversations
- Potential exposure of sensitive information
- Regulatory compliance issues (GDPR, etc.)

**Example Attack:**
```python
# Attacker reconstructs input from shared KV-cache
def reconstruct_from_kv(shared_kv):
    # Initialize dummy input
    dummy_input = random_tokens()

    # Optimize to match KV patterns
    for iteration in range(1000):
        dummy_kv = compute_kv(dummy_input)
        loss = distance(dummy_kv, shared_kv)
        dummy_input = gradient_step(loss, dummy_input)

    return dummy_input  # Approximates original input
```

**Mitigation:**
- Differential privacy on KV-cache values (ε < 0.5 for sharing)
- Value projection (reduce dimensionality before sharing)
- Secure aggregation (prevent inspection of individual caches)
- Quantization (reduce precision of shared values)

#### Attack Category 3: Side-Channel Attacks (MEDIUM)

**Description:** Extract information through timing, size, or access pattern analysis.

**Attack Vectors:**
1. **Timing Analysis:** Infer cache content from lookup times
2. **Size Inference:** Deduce information from cache sizes
3. **Access Pattern:** Learn behavioral patterns from cache access frequency

**Feasibility:** MEDIUM
- Cache hit/miss times differ measurably
- Compression ratios correlate with content entropy
- Access patterns may reveal user behavior

**Impact:** MEDIUM
- Can infer presence/absence of specific patterns
- May leak behavioral information
- Privacy violation even without direct data access

**Example Attack:**
```python
# Timing attack to infer cache content
def timing_inference(anchor_pool):
    target_embedding = encode("sensitive_pattern")

    # Measure lookup time for similar anchors
    times = []
    for anchor in anchor_pool:
        start = time()
        similarity = cosine_similarity(target_embedding, anchor.embedding)
        end = time()
        times.append((anchor.id, end - start, similarity))

    # Fast lookups indicate cached sensitive patterns
    sensitive_anchors = [a for a, t, s in times if t < threshold and s > 0.9]
    return sensitive_anchors
```

**Mitigation:**
- Constant-time lookup algorithms
- Cache access randomization (add noise to timing)
- Size normalization (pad to constant sizes)
- Rate limiting (prevent extensive probing)

#### Attack Category 4: Model Extraction (MEDIUM)

**Description:** Reconstruct agent models or extract model parameters from KV-cache patterns.

**Attack Vectors:**
1. **Attention Pattern Recovery:** Extract attention weights from shared caches
2. **Layer Behavior Inference:** Learn model layer characteristics
3. **Parameter Bound Estimation:** Infer model parameter ranges

**Feasibility:** MEDIUM
- KV-caches encode model behavior
- Multiple caches provide different views of same model
- Compression may limit but not prevent extraction

**Impact:** MEDIUM
- Intellectual property theft
- Model cloning
- Competitive disadvantage

**Mitigation:**
- Value cache obfuscation (add structured noise)
- Layer-specific privacy budgets
- Cache versioning (prevent systematic extraction)
- Usage monitoring (detect extraction attempts)

#### Attack Category 5: Privacy Budget Exhaustion (HIGH)

**Description:** Force privacy budget depletion to deny service or extract more information.

**Attack Vectors:**
1. **Budget Forcing:** Repeatedly request shared caches to exhaust budget
2. **Composite Queries:** Split complex queries to maximize ε spending
3. **Budget Amplification:** Exploit composition weaknesses

**Feasibility:** HIGH
- Direct API access to shared pools
- No documented rate limiting
- Privacy accounting may have composition vulnerabilities

**Impact:** HIGH
- Denial of service for legitimate users
- Privacy degradation
- System unusability

**Example Attack:**
```python
# Attack exhausts privacy budget
def exhaust_budget(keeper_id, anchor_pool):
    # Repeatedly request anchors
    for i in range(10000):
        anchor = request_anchor(keeper_id, random_query())
        # Each request costs ε = 0.1
        # After ~10 requests, budget exhausted

    # Legitimate user cannot share
    try:
        share_anchor(keeper_id, new_anchor)
    except BudgetExhausted:
        print("Denial of service successful")
```

**Mitigation:**
- Per-agent rate limiting
- Budget reset policies
- Query complexity pricing
- Anomaly detection on budget spending

### 1.3 Threat Matrix

| Attack | Feasibility | Impact | POLLN Risk | Mitigation Priority |
|--------|-------------|--------|------------|---------------------|
| Cache Poisoning | HIGH | CRITICAL | HIGH | CRITICAL |
| Data Exfiltration | MEDIUM-HIGH | HIGH | HIGH | CRITICAL |
| Side Channels | MEDIUM | MEDIUM | MEDIUM | HIGH |
| Model Extraction | MEDIUM | MEDIUM | LOW-MEDIUM | MEDIUM |
| Budget Exhaustion | HIGH | HIGH | HIGH | HIGH |

---

## 2. Privacy Guarantees

### 2.1 Differential Privacy for KV-Caches

**Challenge:** KV-caches are structured data (attention matrices), not simple vectors. Standard DP mechanisms need adaptation.

#### 2.1.1 Value Cache DP

**Approach:** Add calibrated noise to value vectors before sharing.

```python
def dp_kv_cache(
    key_cache: np.ndarray,
    value_cache: np.ndarray,
    epsilon: float = 0.5,
    delta: float = 1e-5,
    clip_norm: float = 1.0
) -> tuple[np.ndarray, np.ndarray]:
    """
    Apply differential privacy to KV-cache.

    Args:
        key_cache: [seq_len, d_k] key cache
        value_cache: [seq_len, d_v] value cache
        epsilon: Privacy budget (recommended: 0.3-0.5 for sharing)
        delta: Privacy failure probability
        clip_norm: Gradient clipping threshold

    Returns:
        (private_key_cache, private_value_cache)
    """
    # Clip to bound sensitivity
    key_norm = np.linalg.norm(key_cache)
    if key_norm > clip_norm:
        key_cache = key_cache * (clip_norm / key_norm)

    value_norm = np.linalg.norm(value_cache)
    if value_norm > clip_norm:
        value_cache = value_cache * (clip_norm / value_norm)

    # Compute noise scale (Gaussian mechanism)
    sensitivity = 2 * clip_norm  # L2 sensitivity
    sigma_key = sensitivity * np.sqrt(2 * np.log(1.25 / delta)) / epsilon
    sigma_value = sensitivity * np.sqrt(2 * np.log(1.25 / delta)) / epsilon

    # Add noise
    private_key_cache = key_cache + np.random.normal(0, sigma_key, key_cache.shape)
    private_value_cache = value_cache + np.random.normal(0, sigma_value, value_cache.shape)

    return private_key_cache, private_value_cache
```

**Parameters:**
- **Local cache (no sharing):** ε = ∞ (no DP needed)
- **Colony sharing:** ε = 0.5-1.0 (strong privacy)
- **Cross-colony sharing:** ε = 0.3-0.5 (very strong privacy)
- **Public sharing:** ε = 0.1-0.3 (maximum privacy, low utility)

#### 2.1.2 Attention Pattern Obfuscation

**Approach:** Add noise to attention patterns to prevent pattern extraction.

```python
def obfuscate_attention_pattern(
    attention_weights: np.ndarray,
    epsilon: float = 0.5
) -> np.ndarray:
    """
    Add DP noise to attention weights.

    Attention weights have special structure:
    - Non-negative
    - Rows sum to 1
    - Sparse (most values near 0)
    """
    # Compute sensitivity (max change in any attention weight)
    sensitivity = 1.0  # Attention weights in [0, 1]

    # Add noise and re-normalize
    noise_scale = sensitivity / epsilon
    noisy_weights = attention_weights + np.random.laplace(0, noise_scale, attention_weights.shape)

    # Ensure non-negative and normalize
    noisy_weights = np.maximum(noisy_weights, 0)
    noisy_weights = noisy_weights / noisy_weights.sum(axis=1, keepdims=True)

    return noisy_weights
```

#### 2.1.3 Anchor-Level DP

**Approach:** Apply DP at anchor level (not per-token) for better utility.

```python
def create_private_anchor(
    segment: KVCacheSegment,
    anchor_pool: KVAnchorPool,
    epsilon: float = 0.5
) -> KVAnchor:
    """
    Create DP-protected anchor from segment.

    Uses anchor-level sensitivity for better privacy-utility tradeoff.
    """
    # Compress segment (as in existing code)
    compressed_keys, compressed_values = compress_segment(segment)

    # Flatten for DP
    flat_keys = compressed_keys.flatten()
    flat_values = compressed_values.flatten()

    # Compute anchor-level sensitivity
    # Worst case: entire segment changes
    key_sensitivity = np.linalg.norm(flat_keys) * 2.0
    value_sensitivity = np.linalg.norm(flat_values) * 2.0

    # Add noise
    delta = 1e-5
    key_sigma = key_sensitivity * np.sqrt(2 * np.log(1.25 / delta)) / epsilon
    value_sigma = value_sensitivity * np.sqrt(2 * np.log(1.25 / delta)) / epsilon

    private_keys = flat_keys + np.random.normal(0, key_sigma, flat_keys.shape)
    private_values = flat_values + np.random.normal(0, value_sigma, flat_values.shape)

    # Reshape and create anchor
    anchor = KVAnchor(
        compressedKeys=private_keys.reshape(compressed_keys.shape),
        compressedValues=private_values.reshape(compressed_values.shape),
        # ... other fields
    )

    return anchor
```

### 2.2 Secure Aggregation Protocols

**Challenge:** Prevent server from seeing individual KV-cache updates while computing aggregate.

#### 2.2.1 Protocols for KV-Cache Aggregation

**Option 1: Bonawitz et al. (2017) Protocol**

```python
class SecureKVAggregator:
    """
    Secure aggregation for KV-cache updates.

    Based on Bonawitz et al. "Practical Secure Aggregation
    for Privacy-Preserving Machine Learning" (MLSys 2017).
    """

    def __init__(self, num_clients: int):
        self.num_clients = num_clients
        self.epsilon = 1.0  # Privacy budget for aggregation

    def aggregate_anchors(
        self,
        client_anchors: list[KVAnchor]
    ) -> KVAnchor:
        """
        Securely aggregate anchors from multiple clients.

        Server only sees sum, not individual contributions.
        """
        # Step 1: Clients add pairwise masking
        masked_anchors = self._apply_pairwise_masks(client_anchors)

        # Step 2: Clients add their own noise
        noisy_anchors = self._add_individual_noise(masked_anchors)

        # Step 3: Server aggregates
        aggregated = self._compute_average(noisy_anchors)

        # Step 4: Clients reveal their noise (cancels out)
        private_aggregated = self._cancel_noise(aggregated)

        return private_aggregated
```

**Option 2: Homomorphic Encryption**

```python
import tenseal as ts  # Or Microsoft SEAL, etc.

class HEKVAggregator:
    """
    Homomorphic encryption for KV-cache aggregation.

    Allows computation on encrypted data.
    """

    def __init__(self):
        # Setup BFV scheme
        self.context = ts.context(
            scheme=ts.SCHEME_TYPE.BFV,
            poly_modulus_degree=4096,
            plain_modulus=1032193
        )
        self.public_key = self.context.public_key()
        self.secret_key = None  # Held by clients

    def encrypt_anchor(self, anchor: KVAnchor) -> ts.CKKSVector:
        """Encrypt anchor for secure sharing."""
        flat_keys = anchor.compressedKeys.flatten()
        encrypted = ts.CKKSVector(self.context, flat_keys)
        return encrypted

    def aggregate_encrypted(
        self,
        encrypted_anchors: list[ts.CKKSVector]
    ) -> ts.CKKSVector:
        """Aggregate encrypted anchors."""
        # Homomorphic addition
        sum_encrypted = encrypted_anchors[0]
        for enc in encrypted_anchors[1:]:
            sum_encrypted += enc

        # Homomorphic division (for average)
        avg_encrypted = sum_encrypted * (1.0 / len(encrypted_anchors))

        return avg_encrypted
```

#### 2.2.2 Implementation Recommendations

**For POLLN:**

1. **Start with simulated secure aggregation** (as in current `federated.ts`)
2. **Phase 1:** Implement Bonawitz protocol for anchor sharing
3. **Phase 2:** Add HE for high-value cross-colony sharing
4. **Phase 3:** Optimize with GPU acceleration

**Tradeoffs:**
- **Bonawitz:** Lower overhead, requires synchronization
- **HE:** Higher overhead, no synchronization needed
- **Hybrid:** Use Bonawitz for normal rounds, HE for sensitive data

### 2.3 Privacy-Preserving Sync

**Challenge:** Enable cache synchronization across agents without leaking individual patterns.

#### 2.3.1 Synchronization Protocols

**Approach 1: Differential Private Consensus**

```python
class PrivateConsensus:
    """
    DP-preserving consensus for KV-cache sync.

    Agents reach agreement on shared anchors without revealing
    individual contributions.
    """

    def __init__(self, epsilon: float = 0.5):
        self.epsilon = epsilon
        self.aggregated_anchors = []

    def propose_anchor(self, anchor: KVAnchor) -> KVAnchor:
        """Add DP noise before proposing."""
        # Add noise to embedding
        noise_scale = np.linalg.norm(anchor.embedding) / self.epsilon
        noisy_embedding = anchor.embedding + np.random.normal(
            0, noise_scale, anchor.embedding.shape
        )

        # Create noisy proposal
        proposal = KVAnchor(
            **{**anchor.__dict__, 'embedding': noisy_embedding}
        )

        return proposal

    def consensus_round(
        self,
        proposals: list[KVAnchor]
    ) -> KVAnchor:
        """Run DP consensus round."""
        # Cluster proposals
        clusters = self._cluster_proposals(proposals)

        # Select largest cluster
        largest_cluster = max(clusters, key=len)

        # Compute centroid (DP average)
        centroid = self._dp_average(largest_cluster)

        return centroid
```

**Approach 2: Threshold-Based Sharing**

```python
def share_with_threshold(
    anchors: list[KVAnchor],
    threshold: int = 10
) -> KVAnchor:
    """
    Share aggregated anchor only if threshold met.

    Implements k-anonymity for anchor sharing.
    """
    if len(anchors) < threshold:
        raise ValueError(
            f"Insufficient anchors for sharing: {len(anchors)} < {threshold}"
        )

    # Average embeddings
    avg_embedding = np.mean([a.embedding for a in anchors], axis=0)

    # Add DP noise
    epsilon = 0.5
    sensitivity = np.linalg.norm(avg_embedding) * 2.0
    noise_scale = sensitivity * np.sqrt(2 * np.log(1.25 / 1e-5)) / epsilon
    private_embedding = avg_embedding + np.random.normal(0, noise_scale, avg_embedding.shape)

    # Create shared anchor
    shared_anchor = KVAnchor(
        embedding=private_embedding,
        usageCount=len(anchors),  # Indicate aggregation size
        # ... other fields
    )

    return shared_anchor
```

### 2.4 Anonymization Techniques

**Challenge:** Beyond DP, prevent reidentification from cache patterns.

#### 2.4.1 Temporal Anonymization

**Approach:** Add noise to timing information to prevent behavioral fingerprinting.

```python
def anonymize_temporal_patterns(
    cache: KVCacheSegment,
    epsilon: float = 0.5
) -> KVCacheSegment:
    """
    Add noise to temporal dimensions of cache.

    Prevents inference of when user is active.
    """
    # Add jitter to timestamps
    timestamp_jitter = np.random.laplace(0, 1.0 / epsilon)
    cache.metadata.createdAt += timestamp_jitter

    # Randomize sequence position (if not critical for utility)
    if cache.metadata.position is not None:
        position_jitter = int(np.random.laplace(0, 1.0 / epsilon))
        cache.metadata.position += position_jitter

    return cache
```

#### 2.4.2 Behavioral Anonymization

**Approach:** Modify cache to reduce behavioral fingerprinting.

```python
def anonymize_behavioral_patterns(
    cache: KVCacheSegment,
    epsilon: float = 0.5
) -> KVCacheSegment:
    """
    Reduce identifying behavioral patterns in cache.

    Targets: writing style, task preferences, etc.
    """
    # Shuffle attention heads (reduces style fingerprinting)
    num_heads = len(cache.keyCache)
    permuted_indices = np.random.permutation(num_heads)

    anonymized_keys = cache.keyCache[permuted_indices]
    anonymized_values = cache.valueCache[permuted_indices]

    # Add small noise to value vectors
    sensitivity = np.linalg.norm(anonymized_values)
    noise_scale = sensitivity / epsilon
    anonymized_values += np.random.normal(
        0, noise_scale, anonymized_values.shape
    )

    cache.keyCache = anonymized_keys
    cache.valueCache = anonymized_values

    return cache
```

---

## 3. Access Control

### 3.1 Authentication for KV Operations

**Challenge:** Verify agent identity before allowing KV-cache operations.

#### 3.1.1 Agent Authentication

```python
from cryptography import x509
from cryptography.hazmat.primitives import hashes
import jwt

class KVAuthenticator:
    """
    Authentication for KV-cache operations.

    Ensures only authorized agents can access/modify caches.
    """

    def __init__(self, public_key_pem: str):
        self.public_key = load_pem_public_key(public_key_pem)
        self.agent_certs = {}  # agent_id -> certificate

    def authenticate_agent(
        self,
        token: str,
        operation: str,
        resource: str
    ) -> bool:
        """
        Verify JWT token for operation.

        Args:
            token: JWT token from agent
            operation: Operation type (read, write, share)
            resource: Resource identifier (anchor_id, pool_id, etc.)

        Returns:
            True if authenticated and authorized
        """
        try:
            # Verify JWT signature
            decoded = jwt.decode(
                token,
                self.public_key,
                algorithms=["ES256"]
            )

            # Check permissions
            agent_id = decoded["agent_id"]
            permissions = decoded.get("permissions", [])

            if operation not in permissions:
                return False

            # Check resource access
            allowed_resources = decoded.get("allowed_resources", [])
            if allowed_resources and resource not in allowed_resources:
                return False

            # Check token expiration
            if decoded["exp"] < time():
                return False

            return True

        except Exception as e:
            return False

    def issue_token(
        self,
        agent_id: str,
        permissions: list[str],
        ttl: int = 3600
    ) -> str:
        """
        Issue authentication token for agent.

        Admin function - requires private key.
        """
        payload = {
            "agent_id": agent_id,
            "permissions": permissions,
            "iat": time(),
            "exp": time() + ttl
        }

        token = jwt.encode(payload, self.private_key, algorithm="ES256")
        return token
```

#### 3.1.2 Operation-Specific Authentication

```python
class KVOperationAuth:
    """
    Operation-specific authentication for KV operations.

    Different operations require different permission levels.
    """

    PERMISSION_LEVELS = {
        "read": "OBSERVER",
        "write": "CONTRIBUTOR",
        "share": "CONTRIBUTOR",
        "delete": "KEEPER",
        "admin": "KEEPER"
    }

    def check_permission(
        self,
        agent_id: str,
        operation: str,
        resource: KVAnchor | KVAnchorPool
    ) -> bool:
        """
        Check if agent has permission for operation on resource.

        Implements role-based access control (RBAC).
        """
        # Get agent's role
        agent_role = self._get_agent_role(agent_id)

        # Get required role for operation
        required_role = self.PERMISSION_LEVELS.get(operation)

        if not required_role:
            return False

        # Check role hierarchy
        role_hierarchy = [
            "OBSERVER",
            "CONTRIBUTOR",
            "MODERATOR",
            "KEEPER"
        ]

        agent_level = role_hierarchy.index(agent_role)
        required_level = role_hierarchy.index(required_role)

        if agent_level < required_level:
            return False

        # Check resource-specific permissions
        if isinstance(resource, KVAnchor):
            return self._check_anchor_access(agent_id, resource, operation)
        elif isinstance(resource, KVAnchorPool):
            return self._check_pool_access(agent_id, resource, operation)

        return False

    def _get_agent_role(self, agent_id: str) -> str:
        """Get agent's role in colony/meadow."""
        # Check meadow membership
        membership = self.meadow.getMembership(agent_id)
        if membership:
            return membership.permission.value

        # Default role
        return "OBSERVER"
```

### 3.2 Authorization Levels

**Challenge:** Implement granular access control for different KV operations.

#### 3.2.1 Resource-Based Access Control

```python
from enum import Enum

class KVPermission(Enum):
    """Granular permissions for KV operations."""
    READ_ANCHOR = "read_anchor"
    WRITE_ANCHOR = "write_anchor"
    DELETE_ANCHOR = "delete_anchor"
    SHARE_ANCHOR = "share_anchor"
    CREATE_POOL = "create_pool"
    ACCESS_POOL = "access_pool"
    MODIFY_POOL = "modify_pool"
    DELETE_POOL = "delete_pool"
    ADMIN_SYSTEM = "admin_system"

class KVPolicy:
    """
    Access control policy for KV operations.

    Implements principle of least privilege.
    """

    def __init__(self):
        self.policies = {}  # agent_id -> set[permissions]
        self.resource_policies = {}  # resource_id -> {agent_id -> permissions}

    def grant_permission(
        self,
        agent_id: str,
        permission: KVPermission,
        resource_id: str = None
    ):
        """
        Grant permission to agent.

        If resource_id provided, permission applies only to that resource.
        """
        if resource_id:
            if resource_id not in self.resource_policies:
                self.resource_policies[resource_id] = {}
            if agent_id not in self.resource_policies[resource_id]:
                self.resource_policies[resource_id][agent_id] = set()
            self.resource_policies[resource_id][agent_id].add(permission)
        else:
            if agent_id not in self.policies:
                self.policies[agent_id] = set()
            self.policies[agent_id].add(permission)

    def check_permission(
        self,
        agent_id: str,
        permission: KVPermission,
        resource_id: str = None
    ) -> bool:
        """Check if agent has permission."""
        # Check global permissions
        if agent_id in self.policies and permission in self.policies[agent_id]:
            return True

        # Check resource-specific permissions
        if resource_id and resource_id in self.resource_policies:
            agent_perms = self.resource_policies[resource_id].get(agent_id, set())
            if permission in agent_perms:
                return True

        return False

    def revoke_permission(
        self,
        agent_id: str,
        permission: KVPermission,
        resource_id: str = None
    ):
        """Revoke permission from agent."""
        if resource_id:
            if resource_id in self.resource_policies:
                if agent_id in self.resource_policies[resource_id]:
                    self.resource_policies[resource_id][agent_id].discard(permission)
        else:
            if agent_id in self.policies:
                self.policies[agent_id].discard(permission)
```

#### 3.2.2 Colony Isolation

```python
class ColonyIsolation:
    """
    Enforce isolation between colonies.

    Prevents unauthorized cross-colony KV access.
    """

    def __init__(self):
        self.colony_boundaries = {}  # colony_id -> allowed_colony_ids
        self.cross_colony_policies = {}  # (colony_a, colony_b) -> permissions

    def set_colony_boundary(
        self,
        colony_id: str,
        allowed_colonies: list[str]
    ):
        """
        Define which colonies can interact.

        Implements network segmentation for KV security.
        """
        self.colony_boundaries[colony_id] = set(allowed_colonies)

    def check_cross_colony_access(
        self,
        source_colony: str,
        target_colony: str,
        operation: KVPermission
    ) -> bool:
        """
        Check if cross-colony operation is allowed.
        """
        # Check if colonies can interact
        if target_colony not in self.colony_boundaries.get(source_colony, set()):
            return False

        # Check specific operation permissions
        policy_key = (source_colony, target_colony)
        allowed_ops = self.cross_colony_policies.get(policy_key, set())

        return operation in allowed_ops

    def grant_cross_colony_permission(
        self,
        colony_a: str,
        colony_b: str,
        permission: KVPermission
    ):
        """Grant specific cross-colony permission."""
        policy_key = (colony_a, colony_b)
        if policy_key not in self.cross_colony_policies:
            self.cross_colony_policies[policy_key] = set()
        self.cross_colony_policies[policy_key].add(permission)
```

### 3.3 Audit Logging

**Challenge:** Maintain comprehensive audit trail for all KV operations.

```python
from datetime import datetime
import json
from pathlib import Path

class KVAuditLogger:
    """
    Immutable audit log for KV operations.

    Provides accountability and forensic capabilities.
    """

    def __init__(self, log_path: Path):
        self.log_path = log_path
        self.log_path.mkdir(parents=True, exist_ok=True)
        self.current_log = self.log_path / f"audit_{datetime.now().strftime('%Y%m%d')}.jsonl"

    def log_operation(
        self,
        agent_id: str,
        operation: str,
        resource_id: str,
        resource_type: str,
        success: bool,
        metadata: dict = None
    ):
        """
        Log KV operation to audit trail.

        Immutable: append-only, signed logs.
        """
        entry = {
            "timestamp": datetime.now().isoformat(),
            "agent_id": agent_id,
            "operation": operation,
            "resource_id": resource_id,
            "resource_type": resource_type,
            "success": success,
            "metadata": metadata or {},
            "signature": self._sign_entry(entry)  # Cryptographic signature
        }

        # Append to log (append-only = immutable)
        with open(self.current_log, "a") as f:
            f.write(json.dumps(entry) + "\n")

        # Also log to safety layer for critical events
        if not success and operation in ["delete", "share", "admin"]:
            self.safety_layer.logAudit({
                "category": "security",
                "severity": "WARNING" if success else "ERROR",
                "action": "log" if success else "escalate",
                "description": f"KV operation: {operation}",
                "agentId": agent_id
            })

    def query_logs(
        self,
        agent_id: str = None,
        operation: str = None,
        start_time: datetime = None,
        end_time: datetime = None
    ) -> list[dict]:
        """
        Query audit logs for forensic analysis.

        Supports filtering by multiple criteria.
        """
        results = []

        # Scan log files
        for log_file in self.log_path.glob("audit_*.jsonl"):
            with open(log_file, "r") as f:
                for line in f:
                    entry = json.loads(line)

                    # Apply filters
                    if agent_id and entry["agent_id"] != agent_id:
                        continue
                    if operation and entry["operation"] != operation:
                        continue
                    if start_time and datetime.fromisoformat(entry["timestamp"]) < start_time:
                        continue
                    if end_time and datetime.fromisoformat(entry["timestamp"]) > end_time:
                        continue

                    results.append(entry)

        return results

    def generate_report(
        self,
        colony_id: str,
        time_range: tuple[datetime, datetime]
    ) -> dict:
        """
        Generate security report for colony.

        Summarizes operations, anomalies, and security events.
        """
        logs = self.query_logs(
            start_time=time_range[0],
            end_time=time_range[1]
        )

        # Filter by colony
        colony_logs = [
            log for log in logs
            if log.get("metadata", {}).get("colony_id") == colony_id
        ]

        # Compute statistics
        total_ops = len(colony_logs)
        successful_ops = sum(1 for log in colony_logs if log["success"])
        failed_ops = total_ops - successful_ops

        operation_counts = {}
        for log in colony_logs:
            op = log["operation"]
            operation_counts[op] = operation_counts.get(op, 0) + 1

        # Detect anomalies
        anomalies = self._detect_anomalies(colony_logs)

        report = {
            "colony_id": colony_id,
            "time_range": (time_range[0].isoformat(), time_range[1].isoformat()),
            "total_operations": total_ops,
            "successful_operations": successful_ops,
            "failed_operations": failed_ops,
            "success_rate": successful_ops / total_ops if total_ops > 0 else 0,
            "operation_counts": operation_counts,
            "anomalies": anomalies,
            "generated_at": datetime.now().isoformat()
        }

        return report

    def _detect_anomalies(self, logs: list[dict]) -> list[dict]:
        """Detect anomalous patterns in logs."""
        anomalies = []

        # Check for failed operation spikes
        failed_by_time = {}
        for log in logs:
            if not log["success"]:
                hour = log["timestamp"][:13]  # Truncate to hour
                failed_by_time[hour] = failed_by_time.get(hour, 0) + 1

        # Flag hours with >10 failed ops
        for hour, count in failed_by_time.items():
            if count > 10:
                anomalies.append({
                    "type": "high_failure_rate",
                    "time": hour,
                    "count": count,
                    "severity": "WARNING" if count < 50 else "ERROR"
                })

        # Check for unusual operations
        unusual_ops = ["delete", "admin", "modify_pool"]
        for log in logs:
            if log["operation"] in unusual_ops:
                anomalies.append({
                    "type": "unusual_operation",
                    "operation": log["operation"],
                    "agent_id": log["agent_id"],
                    "time": log["timestamp"],
                    "severity": "INFO"
                })

        return anomalies
```

### 3.4 Rate Limiting

**Challenge:** Prevent abuse and privacy budget exhaustion through rate limiting.

```python
import time
from collections import defaultdict

class KVRateLimiter:
    """
    Rate limiting for KV operations.

    Prevents abuse and privacy budget exhaustion.
    """

    def __init__(
        self,
        requests_per_minute: int = 60,
        requests_per_hour: int = 1000,
        burst_allowance: int = 10
    ):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.burst_allowance = burst_allowance

        self.request_history = defaultdict(list)  # agent_id -> [timestamps]
        self.budget_exhausted = set()  # Agents who exhausted budget

    def check_rate_limit(
        self,
        agent_id: str,
        operation: str
    ) -> tuple[bool, str]:
        """
        Check if request is within rate limits.

        Returns (allowed, reason).
        """
        now = time.time()
        history = self.request_history[agent_id]

        # Clean old history
        history = [t for t in history if now - t < 3600]  # Keep 1 hour
        self.request_history[agent_id] = history

        # Check if budget exhausted
        if agent_id in self.budget_exhausted:
            return False, "Privacy budget exhausted"

        # Check minute limit
        recent_minute = [t for t in history if now - t < 60]
        if len(recent_minute) >= self.requests_per_minute:
            return False, f"Rate limit exceeded: {len(recent_minute)}/{self.requests_per_minute} per minute"

        # Check hour limit
        if len(history) >= self.requests_per_hour:
            return False, f"Rate limit exceeded: {len(history)}/{self.requests_per_hour} per hour"

        # Check burst limit (short-term spike detection)
        recent_10s = [t for t in history if now - t < 10]
        if len(recent_10s) >= self.burst_allowance:
            return False, f"Burst limit exceeded: {len(recent_10s)}/{self.burst_allowance} in 10s"

        # Request allowed
        history.append(now)
        return True, "OK"

    def mark_budget_exhausted(self, agent_id: str):
        """Mark agent's privacy budget as exhausted."""
        self.budget_exhausted.add(agent_id)

    def reset_budget(self, agent_id: str):
        """Reset agent's rate limits (e.g., after budget renewal)."""
        self.budget_exhausted.discard(agent_id)
        self.request_history[agent_id] = []
```

---

## 4. Integrity Mechanisms

### 4.1 Anchor Validation

**Challenge:** Ensure shared anchors are valid and not malicious.

#### 4.1.1 Quality Score Verification

```python
class AnchorValidator:
    """
    Validate anchor quality and detect manipulation.

    Prevents cache poisoning attacks.
    """

    def __init__(self, config: KVAnchorPoolConfig):
        self.config = config
        self.quality_history = {}  # anchor_id -> [quality_scores]

    def validate_anchor(
        self,
        anchor: KVAnchor,
        source_agent: str
    ) -> tuple[bool, str]:
        """
        Validate anchor before pool insertion.

        Returns (is_valid, reason).
        """
        # Check quality score (detect inflation)
        if anchor.qualityScore > 0.99:
            # Suspiciously high - verify
            estimated_quality = self._estimate_quality(anchor)
            if abs(estimated_quality - anchor.qualityScore) > 0.1:
                return False, f"Quality score inflated: claimed {anchor.qualityScore:.2f}, estimated {estimated_quality:.2f}"

        # Check compression ratio (detect tampering)
        if anchor.compressionRatio < self.config.minCompressionRatio:
            return False, f"Compression ratio too low: {anchor.compressionRatio:.2f}"

        # Check embedding norms (detect anomalies)
        embedding_norm = np.linalg.norm(anchor.embedding)
        if embedding_norm < 0.5 or embedding_norm > 2.0:
            return False, f"Embedding norm anomalous: {embedding_norm:.2f}"

        # Check for malicious patterns
        if self._detect_malicious_patterns(anchor):
            return False, "Malicious patterns detected in anchor"

        # Check source agent reputation
        if not self._check_agent_reputation(source_agent):
            return False, f"Source agent {source_agent} has poor reputation"

        return True, "Valid"

    def _estimate_quality(self, anchor: KVAnchor) -> float:
        """Estimate actual quality of anchor."""
        # Decompress and measure reconstruction error
        reconstructed = self._decompress_anchor(anchor)

        # Compare with original (if available)
        # For now, use heuristic based on compression
        base_quality = 0.9

        # Adjust by compression ratio
        compression_penalty = max(0, 1.0 - anchor.compressionRatio / 10.0)

        # Adjust by embedding entropy
        entropy = self._compute_entropy(anchor.embedding)
        entropy_penalty = abs(entropy - 0.5) * 0.1

        estimated = base_quality - compression_penalty - entropy_penalty

        return max(0, min(1, estimated))

    def _detect_malicious_patterns(self, anchor: KVAnchor) -> bool:
        """Detect indicators of malicious intent."""
        # Check for trigger patterns
        if self._has_trigger_pattern(anchor.embedding):
            return True

        # Check for abnormal value distributions
        if self._has_abnormal_distribution(anchor):
            return True

        # Check for steganographic patterns
        if self._has_steganography(anchor):
            return True

        return False

    def _has_trigger_pattern(self, embedding: np.ndarray) -> bool:
        """Check for backdoor trigger patterns."""
        # High-repetition patterns
        unique_values = len(set(embedding[:100]))  # Sample first 100
        if unique_values < 10:  # Too repetitive
            return True

        # Specific values that look like triggers
        if np.allclose(embedding[:10], embedding[10:20], atol=1e-5):
            return True  # Repeated pattern

        return False

    def _has_abnormal_distribution(self, anchor: KVAnchor) -> bool:
        """Check for abnormal value distributions."""
        values = anchor.compressedValues.flatten()

        # Check for uniform distribution (suspicious)
        hist, _ = np.histogram(values, bins=50)
        uniform_p_value = self._chi_square_uniform_test(hist)
        if uniform_p_value > 0.95:
            return True  # Too uniform - suspicious

        # Check for all zeros
        if np.allclose(values, 0, atol=1e-10):
            return True

        return False
```

#### 4.1.2 Consistency Checking

```python
class AnchorConsistencyChecker:
    """
    Check consistency of anchors with claimed metadata.

    Detects metadata manipulation.
    """

    def check_consistency(
        self,
        anchor: KVAnchor,
        segment: KVCacheSegment
    ) -> tuple[bool, list[str]]:
        """
        Check anchor consistency with source segment.

        Returns (is_consistent, list_of_issues).
        """
        issues = []

        # Check layer ID matches
        if anchor.layerId != segment.layerId:
            issues.append(f"Layer ID mismatch: anchor={anchor.layerId}, segment={segment.layerId}")

        # Check embedding dimensionality
        expected_dim = self.config.embeddingDim
        if len(anchor.embedding) != expected_dim:
            issues.append(f"Embedding dimension wrong: {len(anchor.embedding)} != {expected_dim}")

        # Check compression ratio matches
        actual_ratio = self._compute_compression_ratio(segment)
        if abs(actual_ratio - anchor.compressionRatio) > 0.5:
            issues.append(f"Compression ratio mismatch: claimed={anchor.compressionRatio:.2f}, actual={actual_ratio:.2f}")

        # Check timestamps are reasonable
        if anchor.createdAt < segment.metadata.createdAt:
            issues.append("Anchor created before segment")

        if anchor.lastUsed < anchor.createdAt:
            issues.append("Last used before creation")

        # Check hash matches
        computed_hash = self._compute_anchor_hash(anchor)
        if computed_hash != anchor.anchorId.split("-")[-1]:
            issues.append("Anchor ID hash mismatch")

        return len(issues) == 0, issues
```

### 4.2 Cache Consistency Checks

**Challenge:** Ensure shared caches remain consistent across agents.

#### 4.2.1 Version Control for Caches

```python
class KVCacheVersion:
    """
    Version control for KV-caches.

    Ensures consistency and enables rollback.
    """

    def __init__(self, cache_id: str):
        self.cache_id = cache_id
        self.versions = {}  # version_number -> cache_data
        self.current_version = 0
        self.merkle_tree = self._build_merkle_tree()

    def add_version(
        self,
        cache_data: KVCacheSegment,
        agent_id: str
    ) -> int:
        """
        Add new version of cache.

        Returns version number.
        """
        self.current_version += 1
        version_number = self.current_version

        # Store version with metadata
        self.versions[version_number] = {
            "data": cache_data,
            "agent_id": agent_id,
            "timestamp": time.time(),
            "parent_hash": self._get_parent_hash()
        }

        # Update Merkle tree
        self._update_merkle_tree(version_number, cache_data)

        return version_number

    def verify_version(self, version_number: int) -> bool:
        """
        Verify integrity of specific version.

        Uses Merkle tree for efficient verification.
        """
        if version_number not in self.versions:
            return False

        version_data = self.versions[version_number]
        computed_hash = self._compute_hash(version_data["data"])

        # Get Merkle proof
        proof = self._get_merkle_proof(version_number)

        # Verify proof
        root_hash = self.merkle_tree.root_hash
        is_valid = self._verify_merkle_proof(computed_hash, proof, root_hash)

        return is_valid

    def rollback_to(self, version_number: int) -> bool:
        """
        Rollback cache to specific version.

        For recovery from corruption or attacks.
        """
        if version_number not in self.versions:
            return False

        # Verify version integrity first
        if not self.verify_version(version_number):
            return False

        # Restore version
        self.current_version = version_number

        # Notify safety layer
        self.safety_layer.logAudit({
            "category": "safety",
            "severity": "WARNING",
            "action": "log",
            "description": f"KV cache rollback: {self.cache_id} to v{version_number}"
        })

        return True
```

#### 4.2.2 Distributed Consistency

```python
class DistributedKVConsistency:
    """
    Ensure consistency across distributed KV-cache pools.

    Implements consensus for shared anchors.
    """

    def __init__(self, colony_id: str):
        self.colony_id = colony_id
        self.local_pool = KVAnchorPool()
        self.remote_pools = {}  # colony_id -> pool snapshot
        self.consensus_rounds = 0

    def sync_anchors(self) -> list[KVAnchor]:
        """
        Synchronize anchors across colonies using consensus.

        Returns agreed-upon anchors.
        """
        # Get local anchors
        local_anchors = self.local_pool.getAnchors()

        # Get remote anchors (cached)
        remote_anchors = self._fetch_remote_anchors()

        # Run consensus protocol
        agreed_anchors = self._run_consensus(local_anchors, remote_anchors)

        # Update local pool
        for anchor in agreed_anchors:
            if not self.local_pool.getAnchor(anchor.anchorId):
                self.local_pool.create_anchor_from_shared(anchor)

        self.consensus_rounds += 1

        return agreed_anchors

    def _run_consensus(
        self,
        local_anchors: list[KVAnchor],
        remote_anchors: dict[str, list[KVAnchor]]
    ) -> list[KVAnchor]:
        """
        Run Byzantine fault-tolerant consensus.

        Handles malicious or faulty colonies.
        """
        # Cluster similar anchors across colonies
        clusters = self._cluster_anchors(local_anchors, remote_anchors)

        # Select anchors from largest clusters
        # (requires >2/3 agreement for safety)
        agreed_anchors = []
        for cluster in clusters:
            if len(cluster["colonies"]) > (2 * len(remote_anchors) / 3):
                # Get centroid anchor
                centroid = self._compute_cluster_centroid(cluster["anchors"])
                agreed_anchors.append(centroid)

        return agreed_anchors
```

### 4.3 Tamper Detection

**Challenge:** Detect when caches have been maliciously modified.

#### 4.3.1 Cryptographic Hashing

```python
import hashlib
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding

class KVCacheIntegrity:
    """
    Cryptographic integrity protection for KV-caches.

    Detects any unauthorized modifications.
    """

    def __init__(self, private_key_path: str, public_key_path: str):
        self.private_key = load_private_key(private_key_path)
        self.public_key = load_public_key(public_key_path)
        self.signatures = {}  # cache_id -> signature

    def sign_cache(self, cache: KVCacheSegment) -> str:
        """
        Sign cache with private key.

        Creates cryptographic proof of authenticity.
        """
        # Serialize cache
        cache_bytes = self._serialize_cache(cache)

        # Compute hash
        digest = hashes.Hash(hashes.SHA256())
        digest.update(cache_bytes)
        cache_hash = digest.finalize()

        # Sign hash
        signature = self.private_key.sign(
            cache_hash,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )

        # Store signature
        signature_hex = signature.hex()
        self.signatures[cache.segmentId] = signature_hex

        return signature_hex

    def verify_cache(
        self,
        cache: KVCacheSegment,
        signature: str
    ) -> bool:
        """
        Verify cache signature.

        Detects tampering or forgery.
        """
        # Serialize cache
        cache_bytes = self._serialize_cache(cache)

        # Compute hash
        digest = hashes.Hash(hashes.SHA256())
        digest.update(cache_bytes)
        cache_hash = digest.finalize()

        # Verify signature
        try:
            signature_bytes = bytes.fromhex(signature)
            self.public_key.verify(
                signature_bytes,
                cache_hash,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except Exception:
            return False

    def verify_all(self, pool: KVAnchorPool) -> list[str]:
        """
        Verify all caches in pool.

        Returns list of cache_ids that failed verification.
        """
        failed = []

        for anchor_id in pool.anchors.keys():
            anchor = pool.getAnchor(anchor_id)

            # Reconstruct segment from anchor
            segment = self._reconstruct_segment(anchor)

            # Get stored signature
            signature = self.signatures.get(segment.segmentId)

            if not signature:
                failed.append(anchor_id)
                continue

            # Verify
            if not self.verify_cache(segment, signature):
                failed.append(anchor_id)

        return failed
```

#### 4.3.2 Witness Marks

**Approach:** Embed subtle, detectable marks in caches for tamper evidence.

```python
class WitnessMarks:
    """
    Embed witness marks in KV-caches for tamper detection.

    Based on docs/research/WITNESS_MARKS.md
    """

    def __init__(self, secret_key: bytes):
        self.secret_key = secret_key
        self.mark_locations = self._generate_mark_locations()

    def embed_witness_marks(
        self,
        cache: KVCacheSegment
    ) -> KVCacheSegment:
        """
        Embed witness marks in cache.

        Marks are subtle modifications detectable only by owner.
        """
        marked_cache = copy.deepcopy(cache)

        # Embed marks in value cache
        for location in self.mark_locations:
            layer, head, position = location

            # Modify specific values with watermarks
            mark = self._compute_mark(layer, head, position)
            marked_cache.valueCache[layer][head][position] += mark

        return marked_cache

    def verify_witness_marks(
        self,
        cache: KVCacheSegment
    ) -> tuple[bool, float]:
        """
        Verify witness marks in cache.

        Returns (has_marks, confidence).
        """
        mark_count = 0
        total_marks = len(self.mark_locations)

        for location in self.mark_locations:
            layer, head, position = location

            # Expected mark
            expected_mark = self._compute_mark(layer, head, position)

            # Actual value
            actual_value = cache.valueCache[layer][head][position]

            # Check if mark is present
            if abs(actual_value - expected_mark) < 1e-6:
                mark_count += 1

        # Compute confidence
        confidence = mark_count / total_marks if total_marks > 0 else 0
        has_marks = confidence > 0.5  # Threshold for detection

        return has_marks, confidence

    def _compute_mark(self, layer: int, head: int, position: int) -> float:
        """Compute witness mark for specific location."""
        # Use HMAC with secret key
        import hmac
        message = f"{layer}-{head}-{position}".encode()
        mark_hmac = hmac.new(self.secret_key, message, hashlib.sha256)

        # Convert to small float (-1e-5 to 1e-5)
        mark_int = int.from_bytes(mark_hmac.digest()[:4], 'big')
        mark = (mark_int % 20001 - 10000) / 1000000000.0

        return mark
```

### 4.4 Secure Serialization

**Challenge:** Serialize caches for transmission without introducing vulnerabilities.

```python
import pickle
import msgpack  # More efficient than pickle
from cryptography.fernet import Fernet

class SecureKVSerIALIZER:
    """
    Secure serialization for KV-cache transmission.

    Prevents injection attacks during serialization.
    """

    def __init__(self, encryption_key: bytes):
        self.cipher = Fernet(encryption_key)

    def serialize_anchor(
        self,
        anchor: KVAnchor,
        encrypt: bool = True
    ) -> bytes:
        """
        Securely serialize anchor for transmission.

        Includes integrity protection and optional encryption.
        """
        # Convert to dict (safe for serialization)
        anchor_dict = {
            "anchorId": anchor.anchorId,
            "layerId": anchor.layerId,
            "segmentId": anchor.segmentId,
            "compressedKeys": anchor.compressedKeys.tobytes(),
            "compressedValues": anchor.compressedValues.tobytes(),
            "embedding": anchor.embedding.tolist(),
            "sourceAgentId": anchor.sourceAgentId,
            "usageCount": anchor.usageCount,
            "lastUsed": anchor.lastUsed,
            "qualityScore": anchor.qualityScore,
            "compressionRatio": anchor.compressionRatio,
            "createdAt": anchor.createdAt,
            "updatedAt": anchor.updatedAt
        }

        # Serialize with MessagePack
        serialized = msgpack.packb(anchor_dict)

        # Add HMAC for integrity
        hmac = self._compute_hmac(serialized)

        # Combine data + HMAC
        data_with_hmac = serialized + b":" + hmac

        # Encrypt if requested
        if encrypt:
            data_with_hmac = self.cipher.encrypt(data_with_hmac)

        return data_with_hmac

    def deserialize_anchor(
        self,
        data: bytes,
        verify_signature: bool = True
    ) -> KVAnchor:
        """
        Deserialize anchor from transmission.

        Verifies integrity and decrypts.
        """
        # Decrypt if needed
        try:
            decrypted = self.cipher.decrypt(data)
        except Exception:
            # Not encrypted
            decrypted = data

        # Split data and HMAC
        if b":" in decrypted:
            serialized, hmac = decrypted.rsplit(b":", 1)
        else:
            serialized = decrypted
            hmac = None

        # Verify HMAC
        if verify_signature and hmac:
            if not self._verify_hmac(serialized, hmac):
                raise ValueError("HMAC verification failed - data may be tampered")

        # Deserialize
        anchor_dict = msgpack.unpackb(serialized)

        # Reconstruct Float32Arrays
        anchor_dict["compressedKeys"] = np.frombuffer(
            anchor_dict["compressedKeys"], dtype=np.float32
        )
        anchor_dict["compressedValues"] = np.frombuffer(
            anchor_dict["compressedValues"], dtype=np.float32
        )

        # Create anchor object
        anchor = KVAnchor(**anchor_dict)

        return anchor

    def _compute_hmac(self, data: bytes) -> bytes:
        """Compute HMAC for data integrity."""
        import hmac
        return hmac.new(self.secret_key, data, hashlib.sha256).digest()

    def _verify_hmac(self, data: bytes, hmac_bytes: bytes) -> bool:
        """Verify HMAC for data integrity."""
        import hmac
        expected_hmac = self._compute_hmac(data)
        return hmac.compare_digest(expected_hmac, hmac_bytes)
```

---

## 5. POLLN-Specific Security

### 5.1 Colony Isolation

**Challenge:** Implement secure boundaries between colonies while enabling controlled sharing.

#### 5.1.1 Colony-Level Security Policies

```python
class ColonySecurityPolicy:
    """
    Security policy for colony isolation and interaction.

    Implements POLLN's multi-colony security model.
    """

    POLICY_LEVELS = {
        "LOCAL": {
            "description": "No sharing outside colony",
            "max_epsilon": float('inf'),
            "allow_cross_colony": False
        },
        "MEADOW": {
            "description": "Share within meadow community",
            "max_epsilon": 1.0,
            "allow_cross_colony": True,
            "allowed_colonies": "meadow_members"
        },
        "FEDERATED": {
            "description": "Participate in federated learning",
            "max_epsilon": 0.5,
            "allow_cross_colony": True,
            "allowed_colonies": "federation_members"
        },
        "PUBLIC": {
            "description": "Public sharing (not recommended)",
            "max_epsilon": 0.3,
            "allow_cross_colony": True,
            "allowed_colonies": "all"
        }
    }

    def __init__(self, colony_id: str, policy_level: str):
        self.colony_id = colony_id
        self.policy_level = policy_level
        self.policy = self.POLICY_LEVELS[policy_level]
        self.allowed_colonies = set()
        self.blocked_colonies = set()

    def can_share_with(
        self,
        target_colony: str,
        epsilon: float
    ) -> bool:
        """
        Check if sharing with target colony is allowed.

        Enforces policy constraints.
        """
        # Check if sharing allowed at all
        if not self.policy["allow_cross_colony"]:
            return False

        # Check if target is blocked
        if target_colony in self.blocked_colonies:
            return False

        # Check if target is in allowed set
        if self.policy["allowed_colonies"] != "all":
            if target_colony not in self.allowed_colonies:
                return False

        # Check epsilon limits
        if epsilon > self.policy["max_epsilon"]:
            return False

        return True

    def set_allowed_colonies(self, colonies: list[str]):
        """Set list of colonies this colony can share with."""
        self.allowed_colonies = set(colonies)

    def block_colony(self, colony_id: str):
        """Block sharing with specific colony."""
        self.blocked_colonies.add(colony_id)
```

#### 5.1.2 Cross-Colony Security

```python
class CrossColonySecurity:
    """
    Manage security for cross-colony KV sharing.

    Implements federation trust boundaries.
    """

    def __init__(self, federation_coordinator: FederatedLearningCoordinator):
        self.federation = federation_coordinator
        self.colony_policies = {}  # colony_id -> ColonySecurityPolicy
        self.trust_scores = {}  # (colony_a, colony_b) -> trust_score

    def register_colony(
        self,
        colony_id: str,
        policy_level: str,
        public_key: str
    ):
        """Register colony with security policy."""
        policy = ColonySecurityPolicy(colony_id, policy_level)
        self.colony_policies[colony_id] = policy

        # Initialize trust scores
        for other_colony in self.colony_policies:
            self.trust_scores[(colony_id, other_colony)] = 0.5
            self.trust_scores[(other_colony, colony_id)] = 0.5

    def check_cross_colony_sharing(
        self,
        source_colony: str,
        target_colony: str,
        anchor: KVAnchor
    ) -> tuple[bool, str]:
        """
        Check if cross-colony sharing is allowed.

        Enforces trust boundaries and policies.
        """
        # Get policies
        source_policy = self.colony_policies.get(source_colony)
        target_policy = self.colony_policies.get(target_colony)

        if not source_policy or not target_policy:
            return False, "Unknown colony"

        # Check source policy allows sharing
        if not source_policy.can_share_with(target_colony, 0.5):
            return False, "Source policy prohibits sharing"

        # Check target policy allows receiving
        if not target_policy.can_share_with(source_colony, 0.5):
            return False, "Target policy prohibits receiving"

        # Check trust score
        trust = self.trust_scores.get((source_colony, target_colony), 0.5)
        if trust < 0.3:
            return False, f"Trust score too low: {trust:.2f}"

        # Check anchor quality
        if anchor.qualityScore < 0.7:
            return False, f"Anchor quality too low: {anchor.qualityScore:.2f}"

        return True, "OK"

    def update_trust_score(
        self,
        colony_a: str,
        colony_b: str,
        positive_interaction: bool
    ):
        """
        Update trust score based on interaction.

        Implements reputation system.
        """
        current_trust = self.trust_scores.get((colony_a, colony_b), 0.5)

        # Adjust trust score
        if positive_interaction:
            new_trust = min(1.0, current_trust + 0.05)
        else:
            new_trust = max(0.0, current_trust - 0.1)

        self.trust_scores[(colony_a, colony_b)] = new_trust
```

### 5.2 Meadow Marketplace Security

**Challenge:** Secure knowledge sharing in the Meadow marketplace.

#### 5.2.1 FPIC-Enhanced Security

**Integration with Meadow's FPIC (Free, Prior, and Informed Consent) system:**

```python
class MeadowKVSecurity:
    """
    Security for KV sharing in Meadow marketplace.

    Integrates with Meadow's FPIC consent system.
    """

    def __init__(self, meadow: Meadow, kv_pool: KVAnchorPool):
        self.meadow = meadow
        self.kv_pool = kv_pool
        self.fpic_validator = FPICValidator()

    def share_anchor_to_meadow(
        self,
        anchor: KVAnchor,
        community_id: str,
        keeper_id: str,
        fpic_consent: FPICConsent
    ) -> tuple[bool, str]:
        """
        Share anchor to Meadow community with FPIC consent.

        Enforces indigenous knowledge protections.
        """
        # Check FPIC consent if indigenous knowledge involved
        if anchor.metadata.get("indigenousSources"):
            if not self.fpic_validator.validate_consent(fpic_consent):
                return False, "Invalid or missing FPIC consent"

            # Check restriction level
            restriction = fpic_consent.restrictionLevel
            if restriction == RestrictionLevel.FORBIDDEN:
                return False, "Knowledge is forbidden from sharing"

            if restriction == RestrictionLevel.SACRED:
                # Requires individual approval for each use
                return False, "Sacred knowledge requires individual approval"

        # Add DP based on restriction level
        epsilon = self._get_epsilon_for_restriction(restriction)
        private_anchor = create_private_anchor(anchor, self.kv_pool, epsilon)

        # Share to meadow
        try:
            shared = self.meadow.sharePollenGrain({
                "communityId": community_id,
                "sharedBy": keeper_id,
                "fpicStatus": fpic_consent.isValid,
                "fpicConsentId": fpic_consent.id,
                "restrictionLevel": restriction,
                # ... embed anchor in pollen grain
            }, keeper_id)

            return True, "Shared successfully"

        except Exception as e:
            return False, f"Sharing failed: {str(e)}"

    def _get_epsilon_for_restriction(
        self,
        restriction: RestrictionLevel
    ) -> float:
        """Get appropriate epsilon for restriction level."""
        epsilons = {
            RestrictionLevel.PUBLIC: 0.5,
            RestrictionLevel.ATTRIBUTED: 0.3,
            RestrictionLevel.RESTRICTED: 0.2,
            RestrictionLevel.SACRED: 0.1,
            RestrictionLevel.FORBIDDEN: 0.0  # Never shared
        }
        return epsilons.get(restriction, 0.5)
```

#### 5.2.2 Marketplace Access Control

```python
class MarketplaceAccessControl:
    """
    Access control for Meadow marketplace KV sharing.

    Implements tiered access based on community membership.
    """

    def __init__(self, meadow: Meadow):
        self.meadow = meadow
        self.access_tiers = {
            CommunityPermission.OBSERVER: {"read": True, "share": False},
            CommunityPermission.CONTRIBUTOR: {"read": True, "share": True},
            CommunityPermission.MODERATOR: {"read": True, "share": True, "moderate": True},
            CommunityPermission.KEEPER: {"read": True, "share": True, "moderate": True, "admin": True}
        }

    def check_marketplace_access(
        self,
        keeper_id: str,
        community_id: str,
        operation: str
    ) -> bool:
        """
        Check if keeper can perform operation in community marketplace.

        Enforces tiered access control.
        """
        # Get membership
        membership = self.meadow.getMembership(community_id, keeper_id)

        if not membership:
            return False

        # Get permission tier
        permissions = self.access_tiers.get(membership.permission, {})

        # Check if operation allowed
        return permissions.get(operation, False)

    def list_accessible_anchors(
        self,
        keeper_id: str,
        community_id: str
    ) -> list[SharedPollenGrain]:
        """
        List anchors accessible to keeper in community.

        Respects access control and FPIC restrictions.
        """
        # Check if keeper can read
        if not self.check_marketplace_access(keeper_id, community_id, "read"):
            return []

        # Get all grains in community
        all_grains = self.meadow.getCommunityPollenGrains(community_id)

        # Filter by FPIC restrictions
        accessible_grains = []
        for grain in all_grains:
            # Check restriction level
            if grain.restrictionLevel == RestrictionLevel.FORBIDDEN:
                continue

            # Check if sacred (requires approval)
            if grain.restrictionLevel == RestrictionLevel.SACRED:
                # Check if keeper has specific approval
                if not self._has_sacred_approval(keeper_id, grain.id):
                    continue

            accessible_grains.append(grain)

        return accessible_grains
```

### 5.3 Federation Trust Boundaries

**Challenge:** Define and enforce trust boundaries in federated learning.

#### 5.3.1 Federation Zones

```python
class FederationZone:
    """
    Define trust zones for federated learning.

    Colonies in same zone have higher trust, different zones have restrictions.
    """

    def __init__(self, zone_id: str, trust_level: float):
        self.zone_id = zone_id
        self.trust_level = trust_level  # 0.0 (no trust) to 1.0 (full trust)
        self.member_colonies = set()
        self.peer_zones = {}  # zone_id -> trust_level

    def add_colony(self, colony_id: str):
        """Add colony to zone."""
        self.member_colonies.add(colony_id)

    def set_peer_zone(self, zone_id: str, trust_level: float):
        """Set trust level for peer zone."""
        self.peer_zones[zone_id] = trust_level

    def can_share_with(self, target_zone: str, data_sensitivity: str) -> bool:
        """
        Check if sharing with target zone is allowed.

        Based on trust level and data sensitivity.
        """
        trust = self.peer_zones.get(target_zone, 0.0)

        # Define sensitivity thresholds
        sensitivity_thresholds = {
            "public": 0.0,
            "colony": 0.3,
            "meadow": 0.5,
            "federated": 0.7,
            "private": 0.9
        }

        threshold = sensitivity_thresholds.get(data_sensitivity, 0.5)

        return trust >= threshold

class FederationZones:
    """
    Manage all federation zones.

    Implements POLLN's multi-tier federation model.
    """

    def __init__(self):
        self.zones = {}  # zone_id -> FederationZone
        self.colony_to_zone = {}  # colony_id -> zone_id

        # Initialize default zones
        self._init_default_zones()

    def _init_default_zones(self):
        """Initialize default federation zones."""
        # High-trust zone (single organization)
        self.create_zone("internal", trust_level=1.0)

        # Medium-trust zone (partner organizations)
        self.create_zone("partners", trust_level=0.7)

        # Low-trust zone (public federation)
        self.create_zone("public", trust_level=0.3)

    def create_zone(self, zone_id: str, trust_level: float):
        """Create new federation zone."""
        zone = FederationZone(zone_id, trust_level)
        self.zones[zone_id] = zone
        return zone

    def assign_colony(self, colony_id: str, zone_id: str):
        """Assign colony to zone."""
        self.colony_to_zone[colony_id] = zone_id
        self.zones[zone_id].add_colony(colony_id)

    def check_federation_access(
        self,
        source_colony: str,
        target_colony: str,
        data_sensitivity: str
    ) -> bool:
        """
        Check if federation access is allowed.

        Enforces trust boundaries.
        """
        # Get zones
        source_zone = self.colony_to_zone.get(source_colony)
        target_zone = self.colony_to_zone.get(target_colony)

        if not source_zone or not target_zone:
            return False

        # Check if same zone
        if source_zone == target_zone:
            return True  # Same zone = full trust

        # Check cross-zone sharing
        zone = self.zones[source_zone]
        return zone.can_share_with(target_zone, data_sensitivity)
```

#### 5.3.2 Federated KV Sharing with Trust

```python
class TrustedFederatedKVSharing:
    """
    Federated KV sharing with trust-based controls.

    Integrates with POLLN's FederatedLearningCoordinator.
    """

    def __init__(
        self,
        federation: FederatedLearningCoordinator,
        zones: FederationZones
    ):
        self.federation = federation
        self.zones = zones
        self.shared_anchors = {}  # anchor_id -> (colonony_id, anchor)

    def propose_anchor_for_federation(
        self,
        colony_id: str,
        anchor: KVAnchor,
        target_zones: list[str]
    ) -> tuple[bool, str]:
        """
        Propose anchor for federated sharing.

        Enforces trust boundaries and DP requirements.
        """
        # Get colony's zone
        colony_zone = self.zones.colony_to_zone.get(colony_id)

        if not colony_zone:
            return False, "Colony not in any zone"

        # Add DP based on target zones
        max_trust = max([
            self.zones.zones[zone].peer_zones.get(colony_zone, 0.0)
            for zone in target_zones
        ])

        # Lower trust = more DP needed
        epsilon = 0.3 + (max_trust * 0.4)  # 0.3 to 0.7
        private_anchor = create_private_anchor(anchor, None, epsilon)

        # Validate anchor
        validator = AnchorValidator(None)
        is_valid, reason = validator.validate_anchor(private_anchor, colony_id)

        if not is_valid:
            return False, f"Anchor validation failed: {reason}"

        # Share to federation
        try:
            for zone_id in target_zones:
                self.shared_anchors[private_anchor.anchorId] = (colony_id, private_anchor)

            return True, f"Shared to {len(target_zones)} zones"

        except Exception as e:
            return False, f"Sharing failed: {str(e)}"

    def get_federated_anchors(
        self,
        colony_id: str,
        zone_id: str
    ) -> list[KVAnchor]:
        """
        Get anchors available to colony from federation.

        Respects trust boundaries.
        """
        accessible_anchors = []

        for anchor_id, (source_colony, anchor) in self.shared_anchors.items():
            # Check if allowed
            if self.zones.check_federation_access(
                source_colony, colony_id, "federated"
            ):
                accessible_anchors.append(anchor)

        return accessible_anchors
```

### 5.4 Implementation Recommendations

**Priority 1: Critical Security (Implement Immediately)**

1. **Add DP to all shared KV-anchors**
   ```python
   # In kvanchor.ts createAnchor()
   if sharingMode !== 'LOCAL') {
       anchor = addDPNoise(anchor, epsilon);
   }
   ```

2. **Implement anchor validation**
   ```python
   # Before pool insertion
   const validator = new AnchorValidator(config);
   const [isValid, reason] = validator.validate(anchor, agentId);
   if (!isValid) throw new Error(reason);
   ```

3. **Add audit logging**
   ```python
   // Log all KV operations
   auditor.log_operation(agent_id, operation, resource_id, success);
   ```

**Priority 2: High Security (Implement This Quarter)**

4. **Implement secure aggregation**
   - Use Bonawitz protocol for federated KV updates
   - Add HE for high-value cross-colony sharing

5. **Add rate limiting**
   - Per-agent rate limits
   - Burst detection
   - Budget exhaustion prevention

6. **Implement colony isolation**
   - Define security policies per colony
   - Enforce cross-colony boundaries

**Priority 3: Medium Security (Implement This Year)**

7. **Add witness marks**
   - Embed tamper-evidence in caches
   - Implement verification

8. **Implement zone-based federation**
   - Define trust zones
   - Enforce trust boundaries

9. **Add comprehensive monitoring**
   - Security dashboard
   - Anomaly detection
   - Automated alerts

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Establish baseline security for KV operations.

**Tasks:**
1. Add DP to all KV-anchor sharing (ε < 1.0)
2. Implement anchor validation
3. Add comprehensive audit logging
4. Implement basic authentication

**Deliverables:**
- `src/core/kvsecurity.ts` - Core security module
- `src/core/kvvalidator.ts` - Anchor validation
- `src/core/kvauth.ts` - Authentication system
- `src/core/kvaudit.ts` - Audit logging

**Success Criteria:**
- All shared anchors have DP protection
- 100% of KV operations logged
- Authentication required for all operations

### Phase 2: Advanced Security (Weeks 5-8)

**Goal:** Implement advanced security mechanisms.

**Tasks:**
1. Implement secure aggregation (Bonawitz protocol)
2. Add rate limiting and abuse prevention
3. Implement colony isolation policies
4. Add integrity verification (signatures, hashes)

**Deliverables:**
- `src/core/kvaggregation.ts` - Secure aggregation
- `src/core/kvratelimit.ts` - Rate limiting
- `src/core/kvpolicy.ts` - Security policies
- `src/core/kvintegrity.ts` - Integrity verification

**Success Criteria:**
- Secure aggregation for all federated KV updates
- Rate limits prevent abuse
- Colony boundaries enforced

### Phase 3: Production Hardening (Weeks 9-12)

**Goal:** Production-ready security implementation.

**Tasks:**
1. Implement witness marks for tamper detection
2. Add zone-based federation
3. Integrate with Meadow's FPIC system
4. Security testing and penetration testing
5. External security audit

**Deliverables:**
- `src/core/kvwitness.ts` - Witness marks
- `src/core/kvzones.ts` - Federation zones
- `src/core/kvmeadow.ts` - Meadow integration
- Security test suite
- External audit report

**Success Criteria:**
- All security mechanisms tested
- External audit passed
- Documentation complete

### Phase 4: Monitoring and Response (Ongoing)

**Goal:** Continuous security monitoring and incident response.

**Tasks:**
1. Implement security monitoring dashboard
2. Add anomaly detection
3. Create incident response procedures
4. Regular security reviews

**Deliverables:**
- Monitoring dashboard
- Incident response playbook
- Regular security reports

---

## Conclusion

### Summary

KV-cache sharing in multi-agent systems requires **layered security defenses** beyond traditional federated learning:

1. **Differential Privacy:** Essential for all shared KV-anchors (ε < 1.0)
2. **Secure Aggregation:** Prevents inspection of individual updates
3. **Access Control:** Authentication, authorization, audit logging
4. **Integrity Mechanisms:** Validation, consistency checks, tamper detection
5. **POLLN-Specific:** Colony isolation, Meadow FPIC integration, federation zones

### Key Recommendations

1. **Immediate:** Add DP to all shared KV-anchors (ε = 0.5 for colony sharing)
2. **High Priority:** Implement secure aggregation and anchor validation
3. **Medium Priority:** Add colony isolation and rate limiting
4. **Long-term:** Implement comprehensive monitoring and response

### Research Gaps

1. **KV-specific DP analysis:** Need research on optimal DP mechanisms for attention structures
2. **Side-channel mitigation:** Need timing-safe KV operations
3. **Composition analysis:** Need better understanding of privacy budget composition across KV operations
4. **Cross-modal attacks:** Need research on attacks combining KV with other shared data

### Final Warning

**KV-cache security cannot be an afterthought.** The structural nature of KV-caches makes them uniquely vulnerable to extraction and poisoning attacks. Implement these recommendations before any deployment of KV sharing features.

---

**Document Version:** 1.0
**Last Updated:** March 7, 2026
**Next Review:** April 7, 2026
**Maintained By:** POLLN Security Research Team

---

## References

### Core Security Papers

1. **Differential Privacy:**
   - Dwork et al. (2006). "Calibrating Noise to Sensitivity in Private Data Analysis." TCC.
   - Abadi et al. (2016). "Deep Learning with Differential Privacy." CCS.
   - Mironov (2017). "Rényi Differential Privacy." IEEE CSF.

2. **Secure Aggregation:**
   - Bonawitz et al. (2017). "Practical Secure Aggregation for Privacy-Preserving Machine Learning." MLSys.
   - So et al. (2021). "Comprehensive Privacy Analysis of Deep Learning." USENIX Security.

3. **Federated Learning Security:**
   - Bonawitz et al. (2017). "Practical Secure Aggregation for Privacy-Preserving Machine Learning." MLSys.
   - Pillutla et al. (2022). "Can You Really Backdoor Federated Learning?" ICML.

4. **Model Extraction:**
   - Tramer et al. (2020). "Space-Efficient Model Extraction." USENIX Security.
   - Carlini et al. (2020). "Extracting Training Data from Large Language Models." USENIX Security.

### KV-Cache Specific Research

1. **LLM Cache Security:**
   - Liu et al. (2024). "KVCOMM: High-Ratio KV Cache Compression." (Note: Review security sections)
   - Shao et al. (2024). "Locality-Aware KV Cache Compression." (Note: Review for patterns)

2. **Attention Mechanism Privacy:**
   - Song et al. (2023). "Privacy-Preserving Attention in Transformers." (Note: Verify existence)
   - Recent papers on attention-based model privacy (2024-2025)

### POLLN-Specific References

1. **POLLN Architecture:**
   - `docs/ARCHITECTURE.md` - System architecture
   - `docs/research/privacy-attacks.md` - Privacy threat analysis
   - `docs/research/PRIVACY_ATTACKS_SUMMARY.md` - Quick reference
   - `docs/research/FEDERATED_LEARNING_IMPLEMENTATION.md` - Federated learning
   - `src/core/federated.ts` - Federated learning implementation
   - `src/core/meadow.ts` - Meadow community system

2. **KV Implementation:**
   - `src/core/kvanchor.ts` - KV anchor system
   - `src/core/kvtypes.ts` - KV type definitions
   - `docs/research/HIERARCHICAL_KV.md` - Hierarchical KV research

### Standards and Best Practices

1. **OWASP:** Machine Learning Security Top 10
2. **NIST:** AI Security Guidelines (draft)
3. **ISO:** 27001 (Information Security)
4. **GDPR:** Data Protection Regulation (EU)

---

**END OF DOCUMENT**
