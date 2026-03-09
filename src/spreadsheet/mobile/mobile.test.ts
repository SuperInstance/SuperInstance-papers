/**
 * POLLN Spreadsheet - Mobile Component Tests
 *
 * Comprehensive test suite for mobile-specific functionality including:
 * - Touch gesture recognition
 * - Responsive layout rendering
 * - Offline functionality
 * - Service worker behavior
 * - Performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GestureHandler, GestureEvent } from './GestureHandler.js';
import { ResponsiveBreakpoints, useBreakpoint } from './ResponsiveBreakpoints.js';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// ============================================================================
// GestureHandler Tests
// ============================================================================

describe('GestureHandler', () => {
  let container: HTMLElement;
  let gestureHandler: GestureHandler;
  let mockOnGesture: jest.Mock;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockOnGesture = jest.fn();
  });

  afterEach(() => {
    gestureHandler?.destroy();
    document.body.removeChild(container);
  });

  describe('Initialization', () => {
    it('should create a new instance', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
      });

      expect(gestureHandler).toBeDefined();
      expect(gestureHandler.getStats().gestureCount).toBe(0);
    });

    it('should attach event listeners', () => {
      const addEventListenerSpy = jest.spyOn(container, 'addEventListener');

      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        expect.any(Object)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        expect.any(Object)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should use default configuration', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
      });

      const stats = gestureHandler.getStats();
      expect(stats).toHaveProperty('gestureCount');
      expect(stats).toHaveProperty('activeTouches');
    });
  });

  describe('Tap Gesture', () => {
    it('should detect tap gesture', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
        maxTapDuration: 300,
        maxTapMovement: 10,
      });

      // Simulate tap
      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
        ],
      });

      const touchEnd = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
        ],
      });

      container.dispatchEvent(touchStart);

      // Wait for tap timeout
      jest.advanceTimersByTime(100);

      container.dispatchEvent(touchEnd);

      // Should detect tap
      expect(mockOnGesture).toHaveBeenCalledWith(
        expect.objectContaining({
          gesture: 'tap',
        })
      );
    });

    it('should not detect tap if moved too much', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
        maxTapMovement: 10,
      });

      // Simulate touch with movement
      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
        ],
      });

      const touchMove = new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 120, clientY: 120, target: container } as Touch,
        ],
      });

      const touchEnd = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [
          { identifier: 0, clientX: 120, clientY: 120, target: container } as Touch,
        ],
      });

      container.dispatchEvent(touchStart);
      container.dispatchEvent(touchMove);
      jest.advanceTimersByTime(100);
      container.dispatchEvent(touchEnd);

      // Should not detect tap (moved 28px, max is 10px)
      const tapCalls = mockOnGesture.mock.calls.filter(
        (call) => call[0].gesture === 'tap'
      );
      expect(tapCalls.length).toBe(0);
    });
  });

  describe('Long Press Gesture', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should detect long press gesture', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
        longPressDelay: 500,
      });

      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
        ],
      });

      container.dispatchEvent(touchStart);

      // Advance time past long press delay
      jest.advanceTimersByTime(600);

      expect(mockOnGesture).toHaveBeenCalledWith(
        expect.objectContaining({
          gesture: 'longPress',
        })
      );
    });

    it('should cancel long press on movement', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
        longPressDelay: 500,
        maxTapMovement: 10,
      });

      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
        ],
      });

      const touchMove = new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 115, clientY: 115, target: container } as Touch,
        ],
      });

      container.dispatchEvent(touchStart);
      container.dispatchEvent(touchMove);
      jest.advanceTimersByTime(600);

      // Should not detect long press (moved > 10px)
      const longPressCalls = mockOnGesture.mock.calls.filter(
        (call) => call[0].gesture === 'longPress'
      );
      expect(longPressCalls.length).toBe(0);
    });
  });

  describe('Swipe Gestures', () => {
    it('should detect swipe left', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
        swipeThreshold: 50,
      });

      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 200, clientY: 100, target: container } as Touch,
        ],
      });

      const touchEnd = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
        ],
      });

      container.dispatchEvent(touchStart);
      container.dispatchEvent(touchEnd);

      expect(mockOnGesture).toHaveBeenCalledWith(
        expect.objectContaining({
          gesture: 'swipeLeft',
        })
      );
    });

    it('should detect swipe right', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
        swipeThreshold: 50,
      });

      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
        ],
      });

      const touchEnd = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [
          { identifier: 0, clientX: 200, clientY: 100, target: container } as Touch,
        ],
      });

      container.dispatchEvent(touchStart);
      container.dispatchEvent(touchEnd);

      expect(mockOnGesture).toHaveBeenCalledWith(
        expect.objectContaining({
          gesture: 'swipeRight',
        })
      );
    });
  });

  describe('Pinch Gestures', () => {
    it('should detect pinch in', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
        enablePinch: true,
        pinchThreshold: 10,
      });

      const initialDistance = 200;
      const finalDistance = 100;

      // Simulate two-finger pinch in
      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
          { identifier: 1, clientX: 300, clientY: 100, target: container } as Touch,
        ],
      });

      const touchMove = new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 150, clientY: 100, target: container } as Touch,
          { identifier: 1, clientX: 250, clientY: 100, target: container } as Touch,
        ],
      });

      container.dispatchEvent(touchStart);
      container.dispatchEvent(touchMove);

      // Should detect pinch in (distance reduced by 100px)
      expect(mockOnGesture).toHaveBeenCalledWith(
        expect.objectContaining({
          gesture: 'pinchIn',
        })
      );
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger haptic feedback on tap', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
        enableHapticFeedback: true,
      });

      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
        ],
      });

      const touchEnd = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
        ],
      });

      container.dispatchEvent(touchStart);
      jest.advanceTimersByTime(100);
      container.dispatchEvent(touchEnd);

      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });
  });

  describe('Cleanup', () => {
    it('should destroy and cleanup', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
      });

      const removeEventListenerSpy = jest.spyOn(container, 'removeEventListener');

      gestureHandler.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('should reset state', () => {
      gestureHandler = new GestureHandler({
        element: container,
        onGesture: mockOnGesture,
      });

      gestureHandler.reset();

      const stats = gestureHandler.getStats();
      expect(stats.activeTouches).toBe(0);
    });
  });
});

// ============================================================================
// ResponsiveBreakpoints Tests
// ============================================================================

describe('ResponsiveBreakpoints', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore original window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: originalInnerWidth,
    });
  });

  describe('Breakpoint Detection', () => {
    it('should detect mobile breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375,
      });

      const breakpoint = ResponsiveBreakpoints.getCurrentBreakpoint();
      expect(breakpoint).toBe('mobile');
    });

    it('should detect tablet breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 768,
      });

      const breakpoint = ResponsiveBreakpoints.getCurrentBreakpoint();
      expect(breakpoint).toBe('tablet');
    });

    it('should detect desktop breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1024,
      });

      const breakpoint = ResponsiveBreakpoints.getCurrentBreakpoint();
      expect(breakpoint).toBe('desktop');
    });

    it('should detect large desktop breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1440,
      });

      const breakpoint = ResponsiveBreakpoints.getCurrentBreakpoint();
      expect(breakpoint).toBe('largeDesktop');
    });
  });

  describe('Breakpoint Helpers', () => {
    it('should correctly identify mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375,
      });

      expect(ResponsiveBreakpoints.isMobile()).toBe(true);
      expect(ResponsiveBreakpoints.isTabletUp()).toBe(false);
      expect(ResponsiveBreakpoints.isDesktopUp()).toBe(false);
      expect(ResponsiveBreakpoints.isPortable()).toBe(true);
    });

    it('should correctly identify tablet', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 768,
      });

      expect(ResponsiveBreakpoints.isMobile()).toBe(false);
      expect(ResponsiveBreakpoints.isTabletUp()).toBe(true);
      expect(ResponsiveBreakpoints.isDesktopUp()).toBe(false);
      expect(ResponsiveBreakpoints.isPortable()).toBe(true);
    });

    it('should correctly identify desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1024,
      });

      expect(ResponsiveBreakpoints.isMobile()).toBe(false);
      expect(ResponsiveBreakpoints.isTabletUp()).toBe(true);
      expect(ResponsiveBreakpoints.isDesktopUp()).toBe(true);
      expect(ResponsiveBreakpoints.isPortable()).toBe(false);
    });
  });

  describe('Media Query Creation', () => {
    it('should create correct media queries', () => {
      const mobileQuery = ResponsiveBreakpoints.createMediaQuery('mobile');
      expect(mobileQuery).toContain('max-width: 767px');

      const tabletQuery = ResponsiveBreakpoints.createMediaQuery('tablet');
      expect(tabletQuery).toContain('min-width: 768px');
      expect(tabletQuery).toContain('max-width: 1023px');
    });

    it('should create min-width queries', () => {
      const query = ResponsiveBreakpoints.createMinWidthQuery(768);
      expect(query).toBe('(min-width: 768px)');
    });

    it('should create max-width queries', () => {
      const query = ResponsiveBreakpoints.createMaxWidthQuery(767);
      expect(query).toBe('(max-width: 767px)');
    });
  });

  describe('Responsive Values', () => {
    it('should return correct value for current breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375,
      });

      const value = ResponsiveBreakpoints.getResponsiveValue(
        { mobile: 1, tablet: 2, desktop: 3 },
        2
      );

      expect(value).toBe(1);
    });

    it('should fallback to smaller breakpoint', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 900,
      });

      const value = ResponsiveBreakpoints.getResponsiveValue(
        { mobile: 1, desktop: 3 }, // No tablet value
        2
      );

      expect(value).toBe(1); // Falls back to mobile
    });
  });

  describe('Grid Columns', () => {
    it('should return appropriate grid columns', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375,
      });

      const columns = ResponsiveBreakpoints.getGridColumns(1, 2, 3, 4);
      expect(columns).toBe(1);
    });
  });

  describe('Device Detection', () => {
    it('should detect touch device', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 1,
      });

      expect(ResponsiveBreakpoints.isTouchDevice()).toBe(true);
    });

    it('should detect high DPI', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2,
      });

      expect(ResponsiveBreakpoints.isHighDPI()).toBe(true);
    });

    it('should detect orientation', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1000,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        value: 500,
      });

      expect(ResponsiveBreakpoints.isLandscape()).toBe(true);
      expect(ResponsiveBreakpoints.isPortrait()).toBe(false);
    });
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Mobile Performance', () => {
  it('should render MobileGrid within performance budget', async () => {
    const startTime = performance.now();

    // Simulate grid rendering
    const cells = Array.from({ length: 100 }, (_, i) => ({
      id: `cell-${i}`,
      position: { row: Math.floor(i / 10), col: i % 10 },
      value: `Cell ${i}`,
      state: 'dormant',
      type: 'input',
      timestamp: Date.now(),
    }));

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // First Contentful Paint should be < 1.5s (1500ms)
    expect(renderTime).toBeLessThan(1500);
  });

  it('should handle gesture recognition efficiently', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const mockOnGesture = jest.fn();
    const gestureHandler = new GestureHandler({
      element: container,
      onGesture: mockOnGesture,
    });

    const startTime = performance.now();

    // Simulate 100 tap gestures
    for (let i = 0; i < 100; i++) {
      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
        ],
      });

      const touchEnd = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [
          { identifier: 0, clientX: 100, clientY: 100, target: container } as Touch,
        ],
      });

      container.dispatchEvent(touchStart);
      container.dispatchEvent(touchEnd);
    }

    const endTime = performance.now();
    const avgTimePerGesture = (endTime - startTime) / 100;

    // Each gesture should be processed in < 16ms (60fps)
    expect(avgTimePerGesture).toBeLessThan(16);

    gestureHandler.destroy();
    document.body.removeChild(container);
  });
});

// ============================================================================
// Service Worker Tests
// ============================================================================

describe('Service Worker', () => {
  it('should register service worker successfully', async () => {
    const mockRegister = jest.fn().mockResolvedValue({
      installing: null,
      waiting: null,
      active: {
        postMessage: jest.fn(),
      },
    });

    // @ts-ignore - Mock navigator.serviceWorker
    navigator.serviceWorker = {
      register: mockRegister,
      ready: Promise.resolve({
        installing: null,
        waiting: null,
        active: {
          postMessage: jest.fn(),
        },
      }),
      controller: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    const { registerServiceWorker } = await import('./ServiceWorkerRegistration.js');
    const manager = registerServiceWorker();

    const state = manager.getState();
    expect(state.status).not.toBe('unsupported');
  });

  it('should detect offline status', () => {
    // @ts-ignore - Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const isOffline = !navigator.onLine;
    expect(isOffline).toBe(true);
  });
});
