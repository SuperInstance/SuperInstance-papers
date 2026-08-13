"""
General PDE Solver Toolkit for POLLN Differential Equations

Provides unified interface for solving various PDEs encountered in POLLN analysis.
Supports multiple numerical methods and adaptive mesh refinement.
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import sparse, interpolate, integrate
from scipy.sparse.linalg import spsolve
from typing import Tuple, Optional, Callable, Union, List
import warnings


class PDESolver:
    """
    Generic PDE solver with multiple numerical methods
    """

    def __init__(self,
                 domain_bounds: Tuple[float, ...],
                 grid_points: Union[int, Tuple[int, ...]],
                 dt: float = 0.01):
        """
        Initialize PDE solver

        Args:
            domain_bounds: Tuple of (min, max) for each dimension
            grid_points: Number of grid points (int or tuple per dimension)
            dt: Time step
        """
        self.dim = len(domain_bounds) // 2

        if isinstance(grid_points, int):
            self.N = (grid_points,) * self.dim
        else:
            self.N = grid_points

        self.dt = dt
        self.time = 0.0

        # Create grid
        self.axes = []
        self.grids = []

        for i in range(self.dim):
            xmin, xmax = domain_bounds[2*i], domain_bounds[2*i+1]
            x = np.linspace(xmin, xmax, self.N[i])
            self.axes.append(x)

        if self.dim == 1:
            self.X = self.axes[0]
        elif self.dim == 2:
            self.X, self.Y = np.meshgrid(self.axes[0], self.axes[1], indexing='ij')
        else:
            self.X = np.meshgrid(*self.axes, indexing='ij')

        # Solution field
        self.u = np.zeros(self.N)

    def initial_condition(self, func: Callable):
        """Set initial condition u(x,0) = func(x)"""
        if self.dim == 1:
            self.u = func(self.X)
        elif self.dim == 2:
            self.u = func(self.X, self.Y)
        else:
            # Multi-dimensional
            coords = np.stack([self.X[i] for i in range(self.dim)], axis=-1)
            self.u = func(coords)

    def laplacian(self, field: np.ndarray) -> np.ndarray:
        """Compute Laplacian using finite differences"""
        if self.dim == 1:
            dx = self.axes[0][1] - self.axes[0][0]
            return (np.roll(field, -1) - 2*field + np.roll(field, 1)) / dx**2

        elif self.dim == 2:
            dx = self.axes[0][1] - self.axes[0][0]
            dy = self.axes[1][1] - self.axes[1][0]

            d2x = (np.roll(field, -1, axis=0) - 2*field + np.roll(field, 1, axis=0)) / dx**2
            d2y = (np.roll(field, -1, axis=1) - 2*field + np.roll(field, 1, axis=1)) / dy**2

            return d2x + d2y

        else:
            raise NotImplementedError("Laplacian not implemented for dim > 2")

    def gradient(self, field: np.ndarray) -> Tuple[np.ndarray, ...]:
        """Compute gradient using central differences"""
        if self.dim == 1:
            dx = self.axes[0][1] - self.axes[0][0]
            grad = (np.roll(field, -1) - np.roll(field, 1)) / (2 * dx)
            return (grad,)

        elif self.dim == 2:
            dx = self.axes[0][1] - self.axes[0][0]
            dy = self.axes[1][1] - self.axes[1][0]

            grad_x = (np.roll(field, -1, axis=0) - np.roll(field, 1, axis=0)) / (2 * dx)
            grad_y = (np.roll(field, -1, axis=1) - np.roll(field, 1, axis=1)) / (2 * dy)

            return (grad_x, grad_y)

        else:
            raise NotImplementedError("Gradient not implemented for dim > 2")

    def divergence(self, *fields: np.ndarray) -> np.ndarray:
        """Compute divergence of vector field"""
        if len(fields) != self.dim:
            raise ValueError(f"Expected {self.dim} fields, got {len(fields)}")

        if self.dim == 1:
            dx = self.axes[0][1] - self.axes[0][0]
            return (np.roll(fields[0], -1) - np.roll(fields[0], 1)) / (2 * dx)

        elif self.dim == 2:
            dx = self.axes[0][1] - self.axes[0][0]
            dy = self.axes[1][1] - self.axes[1][0]

            du_dx = (np.roll(fields[0], -1, axis=0) - np.roll(fields[0], 1, axis=0)) / (2 * dx)
            dv_dy = (np.roll(fields[1], -1, axis=1) - np.roll(fields[1], 1, axis=1)) / (2 * dy)

            return du_dx + dv_dy

        else:
            raise NotImplementedError("Divergence not implemented for dim > 2")


class HeatEquationSolver(PDESolver):
    """
    Solver for heat equation: ∂u/∂t = α∇²u
    """

    def __init__(self, *args, alpha: float = 1.0, **kwargs):
        super().__init__(*args, **kwargs)
        self.alpha = alpha

    def step_explicit(self):
        """Explicit Euler step"""
        lap = self.laplacian(self.u)
        self.u = self.u + self.dt * self.alpha * lap
        self.time += self.dt

    def step_implicit(self):
        """Implicit Euler step (requires solving linear system)"""
        # Build discretization matrix
        if self.dim == 1:
            N = self.N[0]
            dx = self.axes[0][1] - self.axes[0][0]
            r = self.alpha * self.dt / dx**2

            # Tridiagonal matrix
            main_diag = (1 + 2*r) * np.ones(N)
            off_diag = -r * np.ones(N-1)

            A = sparse.diags([off_diag, main_diag, off_diag], offsets=[-1, 0, 1], format='csr')

            # Boundary conditions (Dirichlet: u=0)
            A[0, 0] = 1
            A[0, 1] = 0
            A[-1, -1] = 1
            A[-1, -2] = 0

            rhs = self.u.copy()
            rhs[0] = 0
            rhs[-1] = 0

            self.u = spsolve(A, rhs)

        self.time += self.dt


class WaveEquationSolver(PDESolver):
    """
    Solver for wave equation: ∂²u/∂t² = c²∇²u
    """

    def __init__(self, *args, c: float = 1.0, **kwargs):
        super().__init__(*args, **kwargs)
        self.c = c
        self.u_prev = None  # Previous time step

    def initialize_velocity(self, func: Callable):
        """Initialize initial velocity ∂u/∂t(x,0) = func(x)"""
        # Use forward Euler to get u_prev from initial velocity
        if self.dim == 1:
            dx = self.axes[0][1] - self.axes[0][0]
            lap = self.laplacian(self.u)
            self.u_prev = self.u - self.dt * func(self.X) + 0.5 * (self.c * self.dt)**2 * lap

    def step(self):
        """Verlet integration"""
        if self.u_prev is None:
            raise ValueError("Must initialize velocity first")

        lap = self.laplacian(self.u)

        u_new = 2*self.u - self.u_prev + (self.c * self.dt)**2 * lap

        self.u_prev = self.u.copy()
        self.u = u_new
        self.time += self.dt


class AdvectionEquationSolver(PDESolver):
    """
    Solver for advection equation: ∂u/∂t + v·∇u = 0
    """

    def __init__(self, *args, velocity: Union[float, Tuple[float, ...]] = 1.0, **kwargs):
        super().__init__(*args, **kwargs)
        if isinstance(velocity, (int, float)):
            self.velocity = (velocity,) * self.dim
        else:
            self.velocity = velocity

    def step_upwind(self):
        """First-order upwind scheme"""
        if self.dim == 1:
            v = self.velocity[0]
            dx = self.axes[0][1] - self.axes[0][0]
            u_new = self.u.copy()

            if v > 0:
                # Backward difference
                u_new[1:] = self.u[1:] - (v * self.dt / dx) * (self.u[1:] - self.u[:-1])
            else:
                # Forward difference
                u_new[:-1] = self.u[:-1] - (v * self.dt / dx) * (self.u[1:] - self.u[:-1])

            self.u = u_new

        self.time += self.dt

    def step_lax_wendroff(self):
        """Second-order Lax-Wendroff scheme"""
        if self.dim == 1:
            v = self.velocity[0]
            dx = self.axes[0][1] - self.axes[0][0]
            u_new = self.u.copy()

            # Lax-Wendroff: u_new = u - (v*dt/2dx)*(u_{i+1} - u_{i-1})
            #                     + (v*dt/2dx)²*(u_{i+1} - 2u + u_{i-1})

            alpha = v * self.dt / dx

            u_new[1:-1] = (self.u[1:-1] -
                          0.5 * alpha * (self.u[2:] - self.u[:-2]) +
                          0.5 * alpha**2 * (self.u[2:] - 2*self.u[1:-1] + self.u[:-2]))

            self.u = u_new

        self.time += self.dt


class AdaptiveMeshRefinement:
    """
    Adaptive mesh refinement for PDE solutions
    """

    def __init__(self, base_solver: PDESolver):
        self.base_solver = base_solver
        self.refinement_levels = []

    def estimate_error(self, u: np.ndarray) -> np.ndarray:
        """Estimate local error using gradient"""
        if self.base_solver.dim == 1:
            # Error estimator: |Δu|
            error = np.abs(np.gradient(np.gradient(u)))
            return error

        elif self.base_solver.dim == 2:
            # Error estimator: |∇²u|
            error = np.abs(self.base_solver.laplacian(u))
            return error

        else:
            raise NotImplementedError("Error estimation not implemented for dim > 2")

    def refine_mesh(self, threshold: float = 0.1):
        """Refine mesh where error is large"""
        error = self.estimate_error(self.base_solver.u)

        if self.base_solver.dim == 1:
            # Find regions needing refinement
            refine_mask = error > threshold * np.max(error)

            # Suggest refinement points
            refine_points = np.where(refine_mask)[0]

            return refine_points

        else:
            raise NotImplementedError("Mesh refinement not implemented for dim > 2")


def solve_pde(pde_type: str,
             domain_bounds: Tuple[float, ...],
             grid_points: Union[int, Tuple[int, ...]],
             dt: float,
             n_steps: int,
             initial_condition: Callable,
             **kwargs) -> Tuple[PDESolver, np.ndarray]:
    """
    Generic PDE solver interface

    Args:
        pde_type: Type of PDE ('heat', 'wave', 'advection')
        domain_bounds: Domain boundaries
        grid_points: Grid resolution
        dt: Time step
        n_steps: Number of time steps
        initial_condition: Initial condition function
        **kwargs: Additional parameters for specific PDE

    Returns:
        solver: PDE solver object
        solution: Final solution
    """
    # Create appropriate solver
    if pde_type == 'heat':
        solver = HeatEquationSolver(domain_bounds, grid_points, dt, **kwargs)
    elif pde_type == 'wave':
        solver = WaveEquationSolver(domain_bounds, grid_points, dt, **kwargs)
    elif pde_type == 'advection':
        solver = AdvectionEquationSolver(domain_bounds, grid_points, dt, **kwargs)
    else:
        raise ValueError(f"Unknown PDE type: {pde_type}")

    # Set initial condition
    solver.initial_condition(initial_condition)

    # Time stepping
    for i in range(n_steps):
        if pde_type == 'heat':
            solver.step_explicit()
        elif pde_type == 'wave':
            solver.step()
        elif pde_type == 'advection':
            solver.step_upwind()

    return solver, solver.u


if __name__ == "__main__":
    # Test example: Heat equation
    print("Testing PDE solver with heat equation...")

    def initial_condition(x):
        return np.exp(-x**2 / 0.1)

    solver, solution = solve_pde(
        pde_type='heat',
        domain_bounds=(-5, 5),
        grid_points=200,
        dt=0.001,
        n_steps=1000,
        initial_condition=initial_condition,
        alpha=1.0
    )

    print(f"Final time: {solver.time:.3f}")
    print(f"Solution range: [{np.min(solution):.6f}, {np.max(solution):.6f}]")
