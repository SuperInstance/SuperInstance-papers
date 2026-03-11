#!/usr/bin/env python3
"""
Fast Simulation Suite for Rotational-Transformer Principles
============================================================
Optimized for rapid iteration and analysis.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import json
import time
from dataclasses import dataclass
from typing import Dict, List, Optional
import warnings
warnings.filterwarnings('ignore')

torch.manual_seed(42)

# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass
class Config:
    hidden_dim: int = 64
    num_layers: int = 2
    num_heads: int = 4
    vocab_size: int = 128
    max_seq_len: int = 64
    batch_size: int = 16
    num_epochs: int = 30
    quantization_base: int = 12
    lora_rank: int = 8
    device: str = 'cpu'

# ============================================================================
# LAYERS
# ============================================================================

class RotationLayer(nn.Module):
    """Continuous rotation (no quantization)"""
    def __init__(self, dim):
        super().__init__()
        self.num_angles = dim // 2
        self.angles = nn.Parameter(torch.randn(self.num_angles) * 0.1)
        self.scale = nn.Parameter(torch.ones(dim))
        
    def forward(self, x):
        B, S, D = x.shape
        x_pairs = x.view(B, S, self.num_angles, 2)
        
        cos_a = torch.cos(self.angles)
        sin_a = torch.sin(self.angles)
        
        x1, x2 = x_pairs[..., 0], x_pairs[..., 1]
        out1 = cos_a * x1 - sin_a * x2
        out2 = sin_a * x1 + cos_a * x2
        
        return torch.stack([out1, out2], dim=-1).view(B, S, D) * self.scale


class QuantizedRotationLayer(nn.Module):
    """Quantized rotation with STE"""
    def __init__(self, dim, base=12):
        super().__init__()
        self.num_angles = dim // 2
        self.base = base
        self.angles_raw = nn.Parameter(torch.randn(self.num_angles) * 0.1)
        self.scale = nn.Parameter(torch.ones(dim))
        self.snap_fidelity = 0.0
        
    def forward(self, x):
        B, S, D = x.shape
        
        # Quantize angles using STE
        angle_norm = self.angles_raw % (2 * math.pi)
        step = 2 * math.pi / self.base
        discrete = torch.round(angle_norm / step) * step
        quantized = angle_norm + (discrete - angle_norm).detach()
        
        with torch.no_grad():
            distances = torch.abs(angle_norm - quantized)
            self.snap_fidelity = (distances < 0.01).float().mean().item()
        
        x_pairs = x.view(B, S, self.num_angles, 2)
        cos_a = torch.cos(quantized)
        sin_a = torch.sin(quantized)
        
        x1, x2 = x_pairs[..., 0], x_pairs[..., 1]
        out = torch.stack([cos_a * x1 - sin_a * x2, sin_a * x1 + cos_a * x2], dim=-1)
        return out.view(B, S, D) * self.scale


class LoRALinear(nn.Module):
    """Low-rank adaptation layer"""
    def __init__(self, dim, rank=8):
        super().__init__()
        self.weight = nn.Parameter(torch.eye(dim) * 0.1)
        self.A = nn.Parameter(torch.randn(dim, rank) * 0.01)
        self.B = nn.Parameter(torch.zeros(rank, dim))
        
    def forward(self, x):
        return torch.matmul(x, (self.weight + self.B @ self.A).T)


class StandardFFN(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.fc1 = nn.Linear(dim, dim * 4)
        self.fc2 = nn.Linear(dim * 4, dim)
        self.act = nn.GELU()
    def forward(self, x):
        return self.fc2(self.act(self.fc1(x)))


class RotationFFN(nn.Module):
    def __init__(self, dim, quantized=False, base=12):
        super().__init__()
        self.rot = QuantizedRotationLayer(dim, base) if quantized else RotationLayer(dim)
        self.norm = nn.LayerNorm(dim)
    def forward(self, x):
        return self.norm(self.rot(x) + x)


class LoRAFFN(nn.Module):
    def __init__(self, dim, rank=8):
        super().__init__()
        self.l1 = LoRALinear(dim, rank)
        self.l2 = LoRALinear(dim, rank)
        self.act = nn.GELU()
        self.norm = nn.LayerNorm(dim)
    def forward(self, x):
        return self.norm(self.l2(self.act(self.l1(x))) + x)


# ============================================================================
# MODEL
# ============================================================================

class Transformer(nn.Module):
    def __init__(self, cfg, ffn_type='standard', base=12):
        super().__init__()
        self.emb = nn.Embedding(cfg.vocab_size, cfg.hidden_dim)
        self.pos = nn.Embedding(cfg.max_seq_len, cfg.hidden_dim)
        
        # Simple attention
        self.attns = nn.ModuleList([
            nn.MultiheadAttention(cfg.hidden_dim, cfg.num_heads, batch_first=True)
            for _ in range(cfg.num_layers)
        ])
        self.attn_norms = nn.ModuleList([nn.LayerNorm(cfg.hidden_dim) for _ in range(cfg.num_layers)])
        
        # FFN layers
        self.ffns = nn.ModuleList()
        self.ffn_norms = nn.ModuleList([nn.LayerNorm(cfg.hidden_dim) for _ in range(cfg.num_layers)])
        
        for _ in range(cfg.num_layers):
            if ffn_type == 'standard':
                self.ffns.append(StandardFFN(cfg.hidden_dim))
            elif ffn_type == 'rotation':
                self.ffns.append(RotationFFN(cfg.hidden_dim, quantized=False))
            elif ffn_type == 'rotation_q':
                self.ffns.append(RotationFFN(cfg.hidden_dim, quantized=True, base=base))
            elif ffn_type == 'lora':
                self.ffns.append(LoRAFFN(cfg.hidden_dim, cfg.lora_rank))
        
        self.head = nn.Linear(cfg.hidden_dim, cfg.vocab_size)
        
    def forward(self, x):
        B, S = x.shape
        h = self.emb(x) + self.pos(torch.arange(S, device=x.device).unsqueeze(0))
        
        mask = torch.tril(torch.ones(S, S, device=x.device)).unsqueeze(0).unsqueeze(0)
        
        for attn, anorm, ffn, fnorm in zip(self.attns, self.attn_norms, self.ffns, self.ffn_norms):
            h = anorm(h + attn(h, h, h, need_weights=False)[0])
            h = fnorm(h + ffn(h))
        
        return self.head(h)
    
    def get_params(self):
        total = sum(p.numel() for p in self.parameters())
        ffn = sum(sum(p.numel() for p in f.parameters()) for f in self.ffns)
        return {'total': total, 'ffn': ffn}
    
    def get_snap_fidelity(self):
        fids = []
        for f in self.ffns:
            if hasattr(f, 'rot') and hasattr(f.rot, 'snap_fidelity'):
                fids.append(f.rot.snap_fidelity)
        return sum(fids) / len(fids) if fids else 0.0


# ============================================================================
# DATA GENERATION
# ============================================================================

def gen_cyclic(vocab, seq_len, n, cycle=12):
    data = torch.zeros(n, seq_len, dtype=torch.long)
    for i in range(n):
        phase = torch.randint(0, cycle, (1,)).item()
        for j in range(seq_len):
            data[i, j] = (phase + j) % cycle + vocab // 2
    return data

def gen_linear(vocab, seq_len, n):
    data = torch.zeros(n, seq_len, dtype=torch.long)
    for i in range(n):
        cur = torch.randint(0, vocab // 2, (1,)).item()
        for j in range(seq_len):
            cur = max(0, min(vocab // 2 - 1, cur + torch.randint(-3, 4, (1,)).item()))
            data[i, j] = cur
    return data

def gen_language(vocab, seq_len, n):
    freq = torch.tensor([1.0 / (i + 1) ** 1.1 for i in range(vocab)])
    freq = freq / freq.sum()
    data = torch.zeros(n, seq_len, dtype=torch.long)
    for i in range(n):
        for j in range(seq_len):
            if j == 0 or torch.rand(1).item() > 0.3:
                data[i, j] = torch.multinomial(freq, 1).item()
            else:
                if torch.rand(1).item() > 0.5:
                    data[i, j] = data[i, j-1]
                else:
                    data[i, j] = (data[i, j-1] + torch.randint(-2, 3, (1,)).item()) % vocab
    return data


# ============================================================================
# TRAINING
# ============================================================================

def train(cfg, ffn_type, data_type, base=12, verbose=True):
    # Generate data
    if data_type == 'cyclic':
        train = gen_cyclic(cfg.vocab_size, cfg.max_seq_len, cfg.batch_size * 50)
        val = gen_cyclic(cfg.vocab_size, cfg.max_seq_len, cfg.batch_size * 10)
    elif data_type == 'linear':
        train = gen_linear(cfg.vocab_size, cfg.max_seq_len, cfg.batch_size * 50)
        val = gen_linear(cfg.vocab_size, cfg.max_seq_len, cfg.batch_size * 10)
    else:
        train = gen_language(cfg.vocab_size, cfg.max_seq_len, cfg.batch_size * 50)
        val = gen_language(cfg.vocab_size, cfg.max_seq_len, cfg.batch_size * 10)
    
    model = Transformer(cfg, ffn_type, base)
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, cfg.num_epochs)
    
    if verbose:
        params = model.get_params()
        print(f"\n{ffn_type:15s} | Total params: {params['total']:,} | FFN params: {params['ffn']:,}")
    
    results = {'losses': [], 'ppls': [], 'snap_fid': []}
    
    for epoch in range(cfg.num_epochs):
        model.train()
        total_loss = 0
        
        for i in range(0, len(train), cfg.batch_size):
            batch = train[i:i+cfg.batch_size]
            inp, tgt = batch[:, :-1], batch[:, 1:]
            
            logits = model(inp)
            loss = F.cross_entropy(logits.reshape(-1, logits.size(-1)), tgt.reshape(-1))
            
            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            total_loss += loss.item()
        
        sched.step()
        
        # Validation
        model.eval()
        with torch.no_grad():
            val_loss = 0
            for i in range(0, len(val), cfg.batch_size):
                batch = val[i:i+cfg.batch_size]
                inp, tgt = batch[:, :-1], batch[:, 1:]
                logits = model(inp)
                val_loss += F.cross_entropy(logits.reshape(-1, logits.size(-1)), 
                                           tgt.reshape(-1), reduction='sum').item()
            ppl = math.exp(val_loss / (len(val) * (cfg.max_seq_len - 1)))
        
        results['losses'].append(total_loss / (len(train) // cfg.batch_size))
        results['ppls'].append(ppl)
        results['snap_fid'].append(model.get_snap_fidelity())
        
        if verbose and epoch % 10 == 0:
            print(f"Epoch {epoch:2d} | Loss: {results['losses'][-1]:.4f} | PPL: {ppl:.2f} | Snap: {results['snap_fid'][-1]:.1%}")
    
    results['final_ppl'] = results['ppls'][-1]
    results['best_ppl'] = min(results['ppls'])
    results['params'] = model.get_params()
    return results


# ============================================================================
# EXPERIMENTS
# ============================================================================

def experiment_1_ablation(cfg):
    """Ablation: Rotation vs Quantization vs Standard"""
    print("\n" + "="*60)
    print("EXPERIMENT 1: ABLATION STUDY")
    print("="*60)
    
    results = {}
    configs = [
        ('standard', 'language'),
        ('rotation', 'language'),
        ('rotation_q', 'language'),
        ('lora', 'language'),
    ]
    
    for ffn_type, data_type in configs:
        print(f"\n--- {ffn_type} on {data_type} ---")
        r = train(cfg, ffn_type, data_type, cfg.quantization_base)
        results[ffn_type] = r
    
    return results


def experiment_2_task_comparison(cfg):
    """Compare performance on different data types"""
    print("\n" + "="*60)
    print("EXPERIMENT 2: TASK COMPARISON")
    print("="*60)
    
    results = {}
    tasks = ['cyclic', 'linear', 'language']
    models = ['standard', 'rotation', 'rotation_q', 'lora']
    
    for task in tasks:
        results[task] = {}
        for model in models:
            r = train(cfg, model, task, cfg.quantization_base, verbose=False)
            results[task][model] = r
            print(f"{task:10s} | {model:15s} | PPL: {r['final_ppl']:.2f}")
    
    return results


def experiment_3_quantization_base(cfg):
    """Find optimal quantization base"""
    print("\n" + "="*60)
    print("EXPERIMENT 3: QUANTIZATION BASE SEARCH")
    print("="*60)
    
    results = {}
    bases = [4, 6, 8, 10, 12, 16, 24, 32, 64, 128]
    
    for base in bases:
        r = train(cfg, 'rotation_q', 'language', base, verbose=False)
        results[base] = r
        print(f"Base {base:3d} ({math.log2(base):.2f} bits) | PPL: {r['final_ppl']:.2f} | Snap: {r['snap_fid'][-1]:.1%}")
    
    return results


def experiment_4_scaling(cfg):
    """Test scaling behavior"""
    print("\n" + "="*60)
    print("EXPERIMENT 4: SCALING STUDY")
    print("="*60)
    
    results = {}
    sizes = [(32, 2), (64, 2), (128, 3)]
    models = ['standard', 'rotation', 'rotation_q', 'lora']
    
    for dim, layers in sizes:
        key = f"dim{dim}_layers{layers}"
        results[key] = {}
        
        cfg_s = Config(hidden_dim=dim, num_layers=layers, num_epochs=20)
        
        for model in models:
            r = train(cfg_s, model, 'language', cfg.quantization_base, verbose=False)
            results[key][model] = r
            print(f"{key:20s} | {model:15s} | PPL: {r['final_ppl']:.2f} | Params: {r['params']['total']:,}")
    
    return results


def experiment_5_representation_capacity():
    """Test what rotation networks can learn"""
    print("\n" + "="*60)
    print("EXPERIMENT 5: REPRESENTATION CAPACITY")
    print("="*60)
    
    dim = 32
    results = {}
    
    test_funcs = {
        'identity': lambda x: x,
        'negation': lambda x: -x,
        'scaling': lambda x: x * 2.0,
        'swap_pairs': lambda x: x.view(-1, dim//2, 2).flip(-1).view(-1, dim),
        'nonlinear': lambda x: torch.tanh(x),
    }
    
    for name, func in test_funcs.items():
        results[name] = {}
        
        # Create test data
        torch.manual_seed(42)
        inp = torch.randn(500, dim)
        tgt = func(inp)
        
        for layer_type in ['linear', 'rotation', 'rotation_q']:
            if layer_type == 'linear':
                model = nn.Linear(dim, dim)
            elif layer_type == 'rotation':
                model = RotationLayer(dim)
            else:
                model = QuantizedRotationLayer(dim, 12)
            
            opt = torch.optim.Adam(model.parameters(), lr=1e-3)
            
            for _ in range(300):
                pred = model(inp)
                loss = F.mse_loss(pred, tgt)
                opt.zero_grad()
                loss.backward()
                opt.step()
            
            with torch.no_grad():
                final_loss = F.mse_loss(model(inp), tgt).item()
            
            results[name][layer_type] = final_loss
            print(f"{name:15s} | {layer_type:15s} | MSE: {final_loss:.6f}")
    
    return results


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("="*60)
    print("ROTATIONAL-TRANSFORMER SIMULATION SUITE")
    print("="*60)
    
    cfg = Config()
    print(f"Config: dim={cfg.hidden_dim}, layers={cfg.num_layers}, epochs={cfg.num_epochs}")
    
    all_results = {}
    
    # Run all experiments
    all_results['ablation'] = experiment_1_ablation(cfg)
    all_results['task_comparison'] = experiment_2_task_comparison(cfg)
    all_results['quantization_search'] = experiment_3_quantization_base(cfg)
    all_results['scaling'] = experiment_4_scaling(cfg)
    all_results['representation'] = experiment_5_representation_capacity()
    
    # Save results
    save_path = "/home/z/my-project/download/simulation_results.json"
    
    # Convert to serializable format
    def serialize(obj):
        if isinstance(obj, dict):
            return {str(k): serialize(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [serialize(v) for v in obj]
        elif isinstance(obj, (int, float, str)):
            return obj
        else:
            return str(obj)
    
    with open(save_path, 'w') as f:
        json.dump(serialize(all_results), f, indent=2)
    
    print(f"\n\nResults saved to: {save_path}")
    
    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    print("\n1. ABLATION STUDY (Language Task):")
    for k, v in all_results['ablation'].items():
        print(f"   {k:15s}: Final PPL = {v['final_ppl']:.2f}")
    
    print("\n2. TASK COMPARISON (Best Model per Task):")
    for task, models in all_results['task_comparison'].items():
        best = min(models.items(), key=lambda x: x[1]['final_ppl'])
        print(f"   {task:10s}: Best = {best[0]} (PPL = {best[1]['final_ppl']:.2f})")
    
    print("\n3. OPTIMAL QUANTIZATION BASE:")
    qs = all_results['quantization_search']
    best_base = min(qs.items(), key=lambda x: x[1]['final_ppl'])
    print(f"   Best base = {best_base[0]} (PPL = {best_base[1]['final_ppl']:.2f})")
    
    print("\n4. REPRESENTATION CAPACITY (MSE, lower is better):")
    for func, layers in all_results['representation'].items():
        best = min(layers.items(), key=lambda x: x[1])
        worst = max(layers.items(), key=lambda x: x[1])
        print(f"   {func:15s}: Best = {best[0]} ({best[1]:.6f}), Worst = {worst[0]} ({worst[1]:.6f})")
    
    return all_results


if __name__ == "__main__":
    results = main()
