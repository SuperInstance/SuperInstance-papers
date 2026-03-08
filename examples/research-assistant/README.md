# Research Assistant Example

A sophisticated demonstration of POLLN's advanced capabilities:
- META tiles for flexible, pluripotent agent differentiation
- World model dreaming for policy optimization
- Multi-step research workflows
- Dynamic agent specialization based on task demands

## What It Does

This example simulates a research assistant that can handle various types of research tasks:

1. **Literature Review** - Analyzing and summarizing academic papers
2. **Data Analysis** - Processing and analyzing datasets
3. **Writing Assistance** - Helping with research writing and formatting

META tiles start undifferentiated and specialize based on the type of work they receive. The system uses dream-based optimization to improve its policies over time.

## How to Run

```bash
# From the examples directory
cd research-assistant
npm install
npm start
```

## Configuration

Edit `config.ts` to customize:

- `metaTileCount`: Number of pluripotent META tiles
- `differentiationThreshold`: Signal strength needed to trigger differentiation
- `dreamHorizon`: Length of dream episodes for policy optimization
- `explorationRate`: How much to explore vs exploit in dreams

## Example Output

```
Research Assistant Demo
=======================

Initializing META tiles...
  Spawned meta-tile-1 (UNIVERSAL potential)
  Spawned meta-tile-2 (UNIVERSAL potential)
  Spawned meta-tile-3 (UNIVERSAL potential)

Processing research tasks...

Task 1: Literature Review on Machine Learning
  Broadcasting demand signal for role agents
  meta-tile-1 received signal (urgency: 0.8)
  meta-tile-1 differentiating into RoleAgent
  META tile specialized: meta-tile-1 -> RoleAgent (literature-review)
  Result: "Analyzed 15 papers on ML. Key themes: transformers, reinforcement learning."

Task 2: Analyze dataset with 10,000 samples
  Broadcasting demand signal for task agents
  meta-tile-2 received signal (urgency: 0.9)
  meta-tile-2 differentiating into TaskAgent
  META tile specialized: meta-tile-2 -> TaskAgent (data-analysis)
  Result: "Processed 10,000 samples. Mean: 42.3, Std: 8.7, Outliers: 127."

Task 3: Help write research paper introduction
  Broadcasting demand signal for role agents
  meta-tile-3 received signal (urgency: 0.7)
  meta-tile-3 differentiating into RoleAgent
  META tile specialized: meta-tile-3 -> RoleAgent (writing-assist)
  Result: "Drafted 500-word introduction with 3 citations."

Running dream-based optimization...
  Generated 5 dream episodes
  Policy improved: +2.3% average return
  Value loss: 0.045, Policy loss: 0.123

Final META tile stats:
  meta-tile-1: RoleAgent (literature-review)
    - Signal strengths: task=0.2, role=0.9, core=0.1
    - Capability state: [0.1, 0.9, 0.0]
  meta-tile-2: TaskAgent (data-analysis)
    - Signal strengths: task=0.95, role=0.1, core=0.0
    - Capability state: [0.9, 0.1, 0.0]
  meta-tile-3: RoleAgent (writing-assist)
    - Signal strengths: task=0.1, role=0.85, core=0.0
    - Capability state: [0.0, 0.9, 0.0]

Colony diversity: 1.58 (high)
```

## Key Concepts Demonstrated

1. **META Tiles**: Pluripotent agents that differentiate based on environmental signals
2. **Attractor Dynamics**: Mathematical model using gene regulatory network principles
3. **Thompson Sampling**: Multi-armed bandit approach for type selection
4. **Dream-Based Optimization**: Using world models to improve policies without acting
5. **PPO Policy Updates**: Stable policy improvement with clipping
6. **Experience Replay**: Prioritized sampling for diverse dream episodes

## Mathematical Foundations

The META tile system uses several advanced mathematical concepts:

### Attractor Dynamics
```
E(x) = -Σ w_ij * x_i * x_j + Σ θ_i * x_i + (λ/2) * Σ x_i²
```
Where E is potential energy, w are interaction weights, θ are biases, and λ is regularization.

### Thompson Sampling
Samples from Beta distributions for each agent type:
```
θ_t ~ Beta(α_t, β_t)
```
Where α counts successes and β counts failures.

### Entropy-Based Exploration
```
H(X) = -Σ p_i * log(p_i)
```
Higher entropy leads to more exploration in agent type selection.

## Extension Ideas

- Add more research task types (experiment design, peer review, grant writing)
- Implement federated learning across multiple research colonies
- Add a Meadow for sharing research patterns between colonies
- Create visualization of META tile differentiation over time
- Implement knowledge succession for transferring research expertise
