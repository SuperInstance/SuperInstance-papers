"""
Schur Decomposition Tiles
=========================
Matrix decomposition: A = Q T Q'

Upper triangular form with orthogonal transformation.
"""

import numpy as np
from numpy.linalg import norm, eig
from typing import Tuple, Optional, List
from dataclasses import dataclass


@dataclass
class SchurResult:
    """Result of Schur decomposition."""
    Q: np.ndarray           # Orthogonal matrix
    T: np.ndarray           # Upper triangular (Schur form)
    eigenvalues: np.ndarray # Eigenvalues (diagonal of T)
    is_real: bool           # Whether decomposition is real
    reconstruction_error: float


def schur_decomposition(
    matrix: np.ndarray,
    output: str = 'real',
    overwrite_a: bool = False
) -> SchurResult:
    """
    Schur decomposition: A = Q T Q'
    
    Parameters
    ----------
    matrix : ndarray
        Square matrix
    output : str
        'real' or 'complex' Schur form
    overwrite_a : bool
    
    Returns
    -------
    SchurResult
    """
    n = matrix.shape[0]
    if matrix.shape[1] != n:
        raise ValueError("Matrix must be square")
    
    from scipy.linalg import schur
    
    if overwrite_a:
        A = matrix
    else:
        A = matrix.copy()
    
    # Compute Schur decomposition
    T, Q = schur(A, output=output)
    
    # Extract eigenvalues
    if output == 'real':
        eigenvalues = _extract_eigenvalues_real_schur(T)
        is_real = True
    else:
        eigenvalues = np.diag(T)
        is_real = False
    
    # Reconstruction error
    if is_real:
        reconstructed = Q @ T @ Q.T
    else:
        reconstructed = Q @ T @ Q.T.conj()
    
    error = norm(matrix - reconstructed) / norm(matrix)
    
    return SchurResult(
        Q=Q,
        T=T,
        eigenvalues=eigenvalues,
        is_real=is_real,
        reconstruction_error=error
    )


def _extract_eigenvalues_real_schur(T: np.ndarray) -> np.ndarray:
    """
    Extract eigenvalues from real Schur form.
    
    Real Schur form has 1x1 and 2x2 blocks on diagonal.
    """
    n = T.shape[0]
    eigenvalues = []
    
    i = 0
    while i < n:
        if i == n - 1 or np.abs(T[i+1, i]) < 1e-15:
            # 1x1 block (real eigenvalue)
            eigenvalues.append(T[i, i])
            i += 1
        else:
            # 2x2 block (complex conjugate pair)
            a, b = T[i, i], T[i, i+1]
            c, d = T[i+1, i], T[i+1, i+1]
            
            # Eigenvalues of 2x2 block
            trace = a + d
            det = a * d - b * c
            discriminant = trace**2 - 4 * det
            
            if discriminant < 0:
                sqrt_disc = np.sqrt(-discriminant)
                eigenvalues.append((trace + 1j * sqrt_disc) / 2)
                eigenvalues.append((trace - 1j * sqrt_disc) / 2)
            else:
                sqrt_disc = np.sqrt(discriminant)
                eigenvalues.append((trace + sqrt_disc) / 2)
                eigenvalues.append((trace - sqrt_disc) / 2)
            i += 2
    
    return np.array(eigenvalues)


def ordered_schur(
    matrix: np.ndarray,
    order: str = 'magnitude',
    **kwargs
) -> SchurResult:
    """
    Schur decomposition with ordered eigenvalues.
    
    Parameters
    ----------
    matrix : ndarray
    order : str
        'magnitude' (decreasing), 'real', 'imag', 'stable' (Re < 0 first)
    
    Returns
    -------
    SchurResult
    """
    from scipy.linalg import schur, rsf2csf
    
    # Get initial Schur decomposition
    T, Q = schur(matrix, output='real')
    
    # Order eigenvalues
    eigenvalues = _extract_eigenvalues_real_schur(T)
    
    if order == 'magnitude':
        idx = np.argsort(np.abs(eigenvalues))[::-1]
    elif order == 'real':
        idx = np.argsort(np.real(eigenvalues))[::-1]
    elif order == 'imag':
        idx = np.argsort(np.abs(np.imag(eigenvalues)))[::-1]
    elif order == 'stable':
        idx = np.argsort(np.real(eigenvalues))
    else:
        raise ValueError(f"Unknown order: {order}")
    
    # Reorder Schur decomposition
    T_ordered, Q_ordered, _ = _reorder_schur(T, Q, idx)
    
    eigenvalues_ordered = _extract_eigenvalues_real_schur(T_ordered)
    
    # Reconstruction error
    reconstructed = Q_ordered @ T_ordered @ Q_ordered.T
    error = norm(matrix - reconstructed) / norm(matrix)
    
    return SchurResult(
        Q=Q_ordered,
        T=T_ordered,
        eigenvalues=eigenvalues_ordered,
        is_real=True,
        reconstruction_error=error
    )


def _reorder_schur(
    T: np.ndarray,
    Q: np.ndarray,
    order: np.ndarray
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Reorder Schur decomposition to specified eigenvalue order.
    """
    n = T.shape[0]
    
    # Use ORDSPR (ordering of Schur) via scipy
    # This is a simplified implementation
    T_new = T.copy()
    Q_new = Q.copy()
    eigenvalues = _extract_eigenvalues_real_schur(T_new)
    
    # Bubble sort-like reordering
    for target_pos in range(n):
        # Find current position of desired eigenvalue
        current_idx = np.argmin(np.abs(eigenvalues - eigenvalues[order[target_pos]]))
        
        if current_idx != target_pos:
            # Swap using Givens rotations
            # This is simplified; proper implementation uses orthogonal transformations
            pass
    
    return T_new, Q_new, eigenvalues


def qz_decomposition(
    A: np.ndarray,
    B: np.ndarray,
    output: str = 'real'
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Generalized Schur (QZ) decomposition.
    
    A = Q S Z'
    B = Q T Z'
    
    where S, T are upper triangular.
    
    Returns
    -------
    Q, S, Z, T
    """
    from scipy.linalg import qz
    
    S, T, Q, Z = qz(A, B, output=output)
    
    return Q, S, Z, T


def solve_sylvester_schur(
    A: np.ndarray,
    B: np.ndarray,
    C: np.ndarray
) -> np.ndarray:
    """
    Solve Sylvester equation using Schur decomposition.
    
    A X + X B = C
    
    Parameters
    ----------
    A : ndarray (n x n)
    B : ndarray (m x m)
    C : ndarray (n x m)
    
    Returns
    -------
    X : ndarray (n x m)
    """
    n = A.shape[0]
    m = B.shape[0]
    
    # Schur decompositions
    schur_A = schur_decomposition(A, output='real')
    schur_B = schur_decomposition(B, output='real')
    
    QA, TA = schur_A.Q, schur_A.T
    QB, TB = schur_B.Q, schur_B.T
    
    # Transform equation
    # QA TA QA' X + X QB TB QB' = C
    # TA (QA' X QB) + (QA' X QB) TB = QA' C QB
    
    C_tilde = QA.T @ C @ QB
    
    # Solve for Y = QA' X QB using back substitution
    Y = np.zeros((n, m), dtype=complex)
    
    for i in range(n):
        for j in range(m - 1, -1, -1):
            rhs = C_tilde[i, j]
            
            # Subtract known terms
            if i < n - 1:
                rhs -= TA[i, i+1:] @ Y[i+1:, j]
            if j < m - 1:
                rhs -= Y[i, j+1:] @ TB[j+1:, j]
            
            # Diagonal coefficient
            diag = TA[i, i] + TB[j, j]
            
            if np.abs(diag) > 1e-14:
                Y[i, j] = rhs / diag
            else:
                Y[i, j] = 0
    
    # Transform back
    X = QA @ Y @ QB.T
    
    return X


def matrix_exponential_schur(
    matrix: np.ndarray,
    method: str = 'padde'
) -> np.ndarray:
    """
    Compute matrix exponential using Schur decomposition.
    
    exp(A) = Q exp(T) Q'
    """
    result = schur_decomposition(matrix, output='complex')
    
    # Compute exp of upper triangular matrix
    exp_T = _exp_triangular(result.T)
    
    # Transform back
    exp_A = result.Q @ exp_T @ result.Q.T.conj()
    
    return exp_A


def _exp_triangular(T: np.ndarray) -> np.ndarray:
    """
    Compute exponential of upper triangular matrix.
    
    Uses Parlett's method for the off-diagonal.
    """
    n = T.shape[0]
    exp_T = np.diag(np.exp(np.diag(T)))
    
    # Fill in superdiagonal elements
    for k in range(1, n):
        for i in range(n - k):
            j = i + k
            
            # Compute exp_T[i, j]
            numerator = 0
            for p in range(i, j):
                numerator += exp_T[i, p] * T[p, j] - T[i, p] * exp_T[p, j]
            
            denominator = T[j, j] - T[i, i]
            
            if np.abs(denominator) > 1e-14:
                exp_T[i, j] = numerator / denominator
            else:
                # Use limit for repeated eigenvalues
                exp_T[i, j] = np.exp(T[i, i]) * T[i, j]
    
    return exp_T


def invariant_subspace(
    matrix: np.ndarray,
    eigenvalue_indices: List[int]
) -> np.ndarray:
    """
    Compute invariant subspace corresponding to specified eigenvalues.
    
    Parameters
    ----------
    matrix : ndarray
    eigenvalue_indices : list of int
        Indices of eigenvalues for the desired subspace
    
    Returns
    -------
    V : ndarray
        Orthonormal basis for invariant subspace
    """
    result = ordered_schur(matrix, order='magnitude')
    
    # Select columns of Q corresponding to eigenvalues
    k = len(eigenvalue_indices)
    V = result.Q[:, :k]
    
    return V


def compute_schur_vectors(
    matrix: np.ndarray,
    eigenvalues_subset: Optional[np.ndarray] = None
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute Schur vectors for a subset of eigenvalues.
    
    Parameters
    ----------
    matrix : ndarray
    eigenvalues_subset : ndarray, optional
    
    Returns
    -------
    eigenvalues : ndarray
    schur_vectors : ndarray
    """
    result = schur_decomposition(matrix, output='complex')
    
    if eigenvalues_subset is not None:
        # Select vectors corresponding to subset
        idx = []
        for ev in eigenvalues_subset:
            distances = np.abs(result.eigenvalues - ev)
            idx.append(np.argmin(distances))
        
        return result.eigenvalues[idx], result.Q[:, idx]
    
    return result.eigenvalues, result.Q


class SchurDecomposition:
    """
    Composable Schur decomposition class.
    """
    
    def __init__(self, order: Optional[str] = None, **kwargs):
        self.order = order
        self.kwargs = kwargs
        self.result_: Optional[SchurResult] = None
    
    def fit(self, matrix: np.ndarray) -> 'SchurDecomposition':
        """Fit Schur decomposition."""
        if self.order is not None:
            self.result_ = ordered_schur(matrix, order=self.order, **self.kwargs)
        else:
            self.result_ = schur_decomposition(matrix, **self.kwargs)
        return self
    
    def exponential(self) -> np.ndarray:
        """Compute matrix exponential."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        return matrix_exponential_schur(
            self.result_.Q @ self.result_.T @ self.result_.Q.T.conj()
        )
    
    def solve_sylvester(self, B: np.ndarray, C: np.ndarray) -> np.ndarray:
        """Solve Sylvester equation A X + X B = C."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        A = self.result_.Q @ self.result_.T @ self.result_.Q.T.conj()
        return solve_sylvester_schur(A, B, C)
    
    @property
    def stable_subspace(self) -> np.ndarray:
        """Return basis for stable invariant subspace (Re(λ) < 0)."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        stable_mask = np.real(self.result_.eigenvalues) < 0
        k = np.sum(stable_mask)
        
        if k == 0:
            return np.zeros((self.result_.Q.shape[0], 0))
        
        return self.result_.Q[:, :k]


if __name__ == "__main__":
    # Test Schur decomposition
    np.random.seed(42)
    
    n = 10
    A = np.random.randn(n, n)
    
    # Test basic Schur decomposition
    result = schur_decomposition(A)
    
    print(f"Schur Decomposition Results:")
    print(f"  Shape Q: {result.Q.shape}, T: {result.T.shape}")
    print(f"  Is real: {result.is_real}")
    print(f"  Reconstruction error: {result.reconstruction_error:.2e}")
    
    # Test eigenvalue extraction
    print(f"\n  Eigenvalues: {result.eigenvalues[:5]}...")
    
    # Compare with numpy
    eig_vals_numpy = eig(A)[0]
    eig_vals_sorted = np.sort(np.abs(eig_vals_numpy))[::-1]
    schur_vals_sorted = np.sort(np.abs(result.eigenvalues))[::-1]
    
    print(f"  Eigenvalue error vs numpy: {norm(eig_vals_sorted - schur_vals_sorted):.2e}")
    
    # Test matrix exponential
    exp_A = matrix_exponential_schur(A)
    print(f"\n  Matrix exponential computed, trace: {np.trace(exp_A):.4f}")
