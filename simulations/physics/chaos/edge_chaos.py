"""
Chaos Dynamics Simulator
=========================

Nonlinear dynamics toolkit for simulating chaotic systems:
- ODE integrators (Runge-Kutta, Verlet, symplectic)
- Poincaré sections
- Return maps
- Time series analysis
- Common chaotic systems (Lorenz, Rössler, Henon, etc.)
"""

import numpy as np
from typing import Callable, Dict, List, Tuple, Optional
from dataclasses import dataclass
from scipy.integrate import solve_ivp
import warnings


@dataclass
class SimulationResult:
    """Results from numerical simulation."""
    time: np.ndarray
    state: np.ndarray
    method: str
    success: bool
    final_state: np.ndarray


class ODEIntegrator:
    """
    Numerical integration of ODE systems.

    Multiple methods for different accuracy/stability requirements.
    """

    @staticmethod
    def runge_kutta_4(
        rhs: Callable[[float, np.ndarray], np.ndarray],
        t_span: Tuple[float, float],
        y0: np.ndarray,
        dt: float
    ) -> SimulationResult:
        """
        Classic 4th-order Runge-Kutta integration.

        y_{n+1} = y_n + (dt/6)(k_1 + 2k_2 + 2k_3 + k_4)

        Error: O(dt⁴)
        """
        t0, t_end = t_span
        n_steps = int((t_end - t0) / dt) + 1

        t_values = np.linspace(t0, t_end, n_steps)
        y_values = np.zeros((n_steps, len(y0)))
        y_values[0] = y0

        y = y0.copy()
        for i in range(1, n_steps):
            t = t_values[i-1]

            k_1 = rhs(t, y)
            k_2 = rhs(t + dt/2, y + dt*k_1/2)
            k_3 = rhs(t + dt/2, y + dt*k_2/2)
            k_4 = rhs(t + dt, y + dt*k_3)

            y = y + dt * (k_1 + 2*k_2 + 2*k_3 + k_4) / 6
            y_values[i] = y

        return SimulationResult(
            time=t_values,
            state=y_values,
            method="RK4",
            success=True,
            final_state=y
        )

    @staticmethod
    def runge_kutta_fehlberg(
        rhs: Callable[[float, np.ndarray], np.ndarray],
        t_span: Tuple[float, float],
        y0: np.ndarray,
        dt_init: float = 0.01,
        tolerance: float = 1e-6
    ) -> SimulationResult:
        """
        Runge-Kutta-Fehlberg (RKF45) with adaptive step size.

        Embedded 4th and 5th order methods for error control.
        """
        def rkf_step(t, y, dt):
            """Single RKF45 step."""
            k_1 = rhs(t, y)
            k_2 = rhs(t + dt/4, y + dt*k_1/4)
            k_3 = rhs(t + 3*dt/8, y + dt*(3*k_1 + 9*k_2)/32)
            k_4 = rhs(t + 12*dt/13, y + dt*(1932*k_1 - 7200*k_2 + 7296*k_3)/2197)
            k_5 = rhs(t + dt, y + dt*(439*k_1/216 - 8*k_2 + 3680*k_3/513 - 845*k_4/4104))
            k_6 = rhs(t + dt/2, y + dt*(-8*k_1/27 + 2*k_2 - 3544*k_3/2565 + 1859*k_4/4104 - 11*k_5/40))

            # 4th order
            y4 = y + dt * (25*k_1/216 + 1408*k_3/2565 + 2197*k_4/4104 - k_5/5)
            # 5th order
            y5 = y + dt * (16*k_1/135 + 6656*k_3/12825 + 28561*k_4/56430 - 9*k_5/50 + 2*k_6/55)

            error = np.linalg.norm(y5 - y4)
            return y5, error

        t0, t_end = t_span
        t = t0
        y = y0.copy()
        dt = dt_init

        t_history = [t]
        y_history = [y.copy()]

        while t < t_end:
            if t + dt > t_end:
                dt = t_end - t

            y_new, error = rkf_step(t, y, dt)

            # Step size control
            if error < tolerance:
                y = y_new
                t += dt
                t_history.append(t)
                y_history.append(y.copy())

                # Increase step size
                dt = dt * min(2.0, 0.9 * (tolerance / error)**0.2)
            else:
                # Decrease step size
                dt = dt * max(0.5, 0.9 * (tolerance / error)**0.25)

        return SimulationResult(
            time=np.array(t_history),
            state=np.array(y_history),
            method="RKF45",
            success=True,
            final_state=y
        )

    @staticmethod
    def velocity_verlet(
        acceleration: Callable[[np.ndarray], np.ndarray],
        t_span: Tuple[float, float],
        r0: np.ndarray,
        v0: np.ndarray,
        dt: float
    ) -> SimulationResult:
        """
        Velocity Verlet integration (symplectic, for Hamiltonian systems).

        r(t+dt) = r(t) + v(t)dt + 0.5*a(t)dt²
        v(t+dt) = v(t) + 0.5*(a(t) + a(t+dt))dt

        Conserves energy well for long integrations.
        """
        t0, t_end = t_span
        n_steps = int((t_end - t0) / dt) + 1

        t_values = np.linspace(t0, t_end, n_steps)

        r = r0.copy()
        v = v0.copy()
        a = acceleration(r)

        r_history = [r.copy()]
        v_history = [v.copy()]

        for _ in range(1, n_steps):
            # Update position
            r_new = r + v*dt + 0.5*a*dt**2

            # Update velocity (half step)
            a_new = acceleration(r_new)
            v_new = v + 0.5*(a + a_new)*dt

            r = r_new
            v = v_new
            a = a_new

            r_history.append(r.copy())
            v_history.append(v.copy())

        # Combine position and velocity
        y_values = np.column_stack([np.array(r_history), np.array(v_history)])

        return SimulationResult(
            time=t_values,
            state=y_values,
            method="Velocity_Verlet",
            success=True,
            final_state=np.concatenate([r, v])
        )

    @staticmethod
    def leapfrog(
        acceleration: Callable[[np.ndarray], np.ndarray],
        t_span: Tuple[float, float],
        r0: np.ndarray,
        v0: np.ndarray,
        dt: float
    ) -> SimulationResult:
        """
        Leapfrog integration (symplectic, time-reversible).

        v(t+dt/2) = v(t) + 0.5*a(t)dt
        r(t+dt) = r(t) + v(t+dt/2)dt
        v(t+dt) = v(t+dt/2) + 0.5*a(t+dt)dt
        """
        t0, t_end = t_span
        n_steps = int((t_end - t0) / dt) + 1

        t_values = np.linspace(t0, t_end, n_steps)

        r = r0.copy()
        v = v0.copy()

        r_history = [r.copy()]
        v_history = [v.copy()]

        # Initial half-kick
        a = acceleration(r)
        v_half = v + 0.5*a*dt

        for _ in range(1, n_steps):
            # Drift
            r = r + v_half*dt

            # Kick
            a_new = acceleration(r)
            v_new = v_half + 0.5*a_new*dt

            r_history.append(r.copy())
            v_history.append(v_new)

            v_half = v_new + 0.5*a_new*dt

        y_values = np.column_stack([np.array(r_history), np.array(v_history)])

        return SimulationResult(
            time=t_values,
            state=y_values,
            method="Leapfrog",
            success=True,
            final_state=np.concatenate([r, v_half - 0.5*acceleration(r)*dt])
        )


class ChaoticSystems:
    """
    Common chaotic dynamical systems.
    """

    @staticmethod
    def lorenz(t: float, state: np.ndarray, sigma: float = 10, rho: float = 28, beta: float = 8/3) -> np.ndarray:
        """Lorenz system."""
        x, y, z = state
        return np.array([
            sigma * (y - x),
            x * (rho - z) - y,
            x * y - beta * z
        ])

    @staticmethod
    def rossler(t: float, state: np.ndarray, a: float = 0.2, b: float = 0.2, c: float = 5.7) -> np.ndarray:
        """Rössler system."""
        x, y, z = state
        return np.array([
            -y - z,
            x + a*y,
            b + z*(x - c)
        ])

    @staticmethod
    def henon_map(state: np.ndarray, a: float = 1.4, b: float = 0.3) -> np.ndarray:
        """Hénon map (2D)."""
        x, y = state
        return np.array([
            1 - a*x**2 + y,
            b*x
        ])

    @staticmethod
    def ikeda_map(state: np.ndarray, u: float = 0.9) -> np.ndarray:
        """Ikeda map (2D)."""
        x, y = state
        tn = 0.4 - 6/(1 + x**2 + y**2)
        return np.array([
            1 + u*(x*np.cos(tn) - y*np.sin(tn)),
            u*(x*np.sin(tn) + y*np.cos(tn))
        ])

    @staticmethod
    def logistic_map(r: float) -> Callable[[float], float]:
        """Logistic map generator."""
        return lambda x: r * x * (1 - x)

    @staticmethod
    def tent_map(s: float = 1.2) -> Callable[[float], float]:
        """Tent map generator."""
        def f(x):
            if x < 0.5:
                return s*x
            else:
                return s*(1 - x)
        return f

    @staticmethod
    def duffing(t: float, state: np.ndarray, delta: float = 0.3, alpha: float = -1, beta: float = 1, gamma: float = 0.5, omega: float = 1.2) -> np.ndarray:
        """Duffing oscillator."""
        x, v = state
        return np.array([
            v,
            -delta*v - alpha*x - beta*x**3 + gamma*np.cos(omega*t)
        ])

    @staticmethod
    def van_der_pol(t: float, state: np.ndarray, mu: float = 1.0) -> np.ndarray:
        """Van der Pol oscillator."""
        x, v = state
        return np.array([
            v,
            mu*(1 - x**2)*v - x
        ])


class PoincareSection:
    """
    Poincaré section analysis for reducing continuous dynamics to maps.
    """

    def __init__(self, section_func: Callable[[np.ndarray], float]):
        """
        Initialize Poincaré section.

        Args:
            section_func: Function defining section Σ(x) = 0
        """
        self.section_func = section_func

    def generate_section(
        self,
        trajectory: np.ndarray,
        tolerance: float = 1e-6
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate Poincaré section from trajectory.

        Args:
            trajectory: State trajectory [n_steps, n_dim]
            tolerance: Tolerance for section crossing

        Returns:
            (section_points, crossing_times)
        """
        section_points = []
        crossing_indices = []

        for i in range(1, len(trajectory)):
            # Check for section crossing
            val_prev = self.section_func(trajectory[i-1])
            val_curr = self.section_func(trajectory[i])

            if val_prev * val_curr < 0:  # Sign change = crossing
                # Linear interpolation to find exact crossing
                alpha = abs(val_prev) / (abs(val_prev) + abs(val_curr))
                crossing_point = trajectory[i-1] + alpha * (trajectory[i] - trajectory[i-1])

                section_points.append(crossing_point)
                crossing_indices.append(i)

        return np.array(section_points), np.array(crossing_indices)

    def return_map(
        self,
        section_points: np.ndarray,
        dimension: int = 0
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate 1D return map from Poincaré section.

        Args:
            section_points: Points on Poincaré section
            dimension: Which dimension to use for map

        Returns:
            (x_n, x_{n+1}) for return map
        """
        if len(section_points) < 2:
            return np.array([]), np.array([])

        x_vals = section_points[:-1, dimension]
        y_vals = section_points[1:, dimension]

        return x_vals, y_vals


class TimeSeriesAnalysis:
    """
    Analysis tools for time series data.
    """

    @staticmethod
    def phase_space_reconstruction(
        timeseries: np.ndarray,
        embedding_dim: int,
        tau: int
    ) -> np.ndarray:
        """
        Reconstruct phase space using Takens embedding.
        """
        n = len(timeseries)
        m = n - (embedding_dim - 1) * tau

        if m <= 0:
            raise ValueError("Time series too short")

        embedded = np.zeros((m, embedding_dim))
        for i in range(embedding_dim):
            embedded[:, i] = timeseries[i*tau : i*tau + m]

        return embedded

    @staticmethod
    def autocorrelation(timeseries: np.ndarray, max_lag: int = 100) -> np.ndarray:
        """Compute autocorrelation function."""
        ts_centered = timeseries - timeseries.mean()
        autocorr = np.zeros(max_lag + 1)

        for lag in range(max_lag + 1):
            if lag == 0:
                autocorr[lag] = 1.0
            else:
                autocorr[lag] = np.corrcoef(ts_centered[:-lag], ts_centered[lag:])[0, 1]

        return autocorr

    @staticmethod
    def power_spectrum(timeseries: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Compute power spectrum."""
        fft = np.fft.fft(timeseries)
        power = np.abs(fft[:len(fft)//2])**2
        freqs = np.fft.fftfreq(len(timeseries))[:len(fft)//2]

        return freqs, power

    @staticmethod
    def mutual_information(timeseries: np.ndarray, max_lag: int = 50, n_bins: int = 10) -> np.ndarray:
        """Compute average mutual information."""
        mi = np.zeros(max_lag + 1)

        # Normalize
        ts_norm = (timeseries - timeseries.min()) / (timeseries.max() - timeseries.min())

        for lag in range(max_lag + 1):
            if lag == 0:
                mi[lag] = 0
                continue

            x = ts_norm[:-lag]
            y = ts_norm[lag:]

            # Discretize
            x_bins = np.digitize(x, np.linspace(0, 1, n_bins))
            y_bins = np.digitize(y, np.linspace(0, 1, n_bins))

            # Joint probability
            joint = np.zeros((n_bins, n_bins))
            for xb, yb in zip(x_bins, y_bins):
                if 0 < xb <= n_bins and 0 < yb <= n_bins:
                    joint[xb-1, yb-1] += 1

            joint = joint / (joint.sum() + 1e-10)

            # Marginals
            px = joint.sum(axis=1) + 1e-10
            py = joint.sum(axis=0) + 1e-10

            # MI
            mi_val = 0
            for i in range(n_bins):
                for j in range(n_bins):
                    if joint[i, j] > 0:
                        mi_val += joint[i, j] * np.log(joint[i, j] / (px[i] * py[j]))

            mi[lag] = mi_val

        return mi


if __name__ == "__main__":
    print("=" * 70)
    print("CHAOS DYNAMICS SIMULATOR TESTS")
    print("=" * 70)

    # Test Lorenz system
    print("\n1. LORENZ SYSTEM (RK4)")
    print("-" * 70)

    integrator = ODEIntegrator()
    result = integrator.runge_kutta_4(
        lambda t, y: ChaoticSystems.lorenz(t, y),
        (0, 50),
        np.array([1.0, 1.0, 1.0]),
        0.01
    )

    print(f"Integrated {len(result.time)} steps")
    print(f"Final state: x={result.final_state[0]:.3f}, y={result.final_state[1]:.3f}, z={result.final_state[2]:.3f}")
    print(f"State range: x=[{result.state[:, 0].min():.2f}, {result.state[:, 0].max():.2f}]")

    # Test Hénon map
    print("\n2. HÉNON MAP")
    print("-" * 70)

    n_iter = 10000
    state = np.array([0.1, 0.1])
    trajectory = [state]

    for _ in range(n_iter):
        state = ChaoticSystems.henon_map(state)
        trajectory.append(state)

    trajectory = np.array(trajectory)

    print(f"Iterated {n_iter} times")
    print(f"Bounds: x=[{trajectory[:, 0].min():.3f}, {trajectory[:, 0].max():.3f}]")
    print(f"       y=[{trajectory[:, 1].min():.3f}, {trajectory[:, 1].max():.3f}]")

    # Test Poincaré section
    print("\n3. POINCARÉ SECTION (LORENZ, z=27)")
    print("-" * 70)

    poincare = PoincareSection(lambda state: state[2] - 27)
    section_points, crossing_indices = poincare.generate_section(result.state)

    print(f"Found {len(section_points)} crossings")
    if len(section_points) > 0:
        print(f"Section x range: [{section_points[:, 0].min():.3f}, {section_points[:, 0].max():.3f}]")

    # Test return map
    if len(section_points) > 10:
        x_vals, y_vals = poincare.return_map(section_points, dimension=0)
        print(f"Return map: {len(x_vals)} points")

    # Test time series analysis
    print("\n4. TIME SERIES ANALYSIS")
    print("-" * 70)

    ts = result.state[:, 0]  # x component

    # Power spectrum
    freqs, power = TimeSeriesAnalysis.power_spectrum(ts)
    peak_freq = freqs[np.argmax(power)]
    print(f"Peak frequency: {peak_freq:.3f}")

    # Autocorrelation
    autocorr = TimeSeriesAnalysis.autocorrelation(ts, max_lag=100)
    decorrelation_time = np.where(np.abs(autocorr) < 0.1)[0]
    if len(decorrelation_time) > 0:
        print(f"Decorrelation time: ~{decororation_time[0]} steps")
