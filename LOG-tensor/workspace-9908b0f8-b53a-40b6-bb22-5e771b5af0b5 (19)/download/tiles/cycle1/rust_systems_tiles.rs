//! =============================================================================
//! RUST SYSTEMS TILES - Memory-Efficient Permutation Representations
//! =============================================================================
//! Zero-cost abstractions for permutation operations focusing on:
//! - Memory layout optimization
//! - Cache-friendly algorithms
//! - In-place operations where possible
//! - Lazy evaluation strategies
//! =============================================================================

use std::ops::{Index, IndexMut, Mul};
use std::slice::{Iter, IterMut};

// =============================================================================
// TILE 1: [ap] Apply In-Place (Cycle-Following Algorithm)
// =============================================================================
// TILE: [ap]
// SIGNATURE: fn apply_in_place<T>(&self, data: &mut [T])
// OPS: O(n) time, O(1) extra space
// USES: HIGH
// -----------------------------------------------------------------------------
/// Applies permutation to mutable slice using cycle-following algorithm.
/// Zero-allocation in-place permutation with O(1) auxiliary space.
/// 
/// # Algorithm
/// Follows cycles: for each unvisited element, follow the cycle and rotate.
/// Uses sign bit or visited array (here: O(n) visited for simplicity).
/// 
/// # Memory
/// - Cache: Sequential read of permutation, random access to data
/// - Branch predictor friendly (short cycles)
pub trait ApplyInPlace {
    fn apply_in_place<T>(&self, data: &mut [T]);
}

impl ApplyInPlace for [usize] {
    fn apply_in_place<T>(&self, data: &mut [T]) {
        assert_eq!(self.len(), data.len());
        let n = self.len();
        let mut visited = vec![false; n];
        
        for start in 0..n {
            if visited[start] {
                continue;
            }
            
            // Follow the cycle starting at 'start'
            let mut current = start;
            let mut next = self[current];
            
            while !visited[current] {
                visited[current] = true;
                data.swap(current, next);
                current = next;
                next = self[current];
                if current == start { break; }
            }
        }
    }
}

// =============================================================================
// TILE 2: [inv] Inverse Computation
// =============================================================================
// TILE: [inv]
// SIGNATURE: fn inverse(&self) -> Vec<usize>
// OPS: O(n) time, O(n) space
// USES: HIGH
// -----------------------------------------------------------------------------
/// Computes the inverse permutation σ⁻¹ where σ⁻¹[σ[i]] = i.
/// Single pass, cache-friendly write pattern.
pub trait Inverse {
    fn inverse(&self) -> Vec<usize>;
}

impl Inverse for [usize] {
    #[inline]
    fn inverse(&self) -> Vec<usize> {
        let n = self.len();
        let mut inv = vec![0; n];
        
        // Single pass: inv[σ[i]] = i
        for (i, &sigma_i) in self.iter().enumerate() {
            inv[sigma_i] = i;
        }
        inv
    }
}

// =============================================================================
// TILE 3: [cmp] Composition (Eager Evaluation)
// =============================================================================
// TILE: [cmp]
// SIGNATURE: fn compose(&self, other: &[usize]) -> Vec<usize>
// OPS: O(n) time, O(n) space
// USES: HIGH
// -----------------------------------------------------------------------------
/// Computes σ ∘ τ: result[i] = σ[τ[i]]
/// Right-to-left application (mathematical convention).
pub trait Compose {
    fn compose(&self, other: &[usize]) -> Vec<usize>;
}

impl Compose for [usize] {
    #[inline]
    fn compose(&self, other: &[usize]) -> Vec<usize> {
        assert_eq!(self.len(), other.len());
        let n = self.len();
        
        // σ ∘ τ: result[i] = σ[τ[i]]
        other.iter().map(|&tau_i| self[tau_i]).collect()
    }
}

// =============================================================================
// TILE 4: [lcmp] Lazy Composition (Zero-Cost Abstraction)
// =============================================================================
// TILE: [lcmp]
// SIGNATURE: struct LazyCompose<'a, 'b> { ... }
// OPS: O(1) construction, O(1) access, O(n) when materialized
// USES: MED
// -----------------------------------------------------------------------------
/// Lazy composition that defers computation until materialization.
/// Zero-cost until evaluation - ideal for chains of compositions.
#[derive(Clone, Copy)]
pub struct LazyCompose<'a, 'b> {
    sigma: &'a [usize],
    tau: &'b [usize],
}

impl<'a, 'b> LazyCompose<'a, 'b> {
    #[inline]
    pub fn new(sigma: &'a [usize], tau: &'b [usize]) -> Self {
        assert_eq!(sigma.len(), tau.len());
        Self { sigma, tau }
    }
    
    #[inline]
    pub fn get(&self, i: usize) -> usize {
        self.sigma[self.tau[i]]
    }
    
    /// Materialize into owned permutation
    #[inline]
    pub fn materialize(&self) -> Vec<usize> {
        (0..self.sigma.len()).map(|i| self.get(i)).collect()
    }
}

impl<'a, 'b> Index<usize> for LazyCompose<'a, 'b> {
    type Output = usize;
    
    #[inline]
    fn index(&self, i: usize) -> &Self::Output {
        // Note: This leaks the computed value - use get() for zero-alloc
        unimplemented!("Use get() for zero-allocation access")
    }
}

// =============================================================================
// TILE 5: [cyc] Cycle Decomposition (Compressed Sparse Representation)
// =============================================================================
// TILE: [cyc]
// SIGNATURE: fn to_cycles(&self) -> Vec<Vec<usize>>
// OPS: O(n) time, O(n) space
// USES: HIGH
// -----------------------------------------------------------------------------
/// Decomposes permutation into disjoint cycles.
/// Memory-efficient for sparse permutations (many fixed points).
/// 
/// # Memory Layout
/// - Dense: O(n) for full cycle representation
/// - Sparse: O(k) where k = number of non-trivial elements
pub trait ToCycles {
    fn to_cycles(&self) -> Vec<Vec<usize>>;
    fn to_cycles_sparse(&self) -> Vec<(usize, Vec<usize>)>; // Only non-trivial cycles
}

impl ToCycles for [usize] {
    fn to_cycles(&self) -> Vec<Vec<usize>> {
        let n = self.len();
        let mut visited = vec![false; n];
        let mut cycles = Vec::new();
        
        for start in 0..n {
            if visited[start] || self[start] == start {
                visited[start] = true;
                continue;
            }
            
            let mut cycle = Vec::new();
            let mut current = start;
            
            while !visited[current] {
                visited[current] = true;
                cycle.push(current);
                current = self[current];
            }
            
            if cycle.len() > 1 {
                cycles.push(cycle);
            }
        }
        cycles
    }
    
    fn to_cycles_sparse(&self) -> Vec<(usize, Vec<usize>)> {
        self.to_cycles()
            .into_iter()
            .filter(|c| c.len() > 1)
            .map(|c| (c.len(), c))
            .collect()
    }
}

// =============================================================================
// TILE 6: [fcyc] From Cycles (Construction)
// =============================================================================
// TILE: [fcyc]
// SIGNATURE: fn from_cycles(cycles: &[Vec<usize>], n: usize) -> Vec<usize>
// OPS: O(n) time, O(n) space
// USES: MED
// -----------------------------------------------------------------------------
/// Constructs permutation from cycle notation.
/// Optimized for sparse cycle input.
pub fn from_cycles(cycles: &[Vec<usize>], n: usize) -> Vec<usize> {
    let mut perm: Vec<usize> = (0..n).collect(); // Identity
    
    for cycle in cycles {
        if cycle.len() < 2 {
            continue;
        }
        
        // (a b c ...) means a->b, b->c, ..., last->a
        for i in 0..cycle.len() {
            perm[cycle[i]] = cycle[(i + 1) % cycle.len()];
        }
    }
    perm
}

// =============================================================================
// TILE 7: [pm] Permutation Matrix Operations
// =============================================================================
// TILE: [pm]
// SIGNATURE: fn as_matrix(&self) -> Vec<Vec<u8>>
// OPS: O(n²) space for dense, O(n) for sparse
// USES: LOW (mostly for visualization/verification)
// -----------------------------------------------------------------------------
/// Dense permutation matrix representation.
/// Uses O(n²) memory - only for small n or verification.
/// 
/// # Sparse Alternative
/// Use permutation vector directly as sparse representation:
/// Each position (i, perm[i]) has value 1.
pub trait PermutationMatrix {
    fn as_dense_matrix(&self) -> Vec<Vec<u8>>;
    fn matrix_vector_product(&self, v: &[f64]) -> Vec<f64>;
}

impl PermutationMatrix for [usize] {
    fn as_dense_matrix(&self) -> Vec<Vec<u8>> {
        let n = self.len();
        let mut matrix = vec![vec![0u8; n]; n];
        
        for (i, &j) in self.iter().enumerate() {
            matrix[j][i] = 1;
        }
        matrix
    }
    
    /// O(n) sparse matrix-vector product
    #[inline]
    fn matrix_vector_product(&self, v: &[f64]) -> Vec<f64> {
        assert_eq!(self.len(), v.len());
        self.iter().map(|&j| v[j]).collect()
    }
}

// =============================================================================
// TILE 8: [pow] Permutation Power (Repeated Composition)
// =============================================================================
// TILE: [pow]
// SIGNATURE: fn power(&self, k: i64) -> Vec<usize>
// OPS: O(n) for positive powers using cycle structure
// USES: MED
// -----------------------------------------------------------------------------
/// Computes σ^k using cycle structure for O(n) algorithm.
/// Negative powers compute inverse first.
pub trait Power {
    fn power(&self, k: i64) -> Vec<usize>;
}

impl Power for [usize] {
    fn power(&self, k: i64) -> Vec<usize> {
        let n = self.len();
        
        if k == 0 {
            return (0..n).collect();
        }
        
        let cycles = self.to_cycles();
        let mut result: Vec<usize> = (0..n).collect();
        
        for cycle in cycles {
            let len = cycle.len() as i64;
            let shift = ((k % len) + len) % len; // Handle negative k
            
            for (i, &elem) in cycle.iter().enumerate() {
                let target_idx = (i as i64 + shift) % len;
                result[elem] = cycle[target_idx as usize];
            }
        }
        
        result
    }
}

// =============================================================================
// TILE 9: [par] Parity/Sign Computation
// =============================================================================
// TILE: [par]
// SIGNATURE: fn parity(&self) -> i32
// OPS: O(n) time, O(n) space (visited array)
// USES: HIGH
// -----------------------------------------------------------------------------
/// Computes parity: +1 for even permutation, -1 for odd.
/// Uses cycle structure: parity = (-1)^(n - number_of_cycles)
pub trait Parity {
    fn parity(&self) -> i32;
    fn is_even(&self) -> bool;
}

impl Parity for [usize] {
    #[inline]
    fn parity(&self) -> i32 {
        let n = self.len();
        let mut visited = vec![false; n];
        let mut cycle_count = 0;
        
        for start in 0..n {
            if visited[start] {
                continue;
            }
            
            let mut current = start;
            while !visited[current] {
                visited[current] = true;
                current = self[current];
            }
            cycle_count += 1;
        }
        
        // Parity = (-1)^(n - cycles)
        if (n - cycle_count) % 2 == 0 { 1 } else { -1 }
    }
    
    #[inline]
    fn is_even(&self) -> bool {
        self.parity() == 1
    }
}

// =============================================================================
// TILE 10: [ord] Order Computation
// =============================================================================
// TILE: [ord]
// SIGNATURE: fn order(&self) -> usize
// OPS: O(n) time using cycle structure
// USES: MED
// -----------------------------------------------------------------------------
/// Computes order: smallest k > 0 such that σ^k = identity.
/// Order = LCM of all cycle lengths.
pub trait Order {
    fn order(&self) -> usize;
}

impl Order for [usize] {
    fn order(&self) -> usize {
        fn gcd(a: usize, b: usize) -> usize {
            if b == 0 { a } else { gcd(b, a % b) }
        }
        
        fn lcm(a: usize, b: usize) -> usize {
            a / gcd(a, b) * b
        }
        
        let cycles = self.to_cycles();
        let mut result = 1;
        
        for cycle in cycles {
            result = lcm(result, cycle.len());
        }
        
        result
    }
}

// =============================================================================
// TILE 11: [apu] Apply to Uninitialized Buffer
// =============================================================================
// TILE: [apu]
// SIGNATURE: fn apply_to_new<T>(&self, data: &[T]) -> Vec<T>
// OPS: O(n) time, O(n) space (output buffer)
// USES: HIGH
// -----------------------------------------------------------------------------
/// Apply permutation to create new reordered buffer.
/// More efficient than clone + apply_in_place when original not needed.
pub trait ApplyToNew {
    fn apply_to_new<T: Clone>(&self, data: &[T]) -> Vec<T>;
}

impl ApplyToNew for [usize] {
    #[inline]
    fn apply_to_new<T: Clone>(&self, data: &[T]) -> Vec<T> {
        assert_eq!(self.len(), data.len());
        self.iter().map(|&i| data[i].clone()).collect()
    }
}

// =============================================================================
// TILE 12: [swz] Swizzle (SIMD-Friendly Batch Permutation)
// =============================================================================
// TILE: [swz]
// SIGNATURE: fn swizzle<T: Copy>(&self, data: &[T]) -> Vec<T>
// OPS: O(n) with potential SIMD vectorization
// USES: HIGH
// -----------------------------------------------------------------------------
/// SIMD-friendly batch permutation for Copy types.
/// Optimized for contiguous memory access patterns.
pub trait Swizzle {
    fn swizzle<T: Copy>(&self, data: &[T]) -> Vec<T>;
}

impl Swizzle for [usize] {
    #[inline]
    fn swizzle<T: Copy>(&self, data: &[T]) -> Vec<T> {
        assert_eq!(self.len(), data.len());
        let n = data.len();
        let mut result = Vec::with_capacity(n);
        
        // SAFETY: We're writing exactly n elements
        unsafe {
            result.set_len(n);
            for (i, &idx) in self.iter().enumerate() {
                *result.get_unchecked_mut(i) = *data.get_unchecked(idx);
            }
        }
        result
    }
}

// =============================================================================
// TILE 13: [tr] Transpose Permutation (Index Mapping)
// =============================================================================
// TILE: [tr]
// SIGNATURE: fn transpose(&self) -> impl Iterator<Item = (usize, usize)>
// OPS: O(n) lazy iterator
// USES: MED
// -----------------------------------------------------------------------------
/// Returns iterator over (from, to) index pairs.
/// Useful for sparse operations and debugging.
pub trait TransposeIter {
    type Iter: Iterator<Item = (usize, usize)>;
    fn transpose_iter(&self) -> Self::Iter;
}

pub struct TransposeIterator<'a> {
    perm: &'a [usize],
    pos: usize,
}

impl<'a> Iterator for TransposeIterator<'a> {
    type Item = (usize, usize);
    
    #[inline]
    fn next(&mut self) -> Option<Self::Item> {
        if self.pos < self.perm.len() {
            let result = (self.pos, self.perm[self.pos]);
            self.pos += 1;
            Some(result)
        } else {
            None
        }
    }
}

impl TransposeIter for [usize] {
    type Iter = TransposeIterator<'_>;
    
    fn transpose_iter(&self) -> Self::Iter {
        TransposeIterator { perm: self, pos: 0 }
    }
}

// =============================================================================
// TILE 14: [ap2] Apply 2D (Matrix Row Permutation)
// =============================================================================
// TILE: [ap2]
// SIGNATURE: fn apply_2d_rows<T>(&self, matrix: &mut [Vec<T>])
// OPS: O(n) row swaps
// USES: MED
// -----------------------------------------------------------------------------
/// Permutes rows of a 2D matrix in-place.
/// Cache-optimized for row-major storage.
pub trait Apply2D {
    fn apply_2d_rows<T>(&self, matrix: &mut [Vec<T>]);
}

impl Apply2D for [usize] {
    fn apply_2d_rows<T>(&self, matrix: &mut [Vec<T>]) {
        let n = self.len();
        assert_eq!(n, matrix.len());
        let mut visited = vec![false; n];
        
        for start in 0..n {
            if visited[start] || self[start] == start {
                visited[start] = true;
                continue;
            }
            
            let mut current = start;
            let mut next = self[current];
            
            while !visited[current] {
                visited[current] = true;
                matrix.swap(current, next);
                current = next;
                next = self[current];
                if current == start { break; }
            }
        }
    }
}

// =============================================================================
// TILE 15: [rng] Range Permutation (Contiguous Swap Optimization)
// =============================================================================
// TILE: [rng]
// SIGNATURE: fn apply_range(&self, data: &mut [T], start: usize, len: usize)
// OPS: O(len) time on subrange
// USES: LOW
// -----------------------------------------------------------------------------
/// Apply permutation to a subrange only.
/// Useful for block algorithms and recursive decomposition.
pub trait ApplyRange {
    fn apply_range<T>(&self, data: &mut [T], start: usize, len: usize);
}

impl ApplyRange for [usize] {
    fn apply_range<T>(&self, data: &mut [T], start: usize, len: usize) {
        assert!(start + len <= self.len() && start + len <= data.len());
        
        let mut visited = vec![false; len];
        
        for i in 0..len {
            if visited[i] {
                continue;
            }
            
            let mut current = i;
            let perm_i = self[start + current] - start;
            
            if perm_i >= len {
                continue; // Points outside range
            }
            
            let mut next = perm_i;
            
            while !visited[current] && next < len {
                visited[current] = true;
                data.swap(start + current, start + next);
                current = next;
                next = self[start + current] - start;
                if current == i { break; }
            }
        }
    }
}

// =============================================================================
// TILE 16: [enc] Compact Encoding (Small Permutations)
// =============================================================================
// TILE: [enc]
// SIGNATURE: fn encode(&self) -> u64
// OPS: O(n) encoding, O(n) decoding
// USES: LOW (for serialization)
// -----------------------------------------------------------------------------
/// Encodes small permutations (n <= 20) as single u64.
/// Uses factorial number system for bijection with [0, n!).
pub trait CompactEncoding {
    fn encode(&self) -> u64;
    fn decode(code: u64, n: usize) -> Vec<usize>;
}

impl CompactEncoding for [usize] {
    fn encode(&self) -> u64 {
        let n = self.len();
        let mut used = vec![false; n];
        let mut code: u64 = 0;
        let mut factorial: u64 = 1;
        
        for i in (1..n).rev() {
            factorial *= (n - i) as u64;
            
            // Count smaller unused elements before self[i]
            let mut count = 0;
            for j in 0..self[i] {
                if !used[j] {
                    count += 1;
                }
            }
            
            code += count as u64 * factorial;
            used[self[i]] = true;
        }
        
        code
    }
    
    fn decode(code: u64, n: usize) -> Vec<usize> {
        let mut remaining: Vec<usize> = (0..n).collect();
        let mut result = vec![0; n];
        let mut remaining_code = code;
        
        for i in (0..n).rev() {
            let factorial = (1..=(n - i) as u64).product::<u64>();
            let idx = (remaining_code / factorial) as usize;
            remaining_code %= factorial;
            
            result[i] = remaining.remove(idx);
        }
        
        result
    }
}

// =============================================================================
// BONUS: Zero-Allocation Permutation View
// =============================================================================
/// A view into a permutation without ownership.
/// Enables zero-copy operations on permutation slices.
#[derive(Clone, Copy)]
pub struct PermView<'a> {
    inner: &'a [usize],
}

impl<'a> PermView<'a> {
    #[inline]
    pub fn new(perm: &'a [usize]) -> Self {
        Self { inner: perm }
    }
    
    #[inline]
    pub fn len(&self) -> usize {
        self.inner.len()
    }
    
    #[inline]
    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }
    
    #[inline]
    pub fn get(&self, i: usize) -> usize {
        self.inner[i]
    }
    
    /// Compose with another permutation view (lazy)
    #[inline]
    pub fn compose<'b>(&'a self, other: PermView<'b>) -> LazyCompose<'a, 'b> {
        LazyCompose::new(self.inner, other.inner)
    }
    
    /// Inverse, materialized
    #[inline]
    pub fn inverse(&self) -> Vec<usize> {
        self.inner.inverse()
    }
}

impl<'a> Index<usize> for PermView<'a> {
    type Output = usize;
    
    #[inline]
    fn index(&self, i: usize) -> &Self::Output {
        &self.inner[i]
    }
}

// =============================================================================
// Tests
// =============================================================================
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_inverse() {
        let perm = vec![2, 0, 1, 3];
        let inv = perm.inverse();
        assert_eq!(inv, vec![1, 2, 0, 3]);
        
        // Verify σ ∘ σ⁻¹ = identity
        let identity = perm.compose(&inv);
        assert_eq!(identity, vec![0, 1, 2, 3]);
    }
    
    #[test]
    fn test_compose() {
        let sigma = vec![1, 2, 0];  // (0 1 2)
        let tau = vec![2, 0, 1];    // (0 2 1)
        
        // σ ∘ τ
        let composed = sigma.compose(&tau);
        assert_eq!(composed, vec![0, 1, 2]); // Identity
    }
    
    #[test]
    fn test_cycles() {
        let perm = vec![1, 2, 0, 4, 3, 5];
        let cycles = perm.to_cycles();
        assert_eq!(cycles.len(), 2);
        
        // One cycle should be (0, 1, 2)
        assert!(cycles.iter().any(|c| c == &vec![0, 1, 2]));
    }
    
    #[test]
    fn test_from_cycles() {
        let cycles = vec![vec![0, 1, 2], vec![3, 4]];
        let perm = from_cycles(&cycles, 6);
        assert_eq!(perm, vec![1, 2, 0, 4, 3, 5]);
    }
    
    #[test]
    fn test_parity() {
        // (0 1) - odd
        let odd = vec![1, 0, 2];
        assert_eq!(odd.parity(), -1);
        
        // (0 1 2) - even
        let even = vec![1, 2, 0];
        assert_eq!(even.parity(), 1);
        
        // Identity - even
        let identity: Vec<usize> = (0..5).collect();
        assert_eq!(identity.parity(), 1);
    }
    
    #[test]
    fn test_power() {
        let perm = vec![1, 2, 0]; // (0 1 2)
        
        // σ³ = identity
        let identity = perm.power(3);
        assert_eq!(identity, vec![0, 1, 2]);
        
        // σ²
        let square = perm.power(2);
        assert_eq!(square, vec![2, 0, 1]);
    }
    
    #[test]
    fn test_apply_in_place() {
        let perm = vec![2, 0, 1];
        let mut data = vec!['a', 'b', 'c'];
        perm.apply_in_place(&mut data);
        assert_eq!(data, vec!['c', 'a', 'b']);
    }
    
    #[test]
    fn test_order() {
        let perm = vec![1, 2, 0]; // (0 1 2)
        assert_eq!(perm.order(), 3);
        
        let perm2 = vec![1, 0, 3, 2]; // (0 1)(2 3)
        assert_eq!(perm2.order(), 2);
    }
    
    #[test]
    fn test_lazy_compose() {
        let sigma = vec![1, 2, 0];
        let tau = vec![2, 0, 1];
        
        let lazy = LazyCompose::new(&sigma, &tau);
        
        // σ[τ[i]] for each i
        assert_eq!(lazy.get(0), sigma[tau[0]]); // σ[2] = 0
        assert_eq!(lazy.get(1), sigma[tau[1]]); // σ[0] = 1
        assert_eq!(lazy.get(2), sigma[tau[2]]); // σ[1] = 2
        
        let materialized = lazy.materialize();
        assert_eq!(materialized, vec![0, 1, 2]);
    }
    
    #[test]
    fn test_compact_encoding() {
        let perm = vec![2, 0, 1, 3];
        let code = perm.encode();
        let decoded = <[usize]>::decode(code, 4);
        assert_eq!(decoded, perm);
    }
    
    #[test]
    fn test_perm_view() {
        let perm = vec![1, 2, 0];
        let view = PermView::new(&perm);
        
        assert_eq!(view.len(), 3);
        assert_eq!(view[0], 1);
        assert_eq!(view[1], 2);
        assert_eq!(view[2], 0);
    }
}

// =============================================================================
// SUMMARY TABLE
// =============================================================================
/*
| TILE  | NAME           | SIGNATURE                                    | OPS      | SPACE    | USES |
|-------|----------------|----------------------------------------------|----------|----------|------|
| ap    | Apply In-Place | fn apply_in_place<T>(&self, data: &mut [T])  | O(n)     | O(1)*    | HIGH |
| inv   | Inverse        | fn inverse(&self) -> Vec<usize>              | O(n)     | O(n)     | HIGH |
| cmp   | Compose        | fn compose(&self, other: &[usize]) -> Vec    | O(n)     | O(n)     | HIGH |
| lcmp  | Lazy Compose   | struct LazyCompose<'a, 'b>                   | O(1)**   | O(1)     | MED  |
| cyc   | To Cycles      | fn to_cycles(&self) -> Vec<Vec<usize>>       | O(n)     | O(n)     | HIGH |
| fcyc  | From Cycles    | fn from_cycles(cycles: &[Vec], n) -> Vec     | O(n)     | O(n)     | MED  |
| pm    | Perm Matrix    | fn as_dense_matrix(&self) -> Vec<Vec<u8>>    | O(n²)    | O(n²)    | LOW  |
| pow   | Power          | fn power(&self, k: i64) -> Vec<usize>        | O(n)     | O(n)     | MED  |
| par   | Parity         | fn parity(&self) -> i32                      | O(n)     | O(n)     | HIGH |
| ord   | Order          | fn order(&self) -> usize                     | O(n)     | O(n)     | MED  |
| apu   | Apply to New   | fn apply_to_new<T: Clone>(&self, data: &[T]) | O(n)     | O(n)     | HIGH |
| swz   | Swizzle        | fn swizzle<T: Copy>(&self, data: &[T]) -> Vec| O(n)     | O(n)     | HIGH |
| tr    | Transpose Iter | fn transpose_iter(&self) -> impl Iterator    | O(1)***  | O(1)     | MED  |
| ap2   | Apply 2D Rows  | fn apply_2d_rows<T>(&self, matrix: &mut[..]) | O(n)     | O(n)**** | MED  |
| rng   | Apply Range    | fn apply_range<T>(&self, data, start, len)   | O(len)   | O(len)   | LOW  |
| enc   | Compact Encode | fn encode(&self) -> u64                      | O(n)     | O(1)     | LOW  |

* O(n) visited array for cycle tracking
** O(1) per element access, O(n) to materialize
*** Lazy iterator
**** O(n) for visited array

MEMORY LAYOUT RECOMMENDATIONS:
- Use one-line notation (Vec<usize>) for dense permutations
- Use cycle notation for sparse permutations with many fixed points
- Use PermView for zero-copy operations
- Use LazyCompose for chains of compositions
*/
