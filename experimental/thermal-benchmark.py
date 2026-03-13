#!/usr/bin/env python3
"""
Thermal Simulation Benchmark for Paper 11
GPU-accelerated heat diffusion using CuPy

Based on Paper 11 schema from Lucineer thermal_simulation module
"""

import numpy as np
import cupy as cp
import json
import time
import os
import datetime
from typing import Dict, List, Any

class ThermalBenchmark:
    """GPU-accelerated thermal simulation benchmark"""

    def __init__(self):
        self.results = {
            'gpu_benchmarks': [],
            'cpu_benchmarks': [],
            'comparisons': []
        }

    def gpu_heat_diffusion(self, grid_size: int, steps: int) -> Dict:
        """Run GPU heat diffusion simulation"""
        # Initialize temperature grid
        T = cp.zeros((grid_size, grid_size), dtype=cp.float32)

        # Hot center spot
        center = grid_size // 2
        radius = max(1, grid_size // 8)
        y, x = cp.ogrid[:grid_size, :grid_size]
        mask = ((x - center)**2 + (y - center)**2) < radius**2
        T[mask] = 100.0

        # Boundary conditions
        T[0, :] = T[-1, :] = T[:, 0] = T[:, -1] = 0

        alpha = 0.25  # Thermal diffusivity
        dx = 1.0 / grid_size
        dt = 0.25 * dx**2 / alpha

        # Run simulation
        start = time.time()
        for _ in range(steps):
            laplacian = (
                cp.roll(T, 1, 0) + cp.roll(T, -1, 0) +
                cp.roll(T, 1, 1) + cp.roll(T, -1, 1) - 4 * T
            )
            T = T + alpha * dt / dx**2 * laplacian
            T[0, :] = T[-1, :] = T[:, 0] = T[:, -1] = 0

        cp.cuda.Stream.null.synchronize()
        elapsed = time.time() - start

        return {
            'grid_size': grid_size,
            'steps': steps,
            'time_seconds': elapsed,
            'steps_per_second': steps / elapsed,
            'final_max_temp': float(cp.max(T)),
            'final_avg_temp': float(cp.mean(T))
        }

    def cpu_heat_diffusion(self, grid_size: int, steps: int) -> Dict:
        """Run CPU heat diffusion simulation for comparison"""
        T = np.zeros((grid_size, grid_size), dtype=np.float32)

        center = grid_size // 2
        radius = max(1, grid_size // 8)
        y, x = np.ogrid[:grid_size, :grid_size]
        mask = ((x - center)**2 + (y - center)**2) < radius**2
        T[mask] = 100.0

        T[0, :] = T[-1, :] = T[:, 0] = T[:, -1] = 0

        alpha = 0.25
        dx = 1.0 / grid_size
        dt = 0.25 * dx**2 / alpha

        start = time.time()
        for _ in range(steps):
            laplacian = (
                np.roll(T, 1, 0) + np.roll(T, -1, 0) +
                np.roll(T, 1, 1) + np.roll(T, -1, 1) - 4 * T
            )
            T = T + alpha * dt / dx**2 * laplacian
            T[0, :] = T[-1, :] = T[:, 0] = T[:, -1] = 0

        elapsed = time.time() - start

        return {
            'grid_size': grid_size,
            'steps': steps,
            'time_seconds': elapsed,
            'steps_per_second': steps / elapsed,
            'final_max_temp': float(np.max(T)),
            'final_avg_temp': float(np.mean(T))
        }

    def run_benchmarks(self, grid_sizes: List[int], steps: int = 1000):
        """Run benchmarks across multiple grid sizes"""
        print("="*60)
        print("THERMAL SIMULATION BENCHMARK - PAPER 11")
        print("="*60)
        print(f"CuPy version: {cp.__version__}")
        if cp.is_available():
            props = cp.cuda.runtime.getDeviceProperties(0)
            print(f"GPU: {props['name'].decode()}")
        print("="*60)
        print()

        for grid_size in grid_sizes:
            print(f"Benchmarking {grid_size}x{grid_size} grid ({steps} steps)...")

            # GPU benchmark
            gpu_result = self.gpu_heat_diffusion(grid_size, steps)
            self.results['gpu_benchmarks'].append(gpu_result)
            print(f"  GPU: {gpu_result['time_seconds']:.3f}s ({gpu_result['steps_per_second']:.0f} steps/s)")

            # CPU benchmark (skip large grids)
            if grid_size <= 512:
                cpu_result = self.cpu_heat_diffusion(grid_size, steps)
                self.results['cpu_benchmarks'].append(cpu_result)
                print(f"  CPU: {cpu_result['time_seconds']:.3f}s ({cpu_result['steps_per_second']:.0f} steps/s)")

                speedup = cpu_result['time_seconds'] / gpu_result['time_seconds']
                self.results['comparisons'].append({
                    'grid_size': grid_size,
                    'gpu_time': gpu_result['time_seconds'],
                    'cpu_time': cpu_result['time_seconds'],
                    'speedup': speedup
                })
                print(f"  Speedup: {speedup:.1f}x")
            else:
                print(f"  CPU: Skipped (grid too large)")

        return self.results

    def save_results(self, output_dir: str):
        """Save benchmark results"""
        os.makedirs(output_dir, exist_ok=True)

        with open(f"{output_dir}/thermal_benchmark.json", 'w') as f:
            json.dump(self.results, f, indent=2)

        # Generate report
        report = self.generate_report()
        with open(f"{output_dir}/THERMAL_REPORT.md", 'w') as f:
            f.write(report)

        return report

    def generate_report(self) -> str:
        """Generate markdown report"""
        report = """# Thermal Simulation Benchmark Report

## Paper 11: Thermal Simulation Engine

### GPU Benchmark Results

| Grid Size | Steps | Time (s) | Steps/sec | Max Temp | Avg Temp |
|-----------|-------|----------|-----------|----------|----------|
"""
        for r in self.results['gpu_benchmarks']:
            report += f"| {r['grid_size']}x{r['grid_size']} | {r['steps']} | {r['time_seconds']:.3f} | {r['steps_per_second']:.0f} | {r['final_max_temp']:.2f} | {r['final_avg_temp']:.2f} |\n"

        if self.results['comparisons']:
            report += "\n### CPU vs GPU Comparison\n\n| Grid Size | CPU Time (s) | GPU Time (s) | Speedup |\n|-----------|--------------|--------------|--------|\n"
            for c in self.results['comparisons']:
                report += f"| {c['grid_size']}x{c['grid_size']} | {c['cpu_time']:.3f} | {c['gpu_time']:.3f} | {c['speedup']:.1f}x |\n"

            avg_speedup = sum(c['speedup'] for c in self.results['comparisons']) / len(self.results['comparisons'])
            report += f"\n**Average GPU Speedup: {avg_speedup:.1f}x**\n"

        report += """
## Mathematical Foundation

**Heat Equation:**
$$\\partial T / \\partial t = \\alpha \\nabla^2 T$$

**Discretization:**
$$T(i,j,t+1) = T(i,j,t) + \\frac{\\alpha \\Delta t}{\\Delta x^2} \\cdot \\text{Laplacian}(T)$$

---
*Generated by Thermal Simulation Benchmark Framework*
"""
        return report


def main():
    benchmark = ThermalBenchmark()

    # Run benchmarks
    grid_sizes = [64, 128, 256, 512, 1024]
    results = benchmark.run_benchmarks(grid_sizes, steps=1000)

    # Save results
    timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    output_dir = f"experimental/results/thermal-{timestamp}"
    report = benchmark.save_results(output_dir)

    print(f"\n{'='*60}")
    print("THERMAL BENCHMARK COMPLETE!")
    print(f"{'='*60}")
    if benchmark.results['comparisons']:
        avg_speedup = sum(c['speedup'] for c in benchmark.results['comparisons']) / len(benchmark.results['comparisons'])
        print(f"Average GPU Speedup: {avg_speedup:.1f}x")
    print(f"Results saved to: {output_dir}/")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
