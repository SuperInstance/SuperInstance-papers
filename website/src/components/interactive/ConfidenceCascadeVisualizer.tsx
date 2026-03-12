import React, { useState, useEffect } from 'react';
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

export function ConfidenceCascadeVisualizer() {
  const [steps, setSteps] = useState<InteractiveStep[]>([
    { id: '1', name: 'Input Validation', confidence: 0.95, source: 'validator', description: 'Format and syntax check' },
    { id: '2', name: 'Authentication', confidence: 0.90, source: 'auth', description: 'User credential verification' },
    { id: '3', name: 'Permission Check', confidence: 0.85, source: 'permissions', description: 'Access rights validation' },
    { id: '4', name: 'Business Logic', confidence: 0.80, source: 'business', description: 'Rule engine evaluation' }
  ]);

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

  useEffect(() => {
    calculateCascade();
  }, [steps, config, compositionType, weights]);

  const calculateCascade = () => {
    const confidences = steps.map(step => createConfidence(step.confidence, step.source));
    let cascadeResult: CascadeResult;

    switch (compositionType) {
      case 'sequential':
        cascadeResult = sequentialCascade(confidences, config);
        break;
      case 'parallel':
        const branches = confidences.map((conf, i) => ({
          confidence: conf,
          weight: weights[i] || 1
        }));
        cascadeResult = parallelCascade(branches, config);
        break;
      case 'conditional':
        const paths = confidences.map((conf, i) => ({
          confidence: conf,
          predicate: i === 0, // Only first path active for demo
          description: steps[i].name
        }));
        cascadeResult = conditionalCascade(paths, config);
        break;
    }

    setResult(cascadeResult);
  };

  const runAnimation = () => {
    setIsAnimating(true);
    setCurrentStep(0);

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length) {
          clearInterval(interval);
          setIsAnimating(false);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
  };

  const updateStepConfidence = (index: number, confidence: number) => {
    const newSteps = [...steps];
    newSteps[index].confidence = Math.max(0, Math.min(1, confidence));
    setSteps(newSteps);
  };

  const updateWeight = (index: number, weight: number) => {
    const newWeights = [...weights];
    newWeights[index] = Math.max(0.1, weight);
    setWeights(newWeights);
  };

  const getZoneColor = (zone: ConfidenceZone) => {
    switch (zone) {
      case ConfidenceZone.GREEN: return 'bg-green-500';
      case ConfidenceZone.YELLOW: return 'bg-yellow-500';
      case ConfidenceZone.RED: return 'bg-red-500';
    }
  };

  const getZoneTextColor = (zone: ConfidenceZone) => {
    switch (zone) {
      case ConfidenceZone.GREEN: return 'text-green-600';
      case ConfidenceZone.YELLOW: return 'text-yellow-600';
      case ConfidenceZone.RED: return 'text-red-600';
    }
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
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-sm">Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Green Threshold</label>
                <input
                  type="range"
                  min="0.7"
                  max="0.95"
                  step="0.01"
                  value={config.greenThreshold}
                  onChange={(e) => setConfig({...config, greenThreshold: parseFloat(e.target.value)})}
                  className="w-full"
                />
                <span className="text-xs text-gray-600">{config.greenThreshold}</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Yellow Threshold</label>
                <input
                  type="range"
                  min="0.3"
                  max="0.7"
                  step="0.01"
                  value={config.yellowThreshold}
                  onChange={(e) => setConfig({...config, yellowThreshold: parseFloat(e.target.value)})}
                  className="w-full"
                />
                <span className="text-xs text-gray-600">{config.yellowThreshold}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Composition Type</label>
              <div className="flex gap-2">
                {(['sequential', 'parallel', 'conditional'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setCompositionType(type)}
                    className={`px-3 py-1 rounded text-sm capitalize ${
                      compositionType === type
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visualization */}
          <div className="space-y-4">
            <h3 className="font-semibold">Confidence Flow</h3>

            {/* Zone Legend */}
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>GREEN (≥{config.greenThreshold})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>YELLOW (≥{config.yellowThreshold})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>RED (<{config.yellowThreshold})</span>
              </div>
            </div>

            {/* Steps */}
            <div className="grid gap-4">
              {steps.map((step, index) => {
                const conf = createConfidence(step.confidence, step.source, config);
                const isActive = currentStep > index;

                return (
                  <div key={step.id} className={`p-4 border rounded-lg ${isAnimating && currentStep === index + 1 ? 'ring-2 ring-blue-500' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{step.name}</h4>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getZoneTextColor(conf.zone)}`}>
                          {(step.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs uppercase font-medium">{conf.zone}</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={step.confidence}
                        onChange={(e) => updateStepConfidence(index, parseFloat(e.target.value))}
                        className="w-full"
                        disabled={isAnimating}
                      />
                      <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>0%</span>
                        <span>{step.confidence * 100}%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {compositionType === 'parallel' && (
                      <div className="mt-3">
                        <label className="text-sm">Weight: {weights[index].toFixed(1)}</label>
                        <input
                          type="range"
                          min="0.1"
                          max="3"
                          step="0.1"
                          value={weights[index]}
                          onChange={(e) => updateWeight(index, parseFloat(e.target.value))}
                          className="w-full"
                          disabled={isAnimating}
                        />
                      </div>
                    )}

                    <div className={`mt-3 h-2 w-full bg-gray-200 rounded overflow-hidden`}>
                      <div
                        className={`h-full transition-all duration-300 ${getZoneColor(conf.zone)}`}
                        style={{ width: `${step.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Result */}
            {result && (
              <div className="mt-6 p-4 border-2 border-dashed rounded-lg bg-gray-50">
                <h4 className="font-semibold mb-2">Cascade Result</h4>
                <div className="flex justify-between items-center">
                  <div>
                    <div className={`text-3xl font-bold ${getZoneTextColor(result.confidence.zone)}`}>
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

                <div className="mt-4 h-3 w-full bg-gray-300 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getZoneColor(result.confidence.zone)}`}
                    style={{ width: `${result.confidence.value * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <Button onClick={runAnimation} disabled={isAnimating}>
              {isAnimating ? 'Running...' : 'Run Cascade Animation'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSteps(steps.map(s => ({...s, confidence: 1.0})));
                setCurrentStep(0);
              }}
            >
              Reset All to 100%
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}