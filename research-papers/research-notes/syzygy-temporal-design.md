# Syzygy Phase C: Temporal Supersampling via Halton Jitter

**Author:** Temporal Specialist
**Date:** 2026-10-02
**Status:** Design + prototype validated. Ready for implementation.
**Depends on:** Phase A (ShapeMatcher — implemented)
**Upgrades with:** Phase B (analytic motion vectors — not yet implemented)

---

## 1. The Idea in One Paragraph

We're throwing away time. Each frame, we sample 6 circles per cell, pick a character, and discard everything. But the *next* frame samples the same cell from a slightly different position — and we throw that away too. Halton jitter says: offset the sampling positions by sub-cell amounts each frame (following a Halton(2,3) sequence), store the 6D sampling vectors in a history buffer, blend them temporally, and do *one* character lookup on the accumulated vector. Over 8 frames, each cell sees 8× more spatial samples. Static scenes get progressively sharper. It's not anti-aliasing — it's supersampling. Time becomes resolution.

---

## 2. Halton(2,3) Sequence

### 2.1 Math

The Halton sequence generates low-discrepancy 2D points — they fill space more evenly than random, with no clumping:

```javascript
function halton(index, base) {
  let f = 1, r = 0, i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r; // in [0, 1)
}

// Per frame (8-frame cycle, skip index 0):
function jitterForFrame(frame) {
  const idx = (frame % 8) + 1;
  return {
    x: halton(idx, 2) - 0.5,  // centered to [-0.5, +0.5)
    y: halton(idx, 3) - 0.5,
  };
}
```

### 2.2 Validated sequence (from prototype)

| Frame | jx | jy |
|-------|------|------|
| 0 | +0.0000 | -0.1667 |
| 1 | -0.2500 | +0.1667 |
| 2 | +0.2500 | -0.3889 |
| 3 | -0.3750 | -0.0556 |
| 4 | +0.1250 | +0.2778 |
| 5 | -0.1250 | -0.2778 |
| 6 | +0.3750 | +0.0556 |
| 7 | -0.4375 | +0.3889 |

Min pairwise distance: 0.167 (well-distributed, no repeats).

### 2.3 Scaling

Jitter is in **cell units**. Multiply by 0.5 to get ±0.25 cell max offset:
- A cell covers ~1.75×2.0 source pixels (192/110, 108/55)
- ±0.25 cell = ±0.44 source pixels — matches TAA's ±0.5px convention
- Apply as offset to circle centers in `ShapeMatcher.sampleCell()`

---

## 3. Architecture

### 3.1 Data flow (per frame)

```
┌─────────────────────────────────────────────────┐
│ 1. RENDER: WebGPU → 192×108 readback            │
│    (unchanged from Phase A)                      │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 2. SAMPLE (with jitter):                         │
│    jx, jy = jitterForFrame(frameCount)          │
│    for each cell (x,y):                          │
│      vec = shapeMatcher.sampleCell(              │
│        proc, srcW, srcH, x, y, cols, rows,       │
│        jx * 0.5, jy * 0.5   // ← NEW: jitter    │
│      )                                           │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 3. VALIDATE (disocclusion detection):            │
│    dist = ||vec - history[x,y]||                │
│    if dist > threshold:                          │
│      history[x,y] = vec  // RESET                │
│      alpha = 1.0         // use current only     │
│    else:                                         │
│      alpha = adaptive     // see §5               │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 4. BLEND (temporal accumulation):                │
│    history[x,y] = history[x,y] * (1-alpha)       │
│                   + vec * alpha                  │
│    blended = history[x,y]                        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 5. LOOKUP (unchanged from Phase A):              │
│    ch = shapeMatcher.match(blended)              │
│    // match() applies crunch internally          │
└─────────────────────────────────────────────────┘
```

### 3.2 History buffer

```javascript
// In AsciiRenderer constructor:
this._temporalHistory = null;  // Float32Array(cols * rows * 6)
this._temporalCols = 0;
this._temporalRows = 0;
this._temporalFrame = 0;

// Per frame, in _renderAsciiShape:
// (Re)allocate if grid size changed:
if (!this._temporalHistory || this._temporalCols !== cols || this._temporalRows !== rows) {
  this._temporalHistory = new Float32Array(cols * rows * 6);
  this._temporalCols = cols;
  this._temporalRows = rows;
  this._temporalFrame = 0;  // reset cycle on resize
}
```

**Memory:** 110×55×6 floats = 36,300 floats ≈ 145KB. Negligible.

**What we store:** Raw (uncrunched) 6D sampling vectors. Crunch is applied in `match()` after blending — this is critical because crunch is nonlinear (pow 2.0), and blending must happen in linear space.

### 3.3 Modified `sampleCell` signature

```javascript
// ShapeMatcher.js — add optional jitter params:
sampleCell(lum, srcCols, srcRows, cx, cy, cols, rows, jx = 0, jy = 0) {
  // ...
  for (let s = 0; s < 6; s++) {
    const circle = CIRCLES[s];
    // Apply jitter to circle center (in cell units, scaled by caller):
    const ccx = x0 + (circle.x + jx) * cellSrcW;
    const ccy = y0 + (circle.y + jy) * cellSrcH;
    // ... rest unchanged
  }
}
```

---

## 4. Disocclusion Detection

### 4.1 The problem

When the camera moves, a cell that showed "sky" last frame might show "mountain" this frame. Blending them produces garbage — a muddy vector that matches no character well. We must detect this and reset.

### 4.2 Method: vector distance validation

Compare the current frame's sampling vector against the history buffer:

```javascript
function vectorDistance(a, b) {  // a, b: 6D vectors (as offsets into history)
  let d = 0;
  for (let s = 0; s < 6; s++) {
    const diff = a[s] - b[s];
    d += diff * diff;
  }
  return Math.sqrt(d);  // 0..~2.45 (max for 6D unit vectors)
}
```

**Threshold:** 0.35 (validated in prototype — normal jitter variation produces dist ~0.03-0.06, true disocclusions produce dist >1.0).

```javascript
const DISOCCLUSION_THRESHOLD = 0.35;

for each cell:
  vec = sampleCell(...)  // current frame, jittered
  hist = history[cell]   // previous blended vector
  
  dist = vectorDistance(vec, hist)
  if (dist > DISOCCLUSION_THRESHOLD) {
    // Disocclusion: reset history, use current frame only
    history[cell] = vec
    blended = vec
  } else {
    // Valid history: blend
    blended = history[cell] * (1 - alpha) + vec * alpha
    history[cell] = blended
  }
```

### 4.3 Why this works without depth

TAA uses depth discontinuity + YCoCg color bounds. We don't have per-cell depth yet (that's Phase B). But vector distance is actually *more direct* for our purpose: we care whether the *shape* changed, not whether the depth changed. A lighting shift that preserves shape won't trigger reset (good). A shape change from any cause will (correct).

### 4.4 Upgrade path (Phase B)

When Phase B provides per-cell depth + velocity:
1. **Motion-compensated lookup:** Sample history at `(x - vx, y - vy)` instead of `(x, y)`. Static world → zero effective motion → history stays valid during camera moves.
2. **Depth validation:** If `|depth_current - depth_history| > threshold`, force disocclusion regardless of vector distance. Catches cases where shape is coincidentally similar but depth changed (e.g., two different mountains with similar profiles).

The vector-distance check remains as a fallback — it's cheap and catches what depth misses.

---

## 5. Adaptive Blend Factor

### 5.1 Not a constant

TAA uses 90/10 (alpha=0.1) as a baseline, but adapts based on confidence. We should too:

```javascript
// Base blend factor
const BASE_ALPHA = 0.12;  // ~88% history, 12% current

// Adapt based on:
// 1. Frame count since reset (ramp up history weight as confidence grows)
// 2. Motion magnitude (if we have it from Phase B, or estimate from vector delta)

function computeAlpha(cell, frameSinceReset, motionMag) {
  // Early frames: trust current more (history hasn't converged yet)
  const warmup = Math.min(1.0, frameSinceReset / 8);
  let alpha = BASE_ALPHA + (1 - BASE_ALPHA) * (1 - warmup) * 0.5;
  
  // High motion: trust current more (history is stale)
  if (motionMag > 0.1) {
    alpha = Math.min(0.5, alpha + motionMag * 2);
  }
  
  return Math.max(0.05, Math.min(1.0, alpha));
}
```

### 5.2 Simplified version (ship first)

For initial implementation, use a fixed alpha with warmup:

```javascript
// Frame 0 (just reset): alpha = 1.0 (use current only)
// Frames 1-8: alpha ramps 0.5 → 0.12 (increasing trust in history)
// Frame 8+: alpha = 0.12 (steady state, TAA-style)

const framesSinceReset = this._temporalAge[cell]; // Uint8Array per cell
const alpha = framesSinceReset === 0 ? 1.0
  : framesSinceReset < 8 ? 0.5 - (framesSinceReset / 8) * 0.38
  : 0.12;
```

This gives fast initial response and strong accumulation once converged. The per-cell age counter (`Uint8Array`, 1 byte/cell = 6KB) tracks how many frames since last reset.

---

## 6. Convergence Behavior

### 6.1 Static scene

Camera still, scene still. Each frame samples the same shapes from slightly different sub-pixel positions.

| Frame | What's happening | User sees |
|-------|-----------------|-----------|
| 0 | First sample, no history | Baseline quality (Phase A) |
| 1-3 | Accumulating 2-4 jittered samples | Slightly sharper edges |
| 4-7 | 5-8 samples, approaching convergence | Noticeably more detail |
| 8+ | Full 8-sample cycle, steady state | **"Wow, it's getting sharper"** |

**Measured (prototype):** RMSE vs ground truth drops 0.033 → 0.015 over 8 frames. That's ~2× reduction in sampling error.

**At 10fps:** Full convergence in 0.8 seconds. The user parks the camera, and within a second the image visibly sharpens.

### 6.2 Moving scene

Camera moving (flight). Each frame, many cells disocclude (dist > 0.35), resetting their history.

| Motion | Disocclusion rate | Effective behavior |
|--------|------------------|-------------------|
| Hovering | <5% cells/frame | Near-full accumulation, very sharp |
| Slow flight | 10-30% cells/frame | Partial accumulation, moderate sharpening |
| Fast flight | 50%+ cells/frame | Mostly current-frame, minimal accumulation |

**This is correct.** Fast motion doesn't benefit from temporal supersampling (the world is changing too fast). The system gracefully degrades to Phase A quality. No smearing, no ghosting — just less sharpening.

### 6.3 The "wow" moment

When the user stops moving (levels out, hovers, or pauses to look), the image *visibly converges* over ~1 second. Edges get crisper. Fine detail emerges. It's the temporal equivalent of a camera focusing — but it's not focus, it's *accumulation*. The user sees the renderer "thinking harder" about the scene.

This is the single most compelling demo of Phase C: fly fast (blurry, Phase A quality), then stop (sharpens over 1 second to supersampled quality).

---

## 7. Performance Analysis

### 7.1 Per-frame cost (110×55 = 6,050 cells)

| Operation | Cost per cell | Total |
|-----------|--------------|-------|
| Sample 6 circles (9 pts each) | 54 luminance lookups | 326,700 lookups |
| Vector distance (disocclusion) | 6 mults + 6 adds + sqrt | 6,050 sqrts |
| Blend (6D EMA) | 12 mults/adds | 72,600 ops |
| Character lookup (cached) | ~1 hash lookup | 6,050 lookups |

**Total:** ~400K operations/frame. At 10fps = 4M ops/sec. Trivial for modern JS engines (V8 does ~100M+ simple ops/sec).

**Memory:** History (145KB) + age counters (6KB) = ~151KB. Negligible.

### 7.2 Bottleneck

The sampling (326K luminance lookups) dominates. This is unchanged from Phase A — jitter just offsets the sample positions, doesn't add samples. Phase C adds ~80K ops (distance + blend) on top of Phase A's ~330K. **~25% overhead for 8× effective samples.** Excellent tradeoff.

---

## 8. Implementation Checklist

### 8.1 ShapeMatcher.js changes
- [ ] Add `jx=0, jy=0` params to `sampleCell()`
- [ ] Apply jitter to circle centers: `ccx = x0 + (circle.x + jx) * cellSrcW`
- [ ] No other changes (crunch, match, cache all unchanged)

### 8.2 AsciiRenderer.js changes
- [ ] Add history buffer allocation in constructor: `_temporalHistory`, `_temporalAge`, `_temporalFrame`
- [ ] Add `jitterForFrame()` helper (or import from new TemporalAccumulator module)
- [ ] In `_renderAsciiShape()`: get jitter for current frame, pass to `sampleCell()`
- [ ] After sampling, do disocclusion check + blend before `match()`
- [ ] Increment `_temporalFrame` per rendered frame
- [ ] Handle grid resize (reallocate history, reset frame counter)
- [ ] Add params: `temporal: true/false` (toggle), `temporalAlpha: 0.12`, `disocclusionThreshold: 0.35`

### 8.3 New file: TemporalAccumulator.js (recommended)
Encapsulate the history/blend/disocclusion logic in a dedicated class:
```javascript
export class TemporalAccumulator {
  constructor(cols, rows) { /* allocate history, age */ }
  resize(cols, rows) { /* reallocate */ }
  accumulate(x, y, vec, frame) { /* disocclusion check + blend, returns blended vec */ }
  reset() { /* clear all history */ }
}
```
This keeps AsciiRenderer clean and makes the temporal logic testable.

### 8.4 Testing
- [ ] Unit: Halton sequence produces 8 distinct well-spread points
- [ ] Unit: Blend converges (RMSE decreases over frames for static input)
- [ ] Unit: Disocclusion fires on large vector change, doesn't fire on small jitter variation
- [ ] Integration: Toggle `temporal: false` → identical to Phase A output
- [ ] Visual: Static scene sharpens over ~1 second; moving scene doesn't smear

---

## 9. What This Isn't

- **Not motion blur.** We're not averaging images to smooth motion. We're accumulating *samples* to increase spatial detail. Fast motion gets *less* accumulation (via disocclusion), not more blur.
- **Not frame interpolation.** We're not generating in-between frames. Every frame is a real sample; we're just combining multiple real samples intelligently.
- **Not denoising.** While the EMA does smooth noise, the primary goal is *supersampling* — more spatial information, not less temporal noise.
- **Not TAA.** We borrow the jitter and history concepts, but we don't do reprojection (that's Phase B), we don't do YCoCg clamping (we do vector-distance validation), and our output is characters, not pixels. It's "TAA-inspired" not "TAA-ported."

---

## 10. Open Questions for Phase B Integration

1. **Velocity-scaled jitter:** Should fast-moving cells use *larger* jitter (to cover more ground) or *smaller* jitter (since history will be discarded anyway)? Probably smaller — save the samples for cells that will actually accumulate.
2. **Predictive sampling:** If we know a cell is moving right at 0.5 cells/frame, should we bias the jitter pattern in the direction of motion? This would give more samples along the motion vector.
3. **Depth-weighted accumulation:** Should near cells (high parallax, more disocclusions) use lower alpha than far cells (stable, fewer disocclusions)? Probably yes — far terrain benefits most from accumulation.

These are Phase B problems. Phase C should ship with the standalone design above, then upgrade when motion vectors land.

---

## Appendix: Prototype Code

Standalone Node.js prototype validating Halton sequence, convergence, and disocclusion detection. Run with `node /tmp/halton-proto.js`.

Key results:
- Halton(2,3) 8-frame: min pairwise distance 0.167 (good spread, no clumping)
- Convergence: RMSE 0.033 → 0.015 over 8 frames (2× error reduction)
- Disocclusion: correctly fires on vector distance 1.697 (threshold 0.35), correctly ignores jitter variation (dist ~0.04)
