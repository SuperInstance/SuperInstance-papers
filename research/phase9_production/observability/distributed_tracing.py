"""
Distributed Tracing System for SuperInstance Production

End-to-end request tracing across microservices with
span collection, trace aggregation, and performance analysis.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import random
import time
import uuid

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SpanKind(Enum):
    """Types of spans"""
    SERVER = "server"         # Incoming request
    CLIENT = "client"         # Outgoing request
    PRODUCER = "producer"     # Message producer
    CONSUMER = "consumer"     # Message consumer
    INTERNAL = "internal"     # Internal operation


class SpanStatus(Enum):
    """Span status codes"""
    OK = "ok"
    CANCELLED = "cancelled"
    UNKNOWN = "unknown"
    INVALID_ARGUMENT = "invalid_argument"
    DEADLINE_EXCEEDED = "deadline_exceeded"
    NOT_FOUND = "not_found"
    ALREADY_EXISTS = "already_exists"
    PERMISSION_DENIED = "permission_denied"
    RESOURCE_EXHAUSTED = "resource_exhausted"
    FAILED_PRECONDITION = "failed_precondition"
    ABORTED = "aborted"
    OUT_OF_RANGE = "out_of_range"
    UNIMPLEMENTED = "unimplemented"
    INTERNAL = "internal"
    UNAVAILABLE = "unavailable"
    DATA_LOSS = "data_loss"


@dataclass
class Span:
    """A span represents a single operation in a trace"""
    trace_id: str
    span_id: str
    parent_span_id: Optional[str]
    operation_name: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_ms: float
    kind: SpanKind
    status: SpanStatus
    service_name: str
    tags: Dict[str, Any] = field(default_factory=dict)
    logs: List[Dict] = field(default_factory=list)
    events: List[Dict] = field(default_factory=list)


@dataclass
class Trace:
    """A trace represents a complete request path"""
    trace_id: str
    root_span: Span
    spans: List[Span]
    start_time: datetime
    end_time: Optional[datetime]
    duration_ms: float
    services: List[str]
    error_count: int


@dataclass
class PerformanceInsight:
    """Insight from trace analysis"""
    insight_type: str
    description: str
    severity: str  # info, warning, critical
    affected_spans: List[str]
    recommendation: str


class TracingSystem:
    """
    Distributed tracing system with analysis capabilities
    """

    def __init__(self):
        # Trace storage
        self.traces: Dict[str, Trace] = {}
        self.spans: Dict[str, Span] = {}  # span_id -> Span

        # Indexes
        self.service_traces: Dict[str, List[str]] = defaultdict(list)
        self.error_traces: List[str] = []

        # Analysis cache
        self.performance_insights: Dict[str, List[PerformanceInsight]] = {}

        # Statistics
        self.stats = {
            "traces_collected": 0,
            "spans_collected": 0,
            "error_count": 0,
            "avg_trace_duration_ms": 0.0,
            "p99_trace_duration_ms": 0.0
        }

    def start_span(self, trace_id: str, parent_span_id: Optional[str],
                   operation_name: str, service_name: str,
                   kind: SpanKind = SpanKind.SERVER) -> Span:
        """
        Start a new span

        Args:
            trace_id: Trace identifier
            parent_span_id: Parent span ID (if any)
            operation_name: Operation being performed
            service_name: Service performing operation
            kind: Type of span

        Returns:
            Started span
        """
        span_id = f"{trace_id}-{uuid.uuid4().hex[:16]}"
        start_time = datetime.utcnow()

        span = Span(
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id=parent_span_id,
            operation_name=operation_name,
            start_time=start_time,
            end_time=None,
            duration_ms=0.0,
            kind=kind,
            status=SpanStatus.OK,
            service_name=service_name,
            tags={}
        )

        self.spans[span_id] = span
        return span

    def finish_span(self, span: Span, status: SpanStatus = SpanStatus.OK):
        """
        Finish a span

        Args:
            span: Span to finish
            status: Final status
        """
        span.end_time = datetime.utcnow()
        span.duration_ms = (span.end_time - span.start_time).total_seconds() * 1000
        span.status = status

        self.stats["spans_collected"] += 1

        if status != SpanStatus.OK:
            self.stats["error_count"] += 1

    def create_trace(self, root_span: Span) -> Trace:
        """
        Create a trace from a root span

        Args:
            root_span: Root span of the trace

        Returns:
            Complete trace
        """
        # Collect all spans in the trace
        trace_spans = []
        queue = [root_span.span_id]

        while queue:
            span_id = queue.pop(0)
            if span_id in self.spans:
                span = self.spans[span_id]
                trace_spans.append(span)

                # Find child spans
                for sid, s in self.spans.items():
                    if s.parent_span_id == span_id:
                        queue.append(sid)

        # Calculate trace metadata
        start_time = min(s.start_time for s in trace_spans)
        end_time = max(s.end_time for s in trace_spans if s.end_time)
        duration_ms = (end_time - start_time).total_seconds() * 1000

        services = list(set(s.service_name for s in trace_spans))
        error_count = sum(1 for s in trace_spans if s.status != SpanStatus.OK)

        trace = Trace(
            trace_id=root_span.trace_id,
            root_span=root_span,
            spans=trace_spans,
            start_time=start_time,
            end_time=end_time,
            duration_ms=duration_ms,
            services=services,
            error_count=error_count
        )

        self.traces[root_span.trace_id] = trace

        # Update indexes
        for service in services:
            self.service_traces[service].append(root_span.trace_id)

        if error_count > 0:
            self.error_traces.append(root_span.trace_id)

        self.stats["traces_collected"] += 1
        self._update_duration_stats(duration_ms)

        return trace

    def _update_duration_stats(self, duration_ms: float):
        """Update duration statistics"""
        n = self.stats["traces_collected"]
        old_avg = self.stats["avg_trace_duration_ms"]

        # Update average
        self.stats["avg_trace_duration_ms"] = (
            (old_avg * (n - 1) + duration_ms) / n
        )

    def analyze_trace(self, trace_id: str) -> List[PerformanceInsight]:
        """
        Analyze a trace for performance issues

        Args:
            trace_id: Trace to analyze

        Returns:
            List of performance insights
        """
        if trace_id not in self.traces:
            return []

        trace = self.traces[trace_id]
        insights = []

        # Check for errors
        if trace.error_count > 0:
            error_spans = [s.span_id for s in trace.spans if s.status != SpanStatus.OK]
            insights.append(PerformanceInsight(
                insight_type="errors",
                description=f"Trace contains {trace.error_count} error(s)",
                severity="critical",
                affected_spans=error_spans,
                recommendation="Investigate error logs and fix failing operations"
            ))

        # Check for slow spans (>1 second)
        slow_spans = [s for s in trace.spans if s.duration_ms > 1000]
        if slow_spans:
            insights.append(PerformanceInsight(
                insight_type="slow_operations",
                description=f"Found {len(slow_spans)} slow operation(s) (>1s)",
                severity="warning",
                affected_spans=[s.span_id for s in slow_spans],
                recommendation="Optimize slow operations or add caching"
            ))

        # Check for high depth (too many nested calls)
        max_depth = self._calculate_trace_depth(trace)
        if max_depth > 10:
            insights.append(PerformanceInsight(
                insight_type="deep_call_stack",
                description=f"Trace depth of {max_depth} may indicate over-microservice-ization",
                severity="info",
                affected_spans=[trace.root_span.span_id],
                recommendation="Consider consolidating related services"
            ))

        # Check for parallelization opportunities
        sequential_spans = self._find_sequential_patterns(trace)
        if sequential_spans:
            insights.append(PerformanceInsight(
                insight_type="parallelization",
                description="Found operations that could be parallelized",
                severity="info",
                affected_spans=sequential_spans,
                recommendation="Execute independent operations concurrently"
            ))

        self.performance_insights[trace_id] = insights
        return insights

    def _calculate_trace_depth(self, trace: Trace) -> int:
        """Calculate maximum depth of trace"""
        def get_span_depth(span: Span) -> int:
            children = [s for s in trace.spans if s.parent_span_id == span.span_id]
            if not children:
                return 1
            return 1 + max(get_span_depth(child) for child in children)

        return get_span_depth(trace.root_span)

    def _find_sequential_patterns(self, trace: Trace) -> List[str]:
        """Find spans that could be parallelized"""
        # Simplified - find sibling spans that overlap in time
        siblings = defaultdict(list)

        for span in trace.spans:
            if span.parent_span_id:
                siblings[span.parent_span_id].append(span)

        sequential = []
        for parent_id, child_spans in siblings.items():
            if len(child_spans) > 1:
                # Check if children are sequential (little overlap)
                child_spans.sort(key=lambda s: s.start_time)

                for i in range(len(child_spans) - 1):
                    current = child_spans[i]
                    next_span = child_spans[i + 1]

                    # If next starts before current ends, they're parallel
                    if next_span.start_time > current.end_time:
                        sequential.append(current.span_id)

        return sequential

    def get_service_map(self) -> Dict[str, Dict[str, int]]:
        """
        Generate service dependency map

        Returns:
            Service dependencies with call counts
        """
        dependencies = defaultdict(lambda: defaultdict(int))

        for span in self.spans.values():
            if span.parent_span_id and span.parent_span_id in self.spans:
                parent = self.spans[span.parent_span_id]
                caller = parent.service_name
                callee = span.service_name

                dependencies[caller][callee] += 1

        return dict(dependencies)

    def get_statistics(self) -> Dict:
        """Get tracing statistics"""
        return {
            **self.stats,
            "unique_services": len(self.service_traces),
            "error_rate": (
                self.stats["error_count"] / max(1, self.stats["spans_collected"])
            ),
            "avg_spans_per_trace": (
                self.stats["spans_collected"] / max(1, self.stats["traces_collected"])
            )
        }


async def simulate_distributed_tracing(duration_seconds: int = 20):
    """Simulate distributed tracing"""
    tracer = TracingSystem()

    print("=" * 60)
    print("SuperInstance Distributed Tracing Simulation")
    print("=" * 60)

    # Define service architecture
    services = {
        "api-gateway": ["user-api", "tile-api", "compute-api"],
        "user-api": ["auth-service", "user-db"],
        "tile-api": ["tile-registry", "tile-cache"],
        "compute-api": ["orchestrator", "worker-pool"],
        "orchestrator": ["scheduler", "resource-manager"],
        "worker-pool": ["worker-1", "worker-2", "worker-3"],
    }

    print(f"\nService Architecture:")
    for service, downstream in services.items():
        print(f"  {service} -> {', '.join(downstream)}")

    print(f"\nSimulating {duration_seconds}s of requests...")

    total_requests = 0
    for second in range(duration_seconds):
        # Generate requests
        requests_per_second = random.randint(5, 20)

        for _ in range(requests_per_second):
            total_requests += 1
            trace_id = f"trace-{uuid.uuid4().hex}"

            # Start trace at API gateway
            root_span = tracer.start_span(
                trace_id=trace_id,
                parent_span_id=None,
                operation_name="HTTP POST /api/compute",
                service_name="api-gateway",
                kind=SpanKind.SERVER
            )

            # Simulate request flow
            await simulate_request_flow(tracer, trace_id, root_span, services)

            # Finish root span
            tracer.finish_span(root_span)

            # Create trace
            trace = tracer.create_trace(root_span)

            # Analyze some traces
            if random.random() < 0.3:  # Analyze 30% of traces
                insights = tracer.analyze_trace(trace_id)
                if insights:
                    pass  # Would alert in production

        # Show progress
        if (second + 1) % 5 == 0:
            stats = tracer.get_statistics()
            print(f"\n  Second {second + 1}:")
            print(f"    Total Requests: {total_requests}")
            print(f"    Traces: {stats['traces_collected']}")
            print(f"    Spans: {stats['spans_collected']}")
            print(f"    Avg Duration: {stats['avg_trace_duration_ms']:.1f}ms")
            print(f"    Error Rate: {stats['error_rate']:.2%}")

        await asyncio.sleep(0.05)

    # Final statistics
    print("\n" + "=" * 60)
    print("Simulation Complete - Tracing Statistics")
    print("=" * 60)

    final_stats = tracer.get_statistics()
    print(f"\nTrace Statistics:")
    print(f"  Total Traces: {final_stats['traces_collected']}")
    print(f"  Total Spans: {final_stats['spans_collected']}")
    print(f"  Avg Spans per Trace: {final_stats['avg_spans_per_trace']:.1f}")
    print(f"  Avg Trace Duration: {final_stats['avg_trace_duration_ms']:.1f}ms")
    print(f"  Error Rate: {final_stats['error_rate']:.2%}")

    print(f"\nService Map:")
    service_map = tracer.get_service_map()
    for caller, callees in sorted(service_map.items()):
        print(f"  {caller}:")
        for callee, count in sorted(callees.items(), key=lambda x: -x[1]):
            print(f"    -> {callee}: {count} calls")

    # Show sample trace analysis
    print(f"\nSample Trace Analysis:")
    sample_trace_ids = list(tracer.traces.keys())[:3]
    for trace_id in sample_trace_ids:
        trace = tracer.traces[trace_id]
        insights = tracer.performance_insights.get(trace_id, [])

        print(f"\n  Trace {trace_id}:")
        print(f"    Services: {', '.join(trace.services)}")
        print(f"    Duration: {trace.duration_ms:.1f}ms")
        print(f"    Spans: {len(trace.spans)}")
        print(f"    Errors: {trace.error_count}")

        if insights:
            print(f"    Insights:")
            for insight in insights:
                print(f"      - [{insight.severity}] {insight.description}")


async def simulate_request_flow(tracer: TracingSystem, trace_id: str,
                                parent_span: Span, services: Dict):
    """Simulate request flowing through services"""
    current_service = parent_span.service_name

    # Determine downstream services
    downstream = services.get(current_service, [])

    if not downstream:
        # Leaf service - just do work
        await asyncio.sleep(random.uniform(0.001, 0.01))
        return

    # Call downstream services
    for downstream_service in downstream:
        # Create child span
        child_span = tracer.start_span(
            trace_id=trace_id,
            parent_span_id=parent_span.span_id,
            operation_name=f"call {downstream_service}",
            service_name=downstream_service,
            kind=SpanKind.CLIENT
        )

        # Simulate network latency
        await asyncio.sleep(random.uniform(0.001, 0.005))

        # Simulate service processing
        await simulate_request_flow(tracer, trace_id, child_span, services)

        # Finish child span
        status = SpanStatus.OK
        if random.random() < 0.02:  # 2% error rate
            status = SpanStatus.INTERNAL

        tracer.finish_span(child_span, status)


async def main():
    """Main distributed tracing orchestration"""
    await simulate_distributed_tracing(duration_seconds=20)


if __name__ == "__main__":
    asyncio.run(main())
