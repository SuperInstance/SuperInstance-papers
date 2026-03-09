"""
Fokker-Planck Equation for Agent State Evolution in POLLN

Derives and solves the PDE describing probability density evolution of agent states
in continuous state space with drift (learning) and diffusion (exploration).

Mathematical Foundation:
- Fokker-Planck equation from stochastic differential equations
- Agent states ρ(x,t) in ℝⁿ state space
- Drift term μ(x,t) from learning gradients
- Diffusion term D(x,t) from exploration noise
- Boundary conditions: reflecting (state constraints)
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import sparse, sparse.linalg, integrate
from scipy.sparse.linalg import spsolve
from typing import Tuple, Optional, Callable
import warnings

from .deepseek_math import DeepSeekMath, DerivationResult


class FokkerPlanckSolver:
    """
    Numerical solver for Fokker-Planck equation
    ∂ρ/∂t = -∇·(ρμ) + ∇·(D∇ρ)
    """

    def __init__(self,
                 state_dim: int = 1,
                 domain_size: float = 10.0,
                 grid_points: int = 100,
                 dt: float = 0.01):
        """
        Initialize solver

        Args:
            state_dim: Dimension of state space
            domain_size: Size of computational domain [-L, L]
            grid_points: Number of grid points per dimension
            dt: Time step for integration
        """
        self.state_dim = state_dim
        self.L = domain_size
        self.N = grid_points
        self.dt = dt

        # Create grid
        self.dx = 2 * self.L / (self.N - 1)
        self.x = np.linspace(-self.L, self.L, self.N)

        # Multi-dimensional grid
        if state_dim > 1:
            self.X = np.meshgrid(*[self.x for _ in range(state_dim)], indexing='ij')
        else:
            self.X = self.x

        # Initialize probability density
        self.rho = np.zeros((self.N,) * state_dim)

        # For tracking convergence
        self.time = 0.0
        self.history = []

    def initialize_gaussian(self, mean: float = 0.0, std: float = 1.0):
        """Initialize with Gaussian distribution"""
        if self.state_dim == 1:
            self.rho = np.exp(-0.5 * ((self.x - mean) / std)**2)
            self.rho /= np.trapz(self.rho, self.x)  # Normalize
        else:
            # Multi-dimensional Gaussian
            coords = np.stack(self.X, axis=-1)
            r2 = np.sum((coords - mean)**2, axis=-1)
            self.rho = np.exp(-0.5 * r2 / std**2)
            self.rho /= self._integrate_nd(self.rho)

    def _integrate_nd(self, f: np.ndarray) -> float:
        """Integrate n-dimensional function"""
        if self.state_dim == 1:
            return np.trapz(f, self.x)
        else:
            # Recursive integration
            result = f
            for i in range(self.state_dim):
                result = np.trapz(result, self.x, axis=0)
            return result

    def normalize(self):
        """Ensure probability density integrates to 1"""
        total = self._integrate_nd(self.rho)
        if total > 0:
            self.rho /= total

    def drift_term(self, x: np.ndarray, t: float) -> np.ndarray:
        """
        Drift term μ(x,t) - learning gradient

        Models agent learning as drift toward high-value states
        """
        # Example: Ornstein-Uhlenbeck process (mean-reverting)
        # μ(x) = -θx  (drift toward origin)
        theta = 1.0  # Mean reversion rate
        return -theta * x

    def diffusion_term(self, x: np.ndarray, t: float) -> np.ndarray:
        """
        Diffusion term D(x,t) - exploration magnitude

        Models exploration as state-dependent diffusion
        """
        # Example: Constant diffusion
        # D(x) = σ²/2
        sigma = 0.5
        return 0.5 * sigma**2 * np.ones_like(x)

    def step(self, method: str = "crank_nicolson"):
        """
        Time step integration

        Methods:
        - 'forward_euler': Explicit, conditionally stable
        - 'backward_euler': Implicit, unconditionally stable
        - 'crank_nicolson': Second-order, unconditionally stable
        """
        if self.state_dim == 1:
            self._step_1d(method)
        else:
            self._step_nd(method)

        self.normalize()
        self.time += self.dt
        self.history.append(self.rho.copy())

    def _step_1d(self, method: str):
        """1D finite difference scheme"""
        rho = self.rho
        x = self.x
        dx = self.dx
        dt = self.dt

        # Compute drift and diffusion
        mu = self.drift_term(x, self.time)
        D = self.diffusion_term(x, self.time)

        # Build finite difference operators
        if method == "forward_euler":
            # Explicit Euler: ρ_new = ρ + dt * Lρ
            # Lρ = -∂/∂x(ρμ) + ∂/∂x(D∂ρ/∂x)

            # Advection: -∂/∂x(ρμ) ≈ -(ρμ)_forward_diff
            advection = -(np.roll(rho, -1) * np.roll(mu, -1) -
                         rho * mu) / dx

            # Diffusion: ∂/∂x(D∂ρ/∂x) ≈ central difference
            diffusion = (D * (np.roll(rho, -1) - 2*rho + np.roll(rho, 1)) /
                       dx**2)

            # Handle boundaries (reflecting)
            advection[0] = advection[1]
            advection[-1] = advection[-2]
            diffusion[0] = diffusion[1]
            diffusion[-1] = diffusion[-2]

            self.rho = rho + dt * (advection + diffusion)

        elif method in ["backward_euler", "crank_nicolson"]:
            # Implicit schemes: Solve linear system
            # (I - θ*dt*L)ρ_new = (I + (1-θ)*dt*L)ρ

            theta = 0.5 if method == "crank_nicolson" else 1.0

            # Build tridiagonal matrix
            N = self.N
            main_diag = np.ones(N)
            upper_diag = np.zeros(N)
            lower_diag = np.zeros(N)

            for i in range(1, N-1):
                # Coefficients from finite difference
                a = -dt * theta * D[i] / dx**2  # Lower
                b = 1 + 2 * dt * theta * D[i] / dx**2  # Main
                c = -dt * theta * D[i] / dx**2  # Upper

                # Advection contribution
                if mu[i] > 0:
                    b -= dt * theta * mu[i] / dx
                    c += dt * theta * mu[i] / dx
                else:
                    b += dt * theta * mu[i] / dx
                    a -= dt * theta * mu[i] / dx

                lower_diag[i] = a
                main_diag[i] = b
                upper_diag[i] = c

            # Boundary conditions (reflecting: ∂ρ/∂x = 0)
            main_diag[0] = 1 + dt * theta * D[0] / dx**2
            upper_diag[0] = -dt * theta * D[0] / dx**2

            main_diag[-1] = 1 + dt * theta * D[-1] / dx**2
            lower_diag[-1] = -dt * theta * D[-1] / dx**2

            # Build sparse matrix
            A = sparse.diags(
                [lower_diag[1:], main_diag, upper_diag[:-1]],
                offsets=[-1, 0, 1],
                format='csr'
            )

            # Build RHS
            rhs = rho.copy()
            if theta < 1:
                # Add explicit part for Crank-Nicolson
                for i in range(1, N-1):
                    advection = -(rho[i] * mu[i] - rho[i-1] * mu[i-1]) / dx
                    diffusion = D[i] * (rho[i+1] - 2*rho[i] + rho[i-1]) / dx**2
                    rhs[i] += (1 - theta) * dt * (advection + diffusion)

            # Solve
            self.rho = spsolve(A, rhs)

    def _step_nd(self, method: str):
        """N-dimensional operator splitting (ADZ method)"""
        # Split into 1D problems for each dimension
        rho_old = self.rho.copy()

        for dim in range(self.state_dim):
            # Solve 1D problem in this dimension
            # (Simplified: alternating direction implicit)
            pass
            # Full implementation requires tensor grid methods
            # For now, use 1D approximation in each direction

        warnings.warn("N-dimensional solver not fully implemented, using 1D approximation")

    def compute_stationary_distribution(self, tol: float = 1e-10,
                                       max_iter: int = 10000) -> np.ndarray:
        """
        Compute stationary distribution ρ* where ∂ρ/∂t = 0

        Solves: ∇·(ρ*μ) = ∇·(D∇ρ*)

        For 1D with reflecting BC:
        ρ*(x) = (N/D(x)) * exp(∫(μ(x)/D(x))dx)
        """
        if self.state_dim == 1:
            # Analytical solution for constant D, linear μ
            D0 = self.diffusion_term(self.x, 0)[0]

            # ∫(μ/D)dx = ∫(-θx/D)dx = -θx²/(2D)
            theta = 1.0
            exponent = -theta * self.x**2 / (2 * D0)

            rho_star = np.exp(exponent)
            rho_star /= np.trapz(rho_star, self.x)

            return rho_star
        else:
            # Iterative approach: time evolution until convergence
            for i in range(max_iter):
                rho_old = self.rho.copy()
                self.step(method="backward_euler")

                if np.linalg.norm(self.rho - rho_old) < tol:
                    print(f"Converged in {i+1} iterations")
                    return self.rho

            print("Warning: Did not converge to stationary distribution")
            return self.rho

    def compute_statistics(self) -> dict:
        """Compute statistical moments of the distribution"""
        stats = {}

        if self.state_dim == 1:
            stats['mean'] = np.trapz(self.x * self.rho, self.x)
            stats['variance'] = np.trapz((self.x - stats['mean'])**2 * self.rho, self.x)
            stats['std'] = np.sqrt(stats['variance'])
            stats['entropy'] = -np.trapz(self.rho * np.log(self.rho + 1e-10), self.x)

            # Higher moments
            stats['skewness'] = np.trapz(
                ((self.x - stats['mean']) / stats['std'])**3 * self.rho, self.x
            )
            stats['kurtosis'] = np.trapz(
                ((self.x - stats['mean']) / stats['std'])**4 * self.rho, self.x
            ) - 3

        return stats

    def compute_kldivergence(self, rho_target: np.ndarray) -> float:
        """Compute KL divergence D_KL(ρ||ρ_target)"""
        return np.trapz(
            self.rho * np.log((self.rho + 1e-10) / (rho_target + 1e-10)),
            self.x
        )

    def plot_distribution(self, ax=None, show_stats: bool = True):
        """Plot current probability distribution"""
        if ax is None:
            fig, ax = plt.subplots(figsize=(10, 6))

        if self.state_dim == 1:
            ax.plot(self.x, self.rho, 'b-', linewidth=2, label=f't = {self.time:.2f}')
            ax.set_xlabel('State x')
            ax.set_ylabel('Probability Density ρ(x,t)')
            ax.set_title('Fokker-Planck: Agent State Evolution')
            ax.grid(True, alpha=0.3)
            ax.legend()

            if show_stats:
                stats = self.compute_statistics()
                textstr = f"Mean: {stats['mean']:.3f}\n"
                textstr += f"Std: {stats['std']:.3f}\n"
                textstr += f"Entropy: {stats['entropy']:.3f}"
                ax.text(0.02, 0.98, textstr, transform=ax.transAxes,
                       verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

        return ax

    def plot_evolution(self, n_snapshots: int = 5):
        """Plot evolution of distribution over time"""
        if len(self.history) < n_snapshots:
            n_snapshots = len(self.history)

        indices = np.linspace(0, len(self.history)-1, n_snapshots, dtype=int)

        fig, ax = plt.subplots(figsize=(12, 6))

        for i in indices:
            rho_snapshot = self.history[i]
            time_snapshot = i * self.dt
            ax.plot(self.x, rho_snapshot, label=f't = {time_snapshot:.2f}')

        # Plot stationary distribution if computed
        try:
            rho_star = self.compute_stationary_distribution()
            ax.plot(self.x, rho_star, 'k--', linewidth=2, label='Stationary ρ*')
        except:
            pass

        ax.set_xlabel('State x')
        ax.set_ylabel('Probability Density ρ(x,t)')
        ax.set_title('Fokker-Planck: Evolution of Agent State Distribution')
        ax.grid(True, alpha=0.3)
        ax.legend()

        return fig


def derive_fokker_planck_equation(api_key: str) -> DerivationResult:
    """
    Use DeepSeek to derive the Fokker-Planck equation for POLLN
    """
    math_engine = DeepSeekMath(api_key)

    concept = """
    Fokker-Planck equation for probability density evolution of agent states
    in POLLN (Pattern-Organized Large Language Network).

    System description:
    - Agent states x ∈ ℝⁿ exist in continuous state space
    - States evolve according to stochastic dynamics: dx = μ(x,t)dt + σ(x,t)dW
    - μ(x,t) is drift from learning (gradient ascent on value function)
    - σ(x,t) is diffusion from exploration (stochastic policy)
    - ρ(x,t) is probability density of agent states
    - Boundary conditions: reflecting at state space limits

    Derive:
    1. Starting from continuity equation: ∂ρ/∂t + ∇·J = 0
    2. Probability current: J = μρ - D∇ρ (drift - diffusion)
    3. Resulting Fokker-Planck equation
    4. Stationary solution condition
    5. Connection to agent learning dynamics
    """

    result = math_engine.derive_pde(concept)
    return result


def run_simulation(api_key: Optional[str] = None,
                   n_steps: int = 1000,
                   plot_results: bool = True):
    """
    Run complete Fokker-Planck simulation

    Args:
        api_key: DeepSeek API key for derivation
        n_steps: Number of time steps
        plot_results: Whether to plot results
    """
    print("="*70)
    print("FOKKER-PLANCK SIMULATION: Agent State Evolution")
    print("="*70)

    # Derive equation if API key provided
    if api_key:
        print("\n1. Deriving Fokker-Planck equation using DeepSeek...")
        derivation = derive_fokker_planck_equation(api_key)
        print(f"   Final equation: {derivation.final_equation}")
        print(f"   API calls used: {derivation.api_calls_used}")

    # Create solver
    print("\n2. Initializing numerical solver...")
    solver = FokkerPlanckSolver(
        state_dim=1,
        domain_size=5.0,
        grid_points=200,
        dt=0.01
    )

    # Initialize with Gaussian
    solver.initialize_gaussian(mean=0.0, std=0.5)

    print(f"   Grid: {solver.N} points")
    print(f"   Domain: [{-solver.L}, {solver.L}]")
    print(f"   Time step: {solver.dt}")

    # Time evolution
    print(f"\n3. Evolving for {n_steps} time steps...")
    for i in range(n_steps):
        solver.step(method="crank_nicolson")

        if (i+1) % 100 == 0:
            stats = solver.compute_statistics()
            print(f"   Step {i+1}/{n_steps}: mean={stats['mean']:.3f}, std={stats['std']:.3f}")

    # Compute stationary distribution
    print("\n4. Computing stationary distribution...")
    rho_star = solver.compute_stationary_distribution()

    # Final statistics
    print("\n5. Final Statistics:")
    stats = solver.compute_statistics()
    for key, value in stats.items():
        print(f"   {key}: {value:.6f}")

    # Plot results
    if plot_results:
        print("\n6. Generating plots...")
        fig = solver.plot_evolution(n_snapshots=10)
        plt.tight_layout()
        plt.savefig('simulations/math/diffequations/fokker_planck_evolution.png', dpi=150)
        print("   Saved: fokker_planck_evolution.png")

        plt.show()

    return solver


if __name__ == "__main__":
    # Run simulation
    api_key = "YOUR_API_KEY"
    solver = run_simulation(api_key=api_key, n_steps=500, plot_results=True)
