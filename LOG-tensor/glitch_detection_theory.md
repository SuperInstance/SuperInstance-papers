# Glitch Detection Theory in Attention Mechanisms
## Mathematical Analysis of "Glitches in the Matrix"

**Task ID**: 2-b  
**Domain**: Self-Origin Tensor Architecture  
**Focus**: Glitch Detection, Professional Hitter Model, Structural Signals

---

## 1. Introduction: "These Aren't Words. These Are Glitches in the Matrix."

The Professional Hitter metaphor reveals a profound truth about intelligence:

> "The professional doesn't have a larger context window or faster processing. Their key is blinders to what they don't need and focus like a magnifying glass at every subtle move."

This document formalizes "glitches" in the mathematical language of transformer attention mechanisms.

---

## 2. Mathematical Definition of Glitch in Transformer Attention

### 2.1 The Attention Distribution

**Standard Attention**: Given query $Q$, keys $K$, and values $V$:

$$\alpha = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)$$

**Self-Origin Attention**: Query fixed at origin position $\mathcal{O}$:

$$\alpha_{\mathcal{O}} = \text{softmax}\left(\frac{Q_{\mathcal{O}}K^T}{\sqrt{d_k}}\right)$$

### 2.2 Glitch Definition

**Definition 2.2.1 (Attention Glitch)**

A **glitch** is the deviation between expected and actual attention distributions:

$$\mathcal{G} \coloneqq \alpha_{\text{actual}} - \alpha_{\text{expected}}$$

**Properties**:
1. $\mathcal{G} \in [-1, 1]^n$ (difference of probability distributions)
2. $\sum_i \mathcal{G}_i = 0$ (conservation of probability mass)
3. $\|\mathcal{G}\|_1 = 2 \cdot d_{\text{TV}}(\alpha_{\text{actual}}, \alpha_{\text{expected}})$

### 2.3 Glitch Intensity Classification

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GLITCH INTENSITY TAXONOMY                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Intensity Range │ Classification │ Neural Interpretation          │
│   ────────────────┼────────────────┼──────────────────────────────  │
│   0.0 - 0.05      │ SILENT         │ Model perfectly predicts      │
│   0.05 - 0.15     │ SUBTLE         │ Minor drift, background adapt │
│   0.15 - 0.30     │ MODERATE       │ Notable deviation, attention  │
│   0.30 - 0.50     │ URGENT         │ Significant mismatch, action   │
│   0.50 - 0.75     │ CRITICAL       │ Major model failure, override  │
│   0.75 - 1.0      │ CATASTROPHIC   │ Complete prediction collapse   │
│                                                                     │
│   Note: Maximum possible intensity is 2.0 (complete reversal)     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. The Professional Hitter Model: Mathematical Formalization

### 3.1 The Professional Hitter Equation

The professional hitter's advantage can be formalized as an optimization:

$$\text{Pro} = \arg\min_{\theta} \mathbb{E}_{x \sim \text{game}}[\mathcal{G}(x)^2 \cdot \mathbb{1}_{\mathcal{G} > \tau}]$$

Where:
- $\theta$ = trained parameters
- $\mathcal{G}(x)$ = glitch signal for input $x$
- $\tau$ = attention threshold
- The hitter minimizes expected glitch intensity for "important" glitches

**Key Insight**: The professional doesn't minimize ALL glitches—only those above threshold. Small deviations are ignored (blinders).

### 3.2 Blinders as Attention Masking

**Definition 3.2.1 (Attention Blinders)**

Blinders are implemented as an attention mask $M$:

$$\alpha_{\text{blinded}} = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}} + M\right)$$

where $M_{ij} = -\infty$ for positions the agent should ignore.

**Implementation**:
```python
def apply_blinders(attention_scores, focus_positions):
    """
    Apply blinders to attention mechanism.
    
    The professional hitter's advantage is NOT more context,
    but LESS context - only what matters.
    """
    mask = torch.full_like(attention_scores, float('-inf'))
    mask[:, :, focus_positions] = 0  # Only these positions are visible
    
    return attention_scores + mask
```

### 3.3 Magnifying Glass as Attention Sharpening

**Definition 3.3.1 (Magnifying Glass Attention)**

The magnifying glass effect is achieved by temperature scaling:

$$\alpha_{\text{sharp}} = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k} \cdot \tau}\right)$$

where $\tau < 1$ sharpens attention (lower entropy, more focused).

**Mathematical Effect**:
- $\tau = 1$: Standard attention
- $\tau < 1$: Sharper focus (lower entropy)
- $\tau > 1$: Softer focus (higher entropy)

```python
def magnifying_glass_attention(Q, K, V, temperature=0.5):
    """
    Professional hitter's magnifying glass focus.
    
    Lower temperature = more focused attention = magnifying glass effect.
    """
    d_k = Q.shape[-1]
    scores = Q @ K.transpose(-2, -1) / (math.sqrt(d_k) * temperature)
    attention = F.softmax(scores, dim=-1)
    return attention @ V
```

### 3.4 Monitoring Mode: Standing By

**Definition 3.4.1 (Monitoring Mode)**

The monitoring mode is a state where:

1. **Primary Program**: Runs automatically (FFN, layers)
2. **Monitor**: Watches for glitches above threshold
3. **Action Trigger**: Only activates when glitch > $\tau$

$$\text{Action} = \begin{cases}
\text{AdjustTrigger} & \text{if } \|\mathcal{G}\| > \tau_{\text{urgent}} \\
\text{AdaptSimulation} & \text{if } \|\mathcal{G}\| > \tau_{\text{moderate}} \\
\text{StandBy} & \text{otherwise}
\end{cases}$$

---

## 4. Glitch Detection in Self-Origin Attention

### 4.1 The Self-Origin Query

In Self-Origin Attention, the query $Q_{\mathcal{O}}$ is fixed at the agent's position:

$$Q_{\mathcal{O}} = \text{embed}(\mathcal{O})$$

**Key Property**: The origin doesn't attend to itself. The agent's "I" is a fixed vantage point.

### 4.2 Glitch Computation (Structural, Not Calculated)

**Theorem 4.2.1 (Structural Glitch)**

The glitch intensity at origin $\mathcal{O}$ is:

$$\|\mathcal{G}_{\mathcal{O}}\|_1 = \sum_i \left|\frac{\exp(s_i^{\text{actual}})}{\sum_j \exp(s_j^{\text{actual}})} - \frac{\exp(s_i^{\text{expected}})}{\sum_j \exp(s_j^{\text{expected}})}\right|$$

where $s_i^{\text{actual}} = \frac{Q_{\mathcal{O}} \cdot k_i^{\text{actual}}}{\sqrt{d_k}}$ and $s_i^{\text{expected}} = \frac{Q_{\mathcal{O}} \cdot k_i^{\text{expected}}}{\sqrt{d_k}}$.

**Key Insight**: This is NOT a calculation done by the agent. It is the rate of change of the flow at position $\mathcal{O}$.

### 4.3 Glitch Direction Vector

The glitch has both magnitude and direction:

$$\vec{\mathcal{G}} = \alpha_{\text{actual}} - \alpha_{\text{expected}}$$

**Interpretation**:
- $\vec{\mathcal{G}}_i > 0$: Actual attention to position $i$ higher than expected
- $\vec{\mathcal{G}}_i < 0$: Actual attention to position $i$ lower than expected

The direction tells the agent WHERE the mismatch is occurring.

---

## 5. Glitch Detection Algorithm

### 5.1 Complete Glitch Detection Implementation

```python
import torch
import torch.nn.functional as F
import math
from dataclasses import dataclass
from typing import Tuple, Optional
from enum import Enum

class GlitchLevel(Enum):
    SILENT = 0
    SUBTLE = 1
    MODERATE = 2
    URGENT = 3
    CRITICAL = 4
    CATASTROPHIC = 5

@dataclass
class GlitchSignal:
    """Complete glitch signal structure"""
    intensity: float           # L1 distance
    direction: torch.Tensor    # Vector in attention space
    expected: torch.Tensor     # Expected attention
    actual: torch.Tensor       # Actual attention
    level: GlitchLevel         # Classification
    
    @property
    def total_variation(self) -> float:
        """Total variation distance (half of L1)"""
        return self.intensity / 2
    
    @property
    def kl_divergence(self) -> float:
        """KL(actual || expected) for additional analysis"""
        eps = 1e-9
        return float((self.actual * (torch.log(self.actual + eps) - 
                    torch.log(self.expected + eps))).sum())

class GlitchDetector:
    """
    Glitch Detection for Self-Origin Attention.
    
    Mathematical Foundation:
    - Glitch = α_actual - α_expected
    - Intensity = ||Glitch||₁
    - Direction = Glitch vector (where attention shifted)
    
    The glitch is STRUCTURAL - it emerges from the geometry
    of attention space, not from explicit calculation.
    """
    
    # Threshold constants (calibrated)
    THRESHOLDS = {
        GlitchLevel.SILENT: 0.05,
        GlitchLevel.SUBTLE: 0.15,
        GlitchLevel.MODERATE: 0.30,
        GlitchLevel.URGENT: 0.50,
        GlitchLevel.CRITICAL: 0.75,
        GlitchLevel.CATASTROPHIC: 2.0
    }
    
    @staticmethod
    def classify_glitch(intensity: float) -> GlitchLevel:
        """Classify glitch intensity into level"""
        for level in GlitchLevel:
            if intensity < GlitchDetector.THRESHOLDS[level]:
                return level
        return GlitchLevel.CATASTROPHIC
    
    @staticmethod
    def detect(
        Q_origin: torch.Tensor,
        K_actual: torch.Tensor,
        K_expected: torch.Tensor,
        d_k: int
    ) -> GlitchSignal:
        """
        Structural glitch detection.
        
        Args:
            Q_origin: Fixed query at origin [batch, d_model]
            K_actual: Actual keys from data [batch, seq_len, d_model]
            K_expected: Expected keys from simulation [batch, seq_len, d_model]
            d_k: Key dimension
            
        Returns:
            GlitchSignal with intensity, direction, and level
        """
        scale = math.sqrt(d_k)
        
        # Compute attention scores
        scores_actual = (Q_origin @ K_actual.transpose(-2, -1)) / scale
        scores_expected = (Q_origin @ K_expected.transpose(-2, -1)) / scale
        
        # Softmax attention
        alpha_actual = F.softmax(scores_actual, dim=-1)
        alpha_expected = F.softmax(scores_expected, dim=-1)
        
        # Glitch vector (structural)
        glitch_vector = alpha_actual - alpha_expected
        
        # Glitch intensity (L1 norm)
        intensity = float(glitch_vector.abs().sum(dim=-1).mean())
        
        # Classify
        level = GlitchDetector.classify_glitch(intensity)
        
        return GlitchSignal(
            intensity=intensity,
            direction=glitch_vector,
            expected=alpha_expected,
            actual=alpha_actual,
            level=level
        )
    
    @staticmethod
    def monitor(
        glitch: GlitchSignal,
        callback_urgent=None,
        callback_moderate=None,
        callback_subtle=None
    ) -> str:
        """
        Professional Hitter's Monitoring Mode.
        
        Stand by and out of the way of the program.
        Only act when glitch exceeds thresholds.
        
        Returns:
            Action string: "STAND_BY", "MONITOR", "ADAPT", "ADJUST", "OVERRIDE"
        """
        if glitch.level == GlitchLevel.CATASTROPHIC:
            return "OVERRIDE"
        
        elif glitch.level == GlitchLevel.CRITICAL:
            if callback_urgent:
                callback_urgent(glitch)
            return "OVERRIDE"
        
        elif glitch.level == GlitchLevel.URGENT:
            if callback_urgent:
                callback_urgent(glitch)
            return "ADJUST_TRIGGER"
        
        elif glitch.level == GlitchLevel.MODERATE:
            if callback_moderate:
                callback_moderate(glitch)
            return "ADAPT_SIMULATION"
        
        elif glitch.level == GlitchLevel.SUBTLE:
            if callback_subtle:
                callback_subtle(glitch)
            return "MONITOR"
        
        else:  # SILENT
            return "STAND_BY"  # Let the program run
```

### 5.2 Glitch-Aware Attention Layer

```python
class GlitchAwareAttention(nn.Module):
    """
    Attention layer with structural glitch detection.
    
    The Professional Hitter's Mind:
    1. Program runs automatically (attention + FFN)
    2. Mind monitors for glitches
    3. Only intervenes when glitch exceeds threshold
    """
    
    def __init__(
        self,
        d_model: int,
        n_heads: int,
        origin_position: int = 0,
        glitch_threshold_moderate: float = 0.15,
        glitch_threshold_urgent: float = 0.30
    ):
        super().__init__()
        
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_k = d_model // n_heads
        
        # Origin embedding (fixed position)
        self.origin_embed = nn.Parameter(
            torch.randn(1, d_model),
            requires_grad=False
        )
        
        # Projections
        self.W_k = nn.Linear(d_model, d_model, bias=False)
        self.W_v = nn.Linear(d_model, d_model, bias=False)
        self.W_o = nn.Linear(d_model, d_model, bias=False)
        
        # Glitch thresholds
        self.threshold_moderate = glitch_threshold_moderate
        self.threshold_urgent = glitch_threshold_urgent
        
        # Internal simulation state
        self.register_buffer('expected_keys', None)
        
    def forward(
        self,
        x: torch.Tensor,
        return_glitch: bool = True
    ) -> Tuple[torch.Tensor, Optional[GlitchSignal]]:
        """
        Forward with structural glitch detection.
        """
        batch_size, seq_len, _ = x.shape
        
        # Origin query (fixed)
        Q_origin = self.origin_embed.expand(batch_size, -1)
        
        # Keys and values
        K = self.W_k(x)
        V = self.W_v(x)
        
        # Multi-head reshape
        K = K.view(batch_size, seq_len, self.n_heads, self.d_k).transpose(1, 2)
        V = V.view(batch_size, seq_len, self.n_heads, self.d_k).transpose(1, 2)
        Q_origin = Q_origin.view(batch_size, self.n_heads, self.d_k)
        
        # Attention scores
        scores = torch.einsum('bhd,bnhd->bhnd', Q_origin, K) / math.sqrt(self.d_k)
        alpha_actual = F.softmax(scores, dim=-1)
        
        # Output
        output = torch.einsum('bhnd,bnhd->bhd', alpha_actual, V)
        output = output.reshape(batch_size, self.d_model)
        output = self.W_o(output)
        
        # Glitch detection (structural)
        glitch = None
        if return_glitch and self.expected_keys is not None:
            K_expected = self.expected_keys
            glitch = GlitchDetector.detect(
                Q_origin, 
                self.W_k(x),  # Actual keys
                K_expected,   # Expected keys
                self.d_k
            )
        
        return output, glitch
    
    def update_expectation(self, keys: torch.Tensor):
        """Update expected keys from internal simulation"""
        self.expected_keys = keys.detach()
```

---

## 6. Glitch Dynamics and Propagation

### 6.1 Glitch Through Layers

**Theorem 6.1.1 (Glitch Propagation)**

Let $\mathcal{G}_\ell$ be the glitch at layer $\ell$. The glitch propagates as:

$$\mathcal{G}_{\ell+1} = f_\ell(\mathcal{G}_\ell) + \text{residual}$$

where $f_\ell$ is the layer transformation.

**Key Insight**: Glitches can amplify or dampen through layers. Deep networks may have complex glitch dynamics.

### 6.2 Glitch Stability Condition

**Theorem 6.1.2 (Glitch Stability)**

For glitch stability through depth:

$$\|\mathcal{G}_{\ell+1}\| \leq \|\mathcal{G}_\ell\|$$

requires:

$$\|\nabla f_\ell\| \leq 1$$

This is related to gradient stability in deep networks.

### 6.3 Certainty-Based Glitch Management

**Definition 6.3.1 (Certainty)**

Certainty is the inverse of attention entropy:

$$c = 1 - \frac{H(\alpha)}{H_{\max}} = 1 - \frac{-\sum_i \alpha_i \log \alpha_i}{\log n}$$

**Glitch-Certainty Relationship**:
- High certainty + High glitch = Model confident but wrong → URGENT
- Low certainty + High glitch = Model uncertain and wrong → ADAPT
- High certainty + Low glitch = Model confident and correct → STAND_BY
- Low certainty + Low glitch = Model uncertain but close → MONITOR

```python
def certainty_glitch_action(certainty: float, glitch_intensity: float) -> str:
    """
    Combined certainty-glitch decision matrix.
    
    Professional Hitter Logic:
    - When confident and right: coast on program
    - When confident and wrong: urgent action
    - When uncertain: gather more info
    """
    if certainty > 0.7:
        if glitch_intensity > 0.3:
            return "OVERRIDE"  # Confident but wrong - critical!
        elif glitch_intensity > 0.15:
            return "ADJUST_TRIGGER"  # Confident, minor mismatch
        else:
            return "STAND_BY"  # Confident and right
    
    elif certainty > 0.4:
        if glitch_intensity > 0.3:
            return "ADAPT_SIMULATION"  # Uncertain, significant mismatch
        else:
            return "MONITOR"  # Uncertain, minor mismatch
    
    else:  # Low certainty
        if glitch_intensity > 0.3:
            return "ADAPT_SIMULATION"  # Very uncertain, bad mismatch
        else:
            return "MONITOR"  # Very uncertain but close
```

---

## 7. Experimental Glitch Analysis

### 7.1 Glitch Statistics

```python
class GlitchStatistics:
    """
    Collect and analyze glitch statistics during training/inference.
    
    Provides insights into:
    - Glitch distribution over time
    - Certainty-glitch correlation
    - Optimal threshold calibration
    """
    
    def __init__(self):
        self.glitch_history = []
        self.certainty_history = []
        self.action_history = []
        
    def record(self, glitch: GlitchSignal, certainty: float, action: str):
        self.glitch_history.append(glitch.intensity)
        self.certainty_history.append(certainty)
        self.action_history.append(action)
    
    def get_statistics(self) -> dict:
        glitches = torch.tensor(self.glitch_history)
        certainties = torch.tensor(self.certainty_history)
        
        return {
            'mean_glitch': float(glitches.mean()),
            'std_glitch': float(glitches.std()),
            'mean_certainty': float(certainties.mean()),
            'glitch_certainty_correlation': float(
                torch.corrcoef(torch.stack([glitches, certainties]))[0, 1]
            ),
            'action_distribution': {
                action: self.action_history.count(action) 
                for action in set(self.action_history)
            }
        }
    
    def suggest_thresholds(self) -> dict:
        """
        Suggest optimal thresholds based on observed glitch distribution.
        
        Uses quantile-based calibration:
        - SUBTLE: 25th percentile of non-zero glitches
        - MODERATE: 50th percentile
        - URGENT: 75th percentile
        """
        glitches = torch.tensor(self.glitch_history)
        non_zero = glitches[glitches > 0]
        
        if len(non_zero) == 0:
            return self.THRESHOLDS
        
        return {
            'subtle': float(torch.quantile(non_zero, 0.25)),
            'moderate': float(torch.quantile(non_zero, 0.50)),
            'urgent': float(torch.quantile(non_zero, 0.75)),
            'critical': float(torch.quantile(non_zero, 0.90))
        }
```

### 7.2 Glitch Visualization

```python
def visualize_glitch(glitch: GlitchSignal, positions: list):
    """
    Visualize glitch in attention space.
    
    Shows:
    - Expected vs Actual attention
    - Glitch direction and magnitude
    - Highlighted positions of significant deviation
    """
    import matplotlib.pyplot as plt
    
    fig, axes = plt.subplots(1, 3, figsize=(15, 4))
    
    # Expected attention
    axes[0].bar(positions, glitch.expected.squeeze().cpu().numpy())
    axes[0].set_title('Expected Attention')
    axes[0].set_xlabel('Position')
    axes[0].set_ylabel('Attention Weight')
    
    # Actual attention
    axes[1].bar(positions, glitch.actual.squeeze().cpu().numpy())
    axes[1].set_title('Actual Attention')
    axes[1].set_xlabel('Position')
    
    # Glitch vector
    glitch_np = glitch.direction.squeeze().cpu().numpy()
    colors = ['green' if g > 0 else 'red' for g in glitch_np]
    axes[2].bar(positions, glitch_np, color=colors)
    axes[2].set_title(f'Glitch Vector (Intensity: {glitch.intensity:.3f})')
    axes[2].set_xlabel('Position')
    axes[2].axhline(y=0, color='black', linestyle='-', linewidth=0.5)
    
    plt.tight_layout()
    return fig
```

---

## 8. Connection to POLLN Spreadsheet Cells

### 8.1 Cell as Origin Position

**Mapping**:
- Spreadsheet Cell → Self-Origin Position
- Cell Reference (e.g., "A1") → Origin Coordinate $\mathcal{O}$
- Cell Value → Flow at Position $\mathcal{F}(\mathcal{O}, v)$
- Cell Change Rate → Glitch Signal

### 8.2 Multi-Cell Glitch Network

```
┌─────────────────────────────────────────────────────────────────────┐
│              POLLN CELL GLITCH NETWORK                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Each cell is an agent at origin position:                        │
│                                                                     │
│   ┌─────┬─────┬─────┐                                             │
│   │ A1  │ B1  │ C1  │   Each cell:                                │
│   │ 𝒪_1 │ 𝒪_2 │ 𝒪_3 │   - Has its own origin position             │
│   │ G₁  │ G₂  │ G₃  │   - Monitors for glitches                   │
│   ├─────┼─────┼─────┤   - Can coordinate with neighbors           │
│   │ A2  │ B2  │ C2  │                                             │
│   │ 𝒪_4 │ 𝒪_5 │ 𝒪_6 │   Glitch propagation:                       │
│   │ G₄  │ G₅  │ G₆  │   G_i → affects → neighbors                 │
│   └─────┴─────┴─────┘                                             │
│                                                                     │
│   =AGENT("task", A1:C2)                                            │
│   → Creates multi-agent attention                                   │
│   → Each agent at their origin                                      │
│   → Glitches coordinate through tensor structure                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.3 Implementation

```python
class CellAgent:
    """
    POLLN Cell Agent with Self-Origin Tensor.
    
    The cell IS the agent's visual "I" location.
    """
    
    def __init__(self, cell_ref: str, d_model: int):
        self.cell_ref = cell_ref
        self.position = self._parse_position(cell_ref)
        self.origin_tensor = GlitchAwareAttention(d_model, n_heads=4)
        self.connections = []
        
    def _parse_position(self, ref: str) -> tuple:
        """A1 -> (0, 0), B2 -> (1, 1)"""
        col = ord(ref[0].upper()) - ord('A')
        row = int(ref[1:]) - 1
        return (row, col)
    
    def connect(self, other: 'CellAgent'):
        """Connect to another cell for monitoring"""
        self.connections.append(other)
    
    def monitor(self) -> list:
        """Monitor all connected cells for glitches"""
        glitches = []
        for cell in self.connections:
            _, glitch = self.origin_tensor(
                cell.get_state(),
                return_glitch=True
            )
            if glitch:
                glitches.append((cell.cell_ref, glitch))
        return glitches
    
    def get_state(self) -> torch.Tensor:
        """Get state for other agents to attend to"""
        return self.origin_tensor.origin_embed
```

---

## 9. Summary: The Glitch IS the Signal

### 9.1 Key Mathematical Results

1. **Glitch Definition**: $\mathcal{G} = \alpha_{\text{actual}} - \alpha_{\text{expected}}$
2. **Glitch Intensity**: $\|\mathcal{G}\|_1 = 2 \cdot d_{\text{TV}}(\alpha_{\text{actual}}, \alpha_{\text{expected}})$
3. **Glitch Bounds**: $0 \leq \|\mathcal{G}\|_1 \leq 2$
4. **Structural Computation**: Glitch is rate of change at origin, not calculated

### 9.2 Professional Hitter's Mathematics

| Concept | Traditional | Self-Origin |
|---------|-------------|-------------|
| **Context** | Maximize | Minimize (blinders) |
| **Focus** | Distributed | Concentrated (magnifying glass) |
| **Computation** | Explicit calculation | Structural rate of change |
| **Error Signal** | Computed error | Perceived glitch |
| **Action** | Always processing | Only when glitch > threshold |

### 9.3 Implementation Principles

1. **Agent IS Position**: No moving, no computation at agent
2. **Glitch IS Signal**: Rate of change at origin = error
3. **Structure IS Computation**: Geometry provides meaning
4. **Monitor = Stand By**: Only act when threshold exceeded

---

*Document: Glitch Detection Theory*  
*Task ID: 2-b*  
*Core Principle: "The glitch is the signal."*
