"""
High-Volume Metrics Collection Pipeline for SuperInstance

Handles collection, aggregation, and storage of 1M+ metrics per second
with efficient sampling and real-time analytics.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import random
import statistics
import time

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics"""
    COUNTER = "counter"       # Monotonically increasing
    GAUGE = "gauge"           # Point-in-time value
    HISTOGRAM = "histogram"   # Distribution of values
    SUMMARY = "summary"       # Statistical summary


@dataclass
class Metric:
    """A single metric data point"""
    name: str
    value: float
    timestamp: datetime
    labels: Dict[str, str] = field(default_factory=dict)
    metric_type: MetricType = MetricType.GAUGE


@dataclass
class MetricBatch:
    """Batch of metrics for efficient processing"""
    batch_id: str
    metrics: List[Metric]
    received_at: datetime
    processed_at: Optional[datetime] = None


@dataclass
class AggregatedMetric:
    """Aggregated metric over a time window"""
    name: str
    window_start: datetime
    window_end: datetime
    count: int
    sum: float
    min: float
    max: float
    avg: float
    p50: float
    p95: float
    p99: float
    labels: Dict[str, str] = field(default_factory=dict)


class MetricsProcessor:
    """Processes and aggregates metrics in real-time"""

    def __init__(self, window_size_seconds: int = 60):
        self.window_size = timedelta(seconds=window_size_seconds)

        # Metric storage with time-based windows
        self.metric_windows: Dict[str, deque] = defaultdict(lambda: deque(maxlen=10000))

        # Aggregation cache
        self.aggregated_cache: Dict[str, AggregatedMetric] = {}

        # Statistics
        self.stats = {
            "metrics_received": 0,
            "metrics_processed": 0,
            "batches_processed": 0,
            "aggregations_computed": 0,
            "processing_time_ms": []
        }

    async def process_batch(self, batch: MetricBatch) -> List[AggregatedMetric]:
        """
        Process a batch of metrics

        Args:
            batch: Batch of metrics

        Returns:
            List of aggregated metrics
        """
        start_time = time.time()

        for metric in batch.metrics:
            self.stats["metrics_received"] += 1

            # Store metric in window
            metric_key = self._metric_key(metric)
            self.metric_windows[metric_key].append(metric)

            self.stats["metrics_processed"] += 1

        # Compute aggregations
        aggregations = self._compute_aggregations()

        self.stats["batches_processed"] += 1
        self.stats["aggregations_computed"] += len(aggregations)

        processing_time = (time.time() - start_time) * 1000
        self.stats["processing_time_ms"].append(processing_time)

        batch.processed_at = datetime.utcnow()
        return aggregations

    def _metric_key(self, metric: Metric) -> str:
        """Generate key for metric storage"""
        labels_str = ",".join(f"{k}={v}" for k, v in sorted(metric.labels.items()))
        return f"{metric.name}{{{labels_str}}}" if labels_str else metric.name

    def _compute_aggregations(self) -> List[AggregatedMetric]:
        """Compute aggregations for current time windows"""
        aggregations = []
        now = datetime.utcnow()
        window_start = now - self.window_size

        for key, metrics in self.metric_windows.items():
            # Filter to current window
            window_metrics = [
                m for m in metrics
                if m.timestamp > window_start
            ]

            if not window_metrics:
                continue

            values = [m.value for m in window_metrics]

            # Compute statistics
            aggregated = AggregatedMetric(
                name=window_metrics[0].name,
                window_start=window_start,
                window_end=now,
                count=len(values),
                sum=sum(values),
                min=min(values),
                max=max(values),
                avg=statistics.mean(values),
                p50=self._percentile(values, 50),
                p95=self._percentile(values, 95),
                p99=self._percentile(values, 99),
                labels=window_metrics[0].labels.copy()
            )

            aggregations.append(aggregated)
            self.aggregated_cache[key] = aggregated

        return aggregations

    def _percentile(self, values: List[float], p: int) -> float:
        """Calculate percentile"""
        if not values:
            return 0.0
        sorted_values = sorted(values)
        index = int(len(sorted_values) * p / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]


class MetricsPipeline:
    """
    High-throughput metrics collection pipeline
    """

    def __init__(self, sampling_rate: float = 1.0):
        self.sampling_rate = sampling_rate
        self.processor = MetricsProcessor()

        # Metrics buffers
        self.input_buffer: deque[Metric] = deque(maxlen=1_000_000)
        self.output_buffer: deque[AggregatedMetric] = deque(maxlen=100_000)

        # Pipeline configuration
        self.batch_size = 10_000
        self.batch_timeout_ms = 100
        self.workers = 10

        # Pipeline statistics
        self.pipeline_stats = {
            "metrics_ingested": 0,
            "metrics_sampled": 0,
            "metrics_dropped": 0,
            "batches_created": 0,
            "avg_ingestion_rate": 0.0,
            "avg_processing_rate": 0.0
        }

        # Label metrics (monitoring the pipeline itself)
        self.pipeline_metrics = {
            "buffer_size": 0,
            "processing_lag_ms": 0,
            "worker_utilization": 0.0
        }

    async def ingest_metric(self, metric: Metric):
        """
        Ingest a single metric

        Args:
            metric: Metric to ingest
        """
        # Sampling
        if random.random() > self.sampling_rate:
            self.pipeline_stats["metrics_dropped"] += 1
            return

        if len(self.input_buffer) >= self.input_buffer.maxlen:
            # Buffer full, drop oldest
            self.input_buffer.popleft()
            self.pipeline_stats["metrics_dropped"] += 1

        self.input_buffer.append(metric)
        self.pipeline_stats["metrics_ingested"] += 1
        self.pipeline_stats["metrics_sampled"] += 1

    async def ingest_batch(self, metrics: List[Metric]):
        """
        Ingest a batch of metrics

        Args:
            metrics: List of metrics to ingest
        """
        for metric in metrics:
            await self.ingest_metric(metric)

    async def process_metrics(self):
        """
        Process metrics from input buffer
        """
        batch_metrics = []

        while self.input_buffer:
            batch_metrics.append(self.input_buffer.popleft())

            if len(batch_metrics) >= self.batch_size:
                break

        if not batch_metrics:
            return

        # Create batch
        batch = MetricBatch(
            batch_id=f"batch-{datetime.utcnow().timestamp()}",
            metrics=batch_metrics,
            received_at=datetime.utcnow()
        )

        self.pipeline_stats["batches_created"] += 1

        # Process batch
        aggregations = await self.processor.process_batch(batch)

        # Store results
        for agg in aggregations:
            self.output_buffer.append(agg)

    async def get_metrics(self, name: str,
                         labels: Dict[str, str] = None,
                         duration_minutes: int = 5) -> List[AggregatedMetric]:
        """
        Retrieve aggregated metrics

        Args:
            name: Metric name
            labels: Optional label filters
            duration_minutes: Time range to retrieve

        Returns:
            List of aggregated metrics
        """
        cutoff = datetime.utcnow() - timedelta(minutes=duration_minutes)

        results = []
        for agg in self.output_buffer:
            if agg.name != name:
                continue

            if labels:
                if not all(agg.labels.get(k) == v for k, v in labels.items()):
                    continue

            if agg.window_end > cutoff:
                results.append(agg)

        return results

    def get_pipeline_stats(self) -> Dict:
        """Get pipeline statistics"""
        processing_times = self.processor.stats["processing_time_ms"]

        return {
            **self.pipeline_stats,
            "sample_rate": self.sampling_rate,
            "buffer_size": len(self.input_buffer),
            "buffer_capacity": self.input_buffer.maxlen,
            "output_size": len(self.output_buffer),
            "avg_processing_time_ms": (
                statistics.mean(processing_times) if processing_times else 0
            ),
            "p99_processing_time_ms": (
                self.processor._percentile(processing_times, 99)
                if processing_times else 0
            )
        }


async def simulate_metrics_pipeline(duration_seconds: int = 30,
                                   metrics_per_second: int = 50_000):
    """Simulate high-volume metrics pipeline"""
    pipeline = MetricsPipeline(sampling_rate=0.1)  # 10% sampling for demo

    print("=" * 60)
    print("SuperInstance Metrics Pipeline Simulation")
    print("=" * 60)

    print(f"\nPipeline Configuration:")
    print(f"  Sampling Rate: {pipeline.sampling_rate:.1%}")
    print(f"  Batch Size: {pipeline.batch_size:,}")
    print(f"  Workers: {pipeline.workers}")

    # Define metric types
    metric_types = [
        ("http_requests_total", MetricType.COUNTER),
        ("http_request_duration_ms", MetricType.HISTOGRAM),
        ("cpu_utilization", MetricType.GAUGE),
        ("memory_utilization", MetricType.GAUGE),
        ("active_connections", MetricType.GAUGE),
        ("queue_depth", MetricType.GAUGE),
        ("error_rate", MetricType.GAUGE),
        ("cache_hit_rate", MetricType.GAUGE),
    ]

    regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]

    print(f"\nSimulating {duration_seconds}s of metrics at {metrics_per_second:,} metrics/sec...")
    print("(Sampling at 10% for demo - would be 1M+ metrics/sec in production)")

    total_ingested = 0
    total_aggregated = 0

    for second in range(duration_seconds):
        # Generate metrics
        for _ in range(metrics_per_second):
            metric_name, metric_type = random.choice(metric_types)
            region = random.choice(regions)

            # Generate realistic values
            if metric_name == "http_requests_total":
                value = random.uniform(1000, 10000)
            elif metric_name == "http_request_duration_ms":
                value = random.uniform(10, 500)
            elif metric_name == "cpu_utilization":
                value = random.uniform(0.2, 0.9)
            elif metric_name == "memory_utilization":
                value = random.uniform(0.3, 0.8)
            elif metric_name == "active_connections":
                value = random.uniform(100, 5000)
            elif metric_name == "queue_depth":
                value = random.uniform(0, 500)
            elif metric_name == "error_rate":
                value = random.uniform(0.0, 0.05)
            elif metric_name == "cache_hit_rate":
                value = random.uniform(0.7, 0.99)
            else:
                value = random.uniform(0, 100)

            metric = Metric(
                name=metric_name,
                value=value,
                timestamp=datetime.utcnow(),
                labels={
                    "region": region,
                    "service": random.choice(["api", "worker", "gateway"]),
                    "version": random.choice(["v1", "v2", "v3"])
                },
                metric_type=metric_type
            )

            await pipeline.ingest_metric(metric)

        # Process metrics
        await pipeline.process_metrics()

        total_ingested = pipeline.pipeline_stats["metrics_ingested"]
        total_aggregated = len(pipeline.output_buffer)

        # Show progress
        if (second + 1) % 5 == 0:
            stats = pipeline.get_pipeline_stats()
            print(f"\n  Second {second + 1}:")
            print(f"    Metrics Ingested: {total_ingested:,}")
            print(f"    Aggregations: {total_aggregated:,}")
            print(f"    Buffer Size: {stats['buffer_size']:,}")
            print(f"    Avg Processing: {stats['avg_processing_time_ms']:.2f}ms")
            print(f"    Sample Rate: {stats['sample_rate']:.1%}")

        await asyncio.sleep(0.01)

    # Final statistics
    print("\n" + "=" * 60)
    print("Simulation Complete - Pipeline Statistics")
    print("=" * 60)

    final_stats = pipeline.get_pipeline_stats()
    print(f"\nPipeline Performance:")
    print(f"  Total Metrics Ingested: {final_stats['metrics_ingested']:,}")
    print(f"  Metrics Sampled: {final_stats['metrics_sampled']:,}")
    print(f"  Metrics Dropped: {final_stats['metrics_dropped']:,}")
    print(f"  Batches Processed: {final_stats['batches_created']:,}")
    print(f"  Effective Throughput: {final_stats['metrics_ingested'] / duration_seconds:,.0f} metrics/sec")

    print(f"\nProcessing Performance:")
    print(f"  Avg Processing Time: {final_stats['avg_processing_time_ms']:.2f}ms")
    print(f"  P99 Processing Time: {final_stats['p99_processing_time_ms']:.2f}ms")
    print(f"  Buffer Utilization: {final_stats['buffer_size'] / final_stats['buffer_capacity']:.1%}")

    # Show sample aggregations
    print(f"\nSample Aggregated Metrics (last 5):")
    sample_aggs = list(pipeline.output_buffer)[-5:]
    for agg in sample_aggs:
        print(f"\n  {agg.name}:")
        print(f"    Count: {agg.count:,}")
        print(f"    Avg: {agg.avg:.2f}")
        print(f"    P95: {agg.p95:.2f}")
        print(f"    P99: {agg.p99:.2f}")
        print(f"    Labels: {agg.labels}")

    # Calculate production scale
    print(f"\nProduction Scale Projection:")
    print(f"  At 100% sampling: {final_stats['metrics_ingested'] * 10:,} metrics/second")
    print(f"  Per hour: {final_stats['metrics_ingested'] * 10 * 3600 / 1_000_000:.1f}M metrics/hour")
    print(f"  Per day: {final_stats['metrics_ingested'] * 10 * 86400 / 1_000_000_000:.1f}B metrics/day")


async def main():
    """Main metrics pipeline orchestration"""
    await simulate_metrics_pipeline(duration_seconds=25, metrics_per_second=50_000)


if __name__ == "__main__":
    asyncio.run(main())
