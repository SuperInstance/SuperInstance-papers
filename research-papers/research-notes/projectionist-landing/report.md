# Research: The Projectionist — landing page

## What this is
"The Projectionist" is an expert patch in the **Patchwork Experts** project
(https://github.com/SuperInstance/Patchwork-experts) — an open-source collection
of portable, versioned expert personas. The Projectionist turns video and still
images into chatbot-readable text frames. Its stance: **"I project; I don't
interpret."**

## Embedded demo data
`frames.json` in this folder holds REAL output from the Projectionist's own
payload script (`render.py`), rendered from a 4-second synthetic test video
(320x180, 10fps source) at these settings:

- `--cols 72 --fps 4`, 16 frames per engine
- `glyph` engine: luminance mapped through a character-density ramp
- `sculpt` engine: gradient/Sobel-style edge rendering with `─ │ ╱ ╲` strokes

Structure: `{"glyph": [{"header": "# frame 1 t=0.00s cols=72 rows=21 engine=glyph",
"rows": ["...72 chars...", ...]}, ...], "sculpt": [...]}`.
Each frame: 21 rows of exactly 72 monospace characters. The header line is the
actual feed protocol the expert emits on stdout. Embed this data in the page and
animate it as a looping text-frame player (4 fps to match the render).

## Page brief
A cinematic landing page for The Projectionist:

1. **Hero** — dark projection-booth aesthetic: near-black background, warm
   phosphor-amber monospace type. A live player animating the embedded frames,
   with an engine toggle (glyph / sculpt) and play/pause. Title: "The
   Projectionist". Tagline: "I project; I don't interpret."
2. **What it is** — a short paragraph: an expert that converts video and still
   images into text frames a chatbot can actually see, streamed to stdout as
   header-delimited frames.
3. **The pipeline** — six steps: open → sample → size → develop → print → feed.
4. **Two engines** — glyph (luminance through a density ramp) vs sculpt (edge
   strokes from image gradients). Let the toggle in the hero demonstrate this.
5. **The dials** — the tunables: cols, fps, contrast, gamma, black/white point,
   edge threshold, custom ramp, cell aspect, ANSI colour.
6. **The feed protocol** — show a real header line from frames.json, e.g.
   `# frame 1 t=0.00s cols=72 rows=21 engine=glyph`, and explain each field.
7. **Patch it in** — a code block showing how to fetch the expert from the repo
   and seed a fresh agent with `patch.md` + `meta.yaml` + `render.py`; the
   command `python3 render.py INPUT --cols 80 --engine sculpt --fps 2`.
8. **Provenance** — part of Patchwork Experts, open source, link to
   https://github.com/SuperInstance/Patchwork-experts. Payload: one readable
   Python script; needs Python 3, numpy, ffmpeg.

Tone: fun but serious, a little techno-punk, no wasted words. No stock photos,
no lorem ipsum. The animated text frames ARE the visual centerpiece.
