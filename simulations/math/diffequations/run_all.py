"""
Master Orchestrator for POLLN Differential Equations Analysis

Runs all PDE simulations, tracks API usage, compiles results.
Manages up to 1000 DeepSeek API calls across all derivations.
"""

import os
import sys
import time
import json
from pathlib import Path
from typing import Dict, List, Optional
import traceback

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from simulations.math.diffequations.deepseek_math import DeepSeekMath, APICallTracker
from simulations.math.diffequations import (
    fokker_planck,
    information_fluid,
    reaction_diffusion,
    hjb_optimal_control,
    stochastic_dynamics
)


class SimulationOrchestrator:
    """
    Orchestrates all PDE simulations with API tracking
    """

    def __init__(self, api_key: str, max_calls: int = 1000):
        """
        Initialize orchestrator

        Args:
            api_key: DeepSeek API key
            max_calls: Maximum API calls to make
        """
        self.api_key = api_key
        self.max_calls = max_calls

        # Create shared math engine
        self.math_engine = DeepSeekMath(api_key)
        self.math_engine.tracker.max_calls = max_calls

        # Simulation results
        self.results = {}

        # Output directory
        self.output_dir = Path("simulations/math/diffequations")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def check_api_budget(self) -> bool:
        """Check if we have API calls remaining"""
        remaining = self.max_calls - self.math_engine.tracker.total_calls
        print(f"\nAPI Budget Status:")
        print(f"  Used: {self.math_engine.tracker.total_calls}/{self.max_calls}")
        print(f"  Remaining: {remaining}")
        print(f"  Tokens used: {self.math_engine.tracker.total_tokens}")

        return remaining > 0

    def run_fokker_planck(self, derive: bool = True):
        """Run Fokker-Planck simulation"""
        print("\n" + "="*70)
        print("SIMULATION 1: Fokker-Planck Equation")
        print("="*70)

        try:
            if derive:
                if not self.check_api_budget():
                    print("Skipping derivation - API budget exhausted")
                    derive = False
                else:
                    print("Deriving equation...")
                    derivation = fokker_planck.derive_fokker_planck_equation(self.api_key)
                    self.results['fokker_planck_derivation'] = derivation

            print("Running simulation...")
            solver = fokker_planck.run_simulation(
                api_key=self.api_key if derive else None,
                n_steps=500,
                plot_results=False
            )

            self.results['fokker_planck_solver'] = solver
            print("✓ Fokker-Planck simulation complete")

        except Exception as e:
            print(f"✗ Fokker-Planck simulation failed: {e}")
            traceback.print_exc()

    def run_information_fluid(self, derive: bool = True):
        """Run information fluid dynamics simulation"""
        print("\n" + "="*70)
        print("SIMULATION 2: Information Fluid Dynamics")
        print("="*70)

        try:
            if derive:
                if not self.check_api_budget():
                    print("Skipping derivation - API budget exhausted")
                    derive = False
                else:
                    print("Deriving equation...")
                    derivation = information_fluid.derive_information_fluid_equations(self.api_key)
                    self.results['information_fluid_derivation'] = derivation

            print("Running simulation...")
            solver = information_fluid.run_simulation(
                api_key=self.api_key if derive else None,
                n_steps=200,
                plot_results=False
            )

            self.results['information_fluid_solver'] = solver
            print("✓ Information fluid simulation complete")

        except Exception as e:
            print(f"✗ Information fluid simulation failed: {e}")
            traceback.print_exc()

    def run_reaction_diffusion(self, derive: bool = True):
        """Run reaction-diffusion simulation"""
        print("\n" + "="*70)
        print("SIMULATION 3: Reaction-Diffusion System")
        print("="*70)

        try:
            if derive:
                if not self.check_api_budget():
                    print("Skipping derivation - API budget exhausted")
                    derive = False
                else:
                    print("Deriving equation...")
                    derivation = reaction_diffusion.derive_reaction_diffusion_equations(self.api_key)
                    self.results['reaction_diffusion_derivation'] = derivation

            print("Running simulation...")
            solver = reaction_diffusion.run_simulation(
                api_key=self.api_key if derive else None,
                n_steps=500,
                plot_results=False
            )

            self.results['reaction_diffusion_solver'] = solver
            print("✓ Reaction-diffusion simulation complete")

        except Exception as e:
            print(f"✗ Reaction-diffusion simulation failed: {e}")
            traceback.print_exc()

    def run_hjb(self, derive: bool = True):
        """Run HJB optimal control simulation"""
        print("\n" + "="*70)
        print("SIMULATION 4: HJB Optimal Control")
        print("="*70)

        try:
            if derive:
                if not self.check_api_budget():
                    print("Skipping derivation - API budget exhausted")
                    derive = False
                else:
                    print("Deriving equation...")
                    derivation = hjb_optimal_control.derive_hjb_equation(self.api_key)
                    self.results['hjb_derivation'] = derivation

            print("Running simulation...")
            solver = hjb_optimal_control.run_simulation(
                api_key=self.api_key if derive else None,
                plot_results=False
            )

            self.results['hjb_solver'] = solver
            print("✓ HJB simulation complete")

        except Exception as e:
            print(f"✗ HJB simulation failed: {e}")
            traceback.print_exc()

    def run_stochastic_dynamics(self, derive: bool = True):
        """Run stochastic dynamics simulation"""
        print("\n" + "="*70)
        print("SIMULATION 5: Stochastic Dynamics")
        print("="*70)

        try:
            if derive:
                if not self.check_api_budget():
                    print("Skipping derivation - API budget exhausted")
                    derive = False
                else:
                    print("Deriving equation...")
                    derivation = stochastic_dynamics.derive_sde_formulations(self.api_key)
                    self.results['stochastic_dynamics_derivation'] = derivation

            print("Running simulation...")
            solver = stochastic_dynamics.run_simulation(
                api_key=self.api_key if derive else None,
                plot_results=False
            )

            self.results['stochastic_dynamics_solver'] = solver
            print("✓ Stochastic dynamics simulation complete")

        except Exception as e:
            print(f"✗ Stochastic dynamics simulation failed: {e}")
            traceback.print_exc()

    def run_all(self, derive_all: bool = True):
        """Run all simulations"""
        start_time = time.time()

        print("="*70)
        print("POLLN DIFFERENTIAL EQUATIONS ANALYSIS")
        print("Master Orchestrator Starting...")
        print("="*70)

        # Run each simulation
        simulations = [
            ('fokker_planck', self.run_fokker_planck),
            ('information_fluid', self.run_information_fluid),
            ('reaction_diffusion', self.run_reaction_diffusion),
            ('hjb', self.run_hjb),
            ('stochastic_dynamics', self.run_stochastic_dynamics)
        ]

        for name, sim_func in simulations:
            try:
                sim_func(derive=derive_all)

                # Check API budget
                if derive_all:
                    remaining = self.max_calls - self.math_engine.tracker.total_calls
                    if remaining < 100:  # Reserve buffer
                        print(f"\nWarning: Low API budget ({remaining} calls)")
                        print("Disabling further derivations")
                        derive_all = False

            except KeyboardInterrupt:
                print("\nInterrupted by user")
                break
            except Exception as e:
                print(f"\nSimulation {name} failed: {e}")
                continue

        # Final report
        elapsed_time = time.time() - start_time

        print("\n" + "="*70)
        print("SIMULATION SUMMARY")
        print("="*70)
        print(f"Total time: {elapsed_time:.2f} seconds")
        print(f"Simulations completed: {len(self.results)}")

        print("\nAPI Usage:")
        print(self.math_engine.get_usage_report())

        # Save results
        self.save_results()

        return self.results

    def save_results(self):
        """Save all results to files"""
        print("\nSaving results...")

        # Save API usage report
        report_path = self.output_dir / "api_usage_report.txt"
        with open(report_path, 'w') as f:
            f.write(self.math_engine.get_usage_report())

        print(f"  API usage report: {report_path}")

        # Save derivation results
        derivations_path = self.output_dir / "all_derivations.json"
        derivations = {}

        for key, value in self.results.items():
            if 'derivation' in key and hasattr(value, '__dict__'):
                derivations[key] = value.__dict__

        with open(derivations_path, 'w') as f:
            json.dump(derivations, f, indent=2, default=str)

        print(f"  All derivations: {derivations_path}")

        # Save simulation metadata
        metadata = {
            'total_api_calls': self.math_engine.tracker.total_calls,
            'total_tokens': self.math_engine.tracker.total_tokens,
            'simulations_run': len([k for k in self.results.keys() if 'solver' in k]),
            'derivations_completed': len([k for k in self.results.keys() if 'derivation' in k]),
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }

        metadata_path = self.output_dir / "simulation_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        print(f"  Simulation metadata: {metadata_path}")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Run POLLN differential equations analysis')
    parser.add_argument('--api-key', type=str,
                       default='YOUR_API_KEY',
                       help='DeepSeek API key')
    parser.add_argument('--max-calls', type=int, default=1000,
                       help='Maximum API calls to make')
    parser.add_argument('--no-derive', action='store_true',
                       help='Skip equation derivations (run simulations only)')
    parser.add_argument('--simulations', type=str, nargs='+',
                       choices=['fokker_planck', 'information_fluid', 'reaction_diffusion',
                               'hjb', 'stochastic_dynamics', 'all'],
                       default=['all'],
                       help='Specific simulations to run')

    args = parser.parse_args()

    # Create orchestrator
    orchestrator = SimulationOrchestrator(
        api_key=args.api_key,
        max_calls=args.max_calls
    )

    # Run simulations
    if 'all' in args.simulations:
        orchestrator.run_all(derive_all=not args.no_derive)
    else:
        for sim_name in args.simulations:
            sim_func = getattr(orchestrator, f'run_{sim_name}')
            sim_func(derive=not args.no_derive)

        orchestrator.save_results()


if __name__ == "__main__":
    main()
