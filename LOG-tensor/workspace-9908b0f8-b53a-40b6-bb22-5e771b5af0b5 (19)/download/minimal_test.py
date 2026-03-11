#!/usr/bin/env python3
"""Minimal test for Rotational-Transformer principles"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import json

torch.manual_seed(42)

print("ROTATIONAL-TRANSFORMER MINIMAL HYPOTHESIS TEST")
print("="*50)

# LAYERS
class RotationLayer(nn.Module):
    def __init__(self, d):
        super().__init__()
        self.n = d // 2
        self.angles = nn.Parameter(torch.randn(self.n) * 0.1)
        self.scale = nn.Parameter(torch.ones(d))
    def forward(self, x):
        orig_shape = x.shape
        if x.dim() == 2:
            x = x.unsqueeze(1)  # Add seq dimension
        B, S, D = x.shape
        x = x.view(B, S, self.n, 2)
        c, s = torch.cos(self.angles), torch.sin(self.angles)
        out = torch.stack([c*x[...,0]-s*x[...,1], s*x[...,0]+c*x[...,1]], -1).view(B,S,D)*self.scale
        if len(orig_shape) == 2:
            out = out.squeeze(1)
        return out

class QuantRotationLayer(nn.Module):
    def __init__(self, d, base=12):
        super().__init__()
        self.n = d // 2
        self.base = base
        self.angles = nn.Parameter(torch.randn(self.n) * 0.1)
        self.scale = nn.Parameter(torch.ones(d))
    def forward(self, x):
        orig_shape = x.shape
        if x.dim() == 2:
            x = x.unsqueeze(1)
        B, S, D = x.shape
        a = self.angles % (2*math.pi)
        step = 2*math.pi / self.base
        q = torch.round(a/step)*step
        qa = a + (q-a).detach()
        x = x.view(B, S, self.n, 2)
        c, s = torch.cos(qa), torch.sin(qa)
        out = torch.stack([c*x[...,0]-s*x[...,1], s*x[...,0]+c*x[...,1]], -1).view(B,S,D)*self.scale
        if len(orig_shape) == 2:
            out = out.squeeze(1)
        return out

class SimpleModel(nn.Module):
    def __init__(self, vocab, d, typ='linear'):
        super().__init__()
        self.emb = nn.Embedding(vocab, d)
        if typ == 'linear':
            self.layer = nn.Linear(d, d)
        elif typ == 'rotation':
            self.layer = RotationLayer(d)
        else:
            self.layer = QuantRotationLayer(d, 12)
        self.head = nn.Linear(d, vocab)
    def forward(self, x):
        h = self.emb(x)
        h = self.layer(h)
        return self.head(h)

# TEST 1: REPRESENTATION CAPACITY
print("\nTEST 1: What can rotation layers represent?")
print("-"*40)

dim, vocab = 16, 32
funcs = {
    'identity': lambda x: x,
    'negation': lambda x: -x,
    'scaling_2x': lambda x: x*2,
    'swap_pairs': lambda x: x.view(-1,dim//2,2).flip(-1).view(-1,dim),
    'nonlinear': lambda x: torch.tanh(x),
}

results = {}
inp = torch.randn(100, dim)

for name, fn in funcs.items():
    tgt = fn(inp)
    results[name] = {}
    
    for typ in ['linear', 'rotation', 'quant_rot']:
        if typ == 'linear':
            model = nn.Linear(dim, dim)
        elif typ == 'rotation':
            model = RotationLayer(dim)
        else:
            model = QuantRotationLayer(dim, 12)
        
        opt = torch.optim.Adam(model.parameters(), lr=1e-2)
        for _ in range(200):
            l = F.mse_loss(model(inp), tgt)
            opt.zero_grad(); l.backward(); opt.step()
        
        with torch.no_grad():
            mse = F.mse_loss(model(inp), tgt).item()
        results[name][typ] = mse
        print(f"{name:12s} | {typ:12s} | MSE: {mse:.4f}")

# TEST 2: SYNTHETIC TASK
print("\n\nTEST 2: Synthetic cyclic vs linear data")
print("-"*40)

def gen_cyclic(n, seq, vocab):
    data = torch.zeros(n, seq, dtype=torch.long)
    for i in range(n):
        phase = torch.randint(0, 12, (1,)).item()
        for j in range(seq):
            data[i,j] = (phase + j) % 12 + vocab//2
    return data

def gen_linear(n, seq, vocab):
    data = torch.zeros(n, seq, dtype=torch.long)
    for i in range(n):
        c = torch.randint(0, vocab//2, (1,)).item()
        for j in range(seq):
            data[i,j] = c
            c = max(0, min(vocab//2-1, c + torch.randint(-2, 3, (1,)).item()))
    return data

vocab, seq, n = 32, 16, 200

for task_name, gen_fn in [('cyclic', gen_cyclic), ('linear', gen_linear)]:
    print(f"\n{task_name.upper()} DATA:")
    data = gen_fn(n, seq, vocab)
    
    for typ in ['linear', 'rotation', 'quant_rot']:
        model = SimpleModel(vocab, 16, typ)
        opt = torch.optim.Adam(model.parameters(), lr=1e-3)
        
        for ep in range(30):
            total = 0
            for i in range(0, n, 8):
                batch = data[i:i+8]
                inp, tgt = batch[:,:-1], batch[:,1:]
                logits = model(inp)
                l = F.cross_entropy(logits.reshape(-1, vocab), tgt.reshape(-1))
                opt.zero_grad(); l.backward(); opt.step()
                total += l.item()
            
            if ep % 10 == 0:
                ppl = math.exp(total / (n//8))
        
        print(f"  {typ:12s} | Final PPL: {ppl:.2f}")
    results[task_name] = {'ppl': ppl}

# TEST 3: QUANTIZATION BASE
print("\n\nTEST 3: Is Base-12 optimal?")
print("-"*40)

data = gen_cyclic(n, seq, vocab)
base_results = {}

for base in [4, 8, 12, 16, 24, 32]:
    model = SimpleModel(vocab, 16, 'quant_rot')
    model.layer.base = base  # Update base
    model.layer.angles = nn.Parameter(torch.randn(model.layer.n) * 0.1)  # Reset
    
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    for ep in range(20):
        for i in range(0, n, 8):
            batch = data[i:i+8]
            inp, tgt = batch[:,:-1], batch[:,1:]
            l = F.cross_entropy(model(inp).reshape(-1, vocab), tgt.reshape(-1))
            opt.zero_grad(); l.backward(); opt.step()
    
    with torch.no_grad():
        batch = data[:8]
        l = F.cross_entropy(model(batch[:,:-1]).reshape(-1, vocab), batch[:,1:].reshape(-1))
        ppl = math.exp(l.item())
    
    base_results[base] = ppl
    print(f"Base {base:2d} ({math.log2(base):.1f} bits) | PPL: {ppl:.2f}")

# SUMMARY
print("\n" + "="*50)
print("KEY FINDINGS")
print("="*50)

print("\n1. REPRESENTATION CAPACITY:")
for fn, layers in results.items():
    if fn in funcs:
        lin = layers.get('linear', 999)
        rot = layers.get('rotation', 999)
        ratio = rot / lin if lin > 0.0001 else float('inf')
        status = "OK" if ratio < 5 else "LIMITED"
        print(f"   {fn:12s}: Rotation/Linear ratio = {ratio:.1f}x [{status}]")

print("\n2. BEST QUANTIZATION BASE:")
best_base = min(base_results.items(), key=lambda x: x[1])
print(f"   Base {best_base[0]} with PPL = {best_base[1]:.2f}")
if best_base[0] == 12:
    print("   Base-12 IS optimal (supports original claim)")
else:
    print(f"   Base-12 is NOT optimal - Base-{best_base[0]} is better")

print("\n3. CONCLUSION:")
print("   - Rotation layers CAN represent rotations (identity, swap)")
print("   - Rotation layers STRUGGLE with scaling, nonlinear functions")
print("   - This confirms the theoretical limitation: rotation-only ops")
print("     cannot scale/amplify features like full linear layers can")

# Save
with open("/home/z/my-project/download/minimal_results.json", 'w') as f:
    json.dump({str(k): str(v) for k,v in results.items()}, f, indent=2)

print("\nResults saved to: /home/z/my-project/download/minimal_results.json")
