"""
Chaos Theory Simulation Tests
==============================

Comprehensive test suite for chaos analysis modules.
"""

import numpy as np
import pytest
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from lyapunov import LyapunovComputer, logistic_map_r
from bifurcation import BifurcationAnalyzer, logistic_map as bif_logistic

# Clear any cached 'attractors' module from other directories
if 'attractors' in sys.modules:
    _cached = sys.modules['attractors']
    if not hasattr(_cached, 'AttractorAnalyzer'):
        del sys.modules['attractors']

from attractors import AttractorAnalyzer
from edge_chaos import ChaoticSystems, ODEIntegrator
from deepseek_chaos import DeepSeekChaosAnalyzer


class TestLyapunovComputation:
    """Test Lyapunov exponent computation."""

    def setup_method(self):
        """Set up test fixtures."""
        self.computer = LyapunovComputer(use_deepseek=False)

    def test_logistic_map_periodic(self):
        """Test logistic map in periodic regime (r < 3.57)."""
        # Period-2 regime: r = 3.2
        x = logistic_map_r(5000, 3.2)
        spectrum = self.computer.from_timeseries_rosenstein(x, dt=1.0)

        # Periodic → λ₁ ≈ 0
        assert abs(spectrum.largest_exponent) < 0.1
        assert not spectrum.chaos_indicated

    def test_logistic_map_chaotic(self):
        """Test logistic map in chaotic regime (r > 3.57)."""
        # Chaotic regime: r = 3.8
        x = logistic_map_r(5000, 3.8)
        spectrum = self.computer.from_timeseries_rosenstein(x, dt=1.0)

        # Chaotic → λ₁ > 0
        assert spectrum.largest_exponent > 0
        assert spectrum.chaos_indicated

    def test_method_consistency(self):
        """Test that different methods give similar results."""
        x = logistic_map_r(5000, 3.8)

        results = self.computer.compute_all_methods(x, dt=1.0)

        # All methods should agree on chaos/no chaos
        chaos_indicated = [s.chaos_indicated for s in results.values()]
        assert all(chaos_indicated) or not any(chaos_indicated)

    def test_predictability_horizon(self):
        """Test predictability horizon calculation."""
        # High chaos → short horizon
        x = logistic_map_r(5000, 4.0)
        spectrum = self.computer.from_timeseries_rosenstein(x, dt=1.0)

        assert spectrum.predictability_horizon < 10  # Short horizon
        assert spectrum.predictability_horizon > 0


class TestBifurcationAnalysis:
    """Test bifurcation analysis."""

    def setup_method(self):
        """Set up test fixtures."""
        self.analyzer = BifurcationAnalyzer(use_deepseek=False)

    def test_saddle_node_detection(self):
        """Test saddle-node bifurcation detection."""
        # Normal form: ẋ = μ + x²
        def cubic_normal_form(x, mu):
            return np.array([mu + x[0]**2])

        fps = self.analyzer.find_fixed_points(
            cubic_normal_form,
            parameter_range=(-2, 2),
            n_parameters=50
        )

        # Should find fixed points
        assert len(fps) > 0

        # Check for bifurcation at μ = 0
        bifurcations = self.analyzer.detect_saddle_node_bifurcations(fps)
        assert len(bifurcations) > 0

    def test_bifurcation_diagram(self):
        """Test bifurcation diagram generation."""
        mu_vals, x_vals = self.analyzer.bifurcation_diagram_1d(
            bif_logistic,
            parameter_range=(2.4, 4.0),
            n_params=100,
            n_iter=500,
            n_last=50
        )

        # Should have data points
        assert len(mu_vals) > 0
        assert len(x_vals) > 0
        assert len(mu_vals) == len(x_vals)

    def test_feigenbaum_constant(self):
        """Test Feigenbaum δ calculation."""
        feigenbaum = self.analyzer.feigenbaum_analysis(
            bif_logistic,
            mu_start=2.9,
            mu_end=4.0
        )

        # Should find some bifurcations
        assert len(feigenbaum['bifurcation_parameters']) >= 2

        # δ should be close to theoretical value (4.669...)
        if feigenbaum['delta_convergence'] is not None:
            assert 3.0 < feigenbaum['delta_convergence'] < 6.0


class TestAttractorAnalysis:
    """Test strange attractor analysis."""

    def setup_method(self):
        """Set up test fixtures."""
        self.analyzer = AttractorAnalyzer()

    def test_takens_embedding(self):
        """Test Takens embedding."""
        # Create simple periodic signal
        t = np.linspace(0, 10, 1000)
        x = np.sin(t)

        embedded = self.analyzer.takens_embedding(x, embedding_dim=3, tau=10)

        # Check dimensions
        assert embedded.shape[1] == 3
        assert embedded.shape[0] < len(x)  # Should lose some points

    def test_optimal_delay(self):
        """Test optimal time delay finding."""
        # Periodic signal
        t = np.linspace(0, 10, 1000)
        x = np.sin(2*np.pi*t)

        tau = self.analyzer.find_optimal_delay(x, max_tau=50)

        # Should find reasonable delay
        assert 1 <= tau <= 50

    def test_box_counting_dimension(self):
        """Test box-counting dimension."""
        # Line: d = 1
        line = np.random.rand(1000, 1)
        d_line = self.analyzer.box_counting_dimension(line)

        # Should be close to 1
        assert 0.8 < d_line < 1.5

        # Plane: d = 2
        plane = np.random.rand(1000, 2)
        d_plane = self.analyzer.box_counting_dimension(plane)

        # Should be close to 2
        assert 1.5 < d_plane < 2.5

    def test_lyapunov_dimension(self):
        """Test Lyapunov dimension calculation."""
        exponents = np.array([0.5, 0.1, -1.0])
        d_lyap = self.analyzer.lyapunov_dimension(exponents)

        # j = 1 (0.5 > 0, 0.5+0.1 > 0, 0.5+0.1-1.0 < 0)
        # d_L = 2 + 0.6/1.0 = 2.6
        assert 2.0 < d_lyap < 3.0


class TestODEIntegration:
    """Test ODE integrators."""

    def setup_method(self):
        """Set up test fixtures."""
        self.integrator = ODEIntegrator()

    def test_rk4_convergence(self):
        """Test RK4 convergence rate."""
        # Simple harmonic oscillator: ẍ = -x
        def harmonic(t, y):
            return np.array([y[1], -y[0]])

        # Compare different step sizes
        result1 = self.integrator.runge_kutta_4(harmonic, (0, 10), np.array([1.0, 0.0]), 0.1)
        result2 = self.integrator.runge_kutta_4(harmonic, (0, 10), np.array([1.0, 0.0]), 0.05)

        # Smaller dt should be more accurate
        error1 = np.linalg.norm(result1.final_state - np.array([np.cos(10), -np.sin(10)]))
        error2 = np.linalg.norm(result2.final_state - np.array([np.cos(10), -np.sin(10)]))

        assert error2 < error1

    def test_energy_conservation_symplectic(self):
        """Test symplectic integrator energy conservation."""
        # Harmonic oscillator: H = (p² + x²)/2
        def acceleration(x):
            return -x  # F = -x

        result = self.integrator.velocity_verlet(
            acceleration,
            (0, 100),
            np.array([1.0]),  # Initial position
            np.array([0.0]),  # Initial velocity
            0.01
        )

        # Energy should be conserved (approximately)
        positions = result.state[:, 0]
        velocities = result.state[:, 1]

        energy = (positions**2 + velocities**2) / 2
        energy_variation = (energy.max() - energy.min()) / energy.mean()

        # Symplectic integrator should conserve energy well
        assert energy_variation < 0.01

    def test_lorenz_integration(self):
        """Test Lorenz system integration."""
        result = self.integrator.runge_kutta_4(
            lambda t, y: ChaoticSystems.lorenz(t, y),
            (0, 50),
            np.array([1.0, 1.0, 1.0]),
            0.01
        )

        # Should complete successfully
        assert result.success
        assert len(result.time) > 1000

        # Lorenz attractor has specific bounds
        assert -30 < result.state[:, 0].min() < result.state[:, 0].max() < 30


class TestTimeSeriesAnalysis:
    """Test time series analysis tools."""

    def test_autocorrelation(self):
        """Test autocorrelation computation."""
        from edge_chaos import TimeSeriesAnalysis

        # White noise
        noise = np.random.randn(1000)
        autocorr = TimeSeriesAnalysis.autocorrelation(noise, max_lag=10)

        # White noise should have low autocorrelation
        assert abs(autocorr[1]) < 0.2

        # Periodic signal
        t = np.linspace(0, 10, 1000)
        periodic = np.sin(2*np.pi*t)
        autocorr = TimeSeriesAnalysis.autocorrelation(periodic, max_lag=50)

        # Periodic signal should have oscillating autocorrelation
        assert autocorr[0] == 1.0  # Normalized

    def test_power_spectrum(self):
        """Test power spectrum computation."""
        from edge_chaos import TimeSeriesAnalysis

        # Sine wave
        t = np.linspace(0, 10, 1000)
        signal = np.sin(2*np.pi*t)

        freqs, power = TimeSeriesAnalysis.power_spectrum(signal)

        # Should find peak at fundamental frequency
        peak_freq = freqs[np.argmax(power)]
        assert 0.8 < peak_freq < 1.2  # Close to 1 Hz


class TestIntegration:
    """Integration tests combining multiple modules."""

    def test_complete_chaos_analysis(self):
        """Test complete chaos analysis workflow."""
        # Create chaotic time series
        x = logistic_map_r(5000, 3.8)

        # Lyapunov analysis
        computer = LyapunovComputer(use_deepseek=False)
        lyap_spectrum = computer.from_timeseries_rosenstein(x, dt=1.0)

        # Attractor analysis
        attractor_analyzer = AttractorAnalyzer()
        attractor_props = attractor_analyzer.characterize_attractor(
            x,
            lyapunov_exponents=lyap_spectrum.exponents
        )

        # Check consistency
        assert lyap_spectrum.chaos_indicated  # Should detect chaos
        assert attractor_props.embedding_dimension > 1  # Should need embedding

    def test_lorenz_full_analysis(self):
        """Test full analysis of Lorenz system."""
        from scipy.integrate import odeint

        def lorenz_rhs(state, t):
            x, y, z = state
            sigma, rho, beta = 10, 28, 8/3
            return [sigma*(y-x), x*(rho-z)-y, x*y-beta*z]

        # Integrate
        t = np.arange(0, 50, 0.01)
        trajectory = odeint(lorenz_rhs, [1, 1, 1], t)

        # Analyze x component
        x = trajectory[:, 0]

        # Lyapunov from time series
        computer = LyapunovComputer(use_deepseek=False)
        spectrum = computer.from_timeseries_rosenstein(x, dt=0.01)

        # Should be chaotic
        assert spectrum.largest_exponent > 0

        # Attractor reconstruction
        attractor_analyzer = AttractorAnalyzer()
        reconstruction = attractor_analyzer.reconstruct_attractor(x)

        assert reconstruction.embedding_dimension >= 3


def run_all_tests():
    """Run all tests and print results."""
    print("="*70)
    print("CHAOS THEORY SIMULATION TEST SUITE")
    print("="*70)

    test_classes = [
        TestLyapunovComputation,
        TestBifurcationAnalysis,
        TestAttractorAnalysis,
        TestODEIntegration,
        TestTimeSeriesAnalysis,
        TestIntegration
    ]

    total_tests = 0
    passed_tests = 0

    for test_class in test_classes:
        print(f"\n{test_class.__name__}")
        print("-"*70)

        instance = test_class()
        test_methods = [m for m in dir(instance) if m.startswith('test_')]

        for method_name in test_methods:
            total_tests += 1
            try:
                method = getattr(instance, method_name)
                method()
                print(f"  ✓ {method_name}")
                passed_tests += 1
            except Exception as e:
                print(f"  ✗ {method_name}: {e}")

    print("\n" + "="*70)
    print(f"RESULTS: {passed_tests}/{total_tests} tests passed")
    print("="*70)

    return passed_tests, total_tests


if __name__ == "__main__":
    import sys

    verbose = "--verbose" in sys.argv

    if verbose:
        # Run with pytest
        pytest.main([__file__, "-v"])
    else:
        # Run custom test runner
        passed, total = run_all_tests()
        sys.exit(0 if passed == total else 1)
