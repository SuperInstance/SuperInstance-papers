# Quick Start: Emergence Discovery System

Get started discovering emergent phenomena in 5 minutes.

---

## Installation

```bash
# Dependencies
pip install numpy scipy scikit-learn

# Optional: GPU acceleration
pip install cupy-cuda13x  # For CUDA 13.x (RTX 4050)
```

---

## Basic Usage

### 1. Run Pre-configured Discovery

```bash
cd C:/Users/casey/polln/research/emergence_discovery
python emergence_miner.py
```

**Output:**
- `discovered_phenomena.json` - All discoveries
- `discovery_report.md` - Human-readable summary

### 2. Custom Discovery Script

```python
from emergence_miner import EmergenceMiner, CoupledOscillatorSystem

# Initialize
miner = EmergenceMiner(num_agents=50, num_timesteps=1000)

# Define search space
params = {
    "coupling_strength": (0.0, 2.0),
    "noise_level": (0.0, 0.5),
    "interaction_range": (0.1, 2.0)
}

# Run discovery
testbed = CoupledOscillatorSystem()
phenomena = miner.mine_emergence(
    agent_system=testbed.simulate,
    parameter_ranges=params,
    num_runs=100,
    emergence_threshold=0.5
)

# Analyze
for p in phenomena[:5]:  # Top 5
    print(f"{p.emergence_type.value}: {p.metrics['emergence_score']:.2f}")
```

### 3. Multi-System Discovery

```python
from emergence_miner import NovelEmergenceDiscovery

# Discover across all testbeds
engine = NovelEmergenceDiscovery(use_gpu=True)
discoveries = engine.discover_across_systems(
    num_runs_per_system=50,
    emergence_threshold=0.4
)

# Analyze novelty
analysis = engine.analyze_novelty(discoveries)
print(f"Total discovered: {analysis['total_phenomena']}")
```

---

## Available Testbed Systems

### 1. Coupled Oscillators
```python
CoupledOscillatorSystem().simulate(
    num_agents=50,
    timesteps=1000,
    coupling_strength=1.0,      # [0.0, 2.0]
    noise_level=0.1,            # [0.0, 0.5]
    interaction_range=1.0,      # [0.1, 2.0]
    natural_frequency_spread=0.5 # [0.1, 1.0]
)
```

### 2. Opinion Dynamics
```python
OpinionDynamicsSystem().simulate(
    num_agents=50,
    timesteps=1000,
    confidence_bound=0.3,   # [0.1, 1.0]
    convergence_rate=0.5,   # [0.1, 1.0]
    noise_level=0.05,       # [0.0, 0.2]
    num_opinions=3          # [1, 5]
)
```

### 3. Particle Swarm
```python
ParticleSwarmSystem().simulate(
    num_agents=50,
    timesteps=1000,
    cohesion_strength=0.3,    # [0.0, 1.0]
    alignment_strength=0.5,   # [0.0, 1.0]
    separation_strength=0.2,  # [0.0, 1.0]
    noise_level=0.1           # [0.0, 0.3]
)
```

---

## Emergence Types

The system classifies phenomena into 8 types:

1. **Swarm Intelligence** - High information flow + high coordination
2. **Consensus Emergence** - Dense network connectivity
3. **Pattern Formation** - Spatial structure emergence
4. **Phase Transition** - Sudden behavioral changes
5. **Computational Emergence** - High overall emergence score
6. **Network Synchronization** - Strong pairwise connections
7. **Collective Memory** - High coordination, moderate information flow
8. **Novel Phenomenon** - Doesn't fit other categories

---

## Understanding Results

### Emergence Score
- **Range:** 0.0 - 7.0+ (unbounded)
- **Threshold:** Default 0.4 (adjust per system)
- **Interpretation:**
  - < 0.3: Weak or no emergence
  - 0.3 - 0.7: Moderate emergence
  - > 0.7: Strong emergence
  - > 5.0: Exceptional emergence

### Key Metrics
- `avg_transfer_entropy` - Information flow between agents
- `global_mutual_info` - System-wide coordination
- `network_density` - Fraction of significant connections
- `phase_transition` - Sudden behavioral change detected

---

## Example Output

```
============================================================
Emergence Mining Started
============================================================
Agents: 50
Timesteps: 1000
Parameter combinations: 100
Emergence threshold: 0.4
GPU acceleration: Enabled
============================================================

[Run 1/100] DISCOVERED: Swarm Intelligence
  Emergence score: 5.64
  Parameters: {'alignment_strength': 0.66, ...}

[Run 2/100] DISCOVERED: Collective Memory
  Emergence score: 2.31
  Parameters: {'coupling_strength': 0.82, ...}

...

============================================================
Mining Complete: 60 phenomena discovered
============================================================
```

---

## Tips for Best Results

### 1. Adjust Threshold Per System
- **Coupled Oscillators:** 0.4-0.5
- **Opinion Dynamics:** 0.2-0.3 (lower)
- **Particle Swarm:** 0.4-0.5

### 2. Use GPU When Available
```python
miner = EmergenceMiner(use_gpu=True)  # 2-3x faster
```

### 3. Run More Simulations
- 30 runs: Quick test
- 100 runs: Standard discovery
- 500+ runs: Comprehensive search

### 4. Focus on High-Scoring Regions
- After initial run, narrow search to high-scoring parameters
- Use log-uniform sampling for wide parameter ranges

### 5. Combine with Visualization
- Plot agent states over time
- Visualize emergence metrics
- Compare high vs. low emergence runs

---

## Troubleshooting

### No Discoveries
- **Cause:** Threshold too high
- **Fix:** Lower `emergence_threshold` (try 0.2)

### Slow Performance
- **Cause:** CPU-only mode
- **Fix:** Install CuPy, use `use_gpu=True`

### All Same Type
- **Cause:** Parameter range too narrow
- **Fix:** Expand parameter ranges

### Memory Errors
- **Cause:** Too many agents/timesteps
- **Fix:** Reduce `num_agents` or `num_timesteps`

---

## Next Steps

1. **Read Full Documentation**
   - `README.md` - Complete usage guide
   - `VALIDATION_CRITERIA.md` - Validation protocol
   - `CROSS_PAPER_NOTES.md` - Connections to other papers

2. **Run Full Campaign**
   ```bash
   python emergence_miner.py  # 30 runs per system
   ```

3. **Analyze Results**
   - Check `discovered_phenomena.json`
   - Read `discovery_report.md`
   - Review `DISCOVERY_ANALYSIS.md`

4. **Integrate with Research**
   - Validate other papers (P24-P30)
   - Use discoveries as training data
   - Build on emergence taxonomy

---

## File Structure

```
C:/Users/casey/polln/research/emergence_discovery/
├── emergence_miner.py           # Main system
├── test_emergence_miner.py      # Test suite
├── README.md                    # Full documentation
├── QUICKSTART.md               # This file
├── VALIDATION_CRITERIA.md      # Validation protocol
├── CROSS_PAPER_NOTES.md        # Paper connections
├── IMPLEMENTATION_SUMMARY.md   # Implementation details
├── DISCOVERY_ANALYSIS.md       # Campaign results
├── discovered_phenomena.json   # Discovery database
└── discovery_report.md         # Summary report
```

---

## Support

- **Issues:** Check test suite (`python test_emergence_miner.py`)
- **Questions:** See README.md and VALIDATION_CRITERIA.md
- **Examples:** See test suite and discovery campaign

---

**Status:** OPERATIONAL
**Last Updated:** 2026-03-13
**Version:** 1.0
