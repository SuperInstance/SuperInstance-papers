# POLLN Spreadsheet - Responsive UI Components

Comprehensive responsive UI system for POLLN spreadsheets with mobile-first design and touch-optimized interactions.

## Features

### 📱 Mobile-First Design
- Breakpoint-aware layouts (mobile, tablet, desktop)
- Touch-optimized interactions with large touch targets
- Gesture support (swipe, pinch, long-press, double-tap)
- Haptic feedback for tactile response
- Safe area support for notched devices

### ⚡ Performance Optimized
- Virtual scrolling for large datasets
- Progressive loading with requestIdleCallback
- Lazy hydration of off-screen components
- 60fps animations with CSS transforms
- Memory-efficient cell caching

### ♿ Accessible
- Full keyboard navigation
- ARIA labels and roles
- Screen reader support
- Focus management
- High contrast mode support

### 🎨 Adaptive Rendering
- Simplified view on mobile
- Card view on tablet
- Full grid on desktop
- Column visibility controls
- Progressive enhancement

## Installation

```bash
npm install @polln/spreadsheet
```

## Quick Start

```tsx
import {
  ResponsiveGrid,
  MobileToolbar,
  ResponsiveContainer,
  useBreakpoint,
} from '@polln/spreadsheet/ui/responsive';

function MySpreadsheet() {
  const mode = useBreakpoint();

  return (
    <ResponsiveContainer mode={mode}>
      <ResponsiveGrid
        mode={mode}
        cells={cells}
        rows={100}
        cols={26}
        onCellSelect={(id) => console.log('Selected:', id)}
        config={{
          enableTouchGestures: true,
          enablePinchZoom: true,
          enableSwipeNavigation: true,
        }}
      />
      <MobileToolbar
        mode={mode}
        onAction={(id) => console.log('Action:', id)}
      />
    </ResponsiveContainer>
  );
}
```

## Components

### ResponsiveGrid

Main adaptive grid component that changes layout based on breakpoint.

```tsx
<ResponsiveGrid
  mode={mode}
  cells={cells}
  rows={100}
  cols={26}
  config={{
    enableTouchGestures: true,
    enablePinchZoom: true,
    enableSwipeNavigation: true,
    enablePullToRefresh: true,
    enableInfiniteScroll: true,
  }}
  onCellSelect={(cellId, position) => {
    console.log('Selected cell:', cellId);
  }}
  onSwipe={(direction) => {
    console.log('Swiped:', direction);
  }}
  onPinch={(scale) => {
    console.log('Pinched:', scale);
  }}
/>
```

**Props:**
- `cells`: Map of cell data
- `rows`: Number of rows
- `cols`: Number of columns
- `mode`: Breakpoint ('mobile' | 'tablet' | 'desktop')
- `config`: Configuration options
- `onCellSelect`: Cell selection callback
- `onSwipe`: Swipe gesture callback
- `onPinch`: Pinch zoom callback
- `onRefresh`: Pull-to-refresh callback

### MobileToolbar

Context-aware bottom navigation for mobile devices.

```tsx
<MobileToolbar
  mode="mobile"
  config={{
    position: 'bottom',
    floatingActionButton: true,
    quickActions: [
      {
        id: 'add',
        label: 'Add',
        icon: '+',
        action: () => console.log('Add cell'),
        variant: 'primary',
      },
    ],
    navigationItems: [
      {
        id: 'cells',
        label: 'Cells',
        icon: '📊',
        active: true,
      },
    ],
  }}
  onAction={(actionId) => console.log('Action:', actionId)}
  onNavigate={(itemId) => console.log('Navigate:', itemId)}
/>
```

**Props:**
- `mode`: Breakpoint
- `config`: Toolbar configuration
- `onAction`: Quick action callback
- `onNavigate`: Navigation callback

### AdaptiveRenderer

Smart rendering with virtual scrolling and progressive loading.

```tsx
<AdaptiveRenderer
  mode={mode}
  cells={cells}
  rows={1000}
  cols={26}
  config={{
    virtualScrolling: true,
    progressiveLoading: true,
    columnVisibility: {
      defaultVisible: true,
      breakpoints: {
        mobile: [0, 1, 2],
        tablet: true,
        desktop: true,
      },
    },
  }}
  onCellRender={(cellId) => {
    console.log('Rendered cell:', cellId);
  }}
/>
```

**Props:**
- `cells`: Map of cell data
- `rows`: Number of rows
- `cols`: Number of columns
- `mode`: Breakpoint
- `config`: Renderer configuration
- `onCellRender`: Cell render callback
- `onViewportChange`: Viewport change callback

### TouchEditor

Mobile-optimized cell editor with formula builder.

```tsx
<TouchEditor
  cellId="A1"
  initialValue="=SUM(A1:A10)"
  mode="mobile"
  config={{
    keyboardMode: 'auto',
    showFormulaBuilder: true,
    showSuggestions: true,
  }}
  onSave={(value) => {
    console.log('Saved:', value);
  }}
  onCancel={() => {
    console.log('Cancelled');
  }}
  onValidate={(value) => {
    // Validate input
    return true;
  }}
/>
```

**Props:**
- `cellId`: Cell identifier
- `initialValue`: Initial cell value
- `mode`: Breakpoint
- `config`: Editor configuration
- `onSave`: Save callback
- `onCancel`: Cancel callback
- `onValidate`: Validation callback

### ResponsiveContainer

Fluid container with breakpoint-aware padding and safe areas.

```tsx
<ResponsiveContainer
  mode={mode}
  config={{
    maxWidth: 1200,
    fluid: true,
    centerContent: true,
    padding: true,
    breakpointPadding: {
      mobile: '16px',
      tablet: '24px',
      desktop: '32px',
    },
  }}
  onOrientationChange={(orientation) => {
    console.log('Orientation:', orientation);
  }}
  onResize={(size) => {
    console.log('Resized:', size);
  }}
>
  {/* Your content */}
</ResponsiveContainer>
```

**Props:**
- `mode`: Breakpoint
- `config`: Container configuration
- `onOrientationChange`: Orientation change callback
- `onResize`: Resize callback

## Hooks

### useBreakpoint

Detect current breakpoint based on viewport width.

```tsx
const breakpoint = useBreakpoint();
console.log(breakpoint); // 'mobile' | 'tablet' | 'desktop'
```

### useViewportSize

Get current viewport size and orientation.

```tsx
const viewport = useViewportSize();
console.log(viewport.width, viewport.height, viewport.orientation);
```

### useTouchGestures

Handle touch gestures on elements.

```tsx
const elementRef = useRef<HTMLDivElement>(null);
const gestures = useTouchGestures(elementRef, {
  onSwipe: (direction) => console.log('Swiped:', direction),
  onPinch: (scale) => console.log('Pinched:', scale),
  onLongPress: () => console.log('Long pressed'),
  onDoubleTap: () => console.log('Double tapped'),
});
```

### useMediaQuery

Listen to CSS media queries.

```tsx
const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
const isPrint = useMediaQuery('print');
```

### useResponsiveValue

Get values based on current breakpoint.

```tsx
const fontSize = useResponsiveValue({
  mobile: '14px',
  tablet: '16px',
  desktop: '18px',
}, '16px');
```

## Breakpoints

| Breakpoint | Width | Target Device |
|------------|-------|---------------|
| mobile | < 768px | Phones |
| tablet | 768px - 1024px | Tablets |
| desktop | > 1024px | Desktops |

## Touch Gestures

### Swipe
- **Left**: Navigate to next column/page
- **Right**: Navigate to previous column/page
- **Up**: Scroll up
- **Down**: Scroll down

### Pinch
- **Pinch in**: Zoom out
- **Pinch out**: Zoom in

### Tap
- **Single tap**: Select cell
- **Double tap**: Edit cell
- **Long press**: Show context menu

## Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 |
| First Input Delay | < 100ms |
| Frames Per Second | 60fps |

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ ARIA labels and roles
- ✅ Focus management
- ✅ Color contrast (4.5:1)
- ✅ Touch targets (min 44x44px)

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 90+ |
| Safari | 14+ |
| Firefox | 88+ |
| Edge | 90+ |
| iOS Safari | 14+ |
| Chrome Android | 90+ |

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Examples

### Basic Grid

```tsx
import { ResponsiveGrid, ResponsiveContainer } from '@polln/spreadsheet/ui/responsive';

function App() {
  const mode = useBreakpoint();

  return (
    <ResponsiveContainer mode={mode}>
      <ResponsiveGrid
        mode={mode}
        cells={cells}
        rows={100}
        cols={26}
      />
    </ResponsiveContainer>
  );
}
```

### With Touch Gestures

```tsx
<ResponsiveGrid
  mode={mode}
  cells={cells}
  rows={100}
  cols={26}
  config={{
    enableTouchGestures: true,
    enablePinchZoom: true,
    enableSwipeNavigation: true,
    enableHapticFeedback: true,
  }}
  onSwipe={(direction) => {
    switch (direction) {
      case 'left':
        navigateNext();
        break;
      case 'right':
        navigatePrev();
        break;
    }
  }}
  onPinch={(scale) => {
    setZoom(scale);
  }}
/>
```

### With Virtual Scrolling

```tsx
<AdaptiveRenderer
  mode={mode}
  cells={largeCells}
  rows={10000}
  cols={26}
  config={{
    virtualScrolling: true,
    virtualScrollThreshold: 50,
    progressiveLoading: true,
  }}
  onViewportChange={(viewport) => {
    console.log('Viewport:', viewport);
  }}
/>
```

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.
