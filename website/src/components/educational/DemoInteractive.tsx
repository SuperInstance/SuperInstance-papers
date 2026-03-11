import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';

interface DemoStep {
  title: string;
  description: string;
  code?: string;
  expectedOutput?: string;
  hint?: string;
  explanation: string;
}

interface DemoInteractiveProps {
  title: string;
  description: string;
  concept: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  steps: DemoStep[];
  learningObjectives: string[];
  prerequisites?: string[];
}

export const DemoInteractive: React.FC<DemoInteractiveProps> = ({
  title,
  description,
  concept,
  difficulty,
  steps,
  learningObjectives,
  prerequisites = [],
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const currentStepData = steps[currentStep];

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setUserInput('');
      setShowHint(false);
      setShowExplanation(false);
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setUserInput('');
      setShowHint(false);
      setShowExplanation(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setUserInput('');
    setShowHint(false);
    setShowExplanation(false);
    setCompletedSteps([]);
  };

  const checkAnswer = () => {
    if (currentStepData.expectedOutput && userInput.trim() === currentStepData.expectedOutput) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
      return true;
    }
    return false;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card hover padding="lg" className="mb-8">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <CardTitle className="text-2xl mb-2">{title}</CardTitle>
            <CardDescription className="text-lg">{description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(difficulty)}`}>
              {difficulty}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
              🎮 Interactive Demo
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-semibold text-gray-700 mb-2">Concept: {concept}</h4>
          <div className="flex flex-wrap gap-2">
            {learningObjectives.map((objective, index) => (
              <span key={index} className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                📚 {objective}
              </span>
            ))}
          </div>
        </div>

        {prerequisites.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-700 mb-2">Prerequisites:</h4>
            <div className="flex flex-wrap gap-2">
              {prerequisites.map((prereq, index) => (
                <span key={index} className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                  {prereq}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-700">Progress</h4>
            <span className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  completedSteps.includes(index)
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
                onClick={() => {
                  if (index <= currentStep || completedSteps.includes(index - 1)) {
                    setCurrentStep(index);
                    setUserInput('');
                    setShowHint(false);
                    setShowExplanation(false);
                  }
                }}
                style={{ cursor: index <= currentStep || completedSteps.includes(index - 1) ? 'pointer' : 'not-allowed' }}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Current step content */}
        <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{currentStepData.title}</h3>
          <p className="text-gray-700 mb-4">{currentStepData.description}</p>

          {currentStepData.code && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Code Example:</h4>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{currentStepData.code}</code>
              </pre>
            </div>
          )}

          {currentStepData.expectedOutput && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Try it yourself:</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Enter your answer..."
                  className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    if (checkAnswer()) {
                      alert('Correct! Moving to next step.');
                      handleNextStep();
                    } else {
                      alert('Not quite right. Try again or click "Show Hint" for help.');
                    }
                  }}
                >
                  Check Answer
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            {currentStepData.hint && (
              <Button variant="outline" onClick={() => setShowHint(!showHint)}>
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowExplanation(!showExplanation)}>
              {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
            </Button>
          </div>

          {showHint && currentStepData.hint && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">💡 Hint:</h4>
              <p className="text-yellow-700">{currentStepData.hint}</p>
            </div>
          )}

          {showExplanation && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📖 Explanation:</h4>
              <p className="text-blue-700">{currentStepData.explanation}</p>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center">
          <div>
            <Button variant="outline" onClick={handleReset}>
              Reset Demo
            </Button>
          </div>
          <div className="flex space-x-3">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePreviousStep}>
                ← Previous Step
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button variant="primary" onClick={handleNextStep}>
                Next Step →
              </Button>
            ) : (
              <Button variant="accent" onClick={() => alert('Congratulations! You completed the demo!')}>
                🎉 Complete Demo
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};