# POLLN Spreadsheet - Mobile & PWA Research Document

**Version:** 1.0  
**Date:** 2026-03-09  
**Status:** Research Document  
**Focus:** Mobile Optimization and Progressive Web App Opportunities for LOG Spreadsheet System

---

## Executive Summary

This document explores mobile and Progressive Web App (PWA) opportunities for the POLLN spreadsheet system, focusing on how the unique LOG (Ledger-Organizing Graph) cell paradigm translates to mobile experiences. The research covers touch interactions, responsive design, PWA features, performance optimization, and native feature integration.

**Key Finding:** The living cell paradigm (cells with sensation, memory, and agency) creates unique mobile UX opportunities not found in traditional spreadsheets. Mobile users can feel cell states through haptic feedback, touch cell relationships through gestures, and see cell consciousness through augmented reality overlays.

---

## 1. Mobile UX Patterns

### 1.1 The Living Cell on Mobile

**Cell Pulse on Mobile:**
- Desktop: Breathing animation (2D)
- Mobile: Haptic feedback + Visual pulse
- States: DORMANT (no feedback), SENSING (light pulse every 2s), PROCESSING (rapid vibration), EMITTING (single strong tap), ERROR (triple sharp buzz)

**Touch-to-Inspect Paradigm:**
- Desktop: Click + Hover tooltip
- Mobile: Long press (500ms) → Full-screen inspection panel
- Shows: HEAD inputs, BODY reasoning, TAIL outputs, ORIGIN sensations

### 1.2 Mobile-First Layout Patterns

**Vertical Navigation Pattern:**
- Desktop: Grid view (rows × columns)
- Mobile: Card-based vertical scroll
- Each cell shows: Type, State, Confidence, Activity indicator

**Tab-Based View Switching:**
- Bottom navigation: Grid, Network, Settings
- Views: Traditional grid, Graph visualization, Configuration

### 1.3 Responsive Breakpoints

Mobile: Card-based layout (< 768px)
Tablet: 2-column grid (768px - 1023px)
Desktop: Full spreadsheet grid (>= 1024px)

---

## 2. Touch Interactions

### 2.1 Touch Gesture Mapping

| Gesture | Desktop | Mobile Action |
|---------|---------|--------------|
| Tap (short) | Click | Select cell, show mini-inspector |
| Long press (500ms) | Right-click | Full inspection panel |
| Double tap | Double-click | Edit cell configuration |
| Swipe left | Delete key | Delete cell |
| Swipe right | Duplicate | Copy cell with new ID |
| Pinch out | Zoom in | Enter focus mode on cell |
| Pinch in | Zoom out | Exit focus mode |
| Two-finger drag | Pan | Move through large grids |
| Three-finger swipe | Tab switch | Change views |

### 2.2 Touch Target Sizes

Following WCAG 2.1 AAA guidelines:
- Minimum: 44×44px
- Optimal: 48×48px
- Large actions: 56×56px
- Spacing: 8px minimum

---

## 3. Responsive Grid Layout

### 3.1 Adaptive Grid Strategy

**Mobile Config:**
- maxVisibleCells: 50
- maxActiveCells: 10
- maxSensationsPerCell: 5
- cell size: 340×80px

**Desktop Config:**
- maxVisibleCells: 500
- maxActiveCells: 100
- maxSensationsPerCell: 20
- cell size: 100×40px

### 3.2 Virtual Scrolling for Mobile

- bufferSize: 3 cells above/below viewport
- cellHeight: 80px for mobile cards
- overscan: 2 extra rows for smooth scrolling
- Only render visible cells to conserve memory

---

## 4. Mobile-First UI Patterns

### 4.1 Bottom Sheet Navigation

- Drag handle for sheet expansion
- Full-screen cell inspector on long press
- Shows: Type, State, Confidence, Watched Cells, History

### 4.2 Swipe Actions

- Swipe left: Connect to another cell (blue)
- Swipe right: Delete cell with confirmation (red)

### 4.3 Floating Action Button (FAB)

- Primary: Add new cell
- Expanded: Input, Transform, Prediction, Explain cells
- Position: Bottom-right, above navigation

---

## 5. Gesture Controls

### 5.1 Gesture Library

- inspect: 1 touch, 500ms max
- quickConnect: 2 touches, 50px min distance
- zoomFocus: 2 touches, diagonal, 20px min
- deleteCell: 1 touch, 100px min distance, 800ms max

### 5.2 Gesture Recognition

- Track touch start/move/end events
- Calculate duration and distance
- Match against gesture configurations
- Execute associated actions

---

## 6. PWA Features

### 6.1 Offline Mode Strategy

**cacheFirst:** /index.html, /styles.css, /main.js, icons  
**networkFirst:** /api/cells, /api/colonies, /api/state  
**staleWhileRevalidate:** /api/cells/*/history, sensations  
**networkOnly:** /api/realtime, /api/websocket

### 6.2 Service Worker

- Cache name: polln-spreadsheet-v1
- Runtime cache: polln-runtime-v1
- Strategies: Cache-first, Network-first, Stale-while-revalidate
- Offline fallback for all requests

### 6.3 Install as App

- manifest.json with app metadata
- Icons: 72, 96, 128, 144, 152, 192, 384, 512px
- Screenshots: Narrow (mobile) and Wide (desktop)
- Shortcuts: New Cell, Inspect Cell
- Categories: productivity, utilities

### 6.4 Push Notifications

- Cell state change notifications
- Alert notifications for anomalies
- Action buttons: Inspect, Dismiss
- Tag-based notification grouping

### 6.5 Background Sync

- Sync cell states when online
- Queue offline changes
- Retry failed syncs automatically
- Sync tags: sync-cell-states, sync-sensations

---

## 7. Performance Optimization

### 7.1 Reduced Cell Counts for Mobile

Mobile: 50 visible, 10 active, 5 sensations per cell  
Desktop: 500 visible, 100 active, 20 sensations per cell

### 7.2 Lazy Loading Strategy

- Intersection Observer API for viewport detection
- Load cells 100px before visible
- Unload cells outside viewport
- Pause processing for invisible cells

### 7.3 Optimized Bundle Size

- Code splitting: Core, Mobile, Desktop, Features
- Dynamic imports for feature-specific code
- Route-based chunking
- Tree shaking for unused code

### 7.4 Battery Efficiency

- Reduce updates when battery < 20%
- Pause non-essential cells on low battery
- Lower update frequency when not charging
- Reduce haptic feedback to save power

---

## 8. Native Feature Integration

### 8.1 Camera Integration (Scan Spreadsheets)

- Access camera with getUserMedia
- Capture spreadsheet images
- OCR processing for cell data
- Import existing spreadsheets

### 8.2 Haptic Feedback API

Cell states mapped to vibration patterns:
- DORMANT: No feedback
- SENSING: Light pulse (50ms)
- PROCESSING: Rapid vibration (50, 50, 50)
- EMITTING: Single strong tap (100ms)
- ERROR: Triple sharp buzz (50, 50, 50, 50, 50, 50)

### 8.3 Share Native API

- Share cell URLs
- Share cell images (rendered as canvas)
- Fallback to clipboard for older browsers

### 8.4 File System Access API

- Open spreadsheets: showOpenFilePicker
- Save spreadsheets: showSaveFilePicker
- Export cell networks as JSON/CSV

---

## 9. Service Worker Architecture

### 9.1 IndexedDB Schema

Stores:
- cells (by-state, by-type, by-position)
- cellHistory (by-cell, by-timestamp)
- sensations (by-source, by-target, by-type)
- offlineChanges (by-timestamp, by-synced)
- settings

### 9.2 Cache Strategy

- Static assets: Cache-first
- API calls: Network-first
- History/trends: Stale-while-revalidate
- Real-time: Network-only

---

## 10. Progressive Enhancement Strategy

### 10.1 Enhancement Layers

1. Service Worker → Offline support
2. IndexedDB → Local storage
3. Web Notifications → Push alerts
4. Vibration API → Haptic feedback
5. File System Access → Native file operations
6. Web Share → Native sharing

### 10.2 Feature Detection

Detect and progressively enhance:
- serviceWorker in navigator
- indexedDB in window
- Notification in window
- vibrate in navigator
- showOpenFilePicker in window
- share in navigator

---

## 11. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Set up PWA manifest
- Implement service worker with basic caching
- Create responsive breakpoints
- Implement mobile card layout
- Add touch event handlers

### Phase 2: Touch & Gestures (Weeks 3-4)
- Implement gesture recognition
- Add haptic feedback
- Create touch-based cell inspector
- Implement swipe actions
- Add long-press menus

### Phase 3: PWA Features (Weeks 5-6)
- Implement offline mode
- Add push notifications
- Create background sync
- Implement IndexedDB storage
- Add install prompts

### Phase 4: Native Integration (Weeks 7-8)
- Add camera scanning
- Implement file system access
- Add native sharing
- Create share targets
- Implement shortcuts

### Phase 5: Performance (Weeks 9-10)
- Implement virtual scrolling
- Add lazy loading
- Optimize bundle size
- Add battery optimization
- Implement progressive enhancement

---

## 12. Technical Specifications

### 12.1 Browser Support

| Browser | Min Version | PWA Support | Notes |
|---------|-------------|-------------|-------|
| Chrome | 80+ | Full | Best experience |
| Safari | 13+ | Partial | No push notifications |
| Firefox | 75+ | Full | Good support |
| Edge | 80+ | Full | Chromium-based |
| Samsung Internet | 11+ | Full | Good mobile support |

### 12.2 Device Support

| Device | Screen Size | Layout | Performance |
|--------|-------------|---------|-------------|
| Small Phone | < 375px | Single column | Reduced cells |
| Large Phone | 375px - 428px | Single column | Optimized |
| Tablet | 768px - 1023px | 2-column grid | Full features |
| Desktop | > 1024px | Full grid | Full features |

### 12.3 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| First Input Delay | < 100ms | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Bundle Size | < 200KB | Build tools |
| Runtime Memory | < 100MB | DevTools |

---

## Conclusion

The POLLN spreadsheet system's unique living cell paradigm creates exceptional opportunities for mobile and PWA experiences. By leveraging:

1. **Touch-based cell inspection** - Long press to reveal consciousness
2. **Haptic feedback** - Feel cell states through vibration
3. **Offline-first architecture** - Cells continue working anywhere
4. **Progressive enhancement** - Works on any device, enhanced on modern browsers
5. **Native integration** - Camera, sharing, file system access

The mobile experience becomes not just a smaller version of desktop, but a fundamentally different way to interact with living cells - more tactile, more personal, and more connected to the physical world.

**Key Recommendation:** Implement mobile-first with the card-based layout as the primary interface. The traditional spreadsheet grid should be seen as a power user view, while the card layout represents the default, accessible way to interact with living cells.

---

## Next Steps

1. **Prototype mobile card layout** - Create interactive mockups
2. **Test gesture recognition** - Validate touch interactions
3. **Implement service worker** - Enable offline mode
4. **Measure performance** - Benchmark on mobile devices
5. **User testing** - Validate mobile UX patterns

---

**Document Status:** Research Complete  
**Next Steps:** Implementation Planning  
**Priority:** High (Wave 7+)  
**Related Documents:** ARCHITECTURE.md, UX_DESIGN.md, CELL_ONTOLOGY.md

---

*POLLN Spreadsheet - Mobile & PWA Research*  
*Living Cells, Anywhere, Everywhere*
