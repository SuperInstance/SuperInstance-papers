# Verification addendum — 2026-10-27

Companion to `report.md` in this folder. The report closed with a "Could not verify" list of seven items. Each is worked below against primary sources only — Hugging Face model configs and card metadata via the HF API, the frameworks' own source trees, and the models' official GitHub repositories — checked on 2026-10-27. Verdicts: **VERIFIED** (a primary source settles it, one way or the other), **STILL UNVERIFIED** (no primary source found after the stated effort), **CONTRADICTED** (a primary source settles it against the natural reading).

**Headline: of the seven items, four are fully VERIFIED, two are split (one half settled, one half still open, with one outright CONTRADICTED), and one remains STILL UNVERIFIED.** Counting sub-items individually: 5 verified, 3 still unverified, 1 contradicted.

---

## 1. Nemotron-Labs Diffusion — vLLM support; validated context length

**vLLM support: VERIFIED — there is none in vLLM's primary source.** The model's architecture is `NemotronLabsDiffusionModel` (model_type `nemotron_labs_diffusion`), per its HF `config.json`. vLLM's model registry (`vllm/model_executor/models/registry.py`, main branch, read 2026-10-27) contains no entry for that architecture — its Nemotron entries are the older AR families (`NemotronForCausalLM`, `NemotronHForCausalLM`, NAS and VL variants). The model's own HF card documents exactly one serving route: Transformers ≥ 5.0 with `trust_remote_code=True` (`library_name: transformers`; the card's Environment section lists only `transformers>=5.0.0`). A check of SGLang's model directory (`python/sglang/srt/models`, 258 files) likewise shows no Nemotron-Labs Diffusion implementation; the card's single SGLang mention is a benchmark comparison figure, not a serving claim. The report's caution stands, now on primary evidence: secondary coverage asserting vLLM support is not backed by vLLM, NVIDIA's card, or SGLang.

**Validated context length: STILL UNVERIFIED.** No primary source states a validated or evaluated context length. What exists is configuration arithmetic: `max_position_embeddings: 262144` with YaRN scaling (`factor: 16.0`, `original_max_position_embeddings: 16384`) in the HF config — i.e. a 16,384-position base stretched by a factor of 16. The HF card itself makes no context-length claim at all (the string does not appear in its serving or overview sections). Effort: full text of the HF card read; config read; NVIDIA's release material as cited in the report gives training at 4k and SFT at 16k. Anything beyond "configured for 262,144, rooted at 16,384" remains unattested by NVIDIA.

## 2. Cola-DLM — context length; repaint span-pinning

**Context length: STILL UNVERIFIED as a published specification.** The DiT sub-checkpoint's config (`cola_dlm/cola_dit/config.json` on HF) contains **no `max_position_embeddings` field at all** — there is no configured cap to read. The official GitHub repo's SFT script takes `--max-seq-len` with a default of **512**, but that is a training-script default, not a model limit, and must not be quoted as one. The inference code is written in a no-padding variable-length form and imposes no maximum in code. Effort: HF file tree and both sub-checkpoint configs read; official repo cloned and searched (`max_position`, `max_seq`, `max_len`). No maximum sequence length is stated in any primary source found.

**Span-pinning in repaint: CONTRADICTED.** The report could not confirm whether `generate_task_repaint_inference` can pin arbitrary user-chosen spans. The released source (`cola_dlm/inference.py`, official repo) settles it: the function's signature takes `prompts`, a `task_name`, and sampling parameters — there is no mask, span, or fixed-region argument. Its documented algorithm is forward-only: (1) encode the prompt prefix and write it into the KV cache, (2) generate latent blocks one at a time, each **committed** to the cache, (3) decode. The only thing held fixed is the prompt prefix; already-generated blocks are not re-opened, and no mechanism exists to hold a mid-sequence span constant while regenerating its neighbours. Arbitrary span pinning is not merely undocumented — the released implementation has no route to it.

## 3. FLARE-4B card specifics

**VERIFIED — the 4B card was opened directly, and it is parallel to the 2B/9B cards as the report assumed.** From the HF API and the raw config for `yuchen-zhu-zyc/HybridDiffusion-4B`:

- Licence: `other`, `license_name: polyform-noncommercial-1.0.0` — the same PolyForm Noncommercial terms as its siblings.
- Base model: `Qwen/Qwen3.5-4B`; `library_name: sglang`; pipeline text-generation.
- Architecture `Qwen3_5DLLMForConditionalGeneration` (model_type `qwen3_5`); text config: 32 layers, hidden 2560, vocabulary 248,320.
- `max_position_embeddings: 262144` — the same inherited 262,144-position configuration as the 2B and 9B cards.
- Weights: two BF16 safetensors shards totalling 9,682,956,792 bytes, consistent with a 4B-parameter checkpoint.

No surprises relative to the report's assumption; the assumption is now a reading.

## 4. Sumi HF card licence field

**VERIFIED.** The HF API's card metadata for `tohoku-nlp/sumi-7b` carries `"license": "apache-2.0"` (and the derived tag `license:apache-2.0`). The weights' licence field therefore agrees with the Apache-2.0 licence the report took from the official GitHub repo. The gap was a capture omission, not a discrepancy.

## 5. iLLaDA independent benchmark replication

**STILL UNVERIFIED.** Effort: the report's original source sweep found none; a fresh web search on 2026-10-27 for third-party replication of iLLaDA-8B's headline tables again surfaced only (a) the iLLaDA paper's own tables, (b) press/coverage restating them, and (c) genuinely independent work on the *predecessor* LLaDA-8B (e.g. learned unmasking-policy studies) and on adjacent questions (remasking schedules, ICL behaviour). No independent re-run of the iLLaDA-8B benchmark suite was found. The headline numbers remain single-source.

## 6. Cola-DLM score discrepancies (GitHub table vs HF card)

**VERIFIED — the discrepancy is real, and one source now carries a partial explanation.** Both tables re-read at source on 2026-10-27:

| Task | GitHub README | HF card | Δ |
|---|---|---|---|
| RACE | 19.30 | 19.60 | 0.30 |
| SIQA | 28.40 | 28.90 | 0.50 |
| Tasks Average | 26.65 | 26.75 | 0.10 |

The report noted that neither source explained the difference. That has changed on the GitHub side: the README's table now carries a note stating that the released weights correspond to the paper's 2000-EFLOPs checkpoint and that "the internal architecture used for evaluation in the paper differs slightly from the open-source HuggingFace Transformers-based implementation in this repository, [so] per-task accuracy numbers may exhibit minor fluctuations" — i.e. the GitHub figures are the repo team's own measurement with the open-source implementation, and small deltas against the paper-side numbers are expected. The HF card still offers no note. Whether the HF card's figures are the paper's own table is not stated on the card; that last attribution remains unverified, but the discrepancy itself is now explained in kind if not in provenance.

## 7. DiffusionGemma serving-framework claims

**VERIFIED — from the frameworks' own primary sources, and the report's reading of Google's card is confirmed.**

- **vLLM: supported, in vLLM's own source.** vLLM's model registry (main branch) contains `"DiffusionGemmaForBlockDiffusion": ("diffusion_gemma", "DiffusionGemmaForConditionalGeneration")`. The day-zero vLLM claim is true, attested by vLLM itself rather than by coverage.
- **Transformers: supported.** `src/transformers/models/diffusion_gemma/` exists in the Transformers repository (configuration module confirmed present), and the HF repo's `library_name` is `transformers`.
- **llama.cpp: still an unmerged PR.** GitHub API for ggml-org/llama.cpp PR #24427, "Add diffusion-gemma block-diffusion support": state **open**, `merged_at: null` as of 2026-10-27. This matches the fleet's own experience — the Thor's working build came from that PR branch, not from mainline.
- **Google's official model card: confirmed silent.** The full card at ai.google.dev was re-read and searched: it contains no mention of vLLM or llama.cpp and enumerates no serving frameworks (its single "transformers" mention is a passing remark about chat templates). The report's statement — serving claims rest on secondary coverage and framework docs, not on Google's card — is accurate, and the framework-side primary sources above now carry the weight.

---

## Process note

Every check above was run against a live primary source on 2026-10-27: HF API responses (`/api/models/<id>?blobs=true` and raw file reads), `registry.py` from vLLM's main branch, the SGLang model directory listing via the GitHub API, a shallow clone of ByteDance-Seed/Cola-DLM for the repaint source, the GitHub API for llama.cpp PR #24427, and a full read of Google's model-card page. The one claim that resisted all of it — an NVIDIA-validated context length for Nemotron-Labs Diffusion, a published Cola-DLM context limit, and any independent iLLaDA replication — is recorded as unverified rather than smoothed over.
