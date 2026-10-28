# WP-01 — The Quilt: a reactive cell substrate

**Claim.** A spreadsheet-like sheet of typed cells, evaluated by a
pull-based reactive engine with caller-aware routing and append-only
receipts, is enough substrate to host sensors, formulas, listeners, LLM
calls, and multi-instance federation — and its failure modes are
enumerable and patchable in a bounded probe suite.

## Mechanism

A **sheet** (JSON/YAML) declares cells of nine kinds. The engine evaluates
cells lazily by pulling: a cell recomputes when its dependencies change, and
per-context memoization keys results by `(formula, caller-identity, tenant)`.
**Listeners** watch cells or conditions and fire **programs** (effectful
scripts). An `ai` cell is just a cell whose evaluation is a model call, with
`{{cell}}` templating into the prompt — models sit inside the dependency
graph like any other cell. A **router** delegates reads across engine
instances with caller context preserved; the **federation SDK** adapts
engines onto a shared transport so edge/server/cloud instances mirror and
roll up.

The distinctive primitives: **caller-aware memoization** (the same formula
answers different tenants differently, cached separately), **gesture math**
(arc length, bending energy, twist) for judging the *shape* of cell time
series, and receipts booked on every state change.

## Evidence (play-tested, receipted)

An 11-probe suite against the real engine found and fixed seven engine bugs,
all while 36/36 core tests stayed green: listener watch-lists never wired
into the dependency graph (all example listeners dead); cycles crashed with
stack overflow; `eager` mode absent so listeners saw stale data; the
`contains` sugar broke on dotted paths (silently false → rules fell
through); router delegation dropped caller context (tenant cache collapse);
program cells were not invalidated by upstream writes (a workflow served its
first result forever); NaN flowed with status `ready`.

After patches, the demo fleet ran end-to-end: 3-engine federation (edge/
server/cloud rollups, cross-instance alert handle), a multi-tenant SaaS
sheet (premium/standard isolation, 2 model calls not 3), and a ticket-triage
sheet with 3 real LLM cells over 7 real model calls (urgency 1/10 vs 10/10
vs 7/10; the escalation gate fired only on the outage).

## Bones

- The probe-suite method itself: 11 small adversarial probes found seven
  real bugs in a mature codebase in one afternoon — reusable against any
  reactive runtime.
- The adapter pattern (engine→SDK transport, ~20 lines) that made
  federation possible.
- The caller-context threading discipline now standard in fleet routers.

## Limits

Lazy pull means subscriptions on formulas don't fire until read; effectful
cells don't auto-invalidate dependents; undeclared dependencies are silent.
The engine is honest about dataflow, not about the world.

*Source: quilt-playtest probe records and engine patches, waves 1–3.*
