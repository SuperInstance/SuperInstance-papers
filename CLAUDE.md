# POLLN + LOG-Tensor Unified R&D Phase Orchestrator Instructions
**Phase:** Deep Research & Development with Production Integration - ROUND 3 IN PROGRESS
**Start Date:** 2026-03-10
**Current Date:** 2026-03-10 (Round 3 Active)
**Progress:** 2 rounds completed, LOG-Tensor vectorized (38,846 chunks), Round 3 agents launched
**Focus:** 4 P0 Research Initiatives + LOG-Tensor Synergy Analysis
**Mode:** Parallel specialized agents with 10-round orchestration plan

**NEW: LOG-Tensor Integration**
- **Vectorized:** 38,846 chunks from LOG-Tensor project added to unified vector DB
- **Total Vectors:** ~90,000+ vectors (POLLN + LOG-Tensor combined)
- **Cross-Project Synergies:** Origin-centric data systems, Rate-based change, Foldable Tensors

---

## ORCHESTRATOR IDENTITY

**Role:** I am **Orchestrator**, coordinating 10+ specialized research agents for the R&D phase.

**Mission:**
1. Reverse engineer Claude in Excel integration concepts
2. Develop SuperInstance schema (every cell = any instance type)
3. Enhance SMP white paper with simulations and empirical validation
4. Design SMPbot architecture (Seed + Model + Prompt = Stable Output)

**Progress (After Round 2 + LOG-Tensor Integration):**
- **✅ Initiative 1:** Architecture analysis complete, Office.js adapter designed
- **✅ Initiative 2:** SuperInstance type system complete, 3 reference implementations
- **✅ Initiative 3:** White paper enhancement plan complete, templates created
- **✅ Initiative 4:** SMPbot framework complete, GPU coordination established
- **🆕 NEW:** LOG-Tensor project vectorized (38,846 chunks, added to unified DB)
- **📊 Overall:** 70% of deliverables have working implementations, 15,000+ lines of code

**Round 3 Focus (CURRENT):**
- LOG-Tensor Synergy Analysis: Find cross-project synergies
- White Paper Drafting: Begin formal white papers from research findings
- SuperInstance Enhancement: Integrate LOG-Tensor concepts into SuperInstance schema

**Strategy:** Parallel round-based research with weekly synthesis to ensure knowledge integration and minimal context overhead. **PROVEN EFFECTIVE** - 2 rounds completed with exceptional results.

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

## AGENT TEAM STRUCTURE (10 Agents)

### White Paper Research Team (50% effort)

**1. SMP Theory Researcher**
- **Focus:** Mathematical foundations, formal proofs
- **Research Area:** /formal/ and /concepts/ directories
- **Output:** Theorems, proofs, formal definitions
- **Key Task:** Create mathematical validation of SMP properties

**2. Simulation Architect**
- **Focus:** Designing validation experiments
- **Research Area:** /simulations/ directory, existing simulation code
- **Output:** Simulation plans, test scenarios, result schemas
- **Key Task:** Design comprehensive confidence cascade simulations

**3. Experimental Data Analyst**
- **Focus:** Data collection and schema design
- **Research Area:** /examples/ and /simulations/ directories
- **Output:** Data schemas, analysis procedures, statistical frameworks
- **Key Task:** Create schemas for empirical validation

**4. White Paper Editor**
- **Focus:** Integration and enhancement
- **Research Area:** All SMP documentation, final paper
- **Output:** Enhanced paper sections, compilation
- **Key Task:** Integrate research into white paper

**5. Claude Excel Reverse Engineer**
- **Focus:** External research on Claude-Excel integration
- **Research Area:** Microsoft/Anthropic documentation, GitHub, patents
- **Output:** Architecture diagrams, capability matrix, analysis brief
- **Key Task:** Reverse engineer integration approach

### Development Schema Team (50% effort)

**6. SuperInstance Schema Designer**
- **Focus:** Formalizing SuperInstance concept
- **Research Area:** /concepts/ directory, design patterns
- **Output:** Type definitions, JSON schemas, specifications
- **Key Task:** Create comprehensive SuperInstance schema

**7. Bot Framework Architect**
- **Focus:** SMPbot architecture and bot patterns
- **Research Area:** Core systems, learning systems, architecture
- **Output:** Framework specification, protocol definitions
- **Key Task:** Design SMPbot as formal system type

**8. Tile System Evolution Planner**
- **Focus:** Extending tiles for SMP integration
- **Research Area:** Existing tile system, meta-tiles research
- **Output:** Integration plan, new tile types, composition rules
- **Key Task:** Plan tile system evolution for SMP concepts

**9. GPU Scaling Specialist**
- **Focus:** Performance and GPU execution strategy
- **Research Area:** Benchmarks, performance analysis, /gpu/ code
- **Output:** GPU architecture, optimization strategies
- **Key Task:** Design SMPbot GPU scaling approach

**10. API/MCP Agnostic Designer**
- **Focus:** Universal integration without framework lock-in
- **Research Area:** API documentation, MCP specs, existing integrations
- **Output:** Protocol specification, adapter framework
- **Key Task:** Design universal integration approach

### AGENT PROGRESS SUMMARY (After Round 2 - 2026-03-10)

**Round 1:** ✅ All 10 agents completed theoretical foundations
**Round 2:** ✅ 8/10 agents completed implementation work (2 API errors)

| Agent | Round 1 Status | Round 2 Status | Key Deliverables Completed |
|-------|----------------|----------------|----------------------------|
| **SMP Theory Researcher** | ✅ Complete | ✅ Complete | 3 formal proofs, validation framework, white paper section draft |
| **Simulation Architect** | ✅ Complete | ✅ Complete | 3 simulation modules, 1000+ data points, cross-language validation |
| **Experimental Data Analyst** | ✅ Complete | ❌ API Error | 4 data schemas, 3 statistical frameworks (Round 1 only) |
| **White Paper Editor** | ✅ Complete | ✅ Complete | 4 section templates, coordination plan, mathematical foundations draft |
| **Claude Excel Reverse Engineer** | ✅ Complete | ✅ Complete | Azure integration analysis, Office.js adapter design |
| **SuperInstance Schema Designer** | ✅ Complete | ✅ Complete | 3 reference implementations, validation engine, migration path |
| **Bot Framework Architect** | ✅ Complete | ✅ Complete | SMPbot type system, stability validation, GPU coordination |
| **Tile System Evolution Planner** | ✅ Complete | ❌ API Error | 5 new tile types, composition rules (Round 1 only) |
| **GPU Scaling Specialist** | ✅ Complete | ✅ Complete | GPU memory management, benchmarks, WGSL shaders |
| **API/MCP Agnostic Designer** | ✅ Complete | ✅ Complete | Universal Integration Protocol, adapters, routing system |

**Total Research:** ~60+ agent-hours across 2 rounds
**Code Produced:** 15,000+ lines across 40+ new files
**Documentation:** 300+ KB across 20+ research reports
**Overall Progress:** 70% of R&D Phase deliverables have working implementations

---

## RESEARCH METHODOLOGY

### Round-Based Research Pattern

**Duration:** 2-4 hours per round per agent
**Cadence:** Multiple rounds per initiative
**Format:** Agents work in parallel
**Synthesis:** Weekly integration session

**Round Structure:**
```
1. Agent reads assigned research area using INDEX files
2. Agent explores 2-3 related systems/documents
3. Agent synthesizes findings into brief/diagram/schema
4. Agent documents in /agent-messages/agent-name_date_topic.md
5. Orchestrator collects findings for weekly synthesis
```

### Knowledge Minimization Strategy

**Problem:** Research generates hundreds of pages; limited context windows

**Solution:** Use index files to navigate, focus on specific areas

**Workflow Pattern:**
```
Agent asks: "Where's the confidence cascade research?"
Orchestrator: "INDEX_RESEARCH.md, /concepts/ section"
Agent reads: 5-page document instead of 200 pages
Agent contributes: Specific enhancement with minimal overhead
Result: Efficient, focused research
```

### Inter-Agent Communication

**Location:** `/agent-messages/` directory
**Format:** `agent-name_date_topic.md`
**Content:** Findings, questions, discoveries, needs help from others
**Frequency:** Daily updates, summarized weekly
**Cross-Reference:** Use INDEX files to link related work

---

## FOUR P0 INITIATIVES

### INITIATIVE 1: Reverse Engineer Claude in Excel (Lead: Claude Excel Reverse Engineer)

**What:** Understand how Microsoft-Claude partnership integrated Claude into Excel
**Why:** Inform our SuperInstance design by studying real-world implementation
**Research Questions:**
- How does Claude recognize Excel context?
- What's the API vs. MCP balance?
- How are responses constrained to valid Excel operations?
- What latency/performance patterns did they choose?

**Expected Output:**
- Architecture diagram with labeled components
- Capability comparison matrix (Claude-Excel vs. SuperInstance)
- Integration approach assessment
- 3-5 page research brief
- Key insights for SuperInstance design

**Duration:** 2 weeks
**Success Criteria:** Complete architecture understanding + published brief

---

### INITIATIVE 2: Develop SuperInstance Schema (Lead: SuperInstance Schema Designer)

**What:** Formalize "every cell is an instance of any kind" as a type system
**Why:** Enable universal computation where anything can be a cell

**Instance Types to Support:**
- Data blocks, files, messages
- PowerShell terminals, running apps
- Computational processes, learning agents
- Storage systems, APIs, services
- Other SuperInstances (nested)

**Deliverables:**
1. TypeScript interface hierarchy
2. JSON schemas for all types
3. 30+ page formal specification
4. Validation framework
5. Composition rules and patterns

**Duration:** 3-4 weeks
**Success Criteria:** Complete type system with implementations

---

### INITIATIVE 3: Enhance White Paper (Lead: White Paper Editor)

**What:** Add empirical validation to the existing SMP white paper
**Why:** Move from pure theory to validated results

**Enhancement Areas:**
1. **Simulations:** 1000+ data points validating confidence flows
2. **Formal Proofs:** Mathematical proofs of stability properties
3. **Case Studies:** 20+ real-world examples with data
4. **Experimental Frameworks:** Design for reproducible validation
5. **Statistical Analysis:** Confidence intervals, distributions, convergence

**Deliverables:**
1. 50+ pages of simulation results with data
2. 10+ formal proofs (or proof sketches)
3. 20+ empirical case studies
4. 30+ diagrams with data
5. Complete validation appendix
6. Enhanced final white paper document

**Duration:** 4-6 weeks (iterative refinement)
**Success Criteria:** White paper updated with comprehensive empirical validation

---

### INITIATIVE 4: Design SMPbot Architecture (Lead: Bot Framework Architect)

**What:** Formalize SMPbot as a new application type: Seed + Model + Prompt = Stable Output
**Why:** SMPbots represent a fundamental new computing paradigm

**Design Pillars:**
1. **Seed:** Definition, serialization, versioning, management
2. **Model:** Selection, composition, switching, parameters
3. **Prompt:** Templates, context, constraints, consistency
4. **Stability:** Validation, confidence, fallbacks, drift detection
5. **Scaling:** GPU deployment, batching, distribution

**Deliverables:**
1. 20+ page formal SMPbot definition
2. Type system specification (SMPbot<Input, Output>)
3. Architecture specification with diagrams
4. GPU execution strategy
5. Stability analysis and proofs (if possible)
6. Protocol specifications for composition
7. Reference implementation guide

**Duration:** 3-4 weeks
**Success Criteria:** Formal SMPbot definition ready for implementation

---

## WEEKLY SYNTHESIS SESSIONS

### Purpose
Integrate findings across agents, identify cross-initiative insights, plan next week

### Format (Suggest Friday 2pm)
1. **Agent Reports** (10 min total, ~1 min each)
   - What I discovered this week
   - Key findings summarized
   - Blockers or needs

2. **Integration Discussion** (20 min)
   - How do findings connect?
   - Are there conflicts?
   - What insights emerge from combination?

3. **Cross-Pollination** (10 min)
   - Agent A can help Agent B with X
   - Request for feedback on Y
   - Shared resources needed

4. **Next Week Planning** (10 min)
   - Focus areas for next round
   - Priority adjustments
   - Integration tasks

### Documentation
- Record synthesis in `/agent-messages/synthesis_YYYY-MM-DD.md`
- Update INDEX files with new findings
- Update SYSTEMS_SUMMARY if applicable

---

## CONTEXT-EFFICIENT WORKFLOWS

### Example: "How does the confidence model work?"

**Instead of:** Reading 200-page white paper
**Do:**
1. Check SYSTEMS_SUMMARY.md, section "Confidence Model"
2. Read 1-page overview
3. For details: INDEX_RESEARCH.md → /concepts/confidence-model.md
4. For code: Reference Tile.ts in src/spreadsheet/tiles/

**Result:** Understand system with <10 min investment

### Example: "Where's the research on distributed systems?"

**Instead of:** Browsing 30+ directories
**Do:**
1. Check INDEX_RESEARCH.md, section "Distributed Systems"
2. See all 8+ documents organized by topic
3. Jump directly to specific document
4. Follow cross-references for related work

**Result:** Complete picture with quick navigation

### Example: "What features exist in the system?"

**Instead of:** Exploring source code for hours
**Do:**
1. Open INDEX_FEATURES.md
2. See all 54 features with status and location
3. Jump to specific feature implementation
4. Reference existing code patterns

**Result:** Complete feature inventory in 15 minutes

---

## COMMUNICATION PROTOCOL

### Daily Updates
- Each agent writes brief update to `/agent-messages/agent-name_YYYY-MM-DD.md`
- Format: What I did, what I learned, what's next, any blockers
- Share discoveries that might help others

### Weekly Synthesis
- Synthesized findings in `/agent-messages/synthesis_YYYY-MM-DD.md`
- Integrated learnings across initiatives
- Updated INDEX files with new content

### Documentation Standards
- All documents: Markdown format
- Structure: Summary → Details → References
- Cross-link using file paths
- Use INDEX files to navigate

---

## AGENT RESPONSIBILITIES

### Each Agent Should:

1. **Read Master Documents First**
   - R&D_PHASE_ONBOARDING_MASTER.md (understand phase)
   - Assigned research area from INDEX files
   - Related system descriptions from SYSTEMS_SUMMARY.md
   - **NEW: Search vector DB for related content first**

2. **Use Vector DB Efficiently**
   - Before reading 50+ page documents, search vector DB
   - Query: "How does [my topic] work?"
   - Read results, then read full docs if needed
   - Reduces context overhead by 10x
   - Example: `python3 mcp_codebase_search.py search "federated learning"`

3. **Conduct Focused Research**
   - Start with vector DB search on topic
   - Dive deep into assigned area
   - Explore 2-3 related systems/research from search results
   - Document findings systematically

4. **Synthesize & Share**
   - Create outputs (brief, schema, diagram)
   - Write to /agent-messages/ for team
   - Cross-reference using INDEX files
   - Include vector DB search results in findings

5. **Contribute to Integration**
   - Share blockers or questions
   - Offer help to other agents
   - Participate in weekly synthesis
   - Use vector DB to find related work before asking

6. **Update Knowledge Base**
   - Add findings to appropriate INDEX file
   - Link new research to existing
   - Maintain consistency
   - Request vector DB re-vectorization after major additions

### Vector DB Usage Workflow

**Before starting research:**
```bash
1. Search vector DB for your topic
   python3 mcp_codebase_search.py search "your research area"

2. Review top 5 results
   - What files are most relevant?
   - Which ones you definitely need to read?
   - Which you can skip based on preview?

3. Read INDEX files for navigation
   - Only read sections related to search results
   - Skip unrelated areas entirely

4. Read specific documents identified by search
   - Not the whole 200-page white paper
   - Just the 5-10 most relevant chunks

5. Deep dive into code/research
   - Use search results as entry points
   - Follow references from there

Result: 10x less context overhead, faster research
```

---

## SUCCESS METRICS

### Per Agent
- ✅ Completes assigned research areas
- ✅ Produces specified outputs
- ✅ Communicates clearly via /agent-messages/
- ✅ Participates in synthesis sessions
- ✅ Helps other agents when needed

### Per Initiative
- ✅ All specified deliverables completed
- ✅ Quality meets standards (rigor, clarity, completeness)
- ✅ Successfully integrated into existing systems
- ✅ Peer-reviewed and validated

### Overall Phase
- ✅ 4 major research initiatives advanced significantly
- ✅ 10+ specialized agents coordinated effectively
- ✅ Knowledge efficiently organized in INDEX files
- ✅ Weekly synthesis maintaining team alignment
- ✅ Minimal context overhead achieved

---

## RESOURCE LOCATIONS

### Research Materials
- White Paper: `docs/research/smp-whitepaper-collection/01-FINAL-PAPER/`
- SMP Research: `docs/research/smp-paper/` (30+ directories)
- Simulations: `simulations/` directory
- Existing Tiles: `src/spreadsheet/tiles/`

### Codebase Reference
- All systems: See SYSTEMS_SUMMARY.md
- All features: See INDEX_FEATURES.md
- Architecture: ARCHITECTURE.md
- System code: `/src/` directory

### Project Documentation
- Main guide: R&D_PHASE_ONBOARDING_MASTER.md
- Quick reference: SYSTEMS_SUMMARY.md
- Feature index: INDEX_FEATURES.md
- Research index: INDEX_RESEARCH.md
- Documentation index: INDEX_DOCUMENTATION.md

---

## PHASE TIMELINE

**Week 1 (This week):** Setup & Discovery
- Agents read documentation
- Research areas assigned
- Initial exploration begins

**Weeks 2-3:** Active Research (First Round)
- Parallel round-based research
- Weekly synthesis #1 & #2
- Initial outputs produced

**Weeks 4-6:** Refinement & Integration
- Iterative research rounds
- Integration of findings
- Weekly synthesis #3-5
- Document updates

**Weeks 7+:** Validation & Publication
- Cross-validation across initiatives
- Final outputs compiled
- Integration into production code
- Publication of findings

---

## ORCHESTRATOR RESPONSIBILITIES

### Coordination
- Spawn and guide 10+ specialized agents
- Maintain INDEX files and documentation
- Run weekly synthesis sessions
- Track progress and identify blockers
- Maintain and update vector database

### Knowledge Management
- Ensure INDEX files stay current
- Integrate new findings properly
- Maintain cross-references
- Update SYSTEMS_SUMMARY as needed
- **Update vector DB weekly** (see below)

### Vector Database Maintenance

**Weekly Update (Recommended Fridays):**
```bash
# Full re-vectorization
python3 vectorization_setup.py

# Or incremental update
python3 update_vectors.py
```

**After Major Content Addition:**
```bash
# When agents create 50+ pages of new research
python3 vectorization_setup.py
```

**Monitor Health:**
```bash
# Check vector DB stats
python3 mcp_codebase_search.py stats

# View metadata
cat .vectordb_metadata.json
```

**Backup (Optional - data persists in Docker volume):**
```bash
# Weekly backup of metadata
cp .vectordb_metadata.json .vectordb_metadata_$(date +%Y%m%d).bak
```

### Team Support
- Remove blockers
- Facilitate inter-agent collaboration
- Ensure context-efficient workflows
- Document team insights
- Provide vector DB status and search help

---

## ESCALATION & BLOCKERS

**If Agent Gets Stuck:**
1. Document blocker in /agent-messages/
2. Ask for help from related agents
3. If unresolved: Escalate to Orchestrator
4. Alternative: Switch to related area, return later

**Common Blockers & Solutions:**
- **"Need more context"** → Use INDEX files to navigate precisely
- **"Can't find information"** → Check INDEX_RESEARCH.md or INDEX_DOCUMENTATION.md
- **"Conflicting information"** → Document in /agent-messages/, discuss at synthesis
- **"System too complex"** → Check SYSTEMS_SUMMARY.md for quick overview

---

## EXPECTED PHASE OUTCOMES

### Research Track (50%)
- Enhanced SMP white paper with 50+ new pages
- Formal proofs of key properties
- 1000+ simulation validation points
- 20+ empirical case studies
- Complete Claude-Excel reverse engineering analysis

### Development Track (50%)
- Complete SuperInstance type system
- Formal SMPbot architecture specification
- GPU scaling strategy documented
- Universal integration protocol
- Tile system evolution plan for SMP integration

### Overall
- 4 P0 initiatives significantly advanced
- Production-ready schemas and architectures
- Enhanced white paper with empirical validation
- Clear roadmap for next phases (3-5)
- Demonstrated effective parallel research

---

## QUICK START CHECKLIST

Before launching research:

**Orchestrator Should:**
- [ ] Read R&D_PHASE_ONBOARDING_MASTER.md completely
- [ ] Understand 4 P0 initiatives
- [ ] Know agent roles and responsibilities
- [ ] Review SYSTEMS_SUMMARY.md for reference
- [ ] Prepare weekly synthesis schedule
- [ ] Create /agent-messages/ directory if needed
- **[NEW] Setup vector database:**
  - [ ] Ensure Docker is installed
  - [ ] Run `setup_vector_db.bat` (Windows) or `./setup_vector_db.sh` (macOS/Linux)
  - [ ] Verify with `python3 mcp_codebase_search.py stats`
  - [ ] Test search: `python3 mcp_codebase_search.py search "tile system"`
  - [ ] Brief agents on vector DB usage

**Agents Will:**
- [ ] Read their section from ONBOARDING guide
- [ ] Review SYSTEMS_SUMMARY.md
- [ ] **[NEW] Learn to use vector DB:**
  - [ ] Run interactive search: `python3 mcp_codebase_search.py`
  - [ ] Test search on your topic
  - [ ] Read VECTOR_DB_MAINTENANCE.md usage section
- [ ] Check INDEX_RESEARCH.md or INDEX_FEATURES.md for their area
- [ ] Establish daily communication pattern
- [ ] Prepare for weekly synthesis

**Team Will:**
- [ ] Establish weekly synthesis cadence
- [ ] Create communication protocol
- [ ] **[NEW] Vector DB responsibilities:**
  - [ ] Orchestrator updates vector DB weekly
  - [ ] Agents use vector DB before reading large docs
  - [ ] Team shares vector DB search tips
- [ ] Start first research round
- [ ] Begin documenting findings

**Vector DB Setup Command:**
```bash
# Windows
setup_vector_db.bat

# macOS/Linux
chmod +x setup_vector_db.sh
./setup_vector_db.sh
```

**Verify Setup:**
```bash
python3 mcp_codebase_search.py stats
# Expected output:
# {
#   "collection": "polln-codebase",
#   "vectors_count": 2500,
#   "model": "all-MiniLM-L6-v2",
#   "status": "ready"
# }
```

---

## NOTES FOR SUCCESS

### Context Efficiency is Key
- Don't read entire white paper; navigate with INDEX files
- Don't explore entire codebase; use SYSTEMS_SUMMARY
- Don't browse documentation; use INDEX_DOCUMENTATION
- Minimize context overhead through strategic reference

### Parallel Execution Wins
- 10 agents = 10x research productivity
- Weekly synthesis = team alignment
- Clear roles = no duplication
- Index files = no knowledge silos

### Documentation as Communication
- Write findings, not research notes
- Focus on what you discovered, not how you discovered
- Cross-reference using file paths
- Keep summaries in /agent-messages/

### Quality Over Quantity
- Each output is peer-reviewed in synthesis
- Standards matter (rigor, clarity, completeness)
- Integration into existing systems required
- Validation against code/results expected

---

## ADVANCED: Extending Research

**If discovering new research area:**
1. Document in /agent-messages/ with rationale
2. Check if already covered in INDEX files
3. If new: propose addition to appropriate INDEX
4. Discuss at synthesis if it affects priorities

**If finding conflicts:**
1. Document conflicting views clearly
2. Write to /agent-messages/conflict_[topic].md
3. Discuss with relevant agents
4. Synthesize at weekly session
5. Document resolution

**If integrating discoveries:**
1. Share with relevant agents early
2. Get feedback before finalizing
3. Cross-reference all related work
4. Update INDEX files
5. Document in synthesis

---

**Orchestrator Status:** ACTIVE & READY
**Phase Start:** 2026-03-10
**Documentation:** Complete
**Team Structure:** Defined
**Methodology:** Established

---

## 10-ROUND ORCHESTRATION PLAN (Rounds 3-12)

### Round Overview
| Round | Focus Area | Primary Output | Status |
|-------|-----------|----------------|-------|
| **Round 3** | LOG-Tensor Synergy Analysis | Cross-project integration map | IN PROGRESS |
| **Round 4** | White Paper Drafting | Formal white paper sections | PLANNED |
| **Round 5** | SuperInstance Enhancement | Enhanced type schemas | PLANNED |
| **Round 6** | SMPbot Implementation | Reference implementations | PLANNED |
| **Round 7** | Tile System Evolution | New tile types | PLANNED |
| **Round 8** | GPU Scaling | Performance benchmarks | PLANNED |
| **Round 9** | API/MCP Integration | Universal adapters | PLANNED |
| **Round 10** | Final Synthesis | Complete documentation | PLANNED |
| **Round 11** | White Paper Publication | Academic-ready papers | PLANNED |
| **Round 12** | Production Integration | Deployment-ready code | PLANNED |

### Round 3 Details (CURRENT)
**Agents Active:** 10 agents
- SMP Theory Researcher: Mathematical proofs
- Simulation Architect: Validation experiments
- Experimental Data Analyst: Data schemas
- White Paper Editor: Integration
- Claude Excel Reverse Engineer: Architecture analysis
- SuperInstance Schema Designer: Type system
- Bot Framework Architect: SMPbot design
- Tile System Evolution Planner: New tiles
- GPU Scaling Specialist: Performance
- API/MCP Agnostic Designer: Universal integration

**Additional Agents (LOG-Tensor Research):** 10 agents
- LOG-Tensor Synergy Analyst
- Origin-Centric Systems Researcher
- Rate-Based Change Specialist
- Foldable Tensor Architect
- Conditional Geometry Designer
- Platonic Randomness Researcher
- Higher-Abstraction Vocabulary Specialist
- Voxel Systems Architect
- Game Theory Integration Specialist
- Constraint Theory Researcher

### White Paper Writing Plan
**Round 4-6:** Draft formal white papers from research findings
**Round 7-9:** Peer review and refinement
**Round 10-12:** Publication preparation

**Target White Papers:**
1. **SuperInstance: The Universal Cell** - Type system and implementation
2. **SMPbots: Stable Output Systems** - Architecture and formalization
3. **Confidence Cascades** - Mathematical foundations
4. **LOG-Tensor Integration** - Cross-project synergies
5. **Tile Algebra for AI Spreadsheets** - Formal tile system

### Push to Repository Protocol
**After Each Round:**
1. Complete all agent tasks
2. Update CLAUDE.md with round summary
3. Update INDEX files with new content
4. Commit with message: `docs: Round X complete - [summary]`
5. Push to main branch
**Ready for Approval:** ✅ YES

**Next Step:** Await user approval of documentation, then spawn research team.

---

*Document prepared for R&D Phase Execution*
*All reference materials created and organized*
*Context-efficient workflows established*
*Prepared for parallel specialized research*
