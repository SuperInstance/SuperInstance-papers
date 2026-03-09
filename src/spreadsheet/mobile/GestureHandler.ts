/**
 * POLLN Spreadsheet - GestureHandler
 *
 * Advanced touch gesture recognition system for mobile interactions.
 * Supports multi-touch gestures with configurable thresholds and callbacks.
 *
 * Gestures:
 * - Tap (short touch)
 * - Long press (extended touch)
 * - Swipe left/right (horizontal movement)
 * - Swipe up/down (vertical movement)
 * - Pinch in/out (zoom)
 * - Two-finger tap (context menu)
 * - Rotation (two-finger rotate)
 */

/**
 * Gesture types
 */
export type GestureType =
  | 'tap'
  | 'longPress'
  | 'swipeLeft'
  | 'swipeRight'
  | 'swipeUp'
  | 'swipeDown'
  | 'pinchIn'
  | 'pinchOut'
  | 'twoFingerTap'
  | 'rotate'
  | 'pan'
  | 'none';

/**
 * Gesture event data
 */
export interface GestureEvent {
  gesture: GestureType;
  cellId?: string;
  position?: { row: number; col: number };
  touches: number;
  coordinates: { x: number; y: number };
  delta?: { x: number; y: number };
  scale?: number;
  rotation?: number;
  velocity?: number;
}

/**
 * Gesture handler configuration
 */
export interface GestureHandlerConfig {
  element: HTMLElement;
  onGesture: (event: GestureEvent) => void;
  enableSwipe?: boolean;
  enablePinch?: boolean;
  enableLongPress?: boolean;
  enableTwoFingerTap?: boolean;
  enableRotation?: boolean;
  enablePan?: boolean;
  tapThreshold?: number;
  longPressDelay?: number;
  swipeThreshold?: number;
  pinchThreshold?: number;
  rotationThreshold?: number;
  maxTapDuration?: number;
  maxTapMovement?: number;
  preventDefault?: boolean;
  stopPropagation?: boolean;
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
  currentGesture: GestureType;
  longPressTimer: number | null;
  initialDistance: number;
  initialAngle: number;
  lastDistance: number;
  lastAngle: number;
  scale: number;
  rotation: number;
  velocity: { x: number; y: number };
}

/**
 * GestureHandler - Touch gesture recognition
 *
 * Provides comprehensive gesture recognition for mobile interfaces.
 * Optimized for performance with minimal overhead.
 */
export class GestureHandler {
  private config: Required<GestureHandlerConfig>;
  private state: GestureState;
  private bound: boolean = false;
  private destroyed: boolean = false;

  // Event handlers
  private handleTouchStart: (e: TouchEvent) => void;
  private handleTouchMove: (e: TouchEvent) => void;
  private handleTouchEnd: (e: TouchEvent) => void;
  private handleTouchCancel: (e: TouchEvent) => void;

  // Performance monitoring
  private lastGestureTime: number = 0;
  private gestureCount: number = 0;

  constructor(config: GestureHandlerConfig) {
    this.config = {
      enableSwipe: true,
      enablePinch: true,
      enableLongPress: true,
      enableTwoFingerTap: true,
      enableRotation: false,
      enablePan: false,
      tapThreshold: 10,
      longPressDelay: 500,
      swipeThreshold: 50,
      pinchThreshold: 10,
      rotationThreshold: 10,
      maxTapDuration: 300,
      maxTapMovement: 10,
      preventDefault: false,
      stopPropagation: false,
      ...config,
    };

    this.state = {
      activeTouches: new Map(),
      currentGesture: 'none',
      longPressTimer: null,
      initialDistance: 0,
      initialAngle: 0,
      lastDistance: 0,
      lastAngle: 0,
      scale: 1,
      rotation: 0,
      velocity: { x: 0, y: 0 },
    };

    // Bind event handlers
    this.handleTouchStart = this.onTouchStart.bind(this);
    this.handleTouchMove = this.onTouchMove.bind(this);
    this.handleTouchEnd = this.onTouchEnd.bind(this);
    this.handleTouchCancel = this.onTouchCancel.bind(this);

    this.attach();
  }

  /**
   * Attach event listeners to the element
   */
  private attach(): void {
    if (this.destroyed) return;

    const element = this.config.element;
    element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });

    this.bound = true;
  }

  /**
   * Detach event listeners
   */
  private detach(): void {
    const element = this.config.element;
    element.removeEventListener('touchstart', this.handleTouchStart);
    element.removeEventListener('touchmove', this.handleTouchMove);
    element.removeEventListener('touchend', this.handleTouchEnd);
    element.removeEventListener('touchcancel', this.handleTouchCancel);

    this.bound = false;
  }

  /**
   * Handle touch start
   */
  private onTouchStart(e: TouchEvent): void {
    if (this.destroyed) return;

    if (this.config.preventDefault) {
      e.preventDefault();
    }
    if (this.config.stopPropagation) {
      e.stopPropagation();
    }

    const now = Date.now();
    const touchCount = e.touches.length;

    // Record touch points
    for (let i = 0; i < touchCount; i++) {
      const touch = e.touches[i];
      this.state.activeTouches.set(touch.identifier, {
        identifier: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        timestamp: now,
      });
    }

    // Handle multi-touch gestures
    if (touchCount === 1 && this.config.enableLongPress) {
      // Start long press timer
      this.state.longPressTimer = window.setTimeout(() => {
        this.detectLongPress();
      }, this.config.longPressDelay);
    } else if (touchCount === 2) {
      // Clear long press timer
      this.clearLongPressTimer();

      // Initialize pinch/rotation
      this.initializeMultiTouch();
    }
  }

  /**
   * Handle touch move
   */
  private onTouchMove(e: TouchEvent): void {
    if (this.destroyed) return;

    if (this.config.preventDefault) {
      e.preventDefault();
    }
    if (this.config.stopPropagation) {
      e.stopPropagation();
    }

    const now = Date.now();
    const touchCount = e.touches.length;

    // Update touch points and calculate velocity
    for (let i = 0; i < touchCount; i++) {
      const touch = e.touches[i];
      const touchPoint = this.state.activeTouches.get(touch.identifier);

      if (touchPoint) {
        const deltaX = touch.clientX - touchPoint.lastX;
        const deltaY = touch.clientY - touchPoint.lastY;

        // Calculate velocity (pixels per ms)
        const deltaTime = now - touchPoint.timestamp;
        this.state.velocity.x = deltaX / (deltaTime || 1);
        this.state.velocity.y = deltaY / (deltaTime || 1);

        touchPoint.lastX = touch.clientX;
        touchPoint.lastY = touch.clientY;
        touchPoint.timestamp = now;

        this.state.activeTouches.set(touch.identifier, touchPoint);
      }
    }

    // Clear long press timer if moved too much
    if (touchCount === 1 && this.state.longPressTimer !== null) {
      const touch = e.touches[0];
      const touchPoint = this.state.activeTouches.get(touch.identifier);

      if (touchPoint) {
        const movement = Math.hypot(
          touch.clientX - touchPoint.startX,
          touch.clientY - touchPoint.startY
        );

        if (movement > this.config.maxTapMovement) {
          this.clearLongPressTimer();
        }
      }
    }

    // Handle multi-touch gestures
    if (touchCount === 2) {
      this.handleMultiTouchMove();
    }
  }

  /**
   * Handle touch end
   */
  private onTouchEnd(e: TouchEvent): void {
    if (this.destroyed) return;

    if (this.config.preventDefault) {
      e.preventDefault();
    }
    if (this.config.stopPropagation) {
      e.stopPropagation();
    }

    // Remove ended touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.state.activeTouches.delete(touch.identifier);
    }

    const remainingTouches = e.touches.length;
    const wasMultiTouch = this.state.activeTouches.size + e.changedTouches.length === 2;

    // Detect gesture based on touch count
    if (remainingTouches === 0) {
      // All touches ended - detect final gesture
      this.detectFinalGesture(e.changedTouches[0]);
    } else if (remainingTouches === 1 && wasMultiTouch) {
      // Two-finger gesture ended
      this.detectMultiTouchEnd();
    }

    // Clear long press timer
    this.clearLongPressTimer();

    // Reset multi-touch state
    if (remainingTouches < 2) {
      this.resetMultiTouchState();
    }
  }

  /**
   * Handle touch cancel
   */
  private onTouchCancel(e: TouchEvent): void {
    if (this.destroyed) return;

    // Cancel all active touches
    this.state.activeTouches.clear();
    this.clearLongPressTimer();
    this.resetMultiTouchState();
    this.state.currentGesture = 'none';
  }

  /**
   * Detect long press gesture
   */
  private detectLongPress(): void {
    if (this.state.activeTouches.size !== 1) return;

    const touchPoint = Array.from(this.state.activeTouches.values())[0];
    const movement = Math.hypot(
      touchPoint.lastX - touchPoint.startX,
      touchPoint.lastY - touchPoint.startY
    );

    if (movement <= this.config.maxTapMovement) {
      this.state.currentGesture = 'longPress';
      this.emitGesture('longPress', {
        touches: 1,
        coordinates: { x: touchPoint.lastX, y: touchPoint.lastY },
      });
    }

    this.clearLongPressTimer();
  }

  /**
   * Detect final gesture (tap, swipe, etc.)
   */
  private detectFinalGesture(touch: Touch): void {
    const touchPoint = this.state.activeTouches.get(touch.identifier);

    if (!touchPoint) {
      return;
    }

    const deltaX = touch.clientX - touchPoint.startX;
    const deltaY = touch.clientY - touchPoint.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const duration = Date.now() - touchPoint.timestamp;

    // Check for tap
    if (absDeltaX <= this.config.maxTapMovement &&
        absDeltaY <= this.config.maxTapMovement &&
        duration <= this.config.maxTapDuration) {
      this.state.currentGesture = 'tap';
      this.emitGesture('tap', {
        touches: 1,
        coordinates: { x: touch.clientX, y: touch.clientY },
      });
      return;
    }

    // Check for swipe
    if (this.config.enableSwipe && duration < 500) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (absDeltaX > this.config.swipeThreshold) {
          this.state.currentGesture = deltaX > 0 ? 'swipeRight' : 'swipeLeft';
          this.emitGesture(this.state.currentGesture, {
            touches: 1,
            coordinates: { x: touch.clientX, y: touch.clientY },
            delta: { x: deltaX, y: deltaY },
            velocity: Math.abs(this.state.velocity.x),
          });
        }
      } else {
        // Vertical swipe
        if (absDeltaY > this.config.swipeThreshold) {
          this.state.currentGesture = deltaY > 0 ? 'swipeDown' : 'swipeUp';
          this.emitGesture(this.state.currentGesture, {
            touches: 1,
            coordinates: { x: touch.clientX, y: touch.clientY },
            delta: { x: deltaX, y: deltaY },
            velocity: Math.abs(this.state.velocity.y),
          });
        }
      }
    }
  }

  /**
   * Initialize multi-touch gesture
   */
  private initializeMultiTouch(): void {
    const touches = Array.from(this.state.activeTouches.values());

    if (touches.length === 2) {
      const touch1 = touches[0];
      const touch2 = touches[1];

      // Calculate initial distance
      this.state.initialDistance = Math.hypot(
        touch2.lastX - touch1.lastX,
        touch2.lastY - touch1.lastY
      );
      this.state.lastDistance = this.state.initialDistance;

      // Calculate initial angle
      this.state.initialAngle = Math.atan2(
        touch2.lastY - touch1.lastY,
        touch2.lastX - touch1.lastX
      );
      this.state.lastAngle = this.state.initialAngle;

      this.state.scale = 1;
      this.state.rotation = 0;
    }
  }

  /**
   * Handle multi-touch move
   */
  private handleMultiTouchMove(): void {
    const touches = Array.from(this.state.activeTouches.values());

    if (touches.length !== 2) return;

    const touch1 = touches[0];
    const touch2 = touches[1];

    // Calculate current distance
    const currentDistance = Math.hypot(
      touch2.lastX - touch1.lastX,
      touch2.lastY - touch1.lastY
    );

    // Calculate current angle
    const currentAngle = Math.atan2(
      touch2.lastY - touch1.lastY,
      touch2.lastX - touch1.lastX
    );

    // Update scale
    const scaleChange = currentDistance - this.state.lastDistance;
    if (Math.abs(scaleChange) > this.config.pinchThreshold) {
      this.state.scale = currentDistance / this.state.initialDistance;

      if (this.state.scale < 0.9) {
        this.state.currentGesture = 'pinchIn';
      } else if (this.state.scale > 1.1) {
        this.state.currentGesture = 'pinchOut';
      }

      this.state.lastDistance = currentDistance;
    }

    // Update rotation
    if (this.config.enableRotation) {
      const angleDelta = currentAngle - this.state.lastAngle;
      if (Math.abs(angleDelta) > this.config.rotationThreshold * (Math.PI / 180)) {
        this.state.rotation += angleDelta;
        this.state.lastAngle = currentAngle;

        if (Math.abs(this.state.rotation) > this.config.rotationThreshold * (Math.PI / 180)) {
          this.state.currentGesture = 'rotate';
        }
      }
    }
  }

  /**
   * Detect multi-touch end gesture
   */
  private detectMultiTouchEnd(): void {
    if (this.state.currentGesture === 'pinchIn') {
      this.emitGesture('pinchIn', {
        touches: 2,
        coordinates: this.getCenterPoint(),
        scale: this.state.scale,
      });
    } else if (this.state.currentGesture === 'pinchOut') {
      this.emitGesture('pinchOut', {
        touches: 2,
        coordinates: this.getCenterPoint(),
        scale: this.state.scale,
      });
    } else if (this.config.enableTwoFingerTap && this.state.currentGesture === 'none') {
      // Check for two-finger tap (both fingers barely moved)
      const touches = Array.from(this.state.activeTouches.values());
      const touch1 = touches[0];
      const touch2 = touches[1];

      const movement1 = Math.hypot(
        touch1.lastX - touch1.startX,
        touch1.lastY - touch1.startY
      );
      const movement2 = Math.hypot(
        touch2.lastX - touch2.startX,
        touch2.lastY - touch2.startY
      );

      if (movement1 < this.config.maxTapMovement && movement2 < this.config.maxTapMovement) {
        this.emitGesture('twoFingerTap', {
          touches: 2,
          coordinates: this.getCenterPoint(),
        });
      }
    }

    this.resetMultiTouchState();
  }

  /**
   * Get center point of all active touches
   */
  private getCenterPoint(): { x: number; y: number } {
    const touches = Array.from(this.state.activeTouches.values());

    if (touches.length === 0) {
      return { x: 0, y: 0 };
    }

    const sumX = touches.reduce((sum, t) => sum + t.lastX, 0);
    const sumY = touches.reduce((sum, t) => sum + t.lastY, 0);

    return {
      x: sumX / touches.length,
      y: sumY / touches.length,
    };
  }

  /**
   * Reset multi-touch state
   */
  private resetMultiTouchState(): void {
    this.state.initialDistance = 0;
    this.state.lastDistance = 0;
    this.state.initialAngle = 0;
    this.state.lastAngle = 0;
    this.state.scale = 1;
    this.state.rotation = 0;

    if (this.state.activeTouches.size < 2) {
      this.state.currentGesture = 'none';
    }
  }

  /**
   * Clear long press timer
   */
  private clearLongPressTimer(): void {
    if (this.state.longPressTimer !== null) {
      clearTimeout(this.state.longPressTimer);
      this.state.longPressTimer = null;
    }
  }

  /**
   * Emit gesture event
   */
  private emitGesture(gesture: GestureType, data: Partial<GestureEvent>): void {
    const event: GestureEvent = {
      gesture,
      touches: data.touches || 0,
      coordinates: data.coordinates || { x: 0, y: 0 },
      delta: data.delta,
      scale: data.scale,
      rotation: data.rotation,
      velocity: data.velocity,
    };

    // Extract cell information from coordinates
    const element = document.elementFromPoint(event.coordinates.x, event.coordinates.y);
    if (element) {
      const cellElement = element.closest('[data-cell-id]');
      if (cellElement) {
        event.cellId = cellElement.getAttribute('data-cell-id') || undefined;
        const row = cellElement.getAttribute('data-row');
        const col = cellElement.getAttribute('data-col');
        if (row && col) {
          event.position = { row: parseInt(row), col: parseInt(col) };
        }
      }
    }

    this.config.onGesture(event);

    // Update performance metrics
    this.lastGestureTime = Date.now();
    this.gestureCount++;
  }

  /**
   * Get gesture statistics
   */
  public getStats() {
    return {
      gestureCount: this.gestureCount,
      lastGestureTime: this.lastGestureTime,
      currentGesture: this.state.currentGesture,
      activeTouches: this.state.activeTouches.size,
    };
  }

  /**
   * Reset gesture handler state
   */
  public reset(): void {
    this.clearLongPressTimer();
    this.resetMultiTouchState();
    this.state.activeTouches.clear();
    this.state.currentGesture = 'none';
  }

  /**
   * Destroy the gesture handler
   */
  public destroy(): void {
    this.detach();
    this.clearLongPressTimer();
    this.reset();
    this.destroyed = true;
  }
}

export default GestureHandler;
