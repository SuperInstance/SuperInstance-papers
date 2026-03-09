/**
 * Visualization utilities for thermodynamic simulations
 *
 * Generates ASCII art charts and prepares data for plotting tools
 */

import type {
  ScalingResult,
  PhaseTransitionResult,
  ThermodynamicState,
} from './simulator.js';

// ============================================================================
// ASCII ART VISUALIZATION
// ============================================================================

export class AsciiVisualizer {
  private readonly width: number;
  private readonly height: number;

  constructor(width: number = 80, height: number = 20) {
    this.width = width;
    this.height = height;
  }

  /**
   * Create ASCII line chart
   */
  lineChart(
    data: number[],
    title: string,
    xLabel: string = 'X',
    yLabel: string = 'Y'
  ): string {
    const lines: string[] = [];

    // Title
    lines.push(title);
    lines.push('='.repeat(this.width));

    // Find min/max
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Create chart
    for (let y = this.height - 1; y >= 0; y--) {
      const value = min + (range * y) / (this.height - 1);
      const line = [this.formatLabel(value, yLabel)];

      for (let x = 0; x < this.width - 10; x++) {
        const idx = Math.floor((x / (this.width - 10)) * data.length);
        const dataValue = data[idx] || min;
        const dataY = Math.floor(((dataValue - min) / range) * (this.height - 1));

        line.push(dataY === y ? '*' : ' ');
      }

      lines.push(line.join(''));
    }

    // X-axis label
    lines.push('');
    lines.push(xLabel.padStart(this.width / 2 + xLabel.length / 2));

    // Statistics
    lines.push('');
    lines.push(`Min: ${min.toFixed(4)}`);
    lines.push(`Max: ${max.toFixed(4)}`);
    lines.push(`Avg: ${(data.reduce((a, b) => a + b, 0) / data.length).toFixed(4)}`);

    return lines.join('\n');
  }

  /**
   * Create ASCII bar chart
   */
  barChart(
    data: { label: string; value: number }[],
    title: string
  ): string {
    const lines: string[] = [];

    // Title
    lines.push(title);
    lines.push('='.repeat(this.width));

    // Find max for scaling
    const maxValue = Math.max(...data.map(d => d.value));

    // Create bars
    for (const { label, value } of data) {
      const barWidth = Math.floor((value / maxValue) * (this.width - 20));
      const bar = '█'.repeat(barWidth);
      const valueStr = value.toFixed(2);

      lines.push(`${label.padEnd(15)} ${bar} ${valueStr}`);
    }

    return lines.join('\n');
  }

  /**
   * Create ASCII heatmap
   */
  heatMap(
    data: number[][],
    title: string,
    xLabels: string[],
    yLabels: string[]
  ): string {
    const lines: string[] = [];

    // Title
    lines.push(title);
    lines.push('='.repeat(this.width));

    // Find min/max for coloring
    const flat = data.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    const range = max - min || 1;

    // Y-axis labels
    const maxLabelLen = Math.max(...yLabels.map(l => l.length));

    // Header row
    let header = ' '.repeat(maxLabelLen + 2);
    for (const xLabel of xLabels) {
      header += xLabel.padEnd(8);
    }
    lines.push(header);
    lines.push('-'.repeat(this.width));

    // Data rows
    for (let y = 0; y < data.length; y++) {
      const line = [yLabels[y].padEnd(maxLabelLen + 1)];

      for (let x = 0; x < data[y].length; x++) {
        const value = data[y][x];
        const normalized = (value - min) / range;
        const char = this.heatMapChar(normalized);
        line.push(` ${char} ${value.toFixed(2)}`);
      }

      lines.push(line.join(''));
    }

    return lines.join('\n');
  }

  /**
   * Create histogram
   */
  histogram(data: number[], bins: number = 10, title: string): string {
    const lines: string[] = [];

    // Title
    lines.push(title);
    lines.push('='.repeat(this.width));

    // Calculate bins
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins;

    const histogram = new Array(bins).fill(0);
    for (const value of data) {
      const bin = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[bin]++;
    }

    const maxCount = Math.max(...histogram);

    // Plot histogram
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = min + (i + 1) * binWidth;
      const count = histogram[i];
      const barWidth = Math.floor((count / maxCount) * (this.width - 30));

      lines.push(
        `[${binStart.toFixed(2)}, ${binEnd.toFixed(2)}) | ${'█'.repeat(barWidth)} ${count}`
      );
    }

    return lines.join('\n');
  }

  /**
   * Format Y-axis label
   */
  private formatLabel(value: number, label: string): string {
    return `${value.toFixed(2)} ${label}|`;
  }

  /**
   * Get heatmap character for normalized value
   */
  private heatMapChar(normalized: number): string {
    const chars = ' ░▒▓█';
    const idx = Math.floor(normalized * (chars.length - 1));
    return chars[Math.min(idx, chars.length - 1)];
  }
}

// ============================================================================
// DATA PREPARATION FOR EXTERNAL PLOTTING
// ============================================================================

export class PlotDataExporter {
  /**
   * Prepare scaling data for plotting
   */
  static exportScalingData(results: ScalingResult[]): string {
    const lines: string[] = [];

    // Header
    lines.push('# Scaling Law Data');
    lines.push('# Colony Size | Energy per Decision (J) | Efficiency | Decision Time (ms)');
    lines.push('#');

    // Data
    for (const r of results) {
      lines.push(
        `${r.colonySize} ${r.avgEnergyPerDecision} ${r.avgEfficiency} ${r.avgDecisionTimeMs}`
      );
    }

    // Metadata
    lines.push('');
    lines.push('# Scaling exponent: α = ' + results[0]?.scalingExponent.toFixed(4));

    return lines.join('\n');
  }

  /**
   * Prepare phase transition data for plotting
   */
  static exportPhaseTransitionData(results: PhaseTransitionResult[]): string {
    const lines: string[] = [];

    // Header
    lines.push('# Phase Transition Data');
    lines.push('# Temperature | Entropy | Decision Time (ms) | Free Energy | Phase');
    lines.push('#');

    // Data
    for (const r of results) {
      lines.push(
        `${r.temperature} ${r.entropy} ${r.decisionTime} ${r.freeEnergy} ${r.phase}`
      );
    }

    return lines.join('\n');
  }

  /**
   * Prepare time series data
   */
  static exportTimeSeries(history: ThermodynamicState[]): string {
    const lines: string[] = [];

    // Header
    lines.push('# Time Series Data');
    lines.push(
      '# Timestamp | Energy Total (J) | Input Entropy | Output Entropy | Production | Free Energy | Temperature'
    );
    lines.push('#');

    // Data
    for (const h of history) {
      lines.push(
        `${h.timestamp} ${h.energy.total} ${h.entropy.input} ${h.entropy.output} ${h.entropy.production} ${h.freeEnergy} ${h.temperature}`
      );
    }

    return lines.join('\n');
  }

  /**
   * Export as CSV
   */
  static exportCSV(data: Record<string, number | string>[]): string {
    if (data.length === 0) return '';

    const keys = Object.keys(data[0]);
    const lines: string[] = [];

    // Header
    lines.push(keys.join(','));

    // Data
    for (const row of data) {
      const values = keys.map(k => String(row[k]));
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  /**
   * Export as JSON
   */
  static exportJSON(data: unknown): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Generate Gnuplot script for scaling data
   */
  static generateGnuplotScalingScript(dataFile: string): string {
    return `
# Gnuplot script for scaling law visualization
set terminal pngcairo size 800,600 enhanced font 'Arial,12'
set output 'scaling_law.png'

set logscale x
set logscale y
set grid

set xlabel 'Colony Size (N)'
set ylabel 'Energy per Decision (J)'
set title 'Scaling Law: E(N) = E_0 * N^α'

# Fit power law
f(x) = a * x**b
fit f(x) '${dataFile}' via a,b

# Plot data and fit
plot '${dataFile}' u 1:2 w p pt 7 ps 1.5 title 'Data', \\
     f(x) w l lw 2 title sprintf('Fit: α = %.3f', b)

# Display fit parameters
print sprintf("Scaling exponent: α = %.4f", b)
print sprintf("Coefficient: E_0 = %.4f", a)
`;
  }

  /**
   * Generate Gnuplot script for phase transition
   */
  static generateGnuplotPhaseScript(dataFile: string): string {
    return `
# Gnuplot script for phase transition visualization
set terminal pngcairo size 1200,400 enhanced font 'Arial,12'
set output 'phase_transition.png'

set multiplot layout 1,3

# Plot 1: Entropy vs Temperature
set xlabel 'Temperature (T)'
set ylabel 'Entropy'
set title 'Order Parameter'
set grid
plot '${dataFile}' u 1:2 w l lw 2 title 'Entropy'

# Plot 2: Decision Time vs Temperature
set xlabel 'Temperature (T)'
set ylabel 'Decision Time (ms)'
set title 'Critical Slowing Down'
set grid
plot '${dataFile}' u 1:3 w l lw 2 title 'Decision Time'

# Plot 3: Free Energy vs Temperature
set xlabel 'Temperature (T)'
set ylabel 'Free Energy'
set title 'Free Energy Landscape'
set grid
plot '${dataFile}' u 1:4 w l lw 2 title 'Free Energy'

unset multiplot
`;
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

export async function exampleVisualization() {
  const viz = new AsciiVisualizer(80, 15);

  // Example 1: Scaling law
  const scalingData = [
    { N: 1, E: 1.0 },
    { N: 2, E: 0.8 },
    { N: 4, E: 0.6 },
    { N: 8, E: 0.5 },
    { N: 16, E: 0.4 },
    { N: 32, E: 0.3 },
    { N: 64, E: 0.25 },
    { N: 128, E: 0.2 },
  ];

  const energyValues = scalingData.map(d => d.E);
  const scalingChart = viz.lineChart(
    energyValues,
    'Energy per Decision vs Colony Size (Log-Log)',
    'log(N)',
    'E (J)'
  );

  console.log(scalingChart);
  console.log('\n');

  // Example 2: Phase transition
  const tempData = Array.from({ length: 100 }, (_, i) => {
    const temp = 0.1 + (i / 100) * 9.9;
    const entropy = 2 + temp * 0.5;
    return { temp, entropy };
  });

  const entropyValues = tempData.map(d => d.entropy);
  const phaseChart = viz.lineChart(
    entropyValues,
    'Entropy vs Temperature',
    'Temperature',
    'Entropy'
  );

  console.log(phaseChart);
  console.log('\n');

  // Example 3: Bar chart
  const efficiencyData = [
    { label: 'Info', value: 0.85 },
    { label: 'Carnot', value: 0.65 },
    { label: 'Learning', value: 0.45 },
    { label: 'Power', value: 0.35 },
  ];

  const barChart = viz.barChart(efficiencyData, 'Efficiency Metrics');
  console.log(barChart);
  console.log('\n');

  // Example 4: Histogram
  const decisionTimes = Array.from({ length: 1000 }, () =>
    Math.random() * 50 + 10
  );

  const hist = viz.histogram(decisionTimes, 20, 'Decision Time Distribution');
  console.log(hist);
}

// Export everything
export {
  AsciiVisualizer,
  PlotDataExporter,
};
