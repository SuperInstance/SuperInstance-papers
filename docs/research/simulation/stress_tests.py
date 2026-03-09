"""
POLLN Stress Testing and Robustness Analysis

Tests colony resilience under various stressors:
- Adversarial inputs
- Resource constraints
- Byzantine agents
- Cascading failures

Author: POLLN Research Team
Date: 2026-03-08
"""

import numpy as np
import matplotlib.pyplot as plt
from typing import List, Dict
import json
from pathlib import Path

from emergent_behavior import (
    ColonySimulation,
    AgentType,
    run_single_simulation,
)


class StressTestExperiment:
    """Stress testing experiments for POLLN colonies"""

    def __init__(self, output_dir: str = "results/stress"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def adversarial_input_test(
        self,
        colony_size: int = 100,
        noise_levels: List[float] = None,
        trials_per_level: int = 10,
        num_steps: int = 500
    ) -> Dict:
        """
        Test robustness to noisy/adversarial inputs

        Injects increasing levels of noise into task inputs
        """
        if noise_levels is None:
            noise_levels = [0.0, 0.1, 0.2, 0.3, 0.5, 0.7]

        print("=" * 60)
        print("ADVERSARIAL INPUT STRESS TEST")
        print("=" * 60)
        print(f"Colony size: {colony_size}")
        print(f"Noise levels: {noise_levels}")

        results = {
            'noise_levels': noise_levels,
            'success_rates': [],
            'survival_rates': [],
            'degradation_rates': [],
        }

        baseline_result = run_single_simulation(
            num_agents=colony_size,
            num_steps=num_steps,
            task_difficulty=0.0,
            seed=42
        )

        baseline_performance = baseline_result['summary']['avg_success_rate']

        for noise_level in noise_levels:
            print(f"\nTesting noise level: {noise_level:.1f}")

            success_rates = []
            survivals = []

            for trial in range(trials_per_level):
                seed = 400 + trial
                result = run_single_simulation(
                    num_agents=colony_size,
                    num_steps=num_steps,
                    task_difficulty=noise_level,
                    seed=seed
                )

                success_rates.append(result['summary']['avg_success_rate'])
                survivals.append(result['summary']['survival_rate'])

            avg_success = np.mean(success_rates)
            results['success_rates'].append(avg_success)
            results['survival_rates'].append(np.mean(survivals))

            # Degradation rate
            degradation = (baseline_performance - avg_success) / baseline_performance
            results['degradation_rates'].append(degradation)

            print(f"  Success rate: {avg_success:.4f}")
            print(f"  Degradation: {degradation:.1%}")

        # Calculate robustness metric
        robustness = self._calculate_robustness_metric(
            noise_levels,
            results['success_rates']
        )
        results['robustness_metric'] = robustness

        # Save and plot
        self._save_results(results, 'adversarial_input.json')
        self._plot_adversarial_input(results)

        return results

    def byzantine_agent_test(
        self,
        colony_size: int = 100,
        byzantine_fractions: List[float] = None,
        trials_per_fraction: int = 10,
        num_steps: int = 500
    ) -> Dict:
        """
        Test tolerance to Byzantine (malicious) agents

        Byzantine agents randomly report incorrect results
        """
        if byzantine_fractions is None:
            byzantine_fractions = [0.0, 0.05, 0.1, 0.2, 0.3]

        print("\n" + "=" * 60)
        print("BYZANTINE AGENT STRESS TEST")
        print("=" * 60)
        print(f"Colony size: {colony_size}")
        print(f"Byzantine fractions: {byzantine_fractions}")

        results = {
            'byzantine_fractions': byzantine_fractions,
            'success_rates': [],
            'collapse_points': [],
        }

        for fraction in byzantine_fractions:
            print(f"\nTesting Byzantine fraction: {fraction:.1%}")

            num_byzantine = int(colony_size * fraction)
            success_rates = []

            for trial in range(trials_per_fraction):
                seed = 500 + trial

                # Create simulation
                sim = ColonySimulation(num_agents=colony_size, seed=seed)

                # Mark random agents as Byzantine
                byzantine_indices = np.random.choice(
                    colony_size,
                    size=num_byzantine,
                    replace=False
                )

                # Run with Byzantine behavior
                for step in range(num_steps):
                    sim.step()

                    # Byzantine agents report incorrect results
                    for idx in byzantine_indices:
                        if sim.agents[idx].active:
                            # Report success when actually failed
                            sim.agents[idx].recent_successes.append(1.0)

                if sim.history:
                    success_rates.append(sim.history[-1].success_rate)

            avg_success = np.mean(success_rates) if success_rates else 0.0
            results['success_rates'].append(avg_success)

            # Check for collapse
            collapsed = avg_success < 0.5
            results['collapse_points'].append(collapsed)

            print(f"  Success rate: {avg_success:.4f}")
            print(f"  Collapsed: {collapsed}")

        # Find critical fraction
        critical_fraction = self._find_critical_fraction(
            byzantine_fractions,
            results['success_rates']
        )
        results['critical_fraction'] = critical_fraction

        # Save and plot
        self._save_results(results, 'byzantine_agents.json')
        self._plot_byzantine_agents(results)

        return results

    def cascading_failure_test(
        self,
        colony_size: int = 100,
        removal_strategies: List[str] = None,
        trials_per_strategy: int = 10,
        num_steps: int = 500
    ) -> Dict:
        """
        Test cascading failures from agent removal

        Compares random vs targeted removal (hubs)
        """
        if removal_strategies is None:
            removal_strategies = ['random', 'hubs', 'high_value']

        print("\n" + "=" * 60)
        print("CASCADING FAILURE STRESS TEST")
        print("=" * 60)
        print(f"Colony size: {colony_size}")
        print(f"Removal strategies: {removal_strategies}")

        results = {
            'strategies': removal_strategies,
            'performance_degradation': {},
            'recovery_times': {},
        }

        for strategy in removal_strategies:
            print(f"\nTesting strategy: {strategy}")

            degradations = []
            recovery_times = []

            for trial in range(trials_per_strategy):
                seed = 600 + trial

                # Create simulation
                sim = ColonySimulation(num_agents=colony_size, seed=seed)

                # Run to equilibrium
                sim.run_simulation(num_steps=200)

                baseline_performance = sim.history[-1].success_rate

                # Remove agents based on strategy
                num_to_remove = max(1, colony_size // 10)

                if strategy == 'random':
                    to_remove = np.random.choice(colony_size, size=num_to_remove, replace=False)
                elif strategy == 'hubs':
                    # Remove highest degree nodes
                    degrees = [sim.graph.degree(sim.agents[i].id) for i in range(colony_size)]
                    to_remove = np.argsort(degrees)[-num_to_remove:]
                else:  # high_value
                    # Remove highest value function agents
                    values = [sim.agents[i].value_function for i in range(colony_size)]
                    to_remove = np.argsort(values)[-num_to_remove:]

                # Deactivate agents
                for idx in to_remove:
                    sim.agents[idx].active = False
                    sim.graph.remove_node(sim.agents[idx].id)

                # Measure recovery
                min_performance = float('inf')
                recovered = False
                recovery_step = 0

                for step in range(num_steps):
                    sim.step()

                    if sim.history:
                        current_perf = sim.history[-1].success_rate
                        min_performance = min(min_performance, current_perf)

                        if not recovered and current_perf >= baseline_performance * 0.9:
                            recovered = True
                            recovery_step = step

                degradation = (baseline_performance - min_performance) / baseline_performance
                degradations.append(degradation)
                recovery_times.append(recovery_step if recovered else num_steps)

            results['performance_degradation'][strategy] = {
                'mean': float(np.mean(degradations)),
                'std': float(np.std(degradations))
            }
            results['recovery_times'][strategy] = {
                'mean': float(np.mean(recovery_times)),
                'std': float(np.std(recovery_times))
            }

            print(f"  Degradation: {results['performance_degradation'][strategy]['mean']:.1%}")
            print(f"  Recovery time: {results['recovery_times'][strategy]['mean']:.1f} steps")

        # Save and plot
        self._save_results(results, 'cascading_failures.json')
        self._plot_cascading_failures(results)

        return results

    def resource_constraint_test(
        self,
        colony_size: int = 100,
        budget_levels: List[float] = None,
        trials_per_level: int = 10,
        num_steps: int = 500
    ) -> Dict:
        """
        Test performance under resource constraints

        Simulates compute/memory/network budget reductions
        """
        if budget_levels is None:
            budget_levels = [1.0, 0.5, 0.25, 0.1]

        print("\n" + "=" * 60)
        print("RESOURCE CONSTRAINT STRESS TEST")
        print("=" * 60)
        print(f"Colony size: {colony_size}")
        print(f"Budget levels: {budget_levels}")

        results = {
            'budget_levels': budget_levels,
            'success_rates': [],
            'adaptive_responses': [],
        }

        baseline_result = run_single_simulation(
            num_agents=colony_size,
            num_steps=num_steps,
            seed=42
        )

        baseline_performance = baseline_result['summary']['avg_success_rate']

        for budget in budget_levels:
            print(f"\nTesting budget level: {budget:.0%}")

            success_rates = []

            for trial in range(trials_per_level):
                seed = 700 + trial

                # Create simulation
                sim = ColonySimulation(num_agents=colony_size, seed=seed)

                # Apply budget constraint
                # Budget affects agent activation probability
                for step in range(num_steps):
                    # Only fraction of agents can be active
                    num_active = int(colony_size * budget)
                    active_indices = np.random.choice(colony_size, size=num_active, replace=False)

                    for i, agent in enumerate(sim.agents):
                        agent.active = (i in active_indices)

                    sim.step()

                if sim.history:
                    success_rates.append(sim.history[-1].success_rate)

            avg_success = np.mean(success_rates) if success_rates else 0.0
            results['success_rates'].append(avg_success)

            # Adaptive response: performance relative to budget
            # Perfect scaling: performance ∝ budget
            # Adaptive: better than linear scaling
            expected_performance = baseline_performance * budget
            adaptive_ratio = avg_success / expected_performance if expected_performance > 0 else 0
            results['adaptive_responses'].append(adaptive_ratio)

            print(f"  Success rate: {avg_success:.4f}")
            print(f"  Adaptive ratio: {adaptive_ratio:.2f} (>1 means adaptive)")

        # Calculate adaptivity score
        adaptivity = np.mean(results['adaptive_responses'])
        results['adaptivity_score'] = adaptivity

        # Save and plot
        self._save_results(results, 'resource_constraints.json')
        self._plot_resource_constraints(results)

        return results

    def _calculate_robustness_metric(
        self,
        stress_levels: List[float],
        performances: List[float]
    ) -> float:
        """
        Calculate robustness metric

        Robustness = 1 - (degraded area / total area)
        Higher = more robust
        """
        baseline = performances[0]
        total_area = baseline * max(stress_levels)

        degraded_area = 0
        for i in range(1, len(stress_levels)):
            width = stress_levels[i] - stress_levels[i-1]
            height = baseline - performances[i]
            degraded_area += width * height

        robustness = max(0, 1 - degraded_area / total_area)
        return float(robustness)

    def _find_critical_fraction(
        self,
        fractions: List[float],
        performances: List[float]
    ) -> Dict:
        """Find critical fraction where system collapses"""
        for i, perf in enumerate(performances):
            if perf < 0.5:
                return {
                    'fraction': fractions[i],
                    'performance': perf,
                    'tolerance': fractions[i-1] if i > 0 else 0.0
                }

        return {
            'fraction': 1.0,
            'performance': performances[-1] if performances else 0.0,
            'tolerance': 1.0
        }

    def _plot_adversarial_input(self, results: Dict):
        """Plot adversarial input test results"""
        noise_levels = np.array(results['noise_levels'])

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

        # Success rate vs noise
        ax1.plot(noise_levels, results['success_rates'], 'o-', linewidth=2)
        ax1.fill_between(
            noise_levels,
            np.array(results['success_rates']) * 0.9,
            np.array(results['success_rates']) * 1.1,
            alpha=0.3
        )
        ax1.set_xlabel('Noise Level', fontsize=12)
        ax1.set_ylabel('Success Rate', fontsize=12)
        ax1.set_title('Performance vs Adversarial Input', fontsize=14, fontweight='bold')
        ax1.grid(True, alpha=0.3)

        # Degradation rate
        ax2.plot(noise_levels, results['degradation_rates'], 's-', color='red', linewidth=2)
        ax2.axhline(y=0.5, color='orange', linestyle='--', label='50% degradation')
        ax2.set_xlabel('Noise Level', fontsize=12)
        ax2.set_ylabel('Performance Degradation', fontsize=12)
        ax2.set_title('System Degradation', fontsize=14, fontweight='bold')
        ax2.legend()
        ax2.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(self.output_dir / 'adversarial_input.png', dpi=300)
        print(f"\nPlot saved to {self.output_dir / 'adversarial_input.png'}")

    def _plot_byzantine_agents(self, results: Dict):
        """Plot Byzantine agent test results"""
        fractions = np.array(results['byzantine_fractions'])

        fig, ax = plt.subplots(figsize=(10, 6))

        ax.plot(fractions, results['success_rates'], 'o-', linewidth=2, markersize=8)
        ax.axhline(y=0.5, color='r', linestyle='--', label='Collapse threshold')
        ax.axvline(
            x=results['critical_fraction']['fraction'],
            color='orange',
            linestyle=':',
            label=f"Critical: {results['critical_fraction']['fraction']:.1%}"
        )
        ax.fill_between(fractions, 0, results['success_rates'], alpha=0.3)

        ax.set_xlabel('Byzantine Agent Fraction', fontsize=12)
        ax.set_ylabel('Success Rate', fontsize=12)
        ax.set_title('Byzantine Fault Tolerance', fontsize=14, fontweight='bold')
        ax.legend()
        ax.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(self.output_dir / 'byzantine_agents.png', dpi=300)
        print(f"\nPlot saved to {self.output_dir / 'byzantine_agents.png'}")

    def _plot_cascading_failures(self, results: Dict):
        """Plot cascading failure results"""
        strategies = results['strategies']
        degradations = [results['performance_degradation'][s]['mean'] for s in strategies]
        errors = [results['performance_degradation'][s]['std'] for s in strategies]

        x = np.arange(len(strategies))
        width = 0.35

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

        # Degradation
        ax1.bar(x, degradations, width, yerr=errors, capsize=5, alpha=0.7)
        ax1.set_xlabel('Removal Strategy', fontsize=12)
        ax1.set_ylabel('Performance Degradation', fontsize=12)
        ax1.set_title('Cascading Failure Impact', fontsize=14, fontweight='bold')
        ax1.set_xticks(x)
        ax1.set_xticklabels(strategies)
        ax1.grid(True, alpha=0.3, axis='y')

        # Recovery time
        recovery_times = [results['recovery_times'][s]['mean'] for s in strategies]
        recovery_errors = [results['recovery_times'][s]['std'] for s in strategies]

        ax2.bar(x, recovery_times, width, yerr=recovery_errors, capsize=5, alpha=0.7, color='green')
        ax2.set_xlabel('Removal Strategy', fontsize=12)
        ax2.set_ylabel('Recovery Time (steps)', fontsize=12)
        ax2.set_title('Recovery Speed', fontsize=14, fontweight='bold')
        ax2.set_xticks(x)
        ax2.set_xticklabels(strategies)
        ax2.grid(True, alpha=0.3, axis='y')

        plt.tight_layout()
        plt.savefig(self.output_dir / 'cascading_failures.png', dpi=300)
        print(f"\nPlot saved to {self.output_dir / 'cascading_failures.png'}")

    def _plot_resource_constraints(self, results: Dict):
        """Plot resource constraint results"""
        budgets = np.array(results['budget_levels'])

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

        # Success rate vs budget
        ax1.plot(budgets, results['success_rates'], 'o-', linewidth=2, markersize=8)
        ax1.plot(budgets, budgets, '--', label='Perfect scaling', alpha=0.5)
        ax1.set_xlabel('Resource Budget', fontsize=12)
        ax1.set_ylabel('Success Rate', fontsize=12)
        ax1.set_title('Performance Scaling', fontsize=14, fontweight='bold')
        ax1.legend()
        ax1.grid(True, alpha=0.3)

        # Adaptive response
        ax2.plot(budgets, results['adaptive_responses'], 's-', color='green', linewidth=2, markersize=8)
        ax2.axhline(y=1.0, color='r', linestyle='--', label='No adaptation')
        ax2.fill_between(budgets, 1.0, results['adaptive_responses'], alpha=0.3)
        ax2.set_xlabel('Resource Budget', fontsize=12)
        ax2.set_ylabel('Adaptive Ratio', fontsize=12)
        ax2.set_title('Adaptive Response', fontsize=14, fontweight='bold')
        ax2.legend()
        ax2.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(self.output_dir / 'resource_constraints.png', dpi=300)
        print(f"\nPlot saved to {self.output_dir / 'resource_constraints.png'}")

    def _save_results(self, results: Dict, filename: str):
        """Save results to JSON"""
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


def run_all_stress_tests():
    """Run all stress test experiments"""
    experiment = StressTestExperiment()

    print("\n" + "=" * 60)
    print("POLLN STRESS TESTING EXPERIMENTS")
    print("=" * 60)

    # Adversarial input test
    experiment.adversarial_input_test(
        colony_size=100,
        noise_levels=[0.0, 0.1, 0.2, 0.3, 0.5, 0.7],
        trials_per_level=5,
        num_steps=300
    )

    # Byzantine agent test
    experiment.byzantine_agent_test(
        colony_size=100,
        byzantine_fractions=[0.0, 0.05, 0.1, 0.2, 0.3],
        trials_per_fraction=5,
        num_steps=300
    )

    # Cascading failure test
    experiment.cascading_failure_test(
        colony_size=100,
        removal_strategies=['random', 'hubs', 'high_value'],
        trials_per_strategy=5,
        num_steps=300
    )

    # Resource constraint test
    experiment.resource_constraint_test(
        colony_size=100,
        budget_levels=[1.0, 0.5, 0.25, 0.1],
        trials_per_level=5,
        num_steps=300
    )

    print("\n" + "=" * 60)
    print("ALL STRESS TESTS COMPLETED")
    print("=" * 60)
    print(f"Results saved to {experiment.output_dir}")


if __name__ == "__main__":
    run_all_stress_tests()
