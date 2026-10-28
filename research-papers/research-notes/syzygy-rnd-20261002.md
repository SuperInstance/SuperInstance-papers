# Syzygy R&D — The Best Possible Way to Render ASCII

**Date:** 2026-10-02
**Mission:** Casey: "I don't think we're there yet on the best possible way to do this."
**Status:** Background research. No code changed.

---

## 0. Thesis

Our current renderer treats ASCII characters as **pixels with personality** — luminance goes in, a density-ramp character comes out. Every serious advance in the field treats characters as **shapes**, not pixels. The single biggest upgrade available to us is alexharri's shape-vector matching (6D sampling circles + contrast crunch), which delivers "far higher *effective* resolution" than any density ramp.

The second biggest upgrade: we are **estimating motion from pixels when we could derive it from the simulation**. TAA-style analytic motion vectors (camera velocity × depth buffer) give us per-cell motion for free. No optical flow estimation needed — we *are* the camera.

The third: Casey's kinetic-depth observation is **Wallach & O'Connell's Kinetic Depth Effect (1953)**. The vision science gives us design rules, not just vibes.

These three ideas — shape-vectors, analytic motion, KDE-driven design — are the foundation of the "best possible" renderer. Everything below is actionable.

---

## 1. State of the Art — What's New Since Our Last Survey

Our 2026-10-02 survey covered ASCII City, Glyphion, 3d-ascii-engine, and Rangedrifter. New findings:

### 1.1 ASCILINE (YusufB5) — the real-time video engine
- **What:** Python + NumPy real-time ASCII *video* renderer. OpenCV decodes → NumPy vectorized pixel→char mapping → WebSocket → HTML5 Canvas frontend.
- **Relevant:** 24–30 FPS target. Tiered color modes (B&W / 512 / 32K / 262K / 16M). "Pixel mode" using colored blocks for near-HD quality. Audio-synced master clock.
- **Takeaway for us:** NumPy-vectorized mapping is the CPU performance ceiling for density ramps. But ASCILINE is 2D video→text — it does no 3D rasterization. The 3D part is ours.
- Source: https://github.com/YusufB5/ASCILINE

### 1.2 Braille rendering — 4× resolution for free
- **What:** Unicode Braille block (U+2800–U+28FF) packs **8 individually addressable dots** (2×4 grid) per character cell. That's 4× the spatial resolution of standard ASCII.
- **Who:** artty (divisionseven/artty, detailed algorithm doc), mostlylucid.consoleimage (default render mode), Ascii-Forge, img2ascii (pandurodev).
- **Encoding:** `codepoint = 0x2800 + bitmask` where each of 8 bits = one pixel above threshold. Dot layout: bits 0x01–0x80 map to the 2×4 grid (not in visual order — check the standard layout).
- **Gotchas:** Braille blank (U+2800) is invisible and immune to `trimEnd()` — essential for padding. Font support varies; include `Segoe UI Symbol` / `Noto Sans Mono` / `Apple Symbols` in the font stack.
- **Takeaway for us:** A braille *detail layer* could sit alongside our ASCII base. ASCII for structure (shape-vectors), braille for fine detail. Or a user toggle: "density mode" vs "braille mode."
- Sources: https://github.com/divisionseven/artty/blob/HEAD/docs/algorithm.md · https://github.com/scottgal/mostlylucid.consoleimage/blob/HEAD/docs/BRAILLE-RENDERING.md

### 1.3 TouchDesigner ASCII & CRT Shader (mc2)
- **What:** Commercial TouchDesigner component doing ASCII quantization **in GLSL** — character quantization, CRT barrel curvature, scanlines, analog signal loss (V-sync roll, RF static, tearing) all in-shader.
- **Takeaway for us:** The entire ASCII pipeline *can* run as a fullscreen shader pass. This matters for our "ideal" design (Section 6) — no CPU readback needed if we quantize on-GPU.
- Source: https://www.patreon.com/emc2_lab/posts/realtime-ascii-169528287

### 1.4 alexharri — "ASCII characters are not pixels" (2026-01-17)
- **What:** The most important ASCII rendering writeup in existence. Interactive deep-dive proving that shape-based character selection beats density ramps.
- **Full pipeline documented below in Section 2.** This is our primary upgrade target.
- Source: https://github.com/alexharri/website/blob/HEAD/posts/ascii-rendering.md

### 1.5 rgfx (05vukasin) — terminal as viewport
- **Vision:** `rgfx model.glb` → interactive 3D preview in terminal. `rgfx video.mp4` → terminal video stream. "A universal media and 3D graphics engine for the terminal."
- **Takeaway:** Validates the "ASCII as universal interchange" thesis. Someone else is building toward the same Studio-like future.
- Source: https://github.com/05vukasin/rgfx/blob/HEAD/README.md

---

## 2. The Shape-Vector Upgrade — Our Biggest Single Win

### 2.1 The problem with density ramps

Our current renderer (and Glyphion, and ascii-3d-engine) maps **one luminance value → one character** via a sorted density ramp. alexharri proves this is "pretty much just nearest-neighbor downsampling" — it treats characters as pixels and ignores their *shape*.

The result: blurry edges, jaggies, characters that don't follow contours. Our Sobel edge-glyph overlay (`/`, `\`, `|`, `-`) is a band-aid on this — it adds directionality but only as a binary switch (edge / not-edge), not as true shape matching.

### 2.2 Shape vectors — how it works

**Offline (once):**
1. For each character in the alphabet, render it to a bitmap.
2. Place **6 sampling circles** over the cell (staggered vertically, sized to nearly cover the cell without excessive overlap). The 6-circle layout captures top/bottom/middle × left/right — enough to distinguish `^` vs `-` vs `_`, `p` vs `q`, `/` diagonals.
3. For each circle, compute overlap fraction: `(samples inside character) / (total samples)`. This gives a **6-dimensional shape vector** per character, values in [0, 1].
4. **Normalize** each component by the max across all characters (otherwise all vectors cluster near origin and lookups collapse to a few characters).

**Per frame, per cell:**
1. Sample the source image at the same 6 circle positions → **sampling vector** (6D).
2. **Global crunch** (contrast enhancement): normalize by max component, raise to power `p` (typically 1.5–2.7), denormalize. This "crunches" dark values toward zero while retaining bright ones — exaggerates the shape. Barely affects uniform vectors (smooth gradients stay smooth).
3. **Directional crunch** (kills staircasing): place **10 external sampling circles** just outside the cell boundary. For each internal component, take the max over its affecting external circles (mapping defined in `AFFECTING_EXTERNAL_INDICES`). Use this max for the normalize step instead of the internal max. This lets boundaries *outside* the cell sharpen the character pick *inside* it — the boundary transitions `! → : → .` smoothly instead of staircasing.
4. **Nearest-neighbor search**: find the character whose shape vector has minimum Euclidean distance (squared — skip the sqrt) to the crunched sampling vector.

**Result:** Characters follow contours. A circle renders as `'"` and `(` tracking the curve, not as a blob of `@`. "Far higher *effective* resolution" — the perceived detail exceeds the grid resolution because each character encodes sub-cell geometry.

### 2.3 Performance — making it real-time

Brute-force 6D nearest-neighbor over ~95 characters × ~4,400 cells = too slow for 60fps on mobile (single-digit FPS on iPhone in the prototype).

**Optimizations (in order of impact):**

1. **Quantized cache** (biggest win): Quantize each vector component to 3 bits (range 0–7, alexharri settled on range 8). Pack 6 components into an 18-bit key. Cache character picks in a Map. **100K lookups in "a few ms"** — lookup performance ceases to be a concern. Lazily populate; no precomputation needed.

2. **k-d tree** (3× over brute force): 6 dimensions is the sweet spot for k-d trees (degrade above ~20D). 100K lookups: 190ms → 66ms on MacBook. Only needed if cache hit rate is low.

3. **GPU sampling** (for the sampling-vector collection, not the lookup): The 70K+ vector components per frame (4,387 cells × 16 circles) crushed mobile CPU. Move to 6 shader passes:
   - Pass 1-2: Collect internal + external sampling vectors into `cols × rows × num_circles` textures
   - Pass 3: Max external value per internal component
   - Pass 4: Directional crunch
   - Pass 5: Max internal value per vector
   - Pass 6: Global crunch
   - Then CPU does the cached lookup (fast) and writes the text buffer.

**Our budget math:** At 110 cols × ~55 rows = 6,050 cells, with quantized cache, lookups are negligible (<1ms). The cost is sampling-vector collection: 6,050 × 16 circles × samples-per-circle. On CPU in JS at 10fps, we need this under ~50ms. **Recommendation:** start with 1 sample per circle (center sample only) + quantized cache. That's 96,800 samples/frame — trivial. Increase to 3×3 if quality demands it.

### 2.4 Parameters to tune

| Parameter | alexharri's range | Effect | Our starting point |
|---|---|---|---|
| `global_crunch` | 1.0–2.7 (up to 8) | Boundary contrast; higher = sharper separation | 2.0 |
| `directional_crunch` | 1.0–3.7 | Anti-staircasing; higher = smoother boundaries | 2.5 |
| Sampling circles | 6 (staggered) | Shape dimensions | 6, as documented |
| External circles | 10 | Directional reach | 10, as documented |
| Cache quantization | 3 bits (range 8) | Quality vs speed | 3 bits |
| Alphabet | 95 printable | Larger = better matches, slower cache fill | Start with ~40 curated |

### 2.5 What this replaces in our renderer

- **Replaces:** density-ramp lookup + binary Sobel edge-glyph switch.
- **Keeps:** telemetry-aware contrast/brightness/gamma (applied to the source before sampling), motion-depth boost (applied to the sampling vector, not the final character — see Section 3).
- **Upgrade path:** Implement shape-vectors as a *mode* alongside the current ramp. A/B test on contour terrain. The ramp is 10 lines; shape-vectors are ~200 lines + offline precomputation. Low risk to try.

---

## 3. Temporal Rendering — From Frame Deltas to Analytic Motion

### 3.1 What we're doing now

Frame-to-frame luminance delta per cell → motion boost. This is **frame differencing**, the cheapest motion signal. It works but has fundamental limits:
- Can't distinguish *what* moved or *which direction*
- Confuses lighting changes with motion
- No sub-cell precision
- One frame of memory (no velocity, no acceleration)

### 3.2 What TAA does (and what we should steal)

Temporal Anti-Aliasing is the most sophisticated real-time temporal technique in production. Key ideas:

**Motion vectors (the core):** Every pixel stores a 2D velocity vector (screen-space displacement from last frame). Computed **analytically** from the camera's previous/current view-projection matrices + per-pixel depth — not estimated from images. For static geometry with a moving camera:
```
prevUV = (prevViewProj × worldPos).xy
velocity = currentUV - prevUV
```

**Reprojection:** To find "what was at this pixel last frame," follow the motion vector backward: `historyUV = currentUV - velocity`. Sample the history buffer there.

**History validation:** Reject stale history when occlusion changes (depth discontinuity) or lighting changes (YCoCg color box clamp — if history color falls outside the current 3×3 neighborhood's bounding box, discard it).

**Jitter:** Sub-pixel camera offset per frame (Halton 2,3 sequence) so that over N frames, every sub-pixel position is sampled. This is **temporal supersampling** — the killer feature.

**Our adaptation — "Temporal ASCII":**

We don't need anti-aliasing. We need **motion-aware character selection**. Here's the mapping:

| TAA concept | Our ASCII equivalent |
|---|---|
| Motion vector buffer | Per-cell 2D velocity from camera matrices + depth |
| History buffer (color) | History buffer (sampling vectors, not characters) |
| Reprojection | Look up last frame's sampling vector at `uv - velocity` |
| YCoCg neighborhood clamp | Character stability: if reprojected vector differs too much, it's a disocclusion → use current frame only |
| Halton jitter | Sub-cell sample jitter → temporal shape supersampling |
| History blend (90/10) | Temporal smoothing of sampling vectors before character lookup |

**The key insight:** We render the 3D scene ourselves. We *know* the camera moved exactly X. We *know* the depth at every pixel (we have the depth buffer — or can get it). **We should never estimate motion from ASCII frames when we can derive it from the simulation.** Optical flow (Lucas-Kanade: 166 FPS sparse; Farneback: 5 FPS dense) is for video. We have ground truth.

### 3.3 Analytic motion vectors — implementation sketch

```
# Per frame, on CPU (cheap — we already have these matrices):
deltaViewProj = currentViewProj × inverse(prevViewProj)

# Per cell (in the ASCII shader or JS):
# 1. Get depth at cell center (from readback depth or approximated from luminance in contour mode)
# 2. Reconstruct world position (or just use NDC depth for velocity magnitude)
# 3. velocity = (deltaViewProj × ndcPos).xy - ndcPos.xy
# 4. Store per-cell velocity in a Float32Array (2 floats/cell — tiny)
```

**What this enables:**

1. **Directional motion boost** (not just magnitude): We know *which way* each cell is moving. Edges perpendicular to motion should get more boost than edges parallel to it. A ridgeline you're flying *along* shouldn't flicker; one you're flying *toward* should.

2. **Predictive glyph selection:** If we know a cell's content is moving right at 2 cells/frame, we can bias the character lookup toward the *predicted* position. This is temporal shape coherence — characters don't just react to motion, they *anticipate* it.

3. **Motion-compensated history:** Instead of comparing current sampling vector to last frame's *same cell*, compare to last frame's vector at `uv - velocity`. This gives true temporal stability — static objects in world space produce *zero* delta even when the camera moves. Only genuinely new information (disocclusions, moving objects) triggers character changes. **This kills the "everything shimmers" problem.**

4. **Velocity-weighted detail:** Fast-moving cells (high |velocity|) → lower shape-vector precision needed (motion blur hides detail) → use cached/coarse lookup. Slow cells → full precision. This is automatic LOD.

### 3.4 The Halton jitter trick — temporal supersampling for ASCII

TAA jitters the camera by sub-pixel amounts each frame following a Halton(2,3) sequence. Over 8 frames, every sub-pixel position gets sampled. The history buffer accumulates these into effective supersampling.

**For ASCII:** Jitter the *sampling circle positions* by sub-cell amounts per frame. Over N frames, each cell's shape vector is built from N× more spatial samples. Blend the sampling vectors temporally (not the characters — blend the *vectors*, then do one lookup).

Result: **effective resolution increases with temporal integration**, without increasing the grid size. A static scene gets progressively sharper over ~8 frames. When the camera moves, the history resets (via motion-vector validation) and it starts over.

This is the single most powerful temporal technique for us. It directly addresses "I don't think we're there yet" — we're currently throwing away all temporal information except a crude delta.

### 3.5 Optical flow — when we'd need it (and why we don't yet)

If we ever need motion from *video input* (not our own 3D scene) — e.g., the Syzygy Mirror processing phone camera footage — then optical flow matters:
- **Lucas-Kanade (sparse):** 166 FPS on GTX 1650. Track ~500 keypoints. Good for "where are the interesting motions."
- **Farneback (dense):** 5 FPS. Full per-pixel flow. Too slow for real-time without GPU.
- **GPU LK (f_vf_optical_flow):** Real-time dense-ish via compute shader. The f_ project has a working GLSL implementation with confidence signals and aperture-problem handling.

**But for the flight sim: skip it.** Analytic > estimated, always.

---

## 4. Perceptual Optimization — The Science Behind Casey's Observation

### 4.1 What Casey saw has a name

**The Kinetic Depth Effect (KDE)** — Wallach & O'Connell, 1953, *Journal of Experimental Psychology*.

> "The perception of three-dimensional structure is spontaneously generated from the two-dimensional projection of a moving object... When the kinetic input ceases, the compelling perception of depth typically collapses."

**Key properties relevant to us:**

1. **Sparse stimuli suffice.** The original experiments used wireframe shadows and point-light displays (Johansson, 1973 — a dozen moving dots suffice to perceive a walking human). Our ASCII grid is *denser* than the stimuli that trigger KDE. We're well above threshold.

2. **It's processed in MT, not V1.** Structure-from-motion is computed in the middle temporal visual area (MT), which contains neurons tuned to speed gradients and motion parallax. This is *high-level* visual processing — it means the depth percept is robust and doesn't require fine detail. Coarse ASCII is fine; what matters is the *velocity field*.

3. **Speed gradients = depth.** MT neurons are "maximally sensitive to speed, regardless of spatial and temporal frequency" and "show depth signs independent of other depth cues." Translation: **the brain reads depth directly from how fast things move across the retina.** Faster = nearer. This is exactly our motion-depth channel, and it's neurologically primary — not a hack.

4. **Temporal integration window.** Speed/direction changes are "processed within a temporal window." Our 8-15fps is well within the integration window for KDE (which works down to ~5fps for simple stimuli).

### 4.2 Design rules derived from KDE science

**Rule 1: Preserve the velocity field, not the image.**
The brain doesn't need to see the mountain. It needs to see *how fast the mountain's edges move*. Every rendering decision should be evaluated by: "does this make the velocity field more legible?" A blurry frame with a clean velocity field beats a sharp frame with a noisy one.

**Rule 2: Differential motion is the depth cue — maximize the gradient.**
KDE strength scales with the *difference* in speed between near and far features. Our horizon damping is correct (stable far reference). We should go further: **actively suppress** motion signals from distant features (sky, far horizon) and **amplify** them for near features. The bigger the speed gradient, the stronger the depth.

**Rule 3: Edges carry the signal, surfaces carry noise.**
MT processes motion boundaries. A uniform mountainside moving at constant velocity provides little depth information; the *ridgeline* where velocity changes provides the most. Our edge emphasis is targeting the right thing. Shape-vectors (Section 2) will make edges sharper, which directly strengthens KDE.

**Rule 4: Don't fight the temporal integration.**
If we change characters too aggressively frame-to-frame, we break the temporal continuity that MT needs. The motion-compensated history (Section 3.3.3) isn't just about stability — it's about giving the visual system a coherent velocity signal to integrate.

**Rule 5: The grid is a feature, not a bug.**
The character grid quantizes the velocity field into discrete steps. This *amplifies* small velocity differences into visible character flips — the "stereoscopic shake" Casey described. A continuous renderer (video) smooths these out. **We should lean into quantization**, not try to smooth it away. Consider *intentional* temporal quantization: update characters only when the accumulated motion exceeds a threshold, creating deliberate "pop" events that the visual system reads as depth steps.

### 4.3 The "better than video" claim — why it's true

Video renders the world as it is. ASCII renders the world as the visual system *processes* it — edges, shapes, motion. We're not degrading video; we're **pre-computing the features that MT needs** and discarding the rest.

Specifically:
- **Spatial:** Shape-vectors ≈ V1 edge detection. We're doing the visual cortex's job in the renderer.
- **Temporal:** Motion vectors ≈ MT velocity processing. We're computing the input to the depth-perception system directly.
- **Symbolic:** Characters ≈ the "what" pathway's object tokens. Each character is a classified shape, not a raw luminance sample.

The ASCII frame is closer to a *neural representation* than to a photograph. That's why it can feel more "3D" than video — it's speaking the visual system's native language.

---

## 5. The Ideal Pipeline — From Scratch

If we rebuilt the ASCII renderer today with everything above, here's the architecture:

### 5.1 Overview

```
┌─────────────────────────────────────────────────────────┐
│                    3D SCENE (WebGPU)                       │
│  Render to: color target (192×108) + depth target         │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   COLOR READBACK         │  │   DEPTH READBACK         │
│   192×108 RGBA           │  │   192×108 float          │
└──────────────┬───────────┘  └──────────────┬───────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────────────────────────────────┐
│              ASCII COMPUTE SHADER (WebGPU)                │
│                                                          │
│  Per cell (110×55 grid):                                 │
│  1. Sample 6+10 circles from color → sampling vector    │
│  2. Compute analytic velocity from camera Δ + depth     │
│  3. Reproject: fetch history sampling vector           │
│  4. Validate history (depth + neighborhood check)      │
│  5. Temporal blend (Halton-jittered accumulation)      │
│  6. Apply global + directional crunch                  │
│  7. Apply motion-directional boost                     │
│  8. Output: sampling vector + velocity → buffer        │
└──────────────────────────────┬───────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│           CHARACTER LOOKUP (CPU, cached)                  │
│  Quantized 6D → character via precomputed cache          │
│  6,050 cells × ~0.01ms = <1ms                          │
└──────────────────────────────┬───────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────┐
│              TEXT BUFFER → <pre>                         │
│  One textContent update per frame                        │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Key architectural decisions

**Why compute shader, not fragment shader?**
We need random-access writes to the history buffer and cross-cell reads for the directional crunch. Compute shaders give us shared memory and arbitrary scatter. A single dispatch of 110×55 workgroups (one thread per cell) is trivial for any GPU.

**Why keep character lookup on CPU?**
The quantized cache is a hash map — awkward in shaders, trivial in JS. At <1ms for 6K cells, there's no reason to move it. The expensive parts (sampling, motion, temporal) are on GPU; the cheap part (lookup) stays on CPU.

**Why 192×108 readback?**
It's the sweet spot: large enough for 6 sampling circles per cell at 110 cols (each cell covers ~1.7×2 px — enough for sub-cell shape), small enough that readback doesn't stall the pipeline. The depth target can be even smaller (96×54) since we only need per-cell depth, not per-pixel.

**Why not skip readback entirely?**
The "true" ideal would quantize directly in the 3D render pass — no readback, no 2D intermediate. But this requires forking the terrain shaders, which we don't control (three-tile is a vendored dependency). Readback is the pragmatic interface. If we ever write our own terrain renderer, the ASCII quantization becomes a final post-process pass with direct depth buffer access — zero readback cost.

### 5.3 The foveated ASCII grid — adaptive resolution done right

Current: uniform grid, speed reduces columns globally. Better: **spatially-varying resolution**.

The human visual system has ~1-2° foveal high-acuity region, with acuity falling linearly with eccentricity (Guenter et al.: 1.32–1.65 arc-minutes per degree). For a flight sim:

- **Center 30% of screen** (where the pilot looks — horizon, flight path): full resolution, full shape-vector precision.
- **Periphery**: larger cells (2×2 or 4×4 character blocks rendered as one), reduced to density-ramp only (no shape matching — peripheral vision doesn't resolve shape anyway).
- **Below horizon** (ground rush — high velocity, low attention): medium resolution, motion-boosted.

Implementation: three ASCII grids at different resolutions, composited. Or: variable cell size in the compute shader (peripheral cells sample larger regions).

**Without eye tracking**, center-weighted is the right default (pilots look at the horizon). **With eye tracking** (future), the high-res region follows gaze — true foveated ASCII.

This isn't just performance optimization. It *matches the visual system's architecture*, which means the periphery can be surprisingly coarse without the user noticing — the same principle that makes foveated VR rendering work (5-6× speedup, Guenter et al.).

### 5.4 Braille detail layer (optional)

For users who want maximum fidelity: render the base layer in ASCII (shape-vectors for structure) and overlay a **braille detail layer** at 2× resolution in high-information regions (detected via sampling-vector entropy — cells where the shape match was ambiguous).

This gives 4× spatial resolution where it matters, ASCII readability everywhere else. Toggleable.

---

## 6. Implementation Roadmap

### Phase A: Shape-vectors on CPU (2–3 days)
1. **Offline precompute:** Render alphabet to bitmaps (use a canvas with monospace font), compute 6D shape vectors, normalize, serialize to JSON. (~100 lines, runs once)
2. **Runtime:** Per cell, sample 6 circles (1 sample each to start), global crunch (p=2.0), quantized cache lookup. (~150 lines)
3. **A/B test** against current ramp on contour terrain. Keep both as modes.
4. **Add directional crunch** if staircasing is visible. (10 external circles, ~50 lines)

*Risk: Low. Fallback is the current renderer. Expected gain: dramatically sharper edges, higher effective resolution.*

### Phase B: Analytic motion vectors (2–3 days)
1. **Per-cell velocity:** From camera view-projection delta + per-cell depth (approximate depth from contour mode, or add depth readback). Store as Float32Array.
2. **Motion-compensated history:** Compare sampling vectors at `uv - velocity`, not same-cell. Zero delta for static world.
3. **Directional boost:** Boost edges perpendicular to velocity vector, suppress parallel ones.
4. **Velocity-weighted LOD:** Skip shape-vector lookup for fast cells, use cached density ramp.

*Risk: Medium. Requires depth readback or approximation. Expected gain: temporal stability, stronger KDE, no more "everything shimmers."*

### Phase C: Temporal supersampling via Halton jitter (3–5 days)
1. **Jitter sequence:** Halton(2,3), 8-frame cycle. Offset sampling circle positions by sub-cell jitter.
2. **History buffer:** Store sampling vectors (not characters) across frames. Blend with motion-compensated reprojection.
3. **Disocclusion detection:** Depth discontinuity → reset history for that cell.
4. **Convergence:** Static scenes sharpen over ~8 frames. Measure the improvement.

*Risk: Medium. More complex state management. Expected gain: effective resolution multiplier on static/slow scenes. This is the "wow, it's getting sharper" effect.*

### Phase D: GPU compute shader (1–2 weeks)
Move sampling, motion, temporal, and crunch to a WebGPU compute shader. Keep character lookup on CPU. This unlocks 60fps ASCII and frees the CPU for the sim.

*Risk: High. WebGPU compute in browser is cutting-edge. But the payoff is the "ideal" pipeline from Section 5.*

### Phase E: Foveated grid (1 week)
Variable-resolution grid: center high-detail, periphery coarse. Implement after Phase D (needs the compute shader for variable cell sizes).

*Risk: Medium. Main challenge is seamless compositing of different resolutions.*

---

## 7. What We're NOT Doing (Deliberate Exclusions)

- **Optical flow estimation:** We have ground-truth camera motion. Estimating motion from pixels is strictly worse. Only revisit for video-input mode (Mirror).
- **Neural/ML character selection:** Shape-vectors are interpretable, fast, and good enough. A learned model would be opaque and slower. The "forest of models" future can revisit this.
- **Color ASCII as primary mode:** Luminance-first. Color is a separate channel that complicates shape matching. Add as overlay later if desired.
- **Ray-traced ASCII (à la ASCII City):** We're sampling a rasterized 3D scene, not raycasting. Different architecture, not better for our use case.

---

## 8. References

### Shape-vector rendering
- alexharri, "ASCII characters are not pixels" (2026-01-17): https://github.com/alexharri/website/blob/HEAD/posts/ascii-rendering.md
  - 6D shape vectors, global crunch (normalize→pow→denormalize), directional crunch (10 external circles), k-d tree + quantized cache, GPU sampling pipeline

### Real-time ASCII engines
- ASCILINE (YusufB5) — NumPy-vectorized video→ASCII, 24-30fps: https://github.com/YusufB5/ASCILINE
- artty — Braille algorithm deep-dive: https://github.com/divisionseven/artty/blob/HEAD/docs/algorithm.md
- mostlylucid.consoleimage — Braille rendering doc: https://github.com/scottgal/mostlylucid.consoleimage/blob/HEAD/docs/BRAILLE-RENDERING.md
- TouchDesigner ASCII & CRT Shader (mc2): https://www.patreon.com/emc2_lab/posts/realtime-ascii-169528287
- rgfx — terminal as universal viewport: https://github.com/05vukasin/rgfx/blob/HEAD/README.md

### Temporal rendering (TAA)
- Wikipedia: https://en.wikipedia.org/wiki/Temporal_anti-aliasing
- Halton jitter + motion vectors + YCoCg clamp: standard TAA pipeline (see references in Section 3.2)
- threepipe TemporalAAPlugin: https://github.com/repalash/threepipe/blob/HEAD/website/plugin/TemporalAAPlugin.md

### Vision science (KDE / structure-from-motion)
- Wallach & O'Connell (1953) — original KDE discovery: *Journal of Experimental Psychology*, 45, 205-217
- Johansson (1973) — biological motion from point lights
- Ullman (1979) — *The interpretation of visual motion*, MIT Press (computational theory of SfM)
- Wikipedia: https://en.wikipedia.org/wiki/Kinetic_depth_effect · https://en.wikipedia.org/wiki/Structure_from_motion_(psychophysics)
- MT cortex role in SfM: https://www.mdpi.com/1424-8220/10/4/3218/htm

### Foveated rendering
- Guenter et al., "Foveated 3D Graphics" (Microsoft Research): 5-6× speedup, MAR slope 1.32-1.65 arcmin/degree: http://www.audentia-gestion.fr/MICROSOFT/foveated_final15.pdf

### Prior Syzygy research (local)
- ~/workspace/research_notes/ascii-3d-rendering-tech-20261002-1925/report.md — ASCII City, Glyphion, 3d-ascii-engine, Rangedrifter code-level survey
- ~/workspace/knowledge/ascii-as-vision.md — ASCII as agent perceptual modality
- ~/workspace/research_notes/syzygy-rendering-backend.md — WebGPU readback pipeline

---

## 9. One-Paragraph Summary for Casey

We're rendering ASCII like it's 1998 — one brightness value in, one character out. The state of the art treats characters as *shapes*: you measure what each character looks like (6 numbers describing where its ink sits), measure what each screen cell looks like (same 6 numbers), and pick the closest match. That's alexharri's breakthrough, and it's the single biggest upgrade we can make — edges get razor-sharp, effective resolution jumps without adding a single column. On top of that: stop guessing motion from pixels — we *are* the camera, so we can compute exactly how fast every cell is moving and use that to stabilize the image (only genuinely new things change characters) and to *predict* where shapes are going. And your kinetic-depth observation is a named, studied phenomenon (1953, still cited) — the brain reads depth from speed differences, which means our job isn't to draw pretty frames, it's to draw *truthful velocity*. The full plan is phased A→E above; Phase A (shape-vectors on CPU) is 2–3 days and low-risk. That's where I'd start.
