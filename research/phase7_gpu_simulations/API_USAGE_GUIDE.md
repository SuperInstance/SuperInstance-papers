# DeepInfra API Usage Guide

Complete guide for using the DeepInfra cloud API integration for SuperInstance GPU simulations.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Core API Methods](#core-api-methods)
4. [Simulation Types](#simulation-types)
5. [Batch Processing](#batch-processing)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Cost Management](#cost-management)
9. [Examples](#examples)

---

## Quick Start

### Installation

```bash
# Install required dependencies
pip install aiohttp numpy python-dotenv

# Optional: GPU support (CuPy)
pip install cupy-cuda12x  # Adjust CUDA version as needed
```

### Basic Setup

```python
import asyncio
from research.phase7_gpu_simulations.deepinfra_integration import (
    DeepInfraSimulationClient,
    HybridSimulationEngine
)

async def main():
    # Simple cloud-only simulation
    client = DeepInfraSimulationClient()
    await client.initialize()

    result = await client.run_emergence_detection_cloud(
        agent_states=[...],
        detection_config={"method": "transfer_entropy"}
    )

    print(result)
    await client.close()

asyncio.run(main())
```

---

## Authentication

### Environment Variable (Recommended)

Set your API key in `.env` file or environment:

```bash
# .env file
DEEPINFRA_API_KEY=your_api_key_here
```

### Direct Initialization

```python
# Pass API key directly
client = DeepInfraSimulationClient(api_key="your_api_key_here")
```

### Custom Base URL

```python
# For custom deployments or proxies
client = DeepInfraSimulationClient(
    api_key="your_key",
    base_url="https://custom-endpoint.com/v1"
)
```

---

## Core API Methods

### 1. Emergence Detection

Detect emergent behaviors in multi-agent systems.

```python
result = await client.run_emergence_detection_cloud(
    agent_states=[
        {"id": 0, "state": [0.1, 0.2, 0.3], "connections": [1, 2]},
        {"id": 1, "state": [0.4, 0.5, 0.6], "connections": [0, 2]},
        # ... more agents
    ],
    detection_config={
        "method": "transfer_entropy",
        "threshold": 0.5,
        "time_window": 10
    }
)

# Returns:
# {
#     "transfer_entropy_matrix": [[...]],
#     "emergence_score": 0.87,
#     "emergent_behaviors": ["behavior1", "behavior2"],
#     "analysis_summary": "..."
# }
```

### 2. Neural Architecture Search

Generate neural network architectures for specific tasks.

```python
architecture = await client.propose_neural_architecture(
    task_description="Classify temporal patterns in agent trajectories",
    constraints={
        "max_parameters": 1000000,
        "max_layers": 10,
        "input_shape": [100, 5],  # 100 timesteps, 5 features
        "output_classes": 10
    }
)

# Returns:
# {
#     "architecture_name": "TemporalPatternClassifier",
#     "layers": [
#         {"type": "LSTM", "params": {"units": 128, "return_sequences": True}},
#         {"type": "Dropout", "params": {"rate": 0.2}},
#         # ... more layers
#     ],
#     "total_parameters": 850000,
#     "justification": "...",
#     "alternatives": [...]
# }
```

### 3. Agent Society Simulation

Simulate large-scale multi-agent systems.

```python
simulation = await client.run_agent_society_simulation(
    num_agents=1000,
    simulation_steps=500,
    agent_config={
        "capabilities": ["sense", "communicate", "act"],
        "memory_size": 100,
        "learning_rate": 0.01
    },
    coordination_strategy="stigmergy"  # or "centralized", "decentralized"
)

# Returns:
# {
#     "final_state": "...",
#     "emergent_behaviors": [...],
#     "phase_transitions": [
#         {"step": 150, "description": "Swarm formation", "trigger": "..."}
#     ],
#     "system_metrics": {
#         "entropy": 2.3,
#         "diversity": 0.85,
#         "stability": 0.92
#     }
# }
```

### 4. Multimodal Simulation

Combine text and image-based simulations.

```python
multimodal = await client.run_multimodal_simulation(
    text_scenario="Agents navigate urban environment with obstacles",
    image_prompts=[
        "Aerial view of city grid with obstacles",
        "Agent movement trajectories heatmap"
    ],
    simulation_config={
        "duration": 1000,
        "obstacle_density": 0.3
    }
)
```

---

## Simulation Types

The system supports multiple simulation types via the `SimulationType` enum:

```python
from research.phase7_gpu_simulations.deepinfra_integration import SimulationType

# Available types:
SimulationType.EMERGENCE_DETECTION      # Analyze emergent behaviors
SimulationType.NEURAL_ARCHITECTURE_SEARCH  # Generate architectures
SimulationType.AGENT_SOCIETY            # Multi-agent simulations
SimulationType.MULTIMODAL_PIPELINE      # Cross-modal simulations
SimulationType.VALUE_NETWORK_TRAINING   # RL value function training
SimulationType.SELF_PLAY_TRAINING       # Self-play optimization
```

---

## Batch Processing

Run multiple simulations efficiently in parallel.

### Basic Batch Processing

```python
scenarios = [
    {
        "agent_states": states_1,
        "detection_config": config_1
    },
    {
        "agent_states": states_2,
        "detection_config": config_2
    },
    # ... more scenarios
]

results = await client.batch_simulation(
    scenarios=scenarios,
    simulation_type=SimulationType.EMERGENCE_DETECTION,
    parallel_jobs=10  # Adjust based on API limits
)

# results is a list of simulation results
```

### Hybrid Engine Batch Processing

```python
engine = HybridSimulationEngine()
await engine.initialize()

scenarios = [scenario_1, scenario_2, scenario_3]

results = await engine.simulate_batch(
    scenarios=scenarios,
    parallel_jobs=5  # Cloud API parallelism
)

# Each result includes both local and cloud components
```

---

## Error Handling

### Automatic Retry Logic

The client automatically retries failed requests with exponential backoff:

```python
# Already configured by default:
# - 3 retry attempts
# - Initial delay: 1 second
# - Backoff factor: 2x
# - Maximum delay: 60 seconds
```

### Custom Retry Configuration

```python
from research.phase7_gpu_simulations.deepinfra_integration import retry_with_exponential_backoff

@retry_with_exponential_backoff(
    max_retries=5,
    initial_delay=2.0,
    backoff_factor=3.0,
    max_delay=120.0
)
async def custom_simulation():
    # Your custom logic here
    pass
```

### Exception Handling

```python
from research.phase7_gpu_simulations.deepinfra_integration import (
    APIError,
    RateLimitError,
    TimeoutError,
    AuthenticationError
)

try:
    result = await client.run_emergence_detection_cloud(...)
except AuthenticationError:
    print("Invalid API key")
except RateLimitError as e:
    print(f"Rate limited: {e}")
    # Wait and retry
except TimeoutError:
    print("Request timed out")
except APIError as e:
    print(f"API error: {e}")
```

---

## Performance Optimization

### Caching

Results are automatically cached to avoid redundant API calls.

```python
# Cache is enabled by default (TTL: 1 hour)
client = DeepInfraSimulationClient(cache_ttl=3600)

# First call: hits API
result1 = await client.run_emergence_detection_cloud(...)

# Second call with same params: returns cached result
result2 = await client.run_emergence_detection_cloud(...)

# Disable caching for specific calls
result3 = await client.run_emergence_detection_cloud(..., use_cache=False)
```

### Cache Management

```python
# Clear all cache
client.cache.clear()

# Remove expired entries
client.cache.cleanup_expired()
```

### Parallel Execution

```python
# Run multiple independent simulations in parallel
tasks = [
    client.run_emergence_detection_cloud(states_1, config_1),
    client.run_emergence_detection_cloud(states_2, config_2),
    client.run_agent_society_simulation(100, 500, agent_config),
]

results = await asyncio.gather(*tasks)
```

### Hybrid Engine Optimization

```python
engine = HybridSimulationEngine()

# Scenario configuration
scenario = {
    "agent_states": states,
    "requires_matrix_ops": True,  # Runs on local GPU
    "requires_llm_analysis": True,  # Runs in cloud
    "num_agents": 50  # Small enough for local
}

# Automatic task distribution
result = await engine.simulate(scenario)

# Force specific execution mode
result_cloud = await engine.simulate(scenario, force_cloud=True)
result_local = await engine.simulate(scenario, force_local=True)
```

---

## Cost Management

### Monitoring Costs

```python
# Get detailed metrics
metrics = client.get_metrics()

print(f"Total requests: {metrics['total_requests']}")
print(f"Total cost: ${metrics['total_cost']:.4f}")
print(f"Average latency: {metrics['average_latency']:.2f}s")
print(f"Cache hit rate: {metrics['cache_hit_rate']:.1%}")
print(f"Success rate: {metrics['success_rate']:.1%}")
```

### Cost Estimation

```python
# Estimate cost before running
input_tokens = len(prompt) / 4  # Rough estimate
expected_output_tokens = 2048

cost = client._calculate_cost(input_tokens, expected_output_tokens)
print(f"Estimated cost: ${cost:.6f}")
```

### Cost Optimization Strategies

1. **Use caching aggressively**
   ```python
   client = DeepInfraSimulationClient(cache_ttl=7200)  # 2 hours
   ```

2. **Batch similar requests**
   ```python
   # Instead of 10 individual calls:
   for scenario in scenarios:
       result = await client.run_emergence_detection_cloud(scenario)

   # Use batch processing:
   results = await client.batch_simulation(scenarios, ...)
   ```

3. **Optimize prompt length**
   ```python
   # Be concise
   task_description = "Classify agent trajectories"
   # Instead of
   task_description = "I need you to please classify the trajectories of agents in this system..."
   ```

4. **Use appropriate max_tokens**
   ```python
   # For simple tasks
   result = await client.propose_neural_architecture(
       task_description=task,
       constraints={"max_tokens": 1024}  # Smaller output
   )
   ```

---

## Examples

### Example 1: Complete Workflow

```python
import asyncio
import numpy as np
from research.phase7_gpu_simulations.deepinfra_integration import (
    HybridSimulationEngine,
    SimulationType
)

async def complete_workflow():
    # Initialize
    engine = HybridSimulationEngine()
    await engine.initialize()

    # Prepare data
    num_agents = 50
    num_timesteps = 100
    agent_states = np.random.rand(num_timesteps, num_agents, 5)

    # Configure simulation
    scenario = {
        "simulation_type": "emergence_detection",
        "agent_states": agent_states,
        "detection_config": {
            "method": "transfer_entropy",
            "threshold": 0.3
        },
        "requires_matrix_ops": True,  # Local GPU
        "requires_llm_analysis": True  # Cloud
    }

    # Run simulation
    result = await engine.simulate(scenario)

    # Analyze results
    if "local_results" in result:
        te_matrix = result["local_results"]["transfer_entropy"]
        print(f"Transfer entropy matrix shape: {te_matrix.shape}")

    if "cloud_results" in result:
        emergence = result["cloud_results"]["emergence_analysis"]
        print(f"Emergence score: {emergence['emergence_score']}")

    # Get metrics
    metrics = engine.get_performance_metrics()
    print(f"Cloud API cost: ${metrics['cloud']['total_cost']:.4f}")

    await engine.close()

asyncio.run(complete_workflow())
```

### Example 2: Neural Architecture Search for P27

```python
async def architecture_search_for_emergence():
    client = DeepInfraSimulationClient()
    await client.initialize()

    architecture = await client.propose_neural_architecture(
        task_description=(
            "Detect emergence in multi-agent systems using "
            "transfer entropy and mutual information features"
        ),
        constraints={
            "max_parameters": 500000,
            "input_shape": [50, 50],  # 50 agents × 50 time bins
            "output_type": "probability",
            "interpretability": "high"
        }
    )

    print("Proposed Architecture:")
    print(f"Name: {architecture['architecture_name']}")
    print(f"Parameters: {architecture['total_parameters']}")
    print(f"Justification: {architecture['justification']}")

    for layer in architecture['layers']:
        print(f"  - {layer['type']}: {layer['params']}")

    await client.close()

asyncio.run(architecture_search_for_emergence())
```

### Example 3: Large-Scale Agent Society

```python
async def large_scale_simulation():
    client = DeepInfraSimulationClient()
    await client.initialize()

    simulation = await client.run_agent_society_simulation(
        num_agents=10000,
        simulation_steps=1000,
        agent_config={
            "type": "autonomous",
            "capabilities": [
                "environment_sensing",
                "peer_communication",
                "collective_decision_making"
            ],
            "memory_size": 1000,
            "learning_strategy": "reinforcement"
        },
        coordination_strategy="stigmergy"
    )

    print("Simulation Results:")
    print(f"Final state: {simulation['final_state']}")
    print(f"Emergent behaviors: {len(simulation['emergent_behaviors'])}")
    print(f"Phase transitions: {len(simulation['phase_transitions'])}")

    print("\nSystem Metrics:")
    for metric, value in simulation['system_metrics'].items():
        print(f"  {metric}: {value}")

    await client.close()

asyncio.run(large_scale_simulation())
```

### Example 4: Batch Validation for Phase 2 Papers

```python
async def validate_phase2_papers():
    """Validate multiple Phase 2 paper claims in parallel."""
    engine = HybridSimulationEngine()
    await engine.initialize()

    # P24: Self-Play
    self_play_scenario = {
        "simulation_type": "self_play",
        "num_agents": 100,
        "simulation_steps": 500,
        "requires_llm_analysis": True
    }

    # P27: Emergence Detection
    emergence_scenario = {
        "simulation_type": "emergence_detection",
        "agent_states": generate_agent_states(),
        "detection_config": {"method": "transfer_entropy"},
        "requires_llm_analysis": True
    }

    # P26: Value Networks
    value_network_scenario = {
        "simulation_type": "value_network",
        "task_description": "Predict agent colony success",
        "requires_architecture_search": True
    }

    # Run all in parallel
    results = await engine.simulate_batch(
        scenarios=[self_play_scenario, emergence_scenario, value_network_scenario],
        parallel_jobs=3
    )

    # Analyze results
    for i, result in enumerate(results):
        paper_id = ["P24", "P27", "P26"][i]
        print(f"\n{paper_id} Validation:")
        print(f"  Cloud results: {len(result.get('cloud_results', {}))}")
        print(f"  Local results: {len(result.get('local_results', {}))}")

    await engine.close()

asyncio.run(validate_phase2_papers())
```

### Example 5: Convenience Function

```python
from research.phase7_gpu_simulations.deepinfra_integration import (
    run_cloud_simulation,
    SimulationType
)

async def quick_simulation():
    # One-liner for common tasks
    result = await run_cloud_simulation(
        SimulationType.EMERGENCE_DETECTION,
        agent_states=[...],
        detection_config={...}
    )

    print(result)

asyncio.run(quick_simulation())
```

---

## Advanced Topics

### Custom Session Configuration

```python
import aiohttp

# Create custom session with specific timeout
custom_session = aiohttp.ClientSession(
    headers={"Authorization": f"Bearer {api_key}"},
    timeout=aiohttp.ClientTimeout(total=600)  # 10 minutes
)

client = DeepInfraSimulationClient()
client.session = custom_session
```

### Progress Tracking

```python
async def batch_with_progress(scenarios):
    total = len(scenarios)
    results = []

    for i, scenario in enumerate(scenarios):
        result = await client.run_emergence_detection_cloud(
            scenario["agent_states"],
            scenario["config"]
        )
        results.append(result)

        progress = (i + 1) / total * 100
        print(f"Progress: {progress:.1f}%")

    return results
```

### Result Persistence

```python
import json
from datetime import datetime

async def save_results(result, filename):
    timestamp = datetime.now().isoformat()
    output = {
        "timestamp": timestamp,
        "result": result
    }

    with open(filename, 'w') as f:
        json.dump(output, f, indent=2, default=str)

# Usage
result = await client.run_emergence_detection_cloud(...)
await save_results(result, f"results_{timestamp}.json")
```

---

## Troubleshooting

### Common Issues

1. **Authentication Error**
   - Verify API key is correct
   - Check environment variable is set
   - Ensure key has necessary permissions

2. **Timeout Errors**
   - Increase timeout in client initialization
   - Break large requests into smaller chunks
   - Check network connectivity

3. **Rate Limiting**
   - Reduce parallel_jobs parameter
   - Add delays between requests
   - Implement exponential backoff (already included)

4. **GPU Memory Issues**
   - Reduce batch size for local GPU operations
   - Use force_cloud=True for heavy computations
   - Monitor GPU memory usage

### Debug Mode

```python
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

# Now all API calls will be logged
client = DeepInfraSimulationClient()
await client.initialize()
```

---

## Best Practices

1. **Always initialize and close client properly**
   ```python
   try:
       await client.initialize()
       # ... use client
   finally:
       await client.close()
   ```

2. **Use context managers for complex workflows**
   ```python
   async with AsyncExitStack() as stack:
       client = DeepInfraSimulationClient()
       await client.initialize()
       stack.push_async_callback(client.close)
       # ... use client
   ```

3. **Monitor metrics regularly**
   ```python
   # After significant usage
   metrics = client.get_metrics()
   if metrics['total_cost'] > 10.0:
       print("Warning: High API usage cost")
   ```

4. **Cache aggressively for repeated queries**
   ```python
   # Increase TTL for stable data
   client = DeepInfraSimulationClient(cache_ttl=86400)  # 24 hours
   ```

5. **Use hybrid engine for optimal performance**
   ```python
   # Let system decide optimal execution
   engine = HybridSimulationEngine()
   result = await engine.simulate(scenario)
   ```

---

## API Reference

See docstrings in `deepinfra_integration.py` for complete API reference.

### Key Classes

- `DeepInfraSimulationClient` - Cloud API client
- `HybridSimulationEngine` - Hybrid cloud-local engine
- `LocalGPUSimulator` - Local GPU simulation backend
- `ResultCache` - Result caching system
- `APIMetrics` - API usage tracking

### Key Functions

- `run_cloud_simulation()` - Convenience function for quick simulations
- `retry_with_exponential_backoff()` - Retry decorator

### Enums

- `SimulationType` - Supported simulation types

### Exceptions

- `APIError` - Base API exception
- `RateLimitError` - Rate limit exceeded
- `TimeoutError` - Request timeout
- `AuthenticationError` - Auth failure

---

## Support

For issues or questions:
1. Check this guide first
2. Review code documentation
3. Check DeepInfra API status
4. Review error logs with debug mode enabled

---

**Last Updated:** 2026-03-13
**Version:** 1.0.0
