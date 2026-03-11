# Round 5 Agent: Codebase Explorer (R&D Team)

**Subagent Type:** Explore (thoroughness: very thorough)
**Round:** 5
**Team:** R&D Team

---

## Mission

Comprehensively explore the POLLN + LOG-Tensor codebase using the vector database (90,703 vectors) to identify implementation patterns, architectural gaps, and cross-project synergies. Focus on understanding the current state and identifying what needs to be built for Round 5.

---

## Critical Protocol: Onboarding Document

**YOU MUST CREATE AN ONBOARDING DOCUMENT for your successor:**
- Location: `agent-messages/onboarding/rd_codebase_explorer_round5.md`
- Content:
  1. What you discovered/accomplished
  2. Key file locations and patterns found
  3. Blockers encountered
  4. Recommendations for successor
  5. Unfinished tasks
  6. Links to relevant research

---

## Tasks

### 1. Vector DB Exploration
- Search vector DB for: "SuperInstance implementation gaps", "confidence cascade architecture", "GPU acceleration", "white paper completion status"
- Use: `python3 mcp_codebase_search.py search "your query"`
- Identify the 10-15 most relevant code chunks for Round 5 priorities

### 2. Codebase Analysis
- Examine `src/superinstance/` - identify missing instance types (API, Storage, Terminal, Tensor, Observer, etc.)
- Examine `white-papers/` - assess completion status of 10 white paper targets
- Examine `agent-messages/` - review Round 4 outputs and onboarding gaps
- Examine `docs/research/` - find research relevant to confidence cascade, SMPbot, tile algebra

### 3. Gap Analysis
- Create a gap report: What's implemented vs. what's planned
- Identify critical path items for Round 5
- Prioritize based on project dependencies

### 4. Pattern Discovery
- Find reusable patterns across POLLN and LOG-Tensor
- Identify clever implementations that can be extracted as libraries
- Document architectural decisions and trade-offs

---

## Deliverables

1. **Exploration Report**: `agent-messages/round5_rd_codebase_explorer.md`
   - Summary of findings
   - Gap analysis with priorities
   - Recommended next steps

2. **Onboarding Document**: `agent-messages/onboarding/rd_codebase_explorer_round5.md`
   - As specified in Critical Protocol

3. **Updated Indexes**: If needed, update `INDEX_FEATURES.md`, `INDEX_RESEARCH.md` with new discoveries

---

## Success Criteria

- Vector DB queries performed and documented
- All major code directories examined
- Clear gap analysis with prioritized list
- Onboarding document created for successor
- No critical areas missed

---

## Tools Available

- Vector DB: 90,703 vectors, semantic search
- Explore agent with full codebase access
- All standard Claude Code tools

---

**Remember:** You are the first agent in Round 5. Your exploration sets the foundation for the entire round. Be thorough, document everything, and create a useful onboarding document for your successor.