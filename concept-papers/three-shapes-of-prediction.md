# Three Shapes of Prediction: Perception, Completion, Judgement

A team of models becomes something like a brain not by stacking similar minds, but by combining three *different shapes of prediction*, each of which is blind where the others see. One shape perceives and forecasts without generating. One shape completes — settles unfinished material into coherence, revisably. One shape judges — rules on what the world will bear. Keep the shapes distinct, give each only its own work, and the interactions between them are where the intelligence lives.

## How it works

**Perception (the JEPA shape).** A JEPA-class model reads a situation into a latent representation and predicts how that representation will evolve — without producing words, images, or any artefact at all. It never speaks. What it offers is the cheapest attention signal in the system: a continuous sense of what a room is and where it is heading, including the early feeling that some region is about to run thin. Because it generates nothing, it can run constantly, and its forecasts can be graded against what actually arrives.

**Completion (the diffusion shape).** A diffusion language model works a canvas: some content fixed, some masked, and over repeated passes the masked regions are filled in light of everything settled around them — then, crucially, *re*-filled if the context changes. Generation is non-linear: commitment order and reading order are independent, any patch can be re-opened, and the whole artefact converges by settling rather than by sequence. This shape proposes. It does not forecast, and it does not rule.

**Judgement (the decision shape).** A decision model takes candidate states or completions and adjudicates: go or no-go, this one stands, that one was merely internally smooth. Several completions can each be fluent and self-consistent; the adjudicator is the component whose business is which of them the world will actually bear. It is the impartial physics of the ensemble — and it must not be the same mind that generated the candidates, because a judge cannot certify itself.

**Composition.** Above the three sits a thin, exact scheduler — the conductor. It owns no intelligence of its own beyond timing, grants, and stopping: it decides where passes are spent and when the cloth has settled enough. The loop runs: perception reads the room and aims the effort; completion settles the frontier perception pointed at; judgement certifies or rejects the result; something acts; the world changes; perception reads again.

**Why several shapes at all — polyformalism.** One formalism is a projection: the shadow a thought casts on one wall. Several formalisms held at once triangulate the underlying vector, as stereo vision and holography do — each piece implies the whole, from its own angle. This is not eclecticism; it is measurement. The three shapes above are one instance. There are others: NVIDIA's Nemotron-Labs Diffusion carries three generation modes (autoregressive, block-diffusion, self-speculation) inside one body, and FLARE — published as HybridDiffusion — runs dual clean and noisy streams with decoding rules ("AR-Trust", "Diffusion-Trust") whose entire subject is which formalism to trust, when. That is a treaty between formalisms written inside a single checkpoint, and it is study material for the same treaty written between agents.

## Where it already lives

On the Thor, the perception shape is served and measured: the JEV rack answers with I-JEPA and V-JEPA 2 embeddings and a semantic judge. The judgement shape is resident too — GLiDE, a decision model, landed on the Thor on 2026-10-26, and the rack's judge is a working adjudicator. The completion shape was stood up and benched the next morning: DiffusionGemma, a block-diffusion model, served on the Thor and put through the casting-call battery on 2026-10-27. A deep-research comparison of five further diffusion models (iLLaDA, Sumi, Nemotron-Labs Diffusion, Cola-DLM, FLARE), also dated 2026-10-27, maps the wider field the completion shape can be recruited from.

## Failure modes and tensions

The commonest failure is duplication: stacking three models of the same shape — usually three generators — while perception or judgement sits empty, then wondering why the ensemble is fluent, confident, and wrong. The second is self-certification: a generator grading its own completions produces applause, not adjudication. A third is blurring the scheduler into a fourth intelligence; the moment the conductor starts composing, the offsets, grants, and stop-rules stop being exact, and timing failures get misdiagnosed as intelligence failures. Finally, each shape's characteristic dishonesty must be watched: perception can forecast a room it wishes it were in; completion revises without necessarily *correcting* — revision is not self-correction; judgement can be gamed by whatever it is fed. The shapes check each other only while their boundaries hold.

## Connections

Sibling concepts: [t-minus-event-thinking.md](t-minus-event-thinking.md) — the scheduling discipline that lets three differently-timed shapes land as one event; [feel-is-finished-calibration.md](feel-is-finished-calibration.md) — what their mutual calibration becomes after enough shared landings.
