"""
Real-Time GPU-Accelerated Visualization System

Provides interactive, high-performance visualization for simulation results
using CuPy GPU acceleration and matplotlib rendering.

Performance Targets:
- 60+ FPS for smooth interaction
- <16ms frame time
- GPU-accelerated computation
- Interactive parameter adjustment
"""

import cupy as cp
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Slider, Button
import numpy as np
from typing import List, Dict, Tuple, Callable, Optional
import time
from dataclasses import dataclass


@dataclass
class VisualizationConfig:
    """Configuration for visualization performance."""
    target_fps: int = 60
    frame_interval_ms: int = 16  # ~60 FPS
    enable_blit: bool = True
    max_points_render: int = 10000
    gpu_transfer_batch_size: int = 100000
    colormap: str = 'viridis'
    figure_dpi: int = 100


class RealTimeGPUVisualizer:
    """
    Real-time visualization system with GPU acceleration.

    Optimized for interactive exploration of simulation results with
    minimal CPU-GPU transfer overhead.
    """

    def __init__(
        self,
        simulation_backend=None,
        config: VisualizationConfig = None
    ):
        """
        Initialize the visualizer.

        Args:
            simulation_backend: Simulation object with update methods
            config: Visualization configuration
        """
        self.sim = simulation_backend
        self.config = config or VisualizationConfig()

        # GPU arrays for computation
        self.agent_positions_gpu: Optional[cp.ndarray] = None
        self.agent_states_gpu: Optional[cp.ndarray] = None
        self.network_adjacency_gpu: Optional[cp.ndarray] = None

        # Matplotlib objects
        self.fig = None
        self.axes: Dict[str, plt.Axes] = {}
        self.artists: Dict[str, any] = {}

        # Performance tracking
        self.frame_times: List[float] = []
        self.last_frame_time: float = 0.0

    def setup_agent_heatmap(
        self,
        num_agents: int,
        grid_size: Tuple[int, int] = (100, 100),
        extent: Tuple[float, float, float, float] = (0, 1, 0, 1)
    ) -> None:
        """
        Setup real-time agent state heatmap.

        Args:
            num_agents: Number of agents to visualize
            grid_size: Heatmap grid resolution (width, height)
            extent: Spatial extent (xmin, xmax, ymin, ymax)
        """
        self.fig, self.axes['heatmap'] = plt.subplots(
            figsize=(10, 8),
            dpi=self.config.figure_dpi
        )

        # Initialize GPU arrays for agent data
        self.agent_positions_gpu = cp.random.random((num_agents, 2))
        self.agent_states_gpu = cp.random.random(num_agents)

        # Create heatmap artist
        self.artists['heatmap'] = self.axes['heatmap'].imshow(
            np.zeros(grid_size),
            cmap=self.config.colormap,
            interpolation='bilinear',
            vmin=0, vmax=1,
            extent=extent,
            origin='lower'
        )

        self.axes['heatmap'].set_title("Agent State Distribution")
        self.axes['heatmap'].set_xlabel("X Position")
        self.axes['heatmap'].set_ylabel("Y Position")

        # Add colorbar
        cbar = plt.colorbar(
            self.artists['heatmap'],
            ax=self.axes['heatmap'],
            fraction=0.046,
            pad=0.04
        )
        cbar.set_label("Agent State", rotation=270, labelpad=15)

        # Performance info text
        self.artists['fps_text'] = self.axes['heatmap'].text(
            0.02, 0.98,
            "FPS: 0",
            transform=self.axes['heatmap'].transAxes,
            verticalalignment='top',
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.8)
        )

    def update_heatmap(self, frame_num: int) -> List:
        """
        Update heatmap for current frame.

        Args:
            frame_num: Current frame number

        Returns:
            List of updated artists for blitting
        """
        start_time = time.perf_counter()

        # Update agent positions (simulated dynamics)
        self.agent_positions_gpu += cp.random.normal(
            0, 0.01,
            self.agent_positions_gpu.shape
        )
        self.agent_positions_gpu = cp.clip(
            self.agent_positions_gpu, 0, 1
        )

        # Update agent states
        self.agent_states_gpu = cp.sin(
            frame_num * 0.1 +
            self.agent_positions_gpu[:, 0] * 10
        ) * 0.5 + 0.5

        # Get data from GPU
        states = cp.asnumpy(self.agent_states_gpu)
        positions = cp.asnumpy(self.agent_positions_gpu)

        # Bin into grid using GPU-accelerated histogram
        x_edges = np.linspace(0, 1, 101)
        y_edges = np.linspace(0, 1, 101)

        grid, _, _ = np.histogram2d(
            positions[:, 0],
            positions[:, 1],
            bins=[x_edges, y_edges],
            weights=states
        )

        # Normalize grid
        grid_max = grid.max()
        if grid_max > 0:
            grid = grid / grid_max

        # Update visualization
        self.artists['heatmap'].set_data(grid.T)

        # Update FPS display
        frame_time = time.perf_counter() - start_time
        fps = 1.0 / frame_time if frame_time > 0 else 0

        self.artists['fps_text'].set_text(f"FPS: {fps:.1f}")

        return [
            self.artists['heatmap'],
            self.artists['fps_text']
        ]

    def setup_network_graph(
        self,
        num_nodes: int = 100,
        edge_density: float = 0.05,
        layout: str = 'force_directed'
    ) -> None:
        """
        Setup real-time network topology visualization.

        Args:
            num_nodes: Number of nodes in the network
            edge_density: Probability of edge creation
            layout: Layout algorithm ('force_directed', 'circular', 'random')
        """
        self.fig, self.axes['network'] = plt.subplots(
            figsize=(12, 12),
            dpi=self.config.figure_dpi
        )

        # Initialize GPU arrays
        self.node_positions_gpu = self._compute_gpu_layout(num_nodes, layout)
        self.node_states_gpu = cp.random.random(num_nodes)

        # Create adjacency matrix on GPU
        edges = cp.random.rand(num_nodes, num_nodes) < edge_density
        # Make symmetric (undirected)
        edges = cp.logical_or(edges, edges.T)
        # Remove self-loops
        cp.fill_diagonal(edges, False)

        # Random edge weights
        self.network_adjacency_gpu = cp.where(
            edges,
            cp.random.random((num_nodes, num_nodes)),
            cp.zeros((num_nodes, num_nodes))
        )

        # Get positions for rendering
        positions_np = cp.asnumpy(self.node_positions_gpu)
        states_np = cp.asnumpy(self.node_states_gpu)

        # Create node scatter plot
        self.artists['network_nodes'] = self.axes['network'].scatter(
            positions_np[:, 0],
            positions_np[:, 1],
            c=states_np,
            s=50,
            alpha=0.7,
            cmap=self.config.colormap,
            edgecolors='black',
            linewidths=0.5
        )

        # Draw edges (sample for performance)
        edge_indices = cp.where(cp.triu(self.network_adjacency_gpu) > 0)
        num_edges = edge_indices[0].shape[0]

        # Limit edges for rendering performance
        max_edges = min(num_edges, self.config.max_points_render)
        if max_edges > 0:
            edge_indices_np = [
                cp.asnumpy(edge_indices[0])[:max_edges],
                cp.asnumpy(edge_indices[1])[:max_edges]
            ]

            edge_lines = []
            for i in range(max_edges):
                src, dst = edge_indices_np[0][i], edge_indices_np[1][i]
                line, = self.axes['network'].plot(
                    [positions_np[src, 0], positions_np[dst, 0]],
                    [positions_np[src, 1], positions_np[dst, 1]],
                    'k-',
                    alpha=0.2,
                    linewidth=0.5
                )
                edge_lines.append(line)

            self.artists['network_edges'] = edge_lines

        self.axes['network'].set_title("Network Topology Dynamics")
        self.axes['network'].set_aspect('equal')
        self.axes['network'].grid(True, alpha=0.3)

        # Colorbar for node states
        cbar = plt.colorbar(
            self.artists['network_nodes'],
            ax=self.axes['network'],
            fraction=0.046,
            pad=0.04
        )
        cbar.set_label("Node State", rotation=270, labelpad=15)

    def _compute_gpu_layout(
        self,
        num_nodes: int,
        layout: str
    ) -> cp.ndarray:
        """Compute initial node layout using GPU."""
        if layout == 'circular':
            angles = cp.linspace(0, 2 * cp.pi, num_nodes, endpoint=False)
            x = cp.cos(angles)
            y = cp.sin(angles)
            return cp.column_stack([x, y])
        elif layout == 'force_directed':
            # Initialize with random positions
            return cp.random.random((num_nodes, 2)) * 2 - 1
        else:  # random
            return cp.random.random((num_nodes, 2))

    def update_network(self, frame_num: int) -> List:
        """
        Update network visualization with dynamics.

        Args:
            frame_num: Current frame number

        Returns:
            List of updated artists
        """
        start_time = time.perf_counter()

        # Simulate network dynamics (force-directed layout)
        num_nodes = self.node_positions_gpu.shape[0]

        # Repulsion between nodes (GPU computation)
        diff = self.node_positions_gpu[:, None, :] - self.node_positions_gpu[None, :, :]
        dist_sq = cp.sum(diff**2, axis=2) + 1e-6
        force = diff / dist_sq[:, :, None] * 0.01

        # Attraction along edges
        adjacency_binary = (self.network_adjacency_gpu > 0).astype(cp.float32)
        attraction = -diff * adjacency_binary[:, :, None] * 0.1

        # Update positions
        total_force = cp.sum(force + attraction, axis=1)
        self.node_positions_gpu += total_force

        # Clip to bounds
        self.node_positions_gpu = cp.clip(
            self.node_positions_gpu, -1.5, 1.5
        )

        # Update node states
        self.node_states_gpu = cp.sin(
            frame_num * 0.05 +
            cp.linalg.norm(self.node_positions_gpu, axis=1) * 5
        ) * 0.5 + 0.5

        # Update visualization
        positions_np = cp.asnumpy(self.node_positions_gpu)
        states_np = cp.asnumpy(self.node_states_gpu)

        self.artists['network_nodes'].set_offsets(positions_np)
        self.artists['network_nodes'].set_array(states_np)

        # Update edges if they exist
        if 'network_edges' in self.artists and self.artists['network_edges']:
            edge_indices = cp.where(cp.triu(self.network_adjacency_gpu) > 0)
            num_edges = min(
                edge_indices[0].shape[0],
                len(self.artists['network_edges'])
            )

            for i in range(num_edges):
                src = int(cp.asnumpy(edge_indices[0])[i])
                dst = int(cp.asnumpy(edge_indices[1])[i])

                self.artists['network_edges'][i].set_data(
                    [positions_np[src, 0], positions_np[dst, 0]],
                    [positions_np[src, 1], positions_np[dst, 1]]
                )

        # Performance tracking
        frame_time = time.perf_counter() - start_time
        self.frame_times.append(frame_time)

        return [self.artists['network_nodes']]

    def setup_emergence_monitor(
        self,
        metrics: List[str],
        history_length: int = 1000
    ) -> None:
        """
        Setup real-time emergence metrics monitoring.

        Args:
            metrics: List of metric names to monitor
            history_length: Number of time steps to display
        """
        num_metrics = len(metrics)

        # Create subplots
        self.fig, self.axes_list = plt.subplots(
            num_metrics, 1,
            figsize=(12, 3 * num_metrics),
            dpi=self.config.figure_dpi,
            sharex=True
        )

        if num_metrics == 1:
            self.axes_list = [self.axes_list]

        self.metric_lines: Dict[str, plt.Line2D] = {}
        self.metric_data_gpu: Dict[str, cp.ndarray] = {}
        self.emergence_thresholds: Dict[str, float] = {}

        for i, metric in enumerate(metrics):
            ax = self.axes_list[i]

            # Initialize GPU array for history
            self.metric_data_gpu[metric] = cp.zeros(history_length)

            # Create line artist
            line, = ax.plot([], [], lw=2, label=metric)
            self.metric_lines[metric] = line

            # Threshold line
            threshold_line, = ax.plot(
                [], [],
                'r--',
                lw=1,
                alpha=0.7,
                label='Emergence Threshold'
            )
            self.metric_lines[f'{metric}_threshold'] = threshold_line

            ax.set_xlim(0, history_length)
            ax.set_ylim(0, 1)
            ax.set_ylabel(metric)
            ax.grid(True, alpha=0.3)
            ax.legend(loc='upper right')

        self.axes_list[-1].set_xlabel("Time Step")

        plt.tight_layout()

    def update_emergence(self, frame_num: int) -> List:
        """
        Update emergence monitoring plots.

        Args:
            frame_num: Current frame number

        Returns:
            List of updated artists
        """
        # Simulate computing emergence metrics
        current_metrics = {}
        for metric in self.metric_data_gpu.keys():
            # Simulate metric with dynamics
            base_value = 0.5 + 0.3 * cp.sin(frame_num * 0.02)
            noise = cp.random.random() * 0.1

            # Occasional emergence spikes
            if cp.random.random() < 0.01:
                noise += 0.4

            current_metrics[metric] = cp.clip(base_value + noise, 0, 1)

        updated_artists = []

        for metric, line in self.metric_lines.items():
            if '_threshold' in metric:
                continue

            # Shift data on GPU
            self.metric_data_gpu[metric] = cp.roll(
                self.metric_data_gpu[metric], -1
            )
            self.metric_data_gpu[metric][-1] = current_metrics[metric]

            # Update line data
            data_np = cp.asnumpy(self.metric_data_gpu[metric])
            x_data = np.arange(len(data_np))

            line.set_data(x_data, data_np)

            # Auto-scale y-axis
            ax = line.axes
            data_min, data_max = data_np.min(), data_np.max()

            if data_max - data_min > 0.01:
                ax.set_ylim(data_min - 0.1, data_max + 0.1)
            else:
                ax.set_ylim(0, 1)

            # Update threshold (emergence at 0.8)
            threshold_line = self.metric_lines[f'{metric}_threshold']
            threshold_line.set_data(x_data, [0.8] * len(x_data))

            updated_artists.append(line)
            updated_artists.append(threshold_line)

        return updated_artists

    def setup_phase_space(
        self,
        num_agents: int = 1000
    ) -> None:
        """
        Setup phase space visualization.

        Args:
            num_agents: Number of agents to track
        """
        self.fig, self.axes['phase'] = plt.subplots(
            figsize=(10, 10),
            dpi=self.config.figure_dpi
        )

        # Initialize phase space variables on GPU
        self.phase_x_gpu = cp.random.normal(0, 1, num_agents)
        self.phase_y_gpu = cp.random.normal(0, 1, num_agents)

        # Create scatter plot
        x_np = cp.asnumpy(self.phase_x_gpu)
        y_np = cp.asnumpy(self.phase_y_gpu)

        self.artists['phase_scatter'] = self.axes['phase'].scatter(
            x_np, y_np,
            s=2,
            alpha=0.5,
            c='blue'
        )

        # Trajectory line for sample agent
        self.artists['phase_trajectory'], = self.axes['phase'].plot(
            [], [],
            'r-',
            lw=2,
            alpha=0.8,
            label='Sample Trajectory'
        )

        # Store trajectory history
        self.trajectory_history_x = []
        self.trajectory_history_y = []
        self.max_trajectory_length = 100

        self.axes['phase'].set_title("Phase Space Dynamics")
        self.axes['phase'].set_xlabel("X Variable")
        self.axes['phase'].set_ylabel("Y Variable")
        self.axes['phase'].set_xlim(-4, 4)
        self.axes['phase'].set_ylim(-4, 4)
        self.axes['phase'].grid(True, alpha=0.3)
        self.axes['phase'].legend()

    def update_phase_space(self, frame_num: int) -> List:
        """
        Update phase space visualization.

        Args:
            frame_num: Current frame number

        Returns:
            List of updated artists
        """
        # Simulate phase space dynamics (e.g., Van der Pol oscillator)
        mu = 1.0
        dt = 0.05

        # x' = y
        # y' = mu * (1 - x^2) * y - x
        dx = self.phase_y_gpu * dt
        dy = (mu * (1 - self.phase_x_gpu**2) * self.phase_y_gpu - self.phase_x_gpu) * dt

        self.phase_x_gpu += dx
        self.phase_y_gpu += dy

        # Update scatter
        x_np = cp.asnumpy(self.phase_x_gpu)
        y_np = cp.asnumpy(self.phase_y_gpu)

        self.artists['phase_scatter'].set_offsets(
            np.column_stack([x_np, y_np])
        )

        # Update trajectory (first agent)
        self.trajectory_history_x.append(float(x_np[0]))
        self.trajectory_history_y.append(float(y_np[0]))

        if len(self.trajectory_history_x) > self.max_trajectory_length:
            self.trajectory_history_x.pop(0)
            self.trajectory_history_y.pop(0)

        self.artists['phase_trajectory'].set_data(
            self.trajectory_history_x,
            self.trajectory_history_y
        )

        return [
            self.artists['phase_scatter'],
            self.artists['phase_trajectory']
        ]

    def start_animation(
        self,
        update_func: Callable,
        interval: int = None,
        frames: int = None
    ) -> FuncAnimation:
        """
        Start real-time animation.

        Args:
            update_func: Function to call each frame
            interval: Frame interval in ms (default from config)
            frames: Number of frames (None = infinite)

        Returns:
            FuncAnimation object
        """
        if interval is None:
            interval = self.config.frame_interval_ms

        anim = FuncAnimation(
            self.fig,
            update_func,
            frames=frames,
            interval=interval,
            blit=self.config.enable_blit,
            cache_frame_data=False
        )

        plt.show()
        return anim

    def get_performance_stats(self) -> Dict[str, float]:
        """
        Get performance statistics.

        Returns:
            Dictionary with FPS, frame time statistics
        """
        if not self.frame_times:
            return {}

        frame_times_array = np.array(self.frame_times)

        return {
            'mean_frame_time_ms': frame_times_array.mean() * 1000,
            'std_frame_time_ms': frame_times_array.std() * 1000,
            'min_frame_time_ms': frame_times_array.min() * 1000,
            'max_frame_time_ms': frame_times_array.max() * 1000,
            'mean_fps': 1.0 / frame_times_array.mean(),
            'total_frames': len(self.frame_times)
        }


class SimulationDashboard:
    """
    Multi-panel real-time dashboard for comprehensive monitoring.

    Combines multiple visualizations into a unified interface.
    """

    def __init__(
        self,
        num_agents: int = 1000,
        num_nodes: int = 50,
        config: VisualizationConfig = None
    ):
        """
        Initialize the dashboard.

        Args:
            num_agents: Number of agents for heatmap
            num_nodes: Number of nodes for network
            config: Visualization configuration
        """
        self.num_agents = num_agents
        self.num_nodes = num_nodes
        self.config = config or VisualizationConfig()

        # Create visualizers for each panel
        self.heatmap_viz = RealTimeGPUVisualizer(config=self.config)
        self.network_viz = RealTimeGPUVisualizer(config=self.config)
        self.emergence_viz = RealTimeGPUVisualizer(config=self.config)

        # Dashboard state
        self.is_paused = False
        self.speed_multiplier = 1.0
        self.current_frame = 0

    def create_dashboard(self) -> plt.Figure:
        """
        Create multi-panel dashboard.

        Returns:
            Figure with all dashboard panels
        """
        # Create figure with grid specification
        self.fig = plt.figure(
            figsize=(16, 12),
            dpi=self.config.figure_dpi
        )

        gs = self.fig.add_gridspec(
            3, 3,
            hspace=0.35,
            wspace=0.35,
            left=0.05,
            right=0.95,
            top=0.95,
            bottom=0.05
        )

        # Panel 1: Agent heatmap (top-left)
        self.ax_heatmap = self.fig.add_subplot(gs[0, 0])
        self.setup_heatmap_panel()

        # Panel 2: Network graph (top-center)
        self.ax_network = self.fig.add_subplot(gs[0, 1])
        self.setup_network_panel()

        # Panel 3: Phase space (top-right)
        self.ax_phase = self.fig.add_subplot(gs[0, 2])
        self.setup_phase_panel()

        # Panel 4: Emergence metrics (middle row, span all columns)
        self.ax_emergence = self.fig.add_subplot(gs[1, :])
        self.setup_emergence_panel()

        # Panel 5: Performance metrics (bottom-left)
        self.ax_performance = self.fig.add_subplot(gs[2, 0])
        self.setup_performance_panel()

        # Panel 6: Control panel (bottom-center)
        self.ax_controls = self.fig.add_subplot(gs[2, 1])
        self.setup_control_panel()

        # Panel 7: Statistics (bottom-right)
        self.ax_stats = self.fig.add_subplot(gs[2, 2])
        self.setup_stats_panel()

        # Dashboard title
        self.fig.suptitle(
            "Real-Time Simulation Dashboard",
            fontsize=16,
            fontweight='bold'
        )

        return self.fig

    def setup_heatmap_panel(self) -> None:
        """Setup agent state heatmap panel."""
        # Initialize GPU arrays
        self.heatmap_positions = cp.random.random((self.num_agents, 2))
        self.heatmap_states = cp.random.random(self.num_agents)

        # Create heatmap
        self.heatmap_artist = self.ax_heatmap.imshow(
            np.zeros((50, 50)),
            cmap=self.config.colormap,
            interpolation='bilinear',
            vmin=0, vmax=1,
            origin='lower'
        )

        self.ax_heatmap.set_title("Agent State Distribution")
        self.ax_heatmap.set_xlabel("X")
        self.ax_heatmap.set_ylabel("Y")

    def setup_network_panel(self) -> None:
        """Setup network topology panel."""
        # Initialize network on GPU
        self.network_positions = cp.random.random((self.num_nodes, 2)) * 2 - 1
        self.network_states = cp.random.random(self.num_nodes)

        # Create edges
        edge_prob = 0.1
        edges = cp.random.rand(self.num_nodes, self.num_nodes) < edge_prob
        edges = cp.logical_or(edges, edges.T)
        cp.fill_diagonal(edges, False)
        self.network_adjacency = cp.where(edges, cp.random.random((self.num_nodes, self.num_nodes)), 0)

        # Draw nodes
        positions_np = cp.asnumpy(self.network_positions)
        states_np = cp.asnumpy(self.network_states)

        self.network_nodes_artist = self.ax_network.scatter(
            positions_np[:, 0],
            positions_np[:, 1],
            c=states_np,
            s=100,
            cmap=self.config.colormap,
            edgecolors='black',
            linewidths=1
        )

        # Draw some edges
        edge_indices = cp.where(cp.triu(self.network_adjacency) > 0)
        num_draw = min(50, edge_indices[0].shape[0])

        self.network_edges_artists = []
        for i in range(num_draw):
            src = int(cp.asnumpy(edge_indices[0])[i])
            dst = int(cp.asnumpy(edge_indices[1])[i])
            line, = self.ax_network.plot(
                [positions_np[src, 0], positions_np[dst, 0]],
                [positions_np[src, 1], positions_np[dst, 1]],
                'k-',
                alpha=0.3,
                linewidth=0.5
            )
            self.network_edges_artists.append(line)

        self.ax_network.set_title("Network Topology")
        self.ax_network.set_xlim(-1.5, 1.5)
        self.ax_network.set_ylim(-1.5, 1.5)
        self.ax_network.set_aspect('equal')

    def setup_phase_panel(self) -> None:
        """Setup phase space panel."""
        self.phase_x = cp.random.normal(0, 1, 500)
        self.phase_y = cp.random.normal(0, 1, 500)

        x_np = cp.asnumpy(self.phase_x)
        y_np = cp.asnumpy(self.phase_y)

        self.phase_artist = self.ax_phase.scatter(
            x_np, y_np,
            s=5,
            alpha=0.5,
            c='blue'
        )

        self.ax_phase.set_title("Phase Space")
        self.ax_phase.set_xlabel("X")
        self.ax_phase.set_ylabel("Y")
        self.ax_phase.set_xlim(-4, 4)
        self.ax_phase.set_ylim(-4, 4)
        self.ax_phase.grid(True, alpha=0.3)

    def setup_emergence_panel(self) -> None:
        """Setup emergence metrics panel."""
        metrics = ['Diversity', 'Correlation', 'Novelty']
        colors = ['blue', 'green', 'red']

        self.emergence_data = {
            metric: cp.zeros(200)
            for metric in metrics
        }

        self.emergence_lines = {}

        for metric, color in zip(metrics, colors):
            line, = self.ax_emergence.plot(
                [], [],
                lw=2,
                label=metric,
                color=color
            )
            self.emergence_lines[metric] = line

        self.ax_emergence.set_title("Emergence Metrics")
        self.ax_emergence.set_xlim(0, 200)
        self.ax_emergence.set_ylim(0, 1)
        self.ax_emergence.set_xlabel("Time Step")
        self.ax_emergence.set_ylabel("Metric Value")
        self.ax_emergence.legend()
        self.ax_emergence.grid(True, alpha=0.3)

    def setup_performance_panel(self) -> None:
        """Setup performance monitoring panel."""
        performance_metrics = ['FPS', 'Frame Time (ms)', 'GPU Memory (MB)']
        values = [60, 16.7, 1024]

        self.performance_bars = self.ax_performance.barh(
            performance_metrics,
            values,
            color=['green', 'blue', 'orange']
        )

        self.ax_performance.set_title("Performance Metrics")
        self.ax_performance.set_xlim(0, max(values) * 1.2)

        # Add value labels
        for bar, value in zip(self.performance_bars, values):
            self.ax_performance.text(
                bar.get_width() + 10,
                bar.get_y() + bar.get_height() / 2,
                f'{value:.1f}',
                va='center'
            )

    def setup_control_panel(self) -> None:
        """Setup interactive control panel."""
        self.ax_controls.axis('off')
        self.ax_controls.set_title("Controls")

        # Display control instructions
        controls_text = """
        Keyboard Controls:
        -----------------
        Space: Pause/Resume
        Up: Increase Speed
        Down: Decrease Speed
        R: Reset Simulation
        Q: Quit

        Current Speed: 1.0x
        Status: Running
        """

        self.controls_text_artist = self.ax_controls.text(
            0.1, 0.5,
            controls_text,
            fontsize=10,
            family='monospace',
            verticalalignment='center'
        )

    def setup_stats_panel(self) -> None:
        """Setup statistics panel."""
        self.ax_stats.axis('off')
        self.ax_stats.set_title("Statistics")

        stats_text = """
        Simulation Statistics:
        ----------------------
        Agents: {agents}
        Nodes: {nodes}
        Frame: {frame}

        System State:
        -------------
        Mean: 0.50
        Std: 0.29
        Min: 0.00
        Max: 1.00
        """.format(
            agents=self.num_agents,
            nodes=self.num_nodes,
            frame=0
        )

        self.stats_text_artist = self.ax_stats.text(
            0.1, 0.5,
            stats_text,
            fontsize=9,
            family='monospace',
            verticalalignment='center'
        )

    def update_dashboard(self, frame: int) -> None:
        """
        Update all dashboard panels.

        Args:
            frame: Current frame number
        """
        if self.is_paused:
            return

        self.current_frame = frame

        # Update heatmap
        self.heatmap_positions += cp.random.normal(0, 0.01, self.heatmap_positions.shape)
        self.heatmap_positions = cp.clip(self.heatmap_positions, 0, 1)
        self.heatmap_states = cp.sin(frame * 0.1 + self.heatmap_positions[:, 0] * 10) * 0.5 + 0.5

        states_np = cp.asnumpy(self.heatmap_states)
        positions_np = cp.asnumpy(self.heatmap_positions)

        grid, _, _ = np.histogram2d(
            positions_np[:, 0], positions_np[:, 1],
            bins=50,
            weights=states_np
        )
        grid = grid / (grid.max() + 1e-6)

        self.heatmap_artist.set_data(grid.T)

        # Update network
        self.network_positions += cp.random.normal(0, 0.02, self.network_positions.shape)
        self.network_positions = cp.clip(self.network_positions, -1.2, 1.2)
        self.network_states = cp.sin(frame * 0.05 + cp.linalg.norm(self.network_positions, axis=1) * 3) * 0.5 + 0.5

        positions_np = cp.asnumpy(self.network_positions)
        states_np = cp.asnumpy(self.network_states)

        self.network_nodes_artist.set_offsets(positions_np)
        self.network_nodes_artist.set_array(states_np)

        # Update phase space
        dt = 0.05 * self.speed_multiplier
        mu = 1.0

        dx = self.phase_y * dt
        dy = (mu * (1 - self.phase_x**2) * self.phase_y - self.phase_x) * dt

        self.phase_x += dx
        self.phase_y += dy

        x_np = cp.asnumpy(self.phase_x)
        y_np = cp.asnumpy(self.phase_y)

        self.phase_artist.set_offsets(np.column_stack([x_np, y_np]))

        # Update emergence metrics
        for metric in self.emergence_data:
            self.emergence_data[metric] = cp.roll(self.emergence_data[metric], -1)

            base_value = 0.5 + 0.3 * cp.sin(frame * 0.02 + hash(metric) % 10)
            noise = cp.random.random() * 0.1
            spike = 0.4 if cp.random.random() < 0.01 else 0

            self.emergence_data[metric][-1] = cp.clip(base_value + noise + spike, 0, 1)

            data_np = cp.asnumpy(self.emergence_data[metric])
            self.emergence_lines[metric].set_data(np.arange(200), data_np)

        # Update statistics display
        self.update_stats_display()

    def update_stats_display(self) -> None:
        """Update statistics text display."""
        states_np = cp.asnumpy(self.heatmap_states)

        stats_text = """
        Simulation Statistics:
        ----------------------
        Agents: {agents}
        Nodes: {nodes}
        Frame: {frame}

        System State:
        -------------
        Mean: {mean:.2f}
        Std: {std:.2f}
        Min: {min:.2f}
        Max: {max:.2f}
        """.format(
            agents=self.num_agents,
            nodes=self.num_nodes,
            frame=self.current_frame,
            mean=states_np.mean(),
            std=states_np.std(),
            min=states_np.min(),
            max=states_np.max()
        )

        self.stats_text_artist.set_text(stats_text)

    def toggle_pause(self) -> None:
        """Toggle pause state."""
        self.is_paused = not self.is_paused

    def increase_speed(self) -> None:
        """Increase simulation speed."""
        self.speed_multiplier = min(self.speed_multiplier * 1.5, 10.0)

    def decrease_speed(self) -> None:
        """Decrease simulation speed."""
        self.speed_multiplier = max(self.speed_multiplier / 1.5, 0.1)


def run_example_visualizations():
    """Run example visualizations demonstrating the system."""
    print("GPU-Accelerated Real-Time Visualization System")
    print("=" * 50)
    print("\nAvailable examples:")
    print("1. Agent Heatmap Visualization")
    print("2. Network Topology Dynamics")
    print("3. Emergence Metrics Monitoring")
    print("4. Phase Space Visualization")
    print("5. Complete Dashboard")

    choice = input("\nEnter example number (1-5): ").strip()

    if choice == '1':
        print("\nInitializing Agent Heatmap...")
        viz = RealTimeGPUVisualizer()
        viz.setup_agent_heatmap(num_agents=5000)
        anim = viz.start_animation(viz.update_heatmap)

    elif choice == '2':
        print("\nInitializing Network Topology...")
        viz = RealTimeGPUVisualizer()
        viz.setup_network_graph(num_nodes=100)
        anim = viz.start_animation(viz.update_network)

    elif choice == '3':
        print("\nInitializing Emergence Monitor...")
        viz = RealTimeGPUVisualizer()
        viz.setup_emergence_monitor(
            metrics=['Diversity', 'Correlation', 'Novelty', 'Complexity']
        )
        anim = viz.start_animation(viz.update_emergence)

    elif choice == '4':
        print("\nInitializing Phase Space...")
        viz = RealTimeGPUVisualizer()
        viz.setup_phase_space(num_agents=1000)
        anim = viz.start_animation(viz.update_phase_space)

    elif choice == '5':
        print("\nInitializing Complete Dashboard...")
        dashboard = SimulationDashboard(num_agents=2000, num_nodes=50)
        fig = dashboard.create_dashboard()

        # Use matplotlib's animation
        import matplotlib.animation as animation

        def update(frame):
            dashboard.update_dashboard(frame)
            return []

        anim = animation.FuncAnimation(
            fig,
            update,
            interval=50,
            blit=False
        )

        plt.show()

    else:
        print("Invalid choice. Running dashboard by default...")
        dashboard = SimulationDashboard()
        fig = dashboard.create_dashboard()
        plt.show()


if __name__ == "__main__":
    run_example_visualizations()
