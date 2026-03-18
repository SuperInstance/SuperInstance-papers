/**
 * Tutorial Component
 *
 * Main tutorial component for displaying interactive tutorials
 */

import React, { useEffect, useState } from 'react';
import { TutorialConfig, TutorialStepConfig } from './types';
import { useTutorialManager } from './TutorialManager';
import { TutorialStep } from './TutorialStep';
import { TutorialProgress } from './TutorialProgress';
import { TutorialOverlay } from './TutorialOverlay';

/**
 * Tutorial Component
 */
export const Tutorial: React.FC<{
  tutorial: TutorialConfig;
  className?: string;
}> = ({ tutorial, className = '' }) => {
  const {
    state,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    pauseTutorial,
    resumeTutorial
  } = useTutorialManager();

  const [currentStepConfig, setCurrentStepConfig] = useState<TutorialStepConfig | null>(null);

  useEffect(() => {
    if (state.isActive && state.tutorialId === tutorial.id) {
      const step = tutorial.steps[state.currentStep];
      setCurrentStepConfig(step);
      step.onShow?.();
    }
  }, [state.isActive, state.tutorialId, state.currentStep, tutorial.id, tutorial.steps]);

  /**
   * Handle next step
   */
  const handleNext = () => {
    if (tutorial.autoAdvance) {
      const step = tutorial.steps[state.currentStep];
      if (step.duration) {
        setTimeout(() => {
          nextStep();
        }, step.duration);
      } else {
        nextStep();
      }
    } else {
      nextStep();
    }
  };

  /**
   * Handle previous step
   */
  const handlePrevious = () => {
    if (tutorial.allowBack && state.currentStep > 0) {
      previousStep();
    }
  };

  /**
   * Handle skip
   */
  const handleSkip = () => {
    if (tutorial.skippable) {
      skipTutorial();
    }
  };

  // Don't render if tutorial is not active or not the current tutorial
  if (!state.isActive || state.tutorialId !== tutorial.id) {
    return null;
  }

  if (!currentStepConfig) {
    return null;
  }

  return (
    <>
      {currentStepConfig.showOverlay !== false && (
        <TutorialOverlay target={currentStepConfig.target} />
      )}

      <div className={`tutorial-container ${className}`}>
        {/* Progress Bar */}
        {tutorial.showProgress && (
          <TutorialProgress
            current={state.currentStep + 1}
            total={tutorial.steps.length}
            progress={state.progress}
          />
        )}

        {/* Tutorial Step */}
        <TutorialStep
          step={currentStepConfig}
          stepNumber={state.currentStep + 1}
          totalSteps={tutorial.steps.length}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          onComplete={completeTutorial}
          canGoBack={(tutorial.allowBack ?? false) && state.currentStep > 0}
          canSkip={tutorial.skippable ?? false}
          isPaused={state.isPaused}
          onPause={pauseTutorial}
          onResume={resumeTutorial}
        />
      </div>
    </>
  );
};

export default Tutorial;
