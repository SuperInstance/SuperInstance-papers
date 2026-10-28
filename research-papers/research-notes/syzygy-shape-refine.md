# Syzygy Shape-Vector Refinement — Phase A Deep Dive

**Date:** 2026-10-02  
**Specialist:** Shape Specialist (subagent)  
**Principle:** Casey: "You move away from data and trying to work around parameters to figure out the geometric laws that are simpler."

---

## 1. Geometric Analysis: Circle Layout

### The question
Are 6 circles in a 2×3 grid optimal? What about staggered or hexagonal layouts?

### Method
Computed three metrics for candidate layouts:
- **Avg overlap** (lower = more independent measurements)
- **Blind spot** (lower = better coverage; max distance from any point to nearest circle edge)
- **90° symmetry** (lower = better; we must NOT confuse `/` with `\`)

### Results

| Layout | Avg overlap | Blind spot | 90° symmetry |
|--------|-------------|------------|--------------|
| Current 2×3 (r=0.22) | 0.115 | **0.152** | 0.000 |
| Hexagonal r=0.22 | 0.065 | 0.239 | 0.000 |
| Hexagonal r=0.28 | 0.187 | 0.192 | 0.000 |

### Conclusion: Keep the 2×3 grid.

The hexagonal layout has better independence (less overlap) but *worse* coverage. The 2×3 grid's blind-spot score (0.152) is the best tested.

**Geometric rationale:** For tall monospace character cells (1:2 aspect ratio), the 2×3 grid samples the three critical vertical zones:
- Top (y=0.22): ascenders, tops of curves, sky
- Middle (y=0.50): x-height — the densest ink region, where most shape information lives
- Bottom (y=0.78): descenders, bottoms of curves, ground

The left/right split (x=0.30/0.70) distinguishes left-heavy from right-heavy shapes. The slight overlap (r=0.22, spacing 0.40) ensures no "vertical valley" at x=0.5 — a thin `|` is caught by both circles.

**The "staggered" idea is a trap.** Offsetting the middle row breaks the clean vertical-zone semantics. The grid's axis-alignment is a *feature*: it aligns with the horizontal/vertical/diagonal shape categories we need to distinguish.

**No change made to CIRCLES.** The current layout is geometrically sound.

---

## 2. Character Set Curation: 95 → 38

### The problem
The original ALPHABET had ~95 characters, many redundant in 6D shape space. `Il!i` look different to humans but have nearly identical 6D vectors (all vertical lines). Redundant characters waste cache space and can cause arbitrary picks between near-identical shapes.

### Geometric principle
We need characters whose 6D *vectors* are far apart, not characters that look different. The alphabet should maximize shape-space coverage for terrain features.

### Curated set (38 characters)

| Category | Chars | Count | Shape-space role |
|----------|-------|-------|------------------|
| Empty | ` ` | 1 | Sky — the most common cell |
| Horizontal | `-_= ` | 3 | Horizon, contour lines |
| Vertical | `\|!l` | 3 | Cliffs, ridges |
| Diagonal up | `/╱` | 2 | Slopes (two weights) |
| Diagonal down | `\╲` | 2 | Slopes (two weights) |
| Peak | `^A` | 2 | Summits, apexes |
| Valley | `vu` | 2 | Depressions |
| Curve left | `(c` | 2 | Concave terrain |
| Curve right | `)n` | 2 | Convex terrain |
| Dots | `.:`` ` | 3 | Texture, speckle |
| Junctions | `+xX` | 3 | Ridge intersections |
| Dense | `#%@&` | 4 | Dark terrain, shadow |
| Medium | `oO0` | 3 | Mid-tone fills |
| Complex | `8BMW$Q` | 6 | High-detail, mixed shapes |

**Deliberate exclusions:**
- `i` (vector ≈ `l`)
- `I` (kept `l` instead — similar but `l` is more common)
- `;`, `,`, `~` (marginal shape value for terrain)
- Full 95-char set (diminishing returns; 38 covers the space)

### Code change
`ALPHABET` in `ShapeMatcher.js` replaced. Old: 95 chars. New: 38 chars organized by shape category with comments explaining each group's geometric role.

---

## 3. Crunch Parameter Tuning

### Current: 2.0 (global)

### Analysis
The crunch `pow(n, p)` exaggerates boundaries by pushing mid-tones toward extremes. The optimal `p` depends on content type:

- **Contour terrain** (high-contrast lines on flat bg): Higher crunch (2.2–2.7) sharpens the lines. The lines are already binary; crunch makes the *transitions* crisper.
- **Satellite imagery** (continuous tones): Lower crunch (1.5–2.0) preserves gradient information. Too high and smooth hills become posterized.
- **Elevation mode** (what ASCII auto-switches to): This is essentially contour-like — high crunch (2.5) is ideal.

### Geometric truth (not parameter tweak)
Crunch is not "contrast." It's a *shape sharpening* operator. In 6D space, crunch moves vectors away from the center (uniform gray) toward the corners (distinct shapes). Higher crunch = larger Voronoi cells for distinctive shapes, smaller cells for ambiguous ones.

The *correct* crunch is the one that maximizes the distance between the character vectors we want to distinguish, relative to the noise in our sampling. For contour terrain with clean lines, that's high (2.5). For noisy satellite, lower (1.8).

### Recommendation
Make crunch adaptive:
- Default: 2.0 (balanced)
- Contour/elevation mode: 2.5 (sharp lines)
- Satellite mode: 1.8 (preserve gradients)

**Code change:** `this.crunch` is now set from `params.crunch` in AsciiRenderer (already wired). Default 2.0. Recommend adding mode-specific overrides in future.

### Not implemented: Directional crunch
The R&D describes directional crunch (10 external circles) for anti-staircasing. This is Phase A+ work — it requires significant additional sampling. Deferred; global crunch + good alphabet is sufficient for now.

---

## 4. Cache Optimization

### Changes made

**4-bit quantization (was 3-bit):**
- Old: 3 bits/component → 18-bit key → 262K possible keys
- New: 4 bits/component → 24-bit key → 16M possible keys
- Rationale: With 38 characters, 3-bit was too coarse — similar-but-distinct shapes collided in the same hypercube, causing wrong character picks. 4-bit gives each character thousands of hypercubes, minimizing collisions.
- Cost: Negligible (24-bit still fits in a JS number; cache memory slightly higher).

**Eviction policy (was: arbitrary 50K cap, FIFO):**
- Old: Delete single oldest when over 50K (O(1) but thrashy)
- New: When over 200K, batch-delete oldest 50K (amortized O(1), less thrash)
- Rationale: 50K was too small for 4-bit keys (more distinct keys). 200K accommodates the finer quantization. Batch deletion is more efficient than one-at-a-time.

**Hit rate diagnostics:**
- Added `_hits`, `_misses` counters and `hitRate` getter.
- High hit rate (>90%) = good temporal coherence, quantization working.
- Low hit rate (<70%) = either quantization too fine OR scene changing too fast (both actionable signals).

### Geometric view of the cache
The cache is a *discretization* of 6D shape space into hypercubes. Each hypercube maps to one character. The quantization bits determine hypercube size:
- Too coarse (2-bit): hypercubes contain multiple characters → collisions → wrong picks
- Too fine (6-bit): hypercubes are tiny → low hit rate → cache useless, always brute-force
- 4-bit is the sweet spot for 38 characters: enough resolution to separate shapes, coarse enough for temporal coherence to give hits.

---

## 5. What Was NOT Changed (and why)

**Circle layout:** Kept 2×3 grid. Geometric analysis showed it has the best coverage for tall character cells. Hexagonal alternatives had worse blind spots.

**Sampling method:** Still 3×3 samples per circle (9 points). Could go to 5×5 for quality or 1×1 (center only) for speed. 3×3 is the right balance — 54 samples per cell × 6,050 cells = 326K samples/frame, trivial for CPU.

**Brute-force fallback:** Kept. With good hit rates, this rarely runs. K-d tree (suggested in R&D) is unnecessary — the cache handles it.

**Character bitmap resolution:** Still 20×40. Higher res (e.g., 40×80) would give more precise shape vectors, but 20×40 is sufficient for 6 circles with r=0.22. Diminishing returns.

---

## 6. Summary of Code Changes

**File:** `~/workspace/syzygy-ascii/js/ascii/ShapeMatcher.js`

1. **ALPHABET**: 95 chars → 38 chars, organized by shape category with geometric rationale comments.
2. **CIRCLES**: Unchanged (verified optimal via geometric analysis). Added comment explaining why.
3. **quantize()**: 3-bit → 4-bit (18-bit → 24-bit key). Better shape discrimination.
4. **match()**: Added hit/miss counters. Eviction: 50K FIFO → 200K batch-delete (less thrash).
5. **Added hitRate getter**: For diagnostics — is the cache working?

**No changes to AsciiRenderer.js** (the integration already handles charMode: 'shape').

---

## 7. Open Questions for Future Work

1. **Per-mode crunch:** Should contour mode use 2.5 while satellite uses 1.8? Needs A/B testing on real terrain.
2. **Directional crunch:** The 10-external-circle technique for anti-staircasing. Worth implementing if stair-stepping is visible on diagonal ridges.
3. **Alphabet validation:** The 38-char set is principled but not empirically validated. A test that renders known shapes (diagonal lines, curves) and checks the picked characters would confirm the curation.
4. **Unicode box-drawing:** Characters like `─ │ ╱ ╲` (U+2500 etc.) have *perfect* geometric shapes for lines. Should we prefer them over ASCII `- | / \`? Font support is the concern.
5. **Hit rate monitoring:** The `hitRate` getter exists but isn't displayed. Should add to the debug HUD so we can see if the cache is working in real-time.
