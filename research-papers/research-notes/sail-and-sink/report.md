# SAIL & SINK — build brief

## The game
A NEW game. Do not touch Scrapcraft. A charming, crafty, toy-like physics sailing
game — think generic Roblox-knockoff aesthetic: smooth rounded characters, big
heads, saturated toy colors, soft light. Explicitly NOT blocky/voxel.

**Core loop:** You captain a tubby little cargo boat on a bright endless sea with
procedurally generated islands (seeded). Autopilot sails by default — the game
plays itself as a demo; the player can grab the helm anytime (WASD/arrows to
steer, and it politely hands control back and forth).

- Pick up crates at island docks, deliver them to the matching island for coins.
- Crates sit ON your deck with real sliding physics — turn hard or hit a big
  wave and they slide; slide one off the edge and it's lost overboard with a splash.
- Hazards: whirlpools (pull and spin you), rocks (punch a hole → take on water →
  ride low → sink), passing squalls.
- Sink and you get a sad-trombone moment, a quip, and respawn at the home dock
  keeping half your coins. Kid-friendly, never punishing.
- Quirky cast: a crab harbormaster, seagull traders, floating rubber ducks,
  treasure chests on beaches. Short silly quests ("Deliver 2 crates to Gull Rock",
  "Ride a whirlpool without sinking", "Lose no cargo 3 trips running").

**Physics emphasis (this is the soul of it):** a wave field from summed sines;
buoyancy sampled at hull points so boats bob, roll and pitch; deck cargo as
little 2D sliding bodies with friction on the tilted deck plane; whirlpool force
fields; flood level when holed. Everything procedural — no image, model or audio
assets; synthesize what you need.

## The presentation: side-by-side
One page, two viewports on the same live game:
- LEFT: normal Three.js render.
- RIGHT: the Projectionist — a live text-frame render of the same scene.
- `render.py` (copied into this folder) is the reference implementation. Port its
  two engines to JavaScript faithfully: **glyph** (luminance through the
  character-density ramp) and **sculpt** (Sobel-style gradients → `─ │ ╱ ╲`
  strokes by angle, weight by magnitude). Keep the header protocol:
  `# frame N t=... cols=.. rows=.. engine=..`.
- Tap the pixels by rendering the scene to a small offscreen target (or 2D-canvas
  readback) — never disturb the main canvas. Engine toggle (glyph/sculpt), and
  either viewport can go fullscreen.

## Automatic and intuitive scaling (rule-based for now)
A motion meter (mean absolute frame difference) drives the text renderer:
- Rough seas / lots of change → LOWER text resolution, HIGHER frame rate
  (e.g. 48 cols @ 15fps) so motion stays readable.
- Calm water → HIGHER resolution, lower fps (e.g. 96 cols @ 6fps) for detail.
- Smooth the transitions; show a small live readout explaining each change in
  plain words ("rough seas → 48 cols @ 15fps"). Manual override controls too.
This is the deliberately simple, legible version of the adaptive renderer.

## Groundwork for the supervised learning loop (do not build the ML, prepare for it)
- Keep a ring-buffer log, one entry per second: timestamp, engine, cols, fps,
  contrast, gamma, motion metric, a heuristic quality score, and scene stats
  (wave height, boat speed, cargo count, camera movement).
- The quality score is a DOCUMENTED heuristic (edge density in a target band +
  contrast utilization + temporal stability) and must be labeled in UI and code
  as a placeholder reward for future supervised learning — never presented as
  intelligence.
- A "Download training log (JSONL)" button exports it. Code and comments should
  be organized so Casey's other agents can later train a policy network
  (scene stats → render settings) on bigger GPU machines.

## Voyage Reel (greatest hits)
Auto-capture highlight moments as text-frame clips: successful deliveries,
sinkings, whirlpool rides, near misses with rocks, ducks collected. A "Reel" tab
plays them back as animations — this is future landing-page footage, so make
clips self-contained and charming.

## UI / panels
Start screen (title, "Set Sail" / "Watch it play itself"), HUD (coins, cargo,
hull integrity, current quest card, helm hint), and tabs or a drawer with:
Render (engine toggle, auto-tune on/off, manual dials), Reel, Data (live log
view + download), About/Future (what this is + the documented future plan:
GPU-trained adaptive rendering policy, supervised on human preference plus the
heuristic reward — written for the agents who will scale it later).

## Technical
Single-page site, Three.js via CDN, no build step, no binary assets. Cap pixel
ratio for performance. Comment the code for handoff. Tone of all in-game text:
warm, witty, kid-friendly, no wasted words.
