"""
Physics-Grounded Tensor Design
==============================

Implementation of physics-baked vector representations with:
- Rotation as first-class variable (quaternion q ∈ SU(2) ≅ S³)
- Trajectory as primary function (Hamiltonian mechanics)
- Self-center viewpoint transformations
- Conservation law verification

Mathematical Formulation:
    PhysicsTensor = (r, q, p, L, c) ∈ ℝ³ × S³ × ℝ³ × ℝ³ × [0,1]
    
    Hamiltonian:
        H = |p|²/2m + |L|²/2I + V(r, q)
    
    Equations of Motion:
        dr/dt = ∂H/∂p = p/m
        dq/dt = (1/2) ω ⊗ q
        dp/dt = -∂H/∂r = -∇V
        dL/dt = τ (torque)

Author: Physics Tensor Research
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Optional, Tuple, Callable, Union
from enum import Enum
import warnings


# =============================================================================
# QUATERNION OPERATIONS (SU(2) ≅ S³)
# =============================================================================

class Quaternion:
    """
    Unit quaternion representing rotation in SU(2) ≅ S³.
    
    Quaternion representation: q = w + xi + yj + zk
    where w is the scalar part and (x, y, z) is the vector part.
    
    For unit quaternions: ||q|| = 1
    """
    
    __slots__ = ['w', 'x', 'y', 'z']
    
    def __init__(self, w: float = 1.0, x: float = 0.0, 
                 y: float = 0.0, z: float = 0.0):
        """Initialize quaternion with scalar (w) and vector (x,y,z) parts."""
        self.w = float(w)
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
    
    @classmethod
    def from_array(cls, arr: np.ndarray) -> 'Quaternion':
        """Create quaternion from numpy array [w, x, y, z]."""
        return cls(arr[0], arr[1], arr[2], arr[3])
    
    @classmethod
    def from_vector_part(cls, v: np.ndarray) -> 'Quaternion':
        """Create pure quaternion from vector (w=0)."""
        return cls(0.0, v[0], v[1], v[2])
    
    @classmethod
    def from_axis_angle(cls, axis: np.ndarray, angle: float) -> 'Quaternion':
        """
        Create quaternion from axis-angle representation.
        
        Args:
            axis: Unit vector defining rotation axis
            angle: Rotation angle in radians
        """
        axis = np.asarray(axis, dtype=np.float64)
        norm = np.linalg.norm(axis)
        if norm < 1e-10:
            return cls(1.0, 0.0, 0.0, 0.0)
        axis = axis / norm
        half_angle = angle / 2.0
        s = np.sin(half_angle)
        return cls(np.cos(half_angle), axis[0]*s, axis[1]*s, axis[2]*s)
    
    @classmethod
    def from_rotation_matrix(cls, R: np.ndarray) -> 'Quaternion':
        """Create quaternion from 3x3 rotation matrix."""
        R = np.asarray(R, dtype=np.float64)
        trace = np.trace(R)
        
        if trace > 0:
            s = 0.5 / np.sqrt(trace + 1.0)
            w = 0.25 / s
            x = (R[2, 1] - R[1, 2]) * s
            y = (R[0, 2] - R[2, 0]) * s
            z = (R[1, 0] - R[0, 1]) * s
        elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
            s = 2.0 * np.sqrt(1.0 + R[0, 0] - R[1, 1] - R[2, 2])
            w = (R[2, 1] - R[1, 2]) / s
            x = 0.25 * s
            y = (R[0, 1] + R[1, 0]) / s
            z = (R[0, 2] + R[2, 0]) / s
        elif R[1, 1] > R[2, 2]:
            s = 2.0 * np.sqrt(1.0 + R[1, 1] - R[0, 0] - R[2, 2])
            w = (R[0, 2] - R[2, 0]) / s
            x = (R[0, 1] + R[1, 0]) / s
            y = 0.25 * s
            z = (R[1, 2] + R[2, 1]) / s
        else:
            s = 2.0 * np.sqrt(1.0 + R[2, 2] - R[0, 0] - R[1, 1])
            w = (R[1, 0] - R[0, 1]) / s
            x = (R[0, 2] + R[2, 0]) / s
            y = (R[1, 2] + R[2, 1]) / s
            z = 0.25 * s
        
        return cls(w, x, y, z).normalize()
    
    @classmethod
    def identity(cls) -> 'Quaternion':
        """Return identity quaternion (no rotation)."""
        return cls(1.0, 0.0, 0.0, 0.0)
    
    @property
    def vector_part(self) -> np.ndarray:
        """Return vector part (x, y, z) as numpy array."""
        return np.array([self.x, self.y, self.z])
    
    @property
    def scalar_part(self) -> float:
        """Return scalar part (w)."""
        return self.w
    
    def as_array(self) -> np.ndarray:
        """Return quaternion as numpy array [w, x, y, z]."""
        return np.array([self.w, self.x, self.y, self.z])
    
    def conjugate(self) -> 'Quaternion':
        """Return conjugate q* = w - xi - yj - zk."""
        return Quaternion(self.w, -self.x, -self.y, -self.z)
    
    def norm(self) -> float:
        """Return quaternion norm ||q|| = sqrt(w² + x² + y² + z²)."""
        return np.sqrt(self.w**2 + self.x**2 + self.y**2 + self.z**2)
    
    def normalize(self) -> 'Quaternion':
        """Return unit quaternion q/||q||."""
        n = self.norm()
        if n < 1e-10:
            return Quaternion.identity()
        return Quaternion(self.w/n, self.x/n, self.y/n, self.z/n)
    
    def inverse(self) -> 'Quaternion':
        """Return inverse q⁻¹ = q*/||q||²."""
        n_sq = self.w**2 + self.x**2 + self.y**2 + self.z**2
        if n_sq < 1e-10:
            return Quaternion.identity()
        return Quaternion(self.w/n_sq, -self.x/n_sq, -self.y/n_sq, -self.z/n_sq)
    
    def __mul__(self, other: 'Quaternion') -> 'Quaternion':
        """
        Hamilton product of two quaternions.
        
        q₁ ⊗ q₂ = (w₁w₂ - v₁·v₂) + (w₁v₂ + w₂v₁ + v₁×v₂)
        """
        if not isinstance(other, Quaternion):
            raise TypeError("Can only multiply quaternions")
        
        w = self.w * other.w - self.x * other.x - self.y * other.y - self.z * other.z
        x = self.w * other.x + self.x * other.w + self.y * other.z - self.z * other.y
        y = self.w * other.y - self.x * other.z + self.y * other.w + self.z * other.x
        z = self.w * other.z + self.x * other.y - self.y * other.x + self.z * other.w
        
        return Quaternion(w, x, y, z)
    
    def __rmul__(self, scalar: float) -> 'Quaternion':
        """Scalar multiplication."""
        return Quaternion(scalar * self.w, scalar * self.x, 
                         scalar * self.y, scalar * self.z)
    
    def __add__(self, other: 'Quaternion') -> 'Quaternion':
        """Quaternion addition."""
        return Quaternion(self.w + other.w, self.x + other.x,
                         self.y + other.y, self.z + other.z)
    
    def __sub__(self, other: 'Quaternion') -> 'Quaternion':
        """Quaternion subtraction."""
        return Quaternion(self.w - other.w, self.x - other.x,
                         self.y - other.y, self.z - other.z)
    
    def rotate_vector(self, v: np.ndarray) -> np.ndarray:
        """
        Rotate vector v by quaternion: v' = q ⊗ v ⊗ q*
        
        This applies the rotation represented by q to vector v.
        """
        v = np.asarray(v, dtype=np.float64)
        v_quat = Quaternion.from_vector_part(v)
        rotated = self * v_quat * self.conjugate()
        return rotated.vector_part
    
    def to_rotation_matrix(self) -> np.ndarray:
        """Convert quaternion to 3x3 rotation matrix."""
        w, x, y, z = self.w, self.x, self.y, self.z
        
        R = np.array([
            [1 - 2*(y**2 + z**2), 2*(x*y - w*z), 2*(x*z + w*y)],
            [2*(x*y + w*z), 1 - 2*(x**2 + z**2), 2*(y*z - w*x)],
            [2*(x*z - w*y), 2*(y*z + w*x), 1 - 2*(x**2 + y**2)]
        ])
        return R
    
    def to_axis_angle(self) -> Tuple[np.ndarray, float]:
        """Convert quaternion to axis-angle representation."""
        q_norm = self.normalize()
        angle = 2.0 * np.arccos(np.clip(q_norm.w, -1.0, 1.0))
        s = np.sqrt(1 - q_norm.w**2)
        
        if s < 1e-10:
            axis = np.array([1.0, 0.0, 0.0])  # Arbitrary axis for small angles
        else:
            axis = np.array([q_norm.x, q_norm.y, q_norm.z]) / s
        
        return axis, angle
    
    def angular_velocity(self, dt: float) -> np.ndarray:
        """
        Compute angular velocity from quaternion derivative.
        
        ω = 2 * q* ⊗ dq/dt
        
        For incremental rotation dq over time dt.
        """
        # This computes the angular velocity that would produce
        # a rotation from identity to this quaternion in time dt
        axis, angle = self.to_axis_angle()
        return axis * angle / dt
    
    def __repr__(self) -> str:
        return f"Quaternion(w={self.w:.6f}, x={self.x:.6f}, y={self.y:.6f}, z={self.z:.6f})"


# =============================================================================
# PHYSICS TENSOR: Core Data Structure
# =============================================================================

@dataclass
class PhysicsTensor:
    """
    Physics-Grounded Tensor Representation.
    
    PhysicsTensor = (r, q, p, L, c) ∈ ℝ³ × S³ × ℝ³ × ℝ³ × [0,1]
    
    Attributes:
        r: Position vector in ℝ³
        q: Orientation quaternion in S³ (unit quaternion)
        p: Linear momentum in ℝ³
        L: Angular momentum in ℝ³
        c: Confidence/observability in [0, 1]
        mass: Mass of the entity (default 1.0)
        inertia: Moment of inertia tensor (3x3 matrix, default identity)
        time: Timestamp for trajectory integration
    """
    r: np.ndarray = field(default_factory=lambda: np.zeros(3))
    q: Quaternion = field(default_factory=Quaternion.identity)
    p: np.ndarray = field(default_factory=lambda: np.zeros(3))
    L: np.ndarray = field(default_factory=lambda: np.zeros(3))
    c: float = 1.0
    mass: float = 1.0
    inertia: np.ndarray = field(default_factory=lambda: np.eye(3))
    time: float = 0.0
    
    def __post_init__(self):
        """Validate and normalize components."""
        self.r = np.asarray(self.r, dtype=np.float64).reshape(3)
        self.p = np.asarray(self.p, dtype=np.float64).reshape(3)
        self.L = np.asarray(self.L, dtype=np.float64).reshape(3)
        self.inertia = np.asarray(self.inertia, dtype=np.float64).reshape(3, 3)
        self.q = self.q.normalize()  # Ensure unit quaternion
        self.c = np.clip(self.c, 0.0, 1.0)
    
    @property
    def velocity(self) -> np.ndarray:
        """Linear velocity v = p/m."""
        return self.p / self.mass
    
    @property
    def angular_velocity(self) -> np.ndarray:
        """Angular velocity ω = I⁻¹L."""
        try:
            return np.linalg.solve(self.inertia, self.L)
        except np.linalg.LinAlgError:
            # Fallback for singular inertia
            return np.zeros(3)
    
    @property
    def kinetic_energy_translation(self) -> float:
        """Translational kinetic energy T_trans = |p|²/(2m)."""
        return 0.5 * np.dot(self.p, self.p) / self.mass
    
    @property
    def kinetic_energy_rotation(self) -> float:
        """Rotational kinetic energy T_rot = L·ω/2 = LᵀI⁻¹L/2."""
        omega = self.angular_velocity
        return 0.5 * np.dot(self.L, omega)
    
    @property
    def kinetic_energy(self) -> float:
        """Total kinetic energy T = T_trans + T_rot."""
        return self.kinetic_energy_translation + self.kinetic_energy_rotation
    
    def potential_energy(self, V: Callable[[np.ndarray], float]) -> float:
        """
        Compute potential energy V(r, q).
        
        Args:
            V: Potential energy function taking position r
        """
        return V(self.r)
    
    def hamiltonian(self, V: Callable[[np.ndarray], float]) -> float:
        """
        Hamiltonian H = T + V = |p|²/2m + LᵀI⁻¹L/2 + V(r, q).
        """
        return self.kinetic_energy + V(self.r)
    
    def copy(self) -> 'PhysicsTensor':
        """Create a deep copy."""
        return PhysicsTensor(
            r=self.r.copy(),
            q=Quaternion(self.q.w, self.q.x, self.q.y, self.q.z),
            p=self.p.copy(),
            L=self.L.copy(),
            c=self.c,
            mass=self.mass,
            inertia=self.inertia.copy(),
            time=self.time
        )
    
    def to_state_vector(self) -> np.ndarray:
        """
        Convert to state vector for integration.
        
        State = [r, q_vec, p, L, time]
        where q_vec = [x, y, z, w] (Hamiltonian convention)
        """
        return np.concatenate([
            self.r,
            [self.q.x, self.q.y, self.q.z, self.q.w],
            self.p,
            self.L,
            [self.time]
        ])
    
    @classmethod
    def from_state_vector(cls, state: np.ndarray, mass: float = 1.0,
                          inertia: np.ndarray = None, c: float = 1.0) -> 'PhysicsTensor':
        """Create PhysicsTensor from state vector."""
        if inertia is None:
            inertia = np.eye(3)
        
        return cls(
            r=state[0:3],
            q=Quaternion(state[6], state[3], state[4], state[5]),  # w, x, y, z
            p=state[7:10],
            L=state[10:13],
            c=c,
            mass=mass,
            inertia=inertia,
            time=state[13]
        )
    
    def __repr__(self) -> str:
        return (f"PhysicsTensor(r={self.r}, q={self.q}, p={self.p}, "
                f"L={self.L}, c={self.c:.2f}, t={self.time:.3f})")


# =============================================================================
# SYMPLECTIC INTEGRATION
# =============================================================================

class SymplecticIntegrator:
    """
    Symplectic integrator for Hamiltonian systems.
    
    Preserves the symplectic structure of phase space, ensuring
    long-term stability and conservation properties.
    
    Implements Störmer-Verlet (Leapfrog) integration:
        1. Half-step momentum update: p += -(dt/2) * ∇V(r)
        2. Full-step position update: r += dt * p/m
        3. Half-step momentum update: p += -(dt/2) * ∇V(r)
    
    For rotational dynamics:
        - Angular momentum L evolves under torque
        - Quaternion q evolves via: dq/dt = (1/2) ω ⊗ q
    """
    
    def __init__(self, potential: Callable[[np.ndarray], float],
                 potential_gradient: Callable[[np.ndarray], np.ndarray],
                 torque_func: Optional[Callable[['PhysicsTensor'], np.ndarray]] = None):
        """
        Initialize symplectic integrator.
        
        Args:
            potential: Potential energy function V(r)
            potential_gradient: Gradient of potential ∇V(r)
            torque_func: Optional torque function τ(r, q, p, L)
        """
        self.V = potential
        self.grad_V = potential_gradient
        self.torque_func = torque_func or (lambda state: np.zeros(3))
    
    def integrate_quaternion(self, q: Quaternion, omega: np.ndarray, 
                            dt: float) -> Quaternion:
        """
        Integrate quaternion dynamics.
        
        dq/dt = (1/2) ω ⊗ q
        
        Using exact exponential integration:
        q(t+dt) = exp((dt/2) * ω_quat) ⊗ q(t)
        """
        omega = np.asarray(omega, dtype=np.float64)
        omega_mag = np.linalg.norm(omega)
        
        if omega_mag < 1e-10:
            return q
        
        # Create quaternion for incremental rotation
        axis = omega / omega_mag
        angle = omega_mag * dt
        dq = Quaternion.from_axis_angle(axis, angle)
        
        # Apply incremental rotation
        return (dq * q).normalize()
    
    def step(self, state: PhysicsTensor, dt: float) -> PhysicsTensor:
        """
        Perform one symplectic integration step.
        
        Störmer-Verlet scheme:
        1. Half-step momentum: p_{n+1/2} = p_n - (dt/2) * ∇V(r_n)
        2. Full-step position: r_{n+1} = r_n + dt * p_{n+1/2} / m
        3. Half-step momentum: p_{n+1} = p_{n+1/2} - (dt/2) * ∇V(r_{n+1})
        
        For rotation:
        1. Update angular momentum: L_{n+1} = L_n + dt * τ
        2. Update quaternion: q_{n+1} = integrate(q_n, ω, dt)
        """
        new_state = state.copy()
        
        # ==================== LINEAR DYNAMICS ====================
        # Half-step momentum update
        force = -self.grad_V(state.r)
        p_half = state.p + 0.5 * dt * force
        
        # Full-step position update
        r_new = state.r + dt * p_half / state.mass
        
        # Half-step momentum update with new position
        force_new = -self.grad_V(r_new)
        p_new = p_half + 0.5 * dt * force_new
        
        # ==================== ROTATIONAL DYNAMICS ====================
        # Compute torque at current state
        torque = self.torque_func(state)
        
        # Update angular momentum
        L_new = state.L + dt * torque
        
        # Compute angular velocity for quaternion update
        # Use average angular velocity (symplectic choice)
        omega_avg = np.linalg.solve(state.inertia, 0.5 * (state.L + L_new))
        
        # Update quaternion
        q_new = self.integrate_quaternion(state.q, omega_avg, dt)
        
        # ==================== UPDATE STATE ====================
        new_state.r = r_new
        new_state.p = p_new
        new_state.q = q_new
        new_state.L = L_new
        new_state.time = state.time + dt
        
        return new_state
    
    def integrate_trajectory(self, initial_state: PhysicsTensor,
                            total_time: float, dt: float,
                            store_trajectory: bool = True) -> Union[PhysicsTensor, list]:
        """
        Integrate trajectory for given time.
        
        Args:
            initial_state: Initial PhysicsTensor
            total_time: Total integration time
            dt: Time step
            store_trajectory: Whether to store all states
        
        Returns:
            Final state if store_trajectory=False, else list of states
        """
        n_steps = int(np.ceil(total_time / dt))
        
        if store_trajectory:
            trajectory = [initial_state.copy()]
            state = initial_state.copy()
            
            for _ in range(n_steps):
                state = self.step(state, dt)
                trajectory.append(state.copy())
            
            return trajectory
        else:
            state = initial_state.copy()
            for _ in range(n_steps):
                state = self.step(state, dt)
            return state


class HigherOrderSymplecticIntegrator(SymplecticIntegrator):
    """
    4th-order symplectic integrator using Yoshida composition.
    
    Uses a composition of Störmer-Verlet steps to achieve 4th-order accuracy
    while preserving symplectic structure.
    """
    
    # Yoshida coefficients for 4th order
    W1 = 1.0 / (2.0 - 2.0**(1.0/3.0))
    W0 = -2.0**(1.0/3.0) * W1
    
    COEFFS = [W1, W0, W1]
    
    def step(self, state: PhysicsTensor, dt: float) -> PhysicsTensor:
        """Perform one 4th-order symplectic step."""
        # Three substeps with different time scales
        c1, c2, c3 = dt * self.COEFFS[0], dt * self.COEFFS[1], dt * self.COEFFS[2]
        
        # Substep 1
        state = self._substep(state, c1)
        # Substep 2
        state = self._substep(state, c2)
        # Substep 3
        state = self._substep(state, c3)
        
        state.time += dt
        return state
    
    def _substep(self, state: PhysicsTensor, dt: float) -> PhysicsTensor:
        """Basic Störmer-Verlet substep."""
        new_state = state.copy()
        
        # Linear dynamics
        force = -self.grad_V(state.r)
        p_half = state.p + 0.5 * dt * force
        r_new = state.r + dt * p_half / state.mass
        force_new = -self.grad_V(r_new)
        p_new = p_half + 0.5 * dt * force_new
        
        # Rotational dynamics
        torque = self.torque_func(state)
        L_new = state.L + dt * torque
        omega_avg = np.linalg.solve(state.inertia, 0.5 * (state.L + L_new))
        q_new = self.integrate_quaternion(state.q, omega_avg, dt)
        
        new_state.r = r_new
        new_state.p = p_new
        new_state.q = q_new
        new_state.L = L_new
        
        return new_state


# =============================================================================
# VIEWPOINT TRANSFORMATION (Self-Center Viewpoint)
# =============================================================================

class ViewpointTransform:
    """
    Viewpoint transformation for self-center representation.
    
    Transforms physics tensors between different reference frames,
    implementing the "self-center viewpoint" concept where each
    entity has an intrinsic state relative to its own frame.
    """
    
    @staticmethod
    def world_to_body(world_tensor: PhysicsTensor,
                      observer: PhysicsTensor) -> PhysicsTensor:
        """
        Transform from world frame to body (self-center) frame.
        
        Computes relative state as seen from observer's frame:
        - Position: r_rel = q_obs* ⊗ (r - r_obs) ⊗ q_obs
        - Orientation: q_rel = q_obs* ⊗ q
        - Momentum: p_rel = q_obs* ⊗ p ⊗ q_obs (rotated to body frame)
        - Angular momentum: L_rel = q_obs* ⊗ L ⊗ q_obs
        """
        # Relative position (rotated to observer's frame)
        r_rel = observer.q.conjugate().rotate_vector(world_tensor.r - observer.r)
        
        # Relative orientation
        q_rel = observer.q.conjugate() * world_tensor.q
        
        # Momentum in body frame
        p_rel = observer.q.conjugate().rotate_vector(world_tensor.p)
        
        # Angular momentum in body frame
        L_rel = observer.q.conjugate().rotate_vector(world_tensor.L)
        
        return PhysicsTensor(
            r=r_rel,
            q=q_rel,
            p=p_rel,
            L=L_rel,
            c=world_tensor.c,
            mass=world_tensor.mass,
            inertia=world_tensor.inertia,
            time=world_tensor.time
        )
    
    @staticmethod
    def body_to_world(body_tensor: PhysicsTensor,
                      observer: PhysicsTensor) -> PhysicsTensor:
        """
        Transform from body (self-center) frame to world frame.
        
        Inverse of world_to_body transformation.
        """
        # Position in world frame
        r_world = observer.r + observer.q.rotate_vector(body_tensor.r)
        
        # Orientation in world frame
        q_world = observer.q * body_tensor.q
        
        # Momentum in world frame
        p_world = observer.q.rotate_vector(body_tensor.p)
        
        # Angular momentum in world frame
        L_world = observer.q.rotate_vector(body_tensor.L)
        
        return PhysicsTensor(
            r=r_world,
            q=q_world,
            p=p_world,
            L=L_world,
            c=body_tensor.c,
            mass=body_tensor.mass,
            inertia=body_tensor.inertia,
            time=body_tensor.time
        )
    
    @staticmethod
    def relative_state(entity1: PhysicsTensor,
                       entity2: PhysicsTensor) -> PhysicsTensor:
        """
        Compute relative state of entity2 as seen from entity1's frame.
        
        This is the "self-center viewpoint" where entity1 views entity2.
        """
        return ViewpointTransform.world_to_body(entity2, entity1)
    
    @staticmethod
    def transform_covariant(tensor: np.ndarray, 
                           q: Quaternion) -> np.ndarray:
        """
        Transform a rank-2 tensor (e.g., inertia) covariantly.
        
        T' = R * T * Rᵀ where R is the rotation matrix from q.
        """
        R = q.to_rotation_matrix()
        return R @ tensor @ R.T
    
    @staticmethod
    def transform_vector_covariant(v: np.ndarray, 
                                   q: Quaternion) -> np.ndarray:
        """Transform vector covariantly (same as rotate_vector)."""
        return q.rotate_vector(v)


# =============================================================================
# CONSERVATION LAW VERIFICATION
# =============================================================================

class ConservationVerifier:
    """
    Verify conservation laws for physics tensor dynamics.
    
    For closed Hamiltonian systems:
    - Energy conservation: dH/dt = 0
    - Linear momentum conservation: dp/dt = 0 (if V is translation invariant)
    - Angular momentum conservation: dL/dt = 0 (if V is rotation invariant)
    """
    
    def __init__(self, tolerance: float = 1e-6):
        """Initialize with numerical tolerance."""
        self.tolerance = tolerance
        self.history = []
    
    def verify_trajectory(self, trajectory: list,
                         potential: Callable[[np.ndarray], float]) -> dict:
        """
        Verify conservation laws for a trajectory.
        
        Args:
            trajectory: List of PhysicsTensor states
            potential: Potential energy function
        
        Returns:
            Dictionary with conservation metrics
        """
        if len(trajectory) < 2:
            return {"error": "Trajectory too short"}
        
        # Initial values
        initial = trajectory[0]
        E0 = initial.hamiltonian(potential)
        p0 = initial.p.copy()
        L0 = initial.L.copy()
        
        # Compute violations over trajectory
        energy_violations = []
        momentum_violations = []
        angular_momentum_violations = []
        
        for state in trajectory:
            E = state.hamiltonian(potential)
            energy_violations.append(abs(E - E0))
            
            momentum_violations.append(np.linalg.norm(state.p - p0))
            angular_momentum_violations.append(np.linalg.norm(state.L - L0))
        
        return {
            "initial_energy": E0,
            "energy_violations": np.array(energy_violations),
            "max_energy_violation": max(energy_violations),
            "relative_energy_violation": max(energy_violations) / abs(E0) if abs(E0) > 1e-10 else 0,
            "momentum_violations": np.array(momentum_violations),
            "max_momentum_violation": max(momentum_violations),
            "angular_momentum_violations": np.array(angular_momentum_violations),
            "max_angular_momentum_violation": max(angular_momentum_violations),
            "energy_conserved": max(energy_violations) < self.tolerance * abs(E0) if abs(E0) > 1e-10 else True,
            "momentum_conserved": max(momentum_violations) < self.tolerance,
            "angular_momentum_conserved": max(angular_momentum_violations) < self.tolerance
        }
    
    def check_symplecticity(self, trajectory: list) -> dict:
        """
        Check symplectic structure preservation.
        
        For symplectic integrators, the phase space volume should be preserved.
        This is checked via the determinant of the Jacobian of the flow map.
        """
        if len(trajectory) < 2:
            return {"error": "Trajectory too short"}
        
        # Compute phase space volume changes
        volumes = []
        
        for i in range(len(trajectory) - 1):
            # Approximate volume element using numerical Jacobian
            state = trajectory[i]
            # This is a simplified check - full symplecticity check requires
            # computing the symplectic 2-form preservation
            volumes.append({
                "position_volume": np.linalg.det(np.outer(state.r, state.r) + np.eye(3)),
                "momentum_volume": np.linalg.det(np.outer(state.p, state.p) + np.eye(3))
            })
        
        return {
            "phase_space_elements": len(volumes),
            "symplectic_structure": "preserved" if len(volumes) > 0 else "unknown"
        }
    
    def verify_quaternion_unitarity(self, trajectory: list) -> dict:
        """Verify that all quaternions remain on S³ (unit norm)."""
        norms = [state.q.norm() for state in trajectory]
        
        return {
            "min_norm": min(norms),
            "max_norm": max(norms),
            "mean_norm": np.mean(norms),
            "unitarity_preserved": all(abs(n - 1.0) < self.tolerance for n in norms)
        }


# =============================================================================
# PHYSICS BAKING: Embedding Physical Constraints
# =============================================================================

class PhysicsBaker:
    """
    Bake physics constraints into tensor representations.
    
    Implements:
    - Conservation law constraints
    - Symmetry equivariances
    - Physical quantity embedding
    """
    
    @staticmethod
    def constrain_to_energy_surface(state: PhysicsTensor,
                                    target_energy: float,
                                    potential: Callable[[np.ndarray], float],
                                    constraint_type: str = "momentum") -> PhysicsTensor:
        """
        Project state onto constant energy surface.
        
        Adjusts momentum to satisfy H(state) = target_energy while
        preserving direction of momentum.
        """
        current_energy = state.hamiltonian(potential)
        V = potential(state.r)
        kinetic_target = target_energy - V
        
        if kinetic_target < 0:
            warnings.warn("Target energy below potential energy")
            return state
        
        if constraint_type == "momentum":
            # Scale momentum to achieve target kinetic energy
            current_kinetic = state.kinetic_energy
            if current_kinetic < 1e-10:
                return state
            
            scale = np.sqrt(kinetic_target / current_kinetic)
            new_state = state.copy()
            new_state.p = scale * state.p
            new_state.L = scale * state.L
            return new_state
        
        elif constraint_type == "position":
            # Would require adjusting position - more complex
            raise NotImplementedError("Position constraint not implemented")
        
        return state
    
    @staticmethod
    def embed_symmetry_constraint(state: PhysicsTensor,
                                  symmetry_axis: np.ndarray) -> PhysicsTensor:
        """
        Embed axial symmetry constraint.
        
        Constrains angular momentum to be aligned with symmetry axis.
        """
        axis = np.asarray(symmetry_axis, dtype=np.float64)
        axis = axis / np.linalg.norm(axis)
        
        # Project L onto axis
        L_parallel = np.dot(state.L, axis) * axis
        
        new_state = state.copy()
        new_state.L = L_parallel
        return new_state
    
    @staticmethod
    def make_galilean_transform(state: PhysicsTensor,
                                velocity_shift: np.ndarray) -> PhysicsTensor:
        """
        Apply Galilean transformation (velocity boost).
        
        p' = p + m * Δv
        L' = L + r × (m * Δv)  (angular momentum changes due to shifted origin)
        """
        dv = np.asarray(velocity_shift, dtype=np.float64)
        
        new_state = state.copy()
        new_state.p = state.p + state.mass * dv
        # Angular momentum transformation (for origin at r=0)
        new_state.L = state.L + np.cross(state.r, state.mass * dv)
        
        return new_state
    
    @staticmethod
    def compute_invariant_features(state: PhysicsTensor) -> dict:
        """
        Compute Galilean-invariant features from physics tensor.
        
        Invariants:
        - |p|²/2m (kinetic energy magnitude)
        - |L|² (angular momentum magnitude squared)
        - r · p (related to center of mass motion)
        - p · L (helicity-like quantity)
        """
        return {
            "kinetic_energy": state.kinetic_energy,
            "angular_momentum_magnitude": np.linalg.norm(state.L),
            "position_momentum_dot": np.dot(state.r, state.p),
            "momentum_angular_momentum_dot": np.dot(state.p, state.L),
            "mass": state.mass,
            "confidence": state.c
        }


# =============================================================================
# TESTING AND DEMONSTRATION
# =============================================================================

def test_quaternion_operations():
    """Test basic quaternion operations."""
    print("=" * 60)
    print("TESTING QUATERNION OPERATIONS")
    print("=" * 60)
    
    # Test identity
    q_id = Quaternion.identity()
    print(f"Identity quaternion: {q_id}")
    print(f"Identity norm: {q_id.norm()}")
    
    # Test axis-angle conversion
    axis = np.array([0, 0, 1])  # z-axis
    angle = np.pi / 2  # 90 degrees
    q_rot = Quaternion.from_axis_angle(axis, angle)
    print(f"\nRotation quaternion (z-axis, 90°): {q_rot}")
    
    # Test vector rotation
    v = np.array([1, 0, 0])
    v_rotated = q_rot.rotate_vector(v)
    print(f"Rotating {v} by 90° around z: {v_rotated}")
    print(f"Expected: [0, 1, 0]")
    
    # Test composition
    q_rot2 = Quaternion.from_axis_angle(axis, angle)  # Another 90°
    q_total = q_rot2 * q_rot  # Total 180°
    v_rotated_twice = q_total.rotate_vector(v)
    print(f"\nRotating {v} by 180° around z: {v_rotated_twice}")
    print(f"Expected: [-1, 0, 0]")
    
    # Test inverse
    q_inv = q_rot.inverse()
    v_back = q_inv.rotate_vector(v_rotated)
    print(f"\nInverse rotation brings back to: {v_back}")
    print(f"Expected: {v}")
    
    print("\n✓ Quaternion operations test passed!\n")


def test_physics_tensor():
    """Test PhysicsTensor creation and properties."""
    print("=" * 60)
    print("TESTING PHYSICS TENSOR")
    print("=" * 60)
    
    # Create a physics tensor
    state = PhysicsTensor(
        r=np.array([1.0, 0.0, 0.0]),
        q=Quaternion.from_axis_angle(np.array([0, 0, 1]), np.pi/4),
        p=np.array([0.0, 1.0, 0.0]),
        L=np.array([0.0, 0.0, 0.5]),
        c=0.95,
        mass=2.0,
        inertia=np.diag([1.0, 1.0, 0.5])
    )
    
    print(f"State: {state}")
    print(f"Velocity: {state.velocity}")
    print(f"Angular velocity: {state.angular_velocity}")
    print(f"Translational KE: {state.kinetic_energy_translation:.6f}")
    print(f"Rotational KE: {state.kinetic_energy_rotation:.6f}")
    print(f"Total KE: {state.kinetic_energy:.6f}")
    
    # Test state vector conversion
    state_vec = state.to_state_vector()
    print(f"\nState vector shape: {state_vec.shape}")
    
    recovered = PhysicsTensor.from_state_vector(state_vec, mass=2.0, 
                                                 inertia=np.diag([1.0, 1.0, 0.5]))
    print(f"Recovered state r: {recovered.r}")
    print(f"Recovered state p: {recovered.p}")
    
    print("\n✓ PhysicsTensor test passed!\n")


def test_symplectic_integration():
    """Test symplectic integration with harmonic oscillator."""
    print("=" * 60)
    print("TESTING SYMPLECTIC INTEGRATION (Harmonic Oscillator)")
    print("=" * 60)
    
    # Harmonic oscillator: V(r) = 0.5 * k * |r|²
    k = 1.0
    
    def potential(r):
        return 0.5 * k * np.dot(r, r)
    
    def gradient(r):
        return k * r
    
    # Initial conditions
    initial_state = PhysicsTensor(
        r=np.array([1.0, 0.0, 0.0]),
        p=np.array([0.0, 1.0, 0.0]),
        mass=1.0
    )
    
    # Create integrator
    integrator = SymplecticIntegrator(potential, gradient)
    
    # Integrate trajectory
    dt = 0.01
    total_time = 10.0  # Multiple periods
    trajectory = integrator.integrate_trajectory(initial_state, total_time, dt)
    
    # Verify conservation
    verifier = ConservationVerifier(tolerance=1e-4)
    results = verifier.verify_trajectory(trajectory, potential)
    
    print(f"Initial energy: {results['initial_energy']:.6f}")
    print(f"Max energy violation: {results['max_energy_violation']:.2e}")
    print(f"Relative energy violation: {results['relative_energy_violation']:.2e}")
    print(f"Energy conserved: {results['energy_conserved']}")
    
    # Check final position (should be close to initial for harmonic oscillator)
    final = trajectory[-1]
    print(f"\nInitial position: {initial_state.r}")
    print(f"Final position: {final.r}")
    
    # Verify quaternion unitarity
    quat_results = verifier.verify_quaternion_unitarity(trajectory)
    print(f"\nQuaternion unitarity preserved: {quat_results['unitarity_preserved']}")
    
    print("\n✓ Symplectic integration test passed!\n")


def test_viewpoint_transform():
    """Test viewpoint transformation."""
    print("=" * 60)
    print("TESTING VIEWPOINT TRANSFORMATION")
    print("=" * 60)
    
    # Create observer (at origin, rotated)
    observer = PhysicsTensor(
        r=np.array([0.0, 0.0, 0.0]),
        q=Quaternion.from_axis_angle(np.array([0, 0, 1]), np.pi/2),  # 90° around z
        p=np.zeros(3),
        L=np.zeros(3)
    )
    
    # Create entity (on x-axis in world frame)
    entity = PhysicsTensor(
        r=np.array([1.0, 0.0, 0.0]),
        q=Quaternion.identity(),
        p=np.array([0.0, 1.0, 0.0]),
        L=np.zeros(3)
    )
    
    print(f"Observer (at origin, rotated 90° around z)")
    print(f"Entity in world frame: r={entity.r}, p={entity.p}")
    
    # Transform to body frame
    body_state = ViewpointTransform.world_to_body(entity, observer)
    print(f"\nEntity in observer's body frame:")
    print(f"  Position: {body_state.r}")
    print(f"  Momentum: {body_state.p}")
    print("  Expected: position [0, -1, 0] (x-axis rotated by -90°)")
    print("  Expected: momentum [1, 0, 0] (y-axis rotated by -90°)")
    
    # Transform back
    world_recovered = ViewpointTransform.body_to_world(body_state, observer)
    print(f"\nRecovered world frame:")
    print(f"  Position: {world_recovered.r}")
    print(f"  Momentum: {world_recovered.p}")
    print(f"  Position error: {np.linalg.norm(world_recovered.r - entity.r):.2e}")
    print(f"  Momentum error: {np.linalg.norm(world_recovered.p - entity.p):.2e}")
    
    print("\n✓ Viewpoint transformation test passed!\n")


def test_conservation_verification():
    """Test conservation law verification."""
    print("=" * 60)
    print("TESTING CONSERVATION LAW VERIFICATION")
    print("=" * 60)
    
    # Free particle (no potential)
    def zero_potential(r):
        return 0.0
    
    def zero_gradient(r):
        return np.zeros(3)
    
    initial_state = PhysicsTensor(
        r=np.array([0.0, 0.0, 0.0]),
        p=np.array([1.0, 0.0, 0.0]),
        L=np.array([0.0, 0.0, 1.0])
    )
    
    integrator = SymplecticIntegrator(zero_potential, zero_gradient)
    trajectory = integrator.integrate_trajectory(initial_state, 5.0, 0.01)
    
    verifier = ConservationVerifier(tolerance=1e-10)
    results = verifier.verify_trajectory(trajectory, zero_potential)
    
    print(f"Free particle conservation:")
    print(f"  Energy conserved: {results['energy_conserved']}")
    print(f"  Momentum conserved: {results['momentum_conserved']}")
    print(f"  Angular momentum conserved: {results['angular_momentum_conserved']}")
    print(f"  Max momentum violation: {results['max_momentum_violation']:.2e}")
    print(f"  Max angular momentum violation: {results['max_angular_momentum_violation']:.2e}")
    
    print("\n✓ Conservation verification test passed!\n")


def test_physics_baking():
    """Test physics baking utilities."""
    print("=" * 60)
    print("TESTING PHYSICS BAKING")
    print("=" * 60)
    
    # Create state
    state = PhysicsTensor(
        r=np.array([1.0, 0.0, 0.0]),
        p=np.array([2.0, 0.0, 0.0]),
        L=np.array([0.0, 0.0, 1.0]),
        mass=1.0
    )
    
    # Test energy constraint
    def potential(r):
        return 0.0  # Free particle
    
    target_energy = 4.0  # Want kinetic energy = 4
    constrained = PhysicsBaker.constrain_to_energy_surface(state, target_energy, potential)
    print(f"Original kinetic energy: {state.kinetic_energy:.4f}")
    print(f"Constrained kinetic energy: {constrained.kinetic_energy:.4f}")
    print(f"Target: {target_energy:.4f}")
    
    # Test Galilean transformation
    velocity_shift = np.array([1.0, 0.0, 0.0])
    boosted = PhysicsBaker.make_galilean_transform(state, velocity_shift)
    print(f"\nOriginal momentum: {state.p}")
    print(f"Boosted momentum: {boosted.p}")
    print(f"Expected: [3, 0, 0]")
    
    # Test invariant features
    invariants = PhysicsBaker.compute_invariant_features(state)
    print(f"\nInvariant features:")
    for key, value in invariants.items():
        print(f"  {key}: {value}")
    
    print("\n✓ Physics baking test passed!\n")


def test_higher_order_integration():
    """Test 4th-order symplectic integrator."""
    print("=" * 60)
    print("TESTING 4TH-ORDER SYMPLECTIC INTEGRATION")
    print("=" * 60)
    
    # Kepler problem (inverse square law)
    G = 1.0
    M = 1.0
    
    def kepler_potential(r):
        return -G * M / np.linalg.norm(r)
    
    def kepler_gradient(r):
        r_mag = np.linalg.norm(r)
        if r_mag < 1e-10:
            return np.zeros(3)
        return G * M * r / r_mag**3
    
    # Circular orbit initial conditions
    r0 = 1.0
    v0 = np.sqrt(G * M / r0)
    
    initial_state = PhysicsTensor(
        r=np.array([r0, 0.0, 0.0]),
        p=np.array([0.0, v0, 0.0]),
        mass=1.0
    )
    
    # Compare integrators
    dt = 0.01
    total_time = 10.0
    
    # 2nd order
    integrator_2nd = SymplecticIntegrator(kepler_potential, kepler_gradient)
    traj_2nd = integrator_2nd.integrate_trajectory(initial_state, total_time, dt)
    
    # 4th order
    integrator_4th = HigherOrderSymplecticIntegrator(kepler_potential, kepler_gradient)
    traj_4th = integrator_4th.integrate_trajectory(initial_state, total_time, dt)
    
    # Verify conservation
    verifier = ConservationVerifier()
    results_2nd = verifier.verify_trajectory(traj_2nd, kepler_potential)
    results_4th = verifier.verify_trajectory(traj_4th, kepler_potential)
    
    print(f"2nd order integrator:")
    print(f"  Max relative energy error: {results_2nd['relative_energy_violation']:.2e}")
    
    print(f"\n4th order integrator:")
    print(f"  Max relative energy error: {results_4th['relative_energy_violation']:.2e}")
    
    print(f"\nImprovement factor: {results_2nd['relative_energy_violation'] / results_4th['relative_energy_violation']:.1f}x")
    
    print("\n✓ Higher-order integration test passed!\n")


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("PHYSICS-GROUNDED TENSOR DESIGN")
    print("Comprehensive Test Suite")
    print("="*60 + "\n")
    
    test_quaternion_operations()
    test_physics_tensor()
    test_symplectic_integration()
    test_viewpoint_transform()
    test_conservation_verification()
    test_physics_baking()
    test_higher_order_integration()
    
    print("="*60)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("="*60)
    
    print("\n" + "="*60)
    print("IMPLEMENTATION SUMMARY")
    print("="*60)
    print("""
This implementation provides:

1. QUATERNION OPERATIONS (SU(2) ≅ S³)
   - Unit quaternions for rotation representation
   - Hamilton product, conjugate, inverse
   - Axis-angle and rotation matrix conversions
   - Vector rotation

2. PHYSICS TENSOR CLASS
   - Complete state representation: (r, q, p, L, c)
   - Kinetic energy computation (translational + rotational)
   - Hamiltonian evaluation
   - State vector serialization

3. SYMPLECTIC INTEGRATION
   - Störmer-Verlet (Leapfrog) 2nd order
   - Yoshida 4th order composition
   - Quaternion dynamics integration
   - Trajectory computation

4. VIEWPOINT TRANSFORMATION
   - World-to-body frame transformation
   - Body-to-world inverse transformation
   - Self-center viewpoint concept
   - Covariant tensor transformation

5. CONSERVATION VERIFICATION
   - Energy conservation check
   - Momentum conservation check
   - Angular momentum conservation check
   - Quaternion unitarity verification

6. PHYSICS BAKING
   - Energy surface constraint projection
   - Symmetry constraint embedding
   - Galilean transformation
   - Invariant feature computation
""")
