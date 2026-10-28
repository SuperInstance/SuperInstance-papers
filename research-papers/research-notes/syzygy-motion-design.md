# Syzygy Motion Design — Phase B: Analytic Motion Vectors

**Author:** Motion Specialist (subagent)
**Date:** 2026-10-02
**Status:** Design + prototype. Not yet integrated.

---

## 0. The Geometric Law

Casey's principle: *"You move away from data and trying to work around parameters to figure out the geometric laws that are simpler."*

The geometric law of motion in a rendered scene:

> **For a static world, the screen-space velocity of every visible point is fully determined by (a) the camera's rigid-body motion between frames and (b) the point's depth. Nothing else.**

This is exact. It is not estimated, inferred, or learned. We *are* the camera — we set its position and orientation every frame. We know precisely how it moved. Any technique that estimates motion from pixels (frame differencing, optical flow) is strictly worse than deriving it from the camera transform, because estimation introduces error where ground truth is available for free.

Current state (`AsciiRenderer._renderAscii`): frame-to-frame luminance differencing.
- `delta[i] = |lum[i] - prevLum[i]|` — magnitude only, no direction
- Confuses lighting changes with motion
- No sub-cell precision
- One frame of memory

Phase B replaces this with analytic per-cell velocity vectors.

---

## 1. Per-Cell Velocity: The Math

### 1.1 Inputs (per frame, computed once on CPU)

- `currViewProj`: current frame's view-projection matrix (4×4). Three.js: `camera.projectionMatrix * camera.matrixWorldInverse`.
- `prevViewProj`: previous frame's view-projection matrix. Stored from last frame.
- Per-cell depth (see §2 for sources).

### 1.2 Per-cell computation

For ASCII cell `(cx, cy)` in a `cols × rows` grid:

```
1. Convert to NDC:
   nx = (cx + 0.5) / cols * 2 - 1
   ny = 1 - (cy + 0.5) / rows * 2    // flip Y: NDC +Y is up

2. Get depth d at cell center (meters, or normalized 0..1 from depth buffer).
   Convert to NDC z:
   // Three.js uses reversed-Z? No — standard: NDC z in [-1, 1], but the
   // depth buffer stores [0, 1]. If we have view-space depth (positive
   // distance), unproject via inverse projection:
   ndcZ = projectionMatrix transforms viewZ → NDC. Instead of going through
   the depth buffer, work directly from view-space depth:

3. Reconstruct view-space position:
   // Given NDC (nx, ny) and view-space depth vz (negative forward in three.js):
   //   viewX = nx * vz * tanHalfFovX / -1  ... easier via inverse projection:
   clipPos = (nx, ny, ndcZ_from_depth, 1)
   viewPos = inverse(currProj) * clipPos;  viewPos /= viewPos.w
   worldPos = camera.matrixWorld * viewPos   // or inverse(currView)

4. Project into previous frame:
   prevClip = prevViewProj * worldPos;  prevClip /= prevClip.w
   // prevClip.xy is previous-frame NDC

5. Velocity in NDC:
   velNDC = (nx, ny) - prevClip.xy

6. Convert to cells/frame:
   velX = velNDC.x * cols / 2
   velY = -velNDC.y * rows / 2    // flip Y back to grid coordinates
```

**Cost:** One 4×4 inverse per frame (for `inverse(currViewProj)` — actually we need `inverse(currProj)` and `prevViewProj`; both cheap). Per cell: ~2 matrix-vector multiplies + perspective divides ≈ 40 flops. For 6,050 cells: ~240K flops/frame. Trivial on CPU (<1ms in JS).

**Simplification:** We don't actually need the full world-position round trip. Since both matrices are known:

```
deltaViewProj = currViewProj * inverse(prevViewProj)
// For a world point W: currNDC = deltaViewProj * prevNDC.
// We want the reverse: given currNDC + depth, find prevNDC.
//   worldPos = inverse(currViewProj) * currClip
//   prevClip = prevViewProj * worldPos
```

The world-position intermediate is unavoidable without the depth buffer in a convenient form, but it's only one inverse per frame. Fine.

**Even simpler (used in prototype):** If we track the camera's *relative motion* (delta position `dt` and delta quaternion `dq` in world space, which the flight sim already computes for the aircraft), we can compute per-cell velocity without full matrix inversion:

```
// Camera moved by (R_rel, t_rel) in world space from prev to curr.
// A world point P appears at view-space positions:
//   currView: V = currViewMatrix * P
//   prevView: V_prev = prevViewMatrix * P
// In current view space, the previous camera was at:
//   V_prev = R_rel_view * V + t_rel_view
// where (R_rel_view, t_rel_view) = currViewMatrix * inverse(prevViewMatrix)
//         restricted to rotation+translation.
//
// Then: prevNDC = proj * V_prev, currNDC = proj * V.
// velocity = currNDC.xy - prevNDC.xy.
```

This avoids the world-position reconstruction — we go view-space → view-space directly. Requires per-cell view-space position (from NDC + depth via inverse projection, one inverse per frame). Cleaner and fewer operations.

### 1.3 Sky cells (infinite depth)

Cells showing sky have no meaningful depth. For these, velocity is **rotation-only**:
- Take the cell's view-space *direction* (not position).
- Rotate by `R_rel_view` to get previous direction.
- Project both; velocity = difference.
- Translation contributes zero at infinite depth (correct — parallax vanishes at infinity).

Detection: if the ray for a cell points above the horizon and doesn't hit terrain (or depth > far plane), mark as sky. In practice: cells where the analytic terrain-depth computation returns no hit → sky.

### 1.4 What we store

```js
// Per frame, computed once:
this._prevViewProj = Float32Array(16);  // previous frame
this._currViewProj = Float32Array(16);  // current frame

// Per cell (Float32Arrays of length cols*rows):
this._velX = new Float32Array(N);   // velocity x in cells/frame
this._velY = new Float32Array(N);   // velocity y in cells/frame
this._depth = new Float32Array(N);  // view-space depth in meters (Infinity for sky)
```

Memory: 4 arrays × 6,050 × 4 bytes ≈ 97KB. Negligible.

---

## 2. Depth Sources

We need per-cell depth. Options, best first:

### Option A: Depth readback (most accurate, costs a second readback)

Render depth to a second `WebGLRenderTarget` (or use `DepthTexture`), read back alongside color. The renderer already stalls on `readRenderTargetPixelsAsync` — a second readback roughly doubles the stall.

- Accuracy: exact per-pixel depth.
- Cost: ~2× readback stall. At 192×108, the readback is already the bottleneck (10fps cap).
- Verdict: **upgrade path, not Phase B.** Do this when we move to GPU compute (Phase D), where depth is free.

### Option B: Analytic terrain depth (exact for terrain, free)

For each cell, cast a ray from the camera through the cell's NDC position, intersect with the terrain heightfield. The three-tile manager has elevation data via `getGroundElevation(x, z)`.

- Accuracy: exact where terrain is the visible surface (which is ~90% of a flight sim view).
- Cost: per-cell raymarch against heightfield. With a coarse heightfield texture on CPU, ~10-20 steps per cell × 6,050 cells = ~100K heightfield lookups. Feasible but not trivial (~2-5ms in JS).
- Problem: doesn't handle the aircraft model, clouds, or structures. Only terrain.
- Verdict: **good, but complexity is high for Phase B.** Consider for Phase B+.

### Option C: Ray-pitch depth proxy (recommended for Phase B)

**The geometric insight:** In a flight sim, the camera looks at terrain below. For a cell at screen position `(cx, cy)`, the ray's depression angle below the horizon is determined by camera pitch + vertical FOV. Depth ≈ `altitudeAGL / sin(depressionAngle)`.

```
1. Compute horizon row: hy = horizonY in grid coords (we already detect this).
2. For cell at row cy:
   angleBelowHorizon = (cy - hy) / rows * verticalFov
   // Positive = looking down at terrain.
3. If angleBelowHorizon > 0:
     rayDepression = cameraPitch + angleBelowHorizon  // total angle below horizontal
     depth = agl / sin(rayDepression)                 // right triangle: altitude vs slant range
     // Clamp: depth = min(depth, farPlane)
   Else:
     depth = Infinity  // sky cell
```

- Accuracy: exact for flat terrain, approximate for mountains (overestimates depth for peaks, underestimates for valleys). Error is smooth and bounded.
- Cost: ~5 flops per cell. Essentially free.
- Why it's still "analytic": it's derived from camera geometry (position, pitch, FOV), not estimated from pixels. The approximation is in the *terrain model* (flat earth), not in the *motion computation*.
- Improvement: add terrain elevation variance. If we know `groundElevation` under the camera and a rough `maxTerrainVariance` for the area, we can bound the error. Even better: sample `getGroundElevation` at 4-9 coarse points across the view and fit a plane — still cheap, much better than flat.
- Verdict: **Phase B choice.** Free, analytic, good enough. Upgrade to B or A later.

### Option D: Previous-frame depth buffer via three.js

Three.js WebGPU renderer internals might expose the depth texture. Fragile, version-dependent, not recommended.

### Decision

**Phase B uses Option C** (ray-pitch proxy with coarse terrain-plane fit). The prototype (§7) implements the flat-terrain version; the integration notes (§6) describe the plane-fit upgrade.

---

## 3. Motion-Compensated History

### 3.1 The problem with same-cell comparison

Current code: `delta[i] = |lum[i] - prevLum[i]|`. When the camera moves, *every* cell changes, even for a perfectly static world. The entire image "shimmers." This is wrong — a static mountain shouldn't flicker just because we flew past it.

### 3.2 Reprojection

For current cell `(x, y)` with velocity `(vx, vy)` in cells/frame:

```
historyX = x - vx
historyY = y - vy
// Bilinear sample the history buffer at (historyX, historyY):
histVec = bilerp(historyVectors, historyX, historyY)
histDepth = bilerp(historyDepth, historyX, historyY)
```

If the world is static and our velocity is correct, `histVec` should equal the current cell's sampling vector. The *motion-compensated delta* is:

```
mcDelta = |currVec - histVec|  // in 6D shape-vector space, or luminance
```

For a static world with correct velocity: `mcDelta ≈ 0`. Only genuinely new information (disocclusions, moving objects, lighting changes) produces nonzero delta. **This kills the shimmer.**

### 3.3 History validation (disocclusion detection)

Reprojection is wrong when the current cell shows something that wasn't visible last frame (disocclusion — e.g., terrain newly revealed behind a ridgeline). Detect and reset:

```
1. Depth discontinuity:
   if |currDepth - histDepth| > depthThreshold * currDepth:
     → disocclusion. Discard history, use current frame only.
     depthThreshold ≈ 0.1 (10% depth change = likely different surface)

2. Out-of-bounds:
   if (historyX, historyY) outside [0, cols)×[0, rows):
     → no history available. Use current frame only.

3. Vector divergence (the "character stability" check):
   // In shape-vector space (6D), or luminance for simplicity:
   if |currVec - histVec| > stabilityThreshold:
     → something changed beyond motion. Could be disocclusion, moving object,
        or lighting change. Reduce history weight (don't fully discard —
        blend toward current).
   stabilityThreshold: in 6D unit space, ~0.3 (tunable).
```

### 3.4 History buffer contents

We store **sampling vectors**, not characters. Rationale (from R&D §3.2): blend the vectors, then do one character lookup. Blending characters is meaningless (what's the average of `@` and `.`?).

```js
// Per cell:
histVec   = Float32Array(N * 6);  // 6D shape-vector from last frame
histDepth = Float32Array(N);       // depth from last frame
histAge   = Uint8Array(N);         // frames since last reset (for temporal weighting)

// Per frame update:
for each cell:
  (hx, hy) = reproject(x, y, velX, velY)
  if valid(hx, hy) and not disoccluded:
    // Blend: 90% history, 10% current (TAA-style)
    // Weight shifts toward current if vector diverged (soft validation)
    w = clamp(1 - mcDelta / stabilityThreshold, 0.1, 0.9)
    blendedVec = histVec * (1-w) + currVec * w
    histAge++
  else:
    blendedVec = currVec
    histAge = 0
  // Character lookup uses blendedVec
  char = shapeMatcher.match(blendedVec)
  // Store for next frame:
  histVec = blendedVec; histDepth = currDepth
```

Memory: `(6 + 1) * 6050 * 4 + 6050 ≈ 175KB`. Fine.

### 3.5 What this gives us

1. **Temporal stability:** Static world → zero character flicker, even with camera motion. The image "locks on."
2. **True motion signal:** Only disocclusions and real changes trigger updates. The motion-depth channel becomes clean.
3. **KDE Rule 4 compliance:** "Don't fight the temporal integration." Coherent history gives MT a stable velocity signal.

---

## 4. Directional Boost

### 4.1 The principle

From R&D §3.3: *"Edges perpendicular to motion should get more boost than edges parallel to it. A ridgeline you're flying along shouldn't flicker; one you're flying toward should."*

This is the **aperture problem** from vision science: an edge moving parallel to its own orientation produces no visible motion (the edge looks identical). Only the component of motion perpendicular to the edge is visible. Our boost should match what the visual system actually sees.

### 4.2 Computing edge orientation from shape vectors

We have 6D shape vectors sampled on a 2×3 grid:
```
Circles:  (0.30, 0.22) (0.70, 0.22)   ← top row
          (0.30, 0.50) (0.70, 0.50)   ← mid row
          (0.30, 0.78) (0.70, 0.78)   ← bot row
```

Edge orientation from the sampling vector `v[6]`:
```
// Horizontal gradient (left vs right columns):
gx = (v[1] + v[3] + v[5]) / 3 - (v[0] + v[2] + v[4]) / 3
// Vertical gradient (top vs bottom rows):
gy = (v[4] + v[5]) / 2 - (v[0] + v[1]) / 2
// Edge normal direction:
normalAngle = atan2(gy, gx)
// Edge orientation (perpendicular to normal):
edgeAngle = normalAngle + PI/2
```

This is free — we already have the 6D vector. No Sobel needed.

### 4.3 Boost factor

```
// Velocity direction:
velAngle = atan2(velY, velX)
velMag = hypot(velX, velY)

// Angle between edge normal and velocity direction:
dAngle = abs(normalAngle - velAngle)
// Boost is max when velocity is along the edge normal (perpendicular to edge):
alignment = abs(cos(dAngle))  // 1 = perpendicular to edge, 0 = parallel

// Directional boost:
boost = 1 + directionalGain * alignment * min(velMag / velRef, 1)
// directionalGain ≈ 0.8, velRef ≈ 2.0 cells/frame (tunable)
```

Applied to: the crunch power for this cell (higher crunch = sharper character selection), or as a multiplier on the motion signal. I recommend modulating the **character stability threshold** — perpendicular-moving edges get a lower threshold (more responsive), parallel-moving edges get a higher threshold (more stable).

### 4.4 What this gives us

1. **Cleaner image:** Edges you're flying along stop shimmering.
2. **Stronger depth:** Edges you're approaching pop more. The velocity field becomes more legible (KDE Rule 1).
3. **No extra sampling cost:** Edge orientation comes from the existing 6D vector.

---

## 5. Velocity-Weighted LOD

Fast-moving cells don't need full shape-vector precision — motion blur (temporal integration in the eye) hides detail. Slow cells deserve full precision.

```
// Per cell:
speed = hypot(velX, velY)  // cells/frame
if (speed > lodThreshold):   // lodThreshold ≈ 3.0 cells/frame
  // Fast: use cached character from last frame, or density ramp
  // (skip the 6D sampling + lookup entirely)
  char = fastPath(cell)
else:
  // Slow: full shape-vector pipeline
  char = shapeMatcher.match(blendedVec)
```

This is automatic performance scaling: when flying fast (when the most cells are moving), we do less work per cell. When hovering (few cells moving), we spend the budget on quality.

**Estimated savings:** At cruise speed, ~60-70% of cells exceed 3 cells/frame → ~60% reduction in shape-matching cost. This pays for the velocity computation many times over.

---

## 6. Integration Plan

### 6.1 Where it plugs in

`AsciiRenderer` gains a `MotionEngine` (new file: `js/ascii/MotionEngine.js`):

```js
// In AsciiRenderer constructor:
this.motion = new MotionEngine();

// Per frame, in _maybeSample (before _renderAscii):
// 1. Update camera matrices:
this.motion.updateCamera(camera);  // stores prev/curr view-proj

// 2. Compute per-cell velocity + depth (needs cols, rows, telemetry):
this.motion.computeField(cols, rows, {
  agl: this.telemetry.altitudeAgl,
  pitch: cameraPitch,      // from camera quaternion
  fov: camera.fov,
  horizonY: detectedHorizon,
});

// 3. In _renderAsciiShape (or _renderAscii):
//    - Reproject history, validate, blend → blendedVec per cell
//    - Compute directional boost from vel + edge orientation
//    - Character lookup with boosted parameters
//    - Store history for next frame
```

### 6.2 API surface

```js
class MotionEngine {
  constructor();
  updateCamera(camera);                    // call once per frame
  computeField(cols, rows, opts);          // compute vel + depth per cell
  reproject(x, y);                         // → (hx, hy) history coords
  validateHistory(x, y, currVec, currDepth); // → {valid, weight}
  directionalBoost(x, y, edgeNormalAngle); // → boost factor
  shouldUseFastPath(x, y);                 // → bool (velocity LOD)
  getVelocity(x, y);                       // → [vx, vy] for debugging/viz
}
```

### 6.3 Upgrade path (matches R&D roadmap)

- **Phase B (this design):** Option C depth, CPU velocity, motion-compensated history, directional boost, velocity LOD.
- **Phase B+:** Option B depth (terrain raycast) for mountain accuracy.
- **Phase C:** Halton jitter on sampling circles + temporal vector accumulation (builds on the history buffer designed here).
- **Phase D:** Move `computeField` to GPU compute shader. The math doesn't change — only where it runs.

---

## 7. Prototype

Standalone Node.js prototype demonstrating the core math. No DOM, no three.js — pure linear algebra.

**File:** `~/workspace/research_notes/syzygy-motion-proto.js`

Implements:
1. Minimal mat4 library (multiply, inverse, perspective, lookAt, transform point)
2. `computeCellVelocity()` — the §1.2 algorithm
3. `depthFromRayPitch()` — the §2 Option C depth proxy
4. `reproject()` — the §3.2 history lookup
5. `directionalBoost()` — the §4.3 edge/velocity alignment
6. Test scenario: camera flying forward at 80 m/s, 500m AGL, looking slightly down
   - Prints velocity field for a 12×6 grid (visualize as arrows)
   - Verifies: horizon cells ≈ 0 velocity, ground cells below show increasing velocity toward bottom
   - Verifies: reprojected history matches for static world (mcDelta ≈ 0)

Run: `node ~/workspace/research_notes/syzygy-motion-proto.js`

---

## 8. Open Questions

1. **Depth for the aircraft model:** The aircraft is rendered in the scene but isn't terrain. Its depth won't match the terrain proxy. Options: (a) exclude aircraft pixels via stencil/mask, (b) accept the error (aircraft is small, usually centered), (c) render aircraft to separate layer. Recommendation: (b) for Phase B — the aircraft occupies <5% of cells and is near the center where velocity is low anyway.

2. **Cloud layer:** Clouds are at variable depth. The terrain proxy will be wrong for cloud cells. Mitigation: clouds are soft/low-contrast — shape matching is already uncertain there. Accept for Phase B.

3. **Roll:** The camera rolls with the aircraft. The velocity computation handles this correctly (it's in the view-projection matrices), but the horizon detection and Option C depth assume a level camera. For rolled views, transform the horizon detection into camera space. Minor — note for implementation.

4. **First frame:** No history on frame 1. Initialize history buffer to "invalid" (age = 0, weight = 1.0 for current). Standard.

5. **Grid resize:** If cols/rows change (speed-adaptive), invalidate history (dimensions don't match). Already handled in current code for `_prevLum`.

---

## 9. Summary for Casey

We're replacing "how much did this pixel change?" with "how fast is this point moving, and in which direction?" — computed from the camera's actual motion, not guessed from the image.

Three things this gives us that frame-differencing can't:
1. **Stillness where there should be stillness.** A static mountain stops shimmering when you fly past it, because we know exactly where each point was last frame. Only genuinely new things change.
2. **Direction matters.** An edge you're flying along gets left alone; an edge you're flying toward gets emphasized. The boost matches what your visual system actually sees (aperture problem).
3. **Free performance.** Fast-moving cells skip the expensive shape lookup — motion hides the detail anyway. The faster you fly, the cheaper each frame gets.

The math is simple — it's just the camera matrices we already have, plus a depth estimate from "how high are we and where's the horizon." No machine learning, no optical flow, no parameters to tune. The camera motion *is* the geometric law. Derive, don't estimate.
