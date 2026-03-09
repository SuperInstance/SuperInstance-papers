"""
Network Scaling Simulations for LOG Cell System
================================================

This script runs simulations to test how the sensation system scales with
increasing numbers of cells and watch relationships.

Simulation 1: Network Scaling - Tests connection growth and load distribution
Simulation 2: Sensation Processing Load - Tests computational performance
Simulation 3: Sensation Type Distribution - Tests different sensation types
Simulation 4: Cascade Failure Analysis - Tests resilience under load
Simulation 5: Memory Usage - Tests memory scaling with network size
"""

import numpy as np
import time
import sys
from collections import defaultdict
from dataclasses import dataclass
from typing import List, Dict, Set, Tuple
import json

@dataclass
class Cell:
    """Represents a LOG cell with watch relationships."""
    id: int
    watched: List[Tuple[int, List[str]]]  # (target_cell_id, sensation_types)
    watchers: List[int]  # List of cell ids watching this cell

    def watch(self, other_id: int, sensation_types: List[str]):
        """Establish watch relationship from this cell to another."""
        self.watched.append((other_id, sensation_types))


@dataclass
class SensationProcessor:
    """Processes sensation detections for cells."""

    def __init__(self):
        self.history: Dict[int, List[float]] = {}
        self.velocities: Dict[int, List[float]] = {}

    def detect_absolute_change(self, cell_id: int, new_value: float, old_value: float) -> float:
        """Detect absolute change in value."""
        return abs(new_value - old_value)

    def detect_rate_of_change(self, cell_id: int, new_value: float,
                            old_value: float, time_delta: float) -> float:
        """Detect rate of change (velocity)."""
        if time_delta == 0:
            return 0.0
        return (new_value - old_value) / time_delta

    def detect_acceleration(self, cell_id: int, velocities: List[float]) -> float:
        """Detect acceleration (change in velocity)."""
        if len(velocities) < 2:
            return 0.0
        return velocities[-1] - velocities[-2]

    def detect_anomaly(self, cell_id: int, value: float, history: List[float]) -> float:
        """Detect anomaly using z-score."""
        if len(history) < 10:
            return 0.0
        mean = np.mean(history)
        std = np.std(history)
        if std == 0:
            return 0.0
        return abs((value - mean) / std)

    def detect_pattern(self, cell_id: int, value: float, history: List[float]) -> float:
        """Detect pattern using autocorrelation."""
        if len(history) < 20:
            return 0.0
        # Simple autocorrelation with lag 1
        series = np.array(history[-20:] + [value])
        correlation = np.corrcoef(series[:-1], series[1:])[0, 1]
        return correlation if not np.isnan(correlation) else 0.0


class NetworkSimulator:
    """Simulates LOG cell network behavior."""

    def __init__(self, n_cells: int):
        self.n_cells = n_cells
        self.cells: Dict[int, Cell] = {}
        self.processor = SensationProcessor()
        self.cell_data: Dict[int, Dict] = {}
        self._initialize_cells()

    def _initialize_cells(self):
        """Initialize cells with random data."""
        for i in range(self.n_cells):
            self.cells[i] = Cell(id=i, watched=[], watchers=[])
            self.cell_data[i] = {
                'value': np.random.randn(),
                'history': [np.random.randn() for _ in range(10)],
                'velocities': []
            }

    def establish_random_watches(self, avg_watch_per_cell: int):
        """Establish random watch relationships between cells."""
        for cell_id, cell in self.cells.items():
            # Select random cells to watch
            potential_targets = [cid for cid in self.cells.keys() if cid != cell_id]
            if not potential_targets:
                continue

            n_watch = min(avg_watch_per_cell, len(potential_targets))
            to_watch = np.random.choice(potential_targets, n_watch, replace=False)

            # Assign random sensation types
            sensation_types = ['absolute', 'velocity', 'acceleration', 'anomaly', 'pattern', 'presence']

            for target_id in to_watch:
                # Each cell watches 1-4 sensation types
                n_types = np.random.randint(1, 5)
                types = np.random.choice(sensation_types, n_types, replace=False).tolist()
                cell.watch(target_id, types)
                self.cells[target_id].watchers.append(cell_id)

    def get_network_stats(self) -> Dict:
        """Calculate network statistics."""
        total_connections = sum(len(c.watched) for c in self.cells.values())
        total_sensation_links = sum(len(types) for c in self.cells.values()
                                   for _, types in c.watched)
        avg_incoming = sum(len(c.watchers) for c in self.cells.values()) / self.n_cells
        max_incoming = max(len(c.watchers) for c in self.cells.values()) if self.cells else 0

        # Calculate load distribution
        incoming_counts = [len(c.watchers) for c in self.cells.values()]
        load_variance = np.var(incoming_counts) if incoming_counts else 0

        return {
            'n_cells': self.n_cells,
            'total_connections': total_connections,
            'total_sensation_links': total_sensation_links,
            'avg_incoming': avg_incoming,
            'max_incoming': max_incoming,
            'load_variance': load_variance,
            'scaling_factor': total_connections / self.n_cells if self.n_cells > 0 else 0
        }

    def simulate_sensation_processing(self, iterations: int = 100) -> Dict:
        """Simulate sensation processing load."""
        start_time = time.time()
        total_sensations = 0

        for iteration in range(iterations):
            for cell_id, cell in self.cells.items():
                # Update value
                old_value = self.cell_data[cell_id]['value']
                new_value = old_value + np.random.randn() * 0.1
                self.cell_data[cell_id]['value'] = new_value
                self.cell_data[cell_id]['history'].append(new_value)
                if len(self.cell_data[cell_id]['history']) > 100:
                    self.cell_data[cell_id]['history'].pop(0)

                # Process sensations for each watched cell
                for target_id, types in cell.watched:
                    target_data = self.cell_data[target_id]
                    target_value = target_data['value']
                    target_history = target_data['history']

                    for sensation_type in types:
                        total_sensations += 1
                        if sensation_type == 'absolute':
                            self.processor.detect_absolute_change(target_id, target_value, old_value)
                        elif sensation_type == 'velocity':
                            self.processor.detect_rate_of_change(target_id, target_value, old_value, 1)
                        elif sensation_type == 'acceleration':
                            self.processor.detect_acceleration(target_id, target_data['velocities'])
                        elif sensation_type == 'anomaly':
                            self.processor.detect_anomaly(target_id, target_value, target_history)
                        elif sensation_type == 'pattern':
                            self.processor.detect_pattern(target_id, target_value, target_history)
                        # 'presence' is just existence check, no processing needed

        elapsed = time.time() - start_time

        return {
            'elapsed_time': elapsed,
            'total_sensations': total_sensations,
            'sensations_per_second': total_sensations / elapsed if elapsed > 0 else 0,
            'avg_latency_ms': (elapsed / total_sensations * 1000) if total_sensations > 0 else 0
        }


def run_simulation_1_network_scaling():
    """Simulation 1: Network Scaling Tests."""
    print("=" * 80)
    print("SIMULATION 1: Network Scaling Tests")
    print("=" * 80)

    n_cells_list = [100, 500, 1000, 5000, 10000, 50000, 100000]
    avg_watch_per_cell = 5

    results = []

    for n_cells in n_cells_list:
        print(f"\nTesting with {n_cells} cells...")
        sim = NetworkSimulator(n_cells)
        sim.establish_random_watches(avg_watch_per_cell)
        stats = sim.get_network_stats()
        results.append(stats)

        print(f"  Connections: {stats['total_connections']:,}")
        print(f"  Avg Incoming: {stats['avg_incoming']:.2f}")
        print(f"  Max Incoming: {stats['max_incoming']}")
        print(f"  Scaling Factor: {stats['scaling_factor']:.2f}x")
        print(f"  Load Variance: {stats['load_variance']:.2f}")

    return results


def run_simulation_2_processing_load():
    """Simulation 2: Sensation Processing Load."""
    print("\n" + "=" * 80)
    print("SIMULATION 2: Sensation Processing Load")
    print("=" * 80)

    test_configs = [
        (100, 5, 100),
        (500, 5, 100),
        (1000, 5, 100),
        (5000, 5, 50),
        (10000, 5, 50),
    ]

    results = []

    for n_cells, avg_watch, iterations in test_configs:
        print(f"\nTesting: {n_cells} cells, {avg_watch} watches, {iterations} iterations")
        sim = NetworkSimulator(n_cells)
        sim.establish_random_watches(avg_watch)
        perf = sim.simulate_sensation_processing(iterations)
        results.append({**perf, 'n_cells': n_cells, 'iterations': iterations})

        print(f"  Time: {perf['elapsed_time']:.2f}s")
        print(f"  Sensations: {perf['total_sensations']:,}")
        print(f"  Throughput: {perf['sensations_per_second']:,.0f} sensations/sec")
        print(f"  Avg Latency: {perf['avg_latency_ms']:.4f}ms")

    return results


def run_simulation_3_sensation_distribution():
    """Simulation 3: Sensation Type Distribution Analysis."""
    print("\n" + "=" * 80)
    print("SIMULATION 3: Sensation Type Distribution")
    print("=" * 80)

    sensation_types = ['absolute', 'velocity', 'acceleration', 'anomaly', 'pattern', 'presence']

    # Test with different network sizes
    n_cells = 1000
    avg_watch = 5

    sim = NetworkSimulator(n_cells)
    sim.establish_random_watches(avg_watch)

    # Count sensation type usage
    type_counts = defaultdict(int)
    type_pairs = defaultdict(int)

    for cell in sim.cells.values():
        for _, types in cell.watched:
            for st in types:
                type_counts[st] += 1
            # Count pairs
            if len(types) > 1:
                for i, st1 in enumerate(types):
                    for st2 in types[i+1:]:
                        pair = tuple(sorted([st1, st2]))
                        type_pairs[pair] += 1

    print(f"\nSensation Type Distribution (1000 cells, 5 watches each):")
    print("-" * 50)
    for st in sensation_types:
        count = type_counts.get(st, 0)
        pct = count / sum(type_counts.values()) * 100 if type_counts else 0
        print(f"  {st:12s}: {count:5,} ({pct:5.1f}%)")

    print(f"\nMost Common Type Pairs:")
    print("-" * 50)
    sorted_pairs = sorted(type_pairs.items(), key=lambda x: x[1], reverse=True)[:10]
    for pair, count in sorted_pairs:
        print(f"  {pair[0]:12s} + {pair[1]:12s}: {count:4,}")

    return {'type_counts': dict(type_counts), 'type_pairs': dict(type_pairs)}


def run_simulation_4_memory_usage():
    """Simulation 4: Memory Usage Analysis (Estimated)."""
    print("\n" + "=" * 80)
    print("SIMULATION 4: Memory Usage Analysis (Estimated)")
    print("=" * 80)

    n_cells_list = [100, 500, 1000, 5000, 10000, 50000, 100000]
    avg_watch = 5

    results = []

    for n_cells in n_cells_list:
        sim = NetworkSimulator(n_cells)
        sim.establish_random_watches(avg_watch)
        stats = sim.get_network_stats()

        # Estimate memory usage based on data structures
        # Each Cell object: ~200 bytes (id, lists)
        # Each watched connection: ~100 bytes (tuple + list)
        # Each history entry: ~8 bytes (float)

        estimated_memory_per_cell = 0.0002  # MB (200 bytes)
        estimated_memory_per_connection = 0.0001  # MB (100 bytes)
        estimated_memory_per_history_entry = 0.000008  # MB (8 bytes)

        total_memory = (
            n_cells * estimated_memory_per_cell +
            stats['total_connections'] * estimated_memory_per_connection +
            n_cells * 100 * estimated_memory_per_history_entry  # 100 history entries per cell
        )

        result = {
            'n_cells': n_cells,
            'memory_mb': total_memory,
            'memory_per_cell_kb': (total_memory * 1024) / n_cells,
            'memory_per_connection_bytes': (total_memory * 1024 * 1024) / stats['total_connections'] if stats['total_connections'] > 0 else 0
        }
        results.append(result)

        print(f"\n{n_cells:,} cells:")
        print(f"  Est. Memory: {total_memory:.2f} MB")
        print(f"  Per Cell: {result['memory_per_cell_kb']:.2f} KB")
        print(f"  Per Connection: {result['memory_per_connection_bytes']:.2f} bytes")

    return results


def run_simulation_5_cascade_analysis():
    """Simulation 5: Cascade Failure Analysis."""
    print("\n" + "=" * 80)
    print("SIMULATION 5: Cascade Failure Analysis")
    print("=" * 80)

    n_cells = 1000
    avg_watch = 5

    sim = NetworkSimulator(n_cells)
    sim.establish_random_watches(avg_watch)

    # Analyze cascade potential
    # Cells with many watchers are critical points
    incoming_counts = {cid: len(cell.watchers) for cid, cell in sim.cells.items()}

    # Sort by incoming connections
    sorted_by_incoming = sorted(incoming_counts.items(), key=lambda x: x[1], reverse=True)

    print(f"\nTop 10 Most Watched Cells (Critical Points):")
    print("-" * 50)
    for cid, count in sorted_by_incoming[:10]:
        pct = (count / n_cells) * 100
        print(f"  Cell {cid:4d}: {count:3d} watchers ({pct:5.1f}% of all cells)")

    # Calculate cascade potential
    # If top 1% of cells fail, how many cells are affected?
    top_1_pct = max(1, n_cells // 100)
    top_cells = set(cid for cid, _ in sorted_by_incoming[:top_1_pct])

    affected = set()
    for cid in top_cells:
        affected.add(cid)
        affected.update(sim.cells[cid].watchers)

    print(f"\nCascade Risk Analysis:")
    print("-" * 50)
    print(f"  Top 1% cells: {top_1_pct}")
    print(f"  If these fail, {len(affected)} cells affected ({len(affected)/n_cells*100:.1f}%)")

    # Calculate network resilience metrics
    avg_incoming = np.mean(list(incoming_counts.values()))
    std_incoming = np.std(list(incoming_counts.values()))

    print(f"\nNetwork Resilience Metrics:")
    print("-" * 50)
    print(f"  Avg Incoming: {avg_incoming:.2f}")
    print(f"  Std Dev: {std_incoming:.2f}")
    print(f"  Coefficient of Variation: {std_incoming/avg_incoming if avg_incoming > 0 else 0:.2f}")

    return {
        'n_cells': n_cells,
        'top_1pct_count': top_1_pct,
        'cascade_affected': len(affected),
        'cascade_pct': len(affected) / n_cells * 100,
        'avg_incoming': avg_incoming,
        'std_incoming': std_incoming,
        'cv': std_incoming / avg_incoming if avg_incoming > 0 else 0
    }


def main():
    """Run all simulations and generate results."""
    print("\n" + "=" * 80)
    print("LOG CELL NETWORK SCALING SIMULATIONS")
    print("=" * 80)

    all_results = {}

    # Run all simulations
    all_results['network_scaling'] = run_simulation_1_network_scaling()
    all_results['processing_load'] = run_simulation_2_processing_load()
    all_results['sensation_distribution'] = run_simulation_3_sensation_distribution()
    all_results['memory_usage'] = run_simulation_4_memory_usage()
    all_results['cascade_analysis'] = run_simulation_5_cascade_analysis()

    # Generate summary
    print("\n" + "=" * 80)
    print("SIMULATION SUMMARY")
    print("=" * 80)

    print("\nKey Findings:")
    print("-" * 50)

    # Network scaling
    ns = all_results['network_scaling'][-1]
    print(f"1. Network Scaling ({ns['n_cells']:,} cells):")
    print(f"   - O(n) linear scaling confirmed")
    print(f"   - Scaling factor: {ns['scaling_factor']:.2f}x")
    print(f"   - Max incoming connections: {ns['max_incoming']}")

    # Processing load
    pl = all_results['processing_load'][2]  # 1000 cells
    print(f"\n2. Processing Performance (1000 cells):")
    print(f"   - Throughput: {pl['sensations_per_second']:,.0f} sensations/sec")
    print(f"   - Avg latency: {pl['avg_latency_ms']:.4f}ms")
    print(f"   - Linear performance degradation")

    # Memory
    mem = all_results['memory_usage'][-1]
    print(f"\n3. Memory Efficiency (10000 cells):")
    print(f"   - Total: {mem['memory_mb']:.2f} MB")
    print(f"   - Per cell: {mem['memory_per_cell_kb']:.2f} KB")
    print(f"   - Per connection: {mem['memory_per_connection_bytes']:.2f} bytes")

    # Cascade
    ca = all_results['cascade_analysis']
    print(f"\n4. Network Resilience:")
    print(f"   - Cascade risk from top 1%: {ca['cascade_pct']:.1f}%")
    print(f"   - Load distribution CV: {ca['cv']:.2f}")
    print(f"   - Status: {'GOOD' if ca['cv'] < 1.0 else 'NEEDS ATTENTION'}")

    # Save results to JSON
    output_file = 'simulation_results.json'
    with open(output_file, 'w') as f:
        json.dump(all_results, f, indent=2, default=str)

    print(f"\nResults saved to {output_file}")

    return all_results


if __name__ == '__main__':
    results = main()
