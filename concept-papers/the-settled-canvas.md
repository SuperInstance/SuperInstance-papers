# The Settled Canvas: Diffusion-Native Quilts

Most generated artefacts are written the way a scribe writes: left to right, each new piece permanently constrained by every piece before it. A settled canvas works the opposite way. The whole artefact is present from the first moment — a quilt or cloth made of individual cells — but most of it starts masked, unresolved, held as possibility rather than decision. Work proceeds not by appending, but by settling: patches become definite at different times, for different reasons. A settled patch is not finished forever. It can be re-masked, returned to possibility, and re-settled in the light of its neighbours — including neighbours that did not exist when it was first laid down. Generation order and reading order are therefore independent: what is read first need not be what was made first, and what was made early can be remade late without tearing the cloth.

The mechanics come from diffusion language models, which generate by starting from a masked canvas and refining the whole span over repeated passes, rather than emitting one token after another in a single irreversible line. Applied to a shared artefact — a story, a plan, a design — the same mechanics let many contributors, human or machine, work one object together without queuing behind each other's sentences.

## How it works

The canvas is divided into cells, each with a sovereign interior: its own state, its own working, its own reasons. Nothing reaches inside another cell directly. What crosses between cells is only what they have agreed to send and receive — a reading, a committed value, a question, a refusal. Shared state is minted from those agreed crossings, never from one cell peering uninvited into another.

At any moment the canvas sits in three conditions, a settlement gradient. At the centre is the frozen core: patches that have settled and become load-bearing; other work depends on them, so they change only deliberately and rarely. Around the core is the fluid frontier: patches actively being settled, revised and re-masked, where most of the attention belongs. Beyond the frontier lies the dark: territory belonging to the artefact's shape but not yet opened — not empty in principle, simply not rendered in fact.

Work moves in passes. In each pass, a cell re-reads what it has legitimately received from its neighbours and proposes a new state for its own patch. A proposal that agrees survives; one that jars is re-masked for another pass. Settlement is not declared by a single author. It is the observable condition of a patch that has stopped changing across passes while its neighbours have also steadied. Freezing a patch into the core is a separate, explicit act: a judgement that this piece is now true enough to build on.

Because any patch can be reopened, revision is granular. If cooperation turns wrong somewhere, the failed patch — and only those genuinely implicated — is re-masked, while the rest of the settled work stands. A later pass settles the hole again, informed by everything learned since, including work produced after the original attempt.

None of this requires anyone to see the whole. Each cell works from its own readings, which differ lawfully from every other cell's. Harmony is the aim, not unison.

## Where it already lives

DiffusionGemma, serving on Casey's Thor since 27 October 2026, generates by block diffusion over a fixed canvas: masked blocks are filled and renoised over repeated passes, and unselected material can be returned to noise and settled again. That is not a metaphor for the settled canvas; it is the same mathematics at sentence scale.

The settlement gradient was named earlier, in a different vocabulary, by Casey's PLATO framework. Its `plato-ghostable` component defines persistence classes — Eternal, Persistent, Ephemeral — the frozen core, the durable-but-revisable middle, and the fluid frontier, described as data policy rather than as generation. Any long-lived shared artefact needs to know what may not move, what may move slowly, and what is still wet paint.

The cell discipline comes from the quilt work itself: cells with sovereign interiors, connected only by agreed sends and receives, quilts nesting inside quilts at every scale. The settled canvas is what happens when that discipline is given a diffusion model's sense of time.

## Failure modes and tensions

A settling canvas has no natural full stop. An autoregressive writer finishes because the line ends; a canvas can always accept one more pass, polishing settled work for diminishing returns. Stopping has to be a measurement, not a feeling: change per pass, tracked honestly, with a declared threshold below which the canvas counts as settled. Without that gauge, the work either stops arbitrarily early or never stops at all.

A loud patch can drag its neighbourhood. If one cell revises aggressively and often, its neighbours spend their passes reacting to it rather than settling their own ground, and the disturbance propagates. Rate, reach and reopening rights are therefore governance questions, not implementation details: not every patch should be equally easy to re-mask, and the frozen core exists to give the cloth something that holds still.

Revision fights auditability. A canvas that can be rewritten in place invites a quiet lie: the final state looks inevitable, and the wrong turns that produced it vanish. The defence is logging every pass — what was proposed, what was received, what changed — so the history of settling is as inspectable as the settled result. That log is not an appendix; it is the only evidence that the harmony was reached rather than asserted, and what makes granular repair possible instead of theatrical.

## Connections

- unmapped-space.md
- jepa-the-conductor.md
