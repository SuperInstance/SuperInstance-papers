/**
 * LiveRegion - React components for live region announcements
 * WCAG 2.1 Level AA Compliant (4.1.3 Status Messages)
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnnouncementPriority, LiveMessage } from './types';

interface LiveRegionProps {
  /**
   * Priority level for announcements
   */
  priority?: AnnouncementPriority;

  /**
   * Whether announcements should be atomic
   */
  atomic?: boolean;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Additional ARIA attributes
   */
  ariaAttributes?: Record<string, string>;
}

interface LiveRegionManagerProps {
  /**
   * Children components that will trigger announcements
   */
  children: React.ReactNode;
}

interface AnnounceProps {
  /**
   * Message to announce
   */
  message: string;

  /**
   * Priority level
   */
  priority?: AnnouncementPriority;

  /**
   * Duration in ms before clearing message
   */
  duration?: number;

  /**
   * Unique identifier for deduplication
   */
  id?: string;
}

interface UseLiveRegionReturn {
  /**
   * Announce a message
   */
  announce: (message: string, priority?: AnnouncementPriority) => void;

  /**
   * Clear all messages
   */
  clear: () => void;

  /**
   * Current message
   */
  currentMessage: string;
}

/**
 * Screen-reader-only class
 */
const SR_ONLY_CLASS = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`;

/**
 * LiveRegion component
 * Creates a live region for screen reader announcements
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({
  priority = 'polite',
  atomic = true,
  className = '',
  ariaAttributes = {},
}) => {
  const [message, setMessage] = useState('');
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear message after announcement to allow re-announcement
    const timer = setTimeout(() => {
      if (regionRef.current) {
        regionRef.current.textContent = '';
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [message]);

  const role = priority === 'assertive' ? 'alert' : 'status';
  const baseClassName = `sr-only live-region live-region-${priority} ${className}`.trim();

  return createPortal(
    <div
      ref={regionRef}
      role={role}
      aria-live={priority}
      aria-atomic={atomic}
      className={baseClassName}
      style={{ display: 'none' }}
      {...ariaAttributes}
    >
      {message}
    </div>,
    document.body
  );
};

/**
 * LiveRegionManager component
 * Manages multiple live regions for different priorities
 */
export const LiveRegionManager: React.FC<LiveRegionManagerProps> = ({ children }) => {
  const politeMessages = useRef<Map<string, LiveMessage>>(new Map());
  const assertiveMessages = useRef<Map<string, LiveMessage>>(new Map());
  const [currentPolite, setCurrentPolite] = useState<string>('');
  const [currentAssertive, setCurrentAssertive] = useState<string>('');

  /**
   * Announce a message
   */
  const announce = (message: string, priority: AnnouncementPriority = 'polite', id?: string): void => {
    const liveMessage: LiveMessage = {
      id: id || `msg-${Date.now()}`,
      message,
      priority,
      timestamp: Date.now(),
    };

    const messages = priority === 'assertive' ? assertiveMessages.current : politeMessages.current;

    // Check for duplicates
    if (messages.has(liveMessage.id)) {
      return;
    }

    messages.set(liveMessage.id, liveMessage);

    if (priority === 'assertive') {
      setCurrentAssertive(message);
    } else {
      setCurrentPolite(message);
    }
  };

  /**
   * Clear all messages
   */
  const clear = (): void => {
    politeMessages.current.clear();
    assertiveMessages.current.clear();
    setCurrentPolite('');
    setCurrentAssertive('');
  };

  // Provide context for children
  const contextValue = {
    announce,
    clear,
  };

  return (
    <>
      <LiveRegion priority="polite" message={currentPolite} />
      <LiveRegion priority="assertive" message={currentAssertive} />
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { ...contextValue } as any);
        }
        return child;
      })}
    </>
  );
};

/**
 * Announce component
 * Triggers an announcement when message changes
 */
export const Announce: React.FC<AnnounceProps> = ({
  message,
  priority = 'polite',
  duration = 5000,
  id,
}) => {
  const [previousMessage, setPreviousMessage] = useState<string>('');

  useEffect(() => {
    // Only announce if message has changed
    if (message !== previousMessage) {
      setPreviousMessage(message);

      // Clear after duration
      const timer = setTimeout(() => {
        setPreviousMessage('');
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, previousMessage, duration]);

  if (!message) {
    return null;
  }

  return <LiveRegion priority={priority} message={message} />;
};

/**
 * useLiveRegion hook
 * Provides live region functionality to components
 */
export const useLiveRegion = (defaultPriority: AnnouncementPriority = 'polite'): UseLiveRegionReturn => {
  const [currentMessage, setCurrentMessage] = useState<string>('');

  const announce = (message: string, priority: AnnouncementPriority = defaultPriority): void => {
    setCurrentMessage(message);

    // Clear message after announcement
    setTimeout(() => {
      setCurrentMessage('');
    }, 1000);
  };

  const clear = (): void => {
    setCurrentMessage('');
  };

  return {
    announce,
    clear,
    currentMessage,
  };
};

/**
 * withLiveRegion HOC
 * Adds live region functionality to a component
 */
export const withLiveRegion = <P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P & { announce?: (message: string, priority?: AnnouncementPriority) => void }> => {
  return (props) => {
    const { announce, clear, currentMessage } = useLiveRegion();

    return (
      <>
        <LiveRegion priority="polite" message={currentMessage} />
        <WrappedComponent {...(props as P)} announce={announce} />
      </>
    );
  };
};

/**
 * VisuallyHidden component
 * Hides content visually but keeps it available to screen readers
 */
export const VisuallyHidden: React.FC<{
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
}> = ({ children, as: Component = 'span', className = '' }) => {
  return (
    <Component
      className={`sr-only visually-hidden ${className}`.trim()}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}
    >
      {children}
    </Component>
  );
};

/**
 * FocusBoundary component
 * Announces when focus enters/exits a region
 */
export const FocusBoundary: React.FC<{
  children: React.ReactNode;
  label?: string;
  onFocusEnter?: () => void;
  onFocusLeave?: () => void;
}> = ({ children, label, onFocusEnter, onFocusLeave }) => {
  const [hasFocus, setHasFocus] = useState(false);
  const { announce } = useLiveRegion();

  const handleFocus = (event: React.FocusEvent<HTMLDivElement>): void => {
    if (!hasFocus) {
      setHasFocus(true);
      if (label) {
        announce(`Entered ${label}`);
      }
      if (onFocusEnter) {
        onFocusEnter();
      }
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>): void => {
    // Check if focus is still within the boundary
    const currentTarget = event.currentTarget;
    setTimeout(() => {
      if (!currentTarget.contains(document.activeElement)) {
        setHasFocus(false);
        if (label) {
          announce(`Left ${label}`);
        }
        if (onFocusLeave) {
          onFocusLeave();
        }
      }
    }, 0);
  };

  return (
    <div onFocus={handleFocus} onBlur={handleBlur} tabIndex={-1}>
      {children}
    </div>
  );
};

/**
 * LiveRegion styles (should be included in global CSS)
 */
export const liveRegionStyles = `
  .sr-only,
  .live-region,
  .visually-hidden {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border-width: 0 !important;
  }

  .sr-only:focus,
  .live-region:focus,
  .visually-hidden:focus {
    position: static !important;
    width: auto !important;
    height: auto !important;
    padding: inherit !important;
    margin: inherit !important;
    overflow: visible !important;
    clip: auto !important;
    white-space: normal !important;
  }
`;

export default LiveRegion;
