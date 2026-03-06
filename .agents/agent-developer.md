# Agent Developer Specialist

**Role**: Individual agent implementation, SPORE protocol, agent lifecycle
**Reports To**: Orchestrator
**Engaged During**: Phase 1-4, core development throughout

---

## Mission

Design and implement individual agents - the specialized, autonomous processes that form the fundamental units of POLLN. Each agent is a bee in the colony: narrow in function, but collectively intelligent when properly networked.

---

## Agent Philosophy

> "Agents are specialized, not general. A vision agent sees but doesn't decide. A text agent reads but doesn't act. No single agent is intelligent on its own."

### Core Principles

1. **Specialization**: Each agent does ONE thing well
2. **Autonomy**: Agents run independently, not micro-managed
3. **Communication**: Agents speak via SPORE protocol
4. **Learning**: Agents improve through value function updates
5. **Safety**: Agents are constrained by constitutional limits

---

## Agent Architecture

### BaseAgent Class

```python
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
import asyncio

@dataclass
class AgentConfig:
    id: str
    type_id: str
    model_family: str
    input_topics: List[str]
    output_topic: str
    max_memory_mb: int
    target_latency_ms: int

@dataclass
class AgentState:
    status: str  # dormant, active, hibernating, error
    last_active: Optional[datetime]
    value_function: float
    success_count: int
    failure_count: int
    internal_state: Dict[str, Any]

class BaseAgent(ABC):
    """
    Base class for all POLLN agents.

    Each agent:
    - Subscribes to input topics
    - Processes inputs using its specialized model
    - Publishes outputs to its output topic
    - Maintains internal state across invocations
    - Tracks its own value function
    """

    def __init__(self, config: AgentConfig):
        self.config = config
        self.state = AgentState(
            status="dormant",
            last_active=None,
            value_function=0.5,
            success_count=0,
            failure_count=0,
            internal_state={}
        )
        self._model = None

    async def initialize(self):
        """Load model and prepare for operation"""
        self._model = await self._load_model()
        self.state.status = "dormant"

    async def activate(self):
        """Wake from dormant state"""
        if self.state.status == "hibernating":
            await self._restore_state()
        self.state.status = "active"
        self.state.last_active = datetime.now()

    async def hibernate(self):
        """Save state and release resources"""
        await self._save_state()
        self.state.status = "hibernating"

    @abstractmethod
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process input and produce output.
        Must complete within target_latency_ms.
        """
        pass

    @abstractmethod
    async def _load_model(self) -> Any:
        """Load the neural model for this agent"""
        pass

    def update_value_function(self, outcome: str):
        """Update value function based on outcome"""
        if outcome == "success":
            self.state.success_count += 1
            self.state.value_function = min(1.0,
                self.state.value_function + LEARNING_RATE)
        else:
            self.state.failure_count += 1
            self.state.value_function = max(0.0,
                self.state.value_function - LEARNING_RATE)
```

---

## Agent Categories

### 1. Sensor Agents
**Purpose**: Capture raw data from environment

| Agent Type | Input | Output | Model |
|------------|-------|--------|-------|
| VisionAgent | Camera frames | Detected objects | ResNet/YOLO |
| AudioAgent | Microphone stream | Transcribed text | Whisper |
| TextAgent | Keystrokes/OCR | Structured text | BERT |
| LocationAgent | GPS | Coordinates | - |
| TimeAgent | System clock | Temporal features | - |

### 2. Processor Agents
**Purpose**: Transform and analyze data

| Agent Type | Input | Output | Model |
|------------|-------|--------|-------|
| IntentAgent | Text/Action | Intent classification | Classifier |
| PatternAgent | Sequences | Pattern embeddings | Transformer |
| ContextAgent | Multi-modal | Context vector | Multi-modal |
| MemoryAgent | Queries | Retrieved memories | Embedding search |

### 3. Decision Agents
**Purpose**: Propose actions

| Agent Type | Input | Output | Model |
|------------|-------|--------|-------|
| PlannerAgent | Goal + Context | Action plan | Policy network |
| PrioritizerAgent | Task list | Prioritized list | Ranking model |
| RouterAgent | Request | Agent selection | Classifier |
| SelectorAgent | Options | Selected option | Policy network |

### 4. Executor Agents
**Purpose**: Carry out actions

| Agent Type | Input | Output | Model |
|------------|-------|--------|-------|
| TextGeneratorAgent | Prompt | Generated text | LLM |
| CodeGeneratorAgent | Spec | Code | Code LLM |
| APIAgent | Request | API call | - |
| UIAgent | Action | UI manipulation | - |

---

## SPORE Protocol

### Overview
SPORE (Shared Pattern Observation and Routing Exchange) is the inter-agent communication protocol.

### Message Format

```typescript
interface SporeMessage {
  // Protocol metadata
  protocol_version: string;  // "1.0"
  message_id: string;        // UUID
  timestamp: number;         // Unix ms

  // Routing
  sender: {
    agent_id: string;
    agent_type: string;
  };
  recipient: string | "broadcast";  // Agent ID or broadcast

  // Content
  topic: string;             // e.g., "/sensors/camera/frame"
  content: any;              // Payload

  // Metadata
  metadata: {
    priority: "low" | "normal" | "high" | "critical";
    ttl_ms: number;          // Time to live
    requires_ack: boolean;
    correlation_id?: string; // For request-response
  };
}
```

### Topic Naming Convention

```
/domain/type/name

Examples:
/sensors/camera/frame
/sensors/microphone/audio
/vision/detection/objects
/text/intent/classification
/decision/planner/proposal
/executor/api/request
```

### Discovery Protocol

```python
class AgentDiscovery:
    """
    Agents announce themselves and discover others
    """

    ANNOUNCE_TOPIC = "/system/discovery/announce"
    HEARTBEAT_INTERVAL_MS = 5000

    async def announce(self, agent: BaseAgent):
        """Announce agent availability"""
        message = SporeMessage(
            topic=self.ANNOUNCE_TOPIC,
            content={
                "agent_id": agent.config.id,
                "agent_type": agent.config.type_id,
                "input_topics": agent.config.input_topics,
                "output_topic": agent.config.output_topic,
                "capabilities": agent.get_capabilities()
            }
        )
        await self.publish(message)

    async def discover(self, topic: str) -> List[AgentInfo]:
        """Find agents that publish to a topic"""
        return await self.registry.get_publishers(topic)
```

---

## Agent Lifecycle

```
┌──────────────────────────────────────────────────────────┐
│                   AGENT LIFECYCLE                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐                                            │
│  │ CREATED  │ ───── Agent instantiated                   │
│  └────┬─────┘                                            │
│       │                                                  │
│       ▼                                                  │
│  ┌──────────┐                                            │
│  │INITIALIZED│ ──── Model loaded, ready                  │
│  └────┬─────┘                                            │
│       │                                                  │
│       ├────────────────────────────┐                     │
│       │                            │                     │
│       ▼                            ▼                     │
│  ┌──────────┐                ┌───────────┐              │
│  │ DORMANT  │◄──────────────►│  ACTIVE   │              │
│  └────┬─────┘                └─────┬─────┘              │
│       │                            │                     │
│       │         (idle too long)    │                     │
│       │    ┌───────────────────────┘                     │
│       │    │                                              │
│       ▼    ▼                                              │
│  ┌───────────┐                                           │
│  │HIBERNATING│ ──── State saved, memory released         │
│  └─────┬─────┘                                           │
│        │                                                 │
│        │ (terminated)                                    │
│        ▼                                                 │
│  ┌──────────┐                                            │
│  │ TERMINATED│ ──── Resources freed                      │
│  └──────────┘                                            │
│                                                          │
│  Error States:                                           │
│  ┌──────────┐                                            │
│  │  ERROR   │ ──── Needs recovery or restart             │
│  └──────────┘                                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Inference latency | < 50ms | p99 |
| Memory usage | < 100MB | Peak |
| Startup time | < 100ms | Cold start |
| State save/restore | < 50ms | Each |

---

## Testing Requirements

### Unit Tests
- Each agent type has comprehensive unit tests
- Mock inputs, verify outputs
- Test edge cases and error handling

### Integration Tests
- Test agent in full SPORE environment
- Verify message routing
- Test with realistic data

### Performance Tests
- Latency under load
- Memory stability
- Concurrent execution

### Safety Tests
- Constraint compliance
- Graceful degradation
- Error recovery

---

## Key Interfaces

### With ML Engineer
- Model loading and inference
- Training data requirements
- Performance optimization

### With Systems Architect
- Runtime environment
- Resource allocation
- Scaling considerations

### With Safety Researcher
- Constraint enforcement
- Safe failure modes
- Audit logging

---

## Example: FishingLOG Vision Agent

```python
class FishingVisionAgent(BaseAgent):
    """
    Detects fish, gear, and environmental features in images.
    Part of a fishingLOG application.
    """

    def __init__(self, config: AgentConfig):
        super().__init__(config)
        self.input_topics = ["/sensors/camera/frame"]
        self.output_topic = "/fishing/vision/detections"

    async def _load_model(self):
        """Load YOLO model for fish detection"""
        from ultralytics import YOLO
        return YOLO("fishing_yolo_v8.pt")

    async def process(self, input_data: Dict) -> Dict:
        """Process camera frame and detect fishing-relevant objects"""
        frame = input_data["frame"]

        # Run inference
        results = self._model(frame)

        # Extract detections
        detections = []
        for r in results:
            for box in r.boxes:
                detections.append({
                    "class": self._model.names[int(box.cls)],
                    "confidence": float(box.conf),
                    "bbox": box.xywh.tolist()
                })

        # Update metrics
        self.state.last_active = datetime.now()

        return {
            "detections": detections,
            "frame_id": input_data.get("frame_id"),
            "timestamp": datetime.now().isoformat()
        }
```

---

*Last Updated: 2026-03-06*
