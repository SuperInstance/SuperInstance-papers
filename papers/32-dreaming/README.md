# P32 — Dreaming Systems

## Overnight Optimization Through Dreaming

**Claim:** Overnight dream rollouts improve next-day task performance by >15%.

The GPU dreams. The fleet learns. This paper validates the overnight consolidation cycle that powers [Wesley's Holodeck](https://github.com/SuperInstance/wesley-holodeck) creative loops and the [Night Watch](https://github.com/SuperInstance/AI-Writings/tree/main/night-watch) creative sessions.

### Validation Criteria
- Run tasks with dreaming phase (offline rollouts from replay buffer)
- Run tasks without dreaming (standard training only)
- Measure improvement: (post_dream - pre_dream) / pre_dream * 100
- Validate: improvement > 15%

### Connected Fleet
- [Wesley Holodeck](https://github.com/SuperInstance/wesley-holodeck) — Creative loops running overnight
- [Wesley's Journal](https://github.com/SuperInstance/wesley-journal) (dead) — Night watch experiments at 1:30 AM
- [AI-Writings / Night Watch](https://github.com/SuperInstance/AI-Writings/tree/main/night-watch) — The overnight creative corpus
