"""
RTT TILE LIBRARY v2.0
=====================

Complete implementation with physical laws, rotation-first tensors,
trajectory attention, and viewpoint abstractions.

Multi-Model Research: Kimi + DeepSeek + GLM-5
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import numpy as np
from dataclasses import dataclass
from typing import Optional, Tuple, List, Dict

# =============================================================================
# TIER 0: ESSENTIAL TILES (2-4 chars)
# =============================================================================

# PERMUTATION TILES
def cmp(σ, τ): return τ.gather(-1, σ)  # Compose
def inv(σ): return torch.argsort(σ, dim=-1)  # Inverse
def id(n, batch=1, device=None): return torch.arange(n, device=device).unsqueeze(0).expand(batch, -1)  # Identity
def ap(σ, x):  # Apply permutation
    inv_σ = inv(σ)
    return x.gather(-2, inv_σ.unsqueeze(-1).expand(-1, -1, x.shape[-1])) if x.dim() > 2 else x.gather(-1, inv_σ)
def sgn(σ): return torch.tensor((-1) ** (σ.shape[-1] - torch.bincount(σ).sum()))  # Sign

# CERTAINTY TILES
def cmax(c1, c2): return torch.maximum(c1, c2)  # Certainty max
def ent(p, dim=-1):  # Entropy
    p_safe = torch.clamp(p, min=1e-10)
    return -torch.sum(p_safe * torch.log(p_safe), dim=dim)
def ent2cert(H, H_max, alpha=1.0): return torch.sigmoid(alpha * (H_max - H))  # Entropy to certainty

# CATEGORY TILES
def ret(x): return CertainTensor(x, torch.ones(x.shape[:-1]) * 0.5)  # Return/lift
def bind(ct, f):  # Bind/chain
    result = f(ct.data)
    result.certainty = cmax(ct.certainty, result.certainty)
    return result
def ext(ct): return ct.data  # Extract
def dup(ct):  # Duplicate
    ct.metadata['duplicated'] = True
    return ct

# PHYSICS TILES (NEW)
def quat_to_matrix(q):
    """Convert quaternion to rotation matrix."""
    w, x, y, z = q[..., 0], q[..., 1], q[..., 2], q[..., 3]
    return torch.stack([
        torch.stack([1-2*y*y-2*z*z, 2*x*y-2*w*z, 2*x*z+2*w*y], dim=-1),
        torch.stack([2*x*y+2*w*z, 1-2*x*x-2*z*z, 2*y*z-2*w*x], dim=-1),
        torch.stack([2*x*z-2*w*y, 2*y*z+2*w*x, 1-2*x*x-2*y*y], dim=-1)
    ], dim=-2)

def quat_multiply(q1, q2):
    """Hamilton product of quaternions."""
    w1, x1, y1, z1 = q1[..., 0], q1[..., 1], q1[..., 2], q1[..., 3]
    w2, x2, y2, z2 = q2[..., 0], q2[..., 1], q2[..., 2], q2[..., 3]
    return torch.stack([
        w1*w2 - x1*x2 - y1*y2 - z1*z2,
        w1*x2 + x1*w2 + y1*z2 - z1*y2,
        w1*y2 - x1*z2 + y1*w2 + z1*x2,
        w1*z2 + x1*y2 - y1*x2 + z1*w2
    ], dim=-1)

def omega_to_quat(omega, dt):
    """Convert angular velocity to quaternion update."""
    theta = torch.norm(omega, dim=-1, keepdim=True)
    axis = omega / (theta + 1e-10)
    half_theta = theta * dt / 2
    return torch.cat([
        torch.cos(half_theta),
        axis * torch.sin(half_theta)
    ], dim=-1)

# =============================================================================
# TIER 1: PHYSICAL TENSOR
# =============================================================================

@dataclass
class PhysicalTensor:
    """
    Tensor with full physical structure.
    
    T ∈ ℝ^(n×d) × SO(3)^n × ℝ^(n×3) × [0,1]^n
    
    Components:
    - data: Feature values (n, d)
    - quaternion: Orientation (n, 4)
    - position: Location (n, 3)
    - velocity: Linear motion (n, 3)
    - omega: Angular velocity (n, 3)
    - certainty: Confidence (n,)
    """
    data: torch.Tensor
    quaternion: torch.Tensor
    position: torch.Tensor
    velocity: torch.Tensor
    omega: torch.Tensor
    certainty: torch.Tensor
    metadata: dict = None
    
    def __post_init__(self):
        # Normalize quaternions
        self.quaternion = self.quaternion / (torch.norm(self.quaternion, dim=-1, keepdim=True) + 1e-10)
        if self.metadata is None:
            self.metadata = {}
    
    @property
    def rotation(self):
        """Get rotation matrices from quaternions."""
        return quat_to_matrix(self.quaternion)
    
    @property
    def n(self): return self.data.shape[-2]
    
    @property
    def d(self): return self.data.shape[-1]
    
    def kinetic_energy(self):
        """KE = ½Σm|v|² (unit mass assumed)."""
        return 0.5 * torch.sum(self.velocity ** 2)
    
    def angular_momentum(self):
        """L = Σ r × v."""
        return torch.sum(torch.cross(self.position, self.velocity), dim=0)
    
    def center_of_mass(self):
        """COM = (1/n)Σr."""
        return self.position.mean(dim=0)
    
    def moment_of_inertia(self):
        """I = Σ(r²𝟙 - r⊗r)."""
        I = torch.zeros(3, 3, device=self.position.device)
        for i in range(self.n):
            r = self.position[i]
            I += torch.dot(r, r) * torch.eye(3, device=r.device) - torch.outer(r, r)
        return I
    
    def evolve(self, dt=0.01):
        """
        Evolve using physical laws.
        
        Updates:
        - Position: x' = x + v·dt
        - Rotation: q' = q · exp(ω·dt/2)
        - Certainty: c' = min(c + coherence·dt, 1)
        """
        # Position update
        new_position = self.position + self.velocity * dt
        
        # Rotation update
        dq = omega_to_quat(self.omega, dt)
        new_quaternion = quat_multiply(self.quaternion, dq)
        new_quaternion = new_quaternion / (torch.norm(new_quaternion, dim=-1, keepdim=True) + 1e-10)
        
        # Certainty update (coherence-based)
        coherence = self._compute_coherence()
        new_certainty = torch.clamp(self.certainty + coherence * dt, 0, 1)
        
        return PhysicalTensor(
            data=self.data,
            quaternion=new_quaternion,
            position=new_position,
            velocity=self.velocity,
            omega=self.omega,
            certainty=new_certainty,
            metadata=self.metadata
        )
    
    def _compute_coherence(self):
        """Compute orientation coherence with neighbors."""
        R = self.rotation
        coherence = torch.zeros(self.n, device=R.device)
        
        for i in range(self.n):
            # Compute alignment with all others
            alignments = []
            for j in range(self.n):
                if i != j:
                    alignment = torch.trace(R[i].T @ R[j]) / 3
                    alignments.append(alignment)
            coherence[i] = torch.mean(torch.stack(alignments)) if alignments else 0.5
        
        return torch.clamp(coherence, 0, 1)
    
    def to(self, device):
        return PhysicalTensor(
            data=self.data.to(device),
            quaternion=self.quaternion.to(device),
            position=self.position.to(device),
            velocity=self.velocity.to(device),
            omega=self.omega.to(device),
            certainty=self.certainty.to(device),
            metadata=self.metadata
        )


# =============================================================================
# ROTATION-AWARE ATTENTION
# =============================================================================

class RotationAwareAttention(nn.Module):
    """
    Attention with rotation as first-class variable.
    
    Formula (from Kimi research):
        Attention(Q, K, V, R) = softmax(Q(RK)^T / √d) V
    
    where R is a rotation matrix that transforms keys.
    """
    
    def __init__(self, d_model: int, n_heads: int = 8, rotation_weight: float = 0.5):
        super().__init__()
        self.d_model = d_model
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads
        self.rotation_weight = rotation_weight
        
        self.q_proj = nn.Linear(d_model, d_model)
        self.k_proj = nn.Linear(d_model, d_model)
        self.v_proj = nn.Linear(d_model, d_model)
        self.out_proj = nn.Linear(d_model, d_model)
    
    def forward(self, pt: PhysicalTensor) -> PhysicalTensor:
        """
        Forward pass with rotation awareness.
        """
        batch, n, d = pt.data.shape
        
        # Project Q, K, V
        Q = self.q_proj(pt.data).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        K = self.k_proj(pt.data).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        V = self.v_proj(pt.data).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        
        # Standard attention scores
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.head_dim)
        
        # Rotation alignment term
        R = pt.rotation  # (n, 3, 3)
        rotation_scores = torch.zeros(batch, self.n_heads, n, n, device=scores.device)
        for i in range(n):
            for j in range(n):
                alignment = torch.trace(R[i].T @ R[j]) / 3
                rotation_scores[:, :, i, j] = alignment
        
        # Combined attention
        combined = scores + self.rotation_weight * rotation_scores
        
        # Softmax
        attn = F.softmax(combined, dim=-1)
        
        # Apply to values
        out = torch.matmul(attn, V)
        out = out.transpose(1, 2).contiguous().view(batch, n, d)
        out = self.out_proj(out)
        
        # Update certainty from attention entropy
        avg_attn = attn.mean(dim=1)  # Average over heads
        H = ent(avg_attn)
        H_max = math.log(n)
        new_certainty = cmax(pt.certainty, ent2cert(H, H_max))
        
        return PhysicalTensor(
            data=out,
            quaternion=pt.quaternion,
            position=pt.position,
            velocity=pt.velocity,
            omega=pt.omega,
            certainty=new_certainty,
            metadata=pt.metadata
        )


# =============================================================================
# TRAJECTORY ATTENTION
# =============================================================================

class TrajectoryAttention(nn.Module):
    """
    Attention that compares trajectories, not points.
    
    A trajectory γ: [0,T] → SE(3) encodes motion.
    Trajectory attention compares dynamics, not static structure.
    """
    
    def __init__(self, d_model: int, n_heads: int = 8, n_timesteps: int = 10):
        super().__init__()
        self.d_model = d_model
        self.n_heads = n_heads
        self.n_timesteps = n_timesteps
        self.head_dim = d_model // n_heads
        
        self.q_proj = nn.Linear(d_model, d_model)
        self.k_proj = nn.Linear(d_model, d_model)
        self.v_proj = nn.Linear(d_model, d_model)
        self.out_proj = nn.Linear(d_model, d_model)
        
        # Trajectory buffer
        self.trajectory_buffer = None
    
    def update_trajectory(self, pt: PhysicalTensor):
        """Add current state to trajectory buffer."""
        state = {
            'data': pt.data.detach(),
            'position': pt.position.detach(),
            'quaternion': pt.quaternion.detach()
        }
        
        if self.trajectory_buffer is None:
            self.trajectory_buffer = {k: v.unsqueeze(1) for k, v in state.items()}
        else:
            self.trajectory_buffer = {
                k: torch.cat([v, state[k].unsqueeze(1)], dim=1)
                for k, v in self.trajectory_buffer.items()
            }
        
        # Keep only last n_timesteps
        if self.trajectory_buffer['data'].shape[1] > self.n_timesteps:
            self.trajectory_buffer = {
                k: v[:, -self.n_timesteps:]
                for k, v in self.trajectory_buffer.items()
            }
    
    def forward(self, pt: PhysicalTensor) -> PhysicalTensor:
        """Forward pass comparing trajectories."""
        self.update_trajectory(pt)
        
        if self.trajectory_buffer['data'].shape[1] < 2:
            # Not enough trajectory data yet
            return pt
        
        batch, T, n, d = self.trajectory_buffer['data'].shape
        
        # Compute trajectory similarity
        trajectory_scores = torch.zeros(batch, n, n, device=pt.data.device)
        
        for i in range(n):
            for j in range(n):
                # Position trajectory distance
                pos_i = self.trajectory_buffer['position'][:, :, i, :]
                pos_j = self.trajectory_buffer['position'][:, :, j, :]
                pos_dist = torch.mean(torch.norm(pos_i - pos_j, dim=-1))
                
                # Rotation trajectory distance (quaternion difference)
                quat_i = self.trajectory_buffer['quaternion'][:, :, i, :]
                quat_j = self.trajectory_buffer['quaternion'][:, :, j, :]
                # Quaternion distance: min(|q1-q2|, |q1+q2|)
                quat_dist = torch.min(
                    torch.mean(torch.norm(quat_i - quat_j, dim=-1)),
                    torch.mean(torch.norm(quat_i + quat_j, dim=-1))
                )
                
                # Combined distance
                trajectory_scores[:, i, j] = torch.exp(-pos_dist - quat_dist)
        
        # Normalize
        trajectory_scores = trajectory_scores / trajectory_scores.sum(dim=-1, keepdim=True)
        
        # Project Q, K, V
        Q = self.q_proj(pt.data).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        K = self.k_proj(pt.data).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        V = self.v_proj(pt.data).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        
        # Combine with trajectory scores
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.head_dim)
        combined = scores + 0.5 * trajectory_scores.unsqueeze(1)
        
        attn = F.softmax(combined, dim=-1)
        out = torch.matmul(attn, V)
        out = out.transpose(1, 2).contiguous().view(batch, n, d)
        out = self.out_proj(out)
        
        # Update certainty
        avg_attn = attn.mean(dim=1)
        H = ent(avg_attn)
        H_max = math.log(n)
        new_certainty = cmax(pt.certainty, ent2cert(H, H_max))
        
        return PhysicalTensor(
            data=out,
            quaternion=pt.quaternion,
            position=pt.position,
            velocity=pt.velocity,
            omega=pt.omega,
            certainty=new_certainty,
            metadata=pt.metadata
        )


# =============================================================================
# VIEWPOINT TRANSFORMATIONS
# =============================================================================

class ViewpointTransform:
    """
    Three levels of viewpoint abstraction.
    
    1. SELF: Agent's own viewpoint (center = ego)
    2. OTHER: Another agent's viewpoint (center = other)  
    3. PLANE: Collective reference frame (center = COM)
    """
    
    @staticmethod
    def self_view(pt: PhysicalTensor, idx: int = 0) -> PhysicalTensor:
        """Transform to self-centric frame."""
        # Center at own position
        new_position = pt.position - pt.position[idx:idx+1]
        
        # Rotate to own frame
        R_self = quat_to_matrix(pt.quaternion[idx]).T
        new_position = torch.matmul(R_self, new_position.T).T
        
        new_quaternion = torch.zeros_like(pt.quaternion)
        for i in range(pt.n):
            R_i = quat_to_matrix(pt.quaternion[i])
            new_R = torch.matmul(R_self, R_i)
            # Convert back to quaternion (simplified)
            new_quaternion[i] = pt.quaternion[i]  # Keep for now
        
        return PhysicalTensor(
            data=pt.data,
            quaternion=new_quaternion,
            position=new_position,
            velocity=torch.matmul(R_self, pt.velocity.T).T,
            omega=pt.omega,
            certainty=pt.certainty,
            metadata={**pt.metadata, 'view': 'self', 'center_idx': idx}
        )
    
    @staticmethod
    def other_view(pt: PhysicalTensor, other_idx: int) -> PhysicalTensor:
        """Transform to another agent's viewpoint."""
        return ViewpointTransform.self_view(pt, other_idx)
    
    @staticmethod
    def plane_view(pt: PhysicalTensor) -> PhysicalTensor:
        """Transform to collective reference frame."""
        # Center of mass
        com = pt.position.mean(dim=0)
        new_position = pt.position - com
        
        # Principal axes from moment of inertia
        I = pt.moment_of_inertia()
        eigenvalues, eigenvectors = torch.linalg.eigh(I)
        P = eigenvectors.T  # Principal axes
        
        # Rotate to principal axes
        new_position = torch.matmul(P, new_position.T).T
        
        return PhysicalTensor(
            data=pt.data,
            quaternion=pt.quaternion,  # Keep for now
            position=new_position,
            velocity=torch.matmul(P, pt.velocity.T).T,
            omega=pt.omega,
            certainty=pt.certainty,
            metadata={**pt.metadata, 'view': 'plane', 'principal_axes': P}
        )


# =============================================================================
# TILE GRAVITY SIMULATOR
# =============================================================================

class TileGravitySimulator:
    """
    Simulate gravitational relationships between tiles.
    
    Metric (from Kimi research):
        d(t₁, t₂) = w₁·[C(t₁)≠C(t₂)] + w₂·(1 - Jaccard(S(t₁), S(t₂)))
    """
    
    TILES = {
        # Permutation tiles
        'cmp': {'cat': 'perm', 'composes': ['inv', 'id', 'ap']},
        'inv': {'cat': 'perm', 'composes': ['cmp', 'id']},
        'id': {'cat': 'perm', 'composes': ['cmp', 'inv', 'ap']},
        'ap': {'cat': 'perm', 'composes': ['cmp', 'id']},
        'cyc': {'cat': 'perm', 'composes': ['sgn', 'inv']},
        'sgn': {'cat': 'perm', 'composes': ['cyc']},
        
        # Certainty tiles
        'cmax': {'cat': 'cert', 'composes': ['ent', 'ct']},
        'ent': {'cat': 'cert', 'composes': ['kl', 'xent']},
        'ct': {'cat': 'cert', 'composes': ['cmax']},
        
        # Category tiles
        'ret': {'cat': 'cat', 'composes': ['bind', 'ext']},
        'bind': {'cat': 'cat', 'composes': ['ret', 'dup']},
        'ext': {'cat': 'cat', 'composes': ['ret', 'dup']},
        'dup': {'cat': 'cat', 'composes': ['bind', 'ext']},
        'nat': {'cat': 'cat', 'composes': ['brd', 'ret']},
        'brd': {'cat': 'cat', 'composes': ['nat']},
        
        # Physics tiles
        'pos': {'cat': 'phys', 'composes': ['vel', 'com']},
        'rot': {'cat': 'phys', 'composes': ['quat', 'omega']},
        'quat': {'cat': 'phys', 'composes': ['rot']},
        'vel': {'cat': 'phys', 'composes': ['pos']},
        'omega': {'cat': 'phys', 'composes': ['rot', 'L']},
        'L': {'cat': 'phys', 'composes': ['omega', 'I']},
        'I': {'cat': 'phys', 'composes': ['L', 'com']},
        'com': {'cat': 'phys', 'composes': ['pos', 'I']},
    }
    
    @classmethod
    def compute_gravity(cls):
        """Compute gravity matrix between all tiles."""
        names = list(cls.TILES.keys())
        n = len(names)
        G = torch.zeros(n, n)
        
        for i, t1 in enumerate(names):
            for j, t2 in enumerate(names):
                if i != j:
                    # Composability
                    comp = 1.0 if t2 in cls.TILES[t1]['composes'] else 0.0
                    
                    # Same category
                    same_cat = 0.5 if cls.TILES[t1]['cat'] == cls.TILES[t2]['cat'] else 0.0
                    
                    G[i, j] = 0.6 * comp + 0.4 * same_cat
        
        return G, names
    
    @classmethod
    def find_principal_tile(cls):
        """Find the tile at the gravity center."""
        G, names = cls.compute_gravity()
        eigenvalues, eigenvectors = torch.linalg.eigh(G)
        principal_idx = torch.argmax(torch.abs(eigenvectors[:, -1]))
        return names[principal_idx]
    
    @classmethod
    def find_orbits(cls, threshold=0.3):
        """Find orbital groups of tiles."""
        G, names = cls.compute_gravity()
        orbits = {}
        
        for i, t in enumerate(names):
            attracted = [(names[j], G[i, j].item()) for j in range(len(names)) if G[i, j] > threshold]
            attracted.sort(key=lambda x: -x[1])
            orbits[t] = [x[0] for x in attracted[:3]]
        
        return orbits


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # TIER 0: Essential
    'cmp', 'inv', 'id', 'ap', 'sgn',
    'cmax', 'ent', 'ent2cert',
    'ret', 'bind', 'ext', 'dup',
    'quat_to_matrix', 'quat_multiply', 'omega_to_quat',
    
    # PHYSICAL TENSOR
    'PhysicalTensor',
    
    # ATTENTION MODULES
    'RotationAwareAttention',
    'TrajectoryAttention',
    
    # VIEWPOINT
    'ViewpointTransform',
    
    # TILE GRAVITY
    'TileGravitySimulator',
]
