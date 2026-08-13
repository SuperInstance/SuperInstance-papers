"""
Metrics Collection Utilities
Provides metrics collection infrastructure for POLLN profiling.
"""

import time
import threading
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple
import statistics


class MetricType(Enum):
    """Types of metrics that can be collected."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMING = "timing"


@dataclass
class MetricSample:
    """A single metric sample with metadata."""
    timestamp: float
    value: float
    labels: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class HistogramBucket:
    """A histogram bucket for value distribution."""
    upper_bound: float
    count: int = 0


class MetricsCollector:
    """
    Thread-safe metrics collector for profiling data.

    Collects various metric types:
    - Counters: Monotonically increasing values
    - Gauges: Point-in-time values
    - Histograms: Value distributions
    - Timings: Duration measurements
    """

    def __init__(self, max_samples: int = 10000):
        """
        Initialize the metrics collector.

        Args:
            max_samples: Maximum number of samples to keep per metric
        """
        self._lock = threading.RLock()
        self._max_samples = max_samples

        # Metric storage
        self._counters: Dict[str, float] = defaultdict(float)
        self._gauges: Dict[str, MetricSample] = {}
        self._histograms: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_samples))
        self._timings: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_samples))

        # Histogram buckets (for distribution tracking)
        self._histogram_buckets: Dict[str, List[HistogramBucket]] = {}

        # Metadata
        self._labels: Dict[str, Dict[str, str]] = defaultdict(dict)
        self._created_at: Dict[str, float] = {}

    def register_counter(
        self,
        name: str,
        labels: Optional[Dict[str, str]] = None
    ) -> None:
        """Register a new counter metric."""
        with self._lock:
            self._counters[name] = 0.0
            if labels:
                self._labels[name].update(labels)
            self._created_at[name] = time.time()

    def register_gauge(
        self,
        name: str,
        labels: Optional[Dict[str, str]] = None
    ) -> None:
        """Register a new gauge metric."""
        with self._lock:
            self._gauges[name] = MetricSample(timestamp=time.time(), value=0.0)
            if labels:
                self._labels[name].update(labels)
            self._created_at[name] = time.time()

    def register_histogram(
        self,
        name: str,
        buckets: Optional[List[float]] = None,
        labels: Optional[Dict[str, str]] = None
    ) -> None:
        """
        Register a new histogram metric.

        Args:
            name: Metric name
            buckets: Bucket upper bounds (default: exponential)
            labels: Optional labels
        """
        with self._lock:
            if buckets is None:
                # Default exponential buckets
                buckets = [
                    0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25,
                    0.5, 1.0, 2.5, 5.0, 10.0, float('inf')
                ]

            self._histogram_buckets[name] = [
                HistogramBucket(upper_bound=b) for b in buckets
            ]
            if labels:
                self._labels[name].update(labels)
            self._created_at[name] = time.time()

    def register_timing(
        self,
        name: str,
        labels: Optional[Dict[str, str]] = None
    ) -> None:
        """Register a new timing metric."""
        with self._lock:
            if labels:
                self._labels[name].update(labels)
            self._created_at[name] = time.time()

    def increment_counter(
        self,
        name: str,
        value: float = 1.0,
        timestamp: Optional[float] = None
    ) -> None:
        """Increment a counter metric."""
        with self._lock:
            if name not in self._counters:
                self.register_counter(name)
            self._counters[name] += value

    def set_gauge(
        self,
        name: str,
        value: float,
        timestamp: Optional[float] = None
    ) -> None:
        """Set a gauge metric value."""
        with self._lock:
            if name not in self._gauges:
                self.register_gauge(name)

            self._gauges[name] = MetricSample(
                timestamp=timestamp or time.time(),
                value=value,
                labels=self._labels[name].copy()
            )

    def observe_histogram(
        self,
        name: str,
        value: float,
        timestamp: Optional[float] = None
    ) -> None:
        """Observe a value for a histogram metric."""
        with self._lock:
            if name not in self._histogram_buckets:
                self.register_histogram(name)

            # Store the raw value
            self._histograms[name].append(MetricSample(
                timestamp=timestamp or time.time(),
                value=value,
                labels=self._labels[name].copy()
            ))

            # Update bucket counts
            for bucket in self._histogram_buckets[name]:
                if value <= bucket.upper_bound:
                    bucket.count += 1

    def observe_timing(
        self,
        name: str,
        duration: float,
        timestamp: Optional[float] = None
    ) -> None:
        """Observe a timing duration."""
        with self._lock:
            self._timings[name].append(MetricSample(
                timestamp=timestamp or time.time(),
                value=duration,
                labels=self._labels[name].copy() if name in self._labels else {}
            ))

    def get_counter(self, name: str) -> Optional[float]:
        """Get the current value of a counter."""
        with self._lock:
            return self._counters.get(name)

    def get_gauge(self, name: str) -> Optional[MetricSample]:
        """Get the current value of a gauge."""
        with self._lock:
            return self._gauges.get(name)

    def get_histogram_samples(
        self,
        name: str,
        since: Optional[float] = None
    ) -> List[MetricSample]:
        """Get histogram samples since a timestamp."""
        with self._lock:
            if name not in self._histograms:
                return []

            if since is None:
                return list(self._histograms[name])

            return [
                s for s in self._histograms[name]
                if s.timestamp >= since
            ]

    def get_timing_samples(
        self,
        name: str,
        since: Optional[float] = None
    ) -> List[MetricSample]:
        """Get timing samples since a timestamp."""
        with self._lock:
            if name not in self._timings:
                return []

            if since is None:
                return list(self._timings[name])

            return [
                s for s in self._timings[name]
                if s.timestamp >= since
            ]

    def get_histogram_stats(
        self,
        name: str,
        since: Optional[float] = None
    ) -> Optional[Dict[str, float]]:
        """
        Get histogram statistics.

        Returns:
            Dict with count, sum, min, max, avg, p50, p90, p95, p99
        """
        samples = self.get_histogram_samples(name, since)
        if not samples:
            return None

        values = [s.value for s in samples]

        return {
            'count': len(values),
            'sum': sum(values),
            'min': min(values),
            'max': max(values),
            'avg': statistics.mean(values),
            'p50': statistics.median(values),
            'p90': self._percentile(values, 0.90),
            'p95': self._percentile(values, 0.95),
            'p99': self._percentile(values, 0.99),
        }

    def get_timing_stats(
        self,
        name: str,
        since: Optional[float] = None
    ) -> Optional[Dict[str, float]]:
        """Get timing statistics."""
        return self.get_histogram_stats(name, since)

    def _percentile(self, values: List[float], p: float) -> float:
        """Calculate percentile of sorted values."""
        if not values:
            return 0.0

        sorted_values = sorted(values)
        k = (len(sorted_values) - 1) * p
        f = int(k)
        c = f + 1

        if c >= len(sorted_values):
            return sorted_values[f]

        return sorted_values[f] + (k - f) * (sorted_values[c] - sorted_values[f])

    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all metrics as a dictionary."""
        with self._lock:
            return {
                'counters': dict(self._counters),
                'gauges': {
                    name: {
                        'value': sample.value,
                        'timestamp': sample.timestamp,
                        'labels': sample.labels,
                    }
                    for name, sample in self._gauges.items()
                },
                'histograms': {
                    name: self.get_histogram_stats(name)
                    for name in self._histogram_buckets.keys()
                },
                'timings': {
                    name: self.get_timing_stats(name)
                    for name in self._timings.keys()
                },
                'created_at': self._created_at.copy(),
            }

    def clear(self) -> None:
        """Clear all metrics."""
        with self._lock:
            self._counters.clear()
            self._gauges.clear()
            self._histograms.clear()
            self._timings.clear()
            self._histogram_buckets.clear()
            self._labels.clear()
            self._created_at.clear()

    def export_prometheus(self) -> str:
        """Export metrics in Prometheus text format."""
        lines = []

        # Export counters
        for name, value in self._counters.items():
            labels = self._labels.get(name, {})
            label_str = self._format_labels(labels)
            lines.append(f'{name}{label_str} {value}')

        # Export gauges
        for name, sample in self._gauges.items():
            labels = self._labels.get(name, {})
            label_str = self._format_labels(labels)
            lines.append(f'{name}{label_str} {sample.value}')

        # Export histograms
        for name, buckets in self._histogram_buckets.items():
            stats = self.get_histogram_stats(name)
            if stats:
                labels = self._labels.get(name, {})
                label_str = self._format_labels(labels)

                # Bucket counts
                cumulative = 0
                for bucket in buckets:
                    cumulative += bucket.count
                    le_label = f'le="{bucket.upper_bound}"'
                    bucket_label_str = label_str.replace('}', ',' + le_label + '}')
                    lines.append(f'{name}_bucket{bucket_label_str} {cumulative}')

                # Sum and count
                lines.append(f'{name}_sum{label_str} {stats["sum"]}')
                lines.append(f'{name}_count{label_str} {stats["count"]}')

        return '\n'.join(lines)

    def _format_labels(self, labels: Dict[str, str]) -> str:
        """Format labels for Prometheus export."""
        if not labels:
            return ''

        label_str = ','.join(f'{k}="{v}"' for k, v in labels.items())
        return f'{{{label_str}}}'


class TimingContext:
    """Context manager for timing operations."""

    def __init__(
        self,
        collector: MetricsCollector,
        metric_name: str,
        labels: Optional[Dict[str, str]] = None
    ):
        self._collector = collector
        self._metric_name = metric_name
        self._labels = labels or {}
        self._start_time = None

    def __enter__(self):
        self._start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self._start_time
        self._collector.observe_timing(
            self._metric_name,
            duration,
            labels=self._labels
        )
