# Error Handling Guide

Comprehensive guide for error handling and fault tolerance in the DeepInfra integration system.

## Table of Contents

1. [Error Types](#error-types)
2. [Retry Mechanisms](#retry-mechanisms)
3. [Circuit Breaker Pattern](#circuit-breaker-pattern)
4. [Fallback Strategies](#fallback-strategies)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Recovery Procedures](#recovery-procedures)
7. [Best Practices](#best-practices)

---

## Error Types

### API Errors

#### RateLimitError
**When**: API rate limit exceeded
**HTTP Code**: 429
**Retry**: Yes (with exponential backoff)
**Example**:
```python
try:
    result = await client.run_emergence_detection_cloud(...)
except RateLimitError as e:
    logger.warning(f"Rate limited: {e}")
    # System will retry automatically
```

#### AuthenticationError
**When**: Invalid or expired API key
**HTTP Code**: 401
**Retry**: No (requires fix)
**Example**:
```python
try:
    result = await client.run_emergence_detection_cloud(...)
except AuthenticationError:
    logger.error("API key is invalid or expired")
    # Check DEEPINFRA_API_KEY environment variable
    # Update API key in configuration
```

#### TimeoutError
**When**: Request takes too long
**Cause**: Network issues, heavy computation
**Retry**: Yes (with increased timeout)
**Example**:
```python
try:
    result = await client.run_emergence_detection_cloud(...)
except TimeoutError:
    logger.info("Request timed out, will retry")
    # System retries with exponential backoff
```

#### APIError
**When**: General API error
**HTTP Code**: 4xx, 5xx
**Retry**: Depends on error code
**Example**:
```python
try:
    result = await client.run_emergence_detection_cloud(...)
except APIError as e:
    logger.error(f"API error: {e}")
    if e.status_code >= 500:
        # Server error, retry
        pass
    else:
        # Client error, don't retry
        pass
```

### Local Errors

#### GPU Memory Error
**When**: CUDA out of memory
**Cause**: Matrix too large for GPU
**Fallback**: CPU or cloud
**Example**:
```python
try:
    result = local.run_transfer_entropy(large_matrix)
except cp.cuda.memory.OutOfMemoryError:
    logger.warning("GPU OOM, falling back to cloud")
    result = await client.run_emergence_detection_cloud(...)
```

#### Import Error
**When**: CuPy not available
**Cause**: GPU not supported
**Fallback**: NumPy CPU
**Example**:
```python
try:
    import cupy as cp
except ImportError:
    logger.info("CuPy not available, using NumPy")
    import numpy as cp
```

---

## Retry Mechanisms

### Exponential Backoff

**Default Configuration**:
```python
@retry_with_exponential_backoff(
    max_retries=3,        # Maximum retry attempts
    initial_delay=1.0,    # Initial delay in seconds
    backoff_factor=2.0,   # Delay multiplier
    max_delay=60.0        # Maximum delay
)
async def api_request():
    # Your API call here
    pass
```

**Retry Schedule**:
```
Attempt 1: Immediate
Attempt 2: Wait 1.0s
Attempt 3: Wait 2.0s (1.0 × 2)
Attempt 4: Wait 4.0s (2.0 × 2)
```

### Custom Retry Configuration

```python
from research.phase7_gpu_simulations.deepinfra_integration import retry_with_exponential_backoff

# Aggressive retry for critical operations
@retry_with_exponential_backoff(
    max_retries=5,
    initial_delay=0.5,
    backoff_factor=1.5,
    max_delay=30.0
)
async def critical_operation():
    # Critical API call
    pass

# Conservative retry for non-critical operations
@retry_with_exponential_backoff(
    max_retries=2,
    initial_delay=2.0,
    backoff_factor=3.0,
    max_delay=60.0
)
async def non_critical_operation():
    # Non-critical API call
    pass
```

### Retry Decision Tree

```
Error Occurs
    │
    ▼
Is it retryable?
    │
    ├─► Yes ──► Have we reached max retries?
    │             │
    │             ├─► No ──► Wait (exponential backoff) ──► Retry
    │             │
    │             └─► Yes ──► Give up, return error
    │
    └─► No ──► Return error immediately
```

### Manual Retry Implementation

```python
async def manual_retry(func, max_retries=3):
    """Manual retry with custom logic."""
    for attempt in range(max_retries):
        try:
            return await func()
        except RateLimitError as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # 1, 2, 4 seconds
                logger.info(f"Retry {attempt + 1}/{max_retries} after {wait_time}s")
                await asyncio.sleep(wait_time)
            else:
                raise
        except Exception as e:
            # Don't retry non-retryable errors
            raise
```

---

## Circuit Breaker Pattern

### Purpose

Prevent cascading failures by temporarily disabling failing services.

### Implementation

```python
class CircuitBreaker:
    """Circuit breaker for API calls."""

    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN

    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "HALF_OPEN"
            else:
                raise CircuitBreakerOpenError()

        try:
            result = await func(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise

    def on_success(self):
        """Handle successful call."""
        if self.state == "HALF_OPEN":
            self.state = "CLOSED"
        self.failure_count = 0

    def on_failure(self):
        """Handle failed call."""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.error(
                f"Circuit breaker opened after {self.failure_count} failures"
            )
```

### Usage

```python
# Create circuit breaker
breaker = CircuitBreaker(failure_threshold=5, timeout=60)

# Use with API calls
try:
    result = await breaker.call(
        client.run_emergence_detection_cloud,
        agent_states,
        detection_config
    )
except CircuitBreakerOpenError:
    logger.error("Circuit breaker is open, using fallback")
    result = fallback_implementation()
```

### States

**CLOSED** (Normal Operation):
- All requests pass through
- Failures increment counter
- Successes reset counter

**OPEN** (Failure Mode):
- All requests fail immediately
- No API calls made
- Waits for timeout period

**HALF_OPEN** (Recovery Mode):
- One request allowed
- Success → CLOSED
- Failure → OPEN

---

## Fallback Strategies

### Hierarchical Fallback

```
┌─────────────────────────────────────┐
│      Primary: Cloud API              │
│      (Fast, accurate, paid)          │
└────────────┬────────────────────────┘
             │ Fail
             ▼
┌─────────────────────────────────────┐
│      Secondary: Local GPU            │
│      (Fast, less accurate, free)     │
└────────────┬────────────────────────┘
             │ Fail
             ▼
┌─────────────────────────────────────┐
│      Tertiary: Local CPU             │
│      (Slow, accurate, free)          │
└────────────┬────────────────────────┘
             │ Fail
             ▼
┌─────────────────────────────────────┐
│      Last Resort: Cached Result     │
│      (Instant, potentially stale)    │
└─────────────────────────────────────┘
```

### Implementation

```python
class HybridSimulationEngine:
    async def simulate_with_fallback(self, scenario):
        """Execute simulation with full fallback chain."""

        # Try cloud API
        try:
            logger.info("Attempting cloud API execution")
            return await self.simulate(scenario, force_cloud=True)
        except (APIError, TimeoutError) as e:
            logger.warning(f"Cloud API failed: {e}")

        # Try local GPU
        try:
            logger.info("Attempting local GPU execution")
            return await self.simulate(scenario, force_local=True)
        except Exception as e:
            logger.warning(f"Local GPU failed: {e}")

        # Try CPU fallback
        try:
            logger.info("Attempting CPU fallback")
            return await self._cpu_fallback(scenario)
        except Exception as e:
            logger.warning(f"CPU fallback failed: {e}")

        # Try cache
        try:
            logger.info("Attempting cached result")
            cached = self.cloud.cache.get(**scenario)
            if cached:
                logger.info("Using cached result")
                return cached
        except Exception as e:
            logger.error(f"Cache fallback failed: {e}")

        # All fallbacks failed
        raise SimulationFailedError("All execution strategies failed")
```

### Degraded Mode

```python
class DegradedModeManager:
    def __init__(self):
        self.degraded_mode = False
        self.failure_count = 0
        self.failure_threshold = 10

    def record_failure(self):
        """Record a failure and potentially enter degraded mode."""
        self.failure_count += 1

        if self.failure_count >= self.failure_threshold:
            if not self.degraded_mode:
                logger.warning("Entering degraded mode")
                self.degraded_mode = True

    def record_success(self):
        """Record a success and potentially exit degraded mode."""
        self.failure_count = 0

        if self.degraded_mode:
            logger.info("Exiting degraded mode")
            self.degraded_mode = False

    def should_skip_optional_tasks(self):
        """In degraded mode, skip non-critical tasks."""
        return self.degraded_mode

    def get_degraded_config(self):
        """Get configuration for degraded mode."""
        if self.degraded_mode:
            return {
                "parallel_jobs": 1,  # Reduce parallelism
                "timeout": 30,  # Shorter timeouts
                "skip_optional": True  # Skip optional features
            }
        else:
            return {
                "parallel_jobs": 10,
                "timeout": 300,
                "skip_optional": False
            }
```

---

## Monitoring and Alerting

### Error Tracking

```python
class ErrorTracker:
    def __init__(self):
        self.errors = defaultdict(int)
        self.error_history = []

    def record_error(self, error_type, error_message):
        """Record an error occurrence."""
        self.errors[error_type] += 1
        self.error_history.append({
            "type": error_type,
            "message": error_message,
            "timestamp": datetime.now().isoformat()
        })

        # Alert on threshold
        if self.errors[error_type] >= ERROR_ALERT_THRESHOLD:
            self.send_alert(error_type, self.errors[error_type])

    def get_error_summary(self):
        """Get summary of errors."""
        return {
            "total_errors": sum(self.errors.values()),
            "by_type": dict(self.errors),
            "recent_errors": self.error_history[-100:]
        }
```

### Health Checks

```python
async def health_check(client):
    """Perform health check on API client."""
    health_status = {
        "api_available": False,
        "cache_healthy": False,
        "gpu_available": False,
        "overall": "unhealthy"
    }

    # Check API
    try:
        await client.initialize()
        health_status["api_available"] = True
    except Exception as e:
        logger.error(f"API health check failed: {e}")

    # Check cache
    try:
        client.cache.set({"test": "data"}, health_check="test")
        result = client.cache.get(health_check="test")
        if result:
            health_status["cache_healthy"] = True
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")

    # Check GPU
    try:
        simulator = LocalGPUSimulator(use_gpu=True)
        if simulator.gpu_available:
            health_status["gpu_available"] = True
    except Exception as e:
        logger.error(f"GPU health check failed: {e}")

    # Overall status
    if (health_status["api_available"] and
        health_status["cache_healthy"]):
        health_status["overall"] = "healthy"
    elif health_status["cache_healthy"]:
        health_status["overall"] = "degraded"
    else:
        health_status["overall"] = "unhealthy"

    return health_status
```

### Alerting

```python
class AlertManager:
    def __init__(self):
        self.alert_thresholds = {
            "error_rate": 0.1,  # 10% error rate
            "cost_per_hour": 10.0,  # $10/hour
            "latency_p99": 30.0  # 30 seconds
        }

    def check_metrics(self, metrics):
        """Check metrics against thresholds and alert if needed."""
        alerts = []

        # Check error rate
        error_rate = 1.0 - metrics["success_rate"]
        if error_rate > self.alert_thresholds["error_rate"]:
            alerts.append({
                "type": "error_rate",
                "severity": "high",
                "message": f"Error rate {error_rate:.1%} exceeds threshold"
            })

        # Check cost
        cost_per_hour = metrics["total_cost"]  # Would need proper calculation
        if cost_per_hour > self.alert_thresholds["cost_per_hour"]:
            alerts.append({
                "type": "cost",
                "severity": "medium",
                "message": f"Cost ${cost_per_hour:.2f}/hr exceeds threshold"
            })

        # Check latency
        if metrics["average_latency"] > self.alert_thresholds["latency_p99"]:
            alerts.append({
                "type": "latency",
                "severity": "medium",
                "message": f"Latency {metrics['average_latency']:.1f}s exceeds threshold"
            })

        # Send alerts
        for alert in alerts:
            self.send_alert(alert)

        return alerts

    def send_alert(self, alert):
        """Send alert notification."""
        logger.warning(
            f"ALERT [{alert['severity'].upper()}]: {alert['message']}"
        )
        # Could integrate with email, Slack, PagerDuty, etc.
```

---

## Recovery Procedures

### Automatic Recovery

```python
class AutoRecoveryManager:
    def __init__(self):
        self.recovery_strategies = [
            self._retry_with_backoff,
            self._switch_to_fallback,
            self._clear_cache_and_retry,
            self._restart_session
        ]

    async def attempt_recovery(self, error, context):
        """Attempt automatic recovery from error."""
        logger.info(f"Attempting recovery for error: {error}")

        for strategy in self.recovery_strategies:
            try:
                result = await strategy(error, context)
                if result:
                    logger.info(f"Recovery successful with {strategy.__name__}")
                    return True
            except Exception as e:
                logger.warning(f"Recovery strategy {strategy.__name__} failed: {e}")

        logger.error("All recovery strategies failed")
        return False

    async def _retry_with_backoff(self, error, context):
        """Retry with exponential backoff."""
        if isinstance(error, (RateLimitError, TimeoutError)):
            await asyncio.sleep(2 ** context.get("retry_count", 0))
            return True
        return False

    async def _switch_to_fallback(self, error, context):
        """Switch to fallback execution mode."""
        if isinstance(error, APIError):
            context["use_fallback"] = True
            return True
        return False

    async def _clear_cache_and_retry(self, error, context):
        """Clear cache and retry."""
        if "cache" in context:
            context["cache"].clear()
            return True
        return False

    async def _restart_session(self, error, context):
        """Restart API session."""
        if "client" in context:
            await context["client"].close()
            await context["client"].initialize()
            return True
        return False
```

### Manual Recovery

```python
async def manual_recovery_steps():
    """Step-by-step manual recovery procedure."""

    print("=== Manual Recovery Procedure ===\n")

    # Step 1: Check API key
    print("Step 1: Verify API key")
    api_key = os.getenv("DEEPINFRA_API_KEY")
    if not api_key:
        print("  ❌ API key not found")
        print("  → Set DEEPINFRA_API_KEY environment variable")
        return False
    print(f"  ✓ API key found: {api_key[:10]}...")

    # Step 2: Test API connection
    print("\nStep 2: Test API connection")
    try:
        client = DeepInfraSimulationClient(api_key=api_key)
        await client.initialize()
        print("  ✓ API connection successful")
    except Exception as e:
        print(f"  ❌ API connection failed: {e}")
        return False
    finally:
        await client.close()

    # Step 3: Check GPU
    print("\nStep 3: Check GPU availability")
    try:
        simulator = LocalGPUSimulator(use_gpu=True)
        if simulator.gpu_available:
            print("  ✓ GPU available")
        else:
            print("  ⚠ GPU not available (will use CPU)")
    except Exception as e:
        print(f"  ⚠ GPU check failed: {e}")

    # Step 4: Clear cache
    print("\nStep 4: Clear cache")
    response = input("  Clear cache? (y/n): ")
    if response.lower() == 'y':
        client = DeepInfraSimulationClient(api_key=api_key)
        client.cache.clear()
        print("  ✓ Cache cleared")

    # Step 5: Reset metrics
    print("\nStep 5: Reset metrics")
    response = input("  Reset metrics? (y/n): ")
    if response.lower() == 'y':
        client = DeepInfraSimulationClient(api_key=api_key)
        client.reset_metrics()
        print("  ✓ Metrics reset")

    print("\n=== Recovery Complete ===")
    print("Try running your simulation again.")
    return True
```

---

## Best Practices

### 1. Always Use Context Managers

```python
# Good
async with client:
    result = await client.run_emergence_detection_cloud(...)

# Also good
try:
    await client.initialize()
    result = await client.run_emergence_detection_cloud(...)
finally:
    await client.close()

# Bad
result = await client.run_emergence_detection_cloud(...)
# Session not properly closed
```

### 2. Implement Proper Logging

```python
import logging

logger = logging.getLogger(__name__)

try:
    result = await client.run_emergence_detection_cloud(...)
except APIError as e:
    logger.error(f"API error occurred: {e}", exc_info=True)
    raise
except Exception as e:
    logger.critical(f"Unexpected error: {e}", exc_info=True)
    raise
```

### 3. Monitor Metrics Continuously

```python
async def monitored_simulation(client, scenario):
    """Run simulation with continuous monitoring."""
    initial_cost = client.metrics.total_cost

    try:
        result = await client.run_emergence_detection_cloud(...)
        return result
    finally:
        final_cost = client.metrics.total_cost
        operation_cost = final_cost - initial_cost

        logger.info(
            f"Operation cost: ${operation_cost:.6f}, "
            f"Total spent: ${final_cost:.4f}"
        )

        # Alert on high cost
        if operation_cost > 0.01:  # $0.01 threshold
            logger.warning(f"High operation cost: ${operation_cost:.6f}")
```

### 4. Graceful Degradation

```python
async def resilient_simulation(client, scenario):
    """Simulation that degrades gracefully on errors."""
    try:
        # Try full-featured simulation
        return await client.run_emergence_detection_cloud(
            scenario["agent_states"],
            scenario["detection_config"]
        )
    except APIError:
        logger.warning("Full API unavailable, trying simplified")
        try:
            # Try simplified version
            return await client.run_emergence_detection_cloud(
                scenario["agent_states"][:10],  # Fewer agents
                {"method": "simple"}  # Simpler method
            )
        except APIError:
            logger.error("Simplified API unavailable, using local")
            # Fall back to local computation
            return local_computation(scenario)
```

### 5. Timeout Management

```python
async def timeout_aware_call(client, func, *args, timeout=300):
    """Execute with timeout and proper error handling."""
    try:
        result = await asyncio.wait_for(
            func(*args),
            timeout=timeout
        )
        return result
    except asyncio.TimeoutError:
        logger.error(f"Operation timed out after {timeout}s")
        # Implement recovery or fallback
        raise TimeoutError(f"Operation exceeded {timeout}s timeout")
```

### 6. Idempotent Operations

```python
async def idempotent_simulation(client, scenario_id, scenario):
    """Idempotent simulation that can be safely retried."""
    # Check if already completed
    cached = client.cache.get(scenario_id=scenario_id)
    if cached:
        logger.info(f"Using cached result for {scenario_id}")
        return cached

    # Execute simulation
    result = await client.run_emergence_detection_cloud(...)

    # Cache result
    client.cache.set(result, scenario_id=scenario_id)

    return result
```

---

**Last Updated:** 2026-03-13
**Version:** 1.0.0
