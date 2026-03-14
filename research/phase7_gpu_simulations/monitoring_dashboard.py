"""
Monitoring Dashboard for Hybrid GPU + Cloud Orchestration

Real-time monitoring of orchestration metrics, backend selection,
performance, and costs with visualization and alerting.

Author: SuperInstance Research Team
Date: 2026-03-13
"""

import time
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics to monitor."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


class AlertSeverity(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Metric:
    """A single metric measurement."""
    name: str
    value: float
    timestamp: float
    labels: Dict[str, str] = field(default_factory=dict)
    metric_type: MetricType = MetricType.GAUGE

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'name': self.name,
            'value': self.value,
            'timestamp': self.timestamp,
            'labels': self.labels,
            'type': self.metric_type.value
        }


@dataclass
class Alert:
    """An alert condition."""
    name: str
    condition: str
    severity: AlertSeverity
    threshold: float
    current_value: float
    message: str
    timestamp: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'name': self.name,
            'condition': self.condition,
            'severity': self.severity.value,
            'threshold': self.threshold,
            'current_value': self.current_value,
            'message': self.message,
            'timestamp': self.timestamp,
            'datetime': datetime.fromtimestamp(self.timestamp).isoformat()
        }


class MetricsCollector:
    """Collect and aggregate metrics."""

    def __init__(self, max_metrics: int = 100000):
        """
        Initialize metrics collector.

        Args:
            max_metrics: Maximum metrics to keep in memory
        """
        self.max_metrics = max_metrics
        self.metrics: List[Metric] = []
        self.metric_aggregates: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            'count': 0,
            'sum': 0.0,
            'min': float('inf'),
            'max': float('-inf'),
            'values': []
        })

    def record_metric(
        self,
        name: str,
        value: float,
        labels: Optional[Dict[str, str]] = None,
        metric_type: MetricType = MetricType.GAUGE
    ):
        """
        Record a metric.

        Args:
            name: Metric name
            value: Metric value
            labels: Optional labels
            metric_type: Type of metric
        """
        metric = Metric(
            name=name,
            value=value,
            timestamp=time.time(),
            labels=labels or {},
            metric_type=metric_type
        )

        self.metrics.append(metric)

        # Update aggregates
        key = self._make_metric_key(name, labels)
        self._update_aggregate(key, value)

        # Prune old metrics
        if len(self.metrics) > self.max_metrics:
            self.metrics = self.metrics[-self.max_metrics:]

    def _make_metric_key(
        self,
        name: str,
        labels: Optional[Dict[str, str]]
    ) -> str:
        """Create unique key for metric."""
        if not labels:
            return name

        label_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"

    def _update_aggregate(self, key: str, value: float):
        """Update aggregate statistics."""
        agg = self.metric_aggregates[key]

        agg['count'] += 1
        agg['sum'] += value
        agg['min'] = min(agg['min'], value)
        agg['max'] = max(agg['max'], value)

        # Keep last 100 values for percentile calculation
        agg['values'].append(value)
        if len(agg['values']) > 100:
            agg['values'] = agg['values'][-100:]

    def get_metric_stats(
        self,
        name: str,
        labels: Optional[Dict[str, str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get statistics for a metric.

        Args:
            name: Metric name
            labels: Optional labels

        Returns:
            Dictionary with statistics or None
        """
        key = self._make_metric_key(name, labels)
        agg = self.metric_aggregates.get(key)

        if not agg or agg['count'] == 0:
            return None

        values = sorted(agg['values'])

        return {
            'count': agg['count'],
            'sum': agg['sum'],
            'avg': agg['sum'] / agg['count'],
            'min': agg['min'],
            'max': agg['max'],
            'p50': values[len(values) // 2] if values else 0,
            'p95': values[int(len(values) * 0.95)] if values else 0,
            'p99': values[int(len(values) * 0.99)] if values else 0
        }

    def query_metrics(
        self,
        name: Optional[str] = None,
        labels: Optional[Dict[str, str]] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> List[Metric]:
        """
        Query metrics with filters.

        Args:
            name: Optional metric name filter
            labels: Optional label filters
            start_time: Optional start time
            end_time: Optional end time

        Returns:
            List of matching metrics
        """
        filtered = self.metrics

        # Filter by name
        if name:
            filtered = [m for m in filtered if m.name == name]

        # Filter by labels
        if labels:
            filtered = [
                m for m in filtered
                if all(m.labels.get(k) == v for k, v in labels.items())
            ]

        # Filter by time range
        if start_time:
            filtered = [m for m in filtered if m.timestamp >= start_time]

        if end_time:
            filtered = [m for m in filtered if m.timestamp <= end_time]

        return filtered


class AlertManager:
    """Manage alert conditions and notifications."""

    def __init__(self):
        """Initialize alert manager."""
        self.alert_rules: Dict[str, Dict[str, Any]] = {}
        self.active_alerts: List[Alert] = []
        self.alert_history: List[Alert] = []
        self.notification_handlers: List[callable] = []

    def add_alert_rule(
        self,
        name: str,
        metric_name: str,
        condition: str,  # "gt", "lt", "eq", "gte", "lte"
        threshold: float,
        severity: AlertSeverity = AlertSeverity.WARNING,
        message_template: str = None
    ):
        """
        Add an alert rule.

        Args:
            name: Alert name
            metric_name: Metric to monitor
            condition: Comparison condition
            threshold: Threshold value
            severity: Alert severity
            message_template: Optional message template
        """
        self.alert_rules[name] = {
            'metric_name': metric_name,
            'condition': condition,
            'threshold': threshold,
            'severity': severity,
            'message_template': message_template or f"{name} alert triggered"
        }

        logger.info(f"Added alert rule: {name}")

    def remove_alert_rule(self, name: str):
        """
        Remove an alert rule.

        Args:
            name: Alert name
        """
        if name in self.alert_rules:
            del self.alert_rules[name]
            logger.info(f"Removed alert rule: {name}")

    def evaluate_alerts(self, metrics_collector: MetricsCollector):
        """
        Evaluate all alert rules against current metrics.

        Args:
            metrics_collector: Metrics collector instance
        """
        for name, rule in self.alert_rules.items():
            # Get latest metric value
            metrics = metrics_collector.query_metrics(
                name=rule['metric_name'],
                start_time=time.time() - 300  # Last 5 minutes
            )

            if not metrics:
                continue

            latest_metric = metrics[-1]
            current_value = latest_metric.value

            # Check condition
            triggered = False
            condition = rule['condition']

            if condition == 'gt' and current_value > rule['threshold']:
                triggered = True
            elif condition == 'lt' and current_value < rule['threshold']:
                triggered = True
            elif condition == 'eq' and current_value == rule['threshold']:
                triggered = True
            elif condition == 'gte' and current_value >= rule['threshold']:
                triggered = True
            elif condition == 'lte' and current_value <= rule['threshold']:
                triggered = True

            if triggered:
                self._trigger_alert(name, rule, current_value)

    def _trigger_alert(
        self,
        name: str,
        rule: Dict[str, Any],
        current_value: float
    ):
        """Trigger an alert."""
        # Check if already active
        if any(a.name == name for a in self.active_alerts):
            return  # Already active

        alert = Alert(
            name=name,
            condition=rule['condition'],
            severity=rule['severity'],
            threshold=rule['threshold'],
            current_value=current_value,
            message=rule['message_template'].format(
                value=current_value,
                threshold=rule['threshold']
            ),
            timestamp=time.time()
        )

        self.active_alerts.append(alert)
        self.alert_history.append(alert)

        # Send notifications
        for handler in self.notification_handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(f"Notification handler failed: {e}")

        logger.warning(f"Alert triggered: {name} - {alert.message}")

    def resolve_alert(self, name: str):
        """
        Resolve an active alert.

        Args:
            name: Alert name
        """
        self.active_alerts = [a for a in self.active_alerts if a.name != name]
        logger.info(f"Alert resolved: {name}")

    def add_notification_handler(self, handler: callable):
        """
        Add notification handler.

        Args:
            handler: Callable that takes Alert as argument
        """
        self.notification_handlers.append(handler)

    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts."""
        return self.active_alerts.copy()

    def get_alert_history(
        self,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> List[Alert]:
        """
        Get alert history.

        Args:
            start_time: Optional start time
            end_time: Optional end time

        Returns:
            List of alerts
        """
        history = self.alert_history

        if start_time:
            history = [a for a in history if a.timestamp >= start_time]

        if end_time:
            history = [a for a in history if a.timestamp <= end_time]

        return history


class OrchestrationMonitor:
    """
    Monitor orchestration system performance and metrics.

    Tracks:
    - Backend selection distribution
    - Performance metrics
    - Cost tracking
    - Resource utilization
    - Success rates
    """

    def __init__(self):
        """Initialize orchestration monitor."""
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager()

        # Setup default alert rules
        self._setup_default_alerts()

        # Dashboard state
        self.dashboard_data: Dict[str, Any] = {}
        self.last_update = 0

    def _setup_default_alerts(self):
        """Setup default alert rules."""
        # High failure rate alert
        self.alert_manager.add_alert_rule(
            name='high_failure_rate',
            metric_name='orchestration_success_rate',
            condition='lt',
            threshold=0.9,
            severity=AlertSeverity.ERROR,
            message_template='Failure rate high: {value:.1%} (threshold: {threshold:.1%})'
        )

        # High cost alert
        self.alert_manager.add_alert_rule(
            name='high_cloud_cost',
            metric_name='cloud_cost_total_usd',
            condition='gt',
            threshold=10.0,
            severity=AlertSeverity.WARNING,
            message_template='Cloud cost high: ${value:.2f} (threshold: ${threshold:.2f})'
        )

        # High VRAM usage alert
        self.alert_manager.add_alert_rule(
            name='high_vram_usage',
            metric_name='local_vram_usage_percent',
            condition='gt',
            threshold=90,
            severity=AlertSeverity.WARNING,
            message_template='VRAM usage high: {value:.1f}% (threshold: {threshold:.1f}%)'
        )

    def record_execution(
        self,
        backend: str,
        simulation_type: str,
        execution_time_ms: float,
        cost_usd: float,
        success: bool,
        vram_used_gb: float = 0
    ):
        """
        Record execution metrics.

        Args:
            backend: Backend used
            simulation_type: Type of simulation
            execution_time_ms: Execution time
            cost_usd: Cost in USD
            success: Whether successful
            vram_used_gb: VRAM used in GB
        """
        labels = {
            'backend': backend,
            'simulation_type': simulation_type
        }

        # Record metrics
        self.metrics_collector.record_metric(
            name='orchestration_execution_time_ms',
            value=execution_time_ms,
            labels=labels
        )

        self.metrics_collector.record_metric(
            name='orchestration_cost_usd',
            value=cost_usd,
            labels=labels
        )

        self.metrics_collector.record_metric(
            name='orchestration_success',
            value=1.0 if success else 0.0,
            labels=labels
        )

        if backend == 'local_gpu':
            self.metrics_collector.record_metric(
                name='local_vram_usage_gb',
                value=vram_used_gb,
                labels=labels
            )

            # Calculate percentage of total VRAM (6GB)
            vram_percent = (vram_used_gb / 6.0) * 100
            self.metrics_collector.record_metric(
                name='local_vram_usage_percent',
                value=vram_percent,
                labels=labels
            )

        # Evaluate alerts
        self._evaluate_health_metrics()

    def _evaluate_health_metrics(self):
        """Evaluate health metrics and trigger alerts if needed."""
        # Calculate success rate
        success_metrics = self.metrics_collector.query_metrics(
            name='orchestration_success',
            start_time=time.time() - 3600  # Last hour
        )

        if success_metrics:
            success_rate = sum(m.value for m in success_metrics) / len(success_metrics)
            self.metrics_collector.record_metric(
                name='orchestration_success_rate',
                value=success_rate
            )

        # Calculate total cloud cost
        cost_metrics = self.metrics_collector.query_metrics(
            name='orchestration_cost_usd',
            labels={'backend': 'cloud'}
        )

        if cost_metrics:
            total_cost = sum(m.value for m in cost_metrics)
            self.metrics_collector.record_metric(
                name='cloud_cost_total_usd',
                value=total_cost
            )

        # Evaluate alerts
        self.alert_manager.evaluate_alerts(self.metrics_collector)

    def get_dashboard_data(self) -> Dict[str, Any]:
        """
        Get current dashboard data.

        Returns:
            Dictionary with dashboard metrics
        """
        # Update if data is stale (> 5 seconds)
        if time.time() - self.last_update > 5:
            self._update_dashboard_data()
            self.last_update = time.time()

        return self.dashboard_data

    def _update_dashboard_data(self):
        """Update dashboard data from metrics."""
        now = time.time()
        hour_ago = now - 3600

        # Backend distribution
        backend_counts = defaultdict(int)
        for metric in self.metrics_collector.query_metrics(
            name='orchestration_execution_time_ms',
            start_time=hour_ago
        ):
            backend_counts[metric.labels.get('backend', 'unknown')] += 1

        total = sum(backend_counts.values())
        backend_distribution = {
            backend: count / total if total > 0 else 0
            for backend, count in backend_counts.items()
        }

        # Performance metrics by backend
        performance_by_backend = {}
        for backend in ['local_gpu', 'cloud']:
            exec_times = [
                m.value for m in self.metrics_collector.query_metrics(
                    name='orchestration_execution_time_ms',
                    labels={'backend': backend},
                    start_time=hour_ago
                )
            ]

            if exec_times:
                performance_by_backend[backend] = {
                    'avg': sum(exec_times) / len(exec_times),
                    'min': min(exec_times),
                    'max': max(exec_times),
                    'count': len(exec_times)
                }

        # Cost metrics
        cloud_costs = [
            m.value for m in self.metrics_collector.query_metrics(
                name='orchestration_cost_usd',
                labels={'backend': 'cloud'},
                start_time=hour_ago
            )
        ]

        cost_metrics = {
            'total_cost_usd': sum(cloud_costs),
            'avg_cost_per_request': sum(cloud_costs) / len(cloud_costs) if cloud_costs else 0,
            'request_count': len(cloud_costs)
        }

        # Success rate
        success_metrics = self.metrics_collector.query_metrics(
            name='orchestration_success',
            start_time=hour_ago
        )

        if success_metrics:
            success_rate = sum(m.value for m in success_metrics) / len(success_metrics)
        else:
            success_rate = 1.0

        # VRAM usage
        vram_metrics = self.metrics_collector.query_metrics(
            name='local_vram_usage_gb',
            start_time=hour_ago
        )

        if vram_metrics:
            vram_values = [m.value for m in vram_metrics]
            vram_usage = {
                'avg_gb': sum(vram_values) / len(vram_values),
                'max_gb': max(vram_values),
                'avg_percent': (sum(vram_values) / len(vram_values) / 6.0) * 100,
                'max_percent': (max(vram_values) / 6.0) * 100
            }
        else:
            vram_usage = {
                'avg_gb': 0,
                'max_gb': 0,
                'avg_percent': 0,
                'max_percent': 0
            }

        # Active alerts
        active_alerts = [a.to_dict() for a in self.alert_manager.get_active_alerts()]

        # Compile dashboard data
        self.dashboard_data = {
            'timestamp': now,
            'datetime': datetime.fromtimestamp(now).isoformat(),
            'backend_distribution': backend_distribution,
            'performance_by_backend': performance_by_backend,
            'cost_metrics': cost_metrics,
            'success_rate': success_rate,
            'vram_usage': vram_usage,
            'active_alerts': active_alerts,
            'total_executions_last_hour': total
        }

    def get_metrics_summary(self) -> Dict[str, Any]:
        """
        Get summary of all metrics.

        Returns:
            Dictionary with metrics summary
        """
        return {
            'total_metrics': len(self.metrics_collector.metrics),
            'metric_names': list(set(m.name for m in self.metrics_collector.metrics)),
            'active_alerts': len(self.alert_manager.get_active_alerts()),
            'total_alerts': len(self.alert_manager.alert_history),
            'last_update': datetime.now().isoformat()
        }

    def export_metrics(self, filepath: str, format: str = 'json'):
        """
        Export metrics to file.

        Args:
            filepath: Path to export file
            format: Export format ('json' or 'csv')
        """
        if format == 'json':
            data = {
                'metrics': [m.to_dict() for m in self.metrics_collector.metrics],
                'alerts': [a.to_dict() for a in self.alert_manager.alert_history],
                'dashboard': self.get_dashboard_data()
            }

            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)

        elif format == 'csv':
            # Export metrics as CSV
            import csv

            with open(filepath, 'w', newline='') as f:
                writer = csv.writer(f)

                # Header
                writer.writerow([
                    'timestamp', 'name', 'value', 'type',
                    'backend', 'simulation_type'
                ])

                # Data
                for metric in self.metrics_collector.metrics:
                    writer.writerow([
                        metric.timestamp,
                        metric.name,
                        metric.value,
                        metric.metric_type.value,
                        metric.labels.get('backend', ''),
                        metric.labels.get('simulation_type', '')
                    ])

        logger.info(f"Exported metrics to {filepath}")


# Convenience function for logging handler
def logging_alert_handler(alert: Alert):
    """
    Log alerts to standard logging.

    Args:
        alert: Alert to log
    """
    severity = alert.severity.value.upper()

    log_msg = f"Alert: {alert.name} | {alert.message} | Value: {alert.current_value}"

    if severity == 'CRITICAL':
        logger.critical(log_msg)
    elif severity == 'ERROR':
        logger.error(log_msg)
    elif severity == 'WARNING':
        logger.warning(log_msg)
    else:
        logger.info(log_msg)
