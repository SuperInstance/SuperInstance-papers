# Agentic Interface Theory × Theory of Mind in Multi-Agent Self-Improving Systems

Research completed 2026-10-09. All findings are from web-index research (abstracts and survey text); none verified live in the browser. Key papers were cross-checked against multiple secondary sources where possible; items flagged "secondary/unverified" rest on notes files or blog summaries, not the primary paper.

## Summary

The two halves of the question live in different bodies of literature, and there is no established "agentic interface theory" unifying them — that phrase describes an emerging design space, not a named formal theory.

- **Theory of mind (ToM)**: Two traditions. (1) RL-era: Rabinowitz et al. 2018 "Machine Theory of Mind" (ToMnet) — the canonical paper on agents learning to model other agents from behavioral observations, passing false-belief tests. (2) LLM-era: Kosinski's false-belief benchmarks (GPT-4 ~75–95% depending on revision), contested as pattern-matching; newer interactive work (ToM-SB double-agent RL, 2026) showing ToM and adversarial success co-emerge under RL. Memory appears to be the key ingredient for ToM-like behavior in interactive settings.
- **Agentic interfaces**: There are mature *protocols* (MCP, A2A, ANP, ACP→A2A, LMOS, AGNTCY) but they formalize transport, discovery, and capability advertisement — not capability *modeling* or negotiation. Agora (Marro et al. 2024) is the closest to a formal negotiated interface: agents negotiate protocols in natural language, then compile them to routines; 100-agent demo with 5× cost reduction.
- **Mutual improvement**: The strongest proven results are two-role self-play loops. SPIN (ICML 2024) provably converges and converts a weak LLM to a strong one using no new human data (58.14→63.16 on the Open LLM Leaderboard avg). Absolute Zero Reasoner (2025) uses a single model as proposer+solver with a code executor, reaching SOTA with zero curated data. Multi-agent debate reliably improves single-shot quality and can generate training data, but degrades when agents entrench; judge models are inconsistent and self-preferring. AlphaEvolve (DeepMind, May 2025) is the hardest real-world proof: an evolutionary propose→evaluate→select loop whose outputs (better matmul, 0.7% of Google's fleet compute) are deployed in production — though the model itself doesn't change.
- **GANs analogy**: GANs are the original two-agent improvement loop (generator as student, discriminator as teacher, target Nash equilibrium). Their documented failure modes — mode collapse, cycling/oscillation instead of convergence, vanishing gradients, no reliable convergence signal, hyperparameter fragility — are the exact failure template that recurs in LLM agent loops (debate entrenchment, judge inconsistency, cycling). The consistent lesson: improvement loops need a stationary external anchor (verifiable reward, fixed human data, automated evaluator); without one, multi-agent dynamics cycle rather than climb.
- **Production systems**: Honest negative result — no verified public production system in which LLM agents mutually improve each other in a closed loop. All rigorously measured self-improvement is training-time/research. Production evidence is one-directional (AlphaEvolve improving deployed artifacts) or human-in-the-loop feedback systems (Run→Observe→Evaluate→Improve). Kore.ai's Autoloop (launched 2026-10-07) claims continuous in-production agent self-optimization but is too new to verify.

## 1. Theory of mind in AI agents modeling other agents

**Definition in use**: ToM = an agent's ability to represent the unobservable mental states (beliefs, desires, intentions, capabilities) of other agents and use that model to predict or influence their behavior.

**Key papers and findings:**

- **Rabinowitz et al. 2018, "Machine Theory of Mind" (DeepMind), arXiv:1802.07740** — the foundational paper. ToMnet uses meta-learning to build models of agents from observations of their behavior alone, acquiring a strong prior over agent behavior plus the ability to bootstrap predictions about characteristics and mental states from few observations. Demonstrated on random, algorithmic, and deep-RL agents in gridworlds; passes the classic Sally-Anne false-belief test (recognizing others can hold false beliefs). Explicitly framed as important for multi-agent AI systems and interpretable AI. Source: http://arxiv.org/abs/1802.07740v2 (index).
- **Opponent-modeling lineage in MARL**: Grover et al. 2018a (encoder-decoder opponent policy reconstruction + agent-embedding clustering); Zheng et al. 2018 (opponent identification for MARL); Hernandez-Leal et al. 2019 (auxiliary tasks); Tacchetti et al. 2018 (Relational Forward Model with GNNs). A recurring limitation they attack: needing access to opponents' trajectories at execution time. Source: https://ar5iv.labs.arxiv.org/html/2001.10829 (index).
- **Kosinski 2023/2024, "Theory of Mind May Have Spontaneously Emerged in LLMs", arXiv:2302.02083**: 40 false-belief tasks. Reported davinci-001 ~40%, davinci-002 ~70%, davinci-003 ~90%, GPT-4 ~95% (v3); revised v5 gives more conservative numbers (davinci-003/3.5-turbo ~20%, GPT-4 June 2023 ~75%). The interpretation (emergent ToM vs. pattern-matching on static vignettes) is contested; report as ToM-like task performance, not proven ToM. Source: https://arxiv.org/abs/2302.02083v5 (index).
- **ToM-SB / "Playing Along" (2026, arXiv 2604.11666)**: privacy-themed challenge where a defender acts as a "double agent" steering an attacker's beliefs. Key finding: bidirectional emergence between ToM and attacker-fooling — rewarding fooling improves ToM and vice versa; combined ToM+fooling RL beats frontier models (Gemini3-Pro, GPT-5.4) with ToM prompting on hard scenarios and generalizes out-of-distribution. Source: secondary notes file, index only — https://github.com/yzlnew/wiki/blob/HEAD/sources/inbox/hf-daily-papers/2026-04-14-2604-11666-playing-along-learning-a-double-agent-defender-for-belief-steering-via-theory-of.md
- **"Readable Minds" (Lin & Hou 2026, LLM poker agents)**: 2×2 memory × domain-knowledge design (~6,000 hands) found memory necessary AND sufficient for ToM-like emergence (Cliff's delta = 1.0); memory-equipped agents reached ToM Level 3–5 (predictive to recursive modeling), and strategic deception occurred only with memory. Agents with ToM deviated from game-theoretically optimal play to exploit specific opponents. Source: secondary test-corpus note file, index only — https://github.com/wenyuchiou/ai-research-skills/blob/HEAD/test-corpus/ai-agents-social-interaction/papers/02-lin-hou-2026-llm-poker-tom.md — treat as unverified.

## 2. Agentic interfaces — formal frameworks for inter-agent communication, negotiation, capability modeling

There is no single named "agentic interface theory." What exists:

**Industry protocols (formalize transport, discovery, capability advertisement — not capability modeling):**
- **MCP** (Anthropic, Nov 2024): JSON-RPC standard for model↔context/tools; answers "what is available?"
- **A2A** (Google, Apr 2025, donated to Linux Foundation): cross-framework agent collaboration via Agent Cards, tasks, artifacts; agents discover each other's capabilities and negotiate interaction modalities *without* sharing internal memory/tools.
- **ACP** (IBM Research, REST-native) merged into A2A (Aug 2025); **ANP** (decentralized, W3C DIDs identity); **LMOS** (Eclipse, W3C Web-of-Things based); **AGNTCY/AConP** (full-stack multi-agent infra); **agents.json** (discovery).
- Sources: Future Internet 2026 survey (index) — https://mdpi-res.com/d_attachment/futureinternet/futureinternet-18-00171/article_deploy/futureinternet-18-00171.pdf?version=1774102388 ; IBM BeeAI tutorial — https://github.com/ibm/ibmdotcom-tutorials/blob/HEAD/tutorials/03-multi-agent-systems/bee-ai-multi-agent-contract-management/tutorial.md

**Closest to a negotiated formal interface — Agora (Marro et al., arXiv:2410.11905, Oct 2024):**
- A "layer zero" meta-protocol addressing the Agent Communication Trilemma (versatility vs. efficiency vs. portability).
- Mechanism: agents first communicate in natural language; for frequent exchanges they *negotiate* a structured protocol (JSON etc.), then LLM-written "routines" (scripts) handle future traffic without LLM calls; Protocol Documents are shareable and reusable across agents that never met.
- Demo: 100 heterogeneous agents (GPT-4o, Llama 3 405B, Gemini 1.5 Pro; MongoDB + SQL backends), 5× cost reduction vs. natural-language-only communication.
- Sources: https://arxiv.org/pdf/2410.11905 ; https://github.com/zeroxclem/agora-protocol

**Proposals, not standards:** "Liquid Interfaces" (draiven-io/agentic-bus) argues MCP answers "what is available?" while a higher layer should orchestrate "what should happen?" with ephemeral negotiated contracts — a research proposal, not an adopted framework.

**Assessment**: the protocols give us formal *transport and discovery*; formal *capability modeling and negotiation* is more alive in research (ToM/opponent modeling, MALT-style role training, Agora's negotiated PDs) than in any standard.

## 3. Federated/mutual self-improvement (agents as teachers/judges)

**Proven to work (peer-reviewed, measured):**

- **SPIN — Self-Play Fine-Tuning (Chen et al., ICML 2024, arXiv:2401.01335)**. Two-player game: new LLM p(θ_{t+1}) learns to distinguish previous-iteration outputs from human SFT data; opponent p(θ_t) tries to match the human distribution. Theoretical result: the global optimum is achieved iff the LLM policy aligns with the target data distribution. Empirical (zephyr-7b): Open LLM Leaderboard average 58.14 → 63.16; MT-Bench 5.94 → 6.78 across iterations (6.46 / 6.65 / 6.78); beats DPO trained with *extra GPT-4 preference data*. This is the cleanest peer-reviewed proof that a 2-role adversarial loop improves an LLM with zero new human data — still anchored to the fixed SFT dataset. Sources: https://arxiv.org/abs/2401.01335v3 ; https://proceedings.mlr.press/v235/chen24j.html
- **Absolute Zero Reasoner (Zhao et al., NeurIPS 2025, arXiv:2505.03335)**. One model plays both proposer and solver; a code executor validates proposed tasks and verifies solutions; RL with verifiable rewards. Zero curated data; 7B coder achieved SOTA on combined math+code, with code-only training transferring +10.9–15.2 points to math. Known limitation (secondary analysis): the "Invisible-Leash" — self-play cannot assign probability to solutions outside the base model's support; it improves sampling efficiency, not the underlying reasoning support. Sources: https://arxiv.org/pdf/2505.03335v3 ; https://adasci.org/blog/a-deep-dive-into-absolute-zero-reinforced-self-play-reasoning-with-zero-data
- **Multi-agent debate improves single-shot quality and yields training data**: Du et al. 2023 (MIT) — agents critiquing each other improved reasoning and factuality; explicitly described as "an automatic means of self-improvement… reducing reliance on human feedback." Source: https://news.mit.edu/2023/multi-ai-collaboration-helps-reasoning-factual-accuracy-language-models-0918
- **RLDF (multi-role debates as RL feedback)**: self-reflection mode (same LLM generates and critiques) and teacher-student mode (stronger LLM guides weaker); debate-derived data trains SFT + reward model. Source: https://openreview.net/pdf?id=ec4t2cFl7Q
- **Post-training for collaboration**: MALT (Motwani 2024, COLM 2025) — multi-role generator-verifier-refiner training with role-PRMs; MAPoRL (Park 2025, ACL 2025) — first post-training RL paradigm explicitly training collaboration; Multi-Agent Evolve (Chen 2025, arXiv:2510.23595) — proposer-solver-judge tri-role co-evolution. Source: https://github.com/lllcccyyyaaa/awesome-llm-mas-rl
- **Constitutional AI / RLAIF** (Bai et al.): the original model-as-judge loop — the model critiques and revises its own answers against written principles. Open problem per later work: judge models are inconsistent evaluators and show self-preference bias toward their own generations. Source (secondary): https://jameskle.com/writes/rlhf-course

**Documented failure modes of the loops:**
- **Debate entrenchment**: "Enhancing LLM Performance Through Debate" (arXiv:2503.12029) found "prolonged disagreement" where agents stay entrenched in initial wrong answers without converging; a "no winner" judge option plus judge feedback plus retry rounds partially mitigates. Source: https://arxiv.org/pdf/2503.12029v2
- **Judge inconsistency / self-preference bias** (see RLAIF note above).
- **Hardest real-world proof — AlphaEvolve (Google DeepMind, May 2025)**: evolutionary loop — Gemini ensemble proposes/mutates programs, automated evaluator scores, selection keeps winners. Verified: 4×4 complex matrix multiplication in 48 scalar multiplications (first improvement over Strassen's 1969 result); Borg scheduling heuristic recovering ~0.7% of Google's worldwide compute (deployed); ~23% Gemini kernel speedup cutting training time ~1%; matched best-known on ~75% of 50+ open math problems, improved ~20%. Caveat: the *model* is fixed; the *programs* improve — bounded self-improvement where humans specify problem + evaluator. Sources: https://deepmind.google/discover/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/ ; corroborating secondaries https://www.pelles.ai/blog/recursive-self-improvement-state-of-the-evidence , https://redreamality.com/blog/rsi-recursive-self-improvement-survey-2026/
- **Darwin Gödel Machine (Sakana AI + UBC, May 2025)**: self-modifying coding agent rewriting its own source, archive of variants; SWE-bench 20.0% → 50.0%, Polyglot 14.2% → 30.7% over ~80 generations. Secondary source only (https://www.pelles.ai/blog/recursive-self-improvement-state-of-the-evidence) — treat with care.

## 4. GANs as a two-agent improvement loop; failure modes at N agents

**GAN = the original two-agent improvement loop.** Generator and discriminator play a two-player zero-sum minimax game targeting a Nash equilibrium; interpretable as student-teacher (generator=student, discriminator=teacher), each improving by best-responding to the other. Sources: game-theoretic survey https://arxiv.org/pdf/2106.06976 ; https://par.nsf.gov/servlets/purl/10496092

**Documented failure modes (2-player):**
1. **Mode collapse**: the generator discovers a few outputs that fool D and repeats them. Analysis (https://dev.to/multigrid/generative-adversarial-networks-and-why-they-faded-3al3): "Mode collapse is what the objective asks for" — the generator's loss rewards fooling D; nothing in it mentions diversity. Signature: G commits to a small output set → D learns it → G jumps to another set → cycling instead of converging.
2. **Oscillatory cycling / non-convergence** (e.g., G produces only 6s, D adapts, G switches to 8s, …).
3. **Vanishing gradients** when D is too strong (D(G(z))→0, generator stops learning); **instability** when G is too strong early.
4. **No reliable convergence signal**: losses oscillate while sample quality varies independently — "an architecture whose training you cannot monitor automatically does not scale with engineering effort."
5. **Hyperparameter fragility** (learning-rate balance, update frequency, optimizer, architecture).
6. Nash-equilibrium convergence is theoretically hard even in the 2-player case (survey cites Wang et al. 2019; Wiatrak & Albrecht 2019).
Sources: https://arxiv.org/pdf/2106.06976 ; https://medium.com/@ujjjwalx/generative-adversarial-networks-gans-how-two-neural-networks-learn-by-competing-139f2cfc55b9 ; https://www.techtarget.com/ai/feature/Training-GANs-relies-on-calibrating-2-unstable-neural-networks

**Scaling to N agents (synthesis):** The two-player game already lacks a monotonic improvement signal and reliable convergence. More players multiply the problems: greater non-stationarity (each agent's environment shifts as others learn), harder credit assignment, and equilibrium concepts that are computationally harder (Nash in general N-player games is PPAD-hard). This is the exact template that recurs in LLM agent loops — debate entrenchment, judge inconsistency, cycling are the language-model analogues of mode collapse and oscillation. The consistent lesson across GANs, debate, SPIN, and AZR: improvement loops need a **stationary external anchor** (verifiable reward, fixed human dataset, automated evaluator); without one, multi-agent dynamics cycle rather than climb.

## 5. Production systems where agents demonstrably improve each other over time

**Honest negative result: no verified public production system shows LLM agents mutually improving each other in a closed loop.**

- **Closest verified, one-directional**: AlphaEvolve's *outputs* are deployed (Borg scheduling heuristic ~1 year, ~0.7% fleet compute; Gemini kernel +23%), but the model itself does not change — agents improve artifacts, not each other.
- **Vendor claim, unverified**: Kore.ai Autoloop (announced 2026-10-07, two days before this research) claims agents "self-improve against the goals set by the business" before and after deployment. Too new for independent verification. Source: https://www.businesswire.com/news/home/20261007261327/en/Kore.ai-Launches-Autoloop-the-Optimization-Engine-That-Keeps-AI-Agents-Performing-at-Production-Scale
- **Hobbyist claims (unverified)**: GitHub multi-agent trading system with closed-loop learning from its own track record (https://github.com/ibrahimaasim77/multi-agent-trading-system); clawd-multi-agent claiming 24/7 self-improvement (https://github.com/zach-abraham/clawd-multi-agent).
- **Frontier-lab internal self-reports (secondary, not peer-reviewed)**: Anthropic (June 2026) "Claude writes over 80% of merged production code," ~8× code/day per engineer, hardest-task success 26%→76% in six months; OpenAI (Sep 2026) 3.1 agent-workdays per human workday. These describe agents assisting humans, not agents mutually training each other. Source: https://www.pelles.ai/blog/recursive-self-improvement-state-of-the-evidence
- **Established production pattern**: Run → Observe → Evaluate → Improve against fixed metrics (task completion, reliability, cost) with structured traces; the improvement step remains largely human-driven or metric-optimized prompt/context updates, not autonomous mutual training. Source (practitioner, not evidence): https://medium.com/@mjgmario/feedback-loops-for-ai-agents-d300494246b6

**Net assessment**: Everything rigorously measured (SPIN, AZR, debate, MALT, MAPoRL, DGM, AlphaEvolve) is training-time/research. Everything in production is either one-directional (agents → artifacts), human-in-the-loop, or unverified claims. If the mission needs "what's actually been proven to work," the answer is self-play + verifiable-evaluator loops in training, not in production.

## Could not verify
- Whether "agentic interface theory" exists as a formal named theory (conclusion: it does not; the phrase describes a design space spanning protocols + negotiation + opponent modeling). No primary source uses this term.
- The "Readable Minds" poker-ToM paper and Darwin Gödel Machine results rest on secondary summaries; the underlying papers were not read.
- The AZR "Invisible-Leash" limitation comes from a secondary analysis (chatpaper.com), not the paper.
- No evidence was found of a production deployment with measured mutual agent-to-agent improvement; absence of evidence is reported rather than treated as impossibility.
- Whether frontier labs run closed-loop agent self-improvement internally is not publicly documented.

## Sources
- Rabinowitz et al. 2018, "Machine Theory of Mind" — http://arxiv.org/abs/1802.07740v2 (index, abstract)
- Opponent modeling related work — https://ar5iv.labs.arxiv.org/html/2001.10829 (index)
- Kosinski, "Theory of Mind May Have Spontaneously Emerged in LLMs" — https://arxiv.org/abs/2302.02083v5 (index, abstract)
- ToM-SB "Playing Along" (2026) notes — https://github.com/yzlnew/wiki/blob/HEAD/sources/inbox/hf-daily-papers/2026-04-14-2604-11666-playing-along-learning-a-double-agent-defender-for-belief-steering-via-theory-of.md (index, secondary)
- "Readable Minds" poker-ToM notes — https://github.com/wenyuchiou/ai-research-skills/blob/HEAD/test-corpus/ai-agents-social-interaction/papers/02-lin-hou-2026-llm-poker-tom.md (index, secondary)
- Future Internet 2026 agent-communication survey — https://mdpi-res.com/d_attachment/futureinternet/futureinternet-18-00171/article_deploy/futureinternet-18-00171.pdf?version=1774102388 (index)
- IBM BeeAI / ACP tutorial — https://github.com/ibm/ibmdotcom-tutorials/blob/HEAD/tutorials/03-multi-agent-systems/bee-ai-multi-agent-contract-management/tutorial.md (index)
- Agora paper — https://arxiv.org/pdf/2410.11905 (index); impl — https://github.com/zeroxclem/agora-protocol
- Liquid Interfaces proposal — https://github.com/draiven-io/agentic-bus/blob/HEAD/lip.md (index)
- SPIN (Chen et al., ICML 2024) — https://arxiv.org/abs/2401.01335v3 (index); https://proceedings.mlr.press/v235/chen24j.html
- Absolute Zero Reasoner — https://arxiv.org/pdf/2505.03335v3 (index); deep dive https://adasci.org/blog/a-deep-dive-into-absolute-zero-reinforced-self-play-reasoning-with-zero-data (index)
- Du et al. 2023 multi-agent debate — https://news.mit.edu/2023/multi-ai-collaboration-helps-reasoning-factual-accuracy-language-models-0918 (index)
- RLDF — https://openreview.net/pdf?id=ec4t2cFl7Q (index)
- MAD debate failure modes — https://arxiv.org/pdf/2503.12029v2 (index)
- awesome-llm-mas-rl (MALT, MAPoRL, Multi-Agent Evolve) — https://github.com/lllcccyyyaaa/awesome-llm-mas-rl (index)
- RLHF-course notes (RLAIF/judge bias) — https://jameskle.com/writes/rlhf-course (index, secondary)
- AlphaEvolve blog — https://deepmind.google/discover/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/ (not directly opened; corroborated via secondaries)
- RSI evidence table — https://www.pelles.ai/blog/recursive-self-improvement-state-of-the-evidence (index, secondary)
- RSI survey 2026 — https://redreamality.com/blog/rsi-recursive-self-improvement-survey-2026/ (index, secondary)
- "Games of GANs" survey — https://arxiv.org/pdf/2106.06976 (index)
- GAN game-theory text — https://par.nsf.gov/servlets/purl/10496092 (index)
- GAN training explainer — https://medium.com/@ujjjwalx/generative-adversarial-networks-gans-how-two-neural-networks-learn-by-competing-139f2cfc55b9 (index)
- "GANs and Why They Faded" — https://dev.to/multigrid/generative-adversarial-networks-and-why-they-faded-3al3 (index)
- Kore.ai Autoloop announcement — https://www.businesswire.com/news/home/20261007261327/en/Kore.ai-Launches-Autoloop-the-Optimization-Engine-That-Keeps-AI-Agents-Performing-at-Production-Scale (index)
- Agent feedback-loops practitioner piece — https://medium.com/@mjgmario/feedback-loops-for-ai-agents-d300494246b6 (index)
- GitHub: ibrahimaasim77/multi-agent-trading-system; zach-abraham/clawd-multi-agent (index)
- Working notes: notes/q1-theory-of-mind.md, notes/q2-agentic-interfaces.md, notes/q3-mutual-improvement.md, notes/q4-gans-n-agents.md, notes/q5-production.md
