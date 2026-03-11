# POLLN + LOG-Tensor Unified R&D Phase Orchestrator Instructions
**Phase:** Deep Research & Development with Production Integration - ROUND 6 IN PROGRESS
**Start Date:** 2026-03-10
**Current Date:** 2026-03-11 (Round 6 Active)
**Progress:** Round 5 largely complete, Round 6 white papers in progress
**Focus:** 25-Round Orchestration with 12 Agents Per Round
**Mode:** Continuous parallel execution with agent succession onboarding

---

## 25-ROUND ORCHESTRATION PLAN

### Structure: 12 Agents Per Round (Half R&D, Half Implementation)

| Team | Agents | Focus |
|------|--------|-------|
| **R&D Team (System, Papers, Website)** | 6 | Research SuperInstance system, white papers, website (superinstance.ai) with Cloudflare integration |
| **Implementation Team (Code, Deployment)** | 6 | Implementation, code, tests, deployment to Cloudflare, production readiness |

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
| **5** | ✅ **Complete** | Confidence Cascade, SMPbot Architecture, Tile Algebra white papers; SuperInstance implementations; GPU analysis; Test suites |
| **6** | 🔄 **In Progress** | Rate-Based Change Mechanics white paper complete; Mathematical appendix; Diagrams; Integration |
| 7-25 | 📋 Planned | Continuous R&D, white papers, implementation |

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
7. Develop superinstance.ai website with Cloudflare integration
8. Deploy system to Cloudflare (free tier, then paid for Docker container)

**⚠️ CRITICAL: PUSH TO REPO DAILY**
- Push changes to repository DAILY (or after significant output)
- Command: `git add . && git commit -m "docs: Daily progress - [summary]" && git push`
- This prevents context loss and maintains backup of agent work

**Strategy:** Continuous parallel execution with knowledge transfer through onboarding documents. Maintain 12 active agents at all times - when one finishes, spawn another immediately.

---
## LOG (LEDGER-ORIENTING-GRAPH) ADVANCED RESEARCH AGENDA

**Updated Definition:** LOG now stands for **Ledger-Orienting-Graph** (previously Ledger-Organizing Graph). This captures the geometric nature with orientation of higher dimensions that can be abstracted for advanced mathematical operations.

**Core Geometric Insight:** LOG tensors embed geometric properties for mathematical precalculations through reality-bending tensor constructs. By compressing and encoding universe properties into tensors, coordinate changes make mathematics trivial compared to standard tensors.

### Key Research Areas for LOG Integration:

1. **Advanced Mathematical Frameworks:**
   - **Permutation Logic & Set Theory** - Abstracting higher-dimensional orientations
   - **Geometric Langlands Conjecture** - Connections to representation theory
   - **Optimal Sphere Packing** → **Platonic Solids** for tensor geometry
   - **The "Einstein" Tile** - Aperiodic tiling mathematics
   - **Enumerative Geometry & Top-Dimensional Objects**
   - **New "Noperthedron" Shape** and implications for tensor theory

2. **Origami & Folding Mathematics:**
   - **Bloom Patterns in Origami** - Implications for tensor folding/compression
   - **Pavel Galashin's Work** on cluster algebras and folding
   - **DNA Origami Nanorobots** - Programmable folding at molecular scale
   - **Autonomous & Electronics-Free Soft Robots**
   - **Bendable Ceramics & Self-Folding Structures**
   - **Molecular Origami** - Protein folding analogies

3. **Color Theory & Perception Mathematics:**
   - **Completion of Schrödinger's Color Theory**
   - **Oklab Color Space** - Perceptually uniform color representation
   - **Discovery of "OLO" and Supernatural Colors**
   - **Resolution of the Hadwiger-Nelson Problem**
   - **Structural "Schrödinger Colors"** - Deep mathematics of color perception

4. **Institutional Research Integration:**
   - **Institute for Advanced Study** (Princeton) - Foundational mathematics
   - **Simons Foundation** - Mathematics, physical sciences, life sciences
   - **Simons Institute for the Theory of Computing** (Berkeley)
   - **Simons Institute for the Study of Living Systems** (biological mathematics)

5. **Geometric Compression & Brain Mathematics:**
   - **arXiv:2003.01355** - Geometric compression of data
   - **Mathematics of the Brain** - Neural geometry and computation
   - **Mathematics of the Universe** - Cosmological geometry

**Research Methodology:** Study all these areas in the context of LOG tensor system with geometric properties baked into tensors. Focus on higher-level extrapolation of abstractions for giving words to large movements of cells in a "murmuration of logic" through SuperInstance expanding cells for granular clarity.

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

## WEBSITE & CLOUDFLARE DEPLOYMENT

**Website:** superinstance.ai
**Cloudflare Status:** Connected (free tier), Docker container planned for paid membership
**Current State:** Audit needed - document what exists and what needs to be built

**Immediate Actions:**
1. **Audit Current Website:** What exists at superinstance.ai? Structure, content, technology stack
2. **Cloudflare Integration:** Review current Cloudflare setup (DNS, Workers, Pages, etc.)
3. **Deployment Pipeline:** Establish CI/CD from repository to Cloudflare
4. **Content Strategy:** Plan website content: landing page, documentation, demos, blog
5. **Performance Monitoring:** Set up analytics, uptime monitoring, error tracking

**Free Tier Limitations & Paid Upgrade Path:**
- **Free Tier:** Static sites, Workers (100k requests/day), Pages (builds), DNS
- **Paid Tier Needed For:** Docker containers, higher limits, advanced features
- **Upgrade Strategy:** Start with free tier, identify when paid features become necessary

**Website Sections Required:**
1. **Landing Page:** Value proposition, features, call-to-action
2. **Documentation:** API references, guides, tutorials
3. **Demos:** Interactive SuperInstance examples
4. **Blog:** Technical articles, research updates
5. **Community:** Forum, discussion, contribution guidelines

**Deployment Strategy:**
1. Use Cloudflare Pages for static site deployment
2. Cloudflare Workers for dynamic functionality
3. GitHub integration for automatic deployments
4. Environment management (staging vs production)

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

## AGENT TEAM STRUCTURE (12 Agents Per Round - Half R&D, Half Implementation)

### R&D Team - System, Papers, Website (6 Agents)
1. **System Architect** - Design SuperInstance system architecture and components
2. **White Paper Lead** - Coordinate white paper creation and publication strategy
3. **Website Developer** - Build and maintain superinstance.ai website with Cloudflare integration
4. **Content Strategist** - Create technical content, documentation, and marketing materials
5. **Research Analyst** - Analyze system requirements and user needs
6. **SEO & Analytics Specialist** - Optimize website visibility and track performance

### Implementation Team - Code, Deployment (6 Agents)
1. **Frontend Developer** - Implement SuperInstance UI components and user interface
2. **Backend Developer** - Build server-side logic, APIs, and data management
3. **DevOps Engineer** - Set up Cloudflare deployment, CI/CD, and infrastructure
4. **Quality Assurance Engineer** - Testing, validation, and bug fixing
5. **Performance Optimizer** - Optimize code for speed, memory, and scalability
6. **Security Specialist** - Implement security best practices and vulnerability scanning

### Agent Prompts (Streamlined)

**R&D Team Agent Template (System, Papers, Website):**
```
You are [Role] on the R&D Team (Round N).

1. Focus on your specific domain: System Architecture, White Papers, or Website (superinstance.ai)
2. Search vector DB for relevant topics (python3 mcp_codebase_search.py search "[topic]")
3. Analyze current state and identify gaps/improvements
4. Document findings in agent-messages/round{N}_rd_{role}.md (concise, actionable)
5. CREATE ONBOARDING: agent-messages/onboarding/rd_{role}_round{N}.md

Onboarding Structure (5 sections, < 2,000 tokens):
1. Executive Summary: 3-5 bullet points of key accomplishments
2. Essential Resources: 3-5 key file paths with brief descriptions
3. Critical Blockers: Top 2-3 blockers with impact assessment
4. Successor Priority Actions: Top 3 tasks for immediate focus
5. Knowledge Transfer: 2-3 most important insights/patterns

Focus on actionable information. Avoid long narratives.
```

**Implementation Team Agent Template (Code, Deployment):**
```
You are [Role] on the Implementation Team (Round N).

1. Focus on your specific domain: Frontend, Backend, DevOps, QA, Performance, or Security
2. Read specifications from white-papers/ and research
3. Implement in src/ (follow existing patterns) or set up deployment (Cloudflare)
4. Run tests, fix errors (npm test, cloudflare deploy)
5. CREATE ONBOARDING: agent-messages/onboarding/impl_{role}_round{N}.md

Onboarding Structure (5 sections, < 2,000 tokens):
1. Executive Summary: 3-5 bullet points of key implementations
2. Essential Resources: 3-5 key source files changed/created
3. Critical Issues: Top 2-3 technical challenges encountered
4. Successor Priority Actions: Top 3 tasks for next implementer
5. Knowledge Transfer: 2-3 technical patterns/insights

Focus on code patterns, deployment processes, and technical decisions.
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

**WEBSITE & DEPLOYMENT TRACKING:**
- [ ] Audit current superinstance.ai website status
- [ ] Document Cloudflare integration and configuration
- [ ] Plan website content and structure
- [ ] Set up deployment pipeline to Cloudflare
- [ ] Monitor website performance and analytics

---

*Document prepared for 25-Round Continuous Orchestration*
*Started: 2026-03-10 | Current: Round 6 (Website & Implementation Focus)*
*Mode: High-performance parallel execution with Cloudflare deployment*
