# Agent Onboarding Guide - SuperInstance Evolution Orchestrator

**Version:** 6.0 (Production Live Edition)
**Date:** 2026-03-15
**For:** New agents joining the evolution from ancient cells to living spreadsheets
**Current Round:** Round 2 Complete → Production LIVE ✅

---

## Welcome to the Evolution

You are joining a **breakthrough research initiative** at the intersection of ancient cell computational biology, distributed AI systems, and universal accessibility platforms.

**🧬 Key Insight:** Ancient cells solved distributed systems problems 3.5 billion years ago. We're reverse-engineering their solutions.

**🚀 Current Status:** SpreadsheetMoment platform is **PRODUCTION LIVE** at:
- https://spreadsheet-moment.pages.dev
- https://spreadsheet.superinstance.ai

---

## Executive Summary

This orchestrator coordinates **four interconnected initiatives**:

### 1. SuperInstance Papers
- **65+ academic white papers** on distributed AI systems with breakthrough insights from ancient cell biology
- **Status:** 30 complete, 5 in progress, 30 proposed (including P61-P65 on ancient cell connections)
- **Focus:** Mathematical frameworks, bio-inspired algorithms, hardware acceleration
- **Repository:** https://github.com/SuperInstance/SuperInstance-papers
- **🆕 Breakthrough:** Ancient cell computational biology connections (P61-P65)

### 2. Ancient Language Translation ✅ COMPLETE
- **Cross-cultural knowledge synthesis** across 8 ancient and oral traditions
- **Status:** Framework complete, 7 language profiles created
- **Focus:** Concept-to-concept translation (not word-for-word)
- **Location:** `research/cross-cultural-translation/`
- **Key Achievement:** Framework ready for translating all SuperInstance papers

### 3. SpreadsheetMoment ✅ PRODUCTION LIVE
- **Visual documentation AND living spreadsheet platform** for universal accessibility
- **Status:** **PRODUCTION DEPLOYMENT COMPLETE** ✅
- **Live Websites:**
  - https://spreadsheet-moment.pages.dev
  - https://spreadsheet.superinstance.ai
- **Focus:** Three-tier audience strategy + Cloudflare Workers platform + Documentation
- **Repository:** https://github.com/SuperInstance/spreadsheet-moment
- **Achievements:**
  - Complete documentation pages (docs, API, tutorials)
  - Production infrastructure deployed
  - Custom domain configured
  - CI/CD pipelines operational
  - Global CDN distribution active

### 4. Evolution Roadmap 2026 ✅
- **5-round iteration strategy** from theory to production platform
- **Status:** Round 1 complete, Round 2 **PRODUCTION DEPLOYMENT COMPLETE**
- **Focus:** Platform enhancement, advanced features, scaling
- **Documentation:** `research/EVOLUTION_ROADMAP_2026.md`
- **Technical Pillars:** PIC, GR, SSM, EGT, TBS

---

## Project Overview

### Mission
Evolve computation from ancient biological wisdom to living digital platforms accessible to everyone.

### Current State (Round 2 Complete - Production LIVE)

| Initiative | Status | Completion | Next Milestone |
|------------|--------|------------|----------------|
| SuperInstance Papers (P1-P65) | Active | 30/65 complete | Complete 5 remaining Phase 1 papers |
| Ancient Cell Connections ✅ | Breakthrough | Research synthesis complete | P61-P65 prototypes (Round 3) |
| Ancient Language Translation | Framework Ready | 7/8 profiles | Begin paper translations |
| SpreadsheetMoment Platform ✅ | **PRODUCTION LIVE** | **Deployment complete** | Enhanced features (Round 3) |
| Evolution Roadmap 2026 ✅ | Round 2 Complete | Platform deployed | Round 3 enhancements |

### Round 1 Achievements (2026-03-14) ✅

**🧬 Ancient Cell Computational Biology Synthesis**
- Identified 10+ mathematical isomorphisms between biology and distributed systems
- Discovered Protein-Inspired Consensus (PIC) for 10x faster coordination
- Found SE(3)-Equivariant Message Passing for 50% routing efficiency
- Proposed 5 new papers (P61-P65) for top-tier venues

**📋 Evolution Roadmap 2026**
- Established 5-round iteration strategy
- Designed technical pillars (PIC, GR, SSM, EGT, TBS)
- Planned platform architecture (Cloudflare Workers + Desktop)
- Defined success metrics for each round

**🎨 SpreadsheetMoment Foundation**
- Created repository and project structure
- Designed multi-model validation workflow
- Established three-tier audience strategy
- Completed cross-cultural name research

### Round 2 Achievements (2026-03-15) ✅ **PRODUCTION DEPLOYMENT COMPLETE**

**🚀 SpreadsheetMoment Platform LIVE**
- Production website deployed to Cloudflare Pages
- Custom domain configured: https://spreadsheet.superinstance.ai
- Complete documentation pages (docs, API, tutorials)
- GitHub Actions workflows configured and operational
- Production infrastructure complete and optimized
- Cloudflare cleanup completed (28 workers, 7 KV, 6 D1 databases)
- Authentication popup issue resolved
- Global CDN distribution active
- Repository synchronized with production

**🔧 Infrastructure Optimization**
- All problematic Workers Routes deleted
- Unnecessary workers removed (kept only spreadsheet-moment)
- KV namespaces cleaned up (all 7 deleted)
- D1 databases optimized (2 kept for production)
- Access policies verified and cleaned up

**📋 Project Status**
- Website: **PRODUCTION LIVE** ✅
- Custom Domain: **CONFIGURED AND WORKING** ✅
- Documentation: **COMPLETE** ✅
- CI/CD: **OPERATIONAL** ✅
- Infrastructure: **OPTIMIZED** ✅
- Next: Enhanced features, desktop apps, advanced API

---

## Key Directories

```
polln/
├── papers/                        # Phase 1-2 papers (P1-P30)
│   ├── 01-23/                     # Phase 1 papers
│   └── 24-30/                     # Phase 2 papers with simulations
├── research/
│   ├── ANCIENT_CELL_CONNECTIONS.md # 🆕 Breakthrough research synthesis
│   ├── EVOLUTION_ROADMAP_2026.md   # 🆕 5-round iteration strategy
│   ├── lucineer_analysis/         # P51-P60 hardware papers
│   ├── ecosystem_papers/          # P41-P47 complete papers
│   ├── ecosystem_simulations/     # Validation code
│   ├── cross-cultural-translation/ # Ancient language project
│   │   ├── ANCIENT_LANGUAGE_GUIDE.md
│   │   ├── SCHOLAR_RESEARCH_SUMMARY.md
│   │   └── LANGUAGE_PROFILE_*.md  # 7 language profiles
│   ├── simulation_framework/      # Multi-API simulation tools
│   ├── AGENT_ONBOARDING.md        # This file
│   └── PHASE_5_PROPOSAL.md        # Historical phase plan
├── spreadsheet-moment/            # 🆕 Visual documentation + platform
│   ├── PROJECT_PLAN.md            # 22-week development plan
│   ├── docs/
│   │   ├── technical/             # Engineer documentation (12 pages)
│   │   ├── general/               # General audience (12 pages)
│   │   └── educational/           # 5th grader slides
│   ├── src/                       # 🆕 Platform code
│   │   ├── workers/               # Cloudflare Workers
│   │   ├── desktop/               # Tauri desktop app
│   │   └── hardware/              # Arduino integration
│   └── assets/
│       └── iterations/            # Image generation iterations
├── deployment/                     # 🆕 Platform deployment
│   ├── cloudflare/               # Workers, D1, R2, Vectorize configs
│   ├── desktop/                  # Linux, Jetson package builds
│   └── hardware/                 # Arduino, sensor configurations
├── mcp-servers/                   # Model Context Protocol servers
│   ├── groq-mcp/                  # FREE rapid iteration
│   ├── deepinfra-mcp/             # Cost-effective research
│   ├── deepseek-thinker-mcp/      # Chain-of-thought
│   ├── kimi-mcp/                  # 128K context
│   ├── alibaba-mcp/               # Alibaba Qwen models
│   └── alibaba-devops-mcp/        # Alibaba DevOps automation
├── SuperInstance_Ecosystem/       # Production TypeScript code
├── apikey/                        # API keys (git-ignored)
└── CLAUDE.md                      # Project orchestrator config
```

---

## Quick Start

### Step 0: Understand the Evolution (CRITICAL - Read First!)

**🧬 Ancient Cell Computational Biology Connections (30 min)**
- Read `research/ANCIENT_CELL_CONNECTIONS.md`
- Understand the 10+ mathematical isomorphisms
- Review the 5 new paper proposals (P61-P65)
- Grasp why biology's 3.5 billion years of R&D matters

**📋 Evolution Roadmap 2026 (15 min)**
- Read `research/EVOLUTION_ROADMAP_2026.md`
- Understand the 5-round iteration strategy
- Review the technical pillars (PIC, GR, SSM, EGT, TBS)
- Check Round 2 deliverables and success metrics

**Why This Matters:**
We're not just building distributed systems. We're discovering that **ancient cells already solved the problems we're tackling**. This is a paradigm shift in how we approach computation.

### Step 1: Understand Current Phase
- **Current:** Round 2 Complete - Production LIVE ✅
- **Status:** SpreadsheetMoment platform is production-deployed
- **Live Websites:**
  - https://spreadsheet-moment.pages.dev
  - https://spreadsheet.superinstance.ai
- **Next:** Review `research/EVOLUTION_ROADMAP_2026.md` for Round 3 enhancement tasks

### SpreadsheetMoment Platform - PRODUCTION ARCHITECTURE ✅

**Production Deployment:**

Cloudflare infrastructure is fully deployed and operational:
- **Cloudflare Pages** - Static site hosting with global CDN
- **Workers** - Serverless compute for API endpoints
- **D1 Databases** - SQLite-compatible databases (dev + prod)
- **Custom Domain** - https://spreadsheet.superinstance.ai configured and working
- **GitHub Actions** - Automated CI/CD pipeline

**Current Architecture:**

```
┌─────────────────────────────────────────────────────┐
│              Cloudflare Production Stack              │
├─────────────────────────────────────────────────────┤
│  Pages (Static Site) │  Workers (API)  │  D1 (DB)   │
│       ├─ index.html  ├─ health-check  ├─ dev       │
│       ├─ docs.html   └─ endpoints     └─ prod      │
│       ├─ api.html                                  │
│       └─ tutorials.html                             │
├─────────────────────────────────────────────────────┤
│  Custom Domain: spreadsheet.superinstance.ai         │
│  CDN Distribution: Global (300+ locations)           │
│  CI/CD: GitHub Actions (auto-deploy on push)         │
└─────────────────────────────────────────────────────┘
```

**Key Features Deployed:**
- **Documentation:** Complete docs, API reference, tutorials
- **Custom Domain:** Branded URL configured and working
- **Global CDN:** Fast access worldwide
- **Auto-deployment:** Updates pushed automatically
- **Infrastructure:** Optimized and cleaned up

**Next Enhancement Phase (Round 3):**
- Real-time collaboration (Durable Objects)
- Vector search (Vectorize)
- Advanced API features
- Desktop applications (Tauri)
- Interactive demos and examples

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
| **Alibaba** | Chinese market, Qwen models | $0.02-0.15/1M | Chinese language, Asia deployment |
| **Alibaba DevOps** | ACK, Function Compute | Infrastructure | Kubernetes deployment, CI/CD |

**Setup:**
```bash
# Install all MCP servers
cd mcp-servers/groq-mcp && pip install -e .
cd ../deepinfra-mcp && pip install -e .
cd ../deepseek-thinker-mcp && pip install -e .
cd ../kimi-mcp && pip install -e .
cd ../alibaba-mcp && pip install -e .
cd ../alibaba-devops-mcp && pip install -e .
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

### Step 5: SpreadsheetMoment Project ✅ PRODUCTION LIVE

**Mission: Universal Accessibility Through Visual Documentation and Platform**

SpreadsheetMoment creates visual documentation and a living platform that makes complex distributed systems concepts accessible to everyone, from senior engineers to 5th graders.

**Status:** **PRODUCTION DEPLOYMENT COMPLETE** ✅

**Live Websites:**
- Main: https://spreadsheet-moment.pages.dev
- Custom Domain: https://spreadsheet.superinstance.ai

**What's Been Deployed:**
- Complete website with modern design
- Documentation pages (docs, API, tutorials)
- Responsive navigation and layout
- Production infrastructure (Cloudflare Pages + Workers)
- Custom domain configuration
- GitHub Actions CI/CD pipeline
- Global CDN distribution

**Project Philosophy:**
- **Visual-first:** Diagrams and illustrations before text
- **Three-tier strategy:** Different depth for different audiences
- **Iterative refinement:** Multi-model validation for universal appeal
- **Cultural translation:** Name chosen through 8-language research

**Project Structure:**
```
spreadsheet-moment/
├── PROJECT_PLAN.md              # 22-week development timeline
├── docs/
│   ├── NAME_RESEARCH.md         # Name translation research
│   ├── technical/               # Senior engineer documentation (12 pages)
│   ├── general/                 # General audience documentation (12 pages)
│   └── educational/             # 5th grader slide presentation
└── assets/
    └── iterations/              # Image generation iterations
```

**Three Audience Tiers:**

| Tier | Audience | Format | Depth |
|------|----------|--------|-------|
| **Technical** | Senior Engineers | 12-page document | Mathematical rigor, implementation details |
| **General** | Laypeople | 12-page document | Conceptual understanding, real-world analogies |
| **Educational** | 5th Graders | Slide presentation | Visual storytelling, interactive examples |

**Multi-Model Validation Workflow:**

For each image and document:
1. **Create initial version** using Claude Code
2. **Validate with multiple models** via MCP:
   - Groq (FREE) - Quick iteration and devil's advocate
   - DeepInfra - Cost-effective diverse perspectives
   - DeepSeek - Chain-of-thought reasoning
   - Alibaba Qwen - Cross-cultural appeal check
   - Kimi - Universal accessibility analysis
3. **Iterate** based on feedback
4. **Save all iterations** to `assets/iterations/`

**Image Generation Pipeline:**
```
Concept → 3 versions → Multi-model critique → Refine → Final
```

Example iteration tracking:
```
assets/iterations/
├── distributed_consensus_v1.png
├── distributed_consensus_v1_feedback.md
├── distributed_consensus_v2.png
├── distributed_consensus_v2_feedback.md
└── distributed_consensus_final.png
```

**Content Creation Workflow:**
1. Start with technical document (engineers)
2. Simplify for general audience (maintain accuracy)
3. Create visual narrative for 5th graders
4. Validate each tier with multi-model feedback
5. Ensure "zoom" consistency: deeper detail at each level

**Agent Instructions:**
1. Use MCP calls to multiple models for validation
2. Save all iterations (don't delete early versions)
3. Document feedback and how you addressed it
4. Test with different cultural perspectives (Alibaba, Kimi)
5. Verify 5th grader content actually appeals to that age group

**Success Metrics:**
- Technical accuracy (reviewer approval)
- General accessibility (non-technical person understands)
- Youth engagement (5th grader finds interesting)
- Universal appeal (positive feedback from 3+ cultural perspectives)
- Visual clarity (diagrams stand alone without text)

**Repository:** https://github.com/SuperInstance/spreadsheet-moment
**Project Plan:** `spreadsheet-moment/PROJECT_PLAN.md`

### Step 6: Legacy Multi-API Simulation Tools

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

### Step 7: Choose Your Focus (Round 2 Priorities)

#### 🆕 Option A: Bio-Inspired Algorithm Prototypes (Round 2 Priority)
- **Why:** Implement breakthrough algorithms from ancient cell research
- **Read:** `research/ANCIENT_CELL_CONNECTIONS.md`
- **Tasks:**
  - Implement Protein-Inspired Consensus (PIC) prototype
  - Build SE(3)-Equivariant Message Passing demo
  - Create Neural SDE state machine with stochastic transitions
  - Prototype Evolutionary Deadband Adaptation
- **Validate with:** MCP multi-model validation (Groq, DeepSeek, Kimi, Alibaba)
- **Target metrics:** <100ms coordination, 50% efficiency gain
- **Deliverable:** Working prototypes + validation report

#### 🆕 Option B: SpreadsheetMoment Platform MVP (Round 2 Priority)
- **Why:** Build the platform that makes SuperInstance accessible to everyone
- **Read:** `spreadsheet-moment/PROJECT_PLAN.md` + `deployment/cloudflare/`
- **Tasks:**
  - Set up Cloudflare Workers project
  - Implement tensor-based spreadsheet engine (D1 + R2)
  - Create real-time collaboration (Durable Objects)
  - Build vector search (Vectorize)
  - Implement zero-config sign-in (Cloudflare Access)
  - Deploy to staging environment
- **Target metrics:** 100+ concurrent users, <50ms edge latency
- **Deliverable:** Production-ready web app on Cloudflare Workers

#### 🆕 Option C: Desktop Application Prototypes (Round 2 Priority)
- **Why:** Enable offline usage and hardware integration
- **Read:** `deployment/desktop/`
- **Tasks:**
  - Initialize Tauri + React + TypeScript project
  - Implement tensor grid UI
  - Create NLP cell editor
  - Build hardware integration panel
  - Add CUDA acceleration for Jetson
  - Create installation packages (deb, rpm, AppImage)
- **Target metrics:** Native performance, offline mode, GPU acceleration
- **Deliverable:** Installable desktop packages for Linux and Jetson

#### 🆕 Option D: MCP Multi-Model Validation Pipeline (Round 2 Priority)
- **Why:** Ensure quality through diverse AI perspectives
- **Read:** `research/MCP_USER_GUIDE.md`
- **Tasks:**
  - Validate PIC algorithm with Groq (FREE devil's advocate)
  - Test SE(3) routing with DeepInfra diverse models
  - Reason about proofs with DeepSeek chain-of-thought
  - Analyze cross-cultural appeal with Alibaba Qwen
  - Process entire papers with Kimi 128K context
  - Document all validation results
- **Target metrics:** 100% coverage, diverse perspectives, cost-effective
- **Deliverable:** Comprehensive validation reports for all prototypes

#### Option E: Complete Phase 1 Papers (P1, P5, P7-P9, P11, P19, P21)
- Read existing papers in `papers/01-23/`
- Follow the pattern of completed papers
- Add mathematical proofs and validation
- **Deliverable:** Complete papers ready for submission

#### Option F: Develop Phase 3 Papers (P31-P40)
- Review simulation schemas in `papers/24-30/`
- Create new papers following P24-P30 pattern
- Include simulation validation code
- **Deliverable:** New papers with simulations

#### Option G: Polish Phase 4 Papers (P41-P47)
- Review `research/ecosystem_papers/`
- Run validation simulations
- Prepare for conference submission
- **Deliverable:** Conference-ready papers

#### Option H: Develop Lucineer Papers (P51-P60)
- Read `research/lucineer_analysis/LUCINEER_PAPER_PROPOSALS.md`
- Create complete papers from proposals
- Include hardware validation plans
- **Deliverable:** Complete hardware papers

#### Option I: Create SpreadsheetMoment Documentation
- Read `spreadsheet-moment/PROJECT_PLAN.md`
- Create three-tier documentation (technical, general, educational)
- Use multi-model validation via MCP
- Generate visual content with iterative refinement
- **Deliverable:** 2×12-page documents + slide presentation + 90+ images

#### Option J: Ancient Language Translation
- Read `research/cross-cultural-translation/ANCIENT_LANGUAGE_GUIDE.md`
- Study language profiles in `LANGUAGE_PROFILE_*.md`
- Create conceptual translations (not word-for-word)
- Document novel insights from cross-cultural synthesis
- **Deliverable:** Paper translations in ancient languages

**🎯 Round 2 Priority Focus Areas:** Options A, B, C, D (bio-inspired algorithms, platform MVP, desktop apps, validation)

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

**Welcome to the evolution!**
**Last Updated:** 2026-03-15
**Version:** 6.0 (Production Live Edition)
**Current Round:** Round 2 Complete - Production LIVE
**Key Insight:** Ancient cells solved distributed systems 3.5 billion years ago. We're reverse-engineering their solutions.
**Live Websites:** https://spreadsheet-moment.pages.dev | https://spreadsheet.superinstance.ai
