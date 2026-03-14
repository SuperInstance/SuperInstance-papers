# Benchmark Visualization Tools

**Date:** 2026-03-13
**Suite:** Production Benchmark Suite v1.0.0
**Purpose:** Comprehensive visualization and reporting for benchmark results

---

## Overview

This document describes visualization tools for benchmark results, including interactive dashboards, static plots, and automated report generation.

---

## Visualization Categories

### 1. Performance Charts

#### 1.1 Latency Comparison Charts

**Purpose:** Compare latency across different configurations

**Code:**

```python
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd

def plot_latency_comparison(results: List[Dict], output_path: str):
    """Create latency comparison bar chart."""

    # Prepare data
    df = pd.DataFrame([
        {
            "Benchmark": r["benchmark"],
            "Latency (ms)": r["metrics"]["performance"]["latency_ms"],
            "Category": r["category"]
        }
        for r in results
    ])

    # Create plot
    fig, ax = plt.subplots(figsize=(12, 6))

    # Group by category
    categories = df["Category"].unique()
    x_pos = 0
    x_labels = []
    heights = []

    for category in categories:
        category_data = df[df["Category"] == category]
        for _, row in category_data.iterrows():
            heights.append(row["Latency (ms)"])
            x_labels.append(f"{row['Benchmark']}\n({category})")
            x_pos += 1

    # Plot bars
    bars = ax.bar(range(len(heights)), heights, color='steelblue')

    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
               f'{height:.2f}',
               ha='center', va='bottom', fontsize=8)

    ax.set_xticks(range(len(x_labels)))
    ax.set_xticklabels(x_labels, rotation=45, ha='right')
    ax.set_ylabel('Latency (ms)')
    ax.set_title('Benchmark Latency Comparison')

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Latency comparison chart saved to {output_path}")
```

**Output:** `benchmark_results/latency_comparison.png`

---

#### 1.2 Throughput Scatter Plot

**Purpose:** Visualize throughput vs latency trade-off

**Code:**

```python
def plot_throughput_vs_latency(results: List[Dict], output_path: str):
    """Create throughput vs latency scatter plot."""

    # Prepare data
    data = []
    for r in results:
        metrics = r["metrics"]
        data.append({
            "Benchmark": r["benchmark"],
            "Latency (ms)": metrics["performance"]["latency_ms"],
            "Throughput (ops/s)": metrics["performance"]["throughput_ops_per_sec"],
            "Category": r["category"]
        })

    df = pd.DataFrame(data)

    # Create plot
    fig, ax = plt.subplots(figsize=(10, 8))

    # Color by category
    categories = df["Category"].unique()
    colors = plt.cm.tab10(range(len(categories)))
    color_map = dict(zip(categories, colors))

    # Plot each category
    for category in categories:
        category_data = df[df["Category"] == category]
        ax.scatter(
            category_data["Latency (ms)"],
            category_data["Throughput (ops/s)"],
            c=[color_map[category]],
            label=category,
            s=100,
            alpha=0.7
        )

        # Add labels
        for _, row in category_data.iterrows():
            ax.annotate(
                row["Benchmark"],
                (row["Latency (ms)"], row["Throughput (ops/s)"]),
                xytext=(5, 5),
                textcoords='offset points',
                fontsize=7
            )

    ax.set_xlabel('Latency (ms)')
    ax.set_ylabel('Throughput (ops/s)')
    ax.set_title('Throughput vs Latency Trade-off')
    ax.legend()
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Throughput vs latency plot saved to {output_path}")
```

**Output:** `benchmark_results/throughput_vs_latency.png`

---

#### 1.3 Scaling Curves

**Purpose:** Show how performance scales with configuration

**Code:**

```python
def plot_scaling_curves(scaling_data: Dict[str, List[Tuple]], output_path: str):
    """Create scaling curves plot."""

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Latency scaling
    ax1 = axes[0]
    for benchmark, points in scaling_data.items():
        x_values = [p[0] for p in points]  # e.g., batch sizes or agent counts
        y_values = [p[1] for p in points]  # latencies
        ax1.plot(x_values, y_values, marker='o', label=benchmark)

    ax1.set_xlabel('Configuration Size')
    ax1.set_ylabel('Latency (ms)')
    ax1.set_title('Latency Scaling')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.set_xscale('log')
    ax1.set_yscale('log')

    # Throughput scaling
    ax2 = axes[1]
    for benchmark, points in scaling_data.items():
        x_values = [p[0] for p in points]
        y_values = [p[2] for p in points]  # throughputs
        ax2.plot(x_values, y_values, marker='o', label=benchmark)

    ax2.set_xlabel('Configuration Size')
    ax2.set_ylabel('Throughput (ops/s)')
    ax2.set_title('Throughput Scaling')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    ax2.set_xscale('log')

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Scaling curves saved to {output_path}")
```

**Output:** `benchmark_results/scaling_curves.png`

---

### 2. Resource Utilization Charts

#### 2.1 Memory Usage Comparison

**Code:**

```python
def plot_memory_usage(results: List[Dict], output_path: str):
    """Create memory usage comparison chart."""

    df = pd.DataFrame([
        {
            "Benchmark": r["benchmark"],
            "Memory (MB)": r["metrics"]["resources"]["memory_mb"],
            "Category": r["category"]
        }
        for r in results
        if "resources" in r["metrics"] and "memory_mb" in r["metrics"]["resources"]
    ])

    # Sort by memory usage
    df = df.sort_values("Memory (MB)")

    # Create horizontal bar chart
    fig, ax = plt.subplots(figsize=(10, 8))

    colors = ['#2ecc71' if m < 500 else '#f39c12' if m < 1000 else '#e74c3c'
             for m in df["Memory (MB)"]]

    ax.barh(df["Benchmark"], df["Memory (MB)"], color=colors)

    # Add value labels
    for i, v in enumerate(df["Memory (MB)"]):
        ax.text(v + 50, i, f'{v:.0f} MB', va='center')

    ax.set_xlabel('Memory Usage (MB)')
    ax.set_title('Memory Usage by Benchmark')

    # Add legend
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor='#2ecc71', label='< 500 MB'),
        Patch(facecolor='#f39c12', label='500-1000 MB'),
        Patch(facecolor='#e74c3c', label='> 1000 MB')
    ]
    ax.legend(handles=legend_elements, loc='lower right')

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Memory usage chart saved to {output_path}")
```

**Output:** `benchmark_results/memory_usage.png`

---

#### 2.2 GPU Utilization Heatmap

**Code:**

```python
def plot_gpu_utilization_heatmap(results: List[Dict], output_path: str):
    """Create GPU utilization heatmap."""

    # Prepare data matrix
    benchmarks = []
    models = []

    for r in results:
        if "model" in r["metrics"]["metadata"]:
            benchmark = r["benchmark"]
            model = r["metrics"]["metadata"]["model"]
            util = r["metrics"]["resources"].get("gpu_utilization_pct", 0)

            if benchmark not in benchmarks:
                benchmarks.append(benchmark)
            if model not in models:
                models.append(model)

    # Create matrix
    matrix = np.zeros((len(benchmarks), len(models)))
    for r in results:
        if "model" in r["metrics"]["metadata"]:
            i = benchmarks.index(r["benchmark"])
            j = models.index(r["metrics"]["metadata"]["model"])
            matrix[i, j] = r["metrics"]["resources"].get("gpu_utilization_pct", 0)

    # Create heatmap
    fig, ax = plt.subplots(figsize=(12, 8))

    im = ax.imshow(matrix, cmap='RdYlGn', aspect='auto', vmin=0, vmax=100)

    # Set ticks
    ax.set_xticks(np.arange(len(models)))
    ax.set_yticks(np.arange(len(benchmarks)))
    ax.set_xticklabels(models)
    ax.set_yticklabels(benchmarks)

    # Rotate x-axis labels
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right")

    # Add colorbar
    cbar = ax.figure.colorbar(im, ax=ax)
    cbar.set_label('GPU Utilization (%)')

    # Add text annotations
    for i in range(len(benchmarks)):
        for j in range(len(models)):
            text = ax.text(j, i, f'{matrix[i, j]:.0f}%',
                          ha="center", va="center", color="black", fontsize=8)

    ax.set_title('GPU Utilization by Benchmark and Model')
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"GPU utilization heatmap saved to {output_path}")
```

**Output:** `benchmark_results/gpu_utilization_heatmap.png`

---

#### 2.3 Resource Stacked Bar Chart

**Code:**

```python
def plot_resource_breakdown(results: List[Dict], output_path: str):
    """Create resource breakdown stacked bar chart."""

    # Prepare data
    benchmarks = []
    weights_mb = []
    activations_mb = []
    optimizer_mb = []

    for r in results:
        if r["category"] == "ai_workload":
            benchmarks.append(r["benchmark"])
            metrics = r["metrics"]["resources"]

            # Estimate breakdown (if not directly available)
            total_mb = metrics["memory_mb"]
            weights_mb.append(total_mb * 0.2)  # Model weights
            activations_mb.append(total_mb * 0.5)  # Activations
            optimizer_mb.append(total_mb * 0.3)  # Optimizer states

    # Create stacked bar chart
    fig, ax = plt.subplots(figsize=(12, 6))

    x = np.arange(len(benchmarks))
    width = 0.6

    ax.bar(x, weights_mb, width, label='Model Weights', color='#3498db')
    ax.bar(x, activations_mb, width, bottom=weights_mb,
          label='Activations', color='#2ecc71')
    ax.bar(x, optimizer_mb, width,
          bottom=[w + a for w, a in zip(weights_mb, activations_mb)],
          label='Optimizer States', color='#e74c3c')

    ax.set_xlabel('Benchmark')
    ax.set_ylabel('Memory (MB)')
    ax.set_title('Memory Breakdown by Component')
    ax.set_xticks(x)
    ax.set_xticklabels(benchmarks, rotation=45, ha='right')
    ax.legend()

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Resource breakdown chart saved to {output_path}")
```

**Output:** `benchmark_results/resource_breakdown.png`

---

### 3. Statistical Charts

#### 3.1 Confidence Interval Plot

**Code:**

```python
def plot_confidence_intervals(statistical_results: Dict, output_path: str):
    """Create confidence interval plot."""

    benchmarks = list(statistical_results.keys())

    fig, ax = plt.subplots(figsize=(12, 6))

    # Latency confidence intervals
    for i, benchmark in enumerate(benchmarks):
        result = statistical_results[benchmark]
        latency = result["latency"]

        mean = latency["mean"]
        ci_lower, ci_upper = latency["confidence_interval"]

        # Plot mean
        ax.scatter([mean], [i], color='steelblue', s=100, zorder=3)

        # Plot confidence interval
        ax.plot([ci_lower, ci_upper], [i, i], color='steelblue',
               linewidth=3, solid_capstyle='round', zorder=2)

        # Plot caps
        ax.plot([ci_lower, ci_lower], [i-0.2, i+0.2], color='steelblue',
               linewidth=3, zorder=2)
        ax.plot([ci_upper, ci_upper], [i-0.2, i+0.2], color='steelblue',
               linewidth=3, zorder=2)

        # Add mean label
        ax.text(mean, i+0.3, f'{mean:.2f} ms', ha='center', fontsize=8)

    ax.set_yticks(range(len(benchmarks)))
    ax.set_yticklabels(benchmarks)
    ax.set_xlabel('Latency (ms)')
    ax.set_title('Latency with 95% Confidence Intervals')
    ax.grid(True, axis='x', alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Confidence interval plot saved to {output_path}")
```

**Output:** `benchmark_results/confidence_intervals.png`

---

#### 3.2 Distribution Comparison

**Code:**

```python
def plot_distribution_comparison(baseline_samples: List[float],
                                current_samples: List[float],
                                benchmark_name: str,
                                output_path: str):
    """Create distribution comparison plot."""

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Histogram
    ax1 = axes[0]
    ax1.hist(baseline_samples, bins=30, alpha=0.5, label='Baseline', color='blue')
    ax1.hist(current_samples, bins=30, alpha=0.5, label='Current', color='red')
    ax1.set_xlabel('Latency (ms)')
    ax1.set_ylabel('Frequency')
    ax1.set_title(f'{benchmark_name}: Distribution Comparison')
    ax1.legend()

    # Box plot
    ax2 = axes[1]
    data = [baseline_samples, current_samples]
    bp = ax2.boxplot(data, labels=['Baseline', 'Current'], patch_artist=True)

    # Color boxes
    bp['boxes'][0].set_facecolor('blue')
    bp['boxes'][1].set_facecolor('red')

    ax2.set_ylabel('Latency (ms)')
    ax2.set_title(f'{benchmark_name}: Box Plot Comparison')

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Distribution comparison saved to {output_path}")
```

**Output:** `benchmark_results/distribution_comparison.png`

---

### 4. Trend Analysis Charts

#### 4.1 Performance Over Time

**Code:**

```python
def plot_performance_trend(historical_data: List[Dict], output_path: str):
    """Create performance trend over time."""

    # Prepare data
    timestamps = []
    latencies = []
    commit_hashes = []

    for entry in historical_data:
        timestamps.append(entry["timestamp"])
        latencies.append(entry["latency_ms"])
        commit_hashes.append(entry["commit"][:8])

    # Create plot
    fig, ax = plt.subplots(figsize=(14, 6))

    # Plot line
    ax.plot(timestamps, latencies, marker='o', linewidth=2, color='steelblue')

    # Add baseline reference line
    if len(latencies) > 0:
        baseline = np.mean(latencies[:10])  # First 10 as baseline
        ax.axhline(y=baseline, color='green', linestyle='--',
                  label=f'Baseline: {baseline:.2f} ms')

        # Add regression bands
        warning_threshold = baseline * 1.05
        critical_threshold = baseline * 1.10

        ax.axhline(y=warning_threshold, color='orange', linestyle=':',
                  label=f'Warning: +5%')
        ax.axhline(y=critical_threshold, color='red', linestyle=':',
                  label=f'Critical: +10%')

    # Annotate commits
    for i, (ts, latency, commit) in enumerate(zip(timestamps, latencies, commit_hashes)):
        if i % 5 == 0:  # Annotate every 5th point to avoid clutter
            ax.annotate(commit, (ts, latency), xytext=(5, 5),
                       textcoords='offset points', fontsize=7)

    ax.set_xlabel('Timestamp')
    ax.set_ylabel('Latency (ms)')
    ax.set_title('Performance Trend Over Time')
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.xticks(rotation=45)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Performance trend saved to {output_path}")
```

**Output:** `benchmark_results/performance_trend.png`

---

#### 4.2 Commit Correlation

**Code:**

```python
def plot_commit_correlation(commit_data: List[Dict], output_path: str):
    """Create commit-performance correlation plot."""

    # Prepare data
    code_churn = []  # Lines added + deleted
    latency_change = []  # % change in latency

    for entry in commit_data:
        code_churn.append(entry["lines_added"] + entry["lines_deleted"])
        latency_change.append(entry["latency_change_pct"])

    # Create scatter plot
    fig, ax = plt.subplots(figsize=(10, 8))

    # Color by regression/improvement
    colors = ['#e74c3c' if x > 0 else '#2ecc71' for x in latency_change]

    ax.scatter(code_churn, latency_change, c=colors, s=100, alpha=0.7)

    # Add reference line
    ax.axhline(y=0, color='black', linestyle='-', linewidth=1)

    # Add trend line
    if len(code_churn) > 1:
        z = np.polyfit(code_churn, latency_change, 1)
        p = np.poly1d(z)
        x_trend = np.linspace(min(code_churn), max(code_churn), 100)
        ax.plot(x_trend, p(x_trend), "r--", alpha=0.8, linewidth=2,
               label=f'Trend: y={z[0]:.2e}x+{z[1]:.2f}')

    # Add quadrant labels
    ax.text(0.95, 0.95, 'Improvement', transform=ax.transAxes,
           ha='right', va='top', fontsize=10, color='#2ecc71')
    ax.text(0.95, 0.05, 'Regression', transform=ax.transAxes,
           ha='right', va='bottom', fontsize=10, color='#e74c3c')

    ax.set_xlabel('Code Churn (lines)')
    ax.set_ylabel('Latency Change (%)')
    ax.set_title('Code Churn vs Performance Impact')
    ax.legend()
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Commit correlation plot saved to {output_path}")
```

**Output:** `benchmark_results/commit_correlation.png`

---

### 5. Interactive Dashboards

#### 5.1 Plotly Dashboard

**Code:**

```python
import plotly.graph_objects as go
from plotly.subplots import make_subplots

def create_interactive_dashboard(results: List[Dict], output_path: str):
    """Create interactive Plotly dashboard."""

    # Prepare data
    df = pd.DataFrame([
        {
            "Benchmark": r["benchmark"],
            "Category": r["category"],
            "Latency": r["metrics"]["performance"]["latency_ms"],
            "Throughput": r["metrics"]["performance"]["throughput_ops_per_sec"],
            "Memory": r["metrics"]["resources"]["memory_mb"],
            "GPU Util": r["metrics"]["resources"].get("gpu_utilization_pct", 0)
        }
        for r in results
    ])

    # Create subplots
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=('Latency by Benchmark', 'Throughput vs Latency',
                       'Memory Usage', 'GPU Utilization'),
        specs=[[{"type": "bar"}, {"type": "scatter"}],
               [{"type": "bar"}, {"type": "bar"}]]
    )

    # Latency bar chart
    fig.add_trace(
        go.Bar(x=df["Benchmark"], y=df["Latency"], name="Latency"),
        row=1, col=1
    )

    # Throughput vs Latency scatter
    fig.add_trace(
        go.Scatter(x=df["Latency"], y=df["Throughput"],
                  mode='markers+text',
                  text=df["Benchmark"],
                  textposition='top center',
                  name="Benchmark"),
        row=1, col=2
    )

    # Memory usage bar chart
    fig.add_trace(
        go.Bar(x=df["Benchmark"], y=df["Memory"], name="Memory"),
        row=2, col=1
    )

    # GPU utilization bar chart
    fig.add_trace(
        go.Bar(x=df["Benchmark"], y=df["GPU Util"], name="GPU Util"),
        row=2, col=2
    )

    # Update layout
    fig.update_xaxes(tickangle=45)
    fig.update_layout(
        height=800,
        showlegend=False,
        title_text="SuperInstance Benchmark Dashboard",
        title_font_size=20
    )

    # Save as HTML
    fig.write_html(output_path)
    print(f"Interactive dashboard saved to {output_path}")
```

**Output:** `benchmark_results/dashboard.html`

---

#### 5.2 Streamlit Dashboard

**Code:**

```python
import streamlit as st

def create_streamlit_dashboard():
    """Create Streamlit dashboard for benchmark results."""

    st.title("SuperInstance Benchmark Dashboard")

    # Load results
    results_file = st.file_uploader("Upload benchmark results JSON", type=["json"])

    if results_file:
        results = json.load(results_file)

        # Summary metrics
        st.header("Summary")
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric("Total Benchmarks", len(results))

        with col2:
            avg_latency = np.mean([r["metrics"]["performance"]["latency_ms"]
                                  for r in results])
            st.metric("Avg Latency", f"{avg_latency:.2f} ms")

        with col3:
            avg_throughput = np.mean([r["metrics"]["performance"]["throughput_ops_per_sec"]
                                     for r in results])
            st.metric("Avg Throughput", f"{avg_throughput:.0f} ops/s")

        with col4:
            total_memory = sum([r["metrics"]["resources"]["memory_mb"]
                              for r in results])
            st.metric("Total Memory", f"{total_memory:.0f} MB")

        # Interactive plots
        st.header("Performance Charts")

        # Category filter
        categories = ["All"] + list(set([r["category"] for r in results]))
        selected_category = st.selectbox("Filter by Category", categories)

        filtered_results = results if selected_category == "All" else \
                          [r for r in results if r["category"] == selected_category]

        # Plotting
        plot_data = {
            "benchmarks": [r["benchmark"] for r in filtered_results],
            "latencies": [r["metrics"]["performance"]["latency_ms"] for r in filtered_results],
            "throughputs": [r["metrics"]["performance"]["throughput_ops_per_sec"]
                          for r in filtered_results]
        }

        st.subheader("Latency Comparison")
        st.bar_chart(plot_data, x="benchmarks", y="latencies")

        st.subheader("Throughput Comparison")
        st.bar_chart(plot_data, x="benchmarks", y="throughputs")

if __name__ == "__main__":
    create_streamlit_dashboard()
```

**Run:** `streamlit run benchmark_dashboard.py`

---

### 6. Automated Report Generation

#### 6.1 PDF Report

**Code:**

```python
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors

def generate_pdf_report(results: List[Dict], output_path: str):
    """Generate comprehensive PDF report."""

    doc = SimpleDocTemplate(output_path, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2C3E50'),
        spaceAfter=30
    )
    story.append(Paragraph("SuperInstance Benchmark Report", title_style))
    story.append(Spacer(1, 12))

    # Summary
    story.append(Paragraph("Executive Summary", styles['Heading2']))

    summary_data = [
        ["Total Benchmarks", str(len(results))],
        ["Avg Latency", f"{np.mean([r['metrics']['performance']['latency_ms'] for r in results]):.2f} ms"],
        ["Avg Throughput", f"{np.mean([r['metrics']['performance']['throughput_ops_per_sec'] for r in results]):.0f} ops/s"],
        ["Total Memory", f"{sum([r['metrics']['resources']['memory_mb'] for r in results]):.0f} MB"]
    ]

    summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
    summary_table.setStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ])

    story.append(summary_table)
    story.append(Spacer(1, 12))

    # Charts
    story.append(Paragraph("Performance Charts", styles['Heading2']))

    # Add images (assuming they've been generated)
    chart_paths = [
        "benchmark_results/latency_comparison.png",
        "benchmark_results/throughput_vs_latency.png",
        "benchmark_results/memory_usage.png"
    ]

    for chart_path in chart_paths:
        if os.path.exists(chart_path):
            story.append(Image(chart_path, width=6*inch, height=3*inch))
            story.append(Spacer(1, 12))

    # Detailed results table
    story.append(Paragraph("Detailed Results", styles['Heading2']))

    table_data = [["Benchmark", "Category", "Latency (ms)", "Throughput (ops/s)", "Memory (MB)"]]
    for r in results:
        table_data.append([
            r["benchmark"],
            r["category"],
            f"{r['metrics']['performance']['latency_ms']:.2f}",
            f"{r['metrics']['performance']['throughput_ops_per_sec']:.0f}",
            f"{r['metrics']['resources']['memory_mb']:.0f}"
        ])

    results_table = Table(table_data, colWidths=[1.5*inch, 1*inch, 1*inch, 1.2*inch, 1*inch])
    results_table.setStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2C3E50')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ])

    story.append(results_table)

    # Build PDF
    doc.build(story)
    print(f"PDF report generated: {output_path}")
```

**Output:** `benchmark_results/report.pdf`

---

#### 6.2 HTML Report

**Code:**

```python
def generate_html_report(results: List[Dict], output_path: str):
    """Generate HTML report with embedded charts."""

    html_template = """
<!DOCTYPE html>
<html>
<head>
    <title>SuperInstance Benchmark Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        h1 {{ color: #2C3E50; }}
        h2 {{ color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
        .summary {{ display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }}
        .metric {{ background: #ecf0f1; padding: 15px; border-radius: 5px; flex: 1; min-width: 200px; }}
        .metric-value {{ font-size: 24px; font-weight: bold; color: #2C3E50; }}
        .metric-label {{ font-size: 14px; color: #7f8c8d; }}
        table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
        th {{ background: #3498db; color: white; padding: 12px; text-align: left; }}
        td {{ border: 1px solid #ddd; padding: 8px; }}
        tr:nth-child(even) {{ background: #f2f2f2; }}
        .chart {{ margin: 20px 0; }}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <h1>SuperInstance Benchmark Report</h1>
    <p>Generated: {timestamp}</p>

    <h2>Summary</h2>
    <div class="summary">
        <div class="metric">
            <div class="metric-value">{total_benchmarks}</div>
            <div class="metric-label">Total Benchmarks</div>
        </div>
        <div class="metric">
            <div class="metric-value">{avg_latency:.2f} ms</div>
            <div class="metric-label">Average Latency</div>
        </div>
        <div class="metric">
            <div class="metric-value">{avg_throughput:.0f} ops/s</div>
            <div class="metric-label">Average Throughput</div>
        </div>
        <div class="metric">
            <div class="metric-value">{total_memory:.0f} MB</div>
            <div class="metric-label">Total Memory</div>
        </div>
    </div>

    <h2>Latency Chart</h2>
    <div class="chart">
        <canvas id="latencyChart"></canvas>
    </div>

    <h2>Detailed Results</h2>
    <table>
        <tr>
            <th>Benchmark</th>
            <th>Category</th>
            <th>Latency (ms)</th>
            <th>Throughput (ops/s)</th>
            <th>Memory (MB)</th>
        </tr>
        {table_rows}
    </table>

    <script>
        // Latency chart
        const ctx = document.getElementById('latencyChart').getContext('2d');
        new Chart(ctx, {{
            type: 'bar',
            data: {{
                labels: {chart_labels},
                datasets: [{{
                    label: 'Latency (ms)',
                    data: {chart_data},
                    backgroundColor: 'rgba(52, 152, 219, 0.8)'
                }}]
            }},
            options: {{
                responsive: true,
                scales: {{
                    y: {{
                        beginAtZero: true
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>
"""

    # Prepare data
    total_benchmarks = len(results)
    avg_latency = np.mean([r["metrics"]["performance"]["latency_ms"] for r in results])
    avg_throughput = np.mean([r["metrics"]["performance"]["throughput_ops_per_sec"] for r in results])
    total_memory = sum([r["metrics"]["resources"]["memory_mb"] for r in results])

    chart_labels = json.dumps([r["benchmark"] for r in results])
    chart_data = json.dumps([r["metrics"]["performance"]["latency_ms"] for r in results])

    table_rows = ""
    for r in results:
        table_rows += f"""
        <tr>
            <td>{r["benchmark"]}</td>
            <td>{r["category"]}</td>
            <td>{r["metrics"]["performance"]["latency_ms"]:.2f}</td>
            <td>{r["metrics"]["performance"]["throughput_ops_per_sec"]:.0f}</td>
            <td>{r["metrics"]["resources"]["memory_mb"]:.0f}</td>
        </tr>"""

    # Fill template
    html_content = html_template.format(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        total_benchmarks=total_benchmarks,
        avg_latency=avg_latency,
        avg_throughput=avg_throughput,
        total_memory=total_memory,
        chart_labels=chart_labels,
        chart_data=chart_data,
        table_rows=table_rows
    )

    # Write file
    with open(output_path, 'w') as f:
        f.write(html_content)

    print(f"HTML report generated: {output_path}")
```

**Output:** `benchmark_results/report.html`

---

## Usage Examples

### Generate All Reports

```python
from production_benchmark_suite import ProductionBenchmarkSuite
from visualization import *

# Run benchmarks
suite = ProductionBenchmarkSuite()
results = suite.run_all_benchmarks()

# Generate all visualizations
output_dir = Path("benchmark_results")
output_dir.mkdir(exist_ok=True)

# Static charts
plot_latency_comparison(suite.results, output_dir / "latency_comparison.png")
plot_throughput_vs_latency(suite.results, output_dir / "throughput_vs_latency.png")
plot_memory_usage(suite.results, output_dir / "memory_usage.png")

# Interactive dashboard
create_interactive_dashboard(suite.results, output_dir / "dashboard.html")

# Reports
generate_pdf_report(suite.results, output_dir / "report.pdf")
generate_html_report(suite.results, output_dir / "report.html")

# Markdown report
suite.generate_report(output_dir)
```

---

**Document Version:** 1.0.0
**Last Updated:** 2026-03-13
**Maintainer:** SuperInstance Research Team

---

*"A picture is worth a thousand benchmarks"*
