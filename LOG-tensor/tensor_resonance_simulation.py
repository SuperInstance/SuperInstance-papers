#!/usr/bin/env python3
"""
Tensor Resonance Simulation - Mapping Musical Harmonics to Tensor Operations
=============================================================================
Demonstrates how harmonic principles can reduce tensor computation complexity.
"""

import numpy as np
import json
from typing import List, Tuple, Dict
import math
from dataclasses import dataclass

# ============================================================================
# HARMONIC RATIO TO TENSOR DIMENSION MAPPING
# ============================================================================

@dataclass
class HarmonicTensorOp:
    """Represents a tensor operation derived from a harmonic ratio."""
    name: str
    ratio: Tuple[int, int]
    tensor_shape_in: Tuple[int, ...]
    tensor_shape_out: Tuple[int, ...]
    computation_savings: float
    resonance_score: float

def analyze_dimension_harmony(dim1: int, dim2: int) -> Dict:
    """
    Analyze the harmonic relationship between tensor dimensions.
    """
    gcd = math.gcd(dim1, dim2)
    lcm = dim1 * dim2 // gcd
    
    # Consonance-like measure: smaller LCM relative to product
    consonance = gcd / math.sqrt(dim1 * dim2)
    
    # Periodic alignment (like waveform realignment)
    alignment_period = lcm
    
    return {
        'dimensions': f'{dim1} × {dim2}',
        'gcd': gcd,
        'lcm': lcm,
        'consonance': consonance,
        'alignment_period': alignment_period,
        'simplification_factor': gcd,
        'is_consonant': consonance > 0.5
    }

# ============================================================================
# TENSOR OPERATION SIMPLIFICATION BASED ON HARMONICS
# ============================================================================

def simplify_tensor_reshape(shape: Tuple[int, ...], target_total: int) -> Dict:
    """
    Find harmonic reshaping operations for a tensor.
    """
    current_total = 1
    for dim in shape:
        current_total *= dim
    
    gcd = math.gcd(current_total, target_total)
    lcm = current_total * target_total // gcd
    
    # Resonance score
    resonance = gcd / math.sqrt(current_total * target_total)
    
    return {
        'original_shape': shape,
        'original_size': current_total,
        'target_size': target_total,
        'gcd': gcd,
        'lcm': lcm,
        'resonance_score': resonance,
        'can_simplify': gcd > 1,
        'simplification_ratio': target_total / gcd
    }

def analyze_strided_operations(dim: int) -> List[Dict]:
    """
    Analyze stride-based operations as harmonic relationships.
    """
    results = []
    
    for stride in range(2, min(dim // 2 + 1, 20)):
        remaining = dim // stride
        gcd = math.gcd(dim, remaining)
        
        # This is like an interval ratio
        ratio = (dim, remaining) if dim > remaining else (remaining, dim)
        
        results.append({
            'dimension': dim,
            'stride': stride,
            'resulting_size': remaining,
            'ratio': f'{dim}:{remaining}',
            'gcd': gcd,
            'consonance': gcd / math.sqrt(dim * remaining),
            'musical_interval': get_musical_interval_approximation(dim/remaining)
        })
    
    return results

def get_musical_interval_approximation(ratio: float) -> str:
    """
    Find the closest musical interval to a given ratio.
    """
    intervals = {
        'octave': 2.0,
        'perfect_fifth': 1.5,
        'perfect_fourth': 4/3,
        'major_third': 1.25,
        'minor_third': 1.2,
        'major_sixth': 5/3,
        'minor_sixth': 8/5,
        'tritone': 45/32
    }
    
    closest = min(intervals.items(), key=lambda x: abs(x[1] - ratio))
    error = abs(closest[1] - ratio) / ratio * 100
    
    if error < 10:
        return f"{closest[0]} (error: {error:.1f}%)"
    return f"no close match (closest: {closest[0]})"

# ============================================================================
# CONSTRUCTIVE INTERFERENCE AS TENSOR FUSION
# ============================================================================

def analyze_tensor_fusion(shapes: List[Tuple[int, ...]]) -> Dict:
    """
    Analyze how multiple tensors can 'interfere constructively' (fuse efficiently).
    """
    # Calculate total sizes
    sizes = [1 for _ in shapes]
    for i, shape in enumerate(shapes):
        for dim in shape:
            sizes[i] *= dim
    
    # Find common factors (like common harmonics)
    overall_gcd = sizes[0]
    for size in sizes[1:]:
        overall_gcd = math.gcd(overall_gcd, size)
    
    # Calculate overall LCM
    overall_lcm = sizes[0]
    for size in sizes[1:]:
        overall_lcm = overall_lcm * size // math.gcd(overall_lcm, size)
    
    # Resonance matrix (pairwise)
    resonance_matrix = []
    for i, size1 in enumerate(sizes):
        row = []
        for j, size2 in enumerate(sizes):
            gcd = math.gcd(size1, size2)
            resonance = gcd / math.sqrt(size1 * size2)
            row.append(resonance)
        resonance_matrix.append(row)
    
    return {
        'shapes': shapes,
        'sizes': sizes,
        'overall_gcd': overall_gcd,
        'overall_lcm': overall_lcm,
        'fusion_efficiency': overall_gcd / max(sizes),
        'resonance_matrix': resonance_matrix,
        'constructive_fusion_possible': overall_gcd > 1
    }

# ============================================================================
# STANDING WAVES AS TENSOR PATTERNS
# ============================================================================

def analyze_standing_wave_pattern(shape: Tuple[int, ...]) -> Dict:
    """
    Analyze tensor shapes that support standing wave patterns (eigenvectors).
    """
    total_size = 1
    for dim in shape:
        total_size *= dim
    
    # Find dimensions that support natural resonance
    # (dimensions that are powers of small primes)
    def prime_factors(n):
        factors = {}
        d = 2
        while d * d <= n:
            while n % d == 0:
                factors[d] = factors.get(d, 0) + 1
                n //= d
            d += 1
        if n > 1:
            factors[n] = factors.get(n, 0) + 1
        return factors
    
    shape_factors = [prime_factors(dim) for dim in shape]
    
    # Check for "resonant" dimensions (powers of 2, 3, 5)
    resonant_primes = {2, 3, 5}
    resonant_dims = []
    for i, (dim, factors) in enumerate(zip(shape, shape_factors)):
        is_resonant = all(p in resonant_primes for p in factors.keys())
        resonant_dims.append({
            'dimension': dim,
            'prime_factors': factors,
            'is_resonant': is_resonant,
            'resonance_quality': sum(factors.values()) if is_resonant else 0
        })
    
    # FFT-friendly check (all dimensions powers of 2)
    fft_friendly = all(
        all(p == 2 for p in factors.keys())
        for factors in shape_factors
    )
    
    return {
        'shape': shape,
        'total_size': total_size,
        'dimension_analysis': resonant_dims,
        'fft_friendly': fft_friendly,
        'supports_eigendecomposition': all(dim <= 1000 for dim in shape),
        'standing_wave_modes': min(shape)  # Number of independent modes
    }

# ============================================================================
# BEAT FREQUENCY AS COMPUTATION RHYTHM
# ============================================================================

def analyze_computation_rhythm(ops_per_cycle: List[int]) -> Dict:
    """
    Analyze computation rhythm patterns (like beat frequencies).
    """
    # Find the LCM of all cycles (when they all align)
    from functools import reduce
    
    def lcm(a, b):
        return abs(a * b) // math.gcd(a, b)
    
    overall_lcm = reduce(lcm, ops_per_cycle)
    
    # Beat frequencies between operations
    beat_frequencies = []
    for i, op1 in enumerate(ops_per_cycle):
        for j, op2 in enumerate(ops_per_cycle):
            if i < j:
                beat = abs(op1 - op2) if op1 != op2 else float('inf')
                beat_frequencies.append({
                    'ops': f'op{i}_op{j}',
                    'beat_frequency': beat,
                    'alignment_period': lcm(op1, op2)
                })
    
    # Synchronization points
    sync_points = []
    for t in range(1, min(overall_lcm + 1, 1000)):
        if all(t % op == 0 for op in ops_per_cycle):
            sync_points.append(t)
    
    return {
        'operations_per_cycle': ops_per_cycle,
        'overall_alignment_period': overall_lcm,
        'beat_frequencies': beat_frequencies,
        'synchronization_points': sync_points,
        'synchronization_density': len(sync_points) / overall_lcm if overall_lcm < 1000 else 'very_low',
        'rhythm_complexity': math.log2(overall_lcm) if overall_lcm > 0 else 0
    }

# ============================================================================
# CONSONANT TENSOR OPERATIONS
# ============================================================================

def find_consonant_operations(shape: Tuple[int, ...]) -> List[Dict]:
    """
    Find operations on a tensor that are 'consonant' (efficient).
    """
    operations = []
    
    # 1. Octave operations (doubling/halving dimensions)
    for i, dim in enumerate(shape):
        if dim % 2 == 0:
            operations.append({
                'type': 'octave_split',
                'axis': i,
                'description': f'Split axis {i} ({dim}) into 2×{dim//2}',
                'consonance': 1.0,
                'computation_ratio': 0.5
            })
        operations.append({
            'type': 'octave_double',
            'axis': i,
            'description': f'Double axis {i} ({dim}) via interpolation',
            'consonance': 0.8,
            'computation_ratio': 2.0
        })
    
    # 2. Perfect fifth operations (3:2 ratio)
    for i, dim in enumerate(shape):
        if dim % 3 == 0:
            operations.append({
                'type': 'fifth_compress',
                'axis': i,
                'description': f'Compress axis {i} ({dim}) to {dim*2//3} (3:2)',
                'consonance': 0.9,
                'computation_ratio': 0.67
            })
        if dim % 2 == 0:
            operations.append({
                'type': 'fifth_expand',
                'axis': i,
                'description': f'Expand axis {i} ({dim}) to {dim*3//2} (2:3)',
                'consonance': 0.85,
                'computation_ratio': 1.5
            })
    
    # 3. Perfect fourth operations (4:3 ratio)
    for i, dim in enumerate(shape):
        if dim % 4 == 0:
            operations.append({
                'type': 'fourth_compress',
                'axis': i,
                'description': f'Compress axis {i} ({dim}) to {dim*3//4} (4:3)',
                'consonance': 0.85,
                'computation_ratio': 0.75
            })
    
    # 4. Transpose (if dimensions share factors)
    if len(shape) >= 2:
        gcd = math.gcd(shape[0], shape[1])
        if gcd > 1:
            operations.append({
                'type': 'harmonic_transpose',
                'description': f'Transpose shares GCD={gcd} between axes 0,1',
                'consonance': gcd / math.sqrt(shape[0] * shape[1]),
                'computation_ratio': 1.0  # Same ops but better memory access
            })
    
    return sorted(operations, key=lambda x: x['consonance'], reverse=True)

# ============================================================================
# MAIN SIMULATION
# ============================================================================

def run_tensor_resonance_simulation() -> Dict:
    """
    Run comprehensive tensor resonance simulation.
    """
    results = {
        'metadata': {
            'title': 'Tensor Resonance Simulation',
            'purpose': 'Map musical harmonic principles to tensor operations'
        },
        'dimension_analysis': {},
        'fusion_analysis': {},
        'standing_wave_analysis': {},
        'computation_rhythm': {},
        'consonant_operations': {}
    }
    
    # 1. Analyze dimension harmonies
    print("Analyzing dimension harmonies...")
    test_dims = [(64, 48), (128, 64), (256, 192), (1440, 960), (100, 75)]
    for dim1, dim2 in test_dims:
        name = f'{dim1}_{dim2}'
        results['dimension_analysis'][name] = analyze_dimension_harmony(dim1, dim2)
    
    # 2. Analyze tensor fusion
    print("Analyzing tensor fusion...")
    test_shapes = [
        [(64, 64), (32, 128), (16, 256)],
        [(128, 64), (64, 128)],
        [(1024,), (512,), (256,)]
    ]
    for i, shapes in enumerate(test_shapes):
        results['fusion_analysis'][f'shapes_{i}'] = analyze_tensor_fusion(shapes)
    
    # 3. Standing wave analysis
    print("Analyzing standing wave patterns...")
    test_patterns = [(64, 64), (128, 64, 3), (512, 512), (256, 192)]
    for shape in test_patterns:
        results['standing_wave_analysis'][str(shape)] = analyze_standing_wave_pattern(shape)
    
    # 4. Computation rhythm
    print("Analyzing computation rhythms...")
    test_rhythms = [
        [8, 12, 16],  # 2:3:4 ratio - consonant
        [7, 11, 13],  # Primes - dissonant
        [6, 8, 12],   # Highly consonant
        [9, 15, 21]   # Common factor 3
    ]
    for i, rhythm in enumerate(test_rhythms):
        results['computation_rhythm'][f'rhythm_{i}'] = analyze_computation_rhythm(rhythm)
    
    # 5. Find consonant operations
    print("Finding consonant operations...")
    test_tensors = [(64, 64), (128, 96), (256, 192), (512, 512)]
    for shape in test_tensors:
        results['consonant_operations'][str(shape)] = find_consonant_operations(shape)
    
    return results

if __name__ == '__main__':
    results = run_tensor_resonance_simulation()
    
    # Save results
    with open('tensor_resonance_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\nTensor resonance simulation complete!")
    print("Results saved to tensor_resonance_results.json")
    
    # Print summary
    print("\n=== SUMMARY ===")
    print("\nConsonant Tensor Operations Found:")
    for shape, ops in results['consonant_operations'].items():
        print(f"\n  Shape {shape}:")
        for op in ops[:3]:  # Top 3
            print(f"    - {op['type']}: consonance={op['consonance']:.2f}")
    
    print("\n\nKey Insight:")
    print("Tensor dimensions with common factors (high GCD) allow")
    print("'consonant' operations that are more efficient, just as")
    print("musical intervals with low LCM ratios are more consonant.")
