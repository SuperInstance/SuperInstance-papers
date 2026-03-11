"""
Eigenvalue Decomposition Tiles
=============================
Matrix decomposition: A = V Λ V⁻¹ (or V Λ V' for symmetric)

Numerically stable eigenvalue algorithms.
"""

import numpy as np
from numpy.linalg import eig, eigh, norm, solve
from typing import Tuple, Optional, List
from dataclasses import dataclass


@dataclass
class EigResult:
    """Result of eigenvalue decomposition."""
    values: np.ndarray       # Eigenvalues
    vectors: np.ndarray      # Eigenvectors (columns)
    is_hermitian: bool
    condition_numbers: np.ndarray
    reconstruction_error: float


def stable_eig(
    matrix: np.ndarray,
    assume_hermitian: bool = False,
    balance: bool = True
) -> EigResult:
    """
    Numerically stable eigenvalue decomposition.
    
    Parameters
    ----------
    matrix : ndarray
        Square matrix
    assume_hermitian : bool
        If True, use symmetric/Hermitian algorithm
    balance : bool
        Apply balancing for non-Hermitian matrices
    
    Returns
    -------
    EigResult
    """
    n = matrix.shape[0]
    if matrix.shape[1] != n:
        raise ValueError("Matrix must be square")
    
    # Check if actually Hermitian
    if assume_hermitian:
        is_hermitian = True
    else:
        is_hermitian = np.allclose(matrix, matrix.T.conj())
    
    if is_hermitian:
        values, vectors = eigh(matrix)
    else:
        if balance:
            # Diagonal scaling for numerical stability
            d = np.diag(matrix)
            scale = np.where(d != 0, 1.0 / np.abs(d), 1.0)
            D = np.diag(np.sqrt(scale))
            D_inv = np.diag(1.0 / np.sqrt(scale))
            matrix_balanced = D @ matrix @ D_inv
        else:
            matrix_balanced = matrix
            D_inv = np.eye(n)
        
        values, vectors_balanced = eig(matrix_balanced)
        
        # Transform eigenvectors back
        vectors = D_inv @ vectors_balanced
    
    # Sort by magnitude (or real part for real eigenvalues)
    if np.isrealobj(values):
        idx = np.argsort(np.abs(values))[::-1]
    else:
        idx = np.argsort(np.abs(values))[::-1]
    
    values = values[idx]
    vectors = vectors[:, idx]
    
    # Compute condition numbers of eigenvectors
    cond_numbers = _eigenvector_condition(matrix, values, vectors)
    
    # Reconstruction error
    reconstructed = vectors @ np.diag(values) @ solve(vectors, np.eye(n))
    error = norm(matrix - reconstructed) / norm(matrix)
    
    return EigResult(
        values=values,
        vectors=vectors,
        is_hermitian=is_hermitian,
        condition_numbers=cond_numbers,
        reconstruction_error=error
    )


def _eigenvector_condition(
    matrix: np.ndarray,
    values: np.ndarray,
    vectors: np.ndarray
) -> np.ndarray:
    """
    Compute condition numbers of eigenvectors.
    
    Uses the sensitivity formula for simple eigenvalues.
    """
    n = len(values)
    cond_numbers = np.zeros(n)
    
    for i in range(n):
        v = vectors[:, i]
        l = values[i]
        
        # Compute residual
        residual = matrix @ v - l * v
        residual_norm = norm(residual)
        
        # Approximate condition number
        if residual_norm < 1e-10:
            # For well-separated eigenvalues, condition ~ 1/gap
            gaps = np.abs(values - l)
            gaps[i] = np.inf
            min_gap = np.min(gaps)
            cond_numbers[i] = 1.0 / min_gap if min_gap > 0 else np.inf
        else:
            cond_numbers[i] = residual_norm
    
    return cond_numbers


def power_iteration(
    matrix: np.ndarray,
    max_iter: int = 1000,
    tol: float = 1e-10,
    random_state: Optional[int] = None
) -> Tuple[float, np.ndarray]:
    """
    Power iteration for dominant eigenvalue.
    
    Parameters
    ----------
    matrix : ndarray
    max_iter : int
    tol : float
    random_state : int, optional
    
    Returns
    -------
    eigenvalue : float
    eigenvector : ndarray
    """
    if random_state is not None:
        np.random.seed(random_state)
    
    n = matrix.shape[0]
    v = np.random.randn(n)
    v = v / norm(v)
    
    eigenvalue = 0
    
    for _ in range(max_iter):
        v_new = matrix @ v
        eigenvalue_new = v @ v_new
        
        v_new = v_new / norm(v_new)
        
        if np.abs(eigenvalue_new - eigenvalue) < tol:
            break
        
        eigenvalue = eigenvalue_new
        v = v_new
    
    return eigenvalue, v


def inverse_iteration(
    matrix: np.ndarray,
    shift: float = 0.0,
    max_iter: int = 1000,
    tol: float = 1e-10,
    random_state: Optional[int] = None
) -> Tuple[float, np.ndarray]:
    """
    Inverse iteration for eigenvalue near shift.
    
    Parameters
    ----------
    matrix : ndarray
    shift : float
        Target eigenvalue approximation
    max_iter : int
    tol : float
    random_state : int, optional
    
    Returns
    -------
    eigenvalue : float
    eigenvector : ndarray
    """
    if random_state is not None:
        np.random.seed(random_state)
    
    n = matrix.shape[0]
    
    # Shifted matrix
    A_shifted = matrix - shift * np.eye(n)
    
    # LU decomposition for efficiency
    from scipy.linalg import lu_factor, lu_solve
    lu, piv = lu_factor(A_shifted)
    
    v = np.random.randn(n)
    v = v / norm(v)
    
    for _ in range(max_iter):
        # Solve (A - shift*I) v_new = v
        v_new = lu_solve((lu, piv), v)
        v_new = v_new / norm(v_new)
        
        if norm(v_new - v) < tol or norm(v_new + v) < tol:
            break
        
        v = v_new
    
    # Rayleigh quotient for eigenvalue
    eigenvalue = v @ matrix @ v
    
    return eigenvalue, v


def rayleigh_quotient_iteration(
    matrix: np.ndarray,
    initial_guess: Optional[np.ndarray] = None,
    max_iter: int = 100,
    tol: float = 1e-14,
    random_state: Optional[int] = None
) -> Tuple[float, np.ndarray]:
    """
    Rayleigh quotient iteration - cubic convergence.
    
    Parameters
    ----------
    matrix : ndarray
    initial_guess : ndarray, optional
    max_iter : int
    tol : float
    random_state : int, optional
    
    Returns
    -------
    eigenvalue : float
    eigenvector : ndarray
    """
    if random_state is not None:
        np.random.seed(random_state)
    
    n = matrix.shape[0]
    
    if initial_guess is None:
        v = np.random.randn(n)
    else:
        v = initial_guess.copy()
    
    v = v / norm(v)
    eigenvalue = v @ matrix @ v
    
    for _ in range(max_iter):
        # Solve (A - λI) w = v
        try:
            w = solve(matrix - eigenvalue * np.eye(n), v)
        except np.linalg.LinAlgError:
            # Matrix is singular - eigenvalue found
            break
        
        w_norm = norm(w)
        v_new = w / w_norm
        eigenvalue_new = v_new @ matrix @ v_new
        
        if np.abs(eigenvalue_new - eigenvalue) < tol:
            break
        
        eigenvalue = eigenvalue_new
        v = v_new
    
    return eigenvalue, v


def qr_algorithm(
    matrix: np.ndarray,
    max_iter: int = 1000,
    tol: float = 1e-14,
    shifts: bool = True
) -> Tuple[np.ndarray, np.ndarray]:
    """
    QR algorithm for all eigenvalues.
    
    Parameters
    ----------
    matrix : ndarray
    max_iter : int
    tol : float
    shifts : bool
        Use Wilkinson shifts for faster convergence
    
    Returns
    -------
    eigenvalues : ndarray
    eigenvectors : ndarray
    """
    n = matrix.shape[0]
    A = matrix.copy().astype(complex)
    Q_total = np.eye(n, dtype=complex)
    
    for iteration in range(max_iter):
        # Check for convergence (subdiagonal elements small)
        off_diag = np.sum(np.abs(np.diag(A, k=-1)))
        if off_diag < tol:
            break
        
        # Wilkinson shift
        if shifts and n >= 2:
            d = (A[-2, -2] - A[-1, -1]) / 2
            if np.abs(d) < 1e-10:
                shift = A[-1, -1] - np.abs(A[-2, -1])
            else:
                sign = d / np.abs(d) if d != 0 else 1
                shift = A[-1, -1] - A[-2, -1]**2 / (d + sign * np.sqrt(d**2 + A[-2, -1]**2))
        else:
            shift = 0
        
        # QR decomposition
        Q, R = np.linalg.qr(A - shift * np.eye(n))
        
        # Update
        A = R @ Q + shift * np.eye(n)
        Q_total = Q_total @ Q
    
    eigenvalues = np.diag(A)
    eigenvectors = Q_total
    
    return eigenvalues, eigenvectors


def generalized_eigenvalue(
    A: np.ndarray,
    B: np.ndarray,
    assume_hermitian: bool = False
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Solve generalized eigenvalue problem: A v = λ B v
    
    Parameters
    ----------
    A : ndarray
    B : ndarray
    assume_hermitian : bool
    
    Returns
    -------
    eigenvalues : ndarray
    eigenvectors : ndarray
    """
    n = A.shape[0]
    
    if assume_hermitian:
        # Use Cholesky for positive definite B
        try:
            L = np.linalg.cholesky(B)
            L_inv = solve(L, np.eye(n))
            
            # Transform to standard problem
            A_std = L_inv @ A @ L_inv.T
            
            values, vectors_std = eigh(A_std)
            vectors = L_inv.T @ vectors_std
            
        except np.linalg.LinAlgError:
            # B not positive definite, use QZ algorithm
            from scipy.linalg import eig
            values, vectors = eig(A, B)
            return values, vectors
    else:
        from scipy.linalg import eig
        values, vectors = eig(A, B)
    
    return values, vectors


class EigenDecomposition:
    """
    Composable eigenvalue decomposition class.
    """
    
    def __init__(self, k: Optional[int] = None, **kwargs):
        self.k = k  # Number of eigenvalues to compute
        self.kwargs = kwargs
        self.result_: Optional[EigResult] = None
    
    def fit(self, matrix: np.ndarray) -> 'EigenDecomposition':
        """Fit eigenvalue decomposition."""
        self.result_ = stable_eig(matrix, **self.kwargs)
        return self
    
    def transform(self, vector: np.ndarray) -> np.ndarray:
        """Transform vector to eigenbasis."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        return solve(self.result_.vectors, vector)
    
    def inverse_transform(self, coefficients: np.ndarray) -> np.ndarray:
        """Transform from eigenbasis back."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        return self.result_.vectors @ coefficients
    
    def matrix_function(self, f) -> np.ndarray:
        """
        Compute f(A) using eigendecomposition.
        
        f(A) = V @ diag(f(λ)) @ V^(-1)
        """
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        
        f_values = np.array([f(l) for l in self.result_.values])
        return self.result_.vectors @ np.diag(f_values) @ solve(self.result_.vectors, np.eye(len(f_values)))
    
    def matrix_power(self, p: float) -> np.ndarray:
        """Compute A^p using eigendecomposition."""
        return self.matrix_function(lambda x: x**p)
    
    def matrix_exponential(self) -> np.ndarray:
        """Compute exp(A) using eigendecomposition."""
        return self.matrix_function(np.exp)
    
    def matrix_logarithm(self) -> np.ndarray:
        """Compute log(A) using eigendecomposition."""
        return self.matrix_function(np.log)
    
    @property
    def spectral_radius(self) -> float:
        """Compute spectral radius (largest |eigenvalue|)."""
        if self.result_ is None:
            raise RuntimeError("Must call fit() first")
        return np.max(np.abs(self.result_.values))


if __name__ == "__main__":
    # Test eigenvalue decomposition
    np.random.seed(42)
    
    # Create a symmetric matrix
    n = 10
    A = np.random.randn(n, n)
    A = (A + A.T) / 2  # Make symmetric
    
    # Test stable eigenvalue decomposition
    result = stable_eig(A)
    
    print(f"Eigenvalue Decomposition Results:")
    print(f"  Is Hermitian: {result.is_hermitian}")
    print(f"  Reconstruction error: {result.reconstruction_error:.2e}")
    print(f"  Spectral radius: {np.max(np.abs(result.values)):.4f}")
    
    # Test power iteration
    eig_val, eig_vec = power_iteration(A, random_state=42)
    print(f"\nPower Iteration:")
    print(f"  Dominant eigenvalue: {eig_val:.4f}")
    print(f"  Matches max: {np.isclose(eig_val, np.max(np.abs(result.values)))}")
    
    # Test matrix functions
    decomp = EigenDecomposition()
    decomp.fit(A)
    
    exp_A = decomp.matrix_exponential()
    print(f"\nMatrix Exponential:")
    print(f"  Shape: {exp_A.shape}")
    print(f"  Trace: {np.trace(exp_A):.4f}")
