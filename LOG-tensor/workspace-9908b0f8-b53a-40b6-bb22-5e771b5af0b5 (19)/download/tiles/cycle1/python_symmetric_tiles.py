"""
ATOMIC TILES: Symmetric Group S_n Theory
=========================================
Minimal reusable mathematical concepts for A2A communication.
Each tile is a single operation, composable, with intuitive naming.

Notation:
- Permutations represented as 0-indexed arrays: sigma[i] = sigma(i)
- Cycles represented as tuples/lists of elements

TILE INVENTORY:
    HIGH FREQUENCY (2-4 chars): cmp, inv, id, cyc, frm, sgn, trn
    MEDIUM FREQUENCY (5-8 chars): pwr, ord, sup, fix, typ, mat, det
    LOW FREQUENCY (9+ chars): adj, gen, conj, cls, all, orb, len, com, cen, rep
    UTILITY: rnd, act, par, des, asc
"""

import numpy as np
from functools import reduce
from itertools import permutations
from typing import List, Tuple, Set
from math import gcd


# ==============================================================================
# HIGH FREQUENCY TILES (2-4 chars) - Core operations
# ==============================================================================

def cmp(sigma: np.ndarray, tau: np.ndarray) -> np.ndarray:
    """
    TILE: [cmp] - compose
    MATH: (sigma o tau)(i) = sigma(tau(i))
    USES: HIGH
    COMPOSES_WITH: [inv, id, cyc, pwr]
    """
    return sigma[tau]


def inv(sigma: np.ndarray) -> np.ndarray:
    """
    TILE: [inv] - inverse
    MATH: sigma^{-1}[sigma(i)] = i
    USES: HIGH
    COMPOSES_WITH: [cmp, id, cyc]
    """
    result = np.empty_like(sigma)
    result[sigma] = np.arange(len(sigma))
    return result


def id_perm(n: int) -> np.ndarray:
    """
    TILE: [id] - identity
    MATH: id(i) = i for all i
    USES: HIGH
    COMPOSES_WITH: [cmp, inv, cyc]
    """
    return np.arange(n)


def cyc(sigma: np.ndarray) -> List[Tuple[int, ...]]:
    """
    TILE: [cyc] - cycle notation
    MATH: sigma = (a1 a2 ... ak) where sigma(ai) = ai+1, sigma(ak) = a1
    USES: HIGH
    COMPOSES_WITH: [frm, sgn, typ]
    """
    n = len(sigma)
    visited = np.zeros(n, dtype=bool)
    cycles = []
    for i in range(n):
        if not visited[i]:
            cycle = []
            j = i
            while not visited[j]:
                visited[j] = True
                cycle.append(j)
                j = sigma[j]
            if len(cycle) > 1:
                cycles.append(tuple(cycle))
    return cycles


def frm(cycles: List[Tuple[int, ...]], n: int) -> np.ndarray:
    """
    TILE: [frm] - from cycles
    MATH: Convert (a b c)(d e) -> [sigma(0), sigma(1), ..., sigma(n-1)]
    USES: HIGH
    COMPOSES_WITH: [cyc, cmp, inv]
    """
    sigma = np.arange(n)
    for cycle in cycles:
        k = len(cycle)
        for i in range(k):
            sigma[cycle[i]] = cycle[(i + 1) % k]
    return sigma


def sgn(sigma: np.ndarray) -> int:
    """
    TILE: [sgn] - sign/parity
    MATH: sgn(sigma) = (-1)^(#transpositions) = (-1)^(n - #cycles)
    USES: HIGH
    COMPOSES_WITH: [cyc, trn, det]
    """
    n = len(sigma)
    visited = np.zeros(n, dtype=bool)
    total_moved = 0
    cycle_count = 0
    
    for i in range(n):
        if not visited[i]:
            j = i
            cycle_len = 0
            while not visited[j]:
                visited[j] = True
                j = sigma[j]
                cycle_len += 1
            if cycle_len > 1:
                cycle_count += 1
                total_moved += cycle_len
    
    # sign = (-1)^(total_moved - cycle_count)
    return (-1) ** (total_moved - cycle_count)


def trn(i: int, j: int, n: int) -> np.ndarray:
    """
    TILE: [trn] - transposition
    MATH: (i j) swaps i and j, fixes all others
    USES: HIGH
    COMPOSES_WITH: [cmp, sgn, gen]
    """
    sigma = np.arange(n)
    if i != j:
        sigma[i], sigma[j] = sigma[j], sigma[i]
    return sigma


# ==============================================================================
# MEDIUM FREQUENCY TILES (5-8 chars) - Important operations
# ==============================================================================

def pwr(sigma: np.ndarray, k: int) -> np.ndarray:
    """
    TILE: [pwr] - power
    MATH: sigma^k = sigma o sigma o ... o sigma (k times)
    USES: MED
    COMPOSES_WITH: [cmp, inv, ord]
    """
    if k == 0:
        return np.arange(len(sigma))
    if k < 0:
        sigma = inv(sigma)
        k = -k
    result = sigma.copy()
    for _ in range(k - 1):
        result = cmp(result, sigma)
    return result


def ord_perm(sigma: np.ndarray) -> int:
    """
    TILE: [ord] - order
    MATH: ord(sigma) = min{k > 0 : sigma^k = id} = lcm(cycle_lengths)
    USES: MED
    COMPOSES_WITH: [cyc, pwr, gen]
    """
    cycles = cyc(sigma)
    if not cycles:
        return 1
    lengths = [len(c) for c in cycles]
    return reduce(lambda a, b: a * b // gcd(a, b), lengths, 1)


def sup(sigma: np.ndarray) -> Set[int]:
    """
    TILE: [sup] - support
    MATH: supp(sigma) = {i : sigma(i) != i}
    USES: MED
    COMPOSES_WITH: [fix, cyc, trn]
    """
    return set(np.where(sigma != np.arange(len(sigma)))[0])


def fix(sigma: np.ndarray) -> Set[int]:
    """
    TILE: [fix] - fixed points
    MATH: Fix(sigma) = {i : sigma(i) = i}
    USES: MED
    COMPOSES_WITH: [sup, sgn, cyc]
    """
    return set(np.where(sigma == np.arange(len(sigma)))[0])


def typ(sigma: np.ndarray) -> Tuple[int, ...]:
    """
    TILE: [typ] - cycle type
    MATH: Cycle type = (lambda1, lambda2, ..., lambdak) where lambda1 >= lambda2 >= ...
    USES: MED
    COMPOSES_WITH: [cyc, cls, conj]
    """
    cycles = cyc(sigma)
    lengths = [len(c) for c in cycles]
    # Include 1-cycles for fixed points
    n = len(sigma)
    fixed = n - sum(lengths)
    lengths.extend([1] * fixed)
    return tuple(sorted(lengths, reverse=True))


def mat(sigma: np.ndarray) -> np.ndarray:
    """
    TILE: [mat] - permutation matrix
    MATH: P_sigma[i,j] = delta_{i,sigma(j)} or equivalently P_sigma e_j = e_{sigma(j)}
    USES: MED
    COMPOSES_WITH: [det, cmp, inv]
    """
    n = len(sigma)
    P = np.zeros((n, n), dtype=int)
    for j in range(n):
        P[sigma[j], j] = 1
    return P


def det_perm(sigma: np.ndarray) -> int:
    """
    TILE: [det] - determinant (of perm matrix)
    MATH: det(P_sigma) = sgn(sigma)
    USES: MED
    COMPOSES_WITH: [mat, sgn]
    """
    return sgn(sigma)


# ==============================================================================
# LOW FREQUENCY TILES (9+ chars) - Specialized operations
# ==============================================================================

def adj(i: int, n: int) -> np.ndarray:
    """
    TILE: [adj] - adjacent transposition
    MATH: s_i = (i, i+1), generating set of S_n
    USES: LOW
    COMPOSES_WITH: [trn, gen, len]
    """
    return trn(i, i + 1, n)


def gen(n: int) -> List[np.ndarray]:
    """
    TILE: [gen] - generators
    MATH: S_n = <s1, s2, ..., s_{n-1}> where s_i = (i, i+1)
    USES: LOW
    COMPOSES_WITH: [adj, trn, cmp]
    """
    return [adj(i, n) for i in range(n - 1)]


def conj(sigma: np.ndarray, tau: np.ndarray) -> np.ndarray:
    """
    TILE: [conj] - conjugate
    MATH: tau sigma tau^{-1}, conjugacy preserves cycle structure
    USES: LOW
    COMPOSES_WITH: [cmp, inv, cls]
    """
    return cmp(tau, cmp(sigma, inv(tau)))


def all_perm(n: int) -> List[np.ndarray]:
    """
    TILE: [all] - all permutations
    MATH: S_n = {all bijections : {1,...,n} -> {1,...,n}}
    USES: LOW
    COMPOSES_WITH: [cmp, sgn, cls]
    """
    return [np.array(list(p)) for p in permutations(range(n))]


def cls(sigma: np.ndarray) -> List[np.ndarray]:
    """
    TILE: [cls] - conjugacy class
    MATH: {tau sigma tau^{-1} : tau in S_n}, determined by cycle type
    USES: LOW
    COMPOSES_WITH: [conj, typ, all]
    """
    n = len(sigma)
    class_members = set()
    for tau in all_perm(n):
        class_members.add(tuple(conj(sigma, tau)))
    return [np.array(list(m)) for m in class_members]


def orb(sigma: np.ndarray, i: int) -> Set[int]:
    """
    TILE: [orb] - orbit
    MATH: Orb_sigma(i) = {sigma^k(i) : k in Z}
    USES: LOW
    COMPOSES_WITH: [cyc, pwr, sup]
    """
    orbit = {i}
    j = sigma[i]
    while j != i:
        orbit.add(j)
        j = sigma[j]
    return orbit


def len_coxeter(sigma: np.ndarray) -> int:
    """
    TILE: [len] - length (Coxeter)
    MATH: l(sigma) = min number of adjacent transpositions
    USES: LOW
    COMPOSES_WITH: [adj, sgn, gen]
    """
    inversions = 0
    n = len(sigma)
    for i in range(n):
        for j in range(i + 1, n):
            if sigma[i] > sigma[j]:
                inversions += 1
    return inversions


def com(sigma: np.ndarray, tau: np.ndarray) -> bool:
    """
    TILE: [com] - commutes
    MATH: sigma tau = tau sigma iff supp(sigma) n supp(tau) = empty or special cases
    USES: LOW
    COMPOSES_WITH: [cmp, sup, cen]
    """
    return np.array_equal(cmp(sigma, tau), cmp(tau, sigma))


def cen(sigma: np.ndarray) -> List[np.ndarray]:
    """
    TILE: [cen] - centralizer
    MATH: C(sigma) = {tau in S_n : tau sigma = sigma tau}
    USES: LOW
    COMPOSES_WITH: [com, cyc, typ]
    """
    n = len(sigma)
    centralizer = []
    for tau in all_perm(n):
        if com(sigma, tau):
            centralizer.append(tau)
    return centralizer


# ==============================================================================
# UTILITY TILES
# ==============================================================================

def rnd(n: int) -> np.ndarray:
    """
    TILE: [rnd] - random permutation
    MATH: Uniform random element of S_n
    USES: MED
    COMPOSES_WITH: [cmp, sgn, cyc]
    """
    return np.random.permutation(n)


def act(sigma: np.ndarray, v: np.ndarray) -> np.ndarray:
    """
    TILE: [act] - action on vector
    MATH: sigma * v = (v_{sigma^{-1}(0)}, v_{sigma^{-1}(1)}, ..., v_{sigma^{-1}(n-1)})
    USES: MED
    COMPOSES_WITH: [inv, mat, rep]
    """
    return v[inv(sigma)]


def rep(sigma: np.ndarray) -> List[int]:
    """
    TILE: [rep] - reduced expression
    MATH: sigma = s_{i1} s_{i2} ... s_{ik} with k = l(sigma)
    USES: LOW
    COMPOSES_WITH: [adj, len, gen]
    """
    n = len(sigma)
    result = []
    sigma_work = sigma.copy()
    # Bubble sort style decomposition
    for target in range(n):
        pos = np.where(sigma_work == target)[0][0]
        for i in range(pos, target, -1):
            result.append(i - 1)
            sigma_work[i], sigma_work[i-1] = sigma_work[i-1], sigma_work[i]
    return result[::-1]


def par(sigma: np.ndarray) -> np.ndarray:
    """
    TILE: [par] - parity vector
    MATH: For each i, whether sigma(i) > i (ascent at position i)
    USES: LOW
    COMPOSES_WITH: [sgn, len, des]
    """
    return (sigma > np.arange(len(sigma))).astype(int)


def des(sigma: np.ndarray) -> Set[int]:
    """
    TILE: [des] - descent set
    MATH: Des(sigma) = {i : sigma(i) > sigma(i+1)}
    USES: LOW
    COMPOSES_WITH: [par, len, asc]
    """
    n = len(sigma)
    return {i for i in range(n - 1) if sigma[i] > sigma[i + 1]}


def asc(sigma: np.ndarray) -> Set[int]:
    """
    TILE: [asc] - ascent set
    MATH: Asc(sigma) = {i : sigma(i) < sigma(i+1)}
    USES: LOW
    COMPOSES_WITH: [des, par, len]
    """
    n = len(sigma)
    return {i for i in range(n - 1) if sigma[i] < sigma[i + 1]}


# ==============================================================================
# COMPOSITION EXAMPLES
# ==============================================================================

def example_compositions():
    """Demonstrate tile composition patterns."""
    n = 5
    
    # Identity and basic operations
    e = id_perm(n)
    print(f"Identity: {e}")
    
    # Create a permutation via cycles
    sigma = frm([(0, 1, 2), (3, 4)], n)
    print(f"sigma = (0 1 2)(3 4): {sigma}")
    
    # Cycle decomposition
    print(f"Cycles: {cyc(sigma)}")
    
    # Compose with inverse
    sigma_inv = inv(sigma)
    print(f"sigma^-1: {sigma_inv}")
    print(f"sigma o sigma^-1 = {cmp(sigma, sigma_inv)}")
    
    # Sign
    print(f"sgn(sigma) = {sgn(sigma)}")
    
    # Power
    print(f"sigma^2 = {pwr(sigma, 2)}")
    print(f"sigma^3 = {pwr(sigma, 3)}")
    
    # Order
    print(f"ord(sigma) = {ord_perm(sigma)}")
    
    # Permutation matrix
    print(f"P_sigma:\n{mat(sigma)}")
    
    # Transposition
    tau = trn(0, 2, n)
    print(f"(0 2): {tau}")
    
    # Conjugation
    print(f"tau sigma tau^-1 = {conj(sigma, tau)}")
    
    # Cycle type
    print(f"Cycle type: {typ(sigma)}")
    
    # Support and fixed points
    print(f"Support: {sup(sigma)}")
    print(f"Fixed points: {fix(sigma)}")
    
    # Coxeter length
    print(f"Coxeter length: {len_coxeter(sigma)}")
    
    # Descent set
    print(f"Descent set: {des(sigma)}")
    
    # Orbit
    print(f"Orbit of 0: {orb(sigma, 0)}")


def print_tile_inventory():
    """Print the complete tile inventory."""
    print("=" * 70)
    print("SYMMETRIC GROUP TILES - Complete Inventory")
    print("=" * 70)
    print("""
    HIGH FREQUENCY (2-4 chars):
    ┌──────┬────────────────────────────────────────────────────────────┐
    │ cmp  │ compose: (sigma o tau)(i) = sigma(tau(i))                 │
    │ inv  │ inverse: sigma^{-1}[sigma(i)] = i                         │
    │ id   │ identity: id(i) = i for all i                             │
    │ cyc  │ cycle decomposition: sigma = (a1 a2 ... ak)...            │
    │ frm  │ from cycles: convert (a b c)(d e) -> array                │
    │ sgn  │ sign/parity: (-1)^(#transpositions)                       │
    │ trn  │ transposition: (i j) swaps i and j                        │
    └──────┴────────────────────────────────────────────────────────────┘

    MEDIUM FREQUENCY (5-8 chars):
    ┌──────┬────────────────────────────────────────────────────────────┐
    │ pwr  │ power: sigma^k = sigma o ... o sigma (k times)            │
    │ ord  │ order: min{k > 0 : sigma^k = id} = lcm(cycle_lengths)     │
    │ sup  │ support: {i : sigma(i) != i}                              │
    │ fix  │ fixed points: {i : sigma(i) = i}                          │
    │ typ  │ cycle type: partition (lambda1 >= lambda2 >= ...)         │
    │ mat  │ permutation matrix: P_sigma[i,j] = delta_{i,sigma(j)}    │
    │ det  │ determinant: det(P_sigma) = sgn(sigma)                    │
    └──────┴────────────────────────────────────────────────────────────┘

    LOW FREQUENCY (9+ chars):
    ┌──────┬────────────────────────────────────────────────────────────┐
    │ adj  │ adjacent transposition: s_i = (i, i+1)                    │
    │ gen  │ generators: S_n = <(1,2), (2,3), ..., (n-1,n)>           │
    │ conj │ conjugate: tau sigma tau^{-1}                             │
    │ cls  │ conjugacy class: {tau sigma tau^{-1} : tau in S_n}       │
    │ all  │ all permutations: enumerate S_n                           │
    │ orb  │ orbit: {sigma^k(i) : k in Z}                              │
    │ len  │ Coxeter length: #inversions = min #adjacent transpositions│
    │ com  │ commutes check: sigma tau == tau sigma                    │
    │ cen  │ centralizer: {tau : tau sigma = sigma tau}               │
    │ rep  │ reduced expression: sigma = s_{i1}...s_{ik}              │
    └──────┴────────────────────────────────────────────────────────────┘

    UTILITY TILES:
    ┌──────┬────────────────────────────────────────────────────────────┐
    │ rnd  │ random permutation: uniform element of S_n                │
    │ act  │ action on vector: sigma * v[i] = v[sigma^{-1}(i)]         │
    │ par  │ parity vector: [sigma(i) > i for each i]                  │
    │ des  │ descent set: {i : sigma(i) > sigma(i+1)}                 │
    │ asc  │ ascent set: {i : sigma(i) < sigma(i+1)}                  │
    └──────┴────────────────────────────────────────────────────────────┘

    COMPOSITION PATTERNS:
    ┌─────────────────────────────────────────────────────────────────────┐
    │ cmp(sigma, inv(sigma)) == id(n)     # Verify inverse               │
    │ sgn(cmp(sigma, tau)) == sgn(sigma)*sgn(tau)  # Sign multiplicative │
    │ typ(conj(sigma, tau)) == typ(sigma) # Conjugacy invariant          │
    │ len_coxeter(sigma) == sum(typ(sigma))-len(cycles(sigma))           │
    │ ord_perm(sigma) == lcm([len(c) for c in cyc(sigma)])               │
    └─────────────────────────────────────────────────────────────────────┘
    """)


if __name__ == "__main__":
    print_tile_inventory()
    print("\n" + "=" * 70)
    print("RUNNING EXAMPLES")
    print("=" * 70 + "\n")
    example_compositions()
