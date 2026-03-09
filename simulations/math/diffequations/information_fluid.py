"""
Navier-Stokes Inspired Information Flow Dynamics in POLLN

Models A2A (Agent-to-Agent) communication as fluid flow through agent network.
Information "packets" flow through connections like fluid through pipes.

Mathematical Foundation:
- Conservation of information mass
- Momentum conservation for information flow
- Navier-Stokes equations with information viscosity
- Reynolds number for flow regime prediction
- Turbulence analysis for high-throughput scenarios
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import sparse, sparse.linalg, ndimage
from typing import Tuple, Optional, Dict
import warnings

from .deepseek_math import DeepSeekMath, DerivationResult


class InformationFluidSolver:
    """
    Numerical solver for information fluid dynamics
    Based on Navier-Stokes equations for information flow
    """

    def __init__(self,
                 domain_size: float = 1.0,
                 grid_points: int = 64,
                 viscosity: float = 0.01,
                 dt: float = 0.001):
        """
        Initialize fluid solver

        Args:
            domain_size: Physical size of domain [0, L]²
            grid_points: Grid resolution (N×N)
            viscosity: Kinematic viscosity of information fluid
            dt: Time step
        """
        self.L = domain_size
        self.N = grid_points
        self.nu = viscosity  # Kinematic viscosity
        self.dt = dt

        # Grid
        self.dx = self.L / (self.N - 1)
        self.x = np.linspace(0, self.L, self.N)
        self.X, self.Y = np.meshgrid(self.x, self.x, indexing='ij')

        # Fields
        self.rho = np.zeros((self.N, self.N))  # Information density (mass)
        self.u = np.zeros((self.N, self.N))    # Velocity in x
        self.v = np.zeros((self.N, self.N))    # Velocity in y
        self.p = np.zeros((self.N, self.N))    # Pressure

        # For tracking
        self.time = 0.0
        self.reynolds_number = 0.0

    def initialize_source(self, x0: float, y0: float, radius: float = 0.1):
        """Initialize information source at (x0, y0)"""
        r2 = (self.X - x0)**2 + (self.Y - y0)**2
        self.rho = np.exp(-r2 / (2 * radius**2))
        self.rho /= np.sum(self.rho) * self.dx**2  # Normalize

    def initialize_velocity_field(self, flow_type: str = "uniform"):
        """Initialize velocity field"""
        if flow_type == "uniform":
            # Uniform flow in x-direction
            self.u = np.ones((self.N, self.N)) * 0.1
            self.v = np.zeros((self.N, self.N))

        elif flow_type == "vortex":
            # Vortex at center
            cx, cy = self.L / 2, self.L / 2
            dx = self.X - cx
            dy = self.Y - cy
            r2 = dx**2 + dy**2 + 1e-6
            self.u = -dy / r2 * 0.1
            self.v = dx / r2 * 0.1

        elif flow_type == "shear":
            # Shear flow
            self.u = np.sin(2 * np.pi * self.Y / self.L) * 0.1
            self.v = np.zeros((self.N, self.N))

    def compute_reynolds_number(self) -> float:
        """Compute Reynolds number: Re = UL/ν"""
        # Characteristic velocity
        U = np.sqrt(np.mean(self.u**2 + self.v**2))

        # Characteristic length (domain size)
        L = self.L

        # Reynolds number
        Re = U * L / (self.nu + 1e-10)
        self.reynolds_number = Re

        return Re

    def get_flow_regime(self) -> str:
        """Determine flow regime from Reynolds number"""
        Re = self.compute_reynolds_number()

        if Re < 1:
            return "Creeping flow (highly viscous)"
        elif Re < 100:
            return "Laminar flow"
        elif Re < 2000:
            return "Transitional flow"
        else:
            return "Turbulent flow"

    def step(self, method: str = "projection"):
        """
        Time step integration

        Methods:
        - 'projection': Projection method (Chorin's method)
        - 'simple': SIMPLE algorithm
        """
        if method == "projection":
            self._step_projection()
        else:
            raise ValueError(f"Unknown method: {method}")

        self.time += self.dt

    def _step_projection(self):
        """
        Projection method for incompressible Navier-Stokes
        1. Advection-Diffusion: Predict velocity
        2. Pressure Poisson: Enforce incompressibility
        3. Correction: Project divergence-free
        """
        rho = self.rho
        u = self.u.copy()
        v = self.v.copy()
        dx = self.dx
        dt = self.dt
        nu = self.nu

        # Step 1: Advection-Diffusion (predict)
        # ∂u/∂t + (u·∇)u = ν∇²u

        # Advection term: (u·∇)u = u∂u/∂x + v∂u/∂y
        # Using upwind scheme for stability
        u_adv = self._advection(u, u, v)
        v_adv = self._advection(v, u, v)

        # Diffusion term: ν∇²u
        u_diff = nu * self._laplacian(u)
        v_diff = nu * self._laplacian(v)

        # Predicted velocity
        u_star = u + dt * (-u_adv + u_diff)
        v_star = v + dt * (-v_adv + v_diff)

        # Boundary conditions (no-slip)
        u_star[0, :] = u_star[-1, :] = 0
        u_star[:, 0] = u_star[:, -1] = 0
        v_star[0, :] = v_star[-1, :] = 0
        v_star[:, 0] = v_star[:, -1] = 0

        # Step 2: Pressure Poisson
        # ∇²p = ρ/dt * ∇·u*

        divergence = self._divergence(u_star, v_star)
        rhs = rho / dt * divergence

        # Solve Poisson equation
        self.p = self._solve_poisson(rhs)

        # Step 3: Velocity correction
        # u_new = u_star - dt/ρ * ∇p

        grad_p_x, grad_p_y = self._gradient(self.p)

        self.u = u_star - dt / (rho + 1e-6) * grad_p_x
        self.v = v_star - dt / (rho + 1e-6) * grad_p_y

        # Boundary conditions
        self.u[0, :] = self.u[-1, :] = 0
        self.u[:, 0] = self.u[:, -1] = 0
        self.v[0, :] = self.v[-1, :] = 0
        self.v[:, 0] = self.v[:, -1] = 0

        # Update information density (advection-diffusion)
        # ∂ρ/∂t + ∇·(ρu) = D∇²ρ
        D = 0.001  # Diffusion coefficient for information
        rho_adv = self._advection(rho, u, v)
        rho_diff = D * self._laplacian(rho)

        self.rho = rho + dt * (-rho_adv + rho_diff)

        # Normalize to conserve mass
        self.rho /= np.sum(self.rho) * dx**2

    def _advection(self, f: np.ndarray, u: np.ndarray, v: np.ndarray) -> np.ndarray:
        """Compute advection term (u·∇)f using upwind scheme"""
        dx = self.dx
        N = self.N

        result = np.zeros_like(f)

        for i in range(1, N-1):
            for j in range(1, N-1):
                # Upwind differencing
                if u[i, j] > 0:
                    df_dx = (f[i, j] - f[i-1, j]) / dx
                else:
                    df_dx = (f[i+1, j] - f[i, j]) / dx

                if v[i, j] > 0:
                    df_dy = (f[i, j] - f[i, j-1]) / dx
                else:
                    df_dy = (f[i, j+1] - f[i, j]) / dx

                result[i, j] = u[i, j] * df_dx + v[i, j] * df_dy

        return result

    def _laplacian(self, f: np.ndarray) -> np.ndarray:
        """Compute Laplacian using 5-point stencil"""
        dx = self.dx
        return (np.roll(f, 1, axis=0) + np.roll(f, -1, axis=0) +
                np.roll(f, 1, axis=1) + np.roll(f, -1, axis=1) -
                4 * f) / dx**2

    def _divergence(self, u: np.ndarray, v: np.ndarray) -> np.ndarray:
        """Compute divergence of velocity field"""
        dx = self.dx
        du_dx = (np.roll(u, -1, axis=0) - np.roll(u, 1, axis=0)) / (2 * dx)
        dv_dy = (np.roll(v, -1, axis=1) - np.roll(v, 1, axis=1)) / (2 * dx)
        return du_dx + dv_dy

    def _gradient(self, f: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Compute gradient of scalar field"""
        dx = self.dx
        grad_x = (np.roll(f, -1, axis=0) - np.roll(f, 1, axis=0)) / (2 * dx)
        grad_y = (np.roll(f, -1, axis=1) - np.roll(f, 1, axis=1)) / (2 * dx)
        return grad_x, grad_y

    def _solve_poisson(self, rhs: np.ndarray) -> np.ndarray:
        """Solve Poisson equation ∇²p = rhs using Jacobi iteration"""
        p = np.zeros_like(rhs)
        dx = self.dx
        max_iter = 100
        tol = 1e-4

        for _ in range(max_iter):
            p_new = np.zeros_like(p)

            # Jacobi iteration
            p_new[1:-1, 1:-1] = 0.25 * (
                p[2:, 1:-1] + p[:-2, 1:-1] +
                p[1:-1, 2:] + p[1:-1, :-2] -
                rhs[1:-1, 1:-1] * dx**2
            )

            # Check convergence
            if np.max(np.abs(p_new - p)) < tol:
                break

            p = p_new

        return p

    def compute_flow_statistics(self) -> Dict:
        """Compute flow statistics"""
        stats = {}

        # Velocity magnitude
        velocity = np.sqrt(self.u**2 + self.v**2)
        stats['mean_velocity'] = np.mean(velocity)
        stats['max_velocity'] = np.max(velocity)
        stats['reynolds_number'] = self.compute_reynolds_number()
        stats['flow_regime'] = self.get_flow_regime()

        # Information content
        stats['total_information'] = np.sum(self.rho) * self.dx**2
        stats['information_entropy'] = -np.sum(
            self.rho * np.log(self.rho + 1e-10)
        ) * self.dx**2

        # Divergence (incompressibility check)
        div = self._divergence(self.u, self.v)
        stats['mean_divergence'] = np.mean(np.abs(div))

        # Vorticity
        vorticity = self._compute_vorticity()
        stats['mean_vorticity'] = np.mean(np.abs(vorticity))
        stats['max_vorticity'] = np.max(np.abs(vorticity))

        return stats

    def _compute_vorticity(self) -> np.ndarray:
        """Compute vorticity ω = ∂v/∂x - ∂u/∂y"""
        dx = self.dx
        dv_dx = (np.roll(self.v, -1, axis=0) - np.roll(self.v, 1, axis=0)) / (2 * dx)
        du_dy = (np.roll(self.u, -1, axis=1) - np.roll(self.u, 1, axis=1)) / (2 * dx)
        return dv_dx - du_dy

    def detect_turbulence(self, threshold: float = 2000) -> bool:
        """Detect if flow is turbulent based on Reynolds number"""
        Re = self.compute_reynolds_number()
        return Re > threshold

    def plot_flow_field(self, ax=None, show_info: bool = True):
        """Plot velocity field and information density"""
        if ax is None:
            fig, ax = plt.subplots(figsize=(12, 5))

        # Information density contour
        im = ax.contourf(self.X, self.Y, self.rho, levels=20, cmap='Blues', alpha=0.6)

        # Velocity quiver
        skip = max(1, self.N // 20)  # Skip points for clarity
        ax.quiver(self.X[::skip, ::skip], self.Y[::skip, ::skip],
                 self.u[::skip, ::skip], self.v[::skip, ::skip],
                 scale=1.0, scale_units='xy')

        ax.set_xlabel('x')
        ax.set_ylabel('y')
        ax.set_title(f'Information Fluid Flow (t={self.time:.3f})')
        ax.set_aspect('equal')
        plt.colorbar(im, ax=ax, label='Information Density')

        if show_info:
            stats = self.compute_flow_statistics()
            textstr = f"Re = {stats['reynolds_number']:.1f}\n"
            textstr += f"Regime: {stats['flow_regime']}\n"
            textstr += f"Info: {stats['total_information']:.3f}"
            ax.text(0.02, 0.98, textstr, transform=ax.transAxes,
                   verticalalignment='top',
                   bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

        return ax

    def plot_vorticity(self, ax=None):
        """Plot vorticity field"""
        if ax is None:
            fig, ax = plt.subplots(figsize=(8, 6))

        vorticity = self._compute_vorticity()

        im = ax.contourf(self.X, self.Y, vorticity, levels=20, cmap='RdBu_r')
        ax.set_xlabel('x')
        ax.set_ylabel('y')
        ax.set_title(f'Vorticity Field (t={self.time:.3f})')
        ax.set_aspect('equal')
        plt.colorbar(im, ax=ax, label='Vorticity')

        return ax


def derive_information_fluid_equations(api_key: str) -> DerivationResult:
    """
    Use DeepSeek to derive Navier-Stokes equations for information flow
    """
    math_engine = DeepSeekMath(api_key)

    concept = """
    Navier-Stokes equations for information flow dynamics in POLLN.

    System description:
    - A2A (Agent-to-Agent) communication modeled as fluid flow
    - Information density ρ(x,t) represents concentration of messages
    - Velocity field u(x,t) represents flow direction and speed
    - Conservation of information mass: ∂ρ/∂t + ∇·(ρu) = 0
    - Momentum conservation with information viscosity
    - Pressure p(x,t) from communication constraints
    - Reynolds number Re = UL/ν determines flow regime
    - Turbulence emerges at high throughput (high Re)

    Derive:
    1. Continuity equation for information mass conservation
    2. Momentum equation from Newton's second law for information
    3. Navier-Stokes system with appropriate closure
    4. Reynolds number derivation and critical values
    5. Turbulence onset conditions
    6. Boundary conditions for agent network
    """

    result = math_engine.derive_pde(concept)
    return result


def run_simulation(api_key: Optional[str] = None,
                   n_steps: int = 500,
                   plot_results: bool = True):
    """
    Run complete information fluid simulation
    """
    print("="*70)
    print("INFORMATION FLUID DYNAMICS: A2A Communication Flow")
    print("="*70)

    # Derive equations if API key provided
    if api_key:
        print("\n1. Deriving Navier-Stokes equations using DeepSeek...")
        derivation = derive_information_fluid_equations(api_key)
        print(f"   Final system: {derivation.final_equation}")
        print(f"   API calls used: {derivation.api_calls_used}")

    # Create solver
    print("\n2. Initializing fluid solver...")
    solver = InformationFluidSolver(
        domain_size=1.0,
        grid_points=64,
        viscosity=0.01,
        dt=0.001
    )

    # Initialize flow
    solver.initialize_source(x0=0.2, y0=0.5, radius=0.1)
    solver.initialize_velocity_field(flow_type="vortex")

    print(f"   Grid: {solver.N}×{solver.N}")
    print(f"   Viscosity: {solver.nu}")
    print(f"   Time step: {solver.dt}")

    # Time evolution
    print(f"\n3. Evolving flow for {n_steps} time steps...")
    for i in range(n_steps):
        solver.step(method="projection")

        if (i+1) % 50 == 0:
            stats = solver.compute_flow_statistics()
            print(f"   Step {i+1}/{n_steps}: Re={stats['reynolds_number']:.1f}, "
                  f"regime={stats['flow_regime']}")

    # Final statistics
    print("\n4. Final Flow Statistics:")
    stats = solver.compute_flow_statistics()
    for key, value in stats.items():
        print(f"   {key}: {value}")

    # Turbulence detection
    print(f"\n5. Turbulence Detection:")
    is_turbulent = solver.detect_turbulence()
    print(f"   Flow is {'turbulent' if is_turbulent else 'laminar'}")

    # Plot results
    if plot_results:
        print("\n6. Generating plots...")

        fig, axes = plt.subplots(1, 2, figsize=(15, 6))

        solver.plot_flow_field(ax=axes[0])
        solver.plot_vorticity(ax=axes[1])

        plt.tight_layout()
        plt.savefig('simulations/math/diffequations/information_fluid_flow.png', dpi=150)
        print("   Saved: information_fluid_flow.png")

        plt.show()

    return solver


if __name__ == "__main__":
    # Run simulation
    api_key = "YOUR_API_KEY"
    solver = run_simulation(api_key=api_key, n_steps=200, plot_results=True)
