#!/usr/bin/env python3
"""
Comprehensive Simulation Framework for Rotational-Transformer Principles
=========================================================================

This framework rigorously tests the following hypotheses:
1. Does rotation-based FFN improve language modeling?
2. Is Base-12 optimal, or arbitrary?
3. What can/cannot rotation-only operations represent?
4. How does the approach scale?
5. Is the benefit from rotation or quantization?

Author: Z.ai Research Analysis
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
import json
import time
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')

# Set seeds for reproducibility
torch.manual_seed(42)

# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass
class ExperimentConfig:
    """Configuration for experiments"""
    name: str
    model_type: str  # 'linear', 'rotation', 'rotation_quantized', 'lora'
    hidden_dim: int = 64
    num_layers: int = 2
    num_heads: int = 4
    vocab_size: int = 256
    max_seq_len: int = 128
    batch_size: int = 32
    learning_rate: float = 3e-4
    num_epochs: int = 100
    warmup_steps: int = 100
    quantization_base: int = 12  # For quantized rotation
    lora_rank: int = 8  # For LoRA comparison
    task_type: str = 'language'  # 'language', 'synthetic_cyclic', 'synthetic_linear', 'synthetic_mixed'
    dataset_size: int = 10000
    device: str = 'cuda' if torch.cuda.is_available() else 'cpu'

# ============================================================================
# ROTATION-BASED LAYERS
# ============================================================================

class RotationLayer(nn.Module):
    """
    Continuous rotation layer (no quantization)
    Each dimension pair undergoes a learned rotation
    """
    def __init__(self, hidden_dim: int):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.num_angles = hidden_dim // 2
        
        # Learnable rotation angles (continuous)
        self.angles = nn.Parameter(torch.randn(self.num_angles) * 0.1)
        
        # Optional scaling (to test if rotation-only is limiting)
        self.scale = nn.Parameter(torch.ones(hidden_dim))
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, hidden_dim)
        batch_size, seq_len, _ = x.shape
        
        # Reshape to pairs
        x_pairs = x.view(batch_size, seq_len, self.num_angles, 2)
        
        # Compute rotation
        cos_a = torch.cos(self.angles)
        sin_a = torch.sin(self.angles)
        
        # Apply rotation: [cos, -sin; sin, cos] @ [x1, x2]
        x1 = x_pairs[..., 0]
        x2 = x_pairs[..., 1]
        
        out1 = cos_a * x1 - sin_a * x2
        out2 = sin_a * x1 + cos_a * x2
        
        # Recombine
        out = torch.stack([out1, out2], dim=-1).view(batch_size, seq_len, self.hidden_dim)
        
        # Apply scale
        out = out * self.scale
        
        return out


class QuantizedRotationLayer(nn.Module):
    """
    Quantized rotation layer with Straight-Through Estimator
    Angles are snapped to discrete values during forward pass
    """
    def __init__(self, hidden_dim: int, base: int = 12):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.num_angles = hidden_dim // 2
        self.base = base
        
        # Learnable angles (continuous, but quantized in forward)
        self.angles_raw = nn.Parameter(torch.randn(self.num_angles) * 0.1)
        
        # Scale
        self.scale = nn.Parameter(torch.ones(hidden_dim))
        
        # Track snap fidelity
        self.snap_fidelity = 0.0
        
    def quantize_angle(self, angle: torch.Tensor) -> torch.Tensor:
        """Quantize angle to base discrete values using STE"""
        # Convert to range [0, 2π)
        angle_normalized = angle % (2 * math.pi)
        
        # Find nearest discrete angle
        step = 2 * math.pi / self.base
        discrete_angle = torch.round(angle_normalized / step) * step
        
        # STE: use discrete in forward, continuous gradient in backward
        return angle_normalized + (discrete_angle - angle_normalized).detach()
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        batch_size, seq_len, _ = x.shape
        
        # Quantize angles
        quantized_angles = self.quantize_angle(self.angles_raw)
        
        # Track snap fidelity
        with torch.no_grad():
            step = 2 * math.pi / self.base
            distances = torch.abs(self.angles_raw % (2 * math.pi) - quantized_angles)
            self.snap_fidelity = (distances < 0.01).float().mean().item()
        
        # Reshape to pairs
        x_pairs = x.view(batch_size, seq_len, self.num_angles, 2)
        
        # Compute rotation
        cos_a = torch.cos(quantized_angles)
        sin_a = torch.sin(quantized_angles)
        
        x1 = x_pairs[..., 0]
        x2 = x_pairs[..., 1]
        
        out1 = cos_a * x1 - sin_a * x2
        out2 = sin_a * x1 + cos_a * x2
        
        out = torch.stack([out1, out2], dim=-1).view(batch_size, seq_len, self.hidden_dim)
        out = out * self.scale
        
        return out


class LoRALinear(nn.Module):
    """
    Low-Rank Adaptation layer for comparison
    """
    def __init__(self, hidden_dim: int, rank: int = 8):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.rank = rank
        
        # Original frozen weights (identity-like initialization)
        self.weight = nn.Parameter(torch.eye(hidden_dim) * 0.1)
        
        # LoRA matrices
        self.lora_A = nn.Parameter(torch.randn(hidden_dim, rank) * 0.01)
        self.lora_B = nn.Parameter(torch.zeros(rank, hidden_dim))
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # W + BA
        lora_update = self.lora_B @ self.lora_A
        effective_weight = self.weight + lora_update
        return torch.matmul(x, effective_weight.T)


class StandardFFN(nn.Module):
    """
    Standard FFN with expansion factor 4
    """
    def __init__(self, hidden_dim: int):
        super().__init__()
        self.fc1 = nn.Linear(hidden_dim, hidden_dim * 4)
        self.fc2 = nn.Linear(hidden_dim * 4, hidden_dim)
        self.act = nn.GELU()
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc2(self.act(self.fc1(x)))


class RotationFFN(nn.Module):
    """
    Rotation-based FFN (no expansion)
    """
    def __init__(self, hidden_dim: int, quantized: bool = False, base: int = 12):
        super().__init__()
        if quantized:
            self.rotation = QuantizedRotationLayer(hidden_dim, base)
        else:
            self.rotation = RotationLayer(hidden_dim)
        self.norm = nn.LayerNorm(hidden_dim)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.norm(self.rotation(x) + x)


class LoRAFFN(nn.Module):
    """
    FFN using LoRA-style low-rank adaptation
    """
    def __init__(self, hidden_dim: int, rank: int = 8):
        super().__init__()
        self.lora1 = LoRALinear(hidden_dim, rank)
        self.lora2 = LoRALinear(hidden_dim, rank)
        self.act = nn.GELU()
        self.norm = nn.LayerNorm(hidden_dim)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.norm(self.lora2(self.act(self.lora1(x))) + x)


# ============================================================================
# TRANSFORMER MODEL
# ============================================================================

class MultiHeadAttention(nn.Module):
    """Standard multi-head attention"""
    def __init__(self, hidden_dim: int, num_heads: int):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = hidden_dim // num_heads
        
        self.q_proj = nn.Linear(hidden_dim, hidden_dim)
        self.k_proj = nn.Linear(hidden_dim, hidden_dim)
        self.v_proj = nn.Linear(hidden_dim, hidden_dim)
        self.o_proj = nn.Linear(hidden_dim, hidden_dim)
        
    def forward(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        batch_size, seq_len, _ = x.shape
        
        q = self.q_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        
        scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(self.head_dim)
        
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
            
        attn = F.softmax(scores, dim=-1)
        out = torch.matmul(attn, v)
        
        out = out.transpose(1, 2).contiguous().view(batch_size, seq_len, -1)
        return self.o_proj(out)


class TransformerBlock(nn.Module):
    """Transformer block with configurable FFN type"""
    def __init__(self, hidden_dim: int, num_heads: int, ffn_type: str = 'standard', 
                 quantization_base: int = 12, lora_rank: int = 8):
        super().__init__()
        
        self.attn = MultiHeadAttention(hidden_dim, num_heads)
        self.norm1 = nn.LayerNorm(hidden_dim)
        self.norm2 = nn.LayerNorm(hidden_dim)
        
        # Select FFN type
        if ffn_type == 'standard':
            self.ffn = StandardFFN(hidden_dim)
        elif ffn_type == 'rotation':
            self.ffn = RotationFFN(hidden_dim, quantized=False)
        elif ffn_type == 'rotation_quantized':
            self.ffn = RotationFFN(hidden_dim, quantized=True, base=quantization_base)
        elif ffn_type == 'lora':
            self.ffn = LoRAFFN(hidden_dim, rank=lora_rank)
        else:
            raise ValueError(f"Unknown FFN type: {ffn_type}")
            
    def forward(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None) -> torch.Tensor:
        x = self.norm1(x + self.attn(x, mask))
        x = self.norm2(x + self.ffn(x))
        return x


class TransformerModel(nn.Module):
    """Full Transformer model"""
    def __init__(self, config: ExperimentConfig):
        super().__init__()
        self.config = config
        
        self.embedding = nn.Embedding(config.vocab_size, config.hidden_dim)
        self.pos_embedding = nn.Embedding(config.max_seq_len, config.hidden_dim)
        
        self.blocks = nn.ModuleList([
            TransformerBlock(
                config.hidden_dim, 
                config.num_heads, 
                config.model_type,
                config.quantization_base,
                config.lora_rank
            )
            for _ in range(config.num_layers)
        ])
        
        self.lm_head = nn.Linear(config.hidden_dim, config.vocab_size)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        batch_size, seq_len = x.shape
        
        positions = torch.arange(seq_len, device=x.device).unsqueeze(0).expand(batch_size, -1)
        
        h = self.embedding(x) + self.pos_embedding(positions)
        
        # Causal mask
        mask = torch.tril(torch.ones(seq_len, seq_len, device=x.device)).unsqueeze(0).unsqueeze(0)
        
        for block in self.blocks:
            h = block(h, mask)
            
        return self.lm_head(h)
    
    def count_parameters(self) -> Dict[str, int]:
        """Count parameters by category"""
        total = sum(p.numel() for p in self.parameters())
        
        ffn_params = 0
        attn_params = 0
        embed_params = self.embedding.weight.numel() + self.pos_embedding.weight.numel()
        
        for block in self.blocks:
            ffn_params += sum(p.numel() for p in block.ffn.parameters())
            attn_params += sum(p.numel() for p in block.attn.parameters())
            
        return {
            'total': total,
            'ffn': ffn_params,
            'attention': attn_params,
            'embedding': embed_params
        }
    
    def get_snap_fidelity(self) -> float:
        """Get average snap fidelity for quantized rotation models"""
        fidelities = []
        for block in self.blocks:
            if hasattr(block.ffn, 'rotation') and hasattr(block.ffn.rotation, 'snap_fidelity'):
                fidelities.append(block.ffn.rotation.snap_fidelity)
        return sum(fidelities) / len(fidelities) if fidelities else 0.0


# ============================================================================
# DATA GENERATION
# ============================================================================

def generate_cyclic_data(vocab_size: int, seq_len: int, num_samples: int, 
                         cycle_length: int = 12) -> torch.Tensor:
    """Generate data with explicit cyclic structure"""
    data = torch.zeros(num_samples, seq_len, dtype=torch.long)
    
    for i in range(num_samples):
        # Create a cyclic pattern
        phase = torch.randint(0, cycle_length, (1,)).item()
        for j in range(seq_len):
            # Pattern that repeats every cycle_length tokens
            data[i, j] = (phase + j) % cycle_length + (vocab_size // 2)
            
    return data


def generate_linear_data(vocab_size: int, seq_len: int, num_samples: int) -> torch.Tensor:
    """Generate data with linear (non-cyclic) structure"""
    data = torch.zeros(num_samples, seq_len, dtype=torch.long)
    
    for i in range(num_samples):
        # Random walk pattern (non-cyclic)
        current = torch.randint(0, vocab_size // 2, (1,)).item()
        for j in range(seq_len):
            step = torch.randint(-3, 4, (1,)).item()
            current = max(0, min(vocab_size // 2 - 1, current + step))
            data[i, j] = current
            
    return data


def generate_mixed_data(vocab_size: int, seq_len: int, num_samples: int,
                        cyclic_ratio: float = 0.5) -> torch.Tensor:
    """Generate mixed cyclic and non-cyclic data"""
    num_cyclic = int(num_samples * cyclic_ratio)
    num_linear = num_samples - num_cyclic
    
    cyclic = generate_cyclic_data(vocab_size, seq_len, num_cyclic)
    linear = generate_linear_data(vocab_size, seq_len, num_linear)
    
    data = torch.cat([cyclic, linear], dim=0)
    
    # Shuffle
    perm = torch.randperm(num_samples)
    return data[perm]


def generate_language_data(vocab_size: int, seq_len: int, num_samples: int) -> torch.Tensor:
    """Generate character-level language-like data with realistic statistics"""
    # Simulate Zipfian distribution (common in natural language)
    freq = torch.tensor([1.0 / (i + 1) ** 1.1 for i in range(vocab_size)])
    freq = freq / freq.sum()
    
    data = torch.zeros(num_samples, seq_len, dtype=torch.long)
    
    for i in range(num_samples):
        # Generate with some local coherence
        for j in range(seq_len):
            if j == 0 or torch.rand(1).item() > 0.3:
                # Sample from Zipfian
                data[i, j] = torch.multinomial(freq, 1).item()
            else:
                # Copy or modify previous token (local coherence)
                if torch.rand(1).item() > 0.5:
                    data[i, j] = data[i, j-1]
                else:
                    # Small variation
                    data[i, j] = (data[i, j-1] + torch.randint(-2, 3, (1,)).item()) % vocab_size
                    
    return data


class DataLoader:
    """Simple data loader"""
    def __init__(self, data: torch.Tensor, batch_size: int, seq_len: int):
        self.data = data
        self.batch_size = batch_size
        self.seq_len = seq_len
        self.num_batches = (len(data) * data.shape[1]) // (batch_size * seq_len)
        
    def __iter__(self):
        for i in range(self.num_batches):
            start_idx = i * self.batch_size
            end_idx = start_idx + self.batch_size
            
            if end_idx <= len(self.data):
                yield self.data[start_idx:end_idx]
                
    def __len__(self):
        return self.num_batches


# ============================================================================
# TRAINING UTILITIES
# ============================================================================

def compute_perplexity(model: nn.Module, data: torch.Tensor, device: str) -> float:
    """Compute perplexity on a dataset"""
    model.eval()
    total_loss = 0.0
    total_tokens = 0
    
    with torch.no_grad():
        for i in range(0, len(data), 8):  # Batch size 8 for evaluation
            batch = data[i:i+8].to(device)
            
            # Input is all but last token, target is all but first
            inputs = batch[:, :-1]
            targets = batch[:, 1:]
            
            logits = model(inputs)
            loss = F.cross_entropy(logits.reshape(-1, logits.size(-1)), 
                                   targets.reshape(-1), reduction='sum')
            
            total_loss += loss.item()
            total_tokens += targets.numel()
            
    avg_loss = total_loss / total_tokens
    return math.exp(avg_loss)


def train_model(config: ExperimentConfig, verbose: bool = True) -> Dict:
    """Train a model and return metrics"""
    device = config.device
    
    # Generate data based on task type
    if config.task_type == 'synthetic_cyclic':
        train_data = generate_cyclic_data(config.vocab_size, config.max_seq_len, 
                                          config.dataset_size)
        val_data = generate_cyclic_data(config.vocab_size, config.max_seq_len, 
                                        config.dataset_size // 5)
    elif config.task_type == 'synthetic_linear':
        train_data = generate_linear_data(config.vocab_size, config.max_seq_len,
                                          config.dataset_size)
        val_data = generate_linear_data(config.vocab_size, config.max_seq_len,
                                        config.dataset_size // 5)
    elif config.task_type == 'synthetic_mixed':
        train_data = generate_mixed_data(config.vocab_size, config.max_seq_len,
                                         config.dataset_size)
        val_data = generate_mixed_data(config.vocab_size, config.max_seq_len,
                                       config.dataset_size // 5)
    else:  # language
        train_data = generate_language_data(config.vocab_size, config.max_seq_len,
                                            config.dataset_size)
        val_data = generate_language_data(config.vocab_size, config.max_seq_len,
                                          config.dataset_size // 5)
    
    # Create model
    model = TransformerModel(config).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=config.learning_rate)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, config.num_epochs)
    
    # Training metrics
    metrics = {
        'train_losses': [],
        'val_perplexities': [],
        'snap_fidelities': [],
        'param_counts': model.count_parameters()
    }
    
    if verbose:
        print(f"\n{'='*60}")
        print(f"Training: {config.name}")
        print(f"Model type: {config.model_type}")
        print(f"Parameters: {metrics['param_counts']['total']:,}")
        print(f"FFN params: {metrics['param_counts']['ffn']:,}")
        print(f"{'='*60}")
    
    # Training loop
    start_time = time.time()
    best_val_ppl = float('inf')
    
    for epoch in range(config.num_epochs):
        model.train()
        epoch_loss = 0.0
        num_batches = 0
        
        # Create data loader for this epoch
        loader = DataLoader(train_data, config.batch_size, config.max_seq_len)
        
        for batch in loader:
            batch = batch.to(device)
            
            inputs = batch[:, :-1]
            targets = batch[:, 1:]
            
            logits = model(inputs)
            loss = F.cross_entropy(logits.reshape(-1, logits.size(-1)),
                                   targets.reshape(-1))
            
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            
            epoch_loss += loss.item()
            num_batches += 1
            
        scheduler.step()
        
        # Compute validation perplexity
        val_ppl = compute_perplexity(model, val_data, device)
        snap_fid = model.get_snap_fidelity()
        
        metrics['train_losses'].append(epoch_loss / num_batches)
        metrics['val_perplexities'].append(val_ppl)
        metrics['snap_fidelities'].append(snap_fid)
        
        if val_ppl < best_val_ppl:
            best_val_ppl = val_ppl
            
        if verbose and (epoch % 10 == 0 or epoch == config.num_epochs - 1):
            elapsed = time.time() - start_time
            print(f"Epoch {epoch:3d} | Loss: {epoch_loss/num_batches:8.4f} | "
                  f"Val PPL: {val_ppl:8.2f} | Snap: {snap_fid:.2%} | "
                  f"Time: {elapsed:.1f}s")
    
    metrics['final_val_perplexity'] = metrics['val_perplexities'][-1]
    metrics['best_val_perplexity'] = best_val_ppl
    metrics['final_snap_fidelity'] = metrics['snap_fidelities'][-1]
    metrics['training_time'] = time.time() - start_time
    
    return metrics


# ============================================================================
# EXPERIMENT RUNNERS
# ============================================================================

def run_ablation_study(base_config: ExperimentConfig) -> Dict:
    """
    Experiment 1: Ablation Study
    Compare rotation vs quantization vs standard linear
    """
    results = {}
    
    # Test configurations
    configs = [
        ('standard_linear', 'standard'),
        ('rotation_continuous', 'rotation'),
        ('rotation_base8', 'rotation_quantized'),  # Base 8
        ('rotation_base12', 'rotation_quantized'), # Base 12
        ('rotation_base16', 'rotation_quantized'), # Base 16
        ('lora_baseline', 'lora'),
    ]
    
    for name, model_type in configs:
        config = ExperimentConfig(
            name=f"{base_config.name}_{name}",
            model_type=model_type,
            hidden_dim=base_config.hidden_dim,
            num_layers=base_config.num_layers,
            num_epochs=base_config.num_epochs,
            task_type=base_config.task_type,
            quantization_base=8 if 'base8' in name else (16 if 'base16' in name else 12),
            device=base_config.device
        )
        
        metrics = train_model(config)
        results[name] = metrics
        
    return results


def run_task_comparison(base_config: ExperimentConfig) -> Dict:
    """
    Experiment 2: Task Type Comparison
    Test how different FFN types perform on different data structures
    """
    results = {}
    
    task_types = ['synthetic_cyclic', 'synthetic_linear', 'synthetic_mixed', 'language']
    model_types = ['standard', 'rotation', 'rotation_quantized', 'lora']
    
    for task in task_types:
        results[task] = {}
        for model_type in model_types:
            config = ExperimentConfig(
                name=f"{task}_{model_type}",
                model_type=model_type,
                hidden_dim=base_config.hidden_dim,
                num_layers=base_config.num_layers,
                num_epochs=base_config.num_epochs,
                task_type=task,
                device=base_config.device
            )
            
            metrics = train_model(config, verbose=False)
            results[task][model_type] = {
                'final_ppl': metrics['final_val_perplexity'],
                'best_ppl': metrics['best_val_perplexity'],
                'ffn_params': metrics['param_counts']['ffn']
            }
            
            print(f"{task:20s} | {model_type:20s} | PPL: {metrics['final_val_perplexity']:.2f} | "
                  f"FFN params: {metrics['param_counts']['ffn']:,}")
    
    return results


def run_scaling_study(base_config: ExperimentConfig) -> Dict:
    """
    Experiment 3: Scaling Study
    Test performance at different model sizes
    """
    results = {}
    
    sizes = [
        {'hidden_dim': 32, 'num_layers': 2},
        {'hidden_dim': 64, 'num_layers': 2},
        {'hidden_dim': 128, 'num_layers': 4},
        {'hidden_dim': 256, 'num_layers': 4},
    ]
    
    model_types = ['standard', 'rotation', 'rotation_quantized', 'lora']
    
    for size in sizes:
        dim = size['hidden_dim']
        layers = size['num_layers']
        key = f"dim{dim}_layers{layers}"
        results[key] = {}
        
        for model_type in model_types:
            config = ExperimentConfig(
                name=f"scale_{key}_{model_type}",
                model_type=model_type,
                hidden_dim=dim,
                num_layers=layers,
                num_epochs=base_config.num_epochs,
                task_type='language',
                device=base_config.device
            )
            
            metrics = train_model(config, verbose=False)
            results[key][model_type] = {
                'final_ppl': metrics['final_val_perplexity'],
                'total_params': metrics['param_counts']['total'],
                'ffn_params': metrics['param_counts']['ffn']
            }
            
            print(f"{key:25s} | {model_type:20s} | PPL: {metrics['final_val_perplexity']:8.2f} | "
                  f"Params: {metrics['param_counts']['total']:,}")
    
    return results


def run_quantization_search(base_config: ExperimentConfig) -> Dict:
    """
    Experiment 4: Quantization Base Search
    Find optimal quantization level
    """
    results = {}
    
    bases = [4, 6, 8, 10, 12, 16, 24, 32, 64, 128, 256]  # Various bases
    
    for base in bases:
        config = ExperimentConfig(
            name=f"quantization_base_{base}",
            model_type='rotation_quantized',
            hidden_dim=base_config.hidden_dim,
            num_layers=base_config.num_layers,
            num_epochs=base_config.num_epochs,
            quantization_base=base,
            task_type='language',
            device=base_config.device
        )
        
        metrics = train_model(config, verbose=False)
        results[base] = {
            'final_ppl': metrics['final_val_perplexity'],
            'snap_fidelity': metrics['final_snap_fidelity'],
            'bits_per_angle': math.log2(base)
        }
        
        print(f"Base {base:3d} ({math.log2(base):.2f} bits) | PPL: {metrics['final_val_perplexity']:8.2f} | "
              f"Snap: {metrics['final_snap_fidelity']:.2%}")
    
    return results


def run_representation_capacity_test(base_config: ExperimentConfig) -> Dict:
    """
    Experiment 5: Representation Capacity Analysis
    Test what functions rotation networks can/cannot learn
    """
    results = {}
    
    # Define test functions
    test_functions = {
        'identity': lambda x: x,
        'negation': lambda x: -x,
        'scaling': lambda x: x * 2.0,
        'rotation_45': lambda x: torch.stack([
            x[..., 0] * 0.707 - x[..., 1] * 0.707,
            x[..., 0] * 0.707 + x[..., 1] * 0.707
        ], dim=-1),
        'swap': lambda x: torch.stack([x[..., 1], x[..., 0]], dim=-1),
        'nonlinear': lambda x: torch.tanh(x) * 2,
        'projection': lambda x: x * torch.tensor([1.0, 0.0]),
        'arbitrary_linear': lambda x: torch.stack([
            x[..., 0] * 0.5 + x[..., 1] * 0.3,
            x[..., 0] * 0.7 - x[..., 1] * 0.2
        ], dim=-1),
    }
    
    model_types = ['standard', 'rotation', 'rotation_quantized']
    
    for func_name, func in test_functions.items():
        results[func_name] = {}
        
        for model_type in model_types:
            # Create simple test
            torch.manual_seed(42)
            
            # Generate input data
            inputs = torch.randn(1000, 8, base_config.hidden_dim)
            targets = func(inputs)
            
            # Create small model
            if model_type == 'standard':
                model = nn.Sequential(
                    nn.Linear(base_config.hidden_dim, base_config.hidden_dim),
                    nn.LayerNorm(base_config.hidden_dim)
                ).to(base_config.device)
            elif model_type == 'rotation':
                model = nn.Sequential(
                    RotationLayer(base_config.hidden_dim),
                    nn.LayerNorm(base_config.hidden_dim)
                ).to(base_config.device)
            else:
                model = nn.Sequential(
                    QuantizedRotationLayer(base_config.hidden_dim, base=12),
                    nn.LayerNorm(base_config.hidden_dim)
                ).to(base_config.device)
            
            optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
            
            # Train
            model.train()
            for _ in range(500):
                pred = model(inputs.to(base_config.device))
                loss = F.mse_loss(pred, targets.to(base_config.device))
                
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
            
            # Evaluate
            model.eval()
            with torch.no_grad():
                final_loss = F.mse_loss(model(inputs.to(base_config.device)), 
                                        targets.to(base_config.device)).item()
            
            results[func_name][model_type] = final_loss
            print(f"{func_name:20s} | {model_type:20s} | MSE: {final_loss:.6f}")
    
    return results


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("="*70)
    print("  ROTATIONAL-TRANSFORMER PRINCIPLES: COMPREHENSIVE SIMULATION SUITE")
    print("="*70)
    print("\nThis suite tests the following hypotheses:")
    print("1. Does rotation-based FFN improve language modeling?")
    print("2. Is Base-12 optimal, or arbitrary?")
    print("3. What can/cannot rotation-only operations represent?")
    print("4. How does the approach scale?")
    print("5. Is the benefit from rotation or quantization?")
    print("="*70)
    
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"\nDevice: {device}")
    
    # Base configuration
    base_config = ExperimentConfig(
        name="base_experiment",
        model_type='standard',
        hidden_dim=64,
        num_layers=2,
        num_epochs=50,  # Reduced for faster iteration
        device=device
    )
    
    all_results = {}
    
    # Run experiments
    print("\n" + "="*70)
    print("EXPERIMENT 1: ABLATION STUDY (Rotation vs Quantization vs Standard)")
    print("="*70)
    all_results['ablation'] = run_ablation_study(base_config)
    
    print("\n" + "="*70)
    print("EXPERIMENT 2: TASK TYPE COMPARISON")
    print("="*70)
    all_results['task_comparison'] = run_task_comparison(base_config)
    
    print("\n" + "="*70)
    print("EXPERIMENT 3: SCALING STUDY")
    print("="*70)
    all_results['scaling'] = run_scaling_study(base_config)
    
    print("\n" + "="*70)
    print("EXPERIMENT 4: QUANTIZATION BASE SEARCH")
    print("="*70)
    all_results['quantization_search'] = run_quantization_search(base_config)
    
    print("\n" + "="*70)
    print("EXPERIMENT 5: REPRESENTATION CAPACITY TEST")
    print("="*70)
    all_results['representation'] = run_representation_capacity_test(base_config)
    
    # Save results
    results_path = "/home/z/my-project/download/rotational_transformer_results.json"
    with open(results_path, 'w') as f:
        # Convert to serializable format
        serializable_results = {}
        for exp_name, exp_results in all_results.items():
            serializable_results[exp_name] = {}
            for key, value in exp_results.items():
                if isinstance(value, dict):
                    serializable_results[exp_name][str(key)] = {
                        k: (v if not isinstance(v, list) else [float(x) for x in v])
                        for k, v in value.items()
                    }
                else:
                    serializable_results[exp_name][str(key)] = value
        json.dump(serializable_results, f, indent=2)
    
    print(f"\n\nResults saved to: {results_path}")
    
    return all_results


if __name__ == "__main__":
    results = main()
