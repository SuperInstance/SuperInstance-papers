"""
Tucker Decomposition Tiles
==========================
Tensor decomposition: T = G ×₁ A ×₂ B ×₃ C

Higher-order SVD with numerical stability.
"""

import numpy as np
from numpy.linalg import norm, svd, qr
from typing import Tuple, List, Optional
from dataclasses import dataclass


@dataclass
class TuckerResult:
    """Result of Tucker decomposition."""
    core: np.ndarray              # Core tensor
    factors: List[np.ndarray]     # Factor matrices
    reconstruction_error: float
    explained_variance: float
    shape: Tuple[int, ...]
    rank: Tuple[int, ...]


def mode_n_product(tensor: np.ndarray, matrix: np.ndarray, mode: int) -> np.ndarray:
    """
    Mode-n product of tensor with matrix.
    
    Parameters
    ----------
    tensor : ndarray
    matrix : ndarray of shape (J, tensor.shape[mode])
    mode : int
    
    Returns
    -------
    ndarray
    """
    shape = list(tensor.shape)
    shape[mode] = matrix.shape[0]
    
    # Unfold, multiply, fold
    unfolded = unfold_tensor(tensor, mode)
    result = matrix @ unfolded
    
    return fold_tensor(result, mode, tuple(shape))


def unfold_tensor(tensor: np.ndarray, mode: int) -> np.ndarray:
    """Unfold tensor along specified mode."""
    ndim = tensor.ndim
    modes = list(range(ndim))
    modes[0], modes[mode] = modes[mode], modes[0]
    return np.transpose(tensor, modes).reshape(tensor.shape[mode], -1)


def fold_tensor(matrix: np.ndarray, mode: int, shape: Tuple[int, ...]) -> np.ndarray:
    """Fold matrix back to tensor along specified mode."""
    ndim = len(shape)
    modes = list(range(ndim))
    modes[0], modes[mode] = modes[mode], modes[0]
    
    trans_shape = [shape[m] for m in modes]
    tensor = matrix.reshape(trans_shape)
    
    inv_modes = [0] * ndim
    for i, m in enumerate(modes):
        inv_modes[m] = i
    
    return np.transpose(tensor, inv_modes)


def hosvd(
    tensor: np.ndarray,
    ranks: Optional[Tuple[int, ...]] = None,
    tol: float = 1e-10,
    compute_core: bool = True
) -> TuckerResult:
    """
    Higher-Order SVD (HOSVD) for Tucker decomposition.
    
    T = G ×₁ A ×₂ B ×₃ C × ... (for each mode)
    
    Parameters
    ----------
    tensor : ndarray
        Input tensor
    ranks : tuple of int, optional
        Target rank for each mode. If None, use full rank.
    tol : float
        Tolerance for truncating singular values
    compute_core : bool
        Whether to compute the core tensor
    
    Returns
    -------
    TuckerResult
    """
    ndim = tensor.ndim
    shape = tensor.shape
    
    if ranks is None:
        ranks = shape
    
    factors = []
    explained_vars = []
    
    for mode in range(ndim):
        # Unfold along mode
        X_n = unfold_tensor(tensor, mode)
        
        # SVD
        U, S, Vt = svd(X_n, full_matrices=False)
        
        # Determine effective rank
        if ranks[mode] < len(S):
            # Compute explained variance
            total_var = np.sum(S**2)
            explained = np.sum(S[:ranks[mode]]**2) / total_var
            explained_vars.append(explained)
            
            # Truncate
            U = U[:, :ranks[mode]]
        else:
            explained_vars.append(1.0)
        
        factors.append(U)
    
    # Compute core tensor
    if compute_core:
        core = tensor.copy()
        for mode in range(ndim):
            core = mode_n_product(core, factors[mode].T, mode)
    else:
        core = None
    
    # Compute reconstruction error
    if compute_core:
        reconstructed = reconstruct_tucker(core, factors)
        error = norm(tensor - reconstructed) / norm(tensor)
    else:
        error = np.inf
    
    return TuckerResult(
        core=core,
        factors=factors,
        reconstruction_error=error,
        explained_variance=np.mean(explained_vars),
        shape=shape,
        rank=ranks
    )


def hooi(
    tensor: np.ndarray,
    ranks: Tuple[int, ...],
    max_iter: int = 100,
    tol: float = 1e-8,
    reg: float = 1e-10,
    init: Optional[List[np.ndarray]] = None,
    random_state: Optional[int] = None
) -> TuckerResult:
    """
    Higher-Order Orthogonal Iteration (HOOI) for Tucker decomposition.
    
    Iteratively refines the factor matrices for better compression.
    
    Parameters
    ----------
    tensor : ndarray
    ranks : tuple of int
        Target rank for each mode
    max_iter : int
        Maximum iterations
    tol : float
        Convergence tolerance
    reg : float
        Regularization for numerical stability
    init : list of ndarray, optional
        Initial factor matrices
    random_state : int, optional
    
    Returns
    -------
    TuckerResult
    """
    if random_state is not None:
        np.random.seed(random_state)
    
    ndim = tensor.ndim
    shape = tensor.shape
    
    # Initialize factors (HOSVD or random)
    if init is None:
        result = hosvd(tensor, ranks, compute_core=False)
        factors = result.factors
    else:
        factors = [f.copy() for f in init]
    
    tensor_norm = norm(tensor)
    prev_error = np.inf
    
    for iteration in range(max_iter):
        # Update each factor
        for mode in range(ndim):
            # Compute projected tensor (exclude current mode)
            Y = tensor.copy()
            for m in range(ndim):
                if m != mode:
                    Y = mode_n_product(Y, factors[m].T, m)
            
            # Unfold and SVD
            Y_unfolded = unfold_tensor(Y, mode)
            
            # Add regularization for stability
            YTY = Y_unfolded @ Y_unfolded.T + reg * np.eye(Y_unfolded.shape[0])
            
            # Eigendecomposition for leading eigenvectors
            eigvals, eigvecs = np.linalg.eigh(YTY)
            
            # Sort in descending order
            idx = np.argsort(eigvals)[::-1]
            eigvecs = eigvecs[:, idx]
            
            # Take top-r eigenvectors
            factors[mode] = eigvecs[:, :ranks[mode]]
        
        # Compute core and error
        core = tensor.copy()
        for mode in range(ndim):
            core = mode_n_product(core, factors[mode].T, mode)
        
        reconstructed = reconstruct_tucker(core, factors)
        error = norm(tensor - reconstructed) / tensor_norm
        
        if np.abs(prev_error - error) < tol:
            break
        
        prev_error = error
    
    return TuckerResult(
        core=core,
        factors=factors,
        reconstruction_error=error,
        explained_variance=1.0 - error,
        shape=shape,
        rank=ranks
    )


def reconstruct_tucker(core: np.ndarray, factors: List[np.ndarray]) -> np.ndarray:
    """
    Reconstruct tensor from Tucker decomposition.
    
    T = G ×₁ A ×₂ B ×₃ C × ...
    """
    result = core.copy()
    for mode, F in enumerate(factors):
        result = mode_n_product(result, F, mode)
    return result


def truncated_tucker(
    tensor: np.ndarray,
    energy_threshold: float = 0.99,
    max_rank: Optional[Tuple[int, ...]] = None
) -> TuckerResult:
    """
    Truncated Tucker decomposition preserving specified energy.
    
    Automatically determines ranks to preserve energy_threshold of variance.
    """
    ndim = tensor.ndim
    shape = tensor.shape
    
    if max_rank is None:
        max_rank = shape
    
    # Determine ranks based on singular value energy
    ranks = []
    explained_vars = []
    
    for mode in range(ndim):
        X_n = unfold_tensor(tensor, mode)
        U, S, Vt = svd(X_n, full_matrices=False)
        
        # Find rank preserving energy
        energy = np.cumsum(S**2) / np.sum(S**2)
        rank = np.searchsorted(energy, energy_threshold) + 1
        rank = min(rank, max_rank[mode], len(S))
        ranks.append(rank)
        
        explained_vars.append(energy[rank-1])
    
    return hosvd(tensor, tuple(ranks))


class TuckerDecomposition:
    """
    Composable Tucker decomposition class.
    """
    
    def __init__(self, ranks: Optional[Tuple[int, ...]] = None,
                 method: str = 'hooi', **kwargs):
        self.ranks = ranks
        self.method = method
        self.kwargs = kwargs
        self.result_: Optional[TuckerResult] = None
    
    def fit(self, tensor: np.ndarray) -> 'TuckerDecomposition':
        """Fit Tucker decomposition."""
        if self.ranks is None:
            self.ranks = tensor.shape
        
        if self.method == 'hosvd':
            self.result_ = hosvd(tensor, self.ranks, **self.kwargs)
        elif self.method == 'hooi':
            self.result_ = hooi(tensor, self.ranks, **self.kwargs)
        else:
            raise ValueError(f"Unknown method: {self.method}")
        
        return self
    
    def transform(self, tensor: np.ndarray) -> np.ndarray:
        """Project tensor onto core space."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        core = tensor.copy()
        for mode, F in enumerate(self.result_.factors):
            core = mode_n_product(core, F.T, mode)
        return core
    
    def inverse_transform(self, core: Optional[np.ndarray] = None) -> np.ndarray:
        """Reconstruct tensor from core."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        if core is None:
            core = self.result_.core
        
        return reconstruct_tucker(core, self.result_.factors)
    
    def __matmul__(self, other: 'TuckerDecomposition') -> 'TuckerDecomposition':
        """Compose Tucker decompositions."""
        # Element-wise composition of cores
        new_ranks = tuple(min(r1, r2) for r1, r2 in zip(self.ranks, other.ranks))
        return TuckerDecomposition(new_ranks, self.method)
    
    @property
    def compression_ratio(self) -> float:
        """Compute compression ratio."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        original_size = np.prod(self.result_.shape)
        compressed_size = np.prod(self.result_.core.shape) + sum(
            np.prod(f.shape) for f in self.result_.factors
        )
        return original_size / compressed_size


def tucker_to_cp(tucker_result: TuckerResult) -> Tuple[np.ndarray, List[np.ndarray]]:
    """
    Convert Tucker to CP representation (approximate).
    
    Returns weights and factors for CP decomposition.
    """
    # SVD of core tensor
    core = tucker_result.core
    ndim = core.ndim
    
    # Unfold core and get singular values
    weights_list = []
    for mode in range(ndim):
        _, S, _ = svd(unfold_tensor(core, mode), full_matrices=False)
        weights_list.append(S)
    
    # Use average singular values as weights
    min_len = min(len(w) for w in weights_list)
    weights = np.mean([w[:min_len] for w in weights_list], axis=0)
    
    # Factors are factor matrices
    factors = tucker_result.factors
    
    return weights, factors


if __name__ == "__main__":
    # Test Tucker decomposition
    np.random.seed(42)
    
    # Create a tensor with Tucker structure
    shape = (6, 8, 10)
    ranks = (3, 4, 5)
    
    # Generate random core and factors
    core = np.random.randn(*ranks)
    factors = [np.random.randn(shape[i], ranks[i]) for i in range(3)]
    
    # Create tensor
    tensor = reconstruct_tucker(core, factors)
    
    # Add noise
    tensor += 0.1 * np.random.randn(*shape)
    
    # Perform HOSVD
    result_hosvd = hosvd(tensor, ranks)
    print(f"HOSVD Results:")
    print(f"  Reconstruction Error: {result_hosvd.reconstruction_error:.6f}")
    print(f"  Explained Variance: {result_hosvd.explained_variance:.4f}")
    
    # Perform HOOI
    result_hooi = hooi(tensor, ranks, max_iter=50, random_state=42)
    print(f"\nHOOI Results:")
    print(f"  Reconstruction Error: {result_hooi.reconstruction_error:.6f}")
    print(f"  Explained Variance: {result_hooi.explained_variance:.4f}")
    
    # Test compression ratio
    decomp = TuckerDecomposition(ranks, method='hooi', random_state=42)
    decomp.fit(tensor)
    print(f"\nCompression Ratio: {decomp.compression_ratio:.2f}x")
