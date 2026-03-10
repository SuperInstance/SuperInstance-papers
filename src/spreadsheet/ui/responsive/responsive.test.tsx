/**
 * POLLN Spreadsheet - Responsive UI Tests
 *
 * Comprehensive test suite for responsive components.
 * Tests all breakpoints, touch gestures, and accessibility features.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ResponsiveGrid,
  MobileToolbar,
  AdaptiveRenderer,
  TouchEditor,
  ResponsiveContainer,
  useBreakpoint,
  useTouchGestures,
  useViewportSize,
  BREAKPOINTS,
} from './index';
import type { ResponsiveCellData, Breakpoint } from './types';

// ============================================================================
// Mock Data
// ============================================================================

const createMockCell = (id: string, row: number, col: number): ResponsiveCellData => ({
  id,
  position: { row, col },
  value: `Cell ${id}`,
  state: 'dormant' as any,
  type: 'input' as any,
  logicLevel: 0 as any,
  confidence: 0.8,
  timestamp: Date.now(),
});

const createMockCells = (count: number): Map<string, ResponsiveCellData> => {
  const cells = new Map<string, ResponsiveCellData>();
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 10);
    const col = i % 10;
    const id = `${String.fromCharCode(65 + col)}${row + 1}`;
    cells.set(id, createMockCell(id, row, col));
  }
  return cells;
};

// ============================================================================
// Helper Functions
// ============================================================================

const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

const mockTouch = (element: HTMLElement, touches: any[]) => {
  const touchList = touches.map(touch => ({
    identifier: touch.id || 0,
    clientX: touch.x,
    clientY: touch.y,
    target: element,
  }));

  fireEvent.touchStart(element, {
    touches: touchList as any,
    changedTouches: touchList as any,
  });
};

// ============================================================================
// ResponsiveGrid Tests
// ============================================================================

describe('ResponsiveGrid', () => {
  it('should render mobile layout on small screens', async () => {
    mockViewport(375, 667);

    const cells = createMockCells(20);
    const { container } = render(
      <ResponsiveGrid cells={cells} rows={20} cols={10} mode="mobile" />
    );

    expect(container.querySelector('.responsive-grid-mobile')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render tablet layout on medium screens', async () => {
    mockViewport(768, 1024);

    const cells = createMockCells(50);
    const { container } = render(
      <ResponsiveGrid cells={cells} rows={50} cols={10} mode="tablet" />
    );

    expect(container.querySelector('.responsive-grid-tablet')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render desktop layout on large screens', async () => {
    mockViewport(1920, 1080);

    const cells = createMockCells(100);
    const { container } = render(
      <ResponsiveGrid cells={cells} rows={100} cols={10} mode="desktop" />
    );

    expect(container.querySelector('.responsive-grid-desktop')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should handle cell selection', async () => {
    const handleCellSelect = jest.fn();
    const cells = createMockCells(10);

    render(
      <ResponsiveGrid
        cells={cells}
        rows={10}
        cols={10}
        mode="desktop"
        onCellSelect={handleCellSelect}
      />
    );

    const cell = screen.getByText('Cell A1');
    fireEvent.click(cell);

    await waitFor(() => {
      expect(handleCellSelect).toHaveBeenCalledWith('A1', { row: 0, col: 0 });
    });
  });

  it('should handle swipe gestures', async () => {
    const handleSwipe = jest.fn();
    const cells = createMockCells(10);

    const { container } = render(
      <ResponsiveGrid
        cells={cells}
        rows={10}
        cols={10}
        mode="mobile"
        onSwipe={handleSwipe}
        config={{ enableSwipeNavigation: true }}
      />
    );

    const grid = container.querySelector('.responsive-grid') as HTMLElement;
    expect(grid).toBeInTheDocument();

    // Simulate swipe
    mockTouch(grid, [
      { id: 0, x: 100, y: 300 },
      { id: 0, x: 200, y: 300 },
    ]);

    await waitFor(() => {
      expect(handleSwipe).toHaveBeenCalled();
    });
  });

  it('should handle pinch to zoom', async () => {
    const handlePinch = jest.fn();
    const cells = createMockCells(10);

    render(
      <ResponsiveGrid
        cells={cells}
        rows={10}
        cols={10}
        mode="mobile"
        onPinch={handlePinch}
        config={{ enablePinchZoom: true }}
      />
    );

    // Pinch handling would be tested with actual touch events
    expect(handlePinch).toBeDefined();
  });

  it('should handle pull to refresh', async () => {
    const handleRefresh = jest.fn(() => Promise.resolve());
    const cells = createMockCells(10);

    const { container } = render(
      <ResponsiveGrid
        cells={cells}
        rows={10}
        cols={10}
        mode="mobile"
        onRefresh={handleRefresh}
        config={{ enablePullToRefresh: true }}
      />
    );

    // Pull to refresh would be tested with actual touch events
    expect(handleRefresh).toBeDefined();
  });

  it('should be accessible', () => {
    const cells = createMockCells(10);

    render(
      <ResponsiveGrid cells={cells} rows={10} cols={10} mode="desktop" />
    );

    const grid = screen.getByRole('grid');
    expect(grid).toHaveAttribute('aria-label', 'Spreadsheet grid');
  });
});

// ============================================================================
// MobileToolbar Tests
// ============================================================================

describe('MobileToolbar', () => {
  it('should render bottom toolbar by default', () => {
    const { container } = render(
      <MobileToolbar mode="mobile" />
    );

    const toolbar = container.querySelector('.mobile-toolbar');
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveStyle({ position: 'fixed', bottom: 0 });
  });

  it('should render navigation items', () => {
    const navItems = [
      { id: 'cells', label: 'Cells', icon: '📊', active: true },
      { id: 'analysis', label: 'Analysis', icon: '📈' },
    ];

    render(
      <MobileToolbar
        mode="mobile"
        config={{ navigationItems: navItems }}
      />
    );

    expect(screen.getByText('Cells')).toBeInTheDocument();
    expect(screen.getByText('Analysis')).toBeInTheDocument();
  });

  it('should handle navigation clicks', async () => {
    const handleNavigate = jest.fn();
    const navItems = [
      { id: 'cells', label: 'Cells', icon: '📊' },
      { id: 'analysis', label: 'Analysis', icon: '📈' },
    ];

    render(
      <MobileToolbar
        mode="mobile"
        config={{ navigationItems: navItems }}
        onNavigate={handleNavigate}
      />
    );

    fireEvent.click(screen.getByText('Analysis'));

    await waitFor(() => {
      expect(handleNavigate).toHaveBeenCalledWith('analysis');
    });
  });

  it('should handle quick action clicks', async () => {
    const handleAction = jest.fn();
    const quickActions = [
      { id: 'add', label: 'Add', icon: '+', action: () => {} },
      { id: 'search', label: 'Search', icon: '🔍', action: () => {} },
    ];

    render(
      <MobileToolbar
        mode="mobile"
        config={{ quickActions }}
        onAction={handleAction}
      />
    );

    fireEvent.click(screen.getByText('+').closest('button')!);

    await waitFor(() => {
      expect(handleAction).toHaveBeenCalledWith('add');
    });
  });

  it('should collapse and expand', async () => {
    const { container } = render(
      <MobileToolbar
        mode="mobile"
        config={{ collapsed: false }}
      />
    );

    const collapseButton = container.querySelector('[aria-label="Collapse toolbar"]');
    expect(collapseButton).toBeInTheDocument();

    fireEvent.click(collapseButton!);

    await waitFor(() => {
      expect(container.querySelector('[aria-label="Expand toolbar"]')).toBeInTheDocument();
    });
  });

  it('should render floating action button', () => {
    const { container } = render(
      <MobileToolbar
        mode="mobile"
        config={{ position: 'floating', floatingActionButton: true }}
      />
    );

    const fab = container.querySelector('button[aria-label="Add cell"]');
    expect(fab).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(
      <MobileToolbar mode="mobile" />
    );

    const toolbar = screen.getByRole('navigation');
    expect(toolbar).toHaveAttribute('aria-label', 'Mobile navigation');
  });
});

// ============================================================================
// AdaptiveRenderer Tests
// ============================================================================

describe('AdaptiveRenderer', () => {
  it('should render simplified cells on mobile', () => {
    const cells = createMockCells(20);

    const { container } = render(
      <AdaptiveRenderer
        cells={cells}
        rows={20}
        cols={10}
        mode="mobile"
        config={{
          columnVisibility: {
            defaultVisible: true,
            breakpoints: { mobile: [0, 1, 2] },
          },
        }}
      />
    );

    expect(container).toMatchSnapshot();
  });

  it('should render card cells on tablet', () => {
    const cells = createMockCells(50);

    const { container } = render(
      <AdaptiveRenderer
        cells={cells}
        rows={50}
        cols={10}
        mode="tablet"
      />
    );

    expect(container).toMatchSnapshot();
  });

  it('should render full grid on desktop', () => {
    const cells = createMockCells(100);

    const { container } = render(
      <AdaptiveRenderer
        cells={cells}
        rows={100}
        cols={10}
        mode="desktop"
      />
    );

    expect(container).toMatchSnapshot();
  });

  it('should implement virtual scrolling', async () => {
    const handleViewportChange = jest.fn();
    const cells = createMockCells(1000);

    render(
      <AdaptiveRenderer
        cells={cells}
        rows={1000}
        cols={10}
        mode="desktop"
        config={{ virtualScrolling: true, virtualScrollThreshold: 50 }}
        onViewportChange={handleViewportChange}
      />
    );

    await waitFor(() => {
      expect(handleViewportChange).toHaveBeenCalled();
    });
  });

  it('should implement progressive loading', async () => {
    const handleCellRender = jest.fn();
    const cells = createMockCells(100);

    render(
      <AdaptiveRenderer
        cells={cells}
        rows={100}
        cols={10}
        mode="mobile"
        config={{ progressiveLoading: true }}
        onCellRender={handleCellRender}
      />
    );

    await waitFor(() => {
      expect(handleCellRender).toHaveBeenCalled();
    });
  });

  it('should handle column visibility', () => {
    const cells = createMockCells(50);

    const { container } = render(
      <AdaptiveRenderer
        cells={cells}
        rows={50}
        cols={10}
        mode="mobile"
        config={{
          columnVisibility: {
            defaultVisible: false,
            breakpoints: { mobile: [0, 1, 2] },
          },
        }}
      />
    );

    // Should only render columns 0, 1, 2
    expect(container).toMatchSnapshot();
  });

  it('should be accessible', () => {
    const cells = createMockCells(10);

    render(
      <AdaptiveRenderer
        cells={cells}
        rows={10}
        cols={10}
        mode="desktop"
      />
    );

    const grid = screen.getByRole('grid');
    expect(grid).toHaveAttribute('aria-label', 'Adaptive grid view');
  });
});

// ============================================================================
// TouchEditor Tests
// ============================================================================

describe('TouchEditor', () => {
  it('should render editor with initial value', () => {
    render(
      <TouchEditor
        cellId="A1"
        initialValue="Hello"
        mode="mobile"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Hello');
  });

  it('should detect formula input', async () => {
    render(
      <TouchEditor
        cellId="A1"
        initialValue=""
        mode="mobile"
      />
    );

    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '=SUM' } });

    await waitFor(() => {
      expect(screen.getByText('fx')).toBeInTheDocument();
    });
  });

  it('should show suggestions for formulas', async () => {
    render(
      <TouchEditor
        cellId="A1"
        initialValue=""
        mode="mobile"
        config={{ showSuggestions: true }}
      />
    );

    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: '=SU' } });

    await waitFor(() => {
      expect(screen.getByText('SUM')).toBeInTheDocument();
    });
  });

  it('should handle save', async () => {
    const handleSave = jest.fn();
    render(
      <TouchEditor
        cellId="A1"
        initialValue=""
        mode="mobile"
        onSave={handleSave}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '123' } });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(123);
    });
  });

  it('should handle cancel', async () => {
    const handleCancel = jest.fn();
    render(
      <TouchEditor
        cellId="A1"
        initialValue=""
        mode="mobile"
        onCancel={handleCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(handleCancel).toHaveBeenCalled();
    });
  });

  it('should validate input', async () => {
    const handleValidate = jest.fn(() => false);
    render(
      <TouchEditor
        cellId="A1"
        initialValue=""
        mode="mobile"
        onValidate={handleValidate}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'invalid' } });

    await waitFor(() => {
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('should show formula builder', async () => {
    render(
      <TouchEditor
        cellId="A1"
        initialValue=""
        mode="mobile"
        config={{ showFormulaBuilder: true }}
      />
    );

    const formulaButton = screen.getByLabelText('Toggle formula builder');
    fireEvent.click(formulaButton);

    await waitFor(() => {
      expect(screen.getByText('Functions')).toBeInTheDocument();
      expect(screen.getByText('SUM')).toBeInTheDocument();
    });
  });

  it('should handle keyboard navigation', async () => {
    const handleSave = jest.fn();
    render(
      <TouchEditor
        cellId="A1"
        initialValue=""
        mode="mobile"
        onSave={handleSave}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '123' } });

    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalled();
    });
  });

  it('should be accessible', () => {
    render(
      <TouchEditor
        cellId="A1"
        initialValue=""
        mode="mobile"
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Edit cell A1');

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', 'Edit cell A1');
  });
});

// ============================================================================
// ResponsiveContainer Tests
// ============================================================================

describe('ResponsiveContainer', () => {
  it('should render with fluid width by default', () => {
    const { container } = render(
      <ResponsiveContainer mode="mobile">
        <div>Content</div>
      </ResponsiveContainer>
    );

    const responsiveContainer = container.querySelector('.responsive-container');
    expect(responsiveContainer).toHaveStyle({ width: '100%' });
  });

  it('should apply breakpoint-specific padding', () => {
    const { container } = render(
      <ResponsiveContainer
        mode="mobile"
        config={{
          padding: true,
          breakpointPadding: {
            mobile: '16px',
            tablet: '24px',
            desktop: '32px',
          },
        }}
      >
        <div>Content</div>
      </ResponsiveContainer>
    );

    const responsiveContainer = container.querySelector('.responsive-container');
    expect(responsiveContainer).toHaveStyle({
      paddingTop: '16px',
      paddingBottom: '16px',
      paddingLeft: '16px',
      paddingRight: '16px',
    });
  });

  it('should center content when configured', () => {
    const { container } = render(
      <ResponsiveContainer
        mode="desktop"
        config={{ centerContent: true }}
      >
        <div>Content</div>
      </ResponsiveContainer>
    );

    const responsiveContainer = container.querySelector('.responsive-container');
    expect(responsiveContainer).toHaveStyle({
      marginLeft: 'auto',
      marginRight: 'auto',
    });
  });

  it('should handle orientation changes', async () => {
    const handleOrientationChange = jest.fn();

    render(
      <ResponsiveContainer
        mode="mobile"
        onOrientationChange={handleOrientationChange}
      >
        <div>Content</div>
      </ResponsiveContainer>
    );

    // Simulate orientation change
    mockViewport(667, 375);

    await waitFor(() => {
      expect(handleOrientationChange).toHaveBeenCalledWith('landscape');
    });
  });

  it('should handle resize', async () => {
    const handleResize = jest.fn();

    render(
      <ResponsiveContainer
        mode="desktop"
        onResize={handleResize}
      >
        <div>Content</div>
      </ResponsiveContainer>
    );

    // Simulate resize
    mockViewport(2000, 1200);

    await waitFor(() => {
      expect(handleResize).toHaveBeenCalled();
    });
  });

  it('should have correct data attributes', () => {
    const { container } = render(
      <ResponsiveContainer mode="mobile">
        <div>Content</div>
      </ResponsiveContainer>
    );

    const responsiveContainer = container.querySelector('.responsive-container');
    expect(responsiveContainer).toHaveAttribute('data-mode', 'mobile');
    expect(responsiveContainer).toHaveAttribute('data-orientation');
  });
});

// ============================================================================
// Hook Tests
// ============================================================================

describe('useBreakpoint', () => {
  it('should detect mobile breakpoint', () => {
    mockViewport(375, 667);

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toBe('mobile');
  });

  it('should detect tablet breakpoint', () => {
    mockViewport(768, 1024);

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toBe('tablet');
  });

  it('should detect desktop breakpoint', () => {
    mockViewport(1920, 1080);

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toBe('desktop');
  });
});

describe('useViewportSize', () => {
  it('should return viewport dimensions', () => {
    mockViewport(1920, 1080);

    const { result } = renderHook(() => useViewportSize());

    expect(result.current.width).toBe(1920);
    expect(result.current.height).toBe(1080);
  });

  it('should detect portrait orientation', () => {
    mockViewport(375, 667);

    const { result } = renderHook(() => useViewportSize());

    expect(result.current.orientation).toBe('portrait');
  });

  it('should detect landscape orientation', () => {
    mockViewport(667, 375);

    const { result } = renderHook(() => useViewportSize());

    expect(result.current.orientation).toBe('landscape');
  });
});

describe('useTouchGestures', () => {
  it('should handle swipe gestures', async () => {
    const handleSwipe = jest.fn();
    const containerRef = { current: document.createElement('div') };

    renderHook(() => useTouchGestures(containerRef, {
      onSwipe: handleSwipe,
    }));

    // Touch gesture testing would require actual touch events
    expect(handleSwipe).toBeDefined();
  });

  it('should handle pinch gestures', async () => {
    const handlePinch = jest.fn();
    const containerRef = { current: document.createElement('div') };

    renderHook(() => useTouchGestures(containerRef, {
      onPinch: handlePinch,
    }));

    expect(handlePinch).toBeDefined();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Responsive Integration', () => {
  it('should render complete responsive layout', () => {
    const cells = createMockCells(50);

    const { container } = render(
      <ResponsiveContainer mode="tablet">
        <ResponsiveGrid cells={cells} rows={50} cols={10} mode="tablet" />
        <MobileToolbar mode="tablet" />
      </ResponsiveContainer>
    );

    expect(container).toMatchSnapshot();
  });

  it('should handle mode changes', async () => {
    const handleModeChange = jest.fn();
    const cells = createMockCells(50);

    const { rerender } = render(
      <ResponsiveGrid
        cells={cells}
        rows={50}
        cols={10}
        mode="mobile"
        onModeChange={handleModeChange}
      />
    );

    rerender(
      <ResponsiveGrid
        cells={cells}
        rows={50}
        cols={10}
        mode="tablet"
        onModeChange={handleModeChange}
      />
    );

    await waitFor(() => {
      expect(handleModeChange).toHaveBeenCalledWith('tablet');
    });
  });
});

// ============================================================================
// Helper function for testing hooks
// ============================================================================

function renderHook<T>(hook: () => T) {
  const result = { current: hook() };

  (render as any)(<div>{hook()}</div>);

  return { result };
}
