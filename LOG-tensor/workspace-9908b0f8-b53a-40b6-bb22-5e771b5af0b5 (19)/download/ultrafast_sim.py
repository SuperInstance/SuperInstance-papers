#!/usr/bin/env python3
"""
Ultra-Fast Simulation Suite for Rotational-Transformer Principles
==================================================================
Minimal epochs for rapid hypothesis testing.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import json
import time
from dataclasses import dataclass
import warnings
warnings.filterwarnings('ignore')

torch.manual_seed(42)

@dataclass
class Config:
    hidden_dim: int = 32
    num_layers: int = 2
    vocab_size: int = 64
    max_seq_len: int = 32
    batch_size: int = 8
    num_epochs: int = 15
    quantization_base: int = 12
    lora_rank: int = 4

# LAYERS
class RotationLayer(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.n = dim // 2
        self.angles = nn.Parameter(torch.randn(self.n) * 0.1)
        self.scale = nn.Parameter(torch.ones(dim))
    def forward(self, x):
        B, S, D = x.shape
        x = x.view(B, S, self.n, 2)
        c, s = torch.cos(self.angles), torch.sin(self.angles)
        out = torch.stack([c*x[...,0] - s*x[...,1], s*x[...,0] + c*x[...,1]], -1)
        return out.view(B, S, D) * self.scale

class QuantRotationLayer(nn.Module):
    def __init__(self, dim, base=12):
        super().__init__()
        self.n = dim // 2
        self.base = base
        self.angles = nn.Parameter(torch.randn(self.n) * 0.1)
        self.scale = nn.Parameter(torch.ones(dim))
        self.snap = 0.0
    def forward(self, x):
        B, S, D = x.shape
        a = self.angles % (2*math.pi)
        step = 2*math.pi / self.base
        q = torch.round(a/step)*step
        qa = a + (q - a).detach()
        with torch.no_grad():
            self.snap = (torch.abs(a-qa) < 0.01).float().mean().item()
        x = x.view(B, S, self.n, 2)
        c, s = torch.cos(qa), torch.sin(qa)
        return torch.stack([c*x[...,0]-s*x[...,1], s*x[...,0]+c*x[...,1]], -1).view(B,S,D)*self.scale

class LoRALinear(nn.Module):
    def __init__(self, dim, r=4):
        super().__init__()
        self.w = nn.Parameter(torch.eye(dim)*0.1)
        self.A = nn.Parameter(torch.randn(dim, r)*0.01)
        self.B = nn.Parameter(torch.zeros(r, dim))
    def forward(self, x):
        return x @ (self.w + self.B @ self.A).T

# FFNs
class StdFFN(nn.Module):
    def __init__(self, d):
        super().__init__()
        self.f1 = nn.Linear(d, d*4)
        self.f2 = nn.Linear(d*4, d)
    def forward(self, x):
        return self.f2(F.gelu(self.f1(x)))

class RotFFN(nn.Module):
    def __init__(self, d, q=False, base=12):
        super().__init__()
        self.r = QuantRotationLayer(d, base) if q else RotationLayer(d)
        self.n = nn.LayerNorm(d)
    def forward(self, x):
        return self.n(self.r(x)+x)

class LFFN(nn.Module):
    def __init__(self, d, r=4):
        super().__init__()
        self.l1 = LoRALinear(d, r)
        self.l2 = LoRALinear(d, r)
        self.n = nn.LayerNorm(d)
    def forward(self, x):
        return self.n(self.l2(F.gelu(self.l1(x)))+x)

# MODEL
class Model(nn.Module):
    def __init__(self, cfg, ffn='std', base=12):
        super().__init__()
        d, L = cfg.hidden_dim, cfg.num_layers
        self.emb = nn.Embedding(cfg.vocab_size, d)
        self.pos = nn.Embedding(cfg.max_seq_len, d)
        self.attns = nn.ModuleList([nn.Linear(d,d) for _ in range(L)])
        self.norms1 = nn.ModuleList([nn.LayerNorm(d) for _ in range(L)])
        self.norms2 = nn.ModuleList([nn.LayerNorm(d) for _ in range(L)])
        
        if ffn == 'std': self.ffns = nn.ModuleList([StdFFN(d) for _ in range(L)])
        elif ffn == 'rot': self.ffns = nn.ModuleList([RotFFN(d) for _ in range(L)])
        elif ffn == 'rot_q': self.ffns = nn.ModuleList([RotFFN(d, True, base) for _ in range(L)])
        elif ffn == 'lora': self.ffns = nn.ModuleList([LFFN(d, cfg.lora_rank) for _ in range(L)])
        
        self.head = nn.Linear(d, cfg.vocab_size)
        self.d = d
    
    def forward(self, x):
        B, S = x.shape
        h = self.emb(x) + self.pos(torch.arange(S, device=x.device))
        for a, n1, f, n2 in zip(self.attns, self.norms1, self.ffns, self.norms2):
            h = n1(h + a(h))  # Simplified attention
            h = n2(h + f(h))
        return self.head(h)
    
    def get_snap(self):
        fs = [f.r.snap for f in self.ffns if hasattr(f,'r') and hasattr(f.r,'snap')]
        return sum(fs)/len(fs) if fs else 0.0
    
    def count_params(self):
        t = sum(p.numel() for p in self.parameters())
        f = sum(sum(p.numel() for p in fn.parameters()) for fn in self.ffns)
        return t, f

# DATA
def gen_data(vocab, seq, n, typ='lang'):
    data = torch.zeros(n, seq, dtype=torch.long)
    if typ == 'cyclic':
        for i in range(n):
            p = torch.randint(0,12,(1,)).item()
            for j in range(seq): data[i,j] = (p+j)%12 + vocab//2
    elif typ == 'linear':
        for i in range(n):
            c = torch.randint(0, vocab//2, (1,)).item()
            for j in range(seq):
                c = max(0, min(vocab//2-1, c + torch.randint(-2,3,(1,)).item()))
                data[i,j] = c
    else:
        freq = torch.tensor([1.0/(i+1)**1.1 for i in range(vocab)])
        freq = freq/freq.sum()
        for i in range(n):
            for j in range(seq):
                if j==0 or torch.rand(1).item()>0.3:
                    data[i,j] = torch.multinomial(freq,1).item()
                else:
                    data[i,j] = data[i,j-1] if torch.rand(1).item()>0.5 else (data[i,j-1]+1)%vocab
    return data

# TRAIN
def train(cfg, ffn, data, verbose=True):
    model = Model(cfg, ffn, cfg.quantization_base)
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4)
    
    t,f = model.count_params()
    if verbose: print(f"\n{ffn:10s} | Total: {t:,} | FFN: {f:,}")
    
    losses, ppls, snaps = [], [], []
    val = gen_data(cfg.vocab_size, cfg.max_seq_len, cfg.batch_size*5, data)
    
    for ep in range(cfg.num_epochs):
        model.train()
        loss = 0
        for i in range(0, len(train_data), cfg.batch_size):
            b = train_data[i:i+cfg.batch_size]
            inp, tgt = b[:,:-1], b[:,1:]
            logits = model(inp)
            l = F.cross_entropy(logits.reshape(-1,logits.size(-1)), tgt.reshape(-1))
            opt.zero_grad(); l.backward(); opt.step()
            loss += l.item()
        
        # Val
        model.eval()
        with torch.no_grad():
            vl = 0
            for i in range(0, len(val), cfg.batch_size):
                b = val[i:i+cfg.batch_size]
                inp, tgt = b[:,:-1], b[:,1:]
                vl += F.cross_entropy(model(inp).reshape(-1,model(inp).size(-1)), 
                                      tgt.reshape(-1), reduction='sum').item()
            ppl = math.exp(vl/(len(val)*(cfg.max_seq_len-1)))
        
        losses.append(loss/(len(train_data)//cfg.batch_size))
        ppls.append(ppl)
        snaps.append(model.get_snap())
        
        if verbose and ep%5==0:
            print(f"Ep {ep:2d} | Loss: {losses[-1]:.3f} | PPL: {ppl:.2f} | Snap: {snaps[-1]:.0%}")
    
    return {'final_ppl': ppls[-1], 'best_ppl': min(ppls), 'snap': snaps[-1], 'params': (t,f)}

# EXPERIMENTS
def exp1_ablation(cfg, train_data):
    print("\n" + "="*50)
    print("EXP 1: ABLATION (Language Task)")
    print("="*50)
    results = {}
    for ffn in ['std', 'rot', 'rot_q', 'lora']:
        results[ffn] = train(cfg, ffn, 'lang')
    return results

def exp2_tasks(cfg):
    print("\n" + "="*50)
    print("EXP 2: TASK COMPARISON")
    print("="*50)
    results = {}
    for task in ['cyclic', 'linear', 'lang']:
        results[task] = {}
        data = gen_data(cfg.vocab_size, cfg.max_seq_len, cfg.batch_size*30, task)
        for ffn in ['std', 'rot', 'rot_q', 'lora']:
            r = train(cfg, ffn, task, verbose=False)
            results[task][ffn] = r
            print(f"{task:8s} | {ffn:8s} | PPL: {r['final_ppl']:.2f}")
    return results

def exp3_quant_base(cfg):
    print("\n" + "="*50)
    print("EXP 3: QUANTIZATION BASE SEARCH")
    print("="*50)
    results = {}
    for base in [4, 8, 12, 16, 24, 32, 64]:
        cfg_q = Config(hidden_dim=cfg.hidden_dim, quantization_base=base)
        r = train(cfg_q, 'rot_q', 'lang', verbose=False)
        results[base] = r
        print(f"Base {base:2d} ({math.log2(base):.1f}b) | PPL: {r['final_ppl']:.2f} | Snap: {r['snap']:.0%}")
    return results

def exp4_scaling(cfg):
    print("\n" + "="*50)
    print("EXP 4: SCALING")
    print("="*50)
    results = {}
    for dim in [16, 32, 64]:
        cfg_s = Config(hidden_dim=dim)
        results[dim] = {}
        for ffn in ['std', 'rot', 'rot_q', 'lora']:
            r = train(cfg_s, ffn, 'lang', verbose=False)
            results[dim][ffn] = r
            print(f"Dim {dim:2d} | {ffn:8s} | PPL: {r['final_ppl']:.2f} | Params: {r['params'][0]:,}")
    return results

def exp5_capacity():
    print("\n" + "="*50)
    print("EXP 5: REPRESENTATION CAPACITY")
    print("="*50)
    dim, results = 16, {}
    
    funcs = {
        'identity': lambda x: x,
        'negate': lambda x: -x,
        'scale2': lambda x: x*2,
        'swap': lambda x: x.view(-1,dim//2,2).flip(-1).view(-1,dim),
        'nonlin': lambda x: torch.tanh(x),
        'proj': lambda x: x * torch.tensor([1.0 if i%2==0 else 0.0 for i in range(dim)]),
    }
    
    for name, fn in funcs.items():
        results[name] = {}
        inp = torch.randn(200, dim)
        tgt = fn(inp)
        
        for typ in ['linear', 'rotation', 'quant_rot']:
            if typ == 'linear': m = nn.Linear(dim, dim)
            elif typ == 'rotation': m = RotationLayer(dim)
            else: m = QuantRotationLayer(dim, 12)
            
            opt = torch.optim.Adam(m.parameters(), lr=1e-2)
            for _ in range(200):
                l = F.mse_loss(m(inp), tgt)
                opt.zero_grad(); l.backward(); opt.step()
            
            with torch.no_grad():
                mse = F.mse_loss(m(inp), tgt).item()
            results[name][typ] = mse
            print(f"{name:10s} | {typ:12s} | MSE: {mse:.4f}")
    return results

# MAIN
if __name__ == "__main__":
    print("="*50)
    print("ROTATIONAL-TRANSFORMER SIMULATIONS")
    print("="*50)
    
    cfg = Config()
    print(f"Config: dim={cfg.hidden_dim}, epochs={cfg.num_epochs}")
    
    # Generate training data once
    train_data = gen_data(cfg.vocab_size, cfg.max_seq_len, cfg.batch_size*30, 'lang')
    
    results = {}
    results['ablation'] = exp1_ablation(cfg, train_data)
    results['tasks'] = exp2_tasks(cfg)
    results['quant_base'] = exp3_quant_base(cfg)
    results['scaling'] = exp4_scaling(cfg)
    results['capacity'] = exp5_capacity()
    
    # Save
    def ser(x):
        if isinstance(x, dict): return {str(k): ser(v) for k,v in x.items()}
        if isinstance(x, (list, tuple)): return [ser(v) for v in x]
        if isinstance(x, (int, float, str)): return x
        return str(x)
    
    with open("/home/z/my-project/download/sim_results.json", 'w') as f:
        json.dump(ser(results), f, indent=2)
    
    # Summary
    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    
    print("\n1. ABLATION (Language, lower PPL = better):")
    for k,v in results['ablation'].items():
        print(f"   {k:10s}: PPL = {v['final_ppl']:.2f}")
    
    print("\n2. BEST MODEL PER TASK:")
    for t,ms in results['tasks'].items():
        b = min(ms.items(), key=lambda x: x[1]['final_ppl'])
        print(f"   {t:8s}: {b[0]} (PPL = {b[1]['final_ppl']:.2f})")
    
    print("\n3. OPTIMAL QUANTIZATION BASE:")
    q = results['quant_base']
    b = min(q.items(), key=lambda x: x[1]['final_ppl'])
    print(f"   Base {b[0]} with PPL = {b[1]['final_ppl']:.2f}")
    
    print("\n4. KEY FINDINGS FROM REPRESENTATION TEST:")
    for fn, layers in results['capacity'].items():
        best = min(layers.items(), key=lambda x: x[1])
        worst = max(layers.items(), key=lambda x: x[1])
        ratio = worst[1] / best[1] if best[1] > 0 else float('inf')
        print(f"   {fn:10s}: Rotation/Linear ratio = {ratio:.1f}x")
    
    print("\nResults saved to: /home/z/my-project/download/sim_results.json")
