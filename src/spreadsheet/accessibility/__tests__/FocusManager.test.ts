/**
 * Tests for FocusManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FocusManager } from '../FocusManager';

describe('FocusManager', () => {
  let focusManager: FocusManager;
  let container: HTMLElement;
  let button1: HTMLElement;
  let button2: HTMLElement;

  beforeEach(() => {
    focusManager = new FocusManager();

    // Create test container
    container = document.createElement('div');
    document.body.appendChild(container);

    // Create focusable elements
    button1 = document.createElement('button');
    button1.id = 'button1';
    button1.textContent = 'Button 1';
    container.appendChild(button1);

    button2 = document.createElement('button');
    button2.id = 'button2';
    button2.textContent = 'Button 2';
    container.appendChild(button2);
  });

  afterEach(() => {
    focusManager.cleanup();
    document.body.removeChild(container);
  });

  describe('setFocus', () => {
    it('should set focus to an element', () => {
      focusManager.setFocus(button1);
      expect(document.activeElement).toBe(button1);
    });

    it('should capture focus before setting new focus', () => {
      button1.focus();
      focusManager.setFocus(button2);
      expect(document.activeElement).toBe(button2);
    });

    it('should warn for non-focusable elements', () => {
      const nonFocusable = document.createElement('div');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      focusManager.setFocus(nonFocusable);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('restoreFocus', () => {
    it('should restore focus to previously focused element', () => {
      button1.focus();
      focusManager.captureFocus();

      button2.focus();
      expect(document.activeElement).toBe(button2);

      focusManager.restoreFocus();
      expect(document.activeElement).toBe(button1);
    });

    it('should handle empty focus history', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      focusManager.restoreFocus();
      expect(consoleSpy).toHaveBeenCalledWith('No focus history to restore');

      consoleSpy.mockRestore();
    });

    it('should not restore focus if element is no longer in DOM', () => {
      button1.focus();
      focusManager.captureFocus();

      document.body.removeChild(button1);

      focusManager.restoreFocus();
      expect(document.activeElement).not.toBe(button1);
    });
  });

  describe('captureFocus', () => {
    it('should capture currently focused element', () => {
      button1.focus();
      focusManager.captureFocus();

      button2.focus();
      expect(document.activeElement).toBe(button2);
    });

    it('should limit focus history size', () => {
      // Focus and capture 12 times (more than maxHistorySize)
      for (let i = 0; i < 12; i++) {
        button1.focus();
        focusManager.captureFocus();
        button2.focus();
        focusManager.captureFocus();
      }

      // History should be limited to maxHistorySize
      expect((focusManager as any).focusHistory.length).toBe(10);
    });
  });

  describe('createFocusTrap', () => {
    it('should create a focus trap within container', () => {
      const trap = focusManager.createFocusTrap(container);

      trap.activate();
      expect(trap.isActive()).toBe(true);

      trap.deactivate();
      expect(trap.isActive()).toBe(false);
    });

    it('should return focus on deactivate when configured', () => {
      button1.focus();
      const trap = focusManager.createFocusTrap(container, {
        returnFocusOnDeactivate: true,
      });

      trap.activate();
      expect(document.activeElement).not.toBe(button1);

      trap.deactivate();
      expect(document.activeElement).toBe(button1);
    });

    it('should call onActivate callback', () => {
      const onActivate = vi.fn();
      const trap = focusManager.createFocusTrap(container, { onActivate });

      trap.activate();
      expect(onActivate).toHaveBeenCalled();
    });

    it('should call onDeactivate callback', () => {
      const onDeactivate = vi.fn();
      const trap = focusManager.createFocusTrap(container, { onDeactivate });

      trap.activate();
      trap.deactivate();
      expect(onDeactivate).toHaveBeenCalled();
    });
  });

  describe('moveToNextCell', () => {
    it('should move to next cell in row direction', () => {
      const gridSize = { rows: 10, columns: 10 };
      const next = focusManager.moveToNextCell('A1', 'row', gridSize);
      expect(next).toBe('B1');
    });

    it('should wrap to next row when at end of row', () => {
      const gridSize = { rows: 10, columns: 5 };
      const next = focusManager.moveToNextCell('E1', 'row', gridSize);
      expect(next).toBe('A2');
    });

    it('should wrap to beginning when at end of grid', () => {
      const gridSize = { rows: 2, columns: 2 };
      const next = focusManager.moveToNextCell('B2', 'row', gridSize);
      expect(next).toBe('A1');
    });

    it('should move to next cell in column direction', () => {
      const gridSize = { rows: 10, columns: 10 };
      const next = focusManager.moveToNextCell('A1', 'column', gridSize);
      expect(next).toBe('A2');
    });
  });

  describe('moveInDirection', () => {
    it('should move up', () => {
      const gridSize = { rows: 10, columns: 10 };
      const next = focusManager.moveInDirection('B3', 'up', gridSize);
      expect(next).toBe('B2');
    });

    it('should move down', () => {
      const gridSize = { rows: 10, columns: 10 };
      const next = focusManager.moveInDirection('B3', 'down', gridSize);
      expect(next).toBe('B4');
    });

    it('should move left', () => {
      const gridSize = { rows: 10, columns: 10 };
      const next = focusManager.moveInDirection('B3', 'left', gridSize);
      expect(next).toBe('A3');
    });

    it('should move right', () => {
      const gridSize = { rows: 10, columns: 10 };
      const next = focusManager.moveInDirection('B3', 'right', gridSize);
      expect(next).toBe('C3');
    });

    it('should move to first cell', () => {
      const gridSize = { rows: 10, columns: 10 };
      const next = focusManager.moveInDirection('E5', 'first', gridSize);
      expect(next).toBe('A1');
    });

    it('should move to last cell', () => {
      const gridSize = { rows: 10, columns: 10 };
      const next = focusManager.moveInDirection('A1', 'last', gridSize);
      expect(next).toBe('J10');
    });

    it('should move page up', () => {
      const gridSize = { rows: 20, columns: 10 };
      const next = focusManager.moveInDirection('B15', 'pageUp', gridSize);
      expect(next).toBe('B5');
    });

    it('should move page down', () => {
      const gridSize = { rows: 20, columns: 10 };
      const next = focusManager.moveInDirection('B5', 'pageDown', gridSize);
      expect(next).toBe('B15');
    });

    it('should not move beyond grid boundaries', () => {
      const gridSize = { rows: 5, columns: 5 };
      const next = focusManager.moveInDirection('A1', 'up', gridSize);
      expect(next).toBe('A1');
    });
  });

  describe('cleanup', () => {
    it('should clean up all focus traps', () => {
      const trap = focusManager.createFocusTrap(container);
      trap.activate();

      focusManager.cleanup();
      expect(trap.isActive()).toBe(false);
    });

    it('should clear focus history', () => {
      button1.focus();
      focusManager.captureFocus();

      focusManager.cleanup();
      expect((focusManager as any).focusHistory).toHaveLength(0);
    });
  });
});
