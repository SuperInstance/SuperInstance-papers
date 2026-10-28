# 3D ASCII Rendering Technology — Research Report

**Researched:** 2026-10-02. Method: code-level reads of three GitHub repos (via GitHub blob pages, live browser), official site + press for the game, one technical deep-dive article. Facts below are from direct code reads unless marked [index] (search-result text) or [inference].

---

## Summary

Three distinct engineering families cover the mission's targets:

| Project | URL | Approach | Depth handling | Char selection |
|---|---|---|---|---|
| ASCII City (theprogramone/3d_ascii_city) | https://github.com/theprogramone/3d_ascii_city | 2.5D DDA raycaster, vanilla JS + Canvas, single HTML file | Per-column distance → wall height `∝ 1/dist`; fog `pow(1−d/26,1.6)`; 1D z-buffer (240 cols) | Density ramps `░▒▓█` / reversed for windows; procedural window grids; 24-bit color × shade factor |
| Glyphion (andrewmd5/glyphion) | https://github.com/andrewmd5/glyphion | .NET 8/9 terminal engine: NDC triangle rasterizer → char+z+color buffers → one ANSI write | Per-cell float z-buffer; perspective divide done game-side; barycentric-interpolated Z | 20-step gradient `" .:'-~=<\*({[%08O#@Q&"` indexed by brightness; PPM texels: `texelBrightness × light` → char + 24-bit color |
| ascii-3d-engine (amirabbas-gh/ascii-3d-engine) | https://github.com/amirabbas-gh/ascii-3d-engine | Rust, single `main.rs`: full MVP matrix pipeline, barycentric rasterizer, 60 FPS | Per-cell z-buffer (NDC z, init ∞); back-face culling; aspect-corrected perspective | 10-step `' '.' : - = + * # % @'`, flat per-face Lambertian `AMBIENT + diffuse·(1−AMBIENT)` |
| Rangedrifter (game, Max Schmidt) | https://www.rangedrifter.com/ | Custom C + OpenGL engine; "3D ASCII/Sprite" roguelike | Real perspective: glyphs as 3D quads, size ∝ 1/depth [inference] | Glyph atlas quads + sprites; 2D overlay UI at fixed sizes |

---

## 1. "ASCII City" 3D effects

**The repo:** `theprogramone/3d_ascii_city` — "A full 3D city rendered entirely in text characters — no game engine, no external libraries, no images. Just raycasting math in a single HTML file." Two HTML files exist (`ascii-city-3d.html`, 1871 lines; `ascii-city-3d charactors.html`); the README's `index.html` doesn't exist. (Code read 2026-10-02: https://github.com/TheProgramOne/3D_Ascii_CIty/blob/main/ascii-city-3d.html)

**How it works:**
- **World:** 34×30 tile grid; tiles have kind (road/sidewalk/lot/building/landmark/water/sand/wall), height in floors, district, variant/style/seed. Seeded procedural placement: downtown 35–75-floor skyscrapers, mid-rise 15–35, suburbs 2–8; landmarks (Eiffel h=100, Liberty 45, Big Ben 55, Empire 120).
- **Raycaster:** 240 columns (`NUM_COLS=240`, `VIEW_ROWS=92`, 8×12 px cells → 1920×1104 canvas), FOV 74°, classic DDA (`castColumn(i)`) with `MAX_STEPS=32`, perpendicular distance + fisheye correction (`correctedDist = perpDist·cos(rayAngle − cameraAngle)`), clamped ≥ 0.35.
- **Perspective:** `lineHeight = min(92·1.8, (9.2 · height)/dist)`; ground line `groundLevel = HORIZON + floor((92·0.25)/max(0.5,dist))`; horizon shifts with pitch. So depth is purely geometric — nearer walls are taller columns of glyphs.
- **Depth buffer:** 1D per-column `zbuffer[240] = correctedDist` (+ `colInfo` with drawStart/drawEnd/side/wallX/tile). Cheap and sufficient since there are no sprites.
- **3D→character mapping** (`drawWall`): two density ramps — `WALL_SHADE = ['░','▒','▓','█']` (light→dense) and reversed `WINDOW_SHADE = ['█','▓','▒','░']` (lit windows are dense). Per-cell window-vs-wall decision from a procedural facade system: 4 styles `{cols 11–18, floors 4–6, mullions 3–6, density 0.26–0.38}`, texture coordinate `facadeU` from wall-hit position + building span, `windowCols = style.cols + (span−1)·8`, `windowRows = max(10, floor(height·1.15))`.
- **Lighting model per glyph:** `totalShade = distFactor × sideFactor × verticalLight`, where `distFactor = pow(max(0, 1 − dist/26), 1.6)` (atmospheric fog), `sideFactor = 1.0` or `0.52` (directional: N–S faces darker), `verticalLight = 0.45 + (1−vFrac)·0.55` (vertical ambient occlusion, darker at street level). `shade(rgb, factor)` multiplies one of 5 district palettes (wall/win/roof/edge/sign) → colored glyphs via `ctx.fillText`, with `shadowBlur` glow for signs/torch/spires.
- **Extras:** hash-based starfield (`hash2` thresholds), landmark-specific glyph art (Eiffel `│`/`+`/`=` lattice, Liberty `*` torch + `#@%` head, Big Ben `O` clock), water/splash particles, DDA-based 3D positional audio occlusion.
- **Not verified:** exact `totalShade → ramp-index` formula and the main loop tail (page text ended mid-`drawWall`); differences in the `charactors` variant file.

**Related viral project [index]:** "Grow Now! Games" walkable ASCII city (YouTube, Aug 2026, >1M views) — separate codebase, JS+Canvas custom engine, grid world with buildings/roads/trees/cars/pedestrians, ray-per-column with distance → perspective/depth/size. Coverage: https://www.neowin.net/news/developer-builds-a-fully-walkable-3d-city-entirely-out-of-ascii-characters/ and https://www.techspot.com/news/113574-fully-walkable-3d-city-built-entirely-out-ascii.html. No public source found.

## 2. Glyphion

**The repo:** `andrewmd5/glyphion` — "an experimental 2D/3D game engine for the terminal", C#/.NET 9, MIT, hobby project (51 stars, Sep 2024). Ships `TerminalCraft` ("TermincalCraft" dir), a Minecraft clone (voxel chunks, day/night, player). (Code read 2026-10-02.)

**Engineering approach:**
- **Output stage** (`Glyphion/Core/Renderer/TerminalRenderer.cs`, 431 lines): double-buffered char buffers + **per-cell float z-buffer** (`_zFrontBuffer`/`_zBackBuffer`) + ANSI color buffers. `SetPixel(Vector3, char, fgRGB, bgRGB?)`: Y-inverted, z-test `position.Z > zbuf → reject` (nearer wins). Each cell stored as char + trailing space (`_screenCharWidth = 2·w+1`, an aspect-compensation trick). `Render()` emits **one** `StringBuilder` starting with `\x1B[H` (cursor home, no clear) with 24-bit `\x1B[38;2;…m` colors, single `Console.Write` — terminal I/O is the bottleneck being optimized.
- **3D rasterizer** (`Glyphion/Core/GlyphionEngine.cs`, 754 lines): `DrawTriangle` takes NDC (−1..1) verts, viewport-maps with aspect correction (`x = X·(halfW/aspect) + halfW`), bounding-box + barycentric fill, interpolates Z → `MathUtils.ZFormula`. `DrawTriangleUV` adds **screen-space back-face culling** (edge-normal dot < 0 → reject) and **perspective-correct UVs** (1/Z-weighted interpolation), sampling PPM-loaded `AsciiTexture`s. `DrawQuad` = 2 triangles. 2D primitives (Bresenham lines, arcs, FIGlet text) share the same `SetPixel`/z-buffer path with Z=−1.
- **Character mapping** (`Glyphion/Core/Textures/AsciiTexture.cs`): `GetAsciiGradient(b)`: 20-step `" .:'-~=<\*({[%08O#@Q&"`, `index = (int)(20·b)`. Untextured triangles: brightness → char + warm tint `(255,200,50)·b`. Textured: `GetCoord` returns `GetAsciiGradient(texelBrightness × lightBrightness)` + texel RGB — i.e., luminance picks the glyph, color comes from the texture.
- **Game-side 3D** (`TermincalCraft/CraftGame.cs`): projection done manually — translate by −camera, rotate by camera matrices, perspective divide, reject Z<0 (see `Sun()`); chunks rendered via `_chunkManager.Render(player, brightness, sun)` with render distance 5. **Multi-threading = chunk-generation + physics background threads**, not parallel rasterization. Day/night: sun vector rotated by `Matrix4x4.CreateRotationX/Y`; `globalBrightness = (sun.Y+50)/100 + 0.1`; even the **sky background char** = `GetAsciiGradient(globalBrightness·0.8)`.
- **Depth is conveyed** by z-buffer occlusion + brightness-gradient glyphs + 24-bit color. No perspective glyph scaling — uniform terminal grid.
- **Not verified:** `MathUtils.ZFormula` exact formula and `ChunkManager` meshing/culling details; README's "LOD techniques" not observed in code read.

## 3. 3d-ascii-engine

**The repo:** `amirabbas-gh/ascii-3d-engine` — Rust student project, **one file** `src/main.rs` (360 lines), `cargo run`, targets 60 FPS, rotating shaded cube. (Full source read 2026-10-02: https://github.com/amirabbas-gh/ascii-3d-engine/blob/main/src/main.rs)

**How it works:**
- **Pipeline:** hand-rolled `Vec4`/`Mat4` (zero deps). Per frame: `model = T·Rz·Ry·Rx·S` (time-driven rotations 0.9/1.3/0.7 rad/s, scale 1.2, translate z=−5); `mvp = perspective·model` with `perspective(60° fov, aspect=(120/44)·0.5, 0.1, 100)` — the `×0.5` (`CHAR_ASPECT`) is the **character-aspect correction** (cells ~2× taller than wide). Perspective divide with w ≤ 1e-4 rejection; viewport `sx=(ndc_x+1)/2·119`, `sy=(1−(ndc_y+1)/2)·43`; `depth = ndc_z`.
- **Rasterization:** 6 quad faces → 2 triangles each; `fill_triangle` = edge-function barycentric over clamped bbox, pixel-center sampling, degenerate reject; depth linearly interpolated from NDC z (not perspective-correct — fine for flat faces).
- **Depth buffer:** full per-cell `zbuf: vec![f32::INFINITY; 120·44]`; `put_pixel` writes only if `z < zbuf[idx]` (NDC z, smaller = nearer).
- **Culling/lighting:** back-face culling via `dot(normal_world, camera_to_face) >= 0 → skip` (camera at origin); **Lambertian** `diffuse = max(0, normal·light_dir)`, `light_dir=(0.5,0.8,−0.6)`; `intensity = 0.22 + diffuse·0.78` (ambient floor 0.22).
- **Character selection:** `shade_char`: `SHADES[round(clamp(intensity,0,1)·9)]`, `SHADES = [' ','.',':','-','=','+','*','#','%','@']` — flat **per-face** shading (whole face one char).
- **Output:** one `String` per frame: `\x1B[H\x1B[36m` + rows + `\x1B[0m`, single `print!` + flush; init `\x1B[2J\x1B[?25l`; fixed timestep `sleep(16.6ms)`.
- **Depth/perspective → char:** perspective projection gives geometric foreshortening; z-buffer gives occlusion; the char itself encodes only the face's Lambertian brightness. No fog, no color, no per-pixel variation.
- (A different older repo, `boxofyellow/Ascii3dEngine` (C#, 2020), also renders 3D as console ASCII but doesn't match the name; not investigated.)

## 4. Rangedrifter

**The game:** solo-dev (Maximilian Schmidt) turn-based roguelike, Steam Early Access (May 2026), Windows + Linux native, https://www.rangedrifter.com/ (read live 2026-10-02). Described as "3D ASCII/Sprite roguelike" (Metacritic) with a "custom 3D engine" (official site, GamingOnLinux 2026-09-03).

**Verified engine facts** (official update log + daily devlog): engine written in **C** (`npc.c` etc.); **OpenGL** renderer ("OpenGL initialization on windows is improved"); real 3D camera ("The camera is now slightly higher up"); ASCII **mixed with sprites** ("Some sprites are improved"); terrain-adaptive coloring, contrast control; built-in world editor; dev via Twitch streams + weekly videos.

**Mixed-size ASCII — how it works [inference, medium-high confidence]:** No public source or technical writeup exists (dev explains on streams, not transcribed). From the verified facts + trailer footage: unlike fixed-grid terminal renderers, Rangedrifter renders each ASCII symbol as a **textured quad (glyph from a font atlas) placed in 3D world space** under a real perspective projection — the same model as Brut@l ("everything constructed of keyboard symbols" in a 3D world). Each quad scales ~1/depth, so near glyphs are large and distant ones small: many apparent font sizes coexist in one frame. Per-quad color/scale animation gives the blinking hero, weather particles, and screen shake essentially for free. The UI (sidebar "Nearby" list, codex, status text) is a separate 2D overlay at fixed sizes — a second source of size variety.

**Tradeoffs vs uniform-size ASCII:**
- *Mixed-size wins:* perspective size gradient is a strong depth cue; continuous zoom/tilt camera; per-glyph rotation/scale/animation; GPU lighting; ASCII + sprites + particles in one scene; resolution independent of grid.
- *Mixed-size costs:* distant glyphs shrink below legibility (needs LOD/fade); glyph atlas needs mipmaps/filtering or shimmer; in-world text isn't grid-aligned (harder to scan); one quad per visible cell = overdraw; UI needs a separate overlay pass.
- *Uniform-size wins:* every glyph always legible; classic roguelike readability; trivial text UI; cheapest output (single buffer write, e.g. `\x1B[H` + buffer).
- *Uniform-size costs:* depth must be faked with brightness/color/z-buffer; no size-based depth cue; cell-stepped camera; no glyph rotation/scaling; resolution capped by terminal size.

## 5. General techniques (real-time 3D→ASCII for games)

- **Character↔brightness mapping, as actually implemented:**
  1. *Density-ramp lookup* (dominant): sort glyphs by ink coverage, `index = f(brightness)` — ascii-3d-engine (10 steps, per-face Lambertian), Glyphion (20 steps, per-texel `texelLum × light`), ASCII City (`░▒▓█` walls / reversed for windows + 24-bit color).
  2. *Luminance mapping:* `(R·0.2126 + G·0.7152 + B·0.0722)/255` → ramp (alexharri, https://github.com/alexharri/website/blob/HEAD/posts/ascii-rendering.md). Notes nearest-neighbor sampling → jaggies; supersampling → AA but blurry.
  3. *Shape-vector matching* (alexharri, advanced): precompute per-glyph coverage inside sub-cell sampling circles → N-D shape vector; per cell, sample the source the same way → nearest-neighbor glyph search. Glyphs follow contours → much higher *effective* resolution than density ramps. Plus `global_crunch`/`directional_crunch` contrast (cel-shading-like edge separation).
  4. *Semantic glyphs* (ASCII City): glyph chosen by meaning (windows/lattice/torch/clock/spire) from procedural facade grids; brightness modulates color only.
- **Depth/perspective through character choice:** raycasters (ASCII City) — geometry does the work (`wallHeight ∝ 1/dist`), chars carry brightness; rasterizers (Glyphion, ascii-3d-engine) — perspective divide + z-buffer + brightness→char; 3D-quad engines (Rangedrifter) — glyph *size* ∝ 1/depth directly.
- **Depth buffer role:** all three codebases use explicit z-buffers rather than painter's algorithm — full per-cell float buffers (ascii-3d-engine: NDC z from ∞; Glyphion: shared by 2D/3D via `SetPixel`), or 1D per-column distances (ASCII City, enough for sprite-less raycasting).
- **Performance:** terminal I/O dominates → one buffer, cursor-home rewrite, single flush per frame (all terminal projects); tiny cell resolutions (120×44 … 240×92) allow generous per-cell math; raycast cost ∝ columns × DDA steps; rasterizer cost ∝ bbox fill + z-test; Glyphion threads chunk-gen/physics, not rasterization; mixed-size quad rendering shifts cost to GPU vertex/overdraw + needs glyph-atlas mipmapping. **Aspect correction is mandatory** everywhere (cells ~2:1): `×0.5` fudge factors in ascii-3d-engine and Glyphion, 8×12 px cells in ASCII City.

## Could not verify
- ASCII City: exact `totalShade → ramp-index` formula and frame-loop tail (blob text cut off mid-`drawWall`); contents of `ascii-city-3d charactors.html`.
- Glyphion: `MathUtils.ZFormula` exact formula; `ChunkManager` meshing/culling; README "LOD" claim not seen in code.
- Rangedrifter: internals of the C/OpenGL engine (no public source or writeup); the glyph-as-3D-quad mechanism is inference from verified engine facts + footage.
- Grow Now! Games' viral ASCII city: no public source found — described from press only.

## Sources
- Code (verified live 2026-10-02): https://github.com/TheProgramOne/3D_Ascii_CIty/blob/main/ascii-city-3d.html · https://github.com/andrewmd5/glyphion (TerminalRenderer.cs, GlyphionEngine.cs, Textures/AsciiTexture.cs, TermincalCraft/CraftGame.cs) · https://github.com/amirabbas-gh/ascii-3d-engine/blob/main/src/main.rs
- READMEs: https://github.com/theprogramone/3d_ascii_city/blob/HEAD/README.md · https://github.com/andrewmd5/glyphion · https://github.com/amirabbas-gh/ascii-3d-engine/blob/HEAD/README.md
- Rangedrifter: https://www.rangedrifter.com/ (official, live) · https://www.gamingonlinux.com/2026/09/ascii-based-traditional-roguelike-rangedrifter-has-such-a-damn-cool-style/ · https://www.metacritic.com/game/rangedrifter/
- Press (ASCII city viral): https://www.neowin.net/news/developer-builds-a-fully-walkable-3d-city-entirely-out-of-ascii-characters/ · https://www.techspot.com/news/113574-fully-walkable-3d-city-built-entirely-out-ascii.html
- Technique deep-dive: https://github.com/alexharri/website/blob/HEAD/posts/ascii-rendering.md ("ASCII characters are not pixels", 2026-01-17)
- Notes: notes/source-01-ascii-city.md, notes/source-02-glyphion.md, notes/source-03-ascii-3d-engine.md, notes/source-04-rangedrifter.md, notes/source-05-general-techniques.md
