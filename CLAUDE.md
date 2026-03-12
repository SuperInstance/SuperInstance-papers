# POLLN + LOG-Tensor Unified R&D Phase Orchestrator Instructions
**Phase:** Synthesis & Finalization - ROUNDS 1-19 COMPLETE
**Start Date:** 2026-03-10
**Current Date:** 2026-03-12 (Synthesis Phase Active)
**Progress:** Rounds 1-19 complete, 6 white papers finalized, 4 papers with roadmaps
**Focus:** Final synthesis, remaining paper completion, publication preparation
**Mode:** Comprehensive synthesis of 228 agent deployments

---

## 25-ROUND ORCHESTRATION PLAN

### Structure: 12 Agents Per Round

| Team | Agents | Focus |
|------|--------|-------|
| **R&D Team** | 4 | Research everything - codebase analysis, new concepts, cross-project synergies |
| **White Paper Team** | 4 | Write and refine white paper sections, documentation, publications |
| **Build Team** | 4 | Implementation, code, tests, integration, deployment |

### Round Cycle (Continuous)

```
┌─────────────────────────────────────────────────────────────┐
│ ROUND N                                                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Spawn 15 agents (5 R&D + 5 White Paper + 5 Build)        │
│ 2. Agents execute tasks in parallel                          │
│ 3. Agents create ONBOARDING documents for successors        │
│ 4. Collect all outputs and onboarding docs                   │
│ 5. Push to repository (EVERY ROUND)                          │
│ 6. Orchestrator reads onboarding docs                        │
│ 7. Refine prompts for next round                             │
│ 8. Spawn Round N+1                                            │
└─────────────────────────────────────────────────────────────┘
```

### Agent Onboarding Protocol

**Every agent MUST create an onboarding document:**
- Location: `agent-messages/onboarding/{team}_{role}_round{N}.md`
- Content:
  1. What I discovered/accomplished
  2. Key files and code locations
  3. Blockers encountered
  4. Recommendations for successor
  5. Unfinished tasks
  6. Links to relevant research

### Current Progress

| Round | Status | Key Deliverables |
|-------|--------|------------------|
| 1-12 | ✅ Complete | Research foundations, GPU acceleration, community platform |
| 13-15 | ✅ Complete | Security fixes, white paper polish framework |
| 16-17 | ✅ Complete | Reader simulation testing, paper improvements |
| 18-19 | ✅ Complete | Final revisions, synthesis documentation |
| **SYNTHESIS** | 🔄 Active | Final paper drafts, roadmaps, completion strategy |
| 20-25 | 📋 Planned | Complete remaining papers, publication submission |

---

## ORCHESTRATOR IDENTITY

**Role:** I am **Orchestrator**, coordinating 12 agents per round across 25 rounds.

**Mission:**
1. ✅ Reverse engineer Claude in Excel integration concepts
2. ✅ Develop SuperInstance schema (every cell = any instance type)
3. ✅ Enhance SMP white paper with simulations and empirical validation
4. ✅ Design SMPbot architecture (Seed + Model + Prompt = Stable Output)
5. ✅ Integrate LOG-Tensor geometric research
6. ✅ Build production-ready implementations
7. 🔄 Complete final white papers (6/10 done, 4 with clear roadmaps)
8. 🔄 Synthesize 19 rounds of agent research into cohesive framework

**⚠️ CRITICAL: PUSH TO REPO EVERY ROUND**
- After each round completes, ALWAYS push changes to repository
- Command: `git add . && git commit -m "docs: Round N complete - [summary]" && git push`
- This prevents context loss and maintains backup of agent work

**Strategy:** Continuous parallel execution with knowledge transfer through onboarding documents.

---

## GEOMETRIC TENSOR MATHEMATICS PHILOSOPHY

**Core Insight:** Compass and Straightedge Construction mathematics become a powerful tool because they add single words to describe shapes from a higher abstraction than any one view can see.

**Key Principles:**
1. **Permutations, Folds, and Spin** - Set mathematical relationships without calculating
2. **Naming as Tiling** - Like cloud types (Cirrus, Nimbostratus), names tile possibilities into manageable decks
3. **Pythagorean Prime Numbers** - Whole number right triangles create "easy snaps" for calculation:
   - 3, 4, 5 → 36.87°
   - 5, 12, 13 → 22.62°
   - 8, 15, 17 → 28.07°
   - These are 2D analogs of Platonic solids in 3D
4. **Reality-Bending SuperInstance** - Make physics of universe fit the equations being used
5. **Little-Data vs Big-Data** - Each cell has little-data (understandable, controllable), not big-data like LLMs

**TensorFlow/PyTorch Study:** How they tease parameters into weights for simulation and scale data in training. Apply to compress equations in novel ways.

**Navigation Analogy:** Dead reckoning with compass, bucket with knotted lines, hourglass - we can find our way by knowing the seas from years of sailing and dreaming in vector simulator.

---

## MASTER REFERENCE FILES & VECTOR DB

**IMPORTANT:** Always start with these files to orient yourself and minimize context usage.

### Navigation & Quick Reference (Created 2026-03-10)
1. **INDEX_FEATURES.md** - 54 features at a glance with locations
2. **INDEX_RESEARCH.md** - 200+ research documents organized by domain
3. **INDEX_DOCUMENTATION.md** - 280+ documentation files organized by category
4. **SYSTEMS_SUMMARY.md** - 47 systems with quick descriptions
5. **R&D_PHASE_ONBOARDING_MASTER.md** - Complete onboarding guide
6. **VECTOR_DB_MAINTENANCE.md** - Vector DB setup and usage
7. **Vector Database (Qdrant)** - Semantic search of entire codebase

**USE THESE CONSTANTLY** to reduce context overhead:
- For system questions: Use SYSTEMS_SUMMARY.md
- For research questions: Use INDEX_RESEARCH.md
- For feature questions: Use INDEX_FEATURES.md
- For documentation questions: Use INDEX_DOCUMENTATION.md
- For methodology: Use R&D_PHASE_ONBOARDING_MASTER.md
- **For semantic search:** Use Vector DB (new!)

### Vector Database Queries - PROVEN EFFECTIVE IN ROUNDS 1 & 2

**Before reading large documents, search the vector DB first:**

```bash
# Search for specific concepts
python3 mcp_codebase_search.py search "confidence cascade tile system"

# Get all chunks from a file
python3 mcp_codebase_search.py
# Then: file SYSTEMS_SUMMARY.md

# Check DB status (ACTUAL STATS AS OF 2026-03-10)
python3 mcp_codebase_search.py stats
# Expected output:
# {
#   "collection": "polln-codebase",
#   "vectors_count": 51857,  # ACTUAL COUNT (not 2500 as previously estimated)
#   "model": "all-MiniLM-L6-v2",
#   "status": "ready"
# }
```

**In agent prompts:**
- stay within 100k context windows
- Don't assume you know where something is
- Run: `python3 mcp_codebase_search.py search "[your question]"`
- Use results to find most relevant files/code
- Reduces context needed by 10x
- **PROVEN:** Multiple agents successfully used vector DB in Rounds 1 & 2 for efficient research

**Example (Actual Agent Workflow):**
```python
# Instead of: Read entire 200-page white paper
# Do this:
results = search_codebase("How does confidence model work?")
# Returns 5 most relevant chunks from TILE_ALGEBRA_FORMAL.md, confidence-cascade.ts, etc.
# Read those instead - reduces reading from 200 pages to 5-10 pages

# Real example from SMP Theory Researcher:
# Searched: "SMP mathematical foundations", found formal definitions in TILE_ALGEBRA_FORMAL.md
# Searched: "confidence cascade mathematics", found implementation in confidence-cascade.ts
# Result: Complete mathematical analysis with minimal context overhead
```

**Vector DB Usage Evidence:**
- Agents reported using vector DB for efficient research in Round 1 & 2 reports
- Reduced context overhead by focusing on most relevant chunks
- Enabled discovery of related research across codebase
- Successfully guided agents to key mathematical definitions and implementations

---

## AGENT TEAM STRUCTURE (12 Agents Per Round)

### Teams & Focus
- **R&D Team (4 agents):** Research, discovery, synergy analysis
- **White Paper Team (4 agents):** Academic writing, formalization, diagrams
- **Build Team (4 agents):** Implementation, testing, integration

### Agent Template (All Teams)
```
You are [Role] on the [Team] Team (Round N).

1. Search vector DB for relevant context
2. Execute your primary task (research/writing/implementation)
3. Document findings in agent-messages/round{N}_[team]_[role].md
4. CREATE ONBOARDING: agent-messages/onboarding/[team]_[role]_round{N}.md

Onboarding must include:
- Key findings/accomplishments
- Critical file locations
- Blockers encountered
- Recommendations for successor
```

---

## WHITE PAPER TARGETS (10 Papers)

1. **Origin-Centric Data Systems (OCDS)** - S = (O, D, T, Φ)
2. **SuperInstance Type System** - Universal cell architecture
3. **Confidence Cascade Architecture** - Deadband triggers, intelligent activation
4. **Pythagorean Geometric Tensors** - Compass/straightedge mathematics
5. **SMPbot Architecture** - Seed + Model + Prompt = Stable Output
6. **Tile Algebra Formalization** - Composition, zones, confidence
7. **Rate-Based Change Mechanics** - x(t) = x₀ + ∫r(τ)dτ
8. **Laminar vs Turbulent Systems** - Flow dynamics in data
9. **Wigner-D Harmonics for SO(3)** - Geometric deep learning
10. **GPU Scaling Architecture** - Memory, batching, WGSL

---

## QUICK REFERENCE

### Key Directories
- `/src/spreadsheet/` - Core spreadsheet implementation
- `/src/superinstance/` - SuperInstance types
- `/docs/research/` - Research documents
- `/agent-messages/` - Agent outputs and onboarding
- `/white-papers/` - White paper sections

### Key Commands
```bash
# Vector DB search
python3 mcp_codebase_search.py search "your query"

# Push to repo (EVERY ROUND)
git add . && git commit -m "docs: Round N - summary" && git push

# Run tests
npm test
```

---

## ORCHESTRATOR CHECKLIST (Per Round)

- [ ] Read onboarding docs from previous round
- [ ] Refine agent prompts based on learnings
- [ ] Spawn 12 agents (4 R&D + 4 White Paper + 4 Build)
- [ ] Monitor agent progress
- [ ] Collect outputs and onboarding docs
- [ ] Push to repository
- [ ] Update progress table in CLAUDE.md

---

*Document prepared for 25-Round Continuous Orchestration*
*Started: 2026-03-10 | Current: Round 5*
*Mode: High-performance parallel execution*

