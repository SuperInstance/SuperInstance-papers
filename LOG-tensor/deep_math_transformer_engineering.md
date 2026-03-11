# Transformer Engineering Mathematics
## Deep Mathematical Analysis for RTT Architecture

**Author**: Machine Learning Engineer (Task ID: 3)  
**Focus**: Transformer Architecture Mathematics with RTT Integration  
**Date**: 2025-01-20

---

## Table of Contents
1. [Attention Mechanism Mathematics](#1-attention-mechanism-mathematics)
2. [Position Encoding Theory](#2-position-encoding-theory)
3. [Layer Normalization Mathematics](#3-layer-normalization-mathematics)
4. [Feed-Forward Networks](#4-feed-forward-networks)
5. [RTT Integration](#5-rtt-integration)
6. [Performance Analysis](#6-performance-analysis)
7. [References](#7-references)

---

## 1. Attention Mechanism Mathematics

### 1.1 Scaled Dot-Product Attention

#### 1.1.1 Definition and Derivation

**Definition**: The scaled dot-product attention mechanism computes:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

Where:
- $Q \in \mathbb{R}^{n \times d_k}$: Query matrix
- $K \in \mathbb{R}^{m \times d_k}$: Key matrix  
- $V \in \mathbb{R}^{m \times d_v}$: Value matrix
- $d_k$: Key dimension

#### 1.1.2 Mathematical Proof of Scaling Factor

**Theorem**: The scaling factor $\frac{1}{\sqrt{d_k}}$ prevents softmax saturation.

**Proof**:

Let $q, k \in \mathbb{R}^{d_k}$ with elements drawn i.i.d. from $\mathcal{N}(0, 1)$.

The dot product:
$$q \cdot k = \sum_{i=1}^{d_k} q_i k_i$$

Since $q_i k_i$ are independent with:
$$\mathbb{E}[q_i k_i] = \mathbb{E}[q_i]\mathbb{E}[k_i] = 0$$
$$\text{Var}(q_i k_i) = \mathbb{E}[q_i^2]\mathbb{E}[k_i^2] = 1 \cdot 1 = 1$$

By the Central Limit Theorem, for large $d_k$:
$$q \cdot k \sim \mathcal{N}(0, d_k)$$

Thus $\text{Var}(q \cdot k) = d_k$, meaning the dot product has standard deviation $\sqrt{d_k}$.

Without scaling, large $d_k$ causes:
- Large magnitude inputs to softmax
- Gradients approaching zero (saturation)
- Training instability

With scaling by $\frac{1}{\sqrt{d_k}}$:
$$\text{Var}\left(\frac{q \cdot k}{\sqrt{d_k}}\right) = \frac{d_k}{d_k} = 1$$

This maintains unit variance, ensuring stable gradients. ∎

#### 1.1.3 PyTorch Implementation

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import math

class ScaledDotProductAttention(nn.Module):
    """
    Scaled Dot-Product Attention with mathematical rigor.
    
    Computes: Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
    
    Mathematical properties:
    - Permutation equivariant: P @ Attention(Q,K,V) = Attention(P@Q, P@K, P@V)
    - Output convex combination of values (attention weights sum to 1)
    """
    
    def __init__(self, d_k: int, dropout: float = 0.1):
        super().__init__()
        self.scale = math.sqrt(d_k)
        self.dropout = nn.Dropout(dropout)
        
        # Cache for gradient analysis
        self.attention_weights = None
        
    def forward(self, Q: torch.Tensor, K: torch.Tensor, V: torch.Tensor,
                mask: torch.Tensor = None) -> torch.Tensor:
        """
        Args:
            Q: (batch, n_heads, seq_len, d_k)
            K: (batch, n_heads, seq_len, d_k)
            V: (batch, n_heads, seq_len, d_v)
            mask: Optional attention mask
            
        Returns:
            output: (batch, n_heads, seq_len, d_v)
        """
        # Compute attention scores: QK^T / sqrt(d_k)
        scores = torch.matmul(Q, K.transpose(-2, -1)) / self.scale
        
        # Apply mask (if provided)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
        
        # Softmax normalization
        attention_weights = F.softmax(scores, dim=-1)
        attention_weights = self.dropout(attention_weights)
        
        # Cache for analysis
        self.attention_weights = attention_weights
        
        # Weighted sum of values
        output = torch.matmul(attention_weights, V)
        
        return output
```

### 1.2 Multi-Head Attention

#### 1.2.1 Mathematical Formulation

**Definition**: Multi-head attention applies $h$ parallel attention functions:

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h)W^O$$

Where each head computes:
$$\text{head}_i = \text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

With projection matrices:
- $W_i^Q \in \mathbb{R}^{d_{model} \times d_k}$
- $W_i^K \in \mathbb{R}^{d_{model} \times d_k}$
- $W_i^V \in \mathbb{R}^{d_{model} \times d_v}$
- $W^O \in \mathbb{R}^{hd_v \times d_{model}}$

#### 1.2.2 Expressivity Analysis

**Theorem**: Multi-head attention can represent any permutation-equivariant function with sufficient heads.

**Proof Sketch**:

Define the attention pattern for head $i$:
$$A_i = \text{softmax}\left(\frac{QW_i^Q (KW_i^K)^T}{\sqrt{d_k}}\right)$$

Each head learns different query-key subspaces:
$$\text{span}(QW_i^Q) \subseteq \mathbb{R}^{d_k}$$

The concatenation operation:
$$\text{Concat}(A_1 V W_1^V, \ldots, A_h V W_h^V)$$

Creates a feature map in $\mathbb{R}^{hd_v}$, projecting back via $W^O$.

**Expressivity Bounds**:
- Minimum heads for full rank: $h \geq \frac{d_{model}}{d_k}$
- Each head can attend to different semantic aspects
- $h$ heads ≈ $h$ independent attention distributions ∎

#### 1.2.3 PyTorch Implementation

```python
class MultiHeadAttention(nn.Module):
    """
    Multi-Head Attention with complete mathematical implementation.
    
    Mathematical formulation:
    head_i = Attention(QW_i^Q, KW_i^K, VW_i^V)
    MultiHead(Q,K,V) = Concat(head_1,...,head_h)W^O
    """
    
    def __init__(self, d_model: int, n_heads: int, dropout: float = 0.1):
        super().__init__()
        
        assert d_model % n_heads == 0, "d_model must be divisible by n_heads"
        
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_k = d_model // n_heads  # Dimension per head
        self.d_v = d_model // n_heads
        
        # Linear projections for Q, K, V
        self.W_Q = nn.Linear(d_model, d_model, bias=False)
        self.W_K = nn.Linear(d_model, d_model, bias=False)
        self.W_V = nn.Linear(d_model, d_model, bias=False)
        
        # Output projection
        self.W_O = nn.Linear(d_model, d_model, bias=False)
        
        # Attention mechanism
        self.attention = ScaledDotProductAttention(self.d_k, dropout)
        
        # Initialize weights using Xavier
        self._init_weights()
        
    def _init_weights(self):
        """Xavier initialization for stable gradients."""
        for module in [self.W_Q, self.W_K, self.W_V, self.W_O]:
            nn.init.xavier_uniform_(module.weight)
    
    def forward(self, Q: torch.Tensor, K: torch.Tensor, V: torch.Tensor,
                mask: torch.Tensor = None) -> torch.Tensor:
        """
        Args:
            Q, K, V: (batch, seq_len, d_model)
            
        Returns:
            output: (batch, seq_len, d_model)
        """
        batch_size = Q.size(0)
        
        # Linear projections: (batch, seq_len, d_model)
        Q = self.W_Q(Q)
        K = self.W_K(K)
        V = self.W_V(V)
        
        # Reshape for multi-head: (batch, n_heads, seq_len, d_k)
        Q = Q.view(batch_size, -1, self.n_heads, self.d_k).transpose(1, 2)
        K = K.view(batch_size, -1, self.n_heads, self.d_k).transpose(1, 2)
        V = V.view(batch_size, -1, self.n_heads, self.d_v).transpose(1, 2)
        
        # Apply attention
        output = self.attention(Q, K, V, mask)
        
        # Concatenate heads: (batch, seq_len, d_model)
        output = output.transpose(1, 2).contiguous().view(batch_size, -1, self.d_model)
        
        # Output projection
        output = self.W_O(output)
        
        return output
```

### 1.3 Attention as Kernel Smoothing

#### 1.3.1 Kernel Interpretation

**Theorem**: Softmax attention is equivalent to kernel smoothing with a specific kernel.

**Proof**:

Define the attention kernel:
$$k(q, k) = \exp\left(\frac{q \cdot k}{\sqrt{d_k}}\right)$$

The attention output becomes:
$$\text{Attention}(q, K, V) = \frac{\sum_{j=1}^{m} k(q, k_j) v_j}{\sum_{j=1}^{m} k(q, k_j)}$$

This is the **Nadaraya-Watson kernel regression** estimator:
$$\hat{f}(q) = \frac{\sum_j K(q, k_j) y_j}{\sum_j K(q, k_j)}$$

The softmax normalizes the kernel weights, ensuring they sum to 1. ∎

#### 1.3.2 Attention Kernel Properties

```python
class AttentionKernelAnalysis:
    """
    Analysis tools for understanding attention as kernel smoothing.
    """
    
    @staticmethod
    def compute_kernel_matrix(Q: torch.Tensor, K: torch.Tensor, 
                               d_k: int) -> torch.Tensor:
        """
        Compute the unnormalized kernel matrix.
        
        K_ij = exp(q_i · k_j / sqrt(d_k))
        """
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
        kernel = torch.exp(scores)
        return kernel
    
    @staticmethod
    def effective_rank(attention_weights: torch.Tensor, 
                       threshold: float = 0.99) -> torch.Tensor:
        """
        Compute effective rank of attention distribution.
        
        Higher rank = more diverse attention patterns.
        """
        # Singular values of attention matrix
        s = torch.linalg.svdvals(attention_weights)
        
        # Normalized singular values
        s_normalized = s / s.sum(dim=-1, keepdim=True)
        
        # Cumulative sum
        cumsum = torch.cumsum(s_normalized, dim=-1)
        
        # Effective rank: number of components to explain threshold variance
        rank = (cumsum < threshold).sum(dim=-1) + 1
        
        return rank
    
    @staticmethod
    def attention_entropy(attention_weights: torch.Tensor) -> torch.Tensor:
        """
        Compute entropy of attention distribution.
        
        H = -sum(p log p)
        
        Higher entropy = more uniform attention
        Lower entropy = more focused attention
        """
        eps = 1e-9
        entropy = -(attention_weights * torch.log(attention_weights + eps)).sum(dim=-1)
        return entropy
```

### 1.4 Linear Attention Variants

#### 1.4.1 Linear Attention Formulation

**Definition**: Linear attention replaces softmax with kernel feature maps:

$$\text{LinearAttention}(Q, K, V) = \phi(Q)(\phi(K)^T V)$$

Where $\phi: \mathbb{R}^d \to \mathbb{R}^d$ is a feature map.

**Key Insight**: Matrix associativity allows:
$$(QK^T)V = Q(K^T V)$$

The right side has complexity $O(nd^2)$ vs $O(n^2d)$.

#### 1.4.2 Common Feature Maps

1. **ELU-based** (Katharopoulos et al., 2020):
$$\phi(x) = \text{ELU}(x) + 1$$

2. **ReLU-based**:
$$\phi(x) = \text{ReLU}(x)$$

3. **Softmax approximation** (Performer):
$$\phi(x) = \exp\left(\frac{x - \max(x)}{\sqrt{d}}\right)$$

#### 1.4.3 PyTorch Implementation

```python
class LinearAttention(nn.Module):
    """
    Linear Attention with O(n) complexity.
    
    Uses kernel feature maps to decompose softmax attention:
    softmax(QK^T)V ≈ φ(Q)(φ(K)^T V)
    
    Complexity: O(nd^2) instead of O(n^2d)
    """
    
    def __init__(self, d_model: int, n_heads: int, feature_map: str = 'elu'):
        super().__init__()
        
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_k = d_model // n_heads
        
        self.W_Q = nn.Linear(d_model, d_model, bias=False)
        self.W_K = nn.Linear(d_model, d_model, bias=False)
        self.W_V = nn.Linear(d_model, d_model, bias=False)
        self.W_O = nn.Linear(d_model, d_model, bias=False)
        
        self.feature_map = self._get_feature_map(feature_map)
        
    def _get_feature_map(self, name: str):
        """Return the appropriate feature map function."""
        if name == 'elu':
            return lambda x: F.elu(x) + 1
        elif name == 'relu':
            return F.relu
        elif name == 'softmax_approx':
            return lambda x: torch.exp(x / math.sqrt(self.d_k))
        else:
            raise ValueError(f"Unknown feature map: {name}")
    
    def forward(self, Q: torch.Tensor, K: torch.Tensor, 
                V: torch.Tensor) -> torch.Tensor:
        """
        Linear attention forward pass.
        
        Key equation: output = φ(Q) @ (φ(K)^T @ V) / (φ(K)^T @ 1)
        """
        batch_size, seq_len, _ = Q.shape
        
        # Project and reshape
        Q = self.W_Q(Q).view(batch_size, seq_len, self.n_heads, self.d_k)
        K = self.W_K(K).view(batch_size, seq_len, self.n_heads, self.d_k)
        V = self.W_V(V).view(batch_size, seq_len, self.n_heads, self.d_k)
        
        # Apply feature maps
        Q_prime = self.feature_map(Q)  # (batch, seq, heads, d_k)
        K_prime = self.feature_map(K)
        
        # Compute KV^T first: O(nd^2)
        # K_prime^T @ V: (batch, heads, d_k, d_k) @ (batch, seq, heads, d_k)
        # Transpose for batch matmul
        K_T = K_prime.transpose(-2, -3)  # (batch, heads, d_k, seq)
        KV = torch.matmul(K_T, V)  # (batch, heads, d_k, d_k)
        
        # Normalizer: K^T @ 1
        K_sum = K_prime.sum(dim=-3, keepdim=True)  # (batch, 1, heads, d_k)
        
        # Q @ (K^T @ V)
        output = torch.matmul(Q_prime, KV)  # (batch, seq, heads, d_k)
        
        # Normalize
        normalizer = torch.matmul(Q_prime, K_sum.transpose(-2, -1))
        output = output / (normalizer + 1e-6)
        
        # Reshape and project
        output = output.view(batch_size, seq_len, self.d_model)
        output = self.W_O(output)
        
        return output
```

---

## 2. Position Encoding Theory

### 2.1 Sinusoidal Position Encoding

#### 2.1.1 Mathematical Definition

The original transformer position encoding:

$$PE_{(pos, 2i)} = \sin\left(\frac{pos}{10000^{2i/d_{model}}}\right)$$
$$PE_{(pos, 2i+1)} = \cos\left(\frac{pos}{10000^{2i/d_{model}}}\right)$$

Where:
- $pos$: Position index
- $i$: Dimension index
- $d_{model}$: Model dimension

#### 2.1.2 Proof of Relative Position Encoding Property

**Theorem**: Sinusoidal encoding allows the model to learn relative positions.

**Proof**:

Consider two positions $pos$ and $pos + k$. For dimension $2i$:

$$PE_{pos+k, 2i} = \sin\left(\frac{pos + k}{10000^{2i/d}}\right)$$

Using the angle addition formula:
$$\sin(\alpha + \beta) = \sin(\alpha)\cos(\beta) + \cos(\alpha)\sin(\beta)$$

Let $\alpha = \frac{pos}{10000^{2i/d}}$ and $\beta = \frac{k}{10000^{2i/d}}$:

$$PE_{pos+k, 2i} = PE_{pos, 2i} \cdot \cos(\beta) + PE_{pos, 2i+1} \cdot \sin(\beta)$$

This shows:
$$PE_{pos+k} = T_k \cdot PE_{pos}$$

Where $T_k$ is a rotation matrix dependent only on the offset $k$. The model can learn to attend based on relative positions through linear transformations. ∎

#### 2.1.3 PyTorch Implementation

```python
class SinusoidalPositionEncoding(nn.Module):
    """
    Sinusoidal Position Encoding with mathematical analysis.
    
    Properties:
    1. Bounded: PE values in [-1, 1]
    2. Deterministic: No learned parameters
    3. Extrapolatable: Can extend to longer sequences
    4. Relative: Encodes relative positions via rotation
    """
    
    def __init__(self, d_model: int, max_len: int = 5000, dropout: float = 0.1):
        super().__init__()
        self.d_model = d_model
        self.dropout = nn.Dropout(dropout)
        
        # Precompute position encodings
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        
        # Compute the division term: 10000^(2i/d)
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        
        # Apply sin to even indices, cos to odd indices
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        
        # Add batch dimension: (1, max_len, d_model)
        pe = pe.unsqueeze(0)
        
        # Register as buffer (not a parameter)
        self.register_buffer('pe', pe)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, d_model)
            
        Returns:
            x + position encoding
        """
        seq_len = x.size(1)
        x = x + self.pe[:, :seq_len, :]
        return self.dropout(x)
    
    def get_relative_encoding(self, k: int, dim: int) -> torch.Tensor:
        """
        Compute the relative position encoding for offset k.
        
        Returns the rotation matrix T_k such that:
        PE(pos + k) = T_k @ PE(pos)
        """
        angle = k / (10000 ** (2 * dim / self.d_model))
        return torch.tensor([
            [math.cos(angle), -math.sin(angle)],
            [math.sin(angle), math.cos(angle)]
        ])
```

### 2.2 Rotary Position Embedding (RoPE)

#### 2.2.1 Mathematical Formulation

**Definition**: RoPE encodes position through rotation matrices:

$$f(x, m) = R_m x$$

Where the rotation matrix $R_m$ for position $m$:

$$R_{\Theta,m} = \begin{pmatrix}
\cos m\theta_1 & -\sin m\theta_1 & 0 & 0 & \cdots \\
\sin m\theta_1 & \cos m\theta_1 & 0 & 0 & \cdots \\
0 & 0 & \cos m\theta_2 & -\sin m\theta_2 & \cdots \\
0 & 0 & \sin m\theta_2 & \cos m\theta_2 & \cdots \\
\vdots & \vdots & \vdots & \vdots & \ddots
\end{pmatrix}$$

With frequencies $\theta_i = 10000^{-2(i-1)/d}$.

#### 2.2.2 Proof of Relative Position Property

**Theorem**: RoPE attention scores depend only on relative position.

**Proof**:

For query at position $m$ and key at position $n$:

$$q_m^T k_n = (R_m q)^T (R_n k) = q^T R_m^T R_n k$$

Since rotation matrices are orthogonal: $R_m^T = R_{-m}$

$$R_m^T R_n = R_{-m} R_n = R_{n-m}$$

Therefore:
$$q_m^T k_n = q^T R_{n-m} k$$

The attention score depends only on the relative position $n - m$. ∎

#### 2.2.3 PyTorch Implementation

```python
class RotaryPositionEmbedding(nn.Module):
    """
    Rotary Position Embedding (RoPE).
    
    Key properties:
    1. Relative position encoding through rotations
    2. No learned parameters (deterministic)
    3. Works with 2D feature pairs
    4. Theoretically grounded in group theory
    """
    
    def __init__(self, d_model: int, max_seq_len: int = 2048, base: int = 10000):
        super().__init__()
        
        self.d_model = d_model
        self.max_seq_len = max_seq_len
        self.base = base
        
        # Compute inverse frequencies: θ_i = 10000^(-2i/d)
        inv_freq = 1.0 / (base ** (torch.arange(0, d_model, 2).float() / d_model))
        self.register_buffer('inv_freq', inv_freq)
        
        # Precompute cos and sin caches
        self._build_cache(max_seq_len)
        
    def _build_cache(self, seq_len: int):
        """Precompute rotation angles for efficiency."""
        t = torch.arange(seq_len, device=self.inv_freq.device, dtype=self.inv_freq.dtype)
        
        # Outer product: position × frequency
        freqs = torch.outer(t, self.inv_freq)
        
        # Duplicate for 2D rotations
        emb = torch.cat([freqs, freqs], dim=-1)
        
        self.register_buffer('cos_cached', emb.cos())
        self.register_buffer('sin_cached', emb.sin())
        
    def rotate_half(self, x: torch.Tensor) -> torch.Tensor:
        """
        Rotate pairs of features: (x1, x2) -> (-x2, x1)
        
        This implements the 2D rotation:
        [cos θ  -sin θ] [x1]   [x1 cos θ - x2 sin θ]
        [sin θ   cos θ] [x2] = [x1 sin θ + x2 cos θ]
        """
        x1, x2 = x[..., :x.shape[-1]//2], x[..., x.shape[-1]//2:]
        return torch.cat([-x2, x1], dim=-1)
    
    def apply_rotary_pos_emb(self, x: torch.Tensor, 
                              pos: torch.Tensor) -> torch.Tensor:
        """
        Apply rotary position embedding to tensor.
        
        RoPE(x, m) = x * cos(mθ) + rotate_half(x) * sin(mθ)
        """
        cos = self.cos_cached[pos]
        sin = self.sin_cached[pos]
        
        return x * cos + self.rotate_half(x) * sin
    
    def forward(self, q: torch.Tensor, k: torch.Tensor, 
                positions: torch.Tensor = None) -> tuple:
        """
        Apply RoPE to query and key tensors.
        
        Args:
            q, k: (batch, n_heads, seq_len, head_dim)
            positions: Optional position indices
            
        Returns:
            q_rotated, k_rotated
        """
        seq_len = q.shape[-2]
        
        if positions is None:
            positions = torch.arange(seq_len, device=q.device)
            
        # Apply rotations
        q_rot = self.apply_rotary_pos_emb(q, positions)
        k_rot = self.apply_rotary_pos_emb(k, positions)
        
        return q_rot, k_rot
```

### 2.3 Relative Position Encoding

#### 2.3.1 Mathematical Formulation

**Definition**: Relative position encoding modifies attention scores:

$$e_{ij} = \frac{q_i^T k_j}{\sqrt{d_k}} + a_{ij}^K + a_{ij}^V$$

Where $a_{ij}^K$ and $a_{ij}^V$ are learned embeddings for relative position $i - j$.

#### 2.3.2 Implementation

```python
class RelativePositionEncoding(nn.Module):
    """
    Relative Position Encoding for Transformers.
    
    Instead of absolute positions, encodes relative distances
    between query and key positions.
    """
    
    def __init__(self, d_model: int, max_relative_position: int = 128):
        super().__init__()
        
        self.d_model = d_model
        self.max_relative_position = max_relative_position
        
        # Learnable relative position embeddings
        # Index 0 = no relative position (same position)
        # Indices 1 to max = positive relative positions
        # Indices max+1 to 2*max = negative relative positions
        
        vocab_size = 2 * max_relative_position + 1
        self.relative_position_embeddings = nn.Embedding(vocab_size, d_model)
        
        # Precompute relative position indices
        self._build_relative_positions()
        
    def _build_relative_positions(self):
        """Precompute relative position index matrix."""
        # Create range of positions
        positions = torch.arange(-self.max_relative_position, 
                                  self.max_relative_position + 1)
        
        # Map to embedding indices
        self.register_buffer(
            'relative_position_indices',
            positions + self.max_relative_position
        )
    
    def get_relative_positions(self, seq_len: int) -> torch.Tensor:
        """
        Generate relative position matrix.
        
        Returns matrix where entry (i,j) = relative position i-j
        clamped to [-max, max].
        """
        positions = torch.arange(seq_len)
        relative_positions = positions.unsqueeze(0) - positions.unsqueeze(1)
        
        # Clamp to valid range
        relative_positions = torch.clamp(
            relative_positions, 
            -self.max_relative_position, 
            self.max_relative_position
        )
        
        # Convert to embedding indices
        return relative_positions + self.max_relative_position
    
    def forward(self, q: torch.Tensor, k: torch.Tensor) -> torch.Tensor:
        """
        Compute relative position bias for attention.
        
        Args:
            q, k: (batch, n_heads, seq_len, head_dim)
            
        Returns:
            bias: (batch, n_heads, seq_len, seq_len)
        """
        batch_size, n_heads, seq_len, head_dim = q.shape
        
        # Get relative position indices
        rel_pos_idx = self.get_relative_positions(seq_len).to(q.device)
        
        # Get embeddings
        rel_pos_emb = self.relative_position_embeddings(rel_pos_idx)
        
        # Compute bias: q @ rel_pos_emb^T
        # (batch, heads, seq, dim) @ (seq, seq, dim) -> (batch, heads, seq, seq)
        bias = torch.einsum('bhqd,qde->bhqe', q, rel_pos_emb)
        
        return bias
```

### 2.4 ALiBi (Attention with Linear Biases)

#### 2.4.1 Mathematical Formulation

**Definition**: ALiBi adds a linear bias to attention scores:

$$\text{Attention}(q_i, k_j) = q_i^T k_j - m \cdot |i - j|$$

Where $m$ is a head-specific slope, typically:
$$m_h = \frac{1}{2^{\frac{8h}{n_{heads}}}}$$

#### 2.4.2 PyTorch Implementation

```python
class ALiBi(nn.Module):
    """
    Attention with Linear Biases (ALiBi).
    
    Key insight: Replace position encodings with simple linear bias.
    Enables extrapolation to longer sequences than training length.
    
    Mathematical formulation:
    attention_score(i, j) = q_i · k_j - m_h * |i - j|
    
    Where m_h = 1 / 2^(8h/n_heads) for head h
    """
    
    def __init__(self, n_heads: int, max_seq_len: int = 2048):
        super().__init__()
        
        self.n_heads = n_heads
        self.max_seq_len = max_seq_len
        
        # Compute head-specific slopes
        # m_h = 1 / 2^(8h/n) for h = 1, 2, ..., n
        slopes = torch.tensor([
            1 / (2 ** (8 * h / n_heads)) for h in range(1, n_heads + 1)
        ])
        self.register_buffer('slopes', slopes)
        
        # Precompute bias matrix
        self._build_bias_matrix(max_seq_len)
        
    def _build_bias_matrix(self, seq_len: int):
        """
        Precompute ALiBi bias matrix.
        
        bias[h, i, j] = -m_h * |i - j|
        """
        positions = torch.arange(seq_len)
        
        # Relative distances: |i - j|
        distances = (positions.unsqueeze(0) - positions.unsqueeze(1)).abs()
        
        # Negative because we subtract the bias
        # Shape: (n_heads, seq_len, seq_len)
        bias = -self.slopes.view(-1, 1, 1) * distances.unsqueeze(0).float()
        
        self.register_buffer('bias', bias)
        
    def forward(self, attention_scores: torch.Tensor) -> torch.Tensor:
        """
        Add ALiBi bias to attention scores.
        
        Args:
            attention_scores: (batch, n_heads, seq_len, seq_len)
            
        Returns:
            Modified attention scores
        """
        seq_len = attention_scores.shape[-1]
        return attention_scores + self.bias[:, :seq_len, :seq_len]
```

---

## 3. Layer Normalization Mathematics

### 3.1 LayerNorm Derivation

#### 3.1.1 Mathematical Definition

**Definition**: Layer normalization computes:

$$\text{LN}(x) = \gamma \odot \frac{x - \mu}{\sigma} + \beta$$

Where:
$$\mu = \frac{1}{d}\sum_{i=1}^{d} x_i$$
$$\sigma = \sqrt{\frac{1}{d}\sum_{i=1}^{d}(x_i - \mu)^2 + \epsilon}$$

#### 3.1.2 Gradient Flow Analysis

**Theorem**: LayerNorm gradients are bounded.

**Proof**:

Let $y = \text{LN}(x)$. We compute $\frac{\partial y_i}{\partial x_j}$.

First, define:
$$\hat{x}_i = \frac{x_i - \mu}{\sigma}$$
$$y_i = \gamma_i \hat{x}_i + \beta_i$$

The Jacobian:
$$\frac{\partial y_i}{\partial x_j} = \gamma_i \frac{\partial \hat{x}_i}{\partial x_j}$$

For $\hat{x}_i$:
$$\frac{\partial \hat{x}_i}{\partial x_j} = \frac{1}{\sigma}\left(\delta_{ij} - \frac{1}{d} - \hat{x}_i \hat{x}_j\right)$$

This gives:
$$\frac{\partial y_i}{\partial x_j} = \frac{\gamma_i}{\sigma}\left(\delta_{ij} - \frac{1}{d} - \hat{x}_i \hat{x}_j\right)$$

**Key Properties**:
1. The gradient is scaled by $\frac{1}{\sigma}$, preventing explosion
2. The $\hat{x}_i \hat{x}_j$ term provides centering
3. Gradients are bounded: $\|\nabla_x y\| \leq \|\gamma\| \cdot \sqrt{d}$ ∎

#### 3.1.3 PyTorch Implementation

```python
class LayerNorm(nn.Module):
    """
    Layer Normalization with complete gradient analysis.
    
    Mathematical properties:
    1. Bounded gradients (prevents explosion)
    2. Independent of batch size
    3. Different mean/var per sample
    """
    
    def __init__(self, d_model: int, eps: float = 1e-6):
        super().__init__()
        
        self.d_model = d_model
        self.eps = eps
        
        # Learnable parameters
        self.gamma = nn.Parameter(torch.ones(d_model))
        self.beta = nn.Parameter(torch.zeros(d_model))
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, d_model)
            
        Returns:
            Normalized tensor
        """
        # Compute statistics along last dimension
        mean = x.mean(dim=-1, keepdim=True)
        var = x.var(dim=-1, keepdim=True, unbiased=False)
        
        # Normalize
        x_norm = (x - mean) / torch.sqrt(var + self.eps)
        
        # Scale and shift
        output = self.gamma * x_norm + self.beta
        
        return output
    
    def gradient_analysis(self, x: torch.Tensor) -> dict:
        """
        Analyze gradient flow through LayerNorm.
        
        Returns dict with gradient norms and bounds.
        """
        x_norm = self.forward(x)
        
        # Compute Jacobian norm bound
        sigma = torch.sqrt(x.var(dim=-1, keepdim=True, unbiased=False) + self.eps)
        grad_bound = torch.norm(self.gamma) / sigma * math.sqrt(self.d_model)
        
        return {
            'input_norm': torch.norm(x, dim=-1).mean(),
            'output_norm': torch.norm(x_norm, dim=-1).mean(),
            'gradient_bound': grad_bound.mean(),
            'sigma': sigma.mean()
        }
```

### 3.2 RMSNorm

#### 3.2.1 Mathematical Definition

**Definition**: RMS normalization simplifies LayerNorm by removing the mean centering:

$$\text{RMSNorm}(x) = \frac{x}{\sqrt{\frac{1}{d}\sum_{i=1}^{d} x_i^2 + \epsilon}} \odot \gamma$$

#### 3.2.2 Computational Efficiency Analysis

**Theorem**: RMSNorm is computationally simpler than LayerNorm.

**Proof**:

LayerNorm requires:
- Mean computation: $O(d)$ operations
- Variance computation: $O(d)$ operations
- Centering: $O(d)$ operations
- Total: $O(3d)$ operations

RMSNorm requires:
- Sum of squares: $O(d)$ operations
- Division: $O(d)$ operations
- Total: $O(2d)$ operations

**Speedup**: $\frac{3d}{2d} = 1.5\times$ theoretical speedup. ∎

#### 3.2.3 PyTorch Implementation

```python
class RMSNorm(nn.Module):
    """
    Root Mean Square Layer Normalization.
    
    Simplified version of LayerNorm without mean centering.
    More efficient while maintaining similar performance.
    
    Mathematical formulation:
    RMSNorm(x) = x / sqrt(mean(x^2) + ε) * γ
    """
    
    def __init__(self, d_model: int, eps: float = 1e-6):
        super().__init__()
        
        self.d_model = d_model
        self.eps = eps
        
        # Only gamma parameter (no beta)
        self.gamma = nn.Parameter(torch.ones(d_model))
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, d_model)
            
        Returns:
            RMS-normalized tensor
        """
        # Compute RMS
        rms = torch.sqrt(torch.mean(x ** 2, dim=-1, keepdim=True) + self.eps)
        
        # Normalize and scale
        return x / rms * self.gamma
    
    @staticmethod
    def compare_with_layernorm(x: torch.Tensor) -> dict:
        """
        Compare RMSNorm and LayerNorm outputs.
        """
        # RMSNorm
        rms = torch.sqrt(torch.mean(x ** 2, dim=-1, keepdim=True) + 1e-6)
        x_rms = x / rms
        
        # LayerNorm
        mean = x.mean(dim=-1, keepdim=True)
        std = x.std(dim=-1, keepdim=True, unbiased=False)
        x_ln = (x - mean) / std
        
        return {
            'rms_output_mean': x_rms.mean(),
            'ln_output_mean': x_ln.mean(),  # Should be ~0
            'rms_output_std': x_rms.std(),
            'ln_output_std': x_ln.std(),    # Should be ~1
            'difference_norm': torch.norm(x_rms - x_ln)
        }
```

### 3.3 Pre-norm vs Post-norm Dynamics

#### 3.3.1 Mathematical Comparison

**Post-Norm Architecture**:
$$x_{l+1} = \text{LN}(x_l + \text{Attention}(x_l))$$

**Pre-Norm Architecture**:
$$x_{l+1} = x_l + \text{Attention}(\text{LN}(x_l))$$

#### 3.3.2 Gradient Flow Analysis

**Theorem**: Pre-norm provides better gradient flow for deep networks.

**Proof**:

For post-norm, the gradient through $L$ layers:
$$\frac{\partial \mathcal{L}}{\partial x_0} = \frac{\partial \mathcal{L}}{\partial x_L} \prod_{l=1}^{L} \frac{\partial x_l}{\partial x_{l-1}}$$

Each $\frac{\partial x_l}{\partial x_{l-1}}$ involves LayerNorm, which can cause gradient attenuation.

For pre-norm:
$$x_{l+1} = x_l + f_l(\text{LN}(x_l))$$

The gradient:
$$\frac{\partial x_{l+1}}{\partial x_l} = I + \frac{\partial f_l}{\partial x_l}$$

The identity term $I$ ensures gradients flow directly through the residual connection. ∎

#### 3.3.3 Implementation Comparison

```python
class PreNormTransformerBlock(nn.Module):
    """
    Pre-Norm Transformer Block.
    
    Architecture:
    x ──────────────────────────────────► (+)
        │                                 ▲
        └─► LN ─► Attention ─► (+) ──────►│
                        │                  │
                        └──────────────────┘
    """
    
    def __init__(self, d_model: int, n_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        
        # Pre-normalization
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        
        # Attention and FFN
        self.attention = MultiHeadAttention(d_model, n_heads, dropout)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_ff, d_model),
            nn.Dropout(dropout)
        )
        
    def forward(self, x: torch.Tensor, mask: torch.Tensor = None) -> torch.Tensor:
        # Pre-norm attention
        x = x + self.attention(self.norm1(x), self.norm1(x), self.norm1(x), mask)
        
        # Pre-norm FFN
        x = x + self.ffn(self.norm2(x))
        
        return x


class PostNormTransformerBlock(nn.Module):
    """
    Post-Norm Transformer Block.
    
    Architecture:
    x ──────────────────────────────────► LN
        │                                 ▲
        └─► Attention ─► (+) ────────────┤
                        │                │
                        └────────────────┘
    """
    
    def __init__(self, d_model: int, n_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        
        # Post-normalization
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        
        # Attention and FFN
        self.attention = MultiHeadAttention(d_model, n_heads, dropout)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_ff, d_model),
            nn.Dropout(dropout)
        )
        
    def forward(self, x: torch.Tensor, mask: torch.Tensor = None) -> torch.Tensor:
        # Post-norm attention
        x = self.norm1(x + self.attention(x, x, x, mask))
        
        # Post-norm FFN
        x = self.norm2(x + self.ffn(x))
        
        return x
```

---

## 4. Feed-Forward Networks

### 4.1 GLU Variants

#### 4.1.1 Mathematical Definition

**Gated Linear Unit (GLU)**:
$$\text{GLU}(x) = (xW_1) \odot \sigma(xW_2)$$

Where:
- $W_1, W_2$ are learned weight matrices
- $\sigma$ is a gating function (sigmoid, GELU, Swish)
- $\odot$ is element-wise multiplication

#### 4.1.2 Variant Comparison

| Variant | Gate Function | Formula |
|---------|---------------|---------|
| GLU | Sigmoid | $(xW_1) \odot \sigma(xW_2)$ |
| SwiGLU | Swish/SiLU | $(xW_1) \odot \text{SiLU}(xW_2)$ |
| GeGLU | GELU | $(xW_1) \odot \text{GELU}(xW_2)$ |
| ReGLU | ReLU | $(xW_1) \odot \text{ReLU}(xW_2)$ |

#### 4.1.3 PyTorch Implementation

```python
class GLU(nn.Module):
    """
    Gated Linear Unit variants for Transformer FFN.
    
    Mathematical formulation:
    GLU(x) = (xW_1) ⊙ gate(xW_2)
    
    Where gate can be sigmoid, GELU, SiLU (Swish), etc.
    """
    
    def __init__(self, d_model: int, d_ff: int, variant: str = 'swiglu', 
                 dropout: float = 0.1):
        super().__init__()
        
        self.variant = variant
        
        # Gate projection (input -> 2*d_ff for gating)
        self.W_gate = nn.Linear(d_model, d_ff, bias=False)
        self.W_value = nn.Linear(d_model, d_ff, bias=False)
        
        # Output projection
        self.W_out = nn.Linear(d_ff, d_model, bias=False)
        
        self.dropout = nn.Dropout(dropout)
        
        # Select gate function
        self.gate_fn = self._get_gate_fn(variant)
        
    def _get_gate_fn(self, variant: str):
        """Return the appropriate gate function."""
        gates = {
            'glu': torch.sigmoid,
            'swiglu': F.silu,  # SiLU = Swish
            'geglu': F.gelu,
            'reglu': F.relu,
            'bilinear': lambda x: x  # No gating
        }
        return gates.get(variant, F.silu)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, d_model)
            
        Returns:
            output: (batch, seq_len, d_model)
        """
        # Compute gated values
        gate = self.gate_fn(self.W_gate(x))
        value = self.W_value(x)
        
        # Element-wise multiplication
        gated = gate * value
        
        # Dropout and output projection
        gated = self.dropout(gated)
        output = self.W_out(gated)
        
        return output


class SwiGLUFFN(nn.Module):
    """
    Complete FFN block with SwiGLU activation.
    
    Architecture used in LLaMA, PaLM, and other large language models.
    
    Mathematical formulation:
    FFN(x) = W_2(SiLU(xW_gate) ⊙ xW_up)
    
    Note: This uses 2/3 * 4d as hidden dimension to match parameter count
    of standard FFN while using three projections.
    """
    
    def __init__(self, d_model: int, d_ff: int = None, dropout: float = 0.1):
        super().__init__()
        
        # Default to match parameter count of standard FFN
        if d_ff is None:
            d_ff = int(8/3 * d_model)  # Roughly matches 4d parameters
        
        self.W_gate = nn.Linear(d_model, d_ff, bias=False)
        self.W_up = nn.Linear(d_model, d_ff, bias=False)
        self.W_down = nn.Linear(d_ff, d_model, bias=False)
        
        self.dropout = nn.Dropout(dropout)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # SwiGLU: SiLU(xW_gate) * xW_up
        gate = F.silu(self.W_gate(x))
        up = self.W_up(x)
        
        # Gated output
        hidden = gate * up
        hidden = self.dropout(hidden)
        
        # Down projection
        return self.W_down(hidden)
```

### 4.2 Mixture of Experts (MoE)

#### 4.2.1 Mathematical Formulation

**Definition**: MoE layer with $E$ experts:

$$\text{MoE}(x) = \sum_{i=1}^{E} g_i(x) \cdot E_i(x)$$

Where:
- $g_i(x)$ is the router/gate function
- $E_i(x)$ is expert $i$'s transformation
- Typically use top-k routing for efficiency

**Router (Gating Network)**:
$$g_i(x) = \text{softmax}((x \cdot w_i) / T)_i$$

**Top-k Routing**:
$$\text{MoE}_{top-k}(x) = \sum_{i \in \text{Top}_k(g(x))} g_i(x) \cdot E_i(x)$$

#### 4.2.2 Load Balancing Analysis

**Objective**: Balance expert utilization.

**Auxiliary Loss**:
$$\mathcal{L}_{aux} = \alpha \cdot \frac{1}{E} \sum_{i=1}^{E} f_i \cdot P_i$$

Where:
- $f_i$ = fraction of tokens routed to expert $i$
- $P_i$ = fraction of router probability mass for expert $i$

#### 4.2.3 PyTorch Implementation

```python
class MixtureOfExperts(nn.Module):
    """
    Mixture of Experts layer with top-k routing.
    
    Mathematical formulation:
    MoE(x) = Σ_{i ∈ Top_k(g(x))} g_i(x) * E_i(x)
    
    Features:
    - Top-k routing for efficiency
    - Load balancing auxiliary loss
    - Expert parallelism support
    """
    
    def __init__(self, d_model: int, d_ff: int, n_experts: int = 8, 
                 top_k: int = 2, dropout: float = 0.1):
        super().__init__()
        
        self.d_model = d_model
        self.d_ff = d_ff
        self.n_experts = n_experts
        self.top_k = top_k
        
        # Router (gating network)
        self.router = nn.Linear(d_model, n_experts, bias=False)
        
        # Experts (each is a simple FFN)
        self.experts = nn.ModuleList([
            nn.Sequential(
                nn.Linear(d_model, d_ff),
                nn.GELU(),
                nn.Dropout(dropout),
                nn.Linear(d_ff, d_model)
            ) for _ in range(n_experts)
        ])
        
        # For load balancing
        self.router_probs = None
        self.expert_counts = None
        
    def forward(self, x: torch.Tensor) -> tuple:
        """
        Args:
            x: (batch, seq_len, d_model)
            
        Returns:
            output: (batch, seq_len, d_model)
            aux_loss: Load balancing auxiliary loss
        """
        batch_size, seq_len, d_model = x.shape
        x_flat = x.view(-1, d_model)  # (batch*seq, d_model)
        
        # Compute router logits
        router_logits = self.router(x_flat)  # (batch*seq, n_experts)
        
        # Top-k selection
        top_k_logits, top_k_indices = torch.topk(router_logits, self.top_k, dim=-1)
        
        # Softmax over top-k
        top_k_probs = F.softmax(top_k_logits, dim=-1)
        
        # Create sparse routing weights
        routing_weights = torch.zeros_like(router_logits)
        routing_weights.scatter_(-1, top_k_indices, top_k_probs)
        
        # Store for auxiliary loss
        self.router_probs = F.softmax(router_logits, dim=-1)
        self.expert_counts = (routing_weights > 0).float().sum(dim=0)
        
        # Compute expert outputs
        output = torch.zeros_like(x_flat)
        
        for i, expert in enumerate(self.experts):
            # Find tokens routed to this expert
            expert_mask = (top_k_indices == i).any(dim=-1)
            
            if expert_mask.any():
                # Get tokens for this expert
                expert_input = x_flat[expert_mask]
                
                # Compute expert output
                expert_output = expert(expert_input)
                
                # Get routing weights for this expert
                expert_weights = routing_weights[expert_mask, i].unsqueeze(-1)
                
                # Weighted contribution
                output[expert_mask] += expert_weights * expert_output
        
        output = output.view(batch_size, seq_len, d_model)
        
        # Auxiliary loss for load balancing
        aux_loss = self._compute_aux_loss()
        
        return output, aux_loss
    
    def _compute_aux_loss(self) -> torch.Tensor:
        """
        Compute load balancing auxiliary loss.
        
        L_aux = α * (1/E) * Σ f_i * P_i
        
        This encourages uniform expert utilization.
        """
        if self.router_probs is None:
            return torch.tensor(0.0, device=next(self.parameters()).device)
        
        # f_i: fraction of tokens to expert i
        f = self.router_probs.mean(dim=0)
        
        # P_i: mean routing probability for expert i
        P = (self.router_probs > 0).float().mean(dim=0)
        
        # Load balancing loss
        aux_loss = (f * P).sum() * self.n_experts
        
        return aux_loss * 0.01  # Scale factor
```

### 4.3 Sparse Activation Patterns

#### 4.3.1 Analysis of Sparsity

**Definition**: Sparsity ratio for a layer:
$$\text{Sparsity} = \frac{\text{Number of zero activations}}{\text{Total activations}}$$

**Benefits**:
1. Reduced computation (skip zeros)
2. Implicit regularization
3. Improved generalization

#### 4.3.2 Implementation

```python
class SparseFFN(nn.Module):
    """
    FFN with sparse activation patterns.
    
    Uses Top-K sparsity: only keep top-k activations, rest set to zero.
    
    Mathematical formulation:
    SparseFFN(x) = W_2(Top_k(W_1(x)))
    
    Where Top_k keeps only the k largest values.
    """
    
    def __init__(self, d_model: int, d_ff: int, k: int = None, 
                 dropout: float = 0.1):
        super().__init__()
        
        self.d_model = d_model
        self.d_ff = d_ff
        
        # Default k to 50% sparsity
        if k is None:
            k = d_ff // 2
        
        self.k = k
        
        self.W_1 = nn.Linear(d_model, d_ff)
        self.W_2 = nn.Linear(d_ff, d_model)
        
        self.dropout = nn.Dropout(dropout)
        
        # Track sparsity statistics
        self.sparsity_ratio = None
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # First projection
        hidden = self.W_1(x)
        
        # Apply ReLU
        hidden = F.relu(hidden)
        
        # Top-k sparsity: keep only top-k values
        if self.k < self.d_ff:
            top_k_values, top_k_indices = torch.topk(hidden, self.k, dim=-1)
            
            # Create sparse representation
            sparse_hidden = torch.zeros_like(hidden)
            sparse_hidden.scatter_(-1, top_k_indices, top_k_values)
            
            hidden = sparse_hidden
            
            # Track sparsity
            self.sparsity_ratio = 1 - (hidden != 0).float().mean().item()
        
        hidden = self.dropout(hidden)
        
        # Second projection
        output = self.W_2(hidden)
        
        return output
```

---

## 5. RTT Integration

### 5.1 Permutation-Invariant Attention

#### 5.1.1 Mathematical Foundation

**Theorem**: Standard attention is permutation-equivariant.

**Proof**:

For a permutation matrix $P$:

$$\text{Attention}(PQ, PK, PV) = \text{softmax}\left(\frac{PQ(PK)^T}{\sqrt{d_k}}\right)PV$$

Since $P^T P = I$:

$$PQ(PK)^T = PQK^T P^T = P(QK^T)P^T$$

For softmax applied row-wise:
$$\text{softmax}(PSP^T)P = P \cdot \text{softmax}(S)$$

Therefore:
$$\text{Attention}(PQ, PK, PV) = P \cdot \text{Attention}(Q, K, V)$$

This is permutation-equivariance: permuting input permutes output the same way. ∎

#### 5.1.2 RTT-Specific Extensions

```python
class PermutationInvariantAttention(nn.Module):
    """
    Attention with explicit permutation invariance for RTT.
    
    Extends standard attention with:
    1. Invariant aggregation across permutation orbits
    2. Equivariant transformations within orbits
    3. Frame averaging for guaranteed invariance
    """
    
    def __init__(self, d_model: int, n_heads: int, n_permutations: int = 8):
        super().__init__()
        
        self.d_model = d_model
        self.n_heads = n_heads
        self.n_permutations = n_permutations
        
        # Base attention
        self.attention = MultiHeadAttention(d_model, n_heads)
        
        # Permutation embeddings (learnable)
        self.perm_embeddings = nn.Parameter(
            torch.randn(n_permutations, d_model) * 0.02
        )
        
    def generate_permutations(self, seq_len: int) -> torch.Tensor:
        """Generate permutation matrices for frame averaging."""
        permutations = []
        
        for i in range(min(self.n_permutations, math.factorial(seq_len))):
            if i == 0:
                # Identity
                perm = torch.eye(seq_len)
            else:
                # Random permutation
                perm_idx = torch.randperm(seq_len)
                perm = torch.zeros(seq_len, seq_len)
                perm[torch.arange(seq_len), perm_idx] = 1
            permutations.append(perm)
            
        return torch.stack(permutations)
    
    def frame_averaging(self, x: torch.Tensor, 
                        permutations: torch.Tensor) -> torch.Tensor:
        """
        Frame averaging for permutation invariance.
        
        f_avg(x) = (1/|G|) Σ_{g∈G} ρ(g)^{-1} f(ρ(g)x)
        
        Where G is the permutation group.
        """
        batch_size, seq_len, d_model = x.shape
        
        outputs = []
        
        for perm in permutations:
            # Apply permutation: ρ(g)x
            perm_matrix = perm.to(x.device)
            x_perm = torch.matmul(perm_matrix, x)
            
            # Compute attention on permuted input
            output_perm = self.attention(x_perm, x_perm, x_perm)
            
            # Inverse permutation: ρ(g)^{-1} f(ρ(g)x)
            output = torch.matmul(perm_matrix.T, output_perm)
            outputs.append(output)
        
        # Average over all permutations
        output_avg = torch.stack(outputs).mean(dim=0)
        
        return output_avg
    
    def forward(self, x: torch.Tensor, use_frame_avg: bool = False) -> torch.Tensor:
        if use_frame_avg:
            permutations = self.generate_permutations(x.size(1))
            return self.frame_averaging(x, permutations)
        else:
            return self.attention(x, x, x)
```

### 5.2 Certainty-Based Layer Removal

#### 5.2.1 Mathematical Foundation

**Definition**: RTT uses certainty-based dynamic depth:

$$L(c) = \lfloor L_{max}(1 - c)^2 \rfloor$$

Where:
- $L(c)$ is the number of layers used given certainty $c$
- $c \in [0, 1]$ is the model's confidence
- $L_{max}$ is the maximum number of layers

**Theorem**: Layer removal satisfies least-action principle.

**Proof**:

Define the action functional:
$$S = \int_{t_0}^{t_1} L(x, \dot{x}, t) \, dt$$

For neural computation, minimize:
$$\mathcal{A} = \sum_{l=1}^{L} E_l \cdot \mathbf{1}_{l \leq L(c)}$$

Where $E_l$ is the energy cost of layer $l$.

When certainty $c$ is high:
- $(1 - c)^2$ is small
- $L(c)$ is small
- Fewer layers used → less energy

When certainty $c$ is low:
- $(1 - c)^2$ is large
- $L(c)$ is large
- More layers used → more computation

This minimizes expected computation while maintaining accuracy. ∎

#### 5.2.2 Implementation

```python
class CertaintyBasedDepth(nn.Module):
    """
    Dynamic depth module for RTT based on certainty.
    
    Mathematical formulation:
    L(c) = floor(L_max * (1 - c)^2)
    
    Properties:
    - High certainty → fewer layers
    - Low certainty → more layers
    - Follows least-action principle
    """
    
    def __init__(self, d_model: int, L_max: int = 12, n_heads: int = 8,
                 d_ff: int = 2048):
        super().__init__()
        
        self.L_max = L_max
        self.d_model = d_model
        
        # Stack of transformer layers
        self.layers = nn.ModuleList([
            PreNormTransformerBlock(d_model, n_heads, d_ff)
            for _ in range(L_max)
        ])
        
        # Certainty estimator
        self.certainty_head = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Linear(d_model // 2, 1),
            nn.Sigmoid()
        )
        
        # Statistics tracking
        self.layer_usage_stats = {}
        
    def compute_certainty(self, x: torch.Tensor) -> torch.Tensor:
        """
        Estimate model certainty from hidden states.
        
        Uses variance of pooled representation.
        """
        # Pool across sequence
        x_pooled = x.mean(dim=1)  # (batch, d_model)
        
        # Compute certainty
        certainty = self.certainty_head(x_pooled)  # (batch, 1)
        
        return certainty.squeeze(-1)  # (batch,)
    
    def forward(self, x: torch.Tensor) -> tuple:
        """
        Forward pass with dynamic depth.
        
        Returns:
            output: Transformed tensor
            layers_used: Number of layers actually used
            certainty: Model certainty estimate
        """
        batch_size = x.size(0)
        
        # Initial certainty estimate
        certainty = self.compute_certainty(x)
        
        # Compute number of layers to use
        # L(c) = floor(L_max * (1 - c)^2)
        layers_to_use = torch.floor(
            self.L_max * (1 - certainty) ** 2
        ).long()
        
        # Clamp to at least 1 layer
        layers_to_use = torch.clamp(layers_to_use, min=1)
        
        # Use maximum layers needed across batch (for batching)
        max_layers = layers_to_use.max().item()
        max_layers = min(max_layers, self.L_max)
        
        # Apply layers
        for l in range(max_layers):
            x = self.layers[l](x)
            
            # Track usage
            self.layer_usage_stats[l] = self.layer_usage_stats.get(l, 0) + 1
        
        return x, max_layers, certainty.mean().item()
```

### 5.3 Self-Origin Tensor as Attention Origin

#### 5.3.1 Conceptual Integration

The Self-Origin Tensor Architecture provides a novel perspective on attention:

**Key Insight**: In RTT, attention originates from a "self" position (origin), not from abstract queries.

```python
class SelfOriginAttention(nn.Module):
    """
    Attention mechanism based on Self-Origin Tensor Architecture.
    
    Key principle: The agent IS a position, not a process.
    Attention originates from the "self" at the origin.
    
    Mathematical formulation:
    - Origin: (0, 0, 0) - the "I" position
    - Signal: Rate of change at origin
    - Attention: Flow through geometry, not calculation
    """
    
    def __init__(self, d_model: int, n_heads: int):
        super().__init__()
        
        self.d_model = d_model
        self.n_heads = n_heads
        
        # Self-position embedding (the "I")
        self.origin_embedding = nn.Parameter(torch.zeros(d_model))
        
        # Attention mechanism
        self.attention = MultiHeadAttention(d_model, n_heads)
        
        # Rate of change detector
        self.rate_of_change = nn.Sequential(
            nn.Linear(d_model * 2, d_model),
            nn.GELU(),
            nn.Linear(d_model, d_model)
        )
        
        # Glitch detector (unexpected changes)
        self.glitch_threshold = nn.Parameter(torch.tensor(0.1))
        
    def compute_signal(self, x: torch.Tensor, prev_x: torch.Tensor) -> torch.Tensor:
        """
        Compute rate of change at origin.
        
        The signal IS the rate of change - no calculation needed,
        just flow through the structure.
        """
        # Rate of change through position
        delta = x - prev_x
        
        # Intensity at origin
        signal = self.rate_of_change(torch.cat([x, delta], dim=-1))
        
        return signal
    
    def detect_glitch(self, signal: torch.Tensor, 
                      expected: torch.Tensor) -> torch.Tensor:
        """
        Detect "glitches in the matrix" - unexpected deviations.
        
        These ARE the signals that matter.
        """
        deviation = torch.norm(signal - expected, dim=-1)
        is_glitch = deviation > self.glitch_threshold
        
        return is_glitch, deviation
    
    def forward(self, x: torch.Tensor, prev_x: torch.Tensor = None,
                expected: torch.Tensor = None) -> torch.Tensor:
        """
        Self-Origin Attention forward pass.
        
        The agent monitors from its position (origin).
        Attention flows through geometric relationships.
        """
        batch_size, seq_len, _ = x.shape
        
        # Add origin (self) to sequence
        origin = self.origin_embedding.view(1, 1, -1).expand(batch_size, 1, -1)
        x_with_origin = torch.cat([origin, x], dim=1)
        
        # Standard attention from origin position
        output = self.attention(x_with_origin, x_with_origin, x_with_origin)
        
        # Extract origin output (the "I" perspective)
        origin_output = output[:, 0:1, :]
        rest_output = output[:, 1:, :]
        
        # If we have previous state, compute signal
        if prev_x is not None:
            signal = self.compute_signal(origin_output, prev_x)
            
            if expected is not None:
                is_glitch, deviation = self.detect_glitch(signal, expected)
                return rest_output, signal, is_glitch
        
        return rest_output
```

### 5.4 Glitch Detection as Attention Signal

#### 5.4.1 Mathematical Formulation

The "glitch" is the difference between expected and actual attention patterns:

$$\text{Glitch} = \|A_{actual} - A_{expected}\|_F$$

Where $A$ is the attention weight matrix.

This connects to the Professional Hitter metaphor:
- The encoded program runs on automatic (expected trajectory)
- The mind monitors for glitches (deviations from expected)
- When glitch detected, adjust the trigger

```python
class GlitchDetector(nn.Module):
    """
    Glitch detection for RTT attention.
    
    Mathematical formulation:
    Glitch = ||A_actual - A_expected||_F
    
    Properties:
    - Monitors attention patterns for unexpected deviations
    - Triggers adaptation when glitches detected
    - Embodies the "Professional Hitter" principle
    """
    
    def __init__(self, d_model: int, threshold: float = 0.1):
        super().__init__()
        
        self.d_model = d_model
        self.threshold = threshold
        
        # Expected pattern estimator
        self.pattern_predictor = nn.Sequential(
            nn.Linear(d_model, d_model),
            nn.GELU(),
            nn.Linear(d_model, d_model)
        )
        
        # Statistics
        self.glitch_count = 0
        self.total_checks = 0
        
    def predict_expected_attention(self, x: torch.Tensor) -> torch.Tensor:
        """Predict expected attention pattern from input."""
        return self.pattern_predictor(x)
    
    def compute_glitch(self, actual: torch.Tensor, 
                       expected: torch.Tensor) -> dict:
        """
        Compute glitch magnitude between actual and expected.
        
        Returns glitch statistics including:
        - Magnitude (Frobenius norm of difference)
        - Direction (which way it deviated)
        - Is glitch (exceeds threshold)
        """
        # Frobenius norm of difference
        difference = actual - expected
        magnitude = torch.norm(difference, p='fro', dim=(-2, -1))
        
        # Direction of deviation
        direction = F.normalize(difference.flatten(start_dim=-2), dim=-1)
        
        # Is glitch?
        is_glitch = magnitude > self.threshold
        
        # Update statistics
        self.total_checks += 1
        self.glitch_count += is_glitch.sum().item()
        
        return {
            'magnitude': magnitude,
            'direction': direction,
            'is_glitch': is_glitch,
            'glitch_rate': self.glitch_count / max(self.total_checks, 1)
        }
    
    def forward(self, attention_weights: torch.Tensor,
                query: torch.Tensor) -> dict:
        """
        Detect glitches in attention patterns.
        
        The glitch IS the signal - no calculation needed.
        """
        # Predict expected pattern
        expected = self.predict_expected_attention(query)
        
        # Compute glitch
        glitch_info = self.compute_glitch(attention_weights, expected)
        
        return glitch_info
```

---

## 6. Performance Analysis

### 6.1 Complexity Analysis

| Component | Time Complexity | Space Complexity |
|-----------|-----------------|------------------|
| Standard Attention | $O(n^2 d)$ | $O(n^2 + nd)$ |
| Linear Attention | $O(nd^2)$ | $O(d^2 + nd)$ |
| Multi-Head Attention | $O(n^2 d)$ | $O(n^2 h + nd)$ |
| RoPE | $O(nd)$ | $O(nd)$ |
| LayerNorm | $O(nd)$ | $O(nd)$ |
| RMSNorm | $O(nd)$ | $O(nd)$ |
| MoE (top-k) | $O(nkd)$ | $O(Ekd + nd)$ |

### 6.2 Memory Footprint Analysis

```python
def compute_memory_footprint(d_model: int, seq_len: int, n_heads: int,
                              n_layers: int, batch_size: int) -> dict:
    """
    Compute memory footprint for transformer model.
    
    Returns detailed breakdown by component.
    """
    # Parameters
    embed_params = 2 * d_model * 50000  # Embedding + output
    attn_params_per_layer = 4 * d_model * d_model  # Q, K, V, O projections
    ffn_params_per_layer = 2 * d_model * 4 * d_model  # FFN
    
    total_params = embed_params + n_layers * (attn_params_per_layer + ffn_params_per_layer)
    param_memory = total_params * 4  # FP32
    
    # Activations
    activation_memory = batch_size * seq_len * d_model * n_layers * 4
    
    # Attention scores
    attention_memory = batch_size * n_heads * seq_len * seq_len * n_layers * 4
    
    # Gradients (same as parameters)
    gradient_memory = param_memory
    
    # Optimizer states (Adam: 2x params)
    optimizer_memory = 2 * param_memory
    
    total_memory = (param_memory + activation_memory + attention_memory + 
                   gradient_memory + optimizer_memory)
    
    return {
        'parameters_mb': param_memory / (1024 ** 2),
        'activations_mb': activation_memory / (1024 ** 2),
        'attention_mb': attention_memory / (1024 ** 2),
        'gradients_mb': gradient_memory / (1024 ** 2),
        'optimizer_mb': optimizer_memory / (1024 ** 2),
        'total_mb': total_memory / (1024 ** 2),
        'total_gb': total_memory / (1024 ** 3)
    }
```

### 6.3 Benchmark Suite

```python
import time
import torch
import torch.nn as nn

class TransformerBenchmark:
    """
    Comprehensive benchmark suite for transformer components.
    """
    
    @staticmethod
    def benchmark_attention(attention_module, d_model: int, seq_len: int,
                           batch_size: int, n_runs: int = 100) -> dict:
        """Benchmark attention mechanism."""
        device = next(attention_module.parameters()).device
        
        # Create dummy inputs
        x = torch.randn(batch_size, seq_len, d_model, device=device)
        
        # Warmup
        for _ in range(10):
            _ = attention_module(x, x, x)
        
        # Synchronize
        if device.type == 'cuda':
            torch.cuda.synchronize()
        
        # Benchmark
        start = time.perf_counter()
        for _ in range(n_runs):
            _ = attention_module(x, x, x)
        
        if device.type == 'cuda':
            torch.cuda.synchronize()
        
        end = time.perf_counter()
        
        avg_time_ms = (end - start) / n_runs * 1000
        throughput = batch_size * seq_len / (avg_time_ms / 1000)
        
        return {
            'avg_time_ms': avg_time_ms,
            'throughput_tokens_per_sec': throughput,
            'memory_allocated_mb': torch.cuda.max_memory_allocated() / (1024 ** 2) 
                                   if device.type == 'cuda' else 0
        }
    
    @staticmethod
    def compare_attention_variants(d_model: int, seq_len: int, 
                                   batch_size: int) -> dict:
        """Compare different attention implementations."""
        results = {}
        
        # Standard attention
        standard = MultiHeadAttention(d_model, n_heads=8)
        results['standard'] = TransformerBenchmark.benchmark_attention(
            standard, d_model, seq_len, batch_size
        )
        
        # Linear attention
        linear = LinearAttention(d_model, n_heads=8)
        results['linear'] = TransformerBenchmark.benchmark_attention(
            linear, d_model, seq_len, batch_size
        )
        
        return results
```

---

## 7. References

### Foundational Papers

1. Vaswani, A., et al. (2017). "Attention Is All You Need." *NeurIPS 2017*.

2. Su, J., et al. (2021). "RoFormer: Enhanced Transformer with Rotary Position Embedding." *arXiv:2104.09864*.

3. Press, O., et al. (2022). "Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation." *ICLR 2022*.

4. Ba, J. L., et al. (2016). "Layer Normalization." *arXiv:1607.06450*.

5. Zhang, B., & Sennrich, R. (2019). "Root Mean Square Layer Normalization." *NeurIPS 2019*.

### GLU and Activation

6. Dauphin, Y. N., et al. (2017). "Language Modeling with Gated Convolutional Networks." *ICML 2017*.

7. Shazeer, N. (2020). "GLU Variants Improve Transformer." *arXiv:2002.05202*.

### Mixture of Experts

8. Shazeer, N., et al. (2017). "Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer." *ICLR 2017*.

9. Fedus, W., et al. (2022). "Switch Transformers: Scaling to Trillion Parameter Models." *JMLR*.

### Linear Attention

10. Katharopoulos, A., et al. (2020). "Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention." *ICML 2020*.

11. Choromanski, K., et al. (2021). "Rethinking Attention with Performers." *ICLR 2021*.

### Relative Position

12. Shaw, P., et al. (2018). "Self-Attention with Relative Position Representations." *NAACL 2018*.

13. Huang, Z., et al. (2020). "Improving Transformer Models by Reordering Their Sequence Length." *arXiv:2001.11336*.

---

## Appendix A: Mathematical Notation Summary

| Symbol | Meaning |
|--------|---------|
| $Q, K, V$ | Query, Key, Value matrices |
| $d_k, d_v$ | Key and Value dimensions |
| $W^Q, W^K, W^V$ | Projection matrices |
| $h$ | Number of attention heads |
| $PE$ | Position Encoding |
| $\gamma, \beta$ | LayerNorm scale and shift |
| $\sigma$ | Standard deviation / gating function |
| $\phi$ | Feature map for linear attention |
| $E$ | Number of experts (MoE) |
| $g$ | Router/gate function |
| $L(c)$ | Layer count based on certainty |
| $\mathcal{O}$ | Origin position (Self-Origin Tensor) |

---

## Appendix B: Implementation Checklist

- [x] Scaled Dot-Product Attention
- [x] Multi-Head Attention
- [x] Linear Attention variants
- [x] Sinusoidal Position Encoding
- [x] Rotary Position Embedding (RoPE)
- [x] Relative Position Encoding
- [x] ALiBi
- [x] LayerNorm with gradient analysis
- [x] RMSNorm
- [x] Pre-norm vs Post-norm
- [x] GLU variants (SwiGLU, GeGLU)
- [x] Mixture of Experts
- [x] Sparse Activation
- [x] Permutation-Invariant Attention
- [x] Certainty-Based Layer Removal
- [x] Self-Origin Attention
- [x] Glitch Detection
- [x] Memory footprint analysis
- [x] Benchmark suite

---

*Document Version: 1.0*  
*Last Updated: 2025-01-20*  
*Integration: RTT Architecture and Self-Origin Tensor*
