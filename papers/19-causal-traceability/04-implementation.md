# Implementation

## 3.1 Core Data Structures

### 3.1.1 Causal Event

```python
from dataclasses import dataclass
from typing import List, Optional, Any
from datetime import datetime
import uuid

@dataclass
class CausalEvent:
    """A single event in a causal chain."""
    id: str                    # Unique identifier
    agent_id: str              # Agent that generated this event
    timestamp: float           # When event occurred
    action: str                # What action was taken
    triggers: List[str]        # IDs of events that triggered this
    evidence: Any              # Data that caused this decision
    weight: float              # Importance of this causal link

    @classmethod
    def create(cls, agent_id: str, action: str, triggers: List[str],
               evidence: Any, weight: float = 1.0) -> 'CausalEvent':
        return cls(
            id=str(uuid.uuid4()),
            agent_id=agent_id,
            timestamp=datetime.now().timestamp(),
            action=action,
            triggers=triggers,
            evidence=evidence,
            weight=weight
        )
```

### 3.1.2 Causal Chain

```python
@dataclass
class CausalChain:
    """Complete causal chain for a decision."""
    decision_id: str
    events: List[CausalEvent]
    confidence: float

    def depth(self) -> int:
        """Number of events in the chain."""
        return len(self.events)

    def root_causes(self) -> List[CausalEvent]:
        """Find events with no triggers (initial causes)."""
        return [e for e in self.events if len(e.triggers) == 0]

    def attribution_scores(self) -> dict:
        """Compute attribution scores for each event."""
        scores = {}
        total_weight = sum(e.weight for e in self.events)

        for event in self.events:
            # Attribution based on weight and position
            depth_factor = 1.0 / (self.events.index(event) + 1)
            scores[event.id] = (event.weight * depth_factor) / total_weight

        return scores
```

### 3.1.3 Causal Graph

```python
from collections import defaultdict
import networkx as nx

class CausalGraph:
    """Graph structure for causal relationships."""

    def __init__(self):
        self.graph = nx.DiGraph()
        self.events = {}  # id -> CausalEvent
        self.agent_events = defaultdict(list)  # agent_id -> [event_ids]

    def add_event(self, event: CausalEvent):
        """Add an event to the graph."""
        self.graph.add_node(event.id, event=event)
        self.events[event.id] = event
        self.agent_events[event.agent_id].append(event.id)

        # Add edges from triggers
        for trigger_id in event.triggers:
            if trigger_id in self.events:
                self.graph.add_edge(trigger_id, event.id)

    def get_chain(self, decision_id: str) -> Optional[CausalChain]:
        """Get causal chain for a decision."""
        if decision_id not in self.events:
            return None

        # BFS from initial events to decision
        events = []
        visited = set()
        queue = [decision_id]

        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)

            event = self.events[current]
            events.append(event)

            # Add triggers to queue
            for trigger_id in event.triggers:
                if trigger_id not in visited:
                    queue.append(trigger_id)

        # Reverse to get chronological order
        events.reverse()

        return CausalChain(
            decision_id=decision_id,
            events=events,
            confidence=self._compute_confidence(events)
        )

    def _compute_confidence(self, events: List[CausalEvent]) -> float:
        """Compute confidence in causal chain."""
        if not events:
            return 0.0

        # Confidence based on completeness and weights
        completeness = 1.0 if all(e.triggers for e in events) else 0.8
        avg_weight = sum(e.weight for e in events) / len(events)

        return completeness * avg_weight
```

## 3.2 Traceability System

### 3.2.1 Tracer Interface

```python
from abc import ABC, abstractmethod

class TracerInterface(ABC):
    """Abstract interface for causal tracing."""

    @abstractmethod
    def record_event(self, event: CausalEvent) -> str:
        """Record a new causal event."""
        pass

    @abstractmethod
    def get_chain(self, decision_id: str) -> Optional[CausalChain]:
        """Get causal chain for a decision."""
        pass

    @abstractmethod
    def query_by_agent(self, agent_id: str) -> List[CausalChain]:
        """Get all decisions made by an agent."""
        pass

    @abstractmethod
    def query_by_time(self, start: float, end: float) -> List[CausalChain]:
        """Get decisions in time range."""
        pass
```

### 3.2.2 Implementation

```python
class CausalTracer(TracerInterface):
    """Concrete implementation of causal tracing."""

    def __init__(self, max_chains: int = 10000):
        self.graph = CausalGraph()
        self.decisions = {}  # decision_id -> event_id
        self.max_chains = max_chains

    def record_event(self, event: CausalEvent) -> str:
        """Record a new causal event."""
        self.graph.add_event(event)

        # If this is a decision, track it
        if self._is_decision(event):
            self.decisions[event.id] = event.id

        return event.id

    def _is_decision(self, event: CausalEvent) -> bool:
        """Determine if event represents a decision."""
        # Decisions have significant actions
        decision_actions = ['choose', 'select', 'decide', 'act', 'execute']
        return any(action in event.action.lower() for action in decision_actions)

    def get_chain(self, decision_id: str) -> Optional[CausalChain]:
        """Get causal chain for a decision."""
        return self.graph.get_chain(decision_id)

    def query_by_agent(self, agent_id: str) -> List[CausalChain]:
        """Get all decisions made by an agent."""
        chains = []
        for event_id in self.graph.agent_events[agent_id]:
            if event_id in self.decisions:
                chain = self.get_chain(event_id)
                if chain:
                    chains.append(chain)
        return chains

    def query_by_time(self, start: float, end: float) -> List[CausalChain]:
        """Get decisions in time range."""
        chains = []
        for event_id, event in self.graph.events.items():
            if start <= event.timestamp <= end:
                if event_id in self.decisions:
                    chain = self.get_chain(event_id)
                    if chain:
                        chains.append(chain)
        return chains
```

## 3.3 Agent Integration

### 3.3.1 Traced Agent

```python
class TracedAgent:
    """Agent with built-in causal tracing."""

    def __init__(self, agent_id: str, tracer: CausalTracer):
        self.agent_id = agent_id
        self.tracer = tracer
        self.recent_events = []  # Events this agent generated

    def observe(self, observation: Any) -> str:
        """Record an observation as a causal event."""
        event = CausalEvent.create(
            agent_id=self.agent_id,
            action="observe",
            triggers=[],
            evidence=observation,
            weight=0.5  # Observations have medium weight
        )
        event_id = self.tracer.record_event(event)
        self.recent_events.append(event_id)
        return event_id

    def decide(self, options: List[Any], triggers: List[str]) -> tuple:
        """Make a decision with causal tracking."""
        # Select option
        selected = self._select_option(options)

        # Record decision event
        event = CausalEvent.create(
            agent_id=self.agent_id,
            action=f"decide: {selected}",
            triggers=triggers,
            evidence={"options": options, "selected": selected},
            weight=1.0  # Decisions have high weight
        )
        event_id = self.tracer.record_event(event)
        self.recent_events.append(event_id)

        return selected, event_id

    def _select_option(self, options: List[Any]) -> Any:
        """Internal selection logic."""
        # Placeholder for actual decision logic
        return options[0] if options else None

    def act(self, action: str, triggers: List[str]) -> str:
        """Perform an action with causal tracking."""
        event = CausalEvent.create(
            agent_id=self.agent_id,
            action=action,
            triggers=triggers,
            evidence={"action": action},
            weight=0.8  # Actions have high weight
        )
        event_id = self.tracer.record_event(event)
        self.recent_events.append(event_id)
        return event_id
```

## 3.4 Query Interface

### 3.4.1 Query Engine

```python
class CausalQueryEngine:
    """Engine for querying causal relationships."""

    def __init__(self, tracer: CausalTracer):
        self.tracer = tracer

    def why(self, decision_id: str) -> str:
        """Explain why a decision was made."""
        chain = self.tracer.get_chain(decision_id)
        if not chain:
            return "No causal chain found."

        explanation = f"Decision {decision_id} was made because:\n"
        for i, event in enumerate(chain.events):
            explanation += f"  {i+1}. Agent {event.agent_id} {event.action}\n"

        return explanation

    def who_influenced(self, decision_id: str) -> set:
        """Find all agents that influenced a decision."""
        chain = self.tracer.get_chain(decision_id)
        if not chain:
            return set()

        return {e.agent_id for e in chain.events}

    def when(self, decision_id: str) -> Optional[float]:
        """Find when a decision was made."""
        chain = self.tracer.get_chain(decision_id)
        if not chain:
            return None

        return chain.events[-1].timestamp if chain.events else None

    def trace_back(self, decision_id: str, steps: int = 5) -> List[CausalEvent]:
        """Trace back n steps from a decision."""
        chain = self.tracer.get_chain(decision_id)
        if not chain:
            return []

        return chain.events[-steps:] if len(chain.events) >= steps else chain.events
```

## 3.5 Visualization

### 3.5.1 Graph Visualization

```python
import matplotlib.pyplot as plt
import networkx as nx

def visualize_causal_chain(chain: CausalChain, output_path: str):
    """Visualize a causal chain as a graph."""
    G = nx.DiGraph()

    for event in chain.events:
        G.add_node(event.id,
                   label=f"{event.agent_id}\n{event.action}",
                   weight=event.weight)

    for event in chain.events:
        for trigger in event.triggers:
            G.add_edge(trigger, event.id)

    pos = nx.spring_layout(G)
    plt.figure(figsize=(12, 8))

    nx.draw(G, pos,
            with_labels=False,
            node_size=[G.nodes[n].get('weight', 1) * 1000 for n in G.nodes()],
            node_color='lightblue',
            arrows=True)

    labels = {n: G.nodes[n].get('label', n[:8]) for n in G.nodes()}
    nx.draw_networkx_labels(G, pos, labels, font_size=8)

    plt.title(f"Causal Chain for Decision {chain.decision_id}")
    plt.savefig(output_path)
    plt.close()
```

## 3.6 Summary

The implementation provides:
1. **Causal Event** structure with triggers and weights
2. **Causal Graph** for efficient relationship storage
3. **Traced Agent** with built-in recording
4. **Query Engine** for causal analysis
5. **Visualization** for human understanding

---

*Part of the SuperInstance Mathematical Framework*
