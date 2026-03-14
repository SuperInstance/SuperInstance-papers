# SuperInstance Homepage - Visual Assets Guide

**Companion to:** HOMEPAGE_DESIGN_SPECIFICATION.md
**Date:** 2026-03-14
**Purpose:** Guide for creating visual assets and illustrations

---

## Asset Requirements Overview

### Hero Section Assets

#### 1. Cellular Network Animation (SVG)

**Purpose:** Hero background visual showing cellular instances computing

**Specifications:**
- Format: SVG (inline in HTML)
- Dimensions: 1920×1080 (scalable)
- Style: Abstract, geometric, organic motion
- Colors: Purples (#667eea, #764ba2) with glow effects

**Visual Elements:**
```
┌─────────────────────────────────────────────────────────────┐
│  CELLULAR NETWORK COMPONENTS                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Cells (15-20 instances)                                 │
│     ├─ Shape: Rounded hexagons                             │
│     ├─ Size: 60-120px diameter                             │
│     ├─ Fill: Semi-transparent purple gradient              │
│     ├─ Stroke: 2px, brighter purple                        │
│     └─ Animation: Gentle float (6s cycle, staggered)       │
│                                                             │
│  2. Connections (Network links)                            │
│     ├─ Shape: Bezier curves                               │
│     ├─ Stroke: 1-2px, fading gradient                      │
│     ├─ Animation: Pulse flow (3s cycle)                    │
│     └─ Connect nearby cells (3-4 connections each)         │
│                                                             │
│  3. Confidence Particles (Data flow)                       │
│     ├─ Shape: Small circles                               │
│     ├─ Size: 4-8px                                        │
│     ├─ Fill: Bright cyan/teal                             │
│     └─ Animation: Flow along connections (2s cycle)        │
│                                                             │
│  4. Origin Markers (Data provenance)                       │
│     ├─ Shape: Small diamonds                              │
│     ├─ Size: 6-9px                                        │
│     ├─ Fill: White with glow                              │
│     └─ Position: At connection points                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Animation Sequence:**
1. Cells float gently up/down (translateY ±20px)
2. Connections pulse opacity (0.3 → 0.8 → 0.3)
3. Particles flow from cell to cell
4. Occasional cell "activates" (brightens, scales to 1.05)

**Code Structure:**
```svg
<svg viewBox="0 0 1920 1080" class="cellular-network">
  <defs>
    <!-- Gradients -->
    <linearGradient id="cellGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#667eea" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#764ba2" stop-opacity="0.3"/>
    </linearGradient>

    <!-- Glow filter -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Connection lines (render first, behind cells) -->
  <g class="connections">
    <!-- Bezier curves connecting cell centers -->
  </g>

  <!-- Cells -->
  <g class="cells">
    <!-- Hexagonal cells with floating animation -->
  </g>

  <!-- Confidence particles -->
  <g class="particles">
    <!-- Small circles following paths -->
  </g>

  <!-- Origin markers -->
  <g class="markers">
    <!-- Diamond shapes at intersections -->
  </g>
</svg>
```

#### 2. Hero Overlay Gradient

**Purpose:** Subtle gradient overlay for text readability

**Specifications:**
- Format: CSS gradient (no image needed)
- Direction: Linear, 135deg
- Colors: #0f0f23 (0%) → transparent (50%) → #0f0f23 (100%)

---

### Papers Section Assets

#### 1. Phase Progress Visualization

**Purpose:** Show completion status of all 5 phases

**Specifications:**
- Format: CSS-based progress bars
- Style: Modern, clean, colored by status
- Dimensions: Full-width container, 40px height per phase

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  PHASE PROGRESS BAR DESIGN                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Container Background: #f7fafc                             │
│  Progress Bar Background: #e2e8f0                          │
│  Progress Fill: Linear gradient (#667eea → #764ba2)        │
│  Height: 8px                                               │
│  Border Radius: 4px                                        │
│                                                             │
│  Text Labels:                                              │
│  - Phase Name: Bold, #1a202c                              │
│  - Range: Regular, #718096                                │
│  - Stats: Semibold, #667eea                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Paper Status Badges

**Purpose:** Visual indicator of paper completion status

**Specifications:**
- Format: CSS-based badges (no images)
- Sizes: Small (24px height), Medium (32px)
- Colors:
  - Complete: Green (#48bb78)
  - In Progress: Orange (#ed8936)
  - Proposed: Blue (#4299e1)

**Design:**
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.complete {
  background: #c6f6d5;
  color: #22543d;
}

.status-badge.in-progress {
  background: #feebc8;
  color: #7c2d12;
}

.status-badge.proposed {
  background: #bee3f8;
  color: #1e40af;
}
```

---

### Lucineer Section Assets

#### 1. Chip Visualization (SVG)

**Purpose:** Interactive representation of mask-locked inference chip

**Specifications:**
- Format: Interactive SVG
- Dimensions: 400×400px (viewBox)
- Style: Technical, schematic-like
- Colors: Blues, purples, with accent colors

**Visual Layers:**

```
┌─────────────────────────────────────────────────────────────┐
│  CHIP VISUALIZATION LAYERS                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: Silicon Substrate                                 │
│  ├─ Color: #2d3748 (dark gray)                            │
│  ├─ Shape: Square with rounded corners (10px radius)      │
│  └─ Size: 300×300px, centered                             │
│                                                             │
│  Layer 2: Metal Layers (Weight Encoding)                   │
│  ├─ Color: Alternating #667eea and #764ba2                │
│  ├─ Shape: Rectangles (40×40px)                           │
│  ├─ Layout: Grid pattern (8×8)                            │
│  ├─ Opacity: 0.8                                          │
│  └─ Interactive: Hover to reveal layer info               │
│                                                             │
│  Layer 3: Ternary Weights                                  │
│  ├─ Color: #48bb78 (green), #f56565 (red), #718096 (gray)│
│  ├─ Shape: Circles (8px radius)                           │
│  ├─ Layout: 4×4 grid within metal layers                 │
│  ├─ Values: +1 (green), -1 (red), 0 (gray)               │
│  └─ Interactive: Click to see weight details             │
│                                                             │
│  Layer 4: Thermal Spine Structures                         │
│  ├─ Color: #ed8936 (orange)                               │
│  ├─ Shape: Ellipses (10×20px)                            │
│  ├─ Stroke: 2px, solid                                   │
│  ├─ Layout: Vertical arrangement along edges             │
│  └─ Animation: Gentle pulse (2s cycle)                    │
│                                                             │
│  Layer 5: Connection Paths                                 │
│  ├─ Color: #4299e1 (blue)                                │
│  ├─ Shape: Thin lines (1px stroke)                       │
│  ├─ Style: Dotted (stroke-dasharray: 4 4)                │
│  └─ Animation: Flow effect (dash offset animation)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Interactive States:**
- **Default:** All layers visible at 80% opacity
- **Hover (Metal Block):** Highlight to 100% opacity, show tooltip
- **Click (Weight Node):** Expand to show ternary value
- **Hover (Spine):** Brighten color, show thermal specs

#### 2. Innovation Icons

**Purpose:** Visual representation of key Lucineer innovations

**Requirements:**
- Format: SVG icons (inline)
- Size: 48×48px (scalable)
- Style: Line art, 2px stroke
- Color: White (inherit from text)

**Icon List:**
1. **Mask-Locked:** Padlock with circuit pattern
2. **Thermal:** Fire/heat symbol with dendritic branches
3. **Educational:** Graduation cap with neural network
4. **Efficiency:** Lightning bolt with 50× label
5. **Hardware:** CPU/chip icon
6. **Cross-Cultural:** Globe with dialogue bubbles

---

### SpreadsheetMoment Section Assets

#### 1. Interactive Spreadsheet Interface

**Purpose:** Live demo of tensor spreadsheet functionality

**Specifications:**
- Format: React component (not static asset)
- Grid: 10 rows × 6 columns (default)
- Cell size: 80×40px
- Colors: Dynamic based on confidence level

**Visual States:**

```
┌─────────────────────────────────────────────────────────────┐
│  SPREADSHEET CELL STATES                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Empty Cell:                                                │
│  ├─ Background: Transparent                               │
│  ├─ Border: 1px solid #e2e8f0                            │
│  └─ Content: None                                         │
│                                                             │
│  Data Cell (Low Confidence < 50%):                         │
│  ├─ Background: rgba(245, 101, 101, 0.3) # Red            │
│  ├─ Border: 1px solid #f56565                             │
│  ├─ Text: "AI" or value                                   │
│  └─ Confidence indicator: "XX%" in corner                 │
│                                                             │
│  Data Cell (Medium Confidence 50-80%):                     │
│  ├─ Background: rgba(237, 137, 54, 0.3) # Orange          │
│  ├─ Border: 1px solid #ed8936                             │
│  └─ Confidence indicator: "XX%" in corner                 │
│                                                             │
│  Data Cell (High Confidence > 80%):                        │
│  ├─ Background: rgba(72, 187, 120, 0.3) # Green           │
│  ├─ Border: 1px solid #48bb78                             │
│  └─ Confidence indicator: "XX%" in corner                 │
│                                                             │
│  Pattern Detected Cell:                                    │
│  ├─ Additional: Small icon in corner (✓)                  │
│  ├─ Animation: Subtle pulse                               │
│  └─ Tooltip: "Pattern: [pattern name]"                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Audience Level Illustrations

**Purpose:** Visual metaphors for different explanation levels

**Educational (5th Grade):**
- Style: Cartoon/illustration
- Characters: Friendly cell mascots
- Metaphors: Simple analogies (school, games)
- Colors: Bright, saturated
- Format: SVG illustrations

**General (Laypeople):**
- Style: Clean infographics
- Metaphors: Real-world examples
- Diagrams: Simplified flowcharts
- Colors: Professional, accessible
- Format: SVG diagrams

**Technical (Engineers):**
- Style: Technical schematics
- Content: Architecture diagrams
- Notation: Mathematical symbols
- Colors: Blueprint style (blue/white)
- Format: SVG technical drawings

---

### Simulations Section Assets

#### 1. Simulation Preview Cards

**Purpose:** Thumbnails and previews for interactive simulations

**Specifications:**
- Format: SVG (for consistency)
- Dimensions: 600×400px (3:2 aspect ratio)
- Style: Miniature versions of simulation interfaces

**Required Simulations:**

**Confidence Cascade:**
- Visual: Waterfall diagram with confidence levels
- Colors: Green (high) → Orange (med) → Red (low)
- Animation: Cascading flow effect

**Self-Play Mechanisms:**
- Visual: Game board with two AI players
- Colors: Blue vs. Purple pieces
- Animation: Pieces moving, ELO scores updating

**Emergence Detection:**
- Visual: Network graph with highlighting patterns
- Colors: Gray background, bright detected patterns
- Animation: Patterns emerging from chaos

**Thermal Geometry:**
- Visual: Cross-section of chip with heat flow
- Colors: Blue (cool) → Red (hot) gradient
- Animation: Heat flowing through spine structures

**Cross-Cultural Synthesis:**
- Visual: World map with dialogue bubbles
- Colors: Flag colors for 8 languages
- Animation: Bubbles appearing and connecting

**Origin-Centric Data:**
- Visual: Tree diagram showing data lineage
- Colors: Gradient from source to destination
- Animation: Paths highlighting from origin

#### 2. Simulation UI Components

**Common Elements:**

**Control Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│  SIMULATION CONTROL PANEL                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Play/Pause Button] [Reset Button] [Step Button]          │
│                                                             │
│  Speed Control:                                             │
│  [Slow] ●━━━━━━━━━ [Fast]                                  │
│                                                             │
│  Parameters:                                                │
│  ├─ Confidence Threshold: [Slider]                         │
│  ├─ Network Size: [Slider]                                 │
│  └─ Iterations: [Number input]                             │
│                                                             │
│  [Run Simulation] [Download Results]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Results Display:**
- Charts: Line charts for metrics over time
- Heatmaps: 2D color grids for spatial data
- Network Graphs: Node-link diagrams
- Tables: Sortable data tables

---

### Timeline Section Assets

#### 1. Evolution Timeline Visualization

**Purpose:** Show journey from ancient cells to modern AI

**Specifications:**
- Format: Horizontal scrollable timeline
- Style: Clean, modern, with geological/paleontological aesthetic
- Colors: Gradient from earth tones to futuristic blues

**Visual Design:**

```
┌─────────────────────────────────────────────────────────────┐
│  TIMELINE DESIGN                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Horizontal Line:                                           │
│  ├─ Color: Gradient (brown → blue → purple)               │
│  ├─ Stroke: 4px                                           │
│  └─ Position: Center of container                         │
│                                                             │
│  Milestone Markers:                                         │
│  ├─ Shape: Circles (20px radius)                          │
│  ├─ Fill: White with colored border                       │
│  ├─ Position: On timeline line                           │
│  └─ Interactive: Hover to expand                          │
│                                                             │
│  Date Labels:                                               │
│  ├─ Format: "3.5 BYA", "2026", etc.                       │
│  ├─ Position: Above marker                                │
│  ├─ Font: Monospace (Fira Code)                           │
│  └─ Color: #718096                                        │
│                                                             │
│  Event Cards:                                               │
│  ├─ Shape: Rounded rectangle                              │
│  ├─ Background: White with shadow                         │
│  ├─ Position: Below marker                                │
│  ├─ Content: Title + description                           │
│  └─ Max Width: 200px                                      │
│                                                             │
│  Connecting Lines:                                          │
│  ├─ Style: Curved bezier from marker to card              │
│  ├─ Stroke: 2px, gray                                     │
│  └─ Animation: Draw on scroll                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Milestone Content:**

1. **3.5 BYA** - First Cells
   - Image: Simple cell illustration
   - Text: "Origin of cellular computation"

2. **1 BYA** - Multicellular Life
   - Image: Cell cluster
   - Text: "Cellular coordination emerges"

3. **500 MYA** - Nervous Systems
   - Image: Simple neural network
   - Text: "Distributed intelligence"

4. **200 MYA** - Dendritic Spines
   - Image: Spine structure
   - Text: "Memory storage inspiration"

5. **2024** - SuperInstance
   - Image: Logo/icon
   - Text: "Mathematical formalization"

6. **2026** - Lucineer
   - Image: Chip visualization
   - Text: "Biological intelligence in silicon"

7. **Future** - Universal Computation
   - Image: Abstract network
   - Text: "Any problem, any scale"

---

## Icon Set Requirements

### Primary Navigation Icons

**Format:** SVG (Lucide icon set recommended)
**Size:** 24×24px (default), 16×16px (small), 32×32px (large)
**Stroke:** 2px
**Color:** Current color (inherit)

**Required Icons:**

```
Navigation:
- Menu (hamburger)
- Close (X)
- Search
- Chevron (right, left, up, down)
- External link

Sections:
- File text (papers)
- CPU (Lucineer)
- Grid (SpreadsheetMoment)
- Play circle (simulations)
- Book (documentation)
- Users (community)
- Settings
- Help circle

Social:
- GitHub
- Twitter
- LinkedIn
- Email
- RSS

Actions:
- Download
- Share
- Copy
- Link
- Filter
- Sort
- Refresh
- Zoom in/out

Status:
- Check circle (complete)
- Clock (in progress)
- Lightbulb (proposed)
- Alert circle (error)
- Info (information)
```

---

## Image Optimization Guidelines

### Format Selection

```
┌─────────────────────────────────────────────────────────────┐
│  IMAGE FORMAT RECOMMENDATIONS                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Photographs:                                               │
│  ├─ Primary: WebP                                         │
│  ├─ Fallback: JPEG                                         │
│  └─ Quality: 85                                            │
│                                                             │
│  Graphics/Illustrations:                                   │
│  ├─ Primary: SVG                                          │
│  ├─ Fallback: WebP                                         │
│  └─ Quality: Lossless for SVG, 90 for WebP                │
│                                                             │
│  Screenshots:                                              │
│  ├─ Primary: WebP                                         │
│  ├─ Fallback: PNG                                          │
│  └─ Quality: 90                                            │
│                                                             │
│  Icons:                                                    │
│  ├─ Format: SVG (inline)                                  │
│  ├─ Optimization: SVGO                                     │
│  └─ Style: Minimal stroke                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Responsive Images

```html
<!-- Example responsive image markup -->
<picture>
  <source
    srcset="image-400w.webp 400w,
            image-800w.webp 800w,
            image-1200w.webp 1200w"
    sizes="(max-width: 640px) 400px,
           (max-width: 1024px) 800px,
           1200px"
    type="image/webp"
  />
  <source
    srcset="image-400w.jpg 400w,
            image-800w.jpg 800w,
            image-1200w.jpg 1200w"
    sizes="(max-width: 640px) 400px,
           (max-width: 1024px) 800px,
           1200px"
    type="image/jpeg"
  />
  <img
    src="image-800w.jpg"
    alt="Descriptive alt text"
    loading="lazy"
    width="800"
    height="600"
  />
</picture>
```

### Compression Settings

**WebP:**
- Quality: 85 (photos), 90 (graphics)
- Method: 6 (balanced speed/size)
- Metadata: Minimal (strip EXIF where possible)

**JPEG:**
- Quality: 80-85
- Progressive: Yes
- Optimized: Yes (with mozjpeg)

**PNG:**
- Compression: 9 (maximum)
- Progressive: Yes
- Palette: For limited color images

---

## Animation Asset Guidelines

### SVG Animation Best Practices

**Performance:**
- Limit animated elements to < 100 per frame
- Use CSS transforms (GPU accelerated)
- Avoid animating layout properties
- Use `will-change` sparingly

**File Size:**
- Compress with SVGO
- Remove unused definitions
- Optimize paths (reduce precision)
- Gzip compression on server

**Accessibility:**
- Provide `prefers-reduced-motion` media query
- Include static fallback
- Add descriptive ARIA labels

### Example Animation CSS

```css
/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Smooth floating animation */
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

.cell {
  animation: float 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  will-change: transform;
}

/* Pulse animation */
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

.active {
  animation: pulse 2s ease-in-out infinite;
  will-change: transform, opacity;
}
```

---

## Asset Delivery Format

### Folder Structure

```
website/public/
├── images/
│   ├── hero/
│   │   └── cellular-network.svg
│   ├── papers/
│   │   ├── thumbnails/
│   │   └── previews/
│   ├── lucineer/
│   │   ├── chip-visualization.svg
│   │   └── innovation-icons/
│   ├── spreadsheet-moment/
│   │   ├── illustrations/
│   │   └── screenshots/
│   ├── simulations/
│   │   └── previews/
│   ├── timeline/
│   │   └── milestones/
│   └── icons/
│       └── lucide/
└── papers/
    └── pdf/
```

### Naming Convention

```
Format: [section]-[description]-[variant].[ext]

Examples:
- hero-cellular-network.svg
- papers-thumbnail-p02.webp
- lucineer-chip-visualization.svg
- spreadsheet-illustration-educational.svg
- simulations-preview-confidence-cascade.webp
- timeline-milestone-3.5bya.svg
- icon-github.svg
```

---

## Asset Creation Workflow

### Phase 1: Concept Sketches
1. Rough sketches of key visualizations
2. Review with team for feedback
3. Refine based on requirements

### Phase 2: Digital Drafts
1. Create vector versions (Figma/Illustrator)
2. Apply design system colors
3. Test at different sizes

### Phase 3: Optimization
1. Export to SVG/WebP
2. Run optimization tools (SVGO, ImageOptim)
3. Test in browser
4. Verify accessibility

### Phase 4: Integration
1. Place in appropriate folders
2. Update component imports
3. Test responsiveness
4. Verify performance

---

## Tools & Resources

### Design Tools
- **Vector Graphics:** Figma, Adobe Illustrator, Inkscape
- **Image Editing:** Photoshop, GIMP, Affinity Photo
- **Icon Editing:** IconScout, Nucleo, Lucide
- **Animation:** After Effects, Lottie, CSS manually

### Optimization Tools
- **SVG:** SVGO, SVGOMG
- **Images:** Squoosh, ImageOptim, TinyPNG
- **Testing:** Lighthouse, WebPageTest

### Reference Resources
- **Design Patterns:** Dribbble, Behance
- **Scientific Vis:** Observable, D3 Gallery
- **Icon Libraries:** Lucide, Heroicons, Feather Icons

---

## Quality Checklist

Before finalizing any asset:

- [ ] Follows design system colors
- [ ] Matches style guide specifications
- [ ] Optimized for web (file size < 100KB for images)
- [ ] Responsive (works at multiple sizes)
- [ ] Accessible (alt text, ARIA labels)
- [ ] Performant (60fps animations)
- [ ] Cross-browser compatible
- [ ] Properly named and organized
- [ ] Tested in context
- [ ] Documented (if custom asset)

---

## Conclusion

This visual assets guide provides the complete blueprint for creating all visual elements needed for the SuperInstance homepage. By following these specifications, we ensure:

1. **Consistency** across all visual elements
2. **Performance** through optimized assets
3. **Accessibility** for all users
4. **Maintainability** through clear organization
5. **Scalability** for future additions

All visual assets should support the core narrative: from 3.5 billion years of cellular evolution to the future of AI computation, making complex concepts accessible to everyone.

---

**Status:** Asset Specifications Complete
**Next Steps:** Begin asset creation workflow
**Timeline:** Parallel with development (Phase 1-4)
