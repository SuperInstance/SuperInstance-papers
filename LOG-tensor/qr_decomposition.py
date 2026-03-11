"""
QR Decomposition Tiles
======================
Matrix decomposition: A = QR (orthogonal × upper triangular)

Numerically stable QR with composability.
"""

import numpy as np
from numpy.linalg import norm, qr
from typing import Tuple, Optional, List
from dataclasses import dataclass


@dataclass
class QRResult:
    """Result of QR decomposition."""
    Q: np.ndarray           # Orthogonal matrix
    R: np.ndarray           # Upper triangular matrix
    rank: int               # Numerical rank
    pivots: Optional[np.ndarray]  # Column pivots (for pivoted QR)
    reconstruction_error: float


def stable_qr(
    matrix: np.ndarray,
    pivoting: bool = False,
    check_finite: bool = True
) -> QRResult:
    """
    Numerically stable QR decomposition.
    
    Parameters
    ----------
    matrix : ndarray of shape (m, n)
    pivoting : bool
        Use column pivoting for rank-revealing QR
    check_finite : bool
    
    Returns
    -------
    QRResult
    """
    if check_finite:
        if not np.all(np.isfinite(matrix)):
            raise ValueError("Matrix contains non-finite values")
    
    m, n = matrix.shape
    
    if pivoting:
        # Rank-revealing QR
        Q, R, pivots = _pivoted_qr(matrix)
    else:
        Q, R = qr(matrix, mode='complete')
        pivots = None
    
    # Compute numerical rank
    tol = max(m, n) * np.finfo(matrix.dtype).eps * np.abs(R[0, 0]) if R.size > 0 else 0
    rank = np.sum(np.abs(np.diag(R)) > tol)
    
    # Reconstruction error
    reconstructed = Q @ R
    error = norm(matrix - reconstructed) / norm(matrix)
    
    return QRResult(
        Q=Q,
        R=R,
        rank=rank,
        pivots=pivots,
        reconstruction_error=error
    )


def _pivoted_qr(matrix: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Column-pivoted QR decomposition.
    
    Implements Businger-Golub pivoting strategy.
    """
    m, n = matrix.shape
    A = matrix.copy().astype(float)
    
    Q = np.eye(m)
    pivots = np.arange(n)
    
    for k in range(min(m, n)):
        # Find column with maximum 2-norm in remaining submatrix
        norms = np.array([norm(A[k:, j]) for j in range(k, n)])
        max_col = k + np.argmax(norms)
        
        # Swap columns
        if max_col != k:
            A[:, [k, max_col]] = A[:, [max_col, k]]
            pivots[[k, max_col]] = pivots[[max_col, k]]
        
        # Compute Householder reflection
        x = A[k:, k].copy()
        norm_x = norm(x)
        
        if norm_x > 0:
            # Choose sign to avoid cancellation
            sign = 1 if x[0] >= 0 else -1
            x[0] += sign * norm_x
            x = x / norm(x)
            
            # Apply reflection
            A[k:, k:] -= 2 * np.outer(x, x.T @ A[k:, k:])
            
            # Accumulate Q
            Q_k = np.eye(m)
            Q_k[k:, k:] -= 2 * np.outer(x, x)
            Q = Q @ Q_k
    
    return Q, A, pivots


def householder_qr(matrix: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    QR decomposition using Householder reflections.
    
    More stable than Gram-Schmidt for ill-conditioned matrices.
    """
    m, n = matrix.shape
    R = matrix.copy().astype(float)
    Q = np.eye(m)
    
    for k in range(min(m - 1, n)):
        # Compute Householder vector
        x = R[k:, k].copy()
        norm_x = norm(x)
        
        if norm_x < 1e-15:
            continue
        
        # Choose sign to maximize stability
        sign = 1 if x[0] >= 0 else -1
        x[0] += sign * norm_x
        v = x / norm(x)
        
        # Apply to R
        R[k:, k:] -= 2 * np.outer(v, v @ R[k:, k:])
        
        # Accumulate Q
        Q_k = np.eye(m)
        Q_k[k:, k:] -= 2 * np.outer(v, v)
        Q = Q @ Q_k
    
    return Q, R


def givens_qr(matrix: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    QR decomposition using Givens rotations.
    
    Better for sparse matrices and parallel implementation.
    """
    m, n = matrix.shape
    R = matrix.copy().astype(float)
    Q = np.eye(m)
    
    for j in range(n):
        for i in range(m - 1, j, -1):
            # Zero out R[i, j] using rotation in (i-1, i) plane
            if np.abs(R[i, j]) > 1e-15:
                c, s = _givens_rotation(R[i-1, j], R[i, j])
                
                # Apply Givens rotation to R
                G = np.array([[c, s], [-s, c]])
                R[[i-1, i], j:] = G @ R[[i-1, i], j:]
                
                # Accumulate Q
                Q[:, [i-1, i]] = Q[:, [i-1, i]] @ G.T
    
    return Q, R


def _givens_rotation(a: float, b: float) -> Tuple[float, float]:
    """
    Compute Givens rotation coefficients.
    
    Returns (c, s) such that:
    [c  s] [a]   [r]
    [-s c] [b] = [0]
    """
    if b == 0:
        return 1.0, 0.0
    elif a == 0:
        return 0.0, np.sign(b)
    else:
        r = np.sqrt(a**2 + b**2)
        c = a / r
        s = b / r
        return c, s


def modified_gram_schmidt(matrix: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Modified Gram-Schmidt QR decomposition.
    
    Better numerical stability than classical Gram-Schmidt.
    """
    m, n = matrix.shape
    Q = matrix.copy().astype(float)
    R = np.zeros((n, n))
    
    for k in range(min(m, n)):
        # Normalize k-th column
        R[k, k] = norm(Q[:, k])
        
        if R[k, k] > 1e-15:
            Q[:, k] /= R[k, k]
        
        # Orthogonalize remaining columns
        for j in range(k + 1, n):
            R[k, j] = Q[:, k] @ Q[:, j]
            Q[:, j] -= R[k, j] * Q[:, k]
    
    return Q, R


def qr_update_insert_column(
    Q: np.ndarray,
    R: np.ndarray,
    new_col: np.ndarray,
    pos: int
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Update QR decomposition after inserting a column.
    
    Parameters
    ----------
    Q : ndarray of shape (m, m)
    R : ndarray of shape (m, n)
    new_col : ndarray of shape (m,)
    pos : int
        Position to insert column
    
    Returns
    -------
    Q_new, R_new
    """
    m, n = R.shape
    
    # Project new column onto current Q
    w = Q.T @ new_col
    residual = new_col - Q @ w
    
    # Normalize residual
    norm_residual = norm(residual)
    
    if norm_residual > 1e-10:
        # Need to expand Q
        u = residual / norm_residual
        Q_new = np.hstack([Q, u.reshape(-1, 1)])
        
        # Expand R
        w_new = np.append(w, norm_residual)
    else:
        Q_new = Q
        w_new = w
    
    # Insert column into R
    R_new = np.zeros((m, n + 1))
    R_new[:, :pos] = R[:, :pos]
    R_new[:, pos] = w_new[:m]
    R_new[:, pos+1:] = R[:, pos:]
    
    return Q_new, R_new


def qr_delete_column(
    Q: np.ndarray,
    R: np.ndarray,
    pos: int
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Update QR decomposition after deleting a column.
    
    Uses Givens rotations to restore upper triangular form.
    """
    m, n = R.shape
    
    # Remove column
    R_new = np.delete(R, pos, axis=1)
    
    # Apply Givens rotations to restore upper triangular form
    for i in range(pos, min(m-1, n-1)):
        c, s = _givens_rotation(R_new[i, i], R_new[i+1, i])
        
        G = np.array([[c, s], [-s, c]])
        R_new[[i, i+1], i:] = G @ R_new[[i, i+1], i:]
        Q[:, [i, i+1]] = Q[:, [i, i+1]] @ G.T
    
    return Q, R_new


def least_squares_qr(
    A: np.ndarray,
    b: np.ndarray,
    pivoting: bool = True
) -> np.ndarray:
    """
    Solve least squares problem using QR decomposition.
    
    min ||Ax - b||_2
    
    Parameters
    ----------
    A : ndarray of shape (m, n)
    b : ndarray of shape (m,)
    pivoting : bool
    
    Returns
    -------
    x : ndarray of shape (n,)
    """
    m, n = A.shape
    
    result = stable_qr(A, pivoting=pivoting)
    
    # Solve R x = Q^T b
    Qtb = result.Q.T @ b
    
    # Back substitution
    x = np.zeros(n)
    for i in range(min(m, n) - 1, -1, -1):
        if i < n and np.abs(result.R[i, i]) > 1e-15:
            x[i] = (Qtb[i] - result.R[i, i+1:] @ x[i+1:]) / result.R[i, i]
    
    if pivoting and result.pivots is not None:
        x_pivoted = x.copy()
        x[result.pivots] = x_pivoted
    
    return x


class QRDecomposition:
    """
    Composable QR decomposition class.
    """
    
    def __init__(self, pivoting: bool = False, **kwargs):
        self.pivoting = pivoting
        self.kwargs = kwargs
        self.result_: Optional[QRResult] = None
    
    def fit(self, matrix: np.ndarray) -> 'QRDecomposition':
        """Fit QR decomposition."""
        self.result_ = stable_qr(matrix, pivoting=self.pivoting, **self.kwargs)
        return self
    
    def solve(self, b: np.ndarray) -> np.ndarray:
        """Solve Ax = b using QR."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        # Q^T b
        Qtb = self.result_.Q.T @ b
        
        # Back substitution
        return np.linalg.solve(self.result_.R[:self.result_.rank, :], 
                               Qtb[:self.result_.rank])
    
    def orthogonalize(self, vectors: np.ndarray) -> np.ndarray:
        """Orthogonalize vectors using Q."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        return self.result_.Q.T @ vectors
    
    def __matmul__(self, other: 'QRDecomposition') -> 'QRDecomposition':
        """Multiply QR decompositions."""
        if self.result_ is None or other.result_ is None:
            raise RuntimeError("Both decompositions must be fitted")
        
        # Q1 R1 @ Q2 R2 = Q1 (R1 Q2) R2
        # Need to QR factorize R1 Q2
        R1Q2 = self.result_.R @ other.result_.Q
        Q_mid, R_mid = qr(R1Q2)
        
        result = QRDecomposition()
        result.result_ = QRResult(
            Q=self.result_.Q @ Q_mid,
            R=R_mid @ other.result_.R,
            rank=min(self.result_.rank, other.result_.rank),
            pivots=None,
            reconstruction_error=0.0
        )
        return result
    
    @property
    def orthonormal_basis(self) -> np.ndarray:
        """Return orthonormal basis for column space."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        return self.result_.Q[:, :self.result_.rank]


if __name__ == "__main__":
    # Test QR decomposition
    np.random.seed(42)
    
    m, n = 50, 30
    A = np.random.randn(m, n)
    
    # Test stable QR
    result = stable_qr(A, pivoting=True)
    print(f"QR Decomposition Results:")
    print(f"  Shape Q: {result.Q.shape}, R: {result.R.shape}")
    print(f"  Rank: {result.rank}")
    print(f"  Reconstruction error: {result.reconstruction_error:.2e}")
    
    # Test orthogonality
    orthogonality_error = norm(result.Q.T @ result.Q - np.eye(m))
    print(f"  Orthogonality error: {orthogonality_error:.2e}")
    
    # Test least squares
    b = np.random.randn(m)
    x = least_squares_qr(A, b)
    residual = norm(A @ x - b)
    print(f"\nLeast Squares:")
    print(f"  Residual norm: {residual:.4f}")
    
    # Test different algorithms
    Q_house, R_house = householder_qr(A)
    Q_givens, R_givens = givens_qr(A)
    Q_mgs, R_mgs = modified_gram_schmidt(A)
    
    print(f"\nAlgorithm Comparison:")
    print(f"  Householder error: {norm(A - Q_house @ R_house) / norm(A):.2e}")
    print(f"  Givens error: {norm(A - Q_givens @ R_givens) / norm(A):.2e}")
    print(f"  MGS error: {norm(A - Q_mgs @ R_mgs) / norm(A):.2e}")
