/**
 * Tutorial Step Component
 *
 * Individual tutorial step with content and actions
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { TutorialStepConfig } from './types';

/**
 * Tutorial Step Props
 */
interface TutorialStepProps {
  step: TutorialStepConfig;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  canGoBack: boolean;
  canSkip: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
}

/**
 * Tutorial Step Component
 */
export const TutorialStep: React.FC<TutorialStepProps> = ({
  step,
  stepNumber,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  canGoBack,
  canSkip,
  isPaused,
  onPause,
  onResume
}) => {
  const isLastStep = stepNumber === totalSteps;

  /**
   * Handle primary action
   */
  const handlePrimaryAction = () => {
    if (isLastStep) {
      onComplete();
    } else {
      onNext();
    }
  };

  return (
    <div
      className={`tutorial-step ${step.className || ''}`}
      style={{
        position: step.position === 'center' ? 'fixed' : 'absolute',
        ...getPositionStyle(step.position, step.target)
      }}
    >
      {/* Step Header */}
      <div className="tutorial-step-header">
        <div className="tutorial-step-counter">
          Step {stepNumber} of {totalSteps}
        </div>
        <h3 className="tutorial-step-title">{step.title}</h3>
      </div>

      {/* Step Content */}
      <div className="tutorial-step-content">
        <ReactMarkdown>{step.content}</ReactMarkdown>
      </div>

      {/* Step Actions */}
      {step.actions && step.actions.length > 0 && (
        <div className="tutorial-step-custom-actions">
          {step.actions.map(action => (
            <button
              key={action.id}
              className={`tutorial-action-button ${action.type}`}
              onClick={action.handler}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="tutorial-step-navigation">
        {/* Back Button */}
        {canGoBack && (
          <button className="tutorial-button secondary" onClick={onPrevious}>
            ← Previous
          </button>
        )}

        {/* Pause/Resume Button */}
        {!isLastStep && (
          <button
            className="tutorial-button tertiary"
            onClick={isPaused ? onResume : onPause}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
        )}

        {/* Skip Button */}
        {canSkip && !isLastStep && (
          <button className="tutorial-button tertiary" onClick={onSkip}>
            Skip Tutorial
          </button>
        )}

        {/* Next/Complete Button */}
        <button
          className="tutorial-button primary"
          onClick={handlePrimaryAction}
        >
          {isLastStep ? 'Complete' : 'Next →'}
        </button>
      </div>

      {/* Target Indicator */}
      {step.target && !isPaused && (
        <div className="tutorial-target-indicator" />
      )}
    </div>
  );
};

export default TutorialStep;

/**
 * Get position style for step
 */
function getPositionStyle(
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center',
  target?: string
): React.CSSProperties {
  if (position === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10000
    };
  }

  if (target) {
    const targetElement = document.querySelector(target);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();

      switch (position) {
        case 'top':
          return {
            bottom: `${window.innerHeight - rect.top + 10}px`,
            left: `${rect.left + rect.width / 2}px`,
            transform: 'translateX(-50%)'
          };
        case 'bottom':
          return {
            top: `${rect.bottom + 10}px`,
            left: `${rect.left + rect.width / 2}px`,
            transform: 'translateX(-50%)'
          };
        case 'left':
          return {
            top: `${rect.top + rect.height / 2}px`,
            right: `${window.innerWidth - rect.left + 10}px`,
            transform: 'translateY(-50%)'
          };
        case 'right':
          return {
            top: `${rect.top + rect.height / 2}px`,
            left: `${rect.right + 10}px`,
            transform: 'translateY(-50%)'
          };
        default:
          return {};
      }
    }
  }

  return {};
}
