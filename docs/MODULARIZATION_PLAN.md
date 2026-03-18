# SuperInstance Modularization Plan

**Date:** 2026-03-18
**Agent:** Round 1 - Repository Analysis and Modularization Planning
**Status:** Draft - Complete Analysis of 4 Repositories

---

## Executive Summary

The SuperInstance ecosystem has grown organically across 4 repositories with significant code bloat, incomplete features, and documentation-heavy implementations. This plan streamlines the system into a **working MVP** by:

1. **Extracting non-essential features** to separate repositories
2. **Consolidating duplicate functionality** across repos
3. **Simplifying architecture** to focus on core value propositions
4. **Removing incomplete experiments** and documentation-only features

**Target Result:** 3 focused repositories from current 4, with clear separation of concerns and working MVP functionality.

---

## Current Repository Analysis

### Repository Status Matrix

| Repository | LOC | Tests | Status | Core Functionality | Bloat Level |
|------------|-----|-------|--------|-------------------|-------------|
| **constrainttheory** | 2,244 | 68/68 | ✅ Research Release | Geometric encoding, spatial queries | **MEDIUM** |
| **claw** | 15,686 | 163/163 | ✅ Production Auth | Cellular agent engine | **HIGH** |
| **spreadsheet-moment** | ~5,000 TS | 192/268 | 🔄 78% passing | Spreadsheet + agent platform | **HIGH** |
| **dodecet-encoder** | 4,066 | 170/170 | ✅ Ready to Publish | 12-bit geometric encoding | **LOW** |

**Total:** 27,000+ LOC across repos, 693 tests, significant architectural overlap

---

## Core vs. Extension Analysis

### 1. constrainttheory/ - Geometric Substrate

**Current Structure:**
```
constrainttheory/
├── crates/
│   ├── constraint-theory-core/     ✅ KEEP - Core geometric engine
│   └── gpu-simulation/              ❌ EXTRACT - Research experiments
├── packages/
│   └── constraint-theory-wasm/      ✅ KEEP - WASM bindings for web
├── experiments/                     ❌ EMPTY - Remove directory
├── web-simulator/                   ⚠️  DEMO - Move to separate repo
├── research/                        ❌ EXTRACT - PDFs, papers
├── papers/                          ❌ EXTRACT - Published papers
└── tools/                           ⚠️  EVALUATE - Some tools, some demos
```

**Core (KEEP in constrainttheory/):**
- ✅ `constraint-theory-core/` - Geometric encoding, KD-tree, manifold operations
- ✅ `constraint-theory-wasm/` - WebAssembly bindings for browser
- ✅ Basic spatial query API
- ✅ Integration with dodecet-encoder

**Extensions (EXTRACT to new repos):**

**New Repo: `constrainttheory-ml-demo`**
- ML embedding demos
- Visualization examples
- Tutorial code
- Integration examples with ML frameworks

**New Repo: `constrainttheory-research`**
- All PDF research papers
- Synthesis documents
- Academic writeups
- Benchmark reports

**Remove:**
- ❌ `experiments/` directory (empty)
- ❌ `web-simulator/` (move to ML demo repo or remove)
- ❌ Duplicate documentation files
- ❌ Round completion summaries (historical, not needed)

**Rationale:** constrainttheory has **medium bloat** - mostly research artifacts and demos. Core is solid (68 tests passing), but too many research PDFs and demo code cluttering the repo.

---

### 2. claw/ - Cellular Agent Engine

**Current Structure:**
```
claw/
├── core/                            ✅ KEEP - Rust agent engine
│   ├── src/
│   │   ├── agent.rs                ✅ Core agent lifecycle
│   │   ├── api/                    ✅ REST + WebSocket API
│   │   ├── equipment/              ✅ Equipment system
│   │   ├── social/                 ✅ Social coordination
│   │   └── ws/                     ✅ WebSocket server
│   └── examples/                   ⚠️  EVALUATE - Some examples, some tests
├── extensions/                      ❌ EXTRACT - 15+ unrelated extensions
│   ├── anthropic/                  ❌ Unrelated to core claw
│   ├── openai/                     ❌ Unrelated to core claw
│   ├── discord/                    ❌ Unrelated to core claw
│   ├── memory-core/                ✅ MAY KEEP - Core memory equipment
│   └── [12 more]                   ❌ All unrelated
├── docs/                           ⚠️  CLEANUP - Remove obsolete docs
├── *.md files                      ❌ CONSOLIDATE - Too many summaries
└── AGENTS.md                       ❌ REMOVE - Wrong AGENTS file (from openclaw)
```

**Core (KEEP in claw/):**
- ✅ `core/src/agent.rs` - Agent lifecycle management
- ✅ `core/src/api/` - REST API + WebSocket server
- ✅ `core/src/equipment/` - Core equipment slots + muscle memory
- ✅ `core/src/social/` - Basic coordination patterns (master-slave, co-worker)
- ✅ `core/src/ws/` - WebSocket protocol + server
- ✅ Production authentication system (API keys, JWT)
- ✅ 163 passing tests

**Extensions (EXTRACT to new repos):**

**New Repo: `claw-extensions`**
```
claw-extensions/
├── equipment/
│   ├── hierarchical-memory/       Memory equipment
│   ├── monitoring/                Monitoring equipment
│   └── [advanced equipment]
├── social/
│   ├── consensus-algorithms/      Advanced consensus
│   ├── routing-protocols/         Agent routing
│   └── [coordination patterns]
└── integrations/
    ├── openai-connector/          OpenAI integration
    ├── anthropic-connector/       Anthropic integration
    └── [LLM providers]
```

**New Repo: `claw-examples`**
- All example code from `core/examples/`
- Tutorial walkthroughs
- Integration demos
- Performance benchmarks

**Remove from claw/:**
- ❌ `extensions/` directory (15+ unrelated openclaw extensions)
- ❌ `AGENTS.md` (wrong file - belongs to openclaw, not our claw)
- ❌ Round summary documents (historical)
- ❌ Build fix summaries (historical)
- ❌ Duplicate documentation

**Rationale:** claw has **HIGH bloat** - the `extensions/` directory contains 15+ unrelated openclaw extensions (Discord, OpenAI, etc.) that have nothing to do with our cellular agent engine. These should be extracted or removed entirely.

---

### 3. spreadsheet-moment/ - Agent Spreadsheet Platform

**Current Structure:**
```
spreadsheet-moment/
├── packages/
│   ├── agent-core/                ✅ KEEP - Core agent platform
│   ├── agent-ai/                  ⚠️  EVALUATE - AI integration
│   ├── agent-formulas/            ⚠️  EVALUATE - Formula engine
│   └── agent-ui/                  ✅ KEEP - UI components
├── backend/                       ⚠️  EVALUATE - Rust backend?
├── tests/
│   ├── integration/               ✅ KEEP - Integration tests
│   ├── e2e/                       ✅ KEEP - E2E tests
│   └── load/                      ✅ KEEP - Load tests
├── deployment/
│   ├── production/                ✅ KEEP - Production configs
│   └── staging/                   ✅ KEEP - Staging configs
├── docs/                          ⚠️  CLEANUP - Too many docs
├── hardware-marketplace/          ❌ REMOVE - Unrelated feature
└── [20+ summary documents]        ❌ CONSOLIDATE - Historical docs
```

**Core (KEEP in spreadsheet-moment/):**
- ✅ `packages/agent-core/` - Core agent platform
- ✅ `packages/agent-ui/` - UI components for agents
- ✅ Univer integration (base spreadsheet functionality)
- ✅ Integration tests (192/268 passing - fix remaining)
- ✅ Deployment configs (production + staging)
- ✅ Load testing infrastructure

**Extensions (EXTRACT to new repos):**

**New Repo: `spreadsheet-ai-plugins`**
- `packages/agent-ai/` - AI/ML integrations
- LLM connectors
- AI-powered features

**New Repo: `spreadsheet-formulas`**
- `packages/agent-formulas/` - Advanced formula engine
- Custom formula functions
- Formula optimization

**New Repo: `spreadsheet-testing`**
- Complete testing framework
- Test utilities
- E2E test templates
- Load testing tools

**Remove from spreadsheet-moment/:**
- ❌ `hardware-marketplace/` (completely unrelated)
- ❌ Round summary documents (historical)
- ❌ Phase plan documents (outdated)
- ❌ Duplicate documentation

**Rationale:** spreadsheet-moment has **HIGH bloat** - many incomplete packages (hardware-marketplace??), too much documentation, and failing tests. Focus on core Univer + agent integration.

---

### 4. dodecet-encoder/ - 12-Bit Geometric Encoding

**Current Structure:**
```
dodecet-encoder/
├── src/                            ✅ KEEP - Core encoding library
│   ├── dodecet.rs                 ✅ 12-bit encoding
│   ├── geometric.rs               ✅ Geometric operations
│   ├── calculus.rs                ✅ Calculus operations
│   └── wasm.rs                    ✅ WASM bindings
├── wasm/                           ✅ KEEP - WASM package
├── examples/                       ✅ KEEP - Good examples
├── tests/                          ✅ KEEP - 170 tests passing
├── tutorials/                      ✅ KEEP - Educational content
└── docs/                           ✅ KEEP - Good documentation
```

**Core (KEEP in dodecet-encoder/):**
- ✅ ALL OF IT - This repo is well-structured

**Extensions (EXTRACT to new repos):**

**New Repo: `dodecet-examples`** (OPTIONAL)
- Advanced examples
- Community contributions
- Integration demos

**Rationale:** dodecet-encoder has **LOW bloat** - this is the cleanest repo. Keep as-is, possibly extract advanced examples if needed.

---

## Proposed New Repository Structure

### After Modularization: 7 Repositories (from 4)

**Core Repositories (3):**
1. **constrainttheory/** - Geometric substrate for spatial queries
2. **claw/** - Cellular agent engine (Rust)
3. **spreadsheet-moment/** - Spreadsheet platform + agent integration

**Supporting Repositories (2):**
4. **dodecet-encoder/** - 12-bit geometric encoding (unchanged)
5. **SuperInstance-papers/** - Research papers (unchanged)

**Extension Repositories (2 - NEW):**
6. **claw-extensions/** - Advanced equipment, integrations, examples
7. **constrainttheory-ml-demo/** - ML demos, visualizations, tutorials

### Removed/Consolidated:
- ❌ Remove `hardware-marketplace/` from spreadsheet-moment
- ❌ Remove 15+ unrelated `extensions/` from claw
- ❌ Remove historical documentation from all repos
- ❌ Remove empty `experiments/` directories
- ❌ Remove duplicate summary documents

---

## Dependency Graph After Modularization

```
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│                                                                   │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │ spreadsheet-/    │      │ claw-extensions/ │                 │
│  │ moment/          │◄────►│ (NEW)            │                 │
│  │                  │      │                  │                 │
│  │ • Univer base    │      │ • Advanced equip │                 │
│  │ • Agent UI       │      │ • LLM integrations│                │
│  │ • Claw cells     │      │ • Examples       │                 │
│  └──────────────────┘      └──────────────────┘                 │
│           │                         ▲                           │
│           │                         │                           │
└───────────┼─────────────────────────┼───────────────────────────┘
            │                         │
            ▼                         │
┌─────────────────────────────────────┼───────────────────────────┐
│                      ENGINE LAYER                              │
│                                   │                             │
│  ┌──────────────────┐             │                             │
│  │     claw/        │◄────────────┘                             │
│  │                  │                                           │
│  │ • Agent engine   │                                           │
│  │ • Equipment core │                                           │
│  │ • Social coord   │                                           │
│  │ • REST + WS API  │                                           │
│  └──────────────────┘                                           │
│           ▼                                                     │
│  ┌───────────────────────────────────────────────────┐          │
│  │              constrainttheory/                      │          │
│  │                                                    │          │
│  │  • Geometric encoding                              │          │
│  │  • Spatial queries (KD-tree)                       │          │
│  │  • Manifold operations                             │          │
│  └───────────────────────────────────────────────────┘          │
│           │                                                     │
└───────────┼─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FOUNDATION LAYER                            │
│                                                                   │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │ dodecet-encoder/ │      │ constrainttheory-│                 │
│  │                  │      │ ml-demo/ (NEW)   │                 │
│  │ • 12-bit encoding│      │                  │                 │
│  │ • Geometric ops  │      │ • ML demos       │                 │
│  │ • WASM package   │      │ • Visualizations │                 │
│  └──────────────────┘      └──────────────────┘                 │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Extraction Strategy

### Phase 1: Core Cleanup (Week 1)
**Goal:** Remove obvious bloat from core repos

**constrainttheory/:**
- Remove empty `experiments/` directory
- Remove research PDFs (move to SuperInstance-papers)
- Consolidate documentation (remove 10+ summary docs)
- Clean up `tools/` (remove demos, keep utilities)

**claw/:**
- Remove `extensions/` directory entirely (15+ unrelated extensions)
- Remove wrong `AGENTS.md` file
- Remove historical summary documents
- Clean up documentation (keep core docs, remove historical)

**spreadsheet-moment/:**
- Remove `hardware-marketplace/` directory
- Remove historical phase/round documents
- Consolidate documentation
- Fix failing tests (target: 95%+ passing)

### Phase 2: Extension Extraction (Week 2)
**Goal:** Create new extension repos

**Create claw-extensions:**
- Extract advanced equipment from claw/core/src/equipment/
- Extract social patterns from claw/core/src/social/
- Create integration templates
- Add example configurations

**Create constrainttheory-ml-demo:**
- Extract ML demos from constrainttheory/
- Extract visualization code
- Create tutorial examples
- Add integration demos

### Phase 3: Integration Testing (Week 3)
**Goal:** Ensure core repos work after extraction

**Integration Tests:**
- Test claw without extensions
- Test constrainttheory without ML demos
- Test spreadsheet-moment without AI plugins
- Verify all APIs still work

**Performance Validation:**
- Benchmark core claw performance
- Validate constrainttheory spatial queries
- Test spreadsheet-moment with real data

### Phase 4: Documentation Update (Week 4)
**Goal:** Update all documentation

**Update READMEs:**
- Reflect new repository structure
- Document extracted extensions
- Update integration guides
- Add migration notes

**Create Integration Guides:**
- How to use claw with extensions
- How to use constrainttheory with ML demos
- How to integrate all three core repos

---

## Risk Assessment

### High Risk Items

1. **Claw extensions removal** - May break unknown integrations
   - **Mitigation:** Audit all extensions before removal
   - **Fallback:** Keep essential extensions in core

2. **Spreadsheet-moment test failures** - 52/268 tests failing
   - **Mitigation:** Fix tests before extraction
   - **Fallback:** Disable non-critical tests

3. **Dependency chains** - Unknown cross-repo dependencies
   - **Mitigation:** Comprehensive dependency audit
   - **Fallback:** Revert extraction if critical deps found

### Medium Risk Items

1. **Documentation updates** - May miss important info
   - **Mitigation:** Automated doc generation
   - **Fallback:** Keep historical docs in separate branch

2. **API compatibility** - Breaking changes during extraction
   - **Mitigation:** Version API contracts
   - **Fallback:** API compatibility layer

### Low Risk Items

1. **Removing PDF research papers** - Already in SuperInstance-papers
2. **Removing historical summaries** - Not needed for MVP
3. **Consolidating documentation** - Reduces confusion

---

## Success Criteria

### Modularization Success Metrics

**Code Reduction:**
- ✅ Reduce total LOC by 30% (target: ~19,000 from 27,000)
- ✅ Eliminate duplicate code across repos
- ✅ Remove all incomplete features

**Repository Clarity:**
- ✅ Each repo has single, clear purpose
- ✅ No overlap in functionality between repos
- ✅ Clear dependency graph

**Test Coverage:**
- ✅ Maintain 90%+ test coverage in core repos
- ✅ All tests passing after extraction
- ✅ Performance benchmarks maintained

**Documentation:**
- ✅ Single source of truth per repo
- ✅ Clear integration guides
- ✅ Migration documentation for extracted code

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Create detailed extraction checklists** for each repo
3. **Set up new extension repos** (claw-extensions, constrainttheory-ml-demo)
4. **Begin Phase 1 cleanup** (remove obvious bloat)
5. **Create MVP_DEFINITION.md** (define what MVP includes)
6. **Create EXTRACTION_ROADMAP.md** (step-by-step extraction)

---

**Status:** ✅ Analysis Complete - Ready for Execution
**Next:** Create MVP definition and extraction roadmap
**Timeline:** 4 weeks to complete modularization
**Impact:** 30% code reduction, clearer architecture, working MVP
