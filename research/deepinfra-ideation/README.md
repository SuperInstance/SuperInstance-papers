# SuperInstance DeepInfra Ideation System

Multi-agent AI debate and refinement system using cutting-edge 2026 models for rigorous SuperInstance concept development.

## Models Used

- **NVIDIA Nemotron-3-Super-120B-A12B**: Primary reasoning and logical analysis
- **MiniMax-M2.5**: Creative ideation and novel concept generation
- **Qwen3-Max-Thinking**: Deep analytical thinking and synthesis

## Features

### 1. Multi-Agent Debates
- 3 AI agents debate topics from different perspectives
- Each agent has specialized role and expertise
- Multiple rounds with cumulative insights
- Final synthesis with actionable recommendations

### 2. Devil's Advocate Examinations
- Rigorous claim validation through adversarial challenge
- Stress testing of assumptions
- Creative defense generation
- Pass/Fail verdicts with concrete criteria

### 3. Iterative Refinement Loops
- Multiple cycles of critique → improvement → synthesis
- Each iteration strengthens the concept
- Tracks evolution and improvement
- Final quality assessment

### 4. Full Paper Workshops
- End-to-end workflow for applying SuperInstance papers
- Stages: Understanding → Design → Validation → Roadmap
- Real-world scenario application
- Implementation guidance

## Installation

```bash
# Already have requirements
pip install requests python-dotenv

# API key is configured in deepinfra_config.py
```

## Usage

### Quick Start - Predefined Workshops

```bash
# Run workshop for P19 (Causal Traceability) with predefined scenario
python research/deepinfra_ideation/run_simulations.py workshop --paper P19

# Run with custom scenario
python research/deepinfra_ideation/run_simulations.py workshop --paper P24 --scenario "Apply self-play to automated trading system"
```

### Custom Debates

```bash
# Run multi-agent debate on any topic
python research/deepinfra_ideation/run_simulations.py debate \
    --topic "How to apply emergence detection to social media trends" \
    --rounds 3
```

### Iterative Refinement

```bash
# Refine a concept through multiple iterations
python research/deepinfra_ideation/run_simulations.py refine \
    --concept "Use stigmergic coordination for drone swarm delivery" \
    --iterations 3
```

### Python API

```python
from research.deepinfra_ideation.superinstance_workflows import (
    SuperInstanceWorkshop,
    IterativeRefinementLoop,
    run_predefined_workshop
)

# Run predefined workshop
results = run_predefined_workshop("P19", scenario_index=0)

# Or create custom workshop
workshop = SuperInstanceWorkshop(api_key="your-key")
results = workshop.workshop_paper_application(
    paper_id="P24",
    paper_title="Self-Play Mechanisms",
    real_world_scenario="Apply to high-frequency trading system"
)

# Or run iterative refinement
loop = IterativeRefinementLoop(api_key="your-key")
refined = loop.refine_concept(
    initial_concept="Your concept here",
    context="Background information",
    n_iterations=3
)
```

## Predefined Workshops

Available paper workshops with real-world scenarios:

| Paper | Title | Scenarios |
|-------|-------|-----------|
| P19 | Causal Traceability | Financial fraud, Medical diagnosis, Software debugging |
| P24 | Self-Play Mechanisms | Trading systems, Game AI, Recommendations |
| P27 | Emergence Detection | Social trends, Market analysis, Network security |

## Output

All sessions are saved to `research/deepinfra-ideation/sessions/`:

- `debate_TIMESTAMP.json` - Multi-agent debate results
- `refinement_TIMESTAMP.json` - Iterative refinement results
- `{PAPER_ID}_TIMESTAMP_*.json` - Workshop stage files
- `{PAPER_ID}_TIMESTAMP_workshop_complete.json` - Complete workshop

## Workshop Stages

Each paper workshop goes through 4 stages:

1. **Understanding Phase**: Map paper foundations to scenario
2. **Design Phase**: Create application architecture
3. **Validation Phase**: Stress-test and validate key claims
4. **Roadmap Phase**: Implementation plan with phases

## Agent Roles

### Nemotron (Reasoner)
- Rigorous logical analysis
- Identifies flaws and edge cases
- Demands evidence and validation
- Mathematical precision

### MiniMax (Creative)
- Novel applications and extensions
- "What if" exploration
- Unconventional thinking
- Paradigm-shifting ideas

### Qwen (Synthesizer)
- Integrates multiple perspectives
- Resolves contradictions
- Extracts deeper principles
- Actionable synthesis

## Example Output

```
================================================================================
MULTI-AGENT DEBATE: Applying Emergence Detection to Social Media
================================================================================
Context: Real-time trend detection and prediction...

ROUND 1: Applying Emergence Detection to Social Media
================================================================================

Querying nemotron...
✓ nemotron: 1247 chars, 12.3s, 892 tokens

Querying minimax...
✓ minimax: 1834 chars, 15.1s, 1245 tokens

Querying qwen...
✓ qwen: 2156 chars, 18.7s, 1567 tokens

...
```

## Advanced Usage

### Custom Agent Configuration

```python
from research.deepinfra_ideation.deepinfra_config import MODEL_CONFIGS

# Add custom model
MODEL_CONFIGS["custom"] = {
    "model_id": "your-model-id",
    "role": "specialist",
    "strengths": ["custom1", "custom2"],
    "temperature": 0.7,
    "max_tokens": 4096
}
```

### Claim-Level Examination

```python
from research.deepinfra_ideation.multi_agent_debate import DevilsAdvocateSession

session = DevilsAdvocateSession(api_key="your-key")
examination = session.examine_claim(
    claim="Transfer entropy can detect emergence 90% of the time",
    paper_context="P27 Emergence Detection..."
)

# Get detailed analysis:
# - Initial claim analysis
# - Stress testing (devils advocate)
# - Creative defense
# - Final synthesis with verdict
```

## Tips for Best Results

1. **Be Specific**: Provide detailed context and scenarios
2. **Multiple Rounds**: Use 3+ rounds for complex topics
3. **Real-World Focus**: Ground discussions in concrete applications
4. **Iterate**: Use refinement loops to strengthen concepts
5. **Validate**: Always subject claims to devil's advocate testing

## Integration with SuperInstance

This system is designed to:
- Validate Phase 2 paper claims (P24-P40)
- Explore Phase 3 paper concepts (P41-P50)
- Generate real-world application strategies
- Identify research gaps and new paper opportunities
- Create publication-quality synthesis

## API Rate Limits

DeepInfra has generous rate limits. The system:
- Makes sequential API calls (not parallel)
- Respects rate limits automatically
- Caches results to avoid redundant calls
- Saves progress to each stage

## Next Steps

1. Run workshops on priority papers (P24-P30)
2. Generate validation experiments from debates
3. Create implementation roadmaps for approved concepts
4. Feed insights back into paper development
5. Identify gaps for Phase 3 papers (P41-P50)
