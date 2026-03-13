# Implementation

## 3.1 Core Components

### 3.1.1 Gumbel-Softmax Sampler

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class GumbelSoftmaxSampler(nn.Module):
    """
    Differentiable stochastic selection using Gumbel-Softmax.
    """

    def __init__(self, temperature: float = 1.0, hard: bool = False):
        super().__init__()
        self.temperature = temperature
        self.hard = hard

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        """
        Sample from categorical distribution using Gumbel-Softmax.

        Args:
            logits: Unnormalized log probabilities [batch, num_classes]

        Returns:
            One-hot samples [batch, num_classes]
        """
        # Sample Gumbel noise
        gumbel_noise = -torch.log(-torch.log(torch.rand_like(logits)))

        # Add noise to logits
        noisy_logits = (logits + gumbel_noise) / self.temperature

        # Softmax
        samples = F.softmax(noisy_logits, dim=-1)

        if self.hard:
            # Straight-through estimator
            indices = samples.argmax(dim=-1)
            hard_samples = F.one_hot(indices, num_classes=logits.size(-1))
            samples = hard_samples - samples.detach() + samples

        return samples

    def set_temperature(self, temperature: float):
        """Update temperature for annealing."""
        self.temperature = temperature
```

### 3.1.2 Temperature Scheduler

```python
class TemperatureScheduler:
    """
    Anneals temperature from initial to minimum value.
    """

    def __init__(
        self,
        initial_temp: float = 1.0,
        min_temp: float = 0.1,
        decay_rate: float = 0.01
    ):
        self.initial_temp = initial_temp
        self.min_temp = min_temp
        self.decay_rate = decay_rate
        self.current_temp = initial_temp
        self.step_count = 0

    def step(self) -> float:
        """Get current temperature and advance scheduler."""
        temp = self.get_temperature()
        self.step_count += 1
        return temp

    def get_temperature(self) -> float:
        """Get current temperature without advancing."""
        return max(
            self.min_temp,
            self.initial_temp * np.exp(-self.decay_rate * self.step_count)
        )

    def reset(self):
        """Reset to initial state."""
        self.step_count = 0
        self.current_temp = self.initial_temp
```

## 3.2 Stochastic Selector

### 3.2.1 Neural Stochastic Selector

```python
class StochasticSelector(nn.Module):
    """
    Neural network with stochastic action selection.
    """

    def __init__(
        self,
        input_dim: int,
        num_options: int,
        hidden_dim: int = 128,
        initial_temp: float = 1.0
    ):
        super().__init__()

        # Scoring network
        self.score_net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, num_options)
        )

        # Stochastic sampler
        self.sampler = GumbelSoftmaxSampler(temperature=initial_temp)

        # Temperature scheduler
        self.temp_scheduler = TemperatureScheduler(initial_temp=initial_temp)

    def forward(self, x: torch.Tensor) -> tuple:
        """
        Select option stochastically.

        Returns:
            (selected_option, probabilities, scores)
        """
        # Compute scores
        scores = self.score_net(x)

        # Update temperature
        temp = self.temp_scheduler.step()
        self.sampler.set_temperature(temp)

        # Sample
        probs = self.sampler(scores)

        # Select
        selected = probs.argmax(dim=-1)

        return selected, probs, scores

    def get_diversity(self, probs: torch.Tensor) -> float:
        """Compute entropy-based diversity metric."""
        entropy = -(probs * torch.log(probs + 1e-10)).sum(dim=-1)
        max_entropy = np.log(probs.size(-1))
        return (entropy / max_entropy).mean().item()
```

### 3.2.2 Ensemble Stochastic Selector

```python
class EnsembleStochasticSelector(nn.Module):
    """
    Ensemble of stochastic selectors for robust decision making.
    """

    def __init__(
        self,
        input_dim: int,
        num_options: int,
        num_ensemble: int = 5,
        **kwargs
    ):
        super().__init__()

        self.selectors = nn.ModuleList([
            StochasticSelector(input_dim, num_options, **kwargs)
            for _ in range(num_ensemble)
        ])

        self.num_ensemble = num_ensemble

    def forward(self, x: torch.Tensor) -> tuple:
        """Aggregate selections from ensemble."""
        all_probs = []

        for selector in self.selectors:
            _, probs, _ = selector(x)
            all_probs.append(probs)

        # Average probabilities
        avg_probs = torch.stack(all_probs).mean(dim=0)

        # Select based on aggregated probabilities
        selected = avg_probs.argmax(dim=-1)

        return selected, avg_probs
```

## 3.3 Diversity Tracking

### 3.3.1 Diversity Monitor

```python
class DiversityMonitor:
    """
    Tracks solution diversity over time.
    """

    def __init__(self, history_size: int = 1000):
        self.history_size = history_size
        self.selection_history = []
        self.diversity_history = []

    def record(self, selection: int, probabilities: np.ndarray):
        """Record a selection and update diversity metrics."""
        self.selection_history.append(selection)
        if len(self.selection_history) > self.history_size:
            self.selection_history.pop(0)

        # Compute diversity
        diversity = self._compute_diversity()
        self.diversity_history.append(diversity)

    def _compute_diversity(self) -> float:
        """Compute current diversity from selection history."""
        if not self.selection_history:
            return 1.0

        # Count selections
        counts = {}
        for s in self.selection_history:
            counts[s] = counts.get(s, 0) + 1

        # Compute entropy
        total = len(self.selection_history)
        probs = [c / total for c in counts.values()]
        entropy = -sum(p * np.log(p + 1e-10) for p in probs)

        # Normalize
        max_entropy = np.log(len(counts)) if counts else 1.0
        return entropy / max_entropy if max_entropy > 0 else 0.0

    def get_trend(self) -> str:
        """Get diversity trend."""
        if len(self.diversity_history) < 10:
            return "insufficient_data"

        recent = self.diversity_history[-10:]
        earlier = self.diversity_history[-20:-10] if len(self.diversity_history) >= 20 else recent

        if np.mean(recent) > np.mean(earlier) + 0.05:
            return "increasing"
        elif np.mean(recent) < np.mean(earlier) - 0.05:
            return "decreasing"
        else:
            return "stable"
```

## 3.4 Recovery Tracking

### 3.4.1 Shift Detector

```python
class DistributionShiftDetector:
    """
    Detects distribution shifts in input data.
    """

    def __init__(self, window_size: int = 100, threshold: float = 2.0):
        self.window_size = window_size
        self.threshold = threshold
        self.baseline = None
        self.recent_window = []

    def update(self, x: np.ndarray) -> bool:
        """
        Update detector with new sample.
        Returns True if shift detected.
        """
        self.recent_window.append(x)
        if len(self.recent_window) > self.window_size:
            self.recent_window.pop(0)

        if len(self.recent_window) < self.window_size:
            return False

        # Compute statistics
        current_mean = np.mean(self.recent_window, axis=0)
        current_std = np.std(self.recent_window, axis=0)

        if self.baseline is None:
            self.baseline = (current_mean, current_std)
            return False

        # Compute shift score
        baseline_mean, baseline_std = self.baseline
        shift_score = np.abs(current_mean - baseline_mean) / (baseline_std + 1e-10)
        shift_detected = np.any(shift_score > self.threshold)

        if shift_detected:
            # Update baseline after shift
            self.baseline = (current_mean, current_std)

        return shift_detected
```

### 3.4.2 Recovery Tracker

```python
class RecoveryTracker:
    """
    Tracks recovery time after distribution shifts.
    """

    def __init__(self, performance_threshold: float = 0.9):
        self.performance_threshold = performance_threshold
        self.shift_times = []
        self.recovery_times = []
        self.pre_shift_performance = None
        self.in_recovery = False
        self.recovery_start = None

    def record_shift(self, pre_shift_performance: float, time: int):
        """Record a distribution shift."""
        self.shift_times.append(time)
        self.pre_shift_performance = pre_shift_performance
        self.in_recovery = True
        self.recovery_start = time

    def record_performance(self, performance: float, time: int):
        """Record performance and check for recovery."""
        if not self.in_recovery:
            return

        if performance >= self.pre_shift_performance * self.performance_threshold:
            recovery_time = time - self.recovery_start
            self.recovery_times.append(recovery_time)
            self.in_recovery = False

    def get_average_recovery_time(self) -> float:
        """Get average recovery time across all shifts."""
        if not self.recovery_times:
            return 0.0
        return np.mean(self.recovery_times)
```

## 3.5 Complete System

### 3.5.1 Stochastic Decision System

```python
class StochasticDecisionSystem:
    """
    Complete system with stochastic selection, diversity tracking,
    and recovery monitoring.
    """

    def __init__(
        self,
        input_dim: int,
        num_options: int,
        **kwargs
    ):
        self.selector = StochasticSelector(input_dim, num_options, **kwargs)
        self.diversity_monitor = DiversityMonitor()
        self.shift_detector = DistributionShiftDetector()
        self.recovery_tracker = RecoveryTracker()

    def decide(self, observation: np.ndarray) -> tuple:
        """
        Make a stochastic decision with full tracking.
        """
        # Convert to tensor
        x = torch.FloatTensor(observation).unsqueeze(0)

        # Check for distribution shift
        shift_detected = self.shift_detector.update(observation)

        # Get selection
        selected, probs, scores = self.selector(x)

        # Track diversity
        diversity = self.selector.get_diversity(probs)
        self.diversity_monitor.record(selected.item(), probs.detach().numpy())

        return selected.item(), probs, {
            'diversity': diversity,
            'shift_detected': shift_detected,
            'temperature': self.selector.sampler.temperature
        }
```

## 3.6 Summary

The implementation provides:
1. **Gumbel-Softmax Sampler**: Differentiable stochastic selection
2. **Temperature Scheduler**: Annealing for exploration-exploitation
3. **Diversity Monitor**: Track solution variety
4. **Shift Detector**: Identify distribution changes
5. **Recovery Tracker**: Measure adaptation speed

---

*Part of the SuperInstance Mathematical Framework*
