"""
Hamilton-Jacobi-Bellman Equation for Optimal Control in POLLN

Derives optimal agent policies using dynamic programming principle.
HJB equation provides necessary conditions for optimality in continuous
time and state space.

Mathematical Foundation:
- Dynamic programming principle
- Value function V(x,t)
- HJB equation: ∂V/∂t + H(x,∇V) = 0
- Viscosity solutions for non-smooth cases
- Optimal policy: π*(x) = argmax H(x,∇V)
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import interpolate, optimize, sparse
from typing import Tuple, Optional, Callable, Dict
import warnings

from .deepseek_math import DeepSeekMath, DerivationResult


class HJBSolver:
    """
    Numerical solver for Hamilton-Jacobi-Bellman equation
    Computes optimal policies using dynamic programming
    """

    def __init__(self,
                 state_dim: int = 1,
                 domain_size: float = 10.0,
                 grid_points: int = 100,
                 dt: float = 0.01,
                 discount: float = 0.95):
        """
        Initialize HJB solver

        Args:
            state_dim: Dimension of state space
            domain_size: Size of computational domain [-L, L]
            grid_points: Number of grid points per dimension
            dt: Time step for value iteration
            discount: Discount factor γ ∈ (0,1)
        """
        self.state_dim = state_dim
        self.L = domain_size
        self.N = grid_points
        self.dt = dt
        self.gamma = discount

        # Grid
        self.dx = 2 * self.L / (self.N - 1)
        self.x = np.linspace(-self.L, self.L, self.N)

        # Multi-dimensional grid
        if state_dim > 1:
            self.X = np.meshgrid(*[self.x for _ in range(state_dim)], indexing='ij')
        else:
            self.X = self.x

        # Value function
        self.V = np.zeros((self.N,) * state_dim)

        # Optimal policy
        self.pi = np.zeros((self.N,) * state_dim)

        # For tracking convergence
        self.iteration = 0
        self.history = []

    def running_cost(self, x: np.ndarray, u: np.ndarray) -> np.ndarray:
        """
        Running cost c(x,u) - immediate cost of taking action u in state x

        Example: quadratic cost
        c(x,u) = x² + u²
        """
        return x**2 + u**2

    def terminal_cost(self, x: np.ndarray) -> np.ndarray:
        """
        Terminal cost φ(x) - cost at final time

        Example: zero terminal cost (infinite horizon)
        """
        return np.zeros_like(x)

    def dynamics(self, x: np.ndarray, u: np.ndarray) -> np.ndarray:
        """
        System dynamics: ẋ = f(x,u)

        Example: linear dynamics
        ẋ = Ax + Bu
        """
        A = -1.0  # State decay
        B = 1.0   # Control effectiveness
        return A * x + B * u

    def hamiltonian(self, x: np.ndarray, p: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Hamiltonian H(x,p) = max_u [-c(x,u) + p·f(x,u)]

        Args:
            x: State
            p: Costate (∇V)

        Returns:
            H: Hamiltonian value
            u_star: Optimal control
        """
        # For quadratic cost: c(x,u) = x² + u²
        # Dynamics: ẋ = -x + u
        # H(x,p) = max_u [-x² - u² + p(-x + u)]

        # Optimal u: ∂H/∂u = 0 → -2u + p = 0 → u* = p/2
        u_star = p / 2.0

        # Hamiltonian value
        H = -x**2 - u_star**2 + p * (-x + u_star)

        return H, u_star

    def solve_value_iteration(self, max_iter: int = 1000, tol: float = 1e-6):
        """
        Solve HJB equation using value iteration

        Algorithm:
        1. Initialize V(x)
        2. Update: V_new(x) = (1-γ)c(x,π(x)) + γE[V(x')]
        3. Iterate until convergence
        """
        print("Starting value iteration...")

        for iteration in range(max_iter):
            V_old = self.V.copy()

            # Update value function
            if self.state_dim == 1:
                self._value_iteration_1d()
            else:
                self._value_iteration_nd()

            # Check convergence
            diff = np.max(np.abs(self.V - V_old))

            if iteration % 100 == 0:
                print(f"  Iteration {iteration}: max diff = {diff:.6f}")

            if diff < tol:
                print(f"Converged in {iteration} iterations")
                break

        # Extract optimal policy
        self._extract_optimal_policy()

    def _value_iteration_1d(self):
        """1D value iteration step"""
        V_new = np.zeros_like(self.V)

        for i, x in enumerate(self.x):
            # For each state, find optimal control
            # V(x) = min_u [c(x,u) + γ * V(f(x,u))]

            # Discretize control space
            u_values = np.linspace(-2, 2, 100)

            # Cost for each control
            costs = []
            for u in u_values:
                # Next state
                x_next = x + self.dt * self.dynamics(x, u)

                # Interpolate V at next state
                if abs(x_next) <= self.L:
                    V_next = np.interp(x_next, self.x, self.V)
                else:
                    V_next = 0  # Out of bounds

                # Total cost
                cost = self.running_cost(x, u) + self.gamma * V_next
                costs.append(cost)

            # Value is minimum cost
            V_new[i] = np.min(costs)

        self.V = V_new

    def _value_iteration_nd(self):
        """N-dimensional value iteration (simplified)"""
        warnings.warn("N-dimensional solver not fully implemented")

    def _extract_optimal_policy(self):
        """Extract optimal policy from converged value function"""
        if self.state_dim == 1:
            for i, x in enumerate(self.x):
                # Find optimal control
                u_values = np.linspace(-2, 2, 200)
                costs = []

                for u in u_values:
                    x_next = x + self.dt * self.dynamics(x, u)

                    if abs(x_next) <= self.L:
                        V_next = np.interp(x_next, self.x, self.V)
                    else:
                        V_next = 0

                    cost = self.running_cost(x, u) + self.gamma * V_next
                    costs.append(cost)

                # Optimal control
                self.pi[i] = u_values[np.argmin(costs)]

    def solve_hjb_pde(self, T: float = 10.0):
        """
        Solve HJB PDE directly using finite differences

        HJB equation: ∂V/∂t + H(x,∇V) = 0
        Terminal condition: V(x,T) = φ(x)
        """
        print("Solving HJB PDE backward in time...")

        # Initialize terminal condition
        self.V = self.terminal_cost(self.x)

        Nt = int(T / self.dt)

        for n in range(Nt):
            # Backward time stepping
            t = T - n * self.dt

            # Compute gradient ∇V
            if self.state_dim == 1:
                dVdx = np.gradient(self.V, self.dx)
            else:
                dVdx = np.gradient(self.V, self.dx)

            # Compute Hamiltonian
            H, u_star = self.hamiltonian(self.X, dVdx)

            # Update: V_new = V_old - dt * H
            self.V = self.V - self.dt * H

            # Store optimal policy
            self.pi = u_star

            if n % 100 == 0:
                print(f"  Time step {n}/{Nt}, t={t:.2f}")

    def compute_policy_gradient(self, x: np.ndarray) -> np.ndarray:
        """
        Compute policy gradient ∇π(x) for sensitivity analysis
        """
        if self.state_dim == 1:
            return np.gradient(self.pi, self.dx)
        else:
            return np.gradient(self.pi, self.dx)

    def simulate_trajectory(self, x0: float, T: float = 10.0,
                           noise: float = 0.0) -> Tuple[np.ndarray, np.ndarray]:
        """
        Simulate system trajectory using optimal policy

        Args:
            x0: Initial state
            T: Simulation time
            noise: Measurement noise

        Returns:
            states: State trajectory
            controls: Control trajectory
        """
        Nt = int(T / self.dt)
        states = np.zeros(Nt)
        controls = np.zeros(Nt)

        x = x0

        for n in range(Nt):
            # Get optimal control
            if abs(x) <= self.L:
                u = np.interp(x, self.x, self.pi)
            else:
                u = 0

            states[n] = x
            controls[n] = u

            # Update state
            x = x + self.dt * self.dynamics(x, u) + noise * np.random.randn() * np.sqrt(self.dt)

        return states, controls

    def compute_cost_to_go(self, x0: float) -> float:
        """Compute cost-to-go from initial state"""
        if abs(x0) <= self.L:
            return np.interp(x0, self.x, self.V)
        else:
            return float('inf')

    def verify_optimality(self, n_test: int = 100) -> Dict:
        """
        Verify optimality by comparing with suboptimal policies
        """
        total_costs = []

        for _ in range(n_test):
            x0 = np.random.uniform(-self.L/2, self.L/2)

            # Optimal policy
            states_opt, controls_opt = self.simulate_trajectory(x0, T=5.0)
            cost_opt = np.sum(self.running_cost(states_opt, controls_opt)) * self.dt

            # Suboptimal policy (e.g., u = -x)
            states_sub = []
            controls_sub = []
            x = x0
            for n in range(int(5.0 / self.dt)):
                u = -x  # Proportional control
                states_sub.append(x)
                controls_sub.append(u)
                x = x + self.dt * self.dynamics(x, u)

            cost_sub = np.sum(self.running_cost(np.array(states_sub),
                                               np.array(controls_sub))) * self.dt

            total_costs.append({
                'optimal': cost_opt,
                'suboptimal': cost_sub,
                'improvement': (cost_sub - cost_opt) / cost_sub * 100
            })

        avg_improvement = np.mean([c['improvement'] for c in total_costs])

        return {
            'average_improvement_percent': avg_improvement,
            'all_tests': total_costs
        }

    def plot_value_function(self, ax=None):
        """Plot value function"""
        if ax is None:
            fig, ax = plt.subplots(figsize=(10, 6))

        if self.state_dim == 1:
            ax.plot(self.x, self.V, 'b-', linewidth=2, label='V(x)')
            ax.set_xlabel('State x')
            ax.set_ylabel('Value V(x)')
            ax.set_title('Optimal Value Function')
            ax.grid(True, alpha=0.3)
            ax.legend()

        return ax

    def plot_optimal_policy(self, ax=None):
        """Plot optimal policy"""
        if ax is None:
            fig, ax = plt.subplots(figsize=(10, 6))

        if self.state_dim == 1:
            ax.plot(self.x, self.pi, 'r-', linewidth=2, label='π*(x)')
            ax.set_xlabel('State x')
            ax.set_ylabel('Control u')
            ax.set_title('Optimal Policy')
            ax.grid(True, alpha=0.3)
            ax.legend()

        return ax

    def plot_trajectory(self, x0: float, T: float = 10.0, ax=None):
        """Plot simulated trajectory"""
        if ax is None:
            fig, ax = plt.subplots(figsize=(12, 5))

        states, controls = self.simulate_trajectory(x0, T)
        time = np.linspace(0, T, len(states))

        ax.plot(time, states, 'b-', linewidth=2, label='State x(t)')
        ax.plot(time, controls, 'r--', linewidth=2, label='Control u(t)')
        ax.set_xlabel('Time')
        ax.set_ylabel('State / Control')
        ax.set_title(f'Trajectory from x0 = {x0:.2f}')
        ax.grid(True, alpha=0.3)
        ax.legend()

        return ax


def derive_hjb_equation(api_key: str) -> DerivationResult:
    """
    Use DeepSeek to derive HJB equation
    """
    math_engine = DeepSeekMath(api_key)

    concept = """
    Hamilton-Jacobi-Bellman equation for optimal control in POLLN.

    System description:
    - Agents choose actions to minimize cumulative cost
    - Value function V(x,t) = minimum cost-to-go from state x at time t
    - Dynamic programming principle: optimal policy has optimal substructure
    - HJB equation provides necessary conditions for optimality

    Problem formulation:
    min J = ∫[t0,T] c(x(s),π(s)) ds + φ(x(T))
    subject to: ẋ(s) = f(x(s),π(s))

    HJB equation:
    -∂V/∂t = min_u [c(x,u) + ∇V·f(x,u)]
    V(x,T) = φ(x)

    Derive:
    1. Dynamic programming principle
    2. HJB equation from first principles
    3. Hamiltonian definition
    4. Optimal policy extraction
    5. Viscosity solution concept for non-smooth cases
    6. Connection to policy gradient methods
    """

    result = math_engine.derive_pde(concept)
    return result


def run_simulation(api_key: Optional[str] = None,
                   plot_results: bool = True):
    """
    Run complete HJB simulation
    """
    print("="*70)
    print("HJB EQUATION: Optimal Control for Agent Policies")
    print("="*70)

    # Derive equation if API key provided
    if api_key:
        print("\n1. Deriving HJB equation using DeepSeek...")
        derivation = derive_hjb_equation(api_key)
        print(f"   Final equation: {derivation.final_equation}")
        print(f"   API calls used: {derivation.api_calls_used}")

    # Create solver
    print("\n2. Initializing HJB solver...")
    solver = HJBSolver(
        state_dim=1,
        domain_size=5.0,
        grid_points=100,
        dt=0.01,
        discount=0.95
    )

    print(f"   Grid: {solver.N} points")
    print(f"   Discount: {solver.gamma}")
    print(f"   Time step: {solver.dt}")

    # Solve using value iteration
    print("\n3. Solving using value iteration...")
    solver.solve_value_iteration(max_iter=1000, tol=1e-6)

    # Verify optimality
    print("\n4. Verifying optimality...")
    verification = solver.verify_optimality(n_test=50)
    print(f"   Average improvement: {verification['average_improvement_percent']:.2f}%")

    # Test trajectories
    print("\n5. Simulating trajectories...")
    test_states = [0.5, 2.0, -2.0]

    # Plot results
    if plot_results:
        print("\n6. Generating plots...")

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        solver.plot_value_function(ax=axes[0, 0])
        solver.plot_optimal_policy(ax=axes[0, 1])

        for x0 in test_states:
            solver.plot_trajectory(x0, T=5.0, ax=axes[1, 0])

        axes[1, 0].legend()
        axes[1, 0].set_title('Trajectories from Different Initial States')

        # Plot value function vs state
        axes[1, 1].plot(solver.x, solver.V, 'b-', linewidth=2)
        axes[1, 1].set_xlabel('State x')
        axes[1, 1].set_ylabel('Value V(x)')
        axes[1, 1].set_title('Value Function Profile')
        axes[1, 1].grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig('simulations/math/diffequations/hjb_optimal_control.png', dpi=150)
        print("   Saved: hjb_optimal_control.png")

        plt.show()

    return solver


if __name__ == "__main__":
    # Run simulation
    api_key = "YOUR_API_KEY"
    solver = run_simulation(api_key=api_key, plot_results=True)
