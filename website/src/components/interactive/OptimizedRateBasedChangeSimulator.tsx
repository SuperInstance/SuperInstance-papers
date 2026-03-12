import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

// Register Chart.js components for this specific chart only
const chartComponents = [
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
];

interface DataPoint {
  t: number;
  x: number;
  r: number;
}

interface RateFunction {
  name: string;
  formula: string;
  description: string;
  f: (t: number) => number;
  baseline: number;
}

// Memoized rate functions to prevent recreation
const useRateFunctions = (rateConstant: number, exponent: number) => {
  return useMemo(() => ({
    constant: {
      name: 'Constant Rate',
      formula: 'r(t) = k',
      description: 'Flat rate that doesn\'t change over time',
      f: (t: number) => 2,
      baseline: 2
    },
    linear: {
      name: 'Linear Growth',
      formula: 'r(t) = r₀ + kt',
      description: 'Rate increases linearly over time',
      f: (t: number) => rateConstant * t,
      baseline: rateConstant
    },
    quadratic: {
      name: 'Quadratic Growth',
      formula: 'r(t) = rt²',
      description: 'Accelerating growth - exponential-like',
      f: (t: number) => rateConstant * Math.pow(t, exponent - 1),
      baseline: rateConstant
    },
    exponential: {
      name: 'Exponential',
      formula: 'r(t) = eᵏᵗ',
      description: 'Compound growth - very fast acceleration',
      f: (t: number) => rateConstant * Math.exp(t * 0.1),
      baseline: rateConstant
    },
    sinusoidal: {
      name: 'Sinusoidal',
      formula: 'r(t) = sin(t)',
      description: 'Oscillating rate - periodic ups and downs',
      f: (t: number) => Math.sin(t * 0.2) * rateConstant,
      baseline: 0
    },
    square: {
      name: 'Square Wave',
      formula: 'r(t) = sign(sin(t))',
      description: 'Alternating positive/negative rates',
      f: (t: number) => Math.sign(Math.sin(t * 0.3)) * rateConstant,
      baseline: rateConstant
    }
  }), [rateConstant, exponent]);
};

export function OptimizedRateBasedChangeSimulator() {
  const [rateFunction, setRateFunction] = useState<string>('linear');
  const [initialValue, setInitialValue] = useState(100);
  const [rateConstant, setRateConstant] = useState(2);
  const [exponent, setExponent] = useState(2);
  const [timeSteps, setTimeSteps] = useState(50);
  const [showErrorBound, setShowErrorBound] = useState(true);
  const [predictionHorizon, setPredictionHorizon] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(200);

  const rateFunctions = useRateFunctions(rateConstant, exponent);
  const selectedFunc = rateFunctions[rateFunction];

  // Generate data using rate-based change mechanics - memoized for performance
  const { actualPoints, predictedPoints, errorBound } = useMemo(() => {
    const history: DataPoint[] = [];
    const predictions: { x: number; min: number; max: number }[] = [];
    let x = initialValue;

    // Historical data generation
    for (let t = 0; t <= timeSteps; t++) {
      const r = selectedFunc.f(t);
      x += r * (t === 0 ? 0 : 1); // Simple Euler integration
      history.push({ t, x, r });

      // Generate predictions from midpoint with uncertainty analysis
      if (t >= timeSteps / 2) {
        const recentRates = history.slice(-10).map(p => p.r);
        const avgRate = recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
        const rateVariance = recentRates.reduce((sum, r) => sum + Math.pow(r - avgRate, 2), 0) / recentRates.length;
        const uncertainty = Math.sqrt(rateVariance) * 2;

        for (let p = 1; p <= predictionHorizon; p++) {
          const predictedX = x + avgRate * p;
          const minX = predictedX - uncertainty * p;
          const maxX = predictedX + uncertainty * p;
          predictions.push({
            x: t + p,
            min: Math.max(0, minX),
            max: maxX
          });
        }
      }
    }

    // Calculate error bounds based on rate variance
    const errorBounds = history.map((point, i) => {
      if (i <= timeSteps / 2) return { up: point.x, down: point.x };

      const recentVariance = history
        .slice(Math.max(0, i - 5), i)
        .map(p => Math.pow(p.r - selectedFunc.baseline, 2))
        .reduce((a, b) => a + b, 0) / 5;

      const error = Math.sqrt(recentVariance) * (i - timeSteps / 2) * 0.5;
      return {
        up: point.x + error,
        down: Math.max(0, point.x - error)
      };
    });

    return {
      actualPoints: history,
      predictedPoints: predictions,
      errorBound: errorBounds
    };
  }, [timeSteps, initialValue, selectedFunc, predictionHorizon]);

  // Efficient animation loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= timeSteps) {
          setIsRunning(false);
          return timeSteps;
        }
        return prev + 1;
      });
    }, animationSpeed);

    return () => clearInterval(interval);
  }, [isRunning, timeSteps, animationSpeed]);

  // Memoized chart data to prevent unnecessary recalculations
  const chartData: ChartData<'line'> = useMemo(() => {
    const data: ChartData<'line'> = {
      labels: Array.from({ length: Math.max(timeSteps, timeSteps + predictionHorizon) }, (_, i) => i),
      datasets: [
        {
          label: 'Actual Value',
          data: actualPoints.map(p => p.x),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          pointRadius: (ctx: any) => ctx.dataIndex === currentTime ? 6 : 2, // Lower point radius for performance
          pointBackgroundColor: (ctx: any) => ctx.dataIndex === currentTime ? 'rgb(219, 234, 254)' : 'rgb(59, 130, 246)',
          borderWidth: 2,
          fill: false
        }
      ]
    };

    // Only add error bounds if shown
    if (showErrorBound) {
      data.datasets.push(
        {
          label: 'Error Bounds',
          data: errorBound.map(e => e.up),
          borderColor: 'rgba(156, 163, 175, 0.5)',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderWidth: 1,
          fill: 2,
          pointRadius: 0
        },
        {
          label: '',
          data: errorBound.map(e => e.down),
          borderColor: 'rgba(156, 163, 175, 0.5)',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderWidth: 1,
          fill: false,
          pointRadius: 0
        }
      );
    }

    // Only add predictions if we have them
    if (predictedPoints.length > 0) {
      data.datasets.push(
        {
          label: 'Predictions',
          data: [
            ...Array(Math.floor(timeSteps / 2)).fill(null),
            ...predictedPoints.map(p => p.min)
          ],
          borderColor: 'rgba(245, 158, 11, 0.8)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 1,
          borderDash: [5, 5],
          pointStyle: 'circle',
          pointRadius: 3,
          fill: showErrorBound ? data.datasets.length : false
        },
        {
          label: '',
          data: [
            ...Array(Math.floor(timeSteps / 2)).fill(null),
            ...predictedPoints.map(p => p.max)
          ],
          borderColor: 'rgba(245, 158, 11, 0.8)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 1,
          borderDash: [5, 5],
          pointStyle: 'circle',
          pointRadius: 3,
          fill: false
        }
      );
    }

    return data;
  }, [actualPoints, errorBound, predictedPoints, timeSteps, predictionHorizon, showErrorBound, currentTime]);

  // Optimized chart options
  const chartOptions: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      title: {
        display: true,
        text: `Rate-Based Change: ${selectedFunc.name}`,
        font: { size: 14 }
      },
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          filter: (legendItem: any) => legendItem.text !== '' // Filter out empty labels
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        padding: 8,
        callbacks: {
          label: function(context: any) {
            if (context.datasetIndex === 1 || context.datasetIndex === 2) {
              return 'Error Bound';
            }
            if (context.datasetIndex === 3 || context.datasetIndex === 4) {
              return 'Predicted';
            }
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${typeof value === 'number' ? value.toFixed(2) : value}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time (t)',
          font: { size: 12 }
        },
        grid: {
          display: true,
          drawBorder: false,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          maxTicksLimit: 10 // Reduce ticks for performance
        }
      },
      y: {
        title: {
          display: true,
          text: 'Value (x)',
          font: { size: 12 }
        },
        grid: {
          display: true,
          drawBorder: false,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        beginAtZero: true
      }
    },
    animation: {
      duration: 0 // Disable animations for better performance
    },
    elements: {
      point: {
        hoverRadius: 6 // Reduce hover radius for performance
      }
    }
  }), [selectedFunc.name]);

  // Dimension calculation
  const dimensions = useMemo(() => {
    const lastPoint = actualPoints[Math.min(currentTime, actualPoints.length - 1)];
    return {
      currentValue: lastPoint?.x.toFixed(2) || '0.00',
      currentRate: lastPoint?.r.toFixed(2) || '0.00',
      timeStep: Math.min(currentTime, timeSteps)
    };
  }, [actualPoints, currentTime, timeSteps]);

  const resetSimulation = useCallback(() => {
    setCurrentTime(0);
    setIsRunning(true);
  }, []);

  const toggleAnimation = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  const exportData = useCallback(() => {
    const data = {
      simulation: {
        rateFunction: selectedFunc.name,
        formula: selectedFunc.formula,
        initialValue,
        timeSteps,
        predictionHorizon
      },
      data: actualPoints.map((p, i) => ({
        time: p.t,
        value: p.x,
        rate: p.r,
        errorUp: showErrorBound ? errorBound[i]?.up : null,
        errorDown: showErrorBound ? errorBound[i]?.down : null
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rate-based-simulation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url); // Clean up
  }, [selectedFunc, initialValue, timeSteps, predictionHorizon, actualPoints, errorBound, showErrorBound]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rate-Based Change Simulator</CardTitle>
          <CardDescription>
            Explore how systems evolve over time using rate-based change mechanics: x(t) = x₀ + ∫r(τ)dτ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <!-- Controls -->
          <div className="grid lg:grid-cols-4 gap-6">
            <select
              aria-label="Select rate function"
              value={rateFunction}
              onChange={(e) => setRateFunction(e.target.value)}
              className="lg:col-span-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(rateFunctions).map(([key, func]) => (
                <option key={key} value={key}>
                  {func.name}
                </option>
              ))}
            </select>

            <div className="lg:col-span-2 h-96 min-h-0">
              <Line
                data={chartData}
                options={chartOptions}
                plugins={chartComponents}
              />
            </div>

            <div className="lg:col-span-1 space-y-4">
              <div>
                <label htmlFor="initial-value" className="block text-sm font-medium">
                  Initial Value (x₀): {initialValue}
                </label>
                <input
                  id="initial-value"
                  type="range"
                  min="0"
                  max="200"
                  value={initialValue}
                  onChange={(e) => setInitialValue(Number(e.target.value))}
                  className="w-full"
                  aria-label="Initial value slider"
                />
              </div>

              <div>
                <label htmlFor="rate-constant" className="block text-sm font-medium">
                  Rate Constant (k): {rateConstant}
                </label>
                <input
                  id="rate-constant"
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={rateConstant}
                  onChange={(e) => setRateConstant(Number(e.target.value))}
                  className="w-full"
                  aria-label="Rate constant slider"
                />
              </div>

              {rateFunction === 'quadratic' && (
                <div>
                  <label htmlFor="exponent" className="block text-sm font-medium">
                    Exponent: {exponent}
                  </label>
                  <input
                    id="exponent"
                    type="range"
                    min="1.5"
                    max="4"
                    step="0.1"
                    value={exponent}
                    onChange={(e) => setExponent(Number(e.target.value))}
                    className="w-full"
                    aria-label="Exponent slider"
                  />
                </div>
              )}

              <div>
                <label htmlFor="animation-speed" className="block text-sm font-medium">
                  Animation Speed: {600 - animationSpeed}ms
                </label>
                <input
                  id="animation-speed"
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={600 - animationSpeed}
                  onChange={(e) => setAnimationSpeed(600 - Number(e.target.value))}
                  className="w-full"
                  aria-label="Animation speed slider"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="error-bounds"
                  checked={showErrorBound}
                  onChange={(e) => setShowErrorBound(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="error-bounds" className="text-sm">Show Error Bounds</label>
              </div>
            </div>
          </div>

          <!-- Current State -->
          <div className="grid md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-2xl font-bold text-blue-600" aria-live="polite">
                {dimensions.currentValue}
              </div>
              <div className="text-sm text-gray-600">Current Value</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600" aria-live="polite">
                {dimensions.currentRate}
              </div>
              <div className="text-sm text-gray-600">Current Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600" aria-live="polite">
                {dimensions.timeStep}
              </div>
              <div className="text-sm text-gray-600">Time Step</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAnimation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                aria-label={isRunning ? "Pause animation" : "Start animation"}
              >
                {isRunning ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={resetSimulation}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                aria-label="Reset simulation"
              >
                Reset
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}