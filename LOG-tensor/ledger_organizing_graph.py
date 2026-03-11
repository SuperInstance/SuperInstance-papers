"""
LEDGER-ORGANIZING-GRAPH (LOG) SYSTEM
=====================================

A system where tiles INDUCE themselves from need, not selected from a library.
Following answers backward through the graph like a child asking "why".

Key Paradigm Shift:
- OLD: Functions defined first, then used (Scratch Jr style)
- NEW: Functions induce themselves from what's needed
- Library is for RESEARCH and LUCID DREAMING
- In the moment, the LARGER AGENT distills

Memory Tiers:
- HOT: Immediate attention, in context window
- MED: Recent, quickly accessible
- COLD: Stored, indexed, retrievable
- ARCHIVE: Unstructured, "might be important"

Change vs Values:
- VALUES are state (recorded for reference)
- CHANGE is what's happening (what matters in real-time)
- "A smell is only a smell if you were smelling something else before"
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from collections import deque
from enum import Enum
import time
import json

# =============================================================================
# MEMORY TIERS
# =============================================================================

class MemoryTier(Enum):
    HOT = 1      # Immediate, in context
    MED = 2      # Recent, quick access
    COLD = 3     # Stored, indexed
    ARCHIVE = 4  # Unstructured, might be important


@dataclass
class MemoryEntry:
    """Entry in the memory system."""
    key: str
    value: Any
    tier: MemoryTier
    last_access: float
    access_count: int = 0
    change_history: List[Tuple[float, Any]] = field(default_factory=list)
    expected_rate: Optional[float] = None  # Expected rate of change
    
    def record_change(self, new_value: Any):
        """Record a change, not the value itself."""
        timestamp = time.time()
        self.change_history.append((timestamp, new_value))
        self.last_access = timestamp
        self.access_count += 1
        
    def get_rate_of_change(self, window: float = 1.0) -> float:
        """Compute rate of change over time window."""
        if len(self.change_history) < 2:
            return 0.0
        
        now = time.time()
        recent = [(t, v) for t, v in self.change_history if now - t < window]
        
        if len(recent) < 2:
            return 0.0
        
        # Compute rate
        values = [v for t, v in recent]
        times = [t for t, v in recent]
        
        if len(values) >= 2:
            delta_v = abs(values[-1] - values[0])
            delta_t = times[-1] - times[0]
            return delta_v / (delta_t + 1e-10)
        
        return 0.0
    
    def is_unexpected_rate(self, threshold: float = 2.0) -> bool:
        """Check if rate of change is unexpected."""
        if self.expected_rate is None:
            return False
        
        actual_rate = self.get_rate_of_change()
        return abs(actual_rate - self.expected_rate) > threshold


class MemorySystem:
    """
    Multi-tier memory with change detection.
    
    PILOT INSIGHT: "What information does he not pay attention to 
    unless it's changing or changing at more than an expected rate?"
    """
    
    def __init__(self, hot_capacity: int = 100, med_capacity: int = 1000):
        self.hot: Dict[str, MemoryEntry] = {}
        self.med: Dict[str, MemoryEntry] = {}
        self.cold: Dict[str, MemoryEntry] = {}
        self.archive: List[MemoryEntry] = []
        
        self.hot_capacity = hot_capacity
        self.med_capacity = med_capacity
        
    def observe(self, key: str, value: Any, expected_rate: float = None):
        """
        Observe a value - but RECORD the CHANGE, not the value.
        
        Key insight: "Values are state. Change is what's happening."
        """
        # Check if exists
        if key in self.hot:
            entry = self.hot[key]
            old_value = entry.value
            entry.record_change(value)
            entry.value = value
            
            # Check for unexpected rate
            if entry.is_unexpected_rate():
                # PROMOTE attention
                self._alert_unexpected_change(key, entry)
                
        else:
            # NEW observation
            entry = MemoryEntry(
                key=key,
                value=value,
                tier=MemoryTier.HOT,
                last_access=time.time(),
                expected_rate=expected_rate
            )
            self.hot[key] = entry
            
        # Manage capacity
        self._manage_tiers()
    
    def _alert_unexpected_change(self, key: str, entry: MemoryEntry):
        """Alert when unexpected rate of change detected."""
        rate = entry.get_rate_of_change()
        expected = entry.expected_rate or 0
        print(f"⚠ UNEXPECTED RATE: {key} changing at {rate:.2f}/s (expected {expected:.2f}/s)")
    
    def _manage_tiers(self):
        """Manage memory tier capacity."""
        if len(self.hot) > self.hot_capacity:
            # Demote oldest to MED
            oldest = min(self.hot.items(), key=lambda x: x[1].last_access)
            key, entry = oldest
            entry.tier = MemoryTier.MED
            self.med[key] = entry
            del self.hot[key]
            
        if len(self.med) > self.med_capacity:
            # Demote to COLD
            oldest = min(self.med.items(), key=lambda x: x[1].last_access)
            key, entry = oldest
            entry.tier = MemoryTier.COLD
            self.cold[key] = entry
            del self.med[key]
    
    def get_attention_priority(self) -> List[str]:
        """
        Get keys ordered by attention priority.
        
        Priority = unexpected_rate × access_recency
        """
        priorities = []
        
        for key, entry in self.hot.items():
            unexpectedness = 1.0 if entry.is_unexpected_rate() else 0.0
            recency = 1.0 / (time.time() - entry.last_access + 1)
            priority = unexpectedness * recency
            priorities.append((key, priority))
        
        return [k for k, p in sorted(priorities, key=lambda x: -x[1])]


# =============================================================================
# LEDGER-ORGANIZING-GRAPH (LOG)
# =============================================================================

@dataclass
class LogNode:
    """Node in the Ledger-Organizing-Graph."""
    id: str
    data: Any
    provenance: str  # Where data came from
    timestamp: float
    why_edges: List[str] = field(default_factory=list)  # Edges to follow "why"
    how_edges: List[str] = field(default_factory=list)  # Edges to follow "how"
    inferred_math: Optional[str] = None  # Math inferred from variations


class LedgerOrganizingGraph:
    """
    Ledger-Organizing-Graph (LOG) for why-tracing.
    
    "Like a kid asking why and breaking apart the pieces until 
    the raw data come out and the guiding mathematics can be 
    inferred inductively through the variations of answer"
    """
    
    def __init__(self):
        self.nodes: Dict[str, LogNode] = {}
        self.current_focus: Optional[str] = None
        
    def record_observation(self, data: Any, provenance: str) -> str:
        """Record an observation with its provenance."""
        node_id = f"obs_{len(self.nodes)}"
        node = LogNode(
            id=node_id,
            data=data,
            provenance=provenance,
            timestamp=time.time()
        )
        self.nodes[node_id] = node
        return node_id
    
    def ask_why(self, node_id: str) -> List[str]:
        """
        Ask "why" about a node - follow edges backward.
        
        Returns list of predecessor nodes.
        """
        if node_id not in self.nodes:
            return []
        
        node = self.nodes[node_id]
        return node.why_edges
    
    def trace_to_raw_data(self, start_id: str, max_depth: int = 10) -> List[LogNode]:
        """
        Trace from a node back to raw data.
        
        Like a kid repeatedly asking "why" until reaching fundamentals.
        """
        path = []
        current = start_id
        
        for _ in range(max_depth):
            if current not in self.nodes:
                break
            
            node = self.nodes[current]
            path.append(node)
            
            # Follow "why" edges
            if not node.why_edges:
                break
            
            current = node.why_edges[0]  # Follow first why
        
        return path
    
    def infer_mathematics(self, variations: List[List[LogNode]]) -> str:
        """
        Infer guiding mathematics from variations of answers.
        
        "The guiding mathematics can be inferred inductively 
        through the variations of answer in simulated workflows"
        """
        # Analyze variations to find patterns
        all_endpoints = []
        for path in variations:
            if path:
                all_endpoints.append(path[-1].data)
        
        if len(all_endpoints) < 2:
            return "insufficient_data"
        
        # Check for linear relationship
        if all(isinstance(x, (int, float)) for x in all_endpoints):
            values = [float(x) for x in all_endpoints]
            mean_val = np.mean(values)
            std_val = np.std(values)
            
            if std_val < 0.1 * mean_val:
                return f"constant: ~{mean_val:.2f}"
            else:
                return f"variable: μ={mean_val:.2f}, σ={std_val:.2f}"
        
        return "complex_pattern"


# =============================================================================
# CHANGE DETECTION TILES
# =============================================================================

class ChangeTile:
    """
    Tiles that detect CHANGE, not values.
    
    "Scanning for unexpected rates of change is the basics of focus"
    """
    
    @staticmethod
    def delta(prev, curr):
        """DELTA: Change from previous."""
        return curr - prev
    
    @staticmethod
    def rate(prev, curr, dt):
        """RATE: Rate of change."""
        return (curr - prev) / (dt + 1e-10)
    
    @staticmethod
    def accel(prev2, prev1, curr, dt):
        """ACCEL: Acceleration (2nd derivative)."""
        v1 = (prev1 - prev2) / dt
        v2 = (curr - prev1) / dt
        return (v2 - v1) / dt
    
    @staticmethod
    def jerk(prev3, prev2, prev1, curr, dt):
        """JERK: Rate of change of acceleration."""
        a1 = ChangeTile.accel(prev3, prev2, prev1, dt)
        a2 = ChangeTile.accel(prev2, prev1, curr, dt)
        return (a2 - a1) / dt
    
    @staticmethod
    def unexpected(value, expected, threshold=2.0):
        """UNEXPECTED: Detect unexpected rate."""
        return abs(value - expected) > threshold
    
    @staticmethod
    def threshold_cross(value, threshold):
        """THRESH_CROSS: Detect threshold crossing."""
        return value > threshold


# =============================================================================
# PILOT ATTENTION SIMULATOR
# =============================================================================

class PilotAttentionSimulator:
    """
    Simulate pilot-like attention patterns.
    
    Pilot monitors:
    - ALWAYS: Instruments continuously scanned
    - CHANGE: Noticed when changing unexpectedly
    - INFERRED: From context, not directly read
    """
    
    def __init__(self):
        self.memory = MemorySystem()
        self.log = LedgerOrganizingGraph()
        
        # Pilot attention categories
        self.always_monitored = ['airspeed', 'altitude', 'heading', 'attitude']
        self.change_monitored = ['fuel', 'weather', 'traffic', 'engine_temp']
        self.inferred = ['traffic_intent', 'atc_intent', 'fuel_remaining']
        
    def simulate_attention(self, sensor_data: Dict[str, Any]):
        """
        Simulate pilot attention on sensor data.
        """
        attention_results = {}
        
        for key, value in sensor_data.items():
            # Determine attention type
            if key in self.always_monitored:
                attention_type = 'ALWAYS'
            elif key in self.change_monitored:
                attention_type = 'CHANGE'
            else:
                attention_type = 'INFERRED'
            
            # Apply attention pattern
            if attention_type == 'ALWAYS':
                # Always scanned
                self.memory.observe(key, value)
                attention_results[key] = {'type': 'ALWAYS', 'value': value}
                
            elif attention_type == 'CHANGE':
                # Only notice if changing unexpectedly
                self.memory.observe(key, value, expected_rate=0.1)
                if key in self.memory.hot:
                    entry = self.memory.hot[key]
                    if entry.is_unexpected_rate():
                        attention_results[key] = {
                            'type': 'CHANGE',
                            'alert': True,
                            'rate': entry.get_rate_of_change()
                        }
                        
            elif attention_type == 'INFERRED':
                # Inferred from context
                # Don't directly observe, infer
                attention_results[key] = {'type': 'INFERRED', 'inferred': True}
        
        return attention_results
    
    def get_focus(self) -> List[str]:
        """Get current focus priorities."""
        return self.memory.get_attention_priority()


# =============================================================================
# TILE INDUCTION SYSTEM
# =============================================================================

class TileInductionSystem:
    """
    System where tiles INDUCE themselves from need.
    
    "Tiles find themselves as often as they are chosen from a library.
    The library is for research and lucid dreaming.
    In the moment, the larger agent it is distilling is the first instinct."
    """
    
    def __init__(self):
        self.induced_tiles: Dict[str, Any] = {}
        self.distillation_log: List[Dict] = []
    
    def induce_tile(self, need: str, context: Dict) -> Optional[str]:
        """
        Induce a tile from need, not selection.
        
        Returns the induced tile function name.
        """
        # Check if similar need has been satisfied before
        for tile_name, tile_info in self.induced_tiles.items():
            if tile_info.get('need') == need:
                # Tile found itself again
                return tile_name
        
        # No existing tile - INDUCE a new one
        tile_name = f"induced_{len(self.induced_tiles)}"
        
        # Distill from larger agent
        induced_code = self._distill_from_context(need, context)
        
        self.induced_tiles[tile_name] = {
            'need': need,
            'code': induced_code,
            'induced_at': time.time(),
            'usage_count': 0
        }
        
        self.distillation_log.append({
            'tile': tile_name,
            'need': need,
            'context': context,
            'timestamp': time.time()
        })
        
        return tile_name
    
    def _distill_from_context(self, need: str, context: Dict) -> str:
        """
        Distill function from context.
        
        "The distillation from the more intelligent agent learns
        WHY the current system is working, not THIS WORKED ELSEWHERE."
        """
        # Simplified distillation logic
        if 'delta' in need.lower():
            return "lambda prev, curr: curr - prev"
        elif 'rate' in need.lower():
            return "lambda prev, curr, dt: (curr - prev) / dt"
        elif 'threshold' in need.lower():
            return "lambda val, thresh: val > thresh"
        else:
            return "lambda x: x"  # Identity as fallback
    
    def get_tile(self, name: str) -> Optional[str]:
        """Get induced tile by name."""
        if name in self.induced_tiles:
            self.induced_tiles[name]['usage_count'] += 1
            return self.induced_tiles[name]['code']
        return None


# =============================================================================
# DEMONSTRATION
# =============================================================================

def demonstrate_pilot_attention():
    """Demonstrate the pilot attention system."""
    
    print("=" * 70)
    print("PILOT-ATTENTION DEMONSTRATION")
    print("Ledger-Organizing-Graph (LOG) System")
    print("=" * 70)
    
    # 1. Memory System
    print("\n[1] MEMORY SYSTEM - Change Detection")
    memory = MemorySystem()
    
    # Simulate sensor readings
    print("\n  Simulating altitude readings...")
    altitudes = [10000, 10010, 10020, 10030, 10500]  # Sudden jump at end
    
    for i, alt in enumerate(altitudes):
        memory.observe('altitude', alt, expected_rate=10)  # Expect ~10/step
        if i < len(altitudes) - 1:
            print(f"    Step {i}: altitude={alt}")
        else:
            print(f"    Step {i}: altitude={alt} ⚠ UNEXPECTED!")
    
    # 2. Pilot Attention
    print("\n[2] PILOT ATTENTION SIMULATOR")
    pilot = PilotAttentionSimulator()
    
    sensor_data = {
        'airspeed': 250,
        'altitude': 10500,
        'heading': 270,
        'fuel': 5000,
        'weather': 'clear'
    }
    
    results = pilot.simulate_attention(sensor_data)
    print("  Attention results:")
    for key, info in results.items():
        print(f"    {key}: {info}")
    
    print(f"\n  Focus priority: {pilot.get_focus()}")
    
    # 3. Why-Tracing
    print("\n[3] WHY-TRACING (LOG)")
    log = LedgerOrganizingGraph()
    
    # Record observations
    raw1 = log.record_observation(42, "sensor_1")
    calc1 = log.record_observation(84, f"calculation from {raw1}")
    infer1 = log.record_observation("result", f"inference from {calc1}")
    
    # Trace backward
    print(f"  Tracing 'why' from {infer1}:")
    path = log.trace_to_raw_data(infer1)
    for node in path:
        print(f"    → {node.id}: {node.data} (from {node.provenance})")
    
    # 4. Tile Induction
    print("\n[4] TILE INDUCTION")
    induction = TileInductionSystem()
    
    # Induce tiles from needs
    needs = ["delta for altitude", "rate for speed", "threshold for altitude"]
    for need in needs:
        tile = induction.induce_tile(need, {'context': 'demo'})
        print(f"  Induced tile for '{need}': {tile}")
    
    print("\n  Induced tiles:")
    for name, info in induction.induced_tiles.items():
        print(f"    {name}: {info['code']}")
    
    print("\n" + "=" * 70)
    print("KEY INSIGHTS:")
    print("  1. VALUES are state, CHANGE is what matters")
    print("  2. Focus on UNEXPECTED rates, not expected ones")
    print("  3. Tiles INDUCE themselves from need")
    print("  4. WHY-TRACING finds raw data and math")
    print("=" * 70)


if __name__ == "__main__":
    demonstrate_pilot_attention()
