# Eden Live / Eden Golem — identification and fleet fit

*Research note, 2026-10-27. Sources are the publisher's own pages (Tripo AI / VAST-AI-Research) — project page, GitHub README, realtime README, Hugging Face model card and file tree — not roundups. Fleet figures are the measured ones carried in the brief (Thor NVMe 97% full, 28 GB free; LAN ~71 Mb/s Thor↔Orin over two Wi-Fi hops; ~137 Mb/s down at the Thor).*

## Identification — high confidence

Casey's names are near-exact, not transcription errors:

- **EdenLive** — by **VAST-AI-Research** (the research arm behind Tripo AI), released and open-sourced **20 October 2026** as part of **Project Eden**, Tripo's world-model programme (Project Eden itself launched 31 May 2026). Code: `github.com/VAST-AI-Research/EdenLive`. Weights: `huggingface.co/VAST-AI/EdenLive`.
- **EdenGolem v0.1** — a companion component released in the same drop: an agent *skill* for coding agents, bundled in the same repository. The official spelling has no space: **EdenGolem**.

No plausible namesake competes: the pair ship together, from the same repo, in the same announcement, and Casey's description ("huge download", "specs… with our network doing the heavy lifting") matches this pair's shape specifically.

## What each one is

### EdenLive — a generative renderer, not a game engine

Project Eden's doctrine is *state first, rendering follows*: world state and visual rendering are separate layers. EdenLive implements layers two and three (state-to-visual interface + generative renderer) and deliberately does **not** own layer one. An upstream program — a game, a simulation engine, a coding agent — maintains the world state and produces a **reference (proxy) video**: a graybox render, a normal-map animation, 2D footage, or a recording. EdenLive takes that reference stream plus a **target first frame** and a **text prompt**, and generates detailed, photorealistic or stylised video that follows the reference's layout, camera motion and dynamics, in real time.

- Models: **5B** (from Wan2.2-TI2V-5B; 720p) and **14B** (from Wan2.1-I2V-14B; 480p), each in bidirectional (offline) and few-step chunk-autoregressive (real-time, 4 steps per chunk) variants. Control is injected by a fine-tuned DINOv3 vision encoder that embeds each proxy frame.
- Modes: real-time streaming (WebRTC) and offline re-rendering/restyling.
- The publisher's own honesty notes: the model currently decides for itself which character each graybox block represents; adherence to the reference is fixed, not user-adjustable; visual detail can drift when a character reappears after a long absence. A community field report (RTX 5090, LightX2V path) found backgrounds solid but moving objects distorting badly — one report, not a verdict, but it matches the publisher's stated limitations.

### EdenGolem v0.1 — a game-building skill for coding agents

A skill that turns a gameplay description into a standalone 3D graybox game in four gated stages: (1) define gameplay, parameters, win/loss conditions, theme; (2) build scene, characters, interactive objects (primitives stand in for missing assets); (3) controls, collisions, progression, game logic; (4) interface plus end-to-end validation by actually playing it with real input. In the full pipeline, the Golem-built game holds the state (collisions, scores, health) and renders the graybox view; EdenLive skins it live. The workbench bridge host requires the **`claude` CLI** and game generation runs with `--dangerously-skip-permissions` — worth knowing before it is let near a seat.

## Specs as published

| Item | Published figure |
|---|---|
| Full weights tree | "about 210 GB" (HF card); the actual file tree sums to **224.8 GB** |
| 14B DiT files | 65.66 GB *each* (few-step and bidirectional) — 131 GB of the tree |
| 5B DiT files | 20.05 GB each ×2 |
| 5B real-time subset only | dit-5b 20.05 + vae-5b 2.82 + umt5 11.36 + vision-encoder ~2.4 + decoder-5b (small) ≈ **37 GB** |
| Workbench extra | flux-c2f ≈ 34.8 GB (FLUX.2 [klein] 9B + LoRA) |
| Verified offline environment | **Linux x86-64, NVIDIA GPUs with 80 GB**, CUDA 13 driver, Python 3.10, pinned PyTorch cu130 nightly |
| Real-time service requirements | NVIDIA GPU with **80 GB VRAM or more** (e.g. H100 80GB); driver R580+; **100 GB+ free storage recommended**; Linux x86-64 **or arm64** |
| Alternative real-time path | LightX2V accelerated build on a single **RTX 5090**: ~24.7 FPS at 1280×704 (one community run measured ~23 GiB VRAM with int8 quantisation and CPU offload) |
| 5B bidirectional default profile | requires **SM90**, BF16, flash-attn-4 |
| Publisher benchmarks (H100) | 5B on 1×H100: 73.5 FPS at 832×480, 26.8 FPS at 1280×704; peak allocated memory **28.5 GiB** (480p) / **50.8 GiB** (720p); first-frame latency 0.83 s / 1.71 s; inter-chunk gap P95 148 ms / 430 ms. 14B real-time figure is on **8×H100** |
| Network model | Browser client (port 8089) ↔ GPU host model service; **WebRTC** media; a **coturn TURN relay** (port 3478) for off-subnet clients; workbench bridge may live on a **separate host** (`BRIDGE_HOST`, token copied across); FLUX worker on the GPU host (8092) |
| Licensing | Code Apache-2.0. Weights mixed: DiT/VAE/UMT5/decoders Apache-2.0 (Wan-derived); CLIP MIT; vision encoder under Meta's **DINOv3 licence**; **flux-c2f under the FLUX Non-Commercial License v2.1 — non-commercial, non-production use only**, and it is loaded *only* by the workbench's first-frame renderer, not by the video pipelines |
| Cost shape | Open weights, no API fees, no per-call pricing. The paid comparison is the hosted demo (Unbound Loop) and cloud GPU rental generally |
| Maturity | One week old. Repo created 12 Oct 2026; 76 commits, 372 stars, **zero releases**; HF downloads 365; EdenGolem explicitly **v0.1**; the Reactor integration bundle already notes its pinned game snapshot has drifted from the repo's registry |

## Fit against the measured fleet

### The architecture fit is exact — and that is the trap

Eden's split *is* the holodeck split Casey described the same morning: an engine/programme holds the state (in his design: origins, facings, anchor-relative positions — the active log and ledger), heavy machinery generates, and rendering is a separable, swappable layer. EdenGolem is literally the "describe the next room, open the door onto a first take" loop, with a graybox instead of a manifest. As a **reference design and a prototyping path**, this is the closest published relative of the whole-house quilt's rendering end. Nothing about the *ideas* needs the cloud: the multi-host topology (bridge host, GPU host, browser client, TURN for off-subnet) is designed for exactly a LAN of separate boxes.

### The hardware fit contradicts the "specs would work" reading

This is the part that must be said plainly:

1. **No fleet box meets the published spec.** The verified environments are an 80 GB datacentre GPU (H100) and, via a separate accelerated stack, an RTX 5090. The fleet has: the Thor (integrated sm_110 GPU, unified memory), an RTX 4050 laptop GPU (**6 GiB** — a factor of ~4 below even the quantised 5090 field report's ~23 GiB, and ~8× below the 5B's published 720p peak), and the Orin (8 GiB shared). EdenLive cannot run on the laptop or the Orin at all, in any published configuration.
2. **The Thor is a capacity maybe, a throughput unknown, and a stack risk.** In its favour: the realtime stack lists **arm64** as supported, the Thor runs CUDA 13.2, and its 122 GiB of unified memory could in principle hold the 5B's published peak allocations (28.5 GiB at 480p; 50.8 GiB at 720p) where a discrete card could not. Against: the publisher has published **no Jetson or Thor figures at all**; the default 5B bidirectional profile wants **SM90** flash-attention (the Thor is sm_110); the Thor's PyTorch is a fragile pinned SBSA build that also carries the resident endpoints, while EdenLive pins its own cu130 torch nightly — the install would be a research project on the fleet's most load-bearing box, not an install.
3. **Real-time over this LAN stacks two risks.** The published inter-chunk gap P95 is already 148–430 ms *on an H100, model-side*. Casey's reaction-path doctrine says the quarter-second that *is* the loop cannot ride Wi-Fi; an EdenLive loop split across the house (graybox up from the desk, generated video back down) crosses the measured ~71 Mb/s, two-hop Wi-Fi twice per frame-trip. One 720p WebRTC stream would probably *fit* the pipe; whether the interaction still feels live, on a slower-than-H100 GPU, is unproven in both directions at once.

### The storage reality — the "huge download" has nowhere to land as-is

- The Thor's NVMe is **97% full: 28 GB free**. The full tree is **224.8 GB**; the publisher recommends 100 GB+ free for the realtime deployment alone. Even the **selective 5B real-time subset (~37 GB)** does not fit the free space.
- The realistic landing spots, in order: (a) **cold offload first** — move shelved material to the 1.8T Toshiba NTFS external (`/media/caseydigennaro/TOSHIBA EXT`) until the NVMe can hold a working set; (b) land the weights tree **on the external drive** and point `MODEL_ROOT` at it — workable for a trial (weights load once into memory) but a spinning/USB path is the wrong home for a service expected to swap 5B/14B or restart often, and NTFS on Linux adds its own friction; (c) do not land the 14B at all — its two DiT files alone (131 GB) buy a 480p model whose real-time figure needs eight H100s.
- **Getting it home is its own problem.** 224.8 GB at the Thor's ~137 Mb/s internet rate is ~3¾ hours at perfect line rate — and the fleet's measured single-stream rate to Hugging Face has historically crawled at ~0.2–0.5 MB/s per stream, which prices the full tree in *days* and even the 37 GB subset at roughly a day. The sane route is the standing one: **stage on the Oracle** (datacentre-speed fetch and hash-verify there), forward only the chosen subset home, and run it through the **download governor** (serial, smallest-first, hash-gated) like every other large arrival. Nobody runs their own downloader for this.

### Box-by-box verdict

| Box | Verdict |
|---|---|
| **Thor** | The only conceivable host. 5B *offline* few-step inference is a plausible bounded experiment after storage is freed; real-time mode is unproven and, on published numbers, unlikely to hold 24 FPS at 720p. High stack risk to resident services. |
| **Orin** | Cannot run the models. Fits its designed role exactly: the desk end — browser client, graybox/game host, the engine-and-ledger seat Eden's layer one wants. |
| **ProArt (RTX 4050)** | Cannot run the models (6 GiB). Remains the conventional real-time 3D renderer; in an Eden topology it would be a client, not the generative renderer. |
| **Oracle** | Cannot run it (no GPU). Ideal staging arm: fetch, verify hashes, forward the subset. |
| **LAN** | Topology fits (WebRTC + TURN + split hosts is LAN-native). Throughput probably suffices for one stream; latency for a *live* loop is the open question, and it stacks on top of the GPU question rather than replacing it. |

### Does local compute substitute for the cloud spend?

Partially, and honestly: EdenLive's weights are free and Apache-2.0 in the parts that matter, so *if* a fleet box could run the 5B in real time, the substitution would be total — that is precisely the bet Casey read in the specs. The published evidence says the substitution currently holds on an H100 or an RTX 5090, neither of which the fleet owns. What the fleet *can* substitute today is everything around the renderer: Golem-style graybox generation with the existing agent seats (near-zero marginal cost), asset generation on the Thor's existing studio, and the engine/ledger layer — which is most of the holodeck. The generative skin is the one layer where the cloud (or a future GPU) still holds the advantage.

## Recommendation: **watch, with two bounded trials** — do not adopt

1. **Trial EdenGolem now (cheap, high information).** It is a skill in a code repo — kilobytes, not gigabytes. Run it with an existing coding-agent seat on a scratch game and judge the four-stage gated build against the fleet's own vibe-coding-the-next-room ambitions. Mind the `--dangerously-skip-permissions` posture: scratch directory, no credentials in reach.
2. **Trial the 5B offline path on the Thor only after the cold offload** frees real NVMe room, with the subset staged via Oracle and the governor, and with success defined in advance: a few-step render of one of the repo's bundled graybox samples, at whatever frame rate the Thor honestly gives. That number — not the H100 table — is the fact the project needs.
3. **Pass on real-time EdenLive for now.** No qualifying GPU, an unproven arm64/sm_110 path, and a reaction-path latency budget the current LAN cannot promise. Revisit if the publisher (or LightX2V) publishes Jetson/Thor figures, a quantised 5B with a stated ≤24 GiB footprint and no SM90 dependency, or if a 5090-class card enters the fleet.
4. **Steal the architecture regardless.** State-first/rendering-follows, graybox-as-interface, event descriptions as a side-channel, fetch-on-notice: Eden is independent confirmation of the holodeck design, published a week ago, by a lab with no knowledge of this house. That convergence is worth more to the big project than the weights are.

*Process: identified from the publisher's announcement and repo (the names are the publisher's own spellings); all specifications above are quoted from the GitHub README, the realtime README, the HF model card, or measured from the HF file tree directly (224.8 GB total; per-file sizes as tabled). No fleet box was touched and nothing was downloaded for this note.*
