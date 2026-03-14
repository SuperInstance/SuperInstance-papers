# Monitoring Dashboard Documentation

## Overview

The Monitoring Dashboard provides real-time visibility into orchestration metrics, backend selection, performance, and costs with comprehensive alerting and visualization capabilities.

---

## Dashboard Architecture

### Components

1. **Metrics Collector:** Aggregates and stores metric data
2. **Alert Manager:** Monitors conditions and triggers alerts
3. **Dashboard Generator:** Compiles real-time dashboard data
4. **Notification System:** Sends alert notifications

### Data Flow

```
Execution → Metrics Collection → Aggregation → Dashboard
                                       ↓
                                  Alert Evaluation
                                       ↓
                                  Notification (if triggered)
```

---

## Metrics

### Core Metrics

#### Orchestration Execution Time

**Name:** `orchestration_execution_time_ms`

**Type:** Histogram

**Labels:**
- `backend`: local_gpu or cloud
- `simulation_type`: Type of simulation

**Description:** Time taken for execution

**Example:**
```python
monitor.metrics_collector.record_metric(
    name='orchestration_execution_time_ms',
    value=450.5,
    labels={'backend': 'local_gpu', 'simulation_type': 'neural_evolution'}
)
```

#### Orchestration Cost

**Name:** `orchestration_cost_usd`

**Type:** Gauge

**Labels:**
- `backend`: local_gpu or cloud
- `simulation_type`: Type of simulation

**Description:** Cost of execution (0 for local)

**Example:**
```python
monitor.metrics_collector.record_metric(
    name='orchestration_cost_usd',
    value=0.05,
    labels={'backend': 'cloud', 'simulation_type': 'neural_evolution'}
)
```

#### Orchestration Success

**Name:** `orchestration_success`

**Type:** Gauge

**Labels:**
- `backend`: local_gpu or cloud
- `simulation_type`: Type of simulation

**Description:** 1.0 if successful, 0.0 if failed

**Example:**
```python
monitor.metrics_collector.record_metric(
    name='orchestration_success',
    value=1.0,
    labels={'backend': 'local_gpu', 'simulation_type': 'neural_evolution'}
)
```

#### Local VRAM Usage

**Name:** `local_vram_usage_gb`

**Type:** Gauge

**Labels:**
- `backend`: local_gpu
- `simulation_type`: Type of simulation

**Description:** VRAM used in GB

**Example:**
```python
monitor.metrics_collector.record_metric(
    name='local_vram_usage_gb',
    value=3.2,
    labels={'backend': 'local_gpu', 'simulation_type': 'neural_evolution'}
)
```

#### Orchestration Success Rate

**Name:** `orchestration_success_rate`

**Type:** Gauge

**Description:** Rolling success rate (last hour)

**Calculation:** Average of `orchestration_success` metrics

#### Cloud Cost Total

**Name:** `cloud_cost_total_usd`

**Type:** Counter

**Description:** Total cloud spending

**Calculation:** Sum of `orchestration_cost_usd` for cloud backend

---

## Alerting

### Alert Types

#### High Failure Rate

**Name:** `high_failure_rate`

**Metric:** `orchestration_success_rate`

**Condition:** `< 0.9` (90%)

**Severity:** ERROR

**Message:** "Failure rate high: {value:.1%} (threshold: {threshold:.1%})"

**Trigger:** Success rate drops below 90%

#### High Cloud Cost

**Name:** `high_cloud_cost`

**Metric:** `cloud_cost_total_usd`

**Condition:** `> 10.0` ($10)

**Severity:** WARNING

**Message:** "Cloud cost high: ${value:.2f} (threshold: ${threshold:.2f})"

**Trigger:** Total cloud spending exceeds $10

#### High VRAM Usage

**Name:** `high_vram_usage`

**Metric:** `local_vram_usage_percent`

**Condition:** `> 90` (90%)

**Severity:** WARNING

**Message:** "VRAM usage high: {value:.1f}% (threshold: {threshold:.1f}%)"

**Trigger:** VRAM usage exceeds 90% of total

### Custom Alerts

Add custom alert rules:

```python
monitor.alert_manager.add_alert_rule(
    name='slow_execution',
    metric_name='orchestration_execution_time_ms',
    condition='gt',  # Greater than
    threshold=5000,  # 5 seconds
    severity=AlertSeverity.WARNING,
    message_template='Execution slow: {value:.0f}ms (threshold: {threshold:.0f}ms)'
)
```

### Alert Handlers

Add notification handlers:

```python
# Logging handler (included by default)
monitor.alert_manager.add_notification_handler(logging_alert_handler)

# Custom handler
def slack_alert_handler(alert: Alert):
    send_slack_message(
        channel='#alerts',
        message=f"Alert: {alert.name} - {alert.message}"
    )

monitor.alert_manager.add_notification_handler(slack_alert_handler)
```

---

## Dashboard Data

### Backend Distribution

Shows distribution of executions across backends.

```json
{
  "backend_distribution": {
    "local_gpu": 0.65,
    "cloud": 0.35
  }
}
```

### Performance by Backend

Shows execution time statistics by backend.

```json
{
  "performance_by_backend": {
    "local_gpu": {
      "avg": 450.5,
      "min": 5.2,
      "max": 5000.0,
      "count": 650
    },
    "cloud": {
      "avg": 3200.0,
      "min": 100.0,
      "max": 50000.0,
      "count": 350
    }
  }
}
```

### Cost Metrics

Shows cloud spending statistics.

```json
{
  "cost_metrics": {
    "total_cost_usd": 8.45,
    "avg_cost_per_request": 0.024,
    "request_count": 350
  }
}
```

### Success Rate

Shows overall success rate.

```json
{
  "success_rate": 0.96
}
```

### VRAM Usage

Shows GPU memory utilization.

```json
{
  "vram_usage": {
    "avg_gb": 2.8,
    "max_gb": 5.2,
    "avg_percent": 46.7,
    "max_percent": 86.7
  }
}
```

### Active Alerts

Shows currently active alerts.

```json
{
  "active_alerts": [
    {
      "name": "high_vram_usage",
      "severity": "warning",
      "message": "VRAM usage high: 92.3% (threshold: 90.0%)",
      "datetime": "2026-03-13T15:30:45Z"
    }
  ]
}
```

---

## Usage Examples

### Basic Monitoring

```python
from monitoring_dashboard import OrchestrationMonitor

# Initialize monitor
monitor = OrchestrationMonitor()

# Record execution
monitor.record_execution(
    backend='local_gpu',
    simulation_type='neural_evolution',
    execution_time_ms=5000,
    cost_usd=0.0,
    success=True,
    vram_used_gb=5.2
)

# Get dashboard data
dashboard = monitor.get_dashboard_data()
print(f"Success rate: {dashboard['success_rate']:.1%}")
print(f"Total cost: ${dashboard['cost_metrics']['total_cost_usd']:.2f}")
```

### Custom Alerting

```python
# Add custom alert rule
monitor.alert_manager.add_alert_rule(
    name='expensive_execution',
    metric_name='orchestration_cost_usd',
    condition='gt',
    threshold=0.1,
    severity=AlertSeverity.WARNING,
    message_template='Expensive execution: ${value:.4f}'
)

# Add custom handler
def email_alert_handler(alert: Alert):
    if alert.severity == AlertSeverity.ERROR:
        send_email(
            to='ops@example.com',
            subject=f"ALERT: {alert.name}",
            body=alert.message
        )

monitor.alert_manager.add_notification_handler(email_alert_handler)
```

### Query Metrics

```python
# Query specific metric
metrics = monitor.metrics_collector.query_metrics(
    name='orchestration_execution_time_ms',
    labels={'backend': 'cloud'},
    start_time=time.time() - 3600  # Last hour
)

# Get statistics
stats = monitor.metrics_collector.get_metric_stats(
    name='orchestration_execution_time_ms',
    labels={'backend': 'local_gpu'}
)

print(f"Average time: {stats['avg']:.0f}ms")
print(f"95th percentile: {stats['p95']:.0f}ms")
```

### Export Metrics

```python
# Export as JSON
monitor.export_metrics('metrics.json', format='json')

# Export as CSV
monitor.export_metrics('metrics.csv', format='csv')
```

---

## Real-Time Dashboard

### Web Dashboard (Future)

Planned web-based dashboard with:

- **Real-time updates:** WebSocket-based live updates
- **Interactive charts:** Filter and drill down into metrics
- **Alert management:** View and manage alerts
- **Cost tracking:** Monitor cloud spending
- **Backend comparison:** Compare performance across backends

### Console Dashboard (Current)

Current text-based dashboard:

```python
def print_dashboard(monitor: OrchestrationMonitor):
    data = monitor.get_dashboard_data()

    print("=" * 60)
    print("ORCHESTRATION DASHBOARD")
    print("=" * 60)
    print(f"Time: {data['datetime']}")
    print()

    print("BACKEND DISTRIBUTION")
    for backend, ratio in data['backend_distribution'].items():
        print(f"  {backend}: {ratio:.1%}")
    print()

    print("PERFORMANCE BY BACKEND")
    for backend, perf in data['performance_by_backend'].items():
        print(f"  {backend}:")
        print(f"    Avg: {perf['avg']:.0f}ms")
        print(f"    Count: {perf['count']}")
    print()

    print("COST METRICS")
    cost = data['cost_metrics']
    print(f"  Total: ${cost['total_cost_usd']:.2f}")
    print(f"  Avg per request: ${cost['avg_cost_per_request']:.4f}")
    print()

    print("SUCCESS RATE")
    print(f"  {data['success_rate']:.1%}")
    print()

    print("VRAM USAGE")
    vram = data['vram_usage']
    print(f"  Avg: {vram['avg_gb']:.1f}GB ({vram['avg_percent']:.1f}%)")
    print(f"  Max: {vram['max_gb']:.1f}GB ({vram['max_percent']:.1f}%)")
    print()

    if data['active_alerts']:
        print("ACTIVE ALERTS")
        for alert in data['active_alerts']:
            print(f"  [{alert['severity'].upper()}] {alert['name']}")
            print(f"    {alert['message']}")
    else:
        print("No active alerts")

    print("=" * 60)
```

---

## Metric Statistics

### Available Statistics

For each metric, the following statistics are calculated:

- **count:** Number of samples
- **sum:** Sum of all values
- **avg:** Average value
- **min:** Minimum value
- **max:** Maximum value
- **p50:** Median (50th percentile)
- **p95:** 95th percentile
- **p99:** 99th percentile

### Example

```python
stats = monitor.metrics_collector.get_metric_stats(
    name='orchestration_execution_time_ms',
    labels={'backend': 'local_gpu'}
)

# Returns:
{
    'count': 650,
    'sum': 292825.0,
    'avg': 450.5,
    'min': 5.2,
    'max': 5000.0,
    'p50': 420.0,
    'p95': 1200.0,
    'p99': 3500.0
}
```

---

## Alert Management

### Alert Lifecycle

1. **Triggered:** Alert condition met, added to active alerts
2. **Notified:** Notification handlers called
3. **Resolved:** Condition cleared, removed from active alerts
4. **History:** Alert stored in history

### Alert Resolution

Alerts are automatically resolved when condition clears:

```python
# Manual resolution
monitor.alert_manager.resolve_alert('high_vram_usage')
```

### Alert History

Query historical alerts:

```python
# Get last hour of alerts
alerts = monitor.alert_manager.get_alert_history(
    start_time=time.time() - 3600
)

# Filter by severity
critical_alerts = [a for a in alerts if a.severity == AlertSeverity.CRITICAL]
```

---

## Performance Considerations

### Memory Management

- **Max metrics:** 100,000 by default (configurable)
- **Pruning:** Old metrics automatically removed
- **Aggregation:** Values aggregated for efficiency

### Metric Sampling

For high-frequency metrics, use sampling:

```python
# Sample every 10th metric
if execution_count % 10 == 0:
    monitor.record_execution(...)
```

### Batch Recording

Record multiple metrics efficiently:

```python
# Record multiple related metrics
monitor.metrics_collector.record_metric(
    name='orchestration_execution_time_ms',
    value=time_ms,
    labels={'backend': backend, 'simulation_type': sim_type}
)

monitor.metrics_collector.record_metric(
    name='orchestration_cost_usd',
    value=cost_usd,
    labels={'backend': backend, 'simulation_type': sim_type}
)
```

---

## Best Practices

### 1. Record All Executions

Ensure every execution is recorded:

```python
try:
    result = await execute_simulation(...)
    monitor.record_execution(..., success=True)
except Exception as e:
    monitor.record_execution(..., success=False)
```

### 2. Use Meaningful Labels

Include relevant labels for filtering:

```python
labels = {
    'backend': backend,
    'simulation_type': sim_type,
    'model_size': 'large',
    'batch_size': str(batch_size)
}
```

### 3. Monitor Key Metrics

Focus on critical metrics:

- Success rate
- Cost per request
- Execution time percentiles
- VRAM utilization

### 4. Set Appropriate Thresholds

Base thresholds on historical data:

```python
# Use 95th percentile as threshold
p95_time = stats['p95']
monitor.alert_manager.add_alert_rule(
    name='slow_execution',
    metric_name='orchestration_execution_time_ms',
    condition='gt',
    threshold=p95_time * 1.5  # 1.5x p95
)
```

### 5. Regular Exports

Export metrics regularly for analysis:

```python
# Export daily
import schedule

schedule.every().day.at("00:00").do(
    monitor.export_metrics,
    f'metrics_{date.today()}.json'
)
```

---

## Troubleshooting

### Missing Metrics

**Symptoms:** Dashboard shows incomplete data

**Solutions:**
- Verify all executions are recorded
- Check metric collection is not failing silently
- Review logs for errors

### Alert Not Triggering

**Symptoms:** Expected alert not firing

**Solutions:**
- Check alert condition is correct
- Verify metric is being recorded
- Check threshold value is appropriate
- Review alert evaluation frequency

### High Memory Usage

**Symptoms:** Monitor consuming too much memory

**Solutions:**
- Reduce max_metrics limit
- Implement metric sampling
- Export and clear old metrics regularly
- Use aggregation instead of raw metrics

---

## Future Enhancements

### Planned Features

1. **Web Dashboard:** Interactive web-based dashboard
2. **Custom Charts:** User-defined chart configurations
3. **Metric Export:** Export to Prometheus, Graphite, etc.
4. **Anomaly Detection:** ML-based anomaly detection
5. **Predictive Alerts:** Alert before issues occur

### Integration Options

- **Prometheus:** Export metrics for Prometheus scraping
- **Grafana:** Visualize metrics in Grafana
- **Datadog:** Send metrics to Datadog
- **CloudWatch:** AWS CloudWatch integration

---

*Last Updated: 2026-03-13*
*Version: 1.0.0*
