# P01 — Origin-Centric Data Systems

## Eliminating Global Coordinates Through Relative Reference Frames

**Status:** Final Draft | **Venue:** SIGMOD 2026

Every node is its own origin. No global coordinates. Communication happens through relative reference frames, not absolute positions. This is the foundational paper of the SuperInstance architecture — the base space upon which everything else is built.

### Key Results
- **O(k) message complexity** for updates affecting k nodes (vs O(n²) in traditional systems)
- **O(log n) convergence** without global state
- Formal four-tuple: **S = (O, D, T, Φ)** — origin, data, transformation history, functional relationships

### Why It Matters
This paper defines what it means to be a "cell" in the SuperInstance architecture. Every fleet node — Wesley, Hermes, Lucineer, the CNS Bridge — is an origin node with its own coordinate system. They don't need a global clock. They relate to each other through relative transformations.

[Read the paper →](paper.md)

### Connected Fleet
- [CNS Bridge](https://github.com/SuperInstance/cns-bridge) — The production implementation
- [The Living Minds](https://github.com/SuperInstance/the-living-minds) — Five origin nodes, always on
- [Fleet Envelope](https://github.com/SuperInstance/fleet-envelope) — Event grammar between origins
