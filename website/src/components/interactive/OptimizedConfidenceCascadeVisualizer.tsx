import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  createConfidence,
  sequentialCascade,
  parallelCascade,
  conditionalCascade,
  ConfidenceZone,
  type Confidence,
  type CascadeResult
} from '@/lib/confidence-cascade';

interface InteractiveStep {
  id: string;
  name: string;
  confidence: number;
  source: string;
  description: string;
}

interface Config {
  greenThreshold: number;
  yellowThreshold: number;
  escalateOnYellow: boolean;
  escalateOnRed: boolean;
}

const CONFIDENCE_PRESETS = [
  { id: '1', name: 'Input Validation', confidence: 0.95, source: 'validator', description: 'Format and syntax check' },
  { id: '2', name: 'Authentication', confidence: 0.90, source: 'auth', description: 'User credential verification' },
  { id: '3', name: 'Permission Check', confidence: 0.85, source: 'permissions', description: 'Access rights validation' },
  { id: '4', name: 'Business Logic', confidence: 0.80, source: 'business', description: 'Rule engine evaluation' }
];

export function OptimizedConfidenceCascadeVisualizer() {
  const [steps, setSteps] = useState<InteractiveStep[]>(CONFIDENCE_PRESETS);
  const [config, setConfig] = useState<Config>({
    greenThreshold: 0.85,
    yellowThreshold: 0.60,
    escalateOnYellow: false,
    escalateOnRed: true
  });

  const [compositionType, setCompositionType] = useState<'sequential' | 'parallel' | 'conditional'>('sequential');
  const [weights, setWeights] = useState<number[]>([1, 1, 1, 1]);
  const [result, setResult] = useState<CascadeResult | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Memoized confidence calculations to prevent unnecessary recalculations
  const stepConfidences = useMemo(() =>
    steps.map(step => createConfidence(step.confidence, step.source)),
    [steps, config]
  );

  // Debounced cascade calculation for performance
  const calculateCascade = useCallback(() => {
    let cascadeResult: CascadeResult;

    switch (compositionType) {
      case 'sequential':
        cascadeResult = sequentialCascade(stepConfidences, config);
        break;
      case 'parallel':
        const branches = stepConfidences.map((conf, i) => ({
          confidence: conf,
          weight: weights[i] || 1
        }));
        cascadeResult = parallelCascade(branches, config);
        break;
      case 'conditional':
        const paths = stepConfidences.map((conf, i) => ({
          confidence: conf,
          predicate: i === 0,
          description: steps[i].name
        }));
        cascadeResult = conditionalCascade(paths, config);
        break;
    }

    setResult(cascadeResult);
  }, [stepConfidences, config, compositionType, weights, steps]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateCascade();
    }, 100); // Debounce calculations

    return () => clearTimeout(timeoutId);
  }, [calculateCascade]);

  const runAnimation = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    setCurrentStep(0);

    let step = 0;
    const totalSteps = steps.length;

    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);

      if (step >= totalSteps) {
        clearInterval(interval);
        setTimeout(() => {
          setIsAnimating(false);
        }, 500);
      }
    }, 600); // Slightly faster animation
  }, [steps.length, isAnimating]);

  const updateStepConfidence = useCallback((index: number, confidence: number) => {
    setSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, confidence: Math.max(0, Math.min(1, confidence)) } : step
    ));
  }, []);

  const updateWeight = useCallback((index: number, weight: number) => {
    setWeights(prev => prev.map((w, i) =>
      i === index ? Math.max(0.1, weight) : w
    ));
  }, []);

  const getZoneColor = useCallback((zone: ConfidenceZone) => {
    switch (zone) {
      case ConfidenceZone.GREEN: return 'bg-green-500';
      case ConfidenceZone.YELLOW: return 'bg-yellow-500';
      case ConfidenceZone.RED: return 'bg-red-500';
    }
  }, []);

  const getZoneTextColor = useCallback((zone: ConfidenceZone) => {
    switch (zone) {
      case ConfidenceZone.GREEN: return 'text-green-600';
      case ConfidenceZone.YELLOW: return 'text-yellow-600';
      case ConfidenceZone.RED: return 'text-red-600';
    }
  }, []);

  // Memoize step calculations to prevent recalculation on every render
  const stepResults = useMemo(() =>
    steps.map(step => createConfidence(step.confidence, step.source, config)),
    [steps, config]
  );

  // ARIA labels for accessibility
  const getAriaLabel = (step: InteractiveStep, index: number) => {
    const conf = stepResults[index];
    return `Step ${index + 1}: ${step.name}. Confidence level ${(step.confidence * 100).toFixed(0)} percent. Zone: ${conf.zone}. ${step.description}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Confidence Cascade Visualizer</CardTitle>
          <CardDescription>
            See how confidence flows through a multi-step system with real-time zone classification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration Panel */}
          <section aria-label="Configuration Panel" className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-sm">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="green-threshold" className="block text-sm font-medium mb-1">
                  Green Threshold: {config.greenThreshold}
                </label>
                <input
                  id="green-threshold"
                  type="range"
                  min="0.7"
                  max="0.95"
                  step="0.01"
                  value={config.greenThreshold}
                  onChange={(e) => setConfig(prev => ({...prev, greenThreshold: parseFloat(e.target.value)}))}
                  className="w-full focus:ring-2 focus:ring-blue-500"
                  aria-label="Green threshold slider"
                />
              </div>
              <div>
                <label htmlFor="yellow-threshold" className="block text-sm font-medium mb-1">
                  Yellow Threshold: {config.yellowThreshold}
                </label>
                <input
                  id="yellow-threshold"
                  type="range"
                  min="0.3"
                  max="0.7"
                  step="0.01"
                  value={config.yellowThreshold}
                  onChange={(e) => setConfig(prev => ({...prev, yellowThreshold: parseFloat(e.target.value)}))}
                  className="w-full focus:ring-2 focus:ring-blue-500"
                  aria-label="Yellow threshold slider"
                />
              </div>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium mb-2">Composition Type</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {(['sequential', 'parallel', 'conditional'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setCompositionType(type)}
                    role="radio"
                    aria-checked={compositionType === type}
                    className={`px-3 py-1 rounded text-sm capitalize transition-all ${
                      compositionType === type
                        ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          {/* Visualization */}
          <section aria-label="Confidence Flow Visualization">
            <h3 className="font-semibold mb-4">Confidence Flow</h3>

            {/* Zone Legend - improved contrast */}
            <div className="flex flex-wrap gap-6 text-sm mb-6" role="list" aria-label="Confidence zones">
              <div className="flex items-center gap-2" role="listitem">
                <div className="w-4 h-4 bg-green-500 rounded" aria-hidden="true"></div>
                <span>GREEN (≥{(config.greenThreshold * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-2" role="listitem">
                <div className="w-4 h-4 bg-yellow-500 rounded" aria-hidden="true"></div>
                <span>YELLOW (≥{(config.yellowThreshold * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-2" role="listitem">
                <div className="w-4 h-4 bg-red-500 rounded" aria-hidden="true"></div>
                <span>RED (&lt;{(config.yellowThreshold * 100).toFixed(0)}%)</span>
              </div>
            </div>

            {/* Steps - improved keyboard navigation */}
            <div className="grid gap-4" role="group" aria-label="Confidence steps">
              {steps.map((step, index) => {
                const conf = stepResults[index];
                const isActive = currentStep > index;
                const isAnimatingCurrent = isAnimating && currentStep === index + 1;

                return (
                  <div
                    key={step.id}
                    className={`p-4 border rounded-lg transition-all duration-200 ${
                      isAnimatingCurrent ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                    }`}
                    role="group"
                    aria-label={getAriaLabel(step, index)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-lg">{step.name}</h4>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-2xl font-bold ${getZoneTextColor(conf.zone)}`}
                          aria-live="polite"
                          aria-label={`Confidence: ${(step.confidence * 100).toFixed(0)} percent`}
                        >
                          {(step.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs uppercase font-medium" aria-label={`Zone: ${conf.zone}`}>
                          {conf.zone}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label htmlFor={`confidence-${index}`} className="sr-only">
                        Adjust confidence for {step.name}
                      </label>
                      <input
                        id={`confidence-${index}`}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={step.confidence}
                        onChange={(e) => updateStepConfidence(index, parseFloat(e.target.value))}
                        className="w-full focus:ring-2 focus:ring-blue-500"
                        disabled={isAnimating}
                        aria-label={`Confidence slider for ${step.name}`}
                      />
                      <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>0%</span>
                        <span aria-live="polite">{(step.confidence * 100).toFixed(0)}%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {compositionType === 'parallel' && (
                      <div className="mt-3">
                        <label htmlFor={`weight-${index}`} className="text-sm block mb-1">
                          Weight: {weights[index].toFixed(1)}
                        </label>
                        <input
                          id={`weight-${index}`}
                          type="range"
                          min="0.1"
                          max="3"
                          step="0.1"
                          value={weights[index]}
                          onChange={(e) => updateWeight(index, parseFloat(e.target.value))}
                          className="w-full focus:ring-2 focus:ring-blue-500"
                          disabled={isAnimating}
                          aria-label={`Weight for ${step.name}`}
                        />
                      </div>
                    )}

                    <div className={`mt-3 h-3 w-full bg-gray-200 rounded-full overflow-hidden`}>
                      <div
                        className={`h-full transition-all duration-300 ${getZoneColor(conf.zone)}`}
                        style={{ width: `${step.confidence * 100}%` }}
                        role="progressbar"
                        aria-valuenow={step.confidence * 100}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Confidence visualization for ${step.name}`}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Result - improved visual hierarchy */}
            {result && (
              <div className="mt-6 p-4 border-2 border-dashed rounded-lg bg-gray-50" role="region" aria-label="Cascade result">
                <h4 className="font-semibold mb-2 text-lg">Cascade Result</h4>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div
                      className={`text-3xl font-bold ${getZoneTextColor(result.confidence.zone)}`}
                      aria-live="polite"
                      aria-label={`Final confidence: ${(result.confidence.value * 100).toFixed(1)} percent`}
                    >
                      {(result.confidence.value * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Final Confidence ({result.confidence.zone})
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-medium ${
                      result.escalationTriggered ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {result.escalationLevel}
                    </div>
                    <div className="text-sm text-gray-600">
                      Escalation Level
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-3 w-full bg-gray-300 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getZoneColor(result.confidence.zone)}`}
                    style={{ width: `${result.confidence.value * 100}%` }}
                    role="progressbar"
                    aria-valuenow={result.confidence.value * 100}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Final confidence visualization"
                  ></div>
                </div>
              </div>
            )}
          </section>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={runAnimation}
              disabled={isAnimating}
              aria-label={isAnimating ? "Animation running" : "Run cascade animation"}
            >
              {isAnimating ? 'Animating...' : 'Run Cascade Animation'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSteps(CONFIDENCE_PRESETS.map(s => ({...s, confidence: 1.0})));
                setCurrentStep(0);
              }}
              aria-label="Reset all confidence values to 100 percent"
            >
              Reset All to 100%
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}