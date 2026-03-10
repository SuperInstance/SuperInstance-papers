# Accessibility Utilities for POLLN Spreadsheets

Comprehensive accessibility utilities for POLLN spreadsheets, WCAG 2.1 Level AA compliant.

## Features

- **Focus Management**: Advanced focus control with focus traps and history
- **Keyboard Navigation**: Full keyboard support with customizable shortcuts
- **ARIA Management**: Complete ARIA attribute handling
- **Live Regions**: Screen reader announcements for dynamic updates
- **Color Contrast**: WCAG AA/AAA compliance checking with color blindness simulation
- **Skip Links**: Keyboard navigation shortcuts
- **Screen Reader Support**: Specialized helpers for JAWS, NVDA, and other screen readers

## Installation

```bash
npm install @polln/spreadsheet-accessibility
```

## Quick Start

```typescript
import {
  focusManager,
  keyboardNavManager,
  ariaManager,
  screenReaderHelper
} from '@polln/spreadsheet-accessibility';

// Set focus to a cell
focusManager.setFocus(cellElement);

// Announce cell value
screenReaderHelper.announceCellValue(cellState);

// Check color contrast
const passes = colorContrastChecker.passesAA('#000000', '#FFFFFF');
```

## Components

### FocusManager

Manages focus behavior and focus traps.

```typescript
import { focusManager } from '@polln/spreadsheet-accessibility';

// Set focus
focusManager.setFocus(element);

// Restore previous focus
focusManager.restoreFocus();

// Create focus trap
const trap = focusManager.createFocusTrap(container, {
  escapeDeactivates: true,
  returnFocusOnDeactivate: true,
});

trap.activate();
trap.deactivate();

// Navigate cells
const nextCell = focusManager.moveToNextCell('A1', 'row', { rows: 100, columns: 26 });
```

### KeyboardNavManager

Handles keyboard navigation.

```typescript
import { keyboardNavManager } from '@polln/spreadsheet-accessibility';

// Listen for navigation events
keyboardNavManager.on('navigate', (event) => {
  console.log(`Moved from ${event.currentCell} to ${event.nextCell}`);
});

// Add custom key binding
keyboardNavManager.addKeyBinding('ctrl+s', () => {
  saveSpreadsheet();
});

// Set grid size
keyboardNavManager.setGridSize(100, 26);
```

### AriaManager

Manages ARIA attributes and live regions.

```typescript
import { ariaManager } from '@polln/spreadsheet-accessibility';

// Set ARIA attributes
ariaManager.setLabel(element, 'Cell A1');
ariaManager.setDescription(element, 'Input cell for sales data');
ariaManager.setRole(element, 'gridcell');

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
ariaManager.announcePolite('Cell A1 updated');
ariaManager.announceAssertive('Error in cell B2');
```

### ColorContrastChecker

Validates color contrast against WCAG standards.

```typescript
import { colorContrastChecker } from '@polln/spreadsheet-accessibility';

// Check contrast
const result = colorContrastChecker.checkContrast('#000000', '#FFFFFF');
console.log(result.ratio); // 21:1
console.log(result.passesAA); // true
console.log(result.passesAAA); // true

// Simulate color blindness
const protanopiaColor = colorContrastChecker.simulateColorBlindness(
  '#FF0000',
  'protanopia'
);

// Suggest accessible color
const accessibleColor = colorContrastChecker.suggestAccessibleColor(
  '#CCCCCC',
  '#FFFFFF',
  4.5
);
```

### ScreenReaderHelper

Provides utilities for screen reader announcements.

```typescript
import { screenReaderHelper } from '@polln/spreadsheet/accessibility';

// Announce cell value
const announcement = screenReaderHelper.announceCellValue({
  id: 'A1',
  value: 42,
  position: { row: 1, column: 1, columnLabel: 'A' },
  type: 'input',
  editable: true,
  selected: false,
});

// Announce value change
screenReaderHelper.announceValueChange('A1', 10, 20);

// Announce error
screenReaderHelper.announceError('A1', 'Division by zero');

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

Live region component for announcements.

```tsx
import { LiveRegion, Announce, useLiveRegion } from '@polln/spreadsheet-accessibility';

// Basic live region
<LiveRegion priority="polite" message="Cell updated" />

// With announcement component
<Announce message="Calculation complete" priority="assertive" />

// Using hook
function MyComponent() {
  const { announce } = useLiveRegion();

  const handleClick = () => {
    announce('Button clicked', 'polite');
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### SkipLinks

Skip navigation links for keyboard users.

```tsx
import { SkipLinks, SkipLinkContainer } from '@polln/spreadsheet-accessibility';

const skipLinks = [
  { id: 'skip-to-cells', label: 'Skip to cells', target: 'spreadsheet-grid' },
  { id: 'skip-to-nav', label: 'Skip to navigation', target: 'main-nav' },
];

<SkipLinks links={skipLinks} />

<SkipLinkContainer id="spreadsheet-grid">
  {/* Grid content */}
</SkipLinkContainer>
```

## WCAG 2.1 Compliance

This implementation follows WCAG 2.1 Level AA guidelines:

- **2.1.1 Keyboard**: All functionality available via keyboard
- **2.1.2 No Keyboard Trap**: Focus can be moved away from any location
- **2.1.4 Character Key Shortcuts**: Can be disabled or remapped
- **2.4.1 Bypass Blocks**: Skip links provided
- **2.4.3 Focus Order**: Logical focus navigation
- **2.5.5 Target Size**: Adequate touch target sizes
- **4.1.2 Name, Role, Value**: ARIA attributes properly set
- **4.1.3 Status Messages**: Live regions for dynamic updates

### Color Contrast

- **1.4.3 Contrast (AA)**: 4.5:1 for normal text, 3:1 for large text
- **1.4.6 Contrast (AAA)**: 7:1 for normal text, 4.5:1 for large text

## Keyboard Shortcuts

Default keyboard shortcuts:

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

## Screen Reader Support

Tested with:

- JAWS 2024+
- NVDA 2024+
- Narrator (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

## API Reference

### FocusManager

```typescript
class FocusManager {
  setFocus(element: HTMLElement): void;
  restoreFocus(): void;
  captureFocus(): void;
  createFocusTrap(container: HTMLElement, config?: FocusTrapConfig): FocusTrap;
  moveToNextCell(current: string, direction: 'row' | 'column', gridSize: GridSize): string;
  moveInDirection(current: string, direction: NavigationDirection, gridSize: GridSize): string;
  cleanup(): void;
}
```

### KeyboardNavManager

```typescript
class KeyboardNavManager {
  on(event: string, callback: KeyboardNavCallback): void;
  off(event: string, callback: KeyboardNavCallback): void;
  setCurrentCell(cellId: string): void;
  getCurrentCell(): string;
  setGridSize(rows: number, columns: number): void;
  addKeyBinding(keyCombo: string, callback: () => void): void;
  removeKeyBinding(keyCombo: string): void;
  enable(): void;
  disable(): void;
  getShortcuts(): Record<string, string>;
}
```

### AriaManager

```typescript
class AriaManager {
  setLabel(element: HTMLElement, label: string): void;
  setDescription(element: HTMLElement, description: string): void;
  announceLiveRegion(message: string, priority: AnnouncementPriority): void;
  updateCellState(cellId: string, state: CellState): void;
  setGridAttributes(element: HTMLElement, rows: number, columns: number): void;
  setRowAttributes(element: HTMLElement, rowIndex: number): void;
  setCellAttributes(element: HTMLElement, rowIndex: number, columnIndex: number): void;
  destroy(): void;
}
```

### ColorContrastChecker

```typescript
class ColorContrastChecker {
  calculateContrastRatio(foreground: string, background: string): number;
  passesAA(foreground: string, background: string, isLargeText?: boolean): boolean;
  passesAAA(foreground: string, background: string, isLargeText?: boolean): boolean;
  checkContrast(foreground: string, background: string, isLargeText?: boolean): ContrastResult;
  simulateColorBlindness(color: string, type: ColorBlindnessType): string;
  suggestAccessibleColor(foreground: string, background: string, targetRatio?: number): string;
  checkPaletteAccessibility(palette: ColorPalette[], background: string): AccessibilityResult[];
}
```

## Testing

Comprehensive test suite included:

```bash
npm test
```

Test coverage: 95%+

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines.

## Support

For issues and questions, please open a GitHub issue.
