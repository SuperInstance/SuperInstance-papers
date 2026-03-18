/**
 * Tutorial Types
 *
 * Type definitions for tutorial system
 */

/**
 * Tutorial step configuration
 */
export interface TutorialStepConfig {
  /** Unique step identifier */
  id: string;

  /** Step title */
  title: string;

  /** Step content (can include markdown) */
  content: string;

  /** Target element selector to highlight */
  target?: string;

  /** Step position relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';

  /** Whether to show an overlay */
  showOverlay?: boolean;

  /** Custom CSS class for styling */
  className?: string;

  /** Step duration in milliseconds (for auto-advance) */
  duration?: number;

  /** Whether this step can be skipped */
  skippable?: boolean;

  /** Actions available in this step */
  actions?: TutorialAction[];

  /** Optional callback when step is shown */
  onShow?: () => void;

  /** Optional callback when step is completed */
  onComplete?: () => void;
}

/**
 * Tutorial action
 */
export interface TutorialAction {
  /** Action identifier */
  id: string;

  /** Action label */
  label: string;

  /** Action type */
  type: 'primary' | 'secondary' | 'tertiary';

  /** Action handler */
  handler: () => void | Promise<void>;
}

/**
 * Tutorial configuration
 */
export interface TutorialConfig {
  /** Unique tutorial identifier */
  id: string;

  /** Tutorial title */
  title: string;

  /** Tutorial description */
  description: string;

  /** Tutorial steps */
  steps: TutorialStepConfig[];

  /** Whether tutorial can be skipped */
  skippable?: boolean;

  /** Whether to show progress indicator */
  showProgress?: boolean;

  /** Whether to allow navigation to previous steps */
  allowBack?: boolean;

  /** Whether to auto-advance steps */
  autoAdvance?: boolean;

  /** Custom CSS class */
  className?: string;

  /** Optional callback when tutorial starts */
  onStart?: () => void;

  /** Optional callback when tutorial completes */
  onComplete?: () => void;

  /** Optional callback when tutorial is skipped */
  onSkip?: () => void;
}

/**
 * Tutorial state
 */
export interface TutorialState {
  /** Current tutorial ID */
  tutorialId: string | null;

  /** Current step index */
  currentStep: number;

  /** Whether tutorial is active */
  isActive: boolean;

  /** Whether tutorial is completed */
  isCompleted: boolean;

  /** Whether tutorial is paused */
  isPaused: boolean;

  /** Tutorial progress (0-1) */
  progress: number;

  /** Timestamp when tutorial was started */
  startedAt?: number;

  /** Timestamp when tutorial was completed */
  completedAt?: number;
}

/**
 * Tutorial manager configuration
 */
export interface TutorialManagerConfig {
  /** Whether to persist progress to localStorage */
  persistProgress?: boolean;

  /** Storage key for persisted progress */
  storageKey?: string;

  /** Default tutorial options */
  defaults?: Partial<TutorialConfig>;
}

/**
 * Tutorial completion data
 */
export interface TutorialCompletion {
  /** Tutorial ID */
  tutorialId: string;

  /** Whether tutorial was completed */
  completed: boolean;

  /** Whether tutorial was skipped */
  skipped: boolean;

  /** Time spent in tutorial (ms) */
  timeSpent: number;

  /** Steps completed */
  stepsCompleted: number;

  /** Total steps */
  totalSteps: number;

  /** Completion timestamp */
  completedAt?: number;
}
