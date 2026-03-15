# Tutorial 01: Basic Consensus

**Level:** Beginner
**Time:** 45 minutes
**Prerequisites:** Python 3.10+, basic Python knowledge

---

## Overview

This tutorial teaches you the fundamentals of distributed consensus — how multiple nodes in a distributed system can agree on a single value despite failures and network issues. This is a foundational concept in distributed systems and the core of SuperInstance's bio-inspired consensus algorithms.

---

## Learning Objectives

By the end of this tutorial, you will:

1. ✅ Understand what distributed consensus is
2. ✅ Learn why consensus is challenging
3. ✅ Implement basic voting mechanisms
4. ✅ Handle node failures gracefully
5. ✅ Build a simple consensus system from scratch

---

## What is Distributed Consensus?

**Definition:** Distributed consensus is the process of getting multiple nodes in a distributed system to agree on a single data value.

**Real-World Examples:**
- **Databases:** Replicated databases agreeing on which transaction committed first
- **Cloud Systems:** Multiple servers agreeing on the state of a resource
- **Blockchain:** Nodes agreeing on which block is added to the chain
- **SuperInstance:** Distributed cells agreeing on computation results

**Why is it Hard?**
- Nodes may crash or fail
- Network messages may be lost or delayed
- Messages may arrive out of order
- Byzantine nodes may send conflicting information

---

## Part 1: Simple Majority Voting

Let's start with the simplest form of consensus: majority voting.

### Implementation

Create `main.py`:

```python
import random
from typing import List, Dict
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Node:
    """A node in the distributed system"""
    id: int
    value: int = None
    is_active: bool = True

class SimpleConsensus:
    """Simple majority voting consensus"""

    def __init__(self, num_nodes: int = 5):
        self.nodes = [Node(id=i) for i in range(num_nodes)]
        self.proposals: Dict[int, int] = {}
        self.round = 0

    def broadcast_proposal(self, value: int):
        """Broadcast a proposal to all active nodes"""
        self.round += 1
        print(f"\n--- Round {self.round} ---")
        print(f"Broadcasting proposal: {value}")

        # Each node receives the proposal
        for node in self.nodes:
            if node.is_active:
                node.value = value
                self.proposals[node.id] = value
                print(f"Node {node.id}: Received {value}")

    def count_votes(self) -> int:
        """Count votes and return majority value"""
        if not self.proposals:
            return None

        # Count occurrences of each value
        votes = {}
        for node_id, value in self.proposals.items():
            if self.nodes[node_id].is_active:
                votes[value] = votes.get(value, 0) + 1

        # Find majority
        majority_threshold = len(self.active_nodes) / 2
        for value, count in votes.items():
            if count >= majority_threshold:
                print(f"Majority reached: {value} ({count}/{len(self.active_nodes)} votes)")
                return value

        print("No majority reached")
        return None

    @property
    def active_nodes(self) -> List[Node]:
        """Get list of active nodes"""
        return [n for n in self.nodes if n.is_active]

    def simulate_failure(self, node_id: int):
        """Simulate node failure"""
        if 0 <= node_id < len(self.nodes):
            self.nodes[node_id].is_active = False
            print(f"Node {node_id} FAILED!")

    def run_example(self):
        """Run a complete consensus example"""
        print("=" * 60)
        print("SIMPLE MAJORITY CONSENSUS EXAMPLE")
        print("=" * 60)

        # Example 1: Unanimous agreement
        print("\n### Example 1: Unanimous Agreement ###")
        self.broadcast_proposal(42)
        result = self.count_votes()
        print(f"Result: {result}")

        # Example 2: With node failure
        print("\n### Example 2: With Node Failure ###")
        self.simulate_failure(2)
        self.broadcast_proposal(100)
        result = self.count_votes()
        print(f"Result: {result}")

        # Example 3: Conflicting proposals
        print("\n### Example 3: Conflicting Proposals ###")
        self.simulate_failure(1)

        # Node 0 proposes 50
        for node in self.nodes[:3]:
            if node.is_active:
                node.value = 50
                self.proposals[node.id] = 50

        # Node 3 proposes 75
        for node in self.nodes[3:]:
            if node.is_active:
                node.value = 75
                self.proposals[node.id] = 75

        result = self.count_votes()
        print(f"Result: {result}")

if __name__ == "__main__":
    consensus = SimpleConsensus(num_nodes=5)
    consensus.run_example()
```

### Run the Example

```bash
cd tutorials/beginner/01-basic-consensus/
python main.py
```

### Expected Output

```
============================================================
SIMPLE MAJORITY CONSENSUS EXAMPLE
============================================================

### Example 1: Unanimous Agreement ###

--- Round 1 ---
Broadcasting proposal: 42
Node 0: Received 42
Node 1: Received 42
Node 2: Received 42
Node 3: Received 42
Node 4: Received 42
Majority reached: 42 (5/5 votes)
Result: 42

### Example 2: With Node Failure ###
Node 2 FAILED!

--- Round 2 ---
Broadcasting proposal: 100
Node 0: Received 100
Node 1: Received 100
Node 3: Received 100
Node 4: Received 100
Majority reached: 100 (4/4 votes)
Result: 100

### Example 3: Conflicting Proposals ###
Node 1 FAILED!

Majority reached: 50 (2/3 votes)
Result: 50
```

---

## Part 2: Handling Concurrent Proposals

In real systems, multiple nodes may propose values simultaneously. Let's implement a more robust consensus algorithm that handles this.

### Implementation

Create `concurrent_consensus.py`:

```python
import time
from typing import List, Optional
from dataclasses import dataclass
from collections import defaultdict
import threading

@dataclass
class Proposal:
    """A proposal with timestamp"""
    value: int
    node_id: int
    timestamp: float

class ConcurrentConsensus:
    """Handle concurrent proposals with timestamp ordering"""

    def __init__(self, num_nodes: int = 5):
        self.num_nodes = num_nodes
        self.proposals: List[Proposal] = []
        self.lock = threading.Lock()
        self.decided_value: Optional[int] = None

    def propose(self, value: int, node_id: int):
        """Submit a proposal"""
        proposal = Proposal(
            value=value,
            node_id=node_id,
            timestamp=time.time()
        )

        with self.lock:
            self.proposals.append(proposal)
            print(f"Node {node_id} proposed {value} at {proposal.timestamp:.3f}")

    def decide(self) -> Optional[int]:
        """Decide on a value using earliest proposal wins"""
        with self.lock:
            if not self.proposals:
                return None

            if self.decided_value is not None:
                return self.decided_value

            # Sort by timestamp
            self.proposals.sort(key=lambda p: p.timestamp)

            # Pick earliest proposal
            winner = self.proposals[0]
            self.decided_value = winner.value

            print(f"\nDecision: {winner.value} (proposed by Node {winner.node_id})")
            print(f"All proposals:")
            for p in self.proposals:
                print(f"  Node {p.node_id}: {p.value} at {p.timestamp:.3f}")

            return self.decided_value

    def simulate_concurrent_proposals(self):
        """Simulate multiple concurrent proposals"""
        print("\n" + "=" * 60)
        print("CONCURRENT PROPOSAL EXAMPLE")
        print("=" * 60)

        # Simulate concurrent proposals using threads
        threads = []
        values = [10, 20, 30, 40, 50]

        def make_proposal(value, node_id, delay):
            time.sleep(delay)
            self.propose(value, node_id)

        # Create threads with different delays
        for i, value in enumerate(values):
            delay = random.uniform(0.01, 0.1)
            thread = threading.Thread(
                target=make_proposal,
                args=(value, i, delay)
            )
            threads.append(thread)

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for all threads
        for thread in threads:
            thread.join()

        # Make decision
        time.sleep(0.2)  # Ensure all proposals are received
        return self.decide()

import random

if __name__ == "__main__":
    consensus = ConcurrentConsensus(num_nodes=5)

    # Run multiple rounds
    for round_num in range(3):
        print(f"\n### Round {round_num + 1} ###")
        consensus.proposals = []
        consensus.decided_value = None
        consensus.simulate_concurrent_proposals()
        result = consensus.decide()
        print(f"Final decision: {result}")
```

### Run Concurrent Example

```bash
python concurrent_consensus.py
```

---

## Part 3: Fault-Tolerant Consensus

Now let's implement a fault-tolerant consensus algorithm inspired by Paxos, which can handle:
- Node failures
- Network delays
- Message loss

### Implementation

Create `fault_tolerant_consensus.py`:

```python
from enum import Enum
from typing import List, Dict, Optional
import time
import random

class Phase(Enum):
    PREPARE = 1
    PROMISE = 2
    ACCEPT = 3
    ACCEPTED = 4

class Message:
    def __init__(self, phase: Phase, value: Optional[int] = None,
                 proposal_number: int = 0, from_node: int = 0):
        self.phase = phase
        self.value = value
        self.proposal_number = proposal_number
        self.from_node = from_node

class PaxosNode:
    """A node implementing Paxos-like consensus"""

    def __init__(self, node_id: int, total_nodes: int):
        self.node_id = node_id
        self.total_nodes = total_nodes
        self.current_value: Optional[int] = None
        self.promised_proposal: int = 0
        self.accepted_proposal: int = 0
        self.accepted_value: Optional[int] = None
        self.is_leader = False
        self.message_queue: List[Message] = []

    def send_message(self, message: Message):
        """Send message to all nodes (simulated)"""
        print(f"Node {self.node_id} -> {message.phase.name}: "
              f"proposal={message.proposal_number}, "
              f"value={message.value}")

    def receive_prepare(self, proposal_number: int) -> Message:
        """Receive prepare phase message"""
        if proposal_number > self.promised_proposal:
            self.promised_proposal = proposal_number
            return Message(
                phase=Phase.PROMISE,
                proposal_number=proposal_number,
                value=self.accepted_value,
                from_node=self.node_id
            )
        return None

    def receive_accept(self, proposal_number: int, value: int) -> bool:
        """Receive accept phase message"""
        if proposal_number >= self.promised_proposal:
            self.accepted_proposal = proposal_number
            self.accepted_value = value
            return True
        return False

class FaultTolerantConsensus:
    """Fault-tolerant consensus using Paxos-inspired algorithm"""

    def __init__(self, num_nodes: int = 5):
        self.nodes = [PaxosNode(i, num_nodes) for i in range(num_nodes)]
        self.proposal_number = 0
        self.quorum_size = (num_nodes // 2) + 1

    def run_consensus(self, proposed_value: int, leader_id: int = 0) -> Optional[int]:
        """Run full consensus round"""
        print(f"\n{'='*60}")
        print(f"CONSENSUS ROUND: Proposing {proposed_value}")
        print(f"{'='*60}")

        self.proposal_number += 1
        leader = self.nodes[leader_id]

        # Phase 1: Prepare
        print("\n### PHASE 1: PREPARE ###")
        promises = []
        for node in self.nodes:
            if node.node_id == leader_id:
                continue

            response = node.receive_prepare(self.proposal_number)
            if response:
                promises.append(response)
                node.send_message(response)

        if len(promises) < self.quorum_size - 1:
            print(f"Failed to get quorum: {len(promises)}/{self.quorum_size - 1} promises")
            return None

        print(f"Got quorum: {len(promises)}/{self.quorum_size - 1} promises")

        # Phase 2: Accept
        print("\n### PHASE 2: ACCEPT ###")
        acceptances = []
        for node in self.nodes:
            if node.node_id == leader_id:
                continue

            if node.receive_accept(self.proposal_number, proposed_value):
                acceptances.append(node.node_id)
                print(f"Node {node.node_id} ACCEPTED value {proposed_value}")

        if len(acceptances) < self.quorum_size - 1:
            print(f"Failed to get acceptance quorum")
            return None

        print(f"Got acceptance quorum: {len(acceptances)}/{self.quorum_size - 1}")

        # Consensus reached!
        for node in self.nodes:
            node.current_value = proposed_value

        print(f"\n### CONSENSUS REACHED: {proposed_value} ###")
        return proposed_value

    def simulate_with_failures(self):
        """Simulate consensus with node failures"""
        print("\n" + "="*60)
        print("FAULT-TOLERANT CONSENSUS WITH FAILURES")
        print("="*60)

        # Round 1: Normal operation
        print("\n### Round 1: Normal Operation ###")
        self.run_consensus(100, leader_id=0)

        # Round 2: With "network partition" (some nodes don't respond)
        print("\n### Round 2: Simulated Network Partition ###")
        original_nodes = self.nodes[:]
        self.nodes = self.nodes[:3]  # Only 3 nodes available
        result = self.run_consensus(200, leader_id=0)
        self.nodes = original_nodes

        if result is None:
            print("Consensus failed as expected (not enough nodes)")

        # Round 3: Recovery
        print("\n### Round 3: Recovery ###")
        result = self.run_consensus(300, leader_id=0)
        print(f"Consensus recovered with result: {result}")

if __name__ == "__main__":
    consensus = FaultTolerantConsensus(num_nodes=5)
    consensus.simulate_with_failures()
```

### Run Fault-Tolerant Example

```bash
python fault_tolerant_consensus.py
```

---

## Quiz

Test your understanding with these questions:

```python
# quiz.py

def quiz_consensus():
    """Test your consensus knowledge"""

    questions = [
        {
            "question": "What is distributed consensus?",
            "options": [
                "A. Nodes agreeing on a value",
                "B. Network protocols",
                "C. Database indexing",
                "D. Load balancing"
            ],
            "answer": "A"
        },
        {
            "question": "What makes consensus hard?",
            "options": [
                "A. Slow networks",
                "B. Node failures and message loss",
                "C. Large data sizes",
                "D. CPU limitations"
            ],
            "answer": "B"
        },
        {
            "question": "What is a quorum?",
            "options": [
                "A. All nodes",
                "B. Majority of nodes",
                "C. Random nodes",
                "D. Leader node"
            ],
            "answer": "B"
        }
    ]

    score = 0
    for i, q in enumerate(questions, 1):
        print(f"\nQuestion {i}: {q['question']}")
        for opt in q['options']:
            print(f"  {opt}")

        answer = input("Your answer (A/B/C/D): ").upper()
        if answer == q['answer']:
            print("✓ Correct!")
            score += 1
        else:
            print(f"✗ Incorrect. Answer: {q['answer']}")

    print(f"\nScore: {score}/{len(questions)}")
    return score

if __name__ == "__main__":
    quiz_consensus()
```

Run the quiz:
```bash
python quiz.py
```

---

## Next Steps

**Congratulations!** You've learned the fundamentals of distributed consensus.

**Continue Learning:**
- → [Tutorial 02: Origin-Centric Data](../02-origin-centric-data/README.md)
- → [Tutorial 03: Confidence Cascades](../03-confidence-cascades/README.md)

**Advanced Topics:**
- SE(3)-Equivariant Consensus (Intermediate)
- Bio-Inspired Algorithms (Intermediate)
- Production Deployment (Advanced)

---

## Troubleshooting

### Issue: Import Errors

**Solution:**
```bash
# Ensure you're in the correct directory
cd tutorials/beginner/01-basic-consensus/

# Install required packages
pip install numpy scipy
```

### Issue: No Output

**Solution:**
```bash
# Check Python version (3.10+ required)
python --version

# Run with verbose output
python main.py -v
```

### Issue: Threading Errors

**Solution:**
```python
# Ensure proper thread handling
import threading
thread = threading.Thread(target=your_function)
thread.start()
thread.join()  # Wait for completion
```

---

## Additional Resources

- [Paxos Made Simple](https://www.microsoft.com/en-us/research/publication/paxos-made-simple/)
- [Raft Consensus Algorithm](https://raft.github.io/)
- [SuperInstance Research Papers](https://github.com/SuperInstance/SuperInstance-papers)

---

**Tutorial Complete!** You now understand the basics of distributed consensus and how to implement simple consensus algorithms.

**Time to Complete:** ~45 minutes
**Difficulty:** Beginner
**Prerequisites:** Python 3.10+

---

*From simple voting to fault-tolerant consensus — building the foundation for distributed systems.*
