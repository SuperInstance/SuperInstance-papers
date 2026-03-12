# POLLN Ecosystem Orchestrator Instructions
**Orchestrator:** kimi-2.5 (Temperature: 1.0)
**Phase:** Production Deployment & Continuous Development
**Status:** Rounds 10-13 Complete, 20+ Rounds Total
**Date:** 2026-03-11
**Mode:** 12 Agents Continuous Across 4 Workstreams

---

## QUICK REFERENCE

| Resource | Location | Purpose |
|----------|----------|---------|
| **Main Repo** | https://github.com/SuperInstance/polln | Complete ecosystem |
| **Website** | https://superinstance.ai | Production platform |
| **Audit** | `COMPREHENSIVE_AUDIT.md` | Full system status |
| **White Papers** | `white-papers/` | 4 of 10 complete |
| **Vector DB** | Qdrant (51,857+ chunks) | Semantic search |
| **RAG Search** | `python3 mcp_codebase_search.py search "query"` | Find anything |

---

## CURRENT STATE (Post-Round 13)

### ✅ Achievements
- **4 White Papers** complete (OCDS, SuperInstance, Confidence Cascade, Pythagorean)
- **12,100+ lines** production code
- **705+ tests** comprehensive coverage
- **109+ API endpoints** across all services
- **19 SuperInstance types** implemented
- **GPU acceleration** researched & implemented (300-400x speedup)
- **Community platform** built (forum, formula sharing, gamification)
- **Interactive demos** 3 visualizations live
- **6 tutorials** (beginner + advanced)

### ⚠️ Critical Issues
1. **Security:** API auth middleware not connected (CRITICAL)
2. **GitHub:** Push blocked by workflow permissions
3. **Deadline:** PODC 2026 submission (March 31)

---

## ECOSYSTEM REPOSITORIES

### Main Repository
- **polln** → https://github.com/SuperInstance/polln
  - Complete unified codebase
  - All white papers
  - Full implementation
  - Comprehensive tests

### Standalone Tool Repositories
| Repository | Package | Status |
|------------|---------|--------|
| confidence-cascade | @superinstance/confidence-cascade | ✅ Ready for npm |
| stigmergy | @superinstance/stigmergy | ✅ Ready for npm |
| voxel-logic | (planned) | 📝 Template ready |
| platonic-randomness | (planned) | 📝 Template ready |
| higher-abstraction-vocabularies | (planned) | 📝 Future |
| Ghost-tiles | (planned) | 📝 Future |

### White Paper Repositories
| Repository | Paper | Status |
|------------|-------|--------|
| polln-whitepaper-ocds | Origin-Centric Data Systems | ✅ Ready to create |
| polln-whitepaper-superinstance | SuperInstance Type System | ✅ Ready to create |
| polln-whitepaper-confidence | Confidence Cascade Architecture | ✅ Ready to create |
| polln-whitepaper-pythagorean | Pythagorean Geometric Tensors | ✅ Ready to create |
| (6 more) | Papers 5-10 | 📝 Planned |

**Note:** See `WHITEPAPER_REPOS.md` for creation script and strategy.

---

## AGENT TEAM STRUCTURE - CONTINUOUS EXECUTION

Maintain **12 active agents** at all times. When one completes, spawn replacement immediately.

### Workstream Distribution

| Workstream | Agents | Focus |
|------------|--------|-------|
| **Website Platform** | 4 | Features, content, UX, integrations |
| **R&D** | 4 | White papers, research, academic |
| **Implementation** | 3 | Core code, APIs, performance |
| **Standalone Tools** | 1 | Extraction, npm publishing |

### Agent Roles

**Website Platform (4 agents):**
1. Feature Developer - Interactive components, visualizations
2. Content Creator - Tutorials, documentation, blog posts
3. UX Optimizer - Performance, accessibility, mobile
4. Platform Integrator - APIs, third-party services

**R&D Team (4 agents):**
1. White Paper Lead - Academic papers, formalization
2. Mathematical Researcher - LOG-Tensor, geometric math
3. Academic Publication - Conference submissions, journals
4. Research Analyst - User needs, competitive analysis

**Implementation (3 agents):**
1. Core Developer - SuperInstance types, cell engine
2. Backend/API Developer - APIs, federation, databases
3. DevOps/Security Engineer - Deployment, monitoring, security

**Standalone Tools (1 agent):**
1. Tool Extraction Specialist - Extract, document, publish to npm

---

## AGENT ONBOARDING PROTOCOL

### Every Agent MUST Create:

**1. Work Report:** `agent-messages/{workstream}_{role}_round{N}.md`
- Detailed description of work completed
- Files created/modified
- Technical decisions made
- Challenges encountered

**2. Onboarding Document:** `agent-messages/onboarding/{workstream}_{role}_round{N}.md`
- **MAX 1,000 tokens** (concise!)
- Executive Summary: 2-3 bullet points
- Essential Resources: 2-3 key files
- Critical Blockers: 1-2 issues
- Next Actions: 2-3 tasks for successor
- Key Insight: 1 important pattern/learning

### Template:

```markdown
# Onboarding: {Role} - Round {N}

## Executive Summary
- {Accomplishment 1}
- {Accomplishment 2}
- {Accomplishment 3}

## Essential Resources
- `{file1}` - {One-line description}
- `{file2}` - {One-line description}
- `{file3}` - {One-line description}

## Critical Blockers
1. {Blocker} - {Impact}
2. {Blocker} - {Impact}

## Next Actions
1. {Action 1}
2. {Action 2}
3. {Action 3}

## Key Insight
{Most important pattern or learning}

---
PUSH TO REPO: git add . && git commit -m "{type}(r{N}): {summary}" && git push origin main
```

---

## WORKSTREAM-SPECIFIC PROMPTS

### Website Platform Agent Template

```
You are {Role} on the Website Platform Team (kimi-2.5, temp=1.0) - Round {N}.

**Your Mission:** {Specific mission}

**Current Focus:**
1. Read previous onboarding: agent-messages/onboarding/website_{prev_role}_round{prev_N}.md
2. Search vector DB: python3 mcp_codebase_search.py search "{topic}"
3. {Specific tasks}

**Technical Stack:**
- Astro + React + TypeScript
- Cloudflare Pages/Workers
- Tailwind CSS
- D1, KV, R2

**Deliverables:**
1. {Deliverable 1}
2. {Deliverable 2}
3. Document in agent-messages/website_{role}_round{N}.md
4. CREATE ONBOARDING: agent-messages/onboarding/website_{role}_round{N}.md (MAX 1,000 tokens)

**PUSH TO REPO:**
git add . && git commit -m "{type}(r{N}): {description}" && git push origin main
```

### R&D Agent Template

```
You are {Role} on the R&D Team (kimi-2.5, temp=1.0) - Round {N}.

**Your Mission:** {Specific mission}

**Current Focus:**
1. Read previous research: docs/research/{topic}/
2. Search vector DB: python3 mcp_codebase_search.py search "{topic}"
3. {Specific tasks}

**Deliverables:**
1. {Deliverable 1}
2. {Deliverable 2}
3. Document in agent-messages/rd_{role}_round{N}.md
4. CREATE ONBOARDING: agent-messages/onboarding/rd_{role}_round{N}.md (MAX 1,000 tokens)

**PUSH TO REPO:**
git add . && git commit -m "{type}(r{N}): {description}" && git push origin main
```

### Implementation Agent Template

```
You are {Role} on the Implementation Team (kimi-2.5, temp=1.0) - Round {N}.

**Your Mission:** {Specific mission}

**Current Focus:**
1. Read architecture: docs/architecture/{relevant}.md
2. Search vector DB: python3 mcp_codebase_search.py search "{topic}"
3. {Specific tasks}

**Deliverables:**
1. {Deliverable 1}
2. {Deliverable 2}
3. Write tests
4. Document in agent-messages/impl_{role}_round{N}.md
5. CREATE ONBOARDING: agent-messages/onboarding/impl_{role}_round{N}.md (MAX 1,000 tokens)

**PUSH TO REPO:**
git add . && git commit -m "{type}(r{N}): {description}" && git push origin main
```

### Tool Extraction Agent Template

```
You are the Tool Extraction Specialist (kimi-2.5, temp=1.0) - Round {N}.

**Your Mission:** Extract standalone components and publish to dedicated repositories

**Current Focus:**
1. Identify extractable tool from src/ or docs/research/
2. Create clean extraction with minimal dependencies
3. Write comprehensive README.md
4. Push to appropriate repository

**Target Repositories:**
- https://github.com/SuperInstance/confidence-cascade
- https://github.com/SuperInstance/stigmergy
- https://github.com/SuperInstance/voxel-logic
- https://github.com/SuperInstance/platonic-randomness

**README.md Must Include:**
- Clear purpose and use cases
- Installation instructions
- Usage examples with code
- API documentation
- Contributing guidelines

**Deliverables:**
1. Extract {N} tools
2. Create README for each
3. Push to target repositories
4. Document in agent-messages/extraction_round{N}.md
5. CREATE ONBOARDING: agent-messages/onboarding/extraction_round{N}.md (MAX 1,000 tokens)

**PUSH TO REPO:**
git add . && git commit -m "extract(r{N}): {tool names}" && git push origin main
```

---

## WHITE PAPER TARGETS (10 Papers)

| # | Title | Status | Repository |
|---|-------|--------|------------|
| 1 | Origin-Centric Data Systems | ✅ Complete | polln-whitepaper-ocds |
| 2 | SuperInstance Type System | ✅ Complete | polln-whitepaper-superinstance |
| 3 | Confidence Cascade Architecture | ✅ Complete | polln-whitepaper-confidence |
| 4 | Pythagorean Geometric Tensors | ✅ Complete | polln-whitepaper-pythagorean |
| 5 | SMPbot Architecture | 📝 Planned | polln-whitepaper-smpbot |
| 6 | Tile Algebra Formalization | 📝 Planned | polln-whitepaper-tilealgebra |
| 7 | Rate-Based Change Mechanics | 📝 Planned | polln-whitepaper-ratebased |
| 8 | Laminar vs Turbulent Systems | 📝 Planned | polln-whitepaper-laminar |
| 9 | Wigner-D Harmonics for SO(3) | 📝 Planned | polln-whitepaper-wigner |
| 10 | GPU Scaling Architecture | 📝 Planned | polln-whitepaper-gpu |

---

## RAG SYSTEM (GPU-ACCELERATED)

```bash
# Check status
python3 mcp_codebase_search.py stats

# Search codebase
python3 mcp_codebase_search.py search "your query"

# Current stats:
# - Collection: polln-codebase
# - Vectors: 834,600 chunks
# - Model: all-MiniLM-L6-v2
# - Status: ready
```

**Agent Usage:**
- Always search vector DB before reading large documents
- Reduces context usage by 10x
- Finds relevant chunks across entire codebase

---

## CRITICAL ACTIONS (Immediate)

### 1. Fix Security CRITICAL Issues
- **Issue:** API auth middleware not connected
- **File:** `website/functions/src/server.ts`
- **Action:** Connect auth middleware to all protected routes
- **Priority:** CRITICAL

### 2. Resolve GitHub Push
- **Issue:** Workflow OAuth scope blocking
- **Commits:** 41 ready to push
- **Action:** Use workflow scope token or manual push
- **Priority:** HIGH

### 3. Submit PODC 2026
- **Deadline:** March 31, 2026 (abstract)
- **Status:** Draft complete at `docs/academic/podc2026-ocds-draft.md`
- **Action:** Finalize and submit
- **Priority:** URGENT

---

## ORCHESTRATOR CHECKLIST

### Daily Operations
- [ ] Monitor 12 active agents
- [ ] Replace completed agents immediately
- [ ] Read new onboarding docs
- [ ] Refine prompts based on learnings
- [ ] Push to repository (resolve permission issue)

### Weekly Review
- [ ] Review agent performance
- [ ] Adjust workstream distribution
- [ ] Update progress tracking
- [ ] Archive completed rounds

### Critical Tracking
- [ ] Security fixes deployed
- [ ] GitHub push resolved
- [ ] PODC 2026 submitted
- [ ] White papers 5-10 progress
- [ ] npm packages published

---

## KEY DIRECTORIES

```
/
├── src/                          # Core implementation
│   ├── superinstance/           # SuperInstance types
│   ├── spreadsheet/             # Cell engine, formulas
│   ├── benchmarks/              # Performance tests
│   └── api/                     # API implementations
├── website/                      # superinstance.ai
│   ├── src/                     # Astro + React
│   ├── functions/               # Cloudflare Workers
│   └── docs/                    # Documentation
├── white-papers/                 # Academic papers
│   ├── 01-Origin-Centric-Data-Systems.md
│   ├── 02-SuperInstance-Type-System.md
│   ├── 03-Confidence-Cascade-Architecture.md
│   └── 04-Pythagorean-Geometric-Tensors.md
├── docs/                         # Documentation
│   ├── architecture/            # System design
│   ├── research/                # Research notes
│   └── academic/                # Conference papers
├── agent-messages/               # Agent outputs
│   ├── onboarding/              # Succession docs
│   └── round*_synthesis.md      # Round summaries
├── scripts/                      # Automation
└── extracted/                    # Standalone tools
```

---

## PUSH TO REPO

**CRITICAL:** Push changes regularly:

```bash
git add .
git commit -m "{type}(r{N}): {description}"
git push origin main
```

**Repository:** https://github.com/SuperInstance/polln

---

## SUCCESS METRICS

| Metric | Target | Current |
|--------|--------|---------|
| White Papers | 10 | 4 (40%) |
| Test Coverage | 80% | 85% ✅ |
| Security Score | 90/100 | 65/100 ⚠️ |
| Performance | Targets | Exceeds ✅ |
| API Endpoints | 100+ | 109+ ✅ |
| npm Packages | 6 | 2 ready ⚠️ |

---

## CONTACT & RESOURCES

- **Main Repository:** https://github.com/SuperInstance/polln
- **Website:** https://superinstance.ai
- **Founder:** Casey DiGennaro
- **Ecosystem:** https://github.com/SuperInstance

---

*CLAUDE.md rebuilt by Orchestrator (kimi-2.5, temp=1.0)*
*Based on comprehensive audit: COMPREHENSIVE_AUDIT.md*
*Date: 2026-03-11*
*Status: Production-ready with security fixes needed*
