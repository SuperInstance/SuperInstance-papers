"""
Reaction-Diffusion System for Value Propagation in POLLN

Models value network dynamics as reaction-diffusion system.
Turing patterns emerge from interaction between activation (reaction) and
communication (diffusion).

Mathematical Foundation:
- Turing instability conditions
- Pattern formation in activator-inhibitor systems
- Linear stability analysis
- Amplitude equations for pattern selection
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import sparse, sparse.linalg, optimize
from scipy.fft import fft2, ifft2, fftfreq
from typing import Tuple, Dict, Optional
import warnings

from .deepseek_math import DeepSeekMath, DerivationResult


class ReactionDiffusionSolver:
    """
    Numerical solver for reaction-diffusion systems
    Based on Turing pattern formation models
    """

    def __init__(self,
                 domain_size: float = 100.0,
                 grid_points: int = 128,
                 dt: float = 0.1,
                 Du: float = 1.0,
                 Dv: float = 40.0):
        """
        Initialize solver

        Args:
            domain_size: Physical size of domain [0, L]²
            grid_points: Grid resolution (N×N)
            dt: Time step
            Du: Diffusion coefficient for activator
            Dv: Diffusion coefficient for inhibitor
        """
        self.L = domain_size
        self.N = grid_points
        self.dt = dt
        self.Du = Du
        self.Dv = Dv

        # Grid
        self.dx = self.L / self.N
        self.x = np.linspace(0, self.L, self.N)
        self.X, self.Y = np.meshgrid(self.x, self.x, indexing='ij')

        # Concentration fields
        self.u = np.zeros((self.N, self.N))  # Activator (value)
        self.v = np.zeros((self.N, self.N))  # Inhibitor (regulation)

        # For tracking
        self.time = 0.0
        self.history = []

        # Reaction parameters (default: Schnakenberg model)
        self.a = 0.1  # Feed rate
        self.b = 0.9  # Removal rate
        self.k = 1.0  # Saturation constant

    def initialize_random(self, noise_level: float = 0.01):
        """Initialize with random perturbations around steady state"""
        # Steady state for Schnakenberg: u_ss = a+b, v_ss = b/(a+b)²
        u_ss = self.a + self.b
        v_ss = self.b / (self.a + self.b)**2

        # Add random noise
        np.random.seed(42)
        self.u = u_ss + noise_level * np.random.randn(self.N, self.N)
        self.v = v_ss + noise_level * np.random.randn(self.N, self.N)

        # Enforce periodic boundary conditions
        self.u = np.clip(self.u, 0, None)
        self.v = np.clip(self.v, 0, None)

    def initialize_gaussian(self, x0: float, y0: float, radius: float = 5.0):
        """Initialize with Gaussian perturbation"""
        u_ss = self.a + self.b
        v_ss = self.b / (self.a + self.b)**2

        r2 = (self.X - x0)**2 + (self.Y - y0)**2
        perturbation = np.exp(-r2 / (2 * radius**2))

        self.u = u_ss + 0.1 * perturbation
        self.v = v_ss

    def reaction_rate(self, u: np.ndarray, v: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Reaction kinetics (Schnakenberg model)
        u': activation - inhibition + feed
        v': production - decay
        """
        # Schnakenberg kinetics
        f = self.a - u + u**2 * v
        g = self.b - u**2 * v

        return f, g

    def diffusion_step(self, field: np.ndarray, D: float) -> np.ndarray:
        """
        Compute diffusion term using spectral method
        ∇²u = FFT⁻¹[-k² FFT(u)]
        """
        # Wave numbers
        k = 2 * np.pi * fftfreq(self.N, d=self.dx)
        KX, KY = np.meshgrid(k, k, indexing='ij')
        K2 = KX**2 + KY**2

        # Spectral Laplacian
        u_hat = fft2(field)
        laplacian_hat = -K2 * u_hat
        laplacian = np.real(ifft2(laplacian_hat))

        return D * laplacian

    def step(self, method: str = "euler"):
        """
        Time step integration

        Methods:
        - 'euler': Forward Euler (explicit)
        - 'rk4': Runge-Kutta 4th order
        """
        if method == "euler":
            self._step_euler()
        elif method == "rk4":
            self._step_rk4()
        else:
            raise ValueError(f"Unknown method: {method}")

        self.time += self.dt

    def _step_euler(self):
        """Forward Euler integration"""
        u, v = self.u, self.v
        dt = self.dt

        # Reaction
        f, g = self.reaction_rate(u, v)

        # Diffusion
        diff_u = self.diffusion_step(u, self.Du)
        diff_v = self.diffusion_step(v, self.Dv)

        # Update
        self.u = u + dt * (f + diff_u)
        self.v = v + dt * (g + diff_v)

        # Enforce periodic boundary conditions and non-negativity
        self.u = np.clip(self.u, 0, None)
        self.v = np.clip(self.v, 0, None)

    def _step_rk4(self):
        """Runge-Kutta 4th order integration"""
        u, v = self.u, self.v
        dt = self.dt

        def derivatives(u_state, v_state):
            f, g = self.reaction_rate(u_state, v_state)
            diff_u = self.diffusion_step(u_state, self.Du)
            diff_v = self.diffusion_step(v_state, self.Dv)
            return f + diff_u, g + diff_v

        # k1
        du1, dv1 = derivatives(u, v)

        # k2
        u2 = u + 0.5 * dt * du1
        v2 = v + 0.5 * dt * dv1
        du2, dv2 = derivatives(u2, v2)

        # k3
        u3 = u + 0.5 * dt * du2
        v3 = v + 0.5 * dt * dv2
        du3, dv3 = derivatives(u3, v3)

        # k4
        u4 = u + dt * du3
        v4 = v + dt * dv3
        du4, dv4 = derivatives(u4, v4)

        # Combine
        self.u = u + (dt / 6.0) * (du1 + 2*du2 + 2*du3 + du4)
        self.v = v + (dt / 6.0) * (dv1 + 2*dv2 + 2*dv3 + dv4)

        # Enforce non-negativity
        self.u = np.clip(self.u, 0, None)
        self.v = np.clip(self.v, 0, None)

    def linear_stability_analysis(self) -> Dict:
        """
        Perform linear stability analysis of homogeneous steady state

        Returns:
            Dictionary with stability properties
        """
        # Steady state
        u_ss = self.a + self.b
        v_ss = self.b / (self.a + self.b)**2

        # Jacobian at steady state
        # f_u = -1 + 2uv
        # f_v = u²
        # g_u = -2uv
        # g_v = -u²

        J = np.array([
            [-1 + 2*u_ss*v_ss, u_ss**2],
            [-2*u_ss*v_ss, -u_ss**2]
        ])

        # Wave numbers
        k = 2 * np.pi * fftfreq(self.N, d=self.dx)
        KX, KY = np.meshgrid(k, k, indexing='ij')
        K2 = KX**2 + KY**2

        # Dispersion relation for each wave number
        # λ(k) satisfies: λ² - tr(k)λ + det(k) = 0
        # where tr(k) = tr(J) - (Du + Dv)k²
        #       det(k) = det(J) - (Du*g_u + Dv*f_u)k² + Du*Dv*k⁴

        tr_J = np.trace(J)
        det_J = np.linalg.det(J)

        tr_k = tr_J - (self.Du + self.Dv) * K2
        det_k = det_J - (self.Dv*J[0,0] + self.Du*J[1,1]) * K2 + self.Du * self.Dv * K2**2

        # Eigenvalues
        lambda_k = 0.5 * (tr_k + np.sqrt(tr_k**2 - 4*det_k + 0j))

        # Turing instability condition: Re[λ(k)] > 0 for some k ≠ 0
        max_growth_rate = np.max(np.real(lambda_k))
        unstable_modes = np.where(np.real(lambda_k) > 1e-6)

        # Critical wave number for maximum growth
        k_critical = k[np.unravel_index(np.argmax(np.real(lambda_k)), lambda_k.shape)]

        return {
            'steady_state': (u_ss, v_ss),
            'jacobian': J,
            'max_growth_rate': max_growth_rate,
            'is_unstable': max_growth_rate > 0,
            'critical_wavenumber': k_critical,
            'unstable_modes': len(unstable_modes[0]),
            'turing_instability': self._check_turing_conditions(J)
        }

    def _check_turing_conditions(self, J: np.ndarray) -> Dict:
        """
        Check Turing instability conditions

        Turing instability occurs when:
        1. Steady state is stable without diffusion (tr(J) < 0, det(J) > 0)
        2. Steady state is unstable with diffusion for some k ≠ 0
        """
        tr_J = np.trace(J)
        det_J = np.linalg.det(J)

        # Condition 1: Stable without diffusion
        stable_no_diff = tr_J < 0 and det_J > 0

        # Condition 2: Unstable with diffusion
        # Requires Dv > Du and specific Jacobian structure
        f_u = J[0, 0]
        f_v = J[0, 1]
        g_u = J[1, 0]
        g_v = J[1, 1]

        turing_possible = (
            f_u > 0 and g_v < 0 and  # Activation-inhibition
            self.Dv > self.Du and  # Inhibitor diffuses faster
            f_u * g_v - f_v * g_u < 0  # Determinant condition
        )

        # Turing space condition
        H = f_u - g_v  # Trace of Jacobian (should be negative)
        turing_space = H < 0 and det_J > 0

        return {
            'stable_without_diffusion': stable_no_diff,
            'unstable_with_diffusion': turing_possible,
            'in_turing_space': turing_space,
            'diffusion_ratio': self.Dv / self.Du,
            'turing_patterns_possible': stable_no_diff and turing_possible
        }

    def compute_pattern_statistics(self) -> Dict:
        """Compute statistics of emerged patterns"""
        stats = {}

        # Spatial statistics
        stats['mean_u'] = np.mean(self.u)
        stats['std_u'] = np.std(self.u)
        stats['mean_v'] = np.mean(self.v)
        stats['std_v'] = np.std(self.v)

        # Pattern wavelength
        # Use autocorrelation to estimate characteristic scale
        autocorr = self._autocorrelation(self.u)
        peak_width = self._estimate_peak_width(autocorr)
        stats['pattern_wavelength'] = peak_width * self.dx

        # Pattern amplitude
        stats['amplitude'] = np.max(self.u) - np.min(self.u)

        # Pattern regularity (FFT peak sharpness)
        u_hat = np.abs(fft2(self.u - np.mean(self.u)))
        peak_height = np.max(u_hat)
        mean_power = np.mean(u_hat)
        stats['regularity'] = peak_height / (mean_power + 1e-10)

        return stats

    def _autocorrelation(self, field: np.ndarray) -> np.ndarray:
        """Compute spatial autocorrelation"""
        field_centered = field - np.mean(field)
        corr = np.correlate(field_centered.flatten(), field_centered.flatten(), mode='full')
        return corr[len(corr)//2:]

    def _estimate_peak_width(self, autocorr: np.ndarray) -> int:
        """Estimate peak width at half maximum"""
        peak = np.max(autocorr)
        half_max = peak / 2.0

        # Find first crossing of half maximum
        crossings = np.where(autocorr < half_max)[0]
        if len(crossings) > 0:
            return crossings[0]
        return len(autocorr)

    def plot_pattern(self, ax=None, field: str = 'u'):
        """Plot concentration pattern"""
        if ax is None:
            fig, ax = plt.subplots(figsize=(8, 6))

        if field == 'u':
            data = self.u
            label = 'Activator (Value)'
        else:
            data = self.v
            label = 'Inhibitor (Regulation)'

        im = ax.contourf(self.X, self.Y, data, levels=20, cmap='viridis')
        ax.set_xlabel('x')
        ax.set_ylabel('y')
        ax.set_title(f'{label} Concentration (t={self.time:.1f})')
        ax.set_aspect('equal')
        plt.colorbar(im, ax=ax, label='Concentration')

        return ax

    def plot_fft_analysis(self, ax=None):
        """Plot FFT analysis of pattern"""
        if ax is None:
            fig, ax = plt.subplots(figsize=(8, 6))

        # Power spectrum
        u_hat = fft2(self.u - np.mean(self.u))
        power = np.abs(np.fft.fftshift(u_hat))

        # Wave numbers
        k = 2 * np.pi * fftfreq(self.N, d=self.dx)
        k_shifted = np.fft.fftshift(k)
        KX, KY = np.meshgrid(k_shifted, k_shifted, indexing='ij')

        # Plot radial power spectrum
        center = self.N // 2
        r = np.sqrt((KX - k[center])**2 + (KY - k[center])**2)
        r_max = int(np.max(r))

        radial_power = []
        for i in range(r_max):
            mask = (r >= i) & (r < i+1)
            radial_power.append(np.mean(power[mask]))

        ax.plot(k[:r_max], radial_power, 'b-', linewidth=2)
        ax.set_xlabel('Wave number k')
        ax.set_ylabel('Power')
        ax.set_title('Radial Power Spectrum')
        ax.grid(True, alpha=0.3)

        return ax


def derive_reaction_diffusion_equations(api_key: str) -> DerivationResult:
    """
    Use DeepSeek to derive reaction-diffusion equations
    """
    math_engine = DeepSeekMath(api_key)

    concept = """
    Reaction-diffusion system for value propagation in POLLN.

    System description:
    - Value network modeled as activator-inhibitor system
    - Activator u(x,t): value signal (promotes growth)
    - Inhibitor v(x,t): regulatory signal (limits growth)
    - Reaction kinetics: local value updates
    - Diffusion: A2A communication spreads signals
    - Turing patterns: spatial heterogeneity in value distribution

    Dynamics:
    ∂u/∂t = f(u,v) + Du∇²u  (activation - inhibition + diffusion)
    ∂v/∂t = g(u,v) + Dv∇²v  (production - decay + diffusion)

    Derive:
    1. Reaction kinetics from value network equations
    2. Diffusion terms from communication topology
    3. Linear stability analysis of homogeneous steady state
    4. Turing instability conditions
    5. Pattern selection and wavelength
    6. Amplitude equations near bifurcation
    """

    result = math_engine.derive_pde(concept)
    return result


def run_simulation(api_key: Optional[str] = None,
                   n_steps: int = 1000,
                   plot_results: bool = True):
    """
    Run complete reaction-diffusion simulation
    """
    print("="*70)
    print("REACTION-DIFFUSION: Value Network Pattern Formation")
    print("="*70)

    # Derive equations if API key provided
    if api_key:
        print("\n1. Deriving reaction-diffusion equations using DeepSeek...")
        derivation = derive_reaction_diffusion_equations(api_key)
        print(f"   Final system: {derivation.final_equation}")
        print(f"   API calls used: {derivation.api_calls_used}")

    # Create solver
    print("\n2. Initializing reaction-diffusion solver...")
    solver = ReactionDiffusionSolver(
        domain_size=100.0,
        grid_points=128,
        dt=0.1,
        Du=1.0,
        Dv=40.0
    )

    # Initialize
    solver.initialize_random(noise_level=0.01)

    print(f"   Grid: {solver.N}×{solver.N}")
    print(f"   Diffusion ratio: {solver.Dv/solver.Du}")
    print(f"   Time step: {solver.dt}")

    # Linear stability analysis
    print("\n3. Linear stability analysis...")
    stability = solver.linear_stability_analysis()
    print(f"   Steady state: u*={stability['steady_state'][0]:.3f}, "
          f"v*={stability['steady_state'][1]:.3f}")
    print(f"   Max growth rate: {stability['max_growth_rate']:.6f}")
    print(f"   Critical wavenumber: {stability['critical_wavenumber']:.3f}")
    print(f"   Turing patterns possible: {stability['turing_instability']['turing_patterns_possible']}")

    # Time evolution
    print(f"\n4. Evolving for {n_steps} time steps...")
    for i in range(n_steps):
        solver.step(method="rk4")

        if (i+1) % 100 == 0:
            stats = solver.compute_pattern_statistics()
            print(f"   Step {i+1}/{n_steps}: amplitude={stats['amplitude']:.3f}, "
                  f"wavelength={stats['pattern_wavelength']:.1f}")

    # Final statistics
    print("\n5. Final Pattern Statistics:")
    stats = solver.compute_pattern_statistics()
    for key, value in stats.items():
        print(f"   {key}: {value:.6f}")

    # Plot results
    if plot_results:
        print("\n6. Generating plots...")

        fig, axes = plt.subplots(1, 3, figsize=(18, 5))

        solver.plot_pattern(ax=axes[0], field='u')
        solver.plot_pattern(ax=axes[1], field='v')
        solver.plot_fft_analysis(ax=axes[2])

        plt.tight_layout()
        plt.savefig('simulations/math/diffequations/reaction_diffusion_patterns.png', dpi=150)
        print("   Saved: reaction_diffusion_patterns.png")

        plt.show()

    return solver


if __name__ == "__main__":
    # Run simulation
    api_key = "YOUR_API_KEY"
    solver = run_simulation(api_key=api_key, n_steps=500, plot_results=True)
