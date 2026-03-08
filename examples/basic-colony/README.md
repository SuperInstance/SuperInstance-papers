# Basic Colony Example

A simple demonstration of POLLN's core capabilities:
- Setting up a colony with multiple agents
- Agent-to-agent (A2A) communication
- Plinko stochastic selection for decision making
- Hebbian learning for reinforcement

## What It Does

This example creates a colony with 3 specialized agents:
1. **GreeterAgent** - Handles greetings and welcomes
2. **TaskAgent** - Processes tasks and work items
3. **FarewellAgent** - Handles goodbyes and closings

The colony receives messages and uses Plinko selection to choose which agent should respond, based on each agent's confidence and bid.

## How to Run

```bash
# From the examples directory
cd basic-colony
npm install
npm start
```

## Configuration

You can modify the colony behavior by editing `config.ts`:

- `temperature`: Controls exploration vs exploitation (0.1-2.0)
- `agentBids`: How eager each agent is to respond
- `learningRate`: How fast agents learn from feedback

## Example Output

```
Basic Colony Demo
=================

Created colony with 3 agents
- greeter-agent (GreeterAgent)
- task-agent (TaskAgent)
- farewell-agent (FarewellAgent)

Sending message: "Hello, I need help with a task"
GreeterAgent bids: 0.8 (confidence: 0.6)
TaskAgent bids: 0.9 (confidence: 0.8)
FarewellAgent bids: 0.1 (confidence: 0.2)

Selected: TaskAgent
Response: "I'll help you with that task! What do you need?"

Sending message: "Goodbye!"
GreeterAgent bids: 0.1 (confidence: 0.5)
TaskAgent bids: 0.2 (confidence: 0.7)
FarewellAgent bids: 0.95 (confidence: 0.9)

Selected: FarewellAgent
Response: "Goodbye! Have a great day!"

Colony Stats:
- Total Agents: 3
- Active Agents: 3
- Shannon Diversity: 1.58
```

## Key Concepts Demonstrated

1. **Colony Management**: Creating and managing a collection of agents
2. **A2A Communication**: Traceable messages between agents with causal chains
3. **Plinko Selection**: Stochastic selection maintains diversity and adaptability
4. **Hebbian Learning**: Agents that work well together get stronger connections

## Extension Ideas

- Add more specialized agents (e.g., QuestionAgent, CommandAgent)
- Implement a feedback loop to reinforce good decisions
- Add discriminators for safety checks
- Visualize the agent network and connection strengths
