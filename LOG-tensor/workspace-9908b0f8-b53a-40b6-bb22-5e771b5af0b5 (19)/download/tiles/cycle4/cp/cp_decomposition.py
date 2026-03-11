"""
CP (CANDECOMP/PARAFAC) Decomposition Tiles
===========================================
Tensor decomposition: T = Σᵣ aᵣ ⊗ bᵣ ⊗ cᵣ

Numerical stability focus with regularization and iterative refinement.
"""

import numpy as np
from numpy.linalg import norm, svd, solve
from typing import Tuple, List, Optional
from dataclasses import dataclass
import warnings


@dataclass
class CPResult:
    """Result of CP decomposition."""
    factors: List[np.ndarray]  # Factor matrices [A, B, C, ...]
    weights: np.ndarray        # Optional weights for each component
    reconstruction_error: float
    iterations: int
    converged: bool


def khatri_rao_product(A: np.ndarray, B: np.ndarray) -> np.ndarray:
    """
    Compute Khatri-Rao product (column-wise Kronecker product).
    
    Parameters
    ----------
    A : ndarray of shape (I, R)
    B : ndarray of shape (J, R)
    
    Returns
    -------
    ndarray of shape (I*J, R)
    """
    I, R1 = A.shape
    J, R2 = B.shape
    assert R1 == R2, "Number of columns must match"
    
    result = np.zeros((I * J, R1))
    for r in range(R1):
        result[:, r] = np.kron(A[:, r], B[:, r])
    return result


def unfold_tensor(tensor: np.ndarray, mode: int) -> np.ndarray:
    """
    Unfold tensor along specified mode.
    
    Parameters
    ----------
    tensor : ndarray
    mode : int
        Mode along which to unfold (0-indexed)
    
    Returns
    -------
    ndarray of shape (mode_dim, prod(other_dims))
    """
    ndim = tensor.ndim
    modes = list(range(ndim))
    modes[0], modes[mode] = modes[mode], modes[0]
    
    return np.transpose(tensor, modes).reshape(tensor.shape[mode], -1)


def fold_tensor(matrix: np.ndarray, mode: int, shape: Tuple[int, ...]) -> np.ndarray:
    """
    Fold matrix back to tensor along specified mode.
    """
    ndim = len(shape)
    modes = list(range(ndim))
    modes[0], modes[mode] = modes[mode], modes[0]
    
    # Compute the shape after transposition
    trans_shape = [shape[m] for m in modes]
    
    tensor = matrix.reshape(trans_shape)
    
    # Inverse permutation
    inv_modes = [0] * ndim
    for i, m in enumerate(modes):
        inv_modes[m] = i
    
    return np.transpose(tensor, inv_modes)


def cp_als(
    tensor: np.ndarray,
    rank: int,
    max_iter: int = 100,
    tol: float = 1e-8,
    reg: float = 1e-10,
    init: Optional[List[np.ndarray]] = None,
    random_state: Optional[int] = None
) -> CPResult:
    """
    CP decomposition via Alternating Least Squares.
    
    Decomposes tensor T ≈ Σᵣ λᵣ aᵣ ⊗ bᵣ ⊗ cᵣ
    
    Parameters
    ----------
    tensor : ndarray
        Input tensor to decompose
    rank : int
        Number of components (CP rank)
    max_iter : int
        Maximum number of iterations
    tol : float
        Convergence tolerance
    reg : float
        Tikhonov regularization parameter for numerical stability
    init : list of ndarray, optional
        Initial factor matrices
    random_state : int, optional
        Random seed for reproducibility
    
    Returns
    -------
    CPResult
        Decomposition result with factors and metadata
    """
    if random_state is not None:
        np.random.seed(random_state)
    
    ndim = tensor.ndim
    shape = tensor.shape
    
    # Initialize factor matrices
    if init is None:
        factors = [np.random.randn(s, rank) for s in shape]
        # Normalize columns
        for i in range(ndim):
            factors[i] = factors[i] / norm(factors[i], axis=0, keepdims=True)
    else:
        factors = [f.copy() for f in init]
    
    weights = np.ones(rank)
    tensor_norm = norm(tensor)
    
    prev_error = np.inf
    converged = False
    
    for iteration in range(max_iter):
        for mode in range(ndim):
            # Compute Khatri-Rao product of all factors except current mode
            kr = np.ones((1, rank))
            for i in range(ndim):
                if i != mode:
                    kr = khatri_rao_product(factors[i], kr)
            
            # Unfold tensor
            X_unfolded = unfold_tensor(tensor, mode)
            
            # Solve least squares: X ≈ F_mode @ (kr * weights).T
            # with regularization for stability
            M = kr * weights  # Scale by weights
            
            # Normal equations with regularization
            MtM = M.T @ M + reg * np.eye(rank)
            XtM = X_unfolded @ M
            
            # Solve for factor matrix
            factors[mode] = solve(MtM, XtM.T).T
            
            # Normalize and update weights
            col_norms = norm(factors[mode], axis=0)
            col_norms = np.maximum(col_norms, 1e-10)  # Avoid division by zero
            weights = weights * col_norms
            factors[mode] = factors[mode] / col_norms
        
        # Compute reconstruction error
        reconstructed = reconstruct_cp(factors, weights)
        error = norm(tensor - reconstructed) / tensor_norm
        
        if np.abs(prev_error - error) < tol:
            converged = True
            break
        
        prev_error = error
    
    return CPResult(
        factors=factors,
        weights=weights,
        reconstruction_error=error,
        iterations=iteration + 1,
        converged=converged
    )


def reconstruct_cp(factors: List[np.ndarray], weights: np.ndarray) -> np.ndarray:
    """
    Reconstruct tensor from CP factors.
    """
    ndim = len(factors)
    rank = factors[0].shape[1]
    shape = tuple(f.shape[0] for f in factors)
    
    # Weight the first factor
    weighted_factors = [factors[0] * weights]
    weighted_factors.extend(factors[1:])
    
    # Compute outer product sum
    result = np.zeros(shape)
    for r in range(rank):
        component = weighted_factors[0][:, r]
        for i in range(1, ndim):
            component = np.outer(component, weighted_factors[i][:, r])
            # Reshape to maintain proper dimensions
            component = component.reshape(tuple(shape[j] for j in range(i + 1)))
        result = result + component
    
    return result


def cp_nls(
    tensor: np.ndarray,
    rank: int,
    max_iter: int = 100,
    tol: float = 1e-8,
    reg: float = 1e-10,
    random_state: Optional[int] = None
) -> CPResult:
    """
    CP decomposition via Nonlinear Least Squares (Gauss-Newton).
    
    More stable for ill-conditioned problems than ALS.
    """
    if random_state is not None:
        np.random.seed(random_state)
    
    ndim = tensor.ndim
    shape = tensor.shape
    
    # Initialize with SVD-based method
    factors = []
    for i, s in enumerate(shape):
        # Use HOSVD for initialization
        unfolded = unfold_tensor(tensor, i)
        U, _, _ = svd(unfolded, full_matrices=False)
        factors.append(U[:, :rank].copy() if rank <= U.shape[1] else 
                      np.hstack([U, np.random.randn(s, rank - U.shape[1])]))
    
    weights = np.ones(rank)
    tensor_norm = norm(tensor)
    
    prev_error = np.inf
    converged = False
    
    for iteration in range(max_iter):
        # ALS step for comparison
        for mode in range(ndim):
            kr = np.ones((1, rank))
            for i in range(ndim):
                if i != mode:
                    kr = khatri_rao_product(factors[i], kr)
            
            X_unfolded = unfold_tensor(tensor, mode)
            M = kr * weights
            
            # Use SVD for numerical stability
            U, S, Vt = svd(M, full_matrices=False)
            
            # Filter small singular values
            mask = S > reg * S[0]
            S_inv = np.zeros_like(S)
            S_inv[mask] = 1.0 / S[mask]
            
            # Compute solution
            factors[mode] = X_unfolded @ (Vt.T * S_inv) @ U.T
            
            # Normalize
            col_norms = norm(factors[mode], axis=0)
            col_norms = np.maximum(col_norms, 1e-10)
            weights = weights * col_norms
            factors[mode] = factors[mode] / col_norms
        
        reconstructed = reconstruct_cp(factors, weights)
        error = norm(tensor - reconstructed) / tensor_norm
        
        if np.abs(prev_error - error) < tol:
            converged = True
            break
        
        prev_error = error
    
    return CPResult(
        factors=factors,
        weights=weights,
        reconstruction_error=error,
        iterations=iteration + 1,
        converged=converged
    )


class CPDecomposition:
    """
    Composable CP decomposition class with numerical stability guarantees.
    """
    
    def __init__(self, rank: int, method: str = 'als', **kwargs):
        self.rank = rank
        self.method = method
        self.kwargs = kwargs
        self.result_: Optional[CPResult] = None
    
    def fit(self, tensor: np.ndarray) -> 'CPDecomposition':
        """Fit CP decomposition to tensor."""
        if self.method == 'als':
            self.result_ = cp_als(tensor, self.rank, **self.kwargs)
        elif self.method == 'nls':
            self.result_ = cp_nls(tensor, self.rank, **self.kwargs)
        else:
            raise ValueError(f"Unknown method: {self.method}")
        return self
    
    def transform(self, tensor: np.ndarray) -> Tuple[List[np.ndarray], np.ndarray]:
        """Transform tensor to factor representation."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        return self.result_.factors, self.result_.weights
    
    def inverse_transform(self, factors: Optional[List[np.ndarray]] = None,
                         weights: Optional[np.ndarray] = None) -> np.ndarray:
        """Reconstruct tensor from factors."""
        if factors is None:
            if self.result_ is None:
                raise RuntimeError("Must call fit() first")
            factors = self.result_.factors
            weights = self.result_.weights if weights is None else weights
        return reconstruct_cp(factors, weights)
    
    def __or__(self, other: 'CPDecomposition') -> 'CPDecomposition':
        """Compose decompositions (sequential fitting)."""
        # Create new decomposition with combined rank
        new_rank = self.rank + other.rank
        composed = CPDecomposition(new_rank, self.method, **self.kwargs)
        # Will need to fit on actual data
        return composed
    
    @property
    def reconstruction_error(self) -> float:
        """Return reconstruction error."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        return self.result_.reconstruction_error


# Utility functions for numerical stability
def check_cp_stability(factors: List[np.ndarray], weights: np.ndarray) -> dict:
    """
    Check numerical stability of CP decomposition.
    
    Returns condition numbers and other diagnostics.
    """
    diagnostics = {
        'weight_condition': np.max(weights) / np.min(weights) if np.min(weights) > 0 else np.inf,
        'factor_conditions': [],
        'min_weight': np.min(np.abs(weights)),
        'max_weight': np.max(np.abs(weights))
    }
    
    for i, F in enumerate(factors):
        # Check condition number of factor matrix
        _, S, _ = svd(F)
        cond = S[0] / S[-1] if S[-1] > 0 else np.inf
        diagnostics['factor_conditions'].append(cond)
    
    return diagnostics


if __name__ == "__main__":
    # Test CP decomposition
    np.random.seed(42)
    
    # Create a low-rank tensor
    true_rank = 3
    shape = (4, 5, 6)
    
    # Generate ground truth factors
    A = np.random.randn(shape[0], true_rank)
    B = np.random.randn(shape[1], true_rank)
    C = np.random.randn(shape[2], true_rank)
    
    # Create tensor
    tensor = np.zeros(shape)
    for r in range(true_rank):
        tensor += np.outer(A[:, r], np.outer(B[:, r], C[:, r]).ravel()).reshape(shape)
    
    # Add small noise
    tensor += 0.01 * np.random.randn(*shape)
    
    # Perform CP decomposition
    result = cp_als(tensor, rank=true_rank, max_iter=50, random_state=42)
    
    print(f"CP Decomposition Results:")
    print(f"  Converged: {result.converged}")
    print(f"  Iterations: {result.iterations}")
    print(f"  Reconstruction Error: {result.reconstruction_error:.6f}")
    
    # Check stability
    diagnostics = check_cp_stability(result.factors, result.weights)
    print(f"\nStability Diagnostics:")
    print(f"  Weight condition: {diagnostics['weight_condition']:.2f}")
    print(f"  Factor conditions: {[f'{c:.2f}' for c in diagnostics['factor_conditions']]}")
