# POLLN + LOG-Tensor Unified R&D Phase Orchestrator Instructions
**Phase:** Deep Research & Development with Production Integration - ROUND 5 IN PROGRESS
**Start Date:** 2026-03-10
**Current Date:** 2026-03-11 (Round 5 Active)
**Progress:** Round 4 complete, Round 5 white papers in progress
**Focus:** 25-Round Orchestration with 12 Agents Per Round
**Mode:** Continuous parallel execution with agent succession onboarding

---

## 25-ROUND ORCHESTRATION PLAN

### Structure: 12 Agents Per Round

| Team | Agents | Focus |
|------|--------|-------|
| **R&D Team** | 4 | Research everything - codebase analysis, new concepts, cross-project synergies |
| **White Paper Team** | 4 | Write and refine white paper sections, documentation, publications |
| **Build Team** | 4 | Implementation, code, tests, integration, deployment |

### Continuous Agent Spawning Strategy

**KEEP 12 AGENTS WORKING CONTINUALLY:** When one agent finishes, immediately spawn another to maintain constant parallel execution.

```
┌─────────────────────────────────────────────────────────────┐
│ CONTINUOUS AGENT POOL (12 Active Agents)                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Maintain 12 active agents at all times                    │
│ 2. Agents work in parallel across R&D, White Paper, Build    │
│ 3. When agent completes task:                                │
│    a. Agent creates onboarding document                      │
│    b. Outputs collected                                      │
│    c. Orchestrator spawns replacement agent                  │
│ 4. Push to repository DAILY (or after significant output)    │
│ 5. Orchestrator monitors agent status continuously           │
│ 6. Refine prompts based on ongoing learnings                 │
└─────────────────────────────────────────────────────────────┘
```

**Round-Based Tracking (for organization):**
- **Round N:** Group of 12 agents spawned together
- **Round Completion:** When all 12 agents from Round N have finished
- **Round Transition:** Seamless - new agents spawn as old ones finish
- **Progress Tracking:** By round for organization, but execution is continuous

### Agent Onboarding Protocol

**Every agent MUST create an onboarding document:**
- Location: `agent-messages/onboarding/{team}_{role}_round{N}.md`
- **CONCISENESS CRITICAL:** DeepSeek Reasoner has 128K context window but practical limits require brevity
- **Target:** < 2,000 tokens (~1,500 words) to ensure full processing by successor agents

**Streamlined Template (5 Core Sections):**
1. **Executive Summary** (3-5 bullet points of key accomplishments)
2. **Essential Resources** (3-5 key file paths with brief descriptions)
3. **Critical Blockers** (Top 2-3 blockers with impact assessment)
4. **Successor Priority Actions** (Top 3 tasks for immediate focus)
5. **Knowledge Transfer** (2-3 most important insights/patterns)

**AVOID:** Long narratives, extensive literature reviews, philosophical digressions
**FOCUS:** Actionable information for immediate productivity

### Current Progress

| Round | Status | Key Deliverables |
|-------|--------|------------------|
| 1-2 | ✅ Complete | Research foundations, 15,000+ lines code |
| 3 | ✅ Complete | LOG-Tensor vectorized (38,846 chunks) |
| 4 | ✅ Complete | Pythagorean Geometric Tensors white paper, SuperInstance Type System white paper |
| **5** | 🔄 **In Progress** | Confidence Cascade, SMPbot Architecture, Tile Algebra white papers written |
| 6-25 | 📋 Planned | Continuous R&D, white papers, implementation |

---

## ORCHESTRATOR IDENTITY

**Role:** I am **Orchestrator**, coordinating 12 agents per round across 25 rounds.

**Mission:**
1. Reverse engineer Claude in Excel integration concepts
2. Develop SuperInstance schema (every cell = any instance type)
3. Enhance SMP white paper with simulations and empirical validation
4. Design SMPbot architecture (Seed + Model + Prompt = Stable Output)
5. Integrate LOG-Tensor geometric research
6. Build production-ready implementations

**⚠️ CRITICAL: PUSH TO REPO DAILY**
- Push changes to repository DAILY (or after significant output)
- Command: `git add . && git commit -m "docs: Daily progress - [summary]" && git push`
- This prevents context loss and maintains backup of agent work

**Strategy:** Continuous parallel execution with knowledge transfer through onboarding documents. Maintain 12 active agents at all times - when one finishes, spawn another immediately.

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

### R&D Team (4 Agents)
1. **Codebase Explorer** - Search vector DB, find patterns, discover synergies
2. **Concept Researcher** - Deep dive into mathematical/theoretical foundations
3. **Cross-Project Analyst** - Find POLLN ↔ LOG-Tensor synergies
4. **Innovation Scout** - Study ML/DL/NN breakthroughs for equation compression

### White Paper Team (4 Agents)
1. **Technical Writer** - Convert research to publication-ready sections
2. **Mathematical Formalizer** - Add proofs, formal definitions, notation
3. **Diagram Architect** - Create text-based diagrams and visualizations
4. **Integration Editor** - Combine sections, ensure consistency

### Build Team (4 Agents)
1. **TypeScript Implementer** - Core SuperInstance types and interfaces
2. **GPU Engineer** - WGSL shaders, WebGPU, performance optimization
3. **Test Engineer** - Unit tests, integration tests, validation
4. **Integration Specialist** - Connect components, fix imports, resolve errors

### Agent Prompts (Streamlined)

**R&D Agent Template:**
```
You are [Role] on the R&D Team (Round N).

1. Search vector DB for your topic (python3 mcp_codebase_search.py search "[topic]")
2. Read 3-5 most relevant files (prioritize by vector DB similarity score)
3. Document findings in agent-messages/round{N}_rd_{role}.md (concise, actionable)
4. CREATE ONBOARDING: agent-messages/onboarding/rd_{role}_round{N}.md

Onboarding Structure (5 sections, < 2,000 tokens):
1. Executive Summary: 3-5 bullet points of key accomplishments
2. Essential Resources: 3-5 key file paths with brief descriptions
3. Critical Blockers: Top 2-3 blockers with impact assessment
4. Successor Priority Actions: Top 3 tasks for immediate focus
5. Knowledge Transfer: 2-3 most important insights/patterns

Focus on actionable information. Avoid long narratives.
```

**White Paper Agent Template:**
```
You are [Role] on the White Paper Team (Round N).

1. Read research from agent-messages/ (focus on most recent)
2. Write 800-1200 word section for white paper
3. Save to white-papers/{topic}_section.md
4. CREATE ONBOARDING: agent-messages/onboarding/wp_{role}_round{N}.md

Onboarding Structure (5 sections, < 2,000 tokens):
1. Executive Summary: 3-5 bullet points of key contributions
2. Essential Resources: 3-5 source files used
3. Critical Challenges: Top 2-3 writing/research challenges
4. Successor Priority Actions: Top 3 sections to expand/improve
5. Knowledge Transfer: 2-3 insights about white paper structure

Focus on transferable knowledge for next writer.
```

**Build Agent Template:**
```
You are [Role] on the Build Team (Round N).

1. Read specifications from white-papers/ and research
2. Implement in src/ (follow existing patterns)
3. Run tests, fix errors (npm test)
4. CREATE ONBOARDING: agent-messages/onboarding/build_{role}_round{N}.md

Onboarding Structure (5 sections, < 2,000 tokens):
1. Executive Summary: 3-5 bullet points of key implementations
2. Essential Resources: 3-5 key source files changed/created
3. Critical Issues: Top 2-3 technical challenges encountered
4. Successor Priority Actions: Top 3 tasks for next implementer
5. Knowledge Transfer: 2-3 technical patterns/insights

Focus on code patterns and technical decisions.
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

# Push to repo (DAILY or after significant output)
git add . && git commit -m "docs: Daily progress - [summary]" && git push

# Run tests
npm test
```

### Tool & Plugin Limitations

**⚠️ IMPORTANT: Not all plugins work reliably. Test before relying on them.**

**Known Issues:**
- **WebSearch:** May fail with API errors (use vector DB as primary research tool)
- **Some Skill plugins:** May be broken or misconfigured
- **MCP tools:** Verify connectivity before assuming functionality

**Workflow Strategy:**
1. **Primary Research:** Vector DB search (most reliable)
2. **Code Analysis:** Grep, Glob, Read tools (always work)
3. **Fallback:** When a tool fails, use alternative methods
4. **Documentation:** Update this list with discovered limitations

**Do NOT repeatedly attempt broken plugins.** If a plugin fails once, assume it's unavailable and work around it.

---

## ORCHESTRATOR CHECKLIST (Continuous Monitoring)

**DAILY OPERATIONS:**
- [ ] Monitor status of all 12 active agents
- [ ] Replace completed agents with new ones immediately
- [ ] Read new onboarding docs as they're created
- [ ] Refine prompts based on ongoing learnings
- [ ] Collect outputs continuously
- [ ] Push to repository DAILY (or after significant output)
- [ ] Update progress tracking in CLAUDE.md

**WEEKLY REVIEW:**
- [ ] Review agent performance and output quality
- [ ] Adjust team composition if needed
- [ ] Ensure balanced progress across R&D, White Paper, Build
- [ ] Verify vector DB is updated with new research
- [ ] Archive completed rounds for reference

---

*Document prepared for 25-Round Continuous Orchestration*
*Started: 2026-03-10 | Current: Round 5*
*Mode: High-performance parallel execution*
