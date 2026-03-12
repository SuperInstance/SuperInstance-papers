/**
 * Dashboard Generator
 *
 * Creates HTML dashboards for benchmark results with charts and visualizations
 */

import { BenchmarkResult, BenchmarkConfig } from './benchmark-runner';
import { readFileSync } from 'fs';
import { join } from 'path';

export class DashboardGenerator {
  async generate(results: BenchmarkResult[], config: BenchmarkConfig): Promise<string> {
    const html = this.generateHTML(results, config);
    return html;
  }

  generateHTML(results: BenchmarkResult[], config: BenchmarkConfig): string {
    const summary = this.generateSummary(results);
    const categories = this.groupByCategory(results);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SuperInstance Performance Dashboard - Round 12</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 0;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s;
        }

        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .card h3 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 1.2em;
        }

        .metric {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .metric-value {
            font-weight: bold;
            color: #333;
        }

        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }

        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }

        .category-section {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }

        .category-header {
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }

        .category-header h2 {
            color: #667eea;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .benchmark-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .benchmark-table th,
        .benchmark-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        .benchmark-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #667eea;
        }

        .benchmark-table tr:hover {
            background: #f8f9fa;
        }

        .performance-indicator {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 500;
        }

        .performance-good {
            background: #d4edda;
            color: #155724;
        }

        .performance-fair {
            background: #fff3cd;
            color: #856404;
        }

        .performance-poor {
            background: #f8d7da;
            color: #721c24;
        }

        .tooltip {
            position: absolute;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 0.9em;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
        }

        .config-info {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            font-size: 0.9em;
        }

        .config-info h4 {
            margin-bottom: 10px;
            color: #495057;
        }

        .config-details {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
        }

        .config-item {
            flex: 1;
            min-width: 200px;
        }

        .config-item strong {
            color: #667eea;
        }

        footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🚀 SuperInstance Performance Dashboard</h1>
            <p>Comprehensive Benchmark Report - Round 12</p>
            <p>Generated on: ${new Date().toLocaleString()} | Runtime: ${((data.endTime - data.startTime) / 1000).toFixed(2)}s</p>
        </header>

        <div class="config-info">
            <h4>📋 Benchmark Configuration</h4>
            <div class="config-details">
                <div class="config-item">
                    <strong>Iterations:</strong> ${config.iterations.toLocaleString()}
                </div>
                <div class="config-item">
                    <strong>Concurrency:</strong> ${config.concurrency}
                </div>
                <div class="config-item">
                    <strong>GPU Enabled:</strong> ${config.gpuEnabled ? 'Yes' : 'No'}
                </div>
                <div class="config-item">
                    <strong>Federation Peers:</strong> ${config.federationPeers.toLocaleString()}
                </div>
                <div class="config-item">
                    <strong>Load Test Users:</strong> ${config.loadTestUsers.toLocaleString()}
                </div>
            </div>
        </div>

        <section class="summary-cards">
            <div class="card">
                <h3>🎯 Overall Summary</h3>
                <div class="metric">
                    <span>Total Benchmarks:</span>
                    <span class="metric-value">${results.length}</span>
                </div>
                <div class="metric">
                    <span>Total Operations:</span>
                    <span class="metric-value">${summary.totalOperations.toLocaleString()}</span>
                </div>
                <div class="metric">
                    <span>Total Errors:</span>
                    <span class="metric-value">${summary.totalErrors}</span>
                </div>
                <div class="metric">
                    <span>Success Rate:</span>
                    <span class="metric-value">${summary.successRate.toFixed(2)}%</span>
                </div>
            </div>

            <div class="card">
                <h3>⚡ Performance Metrics</h3>
                <div class="metric">
                    <span>Average Response Time:</span>
                    <span class="metric-value">${(summary.avgResponseTime).toFixed(2)}ms</span>
                </div>
                <div class="metric">
                    <span>Average Throughput:</span>
                    <span class="metric-value">${summary.avgThroughput.toFixed(0)} ops/s</span>
                </div>
                <div class="metric">
                    <span>P95 Response Time:</span>
                    <span class="metric-value">${(summary.p95ResponseTime).toFixed(2)}ms</span>
                </div>
                <div class="metric">
                    <span>P99 Response Time:</span>
                    <span class="metric-value">${(summary.p99ResponseTime).toFixed(2)}ms</span>
                </div>
            </div>

            <div class="card">
                <h3>💾 Memory Usage</h3>
                <div class="metric">
                    <span>Peak Memory:</span>
                    <span class="metric-value">${(summary.peakMemory / 1024 / 1024).toFixed(2)}MB</span>
                </div>
                <div class="metric">
                    <span>Average Memory Delta:</span>
                    <span class="metric-value">${(summary.avgMemoryDelta / 1024 / 1024).toFixed(2)}MB</span>
                </div>
                <div class="metric">
                    <span>Memory Efficiency:</span>
                    <span class="metric-value ${summary.memoryEfficiency < 0.7 ? 'performance-good' : summary.memoryEfficiency < 1.5 ? 'performance-fair' : 'performance-poor'}">${summary.memoryEfficiency.toFixed(2)}x</span>
                </div>
            </div>

            <div class="card">
                <h3>🏆 Best Performers</h3>
                ${summary.bestPerformers.slice(0, 3).map(bench => `
                <div class="metric">
                    <span>${bench.name}:</span>
                    <span class="metric-value">${bench.throughput.toFixed(0)} ops/s</span>
                </div>
                `).join('')}
            </div>
        </section>

        <div class="charts-grid">
            <div class="chart-container">
                <h3>📊 Performance by Category</h3>
                <canvas id="categoryChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>⚡ Throughput Comparison</h3>
                <canvas id="throughputChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>💾 Memory Usage Trends</h3>
                <canvas id="memoryChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>📈 Response Time Distribution</h3>
                <canvas id="responseTimeChart"></canvas>
            </div>
        </div>

        ${Object.entries(categories).map(([category, benchmarks]) =
          this.generateCategorySection(category, benchmarks))
          .join('')}

    </div>

    <footer>
        <p>SuperInstance Performance Benchmark Suite - Round 12 | Generated with ❤️ by the POLLN Team</p>
    </footer>

    <div class="tooltip" id="tooltip"></div>

    <script>
        ${this.generateChartScript(results, categories)}
    </script>
</body>
</html>
    `;
  }

  private generateSummary(results: BenchmarkResult[]): any {
    const totalOperations = results.reduce((sum, r) => sum + r.iterations, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    const successRate = ((totalOperations - totalErrors) / totalOperations) * 100;

    const responseTimes = results
      .filter(r => r.timing.avg > 0)
      .map(r => r.timing.avg);
    const avgResponseTime = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
    const p99ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.99)];

    const throughputs = results
      .filter(r => r.throughput?.opsPerSecond)
      .map(r => r.throughput!.opsPerSecond);
    const avgThroughput = throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length;

    const memories = results.map(r => r.memory);
    const peakMemory = Math.max(...memories.map(m => m.peak));
    const avgMemoryDelta = memories.reduce((sum, m) => sum + m.delta, 0) / memories.length;
    const memoryEfficiency = peakMemory / (memories.reduce((sum, m) => sum + m.before, 0) / memories.length);

    const bestPerformers = results
      .filter(r => r.throughput?.opsPerSecond)
      .sort((a, b) => (b.throughput?.opsPerSecond || 0) - (a.throughput?.opsPerSecond || 0))
      .slice(0, 5);

    return {
      totalOperations,
      totalErrors,
      successRate,
      avgResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      avgThroughput,
      peakMemory,
      avgMemoryDelta,
      memoryEfficiency,
      bestPerformers
    };
  }

  private groupByCategory(results: BenchmarkResult[]): Record<string, BenchmarkResult[]> {
    return results.reduce((acc, result) => {
      if (!acc[result.category]) {
        acc[result.category] = [];
      }
      acc[result.category].push(result);
      return acc;
    }, {} as Record<string, BenchmarkResult[]>);
  }

  private generateCategorySection(category: string, benchmarks: BenchmarkResult[]): string {
    const categoryTitle = category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return `
        <section class="category-section">
            <div class="category-header">
                <h2>${this.getCategoryIcon(category)} ${categoryTitle}</h2>
                <span class="performance-indicator performance-good">${benchmarks.length} benchmarks</span>
            </div>

            <table class="benchmark-table">
                <thead>
                    <tr>
                        <th>Benchmark</th>
                        <th>Iterations</th>
                        <th>Avg Time (ms)</th>
                        <th>P95 (ms)</th>
                        <th>P99 (ms)</th>
                        <th>Throughput (ops/s)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${benchmarks.map(bench => this.generateBenchmarkRow(bench)).join('')}
                </tbody>
            </table>
        </section>
    `;
  }

  private getCategoryIcon(category: string): string {
    const icons = {
      'instance_creation': '🏗️',
      'instance_operations': '⚙️',
      'federation': '🌐',
      'gpu': '🎮',
      'load_test': '⚡',
      'profiling': '🔍'
    };
    return icons[category] || '📊';
  }

  private generateBenchmarkRow(benchmark: BenchmarkResult): string {
    const status = this.getPerformanceStatus(benchmark);
    const performanceClass = status === 'Good' ? 'performance-good' :
                            status === 'Fair' ? 'performance-fair' : 'performance-poor';

    return `
        <tr>
            <td><strong>${benchmark.name}</strong></td>
            <td>${benchmark.iterations.toLocaleString()}</td>
            <td>${benchmark.timing.avg.toFixed(2)}</td>
            <td>${benchmark.timing.p95.toFixed(2)}</td>
            <td>${benchmark.timing.p99.toFixed(2)}</td>
            <td>${benchmark.throughput?.opsPerSecond.toFixed(0) || 'N/A'}</td>
            <td><span class="performance-indicator ${performanceClass}">${status}</span></td>
        </tr>
    `;
  }

  private getPerformanceStatus(benchmark: BenchmarkResult): string {
    if (benchmark.errors > 0) return 'Failed';

    // Simple heuristics based on timing
    if (benchmark.timing.avg < 10) return 'Good';
    if (benchmark.timing.avg < 100) return 'Fair';
    return 'Needs Attention';
  }

  private generateChartScript(results: BenchmarkResult[], categories: Record<string, BenchmarkResult[]>): string {
    return `
        // Category Performance Chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(Object.keys(categories))},
                datasets: [{
                    label: 'Average Time (ms)',
                    data: ${JSON.stringify(Object.values(categories).map(group => group.reduce((sum, r) => sum + r.timing.avg, 0) / group.length))},
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                }, {
                    label: 'P95 Time (ms)',
                    data: ${JSON.stringify(Object.values(categories).map(group => group.reduce((sum, r) => sum + r.timing.p95, 0) / group.length))},
                    backgroundColor: 'rgba(118, 75, 162, 0.8)',
                    borderColor: 'rgba(118, 75, 162, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Time (milliseconds)'
                        }
                    }
                }
            }
        });

        // Throughput Chart
        const throughputCtx = document.getElementById('throughputChart').getContext('2d');
        const throughputData = ${JSON.stringify(results.filter(r => r.throughput?.opsPerSecond).slice(0, 20).map(r => ({
          name: r.name,
          throughput: r.throughput!.opsPerSecond
        })))};

        new Chart(throughputCtx, {
            type: 'line',
            data: {
                labels: throughputData.map(d => d.name),
                datasets: [{
                    label: 'Throughput (ops/s)',
                    data: throughputData.map(d => d.throughput),
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Operations per second'
                        }
                    }
                }
            }
        });

        // Memory Chart (if we have memory data)
        const memoryCtx = document.getElementById('memoryChart').getContext('2d');
        const memoryData = ${JSON.stringify(results.map((r, i) => ({
          name: r.name,
          peak: r.memory.peak / 1024 / 1024,
          delta: r.memory.delta / 1024 / 1024
        })).slice(0, 15))};

        new Chart(memoryCtx, {
            type: 'bar',
            data: {
                labels: memoryData.map(d => d.name),
                datasets: [{
                    label: 'Peak Memory (MB)',
                    data: memoryData.map(d => d.peak),
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    yAxisID: 'y'
                }, {
                    label: 'Memory Delta (MB)',
                    data: memoryData.map(d => d.delta),
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Peak Memory (MB)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Memory Delta (MB)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });

        // Response Time Distribution
        const responseCtx = document.getElementById('responseTimeChart').getContext('2d');
        const responseTimeData = ${JSON.stringify(results.map(r => r.timing.avg))};

        new Chart(responseCtx, {
            type: 'histogram',
            data: {
                labels: ['0-10ms', '10-50ms', '50-100ms', '100-500ms', '500ms+'],
                datasets: [{
                    label: 'Benchmarks',
                    data: [
                        responseTimeData.filter(t => t < 10).length,
                        responseTimeData.filter(t => t >= 10 && t < 50).length,
                        responseTimeData.filter(t => t >= 50 && t < 100).length,
                        responseTimeData.filter(t => t >= 100 && t < 500).length,
                        responseTimeData.filter(t => t >= 500).length
                    ],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                        'rgba(255, 99, 132, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Benchmarks'
                        }
                    }
                }
            }
        });
    `;
  }
}