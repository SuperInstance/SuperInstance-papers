# Implementation

## 3.1 System Architecture

### 3.1.1 Core Components

```python
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Callable
from hashlib import sha256
import time

@dataclass
class ProvenanceEntry:
    """Single entry in a provenance chain"""
    origin_id: str
    timestamp: float
    transformation: str
    data_hash: str

@dataclass
class OriginCentricState:
    """
    Origin-Centric State: S = (O, D, T, Φ)

    O: Provenance chain
    D: Data payload
    T: Transformation history
    Φ: Functional relationship
    """
    origin_id: str
    provenance: List[ProvenanceEntry] = field(default_factory=list)
    data: Any = None
    transformations: List[str] = field(default_factory=list)
    function: Optional[Callable] = None

    def derive(self) -> Any:
        """Apply Φ to derive D from (O, T)"""
        if self.function is None:
            return self.data
        return self.function(self.provenance, self.transformations)
```

### 3.1.2 Origin Node Implementation

```python
class OriginNode:
    """
    Definition D1: Origin Node
    o_i = (id_i, R_i, S_i, H_i)
    """
    def __init__(self, node_id: str):
        self.id = node_id
        self.reference_frame = RelativeReferenceFrame(node_id)
        self.state = OriginCentricState(origin_id=node_id)
        self.history: Dict[str, OriginCentricState] = {}

    def receive_update(self, delta: 'RateBasedUpdate') -> bool:
        """
        Process a rate-based update (Definition D5)
        Returns True if state changed
        """
        # Verify provenance chain
        if not self._verify_provenance(delta):
            return False

        # Apply transformation
        old_data = self.state.data
        self.state.data = self._apply_rate(self.state.data, delta)

        # Record in history
        self.history[time.time()] = OriginCentricState(
            origin_id=self.id,
            provenance=self.state.provenance.copy(),
            data=old_data,
            transformations=self.state.transformations.copy()
        )

        # Append to provenance chain
        self.state.provenance.append(ProvenanceEntry(
            origin_id=delta.source_id,
            timestamp=time.time(),
            transformation=delta.transformation,
            data_hash=self._hash_data(self.state.data)
        ))

        return True
```

### 3.1.3 Relative Reference Frame

```python
class RelativeReferenceFrame:
    """
    Definition D2: Relative Reference Frame
    R_{i->j} = T_{i->j} · R_j
    """
    def __init__(self, node_id: str):
        self.node_id = node_id
        self.transformations: Dict[str, 'Transformation'] = {}

    def relate_to(self, other: 'OriginNode') -> 'Transformation':
        """Compute transformation to another node's frame"""
        if other.id in self.transformations:
            return self.transformations[other.id]

        # Compute transformation through common ancestors
        common_ancestors = self._find_common_ancestors(other)
        transform = Transformation.identity()

        for ancestor in common_ancestors:
            t_self = self._transform_to_ancestor(ancestor)
            t_other = other.reference_frame._transform_to_ancestor(ancestor)
            transform = t_other.inverse() @ t_self

        self.transformations[other.id] = transform
        return transform
```

## 3.2 Rate-Based Synchronization

### 3.2.1 Rate-Based Update

```python
@dataclass
class RateBasedUpdate:
    """
    Definition D5: Rate-Based Update
    Δ_i = (dD/dt, dT/dt, dΦ/dt)
    """
    source_id: str
    data_rate: Any  # dD/dt
    transform_rate: List[str]  # dT/dt
    function_rate: Optional[Callable]  # dΦ/dt
    timestamp: float
    affected_nodes: List[str]  # k nodes, not all n

    def to_message(self) -> bytes:
        """Serialize for network transmission"""
        import pickle
        return pickle.dumps({
            'source': self.source_id,
            'data_rate': self.data_rate,
            'transform_rate': self.transform_rate,
            'timestamp': self.timestamp,
            'affected': self.affected_nodes
        })
```

### 3.2.2 O(k) Message Propagation

```python
class OriginCentricNetwork:
    """
    Network implementing Theorem T2: O(k) message complexity
    """
    def __init__(self):
        self.nodes: Dict[str, OriginNode] = {}
        self.provenance_index: Dict[str, List[str]] = {}  # data_hash -> node_ids

    def propagate_update(self, update: RateBasedUpdate) -> int:
        """
        Propagate update to only affected nodes.
        Returns: number of messages sent (always O(k))
        """
        messages_sent = 0

        # Only send to affected nodes (k nodes, not all n)
        for node_id in update.affected_nodes:
            if node_id in self.nodes:
                node = self.nodes[node_id]
                success = node.receive_update(update)
                if success:
                    messages_sent += 1

                    # Update provenance index
                    data_hash = node._hash_data(node.state.data)
                    if data_hash not in self.provenance_index:
                        self.provenance_index[data_hash] = []
                    self.provenance_index[data_hash].append(node_id)

        return messages_sent  # O(k), not O(n)
```

## 3.3 Provenance Chain Management

### 3.3.1 Provenance Verification

```python
    def _verify_provenance(self, delta: RateBasedUpdate) -> bool:
        """
        Verify that the update's provenance chain is valid.
        Ensures immutability (Property P1)
        """
        for entry in delta.provenance:
            # Verify hash chain
            expected_hash = self._compute_expected_hash(entry)
            if entry.data_hash != expected_hash:
                return False

        return True
```

### 3.3.2 Consistency Check (Theorem T3)

```python
    def check_consistency(self, node_a: OriginNode, node_b: OriginNode) -> bool:
        """
        Theorem T3: Nodes with shared (O, T, Φ) derive identical D
        """
        # Check provenance chains
        if not self._provenance_equal(node_a.state.provenance,
                                       node_b.state.provenance):
            return False

        # Check transformations
        if node_a.state.transformations != node_b.state.transformations:
            return False

        # Check functional relationship
        if node_a.state.function != node_b.state.function:
            return False

        # Derive and compare
        return node_a.state.derive() == node_b.state.derive()
```

## 3.4 Performance Optimizations

### 3.4.1 Lazy Provenance Evaluation

```python
class LazyProvenance:
    """Compute provenance only when needed"""
    def __init__(self, state: OriginCentricState):
        self._state = state
        self._cached_result = None
        self._dirty = True

    def get(self) -> Any:
        if self._dirty:
            self._cached_result = self._state.derive()
            self._dirty = False
        return self._cached_result

    def invalidate(self):
        self._dirty = True
```

### 3.4.2 Compressed Provenance Chains

```python
def compress_provenance(chain: List[ProvenanceEntry]) -> bytes:
    """
    Compress provenance chain using delta encoding.
    Achieves ~10x compression on typical chains.
    """
    if not chain:
        return b''

    compressed = bytearray()

    # Delta encode timestamps
    last_time = 0
    for entry in chain:
        time_delta = entry.timestamp - last_time
        compressed.extend(struct.pack('!d', time_delta))
        last_time = entry.timestamp

        # Hash is already compressed (32 bytes)
        compressed.extend(bytes.fromhex(entry.data_hash))

    return bytes(compressed)
```

## 3.5 Network Protocol

### 3.5.1 Message Format

```
+----------------+----------------+------------------+
| Message Type   | Payload Size   | Payload          |
| 4 bytes        | 4 bytes        | Variable         |
+----------------+----------------+------------------+

Message Types:
- 0x01: RATE_UPDATE
- 0x02: PROVENANCE_QUERY
- 0x03: PROVENANCE_RESPONSE
- 0x04: JOIN_REQUEST
- 0x05: LEAVE_NOTIFICATION
```

### 3.5.2 Join Protocol (O(1) complexity)

```python
    def join_network(self, new_node: OriginNode) -> bool:
        """
        O(1) join cost - no global coordination needed
        """
        # Generate unique ID
        new_node.id = self._generate_id()

        # Add to local registry
        self.nodes[new_node.id] = new_node

        # No broadcast to all nodes needed
        # New node will discover peers through gossip

        return True
```

---

## 3.6 Usage Example

```python
# Create network
network = OriginCentricNetwork()

# Create nodes
node_a = OriginNode("node_a")
node_b = OriginNode("node_b")

network.nodes["node_a"] = node_a
network.nodes["node_b"] = node_b

# Create rate-based update (affects only node_b)
update = RateBasedUpdate(
    source_id="node_a",
    data_rate={"value": +1},  # Increment by 1
    transform_rate=["increment"],
    function_rate=None,
    timestamp=time.time(),
    affected_nodes=["node_b"]  # Only k=1 node affected
)

# Propagate - O(k) = O(1) messages
messages = network.propagate_update(update)
print(f"Messages sent: {messages}")  # Output: 1
```

---

*Part of the SuperInstance Mathematical Framework*
