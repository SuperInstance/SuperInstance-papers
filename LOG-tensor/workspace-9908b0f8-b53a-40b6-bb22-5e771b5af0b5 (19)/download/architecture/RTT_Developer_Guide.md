# Rubiks-Tensor-Transformer Developer Guide

## Getting Started with RTT Development

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Core Concepts](#core-concepts)
4. [Developer Workflows](#developer-workflows)
5. [Training Guide](#training-guide)
6. [API Reference](#api-reference)
7. [Performance Optimization](#performance-optimization)
8. [Migration from Standard Transformers](#migration-from-standard-transformers)

---

## Quick Start

### Installation

```bash
# Core dependencies
pip install torch numpy

# Optional: For visualization
pip install matplotlib seaborn

# Optional: For distributed training
pip install accelerate deepspeed
```

### Minimal Example

```python
from rubiks_tensor_transformer import RubiksTensorTransformer, CertainTensor

# Create model
model = RubiksTensorTransformer(
    vocab_size=10000,
    d_model=512,
    n_heads=8,
    n_layers=12,
    removal_threshold=0.8
)

# Forward pass
input_ids = torch.randint(0, 10000, (batch_size, seq_len))
logits, stats = model(input_ids, return_stats=True)

print(f"Layers used: {stats['layers_used']}/{model.n_layers}")
print(f"Final certainty: {stats['final_certainty']:.2f}")
```

---

## Architecture Overview

### The Three Pillars of RTT

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RUBIKS-TENSOR-TRANSFORMER                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │  PERMUTATION    │  │   CERTAINTY     │  │   LAYER REMOVAL     │ │
│  │  TRACKING       │  │   ENCODING      │  │   MECHANISM         │ │
│  │                 │  │                 │  │                     │ │
│  │  σ ∈ Sₙ        │  │  c ∈ [0,1]^n   │  │  L(c) ∝ (1-c)²     │ │
│  │                 │  │                 │  │                     │ │
│  │  Sinkhorn      │  │  Entropy-based │  │  Early exit when    │ │
│  │  soft perms    │  │  certainty     │  │  certainty high     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
│           │                   │                      │              │
│           └───────────────────┼──────────────────────┘              │
│                               ▼                                     │
│                    ┌─────────────────────┐                          │
│                    │  CERTAIN TENSOR     │                          │
│                    │                     │                          │
│                    │  data: (n, d)       │                          │
│                    │  certainty: (n,)    │                          │
│                    │  permutation: (n,)  │                          │
│                    └─────────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Input Tokens
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Token Embedding + Position Embedding                        │
│ Initialize: certainty = 0.5, permutation = identity         │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Permutation-Equivariant Attention                  │
│   - Q, K, V projections                                     │
│   - Attention with permutation bias                         │
│   - Update certainty from attention entropy                 │
│   - Update permutation via Sinkhorn                         │
│                                                             │
│ Check: mean(certainty) > threshold?                         │
│   - Yes → Early exit                                        │
│   - No → Continue to next layer                             │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2-N: Same structure, earlier exit for high certainty  │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ Output: Certainty-weighted readout                          │
│   output = Σ c[i] × hidden[i] / Σ c[j]                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. CertainTensor

The fundamental data structure that carries both values and meta-information:

```python
@dataclass
class CertainTensor:
    data: torch.Tensor        # Shape: (batch, n, d) - actual values
    certainty: torch.Tensor   # Shape: (batch, n) - confidence [0, 1]
    permutation: torch.Tensor # Shape: (batch, n) - current permutation
```

**Key Properties**:
- Certainty starts at 0.5 (maximum uncertainty)
- Certainty never decreases
- Permutation is composed cumulatively through layers

### 2. Soft Permutations (Sinkhorn)

Differentiable approximation to discrete permutations:

```python
def sinkhorn(logits, temperature=0.1, n_iterations=20):
    """
    Convert logits to doubly-stochastic matrix.
    
    As τ → 0: Converges to hard permutation
    As τ → ∞: Converges to uniform matrix
    """
    P = torch.exp(logits / temperature)
    for _ in range(n_iterations):
        P = P / P.sum(dim=-1, keepdim=True)  # Row normalize
        P = P / P.sum(dim=-2, keepdim=True)  # Column normalize
    return P
```

### 3. Layer Removal Formula

The core innovation - layers removed as certainty increases:

```python
def compute_layers_needed(certainty, max_layers, min_layers=1):
    """
    L(c) = ⌊L_max · (1 - mean(c))²⌋
    
    Interpretation:
    - High certainty (c → 1): Few layers needed
    - Low certainty (c → 0.5): All layers needed
    """
    mean_c = certainty.mean()
    layers = max_layers * (1 - mean_c) ** 2
    return max(min_layers, int(layers))
```

**Example**:
| Mean Certainty | Layers Needed (out of 12) |
|---------------|---------------------------|
| 0.50 | 12 (100%) |
| 0.60 | 8 (67%) |
| 0.70 | 5 (42%) |
| 0.80 | 2 (17%) |
| 0.90 | 2 (min) |

---

## Developer Workflows

### Workflow 1: Research Prototyping

```python
# Step 1: Define model configuration
config = {
    'vocab_size': 10000,
    'd_model': 256,
    'n_heads': 8,
    'n_layers': 6,
    'removal_threshold': 0.75
}

# Step 2: Create model
model = RubiksTensorTransformer(**config)

# Step 3: Create sample input
input_ids = torch.randint(0, config['vocab_size'], (4, 64))

# Step 4: Forward pass with detailed statistics
logits, stats = model(input_ids, return_stats=True)

# Step 5: Analyze layer usage
print(f"Layer efficiency: {stats['layers_used']}/{config['n_layers']}")
print(f"Final certainty: {stats['final_certainty']:.2%}")
```

### Workflow 2: Custom Training Loop

```python
from rubiks_tensor_transformer import RubiksTransformerTrainer

# Create trainer
trainer = RubiksTransformerTrainer(
    model=model,
    lr=1e-4,
    weight_decay=0.01,
    equivariance_weight=0.1  # Regularization weight
)

# Training loop
for epoch in range(num_epochs):
    for batch in dataloader:
        input_ids, target_ids = batch
        
        # Single training step
        losses = trainer.train_step(input_ids, target_ids)
        
        print(f"Loss: {losses['total_loss']:.4f}")
        print(f"Layer efficiency: {losses['layer_efficiency']:.1%}")
```

### Workflow 3: Inference Optimization

```python
# For production inference
model.eval()

# Use lower threshold for faster inference
model.removal_threshold = 0.7  # Exit earlier

# Batch inference
with torch.no_grad():
    for batch in inference_dataloader:
        logits, stats = model(batch, return_stats=True)
        
        # Track efficiency
        efficiency = stats['layers_used'] / model.n_layers
        print(f"Efficiency gain: {1 - efficiency:.1%} layers saved")
```

---

## Training Guide

### Loss Functions

RTT uses a compound loss:

```python
total_loss = lm_loss + λ_eq * equivariance_loss + λ_cal * calibration_loss
```

**Component Descriptions**:

1. **Language Modeling Loss**: Standard cross-entropy
   ```python
   lm_loss = F.cross_entropy(logits, targets)
   ```

2. **Equivariance Loss**: Ensures permutation equivariance
   ```python
   # For permutation σ, ensure:
   # Attention(σ · X) ≈ σ · Attention(X)
   equivariance_loss = MSE(out1, permute(out2, σ^-1))
   ```

3. **Certainty Calibration**: Aligns certainty with accuracy
   ```python
   calibration_loss = BCE(certainty, actual_accuracy)
   ```

### Hyperparameter Recommendations

| Parameter | Recommended Value | Notes |
|-----------|------------------|-------|
| `removal_threshold` | 0.75-0.85 | Higher = more aggressive early exit |
| `min_layers` | 2-3 | Minimum layers to ensure quality |
| `certainty_temp` | 2.0 | Temperature for certainty update |
| `sinkhorn_temperature` | 0.1 | Lower = harder permutations |
| `equivariance_weight` | 0.1 | Regularization strength |

### Training Tips

1. **Start with standard training** (no layer removal)
   ```python
   model.removal_threshold = 1.0  # Disable early exit initially
   ```

2. **Gradually enable layer removal**
   ```python
   # After warmup, lower threshold
   if epoch > warmup_epochs:
       model.removal_threshold = 0.85
   ```

3. **Monitor layer efficiency**
   ```python
   efficiency = model.get_layer_efficiency()
   print(f"Average layer efficiency: {efficiency:.1%}")
   ```

---

## API Reference

### RubiksTensorTransformer

```python
class RubiksTensorTransformer(nn.Module):
    def __init__(
        self,
        vocab_size: int,          # Vocabulary size
        d_model: int = 512,       # Model dimension
        n_heads: int = 8,         # Number of attention heads
        n_layers: int = 12,       # Maximum number of layers
        d_ff: int = None,         # Feed-forward dimension (default: 4*d_model)
        max_seq_len: int = 512,   # Maximum sequence length
        dropout: float = 0.1,     # Dropout rate
        removal_threshold: float = 0.8,  # Certainty threshold for early exit
        min_layers: int = 2       # Minimum layers to use
    ):
        ...
    
    def forward(
        self,
        input_ids: torch.Tensor,      # Shape: (batch, seq_len)
        mask: torch.Tensor = None,    # Optional attention mask
        return_stats: bool = False    # Return detailed statistics
    ) -> Union[torch.Tensor, Tuple[torch.Tensor, Dict]]:
        """
        Returns:
            logits: Shape (batch, seq_len, vocab_size)
            stats (if return_stats=True): Dictionary with layer usage info
        """
    
    def get_layer_efficiency(self) -> float:
        """Returns average fraction of layers used."""
```

### CertainTensor

```python
@dataclass
class CertainTensor:
    data: torch.Tensor           # Shape: (batch, n, d)
    certainty: torch.Tensor      # Shape: (batch, n), values in [0, 1]
    permutation: torch.Tensor    # Shape: (batch, n), indices 0 to n-1
    
    def mean_certainty(self) -> torch.Tensor:
        """Mean certainty across all positions."""
    
    def certainty_entropy(self) -> torch.Tensor:
        """Entropy of certainty distribution."""
    
    def apply_certainty_weighting(self) -> torch.Tensor:
        """Apply certainty as soft mask on data."""
```

### Utility Functions

```python
def sinkhorn(
    logits: torch.Tensor,      # Shape: (batch, n, n)
    temperature: float = 0.1,  # Temperature parameter
    n_iterations: int = 20,    # Number of iterations
    noise: bool = False        # Add Gumbel noise for sampling
) -> torch.Tensor:
    """Convert logits to doubly-stochastic matrix."""

def permutation_matrix_to_indices(P: torch.Tensor) -> torch.Tensor:
    """Convert soft permutation to hard indices."""

def indices_to_permutation_matrix(indices: torch.Tensor) -> torch.Tensor:
    """Convert indices to one-hot permutation matrix."""
```

---

## Performance Optimization

### Memory Optimization

```python
# 1. Use gradient checkpointing for large models
from torch.utils.checkpoint import checkpoint

# 2. Enable mixed precision training
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()

with autocast():
    logits = model(input_ids)
    loss = criterion(logits, targets)

scaler.scale(loss).backward()
scaler.step(optimizer)
scaler.update()

# 3. Use efficient attention implementations
# Flash Attention or xformers for large sequences
```

### Inference Optimization

```python
# 1. Set model to eval mode
model.eval()

# 2. Use torch.compile (PyTorch 2.0+)
model = torch.compile(model)

# 3. Adjust threshold for speed vs quality tradeoff
model.removal_threshold = 0.7  # Faster but potentially lower quality

# 4. Batch inference for throughput
with torch.no_grad():
    outputs = model(input_ids)
```

### Distributed Training

```python
from accelerate import Accelerator

accelerator = Accelerator()
model, optimizer, dataloader = accelerator.prepare(
    model, optimizer, dataloader
)

for batch in dataloader:
    outputs = model(batch)
    loss = criterion(outputs, targets)
    accelerator.backward(loss)
    optimizer.step()
```

---

## Migration from Standard Transformers

### Step 1: Replace Model Class

```python
# Before (standard transformer)
from transformers import GPT2Model
model = GPT2Model.from_pretrained('gpt2')

# After (RTT)
from rubiks_tensor_transformer import RubiksTensorTransformer
model = RubiksTensorTransformer(
    vocab_size=50257,
    d_model=768,
    n_heads=12,
    n_layers=12
)
```

### Step 2: Adjust Forward Pass

```python
# Before
outputs = model(input_ids)
logits = outputs.logits

# After
logits, stats = model(input_ids, return_stats=True)
# Optionally use stats for monitoring
```

### Step 3: Fine-tune Hyperparameters

```python
# RTT-specific hyperparameters
model.removal_threshold = 0.8  # Early exit threshold
model.min_layers = 3           # Minimum layers to use

# Start with higher threshold during initial training
# Lower it as model learns to use certainty properly
```

### Key Differences

| Aspect | Standard Transformer | RTT |
|--------|---------------------|-----|
| Computation | Fixed depth | Dynamic depth |
| Permutation | Implicit | Explicit tracking |
| Certainty | None | Encoded in tensor |
| Efficiency | Constant | Adapts to input |
| Memory | O(L × n²) | O(L(c) × n²) |

---

## Troubleshooting

### Common Issues

1. **"Certainty not increasing"**
   - Lower `certainty_temp` parameter
   - Check attention patterns are focusing
   - Increase training time

2. **"Layer removal too aggressive"**
   - Raise `removal_threshold`
   - Increase `min_layers`

3. **"Permutation becomes unstable"**
   - Lower `sinkhorn_temperature`
   - Reduce learning rate for permutation-related parameters

4. **"Memory issues with large sequences"**
   - Use gradient checkpointing
   - Enable mixed precision
   - Consider Flash Attention

---

## Further Reading

- [Architecture Documentation](./Rubiks_Tensor_Transformer_Architecture.md)
- [Mathematical Foundations](./Mathematical_Foundations.md)
- [Implementation Patterns](./Implementation_Patterns.md)

---

*Developer Guide for Rubiks-Tensor-Transformer v1.0*
