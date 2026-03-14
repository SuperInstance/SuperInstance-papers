"""
Interactive Visualization System for Large-Scale Discovery

This module provides publication-quality interactive visualizations
for discoveries made through large-scale simulations.

Author: SuperInstance Research Team
Date: 2026-03-13
"""

from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from mpl_toolkits.mplot3d import Axes3D
import networkx as nx
from matplotlib.gridspec import GridSpec
import seaborn as sns
from pathlib import Path
import json


# Set style
sns.set_style("whitegrid")
plt.rcParams['figure.dpi'] = 100
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 12
plt.rcParams['axes.titlesize'] = 14
plt.rcParams['legend.fontsize'] = 10


class PhaseTransitionVisualizer:
    """Visualize phase transitions and critical phenomena."""

    def __init__(self, figsize=(12, 8)):
        self.figsize = figsize

    def plot_phase_diagram(
        self,
        parameter_grid: np.ndarray,
        order_parameter: np.ndarray,
        parameter_names: List[str] = ['Temperature', 'Coupling'],
        transitions: Optional[List] = None,
        save_path: Optional[str] = None
    ):
        """
        Create phase diagram showing order parameter landscape.

        Args:
            parameter_grid: 2D grid of parameter combinations
            order_parameter: Order parameter values at each grid point
            parameter_names: Names of parameters
            transitions: Detected phase transitions
            save_path: Path to save figure
        """
        fig, ax = plt.subplots(figsize=self.figsize)

        # Create contour plot
        contour = ax.contourf(
            parameter_grid[:, :, 0],
            parameter_grid[:, :, 1],
            order_parameter,
            levels=50,
            cmap='RdBu_r'
        )

        # Add contour lines
        ax.contour(
            parameter_grid[:, :, 0],
            parameter_grid[:, :, 1],
            order_parameter,
            levels=10,
            colors='black',
            alpha=0.3,
            linewidths=0.5
        )

        # Mark phase transitions
        if transitions:
            trans_x = [t.parameter_location[0] for t in transitions]
            trans_y = [t.parameter_location[1] for t in transitions]
            ax.scatter(trans_x, trans_y, c='yellow', s=200, marker='*',
                      edgecolors='black', linewidths=2, label='Phase Transitions', zorder=5)

        # Labels and title
        ax.set_xlabel(parameter_names[0], fontsize=14)
        ax.set_ylabel(parameter_names[1], fontsize=14)
        ax.set_title('Phase Diagram', fontsize=16, fontweight='bold')

        # Colorbar
        cbar = plt.colorbar(contour, ax=ax)
        cbar.set_label('Order Parameter', fontsize=12)

        # Legend
        if transitions:
            ax.legend(loc='best', fontsize=10)

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig, ax

    def plot_critical_scaling(
        self,
        reduced_temperature: np.ndarray,
        order_parameter: np.ndarray,
        susceptibility: np.ndarray,
        critical_exponent: float,
        save_path: Optional[str] = None
    ):
        """
        Plot critical scaling behavior near phase transition.

        Args:
            reduced_temperature: (T - Tc) / Tc
            order_parameter: Order parameter values
            susceptibility: Susceptibility values
            critical_exponent: Fitted critical exponent
            save_path: Path to save figure
        """
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        # Order parameter scaling
        axes[0].scatter(reduced_temperature, order_parameter, alpha=0.6, s=20)

        # Fit power law
        mask = reduced_temperature > 0
        if np.sum(mask) > 2:
            coeffs = np.polyfit(np.log(reduced_temperature[mask]), np.log(order_parameter[mask]), 1)
            t_fit = np.linspace(min(reduced_temperature[mask]), max(reduced_temperature[mask]), 100)
            op_fit = np.exp(coeffs[1]) * t_fit ** coeffs[0]
            axes[0].plot(t_fit, op_fit, 'r-', linewidth=2, label=f'Fit: beta = {coeffs[0]:.2f}')

        axes[0].set_xlabel('Reduced Temperature (T-Tc)/Tc')
        axes[0].set_ylabel('Order Parameter')
        axes[0].set_title('Order Parameter Scaling')
        axes[0].legend()
        axes[0].set_xscale('log')
        axes[0].set_yscale('log')

        # Susceptibility scaling
        axes[1].scatter(reduced_temperature, susceptibility, alpha=0.6, s=20)

        mask = reduced_temperature > 0
        if np.sum(mask) > 2:
            coeffs = np.polyfit(np.log(reduced_temperature[mask]), np.log(susceptibility[mask]), 1)
            t_fit = np.linspace(min(reduced_temperature[mask]), max(reduced_temperature[mask]), 100)
            sus_fit = np.exp(coeffs[1]) * t_fit ** coeffs[0]
            axes[1].plot(t_fit, sus_fit, 'r-', linewidth=2, label=f'Fit: gamma = {coeffs[0]:.2f}')

        axes[1].set_xlabel('Reduced Temperature (T-Tc)/Tc')
        axes[1].set_ylabel('Susceptibility')
        axes[1].set_title('Susceptibility Scaling')
        axes[1].legend()
        axes[1].set_xscale('log')
        axes[1].set_yscale('log')

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig, axes

    def animate_phase_transition(
        self,
        time_series: List[np.ndarray],
        parameter_values: List[float],
        save_path: Optional[str] = None
    ):
        """
        Create animation of system evolving through phase transition.

        Args:
            time_series: List of system states over time
            parameter_values: Parameter value for each time series
            save_path: Path to save animation
        """
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))

        def update(frame):
            for ax in axes.flat:
                ax.clear()

            # Plot system state
            ax = axes[0, 0]
            ax.imshow(time_series[frame], cmap='coolwarm', vmin=-1, vmax=1)
            ax.set_title(f'System State (T={parameter_values[frame]:.2f})')

            # Plot magnetization
            ax = axes[0, 1]
            magnetizations = [np.mean(np.abs(ts)) for ts in time_series[:frame+1]]
            ax.plot(range(len(magnetizations)), magnetizations, 'b-', linewidth=2)
            ax.axhline(y=0, color='r', linestyle='--', alpha=0.5)
            ax.set_xlabel('Time Step')
            ax.set_ylabel('Magnetization')
            ax.set_title('Magnetization Evolution')
            ax.set_ylim(-0.1, 1.1)

            # Plot correlation
            ax = axes[1, 0]
            if frame > 0:
                corr = np.corrcoef(time_series[frame].flatten(), time_series[0].flatten())[0, 1]
                ax.bar([0], [corr], color='blue')
                ax.set_ylim(-1, 1)
                ax.set_xticks([])
                ax.set_ylabel('Correlation')
                ax.set_title(f'Correlation with Initial State: {corr:.3f}')

            # Plot parameter evolution
            ax = axes[1, 1]
            ax.plot(range(frame+1), parameter_values[:frame+1], 'g-', linewidth=2)
            ax.set_xlabel('Time Step')
            ax.set_ylabel('Temperature')
            ax.set_title('Parameter Evolution')

        ani = animation.FuncAnimation(fig, update, frames=len(time_series), interval=200)

        if save_path:
            ani.save(save_path, writer='pillow', fps=5)

        return ani


class NetworkEvolutionVisualizer:
    """Visualize network evolution patterns."""

    def __init__(self, figsize=(12, 8)):
        self.figsize = figsize

    def plot_network_evolution(
        self,
        networks: List[nx.Graph],
        time_steps: List[int],
        layout: str = 'spring',
        save_path: Optional[str] = None
    ):
        """
        Create visualization of network evolution over time.

        Args:
            networks: List of network states at different times
            time_steps: Time step for each network
            layout: Network layout algorithm
            save_path: Path to save figure
        """
        n_snapshots = len(networks)
        fig, axes = plt.subplots(2, (n_snapshots + 1) // 2, figsize=(15, 10))
        axes = axes.flat if n_snapshots > 1 else [axes]

        for i, (G, t) in enumerate(zip(networks, time_steps)):
            ax = axes[i]

            # Compute layout
            if layout == 'spring':
                pos = nx.spring_layout(G, seed=42)
            elif layout == 'circular':
                pos = nx.circular_layout(G)
            else:
                pos = nx.kamada_kawai_layout(G)

            # Draw network
            nx.draw_networkx_nodes(G, pos, ax=ax, node_size=50,
                                  node_color='lightblue', edgecolors='black')
            nx.draw_networkx_edges(G, pos, ax=ax, alpha=0.3, width=0.5)

            ax.set_title(f't = {t}', fontsize=12)
            ax.axis('off')

            # Add metrics
            density = nx.density(G)
            clustering = nx.average_clustering(G)
            ax.text(0.05, 0.95, f'density: {density:.3f}\nclustering: {clustering:.3f}',
                   transform=ax.transAxes, verticalalignment='top',
                   bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig, axes

    def plot_degree_distribution(
        self,
        networks: List[nx.Graph],
        labels: List[str],
        save_path: Optional[str] = None
    ):
        """
        Plot degree distributions for multiple networks.

        Args:
            networks: List of networks
            labels: Labels for each network
            save_path: Path to save figure
        """
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        # Linear scale
        ax = axes[0]
        for G, label in zip(networks, labels):
            degrees = [d for n, d in G.degree()]
            ax.hist(degrees, bins=20, alpha=0.5, label=label)
        ax.set_xlabel('Degree')
        ax.set_ylabel('Count')
        ax.set_title('Degree Distribution (Linear)')
        ax.legend()

        # Log-log scale
        ax = axes[1]
        for G, label in zip(networks, labels):
            degrees = [d for n, d in G.degree()]
            ax.hist(degrees, bins=20, alpha=0.5, label=label)
        ax.set_xlabel('Degree')
        ax.set_ylabel('Count')
        ax.set_title('Degree Distribution (Log-Log)')
        ax.set_xscale('log')
        ax.set_yscale('log')
        ax.legend()

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig, axes

    def plot_community_evolution(
        self,
        community_data: List[Dict],
        save_path: Optional[str] = None
    ):
        """
        Plot evolution of community structure.

        Args:
            community_data: List of community information at each time step
            save_path: Path to save figure
        """
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        time_steps = [d['time_step'] for d in community_data]
        n_communities = [d['n_communities'] for d in community_data]
        modularity = [d['modularity'] for d in community_data]
        avg_community_size = [d['avg_community_size'] for d in community_data]

        # Number of communities
        axes[0, 0].plot(time_steps, n_communities, 'b-o', linewidth=2, markersize=8)
        axes[0, 0].set_xlabel('Time Step')
        axes[0, 0].set_ylabel('Number of Communities')
        axes[0, 0].set_title('Community Count Evolution')
        axes[0, 0].grid(True, alpha=0.3)

        # Modularity
        axes[0, 1].plot(time_steps, modularity, 'r-o', linewidth=2, markersize=8)
        axes[0, 1].set_xlabel('Time Step')
        axes[0, 1].set_ylabel('Modularity')
        axes[0, 1].set_title('Modularity Evolution')
        axes[0, 1].grid(True, alpha=0.3)

        # Average community size
        axes[1, 0].plot(time_steps, avg_community_size, 'g-o', linewidth=2, markersize=8)
        axes[1, 0].set_xlabel('Time Step')
        axes[1, 0].set_ylabel('Average Community Size')
        axes[1, 0].set_title('Community Size Evolution')
        axes[1, 0].grid(True, alpha=0.3)

        # Community size distribution (final state)
        ax = axes[1, 1]
        final_communities = community_data[-1]['community_sizes']
        ax.bar(range(len(final_communities)), final_communities, color='purple', alpha=0.7)
        ax.set_xlabel('Community ID')
        ax.set_ylabel('Size')
        ax.set_title('Final Community Size Distribution')
        ax.grid(True, alpha=0.3, axis='y')

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig, axes

    def animate_network_evolution(
        self,
        networks: List[nx.Graph],
        time_steps: List[int],
        save_path: Optional[str] = None
    ):
        """
        Create animation of network evolution.

        Args:
            networks: List of network states
            time_steps: Time step for each network
            save_path: Path to save animation
        """
        fig, ax = plt.subplots(figsize=(10, 10))

        # Use consistent layout
        pos = nx.spring_layout(networks[0], seed=42)

        def update(frame):
            ax.clear()

            G = networks[frame]

            # Draw network
            nx.draw_networkx_nodes(G, pos, ax=ax, node_size=100,
                                  node_color='lightblue', edgecolors='black')
            nx.draw_networkx_edges(G, pos, ax=ax, alpha=0.3, width=1)

            ax.set_title(f'Network Evolution: t = {time_steps[frame]}', fontsize=14)
            ax.axis('off')

            # Add metrics
            density = nx.density(G)
            clustering = nx.average_clustering(G)
            ax.text(0.05, 0.95, f'Nodes: {G.number_of_nodes()}\nEdges: {G.number_of_edges()}\n'
                                f'Density: {density:.3f}\nClustering: {clustering:.3f}',
                   transform=ax.transAxes, verticalalignment='top',
                   bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.7),
                   fontsize=10)

        ani = animation.FuncAnimation(fig, update, frames=len(networks), interval=500)

        if save_path:
            ani.save(save_path, writer='pillow', fps=2)

        return ani


class MultiScaleVisualizer:
    """Visualize multi-scale emergence patterns."""

    def __init__(self, figsize=(12, 8)):
        self.figsize = figsize

    def plot_scale_invariance(
        self,
        scales: np.ndarray,
        metrics: Dict[str, np.ndarray],
        save_path: Optional[str] = None
    ):
        """
        Plot scale-invariant relationships.

        Args:
            scales: Array of scale values
            metrics: Dictionary of metric names to values at each scale
            save_path: Path to save figure
        """
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        metric_names = list(metrics.keys())

        for i, metric_name in enumerate(metric_names[:4]):
            ax = axes.flat[i]

            values = metrics[metric_name]

            # Linear scale
            ax.plot(scales, values, 'o-', linewidth=2, markersize=8, label='Data')

            # Power law fit
            if len(scales) > 2:
                log_scales = np.log(scales)
                log_values = np.log(values)
                coeffs = np.polyfit(log_scales, log_values, 1)

                scale_fit = np.linspace(min(scales), max(scales), 100)
                value_fit = np.exp(coeffs[1]) * scale_fit ** coeffs[0]
                ax.plot(scale_fit, value_fit, 'r--', linewidth=2,
                       label=f'Power law: exponent={coeffs[0]:.2f}')

            ax.set_xlabel('Scale')
            ax.set_ylabel(metric_name.replace('_', ' ').title())
            ax.set_title(f'{metric_name.replace("_", " ").title()} vs Scale')
            ax.legend()
            ax.grid(True, alpha=0.3)

            # Log-log plot if appropriate
            if min(scales) > 0 and min(values) > 0:
                ax.set_xscale('log')
                ax.set_yscale('log')

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig, axes

    def plot_fractal_analysis(
        self,
        box_sizes: np.ndarray,
        counts: np.ndarray,
        fractal_dimension: float,
        save_path: Optional[str] = None
    ):
        """
        Plot fractal dimension analysis.

        Args:
            box_sizes: Array of box sizes
            counts: Array of box counts
            fractal_dimension: Computed fractal dimension
            save_path: Path to save figure
        """
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        # Linear plot
        axes[0].plot(box_sizes, counts, 'o-', linewidth=2, markersize=10)
        axes[0].set_xlabel('Box Size')
        axes[0].set_ylabel('Box Count')
        axes[0].set_title('Box Counting Method')
        axes[0].grid(True, alpha=0.3)

        # Log-log plot with fit
        axes[1].loglog(box_sizes, counts, 'o-', linewidth=2, markersize=10, label='Data')

        # Fit line
        log_boxes = np.log(box_sizes)
        log_counts = np.log(counts)
        coeffs = np.polyfit(log_boxes, log_counts, 1)

        box_fit = np.linspace(min(box_sizes), max(box_sizes), 100)
        count_fit = np.exp(coeffs[1]) * box_fit ** coeffs[0]
        axes[1].loglog(box_fit, count_fit, 'r--', linewidth=2,
                     label=f'Fit: D = {-coeffs[0]:.3f}')

        axes[1].set_xlabel('Box Size')
        axes[1].set_ylabel('Box Count')
        axes[1].set_title(f'Fractal Dimension: {fractal_dimension:.3f}')
        axes[1].legend()
        axes[1].grid(True, alpha=0.3, which='both')

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig, axes

    def plot_emergence_thresholds(
        self,
        scales: np.ndarray,
        emergence_metrics: Dict[str, np.ndarray],
        thresholds: Dict[str, float],
        save_path: Optional[str] = None
    ):
        """
        Plot emergence detection across scales.

        Args:
            scales: Array of scale values
            emergence_metrics: Dictionary of metric names to values
            thresholds: Dictionary of threshold values
            save_path: Path to save figure
        """
        fig, ax = plt.subplots(figsize=(12, 6))

        colors = plt.cm.tab10(np.linspace(0, 1, len(emergence_metrics)))

        for i, (metric_name, values) in enumerate(emergence_metrics.items()):
            ax.plot(scales, values, 'o-', linewidth=2, markersize=8,
                   label=metric_name.replace('_', ' ').title(), color=colors[i])

            # Mark threshold if available
            if metric_name in thresholds:
                threshold = thresholds[metric_name]
                ax.axhline(y=threshold, color=colors[i], linestyle='--',
                          alpha=0.5, linewidth=1.5)

        ax.set_xlabel('Scale', fontsize=14)
        ax.set_ylabel('Emergence Metric', fontsize=14)
        ax.set_title('Emergence Detection Across Scales', fontsize=16, fontweight='bold')
        ax.legend(loc='best', fontsize=10)
        ax.grid(True, alpha=0.3)

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig, ax


class EcosystemVisualizer:
    """Visualize ecosystem evolution dynamics."""

    def __init__(self, figsize=(12, 8)):
        self.figsize = figsize

    def plot_diversity_evolution(
        self,
        generations: np.ndarray,
        diversity: np.ndarray,
        speciation_events: List[Dict],
        extinction_events: List[Dict],
        save_path: Optional[str] = None
    ):
        """
        Plot diversity evolution with speciation and extinction events.

        Args:
            generations: Array of generation numbers
            diversity: Diversity values at each generation
            speciation_events: List of speciation event dictionaries
            extinction_events: List of extinction event dictionaries
            save_path: Path to save figure
        """
        fig, ax = plt.subplots(figsize=(14, 6))

        # Plot diversity
        ax.plot(generations, diversity, 'b-', linewidth=2, label='Diversity')

        # Mark speciation events
        for event in speciation_events:
            gen = event['generation']
            if gen in generations:
                idx = np.where(generations == gen)[0][0]
                ax.axvline(x=gen, color='green', linestyle='--', alpha=0.3)
                ax.scatter([gen], [diversity[idx]], color='green', s=100,
                          marker='^', zorder=5, edgecolors='black', linewidths=1)

        # Mark extinction events
        for event in extinction_events:
            gen = event['generation']
            if gen in generations:
                idx = np.where(generations == gen)[0][0]
                ax.axvline(x=gen, color='red', linestyle='--', alpha=0.3)
                ax.scatter([gen], [diversity[idx]], color='red', s=100,
                          marker='v', zorder=5, edgecolors='black', linewidths=1)

        ax.set_xlabel('Generation', fontsize=14)
        ax.set_ylabel('Diversity', fontsize=14)
        ax.set_title('Ecosystem Diversity Evolution', fontsize=16, fontweight='bold')
        ax.legend(loc='best', fontsize=10)
        ax.grid(True, alpha=0.3)

        # Add custom legend for events
        from matplotlib.lines import Line2D
        legend_elements = [
            Line2D([0], [0], color='blue', lw=2, label='Diversity'),
            Line2D([0], [0], color='green', marker='^', linestyle='None',
                  markersize=10, label='Speciation'),
            Line2D([0], [0], color='red', marker='v', linestyle='None',
                  markersize=10, label='Extinction')
        ]
        ax.legend(handles=legend_elements, loc='best', fontsize=10)

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig, ax

    def plot_fitness_landscape(
        self,
        fitness_trajectories: np.ndarray,
        generations: np.ndarray,
        save_path: Optional[str] = None
    ):
        """
        Plot fitness landscape evolution.

        Args:
            fitness_trajectories: Array of fitness values (n_species, n_generations)
            generations: Array of generation numbers
            save_path: Path to save figure
        """
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        # Fitness trajectories
        ax = axes[0, 0]
        for i in range(min(10, fitness_trajectories.shape[0])):
            ax.plot(generations, fitness_trajectories[i, :], alpha=0.6, linewidth=1)
        ax.set_xlabel('Generation')
        ax.set_ylabel('Fitness')
        ax.set_title('Individual Fitness Trajectories')
        ax.grid(True, alpha=0.3)

        # Fitness distribution heatmap
        ax = axes[0, 1]
        n_species_plot = min(50, fitness_trajectories.shape[0])
        im = ax.imshow(fitness_trajectories[:n_species_plot, :],
                      aspect='auto', cmap='viridis', interpolation='nearest')
        ax.set_xlabel('Generation')
        ax.set_ylabel('Species')
        ax.set_title('Fitness Distribution Heatmap')
        plt.colorbar(im, ax=ax, label='Fitness')

        # Fitness statistics
        ax = axes[1, 0]
        mean_fitness = np.mean(fitness_trajectories, axis=0)
        std_fitness = np.std(fitness_trajectories, axis=0)

        ax.plot(generations, mean_fitness, 'b-', linewidth=2, label='Mean')
        ax.fill_between(generations, mean_fitness - std_fitness, mean_fitness + std_fitness,
                       alpha=0.3, label='±1 SD')
        ax.set_xlabel('Generation')
        ax.set_ylabel('Fitness')
        ax.set_title('Fitness Statistics')
        ax.legend()
        ax.grid(True, alpha=0.3)

        # Fitness distribution evolution
        ax = axes[1, 1]
        generations_to_plot = [0, len(generations)//4, len(generations)//2,
                              3*len(generations)//4, len(generations)-1]

        for i, gen_idx in enumerate(generations_to_plot):
            fitness_at_gen = fitness_trajectories[:, gen_idx]
            ax.hist(fitness_at_gen, bins=20, alpha=0.5,
                   label=f'Gen {generations[gen_idx]}')

        ax.set_xlabel('Fitness')
        ax.set_ylabel('Count')
        ax.set_title('Fitness Distribution Evolution')
        ax.legend(fontsize=8)
        ax.grid(True, alpha=0.3, axis='y')

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig, axes

    def plot_niche_dynamics(
        self,
        niche_data: List[Dict],
        save_path: Optional[str] = None
    ):
        """
        Plot ecological niche dynamics.

        Args:
            niche_data: List of niche information at each time step
            save_path: Path to save figure
        """
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        time_steps = [d['time_step'] for d in niche_data]
        n_niches = [d['n_niches'] for d in niche_data]
        niche_competition = [d['avg_competition'] for d in niche_data]
        niche_capacity = [d['avg_capacity'] for d in niche_data]

        # Number of niches
        axes[0, 0].plot(time_steps, n_niches, 'b-o', linewidth=2, markersize=8)
        axes[0, 0].set_xlabel('Time Step')
        axes[0, 0].set_ylabel('Number of Niches')
        axes[0, 0].set_title('Niche Count Evolution')
        axes[0, 0].grid(True, alpha=0.3)

        # Niche competition
        axes[0, 1].plot(time_steps, niche_competition, 'r-o', linewidth=2, markersize=8)
        axes[0, 1].set_xlabel('Time Step')
        axes[0, 1].set_ylabel('Average Competition')
        axes[0, 1].set_title('Niche Competition Evolution')
        axes[0, 1].grid(True, alpha=0.3)

        # Niche capacity
        axes[1, 0].plot(time_steps, niche_capacity, 'g-o', linewidth=2, markersize=8)
        axes[1, 0].set_xlabel('Time Step')
        axes[1, 0].set_ylabel('Average Capacity')
        axes[1, 0].set_title('Niche Capacity Evolution')
        axes[1, 0].grid(True, alpha=0.3)

        # Niche size distribution (final state)
        ax = axes[1, 1]
        final_niche_sizes = niche_data[-1]['niche_sizes']
        ax.bar(range(len(final_niche_sizes)), final_niche_sizes, color='purple', alpha=0.7)
        ax.set_xlabel('Niche ID')
        ax.set_ylabel('Size')
        ax.set_title('Final Niche Size Distribution')
        ax.grid(True, alpha=0.3, axis='y')

        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig, axes


class DiscoveryDashboard:
    """Create comprehensive dashboard for discoveries."""

    def __init__(self):
        self.phase_viz = PhaseTransitionVisualizer()
        self.network_viz = NetworkEvolutionVisualizer()
        self.multiscale_viz = MultiScaleVisualizer()
        self.ecosystem_viz = EcosystemVisualizer()

    def create_discovery_dashboard(
        self,
        discovery_data: Dict[str, Any],
        save_path: Optional[str] = None
    ):
        """
        Create comprehensive dashboard for a discovery.

        Args:
            discovery_data: Dictionary containing all discovery data
            save_path: Path to save dashboard
        """
        discovery_type = discovery_data.get('type', 'unknown')

        if discovery_type == 'phase_transition':
            return self._create_phase_transition_dashboard(discovery_data, save_path)
        elif discovery_type == 'network_evolution':
            return self._create_network_evolution_dashboard(discovery_data, save_path)
        elif discovery_type == 'multi_scale_emergence':
            return self._create_multiscale_dashboard(discovery_data, save_path)
        elif discovery_type == 'ecosystem_dynamics':
            return self._create_ecosystem_dashboard(discovery_data, save_path)
        else:
            raise ValueError(f"Unknown discovery type: {discovery_type}")

    def _create_phase_transition_dashboard(
        self,
        data: Dict,
        save_path: Optional[str] = None
    ):
        """Create dashboard for phase transition discovery."""
        fig = plt.figure(figsize=(20, 12))
        gs = GridSpec(3, 3, figure=fig, hspace=0.3, wspace=0.3)

        # Phase diagram
        ax1 = fig.add_subplot(gs[0, :2])
        # Would call phase_viz.plot_phase_diagram here

        # Order parameter
        ax2 = fig.add_subplot(gs[1, 0])
        # Would plot order parameter evolution

        # Susceptibility
        ax3 = fig.add_subplot(gs[1, 1])
        # Would plot susceptibility

        # Correlation length
        ax4 = fig.add_subplot(gs[1, 2])
        # Would plot correlation length

        # Critical scaling
        ax5 = fig.add_subplot(gs[2, :])
        # Would plot critical scaling collapse

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')

        return fig

    def _create_network_evolution_dashboard(
        self,
        data: Dict,
        save_path: Optional[str] = None
    ):
        """Create dashboard for network evolution discovery."""
        # Similar structure for network evolution
        pass

    def _create_multiscale_dashboard(
        self,
        data: Dict,
        save_path: Optional[str] = None
    ):
        """Create dashboard for multi-scale emergence discovery."""
        # Similar structure for multi-scale emergence
        pass

    def _create_ecosystem_dashboard(
        self,
        data: Dict,
        save_path: Optional[str] = None
    ):
        """Create dashboard for ecosystem dynamics discovery."""
        # Similar structure for ecosystem dynamics
        pass


# Example usage

if __name__ == "__main__":
    # Create sample data
    np.random.seed(42)

    # Phase transition example
    T = np.linspace(0.1, 5.0, 50)
    J = np.linspace(0.1, 3.0, 50)
    T_grid, J_grid = np.meshgrid(T, J)
    order_param = np.tanh(J_grid / T_grid)

    # Visualize
    viz = PhaseTransitionVisualizer()
    fig, ax = viz.plot_phase_diagram(
        np.stack([T_grid, J_grid], axis=2),
        order_param,
        save_path='phase_diagram.png'
    )

    # Network evolution example
    networks = [nx.erdos_renyi_graph(50, 0.1) for _ in range(4)]
    net_viz = NetworkEvolutionVisualizer()
    fig, axes = net_viz.plot_network_evolution(
        networks,
        time_steps=[0, 100, 200, 300],
        save_path='network_evolution.png'
    )

    print("Visualizations created successfully!")
    print("Saved to phase_diagram.png and network_evolution.png")
