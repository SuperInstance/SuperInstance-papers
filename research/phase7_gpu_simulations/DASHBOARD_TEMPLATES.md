# Dashboard Templates Guide

## Overview

This guide provides ready-to-use dashboard templates for common visualization scenarios in SuperInstance simulations. Each template is optimized for 60 FPS performance and GPU acceleration.

## Table of Contents

1. [Agent Swarm Dashboard](#agent-swarm-dashboard)
2. [Network Dynamics Dashboard](#network-dynamics-dashboard)
3. [Phase Space Explorer](#phase-space-explorer)
4. [Emergence Monitor](#emergence-monitor)
5. [Performance Profiler](#performance-profiler)
6. [Multi-Simulation Comparison](#multi-simulation-comparison)

---

## Agent Swarm Dashboard

### Use Case
Monitor large-scale agent behavior with spatial distribution, state evolution, and clustering metrics.

### Template Code

```python
import cupy as cp
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
import numpy as np

class AgentSwarmDashboard:
    """Dashboard for agent swarm monitoring."""

    def __init__(self, num_agents=5000):
        self.num_agents = num_agents

        # GPU arrays
        self.positions_gpu = cp.random.random((num_agents, 2))
        self.states_gpu = cp.random.random(num_agents)
        self.velocities_gpu = cp.random.normal(0, 0.01, (num_agents, 2))

        # History for metrics
        self.history_length = 500
        self.density_history = cp.zeros(self.history_length)
        self.clustering_history = cp.zeros(self.history_length)

        self.setup_dashboard()

    def setup_dashboard(self):
        """Setup dashboard layout."""
        self.fig = plt.figure(figsize=(16, 10))
        gs = self.fig.add_gridspec(2, 3, hspace=0.3, wspace=0.3)

        # Main heatmap
        self.ax_map = self.fig.add_subplot(gs[0, :2])
        self.setup_map_panel()

        # State distribution
        self.ax_dist = self.fig.add_subplot(gs[0, 2])
        self.setup_distribution_panel()

        # Density metrics
        self.ax_density = self.fig.add_subplot(gs[1, 0])
        self.setup_density_panel()

        # Clustering metrics
        self.ax_cluster = self.fig.add_subplot(gs[1, 1])
        self.setup_clustering_panel()

        # Statistics
        self.ax_stats = self.fig.add_subplot(gs[1, 2])
        self.setup_stats_panel()

        self.fig.suptitle("Agent Swarm Dashboard", fontsize=16, fontweight='bold')

    def setup_map_panel(self):
        """Setup spatial map panel."""
        self.map_artist = self.ax_map.imshow(
            np.zeros((100, 100)),
            cmap='viridis',
            interpolation='bilinear',
            vmin=0, vmax=1,
            origin='lower'
        )
        self.ax_map.set_title("Agent Spatial Distribution")
        self.ax_map.set_xlabel("X Position")
        self.ax_map.set_ylabel("Y Position")
        plt.colorbar(self.map_artist, ax=self.ax_map, fraction=0.046, pad=0.04)

    def setup_distribution_panel(self):
        """Setup state distribution panel."""
        self.hist_artist = self.ax_dist.hist(
            cp.asnumpy(self.states_gpu),
            bins=50,
            range=(0, 1),
            alpha=0.7,
            color='blue'
        )[2]
        self.ax_dist.set_title("State Distribution")
        self.ax_dist.set_xlabel("State Value")
        self.ax_dist.set_ylabel("Count")

    def setup_density_panel(self):
        """Setup density metrics panel."""
        self.density_line, = self.ax_density.plot(
            [], [],
            lw=2,
            color='green'
        )
        self.ax_density.set_title("Mean Agent Density")
        self.ax_density.set_xlim(0, self.history_length)
        self.ax_density.set_ylim(0, 1)
        self.ax_density.grid(True, alpha=0.3)

    def setup_clustering_panel(self):
        """Setup clustering metrics panel."""
        self.cluster_line, = self.ax_cluster.plot(
            [], [],
            lw=2,
            color='orange'
        )
        self.ax_cluster.set_title("Clustering Coefficient")
        self.ax_cluster.set_xlim(0, self.history_length)
        self.ax_cluster.set_ylim(0, 1)
        self.ax_cluster.grid(True, alpha=0.3)

    def setup_stats_panel(self):
        """Setup statistics panel."""
        self.ax_stats.axis('off')
        self.stats_text = self.ax_stats.text(
            0.1, 0.5,
            "",
            fontsize=10,
            family='monospace',
            verticalalignment='center'
        )

    def update(self, frame):
        """Update dashboard."""
        # Update positions (random walk)
        self.positions_gpu += self.velocities_gpu
        self.positions_gpu = cp.clip(self.positions_gpu, 0, 1)

        # Update states
        self.states_gpu = cp.sin(
            frame * 0.05 +
            cp.linalg.norm(self.positions_gpu, axis=1) * 5
        ) * 0.5 + 0.5

        # Update heatmap
        positions_np = cp.asnumpy(self.positions_gpu)
        states_np = cp.asnumpy(self.states_gpu)

        grid, _, _ = np.histogram2d(
            positions_np[:, 0], positions_np[:, 1],
            bins=100,
            weights=states_np
        )
        grid = grid / (grid.max() + 1e-6)

        self.map_artist.set_data(grid.T)

        # Update distribution
        self.ax_dist.clear()
        self.hist_artist = self.ax_dist.hist(
            states_np,
            bins=50,
            range=(0, 1),
            alpha=0.7,
            color='blue'
        )[2]
        self.ax_dist.set_title("State Distribution")
        self.ax_dist.set_xlabel("State Value")
        self.ax_dist.set_ylabel("Count")

        # Update metrics
        density = cp.mean(states_gpu)
        clustering = cp.std(states_gpu)

        self.density_history = cp.roll(self.density_history, -1)
        self.density_history[-1] = density

        self.clustering_history = cp.roll(self.clustering_history, -1)
        self.clustering_history[-1] = clustering

        self.density_line.set_data(
            np.arange(self.history_length),
            cp.asnumpy(self.density_history)
        )

        self.cluster_line.set_data(
            np.arange(self.history_length),
            cp.asnumpy(self.clustering_history)
        )

        # Update stats
        stats = f"""
        Swarm Statistics:
        ----------------
        Agents: {self.num_agents}
        Frame: {frame}

        State Metrics:
        -------------
        Mean: {float(cp.mean(states_gpu)):.3f}
        Std:  {float(cp.std(states_gpu)):.3f}
        Min:  {float(cp.min(states_gpu)):.3f}
        Max:  {float(cp.max(states_gpu)):.3f}

        Spatial Metrics:
        ---------------
        Density: {float(density):.3f}
        Cluster: {float(clustering):.3f}
        """
        self.stats_text.set_text(stats)

        return [self.map_artist]

    def run(self):
        """Run dashboard animation."""
        anim = FuncAnimation(
            self.fig,
            self.update,
            frames=None,
            interval=16,
            blit=False
        )
        plt.show()
```

---

## Network Dynamics Dashboard

### Use Case
Visualize network topology evolution, community detection, and connectivity metrics.

### Template Code

```python
class NetworkDynamicsDashboard:
    """Dashboard for network dynamics monitoring."""

    def __init__(self, num_nodes=100):
        self.num_nodes = num_nodes

        # GPU arrays
        self.positions_gpu = cp.random.random((num_nodes, 2)) * 2 - 1
        self.adjacency_gpu = self._initialize_adjacency()
        self.node_states_gpu = cp.random.random(num_nodes)

        # Metrics history
        self.history_length = 500
        self.connectivity_history = cp.zeros(self.history_length)
        self.clustering_history = cp.zeros(self.history_length)

        self.setup_dashboard()

    def _initialize_adjacency(self):
        """Initialize random adjacency matrix."""
        edge_prob = 0.1
        edges = cp.random.rand(self.num_nodes, self.num_nodes) < edge_prob
        edges = cp.logical_or(edges, edges.T)
        cp.fill_diagonal(edges, False)
        return cp.where(edges, cp.random.random((self.num_nodes, self.num_nodes)), 0)

    def setup_dashboard(self):
        """Setup dashboard layout."""
        self.fig = plt.figure(figsize=(16, 10))
        gs = self.fig.add_gridspec(2, 3, hspace=0.3, wspace=0.3)

        # Network graph
        self.ax_network = self.fig.add_subplot(gs[0, :2])
        self.setup_network_panel()

        # Degree distribution
        self.ax_degree = self.fig.add_subplot(gs[0, 2])
        self.setup_degree_panel()

        # Connectivity metrics
        self.ax_connectivity = self.fig.add_subplot(gs[1, 0])
        self.setup_connectivity_panel()

        # Clustering metrics
        self.ax_clustering = self.fig.add_subplot(gs[1, 1])
        self.setup_clustering_panel()

        # Network statistics
        self.ax_stats = self.fig.add_subplot(gs[1, 2])
        self.setup_stats_panel()

        self.fig.suptitle("Network Dynamics Dashboard", fontsize=16, fontweight='bold')

    def setup_network_panel(self):
        """Setup network visualization panel."""
        positions_np = cp.asnumpy(self.positions_gpu)
        states_np = cp.asnumpy(self.node_states_gpu)

        self.nodes_artist = self.ax_network.scatter(
            positions_np[:, 0],
            positions_np[:, 1],
            c=states_np,
            s=100,
            cmap='coolwarm',
            edgecolors='black',
            linewidths=1
        )

        # Draw edges
        self._draw_edges()

        self.ax_network.set_title("Network Topology")
        self.ax_network.set_xlim(-1.5, 1.5)
        self.ax_network.set_ylim(-1.5, 1.5)
        self.ax_network.set_aspect('equal')

    def _draw_edges(self):
        """Draw network edges."""
        edge_indices = cp.where(cp.triu(self.adjacency_gpu) > 0)
        num_draw = min(100, edge_indices[0].shape[0])

        self.edge_artists = []
        positions_np = cp.asnumpy(self.positions_gpu)

        for i in range(num_draw):
            src = int(cp.asnumpy(edge_indices[0])[i])
            dst = int(cp.asnumpy(edge_indices[1])[i])

            line, = self.ax_network.plot(
                [positions_np[src, 0], positions_np[dst, 0]],
                [positions_np[src, 1], positions_np[dst, 1]],
                'k-',
                alpha=0.2,
                linewidth=0.5
            )
            self.edge_artists.append(line)

    def setup_degree_panel(self):
        """Setup degree distribution panel."""
        degrees = cp.sum(self.adjacency_gpu > 0, axis=1)
        degrees_np = cp.asnumpy(degrees)

        self.ax_degree.hist(
            degrees_np,
            bins=20,
            alpha=0.7,
            color='blue'
        )
        self.ax_degree.set_title("Degree Distribution")
        self.ax_degree.set_xlabel("Degree")
        self.ax_degree.set_ylabel("Count")

    def setup_connectivity_panel(self):
        """Setup connectivity metrics panel."""
        self.connectivity_line, = self.ax_connectivity.plot(
            [], [],
            lw=2,
            color='green'
        )
        self.ax_connectivity.set_title("Network Connectivity")
        self.ax_connectivity.set_xlim(0, self.history_length)
        self.ax_connectivity.set_ylim(0, 1)
        self.ax_connectivity.grid(True, alpha=0.3)

    def setup_clustering_panel(self):
        """Setup clustering metrics panel."""
        self.clustering_line, = self.ax_clustering.plot(
            [], [],
            lw=2,
            color='orange'
        )
        self.ax_clustering.set_title("Clustering Coefficient")
        self.ax_clustering.set_xlim(0, self.history_length)
        self.ax_clustering.set_ylim(0, 1)
        self.ax_clustering.grid(True, alpha=0.3)

    def setup_stats_panel(self):
        """Setup statistics panel."""
        self.ax_stats.axis('off')
        self.stats_text = self.ax_stats.text(
            0.1, 0.5,
            "",
            fontsize=9,
            family='monospace',
            verticalalignment='center'
        )

    def update(self, frame):
        """Update dashboard."""
        # Update positions (force-directed layout)
        diff = self.positions_gpu[:, None, :] - self.positions_gpu[None, :, :]
        dist_sq = cp.sum(diff**2, axis=2) + 1e-6

        # Repulsion
        force = diff / dist_sq[:, :, None] * 0.01

        # Attraction along edges
        adjacency_binary = (self.adjacency_gpu > 0).astype(cp.float32)
        attraction = -diff * adjacency_binary[:, :, None] * 0.1

        # Update positions
        self.positions_gpu += cp.sum(force + attraction, axis=1)
        self.positions_gpu = cp.clip(self.positions_gpu, -1.3, 1.3)

        # Update node states
        self.node_states_gpu = cp.sin(
            frame * 0.03 +
            cp.linalg.norm(self.positions_gpu, axis=1) * 3
        ) * 0.5 + 0.5

        # Update visualization
        positions_np = cp.asnumpy(self.positions_gpu)
        states_np = cp.asnumpy(self.node_states_gpu)

        self.nodes_artist.set_offsets(positions_np)
        self.nodes_artist.set_array(states_np)

        # Update edges
        edge_indices = cp.where(cp.triu(self.adjacency_gpu) > 0)
        num_draw = min(len(self.edge_artists), edge_indices[0].shape[0])

        for i in range(num_draw):
            src = int(cp.asnumpy(edge_indices[0])[i])
            dst = int(cp.asnumpy(edge_indices[1])[i])

            self.edge_artists[i].set_data(
                [positions_np[src, 0], positions_np[dst, 0]],
                [positions_np[src, 1], positions_np[dst, 1]]
            )

        # Update metrics
        degrees = cp.sum(self.adjacency_gpu > 0, axis=1)
        connectivity = cp.mean(degrees) / self.num_nodes
        clustering = cp.sum(self.adjacency_gpu @ self.adjacency_gpu @ self.adjacency_gpu) / (
            cp.sum(degrees * (degrees - 1)) + 1e-6
        )

        self.connectivity_history = cp.roll(self.connectivity_history, -1)
        self.connectivity_history[-1] = connectivity

        self.clustering_history = cp.roll(self.clustering_history, -1)
        self.clustering_history[-1] = cp.clip(clustering, 0, 1)

        self.connectivity_line.set_data(
            np.arange(self.history_length),
            cp.asnumpy(self.connectivity_history)
        )

        self.clustering_line.set_data(
            np.arange(self.history_length),
            cp.asnumpy(self.clustering_history)
        )

        # Update stats
        stats = f"""
        Network Statistics:
        ------------------
        Nodes: {self.num_nodes}
        Edges: {int(cp.sum(self.adjacency_gpu > 0) / 2)}
        Frame: {frame}

        Connectivity Metrics:
        -------------------
        Density: {float(connectivity):.3f}
        Cluster: {float(cp.clustering_history[-1]):.3f}
        Avg Deg: {float(cp.mean(degrees)):.1f}

        State Metrics:
        -------------
        Mean: {float(cp.mean(self.node_states_gpu)):.3f}
        Std:  {float(cp.std(self.node_states_gpu)):.3f}
        """
        self.stats_text.set_text(stats)

        return [self.nodes_artist]

    def run(self):
        """Run dashboard animation."""
        anim = FuncAnimation(
            self.fig,
            self.update,
            frames=None,
            interval=16,
            blit=False
        )
        plt.show()
```

---

## Phase Space Explorer

### Use Case
Explore dynamical systems behavior in phase space with trajectory tracking and stability analysis.

### Template Code

```python
class PhaseSpaceExplorer:
    """Interactive phase space visualization."""

    def __init__(self, num_points=1000, system='vanderpol'):
        self.num_points = num_points
        self.system = system

        # GPU arrays
        self.x_gpu = cp.random.normal(0, 1, num_points)
        self.y_gpu = cp.random.normal(0, 1, num_points)

        # Trajectory tracking
        self.trajectory_length = 200
        self.traj_x = cp.zeros(self.trajectory_length)
        self.traj_y = cp.zeros(self.trajectory_length)

        # Stability metric
        self.history_length = 500
        self.stability_history = cp.zeros(self.history_length)

        self.setup_dashboard()

    def setup_dashboard(self):
        """Setup dashboard layout."""
        self.fig = plt.figure(figsize=(14, 8))
        gs = self.fig.add_gridspec(2, 2, hspace=0.3, wspace=0.3)

        # Phase space
        self.ax_phase = self.fig.add_subplot(gs[0, 0])
        self.setup_phase_panel()

        # Trajectory
        self.ax_traj = self.fig.add_subplot(gs[0, 1])
        self.setup_trajectory_panel()

        # Time series
        self.ax_time = self.fig.add_subplot(gs[1, 0])
        self.setup_time_series_panel()

        # Stability metric
        self.ax_stability = self.fig.add_subplot(gs[1, 1])
        self.setup_stability_panel()

        self.fig.suptitle(f"Phase Space Explorer - {self.system.title()} System",
                         fontsize=16, fontweight='bold')

    def setup_phase_panel(self):
        """Setup phase space panel."""
        x_np = cp.asnumpy(self.x_gpu)
        y_np = cp.asnumpy(self.y_gpu)

        self.phase_artist = self.ax_phase.scatter(
            x_np, y_np,
            s=2,
            alpha=0.5,
            c='blue'
        )

        self.ax_phase.set_title("Phase Space")
        self.ax_phase.set_xlabel("x")
        self.ax_phase.set_ylabel("y")
        self.ax_phase.set_xlim(-4, 4)
        self.ax_phase.set_ylim(-4, 4)
        self.ax_phase.grid(True, alpha=0.3)

    def setup_trajectory_panel(self):
        """Setup trajectory panel."""
        self.traj_line, = self.ax_traj.plot(
            [], [],
            'r-',
            lw=2
        )
        self.traj_point, = self.ax_traj.plot(
            [], [],
            'ro',
            markersize=8
        )

        self.ax_traj.set_title("Sample Trajectory")
        self.ax_traj.set_xlabel("x")
        self.ax_traj.set_ylabel("y")
        self.ax_traj.set_xlim(-4, 4)
        self.ax_traj.set_ylim(-4, 4)
        self.ax_traj.grid(True, alpha=0.3)

    def setup_time_series_panel(self):
        """Setup time series panel."""
        self.x_line, = self.ax_time.plot([], [], 'b-', lw=1, label='x')
        self.y_line, = self.ax_time.plot([], [], 'r-', lw=1, label='y')

        self.ax_time.set_title("Time Series")
        self.ax_time.set_xlabel("Time")
        self.ax_time.set_ylabel("Value")
        self.ax_time.set_xlim(0, 200)
        self.ax_time.set_ylim(-4, 4)
        self.ax_time.legend()
        self.ax_time.grid(True, alpha=0.3)

    def setup_stability_panel(self):
        """Setup stability metric panel."""
        self.stability_line, = self.ax_stability.plot(
            [], [],
            'g-',
            lw=2
        )

        self.ax_stability.set_title("Stability Metric")
        self.ax_stability.set_xlabel("Time")
        self.ax_stability.set_ylabel("Stability")
        self.ax_stability.set_xlim(0, self.history_length)
        self.ax_stability.set_ylim(0, 1)
        self.ax_stability.grid(True, alpha=0.3)

    def dynamics(self, x, y, dt=0.05):
        """Compute system dynamics."""
        if self.system == 'vanderpol':
            # Van der Pol oscillator
            mu = 1.0
            dx = y * dt
            dy = (mu * (1 - x**2) * y - x) * dt
        elif self.system == 'lorenz':
            # Simplified Lorenz-like
            sigma, rho, beta = 10, 28, 8/3
            dx = sigma * (y - x) * dt
            dy = (x * (rho - x) - y) * dt
        else:
            # Damped harmonic oscillator
            dx = y * dt
            dy = (-0.1 * y - x) * dt

        return dx, dy

    def update(self, frame):
        """Update dashboard."""
        # Compute dynamics
        dx, dy = self.dynamics(self.x_gpu, self.y_gpu)

        # Update positions
        self.x_gpu += dx
        self.y_gpu += dy

        # Clip for stability
        self.x_gpu = cp.clip(self.x_gpu, -4, 4)
        self.y_gpu = cp.clip(self.y_gpu, -4, 4)

        # Update phase space
        x_np = cp.asnumpy(self.x_gpu)
        y_np = cp.asnumpy(self.y_gpu)

        self.phase_artist.set_offsets(np.column_stack([x_np, y_np]))

        # Update trajectory (first point)
        self.traj_x = cp.roll(self.traj_x, -1)
        self.traj_y = cp.roll(self.traj_y, -1)
        self.traj_x[-1] = self.x_gpu[0]
        self.traj_y[-1] = self.y_gpu[0]

        traj_x_np = cp.asnumpy(self.traj_x)
        traj_y_np = cp.asnumpy(self.traj_y)

        self.traj_line.set_data(traj_x_np, traj_y_np)
        self.traj_point.set_data([traj_x_np[-1]], [traj_y_np[-1]])

        # Update time series
        time_points = np.arange(self.trajectory_length)
        self.x_line.set_data(time_points, traj_x_np)
        self.y_line.set_data(time_points, traj_y_np)

        # Update stability metric
        stability = 1.0 / (1.0 + cp.std(self.x_gpu))
        self.stability_history = cp.roll(self.stability_history, -1)
        self.stability_history[-1] = stability

        self.stability_line.set_data(
            np.arange(self.history_length),
            cp.asnumpy(self.stability_history)
        )

        return [self.phase_artist, self.traj_line, self.stability_line]

    def run(self):
        """Run dashboard animation."""
        anim = FuncAnimation(
            self.fig,
            self.update,
            frames=None,
            interval=16,
            blit=False
        )
        plt.show()
```

---

## Quick Start

### Basic Usage

```python
# Agent Swarm Dashboard
dashboard = AgentSwarmDashboard(num_agents=5000)
dashboard.run()

# Network Dynamics Dashboard
dashboard = NetworkDynamicsDashboard(num_nodes=100)
dashboard.run()

# Phase Space Explorer
explorer = PhaseSpaceExplorer(num_points=1000, system='vanderpol')
explorer.run()
```

### Customization

Each dashboard can be customized by:

1. **Changing layout**: Modify grid specification in `setup_dashboard()`
2. **Adding metrics**: Add new history arrays and update functions
3. **Changing visual style**: Modify colormap, colors, line styles
4. **Adjusting performance**: Change history lengths, update frequencies

### Performance Tips

1. Reduce `num_agents` or `num_nodes` for better performance
2. Decrease `history_length` for less memory usage
3. Increase `interval` in `FuncAnimation` for lower FPS
4. Use `blit=True` for better rendering performance

These templates provide a foundation for building custom real-time dashboards for SuperInstance simulations.
