import React, { useState, useEffect, useMemo } from 'react';
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
  Filler
} from 'chart.js';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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

export function RateBasedChangeSimulator() {
  const [rateFunction, setRateFunction] = useState<RateFunction>('linear');
  const [initialValue, setInitialValue] = useState(100);
  const [rateConstant, setRateConstant] = useState(2);
  const [exponent, setExponent] = useState(2);
  const [timeSteps, setTimeSteps] = useState(50);
  const [showErrorBound, setShowErrorBound] = useState(true);
  const [predictionHorizon, setPredictionHorizon] = useState(20);
  const [isRunning, setIsRunning] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualData, setActualData] = useState<number[]>([]);
  const [predictedData, setPredictedData] = useState<number[]>([]);

  const rateFunctions: Record<string, RateFunction> = {
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
  };

  const selectedFunc = rateFunctions[rateFunction];

  // Generate data using rate-based change mechanics
  const { actualPoints, predictedPoints, errorBound } = useMemo(() => {
    const history: DataPoint[] = [];
    const predictions: { x: number; min: number; max: number }[] = [];
    let x = initialValue;

    // Historical data generation
    for (let t = 0; t <= timeSteps; t++) {
      const r = selectedFunc.f(t);
      x += r * (t === 0 ? 0 : 1); // Simple Euler integration
      history.push({ t, x, r });

      // Generate predictions from midpoint
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
            min: minX,
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
      errorBound
    };
  }, [timeSteps, initialValue, rateConstant, exponent, selectedFunc, predictionHorizon]);

  // Animation loop
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
    }, 200);

    return () => clearInterval(interval);
  }, [isRunning, timeSteps]);

  // Update display data
  useEffect(() => {
    setActualData(actualPoints.slice(0, currentTime).map(p => p.x));
    setPredictedData(actualPoints.slice(timeSteps / 2, currentTime).map(p => p.x));
  }, [currentTime, actualPoints, timeSteps]);

  const chartData = {
    labels: Array.from({ length: Math.max(timeSteps, timeSteps + predictionHorizon) }, (_, i) => i),
    datasets: [
      {
        label: 'Actual Value',
        data: actualPoints.map(p => p.x),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        pointRadius: (ctx: any) => ctx.dataIndex === currentTime ? 6 : 3,
        pointBackgroundColor: (ctx: any) => ctx.dataIndex === currentTime ? 'rgb(219, 234, 254)' : 'rgb(59, 130, 246)',
        borderWidth: 2,
        fill: false
      },
      {
        label: 'Error Bounds',
        data: showErrorBound ? errorBound.map(e => e.up) : [],
        borderColor: 'rgba(156, 163, 175, 0.5)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderWidth: 1,
        fill: 2,
        pointRadius: 0
      },
      {
        label: '',
        data: showErrorBound ? errorBound.map(e => e.down) : [],
        borderColor: 'rgba(156, 163, 175, 0.5)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderWidth: 1,
        fill: false,
        pointRadius: 0
      },
      {
        label: 'Predictions',
        data: [
          ...Array(timeSteps / 2).fill(null),
          ...predictedPoints.map(p => p.min)
        ],
        borderColor: 'rgba(245, 158, 11, 0.8)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointStyle: 'star',
        pointRadius: 4,
        fill: 5
      },
      {
        label: '',
        data: [
          ...Array(timeSteps / 2).fill(null),
          ...predictedPoints.map(p => p.max)
        ],
        borderColor: 'rgba(245, 158, 11, 0.8)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointStyle: 'star',
        pointRadius: 4,
        fill: false
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      title: {
        display: true,
        text: `Rate-Based Change: ${selectedFunc.name}`
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            if (context.datasetIndex === 1 || context.datasetIndex === 2) {
              return 'Error Bound';
            }
            if (context.datasetIndex === 3 || context.datasetIndex === 4) {
              return 'Predicted';
            }
            return context.dataset.label + ': ' + context.parsed.y.toFixed(2);
          }
        }
      },
      annotation: {
        annotations: {
          currentTime: {
            type: 'line' as const,
            xMin: currentTime,
            xMax: currentTime,
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 2,
            label: {
              content: 'Current Time',
              enabled: true,
              position: 'top'
            }
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time (t)'
        },
        grid: {
          drawBorder: false
        }
      },
      y: {
        title: {
          display: true,
          text: 'Value (x)'
        },
        grid: {
          drawBorder: false
        }
      }
    }
  };

  const resetSimulation = () => {
    setCurrentTime(0);
    setIsRunning(true);
  };

  const exportData = () => {
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
  };

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
          {/* Controls */}
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <h3 className="font-semibold">Rate Function</h3>
              <div className="space-y-2">
                {Object.entries(rateFunctions).map(([key, func]) => (
                  <button
                    key={key}
                    onClick={() => setRateFunction(key)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      rateFunction === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{func.name}</div>
                    <div className="text-sm text-gray-600">{func.formula}</div>
                    <div className="text-xs text-gray-500 mt-1">{func.description}</div>
                  </button>
                ))}
              </div>

              <div className="pt-4 space-y-3"
                <Button onClick={resetSimulation} className="w-full">
                  Reset Simulation
                </Button>
                <Button onClick={exportData} variant="outline" className="w-full">
                  Export Data
                </Button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="h-96">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            <div className="lg:col-span-1 space-y-4">
              <h3 className="font-semibold">Parameters</h3>

              <div>
                <label className="block text-sm font-medium mb-2">Initial Value (x₀)</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={initialValue}
                  onChange={(e) => setInitialValue(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600">{initialValue}</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rate Constant (k)</label>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={rateConstant}
                  onChange={(e) => setRateConstant(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600">{rateConstant}</div>
              </div>

              {rateFunction === 'quadratic' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Exponent</label>
                  <input
                    type="range"
                    min="1.5"
                    max="4"
                    step="0.1"
                    value={exponent}
                    onChange={(e) => setExponent(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-600">{exponent}</div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Time Steps</label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={timeSteps}
                  onChange={(e) => setTimeSteps(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600">{timeSteps}</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Prediction Horizon</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={predictionHorizon}
                  onChange={(e) => setPredictionHorizon(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600">{predictionHorizon}</div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="errorBound"
                  checked={showErrorBound}
                  onChange={(e) => setShowErrorBound(e.target.checked)}
                />
                <label htmlFor="errorBound" className="text-sm">Show Error Bounds</label>
              </div>
            </div>
          </div>

          {/* Current State */}
          <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {actualPoints[currentTime]?.x.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-gray-600">Current Value</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {actualPoints[currentTime]?.r.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-gray-600">Current Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {currentTime}
              </div>
              <div className="text-sm text-gray-600">Time Step</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}