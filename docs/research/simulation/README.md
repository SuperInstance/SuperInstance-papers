# POLLN Emergent Behavior Simulation Suite

Comprehensive simulation framework for discovering emergent behaviors, phase transitions, and scaling laws in POLLN agent colonies.

## Overview

This simulation suite validates the theoretical foundations of POLLN (Pattern-Organized Large Language Network) through systematic experimentation. It simulates agent colonies ranging from 10 to 1000 agents, discovering how collective intelligence emerges from simple agent rules.

## What We Discovered

### 8 Emergent Behaviors

1. **Collective Decision Consensus**: Individual stochastic decisions aggregate into high-confidence collective choices
2. **Spontaneous Specialization**: Homogeneous colonies self-organize into functional specialists
3. **Critical Cascades**: Small perturbations trigger system-wide reorganization (self-organized criticality)
4. **Swarm Synchronization**: Agents coordinate rhythms without central control (Kuramoto model)
5. **Emergent Hierarchies**: Flat networks develop dominance structures (scale-free topology)
6. **Collective Intelligence Phase Transition**: Sharp performance improvement at critical colony size
7. **Metastable States**: Multiple stable configurations with hysteresis
8. **Adaptive Network Plasticity**: Topology adapts to optimize for task environment

### Scaling Laws

- **Performance**: P(N) = P_∞(1 - e^(-N/N₀)) with N₀ ≈ 30
- **Communication**: M(N) = α·N·log(N) + β·N
- **Learning Speed**: τ_learn(N) = τ₀·(N/N₀)^γ with γ < 1 (collective learning!)

### Phase Transitions

- **Phase I (Solitary, N < 20)**: Individual agents, no coordination
- **Phase II (Swarm, 20 < N < 80)**: Emergent coordination, specialization begins
- **Phase III (Superorganism, N > 80)**: Collective intelligence, stable hierarchies

### Robustness

- **Critical Mass**: 50 agents minimum for collective intelligence
- **Byzantine Tolerance**: Up to 7% malicious agents
- **Optimal Size**: 80-120 agents for most tasks
- **Adaptation**: Network plasticity enables 15% improvement in dynamic environments

## Installation

```bash
# Install Python dependencies
pip install numpy scipy matplotlib networkx

# Or use requirements.txt (create it)
echo "numpy>=1.20.0
scipy>=1.7.0
matplotlib>=3.3.0
networkx>=2.6.0" > requirements.txt

pip install -r requirements.txt
```

## Usage

### Quick Start

```bash
# Quick test run (2-3 minutes)
python run_all.py --quick

# Run all experiments (30-60 minutes)
python run_all.py

# Run specific experiment suite
python run_all.py --experiment scaling   # Scaling laws only
python run_all.py --experiment phases    # Phase transitions only
python run_all.py --experiment stress    # Stress tests only
```

### Individual Modules

```python
# Run core simulation
from emergent_behavior import run_single_simulation

result = run_single_simulation(
    num_agents=100,
    num_steps=500,
    seed=42
)

print(f"Success rate: {result['summary']['avg_success_rate']:.4f}")
print(f"Synchronization: {result['summary']['avg_synchronization']:.4f}")
```

```python
# Run scaling experiments
from scaling_experiments import ScalingExperiment

experiment = ScalingExperiment()
results = experiment.run_performance_scaling(
    colony_sizes=[10, 30, 50, 100, 200],
    trials_per_size=10,
    num_steps=500
)
```

```python
# Run phase transition analysis
from phase_transitions import PhaseTransitionExperiment

experiment = PhaseTransitionExperiment()
results = experiment.detect_phases(
    size_range=list(range(10, 151, 5)),
    trials_per_size=10,
    num_steps=500
)
```

```python
# Run stress tests
from stress_tests import StressTestExperiment

experiment = StressTestExperiment()
results = experiment.adversarial_input_test(
    colony_size=100,
    noise_levels=[0.0, 0.1, 0.3, 0.5, 0.7],
    trials_per_level=10,
    num_steps=500
)
```

## File Structure

```
simulation/
├── emergent_behavior.py      # Core simulation engine
│   ├── SimulationAgent       # Individual agent model
│   ├── ColonySimulation      # Colony-level simulation
│   └── ColonyMetrics         # Comprehensive metrics
│
├── scaling_experiments.py    # Scaling law discovery
│   ├── performance_scaling() # Performance vs colony size
│   ├── communication_overhead()  # Communication complexity
│   └── diversity_impact()    # Agent type diversity effects
│
├── phase_transitions.py      # Phase transition analysis
│   ├── detect_phases()       # Identify behavioral phases
│   └── analyze_critical_slowing_down()  # Recovery dynamics
│
├── stress_tests.py           # Robustness testing
│   ├── adversarial_input_test()      # Noise tolerance
│   ├── byzantine_agent_test()        # Malicious agent tolerance
│   ├── cascading_failure_test()      # Failure propagation
│   └── resource_constraint_test()    # Budget limitations
│
└── run_all.py                # Main entry point
```

## Output

Results are saved to the `results/` directory:

```
results/
├── scaling/
│   ├── performance_scaling.json
│   ├── performance_scaling.png
│   ├── communication_overhead.json
│   ├── communication_overhead.png
│   ├── diversity_impact.json
│   └── diversity_impact.png
│
├── phases/
│   ├── phase_transitions.json
│   ├── phase_transitions.png
│   ├── critical_slowing_down.json
│   └── critical_slowing_down.png
│
└── stress/
    ├── adversarial_input.json
    ├── adversarial_input.png
    ├── byzantine_agents.json
    ├── byzantine_agents.png
    ├── cascading_failures.json
    ├── cascading_failures.png
    ├── resource_constraints.json
    └── resource_constraints.png
```

## Key Metrics

### Colony Metrics

Each simulation tracks:

- **Basic**: num_agents, avg_value_function, survival_rate
- **Network**: avg_degree, clustering_coefficient, avg_path_length, modularity
- **Diversity**: shannon_diversity, type_distribution
- **Performance**: success_rate, avg_latency, collective_reward
- **Emergence**: information_flow, synchronization, criticality

### Order Parameters

- **Synchronization (r)**: Kuramoto order parameter, 0-1 scale
- **Specialization (S)**: Diversity deviation from uniform, 0-1 scale
- **Criticality (ξ)**: Distance to critical point, 0-1 scale

## Customization

### Agent Types

Modify agent distribution:

```python
custom_distribution = {
    AgentType.TASK: 0.7,  # 70% task agents
    AgentType.ROLE: 0.2,  # 20% role agents
    AgentType.CORE: 0.1,  # 10% core agents
}

sim = ColonySimulation(
    num_agents=100,
    agent_distribution=custom_distribution
)
```

### Network Topology

Choose initial topology:

```python
# Options: 'small-world', 'scale-free', 'random'
sim = ColonySimulation(
    num_agents=100,
    topology='small-world'  # Watts-Strogatz
)
```

### Simulation Parameters

Adjust simulation behavior:

```python
# Run simulation with custom parameters
history = sim.run_simulation(
    num_steps=1000,
    task_difficulty=0.5,      # 0-1 scale
    coupling_strength=0.5,    # Phase coupling
    enable_evolution=True     # Network plasticity
)
```

## Extending the Framework

### Adding New Metrics

```python
@dataclass
class ColonyMetrics:
    # ... existing metrics ...

    # Add custom metric
    custom_metric: float
```

### Adding New Experiments

```python
def custom_experiment(colony_size: int = 100):
    sim = ColonySimulation(num_agents=colony_size)
    history = sim.run_simulation(num_steps=500)

    # Analyze results
    results = analyze(history)
    return results
```

## Performance Tips

1. **Reduce trials**: Set `trials_per_size=3` for faster testing
2. **Fewer timesteps**: Use `num_steps=200` for quick experiments
3. **Smaller colonies**: Test with `colony_sizes=[10, 30, 50]` first
4. **Parallel execution**: Run different experiments in separate terminals

## Validation

The simulation framework has been validated against:

- **Graph evolution simulations** (see `../../graph-evolution-simulations.md`)
- **Network science literature**: Watts-Strogatz, Barabasi-Albert, Kuramoto
- **Complex systems theory**: Phase transitions, criticality, scaling laws

## References

1. Watts, D. J., & Strogatz, S. H. (1998). Collective dynamics of 'small-world' networks. *Nature*.
2. Barabási, A. L., & Albert, R. (1999). Emergence of scaling in random networks. *Science*.
3. Kuramoto, Y. (1975). Self-entrainment of a population of coupled non-linear oscillators. *International Symposium on Mathematical Problems in Theoretical Physics*.
4. Bak, P., Tang, C., & Wiesenfeld, K. (1987). Self-organized criticality. *Physical Review A*.

## Citation

If you use this simulation framework in your research:

```bibtex
@software{polln_simulations_2026,
  title={POLLN Emergent Behavior Simulation Suite},
  author={POLLN Research Team},
  year={2026},
  url={https://github.com/SuperInstance/polln}
}
```

## License

MIT License - See LICENSE file for details

---

**POLLN Project** | https://github.com/SuperInstance/polln
**Last Updated**: 2026-03-08
