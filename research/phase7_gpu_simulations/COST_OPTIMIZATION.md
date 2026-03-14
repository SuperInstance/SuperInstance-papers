# Cost Optimization Guide

Strategies and best practices for optimizing DeepInfra API costs in SuperInstance simulations.

## Table of Contents

1. [Cost Structure](#cost-structure)
2. [Monitoring Costs](#monitoring-costs)
3. [Optimization Strategies](#optimization-strategies)
4. [Caching Strategies](#caching-strategies)
5. [Batch Processing](#batch-processing)
6. [Resource Selection](#resource-selection)
7. [Budget Management](#budget-management)
8. [Cost Analysis Examples](#cost-analysis-examples)

---

## Cost Structure

### DeepInfra Pricing

**Llama 3 70B Instruct** (Primary model used):
- **Input tokens**: $0.07 per 1M tokens
- **Output tokens**: $0.27 per 1M tokens

**Cost Calculation**:
```python
def calculate_cost(input_tokens, output_tokens):
    input_cost = (input_tokens / 1_000_000) * 0.07
    output_cost = (output_tokens / 1_000_000) * 0.27
    return input_cost + output_cost
```

**Example Costs**:
| Operation | Input Tokens | Output Tokens | Cost |
|-----------|--------------|---------------|------|
| Simple query | 500 | 1,000 | $0.00031 |
| Emergence detection | 2,000 | 2,000 | $0.00068 |
| Architecture search | 3,000 | 3,000 | $0.00102 |
| Agent simulation | 5,000 | 4,000 | $0.00143 |
| Complex analysis | 10,000 | 8,000 | $0.00286 |

### Token Estimation

**Rough Estimates**:
- 1 token ≈ 4 characters (English)
- 1 token ≈ 0.75 words
- 1 page ≈ 500 tokens
- JSON structure adds 20-30% overhead

**Per-Operation Estimates**:
```python
# Emergence detection
input_tokens = len(json.dumps(agent_states)) / 4
output_tokens = 2048  # max_tokens setting

# Architecture search
input_tokens = len(task_description) / 4 + len(json.dumps(constraints)) / 4
output_tokens = 2048

# Agent society simulation
input_tokens = 2000  # Fixed prompt + config
output_tokens = 2048
```

---

## Monitoring Costs

### Built-in Metrics

```python
client = DeepInfraSimulationClient()

# After operations
metrics = client.get_metrics()

print(f"Total requests: {metrics['total_requests']}")
print(f"Total cost: ${metrics['total_cost']:.4f}")
print(f"Average cost per request: ${metrics['total_cost'] / metrics['total_requests']:.6f}")
print(f"Total tokens: {metrics['total_tokens_used']}")
```

### Custom Cost Tracking

```python
class CostTracker:
    def __init__(self, budget_limit=100.0):
        self.budget_limit = budget_limit
        self.total_spent = 0.0
        self.by_operation = defaultdict(float)

    def record_cost(self, operation, cost):
        self.total_spent += cost
        self.by_operation[operation] += cost

        # Alert on budget threshold
        if self.total_spent > self.budget_limit * 0.9:
            logger.warning(f"90% of budget used: ${self.total_spent:.2f}")

        if self.total_spent >= self.budget_limit:
            raise BudgetExceededError(self.total_spent, self.budget_limit)

    def get_report(self):
        return {
            "total_spent": self.total_spent,
            "budget_remaining": self.budget_limit - self.total_spent,
            "by_operation": dict(self.by_operation)
        }
```

### Real-time Cost Monitoring

```python
async def monitored_simulation(client, scenario, tracker):
    """Run simulation with cost tracking."""
    start_cost = client.metrics.total_cost

    result = await client.run_emergence_detection_cloud(
        scenario["agent_states"],
        scenario["config"]
    )

    end_cost = client.metrics.total_cost
    operation_cost = end_cost - start_cost

    tracker.record_cost("emergence_detection", operation_cost)

    logger.info(
        f"Operation cost: ${operation_cost:.6f}, "
        f"Total spent: ${tracker.total_spent:.4f}"
    )

    return result
```

---

## Optimization Strategies

### 1. Aggressive Caching

**Strategy**: Cache all results with appropriate TTL.

```python
# High TTL for stable computations
client = DeepInfraSimulationClient(
    cache_ttl=86400  # 24 hours
)

# Different TTL for different operations
cache_config = {
    "emergence_detection": 7200,  # 2 hours
    "architecture_search": 86400,  # 24 hours
    "agent_simulation": 3600  # 1 hour
}
```

**Impact**:
- Cache hit rate of 50%+ reduces costs by 50%+
- Typical savings: $10-50 per day for heavy usage

### 2. Prompt Optimization

**Strategy**: Minimize input token count without sacrificing quality.

```python
# Verbose (expensive)
verbose_prompt = """
I would like you to please analyze the following agent society system
and determine if there are any emergent behaviors present. Please consider
the transfer of information between agents and look for patterns that...
"""

# Concise (cheap)
concise_prompt = """
Analyze agent society for emergence:
- Transfer entropy between agents
- Novel behaviors identification
- Emergence probability score (0-1)

Return JSON with analysis.
"""

# Savings: 60-70% on input tokens
```

**Best Practices**:
- Use JSON for structured input (more compact)
- Remove redundant explanations
- Use abbreviations for common terms
- Exclude verbose context unless necessary

### 3. Output Token Management

**Strategy**: Limit output tokens to minimum required.

```python
# For simple yes/no questions
payload = {
    "max_tokens": 10,  # Minimal output
    "temperature": 0.1
}

# For detailed analysis
payload = {
    "max_tokens": 2048,  # Detailed output
    "temperature": 0.5
}

# For architecture generation
payload = {
    "max_tokens": 4096,  # Maximum detail
    "temperature": 0.7
}
```

### 4. Batch Processing

**Strategy**: Combine multiple requests into single batch.

```python
# Expensive: Individual requests
for scenario in scenarios:
    result = await client.run_emergence_detection_cloud(
        scenario["states"],
        scenario["config"]
    )
    # Cost: N × API call

# Cheap: Batch processing
results = await client.batch_simulation(
    scenarios=scenarios,
    simulation_type=SimulationType.EMERGENCE_DETECTION,
    parallel_jobs=10
)
# Cost: Same tokens, but reduced overhead
```

**Benefits**:
- Reduced connection overhead
- Better rate limit utilization
- Parallel execution saves time
- Same token cost, faster execution

### 5. Hybrid Execution

**Strategy**: Use local GPU for suitable tasks.

```python
# Classification matrix
task_classification = {
    "local": [
        "matrix_ops",
        "novelty_detection_small",
        "transfer_entropy_small"
    ],
    "cloud": [
        "llm_analysis",
        "architecture_search",
        "complex_reasoning"
    ]
}

# Automatic savings
engine = HybridSimulationEngine()
result = await engine.simulate(scenario)
# Automatically uses local GPU when cost-effective
```

**Savings**:
- Local computation: $0 (after hardware investment)
- Typical savings: 30-50% for matrix-heavy workloads

### 6. Model Selection

**Strategy**: Use appropriate model for task complexity.

```python
# Simple tasks: Smaller model
simple_models = {
    "rapid_analysis": "seed-1.8",  # Fast, cheap
    "iteration": "seed-2.0-mini"
}

# Complex tasks: Larger model
complex_models = {
    "deep_analysis": "llama-3-70b",
    "architecture": "hermes-3-405b"
}
```

**Cost Comparison** (approximate):
| Model | Input/1M | Output/1M | Relative Cost |
|-------|----------|-----------|---------------|
| seed-1.8 | $0.03 | $0.10 | 0.4x |
| seed-2.0 | $0.05 | $0.15 | 0.6x |
| llama-3-70b | $0.07 | $0.27 | 1.0x (baseline) |
| hermes-3-405b | $0.15 | $0.50 | 1.9x |

---

## Caching Strategies

### Multi-Level Caching

```python
class SmartCache:
    def __init__(self):
        self.memory_cache = {}  # L1: Fastest
        self.disk_cache = DiskCache()  # L2: Persistent
        self.cloud_cache = RedisCache()  # L3: Shared

    async def get(self, key):
        # L1: Memory
        if key in self.memory_cache:
            return self.memory_cache[key]

        # L2: Disk
        value = await self.disk_cache.get(key)
        if value:
            self.memory_cache[key] = value
            return value

        # L3: Cloud (shared across instances)
        value = await self.cloud_cache.get(key)
        if value:
            self.memory_cache[key] = value
            await self.disk_cache.set(key, value)
            return value

        return None  # Cache miss
```

### Cache Key Optimization

```python
def optimize_cache_key(scenario):
    """Create efficient cache keys."""
    # Hash only essential parameters
    essential = {
        "states_hash": hash(json.dumps(scenario["states"])),
        "config": scenario["config"],
        "version": "v1"
    }
    return hashlib.sha256(json.dumps(essential).encode()).hexdigest()
```

### Cache Invalidation Strategy

```python
class AdaptiveCache:
    def __init__(self):
        self.hit_rates = defaultdict(float)

    def should_cache(self, operation, result):
        """Decide whether to cache based on hit rate."""
        current_hit_rate = self.hit_rates[operation]

        # Cache if high hit rate or expensive operation
        if current_hit_rate > 0.3:
            return True
        if operation in ["architecture_search", "agent_simulation"]:
            return True
        return False

    def update_hit_rate(self, operation, hit):
        """Update hit rate with exponential smoothing."""
        alpha = 0.1  # Smoothing factor
        if hit:
            self.hit_rates[operation] = (
                alpha * 1.0 + (1 - alpha) * self.hit_rates[operation]
            )
        else:
            self.hit_rates[operation] = (
                alpha * 0.0 + (1 - alpha) * self.hit_rates[operation]
            )
```

---

## Batch Processing

### Optimal Batch Size

```python
def calculate_optimal_batch_size(
    avg_request_time,
    rate_limit_per_second,
    desired_parallelism
):
    """
    Calculate optimal batch size.

    Factors:
    - Average request time
    - API rate limits
    - Desired parallelism
    - Cost per request
    """
    # Time to complete batch
    batch_time = avg_request_time / desired_parallelism

    # Maximum requests within rate limit
    max_requests = int(rate_limit_per_second * batch_time)

    # Choose smaller of constraints
    optimal_size = min(max_requests, desired_parallelism)

    return optimal_size

# Example
optimal = calculate_optimal_batch_size(
    avg_request_time=5.0,  # 5 seconds
    rate_limit_per_second=20,
    desired_parallelism=10
)
# Result: 10 requests per batch
```

### Batch Orchestration

```python
async def intelligent_batch_processing(client, scenarios):
    """Process scenarios in intelligent batches."""
    # Group by similarity (for potential cache hits)
    similar_groups = group_by_similarity(scenarios)

    results = []
    for group in similar_groups:
        # Check cache first
        cached = [client.cache.get(s) for s in group]
        cache_hits = [c for c in cached if c is not None]

        if cache_hits:
            results.extend(cache_hits)
            logger.info(f"Cache hits: {len(cache_hits)}/{len(group)}")
        else:
            # Process remaining in batch
            remaining = [s for s, c in zip(group, cached) if c is None]
            batch_results = await client.batch_simulation(
                scenarios=remaining,
                parallel_jobs=10
            )
            results.extend(batch_results)

    return results
```

### Streaming Batches

```python
async def stream_batches(client, scenarios, batch_size=10):
    """Process scenarios in streaming batches."""
    for i in range(0, len(scenarios), batch_size):
        batch = scenarios[i:i+batch_size]

        logger.info(f"Processing batch {i//batch_size + 1}")
        results = await client.batch_simulation(
            scenarios=batch,
            parallel_jobs=batch_size
        )

        # Yield results as they complete
        for result in results:
            yield result

        # Cost check between batches
        if client.metrics.total_cost > BUDGET_WARNING_THRESHOLD:
            logger.warning("Approaching budget limit")
```

---

## Resource Selection

### Local vs Cloud Decision Tree

```
┌─────────────────────────────────────┐
│     Can task run on local GPU?      │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │ Yes           │ No
       ▼               ▼
┌──────────────┐  ┌──────────────┐
│ Is local     │  │ Use cloud    │
│ execution    │  │ API          │
│ faster?      │  └──────────────┘
└──────┬───────┘
       │
  ┌────┴────┐
  │ Yes     │ No
  ▼         ▼
┌──────┐ ┌──────┐
│ Local│ │ Cloud│
└──────┘ └──────┘
```

### Cost-Performance Analysis

```python
def analyze_cost_performance(task):
    """Analyze whether local or cloud is more cost-effective."""
    # Local costs
    local_time = estimate_local_time(task)
    local_cost = calculate_gpu_cost(local_time)  # Electricity + depreciation

    # Cloud costs
    cloud_time = estimate_cloud_time(task)
    cloud_cost = estimate_cloud_cost(task)  # API costs

    # Decision
    if local_cost < cloud_cost and local_time < MAX_ACCEPTABLE_TIME:
        return "local", local_cost, local_time
    else:
        return "cloud", cloud_cost, cloud_time

# Example usage
decision, cost, time = analyze_cost_performance(scenario)
logger.info(f"Using {decision}: ${cost:.6f}, {time:.2f}s")
```

### GPU Utilization Optimization

```python
def optimize_gpu_utilization():
    """Maximize GPU utilization for local computation."""
    strategies = [
        # Batch processing
        "Process multiple scenarios simultaneously on GPU",

        # Memory management
        "Use gradient checkpointing for large models",
        "Clear cache between batches",
        "Use mixed precision (fp16) where possible",

        # Kernel optimization
        "Fuse operations to reduce kernel launches",
        "Use shared memory for frequently accessed data",
        "Overlap computation with data transfers"
    ]

    return strategies
```

---

## Budget Management

### Budget Alerts

```python
class BudgetAlerts:
    def __init__(self, daily_budget=10.0):
        self.daily_budget = daily_budget
        self.daily_spent = 0.0
        self.alert_thresholds = [0.5, 0.75, 0.9, 1.0]

    def check_budget(self, current_cost):
        """Check and alert on budget thresholds."""
        usage_ratio = current_cost / self.daily_budget

        for threshold in self.alert_thresholds:
            if usage_ratio >= threshold:
                self.send_alert(
                    f"Budget {threshold*100:.0f}% used: ${current_cost:.2f}/${self.daily_budget:.2f}"
                )
                self.alert_thresholds.remove(threshold)

        if usage_ratio >= 1.0:
            raise BudgetExceededError(current_cost, self.daily_budget)

    def send_alert(self, message):
        """Send alert notification."""
        logger.warning(message)
        # Could integrate with email, Slack, etc.
```

### Cost Forecasting

```python
def forecast_cost(historical_costs, days_ahead=7):
    """Forecast future costs based on historical data."""
    # Simple linear regression
    x = np.arange(len(historical_costs))
    y = np.array(historical_costs)

    # Fit trend line
    coeffs = np.polyfit(x, y, 1)
    trend = np.poly1d(coeffs)

    # Forecast
    future_x = np.arange(len(historical_costs), len(historical_costs) + days_ahead)
    forecast = trend(future_x)

    return forecast

# Usage
costs = [2.5, 3.1, 2.8, 3.5, 4.0, 3.8, 4.2]  # Daily costs
forecast = forecast_cost(costs, days_ahead=7)
print(f"7-day forecast: ${forecast.sum():.2f}")
```

### Cost Optimization Audit

```python
async def cost_audit(client):
    """Audit API usage and identify optimization opportunities."""
    metrics = client.get_metrics()

    audit_report = {
        "total_requests": metrics["total_requests"],
        "total_cost": metrics["total_cost"],
        "average_cost": metrics["total_cost"] / metrics["total_requests"],
        "cache_hit_rate": metrics["cache_hit_rate"],
        "success_rate": metrics["success_rate"],
        "recommendations": []
    }

    # Analyze and make recommendations
    if metrics["cache_hit_rate"] < 0.3:
        audit_report["recommendations"].append(
            "Increase cache TTL - low hit rate suggests repeated queries"
        )

    if metrics["average_cost"] > 0.002:
        audit_report["recommendations"].append(
            "Optimize prompts - high average cost suggests verbose inputs/outputs"
        )

    if metrics["success_rate"] < 0.95:
        audit_report["recommendations"].append(
            "Investigate failures - low success rate wastes money on retries"
        )

    return audit_report
```

---

## Cost Analysis Examples

### Example 1: Emergence Detection Pipeline

**Scenario**: Process 100 agent societies per day

**Without Optimization**:
```python
requests_per_day = 100
avg_input_tokens = 2000
avg_output_tokens = 2000

cost_per_request = calculate_cost(avg_input_tokens, avg_output_tokens)
# cost_per_request = $0.00068

daily_cost = requests_per_day * cost_per_request
# daily_cost = $0.068

monthly_cost = daily_cost * 30
# monthly_cost = $2.04
```

**With Caching (50% hit rate)**:
```python
cache_hit_rate = 0.5
effective_requests = requests_per_day * (1 - cache_hit_rate)

daily_cost = effective_requests * cost_per_request
# daily_cost = $0.034

monthly_cost = daily_cost * 30
# monthly_cost = $1.02
```

**Savings**: 50% ($1.02/month)

### Example 2: Neural Architecture Search

**Scenario**: Generate 50 architectures per week

**Without Optimization**:
```python
architectures_per_week = 50
avg_input_tokens = 3000
avg_output_tokens = 3000

cost_per_request = calculate_cost(avg_input_tokens, avg_output_tokens)
# cost_per_request = $0.00102

weekly_cost = architectures_per_week * cost_per_request
# weekly_cost = $0.051

monthly_cost = weekly_cost * 4
# monthly_cost = $0.204
```

**With Aggressive Caching (80% hit rate)**:
```python
cache_hit_rate = 0.8
effective_requests = architectures_per_week * (1 - cache_hit_rate)

weekly_cost = effective_requests * cost_per_request
# weekly_cost = $0.010

monthly_cost = weekly_cost * 4
# monthly_cost = $0.040
```

**Savings**: 80% ($0.164/month)

### Example 3: Large-Scale Agent Simulation

**Scenario**: 10 simulations with 1000 agents each

**Cloud-Only**:
```python
num_simulations = 10
cost_per_simulation = 0.00143  # From table

total_cost = num_simulations * cost_per_simulation
# total_cost = $0.0143
```

**Hybrid (local for setup, cloud for analysis)**:
```python
# Local: Agent state evolution (free)
local_cost = 0.0

# Cloud: Emergence analysis only
cloud_cost_per_simulation = 0.00068  # Emergence detection only

total_cost = local_cost + (num_simulations * cloud_cost_per_simulation)
# total_cost = $0.0068
```

**Savings**: 52% ($0.0075)

---

## Summary of Best Practices

1. **Enable aggressive caching** - 50-80% cost reduction
2. **Optimize prompts** - 30-50% reduction in input tokens
3. **Use hybrid execution** - 30-50% savings on suitable tasks
4. **Batch similar requests** - Reduced overhead, faster execution
5. **Monitor costs continuously** - Catch unexpected spending early
6. **Set budget alerts** - Prevent overruns
7. **Use appropriate models** - Smaller models for simple tasks
8. **Optimize output tokens** - Limit to minimum required
9. **Leverage local GPU** - Free computation after hardware cost
10. **Regular cost audits** - Identify optimization opportunities

---

**Last Updated:** 2026-03-13
**Version:** 1.0.0
