# ASCII-Splat Room Mapping — State of the Art 2024–2026

## Summary

**Bottom line for a small open-source team in October 2026: the visual half of this system is buildable today from off-the-shelf parts; the ASCII and acoustic halves are research gaps, not products — and that is precisely where the novelty lies.**

- **Training a single room is solved and cheap.** With `gsplat` / Nerfstudio Splatfacto a Mip-NeRF 360 *room* scene trains in ~13 min at 30k steps using ~3.6 GB VRAM, or ~2.5 min at 7k steps for a preview. The bottleneck in a real phone pipeline is no longer splat optimisation — it is camera poses (COLMAP) and capture coverage.
- **Rendering on phones is solved; training on phones is a 2026 preprint claim, not a shipped capability.** Compressed splats render at 100+ FPS on a Snapdragon 8 Gen 3 at ~5 MB/scene. The one on-device *training* result (PocketGS, ~4 min, <3 GB on iPhone 15) is an unreviewed preprint. Plan for phone = capture, small GPU / cloud = train.
- **Semantic splats are real and fast now.** LangSplat made scenes language-queryable; LangSplatV2 (NeurIPS 2025) made querying real-time (385 FPS vs 8.2 FPS). Feature/identity fields (Feature 3DGS, Gaussian Grouping) are the obvious way to make a room splat *editable in Blender by object*.
- **Depth/normal guidance is mainstream; pure edge guidance is thin but exists** (EGGS, EdgeGaussians, DET-GS). No one ships an edge/ASCII-guided splat trainer.
- **ASCII as an intermediate 3D representation: essentially unshipped.** The nearest neighbours are (a) Meta's SceneScript — scenes as editable *structured text commands*, not character grids, (b) 2025–26 LLM benchmarks showing ASCII grids are read well but *written* badly by LLMs, and Cartesian coordinates often beat ASCII grids, and (c) classic occupancy grids. Nobody found in this research publishes ASCII grids as an intermediate layer for SLAM, splatting, or room reconstruction. That is a genuine white space — with a known trap (see §3).
- **Acoustics can recover a floorplan surprisingly well in simulation, and almost nothing is validated on a real phone in a real room.** EchoScan reports 94.7% average floorplan IoU from RIRs — on *synthesised* RIRs, with a smart-speaker-like circular mic array, not a phone. The robust, stealable acoustic products today are: RT60 / material-flavoured RIR estimation (AV-RIR, xRIR) and using audio as a *prior/constraint* on visual geometry, not as a standalone scanner.
- **Blender is the easiest leg.** KIRI's free 3DGS Render add-on imports/edits/renders splats inside Blender; `bpy` is scriptable headlessly; and LLM control exists via the community `mcp-for-blender` and, since April 2026, Blender Lab's official (experimental) MCP server. The risk there is security (arbitrary Python over an unauthenticated socket), not capability.

Confidence: high for §1, §2, §5 (multiple independent sources, benchmark tables); medium for §4 (mostly single-team papers, simulation-heavy); medium-low for §3 novelty claim (absence of evidence from broad searches, stated as "none found", not "none exists").

---

## Findings

### 1. 3D Gaussian Splatting: trainers, mobile/edge feasibility, room training time, few-view failure modes

#### 1.1 Trainer comparison — what to build on

| Trainer | Licence / platform | Numbers that matter | Steal / avoid |
|---|---|---|---|
| **Original Inria 3DGS** (Kerbl et al., SIGGRAPH 2023) — https://www.ultralytics.com/glossary/gaussian-splatting (summary of paper) | Research licence (non-commercial elements); CUDA | 30k steps ≈ 35–45 min and ~9 GB on Mip-NeRF 360 average in gsplat's head-to-head; large-scene peak memory could exceed 20 GB; ~734 MB stored per scene. Quality at 7k steps already "quite good" in the paper | Reference implementation and file format; do **not** base a commercial/open product on it without checking the licence, and do not use it for small GPUs |
| **gsplat** (Nerfstudio project) — benchmarks: https://rocm.docs.amd.com/projects/gsplat/en/latest/reference/benchmark-evaluation.html and https://deepwiki.com/tongji-rkr/gsplat-2dgs/7.1-performance-benchmarks ; 1.0 launch: https://radiancefields.com/nerfstudio-releases-gsplat-1-0 | Apache-2.0 (per 1.0 launch coverage); Python/CUDA library, also ROCm docs | Mip-NeRF 360 average, 1 GPU: **30k steps 5.7 GB, 35m49s vs Inria 9.0 GB, 37m13s; 7k steps 4.3 GB, 5m35s**. With MCMC strategy capped at 1M Gaussians: **1.98 GB, 15m25s** in the gsplat paper table. Adds batch rasterisation, fisheye/FTheta/LiDAR camera models (3DGUT), N-D feature rendering (needed for §2), sparse gradients, multi-GPU | **Default choice.** The library, not just an app: embed it, cap Gaussians with MCMC to fit a VRAM budget deterministically |
| **Nerfstudio / Splatfacto** (built on gsplat) — https://radiancefields.com/platforms/nerfstudio | Apache-2.0; `ns-train splatfacto`, exports `.ply` | Docs cited there: **~6 GB VRAM for Splatfacto, ~12 GB for Splatfacto-Big**. Full pipeline (data processing, viewer, export) around the trainer. Latest *tagged* release v1.1.5 (Nov 2024) with later main-branch work incl. Splatfacto-MCMC — pin versions | Best end-to-end developer UX for phone photos → poses → splat; heavier and slower-moving than raw gsplat |
| **Brush** (Arthur Brussee) — https://radiancefields.com/gaussian-splatting-in-browser-brush ; internals https://www.spatialmedia.dev/articles/gaussian-splat-tools/gaussian-splat-tools.html | Open source; Rust + Burn + WebGPU/wgpu | Runs where CUDA cannot: **macOS/Apple Silicon, AMD, Windows, Linux, Android, and in-browser (Chrome/WebGPU)**. Accepts COLMAP or Nerfstudio datasets, live training view, CLI + PLY viewer. Still described as proof-of-concept lineage, fewer advanced 3DGS extensions than gsplat | The only credible path if your "small GPU" is Apple Silicon, AMD, or a browser. Use for the edge/preview tier |
| **LichtFeld Studio** (formerly mrnerf/lichtfeld) — https://lichtfeld.io/ | GPLv3, free from source; C++/CUDA + Vulkan viewer | Requires **NVIDIA compute ≥7.5 and ≥8 GB VRAM**. v0.5.4 (2026): up to 3× faster than v0.5.3, lower VRAM, **normal-guided training**, Python plugins and **MCP endpoints** for automation | Best desktop GUI trainer to embed/automate if GPL is acceptable; the normal-guided mode is directly relevant to §2 |
| **Postshot** (Jawset) — https://radiancefields.com/platforms/postshot | Commercial (free tiers changed repeatedly in 2025–26 — verify current pricing before relying on it); Windows + NVIDIA CC ≥7.5 only | GUI, video-in → splat, trains Splat3 / Splat-MCMC / ADC profiles, exports PLY and SPZ v4; CLI/HDR/RAW are top-tier features | Benchmark for UX, not a dependency for an open-source system |
| **SuperSplat / splat-transform** (PlayCanvas) — https://radiancefields.com/platforms/supersplat ; formats https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/ | MIT; browser/WebGPU | Not a trainer — the editor/compression leg: crop/clean in browser, export PLY / compressed PLY / SPZ / **SOG (15–20× smaller than PLY)** / streamed SOG for large scenes | Steal for cleanup + delivery instead of writing your own editor |

**Format note (matters for phone + Blender handoff):** raw `.ply` is ~236 bytes/Gaussian in early tooling; Niantic's **SPZ** (open-sourced MIT, Oct 2024 — https://radiancefields.com/scaniverse-open-sources-spz-compression-for-3dgs) is ~10× smaller, and SPZ v4 (May 2026) uses parallel ZSTD streams and removed the 10M-point cap. Ship SPZ or SOG, keep PLY only as interchange.

#### 1.2 How long does a single room from a phone actually take?

Decompose the pipeline — the splat step is *not* the long pole:

1. **Capture:** a 1–3 minute slow walk-around video, or 100–300 overlapping photos. Coverage, not count, decides quality (see §1.4).
2. **Poses (usually the bottleneck and the failure point):** COLMAP SfM on a few hundred phone frames is minutes to, on weak hardware / poor overlap, hours or outright failure. This is changing fast: **VGGT** (CVPR 2025) predicts cameras, depth and point maps in a single feed-forward pass — "estimates cameras and geometry in under a second and starts replacing COLMAP" (timeline summary: https://ar-go.co/blog/what-is-gaussian-splatting/). DUSt3R/MASt3R-lineage models and pose-free splatters (AnySplat, NoPoSplat, FreeSplatter) build on the same idea. For a *room* product, budget engineering time for a VGGT/MASt3R pose path with COLMAP as fallback/refinement, plus ARKit/ARCore poses from the phone itself when available (free, metric, and already on device).
3. **Splat training — hard numbers for an actual room scene** (gsplat ROCm benchmark, Mip-NeRF 360 *Room*, 2.29M Gaussians at 30k): **7k steps ≈ 156 s, 2.81 GB; 30k steps ≈ 758 s (~12.6 min), 3.61 GB** — https://rocm.docs.amd.com/projects/gsplat/en/latest/reference/benchmark-evaluation.html. Cross-check on NVIDIA hardware: gsplat 1.0 coverage quotes ~5.5 min to 7k and ~36 min to 30k *averaged over the larger Mip-NeRF 360 set* — indoor room scenes sit at the fast/small end of that range.
4. **Cloud phone apps as a sanity anchor:** Polycam-style cloud processing is quoted at 2–10 minutes per capture (https://www.thefuture3d.com/answers/gaussian-splatting-processing-time/); Scaniverse Classic trains *on device* in well under a few minutes for small scenes (see §5).

**Realistic product target:** phone video → preview splat (7k, capped ~1M Gaussians) in **3–6 minutes on a 6–8 GB GPU**, final 30k room splat in **10–20 minutes**, *provided poses succeed*. Quote those numbers with the pose caveat.

#### 1.3 Mobile / edge-GPU feasibility — separate rendering from training

- **Rendering: solved.** Mobile-GS reports **127 FPS on a Snapdragon 8 Gen 3, 4.6 MB storage, PSNR 27.12** on Mip-NeRF 360 (vs 8 FPS / 61.8 MB for a quantised vanilla 3DGS baseline) — https://arxiv.org/pdf/2603.11531 *(2026 preprint; treat as indicative)*. Viewing a room splat in a browser via SuperSplat/WebGPU or SPZ/SOG streaming is routine.
- **Training on a desktop/laptop 6–8 GB GPU: yes, with discipline.** gsplat at 30k fits in 5.7 GB average; a room fits in ~3.6 GB; MCMC capping fits ~2 GB. What breaks 6 GB is not "a room" — it is unbounded densification, full-resolution phone images (downsample / `data_factor`), and large outdoor scenes (Bicycle/Garden needed 8.5–11.6 GB at 30k in the ROCm table). Rules: cap Gaussian count, train at ½–¼ image resolution for preview, tile or crop for finals.
- **Training on the phone itself: one strong preprint, no shipped open implementation found.** PocketGS claims fully on-device training in **~4 minutes end-to-end, <3 GB peak memory, on an iPhone 15**, via geometry-prior construction + prior-conditioned Gaussian initialisation + a hardware-aligned differentiable splatter — https://arxiv.org/html/2601.17354v3 *(Jan 2026 preprint, not peer-reviewed in the sources checked; no production code verified)*. Scaniverse's on-device splats are the shipped existence proof that *some* on-device training works at consumer quality, but its trainer is closed.

#### 1.4 Failure modes — few views, single viewpoint, and room-specific traps

This is the best-documented part of the literature, and it is unforgiving:

- **Floaters and background collapse are *the* sparse-view diseases.** SparseGS (https://arxiv.org/html/2312.00206v3): with limited views, 3DGS quality "significantly degrades… artifacts such as 'floaters' and 'background collapse' at unseen viewpoints". Its fixes — monocular **depth priors, depth-rendering losses, floater pruning, and unseen-viewpoint regularisation** — get usable results from **12 views in unbounded scenes and 3 views forward-facing**. Vanilla 3DGS wants dense, well-distributed views; do not promise otherwise.
- **Single viewpoint = no reconstruction, only hallucination.** With one viewpoint there is no parallax: photometric optimisation can fit that view perfectly with a billboard-like shell of Gaussians at arbitrary depth. Feed-forward models (pixelSplat, MVSplat, DepthSplat) will *invent* plausible geometry from learned priors — useful for a preview, dishonest if presented as a measurement. Any product claim should label single-view output as a prior-based guess.
- **Feed-forward is the fast alternative when views are sparse but posed:** DepthSplat (https://arxiv.org/html/2410.13862v3) fuses monocular-depth features with multi-view matching and reconstructs from **12 views (512×960) in 0.6 s**, state-of-the-art on ScanNet/RealEstate10K/DL3DV in its paper — at lower fidelity than per-scene optimisation. Pattern worth stealing: *feed-forward for instant preview → per-scene gsplat refinement in background.*
- **COLMAP/SfM failure precedes splat failure:** textureless white walls, repetitive patterns, mirrors/glass, motion blur, and poor overlap produce no poses and no sparse cloud to seed Gaussians. Rooms are full of exactly those surfaces. Mitigations with evidence behind them: phone LiDAR/ARKit depth + poses as seeds, monocular depth (Depth Anything lineage) aligned to sparse points (the DRO / depth-regularised few-shot line), and normal priors.
- **Geometry is not a surface.** Vanilla 3DGS Gaussians sit off-surface; novel views look right while extracted meshes are poor. If Blender needs real geometry (§5), use the surface branch: **2DGS** (planar disks), **PGSR** (planar Gaussians + unbiased depth + multi-view consistency — https://arxiv.org/html/2406.06521v1), or **SuGaR** (surface-aligned regularisation + Poisson mesh extraction), and accept the extra training complexity.
- **Other room traps:** exposure/white-balance drift across a phone video (3DGUT/Postshot/LichtFeld exposure handling exists for a reason), dynamic people/pets (ghost Gaussians), and scale ambiguity — a splat from photos alone has no metres in it; scale must come from ARKit/LiDAR, a known object, or §4 acoustics.

**Steal today (§1):** gsplat + MCMC cap as the engine; Nerfstudio data plumbing; VGGT/MASt3R *or* ARKit poses with COLMAP refinement; SparseGS-style depth prior + pruning as a "few-photo mode"; SPZ/SOG export; Brush for non-CUDA preview.

---

### 2. Semantic and guided splatting

#### 2.1 Splats that carry language/features — scenes you can query and edit by word

| System | What each Gaussian carries | Demonstrated numbers | Limits |
|---|---|---|---|
| **LERF** (ICCV 2023, NeRF baseline) — https://arxiv.org/pdf/2303.09553 | CLIP + DINO field inside a NeRF (not splats) | Localises long-tail/abstract queries ("wooden spoon", "spill") in real handheld scenes; trained 30k steps ≈ 45 min. The dataset/scenes everyone still evaluates on | Slow volumetric querying, blurry relevancy where objects lack side views, bottlenecked by NeRF quality. Historical anchor, not a build target |
| **LangSplat** (CVPR 2024) — https://arxiv.org/html/2312.16084v2 ; code linked from paper coverage: https://langsplat.github.io/ | Compressed CLIP feature per Gaussian (scene-specific autoencoder), SAM hierarchical masks (whole/part/subpart) | **84.3% localisation vs LERF 73.6%; segmentation IoU 51.4% vs 37.4%; 199× faster than LERF at 1440×1080** | Per-scene autoencoder training; CLIP's bag-of-words ambiguity remains; original version still only 8.2 FPS querying on an A100 (per LangSplatV2's analysis) |
| **Feature 3DGS** (CVPR 2024) — https://arxiv.org/html/2312.03203v3 | Arbitrary foundation-model features (SAM, CLIP-LSeg…) distilled per Gaussian, rendered by a parallel N-D rasteriser; low-dim field + learned conv upsampler | **Up to 2.7× faster distillation/rendering than NeRF-based DFF, ~+23% mIoU** on segmentation in paper claims; first SAM point/box prompting *inside* a radiance field (segment/edit from any novel view, e.g. "delete the banana") | Feature dimension is the memory/speed tax — naive high-dim features crush training; the low-dim+decoder trick is mandatory, and decoder blur caps boundary sharpness |
| **Gaussian Grouping** (ECCV 2024) — described in https://arxiv.org/html/2407.04504v1 and surveys | **16-d identity encoding** per Gaussian, supervised by SAM masks made view-consistent by a video tracker + 3D kNN consistency loss | Joint reconstruction + segmentation of "anything"; enables object **removal, inpainting, recomposition** with far fewer artefacts than DFF baselines | Closed object set from SAM/tracker (not open-vocabulary by itself); tracker errors become 3D errors; identity, not language — pair it with CLIP features for queries |
| **LEGaussians / OpenGaussian** (2024) — via survey https://arxiv.org/html/2401.03890v8/ | Quantised language embeddings + uncertainty smoothing (LEGaussians); instance codebooks + CLIP association (OpenGaussian) | Point-level open-vocabulary understanding (query returns *Gaussians*, not just a 2D heatmap) — the property a Blender editor actually needs | More moving parts; codebook/quantisation tuning per scene |
| **LangSplatV2** (NeurIPS 2025) — https://arxiv.org/abs/2507.07136?context=cs | Sparse codes over a global dictionary instead of a decoded feature per Gaussian | **476 FPS high-dim feature splatting, 385 FPS open-vocabulary querying — 42× / 47× over LangSplat; IoU 59.9% vs 51.4%** on 3D segmentation, comparable localisation (84.1%) | Newest and fastest; still per-scene optimisation (30k RGB + 10k feature steps in its pipeline). This is the current state of the art to beat or borrow |

**What this means for a room mapper:** a two-layer representation is now standard practice — (1) RGB splats for looks, (2) a *feature/identity layer* (Gaussian Grouping-style IDs for editing + LangSplatV2-style sparse CLIP codes for language) that lets an agent answer "where is the radiator?" and lets Blender delete/move that object as a unit. Budget for it: feature training is a second optimisation pass, and SAM/CLIP preprocessing of every training frame is real compute on a small GPU.

#### 2.2 Guidance: edges, depth, normals steering splat placement/fitting

- **Depth priors (mature, steal first).** SparseGS (above); DNGaussian and the depth-regularised few-shot line align monocular depth to COLMAP sparse points to fix scale, then use it as a geometry guide + early-stop signal; DepthSplat (§1.4) makes depth the *initialisation itself* — predicted depth maps are unprojected into Gaussian centres. FSFSplatter (https://arxiv.org/html/2510.02691v3) claims dense transformer initialisation + depth/feature supervision reconstructs surfaces from free sparse views **within 2 minutes**, cutting surface error ≥28% vs prior art in its benchmarks.
- **Normal priors (now in shipped tools).** LichtFeld Studio 0.5.4 generates normal maps automatically and applies a normal loss with depth priors and masks, targeted at "ambiguous scene structure, difficult surfaces, and thin structures" (https://radiancefields.com/lichtfeld-studio-0.5.4-adds-licht-projects-normal-guided-training-and-gallery-publishing). Normal-guided depth propagation + **edge-aware smoothing** is also the core of recent sparse-view surface work: propagate high-confidence depth along normals, smooth *except across edges*.
- **Edge guidance (exists, small, directly on-mission):**
  - **EGGS — Edge Guided Gaussian Splatting** (https://arxiv.org/html/2404.09105v2): precompute an edge-indicating weight map from the input photos, weight the photometric L1 loss by it. Claims **zero extra training cost** (same densification/rendering as vanilla 3DGS) with improved radiance-field accuracy. The simplest possible steal: a loss-weighting change in gsplat.
  - **EdgeGaussians** (https://www.alphaxiv.org/overview/2409.12886v2): inverts the idea — splats supervised *only by 2D edge maps*; Gaussian centres land on 3D edges, principal axes align with edge direction, then clustering fits parametric curves. Output is a compact 3D *edge map*, not a pretty render. For a room system this is arguably the more interesting artefact: walls/doorframes/furniture outlines as explicit curves.
  - **DET-GS** (https://ar5iv.labs.arxiv.org/html/2508.04099): depth- and edge-aware regularisation + RGB-guided edge-preserving TV loss; reports consistent PSNR/SSIM/LPIPS gains and fewer floaters, and itself flags reflections/transparency/thin structures as remaining failures.
- **Semantic-guided densification (2025 direction):** SAM region types drive *where* Gaussians densify and how loss is weighted (thin structures densified, flat regions compressed) — e.g. the SG-GS line summarised in https://arxiv.org/pdf/2610.16292 *(2026 preprint)*. Combined with gsplat's MCMC relocation, this is the principled way to spend a fixed Gaussian budget in a room: edges, object boundaries and thin objects first; blank walls last.

**Gap:** every guided method above guides with *dense continuous* priors (depth/normal/feature maps). None guides with a *discrete symbolic* prior — a floorplan, an edge sketch, or a text grid. That junction is §3 and §6.

---

### 3. ASCII / text-based scene representations for spatial reasoning

**Headline finding: no published or notable open-source system was found that uses ASCII character grids as an intermediate representation for 3D reconstruction, SLAM, or splatting.** Searches across arXiv/web for ASCII + (SLAM / 3D / splatting / room) returned benchmarks about LLMs *reading* ASCII, ASCII *rendering* art, and text-*command* scene languages — not an ASCII-mediated perception pipeline. Treat the ASCII leg as invention, not integration. What does exist, in descending closeness:

1. **SceneScript (Meta Reality Labs, ECCV 2024) — the closest shipped idea, and it is not ASCII art.** — https://ai.meta.com/blog/scenescript-3d-scene-reconstruction-reality-labs-research/ ; paper https://arxiv.org/pdf/2403.13064
   - From an egocentric video it autoregressively emits a **structured text language**: commands like `make_wall(...)`, `make_door(...)` with metric parameters. Representation is *compact* ("only a few bytes" per scene in Meta's phrasing), *crisp* (vector-like, not voxels), *interpretable/editable*, and LLM-native by construction.
   - Trained on **Aria Synthetic Environments: 100k synthetic indoor scenes** with ground-truth SceneScript, depth and segmentation; generalises to real Aria captures in the paper.
   - Limits (authors'): hand-designed command vocabulary; coarse geometry — cannot capture mm-level or intricate detail; needs large training data that had to be synthesised.
   - **Steal:** the *interpreter pattern* — a tiny deterministic language whose commands build geometry — is exactly what a Blender backend wants (§5). If your "ASCII" layer can compile to SceneScript-like commands, an LLM can read/edit it and Blender can execute it.
2. **Text2Space / "Learning to Draw ASCII Improves Spatial Reasoning in Language Models" (arXiv Apr 2026 preprint)** — https://arxiv.org/pdf/2604.14641
   - Pairs natural-language descriptions with ground-truth **ASCII grid layouts** and spatial QA. Findings with direct design consequences:
     - **Read–write asymmetry / "construction gap":** LLMs interpret given ASCII layouts far better than they *construct* them; construction errors propagate into wrong answers.
     - **Given accurate ASCII, reasoning improves substantially over text alone** — the representation helps when it is *correct*.
     - Training models to *construct* ASCII improves even text-only spatial reasoning and transfers to external benchmarks (STEPGAME et al.).
   - **Design consequence:** generate the grid *algorithmically* from depth/occupancy (a renderer, not an LLM), and let the LLM only read/annotate it. Never ask the LLM to draw the map freehand and then trust it.
3. **Representation-choice evidence — ASCII is not automatically the best text format.**
   - *From Text to Space* (LLaMA-3 grid-world study, https://arxiv.org/pdf/2502.16690): **Cartesian (x,y) coordinates consistently beat topographic (ASCII-grid) representations and prose** for navigation decisions across model sizes, though internal probes find a shared spatial code.
   - **PlanQA** (https://arxiv.org/html/2507.07644v1): 1,800 room layouts as **JSON** + 18,000 spatial questions (distance, placement feasibility, visibility) — the benchmark community is converging on JSON/coordinate layouts, not character grids, for machine spatial reasoning.
   - **SpatialEval**: includes ASCII mazes (`###### / #SXX## / …`); VLMs often sit near random on spatial tasks and text-only models can beat vision models — i.e. a clean text grid can carry spatial information *better than the image does* for an LLM, which is the strongest argument *for* an ASCII/occupancy intermediate.
   - **Grid2Guide** (https://arxiv.org/html/2508.08100v2): floorplan grid + **A\* does the geometry (100% route accuracy, <5 ms)** while a small LM only phrases instructions. Pattern: *symbolic grid for algorithms, LLM for language.*
4. **Occupancy grids (the unglamorous ancestor that already works).** Robotics' 2D/3D occupancy grid — cells = free/occupied/unknown — *is* a character grid when printed (`#`/`.`/`?`), is natively produced by SLAM, is directly consumable by A\*/planners, and trivially renders to ASCII. Any honest ASCII system will in practice be an occupancy grid + semantic glyphs (e.g. `D`=door, `W`=window, `S`=sofa from §2/§5 detections) rendered as text, with per-cell height/material side-channels. No paper was found doing exactly that rendering for LLM consumption from a splat — again, white space.
5. **Glyph/edge encoding craft (rendering side).** A 2026 shape-aware ASCII renderer (https://tympanus.net/codrops/2026/09/04/beyond-the-luminance-ramp-a-shape-aware-ascii-renderer-in-three-js/) shows why naive luminance-ramp ASCII destroys edges — "a slash and a dot with the same coverage come out as the same character" — and fixes it by matching a per-cell *shape vector* against all 95 printable glyphs (`| / — ╲` carry direction). For a spatial (not artistic) encoding, the lesson transfers: choose glyphs by *local geometry* (edge orientation, corner, junction), not by brightness/density alone.

**Steal today (§3):** SceneScript's command language + interpreter; an occupancy-grid core with a deterministic ASCII *renderer* (multi-height slices); PlanQA/SpatialEval-style evaluation for your LLM layer; coordinates+JSON alongside ASCII (give the model both — the evidence says coordinates reason better, grids verify better).

---

### 4. Acoustic room reconstruction

Organise by what audio is asked to do — accuracy collapses as you go down the list:

#### 4.1 Estimate the room's impulse response / reverberation (mature, useful)

- **AV-RIR (CVPR 2024)** — https://arxiv.org/html/2312.00834v2 : from reverberant speech + a panoramic image of the room, estimates the full RIR; **Geo-Mat features** inject visual *material/geometry* information; CRIP retrieval improves late-reverberation components by 86%; **36–63% improvement over audio-only and visual-only baselines** across acoustic metrics; also wins T60 (RT60) error on the real-world AVSpeech set. This is the template for "camera sees materials, audio calibrates them".
- **xRIR / "Hearing Anywhere in Any Environment" (2025)** — https://arxiv.org/abs/2504.10746v2 : panorama **depth** + *a few* reference RIRs → RIR at *any* source/receiver position in a *new* room. Trained on **ACOUSTICROOMS: >300,000 simulated RIRs from 260 rooms**; sim-to-real demonstrated on **4 real environments**. Stealable framing: acoustics as a *field to query*, conditioned on visual geometry — the acoustic analogue of a splat.
- **Few-Shot AV-RIR (Majumder et al.)** — https://ar5iv.labs.arxiv.org/html/2206.04006 : sparse images + echoes → RIRs at arbitrary query locations, generalising to novel environments few-shot (evaluated in an audio-visual simulator). **Image2Reverb / Mesh2IR / FAST-RIR** lineage (cited within AV-RIR/xRIR) fills out the single-image → RIR and mesh → RIR niches.
- Practical floor for a small team: even without a neural RIR model, a phone can measure a *real* RIR cheaply (swept-sine or balloon/clap impulse through the phone speaker, recorded on the same/another phone) and yield **RT60, early-decay time, clarity (C50/DRR)** and a frequency-dependent absorption summary. Those scalars are robust, explainable, and — crucially — *constrain* materials in a way vision alone cannot.

#### 4.2 Estimate room geometry from echoes alone (striking in simulation, thin in reality)

- **EchoScan (IEEE/ACM TASLP, v4 Nov 2024)** — paper https://arxiv.org/abs/2310.11728?context=cs ; full text https://arxiv.org/html/2310.11728v3
  - Input: multichannel RIRs from **one device position** (modelled on an off-the-shelf smart speaker: one loudspeaker + circular mic array). Output: **floorplan segmentation map + height map**, including non-convex (L/T-shaped, incl. non-line-of-sight) and **curved-wall ("Atlanta")** rooms, by exploiting high-order reflections.
  - Numbers (synthesised RIR test set): **average floorplan IoU 94.69%** (convex 97.80%, non-convex 92.36%; shoebox 98.33%); cherry-picked failure cases still at ~71% and ~84% IoU.
  - Documented failure modes: **tall furniture (a bookshelf) is classified as wall** and shrinks the room; a device placed 0.5 m above a table misplaces the floor by that 0.5 m; objects below device height are mostly ignored.
  - Reality check: training/evaluation is overwhelmingly on *simulated* RIRs; the array is **not a phone** (a phone has 2–3 mics in a line, ~10–14 cm apart, and a weak, band-limited speaker). Expect a large sim-to-real and array-geometry penalty.
- **Classical / parametric RGI:** first-order-reflection TOA ellipse-tangent methods (Dokmanić et al.'s Euclidean-distance-matrix work and successors) recover convex room + source/mic positions from a handful of echoes, with clean theory and cm-level results *in controlled conditions*; a 2025 sparse-measure-recovery paper still has to restrict itself to **cuboid rooms** to make the inverse problem well-posed (https://arxiv.org/pdf/2509.08443). Lesson: unconstrained "hear the shape" is ill-posed; every success adds an assumption (cuboid, convex, known array, simulated training).
- **BatVision lineage (audio → depth, robot-mounted)** — dataset https://arxiv.org/html/2303.07257v3 : a speaker emitting FM chirps + **two microphones in artificial ears** learns to predict forward depth maps / grayscale layout; BatVision v2 dataset has **52,220 instances** (Berkeley) + 3,120 (Paris). Demonstrates echoes carry *local* layout/depth, with a stereo camera used only to provide training ground truth. Not room-scale floorplans, and the binaural-ear hardware does not map onto a phone.
- **Phone-specific precedent — BatMapper (2017, pre-deep-learning):** smartphone chirps build indoor floorplans, but reliable range was **~4 m per side**, with separate handling for regular rooms <8×8 m vs irregular/large rooms. No modern (2024–26) phone-native successor with published room-scale accuracy was found — another explicit gap.

#### 4.3 Estimate materials from sound (weakest leg — do it jointly with vision)

CRNN-style work can classify *which absorption/material categories are present* in a room from an RIR, and AV-RIR's Geo-Mat shows visual material cues measurably improve RIR estimation — but **per-surface acoustic material identification from phone audio alone has no validated, benchmarked system in the sources found**. The defensible product claim is: vision proposes per-surface materials (from §2 semantics), measured RT60/absorption *validates and corrects the room-average*, and per-surface values are fitted to match the measurement — not "the microphone heard drywall".

**Steal today (§4):** a swept-sine RIR capture step in the phone app (30 seconds, huge information per byte); RT60/EDC/C50 as first-class room metadata stored *next to* the splat; AV-RIR/xRIR architectures if you later train a neural RIR field; EchoScan's *floorplan-as-segmentation* output format as a cross-check on the visual floorplan (audio sees through darkness/occlusion and, via high-order reflections, partly around corners — vision does not).

---

### 5. Phone-based room capture pipelines and Blender automation

#### 5.1 Phone capture — buy/borrow this layer, don't rebuild it

| Tool | Capture → output | Terms / limits that matter |
|---|---|---|
| **Apple RoomPlan** (ARKit, iOS 16+) — tutorial/data model https://www.kodeco.com/41003944-augmented-reality-s-roomplan-for-ios-getting-started/page/2 ; accuracy roundup https://www.netguru.com/blog/augmented-reality-room-planning-technologies | LiDAR scan → `CapturedRoom`: parametric **surfaces** (wall/opening/window/door) + **objects** in 16 categories (bed, sofa, table, sink, bathtub, TV, stairs…) each with dimensions, transform, confidence; exports **USDZ** | **LiDAR iPhones/iPads Pro only** (12 Pro+), iOS-only — no Android equivalent of equal quality. Field accuracy cited ~**1–5 cm on walls**; Apple-cited detection ~**91% precision / 90% recall** across categories; LiDAR range **0.5–5 m**; mirrors/glass/glossy surfaces and >5 m drift degrade it. Output is a *room shell + boxes*, not photorealism — the perfect complement to a splat, not a competitor |
| **Scaniverse** (Niantic Spatial) — https://radiancefields.com/platforms/scaniverse | Phone → on-device Gaussian splats (Classic) or cloud reconstruction (new Scaniverse: splats + **meshes** + VPS localisation); exports **SPZ, PLY, GLB, FBX** (USDZ added 2026 in cloud tiers) | Classic on-device processing is **free and unlimited**; the new cloud workflow is credit/plan based (free allowance ≈10 min of capture processing/month in 2026 roundups; Pro $50/mo for commercial rights — verify current terms). Android support exists (cloud processing added 2026). The SPZ format is the durable takeaway even if you don't use the app |
| **Polycam** — roundup https://3dprinting.com/scanners/3d-scanning-with-your-phone/ | Photo / LiDAR / video → cloud photogrammetry, splats, and a Room mode producing scaled floorplans | Most popular, broadest modes; **exports are the paywall** — free tier effectively GLTF-only, paid ~$150/yr cited. Cloud-only processing (2–10 min). Its pipeline reportedly builds on Nerfstudio/gsplat forks (per gsplat 1.0 coverage) |
| **KIRI Engine** | Photo / LiDAR / splat modes on iOS+Android+web; splat-to-mesh conversion | Strongest Android option in roundups; free tier photo caps (≈150 photos/scan) and export limits apply. Strategically important mainly for its Blender add-on (below) |
| **RealityScan (Epic), Luma** | Photos/video → cloud mesh (RealityScan) / high-quality splats (Luma) | Useful comparators; Luma's standalone Flythroughs app was retired Jan 2026 (its interactive-scene tooling continued) — a reminder not to hard-depend on any single closed capture cloud |

**Pipeline lesson:** every successful phone product separates *structured room data* (RoomPlan-style shell: walls, openings, object boxes, metres) from *appearance data* (splat). Build your system the same way: RoomPlan/ARCore shell = the editable Blender scene graph; splat = the photoreal skin aligned to it.

#### 5.2 Blender — splats in, scenes out, agents driving

- **KIRI 3DGS Render add-on (the splat bridge)** — v4 https://radiancefields.com/kiri-engine-releases-v4-of-3dgs-blender-plugin ; vendor guide https://www.kiriengine.app/blog/kiri-engine-3DGS Render-Blender-v4.0 ; v5 https://www.cgchannel.com/2026/06/3dgs-render-5-0-lets-you-animate-gaussian-splats-inside-blender/
  - Free, open-source (Apache-2.0 per v4 coverage). Imports `.ply` as splats (or as points for fast cleanup), with a proxy object for real-time editing; clean with Blender's native selection, crop background halos, recolour; **Eevee-integrated rendering**, compositing splats *with* native meshes (incl. colour + depth passes); v5 adds **proxy-rig animation baked onto splats** and `.ply` sequence export; can also convert meshes → splat PLY.
  - Limits: splats remain a foreign render object (edit/render mode split, perspective-view quirks for face updates, ordering refresh artefacts); Blender has **no native splat type** in the sources checked — everything is add-on/proxy based. Test your exact Blender version (v4 recommended 4.5; other coverage targets 5.0+).
- **Programmatic construction with `bpy` (the dependable path).** Headless `blender --background --python script.py` remains the robust automation route: build walls/openings/furniture as real meshes from RoomPlan USDZ/JSON or SceneScript-like commands, place the splat (via the KIRI add-on or as a point-cloud placeholder) in the same coordinate frame, set cameras, render Eevee/Cycles stills and depth/normal passes. Those passes are reusable as *training/evaluation data* for §2 guidance — Blender as a synthetic-data factory for your own room models, not just a viewer.
- **LLM/agent control — two generations:**
  - **Community: `ahujasid/mcp-for-blender`** (formerly blender-mcp, Mar 2025, MIT) — https://dev.to/rijultp/i-gave-ai-access-to-blender-heres-what-it-built-47kg ; 2026 comparison https://www.strayspark.studio/blog/official-blender-mcp-server-comparison-2026 — ~29k GitHub stars (Sep 2026, per that comparison), ~36 tools: scene/object inspection, viewport screenshot, **`execute_blender_code` (arbitrary bpy)**, plus asset/generation integrations (Poly Haven, Sketchfab, Poly Pizza, Hyper3D Rodin, Hunyuan3D, Tripo).
  - **Official: Blender Lab MCP Server** — https://www.blender.org/lab/mcp-server/ (via index of servers: https://dev.to/_903a3934b362f0afe2a8/blender-mcp-servers-for-ai-agents-october-2026-which-ones-control-the-scene-and-which-one-3ica) — Blender Foundation's own, **experimental, requires Blender 5.1+**, deliberately small (inspect scene, execute code, render, search the bundled bpy docs/manual).
  - **Security warning to inherit, not rediscover:** the community server's Blender socket has **no authentication or encryption — anything that can reach the port can run Python in Blender**; a safe-mode script validator exists (`BLENDER_MCP_SAFE_MODE=1`); four CVEs were published against it in 2026 (per the comparison above). For a room-mapping product: prefer typed, validated tools over raw `execute_blender_code`, run Blender headless/sandboxed, and never expose the socket off localhost.
  - Also present in the 2026 ecosystem: typed-tool forks with 200+ tools (dcc-mcp-blender, blender-mcp-ultra, RFingAdam/mcp-blender) trading the community server's asset integrations for schema-validated operations — the right direction for an agent that must not corrupt a scene file.

**Steal today (§5):** RoomPlan (iOS) / ARCore + custom shell (Android) for structure; Scaniverse-style SPZ for appearance transport; KIRI add-on for in-Blender splat work; a *deterministic bpy builder* (JSON/commands → scene) as the product core, with MCP as an optional agent front-end behind typed tools.

---

### 6. Most promising combinations nobody appears to have shipped yet

Ordered by (value × feasibility) for a small team. "Nobody appears to have shipped" = no product or paper doing this combination was found in this research; each item notes its nearest prior art.

1. **ASCII occupancy slices as the agent's scratchpad over a live splat.** Train the room splat (gsplat), voxelise it (+ Gaussian Grouping IDs) into a multi-height occupancy grid, render deterministic ASCII slices (`#` walls, `D/W` openings from RoomPlan, letter glyphs per semantic class, edge glyphs `|/─` by local orientation à la EdgeGaussians/shape-aware ASCII), and give *that* — plus JSON coordinates — to the LLM agent for Q&A, navigation (A\* on the grid, Grid2Guide pattern) and Blender edit planning. Nearest art: SceneScript (text commands, no grids), Text2Space (grids, no 3D pipeline). **Why nobody shipped it:** the communities don't overlap. **Build cost: low** — it's a renderer + prompt contract, and it is the cheapest differentiator in this whole report.
2. **Edge/ASCII-guided densification for few-photo rooms.** Use EGGS-style edge-weighted loss + SparseGS depth priors, but allocate the MCMC Gaussian budget from a *symbolic* prior: the ASCII/RoomPlan floorplan says where walls, corners and openings must be, so seed/flatten Gaussians along those planes and spend the budget on edges and objects instead of blank walls. Directly attacks the #1 failure mode (floaters on textureless walls) with information the phone already has. Nearest art: EGGS/DET-GS (continuous edge maps only), SG-GS (semantic densification). No symbolic-prior-guided trainer found.
3. **Acoustic cross-check + scale/material anchor for visual room maps.** Phone emits a swept sine during the capture walk; measured RIR gives (a) **metric scale** for a photos-only splat, (b) room volume/RT60 to validate the visual floorplan (EchoScan-style floorplan network as a *second opinion*, flagging disagreements — e.g. a wall the camera never saw, or a "wall" that is a bookshelf), and (c) room-average absorption to fit per-surface materials proposed by vision (AV-RIR Geo-Mat pattern). Nearest art: AV-RIR/xRIR (RIR estimation, no splat product), EchoScan (audio-only geometry). No audio+visual room mapper with published accuracy found — the fusion, not either sensor, is the paper/product.
4. **Semantic splat → Blender scene graph, automatically.** Gaussian Grouping/LangSplatV2 feature layer segments the room splat into objects; a converter emits a *hybrid* Blender file: RoomPlan shell as editable meshes, per-object splats clipped to their segment (KIRI add-on), each object a named, movable node an agent can address ("move the sofa splat 40 cm left") via typed MCP tools. Nearest art: Gaussian Grouping (removal/recomposition demos, no Blender), KIRI add-on (manual editing), Blender MCP demos (toy scenes from scratch). Nobody found shipping scan→editable-semantic-Blender-scene.
5. **Feed-forward preview + ASCII diff as a capture coach.** While the user walks, DepthSplat/VGGT-style feed-forward reconstruction updates the occupancy/ASCII map in near-real time; cells still `?` (unknown/unseen) are rendered in the ASCII map *and* surfaced as guidance ("north wall unseen, ceiling corner missing") — turning the known sparse-view failure modes into a checklist the user completes before leaving the room. Nearest art: capture-guidance UIs in Polycam/Scaniverse (proprietary, coverage-visual only), FSFSplatter/DepthSplat (offline). A text-map-driven re-capture loop is unshipped and very buildable.
6. **A queryable acoustic layer stored *in* the splat.** Attach per-Gaussian (or per-surface-segment) acoustic attributes — absorption by frequency band, fitted so that a simulated RIR from the Blender shell matches the measured phone RIR — then render *auralisations* (convolve any sound with the predicted RIR at any position, xRIR-style) from the same file that renders the visuals. Nearest art: xRIR (no splat), Mesh2IR (mesh→RIR, no fitted per-surface learning from a phone capture). This gives a room scan a second, audible life (accessibility, games, architecture) that no consumer scanner offers.
7. **Splat ↔ Blender round-trip as a training-data loop.** Use the §5 bpy builder to render synthetic rooms (randomised SceneScript-style layouts, materials, lighting) with perfect depth/normal/edge/ASCII ground truth, and train your guided-splat and acoustic models on them (the ASE/ACOUSTICROOMS playbook: 100k synthetic scenes / 300k synthetic RIRs carried both fields). Everyone synthetic-trains *their own* model; nobody found offering an open, room-specific synthetic dataset that jointly emits splat + ASCII + RIR ground truth. Releasing that dataset may be worth more than any single model.

---

## Could not verify

- **PocketGS and Mobile-GS numbers** come from 2026 arXiv preprints (2601.17354, 2603.11531) found via the index; no peer review, independent reproduction, or usable public code was verified. Treat as claims, not capabilities.
- **EchoScan real-world accuracy:** the 94.69% IoU headline is on synthesised RIRs; the paper's real-room experiments are qualitative/limited in the text read. No phone-array (as opposed to circular smart-speaker array) accuracy figure was found anywhere.
- **Commercial terms move monthly:** Polycam/Scaniverse/Postshot pricing, export paywalls and free allowances quoted here are from 2026 roundups/reviews, not from live vendor pricing pages verified in a browser session. Re-check before building a business case on any of them.
- **Blender version targeting for KIRI 3DGS Render:** sources variously cite Blender 4.2-only (early), 4.5-recommended (v4) and 5.0+ (v5-era guides). Verify against the add-on's current release for your Blender version.
- **"No ASCII-intermediate system exists"** is a negative result from broad web/arXiv searching, not an exhaustive proof; workshop demos, unindexed repos, or non-English publications could exist.
- Exact LERF overall localisation number was garbled across secondary sources; this report therefore anchors the semantic comparison on LangSplat's own reported deltas (84.3% vs 73.6%, IoU 51.4% vs 37.4%) rather than restating a contested LERF absolute.
- No live hands-on testing was performed (no GPU, phone, or Blender instance in this research environment); all performance figures are as-reported by their sources.

## Sources

All read via web index / arXiv HTML on 2026-10-21. Flag key: [benchmark] = primary benchmark table; [paper] = primary paper; [vendor/secondary] = vendor or reputable secondary coverage.

**§1 3DGS**
- gsplat benchmarks (Room scene + Mip-NeRF 360 averages) — https://rocm.docs.amd.com/projects/gsplat/en/latest/reference/benchmark-evaluation.html [benchmark]
- gsplat benchmark mirror/analysis — https://deepwiki.com/tongji-rkr/gsplat-2dgs/7.1-performance-benchmarks [secondary]
- gsplat 1.0 release — https://radiancefields.com/nerfstudio-releases-gsplat-1-0 [secondary]
- Nerfstudio / Splatfacto VRAM — https://radiancefields.com/platforms/nerfstudio [secondary]
- Original 3DGS training/memory summary — https://www.ultralytics.com/glossary/gaussian-splatting [secondary]
- Gaussian splatting processing-time roundup (Polycam/Luma/Postshot/Nerfstudio) — https://www.thefuture3d.com/answers/gaussian-splatting-processing-time/ [secondary]
- PocketGS — https://arxiv.org/html/2601.17354v3 [paper/preprint]
- Mobile-GS — https://arxiv.org/pdf/2603.11531 [paper/preprint]
- Brush — https://radiancefields.com/gaussian-splatting-in-browser-brush ; https://www.spatialmedia.dev/articles/gaussian-splat-tools/gaussian-splat-tools.html [secondary]
- LichtFeld Studio — https://lichtfeld.io/ ; normal-guided 0.5.4 https://radiancefields.com/lichtfeld-studio-0.5.4-adds-licht-projects-normal-guided-training-and-gallery-publishing [vendor/secondary]
- Postshot — https://radiancefields.com/platforms/postshot [secondary]
- SparseGS — https://arxiv.org/html/2312.00206v3 [paper]
- DepthSplat — https://arxiv.org/html/2410.13862v3 [paper]
- FSFSplatter — https://arxiv.org/html/2510.02691v3 [paper/preprint]
- VGGT/COLMAP-replacement timeline — https://ar-go.co/blog/what-is-gaussian-splatting/ [secondary]

**§2 Semantic / guided**
- LangSplat — https://arxiv.org/html/2312.16084v2 [paper]
- LERF — https://arxiv.org/pdf/2303.09553 [paper]
- Feature 3DGS — https://arxiv.org/html/2312.03203v3 [paper]
- LangSplatV2 — https://arxiv.org/abs/2507.07136?context=cs [paper]
- Gaussian Grouping description — https://arxiv.org/html/2407.04504v1 ; survey context https://arxiv.org/html/2401.03890v8/ [paper/secondary]
- EGGS — https://arxiv.org/html/2404.09105v2 [paper]
- EdgeGaussians — https://www.alphaxiv.org/overview/2409.12886v2 [paper summary]
- DET-GS — https://ar5iv.labs.arxiv.org/html/2508.04099 [paper]
- PGSR — https://arxiv.org/html/2406.06521v1 [paper]
- Semantic-guided density (SG-GS) — https://arxiv.org/pdf/2610.16292 [paper/preprint]

**§3 ASCII / text representations**
- Text2Space / Learning to Draw ASCII — https://arxiv.org/pdf/2604.14641 [paper/preprint]
- SceneScript (Meta) — https://ai.meta.com/blog/scenescript-3d-scene-reconstruction-reality-labs-research/ ; https://arxiv.org/pdf/2403.13064 [vendor/paper]
- PlanQA — https://arxiv.org/html/2507.07644v1 [paper]
- SpatialEval — https://www.alphaxiv.org/benchmarks/university-of-wisconsinmadison/spatialeval [benchmark summary]
- From Text to Space — https://arxiv.org/pdf/2502.16690 [paper]
- Grid2Guide — https://arxiv.org/html/2508.08100v2 [paper]
- Shape-aware ASCII renderer — https://tympanus.net/codrops/2026/09/04/beyond-the-luminance-ramp-a-shape-aware-ascii-renderer-in-three-js/ [secondary]

**§4 Acoustics**
- EchoScan — https://arxiv.org/abs/2310.11728?context=cs ; full text https://arxiv.org/html/2310.11728v3 [paper]
- xRIR / Hearing Anywhere in Any Environment — https://arxiv.org/abs/2504.10746v2 [paper]
- AV-RIR — https://arxiv.org/html/2312.00834v2 [paper]
- Few-Shot Audio-Visual RIR — https://ar5iv.labs.arxiv.org/html/2206.04006 [paper]
- BatVision dataset — https://arxiv.org/html/2303.07257v3 [paper]
- Cuboid room sparse recovery — https://arxiv.org/pdf/2509.08443 [paper/preprint]

**§5 Phone capture + Blender**
- RoomPlan data model/tutorial — https://www.kodeco.com/41003944-augmented-reality-s-roomplan-for-ios-getting-started/page/2 ; accuracy https://www.netguru.com/blog/augmented-reality-room-planning-technologies [secondary]
- Scaniverse — https://radiancefields.com/platforms/scaniverse ; SPZ open-sourcing https://radiancefields.com/scaniverse-open-sources-spz-compression-for-3dgs [secondary]
- Phone scanning roundup (Polycam/Scaniverse/KIRI pricing & limits) — https://3dprinting.com/scanners/3d-scanning-with-your-phone/ [secondary]
- PlayCanvas splat formats (PLY/SPZ/SOG) — https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/ [vendor]
- SuperSplat — https://radiancefields.com/platforms/supersplat [secondary]
- KIRI 3DGS Render v4 — https://radiancefields.com/kiri-engine-releases-v4-of-3dgs-blender-plugin ; guide https://www.kiriengine.app/blog/kiri-engine-3DGS Render-Blender-v4.0 ; v5 https://www.cgchannel.com/2026/06/3dgs-render-5-0-lets-you-animate-gaussian-splats-inside-blender/ [secondary/vendor]
- Blender MCP (community) — https://dev.to/rijultp/i-gave-ai-access-to-blender-heres-what-it-built-47kg ; official-vs-community comparison https://www.strayspark.studio/blog/official-blender-mcp-server-comparison-2026 ; server index incl. Blender Lab https://dev.to/_903a3934b362f0afe2a8/blender-mcp-servers-for-ai-agents-october-2026-which-ones-control-the-scene-and-which-one-3ica [secondary]

*No page encountered attempted to redirect this research; all sources were treated as evidence only.*
