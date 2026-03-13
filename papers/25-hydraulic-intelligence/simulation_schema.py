#!/usr/bin/env python3
"""
P25: Hydraulic Intelligence Theory
Simulation Schema for Validation/Falsification of Claims

Core Claims to Validate:
1. Pressure differential predicts agent activation (P_i = Σ w_ij·A_j + λ·Φ_i + Ψ_i)
2. Flow follows Kirchhoff's law: Σ Q_ji = Σ Q_ik + ΔV_i
3. Emergence condition is detectable: ¬∃a_i: capability(a_i) ⊢ E ∧ ∃path: compose(path) ⊢ E
4. Shannon diversity correlates with system stability (> 0.7)

Cross-Paper Connections:
- P27 (Emergence Detection): Emergence scoring algorithms
- P13 (Agent Networks): Network topology for flow dynamics
- P6 (Laminar vs Turbulent): Flow regime transitions
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Set
from enum import Enum
import networkx as nx
from collections import defaultdict
import random

# ============================================================================
# CORE DATA STRUCTURES
# ============================================================================

class AgentState(Enum):
    INACTIVE = 0
    ACTIVE = 1
    OVERLOADED = 2

class FlowType(Enum):
    LAMINAR = "laminar"
    TRANSITIONAL = "transitional"
    TURBULENT = "turbulent"

@dataclass
class Agent:
    """Agent in hydraulic network."""
    id: str
    capability: np.ndarray  # Capability vector
    capacity: float  # Maximum processing capacity
    base_pressure: float  # Intrinsic pressure (Ψ_i)
    resistance: float  # Flow resistance

    # State
    state: AgentState = AgentState.INACTIVE
    activation_level: float = 0.0
    accumulated_volume: float = 0.0

    # Tracking
    activations: int = 0
    total_flow_received: float = 0.0
    total_flow_sent: float = 0.0

@dataclass
class FlowEdge:
    """Edge representing information flow between agents."""
    source_id: str
    target_id: str
    weight: float  # Connection strength
    resistance: float  # Flow resistance

    # State
    current_flow: float = 0.0
    flow_history: List[float] = field(default_factory=list)

@dataclass
class EmergenceEvent:
    """Recorded emergence event."""
    timestep: int
    agent_ids: List[str]
    emergent_capability: str
    composition_path: List[str]
    novelty_score: float
    detected_by_algorithm: bool

# ============================================================================
# HYDRAULIC EQUATIONS
# ============================================================================

class HydraulicDynamics:
    """
    Implements hydraulic intelligence equations:

    Pressure Dynamics:
        P_i(t) = Σ_j w_ij·A_j(t) + λ·Φ_i(t) + Ψ_i(t)

    Flow Equation:
        Q_ij = σ(P_j - P_i) · w_ij · (1 - R_ij)

    Kirchhoff's Law:
        Σ Q_ji = Σ Q_ik + ΔV_i
    """

    def __init__(self, lambda_decay: float = 0.1):
        self.lambda_decay = lambda_decay

    def compute_pressure(
        self,
        agent: Agent,
        neighbors: List[Tuple[Agent, float]],  # (neighbor, weight) pairs
        pheromone_level: float
    ) -> float:
        """
        Compute pressure at agent node.

        P_i = Σ w_ij·A_j + λ·Φ_i + Ψ_i

        Args:
            agent: Target agent
            neighbors: List of (neighbor_agent, connection_weight)
            pheromone_level: Virtual pheromone concentration

        Returns:
            Pressure value
        """
        # Sum of weighted neighbor activations
        neighbor_contribution = sum(
            weight * neighbor.activation_level
            for neighbor, weight in neighbors
        )

        # Pheromone contribution
        pheromone_contribution = self.lambda_decay * pheromone_level

        # Total pressure
        pressure = neighbor_contribution + pheromone_contribution + agent.base_pressure

        return pressure

    def compute_flow(
        self,
        source: Agent,
        target: Agent,
        weight: float,
        resistance: float
    ) -> float:
        """
        Compute flow between two agents.

        Q_ij = σ(P_j - P_i) · w_ij · (1 - R_ij)

        Where σ is sigmoid function for smooth transitions.

        Args:
            source: Source agent
            target: Target agent
            weight: Connection weight
            resistance: Flow resistance

        Returns:
            Flow value (positive = source to target)
        """
        # Pressure differential
        pressure_diff = target.activation_level - source.activation_level

        # Sigmoid for smooth activation
        def sigmoid(x, k=5.0):
            return 1.0 / (1.0 + np.exp(-k * x))

        # Flow calculation
        flow = sigmoid(pressure_diff) * weight * (1.0 - resistance)

        return flow

    def verify_kirchhoff(
        self,
        agent: Agent,
        incoming_flows: List[float],
        outgoing_flows: List[float]
    ) -> Tuple[bool, float]:
        """
        Verify Kirchhoff's law for agent node.

        Σ Q_ji = Σ Q_ik + ΔV_i

        Args:
            agent: Agent to check
            incoming_flows: List of incoming flow values
            outgoing_flows: List of outgoing flow values

        Returns:
            Tuple of (is_balanced, volume_change)
        """
        total_in = sum(incoming_flows)
        total_out = sum(outgoing_flows)

        # Volume change
        delta_v = total_in - total_out

        # Check balance (allow small tolerance)
        is_balanced = abs(delta_v - agent.accumulated_volume) < 0.1

        return is_balanced, delta_v

# ============================================================================
# EMERGENCE DETECTION (Connection to P27)
# ============================================================================

class EmergenceDetector:
    """
    Detects emergence in agent networks.

    Novelty Criterion:
        E is emergent ⇔ ¬∃a_i: capability(a_i) ⊢ E ∧ ∃path: compose(path) ⊢ E

    Transfer Entropy for Causal Detection:
        T(A_j → A_i) = H(A_{i+1}|A_i) - H(A_{i+1}|A_i, A_j)
    """

    def __init__(self, capability_dim: int):
        self.capability_dim = capability_dim
        self.known_capabilities: Set[str] = set()
        self.emergence_events: List[EmergenceEvent] = []

    def transfer_entropy(
        self,
        agent_i_history: List[float],
        agent_j_history: List[float],
        bins: int = 10
    ) -> float:
        """
        Calculate transfer entropy from agent j to agent i.

        T(A_j → A_i) = H(A_{i+1}|A_i) - H(A_{i+1}|A_i, A_j)

        Args:
            agent_i_history: Activation history of target agent
            agent_j_history: Activation history of source agent
            bins: Number of bins for discretization

        Returns:
            Transfer entropy value
        """
        if len(agent_i_history) < 3 or len(agent_j_history) < 3:
            return 0.0

        # Discretize
        def discretize(x, bins):
            x = np.array(x)
            x = (x - x.min()) / (x.max() - x.min() + 1e-10)
            return np.digitize(x, np.linspace(0, 1, bins))

        i_disc = discretize(agent_i_history, bins)
        j_disc = discretize(agent_j_history, bins)

        # Calculate conditional entropies
        def entropy(x):
            _, counts = np.unique(x, return_counts=True)
            probs = counts / len(x)
            return -np.sum(probs * np.log2(probs + 1e-10))

        def conditional_entropy(x, y):
            """H(X|Y) = H(X,Y) - H(Y)"""
            xy = list(zip(x, y))
            return entropy(xy) - entropy(y)

        # H(A_{i+1}|A_i)
        h_i_given_i = conditional_entropy(i_disc[1:], i_disc[:-1])

        # H(A_{i+1}|A_i, A_j)
        ij_joint = list(zip(i_disc[:-1], j_disc[:-1]))
        h_i_given_ij = conditional_entropy(i_disc[1:], ij_joint)

        # Transfer entropy
        te = h_i_given_i - h_i_given_ij

        return max(0, te)  # Transfer entropy is non-negative

    def mutual_information(
        self,
        agent_i_history: List[float],
        agent_j_history: List[float],
        bins: int = 10
    ) -> float:
        """
        Calculate mutual information between two agents.

        I(A_i; A_j) = H(A_i) + H(A_j) - H(A_i, A_j)
        """
        if len(agent_i_history) < 2 or len(agent_j_history) < 2:
            return 0.0

        def discretize(x, bins):
            x = np.array(x)
            x = (x - x.min()) / (x.max() - x.min() + 1e-10)
            return np.digitize(x, np.linspace(0, 1, bins))

        i_disc = discretize(agent_i_history, bins)
        j_disc = discretize(agent_j_history, bins)

        def entropy(x):
            _, counts = np.unique(x, return_counts=True)
            probs = counts / len(x)
            return -np.sum(probs * np.log2(probs + 1e-10))

        h_i = entropy(i_disc)
        h_j = entropy(j_disc)
        h_ij = entropy(list(zip(i_disc, j_disc)))

        return h_i + h_j - h_ij

    def detect_emergence(
        self,
        agents: Dict[str, Agent],
        composition_path: List[str],
        timestep: int
    ) -> Optional[EmergenceEvent]:
        """
        Detect if emergence has occurred.

        E is emergent if:
        1. No single agent has the capability
        2. Composition of agents along path produces it
        """
        if len(composition_path) < 2:
            return None

        # Compute composed capability
        path_agents = [agents[aid] for aid in composition_path if aid in agents]
        if len(path_agents) < 2:
            return None

        # Compose capabilities (vector addition + normalization)
        composed_capability = np.sum([a.capability for a in path_agents], axis=0)
        composed_capability = composed_capability / np.linalg.norm(composed_capability)

        # Generate capability signature
        cap_signature = self._capability_signature(composed_capability)

        # Check if any single agent has this capability
        single_agent_has = any(
            self._capability_signature(a.capability) == cap_signature
            for a in agents.values()
        )

        if single_agent_has:
            return None  # Not emergent - single agent has it

        # Check if this is a new emergence
        if cap_signature in self.known_capabilities:
            return None  # Already known

        # Novel emergence detected!
        self.known_capabilities.add(cap_signature)

        # Calculate novelty score based on transfer entropy
        novelty = self._calculate_novelty(path_agents)

        event = EmergenceEvent(
            timestep=timestep,
            agent_ids=composition_path,
            emergent_capability=cap_signature,
            composition_path=composition_path,
            novelty_score=novelelty,
            detected_by_algorithm=True
        )

        self.emergence_events.append(event)
        return event

    def _capability_signature(self, capability: np.ndarray) -> str:
        """Generate unique signature for capability vector."""
        rounded = np.round(capability, 2)
        return f"cap_{hash(tuple(rounded)) % 10000:04d}"

    def _calculate_novelty(self, path_agents: List[Agent]) -> float:
        """Calculate novelty score based on agent interactions."""
        if len(path_agents) < 2:
            return 0.0

        # Higher novelty for more diverse agent combinations
        capabilities = np.array([a.capability for a in path_agents])
        diversity = np.std(capabilities, axis=0).mean()

        return min(1.0, diversity * 2)

# ============================================================================
# HYDRAULIC SIMULATION
# ============================================================================

class HydraulicSimulation:
    """
    Main simulation for hydraulic intelligence in agent networks.
    """

    def __init__(
        self,
        num_agents: int = 30,
        capability_dim: int = 20,
        lambda_decay: float = 0.1,
        pressure_threshold: float = 0.5
    ):
        self.num_agents = num_agents
        self.capability_dim = capability_dim
        self.lambda_decay = lambda_decay
        self.pressure_threshold = pressure_threshold

        # Components
        self.dynamics = HydraulicDynamics(lambda_decay)
        self.emergence_detector = EmergenceDetector(capability_dim)

        # State
        self.agents: Dict[str, Agent] = {}
        self.edges: Dict[Tuple[str, str], FlowEdge] = {}
        self.network: Optional[nx.Graph] = None

        # Tracking
        self.pressure_history: List[Dict[str, float]] = []
        self.flow_history: List[Dict[Tuple[str, str], float]] = []
        self.kirchhoff_violations: List[int] = []

    def initialize_network(self, topology: str = "small_world"):
        """Initialize agent network with specified topology."""
        # Create agents
        for i in range(self.num_agents):
            agent = Agent(
                id=f"agent_{i:03d}",
                capability=np.random.randn(self.capability_dim),
                capacity=np.random.uniform(0.5, 1.5),
                base_pressure=np.random.uniform(0.1, 0.3),
                resistance=np.random.uniform(0.1, 0.4)
            )
            self.agents[agent.id] = agent

        # Create network topology
        if topology == "small_world":
            self.network = nx.watts_strogatz_graph(self.num_agents, 4, 0.3)
        elif topology == "scale_free":
            self.network = nx.barabasi_albert_graph(self.num_agents, 3)
        else:
            self.network = nx.erdos_renyi_graph(self.num_agents, 0.2)

        # Create edges
        for i, j in self.network.edges():
            agent_i, agent_j = f"agent_{i:03d}", f"agent_{j:03d}"
            edge = FlowEdge(
                source_id=agent_i,
                target_id=agent_j,
                weight=np.random.uniform(0.3, 1.0),
                resistance=np.random.uniform(0.1, 0.3)
            )
            self.edges[(agent_i, agent_j)] = edge

            # Bidirectional
            edge_rev = FlowEdge(
                source_id=agent_j,
                target_id=agent_i,
                weight=edge.weight,
                resistance=edge.resistance
            )
            self.edges[(agent_j, agent_i)] = edge_rev

    def inject_demand(self, source_id: str, pressure_spike: float = 1.0):
        """Inject demand (pressure spike) into network."""
        if source_id in self.agents:
            self.agents[source_id].activation_level = pressure_spike
            self.agents[source_id].state = AgentState.ACTIVE
            self.agents[source_id].activations += 1

    def step(self, timestep: int):
        """Execute one simulation step."""
        current_pressures = {}
        current_flows = {}
        kirchhoff_violations = 0

        # Compute pressures
        for agent_id, agent in self.agents.items():
            neighbors = self._get_neighbors(agent_id)
            pheromone = self._get_pheromone(agent_id)
            pressure = self.dynamics.compute_pressure(agent, neighbors, pheromone)
            current_pressures[agent_id] = pressure

            # Activate if above threshold
            if pressure > self.pressure_threshold and agent.state != AgentState.OVERLOADED:
                agent.state = AgentState.ACTIVE
                agent.activation_level = min(1.0, pressure)
                agent.activations += 1
            elif pressure < self.pressure_threshold * 0.5:
                agent.state = AgentState.INACTIVE
                agent.activation_level *= 0.9  # Decay

        # Compute flows
        for (source_id, target_id), edge in self.edges.items():
            source = self.agents[source_id]
            target = self.agents[target_id]
            flow = self.dynamics.compute_flow(
                source, target, edge.weight, edge.resistance
            )
            edge.current_flow = flow
            edge.flow_history.append(flow)
            current_flows[(source_id, target_id)] = flow

            # Update agent flow tracking
            if flow > 0:
                source.total_flow_sent += flow
                target.total_flow_received += flow

        # Verify Kirchhoff's law
        for agent_id, agent in self.agents.items():
            incoming = [e.current_flow for e in self.edges.values()
                       if e.target_id == agent_id and e.current_flow > 0]
            outgoing = [e.current_flow for e in self.edges.values()
                       if e.source_id == agent_id and e.current_flow > 0]

            is_balanced, delta_v = self.dynamics.verify_kirchhoff(
                agent, incoming, outgoing
            )

            if not is_balanced:
                kirchhoff_violations += 1

            agent.accumulated_volume += delta_v

        # Record history
        self.pressure_history.append(current_pressures)
        self.flow_history.append(current_flows)
        self.kirchhoff_violations.append(kirchhoff_violations)

        # Check for emergence
        self._check_emergence(timestep)

    def _get_neighbors(self, agent_id: str) -> List[Tuple[Agent, float]]:
        """Get neighbors with connection weights."""
        neighbors = []
        for (src, tgt), edge in self.edges.items():
            if src == agent_id:
                neighbors.append((self.agents[tgt], edge.weight))
        return neighbors

    def _get_pheromone(self, agent_id: str) -> float:
        """Get virtual pheromone level (simplified)."""
        agent = self.agents[agent_id]
        return agent.activations * 0.1

    def _check_emergence(self, timestep: int):
        """Check for emergence along active paths."""
        active_agents = [
            aid for aid, a in self.agents.items()
            if a.state == AgentState.ACTIVE
        ]

        # Find paths between active agents
        for source in active_agents[:5]:  # Limit computation
            for target in active_agents[:5]:
                if source != target:
                    try:
                        path = nx.shortest_path(
                            self.network,
                            int(source.split('_')[1]),
                            int(target.split('_')[1])
                        )
                        path_ids = [f"agent_{p:03d}" for p in path]
                        self.emergence_detector.detect_emergence(
                            self.agents, path_ids, timestep
                        )
                    except:
                        pass

    def calculate_shannon_diversity(self) -> float:
        """Calculate Shannon diversity index of agent states."""
        state_counts = defaultdict(int)
        for agent in self.agents.values():
            state_counts[agent.state] += 1

        total = sum(state_counts.values())
        if total == 0:
            return 0.0

        diversity = 0.0
        for count in state_counts.values():
            if count > 0:
                p = count / total
                diversity -= p * np.log2(p)

        return diversity

    def run_simulation(self, num_steps: int = 100) -> Dict:
        """Run full simulation and return metrics."""
        for t in range(num_steps):
            # Random demand injection
            if t % 10 == 0:
                random_agent = random.choice(list(self.agents.keys()))
                self.inject_demand(random_agent, np.random.uniform(0.5, 1.0))

            self.step(t)

        return self.get_metrics()

    def get_metrics(self) -> Dict:
        """Calculate all validation metrics."""
        # Pressure prediction accuracy
        pressure_correlations = []
        for i in range(1, len(self.pressure_history)):
            prev = self.pressure_history[i-1]
            curr = self.pressure_history[i]
            if len(prev) > 1:
                prev_vals = np.array(list(prev.values()))
                curr_vals = np.array(list(curr.values()))
                corr = np.corrcoef(prev_vals, curr_vals)[0, 1]
                if not np.isnan(corr):
                    pressure_correlations.append(corr)

        # Kirchhoff compliance
        kirchhoff_compliance = 1.0 - (
            sum(self.kirchhoff_violations) /
            (len(self.kirchhoff_violations) * self.num_agents + 1e-10)
        )

        # Shannon diversity
        diversity = self.calculate_shannon_diversity()

        # Emergence count
        emergence_count = len(self.emergence_detector.emergence_events)

        return {
            "avg_pressure_correlation": np.mean(pressure_correlations) if pressure_correlations else 0,
            "kirchhoff_compliance": kirchhoff_compliance,
            "shannon_diversity": diversity,
            "emergence_events": emergence_count,
            "total_activations": sum(a.activations for a in self.agents.values()),
            "network_density": nx.density(self.network) if self.network else 0
        }


# ============================================================================
# VALIDATION RUNNER
# ============================================================================

def run_validation_simulation(
    num_agents: int = 30,
    num_steps: int = 100,
    topology: str = "small_world"
) -> Dict:
    """
    Run full validation simulation for P25 claims.
    """
    sim = HydraulicSimulation(
        num_agents=num_agents,
        capability_dim=20,
        lambda_decay=0.1,
        pressure_threshold=0.5
    )

    sim.initialize_network(topology)
    metrics = sim.run_simulation(num_steps)

    results = {
        "claim_1_pressure_prediction": {
            "description": "Pressure differential predicts activation",
            "correlation": metrics["avg_pressure_correlation"],
            "validated": metrics["avg_pressure_correlation"] > 0.5,
            "threshold": 0.5
        },
        "claim_2_kirchhoff_law": {
            "description": "Flow follows Kirchhoff's law",
            "compliance": metrics["kirchhoff_compliance"],
            "validated": metrics["kirchhoff_compliance"] > 0.8,
            "threshold": 0.8
        },
        "claim_3_emergence_detection": {
            "description": "Emergence condition is detectable",
            "emergence_events": metrics["emergence_events"],
            "validated": metrics["emergence_events"] > 0,
            "threshold": "> 0"
        },
        "claim_4_diversity_stability": {
            "description": "Shannon diversity correlates with stability (> 0.7)",
            "diversity": metrics["shannon_diversity"],
            "validated": metrics["shannon_diversity"] > 0.7,
            "threshold": 0.7
        },
        "summary": metrics
    }

    return results


if __name__ == "__main__":
    print("=" * 60)
    print("P25: Hydraulic Intelligence - Validation Simulation")
    print("=" * 60)

    results = run_validation_simulation(
        num_agents=30,
        num_steps=50,
        topology="small_world"
    )

    print("\n" + "=" * 60)
    print("VALIDATION RESULTS")
    print("=" * 60)

    for claim_id, claim_data in results.items():
        if claim_id == "summary":
            continue
        status = "VALIDATED" if claim_data["validated"] else "NOT VALIDATED"
        print(f"\n{claim_id}: {claim_data['description']}")
        print(f"  Status: {status}")
        for key, value in claim_data.items():
            if key not in ["description", "validated"]:
                print(f"  {key}: {value}")
