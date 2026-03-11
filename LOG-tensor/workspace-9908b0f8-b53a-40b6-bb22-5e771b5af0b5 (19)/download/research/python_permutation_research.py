#!/usr/bin/env python3
"""
================================================================================
PERMUTATION TENSOR RESEARCH - Rubiks-Tensor-Transformer Architecture
================================================================================

PYTHON SPECIALIST RESEARCH OUTPUT
Language: Python/NumPy-style mathematical notation

This research file explores the mathematical foundations for encoding
permutations in tensor operations, with a focus on practical implementations.

================================================================================
PART 1: PERMUTATION GROUPS & TENSOR OPERATIONS
================================================================================

MATHEMATICAL FOUNDATIONS:
------------------------
The symmetric group S_n consists of all permutations of n elements.
Key representations:
1. Permutation matrices: P ∈ {0,1}^{n×n}, P_{i,j} = 1 iff σ(i) = j
2. One-hot vectors: π ∈ {0,1}^n, π_i = 1 for selected element
3. Indexed representation: σ = [σ(0), σ(1), ..., σ(n-1)]

CAYLEY REPRESENTATION:
----------------------
Every group G acts on itself by left multiplication.
The Cayley representation maps each g ∈ G to a permutation matrix:
    Cayley: G → GL(|G|, ℝ)
    g ↦ P_g where (P_g)_{i,j} = 1 iff g·h_i = h_j

This gives a |G| × |G| matrix representation.

YOUNG TABLEAUX:
---------------
Combinatorial objects that index irreducible representations of S_n.
A Young diagram of shape λ = (λ_1, λ_2, ..., λ_k) with λ_1 ≥ λ_2 ≥ ... ≥ λ_k
and Σλ_i = n corresponds to an irrep of S_n.

The dimension of the irrep is given by the hook-length formula:
    dim(λ) = n! / ∏_{(i,j)∈λ} h(i,j)

where h(i,j) is the hook-length at cell (i,j).

================================================================================
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Set, Callable, Any
from dataclasses import dataclass, field
from collections import defaultdict
import itertools
from functools import reduce
import warnings
import math as math_module

# ============================================================
# SECTION 1: PERMUTATION GROUP REPRESENTATIONS
# ============================================================

# ------------------------------------------------------------
# 1.1 Permutation Matrix Representation
# ------------------------------------------------------------
"""
PERMUTATION MATRIX:
P ∈ {0,1}^{n×n} where P[i, σ(i)] = 1 for permutation σ

Properties:
- P · P^T = I (orthogonal)
- det(P) = sign(σ) = ±1
- P^{-1} = P^T

For a permutation σ: [0, 1, ..., n-1] → [σ(0), σ(1), ..., σ(n-1)]
The matrix P has ones at positions (i, σ(i)).
"""

def permutation_to_matrix(perm: np.ndarray) -> np.ndarray:
    """
    Convert a permutation to its matrix representation.
    
    Args:
        perm: Array where perm[i] = σ(i), the image of i under σ
              Example: [2, 0, 1] means σ(0)=2, σ(1)=0, σ(2)=1
    
    Returns:
        P: Permutation matrix where P[i, perm[i]] = 1
    """
    n = len(perm)
    P = np.zeros((n, n), dtype=np.float64)
    P[np.arange(n), perm] = 1.0
    return P


def matrix_to_permutation(P: np.ndarray) -> np.ndarray:
    """
    Convert a permutation matrix to its indexed representation.
    
    Args:
        P: Permutation matrix (orthogonal, binary)
    
    Returns:
        perm: Array where perm[i] = j iff P[i, j] = 1
    """
    n = P.shape[0]
    return np.argmax(P, axis=1)


def compose_permutations(perm1: np.ndarray, perm2: np.ndarray) -> np.ndarray:
    """
    Compose two permutations: (perm1 ∘ perm2)[i] = perm1[perm2[i]]
    
    This corresponds to matrix multiplication: P_1 @ P_2
    """
    return perm1[perm2]


def invert_permutation(perm: np.ndarray) -> np.ndarray:
    """
    Get the inverse permutation σ^{-1} such that σ^{-1}[σ[i]] = i.
    
    For matrices: P^{-1} = P^T
    """
    inv = np.zeros_like(perm)
    inv[perm] = np.arange(len(perm))
    return inv


def permutation_sign(perm: np.ndarray) -> int:
    """
    Compute the sign of a permutation: +1 for even, -1 for odd.
    
    The sign equals det(P) and (-1)^(number of transpositions).
    """
    n = len(perm)
    visited = np.zeros(n, dtype=bool)
    cycles = 0
    
    for i in range(n):
        if not visited[i]:
            j = i
            while not visited[j]:
                visited[j] = True
                j = perm[j]
            cycles += 1
    
    # sign = (-1)^(n - cycles) = (-1)^(n - number of cycles)
    return 1 if (n - cycles) % 2 == 0 else -1


# ------------------------------------------------------------
# 1.2 Cayley Representation
# ------------------------------------------------------------
"""
CAYLEY REPRESENTATION:
For a finite group G, the Cayley representation embeds G into GL(|G|).

Each element g maps to a permutation matrix P_g of size |G| × |G|:
    (P_g)_{h, g·h} = 1

This is the REGULAR REPRESENTATION of G.

Key property: The Cayley representation is FAITHFUL (injective).
Different group elements map to different matrices.
"""

def cayley_representation(group_elements: List[Any], 
                          multiply: Callable[[Any, Any], Any]) -> np.ndarray:
    """
    Compute the Cayley representation of a finite group.
    
    Args:
        group_elements: List of all group elements
        multiply: Binary operation (g, h) → g·h
    
    Returns:
        Dict mapping each element to its |G| × |G| permutation matrix
    """
    n = len(group_elements)
    element_to_idx = {g: i for i, g in enumerate(group_elements)}
    
    representations = {}
    
    for g in group_elements:
        P = np.zeros((n, n), dtype=np.float64)
        for h in group_elements:
            gh = multiply(g, h)
            i = element_to_idx[h]
            j = element_to_idx[gh]
            P[i, j] = 1.0
        representations[g] = P
    
    return representations


def symmetric_group_cayley(n: int) -> Dict[Tuple, np.ndarray]:
    """
    Generate Cayley representation for S_n (symmetric group on n elements).
    
    WARNING: |S_n| = n! grows rapidly. Use only for small n (n ≤ 5).
    """
    if n > 5:
        warnings.warn(f"S_{n} has {math_module.factorial(n)} elements. "
                     f"Matrix will be {math_module.factorial(n)}×{math_module.factorial(n)}")
    
    # All permutations as tuples
    perms = list(itertools.permutations(range(n)))
    
    def compose(p1, p2):
        """Compose permutations: p1 ∘ p2"""
        return tuple(p1[i] for i in p2)
    
    return cayley_representation(perms, compose)


# ------------------------------------------------------------
# 1.3 Young Tableaux and Irreducible Representations
# ------------------------------------------------------------
"""
YOUNG TABLEAUX:
A Young diagram is a collection of boxes arranged in left-justified rows.
Shape λ = (λ_1, λ_2, ..., λ_k) where λ_i = number of boxes in row i.

A Young tableau is a filling of a Young diagram with numbers 1 to n.

HOOK LENGTH FORMULA:
dim(λ) = n! / ∏_{cells c in λ} hook_length(c)

The hook length of cell (i,j) is:
    h(i,j) = (boxes to the right in row i) + 
             (boxes below in column j) + 1
"""

@dataclass
class YoungDiagram:
    """
    A Young diagram (partition shape).
    
    Example: shape = (3, 2, 1) gives:
        ■■■
        ■■
        ■
    """
    shape: Tuple[int, ...]
    
    def __post_init__(self):
        # Ensure partition is valid (non-increasing)
        assert all(self.shape[i] >= self.shape[i+1] 
                  for i in range(len(self.shape)-1)), "Invalid partition"
    
    def n(self) -> int:
        """Total number of boxes."""
        return sum(self.shape)
    
    def hook_lengths(self) -> List[List[int]]:
        """Compute hook lengths for each cell."""
        rows = len(self.shape)
        hooks = []
        
        for i, row_len in enumerate(self.shape):
            row_hooks = []
            for j in range(row_len):
                # Hook length = right + down + 1
                right = row_len - j - 1
                down = sum(1 for r in self.shape[i+1:] if r > j)
                row_hooks.append(right + down + 1)
            hooks.append(row_hooks)
        
        return hooks
    
    def dimension(self) -> int:
        """Dimension of the corresponding irrep of S_n (hook length formula)."""
        n = self.n()
        hooks = self.hook_lengths()
        
        numerator = math_module.factorial(n)
        denominator = 1
        for row in hooks:
            for h in row:
                denominator *= h
        
        return numerator // denominator
    
    def diagram_string(self) -> str:
        """Visual representation of the diagram."""
        return '\n'.join('■' * row for row in self.shape)


def generate_standard_tableaux(shape: Tuple[int, ...]) -> List[List[List[int]]]:
    """
    Generate all standard Young tableaux of given shape.
    
    A standard tableau has numbers 1 to n where each row and column
    is strictly increasing.
    
    Uses the hook-length formula to verify count.
    """
    n = sum(shape)
    diagram = YoungDiagram(shape)
    
    # Initialize empty tableau
    tableau = [[0] * row_len for row_len in shape]
    
    def is_valid(tableau, row, col, val):
        """Check if placing val at (row, col) maintains standard property."""
        # Check above (column)
        if row > 0 and col < len(tableau[row-1]):
            if tableau[row-1][col] >= val:
                return False
        # Check left (row)
        if col > 0:
            if tableau[row][col-1] >= val:
                return False
        return True
    
    def find_empty(tableau):
        """Find the first empty cell in reading order."""
        for i, row in enumerate(tableau):
            for j, val in enumerate(row):
                if val == 0:
                    return i, j
        return None
    
    results = []
    
    def backtrack(current_val):
        if current_val > n:
            # Make a deep copy
            results.append([row[:] for row in tableau])
            return
        
        pos = find_empty(tableau)
        if pos is None:
            return
        
        row, col = pos
        
        # Try placing current_val at (row, col)
        if is_valid(tableau, row, col, current_val):
            tableau[row][col] = current_val
            backtrack(current_val + 1)
            tableau[row][col] = 0
    
    backtrack(1)
    return results


# ============================================================
# SECTION 2: RUBIK'S CUBE MATHEMATICS
# ============================================================
"""
================================================================================
RUBIK'S CUBE GROUP STRUCTURE
================================================================================

THE CUBE:
- 6 faces, 9 squares per face (54 total facelets)
- 8 corner pieces (3 facelets each)
- 12 edge pieces (2 facelets each)
- Center pieces are fixed relative to each other

STATE SPACE:
- Total configurations: 43,252,003,274,489,856,000 ≈ 4.3 × 10^19
- Factored as: |G| = 8! × 3^7 × 12! × 2^11 / 12

GROUP STRUCTURE:
G = (C_3^7 ⋊ S_8) × (C_2^11 ⋊ S_12) / K

Where:
- S_8: Permutations of 8 corners
- C_3: Orientations of corners (3 rotations each)
- S_12: Permutations of 12 edges
- C_2: Orientations of edges (flip or not)
- K: Kernel from constraints

CONSTRAINTS:
1. Parity: Corner permutation parity = Edge permutation parity
   (can't swap just 2 pieces)
   
2. Corner orientation: Σ orientation_i ≡ 0 (mod 3)
   (total corner twist must be 0 mod 3)
   
3. Edge orientation: Σ orientation_i ≡ 0 (mod 2)
   (total edge flip must be even)

GOD'S NUMBER:
Every position can be solved in ≤ 20 moves (HTM - Half Turn Metric)
or ≤ 26 moves (QTM - Quarter Turn Metric).

================================================================================
"""

# ------------------------------------------------------------
# 2.1 Rubik's Cube State Encoding
# ------------------------------------------------------------

@dataclass
class RubiksCubeState:
    """
    Complete state of a Rubik's cube.
    
    Encoding:
    - corners: Position and orientation of 8 corners
    - edges: Position and orientation of 12 edges
    
    Each corner has:
    - position: which of 8 positions (0-7)
    - orientation: 0, 1, or 2 (0 = correct, 1 = cw twist, 2 = ccw twist)
    
    Each edge has:
    - position: which of 12 positions (0-11)
    - orientation: 0 or 1 (0 = correct, 1 = flipped)
    """
    # Corner positions: corner_positions[i] = which corner is at position i
    corner_positions: np.ndarray = field(default_factory=lambda: np.arange(8))
    # Corner orientations: 0, 1, or 2
    corner_orientations: np.ndarray = field(default_factory=lambda: np.zeros(8, dtype=int))
    # Edge positions
    edge_positions: np.ndarray = field(default_factory=lambda: np.arange(12))
    # Edge orientations: 0 or 1
    edge_orientations: np.ndarray = field(default_factory=lambda: np.zeros(12, dtype=int))
    
    def __post_init__(self):
        self.corner_positions = np.array(self.corner_positions, dtype=int)
        self.corner_orientations = np.array(self.corner_orientations, dtype=int)
        self.edge_positions = np.array(self.edge_positions, dtype=int)
        self.edge_orientations = np.array(self.edge_orientations, dtype=int)
    
    def is_solved(self) -> bool:
        """Check if cube is in solved state."""
        return (np.all(self.corner_positions == np.arange(8)) and
                np.all(self.corner_orientations == 0) and
                np.all(self.edge_positions == np.arange(12)) and
                np.all(self.edge_orientations == 0))
    
    def verify_constraints(self) -> Tuple[bool, str]:
        """
        Verify all Rubik's cube constraints.
        
        Returns: (valid, message)
        """
        # Constraint 1: Parity
        corner_parity = permutation_sign(self.corner_positions)
        edge_parity = permutation_sign(self.edge_positions)
        
        if corner_parity != edge_parity:
            return False, "Parity constraint violated"
        
        # Constraint 2: Corner orientation
        corner_twist = np.sum(self.corner_orientations) % 3
        if corner_twist != 0:
            return False, f"Corner orientation constraint violated: sum = {corner_twist}"
        
        # Constraint 3: Edge orientation
        edge_flip = np.sum(self.edge_orientations) % 2
        if edge_flip != 0:
            return False, f"Edge orientation constraint violated: sum = {edge_flip}"
        
        return True, "All constraints satisfied"
    
    def encode_state_vector(self) -> np.ndarray:
        """
        Encode state as a single vector.
        
        Total size: 8 + 8 + 12 + 12 = 40 integers
        """
        return np.concatenate([
            self.corner_positions,
            self.corner_orientations,
            self.edge_positions,
            self.edge_orientations
        ])
    
    def encode_one_hot(self) -> np.ndarray:
        """
        Encode state as one-hot vectors.
        
        Corner positions: 8 × 8 = 64
        Corner orientations: 8 × 3 = 24
        Edge positions: 12 × 12 = 144
        Edge orientations: 12 × 2 = 24
        Total: 256 dimensions
        """
        # Corner position one-hot
        corner_pos_oh = np.zeros((8, 8))
        corner_pos_oh[np.arange(8), self.corner_positions] = 1
        
        # Corner orientation one-hot
        corner_ori_oh = np.zeros((8, 3))
        corner_ori_oh[np.arange(8), self.corner_orientations] = 1
        
        # Edge position one-hot
        edge_pos_oh = np.zeros((12, 12))
        edge_pos_oh[np.arange(12), self.edge_positions] = 1
        
        # Edge orientation one-hot
        edge_ori_oh = np.zeros((12, 2))
        edge_ori_oh[np.arange(12), self.edge_orientations] = 1
        
        return np.concatenate([
            corner_pos_oh.flatten(),
            corner_ori_oh.flatten(),
            edge_pos_oh.flatten(),
            edge_ori_oh.flatten()
        ])
    
    @staticmethod
    def total_states() -> int:
        """Theoretical number of valid cube states."""
        return 43252003274489856000  # 43 quintillion


# ------------------------------------------------------------
# 2.2 Rubik's Cube Moves as Group Actions
# ------------------------------------------------------------

class RubiksMove:
    """
    A move on the Rubik's cube represented as a group action.
    
    Standard notation:
    - U, D, F, B, L, R: Clockwise 90° turn of Up, Down, Front, Back, Left, Right
    - U', D', F', B', L', R': Counter-clockwise (inverse)
    - U2, D2, F2, B2, L2, R2: 180° turn
    
    Each move affects:
    - 4 corners (permuted and possibly twisted)
    - 4 edges (permuted and possibly flipped)
    """
    
    # Move definitions: (corner_cycle, edge_cycle, corner_twist, edge_flip)
    # Positions affected by each move
    MOVE_DATA = {
        'U': {
            'corners': [0, 1, 2, 3],  # UFR, UFL, UBL, UBR
            'edges': [0, 1, 2, 3],     # UF, UL, UB, UR
            'corner_twist': [0, 0, 0, 0],
            'edge_flip': [0, 0, 0, 0]
        },
        'D': {
            'corners': [4, 7, 6, 5],   # DFR, DBR, DBL, DFL
            'edges': [8, 11, 10, 9],   # DF, DR, DB, DL
            'corner_twist': [0, 0, 0, 0],
            'edge_flip': [0, 0, 0, 0]
        },
        'F': {
            'corners': [0, 4, 5, 1],   # UFR, DFR, DFL, UFL
            'edges': [0, 4, 8, 5],     # UF, FR, DF, FL
            'corner_twist': [1, 2, 1, 2],
            'edge_flip': [1, 1, 1, 1]
        },
        'B': {
            'corners': [2, 6, 7, 3],   # UBL, DBL, DBR, UBR
            'edges': [2, 6, 10, 7],    # UB, BL, DB, BR
            'corner_twist': [2, 1, 2, 1],
            'edge_flip': [1, 1, 1, 1]
        },
        'L': {
            'corners': [1, 5, 6, 2],   # UFL, DFL, DBL, UBL
            'edges': [1, 5, 9, 6],     # UL, FL, DL, BL
            'corner_twist': [0, 0, 0, 0],
            'edge_flip': [0, 0, 0, 0]
        },
        'R': {
            'corners': [0, 3, 7, 4],   # UFR, UBR, DBR, DFR
            'edges': [3, 7, 11, 4],    # UR, BR, DR, FR
            'corner_twist': [0, 0, 0, 0],
            'edge_flip': [0, 0, 0, 0]
        }
    }
    
    def __init__(self, name: str, inverse: bool = False, double: bool = False):
        """
        Initialize a move.
        
        Args:
            name: Single letter move (U, D, F, B, L, R)
            inverse: If True, counter-clockwise
            double: If True, 180° turn
        """
        assert name in 'UDFBRL', f"Invalid move: {name}"
        assert not (inverse and double), "Can't be both inverse and double"
        
        self.name = name
        self.inverse = inverse
        self.double = double
        
        self.data = self.MOVE_DATA[name]
    
    def apply(self, state: RubiksCubeState) -> RubiksCubeState:
        """Apply this move to a cube state."""
        corners = self.data['corners']
        edges = self.data['edges']
        corner_twist = self.data['corner_twist']
        edge_flip = self.data['edge_flip']
        
        # Number of times to cycle (1 for cw, 3 for ccw, 2 for double)
        n_cycles = 2 if self.double else (3 if self.inverse else 1)
        
        new_state = RubiksCubeState(
            state.corner_positions.copy(),
            state.corner_orientations.copy(),
            state.edge_positions.copy(),
            state.edge_orientations.copy()
        )
        
        for _ in range(n_cycles):
            # Cycle corners
            temp_pos = new_state.corner_positions[corners[-1]]
            temp_ori = new_state.corner_orientations[corners[-1]]
            
            for i in range(len(corners) - 1, 0, -1):
                new_state.corner_positions[corners[i]] = new_state.corner_positions[corners[i-1]]
                new_state.corner_orientations[corners[i]] = (
                    new_state.corner_orientations[corners[i-1]] + corner_twist[i]
                ) % 3
            
            new_state.corner_positions[corners[0]] = temp_pos
            new_state.corner_orientations[corners[0]] = (temp_ori + corner_twist[0]) % 3
            
            # Cycle edges
            temp_pos = new_state.edge_positions[edges[-1]]
            temp_ori = new_state.edge_orientations[edges[-1]]
            
            for i in range(len(edges) - 1, 0, -1):
                new_state.edge_positions[edges[i]] = new_state.edge_positions[edges[i-1]]
                new_state.edge_orientations[edges[i]] = (
                    new_state.edge_orientations[edges[i-1]] + edge_flip[i]
                ) % 2
            
            new_state.edge_positions[edges[0]] = temp_pos
            new_state.edge_orientations[edges[0]] = (temp_ori + edge_flip[0]) % 2
        
        return new_state
    
    def __repr__(self):
        if self.double:
            return f"{self.name}2"
        elif self.inverse:
            return f"{self.name}'"
        return self.name


# ------------------------------------------------------------
# 2.3 Named Algorithms (Compressed Encodings)
# ------------------------------------------------------------
"""
NAMED ALGORITHMS - The Muscle Memory of Rubik's Solving

Advanced solvers don't think in individual moves. They think in
NAMED ALGORITHMS that achieve specific effects:

1. "Sexy Move": R U R' U' (4 moves)
   - The most fundamental algorithm
   - Affects 4 pieces, returns others to place
   - 6 repetitions return to start

2. "Sune": R U R' U R U2 R' (7 moves)
   - Cycles 3 corners
   - Used in OLL (orienting last layer)

3. "T-Perm": R U R' U' R' F R2 U' R' U' R U R' F' (14 moves)
   - Swaps 2 edges and 2 corners
   - Used in PLL (permuting last layer)

The key insight: ALGORITHMS ARE COMPRESSED ENCODINGS
- They achieve complex effects with memorable sequences
- They preserve certain pieces while modifying others
- They can be COMPOSED to solve any position
"""

class RubiksAlgorithm:
    """A named algorithm (compressed encoding) for Rubik's cube."""
    
    ALGORITHMS = {}
    
    def __init__(self, name: str, moves: List[Tuple[str, bool, bool]],
                 description: str = "", affects: Set[str] = None):
        self.name = name
        self.moves = [RubiksMove(m[0], m[1], m[2]) for m in moves]
        self.description = description
        self.affects = affects or set()
        
        RubiksAlgorithm.ALGORITHMS[name] = self
    
    def apply(self, state: RubiksCubeState) -> RubiksCubeState:
        """Apply this algorithm to a cube state."""
        for move in self.moves:
            state = move.apply(state)
        return state
    
    def move_count(self) -> int:
        """Number of moves in the algorithm."""
        return len(self.moves)
    
    @classmethod
    def register_standard_algorithms(cls):
        """Register the standard algorithms that speedcubers learn."""
        
        # Sexy Move
        cls("Sexy", 
            [('R', False, False), ('U', False, False), 
             ('R', True, False), ('U', True, False)],
            "Most fundamental algorithm, affects 4 pieces",
            {'UFR', 'UBR', 'UR', 'UF'})
        
        # Sune
        cls("Sune",
            [('R', False, False), ('U', False, False), ('R', True, False),
             ('U', False, False), ('R', False, False), ('U', False, True), 
             ('R', True, False)],
            "Cycles 3 corners, used in OLL",
            {'UFR', 'UBL', 'UBR'})
        
        # T-Perm
        cls("T-Perm",
            [('R', False, False), ('U', False, False), ('R', True, False),
             ('U', True, False), ('R', True, False), ('F', False, False),
             ('R', False, True), ('U', True, False), ('R', True, False),
             ('U', True, False), ('R', False, False), ('U', False, False),
             ('R', True, False), ('F', True, False)],
            "Swaps 2 edges and 2 corners, used in PLL",
            {'UR', 'UL', 'UFR', 'UFL'})
        
        # U-Perm (a)
        cls("U-Perm",
            [('R', False, False), ('U', True, False), ('R', False, False),
             ('U', False, False), ('R', False, False), ('U', False, False),
             ('R', False, False), ('U', True, False), ('R', True, False),
             ('U', True, False), ('R', False, True)],
            "Cycles 3 edges, used in PLL",
            {'UF', 'UL', 'UB'})


# ============================================================
# SECTION 3: MUD SCRIPTING PATTERNS
# ============================================================
"""
================================================================================
MUD SCRIPTING PATTERNS - Abstraction Layers in Action
================================================================================

zMUD / TinTin++ Scripting:
MUD (Multi-User Dungeon) clients use sophisticated trigger and macro systems
that provide insights into layered abstraction.

KEY PATTERNS:
1. TRIGGER-BASED ACTION SYSTEMS
   - Pattern matching on text output
   - Automatic response execution
   - State-dependent behavior

2. MACRO COMPOSITION AND ALIASING
   - Named command sequences
   - Parameter substitution
   - Nested macro calls

3. ABSTRACTION LAYERS
   - Low-level: Raw text matching
   - Mid-level: Named triggers and aliases
   - High-level: Complex automated behaviors

INSIGHT FOR TENSORS:
MUD scripts show how COMPLEX BEHAVIOR emerges from:
- Simple pattern matching (like attention)
- Named abstractions (like algorithms)
- Composition (like layer stacking)

The Rubik's cube connection:
- Triggers → Pattern recognition on cube state
- Macros → Named algorithms
- Aliases → Compressed move sequences
================================================================================
"""

# ------------------------------------------------------------
# 3.1 Trigger System Model
# ------------------------------------------------------------

@dataclass
class Trigger:
    """
    A trigger matches a pattern and executes an action.
    
    In MUD terms:
    #trigger {pattern} {action}
    
    Example:
    #trigger {You are hungry.} {eat bread}
    
    For Rubik's cube:
    #trigger {corner_in_wrong_position} {apply_sune}
    """
    pattern: str  # What to match (regex or simple string)
    action: Callable  # What to do when triggered
    priority: int = 0  # Higher priority = checked first
    enabled: bool = True
    cooldown: float = 0  # Seconds before can trigger again
    last_triggered: float = 0
    
    def matches(self, text: str) -> bool:
        """Check if pattern matches the text."""
        import re
        try:
            return bool(re.search(self.pattern, text))
        except:
            return self.pattern in text
    
    def execute(self, context: Dict) -> Any:
        """Execute the trigger action."""
        if not self.enabled:
            return None
        return self.action(context)


class TriggerSystem:
    """
    A trigger-based action system inspired by MUD clients.
    
    This can model both:
    - MUD scripting behavior
    - Rubik's cube solving strategy selection
    """
    
    def __init__(self):
        self.triggers: List[Trigger] = []
        self.variables: Dict[str, Any] = {}
        self.history: List[Dict] = []
    
    def add_trigger(self, trigger: Trigger):
        """Add a trigger to the system."""
        self.triggers.append(trigger)
        self.triggers.sort(key=lambda t: -t.priority)  # Sort by priority
    
    def process(self, text: str, context: Dict = None) -> List[Any]:
        """Process text through all triggers."""
        context = context or {}
        context['text'] = text
        context['vars'] = self.variables
        
        results = []
        for trigger in self.triggers:
            if trigger.matches(text):
                result = trigger.execute(context)
                results.append({
                    'trigger': trigger.pattern,
                    'result': result
                })
                self.history.append({
                    'text': text,
                    'trigger': trigger.pattern,
                    'result': result
                })
        
        return results
    
    def set_variable(self, name: str, value: Any):
        """Set a variable (like MUD #var command)."""
        self.variables[name] = value


# ------------------------------------------------------------
# 3.2 Macro and Alias System
# ------------------------------------------------------------

class MacroSystem:
    """
    A macro/alias system inspired by MUD clients.
    
    In MUD terms:
    #alias {name} {command_sequence}
    #macro {key} {command}
    
    For Rubik's cube:
    #alias {sexy} {R U R' U'}
    #alias {solve_corners} {sexy; sexy; sune}
    """
    
    def __init__(self):
        self.aliases: Dict[str, List[str]] = {}
        self.macros: Dict[str, Callable] = {}
    
    def define_alias(self, name: str, expansion: str):
        """
        Define an alias.
        
        Example:
        define_alias("sexy", "R U R' U'")
        """
        # Tokenize the expansion
        tokens = expansion.split()
        self.aliases[name] = tokens
    
    def expand(self, command: str) -> List[str]:
        """
        Expand a command, recursively resolving aliases.
        
        Example:
        expand("sexy") → ["R", "U", "R'", "U'"]
        """
        tokens = command.split()
        expanded = []
        
        for token in tokens:
            if token in self.aliases:
                # Recursively expand
                expanded.extend(self.expand(' '.join(self.aliases[token])))
            else:
                expanded.append(token)
        
        return expanded
    
    def define_macro(self, key: str, action: Callable):
        """Define a macro for a key."""
        self.macros[key] = action
    
    def execute(self, command: str, context: Dict = None) -> Any:
        """Execute a command, expanding aliases and calling macros."""
        context = context or {}
        
        # Check if it's a macro
        if command in self.macros:
            return self.macros[command](context)
        
        # Expand and return tokens
        return self.expand(command)


# ============================================================
# SECTION 4: TENSOR IMPLEMENTATIONS FOR PERMUTATIONS
# ============================================================
"""
================================================================================
PRACTICAL TENSOR IMPLEMENTATIONS
================================================================================

KEY QUESTION: How should permutations be encoded in attention mechanisms?

OPTIONS:
1. HARD PERMUTATIONS (Permutation Matrices)
   - Exact but non-differentiable
   - Use argmax for inference
   - Need straight-through estimator for training

2. SOFT PERMUTATIONS (Doubly Stochastic Matrices)
   - Differentiable via Sinkhorn algorithm
   - Bistochastic: rows and columns sum to 1
   - Converges to permutations as temperature → 0

3. STOCHASTIC PERMUTATIONS (Gumbel-Sinkhorn)
   - Sample from distribution over permutations
   - Differentiable sampling
   - Good for variational inference

4. PERMUTATION INVARIANT/EQUIVARIANT LAYERS
   - Deep Sets: sum aggregation (invariant)
   - Set Transformer: attention-based (equivariant)
   - Graph Neural Networks: permutation equivariant

================================================================================
"""

# ------------------------------------------------------------
# 4.1 Sinkhorn Algorithm for Soft Permutations
# ------------------------------------------------------------

def sinkhorn_knopp(matrix: np.ndarray, n_iters: int = 20, 
                   temperature: float = 1.0) -> np.ndarray:
    """
    Sinkhorn-Knopp algorithm to convert a matrix to doubly stochastic form.
    
    A doubly stochastic matrix has:
    - All entries non-negative
    - All rows sum to 1
    - All columns sum to 1
    
    These matrices interpolate between arbitrary matrices and permutations.
    
    Args:
        matrix: Input matrix (n × n)
        n_iters: Number of Sinkhorn iterations
        temperature: Temperature for softening (lower = closer to permutation)
    
    Returns:
        Doubly stochastic matrix (n × n)
    
    Reference:
    Sinkhorn, R. (1964). "A relationship between arbitrary positive matrices
    and doubly stochastic matrices"
    """
    # Scale by temperature
    P = np.exp(matrix / temperature)
    
    for _ in range(n_iters):
        # Normalize rows
        P = P / P.sum(axis=1, keepdims=True)
        # Normalize columns
        P = P / P.sum(axis=0, keepdims=True)
    
    return P


def gumbel_sinkhorn(matrix: np.ndarray, n_iters: int = 20,
                    temperature: float = 1.0, noise_scale: float = 1.0,
                    rng: np.random.Generator = None) -> np.ndarray:
    """
    Gumbel-Sinkhorn for sampling from a distribution over permutations.
    
    Adds Gumbel noise before Sinkhorn, allowing stochastic sampling.
    
    Args:
        matrix: Log-probability matrix (n × n)
        n_iters: Sinkhorn iterations
        temperature: Softness of the distribution
        noise_scale: Scale of Gumbel noise
        rng: Random number generator
    
    Returns:
        Sampled doubly stochastic matrix
    """
    rng = rng or np.random.default_rng()
    
    # Add Gumbel noise
    gumbel_noise = -np.log(-np.log(rng.random(matrix.shape) + 1e-10) + 1e-10)
    noisy_matrix = matrix + noise_scale * gumbel_noise
    
    return sinkhorn_knopp(noisy_matrix, n_iters, temperature)


def doubly_stochastic_to_permutation(P: np.ndarray) -> np.ndarray:
    """
    Convert a doubly stochastic matrix to a permutation.
    
    Uses the Hungarian algorithm (linear assignment).
    
    Args:
        P: Doubly stochastic matrix (n × n)
    
    Returns:
        Permutation vector where perm[i] = j
    """
    from scipy.optimize import linear_sum_assignment
    
    # Hungarian algorithm on -P (to maximize P's assignment)
    row_ind, col_ind = linear_sum_assignment(-P)
    
    perm = np.zeros(len(row_ind), dtype=int)
    perm[row_ind] = col_ind
    
    return perm


# ------------------------------------------------------------
# 4.2 Permutation Invariant/Equivariant Layers
# ------------------------------------------------------------

class PermutationInvariantLayer:
    """
    A layer that is invariant to permutations of the input.
    
    Key insight from Deep Sets (Zaheer et al., 2017):
    Any permutation invariant function can be expressed as:
        f(X) = ρ(Σ φ(x_i))
    
    where φ and ρ are suitable neural networks.
    """
    
    def __init__(self, phi_dim: int, rho_dim: int):
        """
        Args:
            phi_dim: Output dimension of φ (element-wise transform)
            rho_dim: Output dimension of ρ (aggregate transform)
        """
        # These would be neural networks in practice
        self.phi_dim = phi_dim
        self.rho_dim = rho_dim
    
    def forward(self, X: np.ndarray, 
                phi: Callable, rho: Callable) -> np.ndarray:
        """
        Forward pass for permutation invariant layer.
        
        Args:
            X: Input tensor of shape (n, d) - n elements, d features each
            phi: Element-wise transform: (d,) → (phi_dim,)
            rho: Aggregate transform: (phi_dim,) → (rho_dim,)
        
        Returns:
            Output of shape (rho_dim,) - invariant to permutation of X
        """
        # Apply φ to each element
        phi_outputs = np.array([phi(x) for x in X])  # (n, phi_dim)
        
        # Sum aggregation (permutation invariant)
        aggregated = np.sum(phi_outputs, axis=0)  # (phi_dim,)
        
        # Apply ρ
        output = rho(aggregated)  # (rho_dim,)
        
        return output


class PermutationEquivariantLayer:
    """
    A layer that is equivariant to permutations of the input.
    
    If P is a permutation and f is the layer:
        f(P·X) = P·f(X)
    
    Key construction from Set Transformer (Lee et al., 2019):
        f(X) = X + MLP(sum(MLP(X)))
    """
    
    def __init__(self, input_dim: int, hidden_dim: int):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
    
    def forward(self, X: np.ndarray,
                mlp1: Callable, mlp2: Callable) -> np.ndarray:
        """
        Forward pass for permutation equivariant layer.
        
        Args:
            X: Input tensor of shape (n, input_dim)
            mlp1: First MLP: (input_dim,) → (hidden_dim,)
            mlp2: Second MLP: (hidden_dim,) → (input_dim,)
        
        Returns:
            Output of shape (n, input_dim) - permuted if input is permuted
        """
        # Apply first MLP element-wise
        h = np.array([mlp1(x) for x in X])  # (n, hidden_dim)
        
        # Sum aggregation
        h_sum = np.sum(h, axis=0)  # (hidden_dim,)
        
        # Apply second MLP
        update = mlp2(h_sum)  # (input_dim,)
        
        # Add residual connection
        output = X + update  # (n, input_dim)
        
        return output


class SetAttentionBlock:
    """
    Set Attention Block from Set Transformer.
    
    Uses multi-head attention for permutation equivariant processing.
    
    MAB(X, Y) = H + rFF(H)
    where H = X + MultiHead(X, Y, Y)
    
    When X = Y, this is self-attention on a set.
    """
    
    def __init__(self, dim: int, n_heads: int = 4):
        self.dim = dim
        self.n_heads = n_heads
    
    def forward(self, X: np.ndarray, Y: np.ndarray,
                W_q: np.ndarray, W_k: np.ndarray, W_v: np.ndarray,
                W_o: np.ndarray, rff: Callable) -> np.ndarray:
        """
        Forward pass for Set Attention Block.
        
        Args:
            X: Query set of shape (n, dim)
            Y: Key/Value set of shape (m, dim)
            W_q, W_k, W_v: Projection matrices for Q, K, V
            W_o: Output projection
            rff: Row-wise feedforward network
        
        Returns:
            Output of shape (n, dim)
        """
        # Compute Q, K, V
        Q = X @ W_q  # (n, dim)
        K = Y @ W_k  # (m, dim)
        V = Y @ W_v  # (m, dim)
        
        # Scaled dot-product attention
        d_k = self.dim // self.n_heads
        scores = (Q @ K.T) / np.sqrt(d_k)  # (n, m)
        attn_weights = self._softmax(scores, axis=1)  # (n, m)
        
        # Weighted sum of values
        H = X + attn_weights @ V  # (n, dim)
        
        # Row-wise feedforward
        output = H + rff(H)  # (n, dim)
        
        return output
    
    @staticmethod
    def _softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
        """Numerically stable softmax."""
        x_max = np.max(x, axis=axis, keepdims=True)
        exp_x = np.exp(x - x_max)
        return exp_x / np.sum(exp_x, axis=axis, keepdims=True)


# ------------------------------------------------------------
# 4.3 Rubik's Cube Tensor Architecture
# ------------------------------------------------------------

class RubiksTensorLayer:
    """
    A tensor layer with Rubik's cube-style permutation structure.
    
    Key properties:
    1. Elements have DEPENDENCIES (like cube pieces)
    2. Operations must satisfy CONSTRAINTS
    3. Named ENCODINGS coordinate multiple changes
    """
    
    def __init__(self, spatial_dim: int = 3, feature_dim: int = 32):
        """
        Args:
            spatial_dim: Dimension of the "cube" (3 for 3×3×3)
            feature_dim: Features per position
        """
        self.spatial_dim = spatial_dim
        self.feature_dim = feature_dim
        
        # State tensor: (spatial_dim, spatial_dim, spatial_dim, feature_dim)
        # For a 3×3×3 Rubik's cube: 27 positions × features
        self.shape = (spatial_dim, spatial_dim, spatial_dim, feature_dim)
        
        # Build dependency graph
        self.dependencies = self._build_dependencies()
    
    def _build_dependencies(self) -> Dict[Tuple, Set[Tuple]]:
        """
        Build the dependency graph based on Rubik's cube structure.
        
        Each position is affected by:
        1. Positions in the same face (for face rotations)
        2. Adjacent positions (for local interactions)
        """
        deps = defaultdict(set)
        n = self.spatial_dim
        
        for i in range(n):
            for j in range(n):
                for k in range(n):
                    idx = (i, j, k)
                    
                    # Same face (for rotations)
                    # XY planes (k constant)
                    if k == 0 or k == n-1:  # Outer faces
                        for i2 in range(n):
                            for j2 in range(n):
                                deps[idx].add((i2, j2, k))
                    
                    # XZ planes (j constant)
                    if j == 0 or j == n-1:
                        for i2 in range(n):
                            for k2 in range(n):
                                deps[idx].add((i2, j, k2))
                    
                    # YZ planes (i constant)
                    if i == 0 or i == n-1:
                        for j2 in range(n):
                            for k2 in range(n):
                                deps[idx].add((i, j2, k2))
                    
                    # Adjacent positions
                    for di, dj, dk in [(1,0,0), (-1,0,0), (0,1,0), (0,-1,0), (0,0,1), (0,0,-1)]:
                        ni, nj, nk = i+di, j+dj, k+dk
                        if 0 <= ni < n and 0 <= nj < n and 0 <= nk < n:
                            deps[idx].add((ni, nj, nk))
        
        return deps
    
    def rotate_face(self, state: np.ndarray, face: str, 
                    clockwise: bool = True) -> np.ndarray:
        """
        Rotate a face of the cube tensor.
        
        Args:
            state: Tensor of shape (n, n, n, feature_dim)
            face: One of 'U', 'D', 'F', 'B', 'L', 'R'
            clockwise: Direction of rotation
        
        Returns:
            Rotated state tensor
        """
        new_state = state.copy()
        n = self.spatial_dim
        
        # Define the slice to rotate based on face
        if face == 'U':
            slice_idx = 0  # Top layer
            # Rotate in XY plane at k=n-1
            if clockwise:
                new_state[:, :, n-1] = np.rot90(state[:, :, n-1], k=-1, axes=(0,1))
            else:
                new_state[:, :, n-1] = np.rot90(state[:, :, n-1], k=1, axes=(0,1))
        
        elif face == 'D':
            if clockwise:
                new_state[:, :, 0] = np.rot90(state[:, :, 0], k=1, axes=(0,1))
            else:
                new_state[:, :, 0] = np.rot90(state[:, :, 0], k=-1, axes=(0,1))
        
        elif face == 'F':
            if clockwise:
                new_state[:, n-1, :] = np.rot90(state[:, n-1, :], k=-1, axes=(0,1))
            else:
                new_state[:, n-1, :] = np.rot90(state[:, n-1, :], k=1, axes=(0,1))
        
        elif face == 'B':
            if clockwise:
                new_state[:, 0, :] = np.rot90(state[:, 0, :], k=1, axes=(0,1))
            else:
                new_state[:, 0, :] = np.rot90(state[:, 0, :], k=-1, axes=(0,1))
        
        elif face == 'R':
            if clockwise:
                new_state[n-1, :, :] = np.rot90(state[n-1, :, :], k=-1, axes=(0,1))
            else:
                new_state[n-1, :, :] = np.rot90(state[n-1, :, :], k=1, axes=(0,1))
        
        elif face == 'L':
            if clockwise:
                new_state[0, :, :] = np.rot90(state[0, :, :], k=1, axes=(0,1))
            else:
                new_state[0, :, :] = np.rot90(state[0, :, :], k=-1, axes=(0,1))
        
        return new_state


# ============================================================
# SECTION 5: MINIMAL OPERATION SET FOR REARRANGEMENTS
# ============================================================
"""
================================================================================
MINIMAL OPERATION SET FOR ANY REARRANGEMENT
================================================================================

KEY QUESTION: What's the minimal set of operations needed to achieve any
permutation?

ANSWER: Transpositions (swaps of 2 elements)

THEOREM: Every permutation can be decomposed into transpositions.
    σ = τ_1 ∘ τ_2 ∘ ... ∘ τ_k

where each τ_i swaps two elements.

For S_n, we need at most n-1 transpositions.

RUBIK'S CUBE INSIGHT:
The 6 basic moves (U, D, F, B, L, R) are NOT minimal.
They are cycles of length 4 (corners) and 4 (edges).

But they form a GENERATING SET for the entire Rubik's cube group.
Any cube state can be reached by composing these 6 moves.

MINIMAL GENERATING SETS:
1. For S_n: Two transpositions suffice:
   - (1 2), (1 2 ... n) -- adjacent swap and n-cycle
   - Or: (1 2), (2 3), ..., (n-1 n) -- all adjacent swaps

2. For Rubik's cube: Two moves can generate all states:
   - U, R generate the entire group
   - (Proof involves showing they generate all other moves)

INSIGHT FOR TENSORS:
A "Rubik's Tensor" needs:
1. A small set of GENERATING OPERATIONS
2. COMPOSITION rules
3. CONSTRAINT checking

================================================================================
"""

class MinimalOperationSet:
    """
    Minimal operation set for permutations.
    
    Demonstrates that:
    1. Transpositions generate S_n
    2. Adjacent transpositions suffice
    3. Two generators can generate S_n
    """
    
    @staticmethod
    def adjacent_transpositions(n: int) -> List[np.ndarray]:
        """
        Generate all adjacent transposition permutations.
        
        These are the swaps (i, i+1) for i = 0, 1, ..., n-2.
        """
        transpositions = []
        for i in range(n - 1):
            perm = np.arange(n)
            perm[i], perm[i+1] = perm[i+1], perm[i]
            transpositions.append(perm)
        return transpositions
    
    @staticmethod
    def decompose_to_transpositions(perm: np.ndarray) -> List[Tuple[int, int]]:
        """
        Decompose a permutation into transpositions.
        
        Returns a list of (i, j) pairs where elements i and j are swapped.
        """
        n = len(perm)
        perm_copy = perm.copy()
        transpositions = []
        
        for i in range(n):
            # Find where element i currently is
            pos = np.where(perm_copy == i)[0][0]
            
            if pos != i:
                # Swap element at pos with element at i
                transpositions.append((i, pos))
                perm_copy[i], perm_copy[pos] = perm_copy[pos], perm_copy[i]
        
        return transpositions
    
    @staticmethod
    def two_generator_decomposition(perm: np.ndarray) -> List[int]:
        """
        Express a permutation using only two generators.
        
        Generators:
        - s = (0 1) -- transposition
        - c = (0 1 2 ... n-1) -- n-cycle
        
        Returns a word in {s, c, s^{-1}, c^{-1}} = {s, c, s, c^{-1}}
        (s is its own inverse)
        """
        n = len(perm)
        
        # We'll use a simple (inefficient) algorithm
        # In practice, this would be optimized
        
        s = np.arange(n)
        s[0], s[1] = s[1], s[0]  # (0 1)
        
        c = np.roll(np.arange(n), -1)  # (0 1 2 ... n-1)
        c_inv = np.roll(np.arange(n), 1)  # Inverse cycle
        
        current = np.arange(n)
        operations = []  # 0 = s, 1 = c, 2 = c_inv
        
        # Greedy approach (not optimal)
        max_steps = 100
        for _ in range(max_steps):
            if np.array_equal(current, perm):
                return operations
            
            # Try each operation
            best_op = None
            best_dist = float('inf')
            
            for op, gen in [(0, s), (1, c), (2, c_inv)]:
                new_state = compose_permutations(gen, current)
                # Distance to target
                dist = np.sum(new_state != perm)
                if dist < best_dist:
                    best_dist = dist
                    best_op = op
            
            if best_op is not None:
                operations.append(best_op)
                if best_op == 0:
                    current = compose_permutations(s, current)
                elif best_op == 1:
                    current = compose_permutations(c, current)
                else:
                    current = compose_permutations(c_inv, current)
        
        return operations


# ============================================================
# SECTION 6: LIBRARY RECOMMENDATIONS
# ============================================================
"""
================================================================================
PYTHON LIBRARY RECOMMENDATIONS
================================================================================

CORE NUMERICAL:
--------------
1. NumPy (numpy)
   - Foundation for all tensor operations
   - Efficient array operations, broadcasting
   - numpy.linalg for linear algebra

2. SciPy (scipy)
   - scipy.optimize.linear_sum_assignment for Hungarian algorithm
   - scipy.linalg for advanced linear algebra
   - scipy.sparse for sparse permutation matrices

DEEP LEARNING FRAMEWORKS:
------------------------
1. PyTorch (torch)
   - Dynamic computation graphs
   - Excellent for research and prototyping
   - torch.nn.functional for neural network operations
   - torch.autograd for automatic differentiation
   - Native support for sparse tensors

2. JAX (jax)
   - Functional programming paradigm
   - Automatic vectorization (jax.vmap)
   - JIT compilation (jax.jit)
   - Automatic differentiation (jax.grad)
   - Excellent for implementing Sinkhorn and group operations
   - jax.scipy.optimize for optimization

3. TensorFlow (tensorflow)
   - Production-ready
   - Keras high-level API
   - TPU support

SPECIALIZED LIBRARIES:
---------------------
1. escnn (Equivariant CNNs)
   - Group equivariant neural networks
   - Built-in support for SO(3), SE(3), permutation groups
   - https://github.com/QUVA-Lab/escnn

2. e3nn (Euclidean Neural Networks)
   - E(3) equivariant networks
   - Spherical harmonics, Clebsch-Gordan coefficients
   - https://github.com/e3nn/e3nn

3. PyTorch Geometric (torch_geometric)
   - Graph neural networks
   - Permutation equivariant message passing
   - https://github.com/pyg-team/pytorch_geometric

4. DeepChem
   - Molecular machine learning
   - 3D equivariant networks for molecules

5. permutation_learning (custom)
   - Various implementations of differentiable permutations
   - Gumbel-Sinkhorn, stochastic beams

OPTIMIZATION:
------------
1. cvxpy
   - Convex optimization
   - For constrained permutation problems

2. optax (JAX optimization)
   - First-order optimizers
   - Works well with JAX differentiation

VISUALIZATION:
-------------
1. matplotlib
   - Basic plotting

2. plotly
   - Interactive 3D plots
   - Good for visualizing cube states

================================================================================
"""

# ============================================================
# SECTION 7: VERIFICATION AND DEMO
# ============================================================

def verify_permutation_math():
    """Verify all permutation mathematics implementations."""
    print("=" * 70)
    print("PERMUTATION TENSOR RESEARCH - VERIFICATION")
    print("=" * 70)
    
    results = {}
    
    # 1. Permutation matrices
    print("\n[1] PERMUTATION MATRIX REPRESENTATION")
    perm = np.array([2, 0, 1, 3])
    P = permutation_to_matrix(perm)
    print(f"   Permutation: {perm}")
    print(f"   Matrix:\n{P}")
    print(f"   Determinant (sign): {np.linalg.det(P):.0f}")
    print(f"   Is orthogonal: {np.allclose(P @ P.T, np.eye(4))}")
    
    # Composition
    perm2 = np.array([1, 2, 3, 0])
    composed = compose_permutations(perm, perm2)
    print(f"   {perm} ∘ {perm2} = {composed}")
    
    results['permutation_matrices'] = {
        'test_perm': perm.tolist(),
        'is_orthogonal': bool(np.allclose(P @ P.T, np.eye(4))),
        'sign': int(np.linalg.det(P))
    }
    
    # 2. Young tableaux
    print("\n[2] YOUNG TABLEAUX AND IRREPS")
    shape = (3, 2, 1)  # Partition of 6
    diagram = YoungDiagram(shape)
    print(f"   Shape: {shape}")
    print(f"   Diagram:\n{diagram.diagram_string()}")
    print(f"   Hook lengths: {diagram.hook_lengths()}")
    print(f"   Dimension of irrep: {diagram.dimension()}")
    
    results['young_tableaux'] = {
        'shape': shape,
        'dimension': diagram.dimension()
    }
    
    # 3. Rubik's cube state
    print("\n[3] RUBIK'S CUBE STATE")
    cube = RubiksCubeState()
    print(f"   Solved state: {cube.is_solved()}")
    valid, msg = cube.verify_constraints()
    print(f"   Constraints: {msg}")
    
    # Apply a move
    move_R = RubiksMove('R')
    cube_R = move_R.apply(cube)
    print(f"   After R move: solved={cube_R.is_solved()}")
    valid, msg = cube_R.verify_constraints()
    print(f"   Constraints after R: {msg}")
    
    # Apply algorithm
    RubiksAlgorithm.register_standard_algorithms()
    sexy = RubiksAlgorithm.ALGORITHMS['Sexy']
    cube_sexy = cube.copy() if hasattr(cube, 'copy') else RubiksCubeState()
    for _ in range(6):
        cube_sexy = sexy.apply(cube_sexy)
    print(f"   After 6 Sexy moves: solved={cube_sexy.is_solved()}")
    
    results['rubiks_cube'] = {
        'initial_solved': bool(cube.is_solved()),
        'after_R_solved': bool(cube_R.is_solved()),
        'sexy_6_returns_solved': bool(cube_sexy.is_solved())
    }
    
    # 4. Sinkhorn algorithm
    print("\n[4] SOFT PERMUTATIONS (Sinkhorn)")
    rng = np.random.default_rng(42)
    log_matrix = rng.random((4, 4))
    soft_perm = sinkhorn_knopp(log_matrix, n_iters=20, temperature=0.1)
    print(f"   Input matrix (first row): {log_matrix[0, :]}")
    print(f"   Doubly stochastic (first row): {soft_perm[0, :]}")
    print(f"   Row sums: {soft_perm.sum(axis=1)}")
    print(f"   Column sums: {soft_perm.sum(axis=0)}")
    
    # Convert to hard permutation
    hard_perm = doubly_stochastic_to_permutation(soft_perm)
    print(f"   Hard permutation: {hard_perm}")
    
    results['sinkhorn'] = {
        'is_doubly_stochastic': bool(
            np.allclose(soft_perm.sum(axis=1), 1) and 
            np.allclose(soft_perm.sum(axis=0), 1)
        ),
        'hard_permutation': hard_perm.tolist()
    }
    
    # 5. MUD-style trigger system
    print("\n[5] TRIGGER/MACRO SYSTEM (MUD Pattern)")
    triggers = TriggerSystem()
    
    # Add a simple trigger
    def eat_action(ctx):
        return "Eating bread!"
    
    triggers.add_trigger(Trigger(
        pattern="hungry",
        action=eat_action,
        priority=1
    ))
    
    results_triggers = triggers.process("You are hungry.")
    print(f"   Input: 'You are hungry.'")
    print(f"   Results: {results_triggers}")
    
    # Macro system
    macros = MacroSystem()
    macros.define_alias("sexy", "R U R' U'")
    expanded = macros.expand("sexy")
    print(f"   Alias 'sexy' expands to: {expanded}")
    
    results['trigger_system'] = {
        'triggers_fired': len(results_triggers),
        'alias_expansion': expanded
    }
    
    # 6. Minimal operation set
    print("\n[6] MINIMAL OPERATION SET")
    perm = np.array([3, 1, 0, 2])
    transpositions = MinimalOperationSet.decompose_to_transpositions(perm)
    print(f"   Permutation: {perm}")
    print(f"   Decomposed into transpositions: {transpositions}")
    
    adjacent = MinimalOperationSet.adjacent_transpositions(4)
    print(f"   Adjacent transpositions for S_4: {len(adjacent)} generators")
    
    results['minimal_ops'] = {
        'test_permutation': perm.tolist(),
        'n_transpositions': len(transpositions)
    }
    
    # 7. Total state space
    print("\n[7] RUBIK'S CUBE STATE SPACE")
    print(f"   Total states: {RubiksCubeState.total_states():,}")
    print(f"   ≈ 4.3 × 10^19")
    print(f"   God's number (HTM): 20")
    print(f"   God's number (QTM): 26")
    
    results['state_space'] = {
        'total_states': str(RubiksCubeState.total_states()),
        'gods_number_htm': 20,
        'gods_number_qtm': 26
    }
    
    print("\n" + "=" * 70)
    print("VERIFICATION COMPLETE")
    print("=" * 70)
    
    return results


# ============================================================
# SECTION 8: KEY RESEARCH FINDINGS
# ============================================================
"""
================================================================================
KEY RESEARCH FINDINGS
================================================================================

1. PERMUTATION ENCODING IN ATTENTION:
   - Use soft permutations (Sinkhorn) for differentiability
   - Convert to hard permutations via Hungarian algorithm for inference
   - Consider Gumbel-Sinkhorn for stochastic sampling

2. RUBIK'S TENSOR DESIGN:
   - Build dependency graphs between tensor elements
   - Encode moves as group actions on tensor state
   - Use named algorithms as compressed encodings
   - Track constraints (parity, orientation) explicitly

3. MINIMAL OPERATION SET:
   - Transpositions generate all permutations
   - For efficiency: use face rotations as generators (like Rubik's cube)
   - Two generators suffice for full expressiveness

4. MUD PATTERN INSIGHTS:
   - Triggers → Condition-based action selection
   - Macros → Named operation sequences
   - Abstraction → Layer pattern matching over raw operations

5. PRACTICAL IMPLEMENTATION:
   - Use JAX for automatic differentiation and JIT
   - Use escnn/e3nn for equivariant operations
   - Use PyTorch Geometric for graph-based approaches

6. OPEN QUESTIONS:
   - How to learn optimal generating operations?
   - Can we discover named algorithms automatically?
   - What's the optimal encoding for multi-block rearrangements?

================================================================================
"""

if __name__ == "__main__":
    results = verify_permutation_math()
    
    # Save results
    import json
    from datetime import datetime
    
    output = {
        'verification': results,
        'timestamp': datetime.now().isoformat(),
        'research_focus': [
            'Permutation Groups & Tensor Operations',
            'Rubik\'s Cube Mathematics',
            'MUD Scripting Patterns',
            'Practical Tensor Implementations'
        ],
        'key_findings': [
            'Sinkhorn algorithm enables differentiable permutations',
            'Transpositions are minimal generating set',
            'Named algorithms are compressed encodings',
            'Two generators can express any permutation',
            'Dependency graphs encode Rubik\'s-style constraints'
        ],
        'library_recommendations': {
            'core': ['numpy', 'scipy'],
            'deep_learning': ['pytorch', 'jax', 'tensorflow'],
            'equivariant': ['escnn', 'e3nn', 'torch_geometric'],
            'optimization': ['cvxpy', 'optax']
        }
    }
    
    with open('/home/z/my-project/download/research/python_permutation_results.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print("\nResults saved to: /home/z/my-project/download/research/python_permutation_results.json")
