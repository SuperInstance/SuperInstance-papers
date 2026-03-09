"""
POLLN Emergent Behavior Simulation Engine

Simulates agent colonies to discover emergent behaviors, phase transitions,
and scaling laws in POLLN (Pattern-Organized Large Language Network).

Author: POLLN Research Team
Date: 2026-03-08
"""

import numpy as np
import networkx as nx
from dataclasses import dataclass, field
from typing import List, Dict, Set, Tuple, Optional
from enum import Enum
from collections import deque
import random
import json


# ============================================================================
# TYPES AND ENUMS
# ============================================================================

class AgentType(Enum):
    """Agent categories with different lifecycles"""
    TASK = "TASK"       # Ephemeral: minutes to hours
    ROLE = "ROLE"       # Medium: days to weeks
    CORE = "CORE"       # Long-lived: months to years


class SubsumptionLayer(Enum):
    """Processing priority layers"""
    SAFETY = "SAFETY"
    REFLEX = "REFLEX"
    HABITUAL = "HABITUAL"
    DELIBERATE = "DELIBERATE"


# ============================================================================
# CORE AGENT SIMULATION
# ============================================================================

@dataclass
class SimulationAgent:
    """Individual agent in the simulation"""

    id: str
    agent_type: AgentType
    capabilities: np.ndarray  # Capability vector

    # State variables
    value_function: float = 0.5
    age: int = 0
    active: bool = True

    # Performance tracking
    recent_successes: deque = field(default_factory=lambda: deque(maxlen=100))
    recent_failures: deque = field(default_factory=lambda: deque(maxlen=100))
    execution_count: int = 0

    # Network state
    connections: Dict[str, float] = field(default_factory=dict)  # agent_id -> weight

    # Phase state (for synchronization)
    phase: float = 0.0
    natural_frequency: float = 0.0

    def __post_init__(self):
        """Initialize natural frequency for sync dynamics"""
        self.natural_frequency = np.random.normal(1.0, 0.1)

    def should_terminate(self) -> bool:
        """Agent-specific termination logic"""
        if not self.active:
            return True

        if self.agent_type == AgentType.TASK:
            # Ephemeral: die after task or age limit
            return self.age > 100 or len(self.recent_successes) > 10

        elif self.agent_type == AgentType.ROLE:
            # Medium lifespan: terminate if performance degrades
            if len(self.recent_successes) + len(self.recent_failures) < 20:
                return False
            success_rate = len(self.recent_successes) / (
                len(self.recent_successes) + len(self.recent_failures)
            )
            return success_rate < 0.3

        else:  # CORE
            # Long-lived: only catastrophic failure
            total_executions = len(self.recent_successes) + len(self.recent_failures)
            if total_executions < 50:
                return False
            failure_rate = len(self.recent_failures) / total_executions
            return failure_rate > 0.8

    def update_value_function(self, reward: float):
        """Hebbian learning: ΔV = η * (reward - 0.5)"""
        learning_rate = 0.1
        self.value_function = np.clip(
            self.value_function + learning_rate * (reward - 0.5),
            0.0, 1.0
        )

        # Track performance
        if reward > 0:
            self.recent_successes.append(reward)
        else:
            self.recent_failures.append(abs(reward))

    def get_success_rate(self) -> float:
        """Calculate recent success rate"""
        total = len(self.recent_successes) + len(self.recent_failures)
        if total == 0:
            return 0.5
        return len(self.recent_successes) / total

    def get_confidence(self) -> float:
        """Calculate confidence from value function and recent performance"""
        success_rate = self.get_success_rate()
        return 0.7 * self.value_function + 0.3 * success_rate


# ============================================================================
# COLONY SIMULATION
# ============================================================================

@dataclass
class ColonyMetrics:
    """Comprehensive colony metrics"""

    # Basic stats
    num_agents: int
    active_agents: int
    avg_value_function: float

    # Network metrics
    avg_degree: float
    clustering_coefficient: float
    avg_path_length: float
    modularity: float

    # Diversity metrics
    shannon_diversity: float
    type_distribution: Dict[str, int]

    # Performance metrics
    collective_reward: float
    avg_latency: float
    success_rate: float

    # Emergence metrics
    information_flow: float
    synchronization: float
    criticality: float

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'num_agents': self.num_agents,
            'active_agents': self.active_agents,
            'avg_value_function': self.avg_value_function,
            'avg_degree': self.avg_degree,
            'clustering_coefficient': self.clustering_coefficient,
            'avg_path_length': self.avg_path_length,
            'modularity': self.modularity,
            'shannon_diversity': self.shannon_diversity,
            'type_distribution': self.type_distribution,
            'collective_reward': self.collective_reward,
            'avg_latency': self.avg_latency,
            'success_rate': self.success_rate,
            'information_flow': self.information_flow,
            'synchronization': self.synchronization,
            'criticality': self.criticality,
        }


class ColonySimulation:
    """
    Main simulation engine for POLLN agent colonies

    Simulates agent interactions, learning, network evolution, and emergent behavior.
    """

    def __init__(
        self,
        num_agents: int,
        topology: str = 'small-world',
        agent_distribution: Optional[Dict[AgentType, float]] = None
    ):
        self.num_agents = num_agents
        self.agents: List[SimulationAgent] = []
        self.graph = nx.Graph()
        self.time_step = 0
        self.history: List[ColonyMetrics] = []

        # Agent distribution (default: balanced)
        if agent_distribution is None:
            agent_distribution = {
                AgentType.TASK: 0.5,
                AgentType.ROLE: 0.3,
                AgentType.CORE: 0.2,
            }

        # Initialize agents
        self._init_agents(agent_distribution)

        # Initialize network topology
        self._init_topology(topology)

    def _init_agents(self, distribution: Dict[AgentType, float]):
        """Initialize agents with given distribution"""
        for i in range(self.num_agents):
            # Determine agent type
            rand = np.random.random()
            cumulative = 0.0
            agent_type = AgentType.TASK

            for atype, prob in distribution.items():
                cumulative += prob
                if rand < cumulative:
                    agent_type = atype
                    break

            # Create agent
            agent = SimulationAgent(
                id=f"agent_{i}",
                agent_type=agent_type,
                capabilities=np.random.rand(10)  # 10-dimensional capability space
            )

            self.agents.append(agent)
            self.graph.add_node(agent.id, agent=agent)

    def _init_topology(self, topology: str):
        """Initialize network topology"""
        n = len(self.agents)

        if topology == 'small-world':
            # Watts-Strogatz small-world network
            k = min(6, n - 1)
            p = 0.3
            ws_graph = nx.watts_strogatz_graph(n, k, p)

            for edge in ws_graph.edges():
                agent1 = self.agents[edge[0]]
                agent2 = self.agents[edge[1]]
                weight = np.random.uniform(0.3, 0.7)
                self.graph.add_edge(agent1.id, agent2.id, weight=weight)
                agent1.connections[agent2.id] = weight
                agent2.connections[agent1.id] = weight

        elif topology == 'scale-free':
            # Barabasi-Albert scale-free network
            m = min(3, n // 2)
            ba_graph = nx.barabasi_albert_graph(n, m)

            for edge in ba_graph.edges():
                agent1 = self.agents[edge[0]]
                agent2 = self.agents[edge[1]]
                weight = np.random.uniform(0.3, 0.7)
                self.graph.add_edge(agent1.id, agent2.id, weight=weight)
                agent1.connections[agent2.id] = weight
                agent2.connections[agent1.id] = weight

        elif topology == 'random':
            # Erdos-Renyi random graph
            p = 0.1
            er_graph = nx.erdos_renyi_graph(n, p)

            for edge in er_graph.edges():
                agent1 = self.agents[edge[0]]
                agent2 = self.agents[edge[1]]
                weight = np.random.uniform(0.3, 0.7)
                self.graph.add_edge(agent1.id, agent2.id, weight=weight)
                agent1.connections[agent2.id] = weight
                agent2.connections[agent1.id] = weight

    def step(
        self,
        task_difficulty: float = 0.5,
        coupling_strength: float = 0.5,
        enable_evolution: bool = True
    ) -> ColonyMetrics:
        """
        Execute one simulation timestep

        Args:
            task_difficulty: 0-1 scale, harder tasks reduce success probability
            coupling_strength: Phase coupling for synchronization
            enable_evolution: Enable network evolution (pruning/grafting)
        """
        self.time_step += 1

        # Update agent ages
        for agent in self.agents:
            if agent.active:
                agent.age += 1

        # Task execution phase
        total_reward = 0.0
        total_latency = 0.0
        successful_tasks = 0

        for agent in self.agents:
            if not agent.active:
                continue

            # Execute task
            success_probability = agent.get_confidence() * (1 - task_difficulty)
            success = np.random.random() < success_probability

            # Calculate reward
            if success:
                reward = 1.0
                successful_tasks += 1
            else:
                reward = -0.5

            # Update agent
            agent.update_value_function(reward)
            agent.execution_count += 1

            # Track metrics
            total_reward += reward
            total_latency += np.random.exponential(10)  # Simulated latency

        # Synchronization phase (Kuramoto model)
        self._update_synchronization(coupling_strength)

        # Network evolution phase
        if enable_evolution and self.time_step % 10 == 0:
            self._evolve_network()

        # Remove terminated agents
        self._remove_terminated_agents()

        # Calculate metrics
        metrics = self._calculate_metrics(
            total_reward,
            total_latency,
            successful_tasks
        )

        self.history.append(metrics)
        return metrics

    def _update_synchronization(self, coupling_strength: float):
        """Update agent phases using Kuramoto model"""
        # Build adjacency list
        neighbors = {agent.id: [] for agent in self.agents}
        for edge in self.graph.edges():
            neighbors[edge[0]].append(edge[1])
            neighbors[edge[1]].append(edge[0])

        # Update phases
        for agent in self.agents:
            if not agent.active:
                continue

            # Calculate coupling
            coupling = 0.0
            for neighbor_id in neighbors[agent.id]:
                neighbor = next(a for a in self.agents if a.id == neighbor_id)
                if neighbor.active:
                    coupling += np.sin(neighbor.phase - agent.phase)

            # Kuramoto update
            dphase = agent.natural_frequency + (coupling_strength / len(self.agents)) * coupling
            agent.phase += dphase * 0.1  # dt = 0.1
            agent.phase = agent.phase % (2 * np.pi)

    def _evolve_network(self):
        """Evolve network topology (pruning and grafting)"""
        # Pruning: remove weak connections
        edges_to_remove = []
        for edge in self.graph.edges(data=True):
            if edge[2]['weight'] < 0.1:
                edges_to_remove.append((edge[0], edge[1]))

        for edge in edges_to_remove:
            if self.graph.has_edge(edge[0], edge[1]):
                self.graph.remove_edge(edge[0], edge[1])
                agent1 = next(a for a in self.agents if a.id == edge[0])
                agent2 = next(a for a in self.agents if a.id == edge[1])
                agent1.connections.pop(edge[1], None)
                agent2.connections.pop(edge[0], None)

        # Grafting: add new connections
        if len(self.graph.edges()) < self.num_agents * 2:  # Target density
            # Pick random agents
            agent1 = np.random.choice(self.agents)
            potential_neighbors = [
                a for a in self.agents
                if a.id != agent1.id and a.id not in agent1.connections
            ]

            if potential_neighbors:
                agent2 = np.random.choice(potential_neighbors)

                # Preferential attachment: connect to high-degree nodes
                degree1 = self.graph.degree(agent1.id)
                degree2 = self.graph.degree(agent2.id)
                probability = (degree1 + 1) * (degree2 + 1) / (self.num_agents ** 2)

                if np.random.random() < probability * 2:  # Boost for better connectivity
                    weight = np.random.uniform(0.3, 0.7)
                    self.graph.add_edge(agent1.id, agent2.id, weight=weight)
                    agent1.connections[agent2.id] = weight
                    agent2.connections[agent1.id] = weight

    def _remove_terminated_agents(self):
        """Remove agents that should terminate"""
        for agent in self.agents:
            if agent.active and agent.should_terminate():
                agent.active = False
                # Remove from network
                self.graph.remove_node(agent.id)

    def _calculate_metrics(
        self,
        total_reward: float,
        total_latency: float,
        successful_tasks: int
    ) -> ColonyMetrics:
        """Calculate comprehensive colony metrics"""
        active_agents = [a for a in self.agents if a.active]
        n = len(active_agents)

        if n == 0:
            # All agents terminated
            return ColonyMetrics(
                num_agents=len(self.agents),
                active_agents=0,
                avg_value_function=0.0,
                avg_degree=0.0,
                clustering_coefficient=0.0,
                avg_path_length=0.0,
                modularity=0.0,
                shannon_diversity=0.0,
                type_distribution={},
                collective_reward=total_reward,
                avg_latency=0.0,
                success_rate=0.0,
                information_flow=0.0,
                synchronization=0.0,
                criticality=0.0,
            )

        # Basic stats
        avg_value_function = np.mean([a.value_function for a in active_agents])

        # Network metrics
        degrees = [self.graph.degree(a.id) for a in active_agents]
        avg_degree = np.mean(degrees) if degrees else 0.0

        clustering = nx.average_clustering(self.graph)
        clustering_coefficient = clustering

        # Average path length (only if connected)
        if nx.is_connected(self.graph):
            avg_path_length = nx.average_shortest_path_length(self.graph)
        else:
            avg_path_length = float('inf')

        # Modularity (use agent types as communities)
        type_to_id = {AgentType.TASK: 0, AgentType.ROLE: 1, AgentType.CORE: 2}
        partition = {a.id: type_to_id[a.agent_type] for a in active_agents}
        modularity = nx.community.modularity(self.graph, [list(p) for p in [
            [a.id for a in active_agents if a.agent_type == AgentType.TASK],
            [a.id for a in active_agents if a.agent_type == AgentType.ROLE],
            [a.id for a in active_agents if a.agent_type == AgentType.CORE],
        ]])

        # Diversity
        type_counts = {}
        for agent in active_agents:
            type_counts[agent.agent_type.value] = type_counts.get(agent.agent_type.value, 0) + 1

        shannon_diversity = self._calculate_shannon_diversity(list(type_counts.values()))

        # Performance
        avg_latency = total_latency / n if n > 0 else 0.0
        success_rate = successful_tasks / n if n > 0 else 0.0

        # Synchronization (Kuramoto order parameter)
        synchronization = self._calculate_synchronization()

        # Information flow (approximate by edge weight entropy)
        information_flow = self._calculate_information_flow()

        # Criticality (distance to critical point)
        criticality = self._calculate_criticality()

        return ColonyMetrics(
            num_agents=len(self.agents),
            active_agents=n,
            avg_value_function=avg_value_function,
            avg_degree=avg_degree,
            clustering_coefficient=clustering_coefficient,
            avg_path_length=avg_path_length,
            modularity=modularity,
            shannon_diversity=shannon_diversity,
            type_distribution=type_counts,
            collective_reward=total_reward,
            avg_latency=avg_latency,
            success_rate=success_rate,
            information_flow=information_flow,
            synchronization=synchronization,
            criticality=criticality,
        )

    def _calculate_shannon_diversity(self, counts: List[int]) -> float:
        """Calculate Shannon diversity index"""
        total = sum(counts)
        if total == 0:
            return 0.0

        diversity = 0.0
        for count in counts:
            if count > 0:
                p = count / total
                diversity -= p * np.log2(p)

        return diversity

    def _calculate_synchronization(self) -> float:
        """Calculate Kuramoto order parameter"""
        active_agents = [a for a in self.agents if a.active]
        if not active_agents:
            return 0.0

        # Order parameter: r = |(1/N) * Σ e^(iθ)|
        complex_sum = sum(np.exp(1j * a.phase) for a in active_agents)
        r = abs(complex_sum) / len(active_agents)

        return r

    def _calculate_information_flow(self) -> float:
        """Approximate information flow using network entropy"""
        if self.graph.number_of_edges() == 0:
            return 0.0

        # Calculate edge weight distribution
        weights = [self.graph.edges[e]['weight'] for e in self.graph.edges()]

        # Normalize to probabilities
        total = sum(weights)
        if total == 0:
            return 0.0

        probs = [w / total for w in weights]

        # Calculate entropy
        entropy = -sum(p * np.log2(p) if p > 0 else 0 for p in probs)

        # Normalize by max possible entropy
        max_entropy = np.log2(len(weights))

        return entropy / max_entropy if max_entropy > 0 else 0.0

    def _calculate_criticality(self) -> float:
        """
        Estimate distance to critical point

        Critical point occurs when:
        - Clustering is moderate (0.3-0.5)
        - Path length is moderate
        - Network is neither too sparse nor too dense
        """
        active_agents = [a for a in self.agents if a.active]
        if not active_agents:
            return 0.0

        n = len(active_agents)
        if n < 2:
            return 0.0

        # Current sparsity
        max_edges = n * (n - 1) / 2
        current_edges = self.graph.number_of_edges()
        sparsity = 1 - (current_edges / max_edges)

        # Optimal sparsity range
        target_sparsity = 0.4
        tolerance = 0.15

        # Distance from optimal
        distance = abs(sparsity - target_sparsity)

        # Criticality: 1 = at critical point, 0 = far from critical
        criticality = max(0, 1 - distance / tolerance)

        return criticality

    def run_simulation(
        self,
        num_steps: int = 1000,
        task_difficulty: float = 0.5,
        coupling_strength: float = 0.5,
        enable_evolution: bool = True
    ) -> List[ColonyMetrics]:
        """Run simulation for multiple timesteps"""
        for _ in range(num_steps):
            self.step(task_difficulty, coupling_strength, enable_evolution)

            # Stop if all agents terminated
            if len([a for a in self.agents if a.active]) == 0:
                break

        return self.history

    def get_network_stats(self) -> dict:
        """Get detailed network statistics"""
        active_agents = [a for a in self.agents if a.active]
        n = len(active_agents)

        if n == 0:
            return {}

        # Degree distribution
        degrees = [self.graph.degree(a.id) for a in active_agents]

        # Betweenness centrality
        centrality = nx.betweenness_centrality(self.graph)

        # Connected components
        components = list(nx.connected_components(self.graph))

        return {
            'num_nodes': n,
            'num_edges': self.graph.number_of_edges(),
            'avg_degree': np.mean(degrees),
            'std_degree': np.std(degrees),
            'min_degree': np.min(degrees),
            'max_degree': np.max(degrees),
            'avg_centrality': np.mean(list(centrality.values())),
            'num_components': len(components),
            'largest_component_size': max(len(c) for c in components) if components else 0,
            'density': self.graph.number_of_edges() / (n * (n - 1) / 2) if n > 1 else 0,
        }


# ============================================================================
# SIMULATION RUNNER
# ============================================================================

def run_single_simulation(
    num_agents: int,
    num_steps: int = 1000,
    topology: str = 'small-world',
    task_difficulty: float = 0.5,
    coupling_strength: float = 0.5,
    enable_evolution: bool = True,
    seed: Optional[int] = None
) -> dict:
    """Run a single simulation and return results"""
    if seed is not None:
        np.random.seed(seed)
        random.seed(seed)

    # Create simulation
    sim = ColonySimulation(
        num_agents=num_agents,
        topology=topology
    )

    # Run simulation
    history = sim.run_simulation(
        num_steps=num_steps,
        task_difficulty=task_difficulty,
        coupling_strength=coupling_strength,
        enable_evolution=enable_evolution
    )

    # Extract final metrics
    final_metrics = history[-1] if history else None

    # Calculate summary statistics
    if history:
        success_rates = [m.success_rate for m in history]
        synchronizations = [m.synchronization for m in history]
        criticalities = [m.criticality for m in history]

        summary = {
            'final_success_rate': final_metrics.success_rate if final_metrics else 0.0,
            'avg_success_rate': np.mean(success_rates),
            'std_success_rate': np.std(success_rates),
            'final_synchronization': final_metrics.synchronization if final_metrics else 0.0,
            'avg_synchronization': np.mean(synchronizations),
            'max_synchronization': np.max(synchronizations),
            'final_criticality': final_metrics.criticality if final_metrics else 0.0,
            'avg_criticality': np.mean(criticalities),
            'survival_rate': final_metrics.active_agents / num_agents if final_metrics else 0.0,
        }
    else:
        summary = {
            'final_success_rate': 0.0,
            'avg_success_rate': 0.0,
            'std_success_rate': 0.0,
            'final_synchronization': 0.0,
            'avg_synchronization': 0.0,
            'max_synchronization': 0.0,
            'final_criticality': 0.0,
            'avg_criticality': 0.0,
            'survival_rate': 0.0,
        }

    return {
        'config': {
            'num_agents': num_agents,
            'num_steps': num_steps,
            'topology': topology,
            'task_difficulty': task_difficulty,
            'coupling_strength': coupling_strength,
            'enable_evolution': enable_evolution,
            'seed': seed,
        },
        'summary': summary,
        'network_stats': sim.get_network_stats(),
        'final_metrics': final_metrics.to_dict() if final_metrics else None,
    }


if __name__ == "__main__":
    # Quick test
    print("Testing POLLN Emergent Behavior Simulation")
    print("=" * 50)

    # Run small test simulation
    result = run_single_simulation(
        num_agents=50,
        num_steps=100,
        seed=42
    )

    print(f"\nSimulation completed!")
    print(f"Config: {result['config']}")
    print(f"\nSummary:")
    for key, value in result['summary'].items():
        print(f"  {key}: {value:.4f}")

    print(f"\nNetwork Stats:")
    for key, value in result['network_stats'].items():
        if isinstance(value, float):
            print(f"  {key}: {value:.4f}")
        else:
            print(f"  {key}: {value}")
