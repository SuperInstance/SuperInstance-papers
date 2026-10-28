# The Mural and PLATO: Shared Canvas, Sliding Windows

A group of students is painting one mural on a long wall. Nobody owns the wall. Each painter stands in front of a stretch of it — a window, not the whole — and where their window sits is where their attention currently is. As the work develops, windows slide: a painter drifts left to answer a colour that has appeared there, another moves to the far end because the composition needs weight. The painting grows as one continuous surface, worked by many hands at once, coherent because the painters keep re-reading each other's fresh work and adjusting their own.

This is a design pattern for multi-agent systems: a shared canvas no participant sees whole, worked through sliding windows of attention, its unity maintained by constant mutual adjustment rather than any single author. It is also, not coincidentally, the architecture of the first great collaborative computer system.

## How it works

The wet and dry gradient governs what may change. At the frontier, where a painter is actively working, the paint is wet: revisable, open to being painted over in light of what a neighbour has just done. Behind the frontier, finished passages dry. Dried paint is load-bearing; others compose against it and trust it to stay. Blank wall beyond the frontier is not yet anything. A well-run mural keeps this gradient healthy: wet where the work is live, dry where others depend on it, and a frontier that keeps moving.

The seams are the hard part. Where two painters' windows meet, two styles, two palettes, two intentions must become one hillside. A seam cannot be painted by either painter alone, because the seam is precisely the part of the wall that belongs to both windows at once. It is repaired socially: one painter paints slightly into the other's patch, the other paints back over the join, each surrendering a little sovereignty at the boundary until the join disappears. Shared state is not declared by either side; it is minted exactly where two sovereign interiors agree to meet, and nowhere else. Interiors remain private; only the overlap is negotiated.

Windows slide because attention is the scarce resource. The wall is always larger than any view of it, so every participant's knowledge is a partial, positioned reading: true from where they stand, incomplete by construction. The mural works anyway, because coherence is local — a painter needs their own passage and the edges of their neighbours', not a God's-eye survey. The finished wall exists only for whoever can finally stand back from it; while the work is live, nobody holds the whole.

## Where it already lives

The historical root is PLATO, built at the University of Illinois from 1960, with its TUTOR language written close to the metal. PLATO was the first system whose native case was many people inhabiting one shared artefact at once: shared "common" blocks were first-class, not an add-on, and its plasma-display terminals held only a window while the centre held the world. On time-sliced crumbs of mainframe, it ran multiplayer games — Empire, Spasim — for dozens of simultaneous players in the early 1970s. Its lessons were also quietly predictive: a TUTOR lesson anticipated what the student would do next, including the wrong things, and held prepared responses for each.

PLATO and MIDI are the same shape of thought: events on a shared clock reaching many cheap endpoints, state living in the shared score rather than in any endpoint's private memory. The contrasting lineage — C, DOS, Linux — thinks in single processes privately grinding their own state, collaboration bolted on afterwards.

In Casey's own work the pattern is already built. The PLATO framework cluster includes plato-room-engine (rooms with enter, leave, and message as the primitive operations) and plato-room-server, which holds 15 rooms and more than 16,000 tiles under shared-state discipline, alongside spacetime-plato. The mud-solitaire project states the maxim outright: *the room IS the interface*. The time-sliced quilt idea — many agent instances sharing one served model, each holding only a window — is PLATO's time-sharing economics reborn. Plainsong, plain-text notation compiling to MIDI, is the same instinct in another medium: the score as shared text many hands can re-perform.

## Failure modes and tensions

Seams fail invisibly. Each patch can flourish — rich, confident, locally excellent — while the joins between patches quietly contradict one another, and because nobody sees the whole wall, the failure has no natural witness. A mural system needs deliberate seam-attention: some role, human or mechanical, whose job is walking the joins rather than admiring the passages.

The second failure is the centre. Drop the discipline of negotiated overlap — participants writing anywhere, one writer's version overwriting — and the canvas degrades into a single-writer bottleneck with extra contention: all the cost of a shared system, none of the plural authorship that justified it. The pattern depends on the unfashionable rule that interiors are sovereign and only agreements cross between them.

There is also a standing tension in the drying. Dry too fast and errors become load-bearing, defended by everything composed against them. Dry too slowly and nothing can be built on anything; the wall stays a sketch. The gradient is a judgement, renewed continuously, not a setting.

## Connections

Sibling concept: `the-elephant-in-the-room.md` — how a shared room's ambient state is sensed at all: the field and dials that tell each painter what the wall currently feels like, and why that reading is only visible by contrast between rooms.
