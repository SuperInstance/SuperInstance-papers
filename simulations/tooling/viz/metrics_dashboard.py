"""
POLLN Real-Time Metrics Dashboard
==================================

Live dashboard for monitoring POLLN system metrics.

Features:
- Auto-refresh display
- Real-time metrics (throughput, latency, error rates)
- Resource usage monitoring
- Historical comparison views
- Alert system for anomalies
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.widgets import Button, Slider
import json
import time
from typing import Dict, List, Optional, Any, Callable
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from base import AgentGraph, EvolutionConfig


@dataclass
class SystemMetrics:
    """Real-time system metrics."""
    timestamp: float

    # Performance metrics
    throughput: float  # requests per second
    avg_latency: float  # milliseconds
    p95_latency: float
    p99_latency: float
    error_rate: float  # percentage

    # Resource usage
    cpu_usage: float  # percentage
    memory_usage: float  # percentage
    network_usage: float  # MB/s
    gpu_usage: float = 0.0  # percentage

    # Agent metrics
    active_agents: int = 0
    total_agents: int = 0
    queued_tasks: int = 0
    completed_tasks: int = 0

    # Learning metrics
    avg_value: float = 0.0
    avg_reward: float = 0.0
    convergence_rate: float = 0.0


@dataclass
class AlertConfig:
    """Configuration for alert thresholds."""
    # Latency alerts
    avg_latency_threshold: float = 500.0  # ms
    p99_latency_threshold: float = 1000.0  # ms

    # Error rate alerts
    error_rate_threshold: float = 5.0  # percentage

    # Resource alerts
    cpu_threshold: float = 90.0  # percentage
    memory_threshold: float = 90.0  # percentage

    # Performance alerts
    throughput_min: float = 10.0  # requests/sec

    # Convergence alerts
    stagnation_threshold: int = 100  # timesteps without improvement


@dataclass
class Alert:
    """System alert."""
    timestamp: float
    severity: str  # 'info', 'warning', 'error', 'critical'
    metric: str
    value: float
    threshold: float
    message: str


class MetricsBuffer:
    """Circular buffer for storing metrics history."""

    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.buffer: deque = deque(maxlen=max_size)

    def add(self, metrics: SystemMetrics):
        """Add metrics to buffer."""
        self.buffer.append(metrics)

    def get_latest(self, n: int = 100) -> List[SystemMetrics]:
        """Get latest n metrics."""
        return list(self.buffer)[-n:]

    def get_by_timerange(self, duration_seconds: float) -> List[SystemMetrics]:
        """Get metrics within time range."""
        now = time.time()
        cutoff = now - duration_seconds
        return [m for m in self.buffer if m.timestamp >= cutoff]


class MetricsDashboard:
    """
    Real-time metrics dashboard for POLLN monitoring.

    Features:
    - Live metric plots
    - Auto-refresh
    - Alert system
    - Historical views
    """

    def __init__(self,
                 update_interval: float = 1.0,
                 history_window: int = 300,
                 alert_config: Optional[AlertConfig] = None):
        """
        Initialize dashboard.

        Args:
            update_interval: Seconds between updates
            history_window: Seconds of history to display
            alert_config: Alert threshold configuration
        """
        self.update_interval = update_interval
        self.history_window = history_window
        self.alert_config = alert_config or AlertConfig()

        # Metrics storage
        self.metrics_buffer = MetricsBuffer(max_size=10000)
        self.alerts: deque = deque(maxlen=100)

        # Data callbacks (for fetching real metrics)
        self.metrics_callback: Optional[Callable[[], SystemMetrics]] = None

        # Setup figure
        self.fig = None
        self.axes = {}
        self.lines = {}
        self.is_running = False

        # Initialize plot
        self._setup_figure()

    def set_metrics_callback(self, callback: Callable[[], SystemMetrics]):
        """Set callback for fetching metrics."""
        self.metrics_callback = callback

    def _setup_figure(self):
        """Setup dashboard figure layout."""
        plt.style.use('dark_background')
        self.fig = plt.figure(figsize=(16, 10))
        self.fig.suptitle('POLLN Real-Time Metrics Dashboard',
                         fontsize=16, fontweight='bold')

        # Create grid layout
        gs = self.fig.add_gridspec(3, 4, hspace=0.3, wspace=0.3)

        # Performance metrics (top row)
        self.axes['throughput'] = self.fig.add_subplot(gs[0, 0])
        self.axes['latency'] = self.fig.add_subplot(gs[0, 1])
        self.axes['error_rate'] = self.fig.add_subplot(gs[0, 2])
        self.axes['tasks'] = self.fig.add_subplot(gs[0, 3])

        # Resource usage (middle row)
        self.axes['cpu'] = self.fig.add_subplot(gs[1, 0])
        self.axes['memory'] = self.fig.add_subplot(gs[1, 1])
        self.axes['network'] = self.fig.add_subplot(gs[1, 2])
        self.axes['agents'] = self.fig.add_subplot(gs[1, 3])

        # Learning metrics (bottom row)
        self.axes['value'] = self.fig.add_subplot(gs[2, 0])
        self.axes['reward'] = self.fig.add_subplot(gs[2, 1])
        self.axes['convergence'] = self.fig.add_subplot(gs[2, 2])
        self.axes['alerts'] = self.fig.add_subplot(gs[2, 3])

        # Configure each subplot
        self._configure_axes()

    def _configure_axes(self):
        """Configure axis labels and limits."""
        # Throughput
        self.axes['throughput'].set_title('Throughput (req/s)')
        self.axes['throughput'].set_ylabel('Requests/sec')
        self.axes['throughput'].grid(True, alpha=0.3)

        # Latency
        self.axes['latency'].set_title('Latency')
        self.axes['latency'].set_ylabel('Latency (ms)')
        self.axes['latency'].grid(True, alpha=0.3)

        # Error rate
        self.axes['error_rate'].set_title('Error Rate')
        self.axes['error_rate'].set_ylabel('Error %')
        self.axes['error_rate'].grid(True, alpha=0.3)

        # Tasks
        self.axes['tasks'].set_title('Task Queue')
        self.axes['tasks'].set_ylabel('Tasks')
        self.axes['tasks'].grid(True, alpha=0.3)

        # CPU
        self.axes['cpu'].set_title('CPU Usage')
        self.axes['cpu'].set_ylabel('Usage %')
        self.axes['cpu'].set_ylim(0, 100)
        self.axes['cpu'].grid(True, alpha=0.3)

        # Memory
        self.axes['memory'].set_title('Memory Usage')
        self.axes['memory'].set_ylabel('Usage %')
        self.axes['memory'].set_ylim(0, 100)
        self.axes['memory'].grid(True, alpha=0.3)

        # Network
        self.axes['network'].set_title('Network Usage')
        self.axes['network'].set_ylabel('MB/s')
        self.axes['network'].grid(True, alpha=0.3)

        # Agents
        self.axes['agents'].set_title('Active Agents')
        self.axes['agents'].set_ylabel('Count')
        self.axes['agents'].grid(True, alpha=0.3)

        # Value
        self.axes['value'].set_title('Avg Value')
        self.axes['value'].set_ylabel('Value')
        self.axes['value'].grid(True, alpha=0.3)

        # Reward
        self.axes['reward'].set_title('Avg Reward')
        self.axes['reward'].set_ylabel('Reward')
        self.axes['reward'].grid(True, alpha=0.3)

        # Convergence
        self.axes['convergence'].set_title('Convergence Rate')
        self.axes['convergence'].set_ylabel('Rate')
        self.axes['convergence'].grid(True, alpha=0.3)

        # Alerts
        self.axes['alerts'].set_title('Recent Alerts')
        self.axes['alerts'].axis('off')

    def _update_plot(self, frame: int):
        """Update plot with new data."""
        if self.metrics_callback:
            try:
                metrics = self.metrics_callback()
                self.metrics_buffer.add(metrics)
                self._check_alerts(metrics)
            except Exception as e:
                print(f"Error fetching metrics: {e}")
                return

        # Get recent metrics
        recent = self.metrics_buffer.get_by_timerange(self.history_window)

        if not recent:
            return

        timestamps = [(m.timestamp - recent[0].timestamp) for m in recent]

        # Update each subplot
        self._update_line('throughput', timestamps, [m.throughput for m in recent], 'green')
        self._update_line('latency', timestamps, [m.avg_latency for m in recent], 'blue')
        self._update_line('error_rate', timestamps, [m.error_rate for m in recent], 'red')
        self._update_line('tasks', timestamps, [m.queued_tasks for m in recent], 'orange',
                         secondary=[m.completed_tasks for m in recent], label2='Completed')
        self._update_line('cpu', timestamps, [m.cpu_usage for m in recent], 'cyan')
        self._update_line('memory', timestamps, [m.memory_usage for m in recent], 'magenta')
        self._update_line('network', timestamps, [m.network_usage for m in recent], 'yellow')
        self._update_line('agents', timestamps, [m.active_agents for m in recent], 'lime')
        self._update_line('value', timestamps, [m.avg_value for m in recent], 'lightblue')
        self._update_line('reward', timestamps, [m.avg_reward for m in recent], 'lightgreen')
        self._update_line('convergence', timestamps, [m.convergence_rate for m in recent], 'pink')

        # Update alerts display
        self._update_alerts_display()

    def _update_line(self, key: str, x: List[float], y: List[float],
                     color: str, secondary: Optional[List[float]] = None,
                     label2: str = 'Secondary'):
        """Update a line plot."""
        ax = self.axes[key]

        ax.clear()
        ax.set_title(key.replace('_', ' ').title())
        ax.grid(True, alpha=0.3)

        if x and y:
            ax.plot(x, y, color=color, linewidth=2)

            if secondary:
                ax.plot(x, secondary, color='white', linewidth=2,
                       linestyle='--', label=label2, alpha=0.7)
                ax.legend(fontsize=8)

        # Set appropriate y-label
        labels = {
            'throughput': 'Requests/sec',
            'latency': 'Latency (ms)',
            'error_rate': 'Error %',
            'tasks': 'Tasks',
            'cpu': 'Usage %',
            'memory': 'Usage %',
            'network': 'MB/s',
            'agents': 'Count',
            'value': 'Value',
            'reward': 'Reward',
            'convergence': 'Rate'
        }
        ax.set_ylabel(labels.get(key, ''))

    def _check_alerts(self, metrics: SystemMetrics):
        """Check for alert conditions."""
        alerts_to_add = []

        # Latency alerts
        if metrics.avg_latency > self.alert_config.avg_latency_threshold:
            alerts_to_add.append(Alert(
                timestamp=metrics.timestamp,
                severity='warning',
                metric='avg_latency',
                value=metrics.avg_latency,
                threshold=self.alert_config.avg_latency_threshold,
                message=f'High average latency: {metrics.avg_latency:.1f}ms'
            ))

        if metrics.p99_latency > self.alert_config.p99_latency_threshold:
            alerts_to_add.append(Alert(
                timestamp=metrics.timestamp,
                severity='error',
                metric='p99_latency',
                value=metrics.p99_latency,
                threshold=self.alert_config.p99_latency_threshold,
                message=f'High P99 latency: {metrics.p99_latency:.1f}ms'
            ))

        # Error rate alert
        if metrics.error_rate > self.alert_config.error_rate_threshold:
            alerts_to_add.append(Alert(
                timestamp=metrics.timestamp,
                severity='error',
                metric='error_rate',
                value=metrics.error_rate,
                threshold=self.alert_config.error_rate_threshold,
                message=f'High error rate: {metrics.error_rate:.1f}%'
            ))

        # Resource alerts
        if metrics.cpu_usage > self.alert_config.cpu_threshold:
            alerts_to_add.append(Alert(
                timestamp=metrics.timestamp,
                severity='warning',
                metric='cpu_usage',
                value=metrics.cpu_usage,
                threshold=self.alert_config.cpu_threshold,
                message=f'High CPU usage: {metrics.cpu_usage:.1f}%'
            ))

        if metrics.memory_usage > self.alert_config.memory_threshold:
            alerts_to_add.append(Alert(
                timestamp=metrics.timestamp,
                severity='critical',
                metric='memory_usage',
                value=metrics.memory_usage,
                threshold=self.alert_config.memory_threshold,
                message=f'High memory usage: {metrics.memory_usage:.1f}%'
            ))

        # Throughput alert
        if metrics.throughput < self.alert_config.throughput_min:
            alerts_to_add.append(Alert(
                timestamp=metrics.timestamp,
                severity='warning',
                metric='throughput',
                value=metrics.throughput,
                threshold=self.alert_config.throughput_min,
                message=f'Low throughput: {metrics.throughput:.1f} req/s'
            ))

        # Add alerts
        for alert in alerts_to_add:
            self.alerts.append(alert)

    def _update_alerts_display(self):
        """Update alerts text display."""
        ax = self.axes['alerts']
        ax.clear()
        ax.axis('off')
        ax.set_title('Recent Alerts')

        # Get recent alerts
        recent_alerts = list(self.alerts)[-5:]

        if not recent_alerts:
            ax.text(0.5, 0.5, 'No alerts',
                   ha='center', va='center',
                   fontsize=12, color='green')
            return

        # Display alerts
        y_pos = 0.9
        for alert in recent_alerts:
            # Color by severity
            colors = {
                'info': 'cyan',
                'warning': 'yellow',
                'error': 'orange',
                'critical': 'red'
            }
            color = colors.get(alert.severity, 'white')

            # Format time
            time_str = datetime.fromtimestamp(alert.timestamp).strftime('%H:%M:%S')

            text = f"[{time_str}] {alert.severity.upper()}: {alert.message}"
            ax.text(0.05, y_pos, text,
                   transform=ax.transAxes,
                   fontsize=9,
                   color=color,
                   verticalalignment='top',
                   fontweight='bold' if alert.severity in ['error', 'critical'] else 'normal')

            y_pos -= 0.2

    def start(self):
        """Start the dashboard animation."""
        self.is_running = True

        # Create animation
        self.anim = animation.FuncAnimation(
            self.fig,
            self._update_plot,
            interval=int(self.update_interval * 1000),
            cache_frame_data=False
        )

        plt.show()

    def stop(self):
        """Stop the dashboard."""
        self.is_running = False
        if hasattr(self, 'anim'):
            self.anim.event_source.stop()

    def save_snapshot(self, output_path: Path):
        """Save current dashboard state to file."""
        self.fig.savefig(output_path, dpi=150, bbox_inches='tight')
        print(f"Saved dashboard snapshot to {output_path}")

    def export_html(self, output_path: Path):
        """
        Export dashboard as standalone HTML file.

        Uses plotly for interactive visualization.
        """
        try:
            import plotly.graph_objects as go
            from plotly.subplots import make_subplots
            import plotly.express as px
        except ImportError:
            print("Plotly not installed. Cannot export HTML dashboard.")
            print("Install with: pip install plotly")
            return

        # Get recent metrics
        recent = self.metrics_buffer.get_by_timerange(self.history_window)

        if not recent:
            print("No metrics data available for export")
            return

        timestamps = [datetime.fromtimestamp(m.timestamp) for m in recent]

        # Create subplots
        fig = make_subplots(
            rows=3, cols=4,
            subplot_titles=[
                'Throughput', 'Latency', 'Error Rate', 'Task Queue',
                'CPU Usage', 'Memory Usage', 'Network Usage', 'Active Agents',
                'Avg Value', 'Avg Reward', 'Convergence Rate', 'Recent Alerts'
            ],
            specs=[[{"secondary_y": False}] * 4] * 3,
            vertical_spacing=0.15,
            horizontal_spacing=0.10
        )

        # Add traces
        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.throughput for m in recent],
                      name='Throughput', line=dict(color='green')),
            row=1, col=1
        )

        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.avg_latency for m in recent],
                      name='Avg Latency', line=dict(color='blue')),
            row=1, col=2
        )

        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.error_rate for m in recent],
                      name='Error Rate', line=dict(color='red')),
            row=1, col=3
        )

        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.queued_tasks for m in recent],
                      name='Queued', line=dict(color='orange')),
            row=1, col=4
        )
        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.completed_tasks for m in recent],
                      name='Completed', line=dict(color='white', dash='dash')),
            row=1, col=4
        )

        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.cpu_usage for m in recent],
                      name='CPU', line=dict(color='cyan')),
            row=2, col=1
        )

        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.memory_usage for m in recent],
                      name='Memory', line=dict(color='magenta')),
            row=2, col=2
        )

        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.network_usage for m in recent],
                      name='Network', line=dict(color='yellow')),
            row=2, col=3
        )

        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.active_agents for m in recent],
                      name='Agents', line=dict(color='lime')),
            row=2, col=4
        )

        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.avg_value for m in recent],
                      name='Value', line=dict(color='lightblue')),
            row=3, col=1
        )

        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.avg_reward for m in recent],
                      name='Reward', line=dict(color='lightgreen')),
            row=3, col=2
        )

        fig.add_trace(
            go.Scatter(x=timestamps, y=[m.convergence_rate for m in recent],
                      name='Convergence', line=dict(color='pink')),
            row=3, col=3
        )

        # Add alerts as text
        recent_alerts = list(self.alerts)[-10:]
        alert_text = "<br>".join([
            f"[{alert.severity.upper()}] {alert.message}"
            for alert in recent_alerts
        ]) or "No alerts"

        fig.add_annotation(
            text=alert_text,
            xref="x domain", yref="y domain",
            x=0.5, y=0.5,
            row=3, col=4,
            showarrow=False,
            font=dict(size=10)
        )

        # Update layout
        fig.update_layout(
            title_text="POLLN Real-Time Metrics Dashboard",
            title_font_size=20,
            showlegend=False,
            height=900,
            template='plotly_dark'
        )

        # Save to HTML
        fig.write_html(output_path)
        print(f"Exported HTML dashboard to {output_path}")


def generate_synthetic_metrics() -> SystemMetrics:
    """Generate synthetic metrics for demo."""
    t = time.time()

    # Simulate varying metrics
    hour = datetime.fromtimestamp(t).hour
    base_load = 0.5 + 0.3 * np.sin(2 * np.pi * hour / 24)

    return SystemMetrics(
        timestamp=t,
        throughput=50 + 20 * base_load + np.random.normal(0, 5),
        avg_latency=100 + 50 * base_load + np.random.normal(0, 20),
        p95_latency=150 + 80 * base_load + np.random.normal(0, 30),
        p99_latency=200 + 100 * base_load + np.random.normal(0, 40),
        error_rate=1 + 0.5 * base_load + np.random.normal(0, 0.2),
        cpu_usage=50 + 30 * base_load + np.random.normal(0, 10),
        memory_usage=60 + 20 * base_load + np.random.normal(0, 5),
        network_usage=10 + 5 * base_load + np.random.normal(0, 2),
        gpu_usage=30 + 20 * base_load + np.random.normal(0, 10),
        active_agents=int(15 + 5 * base_load + np.random.normal(0, 2)),
        total_agents=20,
        queued_tasks=int(5 + 10 * base_load + np.random.normal(0, 3)),
        completed_tasks=int(1000 + t % 1000),
        avg_value=0.6 + 0.2 * base_load + np.random.normal(0, 0.05),
        avg_reward=5 + 2 * base_load + np.random.normal(0, 0.5),
        convergence_rate=0.01 + 0.005 * base_load + np.random.normal(0, 0.001)
    )


if __name__ == "__main__":
    # Demo dashboard
    print("Starting POLLN Metrics Dashboard...")
    print("Close the window to stop.")

    dashboard = MetricsDashboard(
        update_interval=1.0,
        history_window=60
    )

    # Use synthetic metrics for demo
    dashboard.set_metrics_callback(generate_synthetic_metrics)

    # Start dashboard
    dashboard.start()
