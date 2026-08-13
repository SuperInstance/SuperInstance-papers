"""
POLLN Visualization Tools Test Suite
====================================

Tests for all visualization components.

Run with:
    python -m pytest test_viz.py -v
    OR
    python test_viz.py
"""

import pytest
import numpy as np
import tempfile
import shutil
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent))

try:
    from base import AgentGraph, EvolutionConfig, PruningStrategy, GraftingStrategy, EvolutionMetrics
    from graph_visualizer import GraphVisualizer, GraphVisualizationConfig
    from learning_curves import LearningCurveVisualizer, LearningMetrics, CurveStyle
    from emergence_visualizer import EmergenceVisualizer, EmergenceMetrics
    from comparison_plotter import ComparisonPlotter, ComparisonConfig
except ImportError as e:
    pytest.skip(f"Visualization dependency not available: {e}", allow_module_level=True)


class TestGraphVisualizer:
    """Test graph visualization functionality."""

    @pytest.fixture
    def sample_graph(self):
        """Create sample graph for testing."""
        config = EvolutionConfig(
            pruning_strategy=PruningStrategy.COMBINED,
            grafting_strategy=GraftingStrategy.HEURISTIC
        )
        return AgentGraph(num_agents=10, config=config)

    @pytest.fixture
    def viz_config(self):
        """Create visualization config."""
        return GraphVisualizationConfig(
            layout="spring",
            node_size_base=300,
            show_labels=True
        )

    def test_visualizer_initialization(self, sample_graph, viz_config):
        """Test visualizer initialization."""
        viz = GraphVisualizer(sample_graph, viz_config)
        assert viz.graph == sample_graph
        assert viz.config == viz_config
        assert viz.G is not None

    def test_compute_visualization_metrics(self, sample_graph, viz_config):
        """Test metric computation."""
        viz = GraphVisualizer(sample_graph, viz_config)
        viz._compute_visualization_metrics()

        assert hasattr(viz, 'degree_centrality')
        assert hasattr(viz, 'betweenness_centrality')
        assert hasattr(viz, 'communities')
        assert len(viz.degree_centrality) == 10

    def test_matplotlib_visualization(self, sample_graph, viz_config, tmp_path):
        """Test matplotlib visualization generation."""
        viz = GraphVisualizer(sample_graph, viz_config)

        output_file = tmp_path / "test_graph.png"
        fig = viz.visualize_matplotlib(output_path=output_file)

        assert fig is not None
        assert output_file.exists()

    def test_interactive_visualization(self, sample_graph, viz_config, tmp_path):
        """Test interactive HTML visualization generation."""
        viz = GraphVisualizer(sample_graph, viz_config)

        output_file = tmp_path / "test_graph.html"
        html = viz.visualize_interactive(output_path=output_file)

        assert isinstance(html, str)
        assert output_file.exists()
        assert "<!DOCTYPE html>" in html

    def test_node_coloring(self, sample_graph, viz_config):
        """Test different node coloring schemes."""
        viz = GraphVisualizer(sample_graph, viz_config)

        # Test community coloring
        colors_community = viz._get_node_colors("community")
        assert len(colors_community) == 10

        # Test degree coloring
        colors_degree = viz._get_node_colors("degree")
        assert len(colors_degree) == 10

    def test_node_sizes(self, sample_graph, viz_config):
        """Test node size computation."""
        viz = GraphVisualizer(sample_graph, viz_config)

        sizes = viz._get_node_sizes()
        assert len(sizes) == 10
        assert all(s > 0 for s in sizes)


class TestLearningCurveVisualizer:
    """Test learning curve visualization."""

    @pytest.fixture
    def sample_metrics(self):
        """Create sample learning metrics."""
        metrics = []
        for t in range(0, 100, 10):
            metrics.append(LearningMetrics(
                timestep=t,
                episode=t // 10,
                value_prediction=0.5 + 0.3 * (1 - np.exp(-t / 50)),
                value_error=abs(0.5 + 0.3 * (1 - np.exp(-t / 50)) - 0.8),
                td_error=0.3 * np.exp(-t / 30),
                reconstruction_loss=0.2 * np.exp(-t / 40),
                kl_divergence=0.05 * np.exp(-t / 35),
                total_vae_loss=0.25 * np.exp(-t / 38),
                reward=5 + 2 * (1 - np.exp(-t / 50)) + np.random.normal(0, 0.5),
                success_rate=np.clip(0.5 + 0.3 * (1 - np.exp(-t / 50)), 0, 1),
                avg_latency=100 + 50 * np.exp(-t / 30),
                num_edges=50 + 10 * (1 - np.exp(-t / 40)),
                avg_weight=0.5 + 0.2 * (1 - np.exp(-t / 50)),
                sparsity=0.8
            ))
        return metrics

    def test_visualizer_initialization(self):
        """Test visualizer initialization."""
        viz = LearningCurveVisualizer()
        assert viz.style is not None
        assert len(viz.metrics_history) == 0

    def test_add_metrics(self, sample_metrics):
        """Test adding metrics."""
        viz = LearningCurveVisualizer()
        for m in sample_metrics:
            viz.add_metrics(m)

        assert len(viz.metrics_history) == len(sample_metrics)

    def test_td_learning_plot(self, sample_metrics, tmp_path):
        """Test TD learning curve plot."""
        viz = LearningCurveVisualizer()
        for m in sample_metrics:
            viz.add_metrics(m)

        output_file = tmp_path / "test_td_learning.png"
        fig = viz.plot_td_learning(output_path=output_file)

        assert fig is not None
        assert output_file.exists()

    def test_vae_loss_plot(self, sample_metrics, tmp_path):
        """Test VAE loss plot."""
        viz = LearningCurveVisualizer()
        for m in sample_metrics:
            viz.add_metrics(m)

        output_file = tmp_path / "test_vae_loss.png"
        fig = viz.plot_vae_loss(output_path=output_file)

        assert fig is not None
        assert output_file.exists()

    def test_learning_summary(self, sample_metrics, tmp_path):
        """Test learning summary plot."""
        viz = LearningCurveVisualizer()
        for m in sample_metrics:
            viz.add_metrics(m)

        output_file = tmp_path / "test_summary.png"
        fig = viz.plot_learning_summary(output_path=output_file)

        assert fig is not None
        assert output_file.exists()

    def test_curve_smoothing(self):
        """Test curve smoothing functionality."""
        viz = LearningCurveVisualizer()
        y = np.array([1, 2, 3, 4, 5, 4, 3, 2, 1])

        smoothed = viz._smooth_curve(y)
        assert len(smoothed) == len(y)


class TestEmergenceVisualizer:
    """Test emergence visualization."""

    @pytest.fixture
    def sample_graph(self):
        """Create sample graph."""
        config = EvolutionConfig()
        return AgentGraph(num_agents=8, config=config)

    def test_visualizer_initialization(self, sample_graph):
        """Test visualizer initialization."""
        viz = EmergenceVisualizer(sample_graph)
        assert viz.graph == sample_graph
        assert len(viz.metrics_history) == 0

    def test_pressure_map_computation(self, sample_graph):
        """Test pressure map computation."""
        viz = EmergenceVisualizer(sample_graph)
        pressure_map = viz.compute_pressure_map()

        assert pressure_map.agent_pressures
        assert pressure_map.spatial_coords
        assert pressure_map.pressure_gradients

    def test_flow_patterns(self, sample_graph):
        """Test flow pattern computation."""
        viz = EmergenceVisualizer(sample_graph)
        pressure_map = viz.compute_pressure_map()
        flows = viz.compute_flow_patterns(pressure_map)

        assert isinstance(flows, list)

    def test_synergy_metrics(self, sample_graph):
        """Test synergy metrics computation."""
        viz = EmergenceVisualizer(sample_graph)
        mi, integration, segregation = viz.compute_synergy_metrics()

        assert isinstance(mi, float)
        assert isinstance(integration, float)
        assert isinstance(segregation, float)

    def test_emergence_detection(self, sample_graph):
        """Test emergence detection."""
        viz = EmergenceVisualizer(sample_graph)
        metrics = viz.detect_emergence()

        assert isinstance(metrics, EmergenceMetrics)
        assert hasattr(metrics, 'emergence_strength')
        assert hasattr(metrics, 'phase_transition_detected')


class TestComparisonPlotter:
    """Test comparison plotting."""

    @pytest.fixture
    def sample_comparisons(self):
        """Create sample comparison data."""
        plotter = ComparisonPlotter()

        for i in range(3):
            metrics = []
            for gen in range(20):
                metrics.append(EvolutionMetrics(
                    generation=gen,
                    total_nodes=10,
                    total_edges=40 + i * 5,
                    avg_degree=4 + i * 0.5,
                    sparsity=0.8 - i * 0.05,
                    clustering_coefficient=0.3 + i * 0.1,
                    modularity=0.4 + i * 0.05,
                    avg_path_length=3.0 - i * 0.2,
                    diameter=5,
                    pruned_this_cycle=0,
                    grafted_this_cycle=0,
                    small_world_sigma=1.5,
                    degree_assortativity=0.1,
                    spectral_gap=0.5,
                    power_law_alpha=2.0,
                    power_law_ks_distance=0.1
                ))

            config = ComparisonConfig(
                config_id=f"config_{i}",
                display_name=f"Configuration {i+1}",
                config=EvolutionConfig(),
                metrics=metrics,
                final_performance=0.6 + i * 0.1,
                convergence_time=100 - i * 10,
                stability_score=0.5 + i * 0.1
            )

            plotter.add_comparison(config)

        return plotter

    def test_add_comparison(self, sample_comparisons):
        """Test adding comparison configurations."""
        assert len(sample_comparisons.comparisons) == 3

    def test_grouped_bar_chart(self, sample_comparisons, tmp_path):
        """Test grouped bar chart generation."""
        output_file = tmp_path / "test_bar_chart.png"
        fig = sample_comparisons.plot_grouped_bar_chart(
            'clustering_coefficient',
            output_path=output_file
        )

        assert fig is not None
        assert output_file.exists()

    def test_heatmap(self, sample_comparisons, tmp_path):
        """Test heatmap generation."""
        metrics = ['total_edges', 'avg_degree', 'clustering_coefficient', 'modularity']
        output_file = tmp_path / "test_heatmap.png"
        fig = sample_comparisons.plot_heatmap(metrics, output_path=output_file)

        assert fig is not None
        assert output_file.exists()

    def test_radar_chart(self, sample_comparisons, tmp_path):
        """Test radar chart generation."""
        metrics = ['total_edges', 'avg_degree', 'clustering_coefficient', 'modularity', 'sparsity']
        output_file = tmp_path / "test_radar.png"
        fig = sample_comparisons.plot_radar_chart(metrics, output_path=output_file)

        assert fig is not None
        assert output_file.exists()

    def test_performance_summary(self, sample_comparisons, tmp_path):
        """Test performance summary plot."""
        output_file = tmp_path / "test_performance.png"
        fig = sample_comparisons.plot_performance_summary(output_path=output_file)

        assert fig is not None
        assert output_file.exists()


class TestIntegration:
    """Integration tests for visualization pipeline."""

    def test_full_visualization_pipeline(self, tmp_path):
        """Test complete visualization pipeline."""
        # Create graph
        config = EvolutionConfig(
            pruning_strategy=PruningStrategy.COMBINED,
            grafting_strategy=GraftingStrategy.HEURISTIC
        )
        graph = AgentGraph(num_agents=12, config=config)

        # Generate some metrics
        metrics_list = []
        for gen in range(5):
            metrics = graph.compute_metrics(gen)
            metrics_list.append(metrics)

        # Test graph visualization
        graph_viz = GraphVisualizer(graph)
        graph_output = tmp_path / "graph.png"
        graph_viz.visualize_matplotlib(output_path=graph_output)
        assert graph_output.exists()

        # Test emergence visualization
        emergence_viz = EmergenceVisualizer(graph)
        for _ in range(3):
            emergence_viz.detect_emergence()

        emergence_output = tmp_path / "synergy.png"
        emergence_viz.visualize_synergy_metrics(output_path=emergence_output)
        assert emergence_output.exists()

        # Test comparison plotter
        comparison_config = ComparisonConfig(
            config_id="test",
            display_name="Test Config",
            config=config,
            metrics=metrics_list,
            final_performance=0.75,
            convergence_time=50,
            stability_score=0.65
        )

        plotter = ComparisonPlotter()
        plotter.add_comparison(comparison_config)

        comparison_output = tmp_path / "comparison.png"
        plotter.plot_performance_summary(output_path=comparison_output)
        assert comparison_output.exists()


def run_demo():
    """Run demonstration of visualization tools."""
    print("=" * 60)
    print("POLLN Visualization Tools - Demo")
    print("=" * 60)

    # Create temporary directory for output
    with tempfile.TemporaryDirectory() as tmp_dir:
        output_dir = Path(tmp_dir) / "visualizations"
        output_dir.mkdir()

        print(f"\nGenerating visualizations in: {output_dir}")

        # 1. Graph Visualization
        print("\n1. Creating graph visualization...")
        config = EvolutionConfig()
        graph = AgentGraph(num_agents=15, config=config)
        graph_viz = GraphVisualizer(graph)

        graph_viz.visualize_matplotlib(
            output_dir / "graph_topology.png",
            color_by="community"
        )

        # 2. Learning Curves
        print("2. Creating learning curves...")
        learning_viz = LearningCurveVisualizer()

        for t in range(0, 100, 10):
            metrics = LearningMetrics(
                timestep=t,
                episode=t // 10,
                value_prediction=0.7 * (1 - np.exp(-t / 50)),
                value_error=0.3 * np.exp(-t / 50),
                td_error=0.25 * np.exp(-t / 30),
                reconstruction_loss=0.15 * np.exp(-t / 40),
                kl_divergence=0.03 * np.exp(-t / 35),
                total_vae_loss=0.18 * np.exp(-t / 38),
                reward=5 + 3 * (1 - np.exp(-t / 50)),
                success_rate=0.6 + 0.3 * (1 - np.exp(-t / 50)),
                avg_latency=100 + 50 * np.exp(-t / 30),
                num_edges=60,
                avg_weight=0.6,
                sparsity=0.8
            )
            learning_viz.add_metrics(metrics)

        learning_viz.plot_learning_summary(output_dir / "learning_summary.png")

        # 3. Emergence Visualization
        print("3. Creating emergence visualization...")
        emergence_viz = EmergenceVisualizer(graph)

        for _ in range(5):
            emergence_viz.detect_emergence()

        emergence_viz.visualize_pressure_map(output_dir / "pressure_map.png")
        emergence_viz.visualize_synergy_metrics(output_dir / "synergy_metrics.png")

        # 4. Comparison Plot
        print("4. Creating comparison plot...")
        plotter = ComparisonPlotter()

        for i in range(3):
            metrics = []
            for gen in range(20):
                metrics.append(EvolutionMetrics(
                    generation=gen,
                    total_nodes=15,
                    total_edges=60 + i * 5,
                    avg_degree=5,
                    sparsity=0.8,
                    clustering_coefficient=0.3 + i * 0.1,
                    modularity=0.4,
                    avg_path_length=3.0,
                    diameter=5,
                    pruned_this_cycle=0,
                    grafted_this_cycle=0,
                    small_world_sigma=1.5,
                    degree_assortativity=0.1,
                    spectral_gap=0.5,
                    power_law_alpha=2.0,
                    power_law_ks_distance=0.1
                ))

            comp_config = ComparisonConfig(
                config_id=f"config_{i}",
                display_name=f"Config {i+1}",
                config=config,
                metrics=metrics,
                final_performance=0.6 + i * 0.1,
                convergence_time=100 - i * 10,
                stability_score=0.5 + i * 0.1
            )

            plotter.add_comparison(comp_config)

        plotter.plot_performance_summary(output_dir / "comparison_performance.png")

        # Count generated files
        generated = list(output_dir.glob("*"))
        print(f"\n{'=' * 60}")
        print(f"Demo complete! Generated {len(generated)} visualization files:")
        for f in sorted(generated):
            print(f"  - {f.name}")
        print(f"{'=' * 60}")

        # Copy to reports directory if it exists
        reports_dir = Path("../../reports/visualizations")
        if reports_dir.exists():
            import shutil
            for f in generated:
                shutil.copy(f, reports_dir / f.name)
            print(f"\nFiles copied to: {reports_dir}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="POLLN Visualization Tests")
    parser.add_argument('--demo', action='store_true', help='Run demonstration')
    parser.add_argument('--test', action='store_true', help='Run tests')

    args = parser.parse_args()

    if args.demo:
        run_demo()
    elif args.test:
        pytest.main([__file__, "-v"])
    else:
        print("Usage:")
        print("  python test_viz.py --demo    # Run demonstration")
        print("  python test_viz.py --test    # Run pytest tests")
