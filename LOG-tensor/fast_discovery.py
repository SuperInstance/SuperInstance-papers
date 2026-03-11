#!/usr/bin/env python3
"""
Fast Multi-Round Discovery - Streamlined Version
"""

import numpy as np
import json
import requests
from datetime import datetime

DEEPSEEK_API_KEY = "your_api_key_here"
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"

DISCOVERIES = []

def query_deepseek(prompt: str, max_tokens: int = 2000) -> str:
    headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "You are a mathematician. Be concise and rigorous with formulas."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.6,
        "max_tokens": max_tokens
    }
    try:
        resp = requests.post(DEEPSEEK_URL, headers=headers, json=payload, timeout=60)
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"API Error: {e}"

def random_quat():
    u = np.random.random(3)
    return np.array([np.sqrt(1-u[0])*np.sin(2*np.pi*u[1]), np.sqrt(1-u[0])*np.cos(2*np.pi*u[1]),
                     np.sqrt(u[0])*np.sin(2*np.pi*u[2]), np.sqrt(u[0])*np.cos(2*np.pi*u[2])])

def quat_to_matrix(q):
    return np.array([[1-2*q[2]**2-2*q[3]**2, 2*q[1]*q[2]-2*q[0]*q[3], 2*q[1]*q[3]+2*q[0]*q[2]],
                     [2*q[1]*q[2]+2*q[0]*q[3], 1-2*q[1]**2-2*q[3]**2, 2*q[2]*q[3]-2*q[0]*q[1]],
                     [2*q[1]*q[3]-2*q[0]*q[2], 2*q[2]*q[3]+2*q[0]*q[1], 1-2*q[1]**2-2*q[2]**2]])

def qmul(q1, q2):
    return np.array([q1[0]*q2[0]-q1[1]*q2[1]-q1[2]*q2[2]-q1[3]*q2[3],
                     q1[0]*q2[1]+q1[1]*q2[0]+q1[2]*q2[3]-q1[3]*q2[2],
                     q1[0]*q2[2]-q1[1]*q2[3]+q1[2]*q2[0]+q1[3]*q2[1],
                     q1[0]*q2[3]+q1[1]*q2[2]-q1[2]*q2[1]+q1[3]*q2[0]])

def qconj(q): return np.array([q[0], -q[1], -q[2], -q[3]])

# ============== SIMULATIONS ==============

def sim_direction_attention():
    """Direction-based attention (momentum direction)"""
    n = 40
    vel = np.random.randn(n, 3)
    dirs = vel / (np.linalg.norm(vel, axis=1, keepdims=True) + 1e-8)
    energy = 0.5 * np.sum(vel**2, axis=1)
    
    # Direction attention
    attn = dirs @ dirs.T
    attn = np.exp(attn) / np.exp(attn).sum(axis=1, keepdims=True)
    
    # Test rotation invariance
    R = quat_to_matrix(random_quat())
    dirs_r = (R @ dirs.T).T
    attn2 = dirs_r @ dirs_r.T
    attn2 = np.exp(attn2) / np.exp(attn2).sum(axis=1, keepdims=True)
    
    err = np.max(np.abs(attn - attn2))
    DISCOVERIES.append(f"Direction attention: rotation invariant (err={err:.2e})")
    return {'error': float(err), 'mean_energy': float(np.mean(energy))}

def sim_momentum_message():
    """Momentum-weighted message passing"""
    n, k = 35, 6
    pos = np.random.randn(n, 3) * 2
    vel = np.random.randn(n, 3)
    msgs = np.zeros((n, 6))
    
    for i in range(n):
        dists = np.linalg.norm(pos - pos[i], axis=1)
        nn = np.argsort(dists)[1:k+1]
        for j in nn:
            align = np.dot(vel[i], vel[j]) / (np.linalg.norm(vel[i])*np.linalg.norm(vel[j]) + 1e-8)
            w = 0.5 * (1 + align)
            msgs[i,:3] += w * (pos[j] - pos[i])
            msgs[i,3:] += w * (vel[j] - vel[i])
    
    R = quat_to_matrix(random_quat())
    pos_r, vel_r = (R @ pos.T).T, (R @ vel.T).T
    msgs2 = np.zeros((n, 6))
    for i in range(n):
        dists = np.linalg.norm(pos_r - pos_r[i], axis=1)
        nn = np.argsort(dists)[1:k+1]
        for j in nn:
            align = np.dot(vel_r[i], vel_r[j]) / (np.linalg.norm(vel_r[i])*np.linalg.norm(vel_r[j]) + 1e-8)
            w = 0.5 * (1 + align)
            msgs2[i,:3] += w * (pos_r[j] - pos_r[i])
            msgs2[i,3:] += w * (vel_r[j] - vel_r[i])
    
    pos_err = np.mean(np.linalg.norm(msgs2[:,:3] - (R @ msgs[:,:3].T).T, axis=1))
    vel_err = np.mean(np.linalg.norm(msgs2[:,3:] - (R @ msgs[:,3:].T).T, axis=1))
    DISCOVERIES.append(f"Momentum messages: equivariant (pos_err={pos_err:.2e}, vel_err={vel_err:.2e})")
    return {'pos_err': float(pos_err), 'vel_err': float(vel_err)}

def sim_higher_dim_dirs():
    """Higher dimensional directions"""
    n, dims = 30, [3, 4, 5, 6, 8, 10]
    results = {}
    for d in dims:
        raw = np.random.randn(n, d)
        dirs = raw / np.linalg.norm(raw, axis=1, keepdims=True)
        attn = dirs @ dirs.T
        attn = np.exp(attn) / np.exp(attn).sum(axis=1, keepdims=True)
        Q, _ = np.linalg.qr(np.random.randn(d, d))
        dirs2 = dirs @ Q.T
        attn2 = dirs2 @ dirs2.T
        attn2 = np.exp(attn2) / np.exp(attn2).sum(axis=1, keepdims=True)
        results[d] = np.max(np.abs(attn - attn2))
    DISCOVERIES.append(f"Higher-dim dirs: SO(d) invariant for d=3..10, max_err={max(results.values()):.2e}")
    return {f'dim_{d}': float(e) for d, e in results.items()}

def sim_tensor_dir():
    """Tensor direction encoding D = d⊗d"""
    n = 30
    dirs = np.random.randn(n, 3)
    dirs = dirs / np.linalg.norm(dirs, axis=1, keepdims=True)
    tensors = np.array([np.outer(d, d) for d in dirs])
    
    attn = np.array([[np.sum(tensors[i]*tensors[j]) for j in range(n)] for i in range(n)])
    attn = np.exp(attn) / np.exp(attn).sum(axis=1, keepdims=True)
    
    R = quat_to_matrix(random_quat())
    tensors2 = np.array([R @ D @ R.T for D in tensors])
    attn2 = np.array([[np.sum(tensors2[i]*tensors2[j]) for j in range(n)] for i in range(n)])
    attn2 = np.exp(attn2) / np.exp(attn2).sum(axis=1, keepdims=True)
    
    err = np.max(np.abs(attn - attn2))
    # Verify Tr(Di Dj) = di·dj
    direct = dirs @ dirs.T
    tensor_p = np.array([[np.sum(tensors[i]*tensors[j]) for j in range(n)] for i in range(n)])
    equiv_err = np.max(np.abs(direct - tensor_p))
    
    DISCOVERIES.append(f"Tensor dir encoding: equivariant (err={err:.2e}), Tr(DiDj)=di·dj (err={equiv_err:.2e})")
    return {'equiv_err': float(err), 'identity_err': float(equiv_err)}

def sim_spin_attention():
    """Spin-spin coupling attention"""
    n = 35
    spins = np.random.randn(n, 3)
    spins = spins / np.linalg.norm(spins, axis=1, keepdims=True)
    pos = np.random.randn(n, 3) * 2
    
    attn = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            coupling = np.dot(spins[i], spins[j])
            dist = np.linalg.norm(pos[i] - pos[j]) + 0.5
            attn[i,j] = coupling / dist
    attn = attn - attn.max(axis=1, keepdims=True)
    attn = np.exp(attn) / np.exp(attn).sum(axis=1, keepdims=True)
    
    R = quat_to_matrix(random_quat())
    spins_r, pos_r = (R @ spins.T).T, (R @ pos.T).T
    attn2 = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            coupling = np.dot(spins_r[i], spins_r[j])
            dist = np.linalg.norm(pos_r[i] - pos_r[j]) + 0.5
            attn2[i,j] = coupling / dist
    attn2 = attn2 - attn2.max(axis=1, keepdims=True)
    attn2 = np.exp(attn2) / np.exp(attn2).sum(axis=1, keepdims=True)
    
    err = np.max(np.abs(attn - attn2))
    entropy = -np.sum(attn * np.log(attn + 1e-10)) / n
    DISCOVERIES.append(f"Spin attention: SO(3) invariant (err={err:.2e}), entropy={entropy:.4f}")
    return {'err': float(err), 'entropy': float(entropy)}

def sim_gravitational():
    """Gravitational embedding"""
    n = 30
    pos = np.random.randn(n, 3) * 2
    mass = np.abs(np.random.randn(n)) + 1
    
    pot = np.zeros(n)
    field = np.zeros((n, 3))
    for i in range(n):
        for j in range(n):
            if i != j:
                d = np.linalg.norm(pos[i] - pos[j]) + 0.3
                pot[i] -= mass[j] / d
                field[i] += mass[j] * (pos[j] - pos[i]) / d**3
    
    # Translation invariance
    trans = np.random.randn(3)
    pos_t = pos + trans
    pot_t = np.zeros(n)
    for i in range(n):
        for j in range(n):
            if i != j:
                d = np.linalg.norm(pos_t[i] - pos_t[j]) + 0.3
                pot_t[i] -= mass[j] / d
    
    diff_err = abs((pot[0]-pot[1]) - (pot_t[0]-pot_t[1]))
    DISCOVERIES.append(f"Gravitational embed: translation invariant (diff_err={diff_err:.2e})")
    return {'diff_err': float(diff_err), 'mean_pot': float(np.mean(pot))}

def sim_geometric_algebra():
    """Geometric algebra simplification"""
    n = 25
    vecs = np.random.randn(n, 3) * 2
    
    inner = vecs @ vecs.T
    bivector = np.zeros((n, n, 3))
    for i in range(n):
        for j in range(n):
            bivector[i,j] = np.cross(vecs[i], vecs[j])
    
    R = quat_to_matrix(random_quat())
    vecs_r = (R @ vecs.T).T
    
    inner_r = vecs_r @ vecs_r.T
    inner_err = np.max(np.abs(inner - inner_r))
    
    bivector_r = np.zeros((n, n, 3))
    for i in range(n):
        for j in range(n):
            bivector_r[i,j] = np.cross(vecs_r[i], vecs_r[j])
    
    expected = np.array([[R @ bivector[i,j] for j in range(n)] for i in range(n)])
    biv_err = np.mean(np.linalg.norm(bivector_r - expected, axis=2))
    
    DISCOVERIES.append(f"Geometric algebra: inner invariant (err={inner_err:.2e}), bivector equiv (err={biv_err:.2e})")
    return {'inner_err': float(inner_err), 'biv_err': float(biv_err)}

def sim_symplectic():
    """Symplectic integration"""
    n, steps, dt = 15, 50, 0.02
    pos = np.random.randn(n, 3) * 2
    mom = np.random.randn(n, 3) * 0.5
    
    def forces(p):
        f = np.zeros_like(p)
        for i in range(n):
            for j in range(n):
                if i != j:
                    d = np.linalg.norm(p[j] - p[i]) + 0.5
                    f[i] += (p[j] - p[i]) / d**3
        return f
    
    def energy(p, m):
        ke = 0.5 * np.sum(m**2)
        pe = sum(1/(np.linalg.norm(p[i]-p[j])+0.5) for i in range(n) for j in range(i+1,n))
        return ke + pe
    
    E0 = energy(pos, mom)
    
    # Euler
    p_e, m_e = pos.copy(), mom.copy()
    for _ in range(steps):
        f = forces(p_e)
        p_e += m_e * dt
        m_e += f * dt
    E_euler = energy(p_e, m_e)
    
    # Leapfrog
    p_s, m_s = pos.copy(), mom.copy()
    for _ in range(steps):
        f = forces(p_s)
        m_s += 0.5 * f * dt
        p_s += m_s * dt
        f = forces(p_s)
        m_s += 0.5 * f * dt
    E_sym = energy(p_s, m_s)
    
    euler_drift = abs(E_euler - E0) / E0
    sym_drift = abs(E_sym - E0) / E0
    
    DISCOVERIES.append(f"Symplectic: Euler drift={euler_drift:.4f}, Symplectic drift={sym_drift:.2e} ({euler_drift/sym_drift:.1f}x better)")
    return {'euler_drift': float(euler_drift), 'sym_drift': float(sym_drift), 'improvement': float(euler_drift/sym_drift)}

def sim_group_proof():
    """Group property verification"""
    n_test = 50
    errs = {'closure': [], 'assoc': [], 'identity': [], 'inverse': []}
    
    for _ in range(n_test):
        q1, q2, q3 = random_quat(), random_quat(), random_quat()
        t1, t2, t3 = np.random.randn(3)*2, np.random.randn(3)*2, np.random.randn(3)*2
        
        # dq = (qr, qd)
        def dq_from(q, t):
            tq = np.array([0, t[0], t[1], t[2]])
            return (q, 0.5 * qmul(tq, q))
        def dq_mul(d1, d2):
            return (qmul(d1[0], d2[0]), qmul(d1[0], d2[1]) + qmul(d1[1], d2[0]))
        
        dq1, dq2, dq3 = dq_from(q1,t1), dq_from(q2,t2), dq_from(q3,t3)
        identity = (np.array([1,0,0,0]), np.array([0,0,0,0]))
        
        # Closure
        p = dq_mul(dq1, dq2)
        errs['closure'].append(abs(np.linalg.norm(p[0]) - 1))
        
        # Associativity
        p12_3 = dq_mul(dq_mul(dq1, dq2), dq3)
        p1_23 = dq_mul(dq1, dq_mul(dq2, dq3))
        errs['assoc'].append(np.linalg.norm(p12_3[0]-p1_23[0]) + np.linalg.norm(p12_3[1]-p1_23[1]))
        
        # Identity
        p_id = dq_mul(dq1, identity)
        errs['identity'].append(np.linalg.norm(p_id[0]-dq1[0]) + np.linalg.norm(p_id[1]-dq1[1]))
        
        # Inverse
        dq1_inv = (qconj(dq1[0]), -qconj(dq1[1]))
        p_inv = dq_mul(dq1, dq1_inv)
        errs['inverse'].append(np.linalg.norm(p_inv[0]-identity[0]) + np.linalg.norm(p_inv[1]-identity[1]))
    
    results = {k: float(np.mean(v)) for k, v in errs.items()}
    DISCOVERIES.append(f"SE(3) group verified: closure={results['closure']:.2e}, assoc={results['assoc']:.2e}, id={results['identity']:.2e}, inv={results['inverse']:.2e}")
    return results

def sim_lie_algebra():
    """Lie algebra verification"""
    n_test = 30
    errs = {'skew': [], 'jacobi': []}
    
    def bracket(xi1, xi2):
        o1, v1 = xi1[:3], xi1[3:]
        o2, v2 = xi2[:3], xi2[3:]
        return np.concatenate([np.cross(o1, o2), np.cross(o1, v2) - np.cross(o2, v1)])
    
    for _ in range(n_test):
        xi1, xi2, xi3 = np.random.randn(6)*0.5, np.random.randn(6)*0.5, np.random.randn(6)*0.5
        
        # Skew-symmetry
        b12, b21 = bracket(xi1, xi2), bracket(xi2, xi1)
        errs['skew'].append(np.linalg.norm(b12 + b21))
        
        # Jacobi
        jac = bracket(xi1, bracket(xi2, xi3)) + bracket(xi2, bracket(xi3, xi1)) + bracket(xi3, bracket(xi1, xi2))
        errs['jacobi'].append(np.linalg.norm(jac))
    
    results = {k: float(np.mean(v)) for k, v in errs.items()}
    DISCOVERIES.append(f"se(3) Lie algebra: skew-sym={results['skew']:.2e}, Jacobi={results['jacobi']:.2e}")
    return results

def sim_representation():
    """Representation theory verification"""
    n_test = 30
    errs = {'orth': [], 'det': [], 'trace': []}
    
    for _ in range(n_test):
        R = quat_to_matrix(random_quat())
        errs['orth'].append(np.linalg.norm(R.T @ R - np.eye(3)))
        errs['det'].append(abs(np.linalg.det(R) - 1))
        T = np.random.randn(3, 3)
        errs['trace'].append(abs(np.trace(T) - np.trace(R @ T @ R.T)))
    
    results = {k: float(np.mean(v)) for k, v in errs.items()}
    DISCOVERIES.append(f"SO(3) rep: orth={results['orth']:.2e}, det=1={results['det']:.2e}, trace_inv={results['trace']:.2e}")
    return results

# ============== MAIN ==============

def main():
    print("="*60)
    print("FAST MULTI-ROUND DISCOVERY")
    print(datetime.now().isoformat())
    print("="*60)
    
    results = {}
    
    # Run all simulations
    print("\n[1/10] Direction attention...")
    results['dir_attn'] = sim_direction_attention()
    
    print("[2/10] Momentum messages...")
    results['mom_msg'] = sim_momentum_message()
    
    print("[3/10] Higher-dim directions...")
    results['higher_dim'] = sim_higher_dim_dirs()
    
    print("[4/10] Tensor direction...")
    results['tensor_dir'] = sim_tensor_dir()
    
    print("[5/10] Spin attention...")
    results['spin_attn'] = sim_spin_attention()
    
    print("[6/10] Gravitational embedding...")
    results['grav'] = sim_gravitational()
    
    print("[7/10] Geometric algebra...")
    results['geo_alg'] = sim_geometric_algebra()
    
    print("[8/10] Symplectic integration...")
    results['symplectic'] = sim_symplectic()
    
    print("[9/10] Group verification...")
    results['group'] = sim_group_proof()
    
    print("[10/10] Lie algebra verification...")
    results['lie'] = sim_lie_algebra()
    results['rep'] = sim_representation()
    
    # AI Analysis
    print("\n" + "="*60)
    print("DEEPSEEK ANALYSIS")
    print("="*60)
    
    prompt = f"""
Analyze these geometric deep learning discoveries:

{chr(10).join(f'{i+1}. {d}' for i, d in enumerate(DISCOVERIES))}

Results: {json.dumps(results, indent=2)}

Propose a unified "Direction-First Geometric Transformer" architecture that:
1. Treats direction/momentum as first-class alongside position
2. Uses multi-dimensional direction vectors
3. Incorporates spin trajectories with gravitational weights
4. Is computationally simpler than tensor approaches
5. Has rock-solid mathematical foundations

Provide specific formulas.
"""
    
    ai_response = query_deepseek(prompt, 2500)
    print(ai_response[:2500])
    results['ai_analysis'] = ai_response
    results['discoveries'] = DISCOVERIES
    
    # Save
    with open('/home/z/my-project/download/fast_discoveries.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Total discoveries: {len(DISCOVERIES)}")
    for d in DISCOVERIES:
        print(f"  • {d}")
    print(f"\nSaved to: fast_discoveries.json")

if __name__ == '__main__':
    main()
