# Interactive Visualization Examples

## Overview

This guide provides practical examples demonstrating real-time GPU-accelerated visualizations for SuperInstance simulations. Each example includes complete code and explanations.

## Table of Contents

1. [Self-Play Tournament Visualization](#self-play-tournament-visualization)
2. [Hydraulic Pressure Flow Explorer](#hydraulic-pressure-flow-explorer)
3. [Value Network Learning Monitor](#value-network-learning-monitor)
4. [Emergence Detection Dashboard](#emergence-detection-dashboard)
5. [Multi-Agent Coordination Visualizer](#multi-agent-coordination-visualizer)

---

## Self-Play Tournament Visualization

### Description
Visualize ELO ratings and strategy evolution in self-play tournaments with real-time leaderboard and performance metrics.

### Complete Example

```python
import cupy as cp
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
import numpy as np

class SelfPlayTournamentVisualizer:
    """Real-time visualization of self-play tournament."""

    def __init__(self, num_players=50):
        self.num_players = num_players

        # Player data
        self.elo_ratings = cp.ones(num_players) * 1200
        self.strategies = cp.random.random(num_players)
        self.win_rates = cp.zeros(num_players)

        # Tournament history
        self.history_length = 200
        self.elo_history = cp.zeros((self.history_length, num_players))

        # Performance metrics
        self.diversity_history = cp.zeros(self.history_length)
        self.generation_history = cp.zeros(self.history_length)

        self.current_generation = 0

        self.setup_visualization()

    def setup_visualization(self):
        """Setup tournament visualization."""
        self.fig = plt.figure(figsize=(16, 10))
        gs = self.fig.add_gridspec(2, 3, hspace=0.3, wspace=0.3)

        # Leaderboard
        self.ax_leaderboard = self.fig.add_subplot(gs[0, 0])
        self.setup_leaderboard()

        # ELO evolution
        self.ax_elo = self.fig.add_subplot(gs[0, 1])
        self.setup_elo_evolution()

        # Strategy distribution
        self.ax_strategy = self.fig.add_subplot(gs[0, 2])
        self.setup_strategy_distribution()

        # Win rate heatmap
        self.ax_heatmap = self.fig.add_subplot(gs[1, 0])
        self.setup_win_rate_heatmap()

        # Diversity metric
        self.ax_diversity = self.fig.add_subplot(gs[1, 1])
        self.setup_diversity_metric()

        # Statistics panel
        self.ax_stats = self.fig.add_subplot(gs[1, 2])
        self.setup_stats_panel()

        self.fig.suptitle("Self-Play Tournament Visualization",
                         fontsize=16, fontweight='bold')

    def setup_leaderboard(self):
        """Setup leaderboard panel."""
        # Get top 10 players
        elo_np = cp.asnumpy(self.elo_ratings)
        top_indices = np.argsort(elo_np)[-10:][::-1]

        players = [f"Player {i}" for i in top_indices]
        ratings = elo_np[top_indices]

        bars = self.ax_leaderboard.barh(players, ratings, color='steelblue')
        self.leaderboard_bars = bars

        self.ax_leaderboard.set_title("Top 10 Leaderboard")
        self.ax_leaderboard.set_xlabel("ELO Rating")
        self.ax_leaderboard.set_xlim(1000, 2000)

    def setup_elo_evolution(self):
        """Setup ELO evolution panel."""
        self.elo_lines = []

        colors = plt.cm.tab10(np.linspace(0, 1, 10))
        for i in range(10):
            line, = self.ax_elo.plot([], [], lw=1.5, color=colors[i], alpha=0.7)
            self.elo_lines.append(line)

        self.ax_elo.set_title("Top 10 ELO Evolution")
        self.ax_elo.set_xlabel("Generation")
        self.ax_elo.set_ylabel("ELO Rating")
        self.ax_elo.set_xlim(0, self.history_length)
        self.ax_elo.set_ylim(1000, 2000)
        self.ax_elo.grid(True, alpha=0.3)

    def setup_strategy_distribution(self):
        """Setup strategy distribution panel."""
        strategies_np = cp.asnumpy(self.strategies)

        self.ax_strategy.hist(
            strategies_np,
            bins=30,
            alpha=0.7,
            color='coral'
        )

        self.ax_strategy.set_title("Strategy Distribution")
        self.ax_strategy.set_xlabel("Strategy Parameter")
        self.ax_strategy.set_ylabel("Count")

    def setup_win_rate_heatmap(self):
        """Setup win rate heatmap panel."""
        # Sample 20x20 matrix for visualization
        self.win_rate_matrix = cp.zeros((20, 20))

        self.heatmap_artist = self.ax_heatmap.imshow(
            cp.asnumpy(self.win_rate_matrix),
            cmap='RdYlGn',
            vmin=0, vmax=1,
            interpolation='nearest'
        )

        self.ax_heatmap.set_title("Win Rate Heatmap (Sampled)")
        plt.colorbar(self.heatmap_artist, ax=self.ax_heatmap)

    def setup_diversity_metric(self):
        """Setup diversity metric panel."""
        self.diversity_line, = self.ax_diversity.plot(
            [], [],
            lw=2,
            color='purple'
        )

        self.ax_diversity.set_title("Strategic Diversity")
        self.ax_diversity.set_xlabel("Generation")
        self.ax_diversity.set_ylabel("Diversity (Shannon Entropy)")
        self.ax_diversity.set_xlim(0, self.history_length)
        self.ax_diversity.set_ylim(0, 5)
        self.ax_diversity.grid(True, alpha=0.3)

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

    def simulate_match(self, player1_idx, player2_idx):
        """Simulate a match between two players."""
        # Probabilistic outcome based on ELO difference
        elo1 = self.elo_ratings[player1_idx]
        elo2 = self.elo_ratings[player2_idx]

        expected1 = 1.0 / (1.0 + 10**((elo2 - elo1) / 400))
        expected2 = 1.0 - expected1

        # Actual outcome with some randomness
        outcome1 = expected1 + cp.random.random() * 0.2 - 0.1
        outcome1 = cp.clip(outcome1, 0, 1)
        outcome2 = 1.0 - outcome1

        # Update ELO (K-factor = 32)
        K = 32
        self.elo_ratings[player1_idx] += K * (outcome1 - expected1)
        self.elo_ratings[player2_idx] += K * (outcome2 - expected2)

        # Update win rates
        self.win_rates[player1_idx] += outcome1 * 0.1
        self.win_rates[player2_idx] += outcome2 * 0.1

        self.win_rates = cp.clip(self.win_rates, 0, 1)

        return outcome1

    def evolve_strategies(self):
        """Evolve player strategies."""
        # Mutation
        mutation_rate = 0.1
        mutations = cp.random.random(self.num_players) < mutation_rate
        self.strategies[mutations] += cp.random.normal(
            0, 0.05, cp.sum(mutations)
        )

        # Crossover (top performers)
        top_indices = cp.argsort(self.elo_ratings)[-10:]
        for i in range(self.num_players - 10):
            if cp.random.random() < 0.05:
                parent1 = cp.random.choice(top_indices)
                parent2 = cp.random.choice(top_indices)
                self.strategies[i] = (
                    self.strategies[parent1] + self.strategies[parent2]
                ) / 2

        self.strategies = cp.clip(self.strategies, 0, 1)

    def compute_diversity(self):
        """Compute Shannon entropy of strategy distribution."""
        # Bin strategies
        hist, _ = cp.histogram(self.strategies, bins=20)
        hist = hist / cp.sum(hist)

        # Remove zeros
        hist = hist[hist > 0]

        # Shannon entropy
        entropy = -cp.sum(hist * cp.log(hist))

        return entropy

    def update(self, frame):
        """Update tournament visualization."""
        # Simulate matches
        num_matches = 50
        for _ in range(num_matches):
            idx1, idx2 = cp.random.choice(
                self.num_players, 2, replace=False
            )
            self.simulate_match(int(idx1), int(idx2))

        # Evolve strategies every 10 generations
        if frame % 10 == 0:
            self.evolve_strategies()
            self.current_generation += 1

        # Update history
        self.elo_history = cp.roll(self.elo_history, -1, axis=0)
        self.elo_history[-1] = self.elo_ratings

        diversity = self.compute_diversity()
        self.diversity_history = cp.roll(self.diversity_history, -1)
        self.diversity_history[-1] = diversity
        self.generation_history = cp.roll(self.generation_history, -1)
        self.generation_history[-1] = self.current_generation

        # Update leaderboard
        elo_np = cp.asnumpy(self.elo_ratings)
        top_indices = np.argsort(elo_np)[-10:][::-1]

        for i, (bar, idx) in enumerate(zip(self.leaderboard_bars, top_indices)):
            bar.set_width(elo_np[idx])
            bar.set_y(i)
            bar.set_label(f"Player {idx}")

        self.ax_leaderboard.set_yticks(range(10))
        self.ax_leaderboard.set_yticklabels([f"P{idx}" for idx in top_indices])

        # Update ELO evolution
        history_np = cp.asnumpy(self.elo_history)
        for i, line in enumerate(self.elo_lines):
            if i < len(top_indices):
                idx = top_indices[i]
                line.set_data(np.arange(self.history_length), history_np[:, idx])

        # Update strategy distribution
        self.ax_strategy.clear()
        strategies_np = cp.asnumpy(self.strategies)
        self.ax_strategy.hist(strategies_np, bins=30, alpha=0.7, color='coral')
        self.ax_strategy.set_title("Strategy Distribution")
        self.ax_strategy.set_xlabel("Strategy Parameter")
        self.ax_strategy.set_ylabel("Count")

        # Update win rate heatmap (sampled)
        sampled_indices = cp.random.choice(self.num_players, 20, replace=False)
        win_rates_sampled = self.win_rates[sampled_indices]

        # Create 20x20 matrix by outer product approximation
        self.win_rate_matrix = win_rates_sampled[:, None] * win_rates_sampled[None, :]

        self.heatmap_artist.set_data(cp.asnumpy(self.win_rate_matrix))

        # Update diversity
        self.diversity_line.set_data(
            np.arange(self.history_length),
            cp.asnumpy(self.diversity_history)
        )

        # Update stats
        stats = f"""
        Tournament Statistics:
        ----------------------
        Generation: {self.current_generation}
        Matches: {frame * num_matches}

        ELO Ratings:
        -----------
        Mean: {float(cp.mean(self.elo_ratings)):.1f}
        Std:  {float(cp.std(self.elo_ratings)):.1f}
        Min:  {float(cp.min(self.elo_ratings)):.1f}
        Max:  {float(cp.max(self.elo_ratings)):.1f}

        Diversity:
        ----------
        Entropy: {float(diversity):.3f}
        Strategy Spread: {float(cp.std(self.strategies)):.3f}
        """
        self.stats_text.set_text(stats)

        return self.leaderboard_bars + self.elo_lines + [self.diversity_line]

    def run(self):
        """Run tournament animation."""
        anim = FuncAnimation(
            self.fig,
            self.update,
            frames=None,
            interval=50,
            blit=False
        )
        plt.show()


# Run example
if __name__ == "__main__":
    print("Initializing Self-Play Tournament Visualization...")
    visualizer = SelfPlayTournamentVisualizer(num_players=50)
    visualizer.run()
```

---

## Hydraulic Pressure Flow Explorer

### Description
Interactive visualization of hydraulic pressure differentials, flow networks, and emergence detection.

### Complete Example

```python
class HydraulicFlowVisualizer:
    """Visualize hydraulic pressure and flow dynamics."""

    def __init__(self, num_nodes=100):
        self.num_nodes = num_nodes

        # Hydraulic properties
        self.pressure_gpu = cp.random.random(num_nodes) * 100
        self.flow_capacity_gpu = cp.random.random(num_nodes)
        self.positions_gpu = cp.random.random((num_nodes, 2))

        # Network connectivity
        self.adjacency_gpu = self._create_flow_network()

        # Flow dynamics
        self.actual_flow_gpu = cp.zeros((num_nodes, num_nodes))

        # Metrics
        self.history_length = 300
        self.pressure_history = cp.zeros((self.history_length, num_nodes))
        self.emergence_history = cp.zeros(self.history_length)

        self.setup_visualization()

    def _create_flow_network(self):
        """Create flow network with realistic topology."""
        # Spatial distance based connectivity
        positions_np = cp.asnumpy(self.positions_gpu)
        from scipy.spatial import distance_matrix

        dist_matrix = distance_matrix(positions_np, positions_np)
        threshold = np.percentile(dist_matrix, 20)  # Connect to nearest 20%

        adjacency = cp.where(
            cp.array(dist_matrix < threshold),
            cp.random.random((self.num_nodes, self.num_nodes)),
            cp.zeros((self.num_nodes, self.num_nodes))
        )

        # Make symmetric
        adjacency = (adjacency + adjacency.T) / 2

        # Remove self-loops
        cp.fill_diagonal(adjacency, 0)

        return adjacency

    def setup_visualization(self):
        """Setup hydraulic flow visualization."""
        self.fig = plt.figure(figsize=(16, 10))
        gs = self.fig.add_gridspec(2, 3, hspace=0.3, wspace=0.3)

        # Pressure map
        self.ax_pressure = self.fig.add_subplot(gs[0, 0])
        self.setup_pressure_map()

        # Flow network
        self.ax_flow = self.fig.add_subplot(gs[0, 1])
        self.setup_flow_network()

        # Pressure distribution
        self.ax_dist = self.fig.add_subplot(gs[0, 2])
        self.setup_pressure_distribution()

        # Flow dynamics
        self.ax_dynamics = self.fig.add_subplot(gs[1, :2])
        self.setup_flow_dynamics()

        # Emergence metric
        self.ax_emergence = self.fig.add_subplot(gs[1, 2])
        self.setup_emergence_metric()

        self.fig.suptitle("Hydraulic Pressure Flow Explorer",
                         fontsize=16, fontweight='bold')

    def setup_pressure_map(self):
        """Setup pressure heatmap."""
        # Create 2D pressure field
        grid_size = 50
        self.pressure_grid = cp.zeros((grid_size, grid_size))

        self.pressure_map_artist = self.ax_pressure.imshow(
            cp.asnumpy(self.pressure_grid),
            cmap='plasma',
            interpolation='bilinear',
            vmin=0, vmax=100,
            origin='lower'
        )

        self.ax_pressure.set_title("Pressure Field")
        plt.colorbar(self.pressure_map_artist, ax=self.ax_pressure,
                    fraction=0.046, pad=0.04, label='Pressure (kPa)')

    def setup_flow_network(self):
        """Setup flow network visualization."""
        positions_np = cp.asnumpy(self.positions_gpu)
        pressure_np = cp.asnumpy(self.pressure_gpu)

        # Nodes colored by pressure
        self.nodes_artist = self.ax_flow.scatter(
            positions_np[:, 0],
            positions_np[:, 1],
            c=pressure_np,
            s=80,
            cmap='plasma',
            edgecolors='black',
            linewidths=0.5,
            vmin=0, vmax=100
        )

        # Edges (sample for performance)
        self._draw_flow_edges()

        self.ax_flow.set_title("Flow Network Topology")
        self.ax_flow.set_aspect('equal')
        plt.colorbar(self.nodes_artist, ax=self.ax_flow,
                    fraction=0.046, pad=0.04, label='Pressure (kPa)')

    def _draw_flow_edges(self):
        """Draw flow edges."""
        edge_indices = cp.where(cp.triu(self.adjacency_gpu) > 0)
        num_draw = min(50, edge_indices[0].shape[0])

        self.flow_edges = []
        positions_np = cp.asnumpy(self.positions_gpu)

        for i in range(num_draw):
            src = int(cp.asnumpy(edge_indices[0])[i])
            dst = int(cp.asnumpy(edge_indices[1])[i])

            line, = self.ax_flow.plot(
                [positions_np[src, 0], positions_np[dst, 0]],
                [positions_np[src, 1], positions_np[dst, 1]],
                'k-',
                alpha=0.2,
                linewidth=1
            )
            self.flow_edges.append(line)

    def setup_pressure_distribution(self):
        """Setup pressure distribution histogram."""
        pressure_np = cp.asnumpy(self.pressure_gpu)

        self.ax_dist.hist(
            pressure_np,
            bins=30,
            alpha=0.7,
            color='orange',
            edgecolor='black'
        )

        self.ax_dist.set_title("Pressure Distribution")
        self.ax_dist.set_xlabel("Pressure (kPa)")
        self.ax_dist.set_ylabel("Node Count")

        # Add statistics lines
        mean_pressure = float(cp.mean(self.pressure_gpu))
        self.ax_dist.axvline(mean_pressure, color='red', linestyle='--',
                           linewidth=2, label=f'Mean: {mean_pressure:.1f} kPa')
        self.ax_dist.legend()

    def setup_flow_dynamics(self):
        """Setup flow dynamics time series."""
        # Sample 5 nodes for detailed tracking
        self.tracked_nodes = cp.random.choice(self.num_nodes, 5, replace=False)

        self.flow_lines = []
        colors = plt.cm.tab10(np.linspace(0, 1, 5))

        for i, color in enumerate(colors):
            line, = self.ax_dynamics.plot([], [], lw=2, color=color,
                                         label=f'Node {int(self.tracked_nodes[i])}')
            self.flow_lines.append(line)

        self.ax_dynamics.set_title("Pressure Dynamics (Tracked Nodes)")
        self.ax_dynamics.set_xlabel("Time Step")
        self.ax_dynamics.set_ylabel("Pressure (kPa)")
        self.ax_dynamics.set_xlim(0, self.history_length)
        self.ax_dynamics.set_ylim(0, 100)
        self.ax_dynamics.legend()
        self.ax_dynamics.grid(True, alpha=0.3)

    def setup_emergence_metric(self):
        """Setup emergence detection metric."""
        self.emergence_line, = self.ax_emergence.plot(
            [], [],
            lw=2,
            color='purple'
        )

        # Threshold line
        self.threshold_line = self.ax_emergence.axhline(
            y=0.7,
            color='red',
            linestyle='--',
            linewidth=1.5,
            alpha=0.7,
            label='Emergence Threshold'
        )

        self.ax_emergence.set_title("Flow Emergence Detection")
        self.ax_emergence.set_xlabel("Time Step")
        self.ax_emergence.set_ylabel("Emergence Score")
        self.ax_emergence.set_xlim(0, self.history_length)
        self.ax_emergence.set_ylim(0, 1)
        self.ax_emergence.legend()
        self.ax_emergence.grid(True, alpha=0.3)

    def compute_flow(self):
        """Compute actual flow based on pressure differentials."""
        # Flow = capacity * pressure_gradient
        pressure_diff = self.pressure_gpu[:, None] - self.pressure_gpu[None, :]
        self.actual_flow_gpu = self.adjacency_gpu * pressure_diff

    def detect_emergence(self):
        """Detect emergence in flow patterns."""
        # Compute flow variance
        flow_variance = cp.var(self.actual_flow_gpu)

        # Compute pressure clustering
        pressure_sorted = cp.sort(self.pressure_gpu)
        pressure_ranges = pressure_sorted[10:] - pressure_sorted[:-10]
        pressure_clustering = cp.mean(pressure_ranges)

        # Emergence = high variance + low clustering (unpredictable patterns)
        emergence = (flow_variance / (flow_variance + 1)) * (1 - pressure_clustering / 100)

        return emergence

    def update(self, frame):
        """Update hydraulic flow visualization."""
        # Update pressures (simulate dynamics)
        pressure_change = cp.random.normal(0, 2, self.num_nodes)
        self.pressure_gpu += pressure_change

        # Diffusion (pressure equalization)
        diffusion = cp.sum(self.adjacency_gpu * (
            self.pressure_gpu[None, :] - self.pressure_gpu[:, None]
        ), axis=1) * 0.1

        self.pressure_gpu += diffusion
        self.pressure_gpu = cp.clip(self.pressure_gpu, 0, 100)

        # Compute flow
        self.compute_flow()

        # Update pressure field (interpolate to grid)
        positions_np = cp.asnumpy(self.positions_gpu)
        pressure_np = cp.asnumpy(self.pressure_gpu)

        from scipy.interpolate import griddata
        grid_x, grid_y = np.mgrid[0:1:50j, 0:1:50j]
        grid_pressure = griddata(
            positions_np,
            pressure_np,
            (grid_x, grid_y),
            method='linear',
            fill_value=np.mean(pressure_np)
        )

        self.pressure_map_artist.set_data(grid_pressure)

        # Update network nodes
        self.nodes_artist.set_array(pressure_np)

        # Update pressure distribution
        self.ax_dist.clear()
        self.ax_dist.hist(pressure_np, bins=30, alpha=0.7,
                         color='orange', edgecolor='black')
        self.ax_dist.set_title("Pressure Distribution")
        self.ax_dist.set_xlabel("Pressure (kPa)")
        self.ax_dist.set_ylabel("Node Count")

        mean_pressure = float(cp.mean(self.pressure_gpu))
        self.ax_dist.axvline(mean_pressure, color='red', linestyle='--',
                           linewidth=2, label=f'Mean: {mean_pressure:.1f} kPa')
        self.ax_dist.legend()

        # Update history
        self.pressure_history = cp.roll(self.pressure_history, -1, axis=0)
        self.pressure_history[-1] = self.pressure_gpu

        # Update tracked nodes
        history_np = cp.asnumpy(self.pressure_history)
        for i, line in enumerate(self.flow_lines):
            node_idx = int(self.tracked_nodes[i])
            line.set_data(np.arange(self.history_length),
                         history_np[:, node_idx])

        # Update emergence
        emergence = self.detect_emergence()
        self.emergence_history = cp.roll(self.emergence_history, -1)
        self.emergence_history[-1] = emergence

        self.emergence_line.set_data(
            np.arange(self.history_length),
            cp.asnumpy(self.emergence_history)
        )

        return [self.pressure_map_artist, self.nodes_artist,
                self.emergence_line] + self.flow_lines

    def run(self):
        """Run flow visualization."""
        anim = FuncAnimation(
            self.fig,
            self.update,
            frames=None,
            interval=30,
            blit=False
        )
        plt.show()


# Run example
if __name__ == "__main__":
    print("Initializing Hydraulic Pressure Flow Explorer...")
    visualizer = HydraulicFlowVisualizer(num_nodes=100)
    visualizer.run()
```

---

## Quick Reference

### Running Examples

```python
# Example 1: Self-Play Tournament
from realtime_visualization import SelfPlayTournamentVisualizer
viz = SelfPlayTournamentVisualizer(num_players=50)
viz.run()

# Example 2: Hydraulic Flow
from realtime_visualization import HydraulicFlowVisualizer
viz = HydraulicFlowVisualizer(num_nodes=100)
viz.run()
```

### Performance Tuning

```python
# For better performance
viz = Visualizer(
    num_agents=1000,  # Reduce from 5000
    history_length=200  # Reduce from 500
)

# For higher quality
viz = Visualizer(
    num_agents=10000,
    history_length=500,
    frame_interval=20  # 50 FPS target
)
```

These examples demonstrate practical implementations of real-time GPU-accelerated visualizations for SuperInstance research simulations.
