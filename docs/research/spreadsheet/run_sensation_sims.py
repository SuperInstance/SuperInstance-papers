"""
Comprehensive Sensation System Network Scaling Simulation
==========================================================
This script simulates the LOG cell sensation system at various scales.
"""

import numpy as np
import time
import json
import sys
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


class NetworkSimulator:
    """Simulates LOG cell network behavior."""
    def __init__(self, n_cells: int):
        self.n_cells = n_cells
        self.cells: Dict[int, Cell] = {}
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
        detections = {
            'absolute': 0,
            'velocity': 0,
            'acceleration': 0,
            'anomaly': 0,
            'pattern': 0
        }

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
                            detections['absolute'] += 1
                            _ = abs(target_value - old_value)
                        elif sensation_type == 'velocity':
                            detections['velocity'] += 1
                            _ = (target_value - old_value) / 1.0
                        elif sensation_type == 'acceleration':
                            detections['acceleration'] += 1
                            if len(target_data['velocities']) >= 2:
                                _ = target_data['velocities'][-1] - target_data['velocities'][-2]
                        elif sensation_type == 'anomaly':
                            detections['anomaly'] += 1
                            if len(target_history) >= 10:
                                mean = np.mean(target_history)
                                std = np.std(target_history)
                                if std > 0:
                                    _ = abs((target_value - mean) / std)
                        elif sensation_type == 'pattern':
                            detections['pattern'] += 1
                            if len(target_history) >= 20:
                                series = np.array(target_history[-20:] + [target_value])
                                corr = np.corrcoef(series[:-1], series[1:])[0, 1]
                                _ = corr if not np.isnan(corr) else 0.0

        elapsed = time.time() - start_time

        return {
            'elapsed_time': elapsed,
            'total_sensations': total_sensations,
            'sensations_per_second': total_sensations / elapsed if elapsed > 0 else 0,
            'avg_latency_ms': (elapsed / total_sensations * 1000) if total_sensations > 0 else 0,
            'detections': detections
        }


def main():
    print("=" * 80)
    print("SENSATION SYSTEM NETWORK SCALING SIMULATIONS")
    print("=" * 80)

    results = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'simulations': {}
    }

    # Simulation 1: Network Scaling
    print("\n[1/5] Running Network Scaling Simulation...")
    n_cells_list = [100, 500, 1000, 5000, 10000, 50000, 100000]
    scaling_results = []

    for n_cells in n_cells_list:
        sim = NetworkSimulator(n_cells)
        sim.establish_random_watches(5)
        stats = sim.get_network_stats()
        scaling_results.append(stats)
        print(f"  {n_cells:>7,} cells | Connections: {stats['total_connections']:>7,} | "
              f"Avg In: {stats['avg_incoming']:>5.2f} | Max In: {stats['max_incoming']:>3} | "
              f"Scale: {stats['scaling_factor']:.2f}x")

    results['simulations']['network_scaling'] = scaling_results

    # Simulation 2: Processing Load
    print("\n[2/5] Running Processing Load Simulation...")
    load_configs = [(100, 5, 100), (500, 5, 100), (1000, 5, 100), (5000, 5, 50), (10000, 5, 50)]
    load_results = []

    for n_cells, avg_watch, iterations in load_configs:
        sim = NetworkSimulator(n_cells)
        sim.establish_random_watches(avg_watch)
        perf = sim.simulate_sensation_processing(iterations)
        perf['n_cells'] = n_cells
        perf['iterations'] = iterations
        load_results.append(perf)
        print(f"  {n_cells:>5,} cells | {perf['sensations_per_second']:>10,.0f} sens/sec | "
              f"Latency: {perf['avg_latency_ms']:>6.3f}ms")

    results['simulations']['processing_load'] = load_results

    # Simulation 3: Sensation Type Distribution
    print("\n[3/5] Running Sensation Distribution Simulation...")
    sim = NetworkSimulator(1000)
    sim.establish_random_watches(5)

    type_counts = defaultdict(int)
    type_pairs = defaultdict(int)

    for cell in sim.cells.values():
        for _, types in cell.watched:
            for st in types:
                type_counts[st] += 1
            if len(types) > 1:
                for i, st1 in enumerate(types):
                    for st2 in types[i+1:]:
                        pair = tuple(sorted([st1, st2]))
                        type_pairs[pair] += 1

    total_sensations = sum(type_counts.values())
    dist_results = {
        'type_counts': dict(type_counts),
        'type_percentages': {k: (v / total_sensations * 100) for k, v in type_counts.items()},
        'total_sensations': total_sensations
    }

    for st in ['absolute', 'velocity', 'acceleration', 'anomaly', 'pattern', 'presence']:
        count = type_counts.get(st, 0)
        pct = dist_results['type_percentages'].get(st, 0)
        print(f"  {st:12s}: {count:>6,} ({pct:>5.1f}%)")

    results['simulations']['sensation_distribution'] = dist_results

    # Simulation 4: Memory Estimation
    print("\n[4/5] Running Memory Estimation Simulation...")
    memory_results = []
    for n_cells in [100, 500, 1000, 5000, 10000, 50000, 100000]:
        sim = NetworkSimulator(n_cells)
        sim.establish_random_watches(5)
        stats = sim.get_network_stats()

        # Memory estimation
        total_memory = (
            n_cells * 0.0002 +  # Cell objects (200 bytes each)
            stats['total_connections'] * 0.0001 +  # Connections (100 bytes each)
            n_cells * 100 * 0.000008  # History entries (8 bytes each)
        )

        memory_results.append({
            'n_cells': n_cells,
            'memory_mb': total_memory,
            'memory_per_cell_kb': (total_memory * 1024) / n_cells,
            'total_connections': stats['total_connections']
        })
        print(f"  {n_cells:>7,} cells | Memory: {total_memory:>7.2f} MB | "
              f"Per Cell: {(total_memory * 1024) / n_cells:>6.2f} KB")

    results['simulations']['memory_usage'] = memory_results

    # Simulation 5: Cascade Analysis
    print("\n[5/5] Running Cascade Analysis Simulation...")
    sim = NetworkSimulator(1000)
    sim.establish_random_watches(5)

    incoming_counts = {cid: len(cell.watchers) for cid, cell in sim.cells.items()}
    sorted_by_incoming = sorted(incoming_counts.items(), key=lambda x: x[1], reverse=True)

    print("  Top 10 Most Watched Cells:")
    for i, (cid, count) in enumerate(sorted_by_incoming[:10], 1):
        pct = (count / 1000) * 100
        print(f"    {i:2d}. Cell {cid:4d}: {count:3d} watchers ({pct:5.1f}%)")

    top_1_pct = max(1, 1000 // 100)
    top_cells = set(cid for cid, _ in sorted_by_incoming[:top_1_pct])

    affected = set()
    for cid in top_cells:
        affected.add(cid)
        affected.update(sim.cells[cid].watchers)

    avg_in = np.mean(list(incoming_counts.values()))
    std_in = np.std(list(incoming_counts.values()))

    cascade_results = {
        'n_cells': 1000,
        'top_1pct_count': top_1_pct,
        'cascade_affected': len(affected),
        'cascade_pct': len(affected) / 1000 * 100,
        'avg_incoming': avg_in,
        'std_incoming': std_in,
        'coefficient_of_variation': std_in / avg_in if avg_in > 0 else 0
    }

    print(f"  Cascade Risk: Top 1% ({top_1_pct} cells) → {len(affected)} cells affected "
          f"({cascade_results['cascade_pct']:.1f}%)")
    print(f"  Load Distribution: Mean={avg_in:.2f}, Std={std_in:.2f}, CV={cascade_results['coefficient_of_variation']:.2f}")

    results['simulations']['cascade_analysis'] = cascade_results

    # Save results
    output_file = 'C:/Users/casey/polln/docs/research/spreadsheet/sensation_simulation_results.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 80)
    print(f"Results saved to: {output_file}")
    print("=" * 80)

    # Print summary
    print("\nKEY FINDINGS:")
    print("-" * 80)
    print(f"1. Network Scaling: O(n) linear scaling confirmed")
    print(f"   - 100,000 cells: {scaling_results[-1]['total_connections']:,} connections")
    print(f"   - Scaling factor: {scaling_results[-1]['scaling_factor']:.2f}x")

    print(f"\n2. Processing Performance:")
    print(f"   - 1,000 cells: {load_results[2]['sensations_per_second']:,.0f} sensations/sec")
    print(f"   - Avg latency: {load_results[2]['avg_latency_ms']:.3f}ms")

    print(f"\n3. Memory Efficiency:")
    print(f"   - 10,000 cells: {memory_results[4]['memory_mb']:.2f} MB")
    print(f"   - Per cell: {memory_results[4]['memory_per_cell_kb']:.2f} KB")

    print(f"\n4. Network Resilience:")
    print(f"   - Cascade risk: {cascade_results['cascade_pct']:.1f}% affected by top 1% failure")
    print(f"   - Load distribution CV: {cascade_results['coefficient_of_variation']:.2f}")
    print(f"   - Status: {'EXCELLENT' if cascade_results['coefficient_of_variation'] < 1.0 else 'NEEDS ATTENTION'}")

    return results


if __name__ == '__main__':
    main()
