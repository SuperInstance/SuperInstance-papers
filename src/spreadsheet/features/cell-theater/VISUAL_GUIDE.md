# Cell Theater - Visual Guide

## UI Layout Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cell Theater                                    [×]                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │                    STAGE RENDERER                           │   │
│  │                   (Canvas Area)                            │   │
│  │                                                             │   │
│  │          ┌─────┐     ┌─────┐     ┌─────┐                   │   │
│  │          │HEAD │     │BODY │     │TAIL │                   │   │
│  │          └─────┘     └─────┘     └─────┘                   │   │
│  │                                                             │   │
│  │    [Sensation Particles]    [Reasoning]   [Outputs]        │   │
│  │           ◉ ◉ ◉                ▼ ▼ ▼         ◉ ◉            │   │
│  │                                                             │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │   │
│  │  Confidence: ████████░░ 85%                                 │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Active Event: [●] Sensing input from A2                          │
│                  Confidence: 80%                                   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Timeline                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  │ | | ||| |  |  ||      ||   | |  | |||  |  |||               │   │
│  0:00.00            0:02.45              0:05.00                  │
│  52 events • 8 reasoning steps • Peak conf: 92%                    │
├─────────────────────────────────────────────────────────────────────┤
│  [▶]  [⏹]  [⏪]  [⏩]  [⏮]  [⏭]  0:02.45 / 0:05.00              │
│                                                                     │
│  Speed: [0.5x] [1x] [1.5x] [2x]  🔁 Loop  📥 Export               │
└─────────────────────────────────────────────────────────────────────┘
```

## Color Scheme

### Event Colors

```
Green (#4CAF50)       - Sensations, Inputs, Positive outcomes
Blue (#2196F3)        - Processing, Analysis
Purple (#9C27B0)      - Reasoning, Inference
Orange (#FF9800)      - Outputs, Confidence changes
Red (#F44336)         - Errors, Low confidence
Gray (#666)           - Dormant, Inactive
```

### State Colors

```
Dormant  = Gray    (#666666)
Sensing  = Green   (#4CAF50)
Processing = Blue  (#2196F3)
Emitting = Orange  (#FF9800)
Error    = Red     (#F44336)
```

### Confidence Gradient

```
Low      Medium     High
0% ────── 50% ────── 100%
🔴 🟠 🟢 🟢 🟢
```

## Animation Flow

```
1. SENSATION RECEIVED
   ┌───────────────────────────────────────┐
   │  ◉ Particle flows in from edge       │
   │     toward HEAD circle               │
   └───────────────────────────────────────┘

2. PROCESSING STARTED
   ┌───────────────────────────────────────┐
   │  BODY circle pulses with blue glow   │
   │     Reasoning steps appear below     │
   └───────────────────────────────────────┘

3. REASONING STEP
   ┌───────────────────────────────────────┐
   │  Step highlighted in list            │
   │  "Analyzing input value of 15"       │
   │  Confidence meter animates           │
   └───────────────────────────────────────┘

4. DECISION MADE
   ┌───────────────────────────────────────┐
   │  Cyan flash on BODY                  │
   │  "Decision: Increase by 10%"         │
   │  Confidence peaks                    │
   └───────────────────────────────────────┘

5. OUTPUT READY
   ┌───────────────────────────────────────┐
   │  ◉ Particle flows out from TAIL      │
   │     toward edge/target               │
   └───────────────────────────────────────┘
```

## Stage Elements

### Head (Input Receptor)
- **Shape**: Circle on the left
- **Color**: Green tint
- **Function**: Receives sensations and inputs
- **Animation**: Particles flow inward

### Body (Processing Center)
- **Shape**: Larger circle in center
- **Color**: Blue tint
- **Function**: Processes and reasons
- **Animation**: Pulses during activity

### Tail (Output Emitter)
- **Shape**: Circle on the right
- **Color**: Orange tint
- **Function**: Produces outputs and effects
- **Animation**: Particles flow outward

### Sensation Particles
- **Appearance**: Small colored circles
- **Color**: Based on sensation type
- **Motion**: Flow from edge to Head
- **Trail**: Fading line behind particle

### Reasoning Steps
- **Appearance**: Scrolling text list
- **Location**: Below BODY circle
- **Highlighting**: Active step is highlighted
- **Fading**: Old steps fade out

### Output Particles
- **Appearance**: Small colored circles
- **Color**: Green/amber
- **Motion**: Flow from Tail to edge
- **Connection**: Line to Tail circle

### Confidence Meter
- **Location**: Bottom of stage
- **Appearance**: Horizontal gradient bar
- **Colors**: Red → Orange → Green
- **Animation**: Smooth transitions
- **Label**: Percentage display

### Visual Effects
- **Pulse**: Expanding circle from center
- **Flow**: Moving particles along paths
- **Spark**: Brief flash at location
- **Wave**: Expanding ring from point

## Controls

### Playback Controls
```
[▶] Play/Pause - Large circular button
[⏹] Stop - Square button, resets to start
[⏪] Skip Back - Jump 5 seconds backward
[⏩] Skip Forward - Jump 5 seconds forward
[⏮] Step Back - Go to previous event
[⏭] Step Forward - Go to next event
```

### Speed Control
```
[0.5x] - Half speed (slow motion)
[1x]   - Normal speed
[1.5x] - 1.5x speed
[2x]   - Double speed (fast)
```

### Loop Toggle
```
🔁 Loop - Enable/disable looping
         When enabled, click timeline to set loop region
```

### Export
```
📥 Export - Save recording as JSON (future: video/gif)
```

## Timeline Markers

### Event Markers
```
Thin vertical lines
Color-coded by event type
Click to jump to event
```

### Key Moment Markers
```
Thicker vertical lines
First Input (green)
Processing Started (blue)
Decision Made (cyan)
Output Produced (amber)
```

### Loop Region
```
Purple shaded area
Dashed border
Drag edges to adjust
```

### Playhead
```
White vertical line
Glow effect
Shows current position
```

## Inspector Integration

### Theater Tab
```
┌─────────────────────────────────────────┐
│  🎭 Cell Theater                       │
│                                        │
│  ┌─────────────────────────────────┐   │
│  │  Recording List                 │   │
│  ├─────────────────────────────────┤   │
│  │ 📼 2026-03-09 14:32:15  2.3s   │   │
│  │    45 events • 7 reasoning      │   │
│  │    70% → 95% • Peak: 95%       │   │
│  ├─────────────────────────────────┤   │
│  │ 📼 2026-03-09 14:30:00  1.8s   │   │
│  │    32 events • 5 reasoning      │   │
│  │    60% → 85% • Peak: 90%       │   │
│  └─────────────────────────────────┘   │
│                                        │
│  [Click recording to replay]          │
└─────────────────────────────────────────┘
```

## Recording States

```
IDLE      - Not recording
RECORDING - actively capturing events
PAUSED    - recording paused
STOPPED   - recording ended and saved
```

## Playback States

```
IDLE      - Not playing
PLAYING   - actively replaying
PAUSED    - playback paused
SEEKING   - user dragging timeline
```

## Responsive Layout

### Desktop (>1200px)
```
Full theater + Inspector side panel
Timeline: Full width
Controls: Full width
```

### Tablet (768-1200px)
```
Theater takes full width
Inspector: Overlay or below
Controls: Scaled down
```

### Mobile (<768px)
```
Vertical layout
Controls stacked
Timeline: Simplified
Stage: Smaller canvas
```

---

**Visual Guide Version**: 1.0.0
**Last Updated**: 2026-03-09
