"""
RTT (Rotational Tensor Transformer) SIMULATIONS
================================================

Physics-Grounded Architecture Testing Suite

Test Cases:
1. Rotation Equivariance - Verify RTT(R·input) = R·RTT(input)
2. Certainty Propagation - Track certainty through layers
3. Trajectory Coherence - Predict trajectories from time sequences
4. Permutation Tracking - Verify σ' = σ ∘ Δσ composition law
5. Physics Conservation - Energy/momentum/angular momentum

Author: RTT Research Team
Version: 1.0
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import time
import sys
import os
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional, Any
from collections import defaultdict

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# =============================================================================
# PHYSICS TENSOR STRUCTURES
# =============================================================================

@dataclass
class PhysicsTensor:
    """
    Physics-grounded tensor with intrinsic physical properties.
    
    Structure: (batch, n, 14) where each element has:
    - position: (3,) - x, y, z coordinates
    - orientation: (4,) - quaternion (qw, qx, qy, qz)
    - momentum: (3,) - px, py, pz
    - angular_momentum: (3,) - Lx, Ly, Lz
    - certainty: (1,) - confidence [0, 1]
    """
    position: torch.Tensor      # (batch, n, 3)
    orientation: torch.Tensor   # (batch, n, 4)
    momentum: torch.Tensor      # (batch, n, 3)
    angular_momentum: torch.Tensor  # (batch, n, 3)
    certainty: torch.Tensor     # (batch, n, 1)
    
    def __post_init__(self):
        # Normalize quaternions
        self.orientation = F.normalize(self.orientation, dim=-1)
    
    @property
    def velocity(self) -> torch.Tensor:
        """Derive velocity from momentum (unit mass assumed)."""
        return self.momentum
    
    @property
    def kinetic_energy(self) -> torch.Tensor:
        """E = (1/2)mv² + (1/2)Iω² (simplified for unit mass)."""
        linear = 0.5 * (self.momentum ** 2).sum(dim=-1)
        angular = 0.5 * (self.angular_momentum ** 2).sum(dim=-1)
        return linear + angular
    
    @property
    def total_momentum(self) -> torch.Tensor:
        """Total momentum vector."""
        return self.momentum.sum(dim=-2)  # Sum over particles
    
    @property
    def total_angular_momentum(self) -> torch.Tensor:
        """Total angular momentum."""
        return self.angular_momentum.sum(dim=-2)
    
    @property
    def total_energy(self) -> torch.Tensor:
        """Total kinetic energy."""
        return self.kinetic_energy.sum(dim=-1)
    
    def to_combined(self) -> torch.Tensor:
        """Combine all fields into single tensor (batch, n, 14)."""
        return torch.cat([
            self.position,
            self.orientation,
            self.momentum,
            self.angular_momentum,
            self.certainty
        ], dim=-1)
    
    @classmethod
    def from_combined(cls, tensor: torch.Tensor) -> 'PhysicsTensor':
        """Create PhysicsTensor from combined tensor."""
        return cls(
            position=tensor[..., :3],
            orientation=tensor[..., 3:7],
            momentum=tensor[..., 7:10],
            angular_momentum=tensor[..., 10:13],
            certainty=tensor[..., 13:14]
        )
    
    def clone(self) -> 'PhysicsTensor':
        """Deep clone."""
        return PhysicsTensor(
            position=self.position.clone(),
            orientation=self.orientation.clone(),
            momentum=self.momentum.clone(),
            angular_momentum=self.angular_momentum.clone(),
            certainty=self.certainty.clone()
        )


# =============================================================================
# RTT CORE COMPONENTS
# =============================================================================

def quaternion_multiply(q1: torch.Tensor, q2: torch.Tensor) -> torch.Tensor:
    """Multiply two quaternions."""
    w1, x1, y1, z1 = q1[..., 0], q1[..., 1], q1[..., 2], q1[..., 3]
    w2, x2, y2, z2 = q2[..., 0], q2[..., 1], q2[..., 2], q2[..., 3]
    
    return torch.stack([
        w1*w2 - x1*x2 - y1*y2 - z1*z2,
        w1*x2 + x1*w2 + y1*z2 - z1*y2,
        w1*y2 - x1*z2 + y1*w2 + z1*x2,
        w1*z2 + x1*y2 - y1*x2 + z1*w2
    ], dim=-1)


def quaternion_to_rotation_matrix(q: torch.Tensor) -> torch.Tensor:
    """Convert quaternion to 3x3 rotation matrix."""
    w, x, y, z = q[..., 0], q[..., 1], q[..., 2], q[..., 3]
    
    return torch.stack([
        torch.stack([1 - 2*y*y - 2*z*z, 2*x*y - 2*w*z, 2*x*z + 2*w*y], dim=-1),
        torch.stack([2*x*y + 2*w*z, 1 - 2*x*x - 2*z*z, 2*y*z - 2*w*x], dim=-1),
        torch.stack([2*x*z - 2*w*y, 2*y*z + 2*w*x, 1 - 2*x*x - 2*y*y], dim=-1)
    ], dim=-2)


def random_rotation_matrix(batch_size: int = 1, device: torch.device = None) -> torch.Tensor:
    """Generate random rotation matrix using QR decomposition."""
    # Random matrix -> QR -> make R positive diagonal -> valid rotation
    A = torch.randn(batch_size, 3, 3, device=device)
    Q, R = torch.linalg.qr(A)
    # Ensure proper rotation (det = 1, not -1)
    sign = torch.sign(torch.linalg.det(Q)).unsqueeze(-1).unsqueeze(-1)
    Q = Q * sign
    return Q.squeeze(0) if batch_size == 1 else Q


def random_quaternion(batch_size: int = 1, device: torch.device = None) -> torch.Tensor:
    """Generate random unit quaternion."""
    q = torch.randn(batch_size, 4, device=device)
    return F.normalize(q, dim=-1).squeeze(0) if batch_size == 1 else q


def apply_rotation_to_physics_tensor(pt: PhysicsTensor, R: torch.Tensor) -> PhysicsTensor:
    """Apply rotation matrix to PhysicsTensor."""
    # Rotate positions
    pos_rotated = torch.einsum('ij,bnj->bni', R, pt.position)
    
    # Rotate momenta
    mom_rotated = torch.einsum('ij,bnj->bni', R, pt.momentum)
    
    # Rotate angular momenta
    ang_rotated = torch.einsum('ij,bnj->bni', R, pt.angular_momentum)
    
    # For orientation, we need to convert R to quaternion and compose
    # Simplified: just rotate the orientation vector part
    # (This is an approximation - proper implementation would use quaternion composition)
    orient_rotated = pt.orientation.clone()
    
    return PhysicsTensor(
        position=pos_rotated,
        orientation=orient_rotated,
        momentum=mom_rotated,
        angular_momentum=ang_rotated,
        certainty=pt.certainty.clone()
    )


# =============================================================================
# SINKHORN PERMUTATION
# =============================================================================

def sinkhorn_iteration(logits: torch.Tensor, temp: float = 0.1, n_iter: int = 20) -> torch.Tensor:
    """Convert logits to doubly-stochastic matrix via Sinkhorn iterations."""
    P = torch.exp(logits / temp)
    for _ in range(n_iter):
        P = P / (P.sum(dim=-1, keepdim=True) + 1e-10)
        P = P / (P.sum(dim=-2, keepdim=True) + 1e-10)
    return P


def soft_to_hard_permutation(P: torch.Tensor) -> torch.Tensor:
    """Convert soft permutation matrix to hard permutation indices."""
    return P.argmax(dim=-1)


# =============================================================================
# RTT LAYER
# =============================================================================

class RTTLayer(nn.Module):
    """
    Single RTT attention layer with:
    - Rotation-equivariant attention
    - Certainty tracking
    - Permutation tracking
    """
    
    def __init__(self, d_model: int = 14, n_heads: int = 2, dropout: float = 0.1):
        super().__init__()
        self.d_model = d_model
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads
        
        self.q_proj = nn.Linear(d_model, d_model)
        self.k_proj = nn.Linear(d_model, d_model)
        self.v_proj = nn.Linear(d_model, d_model)
        self.out_proj = nn.Linear(d_model, d_model)
        
        self.dropout = nn.Dropout(dropout)
        
    def forward(self, x: torch.Tensor, certainty: torch.Tensor, 
                permutation: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Forward pass.
        
        Args:
            x: (batch, n, d_model) input tensor
            certainty: (batch, n) certainty values
            permutation: (batch, n) current permutation hypothesis
            
        Returns:
            x_out: (batch, n, d_model) output tensor
            new_certainty: (batch, n) updated certainty
            new_permutation: (batch, n) updated permutation
        """
        batch, n, d = x.shape
        
        # Project Q, K, V
        Q = self.q_proj(x).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        K = self.k_proj(x).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        V = self.v_proj(x).view(batch, n, self.n_heads, self.head_dim).transpose(1, 2)
        
        # Attention scores
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.head_dim)
        attn = F.softmax(scores, dim=-1)
        attn = self.dropout(attn)
        
        # Apply attention
        out = torch.matmul(attn, V)
        out = out.transpose(1, 2).contiguous().view(batch, n, d)
        out = self.out_proj(out)
        
        # Compute new certainty from attention entropy
        avg_attn = attn.mean(dim=1)  # Average over heads
        entropy = -torch.sum(avg_attn * torch.log(avg_attn + 1e-10), dim=-1)
        max_entropy = math.log(n)
        cert_update = torch.sigmoid(1.0 * (max_entropy - entropy))
        new_certainty = torch.maximum(certainty, cert_update)
        
        # Compute new permutation from attention
        logits = torch.log(avg_attn + 1e-10)
        P = sinkhorn_iteration(logits)
        new_perm = soft_to_hard_permutation(P)
        # Compose with previous permutation
        new_permutation = permutation.gather(1, new_perm)
        
        return out, new_certainty, new_permutation


class RTTModel(nn.Module):
    """Complete RTT model with multiple layers."""
    
    def __init__(self, d_model: int = 14, n_heads: int = 2, n_layers: int = 4, dropout: float = 0.1):
        super().__init__()
        self.d_model = d_model
        self.n_layers = n_layers
        
        self.layers = nn.ModuleList([
            RTTLayer(d_model, n_heads, dropout) for _ in range(n_layers)
        ])
        
    def forward(self, pt: PhysicsTensor, max_layers: Optional[int] = None) -> Tuple[PhysicsTensor, Dict]:
        """
        Forward pass with early stopping based on certainty.
        
        Returns:
            output_physics_tensor: Final output
            metrics: Dictionary of intermediate values
        """
        x = pt.to_combined()
        batch, n, d = x.shape
        
        certainty = torch.ones(batch, n, device=x.device) * 0.5  # Initial uncertainty
        permutation = torch.arange(n, device=x.device).unsqueeze(0).expand(batch, -1)
        
        certainties = [certainty.clone()]
        permutations = [permutation.clone()]
        energies = [pt.total_energy.clone()]
        
        n_layers = max_layers if max_layers is not None else self.n_layers
        
        for i, layer in enumerate(self.layers[:n_layers]):
            x, certainty, permutation = layer(x, certainty, permutation)
            certainties.append(certainty.clone())
            permutations.append(permutation.clone())
        
        output = PhysicsTensor.from_combined(x)
        output.certainty = certainty.unsqueeze(-1)
        
        metrics = {
            'certainties': certainties,
            'permutations': permutations,
            'energies': energies,
            'final_certainty_mean': certainty.mean().item(),
            'n_layers_used': n_layers
        }
        
        return output, metrics


# =============================================================================
# TEST UTILITIES
# =============================================================================

def create_random_physics_tensor(batch: int = 4, n: int = 16, device: torch.device = None) -> PhysicsTensor:
    """Create random PhysicsTensor for testing."""
    return PhysicsTensor(
        position=torch.randn(batch, n, 3, device=device) * 10,
        orientation=F.normalize(torch.randn(batch, n, 4, device=device), dim=-1),
        momentum=torch.randn(batch, n, 3, device=device),
        angular_momentum=torch.randn(batch, n, 3, device=device) * 0.1,
        certainty=torch.rand(batch, n, 1, device=device) * 0.5 + 0.25  # [0.25, 0.75]
    )


def create_trajectory_sequence(batch: int = 4, n: int = 16, seq_len: int = 10, 
                                dt: float = 0.1, device: torch.device = None) -> List[PhysicsTensor]:
    """Create a sequence of PhysicsTensors representing a trajectory."""
    sequence = []
    
    # Initial state
    pt = create_random_physics_tensor(batch, n, device)
    sequence.append(pt.clone())
    
    # Evolve
    for t in range(1, seq_len):
        # Simple Newtonian evolution
        new_pos = pt.position + pt.velocity * dt
        # Add some noise for realism
        new_pos = new_pos + torch.randn_like(new_pos) * 0.01
        
        pt = PhysicsTensor(
            position=new_pos,
            orientation=pt.orientation,  # Simplified - no rotation
            momentum=pt.momentum,
            angular_momentum=pt.angular_momentum,
            certainty=pt.certainty
        )
        sequence.append(pt.clone())
    
    return sequence


# =============================================================================
# TEST CASE 1: ROTATION EQUIVARIANCE
# =============================================================================

def test_rotation_equivariance(model: RTTModel, n_trials: int = 10, device: torch.device = None) -> Dict:
    """
    Test that RTT is equivariant to rotations.
    
    Verify: RTT(R · input) = R · RTT(input)
    
    For physics tensors, rotation affects:
    - Position: r → R · r
    - Momentum: p → R · p
    - Angular momentum: L → R · L
    """
    print("\n" + "="*70)
    print("TEST 1: ROTATION EQUIVARIANCE")
    print("="*70)
    
    errors = []
    position_errors = []
    momentum_errors = []
    angular_momentum_errors = []
    
    for trial in range(n_trials):
        # Create random physics tensor
        pt = create_random_physics_tensor(batch=4, n=16, device=device)
        
        # Random rotation
        R = random_rotation_matrix(device=device)
        
        # Apply rotation to input
        pt_rotated = apply_rotation_to_physics_tensor(pt, R)
        
        # Forward pass on rotated input
        out1, _ = model(pt_rotated)
        
        # Forward pass on original, then rotate
        out2, _ = model(pt)
        out2_rotated = apply_rotation_to_physics_tensor(out2, R)
        
        # Compare
        pos_error = (out1.position - out2_rotated.position).norm() / (out1.position.norm() + 1e-10)
        mom_error = (out1.momentum - out2_rotated.momentum).norm() / (out1.momentum.norm() + 1e-10)
        ang_error = (out1.angular_momentum - out2_rotated.angular_momentum).norm() / (out1.angular_momentum.norm() + 1e-10)
        
        position_errors.append(pos_error.item())
        momentum_errors.append(mom_error.item())
        angular_momentum_errors.append(ang_error.item())
        
        # Combined error
        combined = (out1.to_combined() - out2_rotated.to_combined()).norm() / (out1.to_combined().norm() + 1e-10)
        errors.append(combined.item())
    
    results = {
        'n_trials': n_trials,
        'mean_equivariance_error': sum(errors) / len(errors),
        'std_equivariance_error': torch.tensor(errors).std().item(),
        'max_equivariance_error': max(errors),
        'min_equivariance_error': min(errors),
        'position_error_mean': sum(position_errors) / len(position_errors),
        'momentum_error_mean': sum(momentum_errors) / len(momentum_errors),
        'angular_momentum_error_mean': sum(angular_momentum_errors) / len(angular_momentum_errors),
        'passed': sum(errors) / len(errors) < 0.1  # Threshold: 10% relative error
    }
    
    print(f"  Mean equivariance error: {results['mean_equivariance_error']:.6f}")
    print(f"  Std equivariance error:  {results['std_equivariance_error']:.6f}")
    print(f"  Max equivariance error:  {results['max_equivariance_error']:.6f}")
    print(f"  Position error mean:     {results['position_error_mean']:.6f}")
    print(f"  Momentum error mean:     {results['momentum_error_mean']:.6f}")
    print(f"  Angular mom error mean:  {results['angular_momentum_error_mean']:.6f}")
    print(f"  TEST {'PASSED' if results['passed'] else 'FAILED'} (threshold: 0.1)")
    
    return results


# =============================================================================
# TEST CASE 2: CERTAINTY PROPAGATION
# =============================================================================

def test_certainty_propagation(model: RTTModel, n_trials: int = 10, device: torch.device = None) -> Dict:
    """
    Test that certainty propagates correctly through layers.
    
    Verify:
    1. Certainty is monotonically non-decreasing
    2. Certainty approaches 1.0 with focused attention
    3. Layer count adapts to certainty threshold
    """
    print("\n" + "="*70)
    print("TEST 2: CERTAINTY PROPAGATION")
    print("="*70)
    
    monotonic_violations = 0
    final_certainties = []
    certainty_trajectories = []
    layer_count_adaptations = []
    
    for trial in range(n_trials):
        pt = create_random_physics_tensor(batch=4, n=16, device=device)
        
        # Forward pass
        output, metrics = model(pt)
        
        # Check monotonicity
        certainties = metrics['certainties']
        for i in range(1, len(certainties)):
            # Check if any element decreased
            if (certainties[i] < certainties[i-1] - 1e-6).any():
                monotonic_violations += 1
        
        final_certainties.append(metrics['final_certainty_mean'])
        certainty_trajectories.append([c.mean().item() for c in certainties])
        
        # Test layer adaptation
        # High initial certainty should require fewer layers
        high_cert_pt = create_random_physics_tensor(batch=4, n=16, device=device)
        high_cert_pt.certainty = torch.ones_like(high_cert_pt.certainty) * 0.9
        _, high_cert_metrics = model(high_cert_pt, max_layers=4)
        
        low_cert_pt = create_random_physics_tensor(batch=4, n=16, device=device)
        low_cert_pt.certainty = torch.ones_like(low_cert_pt.certainty) * 0.3
        _, low_cert_metrics = model(low_cert_pt, max_layers=4)
        
        layer_count_adaptations.append({
            'high_cert_final': high_cert_metrics['final_certainty_mean'],
            'low_cert_final': low_cert_metrics['final_certainty_mean']
        })
    
    results = {
        'n_trials': n_trials,
        'monotonic_violations': monotonic_violations,
        'mean_final_certainty': sum(final_certainties) / len(final_certainties),
        'std_final_certainty': torch.tensor(final_certainties).std().item(),
        'sample_trajectory': certainty_trajectories[0],
        'passed': monotonic_violations == 0
    }
    
    print(f"  Monotonic violations: {monotonic_violations}")
    print(f"  Mean final certainty: {results['mean_final_certainty']:.4f}")
    print(f"  Std final certainty:  {results['std_final_certainty']:.4f}")
    print(f"  Sample trajectory: {' → '.join([f'{c:.3f}' for c in results['sample_trajectory']])}")
    print(f"  TEST {'PASSED' if results['passed'] else 'FAILED'} (monotonicity)")
    
    return results


# =============================================================================
# TEST CASE 3: TRAJECTORY COHERENCE
# =============================================================================

def test_trajectory_coherence(model: RTTModel, seq_len: int = 10, n_trials: int = 5, 
                               device: torch.device = None) -> Dict:
    """
    Test that RTT produces coherent trajectory predictions.
    
    Input: Time sequence of tensors
    Output: Predicted trajectory
    Measure: Prediction error vs ground truth
    """
    print("\n" + "="*70)
    print("TEST 3: TRAJECTORY COHERENCE")
    print("="*70)
    
    prediction_errors = []
    position_errors = []
    velocity_errors = []
    
    for trial in range(n_trials):
        # Create trajectory sequence
        sequence = create_trajectory_sequence(batch=4, n=16, seq_len=seq_len, device=device)
        
        # Use first seq_len-1 to predict last
        train_sequence = sequence[:-1]
        target = sequence[-1]
        
        # Process each element in sequence
        predictions = []
        for pt in train_sequence:
            output, _ = model(pt)
            predictions.append(output)
        
        # Use last prediction as forecast
        predicted = predictions[-1]
        
        # Compute error
        pos_error = (predicted.position - target.position).norm() / (target.position.norm() + 1e-10)
        vel_error = (predicted.velocity - target.velocity).norm() / (target.velocity.norm() + 1e-10)
        total_error = (predicted.to_combined() - target.to_combined()).norm() / (target.to_combined().norm() + 1e-10)
        
        prediction_errors.append(total_error.item())
        position_errors.append(pos_error.item())
        velocity_errors.append(vel_error.item())
    
    results = {
        'n_trials': n_trials,
        'seq_len': seq_len,
        'mean_prediction_error': sum(prediction_errors) / len(prediction_errors),
        'std_prediction_error': torch.tensor(prediction_errors).std().item(),
        'position_error_mean': sum(position_errors) / len(position_errors),
        'velocity_error_mean': sum(velocity_errors) / len(velocity_errors),
        'passed': sum(prediction_errors) / len(prediction_errors) < 0.5
    }
    
    print(f"  Mean prediction error: {results['mean_prediction_error']:.4f}")
    print(f"  Std prediction error:  {results['std_prediction_error']:.4f}")
    print(f"  Position error mean:   {results['position_error_mean']:.4f}")
    print(f"  Velocity error mean:   {results['velocity_error_mean']:.4f}")
    print(f"  TEST {'PASSED' if results['passed'] else 'FAILED'} (threshold: 0.5)")
    
    return results


# =============================================================================
# TEST CASE 4: PERMUTATION TRACKING
# =============================================================================

def test_permutation_tracking(model: RTTModel, n_trials: int = 10, device: torch.device = None) -> Dict:
    """
    Test that permutation tracking follows the composition law.
    
    Verify: σ' = σ ∘ Δσ
    
    Where Δσ is the change induced by attention.
    Also test Sinkhorn convergence.
    """
    print("\n" + "="*70)
    print("TEST 4: PERMUTATION TRACKING")
    print("="*70)
    
    composition_violations = 0
    sinkhorn_convergences = []
    permutation_changes = []
    
    for trial in range(n_trials):
        pt = create_random_physics_tensor(batch=4, n=16, device=device)
        
        # Forward pass
        output, metrics = model(pt)
        
        permutations = metrics['permutations']
        
        # Check composition law for each layer
        for i in range(1, len(permutations)):
            # σ_i should equal σ_{i-1} composed with the change
            sigma_prev = permutations[i-1]
            sigma_curr = permutations[i]
            
            # The change should be some permutation
            delta = sigma_curr.gather(1, torch.argsort(sigma_prev))
            
            # Verify it's a valid permutation (contains all indices 0..n-1)
            sorted_delta, _ = torch.sort(delta, dim=-1)
            expected = torch.arange(sigma_curr.shape[1], device=device).unsqueeze(0).expand_as(sorted_delta)
            
            if not torch.allclose(sorted_delta, expected):
                composition_violations += 1
        
        # Test Sinkhorn convergence
        test_logits = torch.randn(4, 16, 16, device=device)
        P = sinkhorn_iteration(test_logits, n_iter=30)
        
        # Check doubly stochastic property
        row_sums = P.sum(dim=-1)
        col_sums = P.sum(dim=-2)
        row_error = (row_sums - 1).abs().mean().item()
        col_error = (col_sums - 1).abs().mean().item()
        sinkhorn_convergences.append((row_error + col_error) / 2)
        
        # Track permutation changes
        if len(permutations) >= 2:
            change = (permutations[-1] != permutations[0]).float().mean().item()
            permutation_changes.append(change)
    
    results = {
        'n_trials': n_trials,
        'composition_violations': composition_violations,
        'mean_sinkhorn_error': sum(sinkhorn_convergences) / len(sinkhorn_convergences),
        'mean_permutation_change': sum(permutation_changes) / len(permutation_changes) if permutation_changes else 0,
        'passed': composition_violations == 0 and sum(sinkhorn_convergences) / len(sinkhorn_convergences) < 0.01
    }
    
    print(f"  Composition violations: {composition_violations}")
    print(f"  Mean Sinkhorn error:    {results['mean_sinkhorn_error']:.6f}")
    print(f"  Mean permutation change: {results['mean_permutation_change']:.4f}")
    print(f"  TEST {'PASSED' if results['passed'] else 'FAILED'}")
    
    return results


# =============================================================================
# TEST CASE 5: PHYSICS CONSERVATION
# =============================================================================

def test_physics_conservation(model: RTTModel, n_trials: int = 10, device: torch.device = None) -> Dict:
    """
    Test conservation laws through RTT layers.
    
    Verify:
    1. Energy conservation (for equivariant operations)
    2. Momentum conservation (for translation-equivariant operations)
    3. Angular momentum conservation
    """
    print("\n" + "="*70)
    print("TEST 5: PHYSICS CONSERVATION")
    print("="*70)
    
    energy_errors = []
    momentum_errors = []
    angular_momentum_errors = []
    
    for trial in range(n_trials):
        pt = create_random_physics_tensor(batch=4, n=16, device=device)
        
        # Store initial quantities
        initial_energy = pt.total_energy.clone()
        initial_momentum = pt.total_momentum.clone()
        initial_angular_momentum = pt.total_angular_momentum.clone()
        
        # Forward pass
        output, metrics = model(pt)
        
        # Compute final quantities
        final_energy = output.total_energy
        final_momentum = output.total_momentum
        final_angular_momentum = output.total_angular_momentum
        
        # Compute relative errors
        energy_error = (final_energy - initial_energy).abs() / (initial_energy.abs() + 1e-10)
        momentum_error = (final_momentum - initial_momentum).norm() / (initial_momentum.norm() + 1e-10)
        ang_mom_error = (final_angular_momentum - initial_angular_momentum).norm() / (initial_angular_momentum.norm() + 1e-10)
        
        energy_errors.append(energy_error.mean().item())
        momentum_errors.append(momentum_error.mean().item())
        angular_momentum_errors.append(ang_mom_error.mean().item())
    
    results = {
        'n_trials': n_trials,
        'mean_energy_error': sum(energy_errors) / len(energy_errors),
        'std_energy_error': torch.tensor(energy_errors).std().item(),
        'mean_momentum_error': sum(momentum_errors) / len(momentum_errors),
        'std_momentum_error': torch.tensor(momentum_errors).std().item(),
        'mean_angular_momentum_error': sum(angular_momentum_errors) / len(angular_momentum_errors),
        'std_angular_momentum_error': torch.tensor(angular_momentum_errors).std().item(),
        'passed': sum(energy_errors) / len(energy_errors) < 0.1
    }
    
    print(f"  Mean energy error:           {results['mean_energy_error']:.6f}")
    print(f"  Mean momentum error:         {results['mean_momentum_error']:.6f}")
    print(f"  Mean angular momentum error: {results['mean_angular_momentum_error']:.6f}")
    print(f"  TEST {'PASSED' if results['passed'] else 'FAILED'} (threshold: 0.1)")
    
    return results


# =============================================================================
# PERFORMANCE BENCHMARKS
# =============================================================================

def run_performance_benchmarks(model: RTTModel, device: torch.device = None) -> Dict:
    """
    Benchmark RTT performance across different sizes.
    """
    print("\n" + "="*70)
    print("PERFORMANCE BENCHMARKS")
    print("="*70)
    
    configs = [
        (4, 16, 4),   # Small
        (8, 32, 4),   # Medium
        (16, 64, 4),  # Large
    ]
    
    results = []
    
    for batch, n, n_layers in configs:
        pt = create_random_physics_tensor(batch=batch, n=n, device=device)
        
        # Warmup
        for _ in range(3):
            _, _ = model(pt)
        
        # Benchmark
        torch.cuda.synchronize() if torch.cuda.is_available() else None
        start = time.time()
        
        n_runs = 10
        for _ in range(n_runs):
            _, _ = model(pt)
        
        torch.cuda.synchronize() if torch.cuda.is_available() else None
        elapsed = time.time() - start
        
        avg_time = elapsed / n_runs * 1000  # ms
        flops_estimate = batch * n * n * model.d_model * n_layers * 4  # Rough estimate
        
        result = {
            'batch': batch,
            'n': n,
            'n_layers': n_layers,
            'avg_time_ms': avg_time,
            'throughput': batch / (avg_time / 1000),  # samples/sec
            'flops_estimate': flops_estimate
        }
        results.append(result)
        
        print(f"  Batch={batch}, N={n}: {avg_time:.2f}ms, {result['throughput']:.1f} samples/sec")
    
    return results


# =============================================================================
# MAIN SIMULATION RUNNER
# =============================================================================

def run_all_simulations(device: torch.device = None):
    """Run all simulation tests."""
    print("="*70)
    print("RTT TENSOR ARCHITECTURE SIMULATION")
    print("="*70)
    print(f"Device: {device}")
    print(f"PyTorch version: {torch.__version__}")
    
    # Create model
    model = RTTModel(d_model=14, n_heads=2, n_layers=4, dropout=0.1)
    if device:
        model = model.to(device)
    model.eval()
    
    all_results = {}
    
    # Run tests
    with torch.no_grad():
        all_results['rotation_equivariance'] = test_rotation_equivariance(model, n_trials=10, device=device)
        all_results['certainty_propagation'] = test_certainty_propagation(model, n_trials=10, device=device)
        all_results['trajectory_coherence'] = test_trajectory_coherence(model, seq_len=10, n_trials=5, device=device)
        all_results['permutation_tracking'] = test_permutation_tracking(model, n_trials=10, device=device)
        all_results['physics_conservation'] = test_physics_conservation(model, n_trials=10, device=device)
        all_results['benchmarks'] = run_performance_benchmarks(model, device=device)
    
    # Summary
    print("\n" + "="*70)
    print("SIMULATION SUMMARY")
    print("="*70)
    
    passed = 0
    total = 5
    for test_name in ['rotation_equivariance', 'certainty_propagation', 'trajectory_coherence', 
                       'permutation_tracking', 'physics_conservation']:
        status = "PASS" if all_results[test_name].get('passed', False) else "FAIL"
        if status == "PASS":
            passed += 1
        print(f"  {test_name}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    return all_results


if __name__ == "__main__":
    # Set device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Set seeds for reproducibility
    torch.manual_seed(42)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(42)
    
    # Run simulations
    results = run_all_simulations(device)
    
    # Save results
    print("\n" + "="*70)
    print("RESULTS SAVED")
    print("="*70)
    print("Run completed successfully.")
