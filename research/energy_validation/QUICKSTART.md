# Quick Start Guide

## Installation

```bash
# Install core dependencies
pip install numpy cupy-cuda12x nvidia-ml-py3

# Or if you have CUDA 11.x
pip install numpy cupy-cuda11x nvidia-ml-py3
```

## Run Validation

```bash
# From project root
python research/energy_validation/real_energy_monitor.py
```

## Expected Output

```
======================================================================
Real-World Energy Validation System
P11 (Thermal) + P18 (Energy Harvesting) + P37 (Energy-Aware)
======================================================================

======================================================================
GPU Specifications
======================================================================
Name: NVIDIA RTX 4050
Total Memory: 6144 MB
Power Limit: 115.0 W
Temperature Limit: 87.0 °C
CUDA Version: 13.1.1
Driver Version: 528.02
Mode: SIMULATION
======================================================================

======================================================================
EXPERIMENT 1: Baseline Power Draw
======================================================================
Idle Power: 35.2 W
Idle Temperature: 42.1 °C
GPU Utilization: 0.0%
Memory Usage: 0 / 6144 MB

======================================================================
EXPERIMENT 2: Training Power Profile
======================================================================
[GPU Simulation] Using CuPy for GPU simulation
[GPU Simulation] Completed 47 iterations in 20s
Average Power: 68.5 W
Max Power: 82.3 W
Average Temperature: 58.2 °C
Max Temperature: 65.8 °C
Total Energy: 1370.5 J (0.3807 Wh)
Duration: 20.0 s

... (more experiments) ...

======================================================================
VALIDATION SUMMARY
======================================================================

Hardware: NVIDIA RTX 4050
Monitoring Mode: SIMULATION

Claims Validated:
P11 (Thermal): Thermal degradation at threshold - PASS
P18 (Energy Harvesting): Intermittent training feasible - PASS
P37 (Energy-Aware): Energy-proportional learning - PASS

Environmental Impact:
Total Energy Used: 0.000381 kWh
Carbon Emissions: 0.15 g CO2

======================================================================
Results saved to:
  JSON: C:/Users/casey/polln/research/energy_validation/results/energy_validation_20260313-153000.json
  Markdown: C:/Users/casey/polln/research/energy_validation/results/ENERGY_VALIDATION_REPORT_20260313-153000.md
======================================================================
```

## Troubleshooting

### pynvml not available
The system will automatically fall back to simulation mode. You'll see:
```
Mode: SIMULATION
```

For real hardware monitoring:
```bash
pip install nvidia-ml-py3
```

### CuPy CUDA errors
Ensure you have the right CuPy version for your CUDA:
```bash
# Check CUDA version
nvidia-smi

# Install matching CuPy
pip install cupy-cuda12x  # For CUDA 12.x
pip install cupy-cuda11x  # For CUDA 11.x
```

### No NVIDIA GPU
The system will work in simulation mode using CuPy or NumPy.

## Next Steps

1. **Review Results**: Check the generated markdown report
2. **Install pynvml**: Get real hardware measurements
3. **Integrate Real Training**: Replace SimulatedModel with PyTorch models
4. **Add Carbon API**: Enable real carbon intensity tracking

See [README.md](README.md) for detailed documentation.
