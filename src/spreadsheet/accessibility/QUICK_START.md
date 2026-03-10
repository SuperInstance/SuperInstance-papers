# Accessibility Utilities - Quick Start Guide

## Installation

The accessibility utilities are now available at `src/spreadsheet/accessibility/`.

## Basic Usage

### 1. Focus Management

```typescript
import { focusManager } from './accessibility';

// Set focus to a cell
const cellElement = document.getElementById('cell-A1');
focusManager.setFocus(cellElement);

// Restore previous focus
focusManager.restoreFocus();

// Navigate to next cell
const nextCell = focusManager.moveToNextCell('A1', 'row', { rows: 100, columns: 26 });
console.log(nextCell); // 'B1'

// Create focus trap for modal
const trap = focusManager.createFocusTrap(modalElement, {
  escapeDeactivates: true,
  returnFocusOnDeactivate: true,
});
trap.activate();
```

### 2. Keyboard Navigation

```typescript
import { keyboardNavManager } from './accessibility';

// Set grid size
keyboardNavManager.setGridSize(100, 26);

// Listen for navigation
keyboardNavManager.on('navigate', (event) => {
  console.log(`Moved from ${event.currentCell} to ${event.nextCell}`);
  // Update UI focus
});

// Add custom shortcut
keyboardNavManager.addKeyBinding('ctrl+s', () => {
  saveSpreadsheet();
});

// Get all shortcuts
console.log(keyboardNavManager.getShortcuts());
```

### 3. ARIA Management

```typescript
import { ariaManager } from './accessibility';

// Set ARIA attributes
ariaManager.setLabel(cellElement, 'Cell A1');
ariaManager.setDescription(cellElement, 'Input cell for sales data');
ariaManager.setRole(cellElement, 'gridcell');

// Update cell state
ariaManager.updateCellState('cell-A1', {
  id: 'cell-A1',
  value: 42,
  position: { row: 1, column: 1, columnLabel: 'A' },
  type: 'input',
  editable: true,
  selected: false,
});

// Announce to screen readers
ariaManager.announcePolite('Cell A1 updated to 42');
ariaManager.announceAssertive('Error in cell B2: Invalid value');
```

### 4. Color Contrast Checking

```typescript
import { colorContrastChecker } from './accessibility';

// Check contrast
const result = colorContrastChecker.checkContrast('#000000', '#FFFFFF');
console.log(`Contrast ratio: ${result.ratio}:1`);
console.log(`Passes AA: ${result.passesAA}`);
console.log(`Passes AAA: ${result.passesAAA}`);

// Simulate color blindness
const protanopiaView = colorContrastChecker.simulateColorBlindness(
  '#FF0000',
  'protanopia'
);

// Suggest accessible color
const betterColor = colorContrastChecker.suggestAccessibleColor(
  '#CCCCCC',
  '#FFFFFF',
  4.5
);
```

### 5. Screen Reader Support

```typescript
import { screenReaderHelper } from './accessibility';

// Announce cell value
const announcement = screenReaderHelper.announceCellValue({
  id: 'A1',
  value: 42,
  position: { row: 1, column: 1, columnLabel: 'A' },
  type: 'input',
  editable: true,
  selected: false,
});
console.log(announcement); // "Cell A1, value is 42, type input, editable"

// Announce changes
screenReaderHelper.announceValueChange('A1', 10, 20);
// "Cell A1 changed from 10 to 20"

// Announce errors
screenReaderHelper.announceError('B2', 'Division by zero');
// "Error in cell B2: Division by zero"

// Generate summary
const summary = screenReaderHelper.generateSummary({
  totalCells: 100,
  populatedCells: 45,
  errors: 2,
  selectedCells: 5,
  hasUnsavedChanges: true,
});
```

## React Components

### LiveRegion

```tsx
import { LiveRegion, useLiveRegion } from './accessibility';

// Using the component
<LiveRegion priority="polite" message="Cell updated" />

// Using the hook
function MyCell() {
  const { announce } = useLiveRegion();

  const handleChange = (value) => {
    announce(`Cell changed to ${value}`, 'polite');
  };

  return <input onChange={(e) => handleChange(e.target.value)} />;
}
```

### SkipLinks

```tsx
import { SkipLinks, SkipLinkContainer } from './accessibility';

// Define skip links
const skipLinks = [
  { id: 'skip-to-cells', label: 'Skip to cells', target: 'spreadsheet-grid' },
  { id: 'skip-to-nav', label: 'Skip to navigation', target: 'main-nav' },
];

// Use in app
function App() {
  return (
    <>
      <SkipLinks links={skipLinks} />
      <nav id="main-nav">...</nav>
      <SkipLinkContainer id="spreadsheet-grid">
        <SpreadsheetGrid />
      </SkipLinkContainer>
    </>
  );
}
```

## Complete Example

```tsx
import React, { useEffect } from 'react';
import {
  focusManager,
  keyboardNavManager,
  ariaManager,
  screenReaderHelper,
  LiveRegion,
  SkipLinks,
  useLiveRegion,
} from './accessibility';

function Spreadsheet() {
  const { announce } = useLiveRegion();

  useEffect(() => {
    // Setup keyboard navigation
    keyboardNavManager.setGridSize(100, 26);

    const handleNavigate = (event) => {
      const { nextCell } = event;
      const cellElement = document.getElementById(`cell-${nextCell}`);
      if (cellElement) {
        focusManager.setFocus(cellElement);

        // Announce cell info
        const state = getCellState(nextCell);
        screenReaderHelper.announceCellValue(state);
      }
    };

    keyboardNavManager.on('navigate', handleNavigate);

    return () => {
      keyboardNavManager.off('navigate', handleNavigate);
    };
  }, []);

  const handleCellChange = (cellId, oldValue, newValue) => {
    // Update ARIA state
    ariaManager.updateCellState(cellId, {
      id: cellId,
      value: newValue,
      position: parseCellId(cellId),
      type: 'input',
      editable: true,
      selected: false,
      changed: true,
    });

    // Announce change
    announce(`Cell ${cellId} changed from ${oldValue} to ${newValue}`, 'polite');
  };

  const skipLinks = [
    { id: 'skip-to-cells', label: 'Skip to cells', target: 'spreadsheet-grid' },
  ];

  return (
    <>
      <SkipLinks links={skipLinks} />
      <LiveRegion priority="polite" message="" />
      <div
        id="spreadsheet-grid"
        role="grid"
        aria-rowcount="100"
        aria-colcount="26"
      >
        {/* Grid content */}
      </div>
    </>
  );
}
```

## Common Patterns

### Cell Focus Management

```typescript
function focusCell(cellId: string) {
  const element = document.getElementById(`cell-${cellId}`);
  if (element) {
    focusManager.setFocus(element);
  }
}

function moveFocus(direction: 'up' | 'down' | 'left' | 'right') {
  const current = keyboardNavManager.getCurrentCell();
  const next = focusManager.moveInDirection(current, direction, {
    rows: 100,
    columns: 26,
  });
  focusCell(next);
}
```

### Cell State Updates

```typescript
function updateCell(cellId: string, value: any) {
  const state = {
    id: cellId,
    value,
    position: parseCellId(cellId),
    type: 'input',
    editable: true,
    selected: false,
  };

  // Update ARIA
  ariaManager.updateCellState(cellId, state);

  // Announce change
  const announcement = screenReaderHelper.announceCellValue(state);
  ariaManager.announcePolite(announcement);
}
```

### Error Handling

```typescript
function handleError(cellId: string, error: string) {
  // Update cell with error
  ariaManager.updateCellState(cellId, {
    id: cellId,
    value: null,
    position: parseCellId(cellId),
    type: 'input',
    editable: true,
    selected: false,
    error,
  });

  // Announce error
  screenReaderHelper.announceError(cellId, error);
}
```

## Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| Arrow Keys | Navigate between cells |
| Ctrl/Cmd + Arrow | Navigate to edge |
| Home | Move to first column |
| End | Move to last column |
| Ctrl/Cmd + Home | Move to first cell (A1) |
| Ctrl/Cmd + End | Move to last cell |
| Page Up | Move up 10 rows |
| Page Down | Move down 10 rows |
| Tab | Move to next cell |
| Shift + Tab | Move to previous cell |
| Escape | Cancel or exit |

## Testing Tips

1. **Test with keyboard only**: Unplug your mouse and navigate the spreadsheet
2. **Test with screen reader**: Use NVDA (Windows) or VoiceOver (Mac)
3. **Test color contrast**: Use the ColorContrastChecker to validate colors
4. **Test focus traps**: Ensure modals trap focus correctly
5. **Test skip links**: Verify they work and announce properly

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Screen Reader Compatibility

- JAWS 2024+
- NVDA 2024+
- Narrator (Windows 10/11)
- VoiceOver (macOS 12+, iOS 15+)
- TalkBack (Android 12+)

## Need Help?

- See `README.md` for full documentation
- See `IMPLEMENTATION_SUMMARY.md` for implementation details
- Check test files for usage examples
