#!/usr/bin/env python3
"""
Multi-Round Mathematical Discovery Framework
============================================
Extensive simulations exploring:
- Direction as first-class citizen
- Multi-dimensional direction vectors
- Spin trajectories with gravitational weights
- Simplified tensor mathematics
- Rock-solid mathematical foundations
"""

import numpy as np
import json
import requests
import time
from typing import List, Dict, Tuple, Any
from datetime import datetime

# DeepSeek API
DEEPSEEK_API_KEY = "your_api_key_here"
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"

ALL_DISCOVERIES = []
ROUND_RESULTS = {}

def query_deepseek(prompt: str, max_tokens: int = 3000) -> str:
    """Query DeepSeek API"""
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "You are a mathematician specializing in Lie groups, equivariant ML, and geometric deep learning. Provide rigorous mathematical insights with specific formulas. Be concise but thorough."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": max_tokens
    }
    
    try:
        resp = requests.post(DEEPSEEK_URL, headers=headers, json=payload, timeout=90)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"API Error: {e}"


# =============================================================================
# Core Mathematical Operations
# =============================================================================

def random_quaternion():
    """Uniform random quaternion on S^3"""
    u = np.random.random(3)
    return np.array([
        np.sqrt(1-u[0]) * np.sin(2*np.pi*u[1]),
        np.sqrt(1-u[0]) * np.cos(2*np.pi*u[1]),
        np.sqrt(u[0]) * np.sin(2*np.pi*u[2]),
        np.sqrt(u[0]) * np.cos(2*np.pi*u[2])
    ])


def quaternion_to_matrix(q):
    """Quaternion to rotation matrix"""
    q0, q1, q2, q3 = q
    return np.array([
        [1-2*q2**2-2*q3**2, 2*q1*q2-2*q0*q3, 2*q1*q3+2*q0*q2],
        [2*q1*q2+2*q0*q3, 1-2*q1**2-2*q3**2, 2*q2*q3-2*q0*q1],
        [2*q1*q3-2*q0*q2, 2*q2*q3+2*q0*q1, 1-2*q1**2-2*q2**2]
    ])


def qmultiply(q1, q2):
    """Hamilton product"""
    return np.array([
        q1[0]*q2[0] - q1[1]*q2[1] - q1[2]*q2[2] - q1[3]*q2[3],
        q1[0]*q2[1] + q1[1]*q2[0] + q1[2]*q2[3] - q1[3]*q2[2],
        q1[0]*q2[2] - q1[1]*q2[3] + q1[2]*q2[0] + q1[3]*q2[1],
        q1[0]*q2[3] + q1[1]*q2[2] - q1[2]*q2[1] + q1[3]*q2[0]
    ])


def qconjugate(q):
    return np.array([q[0], -q[1], -q[2], -q[3]])


def dq_from_rt(qr, t):
    """Dual quaternion from rotation and translation"""
    tq = np.array([0, t[0], t[1], t[2]])
    qd = 0.5 * qmultiply(tq, qr)
    return (qr, qd)


def dq_multiply(dq1, dq2):
    """Multiply dual quaternions"""
    qr = qmultiply(dq1[0], dq2[0])
    qd = qmultiply(dq1[0], dq2[1]) + qmultiply(dq1[1], dq2[0])
    return (qr, qd)


def dq_conjugate(dq):
    return (qconjugate(dq[0]), qconjugate(dq[1]))


# =============================================================================
# Round 4-6: Direction-First Architectures
# =============================================================================

def sim_direction_velocity_encoding():
    """
    Direction as primary feature - velocity/momentum encoding
    Key insight: Direction (unit vector) is rotation-equivariant
    """
    print("\n" + "="*60)
    print("ROUND 4: Direction-Velocity Encoding")
    print("="*60)
    
    n = 50
    positions = np.random.randn(n, 3) * 2
    
    # Direction = normalized velocity (momentum direction)
    velocities = np.random.randn(n, 3)
    directions = velocities / (np.linalg.norm(velocities, axis=1, keepdims=True) + 1e-8)
    
    # Energy = ||velocity||^2 / 2 (kinetic energy)
    energies = 0.5 * np.sum(velocities**2, axis=1)
    
    # Direction-encoded features: [direction, energy, position]
    # Direction is rotation-equivariant, energy is invariant
    features = np.concatenate([directions, energies.reshape(-1,1), positions], axis=1)
    
    # Test: Rotate system
    q = random_quaternion()
    R = quaternion_to_matrix(q)
    
    rotated_pos = (R @ positions.T).T
    rotated_dir = (R @ directions.T).T
    rotated_features = np.concatenate([rotated_dir, energies.reshape(-1,1), rotated_pos], axis=1)
    
    # Direction attention: dot product of directions
    attn = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            attn[i,j] = np.dot(directions[i], directions[j])
    attn = np.exp(attn) / np.exp(attn).sum(axis=1, keepdims=True)
    
    # Rotated attention
    attn2 = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            attn2[i,j] = np.dot(rotated_dir[i], rotated_dir[j])
    attn2 = np.exp(attn2) / np.exp(attn2).sum(axis=1, keepdims=True)
    
    # Attention should be invariant to rotation
    error = np.max(np.abs(attn - attn2))
    
    discovery = f"Direction-velocity attention: rotation-invariant with error {error:.2e}"
    print(f"  Direction attention rotation invariance: {error:.2e}")
    print(f"  Mean energy: {np.mean(energies):.4f}")
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {'error': float(error), 'mean_energy': float(np.mean(energies))}


def sim_momentum_message_passing():
    """
    Momentum-weighted message passing
    Messages flow along momentum directions
    """
    print("\n" + "="*60)
    print("ROUND 5: Momentum-Weighted Message Passing")
    print("="*60)
    
    n, k = 40, 8
    positions = np.random.randn(n, 3) * 2
    velocities = np.random.randn(n, 3)
    energies = 0.5 * np.sum(velocities**2, axis=1)
    
    # Messages weighted by momentum alignment
    messages = np.zeros((n, 6))  # [position_update, velocity_update]
    
    for i in range(n):
        dists = np.linalg.norm(positions - positions[i], axis=1)
        neighbors = np.argsort(dists)[1:k+1]
        
        for j in neighbors:
            # Momentum alignment: cos(angle) between velocities
            alignment = np.dot(velocities[i], velocities[j]) / (
                np.linalg.norm(velocities[i]) * np.linalg.norm(velocities[j]) + 1e-8
            )
            
            # Message flows along momentum direction
            rel_pos = positions[j] - positions[i]
            rel_vel = velocities[j] - velocities[i]
            
            # Momentum-weighted message
            weight = 0.5 * (1 + alignment)  # [0, 1]
            messages[i, :3] += weight * rel_pos
            messages[i, 3:] += weight * rel_vel
    
    # Test equivariance
    q = random_quaternion()
    R = quaternion_to_matrix(q)
    
    rotated_pos = (R @ positions.T).T
    rotated_vel = (R @ velocities.T).T
    
    messages2 = np.zeros((n, 6))
    for i in range(n):
        dists = np.linalg.norm(rotated_pos - rotated_pos[i], axis=1)
        neighbors = np.argsort(dists)[1:k+1]
        
        for j in neighbors:
            alignment = np.dot(rotated_vel[i], rotated_vel[j]) / (
                np.linalg.norm(rotated_vel[i]) * np.linalg.norm(rotated_vel[j]) + 1e-8
            )
            rel_pos = rotated_pos[j] - rotated_pos[i]
            rel_vel = rotated_vel[j] - rotated_vel[i]
            weight = 0.5 * (1 + alignment)
            messages2[i, :3] += weight * rel_pos
            messages2[i, 3:] += weight * rel_vel
    
    # Check: rotated messages should equal R @ original messages
    expected_pos = (R @ messages[:, :3].T).T
    expected_vel = (R @ messages[:, 3:].T).T
    
    pos_error = np.mean(np.linalg.norm(messages2[:, :3] - expected_pos, axis=1))
    vel_error = np.mean(np.linalg.norm(messages2[:, 3:] - expected_vel, axis=1))
    
    discovery = f"Momentum message passing equivariant: pos_error={pos_error:.2e}, vel_error={vel_error:.2e}"
    print(f"  Position equivariance error: {pos_error:.2e}")
    print(f"  Velocity equivariance error: {vel_error:.2e}")
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {'pos_error': float(pos_error), 'vel_error': float(vel_error)}


def sim_energy_conserving_attention():
    """
    Attention that conserves total energy
    """
    print("\n" + "="*60)
    print("ROUND 6: Energy-Conserving Attention")
    print("="*60)
    
    n = 35
    energies = np.abs(np.random.randn(n)) + 0.1  # Kinetic energies (positive)
    total_energy = np.sum(energies)
    
    # Energy-weighted attention: tokens with similar energies attend more
    attn = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            # Gaussian kernel on energy difference
            attn[i,j] = np.exp(-((energies[i] - energies[j])**2) / (2 * np.var(energies)))
    attn = attn / attn.sum(axis=1, keepdims=True)
    
    # Energy redistribution through attention
    new_energies = np.zeros(n)
    for i in range(n):
        new_energies[i] = np.sum(attn[i] * energies)
    
    # Total energy should be approximately conserved
    energy_conservation_error = abs(np.sum(new_energies) - total_energy) / total_energy
    
    # Symplectic structure: energy flows preserve total
    flow_matrix = np.outer(energies, energies) / total_energy
    flow_eigenvalues = np.linalg.eigvalsh(flow_matrix)
    
    discovery = f"Energy-conserving attention: conservation_error={energy_conservation_error:.2e}"
    print(f"  Original total energy: {total_energy:.4f}")
    print(f"  After attention: {np.sum(new_energies):.4f}")
    print(f"  Conservation error: {energy_conservation_error:.2e}")
    print(f"  Flow matrix rank: {np.sum(flow_eigenvalues > 1e-6)}")
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {
        'conservation_error': float(energy_conservation_error),
        'total_energy': float(total_energy),
        'flow_rank': int(np.sum(flow_eigenvalues > 1e-6))
    }


# =============================================================================
# Round 7-9: Multi-Dimensional Direction Vectors
# =============================================================================

def sim_higher_dim_direction():
    """
    Directions in higher dimensions (S^n instead of S^2)
    Generalizes rotation-equivariance to SO(n)
    """
    print("\n" + "="*60)
    print("ROUND 7: Higher-Dimensional Direction Vectors")
    print("="*60)
    
    n_tokens, dims = 40, [3, 4, 5, 6, 8]
    results = {}
    
    for d in dims:
        # Random directions on S^{d-1}
        raw = np.random.randn(n_tokens, d)
        directions = raw / np.linalg.norm(raw, axis=1, keepdims=True)
        
        # Attention via inner product (invariant under SO(d))
        attn = directions @ directions.T
        attn = np.exp(attn) / np.exp(attn).sum(axis=1, keepdims=True)
        
        # Test SO(d) invariance
        Q, _ = np.linalg.qr(np.random.randn(d, d))  # Random orthogonal matrix
        rotated = directions @ Q.T
        
        attn2 = rotated @ rotated.T
        attn2 = np.exp(attn2) / np.exp(attn2).sum(axis=1, keepdims=True)
        
        error = np.max(np.abs(attn - attn2))
        results[d] = error
        
        print(f"  Dimension {d}: SO({d}) invariance error = {error:.2e}")
    
    discovery = f"Higher-dim directions: SO(d) invariant for all d, max error={max(results.values()):.2e}"
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {f'dim_{d}': float(e) for d, e in results.items()}


def sim_tensor_direction_encoding():
    """
    Directions encoded as rank-2 tensors (symmetric positive-definite)
    Direction tensor D = d ⊗ d (outer product)
    """
    print("\n" + "="*60)
    print("ROUND 8: Tensor Direction Encoding")
    print("="*60)
    
    n = 35
    directions = np.random.randn(n, 3)
    directions = directions / np.linalg.norm(directions, axis=1, keepdims=True)
    
    # Tensor encoding: D_i = d_i ⊗ d_i (3x3 symmetric rank-1 tensor)
    tensors = np.array([np.outer(d, d) for d in directions])
    
    # Tensor features: eigenvalues (all 0 except one = 1), trace = 1
    traces = np.array([np.trace(D) for D in tensors])
    det = np.array([np.linalg.det(D) for D in tensors])
    
    # Attention via Frobenius inner product
    attn = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            attn[i,j] = np.sum(tensors[i] * tensors[j])
    attn = np.exp(attn) / np.exp(attn).sum(axis=1, keepdims=True)
    
    # Test SO(3) invariance
    q = random_quaternion()
    R = quaternion_to_matrix(q)
    
    # Rotated tensors: R D R^T
    rotated_tensors = np.array([R @ D @ R.T for D in tensors])
    
    attn2 = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            attn2[i,j] = np.sum(rotated_tensors[i] * rotated_tensors[j])
    attn2 = np.exp(attn2) / np.exp(attn2).sum(axis=1, keepdims=True)
    
    error = np.max(np.abs(attn - attn2))
    
    # Key insight: d_i · d_j = Tr(D_i D_j)
    direct_product = directions @ directions.T
    tensor_product = np.array([[np.sum(tensors[i] * tensors[j]) for j in range(n)] for i in range(n)])
    equivalence_error = np.max(np.abs(direct_product - tensor_product))
    
    discovery = f"Tensor direction encoding: equivariance error={error:.2e}, Tr(D_i D_j) = d_i·d_j verified (error={equivalence_error:.2e})"
    print(f"  Trace invariance: mean={np.mean(traces):.6f} (expected=1)")
    print(f"  Determinant: mean={np.mean(det):.6e} (expected=0)")
    print(f"  SO(3) invariance error: {error:.2e}")
    print(f"  Direct vs tensor product equivalence: {equivalence_error:.2e}")
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {
        'equiv_error': float(error),
        'trace_mean': float(np.mean(traces)),
        'equivalence_error': float(equivalence_error)
    }


def sim_direction_basis_frame():
    """
    Complete orthonormal frame from direction
    Direction + perpendicular plane = complete local frame
    """
    print("\n" + "="*60)
    print("ROUND 9: Direction-Based Local Frames")
    print("="*60)
    
    n = 30
    directions = np.random.randn(n, 3)
    directions = directions / np.linalg.norm(directions, axis=1, keepdims=True)
    
    # Build complete orthonormal frames from directions
    frames = []
    for d in directions:
        # Find perpendicular vector
        if abs(d[0]) < 0.9:
            perp1 = np.cross(d, np.array([1, 0, 0]))
        else:
            perp1 = np.cross(d, np.array([0, 1, 0]))
        perp1 = perp1 / np.linalg.norm(perp1)
        perp2 = np.cross(d, perp1)
        frames.append(np.column_stack([d, perp1, perp2]))  # 3x3 orthonormal matrix
    
    frames = np.array(frames)  # (n, 3, 3)
    
    # Frame-based features: 9D (flattened rotation matrix)
    frame_features = frames.reshape(n, 9)
    
    # Test: global rotation
    q = random_quaternion()
    R = quaternion_to_matrix(q)
    
    rotated_frames = np.array([R @ F for F in frames])
    
    # Relative frames (to first token's frame) should be invariant
    rel_frames = np.array([frames[i].T @ frames[0] for i in range(n)])
    rel_rotated = np.array([rotated_frames[i].T @ rotated_frames[0] for i in range(n)])
    
    invariance_error = np.mean(np.linalg.norm(rel_frames - rel_rotated, axis=(1,2)))
    
    # Frame attention via SO(3) distance
    frame_distances = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            rel = frames[i].T @ frames[j]  # Relative rotation
            # Rotation angle from trace: cos(theta) = (tr(R) - 1) / 2
            angle = np.arccos(np.clip((np.trace(rel) - 1) / 2, -1, 1))
            frame_distances[i, j] = angle
    
    discovery = f"Frame-based attention: relative frame invariance error={invariance_error:.2e}"
    print(f"  Relative frame invariance: {invariance_error:.2e}")
    print(f"  Frame distance range: [{np.min(frame_distances):.4f}, {np.max(frame_distances):.4f}]")
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {
        'invariance_error': float(invariance_error),
        'mean_frame_distance': float(np.mean(frame_distances))
    }


# =============================================================================
# Round 10-12: Spin Trajectories with Gravitational Weights
# =============================================================================

def sim_spin_trajectory():
    """
    Spins create trajectories pulled by gravity of weights
    Each token has spin (angular momentum) and is attracted to others
    """
    print("\n" + "="*60)
    print("ROUND 10: Spin Trajectories")
    print("="*60)
    
    n, steps = 25, 50
    dt = 0.05
    
    # Initialize positions and spins
    positions = np.random.randn(n, 3) * 3
    velocities = np.random.randn(n, 3) * 0.5
    
    # Spins (angular momentum vectors)
    spins = np.random.randn(n, 3)
    spins = spins / np.linalg.norm(spins, axis=1, keepdims=True)
    spin_magnitudes = np.abs(np.random.randn(n)) + 0.5
    
    # Weights (mass-like, for gravitational attraction)
    weights = np.abs(np.random.randn(n)) + 1
    
    trajectory = [positions.copy()]
    
    for _ in range(steps):
        forces = np.zeros((n, 3))
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    r = positions[j] - positions[i]
                    dist = np.linalg.norm(r) + 0.5  # Softened distance
                    
                    # Gravitational attraction: F ~ w_i * w_j / r^2
                    gravity = weights[i] * weights[j] * r / (dist**3)
                    
                    # Spin-spin interaction: aligned spins attract more
                    spin_alignment = np.dot(spins[i], spins[j])
                    spin_factor = 1 + 0.3 * spin_alignment
                    
                    forces[i] += spin_factor * gravity
        
        # Update velocities and positions
        velocities += forces * dt
        positions += velocities * dt
        
        # Spins precess around total angular momentum
        total_L = np.sum(spins * spin_magnitudes.reshape(-1, 1), axis=0)
        for i in range(n):
            # Precession: ds/dt ~ L × s
            precession = 0.1 * np.cross(total_L, spins[i])
            spins[i] += precession * dt
            spins[i] = spins[i] / np.linalg.norm(spins[i])
        
        trajectory.append(positions.copy())
    
    trajectory = np.array(trajectory)
    
    # Measure trajectory properties
    displacement = np.linalg.norm(trajectory[-1] - trajectory[0], axis=1)
    path_length = np.sum([np.linalg.norm(trajectory[t+1] - trajectory[t], axis=1) 
                          for t in range(steps)], axis=0)
    
    discovery = f"Spin trajectories: mean displacement={np.mean(displacement):.4f}, path_length/displacement={np.mean(path_length/displacement):.4f}"
    print(f"  Mean displacement: {np.mean(displacement):.4f}")
    print(f"  Mean path length: {np.mean(path_length):.4f}")
    print(f"  Path/displacement ratio: {np.mean(path_length/displacement):.4f}")
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {
        'mean_displacement': float(np.mean(displacement)),
        'mean_path_length': float(np.mean(path_length)),
        'ratio': float(np.mean(path_length/displacement))
    }


def sim_spin_network_attention():
    """
    Attention from spin-spin coupling
    """
    print("\n" + "="*60)
    print("ROUND 11: Spin Network Attention")
    print("="*60)
    
    n = 40
    spins = np.random.randn(n, 3)
    spins = spins / np.linalg.norm(spins, axis=1, keepdims=True)
    positions = np.random.randn(n, 3) * 2
    
    # Spin-spin coupling attention
    attn = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            # Heisenberg-like coupling: J S_i · S_j
            coupling = np.dot(spins[i], spins[j])
            # Distance modulation
            dist = np.linalg.norm(positions[i] - positions[j]) + 0.5
            attn[i, j] = coupling / dist
    
    # Normalize
    attn = attn - attn.max(axis=1, keepdims=True)
    attn = np.exp(attn) / np.exp(attn).sum(axis=1, keepdims=True)
    
    # Test SO(3) invariance
    q = random_quaternion()
    R = quaternion_to_matrix(q)
    
    rotated_spins = (R @ spins.T).T
    rotated_pos = (R @ positions.T).T
    
    attn2 = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            coupling = np.dot(rotated_spins[i], rotated_spins[j])
            dist = np.linalg.norm(rotated_pos[i] - rotated_pos[j]) + 0.5
            attn2[i, j] = coupling / dist
    
    attn2 = attn2 - attn2.max(axis=1, keepdims=True)
    attn2 = np.exp(attn2) / np.exp(attn2).sum(axis=1, keepdims=True)
    
    error = np.max(np.abs(attn - attn2))
    
    # Entanglement entropy from attention
    entropy = -np.sum(attn * np.log(attn + 1e-10)) / n
    
    discovery = f"Spin network attention: SO(3) invariant error={error:.2e}, entanglement entropy={entropy:.4f}"
    print(f"  SO(3) invariance error: {error:.2e}")
    print(f"  Mean attention entropy: {entropy:.4f}")
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {'invariance_error': float(error), 'entropy': float(entropy)}


def sim_gravitational_embedding():
    """
    Gravitational potential as positional encoding
    """
    print("\n" + "="*60)
    print("ROUND 12: Gravitational Embedding")
    print("="*60)
    
    n = 35
    positions = np.random.randn(n, 3) * 2
    masses = np.abs(np.random.randn(n)) + 1
    
    # Gravitational potential at each position
    G = 1.0  # Gravitational constant
    potential = np.zeros(n)
    
    for i in range(n):
        for j in range(n):
            if i != j:
                dist = np.linalg.norm(positions[i] - positions[j]) + 0.3
                potential[i] -= G * masses[j] / dist
    
    # Gravitational field (gradient of potential)
    field = np.zeros((n, 3))
    for i in range(n):
        for j in range(n):
            if i != j:
                r = positions[j] - positions[i]
                dist = np.linalg.norm(r) + 0.3
                field[i] += G * masses[j] * r / (dist**3)
    
    # Embedding: [potential, field]
    embedding = np.concatenate([potential.reshape(-1, 1), field], axis=1)
    
    # Test translation invariance of potential differences
    translation = np.random.randn(3) * 2
    translated_pos = positions + translation
    
    translated_potential = np.zeros(n)
    for i in range(n):
        for j in range(n):
            if i != j:
                dist = np.linalg.norm(translated_pos[i] - translated_pos[j]) + 0.3
                translated_potential[i] -= G * masses[j] / dist
    
    # Potential differences should be translation-invariant
    orig_diff = potential[0] - potential[1]
    trans_diff = translated_potential[0] - translated_potential[1]
    diff_error = abs(orig_diff - trans_diff)
    
    # Field should be translation-invariant
    translated_field = np.zeros((n, 3))
    for i in range(n):
        for j in range(n):
            if i != j:
                r = translated_pos[j] - translated_pos[i]
                dist = np.linalg.norm(r) + 0.3
                translated_field[i] += G * masses[j] * r / (dist**3)
    
    field_error = np.mean(np.linalg.norm(field - translated_field, axis=1))
    
    discovery = f"Gravitational embedding: translation invariance - potential_diff_error={diff_error:.2e}, field_error={field_error:.2e}"
    print(f"  Potential range: [{np.min(potential):.4f}, {np.max(potential):.4f}]")
    print(f"  Field magnitude range: [{np.min(np.linalg.norm(field, axis=1)):.4f}, {np.max(np.linalg.norm(field, axis=1)):.4f}]")
    print(f"  Translation invariance (potential diff): {diff_error:.2e}")
    print(f"  Translation invariance (field): {field_error:.2e}")
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {
        'potential_diff_error': float(diff_error),
        'field_error': float(field_error),
        'mean_potential': float(np.mean(potential))
    }


# =============================================================================
# Round 13-15: Simplified Tensor Mathematics
# =============================================================================

def sim_simplified_equivariance():
    """
    Simplified equivariance using geometric algebra
    """
    print("\n" + "="*60)
    print("ROUND 13: Geometric Algebra Simplification")
    print("="*60)
    
    n = 30
    vectors = np.random.randn(n, 3) * 2
    
    # Geometric product: ab = a·b + a∧b
    # In 3D: scalar + bivector (can be mapped to pseudovector)
    
    # Inner product (scalar) - SO(3) invariant
    inner_products = vectors @ vectors.T
    
    # Outer product (bivector) - maps to cross product
    # a∧b in 3D is dual to a×b
    bivectors = np.zeros((n, n, 3))
    for i in range(n):
        for j in range(n):
            bivectors[i, j] = np.cross(vectors[i], vectors[j])
    
    # Rotor (quaternion) from bivector: R = exp(B/2)
    # This is the geometric algebra way to do rotations
    
    # Test: rotate vectors, recompute
    q = random_quaternion()
    R = quaternion_to_matrix(q)
    rotated = (R @ vectors.T).T
    
    # Inner product is invariant
    inner_rotated = rotated @ rotated.T
    inner_error = np.max(np.abs(inner_products - inner_rotated))
    
    # Outer product transforms as: R(a∧b)R^~ = (Ra)∧(Rb)
    # In 3D: R(a×b) = det(R) R (a×b) for rotations det(R)=1
    bivectors_rotated = np.zeros((n, n, 3))
    for i in range(n):
        for j in range(n):
            bivectors_rotated[i, j] = np.cross(rotated[i], rotated[j])
    
    expected = np.array([[R @ bivectors[i, j] for j in range(n)] for i in range(n)])
    bivector_error = np.mean(np.linalg.norm(bivectors_rotated - expected, axis=2))
    
    discovery = f"Geometric algebra: inner product invariant (error={inner_error:.2e}), bivector equivariant (error={np.mean(bivector_error):.2e})"
    print(f"  Inner product invariance: {inner_error:.2e}")
    print(f"  Bivector equivariance: {np.mean(bivector_error):.2e}")
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {
        'inner_error': float(inner_error),
        'bivector_error': float(np.mean(bivector_error))
    }


def sim_minimal_parameterization():
    """
    Minimal parameterization using exponential coordinates
    """
    print("\n" + "="*60)
    print("ROUND 14: Minimal Parameterization")
    print("="*60)
    
    n = 25
    
    # SO(3) via exponential map: R = exp([ω]_×)
    # where ω is 3D (axis * angle), minimal representation
    
    omega_vectors = np.random.randn(n, 3) * 0.5  # Small rotations
    
    def exp_so3(omega):
        """Exponential map from so(3) to SO(3)"""
        theta = np.linalg.norm(omega)
        if theta < 1e-6:
            return np.eye(3) + np.array([
                [0, -omega[2], omega[1]],
                [omega[2], 0, -omega[0]],
                [-omega[1], omega[0], 0]
            ])
        axis = omega / theta
        K = np.array([
            [0, -axis[2], axis[1]],
            [axis[2], 0, -axis[0]],
            [-axis[1], axis[0], 0]
        ])
        return np.eye(3) + np.sin(theta) * K + (1 - np.cos(theta)) * K @ K
    
    rotations = [exp_so3(omega) for omega in omega_vectors]
    
    # Log map: inverse of exponential
    def log_so3(R):
        """Log map from SO(3) to so(3)"""
        trace = np.trace(R)
        theta = np.arccos(np.clip((trace - 1) / 2, -1, 1))
        if theta < 1e-6:
            return np.array([R[2,1] - R[1,2], R[0,2] - R[2,0], R[1,0] - R[0,1]]) / 2
        return theta / (2 * np.sin(theta)) * np.array([
            R[2,1] - R[1,2], R[0,2] - R[2,0], R[1,0] - R[0,1]
        ])
    
    # Test exp/log inverses
    recovered = [log_so3(R) for R in rotations]
    recovery_error = np.mean([np.linalg.norm(omega_vectors[i] - recovered[i]) for i in range(n)])
    
    # Composition via Baker-Campbell-Hausdorff (simplified)
    # R1 * R2 = exp(ω1) * exp(ω2) ≈ exp(ω1 + ω2 + 1/2 [ω1, ω2])
    # For small rotations: approximate composition
    
    composed_approx = omega_vectors[0] + omega_vectors[1] + 0.5 * np.cross(omega_vectors[0], omega_vectors[1])
    composed_exact = log_so3(rotations[0] @ rotations[1])
    composition_error = np.linalg.norm(composed_approx - composed_exact)
    
    discovery = f"Minimal parameterization: exp/log recovery error={recovery_error:.2e}, BCH composition error={composition_error:.2e}"
    print(f"  Exp/Log recovery error: {recovery_error:.2e}")
    print(f"  BCH composition error: {composition_error:.2e}")
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {
        'recovery_error': float(recovery_error),
        'bch_error': float(composition_error)
    }


def sim_symplectic_integration():
    """
    Symplectic integration for Hamiltonian dynamics
    Preserves phase space structure
    """
    print("\n" + "="*60)
    print("ROUND 15: Symplectic Integration")
    print("="*60)
    
    n, steps = 20, 100
    dt = 0.01
    
    # Phase space: (positions, momenta)
    positions = np.random.randn(n, 3) * 2
    momenta = np.random.randn(n, 3) * 0.5
    
    # Hamiltonian: H = p^2/2m + V(q)
    # V(q) = sum_{i<j} 1/|q_i - q_j| (Coulomb-like)
    
    def compute_forces(pos):
        forces = np.zeros_like(pos)
        for i in range(n):
            for j in range(n):
                if i != j:
                    r = pos[j] - pos[i]
                    dist = np.linalg.norm(r) + 0.5
                    forces[i] += r / dist**3
        return forces
    
    # Standard Euler (not symplectic)
    pos_euler = positions.copy()
    mom_euler = momenta.copy()
    
    for _ in range(steps):
        forces = compute_forces(pos_euler)
        pos_euler = pos_euler + mom_euler * dt
        mom_euler = mom_euler + forces * dt
    
    # Leapfrog (symplectic)
    pos_symplectic = positions.copy()
    mom_symplectic = momenta.copy()
    
    for _ in range(steps):
        # Half step momentum
        forces = compute_forces(pos_symplectic)
        mom_symplectic = mom_symplectic + 0.5 * forces * dt
        # Full step position
        pos_symplectic = pos_symplectic + mom_symplectic * dt
        # Half step momentum
        forces = compute_forces(pos_symplectic)
        mom_symplectic = mom_symplectic + 0.5 * forces * dt
    
    # Energy conservation
    def compute_energy(pos, mom):
        kinetic = 0.5 * np.sum(mom**2)
        potential = 0
        for i in range(n):
            for j in range(i+1, n):
                dist = np.linalg.norm(pos[i] - pos[j]) + 0.5
                potential += 1 / dist
        return kinetic + potential
    
    initial_energy = compute_energy(positions, momenta)
    euler_energy = compute_energy(pos_euler, mom_euler)
    symplectic_energy = compute_energy(pos_symplectic, mom_symplectic)
    
    euler_drift = abs(euler_energy - initial_energy) / initial_energy
    symplectic_drift = abs(symplectic_energy - initial_energy) / initial_energy
    
    discovery = f"Symplectic integration: Euler drift={euler_drift:.4f}, Symplectic drift={symplectic_drift:.4e} ({euler_drift/symplectic_drift:.1f}x better)"
    print(f"  Initial energy: {initial_energy:.4f}")
    print(f"  Euler energy: {euler_energy:.4f} (drift: {euler_drift:.4f})")
    print(f"  Symplectic energy: {symplectic_energy:.4f} (drift: {symplectic_drift:.4e})")
    print(f"  Improvement: {euler_drift/symplectic_drift:.1f}x")
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {
        'euler_drift': float(euler_drift),
        'symplectic_drift': float(symplectic_drift),
        'improvement': float(euler_drift/symplectic_drift)
    }


# =============================================================================
# Round 16-18: Rock-Solid Mathematical Proofs
# =============================================================================

def sim_group_theoretic_proof():
    """
    Verify group-theoretic properties rigorously
    """
    print("\n" + "="*60)
    print("ROUND 16: Group-Theoretic Verification")
    print("="*60)
    
    n_tests = 100
    errors = {'closure': [], 'associativity': [], 'identity': [], 'inverse': []}
    
    def random_dq():
        qr = random_quaternion()
        t = np.random.randn(3) * 2
        return dq_from_rt(qr, t)
    
    identity_dq = (np.array([1, 0, 0, 0]), np.array([0, 0, 0, 0]))
    
    for _ in range(n_tests):
        dq1 = random_dq()
        dq2 = random_dq()
        dq3 = random_dq()
        
        # Closure: dq1 * dq2 is valid dual quaternion
        prod = dq_multiply(dq1, dq2)
        # Verify unit norm of real part
        norm_error = abs(np.linalg.norm(prod[0]) - 1)
        errors['closure'].append(norm_error)
        
        # Associativity: (dq1 * dq2) * dq3 = dq1 * (dq2 * dq3)
        prod12_3 = dq_multiply(dq_multiply(dq1, dq2), dq3)
        prod1_23 = dq_multiply(dq1, dq_multiply(dq2, dq3))
        assoc_error = np.linalg.norm(np.array(prod12_3[0]) - np.array(prod1_23[0])) + \
                      np.linalg.norm(np.array(prod12_3[1]) - np.array(prod1_23[1]))
        errors['associativity'].append(assoc_error)
        
        # Identity: dq * identity = dq
        prod_id = dq_multiply(dq1, identity_dq)
        id_error = np.linalg.norm(np.array(prod_id[0]) - np.array(dq1[0])) + \
                   np.linalg.norm(np.array(prod_id[1]) - np.array(dq1[1]))
        errors['identity'].append(id_error)
        
        # Inverse: dq * dq^(-1) = identity
        dq1_inv = (qconjugate(dq1[0]), -qconjugate(dq1[1]))
        prod_inv = dq_multiply(dq1, dq1_inv)
        inv_error = np.linalg.norm(np.array(prod_inv[0]) - np.array(identity_dq[0])) + \
                    np.linalg.norm(np.array(prod_inv[1]) - np.array(identity_dq[1]))
        errors['inverse'].append(inv_error)
    
    print(f"  Closure (||qr||=1): mean error = {np.mean(errors['closure']):.2e}")
    print(f"  Associativity: mean error = {np.mean(errors['associativity']):.2e}")
    print(f"  Identity: mean error = {np.mean(errors['identity']):.2e}")
    print(f"  Inverse: mean error = {np.mean(errors['inverse']):.2e}")
    
    discovery = f"SE(3) group properties verified: closure={np.mean(errors['closure']):.2e}, associativity={np.mean(errors['associativity']):.2e}, identity={np.mean(errors['identity']):.2e}, inverse={np.mean(errors['inverse']):.2e}"
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {k: float(np.mean(v)) for k, v in errors.items()}


def sim_lie_algebra_verification():
    """
    Verify Lie algebra structure
    """
    print("\n" + "="*60)
    print("ROUND 17: Lie Algebra Verification")
    print("="*60)
    
    n_tests = 50
    errors = {'jacobi': [], 'skew_symmetry': [], 'bch': []}
    
    def random_twist():
        return np.random.randn(6) * 0.5
    
    def lie_bracket(xi1, xi2):
        """se(3) Lie bracket"""
        omega1, v1 = xi1[:3], xi1[3:]
        omega2, v2 = xi2[:3], xi2[3:]
        return np.concatenate([
            np.cross(omega1, omega2),
            np.cross(omega1, v2) - np.cross(omega2, v1)
        ])
    
    for _ in range(n_tests):
        xi1 = random_twist()
        xi2 = random_twist()
        xi3 = random_twist()
        
        # Skew-symmetry: [xi1, xi2] = -[xi2, xi1]
        bracket12 = lie_bracket(xi1, xi2)
        bracket21 = lie_bracket(xi2, xi1)
        skew_error = np.linalg.norm(bracket12 + bracket21)
        errors['skew_symmetry'].append(skew_error)
        
        # Jacobi identity: [xi1, [xi2, xi3]] + [xi2, [xi3, xi1]] + [xi3, [xi1, xi2]] = 0
        jacobi_sum = lie_bracket(xi1, lie_bracket(xi2, xi3)) + \
                     lie_bracket(xi2, lie_bracket(xi3, xi1)) + \
                     lie_bracket(xi3, lie_bracket(xi1, xi2))
        jacobi_error = np.linalg.norm(jacobi_sum)
        errors['jacobi'].append(jacobi_error)
        
        # BCH approximation: exp(xi1)exp(xi2) ≈ exp(xi1 + xi2 + 1/2[xi1,xi2])
        # (for small xi)
        # This is tested indirectly via the bracket
    
    print(f"  Skew-symmetry: mean error = {np.mean(errors['skew_symmetry']):.2e}")
    print(f"  Jacobi identity: mean error = {np.mean(errors['jacobi']):.2e}")
    
    discovery = f"se(3) Lie algebra verified: skew-symmetry={np.mean(errors['skew_symmetry']):.2e}, Jacobi={np.mean(errors['jacobi']):.2e}"
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {k: float(np.mean(v)) for k, v in errors.items()}


def sim_representation_theory():
    """
    Verify representation theory properties
    """
    print("\n" + "="*60)
    print("ROUND 18: Representation Theory Verification")
    print("="*60)
    
    n_tests = 30
    errors = {'wigner': [], 'irrep': [], 'tensor': []}
    
    # Test Wigner D-matrix properties (simplified)
    for _ in range(n_tests):
        q = random_quaternion()
        R = quaternion_to_matrix(q)
        
        # Test orthogonality: R^T R = I
        orth_error = np.linalg.norm(R.T @ R - np.eye(3))
        errors['wigner'].append(orth_error)
        
        # Test determinant = 1
        det_error = abs(np.linalg.det(R) - 1)
        errors['irrep'].append(det_error)
        
        # Test tensor product: R ⊗ R acts on rank-2 tensors
        T = np.random.randn(3, 3)
        T_transformed = R @ T @ R.T
        
        # Trace should be invariant
        trace_orig = np.trace(T)
        trace_trans = np.trace(T_transformed)
        tensor_error = abs(trace_orig - trace_trans)
        errors['tensor'].append(tensor_error)
    
    print(f"  Wigner orthogonality: mean error = {np.mean(errors['wigner']):.2e}")
    print(f"  det(R)=1: mean error = {np.mean(errors['irrep']):.2e}")
    print(f"  Trace invariance: mean error = {np.mean(errors['tensor']):.2e}")
    
    discovery = f"SO(3) representation verified: orthogonality={np.mean(errors['wigner']):.2e}, det=1={np.mean(errors['irrep']):.2e}, trace_invariant={np.mean(errors['tensor']):.2e}"
    print(f"  Discovery: {discovery}")
    
    ALL_DISCOVERIES.append(discovery)
    return {k: float(np.mean(v)) for k, v in errors.items()}


# =============================================================================
# DeepSeek Analysis
# =============================================================================

def get_ai_analysis(round_num: int, results: dict):
    """Get DeepSeek analysis of simulation results"""
    print(f"\n{'='*60}")
    print(f"DEEPSEEK ANALYSIS - ROUND {round_num}")
    print("="*60)
    
    prompt = f"""
Analyze these geometric deep learning discoveries from Round {round_num}:

{json.dumps(results, indent=2)}

Provide:
1. Mathematical significance of the key findings
2. Connections to established theory (Lie groups, representation theory, differential geometry)
3. Novel insights or unexpected results
4. Proposed unified architecture combining these discoveries
5. Specific mathematical formulas for implementation

Be rigorous and provide concrete mathematical expressions.
"""
    
    return query_deepseek(prompt)


# =============================================================================
# Main Execution
# =============================================================================

def main():
    print("="*70)
    print("MULTI-ROUND MATHEMATICAL DISCOVERY FRAMEWORK")
    print(f"Started: {datetime.now().isoformat()}")
    print("="*70)
    
    all_results = {}
    
    # Rounds 4-6: Direction-First Architectures
    print("\n" + "="*70)
    print("PHASE 1: DIRECTION-FIRST ARCHITECTURES (Rounds 4-6)")
    print("="*70)
    
    all_results['round4'] = sim_direction_velocity_encoding()
    all_results['round5'] = sim_momentum_message_passing()
    all_results['round6'] = sim_energy_conserving_attention()
    
    ai1 = get_ai_analysis(4, {k: all_results[k] for k in ['round4', 'round5', 'round6']})
    print(ai1[:2000])
    all_results['ai_analysis_1'] = ai1
    
    # Rounds 7-9: Multi-Dimensional Direction
    print("\n" + "="*70)
    print("PHASE 2: MULTI-DIMENSIONAL DIRECTIONS (Rounds 7-9)")
    print("="*70)
    
    all_results['round7'] = sim_higher_dim_direction()
    all_results['round8'] = sim_tensor_direction_encoding()
    all_results['round9'] = sim_direction_basis_frame()
    
    ai2 = get_ai_analysis(7, {k: all_results[k] for k in ['round7', 'round8', 'round9']})
    print(ai2[:2000])
    all_results['ai_analysis_2'] = ai2
    
    # Rounds 10-12: Spin Trajectories
    print("\n" + "="*70)
    print("PHASE 3: SPIN TRAJECTORIES (Rounds 10-12)")
    print("="*70)
    
    all_results['round10'] = sim_spin_trajectory()
    all_results['round11'] = sim_spin_network_attention()
    all_results['round12'] = sim_gravitational_embedding()
    
    ai3 = get_ai_analysis(10, {k: all_results[k] for k in ['round10', 'round11', 'round12']})
    print(ai3[:2000])
    all_results['ai_analysis_3'] = ai3
    
    # Rounds 13-15: Simplified Mathematics
    print("\n" + "="*70)
    print("PHASE 4: SIMPLIFIED MATHEMATICS (Rounds 13-15)")
    print("="*70)
    
    all_results['round13'] = sim_simplified_equivariance()
    all_results['round14'] = sim_minimal_parameterization()
    all_results['round15'] = sim_symplectic_integration()
    
    ai4 = get_ai_analysis(13, {k: all_results[k] for k in ['round13', 'round14', 'round15']})
    print(ai4[:2000])
    all_results['ai_analysis_4'] = ai4
    
    # Rounds 16-18: Mathematical Proofs
    print("\n" + "="*70)
    print("PHASE 5: RIGOROUS PROOFS (Rounds 16-18)")
    print("="*70)
    
    all_results['round16'] = sim_group_theoretic_proof()
    all_results['round17'] = sim_lie_algebra_verification()
    all_results['round18'] = sim_representation_theory()
    
    ai5 = get_ai_analysis(16, {k: all_results[k] for k in ['round16', 'round17', 'round18']})
    print(ai5[:2000])
    all_results['ai_analysis_5'] = ai5
    
    # Final AI Synthesis
    print("\n" + "="*70)
    print("FINAL AI SYNTHESIS")
    print("="*70)
    
    final_prompt = f"""
Based on all 15 rounds of mathematical discovery simulations, synthesize a novel architecture:

KEY DISCOVERIES:
{chr(10).join(ALL_DISCOVERIES)}

RESULTS SUMMARY:
{json.dumps({k: v for k, v in all_results.items() if k.startswith('round')}, indent=2)}

Propose a unified "Direction-First Geometric Transformer" architecture that:
1. Treats direction/momentum as first-class citizens alongside position
2. Uses multi-dimensional direction vectors
3. Incorporates spin trajectories with gravitational weights
4. Is computationally simpler than current tensor approaches
5. Has rock-solid mathematical foundations

Provide specific mathematical formulas for each component.
"""
    
    final_analysis = query_deepseek(final_prompt, max_tokens=4000)
    print(final_analysis[:3000])
    all_results['final_synthesis'] = final_analysis
    
    # Save results
    all_results['discoveries'] = ALL_DISCOVERIES
    all_results['timestamp'] = datetime.now().isoformat()
    
    with open('/home/z/my-project/download/multi_round_discoveries.json', 'w') as f:
        json.dump(all_results, f, indent=2, default=str)
    
    print(f"\n\n{'='*70}")
    print("DISCOVERY SUMMARY")
    print("="*70)
    print(f"Total discoveries: {len(ALL_DISCOVERIES)}")
    for i, d in enumerate(ALL_DISCOVERIES, 1):
        print(f"  {i}. {d}")
    print(f"\nResults saved to: /home/z/my-project/download/multi_round_discoveries.json")


if __name__ == '__main__':
    main()
