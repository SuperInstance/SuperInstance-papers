# Code Reviewer Example

A demonstration of POLLN's value network for code analysis:
- Multiple specialized agents for different code review aspects
- TD(λ) value predictions for code quality assessment
- Trajectory tracking for learning from reviews
- Agent coordination through Plinko selection

## What It Does

This example simulates a code review system with specialized agents:

1. **SecurityAgent** - Checks for security vulnerabilities
2. **StyleAgent** - Reviews code style and formatting
3. **PerformanceAgent** - Analyzes performance implications
4. **TestAgent** - Evaluates test coverage and quality
5. **DocumentationAgent** - Checks documentation completeness

The value network learns to predict which reviews will be most valuable, helping prioritize review efforts.

## How to Run

```bash
# From the examples directory
cd code-reviewer
npm install
npm start
```

## Configuration

Edit `config.ts` to customize:

- `reviewAgents`: Types of review agents to deploy
- `valueNetwork`: TD(λ) learning parameters
- `plinko`: Selection temperature and exploration settings

## Example Output

```
Code Reviewer Demo
==================

Initializing code review colony with 5 agents
  SecurityAgent - Checks for security vulnerabilities
  StyleAgent - Reviews code style and formatting
  PerformanceAgent - Analyzes performance implications
  TestAgent - Evaluates test coverage and quality
  DocumentationAgent - Checks documentation completeness

Reviewing code sample 1...
  Code: "function getUser(id) { return users.find(id); }"

  Agent proposals:
    SecurityAgent: confidence=0.85, bid=0.90 (security: input validation)
    StyleAgent: confidence=0.40, bid=0.30 (style: naming)
    PerformanceAgent: confidence=0.60, bid=0.50 (performance: O(n) search)
    TestAgent: confidence=0.70, bid=0.65 (testing: edge cases)
    DocumentationAgent: confidence=0.20, bid=0.10 (docs: missing)

  Selected: SecurityAgent (temperature=1.000)
  Review: "CRITICAL: find() expects a predicate, not an ID. This will always return undefined. Use find(u => u.id === id)."

  Value prediction: 0.85 (high impact)
  Trajectory recorded for learning

Reviewing code sample 2...
  Code: "const data = fetch(url).then(r => r.json())"

  Agent proposals:
    SecurityAgent: confidence=0.70, bid=0.75 (security: no validation)
    StyleAgent: confidence=0.50, bid=0.40 (style: async/await)
    PerformanceAgent: confidence=0.65, bid=0.60 (performance: streaming)
    TestAgent: confidence=0.60, bid=0.55 (testing: network)
    DocumentationAgent: confidence=0.30, bid=0.20 (docs: missing)

  Selected: SecurityAgent (temperature=0.950)
  Review: "WARNING: No input validation or error handling. Add validation for URL and handle network errors."

  Value prediction: 0.72 (medium-high impact)

Training value network...
  Using 5 trajectories
  TD(λ) samples generated: 23
  Training loss: 0.045
  Network confidence increased: 0.52 -> 0.58

Value network statistics:
  Total trajectories: 5
  Training runs: 1
  Average prediction confidence: 0.58
  High-value reviews identified: 2

Agent performance rankings:
  1. SecurityAgent: 2 reviews, avg value=0.79
  2. PerformanceAgent: 1 reviews, avg value=0.60
  3. TestAgent: 1 reviews, avg value=0.65
  4. StyleAgent: 1 reviews, avg value=0.40
  5. DocumentationAgent: 0 reviews, avg value=0.20

Demo complete!
```

## Key Concepts Demonstrated

1. **Value Network Prediction**: TD(λ) learning estimates long-term value of reviews
2. **Trajectory Tracking**: Recording state-action-reward sequences for learning
3. **Specialized Agents**: Different perspectives on code quality
4. **Plinko Selection**: Stochastic selection maintains diversity
5. **Confidence Tracking**: Network becomes more confident with more training

## TD(λ) Learning

The value network uses temporal difference learning with eligibility traces:

```
V(s) = E[Σ γ^t * r_t]
```

Where:
- V(s) = value of state (code review context)
- γ = discount factor (future rewards worth less)
- r_t = reward at time t (review impact)
- λ = eligibility trace decay (credit assignment)

The λ-return combines n-step returns:
```
G^λ_t = (1-λ) * Σ(λ^n * G^{n+1}_t) for n=0 to ∞
```

## Value Prediction Categories

- **0.8-1.0**: Critical - Security vulnerabilities, bugs, crashes
- **0.6-0.8**: High - Performance issues, test gaps
- **0.4-0.6**: Medium - Style inconsistencies, documentation
- **0.2-0.4**: Low - Minor style issues, suggestions
- **0.0-0.2**: Info - Nice-to-have improvements

## Extension Ideas

- Add more specialized agents (accessibility, i18n, SEO)
- Implement federated learning across multiple codebases
- Create a Meadow for sharing review patterns
- Add integration with real code repositories
- Implement reviewer reputation system
- Create visualization of value predictions over time
