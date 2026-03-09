"""
Network Scaling Simulations for LOG Cell System
================================================
Run this script to generate simulation results.
"""

import numpy as np
import time
import json
from collections import defaultdict
from dataclasses import dataclass
from typing import List, Dict, Tuple

@dataclass
class Cell:
    """Represents a LOG cell with watch relationships."""
    id: int
    watched: List[Tuple[int, List[str]]]
    watchers: List[int]

    def watch(self, other_id: int, sensation_types: List[str]):
        self.watched.append((other_id, sensation_types))


@dataclass
class SensationProcessor:
    """Processes sensation detections for cells."""
    def __init__(self):
        self.history: Dict[int, List[float]] = {}
        self.velocities: Dict[int, List[float]] = {}

    def detect_absolute_change(self, cell_id: int, new_value: float, old_value: float) -> float:
        return abs(new_value - old_value)

    def detect_rate_of_change(self, cell_id: int, new_value: float, old_value: float, time_delta: float) -> float:
        if time_delta == 0:
            return 0.0
        return (new_value - old_value) / time_delta

    def detect_acceleration(self, cell_id: int, velocities: List[float]) -> float:
        if len(velocities) < 2:
            return 0.0
        return velocities[-1] - velocities[-2]

    def detect_anomaly(self, cell_id: int, value: float, history: List[float]) -> float:
        if len(history) < 10:
            return 0.0
        mean = np.mean(history)
        std = np.std(history)
        if std == 0:
            return 0.0
        return abs((value - mean) / std)

    def detect_pattern(self, cell_id: int, value: float, history: List[float]) -> float:
        if len(history) < 20:
            return 0.0
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
        for i in range(self.n_cells):
            self.cells[i] = Cell(id=i, watched=[], watchers=[])
            self.cell_data[i] = {
                'value': np.random.randn(),
                'history': [np.random.randn() for _ in range(10)],
                'velocities': []
            }

    def establish_random_watches(self, avg_watch_per_cell: int):
        for cell_id, cell in self.cells.items():
            potential_targets = [cid for cid in self.cells.keys() if cid != cell_id]
            if not potential_targets:
                continue

            n_watch = min(avg_watch_per_cell, len(potential_targets))
            to_watch = np.random.choice(potential_targets, n_watch, replace=False)

            sensation_types = ['absolute', 'velocity', 'acceleration', 'anomaly', 'pattern', 'presence']

            for target_id in to_watch:
                n_types = np.random.randint(1, 5)
                types = np.random.choice(sensation_types, n_types, replace=False).tolist()
                cell.watch(target_id, types)
                self.cells[target_id].watchers.append(cell_id)

    def get_network_stats(self) -> Dict:
        total_connections = sum(len(c.watched) for c in self.cells.values())
        total_sensation_links = sum(len(types) for c in self.cells.values()
                                   for _, types in c.watched)
        avg_incoming = sum(len(c.watchers) for c in self.cells.values()) / self.n_cells
        max_incoming = max(len(c.watchers) for c in self.cells.values()) if self.cells else 0

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
        start_time = time.time()
        total_sensations = 0

        for iteration in range(iterations):
            for cell_id, cell in self.cells.items():
                old_value = self.cell_data[cell_id]['value']
                new_value = old_value + np.random.randn() * 0.1
                self.cell_data[cell_id]['value'] = new_value
                self.cell_data[cell_id]['history'].append(new_value)
                if len(self.cell_data[cell_id]['history']) > 100:
                    self.cell_data[cell_id]['history'].pop(0)

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

        elapsed = time.time() - start_time

        return {
            'elapsed_time': elapsed,
            'total_sensations': total_sensations,
            'sensations_per_second': total_sensations / elapsed if elapsed > 0 else 0,
            'avg_latency_ms': (elapsed / total_sensations * 1000) if total_sensations > 0 else 0
        }


def run_all_simulations():
    """Run all simulations and return results."""
    results = {}

    # Simulation 1: Network Scaling
    print("Running Simulation 1: Network Scaling...")
    n_cells_list = [100, 500, 1000, 5000, 10000, 50000, 100000]
    scaling_results = []

    for n_cells in n_cells_list:
        sim = NetworkSimulator(n_cells)
        sim.establish_random_watches(5)
        stats = sim.get_network_stats()
        scaling_results.append(stats)
        print(f"  {n_cells:,} cells: {stats['total_connections']} connections, scaling={stats['scaling_factor']:.2f}x")

    results['network_scaling'] = scaling_results

    # Simulation 2: Processing Load
    print("\nRunning Simulation 2: Processing Load...")
    load_configs = [(100, 5, 100), (500, 5, 100), (1000, 5, 100), (5000, 5, 50), (10000, 5, 50)]
    load_results = []

    for n_cells, avg_watch, iterations in load_configs:
        sim = NetworkSimulator(n_cells)
        sim.establish_random_watches(avg_watch)
        perf = sim.simulate_sensation_processing(iterations)
        perf['n_cells'] = n_cells
        load_results.append(perf)
        print(f"  {n_cells:,} cells: {perf['sensations_per_second']:,.0f} sensations/sec")

    results['processing_load'] = load_results

    # Simulation 3: Sensation Distribution
    print("\nRunning Simulation 3: Sensation Distribution...")
    sim = NetworkSimulator(1000)
    sim.establish_random_watches(5)

    type_counts = defaultdict(int)
    for cell in sim.cells.values():
        for _, types in cell.watched:
            for st in types:
                type_counts[st] += 1

    dist_results = {'type_counts': dict(type_counts)}
    results['sensation_distribution'] = dist_results
    print(f"  Distribution: {dict(type_counts)}")

    # Simulation 4: Memory Estimation
    print("\nRunning Simulation 4: Memory Estimation...")
    memory_results = []
    for n_cells in [100, 500, 1000, 5000, 10000, 50000, 100000]:
        sim = NetworkSimulator(n_cells)
        sim.establish_random_watches(5)
        stats = sim.get_network_stats()

        total_memory = (
            n_cells * 0.0002 +  # Cell objects
            stats['total_connections'] * 0.0001 +  # Connections
            n_cells * 100 * 0.000008  # History
        )

        memory_results.append({
            'n_cells': n_cells,
            'memory_mb': total_memory,
            'memory_per_cell_kb': (total_memory * 1024) / n_cells
        })
        print(f"  {n_cells:,} cells: {total_memory:.2f} MB")

    results['memory_usage'] = memory_results

    # Simulation 5: Cascade Analysis
    print("\nRunning Simulation 5: Cascade Analysis...")
    sim = NetworkSimulator(1000)
    sim.establish_random_watches(5)

    incoming_counts = {cid: len(cell.watchers) for cid, cell in sim.cells.items()}
    sorted_by_incoming = sorted(incoming_counts.items(), key=lambda x: x[1], reverse=True)

    top_1_pct = max(1, 1000 // 100)
    top_cells = set(cid for cid, _ in sorted_by_incoming[:top_1_pct])

    affected = set()
    for cid in top_cells:
        affected.add(cid)
        affected.update(sim.cells[cid].watchers)

    cascade_results = {
        'n_cells': 1000,
        'top_1pct_count': top_1_pct,
        'cascade_affected': len(affected),
        'cascade_pct': len(affected) / 1000 * 100,
        'avg_incoming': np.mean(list(incoming_counts.values())),
        'std_incoming': np.std(list(incoming_counts.values()))
    }
    results['cascade_analysis'] = cascade_results
    print(f"  Top 1% failure affects {cascade_results['cascade_pct']:.1f}% of cells")

    return results


if __name__ == '__main__':
    print("=" * 70)
    print("LOG CELL NETWORK SCALING SIMULATIONS")
    print("=" * 70)

    results = run_all_simulations()

    # Save results
    output_file = 'C:/Users/casey/polln/docs/research/spreadsheet/simulation_results.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\nResults saved to {output_file}")
    print("=" * 70)
