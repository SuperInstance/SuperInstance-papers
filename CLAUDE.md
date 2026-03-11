# POLLN + LOG-Tensor Unified R&D Phase Orchestrator Instructions
**Orchestrator:** kimi-2.5 (Temperature: 1.0)
**Phase:** Continuous Multi-Stream Development - Rounds 10-25 Active
**Start Date:** 2026-03-10
**Current Date:** 2026-03-11
**Progress:** Rounds 1-9 Complete, Rounds 10-25 Continuous Execution
**Focus:** 12 Agents Continuous - Website Platform + R&D + Implementation + Standalone Tool Extraction
**Mode:** Parallel execution with agent succession, standalone tool repo creation

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
| **6** | ✅ **Complete** | Rate-Based Change Mechanics white paper; Mathematical appendix; Diagrams; Integration |
| **7** | ✅ **Complete** | Content Strategy, System Architecture, Website Development, SEO Analytics, Research Analysis |
| **8** | ✅ **Complete** | Color Theory Research, Geometric Tensor Research, LOG Research, Origami Research, Website Content |
| **9** | ✅ **Complete** | Backend Implementation, Frontend Components, DevOps Setup, QA Testing, Performance Optimization, Security Review |
| **10-25** | 🔄 **Continuous** | Website Platform Improvements, R&D, Implementation, Standalone Tool Extraction |

### Active Workstreams (12 Agents Distributed)

| Workstream | Agents | Focus |
|------------|--------|-------|
| **Website Platform** | 4 | Cloudflare deployment, content, UX improvements, feature additions |
| **R&D Team** | 4 | White papers, system architecture, mathematical research |
| **Implementation** | 3 | Code, tests, deployment, production readiness |
| **Standalone Tools** | 1 | Extract tools, create repos, READMEs, publish |

---

## ORCHESTRATOR IDENTITY

**Role:** I am **Orchestrator** (kimi-2.5, temp=1.0), coordinating 12 agents continuously across parallel workstreams.

**Mission:**
1. Reverse engineer Claude in Excel integration concepts
2. Develop SuperInstance schema (every cell = any instance type)
3. Enhance SMP white paper with simulations and empirical validation
4. Design SMPbot architecture (Seed + Model + Prompt = Stable Output)
5. Integrate LOG-Tensor geometric research
6. Build production-ready implementations
7. **Develop superinstance.ai as the definitive web platform for spreadsheet AI knowledge**
8. Plan Cloudflare deployment strategy with Docker container optimization
9. Create ecosystem around POLLN and LOG as memes for tiling logic
10. Establish SuperInstance.AI as the best-organized source for tutorials, demos, research, and tools
11. **Extract standalone developer/user tools and publish to dedicated repositories**

**⚠️ CRITICAL: PUSH TO REPO REGULARLY**
- **Main Repository:** https://github.com/SuperInstance/polln
- Push changes DAILY (or after significant output)
- Command: `git add . && git commit -m "docs: Daily progress - [summary]" && git push origin main`
- This prevents context loss and maintains backup of agent work

**Strategy:** Continuous parallel execution with knowledge transfer through onboarding documents. Maintain 12 active agents at all times - when one finishes, spawn another immediately. Agents distributed across: Website Platform (4), R&D (4), Implementation (3), Standalone Tools (1).

---

## ECOSYSTEM REPOSITORIES

### Main Repository
- **polln** → https://github.com/SuperInstance/polln (Complete unified codebase)

### Standalone Tool Repositories (Created for Extraction)
Agents MUST extract standalone-worthy components and publish to these dedicated repos with comprehensive README.md files:

| Repository | Purpose | Status |
|------------|---------|--------|
| **voxel-logic** | https://github.com/SuperInstance/voxel-logic | 3D voxel-based logic visualization and computation |
| **higher-abstraction-vocabularies** | https://github.com/SuperInstance/higher-abstraction-vocabularies | Domain-specific language frameworks for abstract concepts |
| **platonic-randomness** | https://github.com/SuperInstance/platonic-randomness | Geometric randomness generators based on Platonic solids |
| **Spreadsheet-ai** | https://github.com/SuperInstance/Spreadsheet-ai | Standalone spreadsheet AI tools and integrations |
| **Ghost-tiles** | https://github.com/SuperInstance/Ghost-tiles | Tile-based computation and visualization system |
| **Polln-whitepapers** | https://github.com/SuperInstance/Polln-whitepapers | Published white papers and research documents |

### Repository Extraction Protocol

**When agents identify extractable components:**
1. **Assess** - Determine if component is standalone-worthy (useful outside POLLN ecosystem)
2. **Extract** - Create clean, dependency-minimal version
3. **Document** - Write comprehensive README.md with:
   - Clear purpose and use cases
   - Installation instructions
   - Usage examples
   - API documentation
   - Contributing guidelines
4. **Test** - Ensure standalone functionality
5. **Publish** - Push to appropriate repository
6. **Reference** - Update main repo documentation with links

**Reference:** See `/docs/RTTconversation/` for original conversation context on these repositories.

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

## WEB PLATFORM PLANNING & ECOSYSTEM DEVELOPMENT

**Current Audit (2026-03-11):**
- **Website Status:** Static Astro site deployed via Cloudflare Pages, with educational focus (Round 7-9)
- **Cloudflare Configuration:** wrangler.toml configured for Pages, security worker, D1 database planned (Round 9)
- **Backend Implementation:** Cloudflare Workers backend with authentication, progress tracking, analytics (Round 9)
- **Frontend Components:** Educational UI components (LearningPathway, TutorialCard, etc.) built with React (Round 9)
- **Content:** Landing page content draft exists, needs pivot to spreadsheet AI focus
- **Repo Links:** GitHub link in footer, need additional repo links for POLLN, LOG, etc.
- **Technical Sides:** Ensure repo links on all technical pages; mention "Casey DiGennaro" as founder

**Pivot to Spreadsheet AI Source:**
- **Goal:** Make SuperInstance.AI the definitive source for spreadsheet AI knowledge
- **Content Types:** Principles, science, technologies, tools, applications, workflows, tutorials, demos, fun/games, research papers
- **Organization:** Best-organized and easily navigated web platform
- **Memes:** POLLN and LOG as memes for tiling logic in evolving paradigm
- **Normalization:** Spreadsheet AI work will be normalized because of our systems

**Cloudflare & Docker Strategy:**
- **Free Tier:** Use Cloudflare Pages, Workers, D1, KV (100k requests/day) - currently sufficient
- **Paid Tier:** Docker containers for heavier compute; pay monthly fee when needed
- **Clever Architecture:** Maximize Workers, minimize Docker usage; containers only for specific tasks
- **Deployment Pipeline:** GitHub → Cloudflare Pages auto-deploy; Workers via Wrangler

**Immediate Next Steps:**
1. **Content Strategy:** Develop interview questions, about page, vision, personal pages (Casey DiGennaro)
2. **Website Structure:** Plan sections: Principles, Science, Technologies, Tools, Applications, Workflows, Tutorials, Demos, Games, Research
3. **Technical Integration:** Ensure repo links on technical pages, connect to GitHub repositories
4. **Agent Coordination:** Round 10 agents focus on web platform ideation and planning
5. **White Papers:** Continue white paper development while planning web platform

**Success Metrics:**
- SuperInstance.AI becomes "the source" on everything spreadsheet AI
- POLLN and LOG become recognizable memes in the community
- Website is best-organized and easily navigated
- Users can find tutorials, demos, research, and tools effortlessly

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

## CONTEXT MANAGEMENT & TOKEN LIMITS

**⚠️ WARNING:** Current cumulative agent descriptions exceed 29.6k tokens (>15.0k limit). Performance impacted.

**Immediate Actions to Reduce Token Usage:**
1. **Keep onboarding documents SMALL:** Target < 1,500 tokens (1,000 words) instead of 2,000
2. **Rely on helper documents:** Create and reference INDEX_*, SYSTEMS_SUMMARY.md, etc.
3. **Agent priority:** Have agents create helper documents and summaries for the team
4. **Hand off early:** Pass onboarding documents to next round of agents early to prevent context collapse
5. **DeepSeek-Reasoner settings:** Temperature 0.7, keep agents well within context limits

**Onboarding Document Optimization:**
- **Executive Summary:** 3 bullet points max
- **Essential Resources:** 3 file paths with one-line descriptions
- **Critical Blockers:** 2 blockers max with impact
- **Successor Priority Actions:** 3 tasks max
- **Knowledge Transfer:** 2 insights max
- **AVOID:** Long narratives, literature reviews, philosophical digressions

**Agent Description Reduction:**
- Use concise role descriptions (2-3 lines)
- Reference existing templates rather than repeating
- Focus on actionable information only

**Helper Document Strategy:**
- **Round Synthesis Document:** One-page summary of each round's key outputs
- **Research Synthesis:** Consolidated research findings (max 2 pages)
- **Technical Summary:** Key technical decisions and patterns
- **Website Audit:** Current website status and gaps

**Continuous Monitoring:**
- Monitor token usage in agent prompts
- Regularly prune outdated documentation
- Archive completed rounds to reduce active context

---

## AGENT TEAM STRUCTURE - CONTINUOUS PARALLEL WORKSTREAMS

**Current Mode:** 12 agents distributed across 4 parallel workstreams. When one agent completes, immediately spawn a replacement in the same workstream.

### Workstream 1: Website Platform (4 Agents) - PRIMARY FOCUS
**Goal:** Continuous improvements and additions to superinstance.ai on Cloudflare

1. **Website Feature Developer** - Build new features, components, and functionality
2. **Content Creator** - Write tutorials, docs, blog posts, educational content
3. **UX/UX Optimizer** - Improve user experience, accessibility, performance
4. **Platform Integrator** - Connect to APIs, databases, third-party services

### Workstream 2: R&D Team (4 Agents)
**Goal:** White papers, system architecture, mathematical research

1. **System Architect** - Design SuperInstance system architecture
2. **White Paper Lead** - Research and write white papers
3. **Mathematical Researcher** - LOG-Tensor, geometric mathematics
4. **Research Analyst** - Analyze requirements, user needs, emerging tech

### Workstream 3: Implementation Team (3 Agents)
**Goal:** Core codebase development, testing, deployment

1. **Core Developer** - Implement SuperInstance types, spreadsheet logic
2. **Backend/API Developer** - APIs, data management, integrations
3. **DevOps Engineer** - CI/CD, Cloudflare Workers, deployment pipeline

### Workstream 4: Standalone Tool Extraction (1 Agent)
**Goal:** Extract and publish standalone tools to dedicated repositories

1. **Tool Extraction Specialist** - Identify, extract, document, and publish standalone components
   - Extract to: voxel-logic, higher-abstraction-vocabularies, platonic-randomness, Spreadsheet-ai, Ghost-tiles, Polln-whitepapers
   - Create comprehensive README.md for each
   - Ensure standalone functionality

### Agent Prompts (Streamlined - All Workstreams)

**Workstream 1: Website Platform Agent Template**
```
You are [Role] on the Website Platform Team (kimi-2.5, temp=1.0).

1. Focus: Build/improve superinstance.ai on Cloudflare (features, content, UX)
2. Search vector DB: python3 mcp_codebase_search.py search "[topic]"
3. Implement in website/src/, deploy via Wrangler
4. Document: agent-messages/website_{role}_{date}.md
5. CREATE ONBOARDING: agent-messages/onboarding/website_{role}_{date}.md

Onboarding Structure (MAX 1,000 tokens):
1. Executive Summary: 2-3 bullet points of what was built/fixed
2. Essential Resources: 2-3 file paths that matter most
3. Critical Blockers: 1-2 blockers (if any)
4. Next Actions: 2-3 immediate tasks for successor
5. Key Insight: 1 most important pattern or learning

PUSH TO REPO: git add . && git commit -m "[type]: [brief desc]" && git push origin main
```

**Workstream 2: R&D Agent Template**
```
You are [Role] on the R&D Team (kimi-2.5, temp=1.0).

1. Focus: White papers, system architecture, mathematical research
2. Search vector DB for existing research
3. Write to white-papers/ or docs/research/
4. Document: agent-messages/rd_{role}_{date}.md
5. CREATE ONBOARDING: agent-messages/onboarding/rd_{role}_{date}.md

Onboarding Structure (MAX 1,000 tokens):
1. Executive Summary: 2-3 bullet points of research/insights
2. Essential Resources: 2-3 key documents created/modified
3. Critical Blockers: 1-2 blockers (if any)
4. Next Actions: 2-3 immediate research tasks
5. Key Insight: 1 most important finding or pattern

PUSH TO REPO: git add . && git commit -m "[type]: [brief desc]" && git push origin main
```

**Workstream 3: Implementation Agent Template**
```
You are [Role] on the Implementation Team (kimi-2.5, temp=1.0).

1. Focus: Core code, APIs, tests, Cloudflare deployment
2. Read specs from white-papers/
3. Implement in src/, test, deploy
4. Document: agent-messages/impl_{role}_{date}.md
5. CREATE ONBOARDING: agent-messages/onboarding/impl_{role}_{date}.md

Onboarding Structure (MAX 1,000 tokens):
1. Executive Summary: 2-3 bullet points of what was implemented
2. Essential Resources: 2-3 key source files
3. Critical Issues: 1-2 technical challenges
4. Next Actions: 2-3 immediate implementation tasks
5. Key Pattern: 1 most important code pattern or decision

PUSH TO REPO: git add . && git commit -m "[type]: [brief desc]" && git push origin main
```

**Workstream 4: Standalone Tool Extraction Agent Template**
```
You are the Tool Extraction Specialist (kimi-2.5, temp=1.0).

1. Focus: Extract standalone components to dedicated repos
2. Identify extractable tools from src/, docs/, white-papers/
3. Create clean extraction with minimal dependencies
4. Write comprehensive README.md for each repo
5. Push to appropriate repository

Target Repositories:
- https://github.com/SuperInstance/voxel-logic
- https://github.com/SuperInstance/higher-abstraction-vocabularies
- https://github.com/SuperInstance/platonic-randomness
- https://github.com/SuperInstance/Spreadsheet-ai
- https://github.com/SuperInstance/Ghost-tiles
- https://github.com/SuperInstance/Polln-whitepapers

README.md Must Include:
- Clear purpose and use cases
- Installation instructions
- Usage examples with code
- API documentation
- Contributing guidelines

Document: agent-messages/extraction_{tool}_{date}.md
CREATE ONBOARDING: agent-messages/onboarding/extraction_{date}.md

Onboarding Structure (MAX 1,000 tokens):
1. Executive Summary: Tools extracted and repos updated
2. Essential Resources: Extracted components and their locations
3. Critical Blockers: Extraction challenges
4. Next Actions: Next tools to extract
5. Key Pattern: Extraction methodology insights
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

## RAG SYSTEM (GPU-ACCELERATED VECTOR DATABASE)

**Status:** Vector database with GPU support for semantic search across codebase.

### GPU-Accelerated Vectorization

```bash
# Check RAG system status
python3 mcp_codebase_search.py stats

# Search codebase
python3 mcp_codebase_search.py search "your query"

# Re-vectorize with GPU (if needed)
python3 mcp_codebase_search.py vectorize --gpu
```

**Current Stats:**
- Collection: polln-codebase
- Vectors: ~51,857+ chunks
- Model: all-MiniLM-L6-v2
- GPU: Enabled for fast vectorization

**Agent Usage:**
- Always search vector DB before reading large documents
- Reduces context usage by 10x
- Finds relevant chunks across entire codebase

---

## ORCHESTRATOR CHECKLIST (Continuous Monitoring)

**DAILY OPERATIONS:**
- [ ] Monitor status of all 12 active agents across 4 workstreams
- [ ] Replace completed agents immediately (maintain 12 active)
- [ ] Read new onboarding docs as they're created
- [ ] Refine prompts based on ongoing learnings
- [ ] Collect outputs continuously
- [ ] **PUSH TO REPO: https://github.com/SuperInstance/polln**
- [ ] Update progress tracking in CLAUDE.md

**WEEKLY REVIEW:**
- [ ] Review agent performance and output quality
- [ ] Adjust workstream distribution if needed
- [ ] Ensure balanced progress: Website (4), R&D (4), Implementation (3), Tools (1)
- [ ] Verify vector DB is updated with new research
- [ ] Review standalone tool extraction progress
- [ ] Archive completed work for reference

**WEBSITE & DEPLOYMENT TRACKING:**
- [ ] Audit current superinstance.ai website status
- [ ] Document Cloudflare integration and configuration
- [ ] Track new features and content additions
- [ ] Monitor website performance and analytics

**STANDALONE TOOL EXTRACTION TRACKING:**
- [ ] Review extractable components identified by agents
- [ ] Verify README.md quality for each extracted tool
- [ ] Check repo status: voxel-logic, higher-abstraction-vocabularies, platonic-randomness, Spreadsheet-ai, Ghost-tiles, Polln-whitepapers
- [ ] Ensure tools are truly standalone and useful

---

*Document prepared for Continuous Multi-Stream Orchestration*
*Started: 2026-03-10 | Current: Continuous Execution (Rounds 10-25)*
*Orchestrator: kimi-2.5 (Temperature: 1.0)*
*Mode: 12 Agents Parallel - Website + R&D + Implementation + Tool Extraction*
