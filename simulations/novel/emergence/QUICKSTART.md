# Quick Start Guide

Get started with the Emergence Discovery System in 5 minutes.

## Installation

### 1. Clone or Navigate to Directory

```bash
cd C:/Users/casey/polln/simulations/novel/emergence
```

### 2. Install Dependencies

```bash
# Core dependencies
pip install numpy scipy scikit-learn

# Optional: For advanced visualization
pip install umap-learn matplotlib seaborn plotly

# DeepSeek API client
pip install openai

# Testing
pip install pytest
```

### 3. Verify Installation

```bash
python -c "import numpy, scipy, sklearn; print('Dependencies OK!')"
```

## Quick Test (2 minutes)

Run the built-in test to verify everything works:

```bash
# Run quick discovery test
python run_discovery.py --quick-test
```

This will run a small-scale discovery campaign (20 explorations, 1 iteration) using the mock simulation.

Expected output:
```
🔬 Starting emergence exploration with adaptive strategy
🔍 Discovering patterns in 20 simulations
🧠 Generating 3 hypotheses about phenomenon...
🧪 Designing 2 experiments to test hypothesis...
📚 Phase 5: Phenomenon Cataloging
  ✅ Discovery cycle complete
```

## Your First Discovery Campaign (5 minutes)

### Option A: Use Mock Simulation (Fastest)

```bash
# Run a small discovery campaign
python run_discovery.py --explorations 50 --iterations 2
```

### Option B: Use Real POLLN (Requires POLLN Installation)

```bash
# Run with real POLLN simulation
python run_discovery.py --explorations 100 --iterations 3 --use-real-polln
```

### Option C: Python API

Create a file `my_discovery.py`:

```python
from discovery_pipeline import AutomatedDiscoveryPipeline
import numpy as np

def my_simulation(config):
    """Your custom simulation function"""
    # Simulate something interesting
    temperature = config.get("temperature", 0.5)
    n_agents = config.get("n_agents", 100)

    # Simulate phase transition at temperature = 0.7
    if temperature > 0.7:
        coordination = 0.9
    else:
        coordination = 0.3

    return {
        "metrics": {
            "coordination": coordination + np.random.normal(0, 0.05),
            "synchronization": np.random.random(),
            "criticality": np.random.random()
        },
        "config": config
    }

# Create pipeline
pipeline = AutomatedDiscoveryPipeline(
    simulation_fn=my_simulation,
    output_dir="./my_discovery_results"
)

# Run discovery
report = pipeline.run_discovery_cycle(
    n_explorations=100,
    n_iterations=2
)

# Print results
print(f"\n{'='*60}")
print("DISCOVERY RESULTS")
print(f"{'='*60}")
print(f"Phenomena discovered: {report.phenomena_cataloged}")
print(f"Mean novelty score: {report.novelty_summary['mean']:.3f}")
print(f"\nRecommendations:")
for rec in report.recommendations:
    print(f"  - {rec}")
```

Run it:
```bash
python my_discovery.py
```

## Understanding the Output

After running a discovery campaign, you'll find:

### 1. Discovery Report
Location: `discovery_results/discovery_report_YYYYMMDD_HHMMSS.json`

```json
{
  "phenomena_cataloged": 5,
  "novelty_summary": {
    "mean": 0.75,
    "max": 0.92
  },
  "recommendations": [
    "High novelty discoveries detected - consider publication"
  ]
}
```

### 2. Phenomenon Catalog
Location: `discovery_results/catalog/entries.json`

Browse discovered phenomena with features, mechanisms, and novelty scores.

### 3. Exploration Results
Location: `discovery_results/exploration/*.json`

Parameter configurations and emergence metrics.

### 4. Pattern Discoveries
Location: `discovery_results/patterns/patterns_*.json`

Discovered clusters, anomalies, and trends.

### 5. Generated Hypotheses
Location: `discovery_results/hypotheses/hypotheses_*.json`

AI-generated mechanistic hypotheses.

## Next Steps

### 1. Explore the Results

```python
from phenomenon_catalog import PhenomenonCatalog

# Load catalog
catalog = PhenomenonCatalog(catalog_path="./discovery_results/catalog")

# Search for high-novelty phenomena
phenomena = catalog.search("", min_novelty=0.8)

for p in phenomena:
    print(f"{p.short_name}: novelty={p.novelty_score:.2f}")
```

### 2. Investigate Specific Phenomena

```python
# Get detailed information
phenomenon_id = phenomena[0].phenomenon_id
phenomenon = catalog.entries[phenomenon_id]

print(f"Description: {phenomenon.description}")
print(f"Mechanism: {phenomenon.hypothesized_mechanism}")
print(f"Features: {phenomenon.features}")
```

### 3. Generate Publication Materials

```bash
python run_discovery.py --explorations 200 --iterations 3 --generate-materials
```

Creates:
- `publication_materials/paper_outline.md`
- `publication_materials/figures.md`
- `publication_materials/supplementary.md`

### 4. Run Tests

```bash
# Run all tests
pytest test_emergence.py -v

# Run specific component
pytest test_emergence.py::TestPatternDiscoveryEngine -v

# With coverage
pytest test_emergence.py --cov=. --cov-report=html
```

## Configuration

### Custom Parameter Space

```python
from explorer import ParameterSpace

custom_space = ParameterSpace(
    name="my_space",
    dimensions={
        "temperature": (0.1, 2.0),
        "learning_rate": (0.001, 0.1),
        "connectivity": (0.0, 1.0)
    },
    log_scale=["learning_rate"]
)
```

### Custom Emergence Metrics

```python
from explorer import EmergenceMetric

my_metrics = [
    EmergenceMetric(
        name="my_metric",
        description="My custom metric",
        compute=lambda result: result["metrics"]["custom"],
        higher_is_better=True
    )
]
```

## DeepSeek API Configuration

The system uses DeepSeek API by default with key: `YOUR_API_KEY`

To use your own key:

```bash
python run_discovery.py --api-key YOUR_API_KEY
```

Or in Python:

```python
pipeline = AutomatedDiscoveryPipeline(
    simulation_fn=my_simulation,
    deepseek_api_key="YOUR_API_KEY"
)
```

## Common Commands

```bash
# Quick test (20 explorations)
python run_discovery.py --quick-test

# Small campaign (100 explorations, 2 iterations)
python run_discovery.py --explorations 100 --iterations 2

# Medium campaign (500 explorations, 3 iterations)
python run_discovery.py --explorations 500 --iterations 3

# Large campaign with real POLLN
python run_discovery.py --explorations 1000 --iterations 5 --use-real-polln

# Generate publication materials
python run_discovery.py --explorations 200 --iterations 3 --generate-materials

# Verbose output for debugging
python run_discovery.py --explorations 50 --iterations 1 --verbose

# Custom output directory
python run_discovery.py --explorations 100 --iterations 2 --output ./my_results
```

## Troubleshooting

### Import Errors
```bash
# Ensure all dependencies are installed
pip install -r requirements.txt
```

### DeepSeek API Errors
- Check API key is valid
- Verify you have credits available
- Check rate limits

### Memory Issues
- Reduce `n_explorations`
- Process data in batches
- Use incremental saving

### Slow Performance
- Use faster exploration strategies (Random vs Bayesian)
- Reduce dimensionality before clustering
- Cache DeepSeek results

## Getting Help

1. **Documentation**: Read `README.md` for detailed information
2. **Methodology**: See `DISCOVERY_METHODS.md` for scientific rigor
3. **Publication**: Check `PUBLICATION.md` for writing papers
4. **Design**: Review `DESIGN_SUMMARY.md` for architecture

## Example Workflows

### Workflow 1: Quick Exploration
```bash
# 1. Quick test
python run_discovery.py --quick-test

# 2. Small campaign
python run_discovery.py --explorations 50 --iterations 2

# 3. Review results
python compile_findings.py --results-dir ./discovery_results
```

### Workflow 2: Full Discovery Campaign
```bash
# 1. Run discovery
python run_discovery.py --explorations 500 --iterations 5

# 2. Generate materials
python run_discovery.py --explorations 200 --iterations 3 --generate-materials

# 3. Compile findings
python compile_findings.py --results-dir ./discovery_results --export
```

### Workflow 3: Custom Investigation
```python
# Use Python API for custom investigation
from discovery_pipeline import AutomatedDiscoveryPipeline

# 1. Create pipeline
pipeline = AutomatedDiscoveryPipeline(simulation_fn=my_sim)

# 2. Run discovery
report = pipeline.run_discovery_cycle(n_explorations=200, n_iterations=3)

# 3. Investigate leads
for lead in pipeline.discovery_leads:
    if lead.priority == "high":
        pipeline.investigate_lead(lead.lead_id)

# 4. Generate publications
materials = pipeline.generate_publication_materials()
```

## Success Indicators

You'll know the system is working when you see:

✅ **Exploration**: Parameter configurations being tested
✅ **Patterns**: Clusters and anomalies being identified
✅ **Hypotheses**: Mechanisms being proposed
✅ **Experiments**: Validation tests being run
✅ **Catalog**: Phenomena being classified
✅ **Report**: Summary with recommendations

## What to Expect

- **Small campaign** (50 explorations): ~5 minutes
- **Medium campaign** (200 explorations): ~20 minutes
- **Large campaign** (500 explorations): ~1 hour

Times vary based on:
- Simulation complexity
- Exploration strategy
- Pattern detection methods
- DeepSeek API response time

## Next Steps After Discovery

1. **Review Catalog**: Examine discovered phenomena
2. **Validate**: Run additional experiments
3. **Theorize**: Develop mathematical models
4. **Publish**: Write papers using generated materials
5. **Share**: Contribute findings to catalog

## Summary

You're now ready to discover novel emergent phenomena in POLLN! The system will:

- 📊 Explore parameter space systematically
- 🔍 Discover patterns automatically
- 🧠 Generate creative hypotheses (using DeepSeek)
- 🧪 Test hypotheses rigorously
- 📚 Catalog discoveries comprehensively
- 📄 Prepare publication materials

Start with `--quick-test` to verify everything works, then scale up to full discovery campaigns.

Good luck with your discoveries! 🚀
