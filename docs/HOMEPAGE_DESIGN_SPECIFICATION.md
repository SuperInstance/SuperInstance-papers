# SuperInstance Homepage Visual Design Specification

**Companion to:** SUPERINSTANCE_HOMEPAGE_STRATEGY.md
**Date:** 2026-03-14
**Status:** Design System Definition

---

## Design Philosophy

The SuperInstance visual design embodies three core principles:

### 1. **Mathematical Elegance**
Clean, precise layouts that reflect the mathematical foundations of our research. Grid systems, geometric patterns, and asymmetric balances create visual harmony.

### 2. **Biological Inspiration**
Organic shapes, flowing gradients, and cellular patterns reference the 3.5 billion years of evolution that inform our work. Natural motion and smooth transitions mimic biological systems.

### 3. **Technological Sophistication**
Modern UI patterns, glass morphism, and subtle animations demonstrate cutting-edge technology while maintaining accessibility and clarity.

---

## Color System

### Primary Palette

```
┌─────────────────────────────────────────────────────────────┐
│  PRIMARY GRADIENT                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Deep Purple: #667eea                                       │
│  →                                                           │
│  Rich Violet: #764ba2                                       │
│                                                             │
│  Usage: CTAs, highlights, important interactive elements    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Secondary Colors

```
┌─────────────────────────────────────────────────────────────┐
│  ACCENT COLORS                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Teal:         #38b2ac    (Success, completion)            │
│  Orange:       #ed8936    (Warning, in progress)            │
│  Red:          #f56565    (Errors, critical issues)         │
│  Blue:         #4299e1    (Information, links)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Neutral Scale

```
┌─────────────────────────────────────────────────────────────┐
│  NEUTRAL SCALE (Dark Theme)                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Background:    #0f0f23    (Deepest space)                 │
│  Surface:       #1a1a2e    (Cards, sections)               │
│  Elevated:      #16213e     (Modals, dropdowns)            │
│  Border:        #2d3748    (Dividers, outlines)            │
│                                                             │
│  Text Primary:  #ffffff    (Headlines, important text)     │
│  Text Secondary: #a0aec0    (Body text, descriptions)       │
│  Text Tertiary: #718096    (Captions, metadata)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Semantic Colors

```
┌─────────────────────────────────────────────────────────────┐
│  SEMANTIC COLOR MAPPING                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Paper Complete:     #48bb78 (Green)                       │
│  Paper In Progress:  #ed8936 (Orange)                      │
│  Paper Proposed:     #4299e1 (Blue)                        │
│                                                             │
│  Confidence High:    #48bb78 (Green)                       │
│  Confidence Medium:  #ed8936 (Orange)                      │
│  Confidence Low:     #f56565 (Red)                         │
│                                                             │
│  Simulation Active:  #667eea (Purple)                      │
│  Simulation Idle:    #718096 (Gray)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Typography

### Type Scale

```
┌─────────────────────────────────────────────────────────────┐
│  TYPOGRAPHY SYSTEM                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Display:      4.5rem / 72px   (Hero headlines)            │
│  Heading 1:    3rem / 48px    (Page titles)                │
│  Heading 2:    2.25rem / 36px  (Section titles)             │
│  Heading 3:    1.5rem / 24px   (Card titles)               │
│  Body Large:   1.125rem / 18px (Lead paragraphs)           │
│  Body:         1rem / 16px    (Body text)                  │
│  Small:        0.875rem / 14px (Captions, metadata)         │
│  Micro:        0.75rem / 12px  (Labels, tags)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Font Families

```css
/* Primary Font */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace Font (for code, technical content) */
--font-mono: 'Fira Code', 'Courier New', monospace;

/* Display Font (for special headings) */
--font-display: 'Cal Sans', 'Inter', sans-serif;
```

### Font Weights

```
┌─────────────────────────────────────────────────────────────┐
│  FONT WEIGHTS                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Light:       300  (Large display text)                    │
│  Regular:     400  (Body text)                             │
│  Medium:      500  (Emphasized text)                       │
│  Semibold:    600  (Subheadings, UI elements)              │
│  Bold:        700  (Headings)                              │
│  Extrabold:   800  (Display headlines)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Spacing System

### Spatial Scale

```
┌─────────────────────────────────────────────────────────────┐
│  SPACING SCALE (8px base unit)                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  0:     0      (None)                                       │
│  1:     0.25rem  4px   (Tight spacing)                     │
│  2:     0.5rem   8px   (Compact)                           │
│  3:     0.75rem  12px  (Comfortable)                       │
│  4:     1rem     16px  (Default)                           │
│  5:     1.25rem  20px  (Relaxed)                           │
│  6:     1.5rem   24px  (Spacious)                          │
│  8:     2rem     32px  (Section spacing)                   │
│  10:    2.5rem   40px  (Large sections)                    │
│  12:    3rem     48px  (Major divisions)                   │
│  16:    4rem     64px  (Hero sections)                     │
│  20:    5rem     80px  (Extra large)                       │
│  24:    6rem     96px  (Full screen sections)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Padding

```
┌─────────────────────────────────────────────────────────────┐
│  COMPONENT SPACING                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Buttons:           0.75rem 1.5rem   (12px 24px)           │
│  Cards:             1.5rem          (24px)                 │
│  Section headers:   2rem 0          (32px 0)               │
│  Form inputs:       0.75rem 1rem    (12px 16px)            │
│  Modal content:     2rem            (32px)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Design Specifications

### Buttons

```
┌─────────────────────────────────────────────────────────────┐
│  BUTTON DESIGN SYSTEM                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PRIMARY BUTTON                                             │
│  ├─ Background: Linear gradient (#667eea → #764ba2)       │
│  ├─ Text: White (#ffffff)                                  │
│  ├─ Border: None                                           │
│  ├─ Border Radius: 0.5rem (8px)                            │
│  ├─ Padding: 1rem 2rem                                      │
│  ├─ Font Weight: 600                                       │
│  ├─ Shadow: 0 4px 15px rgba(102, 126, 234, 0.4)           │
│  ├─ Hover: Transform translateY(-2px)                      │
│  └─ Active: Transform translateY(0)                        │
│                                                             │
│  SECONDARY BUTTON                                           │
│  ├─ Background: rgba(255, 255, 255, 0.1)                   │
│  ├─ Text: White (#ffffff)                                  │
│  ├─ Border: 2px solid rgba(255, 255, 255, 0.3)            │
│  ├─ Border Radius: 0.5rem (8px)                            │
│  ├─ Padding: 1rem 2rem                                      │
│  ├─ Font Weight: 600                                       │
│  ├─ Hover: Background rgba(255, 255, 255, 0.2)            │
│  └─ Active: Scale 0.98                                     │
│                                                             │
│  TERTIARY BUTTON (Ghost)                                    │
│  ├─ Background: Transparent                                │
│  ├─ Text: #a0aec0                                          │
│  ├─ Border: 2px solid #4a5568                              │
│  ├─ Border Radius: 0.5rem (8px)                            │
│  ├─ Padding: 1rem 2rem                                      │
│  ├─ Hover: Text #ffffff, Border #667eea                    │
│  └─ Active: Background rgba(102, 126, 234, 0.1)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Cards

```
┌─────────────────────────────────────────────────────────────┐
│  CARD DESIGN SYSTEM                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DEFAULT CARD (Dark Theme)                                  │
│  ├─ Background: #1a1a2e                                    │
│  ├─ Border: 1px solid #2d3748                              │
│  ├─ Border Radius: 0.75rem (12px)                          │
│  ├─ Padding: 1.5rem                                        │
│  ├─ Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)                  │
│  ├─ Hover: Transform translateY(-4px)                      │
│  │         Shadow 0 12px 24px rgba(0, 0, 0, 0.15)          │
│  │         Border #667eea                                  │
│  └─ Transition: All 0.3s ease                              │
│                                                             │
│  PAPER CARD                                                 │
│  ├─ Background: White                                      │
│  ├─ Border: 2px solid #e2e8f0                              │
│  ├─ Border Radius: 0.75rem (12px)                          │
│  ├─ Padding: 1.5rem                                        │
│  ├─ Header: Flex space-between                             │
│  ├─ Status Badge: Rounded, colored by status               │
│  ├─ Hover: Lift effect, border color change               │
│  └─ Transition: All 0.3s cubic-bezier(0.4, 0, 0.2, 1)      │
│                                                             │
│  INNOVATION CARD (Lucineer)                                 │
│  ├─ Background: rgba(255, 255, 255, 0.05)                 │
│  ├─ Border: 1px solid rgba(255, 255, 255, 0.1)            │
│  ├─ Border Radius: 1rem (16px)                             │
│  ├─ Padding: 2rem                                          │
│  ├─ Backdrop Filter: blur(10px)                            │
│  ├─ Hover: Background rgba(255, 255, 255, 0.08)           │
│  │         Border #667eea                                  │
│  └─ Transition: All 0.3s ease                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Form Elements

```
┌─────────────────────────────────────────────────────────────┐
│  FORM ELEMENT DESIGN                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TEXT INPUTS                                                │
│  ├─ Background: #1a1a2e                                    │
│  ├─ Border: 2px solid #2d3748                              │
│  ├─ Border Radius: 0.5rem (8px)                            │
│  ├─ Padding: 0.75rem 1rem                                  │
│  ├─ Font Size: 1rem                                        │
│  ├─ Color: #ffffff                                         │
│  ├─ Placeholder: #718096                                   │
│  ├─ Focus: Border #667eea, Ring 0 0 0 3px rgba(102, 126, 234, 0.1)│
│  └─ Error: Border #f56565                                  │
│                                                             │
│  SELECT DROPDOWNS                                           │
│  ├─ Same as text inputs                                    │
│  ├─ Custom arrow icon (SVG)                                │
│  ├─ Options: Background #16213e, hover #667eea            │
│  └─ Focus state: Same as text inputs                       │
│                                                             │
│  CHECKBOXES & RADIOS                                        │
│  ├─ Size: 1.25rem (20px)                                   │
│  ├─ Border: 2px solid #4a5568                              │
│  ├─ Border Radius: 0.25rem (4px)                           │
│  ├─ Checked: Background #667eea, Border #667eea           │
│  └─ Focus: Ring effect                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Animation & Motion

### Easing Functions

```css
/* Standard easing */
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

/* Organic easing (for biological motion) */
--ease-elastic: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);
```

### Duration Scale

```
┌─────────────────────────────────────────────────────────────┐
│  ANIMATION DURATIONS                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Instant:     100ms   (Micro-interactions)                 │
│  Fast:        200ms   (Button presses, hover states)       │
│  Standard:    300ms   (Card reveals, dropdowns)            │
│  Slow:        500ms   (Page transitions, modals)           │
│  Slower:      700ms   (Complex animations)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Motion Patterns

```
┌─────────────────────────────────────────────────────────────┐
│  MOTION PATTERNS                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ENTRANCE ANIMATIONS                                        │
│  ├─ Fade In + Slide Up (from 20px)                         │
│  ├─ Duration: 400ms                                         │
│  ├─ Easing: cubic-bezier(0, 0, 0.2, 1)                     │
│  └─ Stagger: 50ms between items                            │
│                                                             │
│  HOVER EFFECTS                                              │
│  ├─ Transform: translateY(-4px)                            │
│  ├─ Shadow: Increase from 4px to 12px                      │
│  ├─ Duration: 300ms                                         │
│  └─ Easing: cubic-bezier(0.4, 0, 0.2, 1)                   │
│                                                             │
│  PAGE TRANSITIONS                                           │
│  ├─ Fade out: 200ms                                         │
│  ├─ Fade in: 300ms                                          │
│  ├─ Slide: 20px                                             │
│  └─ Easing: cubic-bezier(0.25, 0.1, 0.25, 1)               │
│                                                             │
│  LOADING STATES                                             │
│  ├─ Skeleton shimmer: 1.5s infinite                        │
│  ├─ Spinner: 1s linear infinite                            │
│  └─ Pulse: 2s ease-in-out infinite                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Specialized Animations

**Cellular Network Animation (Hero):**
```css
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

.cell {
  animation: float 6s ease-in-out infinite;
}

.cell:nth-child(odd) {
  animation-delay: -3s;
}

.cell.active {
  animation: pulse 2s ease-in-out infinite;
}
```

**Confidence Cascade Animation:**
```css
@keyframes flow {
  0% {
    stroke-dashoffset: 1000;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.confidence-line {
  stroke-dasharray: 1000;
  animation: flow 3s linear infinite;
}
```

---

## Iconography

### Icon System

```
┌─────────────────────────────────────────────────────────────┐
│  ICON SYSTEM                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Library: Lucide Icons (open source, consistent)           │
│  Size: 24px default (16px small, 32px large)               │
│  Stroke: 2px                                               │
│  Color: Inherit (follows text color)                       │
│                                                             │
│  PRIMARY ICONS                                              │
│  ├─ Papers: file-text                                      │
│  ├─ Lucineer: cpu                                          │
│  ├─ SpreadsheetMoment: grid-3x3                            │
│  ├─ Simulations: play-circle                               │
│  ├─ GitHub: github                                         │
│  ├─ External Link: external-link                            │
│  ├─ Search: search                                         │
│  ├─ Menu: menu                                             │
│  ├─ Close: x                                               │
│  ├─ Chevron: chevron-right                                 │
│                                                             │
│  STATUS ICONS                                               │
│  ├─ Complete: check-circle                                 │
│  ├─ In Progress: clock                                     │
│  ├─ Proposed: lightbulb                                    │
│  ├─ Error: alert-circle                                    │
│  ├─ Warning: alert-triangle                                │
│  ├─ Info: info                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Icon Usage Guidelines

1. **Consistency:** Use the same icon for the same concept throughout
2. **Sizing:** Match icon size to text size (16px icon with 14px text)
3. **Spacing:** Add 4px-8px gap between icon and text
4. **Color:** Inherit text color for consistency
5. **Stroke:** Maintain 2px stroke for clarity

---

## Layout Patterns

### Grid System

```
┌─────────────────────────────────────────────────────────────┐
│  GRID SYSTEM                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BREAKPOINTS                                               │
│  ├─ Mobile:    < 640px    (1 column)                      │
│  ├─ Tablet:    640px - 1024px  (2 columns)                │
│  ├─ Desktop:   1024px - 1280px (3 columns)                │
│  ├─ Wide:      > 1280px    (4 columns)                    │
│                                                             │
│  COLUMN WIDTHS                                              │
│  ├─ Gutter: 2rem (32px)                                    │
│  ├─ Margin: 2rem (32px)                                    │
│  ├─ Max Width: 1400px                                      │
│  └─ Container: Centered with auto margins                 │
│                                                             │
│  FLEXIBLE GRIDS                                            │
│  └─ Use CSS Grid: repeat(auto-fit, minmax(300px, 1fr))   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Section Layouts

```
┌─────────────────────────────────────────────────────────────┐
│  SECTION STRUCTURE                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STANDARD SECTION                                           │
│  ├─ Padding: 6rem 2rem (96px 32px)                        │
│  ├─ Max Width: 1400px                                      │
│  ├─ Header: Centered, 2rem bottom margin                  │
│  ├─ Content: Grid or flex layout                           │
│  └─ Background: Alternating dark/light                     │
│                                                             │
│  HERO SECTION                                               │
│  ├─ Min Height: 100vh                                      │
│  ├─ Padding: 2rem                                          │
│  ├─ Flex: Column, centered                                │
│  ├─ Content: Split (text left, visual right)              │
│  └─ Background: Gradient with overlay                     │
│                                                             │
│  CARDS SECTION                                              │
│  ├─ Padding: 6rem 2rem                                    │
│  ├─ Grid: auto-fit, minmax(300px, 1fr)                    │
│  ├─ Gap: 2rem                                             │
│  └─ Cards: Equal height, flex column                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Responsive Design

### Mobile Adaptations

```
┌─────────────────────────────────────────────────────────────┐
│  MOBILE ADAPTATIONS                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TYPOGRAPHY SCALING                                         │
│  ├─ Hero: 2.5rem (40px)                                    │
│  ├─ H1: 2rem (32px)                                        │
│  ├─ H2: 1.5rem (24px)                                      │
│  ├─ Body: 1rem (16px)                                      │
│  └─ Use clamp() for fluid scaling                          │
│                                                             │
│  NAVIGATION                                                 │
│  ├─ Convert to hamburger menu                             │
│  ├─ Full-screen drawer                                    │
│  ├─ Close on selection                                    │
│  └─ Backdrop blur                                         │
│                                                             │
│  GRIDS                                                      │
│  ├─ Single column stack                                   │
│  ├─ Maintain card aspect ratios                           │
│  └─ Horizontal scroll for card lists                      │
│                                                             │
│  TOUCH TARGETS                                              │
│  ├─ Minimum: 44px × 44px                                  │
│  ├─ Buttons: Full width where appropriate                │
│  └─ Increase spacing for easier tapping                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Accessibility Considerations

### Color Contrast

```
┌─────────────────────────────────────────────────────────────┐
│  WCAG AA COMPLIANCE                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NORMAL TEXT (16px+)                                        │
│  ├─ Minimum Contrast: 4.5:1                                │
│  ├─ White on Dark: #ffffff on #0f0f23 = 16.5:1 ✓         │
│  └─ White on Surface: #ffffff on #1a1a2e = 14.2:1 ✓       │
│                                                             │
│  LARGE TEXT (24px+)                                         │
│  ├─ Minimum Contrast: 3:1                                  │
│  └─ All secondary text meets requirement                   │
│                                                             │
│  INTERACTIVE ELEMENTS                                       │
│  ├─ Focus indicator: 3:1 contrast                         │
│  ├─ Hover states: Maintain contrast                       │
│  └─ Disabled: 3:1 contrast with gray                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Focus States

```css
/* Focus ring design */
*:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Skip to content link */
.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  background: #667eea;
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 0 0 4px 0;
  z-index: 100;
}

.skip-to-content:focus {
  top: 0;
}
```

---

## Visual Assets

### Image Guidelines

```
┌─────────────────────────────────────────────────────────────┐
│  IMAGE SPECIFICATIONS                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FORMATS                                                    │
│  ├─ Photos: WebP with JPEG fallback                        │
│  ├─ Graphics: SVG when possible, WebP fallback            │
│  ├─ Icons: SVG inline                                      │
│  └─ Screenshots: PNG with WebP fallback                   │
│                                                             │
│  SIZES                                                      │
│  ├─ Hero: 1920×1080 (max), 16:9 aspect                    │
│  ├─ Cards: 600×400, 3:2 aspect                            │
│  ├─ Thumbnails: 400×300, 4:3 aspect                       │
│  └─ Avatars: 200×200, 1:1 aspect                          │
│                                                             │
│  OPTIMIZATION                                               │
│  ├─ Quality: 85 (WebP), 80 (JPEG)                         │
│  ├─ Lazy load: Below-fold images                          │
│  ├─ Responsive: srcset for multiple sizes                 │
│  └─ Alt text: Descriptive for all images                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Tokens

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-primary: #667eea;
  --color-primary-dark: #764ba2;
  --color-secondary: #38b2ac;
  --color-accent-orange: #ed8936;
  --color-accent-red: #f56565;
  --color-accent-blue: #4299e1;

  /* Backgrounds */
  --bg-primary: #0f0f23;
  --bg-secondary: #1a1a2e;
  --bg-elevated: #16213e;
  --bg-border: #2d3748;

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #a0aec0;
  --text-tertiary: #718096;

  /* Typography */
  --font-primary: 'Inter', sans-serif;
  --font-mono: 'Fira Code', monospace;
  --font-display: 'Cal Sans', sans-serif;

  /* Font sizes */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;
  --text-6xl: 3.75rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
  --shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25);

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Z-index */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
}
```

---

## Implementation Notes

### Design System Migration

1. **Phase 1:** Implement design tokens in Tailwind config
2. **Phase 2:** Create base component library
3. **Phase 3:** Apply to page templates
4. **Phase 4:** Refine based on user testing

### Design Review Checklist

Before launching any new component:
- [ ] Follows design tokens
- [ ] Meets accessibility standards
- [ ] Responsive on all breakpoints
- [ ] Smooth animations (60fps)
- [ ] Proper focus states
- [ ] Loading states defined
- [ ] Error states defined
- [ ] Cross-browser tested

---

## Conclusion

This design specification provides the complete visual language for the SuperInstance homepage. By following these guidelines, we ensure:

1. **Consistency** across all pages and components
2. **Accessibility** for all users
3. **Performance** through optimized assets
4. **Maintainability** through design tokens
5. **Scalability** for future features

The design system should evolve based on user feedback and testing data, but always maintain the core principles of mathematical elegance, biological inspiration, and technological sophistication.

---

**Status:** Design System Complete
**Next Steps:** Create component library
**Last Updated:** 2026-03-14
