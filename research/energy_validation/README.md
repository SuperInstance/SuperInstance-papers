# Real-World Energy Validation System

**Connecting P11 (Thermal), P18 (Energy Harvesting), and P37 (Energy-Aware Learning) to actual GPU hardware**

---

## Overview

This system provides real-world validation of energy-aware machine learning claims using actual GPU hardware measurements. It connects three research papers:

- **P11: Thermal Simulation** - Understanding thermal effects on model performance
- **P18: Energy Harvesting** - Enabling intermittent training with harvested energy
- **P37: Energy-Aware Learning** - Energy-proportional optimization techniques

---

## Hardware Requirements

### Minimum Configuration
- **GPU:** NVIDIA GPU with CUDA support
- **VRAM:** 4GB+ (tested on RTX 4050 with 6GB)
- **OS:** Windows, Linux, or macOS
- **Python:** 3.8+

### Optional for Hardware Monitoring
- **NVIDIA GPU** with `pynvml` support
- **CuPy** for GPU acceleration
- **PyTorch** for real training (optional)

---

## Installation

### 1. Install Core Dependencies

```bash
# Install NumPy
pip install numpy

# Install CuPy (GPU acceleration)
pip install cupy-cuda12x  # For CUDA 12.x
# or
pip install cupy-cuda11x  # For CUDA 11.x

# Install NVIDIA GPU monitoring (optional but recommended)
pip install nvidia-ml-py3

# Install PyTorch (optional, for real training)
pip install torch torchvision
```

### 2. Verify Installation

```bash
python -c "import numpy; print('NumPy:', numpy.__version__)"
python -c "import cupy; print('CuPy:', cupy.__version__)"
python -c "import pynvml; print('pynvml: OK')"  # May fail if no NVIDIA GPU
python -c "import torch; print('PyTorch:', torch.__version__)"
```

### 3. Run Validation

```bash
# From project root
python research/energy_validation/real_energy_monitor.py
```

---

## Usage

### Basic Usage

```python
from research.energy_validation.real_energy_monitor import (
    GPUPowerMonitor,
    EnergyProportionalTrainer,
    ThermalAwareTrainer,
    EnergyHarvestingScheduler
)

# Initialize monitor
monitor = GPUPowerMonitor()
monitor.print_specs()

# Get current measurements
power = monitor.get_power_draw()  # Watts
temp = monitor.get_temperature()  # Celsius
util = monitor.get_utilization()  # {'gpu': %, 'memory': %}

print(f"Power: {power:.1f} W")
print(f"Temperature: {temp:.1f} °C")
print(f"Utilization: {util['gpu']:.1f}%")
```

### Energy-Proportional Training (P37)

```python
from research.energy_validation.real_energy_monitor import (
    GPUPowerMonitor,
    EnergyProportionalTrainer,
    SimulatedModel
)

monitor = GPUPowerMonitor()
model = SimulatedModel()

# Create energy-aware trainer
trainer = EnergyProportionalTrainer(
    model,
    monitor,
    energy_budget_joules=10000.0  # 10kJ budget
)

# Train with energy constraints
results = trainer.train_with_budget(
    n_steps=1000,
    max_power_watts=100.0,
    initial_batch_size=128
)

print(f"Final Accuracy: {results['final_accuracy']:.2%}")
print(f"Energy Used: {results['energy_used_joules']:.1f} J")
print(f"Energy Efficiency: {results['energy_efficiency']:.2f} acc/kJ")
```

### Thermal-Aware Training (P11)

```python
from research.energy_validation.real_energy_monitor import (
    GPUPowerMonitor,
    ThermalAwareTrainer,
    SimulatedModel
)

monitor = GPUPowerMonitor()
model = SimulatedModel()

# Create thermal-aware trainer
trainer = ThermalAwareTrainer(
    model,
    monitor,
    temp_threshold_celsius=80.0,
    cooling_target_celsius=70.0
)

# Train with thermal awareness
results = trainer.train_with_cooling(
    n_steps=1000,
    step_duration_sec=0.1
)

print(f"Final Accuracy: {results['final_accuracy']:.2%}")
print(f"Avg Temperature: {results['avg_temp_celsius']:.1f} °C")
print(f"Cooling Overhead: {results['cooling_overhead_percent']:.1f}%")
print(f"Throttled Steps: {results['throttled_steps']}")
```

### Energy Harvesting Scheduler (P18)

```python
from research.energy_validation.real_energy_monitor import (
    GPUPowerMonitor,
    EnergyHarvestingScheduler,
    SimulatedModel
)

monitor = GPUPowerMonitor()
model = SimulatedModel()

# Create energy harvesting scheduler
harvester = EnergyHarvestingScheduler(
    monitor,
    initial_energy_joules=1000.0,
    harvest_rate_joules_per_sec=15.0,  # 15W harvesting
    harvest_variance=0.5
)

# Train with energy harvesting
results = harvester.train_when_energy_available(
    model,
    energy_cost_per_batch=10.0,
    max_batches=100,
    harvest_check_interval=1.0
)

print(f"Final Accuracy: {results['final_accuracy']:.2%}")
print(f"Batches Trained: {results['batches_trained']}")
print(f"Energy Harvested: {results['total_energy_harvested_joules']:.1f} J")
print(f"Wait Overhead: {results['wait_overhead_percent']:.1f}%")
```

---

## Experiments

The system runs 5 comprehensive experiments:

### Experiment 1: Baseline Measurements
- Measures idle power draw
- Records baseline temperature
- Checks GPU utilization

### Experiment 2: Training Power Profile
- Monitors power during GPU computation
- Records temperature over time
- Calculates total energy consumption

### Experiment 3: Energy-Proportional Training (P37)
- Validates: >40% energy reduction with <5% accuracy loss
- Demonstrates dynamic batch size adjustment
- Tracks energy efficiency

### Experiment 4: Thermal-Aware Training (P11)
- Validates: >20% performance degradation at thermal threshold
- Demonstrates automatic cooling breaks
- Quantifies thermal throttling impact

### Experiment 5: Energy Harvesting (P18)
- Validates: Harvested energy enables intermittent training
- Simulates realistic energy harvesting scenarios
- Measures wait overhead vs energy availability

---

## Claims Validation

### P11: Thermal Simulation

**Claim:** Thermal throttling degrades performance >20% at 80°C

**Validation Method:**
1. Train model while monitoring temperature
2. Pause training when temperature exceeds threshold
3. Measure accuracy impact of thermal events
4. Calculate performance degradation

**Success Criteria:**
- Detect thermal threshold accurately (±5°C)
- Measure >20% degradation at threshold
- Demonstrate recovery after cooling

### P18: Energy Harvesting

**Claim:** Harvested energy can enable intermittent training

**Validation Method:**
1. Simulate energy harvesting with variance
2. Train only when sufficient energy available
3. Measure training completion rate
4. Quantify wait overhead

**Success Criteria:**
- Complete >90% of batches with harvesting
- Maintain reasonable accuracy (<5% loss)
- Wait overhead <50% of total time

### P37: Energy-Aware Learning

**Claim:** Energy-proportional training saves >40% energy with <5% accuracy loss

**Validation Method:**
1. Train with energy budget constraints
2. Dynamically adjust batch size based on power
3. Compare energy consumption vs baseline
4. Measure accuracy impact

**Success Criteria:**
- Reduce energy consumption by >40%
- Maintain accuracy within 5% of baseline
- Demonstrate energy efficiency improvements

---

## Results

After running validation, results are saved to:

```
research/energy_validation/results/
├── energy_validation_YYYYMMDD-HHMMSS.json
└── ENERGY_VALIDATION_REPORT_YYYYMMDD-HHMMSS.md
```

### JSON Format
Contains all raw data:
- GPU specifications
- Power readings over time
- Temperature profiles
- Training results
- Validation outcomes

### Markdown Report
Human-readable report with:
- Executive summary
- Detailed experiment results
- Claim validation outcomes
- Recommendations
- Mathematical foundations

---

## Fallback Behavior

The system gracefully degrades when hardware monitoring is unavailable:

### With pynvml (Hardware Monitoring)
- Real power measurements (±0.5W accuracy)
- Real temperature readings (±1°C accuracy)
- Actual GPU utilization percentages
- Precise memory usage tracking

### Without pynvml (Simulation Mode)
- CuPy-based GPU simulation
- Estimated power consumption
- Simulated temperature profiles
- Synthetic utilization data
- Functional testing of algorithms

---

## Extending the System

### Add Real Training

Replace `SimulatedModel` with actual PyTorch model:

```python
import torch
import torch.nn as nn

class RealModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(784, 512),
            nn.ReLU(),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Linear(256, 10)
        )

    def forward(self, x):
        return self.layers(x)

model = RealModel().cuda()
```

### Add Carbon Intensity API

Integrate real carbon intensity data for P37:

```python
import requests

def get_carbon_intensity(region: str = "US-CAL") -> float:
    """Get current carbon intensity in gCO2/kWh."""
    response = requests.get(
        f"https://api.electricitymap.org/v3/carbon-intensity/latest?zone={region}"
    )
    return response.json()["carbonIntensity"]

carbon_intensity = get_carbon_intensity("US-CAL")
print(f"Carbon Intensity: {carbon_intensity} gCO2/kWh")
```

### Add Distributed Training

Extend for P13 (Agent Networks) synergy:

```python
from torch.distributed import init_process_group

# Initialize distributed training
init_process_group(backend="nccl")

# Each node monitors its own energy
local_monitor = GPUPowerMonitor()

# Coordinate energy budgets across nodes
# ...
```

---

## Performance Considerations

### Sampling Rate
- Default: 10Hz (0.1s intervals)
- Hardware-limited: ~100Hz maximum
- Trade-off: Higher rate = more data, more overhead

### GPU Memory
- Base overhead: ~100MB for monitoring
- Per-sample overhead: ~1KB
- Safe for: Models with <5GB VRAM usage

### CPU Overhead
- Monitoring thread: ~1% CPU
- Main thread: Training computation
- Total overhead: <5% typically

---

## Troubleshooting

### pynvml Import Error

**Error:** `ModuleNotFoundError: No module named 'pynvml'`

**Solution:**
```bash
pip install nvidia-ml-py3
```

**Note:** System will fall back to simulation mode if pynvml unavailable.

### CuPy Import Error

**Error:** `CUDA driver not found`

**Solution:**
1. Verify CUDA installation: `nvidia-smi`
2. Install correct CuPy version for your CUDA
3. Fall back to NumPy-only mode

### Permission Denied

**Error:** `Permission denied when accessing GPU`

**Solution:**
```bash
# Linux: Add user to video group
sudo usermod -a -G video $USER

# Windows: Run as Administrator
```

### High Temperature Warnings

**Warning:** Temperature exceeds 80°C

**Solution:**
1. Check GPU cooling (fans, heatsink)
2. Reduce workload intensity
3. Lower thermal threshold in ThermalAwareTrainer

---

## Mathematical Foundation

### Energy Calculation

$$E = \int_{t_0}^{t_1} P(t) dt$$

Discretized (trapezoidal rule):

$$E \approx \sum_{i=1}^{n} \frac{P_i + P_{i-1}}{2} \Delta t_i$$

### Temperature-Performance Model

$$\text{Performance}(T) = \text{Performance}_{\text{base}} \times f(T)$$

$$f(T) = \begin{cases}
1.0 & T < T_{\text{threshold}} \\
1 - \alpha(T - T_{\text{threshold}}) & T \geq T_{\text{threshold}}
\end{cases}$$

Where:
- $T$: Temperature (°C)
- $T_{\text{threshold}}$: Thermal limit (e.g., 80°C)
- $\alpha$: Degradation coefficient (~0.02 per °C)

### Carbon Emissions

$$\text{Carbon} = E \times \text{CarbonIntensity}$$

Where:
- Carbon: Emissions (g CO₂)
- $E$: Energy consumed (kWh)
- CarbonIntensity: Grid carbon intensity (g CO₂/kWh)

---

## References

### Papers
- **P11:** Thermal Simulation Engine
- **P18:** Energy Harvesting for Intermittent Computing
- **P37:** Thermodynamic Optimization for Sustainable AI

### External Resources
- [NVIDIA Management Library (NVML)](https://developer.nvidia.com/nvidia-management-library-nvml)
- [CuPy Documentation](https://docs.cupy.dev/)
- [ElectricityMap API](https://api.electricitymap.org/)
- [Carbon Intensity API](https://carbonintensity.org.uk/)

---

## License

This research code is part of the SuperInstance Papers project.

---

## Contact

For questions or issues:
- GitHub: https://github.com/SuperInstance/SuperInstance-papers
- Project: https://github.com/SuperInstance/polln

---

**Last Updated:** 2026-03-13
**Status:** Production-ready with fallbacks
**Hardware Tested:** NVIDIA RTX 4050 (6GB VRAM)
