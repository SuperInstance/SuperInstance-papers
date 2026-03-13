#!/usr/bin/env python3
"""
Patch for StatisticalValidator to handle both scalar and dict results
"""

# Replace the run_with_statistics method with this improved version

def run_with_statistics(self,
                       simulation_fn,
                       metric_name: str = "metric",
                       primary_metric: str = None):
    """
    Run simulation multiple times and compute statistics.

    Handles both:
    - Scalar results (float/int): Direct statistics
    - Dictionary results: Extract primary_metric or aggregate all numeric values

    Args:
        simulation_fn: Function that returns scalar or dict
        metric_name: Name of the metric being measured
        primary_metric: For dict results, which key to use as primary metric

    Returns:
        SimulationResults with confidence intervals
    """
    results = []

    for i in range(self.num_runs):
        try:
            result = simulation_fn()
            results.append(result)
        except Exception as e:
            warnings.warn(f"Run {i+1} failed: {e}")
            continue

    if not results:
        raise RuntimeError("All simulation runs failed")

    # Handle different result types
    if isinstance(results[0], dict):
        # Dictionary results - extract primary metric or aggregate
        if primary_metric and primary_metric in results[0]:
            # Use specified primary metric
            arr = np.array([r[primary_metric] for r in results if isinstance(r.get(primary_metric), (int, float))])
            metric_name = f"{metric_name}.{primary_metric}"
        else:
            # Aggregate all numeric values
            numeric_values = []
            for r in results:
                for v in r.values():
                    if isinstance(v, (int, float)):
                        numeric_values.append(v)
            arr = np.array(numeric_values) if numeric_values else np.array([0])

        # Store full results in metadata
        all_results = results
    else:
        # Scalar results
        arr = np.array(results)
        all_results = None

    # Remove outliers if requested
    if self.remove_outliers and len(arr) > 4:
        arr = self._remove_outliers_iqr(arr)

    # Compute statistics
    mean = float(np.mean(arr)) if len(arr) > 0 else 0.0
    std = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0
    min_val = float(np.min(arr)) if len(arr) > 0 else 0.0
    max_val = float(np.max(arr)) if len(arr) > 0 else 0.0

    # Confidence interval
    if len(arr) > 1 and SCIPY_AVAILABLE:
        try:
            ci = stats.t.interval(
                self.confidence_level,
                df=len(arr) - 1,
                loc=mean,
                scale=std / np.sqrt(len(arr))
            )
        except Exception:
            # Fallback if stats computation fails
            margin = 1.96 * std / np.sqrt(len(arr)) if len(arr) > 1 else 0.0
            ci = (mean - margin, mean + margin)
    else:
        # Fallback: simple estimate
        margin = 1.96 * std / np.sqrt(len(arr)) if len(arr) > 1 else 0.0
        ci = (mean - margin, mean + margin)

    # Percentiles
    percentiles = {}
    if len(arr) > 0:
        try:
            percentiles = {
                "p5": float(np.percentile(arr, 5)),
                "p25": float(np.percentile(arr, 25)),
                "p50": float(np.percentile(arr, 50)),
                "p75": float(np.percentile(arr, 75)),
                "p95": float(np.percentile(arr, 95))
            }
        except Exception:
            pass

    metadata = {
        "num_runs": self.num_runs,
        "outliers_removed": self.remove_outliers,
        "result_type": "dict" if isinstance(results[0], dict) else "scalar"
    }

    if all_results:
        metadata["all_runs"] = all_results

    return SimulationResults(
        metric_name=metric_name,
        mean=mean,
        std=std,
        min=min_val,
        max=max_val,
        confidence_interval_95=ci,
        sample_size=len(arr),
        percentiles=percentiles,
        metadata=metadata
    )
