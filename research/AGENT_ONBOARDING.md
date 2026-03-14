# Agent Onboarding Guide - SuperInstance Papers

**Version:** 2.0
**Date:** 2026-03-13
**For:** New agents joining the SuperInstance research project

---

## Welcome

You are joining a research project developing **60+ academic papers** on distributed AI systems, hardware acceleration, and cross-cultural education. This guide will get you productive quickly.

---

## Project Overview

### Mission
Transform mathematical framework papers into publication-ready dissertations with complete proofs, implementations, and validation.

### Current State
| Phase | Papers | Status |
|-------|--------|--------|
| Phase 1 (P1-P23) | 23 | 18 Complete, 5 In Progress |
| Phase 2 (P24-P30) | 7 | Complete with simulations |
| Phase 3 (P31-P40) | 10 | Queued |
| Phase 4 (P41-P47) | 7 | 5 Complete (ecosystem) |
| Phase 5 (P51-P60) | 10 | Proposed (Lucineer) |

**Total:** 60+ papers

---

## Key Directories

```
polln/
├── papers/                        # Phase 1-2 papers (P1-P30)
│   ├── 01-23/                     # Phase 1 papers
│   └── 24-30/                     # Phase 2 papers with simulations
├── research/
│   ├── lucineer_analysis/         # P51-P60 hardware papers
│   │   ├── LUCINEER_ANALYSIS.md
│   │   ├── LUCINEER_PAPER_PROPOSALS.md
│   │   ├── LUCINEER_EDUCATIONAL_COMPONENTS.md
│   │   └── LUCINEER_SUPERINSTANCE_SYNERGIES.md
│   ├── ecosystem_papers/          # P41-P47 complete papers
│   │   ├── P41_Tripartite_Consensus_Architecture.md
│   │   ├── P43_Deadband_Knowledge_Distillation.md
│   │   ├── P45_Cognitive_Memory_Hierarchy.md
│   │   ├── P46_Context_Handoff_Protocols.md
│   │   └── P47_Escalation_Routing.md
│   ├── ecosystem_simulations/     # Validation code
│   │   ├── escalation_router_simulation.py
│   │   └── consensus_engine_simulation.py
│   ├── PHASE_5_PROPOSAL.md        # Next phase plan
│   └── AGENT_ONBOARDING.md        # This file
├── SuperInstance_Ecosystem/       # Production TypeScript code
│   └── equipment/                 # 13 npm packages
└── CLAUDE.md                      # Project orchestrator config
```

---

## Quick Start

### Step 1: Understand Current Phase
Read `research/PHASE_5_PROPOSAL.md` to understand what's planned.

### Step 2: Set Up MCP Servers (REQUIRED for all agents)

The project now includes **Model Context Protocol (MCP) servers** for cost-effective AI orchestration.

**Why MCP?**
- Unified interface to multiple AI providers
- Pricing-aware model selection (use FREE when possible!)
- Optimized workflows for different tasks
- 50% discount on async batch processing

**Available MCP Servers:**

| Server | Best For | Cost | When to Use |
|--------|----------|------|-------------|
| **Groq** | Devil's advocate, rapid iteration | **FREE** | Challenges, quick checks, iterations |
| **DeepInfra** | Research ideation, large context | $0.03-0.20/1M | Novel insights, cost-sensitive work |
| **DeepSeek** | Chain-of-thought reasoning | $0.10/1M | Math proofs, explicit reasoning |
| **Kimi** | Ultra-large context (128K) | $0.12-0.50/1M | Entire papers, synthesis |

**Setup:**
```bash
# Install all MCP servers
cd mcp-servers/groq-mcp && pip install -e .
cd ../deepinfra-mcp && pip install -e .
cd ../deepseek-thinker-mcp && pip install -e .
cd ../kimi-mcp && pip install -e .
```

**Configuration:**
API keys are pre-configured in `claude_mcp_config.json`

**Quick MCP Usage:**

```python
# FREE: Devil's advocate challenge
groq_devils_advocate(
    claim="Your claim here",
    iterations=2
)

# Cheapest: General chat (DeepInfra Mistral 7B)
deepinfra_chat(
    message="Your question",
    model="mistralai/Mistral-7B-Instruct-v0.3"
)

# Complex reasoning: Chain-of-thought
deepseek_reason(
    problem="Mathematical proof needed",
    domain="mathematics",
    steps=7
)

# Large document: Process entire paper
kimi_analyze_document(
    document="[full paper content]",
    analysis_type="summary"
)
```

**Pricing-Aware Workflow (CRITICAL):**

1. **Always start with Groq (FREE)** for rapid iterations
2. **Use cheapest model** that can do the job (DeepInfra Mistral 7B @ $0.03/1M)
3. **Reserve DeepSeek** for explicit chain-of-thought requirements
4. **Use async batching** with Groq for 50% discount on large jobs
5. **Kimi only** when you need 128K context (full papers)

**Async Batching (50% savings!):**

Use Groq async batch when you don't need immediate results:
- Running 10+ simulations in parallel
- Generating multiple hypotheses
- Non-interactive analysis tasks

**See:** `research/MCP_USER_GUIDE.md` for complete documentation

### Step 3: Alibaba Cloud Integration (NEW 2026-03-14)

**Alibaba Cloud API MCP Server**
- **Purpose:** Access Alibaba Cloud's extensive AI and cloud services
- **Best For:** Chinese market deployment, Qwen models, specialized AI services
- **Key Features:**
  - Qwen (Tongyi Qianwen) - Alibaba's large language models
  - Image generation and processing
  - Speech recognition and synthesis
  - Natural language processing for Chinese
  - Machine learning platform (PAI)

**Alibaba Cloud DevOps MCP Server**
- **Purpose:** DevOps automation and deployment for Alibaba Cloud
- **Best For:** CI/CD pipelines, infrastructure automation, monitoring
- **Key Features:**
  - Container Service for Kubernetes (ACK)
  - Function Compute (serverless)
  - Resource Orchestration Service (ROS)
  - Cloud Monitor integration
  - Auto-scaling automation

**Setup:**
```bash
# API key location
apikey/alibaba_api_key.txt

# Install Alibaba MCP servers
cd mcp-servers/alibaba-mcp && pip install -e .
cd ../alibaba-devops-mcp && pip install -e .
```

**Usage Examples:**

**Alibaba Cloud API:**
```python
# Qwen model for Chinese language processing
alibaba_chat(
    message="翻译这段技术文档",
    model="qwen-max"
)

# Image generation
alibaba_generate_image(
    prompt="分布式系统架构图",
    style="technical"
)

# Chinese speech recognition
alibaba_speech_to_text(
    audio_file="chinese_audio.wav",
    language="zh"
)
```

**Alibaba DevOps:**
```python
# Deploy to Alibaba Kubernetes
alibaba_deploy_k8s(
    cluster="your-cluster",
    manifest="k8s/deployment.yaml"
)

# Trigger Function Compute
alibaba_invoke_function(
    service="simulation-service",
    function="run-model"
)

# Monitor resources
alibaba_monitor_resources(
    services=["api", "worker", "redis"]
)
```

**When to Use Alibaba Cloud:**
- Deploying to China/Asia-Pacific regions
- Chinese language processing (superior to Western models)
- Cost-effective alternative to AWS/Azure in Asia
- Access to specialized AI models (Qwen)
- Integration with Chinese cloud ecosystem

**Cost Considerations:**
- Qwen models: ~30% cheaper than GPT-4 for Chinese
- Compute: Competitive pricing for Asia regions
- Free tier available for new accounts
- Pay-as-you-go for optimal cost control

**See:** `mcp-servers/alibaba-mcp/README.md` for complete documentation

### Step 4: Ancient Language Translation Project (NEW 2026-03-14)

**Mission: Cross-Cultural Knowledge Synthesis**

This project expands beyond modern languages to translate SuperInstance papers into **ancient and oral tradition languages** with deep conceptual reconstruction.

**The Challenge:**
Modern technical concepts emerge from Western cultural assumptions (object-oriented, analytical, static). Ancient and indigenous languages often encode different worldviews (process-oriented, relational, holistic).

**Translation Approach: NOT word-for-word, but concept-to-concept**

Example translations:
- "Distributed consensus" → Sanskrit: *Sārasangata* (resonant union through sound)
- "Network protocol" → Chinese: *Lǐ* (ritual propriety, right relationships)
- "Data structure" → Māori: *Whakapapa* (genealogical layering)

**Target Languages & Philosophies:**

| Language | Core Philosophy | Translation Focus |
|----------|----------------|-------------------|
| **Sanskrit** | Nada Brahma (World is Sound) | Vibrational resonance |
| **Sumerian** | Cosmic Ordering (The Me) | Divine ordinances |
| **Ancient Hebrew** | Verbal Dynamism (Word = Event) | Speech-act computation |
| **Classical Greek** | Logos (Universal Truth) | Ideal forms |
| **Classical Chinese** | Zhengming (Rectification) | Harmonious relationships |
| **Pacific Islander** | Mana (Breath power) | Ancestral transmission |
| **Indigenous American** | Process Philosophy (80% verbs) | Ongoing becoming |

**Scholars to Study:**
- F. David Peat (Blackfoot physics)
- Dr. Leroy Little Bear (Indigenous metaphysics)
- David Bohm (Wholeness/implicate order)
- Gregory Cajete (Native science)
- John Mbiti (African Sasa/Zamani time)
- Lera Boroditsky (Language & cognition)
- Dr. TK Irwin (Mātauranga Māori)

**Project Structure:**
```
research/cross-cultural-translation/
├── ANCIENT_LANGUAGE_GUIDE.md        # Methodology
├── SCHOLAR_RESEARCH_SUMMARY.md      # Framework synthesis
├── LANGUAGE_PROFILES/               # Language deep dives
├── CONCEPTUAL_BRIDGES/              # Concept mapping
└── TRANSLATIONS/                    # Actual translations
```

**Agent Instructions:**
1. Read the Scholar Research Summary first
2. Study the Language Profile for your assigned tradition
3. Use Kimi (128K context) for deep research
4. Think IN the target language, not translate FROM English
5. Respect indigenous knowledge sovereignty
6. Document novel computational insights that emerge

**Success Metrics:**
- Cultural fidelity (would native speakers recognize their worldview?)
- Conceptual depth (not word count, but understanding)
- Novel insights (what new perspectives emerge?)
- Knowledge sovereignty (proper attribution)

**See:** `research/cross-cultural-translation/ANCIENT_LANGUAGE_GUIDE.md` for complete methodology

### Step 5: Legacy Multi-API Simulation Tools

The project includes a multi-API simulation framework for research ideation and validation.

**Available APIs:**
- **DeepInfra**: Novel models (Llama 3 70B, Qwen 2 72B, Nemo 340B) for diverse perspectives
- **DeepSeek**: Cost-effective model for rapid iterations and prototyping
- **Moonshot**: High-quality reasoning for critical analysis

**Setup:**
```bash
cd research/simulation_framework
pip install -r requirements.txt
```

**Quick Test:**
```bash
python run_mini_ideation.py
```

**Full 5-Phase Simulation:**
```bash
python run_5_phase_simulation.py
```
- Generate research hypotheses using ensemble methods
- Validate claims with multi-model review
- Literature synthesis across different perspectives
- Method development from diverse viewpoints
- Cost-effective iteration with DeepSeek
- Novel insights from different model architectures

**MCP-Powered Best Practices:**
1. Use **Groq (FREE)** for initial exploration and devil's advocate challenges
2. Use **DeepInfra Mistral 7B** ($0.03/1M) for cost-effective ensemble methods
3. Use **DeepSeek** for explicit chain-of-thought when needed
4. Use **async batching** for 50% savings on large simulation batches
5. Save results to `simulation_framework/results/` for tracking

### Step 4: Choose Your Focus

#### Option A: Complete Phase 1 Papers (P1, P5, P7-P9, P11, P19, P21)
- Read existing papers in `papers/01-23/`
- Follow the pattern of completed papers
- Add mathematical proofs and validation

#### Option B: Develop Phase 3 Papers (P31-P40)
- Review simulation schemas in `papers/24-30/`
- Create new papers following P24-P30 pattern
- Include simulation validation code

#### Option C: Polish Phase 4 Papers (P41-P47)
- Review `research/ecosystem_papers/`
- Run validation simulations
- Prepare for conference submission

#### Option D: Develop Lucineer Papers (P51-P60)
- Read `research/lucineer_analysis/LUCINEER_PAPER_PROPOSALS.md`
- Create complete papers from proposals
- Include hardware validation plans

---

## Paper Structure Template

Every paper should include:

```markdown
# P##: [Paper Title]

**Venue:** [Conference/Journal]
**Status:** [Draft/Complete/Submitted]

## Abstract
[2-3 paragraph summary]

## 1. Introduction
- Motivation
- Problem statement
- Contributions

## 2. Background
- Related work
- Mathematical foundations

## 3. Methodology
- Technical approach
- Algorithms
- Proofs

## 4. Implementation
- Code structure
- Key functions

## 5. Validation
- Simulation results
- Statistical analysis
- Comparison to baseline

## 6. Discussion
- Limitations
- Future work

## 7. Conclusion

## References

## Appendix
- Proof details
- Additional experiments
```

---

## Simulation Guidelines

### Required Components
1. **simulation_schema.py** - Core simulation code
2. **validation_criteria.md** - What validates/falsifies claims
3. **cross_paper_notes.md** - Connections to other papers

### Statistical Requirements
```python
# Minimum requirements
POWER = 0.8           # Statistical power
ALPHA = 0.05          # Significance level
REPLICATIONS = 20     # Number of runs
EFFECT_SIZE = 0.5     # Cohen's d (medium)
```

### Example Structure
```python
#!/usr/bin/env python3
"""
[PAPER] Simulation - Validates P## claims
[One-line description]
"""

import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum

# Data structures
@dataclass
class SimulationConfig:
    iterations: int = 1000
    seed: int = 42

# Main simulation class
class PaperSimulation:
    def __init__(self, config: SimulationConfig):
        self.config = config
        np.random.seed(config.seed)

    def run(self) -> Dict:
        """Run simulation and return results"""
        results = {
            "mean": 0.0,
            "std": 0.0,
            "p_value": 0.0,
            "effect_size": 0.0
        }
        # ... implementation
        return results

# Validation
def validate_claims(results: Dict) -> bool:
    """Check if results validate paper claims"""
    return results["p_value"] < 0.05

if __name__ == "__main__":
    sim = PaperSimulation(SimulationConfig())
    results = sim.run()
    print(f"Results: {results}")
    print(f"Validated: {validate_claims(results)}")
```

---

## Git Workflow

### Committing Work
```bash
# Check current status
git status

# Stage your changes
git add research/your_folder/

# Commit with descriptive message
git commit -m "feat: [P##] Your description"

# Push to branch
git push origin papers-main
```

### Commit Message Format
```
feat: [P##] New feature
fix: [P##] Bug fix
docs: [P##] Documentation update
sim: [P##] Simulation results
paper: [P##] Paper draft/revision
```

---

## Code Style

### Python
- Use type hints
- Document all functions
- Follow PEP 8
- Use dataclasses for structures
- Include statistical validation

### TypeScript
- Follow existing patterns in SuperInstance_Ecosystem/
- Export all public APIs
- Use strict mode

### Markdown
- Use proper headers
- Include code blocks with language
- Add diagrams where helpful

---

## Paper Categories

### Hardware Systems (P51, P52, P54, P56, P57)
- Focus: Chip design, thermal, ternary logic
- Venues: PLDI, IEEE TCAD, DATE, ASPLOS
- Validation: FPGA prototypes, simulations

### Educational AI (P53, P58, P60)
- Focus: Pedagogy, cross-cultural, game theory
- Venues: CHI, AERA, IJCAI, CogSci
- Validation: A/B testing, statistical analysis

### Systems & Economics (P55, P59)
- Focus: Cartridge model, swarm coordination
- Venues: EC, PODC, KDD
- Validation: Economic modeling, multi-agent simulations

---

## Key Resources

### Internal Documents
- `research/PHASE_5_PROPOSAL.md` - Current phase plan
- `research/lucineer_analysis/` - Hardware papers
- `research/ecosystem_papers/` - Example complete papers

### External
- GitHub: https://github.com/SuperInstance/polln
- Papers: https://github.com/SuperInstance/SuperInstance-papers

---

## Common Tasks

### Task 1: Complete a Paper Draft
1. Read paper proposal in `research/lucineer_analysis/`
2. Create full paper in `papers/` or `research/ecosystem_papers/`
3. Include all sections from template
4. Add simulation code
5. Commit and push

### Task 2: Run Validation Simulation
1. Navigate to `research/ecosystem_simulations/`
2. Run `python simulation_name.py`
3. Analyze results
4. Update paper with findings
5. Commit results

### Task 3: Prepare for Submission
1. Format paper for venue guidelines
2. Create supplementary materials
3. Prepare response templates
4. Document in paper header

---

## Getting Help

### Check First
1. Read this onboarding guide
2. Review existing papers for patterns
3. Check `TODO_NEXT.md` files

### Ask About
- Paper structure questions
- Simulation requirements
- Git workflow issues
- Venue selection

---

## Success Metrics

### Paper Completion
- All sections filled
- Mathematical proofs included
- Simulation validates claims
- Ready for submission

### Code Quality
- Type hints present
- Functions documented
- Tests pass
- Clean commit history

---

## Handoff Protocol

When you complete work or context is full:

1. **Summarize Progress**
   ```bash
   # Create summary
   echo "# Summary - [Your Role] - $(date)" > summary.md
   ```

2. **Commit Everything**
   ```bash
   git add .
   git commit -m "feat: [P##] Progress summary"
   git push
   ```

3. **Create TODO**
   ```bash
   echo "# TODO Next" > TODO_NEXT.md
   echo "- [ ] Remaining task 1" >> TODO_NEXT.md
   ```

4. **Link to Work**
   ```bash
   git log -1 --format="%H" > last_commit.txt
   ```

---

**Welcome to the team!**
**Last Updated:** 2026-03-14
**Version:** 3.0 (Ancient Language Translation Edition)
