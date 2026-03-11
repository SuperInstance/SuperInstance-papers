"""
Singular Value Decomposition (SVD) Tiles
========================================
Matrix decomposition: M = U Σ V'

Numerically stable SVD with composability.
"""

import numpy as np
from numpy.linalg import svd, norm
from typing import Tuple, Optional, List
from dataclasses import dataclass


@dataclass
class SVDResult:
    """Result of SVD decomposition."""
    U: np.ndarray           # Left singular vectors
    S: np.ndarray           # Singular values
    Vt: np.ndarray          # Right singular vectors (transposed)
    rank: int               # Numerical rank
    condition_number: float
    reconstruction_error: float


def stable_svd(
    matrix: np.ndarray,
    full_matrices: bool = True,
    compute_uv: bool = True,
    lapack_driver: str = 'gesdd'
) -> SVDResult:
    """
    Numerically stable SVD with diagnostics.
    
    Parameters
    ----------
    matrix : ndarray
        Input matrix of shape (m, n)
    full_matrices : bool
        If True, return full U and Vt
    compute_uv : bool
        If True, compute U and Vt; otherwise only S
    lapack_driver : str
        LAPACK routine to use ('gesdd' or 'gesvd')
    
    Returns
    -------
    SVDResult
    """
    m, n = matrix.shape
    
    # Use numpy's SVD (wraps LAPACK)
    U, S, Vt = svd(matrix, full_matrices=full_matrices, compute_uv=compute_uv)
    
    # Compute numerical rank
    tol = max(m, n) * np.finfo(matrix.dtype).eps * S[0]
    rank = np.sum(S > tol)
    
    # Condition number
    cond = S[0] / S[-1] if S[-1] > 0 else np.inf
    
    # Reconstruction error
    if compute_uv and full_matrices:
        reconstructed = U @ np.diag(S) @ Vt[:S.size, :]
        error = norm(matrix - reconstructed) / norm(matrix)
    else:
        error = 0.0
    
    return SVDResult(
        U=U,
        S=S,
        Vt=Vt,
        rank=rank,
        condition_number=cond,
        reconstruction_error=error
    )


def truncated_svd(
    matrix: np.ndarray,
    rank: Optional[int] = None,
    energy_threshold: Optional[float] = None,
    tol: float = 1e-10
) -> SVDResult:
    """
    Truncated SVD for low-rank approximation.
    
    Parameters
    ----------
    matrix : ndarray
    rank : int, optional
        Target rank
    energy_threshold : float, optional
        Preserve this fraction of energy (0-1)
    tol : float
        Tolerance for determining effective rank
    
    Returns
    -------
    SVDResult
    """
    U, S, Vt = svd(matrix, full_matrices=False)
    
    m, n = matrix.shape
    
    # Determine truncation rank
    if rank is not None:
        k = min(rank, len(S))
    elif energy_threshold is not None:
        energy = np.cumsum(S**2) / np.sum(S**2)
        k = np.searchsorted(energy, energy_threshold) + 1
    else:
        # Automatic rank determination
        k = np.sum(S > tol * S[0])
    
    # Truncate
    U_k = U[:, :k]
    S_k = S[:k]
    Vt_k = Vt[:k, :]
    
    # Compute error
    reconstructed = U_k @ np.diag(S_k) @ Vt_k
    error = norm(matrix - reconstructed) / norm(matrix)
    
    return SVDResult(
        U=U_k,
        S=S_k,
        Vt=Vt_k,
        rank=k,
        condition_number=S[0] / S_k[-1] if S_k[-1] > 0 else np.inf,
        reconstruction_error=error
    )


def randomized_svd(
    matrix: np.ndarray,
    rank: int,
    oversampling: int = 10,
    power_iterations: int = 2,
    random_state: Optional[int] = None
) -> SVDResult:
    """
    Randomized SVD for large matrices.
    
    Faster than standard SVD for low-rank approximations.
    
    Parameters
    ----------
    matrix : ndarray of shape (m, n)
    rank : int
        Target rank
    oversampling : int
        Additional samples for accuracy
    power_iterations : int
        Number of power iterations for improved accuracy
    random_state : int, optional
    
    Returns
    -------
    SVDResult
    """
    if random_state is not None:
        np.random.seed(random_state)
    
    m, n = matrix.shape
    k = rank + oversampling
    
    # Random projection
    Omega = np.random.randn(n, k)
    Y = matrix @ Omega
    
    # Power iterations for improved accuracy
    for _ in range(power_iterations):
        Y = matrix @ (matrix.T @ Y)
    
    # Orthonormalize
    Q, _ = np.linalg.qr(Y)
    
    # Project and SVD
    B = Q.T @ matrix
    U_tilde, S, Vt = svd(B, full_matrices=False)
    
    # Map back
    U = Q @ U_tilde
    
    # Truncate to desired rank
    U = U[:, :rank]
    S = S[:rank]
    Vt = Vt[:rank, :]
    
    # Compute error
    reconstructed = U @ np.diag(S) @ Vt
    error = norm(matrix - reconstructed) / norm(matrix)
    
    return SVDResult(
        U=U,
        S=S,
        Vt=Vt,
        rank=rank,
        condition_number=S[0] / S[-1] if S[-1] > 0 else np.inf,
        reconstruction_error=error
    )


def svd_update(
    U: np.ndarray,
    S: np.ndarray,
    Vt: np.ndarray,
    update_matrix: np.ndarray,
    rank: Optional[int] = None
) -> SVDResult:
    """
    Update SVD with new data (Brand's algorithm).
    
    Efficiently updates SVD when adding rows/columns.
    """
    m, r = U.shape
    n = Vt.shape[1]
    
    # Project update onto current singular space
    p = U.T @ update_matrix
    
    # Residual
    residual = update_matrix - U @ p
    
    # QR of residual
    Q, R = np.linalg.qr(residual)
    
    # Construct block matrix for SVD
    block = np.block([
        [np.diag(S), p],
        [np.zeros((Q.shape[1], r)), R]
    ])
    
    # SVD of block
    U_hat, S_hat, Vt_hat = svd(block, full_matrices=False)
    
    # Update U
    U_new = np.hstack([U, Q]) @ U_hat
    V_new = np.vstack([Vt, np.eye(update_matrix.shape[1] - n) if update_matrix.shape[1] > n else np.zeros((0, 0))])
    
    # Actually need proper V update
    V_new = Vt.T @ Vt_hat[:r, :].T
    
    # Truncate if rank specified
    if rank is not None:
        U_new = U_new[:, :rank]
        S_hat = S_hat[:rank]
    
    return SVDResult(
        U=U_new,
        S=S_hat,
        Vt=V_new.T,
        rank=len(S_hat),
        condition_number=S_hat[0] / S_hat[-1] if S_hat[-1] > 0 else np.inf,
        reconstruction_error=0.0
    )


def procrustes_svd(A: np.ndarray, B: np.ndarray) -> Tuple[np.ndarray, float]:
    """
    Solve orthogonal Procrustes problem via SVD.
    
    Find orthogonal Q that minimizes ||A Q - B||_F
    
    Returns
    -------
    Q : ndarray
        Optimal orthogonal matrix
    error : float
        Procrustes error
    """
    U, S, Vt = svd(A.T @ B, full_matrices=False)
    Q = U @ Vt
    
    error = norm(A @ Q - B, 'fro')
    
    return Q, error


def svd_pseudoinverse(
    matrix: np.ndarray,
    tol: float = 1e-10,
    condition_limit: Optional[float] = None
) -> np.ndarray:
    """
    Compute pseudoinverse using SVD with numerical stability.
    
    Parameters
    ----------
    matrix : ndarray
    tol : float
        Minimum singular value to invert
    condition_limit : float, optional
        Maximum allowed condition number
    
    Returns
    -------
    ndarray
        Pseudoinverse of matrix
    """
    U, S, Vt = svd(matrix, full_matrices=False)
    
    # Determine which singular values to invert
    if condition_limit is not None and S[0] > 0:
        tol = max(tol, S[0] / condition_limit)
    
    mask = S > tol
    
    # Compute pseudoinverse
    S_inv = np.zeros_like(S)
    S_inv[mask] = 1.0 / S[mask]
    
    return Vt.T @ np.diag(S_inv) @ U.T


class SVDDecomposition:
    """
    Composable SVD decomposition class.
    """
    
    def __init__(self, rank: Optional[int] = None,
                 method: str = 'truncated',
                 **kwargs):
        self.rank = rank
        self.method = method
        self.kwargs = kwargs
        self.result_: Optional[SVDResult] = None
    
    def fit(self, matrix: np.ndarray) -> 'SVDDecomposition':
        """Fit SVD decomposition."""
        if self.method == 'truncated':
            self.result_ = truncated_svd(matrix, rank=self.rank, **self.kwargs)
        elif self.method == 'randomized':
            if self.rank is None:
                raise ValueError("Rank must be specified for randomized SVD")
            self.result_ = randomized_svd(matrix, self.rank, **self.kwargs)
        elif self.method == 'stable':
            self.result_ = stable_svd(matrix, **self.kwargs)
        else:
            raise ValueError(f"Unknown method: {self.method}")
        
        return self
    
    def transform(self, matrix: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Transform matrix to low-rank representation."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        # Project onto singular vectors
        return self.result_.U.T @ matrix, matrix @ self.result_.Vt.T
    
    def inverse_transform(self, coefficients: Optional[np.ndarray] = None) -> np.ndarray:
        """Reconstruct matrix."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        if coefficients is None:
            return self.result_.U @ np.diag(self.result_.S) @ self.result_.Vt
        return self.result_.U @ coefficients @ self.result_.Vt
    
    def __matmul__(self, other: 'SVDDecomposition') -> 'SVDDecomposition':
        """Compose two SVD decompositions (matrix multiplication)."""
        if self.result_ is None or other.result_ is None:
            raise RuntimeError("Both decompositions must be fitted")
        
        # Compute product of low-rank approximations
        inner = np.diag(self.result_.S) @ self.result_.Vt @ other.result_.U @ np.diag(other.result_.S)
        
        # SVD of result
        U, S, Vt = svd(inner, full_matrices=False)
        
        result = SVDDecomposition()
        result.result_ = SVDResult(
            U=self.result_.U @ U,
            S=S,
            Vt=Vt @ other.result_.Vt,
            rank=len(S),
            condition_number=S[0] / S[-1] if S[-1] > 0 else np.inf,
            reconstruction_error=0.0
        )
        return result
    
    @property
    def explained_variance_ratio(self) -> np.ndarray:
        """Compute explained variance ratio."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        return self.result_.S**2 / np.sum(self.result_.S**2)


if __name__ == "__main__":
    # Test SVD decomposition
    np.random.seed(42)
    
    # Create a low-rank matrix
    m, n, rank = 100, 80, 10
    U_true = np.random.randn(m, rank)
    V_true = np.random.randn(n, rank)
    matrix = U_true @ V_true.T
    
    # Add noise
    matrix += 0.1 * np.random.randn(m, n)
    
    # Test truncated SVD
    result = truncated_svd(matrix, rank=rank)
    print(f"Truncated SVD (rank={rank}):")
    print(f"  Condition number: {result.condition_number:.2f}")
    print(f"  Reconstruction error: {result.reconstruction_error:.6f}")
    print(f"  Numerical rank: {result.rank}")
    
    # Test randomized SVD
    result_rand = randomized_svd(matrix, rank=rank, random_state=42)
    print(f"\nRandomized SVD:")
    print(f"  Reconstruction error: {result_rand.reconstruction_error:.6f}")
    
    # Test pseudoinverse
    pinv = svd_pseudoinverse(matrix[:50, :50])
    error = norm(matrix[:50, :50] @ pinv @ matrix[:50, :50] - matrix[:50, :50])
    print(f"\nPseudoinverse test:")
    print(f"  ||A @ A+ @ A - A||: {error:.2e}")
