"""
Real-Time GPU Visualization Examples

Run various visualization examples to demonstrate the system's capabilities.
"""

import argparse
import sys
from realtime_visualization import (
    RealTimeGPUVisualizer,
    SimulationDashboard,
    VisualizationConfig
)


def example_agent_heatmap():
    """Example 1: Agent state heatmap visualization."""
    print("\n" + "="*60)
    print("Example 1: Agent State Heatmap")
    print("="*60)
    print("\nInitializing real-time agent heatmap with 5000 agents...")
    print("Press Ctrl+C to exit\n")

    viz = RealTimeGPUVisualizer()
    viz.setup_agent_heatmap(num_agents=5000, grid_size=(100, 100))

    print("✅ Heatmap ready - Starting animation...")
    anim = viz.start_animation(viz.update_heatmap, interval=16)

    return viz


def example_network_graph():
    """Example 2: Network topology visualization."""
    print("\n" + "="*60)
    print("Example 2: Network Topology Dynamics")
    print("="*60)
    print("\nInitializing network graph with 100 nodes...")
    print("Press Ctrl+C to exit\n")

    viz = RealTimeGPUVisualizer()
    viz.setup_network_graph(num_nodes=100, edge_density=0.1)

    print("✅ Network graph ready - Starting animation...")
    anim = viz.start_animation(viz.update_network, interval=16)

    return viz


def example_emergence_monitor():
    """Example 3: Emergence metrics monitoring."""
    print("\n" + "="*60)
    print("Example 3: Emergence Metrics Monitor")
    print("="*60)
    print("\nInitializing emergence monitor with 4 metrics...")
    print("Press Ctrl+C to exit\n")

    viz = RealTimeGPUVisualizer()
    viz.setup_emergence_monitor(
        metrics=['Diversity', 'Correlation', 'Novelty', 'Complexity'],
        history_length=1000
    )

    print("✅ Emergence monitor ready - Starting animation...")
    anim = viz.start_animation(viz.update_emergence, interval=16)

    return viz


def example_phase_space():
    """Example 4: Phase space visualization."""
    print("\n" + "="*60)
    print("Example 4: Phase Space Dynamics")
    print("="*60)
    print("\nInitializing phase space with Van der Pol oscillator...")
    print("Press Ctrl+C to exit\n")

    viz = RealTimeGPUVisualizer()
    viz.setup_phase_space(num_agents=1000)

    print("✅ Phase space ready - Starting animation...")
    anim = viz.start_animation(viz.update_phase_space, interval=16)

    return viz


def example_complete_dashboard():
    """Example 5: Complete multi-panel dashboard."""
    print("\n" + "="*60)
    print("Example 5: Complete Simulation Dashboard")
    print("="*60)
    print("\nInitializing comprehensive dashboard...")
    print("  - Agent heatmap (2000 agents)")
    print("  - Network topology (50 nodes)")
    print("  - Phase space dynamics")
    print("  - Emergence metrics")
    print("  - Performance monitoring")
    print("Press Ctrl+C to exit\n")

    config = VisualizationConfig(
        target_fps=60,
        frame_interval_ms=16,
        enable_blit=True,
        colormap='viridis'
    )

    dashboard = SimulationDashboard(
        num_agents=2000,
        num_nodes=50,
        config=config
    )

    fig = dashboard.create_dashboard()

    # Use matplotlib's animation
    import matplotlib.animation as animation

    def update(frame):
        dashboard.update_dashboard(frame)
        return []

    print("✅ Dashboard ready - Starting animation...")
    anim = animation.FuncAnimation(
        fig,
        update,
        interval=50,
        blit=False
    )

    return dashboard


def example_performance_test():
    """Example 6: Performance benchmark."""
    print("\n" + "="*60)
    print("Example 6: Performance Benchmark")
    print("="*60)
    print("\nRunning performance test with different configurations...\n")

    import time
    import numpy as np

    configs = [
        (1000, "Small"),
        (5000, "Medium"),
        (10000, "Large")
    ]

    results = []

    for num_agents, label in configs:
        print(f"Testing {label} configuration ({num_agents} agents)...")

        viz = RealTimeGPUVisualizer()
        viz.setup_agent_heatmap(num_agents=num_agents)

        # Warm-up
        for _ in range(10):
            viz.update_heatmap(0)

        # Benchmark
        frame_times = []
        for i in range(100):
            start = time.perf_counter()
            viz.update_heatmap(i)
            frame_times.append(time.perf_counter() - start)

        mean_time = np.mean(frame_times) * 1000
        fps = 1.0 / np.mean(frame_times)

        results.append({
            'label': label,
            'agents': num_agents,
            'mean_time_ms': mean_time,
            'fps': fps
        })

        print(f"  Mean frame time: {mean_time:.2f} ms")
        print(f"  Average FPS: {fps:.1f}")
        print()

    # Summary
    print("="*60)
    print("Performance Summary")
    print("="*60)
    print(f"{'Configuration':<15} {'Agents':<10} {'Frame Time':<15} {'FPS':<10}")
    print("-"*60)

    for r in results:
        print(f"{r['label']:<15} {r['agents']:<10} "
              f"{r['mean_time_ms']:.2f} ms{' '*<8} {r['fps']:.1f}")

    print("\n✅ Performance test complete!")

    return results


def example_custom_dashboard():
    """Example 7: Custom dashboard configuration."""
    print("\n" + "="*60)
    print("Example 7: Custom Dashboard Configuration")
    print("="*60)
    print("\nCreating custom dashboard with specific settings...")
    print("Press Ctrl+C to exit\n")

    # Custom configuration
    config = VisualizationConfig(
        target_fps=30,  # Lower target for stability
        frame_interval_ms=33,  # ~30 FPS
        enable_blit=True,
        max_points_render=5000,  # Limit rendered points
        colormap='plasma',  # Different colormap
        figure_dpi=100
    )

    viz = RealTimeGPUVisualizer(config=config)
    viz.setup_agent_heatmap(
        num_agents=3000,
        grid_size=(80, 80),  # Lower resolution
        extent=(0, 10, 0, 10)  # Custom extent
    )

    print("✅ Custom dashboard ready - Starting animation...")
    anim = viz.start_animation(viz.update_heatmap, interval=33)

    return viz


def main():
    """Main entry point for running examples."""
    parser = argparse.ArgumentParser(
        description="Run real-time GPU visualization examples"
    )

    parser.add_argument(
        '--example',
        type=str,
        choices=[
            'heatmap',
            'network',
            'emergence',
            'phase',
            'dashboard',
            'benchmark',
            'custom'
        ],
        help='Example to run'
    )

    parser.add_argument(
        '--list',
        action='store_true',
        help='List all available examples'
    )

    args = parser.parse_args()

    # List examples
    if args.list:
        print("\n" + "="*60)
        print("Available Examples")
        print("="*60)
        print("\n1. heatmap     - Agent state heatmap visualization")
        print("2. network     - Network topology dynamics")
        print("3. emergence   - Emergence metrics monitoring")
        print("4. phase       - Phase space visualization")
        print("5. dashboard   - Complete multi-panel dashboard")
        print("6. benchmark   - Performance benchmark test")
        print("7. custom      - Custom dashboard configuration")
        print("\nUsage:")
        print("  python run_examples.py --example heatmap")
        print("  python run_examples.py --example dashboard")
        print("\nOr run without arguments for interactive selection.")
        print()

        return

    # Run example
    examples = {
        'heatmap': example_agent_heatmap,
        'network': example_network_graph,
        'emergence': example_emergence_monitor,
        'phase': example_phase_space,
        'dashboard': example_complete_dashboard,
        'benchmark': example_performance_test,
        'custom': example_custom_dashboard
    }

    if args.example:
        # Run specified example
        example_func = examples[args.example]
        try:
            result = example_func()
        except KeyboardInterrupt:
            print("\n\n✅ Example stopped by user")
    else:
        # Interactive selection
        print("\n" + "="*60)
        print("Real-Time GPU Visualization Examples")
        print("="*60)
        print("\nSelect an example to run:")
        print()

        for i, (key, func) in enumerate(examples.items(), 1):
            print(f"{i}. {key:<12} - {func.__doc__.split('.')[0]}")

        print(f"\n{len(examples)+1}. Run all examples sequentially")
        print("0. Exit\n")

        try:
            choice = input("Enter choice (0-{}): ".format(len(examples)+1)).strip()

            if choice == '0':
                print("Goodbye!")
                return

            choice_int = int(choice)

            if choice_int == len(examples) + 1:
                # Run all examples
                print("\nRunning all examples sequentially...\n")
                for i, (key, func) in enumerate(examples.items(), 1):
                    print(f"\n{'='*60}")
                    print(f"Example {i}/{len(examples)}: {key}")
                    print('='*60)

                    try:
                        func()
                    except KeyboardInterrupt:
                        print(f"\n✅ Example {i} stopped by user")
                        continue

            elif 1 <= choice_int <= len(examples):
                # Run selected example
                key = list(examples.keys())[choice_int - 1]
                func = examples[key]
                func()

            else:
                print("Invalid choice!")
                return

        except (ValueError, KeyboardInterrupt):
            print("\nGoodbye!")
            return
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return


if __name__ == "__main__":
    # Check for CuPy availability
    try:
        import cupy as cp
        print(f"✅ CuPy {cp.__version__} detected")
        print(f"✅ CUDA {cp.cuda.runtime.getRuntimeVersion()} available")
    except ImportError:
        print("❌ CuPy not found. Install with: pip install cupy-cuda12x")
        sys.exit(1)

    # Check for matplotlib
    try:
        import matplotlib
        print(f"✅ Matplotlib {matplotlib.__version__} detected")
    except ImportError:
        print("❌ Matplotlib not found. Install with: pip install matplotlib")
        sys.exit(1)

    print()

    # Run examples
    main()
