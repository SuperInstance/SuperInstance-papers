/**
 * Tutorial Manager
 *
 * Manages tutorial state, progress, and completion tracking
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  TutorialConfig,
  TutorialState,
  TutorialManagerConfig,
  TutorialCompletion
} from './types';

/**
 * Default manager configuration
 */
const DEFAULT_CONFIG: TutorialManagerConfig = {
  persistProgress: true,
  storageKey: 'spreadsheet-moment-tutorials',
  defaults: {
    skippable: true,
    showProgress: true,
    allowBack: true,
    autoAdvance: false
  }
};

/**
 * Tutorial Manager Context
 */
interface TutorialManagerContextValue {
  state: TutorialState;
  startTutorial: (tutorial: TutorialConfig) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  pauseTutorial: () => void;
  resumeTutorial: () => void;
  resetTutorial: () => void;
  getCompletion: (tutorialId: string) => TutorialCompletion | null;
}

const TutorialManagerContext = createContext<TutorialManagerContextValue | null>(null);

/**
 * Tutorial Manager Provider
 */
export const TutorialManagerProvider: React.FC<{
  config?: TutorialManagerConfig;
  children: React.ReactNode;
}> = ({ config = {}, children }) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<TutorialState>({
    tutorialId: null,
    currentStep: 0,
    isActive: false,
    isCompleted: false,
    isPaused: false,
    progress: 0
  });

  const [completions, setCompletions] = useState<Record<string, TutorialCompletion>>({});

  /**
   * Load completions from storage
   */
  useEffect(() => {
    if (!fullConfig.persistProgress) {
      return;
    }

    try {
      const stored = localStorage.getItem(fullConfig.storageKey!);
      if (stored) {
        setCompletions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load tutorial completions:', error);
    }
  }, [fullConfig.persistProgress, fullConfig.storageKey]);

  /**
   * Save completions to storage
   */
  useEffect(() => {
    if (!fullConfig.persistProgress) {
      return;
    }

    try {
      localStorage.setItem(fullConfig.storageKey!, JSON.stringify(completions));
    } catch (error) {
      console.error('Failed to save tutorial completions:', error);
    }
  }, [completions, fullConfig.persistProgress, fullConfig.storageKey]);

  /**
   * Start a tutorial
   */
  const startTutorial = useCallback((tutorial: TutorialConfig) => {
    const mergedTutorial = { ...fullConfig.defaults, ...tutorial };

    setState({
      tutorialId: mergedTutorial.id,
      currentStep: 0,
      isActive: true,
      isCompleted: false,
      isPaused: false,
      progress: 0,
      startedAt: Date.now()
    });

    mergedTutorial.onStart?.();
  }, [fullConfig.defaults]);

  /**
   * Go to next step
   */
  const nextStep = useCallback(() => {
    setState(prev => {
      const tutorial = getTutorialById(prev.tutorialId!);
      if (!tutorial) return prev;

      const nextIndex = prev.currentStep + 1;

      if (nextIndex >= tutorial.steps.length) {
        // Tutorial completed
        const completion: TutorialCompletion = {
          tutorialId: tutorial.id,
          completed: true,
          skipped: false,
          timeSpent: Date.now() - (prev.startedAt || Date.now()),
          stepsCompleted: tutorial.steps.length,
          totalSteps: tutorial.steps.length,
          completedAt: Date.now()
        };

        setCompletions(prev => ({ ...prev, [tutorial.id]: completion }));

        const newState = {
          ...prev,
          isActive: false,
          isCompleted: true,
          progress: 1,
          completedAt: Date.now()
        };

        tutorial.onComplete?.();
        return newState;
      }

      const newProgress = nextIndex / tutorial.steps.length;
      const step = tutorial.steps[nextIndex];
      step.onComplete?.();

      return {
        ...prev,
        currentStep: nextIndex,
        progress: newProgress
      };
    });
  }, []);

  /**
   * Go to previous step
   */
  const previousStep = useCallback(() => {
    setState(prev => {
      if (prev.currentStep <= 0) return prev;

      return {
        ...prev,
        currentStep: prev.currentStep - 1,
        progress: prev.currentStep / Math.max(getTutorialById(prev.tutorialId!)?.steps.length || 1, 1)
      };
    });
  }, []);

  /**
   * Skip tutorial
   */
  const skipTutorial = useCallback(() => {
    setState(prev => {
      const tutorial = getTutorialById(prev.tutorialId!);
      if (!tutorial) return prev;

      const completion: TutorialCompletion = {
        tutorialId: tutorial.id,
        completed: false,
        skipped: true,
        timeSpent: Date.now() - (prev.startedAt || Date.now()),
        stepsCompleted: prev.currentStep,
        totalSteps: tutorial.steps.length
      };

      setCompletions(prevC => ({ ...prevC, [tutorial.id]: completion }));

      tutorial.onSkip?.();

      return {
        ...prev,
        isActive: false,
        isCompleted: true
      };
    });
  }, []);

  /**
   * Complete tutorial
   */
  const completeTutorial = useCallback(() => {
    setState(prev => {
      const tutorial = getTutorialById(prev.tutorialId!);
      if (!tutorial) return prev;

      const completion: TutorialCompletion = {
        tutorialId: tutorial.id,
        completed: true,
        skipped: false,
        timeSpent: Date.now() - (prev.startedAt || Date.now()),
        stepsCompleted: tutorial.steps.length,
        totalSteps: tutorial.steps.length,
        completedAt: Date.now()
      };

      setCompletions(prevC => ({ ...prevC, [tutorial.id]: completion }));

      tutorial.onComplete?.();

      return {
        ...prev,
        isActive: false,
        isCompleted: true,
        progress: 1,
        completedAt: Date.now()
      };
    });
  }, []);

  /**
   * Pause tutorial
   */
  const pauseTutorial = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  /**
   * Resume tutorial
   */
  const resumeTutorial = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }));
  }, []);

  /**
   * Reset tutorial
   */
  const resetTutorial = useCallback(() => {
    setState({
      tutorialId: null,
      currentStep: 0,
      isActive: false,
      isCompleted: false,
      isPaused: false,
      progress: 0
    });
  }, []);

  /**
   * Get completion status for a tutorial
   */
  const getCompletion = useCallback((tutorialId: string): TutorialCompletion | null => {
    return completions[tutorialId] || null;
  }, [completions]);

  const value: TutorialManagerContextValue = {
    state,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    pauseTutorial,
    resumeTutorial,
    resetTutorial,
    getCompletion
  };

  return (
    <TutorialManagerContext.Provider value={value}>
      {children}
    </TutorialManagerContext.Provider>
  );
};

/**
 * Use Tutorial Manager Hook
 */
export function useTutorialManager(): TutorialManagerContextValue {
  const context = useContext(TutorialManagerContext);
  if (!context) {
    throw new Error('useTutorialManager must be used within TutorialManagerProvider');
  }
  return context;
}

// Tutorial registry (in production, this would come from an API or config file)
const tutorialRegistry: Map<string, TutorialConfig> = new Map();

/**
 * Register a tutorial
 */
export function registerTutorial(tutorial: TutorialConfig): void {
  tutorialRegistry.set(tutorial.id, tutorial);
}

/**
 * Get a tutorial by ID
 */
export function getTutorialById(id: string): TutorialConfig | undefined {
  return tutorialRegistry.get(id);
}

/**
 * Tutorial Manager Component
 */
export const TutorialManager: React.FC<TutorialManagerConfig & {
  children: React.ReactNode;
}> = ({ children, ...config }) => {
  return (
    <TutorialManagerProvider config={config}>
      {children}
    </TutorialManagerProvider>
  );
};

export default TutorialManager;
