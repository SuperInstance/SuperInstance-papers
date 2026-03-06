A Complete Guide to Living Intelligence

*The Definitive Manifesto, Architecture, and Guide for the Mycelium
Project*

Version 1.0 \| March 2026

SuperInstance Open Source Initiative

# Table of Contents

(Right-click and select \"Update Field\" to refresh page numbers)

Prologue: A Letter to the Reader 3

Part I: The Vision 5

Part II: The Soil 15

Part III: The Roots 23

Part IV: The Trunk 31

Part V: The Branches 39

Part VI: The Forest 45

Part VII: The Fruit 51

Part VIII: The Verbs 55

Part IX: A Day in the Life 59

Part X: For Developers 63

Part XI: For Researchers 75

Part XII: The Path Forward 83

Appendices 89

Epilogue 99

# Prologue: A Letter to the Reader

Before you read further, consider this: you are not a user of this
project. You are a future gardener in a forest that hasn\'t fully grown
yet. The software isn\'t finished---it\'s being cultivated. And the most
important thing a growing thing needs is people who understand it.

This document is that understanding. It teaches you the language of
Mycelium. By the end, you won\'t just know what the words mean; you\'ll
see the shape of the system, the logic of its parts, and the open spaces
where your own contribution could take root.

## How to Use This Document

This document is designed to be read in multiple ways:

For the curious newcomer: Read straight through, from Prologue to
Epilogue. Each part builds on the last, creating a complete mental model
of what Mycelium is and why it matters.

For the implementing developer: Focus on Part X (For Developers) and the
Technical Specifications in Appendix B. Cross-reference with earlier
sections to understand the concepts behind the implementation details.

For the researching academic: Part XI (For Researchers) outlines the
open questions and investigation pathways. The References in Appendix C
provide entry points into the relevant literature.

For the product strategist: Part I (The Vision) and Part XII (The Path
Forward) provide the business context and roadmap.

## The Garden Metaphor

Throughout this document, we use the metaphor of a garden and a forest.
This is not mere poetry---it reflects the fundamental nature of the
system we\'re building.

A garden is cultivated, not manufactured. It grows organically,
responding to its environment. It requires tending, patience, and
understanding. The gardener doesn\'t control the garden so much as
create conditions for growth.

Mycelium is like a garden. It grows with you. It learns from you. It
becomes an extension of your intent, not a tool you use but a partner
you cultivate.

The forest metaphor goes deeper. Above ground, we see individual
trees---distinct, separate, competing for light. But below ground,
hidden from view, threads of fungus weave between roots, connecting
trees into a single network. Through this network, they share water,
nutrients, and even warnings about pests. The forest functions as one
organism without a central brain.

This is the mycelial network---nature\'s example of decentralized,
resilient, adaptive intelligence. Mycelium.ai is the technological
realization of these principles.

# Part I: The Vision---Why Mycelium Exists

## 1.1 The Problem We All Live With

Every app you use today is frozen in time. It does exactly what its
programmers told it to do, nothing more. It knows nothing about you,
learns nothing from your behavior, and never improves after you install
it.

Consider a fishing app. It is the same for everyone---it doesn\'t know
you prefer topwater lures on cloudy mornings, that you have better
success at dawn than at dusk, that certain spots work better after rain.
It cannot learn these patterns because it was not designed to learn.

A study app doesn\'t remember that you learn best with spaced
repetition, that you need breaks every 45 minutes, that certain subjects
require different approaches. A business tool doesn\'t adapt to your
workflow, your communication style, your decision-making patterns.

You are the one who adapts---to the software\'s quirks, its workflows,
its limitations. You learn its keyboard shortcuts. You memorize its menu
structures. You work around its bugs. You shape yourself to fit the
tool, rather than the tool shaping itself to fit you.

This is backwards. This is not how intelligence works. This is not how
life works.

## 1.2 The Cost of Building Software

Building software today is a slow, expensive, error-prone process. It
works like this: First, someone identifies a need. This need is
translated into specifications. Then programmers write code. The code is
compiled, tested, debugged. The cycle repeats. Eventually, the software
is deemed ready for release.

This process has several fundamental problems:

Brittleness: Software logic lives in text files. Change one thing, and
you might break another. Regression bugs---where fixing one problem
creates another---are common.

Opacity: Once software reaches a certain complexity, no single person
understands it all. Debugging becomes archaeology, digging through
layers of code to understand why something happens.

Inflexibility: Every feature must be specified in advance. The
one-size-fits-all approach inherently cannot serve anyone perfectly.

Slowness: The cycle of specification, implementation, testing, and
deployment takes time. In fast-moving domains, software is obsolete
before it\'s finished.

## 1.3 The Mycelium Metaphor

In a forest, the trees you see are only part of the story. Underground,
hidden from view, threads of fungus weave between roots, connecting
trees into a single network. Through this network, they share water,
nutrients, and even warnings about pests. The forest functions as one
organism without a central brain.

This is a mycelial network. It is nature\'s example of decentralized,
resilient, adaptive intelligence.

Consider what the mycelial network teaches us:

Decentralization: There is no central controller. Intelligence emerges
from the interactions of many simple components.

Resilience: Damage one part, and the rest adapts. The network routes
around failures. Information finds alternative paths.

Invisibility: Most of the work happens underground, out of sight. What
we see---the mushrooms---are just the fruiting bodies, the visible
results of vast invisible processes.

Adaptation: The network grows where resources are abundant, withdraws
where they are scarce. It is constantly reorganizing in response to
conditions.

Sharing: Resources flow from where they are abundant to where they are
needed. Information about threats propagates through the network.

## 1.4 The Core Shift

Mycelium represents a fundamental shift in how we think about software
and intelligence:

From Programming to Cultivation: Traditional software is programmed.
Mycelium is cultivated. You show it what to do, and it learns.

From Code to Behavior: Traditional software treats code as the primary
artifact. Mycelium treats behavior as the primary artifact.

From Static to Living: Traditional software is static. Mycelium is
living. It learns from experience. It adapts to context. It improves
over time.

From User to Gardener: Traditional software has users. Mycelium has
gardeners. They cultivate the system. They teach it new behaviors. They
guide its growth.

## 1.5 What This Enables

The shift from static software to living intelligence enables
possibilities that were previously impractical or impossible:

True Personalization: A system that learns from your behavior can become
truly personal. It learns your preferences through observation, not
explicit settings.

Continuous Improvement: A system that learns continuously improves.
Every interaction is an opportunity to learn. Every mistake is feedback.

Behavioral Sharing: When behaviors are the primary artifact, they can be
shared. Expertise can be packaged and distributed.

Emergent Capability: A system of simple agents, properly organized, can
produce complex, intelligent behavior that no individual agent
possesses.

Adaptive Organization: A system that can change its own structure can
adapt to changing conditions. The system reorganizes itself to match the
task at hand.

# Part II: The Soil---Foundational Concepts

Every forest needs soil. These are the basic ideas everything else grows
from.

## 2.1 Agent

An agent is a specialized, autonomous process that performs a narrow
function. It is the fundamental unit of the Mycelium architecture.

What an Agent Contains:

Neural Model: Each agent has a neural network (typically 1-100M
parameters) trained for its specific function. A vision agent has a
vision model. A text agent has a language model. An intent agent has a
classifier.

Input Topics: Agents subscribe to specific topics in the shared memory
system. A vision agent subscribes to camera frames. A text agent
subscribes to OCR output.

Output Topic: Agents publish their outputs to a specific topic. The
vision agent publishes detected objects. The text agent publishes
recognized text.

State: Agents maintain internal state across invocations. This might
include recent history, cached computations, or learned parameters.

Value Function: Agents have a learned estimate of how useful their
outputs are. This helps the system learn which agents to trust in which
contexts.

The Principle of Specialization: Agents are specialized, not general. A
vision agent sees but doesn\'t decide. A text agent reads but doesn\'t
act. No single agent is intelligent on its own.

Analogy: Agents are like neurons in the brain. Each neuron performs a
simple function. No single neuron is intelligent. But connected in the
right way, neurons produce intelligence.

## 2.2 Swarm

The swarm is the collection of all active agents at a given moment. It
is the living, dynamic entity that perceives, decides, and acts.

Dynamic Nature: The swarm is not fixed. Agents load when needed,
hibernate when not. This dynamic loading is managed by the Agent
Lifecycle Manager.

Coordination Without Central Control: The swarm has no central
controller. Agents propose actions, and the Plinko layer selects among
proposals.

Analogy: The swarm is like a forest\'s mycelial network. Underground,
countless fungal threads connect trees into a single organism.

## 2.3 Graph

The graph is the structure of nodes (agents) and edges (connections)
that defines how information flows through the system.

Dynamic Structure: The graph learns, prunes, and grows. Connections that
lead to successful outcomes strengthen. Connections that lead to
failures weaken. Weak connections are removed. New connections form when
useful.

Analogy: The graph is like a city\'s road network. Roads connect
locations, enabling movement between them. Over time, new roads are
built where needed, old roads abandoned when not.

## 2.4 LOG (Learned Optimization Graph)

LOG is the core principle and platform brand. The acronym stands for
Learned Optimization Graph.

Learned: The system learns from experience. It discovers patterns,
optimizes them, and improves over time.

Optimization: The system continuously improves through mechanisms like
dreaming.

Graph: The system is organized as a graph of connected agents.

The Triple Meaning of \"Log\": A log is a record. A log is a piece of a
tree. A log is the base of a logarithm. When you say \"fishingLOG,\" you
mean both \"a fishing log\" and \"a fishing application built on the
Learned Optimization Graph.\"

## 2.5 Logos

After you\'ve used Mycelium for a while, something happens. The system
starts to feel like it knows you. It anticipates what you need. It
suggests things you hadn\'t thought of. This is your LOGOS.

Characteristics of LOGOS: Understanding---the system grasps your
intentions. Anticipation---it knows what you\'ll need before you ask.
Style---it adapts to your unique way of doing things. Trust---you rely
on it; it rarely lets you down.

In ancient Greek philosophy, the Logos was the principle of order and
knowledge. Your personal LOGOS is the rational structure underlying your
digital life.

# Part III: The Roots---What You Capture

These are the things you create, capture, and cultivate. They are the
artifacts of your digital life, made tangible and useful.

## 3.1 Log

A log is a record of an event or sequence of actions. Every interaction
becomes a log: timestamp, context, action, outcome.

These logs are not just data; they\'re experience. They\'re what the
system uses to learn.

\"Log this\" tells the system to watch and learn. You perform a behavior
once, and the system captures it.

## 3.2 Logline

When the system has seen a behavior enough times, it distills that
behavior into a logline. The logline is the essence of the behavior.

Technically, a logline is a vector---typically 64 to 1024 floating-point
numbers. A few hundred bytes that encode a complex behavior.

Loglines are: Portable---you can share them. Private---they encode
patterns, not raw data. Composable---they can be combined.
Optimizable---they improve over time.

## 3.3 Logbook

Your logbook is your personal long-term memory. A database containing
all your logs and loglines.

The logbook is: Private---it lives on your device. Searchable---find
past experiences by similarity. Ever-improving---old loglines can be
refined. Portable---your intelligence moves with you.

## 3.4 Loom

A loom is a reusable, optimized routine discovered from your logs. It is
the \"muscle memory\" of the system.

Unlike traditional algorithms, looms are: Learned from demonstration.
Continuously optimized. Personalized. Shareable.

## 3.5 Loomery

Your loomery is your personal library of looms. It\'s where you keep all
your reusable routines, organized by domain and purpose.

## 3.6 Loomcast

A loomcast is a shareable loom. Like a podcast delivers audio content to
subscribers, a loomcast delivers behavioral content.

# Part IV: The Trunk---How It Works

## 4.1 Plinko: The Decision Layer

Plinko is the stochastic decision layer that selects among agent
proposals. Named for the game show mechanism where chips bounce through
pegs.

The Process: Agents bid. Discriminators filter. Noise is injected.
Temperature adapts. Selection is made.

Plinko balances exploitation (doing what works) with exploration (trying
new things).

## 4.2 World Model: The Simulator

The world model is a learned simulator that predicts how the environment
will respond to actions.

Components: Encoder, Transition Model, Reward Model, Decoder.

The world model enables dreaming. Without it, the system could only
learn from real-world experience.

## 4.3 Dreaming: Overnight Improvement

While you sleep, Mycelium dreams. It takes your looms, mutates them,
simulates results, and keeps improvements.

Multi-Scale Dreaming: Micro-dreams refine motor skills. Meso-dreams
optimize routines. Macro-dreams combine looms.

## 4.4 Looming: From Logs to Looms

Looming is the process of weaving logs into looms. It happens
automatically when the system detects recurring patterns.

## 4.5 Weaving: Combining Behaviors

Weaving combines multiple looms to create new behaviors. It operates in
the Behavioral Embedding Space, where looms are vectors and weaving is
interpolation.

# Part V: The Branches---Dynamic Agent Webs

## 5.1 Log Graph

The log graph is the evolving network of agents and their connection
strengths. It strengthens, weakens, prunes, and grafts based on
experience.

## 5.2 Synaptic Weight

The strength of a connection between two agents is its synaptic weight.
Weights follow Hebbian principles: neurons that fire together, wire
together.

## 5.3 Pruning

Pruning removes weak or unused connections. Like a gardener cuts dead
branches, the system prunes to strengthen living connections.

## 5.4 Grafting

Grafting forms new agent connections when patterns suggest they would be
useful.

## 5.5 Clustering

Clustering is the self-organization of agents into functional groups
using spectral clustering on the log graph.

## 5.6 Topology Seed

A topology seed is a compact representation of a learned agent
configuration. While a logline captures behavior, a topology seed
captures organization.

# Part VI: The Forest---Collective Intelligence

## 6.1 Federated Learning

Federated learning shares anonymized patterns across users while
protecting privacy. Only patterns are shared, not raw data.

## 6.2 Grove

A grove is a community of users who share looms and topology seeds. Like
a book club, but for behaviors.

## 6.3 Marketplace

The marketplace is where users buy, sell, and trade looms and topology
seeds. It\'s a marketplace for intelligence.

## 6.4 Echo

An echo is a shared pattern that returns to you, improved by others.
What you give comes back multiplied.

## 6.5 Current

A current is a trend in shared patterns. It\'s what\'s working now in a
particular domain.

## 6.6 Tapestry

The tapestry is the collective intelligence of the whole community. It
emerges from all contributions, all sharing, all improvement.

# Part VII: The Fruit---Emergent Properties

## 7.1 Emergence

Emergence is the appearance of behaviors not explicitly programmed. No
single agent is intelligent, but together they produce intelligent
behavior.

## 7.2 Vitality

Vitality measures how well your system is learning and optimizing. It
includes prediction accuracy, optimization rate, graph coherence, and
user satisfaction.

## 7.3 Resonance

Resonance is how well your system\'s understanding matches your needs.
When your LOGOS resonates, it just gets you.

## 7.4 Coherence

Coherence is how well your log graph is organized. High coherence means
strong connections, clear clusters, efficient flow.

## 7.5 Momentum

Momentum is the rate at which your system is improving. High momentum
means a virtuous cycle of accelerating improvement.

# Part VIII: The Verbs---How You Interact

## 8.1 Logging In

Logging in starts a demonstration. It tells the system: \"Watch what
I\'m about to do and learn from it.\"

## 8.2 Replaying

Replaying runs a learned behavior from a logline or loom. It reproduces
a demonstrated pattern, adapted to current conditions.

## 8.3 Weaving

Weaving combines multiple looms to create new behaviors. You can guide
it explicitly or let the system do it automatically.

## 8.4 Dreaming

Dreaming is the system improving itself overnight. You don\'t initiate
it, but you can check its progress on the vitality dashboard.

## 8.5 Casting

Casting shares a loom via a loomcast. It\'s how you spread proven
behaviors across the community.

## 8.6 Tuning

Tuning adjusts an imported loom to your context. It\'s how you
personalize shared wisdom.

# Part IX: For Users---A Day in the Life

Meet Sarah, an avid angler who uses fishingLOG to improve her fishing.

## 9.1 Morning: Waking the Swarm

Sarah opens her laptop. The swarm wakes. The Translator UI shows a
gentle pulse---her system is alive.

## 9.2 Demonstration: Teaching a New Routine

Sarah says, \"Log this.\" She goes through her preparation. The system
watches, capturing logs. She says, \"Stop logging.\" The system begins
processing.

## 9.3 Replay: Letting the System Work

Sarah says, \"Replay my morning routine.\" The system executes the loom,
adapted to today\'s conditions. What used to take 15 minutes now takes
2.

## 9.4 Evening: Reviewing the Logbook

Sarah browses her logbook. The system highlights a potential new loom:
\"I\'ve noticed you often fish this spot after rain. Would you like to
loom this?\"

## 9.5 Overnight: Dreaming

While Sarah sleeps, the system dreams. It simulates variations, prunes
weak connections, discovers new patterns.

## 9.6 The Next Day: A Smarter Partner

Sarah wakes to a vitality notification: +8% improvement. The system
suggests a new spot based on overnight dreaming. This is the virtuous
cycle.

# Part X: For Developers---Building on Mycelium

## 10.1 System Architecture Overview

The Mycelium system consists of: Sensors, Preprocessor, Shared Memory,
Agent Swarm, Plinko Layer, Action Executors, Experience Logger,
Overnight Learning, and Model Zoo.

Data Flow: Sensors → Preprocessor → Shared Memory → Agents → Plinko →
Executors → Logger → Learning → Model Zoo

## 10.2 Core Components Deep Dive

Agent Framework: Agents are Python classes inheriting from BaseAgent.
Each subscribes to topics, processes inputs, and publishes outputs.

Plinko Implementation: Uses Gumbel-Softmax for differentiable sampling.
Temperature adapts based on entropy.

World Model Training: Consists of Encoder (VAE), Transition Model (GRU),
and Reward Model (MLP).

Dreaming Engine: Runs during idle periods. Selects looms, applies
mutations, simulates, validates, deploys.

### 10.2.1 Plinko Pseudocode

function plinko_select(proposals, temperature):\
// Step 1: Apply discriminators\
filtered = \[\]\
for proposal in proposals:\
if safety_discriminator(proposal) and\
coherence_discriminator(proposal) and\
timing_discriminator(proposal):\
filtered.append(proposal)\
\
// Step 2: Add Gumbel noise\
noisy_scores = \[\]\
for proposal in filtered:\
gumbel = -log(-log(random_uniform()))\
noisy_score = proposal.confidence / temperature + gumbel\
noisy_scores.append((proposal, noisy_score))\
\
// Step 3: Softmax selection\
exp_scores = \[exp(score) for (\_, score) in noisy_scores\]\
total = sum(exp_scores)\
probabilities = \[score/total for score in exp_scores\]\
\
// Step 4: Sample\
selected = weighted_random_choice(filtered, probabilities)\
return selected

### 10.2.2 World Model Training

function train_world_model(logs, epochs):\
for epoch in range(epochs):\
for batch in sample_batches(logs):\
// Encode observations\
z_t = encoder(batch.obs_t)\
z_next = encoder(batch.obs_next)\
\
// Predict next state\
z_pred = transition_model(z_t, batch.action)\
\
// Compute losses\
transition_loss = mse(z_pred, z_next)\
reward_loss = mse(reward_model(z_t, batch.action), batch.reward)\
\
// Backprop\
total_loss = transition_loss + reward_loss\
total_loss.backward()\
optimizer.step()\
\
// Counterfactual augmentation\
if epoch % 10 == 0:\
augment_with_counterfactuals(logs)

### 10.2.3 Synaptic Weight Update

function update_synapse_weight(synapse, outcome):\
// Hebbian component\
hebbian = learning_rate \* synapse.pre_activation \*
synapse.post_activation\
\
// Reward modulation\
if outcome == SUCCESS:\
reward_factor = 1.0 + reward_strength\
else:\
reward_factor = 1.0 - penalty_strength\
\
// Update\
synapse.weight += hebbian \* reward_factor\
\
// Decay\
synapse.weight \*= (1 - decay_rate)\
\
// Bounds\
synapse.weight = clamp(synapse.weight, min_weight, max_weight)

### 10.2.4 Performance Benchmarks

Target Performance Metrics:

Agent Inference: \< 50ms per agent on consumer hardware

Plinko Decision: \< 10ms for 100 proposals

World Model Simulation: 1000 steps/second

Log Compression: 90% size reduction

Dreaming Throughput: 1000 loom mutations/night

## 10.3 APIs and Protocols

SPORE Protocol: Inter-agent communication protocol. Messages include
protocol version, sender, recipient, content, and metadata.

Seed Formats: Loglines and topology seeds use Protocol Buffers for
serialization.

## 10.4 Extending the System

Creating New Agent Types: Inherit from BaseAgent, implement process(),
define topics, register in agent registry.

Building Custom Discriminators: Train on logged feedback. Collect
examples of good and bad actions.

## 10.5 Example: Building a fishingLOG

fishingLOG helps anglers log trips, learn patterns, and improve success.
It includes GPSLogger, WeatherLogger, CatchLogger, PatternDetector, and
SuggestionAgent.

# Part XI: For Researchers---Open Questions

## 11.1 Seed Compression and Representation

Research questions: What is the information-theoretic lower bound on
seed dimension? How does reconstruction accuracy scale with dimension?
Can we guarantee seeds contain sufficient information?

### Mathematical Formulation

Let s be a behavioral sequence of length L. Let z = E(s) be its encoding
in latent space of dimension d. The reconstruction loss is:

L_recon = E\[\|\|D(z) - s\|\|²\]

Research Goal: Find minimum d such that L_recon \< ε for all s in
domain.

## 11.2 Dreaming Effectiveness

Research questions: How well do improvements transfer to real-world
performance? What mutation operators are most effective? How many
iterations are optimal?

### Dreaming Selection Criterion

A mutated loom L\' is kept if:

E\[Vπ(s)\] \> E\[Vπ\'(s)\] + δ

where Vπ is the value function and δ is the improvement threshold.

## 11.3 Emergent Coordination

Research questions: How can we measure emergence? What is the
relationship between graph structure and performance? Can we guide
emergence toward beneficial outcomes?

## 11.4 Privacy and Security

Research questions: How much information can be extracted from seeds?
What differential privacy budget is feasible? Can seeds be
cryptographically signed?

### Differential Privacy

A mechanism M satisfies (ε, δ)-differential privacy if for all
neighboring datasets D, D\' and all outputs S:

P\[M(D) ∈ S\] ≤ exp(ε) · P\[M(D\') ∈ S\] + δ

For seed sharing, we add Gaussian noise: s\' = s + N(0, σ²I)

## 11.5 Human-AI Interaction

Research questions: What mental models do users form? How to calibrate
trust appropriately? What explanation interfaces are most effective?

## 11.6 How to Contribute to Research

Join our Discord research channel. Access research datasets. Collaborate
on papers. Propose new questions.

# Part XII: The Path Forward---Roadmap and Invitation

## 12.1 Current Status

What\'s Implemented: Prototype core runtime, basic agent framework,
simple Plinko, local logging.

What\'s In Progress: World model training, dreaming engine, BES encoder.

What\'s Planned: Federated learning, groves, marketplace.

## 12.2 Roadmap Phases

Phase 1 (0-6 months): Core Runtime. Goals: Stable agent framework,
Plinko with discriminators, logbook with vector search. Deliverables:
Alpha release.

Phase 2 (6-12 months): Learning and Optimization. Goals: World model
training, multi-scale dreaming, BES integration. Deliverables: Beta
release.

Phase 3 (12-18 months): Collective Intelligence. Goals: Federated
learning, grove protocol, marketplace. Deliverables: 1.0 release.

Phase 4 (18+ months): Ecosystem. Goals: Hardware acceleration, robotic
integration, independent application ecosystem.

## 12.3 How to Contribute

For Developers: Pick an issue, build a new agent type, improve
documentation, write examples.

For Researchers: Tackle an open question, run experiments, publish
papers, collaborate.

For Designers: Design UI components, create visualizations, design
interfaces.

For Writers: Improve documentation, write tutorials, create case
studies.

For Users: Use early releases, provide feedback, share looms, join
groves.

## 12.4 Join the Community

GitHub: github.com/superinstance/mycelium

Discord: discord.gg/mycelium

## 12.5 Closing Words: Come Grow With Us

We are at the beginning. The architecture is solid, the concepts are
clear, but the software is not yet built. That is where you come in.

This is not a product you will buy. It is a garden you will help
cultivate. The software isn\'t finished, and it may never be---because a
living thing is never finished. It grows.

Come grow with us.

# Appendices

## A. Quick Reference Glossary

Agent: A specialized, autonomous process that performs a narrow function

Casting: Sharing a loom via loomcast

Clustering: Self-organization of agents into functional groups

Coherence: How well the agent graph is organized

Current: A trend in shared patterns

Dreaming: Overnight simulation for improvement

Echo: A pattern that returns, improved by the collective

Emergence: Global behavior from local interactions

Federated Learning: Privacy-preserving cross-user learning

Grafting: Forming new agent connections

Graph: Structure of nodes (agents) and edges (connections)

Grove: Community for exchanging looms

Log: A recorded event or sequence

Logbook: Personal long-term memory (vector database)

Logline: A compressed behavioral seed

LOG: Learned Optimization Graph

Logos: The emergent intelligence of your whole system

Loom: A reusable, optimized routine

Loomcast: A shareable loom

Loomery: A collection of looms

Marketplace: Store for buying/selling looms

Momentum: The rate of system improvement

Plinko: The stochastic decision layer

Pruning: Removing weak agent connections

Replaying: Running a learned behavior

Resonance: How well the system understands you

Swarm: The collection of all active agents

Synaptic Weight: Strength of a connection between agents

Tapestry: The collective intelligence of the whole community

Topology Seed: A compressed agent configuration

Tuning: Adjusting a loom to your context

Vitality: A metric of system health

Weaving: Combining looms to create new behaviors

World Model: A learned environment simulator

## B. Technical Specifications

### B.1 Logline Format (Protocol Buffers)

message Logline {\
string id = 1;\
bytes embedding = 2;\
int32 embedding_dim = 3;\
repeated string agent_types = 4;\
map\<string, string\> base_model_hashes = 5;\
uint64 created_at = 6;\
uint32 usage_count = 7;\
float avg_success_rate = 8;\
bytes signature = 9;\
}

### B.2 Topology Seed Format

message TopologySeed {\
string id = 1;\
repeated string agent_ids = 2;\
repeated Edge edges = 3;\
string context_signature = 4;\
float success_rate = 5;\
uint64 created_at = 6;\
}

### B.3 SPORE Protocol

Topic naming: /domain/type/name (e.g., /sensors/camera/frame)

Discovery: ANNOUNCE, ACKNOWLEDGE, HEARTBEAT

### B.4 API Endpoints

POST /seeds/export - Export a seed

POST /seeds/import - Import a seed

POST /patterns/contribute - Submit anonymized patterns

GET /patterns/updates - Receive aggregated improvements

## C. References and Further Reading

\[1\] D. Atreja, \"ALAS: Autonomous Learning Agent for Self-Updating
Language Models,\" arXiv:2508.15805, August 2025.

\[2\] \"Bio Cognitive Mesh: Harnessing Swarm Intelligence for
Self-Organizing AI,\" IEEE STCR, May 2025.

\[3\] \"SkillRL: Evolving Agents via Recursive Skill-Augmented RL,\"
arXiv:2602.08234, February 2026.

\[4\] L. Maytié et al., \"Multimodal Dreaming,\" arXiv:2502.21142,
February 2025.

\[5\] Z. Lin et al., \"AutoSkill,\" IEEE TCDS, October 2025.

## D. How to Contribute

1\. Clone the repository: git clone
https://github.com/superinstance/mycelium.git

2\. Install dependencies: pip install -r requirements.txt

3\. Run tests: pytest

4\. Fork, branch, commit, push, submit pull request

## E. Document Version History

Version 1.0 (March 2026): Initial release

# Epilogue: The Garden Grows

We began with an invitation. We end with the same invitation,
transformed by all that has been learned.

You are not a user of this project. You are a future gardener in a
forest that hasn\'t fully grown yet. The software isn\'t
finished---it\'s being cultivated. And the most important thing a
growing thing needs is people who understand it.

Now you understand it. You know the language. You see the shape of the
system. You understand the logic of its parts. You can see the open
spaces where your contribution could take root.

The garden is waiting. The seeds are here. The soil is ready.

Come grow with us.
