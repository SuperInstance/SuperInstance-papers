"""
Stochastic Differential Equations for Agent Dynamics in POLLN

Models agent behavior with SDEs incorporating noise and uncertainty.
Uses Itô and Stratonovich calculus for rigorous mathematical treatment.

Mathematical Foundation:
- Itô calculus for non-anticipative processes
- Stratonovich calculus for physical systems
- Fokker-Planck approximation
- Exit time problems
- Stochastic stability
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import integrate, optimize, stats
from typing import Tuple, Optional, Callable
import warnings

from .deepseek_math import DeepSeekMath, DerivationResult


class SDEIntegrator:
    """
    Numerical integrator for Stochastic Differential Equations
    Supports Itô and Stratonovich interpretations
    """

    def __init__(self,
                 dim: int = 1,
                 dt: float = 0.01):
        """
        Initialize SDE integrator

        Args:
            dim: Dimension of state space
            dt: Time step
        """
        self.dim = dim
        self.dt = dt
        self.time = 0.0
        self.history = []

    def drift(self, x: np.ndarray, t: float) -> np.ndarray:
        """
        Drift term μ(x,t) - deterministic part

        Example: Ornstein-Uhlenbeck process
        μ(x) = -θx (mean-reverting)
        """
        theta = 1.0
        return -theta * x

    def diffusion(self, x: np.ndarray, t: float) -> np.ndarray:
        """
        Diffusion term σ(x,t) - stochastic part

        Example: Constant diffusion
        σ(x) = σ₀
        """
        sigma = 0.5
        return sigma * np.ones_like(x)

    def euler_maruyama(self, x0: np.ndarray, T: float,
                      interpretation: str = "ito") -> Tuple[np.ndarray, np.ndarray]:
        """
        Euler-Maruyama integration (strong order 0.5)

        SDE: dx = μ(x,t)dt + σ(x,t)dW

        Itô: dx = μdt + σdW
        Stratonovich: dx = (μ - 0.5σ∂σ/∂x)dt + σ∘dW

        Args:
            x0: Initial state
            T: Total time
            interpretation: 'ito' or 'stratonovich'

        Returns:
            states: State trajectory
            time: Time points
        """
        Nt = int(T / self.dt)
        states = np.zeros((Nt + 1, self.dim))
        time = np.zeros(Nt + 1)

        x = x0.copy()
        states[0] = x
        time[0] = 0.0

        for n in range(Nt):
            t = n * self.dt

            # Wiener increment
            dW = np.random.randn(self.dim) * np.sqrt(self.dt)

            # Drift and diffusion
            mu = self.drift(x, t)
            sigma = self.diffusion(x, t)

            if interpretation == "ito":
                # Itô: dx = μdt + σdW
                dx = mu * self.dt + sigma * dW

            elif interpretation == "stratonovich":
                # Stratonovich: dx = (μ - 0.5σ∂σ/∂x)dt + σ∘dW
                # Need ∂σ/∂x (Jacobian)
                eps = 1e-6
                dsigma_dx = np.zeros_like(sigma)

                for i in range(self.dim):
                    x_plus = x.copy()
                    x_plus[i] += eps
                    sigma_plus = self.diffusion(x_plus, t)
                    dsigma_dx[i] = (sigma_plus[i] - sigma[i]) / eps

                dx = (mu - 0.5 * sigma * dsigma_dx) * self.dt + sigma * dW

            else:
                raise ValueError(f"Unknown interpretation: {interpretation}")

            x = x + dx
            states[n + 1] = x
            time[n + 1] = (n + 1) * self.dt

        self.time = T
        return states, time

    def milstein(self, x0: np.ndarray, T: float,
                interpretation: str = "ito") -> Tuple[np.ndarray, np.ndarray]:
        """
        Milstein scheme (strong order 1.0)

        Includes diffusion derivative term for better accuracy
        """
        Nt = int(T / self.dt)
        states = np.zeros((Nt + 1, self.dim))
        time = np.zeros(Nt + 1)

        x = x0.copy()
        states[0] = x
        time[0] = 0.0

        for n in range(Nt):
            t = n * self.dt

            # Wiener increment
            dW = np.random.randn(self.dim) * np.sqrt(self.dt)

            # Drift and diffusion
            mu = self.drift(x, t)
            sigma = self.diffusion(x, t)

            # Diffusion derivative
            eps = 1e-6
            dsigma_dx = np.zeros_like(sigma)

            for i in range(self.dim):
                x_plus = x.copy()
                x_plus[i] += eps
                sigma_plus = self.diffusion(x_plus, t)
                dsigma_dx[i] = (sigma_plus[i] - sigma[i]) / eps

            if interpretation == "ito":
                # Milstein: dx = μdt + σdW + 0.5σ∂σ/∂x(dW² - dt)
                dx = (mu * self.dt +
                      sigma * dW +
                      0.5 * sigma * dsigma_dx * (dW**2 - self.dt))

            elif interpretation == "stratonovich":
                # Stratonovich Milstein
                dx = ((mu - 0.5 * sigma * dsigma_dx) * self.dt +
                      sigma * dW +
                      0.5 * sigma * dsigma_dx * dW**2)

            x = x + dx
            states[n + 1] = x
            time[n + 1] = (n + 1) * self.dt

        self.time = T
        return states, time

    def run_ensemble(self, x0: np.ndarray, T: float,
                    n_trajectories: int = 1000,
                    method: str = "euler_maruyama",
                    interpretation: str = "ito") -> Tuple[np.ndarray, np.ndarray]:
        """
        Run ensemble of trajectories for statistical analysis

        Returns:
            all_states: All trajectories (Nt+1, n_trajectories, dim)
            time: Time points
        """
        if method == "euler_maruyama":
            integrator = self.euler_maruyama
        elif method == "milstein":
            integrator = self.milstein
        else:
            raise ValueError(f"Unknown method: {method}")

        # Run first trajectory to get dimensions
        states, time = integrator(x0, T, interpretation)
        Nt = len(time)

        all_states = np.zeros((Nt, n_trajectories, self.dim))
        all_states[:, 0, :] = states

        # Run remaining trajectories
        for i in range(1, n_trajectories):
            states, _ = integrator(x0, T, interpretation)
            all_states[:, i, :] = states

            if (i + 1) % 100 == 0:
                print(f"  Completed {i+1}/{n_trajectories} trajectories")

        return all_states, time


class ExitTimeSolver:
    """
    Solve exit time problems for SDEs
    First passage time analysis
    """

    def __init__(self, lower_bound: float, upper_bound: float):
        """
        Initialize exit time solver

        Args:
            lower_bound: Lower boundary
            upper_bound: Upper boundary
        """
        self.a = lower_bound
        self.b = upper_bound

    def drift(self, x: float) -> float:
        """Drift term"""
        theta = 1.0
        return -theta * x

    def diffusion(self, x: float) -> float:
        """Diffusion term"""
        sigma = 0.5
        return sigma

    def simulate_exit_time(self, x0: float, dt: float = 0.001,
                          max_time: float = 100.0) -> Tuple[float, str]:
        """
        Simulate single exit time trajectory

        Returns:
            exit_time: Time to exit
            exit_boundary: Which boundary was hit
        """
        x = x0
        t = 0.0

        while t < max_time:
            # Euler-Maruyama step
            dW = np.random.randn() * np.sqrt(dt)
            mu = self.drift(x)
            sigma = self.diffusion(x)

            x = x + mu * dt + sigma * dW
            t += dt

            # Check boundaries
            if x <= self.a:
                return t, 'lower'
            elif x >= self.b:
                return t, 'upper'

        return max_time, 'none'

    def estimate_exit_time_distribution(self, x0: float,
                                       n_simulations: int = 10000) -> dict:
        """
        Estimate exit time distribution through Monte Carlo

        Returns:
            Distribution statistics
        """
        exit_times = []
        exit_boundaries = []

        for _ in range(n_simulations):
            t, boundary = self.simulate_exit_time(x0)
            exit_times.append(t)
            exit_boundaries.append(boundary)

        exit_times = np.array(exit_times)

        return {
            'mean': np.mean(exit_times),
            'std': np.std(exit_times),
            'median': np.median(exit_times),
            'lower_exit_prob': exit_boundaries.count('lower') / n_simulations,
            'upper_exit_prob': exit_boundaries.count('upper') / n_simulations,
            'all_times': exit_times
        }

    def solve_backward_kolmogorov(self, x_grid: np.ndarray,
                                  dt: float = 0.01) -> Tuple[np.ndarray, np.ndarray]:
        """
        Solve backward Kolmogorov equation for mean exit time

        Lτ(x) = -1, where L is generator
        τ(a) = τ(b) = 0 (boundary conditions)

        For 1D: μ(x)τ'(x) + 0.5σ²(x)τ''(x) = -1
        """
        dx = x_grid[1] - x_grid[0]
        N = len(x_grid)

        # Build finite difference matrix
        A = np.zeros((N, N))
        rhs = -np.ones(N)

        for i in range(1, N-1):
            x = x_grid[i]
            mu = self.drift(x)
            sigma = self.diffusion(x)

            # Central differences
            # μ(x)τ'(x) ≈ μ(x)(τ_{i+1} - τ_{i-1})/(2Δx)
            # σ²(x)τ''(x) ≈ σ²(x)(τ_{i+1} - 2τ_i + τ_{i-1})/Δx²

            A[i, i-1] = -mu / (2*dx) + sigma**2 / dx**2
            A[i, i] = -2 * sigma**2 / dx**2
            A[i, i+1] = mu / (2*dx) + sigma**2 / dx**2

        # Boundary conditions
        A[0, 0] = 1.0
        A[-1, -1] = 1.0
        rhs[0] = 0.0
        rhs[-1] = 0.0

        # Solve
        tau = np.linalg.solve(A, rhs)

        return tau, x_grid


class FokkerPlanckSolver:
    """
    Solve Fokker-Planck equation from SDE

    ∂ρ/∂t = -∂/∂x(μρ) + 0.5∂²/∂x²(σ²ρ)
    """

    def __init__(self, x_min: float, x_max: float, nx: int = 100):
        """
        Initialize FP solver

        Args:
            x_min: Domain lower bound
            x_max: Domain upper bound
            nx: Number of grid points
        """
        self.x_min = x_min
        self.x_max = x_max
        self.nx = nx
        self.dx = (x_max - x_min) / (nx - 1)
        self.x = np.linspace(x_min, x_max, nx)
        self.rho = np.zeros(nx)

    def drift(self, x: float) -> float:
        """Drift term"""
        theta = 1.0
        return -theta * x

    def diffusion(self, x: float) -> float:
        """Diffusion term"""
        sigma = 0.5
        return sigma

    def initialize_gaussian(self, mean: float = 0.0, std: float = 0.5):
        """Initialize with Gaussian"""
        self.rho = np.exp(-0.5 * ((self.x - mean) / std)**2)
        self.rho /= np.trapz(self.rho, self.x)

    def step(self, dt: float):
        """
        Time step using Crank-Nicolson
        """
        rho = self.rho
        x = self.x
        dx = self.dx

        # Compute drift and diffusion
        mu = np.array([self.drift(xi) for xi in x])
        sigma = np.array([self.diffusion(xi) for xi in x])
        D = 0.5 * sigma**2

        # Build tridiagonal matrix
        N = self.nx
        main_diag = np.ones(N)
        upper_diag = np.zeros(N)
        lower_diag = np.zeros(N)

        alpha = dt / (2 * dx**2)

        for i in range(1, N-1):
            # Flux: J = μρ - D∂ρ/∂x
            # ∂ρ/∂t = -∂J/∂x

            a = alpha * D[i] - dt * mu[i] / (4 * dx)  # Lower
            b = 1 - 2 * alpha * D[i]  # Main
            c = alpha * D[i] + dt * mu[i] / (4 * dx)  # Upper

            lower_diag[i] = -a
            main_diag[i] = b
            upper_diag[i] = -c

        # Boundary conditions (reflecting)
        main_diag[0] = 1 + 2 * alpha * D[0]
        upper_diag[0] = -2 * alpha * D[0]
        main_diag[-1] = 1 + 2 * alpha * D[-1]
        lower_diag[-1] = -2 * alpha * D[-1]

        # Build sparse matrix
        from scipy import sparse
        A = sparse.diags(
            [lower_diag[1:], main_diag, upper_diag[:-1]],
            offsets=[-1, 0, 1],
            format='csr'
        )

        # RHS
        rhs = rho.copy()

        # Solve
        self.rho = sparse.linalg.spsolve(A, rhs)
        self.rho = np.clip(self.rho, 0, None)

        # Normalize
        self.rho /= np.trapz(self.rho, self.x)


def derive_sde_formulations(api_key: str) -> DerivationResult:
    """
    Use DeepSeek to derive SDE formulations for POLLN
    """
    math_engine = DeepSeekMath(api_key)

    concept = """
    Stochastic Differential Equations for agent dynamics in POLLN.

    System description:
    - Agent behavior has inherent stochasticity
    - Exploration modeled as Wiener process
    - Learning creates drift toward high-value states
    - Noise magnitude represents exploration rate

    SDE formulation:
    dX_t = μ(X_t,t)dt + σ(X_t,t)dW_t

    Where:
    - X_t: Agent state at time t
    - μ: Drift coefficient (learning gradient)
    - σ: Diffusion coefficient (exploration)
    - W_t: Wiener process (Brownian motion)

    Derive:
    1. SDE formulation from agent MDP
    2. Itô vs Stratonovich interpretations
    3. Fokker-Planck equation derivation
    4. Numerical integration schemes
    5. Exit time problems
    6. Stochastic stability analysis
    """

    result = math_engine.derive_pde(concept)
    return result


def run_simulation(api_key: Optional[str] = None,
                   plot_results: bool = True):
    """
    Run complete SDE simulation
    """
    print("="*70)
    print("SDE: Stochastic Agent Dynamics")
    print("="*70)

    # Derive equations if API key provided
    if api_key:
        print("\n1. Deriving SDE formulations using DeepSeek...")
        derivation = derive_sde_formulations(api_key)
        print(f"   Final equation: {derivation.final_equation}")
        print(f"   API calls used: {derivation.api_calls_used}")

    # Create integrator
    print("\n2. Initializing SDE integrator...")
    integrator = SDEIntegrator(dim=1, dt=0.01)

    # Single trajectory
    print("\n3. Simulating single trajectory...")
    x0 = np.array([1.0])
    states, time = integrator.euler_maruyama(x0, T=10.0, interpretation="ito")

    # Ensemble simulation
    print("\n4. Running ensemble simulation...")
    all_states, time = integrator.run_ensemble(
        x0, T=10.0, n_trajectories=1000,
        method="euler_maruyama", interpretation="ito"
    )

    # Compute statistics
    mean = np.mean(all_states, axis=1)
    std = np.std(all_states, axis=1)

    print(f"   Final mean: {mean[-1]:.3f}")
    print(f"   Final std: {std[-1]:.3f}")

    # Exit time analysis
    print("\n5. Exit time analysis...")
    exit_solver = ExitTimeSolver(lower_bound=-3.0, upper_bound=3.0)
    exit_stats = exit_solver.estimate_exit_time_distribution(x0=0.0, n_simulations=1000)

    print(f"   Mean exit time: {exit_stats['mean']:.3f}")
    print(f"   Lower exit prob: {exit_stats['lower_exit_prob']:.3f}")
    print(f"   Upper exit prob: {exit_stats['upper_exit_prob']:.3f}")

    # Fokker-Planck solution
    print("\n6. Solving Fokker-Planck equation...")
    fp_solver = FokkerPlanckSolver(x_min=-5.0, x_max=5.0, nx=100)
    fp_solver.initialize_gaussian(mean=1.0, std=0.5)

    for _ in range(1000):
        fp_solver.step(dt=0.01)

    # Plot results
    if plot_results:
        print("\n7. Generating plots...")

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        # Single trajectory
        axes[0, 0].plot(time, states, 'b-', linewidth=1)
        axes[0, 0].set_xlabel('Time')
        axes[0, 0].set_ylabel('State X(t)')
        axes[0, 0].set_title('Single SDE Trajectory (Euler-Maruyama)')
        axes[0, 0].grid(True, alpha=0.3)

        # Ensemble
        axes[0, 1].plot(time, mean, 'r-', linewidth=2, label='Mean')
        axes[0, 1].fill_between(time, mean - std, mean + std,
                                alpha=0.3, label='±1 Std')
        axes[0, 1].set_xlabel('Time')
        axes[0, 1].set_ylabel('State X(t)')
        axes[0, 1].set_title('Ensemble Simulation (1000 trajectories)')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)

        # Exit time distribution
        axes[1, 0].hist(exit_stats['all_times'], bins=50, density=True, alpha=0.7)
        axes[1, 0].axvline(exit_stats['mean'], color='r',
                          linestyle='--', label=f'Mean: {exit_stats["mean"]:.2f}')
        axes[1, 0].set_xlabel('Exit Time')
        axes[1, 0].set_ylabel('Probability Density')
        axes[1, 0].set_title('Exit Time Distribution')
        axes[1, 0].legend()
        axes[1, 0].grid(True, alpha=0.3)

        # Fokker-Planck solution
        axes[1, 1].plot(fp_solver.x, fp_solver.rho, 'b-', linewidth=2)
        axes[1, 1].set_xlabel('State x')
        axes[1, 1].set_ylabel('Probability Density ρ(x)')
        axes[1, 1].set_title('Fokker-Planck Solution')
        axes[1, 1].grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig('simulations/math/diffequations/stochastic_dynamics.png', dpi=150)
        print("   Saved: stochastic_dynamics.png")

        plt.show()

    return integrator


if __name__ == "__main__":
    # Run simulation
    api_key = "YOUR_API_KEY"
    integrator = run_simulation(api_key=api_key, plot_results=True)
