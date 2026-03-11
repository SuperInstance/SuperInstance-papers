"""
RTT TILE LIBRARY - Core Implementation
======================================

Mathematical building blocks for Rubiks-Tensor-Transformer.
All tiles are composable, documented, and cross-language compatible.

TIER 0 TILES (2-4 char names): Essential operations
TIER 1 TILES (5-8 char names): Standard operations
TIER 2 TILES (9+ char names): Specialized operations

Usage:
    from tile_library import cmp, inv, ap, ent, cmax
    
    # Compose tiles
    certainty = cmax(old_cert, ent2cert(attention))
    new_perm = cmp(old_perm, sinkhorn(attention))
"""

import torch
import torch.nn.functional as F
import math
from typing import List, Tuple, Optional, Union
from dataclasses import dataclass

# =============================================================================
# TIER 0 TILES (HIGH Frequency - 2-4 char names)
# =============================================================================

# -----------------------------------------------------------------------------
# PERMUTATION TILES
# -----------------------------------------------------------------------------

def cmp(σ: torch.Tensor, τ: torch.Tensor) -> torch.Tensor:
    """
    TILE: cmp (compose)
    MATH: (σ ∘ τ)(i) = σ(τ(i))
    USES: HIGH
    
    Compose two permutations.
    σ[i] gives the image of i under σ.
    """
    return τ.gather(-1, σ)


def inv(σ: torch.Tensor) -> torch.Tensor:
    """
    TILE: inv (inverse)
    MATH: σ⁻¹ such that σ[σ⁻¹] = id
    USES: HIGH
    
    Compute inverse permutation.
    """
    return torch.argsort(σ, dim=-1)


def id(n: int, batch_size: int = 1, device: torch.device = None) -> torch.Tensor:
    """
    TILE: id (identity)
    MATH: id(i) = i
    USES: HIGH
    
    Create identity permutation.
    """
    return torch.arange(n, device=device).unsqueeze(0).expand(batch_size, -1)


def ap(σ: torch.Tensor, x: torch.Tensor) -> torch.Tensor:
    """
    TILE: ap (apply)
    MATH: (σ · x)[i] = x[σ⁻¹(i)]
    USES: HIGH
    
    Apply permutation to data.
    """
    inv_σ = inv(σ)
    if x.dim() == 2:
        return x.gather(-1, inv_σ)
    elif x.dim() == 3:
        # x: (batch, n, d), σ: (batch, n)
        return x.gather(1, inv_σ.unsqueeze(-1).expand(-1, -1, x.shape[-1]))
    else:
        raise ValueError(f"ap: x must be 2D or 3D, got {x.dim()}D")


def cyc(σ: torch.Tensor) -> List[List[int]]:
    """
    TILE: cyc (cycles)
    MATH: σ = (a₁ a₂ ...)(b₁ b₂ ...)
    USES: HIGH
    
    Decompose permutation into disjoint cycles.
    Returns list of cycles (each cycle is a list of indices).
    """
    if σ.dim() > 1:
        σ = σ[0]  # Take first batch element
    
    n = len(σ)
    visited = [False] * n
    cycles = []
    
    for i in range(n):
        if not visited[i]:
            cycle = []
            j = i
            while not visited[j]:
                visited[j] = True
                cycle.append(j)
                j = σ[j].item()
            if len(cycle) > 1:
                cycles.append(cycle)
    
    return cycles


def sgn(σ: torch.Tensor) -> torch.Tensor:
    """
    TILE: sgn (sign)
    MATH: sgn(σ) = (-1)^(#transpositions) = (-1)^(n - #cycles)
    USES: HIGH
    
    Compute sign of permutation.
    """
    cycles = cyc(σ)
    n = σ.shape[-1] if σ.dim() > 1 else len(σ)
    n_cycles = len(cycles) + (n - sum(len(c) for c in cycles))  # Include 1-cycles
    return torch.tensor((-1) ** (n - n_cycles))


def trn(i: int, j: int, n: int, device: torch.device = None) -> torch.Tensor:
    """
    TILE: trn (transpose)
    MATH: (i j) swaps i and j
    USES: HIGH
    
    Create transposition permutation.
    """
    perm = torch.arange(n, device=device)
    perm[i], perm[j] = perm[j].clone(), perm[i].clone()
    return perm


# -----------------------------------------------------------------------------
# CERTAINTY TILES
# -----------------------------------------------------------------------------

def cmax(c1: torch.Tensor, c2: torch.Tensor) -> torch.Tensor:
    """
    TILE: cmax (certainty max)
    MATH: c' = max(c₁, c₂)
    USES: HIGH
    
    Certainty never decreases - take max.
    """
    return torch.maximum(c1, c2)


def ent(p: torch.Tensor, dim: int = -1) -> torch.Tensor:
    """
    TILE: ent (entropy)
    MATH: H(p) = -Σ p_i log p_i
    USES: HIGH
    
    Compute Shannon entropy.
    """
    p_safe = torch.clamp(p, min=1e-10)
    return -torch.sum(p_safe * torch.log(p_safe), dim=dim)


def ent2cert(H: torch.Tensor, H_max: float, alpha: float = 1.0) -> torch.Tensor:
    """
    TILE: ent2cert
    MATH: c = sigmoid(α · (H_max - H))
    USES: HIGH
    
    Convert entropy to certainty.
    Low entropy → high certainty.
    """
    return torch.sigmoid(alpha * (H_max - H))


# -----------------------------------------------------------------------------
# CATEGORY TILES
# -----------------------------------------------------------------------------

def ret(x: torch.Tensor) -> 'CertainTensor':
    """
    TILE: ret (return/unit)
    MATH: a → M a (lift to context)
    USES: HIGH
    
    Lift value to CertainTensor context.
    """
    return CertainTensor(data=x, certainty=torch.ones(x.shape[:-1]) * 0.5)


def bind(ct: 'CertainTensor', f) -> 'CertainTensor':
    """
    TILE: bind
    MATH: M a → (a → M b) → M b
    USES: HIGH
    
    Chain operations in CertainTensor context.
    """
    result = f(ct.data)
    # Certainty propagates through
    result.certainty = cmax(ct.certainty, result.certainty)
    return result


def ext(ct: 'CertainTensor') -> torch.Tensor:
    """
    TILE: ext (extract)
    MATH: W a → a
    USES: HIGH
    
    Extract value from CertainTensor.
    """
    return ct.data


def dup(ct: 'CertainTensor') -> 'CertainTensor':
    """
    TILE: dup (duplicate)
    MATH: W a → W (W a)
    USES: HIGH
    
    Duplicate CertainTensor context (for comonadic operations).
    """
    # Creates nested structure - here we just return with metadata
    ct.metadata['duplicated'] = True
    return ct


# =============================================================================
# TIER 1 TILES (MED Frequency - 5-8 char names)
# =============================================================================

def sinkhorn(logits: torch.Tensor, temp: float = 0.1, n_iter: int = 20) -> torch.Tensor:
    """
    TILE: sinkhorn
    MATH: P = Sinkhorn(exp(logits/τ))
    USES: MED
    
    Convert logits to doubly-stochastic matrix via Sinkhorn iterations.
    """
    P = torch.exp(logits / temp)
    for _ in range(n_iter):
        P = P / (P.sum(dim=-1, keepdim=True) + 1e-10)
        P = P / (P.sum(dim=-2, keepdim=True) + 1e-10)
    return P


def kl(p: torch.Tensor, q: torch.Tensor) -> torch.Tensor:
    """
    TILE: kl (KL divergence)
    MATH: D_KL(P||Q) = Σ P(i) log(P(i)/Q(i))
    USES: MED
    """
    p_safe = torch.clamp(p, min=1e-10)
    q_safe = torch.clamp(q, min=1e-10)
    return torch.sum(p_safe * (torch.log(p_safe) - torch.log(q_safe)), dim=-1)


def xent(p: torch.Tensor, q: torch.Tensor) -> torch.Tensor:
    """
    TILE: xent (cross-entropy)
    MATH: H(P,Q) = -Σ P(i) log Q(i)
    USES: MED
    """
    q_safe = torch.clamp(q, min=1e-10)
    return -torch.sum(p * torch.log(q_safe), dim=-1)


def mi(joint: torch.Tensor, margin_x: torch.Tensor, margin_y: torch.Tensor) -> torch.Tensor:
    """
    TILE: mi (mutual information)
    MATH: I(X;Y) = H(X) - H(X|Y) = Σ P(x,y) log(P(x,y)/P(x)P(y))
    USES: MED
    """
    return kl(joint, torch.outer(margin_x, margin_y))


def softmax_stable(x: torch.Tensor, dim: int = -1) -> torch.Tensor:
    """
    TILE: softmax_stable
    MATH: σ(x)_i = exp(x_i - max(x)) / Σ exp(x_j - max(x))
    USES: MED
    
    Numerically stable softmax.
    """
    x_max = x.max(dim=dim, keepdim=True)[0]
    exp_x = torch.exp(x - x_max)
    return exp_x / exp_x.sum(dim=dim, keepdim=True)


def logsumexp(x: torch.Tensor, dim: int = -1) -> torch.Tensor:
    """
    TILE: logsumexp
    MATH: log(Σ exp(x_i)) = max(x) + log(Σ exp(x_i - max(x)))
    USES: MED
    
    Numerically stable log-sum-exp.
    """
    x_max = x.max(dim=dim, keepdim=True)[0]
    return x_max.squeeze(dim) + torch.log(torch.exp(x - x_max).sum(dim=dim))


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class CertainTensor:
    """
    TILE: ct (CertainTensor)
    MATH: (value, certainty) ∈ ℝ^(n×d) × [0,1]^n
    USES: HIGH
    
    Tensor with certainty encoding.
    """
    data: torch.Tensor          # Shape: (batch, n, d)
    certainty: torch.Tensor     # Shape: (batch, n)
    permutation: torch.Tensor = None  # Shape: (batch, n)
    metadata: dict = None
    
    def __post_init__(self):
        if self.permutation is None:
            self.permutation = id(self.data.shape[1], self.data.shape[0], self.data.device)
        if self.metadata is None:
            self.metadata = {}
    
    def mean_certainty(self) -> torch.Tensor:
        """Mean certainty across all positions."""
        return self.certainty.mean(dim=-1)
    
    def to(self, device: torch.device) -> 'CertainTensor':
        return CertainTensor(
            data=self.data.to(device),
            certainty=self.certainty.to(device),
            permutation=self.permutation.to(device),
            metadata=self.metadata
        )


# =============================================================================
# META-TILES (Compiled Sequences)
# =============================================================================

def cert_from_attn(attn: torch.Tensor, old_cert: torch.Tensor, alpha: float = 1.0) -> torch.Tensor:
    """
    META-TILE: cert_from_attn
    
    Sequence:
      1. H = ent(attn)
      2. H_max = log(n)
      3. update = sigmoid(α · (H_max - H))
      4. c' = cmax(old_cert, update)
    """
    n = attn.shape[-1]
    H_max = math.log(n)
    H = ent(attn)
    update = ent2cert(H, H_max, alpha)
    return cmax(old_cert, update)


def perm_from_attn(
    attn: torch.Tensor,
    old_perm: torch.Tensor,
    temp: float = 0.1
) -> torch.Tensor:
    """
    META-TILE: perm_from_attn
    
    Sequence:
      1. logits = log(attn)
      2. P = sinkhorn(logits, temp)
      3. new_perm = argmax(P)
      4. σ' = cmp(old_perm, new_perm)
    """
    logits = torch.log(attn + 1e-10)
    P = sinkhorn(logits, temp)
    new_perm = P.argmax(dim=-1)
    return cmp(old_perm, new_perm)


def layer_count(certainty: torch.Tensor, max_layers: int, min_layers: int = 1) -> int:
    """
    META-TILE: layer_count
    
    MATH: L(c) = ⌊L_max · (1 - mean(c))²⌋
    """
    mean_c = certainty.mean().item()
    L = max_layers * (1 - mean_c) ** 2
    return max(min_layers, int(L))


# =============================================================================
# RTT CORE BLOCK
# =============================================================================

class RTTBlock(torch.nn.Module):
    """
    META-TILE: rtt_block
    
    Complete RTT attention block with:
    - Permutation-equivariant attention
    - Certainty tracking
    - Permutation tracking
    """
    
    def __init__(self, d_model: int, n_heads: int = 8, dropout: float = 0.1):
        super().__init__()
        self.d_model = d_model
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads
        
        self.q_proj = torch.nn.Linear(d_model, d_model)
        self.k_proj = torch.nn.Linear(d_model, d_model)
        self.v_proj = torch.nn.Linear(d_model, d_model)
        self.out_proj = torch.nn.Linear(d_model, d_model)
        
        self.dropout = torch.nn.Dropout(dropout)
    
    def forward(self, ct: CertainTensor) -> CertainTensor:
        """
        Forward pass maintaining certainty and permutation tracking.
        """
        batch, n, d = ct.data.shape
        
        # Project Q, K, V
        Q = self.q_proj(ct.data).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        K = self.k_proj(ct.data).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        V = self.v_proj(ct.data).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        
        # Attention scores
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.head_dim)
        attn = softmax_stable(scores, dim=-1)
        attn = self.dropout(attn)
        
        # Apply attention
        out = torch.matmul(attn, V)
        out = out.transpose(1, 2).contiguous().view(batch, n, d)
        out = self.out_proj(out)
        
        # Update certainty
        avg_attn = attn.mean(dim=1)  # Average over heads
        new_certainty = cert_from_attn(avg_attn, ct.certainty)
        
        # Update permutation
        new_perm = perm_from_attn(avg_attn, ct.permutation)
        
        return CertainTensor(
            data=out,
            certainty=new_certainty,
            permutation=new_perm,
            metadata=ct.metadata
        )


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # TIER 0
    'cmp', 'inv', 'id', 'ap', 'cyc', 'sgn', 'trn',
    'cmax', 'ent', 'ent2cert',
    'ret', 'bind', 'ext', 'dup',
    
    # TIER 1
    'sinkhorn', 'kl', 'xent', 'mi', 'softmax_stable', 'logsumexp',
    
    # DATA STRUCTURES
    'CertainTensor',
    
    # META-TILES
    'cert_from_attn', 'perm_from_attn', 'layer_count',
    
    # MODULES
    'RTTBlock',
]
