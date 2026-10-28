# Syzygy-OpenSkyFlight — Backend Technology & Rendering

Deep research on the forked flight simulator, and how to turn it into
an ASCII world.

## What it is

A browser-based 3D flight simulator over real-world terrain. Fly anywhere
on Earth using elevation data from AWS Terrarium. No install, no build
step, no API key. The repo is at
`SuperInstance/Syzygy-openskyflight` (forked).

## The rendering stack

### Three.js WebGPU (not WebGL)

This is the critical detail. The app uses `THREE.WebGPURenderer`, not the
classic WebGL renderer:

```js
const renderer = new THREE.WebGPURenderer({
  antialias: true,
  powerPreference: 'high-performance',
  trackTimestamp: true,
});
await renderer.init();
```

**Why this matters for ASCII:** The WebGPU renderer outputs to a standard
HTML `<canvas>`. Our existing ASCII sampler (2D canvas `drawImage` +
`getImageData`) works on ANY canvas, regardless of whether the pixels
came from WebGL, WebGPU, or software rendering. The sampling approach
transfers directly.

**The depth challenge:** In WebGL, we could (with effort) read the depth
buffer. In WebGPU, the depth buffer is not directly accessible via 2D
canvas sampling. We get color pixels only. This shapes the ASCII strategy
(see "Depth without a depth buffer" below).

### TSL — Three.js Shading Language

Elevation data is decoded ON THE GPU using TSL (Three.js Shading Language):

```js
import { Fn, float, vec2, vec3, uv, positionWorld, ... } from 'three/tsl';
import { TileMap, TileSource, applyTerrariumElevation } from 'three-tile';
```

TSL is Three.js's shader abstraction that compiles to WGSL (WebGPU) or
GLSL (WebGL). The terrain elevation is decoded from Terrarium PNG tiles
directly in the shader — no CPU elevation processing.

**For ASCII:** We don't need to touch TSL. We sample the final rendered
pixels. The GPU does the heavy lifting; we just read the result.

### Terrain: three-tile + AWS Terrarium

- **Elevation:** AWS Terrarium PNG tiles (zoom 0-15), decoded on GPU
- **Imagery:** Satellite tiles, OSM road map, or synthetic modes
- **Tiling:** `three-tile` library handles the quadtree, LOD, and tile streaming
- **Adaptive LOD:** Quadtree subdivision based on camera distance, with
  concentric view-center weighting for hi-res mode

**4 texture modes** (cycle with `T`):
1. **Satellite** — real aerial imagery
2. **Road map** — OSM street map
3. **SAR radar** — synthetic aperture radar (wireframe-ish, high contrast)
4. **Elevation contours** — topographic lines (wireframe, very ASCII-friendly)

The SAR and Elevation modes are SYNTHETIC — they render as wireframe.
These are naturally high-contrast and will map BEAUTIFULLY to ASCII.
The contour mode especially: it's already lines on a background, which
is what ASCII does best.

### Adaptive quality

```js
// AdaptiveQualityManager.js
// Monitors frame time in a ring buffer.
// If slow: reduces pixel ratio (renders smaller, upscales).
// If fast: increases pixel ratio back to max.
```

This is the same pattern as our ASCII auto-tuner: measure performance,
adjust quality. The flight sim does it with pixel ratio; we do it with
character columns. Same feedback loop, different knob.

### Camera & flight

- **6-DOF flight controller** with pointer lock
- **Chase camera** (30m behind the Rafale) and **cockpit view** (toggle with `V`)
- **Flight plan system:** record waypoints, autopilot follows the path
- **Spring-damped camera** for smooth motion

The autopilot is key: it's the "game playing itself" for a flight sim.
We can hook the ASCII renderer to the autopilot for a hands-off demo.

## Depth without a depth buffer

Here's the core technical challenge Casey identified: "how ascii can
cleverly find the right characters to render depth and perspective
dramatically and understandably."

We cannot read the WebGPU depth buffer via 2D canvas. But we don't need
to. There are three clever approaches:

### 1. Brightness-as-depth (current, but smarter)

The naive approach maps pixel brightness → character density. But for
a flight sim over terrain, we can be smarter:

- **Sky** is bright → sparse characters (` `, `.`, `·`)
- **Terrain** is mid-tone → medium characters (`:`, `+`, `=`)
- **Shadows/ridges** are dark → dense characters (`#`, `@`, `█`)

This already gives a sense of depth because atmospheric perspective
makes distant terrain brighter (haze) and near terrain darker (detail).
The atmosphere is doing our depth cueing for us.

### 2. Edge-aware character selection

Instead of just brightness, detect EDGES and choose characters that
follow the edge orientation:

- Horizontal edge → `-` or `=`
- Vertical edge → `|` or `!`
- Diagonal `/` → `/`
- Diagonal `\` → `\`

This makes ridges, horizons, and aircraft silhouettes POP because the
characters align with the actual geometry. It's how ASCII artists draw
— they don't just shade, they follow form.

Implementation: Sobel edge detection on the sampled pixels (cheap at
low resolution), then pick the character from a directional set based
on gradient angle, with density based on gradient magnitude.

### 3. Telemetry-driven depth cues

The flight sim has rich telemetry: altitude (MSL + AGL), speed,
pitch, roll, heading. We can use this to modulate the ASCII:

- **Low altitude:** Increase contrast and detail (ground is near, show it)
- **High altitude:** Decrease contrast, increase brightness (atmospheric haze)
- **High speed:** Reduce columns (motion blur effect, maintain framerate)
- **Banking:** Shift the character set (the horizon tilts, the ASCII should feel it)

This is "the settings sweep and find the best image" applied to flight:
the renderer adapts to the flight state, not just the pixels.

### 4. The contour mode shortcut

The Elevation texture mode renders topographic contour lines. This is
ALREADY a line drawing — it will map to ASCII with almost no loss.
For the "wow" demo, start with contour mode + ASCII. It'll look like
a living topographic map made of text.

## The toggle: three render modes

Casey's design: a button at the top with three options.

```
[ 3D ] [ ASCII ] [ SIDE-BY-SIDE ]
```

### Mode 1: 3D (default)
The current WebGPU render. Full-screen canvas. This is what pilots use.

### Mode 2: ASCII (full-screen)
The canvas is hidden. A `<pre>` fills the screen with the ASCII render.
Same flight controls, same HUD (overlaid as HTML). This is the "playing
in the ASCII world" mode.

For mobile: the ASCII pane goes full-screen, HUD overlays on top.

### Mode 3: Side-by-side (desktop) / Stacked (mobile)
- **Desktop:** 3D on left, ASCII on right. The comparison view.
  This is where you WATCH the technology — see how depth maps to characters.
- **Mobile:** 3D on top, ASCII below (or vice versa). Stacked vertically
  because side-by-side is too narrow on a phone.

### Implementation

The ASCII sampler runs on the WebGPU canvas via 2D sampling:
```js
// Works on any canvas, including WebGPU output
offscreenCtx.drawImage(webgpuCanvas, 0, 0, cols, rows);
const pixels = offscreenCtx.getImageData(0, 0, cols, rows).data;
// ... map to ASCII ...
```

No changes to the flight sim's rendering pipeline. The ASCII is a
pure overlay — it reads pixels, it doesn't modify the scene.

The toggle just shows/hides the canvas vs the `<pre>`, and starts/stops
the sampler. Minimal invasion, maximum effect.

## File map: where things live

```
js/
  app.js                    — main init, wires everything together
  scene/SceneSetup.js       — WebGPU renderer, scene, camera creation
  rendering/
    AdaptiveQualityManager.js — pixel-ratio feedback loop
  terrain/
    GeoTerrainManager.js    — three-tile terrain, 4 texture modes
  camera/
    FlightController.js     — 6-DOF flight controls
    ChaseCameraController.js — third-person follow
  ui/
    ControlPanel.js         — settings panel (ADD TOGGLE HERE)
    HUD.js                  — aircraft instruments
    Minimap.js              — 2D map overlay
  atmosphere/
    AtmosphericSky.js       — procedural sky
    CloudLayer.js           — animated clouds
```

**The toggle button** goes in `ControlPanel.js` or as a standalone
top-bar element in `index.html`. It controls a global `renderMode`
that the ASCII module reads.

**The ASCII module** is new: `js/ascii/AsciiRenderer.js` (to be built).
It takes the WebGPU canvas, the render mode, and the flight telemetry.

## What "ASCII city" does (from deep research)

**TheProgramOne/3D_Ascii_City** (verified live code read): A single-file
vanilla JS + Canvas DDA raycaster — 240 columns, 74° FOV, ≤32 steps per
ray, fisheye-corrected distance.

How it renders depth:
- **Wall height ∝ 1/distance** — near walls are tall, far walls are short.
  Depth is GEOMETRIC, not just shading.
- **Fog:** `pow(1 - d/26, 1.6)` — distant things fade.
- **Directional light:** North-South faces get ×0.52 brightness.
- **Vertical ambient occlusion** — crevices are darker.
- **1D per-column z-buffer** — one depth value per screen column.

Characters: `░▒▓█` for walls (block elements, not ASCII letters),
reversed `█▓▒░` for windows. Procedural facades (columns, floors,
mullions) per building style. 5 district color palettes. Landmark glyph
art (Eiffel Tower as `│/+/=` lattice).

**Key lesson:** They don't map brightness → character. They map
DEPTH → geometry → character. The character IS the depth cue.

## Glyphion, 3d-ascii-engine, rangedrifter

**Glyphion** (andrewmd5/glyphion, .NET): Double-buffered char + per-cell
float z-buffer + ANSI color buffers. Everything goes through `SetPixel`
with z-testing. NDC triangle rasterizer (barycentric fill), back-face
culling, perspective-correct UV texturing. 20-step gradient:
`" .:'-~=<\*({[%08O#@Q&"`. Textured path uses `texelBrightness × light
→ char` + texel RGB color.

**3d-ascii-engine** (amirabbas-gh/ascii-3d-engine, Rust, 360 lines):
Hand-rolled MVP pipeline, perspective divide, barycentric triangle fill,
per-cell z-buffer, back-face culling, flat Lambertian lighting
(`0.22 + diffuse × 0.78`) → 10-char ramp. 60 FPS, zero dependencies.

**Rangedrifter** (Max Schmidt, C + OpenGL, no public source — inference):
Mixed-size ASCII works because each glyph is a TEXTURED QUAD in true 3D
space. Perspective scales the quads (~1/depth), so near glyphs are big,
far ones are small. It's not a character grid — it's 3D text sprites.

Tradeoffs vs our uniform grid:
- Wins: free perspective depth cue, continuous camera, per-glyph animation
- Costs: distant glyphs become illegible, harder to scan as text,
  per-quad overdraw

**The pattern across all of them:** Every codebase uses an EXPLICIT
z-buffer (per-cell float, or 1D per-column for raycasters). They render
3D geometry DIRECTLY to characters. They don't sample pixels.

**We do it differently:** We sample the rendered image (3D → pixels →
ASCII). This is actually BETTER for the flight sim because we don't
need to reimplement terrain rendering — we get GPU lighting, atmosphere,
and textures for free. But we borrow their character wisdom: finer
gradients (Glyphion's 20-step), shape-aware selection, and the
understanding that depth should drive CHARACTER CHOICE, not just
brightness.

## The vision: text-based computer vision

Casey's long-term bet: if an agent can SEE the game as text (ASCII),
it can PLAY the game as text. No pixels, no vision model — just
characters.

The flight sim is the perfect testbed:
- The ASCII render is a compact state representation (e.g., 80×40 chars = 3,200 tokens)
- Telemetry provides ground truth (altitude, speed, heading)
- The agent reads the ASCII, decides on controls, the sim responds
- It's a closed loop: text in, actions out, text back

This is why the ASCII needs to convey depth "dramatically and
understandably" — it's not just for humans. It's for agents. The
characters are the agent's eyes.

Syzygy (the other project) is building the same capability: agents
that perceive via text. The flight sim + ASCII is the training ground.
