/**
 * POLLN Spreadsheet - useTouchGestures Hook
 *
 * React hook for handling touch gestures on elements.
 * Provides a comprehensive set of touch gesture callbacks with
 * configurable thresholds and debouncing.
 */

import { useRef, useEffect, useCallback, RefObject } from 'react';
import type { TouchGestures, SwipeDirection } from './types';

/**
 * Touch gesture handler configuration
 */
interface TouchGestureHandlerConfig {
  swipeThreshold?: number;
  pinchThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  maxTapDuration?: number;
  maxTapMovement?: number;
  preventDefault?: boolean;
  enableHapticFeedback?: boolean;
}

/**
 * Touch point data
 */
interface TouchPoint {
  identifier: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  timestamp: number;
}

/**
 * Gesture state
 */
interface GestureState {
  activeTouches: Map<number, TouchPoint>;
  lastTapTime: number;
  lastTapPosition: { x: number; y: number } | null;
  longPressTimer: number | null;
  initialDistance: number;
  currentScale: number;
  isGestureActive: boolean;
}

/**
 * useTouchGestures hook
 *
 * Provides comprehensive touch gesture handling for React components.
 * Supports tap, double tap, long press, swipe, pinch, and pan gestures.
 *
 * @param elementRef - Reference to the element to attach gestures to
 * @param callbacks - Gesture callback functions
 * @param config - Optional configuration
 * @returns TouchGestures interface with gesture controls
 *
 * @example
 * ```tsx
 * const elementRef = useRef<HTMLDivElement>(null);
 * const gestures = useTouchGestures(elementRef, {
 *   onSwipe: (direction) => console.log('Swiped:', direction),
 *   onPinch: (scale) => console.log('Pinched:', scale),
 *   onLongPress: () => console.log('Long pressed'),
 *   onDoubleTap: () => console.log('Double tapped'),
 * });
 * ```
 */
export function useTouchGestures(
  elementRef: RefObject<HTMLElement>,
  callbacks: {
    onSwipe?: (direction: SwipeDirection) => void;
    onPinch?: (scale: number) => void;
    onLongPress?: () => void;
    onDoubleTap?: () => void;
    onPan?: (deltaX: number, deltaY: number) => void;
    onTap?: () => void;
  },
  config: TouchGestureHandlerConfig = {}
): TouchGestures {
  const {
    swipeThreshold = 50,
    pinchThreshold = 10,
    longPressDelay = 500,
    doubleTapDelay = 300,
    maxTapDuration = 300,
    maxTapMovement = 10,
    preventDefault = false,
    enableHapticFeedback = false,
  } = config;

  const stateRef = useRef<GestureState>({
    activeTouches: new Map(),
    lastTapTime: 0,
    lastTapPosition: null,
    longPressTimer: null,
    initialDistance: 0,
    currentScale: 1,
    isGestureActive: false,
  });

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  /**
   * Trigger haptic feedback if available
   */
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, [enableHapticFeedback]);

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!elementRef.current?.contains(e.target as Node)) return;

    const now = Date.now();
    const touchCount = e.touches.length;

    if (preventDefault) {
      e.preventDefault();
    }

    // Record all touch points
    for (let i = 0; i < touchCount; i++) {
      const touch = e.touches[i];
      stateRef.current.activeTouches.set(touch.identifier, {
        identifier: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        timestamp: now,
      });
    }

    // Handle single touch
    if (touchCount === 1) {
      const touch = e.touches[0];
      const touchPoint = stateRef.current.activeTouches.get(touch.identifier)!;

      // Start long press timer
      stateRef.current.longPressTimer = window.setTimeout(() => {
        const movement = Math.hypot(
          touch.clientX - touchPoint.startX,
          touch.clientY - touchPoint.startY
        );

        if (movement <= maxTapMovement && !stateRef.current.isGestureActive) {
          stateRef.current.isGestureActive = true;
          triggerHaptic([20, 50, 20]);
          callbacksRef.current.onLongPress?.();
        }
      }, longPressDelay);
    }

    // Handle two-finger gestures (pinch)
    if (touchCount === 2) {
      // Clear long press timer
      if (stateRef.current.longPressTimer) {
        clearTimeout(stateRef.current.longPressTimer);
        stateRef.current.longPressTimer = null;
      }

      // Calculate initial distance
      const touch1 = stateRef.current.activeTouches.get(e.touches[0].identifier)!;
      const touch2 = stateRef.current.activeTouches.get(e.touches[1].identifier)!;

      stateRef.current.initialDistance = Math.hypot(
        touch2.lastX - touch1.lastX,
        touch2.lastY - touch1.lastY
      );
    }
  }, [elementRef, preventDefault, longPressDelay, maxTapMovement, triggerHaptic]);

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!elementRef.current?.contains(e.target as Node)) return;

    const touchCount = e.touches.length;

    if (preventDefault && touchCount < 2) {
      // Don't prevent default for pinch gestures
      e.preventDefault();
    }

    // Update touch points
    for (let i = 0; i < touchCount; i++) {
      const touch = e.touches[i];
      const touchPoint = stateRef.current.activeTouches.get(touch.identifier);

      if (touchPoint) {
        touchPoint.lastX = touch.clientX;
        touchPoint.lastY = touch.clientY;
        stateRef.current.activeTouches.set(touch.identifier, touchPoint);
      }
    }

    // Clear long press timer if moved too much
    if (touchCount === 1 && stateRef.current.longPressTimer) {
      const touch = e.touches[0];
      const touchPoint = stateRef.current.activeTouches.get(touch.identifier);

      if (touchPoint) {
        const movement = Math.hypot(
          touch.clientX - touchPoint.startX,
          touch.clientY - touchPoint.startY
        );

        if (movement > maxTapMovement) {
          clearTimeout(stateRef.current.longPressTimer);
          stateRef.current.longPressTimer = null;
        }
      }
    }

    // Handle pinch gesture
    if (touchCount === 2) {
      const touch1 = stateRef.current.activeTouches.get(e.touches[0].identifier);
      const touch2 = stateRef.current.activeTouches.get(e.touches[1].identifier);

      if (touch1 && touch2) {
        const currentDistance = Math.hypot(
          touch2.lastX - touch1.lastX,
          touch2.lastY - touch1.lastY
        );

        const scale = currentDistance / stateRef.current.initialDistance;
        const scaleDelta = Math.abs(scale - stateRef.current.currentScale);

        if (scaleDelta > pinchThreshold / 100) {
          stateRef.current.currentScale = scale;
          callbacksRef.current.onPinch?.(scale);
        }
      }
    }

    // Handle pan gesture
    if (touchCount === 1 && !stateRef.current.longPressTimer) {
      const touch = e.touches[0];
      const touchPoint = stateRef.current.activeTouches.get(touch.identifier);

      if (touchPoint) {
        const deltaX = touch.clientX - touchPoint.startX;
        const deltaY = touch.clientY - touchPoint.startY;

        if (Math.abs(deltaX) > maxTapMovement || Math.abs(deltaY) > maxTapMovement) {
          callbacksRef.current.onPan?.(deltaX, deltaY);
        }
      }
    }
  }, [elementRef, preventDefault, maxTapMovement, pinchThreshold]);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!elementRef.current?.contains(e.target as Node)) return;

    const now = Date.now();

    // Clear long press timer
    if (stateRef.current.longPressTimer) {
      clearTimeout(stateRef.current.longPressTimer);
      stateRef.current.longPressTimer = null;
    }

    // Process ended touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchPoint = stateRef.current.activeTouches.get(touch.identifier);

      if (touchPoint) {
        const duration = now - touchPoint.timestamp;
        const deltaX = touch.clientX - touchPoint.startX;
        const deltaY = touch.clientY - touchPoint.startY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        const movement = Math.hypot(deltaX, deltaY);

        // Detect tap
        if (movement <= maxTapMovement && duration <= maxTapDuration) {
          // Check for double tap
          const timeSinceLastTap = now - stateRef.current.lastTapTime;
          const positionMatch = stateRef.current.lastTapPosition
            ? Math.hypot(
                touch.clientX - stateRef.current.lastTapPosition.x,
                touch.clientY - stateRef.current.lastTapPosition.y
              ) < maxTapMovement
            : false;

          if (timeSinceLastTap < doubleTapDelay && positionMatch) {
            // Double tap detected
            stateRef.current.isGestureActive = true;
            triggerHaptic(10);
            callbacksRef.current.onDoubleTap?.();
          } else {
            // Single tap detected
            triggerHaptic(10);
            callbacksRef.current.onTap?.();
          }

          stateRef.current.lastTapTime = now;
          stateRef.current.lastTapPosition = { x: touch.clientX, y: touch.clientY };
        }

        // Detect swipe
        if (!stateRef.current.isGestureActive && duration < 500) {
          if (absDeltaX > absDeltaY && absDeltaX > swipeThreshold) {
            // Horizontal swipe
            const direction: SwipeDirection = deltaX > 0 ? 'right' : 'left';
            stateRef.current.isGestureActive = true;
            triggerHaptic(15);
            callbacksRef.current.onSwipe?.(direction);
          } else if (absDeltaY > absDeltaX && absDeltaY > swipeThreshold) {
            // Vertical swipe
            const direction: SwipeDirection = deltaY > 0 ? 'down' : 'up';
            stateRef.current.isGestureActive = true;
            triggerHaptic(15);
            callbacksRef.current.onSwipe?.(direction);
          }
        }

        stateRef.current.activeTouches.delete(touch.identifier);
      }
    }

    // Reset state if no touches remain
    if (e.touches.length === 0) {
      stateRef.current.isGestureActive = false;
      stateRef.current.currentScale = 1;
    }
  }, [elementRef, maxTapMovement, maxTapDuration, doubleTapDelay, swipeThreshold, triggerHaptic]);

  /**
   * Reset gesture state
   */
  const reset = useCallback(() => {
    if (stateRef.current.longPressTimer) {
      clearTimeout(stateRef.current.longPressTimer);
      stateRef.current.longPressTimer = null;
    }

    stateRef.current.activeTouches.clear();
    stateRef.current.lastTapTime = 0;
    stateRef.current.lastTapPosition = null;
    stateRef.current.currentScale = 1;
    stateRef.current.isGestureActive = false;
  }, []);

  /**
   * Attach event listeners
   */
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Use passive option for better performance when preventDefault is false
    const options: AddEventListenerOptions = { passive: !preventDefault };

    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);
    element.addEventListener('touchcancel', reset, options);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', reset);
      reset();
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd, reset, preventDefault]);

  return {
    onSwipe: callbacks.onSwipe || (() => {}),
    onPinch: callbacks.onPinch || (() => {}),
    onLongPress: callbacks.onLongPress || (() => {}),
    onDoubleTap: callbacks.onDoubleTap || (() => {}),
    isActive: () => stateRef.current.isGestureActive,
    reset,
  };
}

export default useTouchGestures;
