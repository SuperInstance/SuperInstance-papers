# Beginner Course - Week 1: Introduction to SuperInstance

## Overview

**Week 1** introduces the fundamental concepts of SuperInstance systems: origin-centric data, type systems, and confidence cascades. By the end of this week, you will understand what makes SuperInstance different from traditional AI systems and implement your first simple SuperInstance components.

**Learning Time**: 10-15 hours
**Prerequisites**: Basic Python programming

---

## Learning Objectives

By the end of Week 1, you will be able to:
- [ ] Explain the motivation behind SuperInstance systems
- [ ] Implement origin-centric data structures
- [ ] Apply SuperInstance type annotations
- [ ] Build confidence cascade mechanisms
- [ ] Write your first SuperInstance agent

---

## Day 1: What is SuperInstance? (2 hours)

### Lecture 1.1: The Problem with Centralized AI (30 minutes)

**Topics Covered:**
- Limitations of monolithic AI systems
- The distributed systems revolution
- Biological inspiration (ant colonies, neural networks)
- The SuperInstance vision

**Key Concepts:**

```
Traditional AI:
┌─────────────────────────────────┐
│     Centralized Model           │
│  ┌──────────────────────────┐   │
│  │  Giant Neural Network    │   │
│  └──────────────────────────┘   │
│             ↓                    │
│        All Intelligence         │
└─────────────────────────────────┘

SuperInstance AI:
┌─────────────────────────────────┐
│    Distributed Agents           │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐       │
│  │ A │ │ B │ │ C │ │ D │ ...   │
│  └───┘ └───┘ └───┘ └───┘       │
│      ↕     ↕     ↕             │
│   Collective Intelligence       │
└─────────────────────────────────┘
```

**Reading**: P1: Origin-Centric Data Systems (Sections 1-2)

---

### Lecture 1.2: Origin-Centricity Explained (30 minutes)

**Topics Covered:**
- What is "origin"?
- Why origin matters in distributed systems
- Examples from real-world systems
- Mathematical foundations

**Key Definition:**

```python
# Traditional approach (origin-agnostic)
data = {"temperature": 25.3}  # Where did this come from?

# SuperInstance approach (origin-centric)
data = {
    "value": 25.3,
    "origin": {
        "agent_id": "sensor_42",
        "timestamp": "2026-03-13T10:30:00Z",
        "confidence": 0.95,
        "provenance": ["sensor_42", "gateway_1", "cloud"]
    }
}
```

**Activity**: Identify origins in data from your daily life (15 minutes)

---

### Coding Exercise 1.1: Track Your Data (45 minutes)

**Task**: Implement an origin tracking decorator

```python
from functools import wraps
from datetime import datetime
from typing import Any, Dict, Optional

def track_origin(func):
    """
    Decorator that adds origin tracking to function results.

    The origin includes:
    - function_name: Which function created the data
    - timestamp: When it was created
    - arguments: What inputs were used
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        # TODO: Implement origin tracking
        pass  # Your code here
    return wrapper

# Example usage:
@track_origin
def calculate_temperature(sensor_readings):
    """Calculate average temperature from sensor readings."""
    return sum(sensor_readings) / len(sensor_readings)

# Test:
result = calculate_temperature([20.1, 21.3, 19.8])
print(result)
# Should output something like:
# {'value': 20.4, 'origin': {'function_name': 'calculate_temperature', ...}}
```

**Solution**: Provided in `solutions/week1/exercise1_1.py`

**Challenge**: Extend to track the full provenance chain (where inputs came from)

---

### Quiz 1.1: Core Concepts (15 minutes)

**Questions**:
1. What is the main limitation of centralized AI systems?
2. Define "origin" in the context of SuperInstance
3. Why does origin matter for distributed systems?
4. Give an example where origin tracking would be valuable

**Format**: Multiple choice and short answer
**Passing**: 80% or higher

---

## Day 2: Origin-Centric Data Systems (3 hours)

### Lecture 2.1: Paper 1 Deep Dive (45 minutes)

**Reading**: P1: Origin-Centric Data Systems (complete)

**Key Sections**:
- Formal definition of origin-centric data
- Algebra of origin composition
- Provenance tracking
- Case studies

**Mathematical Foundation**:

```
Origin as a Monoid:
- Identity: Empty origin ⊗ origin = origin
- Associativity: (origin₁ ⊗ origin₂) ⊗ origin₃ = origin₁ ⊗ (origin₂ ⊗ origin₃)

Example:
origin₁ = {agent: A, time: t₁}
origin₂ = {agent: B, time: t₂}
origin₁ ⊗ origin₂ = {agents: [A, B], time_range: [t₁, t₂]}
```

**Activity**: Prove that origin composition is associative (15 minutes)

---

### Coding Exercise 2.1: Origin Algebra Implementation (60 minutes)

**Task**: Implement origin composition operations

```python
from typing import List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class Origin:
    """Represents the origin of a piece of data."""
    agent_id: str
    timestamp: datetime
    confidence: float = 1.0
    provenance: List[str] = field(default_factory=list)

    def compose(self, other: 'Origin') -> 'Origin':
        """
        Compose this origin with another using monoid operation.

        Rules:
        - Combine provenance chains
        - Use earliest timestamp
        - Multiply confidences (assuming independence)
        - Track all agents involved
        """
        # TODO: Implement composition
        pass

    def __str__(self) -> str:
        """Human-readable origin description."""
        # TODO: Implement string representation
        pass

@dataclass
class OriginData:
    """Data with full origin tracking."""
    value: Any
    origin: Origin

    def transform(self, transform_func, new_agent_id: str) -> 'OriginData':
        """
        Apply transformation and update origin.

        Args:
            transform_func: Function to transform the value
            new_agent_id: ID of agent performing transformation

        Returns:
            New OriginData with updated origin
        """
        # TODO: Implement transformation with origin update
        pass
```

**Tests to Pass**:

```python
def test_origin_composition():
    """Test that origin composition is associative."""
    origin_a = Origin("agent_a", datetime(2026, 3, 13, 10, 0, 0), 0.9)
    origin_b = Origin("agent_b", datetime(2026, 3, 13, 10, 5, 0), 0.8)
    origin_c = Origin("agent_c", datetime(2026, 3, 13, 10, 10, 0), 0.95)

    # Test associativity: (a ⊗ b) ⊗ c = a ⊗ (b ⊗ c)
    left = origin_a.compose(origin_b).compose(origin_c)
    right = origin_a.compose(origin_b.compose(origin_c))

    assert left.provenance == right.provenance
    assert left.confidence == right.confidence
    print("✓ Origin composition is associative")

def test_data_transformation():
    """Test that transformations preserve origin chain."""
    origin = Origin("sensor_1", datetime(2026, 3, 13, 10, 0, 0), 0.95)
    data = OriginData(20.0, origin)

    # Apply transformation
    celsius_to_fahrenheit = lambda c: c * 9/5 + 32
    fahrenheit = data.transform(celsius_to_fahrenheit, "converter_1")

    assert fahrenheit.value == 68.0
    assert "sensor_1" in fahrenheit.origin.provenance
    assert "converter_1" in fahrenheit.origin.provenance
    print("✓ Transformations preserve origin chain")
```

**Solution**: Provided in `solutions/week1/exercise2_1.py`

---

### Project 2.1: Build Origin-Aware Sensor Network (75 minutes)

**Scenario**: You're building a weather monitoring system with multiple sensors. Each sensor provides readings, but sensors have different reliability levels. Your system should:
1. Track which sensor provided each reading
2. Combine readings from multiple sensors
3. Calculate overall confidence
4. Handle sensor failures gracefully

**Requirements**:
```python
class WeatherStation:
    """
    Origin-aware weather station that combines sensor readings.

    Attributes:
        sensors: List of sensor IDs
        readings: Dictionary of readings with origins
    """

    def add_reading(self, sensor_id: str, temperature: float, confidence: float):
        """Add a reading from a sensor."""
        # TODO: Implement
        pass

    def get_average_temperature(self) -> OriginData[float]:
        """
        Calculate average temperature with origin tracking.

        Returns:
            OriginData containing average and combined origin
        """
        # TODO: Implement
        pass

    def detect_faulty_sensors(self) -> List[str]:
        """
        Detect sensors whose readings deviate significantly from average.

        Uses origin-aware statistics to identify outliers.
        """
        # TODO: Implement
        pass

    def get_reliable_average(self) -> OriginData[float]:
        """
        Calculate average using only reliable sensors.

        Automatically excludes faulty sensors based on origin confidence.
        """
        # TODO: Implement
        pass
```

**Test Cases**:
```python
# Setup station
station = WeatherStation()

# Add readings (some from reliable sensors, some not)
station.add_reading("sensor_1", 20.0, 0.95)  # High confidence
station.add_reading("sensor_2", 21.0, 0.90)  # High confidence
station.add_reading("sensor_3", 15.0, 0.50)  # Low confidence (faulty?)
station.add_reading("sensor_4", 20.5, 0.92)  # High confidence

# Test average
avg = station.get_average_temperature()
print(f"Average: {avg.value}°C with confidence {avg.origin.confidence}")

# Test fault detection
faulty = station.detect_faulty_sensors()
print(f"Faulty sensors: {faulty}")  # Should detect sensor_3

# Test reliable average
reliable_avg = station.get_reliable_average()
print(f"Reliable average: {reliable_avg.value}°C")
```

**Stretch Goals** (if time permits):
- Add temporal weighting (recent readings count more)
- Implement spatial correlation (nearby sensors should agree)
- Add visualization of origin chains
- Handle sensor communication failures

**Solution**: Provided in `solutions/week1/project2_1.py`

---

## Day 3: SuperInstance Type System (3 hours)

### Lecture 3.1: Type Systems for Reliability (45 minutes)

**Topics Covered:**
- Why types matter in distributed systems
- The three SuperInstance types: Value, Reference, Capability
- Type safety guarantees
- Type inference in SuperInstance

**Key Concept: The Three Types**

```python
# Type 1: Value - Immutable, copyable data
@dataclass(frozen=True)
class Temperature:
    """Value type: Can be copied freely."""
    value: float
    unit: str = "C"

# Type 2: Reference - Mutable, single reference
class Sensor:
    """Reference type: Single point of access."""
    def __init__(self, id: str):
        self.id = id
        self._readings: List[float] = []

    def add_reading(self, value: float):
        self._readings.append(value)

# Type 3: Capability - Permissioned access
class ReadCapability:
    """Capability type: Grants permission to read."""
    def __init__(self, resource: Sensor):
        self.resource = resource

    def read(self) -> float:
        return self.resource.get_latest()
```

**Why This Matters**:
- **Values** are safe to copy (no shared state)
- **References** track shared state explicitly
- **Capabilities** enforce security boundaries

---

### Coding Exercise 3.1: Implement SuperInstance Types (60 minutes)

**Task**: Implement the three SuperInstance types with proper enforcement

```python
from typing import TypeVar, Generic
from abc import ABC, abstractmethod

T = TypeVar('T')

class SuperInstanceType(ABC, Generic[T]):
    """Base class for all SuperInstance types."""

    @abstractmethod
    def copy(self) -> 'SuperInstanceType[T]':
        """Create a copy of this instance."""
        pass

class ValueType(SuperInstanceType[T]):
    """
    Value type: Immutable, freely copyable.

    Properties:
    - Immutable (frozen dataclass)
    - Copy creates identical instance
    - No shared state
    """

    def __init__(self, value: T):
        # TODO: Implement with immutability guarantee
        pass

    def copy(self) -> 'ValueType[T]':
        # TODO: Return identical copy
        pass

class ReferenceType(SuperInstanceType[T]):
    """
    Reference type: Mutable, single reference.

    Properties:
    - Mutable state
    - Copy returns same reference (not new instance)
    - Tracks all references
    """

    def __init__(self, initial_value: T):
        # TODO: Implement with reference tracking
        pass

    def copy(self) -> 'ReferenceType[T]':
        # TODO: Return same reference
        pass

    def get_reference_count(self) -> int:
        # TODO: Return number of references
        pass

class CapabilityType(SuperInstanceType[T]):
    """
    Capability type: Permissioned access to resource.

    Properties:
    - Grants specific permissions (read, write, execute)
    - Can be delegated (with permission reduction)
    - Cannot be escalated
    """

    def __init__(self, resource: ReferenceType[T], permissions: set):
        # TODO: Implement capability system
        pass

    def can_read(self) -> bool:
        # TODO: Check read permission
        pass

    def can_write(self) -> bool:
        # TODO: Check write permission
        pass

    def delegate(self, permissions_subset: set) -> 'CapabilityType[T]':
        """
        Create new capability with subset of permissions.

        Cannot add permissions not already held.
        """
        # TODO: Implement capability delegation
        pass
```

**Tests to Pass**:

```python
def test_value_type():
    """Test that value types are truly immutable and copyable."""
    temp = ValueType(20.0)
    temp2 = temp.copy()

    assert temp.value == temp2.value
    assert temp is not temp2  # Different instances
    print("✓ ValueType is immutable and copyable")

def test_reference_type():
    """Test that reference types track shared state."""
    ref = ReferenceType([1, 2, 3])
    ref2 = ref.copy()

    assert ref is ref2  # Same reference
    assert ref.get_reference_count() >= 2

    ref.value.append(4)
    assert ref2.value == [1, 2, 3, 4]  # Shared state
    print("✓ ReferenceType tracks shared state")

def test_capability_type():
    """Test that capabilities enforce permissions."""
    resource = ReferenceType("secret data")
    full_access = CapabilityType(resource, {"read", "write"})

    read_only = full_access.delegate({"read"})

    assert read_only.can_read()
    assert not read_only.can_write()

    # Cannot escalate permissions
    try:
        read_write = read_only.delegate({"read", "write"})
        assert False, "Should not be able to escalate"
    except PermissionError:
        print("✓ CapabilityType prevents permission escalation")
```

**Solution**: Provided in `solutions/week1/exercise3_1.py`

---

### Lecture 3.2: Type Annotations in Practice (30 minutes)

**Topic**: Using Python type annotations with SuperInstance types

```python
from typing import Union

# Type alias for SuperInstance data
SuperInstanceData = Union[ValueType, ReferenceType, CapabilityType]

def process_data(data: ValueType[float]) -> ValueType[float]:
    """Process value-typed data."""
    return ValueType(data.value * 2)

def transfer_capability(
    cap: CapabilityType,
    recipient: str
) -> CapabilityType:
    """Transfer capability with permission reduction."""
    # Read-only access for most recipients
    return cap.delegate({"read"})
```

---

### Quiz 3.1: Type System Concepts (15 minutes)

**Questions**:
1. When should you use ValueType vs ReferenceType?
2. Why are capabilities useful for security?
3. What happens if you try to escalate capabilities?
4. Give an example where each type would be appropriate

**Format**: Multiple choice and short answer
**Passing**: 80% or higher

---

## Day 4: Confidence Cascade Architecture (3 hours)

### Lecture 4.1: Understanding Confidence (45 minutes)

**Topics Covered**:
- What is confidence?
- Confidence vs. probability
- Confidence propagation in networks
- The cascade mechanism

**Key Concept: Confidence Propagation**

```
Agent A (confidence 0.9) → Agent B (confidence ?)
                                    ↓
                    B's confidence = f(A's confidence, agreement)

If B agrees with A: confidence increases
If B disagrees: confidence decreases
```

**Mathematical Model**:

```python
def update_confidence(
    my_confidence: float,
    their_confidence: float,
    agreement: bool
) -> float:
    """
    Update confidence based on interaction.

    Args:
        my_confidence: My current confidence [0, 1]
        their_confidence: Other agent's confidence [0, 1]
        agreement: Whether we agree or disagree

    Returns:
        Updated confidence
    """
    if agreement:
        # Boost confidence when agreeing with confident agent
        return min(1.0, my_confidence + 0.1 * their_confidence)
    else:
        # Reduce confidence when disagreeing
        return max(0.0, my_confidence - 0.2 * their_confidence)
```

---

### Coding Exercise 4.1: Implement Confidence Cascade (60 minutes)

**Task**: Build a confidence cascade system

```python
from typing import List, Dict
from dataclasses import dataclass

@dataclass
class Agent:
    """Agent with confidence in its belief."""
    id: str
    belief: float
    confidence: float

    def update_from_interaction(
        self,
        other: 'Agent',
        agreement_threshold: float = 0.1
    ) -> bool:
        """
        Update confidence after interacting with another agent.

        Args:
            other: Agent to interact with
            agreement_threshold: How close beliefs must be to agree

        Returns:
            True if agents agreed, False otherwise
        """
        # TODO: Implement confidence update
        pass

class ConfidenceCascade:
    """Manages confidence cascade across agent network."""

    def __init__(self):
        self.agents: Dict[str, Agent] = {}

    def add_agent(self, agent: Agent):
        """Add an agent to the network."""
        self.agents[agent.id] = agent

    def simulate_round(self) -> Dict[str, float]:
        """
        Simulate one round of interactions.

        Each agent interacts with random other agent.
        Returns confidence changes.
        """
        # TODO: Implement simulation round
        pass

    def simulate_convergence(
        self,
        max_rounds: int = 100
    ) -> List[Dict[str, float]]:
        """
        Simulate until convergence or max rounds.

        Returns list of confidence states per round.
        """
        # TODO: Implement convergence simulation
        pass
```

**Simulation Example**:

```python
# Create network
cascade = ConfidenceCascade()

# Add agents with varying initial confidences
cascade.add_agent(Agent("A", belief=0.5, confidence=0.5))
cascade.add_agent(Agent("B", belief=0.6, confidence=0.9))
cascade.add_agent(Agent("C", belief=0.4, confidence=0.3))
cascade.add_agent(Agent("D", belief=0.55, confidence=0.7))

# Simulate
history = cascade.simulate_convergence(max_rounds=50)

# Visualize confidence evolution
for i, state in enumerate(history[::10]):  # Every 10 rounds
    print(f"Round {i*10}: {state}")
```

**Expected Behavior**:
- High-confidence agents influence low-confidence agents
- Agreement increases confidence
- Disagreement decreases confidence
- System may converge to consensus or polarization

**Solution**: Provided in `solutions/week1/exercise4_1.py`

---

### Project 4.1: Consensus Formation (60 minutes)

**Scenario**: A group of robots must agree on the best path to a goal. Each robot has a different belief about the path quality. Use confidence cascades to reach consensus.

**Requirements**:
```python
class RobotAgent(Agent):
    """Robot agent trying to find path to goal."""

    def __init__(self, id: str, path_quality: float):
        super().__init__(id, belief=path_quality, confidence=0.5)
        self.path_quality = path_quality

    def sense_path_quality(self) -> float:
        """
        Sense actual path quality (noisy measurement).

        Returns measurement with random noise.
        """
        # TODO: Implement noisy sensing
        pass

class PathConsensus:
    """Form consensus about path quality across robots."""

    def __init__(self, num_robots: int):
        self.robots: List[RobotAgent] = []
        self.cascade = ConfidenceCascade()
        # TODO: Initialize robots
        pass

    def run_round(self) -> Dict[str, float]:
        """
        Run one round of consensus formation.

        Each robot:
        1. Senses path quality
        2. Updates belief
        3. Interacts with random robot
        """
        # TODO: Implement consensus round
        pass

    def reach_consensus(self, threshold: float = 0.05) -> int:
        """
        Run until consensus reached.

        Returns number of rounds needed.
        """
        # TODO: Implement consensus detection
        pass
```

**Test Scenarios**:
1. All robots initially agree (fast convergence)
2. Half robots wrong belief, half right (slower convergence)
3. One highly confident robot with wrong belief (may mislead others)

**Visualization**: Plot confidence evolution over time

**Solution**: Provided in `solutions/week1/project4_1.py`

---

## Day 5: Putting It All Together (4 hours)

### Capstone Project: Build Your First SuperInstance System

**Scenario**: Design and implement a distributed temperature control system for a smart building. The system uses multiple sensors and actuators, all communicating via SuperInstance principles.

**System Architecture**:

```
┌─────────────────────────────────────────────────────┐
│              Smart Building System                   │
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │Sensor 1 │  │Sensor 2 │  │Sensor 3 │  ...        │
│  └────┬────┘  └────┬────┘  └────┬────┘             │
│       │            │            │                   │
│       └────────┬───┴────────────┘                   │
│                ↓                                     │
│        ┌───────────────┐                            │
│        │ Aggregation   │                            │
│        │  Agent        │                            │
│        └───────┬───────┘                            │
│                ↓                                     │
│        ┌───────────────┐                            │
│        │  Control      │                            │
│        │  Agent        │                            │
│        └───────┬───────┘                            │
│                ↓                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │Actuator │  │Actuator │  │Actuator │  ...        │
│  │   1     │  │   2     │  │   3     │             │
│  └─────────┘  └─────────┘  └─────────┘             │
└─────────────────────────────────────────────────────┘
```

**Requirements**:

1. **Origin-Centric Data** (20 points)
   - Track which sensor provided each reading
   - Maintain provenance through aggregation
   - Handle sensor failures gracefully

2. **Type System** (20 points)
   - Use appropriate types for sensors (Reference)
   - Use value types for temperature readings
   - Implement capabilities for actuator control

3. **Confidence Cascade** (30 points)
   - Weight sensors by confidence
   - Update confidence based on agreement
   - Detect and handle faulty sensors

4. **Control Logic** (30 points)
   - Aggregate readings with origin-aware weighting
   - Make control decisions with confidence
   - Delegate actuator control via capabilities

**Skeleton Code**:

```python
from typing import List, Dict, Optional
from datetime import datetime

class TemperatureSensor:
    """Temperature sensor with origin tracking."""

    def __init__(self, id: str, reliability: float):
        self.id = id
        self.reliability = reliability  # Affects confidence
        self.readings: List[OriginData[float]] = []

    def read_temperature(self) -> OriginData[float]:
        """
        Read current temperature with origin.

        Returns OriginData with sensor's origin information.
        """
        # TODO: Implement with origin tracking
        pass

class AggregationAgent:
    """Aggregates readings from multiple sensors."""

    def __init__(self):
        self.sensors: List[TemperatureSensor] = []
        self.aggregated_readings: List[OriginData[float]] = []

    def add_sensor(self, sensor: TemperatureSensor):
        """Add a sensor to monitor."""
        self.sensors.append(sensor)

    def aggregate_readings(self) -> OriginData[float]:
        """
        Aggregate readings from all sensors.

        Uses confidence-weighted averaging.
        Tracks origin of each reading in provenance.
        """
        # TODO: Implement origin-aware aggregation
        pass

    def update_confidences(self):
        """
        Update sensor confidences based on agreement.

        Sensors that agree with group get confidence boost.
        Sensors that disagree get confidence penalty.
        """
        # TODO: Implement confidence cascade
        pass

class ControlAgent:
    """Makes control decisions based on aggregated readings."""

    def __init__(self, aggregation_agent: AggregationAgent):
        self.aggregation = aggregation_agent
        self.target_temperature = 22.0  # Celsius

    def decide_action(self) -> Optional[str]:
        """
        Decide whether to heat, cool, or do nothing.

        Returns:
            "heat", "cool", or None
        """
        # TODO: Implement control logic
        pass

class Actuator:
    """Actuator that controls HVAC system."""

    def __init__(self, id: str):
        self.id = id
        self.capability: Optional[CapabilityType] = None

    def set_capability(self, capability: CapabilityType):
        """Set capability to control this actuator."""
        self.capability = capability

    def activate(self, action: str) -> bool:
        """
        Activate actuator if capability permits.

        Returns True if successful, False otherwise.
        """
        # TODO: Implement capability check
        pass

class SmartBuildingSystem:
    """Complete smart building control system."""

    def __init__(self, num_sensors: int, num_actuators: int):
        # TODO: Initialize all components
        pass

    def run_control_cycle(self) -> Dict[str, float]:
        """
        Run one complete control cycle.

        1. Read from all sensors
        2. Aggregate readings
        3. Update confidences
        4. Make control decision
        5. Activate actuators

        Returns system state.
        """
        # TODO: Implement complete cycle
        pass

    def simulate(self, cycles: int = 100) -> List[Dict[str, float]]:
        """
        Simulate multiple control cycles.

        Returns history of system states.
        """
        # TODO: Implement simulation
        pass
```

**Testing**:

```python
# Test basic functionality
def test_complete_system():
    system = SmartBuildingSystem(num_sensors=5, num_actuators=3)

    # Run simulation
    history = system.simulate(cycles=50)

    # Verify convergence
    final_temp = history[-1]['temperature']
    assert abs(final_temp - 22.0) < 1.0  # Within 1 degree of target

    # Verify origin tracking
    for state in history:
        assert 'origin' in state
        assert 'provenance' in state['origin']

    # Verify confidence cascade
    assert 'sensor_confidences' in history[-1]

    print("✓ Complete system works!")
```

**Deliverables**:
1. Complete implementation of all classes
2. Test suite demonstrating correctness
3. Visualization of system behavior over time
4. 1-page report explaining design decisions

**Grading Rubric**:
- Origin tracking: 20 points
- Type system usage: 20 points
- Confidence cascade: 30 points
- Control logic: 30 points

**Solution**: Provided in `solutions/week1/capstone.py`

---

## Week 1 Summary

**What You Learned**:
- SuperInstance motivation and vision
- Origin-centric data structures
- SuperInstance type system
- Confidence cascade architecture
- Building a complete SuperInstance system

**Key Achievements**:
- Implemented origin tracking
- Built type-safe distributed system
- Created confidence cascade mechanism
- Deployed smart building control system

**Next Week**: Mathematical foundations - Pythagorean tensors, rate-based change, and laminar vs. turbulent systems

---

## Additional Resources

### Readings
- P1: Origin-Centric Data Systems (complete)
- P2: SuperInstance Type System (complete)
- P3: Confidence Cascade Architecture (complete)

### Videos
- "Introduction to SuperInstance" (15 min)
- "Origin-Centricity Explained" (10 min)
- "Type Systems for Distributed AI" (12 min)

### Interactive Tools
- Origin Tracker Visualizer (web)
- Confidence Cascade Simulator (web)
- Type System Playground (web)

### Community
- Week 1 Discussion Forum
- Live Q&A Sessions (Mon/Wed/Fri 2pm ET)
- Peer Study Groups

---

**Next Up**: Week 2 - Mathematical Foundations
