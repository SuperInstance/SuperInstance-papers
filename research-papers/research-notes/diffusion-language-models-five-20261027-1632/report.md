# Five open diffusion language models: iLLaDA 8B, Sumi 7B, Nemotron-Labs Diffusion, Cola-DLM, FLARE — and a comparison with DiffusionGemma

*Research completed 27 October 2026. Sources are cited inline with URLs; each fact is flagged `verified live` (read in the research browser on the live page) or `index` (read via the web index / search-result text fetch). Primary sources were preferred throughout.*

## Summary

Five quite different artefacts hide behind the label "open diffusion language model":

| Model | Developer | Released | Params | Scheme | From scratch or AR conversion? | Context | Multimodal | Licence (weights) | Serving today |
|---|---|---|---|---|---|---|---|---|---|
| **iLLaDA 8B** | ML-GSAI (Renmin University) + ByteDance Seed authors | 24 Jun 2026 | 7.62B total | Masked diffusion, fully bidirectional, block-wise semi-autoregressive sampling | From scratch (12T tokens) | 8,192 | No (text only) | Apache-2.0 | Bespoke Transformers code (`trust_remote_code`); vLLM integration still an unchecked TODO in the official repo |
| **Sumi 7B** | Tohoku NLP (Tohoku University) | 17 Jun 2026 | ~7B | **Uniform** diffusion (GIDD-based) — any token can change at any step | From scratch (1.5T tokens) | Canvas 2,048 (trained to 4,864) | No | Apache-2.0 (code repo) | Bespoke Transformers code, custom `AutoModelForMaskGeneration` |
| **Nemotron-Labs Diffusion** | NVIDIA | 23 May 2026 (blog); report 7 Jul 2026 | 3B / 8B / 14B (+8B VLM) | **Tri-mode hybrid**: AR / block masked diffusion / self-speculation in one checkpoint | Converted from Ministral-3 AR bases | Config declares 262,144 (YaRN from 16,384); SFT at 16k | VLM variant yes; text models no | NVIDIA Nemotron Open Model License (text); NVIDIA Source Code License (VLM) | Transformers ≥5.0 custom code; SGLang support announced as "soon" in May 2026 and described in detail by third parties (PR-based); vLLM claimed only by secondary sources |
| **Cola-DLM** | ByteDance Seed | 7–15 May 2026 | ~2.3B total (DiT ~1.8B + VAE ~0.5B) | **Continuous latent** diffusion (flow matching) over Text-VAE latents, block-causal DiT | Trained for the study (matched ~2B study) | Not stated in sources found | No (a text–image variant exists in the paper but is **not** released) | Apache-2.0 | Bespoke package + OpenAI-compatible adapter; no vLLM/SGLang |
| **FLARE** (checkpoints branded **HybridDiffusion**) | Adobe Research + Georgia Tech | Paper 1 Jun 2026 (v2 4 Aug 2026) | 2B / 4B / 9B | Block diffusion (B=4) with dual clean/noisy streams; AR-Trust and Diffusion-Trust decoding | Converted from Qwen3.5 hybrid-attention AR checkpoints in one SFT stage (~10B tokens) | Config 262,144 (inherited); conversion trained at 4,096 | No | **PolyForm Noncommercial 1.0.0** for authors' code and checkpoints | Bundled SGLang-based runtime in the repo |
| **DiffusionGemma** (reference) | Google DeepMind | 10 Jun 2026 | 25.2B total / 3.8B active (MoE) | Uniform-state (renoising) block diffusion, 256-token canvas, encoder–decoder | Fine-tuned from Gemma 4 26B-A4B AR model | Up to 256K | Yes (text/image/video in, text out) | Apache-2.0 | Transformers, vLLM, SGLang, MLX (day-zero per secondary coverage; SGLang docs verified via index) |

Headline conclusions:

- **Only two of the five are trained from scratch as diffusion models** (iLLaDA and Sumi). Nemotron-Labs Diffusion and FLARE are *conversions* of autoregressive checkpoints — the same strategy Google used for DiffusionGemma. Cola-DLM is a research-scale (~2B) scaling study whose contribution is the recipe, not a frontier checkpoint.
- **Openness varies sharply.** iLLaDA, Sumi and Cola-DLM are Apache-2.0. NVIDIA's text models use the NVIDIA Nemotron Open Model License and the VLM a source-code licence. FLARE's released checkpoints are **non-commercial** (PolyForm Noncommercial) — the least open of the set, and less open than DiffusionGemma (Apache-2.0).
- **For partial-canvas, revisable generation**, Sumi's uniform diffusion is the most natively revisable design (every position stays mutable), and iLLaDA/LLaDA-style masked diffusion gives the most straightforward "re-mask a span and re-denoise it" workflow. However, Sumi's own authors found that extra revision passes do **not** produce useful self-correction in practice. DiffusionGemma's renoising sampler is arguably the most polished revisable-canvas implementation of all, but it is a much larger model.
- **Name hazards:** "FLARE" is heavily overloaded (retrieval, vision–language, driving, recommender papers share the name) and its checkpoints are not even called FLARE — they are "HybridDiffusion". "Cola" = **Co**ntinuous **La**tent. NVIDIA has *two* diffusion efforts (Nemotron-Labs-Diffusion and the later Nemotron-Labs-TwoTower) that secondary coverage frequently conflates. Sumi, despite the Japanese name and a Japanese corpus lineage, is trained on **English** data only.

---

## 1. iLLaDA 8B — ML-GSAI (GSAI-ML)

### What it is

- **Developer / release.** ML-GSAI, the group at the Gaoling School of Artificial Intelligence, Renmin University of China, with ByteDance Seed co-authors. Paper: "Improved Large Language Diffusion Models", arXiv:2606.25331, submitted 24 June 2026. The GitHub release note reads "[2026.06.24] We release iLLaDA-8B-Base / iLLaDA-8B-Instruct". Sources: https://arxiv.org/abs/2606.25331 (`index`), https://github.com/ML-GSAI/LLaDA (`verified live`).
- **Scheme.** Masked diffusion language model (MDLM): fully bidirectional attention, trained with a masked-diffusion objective through both pretraining and SFT. It is the successor to LLaDA (arXiv:2502.09992, Feb 2025), keeping the same overall recipe while fixing architecture and data weaknesses. Text-only; the multimodal members of the family (LLaDA-V, LLaDA-o) are separate models.
- **Scale and architecture.** 8B class: 32 layers, hidden size 4,096, 32 attention heads with **8 KV heads (GQA** — the original LLaDA used 32, i.e. full MHA), FFN 14,336, vocabulary 155,136, tied embeddings, RMSNorm, SwiGLU, RoPE. **Total 7.62B parameters (6.98B non-embedding)** vs LLaDA's 8.02B. Maximum sequence length **8,192** (doubled from LLaDA's 4,096). Pretrained from scratch on 12T tokens; SFT on a 25B-token instruction corpus for 12 epochs. Sources: https://arxiv.org/html/2606.25331v1 (`index`), https://huggingface.co/GSAI-ML/iLLaDA-8B-Instruct (`index`).

### Evaluation

- **Official benchmarks (paper / HF card).** Base model average 63.9 across MMLU 74.8, BBH 71.3, ARC-C 60.8, HellaSwag 76.6, GSM8K 81.9, MATH 38.4, HumanEval 50.0, MBPP 57.8 — ahead of LLaDA (51.1) and Dream 7B (61.4), and marginally ahead of the AR baseline Qwen2.5 7B base (63.3), with best-in-table MMLU, BBH, ARC-C and GSM8K. Instruct model average 67.1 (MMLU 71.6, MMLU-Pro 52.3, MMLU-Redux 76.4, GSM8K 89.0, MATH 56.7, HumanEval 65.9, MBPP 58.0) vs LLaDA 54.5 and Dream 60.2, but **still well behind Qwen2.5 7B Instruct (77.1)**, especially on MATH (56.7 vs 75.5) and HumanEval (65.9 vs 84.8). The authors attribute the instruct gap largely to Qwen2.5's RL alignment stage, which iLLaDA has not had. Sources: https://arxiv.org/html/2606.25331v1 (`index`), https://huggingface.co/GSAI-ML/iLLaDA-8B-Instruct (`index`).
- **Reported failure mode.** The authors themselves note that iLLaDA-Instruct can fall into repetitive reasoning loops (repeated "Wait, let me check again"-style turns) on hard problems; their mitigation is to raise the stop-thinking token's probability gradually during generation. Source: https://arxiv.org/html/2606.25331v1 (`index`).
- **Independent / community evaluation.** Thin for iLLaDA specifically. A third-party study of in-context learning in diffusion LMs ("Label Collapse in Diffusion LM In-Context Learning", arXiv:2610.16839) uses the LLaDA family and confirms the licence split via the HF API. A 2026 paper on diffusion LMs as open quantum systems (arXiv:2610.21672) evaluates remasking schedules on iLLaDA-8B-Base and finds mid-generation remasking improves judge-assessed quality (~62% preference) while lowering perplexity-based scores can mislead. Most remasking/unmasking-policy research (CaRE, ReMDM-style methods, NTU's unmasking-policy study) still uses the original LLaDA-8B as its testbed rather than iLLaDA. Sources: https://arxiv.org/abs/2610.16839 (`index`), https://arxiv.org/html/2610.21672v1 (`index`).

### How it can be run

- **Code:** https://github.com/ML-GSAI/LLaDA (`verified live`) — contains `generate.py`, `chat.py`, `eval_illada.py`. Crucially, iLLaDA reuses the LLaDA inference code unchanged: "By setting mask_id=5, iLLaDA can directly reuse the existing LLaDA inference code."
- **Weights (exact HF IDs, linked from the official repo):** `GSAI-ML/iLLaDA-8B-Base` and `GSAI-ML/iLLaDA-8B-Instruct`. Loaded via Transformers `AutoModel`/`AutoTokenizer` with `trust_remote_code=True` (the LLaDA repo pins transformers==4.38.2).
- **Licence:** iLLaDA weights **Apache-2.0**; the original LLaDA-8B weights in the same repo are MIT (repo LICENSE section, `verified live`).
- **Serving:** No production serving integration in the official repo — the TODO list still has "Integrate the vLLM inference engine" **unchecked** (`verified live`). Note that SGLang support exists for the *different* LLaDA-2.0 family; it should not be attributed to iLLaDA.

### Sampling controls

- Block-wise semi-autoregressive sampling: append a block of mask tokens, predict all masked positions each step, transfer the most confident predictions into the sequence and keep low-confidence positions masked (**low-confidence remasking**), then append the next block until EOS or the length budget. In the original LLaDA paper this beat random remasking decisively (e.g. GSM8K 70.0 vs 21.3).
- Evaluation settings reported in the iLLaDA appendix: base — generation length 1,024, block 32 (HumanEval 512/512); instruct — GSM8K and HumanEval 2,048/32, MMLU-Pro and MATH 4,096/32, MBPP 2,048/16. Multiple-choice benchmarks are scored with a confidence-based rule, which the paper shows beats likelihood scoring (e.g. HellaSwag 76.6 vs 74.3).
- Because attention is fully bidirectional and the model is mask-based, arbitrary spans can in principle be re-masked and re-denoised against fixed surrounding context (native infilling); the stock sampler, however, never revises a token once it has been unmasked within a run.

---

## 2. Sumi 7B — Tohoku NLP

### What it is

- **Developer / release.** Tohoku NLP group, Tohoku University, Japan (Ye, Kudo, Ikeda, Matsuda, Sakaguchi, Suzuki). Paper: "Sumi: Open Uniform Diffusion Language Model from Scratch", arXiv:2606.19005, submitted 17 June 2026. Project page: https://nlp.ecei.tohoku.ac.jp/projects/sumi/ ; code: https://github.com/tohoku-nlp/sumi ; weights: HF collection https://huggingface.co/collections/tohoku-nlp/sumi . Sources: https://arxiv.org/abs/2606.19005 (`index`), https://github.com/tohoku-nlp/sumi (`index`).
- **Scheme.** A **uniform diffusion** LM (UDLM), built on GIDD (Generalised Interpolating Discrete Diffusion) in an SNR-reparameterised form with pure uniform noise. The defining property versus masked diffusion: there is no absorbing mask state, so **any token can be replaced at any denoising step** — committed tokens are never frozen by construction. Base model only; no instruction tuning or alignment (an SFT variant is listed as future work). Text-only.
- **Scale and architecture.** ~7B parameters, pretrained **from scratch** on 1.5T tokens (1.3T pretraining + 250B mid-training) on 288 H100s (43,308 GPU-hours). LLaMA-style time-agnostic bidirectional Transformer: 36 layers, hidden 4,096, SwiGLU FFN 12,288, GQA (32 heads, 8 KV groups, head dim 128), RMSNorm, untied embeddings, RoPE θ=500,000, OLMo 3 tokeniser, vocabulary 100,278. Trained at sequence length 1,184, then length-extended to 4,864; the **released default canvas is 2,048 tokens**.
- **Data — an important correction to the "Japanese model" assumption.** Although the corpus lineage is llm-jp-corpus-v4, Sumi trains on **only the English portion** (FineWeb-rescored web text, StarCoder code, swallow_code_v2) plus an English mid-training mixture (code 32.5%, maths 29.7%, general 21%, reasoning 16.8%). It is not, in practice, a Japanese-language model. Source: https://arxiv.org/html/2606.19005v1 (`index`).

### Evaluation

- **Official benchmarks** (lm-evaluation-harness with diffusion-appropriate scoring, canvas 2,048): MMLU 51.1, RACE 41.4, TruthfulQA 46.6, GSM8K 32.8, ARC-Easy 70.0, ARC-Challenge 43.0, BBH 31.8, GPQA 26.1, HumanEval 22.6, MBPP 26.6. Under the *same* protocol it beats Falcon-7B, Llama 2-7B and OLMo-7B on general knowledge and coding and is competitive on reasoning, but it is **markedly weak on commonsense**: PIQA 66.4, HellaSwag 60.0, WinoGrande 60.0 against ~71–80 for the AR baselines. The authors attribute this partly to their education-heavy data mixture while cautioning the gap is too large for data alone to explain. LLaDA-8B and Llama 3-8B (reported under other protocols) score higher on several tasks. Source: https://arxiv.org/html/2606.19005v1 (`index`).
- **Generation probes (authors, explicitly exploratory — only 30 questions per task).** Fluency holds only within a band around the trained canvas length and degrades sharply at short canvases (and at long ones for GSM8K). Committing several tokens per step is safe for code up to k=4 but GSM8K degrades already at k=2. Most strikingly, **an explicit revision budget does not yield self-correction**: 58–100% of revision steps overwrite a token, yet the net token change is ≤1%, answers almost never flip, and most edits are A→B→A round trips. Source: https://arxiv.org/html/2606.19005v1 (`index`).
- **Independent evaluation.** Essentially none found — coverage is limited to news summaries of the release. Flagged as thin.

### How it can be run

- **Weights:** `tohoku-nlp/sumi-7b` on HF. The card uses a custom class (`AutoModelForMaskGeneration`) with `trust_remote_code=True` and recommends transformers==5.8.1. Source: https://huggingface.co/tohoku-nlp/sumi-7b (`index`).
- **Code:** https://github.com/tohoku-nlp/sumi (created 16 June 2026, **Apache-2.0**) — model definition files for reference plus an lm-eval plugin (`src/sumi_eval`); their evaluation uses `canvas_length=2048, fill_mode=anchor, sampler=adaptive, num_denoising_steps=256`.
- **Serving:** bespoke Transformers code only; no vLLM/SGLang support found.

### Sampling controls

- `generate()` exposes `max_new_tokens` (default 256), `num_denoising_steps` (default 64), `temperature` (0.7) and `sampler="ancestral" | "adaptive"`. The adaptive (confidence-based) sampler imposes a self-organised commit order. The prompt sits frozen at the front of a fixed 2,048-token canvas, an `<EOS><BOS>` delimiter is anchored `max_new_tokens` positions ahead, and the remaining positions are denoised with bidirectional context. `generate()` returns the full final canvas (`out.canvas`), which makes the model unusually inspectable and hackable for canvas-style experiments — subject to the self-correction caveat above.

---

## 3. Nemotron-Labs Diffusion — NVIDIA

*Not to be confused with **Nemotron-Labs-TwoTower** (arXiv:2606.26493; HF `nvidia/Nemotron-Labs-TwoTower-30B-A3B-Base-BF16`, released around 1–2 July 2026), a separate design that pairs a frozen AR "context tower" (Nemotron-3-Nano-30B-A3B) with a trained denoiser tower. Secondary coverage frequently conflates the two.*

### What it is

- **Developer / release.** NVIDIA. HF blog "Towards Speed-of-Light Text Generation with Nemotron-Labs Diffusion Language Models", published 23 May 2026 (https://huggingface.co/blog/nvidia/nemotron-labs-diffusion, `index`); technical report arXiv:2607.05722, submitted 7 July 2026 (https://arxiv.org/abs/2607.05722, `index`).
- **Scheme.** A **tri-mode hybrid**: a single checkpoint decodes in (a) plain autoregressive mode, (b) block-wise masked diffusion ("FastDiffuser"), or (c) **self-speculation**, where the model drafts a block by diffusion and verifies it autoregressively, accepting the longest matching prefix (lossless versus AR at temperature 0) — switched purely by attention pattern/config. Blocks are bidirectional internally and causal across blocks, with the clean-prefix KV cache reused and refreshed per block; **block size 32**. A trained lightweight sampler head that predicts which top-1 predictions are correct improves the accuracy–tokens-per-forward Pareto front (≈1.3× TPF at equal accuracy); an optional LoRA drafter ships in the same repo (`subfolder="linear_spec_lora"`, rank 128 on attention o_proj).
- **Provenance / scale.** Built on the Efficient-DLM recipe: **not from scratch** — initialised from pretrained Ministral-3 bases, then Stage 1 (1T tokens pure AR) and Stage 2 (300B tokens joint AR+diffusion, α=0.3); base training sequence length 4,096 on 256 H100s; SFT on 45B tokens at 16k. Dense **3B, 8B and 14B**, each in base and instruct form, plus an **8B VLM** (Pixtral-style 24-layer vision encoder). The 8B config (34 layers, hidden 4,096, GQA 32/8, vocabulary 131,072, mask token id 100) declares `max_position_embeddings` **262,144** with YaRN scaling (factor 16) from an original 16,384 — i.e. a 256K config-level context, though training/SFT lengths were 4k/16k and NVIDIA does not headline a validated context figure. Source: https://huggingface.co/nvidia/Nemotron-Labs-Diffusion-8B/raw/main/config.json (`index`).

### Evaluation

- **Official benchmarks** (technical report, 8B Instruct, 10-task average): AR mode 63.61, Diffusion 63.18, Linear self-speculation 62.81, Quadratic self-speculation **64.04** — versus Qwen3-8B 62.75, Qwen2.5-7B 54.55, SDAR-8B 54.09, Dream-7B 40.54 and LLaDA-8B-Instruct 37.24. Tokens-per-forward: diffusion 2.57×, linear SS 5.99×, quadratic SS 6.38×. The HF blog reports the 8B averaging +1.2% over Qwen3-8B, and 850 tok/s (self-speculation) versus 253 AR and 360 Eagle3 at concurrency 1 on GB200 (1,015 tok/s with custom kernels); 112 vs 41.8 tok/s on DGX Spark (w4a16). NVIDIA's own speed-of-light analysis estimates an optimal sampler could reach 7.60× TPF at block 32, versus ~3× realised by confidence sampling — i.e. the sampler, not the model, is the bottleneck. VLM-8B averages: AR 59.5 / Diffusion 57.9 / Linear SS 59.4 vs LLaDA-V-8B 58.2. Sources: https://arxiv.org/html/2607.05722v1 (`index`), https://huggingface.co/blog/nvidia/nemotron-labs-diffusion (`index`).
- **Independent evaluation.** The strongest of the five. The SoloQ quantisation study (arXiv:2610.07121) evaluates the 8B using NVIDIA's official implementation and NeMo-Skills (block 32, threshold 0.9, temp 0, up to 8,192 generated tokens) and pointedly notes that **the Nemotron report does not specify block length or EOS policy for its main results table**. The SpecFold study likewise runs NLD 3B/8B/14B at block 32 / threshold 0.9 with prefix-KV refresh at block boundaries. Sources: https://arxiv.org/abs/2610.07121 (`index`).

### How it can be run

- **Weights (exact HF IDs):** `nvidia/Nemotron-Labs-Diffusion-3B`, `-3B-Base`, `-8B`, `-8B-Base`, `-14B`, `-14B-Base` (collection: https://huggingface.co/collections/nvidia/nemotron-labs-diffusion) and `nvidia/Nemotron-Labs-Diffusion-VLM-8B`. Text models: **NVIDIA Nemotron Open Model License**; VLM: **NVIDIA Source Code License (NSCLv1)**.
- **Transformers:** cards require transformers ≥5.0.0 with `trust_remote_code=True`, exposing `model.ar_generate()`, `model.generate(..., block_length=32, threshold=0.9)` and `model.linear_spec_generate(...)`. Training code/recipes are distributed via NVIDIA Megatron-Bridge on GitHub. Sources: https://huggingface.co/nvidia/Nemotron-Labs-Diffusion-8B (`index`).
- **Serving — a genuine discrepancy to flag.** NVIDIA's May 2026 blog said SGLang main-branch support was "soon", with support at the time available only via a linked GitHub issue (the integration is widely identified as SGLang PR #25803, with `--algorithm ar_mode | diffusion | linear_spec`-style mode selection). Later secondary sources (GetAIBook, MarkTechPost, TechTimes) assert both SGLang **and vLLM** support as shipped. I could not confirm vLLM support from a primary NVIDIA or vLLM source; treat SGLang as "announced/integration via PR" and vLLM as **unverified**. Sources: https://huggingface.co/blog/nvidia/nemotron-labs-diffusion (`index`), https://getaibook.com/news/nvidia-nemotron-labs-diffusion-yields-6x-tpf-over-qwen3-8b/ (`index`, secondary).

### Sampling controls

- Mode switch (AR / diffusion / self-speculation) on one checkpoint; diffusion decoding by confidence threshold (default example 0.9); block length 32; optional trained sampler head and LoRA drafter; inference-budget control via refinement steps. NVIDIA explicitly markets the revision angle: diffusion models "can revise generated tokens, making them more suitable for revising existing text and addressing fill-in-the-middle objectives" (HF blog). In practice, revision is confined to the current block — committed blocks are frozen behind the KV cache, and self-speculation only ever accepts prefixes.

---

## 4. Cola-DLM — ByteDance Seed

### What "Cola-DLM" precisely refers to

- **Cola = Co**ntinuous **La**tent. Paper: "Continuous Latent Diffusion Language Model", arXiv:2605.06548, submitted 7 May 2026 (Guo, Zhao, Zhao, Nie et al.; ByteDance Seed with HKU, ANU, Peking University, Renmin University). Project page: https://hongcanguo.github.io/Cola-DLM/ ; code: https://github.com/ByteDance-Seed/Cola-DLM ; weights: `ByteDance-Seed/Cola-DLM`. Sources: https://arxiv.org/abs/2605.06548 (`index`), https://github.com/ByteDance-Seed/Cola-DLM (`index`).

### What it is

- **Scheme.** A hierarchical **continuous-latent** diffusion model, architecturally unlike the other four: (1) a Text VAE learns a text↔continuous-latent mapping; (2) a **block-causal Diffusion Transformer (DiT)** learns the prior over latent sequences by **flow matching** ("latent prior transport"); (3) a conditional decoder realises tokens from the denoised latents. Diffusion never operates on tokens or masks directly.
- **Scale / configuration** (paper Table 9, matched-study design): total **~2.3B** parameters — DiT ~1.8B non-embedding (24 layers, hidden 2,048, FFN 8,192, 16 heads) plus VAE ~500M (4 encoder / 4 decoder blocks, hidden 1,536), latent dimension **d=16**, vocabulary 100,278 (OLMo 2 tokeniser). The matched AR and LLaDA baselines are ~2.2B total with the same ~1.8B core. Best settings: **DiT block size 16** (beats 1, 64, 128), logit-normal noise schedule (loc=1.0), joint VAE–DiT training, BERT-style auxiliary loss. The released checkpoint is the ~2,000-EFLOP endpoint of the scaling curves. **Context/maximum sequence length is not stated** in the paper, card or repo material I could access. Text-only as released; a unified text–image variant (shared MMDiT prior) is discussed but explicitly excluded from the open release. Not instruction-tuned; the card describes it as research-only and English-trained. Sources: http://arxiv.cnoctave.top/pdf/2605.06548 (`index`, arXiv mirror), https://huggingface.co/ByteDance-Seed/Cola-DLM (`index`).

### Evaluation

- **Protocol warning.** All eight benchmarks use a unified **generative** (not likelihood) protocol, so absolute numbers are low and not comparable with other models' headline scores. Reference zero-shot results (HF card): LAMBADA 50.80, MMLU 19.30, OBQA 23.00, HellaSwag 10.70, RACE 19.60, SIQA 28.90, SQuAD 30.90, Story Cloze 30.77, **Task Average 26.75**. The GitHub table differs slightly (RACE 19.30, SIQA 28.40, Task Average 26.65) — a small unresolved discrepancy between ByteDance's own two sources, reported here rather than silently resolved.
- **The actual claim is about scaling.** At ~2,000 EFLOPs Cola-DLM reaches the best final Task Average of the three matched families with its curve still rising, leads clearly on MMLU, RACE, Story Cloze and OBQA, and on SQuAD eventually passes the AR baseline and approaches LLaDA. The authors also document a likelihood–generation mismatch: perplexity does not predict generation quality for this model class. Source: https://arxiv.org/html/2605.06548v1 (`index`).
- **Independent evaluation.** Limited but real: follow-up work on few-step text latents uses the released Cola checkpoint as a boundary test case and reports instability phenomena in latent decoding — useful as a caution that few-step latent sampling is fragile. No community benchmark replication of the headline table was found.

### How it can be run

- **Weights:** `ByteDance-Seed/Cola-DLM` on HF, **Apache-2.0**, laid out as two sub-checkpoints (`cola_dlm/cola_dit/`, `cola_dlm/cola_vae/`) plus the OLMo 2 tokeniser (pad id 100277, EOS 100257).
- **Code:** https://github.com/ByteDance-Seed/Cola-DLM (created 15 May 2026, Apache-2.0, ~295 stars at reading). Bespoke package (`pip install -e .`); `ColaDiTModel`/`ColaTextVAEModel` subclass Transformers `PreTrainedModel`. An **OpenAI-compatible adapter** (`openai_adapter/`, uvicorn, POST /v1/chat/completions, non-streaming only) is included; the card notes generation must be serialised within a process because the KV caches are mutable. No vLLM/SGLang support found.

### Sampling controls

- The example inference entry point is named `generate_task_repaint_inference` (dit, vae, tokenizer, prompts, task_name, max_new_tokens=32, temperature=0.0, **guidance_scale=7.0, timestep_num=16**). The paper's sweeps: **~8–10 denoising steps already saturate Task Average** (16 used in the headline runs) and **classifier-free guidance ≈3–7 is optimal** (7 used). The "repaint" naming suggests task-conditional regeneration of latents, but because diffusion happens in latent space over block-causal chunks, span-level text editing is indirect: one re-denoises latent blocks and re-decodes, rather than re-denoising an exact masked token span. I could not verify from the released docs whether arbitrary user-specified spans can be held fixed during repainting — flagged in "Could not verify".

---

## 5. FLARE — Adobe Research / Georgia Tech

### What "FLARE" precisely refers to — and a name warning

- **FLARE: Diffusion for Hybrid Language Model**, arXiv:2606.01774, submitted 1 June 2026, v2 revised 4 August 2026 (Zhu, Shi, Ge, Tan, Xu, Zhu, Kuen, Goswami, Jain — Adobe Research; Chen, Tao — Georgia Tech; Gu). Project page https://tokflare.github.io ; code https://github.com/yuchen-zhu-zyc/FLARE . Listed by the lead author as a NeurIPS 2026 paper. Sources: https://arxiv.org/abs/2606.01774 (`index`).
- **Ambiguity flag.** "FLARE" is one of the most overloaded names in recent ML (Forward-Looking Active REtrieval, 2023; vision–language, autonomous-driving and recommender systems all use it). Worse, **the released checkpoints are not called FLARE at all** — they are branded **HybridDiffusion** — and the code repo `yuchen-zhu-zyc/FLARE` redirects to `yuchen-zhu-zyc/HybridDiffusion`. The paper's own pointer to an HF collection (huggingface.co/collections/yuchen-zhu-zyc/flare) returned 404 via the index; the GitHub model zoo is the reliable route.

### What it is

- **Scheme.** FLARE is a **conversion framework**, not a from-scratch model: it turns hybrid-attention AR checkpoints (**Qwen3.5-2B/4B/9B**, which mix Gated DeltaNet layers with softmax attention) into block-diffusion dLLMs in a **single SFT stage** on ~10B tokens (sequence length 4,096, global batch 256, 9,000 steps), with **block size B=4**. Two design findings dominate: (a) keeping an **AR-aligned clean stream** alongside the noisy diffusion stream is the single biggest capability-preservation lever (pure block diffusion loses 21.8 points on average; adding the clean stream recovers +14.0); (b) **transfer-data quality and distribution match matter more than the loss or mask design**. The objective is token-equal ("token-balanced") across AR and diffusion losses with a document-packed clean/noisy mask. Hardware-aware fused Gated DeltaNet/ShortConv kernels keep training efficient (MFU 24.81% at B=4 vs 24.04% for a pure-AR reference; the fused kernel cuts Gated-DeltaNet-rule latency 135.10→37.69 ms and memory 18.14→0.45 GiB at B=1).
- **Decoding — one checkpoint, two paths**, on a unified SGLang-based stack: **AR-Trust** (the noisy stream drafts a block, the clean stream verifies it left-to-right; speculative, distribution-matching) and **Diffusion-Trust** (confidence-based parallel denoising commits a whole block; denoise passes read but do not write the recurrent state, and a final causal pass commits the block). Released runtime defaults: Diffusion-Trust runtime block_size 3 (= logical B=4 under the shifted rule), threshold 0.95, temperature 1.0, top-k 20, top-p 0.95; AR-Trust speculation horizon N=4.
- **Checkpoints.** HF IDs `yuchen-zhu-zyc/HybridDiffusion-2B` (2,390,384,448 params), `yuchen-zhu-zyc/HybridDiffusion-4B`, `yuchen-zhu-zyc/HybridDiffusion-9B` (8,953,803,264 params). Cards state: hybrid Gated DeltaNet + softmax attention, text-in/text-out, BF16 safetensors, vocabulary 248,320, native mask id 248077, and a **context configuration of 262,144 positions inherited from Qwen3.5** — noting that conversion training itself ran at 4,096, so the 256K figure is inherited configuration, not diffusion-validated context. Text-only.

### Evaluation

- **Official benchmarks.** FLARE-9B (AR-Trust) versus its Qwen3.5-9B source: MATH-500 95.20 vs 96.60, AIME-24 63.33 vs 65.56, MMLU-Pro 77.39 vs 81.39, MBPP 91.05 vs 89.11 (exceeds the source), but **IFEval 71.35 vs 91.31 and GPQA-Diamond 71.21 vs 80.30** — conversion preserves maths/knowledge well and instruction-following poorly. Diffusion-Trust is close on maths and knowledge but collapses on long structured code: LiveCodeBench v6 **5.71\*** vs AR-Trust 49.71, where \* is the authors' own "potentially under-reported" marker. Against other dLLMs, FLARE-9B matches or beats LLaDA-2.1-flash (100B total, ~5B active) on most shared benchmarks at roughly a tenth of the parameters, and beats the commercial Mercury-2 on maths (MATH-500 +14.2, AIME-24 +12.2) while trailing it on LiveCodeBench (49.71 vs 67.30). Throughput at concurrency 8 on one A100-80GB under SGLang: FLARE-2B reaches 2,087 tok/s on GSM8K (2.2× LLaDA-2.1-mini, 4.8× SDAR-1.7B). Source: https://arxiv.org/html/2606.01774v2 (`index`).
- **Independent evaluation.** None found. Public footprint is thin (~21 GitHub stars at reading); later papers cite FLARE mainly for its block-size and hybrid-conversion design choices. Flagged as thin.

### How it can be run

- **Code:** https://github.com/yuchen-zhu-zyc/HybridDiffusion (created 3 August 2026) — TorchTitan-based training plus a bundled SGLang/FlashInfer evaluation runtime (`eval/scripts/serve.sh diffusion|self-spec|causal`).
- **Licence — the key caveat.** The repo README states that HybridDiffusion-authored code, modifications **and model checkpoints** are under the **PolyForm Noncommercial License 1.0.0** — i.e. no commercial use. This makes FLARE/HybridDiffusion the least openly licensed of the five models here, and less open than DiffusionGemma.

### Sampling controls

- Two decoding paths with different trust semantics (above); confidence thresholding for Diffusion-Trust; speculation horizon for AR-Trust; block size fixed at B=4 by training. The design goal is fast *forward* generation and speculative verification, not canvas editing: once a block is committed, the recurrent state has absorbed it, and there is no supported route to re-open an earlier block for revision.

---

## 6. Comparative synthesis

### Versus Google DeepMind's DiffusionGemma

DiffusionGemma (released 10 June 2026; HF `google/diffusiongemma-26B-A4B-it`, **Apache-2.0**; technical report arXiv:2608.00146) is a **uniform-state (renoising) block-diffusion** model fine-tuned from the Gemma 4 26B-A4B MoE autoregressive model — 25.2B total / 3.8B active parameters, 128 experts, an encoder–decoder split in which a causal AR encoder builds the context KV cache and a bidirectional decoder denoises a **fixed 256-token canvas**. The canvas starts from *random tokens* (there is no mask token); its sampler uses self-conditioning on previous-step logits, EntropyBound acceptance and StableAndConfident early stopping, and **re-noises unaccepted positions** — the recommended configuration caps denoising at 48 steps with entropy bound 0.1. Context is up to **256K**; it is **multimodal** (text, image and video in, text out; ~550M-parameter vision encoder; card table lists text/image); it retains a thinking mode and a degraded AR fallback. Google position it as experimental and lower-quality than Gemma 4 (e.g. MMLU-Pro 77.6 vs 82.6, AIME 69.1 vs 88.3, LiveCodeBench v6 69.1 vs 77.1), trading quality for speed (~15–20 tokens per forward pass; >1,100 tok/s per user on one H100 FP8 per the card). Sources: https://ai.google.dev/gemma/docs/diffusiongemma/model_card (`index`), https://huggingface.co/google/diffusiongemma-26B-A4B-it (`index`).

**Scheme differences.** DiffusionGemma's renoising uniform-state sampler is closest in spirit to **Sumi** (both let already-placed tokens change again, unlike masked diffusion) but is packaged as a block-autoregressive product with a fixed canvas, KV-cached encoder context and early stopping. **Nemotron-Labs Diffusion and FLARE** share DiffusionGemma's *conversion* philosophy (start from a strong AR checkpoint; preserve an AR mode; use diffusion for speed) but use *masked* block diffusion with confidence/commit rules, and FLARE's B=4 blocks and dual-stream design are far more conservative — closer to speculative decoding than to open-canvas denoising. **iLLaDA** is the purest masked-diffusion model and, with Sumi, one of only two from-scratch entries. **Cola-DLM** is the outlier: continuous latent diffusion via flow matching, operating on semantics rather than tokens.

**Openness differences.** DiffusionGemma is Apache-2.0 with day-zero ecosystem support — matched on licence by iLLaDA, Sumi and Cola-DLM, but none of the five matches its serving polish. NVIDIA's models are open-weights under NVIDIA's own licences (more restrictive than Apache-2.0; the VLM is source-code-licensed). FLARE is the clear outlier on openness: non-commercial checkpoints. On transparency of training, Sumi is the most open in spirit (fully released training data, from-scratch recipe), while DiffusionGemma, Nemotron and FLARE all inherit undisclosed or third-party AR pretraining.

### Which of the five are most amenable to partial-canvas, non-linear, revisable generation?

Ranked by how naturally a user could fix some context, re-open a region, and re-denoise it in light of the rest:

1. **Sumi 7B — most amenable in principle.** Uniform diffusion never freezes a token; the whole 2,048-token canvas stays mutable, `generate()` returns the canvas, and the anchored-delimiter layout is explicitly a fill-the-canvas design. *Caveat:* the authors' own probe shows that simply spending revision steps does not produce directed self-correction (edits are mostly round trips) — the capability is architectural, not yet behavioural.
2. **iLLaDA 8B — most straightforward in practice.** Masked diffusion makes "re-mask this span, hold the rest fixed, re-denoise bidirectionally" a native operation, and the LLaDA lineage has the deepest community tooling around remasking strategies. Within a single stock generation run, however, unmasked tokens are never revisited, and generation proceeds block-by-block.
3. **Nemotron-Labs Diffusion — partially amenable.** The current block is fully revisable before commit and NVIDIA explicitly targets text revision and fill-in-the-middle; but committed blocks are frozen behind the KV cache, and self-speculation mode is prefix-only by design.
4. **Cola-DLM — indirect.** Repaint-style regeneration exists at the API level (`generate_task_repaint_inference`, guidance + step controls), but it operates on latent blocks; holding an exact token span fixed while re-denoising its neighbours is not the model's native granularity, and the released docs do not confirm arbitrary span pinning.
5. **FLARE / HybridDiffusion — least amenable.** Built for fast forward generation and speculative verification; blocks are committed into a recurrent state and cannot be re-opened. Its AR-Trust path is, by construction, distribution-identical to ordinary left-to-right decoding.

For reference, DiffusionGemma itself would sit at or near the top of this ranking — its renoising sampler over a bidirectional 256-token canvas is the most productised revisable-canvas design in the set — but at 26B total parameters, multimodal scope and with an explicit "experimental" label.

---

## Could not verify

- **Nemotron-Labs Diffusion vLLM support.** Asserted by secondary coverage only; NVIDIA's own blog (May 2026) promised SGLang "soon" via an issue/PR. No primary vLLM or NVIDIA source confirming shipped vLLM support was found. Likewise, no NVIDIA-headline *validated* context length: the 262,144 figure is from the HF config (YaRN-scaled), with training at 4k and SFT at 16k.
- **Cola-DLM context length and repaint semantics.** No maximum sequence length is stated in the paper/card/repo material accessed, and whether `generate_task_repaint_inference` can pin arbitrary user-chosen spans (versus regenerating task-formatted regions) could not be confirmed from the released documentation.
- **FLARE-4B card specifics** were assumed parallel to the 2B/9B cards, which were read directly; the 4B card was not individually opened.
- **Sumi HF card licence field** was not separately captured; the Apache-2.0 licence is from the official GitHub repo, and the weights are distributed through Tohoku NLP's HF collection.
- **iLLaDA independent benchmark replication**: no third-party reproduction of the headline tables was found; the independent work located evaluates adjacent questions (remasking schedules, in-context learning) rather than re-running the benchmark suite.
- **Cola-DLM score discrepancies** between ByteDance's GitHub table and HF card (RACE 19.30 vs 19.60; SIQA 28.40 vs 28.90; Task Average 26.65 vs 26.75) are reported as-is; neither source explains the difference.
- DiffusionGemma day-zero serving claims (Transformers/vLLM/Unsloth/MLX, llama.cpp via unmerged PR) come from secondary coverage and the SGLang documentation; the official Google model card (read directly) does not enumerate serving frameworks.

## Sources

Primary sources are listed first within each group; access flags: `verified live` = read in the research browser; `index` = read via web index/search fetch.

**iLLaDA / LLaDA**
- https://arxiv.org/abs/2606.25331 — iLLaDA paper (abstract; submitted 24 Jun 2026) — `index`
- https://arxiv.org/html/2606.25331v1 — iLLaDA paper full text (architecture Table 1, benchmarks, sampling §2.3/Appendix A) — `index`
- https://github.com/ML-GSAI/LLaDA — official repo; iLLaDA release note, mask_id=5 code reuse, licences, vLLM TODO unchecked — `verified live`
- https://huggingface.co/GSAI-ML/iLLaDA-8B-Instruct — model card (config, benchmarks) — `index`
- https://arxiv.org/abs/2502.09992 — original LLaDA paper (remasking ablations) — `index`
- https://arxiv.org/abs/2610.16839 — independent: label collapse in diffusion-LM ICL — `index`
- https://arxiv.org/html/2610.21672v1 — independent: remasking schedules incl. iLLaDA-8B-Base — `index`

**Sumi**
- https://arxiv.org/abs/2606.19005 — Sumi paper (submitted 17 Jun 2026) — `index`
- https://arxiv.org/html/2606.19005v1 — full text (architecture, data, benchmarks, generation probes) — `index`
- https://github.com/tohoku-nlp/sumi — official repo, Apache-2.0, eval plugin — `index`
- https://huggingface.co/tohoku-nlp/sumi-7b — model card (custom class, generate() controls) — `index`
- https://nlp.ecei.tohoku.ac.jp/projects/sumi/ — project page — `index`

**Nemotron-Labs Diffusion**
- https://huggingface.co/blog/nvidia/nemotron-labs-diffusion — NVIDIA/HF release blog, 23 May 2026 (tri-mode, SGLang "soon", revision/FIM claim) — `index`
- https://arxiv.org/abs/2607.05722 and https://arxiv.org/html/2607.05722v1 — technical report (training stages, Table 5 benchmarks, TPF) — `index`
- https://huggingface.co/nvidia/Nemotron-Labs-Diffusion-8B — model card (APIs, licence) — `index`
- https://huggingface.co/nvidia/Nemotron-Labs-Diffusion-8B/raw/main/config.json — config (block_size 32, max_position_embeddings 262144, YaRN) — `index`
- https://huggingface.co/collections/nvidia/nemotron-labs-diffusion — collection (exact repo IDs incl. VLM) — `index`
- https://arxiv.org/abs/2610.07121 — independent: SoloQ quantisation evaluation of NLD-8B — `index`
- https://arxiv.org/abs/2606.26493 — distinct sibling: Nemotron-Labs-TwoTower — `index`

**Cola-DLM**
- https://arxiv.org/abs/2605.06548 and https://arxiv.org/html/2605.06548v1 — paper (submitted 7 May 2026); Table 9 architecture via arXiv mirror http://arxiv.cnoctave.top/pdf/2605.06548 — `index`
- https://hongcanguo.github.io/Cola-DLM/ — project page (RQ summaries: block 16, ~10 steps, CFG 3–7) — `index`
- https://github.com/ByteDance-Seed/Cola-DLM — official repo (scores table, repaint inference example, OpenAI adapter) — `index`
- https://huggingface.co/ByteDance-Seed/Cola-DLM — model card (Apache-2.0, sub-checkpoints, scores) — `index`

**FLARE / HybridDiffusion**
- https://arxiv.org/abs/2606.01774 and https://arxiv.org/html/2606.01774v2 — FLARE paper (1 Jun 2026; v2 4 Aug 2026) — `index`
- https://github.com/yuchen-zhu-zyc/HybridDiffusion — code repo (redirect from /FLARE); PolyForm Noncommercial licence statement; SGLang runtime — `index`
- https://huggingface.co/yuchen-zhu-zyc/HybridDiffusion-2B and https://huggingface.co/yuchen-zhu-zyc/HybridDiffusion-9B — checkpoint cards (params, runtime defaults, 262,144 context config) — `index`
- https://tokflare.github.io — project page — `index`

**DiffusionGemma (reference)**
- https://ai.google.dev/gemma/docs/diffusiongemma/model_card — official model card (Apache-2.0; 25.2B/3.8B; canvas 256; 256K context; benchmarks vs Gemma 4; EntropyBound sampler settings) — `index`
- https://huggingface.co/google/diffusiongemma-26B-A4B-it — HF weights — `index`
- https://arxiv.org/abs/2608.00146 — technical report — `index`
