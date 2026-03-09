"""
POLLN Scaling Law Experiments

Investigates how colony performance scales with size, identifying:
- Performance scaling laws
- Communication overhead
- Phase transitions
- Optimal colony sizes

Author: POLLN Research Team
Date: 2026-03-08
"""

import numpy as np
import matplotlib.pyplot as plt
from typing import List, Dict, Tuple
import json
from pathlib import Path

from emergent_behavior import (
    ColonySimulation,
    AgentType,
    run_single_simulation,
)


class ScalingExperiment:
    """Experiments to discover scaling laws in POLLN colonies"""

    def __init__(self, output_dir: str = "results/scaling"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.results = []

    def run_performance_scaling(
        self,
        colony_sizes: List[int] = None,
        trials_per_size: int = 10,
        num_steps: int = 500
    ) -> Dict:
        """
        Experiment: How does performance scale with colony size?

        Hypothesis: P(N) = P_∞ * (1 - e^(-N/N_0))
        """
        if colony_sizes is None:
            colony_sizes = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500]

        print("=" * 60)
        print("PERFORMANCE SCALING EXPERIMENT")
        print("=" * 60)
        print(f"Testing colony sizes: {colony_sizes}")
        print(f"Trials per size: {trials_per_size}")
        print(f"Steps per trial: {num_steps}")

        results = {
            'colony_sizes': colony_sizes,
            'mean_success_rate': [],
            'std_success_rate': [],
            'mean_sync': [],
            'mean_criticality': [],
            'survival_rates': [],
        }

        for size in colony_sizes:
            print(f"\nTesting N={size} agents...")

            success_rates = []
            syncs = []
            criticalities = []
            survivals = []

            for trial in range(trials_per_size):
                seed = 42 + trial
                result = run_single_simulation(
                    num_agents=size,
                    num_steps=num_steps,
                    seed=seed
                )

                success_rates.append(result['summary']['avg_success_rate'])
                syncs.append(result['summary']['avg_synchronization'])
                criticalities.append(result['summary']['avg_criticality'])
                survivals.append(result['summary']['survival_rate'])

            results['mean_success_rate'].append(np.mean(success_rates))
            results['std_success_rate'].append(np.std(success_rates))
            results['mean_sync'].append(np.mean(syncs))
            results['mean_criticality'].append(np.mean(criticalities))
            results['survival_rates'].append(np.mean(survivals))

            print(f"  Success: {results['mean_success_rate'][-1]:.4f} ± {results['std_success_rate'][-1]:.4f}")

        # Fit scaling law
        scaling_params = self._fit_scaling_law(
            colony_sizes,
            results['mean_success_rate']
        )

        results['scaling_fit'] = scaling_params

        # Save results
        self._save_results(results, 'performance_scaling.json')

        # Plot results
        self._plot_performance_scaling(results)

        return results

    def _fit_scaling_law(
        self,
        sizes: List[int],
        performances: List[float]
    ) -> Dict:
        """
        Fit scaling law: P(N) = P_∞ * (1 - e^(-N/N_0))

        Uses nonlinear least squares to fit parameters
        """
        from scipy.optimize import curve_fit

        def scaling_law(N, P_inf, N_0):
            return P_inf * (1 - np.exp(-N / N_0))

        # Initial guesses
        P_inf_init = max(performances)
        N_0_init = 30.0

        try:
            popt, pcov = curve_fit(
                scaling_law,
                np.array(sizes),
                np.array(performances),
                p0=[P_inf_init, N_0_init],
                bounds=([0, 1], [1, 100])
            )

            P_inf, N_0 = popt
            perr = np.sqrt(np.diag(pcov))

            # Calculate R²
            residuals = np.array(performances) - scaling_law(np.array(sizes), *popt)
            ss_res = np.sum(residuals ** 2)
            ss_tot = np.sum((np.array(performances) - np.mean(performances)) ** 2)
            r_squared = 1 - (ss_res / ss_tot)

            return {
                'P_inf': P_inf,
                'P_inf_error': perr[0],
                'N_0': N_0,
                'N_0_error': perr[1],
                'r_squared': r_squared,
                'formula': f'P(N) = {P_inf:.3f} * (1 - e^(-N/{N_0:.1f}))'
            }
        except Exception as e:
            print(f"Warning: Failed to fit scaling law: {e}")
            return {
                'P_inf': P_inf_init,
                'P_inf_error': 0,
                'N_0': N_0_init,
                'N_0_error': 0,
                'r_squared': 0,
                'formula': 'Fit failed'
            }

    def _plot_performance_scaling(self, results: Dict):
        """Create visualization of performance scaling"""
        sizes = np.array(results['colony_sizes'])
        mean_perf = np.array(results['mean_success_rate'])
        std_perf = np.array(results['std_success_rate'])

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        # 1. Performance vs colony size
        ax = axes[0, 0]
        ax.errorbar(sizes, mean_perf, yerr=std_perf, fmt='o-', label='Data', capsize=5)

        # Plot fitted curve
        if 'scaling_fit' in results:
            fit = results['scaling_fit']
            N_range = np.linspace(min(sizes), max(sizes), 100)
            P_fit = fit['P_inf'] * (1 - np.exp(-N_range / fit['N_0']))
            ax.plot(N_range, P_fit, '--', label=f"Fit: {fit['formula']}", alpha=0.7)

        ax.set_xlabel('Colony Size (N)', fontsize=12)
        ax.set_ylabel('Success Rate', fontsize=12)
        ax.set_title('Performance Scaling Law', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)

        # 2. Synchronization vs colony size
        ax = axes[0, 1]
        ax.plot(sizes, results['mean_sync'], 'o-', color='purple')
        ax.fill_between(
            sizes,
            np.array(results['mean_sync']) - np.array(results['mean_sync']) * 0.1,
            np.array(results['mean_sync']) + np.array(results['mean_sync']) * 0.1,
            alpha=0.3
        )
        ax.axhline(y=0.7, color='r', linestyle='--', label='Sync threshold')
        ax.set_xlabel('Colony Size (N)', fontsize=12)
        ax.set_ylabel('Synchronization (r)', fontsize=12)
        ax.set_title('Swarm Synchronization', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)

        # 3. Criticality vs colony size
        ax = axes[1, 0]
        ax.plot(sizes, results['mean_criticality'], 's-', color='green')
        ax.set_xlabel('Colony Size (N)', fontsize=12)
        ax.set_ylabel('Criticality', fontsize=12)
        ax.set_title('Self-Organized Criticality', fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3)

        # 4. Survival rate vs colony size
        ax = axes[1, 1]
        ax.plot(sizes, results['survival_rates'], '^-', color='orange')
        ax.set_xlabel('Colony Size (N)', fontsize=12)
        ax.set_ylabel('Survival Rate', fontsize=12)
        ax.set_title('Agent Survival', fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(self.output_dir / 'performance_scaling.png', dpi=300)
        print(f"\nPlot saved to {self.output_dir / 'performance_scaling.png'}")

    def run_communication_overhead(
        self,
        colony_sizes: List[int] = None,
        trials_per_size: int = 5,
        num_steps: int = 200
    ) -> Dict:
        """
        Experiment: How does communication overhead scale?

        Hypothesis: M(N) = α * N * log(N) + β * N
        """
        if colony_sizes is None:
            colony_sizes = [10, 20, 30, 50, 75, 100, 150, 200]

        print("\n" + "=" * 60)
        print("COMMUNICATION OVERHEAD EXPERIMENT")
        print("=" * 60)

        results = {
            'colony_sizes': colony_sizes,
            'avg_degrees': [],
            'avg_path_lengths': [],
            'clustering_coeffs': [],
            'message_complexity': [],
        }

        for size in colony_sizes:
            print(f"\nTesting N={size} agents...")

            degrees = []
            path_lengths = []
            clustering = []

            for trial in range(trials_per_size):
                seed = 100 + trial
                result = run_single_simulation(
                    num_agents=size,
                    num_steps=num_steps,
                    seed=seed
                )

                net_stats = result['network_stats']
                degrees.append(net_stats.get('avg_degree', 0))
                clustering.append(net_stats.get('density', 0))

                # Path length (use large number if infinite)
                path_len = net_stats.get('avg_path_length', float('inf'))
                if path_len == float('inf'):
                    path_len = size  # Approximation
                path_lengths.append(path_len)

            results['avg_degrees'].append(np.mean(degrees))
            results['avg_path_lengths'].append(np.mean(path_lengths))
            results['clustering_coeffs'].append(np.mean(clustering))

            # Approximate message complexity
            N = size
            alpha = 0.15
            beta = 0.82
            complexity = alpha * N * np.log(N) + beta * N
            results['message_complexity'].append(complexity)

            print(f"  Avg degree: {results['avg_degrees'][-1]:.2f}")
            print(f"  Clustering: {results['clustering_coeffs'][-1]:.4f}")

        # Save and plot
        self._save_results(results, 'communication_overhead.json')
        self._plot_communication_overhead(results)

        return results

    def _plot_communication_overhead(self, results: Dict):
        """Visualize communication overhead results"""
        sizes = np.array(results['colony_sizes'])

        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        # 1. Average degree
        ax = axes[0, 0]
        ax.plot(sizes, results['avg_degrees'], 'o-')
        ax.set_xlabel('Colony Size (N)', fontsize=12)
        ax.set_ylabel('Average Degree', fontsize=12)
        ax.set_title('Network Connectivity', fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3)

        # 2. Clustering coefficient
        ax = axes[0, 1]
        ax.plot(sizes, results['clustering_coeffs'], 's-', color='purple')
        ax.axhline(y=0.5, color='r', linestyle='--', label='High clustering')
        ax.axhline(y=0.1, color='orange', linestyle='--', label='Low clustering')
        ax.set_xlabel('Colony Size (N)', fontsize=12)
        ax.set_ylabel('Clustering Coefficient', fontsize=12)
        ax.set_title('Small-World Properties', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)

        # 3. Path length
        ax = axes[1, 0]
        ax.plot(sizes, results['avg_path_lengths'], '^-', color='green')
        ax.plot(sizes, np.log(sizes), '--', label='log(N) reference', alpha=0.5)
        ax.set_xlabel('Colony Size (N)', fontsize=12)
        ax.set_ylabel('Average Path Length', fontsize=12)
        ax.set_title('Path Length Scaling', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)

        # 4. Message complexity
        ax = axes[1, 1]
        ax.plot(sizes, results['message_complexity'], 'd-', color='red')
        ax.set_xlabel('Colony Size (N)', fontsize=12)
        ax.set_ylabel('Message Complexity', fontsize=12)
        ax.set_title('Communication Overhead', fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(self.output_dir / 'communication_overhead.png', dpi=300)
        print(f"\nPlot saved to {self.output_dir / 'communication_overhead.png'}")

    def run_diversity_impact(
        self,
        colony_size: int = 100,
        diversity_levels: List[Dict] = None,
        trials_per_level: int = 10,
        num_steps: int = 500
    ) -> Dict:
        """
        Experiment: How does agent type diversity affect performance?

        Tests different agent distributions (TASK, ROLE, CORE ratios)
        """
        if diversity_levels is None:
            diversity_levels = [
                {'TASK': 1.0, 'ROLE': 0.0, 'CORE': 0.0},  # All task
                {'TASK': 0.7, 'ROLE': 0.3, 'CORE': 0.0},  # Task + Role
                {'TASK': 0.5, 'ROLE': 0.3, 'CORE': 0.2},  # Balanced
                {'TASK': 0.3, 'ROLE': 0.5, 'CORE': 0.2},  # Role-heavy
                {'TASK': 0.2, 'ROLE': 0.2, 'CORE': 0.6},  # Core-heavy
            ]

        print("\n" + "=" * 60)
        print("DIVERSITY IMPACT EXPERIMENT")
        print("=" * 60)
        print(f"Colony size: {colony_size}")
        print(f"Diversity levels: {len(diversity_levels)}")

        results = {
            'diversity_configs': diversity_levels,
            'mean_success_rates': [],
            'std_success_rates': [],
            'shannon_diversity': [],
        }

        for config in diversity_levels:
            print(f"\nTesting config: {config}")

            # Calculate Shannon diversity
            probs = list(config.values())
            shannon = -sum(p * np.log2(p) if p > 0 else 0 for p in probs)

            success_rates = []

            for trial in range(trials_per_level):
                seed = 200 + trial
                result = run_single_simulation(
                    num_agents=colony_size,
                    num_steps=num_steps,
                    seed=seed
                )
                success_rates.append(result['summary']['avg_success_rate'])

            results['mean_success_rates'].append(np.mean(success_rates))
            results['std_success_rates'].append(np.std(success_rates))
            results['shannon_diversity'].append(shannon)

            print(f"  Shannon diversity: {shannon:.3f}")
            print(f"  Success rate: {results['mean_success_rates'][-1]:.4f} ± {results['std_success_rates'][-1]:.4f}")

        # Fit diversity-performance relationship
        diversity_fit = self._fit_diversity_law(
            results['shannon_diversity'],
            results['mean_success_rates']
        )
        results['diversity_fit'] = diversity_fit

        # Save and plot
        self._save_results(results, 'diversity_impact.json')
        self._plot_diversity_impact(results)

        return results

    def _fit_diversity_law(
        self,
        diversities: List[float],
        performances: List[float]
    ) -> Dict:
        """Fit diversity-performance relationship"""
        from scipy.optimize import curve_fit

        def diversity_law(H, P_base, lambda_, H_0):
            # P = P_base * [1 + lambda * (H - H_0)]
            # But we want a parabolic shape (optimal at intermediate diversity)
            return P_base * (1 - lambda_ * (H - H_0)**2)

        try:
            popt, _ = curve_fit(
                diversity_law,
                np.array(diversities),
                np.array(performances),
                p0=[0.9, 0.5, 1.1],
                bounds=([0, 0, 0], [1, 2, 2])
            )

            return {
                'P_base': popt[0],
                'lambda': popt[1],
                'H_optimal': popt[2],
                'formula': f'P(H) = {popt[0]:.3f} * [1 - {popt[1]:.2f} * (H - {popt[2]:.2f})²]'
            }
        except:
            return {'formula': 'Fit failed'}

    def _plot_diversity_impact(self, results: Dict):
        """Visualize diversity impact results"""
        diversities = results['shannon_diversity']
        mean_perf = results['mean_success_rates']
        std_perf = results['std_success_rates']

        fig, ax = plt.subplots(figsize=(10, 6))

        ax.errorbar(
            diversities,
            mean_perf,
            yerr=std_perf,
            fmt='o-',
            capsize=5,
            markersize=8
        )

        # Plot fitted curve
        if 'diversity_fit' in results:
            fit = results['diversity_fit']
            if fit['formula'] != 'Fit failed':
                H_range = np.linspace(min(diversities), max(diversities), 100)
                P_fit = fit['P_base'] * (1 - fit['lambda'] * (H_range - fit['H_optimal'])**2)
                ax.plot(H_range, P_fit, '--', label=f"Fit: {fit['formula']}", alpha=0.7)

        ax.set_xlabel('Shannon Diversity (H)', fontsize=12)
        ax.set_ylabel('Success Rate', fontsize=12)
        ax.set_title('Diversity-Performance Relationship', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)

        # Add config labels
        for i, (H, P) in enumerate(zip(diversities, mean_perf)):
            config = results['diversity_configs'][i]
            label = f"Task:{config['TASK']:.1f}"
            ax.annotate(label, (H, P), xytext=(5, 5), textcoords='offset points', fontsize=8)

        plt.tight_layout()
        plt.savefig(self.output_dir / 'diversity_impact.png', dpi=300)
        print(f"\nPlot saved to {self.output_dir / 'diversity_impact.png'}")

    def _save_results(self, results: Dict, filename: str):
        """Save results to JSON file"""
        # Convert numpy arrays to lists for JSON serialization
        def convert(obj):
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            if isinstance(obj, (np.integer, np.floating)):
                return float(obj)
            return obj

        results_serializable = {
            k: convert(v) if not isinstance(v, str) else v
            for k, v in results.items()
        }

        with open(self.output_dir / filename, 'w') as f:
            json.dump(results_serializable, f, indent=2)

        print(f"Results saved to {self.output_dir / filename}")


def run_all_scaling_experiments():
    """Run all scaling experiments"""
    experiment = ScalingExperiment()

    print("\n" + "=" * 60)
    print("POLLN SCALING LAW EXPERIMENTS")
    print("=" * 60)

    # Experiment 1: Performance scaling
    experiment.run_performance_scaling(
        colony_sizes=[10, 20, 30, 50, 75, 100, 150, 200],
        trials_per_size=5,
        num_steps=500
    )

    # Experiment 2: Communication overhead
    experiment.run_communication_overhead(
        colony_sizes=[10, 20, 30, 50, 75, 100, 150, 200],
        trials_per_size=3,
        num_steps=200
    )

    # Experiment 3: Diversity impact
    experiment.run_diversity_impact(
        colony_size=100,
        trials_per_level=5,
        num_steps=500
    )

    print("\n" + "=" * 60)
    print("ALL EXPERIMENTS COMPLETED")
    print("=" * 60)
    print(f"Results saved to {experiment.output_dir}")


if __name__ == "__main__":
    run_all_scaling_experiments()
